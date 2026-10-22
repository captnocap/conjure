import { assertFixed720Opaque } from './paint-boundary-ink.js';

// This is a new, isolated protocol. It is not the finite-lens protocol.
export const PROTOCOL = 'atelier-ink-finish-v1';
export function validJobId(value) {
  return Number.isSafeInteger(value) && value > 0;
}
export function assertRequest(message) {
  if (!message || message.protocol !== PROTOCOL || message.type !== 'render' || !validJobId(message.jobId)) {
    throw new TypeError('Invalid paint-boundary ink request envelope.');
  }
  assertFixed720Opaque({ width: message.width, height: message.height, rgba: message.pixels });
  return message;
}
