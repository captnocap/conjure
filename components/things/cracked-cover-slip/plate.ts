import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

/** Shared plate vocabulary for the petri-dish things. Everything is in millimetres. */
export const TAU = Math.PI * 2;

export const MEDIA = {
  amber: 'Clear amber nutrient agar, glowing like weak tea over a lightbox.',
  blood: 'Opaque blood agar, a deep arterial red.',
  pale: 'Pale straw-coloured agar, almost colourless, clinical.',
  chocolate: 'Chocolate agar, an opaque warm brown.',
  rose: 'Rose-pink selective agar, the colour of cough medicine.',
  violet: 'Dark violet dye agar, nearly black at the edges.',
} as const;
export type Medium = keyof typeof MEDIA;
export const MEDIA_COLOUR: Record<Medium, string> = {
  amber: '#e0a13c', blood: '#a3202a', pale: '#e9dfb4', chocolate: '#7a4a30', rose: '#e08a9c', violet: '#55305f',
};

/** A smooth periodic wobble in roughly -1..1, different for every call. */
export function wobble(random: () => number, terms = 4, base = 2) {
  const parts = Array.from({ length: terms }, (_unused, i) => ({ k: base + i + Math.floor(random() * 2), p: random() * TAU, w: 1 / (i + 1) }));
  const total = parts.reduce((sum, part) => sum + part.w, 0);
  return (angle: number) => parts.reduce((sum, part) => sum + Math.sin(angle * part.k + part.p) * part.w, 0) / total;
}

/**
 * A low mound seen from above: `outline(angle)` is its edge radius, `profile(t, angle)` its
 * height from the centre (t = 0) to the edge (t = 1). Optional per-vertex tint.
 */
export function dome(
  outline: (angle: number) => number,
  profile: (t: number, angle: number) => number,
  rings = 10,
  segments = 40,
  tint?: (t: number, angle: number) => THREE.ColorRepresentation,
) {
  const position: number[] = [], uv: number[] = [], colour: number[] = [], index: number[] = [];
  let reach = 0.0001;
  for (let j = 0; j < segments; j++) reach = Math.max(reach, outline((j / segments) * TAU));
  const c = new THREE.Color();
  const push = (x: number, y: number, z: number, t: number, a: number) => {
    position.push(x, y, z);
    uv.push(0.5 + x / (2 * reach), 0.5 - z / (2 * reach));
    if (tint) { c.set(tint(t, a)); colour.push(c.r, c.g, c.b); }
  };
  push(0, profile(0, 0), 0, 0, 0);
  for (let i = 1; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * TAU, r = outline(a) * t;
      push(Math.cos(a) * r, profile(t, a), Math.sin(a) * r, t, a);
    }
  }
  for (let j = 0; j < segments; j++) index.push(0, 1 + ((j + 1) % segments), 1 + j);
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < segments; j++) {
      const a0 = 1 + i * segments + j, a1 = 1 + i * segments + ((j + 1) % segments);
      const b0 = a0 + segments, b1 = a1 + segments;
      index.push(a0, b1, b0, a0, a1, b1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (tint) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A canvas painted locally and used as a colour map. */
export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Wet, glossy living matter. */
export function gloss(colour: THREE.ColorRepresentation, options: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, ...options });
}

/**
 * A round slab of gel, lit from below. Returns the height of its top face.
 * `map` paints the top face (lawns, streaks, stains); u runs along +x and v along -z.
 */
export function agarPad(s: Sculpture, radius: number, medium: Medium, options: { thickness?: number; map?: THREE.Texture; glow?: number } = {}) {
  const { mood } = s.context;
  const thickness = options.thickness ?? 1.6;
  const base = new THREE.Color(MEDIA_COLOUR[medium]);
  base.offsetHSL((mood.warmth - 0.5) * 0.03, 0, (mood.daylight < 0.5 ? mood.daylight - 0.5 : 0.5 - mood.daylight) * 0.08);
  const glow = options.glow ?? 0.28 + (1 - Math.abs(mood.daylight - 0.5) * 2) * 0.0 + mood.cheer * 0.12;
  const gel = new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2, emissive: base, emissiveIntensity: glow });
  s.lathe([[0, 0], [radius, 0], [radius + 0.15, thickness * 0.55], [radius - thickness * 0.35, thickness], [0, thickness]], gel);
  if (options.map) {
    const top = new THREE.MeshPhysicalMaterial({ map: options.map, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.25, emissive: '#ffffff', emissiveMap: options.map, emissiveIntensity: glow * 0.8 });
    const face = s.mesh(new THREE.CircleGeometry(radius - thickness * 0.35, 56), top, [0, thickness + 0.02, 0]);
    face.rotation.x = -Math.PI / 2;
    face.castShadow = false;
  }
  return thickness;
}

/** Hairline cracks where a drying gel has split. */
export function dryingCracks(s: Sculpture, radius: number, top: number, amount: number) {
  const { random } = s.context;
  const dark = s.material('#3a2a1c', { roughness: 0.9 });
  const count = Math.round(amount * 7);
  for (let i = 0; i < count; i++) {
    let a = random() * TAU, r = radius * (0.95 - random() * 0.1);
    let x = Math.cos(a) * r, z = Math.sin(a) * r;
    const steps = 2 + Math.floor(random() * 3);
    a += Math.PI + (random() - 0.5);
    for (let k = 0; k < steps; k++) {
      const len = radius * (0.12 + random() * 0.18);
      const nx = x + Math.cos(a) * len, nz = z + Math.sin(a) * len;
      if (Math.hypot(nx, nz) > radius * 0.97) break;
      s.rod([x, top + 0.03, z], [nx, top + 0.03, nz], 0.09 + amount * 0.08, dark, 0.03).castShadow = false;
      x = nx; z = nz; a += (random() - 0.5) * 1.4;
    }
  }
}
