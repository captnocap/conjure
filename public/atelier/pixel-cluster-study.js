import { renderPixelCluster } from './pixel-cluster-core.js';
import { createPixelClusterPlanCache, compactPixelClusterPlan, hydratePixelClusterPlan,
  copyPixelClusterSource, validatePixelClusterSource } from './pixel-cluster-plan.js';

export function preparePixelClusterFrame(frame) {
  validatePixelClusterSource(frame.color, frame.w);
  if (frame.pixelClusterPlan) return frame.pixelClusterPlan;
  if (typeof frame.prepare !== 'function') throw Error('Pixel clusters needs the frame preparation cache');
  const cache = frame.prepare('pixel-clusters', createPixelClusterPlanCache),
    raw = { size: frame.w, color: frame.color }, expected = cache.preparation(raw);
  if (expected.plan) return hydratePixelClusterPlan(expected.plan, expected, frame.color);
  const full = renderPixelCluster(copyPixelClusterSource(frame.color, frame.w)),
    plan = compactPixelClusterPlan(full, expected, frame.color);
  cache.remember(raw, expected, plan);
  return hydratePixelClusterPlan(plan, expected, frame.color);
}
export function drawPixelClusters(p, frame) {
  const rgba = preparePixelClusterFrame(frame).renderRGBA();
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw Error('Pixel clusters requires pixel density 1');
  p.pixels.set(rgba);
  p.updatePixels();
}
export const pixelClusterStudy = {
  id: 'pixel-clusters', name: 'Pixel clusters', family: 'Cut & assembly',
  offThread: true, pixelated: true, fixedSourceSize: 720,
  control: 'Fixed settings', fixedSettings: '120 × 120 · ≤24 colors',
  formatStrength: () => '120 × 120 · ≤24 colors',
  title: 'Small regions, stepped color.',
  medium: 'Adaptive feature regions / limited palette', swatch: '#86936b',
  category: 'PIXEL INTERPRETATION',
  description: 'Adaptive feature regions turn the captured image into stepped shapes and a limited palette. Thin plant strokes and tonal groupings emerge on a fixed 120 × 120 grid with at most 24 colors.',
  mechanism: 'Fixed 720-pixel source → 120 × 120 logical cells · adaptive feature regions · joint 24-color palette refinement · exact 6× enlargement. Depicted edges can move within the logical grid; original scene geometry, mixer masks and recipes remain. This is an automatic interpretation, not handcrafted pixel art or guaranteed topology.',
  reference: 'https://cragl.cs.gmu.edu/pixelate/',
  referenceLabel: 'Gerstner et al. / Pixelated Image Abstraction',
  draw: drawPixelClusters,
};
