import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

/** A sheet settled over a lying figure: head at -x, feet at +x, resting on y = 0. */
function shroud(length: number, width: number, bulk: number, random: () => number) {
  const nu = 60, nv = 22, k = length / 1.78;
  // The body under the sheet as ellipsoid domes: [along, across, radius along, radius across, height].
  const turn = (random() - 0.5) * 0.06;
  const body: number[][] = [
    [0.13, turn, 0.115, 0.095, 0.21], [0.47, 0, 0.27, 0.2 * bulk, 0.2 * bulk], [0.78, 0, 0.24, 0.18 * bulk, 0.17 * bulk + 0.03 * random()],
    [1.2, 0.09, 0.46, 0.08, 0.13], [1.2, -0.09, 0.46, 0.08, 0.13], [1.67, 0.09 + turn, 0.055, 0.055, 0.25], [1.67, -0.09, 0.055, 0.055, 0.24],
    [0.62, 0.23 * bulk, 0.3, 0.05, 0.1], [0.62, -0.23 * bulk, 0.3, 0.05, 0.1],
  ];
  const at = (i: number, j: number) => i * (nv + 1) + j;
  const solid = new Float32Array((nu + 1) * (nv + 1));
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const x = (i / nu) * 1.78, z = ((j / nv) * 2 - 1) * (width / 2) / k;
      let h = 0;
      for (const [cx, cz, rx, rz, top] of body) h = Math.max(h, top * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2)));
      solid[at(i, j)] = h;
    }
  // Cloth: relax a tent over the solid so the sheet spans the hollows instead of clinging.
  let cloth = Float32Array.from(solid);
  for (let pass = 0; pass < 7; pass++) {
    const next = new Float32Array(cloth.length);
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const rim = i === 0 || j === 0 || i === nu || j === nv;
        const mean = rim ? 0 : (cloth[at(i - 1, j)] + cloth[at(i + 1, j)] + cloth[at(i, j - 1)] + cloth[at(i, j + 1)]) / 4;
        next[at(i, j)] = rim ? 0 : Math.max(solid[at(i, j)], mean);
      }
    cloth = next;
  }
  const positions: number[] = [], index: number[] = [];
  const phase = random() * 6;
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const t = i / nu, v = (j / nv) * 2 - 1;
      const rim = i === 0 || j === 0 || i === nu || j === nv;
      positions.push((t - 0.5) * length, cloth[at(i, j)] * k + (rim ? 0 : 0.012 + 0.004 * Math.sin(t * 23 + v * 7 + phase)), (v * width) / 2);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = at(i, j), b = a + nv + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function tiles(random: () => number, base: string, grout: string, accent: string | null, wear: number, repeat: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = grout;
  g.fillRect(0, 0, 256, 256);
  const colour = new THREE.Color(base);
  for (let x = 0; x < 4; x++)
    for (let y = 0; y < 4; y++) {
      const tone = colour.clone().multiplyScalar(1 - random() * 0.07 - (random() < wear * 0.35 ? 0.16 + random() * 0.2 : 0));
      g.fillStyle = accent && y === 0 ? accent : `#${tone.getHexString()}`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 });
}

