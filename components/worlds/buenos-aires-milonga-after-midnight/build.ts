import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type P = [number, number, number];

const TILES = {
  classic: 'Black and white marble squares, the classic.',
  green: 'Bottle-green and cream marble.',
  rose: 'Rose and pewter-grey marble, softly faded.',
  ochre: 'Ochre and dark brown, like an old station café.',
} as const;
const TILE_COLOURS: Record<keyof typeof TILES, [string, string]> = {
  classic: ['#e9e3d6', '#2c2a28'], green: ['#e3dcc8', '#2f4a3a'], rose: ['#e2cdc2', '#6e6662'], ochre: ['#d6b678', '#4a3020'],
};
const CURTAINS = {
  crimson: 'Crimson velvet gone dark in the folds.',
  green: 'Bottle-green velvet.',
  gold: 'Faded old-gold velvet.',
  blue: 'Midnight-blue velvet.',
} as const;
const CURTAIN_COLOUR: Record<keyof typeof CURTAINS, string> = { crimson: '#7a1420', green: '#1f4a34', gold: '#a8823a', blue: '#1f2a52' };
const SIGNS = {
  confiteria: 'CONFITERÍA, in gilt script.',
  salon: 'SALÓN DE BAILE, in faded capitals.',
  milonga: 'MILONGA, hand-painted.',
  bar: 'CAFÉ · BAR, plain and old.',
} as const;
const SIGN_TEXT: Record<keyof typeof SIGNS, string> = { confiteria: 'Confitería', salon: 'SALÓN DE BAILE', milonga: 'Milonga', bar: 'CAFÉ · BAR' };

