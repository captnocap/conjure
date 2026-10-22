import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

const W = 15, D = 12;
const SLOTS: [number, number, number?, number?][] = [[0, 0.5], [-3.5, 1.9, 0, 0.8], [3.6, -0.7, 0, 0.8], [-2.0, -2.3, 0, 0.75], [2.7, 3.1, 0, 0.7], [-4.9, -0.3, 0, 0.7]];
const YAW = 27, PITCH = 27;

const FLORA = {
  emerald: { say: 'Emerald and teal leaves with scarlet and orange fungus caps.', leaf: ['#2f9a6a', '#3fb87a', '#1f7f6a'], trunk: '#5a3f6a', cap: ['#e8452e', '#f08a2a'], spot: '#fff2d0' },
  lurid: { say: 'Hot pink and orange foliage with yellow and lime caps: nothing here is green.', leaf: ['#e8408a', '#f0722a', '#c82a6a'], trunk: '#3f2a5a', cap: ['#f2d21e', '#7ae04a'], spot: '#ffffff' },
  azure: { say: 'Blue and indigo leaves with lilac and pink caps, cool and dreamlike.', leaf: ['#2a7fd0', '#4fb0e0', '#6a5ad0'], trunk: '#2f3a6a', cap: ['#b06af0', '#f06ac8'], spot: '#d8f0ff' },
  acid: { say: 'Acid yellow-green fronds with blood-red caps, feverish.', leaf: ['#a8d82a', '#d8e03a', '#6ab82a'], trunk: '#6a4a2a', cap: ['#e8632a', '#c82a3a'], spot: '#fff8c0' },
} as const;
const STRIPES = {
  crescent: 'A fat striped crescent, horns up, the classic cover.',
  half: 'Half lit, every candy stripe visible.',
  sliver: 'A huge thin sliver of light round a ghostly dark disc.',
  ringed: 'A striped crescent wearing a tilted ring.',
  full: 'Full and round, a great striped ball filling the sky.',
} as const;

