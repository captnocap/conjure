import * as THREE from 'three';

/** Paint a canvas and wrap it as an sRGB texture. */
export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A flat painted card. */
export function card(width: number, height: number, texture: THREE.Texture, options: THREE.MeshStandardMaterialParameters = {}) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide, ...options }),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

type V3 = readonly [number, number, number];

/** Collects many copies of one geometry and emits a single InstancedMesh. */
export class Batch {
  private readonly matrices: THREE.Matrix4[] = [];
  private readonly colours: THREE.Color[] = [];
  constructor(readonly geometry: THREE.BufferGeometry, readonly material: THREE.Material) {}

  add(at: V3, scale: V3 | number = 1, rotation: V3 = [0, 0, 0], colour: THREE.ColorRepresentation = '#ffffff') {
    const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    this.matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(...at), q, s));
    this.colours.push(new THREE.Color(colour));
    return this;
  }

  get count() {
    return this.matrices.length;
  }

  into(parent: THREE.Object3D) {
    if (!this.matrices.length) {
      this.geometry.dispose();
      this.material.dispose();
      return null;
    }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length);
    this.matrices.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, this.colours[index]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

export const pick = <T>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length) % list.length];
