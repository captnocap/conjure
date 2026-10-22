import { renderFiniteLens } from './finite-lens-core.js';
import { WIDTH, HEIGHT, PROTOCOL, assertOpaqueRGBA } from './finish-contract.js';

// The only rendering input is a private, opaque image. No capture/p5 state.
export function runFiniteLensJob(message) {
  if (!message || message.protocol !== PROTOCOL || message.type !== 'render' ||
      !Number.isSafeInteger(message.jobId) || message.jobId <= 0 ||
      message.width !== WIDTH || message.height !== HEIGHT)
    throw new TypeError('Invalid finite finish request');
  assertOpaqueRGBA(message.pixels);
  const started = performance.now();
  const pixels = renderFiniteLens(message.pixels);
  const solveMs = performance.now() - started;
  assertOpaqueRGBA(pixels);
  return { protocol: PROTOCOL, type: 'result', jobId: message.jobId,
    width: WIDTH, height: HEIGHT, pixels, solveMs };
}

export function failureReply(message, error) {
  return { protocol: PROTOCOL, type: 'error', jobId: message?.jobId,
    message: error instanceof Error ? error.message : 'Finite finish failed' };
}
