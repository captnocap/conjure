import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, blend, paint, type P3 } from './tundra';

const SIGNS = { none: '', number: 'БУРОВАЯ № 37', danger: 'ОПАСНО!', glory: 'СЛАВА ТРУДУ', star: '★' } as const;

export default defineThing({
  questions: {
    stance: choice('How does the derrick stand now?', {
      upright: 'Still dead upright, as if the crew might come back.',
      leaning: 'Leaning hard to one side as the ground thaws under one foot.',
      broken: 'Snapped partway up, its top folded over and hanging.',
      fallen: 'The whole tower lies full length on the ground beside its base.',
    }),
    height: score('How tall was it built?', ['A squat workover mast', 'A standard exploration rig', 'A towering deep-drilling derrick']),
    paint: choice('What is left of its finish?', {
      rust: 'Bare steel gone entirely to red-brown rust.',
      green: 'Flaking Soviet machine green over rust.',
      hazard: 'Faded yellow with black bands, a warning nobody reads.',
      grey: 'Dull galvanised grey, weather-streaked.',
    }),
    drums: score('How many fuel drums lie around it?', ['A handful by the base', 'A few dozen scattered', 'A whole rusting field of them']),
    camp: choice('What else did the crew leave?', {
      cabin: 'A crew cabin on skids, door hanging open.',
      pipes: 'A rack of drill pipe, never used.',
      wellhead: 'A capped wellhead: a red valve tree with handwheels.',
      carrier: 'The carcass of a tracked carrier, sunk to its hull.',
    }),
    sign: choice('What does the plate on the base say?', {
      none: 'There is no plate.',
      number: 'The rig number in Cyrillic.',
      danger: 'DANGER, in red Cyrillic.',
      glory: 'A slogan: GLORY TO LABOUR.',
      star: 'Only a painted red star.',
    }),
    ground: choice('What has it done to the ground?', {
      nothing: 'Nothing visible.',
      oil: 'A black pool of spilled oil that never dried.',
      sump: 'A flooded drilling sump, grey-green water.',
      slabs: 'A track of cracked concrete road slabs leading in.',
    }),
    tenant: choice('What has moved in since?', {
      nobody: 'Nothing.',
      raven: 'A raven on a stick nest at the very top.',
      flag: 'A wind-torn red flag still on its pole.',
      snow: 'Snow, drifted against the base and capping every ledge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(15, 34, a.height), y0 = 3, w0 = mix(2.3, 3.4, a.height), w1 = 0.75;
    const sections = Math.round(mix(6, 10, a.height));
    const rust = '#7c4326';
    const base = { rust: '#8b4a28', green: '#5f7d5a', hazard: '#c9a227', grey: '#8d9396' }[a.paint];
    const steel = (index = 0) => {
      const c = blend(base, rust, mix(0.15, 0.85, mood.wear) * (0.5 + random()));
      if (a.paint === 'hazard' && index % 2) c.lerp(new THREE.Color('#26221f'), 0.75);
      return c.offsetHSL(0, 0, (random() - 0.5) * 0.06);
    };
    const dark = '#2e2a27';

    const lower = new Batch(), upper = new Batch();
    const breakAt = a.stance === 'broken' ? Math.round(sections * mix(0.45, 0.65, random())) : sections;
    const corner = (i: number, f: number): P3 => {
      const h = mix(w0, w1, f), k = ((i % 4) + 4) % 4;
      return [[-1, 1, 1, -1][k] * h, y0 + f * H, [-1, -1, 1, 1][k] * h];
    };
    for (let sec = 0; sec < sections; sec++) {
      const f0 = sec / sections, f1 = (sec + 1) / sections, b = sec < breakAt ? lower : upper;
      for (let i = 0; i < 4; i++) {
        b.rod(corner(i, f0), corner(i, f1), 0.13, 0.13, steel(sec), 4);
        b.rod(corner(i, f1), corner(i + 1, f1), 0.07, 0.07, steel(sec), 4);
        if (random() > mood.wear * 0.3) b.rod(corner(i, f0), corner(i + 1, f1), 0.05, 0.05, steel(sec), 4);
        if (random() > mood.wear * 0.3) b.rod(corner(i + 1, f0), corner(i, f1), 0.05, 0.05, steel(sec), 4);
      }
    }
    // Ladder up the front face and the derrickman's board two thirds up.
    const front = (f: number, dx: number): P3 => [dx, y0 + f * H, mix(w0, w1, f) + 0.12];
    const ladderTop = Math.min(1, breakAt / sections);
    for (const dx of [-0.3, 0.3]) lower.rod(front(0, dx), front(ladderTop, dx * 0.6), 0.035, 0.035, steel(), 4);
    for (let i = 1; i < 16; i++) lower.rod(front(i / 16 * ladderTop, -0.3 + i * 0.007), front(i / 16 * ladderTop, 0.3 - i * 0.007), 0.025, 0.025, steel(), 4);
    const board = breakAt / sections > 0.64 ? lower : upper, by = y0 + 0.62 * H, bw = mix(w0, w1, 0.62);
    board.box([bw * 1.6, 0.12, 1.5], [0, by, bw + 0.75], steel());
    for (const dx of [-1, 1]) { board.rod([dx * bw * 0.8, by, bw + 1.5], [dx * bw * 0.8, by + 1.1, bw + 1.5], 0.035, 0.035, steel(), 4); board.rod([dx * bw * 0.8, by + 1.1, bw], [dx * bw * 0.8, by + 1.1, bw + 1.5], 0.03, 0.03, steel(), 4); }
    board.rod([-bw * 0.8, by + 1.1, bw + 1.5], [bw * 0.8, by + 1.1, bw + 1.5], 0.03, 0.03, steel(), 4);
    // Crown block: platform, gin pole and sheave.
    const top = y0 + H;
    upper.box([w1 * 2.8, 0.25, w1 * 2.8], [0, top + 0.12, 0], steel());
    for (const dx of [-1, 1]) upper.rod([dx * w1 * 1.2, top + 0.2, 0], [0, top + 2.6, 0], 0.08, 0.06, steel(), 4);
    upper.add(new THREE.TorusGeometry(0.55, 0.12, 5, 14), dark, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(0, top + 1.1, 0));
    if (a.tenant === 'raven') {
      for (let i = 0; i < 26; i++) { const t = random() * 6.283, r = 0.3 + random() * 0.7; upper.rod([Math.cos(t) * r, top + 0.3 + random() * 0.3, Math.sin(t) * r], [Math.cos(t + 1.8) * r, top + 0.35 + random() * 0.35, Math.sin(t + 1.8) * r], 0.035, 0.02, '#4a3a2b', 3); }
      upper.ball([0.42, 0.3, 0.26], [0, top + 3.0, 0.1], '#151416', [0, 0, 0.5], 8);
      upper.ball([0.17, 0.16, 0.15], [0.33, top + 3.3, 0.1], '#151416', undefined, 7);
      upper.rod([0.42, top + 3.3, 0.1], [0.68, top + 3.24, 0.1], 0.06, 0.01, '#2a2826', 4);
      upper.rod([-0.3, top + 2.85, 0.1], [-0.8, top + 2.6, 0.1], 0.12, 0.03, '#151416', 4);
    }
    if (a.tenant === 'flag') upper.rod([w1, top + 0.2, w1], [w1, top + 5, w1], 0.05, 0.035, dark, 4);

    // How the tower stands.
    const lean = a.stance === 'leaning' ? mix(0.13, 0.26, mix(random(), 1, mood.wear * 0.5)) : (random() - 0.5) * 0.02;
    let towerM = new THREE.Matrix4().makeRotationZ(-lean);
    if (a.stance === 'fallen') towerM = new THREE.Matrix4().makeTranslation(w0, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(-(Math.PI / 2 + 0.085))).multiply(new THREE.Matrix4().makeRotationY(0.25)).multiply(new THREE.Matrix4().makeTranslation(-w0 * 0.2, -y0 + 0.4, 0));
    const pivotF = breakAt / sections, pivot = corner(1, pivotF);
    const fold = new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2] + mix(w0, w1, pivotF)).multiply(new THREE.Matrix4().makeRotationZ(-mix(1.9, 2.5, random()))).multiply(new THREE.Matrix4().makeRotationX((random() - 0.5) * 0.3)).multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2] - mix(w0, w1, pivotF)));
    const all = new Batch();
    all.adopt(lower.geometry(), towerM);
    all.adopt(upper.geometry(), a.stance === 'broken' ? towerM.clone().multiply(fold) : towerM);

    // Substructure: the drill floor on braced legs, with the pipe slide down the front.
    {
      const sink = a.stance === 'leaning' ? lean * w0 : 0;
      for (let i = 0; i < 4; i++) {
        const [x, , z] = corner(i, 0), [nx, , nz] = corner(i + 1, 0);
        all.box([0.3, y0, 0.3], [x, y0 / 2 - (x > 0 ? sink : 0), z], steel());
        all.rod([x, 0.2, z], [nx, y0 - 0.3, nz], 0.06, 0.06, steel(), 4);
        all.rod([nx, 0.2, nz], [x, y0 - 0.3, z], 0.06, 0.06, steel(), 4);
      }
      all.box([w0 * 2 + 0.8, 0.3, w0 * 2 + 0.8], [0, y0 - sink * 0.5, 0], blend('#4a4642', rust, mood.wear * 0.6), [0, 0, -lean * 0.6]);
      all.box([1.5, 0.12, y0 * 2.1], [0, y0 / 2, w0 + 0.4 + y0 * 0.9], steel(), [0.5, 0, 0]);
      all.drum(0.28, 1.2, [0, y0 + 0.75, 0], dark, undefined, 8);
    }

    // Fuel drums: a few upright clusters, most toppled and half sunk.
    const drumCount = Math.round(mix(6, 70, a.drums) * mix(0.75, 1.25, mood.density));
    const reach = mix(w0 + 4, w0 + 10, a.drums);
    const drumTints = ['#8b4a28', '#9a5b30', '#6f3a22', '#a33a2a', '#7c4326', '#3f6a8c', '#b89a3a', '#8b4a28', '#7d7f80'];
    const heart = { x: reach * 0.45 * (random() < 0.5 ? -1 : 1), z: reach * 0.4 };
    for (let i = 0; i < drumCount; i++) {
      const clustered = random() < 0.6;
      const angle = random() * 6.283, d = clustered ? random() * reach * 0.5 : w0 + 2 + random() * (reach - w0 - 2);
      let x = clustered ? heart.x + Math.cos(angle) * d : Math.cos(angle) * d, z = clustered ? heart.z + Math.sin(angle) * d * 0.7 : Math.sin(angle) * d * 0.8 + 2;
      if (Math.abs(x) < w0 + 1.2 && Math.abs(z) < w0 + 1.2) { x += Math.sign(x || 1) * (w0 + 1.5); z += 1; }
      const tint = blend(drumTints[Math.floor(random() * drumTints.length)], rust, mix(0.2, 0.9, mood.wear) * random());
      const upright = random() < mix(0.4, 0.12, mood.wear);
      if (upright) all.drum(0.4, 1.2, [x, 0.6, z], tint, undefined, 10);
      else {
        const sunk = random() < 0.3 ? 0.12 : 0;
        all.drum(0.4, 1.2, [x, 0.4 - sunk, z], tint, [Math.PI / 2 + (sunk ? 0.25 : 0), 0, random() * Math.PI], 10);
      }
    }

    // What the crew left.
    const cx = -(w0 + 4.6), cz = 1.5;
    if (a.camp === 'cabin') {
      const wall = blend('#6f8f8c', rust, mix(0.2, 0.75, mood.wear));
      all.box([5.2, 2.4, 2.5], [cx, 1.65, cz], wall, [0, 0.25, 0]);
      all.box([5.5, 0.14, 2.8], [cx, 2.92, cz], blend('#55524d', rust, mood.wear * 0.5), [0, 0.25, 0.03]);
      for (const dz of [-0.9, 0.9]) all.box([5.8, 0.25, 0.25], [cx + dz * 0.25, 0.3, cz + dz], dark, [0, 0.25, 0]);
      all.box([0.9, 1.8, 0.06], [cx + 1.1, 1.45, cz + 1.02], dark, [0, 0.25, 0]);
      all.box([0.85, 1.75, 0.05], [cx + 1.85, 1.45, cz + 1.25], blend('#8fa8a4', rust, mood.wear * 0.5), [0, 1.3, 0]);
      all.box([1.0, 0.7, 0.06], [cx - 1.1, 1.9, cz + 1.57], '#1f2529', [0, 0.25, 0]);
      all.rod([cx - 1.6, 2.9, cz], [cx - 1.6, 4.1, cz], 0.09, 0.09, dark, 6);
    } else if (a.camp === 'pipes') {
      for (const dx of [-3, 3]) { all.box([0.2, 1.0, 2.8], [cx + dx, 0.5, cz], steel()); all.box([0.25, 0.12, 3.2], [cx + dx, 1.05, cz], steel()); }
      for (let i = 0; i < 9; i++) all.rod([cx - 4.6 + random() * 0.4, 1.2 + (i > 5 ? 0.22 : 0), cz - 1.2 + (i % 6) * 0.48 + (i > 5 ? 0.24 : 0)], [cx + 4.6, 1.2 + (i > 5 ? 0.22 : 0), cz - 1.2 + (i % 6) * 0.48 + (i > 5 ? 0.24 : 0)], 0.11, 0.11, blend('#5d5a56', rust, random()), 6);
      all.rod([cx - 2, 0.12, cz + 2.2], [cx + 5, 0.12, cz + 3.0], 0.11, 0.11, rust, 6);
    } else if (a.camp === 'wellhead') {
      const red = blend('#b3261f', rust, mood.wear * 0.6);
      all.drum(0.9, 0.3, [cx + 2, 0.15, cz + 2], '#8d8a84', undefined, 12);
      all.drum(0.22, 3.2, [cx + 2, 1.6, cz + 2], red, undefined, 8);
      for (const y of [0.9, 1.7, 2.5]) all.drum(0.38, 0.14, [cx + 2, y, cz + 2], red, undefined, 10);
      all.rod([cx + 0.6, 1.7, cz + 2], [cx + 3.4, 1.7, cz + 2], 0.16, 0.16, red, 8);
      for (const dx of [0.6, 3.4]) all.add(new THREE.TorusGeometry(0.36, 0.05, 5, 12), dark, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(cx + dx, 1.7, cz + 2));
      all.add(new THREE.TorusGeometry(0.4, 0.05, 5, 12), dark, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(cx + 2, 3.3, cz + 2));
    } else {
      const hull = blend('#5e6a4c', rust, mix(0.3, 0.9, mood.wear));
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.06, 0.4, -0.1)).setPosition(cx + 1, -0.25, cz + 1.5);
      const wreck = new Batch();
      wreck.box([5.6, 0.9, 2.5], [0, 1.0, 0], hull);
      wreck.box([1.9, 1.0, 2.3], [1.6, 1.9, 0], hull);
      wreck.box([0.05, 0.55, 1.9], [2.57, 2.0, 0], '#1f2529');
      wreck.box([3.2, 0.1, 2.5], [-1.1, 1.5, 0], blend(hull, '#000000', 0.2));
      for (const z of [-1.25, 1.25]) { wreck.box([5.9, 0.5, 0.42], [0, 0.45, z], dark); for (let i = 0; i < 6; i++) wreck.drum(0.36, 0.3, [-2.4 + i * 0.96, 0.5, z], '#3a3632', [Math.PI / 2, 0, 0], 8); }
      all.adopt(wreck.geometry(), m);
    }
    if (a.ground === 'slabs') for (let i = 0; i < 3; i++) all.box([3.2, 0.2, 5.6], [(random() - 0.5) * 0.5 + 0.5, 0.06 + random() * 0.08, w0 + 4 + i * 3.3], blend('#a9a69c', '#8b8275', random() * 0.5), [(random() - 0.5) * 0.06, Math.PI / 2 + (random() - 0.5) * 0.12, (random() - 0.5) * 0.05]);
    if (a.tenant === 'snow') {
      all.box([w0 * 2 + 0.9, 0.22, w0 * 2 + 0.9], [0, y0 + 0.28, 0], '#f3f5f4');
      for (let i = 0; i < 9; i++) { const t = random() * 6.283; all.ball([2 + random() * 2.5, 0.5 + random() * 0.6, 1.4 + random()], [Math.cos(t) * (w0 + 1.5), 0, Math.sin(t) * (w0 + 1.5)], '#f3f5f4', [0, random() * 3, 0], 9); }
    }
    s.root.add(all.mesh(paint(mood.wear, { side: THREE.DoubleSide, metalness: 0.15 })));

    if (a.sign !== 'none') {
      const star = a.sign === 'star';
      const plate = s.label(SIGNS[a.sign], star ? 1.9 : 4.6, star ? 1.9 : 1.15, [0, 1.75, w0 + 0.32], a.sign === 'number' ? '#1f2529' : '#b3261f', star ? '#d9d2bd' : '#e3ddc8');
      plate.rotation.z = (random() - 0.5) * 0.12 * (1 + mood.wear * 2);
    }
    const pool = (color: string, rough: number, metal: number, rx: number, rz: number, x: number, z: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 20; i++) { const t = (i / 20) * 6.283, r = 1 + Math.sin(t * 3 + rx) * 0.16 + Math.sin(t * 5 + rz) * 0.1; if (i) shape.lineTo(Math.cos(t) * r * rx, Math.sin(t) * r * rz); else shape.moveTo(Math.cos(t) * r * rx, Math.sin(t) * r * rz); }
      const mesh = s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }), [x, 0.04, z]);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = false;
    };
    if (a.ground === 'oil') pool('#15120f', 0.08, 0.6, 4, 2.4, w0 + 2, w0 + 3);
    if (a.ground === 'sump') pool('#5f6f62', 0.15, 0.3, 4.6, 2.8, w0 + 3, -w0 + 0.5);

    // A red flag that still moves, and the travelling block swinging on its cable.
    let flag: THREE.Mesh | null = null, block: THREE.Group | null = null;
    if (a.tenant === 'flag') {
      const g = new THREE.PlaneGeometry(3.2, 1.8, 6, 3);
      g.translate(1.6, 0, 0);
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) if (pos.getX(i) > 2.4 && random() < 0.5 + mood.wear * 0.4) pos.setX(i, pos.getX(i) - random() * 1.2);
      flag = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: blend('#c22b22', '#8e6a5c', mood.wear * 0.7), side: THREE.DoubleSide, roughness: 0.9 }));
      flag.castShadow = true;
      const holder = new THREE.Group();
      holder.applyMatrix4(a.stance === 'broken' ? towerM.clone().multiply(fold) : towerM);
      flag.position.set(w1, top + 4.0, w1);
      holder.add(flag);
      s.root.add(holder);
    }
    if (a.stance === 'upright' || a.stance === 'leaning') {
      block = new THREE.Group();
      const hang = H * mix(0.35, 0.6, random());
      const metal = s.material(blend('#c9a227', rust, mood.wear * 0.8), { metalness: 0.3 });
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hang, 4), s.material(dark));
      cable.position.y = -hang / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.5), metal);
      body.position.y = -hang - 0.6;
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 5, 10, Math.PI * 1.4), s.material(dark));
      hook.position.y = -hang - 1.5;
      for (const m of [cable, body, hook]) { m.castShadow = true; block.add(m); }
      const anchor = new THREE.Vector3(0, top + 0.6, 0).applyMatrix4(towerM);
      block.position.copy(anchor);
      s.root.add(block);
    }
    const speed = mix(0.2, 1.6, mood.energy);
    return s.finish({
      footprint: Math.max(reach, w0 + 9.5) + 1,
      update: (_dt, time) => {
        if (block) { block.rotation.z = Math.sin(time * speed * 0.8) * 0.05 * (0.4 + mood.energy); block.rotation.x = Math.cos(time * speed * 0.6) * 0.03; }
        if (flag) { flag.rotation.y = Math.sin(time * speed * 2.2) * 0.35 - 0.3; flag.rotation.z = -0.12 + Math.sin(time * speed * 3.1) * 0.05; }
      },
    });
  },
});
