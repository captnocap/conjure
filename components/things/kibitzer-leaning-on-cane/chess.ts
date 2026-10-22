import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Sculpture } from '@conjure/kit';

/** Park chess: a stone table with an inlaid board, fixed benches, Staunton pieces, a clock. All metres. */

export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export interface Piece {
  type: PieceType;
  white: boolean;
  /** 0..7 from the a-file; the a-file sits at -x. */
  file: number;
  /** 0..7 from rank 1; rank 1 sits at +z, toward the viewer. */
  rank: number;
  /** Lying on its side. */
  toppled?: boolean;
}

const HEIGHTS: Record<PieceType, number> = { pawn: 0.042, rook: 0.05, knight: 0.058, bishop: 0.064, queen: 0.074, king: 0.082 };
const PROFILES: Record<PieceType, [number, number][]> = {
  pawn: [[0, 0], [0.42, 0], [0.42, 0.1], [0.3, 0.16], [0.21, 0.3], [0.17, 0.52], [0.27, 0.6], [0.15, 0.66], [0.21, 0.74], [0.25, 0.86], [0.17, 0.96], [0, 1]],
  rook: [[0, 0], [0.4, 0], [0.4, 0.1], [0.27, 0.17], [0.23, 0.6], [0.3, 0.7], [0.32, 0.9], [0.32, 1], [0.2, 1], [0.2, 0.9], [0, 0.9]],
  knight: [[0, 0], [0.4, 0], [0.4, 0.1], [0.27, 0.17], [0.22, 0.34], [0, 0.34]],
  bishop: [[0, 0], [0.4, 0], [0.4, 0.1], [0.27, 0.17], [0.19, 0.45], [0.15, 0.62], [0.26, 0.68], [0.21, 0.76], [0.16, 0.9], [0.07, 0.96], [0, 1]],
  queen: [[0, 0], [0.42, 0], [0.42, 0.1], [0.3, 0.17], [0.18, 0.5], [0.15, 0.7], [0.28, 0.8], [0.24, 0.88], [0.1, 0.93], [0.1, 1], [0, 1]],
  king: [[0, 0], [0.42, 0], [0.42, 0.1], [0.3, 0.17], [0.18, 0.5], [0.15, 0.68], [0.28, 0.78], [0.22, 0.84], [0.06, 0.86], [0.06, 1], [0, 1]],
};

/** Staunton-ish piece geometry, one per type, standing on y = 0 at unit height scaled to its real size. */
export function pieceGeometries(): Record<PieceType, THREE.BufferGeometry> {
  const out = {} as Record<PieceType, THREE.BufferGeometry>;
  for (const type of Object.keys(PROFILES) as PieceType[]) {
    const h = HEIGHTS[type];
    const lathe = new THREE.LatheGeometry(PROFILES[type].map(([r, y]) => new THREE.Vector2(r * h, y * h)), 14);
    const parts: THREE.BufferGeometry[] = [lathe];
    if (type === 'knight') {
      const head = new THREE.BoxGeometry(0.28 * h, 0.5 * h, 0.22 * h);
      head.rotateX(-0.45);
      head.translate(0, 0.6 * h, 0.03 * h);
      const muzzle = new THREE.BoxGeometry(0.2 * h, 0.2 * h, 0.3 * h);
      muzzle.translate(0, 0.72 * h, 0.22 * h);
      const ears = new THREE.BoxGeometry(0.22 * h, 0.16 * h, 0.1 * h);
      ears.translate(0, 0.9 * h, -0.08 * h);
      parts.push(head, muzzle, ears);
    }
    if (type === 'king') {
      const across = new THREE.BoxGeometry(0.22 * h, 0.05 * h, 0.05 * h);
      across.translate(0, 0.95 * h, 0);
      parts.push(across);
    }
    if (type === 'queen') {
      const orb = new THREE.SphereGeometry(0.07 * h, 8, 6);
      orb.translate(0, 1.02 * h, 0);
      parts.push(orb);
    }
    const merged = parts.length > 1 ? mergeGeometries(parts.map((part) => part.toNonIndexed()), false) : lathe;
    if (merged !== lathe) for (const part of parts) part.dispose();
    out[type] = merged ?? lathe;
  }
  return out;
}

export interface Board {
  /** Centre of the board on the ground plane. */
  x: number;
  z: number;
  /** Height of the playing surface. */
  y: number;
  square: number;
  /** Table top height and the half-width of the slab. */
  top: number;
  half: number;
}

