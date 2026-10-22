import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import type { Sculpture } from '@conjure/kit';

/** A square of metal or timber with tarnish mottling and blooms of a stain colour (verdigris, rust, weed). */
export function patina(random: () => number, base: string, stain: string, amount: number, drips = true, dark = '#241a12') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 120; i++) {
    g.globalAlpha = 0.04 + random() * 0.12 * (0.3 + amount);
    g.fillStyle = dark;
    const r = 5 + random() * 26;
    g.beginPath();
    g.ellipse(random() * 256, random() * 256, r, r * (0.4 + random()), random() * 3, 0, 7);
    g.fill();
  }
  g.globalAlpha = amount * amount * 0.55;
  g.fillStyle = stain;
  g.fillRect(0, 0, 256, 256);
  const blooms = Math.round(amount * amount * 420 + amount * 70);
  for (let i = 0; i < blooms; i++) {
    const x = random() * 256, y = random() * 256, r = (2.5 + random() * random() * 22) * (0.5 + amount * 0.6);
    for (const dx of [-256, 0, 256]) {
      const gradient = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      gradient.addColorStop(0, stain);
      gradient.addColorStop(0.35, stain);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.5 + random() * 0.4;
      g.fillStyle = gradient;
      g.beginPath();
      g.arc(x + dx, y, r, 0, 7);
      g.fill();
      if (drips && random() < 0.55) {
        g.globalAlpha = 0.35;
        g.fillStyle = stain;
        g.fillRect(x + dx - r * 0.22, y, r * 0.44, r * (2 + random() * 5));
      }
    }
  }
  g.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A metal that carries a patina map: shinier when clean, chalky when stained. */
export function stained(random: () => number, base: string, stain: string, amount: number, options: THREE.MeshStandardMaterialParameters & { drips?: boolean } = {}) {
  const { drips = true, ...rest } = options;
  const a = Math.min(1, Math.max(0, amount));
  return new THREE.MeshStandardMaterial({
    map: patina(random, base, stain, a, drips),
    metalness: 0.7 - a * 0.5,
    roughness: 0.32 + a * 0.5,
    ...rest,
  });
}

/** Barnacles (or soft blobs) grown on the surfaces of the given meshes, as one instanced mesh. */
export function encrust(
  s: Sculpture,
  meshes: readonly THREE.Mesh[],
  count: number,
  size: number,
  palette: readonly string[] = ['#d9d3c0', '#b9b3a2', '#8f8b7c', '#e8e2d2'],
  shape: 'barnacle' | 'blob' = 'barnacle',
) {
  const random = s.context.random;
  count = Math.round(count);
  if (count <= 0 || meshes.length === 0) return null;
  s.root.updateMatrixWorld(true);
  const inverse = s.root.matrixWorld.clone().invert();
  const samplers = meshes.map((mesh) => {
    const sampler = new MeshSurfaceSampler(mesh);
    (sampler as unknown as { randomFunction: () => number }).randomFunction = random;
    sampler.build();
    mesh.geometry.computeBoundingSphere();
    const scale = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
    const r = (mesh.geometry.boundingSphere?.radius ?? 1) * Math.max(scale.x, scale.y, scale.z);
    return { mesh, sampler, weight: r * r, matrix: inverse.clone().multiply(mesh.matrixWorld) };
  });
  const total = samplers.reduce((sum, entry) => sum + entry.weight, 0);
  const geometry = shape === 'barnacle' ? new THREE.CylinderGeometry(0.38, 1, 0.85, 7) : new THREE.SphereGeometry(1, 8, 6);
  geometry.translate(0, shape === 'barnacle' ? 0.3 : 0.15, 0);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: shape === 'barnacle' });
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  const at = new THREE.Vector3(), normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const turn = new THREE.Quaternion(), matrix = new THREE.Matrix4(), tint = new THREE.Color(), scale = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  // Barnacles settle in colonies: reuse a few centres and crowd around them.
  const cluster = new THREE.Vector3();
  let left = 0;
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 7; attempt++) {
      let pick = random() * total, entry = samplers[0];
      for (const candidate of samplers) { pick -= candidate.weight; entry = candidate; if (pick <= 0) break; }
      entry.sampler.sample(at, normal);
      at.applyMatrix4(entry.matrix);
      normal.applyMatrix3(normalMatrix.getNormalMatrix(entry.matrix)).normalize();
      if (left <= 0 || at.distanceTo(cluster) < size * 9) break;
    }
    if (left <= 0) { cluster.copy(at); left = 3 + Math.floor(random() * 7); }
    left--;
    const k = size * (0.45 + random() * 0.9);
    turn.setFromUnitVectors(up, normal);
    scale.set(k, shape === 'barnacle' ? k * (0.7 + random() * 0.6) : k * 0.5, k);
    matrix.compose(at, turn, scale);
    instanced.setMatrixAt(i, matrix);
    instanced.setColorAt(i, tint.set(palette[Math.floor(random() * palette.length)]));
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  instanced.castShadow = instanced.receiveShadow = true;
  s.root.add(instanced);
  return instanced;
}

/** A canvas painted by the caller, as a colour texture. */
export function painted(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
