import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

const PALETTES = {
  harvest: { wall: '#d9c8a2', stripes: ['#d9601a', '#8a4a22', '#e8b030'], carpet: '#7a3b22', figure: ['#d9801a', '#e8c060', '#4a2414'], seats: ['#d9601a', '#6b3f22'], cap: '#8a5a34', neon: '#ff8a2a' },
  atomic: { wall: '#dfe6dc', stripes: ['#2fb5b0', '#f07a5a', '#f2d24a'], carpet: '#2a6a70', figure: ['#f2d24a', '#f07a5a', '#e6f2ee'], seats: ['#2fb5b0', '#efe6cf'], cap: '#d9d2bf', neon: '#3fe0d0' },
  neon: { wall: '#cbc4dc', stripes: ['#ff2e88', '#2ee6d6', '#7a5cff'], carpet: '#2c2646', figure: ['#ff2e88', '#2ee6d6', '#ffe14a'], seats: ['#ff2e88', '#2a2a34'], cap: '#4a4466', neon: '#ff3a9a' },
  institutional: { wall: '#d6cfbb', stripes: ['#7a1f2a', '#c9a03a', '#3a4a5a'], carpet: '#6a1f2a', figure: ['#c9a03a', '#8a2a34', '#3a1016'], seats: ['#7a1f2a', '#d0c4a0'], cap: '#6a6f76', neon: '#ff4030' },
} as const;
const SIGNS = { bowl: 'BOWL', league: 'LEAGUE NIGHT', open: 'OPEN BOWLING', cocktails: 'COCKTAILS', lucky: 'LUCKY STRIKE LANES', family: 'FAMILY FUN' } as const;
const VIEWS = {
  low: { at: [0.45, 1.25, 13.2], to: [0, 0.3, 0], fov: 36 },
  standing: { at: [0.45, 2.25, 13.2], to: [0, 0.55, -1], fov: 34 },
  high: { at: [0.6, 3.2, 13.2], to: [0, 0.2, -1], fov: 36 },
} as const;
/** Where the cast stands: x, z, the height and radius the spot can take, whether it is out on the approach. */
const SLOTS = [
  { x: -0.6, z: 5.4, h: 2.3, r: 1.0 },
  { x: 1.55, z: 4.9, h: 2.1, r: 0.9 },
  { x: -2.4, z: 3.7, h: 2.0, r: 0.75 },
  { x: 2.6, z: 3.5, h: 2.0, r: 0.7 },
  { x: 0.1, z: 1.1, h: 1.6, r: 0.7 },
] as const;

