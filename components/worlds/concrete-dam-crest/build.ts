import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';
import { lampGlow, plate } from './util';

const RC = 12, ZC = 10.5, T = 0.75, HALF = 1.4, DEPTH = 8.5;
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const onArc = (r: number, angle: number, y = 0) => new THREE.Vector3(r * Math.sin(angle), y, ZC - r * Math.cos(angle));
const depthAt = (angle: number) => (DEPTH + 0.8) * (1 - Math.pow(Math.min(1, Math.abs(angle) / T), 1.7)) + 0.5;

/** A curved slab following the dam's arc between two radii and two heights. */
function arcBox(r0: number, r1: number, y0: number, y1: number, from: number, to: number, steps = 40) {
  const positions: number[] = [], uvs: number[] = [];
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u0: number, u1: number) => {
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
    uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
  };
  for (let i = 0; i < steps; i++) {
    const a = mix(from, to, i / steps), b = mix(from, to, (i + 1) / steps), u0 = i / steps, u1 = (i + 1) / steps;
    quad(onArc(r0, a, y1), onArc(r0, b, y1), onArc(r1, b, y1), onArc(r1, a, y1), u0, u1);
    quad(onArc(r0, a, y0), onArc(r0, b, y0), onArc(r0, b, y1), onArc(r0, a, y1), u0, u1);
    quad(onArc(r1, a, y0), onArc(r1, b, y0), onArc(r1, b, y1), onArc(r1, a, y1), u0, u1);
  }
  for (const angle of [from, to]) quad(onArc(r0, angle, y0), onArc(r1, angle, y0), onArc(r1, angle, y1), onArc(r0, angle, y1), 0, 0.02);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** The battered downstream face, or a strip of it, as a grid with u along the arc and v up the wall. */
