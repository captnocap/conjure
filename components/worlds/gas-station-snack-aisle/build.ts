import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Era {
  chain: string; wall: string; ceiling: string; band: [string, string, string]; gondola: string; end: string; strip: string;
  floor: string; specks: string[]; tube: string; signBg: string; signInk: string; goods: string[];
}
const LOUD = ['#e01b22', '#f4601c', '#f5cb1c', '#5cc21f', '#1d5fd0', '#2bb0de', '#8a1f6c', '#7a2d14', '#f4f1e6', '#26262a', '#ff5fb4', '#1f8f3a'];
const ERAS: Record<'seventies' | 'nineties' | 'modern' | 'indie', Era> = {
  seventies: { chain: 'PIT STOP', wall: '#d9c7a3', ceiling: '#e6dcc2', band: ['#c8641c', '#8a3a12', '#e0a81c'], gondola: '#e4d8bc', end: '#7a5230', strip: '#e0a81c', floor: '#c9b48e', specks: ['#8a6a44', '#ece0c4', '#5a4630'], tube: '#fff0cc', signBg: '#8a3a12', signInk: '#f6e3b0', goods: ['#c8641c', '#e0a81c', '#8a3a12', '#6a7a2a', '#f4e6c0', '#b3201c', '#3a5a8a', '#5a3a1c'] },
  nineties: { chain: 'ZIP MART', wall: '#eceeec', ceiling: '#f0f1ef', band: ['#e8232e', '#ffd21f', '#1f4fa8'], gondola: '#f2f2ee', end: '#e8232e', strip: '#e8232e', floor: '#e2e4e2', specks: ['#9aa0a6', '#1f4fa8', '#e8232e'], tube: '#f2fbff', signBg: '#1f4fa8', signInk: '#ffd21f', goods: LOUD },
  modern: { chain: 'LUMO', wall: '#d6dada', ceiling: '#e4e6e6', band: ['#16b89a', '#2a2e32', '#16b89a'], gondola: '#3d4246', end: '#2a2e32', strip: '#f4f4f4', floor: '#bdb8ac', specks: ['#a8a296', '#cfcabe', '#989286'], tube: '#e8f3ff', signBg: '#16b89a', signInk: '#ffffff', goods: LOUD },
  indie: { chain: "RAY'S", wall: '#c9d8c0', ceiling: '#dcd8c4', band: ['#3a7a4a', '#f4f1e6', '#3a7a4a'], gondola: '#c9c2ae', end: '#b89a6a', strip: '#f6f0c0', floor: '#bdb49c', specks: ['#6a6452', '#8a3a2a', '#e6dec6'], tube: '#fff6dc', signBg: '#f4f1e6', signInk: '#b3201c', goods: LOUD },
};
const VIEWS = {
  eye: { at: [0.1, 1.56, 6.6], to: [0.1, 1.0, -1.0], fov: 46 },
  low: { at: [0.5, 0.62, 6.3], to: [-0.05, 1.1, -1.0], fov: 50 },
  cctv: { at: [-1.1, 2.8, 6.4], to: [0.2, 0.5, 0.6], fov: 52 },
} as const;
const AISLE = 1.4, DEPTH = 0.5, TOP = 1.42, FAR = -3.2, NEAR = 5.2, CEIL = 3, BACK = -6.4, FRONT = 9, WALL = 4.4;
const SLOTS = [
  { x: 0.2, z: 0.7, r: 0.8, h: 2.0, turn: 0, counter: false },
  { x: -0.94, z: 2.5, r: 0.44, h: 1.3, turn: 0.4, counter: false },
  { x: 1.0, z: -4.3, r: 0.6, h: 1.7, turn: -0.08, counter: true },
  { x: -0.88, z: -2.2, r: 0.48, h: 1.8, turn: 0.2, counter: false },
];

