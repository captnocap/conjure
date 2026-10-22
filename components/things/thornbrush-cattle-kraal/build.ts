import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

export default defineThing({
  questions: {
    dwelling: choice('What kind of home stands inside the ring?', {
      loaf: 'One low loaf-shaped hut plastered in mud and dung, with a curled tunnel doorway.',
      pair: 'Two loaf-shaped mud huts facing each other across the yard, a family with two wives.',
      round: 'A round mud-walled hut under a pointed grass-thatch cone.',
      frame: 'Only the bent-stick skeleton of a hut, its plaster fallen away.',
    }),
    stock: choice('What animals does it hold?', {
      cattle: 'Humped zebu cattle with wide horns, in white, red-brown and black.',
      goats: 'A jostling flock of small goats and fat-tailed sheep.',
      mixed: 'A few cattle with goats underfoot.',
      none: 'No animals: only dung and hoofprints.',
    }),
    state: choice('What is happening at the kraal?', {
      shut: 'Night routine: the gateway plugged tight with a dragged thorn bush, everything inside.',
      open: 'Morning: the gate plug pulled aside and the herd filing out to graze.',
      breached: 'Something broke in during the night: a torn gap in the fence with branches thrown about.',
      deserted: 'Abandoned when the family moved on: no stock, the fence sagging and bleached, grass coming back in the yard.',
    }),
    fence: score('How heavy is the thorn fence?', ['A thin knee-high line of branches', 'A chest-high tangle', 'A massive wall of thorn taller than a man']),
    people: choice('Who is there?', {
      nobody: 'Nobody in sight.',
      herder: 'A herder standing on one leg, wrapped in a red blanket, leaning on a long staff.',
      elder: 'An elder seated on a stool by the hut door.',
      dog: 'A lean yellow dog lying across the gateway.',
    }),
    extras: choice('What else marks it as lived in?', {
      nothing: 'Nothing but earth and thorns.',
      jerrycans: 'A row of bright yellow plastic water jerrycans by the hut.',
      hides: 'Cow hides pegged out to dry and gourds hung on a rack.',
      lights: 'Small flashing lion-scarer lamps on poles around the fence.',
    }),
    fire: noul('Is a cooking fire burning in the yard?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const b = new Batch();
    const deserted = a.state === 'deserted';
    const R = mix(5.2, 7.2, random() * 0.5 + mood.density * 0.5);
    const fenceH = mix(0.55, 2.1, a.fence) * (deserted ? 0.65 : 1);
    const fenceW = mix(0.7, 1.5, a.fence);
    const thorn = new THREE.Color('#8f8473').lerp(new THREE.Color('#b9b2a4'), deserted ? 0.5 : mood.wear * 0.4);
    const earth = new THREE.Color('#9a5a3c').lerp(new THREE.Color('#8d7460'), mood.wear * 0.3);

    // Trampled yard.
    b.drum(R + fenceW * 0.6 + 0.5, 0.04, [0, 0.0, 0], vary(earth, random, 0.03).offsetHSL(0, -0.03, 0.06), undefined, 28);
    b.drum(R - 0.2, 0.04, [0, 0.015, 0], earth.clone().multiplyScalar(0.8), undefined, 24);
    for (let i = 0; i < 26; i++) { const t = random() * 6.28, d = Math.sqrt(random()) * (R - 1); b.blob([mix(0.12, 0.28, random()), 0.04, mix(0.12, 0.28, random())], [Math.cos(t) * d, 0.045, Math.sin(t) * d], vary('#4a3828', random, 0.06), [0, random() * 3, 0], 0); }

    // The ring of piled thorn.
    const gate = 1.57 + (random() - 0.5) * 0.7; // toward the viewer
    const gateHalf = 1.0 / R;
    const breach = a.state === 'breached' ? gate + (random() < 0.5 ? -1 : 1) * mix(1.5, 2.3, random()) : null;
    const gap = (t: number, c: number, half: number) => Math.abs(Math.atan2(Math.sin(t - c), Math.cos(t - c))) < half;
    const tangle = (cx: number, cz: number, w: number, h: number, n: number, tangent: number) => {
      b.blob([w * 0.5, h * 0.42, w * 0.36], [cx, h * 0.26, cz], vary('#5b4f43', random, 0.05), [0, -tangent, 0], 1);
      for (let i = 0; i < n; i++) {
        const y = random() * h * 0.85, ang = tangent + (random() - 0.5) * 2.2 + (random() < 0.5 ? Math.PI : 0), up = (random() - 0.35) * 0.9, len = mix(0.7, 1.7, random()) * (0.6 + w * 0.5);
        const sx = cx + (random() - 0.5) * w * 0.8, sz = cz + (random() - 0.5) * w * 0.8;
        b.rod([sx, y, sz], [sx + Math.cos(ang) * len, Math.max(0.03, y + up * len * 0.7), sz + Math.sin(ang) * len], 0.05, 0.014, vary(thorn, random, 0.14), 4);
      }
    };
    const steps = Math.round((6.28 * R) / 0.62);
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * 6.28;
      if (gap(t, gate, gateHalf)) continue;
      if (breach !== null && gap(t, breach, 1.5 / R)) continue;
      const sag = deserted ? mix(0.3, 1, random()) : mix(0.85, 1.1, random());
      const r = R + (random() - 0.5) * 0.3;
      tangle(Math.cos(t) * r, Math.sin(t) * r, fenceW, fenceH * sag, Math.round(mix(10, 17, a.fence)), t + 1.57);
    }
    const gx = Math.cos(gate) * R, gz = Math.sin(gate) * R;
    // Gate posts.
    for (const s of [-1, 1]) b.rod([Math.cos(gate + s * gateHalf * 1.1) * R, 0, Math.sin(gate + s * gateHalf * 1.1) * R], [Math.cos(gate + s * gateHalf * 1.15) * R, fenceH + 0.5, Math.sin(gate + s * gateHalf * 1.15) * R], 0.07, 0.05, '#5d4a3a', 5);
    if (a.state === 'shut' || a.state === 'breached') tangle(gx, gz, 1.5, Math.max(1.1, fenceH), 22, gate);
    else tangle(Math.cos(gate + gateHalf * 2.2) * (R + 1.6), Math.sin(gate + gateHalf * 2.2) * (R + 1.6), 1.4, 0.9, 18, gate);
    if (breach !== null) {
      for (let i = 0; i < 16; i++) {
        const t = breach + (random() - 0.5) * 0.5, r = R + (random() - 0.6) * 4.5, x = Math.cos(t) * r, z = Math.sin(t) * r, ang = random() * 6.28, len = mix(0.7, 1.8, random());
        b.rod([x, 0.06, z], [x + Math.cos(ang) * len, 0.08 + random() * 0.25, z + Math.sin(ang) * len], 0.035, 0.012, vary(thorn, random, 0.12), 4);
      }
      // Drag marks leading out.
      for (let i = 0; i < 5; i++) b.box([0.16, 0.012, 1.1], [Math.cos(breach) * (R - 2.6 + i * 0.8), 0.045, Math.sin(breach) * (R - 2.6 + i * 0.8)], '#5c3324', [0, -breach + 1.57 + (random() - 0.5) * 0.3, 0]);
    }

    // Huts.
    const mud = new THREE.Color('#7f5f47').lerp(new THREE.Color('#a8998a'), mood.wear * 0.4);
    const taken: { x: number; z: number; r: number }[] = [];
    const doors: P3[] = [];
    const hut = (hx: number, hz: number, kind: 'loaf' | 'round' | 'frame') => {
      const face = Math.atan2(-hx, -hz); // rotation.y that turns +z toward the yard centre
      const h = new Batch();
      taken.push({ x: hx, z: hz, r: 2.5 });
      if (kind === 'loaf') {
        h.ball([2.0, 1.3, 1.35], [0, 0.3, 0], vary(mud, random, 0.04), undefined, 18);
        h.ball([0.72, 0.85, 0.7], [1.25, 0.25, 1.1], vary(mud, random, 0.04), undefined, 12);
        h.ball([0.34, 0.6, 0.2], [1.3, 0.2, 1.72], '#1a1410', undefined, 8);
        for (let i = 0; i < 9; i++) h.rod([-1.8 + i * 0.45, 1.0 + Math.sin((i / 8) * 3.14) * 0.45, 0.85 - Math.sin((i / 8) * 3.14) * 0.1], [-1.8 + i * 0.45 + (random() - 0.5) * 0.2, 0.3, 1.3 - Math.abs(i - 4) * 0.08], 0.022, 0.022, '#5d4a3a', 4);
        for (let i = 0; i < 6; i++) { const t = random() * 6.28; h.blob([0.3, 0.05, 0.25], [Math.cos(t) * 1.2 * random(), 1.55 - random() * 0.2, Math.sin(t) * 0.8 * random()], vary(mud, random, 0.05).offsetHSL(0, 0, 0.07), [0, random() * 3, 0], 0); }
      } else if (kind === 'round') {
        h.drum(1.55, 1.5, [0, 0.75, 0], vary(mud, random, 0.04), undefined, 16);
        h.cone(2.15, 1.7, [0, 2.3, 0], vary('#b99c5e', random, 0.05), undefined, 14);
        h.cone(2.3, 0.5, [0, 1.62, 0], vary('#a88c52', random, 0.05), undefined, 14);
        h.ball([0.12, 0.2, 0.12], [0, 3.2, 0], '#6d5a3a', undefined, 6);
        h.box([0.6, 1.15, 0.12], [0, 0.58, 1.52], '#1a1410');
        h.box([0.75, 0.1, 0.16], [0, 1.2, 1.54], '#5d4a3a');
      } else {
        for (let i = 0; i < 7; i++) { const x = -1.8 + i * 0.6, w = 1.25 * Math.sqrt(Math.max(0.1, 1 - (x / 2.1) ** 2)); h.tube([[x, 0, -w], [x + (random() - 0.5) * 0.2, 1.45 * (w / 1.25) + 0.1, 0], [x, 0, w]], 0.035, 0.03, '#6a5644', 5); }
        for (const y of [0.5, 1.0]) h.tube([[-1.9, y * 0.8, 0.9], [0, y, 1.2 - y * 0.25], [1.9, y * 0.8, 0.9]], 0.025, 0.025, '#6a5644', 4);
        for (let i = 0; i < 8; i++) h.blob([mix(0.2, 0.5, random()), 0.12, mix(0.2, 0.4, random())], [(random() - 0.5) * 3.6, 0.08, (random() - 0.5) * 2.2], vary(mud, random, 0.06), [0, random() * 3, 0], 0);
      }
      const m = new THREE.Matrix4().compose(new THREE.Vector3(hx, 0, hz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, face, 0)), new THREE.Vector3(1, 1, 1));
      b.absorb(h, m);
      const door = new THREE.Vector3(kind === 'loaf' ? 1.3 : 0, 0, 2.4).applyMatrix4(m);
      doors.push([door.x, 0, door.z]);
    };
    const back = gate + Math.PI;
    if (a.dwelling === 'pair') {
      hut(Math.cos(back - 1.02) * (R - 2.6), Math.sin(back - 1.02) * (R - 2.6), 'loaf');
      hut(Math.cos(back + 1.02) * (R - 2.6), Math.sin(back + 1.02) * (R - 2.6), 'loaf');
    } else hut(Math.cos(back + 0.25) * (R - 2.7), Math.sin(back + 0.25) * (R - 2.7), a.dwelling === 'frame' ? 'frame' : a.dwelling);
    const door = doors[0];

    // Fire.
    const flames: THREE.Mesh[] = [];
    const smoke: THREE.Mesh[] = [];
    const fx = door[0] * 0.55, fz = door[2] * 0.55 + 0.4;
    if (a.fire) {
      taken.push({ x: fx, z: fz, r: 1.1 });
      for (let i = 0; i < 3; i++) b.blob([0.18, 0.14, 0.18], [fx + Math.cos(i * 2.09) * 0.36, 0.1, fz + Math.sin(i * 2.09) * 0.36], vary('#6b645c', random, 0.06), [random(), random(), 0], 0);
      for (let i = 0; i < 4; i++) b.rod([fx + Math.cos(i * 1.6 + 0.5) * 0.75, 0.05, fz + Math.sin(i * 1.6 + 0.5) * 0.75], [fx, 0.12, fz], 0.05, 0.04, '#2f251d', 5);
      b.drum(0.5, 0.02, [fx, 0.05, fz], '#221c18', undefined, 9);
      const flameMaterial = new THREE.MeshStandardMaterial({ color: '#ffb23e', emissive: '#ff7a1c', emissiveIntensity: mix(1.2, 2.4, mood.energy), roughness: 0.6 });
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.55 + i * 0.12, 6), flameMaterial);
        f.position.set(fx + (random() - 0.5) * 0.18, 0.36 + i * 0.05, fz + (random() - 0.5) * 0.18);
        flames.push(f); root.add(f);
      }
      const smokeMaterial = new THREE.MeshStandardMaterial({ color: '#cfc8bd', transparent: true, opacity: 0.32, depthWrite: false, roughness: 1 });
      const puff = new THREE.IcosahedronGeometry(1, 1);
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(puff, smokeMaterial); m.userData.t = i / 6; smoke.push(m); root.add(m); }
    }

    // Animals.
    const free = (x: number, z: number, r: number) => Math.hypot(x, z) < R - fenceW * 0.5 - r - 0.2 && taken.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + r);
    const spot = (r: number): [number, number] | null => { for (let k = 0; k < 40; k++) { const t = random() * 6.28, d = Math.sqrt(random()) * (R - 1.4), x = Math.cos(t) * d, z = Math.sin(t) * d; if (free(x, z, r)) { taken.push({ x, z, r }); return [x, z]; } } return null; };
    const beast = (x: number, z: number, heading: number, kind: 'cow' | 'goat', lying = false) => {
      const c = new Batch();
      const coats = kind === 'cow' ? ['#e9e2d2', '#8a4a2c', '#2b2420', '#b98a5e', '#d9cfbd'] : ['#e8e0cf', '#5a4636', '#b38a62', '#2e2824'];
      const coat = vary(coats[Math.floor(random() * coats.length)], random, 0.05), dark = '#2a211b';
      const s = kind === 'cow' ? mix(0.88, 1.08, random()) : mix(0.4, 0.5, random()), legs = lying ? 0.12 : 0.72;
      c.ball([0.78, 0.4, 0.34], [0, legs + 0.36, 0], coat, undefined, 12);
      if (random() < 0.45) c.ball([0.4, 0.33, 0.35], [(random() - 0.5) * 0.7, legs + 0.42, 0], vary(coats[Math.floor(random() * coats.length)], random, 0.05), undefined, 10);
      if (kind === 'cow') c.ball([0.22, 0.2, 0.17], [0.42, legs + 0.78, 0], coat, undefined, 9); // hump
      c.shaped([[0.6, legs + 0.5, 0], [0.9, legs + 0.62, 0], [1.2, legs + 0.52, 0]], (t) => mix(0.22, 0.11, t), coat, 8);
      c.ball([0.08, 0.07, 0.09], [1.22, legs + 0.5, 0], dark, undefined, 6);
      for (const z of [-1, 1]) {
        if (kind === 'cow') c.tube([[0.92, legs + 0.76, z * 0.09], [0.9, legs + 0.98, z * 0.36], [1.0, legs + 1.25, z * 0.42]], 0.04, 0.012, '#e8dcc0', 5);
        else c.tube([[0.92, legs + 0.76, z * 0.07], [0.8, legs + 0.95, z * 0.1], [0.62, legs + 0.92, z * 0.14]], 0.035, 0.012, '#4a3c30', 5);
        c.rod([0.9, legs + 0.68, z * 0.12], [0.84, legs + 0.64, z * 0.34], 0.05, 0.02, coat, 4);
        if (!lying) { c.rod([0.5, legs + 0.2, z * 0.2], [0.5 + (random() - 0.5) * 0.2, 0, z * 0.2], 0.085, 0.055, coat, 6); c.rod([-0.55, legs + 0.2, z * 0.2], [-0.6 + (random() - 0.5) * 0.2, 0, z * 0.2], 0.09, 0.055, coat, 6); }
      }
      c.tube([[-0.76, legs + 0.5, 0], [-0.9, legs + 0.1, 0.02], [-0.88, Math.max(0.1, legs - 0.35), 0.04]], 0.03, 0.02, dark, 4);
      b.absorb(c, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading, 0)), new THREE.Vector3(s, s, s)));
    };
    const cows = deserted || a.stock === 'none' || a.stock === 'goats' ? 0 : Math.round(mix(4, 9, mood.density) * (a.stock === 'mixed' ? 0.5 : 1) * (a.state === 'breached' ? 0.6 : 1));
    const goats = deserted || a.stock === 'none' || a.stock === 'cattle' ? 0 : Math.round(mix(6, 14, mood.density) * (a.stock === 'mixed' ? 0.6 : 1));
    const leaving = a.state === 'open' ? Math.min(3, cows + goats) : 0;
    for (let i = 0; i < leaving; i++) {
      const d = R - 1.2 + i * mix(2.1, 2.6, random()), t = gate + (random() - 0.5) * 0.12;
      taken.push({ x: Math.cos(t) * d, z: Math.sin(t) * d, r: 1 });
      beast(Math.cos(t) * d, Math.sin(t) * d, -gate + (random() - 0.5) * 0.3, i < cows ? 'cow' : 'goat');
    }
    for (let i = leaving; i < cows + goats; i++) {
      const kind = i < cows ? 'cow' : 'goat', p = spot(kind === 'cow' ? 1.0 : 0.5);
      if (!p) continue;
      // A frightened herd crowds the far side from a breach; a calm one stands anyhow.
      const heading = breach !== null ? -breach + Math.PI + (random() - 0.5) : random() * 6.28;
      beast(p[0], p[1], heading, kind, a.state === 'shut' && random() < 0.4);
    }

    // People and dog.
    if (a.people === 'herder' || a.people === 'elder') {
      const seated = a.people === 'elder';
      const px = seated ? door[0] * 0.82 + 0.9 : Math.cos(gate - 0.5) * (R - 1.8), pz = seated ? door[2] * 0.82 : Math.sin(gate - 0.5) * (R - 1.8);
      const red = new THREE.Color(seated ? '#7a2f6a' : '#b8262c').lerp(new THREE.Color('#8a5a50'), mood.wear * 0.4), skin = '#4a3024', y = seated ? 0.42 : 0.95;
      if (seated) { b.drum(0.2, 0.42, [px, 0.21, pz], '#6d5238', undefined, 8); b.rod([px + 0.05, 0.45, pz + 0.1], [px + 0.1, 0, pz + 0.5], 0.07, 0.05, skin, 5); b.rod([px - 0.1, 0.45, pz + 0.1], [px - 0.15, 0, pz + 0.48], 0.07, 0.05, skin, 5); }
      else { b.rod([px, y, pz], [px, 0, pz], 0.06, 0.045, skin, 5); b.rod([px + 0.08, y, pz], [px + 0.02, 0.5, pz + 0.12], 0.06, 0.045, skin, 5); b.rod([px + 0.02, 0.5, pz + 0.12], [px - 0.02, 0.52, pz - 0.02], 0.045, 0.04, skin, 5); }
      b.shaped([[px, y - 0.25, pz], [px, y + 0.25, pz], [px, y + 0.62, pz]], (t) => mix(0.26, 0.17, t), red, 8);
      b.ball([0.11, 0.125, 0.11], [px, y + 0.8, pz], skin, undefined, 9);
      b.rod([px + 0.3, 0, pz + 0.15], [px + 0.22, seated ? 1.5 : 2.05, pz + 0.05], 0.018, 0.015, '#7d6244', 4);
      b.rod([px + 0.14, y + 0.5, pz], [px + 0.25, y + 0.2, pz + 0.08], 0.04, 0.035, skin, 4);
    } else if (a.people === 'dog') {
      const dx = Math.cos(gate) * (R - 1.5), dz = Math.sin(gate) * (R - 1.5), fur = '#c9a45e';
      const d = new Batch();
      d.ball([0.42, 0.15, 0.17], [0, 0.15, 0], fur, undefined, 9).ball([0.13, 0.11, 0.11], [0.5, 0.2, 0.05], fur, undefined, 8).box([0.16, 0.07, 0.08], [0.64, 0.17, 0.06], fur);
      for (const z of [-1, 1]) { d.cone(0.04, 0.1, [0.46, 0.33, 0.05 + z * 0.07], fur, undefined, 4); d.rod([0.3, 0.08, z * 0.14], [0.62, 0.04, z * 0.18], 0.04, 0.03, fur, 4); }
      d.tube([[-0.4, 0.14, 0], [-0.6, 0.06, 0.15], [-0.45, 0.05, 0.3]], 0.03, 0.015, fur, 4);
      b.absorb(d, new THREE.Matrix4().compose(new THREE.Vector3(dx, 0, dz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -gate + 1.3, 0)), new THREE.Vector3(1.2, 1.2, 1.2)));
    }

    // Extras.
    const lamps: THREE.Mesh[] = [];
    if (a.extras === 'jerrycans') {
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) { const x = door[0] * 0.9 - 1.0 - i * 0.34, z = door[2] * 0.9 + 0.2 + (random() - 0.5) * 0.15; b.box([0.26, 0.42, 0.18], [x, 0.21, z], vary('#f0c020', random, 0.04), [0, random() * 0.5, 0]); b.drum(0.035, 0.07, [x + 0.07, 0.45, z], '#2a5fb0', undefined, 6); }
    } else if (a.extras === 'hides') {
      const hx = door[0] * 0.5 - 2.2, hz = door[2] * 0.5 + 1.2;
      for (let i = 0; i < 2; i++) {
        const x = hx + i * 2.0, z = hz + i * 0.6, c = vary(i ? '#8a4a2c' : '#d8ccb8', random, 0.05);
        b.box([1.3, 0.025, 0.9], [x, 0.06, z], c, [0, 0.4 + i, 0]);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box([0.34, 0.025, 0.2], [x + sx * 0.72 * Math.cos(0.4 + i), 0.06, z + sz * 0.5], c, [0, 0.4 + i + sx * sz * 0.6, 0]);
      }
      const rx = door[0] * 0.9 - 1.6, rz = door[2] * 0.9;
      for (const s of [-1, 1]) b.rod([rx + s * 0.7, 0, rz], [rx + s * 0.7, 1.4, rz], 0.035, 0.03, '#5d4a3a', 4);
      b.rod([rx - 0.8, 1.35, rz], [rx + 0.8, 1.35, rz], 0.03, 0.03, '#5d4a3a', 4);
      for (let i = 0; i < 3; i++) { b.ball([0.14, 0.17, 0.14], [rx - 0.45 + i * 0.45, 1.05, rz], vary('#b98a3e', random, 0.06), undefined, 8); b.rod([rx - 0.45 + i * 0.45, 1.35, rz], [rx - 0.45 + i * 0.45, 1.18, rz], 0.012, 0.03, '#5d4a3a', 4); }
    } else if (a.extras === 'lights') {
      const lampMaterial = new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#cfeaff', emissiveIntensity: 2.2 });
      const bulb = new THREE.SphereGeometry(0.09, 8, 6);
      for (let i = 0; i < 9; i++) {
        const t = (i / 9) * 6.28 + 0.2, r = R + fenceW * 0.5 + 0.2, y = Math.max(1.6, fenceH + 0.6);
        b.rod([Math.cos(t) * r, 0, Math.sin(t) * r], [Math.cos(t) * r, y, Math.sin(t) * r], 0.03, 0.025, '#5d4a3a', 4);
        b.box([0.2, 0.03, 0.14], [Math.cos(t) * r, y + 0.14, Math.sin(t) * r], '#28364a', [0.4, -t, 0]);
        const m = new THREE.Mesh(bulb, lampMaterial); m.position.set(Math.cos(t) * r, y, Math.sin(t) * r); lamps.push(m); root.add(m);
      }
    }
    // Grass: creeping back into an abandoned yard, otherwise only outside.
    for (let i = 0; i < (deserted ? 70 : 26); i++) {
      const t = random() * 6.28, d = deserted && i > 20 ? Math.sqrt(random()) * (R - 1) : R + fenceW * 0.6 + 0.3 + random() * 0.8, x = Math.cos(t) * d, z = Math.sin(t) * d;
      if (d < R && !free(x, z, 0.2)) continue;
      const c = vary('#c8ae68', random, 0.1);
      for (let k = 0; k < 3; k++) b.cone(0.04, mix(0.3, 0.7, random()), [x + random() * 0.14, 0.2, z + random() * 0.14], c, [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], 4);
    }

    root.add(b.mesh({ roughness: 0.92 }));
    const pace = mix(0.6, 2, mood.energy);
    const drift = (time: number) => smoke.forEach((m) => {
      const t = (m.userData.t + time * 0.06 * pace) % 1;
      m.position.set(fx + t * 1.6 + Math.sin(t * 9) * 0.15, 0.9 + t * 4.2, fz + Math.cos(t * 7) * 0.15);
      m.scale.setScalar(0.22 + t * 0.75);
    });
    drift(0);
    return {
      object: root,
      update: (_dt, time) => {
        flames.forEach((f, i) => { f.scale.set(1, 1 + Math.sin(time * 9 * pace + i * 2) * 0.22, 1); f.rotation.y = time * 3 + i; });
        drift(time);
        lamps.forEach((m, i) => m.scale.setScalar(Math.sin(time * 4 * pace + i * 0.7) > 0 ? 1 : 0.35));
      },
      dispose: () => {
        const seen = new Set<{ dispose(): void }>();
        root.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          seen.add(mesh.geometry); seen.add(mesh.material as THREE.Material);
        });
        for (const item of seen) item.dispose();
        root.removeFromParent();
      },
    };
  },
});
