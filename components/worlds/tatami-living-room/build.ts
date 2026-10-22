import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, score, visibleBounds } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return [canvas, canvas.getContext('2d') as Ctx] as const;
};
const textureOf = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

export default defineWorld({
  questions: {
    opening: choice('How far has the shoji been slid open onto the garden?', {
      crack: 'A hand\'s width, just enough for a blade of cold light.',
      one: 'One whole panel, framing a slice of the snowy garden.',
      two: 'Two panels wide, the room thrown open to the snow.',
    }),
    garden: choice('What stands in the garden beyond?', {
      lantern: 'A stone lantern wearing a cap of snow.',
      pine: 'A trained pine, every pad of needles loaded with snow.',
      persimmon: 'A bare persimmon tree with a few orange fruit left for the birds.',
      snowman: 'A small two-ball snowman with a bucket hat, built by children.',
      bare: 'Only unbroken snow and a line of stepping stones.',
    }),
    snowfall: score('Is snow falling?', ['No: still, already fallen', 'A few drifting flakes', 'A steady thick fall']),
    scroll: choice('What hangs in the alcove?', {
      calligraphy: 'Bold black brush calligraphy on white paper.',
      landscape: 'An ink landscape of mountains in mist.',
      sunrise: 'A red sun and a crane, hung for New Year.',
      circle: 'A single brushed circle, empty and calm.',
      plum: 'A plum branch in early blossom.',
    }),
    alcove: choice('What stands on the alcove floor?', {
      mochi: 'Stacked round rice cakes topped with a mandarin, the New Year offering.',
      ikebana: 'A vase with a pine bough and one red camellia.',
      empty: 'Nothing: bare polished boards.',
      storage: 'Cardboard boxes and an old television, the alcove given over to storage.',
    }),
    fusuma: choice('What are the sliding doors at the back like?', {
      plain: 'Plain cream paper with faint silver clouds.',
      pines: 'Old gold paper painted with pine branches.',
      waves: 'Cream above a band of indigo waves.',
      scribbled: 'Patched, sun-browned and crayoned on by small children.',
      ajar: 'Plain, with one door left half open on a closet stacked with bedding.',
    }),
    left: choice('What has been left at the edge of the mats?', {
      nothing: 'Nothing; the room is swept and bare.',
      lamp: 'A paper floor lantern, lit.',
      cushions: 'A stack of floor cushions waiting for guests.',
      toys: 'Beanbags, a spinning top and a paper kite.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const HW = 1.82, HD = 1.365, WALL = 2.4, LINTEL = 1.76;
    const YAW = 38, PITCH = 21;
    const { art: s, world } = diorama(context, { background: '#e9e5db', floor: null, width: HW * 2, depth: HD * 2, yaw: YAW, pitch: PITCH,
      slots: [[0, 0.15], [1.2, -0.82], [-1.12, 0.86], [1.27, 0.84], [-0.95, -0.82]] });
    const slotLimits: [number, number][] = [[0.95, 1.7], [0.45, 1.6], [0.42, 1.2], [0.42, 1.0], [0.4, 1.3]];
    const slots: [number, number][] = [[0, 0.15], [1.2, -0.82], [-1.12, 0.86], [1.27, 0.84], [-0.95, -0.82]];

    const lowSun = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const elevation = THREE.MathUtils.degToRad(mix(46, 20, lowSun));
    const azimuth = (mood.daylight - 0.5) * 0.9 + 0.12;
    const cedar = s.material('#8a6644', { roughness: 0.7 });
    const darkWood = s.material('#4a3324', { roughness: 0.5 });
    const plaster = s.material(mix(0, 1, mood.warmth) > 0.5 ? '#cdbb8c' : '#bdb893', { roughness: 1 });
    const flat = (map: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, ...extra });
    const panel = (width: number, height: number, material: THREE.Material, at: [number, number, number], turn = 0) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(width, height), material, at);
      mesh.rotation.y = turn;
      return mesh;
    };

    // --- Shoji: where each of the four panels stands --------------------------------------------
    const pw = (HD * 2) / 4;
    const home = [0, 1, 2, 3].map((k) => -HD + pw * (k + 0.5));
    const at = home.slice();
    if (a.opening === 'crack') at[2] -= 0.3;
    else if (a.opening === 'one') at[2] = home[1] + 0.02;
    else { at[1] = home[0] + 0.02; at[2] = home[3] - 0.02; }
    const HIP = 0.3, PH = LINTEL - 0.02;
    const drawShoji = (c: Ctx, w: number, h: number, light: boolean) => {
      const bar = light ? '#000000' : '#7a5a3a';
      c.fillStyle = light ? '#000000' : '#f3ead2'; c.fillRect(0, 0, w, h);
      const top = h * 0.03, bottom = h * (1 - HIP / PH), side = w * 0.05;
      const cols = 4, rows = 9;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = side + (i * (w - side * 2)) / cols, y = top + (j * (bottom - top)) / rows;
        const cw = (w - side * 2) / cols, ch = (bottom - top) / rows, gap = Math.max(1, w * 0.012);
        c.fillStyle = light ? '#ad9864' : `hsl(42, 52%, ${86 + random() * 6}%)`;
        c.fillRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2);
      }
      if (light) return;
      c.strokeStyle = bar; c.lineWidth = w * 0.025;
      for (let i = 0; i <= cols; i++) { const x = side + (i * (w - side * 2)) / cols; c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); }
      for (let j = 0; j <= rows; j++) { const y = top + (j * (bottom - top)) / rows; c.beginPath(); c.moveTo(side, y); c.lineTo(w - side, y); c.stroke(); }
      c.fillStyle = '#8a6644'; c.fillRect(0, bottom, w, h - bottom);
      c.fillStyle = '#74553a'; c.fillRect(0, bottom, w, h * 0.012); c.fillRect(0, 0, side, h); c.fillRect(w - side, 0, side, h); c.fillRect(0, 0, w, top); c.fillRect(0, h - h * 0.02, w, h * 0.02);
      // Patches and tears on older paper.
      const flaws = Math.floor(mood.wear * 7 * random() + mood.wear * 2);
      for (let k = 0; k < flaws; k++) {
        const x = side + random() * (w - side * 2 - 30), y = top + random() * (bottom - top - 30);
        if (random() < 0.5) { c.fillStyle = '#fffaf0'; c.fillRect(x, y, 22 + random() * 14, 22 + random() * 14); }
        else { c.fillStyle = '#5f6a70'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 16 + random() * 12, y + 5); c.lineTo(x + 9, y + 22 + random() * 14); c.fill(); }
      }
    };
    const paperGlow = mix(0.38, 0.72, lowSun) * mix(0.8, 1.1, mood.warmth);
    at.forEach((z, k) => {
      const [canvas, c] = canvasOf(192, 480);
      drawShoji(c, 192, 480, false);
      const map = textureOf(canvas);
      const paper = new THREE.MeshStandardMaterial({ map, emissive: '#ffdca0', emissiveMap: map, emissiveIntensity: paperGlow, roughness: 0.95, side: THREE.DoubleSide });
      const moved = z !== home[k];
      const sheet = panel(pw, PH, paper, [-HW - 0.03 - (moved ? 0.035 : k % 2 ? 0.012 : -0.012), 0.02 + PH / 2, z], Math.PI / 2);
      sheet.castShadow = false;
    });

    // --- Tatami floor with the afternoon sun painted across it --------------------------------------
    const S = 300;
    const [floorCanvas, fc] = canvasOf(Math.round(HW * 2 * S), Math.round(HD * 2 * S));
    const straw = new THREE.Color('#b7bd76').lerp(new THREE.Color('#d6c389'), Math.min(1, mood.wear * 1.6)).lerp(new THREE.Color('#b3945e'), Math.max(0, mood.wear - 0.6) * 1.6);
    const heri = ['#2c3b2e', '#1f1d1b', '#4a3524', '#27344f'][Math.floor(random() * 4)];
    const mats: [number, number, number, number][] = [[0, 0, 1.82, 0.91], [1.82, 0, 1.82, 0.91], [0, 0.91, 0.91, 1.82], [0.91, 0.91, 1.82, 0.91], [0.91, 1.82, 1.82, 0.91], [2.73, 0.91, 0.91, 1.82]];
    for (const [mx, mz, mw, md] of mats) {
      const tone = straw.clone().offsetHSL((random() - 0.5) * 0.012, 0, (random() - 0.5) * 0.045);
      fc.fillStyle = `#${tone.getHexString()}`; fc.fillRect(mx * S, mz * S, mw * S, md * S);
      const long = mw > md;
      fc.strokeStyle = 'rgba(70,60,20,0.13)'; fc.lineWidth = 1;
      for (let k = 0; k < (long ? mw : md) * S; k += 4) { fc.beginPath(); if (long) { fc.moveTo(mx * S + k, mz * S); fc.lineTo(mx * S + k, (mz + md) * S); } else { fc.moveTo(mx * S, mz * S + k); fc.lineTo((mx + mw) * S, mz * S + k); } fc.stroke(); }
      if (mood.wear > 0.4) for (let k = 0; k < mood.wear * 6; k++) { fc.fillStyle = `rgba(110,80,40,${0.06 + random() * 0.1})`; fc.beginPath(); fc.ellipse((mx + random() * mw) * S, (mz + random() * md) * S, 20 + random() * 50, 12 + random() * 30, random() * 3, 0, 7); fc.fill(); }
      fc.fillStyle = heri;
      const b = 0.032 * S;
      if (long) { fc.fillRect(mx * S, mz * S, mw * S, b); fc.fillRect(mx * S, (mz + md) * S - b, mw * S, b); }
      else { fc.fillRect(mx * S, mz * S, b, md * S); fc.fillRect((mx + mw) * S - b, mz * S, b, md * S); }
      fc.strokeStyle = 'rgba(40,30,10,0.35)'; fc.lineWidth = 1.5; fc.strokeRect(mx * S, mz * S, mw * S, md * S);
    }
    // Light through the shoji, sheared across the mats by the sun's height and bearing.
    const P = 96;
    const [lightCanvas, lc] = canvasOf(Math.round(HD * 2 * P), Math.round(PH * P));
    lc.fillStyle = '#ffe7b4'; lc.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
    at.forEach((z) => { lc.save(); lc.translate((z - pw / 2 + HD) * P, 0); drawShoji(lc, pw * P, PH * P, true); lc.restore(); });
    const reach = 1 / Math.tan(elevation), skew = Math.tan(azimuth);
    fc.save();
    fc.globalCompositeOperation = 'screen';
    fc.globalAlpha = mix(0.5, 0.82, lowSun);
    fc.setTransform(0, S / P, -(S * reach) / P, -(S * reach * skew) / P, S * reach * PH, S * PH * reach * skew);
    fc.drawImage(lightCanvas, 0, 0);
    fc.restore();
    const floorMap = textureOf(floorCanvas);
    const tatami = s.mesh(new THREE.PlaneGeometry(HW * 2, HD * 2), flat(floorMap), [0, 0, 0]);
    tatami.rotation.x = -Math.PI / 2;
    tatami.castShadow = false;
    world.ground = tatami;
    s.box([HW * 2 + 0.1, 0.34, HD * 2 + 0.1], [0, -0.175, 0], darkWood);

    // --- Timber frame --------------------------------------------------------------------------
    const post = (x: number, z: number, height = WALL, size = 0.1) => s.box([size, height + 0.3, size], [x, height / 2 - 0.15, z], cedar);
    post(-HW - 0.05, -HD - 0.05); post(HW + 0.05, -HD - 0.05); post(-HW - 0.05, HD + 0.05);
    // Left wall: sill, lintel, transom wall above the shoji.
    s.box([0.1, 0.03, HD * 2], [-HW - 0.05, 0.012, 0], darkWood);
    s.box([0.11, 0.07, HD * 2], [-HW - 0.05, LINTEL + 0.035, 0], cedar);
    s.box([0.06, WALL - LINTEL - 0.07, HD * 2], [-HW - 0.05, (WALL + LINTEL + 0.07) / 2, 0], plaster);
    s.box([0.11, 0.07, HD * 2 + 0.2], [-HW - 0.05, WALL + 0.035, 0], cedar);
    // Back wall above the doors and the alcove.
    s.box([HW * 2 + 0.2, 0.07, 0.11], [0, WALL + 0.035, -HD - 0.05], cedar);
    s.box([HW, 0.07, 0.11], [HW / 2, LINTEL + 0.035, -HD - 0.05], cedar);
    s.box([HW, WALL - LINTEL - 0.07, 0.06], [HW / 2, (WALL + LINTEL + 0.07) / 2, -HD - 0.05], plaster);
    s.box([HW * 2, 0.03, 0.1], [0, 0.012, -HD - 0.05], darkWood);

    // --- Alcove (left half of the back wall) ---------------------------------------------------------
    const AD = 0.72, ax = -HW / 2, back = -HD - AD;
    s.box([HW - 0.06, 0.1, AD], [ax, 0.05, -HD - AD / 2], s.material('#3a2a20', { roughness: 0.3 }));
    s.box([HW, WALL, 0.06], [ax, WALL / 2, back - 0.03], plaster);
    s.box([0.06, WALL, AD], [-HW - 0.03, WALL / 2, -HD - AD / 2], plaster);
    s.box([0.06, WALL, AD], [-0.03, WALL / 2, -HD - AD / 2], plaster);
    s.box([HW - 0.1, 0.42, 0.05], [ax, WALL - 0.21, -HD - 0.04], plaster);
    s.box([HW - 0.1, 0.05, 0.07], [ax, WALL - 0.44, -HD - 0.04], cedar);
    // The alcove post: a peeled, slightly crooked trunk.
    s.tube([[0, -0.1, -HD - 0.05], [0.012, 0.8, -HD - 0.05], [-0.01, 1.6, -HD - 0.05], [0, WALL + 0.05, -HD - 0.05]], 0.065, s.material('#6a4a30', { roughness: 0.35 }));
    // Hanging scroll.
    const [scrollCanvas, sc] = canvasOf(160, 480);
    sc.fillStyle = ['#6b5a34', '#3f4f45', '#5a3a3a', '#4a4a5a'][Math.floor(random() * 4)]; sc.fillRect(0, 0, 160, 480);
    sc.fillStyle = '#c9b06a'; sc.fillRect(0, 62, 160, 12); sc.fillRect(0, 392, 160, 12);
    sc.fillStyle = '#efe6cf'; sc.fillRect(16, 74, 128, 318);
    const brush = (points: [number, number][], width: number, colour = '#1c1a18') => { sc.strokeStyle = colour; sc.lineWidth = width; sc.lineCap = 'round'; sc.lineJoin = 'round'; sc.beginPath(); points.forEach(([x, y], k) => (k ? sc.lineTo(x, y) : sc.moveTo(x, y))); sc.stroke(); };
    if (a.scroll === 'calligraphy') {
      for (let k = 0; k < 3; k++) { const y = 110 + k * 92; brush([[56 + random() * 16, y], [104, y + 6 + random() * 10]], 13); brush([[80 + random() * 8, y - 14], [76, y + 40], [58 + random() * 10, y + 62]], 11); if (random() < 0.7) brush([[84, y + 30], [108 + random() * 8, y + 60]], 9); }
    } else if (a.scroll === 'landscape') {
      for (let layer = 0; layer < 4; layer++) { sc.fillStyle = `rgba(40,44,48,${0.2 + layer * 0.18})`; sc.beginPath(); sc.moveTo(16, 392); for (let x = 16; x <= 144; x += 8) sc.lineTo(x, 190 + layer * 46 - Math.abs(Math.sin(x / (30 - layer * 4) + layer * 2)) * (70 - layer * 12)); sc.lineTo(144, 392); sc.fill(); sc.fillStyle = 'rgba(239,230,207,0.7)'; sc.fillRect(16, 230 + layer * 46, 128, 18); }
    } else if (a.scroll === 'sunrise') {
      sc.fillStyle = '#c0282c'; sc.beginPath(); sc.arc(80, 150, 38, 0, 7); sc.fill();
      sc.fillStyle = '#f8f5ec'; sc.beginPath(); sc.ellipse(76, 290, 34, 20, -0.2, 0, 7); sc.fill();
      brush([[100, 280], [116, 240], [104, 206]], 7); brush([[60, 300], [34, 312]], 12); brush([[72, 308], [70, 370]], 3); brush([[86, 308], [92, 370]], 3);
      sc.fillStyle = '#c0282c'; sc.fillRect(98, 198, 10, 7);
    } else if (a.scroll === 'circle') {
      sc.strokeStyle = '#1c1a18'; sc.lineCap = 'round';
      for (let k = 0; k < 40; k++) { const t0 = -1.2 + (k / 40) * 5.7; sc.lineWidth = 14 - k * 0.22; sc.beginPath(); sc.arc(80, 220, 44, t0, t0 + 0.17); sc.stroke(); }
      sc.fillStyle = '#b0242c'; sc.fillRect(112, 340, 16, 16);
    } else {
      brush([[20, 380], [70, 300], [60, 230], [110, 150], [100, 100]], 9, '#2a1c18'); brush([[70, 300], [120, 270]], 5, '#2a1c18'); brush([[60, 230], [28, 190]], 4, '#2a1c18');
      for (const [x, y] of [[110, 150], [120, 270], [28, 190], [100, 100], [66, 262], [84, 190], [44, 330], [96, 284]]) { sc.fillStyle = '#e88aa0'; for (let p = 0; p < 5; p++) { sc.beginPath(); sc.arc(x + Math.cos(p * 1.257) * 6, y + Math.sin(p * 1.257) * 6, 5, 0, 7); sc.fill(); } }
    }
    panel(0.42, 1.26, flat(textureOf(scrollCanvas)), [ax, 1.22, back + 0.012]);
    s.cylinder(0.014, 0.014, 0.48, [ax, 0.59, back + 0.02], darkWood, 10).rotation.z = Math.PI / 2;
    s.rod([ax - 0.1, 1.85, back + 0.01], [ax, 1.97, back + 0.01], 0.003, darkWood); s.rod([ax + 0.1, 1.85, back + 0.01], [ax, 1.97, back + 0.01], 0.003, darkWood);
    // What stands in the alcove.
    const white = s.material('#f6f3ea', { roughness: 0.6 });
    const ox = ax + 0.35, oz = -HD - AD * 0.5;
    if (a.alcove === 'mochi') {
      const stand = s.material('#d9c08a', { roughness: 0.7 });
      s.box([0.2, 0.1, 0.2], [ox, 0.15, oz], stand); s.box([0.27, 0.015, 0.27], [ox, 0.207, oz], stand);
      s.ball([0.11, 0.05, 0.11], [ox, 0.26, oz], white, 16); s.ball([0.08, 0.042, 0.08], [ox, 0.335, oz], white, 16);
      s.ball([0.04, 0.034, 0.04], [ox, 0.4, oz], s.material('#f08a1c', { roughness: 0.5 }), 12);
      s.ball([0.03, 0.003, 0.014], [ox + 0.03, 0.435, oz], s.material('#3f6a2f'), 6);
    } else if (a.alcove === 'ikebana') {
      s.lathe([[0, 0], [0.05, 0], [0.085, 0.09], [0.07, 0.19], [0.03, 0.26], [0.04, 0.3]], s.material('#3a4f5f', { roughness: 0.3 }), [ox, 0.1, oz]);
      const twig = s.material('#4a3324');
      s.rod([ox, 0.38, oz], [ox - 0.2, 0.86, oz + 0.04], 0.008, twig, 0.004); s.rod([ox - 0.1, 0.62, oz + 0.02], [ox - 0.34, 0.74, oz + 0.02], 0.006, twig, 0.003);
      for (const [dx, dy, size] of [[-0.2, 0.88, 0.09], [-0.34, 0.75, 0.07], [-0.1, 0.66, 0.06]]) s.ball([size, size * 0.4, size * 0.7], [ox + dx, dy, oz + 0.03], s.material('#2f5a3a', { roughness: 0.9 }), 10);
      s.rod([ox, 0.38, oz], [ox + 0.1, 0.56, oz + 0.05], 0.005, twig);
      s.ball([0.04, 0.035, 0.04], [ox + 0.1, 0.57, oz + 0.05], s.material('#c0282c', { roughness: 0.6 }), 10);
    } else if (a.alcove === 'storage') {
      const card = s.material('#b8976a', { roughness: 0.95 });
      s.box([0.42, 0.34, 0.34], [ox - 0.02, 0.27, oz], card).rotation.y = 0.1;
      s.box([0.36, 0.26, 0.3], [ox - 0.04, 0.57, oz], card).rotation.y = -0.15;
      s.box([0.44, 0.36, 0.36], [ox - 0.55, 0.28, oz], s.material('#5a4636', { roughness: 0.5 }));
      s.box([0.32, 0.25, 0.01], [ox - 0.58, 0.3, oz + 0.185], s.material('#6f7f78', { roughness: 0.15 }));
      for (const dx of [-0.02, 0.06]) s.rod([ox - 0.55, 0.46, oz], [ox - 0.62 + dx * 3, 0.76, oz], 0.004, s.material('#cfd3d2', { metalness: 0.8 }));
    }

    // --- Sliding doors (right half of the back wall) -------------------------------------------------
    const FW = HW / 2;
    const [doorCanvas, dc] = canvasOf(512, 480);
    const cream = a.fusuma === 'pines' ? '#cdb06a' : a.fusuma === 'scribbled' ? '#d6c49a' : '#e9dfc6';
    dc.fillStyle = cream; dc.fillRect(0, 0, 512, 480);
    if (a.fusuma === 'plain' || a.fusuma === 'ajar') { dc.fillStyle = 'rgba(190,196,200,0.5)'; for (let k = 0; k < 7; k++) { const x = random() * 512, y = 60 + random() * 300; dc.beginPath(); dc.ellipse(x, y, 60 + random() * 50, 9, 0, 0, 7); dc.fill(); dc.beginPath(); dc.ellipse(x + 40, y + 12, 44, 7, 0, 0, 7); dc.fill(); } }
    else if (a.fusuma === 'pines') {
      dc.strokeStyle = '#4a2f1c'; dc.lineCap = 'round';
      const limb = (x0: number, y0: number, x1: number, y1: number, w: number) => { dc.lineWidth = w; dc.beginPath(); dc.moveTo(x0, y0); dc.quadraticCurveTo((x0 + x1) / 2 + 20, (y0 + y1) / 2 - 30, x1, y1); dc.stroke(); };
      limb(430, 480, 400, 250, 26); limb(400, 250, 180, 150, 16); limb(400, 250, 470, 110, 12); limb(300, 196, 90, 260, 9);
      for (const [x, y, w] of [[180, 140, 110], [90, 250, 80], [470, 100, 80], [320, 180, 80], [250, 100, 70]]) for (let k = 0; k < 3; k++) { dc.fillStyle = ['#2f5a3a', '#3f7048', '#27492f'][k]; dc.beginPath(); dc.ellipse(x + (k - 1) * w * 0.4, y + k * 5, w * 0.55, w * 0.2, 0, Math.PI, 0); dc.fill(); }
    } else if (a.fusuma === 'waves') {
      for (let row = 0; row < 5; row++) { const y = 330 + row * 34; dc.fillStyle = ['#2c4a7a', '#3a5f96', '#243c66'][row % 3]; dc.beginPath(); dc.moveTo(0, 480); for (let x = 0; x <= 512; x += 4) dc.lineTo(x, y - Math.abs(Math.sin((x + row * 37) / 46)) * 26); dc.lineTo(512, 480); dc.fill(); }
      dc.strokeStyle = '#e9dfc6'; dc.lineWidth = 2; for (let k = 0; k < 16; k++) { dc.beginPath(); dc.arc(k * 36 + 10, 352 + (k % 3) * 34, 12, Math.PI, Math.PI * 1.8); dc.stroke(); }
    } else {
      for (let k = 0; k < 5; k++) { dc.fillStyle = ['#efe6cf', '#f6f0de', '#e0d3ae'][k % 3]; dc.fillRect(random() * 440, 120 + random() * 300, 44 + random() * 30, 44 + random() * 30); }
      const crayons = ['#d9382c', '#2f6fd0', '#e0a81c', '#3f9a4a'];
      for (let k = 0; k < 9; k++) { dc.strokeStyle = crayons[k % 4]; dc.lineWidth = 4; dc.beginPath(); let x = random() * 480, y = 300 + random() * 150; dc.moveTo(x, y); for (let t = 0; t < 7; t++) { x += (random() - 0.5) * 70; y += (random() - 0.5) * 50; dc.lineTo(x, Math.min(470, Math.max(250, y))); } dc.stroke(); }
      dc.strokeStyle = '#d9382c'; dc.lineWidth = 5; dc.beginPath(); dc.arc(120, 380, 26, 0, 7); dc.stroke(); dc.beginPath(); dc.moveTo(120, 406); dc.lineTo(120, 460); dc.moveTo(96, 426); dc.lineTo(144, 426); dc.stroke();
    }
    for (const x0 of [0, 256]) { dc.strokeStyle = '#1a1714'; dc.lineWidth = 9; dc.strokeRect(x0 + 4, 4, 248, 472); dc.fillStyle = '#1a1714'; dc.beginPath(); dc.arc(x0 === 0 ? 226 : 286, 250, 9, 0, 7); dc.fill(); dc.fillStyle = '#b8963a'; dc.beginPath(); dc.arc(x0 === 0 ? 226 : 286, 250, 5, 0, 7); dc.fill(); }
    const doorMap = textureOf(doorCanvas);
    [0, 1].forEach((k) => {
      const map = doorMap.clone(); map.needsUpdate = true; map.repeat.set(0.5, 1); map.offset.set(k * 0.5, 0);
      const slide = a.fusuma === 'ajar' && k === 1 ? -FW * 0.55 : 0;
      panel(FW, PH, flat(map, { side: THREE.DoubleSide }), [FW * (k + 0.5) + slide, 0.02 + PH / 2, -HD - 0.035 - (k ? 0.03 : 0)]);
    });
    // The closet behind the doors.
    s.box([HW, WALL, 0.06], [HW / 2, WALL / 2, back - 0.03], plaster);
    s.box([0.06, WALL, AD], [HW + 0.03, WALL / 2, -HD - AD / 2], plaster);
    if (a.fusuma === 'ajar') {
      s.box([HW - 0.06, 0.04, AD - 0.04], [HW / 2, 0.86, -HD - AD / 2], cedar);
      const bedding = ['#c96f8c', '#f1ebdc', '#3f5f8a', '#d9c08a', '#7a9a6a', '#b0242c'];
      for (let k = 0; k < 4; k++) s.box([0.78, 0.13, 0.56], [HW * 0.72, 0.09 + k * 0.135, -HD - AD / 2 - 0.02], s.material(bedding[Math.floor(random() * bedding.length)], { roughness: 1 }));
      for (let k = 0; k < 3; k++) s.box([0.76, 0.11, 0.54], [HW * 0.72, 0.94 + k * 0.115, -HD - AD / 2 - 0.02], s.material(bedding[Math.floor(random() * bedding.length)], { roughness: 1 }));
    }

    // --- Lived-in dressing ---------------------------------------------------------------------
    const lamps: THREE.MeshStandardMaterial[] = [];
    if (a.left === 'lamp') {
      const lx = HW - 0.22, lz = -0.05;
      const [shade, hc] = canvasOf(64, 128);
      hc.fillStyle = '#f6e8c2'; hc.fillRect(0, 0, 64, 128); hc.strokeStyle = '#3a2a20'; hc.lineWidth = 4; hc.strokeRect(2, 2, 60, 124); hc.beginPath(); hc.moveTo(32, 0); hc.lineTo(32, 128); hc.moveTo(0, 44); hc.lineTo(64, 44); hc.moveTo(0, 86); hc.lineTo(64, 86); hc.stroke();
      const shadeMap = textureOf(shade);
      const glow = new THREE.MeshStandardMaterial({ map: shadeMap, emissive: '#ffb860', emissiveMap: shadeMap, emissiveIntensity: mix(0.7, 1.5, mood.warmth), roughness: 0.9 });
      lamps.push(glow);
      s.mesh(new THREE.BoxGeometry(0.24, 0.46, 0.24), glow, [lx, 0.39, lz]);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.box([0.022, 0.68, 0.022], [lx + dx * 0.12, 0.34, lz + dz * 0.12], darkWood);
      s.box([0.28, 0.02, 0.28], [lx, 0.15, lz], darkWood);
    } else if (a.left === 'cushions') {
      const shades = ['#7b2d3a', '#2f4a7a', '#8a6a2c', '#3f6b45'];
      const count = 3 + Math.floor(mood.density * 3);
      for (let k = 0; k < count; k++) s.box([0.5, 0.075, 0.5], [HW - 0.34, 0.04 + k * 0.078, -0.02], s.material(shades[k % 4], { roughness: 1 })).rotation.y = (random() - 0.5) * 0.3;
    } else if (a.left === 'toys') {
      const bright = ['#c0282c', '#2f6fd0', '#e0a81c', '#3f9a4a', '#c96f8c'];
      for (let k = 0; k < 5; k++) s.ball([0.045, 0.03, 0.045], [HW - 0.25 - random() * 0.25, 0.03, -0.25 + random() * 0.5], s.material(bright[k], { roughness: 1 }), 8);
      s.mesh(new THREE.ConeGeometry(0.06, 0.09, 16), s.material('#c0282c', { roughness: 0.4 }), [HW - 0.5, 0.05, 0.36]).rotation.set(Math.PI, 0, 0.5);
      const kite = s.box([0.42, 0.56, 0.008], [HW - 0.12, 0.3, -0.42], s.material('#f1ebdc', { roughness: 0.9 })); kite.rotation.set(-0.12, -Math.PI / 2 + 0.3, 0);
      const mark = s.cylinder(0.11, 0.11, 0.004, [HW - 0.127, 0.34, -0.42], s.material('#c0282c'), 20); mark.rotation.set(Math.PI / 2 - 0.12, 0, Math.PI / 2 - 0.3, 'YXZ'); mark.rotation.set(0, 0, Math.PI / 2); mark.rotation.y = 0.3;
    }
    if (mood.density > 0.45) {
      // A wall clock over the doors and a calendar on the plaster.
      s.cylinder(0.14, 0.14, 0.04, [HW * 0.72, LINTEL + 0.36, -HD + 0.0], darkWood, 24).rotation.x = Math.PI / 2;
      s.cylinder(0.115, 0.115, 0.042, [HW * 0.72, LINTEL + 0.36, -HD + 0.002], white, 24).rotation.x = Math.PI / 2;
      s.box([0.012, 0.09, 0.004], [HW * 0.72, LINTEL + 0.39, -HD + 0.026], darkWood).rotation.z = random() * 3;
      s.box([0.22, 0.3, 0.008], [HW * 0.28, LINTEL + 0.3, -HD - 0.014], white);
      s.box([0.22, 0.1, 0.01], [HW * 0.28, LINTEL + 0.4, -HD - 0.013], s.material('#c0282c'));
    }
    if (mood.cheer > 0.6) {
      // A New Year straw wreath on the lintel.
      s.ring(0.09, 0.022, [-HW + 0.0, LINTEL + 0.3, 0.2], s.material('#c9a85a', { roughness: 1 })).rotation.y = Math.PI / 2;
      s.ball([0.035, 0.03, 0.035], [-HW + 0.03, LINTEL + 0.3, 0.2], s.material('#f08a1c'), 10);
      s.box([0.004, 0.14, 0.07], [-HW + 0.02, LINTEL + 0.18, 0.2], white);
    }

    // --- Veranda and garden -----------------------------------------------------------------------
    const outside = <T extends THREE.Object3D>(mesh: T) => { mesh.castShadow = false; return mesh; };
    const EW = 0.85, GX = -HW - 0.1 - EW, GEND = -4.5, GZ0 = -3.4, GZ1 = 1.9;
    s.box([EW, 0.06, HD * 2 + 0.1], [-HW - 0.1 - EW / 2, -0.05, 0], s.material('#9a7650', { roughness: 0.6 }));
    for (let k = 1; k < 6; k++) outside(s.box([0.008, 0.002, HD * 2 + 0.1], [-HW - 0.1 - (k * EW) / 6, -0.019, 0], darkWood));
    for (const z of [-HD, 0, HD]) s.box([0.09, 0.3, 0.09], [GX + 0.06, -0.2, z], darkWood);
    const snow = new THREE.MeshStandardMaterial({ color: '#f7f9fb', roughness: 1 });
    const snowShade = new THREE.MeshStandardMaterial({ color: '#e3eaf0', roughness: 1 });
    const GY = -0.3;
    outside(s.mesh(new THREE.BoxGeometry(GX - GEND + 0.3, 0.3, GZ1 - GZ0), snow, [(GX + GEND) / 2 + 0.15, GY - 0.15, (GZ0 + GZ1) / 2]));
    for (let k = 0; k < 12 + mood.density * 10; k++) { const size = 0.25 + random() * 0.45; outside(s.ball([size, size * 0.22, size * 0.8], [mix(GX - 0.2, GEND + 0.3, random()), GY, mix(GZ0 + 0.3, GZ1 - 0.2, random())], random() < 0.5 ? snow : snowShade, 10)); }
    // Fence along the far side.
    const bambooDark = s.material('#b09a68', { roughness: 0.8 });
    outside(s.box([0.05, 1.1, GZ1 - GZ0], [GEND + 0.05, GY + 0.55, (GZ0 + GZ1) / 2], bambooDark));
    for (let z = GZ0 + 0.2; z < GZ1; z += 0.45) outside(s.box([0.07, 1.2, 0.06], [GEND + 0.07, GY + 0.6, z], cedar));
    outside(s.box([0.16, 0.07, GZ1 - GZ0], [GEND + 0.06, GY + 1.14, (GZ0 + GZ1) / 2], snow));
    // Stepping stones out from the veranda.
    const stone = s.material('#7f8480', { roughness: 0.95 });
    for (let k = 0; k < 4; k++) { const x = GX - 0.35 - k * 0.42, z = 0.5 + Math.sin(k * 1.3) * 0.22 - k * 0.12; outside(s.cylinder(0.17, 0.2, 0.06, [x, GY + 0.02, z], stone, 9)); if (k > 0) outside(s.ball([0.14, 0.03, 0.12], [x + 0.02, GY + 0.06, z], snow, 8)); }
    // The feature seen through the opening.
    const fx = -3.25, fz = (a.opening === 'two' ? 0 : home[2]) - 1.45;
    if (a.garden === 'lantern') {
      outside(s.cylinder(0.2, 0.24, 0.12, [fx, GY + 0.06, fz], stone, 6));
      outside(s.cylinder(0.075, 0.09, 0.5, [fx, GY + 0.37, fz], stone, 8));
      outside(s.cylinder(0.2, 0.1, 0.08, [fx, GY + 0.66, fz], stone, 6));
      outside(s.box([0.22, 0.2, 0.22], [fx, GY + 0.8, fz], stone));
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb04a', emissiveIntensity: mix(0.4, 2.2, mood.warmth) });
      lamps.push(flame);
      outside(s.box([0.23, 0.1, 0.1], [fx, GY + 0.8, fz], flame)); outside(s.box([0.1, 0.1, 0.23], [fx, GY + 0.8, fz], flame));
      outside(s.mesh(new THREE.ConeGeometry(0.34, 0.16, 6), stone, [fx, GY + 0.98, fz]));
      outside(s.mesh(new THREE.ConeGeometry(0.33, 0.17, 6), snow, [fx, GY + 1.03, fz]));
      outside(s.ball([0.06, 0.07, 0.06], [fx, GY + 1.13, fz], snow, 8));
    } else if (a.garden === 'pine') {
      const bark = s.material('#4a3628', { roughness: 0.9 });
      outside(s.tube([[fx + 0.1, GY, fz], [fx - 0.08, GY + 0.55, fz + 0.1], [fx + 0.12, GY + 1.05, fz - 0.05], [fx - 0.2, GY + 1.5, fz]], 0.06, bark));
      outside(s.rod([fx - 0.02, GY + 0.75, fz + 0.06], [fx - 0.6, GY + 0.9, fz + 0.4], 0.035, bark, 0.02));
      outside(s.rod([fx + 0.1, GY + 1.0, fz], [fx + 0.55, GY + 1.22, fz - 0.3], 0.03, bark, 0.02));
      const needles = s.material('#2f5a3a', { roughness: 0.95 });
      for (const [dx, dy, dz, size] of [[-0.2, 1.55, 0, 0.42], [-0.62, 0.95, 0.42, 0.36], [0.56, 1.27, -0.3, 0.34], [0.1, 1.15, 0.2, 0.3], [-0.3, 1.2, -0.3, 0.3]]) {
        outside(s.ball([size, size * 0.3, size * 0.8], [fx + dx, GY + dy, fz + dz], needles, 10));
        outside(s.ball([size * 0.92, size * 0.2, size * 0.74], [fx + dx, GY + dy + size * 0.2, fz + dz], snow, 10));
      }
    } else if (a.garden === 'persimmon') {
      const bark = s.material('#3a2c24', { roughness: 0.9 });
      const fruit = s.material('#f0781c', { roughness: 0.5, emissive: '#c0500c', emissiveIntensity: 0.25 });
      const grow = (from: [number, number, number], yaw: number, tilt: number, length: number, depth: number) => {
        const to: [number, number, number] = [from[0] + Math.cos(yaw) * Math.sin(tilt) * length, from[1] + Math.cos(tilt) * length, from[2] + Math.sin(yaw) * Math.sin(tilt) * length];
        outside(s.rod(from, to, 0.012 + depth * 0.018, bark, 0.008 + depth * 0.012));
        if (depth === 0) { if (random() < 0.55) outside(s.ball([0.05, 0.045, 0.05], [to[0], to[1] - 0.05, to[2]], fruit, 10)); return; }
        const kids = 2 + (random() < 0.4 ? 1 : 0);
        for (let k = 0; k < kids; k++) grow(to, yaw + (k - (kids - 1) / 2) * 1.5 + random() * 0.6, tilt * 0.5 + 0.35 + random() * 0.45, length * 0.68, depth - 1);
      };
      grow([fx, GY, fz], random() * 6, 0.08, 0.75, 3);
    } else if (a.garden === 'snowman') {
      outside(s.ball([0.3, 0.27, 0.3], [fx, GY + 0.25, fz], snow, 16));
      outside(s.ball([0.21, 0.2, 0.21], [fx, GY + 0.66, fz], snow, 16));
      outside(s.cylinder(0.13, 0.16, 0.16, [fx, GY + 0.9, fz], s.material('#2f6fd0', { roughness: 0.5 }), 14)).rotation.z = 0.2;
      const coal = s.material('#1a1818');
      for (const side of [-1, 1]) outside(s.ball([0.025, 0.025, 0.025], [fx + 0.17, GY + 0.72, fz + side * 0.07], coal, 6));
      outside(s.rod([fx + 0.19, GY + 0.64, fz], [fx + 0.3, GY + 0.62, fz], 0.02, s.material('#e0781c'), 0.004));
      for (const side of [-1, 1]) outside(s.rod([fx, GY + 0.4, fz + side * 0.26], [fx + 0.1, GY + 0.62, fz + side * 0.52], 0.01, s.material('#4a3628')));
    }
    // A snow-laden shrub in the near corner, visible past the end of the wall.
    for (const [dx, dz, size] of [[-0.5, 1.2, 0.34], [-1.2, 0.2, 0.28]] as const) { outside(s.ball([size, size * 0.7, size], [GX + dx, GY + size * 0.45, dz], s.material('#3a5a3a', { roughness: 1 }), 10)); outside(s.ball([size * 0.95, size * 0.45, size * 0.95], [GX + dx, GY + size * 0.8, dz], snow, 10)); }

    // Falling snow.
    const flakeCount = Math.round(a.snowfall ** 1.3 * 260);
    const flakes = flakeCount ? new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), flakeCount) : null;
    const seeds = Array.from({ length: flakeCount }, () => [mix(GEND, -HW - 0.2, random()), random() * 3, mix(GZ0, GZ1, random()), 0.6 + random() * 0.8, random() * 6]);
    const matrix = new THREE.Matrix4();
    const settle = (time: number) => {
      if (!flakes) return;
      seeds.forEach(([x, y0, z, speed, phase], k) => {
        const y = 2.7 - ((y0 + time * speed * 0.35) % 3);
        matrix.makeTranslation(x + Math.sin(time * 0.7 + phase) * 0.08, GY + y, z + Math.cos(time * 0.5 + phase) * 0.08);
        flakes.setMatrixAt(k, matrix);
      });
      flakes.instanceMatrix.needsUpdate = true;
    };
    if (flakes) { flakes.frustumCulled = false; s.root.add(flakes); settle(0); }

    // --- Placing the cast at true, floor-level scale --------------------------------------------------
    const yaw = THREE.MathUtils.degToRad(YAW), pitch = THREE.MathUtils.degToRad(PITCH);
    const key = world.keyLight!;
    const camera = world.camera as THREE.OrthographicCamera;
    key.shadow.mapSize.set(2048, 2048);
    key.intensity = mix(2.4, 3.1, lowSun);
    world.place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const [x, z] = slots[index % slots.length];
        const [reachLimit, heightLimit] = slotLimits[index % slots.length];
        const fit = Math.min(reachLimit / Math.max(item.radius, 0.02), heightLimit / Math.max(item.height, 0.02));
        // Things keep their real size; only the very small are enlarged enough to be seen on the mats.
        const lift = Math.max(1, Math.min(0.2 / Math.max(item.radius, 0.01), 0.34 / Math.max(item.height, 0.01)));
        item.holder.scale.setScalar(Math.min(fit, lift));
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = yaw * 0.55 + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      const frame = new THREE.Box3(new THREE.Vector3(-3.3, -0.35, back - 0.1), new THREE.Vector3(HW + 0.12, WALL + 0.1, HD + 0.1));
      for (const item of items) { const box = visibleBounds(item.holder); if (!box.isEmpty()) frame.union(box); }
      const centre = frame.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 60);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2();
      const corner = new THREE.Vector3();
      for (const x of [frame.min.x, frame.max.x]) for (const y of [frame.min.y, frame.max.y]) for (const z of [frame.min.z, frame.max.z]) {
        corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
      }
      const middle = seen.getCenter(new THREE.Vector2());
      const size = seen.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.5;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      // Low sun from the garden side, matching the light painted on the mats.
      const toSun = new THREE.Vector3(-Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), -Math.cos(elevation) * Math.sin(azimuth));
      key.target.position.set(0, 0.4, 0);
      key.position.copy(key.target.position).addScaledVector(toSun, 14);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -4.6;
      shadow.right = shadow.top = 4.6;
      shadow.near = 0.5; shadow.far = 30;
      shadow.updateProjectionMatrix();
    };
    const pace = mix(0.4, 1.8, mood.energy);
    const lampBase = lamps.map((lamp) => lamp.emissiveIntensity);
    world.update = (_dt: number, time: number) => {
      settle(time * pace);
      lamps.forEach((lamp, k) => { lamp.emissiveIntensity = lampBase[k] * (0.93 + 0.07 * Math.sin(time * 5.3 + k) * Math.sin(time * 2.1)); });
    };
    return world;
  },
});
