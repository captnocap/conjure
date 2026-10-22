import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

interface Plumage { body: THREE.Color; wing: THREE.Color; lining: THREE.Color | null; head: string; ruff: string }

/** A soaring vulture: nose toward +x, wings along z, fingered tips turned up. */
function flyer(p: Plumage, random: () => number) {
  const b = new Batch();
  b.ball([0.4, 0.14, 0.16], [0, 0, 0], p.body, undefined, 9);
  b.ball([0.12, 0.1, 0.13], [0.33, 0.01, 0], p.ruff, undefined, 7);
  b.ball([0.075, 0.07, 0.07], [0.46, -0.03, 0], p.head, undefined, 7);
  b.cone(0.03, 0.12, [0.55, -0.06, 0], '#2a2622', [0, 0, -1.9], 4);
  b.box([0.34, 0.02, 0.36], [-0.5, 0, 0], p.wing, [0, 0, 0]);
  b.box([0.14, 0.02, 0.44], [-0.68, 0, 0], p.wing);
  for (const s of [-1, 1]) {
    b.box([0.56, 0.035, 0.85], [0.02, 0.04, s * 0.52], p.wing, [-s * 0.1, 0, 0]);
    b.box([0.5, 0.03, 0.7], [0, 0.15, s * 1.22], p.wing, [-s * 0.2, s * 0.06, 0]);
    if (p.lining) b.box([0.2, 0.02, 1.3], [0.16, 0.035, s * 0.75], p.lining, [-s * 0.13, 0, 0]);
    for (let k = 0; k < 5; k++) b.box([0.085, 0.02, 0.46], [0.2 - k * 0.1, 0.29 + (2 - Math.abs(k - 2)) * 0.012, s * 1.72], p.wing, [-s * 0.34, s * (0.34 - k * 0.17), 0]);
  }
  void random;
  return b;
}

/** A vulture on its feet: hunched, craning low, or with wings held open. */
function sitter(p: Plumage, pose: 'hunched' | 'spread' | 'feeding', random: () => number) {
  const b = new Batch();
  const lean = pose === 'feeding' ? 1.0 : 0.25;
  b.ball([0.2, 0.36, 0.22], [0, 0.46, 0], p.body, [0, 0, -lean], 10);
  const top: P3 = [0.12 + lean * 0.22, 0.75 - lean * 0.22, 0];
  b.ball([0.15, 0.13, 0.17], top, p.ruff, undefined, 8);
  const head: P3 = pose === 'feeding' ? [0.62, 0.16, 0] : [top[0] + 0.2, top[1] + 0.02 - random() * 0.1, 0];
  b.tube([top, [(top[0] + head[0]) / 2 + 0.06, (top[1] + head[1]) / 2 + 0.12, 0], head], 0.055, 0.045, p.head, 6);
  b.ball([0.075, 0.07, 0.07], head, p.head, undefined, 7);
  b.cone(0.035, 0.15, [head[0] + 0.09, head[1] - 0.06, 0], '#2a2622', [0, 0, -2.3], 4);
  for (const s of [-1, 1]) {
    if (pose === 'spread') {
      b.box([0.5, 0.03, 0.8], [-0.02, 0.62, s * 0.55], p.wing, [-s * 0.25, 0, 0.2]);
      b.box([0.46, 0.03, 0.75], [-0.04, 0.48, s * 1.2], p.wing, [s * 0.35, 0, 0.2]);
    } else b.ball([0.13, 0.42, 0.09], [-0.08 - lean * 0.1, 0.42, s * 0.19], p.wing, [0, 0, -lean - 0.15], 8);
    b.rod([0.02, 0.2, s * 0.08], [0.04, 0, s * 0.09], 0.03, 0.022, '#b9b0a0', 4);
  }
  b.box([0.22, 0.03, 0.24], [-0.3 + lean * 0.05, 0.14 + lean * 0.2, 0], p.wing, [0, 0, 0.9 - lean]);
  return b;
}

