import * as THREE from 'three';
import type { Thing } from '../kit/contract';
import { choice, noul, score } from '../kit/questions';
import { defineThing } from '../kit/contract';
import { disposeTree } from '../kit/dispose';
import { bakeTrace, type TraceBake } from '../kit/sdf';
import type { TracedImage } from '../kit/svg';

/**
 * A traced picture standing in the scene as a real object, so the capture sees its colour, depth,
 * normals and identity and every look redraws it like anything else. The paths are baked once into
 * a signed distance field; one alpha-tested plane at the 0.5 edge draws the outline crisply at any
 * size, and the capture rig already carries alpha-tested cut-outs through all of its passes.
 */
export const FOUND_QUESTIONS = {
  mount: choice('How does this picture of yours exist in the scene?', {
    standee: 'A cardboard standee cut along its outline, propped up on a little stand.',
    decal: 'Lying flat on the ground like a painted mark, a rug or a big sticker.',
    relief: 'A raised relief rising out of a backing board, like carved wood or layered paper.',
    cutout: 'A thick laser-cut silhouette with solid edges, like plywood or acrylic.',
    sign: 'A printed sign held up on two posts.',
  }),
  backdrop: noul('Does the picture keep its own background, like a printed photograph, rather than only its subject?'),
  border: choice('What runs around its outline?', {
    none: 'Nothing: it is cut tight to the outline.',
    sticker: 'A white die-cut border, like a sticker.',
    keyline: 'A dark keyline, like a cut-out in a comic.',
  }),
  size: score('How big is it?', ['A small figurine', 'Knee high', 'Life size', 'Larger than life', 'Towering']),
  finish: choice('What is it made of?', {
    card: 'Matte card or paper.',
    gloss: 'A glossy print or enamel.',
    wood: 'Painted wood.',
    metal: 'Painted sheet metal.',
  }),
} as const;

const FINISHES = {
  card: { roughness: 0.92, metalness: 0, edge: '#cdbf9f' },
  gloss: { roughness: 0.25, metalness: 0, edge: '#e9e6df' },
  wood: { roughness: 0.75, metalness: 0, edge: '#a07850' },
  metal: { roughness: 0.4, metalness: 0.55, edge: '#8d9196' },
} as const;

