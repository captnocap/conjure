import type { Capture } from '../kit/contract';
import type { PortraitBlend } from '../engine/presentation';
import { FRAME_SIZE } from '../engine/stage';

const canvasOf = (size = FRAME_SIZE) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
};

/** The hero's silhouette from the portrait's identity pass, feathered a little so edges sit softly. */
function heroMask(capture: Capture): HTMLCanvasElement {
  const { size, identity } = capture;
  const hard = canvasOf(size);
  const context = hard.getContext('2d')!;
  const image = context.createImageData(size, size);
  for (let pixel = 0; pixel < size * size; pixel++) {
    image.data[pixel * 4 + 3] = identity[pixel * 4] >= 3 ? 255 : 0;
  }
  context.putImageData(image, 0, 0);
  const soft = canvasOf(FRAME_SIZE);
  const softContext = soft.getContext('2d')!;
  softContext.filter = 'blur(1.2px)';
  softContext.drawImage(hard, 0, 0, FRAME_SIZE, FRAME_SIZE);
  return soft;
}

/** Cut a picture to a mask's alpha. */
function masked(picture: CanvasImageSource, mask: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = canvasOf();
  const context = canvas.getContext('2d')!;
  context.drawImage(picture, 0, 0, FRAME_SIZE, FRAME_SIZE);
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(mask, 0, 0);
  return canvas;
}

/**
 * Join a portrait of the hero with the printed scene. Behind: the hero in focus over a softened
 * scene. Inside: the scene seen through the hero's silhouette, a double exposure. Over: the scene
 * faint across the whole portrait. Beside: the portrait alone, the scene shown next to it.
 */
export function composePortrait(portrait: HTMLCanvasElement, capture: Capture, scene: HTMLCanvasElement, blend: PortraitBlend, keep?: Uint8Array): HTMLCanvasElement {
  const canvas = canvasOf();
  const context = canvas.getContext('2d')!;
  const mask = heroMask(capture);
  if (blend === 'behind') {
    context.filter = 'blur(7px) saturate(0.8) brightness(1.04)';
    context.drawImage(scene, -24, -24, FRAME_SIZE + 48, FRAME_SIZE + 48);
    context.filter = 'none';
    context.drawImage(masked(portrait, mask), 0, 0);
  } else if (blend === 'inside') {
    context.drawImage(portrait, 0, 0, FRAME_SIZE, FRAME_SIZE);
    context.globalAlpha = 0.82;
    context.globalCompositeOperation = 'screen';
    context.drawImage(masked(scene, mask), 0, 0);
    context.globalCompositeOperation = 'multiply';
    context.globalAlpha = 0.3;
    context.drawImage(masked(scene, mask), 0, 0);
  } else if (blend === 'over') {
    context.drawImage(portrait, 0, 0, FRAME_SIZE, FRAME_SIZE);
    context.globalAlpha = 0.34;
    context.globalCompositeOperation = 'multiply';
    context.drawImage(scene, 0, 0, FRAME_SIZE, FRAME_SIZE);
  } else {
    context.drawImage(portrait, 0, 0, FRAME_SIZE, FRAME_SIZE);
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  // An accented detail (an eye, a face) stays as drawn, clear of the scene laid over the hero.
  if (keep && (blend === 'inside' || blend === 'over')) {
    const size = capture.size, held = canvasOf(size);
    const holdContext = held.getContext('2d')!;
    const image = holdContext.createImageData(size, size);
    for (let i = 0; i < size * size; i++) image.data[i * 4 + 3] = keep[i] ? 255 : 0;
    holdContext.putImageData(image, 0, 0);
    const soft = canvasOf();
    const softContext = soft.getContext('2d')!;
    softContext.filter = 'blur(2px)';
    softContext.drawImage(held, 0, 0, FRAME_SIZE, FRAME_SIZE);
    context.drawImage(masked(portrait, soft), 0, 0);
  }
  return canvas;
}