function shellGeometry() {
  const profile = new THREE.CatmullRomCurve3([[0.235, 0.385], [0.225, 0.425], [0.12, 0.42], [-0.04, 0.405], [-0.15, 0.42], [-0.21, 0.48], [-0.24, 0.6], [-0.255, 0.74], [-0.27, 0.86], [-0.285, 0.875]].map(([z, y]) => new THREE.Vector3(0, y, z)));
  const U = 14, V = 6, positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, p = profile.getPoint(u), t = profile.getTangent(u), end = Math.min(u, 1 - u);
    const half = mix(0.235, 0.2, THREE.MathUtils.smoothstep(u, 0.45, 1)) * (0.72 + 0.28 * Math.sqrt(Math.min(1, end / 0.12)));
    for (let j = 0; j <= V; j++) { const v = j / V * 2 - 1, cup = 0.055 * v ** 4 + 0.02 * v * v; positions.push(v * half, p.y - t.z * cup, p.z + t.y * cup); }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; index.push(a, a + 1, b, a + 1, b + 1, b); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    lanes: choice('How big is the house?', {
      four: 'Four lanes, a tiny small-town alley.',
      five: 'Five lanes, one of them the odd lane nobody likes.',
      six: 'Six lanes side by side.',
    }),
    session: choice('What kind of night is it?', {
      league: 'League night: every lane lit and in play, pennants strung overhead, bright fluorescent house lights.',
      birthday: 'A birthday party: balloons on the seats, streamers, bumpers up on one lane.',
      cosmic: 'Cosmic bowling: house lights down, lanes and arrows glowing under blacklight, a mirror ball turning.',
      dead: 'A dead weekday afternoon: one lane switched on and the rest dark with their sweeps down.',
      closing: 'After closing: every lane dark, only the concourse lights and the sign still on.',
    }),
    palette: choice('What are the house colours?', {
      harvest: 'Burnt orange, chocolate and gold on cream: pure 1970s.',
      atomic: 'Turquoise, coral and lemon: a 1960s survivor.',
      neon: 'Magenta, teal and violet from a 1990s refit.',
      institutional: 'Maroon and brass on beige, like a lodge hall.',
    }),
    mural: choice('What is painted on the masking panels above the pins?', {
      sunburst: 'A huge striped sunburst fanning across every lane.',
      mountains: 'A mountain range at sunset in flat bands of colour.',
      space: 'Planets, rings and stars.',
      pins: 'Giant tumbling pins and a ball, sign-painter style.',
      plain: 'Plain wood panelling with a stripe: nothing fancy.',
    }),
    sign: choice('What does the lit sign above the lanes say?', {
      bowl: 'BOWL', league: 'LEAGUE NIGHT', open: 'OPEN BOWLING', cocktails: 'COCKTAILS', lucky: 'LUCKY STRIKE LANES', family: 'FAMILY FUN',
    }),
    pins: choice('What is the state of the pin decks?', {
      fresh: 'Fresh full racks waiting on every lit lane.',
      leftovers: 'Mid-frame: a few pins standing on each lane, splits and stragglers.',
      strike: 'One lane has just been cleared, its pins lying scattered, while others wait.',
      swept: 'Sweep bars down across most lanes, the machines mid-cycle.',
    }),
    traffic: choice('What is on the lanes right now?', {
      quiet: 'Nothing: the lanes are clear.',
      rolling: 'One ball rolling down a lane toward the pins.',
      gutter: 'A ball stopped dead in a gutter halfway down.',
      busy: 'Balls rolling on several lanes at once.',
    }),
    view: choice('Where is the camera?', {
      low: 'Low, at a seated child\'s eye level, the lanes stretching away like a runway.',
      standing: 'Standing height on the concourse.',
      high: 'High, from the top of the steps, looking down over the seats.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { root } = s;
    const { mood, random } = context;
    const pal = PALETTES[a.palette];
    const n = { four: 4, five: 5, six: 6 }[a.lanes];
    const PITCH = 1.7, LANE = 1.06, FAR = -9.4, DECK = -8.45, MASK_Z = -8.25, APPROACH = 2.2, CEIL = 3.75, NEAR = 14.5;
    const half = n * PITCH / 2, wallX = half + 1.25;
    const laneX = (i: number) => (i - (n - 1) / 2) * PITCH;
    const cosmic = a.session === 'cosmic', closing = a.session === 'closing', dead = a.session === 'dead';
    const glow = mix(0.6, 1.25, mood.cheer);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const liveLane = Math.floor(random() * n);
    const laneOn = Array.from({ length: n }, (_u, i) => closing ? false : dead ? i === liveLane || (mood.density > 0.75 && i === (liveLane + 2) % n) : true);
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });
    const lit = (colour: THREE.ColorRepresentation, intensity: number, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.5, ...options });
    const add = <T extends THREE.Object3D>(object: T) => { root.add(object); return object; };
    const slab = (size: [number, number, number], at: [number, number, number], material: THREE.Material, shadow = true) => { const m = s.box(size, at, material); m.castShadow = shadow; return m; };
    const wallTone = new THREE.Color(pal.wall).multiplyScalar(cosmic ? 0.5 : closing ? 0.72 : 1).lerp(new THREE.Color(cosmic ? '#4a3f8a' : '#8b8275'), cosmic ? 0.45 : mood.wear * 0.2);

    // ---- carpeted concourse (the ground the cast stands on)
    const carpetMap = paint(512, 512, (c, w, h) => {
      c.fillStyle = pal.carpet; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = random() * w, y = random() * h, kind = i % 4; c.strokeStyle = c.fillStyle = pal.figure[i % 3]; c.lineWidth = 6;
        if (a.palette === 'harvest' || a.palette === 'institutional') { const q = 64, gx = Math.floor(x / q) * q, gy = Math.floor(y / q) * q; if (kind < 2) c.fillRect(gx + 10, gy + 10, 30, 30); else { c.beginPath(); c.arc(gx + 32, gy + 32, 16, 0, 7); c.stroke(); } }
        else if (kind === 0) { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y - 40, x + 50, y + 40, x + 80, y); c.stroke(); }
        else if (kind === 1) { c.beginPath(); c.arc(x, y, 14, 0, 7); c.stroke(); }
        else if (kind === 2) { c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 18, t = k / 10 * 6.283; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.fill(); }
        else { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 24, y + 36); c.lineTo(x - 24, y + 36); c.closePath(); c.stroke(); }
      }
      for (let i = 0; i < 26 * mood.wear; i++) { c.fillStyle = `rgba(40,30,24,${0.15 + random() * 0.25})`; c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 60, 14 + random() * 40, random() * 3, 0, 7); c.fill(); }
    });
    carpetMap.wrapS = carpetMap.wrapT = THREE.RepeatWrapping; carpetMap.repeat.set(wallX * 2 / 3, (NEAR - APPROACH) / 3);
    const carpetMaterial = new THREE.MeshStandardMaterial({ map: carpetMap, roughness: 1, emissive: '#ffffff', emissiveMap: carpetMap, emissiveIntensity: cosmic ? 0.55 * glow : 0 });
    const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(wallX * 2, NEAR - APPROACH).rotateX(-Math.PI / 2), carpetMaterial));
    floor.position.set(0, 0, (NEAR + APPROACH) / 2); floor.receiveShadow = true;

    // ---- lanes: maple boards, dots, arrows, a foul line
    const laneArt = (emissiveOnly: boolean) => paint(128, 1024, (c, w, h) => {
      const z = (metres: number) => h * (1 - metres / -FAR);
      if (emissiveOnly) { c.fillStyle = '#000000'; c.fillRect(0, 0, w, h); }
      else {
        c.fillStyle = '#d8a860'; c.fillRect(0, 0, w, h);
        for (let b = 0; b < 13; b++) { c.fillStyle = `hsl(${34 + random() * 6},${45 + random() * 15}%,${58 + random() * 12}%)`; c.fillRect(b * w / 13, 0, w / 13 - 0.6, h); }
        c.fillStyle = '#e9c98a'; c.fillRect(0, 0, w, h - z(7.4)); // paler synthetic pin deck
        const sheen = c.createLinearGradient(0, 0, 0, h); sheen.addColorStop(0, 'rgba(255,255,255,0.5)'); sheen.addColorStop(0.35, 'rgba(255,255,255,0.08)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = sheen; c.fillRect(w * 0.25, 0, w * 0.5, h);
        for (let i = 0; i < 30 * mood.wear; i++) { c.strokeStyle = 'rgba(60,40,20,0.25)'; c.lineWidth = 1; const x = random() * w, y = z(random() * 6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 6, y - 40 - random() * 80); c.stroke(); }
        c.fillStyle = '#1c1c1f'; c.fillRect(0, z(0) - 5, w, 5);
      }
      c.fillStyle = emissiveOnly ? (cosmic ? pal.figure[1] : '#ff7a3a') : '#5a2a14';
      for (let k = -3; k <= 3; k++) { const x = w / 2 + k * w / 8, y = z(3.6 - Math.abs(k) * 0.42); c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x + 5.5, y + 12); c.lineTo(x - 5.5, y + 12); c.fill(); }
      for (const k of [-3.2, -2.2, -1.2, 1.2, 2.2, 3.2]) { c.beginPath(); c.arc(w / 2 + k * w / 8.6, z(1.5), 3, 0, 7); c.fill(); }
      if (emissiveOnly && cosmic) { c.fillStyle = pal.figure[0]; c.fillRect(0, 0, 4, h); c.fillRect(w - 4, 0, 4, h); }
    });
    const laneMap = laneArt(false), laneGlow = laneArt(true);
    const arrowsLit = cosmic ? 1.6 * glow : closing ? 0.1 : 0.75 * glow;
    const laneMaterial = new THREE.MeshStandardMaterial({ map: laneMap, roughness: 0.22, emissive: '#ffffff', emissiveMap: laneGlow, emissiveIntensity: arrowsLit });
    const laneDark = new THREE.MeshStandardMaterial({ map: laneMap, roughness: 0.22, color: '#8f8a86', emissive: '#ffffff', emissiveMap: laneGlow, emissiveIntensity: cosmic ? arrowsLit : 0.08 });
    const gutter = flat('#3a3c40', { roughness: 0.5 });
    const cap = cosmic ? lit(pal.figure[0], 0.5 * glow) : s.material(pal.cap, { roughness: 0.5 });
    for (let i = 0; i < n; i++) {
      const x = laneX(i);
      const lane = add(new THREE.Mesh(new THREE.PlaneGeometry(LANE, -FAR).rotateX(-Math.PI / 2), laneOn[i] || cosmic ? laneMaterial : laneDark));
      lane.position.set(x, 0.002, FAR / 2); lane.receiveShadow = true;
      for (const side of [-1, 1]) slab([0.23, 0.02, -DECK], [x + side * (LANE / 2 + 0.115), -0.035, DECK / 2], gutter, false);
    }
    slab([wallX * 2, 0.1, -FAR + 0.6], [0, -0.1, FAR / 2 - 0.3], flat('#2a2b2e'), false);
    for (let i = 0; i <= n; i++) {
      const x = -half + i * PITCH, edge = i === 0 || i === n;
      if (edge) slab([wallX - half + 0.09, 0.09, -MASK_Z], [Math.sign(x) * (half + wallX - 0.09) / 2, 0.045, MASK_Z / 2], cap);
      else slab([0.18, 0.07, -MASK_Z], [x, 0.035, MASK_Z / 2], cap);
    }
    // approach: one floor of plain boards with locator dots
    const approachMap = paint(512, 128, (c, w, h) => {
      for (let b = 0; b < 60; b++) { c.fillStyle = `hsl(${32 + random() * 6},${40 + random() * 15}%,${52 + random() * 12}%)`; c.fillRect(b * w / 60, 0, w / 60 - 0.5, h); }
      for (let i = 0; i < 40 * mood.wear; i++) { c.fillStyle = 'rgba(40,24,10,0.2)'; c.fillRect(random() * w, random() * h, 1 + random() * 3, 10 + random() * 30); }
    });
    approachMap.wrapS = THREE.RepeatWrapping; approachMap.repeat.set(n / 3, 1);
    const approach = add(new THREE.Mesh(new THREE.PlaneGeometry(wallX * 2, APPROACH).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: approachMap, roughness: 0.3, color: cosmic ? '#9a90c0' : '#ffffff' })));
    approach.position.set(0, 0.001, APPROACH / 2); approach.receiveShadow = true;
    slab([wallX * 2, 0.03, 0.08], [0, 0.012, APPROACH + 0.02], s.material('#c9ced2', { metalness: 0.7, roughness: 0.3 }), false);

    // ---- pin end: pit, pins, sweeps, the masking panels and the sign
    slab([wallX * 2, CEIL, 0.2], [0, CEIL / 2, FAR - 0.3], flat('#26272c'), false);
    const MASK_BOTTOM = 0.78, MASK_TOP = 2.55;
    const pinMap = paint(8, 64, (c, w, h) => { c.fillStyle = '#fbfaf4'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8202c'; c.fillRect(0, h * 0.27, w, 3); c.fillRect(0, h * 0.36, w, 3); });
    const pinProfile = [[0, 0], [0.028, 0], [0.045, 0.04], [0.06, 0.11], [0.058, 0.17], [0.04, 0.235], [0.024, 0.27], [0.023, 0.3], [0.031, 0.335], [0.03, 0.36], [0.016, 0.38], [0, 0.381]].map(([x, y]) => new THREE.Vector2(x, y));
    const pinGeometry = new THREE.LatheGeometry(pinProfile, 10);
    const pinSpots: { x: number; z: number }[] = [];
    for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) pinSpots.push({ x: (k - row / 2) * 0.305, z: DECK - 0.2 - row * 0.264 });
    const pinMatrices: THREE.Matrix4[] = [], pinBright: boolean[] = [];
    const strikeLane = a.pins === 'strike' ? pick(laneOn.map((on, i) => (on ? i : -1)).filter((i) => i >= 0).concat(laneOn.some(Boolean) ? [] : [0])) : -1;
    const sweepMaterial = s.material('#2f3136', { roughness: 0.5 }), sweepStripe = lit('#f2c12e', 0.25);
    const pitLights: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < n; i++) {
      const x = laneX(i), on = laneOn[i];
      const swept = !on || (a.pins === 'swept' && random() < 0.75);
      const pattern = a.pins === 'fresh' || !on ? 1 : a.pins === 'leftovers' ? mix(0.15, 0.6, random()) : a.pins === 'swept' ? 0.5 : random() < 0.5 ? 1 : 0.4;
      for (const spot of pinSpots) {
        const m = new THREE.Matrix4();
        if (i === strikeLane) m.compose(new THREE.Vector3(x + (random() - 0.5) * 0.9, 0.065, spot.z - random() * 0.35), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, random() * 6.283)), new THREE.Vector3(1, 1, 1));
        else if (random() > pattern) continue;
        else m.makeRotationY(random() * 6).setPosition(x + spot.x, 0.004, spot.z);
        pinMatrices.push(m); pinBright.push(on);
      }
      const pitGlow = lit('#fff4dc', on ? 1.5 * glow : 0.03);
      pitLights.push(pitGlow);
      slab([LANE + 0.4, 0.06, 0.1], [x, MASK_BOTTOM - 0.04, MASK_Z - 0.12], pitGlow, false);
      slab([LANE + 0.46, MASK_BOTTOM + 0.1, 0.05], [x, MASK_BOTTOM / 2, FAR - 0.12], flat(on ? '#8f8a80' : '#2c2d31', { emissive: '#fff0d0', emissiveIntensity: on ? 0.28 * glow : 0 }), false);
      for (const side of [-1, 1]) slab([0.07, MASK_BOTTOM, -FAR + MASK_Z], [x + side * (LANE / 2 + 0.2), MASK_BOTTOM / 2, (FAR + MASK_Z) / 2], flat('#3c3d42'), false);
      if (swept) { slab([LANE + 0.3, 0.14, 0.05], [x, 0.09, DECK + 0.08], sweepMaterial, false); slab([LANE + 0.3, 0.03, 0.055], [x, 0.14, DECK + 0.082], sweepStripe, false); }
    }
    const pins = new THREE.InstancedMesh(pinGeometry, new THREE.MeshStandardMaterial({ map: pinMap, roughness: 0.3, emissive: '#fff2dc', emissiveMap: pinMap, emissiveIntensity: 0.4 }), Math.max(1, pinMatrices.length));
    pins.count = pinMatrices.length;
    pinMatrices.forEach((m, i) => { pins.setMatrixAt(i, m); pins.setColorAt(i, new THREE.Color(pinBright[i] ? '#ffffff' : '#5a5a60')); });
    pins.castShadow = true; pins.frustumCulled = false; add(pins);

    const muralMap = paint(2048, 512, (c, w, h) => {
      const [p0, p1, p2] = pal.stripes, cream = pal.wall;
      c.fillStyle = cream; c.fillRect(0, 0, w, h);
      if (a.mural === 'sunburst') {
        const cx = w * mix(0.35, 0.65, random()), cy = h * 1.05;
        for (let i = 0; i < 26; i++) { c.fillStyle = [p0, p2, p1, cream][i % 4]; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, w * 1.2, Math.PI + i / 26 * Math.PI, Math.PI + (i + 1) / 26 * Math.PI); c.fill(); }
        for (const [r, col] of [[230, p1], [180, p0], [130, p2]] as const) { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); }
      } else if (a.mural === 'mountains') {
        const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, p2); sky.addColorStop(0.7, p0); c.fillStyle = sky; c.fillRect(0, 0, w, h);
        c.fillStyle = cream; c.beginPath(); c.arc(w * mix(0.3, 0.7, random()), h * 0.5, 110, 0, 7); c.fill();
        for (let layer = 0; layer < 3; layer++) { c.fillStyle = [p1, '#4a2a2a', '#241418'][layer]; c.beginPath(); c.moveTo(0, h); let x = 0; while (x < w) { const peak = mix(0.25, 0.6, random()) + layer * 0.15; c.lineTo(x, h * (peak + 0.2)); x += 60 + random() * 160; c.lineTo(x, h * peak); x += 60 + random() * 160; } c.lineTo(w, h); c.fill(); }
      } else if (a.mural === 'space') {
        c.fillStyle = '#1c1a3a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffffff'; for (let i = 0; i < 260; i++) { c.globalAlpha = 0.4 + random() * 0.6; c.fillRect(random() * w, random() * h, 2 + random() * 3, 2 + random() * 3); } c.globalAlpha = 1;
        for (let i = 0; i < 5; i++) { const x = (i + 0.5 + (random() - 0.5) * 0.5) * w / 5, y = h * mix(0.3, 0.7, random()), r = 40 + random() * 90; c.fillStyle = [p0, p1, p2][i % 3]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.2, r * 0.82, 0, 7); c.fill(); if (i % 2 === 0) { c.strokeStyle = cream; c.lineWidth = 9; c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.35, -0.3, 0, 7); c.stroke(); } }
      } else if (a.mural === 'pins') {
        c.fillStyle = p1; c.fillRect(0, 0, w, h); c.fillStyle = p2; c.fillRect(0, h * 0.62, w, h * 0.1); c.fillStyle = p0; c.fillRect(0, h * 0.74, w, h * 0.06);
        for (let i = 0; i < 9; i++) { c.save(); c.translate((i + 0.5) * w / 9, h * mix(0.4, 0.55, random())); c.rotate((random() - 0.5) * 1.6); c.fillStyle = '#fbfaf4'; c.beginPath(); c.ellipse(0, 40, 46, 84, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, -74, 26, 42, 0, 0, 7); c.fill(); c.fillRect(-18, -50, 36, 40); c.fillStyle = '#d8202c'; c.fillRect(-21, -44, 42, 9); c.fillRect(-21, -28, 42, 9); c.restore(); }
        const bx = w * mix(0.2, 0.8, random()); c.fillStyle = '#17171a'; c.beginPath(); c.arc(bx, h * 0.45, 120, 0, 7); c.fill(); c.fillStyle = cream; for (const [dx, dy] of [[-30, -40], [14, -52], [-2, -8]]) { c.beginPath(); c.arc(bx + dx, h * 0.45 + dy, 13, 0, 7); c.fill(); }
        for (let i = 0; i < 16; i++) { c.fillStyle = p2; c.beginPath(); const x = random() * w, y = random() * h * 0.5; for (let k = 0; k < 8; k++) { const r = k % 2 ? 6 : 22, t = k / 8 * 6.283; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.fill(); }
      } else {
        for (let b = 0; b < 48; b++) { c.fillStyle = `hsl(${26 + random() * 8},${38 + random() * 12}%,${30 + random() * 10}%)`; c.fillRect(b * w / 48, 0, w / 48 - 2, h); }
        c.fillStyle = p0; c.fillRect(0, h * 0.42, w, h * 0.12); c.fillStyle = p2; c.fillRect(0, h * 0.56, w, h * 0.04);
      }
      for (let i = 1; i < n; i++) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(w / 2 + (i - n / 2) * PITCH / (wallX * 2) * w - 2, 0, 4, h); }
    });
    const muralLevel = cosmic ? 0.75 * glow : closing ? 0.12 : dead ? 0.22 : 0.42 * glow;
    const mural = add(new THREE.Mesh(new THREE.PlaneGeometry(wallX * 2, MASK_TOP - MASK_BOTTOM), new THREE.MeshStandardMaterial({ map: muralMap, roughness: 0.7, emissive: '#ffffff', emissiveMap: muralMap, emissiveIntensity: muralLevel })));
    mural.position.set(0, (MASK_TOP + MASK_BOTTOM) / 2, MASK_Z + 0.01);
    slab([wallX * 2, MASK_TOP - MASK_BOTTOM, 0.1], [0, (MASK_TOP + MASK_BOTTOM) / 2, MASK_Z - 0.05], flat('#2a2b2e'), false);
    // lane numbers along the bottom edge
    for (let i = 0; i < n; i++) {
      const first = 1 + Math.floor(random() * 3) * 0;
      const plate = s.label(String(first + i), 0.34, 0.26, [laneX(i), MASK_BOTTOM + 0.17, MASK_Z + 0.03], '#ffffff', laneOn[i] ? pal.stripes[0] : '#4a4a50');
      const material = plate.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color('#ffffff'); material.emissiveMap = material.map; material.emissiveIntensity = laneOn[i] ? 0.8 * glow : 0.05; plate.castShadow = false;
    }
    // fascia and the sign
    slab([wallX * 2, CEIL - MASK_TOP, 0.16], [0, (CEIL + MASK_TOP) / 2, MASK_Z + 0.05], flat(wallTone.clone().multiplyScalar(0.75)), false);
    const text = SIGNS[a.sign];
    const missing = mood.wear > 0.55 ? Math.floor(random() * text.replace(/ /g, '').length) : -1;
    const signPixels = Math.min(1024, 110 * text.length + 100);
    const signMap = paint(signPixels, 160, (c, w, h) => {
      c.fillStyle = '#17171c'; c.fillRect(0, 0, w, h);
      c.font = `bold ${Math.min(122, (w - 60) / text.length * 1.5)}px sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
      const total = c.measureText(text).width; let x = (w - total) / 2, seen = 0;
      for (const letter of text) {
        const width = c.measureText(letter).width;
        if (letter !== ' ') { const off = seen++ === missing; c.shadowColor = pal.neon; c.shadowBlur = off ? 0 : 22; c.fillStyle = off ? '#3a3a40' : '#fff6ec'; c.fillText(letter, x, h / 2 + 4); c.shadowBlur = 0; if (!off) { c.strokeStyle = pal.neon; c.lineWidth = 3; c.strokeText(letter, x, h / 2 + 4); } }
        x += width;
      }
    });
    const lowView = a.view === 'low';
    const signWidth = Math.min(wallX * 1.7, (lowView ? 0.66 : 0.82) * signPixels / 160);
    const signMaterial = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: 1.1 * glow });
    const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(signWidth, signWidth * 160 / signPixels), signMaterial));
    sign.position.set(0, lowView ? 3.34 : (CEIL + MASK_TOP) / 2 - 0.02, MASK_Z + 0.14);

    // ---- walls and ceiling
    const wallMap = paint(1024, 256, (c, w, h) => {
      c.fillStyle = '#' + wallTone.getHexString(); c.fillRect(0, 0, w, h);
      pal.stripes.forEach((stripe, i) => { c.fillStyle = stripe; c.globalAlpha = cosmic ? 0.75 : 1; c.fillRect(0, h * (0.5 + i * 0.07), w, h * 0.05); }); c.globalAlpha = 1;
      c.fillStyle = 'rgba(60,40,24,0.55)'; c.fillRect(0, h * 0.74, w, h * 0.26);
      for (let x = 0; x < w; x += 24) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x, h * 0.74, 2, h * 0.26); }
      for (let i = 0; i < 24 * mood.wear; i++) { c.fillStyle = 'rgba(70,60,40,0.18)'; c.fillRect(random() * w, random() * h * 0.7, 20 + random() * 60, 30 + random() * 90); }
    });
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.85, side: THREE.DoubleSide });
    const wallLength = NEAR - FAR + 0.4;
    for (const side of [-1, 1]) {
      const wall = add(new THREE.Mesh(new THREE.PlaneGeometry(wallLength, CEIL), wallMaterial));
      wall.position.set(side * wallX, CEIL / 2, (NEAR + FAR - 0.4) / 2); wall.rotation.y = -side * Math.PI / 2; wall.receiveShadow = true;
      // neon trim tube
      slab([0.05, 0.05, -FAR + APPROACH + 4], [side * (wallX - 0.05), 2.62, (FAR + APPROACH + 4) / 2], lit(pal.neon, (closing ? 0.5 : 1.5) * glow), false);
    }
    const ceilingTone = cosmic ? '#3d3770' : closing ? '#8a8578' : '#cdc7b6';
    const tileMap = paint(128, 128, (c, w, h) => {
      c.fillStyle = ceilingTone; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(random() * w, random() * h, 2, 2); }
      c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h);
    });
    tileMap.wrapS = tileMap.wrapT = THREE.RepeatWrapping; tileMap.repeat.set(wallX * 2 / 1.2, (NEAR - MASK_Z) / 1.2);
    const ceiling = add(new THREE.Mesh(new THREE.PlaneGeometry(wallX * 2, NEAR - MASK_Z).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: tileMap, roughness: 0.95 })));
    ceiling.position.set(0, CEIL, (NEAR + MASK_Z) / 2);
    // light troffers: over the concourse always, over the approach when the house lights are up
    const tubeTint = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.55, 0.86);
    const troffers: { material: THREE.MeshStandardMaterial; base: number; flicker: boolean }[] = [];
    for (const z of [-5.5, -2.2, 1.1, 4.4, 7.6]) for (let i = 0; i < n; i++) {
      const overLanes = z < APPROACH;
      const on = cosmic ? false : overLanes ? !closing && (!dead || laneOn[i]) : true;
      const failed = on && random() < mood.wear * 0.3;
      const base = !on ? 0.02 : (overLanes ? 1.0 : 1.4) * mix(0.75, 1.1, mood.cheer);
      const material = new THREE.MeshStandardMaterial({ color: '#f4f2ea', emissive: tubeTint, emissiveIntensity: base });
      troffers.push({ material, base, flicker: failed });
      slab([0.9, 0.04, 0.3], [laneX(i), CEIL - 0.03, z], material, false);
    }

    // ---- approach furniture: ball returns, monitors, bucket seats
    const ballGeometry = new THREE.SphereGeometry(0.109, 18, 12);
    const rackBalls: { at: [number, number, number]; colour: string }[] = [];
    const houseBalls = ['#d8263c', '#1f8fe8', '#2fa86a', '#f0761c', '#7a35c2', '#17171c', '#f2c12e', '#ff5a9a'];
    const screenMap = paint(256, 128, (c, w, h) => {
      c.fillStyle = '#0c1a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c12e'; c.fillRect(0, 0, w, 18);
      for (let r = 0; r < 4; r++) { c.fillStyle = r === 0 ? '#1f3f8a' : '#12264f'; c.fillRect(2, 24 + r * 26, w - 4, 22); c.fillStyle = '#9fd0ff'; c.fillRect(6, 30 + r * 26, 30, 9); for (let k = 0; k < 10; k++) { c.strokeStyle = '#5f8fe0'; c.strokeRect(44 + k * 21, 26 + r * 26, 19, 18); if (random() < 0.6) { c.fillStyle = random() < 0.25 ? '#ffe14a' : '#ffffff'; c.fillRect(49 + k * 21, 31 + r * 26, 8, 8); } } }
    });
    const screenOn = new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: 1.2 * glow, roughness: 0.3 });
    const screenOff = flat('#22252a', { roughness: 0.3 });
    const housing = s.material(a.palette === 'neon' ? '#2a2a34' : pal.stripes[1], { roughness: 0.5 });
    const chrome = s.material('#d5dadc', { metalness: 0.85, roughness: 0.25 });
    const hump = s.material(pal.stripes[0], { roughness: 0.35 });
    const monitorY = a.view === 'low' ? 2.05 : 2.3;
    for (let i = 0; i + 1 <= n; i += 2) {
      const pair = i + 1 < n, x = pair ? -half + (i + 1) * PITCH : laneX(i) + PITCH / 2 - 0.1;
      // ball return hump and its ring of waiting balls
      const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 6, 12).rotateX(Math.PI / 2), hump)); body.scale.set(1, 1.15, 1); body.position.set(x, 0.14, 0.75); body.castShadow = true;
      slab([0.5, 0.42, 0.62], [x, 0.21, 1.72], hump);
      slab([0.56, 0.03, 0.68], [x, 0.435, 1.72], chrome);
      const waiting = Math.round(mix(1, 6, mood.density) * mix(0.6, 1.1, random()));
      for (let k = 0; k < waiting; k++) rackBalls.push({ at: [x + (k % 2 ? 0.13 : -0.13), 0.55, 1.5 + Math.floor(k / 2) * 0.22], colour: pick(houseBalls) });
      // overhead score monitors
      for (const side of pair ? [-1, 1] : [-1]) {
        const lane = side < 0 ? i : i + 1, mx = x + side * 0.36;
        slab([0.64, 0.5, 0.42], [mx, monitorY, 0.25], housing, false).rotation.x = 0.16;
        const screen = add(new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.4), laneOn[lane] ? screenOn : screenOff)); screen.position.set(mx, monitorY - 0.03, 0.475); screen.rotation.x = 0.16;
      }
      slab([0.05, CEIL - monitorY - 0.23, 0.05], [x, (CEIL + monitorY + 0.23) / 2, 0.2], chrome, false);
      slab([pair ? 1.36 : 0.7, 0.05, 0.05], [pair ? x : x - 0.36, monitorY + 0.26, 0.2], chrome, false);
    }
    const balls = new THREE.InstancedMesh(ballGeometry, new THREE.MeshStandardMaterial({ roughness: 0.15, emissive: '#ffffff', emissiveIntensity: 0 }), Math.max(1, rackBalls.length));
    balls.count = rackBalls.length;
    rackBalls.forEach((ball, i) => { balls.setMatrixAt(i, new THREE.Matrix4().setPosition(...ball.at)); balls.setColorAt(i, new THREE.Color(ball.colour)); });
    balls.castShadow = true; balls.frustumCulled = false; add(balls);

    // bucket seats in a row behind the approach, facing the lanes, with gaps where the aisles and the cast are
    const seatSpots: { x: number; colour: string }[] = [];
    for (let i = 0; i < n; i++) for (const dx of [-0.45, 0.15]) { const x = laneX(i) + dx; if (Math.abs(x - SLOTS[4].x) < 0.5 || Math.abs(x - SLOTS[2].x) < 0.85 || Math.abs(x - SLOTS[3].x) < 0.8) continue; seatSpots.push({ x, colour: pal.seats[seatSpots.length % pal.seats.length] }); }
    const SEAT_Z = 2.85;
    const seats = new THREE.InstancedMesh(shellGeometry(), s.material('#ffffff', { roughness: 0.35, side: THREE.DoubleSide }), seatSpots.length);
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 8), chrome, seatSpots.length);
    seatSpots.forEach((seat, i) => {
      seats.setMatrixAt(i, new THREE.Matrix4().makeRotationY(Math.PI + (random() - 0.5) * 0.06).setPosition(seat.x, 0, SEAT_Z));
      seats.setColorAt(i, new THREE.Color(seat.colour));
      posts.setMatrixAt(i, new THREE.Matrix4().setPosition(seat.x, 0.2, SEAT_Z + 0.03));
    });
    seats.castShadow = posts.castShadow = true; seats.frustumCulled = posts.frustumCulled = false; add(seats); add(posts);
    slab([wallX * 2 - 0.4, 0.05, 0.05], [0, 0.24, SEAT_Z + 0.03], s.material('#6d7378', { metalness: 0.6, roughness: 0.45 }));

    // ---- session dressing
    const spinners: THREE.Object3D[] = [];
    const bobbers: { object: THREE.Object3D; y: number; phase: number }[] = [];
    if (a.session === 'league') {
      const flags = Math.round(n * mix(4, 9, mood.density));
      const pennants = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 0.36, 3, 1).rotateX(Math.PI).scale(1, 1, 0.08), flat('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), flags);
      for (let i = 0; i < flags; i++) { const t = i / (flags - 1), x = mix(-half, half, t); pennants.setMatrixAt(i, new THREE.Matrix4().makeRotationZ((random() - 0.5) * 0.3).setPosition(x, 3.3 - Math.sin(t * Math.PI * n) ** 2 * 0.18, APPROACH - 0.1)); pennants.setColorAt(i, new THREE.Color(pal.stripes[i % 3])); }
      pennants.frustumCulled = false; add(pennants);
      slab([half * 2, 0.012, 0.012], [0, 3.47, APPROACH - 0.1], flat('#f4f1e6'), false);
    }
    if (a.session === 'birthday') {
      const colours = ['#d8263c', '#f2c12e', '#1f8fe8', '#ff5a9a', '#2fa86a', '#7a35c2'];
      const clusters = Math.round(mix(2, 6, mood.density));
      const balloonGeometry = new THREE.SphereGeometry(0.16, 16, 12).scale(1, 1.2, 1);
      const balloonMaterial = flat('#ffffff', { roughness: 0.2 }), ribbon = flat('#f4f1e6');
      for (let k = 0; k < clusters; k++) {
        const seat = seatSpots[Math.floor(random() * seatSpots.length)], group = new THREE.Group();
        group.position.set(seat.x + 0.25, 0.86, SEAT_Z + 0.3);
        for (let b = 0; b < 2 + Math.floor(random() * 3); b++) {
          const height = mood.cheer < 0.2 ? mix(0.05, 0.3, random()) : mix(0.75, 1.35, random()), lean = (random() - 0.5) * 0.5, turn = random() * 6.283;
          const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial.clone()); (balloon.material as THREE.MeshStandardMaterial).color.set(pick(colours));
          balloon.position.set(Math.cos(turn) * lean * height, height + 0.18, Math.sin(turn) * lean * height); balloon.castShadow = true;
          const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), ribbon);
          string.position.copy(balloon.position).multiplyScalar(0.5); string.scale.y = balloon.position.length(); string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), balloon.position.clone().normalize());
          group.add(balloon, string);
        }
        add(group); bobbers.push({ object: group, y: 0, phase: random() * 6 });
      }
      // streamers swagged between the monitors, and bumpers up on one lane
      const swags = new THREE.CatmullRomCurve3(Array.from({ length: n * 2 + 1 }, (_u, i) => new THREE.Vector3(-half + i * PITCH / 2, i % 2 ? 2.2 : 2.6, MASK_Z + 0.2)));
      for (const [dy, colour] of [[0, colours[0]], [-0.08, colours[2]], [-0.16, colours[1]]] as const) { const streamer = add(new THREE.Mesh(new THREE.TubeGeometry(swags, 80, 0.022, 5), flat(colour))); streamer.position.y = dy; streamer.scale.z = 0.3; }
      const bumperLane = laneX(Math.floor(random() * n));
      for (const side of [-1, 1]) { const rail = slab([0.07, 0.09, -DECK - 0.4], [bumperLane + side * (LANE / 2 + 0.115), 0.12, DECK / 2 + 0.1], lit(pick(colours), 0.3 * glow), false); rail.rotation.z = 0; }
    }
    if (cosmic) {
      const mirror = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: '#e8ecf4', metalness: 0.9, roughness: 0.12, flatShading: true, emissive: '#b8a8ff', emissiveIntensity: 0.5 })));
      mirror.position.set(0, CEIL - 0.6, 1.2); spinners.push(mirror);
      slab([0.02, 0.3, 0.02], [0, CEIL - 0.15, 1.2], chrome, false);
      // spots of coloured light thrown round the room
      const dots = Math.round(mix(30, 90, mood.density));
      const flecks = new THREE.InstancedMesh(new THREE.CircleGeometry(0.11, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), dots);
      for (let i = 0; i < dots; i++) {
        const m = new THREE.Matrix4(), surface = random();
        if (surface < 0.5) m.makeRotationX(-Math.PI / 2).setPosition((random() - 0.5) * wallX * 2, 0.012, mix(FAR + 1.5, 8, random()));
        else if (surface < 0.8) { const side = random() < 0.5 ? -1 : 1; m.makeRotationY(-side * Math.PI / 2).setPosition(side * (wallX - 0.02), random() * CEIL, mix(FAR, 6, random())); }
        else m.setPosition((random() - 0.5) * wallX * 2, mix(MASK_BOTTOM, CEIL, random()), MASK_Z + 0.16);
        flecks.setMatrixAt(i, m); flecks.setColorAt(i, new THREE.Color(pick([...pal.figure, '#ffffff', '#8a6cff'])));
      }
      flecks.frustumCulled = false; add(flecks);
    }
    // litter on the carpet when the place is worn or busy
    const cups = Math.round(mood.wear * mood.density * 14);
    if (cups > 0) {
      const litter = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.028, 0.11, 8), flat('#f4f1e6', { roughness: 0.5 }), cups);
      for (let i = 0; i < cups; i++) litter.setMatrixAt(i, new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, random() * 6)).setPosition((random() - 0.5) * wallX * 1.8, 0.04, mix(3.2, 9, random())));
      litter.castShadow = true; litter.frustumCulled = false; add(litter);
    }

    // ---- balls on the lanes
    const rolling: { mesh: THREE.Mesh; speed: number; start: number }[] = [];
    const loose = (lane: number, colour: string) => { const mesh = add(new THREE.Mesh(ballGeometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.15, emissive: colour, emissiveIntensity: cosmic ? 0.7 : 0.05 }))); mesh.castShadow = true; mesh.position.set(laneX(lane) + (random() - 0.5) * 0.6, 0.111, mix(-1, -6.5, random())); return mesh; };
    const playable = laneOn.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    if (a.traffic === 'gutter') { const lane = Math.floor(random() * n), mesh = loose(lane, pick(houseBalls)); mesh.position.set(laneX(lane) + (random() < 0.5 ? -1 : 1) * (LANE / 2 + 0.115), 0.085, mix(-3, -6, random())); }
    else if (a.traffic !== 'quiet' && playable.length) {
      const count = a.traffic === 'busy' ? Math.min(playable.length, 2 + Math.round(mood.density * 2)) : 1;
      const order = playable.slice().sort(() => random() - 0.5);
      for (let k = 0; k < count; k++) { const mesh = loose(order[k], pick(houseBalls)); rolling.push({ mesh, speed: mix(1.2, 5, mood.energy) * mix(0.8, 1.2, random()), start: mesh.position.z }); }
    }

    // ---- stands for small cast: a round laminate pedestal table per slot
    const tableTop = s.material(pal.wall, { roughness: 0.4 }), tableEdge = chrome;
    const stands = SLOTS.map(() => {
      const group = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28).translate(0, -0.5, 0), tableTop);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28), tableEdge);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1, 12).translate(0, 0.5, 0), chrome);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.05, 20).translate(0, 0.025, 0), chrome);
      for (const mesh of [top, rim, post, foot]) mesh.castShadow = mesh.receiveShadow = true;
      group.add(top, rim, post, foot); group.visible = false; add(group);
      return { group, top, rim, post };
    });

    // ---- light
    const level = cosmic ? 0.5 : closing ? 0.62 : dead ? 0.82 : 1;
    const skyTint = cosmic ? new THREE.Color('#9a86ff') : tubeTint;
    root.add(new THREE.HemisphereLight(skyTint, cosmic ? '#4a3f7a' : '#77706a', 1.25 * level));
    const key = new THREE.DirectionalLight(cosmic ? '#d9a8ff' : tubeTint, 1.7 * level);
    key.position.set(-3.5, 10, 10.5); key.target.position.set(0, 0, 3.4);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.03; key.shadow.bias = -0.0004;
    const shadow = key.shadow.camera; shadow.left = -8; shadow.right = 8; shadow.bottom = -8; shadow.top = 8; shadow.near = 1; shadow.far = 34; shadow.updateProjectionMatrix();
    root.add(key, key.target);
    const laneFill = new THREE.DirectionalLight(cosmic ? pal.figure[1] : '#fff0d8', (closing ? 0.15 : 0.6) * level);
    laneFill.position.set(2, 6, -14); laneFill.target.position.set(0, 0, -3); root.add(laneFill, laneFill.target);
    const front = new THREE.DirectionalLight('#f4ecdf', 0.55 * level); front.position.set(1.5, 2.5, 14); front.target.position.set(0, 1, 4); root.add(front, front.target);
    const spot = new THREE.SpotLight(tubeTint, cosmic ? 26 : 14, 9, 0.6, 0.9, 1.3);
    spot.position.set(SLOTS[0].x, CEIL - 0.1, SLOTS[0].z + 0.6); spot.target.position.set(SLOTS[0].x, 0.6, SLOTS[0].z); root.add(spot, spot.target);

    const view = VIEWS[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.3, 60);
    camera.position.set(view.at[0], view.at[1], view.at[2]);
    camera.lookAt(view.to[0], view.to[1], view.to[2]);

    const place = (items: readonly Placeable[]) => {
      for (const stand of stands) stand.group.visible = false;
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length], stand = stands[index % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // true size when it fits, shrunk when it does not; small props grow a little and go on a table
        const scale = Math.min(fit, Math.max(1, Math.min(0.5 / height, 3))) * (item.hero ? 1 : 0.95);
        const small = height * scale < 0.75 && radius * scale < 0.55;
        let y = 0;
        if (small) {
          y = THREE.MathUtils.clamp(1.05 - height * scale * 0.5, 0.6, 0.9);
          const r = Math.min(slot.r, Math.max(0.32, radius * scale + 0.08));
          stand.group.visible = true; stand.group.position.set(slot.x, 0, slot.z);
          stand.top.scale.set(r, 0.035, r); stand.top.position.y = y;
          stand.rim.scale.set(r + 0.012, 0.02, r + 0.012); stand.rim.position.y = y - 0.018;
          stand.post.scale.y = y - 0.03;
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, y, slot.z);
        item.holder.rotation.y = (slot.x > 0.5 ? -0.3 : slot.x < -0.5 ? 0.3 : 0) + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.5, 2, mood.energy);
    return {
      object: root, camera, background: wallTone.clone().multiplyScalar(0.9), capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(dt, time) {
        for (const ball of rolling) {
          ball.mesh.position.z -= ball.speed * dt; ball.mesh.rotation.x -= ball.speed * dt / 0.109;
          if (ball.mesh.position.z < DECK - 0.4) ball.mesh.position.z = -0.3;
        }
        for (const spinner of spinners) spinner.rotation.y = time * 0.5 * pace;
        for (const bob of bobbers) { bob.object.rotation.z = Math.sin(time * 0.8 * pace + bob.phase) * 0.06; bob.object.rotation.x = Math.cos(time * 0.6 * pace + bob.phase) * 0.05; }
        for (const troffer of troffers) if (troffer.flicker) troffer.material.emissiveIntensity = troffer.base * (Math.sin(time * 29 * pace) * Math.sin(time * 6.7) > 0.2 ? 0.15 : 1);
        signMaterial.emissiveIntensity = 1.1 * glow * (mood.wear > 0.5 && Math.sin(time * 13) * Math.sin(time * 3.1) > 0.7 ? 0.5 : 1);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
