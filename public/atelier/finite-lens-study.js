import { renderFiniteLens, WIDTH, HEIGHT } from './finite-lens-core.js';

export function drawFiniteLenses(p, frame) {
  if (frame.w !== WIDTH) throw new RangeError('Finite lenses requires the fixed 720-pixel capture');
  p.loadPixels();
  if (p.pixels.length !== WIDTH * HEIGHT * 4) throw new RangeError('Finite lenses requires pixel density 1');
  const rgba = renderFiniteLens(frame.color);
  p.pixels.set(rgba);
  p.updatePixels();
}

export const finiteLensStudy = {
  id: 'finite-lenses', name: 'Finite lenses', family: 'Light & waves',
  offThread: true, fixedSourceSize: 720,
  control: 'Fixed optics', fixedSettings: '4 spheres · one print',
  formatStrength: () => '4 spheres · one print',
  title: 'One picture. Four refracted views.',
  medium: 'Finite picture / spherical lenses', swatch: '#b5b7a8',
  category: 'FINITE IMAGE OPTICS',
  description: 'Four fixed spheres show inverted, curved fragments of the same captured picture. Dark crescents come from the finite print and direct-path losses. The Garden remains sharp between them.',
  mechanism: 'One finite image plane · two Snell crossings per sphere · polarization-path Fresnel transmission · fixed 16 × 16 pixel sampling. Primary transmitted paths only; reflected paths are omitted and picture misses are black. The original scene and mixer masks stay fixed. This is an image-plane depiction, not a complete water simulation.',
  reference: 'https://www.flickr.com/photos/donkom/35267452620',
  referenceLabel: 'Don Komarechka / Maple Leaf Refraction',
  referencePage: 'https://www.donkom.ca/corkscrew-chandelier/',
  referencePageLabel: 'Shape and refracted imagery',
  draw: drawFiniteLenses,
};
