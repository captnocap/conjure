import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';
import { Batch, blend, field, paint, smooth, waves, type P3 } from './tundra';

const W = 18, D = 12, WATER = -0.16;
const SLOTS: readonly (readonly [number, number, number])[] = [[0, 1.5, 1], [-4.9, -0.5, 0.9], [5.0, 0.3, 0.9], [-2.3, -3.8, 0.72], [3.7, -3.9, 0.72], [-6.6, 3.4, 0.78]];

export default defineWorld({
  questions: {
    season: choice('What point of the year is it?', {
      autumn: 'Early autumn: rust, ochre and wine-red sedge.',
      firstsnow: 'The first snow has dusted the high ground; the hollows are still brown.',
      summer: 'The brief summer: green-gold moss and white cotton grass.',
      freezeup: 'Freeze-up: everything grey-brown and the ponds skinned with pale ice.',
    }),
    ground: choice('What pattern does the ground make?', {
      cracked: 'Raised polygons separated by dark wet cracks, like dried mud seen from the air.',
      rimmed: 'Polygons with raised rims and sunken wet centres, a honeycomb of little pools.',
      hummocks: 'No pattern, only lumpy hummocks and bare grey mud boils.',
      slump: 'Cracked polygons, and one raw thaw slump where a slice of land has slid open.',
    }),
    water: score('How much standing water is there?', ['A couple of small pools', 'Scattered thaw ponds', 'A drowned lacework of ponds']),
    relief: score('How flat is the plain?', ['Flat as a table', 'Gently rolling', 'Long slow swells']),
    sky: choice('What is the light like?', {
      lowsun: 'A low orange sun resting on the horizon, long shadows.',
      overcast: 'Flat white overcast, shadowless.',
      twilight: 'The sun just gone: a band of pink and violet along the horizon.',
      fog: 'Ground fog lying in the hollows, the sun a pale disc.',
    }),
    horizon: choice('What is on the horizon?', {
      flat: 'Nothing: a ruled pale line.',
      hills: 'Low rolling hills, far off and blue.',
      flare: 'A distant gas flare and a row of pylons.',
      mountains: 'A faint wall of snowy mountains.',
    }),
    trace: choice('What trace of passage crosses the plain?', {
      none: 'None at all.',
      sledge: 'The paired runner lines of sledges, curving out of sight.',
      ruts: 'Deep vehicle ruts that have filled with water and will not heal.',
      poles: 'A line of old telegraph poles leaning every which way.',
      bones: 'Scattered shed antlers and a bleached skull.',
    }),
    geese: noul('Is a skein of geese crossing the sky?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const roll = waves(random, 4), detail = waves(random, 5), blotch = waves(random, 4), fine = waves(random, 6);
    const relief = mix(0.15, 1.1, a.relief);
    const thaw = mix(0.3, 1, mood.wear);
    const base = (x: number, z: number) => (roll(x * 0.24, z * 0.24) - 0.5) * relief * 1.2 + 0.1 + relief * 0.34 + smooth(-1, -6, z) * 0.4 * relief + (detail(x * 0.8, z * 0.8) - 0.5) * 0.1;
    const seats = SLOTS.map(([x, z, size]) => ({ x, z, size, level: Math.max(0.05, base(x, z)) }));

    // Thaw ponds: basins dug below the water table, kept clear of where the cast stands.
    const ponds: { x: number; z: number; rx: number; rz: number; turn: number }[] = [];
    const wanted = Math.round(mix(2, 9, a.water) + mood.wear * 2);
    for (let tries = 0; ponds.length < wanted && tries < 300; tries++) {
      const x = (random() - 0.5) * (W - 2), z = (random() - 0.5) * (D - 1.5), r = mix(0.7, 2.0, random()) * mix(0.85, 1.35, a.water);
      if (seats.some((seat) => Math.hypot(seat.x - x, seat.z - z) < r + 1.5 * seat.size + 0.3)) continue;
      ponds.push({ x, z, rx: r * mix(0.9, 1.6, random()), rz: r * mix(0.6, 1, random()), turn: random() * Math.PI });
    }
    // Voronoi sites on a jittered grid give the frost polygons.
    const CELL = 1.9, sites = new Map<string, readonly [number, number, number]>();
    const site = (i: number, j: number) => {
      const key = `${i},${j}`;
      let found = sites.get(key);
      if (!found) { found = [(i + 0.15 + random() * 0.7) * CELL, (j + 0.15 + random() * 0.7) * CELL, random()]; sites.set(key, found); }
      return found;
    };
    for (let i = -8; i <= 8; i++) for (let j = -6; j <= 6; j++) site(i, j);
    const slump = { x: 6.3, z: -1.7, rx: 2.2, rz: 1.5 };
    const trail = (x: number) => 4.0 + Math.sin(x * 0.27 + 1) * 0.8 - x * 0.12;
    const rutLine = (x: number) => -1.9 + Math.sin(x * 0.2 + 2) * 0.9 + x * 0.1;

    const tones = {
      autumn: ['#a9562a', '#c99a3c', '#7d3528', '#7c7a3a'],
      firstsnow: ['#9a5a30', '#b98e48', '#70382a', '#77724a'],
      summer: ['#7f8c3c', '#a9a548', '#5e7038', '#b9a955'],
      freezeup: ['#8d8272', '#a69a84', '#6b6258', '#948a6a'],
    }[a.season].map((hex) => { const c = new THREE.Color(hex); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl); return c.setHSL(hsl.h, hsl.s * mix(0.6, 1.1, mood.cheer), hsl.l); });
    const mud = new THREE.Color('#3b3028'), clay = new THREE.Color('#8f8a80'), snow = new THREE.Color('#f3f4f2'), ice = new THREE.Color('#a9c6d0');
    const haze = new THREE.Color({ lowsun: '#e9cfae', overcast: '#d9dbd6', twilight: '#cdb7c4', fog: '#e3e4e0' }[a.sky]);

    const sample = (x: number, z: number) => {
      let y = base(x, z);
      const c = tones[0].clone().lerp(tones[1], smooth(0.3, 0.7, blotch(x * 0.5, z * 0.5))).lerp(tones[2], smooth(0.6, 0.9, fine(x * 0.6, z * 0.6)) * 0.8).lerp(tones[3], smooth(0.62, 0.92, blotch(x * 0.9 + 20, z * 0.9)) * 0.7);
      let dark = 0;
      if (a.ground === 'hummocks') {
        y += (fine(x * 1.6, z * 1.6) - 0.5) * 0.3;
        const boil = smooth(0.74, 0.82, detail(x * 1.3 + 9, z * 1.3));
        c.lerp(clay, boil * 0.9);
        y += boil * 0.05;
      } else {
        const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
        let d1 = 1e9, d2 = 1e9, tag = 0, sx = 0, sz = 0;
        for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
          const p = site(i, j), d = Math.hypot(x - p[0], z - p[1]);
          if (d < d1) { d2 = d1; d1 = d; tag = p[2]; sx = p[0]; sz = p[1]; } else if (d < d2) d2 = d;
        }
        const edge = d2 - d1, trough = smooth(0.16 + thaw * 0.16, 0, edge);
        c.offsetHSL((tag - 0.5) * 0.035, 0, (tag - 0.5) * 0.09);
        if (a.ground === 'rimmed') {
          const rim = smooth(0.75, 0.3, edge) * (1 - trough * 0.5);
          y += rim * 0.11 - trough * 0.06;
          const pooled = tag < 0.2 + a.water * 0.45 && base(sx, sz) < 0.2;
          if (pooled) y = mix(y, Math.min(y, WATER - 0.04), smooth(0.45, 0.85, edge));
          else c.lerp(tones[3], smooth(0.4, 0.9, edge) * 0.5);
          dark = trough * 0.6;
        } else {
          y += smooth(0, 0.9, edge) * 0.07 - trough * 0.17;
          dark = trough * 0.9;
        }
      }
      for (const p of ponds) {
        const dx = x - p.x, dz = z - p.z, cos = Math.cos(p.turn), sin = Math.sin(p.turn);
        const d = Math.hypot((dx * cos + dz * sin) / p.rx, (-dx * sin + dz * cos) / p.rz) + (detail(x * 1.4, z * 1.4) - 0.5) * 0.35;
        y = mix(y, Math.min(y, WATER - 0.12), smooth(1.15, 0.75, d));
      }
      if (a.ground === 'slump') {
        const d = Math.hypot((x - slump.x) / slump.rx, (z - slump.z) / slump.rz) + (detail(x * 1.2 + 5, z * 1.2) - 0.5) * 0.3;
        const inside = smooth(1, 0.86, d);
        if (inside > 0) {
          const floor = base(x, z) - 0.42 + (fine(x * 2, z * 2) - 0.5) * 0.16 + smooth(-0.5, 1.5, z - slump.z) * 0.2;
          y = mix(y, floor, inside);
          const wall = inside * (1 - smooth(0.2, 0.7, inside)) * 4 * smooth(0.3, -0.6, z - slump.z);
          c.lerp(mud, inside * 0.92).lerp(ice, Math.min(1, wall) * 0.9);
        }
      }
      if (a.trace === 'sledge') {
        const off = Math.abs(Math.abs(z - trail(x)) - 0.24);
        const rut = smooth(0.09, 0.03, off);
        y -= rut * 0.035;
        dark = Math.max(dark, rut * 0.75);
      } else if (a.trace === 'ruts') {
        const rut = smooth(0.26, 0.1, Math.abs(Math.abs(z - rutLine(x)) - 0.55));
        y = mix(y, Math.min(y, WATER - 0.05 + (fine(x * 0.7, 3) - 0.45) * 0.14), rut);
        dark = Math.max(dark, rut * 0.8);
      }
      for (const seat of seats) {
        const w = smooth(2.3 * seat.size, 1.2 * seat.size, Math.hypot(x - seat.x, z - seat.z));
        if (w > 0) y = mix(y, seat.level + (y - base(x, z)) * 0.35, w);
      }
      c.lerp(mud, Math.max(dark, smooth(WATER + 0.2, WATER + 0.02, y) * 0.8));
      if (a.season === 'firstsnow') c.lerp(snow, smooth(0.52, 0.68, fine(x * 0.9 + 3, z * 0.9) * 0.6 + (y - WATER) * 0.4) * (1 - dark) * 0.92);
      if (a.season === 'freezeup') c.lerp(snow, smooth(0.6, 0.8, fine(x * 2, z * 2)) * 0.35);
      c.lerp(haze, smooth(-1.5, -6, z) * 0.4);
      return { y, c };
    };
    const heightAt = (x: number, z: number) => sample(x, z).y;

    const background = { lowsun: '#ece4d3', overcast: '#e4e5e0', twilight: '#e3dce0', fog: '#e9e9e4' }[a.sky];
    const { art: s, world } = diorama(context, {
      background, floor: null, width: W, depth: D, maxHeight: 3.5, radius: 2.1, pitch: 23, yaw: 21,
      slots: seats.map((seat) => [seat.x, seat.z, seat.level, seat.size] as const),
    });

    const terrain = s.mesh(field(-W / 2, W / 2, -D / 2, D / 2, 186, 124, sample), paint(0, { roughness: 0.95 }));
    terrain.castShadow = false;
    world.ground = terrain;

    // The cut edges of the block: dark active layer over pale frozen ground with ice wedges.
    {
      const pos: number[] = [], col: number[] = [], idx: number[] = [];
      const soil = new THREE.Color('#4a3a2c'), frozen = new THREE.Color('#8ea6ae'), wedge = new THREE.Color('#d3e3e6');
      const strip = (from: readonly [number, number], to: readonly [number, number], steps: number) => {
        const start = pos.length / 3;
        for (let i = 0; i <= steps; i++) {
          const x = mix(from[0], to[0], i / steps), z = mix(from[1], to[1], i / steps), top = sample(x, z);
          const vein = Math.sin((x + z) * 2.1 + Math.sin((x - z) * 0.7) * 2) > 0.82;
          for (const [y, c] of [[top.y, top.c.clone().lerp(soil, 0.5)], [Math.min(top.y - 0.12, WATER - 0.1) - 0.18 * (1 - thaw * 0.5), soil], [-0.75, vein ? wedge : frozen.clone().lerp(soil, 0.25)], [-1.3, vein ? wedge : frozen]] as const) {
            pos.push(x, y, z);
            col.push(...c.toArray());
          }
        }
        for (let i = 0; i < steps; i++) for (let k = 0; k < 3; k++) { const q = start + i * 4 + k; idx.push(q, q + 1, q + 4, q + 1, q + 5, q + 4); }
      };
      const hw = W / 2, hd = D / 2;
      strip([-hw, hd], [hw, hd], 186); strip([hw, hd], [hw, -hd], 124); strip([hw, -hd], [-hw, -hd], 60); strip([-hw, -hd], [-hw, hd], 124);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      s.mesh(g, paint(0, { roughness: 0.9, side: THREE.DoubleSide })).castShadow = false;
    }

    const frozenOver = a.season === 'freezeup';
    const water = s.mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), new THREE.MeshStandardMaterial({
      color: frozenOver ? '#c3d3d8' : blend('#1c2830', haze, 0.12), roughness: frozenOver ? 0.45 : 0.14, metalness: frozenOver ? 0.1 : 0.2,
    }), [0, WATER, 0]);
    water.rotation.x = -Math.PI / 2;
    water.castShadow = false;

    // Sedge tufts and cotton grass.
    const clearOfCast = (x: number, z: number) => seats.every((seat) => Math.hypot(seat.x - x, seat.z - z) > 0.9 * seat.size);
    const tuft = new THREE.ConeGeometry(0.06, 0.3, 4);
    tuft.translate(0, 0.13, 0);
    const blades: { at: P3; size: number; color: THREE.Color }[] = [], cotton: { at: P3; size: number }[] = [];
    const tuftCount = Math.round(mix(350, 950, mood.density));
    for (let i = 0; i < tuftCount; i++) {
      const x = (random() - 0.5) * (W - 0.4), z = (random() - 0.5) * (D - 0.4), y = heightAt(x, z);
      if (y < WATER + 0.04 || !clearOfCast(x, z)) continue;
      const near = smooth(-6, 5, z);
      blades.push({ at: [x, y - 0.02, z], size: mix(0.5, 1.5, random()) * mix(0.7, 1, near), color: tones[Math.floor(random() * 4)].clone().offsetHSL(0, 0, 0.06 + random() * 0.1).lerp(haze, (1 - near) * 0.35) });
      if ((a.season === 'summer' || a.season === 'autumn') && y < WATER + 0.3 && cotton.length < 160) cotton.push({ at: [x + 0.05, y + 0.26, z], size: 1 });
    }
    s.scatter(tuft, new THREE.MeshStandardMaterial({ roughness: 1 }), blades).castShadow = false;
    if (cotton.length) s.scatter(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshStandardMaterial({ color: '#f6f5ee', roughness: 1 }), cotton);

    // Traces of passage.
    const props = new Batch();
    if (a.trace === 'poles') {
      const lean = mix(0.12, 0.5, mood.wear);
      let last: P3 | null = null;
      for (let i = 0; i < 7; i++) {
        const x = -7.9 + i * 2.6 + (random() - 0.5) * 0.4, z = -5.1 + i * 0.1 + (random() - 0.5) * 0.3, y = heightAt(x, z), tall = 2.0 + random() * 0.3;
        const tilt = (random() - 0.5) * 2 * lean, tiltZ = (random() - 0.5) * lean;
        const top: P3 = [x + Math.sin(tilt) * tall, y + Math.cos(tilt) * Math.cos(tiltZ) * tall, z + Math.sin(tiltZ) * tall];
        props.rod([x, y - 0.2, z], top, 0.06, 0.045, '#6b5d4d', 5);
        props.rod([top[0] - 0.32 * Math.cos(tilt), top[1] - 0.2 + 0.32 * Math.sin(tilt), top[2]], [top[0] + 0.32 * Math.cos(tilt), top[1] - 0.2 - 0.32 * Math.sin(tilt), top[2]], 0.035, 0.035, '#5a4e41', 4);
        if (last && random() > mood.wear * 0.5) props.tube([last, [(last[0] + top[0]) / 2, Math.min(last[1], top[1]) - 0.45, (last[2] + top[2]) / 2], top], () => 0.012, '#3a3632', 4, 10);
        last = [top[0], top[1] - 0.18, top[2]];
      }
    } else if (a.trace === 'bones') {
      const bone = '#e6dfcc';
      for (let i = 0; i < 6; i++) {
        const bx = i < 3 ? 5.6 + (random() - 0.5) * 2.4 : (random() - 0.5) * 14, bz = i < 3 ? 4.2 + (random() - 0.5) * 1.6 : 2.6 + random() * 2.8;
        if (!clearOfCast(bx, bz)) continue;
        const by = Math.max(heightAt(bx, bz), WATER), turn = random() * 6.283, up = 0.2 + random() * 0.3;
        const pts: P3[] = [[bx, by + 0.03, bz], [bx + Math.cos(turn) * 0.35, by + up, bz + Math.sin(turn) * 0.35], [bx + Math.cos(turn + 0.6) * 0.75, by + up + 0.2, bz + Math.sin(turn + 0.6) * 0.75], [bx + Math.cos(turn + 1.3) * 0.85, by + up + 0.45, bz + Math.sin(turn + 1.3) * 0.85]];
        props.tube(pts, (t) => 0.035 * (1 - t * 0.6), bone, 5, 10);
        for (const p of [pts[1], pts[2], pts[3]]) props.rod(p, [p[0] + (random() - 0.5) * 0.35, p[1] + 0.26, p[2] + (random() - 0.5) * 0.35], 0.022, 0.006, bone, 4);
      }
      const kx = 5.2, kz = 4.9, ky = Math.max(heightAt(kx, kz), WATER);
      props.ball([0.16, 0.12, 0.26], [kx, ky + 0.1, kz], bone, [0, 0.6, 0], 8);
      props.ball([0.08, 0.07, 0.16], [kx + 0.15, ky + 0.07, kz + 0.24], bone, [0, 0.6, 0], 6);
      for (const side of [-1, 1]) props.ball([0.035, 0.04, 0.045], [kx + side * 0.1 + 0.05, ky + 0.14, kz + 0.1 - side * 0.06], '#3a3229', undefined, 5);
    }

    // The horizon: everything here is a pale silhouette just beyond the back edge.
    const far = blend(haze, '#6f7f92', a.horizon === 'mountains' ? 0.3 : 0.45), farther = blend(haze, '#8fa0b2', 0.3);
    const ridge = (heightOf: (x: number) => number, z: number, color: THREE.Color) => {
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2, -1.3);
      for (let i = 0; i <= 90; i++) { const x = -W / 2 + i * W / 90; shape.lineTo(x, Math.max(0.05, heightOf(x))); }
      shape.lineTo(W / 2, -1.3);
      const mesh = s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color }), [0, 0, z]);
      mesh.castShadow = mesh.receiveShadow = false;
    };
    const rise = 0.45 * relief;
    if (a.horizon === 'flat' || a.horizon === 'flare') ridge((x) => rise + 0.28 + roll(x * 0.1, 9) * 0.12, -D / 2 - 0.02, far);
    if (a.horizon === 'hills') {
      ridge((x) => rise + 0.5 + roll(x * 0.35, 4) * 1.5 + detail(x * 0.6, 2) * 0.3, -D / 2 - 0.3, farther);
      ridge((x) => rise + 0.25 + roll(x * 0.3 + 4, 7) * 0.9, -D / 2 - 0.02, far);
    }
    if (a.horizon === 'mountains') {
      ridge((x) => rise + 1.2 + roll(x * 0.4, 4) * 1.6 + Math.abs(Math.sin(x * 1.3 + roll(x, 1) * 4)) * 0.9, -D / 2 - 0.3, blend('#f4f5f5', haze, 0.25));
      ridge((x) => rise + 0.3 + roll(x * 0.3 + 4, 7) * 0.7, -D / 2 - 0.02, far);
    }
    if (a.horizon === 'flare') {
      const fx = 4.5 + random() * 3, fy = rise + 0.3;
      props.rod([fx, fy, -D / 2 + 0.15], [fx, fy + 1.5, -D / 2 + 0.15], 0.035, 0.03, '#4c4f58', 4);
      for (let i = 0; i < 5; i++) {
        const px = fx - 2.0 - i * 1.9, h = 1.1 - i * 0.1;
        props.rod([px - 0.14, fy, -D / 2 + 0.15], [px, fy + h, -D / 2 + 0.15], 0.02, 0.012, '#6a707c', 3);
        props.rod([px + 0.14, fy, -D / 2 + 0.15], [px, fy + h, -D / 2 + 0.15], 0.02, 0.012, '#6a707c', 3);
        props.rod([px - 0.22, fy + h * 0.8, -D / 2 + 0.15], [px + 0.22, fy + h * 0.8, -D / 2 + 0.15], 0.012, 0.012, '#6a707c', 3);
      }
      const flame = s.mesh(new THREE.ConeGeometry(0.16, 0.6, 7), new THREE.MeshBasicMaterial({ color: '#ff8a2a' }), [fx + 0.08, fy + 1.78, -D / 2 + 0.15]);
      flame.rotation.z = -0.35;
      flame.castShadow = false;
      const smoke = s.mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: '#6f6a70', transparent: true, opacity: 0.3, depthWrite: false }), [fx + 1.5, fy + 2.3, -D / 2 + 0.1]);
      smoke.scale.set(1.6, 0.22, 0.1);
      smoke.rotation.z = 0.12;
    }
    if (!props.empty) { const mesh = props.mesh(paint(mood.wear)); s.root.add(mesh); }

    // Sun, afterglow and fog.
    const sunX = mix(-5.5, 5.5, mood.daylight);
    if (a.sky === 'lowsun' || a.sky === 'fog') {
      const sun = s.mesh(new THREE.CircleGeometry(a.sky === 'fog' ? 0.8 : 1.3, 36), new THREE.MeshBasicMaterial({ color: a.sky === 'fog' ? '#fff6e4' : blend('#ffb060', '#f9692c', mood.warmth), toneMapped: a.sky === 'fog' }), [sunX, a.sky === 'fog' ? rise + 2.6 : rise + 1.0, -D / 2 - 0.6]);
      sun.castShadow = false;
    }
    {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const glowTint = { lowsun: ['255,176,110', '255,222,170'], overcast: ['205,210,208', '225,227,222'], twilight: ['226,128,150', '170,150,205'], fog: ['236,236,230', '240,240,236'] }[a.sky];
      const up = ctx.createLinearGradient(0, 256, 0, 0);
      up.addColorStop(0, `rgba(${glowTint[0]},0.95)`);
      up.addColorStop(0.3, `rgba(${glowTint[1]},0.6)`);
      up.addColorStop(1, `rgba(${glowTint[1]},0)`);
      ctx.fillStyle = up;
      ctx.fillRect(0, 0, 256, 256);
      ctx.globalCompositeOperation = 'destination-in';
      const across = ctx.createLinearGradient(0, 0, 256, 0);
      across.addColorStop(0, 'rgba(0,0,0,0)'); across.addColorStop(0.3, 'rgba(0,0,0,1)'); across.addColorStop(0.7, 'rgba(0,0,0,1)'); across.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = across;
      ctx.fillRect(0, 0, 256, 256);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const glow = s.mesh(new THREE.PlaneGeometry(W - 0.6, 8), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), [0, rise + 4.0, -D / 2 - 0.5]);
      glow.castShadow = glow.receiveShadow = false;
    }
    if (a.sky === 'fog') {
      const fogMaterial = new THREE.MeshBasicMaterial({ color: '#f1f1ec', transparent: true, opacity: 0.34, depthWrite: false });
      for (let i = 0; i < 9; i++) {
        const bank = s.mesh(new THREE.SphereGeometry(1, 12, 8), fogMaterial, [(random() - 0.5) * W, 0.3 + random() * 0.3, -5 + random() * 6]);
        bank.scale.set(3 + random() * 4, 0.22 + random() * 0.2, 1 + random() * 1.4);
        bank.castShadow = bank.receiveShadow = false;
      }
    }

    // Geese: a ragged V drifting along the horizon.
    let skein: THREE.Group | null = null;
    if (a.geese) {
      const birds = new Batch(), count = 9 + Math.floor(random() * 6);
      for (let i = 0; i < count; i++) {
        const arm = i % 2 ? 1 : -1, k = Math.ceil(i / 2);
        const bx = -k * 0.42 + (random() - 0.5) * 0.1, by = arm * k * 0.2 + (random() - 0.5) * 0.08, flap = (random() - 0.5) * 0.8;
        birds.box([0.2, 0.035, 0.05], [bx, by, 0], '#3b3a3c');
        for (const side of [-1, 1]) birds.box([0.06, 0.02, 0.26], [bx - 0.02, by + Math.abs(flap) * 0.06, side * 0.13], '#4a484a', [side * flap, 0, 0]);
      }
      skein = new THREE.Group();
      const mesh = birds.mesh(new THREE.MeshBasicMaterial({ vertexColors: true }));
      mesh.castShadow = false;
      skein.add(mesh);
      skein.position.set(-3 + random() * 6, rise + 3.4 + random() * 0.6, -D / 2 + 0.3);
      skein.rotation.z = (random() - 0.5) * 0.3;
      s.root.add(skein);
    }

    // A sun that never climbs: pull the key light down toward the horizon.
    const key = world.keyLight!;
    key.intensity = { lowsun: 3.0, overcast: 1.3, twilight: 1.7, fog: 1.6 }[a.sky];
    key.color.lerp(new THREE.Color({ lowsun: '#ffcf9a', overcast: '#ffffff', twilight: '#f0b8c0', fog: '#fff2dc' }[a.sky]), 0.6);
    for (const child of s.root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = { lowsun: 1.25, overcast: 2.0, twilight: 1.5, fog: 1.9 }[a.sky];
    const placeCast = world.place.bind(world);
    world.place = (items) => {
      placeCast(items);
      const offset = key.position.clone().sub(key.target.position);
      offset.y *= a.sky === 'overcast' ? 0.8 : 0.4;
      key.position.copy(key.target.position).add(offset);
    };
    const drift = mix(0.02, 0.2, mood.energy), home = skein ? skein.position.x : 0;
    if (skein) world.update = (_dt, time) => { skein.position.x = home + ((time * drift) % 6); };
    return world;
  },
});
