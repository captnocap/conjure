import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildContext } from '@conjure/kit';

/** How the molecular world is drawn: a textbook plate, an electron micrograph or a glossy render. */
export const STYLES = {
  pastel: 'Textbook pastel: soft coral and powder-blue lipid heads, butter-yellow tails, candy-coloured proteins.',
  micrograph: 'Electron-micrograph grey: everything in silvery greys and soft charcoal, grainy and scientific.',
  glossy: 'Glossy render: saturated tomato-red and sunflower heads, shiny proteins, like a biotech animation.',
} as const;
export type Style = keyof typeof STYLES;

export interface Palette {
  heads: [string, string];
  tail: string;
  core: string;
  roughness: number;
  /** Colours for proteins, from main to accent. */
  protein: [string, string, string, string];
  glow: string;
}

export const PALETTES: Record<Style, Palette> = {
  pastel: { heads: ['#f0a08e', '#8fbadf'], tail: '#f3d98a', core: '#e2bf6a', roughness: 0.55, protein: ['#a98bd6', '#7fc7a8', '#f2b36b', '#e87f9a'], glow: '#b8f0ff' },
  micrograph: { heads: ['#c9c8c2', '#9d9e9a'], tail: '#7d7d78', core: '#62625d', roughness: 0.8, protein: ['#8e8f8a', '#b4b4ad', '#6e6f6b', '#d5d4cd'], glow: '#f2f2ea' },
  glossy: { heads: ['#f2553c', '#ffc93a'], tail: '#ffe6a0', core: '#e9b84f', roughness: 0.22, protein: ['#2f7de0', '#18b38a', '#9a4be0', '#ff8a1f'], glow: '#7ff7ff' },
};

/** A colour pushed by the scene mood: wear dulls it, warmth tips its hue, cheer lifts saturation. */
export function tone(hex: THREE.ColorRepresentation, context: BuildContext, pale = 0) {
  const { mood } = context;
  const c = new THREE.Color(hex);
  c.offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.2, 0);
  c.lerp(new THREE.Color('#9a958a'), mood.wear * 0.22);
  if (pale > 0) c.lerp(new THREE.Color('#f4f1ea'), pale);
  return c;
}

export function paint(hex: THREE.ColorRepresentation, context: BuildContext, style: Style, options: THREE.MeshPhysicalMaterialParameters = {}) {
  const glossy = style === 'glossy';
  return new THREE.MeshPhysicalMaterial({
    color: tone(hex, context),
    roughness: PALETTES[style].roughness + context.mood.wear * 0.2,
    clearcoat: glossy ? 0.8 : 0,
    clearcoatRoughness: 0.2,
    ...options,
  });
}

export type Field = (x: number, z: number) => number;

export interface PatchOptions {
  width: number;
  depth: number;
  /** Lipid head radius, metres. */
  head: number;
  /** Bottom of the lower heads to top of the upper heads. */
  thickness: number;
  /** Lift of the membrane's midplane at (x, z). */
  lift?: Field;
  /** True where a protein stands and no lipids should be. */
  hole?: (x: number, z: number) => boolean;
  /** 0..1 paleness of the head at (x, z): a dying patch. */
  pale?: Field;
  /** Share of heads in the second colour. */
  mix?: number;
  /** Squeeze of the edge outline; 0 is a crisp block, 1 a ragged torn edge. */
  ragged?: number;
}

/** A pair of fatty tails hanging from y = 0 down to y = -1, one straight and one kinked. */
function tailPair() {
  const a = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.32, 0, 0), new THREE.Vector3(-0.38, -0.33, 0.05), new THREE.Vector3(-0.3, -0.66, -0.04), new THREE.Vector3(-0.36, -1, 0)]);
  const b = new THREE.CatmullRomCurve3([new THREE.Vector3(0.32, 0, 0), new THREE.Vector3(0.36, -0.42, 0), new THREE.Vector3(0.62, -0.62, 0.05), new THREE.Vector3(0.66, -1, 0)]);
  return mergeGeometries([new THREE.TubeGeometry(a, 8, 0.17, 4), new THREE.TubeGeometry(b, 8, 0.17, 4)])!;
}

/**
 * A rectangular block of lipid bilayer, cut away at its edges so the tails show: heads on top,
 * a row of heads and tails round the cut faces, and a solid core behind them. Its bottom heads
 * touch y = 0 where the lift is zero.
 */
