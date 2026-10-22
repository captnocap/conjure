import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { canvasTexture, grounded, instances, mat, mesh, noise, paint, range, smooth, type Spot, terrainDisc } from './lib';

const DUSTS = {
  fine: { say: 'Fine pale grey dust, smooth and milky.', core: '#e9e4da', shade: '#8d8a86', fleck: '#ffffff', dark: '#5d5955' },
  icy: { say: 'Bright white ice grains that sparkle in the sun.', core: '#f4f8fa', shade: '#9fb3be', fleck: '#ffffff', dark: '#7b8f9a' },
  dirty: { say: 'Dim brown-grey dust, the colour of old crust, thrown up in dark filaments.', core: '#d8ccb8', shade: '#7b6e60', fleck: '#f3e6cf', dark: '#4a4038' },
  gas: { say: 'Gas-rich and faintly blue, more glow than grit.', core: '#dcecfb', shade: '#7f9fc0', fleck: '#eef7ff', dark: '#5c7894' },
} as const;
type Dust = (typeof DUSTS)[keyof typeof DUSTS];

const HEIGHT_BY_DOING = { wisp: 0.45, steady: 1, column: 1.25, outburst: 1.1, dying: 0.75, double: 0.9 } as const;
const GRAINS_BY_DOING = { wisp: 40, steady: 120, column: 150, outburst: 260, dying: 70, double: 100 } as const;
const OPACITY_BY_DOING = { wisp: 0.45, steady: 0.8, column: 0.95, outburst: 1, dying: 0.6, double: 0.8 } as const;

/** Streaky dust curtain that tiles vertically, so it can scroll upward forever. */
function streakTexture(random: () => number, dust: Dust, dirty: boolean) {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = dust.core;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const x = random() * w, width = 1 + random() * 7, dark = random() < (dirty ? 0.45 : 0.28);
      const colour = dark ? dust.dark : random() < 0.5 ? dust.fleck : dust.shade;
      const k = 1 + Math.floor(random() * 3), phase = random() * Math.PI * 2, drift = (random() - 0.5) * 10;
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      for (let y = 0; y < h; y += 8) {
        ctx.globalAlpha = Math.max(0, 0.15 + 0.55 * Math.sin((y / h) * Math.PI * 2 * k + phase)) * (dark ? 0.7 : 0.9);
        const x0 = x + Math.sin((y / h) * Math.PI * 2 + phase) * drift;
        const x1 = x + Math.sin(((y + 8) / h) * Math.PI * 2 + phase) * drift;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y + 8);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Dense at the vent, thinning and fraying upward. White is opaque. */
function fadeTexture(random: () => number, softness: number) {
  return canvasTexture(64, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.12, '#f4f4f4');
    gradient.addColorStop(0.45 - softness * 0.15, '#9a9a9a');
    gradient.addColorStop(0.8 - softness * 0.2, '#2e2e2e');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Ragged tongues of dust reaching higher than the rest.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = random() * w, top = h * range(random, 0.05, 0.4);
      const tongue = ctx.createLinearGradient(0, h, 0, top);
      tongue.addColorStop(0, 'rgba(60,60,60,0.6)');
      tongue.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tongue;
      ctx.fillRect(x - 3, top, 6 + random() * 6, h - top);
    }
  }, false);
}

