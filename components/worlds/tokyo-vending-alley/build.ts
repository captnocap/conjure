import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';
import { drawColumn, drawGlyph } from './glyphs';

type Point = [number, number, number];
type Region = [number, number, number, number];

function sheet(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  return canvas;
}
function textureOf(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
/** The parts of a painted face that give off light: everything dimly, the named regions fully. */
function glowOf(source: HTMLCanvasElement, regions: readonly Region[], floor = 0) {
  return sheet(source.width, source.height, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.globalAlpha = floor; g.drawImage(source, 0, 0); g.globalAlpha = 1;
    for (const [x, y, rw, rh] of regions) g.drawImage(source, x, y, rw, rh, x, y, rw, rh);
  });
}

const HALF = 2.15, NEAR = 12, FAR = -14, LEFT_TOP = 9.5, RIGHT_TOP = 6.2;
const HOURS = {
  dusk: { top: '#5673b8', horizon: '#eab79c', ambient: '#b4c4f2', wall: '#56607c', ground: '#4c5568', level: 1 },
  night: { top: '#333f74', horizon: '#7a78ac', ambient: '#98a8e0', wall: '#444c6c', ground: '#3e465c', level: 0.82 },
  dawn: { top: '#93a4cc', horizon: '#f4cbc2', ambient: '#d6d4ea', wall: '#6c6e84', ground: '#5e6272', level: 1.12 },
  haze: { top: '#74687a', horizon: '#dba476', ambient: '#dcbca6', wall: '#62585f', ground: '#524c54', level: 0.95 },
} as const;
const VIEWS = {
  eye: { at: [0.7, 1.55, 8.6], to: [-1.0, 1.25, 1], fov: 44 },
  low: { at: [0.75, 0.42, 8.3], to: [-1.0, 1.45, 1], fov: 46 },
  high: { at: [0.8, 4.4, 9.8], to: [-0.9, 0.6, 1.2], fov: 42 },
} as const;
const SLOTS = [
  { z: 3.6, side: -1, r: 0.85, h: 2.5 },
  { z: 1.5, side: 1, r: 0.65, h: 2.2 },
  { z: 0.2, side: -1, r: 0.7, h: 2.5 },
  { z: -3.0, side: 1, r: 0.7, h: 2.6 },
  { z: -3.4, side: -1, r: 0.7, h: 2.8 },
] as const;
const GAPS: readonly [number, number][] = [[2.5, 4.7], [-0.6, 1.0], [-4.2, -2.6]];
const SIGN_WORDS = ['酒', '大吉', 'ラーメン', '生', '天', '山本', '中山', '千円', '本山', '大天'];
const DRINKS = ['#e0362c', '#f2c62e', '#2f8fd8', '#2fae62', '#f08a2c', '#7a4a2a', '#f4f1e6', '#8a45d6', '#1d1d22', '#f08fb4', '#58c8c0', '#c8d83a'];
const BODIES = {
  mixed: ['#f1efe8', '#d9352c', '#2a56b8', '#f1efe8', '#1f6a4a', '#f0c330'],
  white: ['#f1efe8', '#e9ebea', '#f4f2ec'],
  retro: ['#e6dcc0', '#c9d8d8', '#e0a060', '#d8c8a0'],
  red: ['#d9352c', '#c82a24', '#d9352c', '#f1efe8'],
  odd: ['#7a3fa8', '#1d1d22', '#f08fb4', '#f0c330', '#2fae9a'],
} as const;