function taperTube(curve: THREE.Curve<THREE.Vector3>, segments: number, r0: number, r1: number, sides = 7) {
  const frames = curve.computeFrenetFrames(segments, false);
  const position: number[] = [], index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, c = curve.getPointAt(t), r = mix(r0, r1, t);
    for (let j = 0; j <= sides; j++) { const a = j / sides * Math.PI * 2, n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a)); position.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); }
    if (i) for (let j = 0; j < sides; j++) { const a = (i - 1) * (sides + 1) + j, b = a + sides + 1; index.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index); geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    sky: choice('What is the teal sky like?', {
      teal: 'Clear bright teal, high noon on a holiday planet.',
      mint: 'Pale mint, a hazy humid morning.',
      turquoise: 'Deep saturated turquoise, heavy and tropical.',
      apricot: 'Teal washed with apricot, the long double dusk.',
    }),
    giant: choice('How does the striped giant hang in the sky?', STRIPES),
    suns: choice('Where are the two suns?', {
      high: 'High and small, close together, hard noon light.',
      low: 'Large and low over the treetops, side by side.',
      split: 'One on each side of the giant.',
      eclipse: 'One half hidden behind the giant\'s edge, the other free.',
    }),
    jungle: choice('What is the jungle mostly made of?', {
      fronds: 'Giant fronds and palms, arching over the clearing.',
      fungus: 'Fungus trees: tall stalks with spotted caps like parasols.',
      mixed: 'Both together, fronds below and fungus trees towering above.',
      coils: 'Curling fiddlehead spirals and bulb plants, like a sea floor on land.',
    }),
    flora: choice('What colours is the jungle?', Object.fromEntries(Object.entries(FLORA).map(([k, f]) => [k, f.say])) as Record<keyof typeof FLORA, string>),
    circle: choice('What state is the landing circle in?', {
      fresh: 'Freshly scorched black, embers at the rim, smoke rising.',
      glassy: 'Fused to dark glass, cracked, long cold.',
      marked: 'Scorched and ringed with little landing beacons.',
      overgrown: 'Old: the burn has faded and seedlings are coming up through it.',
    }),
    lurking: choice('What is watching from the trees?', {
      nothing: 'Nothing. It is perfectly peaceful.',
      eyes: 'Pairs of glowing eyes low in the undergrowth.',
      tentacle: 'A great tentacle feeling its way out of the jungle toward the clearing.',
      flyers: 'Leather-winged flyers circling overhead.',
      idol: 'A huge stone head with three eyes, half swallowed by leaves.',
      smoke: 'Columns of signal smoke rising from deeper in the jungle.',
    }),
    before: choice('Who was here before?', {
      nobody: 'Nobody: this is the first landing.',
      camp: 'An expedition: a planted flag and a stack of supply crates.',
      ruins: 'Somebody ancient: broken pillars at the clearing\'s edge.',
      bones: 'Something enormous: the ribs of a giant skeleton arch out of the soil.',
      wreck: 'An earlier ship: one rusted tailfin sticking up out of the ground.',
    }),
    soil: choice('What is the violet ground like?', {
      loam: 'Soft violet loam with darker patches.',
      sand: 'Pale lavender sand, rippled.',
      mud: 'Deep purple mud with shining puddles.',
      crystal: 'Violet grit studded with small glowing crystals.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const flora = FLORA[a.flora];
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const skyColour = new THREE.Color({ teal: '#8fd9cf', mint: '#c2ecd9', turquoise: '#58bdb6', apricot: '#b5dcc0' }[a.sky]).lerp(new THREE.Color('#f0c79a'), dusk * (a.sky === 'apricot' ? 0.22 : 0.08));
    const soilColour = new THREE.Color({ loam: '#8a62b0', sand: '#b79ad6', mud: '#6f4a96', crystal: '#7f5aa8' }[a.soil]);
    const { art: s, world } = diorama(context, { background: `#${skyColour.getHexString()}`, floor: `#${soilColour.getHexString()}`, width: W, depth: D, maxHeight: 4.6, radius: 2.0, pitch: PITCH, yaw: YAW, slots: SLOTS });
    const clearOf = (x: number, z: number, margin: number) => SLOTS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > margin);
    const flat = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, z: number, y = 0.01, turn = 0) => { const m = s.mesh(geometry, material, [x, y, z]); m.rotation.set(-Math.PI / 2, 0, turn); m.castShadow = false; return m; };
    const lush = mix(0.75, 1.1, mood.cheer);
    const leafMats = flora.leaf.map((c) => s.material(new THREE.Color(c).lerp(new THREE.Color('#8a7a4a'), mood.wear * 0.35).multiplyScalar(lush), { roughness: 0.65, side: THREE.DoubleSide }));
    const trunkMat = s.material(flora.trunk, { roughness: 0.9 });
    const capMats = flora.cap.map((c) => s.material(c, { roughness: 0.5, emissive: c, emissiveIntensity: mix(0.25, 0.08, mood.cheer) + dusk * 0.15, side: THREE.DoubleSide }));
    const spotMat = s.material(flora.spot, { roughness: 0.6, emissive: flora.spot, emissiveIntensity: 0.3 });
    const pale = s.material(new THREE.Color(flora.trunk).lerp(new THREE.Color('#f0e6d8'), 0.6), { roughness: 0.8, side: THREE.DoubleSide });

    // ---- Ground ----
    const dark = new THREE.MeshStandardMaterial({ color: soilColour.clone().multiplyScalar(0.72), roughness: 1 });
    const light = new THREE.MeshStandardMaterial({ color: soilColour.clone().lerp(new THREE.Color('#ffffff'), 0.22), roughness: 1 });
    for (let i = 0; i < 26; i++) {
      const x = (random() - 0.5) * (W - 1), z = (random() - 0.5) * (D - 1), r = 0.4 + random() * 1.0;
      if (a.soil === 'sand') { const ripple = flat(new THREE.PlaneGeometry(1.4 + random() * 2, 0.07), i % 2 ? dark : light, x, z, 0.006, 0.3 + (random() - 0.5) * 0.3); void ripple; }
      else flat(new THREE.CircleGeometry(r, 12), i % 3 ? dark : light, x, z, 0.004 + i * 0.0001).scale.set(1, 0.55 + random() * 0.4, 1);
    }
    const twinkle: THREE.MeshStandardMaterial[] = [];
    if (a.soil === 'mud') { const water = new THREE.MeshStandardMaterial({ color: skyColour.clone().lerp(new THREE.Color('#ffffff'), 0.3), roughness: 0.05, metalness: 0.2 }); for (let i = 0; i < 9; i++) { const x = (random() - 0.5) * (W - 2), z = (random() - 0.5) * (D - 2); flat(new THREE.CircleGeometry(0.3 + random() * 0.55, 14), water, x, z, 0.012).scale.set(1, 0.6, 1); } }
    if (a.soil === 'crystal') for (let k = 0; k < 3; k++) {
      const hue = new THREE.Color().setHSL(0.78 + k * 0.08, 0.8, 0.7), mat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 1, roughness: 0.2, flatShading: true }); twinkle.push(mat);
      const pts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 22; i++) { const x = (random() - 0.5) * (W - 1), z = (random() - 0.5) * (D - 1); if (clearOf(x, z, 1.3)) pts.push({ at: [x, 0.08, z], size: 0.07 + random() * 0.14 }); }
      s.scatter(new THREE.OctahedronGeometry(1, 0), mat, pts);
    }
    const stone = s.material(soilColour.clone().multiplyScalar(0.8), { roughness: 1, flatShading: true });
    const rocks: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 34; i++) { const x = (random() - 0.5) * (W - 0.6), z = (random() - 0.5) * (D - 0.6), size = 0.08 + random() * random() * 0.5; if (clearOf(x, z, 1.6 + size)) rocks.push({ at: [x, size * 0.4, z], size }); }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), stone, rocks);

    // ---- The landing circle ----
    const CX = 0, CZ = 0.4, CR = 4.3;
    const faded = a.circle === 'overgrown' ? 0.55 : 0;
    const burnt = new THREE.MeshStandardMaterial({ color: new THREE.Color(a.circle === 'glassy' ? '#231c33' : '#2a1f2c').lerp(soilColour, faded), roughness: a.circle === 'glassy' ? 0.12 : 1, metalness: a.circle === 'glassy' ? 0.3 : 0 });
    const ash = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5a4a62').lerp(soilColour, faded * 0.8), roughness: 1 });
    flat(new THREE.RingGeometry(CR * 0.52, CR, 56), burnt, CX, CZ, 0.016);
    flat(new THREE.CircleGeometry(CR * 0.52, 40), ash, CX, CZ, 0.017);
    flat(new THREE.RingGeometry(CR * 0.2, CR * 0.26, 40), burnt, CX, CZ, 0.019);
    for (let i = 0; i < 30; i++) {
      const t = i / 30 * Math.PI * 2 + random() * 0.15, len = 0.5 + random() * 1.3 * (1 + mood.wear * 0.4), r = CR + len / 2 - 0.1;
      const streak = flat(new THREE.PlaneGeometry(0.12 + random() * 0.3, len), burnt, CX + Math.sin(t) * r, CZ - Math.cos(t) * r, 0.015, -t); void streak;
    }
    const ember = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a1a', emissiveIntensity: 1.8 });
    const puffs: THREE.Mesh[] = [];
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#f4eef2', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
    const addSmoke = (x: number, z: number, count: number, rise: number, size: number) => { for (let i = 0; i < count; i++) { const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat); puff.userData = { x, z, phase: random(), drift: random() * 6, rise, size: size * (0.6 + random() * 0.7) }; s.root.add(puff); puffs.push(puff); } };
    const beaconMats: THREE.MeshStandardMaterial[] = [];
    if (a.circle === 'fresh') {
      const bits: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 46; i++) { const t = random() * Math.PI * 2, r = CR * (0.9 + random() * 0.14); bits.push({ at: [CX + Math.sin(t) * r, 0.03, CZ + Math.cos(t) * r], size: 0.03 + random() * 0.06 }); }
      s.scatter(new THREE.OctahedronGeometry(1, 0), ember, bits).castShadow = false;
      for (let i = 0; i < 6; i++) { const t = random() * Math.PI * 2; addSmoke(CX + Math.sin(t) * CR * 0.95, CZ + Math.cos(t) * CR * 0.95, 3, 2.6, 0.3); }
    }
    if (a.circle === 'glassy') {
      const crack = new THREE.LineBasicMaterial({ color: '#b9a6e8' }), segs: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++) { let t = random() * Math.PI * 2, r = CR * 0.55; let p = new THREE.Vector3(CX + Math.sin(t) * r, 0.024, CZ + Math.cos(t) * r); for (let k = 0; k < 4; k++) { t += (random() - 0.5) * 0.5; r += 0.4; const q = new THREE.Vector3(CX + Math.sin(t) * r, 0.024, CZ + Math.cos(t) * r); if (r < CR) segs.push(p, q); p = q; } }
      s.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), crack));
    }
    if (a.circle === 'marked') {
      const post = s.material('#d8d2c8', { metalness: 0.3, roughness: 0.4 });
      for (let i = 0; i < 10; i++) {
        const t = (i + 0.5) / 10 * Math.PI * 2, x = CX + Math.sin(t) * (CR + 0.25), z = CZ + Math.cos(t) * (CR + 0.25);
        if (!clearOf(x, z, 1.2)) continue;
        const hue = i % 2 ? '#ff4a3a' : '#ffe14a', mat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 1.6 }); beaconMats.push(mat);
        s.cylinder(0.05, 0.09, 0.42, [x, 0.21, z], post, 8); s.ball([0.11, 0.11, 0.11], [x, 0.5, z], mat, 10);
        s.cylinder(0.16, 0.2, 0.05, [x, 0.025, z], post, 10);
      }
    }
    if (a.circle === 'overgrown') {
      const shoots: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 70; i++) { const t = random() * Math.PI * 2, r = Math.sqrt(random()) * CR, x = CX + Math.sin(t) * r, z = CZ + Math.cos(t) * r; if (clearOf(x, z, 1.1)) shoots.push({ at: [x, 0.12, z], size: 0.5 + random() * 0.9 }); }
      s.scatter(new THREE.ConeGeometry(0.06, 0.3, 5), leafMats[1], shoots);
    }

    // ---- Jungle ----
    const sway: { g: THREE.Group; phase: number; amp: number }[] = [];
    const plantAt = (x: number, z: number, amp: number) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = random() * Math.PI * 2; s.root.add(g); sway.push({ g, phase: random() * 6, amp }); return g; };
    const solid = (g: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) => { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const blade = (len: number, width: number, droop: number) => {
      const geo = new THREE.PlaneGeometry(len, width, 7, 2), p = geo.attributes.position;
      for (let j = 0; j < p.count; j++) { const u = Math.min(1, Math.max(0, p.getX(j) / len + 0.5)), v = p.getY(j) / width; p.setXYZ(j, u * len, v * width * (Math.sin(Math.pow(u, 0.55) * Math.PI) + 0.08), Math.sin(u * 1.6) * 0.32 * len - u * u * len * droop - Math.abs(v) * width * 0.5); }
      geo.rotateX(-Math.PI / 2);
      return geo;
    };
    const crown = (top: THREE.Vector3, blades: number, len: number, droop: number) => {
      const parts: THREE.BufferGeometry[] = [];
      for (let k = 0; k < blades; k++) { const geo = blade(len * (0.8 + random() * 0.4), len * 0.3, droop + random() * 0.2); geo.rotateY(k / blades * Math.PI * 2 + random() * 0.4); geo.translate(top.x, top.y, top.z); parts.push(geo); }
      const merged = mergeGeometries(parts); merged.computeVertexNormals();
      return merged;
    };
    const frondTree = (x: number, z: number, h: number) => {
      const g = plantAt(x, z, 1), lean = (random() - 0.5) * h * 0.25, top = new THREE.Vector3(lean, h, (random() - 0.5) * 0.3);
      solid(g, taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(lean * 0.2, h * 0.5, 0.15), top]), 10, 0.1 + h * 0.022, 0.06 + h * 0.008), trunkMat);
      solid(g, crown(top, 7 + Math.floor(random() * 3), 1.1 + h * 0.3, 0.55 + mood.wear * 0.3), leafMats[Math.floor(random() * 3)]);
      if (h > 3 && random() < 0.6) { const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), capMats[0]); nuts.position.copy(top).add(new THREE.Vector3(0.12, -0.28, 0.1)); nuts.castShadow = true; g.add(nuts); }
    };
    const fungusTree = (x: number, z: number, h: number) => {
      const g = plantAt(x, z, 0.5), lean = (random() - 0.5) * h * 0.14, r = 0.5 + h * 0.13 + random() * 0.3;
      const top = new THREE.Vector3(lean, h, 0);
      solid(g, taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(lean * 0.7, h * 0.5, 0), top]), 10, 0.14 + h * 0.03, 0.09 + h * 0.014, 9), pale);
      const style = random(), dome = style < 0.5 ? 0.55 : style < 0.8 ? 0.28 : 0.95;
      const profile: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; profile.push(new THREE.Vector2(Math.max(0.001, Math.sin(t * Math.PI / 2) * r), Math.cos(t * Math.PI / 2) * r * dome)); }
      profile.push(new THREE.Vector2(r * 0.9, -r * 0.06), new THREE.Vector2(0.12, r * 0.08));
      const capMat = capMats[Math.floor(random() * 2)];
      const cap = solid(g, new THREE.LatheGeometry(profile, 20), capMat); cap.position.set(top.x, top.y - r * 0.05, top.z); cap.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
      const gills = solid(g, new THREE.CylinderGeometry(r * 0.88, 0.12, r * 0.14, 18, 1, true), pale); gills.position.set(top.x, top.y - r * 0.05 + r * 0.01, top.z); gills.rotation.copy(cap.rotation);
      const dots: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) { const t = random() * Math.PI * 2, u = 0.25 + random() * 0.65, rr = Math.sin(u * Math.PI / 2) * r, y = Math.cos(u * Math.PI / 2) * r * dome, size = r * (0.06 + random() * 0.07); const dot = new THREE.SphereGeometry(size, 7, 5); dot.scale(1, 0.4, 1); dot.translate(Math.sin(t) * rr, y, Math.cos(t) * rr); dots.push(dot); }
      const spots = solid(g, mergeGeometries(dots), spotMat); spots.position.copy(cap.position); spots.rotation.copy(cap.rotation);
      const skirt = solid(g, new THREE.TorusGeometry(0.16 + h * 0.03, 0.035, 6, 14), pale); skirt.rotation.x = Math.PI / 2; skirt.position.set(lean * 0.75, h * 0.62, 0);
    };
    const coil = (x: number, z: number, h: number) => {
      const g = plantAt(x, z, 1.2), pts: THREE.Vector3[] = [new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.05, h * 0.5, 0)], c = h * 0.22;
      for (let k = 0; k <= 12; k++) { const phi = Math.PI - k * 0.6, rho = c * (1 - k / 15); pts.push(new THREE.Vector3(c + Math.cos(phi) * rho, h + Math.sin(phi) * rho, 0)); }
      solid(g, taperTube(new THREE.CatmullRomCurve3(pts), 44, 0.08 + h * 0.03, 0.03, 7), leafMats[Math.floor(random() * 3)]);
      const fuzz: THREE.BufferGeometry[] = [];
      for (let i = 2; i < 9; i++) for (const side of [-1, 1]) { const geo = blade(0.5 + h * 0.08, 0.16, 0.4); geo.rotateY(side * Math.PI / 2); geo.translate(0.05, h * 0.1 * i * 0.55, 0); fuzz.push(geo); }
      const m = mergeGeometries(fuzz); m.computeVertexNormals(); solid(g, m, leafMats[0]);
    };
    const bulb = (x: number, z: number, size: number) => {
      const g = plantAt(x, z, 0.3);
      for (let i = 0; i < 3; i++) { const r = size * (0.6 + random() * 0.5), b = solid(g, new THREE.SphereGeometry(r, 12, 8), capMats[i % 2]); b.position.set((random() - 0.5) * size * 1.2, r * 0.8, (random() - 0.5) * size * 1.2); b.scale.y = 1.25; const tip = solid(g, new THREE.ConeGeometry(r * 0.3, r * 0.7, 6), spotMat); tip.position.copy(b.position).add(new THREE.Vector3(0, r * 1.3, 0)); }
    };
    const shrub = (x: number, z: number, size: number) => {
      const g = plantAt(x, z, 1.4);
      solid(g, crown(new THREE.Vector3(0, size * 0.15, 0), 6 + Math.floor(random() * 3), size, 0.25), leafMats[Math.floor(random() * 3)]);
    };
    const big = (x: number, z: number, h: number) => {
      const pick = random();
      if (!clearOf(x, z, 2.3) || Math.hypot(x - CX, z - CZ) < CR + 0.9) return;
      if (a.jungle === 'fronds') (pick < 0.85 ? frondTree : fungusTree)(x, z, h);
      else if (a.jungle === 'fungus') (pick < 0.82 ? fungusTree : frondTree)(x, z, h * (pick < 0.82 ? 1 : 0.7));
      else if (a.jungle === 'mixed') (pick < 0.5 ? frondTree : fungusTree)(x, z, h * (pick < 0.5 ? 0.75 : 1.1));
      else (pick < 0.6 ? coil : pick < 0.8 ? fungusTree : frondTree)(x, z, h * (pick < 0.6 ? 0.8 : 1));
    };
    const thick = mix(0.7, 1.25, mood.density);
    // Back wall and left wall: the tall growth the sky bodies rise behind.
    for (let i = 0; i < Math.round(15 * thick); i++) { const x = -W / 2 + 0.5 + (i + random()) / (15 * thick) * (W - 1), row = random(); big(x, -D / 2 + 0.45 + row * 1.5, mix(6.4, 3.4, row) * (0.8 + random() * 0.4)); }
    for (let i = 0; i < Math.round(10 * thick); i++) { const z = -D / 2 + 1.5 + (i + random()) / (10 * thick) * (D - 3.5), row = random(); big(-W / 2 + 0.45 + row * 1.1, z, mix(5.6, 3.0, row) * (0.8 + random() * 0.4) * mix(1, 0.6, (z + D / 2) / D)); }
    for (let i = 0; i < Math.round(4 * thick); i++) big(W / 2 - 0.5 - random() * 1.2, -D / 2 + 1 + random() * 3.2, 2.6 + random() * 2);
    // Middle storey and the low growth pressing in from the near edges.
    const edge = (count: number, make: (x: number, z: number) => void) => { for (let i = 0; i < count; i++) { const side = Math.floor(random() * 4), u = random(), inset = 0.35 + random() * 1.6; const x = side === 0 ? -W / 2 + inset + 1 : side === 1 ? W / 2 - inset * 0.6 : (u - 0.5) * (W - 1), z = side === 2 ? -D / 2 + inset + 1.4 : side === 3 ? D / 2 - inset * 0.6 : (u - 0.5) * (D - 1); if (clearOf(x, z, 2.3) && Math.hypot(x - CX, z - CZ) > CR + 0.5) make(x, z); } };
    edge(Math.round(26 * thick), (x, z) => shrub(x, z, 0.7 + random() * 0.8));
    edge(Math.round(9 * thick), (x, z) => (a.jungle === 'fronds' ? shrub(x, z, 1.1) : bulb(x, z, 0.22 + random() * 0.2)));
    if (a.jungle === 'coils' || a.jungle === 'mixed') edge(Math.round(7 * thick), (x, z) => (z < 1 ? coil(x, z, 1.2 + random() * 1.4) : shrub(x, z, 0.8)));
    edge(Math.round(8 * thick), (x, z) => { if (z < 2 || x < -3) fungusTree(x, z, 0.5 + random() * 0.9); });
    // Lianas slung along the back wall.
    for (let i = 0; i < Math.round(4 * thick); i++) {
      const x0 = -W / 2 + 1 + random() * (W - 5), span = 2 + random() * 2.5, y = 3 + random() * 1.6, z = -D / 2 + 1.2 + random();
      s.mesh(taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(x0, y + 0.8, z), new THREE.Vector3(x0 + span / 2, y - 0.9, z + 0.3), new THREE.Vector3(x0 + span, y + 0.6, z)]), 16, 0.04, 0.04, 5), leafMats[2]);
    }

    // ---- Sky bodies stand on a wall facing the camera, far behind the trees ----
    const yaw = YAW * Math.PI / 180, pitch = PITCH * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), up = new THREE.Vector3().crossVectors(dir, right).negate().normalize();
    if (up.y < 0) up.negate();
    const sky = new THREE.Group(); s.root.add(sky);
    const skyAt = (ax: number, by: number, depth: number) => right.clone().multiplyScalar(ax).addScaledVector(up, by).addScaledVector(dir, -depth);
    const hang = (mesh: THREE.Mesh, ax: number, by: number, depth: number) => { mesh.position.copy(skyAt(ax, by, depth)); mesh.lookAt(mesh.position.clone().add(dir)); mesh.castShadow = mesh.receiveShadow = false; sky.add(mesh); return mesh; };
    const glowing = (map: THREE.Texture, power: number) => new THREE.MeshStandardMaterial({ color: '#000000', map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: power, alphaTest: 0.5, roughness: 1 });
    const GR = 3.5, gx = -3.4 + (random() - 0.5) * 1.2, gy = a.suns === 'low' ? 10.2 : 9.6;
    {
      const size = 512, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!, c = size / 2, r = size * (a.giant === 'ringed' ? 0.3 : 0.48);
      const bands = [['#f6e2c0', '#f08a5a', '#e8508a', '#f6c86a', '#c84a9a', '#fff0d8'], ['#fff2c8', '#f5a23a', '#e8632a', '#ffd86a', '#c8452a', '#fff8e0'], ['#f0f4ff', '#b8a8f0', '#7ac8e8', '#e0d0ff', '#6a8ae0', '#ffffff']][Math.floor(random() * 3)];
      const tilt = -0.3 + (random() - 0.5) * 0.3;
      const ring = (front: boolean) => { ctx.save(); ctx.translate(c, c); ctx.rotate(tilt); for (const [k, col, w] of [[1.6, bands[1], 0.11], [1.38, bands[3], 0.06]] as const) { ctx.strokeStyle = col; ctx.lineWidth = r * w; ctx.beginPath(); ctx.ellipse(0, 0, r * k, r * k * 0.22, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke(); } ctx.restore(); };
      if (a.giant === 'ringed') ring(false);
      ctx.save(); ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.clip(); ctx.translate(c, c); ctx.rotate(tilt);
      let y = -r * 1.2, i = Math.floor(random() * 6);
      while (y < r * 1.2) { const h = r * (0.07 + random() * 0.15); ctx.fillStyle = bands[i++ % bands.length]; ctx.beginPath(); ctx.moveTo(-r * 1.3, y); for (let x = -r * 1.3; x <= r * 1.31; x += r * 0.13) ctx.lineTo(x, y + Math.sin(x * 0.03 + y) * r * 0.014); ctx.lineTo(r * 1.3, y + h + 2); ctx.lineTo(-r * 1.3, y + h + 2); ctx.fill(); y += h; }
      ctx.fillStyle = bands[2]; ctx.beginPath(); ctx.ellipse(r * 0.25, r * 0.3, r * 0.16, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // The night side is a ghost of the sky colour, as a moon looks by day.
      ctx.save(); ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.clip();
      const ghost = skyColour.clone().multiplyScalar(0.82).getStyle();
      const bite = { crescent: 0.62, half: 1.05, sliver: 0.16, ringed: 0.66, full: 9 }[a.giant];
      if (a.giant !== 'full') { ctx.fillStyle = ghost; ctx.globalAlpha = 0.93; ctx.beginPath(); ctx.arc(c + r * bite * 0.9, c - r * bite * 0.55, r * (1 + bite * 0.1), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      const shade = ctx.createRadialGradient(c - r * 0.5, c + r * 0.3, r * 0.3, c, c, r * 1.1); shade.addColorStop(0, 'rgba(255,255,255,0.12)'); shade.addColorStop(1, 'rgba(40,20,80,0.25)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, size, size);
      ctx.restore();
      if (a.giant === 'ringed') ring(true);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const plane = GR * (a.giant === 'ringed' ? 1.6 : 1) * 2 / 0.96;
      hang(new THREE.Mesh(new THREE.PlaneGeometry(plane, plane), glowing(map, mix(0.85, 1.05, mood.cheer))), gx, gy, 13);
    }
    const sunFace = (inner: string, outer: string) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d')!;
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, inner); g.addColorStop(1, outer);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
    };
    const halos: THREE.MeshBasicMaterial[] = [];
    const sun = (ax: number, by: number, r: number, inner: string, outer: string, depth: number) => {
      hang(new THREE.Mesh(new THREE.CircleGeometry(r, 40), glowing(sunFace(inner, outer), 1.25)), ax, by, depth);
      for (const [k, o] of [[1.45, 0.3], [2.0, 0.17], [2.8, 0.09]] as const) { const mat = new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: o, depthWrite: false }); halos.push(mat); hang(new THREE.Mesh(new THREE.CircleGeometry(r * k, 40), mat), ax, by, depth - 0.1); }
      const rays: number[] = [];
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, w = 0.11, len = r * (i % 2 ? 2.3 : 3.1); rays.push(Math.cos(t - w) * r * 1.15, Math.sin(t - w) * r * 1.15, 0, Math.cos(t + w) * r * 1.15, Math.sin(t + w) * r * 1.15, 0, Math.cos(t) * len, Math.sin(t) * len, 0); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(rays, 3));
      const mat = new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }); halos.push(mat);
      return hang(new THREE.Mesh(geo, mat), ax, by, depth - 0.05);
    };
    const sunPos: Record<typeof a.suns, [number, number, number, number, number, number]> = {
      high: [4.2, 11.9, 0.8, 5.7, 11.0, 0.48], low: [3.6, 9.6, 1.35, 6.1, 9.0, 0.8], split: [gx - GR - 1.3, 10.6, 0.7, gx + GR + 2.4, 11.2, 1.05], eclipse: [gx + GR * 0.86, gy + GR * 0.45, 1.0, 5.6, 11.6, 0.6],
    };
    const [s1x, s1y, s1r, s2x, s2y, s2r] = sunPos[a.suns];
    const warmSun = mix(0, 1, mood.warmth);
    const rayA = sun(s1x, s1y, s1r, new THREE.Color('#fff2a8').lerp(new THREE.Color('#ffc86a'), warmSun).getStyle(), '#ffb23a', a.suns === 'eclipse' ? 13.6 : 12.6);
    const rayB = sun(s2x, s2y, s2r, '#ffd0e0', a.sky === 'apricot' ? '#ff5a4a' : '#ff6aa8', 12.4);

    // ---- What is watching ----
    const eyeMats: THREE.MeshStandardMaterial[] = [];
    let reach: THREE.Group | null = null;
    const flyers: { g: THREE.Group; phase: number; r: number; h: number }[] = [];
    if (a.lurking === 'eyes') {
      const pairs = Math.round(mix(5, 12, 1 - mood.cheer * 0.5));
      for (let i = 0; i < pairs; i++) {
        const back = random() < 0.55, x = back ? -W / 2 + 1.5 + random() * (W - 3) : -W / 2 + 1.9 + random() * 0.4, z = back ? -D / 2 + 2.5 + random() * 0.5 : -D / 2 + 2.5 + random() * (D - 5), y = 0.35 + random() * 1.1, gap = 0.09 + random() * 0.08;
        const hue = ['#fff24a', '#ff5a3a', '#7affc8'][i % 3], mat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 2 }); eyeMats.push(mat);
        s.ball([0.34, 0.26, 0.2], [x, y, z - 0.12], new THREE.MeshStandardMaterial({ color: '#1c1226', roughness: 1 }), 10).castShadow = false;
        for (const side of [-1, 1]) { s.ball([0.075, 0.05, 0.04], [x + side * gap, y, z + 0.06], mat, 8).castShadow = false; }
      }
    }
    if (a.lurking === 'tentacle') {
      reach = new THREE.Group(); reach.position.set(-W / 2 + 0.8, 0, -1.6 + random() * 2); s.root.add(reach);
      const skin = s.material('#c8468a', { roughness: 0.4 }), under = s.material('#f0c8d8', { roughness: 0.5 });
      const pts = [new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0.8, 2.3, 0.2), new THREE.Vector3(1.7, 1.5, 0.3), new THREE.Vector3(2.4, 0.35, 0.5), new THREE.Vector3(3.1, 0.2, 0.9), new THREE.Vector3(3.6, 0.55, 1.0), new THREE.Vector3(3.75, 1.0, 0.85), new THREE.Vector3(3.5, 1.25, 0.7), new THREE.Vector3(3.3, 1.05, 0.7)];
      const curve = new THREE.CatmullRomCurve3(pts);
      const arm = new THREE.Mesh(taperTube(curve, 60, 0.42, 0.05, 10), skin); arm.castShadow = true; reach.add(arm);
      const cups: THREE.BufferGeometry[] = [];
      for (let i = 2; i < 26; i++) { const t = i / 27, p = curve.getPointAt(t), r = mix(0.42, 0.05, t); const cup = new THREE.SphereGeometry(r * 0.3, 6, 5); cup.translate(p.x, p.y - r * 0.85, p.z + r * 0.35); cups.push(cup); }
      reach.add(new THREE.Mesh(mergeGeometries(cups), under));
    }
    if (a.lurking === 'flyers') {
      const hide = new THREE.MeshStandardMaterial({ color: '#4a2f5a', roughness: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < Math.round(mix(2, 5, mood.density)); i++) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 6), hide); body.rotation.x = Math.PI / 2; g.add(body);
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 5), hide); head.rotation.x = Math.PI / 2; head.position.z = 0.55; g.add(head);
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.3), new THREE.Vector3(side * 1.3, 0.12, 0.15), new THREE.Vector3(side * 0.9, 0, -0.25), new THREE.Vector3(0, 0, 0.3), new THREE.Vector3(side * 0.9, 0, -0.25), new THREE.Vector3(0, 0, -0.35)]), hide); wing.geometry.computeVertexNormals(); wing.castShadow = true; g.add(wing); }
        s.root.add(g); flyers.push({ g, phase: random() * 6, r: 2.5 + random() * 2.5, h: 6.2 + random() * 1.4 });
      }
    }
    if (a.lurking === 'idol') {
      const rock = s.material('#8a8296', { roughness: 1, flatShading: true }), x = 4.9, z = -D / 2 + 2.3;
      const head = s.mesh(new THREE.BoxGeometry(1.6, 2.6, 1.4, 2, 3, 2), rock, [x, 1.2, z]); head.rotation.set(-0.08, -0.35, 0.1);
      const p = head.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - (y + 1.3) * 0.09)); p.setZ(i, p.getZ(i) * (1 - Math.abs(y) * 0.12)); } head.geometry.computeVertexNormals();
      const brow = s.box([1.5, 0.22, 0.3], [0, 0.55, 0.72], rock), nose = s.box([0.3, 0.9, 0.4], [0, 0.05, 0.8], rock), lips = s.box([0.75, 0.12, 0.2], [0, -0.7, 0.68], rock);
      const eyeMat = new THREE.MeshStandardMaterial({ color: '#7affc8', emissive: '#3affb0', emissiveIntensity: 1.4 }); eyeMats.push(eyeMat);
      const eyes = [[-0.4, 0.32], [0.4, 0.32], [0, 0.95]].map(([ex, ey]) => s.ball([0.14, 0.1, 0.06], [ex, ey, 0.72], eyeMat, 8));
      for (const part of [brow, nose, lips, ...eyes]) head.add(part);
      for (let i = 0; i < 4; i++) { const moss = s.ball([0.4 + random() * 0.3, 0.14, 0.4], [x + (random() - 0.5) * 1.2, 2.45 + random() * 0.15, z + (random() - 0.5) * 0.8], leafMats[i % 3], 8); void moss; }
      s.mesh(taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(x - 0.9, 2.5, z + 0.5), new THREE.Vector3(x - 0.6, 1.4, z + 0.85), new THREE.Vector3(x - 1.0, 0, z + 0.9)]), 12, 0.05, 0.03, 5), leafMats[2]);
    }
    if (a.lurking === 'smoke') for (let i = 0; i < 3; i++) addSmoke(-W / 2 + 2 + i * 4.2 + random() * 1.5, -D / 2 + 0.6 + random() * 0.6, 7, 9.5, 0.5);

    // ---- Who was here before ----
    const flags: THREE.Mesh[] = [];
    if (a.before === 'camp') {
      const x = 5.6, z = 2.2, steel = s.material('#d8d2c8', { metalness: 0.3 }), wood = s.material('#b8864a');
      s.rod([x, 0, z], [x, 2.6, z], 0.03, steel);
      const flag = s.mesh(new THREE.PlaneGeometry(1.1, 0.65, 8, 1), s.material('#e8402e', { side: THREE.DoubleSide, emissive: '#e8402e', emissiveIntensity: 0.15 }), [x + 0.55, 2.25, z]); flags.push(flag);
      s.ball([0.07, 0.07, 0.07], [x, 2.64, z], s.material('#f2c53a', { metalness: 0.4 }), 8);
      for (const [cx, cy, cz, size] of [[0.7, 0.3, 0.5, 0.6], [1.35, 0.25, 0.2, 0.5], [0.95, 0.8, 0.4, 0.45], [0.2, 0.2, 0.95, 0.4]] as const) s.box([size, size, size], [x + cx, cy, z + cz], wood).rotation.y = random();
      s.cylinder(0.2, 0.2, 0.6, [x - 0.5, 0.3, z + 0.7], s.material('#3f8a8a'), 12);
    }
    if (a.before === 'ruins') {
      const rock = s.material('#a79fb4', { roughness: 1, flatShading: true });
      for (const [x, z, h, lean] of [[5.5, 1.6, 2.6, 0.06], [6.3, 3.2, 1.3, -0.2], [4.9, -3.6, 3.2, 0.03], [-5.9, 3.6, 1.7, 0.15]] as const) {
        const col = s.cylinder(0.32, 0.38, h, [x, h / 2, z], rock, 9); col.rotation.z = lean;
        for (let k = 1; k < 4; k++) { const band = s.ring(0.37, 0.04, [x, h * k / 4, z], rock); band.rotation.x = Math.PI / 2; }
        if (h > 2.4) s.box([1.0, 0.25, 1.0], [x, h + 0.1, z], rock).rotation.y = 0.3;
      }
      const fallen = s.cylinder(0.32, 0.36, 2.2, [5.9, 0.3, 4.3], rock, 9); fallen.rotation.set(Math.PI / 2, 0, 1.1);
      shrub(5.7, 2.2, 0.8); shrub(5.2, -3.1, 0.7);
    }
    if (a.before === 'bones') {
      const bone = s.material('#f0e8d6', { roughness: 0.7 });
      for (let i = 0; i < 7; i++) { const z = 4.6 - i * 0.12, x = 3.6 + i * 0.55, h = 1.5 + Math.sin(i / 6 * Math.PI) * 1.5; s.mesh(taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(x, -0.1, z + 0.9), new THREE.Vector3(x + 0.1, h * 0.8, z + 0.75), new THREE.Vector3(x + 0.15, h, z), new THREE.Vector3(x + 0.1, h * 0.75, z - 0.8)]), 14, 0.09, 0.03, 6), bone); }
      s.rod([3.2, 0.25, 4.5], [7.2, 0.3, 3.9], 0.1, bone, 0.05);
      const skull = s.ball([0.6, 0.45, 0.8], [2.4, 0.4, 4.7], bone, 12); skull.rotation.y = 1.2;
      for (const side of [-1, 1]) s.ball([0.14, 0.14, 0.1], [2.2 + side * 0.22, 0.55, 5.0 + side * 0.25], new THREE.MeshStandardMaterial({ color: '#1c1226' }), 8);
    }
    if (a.before === 'wreck') {
      const rust = s.material('#a8553a', { roughness: 0.9, metalness: 0.2, side: THREE.DoubleSide });
      const fin = s.mesh(new THREE.ExtrudeGeometry(new THREE.Shape([[0, 0], [1.8, 0], [0.9, 2.0], [0.2, 3.4], [0, 3.4]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.12, bevelEnabled: false }), rust, [5.2, -0.4, 2.6]); fin.rotation.set(0.1, -0.6, 0.3);
      const hull = s.mesh(new THREE.CylinderGeometry(1.0, 1.1, 2.6, 16, 1, true, 0, Math.PI), rust, [6.3, 0.1, 3.4]); hull.rotation.set(Math.PI / 2, 0, 0.9);
      for (let i = 0; i < 3; i++) s.ring(1.02, 0.05, [6.3 + (i - 1) * 0.55, 0.1, 3.4 - (i - 1) * 0.6], rust, Math.PI).rotation.y = -0.9 + Math.PI / 2;
      shrub(5.9, 3.0, 0.9); fungusTree(4.7, 3.6, 0.7);
    }

    const baseA = rayA.quaternion.clone(), baseB = rayB.quaternion.clone(), spin = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
    const animate = (time: number) => {
      const speed = mix(0.25, 1.8, mood.energy), bend = mix(0.008, 0.045, mood.energy);
      for (const p of sway) { p.g.rotation.x = Math.sin(time * speed + p.phase) * bend * p.amp; p.g.rotation.z = Math.cos(time * speed * 0.8 + p.phase) * bend * p.amp; }
      for (const puff of puffs) { const d = puff.userData as { x: number; z: number; phase: number; drift: number; rise: number; size: number }, t = (d.phase + time * 0.05 * (0.5 + speed)) % 1; puff.position.set(d.x + Math.sin(d.drift + t * 3) * 0.3 * (1 + t), 0.2 + t * d.rise, d.z + t * 0.3); puff.scale.setScalar(d.size * (0.5 + t * 1.6)); }
      eyeMats.forEach((m, i) => { m.emissiveIntensity = Math.sin(time * 0.7 + i * 2.3) > 0.93 ? 0 : 2; });
      beaconMats.forEach((m, i) => { m.emissiveIntensity = ((time * speed * 1.5 + i * 0.5) % 2) < 1 ? 2.2 : 0.3; });
      twinkle.forEach((m, i) => { m.emissiveIntensity = 0.8 + Math.sin(time * 2 + i * 2) * 0.4; });
      ember.emissiveIntensity = 1.5 + Math.sin(time * 4) * 0.4;
      if (reach) { reach.rotation.y = Math.sin(time * speed * 0.6) * 0.12; reach.rotation.z = Math.sin(time * speed * 0.9) * 0.05; }
      for (const f of flyers) { const t = time * speed * 0.25 + f.phase; f.g.position.set(Math.sin(t) * f.r - 1, f.h + Math.sin(t * 2) * 0.3, Math.cos(t) * f.r * 0.7 - 1.5); f.g.rotation.set(0, t + Math.PI / 2, -0.35); }
      rayA.quaternion.copy(baseA).multiply(spin.setFromAxisAngle(zAxis, time * 0.05 * speed)); rayB.quaternion.copy(baseB).multiply(spin.setFromAxisAngle(zAxis, -time * 0.07 * speed));
      for (const flag of flags) { const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6 + time * speed * 4) * 0.06 * (p.getX(i) + 0.55)); p.needsUpdate = true; }
    };
    animate(0);
    world.update = (_dt, time) => animate(time);
    // The sky wall is far behind the set; frame the clearing itself and let the sky fill what is left.
    const place = world.place.bind(world);
    world.place = (items) => { sky.visible = false; place(items); sky.visible = true; };
    return world;
  },
});
