import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const CARGO = {
  rock: 'Raw grey ore rubble, the everyday run.',
  ice: 'Sawn blocks of blue-white ice.',
  nuggets: 'Bright metal nuggets, a load worth guarding.',
  scrap: 'Salvaged scrap: pipes, plates and a bent panel.',
  glow: 'Green-glowing hot ore hauled by somebody desperate.',
  crates: 'Supply crates and water drums instead of ore: a grocery run.',
} as const;
const PAINTS = {
  hazard: 'Chipped hazard yellow, straight from the rental yard.',
  primer: 'Flat grey primer, never finished.',
  flames: 'Gloss red with yellow flames licking back from the nose.',
  company: 'Company blue with a white fleet number.',
  salvage: 'Mismatched salvage panels, every part a different colour.',
  shark: 'Olive drab with a shark mouth painted on the nose.',
} as const;
const CHARMS = {
  none: 'Nothing: a bare dash, a driver who trusts only the gauges.',
  dice: 'A pair of fuzzy dice swinging from the roll hoop.',
  bobble: 'A nodding bobblehead figure glued to the dash.',
  flags: 'A string of small prayer flags from hoop to antenna.',
  horseshoe: 'A horseshoe wired open-end-up above the seat.',
  saint: 'A little saint figurine with a glowing votive lamp.',
} as const;

function paintPanel(kind: keyof typeof PAINTS, base: string, number: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 128);
  if (kind === 'flames') {
    ctx.fillStyle = '#ffd23a';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(256, 10 + i * 30);
      ctx.bezierCurveTo(170, i * 30, 150, 40 + i * 30, 40 + i * 22, 14 + i * 30);
      ctx.bezierCurveTo(140, 44 + i * 30, 190, 30 + i * 30, 256, 36 + i * 30); ctx.fill();
    }
  } else if (kind === 'shark') {
    ctx.fillStyle = '#f2efe4'; ctx.beginPath(); ctx.moveTo(256, 40); ctx.quadraticCurveTo(120, 70, 90, 110); ctx.lineTo(256, 120); ctx.fill();
    ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.moveTo(256, 62); ctx.quadraticCurveTo(160, 82, 130, 108); ctx.lineTo(256, 108); ctx.fill();
    ctx.fillStyle = '#f2efe4';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(140 + i * 17, 62 + (6 - i) * 2); ctx.lineTo(149 + i * 17, 84); ctx.lineTo(158 + i * 17, 62 + (6 - i) * 2); ctx.fill(); }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(200, 26, 11, 0, 7); ctx.fill();
  } else if (kind === 'hazard') {
    ctx.fillStyle = '#1b1b1d';
    for (let i = -2; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 40, 128); ctx.lineTo(i * 40 + 20, 128); ctx.lineTo(i * 40 + 60, 88); ctx.lineTo(i * 40 + 40, 88); ctx.fill(); }
  }
  if (kind === 'company' || kind === 'hazard' || kind === 'primer') {
    ctx.fillStyle = kind === 'company' ? '#ffffff' : '#1b1b1d';
    ctx.font = 'bold 64px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(number, 128, 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function netTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = '#3d3a30'; ctx.lineWidth = 5;
  for (let i = -128; i <= 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 128, 0); ctx.lineTo(i, 128); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 1.25);
  return texture;
}