export default defineThing({
  questions: {
    stage: choice('How far along is the gathering?', {
      scouting: 'The first few scouts turning very high and wide; nothing has come down yet.',
      gathering: 'A full spiral forming and tightening, birds stacked at every height, a pair already waiting on the perch.',
      feeding: 'Most have landed: a hissing squabble on the ground around the body, only a few still coming in.',
      leaving: 'It is over. The bones are clean, gorged birds sit heavy on the perch and the last ones lift away.',
    }),
    perch: choice('What do the waiting birds sit on?', {
      snag: 'A dead, bleached tree with broken limbs.',
      acacia: 'The flat bare skeleton of a drought-killed thorn tree.',
      kopje: 'A pile of rounded granite boulders.',
      pole: 'A leaning telegraph pole with a crossarm, the only upright thing for miles.',
    }),
    kind: choice('What sort of vultures are they?', {
      whiteback: 'White-backed vultures: brown with pale wing linings and a white ruff.',
      lappet: 'Lappet-faced: huge and black with bare pink heads.',
      ruppell: 'Scaly cream-speckled griffons, pale and dusty.',
      dark: 'Anonymous black shapes, pure silhouette.',
    }),
    death: choice('What has died underneath?', {
      unseen: 'You cannot see it: only a patch of tall grass they keep looking at.',
      zebra: 'A zebra, stripes still bright.',
      buffalo: 'A black buffalo with heavy curled horns.',
      cow: "A herder's pale humped cow, a loss someone will count.",
      elephant: 'An elephant: a hill of grey, or its great arched ribs.',
    }),
    spread: score('How wide is the wheel they turn?', ['A tight chimney straight above', 'An easy spiral', 'A vast lazy wheel across the whole sky']),
    sunning: noul('Is one of the perched birds holding its wings wide open to the sun?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const g = new Batch();
    const stone = new Batch();
    const base: Record<typeof a.kind, Plumage> = {
      whiteback: { body: new THREE.Color('#5d4a3a'), wing: new THREE.Color('#3b2f27'), lining: new THREE.Color('#d9cfbb'), head: '#8d8478', ruff: '#efe9da' },
      lappet: { body: new THREE.Color('#2b2522'), wing: new THREE.Color('#1f1b19'), lining: null, head: '#d98a84', ruff: '#4a3d35' },
      ruppell: { body: new THREE.Color('#a8977a'), wing: new THREE.Color('#5a4c3e'), lining: new THREE.Color('#e3d8bf'), head: '#b9b3a6', ruff: '#f1ecdf' },
      dark: { body: new THREE.Color('#231f1d'), wing: new THREE.Color('#1c1917'), lining: null, head: '#231f1d', ruff: '#231f1d' },
    };
    const plumage = () => { const p = base[a.kind]; return { ...p, body: vary(p.body, random, 0.04), wing: vary(p.wing, random, 0.03) }; };
    const put = (batch: Batch, at: P3, heading: number, scale = 1, bank = 0) =>
      g.absorb(batch, new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(bank, heading, 0, 'YXZ')), new THREE.Vector3(scale, scale, scale)));

    // The perch, with the places a bird can sit.
    const wood = new THREE.Color('#a39a8c').lerp(new THREE.Color('#6b5e52'), 1 - mood.wear * 0.6 - 0.3);
    const perches: P3[] = [];
    let perchTop = 5;
    if (a.perch === 'snag' || a.perch === 'acacia') {
      const flat = a.perch === 'acacia', H = flat ? mix(4.6, 5.6, random()) : mix(5.5, 7.5, random());
      const lean: P3 = [(random() - 0.5) * 0.9, H * (flat ? 0.5 : 1), (random() - 0.5) * 0.6];
      g.shaped([[0, -0.2, 0], [lean[0] * 0.4, lean[1] * 0.5, lean[2] * 0.4], lean], (t) => mix(0.34, flat ? 0.2 : 0.09, t) * (1 + 0.6 * Math.max(0, 1 - t * 6) ** 2), vary(wood, random, 0.04), 8);
      if (!flat) perches.push([lean[0], lean[1] + 0.02, lean[2]]);
      const limbs = flat ? 6 : 4 + Math.floor(random() * 2);
      for (let i = 0; i < limbs; i++) {
        const t = flat ? 1 : mix(0.4, 0.85, i / limbs), ang = (i / limbs) * 6.28 + random() * 0.8, len = flat ? mix(1.8, 3, random()) : mix(1.2, 2.6, random());
        const from: P3 = [lean[0] * t, lean[1] * t, lean[2] * t];
        const end: P3 = [from[0] + Math.cos(ang) * len, flat ? H + (random() - 0.5) * 0.25 : from[1] + len * mix(0.25, 0.7, random()), from[2] + Math.sin(ang) * len];
        const elbow: P3 = [from[0] + Math.cos(ang) * len * 0.6, flat ? from[1] + (H - from[1]) * 0.75 : from[1] + (end[1] - from[1]) * 0.3, from[2] + Math.sin(ang) * len * 0.6];
        g.tube([from, elbow, end], 0.17 * (1.15 - t * 0.5), 0.05, vary(wood, random, 0.05), 6);
        perches.push([end[0], end[1] + 0.03, end[2]]);
        if (flat) for (let k = 0; k < 3; k++) g.rod(end, [end[0] + (random() - 0.5) * 1.6, H + 0.15 + random() * 0.15, end[2] + (random() - 0.5) * 1.6], 0.04, 0.012, wood, 4);
        else if (random() < 0.6) g.rod(elbow, [elbow[0] + (random() - 0.5) * 1.2, elbow[1] + 0.5 + random() * 0.6, elbow[2] + (random() - 0.5) * 1.2], 0.05, 0.015, wood, 4);
      }
      perchTop = flat ? H : Math.max(...perches.map((p) => p[1]));
    } else if (a.perch === 'kopje') {
      const rock = new THREE.Color('#9a8f84').lerp(new THREE.Color('#b08a6a'), mood.warmth * 0.3);
      const stones = 6 + Math.floor(random() * 4);
      for (let i = 0; i < stones; i++) {
        const t = random() * 6.28, d = i === 0 ? 0 : mix(0.6, 2.3, random()), s = i === 0 ? 1.5 : mix(0.7, 1.4, random()), y = i === 0 ? 2.1 : s * 0.7 + (d < 1.2 ? 1.2 : 0);
        stone.blob([s * mix(0.9, 1.3, random()), s * mix(0.8, 1.1, random()), s], [Math.cos(t) * d, y, Math.sin(t) * d], vary(rock, random, 0.06), [random() * 0.5, random() * 3, random() * 0.5], 1);
        if (y > 1.4) perches.push([Math.cos(t) * d, y + s * 0.82, Math.sin(t) * d]);
      }
      stone.blob([2.2, 1.3, 2.0], [0, 0.6, 0], vary(rock, random, 0.05), [0, random() * 3, 0], 1);
      perchTop = 3.6;
    } else {
      const top: P3 = [0.5, 6.2, 0.15];
      g.rod([0, -0.2, 0], top, 0.15, 0.1, '#5a4a3c', 8);
      const arm = (y: number, w: number) => { const cx = top[0] * (y / 6.2); g.box([0.12, 0.12, w * 2], [cx, y, 0.1], '#4d3f33', [0.05, 0, 0]); for (const s of [-1, -0.5, 0.5, 1]) g.drum(0.045, 0.12, [cx, y + 0.12, 0.1 + s * w * 0.9], '#7c9a8a', undefined, 6); perches.push([cx, y + 0.07, 0.1 - w * 0.55], [cx, y + 0.07, 0.1 + w * 0.6]); };
      arm(5.7, 1.15); arm(5.05, 0.85);
      perches.push([top[0], top[1] + 0.02, top[2]]);
      for (const s of [-1, 1]) g.tube([[top[0] * 0.92, 5.82, 0.1 + s * 1.03], [top[0] * 0.92 - 1.6, 4.9, 0.1 + s * 1.2], [top[0] * 0.92 - 3.2, 3.0, 0.1 + s * 1.4], [top[0] * 0.92 - 3.9, 0.05, 0.1 + s * 1.5]], 0.012, 0.012, '#2b2725', 4);
      perchTop = 6.3;
    }

    // What lies below, a few metres from the perch.
    const cx = 3.4, cz = 2.2;
    const picked = a.stage === 'leaving', opened = a.stage === 'feeding';
    const big = a.death === 'elephant' ? 2.3 : a.death === 'zebra' ? 0.95 : a.death === 'cow' ? 1.0 : a.death === 'buffalo' ? 1.2 : 0;
    const body = new Batch();
    if (a.death === 'unseen') {
      for (let i = 0; i < 46; i++) { const t = random() * 6.28, d = Math.sqrt(random()) * 1.7, c = vary('#bfa860', random, 0.1); for (let k = 0; k < 3; k++) body.cone(0.05, mix(0.7, 1.3, random()), [Math.cos(t) * d + random() * 0.15, 0.4, Math.sin(t) * d + random() * 0.15], c, [(random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4], 4); }
    } else if (picked) {
      const bone = '#e8e1ce';
      body.rod([-1, 0.1, 0], [1, 0.1, 0], 0.05, 0.04, bone, 5);
      for (let i = 0; i < 8; i++) { const x = -0.6 + i * 0.17; body.tube([[x, 0.06, -0.02], [x + 0.03, 0.55 - Math.abs(i - 3) * 0.04, 0.3], [x, 0.05, 0.62]], 0.03, 0.02, bone, 5); }
      body.blob([0.26, 0.17, 0.16], [1.3, 0.17, 0.1], bone, [0, 0.3, 0], 1);
      if (a.death === 'elephant') for (const s of [-1, 1]) body.tube([[1.4, 0.12, 0.1 + s * 0.1], [1.75, 0.08, 0.1 + s * 0.22], [2.1, 0.2, 0.1 + s * 0.18]], 0.045, 0.012, '#f2ead5', 5);
      else if (a.death !== 'zebra') for (const s of [-1, 1]) body.tube([[1.25, 0.28, 0.1 + s * 0.08], [1.2, 0.42, 0.1 + s * 0.35], [1.35, 0.6, 0.1 + s * 0.42]], 0.035, 0.01, '#3a3028', 5);
      for (let i = 0; i < 5; i++) body.rod([(random() - 0.5) * 2.4, 0.04, -0.5 - random() * 0.6], [(random() - 0.5) * 2.4, 0.04, -0.4 - random() * 0.9], 0.035, 0.035, bone, 5);
      body.blob([0.55, 0.03, 0.4], [-0.3, 0.03, 0.2], '#5a3a2c', [0, random(), 0], 0);
    } else {
      const hide = { zebra: '#f1ede2', buffalo: '#2c2623', cow: '#e3d9c6', elephant: '#7f786f', unseen: '#000' }[a.death], dark = '#241f1c';
      // Lying on its side: a swollen barrel, stiff legs, head thrown back.
      const slices = 10;
      for (let i = 0; i < slices; i++) {
        const t = i / (slices - 1), x = -0.8 + t * 1.6, r = 0.36 * Math.sin(Math.PI * mix(0.12, 0.9, t)) ** 0.6 * (1 + 0.15 * Math.sin(t * 3.14));
        body.drum(r, 1.6 / slices + 0.01, [x, r * 0.92, 0], a.death === 'zebra' && i % 2 ? dark : hide, [0, 0, 1.5708], 10);
      }
      body.shaped([[0.75, 0.3, 0], [1.1, 0.25, -0.25], [1.45, 0.16, -0.45]], (t) => mix(0.22, 0.1, t), hide, 8);
      if (a.death === 'zebra') for (let i = 0; i < 4; i++) body.drum(0.2 - i * 0.025, 0.05, [0.85 + i * 0.14, 0.28 - i * 0.03, -0.08 - i * 0.1], dark, [0.5, 0, 1.2], 8);
      for (const [x, z] of [[0.55, 0.9], [0.4, 0.8], [-0.55, 0.95], [-0.7, 0.8]]) body.rod([x, 0.3, 0.2], [x + 0.15, 0.22 + random() * 0.3, z], 0.07, 0.035, a.death === 'zebra' ? '#d8d2c4' : hide, 5);
      if (a.death === 'buffalo' || a.death === 'cow') for (const s of [-1, 1]) body.tube([[1.25, 0.28, -0.32], [1.2, 0.3 + s * 0.02, -0.32 + s * 0.3], [1.38, 0.5, -0.3 + s * 0.42]], a.death === 'buffalo' ? 0.07 : 0.04, 0.012, a.death === 'buffalo' ? '#1a1614' : '#e8dcc0', 5);
      if (a.death === 'cow') body.ball([0.2, 0.18, 0.16], [0.5, 0.5, -0.12], hide, undefined, 8);
      if (a.death === 'elephant') { for (const s of [-1, 1]) body.ball([0.4, 0.03, 0.4], [1.0, 0.1 + (s + 1) * 0.12, -0.2 + s * 0.2], '#6b645c', [0.2, 0, 0], 9); body.tube([[1.4, 0.16, -0.45], [1.8, 0.1, -0.3], [2.1, 0.08, 0.1]], 0.1, 0.04, hide, 6); body.tube([[1.35, 0.2, -0.4], [1.6, 0.3, -0.75], [1.85, 0.5, -0.85]], 0.04, 0.012, '#f2ead5', 5); }
      if (opened) { body.ball([0.42, 0.16, 0.22], [-0.05, 0.22, 0.3], '#8a2a22', undefined, 8); for (let i = 0; i < 4; i++) body.tube([[-0.3 + i * 0.16, 0.1, 0.25], [-0.3 + i * 0.16, 0.4, 0.42], [-0.3 + i * 0.16, 0.5, 0.2]], 0.02, 0.015, '#e8e1ce', 4); }
    }
    if (!body.empty) put(body, [cx, 0, cz], random() * 6.28, a.death === 'unseen' ? 1 : picked ? big * 1.5 : big);

    // Birds on the perch and on the ground.
    const order = perches.slice().sort((p, q) => q[1] - p[1]);
    const seated = Math.min(order.length, { scouting: 1, gathering: 2 + Math.floor(random() * 2), feeding: 2, leaving: 4 + Math.floor(random() * 2) }[a.stage] + Math.round(mood.density));
    for (let i = 0; i < seated; i++) {
      const p = order[i], sun = a.sunning && i === 0;
      put(sitter(plumage(), sun ? 'spread' : 'hunched', random), p, sun ? 1.57 : Math.atan2(-(cz - p[2]), cx - p[0]) + (random() - 0.5) * 0.9, mix(1.2, 1.4, random()));
    }
    const grounded = a.stage === 'feeding' ? Math.round(mix(5, 10, mood.density)) : a.stage === 'gathering' ? 1 + Math.floor(random() * 2) : a.stage === 'leaving' ? 2 : 0;
    for (let i = 0; i < grounded; i++) {
      const t = (i / grounded) * 6.28 + random() * 0.5, d = (a.death === 'unseen' ? 2.1 : big * 1.05 + 0.5) + (a.stage === 'feeding' ? random() * 0.7 : 1 + random() * 1.5);
      const x = cx + Math.cos(t) * d, z = cz + Math.sin(t) * d;
      put(sitter(plumage(), a.stage === 'feeding' && random() < 0.6 ? 'feeding' : random() < 0.2 ? 'spread' : 'hunched', random), [x, 0, z], Math.atan2(-(cz - z), cx - x) + (random() - 0.5) * 0.4, mix(1.2, 1.4, random()));
    }
    // Dry grass and a scatter of feathers.
    for (let i = 0; i < 22 + mood.density * 14; i++) { const x = (random() - 0.35) * 9, z = (random() - 0.3) * 7.5, c = vary('#c8ae68', random, 0.1); if (Math.hypot(x - cx, z - cz) < big + 0.4) continue; for (let k = 0; k < 3; k++) g.cone(0.04, mix(0.3, 0.7, random()), [x + random() * 0.14, 0.2, z + random() * 0.14], c, [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], 4); }
    root.add(g.mesh({ roughness: 0.9 }));
    if (!stone.empty) root.add(stone.mesh({ roughness: 0.95, flatShading: true }));

    // The kettle: three counter-turning rings so the spiral never repeats.
    const flying = Math.round({ scouting: 3, gathering: mix(10, 19, mood.density), feeding: 4, leaving: mix(4, 7, mood.density) }[a.stage]);
    const low = perchTop + (a.stage === 'scouting' ? 5 : a.stage === 'leaving' ? 1.5 : 2.2), tall = { scouting: 3, gathering: mix(8, 12, mood.density), feeding: 4, leaving: 6 }[a.stage];
    const r0 = mix(2.2, 4.5, a.spread) * (a.stage === 'scouting' ? 1.5 : 1), widen = mix(0.12, 0.55, a.spread);
    const rings = [new Batch(), new Batch(), new Batch()];
    for (let i = 0; i < flying; i++) {
      const t = flying === 1 ? 0.5 : i / (flying - 1), y = low + t * tall + (random() - 0.5) * 0.5, r = (r0 + (y - low) * widen) * mix(0.9, 1.1, random()), ang = i * 2.39996 + random() * 0.5;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(-mix(0.2, 0.42, random()), -ang - Math.PI / 2, (random() - 0.5) * 0.12, 'YXZ')), new THREE.Vector3(1, 1, 1));
      rings[i % 3].absorb(flyer(plumage(), random), m);
    }
    const wheels = rings.filter((ring) => !ring.empty).map((ring) => { const mesh = ring.mesh({ roughness: 0.85 }); root.add(mesh); return mesh; });

    // Stand the group so the perch and the body share the middle.
    root.position.set(-cx * 0.42, 0, -cz * 0.42);
    const pivot = new THREE.Vector3(cx * 0.5, 0, cz * 0.5);
    for (const wheel of wheels) wheel.position.copy(pivot);
    const speed = mix(0.08, 0.3, mood.energy);
    return {
      object: root,
      update: (dt, time) => wheels.forEach((wheel, i) => { wheel.rotation.y += dt * speed * (1 - i * 0.22); wheel.position.y = Math.sin(time * 0.4 + i * 2) * 0.25; }),
      dispose: () => {
        root.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
        root.removeFromParent();
      },
    };
  },
});
