import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Sculpture } from '@conjure/kit';

type V3 = readonly [number, number, number];

/** A canvas texture painted locally. */
export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Collects geometry per material and merges it into one mesh each, so a building stays a handful of draw calls. */
export class Batch {
  private groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(material: THREE.Material, geometry: THREE.BufferGeometry, at: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], scale?: V3) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation, 'YXZ')),
      new THREE.Vector3(...(scale ?? [1, 1, 1])),
    );
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m);
    const list = this.groups.get(material) ?? [];
    list.push(g);
    this.groups.set(material, list);
    return g;
  }
  box(material: THREE.Material, size: V3, at: V3, rotY = 0) {
    return this.add(material, new THREE.BoxGeometry(...size), at, [0, rotY, 0]);
  }
  cyl(material: THREE.Material, top: number, bottom: number, height: number, at: V3, segments = 12, rotY = 0) {
    return this.add(material, new THREE.CylinderGeometry(top, bottom, height, segments), at, [0, rotY, 0]);
  }
  rod(material: THREE.Material, from: V3, to: V3, radius: number, segments = 6) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const g = new THREE.CylinderGeometry(radius, radius, Math.max(d.length(), 0.0001), segments);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    g.applyQuaternion(q);
    const mid = a.add(b).multiplyScalar(0.5);
    return this.add(material, g, [mid.x, mid.y, mid.z]);
  }
  /** Merge everything into meshes on the sculpture. `uv` may rewrite each merged geometry's uvs. */
  flush(s: Sculpture, options: { shadows?: boolean; uv?: Map<THREE.Material, (g: THREE.BufferGeometry) => void> } = {}) {
    const meshes: THREE.Mesh[] = [];
    for (const [material, list] of this.groups) {
      if (!list.length) continue;
      const merged = list.length === 1 ? list[0] : mergeGeometries(list);
      if (list.length > 1) for (const g of list) g.dispose();
      options.uv?.get(material)?.(merged);
      const mesh = s.mesh(merged, material);
      if (options.shadows === false) mesh.castShadow = false;
      meshes.push(mesh);
    }
    this.groups.clear();
    return meshes;
  }
}

/** World-planar uvs, so a stone texture tiles by metres across merged walls. */
export function planarUV(g: THREE.BufferGeometry, metres = 4) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ny > nx && ny > nz) { u = p.getX(i); v = p.getZ(i); } else if (nx > nz) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / metres; uv[i * 2 + 1] = v / metres;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** A second uv set running up the height, 0 at the ground and 1 at `top`: for floodlight and flag washes on `emissiveMap.channel = 1`. */
export function heightUV(g: THREE.BufferGeometry, top: number, bottom = 0) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = 0.5; uv[i * 2 + 1] = Math.min(1, Math.max(0, (p.getY(i) - bottom) / (top - bottom))); }
  g.setAttribute('uv1', new THREE.BufferAttribute(uv, 2));
}

/** Points of a two-centred pointed arch of width w whose sides rise straight to `spring`; `sharp` 0.5 is round, 1 equilateral. */
export function pointedArch(cx: number, base: number, w: number, spring: number, sharp = 0.8, steps = 10): THREE.Vector2[] {
  const r = w * sharp, half = w / 2;
  const left = new THREE.Vector2(cx - half + r, base + spring); // centre of the left-hand arc
  const apexY = Math.sqrt(Math.max(0, r * r - (r - half) ** 2));
  const end = Math.atan2(apexY, cx - left.x);
  const pts: THREE.Vector2[] = [new THREE.Vector2(cx - half, base)];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (end - Math.PI) * (i / steps);
    pts.push(new THREE.Vector2(left.x + Math.cos(a) * r, left.y + Math.sin(a) * r));
  }
  const right = pts.slice(1, -1).reverse().map((p) => new THREE.Vector2(2 * cx - p.x, p.y));
  pts.push(...right, new THREE.Vector2(cx + half, base));
  return pts;
}

/** Height of the apex of `pointedArch`. */
export const archApex = (w: number, spring: number, sharp = 0.8) => spring + Math.sqrt(Math.max(0, (w * sharp) ** 2 - (w * sharp - w / 2) ** 2));

/** A round-headed arch outline. */
export function roundArch(cx: number, base: number, w: number, spring: number, steps = 12): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(cx - w / 2, base)];
  for (let i = 0; i <= steps; i++) { const a = Math.PI - Math.PI * (i / steps); pts.push(new THREE.Vector2(cx + Math.cos(a) * w / 2, base + spring + Math.sin(a) * w / 2)); }
  pts.push(new THREE.Vector2(cx + w / 2, base));
  return pts;
}

/** A flat wall of width w and height h (centred on x, base at y 0) with holes, extruded `depth` toward +z from z = 0. */
export function wallWithHoles(w: number, h: number, depth: number, holes: THREE.Vector2[][], top?: THREE.Vector2[]) {
  const shape = new THREE.Shape(top ?? [new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]);
  for (const hole of holes) shape.holes.push(new THREE.Path(hole));
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
}

/** A band that follows an arch outline (an archivolt), `width` wide and `depth` deep. */
export function archBand(outline: THREE.Vector2[], width: number, depth: number) {
  // Offset the open outline outward by width, ignoring the two base points' sides being straight.
  const inner = outline;
  const outer: THREE.Vector2[] = [];
  for (let i = 0; i < inner.length; i++) {
    const prev = inner[Math.max(0, i - 1)], next = inner[Math.min(inner.length - 1, i + 1)];
    const t = next.clone().sub(prev).normalize();
    const nrm = new THREE.Vector2(-t.y, t.x); // left of travel: outward for a left-to-right arch
    outer.push(inner[i].clone().addScaledVector(nrm, width));
  }
  const shape = new THREE.Shape([...outer, ...inner.slice().reverse()]);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
}

