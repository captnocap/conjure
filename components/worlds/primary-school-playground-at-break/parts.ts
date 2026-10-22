import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

export type P = [number, number, number];
export type Rand = () => number;

export const pick = <T>(random: Rand, list: readonly T[]) => list[Math.floor(random() * list.length)];

/** A canvas-painted texture: no fonts, images or network. */
export function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** One tile of Victorian brickwork: 0.3 m bricks on 0.1 m courses, 0.9 m wide and 0.8 m high, seamless both ways. */
export function brickTile(random: Rand, palette: readonly string[], mortar: string, soot: number) {
  const texture = paint(288, 256, (c) => {
    c.fillStyle = mortar;
    c.fillRect(0, 0, 288, 256);
    for (let row = 0; row < 8; row++) {
      const offset = row % 2 ? 48 : 0;
      for (let col = -1; col < 4; col++) {
        const x = col * 96 + offset;
        c.fillStyle = pick(random, palette);
        c.fillRect(x + 2, row * 32 + 2, 92, 28);
        if (random() < 0.14) {
          c.fillStyle = `rgba(30,15,10,${0.12 + soot * 0.3})`;
          c.fillRect(x + 2, row * 32 + 2, 92, 28);
        }
        if (random() < 0.2) {
          c.fillStyle = 'rgba(255,230,200,0.08)';
          c.fillRect(x + 4, row * 32 + 4, 40 + random() * 40, 8);
        }
      }
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A material that tiles a texture across a face of the given size in metres. */
export function tiled(tile: THREE.Texture, tileW: number, tileH: number, width: number, height: number, options: THREE.MeshStandardMaterialParameters = {}) {
  const map = tile.clone();
  map.needsUpdate = true;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(width / tileW, height / tileH);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.93, ...options });
}

/** A Victorian sash window, six over six, painted: frame, glazing bars and the glass with its reflections. */
export function sashTexture(random: Rand, frame: string, glass: string, options: { art?: boolean; lit?: boolean; peel?: number } = {}) {
  return paint(128, 256, (c) => {
    c.fillStyle = frame;
    c.fillRect(0, 0, 128, 256);
    const sky = new THREE.Color(glass);
    for (let sash = 0; sash < 2; sash++) {
      const top = sash === 0 ? 8 : 132;
      for (let r = 0; r < 3; r++)
        for (let col = 0; col < 2; col++) {
          const x = 9 + col * 57, y = top + r * 38 + 2, w = 53, h = 34;
          const g = c.createLinearGradient(x, y, x + w, y + h);
          const light = sky.clone().lerp(new THREE.Color('#ffffff'), 0.35);
          const dark = sky.clone().lerp(new THREE.Color('#10161c'), 0.45);
          g.addColorStop(0, `#${light.getHexString()}`);
          g.addColorStop(0.45, `#${sky.getHexString()}`);
          g.addColorStop(1, `#${dark.getHexString()}`);
          c.fillStyle = g;
          c.fillRect(x, y, w, h);
          if (options.lit) {
            c.fillStyle = 'rgba(255,226,160,0.35)';
            c.fillRect(x, y + h * 0.4, w, h * 0.6);
          }
          // Children's paintings taped to the inside of the bottom sash.
          if (options.art && sash === 1 && random() < 0.55) {
            c.fillStyle = '#f4f1e8';
            const px = x + 6 + random() * 10, py = y + 3 + random() * 4;
            c.fillRect(px, py, 30, 24);
            for (let k = 0; k < 3; k++) {
              c.fillStyle = pick(random, ['#e8402a', '#f2c21c', '#2a8ae8', '#3aa04a', '#a04ac8', '#f28a1c']);
              c.beginPath();
              c.arc(px + 6 + random() * 18, py + 5 + random() * 14, 3 + random() * 5, 0, Math.PI * 2);
              c.fill();
            }
          }
        }
    }
    // The meeting rail between the sashes is heavier.
    c.fillStyle = frame;
    c.fillRect(0, 124, 128, 10);
    if (options.peel) for (let i = 0; i < options.peel * 40; i++) {
      c.fillStyle = 'rgba(90,80,70,0.55)';
      c.fillRect(random() * 128, random() * 256, 2 + random() * 5, 1 + random() * 3);
    }
  });
}

/** Thin bars between pairs of points, in one draw call, each with its own colour. */
export function bars(art: Sculpture, segments: readonly { from: P; to: P; color: THREE.ColorRepresentation }[], radius: number, material: THREE.MeshStandardMaterial) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8);
  const mesh = new THREE.InstancedMesh(geometry, material, segments.length);
  const up = new THREE.Vector3(0, 1, 0);
  const matrix = new THREE.Matrix4();
  segments.forEach(({ from, to, color }, index) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const length = Math.max(direction.length(), 0.001);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
    matrix.compose(a.add(b).multiplyScalar(0.5), quaternion, new THREE.Vector3(1, length, 1));
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new THREE.Color(color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  art.root.add(mesh);
  return mesh;
}

/** An irregular flat blob, for puddles and stains, lying in the xz plane. */
export function blob(random: Rand, rx: number, rz: number, points = 14) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = 0.72 + random() * 0.38;
    const x = Math.cos(angle) * rx * r, y = Math.sin(angle) * rz * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 3);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** A corrugated sheet, ribs running along its depth, lying flat with its top face up. */
export function corrugated(width: number, depth: number, pitch = 0.16, amplitude = 0.022) {
  const geometry = new THREE.PlaneGeometry(width, depth, Math.round(width / pitch) * 4, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin((position.getX(i) / pitch) * Math.PI * 2) * amplitude);
  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** A wheelie bin: tapered body, lid, handle and two wheels, its hinge and wheels toward -x. */
export function wheelieBin(art: Sculpture, at: P, colour: string, options: { turn?: number; open?: number; lidColour?: string } = {}) {
  const group = new THREE.Group();
  group.position.set(...at);
  group.rotation.y = options.turn ?? 0;
  art.root.add(group);
  const body = art.material(colour, { roughness: 0.55 });
  const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
  const shell = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.92, 4, 1), body));
  shell.rotation.y = Math.PI / 4;
  shell.scale.set(1, 1, 1.18);
  shell.position.y = 0.5;
  const lid = add(new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.74), art.material(options.lidColour ?? colour, { roughness: 0.5 })));
  const open = options.open ?? 0;
  lid.geometry.translate(0.32, 0, 0);
  lid.position.set(-0.32, 0.98, 0);
  lid.rotation.z = open;
  const handle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), art.material('#2a2a2c')));
  handle.rotation.x = Math.PI / 2;
  handle.position.set(-0.37, 0.93, 0);
  for (const dz of [-0.25, 0.25]) {
    const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14), art.material('#1d1d1f', { roughness: 0.8 })));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-0.3, 0.1, dz);
  }
  return group;
}