export default defineThing({
  questions: {
    length: choice('How big a hauler is it?', {
      runabout: 'A stubby two-bin runabout, barely more than a seat and a tank.',
      standard: 'The standard four-bin work skiff.',
      long: 'A long six-bin hauler, slow and heavy.',
    }),
    load: score('How loaded are the bins?', ['Empty, nets hanging slack', 'A scraping in the bottom', 'Level with the rim', 'Heaped high and bulging the nets']),
    cargo: choice('What is it carrying?', CARGO),
    paint: choice('What is the paint job?', PAINTS),
    charm: choice('What good luck charm rides on the dash?', CHARMS),
    doing: choice('What is it doing right now?', {
      parked: 'Parked cold on its skids, nobody about.',
      warming: 'Thrusters puffing white gas, about to lift.',
      repair: 'Up on a jack with a thruster pod off and tools laid out.',
      overloaded: 'Sagging nose-up under a load it should not be carrying.',
    }),
    lamps: noul('Are its running lamps lit?'),
    tow: noul('Is it dragging a tow line with a hook?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rows = { runabout: 1, standard: 2, long: 3 }[a.length];
    const bed = rows * 1.15 + 0.2;
    const front = 1.5, rear = -bed - 0.3;
    const total = front - rear;
    const base = { hazard: '#e0ad1c', primer: '#8d9192', flames: '#c4261d', company: '#2b5cab', salvage: '#b8a070', shark: '#667046' }[a.paint];
    const salvage = ['#b8a070', '#5f8f9b', '#b0503a', '#d8d2c0', '#566b48'];
    const body = () => s.material(a.paint === 'salvage' ? salvage[Math.floor(random() * salvage.length)] : base, { metalness: 0.2, roughness: 0.5 });
    const paint = body();
    const steel = s.material('#868c90', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#26292c', { roughness: 0.7 });
    const number = String(10 + Math.floor(random() * 89));
    const group = s.root;
    const deckY = 0.75;

    // Open frame: two long rails, cross members, a keel truss.
    for (const x of [-0.85, 0.85]) {
      s.rod([x, deckY, rear], [x, deckY, front], 0.06, paint);
      s.rod([x, deckY + 0.55, rear], [x, deckY + 0.55, -0.1], 0.04, steel);
      for (let z = rear; z <= -0.1; z += 1.15) s.rod([x, deckY, z], [x, deckY + 0.55, z], 0.035, steel);
    }
    for (let z = rear; z <= front + 0.01; z += total / (rows + 2)) s.rod([-0.85, deckY, z], [0.85, deckY, z], 0.05, paint);
    s.rod([0, deckY - 0.3, rear + 0.2], [0, deckY - 0.3, front - 0.2], 0.05, steel);
    for (let z = rear + 0.2; z < front - 0.3; z += 0.9) for (const x of [-0.85, 0.85]) s.rod([0, deckY - 0.3, z], [x, deckY, z + 0.45], 0.025, steel);

    // Landing skids.
    const jacked = a.doing === 'repair';
    for (const x of [-1, 1]) {
      s.rod([x * 1.05, 0.05, rear + 0.3], [x * 1.05, 0.05, front - 0.2], 0.05, dark);
      s.rod([x * 1.05, 0.05, front - 0.2], [x * 1.05, 0.22, front + 0.1], 0.05, dark);
      for (const z of [rear + 0.6, front - 0.6]) s.rod([x * 0.85, deckY, z], [x * 1.05, 0.05, z], 0.04, steel);
    }

    // Nose: dash cowl, seat, roll hoop, sticks.
    const panel = new THREE.MeshStandardMaterial({ map: paintPanel(a.paint, base, number), roughness: 0.5, metalness: 0.2 });
    const cowl = s.box([1.5, 0.5, 0.7], [0, deckY + 0.3, front - 0.3], panel);
    cowl.rotation.x = -0.25;
    for (const x of [-1, 1]) {
      const side = s.mesh(new THREE.PlaneGeometry(1.5, 0.6), panel, [x * 0.88, deckY + 0.28, front - 0.75]);
      side.rotation.y = x * Math.PI / 2;
      if (x < 0) side.scale.x = -1;
      (side.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    }
    s.box([1.3, 0.3, 0.06], [0, deckY + 0.62, front - 0.52], dark).rotation.x = -0.5;
    for (let i = 0; i < 4; i++) s.cylinder(0.06, 0.06, 0.02, [-0.42 + i * 0.28, deckY + 0.66, front - 0.48], s.material('#e8f0e0', { emissive: a.lamps ? '#9fe6b0' : '#000000', emissiveIntensity: 0.8 }), 10).rotation.x = Math.PI / 2 - 0.5;
    s.box([0.62, 0.1, 0.6], [0, deckY + 0.12, 0.35], dark);
    s.box([0.62, 0.8, 0.1], [0, deckY + 0.52, 0.05], s.material(mood.cheer > 0.5 ? '#a5492f' : '#4a3f38'));
    s.box([0.3, 0.2, 0.1], [0, deckY + 1.02, 0.05], dark);
    for (const x of [-0.42, 0.42]) { s.rod([x, deckY + 0.1, 0.6], [x, deckY + 0.42, 0.72], 0.02, steel); s.ball([0.045, 0.045, 0.045], [x, deckY + 0.44, 0.73], s.material('#c0281f'), 8); }
    const hoopY = deckY + 1.55;
    s.tube([[-0.85, deckY, -0.1], [-0.8, hoopY - 0.2, -0.1], [-0.5, hoopY, -0.1], [0.5, hoopY, -0.1], [0.8, hoopY - 0.2, -0.1], [0.85, deckY, -0.1]], 0.045, paint);
    s.rod([0.8, hoopY - 0.2, -0.1], [0.95, hoopY + 1.1, -0.2], 0.015, steel);
    s.ball([0.04, 0.04, 0.04], [0.95, hoopY + 1.1, -0.2], s.material('#ff4a2a', { emissive: a.lamps ? '#ff3a1a' : '#000000', emissiveIntensity: 1.2 }), 8);

    // Running lamps on the cowl.
    const lampGlow = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.8, 0.72);
    for (const x of [-0.5, 0.5]) {
      s.cylinder(0.13, 0.1, 0.14, [x, deckY + 0.28, front + 0.1], dark, 12).rotation.x = Math.PI / 2;
      s.cylinder(0.11, 0.11, 0.02, [x, deckY + 0.28, front + 0.18], new THREE.MeshStandardMaterial({ color: a.lamps ? '#fff8dc' : '#7b8084', emissive: a.lamps ? lampGlow : new THREE.Color('#000'), emissiveIntensity: a.lamps ? 1.8 : 0 }), 12).rotation.x = Math.PI / 2;
    }

    // Gas bottles strapped along the rails.
    const bottle = s.material('#e9ebe6', { roughness: 0.35, metalness: 0.2 });
    const bottles = rows + 1;
    for (const x of [-1, 1]) for (let i = 0; i < bottles; i++) {
      const z = rear + 0.6 + i * (bed - 0.3) / Math.max(1, bottles - 1) * (bottles > 1 ? 1 : 0);
      const tank = s.mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), i % 2 ? bottle : s.material(x > 0 ? '#3f9b78' : '#d86a2a', { roughness: 0.4 }), [x * 1.08, deckY + 0.28, z]);
      tank.rotation.x = Math.PI / 2;
      s.ring(0.18, 0.015, [x * 1.08, deckY + 0.28, z], dark);
    }

    // Cold-gas thruster pods at the four corners, and the main bell aft.
    const puffs: THREE.Mesh[] = [];
    const gas = new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.32, depthWrite: false });
    const missing = jacked ? 1 : -1;
    let pod = 0;
    for (const x of [-1, 1]) for (const z of [rear + 0.15, front - 0.05]) {
      const at: [number, number, number] = [x * 1.0, deckY + 0.62, z];
      if (pod++ === missing) {
        s.box([0.12, 0.12, 0.12], at, dark);
        for (let i = 0; i < 3; i++) s.tube([at, [at[0] + x * 0.2, at[1] - 0.3 - i * 0.1, at[2] + (i - 1) * 0.15], [at[0] + x * (0.3 + i * 0.05), at[1] - 0.6, at[2] + (i - 1) * 0.25]], 0.015, s.material(['#c0281f', '#e0c020', '#2a6fc0'][i]));
        continue;
      }
      s.rod([x * 0.85, deckY, z], at, 0.04, steel);
      s.box([0.24, 0.24, 0.24], at, paint);
      const dirs: [number, number, number][] = [[x, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, Math.sign(z - (front + rear) / 2)]];
      for (const d of dirs) {
        const nozzle = s.mesh(new THREE.ConeGeometry(0.1, 0.2, 10, 1, true), s.material('#3a3d40', { side: THREE.DoubleSide, metalness: 0.6 }), [at[0] + d[0] * 0.2, at[1] + d[1] * 0.2, at[2] + d[2] * 0.2]);
        nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...d));
        if (a.doing === 'warming' && d[1] <= 0) {
          const puff = s.mesh(new THREE.ConeGeometry(0.22, 0.75, 10, 1, true), gas, [at[0] + d[0] * 0.65, at[1] + d[1] * 0.65, at[2] + d[2] * 0.65]);
          puff.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...d));
          puff.castShadow = false;
          puffs.push(puff);
        }
      }
    }
    const bell = s.mesh(new THREE.ConeGeometry(0.36, 0.6, 16, 1, true), s.material('#3a3d40', { side: THREE.DoubleSide, metalness: 0.6 }), [0, deckY + 0.15, rear - 0.35]);
    bell.rotation.x = Math.PI / 2;
    s.ball([0.3, 0.3, 0.3], [0, deckY + 0.15, rear + 0.1], bottle, 14);

    // Bins, their loads and the nets over them.
    const net = new THREE.MeshStandardMaterial({ map: netTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
    const lump = new THREE.DodecahedronGeometry(1, 0);
    const cube = new THREE.BoxGeometry(1.5, 1.2, 1.5);
    const tints: Record<keyof typeof CARGO, string[]> = {
      rock: ['#84878a', '#6c6f72', '#9c9d9a'], ice: ['#cde6f3', '#a8d3ec', '#eef9fc'], nuggets: ['#d8dde0', '#e8c060', '#b9c2c8'],
      scrap: ['#8a5a3a', '#7d8a90', '#b8a070', '#40464a'], glow: ['#5d6b3c', '#9df04a', '#465430'], crates: ['#b98a52', '#3f78a8', '#c9c2a8', '#a4502c'],
    };
    const loadMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff', roughness: a.cargo === 'ice' ? 0.2 : a.cargo === 'nuggets' ? 0.3 : 0.85, metalness: a.cargo === 'nuggets' ? 0.8 : a.cargo === 'scrap' ? 0.4 : 0,
      emissive: a.cargo === 'glow' ? '#8cff3a' : '#000000', emissiveIntensity: a.cargo === 'glow' ? 0.8 : 0, flatShading: true,
    });
    const pieces: { at: [number, number, number]; size: number; color: string }[] = [];
    const blocky = a.cargo === 'ice' || a.cargo === 'crates';
    for (let row = 0; row < rows; row++) for (const x of [-0.42, 0.42]) {
      const z = -0.75 - row * 1.15;
      const binPaint = body();
      s.box([0.78, 0.04, 1.05], [x, deckY + 0.04, z], dark);
      for (const side of [-1, 1]) {
        s.box([0.04, 0.5, 1.05], [x + side * 0.39, deckY + 0.3, z], binPaint);
        s.box([0.78, 0.5, 0.04], [x, deckY + 0.3, z + side * 0.525], binPaint);
      }
      const fill = Math.max(0, a.load * mix(0.75, 1.1, random()));
      const top = deckY + 0.08 + fill * 0.48;
      if (fill > 0.05) {
        s.box([0.72, Math.max(0.02, top - deckY - 0.08), 1.0], [x, (top + deckY + 0.08) / 2, z], s.material(tints[a.cargo][0], { roughness: 0.9 }));
        const heap = Math.max(0, fill - 0.45) * 1.3;
        for (let i = 0; i < Math.round(8 + fill * 22); i++) {
          const px = (random() - 0.5) * 0.6, pz = (random() - 0.5) * 0.85;
          const dome = Math.max(0, 1 - (px / 0.4) ** 2 - (pz / 0.55) ** 2);
          pieces.push({ at: [x + px, top + dome * heap + random() * 0.05, z + pz], size: blocky ? mix(0.09, 0.15, random()) : mix(0.08, 0.17, random()), color: tints[a.cargo][Math.floor(random() * tints[a.cargo].length)] });
        }
        if (a.cargo === 'scrap') for (let i = 0; i < 2; i++) s.rod([x + (random() - 0.5) * 0.4, top - 0.1, z + (random() - 0.5) * 0.6], [x + (random() - 0.5) * 0.9, top + 0.5 + random() * 0.5, z + (random() - 0.5) * 0.9], 0.035, steel);
      }
      // The net: taut dome over a heap, sagging into an empty bin.
      const rise = fill > 0.05 ? 0.16 + Math.max(0, fill - 0.45) * 1.45 : -0.22;
      const cover = s.mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), net, [x, fill > 0.05 ? Math.max(top - 0.02, deckY + 0.5) : deckY + 0.55, z]);
      cover.scale.set(0.43, rise, 0.57);
      cover.castShadow = false;
    }
    if (pieces.length) s.scatter(blocky ? cube : lump, loadMaterial, pieces);

    // Charms.
    const dashY = deckY + 0.74, dashZ = front - 0.5;
    if (a.charm === 'dice') {
      for (const [dx, drop, tint] of [[-0.1, 0.38, '#f2f0e8'], [0.1, 0.5, '#d83a5a']] as const) {
        s.rod([0, hoopY, -0.1], [dx, hoopY - drop, -0.02], 0.008, dark);
        const die = s.box([0.16, 0.16, 0.16], [dx, hoopY - drop - 0.08, -0.02], s.material(tint));
        die.rotation.set(random(), random(), random());
      }
    } else if (a.charm === 'bobble') {
      s.cylinder(0.05, 0.07, 0.16, [0.3, dashY + 0.06, dashZ], s.material('#3f78c0'), 10);
      s.ball([0.11, 0.12, 0.11], [0.3, dashY + 0.26, dashZ], s.material('#e8b890'), 12);
      s.ball([0.115, 0.06, 0.115], [0.3, dashY + 0.33, dashZ], s.material('#d8c020'), 10);
    } else if (a.charm === 'flags') {
      const from = new THREE.Vector3(-0.5, hoopY, -0.1), to = new THREE.Vector3(0.95, hoopY + 1.0, -0.2);
      s.rod(from.toArray(), to.toArray(), 0.008, dark);
      const colours = ['#2f6fd0', '#f2f0e8', '#d83a2a', '#3fa860', '#e8c020'];
      for (let i = 0; i < 9; i++) {
        const p = from.clone().lerp(to, (i + 0.5) / 9);
        const flag = s.box([0.13, 0.17, 0.01], [p.x, p.y - 0.1, p.z], s.material(colours[i % 5], { side: THREE.DoubleSide }));
        flag.rotation.z = (random() - 0.5) * 0.5;
      }
    } else if (a.charm === 'horseshoe') {
      const shoe = s.ring(0.14, 0.03, [0, hoopY + 0.16, -0.1], s.material('#b9bec2', { metalness: 0.85, roughness: 0.3 }), Math.PI * 1.35);
      shoe.rotation.z = -Math.PI * 0.175 + Math.PI;
    } else if (a.charm === 'saint') {
      s.cylinder(0.035, 0.08, 0.3, [-0.3, dashY + 0.13, dashZ], s.material('#3a6fb8'), 10);
      s.ball([0.05, 0.05, 0.05], [-0.3, dashY + 0.32, dashZ], s.material('#e8c8a0'), 10);
      s.ring(0.07, 0.01, [-0.3, dashY + 0.34, dashZ - 0.03], s.material('#e8c040', { emissive: '#e8b020', emissiveIntensity: 0.8 }));
      s.cylinder(0.035, 0.035, 0.07, [-0.12, dashY + 0.03, dashZ], s.material('#ff8a3a', { emissive: '#ff7a20', emissiveIntensity: mix(0.6, 1.8, mood.warmth) }), 10);
    }

    if (a.tow) {
      const side = random() > 0.5 ? 1 : -1;
      s.tube([[0, deckY - 0.3, rear + 0.2], [side * 0.5, 0.2, rear - 0.6], [side * 1.4, 0.05, rear - 1.0], [side * 2.1, 0.05, rear - 0.5], [side * 2.5, 0.05, rear - 1.1]], 0.025, s.material('#c9b88a'));
      s.ring(0.12, 0.03, [side * 2.55, 0.06, rear - 1.2], steel, Math.PI * 1.4).rotation.x = Math.PI / 2;
    }

    if (jacked) {
      s.cylinder(0.08, 0.16, 0.5, [0.7, 0.25, rear + 0.5], s.material('#c0281f'), 8);
      s.box([0.6, 0.02, 0.4], [1.9, 0.01, rear + 0.6], s.material('#5a6a78'));
      for (let i = 0; i < 4; i++) s.rod([1.7 + i * 0.12, 0.04, rear + 0.45], [1.72 + i * 0.12, 0.04, rear + 0.75], 0.02, steel);
      s.box([0.3, 0.26, 0.3], [1.5, 0.13, rear + 1.3], paint);
    }

    // Overload and the jack tip the whole frame; the skids stay where the ground is.
    if (a.doing === 'overloaded') { group.rotation.x = 0.07; }
    const thing = s.finish({
      update: (_dt, time) => {
        const pulse = 0.8 + Math.sin(time * mix(4, 14, mood.energy)) * 0.2;
        for (const [index, puff] of puffs.entries()) puff.scale.setScalar(pulse + (index % 3) * 0.06);
      },
    });
    return thing;
  },
});
