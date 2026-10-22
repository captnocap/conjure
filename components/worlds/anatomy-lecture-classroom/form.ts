import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Small shared vocabulary for organic, hand-modelled forms: warped globes, swept tubes, painted skins. */
export const DEG = Math.PI / 180;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const bump = (x: number, centre: number, width: number) => Math.exp(-(((x - centre) / width) ** 2));

/** Direction from longitude (degrees, 0 faces +z, positive toward +x) and latitude (degrees up). */
export function dir(lon: number, lat: number, out = new THREE.Vector3()) {
  const a = lon * DEG, b = lat * DEG;
  return out.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
}

/**
 * A sphere-like surface shaped by a function of direction. UVs are equirectangular with the
 * front (+z) at u = 0.5, so a skin painted in longitude and latitude lands where it is aimed.
 */
export function globe(
  shape: (d: THREE.Vector3, lon: number, lat: number) => THREE.Vector3,
  wide = 96, high = 64, lonFrom = -180, lonTo = 180, latTop = 90, latBottom = -90,
) {
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const d = new THREE.Vector3();
  for (let iy = 0; iy <= high; iy++) {
    const lat = latTop + (latBottom - latTop) * iy / high;
    for (let ix = 0; ix <= wide; ix++) {
      const lon = lonFrom + (lonTo - lonFrom) * ix / wide;
      const p = shape(dir(lon, lat, d), lon, lat);
      positions.push(p.x, p.y, p.z);
      uvs.push(0.5 + lon / 360, 0.5 + lat / 180);
    }
  }
  for (let iy = 0; iy < high; iy++)
    for (let ix = 0; ix < wide; ix++) {
      const a = iy * (wide + 1) + ix, b = a + 1, c = a + wide + 1, e = c + 1;
      index.push(a, c, b, b, c, e);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A canvas painted by the caller, as a colour texture. */
export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A skin for a globe. Inside `draw` the canvas is measured in degrees: x is longitude, y is latitude (up). */
export function skin(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  return painted(width, height, (ctx, w, h) => {
    ctx.setTransform(w / 360, 0, 0, -h / 180, w / 2, h / 2);
    ctx.lineCap = ctx.lineJoin = 'round';
    draw(ctx);
  });
}

/** Upright lettering on a skin, corrected for the stretch of latitude. Size is in degrees. */
export function inkText(ctx: CanvasRenderingContext2D, text: string, lon: number, lat: number, size: number, colour: string, turn = 0, font = 'serif') {
  ctx.save();
  ctx.translate(lon, lat);
  ctx.scale(1 / Math.max(0.35, Math.cos(lat * DEG)), -1);
  ctx.rotate(turn);
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A round spot on a skin that stays round on the surface. Radius in degrees. */
export function spot(ctx: CanvasRenderingContext2D, lon: number, lat: number, radius: number, colour: string, tall = 1) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(lon, lat, radius / Math.max(0.3, Math.cos(lat * DEG)), radius * tall, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A soft-edged stain on a skin. */
export function stain(ctx: CanvasRenderingContext2D, lon: number, lat: number, radius: number, colour: string, alpha: number) {
  const stretch = 1 / Math.max(0.3, Math.cos(lat * DEG));
  ctx.save();
  ctx.translate(lon, lat);
  ctx.scale(stretch, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  const c = new THREE.Color(colour);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  ctx.globalAlpha = 1;
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A wandering line through lon/lat points, for sutures, cracks and pencil. */
export function scribble(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], width: number, colour: string, wobble = 0, random: () => number = () => 0.5) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    const steps = wobble > 0 ? Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (wobble * 1.3))) : 1;
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const t = k / steps, edge = k === 0 || k === steps ? 0 : 1;
      const x = lerp(x0, x1, t) + (random() - 0.5) * 2 * wobble * edge, y = lerp(y0, y1, t) + (random() - 0.5) * 2 * wobble * edge;
      if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/** A tube with an elliptical section swept along a path, held upright against `up` so it never twists. */
export function sweep(
  points: readonly THREE.Vector3[],
  section: (t: number) => readonly [number, number],
  options: { steps?: number; sides?: number; up?: THREE.Vector3; closed?: boolean } = {},
) {
  const steps = options.steps ?? 48, sides = options.sides ?? 10, up = options.up ?? new THREE.Vector3(0, 1, 0);
  const closed = options.closed ?? false;
  const curve = new THREE.CatmullRomCurve3([...points], closed);
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const side = new THREE.Vector3(), lift = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPoint(t), tangent = curve.getTangent(t);
    side.crossVectors(tangent, up);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    side.normalize();
    lift.crossVectors(side, tangent).normalize();
    const [rs, ru] = section(t);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      v.copy(p).addScaledVector(side, Math.cos(a) * rs).addScaledVector(lift, Math.sin(a) * ru);
      positions.push(v.x, v.y, v.z);
      uvs.push(t, j / sides);
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * ring + j, b = a + ring, c = a + 1, e = b + 1;
      index.push(a, b, c, b, e, c);
    }
  if (!closed)
    for (const end of [0, steps]) {
      const p = curve.getPoint(end / steps);
      const centre = positions.length / 3;
      positions.push(p.x, p.y, p.z);
      uvs.push(end / steps, 0.5);
      for (let j = 0; j < sides; j++) {
        const a = end * ring + j;
        if (end === 0) index.push(centre, a, a + 1); else index.push(centre, a + 1, a);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Merge loose parts into one shadow-casting mesh and free the parts. */
export function fuse(parts: readonly THREE.BufferGeometry[], material: THREE.Material) {
  const flat = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  });
  const merged = flat.length ? mergeGeometries(flat) : null;
  const mesh = new THREE.Mesh(merged ?? new THREE.BufferGeometry(), material);
  for (const g of flat) g.dispose();
  for (const g of parts) g.dispose();
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A geometry moved, turned and scaled in place: for parts about to be fused. */
export function placed(geometry: THREE.BufferGeometry, at: readonly [number, number, number], scale: readonly [number, number, number] = [1, 1, 1], turn: readonly [number, number, number] = [0, 0, 0]) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...scale));
  return geometry.applyMatrix4(m);
}

/** A bar between two points with an elliptical section. */
export function strut(from: readonly [number, number, number], to: readonly [number, number, number], radius: number, endRadius = radius, sides = 8) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), along = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(endRadius, radius, Math.max(along.length(), 1e-4), sides);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.clone().normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}

/** A coil spring between two points. */
export function spring(from: readonly [number, number, number], to: readonly [number, number, number], radius: number, wire: number, turns = 9) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), along = b.clone().sub(a);
  const axis = along.clone().normalize();
  const u = new THREE.Vector3(1, 0, 0).cross(axis);
  if (u.lengthSq() < 1e-6) u.set(0, 0, 1);
  u.normalize();
  const w = axis.clone().cross(u);
  const points: THREE.Vector3[] = [];
  const n = turns * 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n, angle = t * turns * Math.PI * 2, r = radius * smooth(0, 0.06, t) * smooth(1, 0.94, t);
    points.push(a.clone().addScaledVector(along, t).addScaledVector(u, Math.cos(angle) * r).addScaledVector(w, Math.sin(angle) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), n * 2, wire, 5, false);
}
