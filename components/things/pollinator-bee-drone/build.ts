import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Bit = { p: V3; s: V3; r?: V3; c?: THREE.ColorRepresentation };

function bits(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Bit[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((b, i) => {
    e.set(...(b.r ?? [0, 0, 0]), 'YXZ');
    m.compose(v.set(...b.p), q.setFromEuler(e), sc.set(...b.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(b.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

type Bee = {
  mode: 'fly' | 'still' | 'path';
  c: V3; r: V3; f: V3; ph: V3;
  yaw: number; tilt: number; roll: number; size: number; rate: number; real: boolean; buzz: number;
};

export default defineThing({
  questions: {
    activity: choice('What are the bee drones doing right now?', {
      working: 'Working: a busy loose cloud, shuttling between hive and blossoms.',
      dormant: 'Dormant: nearly all of them docked in their cells, lights low.',
      swarm: 'Swarming: packed into one dense hanging ball beneath the hive.',
      stream: 'Coming home: a single long line of them arcing back into the hive.',
      failing: 'Failing: half of them dropped on the ground, the rest flying in jerks, warning lights red.',
    }),
    real: choice('Are there real bees among them?', {
      none: 'None: every one is a machine.',
      few: 'A few fuzzy real bees fly with the drones.',
      half: 'About half are real, the two kinds working side by side.',
      takeover: 'Real bees have taken the hive back and hung wax comb beneath it; only a few drones remain.',
    }),
    hive: choice('What is the docking hive like?', {
      hex: 'A stacked tower of hexagonal charging cells with a peaked roof.',
      skep: 'A coiled straw skep with brass fittings, old craft over new machine.',
      box: 'A white wooden box hive retrofitted with a strip of charging lights.',
      pod: 'A smooth pale egg-shaped pod with a ring of ports.',
    }),
    build: choice('How are the drones built?', {
      brass: 'Brass clockwork with amber eyes.',
      ceramic: 'White ceramic shells with blue lights.',
      enamel: 'Glossy yellow and black enamel, toy-bright.',
      scrap: 'Mismatched and repaired from scrap, no two alike.',
    }),
    post: score('How high does the hive sit?', ['Directly on a low block', 'On a knee-high stub', 'On a chest-high post', 'On a tall pole above head height']),
    blossom: choice('What blooms at its foot?', {
      nothing: 'Nothing.',
      lavender: 'A pot of purple lavender.',
      squash: 'A tray of big yellow squash blossoms.',
      clover: 'A patch of white and pink clover.',
      apple: 'A cut branch of pale apple blossom in a jar.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const steel = s.material('#8e999c', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#272c2f', { roughness: 0.7 });
    const brass = s.material('#c49a3c', { metalness: 0.8, roughness: 0.3 });

    const P = mix(0.12, 1.75, a.post);
    const failing = a.activity === 'failing';
    const statusHex = failing ? '#ff3b2a' : a.activity === 'dormant' ? '#4f7dff' : a.activity === 'swarm' ? '#ffb02a' : '#5fe07a';
    const status = new THREE.MeshStandardMaterial({ color: statusHex, emissive: statusHex, emissiveIntensity: a.activity === 'dormant' ? 0.9 : mix(1.4, 2.6, mood.cheer) });

    // Post and foot.
    if (a.post < 0.12) s.box([0.5, P, 0.5], [0, P / 2, 0], s.material('#9a968a'));
    else {
      s.cylinder(0.03, 0.04, P, [0, P / 2, 0], steel, 12);
      s.cylinder(0.2, 0.24, 0.05, [0, 0.025, 0], dark, 16);
      for (let i = 0; i < 3; i++) s.rod([Math.sin(i * 2.094) * 0.2, 0.05, Math.cos(i * 2.094) * 0.2], [0, Math.min(0.4, P * 0.5), 0], 0.012, steel);
      s.cylinder(0.14, 0.03, 0.06, [0, P - 0.03, 0], steel, 12);
      if (P > 0.9) { s.box([0.1, 0.14, 0.05], [0, P * 0.55, 0.05], dark); s.ball([0.014, 0.014, 0.014], [0, P * 0.55 + 0.03, 0.08], status, 8); }
    }

    // Hive, and the ports the drones dock in.
    const ports: { p: V3; yaw: number }[] = [];
    let hiveTop = P, hiveMid = P + 0.25, hiveR = 0.22;
    if (a.hive === 'hex') {
      const tiers = 3;
      const shell = s.material('#e9e4d2', { roughness: 0.5 });
      for (let t = 0; t < tiers; t++) {
        const y = P + 0.09 + t * 0.17;
        s.cylinder(0.23, 0.23, 0.15, [0, y, 0], t % 2 ? s.material('#e0b030') : shell, 6).rotation.y = Math.PI / 6;
        s.cylinder(0.245, 0.245, 0.02, [0, y + 0.085, 0], dark, 6).rotation.y = Math.PI / 6;
        for (let k = 0; k < 6; k++) { const yaw = k * Math.PI / 3; ports.push({ p: [Math.sin(yaw) * 0.2, y, Math.cos(yaw) * 0.2], yaw }); }
      }
      hiveTop = P + 0.02 + tiers * 0.17;
      s.mesh(new THREE.ConeGeometry(0.29, 0.16, 6), s.material('#5f7f6a', { metalness: 0.4 }), [0, hiveTop + 0.08, 0]).rotation.y = Math.PI / 6;
      s.rod([0, hiveTop + 0.16, 0], [0, hiveTop + 0.34, 0], 0.006, steel);
      s.ball([0.02, 0.02, 0.02], [0, hiveTop + 0.35, 0], status, 8);
      hiveTop += 0.36; hiveMid = P + 0.26; hiveR = 0.23;
    } else if (a.hive === 'skep') {
      const straw = s.material('#d2b062', { roughness: 0.95 });
      const prof: [number, number][] = [[0.24, 0], [0.26, 0.08], [0.25, 0.2], [0.2, 0.32], [0.12, 0.4], [0, 0.43]];
      s.lathe(prof, straw, [0, P + 0.03, 0]);
      for (let k = 0; k < 9; k++) { const y = 0.03 + k * 0.045; const r = k < 2 ? 0.25 + k * 0.006 : k < 5 ? 0.262 - (k - 2) * 0.012 : 0.215 - (k - 5) * 0.045; s.ring(Math.max(r, 0.03), 0.022, [0, P + 0.03 + y, 0], s.material(k % 2 ? '#c49c4e' : '#dcbc70', { roughness: 0.95 })).rotation.x = Math.PI / 2; }
      s.cylinder(0.3, 0.3, 0.03, [0, P + 0.015, 0], s.material('#8a6a42'), 20);
      for (let k = 0; k < 8; k++) { const yaw = k * Math.PI / 4 + 0.2, y = P + 0.12 + (k % 2) * 0.12, r = k % 2 ? 0.235 : 0.265; ports.push({ p: [Math.sin(yaw) * r, y, Math.cos(yaw) * r], yaw }); }
      s.ring(0.07, 0.012, [0, P + 0.09, 0.262], brass);
      s.ball([0.02, 0.02, 0.02], [0, P + 0.47, 0], status, 8);
      s.cylinder(0.012, 0.03, 0.03, [0, P + 0.45, 0], brass, 8);
      hiveTop = P + 0.49; hiveMid = P + 0.22; hiveR = 0.27;
    } else if (a.hive === 'box') {
      const paintMat = s.material(pick(['#f1efe6', '#bcd6d0', '#f0dca0']), { roughness: 0.7 });
      const n = 2 + Math.floor(random() * 2);
      for (let t = 0; t < n; t++) {
        const y = P + 0.1 + t * 0.2;
        s.box([0.46, 0.19, 0.4], [0, y, 0], paintMat);
        s.box([0.14, 0.03, 0.01], [0, y + 0.03, 0.203], dark);
        for (let k = 0; k < 4; k++) { ports.push({ p: [-0.165 + k * 0.11, y - 0.04, 0.2], yaw: 0 }); if (t === 0) ports.push({ p: [0.23, y - 0.02, -0.12 + k * 0.08], yaw: Math.PI / 2 }); }
      }
      hiveTop = P + n * 0.2;
      s.box([0.54, 0.035, 0.48], [0, hiveTop + 0.02, 0], s.material('#9aa3a4', { metalness: 0.7, roughness: 0.4 }));
      s.box([0.5, 0.02, 0.14], [0, P + 0.01, 0.26], paintMat);
      s.box([0.44, 0.02, 0.012], [0, P + 0.03, 0.205], status);
      hiveTop += 0.04; hiveMid = P + n * 0.1; hiveR = 0.3;
    } else {
      const shell = s.material('#eef0ea', { roughness: 0.3 });
      s.lathe([[0, 0], [0.12, 0.02], [0.22, 0.12], [0.25, 0.26], [0.2, 0.42], [0.1, 0.52], [0, 0.55]], shell, [0, P, 0]);
      s.ring(0.252, 0.012, [0, P + 0.27, 0], status).rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) { const yaw = k * Math.PI / 4; ports.push({ p: [Math.sin(yaw) * 0.225, P + 0.15, Math.cos(yaw) * 0.225], yaw }); ports.push({ p: [Math.sin(yaw + 0.39) * 0.21, P + 0.4, Math.cos(yaw + 0.39) * 0.21], yaw: yaw + 0.39 }); }
      hiveTop = P + 0.55; hiveMid = P + 0.27; hiveR = 0.25;
    }
    bits(s.root, (() => { const g = new THREE.CylinderGeometry(0.036, 0.036, 0.03, 10); g.rotateX(Math.PI / 2); return g; })(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), ports.map((port) => ({ p: port.p, s: [1, 1, 1] as V3, r: [0, port.yaw, 0] as V3, c: '#1a1d1f' })));

    // Wax comb when the real bees have taken over.
    if (a.real === 'takeover') {
      const wax = s.material('#e8b93a', { roughness: 0.5, emissive: '#b97a10', emissiveIntensity: 0.25 });
      for (let k = 0; k < 4; k++) s.ball(a.post < 0.3 ? [rr(0.05, 0.07), rr(0.08, 0.12), 0.03] : [rr(0.07, 0.11), rr(0.12, 0.2), 0.035], a.post < 0.3 ? [(k - 1.5) * 0.09, hiveMid - 0.02, hiveR + 0.02 - Math.abs(k - 1.5) * 0.02] : [rr(-0.12, 0.12), P - rr(0.02, 0.1), (k - 1.5) * 0.07], wax, 12);
      if (a.post >= 0.3) s.rod([0.05, P - 0.2, 0], [0.05, P - 0.36, 0], 0.008, wax, 0.003);
    }

    // Blossoms at the foot.
    const fx = 0.5, fz = 0.38;
    let flowerTop: V3 | null = null;
    const petals: Bit[] = [], stalks: Bit[] = [];
    const wilt = mood.wear > 0.75;
    if (a.blossom === 'lavender') {
      s.cylinder(0.14, 0.1, 0.2, [fx, 0.1, fz], s.material('#b96a48'), 16);
      for (let k = 0; k < 26; k++) {
        const ang = rr(0, 6.283), lean = rr(0, 0.5), len = rr(0.25, 0.45);
        stalks.push({ p: [fx, 0.2, fz], s: [0.005, len, 0.005], r: [lean, ang, 0], c: '#6f9a5a' });
        for (let j = 0; j < 4; j++) { const d = len * (0.7 + j * 0.1); petals.push({ p: [fx + Math.sin(ang) * Math.sin(lean) * d, 0.2 + Math.cos(lean) * d, fz + Math.cos(ang) * Math.sin(lean) * d], s: [0.016, 0.022, 0.016], c: wilt ? '#7a6f80' : pick(['#8a5ad0', '#a074e0', '#6f48b8']) }); }
      }
      flowerTop = [fx, 0.6, fz];
    } else if (a.blossom === 'squash') {
      s.box([0.6, 0.12, 0.34], [fx, 0.06, fz], s.material('#6f5a48'));
      for (let k = 0; k < 9; k++) {
        const x = fx + rr(-0.26, 0.26), z = fz + rr(-0.13, 0.13), y = rr(0.16, 0.3);
        petals.push({ p: [x, y - 0.03, z], s: [0.11, 0.012, 0.09], r: [rr(-0.4, 0.4), rr(0, 6), rr(-0.4, 0.4)], c: pick(['#3f8a3a', '#57a044']) });
        if (k < 5) { for (let j = 0; j < 5; j++) petals.push({ p: [x + Math.sin(j * 1.257) * 0.04, y + 0.03, z + Math.cos(j * 1.257) * 0.04], s: [0.03, 0.012, 0.055], r: [-0.5, j * 1.257, 0], c: wilt ? '#a8904a' : '#f6c21e' }); petals.push({ p: [x, y + 0.035, z], s: [0.018, 0.02, 0.018], c: '#f28a1e' }); }
      }
      flowerTop = [fx, 0.34, fz];
    } else if (a.blossom === 'clover') {
      for (let k = 0; k < 70; k++) {
        const ang = rr(0, 6.283), d = Math.sqrt(random()) * 0.42, x = fx * 0.6 + Math.sin(ang) * d, z = fz + 0.1 + Math.cos(ang) * d * 0.7;
        petals.push({ p: [x, 0.02 + rr(0, 0.03), z], s: [0.03, 0.01, 0.03], r: [rr(-0.3, 0.3), 0, rr(-0.3, 0.3)], c: pick(['#4f9a40', '#3f8538', '#6ab04a']) });
        if (k % 4 === 0) { const h = rr(0.06, 0.12); stalks.push({ p: [x, 0, z], s: [0.004, h, 0.004], c: '#6f9a5a' }); petals.push({ p: [x, h + 0.015, z], s: [0.022, 0.022, 0.022], c: wilt ? '#b9a98a' : pick(['#f6f1ea', '#f0b8cf', '#e99ac0']) }); }
      }
      flowerTop = [fx * 0.6, 0.16, fz + 0.1];
    } else if (a.blossom === 'apple') {
      s.cylinder(0.07, 0.06, 0.2, [fx, 0.1, fz], new THREE.MeshPhysicalMaterial({ color: '#cfe8ee', transparent: true, opacity: 0.6, roughness: 0.1 }), 14);
      const bark = s.material('#5f4632');
      const tips: V3[] = [];
      const branch = (from: V3, dir: V3, len: number, depth: number) => {
        const to: V3 = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
        s.rod(from, to, 0.012 - depth * 0.003, bark, 0.009 - depth * 0.003);
        tips.push(to);
        if (depth < 2) for (let k = 0; k < 2; k++) branch(to, [dir[0] + rr(-0.6, 0.6), dir[1] + rr(-0.2, 0.3), dir[2] + rr(-0.6, 0.6)], len * 0.7, depth + 1);
      };
      branch([fx, 0.05, fz], [rr(-0.15, 0.15), 1, rr(-0.15, 0.15)], 0.36, 0);
      for (const tip of tips) for (let j = 0; j < 6; j++) petals.push({ p: [tip[0] + rr(-0.06, 0.06), tip[1] + rr(-0.08, 0.05), tip[2] + rr(-0.06, 0.06)], s: [0.028, 0.02, 0.028], c: wilt ? '#c9b9a0' : pick(['#fbe9ee', '#f6c9d8', '#ffffff', '#7fb04a']) });
      flowerTop = [fx, 0.65, fz];
    }
    const stalkGeo = new THREE.BoxGeometry(1, 1, 1); stalkGeo.translate(0, 0.5, 0);
    bits(s.root, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), petals);
    bits(s.root, stalkGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), stalks);

    // The swarm.
    const N = Math.round(mix(14, 56, mood.density));
    const realShare = { none: 0, few: 0.14, half: 0.5, takeover: 0.85 }[a.real];
    const freePorts = ports.slice().sort(() => random() - 0.5);
    const bees: Bee[] = [];
    const hc: V3 = [0, hiveMid, 0];
    const ballC: V3 = a.post > 0.3 ? [0.02, P - 0.2, 0.02] : [0, hiveTop + 0.14, 0];
    const far: V3 = [-1.0, Math.max(0.5, hiveMid - 0.3), 0.7];
    for (let i = 0; i < N; i++) {
      const real = random() < realShare;
      const u = random();
      const base = { yaw: rr(0, 6.283), tilt: 0, roll: 0, size: (real ? 0.068 : 0.086) * rr(0.85, 1.15), rate: rr(0.6, 1.5), real, buzz: rr(0, 6.283), f: [rr(0.7, 1.6), rr(0.9, 2.2), rr(0.7, 1.6)] as V3, ph: [rr(0, 6.283), rr(0, 6.283), rr(0, 6.283)] as V3 };
      const dock = (): Bee | null => {
        const port = freePorts.pop();
        if (!port) return null;
        return { ...base, mode: 'still', c: [port.p[0] + Math.sin(port.yaw) * 0.035, port.p[1], port.p[2] + Math.cos(port.yaw) * 0.035], r: [0, 0, 0], yaw: port.yaw + Math.PI, tilt: 0 };
      };
      const roam = (centre: V3, lo: number, hi: number): Bee => ({ ...base, mode: 'fly', c: [centre[0], centre[1] + rr(-0.1, 0.2), centre[2]], r: [rr(lo, hi), rr(0.08, 0.3), rr(lo, hi)] });
      const fallen = (): Bee => { const ang = rr(0, 6.283), d = rr(0.25, 0.8); return { ...base, mode: 'still', c: [Math.sin(ang) * d, 0.02, Math.cos(ang) * d], r: [0, 0, 0], tilt: rr(-0.3, 0.3), roll: random() < 0.6 ? rr(2.2, 3.6) : rr(-0.9, 0.9) }; };
      let bee: Bee | null = null;
      if (a.activity === 'working') bee = u < 0.22 ? dock() : u < 0.62 || !flowerTop ? roam(hc, hiveR + 0.12, 0.75) : roam(flowerTop, 0.1, 0.35);
      else if (a.activity === 'dormant') bee = u < 0.9 ? dock() ?? { ...base, mode: 'still', c: [rr(-0.12, 0.12), hiveTop - (a.hive === 'box' ? 0 : 0.28) + 0.02, rr(-0.1, 0.1) + (a.hive === 'box' ? 0 : hiveR * 0.6)], r: [0, 0, 0] } : roam(hc, hiveR + 0.1, 0.4);
      else if (a.activity === 'swarm') bee = u < 0.88 ? { ...base, mode: 'fly', c: ballC, r: [rr(0.02, 0.16), rr(0.02, 0.2), rr(0.02, 0.16)], rate: rr(0.2, 0.5) } : roam(hc, 0.4, 0.8);
      else if (a.activity === 'stream') bee = u < 0.15 ? dock() : { ...base, mode: 'path', c: far, r: [rr(-0.05, 0.05), rr(-0.05, 0.05), rr(-0.05, 0.05)], ph: [i / N + rr(-0.02, 0.02), 0, 0] };
      else bee = u < 0.45 ? fallen() : u < 0.6 ? dock() : { ...roam(hc, hiveR + 0.05, 0.5), rate: rr(2, 4) };
      bees.push(bee ?? roam(hc, hiveR + 0.1, 0.6));
    }

    const shellHex = (i: number) => ({ brass: ['#c49a3c', '#b5843a'], ceramic: ['#f1f1ec', '#e3e8ea'], enamel: ['#f6c21e', '#f6c21e'], scrap: ['#8a9a9c', '#b5643a', '#4f6a8a', '#d9d4c4', '#6a7a4a'] }[a.build].at(i % ({ brass: 2, ceramic: 2, enamel: 2, scrap: 5 }[a.build])))!;
    const bandHex = { brass: '#3a2c1c', ceramic: '#5f8fd8', enamel: '#16181a', scrap: '#22262a' }[a.build];
    const eyeHex = failing ? '#ff3b2a' : { brass: '#ffb02a', ceramic: '#5fb8ff', enamel: '#ffffff', scrap: '#7fe07a' }[a.build];
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, n = N) => { const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.castShadow = true; mesh.frustumCulled = false; s.root.add(mesh); return mesh; };
    const thorax = mk(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: a.build === 'brass' ? 0.7 : 0.3, roughness: 0.35 }));
    const abdomen = mk(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: a.build === 'brass' ? 0.7 : 0.2, roughness: 0.35 }));
    const band = mk(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }));
    const eyes = mk(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: eyeHex, emissiveIntensity: a.activity === 'dormant' ? 0.6 : 2.2 }));
    const wingGeo = new THREE.CircleGeometry(1, 10); wingGeo.rotateX(-Math.PI / 2); wingGeo.scale(0.62, 1, 0.24); wingGeo.translate(0.62, 0, 0);
    const wings = mk(wingGeo, new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.75, roughness: 0.2, side: THREE.DoubleSide }), N * 2);
    const col = new THREE.Color();
    bees.forEach((bee, i) => {
      thorax.setColorAt(i, col.set(bee.real ? '#6b4a22' : shellHex(i)));
      abdomen.setColorAt(i, col.set(bee.real ? '#e0a020' : shellHex(i + 1)));
      band.setColorAt(i, col.set(bee.real ? '#2a1c10' : bandHex));
      eyes.setColorAt(i, col.set(bee.real ? '#000000' : eyeHex));
    });

    const speed = mix(0.35, 1.8, mood.energy);
    const M = new THREE.Matrix4(), L = new THREE.Matrix4(), T = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
    const pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const part = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      L.makeScale(sx, sy, sz).setPosition(x, y, z);
      T.multiplyMatrices(M, L);
      mesh.setMatrixAt(i, T);
    };
    const entrance: V3 = ports.length ? [ports[0].p[0], ports[0].p[1], ports[0].p[2] + 0.05] : hc;
    const pose = (time: number) => {
      bees.forEach((bee, i) => {
        let x = bee.c[0], y = bee.c[1], z = bee.c[2], yaw = bee.yaw, flap = 0, tilt = bee.tilt;
        if (bee.mode === 'fly') {
          const t = time * bee.rate * speed;
          const jerk = failing ? Math.sin(t * 7 + bee.buzz) * 0.05 : 0;
          x += Math.sin(t * bee.f[0] + bee.ph[0]) * bee.r[0] + jerk;
          y += Math.sin(t * bee.f[1] + bee.ph[1]) * bee.r[1] + jerk;
          z += Math.cos(t * bee.f[2] + bee.ph[2]) * bee.r[2];
          y = Math.max(y, 0.06);
          yaw = Math.atan2(Math.cos(t * bee.f[0] + bee.ph[0]) * bee.r[0] * bee.f[0], -Math.sin(t * bee.f[2] + bee.ph[2]) * bee.r[2] * bee.f[2]);
          flap = Math.sin(time * 70 + bee.buzz) * 0.8; tilt = -0.2;
        } else if (bee.mode === 'path') {
          const u = (((bee.ph[0] + time * 0.12 * speed) % 1) + 1) % 1, v = 1 - u;
          const lift = 0.55;
          x = v * v * bee.c[0] + 2 * u * v * (bee.c[0] + entrance[0]) / 2 + u * u * entrance[0] + bee.r[0];
          y = v * v * bee.c[1] + 2 * u * v * (Math.max(bee.c[1], entrance[1]) + lift) + u * u * entrance[1] + bee.r[1] + Math.sin(time * 5 + bee.buzz) * 0.015;
          z = v * v * bee.c[2] + 2 * u * v * (bee.c[2] + entrance[2]) / 2 + u * u * entrance[2] + bee.r[2];
          yaw = Math.atan2(entrance[0] - bee.c[0], entrance[2] - bee.c[2]);
          flap = Math.sin(time * 70 + bee.buzz) * 0.8; tilt = -0.2 + (0.5 - u) * -0.8;
        } else flap = bee.roll ? -0.2 : -0.25 + Math.sin(time * 3 + bee.buzz) * 0.05;
        e.set(tilt, yaw, bee.roll, 'YXZ');
        M.compose(pos.set(x, y, z), q.setFromEuler(e), scl.setScalar(bee.size));
        const fat = bee.real ? 1.25 : 1;
        part(thorax, i, 0, 0, 0.14, 0.3 * fat, 0.3 * fat, 0.34);
        part(abdomen, i, 0, -0.03, -0.38, 0.29 * fat, 0.28 * fat, 0.46);
        part(band, i, 0, -0.03, -0.34, 0.305 * fat, 0.295 * fat, 0.13);
        part(eyes, i, 0, 0.04, 0.47, bee.real ? 0.16 : 0.13, bee.real ? 0.16 : 0.13, 0.13);
        for (const side of [0, 1]) {
          e.set(0, side ? Math.PI : 0, (0.35 + flap) * 1, 'YXZ');
          L.compose(pos.set(side ? -0.12 : 0.12, 0.26, 0.08), q.setFromEuler(e), scl.set(1, 1, 1));
          T.multiplyMatrices(M, L);
          wings.setMatrixAt(i * 2 + side, T);
        }
      });
      for (const mesh of [thorax, abdomen, band, eyes, wings]) mesh.instanceMatrix.needsUpdate = true;
    };
    pose(0);
    for (const mesh of [thorax, abdomen, band, eyes]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return s.finish({
      footprint: 0.6,
      update: (_dt, time) => {
        pose(time);
        if (failing) status.emissiveIntensity = Math.sin(time * 6) > 0 ? 2.4 : 0.2;
      },
    });
  },
});