export default defineWorld({
  questions: {
    era: choice('What era and kind of chain is the station?', {
      seventies: 'A 1970s stop: wood-grain panels, harvest gold and burnt orange stripes, warm yellowed tubes.',
      nineties: 'A 1990s chain store: bright white with red, yellow and blue stripes and red price rails.',
      modern: 'A modern rebuild: charcoal shelving, teal accents, cold even LED strips, wood-look floor.',
      indie: 'An independent mom-and-pop: pale green walls, beige shelving, hand-lettered signs.',
    }),
    stock: score('How well stocked are the shelves?', ['Stripped bare after a holiday weekend', 'Picked over with whole gaps', 'Normally stocked', 'Freshly faced, every shelf packed']),
    happening: choice('What is happening in the aisle?', {
      nobody: 'Nothing. Nobody. The hum of the coolers.',
      mopped: 'Just mopped: a wet shine down the aisle and a yellow wet-floor sign.',
      restock: 'Mid-restock: cardboard cartons stacked in the aisle, one cut open.',
      spill: 'A spill nobody has dealt with: a bright slushie puddle and the cup.',
      flicker: 'The power is dipping: half the tubes dark, the rest stuttering.',
    }),
    window: choice('What is visible through the window at the far end?', {
      canopy: 'The empty forecourt: a lit pump canopy and nobody at the pumps.',
      truck: 'A semi idling at the pumps, amber marker lights along its trailer.',
      rain: 'Rain: streaked glass and smeared reflections of the canopy.',
      snow: 'Snow coming down through the canopy light, the lot white.',
      cruiser: 'A police cruiser, red and blue pulsing over the forecourt.',
      dawn: 'The first orange line of dawn behind the canopy.',
      void: 'Nothing: black glass that only reflects the store back at itself.',
    }),
    counter: choice('What is the hot-food counter at the far end doing?', {
      hot: 'Open and glowing: a warmer case of fried things under orange lamps.',
      coffee: 'A coffee station: tall steel urns and stacks of cups.',
      shuttered: 'Closed for the night behind a roll-down grille.',
      away: 'Lit but unattended, a BACK IN 5 MIN card on the counter.',
    }),
    overhead: choice('What hangs over the aisle?', {
      marker: 'An aisle marker board listing chips, candy and jerky.',
      banner: 'A sagging promotional banner for a hot dog deal.',
      mirror: 'A convex security mirror watching the aisle.',
      nothing: 'Nothing but ceiling tiles and tubes.',
    }),
    view: choice('Where are we standing?', {
      eye: 'At eye level in the mouth of the aisle, looking straight down it.',
      low: 'Low, at a child’s height, the shelves towering.',
      cctv: 'High in the corner like the security camera, looking down.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = ERAS[a.era];
    const root = new THREE.Group();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const flat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...options });
    const box = (size: [number, number, number], at: [number, number, number], material: THREE.Material | THREE.Material[], cast = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at);
      mesh.castShadow = cast; mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const glowing = (map: THREE.Texture, intensity: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.4, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: intensity, ...extra });
    const lettering = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, colour: string, max: number, font = 'sans-serif', weight = '900') => {
      ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${size}px ${font}`; ctx.fillText(value, x, y, max);
    };
    const hand = a.era === 'indie';
    const dip = a.happening === 'flicker';
    const tubeTint = new THREE.Color(era.tube).lerp(new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.7, 0.8), 0.35);

    // Floor: speckled vinyl tile.
    const floorArt = paint(256, 256, (ctx) => {
      ctx.fillStyle = era.floor; ctx.fillRect(0, 0, 256, 256);
      if (a.era === 'nineties') { ctx.fillStyle = '#c4d2e8'; ctx.fillRect(0, 0, 128, 128); }
      if (a.era === 'seventies') { ctx.fillStyle = '#b89a6e'; ctx.fillRect(128, 0, 128, 128); ctx.fillRect(0, 128, 128, 128); }
      for (let i = 0; i < 900; i++) { ctx.fillStyle = pick(era.specks); ctx.globalAlpha = 0.25 + random() * 0.55; const r = 0.6 + random() * 1.8; ctx.fillRect(random() * 256, random() * 256, r, r); }
      ctx.globalAlpha = 0.28 + mood.wear * 0.3; ctx.fillStyle = '#4a463a';
      if (a.era === 'modern') { for (let y = 0; y < 256; y += 64) ctx.fillRect(0, y, 256, 1.5); ctx.fillRect(90, 0, 1.5, 64); ctx.fillRect(200, 64, 1.5, 64); ctx.fillRect(40, 128, 1.5, 64); ctx.fillRect(150, 192, 1.5, 64); }
      else { ctx.fillRect(0, 0, 256, 2); ctx.fillRect(0, 128, 256, 2); ctx.fillRect(0, 0, 2, 256); ctx.fillRect(128, 0, 2, 256); }
      ctx.globalAlpha = 1;
    });
    floorArt.wrapS = floorArt.wrapT = THREE.RepeatWrapping; floorArt.repeat.set(WALL * 2 / 0.61, (FRONT - BACK) / 0.61);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WALL * 2, FRONT - BACK).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorArt, color: '#c8c8c4', roughness: mix(0.35, 0.75, mood.wear), metalness: 0.05 }));
    floor.position.set(0, 0, (FRONT + BACK) / 2);
    floor.receiveShadow = true;
    root.add(floor);

    // Shell: walls, ceiling, stripe band.
    const wall = flat(era.wall, { roughness: 0.9 });
    box([WALL * 2, CEIL, 0.1], [0, CEIL / 2, BACK], wall, false);
    box([0.1, CEIL, FRONT - BACK], [WALL, CEIL / 2, (FRONT + BACK) / 2], wall, false);
    box([0.1, CEIL, FRONT - BACK], [-WALL, CEIL / 2, (FRONT + BACK) / 2], wall, false);
    const tileArt = paint(128, 128, (ctx) => { ctx.fillStyle = era.ceiling; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 260; i++) ctx.fillRect(random() * 128, random() * 128, 1.5, 1.5); ctx.fillStyle = 'rgba(60,60,50,0.4)'; ctx.fillRect(0, 0, 128, 3); ctx.fillRect(0, 0, 3, 128); });
    tileArt.wrapS = tileArt.wrapT = THREE.RepeatWrapping; tileArt.repeat.set(WALL * 2 / 0.6, (FRONT - BACK) / 1.2);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WALL * 2, FRONT - BACK).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: tileArt, roughness: 0.95, emissive: tubeTint, emissiveIntensity: dip ? 0.02 : 0.05 }));
    ceiling.position.set(0, CEIL, (FRONT + BACK) / 2);
    root.add(ceiling);
    const bandArt = paint(8, 48, (ctx) => { era.band.forEach((colour, i) => { ctx.fillStyle = colour; ctx.fillRect(0, i * 16, 8, 16); }); });
    const band = new THREE.MeshStandardMaterial({ map: bandArt, roughness: 0.6 });
    box([WALL * 2, 0.3, 0.02], [0, 2.78, BACK + 0.06], band, false);
    for (const side of [-1, 1]) box([0.02, 0.3, FRONT - BACK], [side * (WALL - 0.06), 2.78, (FRONT + BACK) / 2], band, false);
    if (mood.wear > 0.55) box([0.58, 0.02, 1.18], [-0.95 + random() * 0.3, CEIL - 0.004, 1.9 + random()], flat('#1a1a1c'), false);

    // Fluorescent fixtures and the pools of light they throw.
    const pool = paint(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); });
    const fixtureZ = [5.4, 3.0, 0.6, -1.9, -4.6];
    const dead = new Set<number>();
    if (dip) { dead.add(0); dead.add(3); if (random() < 0.5) dead.add(1); }
    else if (mood.wear > 0.5) dead.add(pick([0, 1, 3, 4]));
    const stutter = dip ? [1, 4, 2].filter((i) => !dead.has(i)) : mood.wear > 0.35 || mood.energy > 0.7 ? [pick([1, 3, 4])].filter((i) => !dead.has(i)) : [];
    const tubes: { material: THREE.MeshStandardMaterial; glow: THREE.MeshBasicMaterial; base: number; pool: number; index: number }[] = [];
    fixtureZ.forEach((z, index) => {
      const lit = !dead.has(index);
      const base = lit ? mix(1.2, 2, mood.cheer) : 0.06;
      const material = new THREE.MeshStandardMaterial({ color: '#f4f6f4', emissive: tubeTint, emissiveIntensity: base, roughness: 0.4 });
      const strip = a.era === 'modern';
      box(strip ? [0.2, 0.05, 2.3] : [0.72, 0.07, 1.36], [0, CEIL - 0.035, z], flat(strip ? '#2a2e32' : '#e8e8e2'), false);
      if (strip) box([0.11, 0.02, 2.2], [0, CEIL - 0.07, z], material, false);
      else for (const x of [-0.17, 0.17]) box([0.2, 0.025, 1.24], [x, CEIL - 0.08, z], material, false);
      const hero = index === 2;
      const strength = lit ? (hero ? 0.2 : 0.09) : 0;
      const glow = new THREE.MeshBasicMaterial({ map: pool, color: tubeTint, transparent: true, opacity: strength, depthWrite: false, blending: THREE.AdditiveBlending });
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(hero ? 3.4 : 2.7, hero ? 3.6 : 3).rotateX(-Math.PI / 2), glow);
      disc.position.set(0, 0.006 + index * 0.0005, z);
      root.add(disc);
      tubes.push({ material, glow, base, pool: strength, index });
    });

    // Gondola shelving down both sides, with price rails.
    const steel = flat(era.gondola, { roughness: 0.5, metalness: 0.15 });
    const woodArt = paint(128, 128, (ctx) => { ctx.fillStyle = era.end; ctx.fillRect(0, 0, 128, 128); if (a.era === 'seventies' || a.era === 'indie') { ctx.strokeStyle = 'rgba(40,20,8,0.35)'; for (let x = 3; x < 128; x += 4 + random() * 7) { ctx.lineWidth = 0.6 + random() * 1.4; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + random() * 8 - 4, 40, x + random() * 8 - 4, 90, x, 128); ctx.stroke(); } } });
    const endPanel = new THREE.MeshStandardMaterial({ map: woodArt, roughness: 0.6 });
    const railArt = paint(256, 32, (ctx) => {
      ctx.fillStyle = era.strip; ctx.fillRect(0, 0, 256, 32);
      ctx.font = 'bold 14px sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (let x = 5; x < 256; x += 36) { ctx.fillStyle = a.era === 'modern' ? '#1b1d20' : '#ffffff'; ctx.fillRect(x, 5, 28, 22); ctx.fillStyle = a.era === 'modern' ? '#eaffea' : '#16181c'; ctx.fillText(`${1 + Math.floor(random() * 4)}.${Math.floor(random() * 9)}9`, x + 2, 17); }
    });
    railArt.wrapS = THREE.RepeatWrapping; railArt.repeat.set(9, 1);
    const rail = new THREE.MeshStandardMaterial({ map: railArt, roughness: 0.5, emissive: era.strip, emissiveIntensity: 0.1 });
    const length = NEAR - FAR, midZ = (NEAR + FAR) / 2, bays = 6, bay = length / bays;
    const shelfY = [0.17, 0.5, 0.8, 1.1];
    for (const side of [-1, 1]) {
      box([0.05, TOP, length], [side * (AISLE + DEPTH - 0.025), TOP / 2, midZ], steel);
      box([DEPTH, 0.16, length], [side * (AISLE + DEPTH / 2), 0.08, midZ], steel);
      box([DEPTH + 0.02, 0.03, length], [side * (AISLE + DEPTH / 2), TOP, midZ], steel);
      shelfY.forEach((y, level) => {
        if (level) box([DEPTH - 0.1, 0.025, length], [side * (AISLE + DEPTH / 2 + 0.05), y - 0.0125, midZ], steel);
        box([0.012, 0.045, length], [side * (AISLE + (level ? 0.1 : 0) - 0.006), y - 0.01, midZ], rail, false);
      });
      for (let i = 0; i <= bays; i++) box([DEPTH - 0.06, TOP, 0.025], [side * (AISLE + DEPTH / 2 + 0.03), TOP / 2, FAR + i * bay], steel);
      box([DEPTH + 0.04, TOP + 0.04, 0.05], [side * (AISLE + DEPTH / 2), TOP / 2 + 0.02, FAR - 0.03], endPanel);
    }

    // Stock: one instanced mesh each for cartons, bags and cans, tinted per facing.
    const labelArt = paint(64, 64, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 0, 64, 6); ctx.fillRect(0, 58, 64, 6); ctx.fillStyle = '#777777'; ctx.fillRect(0, 20, 64, 20); ctx.fillStyle = '#f6f6f6'; ctx.fillRect(8, 26, 48, 8); ctx.fillStyle = '#a8a8a8'; ctx.fillRect(10, 46, 44, 5); });
    const goodsMaterial = new THREE.MeshStandardMaterial({ map: labelArt, roughness: 0.5 });
    const bagGeometry = new THREE.BoxGeometry(1, 1, 1, 2, 4, 2);
    { const p = bagGeometry.attributes.position; for (let i = 0; i < p.count; i++) { const v = p.getY(i) * 2, u = p.getX(i) * 2; p.setZ(i, p.getZ(i) * (Math.abs(v) > 0.9 ? 0.08 : Math.max(0.08, Math.cos(v * 1.6) ** 0.6 * (1 - 0.4 * u * u)))); } bagGeometry.computeVertexNormals(); }
    const kinds = {
      carton: { geometry: new THREE.BoxGeometry(1, 1, 1), size: [0.13, 0.17, 0.07], list: [] as { matrix: THREE.Matrix4; colour: string }[] },
      bag: { geometry: bagGeometry, size: [0.2, 0.27, 0.085], list: [] as { matrix: THREE.Matrix4; colour: string }[] },
      can: { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 9), size: [0.075, 0.14, 0.075], list: [] as { matrix: THREE.Matrix4; colour: string }[] },
    };
    type Kind = keyof typeof kinds;
    const dummy = new THREE.Object3D();
    const stamp = (kind: Kind, at: [number, number, number], turn: [number, number, number], scale: number, colour: string, stretch = 1) => {
      const [w, h, d] = kinds[kind].size;
      dummy.position.set(...at); dummy.rotation.set(...turn); dummy.scale.set(w * scale, h * scale * stretch, d * scale); dummy.updateMatrix();
      kinds[kind].list.push({ matrix: dummy.matrix.clone(), colour });
    };
    const fill = mix(0.12, 1, a.stock) * mix(0.8, 1, mood.density);
    for (const side of [-1, 1]) for (let b = 0; b < bays; b++) for (let level = 0; level < 4; level++) {
      const kind: Kind = level === 0 ? pick(['bag', 'can', 'carton']) : pick(['bag', 'bag', 'carton', 'carton', 'can']);
      const stripped = random() < (1 - a.stock) * 0.45;
      const scale = mix(0.85, 1.15, random()), stretch = kind === 'can' ? pick([1, 1, 1.7]) : mix(0.85, 1.15, random());
      const [w, h, d] = kinds[kind].size;
      let z = FAR + b * bay + 0.05, colour = pick(era.goods), run = 0;
      while (z + w * scale < FAR + (b + 1) * bay - 0.04) {
        if (run-- <= 0) { colour = pick(era.goods); run = 1 + Math.floor(random() * 4); }
        const present = !stripped && random() < fill + 0.05;
        const x = side * (AISLE + (level ? 0.1 : 0) + d * scale / 2 + 0.02);
        if (present) {
          const messy = (1 - a.stock) * 0.25 + mood.wear * 0.12;
          stamp(kind, [x, shelfY[level] + h * scale * stretch / 2, z + w * scale / 2], [0, -side * Math.PI / 2 + (random() - 0.5) * messy, (random() - 0.5) * messy * 0.5], scale, colour, stretch);
          if (random() < fill * 0.8) stamp(kind, [x + side * d * scale * 1.05, shelfY[level] + h * scale * stretch / 2, z + w * scale / 2], [0, -side * Math.PI / 2, 0], scale, colour, stretch);
        } else if (stripped && random() < 0.12) stamp(kind, [x + side * 0.1, shelfY[level] + d * scale / 2, z + w * scale / 2], [Math.PI / 2, 0, random() * 3], scale, colour, stretch);
        z += w * scale + (kind === 'bag' ? 0.012 : 0.006);
      }
    }
    // Top stock and things that have fallen to the floor.
    for (const side of [-1, 1]) for (let i = 0; i < Math.round(mood.density * 9 * a.stock); i++) stamp('carton', [side * (AISLE + DEPTH / 2), TOP + 0.015 + 0.11, FAR + 0.4 + random() * (length - 0.8)], [0, (random() - 0.5) * 0.3, 0], 2.6, pick(['#b08a5a', '#a57e50', '#c09a68']), 0.5);
    const strays = Math.round((1 - a.stock) * 4 + mood.wear * 4);
    for (let i = 0; i < strays; i++) { const kind = pick(['bag', 'carton', 'can'] as const), side = random() < 0.5 ? -1 : 1; stamp(kind, [side * (AISLE - 0.08 - random() * 0.16), kinds[kind].size[2] / 2, mix(-1.4, 2.0, random()) * (side < 0 ? 0.6 : 1) + (side < 0 ? 0.3 : 0)], [Math.PI / 2, 0, random() * 6], 1, pick(era.goods)); }
    const tint = new THREE.Color();
    for (const kind of Object.values(kinds)) {
      if (!kind.list.length) { kind.geometry.dispose(); continue; }
      const mesh = new THREE.InstancedMesh(kind.geometry, goodsMaterial, kind.list.length);
      kind.list.forEach((entry, i) => { mesh.setMatrixAt(i, entry.matrix); mesh.setColorAt(i, tint.set(entry.colour)); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }

    // Left wall: cooler doors glowing. Right wall: a sign.
    const coolerArt = paint(512, 256, (ctx) => {
      ctx.fillStyle = '#2a2e32'; ctx.fillRect(0, 0, 512, 256);
      for (let d = 0; d < 4; d++) {
        const x = d * 128 + 8; const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#f2fffd'); g.addColorStop(1, '#bfe6e2');
        ctx.fillStyle = g; ctx.fillRect(x, 10, 112, 236);
        for (let row = 0; row < 5; row++) { ctx.fillStyle = '#7f9a98'; ctx.fillRect(x, 54 + row * 46, 112, 4); for (let k = 0; k < 7; k++) { ctx.fillStyle = pick(LOUD); ctx.fillRect(x + 5 + k * 15, 24 + row * 46, 10, 30); } }
        ctx.fillStyle = '#16181c'; ctx.fillRect(x + 100, 90, 5, 70);
      }
    });
    coolerArt.wrapS = THREE.RepeatWrapping; coolerArt.repeat.set(3, 1);
    const cooler = new THREE.Mesh(new THREE.PlaneGeometry(FRONT - BACK, 2.3).rotateY(Math.PI / 2), glowing(coolerArt, dip ? 0.25 : 0.75));
    cooler.position.set(-WALL + 0.06, 1.25, (FRONT + BACK) / 2);
    root.add(cooler);
    const beerArt = paint(384, 128, (ctx) => { ctx.fillStyle = '#16181c'; ctx.fillRect(0, 0, 384, 128); ctx.strokeStyle = era.band[0]; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 368, 112); ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 14; lettering(ctx, pick(['COLD BEER', 'ICE  2.99', 'ATM', 'RESTROOMS  >']), 192, 66, 62, '#bff4ff', 340, hand ? 'cursive' : 'sans-serif'); });
    const beer = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.72).rotateY(-Math.PI / 2), glowing(beerArt, 0.9));
    beer.position.set(WALL - 0.06, 2.18, -0.4);
    root.add(beer);

    // Far end, left: the window onto the forecourt.
    const windowArt = paint(512, 288, (ctx) => {
      const dawn = a.window === 'dawn', none = a.window === 'void';
      const sky = ctx.createLinearGradient(0, 0, 0, 288);
      sky.addColorStop(0, dawn ? '#33447a' : none ? '#0d1017' : '#101a38'); sky.addColorStop(0.6, dawn ? '#f09a62' : none ? '#11141c' : '#24335c'); sky.addColorStop(0.62, '#161c2a'); sky.addColorStop(1, none ? '#11141c' : '#2a3242');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 512, 288);
      if (none) {
        ctx.fillStyle = 'rgba(235,245,255,0.5)'; for (let i = 0; i < 4; i++) ctx.fillRect(210 - i * 26, 36 + i * 30, 90 + i * 52, 7 + i * 2);
        ctx.shadowColor = '#ff3a2a'; ctx.shadowBlur = 16; ctx.save(); ctx.translate(410, 70); ctx.scale(-1, 1); lettering(ctx, 'OPEN', 0, 0, 48, '#ff6a5a', 150); ctx.restore(); ctx.shadowBlur = 0;
        return;
      }
      for (let i = 0; i < 16; i++) { ctx.fillStyle = pick(['#ffd9a0', '#ffffff', '#ff8a6a', '#a8d0ff']); ctx.fillRect(random() * 512, 160 + random() * 14, 2.5, 2.5); }
      // Price pole.
      ctx.fillStyle = '#0c0f16'; ctx.fillRect(48, 60, 8, 160); ctx.fillStyle = era.band[0]; ctx.fillRect(22, 38, 60, 26); ctx.fillStyle = '#fdfdf2'; ctx.fillRect(22, 64, 60, 44);
      lettering(ctx, era.chain, 52, 51, 13, '#ffffff', 56); lettering(ctx, `3.${Math.floor(random() * 90 + 9)}`, 52, 86, 22, '#d3201c', 54, 'monospace');
      // Canopy, columns, pumps.
      const spill = ctx.createLinearGradient(0, 78, 0, 240); spill.addColorStop(0, 'rgba(255,246,214,0.55)'); spill.addColorStop(1, 'rgba(255,246,214,0)');
      ctx.fillStyle = spill; ctx.beginPath(); ctx.moveTo(130, 80); ctx.lineTo(500, 80); ctx.lineTo(512, 240); ctx.lineTo(96, 240); ctx.fill();
      ctx.fillStyle = '#f7f7ee'; ctx.fillRect(118, 48, 394, 30); ctx.fillStyle = era.band[0]; ctx.fillRect(118, 48, 394, 9); ctx.fillStyle = era.band[2]; ctx.fillRect(118, 57, 394, 4);
      ctx.fillStyle = '#fffbe0'; for (let x = 150; x < 500; x += 58) ctx.fillRect(x, 76, 26, 5);
      ctx.fillStyle = '#c9ccd0'; for (const x of [170, 450]) ctx.fillRect(x, 80, 9, 142);
      for (const x of [226, 300, 380]) { ctx.fillStyle = '#1a1f2a'; ctx.fillRect(x, 160, 30, 62); ctx.fillStyle = era.band[0]; ctx.fillRect(x, 160, 30, 9); ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x + 6, 176, 18, 12); }
      ctx.fillStyle = 'rgba(255,244,204,0.22)'; ctx.beginPath(); ctx.ellipse(310, 236, 220, 20, 0, 0, 7); ctx.fill();
      if (a.window === 'truck') {
        ctx.fillStyle = '#0c0f16'; ctx.fillRect(250, 122, 250, 84); ctx.fillRect(196, 150, 54, 60); ctx.fillStyle = '#20262e'; ctx.fillRect(204, 158, 30, 20);
        for (let x = 258; x < 500; x += 26) { ctx.fillStyle = '#ffae1c'; ctx.fillRect(x, 126, 6, 4); ctx.fillRect(x, 200, 6, 4); }
        for (const x of [262, 300, 440, 478]) { ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.arc(x, 216, 13, 0, 7); ctx.fill(); }
        const beam = ctx.createRadialGradient(196, 196, 2, 196, 196, 70); beam.addColorStop(0, 'rgba(255,250,220,0.95)'); beam.addColorStop(1, 'rgba(255,250,220,0)'); ctx.fillStyle = beam; ctx.fillRect(110, 130, 150, 130);
      }
      if (a.window === 'cruiser') {
        ctx.fillStyle = '#0c0f16'; ctx.fillRect(250, 186, 130, 30); ctx.fillRect(278, 166, 70, 22); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(296, 190, 40, 20);
        for (const [x, colour] of [[296, '255,40,40'], [332, '60,110,255']] as const) { const g = ctx.createRadialGradient(x, 160, 2, x, 160, 120); g.addColorStop(0, `rgba(${colour},0.95)`); g.addColorStop(1, `rgba(${colour},0)`); ctx.fillStyle = g; ctx.fillRect(x - 130, 30, 260, 250); }
      }
      if (a.window === 'snow') { ctx.fillStyle = 'rgba(236,242,252,0.8)'; ctx.fillRect(0, 216, 512, 72); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 240; i++) { const r = 0.8 + random() * 2; ctx.globalAlpha = 0.4 + random() * 0.6; ctx.fillRect(random() * 512, random() * 288, r, r); } ctx.globalAlpha = 1; }
      if (a.window === 'rain') {
        ctx.strokeStyle = 'rgba(210,228,255,0.4)'; ctx.lineWidth = 1.2; for (let i = 0; i < 170; i++) { const x = random() * 540, y = random() * 288, l = 12 + random() * 26; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.25, y + l); ctx.stroke(); }
        for (let i = 0; i < 26; i++) { const x = random() * 512; const g = ctx.createLinearGradient(0, 80, 0, 288); g.addColorStop(0, 'rgba(255,246,214,0)'); g.addColorStop(1, `rgba(255,246,214,${0.1 + random() * 0.25})`); ctx.fillStyle = g; ctx.fillRect(x, 80 + random() * 60, 3 + random() * 6, 208); }
      }
    });
    const glassX = -2.05, glassW = 4.1, glassY = 1.55, glassH = 2.0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(glassW, glassH), glowing(windowArt, 0.95, { roughness: 0.1 }));
    pane.position.set(glassX, glassY, BACK + 0.07);
    root.add(pane);
    const frame = flat('#5a6064', { metalness: 0.6, roughness: 0.4 });
    for (const y of [glassY - glassH / 2, glassY + glassH / 2]) box([glassW + 0.1, 0.07, 0.08], [glassX, y, BACK + 0.09], frame, false);
    for (let i = 0; i < 5; i++) box([0.06, glassH, 0.08], [glassX - glassW / 2 + i * glassW / 4, glassY, BACK + 0.09], frame, false);
    box([glassW + 0.1, glassY - glassH / 2, 0.14], [glassX, (glassY - glassH / 2) / 2, BACK + 0.1], flat(era.end), false);

    // Far end, right: the hot-food counter and its menu board.
    const cx = 2.05, cz = -5.5, cw = 3.9;
    box([cw, 0.9, 0.75], [cx, 0.45, cz], endPanel);
    box([cw + 0.06, 0.04, 0.82], [cx, 0.92, cz], flat('#c3c8c9', { metalness: 0.7, roughness: 0.35 }));
    box([cw, 0.1, 0.02], [cx, 0.78, cz + 0.385], band, false);
    const shut = a.counter === 'shuttered';
    const menuArt = paint(512, 128, (ctx) => {
      ctx.fillStyle = shut ? '#2a2c30' : era.signBg; ctx.fillRect(0, 0, 512, 128);
      const ink = shut ? '#6a6e74' : era.signInk, font = hand ? 'cursive' : 'sans-serif';
      lettering(ctx, a.counter === 'coffee' ? 'FRESH COFFEE' : 'HOT FOOD', 120, 64, 44, ink, 220, font);
      ctx.textAlign = 'left'; ctx.font = `bold 21px ${hand ? 'cursive' : 'monospace'}`;
      (a.counter === 'coffee' ? ['SMALL   1.29', 'LARGE   1.79', 'REFILL   .99', 'DONUT   1.19'] : ['ROLLER DOG 1.99', 'NACHOS     3.49', 'TAQUITO  2/3.00', 'PIZZA SLICE 2.79']).forEach((line, i) => ctx.fillText(line, 262, 24 + i * 27));
    });
    const menu = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.82), glowing(menuArt, shut ? 0.12 : mix(0.6, 1, mood.cheer)));
    menu.position.set(cx + 0.2, 2.18, BACK + 0.07);
    root.add(menu);
    let counterGlow: THREE.PointLight | null = null;
    if (shut) {
      const grilleArt = paint(64, 64, (ctx) => { ctx.fillStyle = '#7d8488'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#4a5054'; for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 64, 3); });
      grilleArt.wrapS = grilleArt.wrapT = THREE.RepeatWrapping; grilleArt.repeat.set(10, 3);
      box([cw, 0.82, 0.03], [cx, 1.35, cz + 0.3], new THREE.MeshStandardMaterial({ map: grilleArt, metalness: 0.5, roughness: 0.5 }));
      const closed = paint(256, 96, (ctx) => { ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, 256, 96); lettering(ctx, 'CLOSED', 128, 50, 62, '#c8102e', 236, hand ? 'cursive' : 'sans-serif'); });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.23), new THREE.MeshStandardMaterial({ map: closed, roughness: 0.8 }));
      card.position.set(1.0, 1.4, cz + 0.32); card.rotation.z = (random() - 0.5) * 0.14;
      root.add(card);
    } else if (a.counter === 'coffee') {
      for (let i = 0; i < 3; i++) {
        const x = 2.2 + i * 0.5;
        const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 18), flat('#c3c8c9', { metalness: 0.8, roughness: 0.3 }));
        urn.position.set(x, 1.3, cz); urn.castShadow = true; root.add(urn);
        box([0.26, 0.09, 0.26], [x, 0.985, cz], flat('#1c1e20'));
        box([0.2, 0.07, 0.2], [x, 1.61, cz], flat('#1c1e20'));
        box([0.16, 0.07, 0.01], [x, 1.42, cz + 0.151], flat(['#7a3a12', '#c8102e', '#1f8f3a'][i], { emissive: ['#7a3a12', '#c8102e', '#1f8f3a'][i], emissiveIntensity: 0.4 }), false);
      }
      for (let i = 0; i < 2; i++) { const cups = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.3 + random() * 0.25, 12), flat('#f4f1e6')); cups.position.set(3.62 + i * 0.13, 1.09 + (cups.geometry as THREE.CylinderGeometry).parameters.height / 2 - 0.15, cz + 0.12); cups.castShadow = true; root.add(cups); }
    } else {
      // A lit warmer case with golden things in it.
      const warm = new THREE.Color().setHSL(mix(0.11, 0.06, mood.warmth), 1, 0.6);
      box([1.7, 0.06, 0.6], [2.75, 0.97, cz], flat('#2a2c30'));
      box([1.7, 0.07, 0.6], [2.75, 1.56, cz], flat('#2a2c30'));
      box([1.6, 0.02, 0.5], [2.75, 1.52, cz], flat(warm, { emissive: warm, emissiveIntensity: 1.6 }), false);
      for (const x of [-0.83, 0.83]) box([0.04, 0.55, 0.6], [2.75 + x, 1.26, cz], flat('#2a2c30'));
      box([1.62, 0.5, 0.02], [2.75, 1.26, cz + 0.29], new THREE.MeshPhysicalMaterial({ color: '#fff3d8', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }), false);
      for (let i = 0; i < Math.round(mix(3, 12, a.stock)); i++) box([0.12 + random() * 0.08, 0.05 + random() * 0.04, 0.1], [2.05 + random() * 1.4, 1.04, cz + (random() - 0.5) * 0.3], flat(pick(['#d9a23a', '#c9762a', '#e8c06a', '#a8521c']), { emissive: '#7a3a08', emissiveIntensity: 0.3 }));
      counterGlow = new THREE.PointLight(warm, 5, 5, 1.6);
      counterGlow.position.set(2.6, 1.5, cz + 0.6);
      root.add(counterGlow);
      if (a.counter === 'away') {
        const note = paint(192, 128, (ctx) => { ctx.fillStyle = '#f7f3e4'; ctx.fillRect(0, 0, 192, 128); lettering(ctx, 'BACK IN', 96, 40, 40, '#1b2a66', 180, 'cursive', 'bold'); lettering(ctx, '5 MIN', 96, 90, 48, '#1b2a66', 180, 'cursive', 'bold'); });
        const tent = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.23), new THREE.MeshStandardMaterial({ map: note, roughness: 0.9, side: THREE.DoubleSide }));
        tent.position.set(0.36, 1.055, cz + 0.2); tent.rotation.x = -0.25; tent.castShadow = true;
        root.add(tent);
      }
    }

    // What hangs over the aisle.
    if (a.overhead === 'marker' || a.overhead === 'banner') {
      const marker = a.overhead === 'marker';
      const art = paint(512, marker ? 176 : 112, (ctx) => {
        ctx.fillStyle = marker ? era.signBg : era.band[1]; ctx.fillRect(0, 0, 512, 176);
        const font = hand ? 'cursive' : 'sans-serif';
        if (marker) { lettering(ctx, `AISLE ${1 + Math.floor(random() * 6)}`, 256, 44, 56, era.signInk, 480, font); ctx.fillStyle = era.signInk; ctx.fillRect(40, 84, 432, 4); lettering(ctx, 'CHIPS · CANDY · JERKY', 256, 128, 40, era.signInk, 480, font, 'bold'); }
        else { ctx.strokeStyle = era.band[0]; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 502, 102); lettering(ctx, 'ROLLER DOGS  2 FOR $3', 256, 58, 50, a.era === 'indie' ? '#b3201c' : '#ffffff', 480, font); }
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(marker ? 1.5 : 2.5, marker ? 0.52 : 0.55), glowing(art, 0.22, { side: THREE.DoubleSide }));
      board.position.set(0, marker ? 2.42 : 2.36, marker ? 2.0 : -2.6);
      if (!marker) board.rotation.z = (random() - 0.5) * 0.08;
      root.add(board);
      for (const x of [-1, 1]) box([0.012, CEIL - board.position.y - 0.2, 0.012], [x * (marker ? 0.6 : 1.15), (CEIL + board.position.y + 0.25) / 2, board.position.z], flat('#8a8e90'), false);
    } else if (a.overhead === 'mirror') {
      const fish = paint(128, 128, (ctx) => { const g = ctx.createRadialGradient(54, 50, 4, 64, 64, 64); g.addColorStop(0, '#f6fbff'); g.addColorStop(0.5, '#aebcc6'); g.addColorStop(1, '#4a545c'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); ctx.strokeStyle = era.gondola; ctx.lineWidth = 7; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(64 + s * 12, 30); ctx.quadraticCurveTo(64 + s * 30, 70, 64 + s * 54, 112); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(56, 14, 16, 5); });
      const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, 0.9), glowing(fish, 0.35, { roughness: 0.15, metalness: 0.3 }));
      mirror.position.set(1.15, 2.42, -2.7); mirror.rotation.set(Math.PI / 2 + 0.5, 0, -0.35, 'YXZ');
      root.add(mirror);
    }

    // What is happening, in the near right of the aisle.
    const hx = 0.95, hz = 2.5;
    if (a.happening === 'mopped') {
      const sheen = paint(128, 256, (ctx) => { ctx.clearRect(0, 0, 128, 256); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineCap = 'round'; for (let i = 0; i < 9; i++) { ctx.lineWidth = 9 + random() * 12; ctx.globalAlpha = 0.25 + random() * 0.5; ctx.beginPath(); ctx.arc(64 + (i % 2 ? -34 : 34), 20 + i * 27, 62, i % 2 ? -0.9 : Math.PI - 0.9, i % 2 ? 0.9 : Math.PI + 0.9); ctx.stroke(); } });
      const wet = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: sheen, color: tubeTint, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
      wet.position.set(0, 0.012, 0.6);
      root.add(wet);
      const signArt = paint(128, 256, (ctx) => { ctx.fillStyle = '#f6cf1c'; ctx.fillRect(0, 0, 128, 256); ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 8, 128, 36); lettering(ctx, 'CAUTION', 64, 27, 24, '#ffffff', 118); ctx.strokeStyle = '#16181c'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(64, 62); ctx.lineTo(112, 148); ctx.lineTo(16, 148); ctx.closePath(); ctx.stroke(); lettering(ctx, '!', 64, 116, 64, '#16181c', 40); lettering(ctx, 'WET', 64, 186, 34, '#16181c', 118); lettering(ctx, 'FLOOR', 64, 226, 34, '#16181c', 118); });
      const yellow = flat('#f6cf1c'), art = new THREE.MeshStandardMaterial({ map: signArt, roughness: 0.55 });
      const sign = new THREE.Group();
      for (const side of [1, -1]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.64, 0.012).translate(0, -0.32, 0), [yellow, yellow, yellow, yellow, side > 0 ? art : yellow, side > 0 ? yellow : art]); panel.position.y = 0.615; panel.rotation.x = -side * 0.27; panel.castShadow = true; sign.add(panel); }
      sign.position.set(hx, 0, hz); sign.rotation.y = -0.35;
      root.add(sign);
    } else if (a.happening === 'restock') {
      const card = flat('#b08a5a', { roughness: 0.9 });
      const tape = flat('#d9c9a0');
      let y = 0;
      for (let i = 0; i < 3; i++) { const w = 0.5 - i * 0.05, h = 0.32 - i * 0.03; const carton = box([w, h, 0.4 - i * 0.03], [hx + (random() - 0.5) * 0.05, y + h / 2, hz + (random() - 0.5) * 0.05], card); carton.rotation.y = (random() - 0.5) * 0.3; if (i < 2) box([0.06, 0.004, 0.4 - i * 0.03], [carton.position.x, y + h + 0.002, carton.position.z], tape, false).rotation.y = carton.rotation.y; y += h; }
      for (const side of [-1, 1]) box([0.2, 0.01, 0.34], [hx + side * 0.27, y + 0.06, hz], card).rotation.z = side * 0.9;
      for (let i = 0; i < 5; i++) stampLoose(hx - 0.14 + i * 0.07, y + 0.02, hz + (random() - 0.5) * 0.1);
      box([0.42, 0.22, 0.3], [hx - 0.1, 0.11, hz + 0.75], card).rotation.y = 0.5;
    } else if (a.happening === 'spill') {
      const colour = pick(['#1f8fe8', '#e8263c', '#7fd62a', '#a04cf0']);
      const points: THREE.Vector2[] = [];
      const lobes = [random() * 6, random() * 6];
      for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2, r = 0.42 * (1 + 0.28 * Math.sin(t * 2 + lobes[0]) + 0.2 * Math.sin(t * 5 + lobes[1])); points.push(new THREE.Vector2(Math.cos(t) * r * 0.9, Math.sin(t) * r * 1.3)); }
      const puddle = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(points)).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.3, transparent: true, opacity: 0.85, roughness: 0.05, depthWrite: false }));
      puddle.position.set(hx - 0.1, 0.008, hz);
      root.add(puddle);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.16, 14), flat('#f4f1e6', { roughness: 0.5 }));
      cup.position.set(hx + 0.12, 0.05, hz - 0.2); cup.rotation.set(0.4, 0.8, Math.PI / 2 - 0.1); cup.castShadow = true;
      root.add(cup);
      box([0.11, 0.05, 0.11], [hx + 0.12, 0.05, hz - 0.2], flat(colour, { emissive: colour, emissiveIntensity: 0.2 }), false).rotation.copy(cup.rotation);
    }
    function stampLoose(x: number, y: number, z: number) {
      const loose = new THREE.Mesh(bagGeometry, new THREE.MeshStandardMaterial({ map: labelArt, color: pick(era.goods), roughness: 0.5 }));
      loose.scale.set(0.16, 0.24, 0.1); loose.position.set(x, y + 0.06, z); loose.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5); loose.castShadow = true;
      root.add(loose);
    }
    if (mood.wear > 0.45) for (let i = 0; i < Math.round(mood.wear * 7); i++) {
      const stain = new THREE.Mesh(new THREE.CircleGeometry(0.12 + random() * 0.25, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3a3428', transparent: true, opacity: 0.1 + random() * 0.14, depthWrite: false }));
      stain.position.set((random() - 0.5) * 2.4, 0.004, mix(-5, 5, random())); stain.scale.z = 0.6 + random();
      root.add(stain);
    }

    // Display stands that small things are lifted onto.
    const standTop = flat('#f4f4f0', { roughness: 0.5 }), standBody = flat(era.band[0], { roughness: 0.6 });
    const stands = SLOTS.map(() => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), standBody);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0), standTop);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), rail);
      body.castShadow = top.castShadow = body.receiveShadow = top.receiveShadow = true;
      group.add(body, top, strip);
      group.visible = false;
      root.add(group);
      return { group, body, top, strip };
    });

    // Light: a soft overall wash, a key from the tubes above, and the hero's own pool.
    const level = dip ? 0.5 : 1;
    root.add(new THREE.HemisphereLight(tubeTint, '#6a6a66', 0.85 * level));
    const key = new THREE.DirectionalLight(tubeTint, 1.2 * level);
    key.position.set(-2.4, 9, 4.6);
    key.target.position.set(0, 0, 0.3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0004;
    const shadow = key.shadow.camera;
    shadow.left = -4.6; shadow.right = 4.6; shadow.bottom = -7.5; shadow.top = 7.5; shadow.near = 1; shadow.far = 22;
    shadow.updateProjectionMatrix();
    root.add(key, key.target);
    const spot = new THREE.SpotLight(tubeTint, 16, 7, 0.6, 0.9, 1.4);
    spot.position.set(SLOTS[0].x, CEIL - 0.1, SLOTS[0].z + 0.3);
    spot.target.position.set(SLOTS[0].x, 0, SLOTS[0].z);
    root.add(spot, spot.target);
    const bounce = new THREE.DirectionalLight('#dfe8ff', 0.4 * level);
    bounce.position.set(1.5, 2.2, 9);
    root.add(bounce);

    const view = VIEWS[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.3, 40);
    camera.position.set(view.at[0], view.at[1], view.at[2]);
    camera.lookAt(view.to[0], view.to[1], view.to[2]);

    const place = (items: readonly Placeable[]) => {
      for (const stand of stands) stand.group.visible = false;
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length], stand = stands[index % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits; shrunk to fit the aisle when it does not; tiny things grow a little.
        const scale = Math.min(fit, Math.max(1, Math.min(0.45 / height, 3)));
        const small = height * scale < 0.8 && radius * scale < 0.6;
        let y = 0, x = slot.x, z = slot.z;
        if (small && slot.counter) { y = 0.94; z = cz + 0.02; x = Math.min(1.75 - radius * scale, Math.max(0.3 + radius * scale, slot.x)); }
        else if (small) {
          y = THREE.MathUtils.clamp(1.0 - height * scale * 0.6, 0.5, 0.82);
          const side = Math.min(slot.r * 2, Math.max(0.5, radius * scale * 2 + 0.1));
          stand.group.visible = true;
          stand.group.position.set(x, 0, z);
          stand.group.rotation.y = slot.turn;
          stand.body.scale.set(side - 0.06, y - 0.03, side - 0.06);
          stand.top.scale.set(side, 0.03, side); stand.top.position.y = y;
          stand.strip.scale.set(side + 0.004, 0.045, side + 0.004); stand.strip.position.y = y - 0.055;
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.rotation.y = slot.turn + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.6, 2.2, mood.energy);
    return {
      object: root, camera, background: new THREE.Color(era.wall), capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(_dt, time) {
        for (const tube of tubes) {
          let on = 1;
          if (stutter.includes(tube.index)) { const n = Math.sin(time * 31 * pace + tube.index * 7) * Math.sin(time * 7.3 * pace + tube.index) + Math.sin(time * 2.1 + tube.index * 3) * 0.6; on = n > (dip ? 0.1 : 0.75) ? 0.2 : 1; }
          else on = 0.97 + 0.03 * Math.sin(time * 60 + tube.index);
          tube.material.emissiveIntensity = tube.base * on;
          tube.glow.opacity = tube.pool * on;
        }
        if (counterGlow) counterGlow.intensity = 5 * (0.94 + 0.06 * Math.sin(time * 3.1));
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
