import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Blob, type V, clump, fuse, instances, limb, v } from './parts';

export default defineThing({
  questions: {
    hollow: choice('What does the mist lie in?', {
      forest: 'A dip in unbroken forest: rounded dark tree crowns rising on both sides.',
      river: 'A river bend: glints of flat water under the gaps, low banks.',
      meadow: 'A grassy hollow between soft green rises, a line of fence posts wading into it.',
      gorge: 'A narrow rocky gorge with steep stone sides.',
      paddies: 'Terraced fields: stepped flat banks with the mist lying along the lowest step.',
    }),
    shape: choice('What shape has it pooled into?', {
      ribbon: 'One long winding ribbon.',
      pool: 'A broad round lake of fog.',
      fingers: 'A main band with fingers reaching up the side gullies.',
      chain: 'A broken chain of separate pale islands.',
    }),
    state: choice('What is the mist doing right now?', {
      still: 'Lying perfectly still, smooth-edged, as if poured.',
      tearing: 'Tearing at its edges into rags and long streamers.',
      lifting: 'Lifting: columns and plumes rising off it as the first sun reaches in.',
      last: 'Nearly gone: a few last scraps left in the deepest places.',
    }),
    depth: score('How deep is it?', ['A knee-deep gauze skimming the ground', 'Head height', 'Deep enough to drown whole trees']),
    hidden: choice('What is half hidden in it?', {
      nothing: 'Nothing: only the mist itself.',
      treetops: 'A few lone treetops standing out of it like islands.',
      hut: 'The roof of a stilt hut with one lit window and a thread of smoke.',
      elephants: 'The grey backs and ears of a small herd of elephants wading through.',
      lantern: 'A single figure carrying a light, the glow spreading in the fog.',
      boat: 'A long narrow boat with someone standing in it, seeming to float on the mist.',
    }),
    length: score('How far does it stretch?', ['A small pocket twenty metres across', 'Thirty-five metres', 'A long band of fifty metres and more']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();

    const L = mix(22, 46, a.length) * rnd(0.93, 1.07) * (a.shape === 'pool' ? 0.6 : 1);
    const W = (a.shape === 'pool' ? L * 0.3 : mix(3.4, 5.2, a.length) * rnd(0.9, 1.15)) * (a.hollow === 'gorge' ? 0.8 : 1);
    const T = mix(0.9, 5.5, a.depth) * rnd(0.9, 1.1);

    // The course of the hollow: a wandering centre line, plus side gullies for fingers.
    interface Sample { p: V; n: V; w: number; t: number; main: boolean; on: boolean }
    const samples: Sample[] = [];
    const phase = rnd(0, 6.28);
    const lay = (pts: V[], width: number, main: boolean) => {
      const curve = new THREE.CatmullRomCurve3(pts), count = Math.max(8, Math.round(curve.getLength() / 1.6));
      for (let i = 0; i <= count; i++) {
        const t = i / count, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
        const taper = Math.pow(Math.sin(Math.PI * mix(0.08, 0.92, t)), 0.5) * (main ? 1 : 1 - t * 0.6);
        const on = a.shape !== 'chain' || !main || Math.sin(t * 15 + phase) > -0.2;
        samples.push({ p, n: v(-tan.z, 0, tan.x), w: width * taper * (1 + 0.22 * Math.sin(t * 9 + width)), t, main, on });
      }
      return curve;
    };
    const wander = rnd(0.12, 0.2) * (a.shape === 'pool' ? 0.25 : 1);
    const mainPts: V[] = [];
    for (let i = 0; i <= 6; i++) mainPts.push(v((i / 6 - 0.5) * L, 0, Math.sin(i * 1.3 + phase) * L * wander * (i === 0 || i === 6 ? 0.4 : 1)));
    const mainCurve = lay(mainPts, W, true);
    if (a.shape === 'fingers')
      for (let i = 0; i < 3; i++) {
        const t0 = 0.22 + i * 0.27 + rnd(-0.05, 0.05), from = mainCurve.getPointAt(t0), tan = mainCurve.getTangentAt(t0), side = i % 2 ? 1 : -1;
        const n = v(-tan.z, 0, tan.x).multiplyScalar(side), reach = L * rnd(0.2, 0.3);
        lay([from, from.clone().addScaledVector(n, reach * 0.5).addScaledVector(tan, reach * 0.2), from.clone().addScaledVector(n, reach).addScaledVector(tan, reach * 0.45)], W * 0.6, false);
      }
    const live = samples.filter((q) => q.on);
    // Distance beyond the edge of the hollow floor (negative inside), for the land and for the fog.
    const beyond = (x: number, z: number, list: Sample[], k: number) => {
      let best = 1e9;
      for (const q of list) { const d = Math.hypot(q.p.x - x, q.p.z - z) - q.w * k; if (d < best) best = d; }
      return best;
    };
    const o1 = rnd(0, 9), o2 = rnd(0, 9);
    const noise = (x: number, z: number, f: number) => Math.sin(x * f + o1) * Math.cos(z * f * 1.3 + o2) * 0.6 + Math.sin(x * f * 2.3 - z * f * 1.7 + o2) * 0.4;

    const Lx = L / 2 + 5, spanZ = Math.max(...samples.map((q) => Math.abs(q.p.z) + q.w)) + ({ forest: 10, river: 8, meadow: 9, gorge: 9, paddies: 11 }[a.hollow]);
    const rim = { forest: 7, river: 2.6, meadow: 4.2, gorge: 6.5, paddies: 6 }[a.hollow] + T * 0.9;
    const run = { forest: 7, river: 6, meadow: 8, gorge: 3, paddies: 10 }[a.hollow];
    const fall = (x: number, z: number) => { const e = (x / Lx) ** 2 + (z / spanZ) ** 2; return THREE.MathUtils.smoothstep(1 - e, 0, 0.3); };
    const ground = (x: number, z: number) => {
      const sd = beyond(x, z, samples, 1.12);
      const u = THREE.MathUtils.clamp(sd / run, 0, 1.6);
      let h = rim * (u < 1 ? u * u * (3 - 2 * u) : 1 + (u - 1) * (a.hollow === 'gorge' ? 0.04 : 0.25)) * (1 + 0.28 * noise(x, z, 0.21)) * fall(x, z);
      if (a.hollow === 'paddies') { const q = h / 1.25, f = q - Math.floor(q); h = 1.25 * (Math.floor(q) + THREE.MathUtils.smoothstep(f, 0.72, 1)); }
      if (a.hollow === 'gorge') h += Math.max(0, u) * noise(x, z, 0.6) * 1.2 * fall(x, z);
      return Math.max(0, h);
    };

    // Colour: cool blue-white before dawn, peach where the first light gets in.
    const low = Math.abs(mood.daylight - 0.5) * 2;
    const tint = new THREE.Color('#cfdbe4').lerp(new THREE.Color('#f0dcc6'), mood.warmth).lerp(new THREE.Color('#efcfc6'), low * 0.35 * mood.warmth).lerp(new THREE.Color('#f4f6f6'), mood.cheer * 0.4);
    const shadeTint = tint.clone().lerp(new THREE.Color('#8fa3ba'), 0.5);
    const hue = mix(0.38, 0.27, mood.warmth);
    const green = new THREE.Color().setHSL(hue, 0.45, mix(0.13, 0.2, mood.cheer)).lerp(new THREE.Color('#5d5a3c'), mood.wear * 0.3);

    // The land that holds it: one piece of ground with the hollow pressed into it.
    const nx = 104, nz = 72;
    const landGeo = new THREE.PlaneGeometry(Lx * 2, spanZ * 2, nx, nz).rotateX(-Math.PI / 2);
    const lp = landGeo.attributes.position, colours = new Float32Array(lp.count * 3), c = new THREE.Color();
    const palette = {
      forest: [green.clone().offsetHSL(0, 0, -0.02), green.clone().offsetHSL(-0.02, 0.05, 0.07)],
      river: [new THREE.Color('#4f6f7c'), new THREE.Color().setHSL(hue - 0.02, 0.42, mix(0.17, 0.25, mood.cheer))],
      meadow: [new THREE.Color().setHSL(hue - 0.05, 0.42, mix(0.14, 0.2, mood.cheer)), new THREE.Color().setHSL(hue - 0.07, 0.48, mix(0.22, 0.3, mood.cheer))],
      gorge: [new THREE.Color('#5f5c56'), new THREE.Color('#8f8676').lerp(new THREE.Color('#a48a66'), mood.warmth * 0.6)],
      paddies: [new THREE.Color('#7fa0a6'), new THREE.Color('#6f7f3f').lerp(new THREE.Color('#8a7a4a'), mood.wear * 0.6)],
    }[a.hollow];
    for (let i = 0; i < lp.count; i++) {
      const x = lp.getX(i), z = lp.getZ(i), h = ground(x, z);
      lp.setY(i, h);
      const sd = beyond(x, z, samples, 1.12), raw = h / 1.25;
      const k = a.hollow === 'paddies' ? (h < 0.3 ? 0.15 : 0.55 + 0.45 * (Math.floor(raw + 0.5) % 2)) : a.hollow === 'gorge' ? (Math.floor(h / 1.6) % 2 ? 1 : 0.55) : THREE.MathUtils.clamp(sd / (run * 0.35), 0, 1);
      c.copy(palette[0]).lerp(palette[1], THREE.MathUtils.clamp(k + noise(x, z, 0.5) * 0.15, 0, 1));
      colours.set([c.r, c.g, c.b], i * 3);
    }
    landGeo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    // Trim the sheet to the rounded patch of country, so there is no square table edge.
    const trim = (geo: THREE.BufferGeometry, visible: (i: number) => boolean) => {
      const index = geo.index!, kept: number[] = [];
      for (let t = 0; t < index.count; t += 3) { const i0 = index.getX(t), i1 = index.getX(t + 1), i2 = index.getX(t + 2); if (visible(i0) || visible(i1) || visible(i2)) kept.push(i0, i1, i2); }
      geo.setIndex(kept);
    };
    trim(landGeo, (i) => fall(lp.getX(i), lp.getZ(i)) > 0.015);
    landGeo.computeVertexNormals();
    const landMesh = s.mesh(landGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.hollow === 'river' ? 0.7 : 1, flatShading: a.hollow !== 'meadow' && a.hollow !== 'river' }));
    landMesh.name = 'land';
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
    if (a.hollow === 'forest' || a.hollow === 'river' || a.hollow === 'meadow') {
      // Crowns stand on the slopes; a forest is nothing but crowns.
      const crowns: Blob[] = [];
      const want = Math.round({ forest: 90, river: 22, meadow: 7 }[a.hollow] * mix(0.7, 1.15, mood.density));
      for (let i = 0, tries = 0; i < want && tries < want * 8; tries++) {
        const x = rnd(-Lx, Lx) * 0.95, z = rnd(-spanZ, spanZ) * 0.95, h = ground(x, z);
        if (h < (a.hollow === 'forest' ? 0.8 : 1.4) || fall(x, z) < 0.25) continue;
        const r = a.hollow === 'forest' ? rnd(1.8, 3.1) : rnd(1.3, 2.2);
        crowns.push({ at: v(x, h + r * (a.hollow === 'forest' ? 0.15 : 1.1), z), size: v(r, r * rnd(0.6, 0.85), r), color: green.clone().offsetHSL(rnd(-0.03, 0.03), rnd(-0.05, 0.05), rnd(-0.03, 0.07)), turn: rnd(0, 6) });
        i++;
      }
      if (crowns.length) s.root.add(instances(clump(), leafMaterial, crowns));
      if (a.hollow !== 'forest' && crowns.length) s.mesh(fuse(crowns.map((b) => new THREE.CylinderGeometry(0.14, 0.2, b.size.x * 1.2, 5).translate(b.at.x, b.at.y - b.size.x * 0.8, b.at.z))), s.material('#4a4036', { roughness: 1 }));
    }
    if (a.hollow === 'meadow') {
      const posts: THREE.BufferGeometry[] = [], tops: V[] = [];
      const start = mainCurve.getPointAt(0.3).add(v(0, 0, -spanZ * 0.6)), end = mainCurve.getPointAt(0.44).add(v(0, 0, spanZ * 0.6));
      for (let i = 0; i <= 14; i++) {
        const q = start.clone().lerp(end, i / 14), g = ground(q.x, q.z), hgt = 1.35;
        posts.push(new THREE.BoxGeometry(0.16, hgt + 0.3, 0.16).rotateZ(rnd(-0.08, 0.08)).translate(q.x, g + hgt / 2 - 0.15, q.z));
        tops.push(q.clone().setY(g + hgt * 0.85));
      }
      posts.push(limb(tops, 0.03, 0.03, 4, 1), limb(tops.map((q) => q.clone().add(v(0, -0.5, 0))), 0.03, 0.03, 4, 1));
      s.mesh(fuse(posts), s.material('#4f4236', { roughness: 1 }));
    }

    // The mist: a level sheet that the land rises through, with billows on top and rags at the edge.
    const ragged = a.state === 'tearing' ? 1 : a.state === 'still' ? 0.1 : 0.45;
    const fogMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 1, emissive: tint, emissiveIntensity: 0.22 });
    const veilMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 1, emissive: tint, emissiveIntensity: 0.4, transparent: true, opacity: 0.34, depthWrite: false });
    const level = (x: number, z: number) => {
      let sd = beyond(x, z, live, 1) + noise(x, z, 0.55) * W * 0.45 * ragged + noise(x, z, 1.7) * W * 0.18 * ragged;
      if (a.state === 'last') sd += W * 0.55 + (noise(x, z, 0.33) > 0.05 ? 0 : W);
      const m = THREE.MathUtils.clamp(-sd / (W * 0.45), 0, 1) * (0.25 + 0.75 * fall(x, z));
      return m <= 0 ? -0.2 : T * Math.sqrt(m) * (1 + 0.1 * noise(x, z, 0.9));
    };
    const fogGeo = new THREE.PlaneGeometry(Lx * 2, spanZ * 2, nx, nz).rotateX(-Math.PI / 2);
    const fp = fogGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setY(i, level(fp.getX(i), fp.getZ(i)));
    trim(fogGeo, (i) => fp.getY(i) > 0);
    fogGeo.computeVertexNormals();
    const fog = new THREE.Group();
    s.root.add(fog);
    const sheet = new THREE.Mesh(fogGeo, fogMat);
    sheet.castShadow = sheet.receiveShadow = true;
    fog.add(sheet);
    const dome = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const core: Blob[] = [], scraps: Blob[] = [], veil: Blob[] = [], plumes: Blob[] = [];
    const billows = Math.round(live.length * mix(0.5, 1.1, mood.density) * (a.state === 'still' ? 0.4 : 1));
    for (let i = 0; i < billows; i++) {
      const q = live[Math.floor(random() * live.length)], p = q.p.clone().addScaledVector(q.n, rnd(-0.6, 0.6) * q.w), base = level(p.x, p.z);
      if (base < T * 0.5) continue;
      const r = Math.max(0.9, q.w * rnd(0.22, 0.42));
      core.push({ at: p.setY(base * 0.75), size: v(r * rnd(1.2, 1.8), T * rnd(0.4, 0.62), r), color: tint.clone().lerp(shadeTint, rnd(0, 0.2)), turn: Math.atan2(-q.n.x, q.n.z) + rnd(-0.3, 0.3) });
    }
    live.forEach((q) => {
      for (const side of [-1, 1]) {
        if (a.state !== 'last' && random() < 0.3) veil.push({ at: q.p.clone().addScaledVector(q.n, side * q.w * rnd(0.9, 1.3)).setY(0.2), size: v(q.w * rnd(0.5, 0.9), T * rnd(0.4, 0.8), q.w * rnd(0.3, 0.5)), color: tint, turn: Math.atan2(-q.n.x, q.n.z) });
        if (random() < ragged * 0.5) {
          const far = rnd(1.05, 1.1 + ragged * 1.2), len = q.w * rnd(0.5, 1.1) * (0.5 + ragged);
          const p = q.p.clone().addScaledVector(q.n, side * q.w * far).add(v(rnd(-1, 1) * 2, 0, 0));
          scraps.push({ at: p.setY(ground(p.x, p.z) + T * rnd(0.1, 0.6) * ragged), size: v(len, T * rnd(0.14, 0.3), Math.max(0.4, q.w * rnd(0.08, 0.18))), color: tint.clone().lerp(shadeTint, rnd(0.1, 0.3)), turn: Math.atan2(-q.n.x, q.n.z) + rnd(-0.5, 0.5) + side * 0.35 });
        }
      }
    });
    if (a.state === 'lifting') {
      const stacks = 4 + Math.round(mood.energy * 4);
      for (let k = 0; k < stacks; k++) {
        const q = live[Math.floor(random() * live.length)], base = q.p.clone().addScaledVector(q.n, rnd(-0.5, 0.5) * q.w), leanX = rnd(-0.5, 0.9), tall = T * rnd(1.4, 2.4) + 4;
        for (let j = 0; j < 6; j++) {
          const f = j / 5, r = Math.max(0.5, q.w * mix(0.32, 0.1, f));
          plumes.push({ at: base.clone().add(v(leanX * f * tall * 0.5, T * 0.8 + f * tall, rnd(-0.4, 0.4))), size: v(r * 1.3, r * 1.2, r), color: tint.clone().lerp(shadeTint, f * 0.25), turn: rnd(0, 6) });
        }
      }
    }
    if (core.length) fog.add(instances(dome, fogMat, core));
    const drifting = new THREE.Group();
    fog.add(drifting);
    if (scraps.length) drifting.add(instances(dome, fogMat, scraps));
    if (plumes.length) drifting.add(instances(new THREE.SphereGeometry(1, 12, 8), fogMat, plumes));
    if (veil.length) { const m = instances(dome, veilMat, veil); m.castShadow = false; fog.add(m); }

    // What stands in it, half hidden.
    const inside = (t: number, across = 0) => { const p = mainCurve.getPointAt(t), tan = mainCurve.getTangentAt(t); return { p: p.addScaledVector(v(-tan.z, 0, tan.x), across * W), tan }; };
    let glow: THREE.MeshStandardMaterial | null = null, halo: THREE.Mesh | null = null;
    if (a.hidden === 'treetops') {
      const trunks: THREE.BufferGeometry[] = [], crowns: Blob[] = [];
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const { p } = inside(rnd(0.15, 0.85), rnd(-0.45, 0.45)), top = T + rnd(1.5, 4), r = rnd(1.3, 2.2);
        trunks.push(limb([p.clone(), p.clone().add(v(rnd(-0.4, 0.4), top * 0.6, 0)), p.clone().setY(top)], 0.24, 0.13, 6));
        crowns.push({ at: p.clone().setY(top + r * 0.2), size: v(r, r * 0.6, r), color: green.clone().offsetHSL(0, 0, rnd(-0.02, 0.05)), turn: rnd(0, 6) });
        crowns.push({ at: p.clone().add(v(rnd(-1, 1) * r * 0.6, top + r * 0.5, rnd(-1, 1) * r * 0.6)), size: v(r * 0.6, r * 0.42, r * 0.6), color: green.clone().offsetHSL(0, 0, rnd(0, 0.06)), turn: rnd(0, 6) });
      }
      s.mesh(fuse(trunks), s.material('#4a4036', { roughness: 1 }));
      s.root.add(instances(clump(), leafMaterial, crowns));
    }
    if (a.hidden === 'hut') {
      const { p } = inside(rnd(0.35, 0.65), rnd(-0.2, 0.2)), floor = Math.max(1.6, T * 0.8), timber = s.material('#6b5340', { roughness: 0.95 });
      const hut = new THREE.Group();
      hut.position.copy(p);
      hut.rotation.y = rnd(-0.6, 0.6);
      s.root.add(hut);
      const hAdd = (g: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; hut.add(mesh); return mesh; };
      const stilts: THREE.BufferGeometry[] = [];
      for (const x of [-2, 2]) for (const z of [-1.5, 1.5]) stilts.push(new THREE.BoxGeometry(0.22, floor + 0.2, 0.22).translate(x, floor / 2, z));
      stilts.push(new THREE.BoxGeometry(4.8, 0.2, 3.8).translate(0, floor, 0), new THREE.BoxGeometry(4.2, 2.2, 3.2).translate(0, floor + 1.2, 0));
      hAdd(fuse(stilts), timber);
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-2.3, 0); roofShape.lineTo(0, 1.9); roofShape.lineTo(2.3, 0); roofShape.closePath();
      const roof = hAdd(new THREE.ExtrudeGeometry(roofShape, { depth: 5.4, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-2.7, floor + 2.3, 0), s.material(new THREE.Color('#8a7a52').lerp(new THREE.Color('#6a6a62'), mood.wear * 0.6), { roughness: 1 }));
      void roof;
      glow = s.material('#ffd98a', { emissive: '#ffb347', emissiveIntensity: 2.2 });
      hAdd(new THREE.BoxGeometry(0.9, 0.8, 0.08).translate(0.6, floor + 1.3, 1.62), glow);
      hAdd(new THREE.BoxGeometry(0.7, 1.5, 0.08).translate(-1.1, floor + 0.95, 1.62), s.material('#2b241f'));
      const smoke: Blob[] = [];
      for (let j = 0; j < 7; j++) smoke.push({ at: p.clone().add(v(1 + j * 0.5, floor + 4.3 + j * 1.3, rnd(-0.3, 0.3))), size: v(0.35 + j * 0.13, 0.45 + j * 0.1, 0.35 + j * 0.13), color: '#c9c9c4' });
      drifting.add(instances(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 1, transparent: true, opacity: 0.75 }), smoke));
    }
    if (a.hidden === 'elephants') {
      const hide = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a6661').lerp(new THREE.Color('#7a6a58'), mood.warmth * 0.5), roughness: 1 });
      const herd = 3 + Math.round(mood.density * 2), t0 = rnd(0.25, 0.5);
      for (let i = 0; i < herd; i++) {
        const { p, tan } = inside(t0 + i * 0.07, rnd(-0.25, 0.25)), k = i === herd - 1 ? 0.55 : rnd(0.85, 1.1), sink = Math.min(T * 0.75, 2.1 * k);
        const el = new THREE.Group();
        el.position.copy(p).setY(Math.max(0, T * 1.05 - 2.0 * k));
        el.rotation.y = Math.atan2(-tan.z, tan.x) + rnd(-0.2, 0.2);
        el.scale.setScalar(k);
        s.root.add(el);
        const eAdd = (g: THREE.BufferGeometry) => { const mesh = new THREE.Mesh(g, hide); mesh.castShadow = true; el.add(mesh); return mesh; };
        const parts: THREE.BufferGeometry[] = [new THREE.SphereGeometry(1, 14, 10).scale(1.55, 1.05, 0.95).translate(0, 1.6, 0), new THREE.SphereGeometry(1, 12, 9).scale(0.72, 0.8, 0.68).translate(1.6, 2.05, 0)];
        for (const z of [-1, 1]) parts.push(new THREE.SphereGeometry(1, 10, 7).scale(0.16, 0.62, 0.55).rotateY(z * 0.5).translate(1.35, 2.05, z * 0.72));
        parts.push(limb([v(2.1, 2.0, 0), v(2.45, 1.5, 0), v(2.5, 0.9, 0), v(2.75, 0.6, 0)], 0.26, 0.11, 7));
        for (const x of [-0.9, 0.9]) for (const z of [-0.5, 0.5]) parts.push(new THREE.CylinderGeometry(0.3, 0.33, 1.4, 8).translate(x, 0.35, z));
        eAdd(fuse(parts));
      }
    }
    if (a.hidden === 'lantern') {
      const { p } = inside(rnd(0.4, 0.6), rnd(-0.15, 0.15)), sink = T * 0.6 - Math.max(0, T * 1.05 - 1.15);
      const dark = s.material('#2b2a2c');
      s.box([0.45, 0.75, 0.3], [p.x, 1.25 + T * 0.6 - sink, p.z], dark);
      s.ball([0.15, 0.17, 0.15], [p.x, 1.8 + T * 0.6 - sink, p.z], dark, 10);
      s.cylinder(0.32, 0.36, 0.06, [p.x, 1.93 + T * 0.6 - sink, p.z], dark, 12);
      s.box([0.4, 1.0, 0.28], [p.x, 0.4 + T * 0.6 - sink, p.z], dark);
      s.rod([p.x, 1.5 + T * 0.6 - sink, p.z + 0.2], [p.x + 0.55, 1.75 + T * 0.6 - sink, p.z + 0.3], 0.05, dark);
      glow = s.material('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 2.6 });
      s.ball([0.18, 0.22, 0.18], [p.x + 0.6, 1.45 + T * 0.6 - sink, p.z + 0.32], glow, 10);
      halo = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.3, depthWrite: false }));
      halo.scale.setScalar(Math.max(2.2, T * 0.9));
      halo.position.set(p.x + 0.6, 1.45 + T * 0.6 - sink, p.z + 0.32);
      s.root.add(halo);
    }
    if (a.hidden === 'boat') {
      const { p, tan } = inside(rnd(0.4, 0.6), rnd(-0.1, 0.1)), y = T * 0.95;
      const boat = new THREE.Group();
      boat.position.copy(p).setY(y);
      boat.rotation.y = Math.atan2(-tan.z, tan.x);
      s.root.add(boat);
      const bAdd = (g: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; boat.add(mesh); return mesh; };
      bAdd(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(3.6, 0.6, 0.6).translate(0, 0.5, 0), s.material('#3a2e26', { roughness: 0.9, side: THREE.DoubleSide }));
      const dark = s.material('#2b2a2c');
      bAdd(new THREE.BoxGeometry(0.4, 1.5, 0.3).translate(-1.6, 1.15, 0), dark);
      bAdd(new THREE.SphereGeometry(0.16, 10, 8).translate(-1.6, 2.1, 0), dark);
      bAdd(new THREE.ConeGeometry(0.42, 0.22, 12).translate(-1.6, 2.3, 0), s.material('#c9b27a'));
      bAdd(new THREE.CylinderGeometry(0.035, 0.035, 5, 6).rotateZ(0.35).translate(-0.9, 1.3, 0.35), s.material('#8a7355'));
    }

    const energy = mood.energy, reach = mix(0.3, 4, energy);
    return s.finish({
      footprint: Math.min(L * 0.4, 16),
      update: (_dt, time) => {
        drifting.position.x = Math.sin(time * 0.22) * reach;
        drifting.position.y = Math.sin(time * 0.31) * reach * 0.06;
        if (glow) glow.emissiveIntensity = 2.2 + Math.sin(time * 6) * 0.3 * energy;
        if (halo) halo.scale.setScalar(Math.max(2.2, T * 0.9) * (1 + Math.sin(time * 1.3) * 0.05));
      },
    });
  },
});
