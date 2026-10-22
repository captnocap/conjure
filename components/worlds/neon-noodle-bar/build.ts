import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

type Emblem = 'cross' | 'heart' | 'bowl' | 'ring' | 'balls' | null;

/** One invented character: a few strokes on a three-by-three lattice, so it reads as writing without being any. */
function glyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, random: () => number) {
  const pad = size * 0.2, gap = (size - pad * 2) / 2;
  const at = (i: number, j: number): [number, number] => [x + pad + i * gap, y + pad + j * gap];
  const strokes = 3 + Math.floor(random() * 3);
  ctx.beginPath();
  for (let k = 0; k < strokes; k++) {
    const kind = random(), i = Math.floor(random() * 3), j = Math.floor(random() * 3);
    if (kind < 0.34) { ctx.moveTo(...at(0, j)); ctx.lineTo(...at(2, j)); }
    else if (kind < 0.64) { ctx.moveTo(...at(i, 0)); ctx.lineTo(...at(i, 2)); }
    else if (kind < 0.8) { ctx.moveTo(...at(1, 0)); ctx.lineTo(...at(random() < 0.5 ? 0 : 2, 2)); }
    else if (kind < 0.92) { const [bx, by] = at(Math.min(i, 1), Math.min(j, 1)); ctx.rect(bx, by, gap, gap); }
    else { const [tx, ty] = at(i, j); ctx.moveTo(tx, ty); ctx.lineTo(tx + gap * 0.45, ty + gap * 0.45); }
  }
  ctx.stroke();
}

