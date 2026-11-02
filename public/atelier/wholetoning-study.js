import { renderWholetoning, validateWholetoningSource } from './wholetoning-core.js';

export function prepareWholetoningFrame(frame) {
  if (frame?.w !== 720) throw new RangeError('Wholetoning requires the fixed 720-pixel capture');
  validateWholetoningSource(frame?.color, frame?.identity, frame?.w);
  if (typeof frame.prepare !== 'function') throw new Error('Wholetoning needs the frame preparation cache');
  // The existing immutable-capture cache owns this image and its bounded lifetime.
  // Shared seed/strength do not enter the frozen optimizer. Retain only final RGBA.
  return frame.prepare('wholetoning', () => renderWholetoning(frame.color, frame.identity, frame.w).rgba);
}

export function drawWholetoning(p, frame) {
  const rgba = prepareWholetoningFrame(frame);
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw new RangeError('Wholetoning requires pixel density 1');
  p.pixels.set(rgba);
  p.updatePixels();
}

export const wholetoningStudy = {
  id: 'wholetoning', name: 'Wholetoning', family: 'Cut & assembly',
  offThread: true, fixedSourceSize: 720,
  control: 'Fixed settings', fixedSettings: 'Black & white · region contrast',
  formatStrength: () => 'Black & white · region contrast',
  title: 'Whole regions trade light and dark.',
  medium: 'Joint region labels / binary tone', swatch: '#77776e',
  category: 'REGION CONTRAST',
  description: 'Connected regions become black or white. Small groups change together when surrounding contrast outweighs their own preferred tone.',
  mechanism: 'Owner-aware tonal regions · bounded connected-block search · black and white fills. Tiny regions affect feature grouping, and reflective surfaces can form noisy bands. The deterministic work budget may end the search after a complete improving block on complex scenes. A bounded local search without an optimum or topology guarantee; visible owner IDs do not describe hidden backgrounds.',
  reference: 'https://cs.uwaterloo.ca/~csk/publications/Papers/xu_kaplan_2008.pdf',
  referenceLabel: 'Xu and Kaplan / Wholetoning',
  draw: drawWholetoning,
};
