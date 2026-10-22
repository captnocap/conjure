import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

type P = [number, number, number];
type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(width: number, height: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** Many boxes (or any one geometry) in a single draw call. */
class Batch {
  private list: THREE.Matrix4[] = [];
  constructor(private material: THREE.Material, private geometry: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1), private shadow = true) {}
  add(size: P, at: P, turn: P = [0, 0, 0], parent?: THREE.Matrix4) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...size));
    this.list.push(parent ? parent.clone().multiply(m) : m);
    return this;
  }
  build(root: THREE.Object3D) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, Math.max(1, this.list.length));
    mesh.count = this.list.length;
    this.list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = this.shadow;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }
}

const CARPETS = {
  navy: 'Navy with scattered confetti flecks of teal and orange, an eighties refit.',
  teal: 'Teal with a crossing geometric pattern, a carpet people photograph their shoes on.',
  stripe: 'Grey with long ochre and rust stripes running toward the gate.',
  burgundy: 'Burgundy with small gold diamonds, a flag-carrier lounge gone tired.',
  oatmeal: 'Plain oatmeal loop pile, worn pale along the walking line.',
  purple: 'Purple and charcoal swirls, loud even in the dark.',
} as const;
const TAILS = {
  red: 'Red with a white circle.',
  blue: 'Deep blue with a pale sweeping bird.',
  white: 'Plain unmarked white, a charter or a ghost.',
  orange: 'Budget orange.',
  green: 'Green with a gold band.',
  black: 'Black with a silver stripe.',
} as const;
const TAIL: Record<keyof typeof TAILS, [string, string]> = { red: ['#c8322c', '#f4f1ea'], blue: ['#24468f', '#bcd6f2'], white: ['#e6e8ea', '#d2d6da'], orange: ['#ee7a1c', '#ffffff'], green: ['#23764a', '#d9b548'], black: ['#26282d', '#c9ced2'] };

