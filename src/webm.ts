/**
 * Encode finished frames as a WebM with WebCodecs and a minimal muxer. MediaRecorder stamps frames
 * by wall-clock capture and some browsers keep about one a second, which left loops with three
 * frames that all sat on the printed view; here every frame gets its own timestamp.
 */
const encoder = new TextEncoder();

/** An unsigned integer in as few big-endian bytes as it needs. */
function uint(value: number): Uint8Array {
  const bytes: number[] = [];
  do { bytes.unshift(value % 256); value = Math.floor(value / 256); } while (value > 0);
  return Uint8Array.from(bytes);
}
function float(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value);
  return bytes;
}
/** Every element size is written in eight bytes: simple, and valid EBML. */
function size(length: number): Uint8Array {
  const bytes = new Uint8Array(8);
  bytes[0] = 0x01;
  for (let at = 7, rest = length; at > 0; at--, rest = Math.floor(rest / 256)) bytes[at] = rest % 256;
  return bytes;
}
function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}
type Body = Uint8Array | number | string | Body[];
function element(id: number, body: Body): Uint8Array {
  const data = body instanceof Uint8Array ? body
    : typeof body === 'number' ? uint(body)
    : typeof body === 'string' ? encoder.encode(body)
    : join(body.map((child) => child as Uint8Array));
  return join([uint(id), size(data.length), data]);
}

export interface EncodedFrame { data: Uint8Array; milliseconds: number; key: boolean }

/** Wrap encoded VP8/VP9 frames in a single-cluster WebM. */
export function muxWebm(frames: readonly EncodedFrame[], options: { codec: 'V_VP8' | 'V_VP9'; width: number; height: number; frameMilliseconds: number }): Blob {
  const header = element(0x1a45dfa3, [element(0x4286, 1), element(0x42f7, 1), element(0x42f2, 4), element(0x42f3, 8), element(0x4282, 'webm'), element(0x4287, 2), element(0x4285, 2)]);
  const duration = (frames.at(-1)?.milliseconds ?? 0) + options.frameMilliseconds;
  const info = element(0x1549a966, [element(0x2ad7b1, 1_000_000), element(0x4d80, 'conjure'), element(0x5741, 'conjure'), element(0x4489, float(duration))]);
  const tracks = element(0x1654ae6b, [element(0xae, [
    element(0xd7, 1), element(0x73c5, 1), element(0x83, 1), element(0x9c, 0), element(0x86, options.codec),
    element(0x23e383, Math.round(options.frameMilliseconds * 1_000_000)),
    element(0xe0, [element(0xb0, options.width), element(0xba, options.height)]),
  ])]);
  const blocks = frames.map((frame) => {
    const head = new Uint8Array(4);
    head[0] = 0x81; // track 1
    new DataView(head.buffer).setInt16(1, Math.round(frame.milliseconds));
    head[3] = frame.key ? 0x80 : 0;
    return element(0xa3, join([head, frame.data]));
  });
  const cluster = element(0x1f43b675, [element(0xe7, 0), ...blocks]);
  const segment = element(0x18538067, [info, tracks, cluster]);
  return new Blob([header as BlobPart, segment as BlobPart], { type: 'video/webm' });
}

export const canEncode = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

/** Encode frames at `fps` into a WebM, or null when this browser has no usable VP8/VP9 encoder. */
export async function encodeWebm(frames: readonly ImageData[], fps: number, signal: AbortSignal): Promise<Blob | null> {
  if (!canEncode() || !frames.length) return null;
  const { width, height } = frames[0];
  const choices = [{ codec: 'vp09.00.10.08', mux: 'V_VP9' }, { codec: 'vp8', mux: 'V_VP8' }] as const;
  let chosen: (typeof choices)[number] | null = null;
  for (const choice of choices) {
    const support = await VideoEncoder.isConfigSupported({ codec: choice.codec, width, height, bitrate: 8_000_000, framerate: fps }).catch(() => null);
    if (support?.supported) { chosen = choice; break; }
  }
  if (!chosen) return null;
  const encoded: EncodedFrame[] = [];
  let failure: unknown = null;
  const video = new VideoEncoder({
    output(chunk) {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      encoded.push({ data, milliseconds: chunk.timestamp / 1000, key: chunk.type === 'key' });
    },
    error(error) { failure = error; },
  });
  video.configure({ codec: chosen.codec, width, height, bitrate: 8_000_000, framerate: fps });
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d')!;
  const step = 1_000_000 / fps;
  try {
    for (const [index, frame] of frames.entries()) {
      signal.throwIfAborted();
      context.putImageData(frame, 0, 0);
      const picture = new VideoFrame(canvas, { timestamp: Math.round(index * step), duration: Math.round(step) });
      video.encode(picture, { keyFrame: index === 0 });
      picture.close();
    }
    await video.flush();
  } finally {
    if (video.state !== 'closed') video.close();
  }
  if (failure || encoded.length !== frames.length) return null;
  encoded.sort((a, b) => a.milliseconds - b.milliseconds);
  return muxWebm(encoded, { codec: chosen.mux, width, height, frameMilliseconds: 1000 / fps });
}
