import * as THREE from 'three';
import { type Mood, type Sculpture, type Thing, disposeTree, mix, visibleBounds } from '@conjure/kit';

/** The colour of open water for a mood: slate grey when grim, clear blue when glad. */
export function seaColour(mood: Mood): THREE.Color {
  const colour = new THREE.Color('#5f727b').lerp(new THREE.Color('#2f7fa3'), mood.cheer);
  colour.lerp(new THREE.Color('#3f9c94'), mood.warmth * mood.cheer * 0.3);
  return colour;
}

/** A flat wobbly band on the water: a ripple ring or a foam line. */
export function ringBand(rx: number, rz: number, width: number, wobble: number, phase: number, y: number, from = 0, sweep = Math.PI * 2) {
  const segments = 56;
  const positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = from + (i / segments) * sweep;
    const k = 1 + wobble * (Math.sin(angle * 3 + phase) * 0.6 + Math.sin(angle * 7 + phase * 2.3) * 0.4);
    const taper = sweep < Math.PI * 2 - 0.01 ? Math.sin((i / segments) * Math.PI) : 1;
    for (const side of [-1, 1]) positions.push(Math.cos(angle) * (rx * k + side * width * taper * 0.5), y, Math.sin(angle) * (rz * k + side * width * taper * 0.5));
    if (i < segments) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A small cut-out of sea for a floating thing to sit in. Its top is the waterline, y = 0. */
export function waterPatch(s: Sculpture, rx: number, rz: number, options: { rings?: number; foam?: number; at?: readonly [number, number] } = {}) {
  const { mood, random } = s.context;
  const [cx, cz] = options.at ?? [0, 0];
  const size = Math.max(rx, rz);
  const phase = random() * 6;
  const shape = new THREE.Shape();
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(angle * 3 + phase) + 0.04 * Math.sin(angle * 5 + phase * 1.7);
    const x = Math.cos(angle) * rx * k, y = Math.sin(angle) * rz * k;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const thick = size * 0.07;
  s.root.userData.waterline = Math.max(s.root.userData.waterline ?? 0, thick);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const sea = seaColour(mood);
  const water = s.mesh(geometry, new THREE.MeshStandardMaterial({ color: sea, roughness: 0.22, metalness: 0.15 }), [cx, -thick, cz]);
  water.castShadow = false;
  const pale = new THREE.MeshStandardMaterial({ color: sea.clone().lerp(new THREE.Color('#ffffff'), 0.45), roughness: 0.5 });
  const rings = options.rings ?? 2;
  for (let i = 0; i < rings; i++) {
    const f = mix(0.5, 0.88, rings === 1 ? 0.6 : i / (rings - 1));
    const start = random() * 6;
    const ring = s.mesh(ringBand(rx * f, rz * f, size * mix(0.01, 0.022, mood.energy), 0.04, random() * 6, 0, start, Math.PI * mix(1.1, 1.9, random())), pale, [cx, size * 0.002, cz]);
    ring.castShadow = false;
  }
  const foam = Math.round((options.foam ?? 0) * mix(0.4, 1.6, mood.energy));
  if (foam > 0) {
    const white = new THREE.MeshStandardMaterial({ color: '#f4f8f8', roughness: 0.8 });
    const blob = new THREE.SphereGeometry(1, 8, 6);
    blob.scale(1, 0.35, 1);
    s.scatter(blob, white, Array.from({ length: foam }, () => {
      const angle = random() * Math.PI * 2, d = mix(0.25, 0.8, random());
      return { at: [cx + Math.cos(angle) * rx * d, 0, cz + Math.sin(angle) * rz * d] as const, size: size * mix(0.02, 0.05, random()) };
    })).castShadow = false;
  }
  return water;
}

/** Centre the thing in plan and keep its waterline on y = 0; whatever hangs below is buried by the ground. */
export function afloat(s: Sculpture, options: { footprint?: number; update?: Thing['update'] } = {}): Thing {
  const bounds = visibleBounds(s.root);
  if (!bounds.isEmpty()) {
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.position.x -= centre.x;
    s.root.position.z -= centre.z;
    s.root.position.y += s.root.userData.waterline ?? 0;
  }
  return { object: s.root, ...options, dispose: () => disposeTree(s.root) };
}

/** A canvas painted once and used as a colour map. */
export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
