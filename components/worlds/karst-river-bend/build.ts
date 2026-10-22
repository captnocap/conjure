import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Item { at: P3; quat?: THREE.Quaternion; scale?: P3 | number; color?: THREE.ColorRepresentation }

const AIR = {
  mist: { bg: '#e4e5db', rock: '#5c6763', green: '#6a8d61', water: '#62b39a', bank: '#aab692', hemi: 1.3, key: 2.3, veil: 0.8 },
  clear: { bg: '#dfe9e5', rock: '#69736e', green: '#4d8a44', water: '#3fae90', bank: '#9cba76', hemi: 1.4, key: 2.8, veil: 0.4 },
  rain: { bg: '#d6d9d5', rock: '#474d4f', green: '#55695b', water: '#6fa596', bank: '#9aa494', hemi: 1.25, key: 1.5, veil: 0.7 },
  afterglow: { bg: '#e3c4a2', rock: '#574c5c', green: '#5c6b50', water: '#5fa890', bank: '#99986f', hemi: 1.0, key: 2.1, veil: 0.6 },
  moon: { bg: '#a3b3c4', rock: '#3d485a', green: '#3f574e', water: '#4f8fae', bank: '#6e8480', hemi: 0.95, key: 1.5, veil: 0.65 },
} as const;

export default defineWorld({
  questions: {
    air: choice('What is the air like over the river?', {
      mist: 'Pearl-grey dawn mist: the towers dissolve into it and a pale red sun hangs above.',
      clear: 'Washed clear after rain: jade water, green banks, every peak sharp.',
      rain: 'Fine grey rain: everything reduced to ink wash, near monochrome.',
      afterglow: 'Lamp-lit dusk: an apricot sky, mauve hills, small lights coming on along the bank.',
      moon: 'A blue moonlit evening with a pale full moon over the peaks.',
    }),
    depth: score('How far do the towers recede?', ['A single wall of peaks close behind the river', 'Three ranks, each paler', 'Five or six ranks fading to nothing']),
    banks: choice('What covers the flat banks?', {
      mirror: 'Freshly flooded paddies, a patchwork of mirrors.',
      seedlings: 'Young rice: pale water stitched with bright green.',
      gold: 'Ripe golden rice ready for harvest.',
      patchwork: 'A mix of everything: water, green, gold and bare earth plots.',
      sand: 'No fields: pale sand and gravel bars with rough grass.',
    }),
    trees: choice('What grows along the water?', {
      bamboo: 'Feathery clumps of bamboo leaning over the river.',
      banyan: 'A few big dark round-crowned trees.',
      bare: 'Nothing much: the banks are open.',
    }),
    settlement: choice('What have people built here?', {
      none: 'Nothing in sight.',
      hamlet: 'A hamlet of white walls and grey tiled roofs under the peaks.',
      ferry: 'A ferry landing: stone steps and a few rafts drawn up.',
      bridge: 'An old stone arch bridge over the upstream reach.',
    }),
    river: choice('What is out on the river?', {
      empty: 'Nothing: unbroken water.',
      rafts: 'Two or three bamboo rafts, each with a tiny standing figure.',
      lights: 'A scatter of fishing lamps and their reflections.',
      egrets: 'A line of white egrets flying low over the water.',
    }),
    view: choice('How is the scene framed?', {
      level: 'Low and level: the peaks stack up one behind another like a hanging scroll.',
      scroll: 'A classic raised view, the river winding back into the distance.',
      high: 'From high above, looking down on the bend like a map.',
    }),
    colophon: noul('Is there a column of calligraphy and a red seal in the empty sky, as on a painting?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const air = AIR[a.air];
    const pitch = { level: 17, scroll: 24, high: 35 }[a.view];
    const yaw = 7 + (random() - 0.5) * 6;
    const slots: [number, number, number?, number?][] = [[0.5, 1.6], [-7.2, -3.2, 0, 0.9], [8.9, 2.4, 0.1, 0.8], [-8, 6.5, 0, 0.85], [6.5, -15.5, 0, 0.8], [11.5, 9.2, 0, 0.8]];
    const { art: s, world } = diorama(context, { background: air.bg, floor: null, width: 30, depth: 24, pitch, yaw, maxHeight: 6.2, radius: 3.2, slots });
    const root = s.root;
    const bg = new THREE.Color(air.bg);
    const warm = new THREE.Color().setHSL(mix(0.58, 0.07, mood.warmth), 0.4, 0.6);
    const tone = (hex: string, fade = 0) => {
      const c = new THREE.Color(hex).lerp(warm, 0.08);
      const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s * mix(0.7, 1.2, mood.cheer), hsl.l);
      return c.lerp(bg, clamp01(fade));
    };
    const dusk = a.air === 'afterglow' || a.air === 'moon' ? 1 : clamp01((Math.abs(mood.daylight - 0.5) * 2 - 0.5) * 2);
    for (const child of root.children) {
      if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = air.hemi;
      else if (child === world.keyLight) world.keyLight!.intensity = air.key;
    }
    if (a.air === 'afterglow') world.keyLight!.color.set('#ffc591');
    if (a.air === 'moon') world.keyLight!.color.set('#c9d8f2');
    world.keyLight!.shadow.mapSize.set(2048, 2048);

    const mat4 = new THREE.Matrix4(), vv = new THREE.Vector3(), sc = new THREE.Vector3(), ident = new THREE.Quaternion();
    const batch = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], shadow = true) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((it, i) => {
        if (typeof it.scale === 'number' || it.scale === undefined) sc.setScalar(it.scale ?? 1); else sc.set(...it.scale);
        mesh.setMatrixAt(i, mat4.compose(vv.set(...it.at), it.quat ?? ident, sc));
        if (it.color !== undefined) mesh.setColorAt(i, new THREE.Color(it.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = shadow;
      root.add(mesh);
      return mesh;
    };
    const white = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });

    // --- River centreline ---
    const curve = new THREE.CatmullRomCurve3([[-14, -31], [-11, -23], [-4, -15.5], [5.5, -9], [9.5, 0.5], [3.5, 8.5], [-8, 13], [-17, 19]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const RS = 90;
    const centre = curve.getSpacedPoints(RS);
    const halfW = (t: number) => mix(2.0, 4.1, clamp01(t * 1.25));
    const riverGap = (x: number, z: number) => {
      let best = 1e9;
      for (let i = 0; i <= RS; i++) { const d = Math.hypot(centre[i].x - x, centre[i].z - z) - halfW(i / RS); if (d < best) best = d; }
      return best;
    };
    const slotGap = (x: number, z: number) => Math.min(...slots.map(([sx, sz]) => Math.hypot(sx - x, sz - z)));
    const far = (z: number) => clamp01((-z - 5) / 24);

    // --- Ground: fades to paper at the edges and with distance ---
    const GX = [-18, 18], GZ = [-34, 14.5];
    {
      const g = new THREE.PlaneGeometry(GX[1] - GX[0], GZ[1] - GZ[0], 30, 30).rotateX(-Math.PI / 2).translate(0, 0, (GZ[0] + GZ[1]) / 2);
      const p = g.attributes.position, col: number[] = [];
      const bank = tone(air.bank);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const edge = Math.max(clamp01((Math.abs(x) - 11.5) / 6.5), clamp01((z - 9.5) / 5), clamp01((-z - 8) / 20));
        const c = bank.clone().offsetHSL(0, 0, Math.sin(x * 0.7 + z * 0.4) * 0.015).lerp(bg, clamp01(edge * edge * (3 - 2 * edge) + 0.12));
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const ground = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
      root.add(ground);
      world.ground = ground;
      const catcher = new THREE.Mesh(new THREE.PlaneGeometry(GX[1] - GX[0], GZ[1] - GZ[0]).rotateX(-Math.PI / 2).translate(0, 0.012, (GZ[0] + GZ[1]) / 2), new THREE.ShadowMaterial({ opacity: 0.22, depthWrite: false }));
      catcher.receiveShadow = true;
      root.add(catcher);
    }

    // --- River ribbon ---
    const waterTone = tone(air.water).multiplyScalar(0.8);
    const sandTone = tone('#d8d2b8').lerp(bg, 0.25);
    {
      const pos: number[] = [], col: number[] = [], idx: number[] = [];
      for (let i = 0; i <= RS; i++) {
        const t = i / RS, tan = curve.getTangentAt(t), nx = -tan.z, nz = tan.x, w = halfW(t);
        for (const side of [-2, -1, 0, 1, 2]) {
          const reach = Math.abs(side) === 2 ? w + 0.55 : w * Math.abs(side);
          pos.push(centre[i].x + nx * reach * Math.sign(side), Math.abs(side) === 2 ? 0.03 : 0.045, centre[i].z + nz * reach * Math.sign(side));
          const c = (Math.abs(side) === 2 ? sandTone.clone() : waterTone.clone().offsetHSL(0, 0, side === 0 ? 0.04 : -0.03)).lerp(bg, clamp01(far(centre[i].z) * 0.9 + (t > 0.9 ? (t - 0.9) * 9 : 0)));
          col.push(c.r, c.g, c.b);
        }
        if (i < RS) { const b = i * 5; for (let k = 0; k < 4; k++) idx.push(b + k, b + k + 1, b + k + 5, b + k + 1, b + k + 6, b + k + 5); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      const river = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, emissive: waterTone, emissiveIntensity: 0.08 }));
      river.receiveShadow = true;
      root.add(river);
      const streaks: Item[] = [];
      for (let k = 0; k < 26; k++) {
        const t = mix(0.3, 0.92, random()), i = Math.round(t * RS), tan = curve.getTangentAt(t);
        const off = (random() - 0.5) * halfW(t) * 1.5;
        streaks.push({ at: [centre[i].x - tan.z * off, 0.055, centre[i].z + tan.x * off], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-tan.z, tan.x)), scale: [mix(0.8, 2.4, random()), 0.004, 0.035] });
      }
      batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: waterTone.clone().lerp(new THREE.Color('#ffffff'), 0.45), transparent: true, opacity: 0.5, depthWrite: false }), streaks, false);
    }
    // A gravel bar where something can stand in the stream.
    {
      const [bx, bz] = slots[2];
      const bar = s.cylinder(2.5, 2.9, 0.14, [bx, 0.07, bz], new THREE.MeshStandardMaterial({ color: tone('#c9c2a4'), roughness: 1 }), 20);
      bar.scale.set(1.15, 1, 0.85); bar.rotation.y = 0.5;
      const pebbles: Item[] = [];
      for (let k = 0; k < 40; k++) { const th = random() * 6.28, d = Math.sqrt(random()) * 2.6; pebbles.push({ at: [bx + Math.cos(th) * d, 0.15, bz + Math.sin(th) * d * 0.8], scale: mix(0.05, 0.16, random()), color: tone('#9a9a8c').offsetHSL(0, 0, (random() - 0.5) * 0.15) }); }
      batch(new THREE.DodecahedronGeometry(1, 0), white(), pebbles);
    }

    // --- Towers ---
    const towers: { x: number; z: number; r: number }[] = [];
    const tower = (x: number, z: number, H: number, R: number, fade: number, lit: boolean) => {
      towers.push({ x, z, r: R });
      const SEG = 30, RINGS = 14;
      const ph = random() * 6.28, p2 = random() * 6.28, lean = (random() - 0.5) * 0.14;
      const pa = mix(2.0, 3.4, random()), pb = mix(0.5, 0.7, random());
      const rock = tone(air.rock, fade), pale = tone(air.rock, fade).lerp(bg, 0.35), dark = tone(air.rock, fade).multiplyScalar(0.55).lerp(bg, fade), green = tone(air.green, fade);
      const pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color(), jit: number[] = [];
      const scrub = mix(0.82, 0.55, mood.density);
      for (let j = 0; j <= RINGS; j++) {
        const t = j / RINGS;
        const prof = Math.pow(Math.max(0, 1 - Math.pow(t, pa)), pb) + 0.14 * Math.pow(1 - t, 4);
        for (let i = 0; i <= SEG; i++) {
          const th = (i / SEG) * 6.2832;
          const lump = 1 + 0.16 * Math.sin(2 * th + ph + t * 1.5) + 0.1 * Math.sin(3 * th + p2 + t * 3) + 0.06 * Math.sin(5 * th + ph * 2 - t * 6);
          const jj = i === SEG ? jit[j * SEG] : (jit[j * SEG + i] = (random() - 0.5) * 0.09);
          const r = R * prof * lump * (1 + (t > 0.95 ? 0 : jj));
          pos.push(x + Math.sin(th) * r + lean * H * t * t, t * H, z + Math.cos(th) * r);
          const streak = Math.pow(Math.max(0, Math.sin(th * 7 + ph)), 3) + Math.pow(Math.max(0, Math.sin(th * 11 + p2)), 5) * 0.8;
          c.copy(rock).lerp(pale, clamp01(t * 0.6 + 0.15 * Math.sin(th * 3 + t * 8)));
          c.lerp(dark, clamp01(streak * mix(0.45, 0.85, mood.wear)) * (1 - t * 0.4));
          c.lerp(green, clamp01((t - scrub) * 5 + (jj > 0.03 ? 0.35 : 0)));
          if (t < 0.12) c.lerp(bg, (0.12 - t) * 5 * (0.3 + fade));
          col.push(c.r, c.g, c.b);
        }
      }
      for (let j = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) { const p = j * (SEG + 1) + i, q = p + SEG + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, lit ? new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }) : new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
      mesh.castShadow = lit; mesh.receiveShadow = lit;
      root.add(mesh);
    };
    const haze = { mist: 0.14, clear: 0, rain: 0.1, afterglow: 0.05, moon: 0.06 }[a.air];
    // Two strong near masses frame the bend.
    tower(14.6, -5.5, mix(12.5, 15, random()), 4.3, haze, true);
    tower(-14.8, -9.5, mix(9.5, 12, random()), 3.7, haze + 0.06, true);
    const ranks = 1 + Math.round(a.depth * 4);
    const rankZ: number[] = [];
    for (let r = 0; r < ranks; r++) {
      const z0 = -13.5 - r * 4.3;
      rankZ.push(z0);
      const fade = clamp01(haze + 0.2 + r * mix(0.2, 0.16, a.depth));
      let x = -18 + random() * 4 + (r % 2) * 2.5;
      while (x < 18.5) {
        const H = mix(6.5, 10.5, random()) + r * 1.4, R = H * mix(0.24, 0.36, random());
        const z = z0 + (random() - 0.5) * 2.2;
        if (riverGap(x, z) > R + 1.2 && towers.every((o) => Math.hypot(o.x - x, o.z - z) > (o.r + R) * 0.62) && slotGap(x, z) > R + 3) tower(x, z, H, R, fade, r < 2);
        x += R * mix(1.5, 2.6, random()) + mix(0.5, 3.5, 1 - mood.density);
      }
    }

    // --- Mist: sheets pooled at the feet of each rank, fading upward ---
    const veilCanvas = document.createElement('canvas');
    veilCanvas.width = 8; veilCanvas.height = 128;
    {
      const ctx = veilCanvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.35)'); grad.addColorStop(0.8, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 8, 128);
    }
    const veilTexture = new THREE.CanvasTexture(veilCanvas);
    const billboards: THREE.Object3D[] = [];
    const veil = (z: number, height: number, opacity: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(70, height).translate(0, height / 2, 0), new THREE.MeshBasicMaterial({ map: veilTexture, color: bg, transparent: true, opacity, depthWrite: false, toneMapped: false }));
      m.position.set(0, -0.2, z); m.rotation.y = (yaw * Math.PI) / 180;
      root.add(m);
    };
    rankZ.forEach((z, r) => veil(z + 3.4, 6.5 + r * 1.3, clamp01(air.veil * (0.75 + r * 0.12))));
    veil(-9, 3.2, air.veil * 0.5);
    veil(-36, 22, 1);
    const wisps: THREE.Mesh[] = [];
    const wispMat = new THREE.MeshBasicMaterial({ color: bg.clone().lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: air.veil * 0.33, depthWrite: false, toneMapped: false });
    for (let k = 0; k < 5 + Math.round(air.veil * 9); k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), wispMat);
      m.scale.set(mix(5, 11, random()), mix(0.25, 0.5, random()), mix(1, 2.2, random()));
      m.position.set((random() - 0.5) * 30, mix(1.2, 7, random()), mix(-30, -7, random()));
      root.add(m); wisps.push(m);
    }

    // --- Paddies on the banks ---
    if (a.banks !== 'sand') {
      const pos: number[] = [], col: number[] = [], idx: number[] = [];
      const sky = bg.clone().lerp(new THREE.Color('#ffffff'), 0.3).lerp(waterTone, 0.25);
      const fills: Record<string, THREE.Color[]> = {
        mirror: [sky, sky.clone().offsetHSL(0, 0, -0.05), sky.clone().lerp(waterTone, 0.3)],
        seedlings: [sky.clone().lerp(new THREE.Color('#8fd04a'), 0.45), sky.clone().lerp(new THREE.Color('#7cc13a'), 0.6), sky],
        gold: [new THREE.Color('#d7b043'), new THREE.Color('#c79a34'), new THREE.Color('#e0c264')],
        patchwork: [sky, new THREE.Color('#7fbf45'), new THREE.Color('#d7b043'), new THREE.Color('#9a7f58'), sky.clone().lerp(new THREE.Color('#8fd04a'), 0.5), new THREE.Color('#5f9a3f')],
      };
      const set = fills[a.banks];
      const dots: Item[] = [];
      const cw = 2.5, cd = 1.9;
      for (let gz = -22; gz < 15; gz += cd) for (let gx = -20; gx < 20; gx += cw) {
        const jx = () => (random() - 0.5) * 0.5;
        const bend = (z: number) => Math.sin(z * 0.28) * 1.6 + ((Math.floor(gz / cd) % 2) * cw) / 2;
        const quad: [number, number][] = [[gx + 0.1 + jx() + bend(gz), gz + 0.1], [gx + cw - 0.1 + jx() + bend(gz), gz + 0.1], [gx + cw - 0.1 + jx() + bend(gz + cd), gz + cd - 0.1], [gx + 0.1 + jx() + bend(gz + cd), gz + cd - 0.1]];
        const mx = (quad[0][0] + quad[2][0]) / 2, mz = gz + cd / 2;
        if (Math.abs(mx) > 17 || mz > 13.5 || quad.some(([x, z]) => riverGap(x, z) < 1.0) || towers.some((o) => Math.hypot(o.x - mx, o.z - mz) < o.r + 1.6)) continue;
        if (random() > mix(0.75, 1, mood.density)) continue;
        const edge = Math.max(clamp01((Math.abs(mx) - 12) / 5.5), clamp01((mz - 9.5) / 4.5), far(mz) * 1.1);
        const c = set[Math.floor(random() * set.length)].clone().offsetHSL(0, 0, (random() - 0.5) * 0.05).lerp(bg, clamp01(edge));
        const b = pos.length / 3;
        for (const [x, z] of quad) { pos.push(x, 0.025, z); col.push(c.r, c.g, c.b); }
        idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
        if ((a.banks === 'seedlings' || a.banks === 'patchwork') && mz > -7 && edge < 0.3 && dots.length < 1500 && c.g > c.r) for (let u = 0.15; u < 0.9; u += 0.17) for (let w = 0.2; w < 0.9; w += 0.3) dots.push({ at: [mix(mix(quad[0][0], quad[1][0], u), mix(quad[3][0], quad[2][0], u), w), 0.1, mix(gz + 0.1, gz + cd - 0.1, w)], scale: 0.09, color: '#4fae2c' });
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      const fields = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.banks === 'gold' ? 0.9 : 0.3, metalness: a.banks === 'gold' ? 0 : 0.1 }));
      fields.receiveShadow = true;
      root.add(fields);
      batch(new THREE.ConeGeometry(0.6, 2.2, 4), white(), dots, false);
    } else {
      const tufts: Item[] = [];
      for (let k = 0; k < 220; k++) {
        const x = (random() - 0.5) * 30, z = mix(-16, 12, random());
        if (riverGap(x, z) < 0.3 || slotGap(x, z) < 2.4) continue;
        tufts.push({ at: [x, 0.1, z], scale: [mix(0.2, 0.5, random()), mix(0.15, 0.45, random()), mix(0.2, 0.5, random())], color: tone(random() < 0.6 ? '#8a9a5c' : '#b7ae8a', Math.max(far(z), clamp01((Math.abs(x) - 11) / 5), clamp01((z - 9) / 4))) });
      }
      batch(new THREE.IcosahedronGeometry(1, 0), white(), tufts);
    }

    // --- Trees along the water ---
    if (a.trees !== 'bare') {
      const trunks: Item[] = [], crowns: Item[] = [];
      const want = Math.round(mix(6, 18, mood.density));
      const up = new THREE.Vector3(0, 1, 0);
      for (let k = 0, made = 0; k < 90 && made < want; k++) {
        const t = mix(0.22, 0.95, random()), i = Math.round(t * RS), tan = curve.getTangentAt(t), side = random() < 0.5 ? -1 : 1;
        const off = halfW(t) + mix(0.5, 1.6, random());
        const x = centre[i].x - tan.z * off * side, z = centre[i].z + tan.x * off * side;
        if (slotGap(x, z) < 3.6 || Math.abs(x) > 15.5 || z > 12.5 || towers.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.5)) continue;
        made++;
        const f = far(z) * 0.9;
        if (a.trees === 'bamboo') {
          const lean = new THREE.Vector3(tan.z * side, 0, -tan.x * side);
          for (let c = 0; c < 5; c++) {
            const dir = new THREE.Vector3((random() - 0.5) * 0.5, 1, (random() - 0.5) * 0.5).addScaledVector(lean, mix(0.1, 0.5, random())).normalize();
            const len = mix(2.4, 4.2, random());
            const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
            const bx = x + (random() - 0.5) * 0.5, bz = z + (random() - 0.5) * 0.5;
            trunks.push({ at: [bx + dir.x * len / 2, dir.y * len / 2, bz + dir.z * len / 2], quat: q, scale: [0.045, len, 0.045], color: tone('#93a650', f) });
            crowns.push({ at: [bx + dir.x * len * 0.85, dir.y * len * 0.85, bz + dir.z * len * 0.85], quat: q, scale: [mix(0.45, 0.7, random()), mix(0.9, 1.4, random()), mix(0.45, 0.7, random())], color: tone(random() < 0.5 ? '#7fae45' : '#9bbf55', f) });
          }
        } else {
          const hgt = mix(1.6, 2.6, random());
          trunks.push({ at: [x, hgt / 2, z], scale: [0.16, hgt, 0.16], color: tone('#4d3c2c', f) });
          for (let c = 0; c < 4; c++) crowns.push({ at: [x + (random() - 0.5) * 1.6, hgt + mix(0, 0.9, random()), z + (random() - 0.5) * 1.6], scale: [mix(0.9, 1.5, random()), mix(0.6, 0.95, random()), mix(0.9, 1.5, random())], color: tone(random() < 0.5 ? '#2f5a36' : '#3d6b3a', f) });
        }
      }
      batch(new THREE.CylinderGeometry(1, 1, 1, 5), white(), trunks);
      batch(new THREE.IcosahedronGeometry(1, 1), white(), crowns);
    }

    // --- Lamps ---
    const lampGlow = new THREE.MeshBasicMaterial({ color: '#ffd28a' });
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffb866', transparent: true, opacity: 0.32, depthWrite: false });
    const lamps: Item[] = [], pools: Item[] = [], posts: Item[] = [];
    const lamp = (x: number, y: number, z: number, size = 0.16, post = true) => {
      if (post) posts.push({ at: [x, y / 2, z], scale: [0.04, y, 0.04], color: '#3a3028' });
      if (dusk > 0.25) { lamps.push({ at: [x, y, z], scale: size }); pools.push({ at: [x, 0.07, z], scale: [size * 9, 1, size * 9] }); }
      else posts.push({ at: [x, y, z], scale: [size * 0.8, size, size * 0.8], color: '#b8452e' });
    };

    // --- Settlement ---
    const wall = new THREE.MeshStandardMaterial({ color: tone('#ece8dc', 0.1), roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: tone('#3c4144', 0.1), roughness: 0.85 });
    const house = (x: number, z: number, w: number, d: number, h: number, turn: number) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = turn; root.add(g);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); body.position.y = h / 2;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.75, d * 0.75, w * 1.12, 3), roofMat); roof.rotation.z = Math.PI / 2; roof.scale.set(0.55, 1, 1); roof.position.y = h + d * 0.2;
      for (const m of [body, roof]) { m.castShadow = m.receiveShadow = true; g.add(m); }
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.22, h * 0.3), dusk > 0.25 ? lampGlow : new THREE.MeshStandardMaterial({ color: '#3a3a3a' })); win.position.set(w * 0.18, h * 0.55, d / 2 + 0.01); g.add(win);
    };
    if (a.settlement === 'hamlet') {
      const hx = -12.5, hz = -5.5;
      for (let k = 0; k < 6 + Math.round(mood.density * 4); k++) {
        const x = hx + (random() - 0.5) * 7, z = hz + (random() - 0.5) * 4.5;
        if (riverGap(x, z) < 1.5 || slotGap(x, z) < 3.4 || towers.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.8)) continue;
        house(x, z, mix(1.3, 2, random()), mix(0.9, 1.2, random()), mix(0.8, 1.2, random()), (random() - 0.5) * 0.5);
      }
      lamp(hx + 2.5, 1.1, hz + 2.6); lamp(hx - 2, 1.1, hz + 2.9);
    } else if (a.settlement === 'ferry') {
      const t = 0.66, i = Math.round(t * RS), tan = curve.getTangentAt(t);
      const ex = centre[i].x + tan.z * halfW(t), ez = centre[i].z - tan.x * halfW(t);
      const stoneMat = new THREE.MeshStandardMaterial({ color: tone('#b3b0a2'), roughness: 1 });
      const turn = Math.atan2(tan.x, tan.z);
      for (let k = 0; k < 4; k++) { const st = s.box([2.6, 0.12, 0.45], [ex + tan.z * (k * 0.42 - 0.4), 0.3 - k * 0.07, ez - tan.x * (k * 0.42 - 0.4)], stoneMat); st.rotation.y = turn; }
      for (let k = 0; k < 3; k++) {
        const along = (k - 1) * 1.5 + 2.6;
        const raft = s.box([0.5, 0.07, 2.6], [ex - tan.z * 0.75 + tan.x * along, 0.08, ez + tan.x * 0.75 + tan.z * along], new THREE.MeshStandardMaterial({ color: tone(k === 1 ? '#c9bb6a' : '#b3a55c'), roughness: 0.7 }));
        raft.rotation.y = turn + (random() - 0.5) * 0.4;
      }
      house(ex + tan.z * 2.6 - tan.x * 1.5, ez - tan.x * 2.6 - tan.z * 1.5, 1.6, 1.0, 0.9, turn + Math.PI / 2);
      lamp(ex + tan.z * 0.9 + tan.x * 1.6, 1.3, ez - tan.x * 0.9 + tan.z * 1.6); lamp(ex + tan.z * 0.9 - tan.x * 1.9, 1.3, ez - tan.x * 0.9 - tan.z * 1.9);
    } else if (a.settlement === 'bridge') {
      const t = 0.3, i = Math.round(t * RS), tan = curve.getTangentAt(t), w = halfW(t) + 0.9;
      const g = new THREE.Group(); g.position.set(centre[i].x, 0, centre[i].z); g.rotation.y = Math.atan2(-tan.z, tan.x) + Math.PI / 2; root.add(g);
      const stoneMat = new THREE.MeshStandardMaterial({ color: tone('#a9a79a', far(centre[i].z) * 0.6), roughness: 1, side: THREE.DoubleSide });
      const shape = new THREE.Shape();
      shape.moveTo(-w - 1.6, 0); shape.lineTo(-w - 1.6, 0.25); shape.quadraticCurveTo(0, w * 0.95 + 1.1, w + 1.6, 0.25); shape.lineTo(w + 1.6, 0); shape.lineTo(w * 0.8, 0); shape.absarc(0, 0, w * 0.8, 0, Math.PI, false); shape.lineTo(-w - 1.6, 0);
      const arch = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -0.55), stoneMat);
      arch.castShadow = arch.receiveShadow = true; g.add(arch);
    }

    // --- River traffic ---
    const flock = new THREE.Group();
    if (a.river === 'rafts') {
      const count = 2 + Math.round(mood.density * 2);
      for (let k = 0; k < count; k++) {
        const t = mix(0.4, 0.86, (k + random() * 0.7) / count), i = Math.round(t * RS), tan = curve.getTangentAt(t), off = (random() - 0.5) * halfW(t) * 0.9;
        const x = centre[i].x - tan.z * off, z = centre[i].z + tan.x * off;
        if (Math.hypot(x - slots[2][0], z - slots[2][1]) < 3.6) continue;
        const g = new THREE.Group(); g.position.set(x, 0.06, z); g.rotation.y = Math.atan2(tan.x, tan.z) + (random() - 0.5) * 0.3; root.add(g);
        const f = far(z) * 0.7;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 2.6), new THREE.MeshStandardMaterial({ color: tone('#c4b566', f) })); hull.position.y = 0.03;
        const man = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.62, 6), new THREE.MeshStandardMaterial({ color: tone('#2f3f5c', f) })); man.position.set(0, 0.37, -0.7);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.13, 10), new THREE.MeshStandardMaterial({ color: tone('#dcc47a', f) })); hat.position.set(0, 0.76, -0.7);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4, 4), new THREE.MeshStandardMaterial({ color: tone('#5a4a30', f) })); pole.position.set(0.25, 0.7, -0.4); pole.rotation.x = 0.7;
        for (const m of [hull, man, hat, pole]) { m.castShadow = true; g.add(m); }
        if (dusk > 0.25) { lamps.push({ at: [x + tan.x * 1.1, 0.5, z + tan.z * 1.1], scale: 0.1 }); pools.push({ at: [x + tan.x * 1.1, 0.07, z + tan.z * 1.1], scale: [1.1, 1, 1.1] }); }
      }
    } else if (a.river === 'lights') {
      for (let k = 0; k < 7 + Math.round(mood.density * 8); k++) {
        const t = mix(0.3, 0.92, random()), i = Math.round(t * RS), tan = curve.getTangentAt(t), off = (random() - 0.5) * halfW(t) * 1.4;
        const x = centre[i].x - tan.z * off, z = centre[i].z + tan.x * off;
        if (Math.hypot(x - slots[2][0], z - slots[2][1]) < 3.3) continue;
        posts.push({ at: [x, 0.08, z], scale: [0.22, 0.05, 0.9], color: '#5a4a30' });
        lamps.push({ at: [x, 0.42, z], scale: 0.11 }); pools.push({ at: [x, 0.07, z + 0.5], scale: [0.7, 1, 1.6] });
      }
    } else if (a.river === 'egrets') {
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, -0.7, 0.22, -0.1, 0, 0, -0.15, 0, 0, 0.2, 0, 0, -0.15, 0.7, 0.22, -0.1], 3));
      wing.computeVertexNormals();
      const birdMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
      const n = 5 + Math.round(mood.density * 6);
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(wing, birdMat); b.position.set(k * 0.95 + (random() - 0.5) * 0.3, Math.abs(k - n / 2) * 0.12 + (random() - 0.5) * 0.15, (k - n / 2) * 0.35); b.rotation.y = Math.PI / 2; flock.add(b); }
      flock.position.set(-3, 2.6, 4.5); flock.rotation.y = 0.35;
      root.add(flock);
    }
    if (a.air === 'afterglow' || dusk > 0.6) { lamp(-3.2, 1.2, 4.2); lamp(3.6, 1.2, -1.6); }
    batch(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), posts);
    const lampMesh = batch(new THREE.SphereGeometry(1, 10, 8), lampGlow, lamps, false);
    batch(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), poolMat, pools, false);
    void lampMesh;

    // --- Sky: a disc, far geese, rain, the painter's colophon ---
    const disc = (hex: string, x: number, y: number, r: number) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }));
      m.position.set(x, y, -34); root.add(m); billboards.push(m);
    };
    if (a.air === 'mist') disc('#e3a48c', 7.5, 17.5, 1.5);
    else if (a.air === 'afterglow') disc('#f1803f', -6, 15, 1.9);
    else if (a.air === 'moon') disc('#f6f3e2', 8, 18, 1.6);
    else {
      const geese = new THREE.Group();
      const gm = new THREE.MeshBasicMaterial({ color: tone(air.rock, 0.3), side: THREE.DoubleSide });
      for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.12), gm); b.position.set((k - 3) * 0.75, -Math.abs(k - 3) * 0.3, 0); b.rotation.z = (k < 3 ? 1 : -1) * 0.3; geese.add(b); const b2 = b.clone(); b2.rotation.z *= -1; b2.position.x += 0.3; geese.add(b2); }
      geese.position.set(7, 17.5, -34); root.add(geese); billboards.push(geese);
    }
    if (a.air === 'rain') {
      const drops: Item[] = [];
      const slant = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.16);
      for (let k = 0; k < 320; k++) drops.push({ at: [(random() - 0.5) * 44, mix(0.5, 20, random()), mix(-26, 14, random())], quat: slant, scale: [0.02, mix(0.7, 1.6, random()), 0.02] });
      batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: tone(air.rock, 0.45), transparent: true, opacity: 0.4, depthWrite: false }), drops, false);
    }
    if (a.colophon) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.lineCap = 'round'; ctx.strokeStyle = a.air === 'moon' ? '#1c2430' : '#2a2a28';
      for (let col = 0; col < 2; col++) for (let row = 0; row < (col ? 5 : 7); row++) {
        const ox = 70 - col * 56, oy = 8 + row * 56;
        for (let k = 0; k < 6; k++) {
          ctx.lineWidth = 3 + random() * 3;
          const x0 = ox + random() * 40, y0 = oy + random() * 40, kind = random();
          ctx.beginPath(); ctx.moveTo(x0, y0);
          if (kind < 0.4) ctx.lineTo(ox + random() * 40, y0 + (random() - 0.5) * 5); else if (kind < 0.75) ctx.lineTo(x0 + (random() - 0.5) * 5, oy + random() * 40); else ctx.lineTo(x0 + random() * 18, y0 + 10 + random() * 14);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#b3261c'; ctx.fillRect(22, 320, 44, 44);
      ctx.strokeStyle = '#f3e6d8'; ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(27 + random() * 34, 325 + random() * 34); ctx.lineTo(27 + random() * 34, 325 + random() * 34); ctx.stroke(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 8.4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.35 }));
      m.position.set(-13, 14.5, -34); root.add(m); billboards.push(m);
    }

    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      for (const b of billboards) b.quaternion.copy(world.camera.quaternion);
    };
    const home = wisps.map((w) => w.position.x);
    const drift = mix(0.02, 0.5, mood.energy);
    world.update = (_dt, time) => {
      wisps.forEach((w, i) => { w.position.x = home[i] + Math.sin(time * drift * 0.3 + i * 1.7) * 2.5; });
      if (a.river === 'egrets') { flock.position.x = -3 + ((time * mix(0.2, 1.6, mood.energy)) % 14) - 4; flock.position.y = 2.6 + Math.sin(time * 0.8) * 0.15; }
      lampGlow.color.setHSL(0.1, 1, 0.74 + Math.sin(time * mix(1, 7, mood.energy)) * 0.03);
    };
    return world;
  },
});
