import { applyFlutedGlass, assertFixed720Opaque, WIDTH, HEIGHT } from './fluted-glass-core.js';

export const PROTOCOL = 'atelier-fluted-finish-v1';
export function validJobId(value) {
  return Number.isSafeInteger(value) && value > 0;
}
export function assertRequest(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) ||
      Object.keys(message).some(key => !['protocol', 'type', 'jobId', 'width', 'height', 'pixels'].includes(key)) ||
      !['protocol', 'type', 'jobId', 'width', 'height', 'pixels'].every(key => Object.hasOwn(message, key)) ||
      message.protocol !== PROTOCOL || message.type !== 'render' || !validJobId(message.jobId))
    throw new TypeError('Invalid fluted-glass request envelope.');
  assertFixed720Opaque({ width: message.width, height: message.height, rgba: message.pixels });
  return message;
}
export function runFlutedGlassJob(message) {
  assertRequest(message);
  const started = performance.now();
  const pixels = applyFlutedGlass({ width: message.width, height: message.height, rgba: message.pixels });
  return { protocol: PROTOCOL, type: 'result', jobId: message.jobId,
    width: WIDTH, height: HEIGHT, pixels, solveMs: performance.now() - started };
}
export function failureReply(message, error, checked = false) {
  return { protocol: PROTOCOL, type: 'error',
    jobId: validJobId(message?.jobId) ? message.jobId : null,
    code: checked ? 'RENDER_FAILED' : 'INVALID_REQUEST',
    message: error instanceof Error ? error.message : 'Fluted glass failed.' };
}
