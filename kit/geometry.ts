import * as THREE from 'three';
import type { BuildContext, Thing } from './contract';
import { disposeTree } from './dispose';
import { visibleBounds } from './measure';

type Point = readonly [number, number, number];
type Paint = THREE.Material;

/** Something a draped cloth rests on: a box (full size), a ball (radius) or an upright cylinder (radius, height), each centred on `at`. */
export type DrapeSupport =
  | { box: Point; at: Point }
  | { ball: number; at: Point }
  | { cylinder: readonly [number, number]; at: Point };

export interface DrapeOptions {
  /** Width (x) and depth (z) of the cloth in metres, laid flat before it falls. */
  size: readonly [number, number];
  /** Centre of the flat cloth before it falls; its height is where it is dropped from. */
  at: Point;
  /** What it falls onto. */
  over?: readonly DrapeSupport[];
  /** Height of the ground that catches it. Default 0; null for no ground. */
  floor?: number | null;
  /** Pin it so it hangs: by its four corners (a hammock, an awning) or along its back, -z, edge (a curtain, a towel on a rail). */
  hang?: 'none' | 'corners' | 'back-edge';
  /** 0 is limp silk, 1 stiff canvas. Default 0.4. */
  stiffness?: number;
  /** Grid cells along the longer side. Default 32. */
  detail?: number;
  /** A little irregularity so the folds are not perfectly regular, from the build's random. 0 to 1, default 0.3. */
  rumple?: number;
}

/** Small geometry vocabulary for independent procedural components. All units are metres. */
export class Sculpture {
  readonly root = new THREE.Group();
  constructor(readonly context: BuildContext) {}

  material(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
    const tint = new THREE.Color(color);
    tint.lerp(new THREE.Color('#8b8275'), this.context.mood.wear * 0.18);
    return new THREE.MeshStandardMaterial({ color: tint, roughness: 0.62 + this.context.mood.wear * 0.3, ...options });
  }

  mesh(geometry: THREE.BufferGeometry, material: Paint, at: Point = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }

  box(size: Point, at: Point, material: Paint) {
    return this.mesh(new THREE.BoxGeometry(...size), material, at);
  }

  ball(size: Point, at: Point, material: Paint, segments = 20) {
    const mesh = this.mesh(new THREE.SphereGeometry(1, segments, Math.max(8, Math.floor(segments / 2))), material, at);
    mesh.scale.set(...size);
    return mesh;
  }

