import { fitTriangleStack, validateTriangleStackSource, validateTriangleStackPlan } from './triangle-stack-core.js';

export function prepareTriangleStackFrame(frame) {
  if (frame?.w !== 720) throw new RangeError('Triangle stack requires the fixed 720-pixel capture');
  validateTriangleStackSource(frame?.color, frame?.w);
  if (typeof frame?.prepare !== 'function') throw new TypeError('Triangle stack needs the frame preparation cache');
  // Existing two-entry immutable-capture cache; seed stays in its generic key.
  // Shared seed/strength never enter the fixed model. No fitting buffers remain.
  return frame.prepare('triangle-stack', () => fitTriangleStack(frame.color));
}

export function drawTriangleStackPlan(p, candidate) {
  const plan = validateTriangleStackPlan(candidate);
  p.background(...plan.background);
  p.noStroke();
  const context = p.drawingContext;
  for (let i = 0; i < plan.triangles.length; i += 9) {
    const t = plan.triangles;
    p.fill(t[i + 6], t[i + 7], t[i + 8], 127.5);
    context.beginPath();
    context.moveTo(t[i] * 5, t[i + 1] * 5);
    context.lineTo(t[i + 2] * 5, t[i + 3] * 5);
    context.lineTo(t[i + 4] * 5, t[i + 5] * 5);
    context.closePath();
    context.fill();
  }
}

export function drawTriangleStack(p, frame) {
  drawTriangleStackPlan(p, prepareTriangleStackFrame(frame));
}

export const triangleStackStudy = {
  id: 'triangle-stack', name: 'Triangle stack', family: 'Cut & assembly',
  offThread: true, fixedSourceSize: 720,
  control: 'Fixed settings', fixedSettings: '96-triangle limit · 50% opacity',
  formatStrength: () => '96-triangle limit · 50% opacity',
  title: 'A scene through crossing planes.',
  medium: 'Ordered translucent triangles', swatch: '#abb19e',
  category: 'TRANSLUCENT-PLANE RECONSTRUCTION',
  description: 'Broad translucent triangles overlap into an abstract reconstruction of the captured scene. Large color masses survive while small objects can merge or disappear.',
  mechanism: 'Fixed 144-pixel source-RGB fit · up to 96 ordered triangles · 50% source-over opacity · analytic candidate colors. Bounded local search without an optimum or topology guarantee. The ring loop, reflective sphere and small plant features can lose their identities.',
  reference: 'https://www.michaelfogleman.com/static/primitive/examples/27471731151.50.128.4.1.png',
  referenceLabel: 'Michael Fogleman / Primitive triangle example',
  draw: drawTriangleStack,
};
