import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const STATES = ['mirror', 'seedlings', 'green', 'gold', 'stubble'] as const;
type State = (typeof STATES)[number];

export default defineThing({
  questions: {
    form: choice('What is the shape of the terraced ground?', {
      knoll: 'A rounded knoll terraced all the way round, like a stepped cake.',
      hillside: 'A hillside whose steps fan wide at the front and crowd together at the back.',
      ridge: 'A long narrow ridge with terraces running in ribbons along it.',
    }),
    levels: score('How many steps are there?', ['Three or four broad ones', 'Six or seven', 'A dozen narrow ribbons']),
    season: choice('What state are the paddies in?', {
      mirror: 'Freshly flooded and bare: every step a mirror full of sky.',
      seedlings: 'Just planted: rows of bright green seedlings standing in water.',
      green: 'High summer: a thick, even green.',
      gold: 'Ripe and golden, ready to cut.',
      stubble: 'After harvest: drained, brown, with stooks of straw.',
      mixed: 'A patchwork, each step at a different stage.',
    }),
    crown: choice('What is on the very top?', {
      paddy: 'Just the last, smallest paddy.',
      trees: 'A clump of dark trees left standing.',
      house: 'A wooden farmhouse on stilts with a dark tiled roof.',
      rocks: 'A knob of bare grey rock nobody could terrace.',
    }),
    now: choice('What is happening on the terraces right now?', {
      empty: 'Nobody is here. The water is still.',
      planting: 'A line of people in conical hats, bent double, planting.',
      flow: 'Water is spilling from step to step through notches in the bunds.',
      egrets: 'White egrets stand about in the shallows.',
      smoke: 'Someone is burning straw: a column of pale smoke.',
    }),
    bund: choice('What are the retaining banks like?', {
      mud: 'Smooth brown mud, freshly plastered by hand.',
      grass: 'Overgrown with grass, green ribbons between the fields.',
      stone: 'Dry-stone walls, grey and old.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = Math.round(mix(4, 11, a.levels));
    const w = mix(2.6, 1.6, a.levels), h = mix(1.7, 1.15, a.levels);
    const R = n * w + mix(2.2, 3.2, random());
    const stretch: [number, number] = a.form === 'ridge' ? [1.6, 0.7] : [1.08, 1];
    const shift = a.form === 'hillside' ? -0.55 : (random() - 0.5) * 0.2;
    const sideways = (random() - 0.5) * 0.3;
    const ph = [random() * 6.28, random() * 6.28, random() * 6.28];
    const lump = (th: number) => 1 + 0.11 * Math.sin(2 * th + ph[0]) + 0.07 * Math.sin(3 * th + ph[1]) + 0.04 * Math.sin(5 * th + ph[2]);
    /** A point on the outer edge of level i (i = n is the summit point). */
    const edge = (i: number, th: number): [number, number] => {
      const r = Math.max(0.01, (R - i * w) * lump(th) + (i > 0 && i < n ? Math.sin(th * 4 + i * 1.7) * w * 0.22 : 0));
      return [(Math.sin(th) * r + i * w * sideways) * stretch[0], (Math.cos(th) * r + i * w * shift) * stretch[1]];
    };
    const top = (i: number) => (i + 1) * h;
    const on = (i: number, th: number, f = 0.5): P3 => {
      const p = edge(i, th), q = edge(i + 1, th);
      return [mix(p[0], q[0], f), top(i), mix(p[1], q[1], f)];
    };

    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const sky = new THREE.Color('#9fc0cf').lerp(new THREE.Color().setHSL(mix(0.6, 0.07, mood.warmth), 0.55, 0.78), 0.2 + dusk * 0.4);
    const mudTone = new THREE.Color({ mud: '#7a5d3f', grass: '#5f8a3c', stone: '#8c8d86' }[a.bund]).lerp(new THREE.Color('#6a6455'), mood.wear * 0.25);
    const wall = new THREE.MeshStandardMaterial({ color: mudTone.clone().multiplyScalar(a.bund === 'stone' ? 0.92 : 0.82), roughness: 0.95, flatShading: a.bund === 'stone' });
    const rim = new THREE.MeshStandardMaterial({ color: mudTone, roughness: 0.9 });
    const surface: Record<State, THREE.MeshStandardMaterial> = {
      mirror: new THREE.MeshStandardMaterial({ color: sky, roughness: 0.08, metalness: 0.35, emissive: sky, emissiveIntensity: 0.08 }),
      seedlings: new THREE.MeshStandardMaterial({ color: sky.clone().lerp(new THREE.Color('#8fae9c'), 0.35), roughness: 0.1, metalness: 0.3, emissive: sky, emissiveIntensity: 0.05 }),
      green: new THREE.MeshStandardMaterial({ color: new THREE.Color('#5fa23a').lerp(new THREE.Color('#8aa04a'), mood.wear * 0.4), roughness: 0.85 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d6ac3c', roughness: 0.85 }),
      stubble: new THREE.MeshStandardMaterial({ color: '#9a8355', roughness: 1 }),
    };
    const rowTone: Record<State, string | null> = { mirror: null, seedlings: '#58c232', green: '#3f7d2a', gold: '#b88a22', stubble: '#c7b071' };
    const rows: { at: P3; size: number; color: THREE.Color }[] = [];
    const stooks: { at: P3; size: number }[] = [];
    const states: State[] = [];

    const STEPS = 96;
    for (let i = 0; i < n; i++) {
      const state: State = a.season === 'mixed' ? STATES[Math.floor(random() * STATES.length)] : a.season;
      states.push(state);
      const shape = new THREE.Shape();
      const line: P3[] = [];
      for (let k = 0; k < STEPS; k++) {
        const [x, z] = edge(i, (k / STEPS) * Math.PI * 2);
        if (k === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
        line.push([x, top(i) + 0.05, z]);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: i === 0 ? h + 0.2 : h, bevelEnabled: false, curveSegments: 1 });
      geometry.rotateX(-Math.PI / 2);
      const slab = new THREE.Mesh(geometry, [surface[state], wall]);
      slab.position.y = i === 0 ? -0.2 : i * h;
      slab.castShadow = slab.receiveShadow = true;
      s.root.add(slab);
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line.map((p) => new THREE.Vector3(...p)), true), STEPS, mix(0.15, 0.22, random()), 5, true), rim);

      const tone = rowTone[state];
      if (tone) {
        const lanes = Math.max(2, Math.round(w / (state === 'seedlings' ? 0.6 : 0.5)));
        const length = (R - i * w) * 6.28 * (stretch[0] + stretch[1]) / 2;
        const per = Math.min(110, Math.round(length / (state === 'seedlings' ? 0.75 : 0.6)));
        for (let lane = 0; lane < lanes; lane++) for (let k = 0; k < per; k++) {
          if (state === 'stubble' && random() < 0.5) continue;
          const p = on(i, ((k + (lane % 2) * 0.5) / per) * 6.28, (lane + 0.75) / (lanes + 0.6) * 0.82 + 0.1);
          rows.push({ at: [p[0], p[1] + (state === 'seedlings' ? 0.08 : 0.12), p[2]], size: (state === 'seedlings' ? 0.16 : state === 'stubble' ? 0.12 : 0.3) * mix(0.8, 1.2, random()), color: new THREE.Color(tone).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.12) });
        }
      }
      if (state === 'stubble') for (let k = 0; k < 3 + Math.round((n - i) * mood.density); k++) stooks.push({ at: on(i, random() * 6.28, mix(0.3, 0.7, random())), size: mix(0.5, 0.75, random()) });
    }
    if (rows.length) s.scatter(new THREE.ConeGeometry(0.6, 1.6, 3, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }), rows);
    if (stooks.length) s.scatter(new THREE.ConeGeometry(0.55, 1.5, 7).translate(0, 0.75, 0), new THREE.MeshStandardMaterial({ color: '#d9c078', roughness: 1, flatShading: true }), stooks);

    // Summit.
    const [sx, sz] = edge(n, 0);
    const sy = top(n - 1);
    const cr = 1.9;
    if (a.crown === 'trees') {
      const leaf = new THREE.MeshStandardMaterial({ color: '#2f5d33', roughness: 0.9, flatShading: true });
      for (let k = 0; k < 5; k++) {
        const th = k * 1.26 + random(), d = cr * mix(0.1, 0.6, random()), ht = mix(3, 5.5, random());
        const x = sx + Math.sin(th) * d, z = sz + Math.cos(th) * d;
        s.cylinder(0.1, 0.16, ht, [x, sy + ht / 2, z], s.material('#4a3a2a'), 6);
        s.mesh(new THREE.IcosahedronGeometry(mix(1.2, 2, random()), 1), leaf, [x, sy + ht, z]).scale.y = 0.8;
      }
    } else if (a.crown === 'house') {
      const wood = s.material('#6e4d33'), dark = s.material('#2f3134');
      const hw = cr * 1.5, hd = cr * 0.9;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.08, 0.08, 1.4, [sx + x * hw * 0.45, sy + 0.7, sz + z * hd * 0.42], wood, 6);
      s.box([hw, 1.5, hd], [sx, sy + 2.1, sz], wood);
      s.box([hw * 1.08, 0.08, hd * 1.2], [sx, sy + 1.36, sz], s.material('#8b6a45'));
      const roof = s.mesh(new THREE.CylinderGeometry(hd * 0.85, hd * 0.85, hw * 1.25, 3), dark, [sx, sy + 3.15, sz]);
      roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 2 * 0; roof.scale.set(0.62, 1, 1);
      s.box([0.5, 0.9, 0.05], [sx - hw * 0.2, sy + 1.85, sz + hd / 2 + 0.01], dark);
      s.box([0.5, 0.45, 0.05], [sx + hw * 0.25, sy + 2.3, sz + hd / 2 + 0.01], new THREE.MeshStandardMaterial({ color: '#ffd88a', emissive: '#ffb648', emissiveIntensity: mix(0.2, 1.8, dusk) }));
    } else if (a.crown === 'rocks') {
      const grey = new THREE.MeshStandardMaterial({ color: '#9a9c96', roughness: 1, flatShading: true });
      for (let k = 0; k < 4; k++) s.mesh(new THREE.DodecahedronGeometry(cr * mix(0.4, 0.8, random()), 0), grey, [sx + (random() - 0.5) * cr, sy + cr * mix(0.2, 0.6, random()), sz + (random() - 0.5) * cr]).rotation.set(random() * 3, random() * 3, 0);
    }

    // What is going on.
    const birds: THREE.Object3D[] = [];
    const puffs: THREE.Mesh[] = [];
    const front = (spread: number) => (random() - 0.5) * spread;
    if (a.now === 'planting') {
      const level = Math.min(n - 1, 1 + Math.floor(random() * 2));
      const count = 3 + Math.round(mood.density * 4);
      const th0 = front(0.8);
      const cloths = ['#3b5a86', '#a8412f', '#3f3f46', '#c9c3ae'];
      for (let k = 0; k < count; k++) {
        const p = on(level, th0 + (k - count / 2) * (1.5 / (R - level * w)), 0.45);
        const g = new Sculpture(context);
        g.root.position.set(...p); g.root.rotation.y = th0 + Math.PI + (random() - 0.5) * 0.4; g.root.scale.setScalar(1.5);
        s.root.add(g.root);
        const cloth = g.material(cloths[Math.floor(random() * cloths.length)]);
        for (const x of [-0.09, 0.09]) g.rod([x, 0, 0], [x, 0.62, -0.06], 0.05, g.material('#33353a'));
        g.rod([0, 0.62, -0.06], [0, 0.82, 0.42], 0.14, cloth, 0.12);
        g.rod([0.1, 0.78, 0.36], [0.12, 0.2, 0.42], 0.035, cloth);
        g.mesh(new THREE.ConeGeometry(0.3, 0.16, 12), g.material('#dcc478'), [0, 0.92, 0.52]).rotation.x = 0.9;
      }
    } else if (a.now === 'flow') {
      const white = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#d8ecf2', emissiveIntensity: 0.7, roughness: 0.3 });
      for (let i = 1; i < n; i++) for (let k = 0; k < 2; k++) {
        const th = front(2.4) + i * 0.5;
        const [x, z] = edge(i, th), [x2, z2] = edge(i, th + 0.01);
        const out = new THREE.Vector3(z2 - z, 0, -(x2 - x)).normalize();
        const fall = s.box([0.5, h * 1.05, 0.14], [x + out.x * 0.1, top(i) - h * 0.5, z + out.z * 0.1], white);
        fall.rotation.y = Math.atan2(out.x, out.z);
        const foam = s.ball([0.5, 0.05, 0.35], [x + out.x * 0.4, top(i - 1) + 0.03, z + out.z * 0.4], white, 8);
        foam.rotation.y = fall.rotation.y;
      }
    } else if (a.now === 'egrets') {
      const white = new THREE.MeshStandardMaterial({ color: '#fdfdf8', roughness: 0.7 });
      for (let k = 0; k < 5 + Math.round(mood.density * 6); k++) {
        const g = new Sculpture(context);
        g.root.position.set(...on(Math.floor(random() * Math.min(n, 4)), front(3), mix(0.3, 0.7, random())));
        g.root.rotation.y = random() * 6.28; g.root.scale.setScalar(2.2);
        s.root.add(g.root); birds.push(g.root);
        for (const x of [-0.03, 0.03]) g.rod([x, 0, 0], [x, 0.22, 0], 0.008, g.material('#26272a'));
        g.ball([0.07, 0.08, 0.15], [0, 0.29, -0.03], white, 8).rotation.x = -0.4;
        g.tube([[0, 0.32, 0.06], [0, 0.44, 0.12], [0, 0.52, 0.05], [0, 0.6, 0.09]], 0.022, white);
        g.rod([0, 0.6, 0.1], [0, 0.58, 0.24], 0.012, g.material('#e2a41e'), 0.003);
      }
    } else if (a.now === 'smoke') {
      const level = Math.min(n - 1, 2);
      const p = on(level, front(1.5), 0.5);
      s.mesh(new THREE.ConeGeometry(0.9, 0.7, 8), s.material('#4a4036'), [p[0], p[1] + 0.3, p[2]]);
      s.ball([0.35, 0.2, 0.35], [p[0], p[1] + 0.62, p[2]], new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: mix(0.8, 2.5, dusk) }), 8);
      for (let k = 0; k < 11; k++) puffs.push(s.ball([0.5 + k * 0.22, 0.6 + k * 0.08, 0.5 + k * 0.22], [p[0] + k * 0.45 + Math.sin(k) * 0.3, p[1] + 1.2 + k * 1.25, p[2] + Math.cos(k * 1.3) * 0.3], new THREE.MeshStandardMaterial({ color: '#ecebe6', transparent: true, opacity: clamp01(0.6 - k * 0.04), depthWrite: false }), 8));
    }

    const home = puffs.map((p) => p.position.x);
    const speed = mix(0.1, 1.2, mood.energy);
    return s.finish({
      footprint: R * 0.95,
      update: (_dt, time) => {
        puffs.forEach((p, i) => { p.position.x = home[i] + Math.sin(time * speed + i * 0.6) * 0.25 * i * 0.3; });
        birds.forEach((b, i) => { b.rotation.x = Math.max(0, Math.sin(time * speed * 0.8 + i * 1.9) - 0.75) * 1.6; });
      },
    });
  },
});