/** A painted inlaid board with a border. */
function boardTexture(random: () => number, kind: 'stone' | 'wood' | 'paint') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  const [light, dark, edge] = kind === 'stone' ? ['#ddd5c3', '#3f3d3b', '#8d8578'] : kind === 'wood' ? ['#d8bf8e', '#6a4428', '#4a2e1a'] : ['#efe6cf', '#2f6b3a', '#b63f36'];
  c.fillStyle = edge;
  c.fillRect(0, 0, 256, 256);
  const margin = 14, cell = (256 - margin * 2) / 8;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    c.fillStyle = (r + f) % 2 ? dark : light;
    c.fillRect(margin + f * cell, margin + r * cell, cell + 0.5, cell + 0.5);
  }
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + random() * 0.07})`;
    c.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
  }
  if (kind === 'paint') for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(200,190,160,${0.3 + random() * 0.4})`;
    c.fillRect(random() * 256, random() * 256, 3 + random() * 8, 2 + random() * 5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export interface TableOptions {
  x?: number;
  z?: number;
  kind?: 'stone' | 'metal' | 'plywood';
  /** Which sides get a fixed bench: near is +z (toward the viewer), far is -z. */
  benches?: ('near' | 'far')[];
  /** Seat height for each bench. */
  seat?: number;
  /** Board inlay colours. */
  inlay?: 'stone' | 'wood' | 'paint';
  /** Distance from the table centre to each bench centre. */
  benchGap?: number;
  /** Benches sit along z by default (near is +z); 'x' puts them at the sides (near is +x). */
  benchAxis?: 'x' | 'z';
}

/** A park chess table: pedestal, slab, inlaid board, and fixed benches. Returns where the board is. */
export function chessTable(s: Sculpture, options: TableOptions = {}): Board {
  const { random } = s.context;
  const x = options.x ?? 0, z = options.z ?? 0;
  const kind = options.kind ?? 'stone';
  const seatY = options.seat ?? 0.44;
  const inlay = options.inlay ?? (kind === 'plywood' ? 'paint' : kind === 'metal' ? 'wood' : 'stone');
  const gap = options.benchGap ?? 0.8;
  const alongX = options.benchAxis === 'x';
  const benchAt = (side: 'near' | 'far', distance: number): [number, number] => alongX ? [x + (side === 'near' ? 1 : -1) * distance, z] : [x, z + (side === 'near' ? 1 : -1) * distance];
  const benchSize = (w: number, d: number): [number, number] => alongX ? [d, w] : [w, d];
  const boardSize = 0.46;
  let top: number, half: number;
  if (kind === 'stone') {
    const concrete = s.material('#b9b3a4', { roughness: 0.95 });
    const slabStone = s.material('#c9c3b4', { roughness: 0.85 });
    top = 0.72; half = 0.42;
    s.box([0.52, 0.06, 0.52], [x, 0.03, z], concrete);
    s.box([0.34, 0.62, 0.34], [x, 0.36, z], concrete);
    s.box([half * 2, 0.07, half * 2], [x, top - 0.035, z], slabStone);
    s.box([half * 2 + 0.03, 0.02, half * 2 + 0.03], [x, top - 0.06, z], concrete);
    for (const side of options.benches ?? ['near', 'far']) {
      const [bx, bz] = benchAt(side, gap);
      s.box([0.3, seatY - 0.05, 0.28], [bx, (seatY - 0.05) / 2, bz], concrete);
      const [bw, bd] = benchSize(0.56, 0.38);
      s.box([bw, 0.05, bd], [bx, seatY - 0.025, bz], slabStone);
    }
  } else if (kind === 'metal') {
    const steel = s.material('#2f4a3a', { metalness: 0.55, roughness: 0.45 });
    top = 0.72; half = 0.4;
    s.cylinder(0.05, 0.05, 0.7, [x, 0.35, z], steel, 12);
    s.cylinder(0.26, 0.3, 0.03, [x, 0.015, z], steel, 16);
    s.box([half * 2, 0.025, half * 2], [x, top - 0.0125, z], steel);
    for (const side of options.benches ?? ['near', 'far']) {
      const [bx, bz] = benchAt(side, gap);
      const [bw, bd] = benchSize(0.5, 0.34);
      s.box([bw, 0.025, bd], [bx, seatY - 0.0125, bz], steel);
      s.cylinder(0.04, 0.04, seatY - 0.03, [bx, (seatY - 0.03) / 2, bz], steel, 10);
      s.cylinder(0.18, 0.2, 0.025, [bx, 0.012, bz], steel, 12);
    }
  } else {
    const paint = s.material(random() < 0.5 ? '#2c5b9a' : '#a8352c', { roughness: 0.7 });
    const ply = s.material('#c8a86a', { roughness: 0.9 });
    top = 0.68; half = 0.4;
    s.cylinder(0.28, 0.28, 0.66, [x, 0.33, z], paint, 18);
    for (const y of [0.1, 0.33, 0.56]) s.ring(0.285, 0.012, [x, y, z], paint).rotation.x = Math.PI / 2;
    s.box([half * 2, 0.02, half * 2], [x, top - 0.01, z], ply);
    for (const side of options.benches ?? ['near', 'far']) {
      const [bx, bz] = benchAt(side, gap - 0.02);
      const [bw, bd] = benchSize(0.42, 0.32);
      s.box([bw, seatY, bd], [bx, seatY / 2, bz], s.material('#8b6a3e', { roughness: 0.95 }));
      for (let i = 0; i < 3; i++) s.box(alongX ? [0.09, 0.015, 0.44] : [0.44, 0.015, 0.09], [bx + (alongX ? -0.11 + i * 0.11 : 0), seatY + 0.008, bz + (alongX ? 0 : -0.11 + i * 0.11)], ply);
    }
  }
  const boardMap = boardTexture(random, inlay);
  const board = s.mesh(new THREE.PlaneGeometry(boardSize, boardSize), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.55 }), [x, top + 0.002, z]);
  board.rotation.x = -Math.PI / 2;
  board.castShadow = false;
  const inner = boardSize * (256 - 28) / 256;
  return { x, z, y: top + 0.002, square: inner / 8, top, half };
}