function card(lines: string[], paper: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = paper;
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((line, index) => {
    g.font = `bold ${lines.length > 2 ? 30 : 44}px monospace`;
    g.fillText(line, 128, (128 * (index + 1)) / (lines.length + 1), 240);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
}

export default defineWorld({
  questions: {
    kind: choice('What kind of mortuary is it?', {
      hospital: 'A modern hospital basement: pale green tile, brushed stainless doors, everything wipe-clean.',
      coroner: 'A 1970s city coroner: cream tile with a dark green band, heavy grey-green enamel doors.',
      victorian: 'A Victorian dead-house: white glazed brick, varnished oak doors with brass latches.',
      provisional: 'A temporary disaster morgue: bare concrete, plastic sheeting and white container doors.',
    }),
    doors: choice('What state is the wall of refrigerator doors in?', {
      shut: 'Every door shut and latched.',
      ajar: 'One door hanging ajar on a dark opening.',
      out: 'One tray slid out with a sheeted form lying on it.',
      cleared: 'Several doors standing open on empty compartments.',
    }),
    occupancy: score('How many of the doors carry a name card?', ['None, the place is empty', 'A few', 'About half', 'Every one: a bad week']),
    hour: choice('What does the small frosted window show?', {
      day: 'Flat cold daylight, an ordinary working morning.',
      night: 'Deep blue night; the lamp is the only real light.',
      dawn: 'A low amber glow, the end of a long night shift.',
      blind: 'Nothing: it has been painted over or boarded.',
    }),
    lamp: choice('What is the overhead examination lamp doing?', {
      blazing: 'Blazing down in a hard white cone onto the examination spot.',
      dim: 'Turned low, a tired pool of light.',
      flicker: 'Flickering, one bulb dead.',
      off: 'Off. The work is done or has not begun.',
    }),
    floor: choice('What state is the floor in?', {
      dry: 'Clean, dry and dull.',
      mopped: 'Just mopped: a wet shine, a bucket and a yellow warning sign.',
      running: 'A thin stream of water running across the tiles to the drain.',
      tracked: 'Wheel tracks and footprints tracked in from the corridor.',
    }),
    left: choice('What sign of the living has been left in the room?', {
      nothing: 'Nothing at all.',
      flowers: 'A jar of flowers on the counter.',
      chair: 'A single chair set facing the wall of doors.',
      shift: 'A radio, a mug and a folded newspaper on the counter: the night attendant.',
      boxes: 'Stacked supply boxes and a yellow clinical waste bin.',
      board: 'A whiteboard on the wall listing names, times and door numbers.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 10, D = 9, back = -D / 2 + 0.1, wallH = 4.7;
    const palette = {
      hospital: { bg: '#dfe6df', wall: '#bfd3c6', floor: '#aebfb4', door: '#c9d1d2', frame: '#aab3b4', metal: 0.5, accent: null as string | null },
      coroner: { bg: '#e0e3d6', wall: '#e2dcc2', floor: '#9aa79a', door: '#9fb0a4', frame: '#7f9185', metal: 0.1, accent: '#3f6a55' },
      victorian: { bg: '#e4e4dc', wall: '#eeeee6', floor: '#b7b4a6', door: '#7c5636', frame: '#5a3d27', metal: 0, accent: '#2f4a5a' },
      provisional: { bg: '#dde2e0', wall: '#b9bcb6', floor: '#a3a6a0', door: '#e9ebe6', frame: '#c5c9c6', metal: 0.15, accent: null as string | null },
    }[a.kind];
    const { art: s, world } = diorama(context, { background: palette.bg, floor: palette.floor, width: W, depth: D, yaw: 0, pitch: 19, maxHeight: 2.15, radius: 1.35,
      slots: [[0, 0.9], [-3.3, 0.5], [3.3, 0.5], [-2.2, 3.1, 0, 0.8], [2.3, 3.1, 0, 0.8], [-3.95, -3.75, 0.94, 0.4]] });
    const steel = s.material('#c5cccd', { metalness: 0.5, roughness: 0.3 });
    const dark = s.material('#1a1f20', { roughness: 0.85 });
    const hardware = s.material(a.kind === 'victorian' ? '#b8923f' : '#e3e7e8', { metalness: 0.7, roughness: 0.28 });
    const concrete = a.kind === 'provisional';

    // Floor: tiles, the drain, and its state.
    const floorTiles = concrete ? s.material('#a3a6a0', { roughness: 0.9 }) : tiles(random, palette.floor, '#7d877f', null, mood.wear, [W / 1.2, D / 1.2]);
    if (a.floor === 'mopped') floorTiles.roughness = 0.12;
    const floor = s.mesh(new THREE.PlaneGeometry(W, D), floorTiles, [0, 0.004, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    const drain: [number, number] = [0, 2.75];
    s.cylinder(0.2, 0.2, 0.01, [drain[0], 0.008, drain[1]], steel, 24);
    for (let i = -2; i <= 2; i++) s.box([0.32 - Math.abs(i) * 0.05, 0.004, 0.025], [drain[0], 0.015, drain[1] + i * 0.06], dark);
    const shade = new THREE.Mesh(new THREE.RingGeometry(0.2, 1.7, 40), new THREE.MeshBasicMaterial({ color: '#4d5a54', transparent: true, opacity: 0.1, depthWrite: false }));
    shade.rotation.x = -Math.PI / 2;
    shade.position.set(drain[0], 0.007, drain[1]);
    s.root.add(shade);
    const water = new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.03, metalness: 0.3 });
    if (a.floor === 'running') {
      const from: [number, number] = [random() < 0.5 ? -2.6 : 2.6, -3.9];
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 8; i++) pts.push([mix(from[0], drain[0], i / 8) + Math.sin(i * 1.3) * 0.25 * (1 - i / 8), 0.01, mix(from[1], drain[1], i / 8)]);
      const stream = s.tube(pts, 0.07, water);
      stream.scale.y = 0.08;
      stream.castShadow = false;
    }
    if (a.floor === 'mopped') {
      for (let i = 0; i < 6; i++) {
        const pool = s.cylinder(0.5, 0.5, 0.004, [(random() - 0.5) * 9, 0.008, (random() - 0.3) * 5], water, 20);
        pool.scale.set(1 + random() * 1.5, 1, 0.5 + random() * 0.6);
        pool.castShadow = false;
      }
      const bx = 4.1, bz = 2.2;
      s.box([0.5, 0.36, 0.34], [bx, 0.22, bz], s.material('#e3c53a', { roughness: 0.5 }));
      for (const x of [-0.2, 0.2]) for (const z of [-0.13, 0.13]) s.cylinder(0.04, 0.04, 0.03, [bx + x, 0.04, bz + z], dark, 10).rotation.x = Math.PI / 2;
      s.rod([bx + 0.1, 0.3, bz], [bx - 0.35, 1.5, bz - 0.5], 0.016, s.material('#8a6a45'));
      s.box([0.3, 0.06, 0.12], [bx + 0.1, 0.42, bz], s.material('#d9d6c6'));
      for (const side of [-1, 1]) s.box([0.36, 0.62, 0.02], [bx - 1.1, 0.3, bz + 0.3 + side * 0.1], s.material('#f0cf2a', { roughness: 0.5 })).rotation.x = side * 0.3;
    }
    if (a.floor === 'tracked') {
      const track = new THREE.MeshBasicMaterial({ color: '#5a5448', transparent: true, opacity: 0.22, depthWrite: false });
      for (const offset of [-0.28, 0.28]) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 6.2), track);
        line.rotation.set(-Math.PI / 2, 0, 0.42);
        line.position.set(2.8 + offset, 0.009, 1.2);
        s.root.add(line);
      }
      for (let i = 0; i < 9; i++) {
        const print = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.27), track);
        print.rotation.set(-Math.PI / 2, 0, -0.5 + (random() - 0.5) * 0.3);
        print.position.set(-4.0 + i * 0.45 + (i % 2) * 0.1, 0.009, 3.8 - i * 0.36 + (i % 2) * 0.22);
        s.root.add(print);
      }
    }

    // Walls.
    const wallPaint = concrete ? s.material(palette.wall, { roughness: 0.95 }) : tiles(random, palette.wall, '#8f9a92', palette.accent, mood.wear, [W / 1.6, 3.4 / 1.7]);
    const upper = s.material(concrete ? '#b0b3ad' : '#e3e6de', { roughness: 0.9 });
    s.box([W, wallH, 0.2], [0, wallH / 2, back - 0.1], upper);
    const dado = s.mesh(new THREE.PlaneGeometry(W, 3.4), wallPaint, [0, 1.7, back + 0.004]);
    dado.castShadow = false;
    for (const x of [-1, 1]) s.box([0.2, wallH, D], [x * (W / 2 + 0.1), wallH / 2, 0], upper);
    s.box([W, 0.12, 0.06], [0, 0.06, back + 0.03], s.material('#6f7a73'));
    if (concrete) {
      const sheet = new THREE.MeshStandardMaterial({ color: '#e9f1f1', transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide });
      for (const x of [-3.9, 3.8]) s.mesh(new THREE.PlaneGeometry(2.1, 3.4, 8, 1), sheet, [x, 1.9, back + 0.12]).castShadow = false;
      s.rod([-W / 2, 3.62, back + 0.12], [W / 2, 3.62, back + 0.12], 0.02, steel);
    }

    // The wall of refrigerator doors.
    const cols = 6, rows = 3, dw = 0.82, dh = 0.68, base = 0.26;
    const bankW = cols * dw + 0.16, bankH = rows * dh + 0.14;
    const frame = s.material(palette.frame, { metalness: palette.metal, roughness: 0.4 });
    const doorPaint = s.material(palette.door, { metalness: palette.metal, roughness: 0.32 });
    const panelPaint = s.material(new THREE.Color(palette.door).multiplyScalar(0.92), { metalness: palette.metal, roughness: 0.38 });
    const front = back + 0.5;
    s.box([bankW, base, 0.44], [0, base / 2, back + 0.25], dark);
    s.box([bankW, bankH, 0.5], [0, base + bankH / 2, back + 0.25], frame);
    s.box([bankW + 0.08, 0.07, 0.56], [0, base + bankH + 0.035, back + 0.27], frame);
    const total = cols * rows, open = new Map<number, number>();
    const heroDoor = cols + (random() < 0.5 ? 1 : 4);
    if (a.doors === 'ajar') open.set(Math.floor(random() * total), mix(0.5, 1.0, random()));
    if (a.doors === 'out') open.set(heroDoor, 1.7);
    if (a.doors === 'cleared') while (open.size < 5) open.set(Math.floor(random() * total), mix(0.8, 1.8, random()));
    const names = ['HALE', 'OKAFOR', 'UNKNOWN', 'LINDQVIST', 'MORROW', 'PARDO', 'IWATA', 'HOLD', 'ABARA', 'QUILL'];
    const cards = [0, 1, 2, 3].map(() => card([names[Math.floor(random() * names.length)], `${10 + Math.floor(random() * 80)}-${100 + Math.floor(random() * 899)}`], mood.wear > 0.6 ? '#e2d8b8' : '#f6f4e8', '#20262b'));
    const slab = new THREE.BoxGeometry(dw - 0.07, dh - 0.07, 0.06), inset = new THREE.BoxGeometry(dw - 0.24, dh - 0.24, 0.02);
    const lever = new THREE.BoxGeometry(0.3, 0.05, 0.04), plate = new THREE.BoxGeometry(0.07, 0.18, 0.03), holder = new THREE.BoxGeometry(0.27, 0.14, 0.012), cardFace = new THREE.PlaneGeometry(0.24, 0.115);
    for (let n = 0; n < total; n++) {
      const col = n % cols, row = Math.floor(n / cols);
      const cx = (col - (cols - 1) / 2) * dw, cy = base + 0.07 + dh / 2 + row * dh, angle = open.get(n) ?? 0;
      const hinge = new THREE.Group();
      hinge.position.set(cx - dw / 2 + 0.035, cy, front);
      hinge.rotation.y = -angle;
      s.root.add(hinge);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x + dw / 2 - 0.035, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        hinge.add(mesh);
        return mesh;
      };
      add(slab, doorPaint, 0, 0, 0.03);
      add(inset, panelPaint, 0, 0, 0.068);
      add(plate, hardware, dw / 2 - 0.12, -0.02, 0.085);
      add(lever, hardware, dw / 2 - 0.235, -0.02, 0.13);
      add(holder, hardware, -0.08, 0.15, 0.082);
      if (random() < a.occupancy * 1.05 - 0.02) add(cardFace, cards[Math.floor(random() * cards.length)], -0.08, 0.15, 0.09).rotation.z = (random() - 0.5) * mood.wear * 0.2;
      if (mood.wear > 0.5 && random() < mood.wear * 0.5) add(new THREE.BoxGeometry(0.04 + random() * 0.04, 0.12 + random() * 0.2, 0.004), s.material('#7d4a2c', { roughness: 0.95 }), dw / 2 - 0.2 + random() * 0.1, -0.2, 0.063);
      if (angle > 0) s.box([dw - 0.12, dh - 0.12, 0.01], [cx, cy, front + 0.003], dark);
      if (n === heroDoor && a.doors === 'out') {
        const ty = cy - dh / 2 + 0.14, tw = dw - 0.2, tz = front + 0.55;
        s.box([tw, 0.03, 1.9], [cx, ty, tz], steel);
        for (const side of [-1, 1]) s.box([0.02, 0.06, 1.9], [cx + side * tw / 2, ty + 0.02, tz], steel);
        const sheet = s.mesh(shroud(1.74, tw - 0.03, mix(0.9, 1.15, random()), random), new THREE.MeshStandardMaterial({ color: '#f3f4ef', roughness: 0.92, side: THREE.DoubleSide }), [cx, ty + 0.016, tz + 0.05]);
        sheet.rotation.y = -Math.PI / 2;
        const tag = s.mesh(new THREE.PlaneGeometry(0.09, 0.14), new THREE.MeshStandardMaterial({ color: '#e8d9ae', roughness: 0.9, side: THREE.DoubleSide }), [cx + 0.12, ty + 0.1, tz + 0.96]);
        tag.rotation.set(-0.15, 0.2, 0.25);
      }
    }
    if (open.size && mood.warmth < 0.65) {
      const mist = new THREE.MeshStandardMaterial({ color: '#f1f8f9', transparent: true, opacity: 0.12, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 7; i++) s.ball([0.5 + random() * 0.5, 0.09, 0.4 + random() * 0.3], [(random() - 0.5) * bankW, 0.09, front + 0.3 + random() * 0.8], mist, 12).castShadow = false;
    }
    // Refrigeration plant above the bank, with a temperature readout.
    const topY = base + bankH + 0.07;
    s.box([1.5, 0.34, 0.4], [-1.3, topY + 0.17, back + 0.25], frame);
    for (let i = 0; i < 8; i++) s.box([0.9, 0.012, 0.01], [-1.5, topY + 0.06 + i * 0.03, back + 0.455], dark);
    s.box([0.34, 0.16, 0.02], [-0.78, topY + 0.2, back + 0.455], dark);
    const readout = s.label(`${Math.round(mix(1, 6, mood.warmth))}°C`, 0.3, 0.12, [-0.78, topY + 0.2, back + 0.468], '#5cff9a', '#07130c');
    (readout.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#2a8a52');
    s.tube([[-0.55, topY + 0.2, back + 0.2], [0.5, topY + 0.34, back + 0.12], [2.3, topY + 0.3, back + 0.12], [2.75, topY + 0.9, back + 0.1], [2.75, wallH, back + 0.1]], 0.04, steel);

    // The frosted window, high on the right.
    const windowTint = { day: '#eef6f6', night: '#3d5578', dawn: '#f3c58a', blind: '#8e948c' }[a.hour];
    const wx = 3.75, wy = 3.55;
    s.box([1.36, 1.0, 0.08], [wx, wy, back + 0.03], s.material('#f1f1ea'));
    const pane = s.box([1.2, 0.84, 0.02], [wx, wy, back + 0.075], new THREE.MeshStandardMaterial({ color: windowTint, emissive: windowTint, emissiveIntensity: a.hour === 'blind' ? 0 : a.hour === 'night' ? 0.35 : 0.85, roughness: 0.6 }));
    pane.castShadow = false;
    s.box([0.04, 0.84, 0.03], [wx, wy, back + 0.09], s.material('#f1f1ea'));
    s.box([1.2, 0.04, 0.03], [wx, wy, back + 0.09], s.material('#f1f1ea'));
    if (a.kind === 'coroner' || a.kind === 'victorian') for (let i = 0; i < 5; i++) s.rod([wx - 0.48 + i * 0.24, wy - 0.44, back + 0.12], [wx - 0.48 + i * 0.24, wy + 0.44, back + 0.12], 0.012, dark);
    if (a.hour === 'blind') for (const y of [-0.2, 0.15]) s.box([1.3, 0.2, 0.03], [wx, wy + y, back + 0.1], s.material('#8a6a45', { roughness: 0.9 })).rotation.z = y * 0.3;
    if (a.hour === 'day' || a.hour === 'dawn') {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ color: windowTint, transparent: true, opacity: 0.2, depthWrite: false }));
      shaft.rotation.x = -Math.PI / 2;
      shaft.position.set(wx - 0.7, 0.01, back + 2.6);
      shaft.rotation.z = -0.25;
      s.root.add(shaft);
    }

    // The examination lamp over the hero slot, hung from a ceiling rail.
    const lampTone = new THREE.Color('#e6f3ff').lerp(new THREE.Color('#ffe6b0'), mood.warmth);
    const power = { blazing: 1.7, dim: 0.4, flicker: 1.1, off: 0 }[a.lamp];
    const hx = 0, hz = 0.9, hy = 4.0;
    s.box([W, 0.1, 0.12], [0, wallH + 0.25, hz - 0.5], s.material('#7f8a86', { metalness: 0.3 }));
    s.rod([hx - 0.9, wallH + 0.25, hz - 0.5], [hx - 0.9, hy + 0.5, hz - 0.5], 0.035, steel);
    s.rod([hx - 0.9, hy + 0.5, hz - 0.5], [hx, hy + 0.32, hz - 0.2], 0.03, steel);
    s.rod([hx, hy + 0.32, hz - 0.2], [hx, hy + 0.05, hz], 0.025, steel);
    const head = new THREE.Group();
    head.position.set(hx, hy, hz);
    head.rotation.x = 0.5;
    s.root.add(head);
    const part = (mesh: THREE.Mesh) => { head.add(mesh); return mesh; };
    part(s.lathe([[0.001, 0.06], [0.16, 0.05], [0.42, -0.02], [0.58, -0.1], [0.6, -0.14], [0.001, -0.14]], s.material('#eceee8', { roughness: 0.35 })));
    part(s.ring(0.59, 0.016, [0, -0.13, 0], hardware)).rotation.x = Math.PI / 2;
    const bulbs: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 7; i++) {
      const r = i === 6 ? 0 : 0.37, on = power > 0 && !(a.lamp === 'flicker' && i === 2);
      const bulb = new THREE.MeshStandardMaterial({ color: on ? lampTone : '#5d676b', emissive: on ? lampTone : '#000000', emissiveIntensity: on ? power : 0, roughness: 0.2 });
      if (on) bulbs.push(bulb);
      part(s.cylinder(0.13, 0.13, 0.03, [Math.cos(i * 1.047) * r, -0.15, Math.sin(i * 1.047) * r], bulb, 18));
    }
    const beamMaterial = new THREE.MeshBasicMaterial({ color: lampTone, transparent: true, opacity: 0.11 * Math.min(1, power), depthWrite: false, side: THREE.DoubleSide });
    const poolMaterial = new THREE.MeshBasicMaterial({ color: lampTone, transparent: true, opacity: 0.34 * Math.min(1, power), depthWrite: false });
    const spot = new THREE.SpotLight(lampTone, power * 24, 9, 0.5, 0.45, 1.4);
    if (power > 0) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.1, hy - 0.2, 32, 1, true), beamMaterial);
      beam.position.set(hx, (hy - 0.2) / 2, hz + 0.25);
      s.root.add(beam);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), poolMaterial);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(hx, 0.012, hz + 0.25);
      s.root.add(pool);
      spot.position.set(hx, hy - 0.2, hz + 0.6);
      spot.target.position.set(hx, 0.8, hz);
      s.root.add(spot, spot.target);
    }

    // The working side: a steel counter with a sink on the left, a hose reel on the right.
    const cx = -3.95, cz = back + 0.42;
    s.box([1.95, 0.05, 0.75], [cx, 0.91, cz], steel);
    s.box([1.95, 0.14, 0.03], [cx, 1.0, back + 0.03], steel);
    s.box([1.85, 0.7, 0.66], [cx, 0.45, cz - 0.02], s.material(palette.frame, { metalness: palette.metal, roughness: 0.45 }));
    for (let i = 0; i < 3; i++) {
      s.box([0.57, 0.6, 0.02], [cx - 0.61 + i * 0.61, 0.46, cz + 0.32], doorPaint);
      s.box([0.2, 0.025, 0.03], [cx - 0.61 + i * 0.61, 0.68, cz + 0.345], hardware);
    }
    s.box([0.55, 0.012, 0.42], [cx + 0.55, 0.94, cz], dark);
    s.tube([[cx + 0.55, 0.93, cz - 0.28], [cx + 0.55, 1.32, cz - 0.28], [cx + 0.55, 1.4, cz - 0.2], [cx + 0.55, 1.3, cz - 0.1]], 0.02, hardware);
    s.cylinder(0.26, 0.26, 0.08, [3.0, 1.5, back + 0.08], s.material('#3f6f5c', { roughness: 0.8 }), 24).rotation.x = Math.PI / 2;
    s.cylinder(0.1, 0.1, 0.1, [3.0, 1.5, back + 0.1], steel, 16).rotation.x = Math.PI / 2;
    s.tube([[3.22, 1.4, back + 0.1], [3.3, 0.7, back + 0.14], [3.15, 0.1, back + 0.3], [2.8, 0.03, back + 0.6]], 0.022, s.material('#3f6f5c', { roughness: 0.8 }));
    // Wall clock: the hour agrees with the window.
    s.cylinder(0.26, 0.26, 0.05, [-3.6, 3.6, back + 0.03], dark, 28).rotation.x = Math.PI / 2;
    s.cylinder(0.23, 0.23, 0.052, [-3.6, 3.6, back + 0.034], s.material('#f4f3ea'), 28).rotation.x = Math.PI / 2;
    const clock = { day: 10.2, night: 3.25, dawn: 6.1, blind: 4.7 }[a.hour];
    s.box([0.02, 0.13, 0.01], [-3.6, 3.6, back + 0.065], dark).rotation.z = -(clock / 12) * Math.PI * 2;
    s.box([0.014, 0.19, 0.01], [-3.6, 3.6, back + 0.068], dark).rotation.z = -(clock % 1) * Math.PI * 2;

    // Signs of the living.
    const top = 0.935;
    if (a.left === 'flowers') {
      const jar = new THREE.MeshStandardMaterial({ color: '#dceff0', transparent: true, opacity: 0.55, roughness: 0.1 });
      s.cylinder(0.07, 0.06, 0.2, [cx - 0.6, top + 0.1, cz + 0.1], jar, 14);
      const petals = mood.cheer > 0.5 ? ['#e8c33d', '#e6719a', '#f3efe6'] : ['#f3efe6', '#d9d2e6', '#f3efe6'];
      for (let i = 0; i < 6; i++) {
        const fx = cx - 0.6 + (random() - 0.5) * 0.3, fy = top + 0.36 + random() * 0.2, fz = cz + 0.1 + (random() - 0.5) * 0.2;
        s.rod([cx - 0.6, top + 0.1, cz + 0.1], [fx, fy, fz], 0.006, s.material('#3f6b3a'));
        s.ball([0.055, 0.045, 0.055], [fx, fy, fz], s.material(petals[i % 3]), 10);
      }
    }
    if (a.left === 'shift') {
      s.box([0.34, 0.2, 0.12], [cx - 0.6, top + 0.1, cz - 0.05], s.material('#5a4634'));
      s.cylinder(0.05, 0.05, 0.012, [cx - 0.84, top + 0.11, cz + 0.012], steel, 14).rotation.x = Math.PI / 2;
      s.rod([cx - 0.62, top + 0.2, cz - 0.05], [cx - 0.5, top + 0.52, cz - 0.05], 0.004, steel);
      s.cylinder(0.045, 0.04, 0.1, [cx - 0.3, top + 0.05, cz + 0.15], s.material('#b3482c'), 14);
      s.box([0.3, 0.02, 0.22], [cx + 0.05, top + 0.01, cz + 0.18], s.material('#d9d6c6')).rotation.y = 0.2;
    }
    if (a.left === 'chair') {
      const seat = s.material('#5d6f6a', { roughness: 0.8 });
      const chairX = 2.6, chairZ = -1.6;
      s.box([0.46, 0.05, 0.44], [chairX, 0.46, chairZ], seat);
      s.box([0.46, 0.46, 0.04], [chairX, 0.78, chairZ + 0.22], seat);
      for (const x of [-0.2, 0.2]) for (const z of [-0.19, 0.19]) s.rod([chairX + x, 0, chairZ + z], [chairX + x, z > 0 ? 1.0 : 0.45, chairZ + z], 0.016, steel);
    }
    if (a.left === 'boxes') {
      const cardboard = s.material('#b89a6a', { roughness: 0.95 });
      const count = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const box = s.box([0.6, 0.42, 0.5], [4.5 - (i % 2) * 0.66, 0.21 + Math.floor(i / 2) * 0.43, back + 0.5 + (random() - 0.5) * 0.1], cardboard);
        box.rotation.y = (random() - 0.5) * 0.2;
      }
      s.cylinder(0.24, 0.2, 0.7, [4.4, 0.35, back + 1.5], s.material('#e3c53a', { roughness: 0.5 }), 18);
      s.cylinder(0.25, 0.25, 0.05, [4.4, 0.72, back + 1.5], s.material('#c9382c'), 18);
    }
    if (a.left === 'board') {
      s.box([1.4, 0.95, 0.04], [-3.95, 2.2, back + 0.03], s.material('#9aa3a5'));
      const board = s.mesh(new THREE.PlaneGeometry(1.32, 0.87), card(['DOOR  NAME      IN', '  3   HALE     02:10', '  7   UNKNOWN  04:45', ' 11   MORROW   --:--'], '#f6f7f2', '#243a6a'), [-3.95, 2.2, back + 0.055]);
      board.castShadow = false;
    }
    // Density: trolleys of supplies parked along the right.
    if (mood.density > 0.55) {
      const tx = 4.45, tz = 1.6;
      s.box([0.6, 0.03, 0.9], [tx, 0.85, tz], steel);
      s.box([0.6, 0.03, 0.9], [tx, 0.3, tz], steel);
      for (const x of [-0.27, 0.27]) for (const z of [-0.42, 0.42]) s.rod([tx + x, 0.06, tz + z], [tx + x, 0.86, tz + z], 0.014, steel);
      for (let i = 0; i < 4; i++) s.cylinder(0.06, 0.06, 0.16 + random() * 0.12, [tx + (random() - 0.5) * 0.36, 0.95, tz + (i - 1.5) * 0.2], s.material(['#e9e9e2', '#7fb3a6', '#c9382c', '#d9c96a'][i]), 12);
    }

    const base0 = bulbs.map((bulb) => bulb.emissiveIntensity), spot0 = spot.intensity, beam0 = beamMaterial.opacity, pool0 = poolMaterial.opacity;
    const rate = mix(5, 20, mood.energy);
    world.update = (_dt, time) => {
      if (a.lamp !== 'flicker') return;
      const level = Math.sin(time * rate) * Math.sin(time * rate * 0.31 + 2) > -0.3 ? 1 : 0.15;
      bulbs.forEach((bulb, index) => { bulb.emissiveIntensity = base0[index] * level; });
      spot.intensity = spot0 * level;
      beamMaterial.opacity = beam0 * level;
      poolMaterial.opacity = pool0 * level;
    };
    return world;
  },
});
