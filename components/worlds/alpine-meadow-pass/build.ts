import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Item { p: P3; s: P3 | number; ry?: number; c?: THREE.ColorRepresentation }

export default defineWorld({
  questions: {
    weather: choice('What is the weather doing?', {
      clear: 'A clear, rinsed morning: hard light, blue shadow, every stone sharp.',
      storm: 'An afternoon storm building: dark cloud stacking up behind the peaks.',
      spill: 'Cloud pouring through the saddle and down onto the top of the meadow.',
      dusting: 'A dusting of fresh snow overnight, the upper slope whitened.',
      foehn: 'A warm dry wind: smooth lens-shaped clouds parked above the ridge.',
    }),
    season: choice('What is the pasture like?', {
      bloom: 'Early summer: the grass flooded with gentian blue, yellow, white and pink.',
      grazed: 'High summer: cropped short by cattle, a few flowers the cows refused.',
      alpenrose: 'Drifts of dark alpenrose bushes in deep pink flower.',
      autumn: 'Autumn: tawny gold grass with rust and purple patches.',
    }),
    peaks: choice('What do the peaks behind look like?', {
      horns: 'Sharp grey rock horns streaked with snow gullies.',
      glacier: 'A broad white glaciated dome with blue crevasse lines.',
      towers: 'Pale ochre limestone towers and walls, almost no snow.',
      slate: 'A dark crumbling slate ridge with old snow patches.',
    }),
    water: choice('What is the water?', {
      stream: 'A bright thread of stream hopping between stones.',
      tarn: 'The stream widens into a small still tarn.',
      dry: 'A dry stony bed, the snowmelt is finished.',
    }),
    path: choice('What way leads to the pass?', {
      trail: 'A worn footpath with a yellow signpost at the bottom and a cairn on the saddle.',
      mule: 'An old mule track edged with set stones.',
      tracks: 'Only cattle tracks terracing the slope.',
      none: 'No path at all.',
    }),
    rocky: score('How rocky is the meadow?', ['Smooth open pasture', 'A scatter of grey boulders', 'Strewn with rockfall from the cliffs']),
    slope: choice('What else marks the slope?', {
      nothing: 'Nothing, it is empty.',
      fence: 'A line of weathered fence posts and wire with a gap at the path.',
      herd: 'Small brown cows dotted high on the slope.',
      snowpatch: 'A dirty patch of last winter\'s snow lingering in a hollow.',
      hay: 'Rows of mown hay drying in the sun.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const HW = 7.5, ZF = 5.5, ZB = -10.5;
    const P1 = random() * 6, P2 = random() * 6, P3_ = random() * 6, P4 = random() * 6;
    const slotsXZ: [number, number, number][] = [[0.4, 1.8, 1], [-4.3, -0.4, 1], [4.6, -1.4, 1], [4.9, 3.4, 0.82], [-4.6, 3.6, 0.82], [0.6, -3.6, 0.82]];
    const streamX = (z: number) => -2.0 - 0.05 * z + 0.4 * Math.sin(0.6 * z + 1);
    const pathX = (z: number) => z >= -5.5 ? 2.6 + 0.45 * Math.sin(0.8 * z) : 3.03 + 0.55 * Math.sin((-5.5 - z) * 2.6);
    const ridge = (x: number) => {
      const jag = 0.5 * Math.abs(Math.sin(x * 2.3 + P1)) + 0.3 * Math.sin(x * 5.1 + P2);
      if (a.peaks === 'glacier') return 5.0 + 4.2 * Math.exp(-(((x + 3.2) / 3.6) ** 2)) + 2.2 * Math.exp(-(((x - 8) / 2.4) ** 2)) + jag * 0.25;
      if (a.peaks === 'towers') return 4.9 + 4.4 * clamp01(1.6 * Math.sin(x * 0.75 + 2.2 + P1 * 0.1) + 0.2) * (x < 1.5 ? 1 : 0.0) + 3.0 * clamp01(2 * Math.sin((x - 5.2) * 1.1)) * (x > 4.6 ? 1 : 0) + jag * 0.5;
      if (a.peaks === 'slate') return 4.8 + 2.8 * Math.exp(-(((x + 4) / 3.4) ** 2)) + 2.0 * Math.exp(-(((x - 8) / 2.6) ** 2)) + jag * 1.1;
      return 4.9 + 4.7 * Math.exp(-(((x + 4) / 2.3) ** 2)) + 3.0 * Math.exp(-(((x - 8) / 2.0) ** 2)) + jag;
    };
    const meadow = (x: number, z: number) => {
      const t = (ZF - z) / 11;
      let h = 3.0 * Math.pow(Math.max(t, 0), 1.35) + 0.24 * Math.sin(x * 0.55 + P1) * Math.cos(z * 0.5 + P2) * (0.3 + t) + 0.1 * Math.sin(x * 1.3 + z * 0.9 + P3_);
      const ds = x - streamX(z);
      h -= 0.3 * Math.exp(-((ds / 0.5) ** 2));
      return h;
    };
    const tarnAt: [number, number] = [streamX(4.5), 4.5];
    const flats: [number, number, number, number, number][] = slotsXZ.map(([x, z]) => [x, z, meadow(x, z) + 0.04, 1.25, 2.5]);
    if (a.water === 'tarn') flats.push([tarnAt[0], tarnAt[1], meadow(tarnAt[0], tarnAt[1]) - 0.02, 1.0, 1.7]);
    const height = (x: number, z: number) => {
      if (z < -5.5) {
        const v = (-5.5 - z) / 5, edge = meadow(x, -5.5), top = ridge(x);
        const rough = 0.32 * Math.sin(x * 1.9 + z * 1.3 + P4) * Math.cos(z * 2.3 + P3_);
        if (v <= 0.7) { const e = Math.pow(v / 0.7, 1.25); return mix(edge, top, e) + rough * e * (a.peaks === 'glacier' ? 0.4 : 1); }
        const d = (v - 0.7) / 0.3; return top * (1 - d * d * 0.5) + rough * (1 - d);
      }
      let h = meadow(x, z);
      for (const [fx, fz, fh, r0, r1] of flats) {
        const d = Math.hypot(x - fx, z - fz);
        if (d < r1) { const w = clamp01((r1 - d) / (r1 - r0)); h = mix(h, fh, w * w * (3 - 2 * w)); }
      }
      return h;
    };

    const stormy = a.weather === 'storm';
    const sky = { clear: '#d9e8f0', storm: '#aab3be', spill: '#d7dee2', dusting: '#e2e9ee', foehn: '#ebe5d6' }[a.weather];
    const { art: s, world } = diorama(context, {
      background: sky, floor: null, width: HW * 2, depth: ZF * 2, pitch: 26, yaw: 20, maxHeight: 3.7, radius: 1.75,
      slots: slotsXZ.map(([x, z, size]) => [x, z, height(x, z), size] as const),
    });
    const root = s.root;
    world.background.lerp(new THREE.Color('#8f98a6'), (1 - mood.cheer) * 0.18);
    for (const child of root.children) {
      const light = child as THREE.HemisphereLight;
      if (light.isHemisphereLight) light.intensity = stormy ? 0.95 : 1.2;
    }
    if (world.keyLight) world.keyLight.intensity = stormy ? 1.6 : a.weather === 'spill' ? 2.0 : 2.4;

    // Colours.
    const C = (hex: string) => new THREE.Color(hex);
    const grass = C({ bloom: '#69a136', grazed: '#7fa23e', alpenrose: '#63933a', autumn: '#b08d38' }[a.season]);
    grass.offsetHSL((0.5 - mood.warmth) * 0.035, -mood.wear * 0.12, 0).lerp(C('#a39a66'), mood.wear * 0.3);
    const grassDark = grass.clone().multiplyScalar(0.72);
    const earth = C('#8a6f50'), scree = C('#85837d');
    const rockCol = C({ horns: '#585a60', glacier: '#62666d', towers: '#ad8f62', slate: '#3a3d45' }[a.peaks]);
    const rockLite = rockCol.clone().lerp(C('#ffffff'), 0.12);
    const snowCol = C('#f6f9fc'), ice = C('#bfe0ee');
    const pathOn = a.path === 'trail' || a.path === 'mule';
    const dust = a.weather === 'dusting';
    const snowLine = { horns: 5.6, glacier: 4.9, towers: 8.4, slate: 5.9 }[a.peaks];

    // One cut block of mountain: meadow in front, wall and crest behind.
    const NX = 60, NZ = 66, depth = ZF - ZB;
    const geo = new THREE.PlaneGeometry(HW * 2, depth, NX, NZ);
    geo.rotateX(-Math.PI / 2); geo.translate(0, 0, (ZF + ZB) / 2);
    const pos = geo.attributes.position, colours = new Float32Array(pos.count * 3), tint = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
      pos.setY(i, h);
      const noise = 0.5 + 0.5 * Math.sin(x * 2.7 + P2) * Math.cos(z * 3.1 + P1), fine = 0.5 + 0.5 * Math.sin(x * 9.1 + z * 7.3 + P4);
      tint.copy(grass).lerp(grassDark, noise * 0.45).lerp(C('#c9c26a'), fine * 0.12);
      if (a.season === 'autumn' && fine * noise > 0.45) tint.lerp(C('#9a4a3a'), 0.5);
      if (mood.wear > 0.45 && z > -5.5 && fine * noise > 1.05 - mood.wear * 0.5) tint.lerp(earth, 0.6);
      if (a.path === 'tracks' && z > -7.5 && Math.sin(h * 11 + x * 0.3) > 0.82) tint.lerp(earth, 0.5);
      if (z < -5.5) {
        const v = (-5.5 - z) / 5, slopeMix = clamp01((v - 0.12) / 0.3);
        tint.lerp(scree, clamp01(slopeMix * 1.2) * (0.55 + fine * 0.45));
        tint.lerp(fine > 0.5 ? rockCol : rockLite, clamp01((v - 0.3) / 0.22));
        const streak = 0.5 + 0.5 * Math.sin(x * 3.6 + Math.sin(h * 0.9 + P3_) * 0.9 + P4);
        if (a.peaks === 'glacier') { if (h > snowLine + noise * 0.8) tint.copy(snowCol).lerp(ice, Math.sin(h * 7 + x * 1.5) > 0.86 ? 0.8 : 0.04); }
        else if (h > snowLine - 1.2 && streak > 0.76 - (h - snowLine) * 0.13) tint.copy(snowCol);
      }
      const ds = Math.abs(x - streamX(z));
      if (z > -5.5 && ds < 0.55) tint.lerp(a.water === 'dry' ? scree : C('#7d7f78'), clamp01((0.55 - ds) / 0.3));
      if (pathOn && z > -9) { const dp = Math.abs(x - pathX(z)); if (dp < 0.42) tint.lerp(earth.clone().lerp(scree, z < -5.5 ? 0.6 : 0.15), clamp01((0.42 - dp) / 0.2)); }
      if (dust && h > 1.5 + noise * 0.8) tint.lerp(snowCol, clamp01((h - 1.5 - noise * 0.8) / 1.2) * 0.92);
      colours.set([tint.r, tint.g, tint.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    terrain.receiveShadow = true; terrain.castShadow = true;
    root.add(terrain);
    world.ground = terrain;
    // Skirt: the cut sides of the block.
    {
      const edge: P3[] = [];
      const stepX = HW * 2 / NX, stepZ = depth / NZ;
      for (let i = 0; i <= NZ; i++) edge.push([HW, 0, ZF - i * stepZ]);
      for (let i = 1; i <= NX; i++) edge.push([HW - i * stepX, 0, ZB]);
      for (let i = 1; i <= NZ; i++) edge.push([-HW, 0, ZB + i * stepZ]);
      for (let i = 1; i <= NX; i++) edge.push([-HW + i * stepX, 0, ZF]);
      const sp: number[] = [], sc: number[] = [], si: number[] = [];
      const soil = C('#6d5640'), deep = C('#55504c');
      edge.forEach(([x, , z], i) => {
        const h = height(x, z);
        const topC = z < -6.5 ? rockCol.clone().multiplyScalar(0.8) : soil;
        sp.push(x, h, z, x, -0.9, z); sc.push(topC.r, topC.g, topC.b, deep.r, deep.g, deep.b);
        if (i < edge.length - 1) si.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
      });
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      sg.setIndex(si); sg.computeVertexNormals();
      root.add(new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })));
      s.box([HW * 2, 0.1, depth], [0, -0.9, (ZF + ZB) / 2], s.material('#55504c'));
    }

    // Instancing helper.
    const dummy = new THREE.Object3D();
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], shadow = true) => {
      if (!items.length) { geometry.dispose(); material.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((item, i) => {
        dummy.position.set(...item.p); dummy.rotation.set(0, item.ry ?? 0, 0);
        if (typeof item.s === 'number') dummy.scale.setScalar(item.s); else dummy.scale.set(...item.s);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        if (item.c !== undefined) mesh.setColorAt(i, tint.set(item.c));
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      root.add(mesh); return mesh;
    };
    const clearOf = (x: number, z: number, margin: number) => slotsXZ.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > margin);
    const offWater = (x: number, z: number, margin = 0.4) => Math.abs(x - streamX(z)) > margin && (a.water !== 'tarn' || Math.hypot(x - tarnAt[0], z - tarnAt[1]) > 1.25);
    const offPath = (x: number, z: number) => !pathOn || Math.abs(x - pathX(z)) > 0.45;
    const rockGeo = (seed: number) => {
      const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const r = 1 + 0.22 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.14 * Math.sin(z * 5 + seed * 2.1); p.setXYZ(i, x * r, y * r, z * r); }
      g.computeVertexNormals(); return g;
    };
    const stoneMat = () => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });

    // Boulders: bigger and thicker toward the foot of the wall.
    const boulders: Item[] = [];
    const want = Math.round(mix(5, 60, a.rocky) * (0.7 + mood.density * 0.5));
    for (let tries = 0; boulders.length < want && tries < want * 6; tries++) {
      const x = (random() - 0.5) * HW * 1.94, z = ZF - 0.3 - Math.pow(random(), 0.7) * 12.6;
      if (!clearOf(x, z, 2.0) || !offPath(x, z)) continue;
      const big = z < -3 ? 1.3 : 1, r = (0.12 + Math.pow(random(), 2.4) * 0.6) * big;
      const g = 0.36 + random() * 0.18;
      boulders.push({ p: [x, height(x, z) + r * 0.18, z], s: [r * (0.9 + random() * 0.5), r * (0.55 + random() * 0.4), r * (0.8 + random() * 0.4)], ry: random() * 6, c: new THREE.Color(g, g, g * 1.02).lerp(rockCol, 0.35) });
    }
    // Stones in and along the water.
    for (let z = ZF - 0.2; z > -5.5; z -= 0.34 + random() * 0.3) {
      const x = streamX(z) + (random() - 0.5) * 0.7, r = 0.07 + random() * 0.13, g = 0.42 + random() * 0.2;
      if (a.water === 'tarn' && Math.hypot(x - tarnAt[0], z - tarnAt[1]) < 0.95) continue;
      boulders.push({ p: [x, height(x, z) + r * 0.2, z], s: [r * 1.3, r * 0.6, r], ry: random() * 6, c: new THREE.Color(g, g, g) });
    }
    if (a.path === 'mule') for (let z = ZF - 0.2; z > -8.4; z -= 0.36) for (const side of [-1, 1]) {
      const x = pathX(z) + side * 0.46, r = 0.09 + random() * 0.04;
      if (clearOf(x, z, 1.7)) boulders.push({ p: [x, height(x, z) + 0.03, z], s: [r, r * 0.8, r * 1.5], ry: random() * 0.4, c: '#aaa79f' });
    }
    instances(rockGeo(P1), stoneMat(), boulders.filter((_b, i) => i % 2 === 0));
    instances(rockGeo(P2 + 9), stoneMat(), boulders.filter((_b, i) => i % 2 === 1));

    // Water.
    const waterMat = new THREE.MeshStandardMaterial({ color: '#8fd0e6', roughness: 0.12, metalness: 0.25, emissive: '#3f8fb0', emissiveIntensity: 0.25 });
    if (a.water !== 'dry') {
      const wp: number[] = [], wi: number[] = [];
      let n = 0;
      for (let z = ZF; z >= -5.5; z -= 0.22, n++) {
        const x = streamX(z), w = 0.11 + 0.05 * Math.sin(z * 3.1 + P3_) + (z > 3 ? 0.03 : 0);
        const y = Math.max(height(x - w, z), height(x + w, z), height(x, z)) + 0.035;
        wp.push(x - w, y, z, x + w, y, z);
        if (n > 0) wi.push((n - 1) * 2, (n - 1) * 2 + 1, n * 2, n * 2, (n - 1) * 2 + 1, n * 2 + 1);
      }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals();
      const ribbon = new THREE.Mesh(wg, waterMat); waterMat.side = THREE.DoubleSide; ribbon.receiveShadow = true; root.add(ribbon);
      // A little fall over the front lip of the block.
      const lipX = streamX(ZF), lipY = height(lipX, ZF);
      s.box([0.26, lipY + 0.8, 0.03], [lipX, (lipY - 0.8) / 2 + 0.02, ZF + 0.02], new THREE.MeshStandardMaterial({ color: '#dff2f8', roughness: 0.2, emissive: '#9fd6ea', emissiveIntensity: 0.3 }));
      if (a.water === 'tarn') {
        const pond = s.cylinder(1.02, 1.02, 0.03, [tarnAt[0], height(tarnAt[0], tarnAt[1]) + 0.045, tarnAt[1]], waterMat, 28);
        pond.scale.z = 0.8; pond.castShadow = false;
      }
    }

    // Grass tufts and flowers.
    const tufts: Item[] = [], blooms: Item[] = [], bushes: Item[] = [];
    const palette = { bloom: ['#2c4fd6', '#f4d13a', '#ffffff', '#e56aa6', '#2c4fd6', '#f4d13a'], grazed: ['#ffffff', '#f4d13a', '#d8d2a0'], alpenrose: ['#e0457f', '#f06a9a', '#ffffff'], autumn: ['#9a5a8a', '#c9772a', '#e6d08a'] }[a.season]
      .map((hex) => C(hex).lerp(C('#b9b3a4'), (1 - mood.cheer) * 0.35));
    const onMeadow = (): [number, number] => [(random() - 0.5) * HW * 1.96, ZF - 0.15 - random() * (dust ? 9 : 11.6)];
    for (let i = 0; i < 520; i++) {
      const [x, z] = onMeadow(); if (!offWater(x, z, 0.25) || !offPath(x, z) || z < -7.2) continue;
      tufts.push({ p: [x, height(x, z) + 0.07, z], s: [1, 0.6 + random() * 1.1, 1], ry: random() * 6, c: grass.clone().multiplyScalar(0.62 + random() * 0.5) });
    }
    const flowerN = Math.round({ bloom: 950, grazed: 170, alpenrose: 320, autumn: 260 }[a.season] * mix(0.45, 1.25, mood.density) * (dust ? 0.4 : 1));
    for (let i = 0; i < flowerN; i++) {
      // Flowers come in drifts, not evenly.
      let [x, z] = onMeadow();
      if (i % 4 && blooms.length) { const near = blooms[Math.floor(random() * blooms.length)].p; x = near[0] + (random() - 0.5) * 1.3; z = near[2] + (random() - 0.5) * 1.3; }
      if (Math.abs(x) > HW - 0.1 || z > ZF - 0.1 || z < -6.8 || !offWater(x, z, 0.2) || !offPath(x, z)) continue;
      blooms.push({ p: [x, height(x, z) + 0.1 + random() * 0.06, z], s: 0.045 + random() * 0.04, c: palette[Math.floor(random() * palette.length)] });
    }
    if (a.season === 'alpenrose') for (let i = 0; i < 46 + mood.density * 40; i++) {
      const [x, z] = onMeadow(); if (!clearOf(x, z, 2.0) || !offWater(x, z, 0.6) || !offPath(x, z) || z < -6.5) continue;
      const r = 0.22 + random() * 0.3;
      bushes.push({ p: [x, height(x, z) + r * 0.25, z], s: [r * 1.3, r * 0.7, r * 1.1], ry: random() * 6, c: '#2f5d3a' });
      for (let k = 0; k < 9; k++) { const ang = random() * 6.3, rr = random() * r; blooms.push({ p: [x + Math.cos(ang) * rr * 1.2, height(x, z) + r * 0.75 + random() * 0.08, z + Math.sin(ang) * rr], s: 0.05 + random() * 0.035, c: palette[k % 2] }); }
    }
    instances(new THREE.ConeGeometry(0.05, 0.2, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts, false);
    instances(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), blooms, false);
    instances(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), bushes);
    if (a.water !== 'dry') {
      // Cotton grass along the wet edge.
      const cotton: Item[] = [];
      for (let i = 0; i < 40; i++) { const z = ZF - random() * 10.5, x = streamX(z) + (random() < 0.5 ? -1 : 1) * (0.3 + random() * 0.3); cotton.push({ p: [x, height(x, z) + 0.2, z], s: 0.04 + random() * 0.02, c: '#fbfbf4' }); }
      instances(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), cotton, false);
    }

    // The way up.
    const woodMat = s.material('#7b6248', { roughness: 0.95 });
    if (a.path === 'trail') {
      const sz = 4.6, sx = pathX(sz) + 0.62, sy = height(sx, sz);
      s.cylinder(0.035, 0.04, 1.5, [sx, sy + 0.75, sz], s.material('#8d9296', { metalness: 0.6, roughness: 0.4 }), 8);
      const yellow = s.material('#f2c61e', { roughness: 0.6 });
      for (const [i, dir] of ([[0, -0.5], [1, 2.4], [2, -0.9]] as const)) {
        const blade = s.box([0.62, 0.13, 0.02], [sx + Math.cos(dir) * 0.3, sy + 1.4 - i * 0.17, sz - Math.sin(dir) * 0.3], yellow); blade.rotation.y = dir;
        const tip = s.box([0.1, 0.13, 0.022], [sx + Math.cos(dir) * 0.57, sy + 1.4 - i * 0.17, sz - Math.sin(dir) * 0.57], s.material(i === 1 ? '#ffffff' : '#d3231f')); tip.rotation.y = dir;
      }
    }
    if (pathOn) {
      // A cairn on the saddle and painted waymarks on the way.
      const cz = -9.0, cx = pathX(cz), stoneM = s.material('#8f8d88', { roughness: 0.95, flatShading: true });
      let y = height(cx, cz) - 0.05;
      for (let i = 0; i < 5; i++) { const r = 0.34 - i * 0.055; const m = s.mesh(rockGeo(i * 3 + P4), stoneM, [cx + (random() - 0.5) * 0.05, y + r * 0.45, cz]); m.scale.set(r, r * 0.55, r * 0.9); m.rotation.y = random() * 6; y += r * 0.8; }
      for (const z of [2.6, -0.6, -3.9, -6.6]) {
        const x = pathX(z) - 0.6; if (!clearOf(x, z, 1.7)) continue;
        const h = height(x, z);
        const m = s.mesh(rockGeo(z + P1), stoneM, [x, h + 0.08, z]); m.scale.set(0.24, 0.2, 0.2);
        s.box([0.2, 0.1, 0.015], [x + 0.02, h + 0.14, z + 0.2], s.material('#f4f2ea')).rotation.x = -0.35;
        s.box([0.2, 0.034, 0.017], [x + 0.02, h + 0.14, z + 0.202], s.material('#d3231f')).rotation.x = -0.35;
      }
    }

    // What else marks the slope.
    const drifting: THREE.Mesh[] = [];
    if (a.slope === 'fence') {
      const fz = (x: number) => -2.75 + 0.2 * Math.sin(x * 0.5 + P2);
      const posts: Item[] = [], wires: P3[][] = [[], []];
      let run: P3[] = [];
      const flush = () => { for (let i = 0; i < run.length - 1; i++) for (const lift of [0.3, 0.52]) { const p0 = run[i], p1 = run[i + 1]; s.rod([p0[0], p0[1] + lift, p0[2]], [p1[0], p1[1] + lift, p1[2]], 0.008, s.material(lift > 0.4 ? '#e9e4d2' : '#6b6e72')); } run = []; };
      for (let x = -HW + 0.3; x <= HW - 0.2; x += 0.95) {
        const z = fz(x);
        if (!clearOf(x, z, 1.75) || Math.abs(x - pathX(z)) < 0.55 || Math.abs(x - streamX(z)) < 0.3) { flush(); continue; }
        const y = height(x, z);
        posts.push({ p: [x, y + 0.3, z], s: [1, 1 + (random() - 0.5) * 0.2, 1], ry: random() });
        run.push([x, y, z]);
      }
      flush(); void wires;
      instances(new THREE.BoxGeometry(0.07, 0.72, 0.07), woodMat, posts);
    } else if (a.slope === 'herd') {
      const bodies: Item[] = [], heads: Item[] = [], legs: Item[] = [];
      const n = 5 + Math.round(mood.density * 7);
      for (let tries = 0; bodies.length < n && tries < 80; tries++) {
        const x = (random() - 0.5) * HW * 1.8, z = -2.4 - random() * 4.6;
        if (!clearOf(x, z, 2.1) || !offWater(x, z, 0.5)) continue;
        const y = height(x, z), ry = random() * 6, c = random() < 0.25 ? '#3a2a22' : random() < 0.5 ? '#9a6a42' : '#7d6048';
        const dx = Math.cos(ry), dz = -Math.sin(ry), graze = random() < 0.6;
        bodies.push({ p: [x, y + 0.36, z], s: [0.62, 0.3, 0.26], ry, c });
        legs.push({ p: [x, y + 0.12, z], s: [0.5, 0.24, 0.2], ry, c: '#3a2e26' });
        heads.push({ p: [x + dx * 0.38, y + (graze ? 0.16 : 0.48), z + dz * 0.38], s: [0.2, 0.17, 0.15], ry, c: '#d9cbb4' });
      }
      const coat = () => new THREE.MeshStandardMaterial({ roughness: 0.9 });
      instances(new THREE.BoxGeometry(1, 1, 1), coat(), bodies); instances(new THREE.BoxGeometry(1, 1, 1), coat(), heads);
      const lg = new THREE.BoxGeometry(1, 1, 1, 3, 1, 1); instances(lg, coat(), legs);
    } else if (a.slope === 'snowpatch') {
      const sx = -5.3, sz = -4.3;
      for (let i = 0; i < 9; i++) { const x = sx + (random() - 0.5) * 2.6, z = sz + (random() - 0.5) * 1.6; s.ball([0.7 + random() * 0.6, 0.1 + random() * 0.06, 0.5 + random() * 0.4], [x, height(x, z) + 0.02, z], s.material(i % 3 ? '#f4f7fa' : '#d9d6cc', { roughness: 0.7 }), 10); }
    } else if (a.slope === 'hay') {
      const hay: Item[] = [];
      for (let row = 0; row < 4; row++) for (let x = -1.5; x < 2.0; x += 0.2) { const z = 4.0 + row * 0.42 + Math.sin(x * 1.5 + row) * 0.06; if (!offPath(x, z)) continue; hay.push({ p: [x, height(x, z) + 0.05, z], s: [0.17, 0.07 + random() * 0.05, 0.12], ry: random(), c: random() < 0.5 ? '#d9c25a' : '#c9b04a' }); }
      instances(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), hay);
      const rx = -0.9, rz = 3.75, ry = height(rx, rz);
      for (let i = 0; i < 3; i++) { const ang = i * 2.094; s.rod([rx + Math.cos(ang) * 0.4, ry, rz + Math.sin(ang) * 0.4], [rx, ry + 1.1, rz], 0.025, woodMat); }
      s.ball([0.42, 0.5, 0.42], [rx, ry + 0.55, rz], s.material('#d2b84e', { roughness: 1 }), 10);
    }

    // Weather in the air. Clouds are soft and unmeasured so they never widen the frame.
    const cloud = (colour: string, opacity: number) => new THREE.MeshStandardMaterial({ color: colour, roughness: 1, transparent: true, opacity, depthWrite: false });
    const puff = (at: P3, size: P3, material: THREE.Material) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material); m.position.set(...at); m.scale.set(...size); root.add(m); drifting.push(m); return m; };
    if (stormy) {
      const darkM = cloud('#5b626d', 0.93), midM = cloud('#8a919b', 0.9);
      let crest = 0; for (let x = -HW; x <= HW; x += 0.5) crest = Math.max(crest, ridge(x));
      for (let i = 0; i < 18; i++) { const r = 0.9 + random() * 0.9; puff([-7.5 + random() * 13, crest - 3.0 + random() * 1.8, -10.4 - random() * 1.2], [r * 1.6, r * 0.8, r], i % 3 ? darkM : midM); }
    } else if (a.weather === 'spill') {
      const white = cloud('#f0f2f4', 0.96);
      for (let i = 0; i < 34; i++) { const t = Math.pow(random(), 2.1), z = mix(-10, -3.8, t), x = pathX(-9) - 0.3 + (random() - 0.5) * mix(4.2, 6.5, t), r = mix(1.25, 0.5, t) * (0.75 + random() * 0.5); puff([x, height(clamp(x), z) + r * 0.5, z], [r * 1.35, r * 0.9, r * 1.1], white); }
    } else if (a.weather === 'foehn') {
      const white = cloud('#f6f3ea', 0.92);
      for (let i = 0; i < 3; i++) puff([-4 + i * 4.2 + random(), 7.6 + i * 0.4, -9.5 - i * 0.6], [2.6 - i * 0.4, 0.34, 1.2], white);
    } else if (a.weather === 'clear' && mood.cheer > 0.3) {
      const white = cloud('#fbfcfd', 0.9);
      for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) puff([5.2 - i * 9 + k * 0.7, 8.6 + i * 0.4 + (k === 1 ? 0.25 : 0), -10.5], [0.75, 0.5, 0.6], white);
    }
    function clamp(x: number) { return Math.max(-HW, Math.min(HW, x)); }

    const homes = drifting.map((m) => m.position.x);
    const energy = mix(0.1, 1.2, mood.energy);
    world.update = (_dt, time) => {
      drifting.forEach((m, i) => { m.position.x = homes[i] + Math.sin(time * 0.25 * energy + i * 1.7) * 0.5 * energy; });
      waterMat.emissiveIntensity = 0.25 + Math.sin(time * 3 * energy) * 0.08;
    };
    return world;
  },
});
