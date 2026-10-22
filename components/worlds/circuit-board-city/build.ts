import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type XZ = [number, number];
const MASKS = {
  green: { mask: '#1f6d3e', trace: '#33955a', silk: '#f2f2e6', edge: '#b3a560', pad: '#cfd2cc' },
  blue: { mask: '#1e4590', trace: '#3668c2', silk: '#ffffff', edge: '#b3a560', pad: '#cfd2cc' },
  tan: { mask: '#b98e52', trace: '#b5633a', silk: '#2d2a24', edge: '#8d6938', pad: '#d2d4cf' },
  black: { mask: '#2a2e31', trace: '#3f464b', silk: '#f5f5f5', edge: '#6e684c', pad: '#d6b65c' },
  red: { mask: '#a32429', trace: '#cb4543', silk: '#ffffff', edge: '#b3a560', pad: '#d6b65c' },
  purple: { mask: '#4a2a80', trace: '#6a45ab', silk: '#ffffff', edge: '#b3a560', pad: '#d6b65c' },
} as const;

const offsetPath = (points: readonly XZ[], distance: number): XZ[] => points.map((point, index) => {
  const normal = (from: XZ, to: XZ): XZ => {
    const dx = to[0] - from[0], dz = to[1] - from[1], length = Math.hypot(dx, dz) || 1;
    return [-dz / length, dx / length];
  };
  const before = index > 0 ? normal(points[index - 1], point) : normal(point, points[index + 1]);
  const after = index < points.length - 1 ? normal(point, points[index + 1]) : before;
  const k = 1 + before[0] * after[0] + before[1] * after[1];
  return [point[0] + (before[0] + after[0]) / k * distance, point[1] + (before[1] + after[1]) / k * distance];
});