export default defineWorld({
  questions: {
    machines: choice('What are the vending machines like?', {
      mixed: 'A mismatched row from rival drink brands: white, red, blue, green.',
      white: 'Clean modern white machines, all alike, clinically bright.',
      retro: 'Faded cream and pale-blue machines from decades ago, rust at the seams.',
      red: 'One brand owns the wall: red machine after red machine.',
      odd: 'Novelty machines in purple, black and pink selling who knows what.',
    }),
    lit: score('How many machines are still lit?', ['One survivor glowing in a dark row', 'A few, with dark gaps', 'Most of them', 'Every one blazing']),
    weather: choice('What is the weather?', {
      dry: 'Dry and still.',
      wet: 'Just rained: the asphalt is a mirror of puddles.',
      rain: 'Raining now, thin streaks through the light.',
      mist: 'A low mist softening the far end.',
    }),
    hour: choice('What is the sky doing?', {
      dusk: 'Blue dusk with a peach line low down.',
      night: 'Deep violet night, long after the last train.',
      dawn: 'Pale pink-grey just before dawn.',
      haze: 'Overcast, the cloud lit dirty orange from below.',
    }),
    shops: choice('What state are the izakaya fronts in?', {
      shuttered: 'All shuttered for the night, their signs dark.',
      lastopen: 'All shuttered but one, still glowing behind its noren with a red lantern out.',
      open: 'Every one still open: warm paper windows down the whole side.',
      graffiti: 'Shuttered and tagged with graffiti and stickers.',
      vacant: 'Boarded up with rental notices: the alley is dying.',
    }),
    overhead: choice('What hangs over the alley besides cables?', {
      cables: 'Only cables, more and more cables.',
      signs: 'A thicket of projecting vertical signboards.',
      lanterns: 'A zigzag string of small paper lanterns.',
      bunting: 'Faded plastic bunting left over from a shopping-street festival.',
    }),
    end: choice('What is at the far end of the alley?', {
      tracks: 'An elevated railway, a lit train crossing.',
      towers: 'The city: tall towers of lit windows with red beacons.',
      deadend: 'A dead end: a blank wall, one lit window, one door.',
      konbini: 'The white glare of a convenience store on the cross street.',
    }),
    waiting: choice('What waits in the alley?', {
      nothing: 'Nothing and nobody.',
      bicycle: 'A parked shopping bicycle with a basket.',
      bags: 'Rubbish bags put out for the morning.',
      cat: 'A cat sitting in the light, watching.',
    }),
    view: choice('Where are we standing?', {
      eye: 'At eye level in the mouth of the alley.',
      low: 'Crouched low near the wet ground, the machines looming.',
      high: 'Looking down from a second-floor window.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const hour = HOURS[a.hour];
    const root = new THREE.Group();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const flat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
    const add = <T extends THREE.Object3D>(object: T) => { root.add(object); return object; };
    const box = (size: Point, at: Point, material: THREE.Material | THREE.Material[], cast = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = cast; mesh.receiveShadow = true;
      return add(mesh);
    };
    const lit = (canvas: HTMLCanvasElement, glow: HTMLCanvasElement, intensity: number) => { const map = textureOf(canvas); return new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: glow === canvas ? map : textureOf(glow), emissiveIntensity: intensity, roughness: 0.6 }); };
    const wet = a.weather === 'wet' || a.weather === 'rain';
    const wallTone = new THREE.Color(hour.wall);
    const shade = (hex: string, amount: number) => `#${new THREE.Color(hex).lerp(new THREE.Color('#000000'), amount).getHexString()}`;
    const tint = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#8f8a80'), mood.wear * 0.3).getHexString()}`;
    const rowOf = (g: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number, ink: string) => { const chars = [...text]; chars.forEach((char, index) => drawGlyph(g, char, cx + (index - chars.length / 2) * size * 1.08, y, size, ink, 0.13)); };
    const bright = mix(0.75, 1.15, mood.cheer);

    // Sky: one unlit gradient far behind everything.
    const sky = add(new THREE.Mesh(new THREE.PlaneGeometry(260, 110), new THREE.MeshBasicMaterial({ map: textureOf(sheet(4, 256, (g, w, h) => { const fall = g.createLinearGradient(0, 0, 0, h); fall.addColorStop(0, hour.top); fall.addColorStop(0.62, hour.top); fall.addColorStop(0.86, hour.horizon); fall.addColorStop(1, hour.horizon); g.fillStyle = fall; g.fillRect(0, 0, w, h); })), fog: false })));
    sky.position.set(0, 40, -70);

    // Ground: a wide dark apron and the alley's own strip of patched asphalt.
    const apron = add(new THREE.Mesh(new THREE.PlaneGeometry(160, 120).rotateX(-Math.PI / 2), flat(shade(hour.ground, 0.12), { roughness: 0.95 })));
    apron.position.set(0, -0.02, -30); apron.receiveShadow = true;
    const LENGTH = NEAR - FAR + 6;
    const asphalt = sheet(256, 1024, (g, w, h) => {
      g.fillStyle = hour.ground; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + random() * 0.07})`; g.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2); }
      for (let i = 0; i < 5 + mood.wear * 8; i++) { g.fillStyle = `rgba(20,22,30,${0.12 + random() * 0.16})`; g.fillRect(random() * w, random() * h, 30 + random() * 90, 40 + random() * 160); }
      g.fillStyle = `rgba(235,235,225,${mix(0.55, 0.2, mood.wear)})`;
      for (const x of [26, w - 32]) for (let y = 0; y < h; y += 4) if (random() > mood.wear * 0.5) g.fillRect(x, y, 6, 4);
      for (let i = 0; i < 3; i++) { const cx = w * (0.4 + random() * 0.2), cy = h * (0.2 + i * 0.28); g.strokeStyle = 'rgba(20,22,28,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 17, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx - 14, cy + k * 6); g.lineTo(cx + 14, cy + k * 6); g.stroke(); } }
      if (wet) for (let i = 0; i < 16; i++) { g.fillStyle = `#${new THREE.Color(hour.ground).lerp(new THREE.Color(hour.top), 0.2 + random() * 0.2).getHexString()}`; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(random() * w, random() * h, 14 + random() * 44, 10 + random() * 30, random() * 3, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    });
    const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, LENGTH).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: textureOf(asphalt), roughness: wet ? 0.45 : 0.9, metalness: wet ? 0.1 : 0 })));
    ground.position.set(0, 0, (NEAR + FAR) / 2 + 1); ground.receiveShadow = true;
    for (const side of [-1, 1]) box([0.34, 0.07, LENGTH], [side * (HALF - 0.17), 0.035, (NEAR + FAR) / 2 + 1], flat(shade('#a4a39c', 0.15), { roughness: 0.95 }), false);

    // The two building walls, painted with seams, pipes and upper windows.
    const wallArt = (top: number, mirrored: boolean) => sheet(1024, 384, (g, w, h) => {
      g.fillStyle = `#${wallTone.getHexString()}`; g.fillRect(0, 0, w, h);
      const sections = 7;
      for (let i = 0; i < sections; i++) {
        const x0 = i * w / sections, sw = w / sections;
        g.fillStyle = `rgba(${random() > 0.5 ? '255,250,240' : '10,12,24'},${0.05 + random() * 0.12})`; g.fillRect(x0, 0, sw, h);
        g.fillStyle = 'rgba(10,12,20,0.45)'; g.fillRect(x0, 0, 3, h);
        const floors = Math.floor((top - 3) / 2.6);
        for (let floor = 0; floor < floors; floor++) {
          const y = h - (3.5 + floor * 2.6 + 1.3) / top * h, wh = 1.3 / top * h;
          const glowing = random() < mix(0.12, 0.5, mood.cheer);
          g.fillStyle = glowing ? pick(['#ffd890', '#ffe8b8', '#cfe6ff']) : shade(hour.wall, 0.45);
          g.fillRect(x0 + sw * 0.2, y, sw * 0.6, wh);
          g.fillStyle = shade(hour.wall, 0.6); g.fillRect(x0 + sw * 0.49, y, 3, wh); g.fillRect(x0 + sw * 0.2, y + wh * 0.5, sw * 0.6, 2);
          if (random() > 0.5) { g.fillStyle = shade('#c9cdd0', 0.25); g.fillRect(x0 + sw * 0.62, y + wh + 6, sw * 0.24, 20); g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x0 + sw * 0.74, y + wh + 16, 7, 0, Math.PI * 2); g.fill(); }
        }
        if (random() > 0.4) { g.fillStyle = shade('#9a9ea4', 0.3); g.fillRect(x0 + sw * (0.05 + random() * 0.1), 0, 5, h); }
      }
      for (let i = 0; i < 6 + mood.wear * 30; i++) { g.fillStyle = `rgba(20,18,16,${0.06 + random() * 0.1})`; g.fillRect(random() * w, random() * h * 0.6, 4 + random() * 12, 40 + random() * 160); }
      void mirrored;
    });
    const wallLength = NEAR - FAR + 4;
    const plain = flat(wallTone, { roughness: 0.95 });
    const leftArt = wallArt(LEFT_TOP, false), rightArt = wallArt(RIGHT_TOP, true);
    const windowGlow = (art: HTMLCanvasElement) => { const map = textureOf(art); return new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.32, roughness: 0.95 }); };
    box([1.2, LEFT_TOP, wallLength], [-HALF - 0.6, LEFT_TOP / 2, (NEAR + FAR) / 2], [windowGlow(leftArt), plain, plain, plain, plain, plain], false);
    box([1.2, RIGHT_TOP, wallLength], [HALF + 0.6, RIGHT_TOP / 2, (NEAR + FAR) / 2], [plain, windowGlow(rightArt), plain, plain, plain, plain], false);
    box([1.5, 0.25, wallLength], [HALF + 0.55, RIGHT_TOP + 0.12, (NEAR + FAR) / 2], flat(shade(hour.wall, 0.3)), false);

    // Vending machines along the left wall, leaving gaps where the cast stands.
    const pools: { z: number; colour: THREE.Color; width: number }[] = [];
    const faces: { material: THREE.MeshStandardMaterial; base: number }[] = [];
    const bodyList = BODIES[a.machines];
    const steel = flat('#8d9296', { metalness: 0.5, roughness: 0.45 });
    let cursor = 8.4, firstFlank = true;
    const share = mix(0, 1, a.lit) * mix(1, 0.8, mood.wear);
    while (cursor > -10.4) {
      const width = mix(0.95, 1.2, random());
      const gap = GAPS.find(([low, high]) => cursor - width < high && cursor > low);
      if (gap) { cursor = gap[0] - 0.06; continue; }
      const z = cursor - width / 2;
      cursor -= width + 0.05;
      if (random() < 0.14) {
        // A recycling bin breaks the row.
        const bin = box([0.42, 0.85, 0.5], [-HALF + 0.3, 0.495, z], flat(pick(['#3a6ab0', '#8d9296', '#2f7a52'])));
        void bin;
        for (const dz of [-0.11, 0.11]) { const hole = add(new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), flat('#0e0f12'))); hole.position.set(-HALF + 0.512, 0.74, z + dz); hole.rotation.y = Math.PI / 2; }
        continue;
      }
      const flank = Math.abs(z - 3.6) < 1.9;
      const on = flank ? firstFlank || random() < mix(0.55, 1, a.lit) : random() < share;
      if (flank) firstFlank = false;
      const body = tint(pick(bodyList));
      const tall = mix(1.78, 1.9, random());
      const dark = new THREE.Color(body).getHSL({ h: 0, s: 0, l: 0 }).l < 0.45;
      const rows = 3, columns = Math.round(width / 0.16);
      const face = sheet(160, 288, (g, w, h) => {
        g.fillStyle = body; g.fillRect(0, 0, w, h);
        g.fillStyle = on ? '#f4fbff' : '#59616c'; g.fillRect(8, 10, w - 16, 132);
        for (let row = 0; row < rows; row++) {
          const y = 14 + row * 43;
          for (let column = 0; column < columns; column++) {
            const x = 12 + column * (w - 24) / columns, cw = (w - 24) / columns - 4;
            if (random() < mood.wear * 0.25) continue;
            const colour = a.machines === 'odd' ? pick(['#1d1d22', '#f08fb4', '#8a45d6', '#f0c330']) : pick(DRINKS);
            g.fillStyle = on ? colour : shade(colour, 0.55);
            const can = random() > 0.5;
            g.beginPath(); g.roundRect(x + (can ? 1 : 2), y + (can ? 8 : 2), cw - (can ? 2 : 4), can ? 22 : 28, 3); g.fill();
            if (!can) g.fillRect(x + cw / 2 - 2.5, y - 1, 5, 5);
            g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(x + 2, y + 15, cw - 4, 5);
            g.fillStyle = '#e8eaec'; g.fillRect(x, y + 32, cw, 7);
            const soldOut = !on || random() < mood.wear * 0.3;
            g.fillStyle = soldOut ? '#7a2a26' : random() > 0.35 ? '#2a7ae0' : '#e8483c'; g.fillRect(x + cw / 2 - 4, y + 33, 8, 5);
          }
        }
        // Coin panel, brand mark, flap.
        g.fillStyle = dark ? '#1a1b1f' : '#2a2c31'; g.fillRect(w - 46, 150, 38, 62);
        g.fillStyle = on ? '#7dffa0' : '#27402e'; g.fillRect(w - 41, 156, 28, 9);
        g.fillStyle = '#c8ccd0'; g.fillRect(w - 38, 172, 6, 16); g.fillRect(w - 26, 174, 14, 5); g.fillRect(w - 28, 194, 16, 10);
        const ink = dark ? '#f4f1e6' : pick(['#d9352c', '#2a56b8', '#1f6a4a', '#1d1d22']);
        g.fillStyle = ink; g.fillRect(10, 154, w - 64, 6);
        drawGlyph(g, pick(['生', '天', '大', '山', '千', '中']), 22, 164, 46, ink, 0.14);
        g.fillStyle = dark ? '#0e0f12' : '#1d1f24'; g.fillRect(12, 228, w - 24, 40);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(16, 232, w - 32, 12);
        g.fillStyle = shade(body, 0.35); g.fillRect(0, h - 12, w, 12);
        if (a.machines === 'retro') for (let i = 0; i < 6 + mood.wear * 10; i++) { g.fillStyle = `rgba(130,70,30,${0.2 + random() * 0.3})`; g.fillRect(random() * w, random() * h, 3 + random() * 14, 3 + random() * 26); }
        for (let i = 0; i < mood.wear * 5; i++) { g.fillStyle = pick(['#f2e23a', '#fbfaf2', '#ff8fb8']); g.save(); g.translate(20 + random() * (w - 40), 160 + random() * 100); g.rotate(random() - 0.5); g.fillRect(-9, -6, 18, 12); g.restore(); }
      });
      const glow = glowOf(face, on ? [[8, 10, 144, 132], [114, 150, 38, 20]] : [], on ? 0.5 : 0.02);
      const base = on ? bright * 1.35 : 0.15;
      const front = lit(face, glow, base);
      if (on) faces.push({ material: front, base });
      const side = flat(shade(body, 0.12), { roughness: 0.5 });
      box([0.72, tall, width], [-HALF + 0.38, 0.07 + tall / 2, z], [front, side, side, side, side, side]);
      if (on) pools.push({ z, width, colour: new THREE.Color(dark ? body : '#dff0ff').lerp(new THREE.Color('#e8f6ff'), dark ? 0.55 : 0).lerp(new THREE.Color('#ffd9a8'), mood.warmth * 0.3) });
    }
    // A strip awning with tubes over the row, brightest over the hero's gap.
    box([0.95, 0.05, 19], [-HALF + 0.47, 2.22, -1.1], flat(shade('#7f8c98', 0.35), { roughness: 0.6 }), false);
    for (let z = 7.6; z > -10; z -= 1.9) box([0.03, 0.2, 0.03], [-HALF + 0.9, 2.1, z], steel, false);
    const tubeTone = new THREE.Color('#e8f6ff').lerp(new THREE.Color('#ffe2b0'), mood.warmth * 0.5);
    const tube = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: tubeTone, emissiveIntensity: 2.2 * bright });
    for (const [low, high] of GAPS.slice(0, pools.length ? 3 : 1)) { const mesh = box([0.05, 0.05, (high - low) * 0.7], [-HALF + 0.5, 2.17, (low + high) / 2], tube, false); void mesh; }
    pools.push({ z: 3.6, width: 2.2, colour: tubeTone.clone() });

    // Light spilled across the ground from every lit face.
    const spill = textureOf(sheet(128, 64, (g, w, h) => { const fall = g.createLinearGradient(0, 0, w, 0); fall.addColorStop(0, 'rgba(255,255,255,1)'); fall.addColorStop(0.35, 'rgba(255,255,255,0.5)'); fall.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fall; g.fillRect(0, 0, w, h); const edge = g.createLinearGradient(0, 0, 0, h); edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(0.3, 'rgba(0,0,0,0)'); edge.addColorStop(0.7, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = edge; g.fillRect(0, 0, w, h); }));
    const spillAt = (x: number, z: number, reach: number, width: number, colour: THREE.Color, strength: number, toward: number) => {
      const patch = add(new THREE.Mesh(new THREE.PlaneGeometry(reach, width).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spill, color: colour, transparent: true, opacity: strength, depthWrite: false, blending: THREE.AdditiveBlending })));
      patch.position.set(x + toward * reach / 2, 0.012, z); if (toward < 0) patch.rotation.y = Math.PI;
      patch.renderOrder = 2;
    };
    for (const pool of pools) spillAt(-HALF + 0.74, pool.z, wet ? 3.3 : 2.3, pool.width * 1.5, pool.colour, (wet ? 0.34 : 0.22) * bright, 1);

    // Izakaya fronts on the right.
    const shopZ = [6.5, 2.5, -1.5, -5.5, -9.5];
    const openIndex = a.shops === 'lastopen' ? 1 + Math.floor(random() * 2) : -1;
    const lantern = new THREE.MeshStandardMaterial({ color: '#d8322a', emissive: '#ff5a30', emissiveIntensity: 1.3 * bright, roughness: 0.8 });
    const warmLights: number[] = [];
    shopZ.forEach((z, index) => {
      const open = a.shops === 'open' || index === openIndex;
      const signLit = open || (a.shops === 'shuttered' && random() < mood.cheer * 0.4);
      const band = pick(['#3a2a20', '#7a2420', '#e9e2cf', '#1f2f55', '#2a4a38']);
      const bandInk = band === '#e9e2cf' ? '#1d1512' : '#f2ead2';
      const word = pick(SIGN_WORDS);
      const art = sheet(384, 288, (g, w, h) => {
        g.fillStyle = tint(pick(['#4a3a30', '#5a5c62', '#3f4650', '#6a5a48'])); g.fillRect(0, 0, w, h);
        const ghost = a.shops === 'vacant' && random() > 0.4;
        g.fillStyle = ghost ? 'rgba(255,255,255,0.12)' : tint(band); g.fillRect(14, 8, w - 28, 54);
        if (!ghost) rowOf(g, word, w / 2 + 2, 14, Math.min(44, (w - 60) / [...word].length), bandInk);
        const top = 74, left = 22, width = w - 44, height = h - top - 8;
        if (open) {
          g.fillStyle = '#3d2a1e'; g.fillRect(left, top, width, height);
          g.fillStyle = '#ffdca0';
          for (const x0 of [left + 8, left + width * 0.62]) g.fillRect(x0, top + 30, width * 0.34, height * 0.55);
          g.fillStyle = '#3d2a1e';
          for (let x = left + 8; x < left + width; x += 11) g.fillRect(x, top + 30, 3, height * 0.55);
          g.fillStyle = '#ffb868'; g.fillRect(left + width * 0.4, top + 4, width * 0.2, height - 4);
          g.fillStyle = '#2a1a12'; g.fillRect(left + width * 0.4, top + height * 0.62, width * 0.2, 6);
          const cloth = pick(['#24386e', '#a8492a', '#efe9da', '#1f1d20']);
          g.fillStyle = cloth; for (let i = 0; i < 3; i++) g.fillRect(left + width * 0.36 + i * width * 0.095, top, width * 0.088, 50 + random() * 8);
          g.strokeStyle = cloth === '#efe9da' ? '#1c2a55' : '#f1ecdc'; g.lineWidth = 4; g.beginPath(); g.arc(left + width * 0.5, top + 26, 12, 0, Math.PI * 2); g.stroke();
        } else if (a.shops === 'vacant') {
          g.fillStyle = tint('#b89a68'); g.fillRect(left, top, width, height);
          g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(left + i * width / 4, top); g.lineTo(left + i * width / 4, top + height); g.stroke(); }
          for (let i = 0; i < 2 + Math.floor(random() * 2); i++) { const nx = left + 20 + random() * (width - 110), ny = top + 20 + random() * 60; g.fillStyle = '#f6f2e2'; g.fillRect(nx, ny, 70, 92); g.fillStyle = '#c8261e'; g.fillRect(nx + 6, ny + 6, 58, 24); drawGlyph(g, '大', nx + 22, ny + 34, 26, '#c8261e', 0.15); g.fillStyle = '#444'; for (let k = 0; k < 3; k++) g.fillRect(nx + 8, ny + 66 + k * 8, 54 - random() * 20, 3); }
        } else {
          const metal = tint(pick(['#9aa0a6', '#8a9298', '#a8a49a', '#7f8a92']));
          g.fillStyle = metal; g.fillRect(left, top, width, height);
          for (let y = top; y < top + height; y += 7) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(left, y, width, 2); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(left, y + 4, width, 2); }
          g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(left + width * 0.5 - 1, top, 3, height); g.fillRect(left + width * 0.3, top + height - 26, 40, 8);
          for (let i = 0; i < mood.wear * 10; i++) { g.fillStyle = `rgba(120,70,35,${0.12 + random() * 0.2})`; g.fillRect(left + random() * width, top + random() * height, 4 + random() * 10, 20 + random() * 80); }
          if (a.shops === 'graffiti') {
            g.lineCap = 'round'; g.lineJoin = 'round';
            for (let i = 0; i < 4 + Math.floor(random() * 3); i++) { g.strokeStyle = pick(['#ff4fa8', '#3fd8e8', '#f2e23a', '#f4f1e6', '#7aff6a', '#1d1d22']); g.lineWidth = 5 + random() * 8; g.beginPath(); let x = left + random() * width * 0.6, y = top + 40 + random() * (height - 80); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += 16 + random() * 34; y += (random() - 0.5) * 90; g.quadraticCurveTo(x - 20, y + (random() - 0.5) * 60, x, Math.min(top + height - 8, Math.max(top + 8, y))); } g.stroke(); }
            for (let i = 0; i < 12; i++) { g.fillStyle = pick(['#f2e23a', '#fbfaf2', '#e8483c', '#2f6fd0']); g.fillRect(left + random() * width, top + height * 0.4 + random() * height * 0.5, 10 + random() * 16, 8 + random() * 12); }
          }
        }
      });
      const regions: Region[] = [];
      if (signLit) regions.push([14, 8, 356, 54]);
      if (open) regions.push([22, 74, 340, 206]);
      const front = lit(art, glowOf(art, regions, 0.04), open ? bright * 0.95 : bright * 0.7);
      box([0.1, 2.9, 3.86], [HALF - 0.05, 1.52, z], [plain, front, plain, plain, plain, plain], false);
      const eave = box([0.75, 0.06, 3.9], [HALF - 0.36, 3.08, z], flat(shade('#39424b', 0.1), { roughness: 0.6 }));
      eave.rotation.z = 0.22;
      if (open) {
        warmLights.push(z);
        spillAt(HALF - 0.1, z, wet ? 2.6 : 1.9, 3, new THREE.Color('#ffb870'), (wet ? 0.36 : 0.24) * bright, -1);
        const paper = add(new THREE.Mesh(new THREE.LatheGeometry([[0.07, -0.26], [0.15, -0.14], [0.17, 0], [0.15, 0.14], [0.07, 0.26]].map(([x, y]) => new THREE.Vector2(x, y)), 14), lantern));
        paper.position.set(HALF - 0.42, 2.25, z + 1.2);
        box([0.2, 0.03, 0.2], [HALF - 0.42, 2.53, z + 1.2], flat('#1d1512'), false);
        box([0.02, 0.4, 0.02], [HALF - 0.42, 2.74, z + 1.2], flat('#1d1512'), false);
      }
      // Crates and pots collect outside in a crowded alley.
      if (random() < 0.25 + mood.density * 0.6) {
        const cz = z - 1.55, colour = tint(pick(['#e3b62c', '#b8362c', '#27478e']));
        for (let level = 0; level < 1 + Math.floor(random() * 3); level++) box([0.34, 0.3, 0.46], [HALF - 0.36, 0.22 + level * 0.31, cz + (random() - 0.5) * 0.04], flat(colour, { roughness: 0.6 })).rotation.y = (random() - 0.5) * 0.2;
      }
      if (random() < 0.2 + mood.density * 0.5) {
        const pz = z + 1.6;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.26, 10), flat(pick(['#b5613f', '#4f6a8c'])))).position.set(HALF - 0.38, 0.2, pz);
        const bush = add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), flat(pick(['#4d7a3c', '#3f6a4c'])))); bush.position.set(HALF - 0.38, 0.52, pz); bush.scale.y = 1.3; bush.castShadow = true;
      }
    });

    // Projecting signboards, both sides, receding.
    const blinkers: { material: THREE.MeshStandardMaterial; base: number }[] = [];
    const boards = Math.round(mix(3, 7, mood.density)) + (a.overhead === 'signs' ? 7 : 0);
    for (let i = 0; i < boards; i++) {
      const side = i % 2 ? -1 : 1, z = 4.5 - i * mix(1.2, 2.2, random()) * (a.overhead === 'signs' ? 0.6 : 1) - random();
      if (z < FAR + 1) continue;
      const tall = mix(1.3, 2.4, random()), y = mix(3.3, side < 0 ? 6.5 : 4.9, random());
      const [paper, ink] = pick([['#d9352c', '#fbf6e2'], ['#f6f2e2', '#1d1512'], ['#f2c62e', '#1d1512'], ['#2a56b8', '#f6f2e2'], ['#1f6a4a', '#f6f2e2'], ['#ff5fa8', '#fff8f0'], ['#1d1d22', '#ffd24a']] as const);
      const on = random() < mix(0.25, 0.85, mood.cheer);
      const word = pick(SIGN_WORDS);
      const art = sheet(72, Math.round(72 * tall / 0.56), (g, w, h) => { g.fillStyle = tint(paper); g.fillRect(0, 0, w, h); g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8); const size = Math.min(52, (h - 24) / ([...word].length * 1.08)); drawColumn(g, word, w / 2, (h - [...word].length * size * 1.08) / 2, size, ink, 0.14); });
      const base = on ? bright * 0.9 : 0.06;
      const face = lit(art, art, base);
      if (on) blinkers.push({ material: face, base });
      const edge = flat(shade(paper, 0.5));
      box([0.56, tall, 0.1], [side * (HALF - 0.42), y, z], [edge, edge, edge, edge, face, face]);
      for (const dy of [-0.3, 0.3]) box([0.18, 0.03, 0.03], [side * (HALF - 0.08), y + dy * tall, z], steel, false);
    }

    // A utility pole and the cable tangle against the sky.
    const cable = new THREE.MeshStandardMaterial({ color: '#16171c', roughness: 0.7 });
    const wire = (points: Point[], radius: number) => { const mesh = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), 28, radius, 4), cable)); mesh.castShadow = false; return mesh; };
    const poleZ = -1.9, poleX = HALF - 0.32, poleTop = 8.6;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, poleTop, 12), flat(shade('#aaa8a0', 0.2), { roughness: 0.95 }))).position.set(poleX, poleTop / 2, poleZ);
    for (const y of [poleTop - 0.3, poleTop - 1]) box([1.5, 0.08, 0.08], [poleX - 0.3, y, poleZ], steel, false);
    const drum = add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.8, 14), flat(shade('#9ea5a6', 0.2), { metalness: 0.3 }))); drum.position.set(poleX - 0.42, poleTop - 2, poleZ);
    const sag = mix(0.25, 0.6, mood.wear);
    const along = (x: number, y: number, depth: number, radius: number) => wire([[x + (random() - 0.5) * 0.3, y + 0.5, NEAR], [x, y - depth * 0.6, (NEAR + poleZ) / 2], [x, y, poleZ], [x, y - depth, (poleZ + FAR) / 2 - 1], [x + (random() - 0.5) * 0.4, y + 0.4, FAR - 4]], radius);
    for (const y of [poleTop - 0.2, poleTop - 0.9]) for (const dx of [-0.95, -0.3, 0.3]) along(poleX + dx, y, sag, 0.014);
    const tangle = Math.round(mix(4, 11, mood.density)) + (a.overhead === 'cables' ? 9 : 0);
    for (let i = 0; i < tangle; i++) {
      if (i % 3 === 0) along(poleX - 0.15 - random() * 0.4, mix(4.6, 6.6, random()), sag * mix(1.2, 2.6, random()), mix(0.018, 0.035, random()));
      else { const z0 = poleZ + (random() - 0.5) * 1.2, z1 = mix(5.5, FAR + 2, random()), y0 = mix(4.4, 7.4, random()), y1 = mix(3.6, 6.6, random()); wire([[poleX, y0, z0], [0, (y0 + y1) / 2 - mix(0.3, 1.1, random()), (z0 + z1) / 2], [-HALF, y1, z1]], mix(0.012, 0.024, random())); }
    }
    for (let i = 0; i < (a.overhead === 'cables' ? 3 : 1); i++) { const loop = add(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 5, 20), cable)); loop.position.set(poleX - 0.25, 5 + i * 0.5, poleZ + 0.3 + i * 0.3); loop.rotation.y = Math.PI / 2; }

    // A string of lanterns or bunting, zigzagging between the walls.
    if (a.overhead === 'lanterns' || a.overhead === 'bunting') {
      const marks: THREE.Matrix4[] = [], colours: THREE.Color[] = [];
      const legs = 7;
      for (let leg = 0; leg < legs; leg++) {
        const from = new THREE.Vector3(leg % 2 ? HALF : -HALF, 4.3 + (leg % 3) * 0.2, 6.5 - leg * 2.6), to = new THREE.Vector3(leg % 2 ? -HALF : HALF, 4.3 + ((leg + 1) % 3) * 0.2, 6.5 - (leg + 1) * 2.6);
        const middle = from.clone().lerp(to, 0.5); middle.y -= 0.55;
        wire([from.toArray() as Point, middle.toArray() as Point, to.toArray() as Point], 0.008);
        const curve = new THREE.QuadraticBezierCurve3(from, middle.clone().setY(middle.y - 0.5), to);
        const beads = a.overhead === 'lanterns' ? 6 : 14;
        for (let i = 1; i < beads; i++) {
          const at = curve.getPoint(i / beads);
          const matrix = new THREE.Matrix4().compose(at.setY(at.y - (a.overhead === 'lanterns' ? 0.2 : 0.11)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a.overhead === 'bunting' ? Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2 : 0, (random() - 0.5) * 0.3)), new THREE.Vector3(1, 1, 1));
          marks.push(matrix);
          colours.push(new THREE.Color(a.overhead === 'lanterns' ? (random() > 0.3 ? '#e8402c' : '#f6ecd2') : tint(pick(['#f08fb4', '#f6ecd2', '#e8402c', '#f2c62e', '#58c8c0']))));
        }
      }
      const geometry = a.overhead === 'lanterns' ? new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.15, 1) : new THREE.ConeGeometry(0.11, 0.22, 3).rotateX(Math.PI).scale(1, 1, 0.1);
      const material = a.overhead === 'lanterns' ? new THREE.MeshStandardMaterial({ emissive: '#ff9a60', emissiveIntensity: 0.75 * bright, roughness: 0.8 }) : new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
      const string = add(new THREE.InstancedMesh(geometry, material, marks.length));
      marks.forEach((matrix, index) => { string.setMatrixAt(index, matrix); string.setColorAt(index, colours[index]); });
    }

    // The far end.
    const farGlow = (width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, intensity = 0.9) => { const art = sheet(128, Math.min(512, Math.max(32, Math.round(128 * height / width))), draw); return lit(art, art, intensity * bright); };
    const towerArt = (lights: number) => (g: CanvasRenderingContext2D, w: number, h: number) => {
      g.fillStyle = shade(hour.wall, 0.42); g.fillRect(0, 0, w, h);
      for (let y = 6; y < h - 6; y += 9) for (let x = 6; x < w - 8; x += 11) if (random() < lights) { g.fillStyle = pick(['#ffdf9a', '#ffe9c0', '#cfe6ff', '#fff4dc']); g.fillRect(x, y, 7, 5); }
    };
    let train: THREE.Group | null = null;
    const beacons: THREE.MeshStandardMaterial[] = [];
    const lights = mix(0.12, 0.45, mood.cheer);
    for (let i = 0; i < 6; i++) {
      const width = mix(5, 10, random()), height = a.end === 'towers' ? mix(16, 38, random()) : mix(7, 16, random());
      const x = -24 + i * 9.5 + (random() - 0.5) * 3, z = FAR - mix(9, 22, random());
      box([width, height, 6], [x, height / 2, z], farGlow(width, height, towerArt(lights), 0.85), false);
      if (a.end === 'towers' && height > 22) { const beacon = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 2 }); beacons.push(beacon); add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), beacon)).position.set(x, height + 0.3, z); }
    }
    if (a.end === 'tracks') {
      const girder = flat(shade('#5f7a72', 0.25), { roughness: 0.7 });
      box([60, 1.0, 3], [0, 5.6, FAR - 3], girder, false);
      for (let x = -28; x <= 28; x += 2) box([0.12, 0.9, 0.12], [x, 6.5, FAR - 1.55], girder, false);
      box([60, 0.1, 0.1], [0, 6.95, FAR - 1.55], girder, false);
      for (const x of [-9, 9]) box([1.2, 5.2, 2.4], [x, 2.6, FAR - 3], flat(shade('#9a9890', 0.3)), false);
      train = add(new THREE.Group());
      for (let car = 0; car < 4; car++) {
        const art = sheet(256, 64, (g, w, h) => { g.fillStyle = '#c9ced2'; g.fillRect(0, 0, w, h); g.fillStyle = pick(['#2fae62', '#f08a2c', '#2f8fd8', '#f2c62e']); g.fillRect(0, h - 22, w, 6); g.fillStyle = '#fff2c8'; for (let i = 0; i < 9; i++) g.fillRect(8 + i * 28, 10, i % 3 === 1 ? 14 : 22, 24); g.fillStyle = '#3a3e44'; g.fillRect(0, h - 8, w, 8); });
        const side = lit(art, glowOf(art, [[0, 8, 256, 28]], 0.1), 1.1 * bright);
        const roof = flat('#8d9296');
        const body = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.6, 2.6), [roof, roof, roof, roof, side, side]);
        body.position.set(car * 9.9, 7.5, FAR - 3);
        train.add(body);
      }
      train.position.x = -30 + random() * 20;
    } else if (a.end === 'deadend') {
      const art = sheet(256, 384, (g, w, h) => {
        g.fillStyle = shade(hour.wall, 0.12); g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, y, w, 2); }
        g.fillStyle = '#ffd890'; g.fillRect(150, 150, 54, 44); g.fillStyle = shade(hour.wall, 0.6); g.fillRect(176, 150, 3, 44); g.fillRect(150, 171, 54, 3);
        g.fillStyle = '#3a4650'; g.fillRect(56, h - 112, 50, 112); g.fillStyle = '#e8f6ff'; g.fillRect(70, h - 132, 22, 9);
        g.fillStyle = shade('#9a9ea4', 0.3); g.fillRect(226, 0, 6, h); g.fillRect(20, 60, 5, h);
        for (let i = 0; i < 10 + mood.wear * 20; i++) { g.fillStyle = `rgba(20,18,16,${0.06 + random() * 0.1})`; g.fillRect(random() * w, random() * h, 5 + random() * 12, 40 + random() * 120); }
      });
      const face = lit(art, glowOf(art, [[150, 150, 54, 44], [70, 252, 22, 9]], 0.05), 1.1 * bright);
      box([HALF * 2 + 2.4, 7.8, 0.6], [0, 3.9, FAR - 0.3], [plain, plain, plain, plain, face, plain], false);
      spillAt(-1.1, FAR + 1.2, 1.6, 1.6, new THREE.Color('#e8f6ff'), 0.25, 1);
    } else if (a.end === 'konbini') {
      const art = sheet(512, 192, (g, w, h) => {
        g.fillStyle = '#f4fbff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, 52);
        for (const [colour, y] of [['#2fae62', 10], ['#2a7ae0', 24], ['#f08a2c', 38]] as const) { g.fillStyle = colour; g.fillRect(0, y, w, 9); }
        g.fillStyle = '#dfe8ee'; for (let x = 0; x < w; x += 64) g.fillRect(x, 52, 4, h);
        for (let i = 0; i < 40; i++) { g.fillStyle = pick(DRINKS); g.fillRect(8 + random() * (w - 20), 96 + Math.floor(random() * 3) * 28, 10, 20); }
        g.fillStyle = '#c9d4dc'; for (const y of [118, 146, 174]) g.fillRect(0, y, w, 4);
      });
      const face = lit(art, art, 1.25 * bright);
      box([13, 3.6, 0.5], [0, 1.8, FAR - 4.5], [plain, plain, plain, plain, face, plain], false);
      box([13, 3, 6], [0, 5.1, FAR - 7.2], flat(shade(hour.wall, 0.2)), false);
      const glare = add(new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spill, color: '#e8f6ff', transparent: true, opacity: wet ? 0.45 : 0.3, depthWrite: false, blending: THREE.AdditiveBlending })));
      glare.rotation.y = -Math.PI / 2; glare.position.set(0, 0.014, FAR + 1.2);
    }

    // What waits in the alley.
    let tail: THREE.Object3D | null = null;
    if (a.waiting === 'bicycle') {
      const bike = add(new THREE.Group());
      const frame = flat(tint(pick(['#3a6ab0', '#8a2a26', '#c9ced2', '#2f7a52'])), { metalness: 0.4, roughness: 0.4 }), rubber = flat('#17181b');
      const rod = (from: Point, to: Point, radius: number, material: THREE.Material) => { const start = new THREE.Vector3(...from), finish = new THREE.Vector3(...to), span = finish.clone().sub(start); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, span.length(), 6), material); mesh.position.copy(start).addScaledVector(span, 0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize()); mesh.castShadow = true; bike.add(mesh); };
      for (const z of [-0.55, 0.55]) { const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 6, 24), rubber); wheel.position.set(0, 0.35, z); wheel.rotation.y = Math.PI / 2; wheel.castShadow = true; bike.add(wheel); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 4, 20), steel); rim.position.copy(wheel.position); rim.rotation.y = Math.PI / 2; bike.add(rim); }
      rod([0, 0.35, -0.55], [0, 0.82, -0.2], 0.018, frame); rod([0, 0.82, -0.2], [0, 0.3, 0.05], 0.02, frame); rod([0, 0.3, 0.05], [0, 0.35, 0.55], 0.016, frame); rod([0, 0.3, 0.05], [0, 0.95, 0.2], 0.018, frame); rod([0, 0.82, -0.2], [0, 1.08, -0.32], 0.016, frame); rod([-0.26, 1.08, -0.3], [0.26, 1.08, -0.3], 0.013, steel);
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.26), rubber); saddle.position.set(0, 0.98, 0.22); bike.add(saddle);
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.28), flat('#5a5e64', { wireframe: false, roughness: 0.6 })); basket.position.set(0, 0.92, -0.62); basket.castShadow = true; bike.add(basket);
      rod([0.08, 0.3, 0.3], [0.2, 0, 0.36], 0.01, steel);
      bike.position.set(-1.02, 0, -1.6); bike.rotation.set(0, 0.1, 0.1);
    } else if (a.waiting === 'bags') {
      for (let i = 0; i < 5 + Math.floor(random() * 4); i++) { const r = mix(0.2, 0.3, random()); const bag = add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), flat(random() > 0.3 ? '#dfe4e6' : '#b8d0dc', { roughness: 0.35 }))); bag.scale.y = 0.82; bag.position.set(1.2 + random() * 0.55, r * 0.75 + (i > 4 ? 0.3 : 0), -1.2 + random() * 1.4); bag.castShadow = true; }
    } else if (a.waiting === 'cat') {
      const cat = add(new THREE.Group());
      const fur = flat(pick(['#1b1b1f', '#e8e4da', '#d8892c', '#8a8d94']), { roughness: 0.9 });
      const blob = (size: Point, at: Point) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), fur); mesh.scale.set(...size); mesh.position.set(...at); mesh.castShadow = true; cat.add(mesh); return mesh; };
      blob([0.1, 0.15, 0.13], [0, 0.15, 0]); blob([0.075, 0.07, 0.075], [0, 0.34, 0.05]);
      for (const side of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), fur); ear.position.set(side * 0.045, 0.42, 0.05); cat.add(ear); }
      tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.04, -0.1), new THREE.Vector3(0.12, 0.03, -0.14), new THREE.Vector3(0.2, 0.04, -0.04)]), 10, 0.02, 6), fur);
      cat.add(tail);
      cat.position.set(-0.1, 0, 5.4); cat.rotation.y = -1.9;
    }

    // Weather that hangs in the air.
    let rain: THREE.InstancedMesh | null = null;
    const drops: THREE.Vector3[] = [];
    if (a.weather === 'rain') {
      const count = Math.round(mix(260, 620, mood.energy));
      rain = add(new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.36, 0.008), new THREE.MeshBasicMaterial({ color: '#e4eeff', transparent: true, opacity: 0.4, depthWrite: false }), count));
      for (let i = 0; i < count; i++) drops.push(new THREE.Vector3((random() - 0.5) * HALF * 2.2, random() * 7, mix(FAR + 2, 8.4, random())));
    }
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, 0, -0.08));
    const fall = (shift: number) => { if (!rain) return; const matrix = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1); drops.forEach((drop, index) => { drop.y -= shift; if (drop.y < 0) drop.y += 7; matrix.compose(drop, lean, one); rain!.setMatrixAt(index, matrix); }); rain.instanceMatrix.needsUpdate = true; };
    fall(0);
    if (a.weather === 'mist') {
      const veil = textureOf(sheet(8, 128, (g, w, h) => { const rise = g.createLinearGradient(0, 0, 0, h); rise.addColorStop(0, 'rgba(255,255,255,0)'); rise.addColorStop(0.55, 'rgba(255,255,255,0.55)'); rise.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = rise; g.fillRect(0, 0, w, h); }));
      for (let i = 0; i < 6; i++) { const layer = add(new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 8, 7), new THREE.MeshBasicMaterial({ map: veil, color: new THREE.Color(hour.horizon).lerp(new THREE.Color(hour.ambient), 0.5), transparent: true, opacity: 0.09, depthWrite: false }))); layer.position.set(0, 3.5, 0.5 - i * 2.8); layer.renderOrder = 3; }
    }

    // Light: cool sky, one shadowing key down the alley, and the machines' own spill.
    const level = hour.level * mix(0.92, 1.08, mood.cheer);
    add(new THREE.HemisphereLight(hour.ambient, shade(hour.ground, 0.1), 1.15 * level));
    const key = add(new THREE.DirectionalLight(new THREE.Color(hour.ambient).lerp(new THREE.Color('#ffe2c0'), mood.warmth * 0.4), 0.95 * level));
    key.position.set(mix(-1.2, 2.6, mood.daylight), 13, 11); key.target.position.set(-0.6, 0, 0.5); add(key.target);
    key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.normalBias = 0.03; key.shadow.bias = -0.0004;
    const frustum = key.shadow.camera; frustum.left = -8; frustum.right = 8; frustum.bottom = -13; frustum.top = 13; frustum.near = 1; frustum.far = 45; frustum.updateProjectionMatrix();
    const heroGlow = add(new THREE.PointLight(tubeTone, 9.5 * bright, 9, 1.6)); heroGlow.position.set(-0.95, 2.05, 3.6);
    const rowGlow = add(new THREE.PointLight(pools[0]?.colour ?? tubeTone, pools.length > 1 ? 8 * bright * mix(0.5, 1, a.lit) : 0, 8, 1.6)); rowGlow.position.set(-0.9, 1.6, -1.6);
    const shopGlow = add(new THREE.PointLight('#ffb870', warmLights.length ? 8 * bright : 0, 8, 1.6)); shopGlow.position.set(0.9, 1.7, warmLights.length ? warmLights[Math.min(1, warmLights.length - 1)] : 0);

    const view = VIEWS[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.2, 220);
    camera.position.set(view.at[0], view.at[1], view.at[2]); camera.lookAt(view.to[0], view.to[1], view.to[2]);

    // Small things get a crate to stand on so they sit in the light.
    const stands = SLOTS.map(() => { const stand = box([1, 1, 1], [0, 0, 0], flat(tint(pick(['#e3b62c', '#b8362c', '#27478e', '#8d9296'])), { roughness: 0.6 })); stand.visible = false; return stand; });
    const place = (items: readonly Placeable[]) => {
      for (const stand of stands) stand.visible = false;
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length], stand = stands[index % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits the alley; shrunk when it does not; tiny things grow enough to be seen.
        const scale = Math.min(fit, Math.max(1, Math.min((item.hero ? 0.75 : 0.6) / height, 4)));
        const reach = radius * scale;
        const small = height * scale < 0.95 && reach < 0.55;
        const x = slot.side * (HALF - 0.12 - Math.min(reach, 1) - (small ? 0.12 : 0) - (slot.side > 0 ? 0.25 : 0));
        let y = 0;
        if (small) {
          const edge = Math.max(0.45, reach * 2 + 0.12);
          y = THREE.MathUtils.clamp(1.15 - height * scale * 0.6, 0.35, 0.9);
          stand.visible = true; stand.scale.set(edge, y, edge); stand.position.set(x, y / 2, slot.z); stand.rotation.y = (context.random() - 0.5) * 0.3;
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, slot.z);
        const outward = slot.side < 0 ? Math.PI / 2 : -Math.PI / 2;
        const toCamera = Math.atan2(camera.position.x - x, camera.position.z - slot.z);
        item.holder.rotation.y = mix(outward, toCamera, item.hero ? 0.6 : 0.5) + (context.random() - 0.5) * 0.2;
        item.holder.updateMatrixWorld(true);
      });
      const hero = items[0] ? Math.max(0.6, Math.min(2.4, items[0].height * items[0].holder.scale.x * 0.75)) : 1.6;
      heroGlow.position.y = Math.max(1.4, hero + 0.9);
      camera.updateMatrixWorld(true);
    };

    const flickerer = faces.length > 1 && (mood.wear > 0.4 || mood.energy > 0.65) ? faces[Math.floor(random() * faces.length)] : null;
    const blinker = blinkers.length ? blinkers[Math.floor(random() * blinkers.length)] : null;
    const pace = mix(0.3, 1.6, mood.energy);
    return {
      object: root, camera, background: new THREE.Color(hour.top), capacity: SLOTS.length, ground, keyLight: key, place,
      update(dt, time) {
        if (flickerer) flickerer.material.emissiveIntensity = flickerer.base * (Math.sin(time * 31) * Math.sin(time * 7.3) > 0.55 ? 0.25 : 1);
        if (blinker) blinker.material.emissiveIntensity = blinker.base * (Math.sin(time * pace * 2) > -0.2 ? 1 : 0.15);
        if (train) { train.position.x += dt * mix(4, 14, mood.energy); if (train.position.x > 34) train.position.x = -74; }
        for (const beacon of beacons) beacon.emissiveIntensity = Math.sin(time * 2.2) > 0 ? 2.2 : 0.2;
        if (tail) tail.rotation.y = Math.sin(time * pace * 2.2) * 0.35;
        fall(dt * mix(7, 13, mood.energy));
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
