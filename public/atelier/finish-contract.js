export const WIDTH = 720;
export const HEIGHT = 720;
export const BYTES = WIDTH * HEIGHT * 4;
export const PROTOCOL = 'atelier-finite-finish-v1';
export const INK_PROTOCOL = 'atelier-ink-finish-v1';
export const FLUTED_PROTOCOL = 'atelier-fluted-finish-v1';

export function assertOpaqueRGBA(pixels) {
  if (!(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) ||
      !(pixels.buffer instanceof ArrayBuffer) || pixels.length !== BYTES ||
      pixels.byteLength !== BYTES || pixels.buffer.resizable) {
    throw new TypeError('Finish requires a fixed, non-shared 720x720 RGBA8 array');
  }
  for (let i = 3; i < BYTES; i += 4)
    if (pixels[i] !== 255) throw new RangeError('Finish requires opaque RGBA8 pixels');
  return pixels;
}

export function finishWeight(finish) {
  if (finish == null) return 0;
  if (typeof finish !== 'object' || Array.isArray(finish) ||
      Object.keys(finish).some(key => key !== 'id' && key !== 'weight') ||
      !['finite-lenses', 'ink-completed-mix', 'fluted-glass'].includes(finish.id) || !Number.isInteger(finish.weight) ||
      finish.weight < 0 || finish.weight > 100)
    throw new TypeError('Expected None or { id: "finite-lenses", "ink-completed-mix" or "fluted-glass", weight: integer 0..100 }');
  return finish.weight;
}

export function sameBytes(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

export function abortError(message = 'Finish canceled') {
  return new DOMException(message, 'AbortError');
}
