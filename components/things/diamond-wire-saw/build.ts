import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const STONE = {
  marble: 'Bright white marble.',
  granite: 'Mid-grey speckled granite.',
  nero: 'Near-black stone with a wet shine.',
  rosso: 'Rust-red marble with pale streaks.',
  honey: 'Honey-yellow limestone.',
} as const;
const STONE_TINT: Record<keyof typeof STONE, [string, string]> = {
  marble: ['#ecebe4', '#cfcec7'], granite: ['#a7a9a8', '#86898a'], nero: ['#3b3e42', '#2a2c30'], rosso: ['#a8563f', '#874232'], honey: ['#d8b877', '#b6965a'],
};

export default defineThing({
  questions: {
    vintage: choice('What vintage of wire saw is it?', {
      helical: 'The old kind: a twisted steel wire running over pulleys on tall towers, fed with sand and water, sinking slowly downward through the stone.',
      'early-diamond': 'A boxy 1980s diamond-wire machine in faded blue, bare spoked flywheel, exposed belts.',
      modern: 'A modern safety-orange diamond-wire machine with a guarded flywheel and a remote control stand.',
      improvised: 'A home-made rig: an old tractor engine on a rail trolley, flywheel from a scrapyard, nothing guarded.',
    }),
    state: choice('What is it doing right now?', {
      running: 'Running flat out: flywheel spinning, water and white slurry streaming from the cut.',
      idle: 'Switched off for lunch, wire taut and still, a jacket hung on it.',
      snapped: 'The wire has just snapped and whipped back: it lies in loops on the ground.',
      abandoned: 'Abandoned mid-cut years ago, wire slack and rusting, weeds between the rails.',
    }),
    progress: score('How far through the cut is it?', ['Just started, wire wrapped round the whole slab', 'Halfway', 'Nearly through, the carriage backed off to the end of its rails']),
    stone: choice('What stone is it cutting?', STONE),
    target: choice('What is it cutting from?', {
      bench: 'A bench still attached to the mountain, with a higher quarry step rising behind.',
      block: 'A free-standing block being squared up.',
      slab: 'A thin slab being sliced off the face of a block like bread.',
    }),
    barrier: noul('Is there a safety barrier and warning sign in front of the wire?'),
    water: choice('Where does the cooling water come from?', {
      barrel: 'A blue plastic barrel with a hose.',
      tank: 'A rusty steel tank on legs.',
      pipe: 'A black pipe snaking away to a spring somewhere up the hill.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const helical = a.vintage === 'helical';
    const abandoned = a.state === 'abandoned';
    const running = a.state === 'running';
    const snapped = a.state === 'snapped';
    const rustiness = Math.min(1, mood.wear * 0.8 + (abandoned ? 0.6 : 0) + (a.vintage === 'improvised' ? 0.3 : 0) + (helical ? 0.2 : 0));
    const p = a.progress;

    const rusted = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      s.material(new THREE.Color(hex).lerp(new THREE.Color('#7a4a2c'), rustiness * 0.75), { roughness: mix(0.5, 0.95, rustiness), ...extra });
    const [stoneA, stoneB] = STONE_TINT[a.stone];
    const rock = s.material(stoneA, { roughness: a.stone === 'nero' ? 0.45 : 0.85 });
    const rockDark = s.material(stoneB, { roughness: 0.95, flatShading: true });
    const kerfMat = new THREE.MeshStandardMaterial({ color: '#1c1b1a', roughness: 1 });
    const steel = rusted('#5a6166', { metalness: 0.6 });
    const dark = s.material('#24282b');
    const livery = { helical: '#55695c', 'early-diamond': '#3f6a96', modern: '#ea6a1c', improvised: '#b23a2a' }[a.vintage];
    const paint = rusted(livery);
    const wireMat = new THREE.MeshStandardMaterial({ color: abandoned ? '#6e4a30' : helical ? '#3c4044' : a.vintage === 'modern' ? '#1f6fd0' : '#d9b21c', roughness: 0.6, metalness: 0.3 });
    const WR = 0.04;

    // ---- The rock -------------------------------------------------------------------------
    const RL = mix(3.0, 3.8, random()), RH = mix(2.2, 2.7, random());
    const zf = a.target === 'slab' ? 0.24 : a.target === 'bench' ? 1.15 : 0.95;
    const zb = a.target === 'slab' ? -1.7 : a.target === 'bench' ? -1.3 : -0.95;
    const gap = 0.035;
    const slabs = (x0: number, x1: number, y0: number, y1: number, cut: boolean) => {
      if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (!cut) { s.box([x1 - x0, y1 - y0, zf - zb], [cx, cy, (zf + zb) / 2], rock); return; }
      s.box([x1 - x0, y1 - y0, -gap - zb], [cx, cy, (zb - gap) / 2], rock);
      // A sliced slab that is nearly free starts to lean away.
      const front = s.box([x1 - x0, y1 - y0, zf - gap], [cx, cy, (zf + gap) / 2], rock);
      if (a.target === 'slab' && p > 0.8 && !helical) { front.rotation.x = 0.05; front.position.z += 0.06; }
      s.box([x1 - x0 - 0.02, y1 - y0 - 0.02, gap * 2], [cx, cy, 0], kerfMat);
    };
    let wirePath: P3[];
    const cy = 1.08, fr = a.vintage === 'improvised' ? 0.64 : 0.8;
    const carX = mix(2.1, 3.9, p);
    const flyTop: P3 = [carX, cy + fr, 0], flyBottom: P3 = [carX, cy - fr, 0];
    let entry: P3;
    if (helical) {
      // The helical wire sinks downward between two descending pulleys.
      const cutY = mix(RH - 0.25, 0.25, p);
      slabs(-RL, 0, 0, cutY, false);
      slabs(-RL, 0, cutY, RH, true);
      const towerH = RH + 1.5;
      for (const [x, lean] of [[0.55, 1], [-RL - 0.55, -1]] as const) {
        s.rod([x - 0.28, 0, -0.3], [x, towerH, -0.1], 0.07, steel);
        s.rod([x + 0.28, 0, -0.3], [x, towerH, -0.1], 0.07, steel);
        s.rod([x, 0, 0.35], [x, towerH, -0.02], 0.07, steel);
        for (let i = 1; i < 4; i++) s.rod([x - 0.28 * (1 - i / 4.4), towerH * i / 4.4, -0.26], [x + 0.28 * (1 - i / 4.4), towerH * i / 4.4, -0.26], 0.025, steel);
        for (const y of [towerH - 0.1, towerH - 0.6, cutY]) s.cylinder(0.26, 0.26, 0.08, [x, y, 0], dark, 18).rotation.x = Math.PI / 2;
        // The slotted descent post that carries the sinking pulley.
        s.box([0.08, RH + 0.4, 0.08], [x + lean * 0.14, (RH + 0.4) / 2, -0.1], steel);
        // Guy wire.
        s.rod([x, towerH, -0.1], [x + lean * 1.3, 0, -0.9], 0.012, dark);
      }
      wirePath = [flyBottom, [0.55, towerH - 0.6 - 0.2, 0], [0.55 + 0.2, cutY, 0], [0.55, cutY - 0.2, 0], [-RL - 0.55, cutY - 0.2, 0], [-RL - 0.75, cutY, 0], [-RL - 0.55, towerH + 0.1, 0], [0.55, towerH + 0.1, 0], flyTop];
      entry = [0, cutY, 0];
      // Sand hopper feeding the cut.
      s.cylinder(0.32, 0.08, 0.5, [-RL * 0.5, RH + 0.55, -0.35], rusted('#7b7f77'), 12);
      for (const dx of [-0.25, 0.25]) s.rod([-RL * 0.5 + dx, RH, -0.35], [-RL * 0.5 + dx * 0.6, RH + 0.4, -0.35], 0.02, steel);
      s.cylinder(0.3, 0.42, 0.14, [-RL * 0.5 + 0.2, RH + 0.07, 0.25], s.material('#d9c28a', { roughness: 1 }), 10);
    } else {
      const xt = mix(-RL + 0.12, -0.35, p), xb = Math.max(-RL, xt - 0.35);
      slabs(xt, 0, 0, RH, false);
      slabs(-RL, xt, 0, RH, true);
      // Painted guide line where the cut will go.
      s.box([-xt, 0.012, 0.04], [xt / 2, RH + 0.006, 0], new THREE.MeshStandardMaterial({ color: '#c8281e', roughness: 0.9 }));
      s.box([0.012, RH, 0.04], [0.006, RH / 2, 0], new THREE.MeshStandardMaterial({ color: '#c8281e', roughness: 0.9 }));
      // A free-standing guide pulley lifts the top run clear of the rock.
      const px = 0.7, py = RH + 0.42;
      s.rod([px - 0.35, 0, -0.35], [px, py, -0.08], 0.045, steel);
      s.rod([px + 0.35, 0, -0.35], [px, py, -0.08], 0.045, steel);
      s.rod([px, 0, 0.4], [px, py, 0.06], 0.045, steel);
      s.cylinder(0.27, 0.27, 0.09, [px, py, 0], paint, 18).rotation.x = Math.PI / 2;
      s.cylinder(0.05, 0.05, 0.2, [px, py, 0], dark, 10).rotation.x = Math.PI / 2;
      s.cylinder(0.12, 0.12, 0.2, [0.02, 0.14, 0], kerfMat, 12).rotation.z = Math.PI / 2;
      wirePath = [flyBottom, [0.3, 0.14, 0], [xb, 0.14, 0], [xt, RH + 0.03, 0], [px, py + 0.2, 0], flyTop];
      entry = [xt, RH, 0];
    }
    // Rough quarry bedding around the worked stone.
    if (a.target === 'bench') {
      const stepH = RH + mix(1.2, 1.9, random());
      s.box([RL + 2.2, stepH, 1.6], [-RL / 2 - 0.5, stepH / 2, zb - 0.8], rock);
      s.box([1.6, stepH, zf - zb + 0.2], [-RL - 0.8, stepH / 2, (zf + zb) / 2 - 0.1], rock);
      for (let i = 0; i < 9; i++) s.box([0.05, stepH - RH - 0.1, 0.03], [-RL + i * (RL / 8) * 0.95, RH + (stepH - RH) / 2, zb + 0.015], rockDark);
    }
    const rubble: { at: P3; size: number }[] = [];
    for (let i = 0; i < 10 + mood.density * 22; i++)
      rubble.push({ at: [-RL - 0.3 + random() * (RL + 0.9), 0.05, (random() < 0.5 ? zf + 0.15 + random() * 0.5 : zb - 0.2 - random() * 0.5)], size: 0.06 + random() * 0.2 });
    s.scatter(new THREE.DodecahedronGeometry(1, 0), rockDark, rubble);

    // ---- Rails and carriage ---------------------------------------------------------------
    const railZ = [-0.2, -1.1];
    const railEnd = 5.3;
    for (const z of railZ) s.box([railEnd - 1.2, 0.1, 0.07], [(railEnd + 1.2) / 2, 0.15, z], steel);
    const sleeper = s.material('#6b5038', { roughness: 0.95 });
    for (let x = 1.4; x < railEnd; x += 0.56) s.box([0.2, 0.1, 1.35], [x, 0.05, -0.65 + (random() - 0.5) * 0.06], sleeper).rotation.y = (random() - 0.5) * 0.08;
    for (const z of railZ) s.box([0.12, 0.42, 0.14], [railEnd, 0.3, z], paint);

    const car = new THREE.Group();
    car.position.set(carX, 0, 0);
    s.root.add(car);
    const put = (mesh: THREE.Mesh) => { car.attach(mesh); mesh.position.x -= 0; return mesh; };
    const cbox = (size: P3, at: P3, material: THREE.Material) => { const m = s.box(size, at, material); s.root.remove(m); car.add(m); return m; };
    const ccyl = (rt: number, rb: number, h: number, at: P3, material: THREE.Material, axis: 'x' | 'y' | 'z' = 'y', seg = 18) => {
      const m = s.cylinder(rt, rb, h, at, material, seg);
      if (axis === 'z') m.rotation.x = Math.PI / 2;
      if (axis === 'x') m.rotation.z = Math.PI / 2;
      s.root.remove(m); car.add(m); return m;
    };
    void put;
    cbox([1.9, 0.16, 1.1], [0.25, 0.42, -0.65], steel);
    for (const x of [-0.45, 0.95]) for (const z of railZ) ccyl(0.16, 0.16, 0.09, [x, 0.32, z], dark, 'z');
    if (a.vintage === 'improvised') {
      // A tractor engine block, fuel tank, exhaust stack and a seat nobody should sit on.
      cbox([1.1, 0.6, 0.55], [0.4, 0.82, -0.7], paint);
      cbox([0.7, 0.3, 0.5], [0.5, 1.27, -0.7], rusted('#8d8f86'));
      ccyl(0.04, 0.04, 0.9, [0.0, 1.55, -0.55], dark);
      ccyl(0.07, 0.07, 0.22, [0.0, 2.0, -0.55], dark);
      cbox([0.1, 0.5, 0.6], [-0.2, 0.8, -0.7], dark);
      cbox([0.4, 0.06, 0.4], [1.25, 0.9, -0.7], dark);
      cbox([0.06, 0.4, 0.4], [1.45, 1.1, -0.7], dark);
    } else if (helical) {
      cbox([1.2, 0.5, 0.7], [0.4, 0.75, -0.7], paint);
      ccyl(0.3, 0.3, 0.8, [0.9, 1.1, -0.7], paint, 'x');
      // Counterweight box that keeps the long wire tight.
      cbox([0.5, 0.5, 0.5], [1.75, 0.5, -0.65], rusted('#6d6f6a'));
      ccyl(0.05, 0.05, 0.7, [1.45, 0.6, -0.65], steel, 'x');
    } else {
      cbox([1.5, 0.75, 0.8], [0.35, 0.88, -0.7], paint);
      ccyl(0.27, 0.27, 0.75, [0.75, 1.5, -0.7], a.vintage === 'modern' ? s.material('#30363b') : paint, 'x');
      for (let i = 0; i < 6; i++) ccyl(0.285, 0.285, 0.03, [0.45 + i * 0.12, 1.5, -0.7], dark, 'x');
      cbox([0.36, 0.5, 0.06], [-0.1, 0.95, -0.28], s.material('#d8dcd8'));
      for (let i = 0; i < 3; i++) ccyl(0.035, 0.035, 0.04, [-0.2 + i * 0.1, 1.05, -0.24], s.material(['#d42a20', '#2f9e44', '#e8c01a'][i], { emissive: ['#d42a20', '#2f9e44', '#e8c01a'][i], emissiveIntensity: running ? 0.8 : 0.1 }), 'z', 10);
      if (a.vintage === 'modern') for (let i = 0; i < 5; i++) cbox([0.14, 0.76, 0.01], [-0.25 + i * 0.3, 0.88, -0.295], i % 2 ? dark : s.material('#f1c21b')).rotation.z = 0.5;
    }
    // Axle and flywheel in the plane of the cut.
    ccyl(0.07, 0.07, 0.7, [0, cy, -0.3], steel, 'z', 12);
    const fly = new THREE.Group();
    fly.position.set(0, cy, 0);
    car.add(fly);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(fr - 0.04, 0.07, 8, 40), a.vintage === 'modern' ? s.material('#30363b') : paint);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14), steel);
    hub.rotation.x = Math.PI / 2;
    fly.add(rim, hub);
    for (let i = 0; i < (a.vintage === 'improvised' ? 4 : 6); i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(fr * 2 - 0.1, 0.07, 0.035), steel);
      spoke.rotation.z = (i / (a.vintage === 'improvised' ? 4 : 6)) * Math.PI;
      fly.add(spoke);
    }
    fly.traverse((node) => { node.castShadow = true; });
    if (a.vintage === 'modern') {
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(fr + 0.09, fr + 0.09, 0.2, 24, 1, true, -Math.PI * 0.25, Math.PI * 1.1), s.material('#f1c21b', { side: THREE.DoubleSide }));
      guard.rotation.x = Math.PI / 2;
      guard.position.set(0, cy, 0);
      guard.castShadow = true;
      car.add(guard);
    }

    // ---- The wire -------------------------------------------------------------------------
    const span = (from: P3, to: P3, sag: number) => {
      if (sag < 0.02) { s.rod(from, to, WR, wireMat); return; }
      const mid: P3 = [(from[0] + to[0]) / 2, Math.max(0.04, (from[1] + to[1]) / 2 - sag), (from[2] + to[2]) / 2 + sag * 0.15];
      s.tube([from, mid, to], WR, wireMat);
    };
    if (!snapped) {
      const sag = abandoned ? 0.55 : a.state === 'idle' ? 0.05 : 0;
      for (let i = 1; i < wirePath.length; i++) {
        const from = wirePath[i - 1], to = wirePath[i];
        const long = Math.hypot(to[0] - from[0], to[1] - from[1]) > 1.6 && Math.abs(to[0] - from[0]) > 1;
        const inRock = from[0] <= 0.3 && to[0] <= 0.3 && !helical;
        span(from, to, long && !inRock ? sag : 0);
      }
    } else {
      // The broken ends: one whipped across the ground, one hanging out of the cut.
      const loops: P3[] = [];
      let angle = random() * 6;
      for (let i = 0; i < 26; i++) {
        angle += 0.55 + random() * 0.5;
        const reach = 0.4 + i * 0.045;
        loops.push([carX - 1.2 + Math.cos(angle) * reach * 0.9 - i * 0.03, 0.04 + (i % 5 === 2 ? 0.12 : 0), 1.0 + Math.sin(angle) * reach * 0.6]);
      }
      s.tube([flyBottom, [carX - 0.5, 0.06, 0.5], ...loops], WR, wireMat);
      s.tube([entry, [entry[0] + 0.5, entry[1] + 0.25, 0.2], [entry[0] + 0.9, entry[1] + 0.05, zf * 0.7], [entry[0] + 1.0, entry[1] - 0.5, zf + 0.06], [entry[0] + 0.9, 0.6, zf + 0.1]], WR, wireMat);
      s.rod(flyTop, [carX - 0.8, cy + fr + 0.05, 0.3], WR, wireMat);
    }

    // ---- Water ----------------------------------------------------------------------------
    const tankAt: P3 = [-RL * 0.35, 0, zf + 0.95];
    const hoseMat = s.material(a.water === 'pipe' ? '#1c1e20' : '#2f8f4e', { roughness: 0.7 });
    let hoseStart: P3;
    if (a.water === 'barrel') {
      s.cylinder(0.3, 0.3, 0.9, [tankAt[0], 0.45, tankAt[2]], s.material('#2a62b5'), 16);
      for (const y of [0.25, 0.65]) s.cylinder(0.315, 0.315, 0.04, [tankAt[0], y, tankAt[2]], s.material('#1f4d92'), 16);
      hoseStart = [tankAt[0], 0.92, tankAt[2]];
    } else if (a.water === 'tank') {
      s.box([1.1, 0.7, 0.7], [tankAt[0], 1.15, tankAt[2]], rusted('#6f7a78'));
      for (const dx of [-0.48, 0.48]) for (const dz of [-0.28, 0.28]) s.rod([tankAt[0] + dx, 0, tankAt[2] + dz], [tankAt[0] + dx, 0.82, tankAt[2] + dz], 0.035, steel);
      hoseStart = [tankAt[0] + 0.3, 0.85, tankAt[2] - 0.3];
    } else {
      hoseStart = [-RL - 0.5, 0.05, zf + 1.1];
      s.tube([hoseStart, [-RL * 0.8, 0.05, zf + 0.8], [-RL * 0.6, 0.05, zf + 1.0 + random() * 0.2], [tankAt[0], 0.05, zf + 0.9]], 0.045, hoseMat);
      hoseStart = [tankAt[0], 0.05, zf + 0.9];
    }
    const nozzle: P3 = [entry[0] - 0.15, RH + 0.12, 0.12];
    s.tube([hoseStart, [hoseStart[0] + 0.25, 0.06, zf + 0.6], [hoseStart[0] + 0.1 + random() * 0.3, 0.06, zf + 0.2], [nozzle[0] - 0.1, RH * 0.6, zf + 0.06], [nozzle[0] - 0.05, RH + 0.1, zf * 0.6], nozzle], 0.04, hoseMat);
    const wet = running || a.state === 'idle';
    if (wet && !abandoned) {
      const slurry = s.material(a.stone === 'nero' ? '#8f979c' : a.stone === 'rosso' ? '#d9a08e' : '#f6f7f4', { roughness: 0.25 });
      const flow = running ? 1 : 0.4;
      // Slurry streaks down the face under the cut and pools at the foot.
      s.box([0.12 + flow * 0.3, RH, 0.012], [entry[0] - 0.1, RH / 2, zf + 0.007], slurry);
      s.cylinder(0.5 + flow * 0.7, 0.55 + flow * 0.7, 0.02, [entry[0] + 0.1, 0.012, zf + 0.35 + flow * 0.4], slurry, 22).scale.z = 0.7;
      s.cylinder(0.25 + flow * 0.3, 0.3 + flow * 0.3, 0.02, [0.5, 0.012, 0.25], slurry, 18);
      if (running) {
        s.rod(nozzle, [nozzle[0] + 0.12, RH + 0.01, 0.02], 0.014, s.material('#bfe3f2', { roughness: 0.2 }));
        const spray: { at: P3; size: number }[] = [];
        for (let i = 0; i < 36 * mix(0.5, 1.4, mood.energy); i++) {
          const t = random();
          spray.push({ at: [mix(entry[0], carX, t * t) + (random() - 0.5) * 0.3, mix(entry[1], cy + fr, t * t) + random() * 0.45, (random() - 0.5) * 0.3], size: 0.015 + random() * 0.03 });
        }
        s.scatter(new THREE.SphereGeometry(1, 5, 4), slurry, spray);
      }
    }

    // ---- People-shaped details ------------------------------------------------------------
    if (a.vintage === 'modern' && !snapped) {
      // Remote control stand with a trailing cable.
      const sx = carX + 0.4, sz = 1.45;
      for (const [dx, dz] of [[-0.25, 0.2], [0.25, 0.2], [0, -0.28]]) s.rod([sx + dx, 0, sz + dz], [sx, 1.0, sz], 0.02, steel);
      s.box([0.36, 0.26, 0.12], [sx, 1.08, sz], paint).rotation.x = -0.5;
      s.tube([[sx, 0.95, sz], [sx - 0.1, 0.05, sz - 0.4], [carX + 0.6 + random() * 0.4, 0.05, 0.8], [carX + 0.3, 0.45, -0.2]], 0.02, dark);
    }
    if (a.state === 'idle') {
      const jacket = s.box([0.5, 0.55, 0.08], [carX + 0.6, 1.02, -0.26], s.material(mood.cheer > 0.5 ? '#f1c21b' : '#3a5a86'));
      jacket.rotation.z = 0.08;
      s.cylinder(0.07, 0.07, 0.24, [carX + 1.0, 0.62, -0.3], s.material('#b23a2a'), 10);
    }
    if (a.barrier) {
      const bz = zf + 0.55;
      const posts = [0.9, carX + 1.3];
      const red = new THREE.MeshStandardMaterial({ color: '#d03024', roughness: 0.7 });
      for (const x of [posts[0], (posts[0] + posts[1]) / 2, posts[1]]) {
        s.cylinder(0.035, 0.035, 1.1, [x, 0.55, bz], red, 8);
        s.cylinder(0.16, 0.2, 0.08, [x, 0.04, bz], dark, 10);
      }
      for (const y of [0.6, 1.0]) s.box([posts[1] - posts[0], 0.07, 0.015], [(posts[0] + posts[1]) / 2, y, bz], y > 0.8 ? red : s.material('#f4f1e6'));
      const sign = s.label(helical ? 'PERICOLO' : 'DANGER WIRE', 0.9, 0.42, [(posts[0] + posts[1]) / 2 + 0.2, 0.82, bz + 0.03], '#ffffff', '#d03024');
      sign.rotation.y = 0;
    }
    if (abandoned || mood.wear > 0.7) {
      const weeds: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 50; i++) weeds.push({ at: [1.2 + random() * 5.2, 0.02, -1.3 + random() * 1.4], size: 0.1 + random() * 0.3, color: ['#6f8a3c', '#8a9a48', '#55702f', '#a39f52'][Math.floor(random() * 4)] });
      const blade = new THREE.ConeGeometry(0.3, 1, 5);
      blade.translate(0, 0.5, 0);
      s.scatter(blade, s.material('#ffffff', { roughness: 1 }), weeds);
    }

    const speed = running ? mix(4, 16, mood.energy) : 0;
    fly.rotation.z = random() * 3;
    return s.finish({ update: (dt) => { fly.rotation.z -= dt * speed; } });
  },
});
