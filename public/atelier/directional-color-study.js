import { renderDirectionalColor } from './directional-color-core.js';
import { createDirectionalColorPlanCache, compactDirectionalColorPlan, hydrateDirectionalColorPlan,
  copyDirectionalColorSource, validateDirectionalColorSource } from './directional-color-plan.js';

export function prepareDirectionalColorFrame(frame) {
  validateDirectionalColorSource(frame.color, frame.w);
  if (frame.directionalColorPlan) return frame.directionalColorPlan;
  if (typeof frame.prepare !== 'function') throw Error('Directional color needs the frame preparation cache');
  const cache = frame.prepare('directional-color', createDirectionalColorPlanCache),
    raw = { size: frame.w, color: frame.color }, expected = cache.preparation(raw);
  if (expected.plan) return hydrateDirectionalColorPlan(expected.plan, expected, frame.color);
  const full = renderDirectionalColor(copyDirectionalColorSource(frame.color, frame.w)),
    plan = compactDirectionalColorPlan(full, expected, frame.color);
  cache.remember(raw, expected, plan);
  return hydrateDirectionalColorPlan(plan, expected, frame.color);
}
export function drawDirectionalColor(p, frame) {
  const rgba = prepareDirectionalColorFrame(frame).renderRGBA();
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw Error('Directional color requires pixel density 1');
  p.pixels.set(rgba);
  p.updatePixels();
}
export const directionalColorStudy = {
  id: 'directional-color', name: 'Directional color', family: 'Marks & pigment',
  offThread: true, fixedSourceSize: 720,
  control: 'Fixed settings', fixedSettings: '3 passes · 9 px sectors',
  formatStrength: () => '3 passes · 9 px sectors',
  title: 'Color gathers along the image.',
  medium: 'Directional color abstraction / polynomial sectors', swatch: '#b59b79',
  category: 'COLOR ABSTRACTION',
  description: 'Contiguous color patches align with captured image features. The fixed process simplifies material texture and fine highlights, and may lose thin details.',
  mechanism: 'Fixed 720-pixel captured image · three unquantized passes · eight polynomial sectors with a 9-pixel base radius · local image directions guide the sectors. This is color abstraction, not physical paint, semantic understanding, guaranteed topology or material preservation.',
  reference: 'https://www.kyprianidis.com/p/tpcg2010/',
  referenceLabel: 'Kyprianidis et al. / Polynomial Anisotropic Kuwahara Filtering',
  draw: drawDirectionalColor,
};
