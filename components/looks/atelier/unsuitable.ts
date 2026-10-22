/**
 * Treatments left out of the inventory, each with the reason. A treatment belongs here
 * only when it cannot work on a scene it has never seen. Check with /dev/looks.html.
 */
const NEEDS_GARDEN = "Rebuilds Atelier's own Quiet Garden meshes; it refuses any other scene.";
const NEEDS_GEOMETRY = 'Draws from mesh geometry (sections, surface samples, voxels), which a capture does not carry; it comes out blank.';

export const UNSUITABLE: Record<string, string> = {
  'thickness-exposure': NEEDS_GARDEN,
  'section-ribs': NEEDS_GARDEN,
  'chromatic-shadows': NEEDS_GARDEN,
  'single-cutaway': NEEDS_GARDEN,
  'interior-lattice': NEEDS_GARDEN,
  sections: NEEDS_GEOMETRY,
  voxels: NEEDS_GEOMETRY,
  'surface-dots': NEEDS_GEOMETRY,
  'continuous-thread': NEEDS_GEOMETRY,
  'quilled-paper': NEEDS_GEOMETRY,
  wholetoning: 'Exceeds its fixed work budget on scenes with many small shapes and fails.',
  'directional-color': 'Takes about seven seconds, ten times any other treatment.',
};