/** A lathe from [radius, height] pairs. */
export function lathe(profile: readonly (readonly [number, number])[], segments = 16) {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y)), segments);
}

/** An onion or cupola profile of radius r and height h. */
export function onion(r: number, h: number, bulge = 1.15) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const rad = r * (t < 0.55 ? Math.sin((t / 0.55) * Math.PI * 0.5 + 0.35) * bulge : Math.max(0, (1 - t) / 0.45) ** 1.3 * bulge * 0.98);
    pts.push([Math.max(0.0001, rad * (i === 0 ? 0.85 : 1)), t * h]);
  }
  pts[pts.length - 1][0] = 0.0001;
  return lathe(pts, 16);
}

/** A dome: radius r, height h (h = r is a hemisphere). */
export function dome(r: number, h: number, segments = 18) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push([Math.cos(a) * r, Math.sin(a) * h]); }
  pts[pts.length - 1][0] = 0.0001;
  return lathe(pts, segments);
}

export const night = (daylight: number) => {
  const lowSun = Math.abs(daylight - 0.5) * 2;
  return Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
};

/** Vertical wash for emissiveMap on uv1: floodlit from below, a flag in bands, or a plain glow. */
export function washTexture(kind: 'flood' | 'tricolour' | 'even', colour: string) {
  return canvasTexture(4, 128, (c) => {
    if (kind === 'tricolour') {
      // rows run top to bottom in the canvas, so the top of the building is canvas y 0
      c.fillStyle = '#ff8a1e'; c.fillRect(0, 0, 4, 43);
      c.fillStyle = '#f4f4f0'; c.fillRect(0, 43, 4, 42);
      c.fillStyle = '#1fa83a'; c.fillRect(0, 85, 4, 43);
    } else if (kind === 'flood') {
      const g = c.createLinearGradient(0, 0, 0, 128);
      const col = new THREE.Color(colour);
      g.addColorStop(0, `#${col.clone().multiplyScalar(0.35).getHexString()}`);
      g.addColorStop(0.6, `#${col.clone().multiplyScalar(0.75).getHexString()}`);
      g.addColorStop(1, `#${col.getHexString()}`);
      c.fillStyle = g; c.fillRect(0, 0, 4, 128);
    } else { c.fillStyle = colour; c.fillRect(0, 0, 4, 128); }
  }, false);
}

/** An ashlar stone texture in greys (tinted by the material colour), with optional monsoon streaks. */
export function stoneTexture(random: () => number, stain: number, rows = 8, cols = 4, joint = 'rgba(70,60,50,0.55)') {
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
    const rh = 256 / rows, cw = 256 / cols;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? cw / 2 : 0;
      for (let k = -1; k <= cols; k++) {
        const g = 215 + Math.floor(random() * 40);
        c.fillStyle = `rgb(${g},${g - 2},${g - 6})`;
        c.fillRect(k * cw + off + 1, r * rh + 1, cw - 2, rh - 2);
      }
      c.fillStyle = joint; c.fillRect(0, r * rh, 256, 1.5);
      for (let k = -1; k <= cols; k++) c.fillRect(k * cw + off, r * rh, 1.5, rh);
    }
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '90,80,70' : '255,255,255'},0.12)`; c.fillRect(random() * 256, random() * 256, 2, 2); }
    // Monsoon black: streaks running down from ledges.
    for (let i = 0; i < Math.round(stain * 90); i++) {
      const x = random() * 256, y = random() * 256, len = 30 + random() * 140, w = 2 + random() * 9;
      const g = c.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, `rgba(25,25,22,${0.25 + stain * 0.4})`); g.addColorStop(1, 'rgba(25,25,22,0)');
      c.fillStyle = g; c.fillRect(x, y, w, len);
    }
    for (let i = 0; i < Math.round(stain * 25); i++) { c.fillStyle = `rgba(40,55,35,${0.1 + random() * 0.2 * stain})`; c.beginPath(); c.ellipse(random() * 256, random() * 256, 8 + random() * 30, 5 + random() * 18, random() * 3, 0, 7); c.fill(); }
  });
}

/** A carved jali lattice: transparent between the stone. */
export function jaliTexture(pattern: 'stars' | 'diamonds' | 'tracery' = 'diamonds') {
  return canvasTexture(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = '#ffffff'; c.fillStyle = '#ffffff';
    c.lineWidth = pattern === 'tracery' ? 7 : 9;
    if (pattern === 'diamonds') {
      for (let i = -128; i <= 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.stroke(); c.beginPath(); c.moveTo(i, 128); c.lineTo(i + 128, 0); c.stroke(); }
    } else if (pattern === 'stars') {
      for (let x = 0; x <= 128; x += 32) for (let y = 0; y <= 128; y += 32) { c.beginPath(); c.arc(x, y, 13, 0, 7); c.stroke(); }
      c.lineWidth = 5; for (let i = 0; i <= 128; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
    } else {
      for (let x = 16; x < 128; x += 32) for (let y = 16; y < 128; y += 32) { c.beginPath(); c.ellipse(x, y, 11, 14, 0, 0, 7); c.stroke(); }
      c.lineWidth = 6; c.strokeRect(0, 0, 128, 128);
    }
    c.lineWidth = 8; c.strokeRect(0, 0, 128, 128);
  });
}
