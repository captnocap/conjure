import * as THREE from 'three';

/** Local sculpting vocabulary for taxidermy pieces: tapered tubes, glass eyes, plaques, fur. */
export type P3 = readonly [number, number, number];
export type Mat = THREE.Material;

export function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: Mat, at: P3 = [0, 0, 0], scale: P3 | number = 1, rot: P3 = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...at);
  if (typeof scale === 'number') mesh.scale.setScalar(scale);
  else mesh.scale.set(...scale);
  mesh.rotation.set(...rot);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export const ball = (parent: THREE.Object3D, size: P3, at: P3, material: Mat, rot: P3 = [0, 0, 0], segments = 18) =>
  part(parent, new THREE.SphereGeometry(1, segments, Math.max(8, Math.floor(segments * 0.6))), material, at, size, rot);

export const box = (parent: THREE.Object3D, size: P3, at: P3, material: Mat, rot: P3 = [0, 0, 0]) =>
  part(parent, new THREE.BoxGeometry(...size), material, at, 1, rot);

export function group(parent: THREE.Object3D, at: P3 = [0, 0, 0], rot: P3 = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...at);
  g.rotation.set(...rot);
  parent.add(g);
  return g;
}

/** A tube through points whose radius runs from r0 to r1. */
export function taperGeometry(points: readonly P3[], r0: number, r1: number, radial = 8, ease = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const n = Math.max(8, points.length * 6);
  const frames = curve.computeFrenetFrames(n, false);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = curve.getPointAt(t), r = r0 + (r1 - r0) * Math.pow(t, ease);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2, cs = Math.cos(a) * r, sn = Math.sin(a) * r;
      pos.push(c.x + cs * N.x + sn * B.x, c.y + cs * N.y + sn * B.y, c.z + cs * N.z + sn * B.z);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
  // Close both ends with a fan so tips and stumps are solid.
  for (const [ring, t, flip] of [[0, 0, true], [n, 1, false]] as const) {
    const c = curve.getPointAt(t), centre = pos.length / 3;
    pos.push(c.x, c.y, c.z);
    for (let j = 0; j < radial; j++) {
      const a = ring * radial + j, b = ring * radial + ((j + 1) % radial);
      if (flip) idx.push(centre, a, b); else idx.push(centre, b, a);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return { geometry, curve };
}

export function taper(parent: THREE.Object3D, points: readonly P3[], r0: number, r1: number, material: Mat, radial = 8, ease = 1) {
  const { geometry, curve } = taperGeometry(points, r0, r1, radial, ease);
  return { mesh: part(parent, geometry, material), curve };
}

/** A tapered capsule between two points; `wide` stretches it sideways (local x). */
export function limb(parent: THREE.Object3D, from: P3, to: P3, r0: number, r1: number, material: Mat, wide = 1) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a), len = Math.max(d.length(), 1e-4);
  const g = new THREE.Group();
  g.position.copy(a);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(g);
  const inner = new THREE.Group();
  inner.scale.set(wide, 1, 1);
  g.add(inner);
  part(inner, new THREE.CylinderGeometry(r1, r0, len, 16, 1, true), material, [0, len / 2, 0]);
  part(inner, new THREE.SphereGeometry(r0, 16, 10), material);
  part(inner, new THREE.SphereGeometry(r1, 16, 10), material, [0, len, 0]);
  return g;
}

export type Pupil = 'round' | 'wide' | 'hslit' | 'vslit' | 'fish' | 'dark';

