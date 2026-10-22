import * as THREE from 'three';

export type P3 = readonly [number, number, number];

export interface TaperOptions {
  segments?: number;
  sides?: number;
  /** Squash across the binormal: 1 round, 0.5 an oval. */
  flat?: number;
  /** Number of lengthwise ridges and how deep they cut (fraction of radius). */
  ridges?: number;
  ridgeDepth?: number;
  /** Radians the ridges turn over the full length: a spiral. */
  spiral?: number;
  /** Use only the first part of the path, 0..1. */
  until?: number;
}

/** A tube along a smooth path whose radius changes along its length: tusks, trunks, horns, beaks. */
export function taper(points: readonly P3[], radius: (t: number) => number, options: TaperOptions = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const n = options.segments ?? 40, m = options.sides ?? 12, until = options.until ?? 1;
  const frames = curve.computeFrenetFrames(n, false);
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  const centre = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * until;
    curve.getPointAt(t, centre);
    const frame = Math.min(n, Math.round(t * n));
    const N = frames.normals[frame], B = frames.binormals[frame];
    const r = radius(t);
    for (let j = 0; j <= m; j++) {
      const a = (j / m) * Math.PI * 2;
      const rr = r * (1 + (options.ridgeDepth ?? 0) * Math.sin((options.ridges ?? 0) * a + (options.spiral ?? 0) * t));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * (options.flat ?? 1);
      position.push(centre.x + N.x * x + B.x * y, centre.y + N.y * x + B.y * y, centre.z + N.z * x + B.z * y);
      uv.push(j / m, t);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const a = i * (m + 1) + j, b = a + m + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  // Fan caps at both ends.
  for (const end of [0, n]) {
    const t = (end / n) * until;
    curve.getPointAt(t, centre);
    const c = position.length / 3;
    position.push(centre.x, centre.y, centre.z);
    uv.push(0.5, t);
    for (let j = 0; j < m; j++) {
      const a = end * (m + 1) + j;
      if (end === 0) index.push(c, a + 1, a); else index.push(c, a, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A point on the same smooth path `taper` follows. */
export function along(points: readonly P3[], t: number): P3 {
  const p = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q))).getPointAt(Math.min(1, Math.max(0, t)));
  return [p.x, p.y, p.z];
}

export function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A lumpy rounded mass: rock, plaster, a skull cap. `bump` is the fraction of radius it wanders. */
export function lump(random: () => number, bump = 0.18, detail = 2) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const p = geometry.attributes.position;
  const phase = [random() * 6, random() * 6, random() * 6];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + bump * (Math.sin(v.x * 3.1 + phase[0]) * Math.cos(v.y * 2.7 + phase[1]) + 0.6 * Math.sin(v.z * 4.3 + phase[2] + v.x * 2));
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A small card with hand lettering: a specimen tag, a plaque, an evidence label. */
export function card(lines: readonly string[], width: number, height: number, ink = '#2b2620', paper = '#efe6cc', font = 'serif') {
  const texture = canvasTexture(256, Math.max(32, Math.round((256 * height) / width)), (ctx, w, h) => {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min((h * 0.72) / lines.length, 46);
    lines.forEach((line, i) => {
      ctx.font = `${i === 0 ? 'bold ' : 'italic '}${size * (i === 0 ? 1 : 0.8)}px ${font}`;
      ctx.fillText(line, w / 2, (h * (i + 0.5)) / lines.length + (i === 0 ? 2 : -2), w - 24);
    });
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}
