import type { AtelierStyle } from './atelier';

/** Describe the variable-scene ports without advertising the source study's fixed garden. */
const descriptions: Record<string, string> = {
  'thickness-exposure': 'An X-ray-like exposure from actual travel through the scene geometry: closed bodies accumulate thickness and open sheets contribute by incidence. Reveals overlapping volumes and hidden construction.',
  'section-ribs': 'Intersecting section planes rebuild the scene as open ribs and ribbon cages, with their own depth and shadows. The spaces between slices become part of the form.',
  'chromatic-shadows': 'Cyan and magenta distinguish geometry blocking the scene’s directional lights. Their overlapping footprints make a false-color shadow atlas while captured brightness retains surface detail.',
  'single-cutaway': 'A plane cuts through the actual scene geometry and exposes the retained halves and their section faces. An architectural or anatomical explanation of what lies inside.',
  'interior-lattice': 'An open lattice of bars inside closed scene meshes, retaining open sheets where no solid interior exists. The original shapes are read through internal structure and newly cast shadows.',
};

export const describeStudy = (style: AtelierStyle): string =>
  `${style.name} (${style.medium}). ${descriptions[style.id] ?? style.description}`;