function faceGrid(from: number, to: number, offset: number, steps: number, upstream = false) {
  const positions: number[] = [], uvs: number[] = [], index: number[] = [], rows = 10;
  for (let i = 0; i <= steps; i++) for (let j = 0; j <= rows; j++) {
    const angle = mix(from, to, i / steps), depth = (j / rows) * depthAt(angle);
    const r = upstream ? RC + HALF : RC - HALF - 0.38 * depth - offset;
    positions.push(...onArc(r, angle, -depth).toArray());
    uvs.push((angle + T) / (2 * T), 1 - depth / (DEPTH + 1.3));
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < rows; j++) { const p = i * (rows + 1) + j; index.push(p, p + rows + 1, p + 1, p + 1, p + rows + 1, p + rows + 2); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const PALETTES = {
  forest: { rock: '#8f8c80', turf: '#6f8f55', high: '#86a068', snow: 99, tree: '#3f6b42', trees: 1, water: '#3f7f8a', peak: 1 },
  desert: { rock: '#b47a57', turf: '#c99c6e', high: '#a9694b', snow: 99, tree: '#8f8a55', trees: 0.12, water: '#2f6f86', peak: 0.85 },
  alpine: { rock: '#777c86', turf: '#7f9a70', high: '#9aa0a3', snow: 3.1, tree: '#36594a', trees: 0.45, water: '#58a5a8', peak: 1.35 },
  taiga: { rock: '#6f7572', turf: '#5d7358', high: '#59665a', snow: 6.5, tree: '#2c4a3d', trees: 1.6, water: '#3a5a6c', peak: 0.9 },
} as const;

export default defineWorld({
  questions: {
    mountains: choice('What country does the dam stand in?', {
      forest: 'Green wooded hills, temperate and rainy.',
      desert: 'A bare red-rock canyon under hard sun, the American south-west.',
      alpine: 'High Alps: grey rock, snowfields, milky turquoise water.',
      taiga: 'Dark Siberian taiga, endless conifers and a steel-coloured lake.',
    }),
    level: choice('How full is the reservoir?', {
      full: 'Brim full, lapping just below the parapet.',
      low: 'Drawn down, a pale bathtub ring around every shore.',
      drought: 'Nearly empty: mud flats and the old valley floor showing.',
    }),
    release: choice('What water is coming out of the dam?', {
      none: 'None. The face is dry and silent.',
      jets: 'Two outlet valves blasting white jets far out into the gorge.',
      overflow: 'Spill: white sheets pouring down both flanks of the face.',
      leak: 'Only thin leaks weeping down the concrete.',
    }),
    face: choice('What does the great downstream face look like?', {
      clean: 'Pale new concrete with crisp lift lines.',
      streaked: 'Black streaks, moss and white lime runs from decades of weather.',
      year: 'The year of completion cast into it in giant numerals.',
      slogan: 'A slogan in enormous white Cyrillic letters.',
    }),
    crest: choice('How is the crest dressed?', {
      deco: 'Art deco: two stepped elevator turrets with glowing slit windows.',
      soviet: 'Soviet: a portal crane straddling the road, red flags and a slogan board.',
      plain: 'Plain Alpine engineering: a small gatehouse and one flagpole.',
    }),
    life: choice('What is happening on the crest?', {
      empty: 'Nothing. An empty road and the wind.',
      tourists: 'Tourists at the parapet, a parked coach and a car.',
      convoy: 'A convoy of trucks crossing with their lights on.',
      ceremony: 'Opening day: bunting on the lamp posts and a crowd around the balcony.',
      closed: 'Closed and abandoned: barriers across the road, weeds, a dead truck.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.mountains];
    const level = { full: -0.7, low: -3, drought: -6 }[a.level];
    const phase = [random() * 6, random() * 6, random() * 6, random() * 6];

    const damZ = (x: number) => ZC - Math.sqrt(RC * RC - Math.min(Math.abs(x), 8.6) ** 2);
    const flatten = (x: number, z: number) => {
      const ax = Math.abs(x);
      const along = (ax - 8.18) * 0.732 + (z - 1.72) * 0.682, across = Math.abs((ax - 8.18) * 0.682 - (z - 1.72) * 0.732);
      const road = along > -0.6 ? 1 - smooth(1.7, 2.7, across) : 0;
      const terrace = 1 - smooth(1.8, 2.6, Math.hypot(ax - 10.5, z - 0.9));
      return Math.max(road, terrace);
    };
    const bed = (x: number, z: number) => {
      const ax = Math.abs(x);
      let up = ax < 9.5 ? -7 * (1 - (ax / 9.5) ** 2) : (ax - 9.5) * 1.3;
      if (z < -6.5) up += (-6.5 - z) * (1.1 + 0.25 * Math.sin(x * 0.6 + phase[0]) + Math.max(0, Math.sin(x * 0.5 + phase[1])) * 0.8) * palette.peak;
      const cap = 5.2 * palette.peak;
      return up > 0 ? cap * Math.tanh(up / cap) : up;
    };
    const height = (x: number, z: number) => {
      const ax = Math.abs(x);
      const rough = Math.sin(x * 0.9 + phase[2]) * Math.cos(z * 1.1 + phase[3]) * 0.35 + Math.sin(x * 2.3 + z * 1.7 + phase[0]) * 0.15;
      let down = ax < 8.3 ? Math.max(-DEPTH, -(DEPTH + 1.1) * (1 - (ax / 8.3) ** 1.7)) : (ax - 8.3) * 0.9;
      if (down > -DEPTH + 0.2) down += rough * Math.min(1, (down + DEPTH) / 2);
      const up = bed(x, z) + rough * 0.8;
      return mix(mix(up, down, smooth(-0.8, 0.8, z - damZ(x))), 0, flatten(x, z));
    };

    const slotLift = (x: number, z: number) => Math.max(level, height(x, z));
    const slots: [number, number, number, number][] = [
      [0, -0.45, 0, 1.2],
      [-10.5, 0.9, 0, 0.82],
      [4.6, -6.2, slotLift(4.6, -6.2), 0.9],
      [10.5, 0.9, 0, 0.82],
      [-4.4, -6.5, slotLift(-4.4, -6.5), 0.8],
      [-1.25, 7.9, -DEPTH, 0.5],
    ];
    const sky = new THREE.Color().setHSL(mix(0.58, 0.08, mood.warmth), mix(0.14, 0.32, Math.abs(mood.daylight - 0.5) * 2), mix(0.84, 0.9, mood.cheer));
    const { art: s, world } = diorama(context, { background: `#${sky.getHexString()}`, floor: null, width: 24, depth: 20, maxHeight: 4, radius: 1.6, pitch: 36, yaw: 30, slots });

    // Terrain: one height field with a skirt, coloured by height, slope and shoreline.
    const NX = 48, NZ = 40, X0 = -12, Z0 = -10, STEP = 0.5;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const rock = new THREE.Color(palette.rock), turf = new THREE.Color(palette.turf), high = new THREE.Color(palette.high), snow = new THREE.Color('#f3f6f8'), ring = new THREE.Color('#cfc3a2'), mud = new THREE.Color('#8b7a5f'), paved = new THREE.Color('#b9b5a7');
    const grid: number[][] = [];
    for (let j = 0; j <= NZ; j++) { grid.push([]); for (let i = 0; i <= NX; i++) grid[j].push(height(X0 + i * STEP, Z0 + j * STEP)); }
    const tint = new THREE.Color();
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const x = X0 + i * STEP, z = Z0 + j * STEP, h = grid[j][i];
      const slope = Math.hypot(grid[j][Math.min(NX, i + 1)] - grid[j][Math.max(0, i - 1)], grid[Math.min(NZ, j + 1)][i] - grid[Math.max(0, j - 1)][i]);
      const upstream = z < damZ(x) + 0.5;
      if (flatten(x, z) > 0.96) tint.copy(paved);
      else if (h > palette.snow + Math.sin(x * 1.3) * 0.5) tint.copy(snow);
      else if (upstream && h < -0.55 && Math.abs(x) < 11) tint.copy(h > level - 0.2 ? ring : mud).lerp(mud, h < level ? 1 : smooth(-2.5, -6.5, h) * 0.6);
      else tint.copy(turf).lerp(high, smooth(1.5, 5, h)).lerp(rock, smooth(0.9, 1.7, slope));
      tint.offsetHSL(0, 0, (random() - 0.5) * 0.03);
      positions.push(x, h, z); colours.push(tint.r, tint.g, tint.b);
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const p = j * (NX + 1) + i; index.push(p, p + NX + 1, p + 1, p + 1, p + NX + 1, p + NX + 2); }
    const rim: number[] = [];
    for (let i = 0; i <= NX; i++) rim.push(i);
    for (let j = 1; j <= NZ; j++) rim.push(j * (NX + 1) + NX);
    for (let i = NX - 1; i >= 0; i--) rim.push(NZ * (NX + 1) + i);
    for (let j = NZ - 1; j >= 1; j--) rim.push(j * (NX + 1));
    const base = positions.length / 3;
    const earth = new THREE.Color(palette.rock).multiplyScalar(0.72);
    for (const p of rim) { positions.push(positions[p * 3], -DEPTH - 1, positions[p * 3 + 2]); colours.push(earth.r, earth.g, earth.b); }
    for (let k = 0; k < rim.length; k++) { const p = rim[k], q = rim[(k + 1) % rim.length], pb = base + k, qb = base + ((k + 1) % rim.length); index.push(p, q, pb, q, qb, pb); }
    const land = new THREE.BufferGeometry();
    land.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    land.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    land.setIndex(index);
    land.computeVertexNormals();
    const terrain = s.mesh(land, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, side: THREE.DoubleSide }));
    s.box([24, 0.4, 20], [0, -DEPTH - 1.2, 0], s.material(earth));
    world.ground = terrain;

    // Reservoir, held behind the upstream face.
    const waterTone = new THREE.Color(palette.water).offsetHSL((mood.warmth - 0.5) * -0.04, 0, (mood.cheer - 0.5) * 0.08);
    const still = new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.12, metalness: 0.15 });
    const lake = new THREE.Shape();
    lake.moveTo(-11.9, 9.9); lake.lineTo(11.9, 9.9); lake.lineTo(11.9, 1.5);
    for (let i = 0; i <= 30; i++) { const p = onArc(RC + HALF - 0.05, mix(T + 0.04, -T - 0.04, i / 30)); lake.lineTo(p.x, -p.z); }
    lake.lineTo(-11.9, 1.5);
    const lakeMesh = s.mesh(new THREE.ShapeGeometry(lake).rotateX(-Math.PI / 2), still, [0, level, 0]);
    lakeMesh.castShadow = false;

    // The dam.
    const faceTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = a.face === 'clean' ? '#cfcabb' : '#bcb7a7'; ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = 'rgba(60,54,44,0.2)';
      for (let y = 0; y < 512; y += 30) ctx.fillRect(0, y, 1024, 2);
      for (let x = 0; x < 1024; x += 64) ctx.fillRect(x, 0, 2, 512);
      const streaks = Math.round((a.face === 'streaked' ? 110 : a.face === 'clean' ? 6 : 26) * (0.5 + mood.wear));
      for (let i = 0; i < streaks; i++) {
        const x = random() * 1024, w = 3 + random() * (a.face === 'streaked' ? 22 : 9), y0 = random() * 180, h = 120 + random() * 330;
        const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
        const kind = random();
        g.addColorStop(0, kind > 0.45 ? 'rgba(30,28,24,0.55)' : kind > 0.2 ? 'rgba(248,246,236,0.7)' : 'rgba(70,96,56,0.55)');
        g.addColorStop(1, 'rgba(60,56,46,0)');
        ctx.fillStyle = g; ctx.fillRect(x, y0, w, h);
      }
      if (a.face === 'year' || a.face === 'slogan') {
        ctx.fillStyle = a.face === 'year' ? 'rgba(120,112,98,0.95)' : '#f6f3ea'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${a.face === 'year' ? 170 : 92}px ${a.face === 'year' ? 'serif' : 'sans-serif'}`;
        ctx.fillText(a.face === 'year' ? ['1936', '1957', '1963', 'MCMXLII'][Math.floor(random() * 4)] : 'СЛАВА ТРУДУ', 512, a.face === 'year' ? 250 : 225, a.face === 'year' ? 420 : 520);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const concreteTone = '#cbc7b9';
    const crete = s.material(concreteTone, { roughness: 0.95, side: THREE.DoubleSide });
    const face = new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.95, side: THREE.DoubleSide });
    s.mesh(faceGrid(-T, T, 0, 48), face);
    s.mesh(faceGrid(-T, T, 0, 48, true), crete);
    const asphalt = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#5b5d5e'; ctx.fillRect(0, 0, 512, 64);
      ctx.fillStyle = '#c9c6ba'; ctx.fillRect(0, 0, 512, 7); ctx.fillRect(0, 57, 512, 7);
      ctx.fillStyle = a.life === 'closed' ? '#7a7b74' : '#e9e4cf';
      for (let x = 6; x < 512; x += 26) ctx.fillRect(x, 30, 13, 3);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide });
    })();
    s.mesh(arcBox(RC - HALF, RC + HALF, -0.5, 0, -T - 0.03, T + 0.03), asphalt);
    s.mesh(arcBox(RC + HALF, RC + HALF + 0.2, -0.4, 0.5, -T - 0.03, T + 0.03), crete);
    for (const [from, to] of [[-T - 0.03, -0.195], [0.195, T + 0.03]]) s.mesh(arcBox(RC - HALF - 0.2, RC - HALF, -0.4, 0.5, from, to, 20), crete);
    for (const side of [-1, 1]) { const road = s.box([5.6, 0.3, 2.8], [side * 10.15, -0.15, 3.56], asphalt); road.rotation.y = -side * 0.75; }
    // The viewing balcony over the drop.
    const bz = ZC - RC + HALF;
    s.cylinder(2.3, 2.3, 0.35, [0, -0.175, bz], crete, 32);
    s.cylinder(2.3, 0.5, 2.6, [0, -1.65, bz], crete, 32);
    s.mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.55, 28, 1, true, -1.72, 3.44), crete, [0, 0.27, bz]);
    for (const side of [-1, 1]) { const pad = s.cylinder(1.9, 1.9, 0.12, [side * 10.5, 0.02, 0.9], crete, 24); pad.receiveShadow = true; s.mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.5, 20, 1, true, Math.PI * 0.75 * side - 1.3 + Math.PI, 2.6), crete, [side * 10.5, 0.25, 0.9]); }

    // Lamp standards along the upstream parapet.
    const glow = a.life === 'closed' ? 0 : lampGlow(mood.daylight);
    const iron = s.material('#2f3336', { metalness: 0.4, roughness: 0.5 });
    const lampAngles = Array.from({ length: 9 }, (_unused, k) => mix(-T + 0.05, T - 0.05, k / 8));
    s.scatter(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6).translate(0, 0.65, 0), iron, lampAngles.map((angle) => ({ at: onArc(RC + HALF + 0.1, angle, 0.5).toArray() as [number, number, number], size: 1 })));
    s.scatter(new THREE.SphereGeometry(0.13, 8, 6), s.material('#fff3c8', { emissive: '#ffd27a', emissiveIntensity: glow }), lampAngles.map((angle) => ({ at: onArc(RC + HALF + 0.1, angle, 1.88).toArray() as [number, number, number], size: 1 })));

    // Power house, tailrace and pylons at the toe.
    const toe = ZC - (RC - HALF - 0.38 * DEPTH);
    const pane = s.material('#24323a', { roughness: 0.3, emissive: '#ffd27a', emissiveIntensity: lampGlow(mood.daylight) * 0.6 });
    s.box([5.4, 1.9, 1.9], [0.2, -DEPTH + 0.95, toe + 1.1], crete);
    s.box([5.7, 0.18, 2.2], [0.2, -DEPTH + 1.98, toe + 1.1], s.material('#8f9690'));
    s.box([4.6, 0.7, 0.05], [0.2, -DEPTH + 1.15, toe + 2.07], pane);
    for (let i = 0; i < 3; i++) { s.box([0.5, 0.5, 0.5], [-1.4 + i * 1.3, -DEPTH + 2.3, toe + 0.9], iron); s.rod([-1.4 + i * 1.3, -DEPTH + 2.5, toe + 0.9], [-1.4 + i * 1.3, -DEPTH + 3.1, toe + 0.9], 0.04, iron); }
    const riverTone = a.release === 'none' ? waterTone.clone().multiplyScalar(0.8) : waterTone.clone().lerp(new THREE.Color('#ffffff'), 0.35);
    s.box([1.7, 0.12, 9.6 - toe - 2], [1.25, -DEPTH + 0.04, (toe + 2 + 9.9) / 2], new THREE.MeshStandardMaterial({ color: riverTone, roughness: 0.25 }));
    const pylon = (x: number, z: number) => {
      const y = height(x, z);
      for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) s.rod([x + dx, y, z + dz], [x, y + 2.6, z], 0.03, iron);
      for (const h of [1.7, 2.3]) s.box([1.5, 0.05, 0.05], [x, y + h, z], iron);
      return new THREE.Vector3(x, y + 2.3, z);
    };
    const p1 = pylon(9.4, 5.6), p2 = pylon(11.3, 8.4);
    for (const dx of [-0.7, 0.7]) { s.rod([0.2 + dx * 2, -DEPTH + 3.1, toe + 0.9], [p1.x + dx, p1.y, p1.z], 0.012, iron); s.rod([p1.x + dx, p1.y, p1.z], [p2.x + dx, p2.y, p2.z], 0.012, iron); }

    // What comes out of the dam.
    const white = new THREE.MeshStandardMaterial({ color: '#f7fbfc', roughness: 0.5, side: THREE.DoubleSide, emissive: '#bfe4ee', emissiveIntensity: 0.25 });
    const moving: THREE.Mesh[] = [];
    if (a.release === 'jets') {
      for (const angle of [-0.17, 0.17]) {
        const from = onArc(RC - HALF - 0.38 * 4.6 - 0.1, angle, -4.6);
        const collar = s.cylinder(0.4, 0.4, 0.5, from.toArray() as [number, number, number], iron, 12); collar.rotation.x = Math.PI / 2;
        const land = new THREE.Vector3(from.x * 1.5 + 0.6, -DEPTH + 0.1, 8.3 + random());
        const jet = s.tube([from.toArray() as [number, number, number], [mix(from.x, land.x, 0.4), from.y + 0.5, mix(from.z, land.z, 0.4)], [mix(from.x, land.x, 0.8), from.y - 1.5, mix(from.z, land.z, 0.8)], land.toArray() as [number, number, number]], 0.3, white);
        moving.push(jet);
        for (let i = 0; i < 5; i++) moving.push(s.ball([0.6 + random() * 0.6, 0.35 + random() * 0.4, 0.6 + random() * 0.5], [land.x + (random() - 0.5) * 1.6, -DEPTH + 0.3, land.z + (random() - 0.5) * 1.4], white, 8));
      }
    } else if (a.release === 'overflow') {
      for (const side of [-1, 1]) {
        s.mesh(faceGrid(side * 0.3, side * 0.52, -0.06, 8), white);
        for (let i = 0; i < 6; i++) { const angle = side * (0.3 + random() * 0.22), depth = depthAt(angle) - 0.4; const p = onArc(RC - HALF - 0.38 * depth - 0.4, angle, -depth); moving.push(s.ball([0.5 + random() * 0.5, 0.4, 0.5 + random() * 0.4], [p.x, Math.max(p.y, -DEPTH + 0.3), p.z], white, 8)); }
      }
    } else if (a.release === 'leak') {
      for (let i = 0; i < 4; i++) { const angle = (random() - 0.5) * 1.1; s.mesh(faceGrid(angle, angle + 0.012, -0.03, 1), white); s.mesh(faceGrid(angle - 0.02, angle + 0.035, -0.015, 1), new THREE.MeshStandardMaterial({ color: '#5c6a58', roughness: 1, side: THREE.DoubleSide })); }
    }

    // Crest furniture by style.
    const flags: THREE.Mesh[] = [];
    const flag = (x: number, y: number, z: number, tone: string, tall = 2.2) => {
      s.rod([x, y, z], [x, y + tall, z], 0.03, iron);
      const cloth = s.mesh(new THREE.PlaneGeometry(0.9, 0.5).translate(0.45, 0, 0), new THREE.MeshStandardMaterial({ color: tone, roughness: 0.8, side: THREE.DoubleSide }), [x, y + tall - 0.3, z]);
      cloth.rotation.y = 0.5; flags.push(cloth);
    };
    const radial = (angle: number, r: number, y: number) => { const g = new THREE.Group(); g.position.copy(onArc(r, angle, y)); g.rotation.y = -angle; s.root.add(g); return g; };
    const boxIn = (g: THREE.Group, size: [number, number, number], at: [number, number, number], material: THREE.Material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...at); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    if (a.crest === 'deco') {
      for (const angle of [-0.43, 0.43]) {
        const g = radial(angle, RC - HALF - 0.75, 0);
        boxIn(g, [1.4, 4.2, 1.5], [0, -0.3, 0], crete);
        boxIn(g, [1.6, 0.2, 1.7], [0, 1.9, 0], crete);
        boxIn(g, [1, 0.5, 1.1], [0, 2.25, 0], crete);
        boxIn(g, [0.5, 0.5, 0.6], [0, 2.75, 0], crete);
        boxIn(g, [0.06, 1.1, 0.06], [0, 3.5, 0], iron);
        for (const x of [-0.35, 0, 0.35]) boxIn(g, [0.14, 1.9, 0.05], [x, 0.4, 0.76], pane);
        boxIn(g, [0.5, 0.9, 0.05], [0, 0.45, -0.76], s.material('#8a6a3a', { metalness: 0.5 }));
      }
    } else if (a.crest === 'soviet') {
      const g = radial(0.43, RC, 0);
      const yellow = s.material(new THREE.Color('#d9a91f').lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.5), { metalness: 0.2 });
      for (const x of [-1.1, 1.1]) for (const z of [-1.25, 1.25]) boxIn(g, [0.16, 2.6, 0.16], [x, 1.3, z], yellow);
      boxIn(g, [2.5, 0.45, 3.2], [0, 2.8, 0], yellow);
      boxIn(g, [0.9, 0.8, 0.9], [0.5, 2.2, 0.6], s.material('#5d7f8f'));
      boxIn(g, [0.04, 1.3, 0.04], [-0.4, 1.9, -0.5], iron);
      boxIn(g, [0.3, 0.25, 0.2], [-0.4, 1.2, -0.5], iron);
      const board = plate(['СЛАВА ТРУДУ'], 4.4, 0.8, { paper: '#b3261e', ink: '#f6efd8', border: '#f6efd8' });
      const at = onArc(RC - HALF - 0.12, -0.42, 1.25); board.position.copy(at); board.rotation.y = 0.42; s.root.add(board);
      for (const d of [-2, 2]) { const p = onArc(RC - HALF - 0.1, -0.42 + d / RC, 0); s.rod([p.x, 0.4, p.z], [p.x, 1.3, p.z], 0.04, iron); }
      flag(-1.9, 0.5, bz + 1.25, '#c62a22'); flag(1.9, 0.5, bz + 1.25, '#c62a22');
    } else {
      const g = radial(-0.63, RC + HALF + 1.1, 0);
      const p = onArc(RC - HALF - 1.2, -0.66, 0);
      void g;
      s.box([1.5, 1.3, 1.2], [p.x - 0.5, 0.65, p.z + 1.6], s.material('#d9d2bd'));
      const roofTone = a.mountains === 'alpine' ? '#f3f6f8' : '#7a4f3c';
      const roof = s.cylinder(0.02, 1.25, 0.8, [p.x - 0.5, 1.7, p.z + 1.6], s.material(roofTone), 4); roof.rotation.y = Math.PI / 4;
      s.box([0.4, 0.5, 0.04], [p.x - 0.5, 0.75, p.z + 2.21], pane);
      flag(p.x + 0.9, 0, p.z + 1.4, mood.cheer > 0.5 ? '#d33a2c' : '#c9c5b4', 2.6);
    }

    // Life on the crest.
    const crowd: { at: [number, number, number]; size: number; color: string }[] = [];
    const coats = mood.cheer > 0.5 ? ['#d8452f', '#2f6fb0', '#e9c53a', '#f1ede0', '#3f8a5a'] : ['#4a5058', '#6b5d4f', '#2f3d4f', '#8a8478', '#5d3c38'];
    const person = (x: number, z: number, y = 0) => crowd.push({ at: [x, y, z], size: 0.85 + random() * 0.35, color: coats[Math.floor(random() * coats.length)] });
    const onRoad = (angle: number, lane: number) => onArc(RC + lane, angle, 0);
    const vehicle = (angle: number, lane: number, length: number, tone: string, tall: number, lights = false) => {
      const g = radial(angle, RC + lane, 0);
      boxIn(g, [length, tall, 0.62], [0, tall / 2 + 0.12, 0], s.material(tone, { roughness: 0.5 }));
      boxIn(g, [length * 0.28, tall * 0.75, 0.6], [length * 0.36 * (lane > 0 ? -1 : 1), tall * 0.55, 0], s.material('#2c3238', { roughness: 0.3 }));
      for (const x of [-0.32, 0.32]) boxIn(g, [0.24, 0.24, 0.68], [x * length, 0.12, 0], iron);
      if (lights) boxIn(g, [0.05, 0.1, 0.5], [(length / 2 + 0.02) * (lane > 0 ? -1 : 1), 0.3, 0], s.material('#fff6d0', { emissive: '#ffe9a0', emissiveIntensity: 2 }));
      return g;
    };
    if (a.life === 'tourists') {
      const n = Math.round(mix(8, 30, mood.density));
      for (let i = 0; i < n; i++) {
        if (random() > 0.45) { const angle = -1.4 + random() * 2.8; person(Math.sin(angle) * 2.05, bz + Math.cos(angle) * 2.05); }
        else { const p = onRoad((random() > 0.5 ? 1 : -1) * (0.22 + random() * 0.45), -HALF + 0.25); person(p.x, p.z); }
      }
      vehicle(0.55, 0.75, 2.3, mood.cheer > 0.5 ? '#e8e2d0' : '#8f958f', 0.75);
      vehicle(0.4, 0.75, 1.05, '#b23a2e', 0.4);
      for (const angle of [-0.9, 0.9]) { const x = Math.sin(angle) * 2.15, z = bz + Math.cos(angle) * 2.15; s.rod([x, 0, z], [x, 0.75, z], 0.03, iron); s.box([0.14, 0.14, 0.3], [x, 0.8, z], s.material('#9aa3a6', { metalness: 0.6 })).rotation.y = angle; }
    } else if (a.life === 'convoy') {
      const tarps = ['#5d6b4a', '#6f6a58', '#4f5a66', '#7a5a3c'];
      const n = 4 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) { const angle = mix(-0.66, 0.66, i / (n - 1)); if (Math.abs(angle) < 0.17) continue; vehicle(angle + (random() - 0.5) * 0.03, 0.72, 1.7, tarps[i % 4], 0.8, true); }
      for (let i = 0; i < 4; i++) { const p = onRoad(-0.3 + random() * 0.6, -HALF + 0.3); person(p.x, p.z); }
    } else if (a.life === 'ceremony') {
      const n = Math.round(mix(40, 110, mood.density));
      for (let i = 0; i < n; i++) {
        if (random() > 0.5) { const angle = (random() > 0.5 ? 1 : -1) * (0.9 + random() * 0.6), r = 1.3 + random() * 0.8; person(Math.sin(angle) * r, bz + Math.cos(angle) * r); }
        else { const p = onRoad((random() > 0.5 ? 1 : -1) * (0.16 + random() * 0.4), (random() - 0.5) * 2.2); person(p.x, p.z); }
      }
      const pennants = Array.from({ length: 80 }, (_unused, k) => { const angle = mix(-T + 0.05, T - 0.05, k / 79), sag = Math.sin((k / 79) * 8 * Math.PI) ** 2; return { at: onArc(RC + HALF + 0.1, angle, 1.75 - sag * 0.35).toArray() as [number, number, number], size: 1, color: ['#d8452f', '#f1ede0', '#2f6fb0', '#e9c53a'][k % 4] }; });
      s.scatter(new THREE.ConeGeometry(0.09, 0.22, 3).rotateX(Math.PI), new THREE.MeshStandardMaterial({ roughness: 0.8 }), pennants);
      s.box([0.9, 0.5, 0.6], [-1.7, 0.25, bz - 0.9], s.material('#b3261e'));
      flag(-2.2, 0, bz - 1, '#d8452f'); flag(2.2, 0, bz - 1, '#2f6fb0');
    } else if (a.life === 'closed') {
      for (const side of [-1, 1]) {
        const g = radial(side * 0.6, RC, 0);
        const bar = boxIn(g, [0.18, 0.5, 2.7], [0, 0.55, 0], s.material('#e8e1cc'));
        for (let k = -2; k <= 2; k++) boxIn(g, [0.19, 0.5, 0.3], [0, 0.55, k * 0.6], s.material('#c2302a'));
        for (const z of [-1.2, 1.2]) boxIn(g, [0.5, 0.35, 0.3], [0, 0.17, z], crete);
        void bar;
      }
      const dead = vehicle(-0.33, 0.7, 1.7, '#7a5236', 0.75);
      dead.rotation.y += 0.25; dead.rotation.z = 0.06;
      const weeds = Array.from({ length: 50 }, () => { const p = onRoad((random() - 0.5) * 1.3, (random() - 0.5) * 2.6); return { at: [p.x, 0.1, p.z] as [number, number, number], size: 0.5 + random(), color: random() > 0.5 ? '#6f8346' : '#8d8a52' }; });
      s.scatter(new THREE.ConeGeometry(0.07, 0.35, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), weeds);
    }
    if (crowd.length) s.scatter(new THREE.CapsuleGeometry(0.075, 0.22, 2, 6).translate(0, 0.19, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), crowd);

    // Pads so that anything can stand in the reservoir or the gorge.
    for (const [x, z, lift] of [slots[2], slots[4]]) {
      if (lift <= level + 0.01) { s.cylinder(1.25, 1.25, 0.16, [x, lift - 0.06, z], s.material('#9a8a6a', { roughness: 0.9 }), 8); for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) s.cylinder(0.2, 0.2, 0.3, [x + dx, lift - 0.2, z + dz], s.material('#c9502f'), 10); }
      else s.cylinder(1.3, 1.6, 0.5, [x, lift - 0.24, z], s.material(mud, { roughness: 1 }), 10);
    }
    s.cylinder(0.85, 1, 0.3, [slots[5][0], -DEPTH + 0.02, slots[5][1]], crete, 12);

    // Trees, or scrub in the desert.
    const wanted = Math.round(mix(120, 420, mood.density) * palette.trees);
    const trees: { at: [number, number, number]; size: number; color?: string }[] = [];
    for (let i = 0; i < wanted * 3 && trees.length < wanted; i++) {
      const x = X0 + 0.4 + random() * 23.2, z = Z0 + 0.4 + random() * 19.2, h = height(x, z);
      const upstream = z < damZ(x) + 0.5;
      if (h < (upstream ? 0.15 : 0.3) || h > palette.snow - 0.4 || flatten(x, z) > 0.05) continue;
      if (Math.abs(height(x + 0.4, z) - h) + Math.abs(height(x, z + 0.4) - h) > 1.1) continue;
      trees.push({ at: [x, h - 0.05, z], size: 0.6 + random() * 0.7 });
    }
    if (trees.length) {
      const leaf = new THREE.Color(palette.tree);
      s.scatter(a.mountains === 'desert' ? new THREE.IcosahedronGeometry(0.22, 0).translate(0, 0.15, 0) : new THREE.ConeGeometry(a.mountains === 'forest' ? 0.34 : 0.24, a.mountains === 'forest' ? 0.95 : 1.15, 6).translate(0, 0.62, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), trees.map((tree) => ({ ...tree, color: `#${leaf.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08).getHexString()}` })));
    }

    const speed = mix(1.5, 9, mood.energy);
    const bases = moving.map((mesh) => mesh.scale.clone());
    world.update = (_dt, time) => {
      moving.forEach((mesh, index) => { const pulse = 1 + 0.08 * Math.sin(time * speed + index * 1.7); mesh.scale.set(bases[index].x * pulse, bases[index].y * (2 - pulse), bases[index].z * pulse); });
      flags.forEach((cloth, index) => { cloth.rotation.y = 0.5 + Math.sin(time * speed * 0.5 + index) * 0.35; });
    };
    return world;
  },
});
