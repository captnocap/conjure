import * as THREE from 'three';

/** A parametric head: a sphere pulled into a skull with a jaw taper and a few facial landmarks. Metres. */
export interface HeadSpec {
  W: number; H: number; D: number;
  /** How hard the jaw narrows below the equator, 0..0.7. */
  jaw: number;
  /** Swelling of the cranium above the equator. */
  cranium: number;
  nose: number; socket: number; brow: number; lips: number; chin: number;
  /** Height of the eye line and half the eye spacing. */
  eyeY: number; eyeX: number;
}

export const HUMAN: HeadSpec = { W: 0.074, H: 0.112, D: 0.092, jaw: 0.42, cranium: 0.04, nose: 0.02, socket: 0.008, brow: 0.004, lips: 0.004, chin: 0.006, eyeY: 0.012, eyeX: 0.031 };

const g = (v: number, s: number) => Math.exp(-(v * v) / (s * s));

/** Unit direction (x, y, z) to a point on the head. */
export function shapePoint(x: number, y: number, z: number, o: HeadSpec, out: THREE.Vector3) {
  let X = x * o.W, Z = z * o.D;
  const Y = y * o.H;
  if (y < 0) { X *= 1 - o.jaw * y * y; Z *= 1 - (z < 0 ? 0.42 : 0.16) * y * y; }
  else { X *= 1 + o.cranium * (1 - y * y) * 0.6 + o.cranium * y; Z *= 1 + o.cranium * y; }
  if (z > 0) {
    const f = Math.min(1, z * 1.6);
    const s = o.H / 0.112;
    const ny = Y - (o.eyeY - 0.034 * s);
    Z += f * o.nose * g(X, 0.012 * s) * g(ny, ny > 0 ? 0.034 * s : 0.012 * s);
    Z -= f * o.socket * g(Math.abs(X) - o.eyeX, 0.017 * s) * g(Y - o.eyeY, 0.012 * s);
    Z += f * o.brow * g(Y - (o.eyeY + 0.019 * s), 0.009 * s) * g(X, 0.06 * s);
    Z += f * o.lips * g(X, 0.022 * s) * g(Y - (o.eyeY - 0.07 * s), 0.009 * s);
    Z += f * o.chin * g(X, 0.022 * s) * g(Y - (o.eyeY - 0.105 * s), 0.014 * s);
  }
  return out.set(X, Y, Z);
}

/** All or part of the head as a sphere patch; uv always spans the whole head so one texture fits every piece. */
export function headGeometry(o: HeadSpec, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI, scale = 1) {
  const ws = Math.max(8, Math.round(64 * phiLength / (Math.PI * 2))), hs = Math.max(6, Math.round(48 * thetaLength / Math.PI));
  const geo = new THREE.SphereGeometry(1, ws, hs, phiStart, phiLength, thetaStart, thetaLength);
  const pos = geo.attributes.position, uv = geo.attributes.uv, p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    shapePoint(pos.getX(i), pos.getY(i), pos.getZ(i), o, p);
    pos.setXYZ(i, p.x * scale, p.y * scale, p.z * scale);
    const phi = phiStart + uv.getX(i) * phiLength, theta = thetaStart + (1 - uv.getY(i)) * thetaLength;
    uv.setXY(i, phi / (Math.PI * 2), 1 - theta / Math.PI);
  }
  geo.computeVertexNormals();
  return geo;
}

function direction(o: HeadSpec, X: number, Y: number): [number, number, number] {
  const y = Math.max(-0.999, Math.min(0.999, Y / o.H));
  const sinT = Math.sqrt(1 - y * y);
  const taper = y < 0 ? 1 - o.jaw * y * y : 1 + o.cranium * (1 - y * y) * 0.6 + o.cranium * y;
  const x = Math.max(-sinT, Math.min(sinT, X / (o.W * taper)));
  return [x, y, Math.sqrt(Math.max(0, sinT * sinT - x * x))];
}

/** Where a point on the front of the face (X right, Y up, metres) lands on a w × h canvas. */
export function facePixel(o: HeadSpec, X: number, Y: number, w: number, h: number): [number, number] {
  const [x, y] = direction(o, X, Y);
  const sinT = Math.sqrt(1 - y * y);
  const phi = Math.acos(Math.max(-1, Math.min(1, -x / Math.max(sinT, 1e-6))));
  return [phi / (Math.PI * 2) * w, Math.acos(y) / Math.PI * h];
}

/** The surface point on the front of the face above (X, Y). */
export function facePoint(o: HeadSpec, X: number, Y: number, scale = 1) {
  const [x, y, z] = direction(o, X, Y);
  return shapePoint(x, y, z, o, new THREE.Vector3()).multiplyScalar(scale);
}

/** Paint helper: an ellipse on the face in metres, drawn through the head's own mapping so it wraps correctly. */
export function faceEllipse(c: CanvasRenderingContext2D, o: HeadSpec, X: number, Y: number, rx: number, ry: number, tilt = 0) {
  c.beginPath();
  for (let i = 0; i <= 28; i++) {
    const t = i / 28 * Math.PI * 2, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
    const [px, py] = facePixel(o, X + ex * Math.cos(tilt) - ey * Math.sin(tilt), Y + ex * Math.sin(tilt) + ey * Math.cos(tilt), c.canvas.width, c.canvas.height);
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

/** Paint helper: a polyline on the face in metres. */
export function faceLine(c: CanvasRenderingContext2D, o: HeadSpec, points: readonly (readonly [number, number])[]) {
  c.beginPath();
  points.forEach(([X, Y], i) => {
    const [px, py] = facePixel(o, X, Y, c.canvas.width, c.canvas.height);
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  });
}

export function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function rod(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material, sides = 8) {
  const d = to.clone().sub(from);
  const mesh = part(parent, new THREE.CylinderGeometry(radius, radius, Math.max(d.length(), 1e-5), sides), material);
  mesh.position.copy(from).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

export function tube(parent: THREE.Object3D, points: readonly THREE.Vector3[], radius: number, material: THREE.Material) {
  return part(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...points]), Math.max(10, points.length * 6), radius, 5), material);
}
