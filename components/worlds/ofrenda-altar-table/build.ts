import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const WALLS = {
  rosa: 'Hot Mexican pink over a deep red skirting band.',
  cobalt: 'Deep cobalt blue, a courtyard house colour.',
  ochre: 'Sun-baked ochre yellow over terracotta.',
  turquoise: 'Chalky turquoise, a kitchen wall.',
  adobe: 'Whitewashed adobe, plain and poor, with an earth-brown skirting.',
  violet: 'Dusky violet, the colour of mourning.',
} as const;
const WALL_COLOURS: Record<keyof typeof WALLS, [string, string]> = {
  rosa: ['#d8477e', '#8e2440'], cobalt: ['#3458b0', '#1f2f6a'], ochre: ['#d9a23e', '#a8532f'], turquoise: ['#3fa8a0', '#1f6a6a'], adobe: ['#e2d8c2', '#8a6444'], violet: ['#7a5a9a', '#3f2c5a'],
};
const CLOTHS = {
  lace: 'White cotton with an eyelet lace hem, starched for the occasion.',
  serape: 'Striped serape blankets in red, green, yellow and blue with a fringe.',
  satin: 'Purple satin banded with orange, the colours of the feast.',
  floral: 'Black cloth embroidered with big bright flowers.',
  oilcloth: 'Red gingham kitchen oilcloth, the everyday table pressed into service.',
} as const;

function clothTexture(kind: keyof typeof CLOTHS, random: () => number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const g = canvas.getContext('2d')!;
  let base = '#f4f0e6';
  if (kind === 'lace') {
    g.fillStyle = base; g.fillRect(0, 0, 512, 128);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 16; i++) {
      g.beginPath(); g.moveTo(i * 32, 128); g.lineTo(i * 32 + 16, 108); g.lineTo(i * 32 + 32, 128); g.fill();
      for (const [x, y, r] of [[16, 96, 5], [6, 84, 3.5], [26, 84, 3.5], [16, 74, 3]]) { g.beginPath(); g.arc(i * 32 + x, y, r, 0, 7); g.fill(); }
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#d9d2c2'; g.fillRect(0, 58, 512, 3);
  } else if (kind === 'serape') {
    const stripes = ['#c8262e', '#f2c230', '#1f8a4a', '#1f46b0', '#f4f0e6', '#1a1a1e', '#e5257e', '#f2702a'];
    base = '#c8262e';
    let x = 0, i = 0;
    while (x < 512) { const w = [22, 8, 14, 6, 30, 6, 10][i % 7]; g.fillStyle = stripes[i % stripes.length]; g.fillRect(x, 0, w, 116); x += w; i++; }
    g.clearRect(0, 116, 512, 12);
    for (let k = 0; k < 128; k++) { g.fillStyle = stripes[k % stripes.length]; g.fillRect(k * 4, 112, 2, 16); }
  } else if (kind === 'satin') {
    base = '#6a2f96';
    g.fillStyle = base; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#f2831c'; g.fillRect(0, 78, 512, 30);
    g.fillStyle = '#f6c21c'; g.beginPath(); for (let i = 0; i <= 32; i++) g.lineTo(i * 16, i % 2 ? 72 : 60); g.lineTo(512, 78); g.lineTo(0, 78); g.fill();
    g.clearRect(0, 108, 512, 20); g.fillStyle = '#f2831c'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(i * 32 + 16, 108, 16, 0, Math.PI); g.fill(); }
  } else if (kind === 'floral') {
    base = '#1c181c';
    g.fillStyle = base; g.fillRect(0, 0, 512, 128);
    const hues = ['#e5257e', '#d8262e', '#f6c21c', '#f2702a', '#b04ad8'];
    for (let i = 0; i < 8; i++) {
      const x = 32 + i * 64, y = 58 + (i % 2) * 14;
      g.fillStyle = '#2f8a3f'; g.beginPath(); g.ellipse(x - 26, y + 16, 14, 6, 0.6, 0, 7); g.ellipse(x + 26, y + 16, 14, 6, -0.6, 0, 7); g.fill();
      g.fillStyle = hues[i % hues.length]; for (let p = 0; p < 6; p++) { g.beginPath(); g.ellipse(x + Math.cos(p * 1.047) * 13, y + Math.sin(p * 1.047) * 13, 11, 9, p * 1.047, 0, 7); g.fill(); }
      g.fillStyle = '#f6c21c'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
    }
    g.fillStyle = '#e5257e'; g.fillRect(0, 118, 512, 10);
  } else {
    base = '#f4f0e6';
    g.fillStyle = base; g.fillRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(200,38,46,0.55)';
    for (let i = 0; i < 32; i += 2) g.fillRect(i * 16, 0, 16, 128);
    for (let j = 0; j < 8; j += 2) g.fillRect(0, j * 16, 512, 16);
  }
  void random;
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping;
  return { map, base };
}

