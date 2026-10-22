import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

export default defineThing({
  questions: {
    shape: choice('What form has the colony built?', {
      cathedral: 'A cluster of sharp fused spires and buttresses, like a melted gothic church.',
      chimney: 'One tall leaning chimney with an open vent at the top, on a swollen base.',
      dome: 'A broad rounded hump studded with knobs and small turrets.',
      blade: 'A thin tall wall like a tombstone, crenellated along its ridge, a compass mound.',
      ruin: 'A broken mound: the main tower snapped off, rubble at its foot and the honeycomb of galleries laid open.',
    }),
    height: score('How tall is it?', ['Waist high', 'Taller than a person', 'Towering, twice the height of a man']),
    earth: choice('What earth is it made of?', {
      red: 'Brick-red laterite, the colour of African roads.',
      ochre: 'Warm yellow ochre sand.',
      grey: 'Pale ashy grey clay, bleached like bone.',
      black: 'Dark chocolate cotton soil, almost black.',
    }),
    burrow: choice('What is at the hole at its base?', {
      hole: 'A plain dark burrow mouth, round and quiet.',
      dug: 'An aardvark has torn it wide open: a ragged cave with a fan of fresh spoil thrown out.',
      warthog: 'A warthog backed in for the night, its warty face and curved tusks filling the entrance.',
      sealed: 'No hole: the colony has plastered every opening shut.',
    }),
    lookout: choice('What is using it as a lookout post?', {
      nothing: 'Nothing.',
      eagle: 'A white-headed fish eagle perched on the highest spire.',
      cheetah: 'A cheetah sitting upright on top, scanning the plain.',
      mongooses: 'A band of dwarf mongooses standing sentry on the ledges like little bowling pins.',
    }),
    growth: choice('What grows on or around it?', {
      bare: 'Bare baked earth and a few dry grass stems.',
      grass: 'A crown of tall tawny grass sprouting from the shoulders.',
      shrub: 'A thorny green shrub rooted into one flank.',
      mushrooms: 'A ring of big pale termite mushrooms pushed up around the base after rain.',
    }),
    swarm: noul('Are winged termites pouring out and rising in a cloud, as on the evening after the first rains?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const earth = new Batch();
    const prop = new Batch();
    const base = new THREE.Color({ red: '#b04d2a', ochre: '#c18b46', grey: '#b5a892', black: '#5a4c42' }[a.earth])
      .lerp(new THREE.Color('#c9a27c'), mood.wear * 0.2)
      .lerp(new THREE.Color('#c0522a'), a.earth === 'red' ? mood.warmth * 0.2 : 0);
    const damp = base.clone().multiplyScalar(0.66);
    const H = mix(1.1, 5.2, a.height) * mix(0.9, 1.1, random());
    const B = H * 0.3 + 0.28, small = Math.min(1, H / 2.6);
    const tops: THREE.Vector3[] = [];
    const ledges: THREE.Vector3[] = [];

    /** A fluted earth spire. */
    const spire = (x: number, z: number, h: number, r: number, lean: number, blunt = 0) => {
      const t0 = random() * 6.28, ph = random() * 6.28, lx = Math.cos(t0) * lean, lz = Math.sin(t0) * lean;
      const pts: P3[] = [[x, -0.25, z], [x + lx * 0.25 + (random() - 0.5) * r * 0.5, h * 0.35, z + lz * 0.25 + (random() - 0.5) * r * 0.5], [x + lx * 0.6 + (random() - 0.5) * r * 0.4, h * 0.7, z + lz * 0.6 + (random() - 0.5) * r * 0.4], [x + lx, h, z + lz]];
      earth.shaped(pts, (t) => r * (Math.max(blunt, (1 - t) ** 0.7) * (1 + 0.14 * Math.sin(t * 8 + ph)) + 0.04), vary(base, random, 0.07), 7);
      tops.push(new THREE.Vector3(x + lx, h, z + lz));
      // Knobs and half-built turrets on its flanks.
      const knobs = 2 + Math.floor(random() * 4);
      for (let i = 0; i < knobs; i++) {
        const t = mix(0.15, 0.7, random()), ang = random() * 6.28, rr = r * (1 - t) ** 0.7 * 0.85, s = r * mix(0.2, 0.34, random());
        const p: P3 = [x + lx * t + Math.cos(ang) * rr, h * t, z + lz * t + Math.sin(ang) * rr];
        earth.blob([s, s * mix(1.1, 2.2, random()), s], p, random() < mix(0.5, 0.05, mood.wear) ? vary(damp, random, 0.05) : vary(base, random, 0.07), [random() * 0.4, random() * 3, random() * 0.4]);
        if (s > 0.12) ledges.push(new THREE.Vector3(p[0], p[1] + s * 1.2, p[2]));
      }
    };

    // The apron of washed-down soil everything rises from.
    earth.blob([B * 1.3, 0.1 + H * 0.08, B * 1.25], [0, 0.02, 0], vary(base, random, 0.05).offsetHSL(0, -0.03, 0.04), [0, random() * 3, 0], 2);

    if (a.shape === 'cathedral' || a.shape === 'ruin') {
      const broken = a.shape === 'ruin';
      spire(0, 0, broken ? H * 0.46 : H, B * 0.5, H * 0.05, broken ? 0.72 : 0);
      const n = 5 + Math.floor(random() * 4 + mood.density * 3);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 6.28 + random() * 0.6, d = B * mix(0.4, 0.9, random());
        spire(Math.cos(t) * d, Math.sin(t) * d, H * mix(0.3, 0.8, random()) * (1.15 - d / B * 0.45) * (broken ? 0.7 : 1), B * mix(0.17, 0.3, random()), H * 0.06);
      }
      if (broken) {
        const top = tops[0];
        // The open honeycomb and the fallen tower.
        earth.drum(B * 0.5, 0.06, [top.x, top.y + 0.02, top.z], vary(base, random, 0.04).offsetHSL(0, 0, 0.08), [0.15, 0, 0.1], 8);
        for (let i = 0; i < 16; i++) { const t = random() * 6.28, d = Math.sqrt(random()) * B * 0.4; prop.ball([0.07, 0.04, 0.07], [top.x + Math.cos(t) * d, top.y + 0.06, top.z + Math.sin(t) * d], '#241a14', undefined, 6); }
        const dir = random() * 1.2 + 0.2;
        for (let i = 0; i < 7; i++) {
          const d = B * 0.9 + i * H * 0.085, s = B * mix(0.42, 0.2, i / 7) * mix(0.8, 1.2, random());
          earth.blob([s, s * 0.7, s * 1.2], [Math.cos(dir) * d + (random() - 0.5) * 0.4, s * 0.45, Math.sin(dir) * d + (random() - 0.5) * 0.4], vary(base, random, 0.08), [random(), random() * 3, random()], 0);
        }
      }
    } else if (a.shape === 'chimney') {
      earth.blob([B * 0.8, H * 0.26, B * 0.8], [0, H * 0.1, 0], vary(base, random, 0.05), [0, random() * 3, 0], 2);
      const lean = H * 0.16, t0 = random() * 6.28, top: P3 = [Math.cos(t0) * lean, H, Math.sin(t0) * lean];
      earth.shaped([[0, 0, 0], [top[0] * 0.2, H * 0.4, top[2] * 0.2], [top[0] * 0.65, H * 0.75, top[2] * 0.65], top], (t) => B * mix(0.55, 0.2, t ** 0.7) * (1 + 0.08 * Math.sin(t * 14)), vary(base, random, 0.05), 8);
      earth.drum(B * 0.24, 0.16, [top[0], H + 0.02, top[2]], vary(damp, random, 0.05), undefined, 8, B * 0.21);
      prop.drum(B * 0.15, 0.03, [top[0], H + 0.1, top[2]], '#1d1511', undefined, 8);
      tops.push(new THREE.Vector3(top[0], H + 0.1, top[2]));
      for (let i = 0; i < 3; i++) { const t = random() * 6.28; spire(Math.cos(t) * B * 0.8, Math.sin(t) * B * 0.8, H * mix(0.35, 0.6, random()), B * 0.24, 0.1); }
    } else if (a.shape === 'dome') {
      earth.blob([B * 1.0, H * 0.5, B * 0.95], [0, H * 0.18, 0], vary(base, random, 0.05), [0, random() * 3, 0], 2);
      tops.push(new THREE.Vector3(0, H * 0.68, 0));
      const n = 6 + Math.floor(random() * 5 + mood.density * 4);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 6.28 + random(), d = B * mix(0.15, 0.85, random());
        spire(Math.cos(t) * d, Math.sin(t) * d, H * (1.02 - (d / B) * 0.5) * mix(0.85, 1.1, random()), B * mix(0.14, 0.22, random()), 0.1);
      }
      tops.sort((p, q) => q.y - p.y);
    } else {
      // Blade: a thin wall aligned so its broad face shows.
      earth.blob([B * 1.25, H * 0.45, B * 0.24], [0, H * 0.2, 0], vary(base, random, 0.05), undefined, 2);
      const n = 7 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const x = mix(-B * 1.1, B * 1.1, i / (n - 1)), edge = 1 - Math.abs(x / (B * 1.1)) ** 2 * 0.45;
        spire(x, (random() - 0.5) * 0.12, H * edge * mix(0.72, 1.05, random()), B * mix(0.2, 0.3, random()), 0.05);
      }
      tops.sort((p, q) => q.y - p.y);
    }
    const peak = tops[0];

    // Weather cracks on a worn mound.
    if (mood.wear > 0.55) for (let i = 0; i < 6; i++) { const t = random() * 6.28, r = B * 0.75; prop.box([0.03, H * mix(0.15, 0.35, random()), 0.03], [Math.cos(t) * r, H * 0.2, Math.sin(t) * r], '#3a2a20', [(random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4]); }

    // The burrow, always toward the viewer.
    const hx = (random() - 0.5) * B * 0.9, hz = Math.sqrt(Math.max(0.1, (B * 1.12) ** 2 - hx * hx));
    if (a.burrow !== 'sealed') {
      const big = a.burrow === 'dug' ? 1.55 : a.burrow === 'warthog' ? 1.2 : 1, w = Math.min(0.5, 0.1 + H * 0.11) * big;
      prop.ball([w, w * 0.9, w * 0.6], [hx, w * 0.75, hz - w * 0.25], '#17110d', undefined, 10);
      // A raised lip of packed earth around the mouth.
      for (let i = 0; i < 9; i++) { const t = (i / 8) * Math.PI; earth.blob([w * 0.3, w * 0.3, w * 0.3], [hx + Math.cos(t) * w * 1.08, w * 0.75 + Math.sin(t) * w * 0.98, hz - w * 0.2], vary(base, random, 0.06), [random(), random(), 0], 0); }
      if (a.burrow === 'dug') {
        for (let i = 0; i < 22; i++) { const d = random() ** 0.7 * 2.2, s = mix(0.22, 0.07, d / 2.2) * mix(0.7, 1.4, random()); earth.blob([s * 1.3, s * 0.7, s * 1.3], [hx + (random() - 0.5) * (0.5 + d * 0.9), s * 0.4, hz + 0.2 + d], vary(base, random, 0.08).offsetHSL(0, 0, 0.07), [random(), random(), random()], 0); }
        for (let i = 0; i < 4; i++) prop.box([0.025, 0.02, 0.5], [hx - 0.2 + i * 0.13, 0.03, hz + 0.75 + random() * 0.2], '#3a2a20', [0, (random() - 0.5) * 0.3, 0]);
      }
      if (a.burrow === 'warthog') {
        const hide = '#6f655c', y = w * 0.7, z = hz + w * 0.1;
        prop.ball([w * 0.5, w * 0.48, w * 0.4], [hx, y, z - w * 0.2], hide, undefined, 10);
        prop.box([w * 0.42, w * 0.3, w * 0.6], [hx, y - w * 0.12, z + w * 0.25], hide, [0.2, 0, 0]);
        prop.drum(w * 0.24, w * 0.1, [hx, y - w * 0.2, z + w * 0.58], '#514840', [1.35, 0, 0], 8);
        for (const s of [-1, 1]) {
          prop.tube([[hx + s * w * 0.2, y - w * 0.22, z + w * 0.45], [hx + s * w * 0.5, y - w * 0.15, z + w * 0.5], [hx + s * w * 0.55, y + w * 0.18, z + w * 0.42]], w * 0.07, w * 0.02, '#efe6cf', 5);
          prop.blob([w * 0.1, w * 0.1, w * 0.1], [hx + s * w * 0.32, y + w * 0.02, z + w * 0.12], '#5a5048', undefined, 0);
          prop.ball([w * 0.045, w * 0.045, w * 0.045], [hx + s * w * 0.22, y + w * 0.22, z + w * 0.12], '#0e0b09', undefined, 6);
          prop.cone(w * 0.1, w * 0.3, [hx + s * w * 0.36, y + w * 0.52, z - w * 0.2], hide, [0, 0, -s * 0.5], 4);
        }
        for (let i = 0; i < 5; i++) prop.cone(w * 0.03, w * 0.4, [hx + (random() - 0.5) * w * 0.1, y + w * 0.6, z - w * 0.3 + i * w * 0.07], '#8a6d4a', [-0.4, 0, 0], 3);
      }
    }

    // Lookouts.
    if (a.lookout === 'eagle') {
      const p = peak, s = 1;
      prop.ball([0.15 * s, 0.27 * s, 0.17 * s], [p.x, p.y + 0.3, p.z], '#3a2a20', [0.2, 0, 0], 10);
      prop.ball([0.1, 0.1, 0.1], [p.x, p.y + 0.6, p.z + 0.08], '#f4f1e8', undefined, 8);
      prop.ball([0.11, 0.12, 0.11], [p.x, p.y + 0.46, p.z + 0.07], '#f4f1e8', undefined, 8);
      prop.cone(0.035, 0.13, [p.x, p.y + 0.57, p.z + 0.2], '#e4b02c', [2.0, 0, 0], 5);
      prop.box([0.16, 0.03, 0.26], [p.x, p.y + 0.1, p.z - 0.2], '#f4f1e8', [0.9, 0, 0]);
      for (const z of [-1, 1]) prop.rod([p.x + z * 0.05, p.y + 0.1, p.z], [p.x + z * 0.05, p.y - 0.03, p.z + 0.03], 0.018, 0.018, '#e4b02c', 4);
    } else if (a.lookout === 'cheetah') {
      const p = peak, fur = '#d9a94f', dir = random() < 0.5 ? -1 : 1;
      earth.blob([0.55, 0.3, 0.5], [p.x, p.y - 0.12, p.z], vary(base, random, 0.05), undefined, 1);
      const y = p.y + 0.12;
      prop.ball([0.3, 0.2, 0.17], [p.x - dir * 0.18, y + 0.18, p.z], fur, [0, 0, dir * 0.25], 10); // haunches
      prop.shaped([[p.x - dir * 0.12, y + 0.2, p.z], [p.x + dir * 0.1, y + 0.5, p.z], [p.x + dir * 0.22, y + 0.78, p.z]], (t) => mix(0.19, 0.12, t), fur, 8); // chest
      for (const z of [-1, 1]) prop.rod([p.x + dir * 0.22, y + 0.62, p.z + z * 0.07], [p.x + dir * 0.3, y, p.z + z * 0.07], 0.05, 0.04, fur, 5);
      prop.ball([0.12, 0.11, 0.105], [p.x + dir * 0.3, y + 0.92, p.z], fur, undefined, 10);
      prop.box([0.1, 0.07, 0.09], [p.x + dir * 0.41, y + 0.88, p.z], '#efe2c0');
      for (const z of [-1, 1]) { prop.cone(0.035, 0.07, [p.x + dir * 0.26, y + 1.04, p.z + z * 0.07], '#2a2018', undefined, 4); prop.box([0.02, 0.1, 0.012], [p.x + dir * 0.4, y + 0.9, p.z + z * 0.05], '#1b1410'); }
      prop.tube([[p.x - dir * 0.42, y + 0.14, p.z], [p.x - dir * 0.75, y - 0.02, p.z + 0.1], [p.x - dir * 0.95, y - 0.3, p.z + 0.2]], 0.04, 0.03, fur, 5);
      prop.ball([0.04, 0.05, 0.04], [p.x - dir * 0.96, y - 0.34, p.z + 0.2], '#1b1410', undefined, 6);
      for (let i = 0; i < 26; i++) { const t = random(), ang = random() * 6.28; prop.ball([0.022, 0.022, 0.022], [p.x - dir * 0.2 + dir * t * 0.42 + Math.cos(ang) * 0.03, y + 0.16 + t * 0.55 + Math.sin(ang) * 0.12, p.z + (random() < 0.5 ? -1 : 1) * mix(0.17, 0.13, t)], '#1b1410', undefined, 5); }
    } else if (a.lookout === 'mongooses') {
      const spots = [peak, ...ledges.sort(() => random() - 0.5)].slice(0, 3 + Math.floor(random() * 3 + mood.density * 2));
      for (const p of spots) {
        const fur = vary('#8a6a48', random, 0.08), yaw = (random() - 0.5) * 1.6, fx = Math.sin(yaw), fz = Math.cos(yaw);
        prop.shaped([[p.x, p.y - 0.05, p.z], [p.x + fx * 0.02, p.y + 0.14, p.z + fz * 0.02], [p.x + fx * 0.03, p.y + 0.3, p.z + fz * 0.03]], (t) => mix(0.075, 0.045, t), fur, 6);
        prop.ball([0.045, 0.042, 0.055], [p.x + fx * 0.05, p.y + 0.33, p.z + fz * 0.05], fur, [0, yaw, 0], 7);
        prop.cone(0.02, 0.05, [p.x + fx * 0.1, p.y + 0.325, p.z + fz * 0.1], '#3a2c20', [1.57, yaw, 0], 4);
        prop.tube([[p.x - fx * 0.05, p.y, p.z - fz * 0.05], [p.x - fx * 0.16, p.y - 0.02, p.z - fz * 0.16], [p.x - fx * 0.26, p.y - 0.06, p.z - fz * 0.26]], 0.02, 0.008, fur, 4);
      }
    }

    // Growth.
    const grass = (x: number, z: number, y: number, tall: number) => { const c = vary('#cbb169', random, 0.1); for (let k = 0; k < 4; k++) prop.cone(0.035, tall * mix(0.6, 1, random()), [x + (random() - 0.5) * 0.14, y + tall * 0.35, z + (random() - 0.5) * 0.14], c, [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], 4); };
    const tufts = 8 + Math.floor(random() * 6 + mood.density * 6);
    for (let i = 0; i < tufts; i++) { const t = random() * 6.28, d = B * mix(1.25, 1.75, random()); grass(Math.cos(t) * d, Math.sin(t) * d, 0, mix(0.3, 0.6, random()) * mix(0.5, 1, small)); }
    if (a.growth === 'grass') for (let i = 0; i < 22; i++) { const t = random() * 6.28, d = B * mix(0.5, 1.05, random()); grass(Math.cos(t) * d, Math.sin(t) * d, 0.1 + H * 0.1 * (1 - d / B), mix(0.6, 1.1, random()) * small); }
    if (a.growth === 'shrub') {
      const t = Math.PI * mix(0.75, 1.25, random()) + (random() < 0.5 ? 0 : Math.PI) * 0, sx = Math.cos(t) * B * 0.95, sz = Math.abs(Math.sin(t)) * B * 0.6 + 0.2, green = new THREE.Color('#5e8442').lerp(new THREE.Color('#8f8a55'), mood.wear * 0.6);
      for (let i = 0; i < 6; i++) {
        const tip: P3 = [sx + (random() - 0.5) * 1.5, 0.9 + random() * 0.9, sz + (random() - 0.5) * 1.3];
        prop.rod([sx, 0.2, sz], tip, 0.04, 0.015, '#4d3d30', 4);
        const s = mix(0.3, 0.5, random());
        prop.blob([s, s * 0.6, s], tip, vary(green, random, 0.1), [0, random() * 3, 0], 1);
      }
    }
    if (a.growth === 'mushrooms') {
      const n = 9 + Math.floor(random() * 8);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 6.28 + random() * 0.4, d = B * mix(1.15, 1.5, random()), x = Math.cos(t) * d, z = Math.sin(t) * d, s = mix(0.12, 0.3, random()) * mix(0.45, 1, small);
        prop.rod([x, 0, z], [x + (random() - 0.5) * 0.05, s * 1.5, z], s * 0.16, s * 0.13, '#f1ead8', 5);
        prop.ball([s, s * 0.4, s], [x, s * 1.5, z], vary('#e3d5b6', random, 0.05), undefined, 9);
        prop.ball([s * 0.25, s * 0.2, s * 0.25], [x, s * 1.82, z], '#b89a6c', undefined, 6);
      }
    }

    const body = earth.mesh({ flatShading: true, roughness: 1 });
    root.add(body);
    if (!prop.empty) root.add(prop.mesh({ roughness: 0.85 }));

    // The nuptial flight: a rising column of pale wings.
    let swarm: THREE.InstancedMesh | null = null;
    const motes: { x: number; z: number; y: number; r: number; w: number; s: number }[] = [];
    const top = H + 2.2 + H * 0.4;
    if (a.swarm) {
      const count = Math.round(mix(70, 190, mood.density));
      const material = new THREE.MeshStandardMaterial({ color: '#f3ead2', emissive: '#f0d9a0', emissiveIntensity: 0.35, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
      swarm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.035), material, count);
      for (let i = 0; i < count; i++) motes.push({ x: peak.x, z: peak.z, y: mix(H * 0.5, top, random()), r: random() * 6.28, w: mix(0.4, 1.4, random()), s: mix(0.7, 1.3, random()) });
      root.add(swarm);
    }
    const dummy = new THREE.Object3D();
    const drawSwarm = (time: number) => {
      if (!swarm) return;
      motes.forEach((m, i) => {
        const lift = (m.y - H * 0.5) / (top - H * 0.5), spread = 0.15 + lift * (1.2 + H * 0.3) * m.w;
        dummy.position.set(m.x + Math.cos(m.r + time * 0.6 * m.w) * spread, m.y, m.z + Math.sin(m.r + time * 0.6 * m.w) * spread);
        dummy.rotation.set(m.r + time * 3, m.r * 2, Math.sin(time * 12 * m.w + i) * 0.8);
        dummy.scale.setScalar(m.s);
        dummy.updateMatrix();
        swarm!.setMatrixAt(i, dummy.matrix);
      });
      swarm.instanceMatrix.needsUpdate = true;
    };
    drawSwarm(0);
    const rise = mix(0.25, 1.1, mood.energy);

    return {
      object: root,
      update: (dt, time) => {
        if (!swarm) return;
        for (const m of motes) { m.y += dt * rise * m.w; if (m.y > top) m.y = H * 0.5; }
        drawSwarm(time);
      },
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