/** "Ke1 Qd1 Nf3 e4 h2x" style: capital for the piece, pawn when none, trailing x for toppled. */
export function layout(white: string, black: string): Piece[] {
  const letters: Record<string, PieceType> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
  const parse = (text: string, isWhite: boolean) => text.split(/\s+/).filter(Boolean).map((token) => {
    const toppled = token.endsWith('x');
    const clean = toppled ? token.slice(0, -1) : token;
    const type = letters[clean[0]] ?? 'pawn';
    const square = type === 'pawn' ? clean : clean.slice(1);
    return { type, white: isWhite, file: square.charCodeAt(0) - 97, rank: Number(square[1]) - 1, toppled };
  });
  return [...parse(white, true), ...parse(black, false)];
}

export const POSITIONS = {
  start: layout('Ra1 Nb1 Bc1 Qd1 Ke1 Bf1 Ng1 Rh1 a2 b2 c2 d2 e2 f2 g2 h2', 'Ra8 Nb8 Bc8 Qd8 Ke8 Bf8 Ng8 Rh8 a7 b7 c7 d7 e7 f7 g7 h7'),
  opening: layout('Ra1 Nb1 Bc1 Qd1 Ke1 Rh1 Bb5 Nf3 a2 b2 c2 d2 e4 f2 g2 h2', 'Ra8 Bc8 Qd8 Ke8 Bf8 Ng8 Rh8 Nc6 a7 b7 c7 d7 e5 f7 g7 h7'),
  middlegame: layout('Ra1 Rf1 Kg1 Qd2 Be3 Nf3 a2 b2 c3 d4 f2 g2 h3', 'Rc8 Rf8 Kg8 Qb6 Be7 Nf6 Bb7 a6 b5 d5 e6 f7 g7 h6'),
  scramble: layout('Kg1 Rd1 a4 f2 g3 h2', 'Kg8 Bd6 b5 f7 g6 h7'),
  backRankMate: layout('Kg1x Ra1 f2 g2 h2 Nc3', 'Re1 Kg8 f7 g7 h7 b6'),
  whiteCrushing: layout('Ke1 Qd1 Ra1 Rh1 Nf3 Bc4 a2 b2 c2 d4 e4 f2 g2 h2', 'Ke8 Nf6 a7 f7 g7 h7'),
  blackCrushing: layout('Ke1 Nc3 a2 f2 g2 h2', 'Ke8 Qd8 Ra8 Rh8 Bc5 Nc6 a7 b7 c7 d6 e5 f7 g7 h7'),
} as const;