function emblemArt(ctx: CanvasRenderingContext2D, emblem: Exclude<Emblem, null>, size: number) {
  const c = size / 2, r = size * 0.3;
  ctx.beginPath();
  if (emblem === 'cross') {
    ctx.fillRect(c - r * 0.35, c - r, r * 0.7, r * 2);
    ctx.fillRect(c - r, c - r * 0.35, r * 2, r * 0.7);
  } else if (emblem === 'heart') {
    ctx.arc(c - r * 0.5, c - r * 0.3, r * 0.55, Math.PI, 0);
    ctx.arc(c + r * 0.5, c - r * 0.3, r * 0.55, Math.PI, 0);
    ctx.lineTo(c, c + r);
    ctx.closePath();
    ctx.fill();
  } else if (emblem === 'bowl') {
    ctx.arc(c, c + r * 0.1, r, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    for (const dx of [-0.5, 0, 0.5]) {
      ctx.moveTo(c + dx * r, c - r * 0.15);
      ctx.quadraticCurveTo(c + dx * r + r * 0.3, c - r * 0.55, c + dx * r, c - r * 0.95);
    }
    ctx.stroke();
  } else if (emblem === 'ring') {
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const [dx, dy] of [[0, -0.55], [-0.6, 0.45], [0.6, 0.45]]) {
      ctx.moveTo(c + dx * r + r * 0.42, c + dy * r);
      ctx.arc(c + dx * r, c + dy * r, r * 0.42, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function signTexture(random: () => number, cols: number, rows: number, ink: string, paper: string, emblem: Emblem = null) {
  const cell = 72;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ctx.fillStyle = ink;
  ctx.lineWidth = 7;
  ctx.lineCap = 'square';
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  const vertical = rows >= cols;
  let skip = 0;
  if (emblem) {
    const size = Math.min(cols, rows) * cell;
    emblemArt(ctx, emblem, size);
    skip = Math.min(cols, rows);
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (emblem && (vertical ? r < skip : c < skip)) continue;
      glyph(ctx, c * cell, r * cell, cell, random);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SKY = {
  'blue-hour': { back: '#8493b4', sky: '#b9c6ee', low: '#5b5f78', far: '#73819f' },
  sodium: { back: '#a8917c', sky: '#f0cfa8', low: '#6a5a55', far: '#927e70' },
  magenta: { back: '#9a7fa6', sky: '#e3bdea', low: '#5d5273', far: '#876f96' },
  acid: { back: '#86a093', sky: '#c4e6cf', low: '#55665f', far: '#748c81' },
  pearl: { back: '#aab0b9', sky: '#e4e8f0', low: '#6c7078', far: '#959ba5' },
} as const;

const TARP = { blue: '#2f6fc4', striped: '#d9d3c2', clear: '#dfeaf0', army: '#5f6b46', yellow: '#e2b22c' } as const;

const SIGNS: Record<string, { colours: string[]; emblems: Emblem[] }> = {
  noodles: { colours: ['#ff5a36', '#ffb23a', '#ff3d5e', '#ffe08a'], emblems: ['bowl', null, 'bowl', null] },
  'clinic-pawn': { colours: ['#3fe07c', '#ffd23a', '#58d8ff', '#ff5a36'], emblems: ['cross', 'balls', null, 'cross'] },
  'love-hotel': { colours: ['#ff4fb0', '#c56bff', '#ff7a9c', '#7fd8ff'], emblems: ['heart', null, 'heart', 'ring'] },
  corporate: { colours: ['#7fe9ff', '#f2f6ff', '#4f9bff', '#f2f6ff'], emblems: ['ring', null, 'ring', null] },
  mixed: { colours: ['#ff5a36', '#3fe07c', '#ff4fb0', '#ffd23a', '#58d8ff', '#c56bff'], emblems: ['bowl', 'cross', 'heart', 'balls', null, null] },
};

export default defineWorld({
  questions: {
    stall: choice('What kind of noodle counter is it?', {
      ramen: 'A dark timber ramen bar with red split curtains and round red lanterns.',
      dumpling: 'A steel dumpling and noodle counter with towers of bamboo steamers and yellow lanterns.',
      synth: 'A white modular vat-noodle kiosk edged in cold cyan light strips, more machine than kitchen.',
      pushcart: 'A plywood pushcart on wheels with white paper lanterns, here tonight and gone tomorrow.',
    }),
    state: choice('What is happening at the counter right now?', {
      open: 'Open and serving: lanterns lit, broth steaming, bowls on the counter.',
      'last-orders': 'Closing up: half the lights off, some stools already upturned on the counter.',
      shuttered: 'Shuttered for the night: panels locked across the counter, lanterns dark, only the signs still on.',
      abandoned: 'Abandoned or raided: awning collapsed at one corner, stools knocked over, hazard tape across the front.',
    }),
    weather: choice('What is the weather doing in the alley?', {
      drizzle: 'Thin steady drizzle, fine streaks in the light.',
      downpour: 'A hammering downpour, sheets of rain and water running off the tarp.',
      'just-stopped': 'The rain has just stopped: no streaks, wide still puddles holding the signs.',
      steam: 'No rain but thick drifting steam and vent fog at street level.',
    }),
    sky: choice('What colour is the city glow behind the buildings?', {
      'blue-hour': 'Deep blue-grey dusk, the classic rainy blue hour.',
      sodium: 'Dirty orange-brown sodium haze.',
      magenta: 'Violet-pink smog lit from below by advertising.',
      acid: 'Sickly green-teal chemical haze.',
      pearl: 'Pale pearl-grey overcast, almost dawn after a long shift.',
    }),
    overhead: choice('What runs overhead?', {
      concrete: 'A heavy concrete expressway deck with a parapet and passing tail-lights.',
      girder: 'A riveted green steel rail viaduct with a lit train crossing it.',
      double: 'A double-decked flyover, two thin decks stacked with cable bundles between.',
    }),
    signage: choice('What do the stacked signs on the pole advertise?', {
      noodles: 'Food: hot reds and ambers, bowls and steam.',
      'clinic-pawn': 'Back-alley clinics and pawnbrokers: green crosses and yellow three-ball signs.',
      'love-hotel': 'Love hotels and clubs: pink and violet hearts.',
      corporate: 'Clean corporate logos in cold white and cyan, indifferent to the alley below.',
      mixed: 'Every trade at once in clashing colours.',
    }),
    awning: choice('What is the awning made of?', {
      blue: 'A bright blue poly tarp roped to poles.',
      striped: 'Faded red-and-cream striped canvas.',
      clear: 'A sheet of clear plastic beaded with rain, the lights showing through.',
      army: 'Patched olive-drab surplus canvas.',
      yellow: 'A loud yellow tarp.',
    }),
    trace: choice('What sign of customers is there?', {
      nothing: 'Nothing at all: six empty stools.',
      bowl: 'One steaming bowl with chopsticks across it and a stool pulled out, the eater gone.',
      umbrellas: 'Clear umbrellas, one open on the ground and others leaning on the counter.',
      scooter: 'A delivery scooter parked beside the stall with a lit box on the back.',
      crates: 'Stacked bottle crates and rubbish bags from a busy night.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const sky = SKY[a.sky];
    const lift = (hex: string, amount: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), amount).getHexString();
    const background = lift(sky.back, mood.cheer * 0.1 + (1 - Math.abs(mood.daylight - 0.5) * 2) * 0.06);
    const W = 12.6, D = 8.4;
    const { art: s, world } = diorama(context, {
      background, floor: '#59616f', width: W, depth: D, maxHeight: 2.4, radius: 1.2, pitch: 18, yaw: 24,
      slots: [[3.1, 1.6], [-4.3, 2.0, 0, 0.82], [-0.25, -2.02, 1.07, 0.3], [-0.6, 2.9, 0, 0.6]],
    });
    const root = s.root;
    (world.ground as THREE.Mesh | null)?.material && Object.assign((world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial, { roughness: 0.32 });
    for (const child of root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.color.set(sky.sky); hemi.groundColor.set(sky.low); hemi.intensity = 1.25; }
      const sun = child as THREE.DirectionalLight;
      if (sun.isDirectionalLight) sun.intensity = sun === world.keyLight ? 1.35 : 0.45;
    }

    /** Everything that rises out of frame lives here and is hidden while the camera is fitted. */
    const tall = new THREE.Group();
    root.add(tall);
    const up = <T extends THREE.Object3D>(node: T) => { tall.add(node); return node; };

    const open = a.state === 'open', closing = a.state === 'last-orders', shut = a.state === 'shuttered', dead = a.state === 'abandoned';
    const lit = open ? 1 : closing ? 0.55 : shut ? 0.06 : 0;
    const raining = a.weather === 'drizzle' || a.weather === 'downpour';
    const warmHex = '#' + new THREE.Color().setHSL(mix(0.13, 0.06, mood.warmth), 0.95, mix(0.72, 0.6, mood.warmth)).getHexString();

    const concrete = s.material('#7c818b', { roughness: 0.9 });
    const concreteDark = s.material('#5d626d', { roughness: 0.92 });
    const steel = s.material('#8f98a1', { metalness: 0.55, roughness: 0.4 });
    const dark = s.material('#2c3038', { roughness: 0.7 });
    const grime = new THREE.MeshStandardMaterial({ color: '#2a2c30', transparent: true, opacity: mix(0.12, 0.5, mood.wear), depthWrite: false, roughness: 1 });
    const glow = (color: string, intensity: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), emissive: color, emissiveIntensity: intensity, roughness: 0.5, ...extra });
    const flat = (mesh: THREE.Mesh) => { mesh.castShadow = false; mesh.receiveShadow = false; return mesh; };
    /** A smear of coloured light lying on the wet ground in front of something glowing. */
    const reflections: THREE.Mesh[] = [];
    const wetness = a.weather === 'just-stopped' ? 0.5 : a.weather === 'downpour' ? 0.4 : a.weather === 'drizzle' ? 0.3 : 0.16;
    const reflect = (x: number, z: number, width: number, length: number, color: string, strength = 1) => {
      const mesh = flat(s.mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: wetness * strength, depthWrite: false, blending: THREE.AdditiveBlending }), [x, 0.012 + reflections.length * 0.0006, z + length / 2]));
      mesh.rotation.x = -Math.PI / 2;
      reflections.push(mesh);
    };
    const flickers: { material: THREE.MeshStandardMaterial; base: number; rate: number }[] = [];

    // ---- The alley floor: kerb, painted markings, drain, puddles. ----
    s.box([W, 0.12, 1.5], [0, 0.06, -D / 2 + 0.75], concreteDark);
    const paint = s.material('#c9c6a8', { roughness: 0.6, transparent: true, opacity: mix(0.75, 0.3, mood.wear) });
    for (let i = 0; i < 5; i++) flat(s.box([1.1, 0.012, 0.16], [-5 + i * 2.5 + random() * 0.2, 0.008, 3.3], paint));
    flat(s.box([W, 0.012, 0.1], [0, 0.008, -0.2], paint));
    const puddleMaterial = new THREE.MeshStandardMaterial({ color: '#39414f', roughness: 0.06, metalness: 0.2 });
    const puddles = Math.round(mix(3, 7, wetness * 2) + random() * 2);
    for (let i = 0; i < puddles; i++) {
      const puddle = flat(s.cylinder(1, 1, 0.012, [mix(-5.4, 5.4, random()), 0.006, mix(-0.6, 3.6, random())], puddleMaterial, 20));
      puddle.receiveShadow = true;
      puddle.scale.set(mix(0.35, 1.1, random()), 1, mix(0.2, 0.6, random()));
      puddle.rotation.y = random() * 3;
    }
    const drainX = -2.4 + random() * 1.2;
    s.cylinder(0.42, 0.42, 0.03, [drainX, 0.015, 1.3], s.material('#3b3f47', { metalness: 0.5, roughness: 0.5 }), 18);
    for (let i = -2; i <= 2; i++) flat(s.box([0.6 - Math.abs(i) * 0.1, 0.01, 0.045], [drainX, 0.034, 1.3 + i * 0.13], dark));

    // ---- The building behind, with lit windows, and paler towers beyond it. ----
    const wallZ = -D / 2 + 0.1;
    const wallColour = s.material('#666c79', { roughness: 0.9 });
    s.box([W, 8.4, 0.4], [0, 4.2, wallZ - 0.2], wallColour);
    up(s.box([W, 11, 0.4], [0, 13.9, wallZ - 0.2], wallColour));
    const windowLit: { at: [number, number, number]; size: number; color: string }[] = [];
    const windowDark: { at: [number, number, number]; size: number }[] = [];
    const upperLit: typeof windowLit = [], upperDark: typeof windowDark = [];
    for (let row = 0; row < 11; row++)
      for (let col = 0; col < 9; col++) {
        const y = 3.9 + row * 1.35, x = -5.4 + col * 1.35;
        const on = random() < mix(0.22, 0.6, mood.density * 0.5 + mood.cheer * 0.5);
        const at: [number, number, number] = [x, y, wallZ + 0.02];
        if (on) (y > 7.9 ? upperLit : windowLit).push({ at, size: 1, color: random() < 0.75 ? warmHex : '#bfe6ff' });
        else (y > 7.9 ? upperDark : windowDark).push({ at, size: 1 });
      }
    const pane = () => new THREE.BoxGeometry(0.74, 0.86, 0.05);
    const paneLit = () => new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const paneDark = () => new THREE.MeshStandardMaterial({ color: '#3d4452', roughness: 0.25 });
    if (windowLit.length) flat(s.scatter(pane(), paneLit(), windowLit));
    if (windowDark.length) flat(s.scatter(pane(), paneDark(), windowDark));
    if (upperLit.length) up(flat(s.scatter(pane(), paneLit(), upperLit)));
    if (upperDark.length) up(flat(s.scatter(pane(), paneDark(), upperDark)));
    for (let i = 0; i < 9; i++) { const ledge = flat(s.box([W, 0.09, 0.06], [0, 3.25 + i * 1.35, wallZ + 0.03], concreteDark)); if (3.25 + i * 1.35 > 8.3) up(ledge); }
    const farColour = new THREE.MeshStandardMaterial({ color: sky.far, roughness: 1 });
    const farDots: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const width = mix(2.2, 4.2, random()), height = mix(15, 27, random()), x = -9 + i * 3.6 + random() * 1.2, z = -7 - random() * 4;
      up(flat(s.box([width, height, 2], [x, height / 2, z], farColour)));
      for (let k = 0; k < 26; k++) farDots.push({ at: [x + (random() - 0.5) * (width - 0.5), mix(7, height - 0.6, random()), z + 1.03], size: mix(0.6, 1.2, random()), color: random() < 0.6 ? warmHex : '#d8ecff' });
    }
    up(flat(s.scatter(new THREE.BoxGeometry(0.22, 0.3, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), farDots)));

    // ---- Wall clutter: condensers, pipes, a roller door. ----
    const units = 1 + Math.round(mood.density * 4);
    for (let i = 0; i < units; i++) {
      const x = mix(1.6, 5.4, random()), y = mix(2.6, 5.4, random());
      s.box([0.85, 0.6, 0.36], [x, y, wallZ + 0.2], s.material('#b9bcb6', { roughness: 0.7 }));
      flat(s.cylinder(0.22, 0.22, 0.02, [x - 0.12, y, wallZ + 0.39], dark, 16)).rotation.x = Math.PI / 2;
      s.box([0.9, 0.05, 0.3], [x, y - 0.33, wallZ + 0.18], steel);
      if (mood.wear > 0.3) flat(s.box([0.5, mix(0.5, 1.6, random()), 0.01], [x, y - 0.9, wallZ + 0.012], grime));
    }
    for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) {
      const x = mix(-5.8, 5.8, random());
      s.rod([x, 0.1, wallZ + 0.1], [x, mix(5, 9.8, random()), wallZ + 0.1], mix(0.035, 0.08, random()), i % 2 ? steel : s.material('#8a5a3c', { roughness: 0.6 }));
    }
    s.box([1.9, 2.5, 0.08], [4.35, 1.37, wallZ + 0.05], s.material('#7f8790', { metalness: 0.4, roughness: 0.5 }));
    for (let i = 0; i < 12; i++) flat(s.box([1.9, 0.03, 0.03], [4.35, 0.3 + i * 0.2, wallZ + 0.1], concreteDark));

    // ---- Overhead structure on two piers. ----
    const deckBase = a.overhead === 'double' ? 5.5 : 6.2;
    const deckZ = -2.35, deckDepth = 3.5;
    for (const x of [-5.45, 5.0]) {
      s.box([1.15, deckBase, 1.3], [x, deckBase / 2, deckZ - 0.3], concrete);
      s.box([1.5, 0.5, deckDepth - 0.2], [x, deckBase - 0.25, deckZ], concrete);
      if (mood.wear > 0.2) flat(s.box([0.8, deckBase * 0.6, 0.01], [x + 0.05, deckBase * 0.6, deckZ + 0.36], grime));
      // Layered flyposters at eye level.
      const posters = 1 + Math.round(mood.density * 3);
      for (let i = 0; i < posters; i++) {
        const tone = ['#e8dcc0', '#e0563f', '#3d8fc9', '#e6c13a', '#d86aa8'][Math.floor(random() * 5)];
        const poster = flat(s.mesh(new THREE.PlaneGeometry(0.42, 0.58), new THREE.MeshStandardMaterial({ map: signTexture(random, 2, 3, '#22242a', tone), roughness: 0.9 }), [x - 0.3 + (i % 2) * 0.5 + random() * 0.1, 1.2 + Math.floor(i / 2) * 0.62 + random() * 0.1, deckZ + 0.36 + i * 0.002]));
        poster.rotation.z = (random() - 0.5) * 0.14;
      }
    }
    const traffic: THREE.Mesh[] = [];
    const deckLength = W + 1.4;
    if (a.overhead === 'concrete' || a.overhead === 'double') {
      const levels = a.overhead === 'double' ? [[deckBase, 0.6], [deckBase + 2.3, 0.7]] : [[deckBase, 1.0]];
      for (const [y, thick] of levels) {
        s.box([deckLength, thick, deckDepth], [0, y + thick / 2, deckZ], concrete);
        for (const z of [deckZ + deckDepth / 2 - 0.1, deckZ - deckDepth / 2 + 0.1]) s.box([deckLength, 0.55, 0.2], [0, y + thick + 0.27, z], concreteDark);
        for (let i = 0; i < 7; i++) flat(s.box([0.03, thick, 0.01], [-6 + i * 2, y + thick / 2, deckZ + deckDepth / 2 + 0.006], dark));
        if (mood.wear > 0.15) for (let i = 0; i < 6; i++) flat(s.box([mix(0.15, 0.5, random()), mix(0.3, thick, random()), 0.01], [mix(-6, 6, random()), y + thick * 0.6, deckZ + deckDepth / 2 + 0.008], grime));
        const cars = 1 + Math.round(mood.energy * 5);
        for (let i = 0; i < cars; i++) {
          const away = random() < 0.5;
          const car = flat(s.box([mix(0.5, 1.4, random()), 0.1, 0.12], [mix(-6, 6, random()), y + thick + 0.25, deckZ + (away ? -0.7 : 0.6) + random() * 0.4], new THREE.MeshBasicMaterial({ color: away ? '#ff3b30' : '#fff4d6' })));
          car.userData.speed = (away ? -1 : 1) * mix(2, 7, random());
          traffic.push(car);
        }
      }
      if (a.overhead === 'double') {
        for (const x of [-3.6, -1.2, 1.2, 3.6]) s.box([0.3, 1.7, 0.3], [x, deckBase + 1.45, deckZ + 1.2], concreteDark);
        for (let i = 0; i < 4; i++)
          s.tube([[-deckLength / 2, deckBase + 0.9 + i * 0.22, deckZ + 1.8], [-2, deckBase + 0.75 + i * 0.22 - random() * 0.2, deckZ + 1.82], [2, deckBase + 0.85 + i * 0.22 - random() * 0.2, deckZ + 1.82], [deckLength / 2, deckBase + 0.9 + i * 0.22, deckZ + 1.8]], 0.05, i % 2 ? dark : s.material('#b0552f'));
      }
    } else {
      const green = s.material('#4f7468', { metalness: 0.3, roughness: 0.6 });
      for (const z of [deckZ + deckDepth / 2 - 0.15, deckZ - deckDepth / 2 + 0.15]) {
        s.box([deckLength, 1.25, 0.14], [0, deckBase + 0.62, z], green);
        s.box([deckLength, 0.1, 0.4], [0, deckBase + 0.05, z], green);
        s.box([deckLength, 0.1, 0.4], [0, deckBase + 1.25, z], green);
      }
      const ribs: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 20; i++) ribs.push({ at: [-deckLength / 2 + 0.35 + i * 0.7, deckBase + 0.62, deckZ + deckDepth / 2 - 0.05], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.07, 1.1, 0.1), green, ribs);
      for (let i = 0; i < 8; i++) s.rod([-6.6 + i * 1.9, deckBase + 0.15, deckZ + 1.5], [-6.6 + i * 1.9 + 1.9, deckBase + 0.15, deckZ - 1.5], 0.05, green);
      s.box([deckLength, 0.14, deckDepth - 0.5], [0, deckBase + 1.32, deckZ], concreteDark);
      // A commuter train crossing, its window strip the brightest line in the scene.
      const trainX = mix(-2.5, 2.5, random());
      const body = s.box([9, 2.1, 2.3], [trainX, deckBase + 2.6, deckZ], s.material('#aeb6bd', { metalness: 0.4, roughness: 0.4 }));
      const strip = flat(s.box([8.6, 0.55, 0.02], [trainX, deckBase + 2.95, deckZ + 1.16], new THREE.MeshBasicMaterial({ color: mix(0, 1, mood.warmth) > 0.5 ? '#ffe7b0' : '#d9f1ff' })));
      const stripe = flat(s.box([9, 0.16, 0.02], [trainX, deckBase + 2.2, deckZ + 1.16], glow(SIGNS[a.signage].colours[0], 0.6)));
      for (let i = 0; i < 9; i++) { const post = flat(s.box([0.09, 0.55, 0.025], [trainX - 4 + i, deckBase + 2.95, deckZ + 1.17], dark)); body.attach(post); }
      body.attach(strip); body.attach(stripe);
      body.userData.speed = mix(0.4, 2.5, mood.energy);
      up(body);
      traffic.push(body);
    }
    // Lamps under the deck, one of them unreliable.
    for (let i = 0; i < 3; i++) {
      const x = -3.6 + i * 3.4;
      s.rod([x, deckBase, deckZ + 1.2], [x, deckBase - 0.45, deckZ + 1.2], 0.02, dark);
      const lamp = glow('#dfeaff', 1.4);
      flat(s.box([0.9, 0.07, 0.16], [x, deckBase - 0.48, deckZ + 1.2], lamp));
      if (i === 1 || mood.wear > 0.6) flickers.push({ material: lamp, base: 1.4, rate: 5 + random() * 9 });
    }

    // ---- The stall. ----
    const SX = -1.8, SWIDE = 4.6, left = SX - SWIDE / 2, right = SX + SWIDE / 2;
    const frontZ = -1.95;
    const accent = { ramen: '#e23b2c', dumpling: '#f0b93a', synth: '#48dfe8', pushcart: '#f6edd6' }[a.stall];
    const counterMaterial = {
      ramen: s.material('#6a3f2a', { roughness: 0.6 }),
      dumpling: s.material('#a9b1b6', { metalness: 0.7, roughness: 0.35 }),
      synth: s.material('#e6e9ea', { roughness: 0.35 }),
      pushcart: s.material('#c79d68', { roughness: 0.8 }),
    }[a.stall];
    const topMaterial = a.stall === 'ramen' ? s.material('#3a2619', { roughness: 0.4 }) : a.stall === 'pushcart' ? s.material('#a87f4f') : steel;
    const cartLift = a.stall === 'pushcart' ? 0.22 : 0;
    s.box([SWIDE, 1.0 - cartLift, 0.55], [SX, 0.5 + cartLift / 2, frontZ - 0.1], counterMaterial);
    s.box([SWIDE + 0.2, 0.07, 0.8], [SX, 1.035, frontZ], topMaterial);
    s.box([0.5, 1.0 - cartLift, 1.7], [left + 0.25, 0.5 + cartLift / 2, frontZ - 1.1], counterMaterial);
    s.box([SWIDE - 0.3, 1.2, 0.5], [SX + 0.1, 0.6, -3.65], counterMaterial);
    s.box([SWIDE, 0.05, 0.05], [SX, 0.32, frontZ + 0.3], steel);
    if (a.stall === 'ramen') s.box([SWIDE, 0.1, 0.02], [SX, 0.85, frontZ + 0.185], s.material(accent));
    if (a.stall === 'synth') {
      flat(s.box([SWIDE, 0.06, 0.02], [SX, 0.92, frontZ + 0.185], glow(accent, mix(0.3, 1.6, lit))));
      flat(s.box([SWIDE, 0.06, 0.02], [SX, 0.12, frontZ + 0.185], glow(accent, mix(0.3, 1.6, lit))));
      reflect(SX, frontZ + 0.3, SWIDE, 1.6, accent, 0.5 + lit * 0.5);
    }
    if (a.stall === 'pushcart')
      for (const x of [left + 0.5, right - 0.5]) {
        const wheel = s.cylinder(0.36, 0.36, 0.08, [x, 0.36, frontZ + 0.24], dark, 20);
        wheel.rotation.x = Math.PI / 2;
        s.cylinder(0.08, 0.08, 0.1, [x, 0.36, frontZ + 0.25], steel, 10).rotation.x = Math.PI / 2;
      }

    // Poles and the tarp, which sags, and hangs from one corner once the place is given up.
    const poleMaterial = a.stall === 'pushcart' || a.stall === 'ramen' ? s.material('#77573b') : steel;
    const awnFront = -0.95, awnBack = wallZ + 0.05, hiBack = 3.15, hiFront = 2.5;
    const droop = dead ? 1.25 : 0;
    for (const [x, z, h] of [[left - 0.25, awnFront + 0.1, hiFront], [right + 0.25, awnFront + 0.1, hiFront - droop * 0.2], [left - 0.25, awnBack + 0.15, hiBack], [right + 0.25, awnBack + 0.15, hiBack]] as const)
      s.rod([x, 0, z], [x, h, z], 0.035, poleMaterial);
    const awnWide = SWIDE + 0.9;
    const cloth = new THREE.PlaneGeometry(1, 1, 14, 8);
    const position = cloth.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const u = position.getX(i) + 0.5, v = 0.5 - position.getY(i);
      const sag = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * mix(0.1, 0.3, mood.wear) + Math.sin(u * 9 + v * 4) * 0.025;
      const fall = droop * Math.pow(clamp01(u * 1.2 - 0.2), 2) * Math.pow(v, 1.5);
      position.setXYZ(i, SX + (u - 0.5) * awnWide, mix(hiBack, hiFront, v) - sag - fall, mix(awnBack, awnFront, v) + (u > 0.5 ? fall * 0.25 : 0));
    }
    cloth.computeVertexNormals();
    let tarpMap: THREE.Texture | null = null;
    if (a.awning === 'striped') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 16;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#b8402f' : '#e2dac4'; ctx.fillRect(i * 16, 0, 16, 16); }
      tarpMap = new THREE.CanvasTexture(canvas);
      tarpMap.colorSpace = THREE.SRGBColorSpace;
    }
    const tarpMaterial = a.awning === 'clear'
      ? new THREE.MeshStandardMaterial({ color: '#e3eef2', transparent: true, opacity: 0.38, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false })
      : s.material(tarpMap ? '#ffffff' : TARP[a.awning], { map: tarpMap, side: THREE.DoubleSide, roughness: 0.55 });
    s.mesh(cloth, tarpMaterial);
    if (a.awning === 'clear') for (const z of [awnFront, awnBack]) s.rod([left - 0.3, z === awnFront ? hiFront : hiBack, z], [right + 0.3, (z === awnFront ? hiFront : hiBack) - (z === awnFront ? droop : 0), z], 0.025, poleMaterial);
    if (a.awning === 'army' || mood.wear > 0.55)
      for (let i = 0; i < 2 + Math.round(mood.wear * 4); i++) {
        const u = mix(0.1, 0.9, random()), v = mix(0.15, 0.9, random());
        const patch = flat(s.mesh(new THREE.PlaneGeometry(mix(0.3, 0.7, random()), mix(0.25, 0.5, random())), s.material(['#8a8f7a', '#3f4a33', '#9aa3ad', '#6f5b45'][i % 4], { side: THREE.DoubleSide }), [SX + (u - 0.5) * awnWide * 0.9, mix(hiBack, hiFront, v) + 0.03, mix(awnBack, awnFront, v)]));
        patch.rotation.x = -Math.PI / 2 + Math.atan2(hiBack - hiFront, awnFront - awnBack);
        patch.rotation.z = random();
        patch.visible = !dead;
      }
    // Ropes to the pier and the wall.
    s.rod([left - 0.25, hiFront, awnFront + 0.1], [-4.9, 3.6, deckZ + 0.35], 0.012, dark);
    if (!dead) s.rod([right + 0.25, hiFront, awnFront + 0.1], [1.75, 3.4, -0.5], 0.012, dark);

    // Split curtain along the front edge: it hides the cook and names the place.
    if (open || closing) {
      const panels = 5, wide = SWIDE / panels;
      const curtainColour = { ramen: '#b3261d', dumpling: '#274e8f', synth: '#11161d', pushcart: '#e9e1cc' }[a.stall];
      const ink = a.stall === 'pushcart' ? '#22252b' : a.stall === 'synth' ? accent : '#f4ecd8';
      for (let i = 0; i < panels; i++) {
        if (closing && i > 2) continue;
        const panel = flat(s.mesh(new THREE.PlaneGeometry(wide * 0.94, 0.52), new THREE.MeshStandardMaterial({ map: signTexture(random, 2, 1, ink, curtainColour, i === 2 ? 'bowl' : null), roughness: 0.9, side: THREE.DoubleSide, emissive: a.stall === 'synth' ? accent : '#000000', emissiveIntensity: 0.12 }), [left + wide * (i + 0.5), hiFront - 0.34 - Math.sin(Math.PI * (i + 0.5) / panels) * 0.08, awnFront + 0.02]));
        panel.castShadow = true;
        panel.rotation.x = (random() - 0.5) * 0.16 * (0.4 + mood.energy);
      }
    }
    // Lanterns.
    const lanterns = 2 + Math.round(mood.cheer * 2);
    for (let i = 0; i < lanterns; i++) {
      const x = lanterns === 1 ? SX : mix(left - 0.1, right + 0.1, i / (lanterns - 1));
      const y = hiFront - 0.5 - (dead ? droop * Math.pow(i / (lanterns - 1), 2) * 0.9 : 0) - random() * 0.08, z = awnFront + 0.2;
      const material = glow(a.stall === 'pushcart' ? warmHex : accent, mix(0.02, mix(0.9, 1.5, mood.cheer), lit));
      s.rod([x, y + 0.2, z], [x, y + 0.42, z], 0.008, dark);
      if (a.stall === 'ramen') flat(s.ball([0.17, 0.2, 0.17], [x, y, z], material, 14));
      else if (a.stall === 'dumpling') flat(s.cylinder(0.13, 0.13, 0.34, [x, y, z], material, 12));
      else if (a.stall === 'synth') flat(s.box([0.07, 0.5, 0.07], [x, y, z], material));
      else flat(s.box([0.24, 0.32, 0.24], [x, y, z], material));
      if (a.stall !== 'synth') { s.cylinder(0.08, 0.08, 0.03, [x, y + 0.2, z], dark, 10); s.cylinder(0.08, 0.08, 0.03, [x, y - 0.2, z], dark, 10); }
      if (lit > 0.3) reflect(x, z + 0.5, 0.5, 1.5, a.stall === 'pushcart' ? warmHex : accent, lit * 0.8);
      if (closing && i === lanterns - 1) flickers.push({ material, base: material.emissiveIntensity, rate: 7 });
    }
    // String lights when the mood allows.
    if (mood.cheer > 0.5 && lit > 0.3) {
      const bulbs: { at: [number, number, number]; size: number; color: string }[] = [];
      const palette = ['#ff5a36', '#ffd23a', '#58d8ff', '#ff4fb0', '#7dff8a'];
      for (let i = 0; i < 16; i++) { const t = i / 15; bulbs.push({ at: [mix(left - 0.3, right + 0.3, t), hiFront + 0.1 - Math.sin(Math.PI * ((t * 3) % 1)) * 0.14, awnFront + 0.05], size: 1, color: palette[i % palette.length] }); }
      flat(s.scatter(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bulbs));
    }
    // The stall's own lit name board on the roof line.
    const boardColour = lit > 0.5 ? accent : '#5a5f69';
    s.box([3.3, 0.78, 0.2], [SX, 3.95, wallZ + 0.35], dark);
    const boardMaterial = new THREE.MeshStandardMaterial({ map: signTexture(random, 5, 1, '#1b1d22', boardColour, 'bowl'), emissive: '#ffffff', emissiveIntensity: mix(0.02, 0.85, lit), roughness: 0.6 });
    boardMaterial.emissiveMap = boardMaterial.map;
    flat(s.mesh(new THREE.PlaneGeometry(3.2, 0.68), boardMaterial, [SX, 3.95, wallZ + 0.46]));
    for (const x of [SX - 1.3, SX + 1.3]) s.rod([x, 3.2, wallZ + 0.3], [x, 3.6, wallZ + 0.3], 0.03, steel);

    // Kitchen: stockpot, back shelf clutter, a work light.
    const steam: THREE.Mesh[] = [];
    const steamMaterial = new THREE.MeshStandardMaterial({ color: '#f4f6f8', transparent: true, opacity: 0.13, depthWrite: false, roughness: 1 });
    const plume = (x: number, y: number, z: number, count: number, size: number, drift = 0.25) => {
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(count - 1, 1);
        const puff = flat(s.ball([1, 1, 1], [x + Math.sin(i * 1.7 + random() * 2) * drift * t, y + t * size * count * 0.75, z + (random() - 0.5) * drift * t], steamMaterial, 10));
        puff.scale.setScalar(size * mix(0.6, 1.7, t) * mix(0.8, 1.2, random()));
        puff.userData = { x: puff.position.x, y: puff.position.y, phase: random() * 6 };
        steam.push(puff);
      }
    };
    const potX = SX + 1.1;
    s.cylinder(0.3, 0.28, 0.5, [potX, 1.45, -3.6], s.material('#aab1b6', { metalness: 0.7, roughness: 0.35 }), 18);
    s.cylinder(0.31, 0.31, 0.03, [potX, 1.7, -3.6], dark, 18);
    if (open || closing) plume(potX, 1.9, -3.5, Math.round(mix(3, 7, mood.energy) * (open ? 1 : 0.5)), 0.24);
    for (let i = 0; i < 4; i++) s.cylinder(0.11, 0.11, mix(0.2, 0.4, random()), [SX - 1.7 + i * 0.5, 1.35, -3.6], s.material(['#d8d2c0', '#7a2f25', '#2f5a6b', '#c8a44a'][i]), 10);
    if (lit > 0.2) flat(s.box([SWIDE - 1, 0.05, 0.1], [SX, hiFront + 0.25, -2.9], glow(warmHex, 1.6 * lit)));

    // On the counter.
    const counterY = 1.07;
    if (!shut && !dead) {
      const bottles = 2 + Math.round(mood.density * 5);
      for (let i = 0; i < bottles; i++) {
        const x = mix(left + 0.5, SX - 0.9, random());
        s.cylinder(0.025, 0.035, mix(0.12, 0.2, random()), [x, counterY + 0.08, frontZ - 0.2 + random() * 0.1], s.material(['#8f2a1e', '#2d2118', '#d9c36a', '#3d6e3a'][i % 4]), 8);
      }
      s.box([0.2, 0.1, 0.12], [right - 0.5, counterY + 0.05, frontZ - 0.15], steel);
      for (let i = 0; i < 4; i++) s.cylinder(0.1, 0.06, 0.05, [right - 0.9, counterY + 0.025 + i * 0.03, frontZ - 0.18], s.material('#f1ede2', { roughness: 0.3 }), 14);
    }
    if (a.stall === 'dumpling' && !dead) {
      const tiers = 3 + Math.floor(random() * 3);
      for (let i = 0; i < tiers; i++) {
        s.cylinder(0.24, 0.24, 0.12, [left + 0.5, counterY + 0.06 + i * 0.125, frontZ - 0.9], s.material('#cfa565', { roughness: 0.8 }), 16);
        flat(s.ring(0.24, 0.012, [left + 0.5, counterY + 0.12 + i * 0.125, frontZ - 0.9], s.material('#8b6638'))).rotation.x = Math.PI / 2;
      }
      if (open) plume(left + 0.5, counterY + tiers * 0.125 + 0.2, frontZ - 0.9, 4, 0.2);
    }
    if (a.stall === 'synth' && !dead)
      for (let i = 0; i < 3; i++) {
        s.cylinder(0.14, 0.14, 0.5, [SX - 1.2 + i * 0.4, 1.45, -3.6], new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.55, emissive: accent, emissiveIntensity: mix(0.1, 0.8, lit), roughness: 0.2 }), 12);
      }

    // Six stools, and what has become of them.
    const chrome = s.material('#c9d0d6', { metalness: 0.85, roughness: 0.25 });
    const pad = s.material(a.stall === 'synth' ? '#22272e' : a.stall === 'dumpling' ? '#2f6b4a' : '#a3271f', { roughness: 0.5 });
    const pulled = a.trace === 'bowl' ? 1 + Math.floor(random() * 4) : -1;
    for (let i = 0; i < 6; i++) {
      const stool = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { stool.add(mesh); return mesh; };
      add(s.cylinder(0.17, 0.2, 0.03, [0, 0.015, 0], chrome, 16));
      add(s.cylinder(0.028, 0.028, 0.66, [0, 0.36, 0], chrome, 10));
      add(s.ring(0.15, 0.012, [0, 0.27, 0], chrome)).rotation.x = Math.PI / 2;
      add(s.cylinder(0.17, 0.15, 0.08, [0, 0.72, 0], pad, 16));
      root.add(stool);
      const x = left + 0.42 + i * ((SWIDE - 0.84) / 5);
      stool.position.set(x + (random() - 0.5) * 0.06, 0, frontZ + 0.62 + (random() - 0.5) * 0.08);
      if (i === pulled) { stool.position.z += 0.32; stool.position.x += 0.1; }
      if (closing && i % 2 === 0) { stool.rotation.x = Math.PI; stool.position.set(x, counterY + 0.76, frontZ + 0.05); }
      if (shut) { stool.position.set(right + 0.6 + (i % 2) * 0.42, Math.floor(i / 2) * 0.0, -3.2 + Math.floor(i / 2) * 0.45); }
      if (dead && (i === 1 || i === 4 || random() < mood.wear * 0.5)) { stool.rotation.z = Math.PI / 2 * (random() < 0.5 ? 1 : -1); stool.rotation.y = random() * 6; stool.position.y = 0.19; stool.position.z += random() * 0.9; }
    }
    if (shut) {
      const shutter = s.material('#8d949b', { metalness: 0.45, roughness: 0.5 });
      s.box([SWIDE, 1.35, 0.05], [SX, counterY + 0.675, frontZ + 0.3], shutter);
      const ribs: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 13; i++) ribs.push({ at: [SX, counterY + 0.08 + i * 0.1, frontZ + 0.33], size: 1 });
      flat(s.scatter(new THREE.BoxGeometry(SWIDE, 0.03, 0.03), concreteDark, ribs));
      s.box([0.12, 0.16, 0.06], [SX, counterY + 0.12, frontZ + 0.37], s.material('#c9a23a', { metalness: 0.6 }));
      const tag = flat(s.mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: signTexture(random, 4, 1, ['#e0448f', '#48dfe8', '#f3e04a'][Math.floor(random() * 3)], '#8d949b'), transparent: true, opacity: mix(0.3, 0.95, mood.wear) }), [SX + (random() - 0.5) * 2, counterY + 0.75, frontZ + 0.352]));
      tag.rotation.z = (random() - 0.5) * 0.2;
    }
    if (dead) {
      const tape = new THREE.MeshStandardMaterial({ color: '#f1c40f', emissive: '#f1c40f', emissiveIntensity: 0.25, roughness: 0.6, side: THREE.DoubleSide });
      s.rod([left - 0.25, 1.9, awnFront + 0.12], [right + 0.25, 0.5, awnFront + 0.12], 0.035, tape).scale.z = 0.15;
      s.rod([left - 0.25, 0.5, awnFront + 0.14], [right + 0.25, 1.7, awnFront + 0.14], 0.035, tape).scale.z = 0.15;
      for (let i = 0; i < 5; i++) s.cylinder(0.1, 0.06, 0.05, [mix(left, right, random()), 0.03, frontZ + 0.6 + random() * 1.3], s.material('#e9e4d6'), 12).rotation.z = random() < 0.5 ? 0 : 2.6;
    }

    // ---- The trace of customers. ----
    if (a.trace === 'bowl' && !shut) {
      const x = left + 0.42 + Math.max(pulled, 0) * ((SWIDE - 0.84) / 5), y = dead ? 0 : counterY, z = dead ? frontZ + 1.3 : frontZ + 0.12;
      s.cylinder(0.14, 0.07, 0.1, [x, y + 0.05, z], s.material('#f3efe4', { roughness: 0.25 }), 18);
      flat(s.cylinder(0.125, 0.125, 0.01, [x, y + 0.095, z], s.material('#b8742e', { roughness: 0.2 }), 18));
      for (const dz of [-0.02, 0.02]) s.rod([x - 0.2, y + 0.108, z + dz], [x + 0.2, y + 0.112, z + dz * 2.5], 0.006, s.material('#2a1c14'));
      if (!dead) plume(x, y + 0.2, z, 3, 0.09, 0.08);
    }
    if (a.trace === 'umbrellas') {
      const clear = new THREE.MeshStandardMaterial({ color: '#eaf4f8', transparent: true, opacity: 0.42, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
      const ux = right + 0.9, uz = -0.2;
      const canopy = s.mesh(new THREE.ConeGeometry(0.62, 0.24, 8, 1, true), clear, [ux, 0.5, uz]);
      canopy.rotation.z = 1.25; canopy.rotation.y = 0.5;
      s.rod([ux - 0.1, 0.45, uz], [ux + 0.6, 0.2, uz - 0.25], 0.012, steel);
      for (let i = 0; i < 3; i++) s.ring(0.6 - i * 0.2, 0.006, [ux - 0.05 + i * 0.07, 0.5, uz], steel).rotation.set(0, Math.PI / 2 - 0.5, 0);
      for (let i = 0; i < 2 + Math.floor(random() * 2); i++) {
        const x = mix(left + 0.3, right - 0.3, random());
        const furled = s.rod([x, 0.02, frontZ + 0.5], [x + 0.08, 0.95, frontZ + 0.2], 0.012, new THREE.MeshStandardMaterial({ color: '#dfeef5', roughness: 0.2 }), 0.045);
        furled.castShadow = true;
      }
    }
    if (a.trace === 'scooter') {
      const sx = right + 1.25, sz = -1.5;
      const bodyColour = s.material(['#d83a2e', '#2f8fd0', '#e9e9e4', '#f0b21e'][Math.floor(random() * 4)], { roughness: 0.4 });
      for (const dx of [-0.55, 0.55]) { s.cylinder(0.22, 0.22, 0.1, [sx + dx, 0.22, sz], dark, 16).rotation.x = Math.PI / 2; }
      s.box([0.75, 0.08, 0.3], [sx, 0.26, sz], bodyColour);
      s.box([0.55, 0.3, 0.3], [sx - 0.35, 0.5, sz], bodyColour);
      s.box([0.5, 0.08, 0.26], [sx - 0.3, 0.7, sz], dark);
      s.rod([sx + 0.5, 0.25, sz], [sx + 0.36, 1.0, sz], 0.035, bodyColour);
      s.box([0.1, 0.3, 0.34], [sx + 0.42, 0.75, sz], bodyColour);
      s.rod([sx + 0.36, 1.0, sz - 0.3], [sx + 0.36, 1.0, sz + 0.3], 0.018, dark);
      s.box([0.46, 0.44, 0.44], [sx - 0.52, 0.98, sz], s.material('#e9e4d2', { roughness: 0.5 }));
      flat(s.mesh(new THREE.PlaneGeometry(0.38, 0.34), glow(accent, 1.1, { map: signTexture(random, 2, 2, '#16181c', '#ffffff', 'bowl') }), [sx - 0.52, 0.98, sz + 0.225]));
      flat(s.box([0.06, 0.06, 0.02], [sx - 0.63, 0.5, sz + 0.16], glow('#ff2a1e', 1.6)));
      reflect(sx - 0.5, sz + 0.3, 0.5, 1.2, accent, 0.7);
    }
    if (a.trace === 'crates') {
      const cx = left - 1.0;
      const tones = ['#e0b02a', '#c63a2c', '#2f6fc4', '#3f8f5a'];
      for (let column = 0; column < 2; column++) {
        const stack = 2 + Math.floor(random() * 3);
        for (let i = 0; i < stack; i++) {
          const crate = s.box([0.46, 0.3, 0.36], [cx + column * 0.5, 0.15 + i * 0.3, -1.2 + (random() - 0.5) * 0.06], s.material(tones[Math.floor(random() * 4)], { roughness: 0.6 }));
          crate.rotation.y = (random() - 0.5) * 0.2;
        }
      }
      for (let i = 0; i < 3; i++) s.ball([0.3 + random() * 0.1, 0.24, 0.28], [cx + 0.2 + i * 0.35 - 0.3, 0.2, -0.65 + random() * 0.2], s.material('#23262b', { roughness: 0.35 }), 10);
    }

    // ---- Street furniture: a vending machine, bins, boxes. ----
    const vendX = 2.75, vendZ = wallZ + 0.5;
    const vendColour = ['#d8342a', '#2a6fd0', '#e8e8e2'][Math.floor(random() * 3)];
    s.box([0.95, 1.85, 0.7], [vendX, 0.925 + 0.12, vendZ], s.material(vendColour, { roughness: 0.4 }));
    flat(s.box([0.8, 1.05, 0.02], [vendX, 1.42, vendZ + 0.36], glow('#eaf6ff', mood.wear > 0.85 ? 0.1 : 1.1)));
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) flat(s.box([0.07, 0.2, 0.02], [vendX - 0.3 + i * 0.12, 1.1 + row * 0.33, vendZ + 0.375], s.material(['#d8342a', '#2f8f5a', '#f0b21e', '#3a3f96', '#e9e4d2', '#d86aa8'][(i + row * 2) % 6])));
    s.box([0.7, 0.2, 0.02], [vendX, 0.45, vendZ + 0.36], dark);
    reflect(vendX, vendZ + 0.5, 0.8, 2.2, '#cfe6ff', mood.wear > 0.85 ? 0.1 : 0.7);
    const litter = Math.round(mood.density * 5 + mood.wear * 3);
    for (let i = 0; i < litter; i++) {
      const x = mix(1.6, 5.6, random()), z = mix(-3.3, -1.2, random());
      if (Math.abs(x - 3.1) < 1.6 && z > -1.9) continue;
      if (i % 3 === 0) s.cylinder(0.26, 0.22, 0.75, [x, 0.38, Math.min(z, -2.6)], s.material('#3f6b5a', { roughness: 0.6 }), 14);
      else s.box([mix(0.3, 0.6, random()), mix(0.2, 0.45, random()), mix(0.3, 0.5, random())], [x, 0.15, Math.min(z, -2.4)], s.material('#b08a5a', { roughness: 0.9 })).rotation.y = random();
    }

    // ---- The sign pylon: the stack that rises out of frame. ----
    const poleX = 1.75, poleZ = -0.5;
    s.cylinder(0.11, 0.14, 8.2, [poleX, 4.1, poleZ], concreteDark, 12);
    up(s.cylinder(0.1, 0.11, 10.5, [poleX, 13.4, poleZ], concreteDark, 12));
    s.box([0.34, 0.5, 0.3], [poleX, 1.5, poleZ + 0.14], s.material('#8a9096', { metalness: 0.4 }));
    const set = SIGNS[a.signage];
    let signY = 2.9, index = Math.floor(random() * set.colours.length), lastLit: THREE.MeshStandardMaterial | null = null;
    const failChance = clamp01(mix(0.06, 0.5, mood.wear) + (dead ? 0.2 : 0));
    while (signY < 17) {
      const high = mix(0.95, 2.1, random()), wide = mix(0.8, 1.25, random()), side = index % 2 ? 1 : -1;
      if (random() > mix(0.55, 1, mood.density) && signY > 3) { signY += high * 0.6; continue; }
      const colour = set.colours[index % set.colours.length], emblem = set.emblems[index % set.emblems.length];
      const off = random() < failChance;
      const cols = wide > 1.05 ? 2 : 1, rows = Math.max(2, Math.round((high / wide) * cols));
      const invert = random() < 0.5;
      const material = new THREE.MeshStandardMaterial({ map: signTexture(random, cols, rows, invert ? '#16181d' : colour, invert ? colour : '#16181d', emblem), emissive: '#ffffff', emissiveIntensity: off ? 0.03 : mix(0.75, 1.15, mood.cheer), roughness: 0.6 });
      material.emissiveMap = material.map;
      if (off) material.color.set('#6a6e76'); else lastLit = material;
      const x = poleX + side * (wide / 2 + 0.16), y = signY + high / 2;
      const box = s.box([wide, high, 0.2], [x, y, poleZ], dark);
      const face = flat(s.mesh(new THREE.PlaneGeometry(wide - 0.08, high - 0.08), material, [x, y, poleZ + 0.105]));
      const arm = s.rod([poleX, y, poleZ], [x, y, poleZ], 0.03, steel);
      if (y + high / 2 > 8.2) { up(box); up(face); up(arm); }
      else if (!off) reflect(x, poleZ + 0.4 + (y - 3) * 0.25, wide * 0.9, 1.3 + high * 0.6, colour, 0.75);
      signY += high + mix(0.06, 0.3, random());
      index++;
    }
    if (lastLit) flickers.push({ material: lastLit, base: lastLit.emissiveIntensity, rate: 11 });
    // Blade signs on the wall and pier, by how crowded the place is.
    const blades = Math.round(mood.density * 4);
    for (let i = 0; i < blades; i++) {
      const colour = set.colours[(i + 1) % set.colours.length];
      const x = [-5.45 + 0.9, 4.35, 0.9, 5.0 - 0.9][i % 4], y = mix(3.4, 5.4, random()), z = i % 2 ? wallZ + 0.6 : deckZ + 0.5;
      const material = new THREE.MeshStandardMaterial({ map: signTexture(random, 1, 3, '#16181d', colour, set.emblems[(i + 1) % set.emblems.length]), emissive: '#ffffff', emissiveIntensity: random() < failChance ? 0.04 : 0.9, roughness: 0.6 });
      material.emissiveMap = material.map;
      s.box([0.5, 1.4, 0.14], [x, y, z], dark);
      flat(s.mesh(new THREE.PlaneGeometry(0.44, 1.34), material, [x, y, z + 0.075]));
    }

    // ---- Cables: the tangle between pole, piers and wall. ----
    const cableMaterial = s.material('#1f2227', { roughness: 0.8 });
    const cables = 3 + Math.round(mood.density * 6);
    const anchors: [number, number, number][] = [[-5.45, 5.6, deckZ + 0.5], [5.0, 5.4, deckZ + 0.5], [-6.3, 7.2, 0.6], [6.3, 7.6, 0.2], [-1.5, 8.0, wallZ + 0.1], [4.4, 7.2, wallZ + 0.1]];
    for (let i = 0; i < cables; i++) {
      const [ax, ay, az] = anchors[i % anchors.length];
      const fromY = mix(5.6, 8.0, random()), sag = mix(0.4, 1.5, random());
      s.tube([[poleX, fromY, poleZ], [mix(poleX, ax, 0.35), mix(fromY, ay, 0.35) - sag, mix(poleZ, az, 0.35)], [mix(poleX, ax, 0.7), mix(fromY, ay, 0.7) - sag * 0.8, mix(poleZ, az, 0.7)], [ax, ay + (random() - 0.5) * 0.5, az]], mix(0.012, 0.03, random()), cableMaterial).castShadow = false;
    }
    s.box([0.5, 0.35, 0.3], [poleX, 7.6, poleZ], s.material('#7b828a', { metalness: 0.4 }));

    // ---- Vent steam at street level, and rain. ----
    const fog = a.weather === 'steam';
    plume(drainX, 0.25, 1.3, Math.round(mix(3, 6, mood.energy) + (fog ? 3 : 0)), fog ? 0.4 : 0.28, 0.5);
    plume(4.2, 0.4, -2.6, fog ? 6 : 3, fog ? 0.4 : 0.28, 0.5);
    if (fog) for (let i = 0; i < 9; i++) plume(mix(-5.5, 5.5, random()), 0.3, mix(-1.5, 3.2, random()), 2, mix(0.35, 0.6, random()), 0.6);

    let rain: THREE.InstancedMesh | null = null;
    const drops: { x: number; y: number; z: number; speed: number }[] = [];
    const slant = (random() - 0.5) * 0.3;
    const matrix = new THREE.Matrix4(), tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, slant)), one = new THREE.Vector3(1, 1, 1), spot = new THREE.Vector3();
    const writeRain = () => {
      if (!rain) return;
      drops.forEach((drop, i) => { matrix.compose(spot.set(drop.x + drop.y * -slant, drop.y, drop.z), tilt, one); rain!.setMatrixAt(i, matrix); });
      rain.instanceMatrix.needsUpdate = true;
    };
    if (raining) {
      const count = Math.round((a.weather === 'downpour' ? 620 : 240) * mix(0.75, 1.25, mood.energy));
      for (let i = 0; i < count; i++) drops.push({ x: mix(-8, 8, random()), y: random() * 13, z: mix(-3.8, 4.2, random()), speed: mix(9, 15, random()) });
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(a.weather === 'downpour' ? 0.016 : 0.011, a.weather === 'downpour' ? 0.75 : 0.42, 0.011), new THREE.MeshBasicMaterial({ color: '#eef4ff', transparent: true, opacity: a.weather === 'downpour' ? 0.42 : 0.34, depthWrite: false }), count);
      rain.frustumCulled = false;
      root.add(rain);
      writeRain();
      // Splash rings where it lands, and runoff from the tarp edge in a downpour.
      const splash = new THREE.MeshBasicMaterial({ color: '#dfe8f5', transparent: true, opacity: 0.4, depthWrite: false });
      for (let i = 0; i < Math.round(count / 30); i++) flat(s.ring(mix(0.04, 0.12, random()), 0.006, [mix(-6, 6, random()), 0.02, mix(-0.5, 4, random())], splash)).rotation.x = Math.PI / 2;
      if (a.weather === 'downpour' && !dead)
        for (let i = 0; i < 9; i++) flat(s.box([0.02, hiFront - 0.1, 0.02], [mix(left - 0.4, right + 0.4, random()), (hiFront - 0.1) / 2, awnFront + 0.03], splash));
    }

    // ---- Light that the stall and the signs throw. ----
    const stallLight = new THREE.PointLight(warmHex, 26 * lit, 9, 1.6);
    stallLight.position.set(SX, 2.0, frontZ + 0.4);
    const signLight = new THREE.PointLight(set.colours[0], 34, 12, 1.6);
    signLight.position.set(poleX + 0.4, 4.2, poleZ + 1.6);
    root.add(stallLight, signLight);
    if (lit > 0.3) reflect(SX, frontZ + 0.5, SWIDE * 0.9, 2.4, warmHex, 0.55 * lit);

    const basePlace = world.place;
    const camera = world.camera as THREE.OrthographicCamera;
    world.place = (items: readonly Placeable[]) => {
      tall.visible = false;
      basePlace(items);
      tall.visible = true;
      // Pull in so the tower, the signs and the far city run off the top of the frame.
      for (const side of ['left', 'right', 'top', 'bottom'] as const) camera[side] *= 0.84;
      camera.updateProjectionMatrix();
    };
    const baseDispose = world.dispose;
    world.dispose = () => { rain?.geometry.dispose(); (rain?.material as THREE.Material | undefined)?.dispose(); baseDispose(); };
    const pace = mix(0.25, 1.5, mood.energy);
    world.update = (dt: number, time: number) => {
      if (rain) {
        for (const drop of drops) { drop.y -= drop.speed * dt * mix(0.6, 1.2, mood.energy); if (drop.y < 0) drop.y += 13; }
        writeRain();
      }
      for (const puff of steam) {
        const { x, y, phase } = puff.userData as { x: number; y: number; phase: number };
        puff.position.x = x + Math.sin(time * 0.6 * pace + phase) * 0.08;
        puff.position.y = y + Math.sin(time * 0.9 * pace + phase * 2) * 0.06;
      }
      for (const { material, base, rate } of flickers) {
        const wave = Math.sin(time * rate) * Math.sin(time * rate * 0.37 + 1.3);
        material.emissiveIntensity = base * (wave > mix(0.75, 0.2, mood.energy) ? 0.15 : 1);
      }
      for (const car of traffic) {
        car.position.x += (car.userData.speed as number) * dt * pace;
        if (car.position.x > 7.2) car.position.x = -7.2;
        if (car.position.x < -7.2) car.position.x = 7.2;
      }
    };
    return world;
  },
});