export default defineWorld({
  questions: {
    carpet: choice('What is the carpet like?', CARPETS),
    outside: choice('What is beyond the glass?', {
      fin: 'A clear night: one parked aircraft, its tail fin floodlit, blue taxiway lights running away.',
      empty: 'No aircraft at all: an empty stand and blue lights receding to nothing.',
      rain: 'Rain running down the glass, every apron light smeared into a long reflection.',
      fog: 'Fog: the tail fin a grey ghost, only the nearest lights surviving.',
      dawn: 'The first band of dawn behind the tail fin, which stands in silhouette.',
      snow: 'Snow falling on a whitened apron, a de-icing truck flashing amber by the tail.',
    }),
    tail: choice('If an aircraft is parked outside, what is on its tail?', TAILS),
    lights: choice('Which ceiling lights are on?', {
      half: 'The near half is dimmed for the night; only the gate end is lit.',
      alternate: 'Every other panel is switched off, a chequer of light down the hall.',
      gate: 'Everything is dark except the two panels over the gate door.',
      all: 'All of them, harsh and shadowless, as if it were noon.',
      flicker: 'Nearly all dimmed, and one panel mid-hall is flickering.',
      window: 'Only the row along the glass is lit, the rest of the hall left in dusk.',
    }),
    gate: choice('What is happening at the gate door?', {
      closed: 'Closed: the doors shut, the sign still lit, a belt drawn across.',
      open: 'Open: the doors pinned back on a glowing jet bridge, nobody there to stop you.',
      final: 'A final call: the doors open, a red screen and a flashing lamp.',
      dark: 'Dark: sign off, doors locked, only a green exit light.',
    }),
    screens: choice('What do the hanging monitors show?', {
      list: 'A calm list of morning departures in white on blue.',
      cancelled: 'Row after row in red: CANCELLED.',
      nosignal: 'A flat blue NO SIGNAL.',
      onerow: 'A black screen with a single flight left on it.',
      advert: 'A looping advert of a beach in full sun.',
      off: 'Nothing. They have been switched off.',
    }),
    wall: choice('What is on the wall opposite the windows?', {
      vending: 'Two vending machines glowing by themselves.',
      cafe: 'A café kiosk with its roller shutter down.',
      advert: 'A huge backlit advert for somewhere warm.',
      dutyfree: 'A duty-free shopfront, dark but for its lit shelves.',
      phones: 'A row of old payphones under little hoods.',
    }),
    left: choice('Who or what has been left in the seating?', {
      nobody: 'Nobody and nothing.',
      sleeper: 'One traveller asleep across the seats under a coat, shoes on the carpet.',
      camp: 'A family camped on the floor by the window: blankets, bags and a soft toy.',
      luggage: 'Unattended luggage: a few cases standing by an empty seat.',
      cleaner: 'The cleaner has been through: a yellow wet-floor sign and a mop bucket.',
      cups: 'Only the litter of a long delay: cups, a pizza box, newspapers.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const GLASS = -5.2, RIGHT = 4, NEAR = 9.5, FAR = -10, CEIL = 4.2, APRON = -0.4;
    const hallW = RIGHT - GLASS, hallMid = (RIGHT + GLASS) / 2, hallL = NEAR - FAR, hallZ = (NEAR + FAR) / 2;
    const aircraft = a.outside !== 'empty';
    const glowUp = mix(0.8, 1.15, mood.cheer);

    const sky = new THREE.Color('#4d5a78').lerp(new THREE.Color('#6b5f7a'), mood.warmth * 0.7).multiplyScalar(mix(0.92, 1.1, mood.cheer));
    if (a.outside === 'fog') sky.lerp(new THREE.Color('#8b92a0'), 0.55);
    if (a.outside === 'snow') sky.lerp(new THREE.Color('#7f8798'), 0.4);
    if (a.outside === 'dawn') sky.lerp(new THREE.Color('#6f6f92'), 0.4);
    const background = sky.clone();

    // Which ceiling panels are lit.
    const panelX = [-3.6, -0.7, 2.2], panelZ = [6, 3.6, 1.2, -1.2, -3.6, -6, -8.4];
    const flickerAt = [1, 3];
    const isLit = (ix: number, iz: number) =>
      a.lights === 'all' ? true : a.lights === 'half' ? iz >= 4 : a.lights === 'alternate' ? (ix + iz) % 2 === 0 : a.lights === 'gate' ? iz === 6 && ix < 2 : a.lights === 'window' ? ix === 0 : (ix === 2 && iz === 6) || (ix === flickerAt[0] && iz === flickerAt[1]);
    let litCount = 0;
    panelX.forEach((_x, ix) => panelZ.forEach((_z, iz) => { if (isLit(ix, iz) && random() >= mood.wear * 0.18) litCount += 1; }));
    const bright = litCount / 21;

    // Light.
    const lampTint = new THREE.Color('#dfe8ff').lerp(new THREE.Color('#ffe2b8'), mood.warmth);
    root.add(new THREE.HemisphereLight(new THREE.Color('#b9c3e0').lerp(lampTint, 0.4), '#6a6058', mix(0.95, 1.45, bright) * mix(0.92, 1.08, mood.cheer)));
    const key = new THREE.DirectionalLight(lampTint, mix(0.9, 1.7, bright));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0003; key.shadow.radius = 5;
    root.add(key, key.target);
    const doorGlow = new THREE.PointLight(a.gate === 'final' ? '#ffb070' : '#ffe6c0', a.gate === 'open' || a.gate === 'final' ? 22 : a.gate === 'closed' ? 6 : 1.5, 12, 1.6);
    doorGlow.position.set(-2, 2.2, FAR + 1.6);
    root.add(doorGlow);

    // Carpet.
    const carpetMap = paint(256, 256, (c, w, h) => {
      const base = { navy: '#34416a', teal: '#2f7f7c', stripe: '#787c84', burgundy: '#7a3340', oatmeal: '#a89e88', purple: '#5a4478' }[a.carpet];
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      if (a.carpet === 'navy') for (let i = 0; i < 90; i++) { c.fillStyle = ['#3fb0a8', '#e8853a', '#d9d2b8', '#5a6ab0'][i % 4]; c.save(); c.translate(random() * w, random() * h); c.rotate(random() * 3); c.fillRect(-7, -2, 14, 4); c.restore(); }
      else if (a.carpet === 'teal') { c.strokeStyle = '#1f4f5a'; c.lineWidth = 10; for (let i = -1; i < 3; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128 + 256, 256); c.moveTo(i * 128 + 256, 0); c.lineTo(i * 128, 256); c.stroke(); } c.fillStyle = '#e06a4a'; for (const [x, y] of [[64, 64], [192, 192], [64, 192], [192, 64]]) c.fillRect(x - 9, y - 9, 18, 18); c.fillStyle = '#c9d8c0'; c.fillRect(119, 119, 18, 18); }
      else if (a.carpet === 'stripe') { for (const [x, wd, col] of [[20, 26, '#c08a3a'], [70, 8, '#8a4a34'], [120, 40, '#63676f'], [190, 12, '#c08a3a'], [226, 6, '#d8d2c0']] as const) { c.fillStyle = col; c.fillRect(x, 0, wd, h); } }
      else if (a.carpet === 'burgundy') { c.fillStyle = '#d0a548'; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { const cx = x * 64 + (y % 2 ? 32 : 0) + 16, cy = y * 64 + 32; c.beginPath(); c.moveTo(cx, cy - 11); c.lineTo(cx + 8, cy); c.lineTo(cx, cy + 11); c.lineTo(cx - 8, cy); c.fill(); } }
      else if (a.carpet === 'oatmeal') { for (let i = 0; i < 1400; i++) { c.fillStyle = random() < 0.5 ? 'rgba(70,62,48,0.18)' : 'rgba(255,250,235,0.16)'; c.fillRect(random() * w, random() * h, 3, 3); } }
      else { c.strokeStyle = '#2e2c3a'; c.lineWidth = 14; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc((i % 2) * 256, Math.floor(i / 2) * 256, 96, 0, 7); c.stroke(); c.beginPath(); c.arc(128, 128, 30 + i * 28, i, i + 2.4); c.stroke(); } c.fillStyle = '#c05a8a'; c.beginPath(); c.arc(128, 128, 12, 0, 7); c.fill(); }
    });
    carpetMap.wrapS = carpetMap.wrapT = THREE.RepeatWrapping;
    carpetMap.repeat.set(hallW / 1.6, hallL / 1.6);
    const floor = s.mesh(new THREE.PlaneGeometry(hallW, hallL), new THREE.MeshStandardMaterial({ map: carpetMap, roughness: 1 }), [hallMid, 0, hallZ]);
    floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    // The worn walking line, stains, and pools of light under the panels that are still on.
    const decal = (colour: string, opacity: number, size: [number, number], at: [number, number], blending: THREE.Blending = THREE.NormalBlending) => {
      const map = paint(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, opacity, depthWrite: false, blending }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(at[0], 0.012, at[1]); mesh.renderOrder = 1;
      root.add(mesh);
      return mesh;
    };
    decal('#d8d0c0', 0.1 + mood.wear * 0.22, [2.2, hallL], [0.4, hallZ]);
    for (let k = 0; k < Math.round(mood.wear * 7); k++) decal('#2a2420', 0.3 + random() * 0.2, [0.5 + random() * 1.2, 0.4 + random()], [mix(GLASS + 1, RIGHT - 0.6, random()), mix(5, FAR + 1, random())]);

    // Shell: right wall, far wall, ceiling, window sill and header.
    const wallTint = new THREE.Color('#8b909c').lerp(sky, 0.25);
    const wall = s.material(wallTint, { roughness: 0.95 });
    const trim = s.material(new THREE.Color('#5b606c').lerp(sky, 0.2), { roughness: 0.8 });
    const steel = s.material('#9aa1a8', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#1f2227', { roughness: 0.6 });
    const walls = new Batch(wall), trims = new Batch(trim), steels = new Batch(steel), darks = new Batch(dark);
    walls.add([0.3, CEIL, hallL], [RIGHT + 0.15, CEIL / 2, hallZ]);
    walls.add([hallW + 0.6, CEIL, 0.3], [hallMid, CEIL / 2, FAR - 0.15]);
    trims.add([0.06, 0.14, hallL], [RIGHT - 0.03, 0.07, hallZ]);
    trims.add([hallW, 0.14, 0.06], [hallMid, 0.07, FAR + 0.03]);
    trims.add([0.5, 0.28, hallL], [GLASS - 0.1, 0.14, hallZ]);
    trims.add([0.5, 0.45, hallL], [GLASS - 0.1, CEIL - 0.225, hallZ]);
    for (let z = NEAR; z >= FAR; z -= 2.4) steels.add([0.1, CEIL - 0.7, 0.16], [GLASS, 0.28 + (CEIL - 0.7) / 2, z]);
    steels.add([0.06, 0.06, hallL], [GLASS, 1.05, hallZ]);
    const ceilMap = paint(128, 128, (c, w, h) => { c.fillStyle = '#9096a4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#737988'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); });
    ceilMap.wrapS = ceilMap.wrapT = THREE.RepeatWrapping; ceilMap.repeat.set(hallW / 0.6, hallL / 0.6);
    const ceiling = s.mesh(new THREE.PlaneGeometry(hallW + 0.6, hallL), new THREE.MeshStandardMaterial({ map: ceilMap, color: new THREE.Color('#ffffff').lerp(sky, 0.2), emissive: sky, emissiveIntensity: 0.38, roughness: 1 }), [hallMid, CEIL, hallZ]);
    ceiling.rotation.x = Math.PI / 2; ceiling.castShadow = false;
    // A ceiling tile or two missing where the place is falling apart.
    for (let k = 0; k < Math.round(mood.wear * 4); k++) darks.add([0.6, 0.02, 0.6], [mix(GLASS + 1, RIGHT - 1, random()), CEIL - 0.005, mix(4, FAR + 1, random())]);

    const litMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: lampTint, emissiveIntensity: 1.7 * glowUp, roughness: 0.6 });
    const dimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4f5666').lerp(sky, 0.3), emissive: '#93a0c0', emissiveIntensity: 0.06, roughness: 0.6 });
    const litPanels = new Batch(litMat, undefined, false), dimPanels = new Batch(dimMat, undefined, false);
    let flickerPanel: THREE.Mesh | null = null, flickerPool: THREE.Mesh | null = null;
    panelX.forEach((x, ix) => panelZ.forEach((z, iz) => {
      const on = isLit(ix, iz) && random() >= mood.wear * 0.18;
      if (a.lights === 'flicker' && ix === flickerAt[0] && iz === flickerAt[1]) {
        flickerPanel = s.box([1.2, 0.04, 0.6], [x, CEIL - 0.02, z], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: lampTint, emissiveIntensity: 1.2, roughness: 0.6 }));
        flickerPanel.castShadow = false;
        flickerPool = decal('#' + lampTint.getHexString(), 0.2, [3.4, 3], [x, z], THREE.AdditiveBlending);
        return;
      }
      (on ? litPanels : dimPanels).add([1.2, 0.04, 0.6], [x, CEIL - 0.02, z]);
      if (on) decal('#' + lampTint.getHexString(), 0.2, [3.4, 3], [x, z], THREE.AdditiveBlending);
    }));
    litPanels.build(root); dimPanels.build(root);

    // Glass, with whatever the weather has put on it.
    const glassMap = a.outside === 'rain' ? paint(512, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { const x = random() * w, y = random() * h, len = 10 + random() * 60; c.strokeStyle = `rgba(215,230,255,${0.25 + random() * 0.45})`; c.lineWidth = 1 + random() * 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 5, y + len); c.stroke(); c.fillStyle = 'rgba(230,240,255,0.7)'; c.beginPath(); c.arc(x, y + len, 1.6 + random() * 1.6, 0, 7); c.fill(); }
    }) : null;
    if (glassMap) { glassMap.wrapS = THREE.RepeatWrapping; glassMap.repeat.set(4, 1); }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(hallL, CEIL - 0.7), new THREE.MeshBasicMaterial({ color: glassMap ? '#ffffff' : '#a9c4e0', map: glassMap, transparent: true, opacity: glassMap ? 0.9 : 0.07, depthWrite: false }));
    glass.rotation.y = Math.PI / 2; glass.position.set(GLASS + 0.02, 0.28 + (CEIL - 0.7) / 2, hallZ); glass.renderOrder = 5;
    root.add(glass);

    // Outside: apron, horizon glow, taxiway lights, a far pier, and the tail.
    const apronTint = a.outside === 'snow' ? new THREE.Color('#a9b0bd') : new THREE.Color('#475062').lerp(sky, 0.35);
    const apron = s.mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: apronTint, roughness: a.outside === 'rain' ? 0.25 : 0.95, metalness: a.outside === 'rain' ? 0.5 : 0 }), [-120, APRON, -120]);
    apron.rotation.x = -Math.PI / 2; apron.castShadow = false;
    const dawnAmount = a.outside === 'dawn' ? 1 : a.outside === 'fog' || a.outside === 'snow' ? 0.15 : mix(0.3, 0.5, 1 - Math.abs(mood.daylight - 0.5) * 2);
    const horizon = paint(8, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, h, 0, 0);
      const warm = new THREE.Color('#ffb27a').lerp(new THREE.Color('#ffd9a0'), mood.warmth);
      const rgb = `${Math.round(warm.r * 255)},${Math.round(warm.g * 255)},${Math.round(warm.b * 255)}`;
      g.addColorStop(0, `rgba(${rgb},${0.95 * dawnAmount})`); g.addColorStop(0.1, `rgba(${rgb},${0.6 * dawnAmount})`); g.addColorStop(0.3, `rgba(190,170,210,${0.3 * dawnAmount})`); g.addColorStop(1, 'rgba(120,130,170,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(230, 230, 90, 40, 1, true), new THREE.MeshBasicMaterial({ map: horizon, transparent: true, depthWrite: false, side: THREE.BackSide }));
    dome.position.set(0, APRON + 45, 0); dome.renderOrder = -2;
    root.add(dome);

    type Dot = { at: P; size: number; color: string };
    const dots: Dot[] = [];
    const veil = a.outside === 'fog';
    const lamp = (x: number, z: number, color: string, size = 0.16, y = APRON + 0.15) => { if (veil && Math.hypot(x - GLASS, z) > 34) return; dots.push({ at: [x, y, z], size, color }); };
    // Taxiway edge in blue, centreline in green, stand markers in amber.
    for (let i = 0; i < 26; i++) { const z = 2 - i * 5; lamp(-11.5, z, '#4d86ff', 0.24 + i * 0.016); lamp(-21, z - 2.5, '#4d86ff', 0.28 + i * 0.016); }
    for (let i = 0; i < 16; i++) lamp(-16, -2 - i * 8, '#48e08a', 0.2 + i * 0.02);
    for (let i = 0; i < 14; i++) lamp(-26 - i * 7, -28 - i * 1.5, '#4d86ff', 0.34 + i * 0.03);
    for (let i = 0; i < 14; i++) lamp(-30 - i * 7, -70 - i * 4, '#4d86ff', 0.45 + i * 0.03);
    for (let i = 0; i < 10; i++) lamp(-50 - random() * 110, -80 - random() * 110, random() < 0.3 ? '#ff5a4a' : '#ffe9c0', 0.4, APRON + 2 + random() * 10);
    s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), dots).castShadow = false;
    const halo = s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: veil ? 0.3 : 0.26, depthWrite: false }), dots.map((d) => ({ at: d.at, size: d.size * (veil ? 7 : 3.4), color: d.color })));
    halo.castShadow = halo.receiveShadow = false; halo.frustumCulled = false;
    if (a.outside === 'rain') {
      // Each light dragged into a long wet reflection toward the terminal.
      const streak = new Batch(new THREE.MeshBasicMaterial({ color: '#7fa6ff', transparent: true, opacity: 0.3, depthWrite: false }), undefined, false);
      for (const d of dots) if (d.at[1] < APRON + 1) streak.add([0.22, 0.01, 5 + random() * 4], [d.at[0] + 2.2, APRON + 0.02, d.at[2] + 1.6], [0, 0.95, 0]);
      streak.build(root);
    }
    // A far pier with a few lit windows.
    const pierMap = paint(256, 32, (c, w, h) => { c.fillStyle = '#3d4456'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) if (random() < 0.45) { c.fillStyle = random() < 0.7 ? '#ffe2a8' : '#bfe0ff'; c.fillRect(i * 6.4 + 1, 12, 4.4, 7); } });
    const pier = s.mesh(new THREE.PlaneGeometry(80, 6), new THREE.MeshBasicMaterial({ map: pierMap, transparent: veil, opacity: veil ? 0.18 : 1, depthWrite: !veil }), [-120, APRON + 3, -150]);
    pier.rotation.y = 0.75; pier.castShadow = false;

    let beacon: THREE.MeshBasicMaterial | null = null, truckLamp: THREE.MeshBasicMaterial | null = null;
    if (aircraft) {
      const [paintTint, mark] = TAIL[a.tail];
      const silhouette = a.outside === 'dawn', ghost = a.outside === 'fog';
      const lit = silhouette ? 0.02 : ghost ? 0.2 : 0.55;
      const skin = (colour: string) => {
        const tint = new THREE.Color(colour);
        if (silhouette) tint.multiplyScalar(0.3);
        if (ghost) tint.lerp(sky, 0.72);
        return new THREE.MeshStandardMaterial({ color: tint, emissive: ghost ? sky : tint, emissiveIntensity: lit, roughness: 0.5 });
      };
      const plane = new THREE.Group();
      plane.position.set(-31.8, APRON, -47.4);
      plane.rotation.y = 0.45;
      root.add(plane);
      const put = (mesh: THREE.Mesh, at: P) => { mesh.position.set(...at); mesh.castShadow = false; plane.add(mesh); return mesh; };
      const body = put(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 40, 20), skin('#e4e7ea')), [21, 4.4, 0]);
      body.rotation.z = Math.PI / 2;
      const cone = put(new THREE.Mesh(new THREE.ConeGeometry(2, 7.5, 20), skin('#e4e7ea')), [-2.7, 4.75, 0]);
      cone.rotation.z = Math.PI / 2; cone.scale.set(1, 1, 0.9);
      const belly = put(new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 3.4), skin(paintTint)), [21, 3.0, 0]);
      belly.visible = a.tail !== 'white';
      const finShape = new THREE.Shape();
      [[6.4, 0], [-1.6, 0], [-5.2, 7.6], [-2.6, 7.6]].forEach(([x, y], i) => (i ? finShape.lineTo(x, y) : finShape.moveTo(x, y)));
      put(new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.45, bevelEnabled: false }), skin(paintTint)), [0.5, 6.1, -0.225]);
      // The mark on the fin, both sides.
      for (const side of [1, -1]) {
        const emblem = paint(128, 128, (c) => {
          c.clearRect(0, 0, 128, 128); c.fillStyle = mark;
          if (a.tail === 'red' || a.tail === 'orange') { c.beginPath(); c.arc(64, 64, 46, 0, 7); c.fill(); }
          else if (a.tail === 'blue') { c.beginPath(); c.moveTo(10, 92); c.quadraticCurveTo(70, 70, 120, 16); c.quadraticCurveTo(90, 86, 40, 112); c.closePath(); c.fill(); }
          else if (a.tail === 'white') { c.globalAlpha = 0.5; c.fillRect(20, 58, 88, 10); }
          else { c.save(); c.translate(64, 64); c.rotate(-0.44); c.fillRect(-90, -14, 180, 28); c.restore(); }
        });
        const tintOf = new THREE.Color('#ffffff'); if (silhouette) tintOf.multiplyScalar(0.3); if (ghost) tintOf.lerp(sky, 0.7);
        const badge = put(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: emblem, color: tintOf, transparent: true, depthWrite: false, opacity: ghost ? 0.4 : 1 })), [-0.4, 9.6, side * 0.24]);
        badge.rotation.y = side === 1 ? 0 : Math.PI;
      }
      for (const side of [1, -1]) {
        const stab = put(new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 6.4), skin('#dfe2e6')), [-0.6, 5.3, side * 4.2]);
        stab.rotation.y = side * 0.42; stab.rotation.x = side * -0.08;
      }
      if (a.outside === 'snow') { const cap = put(new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: '#f1f4f8', emissive: '#c8d0e0', emissiveIntensity: 0.4 })), [21, 6.3, 0]); cap.receiveShadow = false; }
      beacon = new THREE.MeshBasicMaterial({ color: '#ff3a30' });
      put(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), beacon), [-3.9, 13.9, 0]);
      // Floodlight mast washing the tail.
      if (!silhouette) {
        const mastAt: P = [-25, APRON, -33];
        steels.add([0.35, 11, 0.35], [mastAt[0], APRON + 5.5, mastAt[2]]);
        steels.add([2.6, 0.5, 0.5], [mastAt[0], APRON + 11.2, mastAt[2]], [0, 0.6, 0]);
        const flood = s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3d8' }), [-0.9, 0, 0.9].map((dx) => ({ at: [mastAt[0] + dx * 0.8, APRON + 11.1, mastAt[2] - dx * 0.5] as P, size: 0.3 })));
        flood.castShadow = false;
        const wash = s.scatter(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff0d0', transparent: true, opacity: ghost ? 0.3 : 0.16, depthWrite: false }), [{ at: [mastAt[0], APRON + 11.1, mastAt[2]], size: ghost ? 5 : 2.6 }]);
        wash.castShadow = false; wash.frustumCulled = false;
      }
      if (a.outside === 'snow') {
        const truck = new THREE.Group();
        truck.position.set(-22, APRON, -30); truck.rotation.y = 0.5;
        root.add(truck);
        const part = (size: P, at: P, colour: string) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.3, roughness: 0.6 })); m.position.set(...at); truck.add(m); return m; };
        part([5.5, 1.8, 2.3], [0, 1.6, 0], '#e8a21c'); part([1.8, 1.5, 2.2], [3.2, 1.5, 0], '#d8dade');
        const boom = part([6.5, 0.3, 0.3], [-1, 4.4, 0], '#c9ccd0'); boom.rotation.z = -0.55;
        part([1.1, 1.1, 1.1], [-3.8, 6.4, 0], '#e8a21c');
        truckLamp = new THREE.MeshBasicMaterial({ color: '#ffb020' });
        const tl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), truckLamp); tl.position.set(3.2, 2.6, 0); truck.add(tl);
      }
    }
    if (a.outside === 'snow') {
      const flakes: { at: P; size: number }[] = [];
      for (let i = 0; i < 420; i++) flakes.push({ at: [GLASS - 0.6 - random() * 40, APRON + random() * 14, 2 - random() * 60], size: 0.035 + random() * 0.07 });
      s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: '#f4f7ff' }), flakes).castShadow = false;
    }
    if (veil) for (const [x, op] of [[GLASS - 6, 0.34], [GLASS - 14, 0.42], [GLASS - 26, 0.5]] as const) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(260, 60), new THREE.MeshBasicMaterial({ color: sky, transparent: true, opacity: op, depthWrite: false }));
      sheet.rotation.y = Math.PI / 2 - 0.3; sheet.position.set(x, 10, -60); sheet.renderOrder = 2;
      root.add(sheet);
    }

    // Seating: beam rows running toward the gate, all in a handful of draw calls.
    const padTint = { navy: '#2b2e36', teal: '#27303a', stripe: '#33528f', burgundy: '#2a2c30', oatmeal: '#3a4a5c', purple: '#2c2f36' }[a.carpet];
    const pads = new Batch(s.material(padTint, { roughness: 0.55 }));
    const frames = new Batch(s.material('#aab0b6', { metalness: 0.75, roughness: 0.38 }));
    const seatSpots: { x: number; z: number; face: number }[] = [];
    const rows: [number, number][] = [[-3.65, -1], [-3.1, 1]];
    const unitZ = [6.3, 2.4, -1.5];
    for (const [x, face] of rows) for (const zc of unitZ) {
      const turn = face * Math.PI / 2;
      const base = new THREE.Matrix4().makeRotationY(turn).setPosition(x, 0, zc);
      frames.add([2.9, 0.07, 0.09], [0, 0.33, 0], [0, 0, 0], base);
      for (const lx of [-1.1, 1.1]) { frames.add([0.06, 0.3, 0.1], [lx, 0.17, 0], [0, 0, 0], base); frames.add([0.08, 0.035, 0.62], [lx, 0.018, 0.04], [0, 0, 0], base); }
      for (let i = 0; i < 5; i++) {
        const lx = (i - 2) * 0.6;
        frames.add([0.54, 0.03, 0.5], [lx, 0.405, 0.24], [0.06, 0, 0], base);
        pads.add([0.48, 0.07, 0.44], [lx, 0.445, 0.245], [0.06, 0, 0], base);
        frames.add([0.54, 0.52, 0.03], [lx, 0.72, -0.075], [-0.24, 0, 0], base);
        pads.add([0.48, 0.44, 0.06], [lx, 0.74, -0.04], [-0.24, 0, 0], base);
        frames.add([0.05, 0.03, 0.4], [lx - 0.3, 0.645, 0.24], [0, 0, 0], base);
        frames.add([0.025, 0.3, 0.025], [lx - 0.3, 0.49, 0.2], [0.12, 0, 0], base);
        // World position of this seat, for whatever gets left on it.
        const p = new THREE.Vector3(lx, 0, 0.24).applyMatrix4(base);
        seatSpots.push({ x: p.x, z: p.z, face });
      }
      frames.add([0.05, 0.03, 0.4], [1.5, 0.645, 0.24], [0, 0, 0], base);
      frames.add([0.025, 0.3, 0.025], [1.5, 0.49, 0.2], [0.12, 0, 0], base);
    }
    pads.build(root); frames.build(root);

    // Hanging monitors over the seating.
    const screenText = (lines: [string, string, string][], bg: string, title: string) => paint(512, 288, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff'; c.font = 'bold 30px sans-serif'; c.textBaseline = 'middle'; c.fillText(title, 16, 26);
      c.font = 'bold 26px monospace';
      lines.forEach(([time, city, state], i) => {
        const y = 70 + i * 36;
        c.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'; c.fillRect(0, y - 17, w, 34);
        c.fillStyle = '#ffffff'; c.fillText(time, 16, y); c.fillText(city, 110, y);
        c.fillStyle = state === 'CANCELLED' ? '#ff5548' : state === 'DELAYED' ? '#ffb53a' : '#7df0a0'; c.fillText(state, 340, y);
      });
    });
    const cities = ['LISBON', 'OSLO', 'DENVER', 'NAIROBI', 'SEOUL', 'LIMA', 'DUBAI', 'TORONTO', 'ATHENS', 'PERTH'];
    const flights = (state: () => string, n = 6): [string, string, string][] => Array.from({ length: n }, (_u, i) => [`0${5 + Math.floor(i / 2)}:${String((i % 2) * 30 + Math.floor(random() * 3) * 5 + 10).padStart(2, '0')}`, cities[Math.floor(random() * cities.length)], state()]);
    const monitorMap = a.screens === 'list' ? screenText(flights(() => (random() < 0.18 ? 'DELAYED' : 'ON TIME')), '#173a7a', 'DEPARTURES')
      : a.screens === 'cancelled' ? screenText(flights(() => 'CANCELLED'), '#1a1c22', 'DEPARTURES')
      : a.screens === 'onerow' ? screenText(flights(() => 'GATE CLOSED', 1), '#0c0d10', '')
      : a.screens === 'nosignal' ? paint(512, 288, (c, w, h) => { c.fillStyle = '#1438c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('NO SIGNAL', w / 2, h / 2 + 12); })
      : a.screens === 'advert' ? paint(512, 288, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#49b8f0'); g.addColorStop(0.55, '#bfe8f8'); g.addColorStop(0.56, '#25a9b8'); g.addColorStop(0.75, '#f3dfa8'); g.addColorStop(1, '#f0d290'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(400, 70, 38, 0, 7); c.fill(); c.fillStyle = '#ffffff'; c.font = 'bold 44px sans-serif'; c.fillText('YOU COULD BE HERE', 22, 250, 470); })
      : null;
    const monitorMat = monitorMap ? new THREE.MeshStandardMaterial({ map: monitorMap, emissive: '#ffffff', emissiveMap: monitorMap, emissiveIntensity: 0.95 * glowUp, roughness: 0.3 }) : new THREE.MeshStandardMaterial({ color: '#14161a', roughness: 0.25 });
    for (const [mx, mz] of [[0.3, -2.2], [1.65, -2.2]] as const) {
      darks.add([1.22, 0.72, 0.09], [mx, 2.55, mz]);
      steels.add([0.05, CEIL - 2.9, 0.05], [mx, (CEIL + 2.9) / 2, mz - 0.02]);
      const face = s.mesh(new THREE.PlaneGeometry(1.14, 0.64), monitorMat, [mx, 2.55, mz + 0.047]);
      face.castShadow = false;
    }
    if (monitorMap) { const spill = new THREE.PointLight(a.screens === 'cancelled' ? '#ff7a6a' : a.screens === 'advert' ? '#ffe9b0' : '#8fb4ff', 5, 7, 1.8); spill.position.set(1, 2.3, -1.4); root.add(spill); }

    // The gate: door, number, screen and a bare counter.
    const DX = -2, doorW = 2.1, doorH = 2.35;
    const open = a.gate === 'open' || a.gate === 'final';
    const gateNo = ['A1', 'B14', 'C27', 'D40', '13', 'E9', 'F52'][Math.floor(random() * 7)];
    darks.add([doorW + 0.24, doorH + 0.12, 0.1], [DX, (doorH + 0.12) / 2, FAR + 0.04]);
    if (open) {
      const bridge = paint(256, 256, (c, w, h) => {
        const warm = a.gate === 'final' ? '#ffd9a8' : '#fff1d6';
        c.fillStyle = warm; c.fillRect(0, 0, w, h);
        c.fillStyle = '#d8c8a8'; c.beginPath(); c.moveTo(0, h); c.lineTo(86, 170); c.lineTo(170, 170); c.lineTo(w, h); c.fill();
        c.fillStyle = '#f8ecd4'; c.fillRect(86, 60, 84, 110);
        c.strokeStyle = 'rgba(120,100,70,0.5)'; c.lineWidth = 3;
        for (const [x0, y0, x1, y1] of [[0, 0, 86, 60], [w, 0, 170, 60], [0, h, 86, 170], [w, h, 170, 170]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
        c.strokeRect(86, 60, 84, 110);
        c.fillStyle = '#5a6a80'; c.fillRect(108, 86, 40, 84);
      });
      const glow = s.mesh(new THREE.PlaneGeometry(doorW, doorH), new THREE.MeshBasicMaterial({ map: bridge }), [DX, doorH / 2, FAR + 0.1]);
      glow.castShadow = false;
      for (const side of [-1, 1]) trims.add([0.06, doorH, doorW / 2], [DX + side * (doorW / 2 + 0.03), doorH / 2, FAR + 0.1 + doorW / 4], [0, side * 0.12, 0]);
      const pool = decal(a.gate === 'final' ? '#ffcf90' : '#fff0d0', 0.42, [4.2, 6.5], [DX, FAR + 2.6], THREE.AdditiveBlending);
      pool.renderOrder = 2;
    } else {
      const leaf = s.material(new THREE.Color('#6d7686').lerp(sky, 0.2), { roughness: 0.6, metalness: 0.2 });
      const leaves = new Batch(leaf);
      for (const side of [-1, 1]) { leaves.add([doorW / 2 - 0.02, doorH, 0.06], [DX + side * doorW / 4, doorH / 2, FAR + 0.1]); darks.add([0.2, 0.9, 0.02], [DX + side * doorW / 4, 1.5, FAR + 0.135]); steels.add([0.04, 0.5, 0.05], [DX + side * 0.12, 1.1, FAR + 0.15]); }
      leaves.build(root);
    }
    const gateLit = a.gate !== 'dark';
    const gateMap = paint(512, 200, (c, w, h) => { c.fillStyle = gateLit ? '#ffd21e' : '#7d6c26'; c.fillRect(0, 0, w, h); c.fillStyle = '#141414'; c.textBaseline = 'middle'; c.font = 'bold 60px sans-serif'; c.fillText('GATE', 26, h / 2 + 4); c.font = 'bold 150px sans-serif'; c.textAlign = 'right'; c.fillText(gateNo, w - 24, h / 2 + 8, 290); });
    darks.add([2.5, 0.84, 0.16], [DX, doorH + 0.58, FAR + 0.08]);
    const gateSign = s.mesh(new THREE.PlaneGeometry(2.36, 0.72), new THREE.MeshStandardMaterial({ map: gateMap, emissive: '#ffffff', emissiveMap: gateMap, emissiveIntensity: gateLit ? 0.9 * glowUp : 0.05, roughness: 0.5 }), [DX, doorH + 0.58, FAR + 0.165]);
    gateSign.castShadow = false;
    const wallScreen = paint(512, 288, (c, w, h) => {
      const [bg, ink, l1, l2] = a.gate === 'final' ? ['#b3231c', '#ffffff', 'FINAL', 'CALL'] : a.gate === 'open' ? ['#1f9148', '#ffffff', 'NOW', 'BOARDING'] : a.gate === 'closed' ? ['#20232a', '#ffb53a', 'GATE', 'CLOSED'] : ['#0c0d10', '#2a2d33', '', ''];
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 104px sans-serif'; c.fillText(l1, w / 2, 92, w - 30); c.fillText(l2, w / 2, 204, w - 30);
    });
    darks.add([1.36, 0.8, 0.08], [DX + 2.0, 1.95, FAR + 0.04]);
    const info = s.mesh(new THREE.PlaneGeometry(1.28, 0.72), new THREE.MeshStandardMaterial({ map: wallScreen, emissive: '#ffffff', emissiveMap: wallScreen, emissiveIntensity: gateLit ? 0.95 * glowUp : 0.05, roughness: 0.3 }), [DX + 2.0, 1.95, FAR + 0.085]);
    info.castShadow = false;
    let finalLamp: THREE.MeshBasicMaterial | null = null;
    if (a.gate === 'final') { finalLamp = new THREE.MeshBasicMaterial({ color: '#ffb020' }); const lampMesh = s.mesh(new THREE.SphereGeometry(0.12, 12, 8), finalLamp, [DX - doorW / 2 - 0.35, doorH + 0.2, FAR + 0.2]); lampMesh.castShadow = false; }
    if (a.gate === 'dark' || mood.wear > 0.5) {
      const exitMap = paint(128, 64, (c, w, h) => { c.fillStyle = '#0f7a3c'; c.fillRect(0, 0, w, h); c.fillStyle = '#eafff0'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2, h / 2 + 3); });
      const exit = s.mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: exitMap }), [DX - 2.2, 2.9, FAR + 0.02]);
      exit.castShadow = false;
    }
    // Counter beside the door.
    walls.add([1.3, 1.1, 0.6], [DX + 2.0, 0.55, FAR + 0.9]);
    darks.add([1.4, 0.05, 0.7], [DX + 2.0, 1.125, FAR + 0.9]);
    darks.add([0.42, 0.3, 0.04], [DX + 1.8, 1.34, FAR + 0.8], [-0.15, 0, 0]);
    if (a.gate === 'closed') {
      // A belt across the doorway between two posts.
      for (const side of [-1, 1]) { steels.add([0.07, 0.95, 0.07], [DX + side * 1.25, 0.475, FAR + 1.2]); darks.add([0.36, 0.03, 0.36], [DX + side * 1.25, 0.015, FAR + 1.2]); }
      const belt = s.box([2.5, 0.06, 0.012], [DX, 0.9, FAR + 1.2], s.material('#c22a26', { roughness: 0.8, emissive: '#5a0c0a', emissiveIntensity: 0.4 }));
      belt.castShadow = false;
    }

    // The far wall beside the gate, away from the windows.
    const WX = 2.55, WZ = FAR;
    const lightbox = (w: number, h: number, at: P, draw: Draw, strength = 0.95) => { const map = paint(512, Math.round(512 * h / w), draw); const mesh = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: strength * glowUp, roughness: 0.4 }), at); mesh.castShadow = false; return mesh; };
    let wallGlow = '#ffffff', wallPower = 0;
    if (a.wall === 'vending') {
      const hues = ['#d8322c', '#2a63c8'];
      [0, 1].forEach((i) => {
        const x = WX - 0.6 + i * 1.2;
        darks.add([1.1, 1.95, 0.85], [x, 0.975, WZ + 0.44]);
        lightbox(1.0, 1.82, [x, 0.98, WZ + 0.875], (c, w, h) => {
          c.fillStyle = hues[i]; c.fillRect(0, 0, w, h);
          c.fillStyle = '#f6f3e6'; c.fillRect(30, 60, w * 0.68, h * 0.66);
          for (let r = 0; r < 6; r++) for (let k = 0; k < 5; k++) { c.fillStyle = ['#e0372c', '#f0b020', '#2f9148', '#2f6fd0', '#7a3fb0', '#e86aa8'][Math.floor(random() * 6)]; c.fillRect(46 + k * 64, 80 + r * 96, 44, 70); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(30, 156 + r * 96, w * 0.68, 6); }
          c.fillStyle = '#1b1d20'; c.fillRect(w * 0.8, 200, 70, 150); c.fillRect(60, h - 150, w * 0.6, 80);
          c.fillStyle = '#ffffff'; c.font = 'bold 40px sans-serif'; c.fillText(i ? 'COLD DRINKS' : 'SNACKS', 34, 34);
        });
      });
      wallGlow = '#ffd8c8'; wallPower = 9;
    } else if (a.wall === 'cafe') {
      trims.add([2.7, 1.0, 0.5], [WX, 0.5, WZ + 0.25]);
      darks.add([2.8, 0.05, 0.56], [WX, 1.02, WZ + 0.27]);
      lightbox(2.6, 1.5, [WX, 1.8, WZ + 0.03], (c, w, h) => { c.fillStyle = '#8a8f96'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y + 3, w, 2); } c.fillStyle = '#3a3d42'; c.fillRect(w / 2 - 14, h - 22, 28, 16); }, 0.05);
      lightbox(2.6, 0.5, [WX, 2.9, WZ + 0.03], (c, w, h) => { c.fillStyle = '#3a2a22'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0d9a8'; c.font = 'bold 60px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CAFFÈ PARTENZA', w / 2, h / 2 + 3, w - 30); }, 0.45);
      for (const dx of [-1, 0, 1]) { steels.add([0.04, 0.72, 0.04], [WX + dx * 0.8, 0.36, WZ + 0.85]); darks.add([0.32, 0.05, 0.32], [WX + dx * 0.8, 0.74, WZ + 0.85]); darks.add([0.36, 0.02, 0.36], [WX + dx * 0.8, 0.01, WZ + 0.85]); }
      wallGlow = '#f0d9a8'; wallPower = 2;
    } else if (a.wall === 'advert') {
      darks.add([2.8, 2.3, 0.1], [WX, 1.75, WZ + 0.05]);
      lightbox(2.66, 2.16, [WX, 1.75, WZ + 0.11], (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f7a04a'); g.addColorStop(0.5, '#ffd88a'); g.addColorStop(0.52, '#2a8fa8'); g.addColorStop(1, '#1f5f80'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#fff3c0'; c.beginPath(); c.arc(w * 0.7, h * 0.5, 54, Math.PI, 0); c.fill();
        c.fillStyle = '#1d3a2a'; c.fillRect(90, 70, 10, 150); for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(95 + Math.cos(k) * 40, 76 + Math.sin(k) * 18, 46, 9, k, 0, 7); c.fill(); }
        c.fillStyle = '#ffffff'; c.font = 'bold 74px sans-serif'; c.textAlign = 'right'; c.fillText('ELSEWHERE', w - 20, h - 70, w - 40); c.font = 'bold 30px sans-serif'; c.fillText('from 49 · one way', w - 20, h - 26);
      });
      wallGlow = '#ffc888'; wallPower = 12;
    } else if (a.wall === 'dutyfree') {
      darks.add([2.9, 3.1, 0.1], [WX, 1.55, WZ + 0.05]);
      lightbox(2.7, 2.2, [WX, 1.25, WZ + 0.11], (c, w, h) => {
        c.fillStyle = '#1a1d24'; c.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) { const y = 30 + r * 96; c.fillStyle = '#ffe9c0'; c.fillRect(20, y + 64, w - 40, 7); for (let k = 0; k < 15; k++) { c.fillStyle = ['#d9a84a', '#7a2f3a', '#2f5a48', '#c9ced2', '#3a4a8a'][Math.floor(random() * 5)]; const bh = 30 + random() * 28; c.fillRect(30 + k * 31, y + 64 - bh, 18, bh); c.fillRect(35 + k * 31, y + 54 - bh, 8, 12); } }
        c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(w / 2 - 3, 0, 6, h);
      }, 0.75);
      lightbox(2.7, 0.5, [WX, 2.75, WZ + 0.11], (c, w, h) => { c.fillStyle = '#14161a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 70px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DUTY FREE', w / 2, h / 2 + 3); });
      wallGlow = '#ffe9c0'; wallPower = 6;
    } else {
      for (let i = 0; i < 3; i++) {
        const x = WX - 0.9 + i * 0.9;
        steels.add([0.62, 0.75, 0.34], [x, 1.45, WZ + 0.17]);
        darks.add([0.36, 0.5, 0.06], [x, 1.4, WZ + 0.36]);
        darks.add([0.06, 0.22, 0.07], [x - 0.1, 1.5, WZ + 0.42]);
        trims.add([0.7, 0.04, 0.4], [x, 1.85, WZ + 0.2]);
        steels.add([0.5, 0.03, 0.3], [x, 1.05, WZ + 0.2]);
      }
      lightbox(2.7, 0.32, [WX, 2.18, WZ + 0.02], (c, w, h) => { c.fillStyle = '#1f4f9a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TELEPHONES', w / 2, h / 2 + 2); }, 0.7);
      // One handset left hanging on its cord.
      const hx = WX - 0.9 + Math.floor(random() * 3) * 0.9 + 0.1, hz = WZ + 0.5;
      s.tube([[hx, 1.3, hz - 0.1], [hx + 0.04, 0.9, hz], [hx, 0.62, hz + 0.02]], 0.012, dark);
      darks.add([0.06, 0.2, 0.06], [hx, 0.52, hz + 0.02], [0.2, 0, 0.2]);
      wallGlow = '#bcd0ff'; wallPower = 2;
    }
    if (wallPower) { const spill = new THREE.PointLight(wallGlow, wallPower, 8, 1.7); spill.position.set(WX, 1.5, WZ + 1.5); root.add(spill); }
    // A bin by the right-hand wall, whatever else is there.
    steels.add([0.4, 0.8, 0.4], [RIGHT - 0.3, 0.4, -4]); darks.add([0.42, 0.06, 0.42], [RIGHT - 0.3, 0.83, -4]);

    // What the night left in the seating.
    const near = seatSpots.filter((spot) => spot.face === 1 && spot.z < 3.8 && spot.z > 0.9).sort((p, q) => q.z - p.z);
    const cup = (x: number, y: number, z: number) => { s.cylinder(0.04, 0.03, 0.11, [x, y + 0.055, z], s.material('#f0ece0', { roughness: 0.8 }), 10); s.cylinder(0.042, 0.042, 0.012, [x, y + 0.115, z], dark, 10); };
    const suitcase = (x: number, z: number, colour: string, h = 0.62, turn = 0) => { const body = s.box([0.42, h, 0.26], [x, h / 2 + 0.04, z], s.material(colour, { roughness: 0.4 })); body.rotation.y = turn; darks.add([0.2, 0.25, 0.02], [x, h + 0.16, z], [0, turn, 0]); };
    if (a.left === 'sleeper' && near.length >= 3) {
      const coat = s.material(new THREE.Color('#2a3140').lerp(new THREE.Color('#4a3a28'), mood.warmth), { roughness: 0.95 });
      const zHead = near[0].z, zFeet = near[Math.min(2, near.length - 1)].z, x = near[0].x;
      const bulk = [0.17, 0.19, 0.15, 0.17, 0.14, 0.11];
      bulk.forEach((b, k) => s.ball([0.2 + (k === 4 ? 0.05 : 0), b, 0.27], [x - 0.02 + (k === 4 ? 0.07 : 0), 0.78 + [0.02, 0.04, 0, 0.03, 0.04, 0][k], mix(zHead + 0.05, zFeet - 0.1, k / (bulk.length - 1))], coat, 12));
      s.ball([0.14, 0.13, 0.15], [x - 0.02, 0.8, zHead + 0.24], s.material('#1f242e', { roughness: 1 }), 12);
      for (const dx of [0, 0.14]) s.box([0.1, 0.09, 0.25], [x + 0.55 + dx, 0.045, zFeet + 0.3 + dx], s.material('#2a2422', { roughness: 0.7 })).rotation.y = 0.3 + dx * 3;
      const bag = s.box([0.5, 0.32, 0.26], [x + 0.5, 0.16, zHead + 0.2], s.material('#3f4a44', { roughness: 0.9 })); bag.rotation.y = 0.3;
      s.tube([[x + 0.18, 0.76, zHead - 0.3], [x + 0.3, 0.6, zHead - 0.34], [x + 0.34, 0.36, zHead - 0.3]], 0.05, coat);
    } else if (a.left === 'camp') {
      const cx = -1.9, cz = -4.6;
      const blankets = ['#b0483a', '#3f6a8a', '#c9a04a'];
      blankets.forEach((colour, k) => { const lump = s.ball([0.32, 0.14, 0.8 - k * 0.12], [cx + (k - 1) * 0.55, 0.12, cz - k * 0.2 + random() * 0.2], s.material(colour, { roughness: 1 }), 12); lump.rotation.y = (random() - 0.5) * 0.3; s.ball([0.1, 0.1, 0.11], [cx + (k - 1) * 0.55, 0.17, cz - k * 0.2 + 0.72 - k * 0.1], s.material('#2a2622', { roughness: 1 }), 10); });
      suitcase(cx - 0.3, cz - 1.5, '#e2513f', 0.62, 0.4); suitcase(cx + 0.35, cz - 1.6, '#2f9fd0', 0.5, -0.2);
      const bear = s.material('#b98a58', { roughness: 1 });
      s.ball([0.09, 0.1, 0.08], [cx + 1.0, 0.1, cz + 0.5], bear, 10); s.ball([0.065, 0.065, 0.06], [cx + 1.0, 0.23, cz + 0.52], bear, 10);
    } else if (a.left === 'luggage' && near.length) {
      const spot = near[Math.floor(near.length / 2)];
      suitcase(spot.x + 0.75, spot.z + 0.1, mood.cheer > 0.5 ? '#e2513f' : '#2f3540', 0.7, 0.2);
      suitcase(spot.x + 0.85, spot.z - 0.5, '#6a7a8a', 0.55, -0.3);
      const hold = s.ball([0.3, 0.17, 0.2], [spot.x, 0.63, spot.z], s.material('#5a4a34', { roughness: 0.95 }), 12); hold.rotation.y = 0.3;
    } else if (a.left === 'cleaner') {
      const yellow = s.material('#f5cf1c', { roughness: 0.5, emissive: '#5a4a00', emissiveIntensity: 0.35 });
      const sx = -1.2, sz = 3.4;
      for (const dir of [1, -1]) { const leaf = s.box([0.3, 0.64, 0.015], [sx, 0.3, sz + dir * 0.09], yellow); leaf.rotation.x = dir * -0.28; }
      const bx = -1.35, bz = -3.3;
      s.box([0.36, 0.3, 0.5], [bx, 0.19, bz], yellow);
      s.box([0.3, 0.22, 0.18], [bx, 0.42, bz + 0.14], s.material('#2f62b0'));
      s.rod([bx, 0.3, bz - 0.1], [bx - 0.12, 1.5, bz - 0.28], 0.014, s.material('#c9a45c'));
      decal('#dff0ff', 0.28, [2.4, 5.5], [-0.9, -0.6]);
    } else if (a.left === 'cups') {
      for (const spot of near.filter(() => random() < 0.6)) cup(spot.x + (random() - 0.5) * 0.2, 0.48, spot.z + (random() - 0.5) * 0.2);
      if (near.length) { const spot = near[0]; const pizza = s.box([0.4, 0.04, 0.4], [spot.x, 0.5, spot.z], s.material('#c9a878', { roughness: 0.9 })); pizza.rotation.y = 0.3; }
      for (let k = 0; k < 4; k++) { const sheet = s.box([0.3, 0.008, 0.42], [-1.5 + random() * 0.6, 0.006, 4 - k * 1.7 + random()], s.material('#d8d4c6', { roughness: 1 })); sheet.rotation.y = random() * 3; sheet.castShadow = false; }
    }
    // A fuller terminal leaves more behind, whatever the story.
    const litter = Math.round(mood.density * 6);
    for (let k = 0; k < litter; k++) { const spot = seatSpots[Math.floor(random() * seatSpots.length)]; if (spot.z > 5) continue; if (random() < 0.5) cup(spot.x + (random() - 0.5) * 0.2, 0.48, spot.z); else suitcase(spot.x + spot.face * (0.7 + random() * 0.2), spot.z + (random() - 0.5) * 0.4, ['#2f3540', '#7a2f3a', '#3f6a5a', '#8a8f98'][Math.floor(random() * 4)], 0.5 + random() * 0.2, (random() - 0.5)); }

    walls.build(root); trims.build(root); steels.build(root); darks.build(root);

    // Camera: low, looking down the seating toward the gate door.
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
    const eye = new THREE.Vector3(1.2 + (random() - 0.5) * 0.2, 1.3, 7.5);
    const slots: readonly (readonly [number, number, number, number])[] = [[0.8, 2.0, 2.6, 1.12], [2.6, -2.4, 2.5, 0.9], [-1.9, -6.4, 2.4, 0.9]];
    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const [x, z, tall, wide] = slots[index % slots.length];
        const fit = Math.min(tall / Math.max(item.height, 0.01), wide / Math.max(item.radius, 0.01));
        // True size where it fits; small things are brought up to something a low camera can see.
        const least = Math.min(0.95 / Math.max(item.height, 0.01), 0.6 / Math.max(item.radius, 0.01));
        const scale = Math.min(fit, Math.max(1, least));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = Math.atan2(eye.x - x, eye.z - z) + (index === 0 ? -0.35 : 0.3) + (random() - 0.5) * 0.35;
        item.holder.updateMatrixWorld(true);
      });
      let top = 1.4;
      if (items[0]) top = Math.max(1.2, visibleBounds(items[0].holder).max.y);
      camera.position.copy(eye);
      camera.lookAt(-3.8, mix(1.5, 1.85, Math.min(1, (top - 1.2) / 1.4)), FAR);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(-0.5, 0, -1.5);
      key.position.set(mix(2.5, -3.5, mood.daylight), 11, 3.5);
      const shadow = key.shadow.camera;
      shadow.left = -8; shadow.right = 8; shadow.top = 12; shadow.bottom = -12;
      shadow.near = 0.5; shadow.far = 30;
      shadow.updateProjectionMatrix();
    };
    place([]);

    const rate = mix(1.2, 3.2, mood.energy);
    const flickMat = flickerPanel ? ((flickerPanel as THREE.Mesh).material as THREE.MeshStandardMaterial) : null;
    const poolMat = flickerPool ? ((flickerPool as THREE.Mesh).material as THREE.MeshBasicMaterial) : null;
    return {
      object: root, camera, background, capacity: slots.length, ground: floor, keyLight: key, place,
      update: (_dt, time) => {
        if (beacon) beacon.color.setScalar(1).multiply(new THREE.Color(Math.sin(time * rate) > 0.6 ? '#ff3a30' : '#4a1512'));
        if (truckLamp) truckLamp.color.set(Math.sin(time * rate * 2.3) > 0 ? '#ffb020' : '#5a3c08');
        if (finalLamp) finalLamp.color.set(Math.sin(time * rate * 2) > 0 ? '#ffb020' : '#5a3c08');
        if (flickMat) { const onNow = Math.sin(time * mix(7, 23, mood.energy)) * Math.sin(time * 3.1 + 1) > -0.2; flickMat.emissiveIntensity = onNow ? 1.2 : 0.08; if (poolMat) poolMat.opacity = onNow ? 0.2 : 0.02; }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