export default defineThing({
  questions: {
    doing: choice('What is the jet doing right now?', {
      wisp: 'A faint thread of dust barely clearing the pit.',
      steady: 'A clean steady fan, the classic jet.',
      column: 'A tight bright column shooting straight up.',
      outburst: 'A roaring outburst: a broad plume with crust thrown up in it and a skirt of dust rolling out.',
      dying: 'Dying down: a ragged fan with a dark gap opening at its base.',
      double: 'Two fans crossing from neighbouring vents.',
    }),
    vent: choice('What kind of vent does it rise from?', {
      sinkhole: 'A round steep-walled pit with a dark floor.',
      fissure: 'A long crack in the crust, the fan rising as a sheet.',
      cluster: 'A cluster of small pits sharing one fan.',
      scarp: 'A vent at the foot of a small collapsed scarp of layered crust.',
      boulder: 'A pit beside a tilted pale ice boulder.',
    }),
    dust: choice('What is it carrying?', Object.fromEntries(Object.entries(DUSTS).map(([key, value]) => [key, value.say])) as Record<keyof typeof DUSTS, string>),
    rim: choice('What lines the lip of the pit?', {
      bare: 'Bare dark crust, nothing more.',
      frost: 'A bright rind of fresh frost.',
      debris: 'A ring of fallen pebbles and grit.',
      lit: 'A sharp sunlit edge, blazing against the dark hole.',
    }),
    lean: score('How much does the fan lean?', ['Straight up', 'Leaning a little', 'Bent hard over to one side']),
    spread: score('How wide does it open?', ['A narrow pencil', 'A fan', 'A wide sheet']),
    reach: score('How high does it reach?', ['A low puff', 'Tall', 'A column reaching far overhead']),
    chunks: noul('Are chunks of crust being thrown up with the dust?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const dust = DUSTS[a.dust];
    const n = noise(random);
    const fissure = a.vent === 'fissure';

    // ---- The vent: one painted terrain disc with the pit (or pits) pressed into it ----
    const pitR = a.vent === 'cluster' ? range(random, 3.5, 4.5) : range(random, 6, 10);
    const pits: { x: number; z: number; r: number; sx: number; sz: number }[] = [{ x: 0, z: 0, r: pitR, sx: fissure ? 2.6 : 1, sz: fissure ? 0.38 : 1 }];
    if (a.vent === 'cluster') for (let i = 0; i < 3 + Math.floor(random() * 3); i++) {
      const angle = random() * Math.PI * 2, d = pitR * range(random, 1.9, 2.8);
      pits.push({ x: Math.cos(angle) * d, z: Math.sin(angle) * d * 0.8, r: pitR * range(random, 0.55, 0.95), sx: 1, sz: 1 });
    }
    if (a.doing === 'double') {
      const side = random() < 0.5 ? -1 : 1;
      pits.push({ x: side * pitR * range(random, 2.4, 2.9), z: pitR * range(random, -0.6, 0.6), r: pitR * 0.6, sx: 1, sz: 1 });
    }
    const outer = pitR * (fissure ? 4.4 : a.vent === 'cluster' ? 5.2 : 3.6);
    // The crater is built up from the ground, so a world's floor can never fill the pit.
    const shape = (x: number, z: number) => {
      let inside = Infinity, slope = 0, darkness = 0;
      for (const p of pits) {
        const d = Math.hypot((x - p.x) / p.sx, (z - p.z) / p.sz) / p.r, rimH = p.r * 0.34, floorY = p.r * 0.025;
        if (d < 1.06) {
          const h = floorY + (rimH - floorY) * smooth(0.5, 1.04, d) ** 1.6;
          if (h < inside) { inside = h; darkness = 1 - (h - floorY) / (rimH - floorY); }
        } else slope = Math.max(slope, rimH * Math.exp(-((d - 1.06) ** 2) / 0.35));
      }
      return { inside, slope, darkness };
    };
    const heightAt = (x: number, z: number, t = Math.hypot(x, z) / outer) => {
      const { inside, slope } = shape(x, z);
      const lumps = n(x, 0, z, 0.25 / pitR) * pitR * 0.06 + n(z, x, 0, 1.2 / pitR) * pitR * 0.02;
      const h = inside < Infinity ? inside + lumps * 0.15 : Math.max(pitR * 0.1 * (1 - smooth(0.25, 1, t)) + lumps + pitR * 0.05, slope + lumps * 0.5);
      return h * (1 - smooth(0.86, 1, t)) - smooth(0.94, 1, t) * pitR * 0.03;
    };
    const ground = terrainDisc(30, 84, (angle) => outer * (1 + n(Math.cos(angle) * 2, 0, Math.sin(angle) * 2, 0.6) * 0.16), (x, z, t) => heightAt(x, z, t));
    const crust = new THREE.Color('#302d2a').lerp(new THREE.Color('#4a423a'), mood.wear);
    const frost = new THREE.Color('#e6edf0'), dusty = new THREE.Color('#5d564f'), floor = new THREE.Color('#0b0908'), sunlit = new THREE.Color('#d8ccb4');
    const sun = new THREE.Vector2(-0.6, 0.8).normalize();
    paint(ground, (p, c) => {
      const { inside, slope, darkness } = shape(p.x, p.z);
      c.copy(crust).lerp(dusty, Math.max(0, n(p.x, p.z, 0, 0.5 / pitR)) * 0.6);
      if (inside < Infinity) {
        c.lerp(floor, Math.min(1, darkness * 1.6));
        // The far inner wall faces the sun and catches it.
        if (a.rim === 'lit' && (p.x * sun.x + p.z * sun.y) < 0) c.lerp(sunlit, (1 - darkness) ** 1.5 * 0.9);
      }
      const crest = inside < Infinity ? 1 - darkness : slope / (pitR * 0.34);
      if (a.rim === 'frost') c.lerp(frost, smooth(0.55, 0.9, crest) * 0.95);
      if (a.rim === 'lit' && inside === Infinity && (p.x * sun.x + p.z * sun.y) > 0) c.lerp(sunlit, smooth(0.6, 0.95, crest) * 0.55);
    });
    const patch = mesh(root, ground, mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true }));

    // ---- Set dressing around the vent ----
    const rock = mat('#3a3430', { flatShading: true, roughness: 0.95 });
    if (a.vent === 'scarp') {
      const tones = ['#3b3530', '#615548', '#8e8a83', '#4a423b'];
      let y = -pitR * 0.2;
      const back = -pitR * 1.6;
      for (let i = 0; i < 6; i++) {
        const t = pitR * range(random, 0.18, 0.34);
        const slab = mesh(root, new THREE.BoxGeometry(pitR * range(random, 3.6, 4.6), t, pitR * 1.2, 6, 1, 2), mat(tones[i % 4], { flatShading: true }), [range(random, -0.3, 0.3), y + t / 2, back - pitR * 0.6 - i * pitR * 0.06]);
        slab.rotation.set(range(random, -0.03, 0.03), range(random, -0.06, 0.06), range(random, -0.03, 0.03));
        y += t;
      }
      const blocks: Spot[] = Array.from({ length: 12 }, () => ({ at: [range(random, -1.8, 1.8) * pitR, pitR * 0.12, back + range(random, -0.1, 0.6) * pitR], scale: pitR * range(random, 0.12, 0.3), rot: [random() * 3, random() * 3, random() * 3] }));
      instances(root, new THREE.DodecahedronGeometry(1, 0), rock, blocks);
    } else if (a.vent === 'boulder') {
      const size = pitR * range(random, 0.75, 1.05);
      const boulder = mesh(root, displaceRock(new THREE.IcosahedronGeometry(size, 2), n, size), mat('#cfd6d8', { flatShading: true, roughness: 0.7 }), [pitR * 1.85, size * 0.45, -pitR * 0.55], [1.1, 0.8, 1], [0.4, random() * 3, 0.35]);
      boulder.castShadow = true;
      mesh(root, new THREE.DodecahedronGeometry(size * 0.35, 0), rock, [pitR * 1.3, size * 0.15, pitR * 0.6], 1, [1, 2, 0.5]);
    }
    if (a.rim === 'debris' || a.doing === 'outburst') {
      const bits: Spot[] = [];
      for (let i = 0; i < 70 + Math.floor(random() * 50); i++) {
        const p = pits[i % pits.length], angle = random() * Math.PI * 2, d = p.r * range(random, 1.05, 2.1);
        const x = p.x + Math.cos(angle) * d * p.sx, z = p.z + Math.sin(angle) * d * p.sz;
        const s = p.r * range(random, 0.025, 0.09);
        bits.push({ at: [x, heightAt(x, z) + s * 0.3, z], scale: s, rot: [random() * 3, random() * 3, 0] });
      }
      instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#4c4640', { flatShading: true }), bits);
    }
    // ---- The jet ----
    const streaks = streakTexture(random, dust, a.dust === 'dirty');
    const glow = mix(0.25, 0.75, mood.cheer) * (a.doing === 'column' ? 1.25 : 1);
    const scrolling: THREE.Texture[] = [];
    const breathing: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number; material: THREE.MeshStandardMaterial; opacity: number }[] = [];
    const grainSets: { mesh: THREE.InstancedMesh; grains: { r: number; angle: number; t: number; length: number; thickness: number }[]; H: number; rb: number; rt: number; squash: number; lift: number }[] = [];
    const chunks: { mesh: THREE.Mesh; t: number; spin: number; angle: number; reach: number; H: number }[] = [];
    const H0 = mix(45, 190, a.reach) * HEIGHT_BY_DOING[a.doing];
    const fleckMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: dust.fleck, emissiveIntensity: glow * 0.8, roughness: 1 });
    const chunkMaterial = mat('#2c2724', { flatShading: true });

    const jet = (x: number, z: number, H: number, leanAngle: number, size: number) => {
      const group = new THREE.Group();
      group.position.set(x, pitR * 0.02, z);
      group.rotation.z = leanAngle;
      group.rotation.x = range(random, -0.12, 0.12);
      root.add(group);
      const halfAngle = mix(0.06, 0.36, a.spread) * (a.doing === 'column' ? 0.4 : a.doing === 'outburst' ? 1.6 : a.doing === 'wisp' ? 0.7 : 1);
      const rb = pitR * size * 0.5 * (fissure ? 2 : 1) * (a.vent === 'cluster' ? 2 : 1);
      const rt = rb + H * Math.tan(halfAngle);
      const squash = fissure ? 0.35 : mix(1, 0.5, a.spread);
      const lift = a.doing === 'dying' ? H * 0.2 : 0;
      const body = H - lift;
      const strength = OPACITY_BY_DOING[a.doing];
      const shells: [number, number, number, number, number, string, number][] = [
        // top radius, bottom radius, height share, opacity, softness, tint, glow
        [rt * 0.42, rb * 0.45, 0.8, 0.95, 0, '#ffffff', 1.3],
        [rt * 0.78, rb * 0.8, 0.95, 0.7, 0.4, '#ffffff', 0.8],
        [rt * 1.12, rb * 1.2, 1.05, 0.5, 0.8, dust.shade, 0.25],
      ];
      shells.forEach(([top, bottom, share, opacity, softness, tint, shine], index) => {
        const map = streaks.clone();
        map.needsUpdate = true;
        map.repeat.set(index + 1, 1.6 - index * 0.3);
        map.offset.set(random(), random());
        scrolling.push(map);
        const material = new THREE.MeshStandardMaterial({
          color: tint, map, alphaMap: fadeTexture(random, softness), emissive: dust.core, emissiveMap: map, emissiveIntensity: glow * shine,
          transparent: true, opacity: opacity * strength, depthWrite: false, side: THREE.DoubleSide, roughness: 1,
        });
        const geometry = new THREE.CylinderGeometry(top, bottom, body * share, 40, 8, true);
        geometry.translate(0, body * share / 2, 0);
        const shell = mesh(group, geometry, material, [0, lift, 0], [1, 1, squash], [0, random() * Math.PI, 0], false);
        shell.renderOrder = 2 + index;
        breathing.push({ mesh: shell, base: shell.scale.clone(), phase: random() * 6, material, opacity: material.opacity });
      });
      // A soft bright source at the throat, where the gas leaves the ice.
      const throat = mesh(group, new THREE.SphereGeometry(rb * 0.85, 20, 12), new THREE.MeshStandardMaterial({ color: dust.core, emissive: dust.core, emissiveIntensity: glow * 1.6, transparent: true, opacity: a.doing === 'dying' ? 0.15 : 0.55, depthWrite: false }), [0, lift + rb * 0.2, 0], [1, 0.55, squash], [0, 0, 0], false);
      throat.renderOrder = 1;
      // Grains caught by the sun, fanning out from the vent. These are solid: the jet's reach is the thing's height.
      const count = Math.round(GRAINS_BY_DOING[a.doing] * range(random, 0.8, 1.2) * size);
      const grains = Array.from({ length: count }, () => ({ r: Math.sqrt(random()) * 0.9, angle: random() * Math.PI * 2, t: random() ** 0.8, length: range(random, 0.6, 2.2) * H / 40, thickness: range(random, 0.08, 0.28) * H / 100 }));
      const set = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), fleckMaterial, count);
      set.castShadow = false;
      set.frustumCulled = false;
      for (let i = 0; i < count; i++) set.setColorAt(i, new THREE.Color(random() < (a.dust === 'dirty' ? 0.45 : 0.2) ? dust.dark : dust.fleck));
      group.add(set);
      grainSets.push({ mesh: set, grains, H, rb, rt, squash, lift });
      if (a.chunks || a.doing === 'outburst') {
        const chunkCount = Math.round((6 + random() * 8 + (a.doing === 'outburst' ? 10 : 0)) * size);
        for (let i = 0; i < chunkCount; i++) {
          const s = pitR * range(random, 0.04, 0.16) * (a.doing === 'outburst' ? 1.4 : 1);
          const chunk = mesh(group, new THREE.DodecahedronGeometry(s, 0), chunkMaterial);
          chunks.push({ mesh: chunk, t: random(), spin: range(random, 1, 4), angle: random() * Math.PI * 2, reach: random(), H });
        }
      }
      if (a.doing === 'outburst') {
        // A skirt of dust rolling out across the ground from the vent.
        const puffs: Spot[] = Array.from({ length: 14 }, (_, i) => {
          const angle = (i / 14) * Math.PI * 2 + random() * 0.4, d = rb * range(random, 1.4, 3);
          return { at: [Math.cos(angle) * d, size * pitR * 0.45 + rb * 0.3, Math.sin(angle) * d * squash], scale: rb * range(random, 0.7, 1.3) };
        });
        const skirt = instances(group, new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: dust.core, emissive: dust.shade, emissiveIntensity: 0.25, transparent: true, opacity: 0.32, depthWrite: false, roughness: 1 }), puffs);
        skirt.castShadow = false;
        skirt.renderOrder = 6;
      }
    };
    const leanSign = random() < 0.5 ? -1 : 1;
    jet(0, 0, H0, leanSign * mix(0, 0.7, a.lean), 1);
    if (a.doing === 'double') {
      const p = pits[pits.length - 1];
      jet(p.x, p.z, H0 * range(random, 0.55, 0.8), -leanSign * range(random, 0.25, 0.55), 0.6);
    }

    // ---- Motion: grains drift up and out, the fan breathes, chunks arc and tumble ----
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), focus = new THREE.Vector3();
    const layout = () => {
      for (const set of grainSets) {
        focus.set(0, -set.H * 0.35, 0);
        set.grains.forEach((grain, index) => {
          const y = set.lift + grain.t * (set.H - set.lift) * 0.92;
          const radius = (set.rb + (set.rt - set.rb) * grain.t) * grain.r;
          position.set(Math.cos(grain.angle) * radius, y, Math.sin(grain.angle) * radius * set.squash);
          dir.copy(position).sub(focus).normalize();
          quaternion.setFromUnitVectors(up, dir);
          const fade = grain.t > 0.8 ? (1 - grain.t) / 0.2 : grain.t < 0.05 ? grain.t / 0.05 : 1;
          scale.set(grain.thickness, grain.length * (0.3 + 0.7 * fade), grain.thickness);
          set.mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
        });
        set.mesh.instanceMatrix.needsUpdate = true;
        set.mesh.computeBoundingBox();
        set.mesh.computeBoundingSphere();
      }
      for (const chunk of chunks) {
        const t = chunk.t, arc = Math.sin(t * Math.PI);
        const out = pitR * (0.6 + chunk.reach * 2.4) * arc;
        chunk.mesh.position.set(Math.cos(chunk.angle) * out, t * chunk.H * (0.35 + chunk.reach * 0.35), Math.sin(chunk.angle) * out * 0.6);
        chunk.mesh.rotation.set(t * chunk.spin * 6, t * chunk.spin * 4, 0);
      }
    };
    layout();
    const pace = mix(0.12, 1.6, mood.energy);
    const update = (dt: number, time: number) => {
      const step = dt * pace * 0.1;
      for (const set of grainSets) for (const grain of set.grains) {
        grain.t += step * (0.7 + grain.r * 0.6);
        if (grain.t > 1) { grain.t -= 1; grain.angle = random() * Math.PI * 2; }
      }
      for (const chunk of chunks) { chunk.t += dt * pace * 0.06; if (chunk.t > 1) chunk.t -= 1; }
      layout();
      scrolling.forEach((map, index) => { map.offset.y -= dt * pace * (0.12 + index * 0.05); });
      for (const b of breathing) {
        const breath = Math.sin(time * pace * 1.1 + b.phase) * mix(0.02, 0.09, mood.energy);
        b.mesh.scale.set(b.base.x * (1 + breath), b.base.y, b.base.z * (1 + breath));
        b.material.opacity = b.opacity * (1 + breath * 1.5);
      }
    };
    return grounded(root, { measure: patch, update, footprint: outer * 0.9 });
  },
});

function displaceRock(geometry: THREE.BufferGeometry, n: (x: number, y: number, z: number, f?: number) => number, size: number) {
  const position = geometry.attributes.position, p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const k = 1 + n(p.x, p.y, p.z, 1.4 / size) * 0.22;
    position.setXYZ(i, p.x * k, p.y * k, p.z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}