/** Collects many copies of the same part into one instanced mesh per part: the room holds dozens of chairs. */
class Batch {
  private parts = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; shadow: boolean }>();
  add(key: string, make: () => THREE.BufferGeometry, material: THREE.Material, matrix: THREE.Matrix4, shadow = true) {
    let part = this.parts.get(key);
    if (!part) this.parts.set(key, (part = { geometry: make(), material, matrices: [], shadow }));
    part.matrices.push(matrix.clone());
  }
  build(root: THREE.Object3D) {
    for (const part of this.parts.values()) {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, part.matrices.length);
      part.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = part.shadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      root.add(mesh);
    }
  }
}
const M = () => new THREE.Matrix4();
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const RX = (a: number) => new THREE.Matrix4().makeRotationX(a);
const RY = (a: number) => new THREE.Matrix4().makeRotationY(a);
const RZ = (a: number) => new THREE.Matrix4().makeRotationZ(a);
const chain = (...matrices: THREE.Matrix4[]) => matrices.reduce((sum, next) => sum.multiply(next), M());

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    moment: choice('What moment of the night is it?', {
      tanda: 'Mid-tanda: the music playing, chairs pushed back empty, glasses abandoned half-full.',
      cortina: 'The cortina between sets: the floor clearing, people drifting back to their tables, the lights up a notch.',
      closing: 'Closing: the last tanda over, chairs upturned on the far tables, the bar lights going off one by one.',
    }),
    stage: choice('What is on the low stage?', {
      orchestra: 'The orquesta típica on its break: empty chairs, music stands, the bandoneon case open, the piano lid up.',
      records: 'A record player on a small table and a big wooden loudspeaker: the musicalizador plays old seventy-eights.',
      empty: 'Bare boards, one chair and a music stand, the bandoneon case left by the edge.',
    }),
    tiles: choice('What is the marble floor like?', TILES),
    walls: choice('What hangs on the walls?', {
      mirrors: 'Tall gilt-framed mirrors, spotted with age.',
      photographs: 'Rows of framed photographs of old orchestras and dancers.',
      posters: 'Faded posters for long-gone orchestras and Saturday dances.',
    }),
    curtain: choice('What is the curtain over the street door like?', CURTAINS),
    sign: choice('What is painted over the bar?', SIGNS),
    chandelier: noul('Is the chandelier lit?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 11, D = 8.6, WH = 4.4;
    const closing = a.moment === 'closing';
    const glow = mix(0.6, 1, mood.cheer) * (closing ? 0.75 : a.moment === 'cortina' ? 1.15 : 1);
    const background = new THREE.Color().lerpColors(new THREE.Color('#857464'), new THREE.Color('#b29b80'), mood.cheer * 0.7 + (a.moment === 'cortina' ? 0.2 : 0));
    const { art: s, world } = diorama(context, {
      background: '#' + background.getHexString(), floor: TILE_COLOURS[a.tiles][1], width: W, depth: D,
      maxHeight: 1.9, radius: 0.8, pitch: 31, yaw: 25, scale: [0.8, 1.35],
      // The hero on the pale lane, two on the dance floor, two beside tables, one on the stage.
      slots: [[0.4, 1.55], [-2.05, 0.05], [2.75, -0.15], [-2.6, 2.3, 0, 0.9], [3.6, 1.25, 0, 0.9], [2.6, -3.25, 0.38, 0.85]],
      viewBox: [[-5.6, 0, -4.4], [5.5, 3.6, 4.3]],
    });
    const root = s.root;
    const warm = new THREE.Color().setHSL(mix(0.1, 0.07, mood.warmth), mix(0.45, 0.7, mood.warmth), 0.72);
    if (world.keyLight) {
      world.keyLight.intensity *= mix(0.42, 0.62, mood.cheer);
      world.keyLight.color.copy(warm);
    }
    for (const light of root.children) {
      const hemi = light as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.intensity *= mix(0.55, 0.75, mood.cheer); hemi.color.set('#f2dcc0'); hemi.groundColor.set('#5a4636'); }
    }
    const batch = new Batch();
    const wear = mood.wear;

    // ---------------------------------------------------------------- the marble floor and the pale ronda worn into it
    const [light, dark] = TILE_COLOURS[a.tiles];
    const floorMap = canvasTexture(1100, 860, (c) => {
      const px = 100; // pixels per metre
      for (let i = 0; i < W / 0.5; i++) for (let j = 0; j < Math.ceil(D / 0.5); j++) {
        c.fillStyle = (i + j) % 2 ? dark : light;
        c.fillRect(i * 50, j * 50, 50, 50);
        c.globalAlpha = 0.18;
        c.strokeStyle = (i + j) % 2 ? light : '#8a8076';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(i * 50 + random() * 50, j * 50);
        c.bezierCurveTo(i * 50 + random() * 50, j * 50 + 20, i * 50 + random() * 50, j * 50 + 30, i * 50 + random() * 50, j * 50 + 50);
        c.stroke();
        c.globalAlpha = 1;
        if (random() < wear * 0.12) { c.fillStyle = 'rgba(40,30,20,0.45)'; c.fillRect(i * 50 + random() * 40, j * 50 + random() * 40, 4 + random() * 8, 3 + random() * 6); }
      }
      c.strokeStyle = 'rgba(30,25,20,0.35)';
      for (let x = 0; x <= 1100; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 860); c.stroke(); }
      for (let y = 0; y <= 860; y += 50) { c.beginPath(); c.moveTo(0, y); c.lineTo(1100, y); c.stroke(); }
      // The ronda: decades of shoes going round anticlockwise have polished an oval lane pale.
      const cx = (0.4 + W / 2) * px, cy = (0.05 + D / 2) * px;
      c.save();
      c.translate(cx, cy);
      c.scale(1, 1.5 / 2.6);
      const lane = c.createRadialGradient(0, 0, 150, 0, 0, 300);
      lane.addColorStop(0, 'rgba(255,248,232,0)');
      lane.addColorStop(0.3, `rgba(255,248,232,${0.2 + wear * 0.08})`);
      lane.addColorStop(0.62, `rgba(255,248,232,${0.26 + wear * 0.08})`);
      lane.addColorStop(1, 'rgba(255,248,232,0)');
      c.fillStyle = lane;
      c.beginPath();
      c.arc(0, 0, 300, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });
    const floor = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorMap, roughness: mix(0.18, 0.45, wear), metalness: 0.05 }), [0, 0.004, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;

    // ---------------------------------------------------------------- walls: dark wainscot, a smoke-stained upper wall, a picture rail
    const upper = pick(['#b98f6a', '#9a8a62', '#a77a6a', '#8a9478']);
    const wallMap = (width: number) => {
      const map = canvasTexture(1024, 410, (c) => {
        const h = 410, wainscot = h * (1.15 / WH);
        c.fillStyle = upper;
        c.fillRect(0, 0, 1024, h);
        for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,240,210' : '60,40,20'},${0.03 + random() * 0.04})`; c.fillRect(random() * 1024, random() * (h - wainscot), 30 + random() * 90, 20 + random() * 60); }
        c.fillStyle = '#3a2618';
        c.fillRect(0, h - wainscot, 1024, wainscot);
        const panels = Math.round(width / 0.9);
        for (let i = 0; i < panels; i++) {
          const x = (i / panels) * 1024;
          c.strokeStyle = 'rgba(120,80,45,0.6)';
          c.lineWidth = 3;
          c.strokeRect(x + 8, h - wainscot + 12, 1024 / panels - 16, wainscot - 30);
        }
        c.fillStyle = '#5a3a22';
        c.fillRect(0, h - wainscot - 6, 1024, 8);
        c.fillRect(0, h * 0.2, 1024, 5);
        const smoke = c.createLinearGradient(0, 0, 0, h);
        smoke.addColorStop(0, `rgba(50,35,20,${0.35 + wear * 0.35})`);
        smoke.addColorStop(0.55, 'rgba(50,35,20,0)');
        c.fillStyle = smoke;
        c.fillRect(0, 0, 1024, h);
      });
      return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
    };
    s.mesh(new THREE.BoxGeometry(W + 0.3, WH, 0.16), wallMap(W), [0, WH / 2, -D / 2 - 0.08]);
    s.mesh(new THREE.BoxGeometry(0.16, WH, D), wallMap(D), [-W / 2 - 0.08, WH / 2, 0]);
    const darkWood = s.material('#2e1e14', { roughness: 0.6 });
    const brass = s.material('#b8964a', { metalness: 0.75, roughness: 0.35 });
    const gilt = s.material('#a8823a', { metalness: 0.65, roughness: 0.4 });

    // A tarnished mirror surface, painted: a dim warm room in the glass, foxed and spotted with the years.
    const mirrorMap = (seed: number) => canvasTexture(128, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 128, 256);
      g.addColorStop(0, '#8e8a84');
      g.addColorStop(0.45, '#b8b0a2');
      g.addColorStop(0.55, '#d8c8a8');
      g.addColorStop(1, '#6e6862');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 256);
      c.fillStyle = 'rgba(255,220,160,0.35)';
      c.beginPath(); c.ellipse(40 + seed * 30, 70, 14, 30, 0.4, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 10 + wear * 60; i++) {
        c.fillStyle = `rgba(${random() < 0.5 ? '70,50,30' : '30,30,28'},${0.15 + random() * 0.35})`;
        c.beginPath(); c.arc(random() * 128, random() * 256, 1 + random() * (3 + wear * 8), 0, Math.PI * 2); c.fill();
      }
      const edge = c.createLinearGradient(0, 0, 128, 0);
      edge.addColorStop(0, `rgba(50,35,20,${0.3 + wear * 0.3})`);
      edge.addColorStop(0.2, 'rgba(50,35,20,0)');
      edge.addColorStop(0.8, 'rgba(50,35,20,0)');
      edge.addColorStop(1, `rgba(50,35,20,${0.3 + wear * 0.3})`);
      c.fillStyle = edge;
      c.fillRect(0, 0, 128, 256);
    });
    const mirrorMat = (seed: number) => new THREE.MeshStandardMaterial({ map: mirrorMap(seed), roughness: 0.18, metalness: 0.25 });

    // ---------------------------------------------------------------- mirrored columns with gilt capitals
    // Eight mirror panels round each shaft, each holding a different smear of the lit room, parted by gilt fillets.
    const columnMap = canvasTexture(256, 256, (c) => {
      for (let i = 0; i < 8; i++) {
        const x = i * 32;
        const g = c.createLinearGradient(0, 0, 0, 256);
        const tone = 120 + random() * 70;
        g.addColorStop(0, `rgb(${tone * 0.7},${tone * 0.62},${tone * 0.52})`);
        g.addColorStop(0.35 + random() * 0.3, `rgb(${tone + 50},${tone + 35},${tone + 10})`);
        g.addColorStop(1, `rgb(${tone * 0.75},${tone * 0.7},${tone * 0.66})`);
        c.fillStyle = g;
        c.fillRect(x, 0, 32, 256);
        if (random() < 0.6) { c.fillStyle = 'rgba(255,215,150,0.35)'; c.fillRect(x + 6 + random() * 14, 40 + random() * 120, 5, 30 + random() * 50); }
        c.fillStyle = '#a8823a';
        c.fillRect(x, 0, 2, 256);
        c.fillRect(x + 30, 0, 2, 256);
      }
      for (let i = 0; i < 6 + wear * 30; i++) { c.fillStyle = `rgba(60,45,30,${0.15 + random() * 0.25})`; c.beginPath(); c.arc(random() * 256, 180 + random() * 76, 1 + random() * 3, 0, Math.PI * 2); c.fill(); }
      const foot = c.createLinearGradient(0, 160, 0, 256);
      foot.addColorStop(0, 'rgba(50,35,20,0)');
      foot.addColorStop(1, `rgba(50,35,20,${0.2 + wear * 0.4})`);
      c.fillStyle = foot;
      c.fillRect(0, 160, 256, 96);
    });
    const columnMat = new THREE.MeshStandardMaterial({ map: columnMap, roughness: 0.2, metalness: 0.2, flatShading: true });
    const columns: [number, number][] = [[-2.75, -2.35], [5.05, -2.0], [-2.75, 1.05]];
    for (const [x, z] of columns) {
      const shaft = s.cylinder(0.2, 0.2, WH, [x, WH / 2, z], columnMat, 8);
      shaft.rotation.y = Math.PI / 8 + random();
      s.cylinder(0.27, 0.3, 0.32, [x, 0.16, z], darkWood, 8);
      s.cylinder(0.25, 0.25, 0.05, [x, 0.34, z], gilt, 8);
      s.cylinder(0.3, 0.22, 0.28, [x, 3.3, z], gilt, 8);
      s.cylinder(0.24, 0.24, 0.05, [x, 3.12, z], gilt, 8);
    }

    // ---------------------------------------------------------------- the velvet curtain over the street door
    const curtainColour = new THREE.Color(CURTAIN_COLOUR[a.curtain]);
    const velvet = canvasTexture(256, 64, (c) => {
      for (let x = 0; x < 256; x++) {
        const fold = 0.55 + 0.45 * Math.sin(x / 256 * Math.PI * 2 * 9);
        const shade = curtainColour.clone().multiplyScalar(0.45 + fold * 0.75);
        c.fillStyle = '#' + shade.getHexString();
        c.fillRect(x, 0, 1, 64);
      }
      c.fillStyle = `rgba(200,190,170,${wear * 0.25})`;
      c.fillRect(0, 54, 256, 10);
    });
    const curtainGeometry = new THREE.PlaneGeometry(1.9, 2.9, 72, 1);
    const position = curtainGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin((position.getX(i) / 1.9 + 0.5) * Math.PI * 2 * 9) * 0.05);
    curtainGeometry.computeVertexNormals();
    const curtainX = -3.75;
    s.mesh(curtainGeometry, new THREE.MeshStandardMaterial({ map: velvet, roughness: 0.95, side: THREE.DoubleSide }), [curtainX, 1.45, -D / 2 + 0.12]);
    s.rod([curtainX - 1.1, 2.95, -D / 2 + 0.12], [curtainX + 1.1, 2.95, -D / 2 + 0.12], 0.025, brass);
    s.box([2.3, 0.32, 0.08], [curtainX, 3.12, -D / 2 + 0.16], s.material(curtainColour.clone().multiplyScalar(0.8), { roughness: 0.95 }));
    // The street showing through a gap at the edge: a sliver of sodium light.
    const street = new THREE.MeshStandardMaterial({ color: '#ffcf8a', emissive: '#ffb860', emissiveIntensity: 1.2 * glow, roughness: 1 });
    s.box([0.05, 2.7, 0.02], [curtainX + 0.32, 1.36, -D / 2 + 0.06], street).castShadow = false;
    s.box([2.2, 0.08, 0.3], [curtainX, 0.04, -D / 2 + 0.2], s.material('#4a3426', { roughness: 0.9 }));

    // ---------------------------------------------------------------- the low stage at the back
    const stageX0 = 0.3, stageX1 = 4.9, stageZ = -D / 2 + 1.65, stageH = 0.38;
    const boards = canvasTexture(256, 64, (c) => {
      for (let y = 0; y < 64; y += 8) { const v = 70 + random() * 25; c.fillStyle = `rgb(${v + 30},${v + 10},${v - 10})`; c.fillRect(0, y, 256, 8); c.fillStyle = 'rgba(20,10,5,0.6)'; c.fillRect(0, y, 256, 1); }
    });
    boards.wrapS = boards.wrapT = THREE.RepeatWrapping;
    boards.repeat.set(2, 6);
    s.box([stageX1 - stageX0, stageH, stageZ + D / 2], [(stageX0 + stageX1) / 2, stageH / 2, (stageZ - D / 2) / 2], new THREE.MeshStandardMaterial({ map: boards, roughness: 0.7 }));
    s.box([stageX1 - stageX0, 0.06, 0.04], [(stageX0 + stageX1) / 2, stageH - 0.03, stageZ + 0.02], brass);
    s.box([2.4, stageH / 2, 0.36], [2.6, stageH / 4, stageZ + 0.18], darkWood);
    const music = s.material('#1e1e20', { metalness: 0.5, roughness: 0.45 });
    const musicStand = (x: number, z: number, yaw: number) => {
      const base = stageH;
      for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3 + yaw; s.rod([x, base + 0.2, z], [x + Math.sin(angle) * 0.2, base, z + Math.cos(angle) * 0.2], 0.007, music); }
      s.cylinder(0.008, 0.01, 0.95, [x, base + 0.62, z], music, 8);
      const desk = s.box([0.46, 0.32, 0.012], [x, base + 1.15, z + 0.03], music);
      desk.rotation.set(-0.45, yaw, 0, 'YXZ');
      const sheet = s.label('TANGO', 0.32, 0.23, [x + Math.sin(yaw) * 0.012, base + 1.16, z + 0.04 + Math.cos(yaw) * 0.012], '#3a3a3a', '#eee4cc');
      sheet.rotation.set(-0.45, yaw, 0, 'YXZ');
    };
    // The bandoneon case: a squat black box with brass corners and a leather handle, open in the break.
    const bandoneonCase = (x: number, y: number, z: number, open: boolean) => {
      const leather = s.material('#1c1818', { roughness: 0.6 });
      s.box([0.42, 0.3, 0.32], [x, y + 0.15, z], leather);
      for (const dx of [-0.2, 0.2]) for (const dz of [-0.15, 0.15]) s.box([0.04, 0.31, 0.04], [x + dx, y + 0.155, z + dz], brass);
      s.ring(0.06, 0.012, [x, y + 0.32, z], s.material('#5a3a22', { roughness: 0.7 }), Math.PI);
      if (open) {
        const lid = s.box([0.42, 0.03, 0.32], [x, y + 0.42, z - 0.22], leather);
        lid.rotation.x = -1.2;
        s.box([0.38, 0.02, 0.28], [x, y + 0.305, z], s.material('#6a1420', { roughness: 0.95 }));
      }
    };
    const bentwood = s.material(pick(['#3e2a1c', '#4a3222', '#2e2016']), { roughness: 0.5 });
    const cane = s.material('#c2a870', { roughness: 0.9 });
    const chairs: THREE.Matrix4[] = [];
    if (a.stage === 'orchestra') {
      for (const [x, z] of [[1.0, -3.7], [1.8, -3.85], [3.2, -3.85]] as const) chairs.push(chain(T(x, stageH, z), RY(0.15 + (random() - 0.5) * 0.4)));
      musicStand(1.05, -3.25, 0.1);
      musicStand(1.9, -3.4, -0.1);
      bandoneonCase(1.0, stageH + 0.45, -3.72, true);
      // An upright piano against the back wall, lid up.
      const piano = s.material('#1a1210', { roughness: 0.3 });
      s.box([1.45, 1.25, 0.6], [4.15, stageH + 0.625, -D / 2 + 0.35], piano);
      s.box([1.45, 0.1, 0.32], [4.15, stageH + 0.74, -D / 2 + 0.78], piano);
      s.box([1.3, 0.03, 0.15], [4.15, stageH + 0.8, -D / 2 + 0.72], s.material('#efe8d8', { roughness: 0.5 }));
      s.box([1.4, 0.04, 0.5], [4.15, stageH + 1.32, -D / 2 + 0.3], piano).rotation.x = -0.5;
      // A violin case on the floor by a chair, and the old ribbon microphone.
      s.box([0.75, 0.1, 0.24], [3.3, stageH + 0.05, -3.35], s.material('#3a2a20', { roughness: 0.7 })).rotation.y = 0.5;
    } else if (a.stage === 'records') {
      chairs.push(chain(T(0.8, stageH, -3.85), RY(0.3)));
      const table = s.material('#3a2618', { roughness: 0.6 });
      const rx = 1.45;
      s.box([0.9, 0.05, 0.55], [rx, stageH + 0.75, -3.75], table);
      for (const dx of [-0.4, 0.4]) for (const dz of [-0.22, 0.22]) s.box([0.04, 0.75, 0.04], [rx + dx, stageH + 0.375, -3.75 + dz], table);
      s.box([0.42, 0.14, 0.36], [rx - 0.15, stageH + 0.845, -3.75], s.material('#5a3a22', { roughness: 0.5 }));
      s.cylinder(0.15, 0.15, 0.012, [rx - 0.15, stageH + 0.92, -3.75], s.material('#141414', { roughness: 0.3 }), 24);
      s.cylinder(0.04, 0.04, 0.014, [rx - 0.15, stageH + 0.925, -3.75], s.material('#b3202c'), 12);
      s.rod([rx, stageH + 0.95, -3.63], [rx - 0.08, stageH + 0.95, -3.77], 0.006, brass);
      for (let i = 0; i < 4; i++) s.box([0.3, 0.006, 0.3], [rx + 0.25, stageH + 0.78 + i * 0.007, -3.75], s.material(pick(['#c9a46a', '#7a1f2a', '#2a3a5a', '#e9e2cc']), { roughness: 0.8 })).rotation.y = random() * 0.4;
      const cabinet = s.material('#5a3a22', { roughness: 0.55 });
      s.box([0.8, 1.3, 0.5], [4.1, stageH + 0.65, -3.85], cabinet);
      s.mesh(new THREE.CircleGeometry(0.28, 24), s.material('#2a2018', { roughness: 0.95 }), [4.1, stageH + 0.8, -3.595]);
      bandoneonCase(1.0, stageH, -3.15, false);
    } else {
      chairs.push(chain(T(1.15, stageH, -3.75), RY(0.3)));
      musicStand(1.7, -3.35, 0.15);
      bandoneonCase(4.1, stageH, -3.3, closing || random() < 0.5);
    }
    // A ribbon microphone on its stand at the front of the stage.
    s.cylinder(0.12, 0.14, 0.03, [3.6, stageH + 0.015, -3.0], music, 16);
    s.cylinder(0.01, 0.01, 1.45, [3.6, stageH + 0.74, -3.0], music, 8);
    s.ball([0.05, 0.08, 0.035], [3.6, stageH + 1.52, -3.0], s.material('#c9ccd0', { metalness: 0.85, roughness: 0.3 }), 14);

    // ---------------------------------------------------------------- the long bar along the left wall
    const barX = -W / 2 + 0.75, bar0 = -3.75, bar1 = 0.55;
    const barWood = canvasTexture(512, 128, (c) => {
      c.fillStyle = '#3e2416';
      c.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 8; i++) { c.strokeStyle = 'rgba(160,110,60,0.5)'; c.lineWidth = 4; c.strokeRect(i * 64 + 8, 18, 48, 92); }
      c.fillStyle = '#b8964a';
      c.fillRect(0, 118, 512, 6);
    });
    barWood.wrapS = THREE.RepeatWrapping;
    barWood.repeat.set((bar1 - bar0) / 4, 1);
    const barFront = new THREE.MeshStandardMaterial({ map: barWood, roughness: 0.55 });
    const barPlain = s.material('#3e2416');
    // Box faces run +x, -x, +y, -y, +z, -z: the panelled front faces the room.
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.05, bar1 - bar0), [barFront, barPlain, barPlain, barPlain, barPlain, barPlain]);
    counter.position.set(barX, 0.525, (bar0 + bar1) / 2);
    counter.castShadow = counter.receiveShadow = true;
    root.add(counter);
    s.box([0.78, 0.06, bar1 - bar0 + 0.1], [barX + 0.05, 1.08, (bar0 + bar1) / 2], s.material('#5a3a26', { roughness: 0.25 }));
    s.box([0.03, 0.03, bar1 - bar0], [barX + 0.36, 0.18, (bar0 + bar1) / 2], brass);
    // Back bar: a mirror, three shelves, and the bottles.
    const backX = -W / 2 + 0.05;
    s.mesh(new THREE.PlaneGeometry(bar1 - bar0 - 0.4, 1.2), mirrorMat(0.2), [backX + 0.02, 1.85, (bar0 + bar1) / 2]).rotation.y = Math.PI / 2;
    s.box([0.08, 1.4, bar1 - bar0 - 0.25], [backX + 0.02, 1.85, (bar0 + bar1) / 2], darkWood).position.x -= 0.03;
    const bottleColours = ['#1a2a1e', '#2a1a12', '#5a3a1a', '#7a6a3a', '#1e2a3a', '#3a1a1e', '#c9b47a'];
    const bottleGeo = () => new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.04, 0.2], [0.016, 0.26], [0.014, 0.31], [0, 0.31]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const shelfMat = s.material('#4a3020', { roughness: 0.6 });
    const bottleMats = bottleColours.map((colour) => s.material(colour, { roughness: 0.22, metalness: 0.05 }));
    for (const y of [1.3, 1.72, 2.14]) {
      s.box([0.26, 0.03, bar1 - bar0 - 0.5], [backX + 0.15, y, (bar0 + bar1) / 2], shelfMat);
      const count = Math.round(mix(9, 22, mood.density) * (closing ? 0.8 : 1));
      for (let i = 0; i < count; i++) {
        const z = bar0 + 0.4 + (i + random() * 0.4) * ((bar1 - bar0 - 0.8) / count);
        const k = Math.floor(random() * bottleMats.length);
        batch.add(`bottle${k}`, bottleGeo, bottleMats[k], chain(T(backX + 0.15 + (random() - 0.5) * 0.06, y + 0.015, z), new THREE.Matrix4().makeScale(1, mix(0.8, 1.15, random()), 1)));
      }
    }
    // The espresso machine: a chrome tower with an eagle on the dome, two group heads, a stack of cups.
    const chrome = s.material('#d4d6d8', { metalness: 0.9, roughness: 0.2 });
    const ex = barX + 0.05, ez = bar0 + 0.7;
    s.box([0.5, 0.12, 0.42], [ex, 1.17, ez], chrome);
    s.cylinder(0.17, 0.17, 0.52, [ex, 1.49, ez], chrome, 24);
    s.lathe([[0.17, 0], [0.16, 0.06], [0.1, 0.14], [0.03, 0.18], [0, 0.19]], brass, [ex, 1.75, ez]);
    s.ball([0.035, 0.03, 0.06], [ex, 1.97, ez], brass, 10);
    for (const dz of [-0.11, 0.11]) {
      s.box([0.1, 0.06, 0.08], [ex + 0.2, 1.37, ez + dz], chrome);
      s.rod([ex + 0.22, 1.38, ez + dz], [ex + 0.3, 1.62, ez + dz], 0.012, s.material('#1a1414'));
    }
    const china = s.material('#f1ece2', { roughness: 0.4 });
    for (let i = 0; i < 4; i++) s.cylinder(0.035, 0.028, 0.05, [ex, 1.136 + i * 0.05, ez + 0.36], china, 12);
    // A brass till at the far end.
    s.box([0.36, 0.26, 0.34], [barX + 0.05, 1.24, bar1 - 0.5], brass);
    s.box([0.3, 0.12, 0.3], [barX + 0.05, 1.42, bar1 - 0.48], brass).rotation.z = 0.4;
    // The sign painted over the back bar.
    const signMap = canvasTexture(1024, 160, (c) => {
      c.fillStyle = '#2a1a12';
      c.fillRect(0, 0, 1024, 160);
      c.strokeStyle = '#b8964a';
      c.lineWidth = 6;
      c.strokeRect(10, 10, 1004, 140);
      c.fillStyle = a.sign === 'milonga' ? '#e8d6a8' : '#d9b860';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = a.sign === 'confiteria' || a.sign === 'milonga' ? 'italic bold 104px serif' : 'bold 84px serif';
      c.fillText(SIGN_TEXT[a.sign], 512, 84, 960);
      c.fillStyle = `rgba(40,30,20,${wear * 0.5})`;
      for (let i = 0; i < 40 * wear; i++) c.fillRect(random() * 1024, random() * 160, 8 + random() * 30, 2 + random() * 6);
    });
    s.mesh(new THREE.PlaneGeometry(3.2, 0.5), new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.6, emissive: '#3a2a10', emissiveIntensity: 0.25 * glow }), [backX + 0.03, 2.85, (bar0 + bar1) / 2]).rotation.y = Math.PI / 2;

    // ---------------------------------------------------------------- wall dressing: mirrors, photographs or posters; brass sconces
    const backZ = -D / 2 + 0.02;
    const wallSpots: { x: number; z: number; yaw: number }[] = [
      { x: -1.75, z: backZ, yaw: 0 }, { x: -0.55, z: backZ, yaw: 0 }, { x: -W / 2 + 0.02, z: 1.6, yaw: Math.PI / 2 }, { x: -W / 2 + 0.02, z: 2.9, yaw: Math.PI / 2 },
    ];
    for (const [index, spot] of wallSpots.entries()) {
      const group = new THREE.Group();
      group.position.set(spot.x, 0, spot.z);
      group.rotation.y = spot.yaw;
      root.add(group);
      const add = (mesh: THREE.Mesh, at: P) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      if (a.walls === 'mirrors') {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.9, 0.05), gilt), [0, 2.15, 0.03]);
        add(new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.76), mirrorMat(index * 0.3)), [0, 2.15, 0.06]);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), gilt), [0, 3.1, 0.03]);
      } else if (a.walls === 'photographs') {
        for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) {
          const photo = canvasTexture(64, 80, (c) => {
            c.fillStyle = '#d9c8a4';
            c.fillRect(0, 0, 64, 80);
            c.fillStyle = '#3a2a1a';
            const people = 1 + Math.floor(random() * 5);
            for (let p = 0; p < people; p++) { const x = 10 + (p + 0.5) * (44 / people); c.fillRect(x - 5, 36, 10, 34); c.beginPath(); c.arc(x, 28, 6, 0, Math.PI * 2); c.fill(); }
            c.fillStyle = `rgba(120,90,50,${0.2 + wear * 0.3})`;
            c.fillRect(0, 0, 64, 80);
          });
          add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.03), darkWood), [(k - 0.5) * 0.5, 1.85 + r * 0.62, 0.02]);
          add(new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.7 })), [(k - 0.5) * 0.5, 1.85 + r * 0.62, 0.04]);
        }
      } else {
        const titles = ['ORQUESTA TÍPICA', 'GRAN MILONGA', 'SÁBADO 22 HS', 'BAILE DE GALA', 'TANGO · VALS', 'NOCHE DE GALA'];
        const ink = pick(['#7a1420', '#1f2a4a', '#2a2a2a']);
        const poster = canvasTexture(128, 180, (c) => {
          c.fillStyle = pick(['#e3d4a8', '#d9c49a', '#e9dcc0']);
          c.fillRect(0, 0, 128, 180);
          c.fillStyle = ink;
          c.fillRect(8, 8, 112, 46);
          c.fillStyle = '#e9dcc0';
          c.font = 'bold 15px serif';
          c.textAlign = 'center';
          c.fillText(titles[index % titles.length], 64, 37, 108);
          c.fillStyle = ink;
          c.beginPath(); c.arc(64, 108, 30, 0, Math.PI * 2); c.fill();
          c.fillRect(30, 146, 68, 6);
          c.fillRect(42, 158, 44, 4);
          c.fillStyle = `rgba(150,120,70,${0.25 + wear * 0.4})`;
          c.fillRect(0, 0, 128, 180);
        });
        const sheet = add(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.88), new THREE.MeshStandardMaterial({ map: poster, roughness: 0.9 })), [0, 2.0, 0.03]);
        sheet.rotation.z = (random() - 0.5) * 0.06;
      }
    }
    const shade = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb45a', emissiveIntensity: 1.3 * glow, roughness: 0.6 });
    const sconces: [number, number, number][] = [[-2.35, backZ, 0], [0.05, backZ, 0], [-W / 2 + 0.02, -1.1 + 3.4, Math.PI / 2], [-W / 2 + 0.02, 3.6, Math.PI / 2], [1.9, backZ, 0], [3.9, backZ, 0]];
    for (const [x, z, yaw] of sconces) {
      const out = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      s.rod([x, 2.6, z], [x + out.x * 0.16, 2.72, z + out.z * 0.16], 0.012, brass);
      const tulip = s.lathe([[0.02, 0], [0.06, 0.04], [0.07, 0.11], [0.0, 0.11]], shade, [x + out.x * 0.16, 2.7, z + out.z * 0.16]);
      tulip.castShadow = false;
    }

    // ---------------------------------------------------------------- tables with white cloths ringing the floor, bentwood chairs
    const cloth = s.material('#f2eee3', { roughness: 0.95 });
    const iron = s.material('#2a2622', { metalness: 0.35, roughness: 0.55 });
    const allTables: [number, number][] = [
      [-3.55, -1.75], [-3.55, -0.05], [4.55, -0.9], [4.55, 0.75], [-1.45, -3.45], [-3.6, 1.75], [4.5, 2.5], [-2.35, 3.55], [2.95, 3.5], [-4.3, 3.6], [0.3, 3.75],
    ];
    const tableCount = Math.round(mix(7, allTables.length, mood.density));
    const tables = allTables.slice(0, tableCount);
    const TH = 0.74, TR = 0.36;
    const wineGlass = () => new THREE.LatheGeometry([[0, 0], [0.032, 0], [0.032, 0.004], [0.006, 0.006], [0.005, 0.07], [0.012, 0.075], [0.034, 0.09], [0.036, 0.13], [0.03, 0.165]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const glassMat = new THREE.MeshStandardMaterial({ color: '#eef3f0', transparent: true, opacity: 0.32, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
    const wineMat = s.material('#5a0f1e', { roughness: 0.3 });
    const candleMat = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ff9a3a', emissiveIntensity: 1.6 * glow, roughness: 0.6 });
    const coatMats = ['#2a2a30', '#5a3a2a', '#7a1f2a', '#3a4a5a'].map((colour) => s.material(colour, { roughness: 0.95 }));
    tables.forEach(([x, z], index) => {
      const far = closing && (index % 2 === 0 || z < -1);
      batch.add('clothTop', () => new THREE.CylinderGeometry(TR, TR, 0.025, 28), cloth, T(x, TH - 0.012, z));
      batch.add('clothDrape', () => new THREE.CylinderGeometry(TR, TR * 0.97, 0.24, 28, 1, true), cloth, T(x, TH - 0.14, z));
      batch.add('pedestal', () => new THREE.CylinderGeometry(0.03, 0.035, TH - 0.08, 10), iron, T(x, (TH - 0.08) / 2, z));
      batch.add('foot', () => new THREE.CylinderGeometry(0.2, 0.26, 0.03, 18), iron, T(x, 0.015, z));
      // Two chairs facing the dance floor, or upturned on the cloth at closing.
      const toFloor = Math.atan2(0.4 - x, 0.05 - z);
      for (const side of [-1, 1]) {
        // Mid-tanda the chairs are left pushed back askew by whoever got up to dance.
        const yaw = toFloor + side * 0.35 + (random() - 0.5) * (a.moment === 'tanda' ? 0.9 : 0.3);
        const r = 0.62;
        const cx = x - Math.sin(toFloor + side * 1.2) * r, cz = z - Math.cos(toFloor + side * 1.2) * r;
        // Upturned, its seat on the cloth and its back hanging over the edge.
        if (far && side === 1) chairs.push(chain(T(x, TH + 0.47, z), RY(yaw), T(0, 0, 0.2), RX(Math.PI)));
        else chairs.push(chain(T(cx, 0, cz), RY(yaw)));
        if (!far && random() < mood.density * 0.35) batch.add(`coat${index % 4}`, () => new THREE.BoxGeometry(0.38, 0.42, 0.06), coatMats[index % 4], chain(T(cx, 0, cz), RY(yaw), T(0, 0.72, -0.2), RX(0.12)));
      }
      if (far) return;
      // A bottle, a glass or two, a candle in a little glass.
      if (random() < 0.4 + mood.density * 0.5) {
        const k = Math.floor(random() * 3);
        batch.add(`bottle${k}`, bottleGeo, bottleMats[k], T(x + 0.08, TH, z - 0.05));
      }
      const glasses = 1 + Math.floor(random() * 2);
      for (let g = 0; g < glasses; g++) {
        const gx = x - 0.12 + g * 0.18, gz = z + 0.1 - g * 0.05;
        batch.add('glass', wineGlass, glassMat, T(gx, TH, gz), false);
        if (a.moment !== 'cortina' || random() < 0.5) batch.add('wine', () => new THREE.CylinderGeometry(0.03, 0.022, 0.04, 12), wineMat, T(gx, TH + 0.1, gz));
      }
      if (!closing) batch.add('candle', () => new THREE.CylinderGeometry(0.022, 0.022, 0.06, 10), candleMat, T(x - 0.05, TH + 0.03, z - 0.14), false);
    });
    for (const matrix of chairs) {
      const seat = 0.46;
      const leg = (lx: number, lz: number) => chain(matrix, T(lx, (seat - 0.03) / 2, lz), RX(lz > 0 ? 0.05 : -0.05), RZ(lx > 0 ? -0.05 : 0.05));
      batch.add('seat', () => new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18), cane, chain(matrix, T(0, seat - 0.015, 0)));
      batch.add('seatRing', () => new THREE.TorusGeometry(0.2, 0.013, 6, 22), bentwood, chain(matrix, T(0, seat - 0.03, 0), RX(Math.PI / 2)));
      for (const [lx, lz] of [[-0.16, 0.16], [0.16, 0.16], [-0.16, -0.16], [0.16, -0.16]] as const) batch.add('leg', () => new THREE.CylinderGeometry(0.013, 0.018, seat - 0.03, 7), bentwood, leg(lx, lz));
      batch.add('legRing', () => new THREE.TorusGeometry(0.17, 0.009, 6, 20), bentwood, chain(matrix, T(0, seat * 0.35, 0), RX(Math.PI / 2)));
      batch.add('hoop', () => new THREE.TorusGeometry(0.18, 0.014, 7, 22, Math.PI), bentwood, chain(matrix, T(0, seat + 0.24, -0.18)));
      for (const sx of [-0.18, 0.18]) batch.add('upright', () => new THREE.CylinderGeometry(0.014, 0.014, 0.26, 7), bentwood, chain(matrix, T(sx, seat + 0.11, -0.18)));
      batch.add('innerHoop', () => new THREE.TorusGeometry(0.11, 0.01, 6, 18, Math.PI), bentwood, chain(matrix, T(0, seat + 0.2, -0.17)));
    }

    // ---------------------------------------------------------------- the chandelier and the ceiling fan, hanging from the dark above
    const lit = a.chandelier && !closing;
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffb050', emissiveIntensity: lit ? 2.2 * glow : 0.05, roughness: 0.5 });
    const chandelier = new THREE.Group();
    chandelier.position.set(0.4, 3.05, -0.1);
    chandelier.scale.setScalar(1.35);
    root.add(chandelier);
    const hang = (mesh: THREE.Mesh, at: P, parent: THREE.Object3D = chandelier) => { mesh.position.set(...at); mesh.castShadow = true; parent.add(mesh); return mesh; };
    hang(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.2, 6), brass), [0, 1.8, 0]);
    hang(new THREE.Mesh(new THREE.LatheGeometry([[0, -0.25], [0.06, -0.22], [0.1, -0.05], [0.07, 0.08], [0.03, 0.2], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 16), gilt), [0, 0, 0]);
    const ring = hang(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 32), gilt), [0, -0.05, 0]);
    ring.rotation.x = Math.PI / 2;
    const bulbs = 8;
    for (let i = 0; i < bulbs; i++) {
      const angle = (i / bulbs) * Math.PI * 2;
      const bx = Math.cos(angle) * 0.42, bz = Math.sin(angle) * 0.42;
      hang(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8), s.material('#efe6d4', { roughness: 0.6 })), [bx, 0.0, bz]);
      hang(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), bulbMat), [bx, 0.08, bz]).castShadow = false;
    }
    const drops = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.022, 0), new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.1, metalness: 0.2, emissive: '#ffcf8a', emissiveIntensity: lit ? 0.4 * glow : 0 }), 24);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      drops.setMatrixAt(i, chain(T(Math.cos(angle) * 0.36, -0.14 - (i % 2) * 0.05, Math.sin(angle) * 0.36), new THREE.Matrix4().makeScale(0.8, 1.6, 0.8)));
    }
    drops.instanceMatrix.needsUpdate = true;
    chandelier.add(drops);
    if (lit) {
      const pool = new THREE.PointLight(warm.clone().lerp(new THREE.Color('#ffc070'), 0.6), mix(14, 30, mood.cheer), 12, 1.8);
      pool.position.set(0.4, 2.7, -0.1);
      root.add(pool);
    }
    const barGlow = new THREE.PointLight('#ffb868', closing ? 3 : mix(6, 12, mood.cheer), 7, 1.8);
    barGlow.position.set(barX + 0.6, 2.4, (bar0 + bar1) / 2);
    root.add(barGlow);
    const fan = new THREE.Group();
    fan.position.set(-1.5, 3.35, -1.3);
    root.add(fan);
    hang(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.6, 6), darkWood), [0, 1.35, 0], fan);
    hang(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 16), brass), [0, 0, 0], fan);
    const blades = new THREE.Group();
    fan.add(blades);
    const bladeMat = s.material('#4a3020', { roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const blade = hang(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.13), bladeMat), [0, 0, 0], blades);
      blade.geometry.translate(0.42, -0.04, 0);
      blade.rotation.set(0.12, (i / 4) * Math.PI * 2, 0, 'YXZ');
    }
    hang(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), s.material('#efe2c4', { emissive: '#ffb060', emissiveIntensity: closing ? 0.2 : 0.8 * glow })), [0, -0.12, 0], fan);

    batch.build(root);

    // ---------------------------------------------------------------- motion: the fan turns, the candles breathe, the chandelier stirs
    const fanSpeed = (closing ? 0.6 : 1.4) * mix(0.6, 2.2, mood.energy);
    const baseCandle = candleMat.emissiveIntensity;
    world.update = (dt, time) => {
      blades.rotation.y = time * fanSpeed;
      candleMat.emissiveIntensity = baseCandle * (0.85 + Math.sin(time * 7.3) * 0.08 + Math.sin(time * 13.1) * 0.06);
      chandelier.rotation.z = Math.sin(time * 0.4) * 0.006 * (0.3 + mood.energy);
    };
    return world;
  },
});