/** A glass-eye texture: the pupil sits where the sphere faces +z. */
export function eyeTexture(iris: string, pupil: Pupil, white = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(iris);
  ctx.fillStyle = white ? '#efe9dc' : `#${base.clone().multiplyScalar(0.25).getHexString()}`;
  ctx.fillRect(0, 0, 256, 128);
  const draw = (cx: number) => {
    const grad = ctx.createRadialGradient(cx, 64, 4, cx, 64, 46);
    grad.addColorStop(0, `#${base.clone().lerp(new THREE.Color('#fff2b0'), 0.35).getHexString()}`);
    grad.addColorStop(0.75, `#${base.getHexString()}`);
    grad.addColorStop(1, `#${base.clone().multiplyScalar(0.35).getHexString()}`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, 64, white ? 34 : 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `#${base.clone().multiplyScalar(0.55).getHexString()}`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 12, 64 + Math.sin(a) * 12); ctx.lineTo(cx + Math.cos(a) * 34, 64 + Math.sin(a) * 34); ctx.stroke();
    }
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    if (pupil === 'round') ctx.arc(cx, 64, 15, 0, Math.PI * 2);
    else if (pupil === 'wide') ctx.arc(cx, 64, 26, 0, Math.PI * 2);
    else if (pupil === 'dark') ctx.arc(cx, 64, 40, 0, Math.PI * 2);
    else if (pupil === 'fish') ctx.arc(cx, 64, 20, 0, Math.PI * 2);
    else if (pupil === 'hslit') ctx.roundRect(cx - 27, 64 - 9, 54, 18, 5);
    else ctx.ellipse(cx, 64, 6, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(cx - 13, 47, 7, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  };
  draw(64); draw(64 + 256); draw(64 - 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function eyeMaterial(iris: string, pupil: Pupil, white = false) {
  const map = eyeTexture(iris, pupil, white);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.06, metalness: 0.05, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.22 });
}

/** One eye; `look` is [yaw, pitch] in radians away from straight ahead (+z). */
export function eye(parent: THREE.Object3D, at: P3, radius: number, material: Mat, look: readonly [number, number] = [0, 0]) {
  return part(parent, new THREE.SphereGeometry(1, 20, 14), material, at, radius, [-look[1], look[0], 0]);
}

export type PlaqueShape = 'shield' | 'oval' | 'round' | 'slab' | 'arch';

/** A bevelled wooden plaque in the xy plane, centred on the origin, its back at z = 0. */
export function plaque(parent: THREE.Object3D, kind: PlaqueShape, w: number, h: number, material: Mat, depth = 0.025) {
  const shape = new THREE.Shape();
  const x = w / 2, y = h / 2;
  if (kind === 'oval' || kind === 'round') {
    const r = kind === 'round' ? Math.min(x, y) : x;
    shape.absellipse(0, 0, r, kind === 'round' ? r : y, 0, Math.PI * 2, false, 0);
  } else if (kind === 'slab') {
    const r = Math.min(w, h) * 0.08;
    shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.quadraticCurveTo(x, -y, x, -y + r); shape.lineTo(x, y - r);
    shape.quadraticCurveTo(x, y, x - r, y); shape.lineTo(-x + r, y); shape.quadraticCurveTo(-x, y, -x, y - r); shape.lineTo(-x, -y + r); shape.quadraticCurveTo(-x, -y, -x + r, -y);
  } else if (kind === 'arch') {
    shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(x, y - x); shape.absarc(0, y - x, x, 0, Math.PI, false); shape.lineTo(-x, -y);
  } else {
    shape.moveTo(0, -y);
    shape.bezierCurveTo(x * 0.9, -y * 0.75, x, -y * 0.1, x, y * 0.55);
    shape.quadraticCurveTo(x * 1.02, y * 0.86, x * 0.72, y * 0.82);
    shape.quadraticCurveTo(x * 0.3, y * 0.78, 0, y);
    shape.quadraticCurveTo(-x * 0.3, y * 0.78, -x * 0.72, y * 0.82);
    shape.quadraticCurveTo(-x * 1.02, y * 0.86, -x, y * 0.55);
    shape.bezierCurveTo(-x, -y * 0.1, -x * 0.9, -y * 0.75, 0, -y);
  }
  const bevel = Math.min(depth * 0.4, 0.012);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 20 });
  return part(parent, geometry, material);
}