function flagTexture(variant: number) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 104;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 104);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 16, 104); g.lineTo(i * 16 + 8, 92); g.lineTo(i * 16 + 16, 104); g.fill(); }
  for (let i = 0; i < 7; i++) { for (const y of [10, 84]) { g.beginPath(); g.moveTo(16 + i * 16, y - 5); g.lineTo(21 + i * 16, y); g.lineTo(16 + i * 16, y + 5); g.lineTo(11 + i * 16, y); g.fill(); } }
  for (let j = 0; j < 4; j++) for (const x of [9, 119]) { g.beginPath(); g.arc(x, 26 + j * 15, 4, 0, 7); g.fill(); }
  const hole = (draw: () => void) => { g.beginPath(); draw(); g.fill(); };
  if (variant === 0) {
    // Skull: cut the surround, keep the skull, then cut its features.
    hole(() => { g.rect(22, 20, 84, 56); g.ellipse(64, 44, 24, 22, 0, 0, Math.PI * 2, true); });
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#ffffff'; g.fillRect(52, 58, 24, 16); g.fillRect(22, 46, 84, 3); g.fillRect(62, 20, 4, 56);
    g.globalCompositeOperation = 'destination-out';
    hole(() => { g.arc(55, 42, 6.5, 0, 7); g.arc(73, 42, 6.5, 0, 7); });
    hole(() => { g.moveTo(64, 50); g.lineTo(68, 57); g.lineTo(60, 57); });
    for (let i = 0; i < 4; i++) g.fillRect(55 + i * 5, 64, 2.5, 8);
  } else if (variant === 1) {
    for (let p = 0; p < 10; p++) hole(() => g.ellipse(64 + Math.cos(p * 0.628) * 22, 47 + Math.sin(p * 0.628) * 20, 9, 4.5, p * 0.628, 0, 7));
    hole(() => g.arc(64, 47, 8, 0, 7));
    for (const [x, y] of [[28, 26], [100, 26], [28, 68], [100, 68]]) hole(() => g.arc(x, y, 6, 0, 7));
  } else {
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) hole(() => { const x = 28 + i * 18, y = 28 + j * 19; g.moveTo(x, y - 8); g.lineTo(x + 7, y); g.lineTo(x, y + 8); g.lineTo(x - 7, y); });
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineWorld({
  questions: {
    wall: choice('What colour is the wall behind the altar painted?', WALLS),
    cloth: choice('What cloth covers the steps of the altar?', CLOTHS),
    banners: choice('What cut-paper banners hang overhead?', {
      rainbow: 'Strings of papel picado in every colour.',
      feast: 'Only purple, orange and hot pink, the colours of the dead.',
      white: 'All white, for a child who died.',
      tattered: 'A few faded flags left on sagging strings, the rest torn away.',
      none: 'No banners at all.',
    }),
    crown: choice('What rises behind the top step?', {
      arch: 'A thick arch of marigolds, the doorway the dead come through.',
      reeds: 'A bare cane arch hung with oranges and a few blooms.',
      cross: 'A plain wooden cross on the wall.',
      picture: 'A gilt-framed holy picture in a blaze of painted rays.',
      nothing: 'Only the painted wall.',
    }),
    moment: choice('What moment of the feast is it?', {
      setting: 'Late afternoon, the altar just finished, candles not yet lit.',
      vigil: 'Dusk into night: every candle burning, the room lit by the altar alone.',
      midnight: 'Deep in the night, half the candles burned out, the wait going on.',
      after: 'The grey morning after: candles dead, flowers drooping, the visit over.',
    }),
    path: choice('What is laid on the floor in front?', {
      path: 'A straight road of marigold petals leading to the altar, edged with blooms.',
      cross: 'A cross of petals laid on the tiles.',
      scattered: 'Petals strewn everywhere without pattern.',
      bare: 'Bare swept tiles.',
    }),
    offerings: choice('What fills the gaps between the main offerings?', {
      fruit: 'Oranges, bananas and sugar cane.',
      skulls: 'A row of little sugar skulls.',
      toys: 'Toys and sweets: a striped ball, a spinning top, coloured blocks.',
      plain: 'Only water and salt, the bare necessities.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const lit = a.moment === 'vigil' || a.moment === 'midnight';
    const background = { setting: '#d9cdb4', vigil: '#77708f', midnight: '#625c7c', after: '#c4cace' }[a.moment];
    const T1 = 1.3, T2 = 2.4, T3 = 3.5;
    const { art: s, world } = diorama(context, {
      background, floor: '#9a5a40', width: 12.6, depth: 9, maxHeight: 2.4, radius: 1.22, pitch: 20, yaw: 9,
      slots: [[0, -3.2, T3, 1], [-2.75, -1.4, T2, 0.8], [2.75, -1.4, T2, 0.8], [-3.6, 0.55, T1, 0.82], [3.6, 0.55, T1, 0.82], [0, 0.6, T1, 0.78]],
    });
    const root = s.root;

    // Light: the altar's own candles at dusk, or flat day before and after.
    const hemi = root.children.find((c) => (c as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;
    const fill = root.children.find((c) => (c as THREE.DirectionalLight).isDirectionalLight && c !== world.keyLight) as THREE.DirectionalLight;
    const key = world.keyLight!;
    if (a.moment === 'vigil') { hemi.intensity = 0.95; hemi.color.set('#b8b4e0'); hemi.groundColor.set('#6a4a3a'); key.intensity = 1.0; key.color.set('#ffb070'); fill.intensity = 0.25; }
    else if (a.moment === 'midnight') { hemi.intensity = 0.8; hemi.color.set('#a4a4dc'); hemi.groundColor.set('#4a3a3a'); key.intensity = 0.7; key.color.set('#c8a0c0'); fill.intensity = 0.2; }
    else if (a.moment === 'after') { hemi.intensity = 1.35; hemi.color.set('#e4ecf4'); key.intensity = 1.7; key.color.set('#dfe8f4'); }
    else { hemi.intensity = 1.2; key.intensity = 2.3; key.color.set('#ffd9a0'); }
    if (lit) {
      const power = a.moment === 'vigil' ? 1 : 0.6;
      for (const [x, y, z, strength] of [[-2.6, 3.6, -0.4, 16], [2.6, 3.6, -0.4, 16], [0, 5.4, -1.8, 12]]) {
        const lamp = new THREE.PointLight('#ffac58', strength * power * mix(0.8, 1.2, mood.warmth), 0, 2);
        lamp.position.set(x, y, z); root.add(lamp);
      }
    }

    // Room: painted wall with a skirting band, a side wall, tiled floor.
    const [wallHue, skirtHue] = WALL_COLOURS[a.wall];
    const wallMat = s.material(wallHue, { roughness: 0.95 }), skirtMat = s.material(skirtHue, { roughness: 0.95 });
    const WH = 8.8;
    s.box([13.2, WH, 0.3], [0, WH / 2, -4.55], wallMat);
    s.box([13.2, 1.7, 0.04], [0, 0.85, -4.38], skirtMat);
    s.box([13.2, 0.09, 0.05], [0, 1.78, -4.38], s.material('#f1e6c8'));
    s.box([0.3, WH, 9], [-6.45, WH / 2, 0], wallMat);
    s.box([0.04, 1.7, 9], [-6.28, 0.85, 0], skirtMat);
    const stains = Math.round(mood.wear * 6);
    for (let i = 0; i < stains; i++) {
      const patch = s.mesh(new THREE.CircleGeometry(mix(0.3, 0.75, random()), 11), new THREE.MeshStandardMaterial({ color: new THREE.Color(wallHue).lerp(new THREE.Color(i % 2 ? '#efe6d2' : '#3a2c2a'), 0.16), roughness: 1 }), [mix(-6, 6, random()), mix(1.9, 8.4, random()), -4.385]);
      patch.scale.y = mix(0.5, 1.2, random()); patch.castShadow = false;
    }
    const tiles = document.createElement('canvas'); tiles.width = tiles.height = 128;
    const tg = tiles.getContext('2d')!;
    tg.fillStyle = '#6a3c2a'; tg.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { tg.fillStyle = (i + j) % 2 ? '#b06a48' : '#a45e40'; tg.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
    const tileMap = new THREE.CanvasTexture(tiles); tileMap.colorSpace = THREE.SRGBColorSpace; tileMap.wrapS = tileMap.wrapT = THREE.RepeatWrapping; tileMap.repeat.set(6.3, 4.5);
    const floor = s.mesh(new THREE.PlaneGeometry(12.6, 9), new THREE.MeshStandardMaterial({ map: tileMap, roughness: 0.85 }), [0, 0.006, 0]);
    floor.rotation.x = -Math.PI / 2; floor.castShadow = false;

    // The altar: a table with two risers on it, all draped.
    const { map: clothMap, base: clothBase } = clothTexture(a.cloth, random);
    const clothMat = s.material(clothBase, { roughness: 0.85 });
    const wood = s.material('#6a4428', { roughness: 0.8 });
    const tiers: { w: number; top: number; front: number; drop: number }[] = [
      { w: 10.8, top: T1, front: 1.6, drop: 1.0 }, { w: 8.4, top: T2, front: -0.5, drop: 0.62 }, { w: 5.8, top: T3, front: -2.3, drop: 0.62 },
    ];
    for (const [x, z] of [[-5.1, 1.3], [5.1, 1.3]]) s.box([0.22, T1, 0.22], [x, T1 / 2, z], wood);
    tiers.forEach((t, i) => {
      const back = -4.38, depth = t.front - back, bottom = i === 0 ? T1 - 0.16 : tiers[i - 1].top;
      s.box([t.w, t.top - bottom, depth], [0, (t.top + bottom) / 2, (t.front + back) / 2], i === 0 ? wood : clothMat);
      s.box([t.w + 0.14, 0.05, depth + 0.07], [0, t.top + 0.0, (t.front + back) / 2 + 0.035], clothMat);
      const map = clothMap.clone(); map.needsUpdate = true; map.repeat.set(t.w / 5.2, 1);
      const drape = s.mesh(new THREE.PlaneGeometry(t.w + 0.14, t.drop), new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide }), [0, t.top - t.drop / 2 + 0.02, t.front + 0.075]);
      drape.castShadow = false;
      for (const side of [-1, 1]) {
        const sideMap = clothMap.clone(); sideMap.needsUpdate = true; sideMap.repeat.set(depth / 5.2, 1);
        const flap = s.mesh(new THREE.PlaneGeometry(depth, t.drop), new THREE.MeshStandardMaterial({ map: sideMap, alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide }), [side * (t.w / 2 + 0.075), t.top - t.drop / 2 + 0.02, (t.front + back) / 2]);
        flap.rotation.y = side * Math.PI / 2; flap.castShadow = false;
      }
    });

    // Marigolds, instanced: collected here, built once.
    const droop = a.moment === 'after' ? 0.55 : mood.wear * 0.3;
    const blooms: { p: V3; r: number }[] = [], petals: V3[] = [];
    const bloomTone = () => new THREE.Color(random() < 0.6 ? '#f0780a' : random() < 0.5 ? '#f59a14' : '#e9620a').lerp(new THREE.Color('#8a5a28'), droop * mix(0.5, 1, random()));
    const bloom = (x: number, y: number, z: number, r = 0.17) => blooms.push({ p: [x, y, z], r: r * mix(0.85, 1.15, random()) * (1 - droop * 0.25) });

    // What rises behind the top step.
    const cane = s.material('#b8975a', { roughness: 0.8 });
    if (a.crown === 'arch' || a.crown === 'reeds') {
      const pts: V3[] = [];
      for (let i = 0; i <= 6; i++) pts.push([-4.75, T1 + i / 6 * 2.3, -4.0]);
      for (let i = 1; i < 20; i++) { const ang = Math.PI - i / 20 * Math.PI; pts.push([Math.cos(ang) * 4.75, T1 + 2.3 + Math.sin(ang) * 2.75, -4.0]); }
      for (let i = 6; i >= 0; i--) pts.push([4.75, T1 + i / 6 * 2.3, -4.0]);
      s.tube(pts, 0.07, cane);
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      if (a.crown === 'arch') {
        const n = Math.round(curve.getLength() / 0.2);
        for (let i = 0; i <= n; i++) { const p = curve.getPointAt(i / n); for (let k = 0; k < 3; k++) { const ang = random() * 6.28; bloom(p.x + Math.cos(ang) * 0.14, p.y + Math.sin(ang) * 0.14, p.z + 0.08 + random() * 0.16, 0.19); } }
      } else {
        const orange = s.material('#f28a12', { roughness: 0.6 });
        for (let i = 0; i < 13; i++) {
          const p = curve.getPointAt(0.08 + i / 12 * 0.84);
          if (i % 3 === 1) { bloom(p.x, p.y, p.z + 0.14, 0.2); bloom(p.x + 0.2, p.y - 0.08, p.z + 0.14, 0.17); continue; }
          const hang = mix(0.25, 0.6, random());
          s.rod([p.x, p.y, p.z + 0.08], [p.x, p.y - hang, p.z + 0.08], 0.012, cane);
          s.ball([0.17, 0.16, 0.17], [p.x, p.y - hang - 0.15, p.z + 0.08], orange, 12);
        }
      }
    } else if (a.crown === 'cross') {
      const dark = s.material('#4a2c1a', { roughness: 0.7 });
      s.box([0.28, 2.5, 0.12], [0, 6.35, -4.32], dark); s.box([1.6, 0.28, 0.12], [0, 6.85, -4.32], dark);
    } else if (a.crown === 'picture') {
      const c = document.createElement('canvas'); c.width = 128; c.height = 160;
      const g = c.getContext('2d')!;
      g.fillStyle = '#1f3a6a'; g.fillRect(0, 0, 128, 160);
      g.fillStyle = '#f2b61e'; g.beginPath(); for (let i = 0; i < 40; i++) { const ang = i / 40 * 6.28, r = i % 2 ? 1 : 0.78; g.lineTo(64 + Math.cos(ang) * 44 * r, 82 + Math.sin(ang) * 64 * r); } g.fill();
      g.fillStyle = '#17807a'; g.beginPath(); g.moveTo(64, 30); g.quadraticCurveTo(98, 76, 88, 134); g.lineTo(40, 134); g.quadraticCurveTo(30, 76, 64, 30); g.fill();
      g.fillStyle = '#d9577c'; g.beginPath(); g.moveTo(64, 60); g.lineTo(78, 134); g.lineTo(50, 134); g.fill();
      g.fillStyle = '#c99a72'; g.beginPath(); g.arc(64, 52, 9, 0, 7); g.fill();
      const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
      const gold = s.material('#d6a83a', { metalness: 0.5, roughness: 0.35, emissive: '#6a4a08', emissiveIntensity: 0.35 });
      s.box([1.9, 2.3, 0.1], [0, 6.5, -4.34], gold);
      s.mesh(new THREE.PlaneGeometry(1.6, 2.0), new THREE.MeshStandardMaterial({ map, roughness: 0.5, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: lit ? 0.25 : 0.05 }), [0, 6.5, -4.28]);
      for (let i = 0; i < 18; i++) { const ang = i / 18 * 6.28; s.rod([Math.cos(ang) * 1.25, 6.5 + Math.sin(ang) * 1.45, -4.36], [Math.cos(ang) * (i % 2 ? 1.9 : 1.6), 6.5 + Math.sin(ang) * (i % 2 ? 2.1 : 1.8), -4.36], 0.035, gold, 0.01); }
    }

    // Papel picado on sagging strings.
    const flags: { mesh: THREE.Mesh; phase: number }[] = [];
    if (a.banners !== 'none') {
      const maps = [0, 1, 2].map(flagTexture);
      const hues = { rainbow: ['#e5257e', '#18b5b0', '#f6c21c', '#49b848', '#7a3fc0', '#f2702a', '#2a6ad8', '#d8262e'], feast: ['#7a3fc0', '#f2702a', '#e5257e', '#f6c21c'], white: ['#fbf8f0', '#f1ece0'], tattered: ['#c98aa6', '#8ab8b4', '#d8c88a', '#b0a0c8'] }[a.banners];
      const strings: [number, number, number, number][] = a.crown === 'cross' || a.crown === 'picture' ? [[8.35, 0.5, -4.1, 12.4], [7.95, 0.75, -3.3, 12.4]] : [[8.35, 0.55, -4.1, 12.4], [7.45, 0.6, -3.5, 12.4]];
      strings.forEach(([y0, sag, z, span], row) => {
        const line: V3[] = [];
        const n = 12;
        const yAt = (x: number) => y0 - sag * (1 - (x / (span / 2)) ** 2);
        for (let i = 0; i <= 12; i++) { const x = -span / 2 + i / 12 * span; line.push([x, yAt(x), z]); }
        s.tube(line, 0.012, s.material('#e8e0cc')).castShadow = false;
        for (let i = 0; i < n; i++) {
          if (a.banners === 'tattered' && random() < 0.5) continue;
          const x = -span / 2 + (i + 0.5 + row * 0.5) / (n + 0.5) * span;
          if (Math.abs(x) > span / 2 - 0.4) continue;
          const hue = hues[(i + row * 3) % hues.length];
          const geo = new THREE.PlaneGeometry(0.94, 0.76); geo.translate(0, -0.38, 0);
          const mesh = s.mesh(geo, new THREE.MeshStandardMaterial({ map: maps[(i + row) % 3], color: hue, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, emissive: hue, emissiveIntensity: mix(0.08, 0.28, mood.cheer) }), [x, yAt(x) - 0.01, z]);
          mesh.rotation.z = -(2 * sag * x / (span / 2) ** 2) * 0.8 + (a.banners === 'tattered' ? (random() - 0.5) * 0.4 : 0);
          mesh.rotation.x = (random() - 0.5) * 0.2;
          flags.push({ mesh, phase: random() * 6 });
        }
      });
    }

    // Candles belonging to the altar itself.
    const flameGeo = new THREE.LatheGeometry([[0, 0], [0.55, 0.12], [0.7, 0.35], [0.5, 0.7], [0.16, 1.15], [0, 1.45]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb838' }), coreMat = new THREE.MeshBasicMaterial({ color: '#fff3c4' });
    const haloMat = new THREE.MeshBasicMaterial({ color: '#ffac50', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending });
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#8f8f96', transparent: true, opacity: 0.2, depthWrite: false });
    const flames: { group: THREE.Group; phase: number }[] = [];
    const glassHues = ['#c8262e', '#f4ecd8', '#1f56b8', '#e09a1a', '#7a35b0', '#1f8a4a'];
    const candle = (x: number, y: number, z: number, kind: 'taper' | 'glass') => {
      const burnt = a.moment === 'after' ? mix(0.75, 0.95, random()) : a.moment === 'midnight' ? mix(0.4, 0.8, random()) : mix(0, 0.3, random());
      const alight = a.moment === 'vigil' || (a.moment === 'midnight' && random() < 0.55);
      let top: number;
      if (kind === 'taper') {
        const h = mix(1.25, 0.25, burnt);
        s.cylinder(0.16, 0.2, 0.1, [x, y + 0.05, z], s.material('#b8663e'), 12);
        s.cylinder(0.055, 0.065, h, [x, y + 0.1 + h / 2, z], s.material('#f6efdc', { roughness: 0.5, emissive: '#ff9a3a', emissiveIntensity: alight ? 0.3 : 0 }), 10);
        top = y + 0.1 + h;
      } else {
        const hue = glassHues[Math.floor(random() * glassHues.length)];
        s.cylinder(0.14, 0.135, 0.85, [x, y + 0.425, z], s.material(hue, { roughness: 0.25, emissive: hue, emissiveIntensity: alight ? 0.55 : 0.03 }), 14);
        s.cylinder(0.125, 0.125, 0.02, [x, y + 0.86, z], s.material('#f6efdc', { emissive: '#ffb347', emissiveIntensity: alight ? 0.8 : 0 }), 12);
        top = y + 0.84;
      }
      if (alight) {
        const group = new THREE.Group(); group.position.set(x, top, z);
        const outer = new THREE.Mesh(flameGeo, flameMat); outer.scale.setScalar(0.085);
        const inner = new THREE.Mesh(flameGeo, coreMat); inner.scale.setScalar(0.045); inner.position.y = 0.012;
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), haloMat); halo.position.y = 0.06;
        group.add(outer, inner, halo); root.add(group);
        flames.push({ group, phase: random() * 10 });
      } else if (a.moment !== 'setting' && random() < 0.6) {
        const pts: V3[] = []; for (let i = 0; i < 6; i++) pts.push([x + Math.sin(i * 1.2 + random()) * 0.03 * i, top + 0.03 + i * 0.16, z]);
        s.tube(pts, 0.014, smokeMat).castShadow = false;
      }
    };
    const more = mood.density > 0.5;
    const spots: [number, number, number, 'taper' | 'glass'][] = [
      [-2.1, T3, -2.7, 'taper'], [2.1, T3, -2.7, 'taper'], [-2.6, T3, -3.5, 'glass'], [2.6, T3, -3.5, 'glass'],
      [-1.25, T2, -0.95, 'glass'], [1.25, T2, -0.95, 'glass'], [-3.95, T2, -0.85, 'taper'], [3.95, T2, -0.85, 'taper'],
      [-2.0, T1, 1.15, 'glass'], [2.0, T1, 1.15, 'glass'], [-5.1, T1, 1.25, 'taper'], [5.1, T1, 1.25, 'taper'],
    ];
    if (more) spots.push([-0.9, T1, 1.3, 'glass'], [0.9, T1, 1.3, 'glass'], [-3.95, T2, -2.0, 'glass'], [3.95, T2, -2.0, 'glass'], [-5.2, 0, 2.3, 'glass'], [5.2, 0, 2.3, 'glass']);
    for (const [x, y, z, kind] of spots) candle(x + (random() - 0.5) * 0.12, y + 0.025, z + (random() - 0.5) * 0.1, kind);

    // Water and salt always; then whatever fills the gaps.
    s.cylinder(0.16, 0.13, 0.42, [-1.75, T1 + 0.235, 0.35], new THREE.MeshPhysicalMaterial({ color: '#bcdcd8', transparent: true, opacity: 0.45, roughness: 0.05 }), 16);
    s.cylinder(0.14, 0.12, 0.3, [-1.75, T1 + 0.18, 0.35], s.material('#d4ecec', { roughness: 0.1 }), 16);
    s.lathe([[0, 0.01], [0.16, 0.01], [0.24, 0.07], [0.22, 0.07], [0.14, 0.03], [0, 0.03]], s.material('#b05a34'), [1.75, T1 + 0.025, 0.35]);
    s.mesh(new THREE.ConeGeometry(0.13, 0.12, 12), s.material('#fbfaf4', { roughness: 1 }), [1.75, T1 + 0.115, 0.35]);
    if (a.offerings === 'fruit') {
      const orange = s.material('#f28a12', { roughness: 0.6 }), yellow = s.material('#f2c630', { roughness: 0.55 }), green = s.material('#7a9a3a', { roughness: 0.7 });
      for (const [cx, cz] of [[0, -1.5], [-5, -0.05], [5, -0.05]] as const) {
        const base = cx === 0 ? T2 : T1;
        for (let i = 0; i < 6; i++) { const ang = i * 1.047; s.ball([0.19, 0.18, 0.19], [cx + (i ? Math.cos(ang) * 0.3 : 0), base + (i ? 0.2 : 0.5), cz + (i ? Math.sin(ang) * 0.3 : 0)], i % 4 === 3 ? green : orange, 12); }
      }
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) s.tube([[side * 0.85 - 0.3, T2 + 0.09, -1.75 + i * 0.1], [side * 0.85, T2 + 0.2 + i * 0.01, -1.85 + i * 0.12], [side * 0.85 + 0.3, T2 + 0.11, -1.75 + i * 0.1]], 0.07, yellow);
      for (let i = 0; i < 4; i++) s.rod([-5.75 + i * 0.14, 0, 2.0 + i * 0.1], [-6.15 + i * 0.07, 3.6 + random() * 0.6, 0.8], 0.06, s.material(i % 2 ? '#8a9a4a' : '#6a7a3a'), 0.05);
    } else if (a.offerings === 'skulls') {
      const hues = ['#e5257e', '#18b5b0', '#f6c21c', '#7a3fc0', '#f2702a'];
      const white = s.material('#f7f2e6', { roughness: 0.8 }), dark = s.material('#2a1c20');
      const dots: { at: V3; size: number; color: string }[] = [];
      [-0.95, -0.48, 0, 0.48, 0.95, -5, 5].forEach((x, i) => {
        const k = i > 4 ? 1.3 : 1, z = i > 4 ? 0 : -1.35 + (i % 2) * 0.12, T2 = i > 4 ? T1 : 2.4;
        s.ball([0.19 * k, 0.19 * k, 0.21 * k], [x, T2 + 0.28 * k, z], white, 14);
        s.ball([0.13 * k, 0.1 * k, 0.13 * k], [x, T2 + 0.1 * k, z + 0.05 * k], white, 10);
        for (const side of [-1, 1]) { s.ball([0.05 * k, 0.055 * k, 0.03 * k], [x + side * 0.075 * k, T2 + 0.27 * k, z + 0.185 * k], dark, 8); for (let p = 0; p < 6; p++) dots.push({ at: [x + side * 0.075 * k + Math.cos(p * 1.047) * 0.075 * k, T2 + 0.27 * k + Math.sin(p * 1.047) * 0.075 * k, z + 0.19 * k], size: 0.02 * k, color: hues[(i + p) % hues.length] }); }
        dots.push({ at: [x, T2 + 0.42 * k, z + 0.15 * k], size: 0.035 * k, color: hues[i % hues.length] });
      });
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff', { roughness: 0.5 }), dots);
    } else if (a.offerings === 'toys') {
      const hues = ['#d8262e', '#2a6ad8', '#f6c21c', '#49b848', '#e5257e'];
      const ball = s.ball([0.28, 0.28, 0.28], [-0.7, T2 + 0.3, -1.5], s.material('#d8262e', { roughness: 0.4 }), 16);
      void ball; s.ring(0.283, 0.03, [-0.7, T2 + 0.3, -1.5], s.material('#fbf8f0')).rotation.x = Math.PI / 2;
      s.mesh(new THREE.ConeGeometry(0.2, 0.34, 14), s.material('#49b848'), [0.15, T2 + 0.2, -1.3]).rotation.set(Math.PI + 0.5, 0, 0.3);
      for (let i = 0; i < 5; i++) { const block = s.box([0.24, 0.24, 0.24], [0.7 + (i % 2) * 0.27, T2 + 0.145 + Math.floor(i / 2) * 0.245, -1.55 + (i % 2) * 0.05], s.material(hues[i])); block.rotation.y = random() * 0.5; }
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const sweet = s.ball([0.09, 0.06, 0.06], [side * 5 + (random() - 0.5) * 0.5, T1 + 0.08, 0 + (random() - 0.5) * 0.6], s.material(hues[i % 5], { emissive: hues[i % 5], emissiveIntensity: 0.15 }), 8); sweet.rotation.y = random() * 3; }
    }

    // Flowers along the step edges and on the floor.
    const edge = mix(0.25, 1, mood.density);
    tiers.forEach((t, i) => {
      const n = Math.round(t.w / 0.36);
      for (let k = 0; k <= n; k++) if (random() < edge) bloom(-t.w / 2 + k / n * t.w, t.top + 0.1, t.front - 0.02 + (random() - 0.5) * 0.06, 0.15 + i * 0.005);
    });
    const petalAt = (x: number, z: number) => petals.push([x, 0.02, z]);
    const petalCount = Math.round(mix(500, 1100, mood.density));
    if (a.path === 'path') {
      for (let i = 0; i < petalCount; i++) { const t = random(); petalAt((random() + random() - 1) * mix(0.75, 1.15, t), 1.75 + t * 2.7); }
      for (let i = 0; i < 9; i++) for (const side of [-1, 1]) bloom(side * (mix(0.95, 1.4, i / 8) + random() * 0.08), 0.11, 1.8 + i * 0.32, 0.16);
    } else if (a.path === 'cross') {
      for (let i = 0; i < petalCount; i++) { if (random() < 0.58) petalAt((random() - 0.5) * 0.6, 1.8 + random() * 2.6); else petalAt((random() - 0.5) * 3.2, 2.5 + (random() - 0.5) * 0.6); }
      for (const [x, z] of [[0, 1.75], [0, 4.4], [-1.65, 2.5], [1.65, 2.5]]) bloom(x, 0.11, z, 0.19);
    } else if (a.path === 'scattered') for (let i = 0; i < petalCount; i++) petalAt((random() - 0.5) * 11.6, 1.7 + random() * 2.7);
    if (a.moment === 'after') for (let i = 0; i < 160; i++) petalAt((random() - 0.5) * 11.4, 1.7 + random() * 2.7);

    const dummy = new THREE.Object3D();
    if (blooms.length) {
      const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.75, emissive: '#b84a00', emissiveIntensity: mix(0.12, 0.3, mood.cheer) * (1 - droop) }), blooms.length);
      blooms.forEach((b, i) => { dummy.position.set(...b.p); dummy.rotation.set(random() * 3, random() * 3, random() * 3); dummy.scale.set(b.r, b.r * 0.78, b.r); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, bloomTone()); });
      mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    }
    if (petals.length) {
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, emissive: '#b84a00', emissiveIntensity: 0.12 }), petals.length);
      petals.forEach((p, i) => { dummy.position.set(...p); dummy.rotation.set(0, random() * 6.28, 0); const r = mix(0.07, 0.11, random()); dummy.scale.set(r, 0.012, r * 0.6); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, bloomTone()); });
      mesh.receiveShadow = true; root.add(mesh);
    }

    const speed = mix(3, 13, mood.energy), sway = mix(0.03, 0.22, mood.energy);
    world.update = (_dt, time) => {
      for (const f of flames) { const w = Math.sin(time * speed + f.phase) * 0.6 + Math.sin(time * speed * 2.3 + f.phase * 1.7) * 0.4; f.group.scale.y = 1 + w * 0.22; f.group.rotation.z = w * 0.12; }
      for (const f of flags) f.mesh.rotation.x = Math.sin(time * speed * 0.25 + f.phase) * sway;
    };
    return world;
  },
});
