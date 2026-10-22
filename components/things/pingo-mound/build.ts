import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, blend, paint, smooth, waves, type P3 } from './tundra';

export default defineThing({
  questions: {
    summit: choice('What has happened to the summit?', {
      intact: 'Nothing yet: a smooth taut dome, still growing.',
      cracked: 'It has split into a star of deep cracks radiating from the top.',
      crater: 'The top has sagged in, leaving a crater with a small pond.',
      blowout: 'It has burst: a sheer-walled dark shaft ringed by thrown-out blocks of earth.',
      slumped: 'One whole flank has slid away, baring the ice core like a cut cake.',
    }),
    profile: score('How steep is it?', ['A low swelling you could miss', 'A rounded hill', 'A steep cone like a small volcano']),
    cover: choice('What covers its skin?', {
      sedge: 'Rust and ochre autumn sedge.',
      moss: 'Green-gold summer moss and dwarf willow.',
      snow: 'Sedge under a dusting of new snow.',
      clay: 'Bare grey clay, freshly heaved and unvegetated.',
    }),
    ice: noul('Is clean blue-white ice visible where the ground has opened?'),
    base: choice('What lies around its foot?', {
      bare: 'Nothing, it rises straight from flat ground.',
      moat: 'A dark moat of meltwater curving round it.',
      hummocks: 'A scatter of small satellite mounds, like young ones.',
      polygons: 'An apron of ground cracked into big polygons.',
    }),
    marker: choice('What stands on it?', {
      none: 'Nothing at all.',
      tripod: 'A weathered wooden survey pyramid from an old mapping expedition.',
      cairn: 'A small cairn of stones and antlers.',
      figure: 'One tiny person in a dark coat, for scale.',
    }),
    gullies: noul('Has meltwater cut gullies down its sides?'),
    size: score('How big is it?', ['A house-high hummock', 'A hill a few minutes\' climb', 'A landmark seen from a day away']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = waves(random, 5), blotch = waves(random, 4), rough = waves(random, 6);
    const R = mix(11, 42, a.size), hgt = R * mix(0.3, 0.72, a.profile), power = mix(1.7, 1.05, a.profile);
    const decay = mix(0.4, 1, mood.wear);
    const palette = {
      sedge: ['#a8602a', '#cb9a3e', '#7d4a26'], moss: ['#77853a', '#b0a54c', '#566232'], snow: ['#b07a44', '#f2f3f1', '#8d6a48'], clay: ['#8f8b80', '#aaa392', '#6f6a60'],
    }[a.cover].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#857a6a'), mood.wear * 0.2));
    const soil = new THREE.Color('#3b3028'), wet = new THREE.Color('#2a2420');
    const iceA = new THREE.Color(a.ice ? '#a9cbd6' : '#4a3d33'), iceB = new THREE.Color(a.ice ? '#eef6f6' : '#5d4f42');
    const crackCount = 3 + Math.floor(random() * 3), gullyCount = 7 + Math.floor(random() * 4);
    const cracks = Array.from({ length: crackCount }, (_u, i) => ({ angle: (i / crackCount) * Math.PI * 2 + random() * 0.6, reach: mix(0.45, 0.8, random()), wig: random() * 6 }));
    const gullies = Array.from({ length: gullyCount }, (_u, i) => ({ angle: (i / gullyCount) * Math.PI * 2 + random() * 0.5, wig: random() * 6 }));
    const slide = 0.6 + random() * 0.7;
    const qc = a.summit === 'crater' ? mix(0.36, 0.48, random()) : mix(0.24, 0.32, random());
    const apron = a.base === 'polygons' ? 1.42 : 1;
    const cells = Array.from({ length: 46 }, () => { const t = random() * 6.283, d = R * (0.9 + random() * 0.6); return [Math.cos(t) * d, Math.sin(t) * d] as const; });
    const wrap = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));

    const sample = (x: number, z: number) => {
      const r = Math.hypot(x, z), theta = Math.atan2(z, x);
      const Rr = R * (1 + (noise(Math.cos(theta) * 1.6 + 4, Math.sin(theta) * 1.6) - 0.5) * 0.22);
      const q = r / Rr;
      const tex = blotch(x * 5 / R, z * 5 / R);
      const c = palette[0].clone().lerp(palette[1], smooth(0.3, 0.75, tex));
      if (a.cover === 'snow') c.copy(palette[0]).lerp(palette[1], smooth(0.35, 0.6, rough(x * 4 / R, z * 4 / R) + (q < 1 ? 0.12 : 0)));
      c.lerp(palette[2], smooth(0.55, 0.9, rough(x * 6 / R + 5, z * 6 / R)) * 0.6);
      let y: number;
      if (q >= 1) {
        y = apron > 1 ? R * 0.012 * smooth(apron * 1.02, apron * 0.9, q) : 0;
        if (apron > 1) {
          let d1 = 1e9, d2 = 1e9;
          for (const [cx, cz] of cells) { const d = Math.hypot(x - cx, z - cz); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
          const trough = smooth(R * 0.045, 0, d2 - d1);
          y -= trough * R * 0.012;
          c.lerp(wet, trough * 0.85);
        }
        return { y: Math.max(y, 0), c, dome: 0 };
      }
      const dome = hgt * (1 - q * q) ** power;
      y = dome + (noise(x * 5 / R, z * 5 / R) - 0.5) * hgt * 0.1 * smooth(1, 0.7, q) + (rough(x * 7 / R, z * 7 / R) - 0.5) * hgt * 0.05;
      if (a.gullies) for (const g of gullies) {
        const d = Math.abs(wrap(theta - g.angle - Math.sin(q * 7 + g.wig) * 0.12)) * r;
        const cut = Math.exp(-((d / (R * 0.03)) ** 2)) * smooth(0.25, 0.5, q);
        y -= cut * hgt * 0.07;
        c.lerp(soil, cut * 0.8);
      }
      if (a.summit === 'cracked') {
        let deep = 0;
        for (const k of cracks) {
          if (q > k.reach) continue;
          const d = Math.abs(wrap(theta - k.angle - Math.sin(q * 9 + k.wig) * 0.22)) * r;
          const width = R * (0.035 + 0.05 * (1 - q / k.reach)) * decay;
          deep = Math.max(deep, Math.exp(-((d / width) ** 2)) * Math.sqrt(1 - q / k.reach));
        }
        deep = Math.max(deep, smooth(0.09, 0.02, q));
        y -= deep * hgt * 0.3;
        if (deep > 0.2) c.copy(soil).lerp(iceA, smooth(0.3, 0.6, deep)).lerp(iceB, smooth(0.7, 1, deep) * rough(x, z));
      } else if (a.summit === 'crater') {
        const rim = qc * (1 + (noise(Math.cos(theta) * 2, Math.sin(theta) * 2 + 7) - 0.5) * 0.3);
        if (q < rim) {
          const floor = hgt * (1 - qc * qc) ** power - hgt * mix(0.22, 0.4, decay);
          const t = smooth(0.5, 1, q / rim);
          y = mix(floor, y, t * t);
          c.copy(soil).lerp(iceA, smooth(0.15, 0.6, t) * (1 - smooth(0.85, 1, t))).lerp(iceB, a.ice ? rough(x, z) * 0.4 * (1 - t) : 0);
        }
      } else if (a.summit === 'blowout') {
        const rim = qc * (1 + (noise(Math.cos(theta) * 3, Math.sin(theta) * 3 + 7) - 0.5) * 0.2);
        y += hgt * 0.16 * Math.exp(-(((q - rim * 1.25) / 0.09) ** 2)) * (0.6 + rough(x * 30 / R, z * 30 / R));
        if (q < rim * 1.05) {
          const t = smooth(0.82, 1.05, q / rim);
          y = mix(hgt * 0.12, y, t);
          c.copy(wet).lerp(iceA, t > 0.02 && t < 0.98 ? 0.9 : 0).lerp(iceB, t > 0.02 && t < 0.98 ? (Math.sin(y * 40 / hgt) > 0 ? 0.6 : 0) : 0);
        } else if (q < rim * 1.6) c.lerp(soil, smooth(rim * 1.6, rim * 1.1, q) * 0.85);
      } else if (a.summit === 'slumped') {
        const along = x * Math.cos(slide) + z * Math.sin(slide);
        const t = smooth(0.08 * R, 0.17 * R, along + (noise(x * 4 / R + 3, z * 4 / R) - 0.5) * R * 0.14);
        if (t > 0) {
          const debris = dome * 0.2 + hgt * 0.1 * rough(x * 12 / R, z * 12 / R) * smooth(1, 0.6, q);
          y = mix(y, debris, t);
          if (t < 0.97) c.copy(iceA).lerp(iceB, Math.sin(y * 30 / hgt + noise(x, z) * 4) > 0.1 ? 0.75 : 0.1);
          else c.copy(soil).lerp(palette[2], rough(x * 9 / R, z * 9 / R) * 0.6);
        }
      }
      return { y, c, dome };
    };
    // A polar grid: the outline, crater rim and cracks all follow the mesh instead of stair-stepping.
    const rings = 60, sectors = 132;
    const pos: number[] = [0, sample(0, 0).y, 0], col: number[] = sample(0, 0).c.toArray(), idx: number[] = [];
    for (let j = 0; j < sectors; j++) {
      const theta = (j / sectors) * Math.PI * 2;
      const outer = R * (1 + (noise(Math.cos(theta) * 1.6 + 4, Math.sin(theta) * 1.6) - 0.5) * 0.22) * apron * (apron > 1 ? 1 + (blotch(Math.cos(theta) * 4, Math.sin(theta) * 4) - 0.5) * 0.16 : 1);
      for (let i = 1; i <= rings; i++) {
        const x = Math.cos(theta) * outer * i / rings, z = Math.sin(theta) * outer * i / rings, p = sample(x, z);
        pos.push(x, i === rings ? 0 : p.y, z);
        col.push(...p.c.toArray());
      }
    }
    for (let j = 0; j < sectors; j++) {
      const a0 = 1 + j * rings, b0 = 1 + ((j + 1) % sectors) * rings;
      idx.push(0, b0, a0);
      for (let i = 0; i < rings - 1; i++) idx.push(a0 + i, b0 + i, a0 + i + 1, b0 + i, b0 + i + 1, a0 + i + 1);
    }
    const hill = new THREE.BufferGeometry();
    hill.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hill.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    hill.setIndex(idx);
    hill.computeVertexNormals();
    s.mesh(hill, paint(mood.wear * 0.3, { flatShading: true }));

    const parts = new Batch();
    const top = (x: number, z: number): P3 => [x, sample(x, z).y, z];
    if (a.summit === 'blowout') for (let i = 0; i < 36; i++) {
      const angle = random() * 6.283, d = R * Math.min(0.92, qc * 1.3 + random() ** 1.6 * 0.75), size = R * (0.012 + random() * 0.03);
      const p = top(Math.cos(angle) * d, Math.sin(angle) * d);
      parts.box([size * 1.6, size, size * 1.2], [p[0], p[1] + size * 0.3, p[2]], random() < 0.3 && a.ice ? '#c9dde2' : '#40342b', [random(), random() * 3, random()]);
    }
    if (a.base === 'hummocks') for (let i = 0; i < 9 + Math.floor(random() * 5); i++) {
      const angle = random() * 6.283, d = R * (1.12 + random() * 0.3), size = R * (0.05 + random() * 0.07);
      parts.ball([size, size * 0.55, size * 0.9], [Math.cos(angle) * d, 0, Math.sin(angle) * d], palette[0].clone().lerp(palette[1], random()), [0, random() * 3, 0], 9);
    }
    // The marker stands on the highest sound ground, kept near the viewer's side.
    const spot = a.summit === 'intact' ? top(0, 0) : a.summit === 'slumped'
      ? top(-Math.cos(slide) * R * 0.08, -Math.sin(slide) * R * 0.08)
      : top(Math.cos(2.2) * R * (qc + 0.1), Math.sin(2.2) * R * (qc + 0.1));
    const [mx, my, mz] = spot;
    const big = Math.max(1, R / 15);
    if (a.marker === 'tripod') {
      const hpy = 6.5 * big, wood = blend('#a48a66', '#8b887f', mood.wear);
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + 0.4, foot: P3 = [mx + Math.cos(t) * 2.2 * big, my - 0.3, mz + Math.sin(t) * 2.2 * big];
        parts.rod(foot, [mx, my + hpy, mz], 0.12 * big, 0.09 * big, wood, 5);
        const next = t + Math.PI / 2;
        parts.rod([mx + Math.cos(t) * 1.25 * big, my + hpy * 0.42, mz + Math.sin(t) * 1.25 * big], [mx + Math.cos(next) * 1.25 * big, my + hpy * 0.42, mz + Math.sin(next) * 1.25 * big], 0.07 * big, 0.07 * big, wood, 4);
      }
      parts.rod([mx, my + hpy * 0.4, mz], [mx, my + hpy + 2.2 * big, mz], 0.09 * big, 0.07 * big, wood, 5);
      parts.drum(0.45 * big, 0.9 * big, [mx, my + hpy + 1.7 * big, mz], '#2f2a26', undefined, 8);
    } else if (a.marker === 'cairn') {
      for (let i = 0; i < 9; i++) { const lvl = Math.floor(i / 3), size = (0.75 - lvl * 0.16) * big; parts.ball([size, size * 0.6, size * 0.85], [mx + (random() - 0.5) * (1.6 - lvl * 0.6) * big, my + (0.2 + lvl * 0.7) * big, mz + (random() - 0.5) * (1.6 - lvl * 0.6) * big], blend('#8d8a84', '#5f5c57', random()), [0, random() * 3, 0], 7); }
      for (const side of [-1, 1]) parts.tube([[mx, my + 2.0 * big, mz], [mx + side * 0.7 * big, my + 2.9 * big, mz + 0.2], [mx + side * 1.1 * big, my + 3.9 * big, mz - 0.1]], (t) => 0.09 * big * (1 - t * 0.6), '#e6dcc6', 5, 8);
    } else if (a.marker === 'figure') {
      const k = 1.5 * big;
      for (const side of [-1, 1]) parts.rod([mx + side * 0.14 * k, my, mz], [mx + side * 0.1 * k, my + 0.85 * k, mz], 0.09 * k, 0.1 * k, '#2a2c30', 5);
      parts.rod([mx, my + 0.8 * k, mz], [mx, my + 1.5 * k, mz], 0.24 * k, 0.2 * k, '#27384a', 7);
      parts.ball([0.13 * k, 0.15 * k, 0.13 * k], [mx, my + 1.68 * k, mz], '#c99a7a', undefined, 7);
      parts.ball([0.15 * k, 0.09 * k, 0.15 * k], [mx, my + 1.79 * k, mz], '#b3261f', undefined, 7);
      parts.rod([mx + 0.35 * k, my, mz + 0.1], [mx + 0.3 * k, my + 1.6 * k, mz + 0.1], 0.03, 0.03, '#b59a70', 4);
    }
    if (!parts.empty) s.root.add(parts.mesh(paint(mood.wear)));

    const water = new THREE.MeshStandardMaterial({ color: blend('#3a4a55', '#55606a', mood.daylight * 0.5), roughness: 0.1, metalness: 0.4 });
    if (a.summit === 'crater') {
      const lip = hgt * (1 - qc * qc) ** power, floor = lip - hgt * mix(0.22, 0.4, decay);
      const pond = s.mesh(new THREE.CircleGeometry(R * qc * 0.72, 28), water, [0, floor + hgt * 0.035, 0]);
      pond.rotation.x = -Math.PI / 2;
    }
    if (a.base === 'moat') {
      const start = random() * 6.283;
      for (const [from, sweep] of [[start, 2.6 + random() * 1.4], [start + 4.3, 0.9 + random() * 0.6]] as const) {
        const moat = s.mesh(new THREE.RingGeometry(R * 0.93, R * (1.2 + random() * 0.1), 40, 1, from, sweep), water, [0, R * 0.004 + 0.02, 0]);
        moat.rotation.x = -Math.PI / 2;
      }
    }
    return s.finish({ footprint: R * 1.05 });
  },
});