export default defineWorld({
  questions: {
    era: choice('What generation of machine is this board from?', {
      dip: 'The 1970s and 80s: ranks of long black DIP chips like slab office blocks, fat can capacitors, everything big enough to read.',
      pc: 'A 1990s desktop motherboard: long expansion slots like terraces, memory sticks standing on edge like towers, a finned heat sink and clustered capacitors.',
      smd: 'A modern board: low, dense and anonymous, flat square chips, tin shield cans like warehouses and fields of parts too small to name.',
    }),
    mask: choice('What colour is the board?', {
      green: 'Classic glossy green, the colour of every machine ever opened.',
      blue: 'Deep blue with white lettering.',
      tan: 'Bare tan phenolic with fat copper tracks, cheap and old.',
      black: 'Matte black with gold pads, secretive and expensive.',
      red: 'Bright hobbyist red.',
      purple: 'Purple with gold, a small-batch board made by an enthusiast.',
    }),
    light: choice('What light is it seen in?', {
      bench: 'Open on a repair bench under a bright white lamp.',
      dusk: 'A violet dusk inside the half-open case, where the status LEDs glow like lit windows.',
      sealed: 'The cool grey gloom inside a closed case, lit mostly by its own indicators.',
      window: 'Held near a window in warm low sunlight that rakes long shadows across the parts.',
    }),
    state: choice('What is the state of the machine?', {
      running: 'Running. Indicators lit, everything doing its job unobserved.',
      dead: 'Dead and dark, with dust drifted against the components and a cobweb between the tallest parts.',
      repair: 'On the bench mid-repair: a giant soldering iron tip rests on a joint and one chip has been lifted off its pads.',
      burnt: 'Mostly working, but one district is scorched black around a part that burnt out, and a red fault light is on.',
    }),
    edge: choice('What runs along the far left edge of the board?', {
      ports: 'A row of metal connector shells like dockside warehouses.',
      headers: 'A long fence of gold pin headers.',
      terminals: 'Green screw terminal blocks.',
      fingers: 'Gold edge-connector fingers, for a board that plugs into something larger.',
    }),
    legend: choice('What is lettered across the open ground at the front?', {
      model: 'MAIN LOGIC BD / REV C 1987',
      warning: 'NO USER SERVICEABLE / PARTS INSIDE',
      origin: 'MADE IN TAIWAN / 94V-0  E89382',
      names: 'DESIGNED BY / K.M.  J.S.  & RITA',
      test: 'TESTED OK / QC 07',
    }),
    pulses: noul('Can signals be seen travelling along the traces as points of light, like traffic?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const tone = MASKS[a.mask];
    const dusk = a.light === 'dusk', dim = dusk || a.light === 'sealed';
    const background = { bench: '#e4e5da', dusk: '#a39cb8', sealed: '#8f99a3', window: '#eadfc8' }[a.light];
    const slots: [number, number][] = [[0, 1.2], [-3.9, -1.2], [3.9, -1.2], [-3.4, 3.4], [3.4, 3.4]];
    const { art: s, world } = diorama(context, { background, floor: tone.mask, width: 14, depth: 11, maxHeight: 3, radius: 1.4, pitch: 23, yaw: 30, slots });
    const { root } = s;
    const powered = a.state !== 'dead';

    // Lighting for the chosen hour.
    for (const child of root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) {
        hemi.intensity = { bench: 1.45, dusk: 0.95, sealed: 0.9, window: 1.15 }[a.light];
        hemi.color.set({ bench: '#f1f2ff', dusk: '#c2b8f0', sealed: '#b9c8dc', window: '#fff1d6' }[a.light]);
      }
    }
    const key = world.keyLight!;
    key.intensity = { bench: 2.8, dusk: 1.9, sealed: 1.4, window: 3.0 }[a.light];
    if (dusk) key.color.set('#ffc49a'); else if (a.light === 'window') key.color.set('#ffdca8'); else if (a.light === 'sealed') key.color.set('#cfe0f5');
    const glow = (dim ? 1 : 0.55) * (powered ? 1 : 0);

    // ---- Ground: the painted board ----
    const ringRoad: XZ[] = [[-7.2, 1.2], [-2.9, 1.2], [-1.25, -0.45], [1.25, -0.45], [2.9, 1.2], [7.2, 1.2]];
    const spine: XZ[] = [[-0.5, -5.7], [-0.5, -2.7], [0.1, -2.1], [0.1, -0.6]];
    const west: XZ[] = [[-7.2, 2.5], [-5.9, 2.5], [-5.0, 3.4], [-4.8, 3.4]];
    const east: XZ[] = [[7.2, -3.0], [5.6, -3.0], [4.9, -2.3], [4.9, -1.8]];
    const south: XZ[] = [[-1.5, 5.7], [-1.5, 3.3], [-0.9, 2.7], [-0.9, 2.3]];
    const buses: { path: XZ[]; lanes: number }[] = [{ path: ringRoad, lanes: 7 }, { path: spine, lanes: 5 }, { path: west, lanes: 3 }, { path: east, lanes: 4 }, { path: south, lanes: 3 }];
    const lanePaths: XZ[][] = [];
    for (const bus of buses) for (let lane = 0; lane < bus.lanes; lane++) lanePaths.push(offsetPath(bus.path, -lane * 0.15));
    const refs = ['U1', 'C7', 'F1', 'D3', 'BT1'];
    const burnAt: XZ = [-2.3, -3.55];
    const liftAt: XZ = [3.0, -3.5];
    const legend = { model: ['MAIN LOGIC BD', 'REV C 1987'], warning: ['NO USER SERVICEABLE', 'PARTS INSIDE'], origin: ['MADE IN TAIWAN', '94V-0  E89382'], names: ['DESIGNED BY', 'K.M.  J.S.  & RITA'], test: ['TESTED OK', 'QC 07'] }[a.legend];
    const ledSpots: { x: number; z: number; colour: string; name: string }[] = [
      { x: 2.3, z: 5.12, colour: '#2dea4a', name: 'PWR' }, { x: 3.0, z: 5.12, colour: '#ffa218', name: 'HDD' },
      { x: 3.7, z: 5.12, colour: '#2dea4a', name: 'LNK' }, { x: 4.4, z: 5.12, colour: '#ff2a1e', name: 'ERR' },
      { x: -5.3, z: 5.05, colour: '#2a6bff', name: 'RX' }, { x: -4.6, z: 5.05, colour: '#2a6bff', name: 'TX' },
      { x: 1.9, z: -3.1, colour: '#ffa218', name: '' }, { x: -4.9, z: -2.9, colour: '#2dea4a', name: '' }, { x: 5.9, z: 0.3, colour: '#2dea4a', name: '' },
    ];

    const ppu = 128;
    const canvas = document.createElement('canvas');
    canvas.width = 14 * ppu; canvas.height = 11 * ppu;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ppu, ppu);
    ctx.translate(7, 5.5);
    ctx.fillStyle = tone.mask;
    ctx.fillRect(-7, -5.5, 14, 11);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // A ground pour under the back blocks, slightly lighter, like a paved plaza.
    ctx.fillStyle = tone.trace; ctx.globalAlpha = 0.35;
    ctx.fillRect(-6.9, -5.4, 13.8, 2.3);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = tone.trace;
    // Side streets: short dog-legged tracks and their vias.
    const vias: XZ[] = [];
    for (let k = 0; k < 46; k++) {
      const x = (random() - 0.5) * 13, z = (random() - 0.5) * 10, run = 0.4 + random() * 1.4, slide = (random() < 0.5 ? -1 : 1) * (0.2 + random() * 0.6);
      const along = random() < 0.5;
      ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(x, z);
      if (along) { ctx.lineTo(x + run, z); ctx.lineTo(x + run + Math.abs(slide), z + slide); ctx.lineTo(x + run + Math.abs(slide) + run * 0.6, z + slide); vias.push([x, z], [x + run * 1.6 + Math.abs(slide), z + slide]); }
      else { ctx.lineTo(x, z + run); ctx.lineTo(x + slide, z + run + Math.abs(slide)); ctx.lineTo(x + slide, z + run * 1.6 + Math.abs(slide)); vias.push([x, z], [x + slide, z + run * 1.6 + Math.abs(slide)]); }
      ctx.stroke();
    }
    // Avenues.
    ctx.lineWidth = 0.075;
    for (const lane of lanePaths) {
      ctx.beginPath();
      lane.forEach(([x, z], index) => (index ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
      ctx.stroke();
      vias.push(lane[lane.length - 1]);
    }
    // Building lots: a silkscreen outline, a reference and two rows of pads with tracks leaving them.
    slots.forEach(([x, z], index) => {
      const half = 1.45;
      ctx.strokeStyle = tone.trace; ctx.lineWidth = 0.06;
      for (let pad = 0; pad < 8; pad++) for (const side of [-1, 1]) {
        const px = x - half + 0.25 + pad * 0.38, pz = z + side * (half + 0.12), slide = (random() < 0.5 ? -1 : 1) * (0.15 + random() * 0.4);
        ctx.beginPath(); ctx.moveTo(px, pz); ctx.lineTo(px, pz + side * 0.25); ctx.lineTo(px + slide, pz + side * (0.25 + Math.abs(slide))); ctx.stroke();
      }
      ctx.fillStyle = tone.pad;
      for (let pad = 0; pad < 8; pad++) for (const side of [-1, 1]) ctx.fillRect(x - half + 0.25 + pad * 0.38 - 0.09, z + side * (half + 0.12) - 0.09, 0.18, 0.18);
      ctx.strokeStyle = tone.silk; ctx.lineWidth = 0.045;
      ctx.strokeRect(x - half, z - half, half * 2, half * 2);
      ctx.beginPath(); ctx.arc(x - half, z, 0.2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = tone.silk;
      ctx.font = 'bold 0.36px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(refs[index], x - half + 0.02, z - half - 0.08);
    });
    // Manholes.
    for (const [x, z] of vias) {
      ctx.fillStyle = tone.pad; ctx.beginPath(); ctx.arc(x, z, 0.085, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#101612'; ctx.beginPath(); ctx.arc(x, z, 0.04, 0, Math.PI * 2); ctx.fill();
    }
    // Street markings.
    ctx.fillStyle = tone.silk; ctx.strokeStyle = tone.silk;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 0.4px monospace';
    ctx.fillText(legend[0], 0.3, 3.75, 3.5);
    ctx.font = 'bold 0.32px monospace';
    ctx.fillText(legend[1], 0.3, 4.25, 3.5);
    ctx.font = 'bold 0.2px monospace';
    for (const led of ledSpots) if (led.name) ctx.fillText(led.name, led.x, led.z - 0.36);
    for (const [text, x, z] of [['J1', -5.4, -0.4], ['+5V', 5.9, 2.2], ['GND', 5.9, 2.5], ['A0-A15', -3.9, 1.5], ['D0-D7', 2.2, -2.45], ['TP3', -1.9, 4.9], ['CLK', 0.9, -2.9]] as const) ctx.fillText(text, x, z);
    ctx.lineWidth = 0.04;
    for (const [x, z] of [[-6.5, -5.1], [6.5, 4.0], [-6.5, 4.9]] as const) { ctx.beginPath(); ctx.arc(x, z, 0.16, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, z, 0.06, 0, Math.PI * 2); ctx.fill(); }
    // A white barcode label.
    ctx.fillStyle = '#f0eee6'; ctx.fillRect(-0.4, 4.65, 1.6, 0.5);
    ctx.fillStyle = '#16181a';
    for (let bar = 0; bar < 30; bar++) if (random() < 0.6) ctx.fillRect(-0.32 + bar * 0.048, 4.72, 0.02 + random() * 0.02, 0.36);
    // The corner mounting hole.
    ctx.fillStyle = tone.pad; ctx.beginPath(); ctx.arc(6.2, 4.75, 0.5, 0, Math.PI * 2); ctx.fill();
    if (a.edge === 'fingers') {
      ctx.fillStyle = '#d6b65c';
      for (let finger = 0; finger < 26; finger++) ctx.fillRect(-7, -1.6 + finger * 0.24, 0.95, 0.16);
    }
    if (a.state === 'burnt') {
      const burn = ctx.createRadialGradient(burnAt[0], burnAt[1], 0.2, burnAt[0], burnAt[1], 2.3);
      burn.addColorStop(0, 'rgba(8,6,4,1)'); burn.addColorStop(0.45, 'rgba(35,22,10,0.92)'); burn.addColorStop(1, 'rgba(70,45,20,0)');
      ctx.fillStyle = burn; ctx.fillRect(-7, -5.5, 9, 5);
    }
    if (a.state === 'repair') {
      ctx.fillStyle = tone.pad;
      for (let pad = 0; pad < 7; pad++) for (const side of [-1, 1]) ctx.fillRect(liftAt[0] - 0.75 + pad * 0.25 - 0.07, liftAt[1] + side * 0.42 - 0.1, 0.14, 0.2);
      ctx.strokeStyle = tone.silk; ctx.lineWidth = 0.04; ctx.strokeRect(liftAt[0] - 0.9, liftAt[1] - 0.25, 1.8, 0.5);
      const flux = ctx.createRadialGradient(liftAt[0], liftAt[1], 0.2, liftAt[0], liftAt[1], 1.3);
      flux.addColorStop(0, 'rgba(200,150,50,0.5)'); flux.addColorStop(1, 'rgba(200,150,50,0)');
      ctx.fillStyle = flux; ctx.fillRect(liftAt[0] - 1.4, liftAt[1] - 1.4, 2.8, 2.8);
    }
    // Dust and grime by wear, heavier on a dead board.
    const grime = Math.min(1, mood.wear + (a.state === 'dead' ? 0.35 : 0));
    ctx.fillStyle = `rgba(214,208,190,${0.12 + grime * 0.4})`;
    for (let speck = 0; speck < grime * 2600; speck++) ctx.fillRect((random() - 0.5) * 14, (random() - 0.5) * 11, 0.015 + random() * 0.04, 0.015 + random() * 0.03);
    for (let stain = 0; stain < grime * 14; stain++) {
      const x = (random() - 0.5) * 14, z = (random() - 0.5) * 11, r = 0.4 + random() * 1.2;
      const patch = ctx.createRadialGradient(x, z, 0, x, z, r);
      patch.addColorStop(0, `rgba(120,100,70,${0.22 * grime})`); patch.addColorStop(1, 'rgba(120,100,70,0)');
      ctx.fillStyle = patch; ctx.fillRect(x - r, z - r, r * 2, r * 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const ground = world.ground as THREE.Mesh;
    (ground.material as THREE.Material).dispose();
    const edge = s.material(tone.edge, { roughness: 0.8 });
    ground.material = [edge, edge, new THREE.MeshStandardMaterial({ map, roughness: 0.5 + grime * 0.35, metalness: 0.04 }), edge, edge, edge];

    // ---- Shared materials and instanced parts ----
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const at = (position: readonly [number, number, number], size: readonly [number, number, number], turn = 0) =>
      new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(...size));
    const many = (matrices: THREE.Matrix4[], material: THREE.Material, geometry: THREE.BufferGeometry = unit) => {
      if (!matrices.length) return null;
      const mesh = new THREE.InstancedMesh(geometry === unit ? unit.clone() : geometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.32 });
    const gold = s.material('#d6b65c', { metalness: 0.85, roughness: 0.3 });
    const epoxy = s.material('#1d1e21', { roughness: 0.55 });
    const alu = s.material('#c4c8ca', { metalness: 0.8, roughness: 0.38 });
    const legs: THREE.Matrix4[] = [], blocks: THREE.Matrix4[] = [], passives: THREE.Matrix4[] = [], passiveEnds: THREE.Matrix4[] = [];
    const chipTop = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const g = c.getContext('2d')!;
      g.fillStyle = '#1d1e21'; g.fillRect(0, 0, 512, 128);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(0, 64, 20, -Math.PI / 2, Math.PI / 2); g.fill();
      g.fillStyle = '#c9cac6'; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.font = 'bold 40px monospace'; g.fillText(['MC68000P8', 'D8086-2', 'HM6264LP', 'SN74LS245N'][Math.floor(random() * 4)], 270, 44, 420);
      g.font = '30px monospace'; g.fillText(`${8200 + Math.floor(random() * 900)}  MALAYSIA`, 270, 92, 420);
      const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 });
    })();
    const tops: THREE.Matrix4[] = [];
    /** A DIP block lying along x (or z when turned), on its legs. */
    const chip = (x: number, z: number, length: number, width: number, turned = false, lift = 0.14) => {
      const turn = turned ? Math.PI / 2 : 0;
      blocks.push(at([x, lift + 0.21, z], [length, 0.42, width], turn));
      tops.push(new THREE.Matrix4().compose(new THREE.Vector3(x, lift + 0.425, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, turn, 0, 'YXZ')), new THREE.Vector3(length * 0.96, width * 0.86, 1)));
      const count = Math.max(4, Math.round(length / 0.3));
      for (let pin = 0; pin < count; pin++) for (const side of [-1, 1]) {
        const along = -length / 2 + (pin + 0.5) * (length / count), across = side * (width / 2 + 0.05);
        legs.push(at(turned ? [x + across, (lift + 0.25) / 2, z - along] : [x + along, (lift + 0.25) / 2, z + across], turned ? [0.035, lift + 0.25, 0.14] : [0.14, lift + 0.25, 0.035]));
      }
    };
    const SLEEVES = ['#23262b', '#1f3f8f', '#4a2f22', '#1f6a4c', '#4b2a78'];
    /** A can capacitor: water tower of the board. */
    const can = (x: number, z: number, r: number, h: number, bulged = false) => {
      const colour = SLEEVES[Math.floor(random() * SLEEVES.length)];
      s.cylinder(r, r, h, [x, h / 2 + 0.05, z], s.material(colour, { roughness: 0.4 }), 20);
      const stripe = s.mesh(new THREE.CylinderGeometry(r * 1.012, r * 1.012, h * 0.9, 6, 1, true, 0.5 + random() * 0.8, 0.55), s.material('#c9ccd2', { roughness: 0.5 }), [x, h / 2 + 0.05, z]);
      void stripe;
      s.cylinder(r * 0.86, r * 0.86, 0.03, [x, h + 0.06, z], alu, 20);
      if (bulged) s.ball([r * 0.84, r * 0.3, r * 0.84], [x, h + 0.06, z], alu, 16);
      s.box([r * 1.4, 0.012, 0.03], [x, h + 0.08 + (bulged ? r * 0.3 : 0), z], epoxy);
      s.box([0.03, 0.012, r * 1.4], [x, h + 0.08 + (bulged ? r * 0.3 : 0), z], epoxy);
    };
    const passive = (x: number, z: number, size: number, turn: number) => {
      passives.push(at([x, 0.035 * size, z], [0.2 * size, 0.07 * size, 0.12 * size], turn));
      passiveEnds.push(at([x, 0.036 * size, z], [0.27 * size, 0.06 * size, 0.125 * size], turn));
    };
    const clearOfLots = (x: number, z: number, margin = 1.75) => slots.every(([sx, sz]) => Math.abs(x - sx) > margin || Math.abs(z - sz) > margin);

    // ---- Skyline by era ----
    const failing = a.state === 'burnt' || mood.wear > 0.75;
    if (a.era === 'dip') {
      chip(-4.4, -4.65, 2.7, 0.55); chip(-1.3, -4.65, 2.7, 0.55); chip(2.3, -4.6, 3.6, 1.05); chip(5.6, -4.65, 1.9, 0.55);
      chip(-2.3, -3.55, 1.5, 0.5); chip(0.6, -3.5, 1.5, 0.5); if (a.state !== 'repair') chip(liftAt[0], liftAt[1], 1.8, 0.5);
      can(-6.2, -4.6, 0.52, 2.7, failing); can(-6.1, -3.4, 0.36, 1.6); can(6.35, -3.7, 0.42, 2.1); can(4.6, -3.55, 0.3, 1.2);
      // A rank of axial resistors and a crystal can.
      const tan = s.material('#d8c69a', { roughness: 0.6 });
      for (let k = 0; k < 6; k++) {
        const z = -1.9 + k * 0.42;
        const barrel = s.cylinder(0.11, 0.11, 0.62, [6.25, 0.2, z], tan, 10); barrel.rotation.z = Math.PI / 2;
        s.rod([5.75, 0.2, z], [6.75, 0.2, z], 0.025, tin);
        for (let band = 0; band < 3; band++) { const ring = s.cylinder(0.115, 0.115, 0.06, [6.08 + band * 0.14, 0.2, z], s.material(['#7a4a22', '#c22f2f', '#e08a1e', '#2a4fb0', '#111'][Math.floor(random() * 5)]), 10); ring.rotation.z = Math.PI / 2; }
      }
      s.box([0.95, 0.42, 0.4], [-4.3, 0.26, -3.5], alu);
    } else if (a.era === 'pc') {
      const shells = ['#ece8dc', '#5a3a24', '#17181b'];
      for (let k = 0; k < 3; k++) {
        const z = -5.05 + k * 0.6, colour = shells[Math.floor(random() * 3)];
        s.box([7.2, 0.6, 0.34], [1.6, 0.3, z], s.material(colour, { roughness: 0.55 }));
        s.box([6.9, 0.02, 0.09], [1.6, 0.61, z], s.material('#0c0c0d'));
        s.box([0.1, 0.02, 0.3], [0.1, 0.612, z], s.material(colour));
      }
      // Memory sticks on edge, with their own little chips.
      const stick = s.material('#1f6a3a', { roughness: 0.5 });
      for (let k = 0; k < (mood.density > 0.4 ? 3 : 2); k++) {
        const x = -6.35 + k * 0.55;
        s.box([0.2, 0.3, 3.4], [x, 0.15, -3.6], s.material('#ece8dc', { roughness: 0.55 }));
        s.box([0.05, 1.5, 3.2], [x, 1.0, -3.6], stick);
        for (let c = 0; c < 6; c++) blocks.push(at([x + 0.04, 1.05, -5.0 + c * 0.55], [0.05, 0.7, 0.36]));
        for (const end of [-1, 1]) s.box([0.24, 0.9, 0.12], [x, 0.5, -3.6 + end * 1.72], s.material('#ece8dc', { roughness: 0.55 }));
      }
      const cluster: [number, number, number, number][] = [[-3.6, -4.7, 0.34, 1.7], [-2.85, -4.75, 0.34, 1.7], [-3.3, -3.95, 0.28, 1.25], [-4.3, -4.3, 0.4, 2.2], [-2.6, -3.9, 0.22, 0.9]];
      cluster.forEach(([x, z, r, h], index) => can(x, z, r, h, failing && index < 2));
      // A finned heat sink over the processor.
      s.box([1.5, 0.16, 1.5], [6.05, 0.2, -1.5 - 1.5], epoxy);
      s.box([1.4, 0.2, 1.4], [6.05, 0.38, -3.0], alu);
      const fins: THREE.Matrix4[] = [];
      for (let fin = 0; fin < 9; fin++) fins.push(at([6.05 - 0.64 + fin * 0.16, 1.05, -3.0], [0.05, 1.2, 1.4]));
      many(fins, alu);
      chip(-1.2, -3.5, 1.6, 0.5);
    } else {
      const bga = s.material('#17181b', { roughness: 0.4 });
      s.box([2.3, 0.07, 2.3], [-1.6, 0.045, -4.3], s.material('#2a4a36', { roughness: 0.6 }));
      s.box([1.7, 0.2, 1.7], [-1.6, 0.17, -4.3], bga);
      s.box([1.0, 0.012, 0.5], [-1.6, 0.275, -4.3], s.material('#33363a'));
      const shield = s.material('#c8cbc8', { metalness: 0.8, roughness: 0.42 });
      for (const [x, z, w, d] of [[2.2, -4.5, 2.4, 1.5], [5.3, -4.4, 2.0, 1.7], [-5.2, -4.5, 1.8, 1.5]] as const) {
        s.box([w, 0.42, d], [x, 0.21, z], shield);
        const holes: THREE.Matrix4[] = [];
        for (let i = 0; i < Math.floor(w / 0.4); i++) for (let j = 0; j < Math.floor(d / 0.4); j++) holes.push(at([x - w / 2 + 0.3 + i * 0.4, 0.423, z - d / 2 + 0.3 + j * 0.4], [0.12, 0.01, 0.12]));
        many(holes, s.material('#5f6362', { metalness: 0.6 }));
      }
      for (const [x, z] of [[-3.6, -3.55], [-3.6, -4.6], [0.3, -3.4]] as const) { s.box([0.72, 0.6, 0.72], [x, 0.3, z], s.material('#4d5154', { roughness: 0.85 })); s.box([0.5, 0.01, 0.2], [x, 0.605, z], s.material('#c9cac6')); }
      for (const [x, z] of [[6.2, -2.9], [6.2, -2.0]] as const) { s.box([0.7, 0.08, 0.7], [x, 0.04, z], epoxy); s.cylinder(0.3, 0.3, 0.75, [x, 0.45, z], alu, 16); s.box([0.4, 0.012, 0.6], [x - 0.06, 0.83, z], epoxy); }
      for (const [x, z] of [[3.6, -3.35], [-0.2, 4.95]] as const) { if (a.state === 'repair' && z < 0) continue; s.box([0.9, 0.14, 0.9], [x, 0.09, z], bga); for (let pin = 0; pin < 8; pin++) for (const side of [-1, 1]) { legs.push(at([x - 0.39 + pin * 0.11, 0.03, z + side * 0.5], [0.05, 0.04, 0.14])); legs.push(at([x + side * 0.5, 0.03, z - 0.39 + pin * 0.11], [0.14, 0.04, 0.05])); } }
    }

    // Fields of small parts, thicker when the scene is dense.
    const sprinkle = Math.round(({ dip: 14, pc: 40, smd: 110 }[a.era]) * mix(0.5, 1.6, mood.density));
    for (let k = 0, tries = 0; k < sprinkle && tries < 2000; tries++) {
      const x = (random() - 0.5) * 12.6, z = -3 + random() * 8.1;
      if (!clearOfLots(x, z) || (x > 1.6 && z > 4.8) || (Math.abs(x) < 2 && z > 3.2) || x < -5.4) continue;
      const turn = random() < 0.5 ? 0 : Math.PI / 2, rows = a.era === 'smd' ? 1 + Math.floor(random() * 4) : 1;
      for (let r = 0; r < rows; r++) passive(x + (turn ? r * 0.22 : 0), z + (turn ? 0 : r * 0.2), a.era === 'dip' ? 1.5 : 1, turn);
      k++;
    }
    many(blocks, epoxy); many(legs, tin);
    many(tops, chipTop, new THREE.PlaneGeometry(1, 1));
    many(passives, s.material(a.era === 'dip' ? '#c98a2e' : '#1d1e21', { roughness: 0.6 })); many(passiveEnds, tin);

    // ---- The left edge ----
    if (a.edge === 'ports') {
      const shell = s.material('#c8cbc8', { metalness: 0.8, roughness: 0.4 });
      for (const [z, w, h] of [[-0.9, 1.5, 1.25], [1.0, 1.3, 0.8], [2.7, 1.2, 1.1]] as const) {
        s.box([1.3, h, w], [-6.3, h / 2, z], shell);
        s.box([0.02, h * 0.55, w * 0.7], [-5.645, h * 0.5, z], epoxy);
        s.box([1.32, 0.03, w + 0.04], [-6.3, h + 0.01, z], shell);
      }
    } else if (a.edge === 'headers') {
      s.box([0.5, 0.22, 5.4], [-6.3, 0.11, 1.4], epoxy);
      const pins: THREE.Matrix4[] = [];
      for (let pin = 0; pin < 21; pin++) for (const row of [-1, 1]) {
        if (random() < 0.04) continue;
        pins.push(at([-6.3 + row * 0.127, 0.5, -1.15 + pin * 0.254], [0.064, 1, 0.064]));
      }
      many(pins, gold);
      s.box([0.5, 0.55, 0.52], [-6.3, 0.62, -1.02 + Math.floor(random() * 18) * 0.254], s.material(['#2a56c6', '#c62f2f', '#e0c020'][Math.floor(random() * 3)], { roughness: 0.5 }));
    } else if (a.edge === 'terminals') {
      const green = s.material('#2f9a55', { roughness: 0.5 });
      for (let k = 0; k < 5; k++) {
        const z = -1.0 + k * 0.95;
        s.box([1.0, 0.95, 0.9], [-6.3, 0.475, z], green);
        const screw = s.cylinder(0.26, 0.26, 0.05, [-6.3, 0.97, z], tin, 14);
        void screw;
        s.box([0.44, 0.02, 0.07], [-6.3, 1.0, z], epoxy).rotation.y = random() * 3;
        s.box([0.02, 0.4, 0.5], [-5.795, 0.35, z], epoxy);
      }
    }

    // ---- Indicators: lamps and lit windows ----
    const lamps: { material: THREE.MeshStandardMaterial; halo: THREE.MeshBasicMaterial | null; pool: THREE.MeshBasicMaterial | null; level: number; blink: number; phase: number }[] = [];
    const poolTexture = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d')!;
      const pool = g.createRadialGradient(64, 64, 2, 64, 64, 62);
      pool.addColorStop(0, 'rgba(255,255,255,1)'); pool.addColorStop(0.4, 'rgba(255,255,255,0.4)'); pool.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = pool; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const lamp = (x: number, y: number, z: number, colour: string, on: boolean, size = 1, shape: 'dome' | 'window' = 'dome', blink = 0) => {
      const hue = new THREE.Color(colour);
      const level = on ? glow : 0;
      const material = new THREE.MeshStandardMaterial({ color: hue.clone().multiplyScalar(on ? 0.9 : 0.4), emissive: hue, emissiveIntensity: level * (dim ? 1.25 : 0.7), roughness: 0.3 });
      if (shape === 'dome') {
        s.cylinder(0.15 * size, 0.17 * size, 0.3 * size, [x, y + 0.15 * size, z], material, 14);
        s.ball([0.15 * size, 0.15 * size, 0.15 * size], [x, y + 0.3 * size, z], material, 14);
      } else s.box([0.03, 0.16 * size, 0.2 * size], [x, y, z], material);
      let halo: THREE.MeshBasicMaterial | null = null, pool: THREE.MeshBasicMaterial | null = null;
      if (on && level > 0) {
        halo = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: (dim ? 0.3 : 0.1), depthWrite: false, blending: THREE.AdditiveBlending });
        const aura = s.ball([0.42 * size, 0.42 * size, 0.42 * size], [x, y + 0.24 * size, z], halo, 14);
        aura.castShadow = aura.receiveShadow = false;
        if (shape === 'dome') {
          pool = new THREE.MeshBasicMaterial({ map: poolTexture, color: hue, transparent: true, opacity: dim ? 0.75 : 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
          const disc = s.mesh(new THREE.PlaneGeometry(2.2 * size, 2.2 * size), pool, [x, y + 0.012, z]);
          disc.rotation.x = -Math.PI / 2;
          disc.castShadow = disc.receiveShadow = false;
        }
      }
      lamps.push({ material, halo, pool, level, blink, phase: random() * 6 });
    };
    for (const led of ledSpots) {
      const isError = led.name === 'ERR';
      const on = powered && (isError ? a.state === 'burnt' || mood.cheer < 0.2 : a.state === 'burnt' ? led.name === 'PWR' || random() < 0.4 : led.name === 'PWR' || random() < 0.8);
      lamp(led.x, 0, led.z, led.colour, on, 1, 'dome', led.name === 'HDD' || led.name === 'LNK' || led.name === 'RX' || led.name === 'TX' ? 1 : isError ? 0.5 : 0);
    }
    // Lit windows on the tall parts.
    if (a.edge === 'ports') for (const z of [-1.35, -0.45, 0.75, 1.25, 2.5, 2.9]) lamp(-5.64, 0.62 + random() * 0.2, z, random() < 0.5 ? '#2dea4a' : '#ffa218', powered && random() < 0.75, 0.9, 'window', random() < 0.5 ? 1 : 0);
    if (a.era === 'pc') for (let k = 0; k < 5; k++) lamp(-5.2 + (mood.density > 0.4 ? 0 : -0.55) + 0.03, 0.5 + random() * 0.9, -5.0 + random() * 2.8, '#ffd27a', powered && random() < 0.7, 0.8, 'window');
    if (a.era === 'smd') for (let k = 0; k < 6; k++) lamp(-4.9 + random() * 10, 0.02, -3.1 - random() * 0.1 + (k % 2) * 6.2, ['#2dea4a', '#2a6bff', '#ffa218'][k % 3], powered && random() < 0.7, 0.45, 'dome', k % 2);

    // ---- A screw in the corner hole ----
    s.cylinder(0.36, 0.4, 0.14, [6.2, 0.07, 4.75], alu, 18);
    s.box([0.5, 0.03, 0.08], [6.2, 0.15, 4.75], epoxy).rotation.y = random() * 3;
    s.box([0.08, 0.03, 0.5], [6.2, 0.15, 4.75], epoxy).rotation.y = 0;

    // ---- What happened here ----
    if (a.state === 'dead' || mood.wear > 0.7) {
      const drifts: THREE.Matrix4[] = [];
      const count = Math.round(mix(60, 170, mood.wear));
      for (let k = 0; k < count; k++) {
        const back = random() < 0.7;
        const x = back ? (random() - 0.5) * 13 : -5.6 + random() * 0.5, z = back ? -3.0 - random() * 2.3 : -1.5 + random() * 5, size = 0.07 + random() * 0.17;
        drifts.push(at([x, 0.01, z], [size * 1.8, size * 0.3, size], random() * 3));
      }
      many(drifts, s.material('#aaa69a', { roughness: 1 }), new THREE.SphereGeometry(1, 8, 6));
    }
    if (a.state === 'dead') {
      const silk = new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 1, transparent: true, opacity: 0.75 });
      const peak: [number, number, number] = a.era === 'smd' ? [6.2, 0.85, -2.9] : [-6.15, a.era === 'pc' ? 1.75 : 2.7, -4.5];
      for (let k = 0; k < 6; k++) s.rod(peak, [peak[0] + (peak[0] > 0 ? -1 : 1) * (0.6 + k * 0.45), 0.02, peak[2] + 0.6 + k * 0.35], 0.014, silk);
      for (let k = 1; k < 5; k++) s.rod([peak[0] + (peak[0] > 0 ? -1 : 1) * k * 0.3, peak[1] * (1 - k * 0.2), peak[2] + 0.5 + k * 0.1], [peak[0] + (peak[0] > 0 ? -1 : 1) * k * 0.42, peak[1] * (1 - k * 0.21), peak[2] + 0.2 + k * 0.5], 0.012, silk);
    } else if (a.state === 'repair') {
      // The lifted chip, the iron and a curl of solder.
      const lifted = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 0.5), epoxy);
      lifted.position.set(liftAt[0] - 1.2, 0.34, liftAt[1] - 0.95); lifted.rotation.set(0.12, 0.5, 0.2); lifted.castShadow = true; root.add(lifted);
      const tip: [number, number, number] = [liftAt[0] + 0.7, 0.06, liftAt[1] + 0.35];
      const dir = new THREE.Vector3(0.36, 0.86, -0.3).normalize();
      const along = (distance: number): [number, number, number] => [tip[0] + dir.x * distance, tip[1] + dir.y * distance, tip[2] + dir.z * distance];
      s.rod(tip, along(0.9), 0.03, s.material('#b9bcbd', { metalness: 0.9, roughness: 0.25 }), 0.13);
      s.rod(along(0.9), along(2.2), 0.13, s.material('#8a8d8e', { metalness: 0.8, roughness: 0.4 }));
      s.rod(along(2.2), along(2.5), 0.24, s.material('#3a3c40', { roughness: 0.5 }), 0.3);
      s.rod(along(2.5), along(4.3), 0.3, s.material(mood.warmth > 0.5 ? '#d9772a' : '#2a62b4', { roughness: 0.6 }), 0.34);
      s.ball([0.12, 0.08, 0.12], tip, s.material('#e3e5e4', { metalness: 0.95, roughness: 0.12 }), 12);
      const coil: [number, number, number][] = [];
      for (let k = 0; k <= 30; k++) { const t = k / 30; coil.push([tip[0] - 0.3 - t * 1.6 + Math.sin(t * 9) * 0.25, 0.05 + Math.sin(t * Math.PI) * 0.5, tip[2] + 0.4 + t * 1.3 + Math.cos(t * 9) * 0.25]); }
      s.tube(coil, 0.028, s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 }));
    } else if (a.state === 'burnt') {
      const char = s.material('#0e0d0c', { roughness: 1 });
      s.box([1.5, 0.36, 0.5], [burnAt[0], 0.3, burnAt[1]], char).rotation.set(0.05, 0.08, 0.12);
      s.ball([0.4, 0.2, 0.28], [burnAt[0] + 0.1, 0.5, burnAt[1]], char, 10);
      const soot: THREE.Matrix4[] = [];
      for (let k = 0; k < 40; k++) { const angle = random() * Math.PI * 2, reach = 0.4 + random() * 1.6; soot.push(at([burnAt[0] + Math.cos(angle) * reach, 0.02, burnAt[1] + Math.sin(angle) * reach * 0.7], [0.05 + random() * 0.12, 0.03, 0.05 + random() * 0.1], random() * 3)); }
      many(soot, char);
    }

    // ---- Traffic: points of light running the avenues ----
    const cars: { path: XZ[]; lengths: number[]; total: number; offset: number; speed: number }[] = [];
    let traffic: THREE.InstancedMesh | null = null;
    if (a.pulses && powered) {
      const count = Math.round(mix(8, 30, mood.energy));
      for (let k = 0; k < count; k++) {
        const path = lanePaths[Math.floor(random() * (k % 3 ? 7 : lanePaths.length))];
        const lengths = path.slice(1).map((point, index) => Math.hypot(point[0] - path[index][0], point[1] - path[index][1]));
        cars.push({ path, lengths, total: lengths.reduce((sum, length) => sum + length, 0), offset: random(), speed: (0.35 + random() * 0.5) * (random() < 0.5 ? 1 : -1) });
      }
      const hue = new THREE.Color().setHSL(mix(0.52, 0.11, mood.warmth), 1, 0.62);
      traffic = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: dim ? 2.4 : 1.3 }), cars.length);
      traffic.castShadow = false;
      root.add(traffic);
    }
    const matrix = new THREE.Matrix4();
    const drive = (time: number) => {
      if (!traffic) return;
      const pace = mix(0.25, 1.6, mood.energy);
      cars.forEach((car, index) => {
        let distance = ((((car.offset + time * car.speed * pace / car.total) % 1) + 1) % 1) * car.total;
        let segment = 0;
        while (segment < car.lengths.length - 1 && distance > car.lengths[segment]) distance -= car.lengths[segment++];
        const from = car.path[segment], to = car.path[segment + 1], t = distance / (car.lengths[segment] || 1);
        matrix.makeTranslation(from[0] + (to[0] - from[0]) * t, 0.07, from[1] + (to[1] - from[1]) * t);
        traffic!.setMatrixAt(index, matrix);
      });
      traffic.instanceMatrix.needsUpdate = true;
    };
    drive(0);

    // Fly lower and closer than the stock stage: the board should run to the edges of the frame.
    const stage = world.place.bind(world);
    world.place = (items) => {
      stage(items);
      const camera = world.camera as THREE.OrthographicCamera;
      const zoom = 0.84;
      camera.left *= zoom; camera.right *= zoom; camera.top *= zoom; camera.bottom *= zoom;
      camera.translateY(-camera.top * 0.06);
      camera.updateProjectionMatrix();
    };

    const base = lamps.map((item) => ({ emissive: item.material.emissiveIntensity, halo: item.halo?.opacity ?? 0, pool: item.pool?.opacity ?? 0 }));
    const rate = mix(1.5, 9, mood.energy);
    world.update = (_dt, time) => {
      drive(time);
      lamps.forEach((item, index) => {
        if (!item.blink || !item.level) return;
        const level = item.blink === 1 ? (Math.sin(time * rate + item.phase) + Math.sin(time * rate * 2.7 + item.phase * 2) > -0.6 ? 1 : 0.08) : (Math.sin(time * 3 + item.phase) > -0.5 ? 1 : 0.1);
        item.material.emissiveIntensity = base[index].emissive * level;
        if (item.halo) item.halo.opacity = base[index].halo * level;
        if (item.pool) item.pool.opacity = base[index].pool * level;
      });
    };
    return world;
  },
});