export function bilayer(context: BuildContext, palette: Palette, options: PatchOptions) {
  const { random } = context;
  const group = new THREE.Group();
  const { width: W, depth: D, head: R, thickness: T } = options;
  const lift = options.lift ?? (() => 0);
  const hole = options.hole ?? (() => false);
  const pale = options.pale ?? (() => 0);
  const share = options.mix ?? 0.3;
  const step = R * 2.05;
  const row = step * Math.sqrt(3) / 2;
  const ragged = options.ragged ?? 0;
  const edgeX = (z: number) => W / 2 - ragged * R * 2.5 * (0.5 + 0.5 * Math.sin(z * 37 + 1.3));
  const edgeZ = (x: number) => D / 2 - ragged * R * 2.5 * (0.5 + 0.5 * Math.sin(x * 29 + 0.7));

  const colours = palette.heads.map((hex) => tone(hex, context));
  const tops: { at: THREE.Vector3; color: THREE.Color }[] = [];
  const bottoms: { at: THREE.Vector3; color: THREE.Color }[] = [];
  const tails: THREE.Matrix4[] = [];
  const up = new THREE.Quaternion();
  const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  const reach = T / 2 - R * 1.55;
  const rows = Math.ceil(D / row) + 1;
  const cols = Math.ceil(W / step) + 1;
  for (let j = 0; j <= rows; j++) {
    const z = -D / 2 + j * row;
    for (let i = 0; i <= cols; i++) {
      const x = -W / 2 + i * step + (j % 2 ? step / 2 : 0) + (random() - 0.5) * R * 0.25;
      const zz = z + (random() - 0.5) * R * 0.25;
      if (Math.abs(x) > edgeX(zz) || Math.abs(zz) > edgeZ(x)) continue;
      if (hole(x, zz)) continue;
      const mid = T / 2 + lift(x, zz);
      const colour = colours[random() < share ? 1 : 0].clone();
      const p = pale(x, zz);
      if (p > 0) colour.lerp(new THREE.Color('#f6f3ec'), p);
      tops.push({ at: new THREE.Vector3(x, mid + T / 2 - R, zz), color: colour });
      const edge = Math.abs(x) > edgeX(zz) - step * 1.1 || Math.abs(zz) > edgeZ(x) - row * 1.1;
      if (edge) {
        const under = colours[random() < share ? 1 : 0].clone();
        if (p > 0) under.lerp(new THREE.Color('#f6f3ec'), p);
        bottoms.push({ at: new THREE.Vector3(x, mid - T / 2 + R, zz), color: under });
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
        tails.push(new THREE.Matrix4().compose(new THREE.Vector3(x, mid + T / 2 - R * 1.7, zz), up.clone().multiply(spin), new THREE.Vector3(R, reach * (0.92 + random() * 0.12), R)));
        tails.push(new THREE.Matrix4().compose(new THREE.Vector3(x, mid - T / 2 + R * 1.7, zz), down.clone().multiply(spin), new THREE.Vector3(R, reach * (0.92 + random() * 0.12), R)));
      }
    }
  }
  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const headMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: palette.roughness + context.mood.wear * 0.2 });
  const heads = (list: typeof tops) => {
    const mesh = new THREE.InstancedMesh(sphere, headMaterial, Math.max(list.length, 1));
    const m = new THREE.Matrix4();
    list.forEach((item, index) => {
      mesh.setMatrixAt(index, m.makeScale(R, R * 0.92, R).setPosition(item.at));
      mesh.setColorAt(index, item.color);
    });
    mesh.count = list.length;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const topMesh = heads(tops);
  heads(bottoms);
  const tailMesh = new THREE.InstancedMesh(tailPair(), new THREE.MeshStandardMaterial({ color: tone(palette.tail, context), roughness: 0.7 }), Math.max(tails.length, 1));
  tails.forEach((matrix, index) => tailMesh.setMatrixAt(index, matrix));
  tailMesh.count = tails.length;
  tailMesh.castShadow = tailMesh.receiveShadow = true;
  group.add(tailMesh);

  // The oily core behind the cut faces, following the same lift.
  const inset = step * 0.7;
  const coreGeometry = new THREE.BoxGeometry(W - inset * 2 - ragged * R * 5, T - R * 2.6, D - inset * 2 - ragged * R * 5, 40, 1, 30);
  const position = coreGeometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, position.getY(i) + T / 2 + lift(position.getX(i), position.getZ(i)));
  coreGeometry.computeVertexNormals();
  const core = new THREE.Mesh(coreGeometry, new THREE.MeshStandardMaterial({ color: tone(palette.core, context), roughness: 0.9 }));
  core.castShadow = core.receiveShadow = true;
  group.add(core);
  return { group, heads: topMesh, count: tops.length };
}

/**
 * Lipid heads laid over a surface of revolution about the y axis, for buds, pits and collars.
 * The profile runs as [radius, height] pairs.
 */
export function revolvedHeads(context: BuildContext, palette: Palette, profile: readonly (readonly [number, number])[], R: number, share = 0.3, keep: (at: THREE.Vector3) => boolean = () => true) {
  const { random } = context;
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = lengths.at(-1)!;
  const step = R * 2.05;
  const colours = palette.heads.map((hex) => tone(hex, context));
  const items: { at: THREE.Vector3; color: THREE.Color }[] = [];
  for (let s = 0; s <= total; s += step * 0.88) {
    let k = 1;
    while (k < lengths.length - 1 && lengths[k] < s) k++;
    const t = (s - lengths[k - 1]) / Math.max(lengths[k] - lengths[k - 1], 1e-6);
    const p = points[k - 1].clone().lerp(points[k], Math.min(1, Math.max(0, t)));
    const n = Math.max(1, Math.round((Math.PI * 2 * p.x) / step));
    const offset = random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      const at = new THREE.Vector3(Math.cos(a) * p.x, p.y, Math.sin(a) * p.x);
      const color = colours[random() < share ? 1 : 0];
      if (keep(at)) items.push({ at, color });
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: palette.roughness + context.mood.wear * 0.2 }), Math.max(items.length, 1));
  const m = new THREE.Matrix4();
  items.forEach((item, index) => {
    mesh.setMatrixAt(index, m.makeScale(R, R, R).setPosition(item.at));
    mesh.setColorAt(index, item.color);
  });
  mesh.count = items.length;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Instances of one geometry with full transforms and optional colours. */
export function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly { matrix: THREE.Matrix4; color?: THREE.Color }[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  items.forEach((item, index) => {
    mesh.setMatrixAt(index, item.matrix);
    if (item.color) mesh.setColorAt(index, item.color);
  });
  mesh.count = items.length;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A helix path as a curve: radius, rise per turn, turns, starting angle. */
export function helixCurve(radius: number, length: number, turns: number, phase = 0) {
  const points: THREE.Vector3[] = [];
  const steps = Math.max(8, Math.round(turns * 10));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = phase + t * turns * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, t * length, Math.sin(a) * radius));
  }
  return new THREE.CatmullRomCurve3(points);
}