/** Where a square's centre sits. */
export const squareAt = (board: Board, file: number, rank: number) => new THREE.Vector3(
  board.x - board.square * 4 + (file + 0.5) * board.square,
  board.y,
  board.z + board.square * 4 - (rank + 0.5) * board.square,
);

export interface PieceColours { white?: THREE.ColorRepresentation; black?: THREE.ColorRepresentation }

/** Stand the pieces on a board in a few instanced meshes. Returns the meshes, and any king that lies toppled. */
export function placePieces(s: Sculpture, board: Board, pieces: readonly Piece[], colours: PieceColours = {}, jitter = 0.004) {
  const { random } = s.context;
  const geometries = pieceGeometries();
  const white = new THREE.Color(colours.white ?? '#ebe2cc'), black = new THREE.Color(colours.black ?? '#2a2320');
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42 });
  const meshes: THREE.InstancedMesh[] = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (const type of Object.keys(geometries) as PieceType[]) {
    const mine = pieces.filter((piece) => piece.type === type);
    if (!mine.length) { geometries[type].dispose(); continue; }
    const mesh = new THREE.InstancedMesh(geometries[type], material, mine.length);
    mine.forEach((piece, index) => {
      const spot = squareAt(board, piece.file, piece.rank);
      spot.x += (random() - 0.5) * jitter * 2;
      spot.z += (random() - 0.5) * jitter * 2;
      if (piece.toppled) {
        const roll = random() * Math.PI * 2;
        quaternion.setFromEuler(new THREE.Euler(0, roll, Math.PI / 2 - 0.02));
        matrix.compose(new THREE.Vector3(spot.x, spot.y + HEIGHTS[type] * 0.42 * 0.5, spot.z), quaternion, new THREE.Vector3(1, 1, 1));
      } else {
        quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, 0));
        matrix.compose(spot, quaternion, new THREE.Vector3(1, 1, 1));
      }
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, piece.white ? white : black);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    s.root.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

/** Pieces scattered on the ground around a table, lying every which way. */
export function sweptPieces(s: Sculpture, around: { x: number; z: number }, count: number, colours: PieceColours = {}, radius = 0.7) {
  const { random } = s.context;
  const geometries = pieceGeometries();
  const types = Object.keys(geometries) as PieceType[];
  const white = new THREE.Color(colours.white ?? '#ebe2cc'), black = new THREE.Color(colours.black ?? '#2a2320');
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42 });
  const perType = types.map(() => [] as THREE.Matrix4[]);
  for (let i = 0; i < count; i++) {
    const typeIndex = i < 2 ? 5 - i : Math.floor(random() * 4);
    const angle = random() * Math.PI * 2, distance = 0.35 + random() * radius;
    const position = new THREE.Vector3(around.x + Math.sin(angle) * distance, HEIGHTS[types[typeIndex]] * 0.2, around.z + Math.cos(angle) * distance);
    const matrix = new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, Math.PI / 2 + (random() - 0.5) * 0.3)), new THREE.Vector3(1, 1, 1));
    perType[typeIndex].push(matrix);
  }
  const meshes: THREE.InstancedMesh[] = [];
  types.forEach((type, index) => {
    const list = perType[index];
    if (!list.length) { geometries[type].dispose(); return; }
    const mesh = new THREE.InstancedMesh(geometries[type], material, list.length);
    list.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, random() < 0.5 ? white : black); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    s.root.add(mesh);
    meshes.push(mesh);
  });
  return meshes;
}

/** A two-dial chess clock with push buttons, facing +z. One button is pressed down. */
export function chessClock(s: Sculpture, at: [number, number, number], options: { pressed?: 'left' | 'right' | null; body?: THREE.ColorRepresentation; yaw?: number } = {}) {
  const group = new THREE.Group();
  const w = 0.17, h = 0.075, d = 0.06;
  const body = s.material(options.body ?? '#5a3a22', { roughness: 0.6 });
  const face = s.material('#f1ebdc', { roughness: 0.5 });
  const dark = s.material('#2a2320', { roughness: 0.5 });
  const make = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  make(new THREE.BoxGeometry(w, h, d), body, [0, h / 2, 0]);
  for (const side of [-1, 1]) {
    const dial = make(new THREE.CylinderGeometry(0.028, 0.028, 0.006, 20), face, [side * 0.042, h * 0.52, d / 2]);
    dial.rotation.x = Math.PI / 2;
    const hand = make(new THREE.BoxGeometry(0.003, 0.02, 0.002), dark, [side * 0.042, h * 0.52 + 0.009, d / 2 + 0.004]);
    hand.rotation.z = side * 0.6;
    const pressed = (options.pressed ?? 'right') === (side < 0 ? 'right' : 'left');
    make(new THREE.CylinderGeometry(0.012, 0.012, pressed ? 0.008 : 0.022, 12), dark, [side * 0.042, h + (pressed ? 0.004 : 0.011), -0.005]);
  }
  group.position.set(...at);
  group.rotation.y = options.yaw ?? 0;
  s.root.add(group);
  return { group, width: w, height: h, depth: d };
}

