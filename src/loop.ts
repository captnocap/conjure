import { generateSvg, rasterizeSvg } from './svg';
import type { Plan } from '../engine/director';
import { FRAME_SIZE, type Stage } from '../engine/stage';
import { cameraAt } from '../engine/motion';

/**
 * A moving print. The live scene is captured a dozen times over two seconds while its things
 * breathe, sway and turn and the camera moves along the plan's closed path; each capture is then
 * developed by the look, its finishing passes animated by the frame's phase, and laid under the
 * vector sheets; finally the frames are recorded at a steady rate as a short looping WebM.
 * Capturing first and developing afterwards keeps the motion smooth whatever the look costs.
 */
export const LOOP_FRAMES = 12;
export const LOOP_FPS = 6;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function withPrint(svg: string, png: string) {
  return svg.replace(/(<svg\b[^>]*>)/, `$1<image x="0" y="0" width="${FRAME_SIZE}" height="${FRAME_SIZE}" href="${png}"/>`);
}

/** Can this browser record a canvas? Headless and older browsers may not. */
export const canRecord = () => typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

/** Does a loop of this plan move? The camera, the finishes or the things on stage must. */
export const loopMoves = (stage: Stage, plan: Plan) => (plan.camera ?? 'still') !== 'still' || !!plan.vacui || !!plan.otherworld || stage.animated() > 0;

/** Record the mounted plan as a loop. Resolves to a WebM blob, or null when nothing moves or recording is unsupported. */
export async function recordLoop(stage: Stage, plan: Plan, signal: AbortSignal, onFrame?: (index: number, stage: 'capturing' | 'developing' | 'recording') => void): Promise<Blob | null> {
  if (!canRecord() || !loopMoves(stage, plan)) return null;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!mime) return null;
  // A freshly mounted scene holds still for printing; a loop needs it moving.
  stage.play();

  // 1. Capture the moving scene at the loop's own rate.
  const captures = [];
  for (let index = 0; index < LOOP_FRAMES; index++) {
    signal.throwIfAborted();
    onFrame?.(index, 'capturing');
    captures.push(stage.capture(cameraAt(plan.camera ?? 'still', index / LOOP_FRAMES)));
    await wait(1000 / LOOP_FPS);
  }

  // 2. Develop every frame with the look and lay the vector sheets over it.
  const layers = (plan.design?.layers ?? []).filter((layer) => layer.visible && layer.opacity > 0);
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = FRAME_SIZE;
  const scratchContext = scratch.getContext('2d')!;
  const frames: ImageData[] = [];
  for (const [index, capture] of captures.entries()) {
    signal.throwIfAborted();
    onFrame?.(index, 'developing');
    // Boiling marks redraw every second frame, about three times a second, like hand-drawn animation on twos.
    const result = await stage.develop(signal, capture, plan.presentation?.boil ? 1 + Math.floor(index / 2) : undefined, index / LOOP_FRAMES);
    signal.throwIfAborted();
    if (result) scratchContext.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
    else scratchContext.drawImage($<HTMLCanvasElement>('#stage'), 0, 0, FRAME_SIZE, FRAME_SIZE);
    if (layers.length) {
      const pixels = await rasterizeSvg(withPrint(generateSvg(FRAME_SIZE, layers, capture), scratch.toDataURL('image/png')), FRAME_SIZE, signal);
      scratchContext.putImageData(new ImageData(new Uint8ClampedArray(pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
    }
    frames.push(scratchContext.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE));
  }

  // 3. Record the finished frames at a steady rate, so the file plays as a two-second loop.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = FRAME_SIZE;
  const context = canvas.getContext('2d')!;
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  recorder.start();
  try {
    for (const [index, frame] of frames.entries()) {
      signal.throwIfAborted();
      onFrame?.(index, 'recording');
      context.putImageData(frame, 0, 0);
      track.requestFrame?.();
      await wait(1000 / LOOP_FPS);
    }
    track.requestFrame?.();
    await wait(1000 / LOOP_FPS);
  } finally {
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((item) => item.stop());
  }
  signal.throwIfAborted();
  // The blob is typed without its codec string, so its data URL is plain video/webm for the gallery.
  return chunks.length ? new Blob(chunks, { type: 'video/webm' }) : null;
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/** Show the loop under the frame, and hand back its data URL for the gallery. */
export async function showLoop(blob: Blob | null): Promise<string | null> {
  const host = $('#loop');
  const video = $<HTMLVideoElement>('#loop-video');
  if (video.src) URL.revokeObjectURL(video.src);
  video.removeAttribute('src');
  host.hidden = !blob;
  $<HTMLButtonElement>('#save-loop').hidden = !blob;
  if (!blob) return null;
  video.src = URL.createObjectURL(blob);
  void video.play().catch(() => undefined);
  return toDataUrl(blob);
}
