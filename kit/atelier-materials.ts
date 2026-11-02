/** Source material IDs are prefixed so older Conjure material recipes retain their meaning. */
export const ATELIER_MATERIALS = {
  'atelier-brushed-steel': { says: "Atelier Brushed steel: Directional grain and stretched studio reflections.", metalness: 1, roughness: 0.3 },
  'atelier-chrome': { says: "Atelier Chrome: Crisp softboxes and a dark studio horizon.", metalness: 1, roughness: 0.075 },
  'atelier-brass': { says: "Atelier Brass: Warm conductor reflections and gently polished edges.", metalness: 1, roughness: 0.24 },
  'atelier-copper': { says: "Atelier Copper: Rosy conductor reflections with fine surface grain.", metalness: 1, roughness: 0.23 },
  'atelier-porcelain': { says: "Atelier Porcelain: Soft wrapped body, clear glaze, pooled recesses and fine crazing.", metalness: 0, roughness: 0.38 },
  'atelier-marble': { says: "Atelier Marble: Warped mineral veins at several scales.", metalness: 0, roughness: 0.3 },
  'atelier-concrete': { says: "Atelier Concrete: Matte aggregate, small pits and cast formwork seams.", metalness: 0, roughness: 0.94 },
  'atelier-stone': { says: "Atelier Stone: Mineral grain, settled dust and chipped convex edges.", metalness: 0, roughness: 0.88 },
  'atelier-wood': { says: "Atelier Solid wood: Continuous growth rings, end grain, flowing pores and satin fibers.", metalness: 0, roughness: 0.53 },
  'atelier-frosted-glass': { says: "Atelier Frosted glass: Soft refracted background, fine frost and a faint green tint.", metalness: 0, roughness: 0.19 },
  'atelier-skin': { says: "Atelier Skin: Warm dermal body, layered mottling and fine recessed pores.", metalness: 0, roughness: 0.49 },
  'atelier-adipose': { says: "Atelier Fatty tissue: Packed rounded lobules, pale septa and a soft waxy body.", metalness: 0, roughness: 0.34 },
  'atelier-muscle': { says: "Atelier Aligned muscle: Continuous longitudinal fascicles, fine cross-striation and moist directional sheen.", metalness: 0, roughness: 0.36 },
  'atelier-cortical-bone': { says: "Atelier Cortical bone: Dense ivory matrix, aligned osteons, fine lamellae and narrow canals.", metalness: 0, roughness: 0.61 },
  'atelier-cancellous-bone': { says: "Atelier Cancellous bone: Connected trabecular web and deep shaded pores; surface approximation.", metalness: 0, roughness: 0.82 },
  'atelier-velvet': { says: "Atelier Velvet: Deep dyed pile and a broad, soft grazing fiber sheen.", metalness: 0, roughness: 0.94 },
  'atelier-woven-linen': { says: "Atelier Woven linen: Interlaced yarns, recessed crossings and soft directional catches.", metalness: 0, roughness: 0.65 },
  'atelier-diffraction-foil': { says: "Atelier Diffraction foil: Directional-light spectral glints and neutral studio reflection.", metalness: 1, roughness: 0.24 },
  'atelier-hammered-metal': { says: "Atelier Hammered metal: Shallow overlapping impacts break the reflected studio cards.", metalness: 1, roughness: 0.23 },
  'atelier-interference-coat': { says: "Atelier Interference coat: A uniform dielectric film over a dark opaque body.", metalness: 0, roughness: 0.1 },
  'atelier-tiled-surface': { says: "Atelier Tiled surface: Dark abstract plate relief with stock dielectric reflection.", metalness: 0, roughness: 0.63 },
  'atelier-perlage-metal': { says: "Atelier Circular-grained metal: Overlapping circular reflection fields attached to the surface.", metalness: 1, roughness: 0.3 },
} as const;

export type AtelierMaterialName = keyof typeof ATELIER_MATERIALS;
export const isAtelierMaterial = (value: unknown): value is AtelierMaterialName =>
  typeof value === 'string' && Object.hasOwn(ATELIER_MATERIALS, value);

/** These source shaders require the original Garden's admitted surface charts and visibility model. */
export const SCOPED_ATELIER_MATERIALS = {
  'perforated-shell': 'Requires the original Vase/Sphere shell charts, aperture-aware capture passes and shadow visibility; not offered for arbitrary Conjure meshes.',
  'shingle-relief': 'Requires the original Vase outer-profile chart and reserved interior region; not offered for arbitrary Conjure meshes.',
  'enamel-reserve': 'Requires the original Vase outer-profile chart, reserve domain and shared radiance quadrature; not offered for arbitrary Conjure meshes.',
  'ribbed-clay': 'Requires the original Vase outer-profile chart, joined-course domain and reserved interior region; not offered for arbitrary Conjure meshes.',
} as const;