/** A folded banknote lying flat. */
export function banknote(s: Sculpture, at: [number, number, number], yaw = 0) {
  const note = s.box([0.065, 0.003, 0.03], at, s.material('#9fb28a', { roughness: 0.9 }));
  note.rotation.y = yaw;
  s.box([0.03, 0.0015, 0.014], [at[0], at[1] + 0.0022, at[2]], s.material('#c9d3b6', { roughness: 0.9 })).rotation.y = yaw;
  return note;
}

/** A takeaway coffee cup with a lid. */
export function coffeeCup(s: Sculpture, at: [number, number, number], colour: THREE.ColorRepresentation = '#f1ebdc') {
  const paper = s.material(colour, { roughness: 0.8 });
  s.cylinder(0.038, 0.03, 0.1, [at[0], at[1] + 0.05, at[2]], paper, 14);
  s.cylinder(0.04, 0.04, 0.012, [at[0], at[1] + 0.105, at[2]], s.material('#2a2320', { roughness: 0.5 }), 14);
  s.box([0.1, 0.014, 0.1], [at[0], at[1] + 0.035, at[2]], s.material('#b8905a', { roughness: 0.9 })).scale.set(0.8, 1, 0.8);
}

/** A pocket radio with an aerial. */
export function pocketRadio(s: Sculpture, at: [number, number, number], yaw = 0) {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.035), s.material('#2b2b2e', { roughness: 0.5 }));
  shell.position.y = 0.035;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.004), s.material('#8a8d90', { metalness: 0.6, roughness: 0.4 }));
  grille.position.set(-0.022, 0.035, 0.019);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005, 14), s.material('#d9c27a', { roughness: 0.5 }));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.03, 0.035, 0.019);
  const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.22, 6), s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }));
  aerial.position.set(0.045, 0.16, -0.01);
  aerial.rotation.z = -0.35;
  for (const part of [shell, grille, dial, aerial]) part.castShadow = part.receiveShadow = true;
  group.add(shell, grille, dial, aerial);
  group.position.set(...at);
  group.rotation.y = yaw;
  s.root.add(group);
  return group;
}

/** A tin ashtray with a cigarette burning down in it. Returns the ember for flicker and the smoke for drift. */
export function ashtray(s: Sculpture, at: [number, number, number], mood: { warmth: number }) {
  const tin = s.material('#b9bcbd', { metalness: 0.7, roughness: 0.35 });
  s.lathe([[0.02, 0], [0.045, 0], [0.05, 0.012], [0.045, 0.014], [0.025, 0.004]], tin, at);
  const cig = s.cylinder(0.0035, 0.0035, 0.05, [at[0] + 0.03, at[1] + 0.018, at[2] - 0.01], s.material('#f4efe2', { roughness: 0.7 }), 6);
  cig.rotation.set(0.25, 0, 1.2);
  const ember = s.ball([0.004, 0.004, 0.004], [at[0] + 0.054, at[1] + 0.026, at[2] - 0.017], new THREE.MeshStandardMaterial({ color: '#ff7a30', emissive: new THREE.Color().setHSL(0.05 + mood.warmth * 0.03, 1, 0.5), emissiveIntensity: 1.6 }), 6);
  const smoke = new THREE.MeshStandardMaterial({ color: '#e8e8e4', transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
  const wisps: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), smoke.clone());
    wisp.position.set(at[0] + 0.054, at[1] + 0.04 + i * 0.04, at[2] - 0.017);
    wisp.scale.setScalar(0.01 + i * 0.006);
    s.root.add(wisp);
    wisps.push(wisp);
  }
  return { ember, wisps, origin: new THREE.Vector3(at[0] + 0.054, at[1] + 0.03, at[2] - 0.017) };
}
