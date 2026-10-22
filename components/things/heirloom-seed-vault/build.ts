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

export default defineThing({
  questions: {
    holds: choice('What does the vault preserve?', {
      vegetables: 'Kitchen-garden seed in paper packets with bright hand-coloured pictures.',
      grains: 'Old grains and pulses in corked glass vials, gold and brown and black.',
      flowers: 'Flower seed in pastel envelopes, kept for no reason but beauty.',
      trees: 'Tree seed: acorns, cones and winged keys in little cloth bags.',
      medicine: 'Dried medicinal herbs and roots in dark blue-glass vials.',
      empty: 'Nothing now: the labels remain but every drawer opened is bare.',
    }),
    state: choice('What state is it in?', {
      tended: 'Tended: complete, orderly, one drawer open where someone was just working.',
      catalogue: 'Mid-catalogue: many drawers pulled out at different depths.',
      raided: 'Raided: drawers yanked out and dumped on the floor, seed spilled, gaps left.',
      missing: 'Drawers missing: dark empty slots where whole varieties were lost.',
      sealed: 'Sealed: every drawer shut, a chain and wax seal across the front.',
      sprouting: 'Sprouting: damp got in and green shoots are pushing out of the drawers.',
    }),
    make: choice('What is the cabinet made of?', {
      walnut: 'Dark walnut with brass pulls and cream paper labels.',
      birch: 'Pale birch ply with finger holes, plain and modern.',
      locker: 'Green enamelled steel, a ship\'s locker with stencilled numbers.',
      lacquer: 'Black lacquer with gold labels, an old apothecary chest.',
    }),
    key: choice('What about the lock and key?', {
      inlock: 'A brass key stands in the lock with a ribbon on it.',
      hanging: 'The key hangs on a hook at the side.',
      forced: 'No key: the lock plate is bent and scratched where it was forced.',
      padlock: 'A heavy padlock on a hasp, no key in sight.',
    }),
    top: choice('What sits on top?', {
      nothing: 'Nothing.',
      scale: 'A small brass balance scale.',
      cloche: 'A single seedling in a pot under a glass cloche.',
      ledger: 'An open ledger and a pen.',
      lamp: 'A small oil lamp.',
      envelopes: 'A sorting tray of envelopes and a pair of tweezers.',
    }),
    drawers: score('How many drawers does it have?', ['A dozen deep drawers', 'A few dozen', 'Hundreds of tiny ones']),
    stand: choice('What does it stand on?', {
      legs: 'Four turned legs.',
      plinth: 'A solid plinth.',
      casters: 'A wheeled trolley frame.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const look = {
      walnut: { body: '#5a3a24', front: '#6f4a2e', pull: '#c9a24a', label: '#efe6cc', ink: '#3a2c1c', metal: 0 },
      birch: { body: '#d9c29a', front: '#e6d3ae', pull: '#3a2c1c', label: '#fbf7ea', ink: '#3a3a3a', metal: 0 },
      locker: { body: '#4f7a62', front: '#5c8a70', pull: '#c9d0d0', label: '#f1ead2', ink: '#1f2a24', metal: 0.4 },
      lacquer: { body: '#2e2422', front: '#43302c', pull: '#d8b24a', label: '#d8b24a', ink: '#1c1a1a', metal: 0.2 },
    }[a.make];
    const body = s.material(look.body, { metalness: look.metal, roughness: a.make === 'lacquer' ? 0.25 : 0.6 });
    const pullMat = s.material(look.pull, { metalness: a.make === 'birch' ? 0 : 0.8, roughness: 0.3 });
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.28 });
    const dark = s.material('#15120f', { roughness: 0.9 });

    const cols = Math.round(mix(3, 9, a.drawers)), rows = Math.round(mix(4, 11, a.drawers));
    const Wd = 0.96, Dp = 0.42, legH = a.stand === 'plinth' ? 0.1 : a.stand === 'casters' ? 0.14 : 0.2;
    const gridW = Wd - 0.08, gridH = 0.7, y0 = legH + 0.04, frieze = 0.085;
    const dw = gridW / cols, dh = gridH / rows;
    const topY = y0 + gridH + frieze + 0.02;

    // Carcass.
    s.box([Wd, topY - legH, Dp], [0, (topY + legH) / 2, 0], body);
    s.box([Wd + 0.05, 0.035, Dp + 0.04], [0, topY + 0.017, 0.005], body);
    s.box([gridW + 0.01, gridH + 0.01, 0.01], [0, y0 + gridH / 2, Dp / 2 - 0.02], dark);
    if (a.stand === 'legs') for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe([[0.02, 0], [0.028, 0.03], [0.02, 0.07], [0.034, 0.13], [0.03, legH]], body, [x * (Wd / 2 - 0.05), 0, z * (Dp / 2 - 0.05)]);
    else if (a.stand === 'plinth') s.box([Wd - 0.04, legH, Dp - 0.04], [0, legH / 2, 0], s.material('#3a322a'));
    else {
      const steel = s.material('#8e999c', { metalness: 0.7, roughness: 0.4 });
      s.box([Wd + 0.04, 0.03, Dp + 0.04], [0, legH - 0.015, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.cylinder(0.045, 0.045, 0.03, [x * (Wd / 2 - 0.05), 0.045, z * (Dp / 2 - 0.04)], dark, 14).rotation.z = Math.PI / 2; s.box([0.02, 0.06, 0.05], [x * (Wd / 2 - 0.05), 0.095, z * (Dp / 2 - 0.04)], steel); }
      s.tube([[Wd / 2 + 0.02, legH, -Dp / 2 + 0.03], [Wd / 2 + 0.12, topY * 0.6, -Dp / 2 + 0.03], [Wd / 2 + 0.12, topY * 0.95, -Dp / 2 + 0.03]], 0.014, steel);
      s.rod([Wd / 2 + 0.12, topY * 0.95, -Dp / 2 + 0.03], [Wd / 2 + 0.12, topY * 0.95, Dp / 2 - 0.03], 0.014, steel);
      s.tube([[Wd / 2 + 0.12, topY * 0.95, Dp / 2 - 0.03], [Wd / 2 + 0.12, topY * 0.6, Dp / 2 - 0.03], [Wd / 2 + 0.02, legH, Dp / 2 - 0.03]], 0.014, steel);
    }

    // Decide the fate of every drawer.
    type Fate = { out: number; gone: boolean };
    const fates: Fate[] = [];
    const openShare = { tended: 0, catalogue: 0.2, raided: 0.12, missing: 0.04, sealed: 0, sprouting: 0.1 }[a.state];
    const goneShare = { tended: 0, catalogue: 0, raided: 0.22, missing: 0.28, sealed: 0, sprouting: 0.02 }[a.state] + mood.wear * 0.05 * (a.state === 'sealed' ? 0 : 1);
    for (let i = 0; i < cols * rows; i++) fates.push({ gone: random() < goneShare, out: random() < openShare ? rr(0.13, Dp * 0.72) : 0 });
    if (a.state === 'tended' || a.state === 'sprouting') { const f = fates[Math.floor(rows * 0.6) * cols + Math.floor(cols * 0.6)]; f.gone = false; f.out = Dp * 0.62; }
    const maxOpen = 9;
    let openCount = 0;
    for (const f of fates) if (f.out && !f.gone && ++openCount > maxOpen) f.out = 0;

    const fronts: Bit[] = [], pulls: Bit[] = [], labels: Bit[] = [], holes: Bit[] = [], packets: Bit[] = [], vials: Bit[] = [], corks: Bit[] = [], seeds: Bit[] = [], shoots: Bit[] = [], sacks: Bit[] = [];
    const zFace = Dp / 2;
    const packetHues = { vegetables: ['#e2574a', '#f28a1e', '#6aa84a', '#f2c230', '#8a3a6a'], flowers: ['#f6c9d8', '#cfe0f5', '#f8e7a8', '#d9c8f0', '#c9ead8'], grains: ['#d9a13c', '#8a5a2c', '#2c2420', '#e9d9a8', '#b9452e'], trees: ['#c9b48a', '#a89468', '#d9c9a8'], medicine: ['#27407a', '#1f5a6a', '#3a2c6a'], empty: ['#efe6cc'] }[a.holds];
    const frontMat = s.material(look.front, { metalness: look.metal, roughness: a.make === 'lacquer' ? 0.25 : 0.6 });
    const trayMat = s.material(a.make === 'locker' ? '#6f7f76' : '#b99a6a', { roughness: 0.8 });

    const fill = (cx: number, cy: number, zBack: number, zFront: number, yaw = 0, onFloor = false) => {
      // Contents of one open tray, in tray-local terms projected to world.
      if (a.holds === 'empty') return;
      const n = Math.max(2, Math.round((zFront - zBack) / 0.035));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, lz = mix(zBack, zFront, t);
        const wx = cx + Math.sin(yaw) * (lz - (zBack + zFront) / 2), wz = onFloor ? (zBack + zFront) / 2 + Math.cos(yaw) * (lz - (zBack + zFront) / 2) : lz;
        const px = onFloor ? wx : cx, pz = wz;
        if (random() < 0.12) continue;
        if (a.holds === 'grains' || a.holds === 'medicine') {
          const hgt = Math.min(dh * 1.25, 0.09), rad = Math.min(dw * 0.2, 0.018);
          for (const dx of dw > 0.16 ? [-dw * 0.2, dw * 0.2] : [0]) {
            vials.push({ p: [px + dx, cy - dh * 0.3 + hgt / 2, pz], s: [rad, hgt, rad], c: a.holds === 'medicine' ? pick(packetHues) : '#dff0f2' });
            if (a.holds === 'grains') seeds.push({ p: [px + dx, cy - dh * 0.3 + hgt * 0.32, pz], s: [rad * 0.86, hgt * 0.3, rad * 0.86], c: pick(packetHues) });
            corks.push({ p: [px + dx, cy - dh * 0.3 + hgt + 0.006, pz], s: [rad * 0.8, 0.012, rad * 0.8], c: '#b98a52' });
          }
        } else if (a.holds === 'trees') sacks.push({ p: [px + rr(-dw * 0.15, dw * 0.15), cy - dh * 0.1, pz], s: [Math.min(dw * 0.3, 0.035), Math.min(dh * 0.6, 0.045), 0.02], c: pick(packetHues) });
        else packets.push({ p: [px, cy + dh * 0.12, pz], s: [dw * 0.72, Math.min(dh * 1.15, dw * 1.0), 0.004], r: [rr(-0.25, 0.1), yaw, rr(-0.06, 0.06)], c: pick(packetHues) });
        if (a.state === 'sprouting' && random() < 0.7) for (let j = 0; j < 3; j++) shoots.push({ p: [px + rr(-dw * 0.3, dw * 0.3), cy + dh * 0.2, pz], s: [0.012, rr(0.04, 0.13), 0.012], r: [rr(-0.4, 0.4), rr(0, 6), rr(-0.4, 0.4)], c: pick(['#6fbf4a', '#8fd05a', '#4fa544']) });
      }
    };
    const tray = (cx: number, cy: number, zc: number, yaw = 0, tilt = 0) => {
      const g = new THREE.Group();
      const len = Dp * 0.8, wall = 0.008;
      const add = (size: V3, at: V3, mat: THREE.Material) => { const m = s.box(size, at, mat); g.add(m); return m; };
      add([dw - 0.012, wall, len], [0, -dh / 2 + 0.01, 0], trayMat);
      for (const x of [-1, 1]) add([wall, dh * 0.7, len], [x * (dw / 2 - 0.01), -dh * 0.12, 0], trayMat);
      add([dw - 0.012, dh * 0.7, wall], [0, -dh * 0.12, -len / 2], trayMat);
      add([dw - 0.008, dh - 0.008, 0.016], [0, 0, len / 2], frontMat);
      add([dw * 0.5, dh * 0.32, 0.003], [0, dh * 0.14, len / 2 + 0.009], s.material(look.label));
      const knob = s.ball([0.012, 0.012, 0.012], [0, -dh * 0.22, len / 2 + 0.016], pullMat, 8); g.add(knob);
      g.position.set(cx, cy, zc); g.rotation.set(tilt, yaw, 0);
      s.root.add(g);
      return len;
    };

    fates.forEach((fate, i) => {
      const cx = -gridW / 2 + (i % cols + 0.5) * dw, cy = y0 + (Math.floor(i / cols) + 0.5) * dh;
      if (fate.gone) { holes.push({ p: [cx, cy, zFace - 0.03], s: [dw - 0.012, dh - 0.012, 0.05], c: '#0d0b0a' }); return; }
      if (fate.out) {
        const len = tray(cx, cy, zFace - Dp * 0.4 + fate.out, 0, 0);
        holes.push({ p: [cx, cy, zFace - 0.03], s: [dw - 0.012, dh - 0.012, 0.05], c: '#0d0b0a' });
        fill(cx, cy, zFace + 0.01, zFace - Dp * 0.4 + fate.out + len / 2 - 0.02);
        return;
      }
      fronts.push({ p: [cx, cy, zFace - 0.004], s: [dw - 0.008, dh - 0.008, 0.016] });
      labels.push({ p: [cx, cy + dh * 0.14, zFace + 0.005], s: [dw * 0.5, dh * 0.32, 0.003], c: random() < mood.wear * 0.4 ? '#b9ad8a' : look.label });
      labels.push({ p: [cx, cy + dh * 0.14, zFace + 0.007], s: [dw * rr(0.2, 0.4), dh * 0.07, 0.002], c: look.ink });
      if (a.make === 'birch') holes.push({ p: [cx, cy - dh * 0.22, zFace + 0.004], s: [0.022, 0.022, 0.006], c: '#3a2c1c' });
      else pulls.push({ p: [cx, cy - dh * 0.22, zFace + 0.012], s: [0.012, 0.012, 0.012] });
      if (a.state === 'sprouting' && random() < 0.3) for (let j = 0; j < 3; j++) shoots.push({ p: [cx + rr(-dw * 0.4, dw * 0.4), cy + dh * 0.45, zFace + 0.005], s: [0.01, rr(0.03, 0.1), 0.01], r: [rr(0.3, 1.2), rr(-0.8, 0.8), 0], c: pick(['#6fbf4a', '#8fd05a', '#4fa544']) });
    });

    // Dumped drawers and spilled seed on the floor.
    if (a.state === 'raided') {
      for (let k = 0, n = 3 + Math.floor(random() * 3); k < n; k++) {
        const x = rr(-0.6, 0.6), z = Dp / 2 + rr(0.3, 0.75), yaw = rr(0, 6.283), flipped = random() < 0.4;
        tray(x, flipped ? dh * 0.55 : dh / 2 + 0.002, z, yaw, flipped ? Math.PI : 0);
        if (!flipped) fill(x, dh / 2, z - Dp * 0.3, z + Dp * 0.3, yaw, true);
        for (let j = 0; j < 26; j++) { const ang = rr(0, 6.283), d = rr(0.05, 0.4); seeds.push({ p: [x + Math.sin(ang) * d, 0.006, z + Math.cos(ang) * d], s: [0.008, 0.006, 0.011], c: pick(packetHues) }); }
        if (a.holds !== 'empty' && a.holds !== 'grains' && a.holds !== 'medicine') for (let j = 0; j < 3; j++) packets.push({ p: [x + rr(-0.3, 0.3), 0.004, z + rr(-0.25, 0.25)], s: [0.07, 0.09, 0.004], r: [Math.PI / 2, rr(0, 6), 0], c: pick(packetHues) });
      }
    }

    const white = (extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, ...extra });
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), frontMat.clone(), fronts);
    bits(s.root, new THREE.SphereGeometry(1, 8, 6), pullMat.clone(), pulls);
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), white(), labels);
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), white({ roughness: 1 }), holes);
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), white({ roughness: 0.9 }), packets);
    const shootGeo = new THREE.SphereGeometry(1, 6, 5); shootGeo.translate(0, 1, 0);
    bits(s.root, shootGeo, white(), shoots);
    bits(s.root, new THREE.SphereGeometry(1, 8, 6), white({ roughness: 0.95 }), sacks);
    bits(s.root, new THREE.SphereGeometry(1, 6, 5), white({ roughness: 0.6 }), seeds);
    bits(s.root, new THREE.CylinderGeometry(1, 1, 1, 8), white({ roughness: 0.8 }), corks);
    bits(s.root, new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: a.holds === 'medicine' ? 0.85 : 0.45, roughness: 0.08 }), vials);

    // Lock, key, seal.
    const ly = y0 + gridH + frieze / 2 + 0.005;
    s.box([gridW, 0.006, 0.006], [0, y0 + gridH + 0.006, zFace + 0.003], pullMat);
    const plate = s.box([0.07, 0.065, 0.008], [0, ly, zFace + 0.004], brass);
    s.cylinder(0.008, 0.008, 0.012, [0, ly + 0.006, zFace + 0.006], dark, 8).rotation.x = Math.PI / 2;
    const key = (at: V3, hang: boolean) => {
      const g = new THREE.Group();
      const K = (m: THREE.Mesh) => { g.add(m); return m; };
      K(s.cylinder(0.006, 0.006, 0.075, [0, 0, 0.0375], brass, 8)).rotation.x = Math.PI / 2;
      K(s.ring(0.024, 0.007, [0, 0, 0.098], brass));
      K(s.box([0.006, 0.022, 0.014], [0, -0.012, 0.012], brass));
      const ribbon = s.material(pick(['#c0392b', '#2f6f8a', '#5a8f46']), { side: THREE.DoubleSide });
      K(s.box([0.016, 0.13, 0.003], [0.004, -0.07, 0.1], ribbon)).rotation.z = 0.12;
      K(s.box([0.016, 0.1, 0.003], [-0.006, -0.055, 0.103], ribbon)).rotation.z = -0.2;
      g.position.set(...at);
      if (hang) g.rotation.set(Math.PI / 2, 0, 0);
      s.root.add(g);
    };
    if (a.key === 'inlock') key([0, ly + 0.006, zFace + 0.008], false);
    else if (a.key === 'hanging') { s.rod([Wd / 2, topY - 0.1, 0.05], [Wd / 2 + 0.03, topY - 0.09, 0.05], 0.005, brass); key([Wd / 2 + 0.028, topY - 0.19, 0.05], true); }
    else if (a.key === 'forced') { plate.rotation.z = rr(0.25, 0.5); plate.position.y -= 0.01; for (let k = 0; k < 5; k++) s.box([rr(0.05, 0.12), 0.004, 0.002], [rr(-0.1, 0.1), ly + rr(-0.03, 0.03), zFace + 0.002], s.material('#e6dcc0')).rotation.z = rr(-0.7, 0.7); }
    else { s.box([0.11, 0.04, 0.01], [0, ly, zFace + 0.008], s.material('#8e999c', { metalness: 0.8 })); s.box([0.07, 0.06, 0.03], [0, ly - 0.055, zFace + 0.02], brass); s.ring(0.024, 0.007, [0, ly - 0.02, zFace + 0.02], s.material('#8e999c', { metalness: 0.8 }), Math.PI); }
    if (a.state === 'sealed') {
      const iron = s.material('#4a4f52', { metalness: 0.7, roughness: 0.5 });
      for (const dir of [-1, 1]) { const pts: V3[] = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([mix(-Wd / 2, Wd / 2, t), mix(y0 + (dir > 0 ? 0 : gridH), y0 + (dir > 0 ? gridH : 0), t) - Math.sin(t * Math.PI) * 0.03, zFace + 0.03]); } s.tube(pts, 0.012, iron); }
      s.cylinder(0.06, 0.06, 0.02, [0, y0 + gridH / 2 - 0.02, zFace + 0.045], s.material('#a02f24', { roughness: 0.4 }), 14).rotation.x = Math.PI / 2;
      s.cylinder(0.035, 0.035, 0.024, [0, y0 + gridH / 2 - 0.02, zFace + 0.047], s.material('#c0392b', { roughness: 0.3 }), 6).rotation.x = Math.PI / 2;
    }

    // On top.
    const ty = topY + 0.035, tx = rr(-0.18, 0.12);
    if (a.top === 'scale') {
      s.cylinder(0.07, 0.08, 0.02, [tx, ty + 0.01, 0], brass, 16);
      s.cylinder(0.008, 0.01, 0.26, [tx, ty + 0.14, 0], brass, 8);
      const tip = rr(-0.18, 0.18);
      s.rod([tx - 0.16, ty + 0.26 - tip * 0.16, 0], [tx + 0.16, ty + 0.26 + tip * 0.16, 0], 0.006, brass);
      for (const sd of [-1, 1]) { const py = ty + 0.26 + sd * tip * 0.16; for (const dz of [-0.03, 0.03]) s.rod([tx + sd * 0.16, py, 0], [tx + sd * 0.16, py - 0.13, dz], 0.002, brass); s.lathe([[0, 0], [0.04, 0.005], [0.055, 0.02]], s.material('#c9a24a', { metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide }), [tx + sd * 0.16, py - 0.15, 0]); }
      s.ball([0.03, 0.014, 0.03], [tx - 0.16, ty + 0.125 + tip * 0.16, 0], s.material(packetHues[0]), 8);
    } else if (a.top === 'cloche') {
      s.cylinder(0.06, 0.045, 0.07, [tx, ty + 0.035, 0], s.material('#b96a48'), 14);
      s.rod([tx, ty + 0.07, 0], [tx + 0.01, ty + 0.16, 0], 0.004, s.material('#5a9a46'));
      for (const sd of [-1, 1]) s.ball([0.03, 0.008, 0.018], [tx + 0.01 + sd * 0.03, ty + 0.165, 0], s.material(mood.wear > 0.8 ? '#8a7a52' : '#6fbf4a'), 8).rotation.z = sd * 0.5;
      s.lathe([[0.11, 0], [0.11, 0.16], [0.08, 0.24], [0.02, 0.275], [0, 0.275]], new THREE.MeshPhysicalMaterial({ color: '#e9f6f8', transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide }), [tx, ty, 0]);
      s.ball([0.018, 0.018, 0.018], [tx, ty + 0.29, 0], new THREE.MeshPhysicalMaterial({ color: '#e9f6f8', transparent: true, opacity: 0.6, roughness: 0.05 }), 8);
      s.cylinder(0.125, 0.125, 0.012, [tx, ty + 0.006, 0], s.material('#6f4a2e'), 20);
    } else if (a.top === 'ledger') {
      for (const sd of [-1, 1]) { s.box([0.17, 0.02, 0.24], [tx + sd * 0.088, ty + 0.012, 0.02], s.material('#f4efe0')).rotation.z = sd * 0.06; }
      s.box([0.37, 0.008, 0.26], [tx, ty + 0.004, 0.02], s.material('#3d5a4a'));
      for (let k = 0; k < 7; k++) s.box([0.12, 0.002, 0.004], [tx - 0.088, ty + 0.024, -0.06 + k * 0.026], s.material('#3a3a4a'));
      s.rod([tx + 0.05, ty + 0.03, 0.08], [tx + 0.16, ty + 0.03, -0.02], 0.005, s.material('#22262a'));
    } else if (a.top === 'lamp') {
      const lit = mood.cheer > 0.25;
      s.lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.04, 0.06], [0.02, 0.08]], brass, [tx, ty, 0]);
      s.lathe([[0.03, 0], [0.05, 0.05], [0.035, 0.12], [0.022, 0.17]], new THREE.MeshPhysicalMaterial({ color: '#fff3d0', transparent: true, opacity: 0.4, roughness: 0.05, side: THREE.DoubleSide }), [tx, ty + 0.08, 0]);
      if (lit) s.ball([0.014, 0.028, 0.014], [tx, ty + 0.125, 0], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.6 }), 8);
    } else if (a.top === 'envelopes') {
      s.box([0.34, 0.012, 0.22], [tx, ty + 0.006, 0], trayMat);
      for (const z of [-0.11, 0.11]) s.box([0.34, 0.035, 0.008], [tx, ty + 0.018, z], trayMat);
      for (const x of [-0.17, 0.17]) s.box([0.008, 0.035, 0.22], [tx + x, ty + 0.018, 0], trayMat);
      for (let k = 0; k < 8; k++) s.box([0.075, 0.003, 0.1], [tx + rr(-0.11, 0.11), ty + 0.016 + k * 0.004, rr(-0.05, 0.05)], s.material(pick(packetHues))).rotation.y = rr(-0.6, 0.6);
      s.rod([tx + 0.2, ty + 0.004, 0.08], [tx + 0.3, ty + 0.004, 0.0], 0.003, s.material('#c9d0d0', { metalness: 0.8 }));
      s.rod([tx + 0.2, ty + 0.004, 0.08], [tx + 0.3, ty + 0.004, 0.02], 0.003, s.material('#c9d0d0', { metalness: 0.8 }));
    }
    if (a.make === 'locker') s.label(`SEED ${100 + Math.floor(random() * 899)}`, 0.3, 0.05, [-gridW / 2 + 0.18, ly, zFace + 0.004], '#f1ead2', '#4f7a62');

    return s.finish();
  },
});