/** Rows of a bake are top to bottom; a plane's v runs bottom to top, so the upload is flipped. */
function textureOf(bake: TraceBake, solid?: string): THREE.DataTexture {
  const { width, height, data } = bake;
  const pixels = new Uint8Array(width * height * 4);
  const fill = solid ? [1, 3, 5].map((i) => parseInt(solid.slice(i, i + 2), 16)) : null;
  for (let y = 0; y < height; y++) {
    const from = (height - 1 - y) * width * 4, to = y * width * 4;
    for (let x = 0; x < width * 4; x += 4) {
      pixels[to + x] = fill ? fill[0] : data[from + x];
      pixels[to + x + 1] = fill ? fill[1] : data[from + x + 1];
      pixels[to + x + 2] = fill ? fill[2] : data[from + x + 2];
      pixels[to + x + 3] = data[from + x + 3];
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** A plane the size of the bake, its v flipped to match the upload, optionally raised into relief. */
function planeOf(bake: TraceBake, height: number, relief = 0): THREE.BufferGeometry {
  const width = height * (bake.width / bake.height);
  const segments = relief > 0 ? 96 : 1;
  const columns = Math.max(1, Math.round(segments * Math.min(1, bake.width / bake.height)));
  const rows = Math.max(1, Math.round(segments * Math.min(1, bake.height / bake.width)));
  const geometry = new THREE.PlaneGeometry(width, height, columns, rows);
  if (relief > 0) {
    const position = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < position.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      const x = Math.min(bake.width - 1, Math.round(u * (bake.width - 1)));
      const y = Math.min(bake.height - 1, Math.round((1 - v) * (bake.height - 1)));
      // A rounded pillow: steep at the outline, flattening toward the middle of each shape.
      const deep = bake.depth[y * bake.width + x];
      position.setZ(i, relief * Math.sqrt(Math.min(1, deep * 2.2)));
    }
    geometry.computeVertexNormals();
  }
  return geometry;
}

/** The share of the bake's height taken by padding below the outline, so the subject stands on y = 0. */
const groundOffset = (bake: TraceBake, height: number) => {
  let lowest = bake.height - 1;
  for (let y = bake.height - 1; y >= 0; y--) {
    let any = false;
    for (let x = 0; x < bake.width && !any; x++) any = bake.data[(y * bake.width + x) * 4 + 3] >= 128;
    if (any) { lowest = y; break; }
  }
  return ((bake.height - 1 - lowest) / bake.height) * height;
};

/** A thing for one traced picture. Its questions are asked like any component's. */
export function foundThing(image: TracedImage) {
  return defineThing({
    questions: FOUND_QUESTIONS,
    build(a, context): Thing {
      const root = new THREE.Group();
      const height = 0.3 + a.size * 2.8;
      const finish = FINISHES[a.finish];
      const bake = bakeTrace(image, {
        resolution: 512,
        keepBackground: a.backdrop,
        border: a.border === 'none' ? 0 : 7,
        borderColor: a.border === 'sticker' ? '#f6f3ec' : '#1d1c1f',
        spread: 12,
      });
      const wear = context.mood.wear;
      const material = (texture: THREE.Texture, side: THREE.Side = THREE.FrontSide) => new THREE.MeshStandardMaterial({
        map: texture,
        alphaTest: 0.5,
        side,
        roughness: Math.min(1, finish.roughness + wear * 0.25),
        metalness: finish.metalness,
        color: new THREE.Color('#ffffff').lerp(new THREE.Color('#9a9184'), wear * 0.35),
      });
      const front = textureOf(bake);
      const back = textureOf(bake, finish.edge);
      const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material) => {
        const result = new THREE.Mesh(geometry, mat);
        result.castShadow = result.receiveShadow = true;
        root.add(result);
        return result;
      };
      const solid = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: finish.roughness, metalness: finish.metalness });
      const width = height * (bake.width / bake.height);
      const lift = groundOffset(bake, height);
      let footprint = Math.max(width, 0.2) / 2;
      let sway = 0;

      if (a.mount === 'decal') {
        const plane = mesh(planeOf(bake, height), material(front));
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0.004;
        plane.castShadow = false;
        footprint = Math.max(width, height) / 2;
      } else if (a.mount === 'relief') {
        const relief = height * 0.05;
        const board = mesh(new THREE.BoxGeometry(width * 1.04, height * 1.04, height * 0.04), solid(finish.edge));
        board.position.set(0, height / 2, -height * 0.02);
        const plane = mesh(planeOf(bake, height, relief), material(front));
        plane.position.set(0, height / 2, 0.002);
        // A low foot keeps the panel upright on the ground.
        const foot = mesh(new THREE.BoxGeometry(width * 0.7, height * 0.04, height * 0.22), solid(finish.edge));
        foot.position.set(0, height * 0.02, height * 0.02);
        footprint = Math.max(width * 0.55, height * 0.12);
      } else if (a.mount === 'cutout') {
        const thickness = height * 0.035, slices = 8;
        const edge = material(back, THREE.DoubleSide);
        for (let slice = 0; slice < slices; slice++) {
          const t = slice / (slices - 1);
          const outer = slice === 0 || slice === slices - 1;
          const plane = mesh(planeOf(bake, height), outer ? material(front, THREE.DoubleSide) : edge);
          plane.position.set(0, height / 2 - lift, (t - 0.5) * thickness);
          if (slice === 0) plane.rotation.y = Math.PI;
        }
        footprint = Math.max(width * 0.45, thickness);
        sway = 0.4;
      } else if (a.mount === 'sign') {
        const posts = height * 0.55, board = height * 0.03;
        for (const side of [-1, 1]) {
          const post = mesh(new THREE.CylinderGeometry(height * 0.025, height * 0.03, posts + height, 10), solid('#5b5248'));
          post.position.set(side * width * 0.42, (posts + height) / 2, -board);
        }
        const panel = mesh(new THREE.BoxGeometry(width * 1.02, height * 1.02, board), solid(finish.edge));
        panel.position.set(0, posts + height / 2, -board / 2 - 0.004);
        const plane = mesh(planeOf(bake, height), material(front));
        plane.position.set(0, posts + height / 2, 0.002);
        footprint = Math.max(width * 0.5, height * 0.1);
      } else {
        // Standee: the printed face, a plain card back, and a fold-out strut behind.
        const face = mesh(planeOf(bake, height), material(front));
        face.position.set(0, height / 2 - lift, 0.004);
        const rear = mesh(planeOf(bake, height), material(back));
        rear.position.set(0, height / 2 - lift, -0.004);
        rear.rotation.y = Math.PI;
        const strut = mesh(new THREE.BoxGeometry(Math.max(0.03, width * 0.12), height * 0.6, 0.008), solid(finish.edge));
        strut.position.set(0, height * 0.28, -height * 0.16);
        strut.rotation.x = -0.5;
        footprint = Math.max(width * 0.45, height * 0.18);
        sway = 1;
      }
      const energy = context.mood.energy, phase = context.random() * Math.PI * 2;
      return {
        object: root,
        footprint,
        update: sway ? (_dt, time) => { root.rotation.z = Math.sin(time * (0.8 + energy * 2) + phase) * 0.012 * sway * (0.3 + energy); } : undefined,
        dispose: () => { disposeTree(root); front.dispose(); back.dispose(); },
      };
    },
  });
}