/** A streaky hair texture with optional bald, moth-eaten patches. */
export function furMaterial(random: () => number, colour: THREE.ColorRepresentation, options: { bald?: number; streak?: number; dust?: number; roughness?: number; skin?: string } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(colour);
  base.lerp(new THREE.Color('#9a958a'), (options.dust ?? 0) * 0.45);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 128, 128);
  const streak = options.streak ?? 0.22;
  for (let i = 0; i < 700; i++) {
    const tone = base.clone().offsetHSL(0, 0, (random() - 0.5) * streak);
    ctx.strokeStyle = `#${tone.getHexString()}`;
    ctx.lineWidth = 1 + random();
    const x = random() * 128, y = random() * 128;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 5, y + 5 + random() * 12); ctx.stroke();
  }
  const bald = options.bald ?? 0;
  if (bald > 0.05) {
    const skin = new THREE.Color(options.skin ?? '#cdb99a');
    for (let i = 0; i < Math.round(bald * 14); i++) {
      const x = random() * 128, y = random() * 128, r = 4 + random() * 12 * bald;
      for (const dx of [-128, 0, 128]) for (const dy of [-128, 0, 128]) {
        ctx.fillStyle = `#${skin.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08).getHexString()}`;
        ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r, r * (0.5 + random() * 0.5), random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);
  return new THREE.MeshStandardMaterial({ map, roughness: options.roughness ?? 0.95 });
}

/** Wood with painted grain. */
export function woodMaterial(random: () => number, colour: THREE.ColorRepresentation, gloss = 0.3) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(colour);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) {
    ctx.strokeStyle = `#${base.clone().offsetHSL(0, 0, (random() - 0.6) * 0.14).getHexString()}`;
    ctx.lineWidth = 0.6 + random() * 1.6;
    const y = random() * 128, wob = random() * 5;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 128; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.06 + i) * wob);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85 - gloss * 0.55 });
}

/** Cone tufts in one draw call, each pointing along its own direction. */
export function tufts(parent: THREE.Object3D, material: Mat, list: readonly { at: P3; dir: P3; len: number; r: number }[], sides = 5) {
  if (!list.length) return null;
  const geometry = new THREE.ConeGeometry(1, 1, sides, 1);
  geometry.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  list.forEach((t, i) => {
    q.setFromUnitVectors(up, d.set(...t.dir).normalize());
    m.compose(new THREE.Vector3(...t.at), q, new THREE.Vector3(t.r, t.len, t.r));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Lettering on a card or plate: several lines, hand-written or engraved. */
export function card(parent: THREE.Object3D, lines: readonly string[], w: number, h: number, at: P3, options: { ink?: string; paper?: string; rot?: P3; font?: string; metal?: boolean; border?: boolean } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = Math.max(48, Math.round((384 * h) / w));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = options.paper ?? '#efe6cc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ctx.strokeStyle = options.ink ?? '#2b2420';
  if (options.border) { ctx.lineWidth = 6; ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const rows = lines.length, rowH = (canvas.height * 0.86) / rows;
  lines.forEach((line, i) => {
    const size = Math.min(rowH * 0.82, (384 / Math.max(line.length, 1)) * 1.7);
    ctx.font = `${options.font ?? 'bold'} ${size}px ${options.font?.includes('italic') ? 'Georgia, serif' : 'monospace'}`;
    ctx.fillText(line, 192, canvas.height * 0.07 + rowH * (i + 0.5), 350);
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map, roughness: options.metal ? 0.35 : 0.9, metalness: options.metal ? 0.7 : 0, side: THREE.DoubleSide });
  return part(parent, new THREE.PlaneGeometry(w, h), material, at, 1, options.rot ?? [0, 0, 0]);
}

/** Recentre a finished group so it stands on y = 0, centred in x and z. */
export function settle(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;
  const c = bounds.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= bounds.min.y;
}