  cylinder(top: number, bottom: number, height: number, at: Point, material: Paint, segments = 24) {
    return this.mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material, at);
  }

  ring(radius: number, tube: number, at: Point, material: Paint, arc = Math.PI * 2) {
    return this.mesh(new THREE.TorusGeometry(radius, tube, 8, 64, arc), material, at);
  }

  rod(from: Point, to: Point, radius: number, material: Paint, endRadius = radius) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const mesh = this.cylinder(endRadius, radius, Math.max(direction.length(), 0.0001), a.add(b).multiplyScalar(0.5).toArray() as [number, number, number], material, 10);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  tube(points: readonly Point[], radius: number, material: Paint, closed = false) {
    const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), closed);
    return this.mesh(new THREE.TubeGeometry(path, Math.max(24, points.length * 8), radius, 8, closed), material);
  }

  lathe(profile: readonly (readonly [number, number])[], material: Paint, at: Point = [0, 0, 0]) {
    return this.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 32), material, at);
  }

  /**
   * A surface from a function of (u, v), both 0 to 1, like three's ParametricGeometry, but its
   * normals stay sound where the surface pinches to a point (the pole of a dome, the tip of a
   * cone), so it never shows a black dot there. Set `wrap` when u = 0 and u = 1 meet, as for a
   * surface of revolution; `flip` turns it inside out if it renders from the wrong side.
   */
  surface(shape: (u: number, v: number, target: THREE.Vector3) => void, material: Paint, options: { segments?: readonly [number, number]; wrap?: boolean; flip?: boolean; at?: Point } = {}) {
    return this.mesh(surfaceGeometry(shape, options.segments ?? [32, 16], options.wrap ?? false, options.flip ?? false), material, options.at);
  }

  /**
   * A cloth dropped onto things: a tablecloth over a table, a dust sheet over a chair, a towel
   * over a rail, a tarpaulin over a crate. The cloth falls flat from `at` and settles under a
   * short, fixed simulation (no randomness beyond `rumple`), so the same answers give the same
   * folds. Both faces are built, so any material works. Positions are in the Sculpture's space.
   */
  drape(options: DrapeOptions, material: Paint) {
    return this.mesh(drapeGeometry(options, this.context.random), material);
  }

  /** Flat lettering is generated locally; no fonts, image services or network requests. */
  label(text: string, width: number, height: number, at: Point, ink = '#27372e', paper = '#eee5cf') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.max(64, Math.round(512 * height / width));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(canvas.height * 0.65, 512 / Math.max(text.length, 1) * 1.4)}px monospace`;
    ctx.fillText(text, 256, canvas.height / 2, 470);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return this.mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }), at);
  }

  /** Many small solids in one draw call; unlike point sprites, these appear in every capture pass. */
  scatter(geometry: THREE.BufferGeometry, material: Paint, points: readonly { at: Point; size: number; color?: THREE.ColorRepresentation }[]) {
    const mesh = new THREE.InstancedMesh(geometry, material, points.length);
    const matrix = new THREE.Matrix4();
    for (const [index, point] of points.entries()) {
      matrix.makeScale(point.size, point.size, point.size).setPosition(...point.at);
      mesh.setMatrixAt(index, matrix);
      if (point.color !== undefined) mesh.setColorAt(index, new THREE.Color(point.color));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }

  /** Bring the visible object to the contract's origin, including asymmetric assemblies. */
  finish(options: { footprint?: number; update?: Thing['update'] } = {}): Thing {
    const bounds = visibleBounds(this.root);
    if (!bounds.isEmpty()) {
      const centre = bounds.getCenter(new THREE.Vector3());
      this.root.position.set(-centre.x, -bounds.min.y, -centre.z);
    }
    return { object: this.root, ...options, dispose: () => disposeTree(this.root) };
  }
}

/** Grid geometry for `Sculpture.surface`, with normals that survive poles. */
export function surfaceGeometry(shape: (u: number, v: number, target: THREE.Vector3) => void, segments: readonly [number, number], wrap: boolean, flip: boolean): THREE.BufferGeometry {
  const su = Math.max(1, Math.round(segments[0])), sv = Math.max(1, Math.round(segments[1]));
  const row = su + 1, count = row * (sv + 1);
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), uvs = new Float32Array(count * 2);
  const point = new THREE.Vector3();
  for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
    const k = j * row + i;
    shape(i / su, j / sv, point.set(0, 0, 0));
    positions.set([point.x, point.y, point.z], k * 3);
    uvs.set([i / su, j / sv], k * 2);
  }
  const at = (i: number, j: number) => new THREE.Vector3().fromArray(positions, (j * row + i) * 3);
  const box = new THREE.Box3().setFromArray(positions);
  const tiny = Math.max(1e-9, box.getSize(new THREE.Vector3()).length() * 1e-6);
  const raw: (THREE.Vector3 | null)[] = [];
  for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
    const left = i > 0 ? at(i - 1, j) : wrap ? at(su - 1, j) : at(i, j);
    const right = i < su ? at(i + 1, j) : wrap ? at(1, j) : at(i, j);
    const down = j > 0 ? at(i, j - 1) : at(i, j), up = j < sv ? at(i, j + 1) : at(i, j);
    const du = right.sub(left), dv = up.sub(down);
    const normal = du.clone().cross(dv);
    raw.push(du.length() < tiny || dv.length() < tiny || normal.length() < tiny * tiny ? null : normal.normalize());
  }
  // A row that has collapsed to one point is a pole: it takes the average normal of the rows beside it.
  const pinched = (j: number) => { const first = at(0, j); for (let i = 1; i <= su; i++) if (at(i, j).distanceTo(first) > tiny) return false; return true; };
  for (let j = 0; j <= sv; j++) {
    const pole = pinched(j);
    for (let i = 0; i <= su; i++) {
      const k = j * row + i;
      let normal = raw[k];
      if (!normal) {
        const sum = new THREE.Vector3();
        const rows = pole ? [j - 1, j + 1] : [j - 1, j, j + 1];
        for (const r of rows) {
          if (r < 0 || r > sv) continue;
          for (let n = pole ? 0 : i - 1; n <= (pole ? su : i + 1); n++) {
            if (n < 0 || n > su) continue;
            const other = raw[r * row + n];
            if (other) sum.add(other);
          }
        }
        normal = sum.lengthSq() > 0 ? sum.normalize() : new THREE.Vector3(0, 1, 0);
      }
      if (flip) normal = normal.clone().negate();
      normals.set([normal.x, normal.y, normal.z], k * 3);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
    const a = j * row + i, b = a + 1, c = a + row + 1, d = a + row;
    if (flip) index.push(a, d, b, b, d, c);
    else index.push(a, b, d, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

/** The settled cloth for `Sculpture.drape`, both faces. */
export function drapeGeometry(options: DrapeOptions, random: () => number = Math.random): THREE.BufferGeometry {
  const [width, depth] = options.size;
  const detail = Math.max(4, Math.round(options.detail ?? 32));
  const nx = width >= depth ? detail : Math.max(2, Math.round(detail * width / depth));
  const nz = width >= depth ? Math.max(2, Math.round(detail * depth / width)) : detail;
  const hx = width / nx, hz = depth / nz;
  const row = nx + 1, count = row * (nz + 1);
  const stiffness = THREE.MathUtils.clamp(options.stiffness ?? 0.4, 0, 1);
  const rumple = THREE.MathUtils.clamp(options.rumple ?? 0.3, 0, 1);
  const floor = options.floor === undefined ? 0 : options.floor;
  const thick = 0.004 + 0.12 * Math.min(hx, hz);
  const p = new Float64Array(count * 3), prev = new Float64Array(count * 3), free = new Uint8Array(count).fill(1);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * row + i;
    p[k * 3] = options.at[0] - width / 2 + i * hx;
    p[k * 3 + 1] = options.at[1] + (random() - 0.5) * rumple * Math.min(hx, hz) * 0.6;
    p[k * 3 + 2] = options.at[2] - depth / 2 + j * hz;
    const corner = (i === 0 || i === nx) && (j === 0 || j === nz);
    if ((options.hang === 'corners' && corner) || (options.hang === 'back-edge' && j === 0)) free[k] = 0;
  }
  prev.set(p);
  // Springs between neighbours (the weave), diagonals (shear) and every second point (bending).
  const springs: number[] = [], rest: number[] = [], strength: number[] = [];
  const link = (a: number, b: number, share: number) => {
    springs.push(a, b);
    rest.push(Math.hypot(p[a * 3] - p[b * 3], (p[a * 3 + 1] - p[b * 3 + 1]) * 0, p[a * 3 + 2] - p[b * 3 + 2]));
    strength.push(share);
  };
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * row + i;
    if (i < nx) link(k, k + 1, 1);
    if (j < nz) link(k, k + row, 1);
    if (i < nx && j < nz) { link(k, k + row + 1, 0.7); link(k + 1, k + row, 0.7); }
    if (i + 2 <= nx) link(k, k + 2, 0.05 + 0.5 * stiffness);
    if (j + 2 <= nz) link(k, k + row * 2, 0.05 + 0.5 * stiffness);
  }
  const supports = options.over ?? [];
  const touching = new Uint8Array(count);
  // Positional friction: a point in contact keeps little of its sideways movement this frame, so
  // the weight of an overhang cannot drag cloth off a narrow ridge such as a chair back.
  const grip = 0.85;
  let x = 0, y = 0, z = 0;
  const hold = (k: number, nx: number, ny: number, nz: number) => {
    const dx = x - prev[k * 3], dy = y - prev[k * 3 + 1], dz = z - prev[k * 3 + 2];
    const along = dx * nx + dy * ny + dz * nz;
    x -= (dx - nx * along) * grip; y -= (dy - ny * along) * grip; z -= (dz - nz * along) * grip;
    touching[k] = 1;
  };
  const collide = () => {
    for (let k = 0; k < count; k++) {
      if (!free[k]) continue;
      x = p[k * 3]; y = p[k * 3 + 1]; z = p[k * 3 + 2];
      for (const support of supports) {
        const [cx, cy, cz] = support.at;
        if ('box' in support) {
          const ex = support.box[0] / 2 + thick, ey = support.box[1] / 2 + thick, ez = support.box[2] / 2 + thick;
          const qx = x - cx, qy = y - cy, qz = z - cz;
          if (Math.abs(qx) < ex && Math.abs(qy) < ey && Math.abs(qz) < ez) {
            // Leave by the face it came in through, so a thin board (a chair back, a shelf) holds
            // the cloth on its top instead of spitting it out sideways; otherwise the nearest face.
            const fx = prev[k * 3] - cx, fy = prev[k * 3 + 1] - cy, fz = prev[k * 3 + 2] - cz;
            const px = ex - Math.abs(qx), py = ey - Math.abs(qy), pz = ez - Math.abs(qz);
            if (Math.abs(fy) >= ey) { y = cy + Math.sign(fy) * ey; hold(k, 0, Math.sign(fy), 0); }
            else if (Math.abs(fx) >= ex && (Math.abs(fz) < ez || px <= pz)) { x = cx + Math.sign(fx) * ex; hold(k, Math.sign(fx), 0, 0); }
            else if (Math.abs(fz) >= ez) { z = cz + Math.sign(fz) * ez; hold(k, 0, 0, Math.sign(fz)); }
            else if (py <= px && py <= pz) { y = cy + Math.sign(qy || 1) * ey; hold(k, 0, Math.sign(qy || 1), 0); }
            else if (px <= pz) { x = cx + Math.sign(qx || 1) * ex; hold(k, Math.sign(qx || 1), 0, 0); }
            else { z = cz + Math.sign(qz || 1) * ez; hold(k, 0, 0, Math.sign(qz || 1)); }
          }
        } else if ('ball' in support) {
          const r = support.ball + thick, qx = x - cx, qy = y - cy, qz = z - cz, d = Math.hypot(qx, qy, qz);
          if (d < r) {
            const s = d > 1e-9 ? r / d : 1;
            x = cx + qx * s; y = cy + (d > 1e-9 ? qy * s : r); z = cz + qz * s;
            hold(k, (x - cx) / r, (y - cy) / r, (z - cz) / r);
          }
        } else {
          const [radius, height] = support.cylinder;
          const r = radius + thick, top = height / 2 + thick, qx = x - cx, qy = y - cy, qz = z - cz, d = Math.hypot(qx, qz);
          if (d < r && Math.abs(qy) < top) {
            const out = r - d, up = top - qy, down = qy + top;
            if (prev[k * 3 + 1] - cy >= top || (up <= out && up <= down)) { y = cy + top; hold(k, 0, 1, 0); }
            else if (down < out) { y = cy - top; hold(k, 0, -1, 0); }
            else { const s = d > 1e-9 ? r / d : 1; x = cx + (d > 1e-9 ? qx * s : r); z = cz + qz * s; hold(k, (x - cx) / r, 0, (z - cz) / r); }
          }
        }
      }
      if (floor !== null && y < floor + thick) { y = floor + thick; hold(k, 0, 1, 0); }
      p[k * 3] = x; p[k * 3 + 1] = y; p[k * 3 + 2] = z;
    }
  };
  const step = 1 / 60, fall = 9.8 * step * step, damping = 0.985, rounds = 5;
  for (let frame = 0; frame < 280; frame++) {
    for (let k = 0; k < count; k++) {
      if (!free[k]) continue;
      for (let c = 0; c < 3; c++) {
        const now = p[k * 3 + c];
        // Cloth resting on something holds there: friction takes most of its sliding.
        const keep = touching[k] ? damping * 0.25 : damping;
        p[k * 3 + c] += (now - prev[k * 3 + c]) * keep - (c === 1 ? fall : 0);
        prev[k * 3 + c] = now;
      }
    }
    touching.fill(0);
    for (let round = 0; round < rounds; round++) {
      for (let s = 0; s < rest.length; s++) {
        const a = springs[s * 2], b = springs[s * 2 + 1];
        const wa = free[a], wb = free[b];
        if (!wa && !wb) continue;
        const dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1], dz = p[b * 3 + 2] - p[a * 3 + 2];
        const length = Math.hypot(dx, dy, dz);
        if (length < 1e-12) continue;
        // Cloth resists stretching far more than it resists bunching up.
        const stretch = (length - rest[s]) / length * (length > rest[s] ? strength[s] : strength[s] * 0.3);
        const share = stretch / (wa + wb);
        if (wa) { p[a * 3] += dx * share; p[a * 3 + 1] += dy * share; p[a * 3 + 2] += dz * share; }
        if (wb) { p[b * 3] -= dx * share; p[b * 3 + 1] -= dy * share; p[b * 3 + 2] -= dz * share; }
      }
      collide();
    }
  }
  // Two faces: the top as simulated and an underside wound the other way, so it reads from both sides.
  const positions = new Float32Array(count * 6), uvs = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) {
    for (let c = 0; c < 3; c++) positions[k * 3 + c] = positions[(count + k) * 3 + c] = p[k * 3 + c];
    const i = k % row, j = (k - i) / row;
    uvs.set([i / nx, 1 - j / nz], k * 2);
    uvs.set([i / nx, 1 - j / nz], (count + k) * 2);
  }
  const index: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * row + i, b = a + 1, c = a + row + 1, d = a + row;
    index.push(a, d, b, b, d, c);
    index.push(count + a, count + b, count + d, count + b, count + c, count + d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
