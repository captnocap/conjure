import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

/** Shared-by-copy helpers for the circuit-board family. Working unit is the millimetre. */
export type Ctx = CanvasRenderingContext2D;

export function paint(width: number, height: number, draw: (ctx: Ctx, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.round(width));
  canvas.height = Math.max(8, Math.round(height));
  draw(canvas.getContext('2d')!, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const MASKS = {
  green: { mask: '#1e6b3d', trace: '#2f9154', silk: '#f2f2e6', edge: '#b3a560', pad: '#cfd2cc' },
  blue: { mask: '#1d4189', trace: '#3264bd', silk: '#ffffff', edge: '#b3a560', pad: '#cfd2cc' },
  tan: { mask: '#b98e52', trace: '#b5633a', silk: '#2d2a24', edge: '#8d6938', pad: '#cfd2cc' },
  black: { mask: '#24282a', trace: '#363c40', silk: '#f5f5f5', edge: '#6e684c', pad: '#d6b65c' },
  red: { mask: '#a12227', trace: '#c8413f', silk: '#ffffff', edge: '#b3a560', pad: '#d6b65c' },
} as const;
export type MaskKey = keyof typeof MASKS;

export const MASK_OPTIONS = {
  green: 'Classic glossy green solder mask over fibreglass, the colour of every machine ever opened.',
  blue: 'Deep blue mask with white lettering, a tidier and more recent product.',
  tan: 'Bare tan phenolic paper with fat copper tracks and black ink, a 1970s radio or toy.',
  black: 'Matte black mask with gold pads, expensive, secretive, built to be looked at.',
  red: 'Bright red hobbyist mask with gold pads, a kit somebody soldered at home.',
} as const;

export interface BoardSpec {
  w: number;
  d: number;
  mask: MaskKey;
  random: () => number;
  wear: number;
  pads?: readonly { x: number; z: number; r?: number; square?: boolean }[];
  silk?: readonly { text: string; x: number; z: number; size?: number; turn?: number }[];
  outlines?: readonly { x: number; z: number; w: number; d: number; round?: boolean }[];
  /** Extra painting in millimetre space: the context is already scaled and centred on the board. */
  extra?: (ctx: Ctx) => void;
}

/** A snapped-off rectangle of printed circuit board whose top face sits at y = 0. */
export function board(s: Sculpture, spec: BoardSpec) {
  const { w, d, random, wear } = spec;
  const tone = MASKS[spec.mask];
  const ppm = Math.min(22, 1024 / Math.max(w, d));
  const top = paint(w * ppm, d * ppm, (ctx) => {
    ctx.scale(ppm, ppm);
    ctx.translate(w / 2, d / 2);
    ctx.fillStyle = tone.mask;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Tracks: a bus of parallel avenues with a 45 degree jog, then one track away from each pad.
    ctx.strokeStyle = tone.trace;
    const lanes = 3 + Math.floor(random() * 4);
    const busZ = (random() - 0.5) * d * 0.5, jogX = (random() - 0.5) * w * 0.5, jog = (random() < 0.5 ? -1 : 1) * (2 + random() * 4);
    for (let lane = 0; lane < lanes; lane++) {
      const z = busZ + lane * 1.3;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-w, z);
      ctx.lineTo(jogX + lane * 1.3 * Math.sign(jog) * 0.4, z);
      ctx.lineTo(jogX + Math.abs(jog) + lane * 1.3 * Math.sign(jog) * 0.4, z + jog);
      ctx.lineTo(w, z + jog);
      ctx.stroke();
    }
    for (const pad of spec.pads ?? []) {
      const out = (Math.abs(pad.z) < 0.01 ? (random() < 0.5 ? -1 : 1) : Math.sign(pad.z));
      const first = 2.5 + random() * 4, slide = (random() < 0.5 ? -1 : 1) * (2 + random() * 5);
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.z);
      ctx.lineTo(pad.x, pad.z + out * first);
      ctx.lineTo(pad.x + slide, pad.z + out * (first + Math.abs(slide)));
      ctx.lineTo(pad.x + slide, out * d);
      ctx.stroke();
    }
    // Vias, like manhole covers.
    for (let via = 0; via < Math.round(w * d / 90); via++) {
      const x = (random() - 0.5) * (w - 3), z = (random() - 0.5) * (d - 3);
      ctx.fillStyle = tone.trace;
      ctx.beginPath(); ctx.arc(x, z, 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10261a';
      ctx.beginPath(); ctx.arc(x, z, 0.26, 0, Math.PI * 2); ctx.fill();
    }
    // A mounting hole in one corner.
    const hx = (w / 2 - 3.2) * (random() < 0.5 ? -1 : 1), hz = -(d / 2 - 3.2);
    ctx.fillStyle = tone.pad;
    ctx.beginPath(); ctx.arc(hx, hz, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.arc(hx, hz, 1.4, 0, Math.PI * 2); ctx.fill();
    // Silkscreen.
    ctx.strokeStyle = tone.silk;
    ctx.fillStyle = tone.silk;
    ctx.lineWidth = 0.28;
    for (const outline of spec.outlines ?? []) {
      ctx.beginPath();
      if (outline.round) ctx.ellipse(outline.x, outline.z, outline.w / 2, outline.d / 2, 0, 0, Math.PI * 2);
      else ctx.rect(outline.x - outline.w / 2, outline.z - outline.d / 2, outline.w, outline.d);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const mark of spec.silk ?? []) {
      ctx.save();
      ctx.translate(mark.x, mark.z);
      ctx.rotate(mark.turn ?? 0);
      ctx.font = `bold ${mark.size ?? 2.2}px monospace`;
      ctx.fillText(mark.text, 0, 0);
      ctx.restore();
    }
    // Pads: tinned rings round a drilled hole.
    for (const pad of spec.pads ?? []) {
      const r = pad.r ?? 1.1;
      ctx.fillStyle = tone.pad;
      ctx.beginPath();
      if (pad.square) ctx.rect(pad.x - r, pad.z - r, r * 2, r * 2); else ctx.arc(pad.x, pad.z, r, 0, Math.PI * 2);
      ctx.fill();
    }
    spec.extra?.(ctx);
    // Age: flux stains, dust and scratches.
    for (let stain = 0; stain < Math.round(wear * 9); stain++) {
      const x = (random() - 0.5) * w, z = (random() - 0.5) * d, r = 1.5 + random() * 5;
      const gradient = ctx.createRadialGradient(x, z, 0, x, z, r);
      gradient.addColorStop(0, `rgba(96,72,38,${0.28 * wear})`);
      gradient.addColorStop(1, 'rgba(96,72,38,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, z - r, r * 2, r * 2);
    }
    ctx.fillStyle = `rgba(214,208,190,${0.1 + wear * 0.45})`;
    for (let speck = 0; speck < Math.round(wear * w * d * 0.5); speck++)
      ctx.fillRect((random() - 0.5) * w, (random() - 0.5) * d, 0.12 + random() * 0.25, 0.12 + random() * 0.2);
  });
  const edge = s.material(tone.edge, { roughness: 0.8 });
  const face = new THREE.MeshStandardMaterial({ map: top, roughness: 0.42 + wear * 0.4, metalness: 0.05 });
  const under = s.material(tone.mask, { roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), [edge, edge, face, under, edge, edge]);
  mesh.position.y = -0.8;
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

/** Run some Sculpture calls and collect what they made into one group that can be posed. */
export function gather(s: Sculpture, make: () => void) {
  const before = s.root.children.length;
  make();
  const group = new THREE.Group();
  for (const child of s.root.children.slice(before)) group.add(child);
  s.root.add(group);
  return group;
}

export function place(position: readonly [number, number, number], turn: readonly [number, number, number] = [0, 0, 0], scale: readonly [number, number, number] = [1, 1, 1]) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...scale));
}

/** Many copies of one solid in a single draw call. */
export function instances(s: Sculpture, geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(matrices.length, 1));
  mesh.count = matrices.length;
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

export const pick = <T,>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length) % list.length];

/** A solder fillet: a small bright cone round a leg. */
export function solder(s: Sculpture, x: number, z: number, material: THREE.Material, size = 1) {
  return s.cylinder(0.3 * size, 1.05 * size, 0.7 * size, [x, 0.35 * size, z], material, 12);
}
