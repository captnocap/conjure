import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const INSCRIPTIONS = {
  forget: 'LEST WE FORGET',
  honored: 'OUR HONORED DEAD',
  served: 'THEY SERVED',
  roll: 'ROLL OF HONOR',
  gave: 'ALL GAVE SOME · SOME GAVE ALL',
  sons: 'SONS AND DAUGHTERS OF THIS TOWN',
} as const;

/**
 * Bake every static mesh that shares a surface (texture, gloss, glow) into one draw call, carrying
 * its colour as vertex colour. Anything marked userData.live, or instanced, is left to move freely.
 */
function fuse(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const groups = new Map<string, { material: THREE.MeshStandardMaterial; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    for (let up: THREE.Object3D | null = mesh; up && up !== root; up = up.parent) if (up.userData.live) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (Array.isArray(m) || m.type !== 'MeshStandardMaterial' || m.userData.live || m.transparent) return;
    const key = [m.map?.uuid, m.emissiveMap?.uuid, Math.round(m.roughness * 8), Math.round(m.metalness * 5), m.emissive.getHex(), m.emissiveIntensity.toFixed(2), m.side, m.alphaTest].join('|');
    const group = groups.get(key) ?? { material: m, parts: [], meshes: [] };
    groups.set(key, group);
    const part = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    part.applyMatrix4(mesh.matrixWorld);
    for (const name of Object.keys(part.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') part.deleteAttribute(name);
    const count = part.attributes.position.count;
    if (!part.attributes.normal) part.computeVertexNormals();
    if (!part.attributes.uv) part.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colours.set([m.color.r, m.color.g, m.color.b], i * 3);
    part.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    group.parts.push(part);
    group.meshes.push(mesh);
  });
  for (const { material, parts, meshes } of groups.values()) {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const surface = material.clone();
    surface.color.set('#ffffff');
    surface.vertexColors = true;
    const mesh = new THREE.Mesh(merged, surface);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    const spent = new Set<THREE.Material>();
    for (const old of meshes) {
      old.removeFromParent();
      old.geometry.dispose();
      spent.add(old.material as THREE.Material);
    }
    // Textures stay alive on the fused clone; only the per-mesh material shells go.
    for (const old of spent) old.dispose();
  }
}

export default defineThing({
  questions: {
    form: choice('What form does the memorial take?', {
      slab: 'A single upright rectangular slab on a plinth.',
      arched: 'An upright slab with a rounded, arched top like a headstone.',
      wall: 'A three-panel wall: a tall centre stone with two lower wings.',
      obelisk: 'A tapering obelisk on a stepped base with a name plaque on its front.',
      boulder: 'A rough fieldstone boulder carrying a bronze plaque.',
    }),
    stone: choice('What is it cut from?', {
      black: 'Polished black granite, mirror-dark with pale engraving.',
      grey: 'Speckled grey granite.',
      rose: 'Rose-red granite.',
      marble: 'White marble gone soft and grey at the edges.',
    }),
    inscription: choice('What is carved across the top?', {
      forget: 'LEST WE FORGET',
      honored: 'OUR HONORED DEAD',
      served: 'THEY SERVED',
      roll: 'ROLL OF HONOR',
      gave: 'ALL GAVE SOME, SOME GAVE ALL',
      sons: 'SONS AND DAUGHTERS OF THIS TOWN',
    }),
    names: score('How many names are engraved?', ['A handful: one short column', 'Two or three columns', 'Packed edge to edge in small letters']),
    tending: choice('How has it been kept lately?', {
      ceremony: 'The morning of the ceremony: a big fresh wreath on an easel, rows of small flags, bouquets.',
      weekly: 'Tended weekly by someone: a few fresh flowers in a vase and a pair of crisp little flags.',
      single: 'Bare except for one thing: a single rose and a folded note left on the plinth.',
      faded: 'Last year\'s offerings still here: a browned wreath, sun-bleached flags leaning over.',
      forgotten: 'Long untended: weeds through the paving, lichen on the stone, nothing left at all.',
    }),
    flag: choice('What is on the flagpole?', {
      full: 'The flag flying at the top of the pole.',
      half: 'The flag at half-staff.',
      bare: 'A bare pole, its halyard slapping.',
      stub: 'Only the concrete base and a sawn-off stub: the pole is gone.',
    }),
    emblem: choice('What emblem is on the stone above the names?', {
      star: 'A five-pointed star.',
      laurel: 'A laurel wreath.',
      eagle: 'A spread-winged eagle.',
      none: 'No emblem, only words.',
    }),
    apron: choice('What does it stand on?', {
      pavers: 'A neat apron of square pavers.',
      gravel: 'A bed of pale gravel edged in stone.',
      brick: 'Herringbone red brick.',
      grass: 'Just a concrete footing in mown grass.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const forgotten = a.tending === 'forgotten';
    const stale = forgotten || a.tending === 'faded';
    const wear = Math.min(1, mood.wear + (forgotten ? 0.35 : a.tending === 'faded' ? 0.15 : 0));
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });
    const sheet = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });

    const base = new THREE.Color({ black: '#26272b', grey: '#9a9a98', rose: '#a5645a', marble: '#e6e3da' }[a.stone]);
    const dark = a.stone === 'black' || a.stone === 'rose';
    const ink = a.form === 'boulder' ? '#e2c98a' : dark ? '#e3e0d6' : '#34353a';
    const speckle = (g: CanvasRenderingContext2D, w: number, h: number, colour: THREE.Color, amount: number) => {
      g.fillStyle = hex(colour);
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < amount; i++) {
        g.fillStyle = hex(colour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.22));
        g.fillRect(random() * w, random() * h, 1 + random() * 2.5, 1 + random() * 2.5);
      }
      // Streaks of weather running down from the top edge.
      g.globalAlpha = 0.16 + wear * 0.3;
      for (let i = 0; i < 4 + wear * 26; i++) {
        g.fillStyle = dark ? '#b9b6a8' : '#4c4a40';
        g.fillRect(random() * w, 0, 1 + random() * 5, h * (0.1 + random() * 0.7));
      }
      g.globalAlpha = 1;
    };
    const granite = paint(256, 256, (g, w, h) => speckle(g, w, h, base, 2600));
    granite.wrapS = granite.wrapT = THREE.RepeatWrapping;
    const stone = new THREE.MeshStandardMaterial({ map: granite, roughness: a.stone === 'black' ? 0.25 + wear * 0.4 : 0.6 + wear * 0.3, metalness: a.stone === 'black' ? 0.2 : 0 });
    const rough = new THREE.MeshStandardMaterial({ map: granite, color: '#bdb8ae', roughness: 0.95 });

    /** The engraved face: inscription, emblem and columns of names. */
    const face = (width: number, height: number, columns: number, withHeader: boolean, plaque = false) =>
      paint(512, Math.round((512 * height) / width), (g, w, h) => {
        if (plaque) {
          g.fillStyle = '#5b4526';
          g.fillRect(0, 0, w, h);
          g.strokeStyle = '#a8894e';
          g.lineWidth = 8;
          g.strokeRect(8, 8, w - 16, h - 16);
        } else speckle(g, w, h, base, 5000);
        g.fillStyle = ink;
        g.strokeStyle = ink;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        let top = h * 0.06;
        if (withHeader) {
          const cx = w / 2, cy = h * 0.11, r = h * 0.07;
          g.lineWidth = 3;
          if (a.emblem === 'star') {
            g.beginPath();
            for (let i = 0; i < 10; i++) {
              const rr = i % 2 ? r * 0.42 : r, angle = -Math.PI / 2 + (i * Math.PI) / 5;
              g.lineTo(cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr);
            }
            g.fill();
          } else if (a.emblem === 'laurel') {
            for (let i = 0; i < 22; i++) {
              const angle = Math.PI * 0.62 + (i / 21) * Math.PI * 1.76;
              g.save();
              g.translate(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
              g.rotate(angle + (i < 11 ? 2.2 : 0.9));
              g.beginPath();
              g.ellipse(0, 0, r * 0.26, r * 0.1, 0, 0, Math.PI * 2);
              g.fill();
              g.restore();
            }
          } else if (a.emblem === 'eagle') {
            g.beginPath();
            g.moveTo(cx, cy - r * 0.5);
            g.quadraticCurveTo(cx + r * 1.2, cy - r * 1.3, cx + r * 2.4, cy - r * 0.5);
            g.quadraticCurveTo(cx + r * 1.4, cy - r * 0.3, cx + r * 0.4, cy + r * 0.5);
            g.lineTo(cx, cy + r);
            g.lineTo(cx - r * 0.4, cy + r * 0.5);
            g.quadraticCurveTo(cx - r * 1.4, cy - r * 0.3, cx - r * 2.4, cy - r * 0.5);
            g.quadraticCurveTo(cx - r * 1.2, cy - r * 1.3, cx, cy - r * 0.5);
            g.fill();
            g.beginPath();
            g.arc(cx, cy - r * 0.7, r * 0.25, 0, Math.PI * 2);
            g.fill();
          }
          const text = INSCRIPTIONS[a.inscription];
          const y = a.emblem === 'none' ? h * 0.13 : h * 0.24;
          g.font = `bold ${Math.min(h * 0.075, (w / text.length) * 1.45)}px serif`;
          g.fillText(text, cx, y, w * 0.9);
          g.fillRect(w * 0.2, y + h * 0.05, w * 0.6, 2);
          top = y + h * 0.085;
        }
        const rowH = mix(15, 8.5, a.names) * (plaque ? 0.9 : 1);
        const rows = Math.floor(((h * 0.95 - top) / rowH) * mix(0.45, 1, Math.min(1, a.names * 1.6)));
        const colW = (w * 0.86) / columns;
        for (let column = 0; column < columns; column++)
          for (let row = 0; row < rows; row++) {
            if (column === columns - 1 && row > rows * (0.5 + random() * 0.45)) break;
            const x = w * 0.07 + column * colW;
            const first = colW * (0.18 + random() * 0.2), last = colW * (0.25 + random() * 0.3);
            g.globalAlpha = 0.85 - wear * 0.35 * random();
            g.fillRect(x, top + row * rowH, first, rowH * 0.5);
            g.fillRect(x + first + colW * 0.05, top + row * rowH, last, rowH * 0.5);
          }
        g.globalAlpha = 1;
      });
    const columns = 1 + Math.round(a.names * 3.4);
    const panel = (width: number, height: number, at: P3, cols: number, header: boolean, tilt = 0, yaw = 0, plaque = false) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: face(width, height, cols, header, plaque), roughness: plaque ? 0.45 : stone.roughness, metalness: plaque ? 0.6 : stone.metalness }), at);
      mesh.rotation.set(tilt, yaw, 0, 'YXZ');
      return mesh;
    };

    // Apron.
    if (a.apron !== 'grass') {
      const paving = paint(256, 256, (g, w, h) => {
        if (a.apron === 'gravel') {
          g.fillStyle = '#cfc8b6';
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 2600; i++) {
            g.fillStyle = hex(new THREE.Color().setHSL(0.1, 0.12, 0.55 + random() * 0.35));
            g.fillRect(random() * w, random() * h, 3, 3);
          }
        } else {
          g.fillStyle = a.apron === 'brick' ? '#6d5a50' : '#8f8d86';
          g.fillRect(0, 0, w, h);
          const n = a.apron === 'brick' ? 8 : 4;
          for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++) {
              g.fillStyle = hex(a.apron === 'brick' ? new THREE.Color().setHSL(0.02 + random() * 0.02, 0.42, 0.34 + random() * 0.1) : new THREE.Color().setHSL(0.1, 0.05, 0.62 + random() * 0.1));
              if (a.apron === 'brick' && (i + j) % 2) g.fillRect((i * w) / n + 1, (j * h) / n + 1, w / n - 2, h / n / 2 - 2), g.fillRect((i * w) / n + 1, ((j + 0.5) * h) / n + 1, w / n - 2, h / n / 2 - 2);
              else if (a.apron === 'brick') g.fillRect((i * w) / n + 1, (j * h) / n + 1, w / n / 2 - 2, h / n - 2), g.fillRect(((i + 0.5) * w) / n + 1, (j * h) / n + 1, w / n / 2 - 2, h / n - 2);
              else g.fillRect((i * w) / n + 1.5, (j * h) / n + 1.5, w / n - 3, h / n - 3);
            }
        }
      });
      paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
      paving.repeat.set(2.5, 1.6);
      const top = new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95 });
      s.box([4.6, 0.08, 2.7], [0.35, 0.04, 0.2], top);
      if (a.apron === 'gravel') for (const [w, d, x, z] of [[4.76, 0.1, 0.35, 1.58], [4.76, 0.1, 0.35, -1.18], [0.1, 2.7, -1.98, 0.2], [0.1, 2.7, 2.68, 0.2]] as const) s.box([w, 0.13, d], [x, 0.065, z], rough);
    }
    const ground = a.apron === 'grass' ? 0 : 0.08;

    // The stone itself.
    const tilt = forgotten ? (random() - 0.5) * 0.06 : 0;
    const body = new THREE.Group();
    const put = <T extends THREE.Object3D>(node: T) => { body.add(node); return node; };
    let plinthTop = ground + 0.3, stoneTop = 2, plinthDepth = 0.95;
    if (a.form === 'slab' || a.form === 'arched') {
      const w = 2.3, h = a.form === 'slab' ? 1.55 : 1.25, d = 0.3;
      put(s.box([w + 0.6, 0.3, plinthDepth], [0, ground + 0.15, 0], rough));
      put(s.box([w, h, d], [0, plinthTop + h / 2, 0], stone));
      if (a.form === 'arched') {
        const arch = put(s.cylinder(w / 2, w / 2, d, [0, plinthTop + h, 0], stone, 40));
        arch.rotation.x = Math.PI / 2;
        arch.scale.set(1, 1, 0.5);
        put(panel(w * 0.94, h + w * 0.2, [0, plinthTop + (h + w * 0.2) / 2 + 0.02, d / 2 + 0.004], columns + 1, true));
        stoneTop = plinthTop + h + w * 0.25;
      } else {
        put(panel(w * 0.95, h * 0.96, [0, plinthTop + h / 2, d / 2 + 0.004], columns + 1, true));
        stoneTop = plinthTop + h;
      }
    } else if (a.form === 'wall') {
      plinthDepth = 1.05;
      put(s.box([4.1, 0.3, plinthDepth], [0, ground + 0.15, 0], rough));
      put(s.box([1.5, 1.8, 0.32], [0, plinthTop + 0.9, -0.1], stone));
      put(panel(1.42, 1.72, [0, plinthTop + 0.9, 0.064], Math.max(2, columns), true));
      for (const side of [-1, 1]) {
        const wing = put(s.box([1.25, 1.25, 0.26], [side * 1.32, plinthTop + 0.625, 0.02], stone));
        wing.rotation.y = -side * 0.22;
        put(panel(1.17, 1.17, [side * 1.32 - side * 0.03, plinthTop + 0.625, 0.02 + 0.136], Math.max(2, columns), false, 0, -side * 0.22));
      }
      stoneTop = plinthTop + 1.8;
    } else if (a.form === 'obelisk') {
      plinthDepth = 1.5;
      put(s.box([1.5, 0.2, 1.5], [0, ground + 0.1, 0], rough));
      put(s.box([1.15, 0.2, 1.15], [0, ground + 0.3, 0], rough));
      put(s.box([0.85, 0.75, 0.85], [0, ground + 0.775, 0], stone));
      const shaft = put(s.cylinder(0.26, 0.5, 2.2, [0, ground + 2.25, 0], stone, 4));
      shaft.rotation.y = Math.PI / 4;
      const tip = put(s.cylinder(0, 0.26, 0.35, [0, ground + 3.52, 0], stone, 4));
      tip.rotation.y = Math.PI / 4;
      put(panel(0.75, 0.65, [0, ground + 0.775, 0.43], Math.min(3, columns), false));
      put(panel(0.5, 1.5, [0, ground + 2.15, 0.305], 1, true, -0.077));
      plinthTop = ground + 0.4;
      stoneTop = ground + 3.7;
    } else {
      plinthDepth = 1.3;
      const rock = new THREE.IcosahedronGeometry(1, 2);
      const positions = rock.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(positions, i);
        const bump = 1 + 0.16 * Math.sin(v.x * 4.1 + context.seed) * Math.cos(v.y * 3.3 + v.z * 2.7);
        positions.setXYZ(i, v.x * bump, v.y * bump, v.z * bump);
      }
      rock.computeVertexNormals();
      const boulder = put(s.mesh(rock, rough, [0, ground + 0.8, -0.1]));
      boulder.scale.set(1.3, 1.0, 0.75);
      put(panel(1.25, 0.95, [0, ground + 0.95, 0.66], Math.min(3, columns), true, -0.2, 0, true));
      for (const [x, y] of [[-0.58, 0.44], [0.58, 0.44], [-0.58, -0.44], [0.58, -0.44]]) put(s.ball([0.022, 0.022, 0.012], [x, ground + 0.95 + y * 0.96, 0.67 - y * 0.2], mat('#a8894e', { metalness: 0.7 }), 8));
      plinthTop = ground;
      stoneTop = ground + 1.8;
    }
    body.rotation.z = tilt;
    s.root.add(body);

    // Lichen and chips.
    if (wear > 0.45) {
      const spots = Array.from({ length: Math.round((wear - 0.4) * 70) }, () => ({
        at: [(random() - 0.5) * 2.1, plinthTop + random() * Math.min(1.5, stoneTop - plinthTop), (a.form === 'boulder' ? 0.62 : a.form === 'obelisk' ? 0.44 : 0.16) + random() * 0.01] as const,
        size: 0.025 + random() * 0.06,
        color: ['#b9b86a', '#8f9a6a', '#d0c98f', '#6f7a58'][Math.floor(random() * 4)],
      })).filter((spot) => a.form !== 'obelisk' || Math.abs(spot.at[0]) < 0.4 && spot.at[1] < ground + 1.15);
      if (spots.length) s.scatter(new THREE.CylinderGeometry(1, 1, 0.08, 7).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: blank, roughness: 1 }), spots);
    }

    // Flagpole to one side.
    const poleX = a.form === 'wall' ? 2.25 : a.form === 'obelisk' ? 1.75 : 1.95, poleZ = -0.35;
    const steel = mat('#cfd2d0', { metalness: 0.7, roughness: 0.35 + wear * 0.4 });
    const stars = paint(192, 120, (g, w, h) => {
      const fadeTo = new THREE.Color('#b9b3a4'), f = Math.min(0.75, wear * 0.7);
      for (let i = 0; i < 13; i++) {
        g.fillStyle = hex(new THREE.Color(i % 2 ? '#f1ede2' : '#b3242c').lerp(fadeTo, f));
        g.fillRect(0, (i * h) / 13, w, h / 13 + 1);
      }
      g.fillStyle = hex(new THREE.Color('#27397d').lerp(fadeTo, f));
      g.fillRect(0, 0, w * 0.42, (h * 7) / 13);
      g.fillStyle = '#f1ede2';
      for (let i = 0; i < 24; i++) g.fillRect(6 + (i % 6) * 12.5 + (Math.floor(i / 6) % 2) * 4, 6 + Math.floor(i / 6) * 15, 4, 4);
      if (wear > 0.55) {
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < (wear - 0.5) * 30; i++) {
          g.beginPath();
          g.moveTo(w, random() * h);
          g.lineTo(w * (0.55 + random() * 0.4), random() * h);
          g.lineTo(w, random() * h);
          g.fill();
        }
      }
    });
    const flagMaterial = sheet(stars);
    s.lathe([[0, 0], [0.3, 0], [0.3, 0.12], [0.2, 0.2], [0.09, 0.3], [0.07, 0.42], [0, 0.42]], rough, [poleX, ground, poleZ]);
    let flag: THREE.Mesh | null = null;
    const poleH = 4.3;
    if (a.flag === 'stub') {
      s.cylinder(0.05, 0.05, 0.3, [poleX, ground + 0.5, poleZ], steel, 12);
      s.cylinder(0.035, 0.035, 0.01, [poleX, ground + 0.655, poleZ], mat('#3a3b3c'), 12);
    } else {
      s.rod([poleX, ground + 0.4, poleZ], [poleX, ground + poleH, poleZ], 0.05, steel, 0.03);
      s.ball([0.075, 0.075, 0.075], [poleX, ground + poleH + 0.06, poleZ], mat('#d8b755', { metalness: 0.85, roughness: 0.25 }), 14);
      s.rod([poleX + 0.06, ground + 1.2, poleZ], [poleX + 0.04, ground + poleH - 0.1, poleZ], 0.006, mat('#e9e6dc'));
      s.box([0.03, 0.12, 0.06], [poleX + 0.06, ground + 1.2, poleZ], steel);
      if (a.flag !== 'bare') {
        const geometry = new THREE.PlaneGeometry(1.5, 0.9, 12, 3);
        geometry.translate(0.75, 0, 0);
        flag = s.mesh(geometry, flagMaterial, [poleX + 0.04, ground + (a.flag === 'half' ? poleH * 0.6 : poleH - 0.55), poleZ]);
        flag.rotation.y = -0.25 - random() * 0.5;
        flag.userData.rest = Float32Array.from(geometry.attributes.position.array);
      }
    }

    // Offerings.
    const front = plinthDepth / 2;
    const smallFlag = (x: number, z: number, lean: number) => {
      const group = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 5), mat('#d9c59a'));
      stick.position.y = 0.275;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), flagMaterial);
      cloth.position.set(0.15, 0.45, 0);
      stick.castShadow = cloth.castShadow = true;
      group.add(stick, cloth);
      group.position.set(x, ground, z);
      group.rotation.set((random() - 0.5) * lean, -0.3 + random() * 0.8, (random() - 0.5) * lean * 2);
      s.root.add(group);
    };
    const petals = ['#d83a45', '#f4f0e6', '#27397d', '#e9c34b', '#f2a7b5'];
    const blooms: { at: P3; size: number; color: string }[] = [];
    const wreath = (x: number, y: number, z: number, radius: number, lean: number, dead: boolean) => {
      const ring = s.ring(radius, radius * 0.24, [x, y, z], mat(dead ? '#6b5334' : '#2f5f38', { roughness: 0.95 }));
      ring.rotation.x = lean;
      for (let i = 0; i < 16; i++) {
        const angle = random() * Math.PI * 2;
        const py = Math.sin(angle) * radius, pz = radius * 0.22;
        blooms.push({ at: [x + Math.cos(angle) * radius, y + py * Math.cos(lean) - pz * Math.sin(lean), z + py * Math.sin(lean) + pz * Math.cos(lean)], size: radius * (0.1 + random() * 0.1), color: dead ? ['#8a7350', '#a48c63', '#5d4a31'][i % 3] : petals[i % 3] });
      }
      const ribbon = mat(dead ? '#9a7f6b' : '#c8202c', { roughness: 0.7 });
      for (const side of [-1, 1]) {
        const tail = s.box([radius * 0.22, radius * 1.1, 0.01], [x + side * radius * 0.2, y - radius * 1.05 * Math.cos(lean), z + radius * 0.3 - radius * 1.05 * Math.sin(lean)], ribbon);
        tail.rotation.set(lean, 0, side * 0.25);
      }
    };
    if (a.tending === 'ceremony') {
      const easel = mat('#3a3d38');
      const ex = -1.25, ez = front + 0.55;
      s.rod([ex - 0.32, ground, ez + 0.15], [ex, ground + 1.45, ez - 0.1], 0.015, easel);
      s.rod([ex + 0.32, ground, ez + 0.15], [ex, ground + 1.45, ez - 0.1], 0.015, easel);
      s.rod([ex, ground, ez - 0.55], [ex, ground + 1.45, ez - 0.1], 0.015, easel);
      wreath(ex, ground + 0.95, ez + 0.06, 0.38, -0.2, false);
      const rowCount = 5 + Math.round(mood.density * 7);
      for (let i = 0; i < rowCount; i++) smallFlag(-0.75 + (i / (rowCount - 1)) * 2.3, front + 0.75 + (i % 2) * 0.28, 0.1);
      for (let b = 0; b < 3 + Math.round(mood.density * 3); b++) {
        const bx = -0.9 + random() * 1.8, bz = front + 0.15 + random() * 0.25;
        s.rod([bx - 0.12, ground + 0.03, bz + 0.1], [bx + 0.1, ground + 0.05, bz - 0.05], 0.025, mat('#3f6a3c'), 0.012);
        for (let i = 0; i < 7; i++) blooms.push({ at: [bx + 0.1 + random() * 0.14, ground + 0.06 + random() * 0.06, bz - 0.05 - random() * 0.12], size: 0.035 + random() * 0.025, color: petals[Math.floor(random() * 5)] });
      }
    } else if (a.tending === 'weekly') {
      const vx = 0.55 + random() * 0.3;
      s.lathe([[0, 0], [0.07, 0], [0.09, 0.1], [0.05, 0.2], [0.065, 0.26]], mat('#7d8f9a', { roughness: 0.3 }), [vx, plinthTop, front - 0.18]);
      for (let i = 0; i < 9; i++) {
        const dx = (random() - 0.5) * 0.24, dz = (random() - 0.5) * 0.16, top = plinthTop + 0.4 + random() * 0.18;
        s.rod([vx, plinthTop + 0.24, front - 0.18], [vx + dx, top, front - 0.18 + dz], 0.006, mat('#3f6a3c'));
        blooms.push({ at: [vx + dx, top, front - 0.18 + dz], size: 0.04 + random() * 0.02, color: petals[i % 5] });
      }
      smallFlag(-1.05, front + 0.2, 0.08);
      smallFlag(1.25, front + 0.2, 0.08);
      wreath(-0.4, plinthTop + 0.3, front - 0.1, 0.27, -0.35, false);
    } else if (a.tending === 'single') {
      const rx = -0.3 + random() * 0.6;
      s.rod([rx - 0.2, plinthTop + 0.012, front - 0.2], [rx + 0.12, plinthTop + 0.02, front - 0.12], 0.007, mat('#3f6a3c'));
      blooms.push({ at: [rx + 0.14, plinthTop + 0.035, front - 0.115], size: 0.04, color: '#b3202c' }, { at: [rx + 0.17, plinthTop + 0.03, front - 0.105], size: 0.026, color: '#93161f' });
      const note = s.box([0.16, 0.006, 0.11], [rx - 0.35, plinthTop + 0.004, front - 0.18], mat('#f4f0e6'));
      note.rotation.y = random() - 0.5;
      s.ball([0.03, 0.02, 0.03], [rx - 0.35, plinthTop + 0.02, front - 0.18], rough, 8);
    } else if (a.tending === 'faded') {
      wreath(-0.55, plinthTop + 0.26, front - 0.05, 0.3, -0.5, true);
      for (let i = 0; i < 4; i++) smallFlag(-1.1 + i * 0.75 + random() * 0.2, front + 0.22 + random() * 0.2, 0.7);
      const fallen = s.box([0.3, 0.004, 0.19], [0.9, ground + 0.004, front + 0.75], flagMaterial);
      fallen.rotation.y = random() * 3;
    }
    if (blooms.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.8 }), blooms);

    if (stale || wear > 0.6) {
      const weed = mat(forgotten ? '#7b8048' : '#6f8a4a', { roughness: 0.95 });
      const tufts = forgotten ? 26 : 9;
      for (let i = 0; i < tufts; i++) {
        const x = -1.9 + random() * 4.5, z = random() < 0.5 ? front + 0.02 + random() * 0.08 : -0.9 + random() * 2.4;
        for (let blade = 0; blade < 3; blade++) s.rod([x, ground, z], [x + (random() - 0.5) * 0.18, ground + 0.12 + random() * (forgotten ? 0.4 : 0.2), z + (random() - 0.5) * 0.18], 0.009, weed, 0.001);
      }
    }

    const rest = flag?.userData.rest as Float32Array | undefined;
    const wave = (time: number) => {
      if (!flag || !rest) return;
      const position = flag.geometry.attributes.position;
      const droop = mix(0.55, 0.1, mood.energy);
      for (let i = 0; i < position.count; i++) {
        const x = rest[i * 3], y = rest[i * 3 + 1];
        position.setXYZ(i, x * (1 - droop * 0.25), y - x * x * droop * 0.4, Math.sin(x * 4.5 - time * (1.5 + mood.energy * 5)) * 0.09 * x);
      }
      position.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    };
    if (flag) flag.userData.live = true;
    fuse(s.root);
    wave(random() * 6);
    return s.finish({ footprint: 2.6, update: (_dt, time) => wave(time) });
  },
});