/** A child's bicycle leaning on its stand, wheels along z. */
export function bicycle(art: Sculpture, at: P, colour: string, size = 1) {
  const group = new THREE.Group();
  group.position.set(...at);
  group.rotation.x = 0;
  group.rotation.z = 0.06;
  art.root.add(group);
  const frame = art.material(colour, { roughness: 0.35, metalness: 0.4 });
  const tyre = art.material('#1d1d1f', { roughness: 0.85 });
  const r = 0.27 * size;
  const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; group.add(mesh); return mesh; };
  for (const z of [-0.42 * size, 0.42 * size]) {
    const wheel = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.022 * size, 6, 24), tyre));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, r, z);
  }
  const rod = (from: P, to: P, radius = 0.016 * size, material: THREE.Material = frame) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 6), material));
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  const bottom: P = [0, r * 0.95, -0.05 * size], seat: P = [0, r + 0.36 * size, -0.16 * size], head: P = [0, r + 0.38 * size, 0.3 * size];
  rod([0, r, -0.42 * size], bottom);
  rod(bottom, seat);
  rod(bottom, head);
  rod(seat, head);
  rod(head, [0, r, 0.42 * size]);
  rod([0, r, -0.42 * size], seat);
  rod([-0.2 * size, head[1] + 0.12 * size, head[2] - 0.04], [0.2 * size, head[1] + 0.12 * size, head[2] - 0.04], 0.014 * size, art.material('#2a2a2c'));
  rod(head, [0, head[1] + 0.12 * size, head[2] - 0.04]);
  const saddle = add(new THREE.Mesh(new THREE.BoxGeometry(0.08 * size, 0.04 * size, 0.2 * size), art.material('#1d1d1f')));
  saddle.position.set(seat[0], seat[1] + 0.04 * size, seat[2]);
  return group;
}
