import { drawVolumeBar } from './volume-bar.js';

// The graph stays fixed; ordinary mixer influence composites its completed image.
export const volumeBarStudy = Object.freeze({
  id: 'interior-lattice', name: 'Interior lattice', family: 'Lines & geometry', offThread: true,
  title: 'Interior bars leave room for light.', control: 'Fixed settings',
  fixedSettings: '1,503 bars · fixed gauge', medium: 'Contained interior lattice / original-surface hybrid',
  formatStrength: () => '1,503 bars · fixed gauge',
  swatch: '#aaa47d', category: 'ORIGINAL-SHAPE RENDERING PROXY',
  description: 'A fixed square-bar lattice replaces selected closed bodies. The torus becomes angular, the sphere becomes a cage, and the lowest stair disappears. The floor, thin base, vase, plant and small pebble retain their original surfaces.',
  mechanism: 'Certified finite prisms inside the original triangle-defined solids · separate depth and own-shadow raster · fixed matte object pigments. Bars retreat from the skin; silhouette, topology and self-support are not preserved or promised. True mesh openings remain; shader-only material holes, textures, reflections and transmission are ignored, including on retained original surfaces. Partial and object-scoped mixes use the original-image masks and retain lower imagery. Scene camera, light and pigments remain inputs; seed and shared treatment strength do not change this fixed study.',
  reference: 'https://www.antonygormley.com/works/sculpture/series/domain',
  referenceLabel: 'Antony Gormley / Domains',
  draw: drawVolumeBar,
});
