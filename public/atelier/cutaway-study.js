import { renderCutaway } from './cutaway-core.js';
import { prepareConjureProxy, renderConjureProxy } from './conjure-proxies.js';

export function prepareCutawayFrame(frame) {
  if (frame.cutawayPlan) return frame.cutawayPlan.rgba;
  if (typeof frame.prepare !== 'function') throw Error('Single cutaway needs the frame preparation cache');
  return frame.prepare('single-cutaway', () => {
    const snapshot = frame.geometrySnapshot?.();
    // The established cutaway worker protocol owns Uint8Array (rather than
    // Uint8ClampedArray) bytes. Keep that exact contract on the dynamic path.
    if (snapshot?.source === 'conjure') return new Uint8Array(renderConjureProxy(prepareConjureProxy(snapshot, frame.sectionRibLighting, frame.materialColor, 'single-cutaway')));
    if (snapshot?.size !== frame.w) throw Error('Single cutaway needs the original Garden geometry');
    const result = renderCutaway({ snapshot, shadowCamera: frame.cutawayShadowCamera,
      spectralLights: frame.spectralLights, baseColors: frame.cutawayBaseColors,
      materialVisibility: frame.materialVisibility || null });
    // Only the finished image survives; all visibility and shadow fields expire.
    return result.rgba;
  });
}

export function drawCutaway(p, frame) {
  const rgba = prepareCutawayFrame(frame);
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw Error('Single cutaway requires pixel density 1');
  p.pixels.set(rgba);
  p.updatePixels();
}

export const cutawayStudy = {
  id: 'single-cutaway', name: 'Single cutaway', family: 'Lines & geometry',
  offThread: true, control: 'Fixed cut', fixedSettings: '1 oblique plane',
  formatStrength: () => '1 oblique plane',
  title: 'One cut, a shared section.',
  medium: 'Sectioned solids / matte pigment proxy', swatch: '#ba4a33',
  category: 'COMMON-PLANE CUTAWAY',
  description: 'One oblique plane exposes broad red section faces through the foreground solids. The rear arch stays whole, while the open vase, stems and perforated shells keep open cut edges. Clipped parts can disappear or leave small disconnected remnants.',
  mechanism: 'Separate source-solid ray intervals clipped by one fixed world plane · uncapped open and perforated surfaces · fresh key shadows · geometric face normals and matte object pigments. Red is section ink, not an inferred interior material. Original objects stay in place; this numerical rendering proxy does not preserve their complete visible shapes or native material optics. Mixer masks remain anchored to the original image.',
  reference: 'https://doc.cgal.org/6.2/PMP_Boolean_operations/index.html#fig__coref_clip_close_open',
  referenceLabel: 'CGAL / clipping open surfaces and closed volumes',
  draw: drawCutaway,
};
