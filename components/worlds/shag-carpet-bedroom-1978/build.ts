import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

function paint(width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

const CARPETS = {
  orange: { description: 'Burnt orange shag, deep enough to lose a contact lens in.', tone: '#c4622a' },
  avocado: { description: 'Avocado green shag.', tone: '#7d8a34' },
  gold: { description: 'Harvest gold shag.', tone: '#cc9a30' },
  pink: { description: 'Hot pink shag, the full love nest.', tone: '#d0577e' },
  brown: { description: 'Chocolate brown shag that hides everything.', tone: '#6a4630' },
  white: { description: 'White shag that shows every spill and footprint.', tone: '#e2dccb' },
} as const;

export default defineWorld({
  questions: {
    walls: choice('What is on the walls?', {
      panelling: 'Dark grooved wood panelling all round.',
      wallpaper: 'Loud wallpaper of orange, brown and mustard circles.',
      mirror: 'Gold-veined mirror tiles on the wall behind the bed, panelling elsewhere.',
      flocked: 'Red flocked velvet wallpaper, like a bordello.',
    }),
    carpet: choice('What colour is the shag carpet?', Object.fromEntries(Object.entries(CARPETS).map(([key, value]) => [key, value.description])) as Record<keyof typeof CARPETS, string>),
    light: choice('What is lighting the room?', {
      tv: 'Only the blue flicker of the television.',
      lava: 'The red glow of a big lava lamp on the TV.',
      lamp: 'The warm amber swag lamp hanging on its chain.',
      dawn: 'Grey-pink dawn coming through the window.',
    }),
    dresser: choice('What is on the dresser?', {
      cologne: 'Cologne bottles, a gold chain and a comb laid out in front of the mirror.',
      fishbowl: 'A goldfish bowl with one fat goldfish.',
      trophies: 'A row of gold bowling trophies.',
      records: 'A turntable and a leaning stack of LPs.',
      clutter: 'Empty cans, a full ashtray and crumpled tissues.',
    }),
    state: choice('What state is the room in?', {
      tidy: 'Tidy, with fresh vacuum stripes in the shag and slippers squared by the dresser.',
      wrecked: 'Wrecked after a party: cans, bottles, a pizza box, streamers and a sock on the lamp.',
      smelled: 'Smelled up: the window thrown open, curtains blowing, air freshener cans everywhere and a green haze on the floor.',
      lovenest: 'Set for seduction: candles, rose petals, champagne on ice.',
    }),
    outside: choice('What is outside the window?', {
      neon: 'A motel across the street with a pink and blue neon sign.',
      suburb: 'A neighbour\'s house with one lit window and a streetlight.',
      palms: 'Palm trees and a turquoise pool glowing below.',
      city: 'Apartment towers with scattered lit windows.',
    }),
    art: choice('What hangs over the bed?', {
      panther: 'A black velvet painting of a prowling panther.',
      macrame: 'A big macramé owl on a driftwood dowel.',
      sunset: 'A velvet painting of a tropical sunset with palms.',
      sunburst: 'A gold sunburst mirror.',
      nothing: 'Nothing: a bare patch of wall.',
    }),
    tv: choice('What is on the television?', {
      static: 'Snow and static after the stations signed off.',
      bars: 'Colour bars and a test tone.',
      gameshow: 'A bright, loud game show.',
      movie: 'A late-night movie, blue and moody.',
      off: 'Switched off, the screen dark grey.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const night = a.light !== 'dawn';
    const carpetTone = new THREE.Color(CARPETS[a.carpet].tone).lerp(new THREE.Color('#8f887a'), mood.wear * 0.22);
    const W = 9.6, Dp = 7.6, backZ = -3.55, leftX = -4.65, wallH = 2.75;
    const heroX = 0.7;
    const slots: [number, number, number?, number?][] = [
      [heroX, -0.8], [-2.3, 1.3], [2.9, 0.7], [-0.8, 2.6], [1.7, 2.7], [-2.7, -1.6], [leftX + 0.3, 1.1, 0.86, 0.3],
    ];
    const background = { tv: '#97a0b4', lava: '#b9959a', lamp: '#c4a888', dawn: '#e4d6d0' }[a.light];
    const { art: s, world } = diorama(context, {
      background, floor: `#${carpetTone.getHexString()}`, width: W, depth: Dp,
      maxHeight: 2.6, radius: 2.4, pitch: 31, yaw: 27, scale: [0.35, 1.12], slots,
    });
    const root = s.root;
    const flat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options });
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P3 = [0, 0, 0], parent: THREE.Object3D = root) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const box = (size: P3, at: P3, material: THREE.Material | THREE.Material[], parent: THREE.Object3D = root) => mesh(new THREE.BoxGeometry(...size), material, at, parent);
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: P3; rot?: P3; scale?: P3; color?: THREE.ColorRepresentation }[], parent: THREE.Object3D = root) => {
      const im = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
      const o = new THREE.Object3D();
      items.forEach((item, i) => {
        o.position.set(...item.at);
        o.rotation.set(...(item.rot ?? [0, 0, 0]));
        o.scale.set(...(item.scale ?? [1, 1, 1]));
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        if (item.color !== undefined) im.setColorAt(i, new THREE.Color(item.color));
      });
      im.count = items.length;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = im.receiveShadow = true;
      parent.add(im);
      return im;
    };

    // ---- Night lighting: a dimmer sky and a cooler key, so the room's own glows carry it.
    root.traverse((node) => {
      const hemi = node as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) hemi.intensity *= night ? 0.62 : 0.95;
    });
    if (world.keyLight && night) {
      world.keyLight.intensity *= 0.55;
      world.keyLight.color.lerp(new THREE.Color(a.light === 'tv' ? '#9fb4ff' : a.light === 'lava' ? '#ff9a9a' : '#ffd0a0'), 0.5);
    }

    // ---- The shag: a fibrous painted carpet and thousands of tufts standing up out of it.
    const carpetHex = `#${carpetTone.getHexString()}`;
    const carpetMap = paint(512, 512, (ctx, w, h) => {
      ctx.fillStyle = carpetHex; ctx.fillRect(0, 0, w, h);
      if (a.state === 'tidy') for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(0, i * h / 5, w, h / 5); }
      for (let i = 0; i < 9000; i++) {
        const light = random() < 0.5;
        ctx.strokeStyle = light ? 'rgba(255,240,220,0.16)' : 'rgba(30,14,4,0.2)';
        ctx.lineWidth = 1 + random() * 1.5;
        const x = random() * w, y = random() * h, angle = random() * Math.PI * 2, length = 3 + random() * 7;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.stroke();
      }
    });
    carpetMap.repeat.set(W / 2, Dp / 2);
    const ground = world.ground as THREE.Mesh | null;
    if (ground) {
      const material = ground.material as THREE.MeshStandardMaterial;
      material.map = carpetMap; material.color.set('#ffffff'); material.roughness = 1; material.needsUpdate = true;
    }
    const tufts: { at: P3; rot: P3; scale: P3; color: THREE.ColorRepresentation }[] = [];
    const tuftCount = 2800;
    for (let i = 0; i < tuftCount; i++) {
      const x = rnd(leftX + 0.05, W / 2 - 0.05), z = rnd(backZ + 0.05, Dp / 2 - 0.05);
      const shade = carpetTone.clone().multiplyScalar(rnd(0.78, 1.18));
      tufts.push({ at: [x, 0.02, z], rot: [rnd(-0.6, 0.6), rnd(0, 6.28), rnd(-0.6, 0.6)], scale: [1, rnd(0.7, 1.4), 1], color: shade });
    }
    instanced(new THREE.ConeGeometry(0.028, 0.08, 4), flat('#ffffff', { roughness: 1 }), tufts).castShadow = false;

    // ---- Wall finishes, painted once and tiled across each face at true scale.
    const panelMap = paint(256, 512, (ctx, w, h) => {
      const tone = new THREE.Color('#5e3e26').lerp(new THREE.Color('#8a7a66'), mood.wear * 0.2);
      ctx.fillStyle = `#${tone.getHexString()}`; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        ctx.strokeStyle = random() < 0.6 ? 'rgba(22,10,2,0.18)' : 'rgba(255,214,160,0.1)';
        ctx.lineWidth = 0.6 + random() * 1.8;
        const x = random() * w, sway = (random() - 0.5) * 12;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + sway, h * 0.3, x - sway, h * 0.7, x + sway * 0.4, h); ctx.stroke();
      }
      for (const x of [0, 64, 112, 176, 224]) { ctx.fillStyle = 'rgba(14,6,0,0.75)'; ctx.fillRect(x, 0, 4, h); ctx.fillStyle = 'rgba(255,225,180,0.18)'; ctx.fillRect(x + 4, 0, 2, h); }
    });
    const wallpaperMap = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#d9a43a'; ctx.fillRect(0, 0, w, h);
      const rings = ['#6b3a1e', '#d0602a', '#efdcae', '#a8481e', '#6b3a1e'];
      for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) {
        rings.forEach((tone, i) => { ctx.fillStyle = tone; ctx.beginPath(); ctx.arc(cx, cy, 120 - i * 22, 0, Math.PI * 2); ctx.fill(); });
      }
    });
    const flockMap = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#7a1622'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4c0a12';
      const motif = (cx: number, cy: number, k: number) => {
        ctx.beginPath(); ctx.ellipse(cx, cy, 20 * k, 46 * k, 0, 0, Math.PI * 2); ctx.fill();
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + side * 30 * k, cy - 14 * k, 26 * k, 12 * k, side * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + side * 22 * k, cy + 30 * k, 16 * k, 9 * k, -side * 0.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(cx, cy - 56 * k, 10 * k, 0, Math.PI * 2); ctx.fill();
      };
      motif(w / 2, h / 2, 1.2); motif(0, 0, 1.2); motif(w, 0, 1.2); motif(0, h, 1.2); motif(w, h, 1.2);
      for (let i = 0; i < 2000; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,120,130,0.06)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(random() * w, random() * h, 2, 2); }
    });
    const mirrorTileMap = paint(256, 256, (ctx, w, h) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const g = ctx.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64);
        const base = 110 + Math.floor(random() * 50);
        g.addColorStop(0, `rgb(${base + 10},${base},${base - 18})`); g.addColorStop(0.5, `rgb(${base + 70},${base + 62},${base + 40})`); g.addColorStop(1, `rgb(${base + 20},${base + 12},${base - 6})`);
        ctx.fillStyle = g; ctx.fillRect(i * 64, j * 64, 64, 64);
        ctx.strokeStyle = 'rgba(232,180,60,0.95)'; ctx.lineWidth = 2.5;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); let x = i * 64 + random() * 64, y = j * 64; ctx.moveTo(x, y); for (let t = 0; t < 6; t++) { x += (random() - 0.4) * 16; y += 11; ctx.lineTo(x, y); } ctx.stroke(); }
      }
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(w, i * 64); ctx.stroke(); }
    });
    const finishes = {
      panelling: { map: panelMap, tile: [1.2, wallH] as const, options: { roughness: 0.55 } },
      wallpaper: { map: wallpaperMap, tile: [0.7, 0.7] as const, options: { roughness: 0.85 } },
      flocked: { map: flockMap, tile: [0.75, 0.75] as const, options: { roughness: 1 } },
      mirror: { map: mirrorTileMap, tile: [1.2, 1.2] as const, options: { roughness: 0.12, metalness: 0.3, emissive: '#3a3630', emissiveIntensity: 0.3 } },
    } as const;
    const plain = flat('#d6cdb8', { roughness: 0.95 });
    const surface = (kind: keyof typeof finishes, width: number, height: number, y0 = 0) => {
      const finish = finishes[kind];
      const map = finish.map.clone();
      map.needsUpdate = true;
      map.repeat.set(width / finish.tile[0], height / finish.tile[1]);
      map.offset.set(0, y0 / finish.tile[1]);
      return new THREE.MeshStandardMaterial({ map, ...finish.options });
    };
    const backFinish: keyof typeof finishes = a.walls;
    const sideFinish: keyof typeof finishes = a.walls === 'mirror' ? 'panelling' : a.walls;
    // Box faces: +x, -x, +y, -y, +z, -z.
    const backPiece = (x0: number, x1: number, y0: number, y1: number) =>
      box([x1 - x0, y1 - y0, 0.2], [(x0 + x1) / 2, (y0 + y1) / 2, backZ - 0.1], [plain, plain, plain, plain, surface(backFinish, x1 - x0, y1 - y0, y0), plain]);
    const winX0 = -3.65, winX1 = -1.65, winY0 = 0.95, winY1 = 2.2;
    backPiece(leftX - 0.2, winX0, 0, wallH);
    backPiece(winX1, W / 2, 0, wallH);
    backPiece(winX0, winX1, 0, winY0);
    backPiece(winX0, winX1, winY1, wallH);
    box([0.2, wallH, Dp + 0.35], [leftX - 0.1, wallH / 2, (backZ - 0.2 + Dp / 2 + 0.15) / 2], [surface(sideFinish, Dp + 0.35, wallH), plain, plain, plain, plain, plain]);
    const trimWood = flat('#3a2414', { roughness: 0.5 });
    box([W - leftX + 0.2 - 6, 0.12, 0.03], [(leftX + W / 2) / 2, 0.06, backZ + 0.015], trimWood);
    box([0.03, 0.12, Dp - 0.1], [leftX + 0.015, 0.06, (backZ + Dp / 2) / 2], trimWood);
    box([W / 2 - leftX + 0.2, 0.08, 0.05], [(leftX + W / 2) / 2, wallH - 0.04, backZ + 0.025], trimWood);
    box([0.05, 0.08, Dp + 0.3], [leftX + 0.025, wallH - 0.04, (backZ + Dp / 2) / 2], trimWood);
    box([0.24, wallH, 0.24], [leftX - 0.08, wallH / 2, backZ - 0.08], trimWood);

    // ---- The window: the view, an aluminium slider, a sill and half-drawn drapes.
    const winW = winX1 - winX0, winH = winY1 - winY0, winX = (winX0 + winX1) / 2, winY = (winY0 + winY1) / 2;
    const view = paint(512, 384, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      const stops = night ? ['#1e2448', '#3a3466', '#6a4a72'] : ['#8aa0d0', '#d8b4c4', '#f6c8a0'];
      stops.forEach((tone, i) => sky.addColorStop(i / 2, tone));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      const dark = night ? '#141626' : '#5a5068';
      if (night) { ctx.fillStyle = '#f4f0d8'; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.18, 18, 0, 7); ctx.fill(); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,240,0.7)'; ctx.fillRect(random() * w, random() * h * 0.4, 2, 2); } }
      const glow = (x: number, y: number, r: number, colour: string) => { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
      if (a.outside === 'neon') {
        ctx.fillStyle = dark; ctx.fillRect(0, h * 0.45, w, h * 0.55);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = night ? (random() < 0.6 ? '#f2c870' : '#2a2c40') : '#8a8090'; ctx.fillRect(30 + i * 80, h * 0.62, 40, 50); }
        ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff4aa8'; ctx.shadowBlur = night ? 24 : 6; ctx.fillStyle = night ? '#ff8ac8' : '#c8608a';
        ctx.fillText('MOTEL', w * 0.5, h * 0.4);
        ctx.shadowColor = '#4ae8ff'; ctx.fillStyle = night ? '#8af4ff' : '#6aa8b8'; ctx.font = 'bold 34px sans-serif';
        ctx.fillText('VACANCY', w * 0.5, h * 0.52);
        ctx.shadowBlur = 0;
      } else if (a.outside === 'suburb') {
        ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(40, h * 0.62); ctx.lineTo(200, h * 0.36); ctx.lineTo(360, h * 0.62); ctx.lineTo(360, h); ctx.lineTo(40, h); ctx.fill();
        ctx.fillStyle = night ? '#f6d278' : '#a89aa8'; ctx.fillRect(150, h * 0.68, 60, 46);
        if (night) glow(180, h * 0.73, 70, 'rgba(255,214,120,0.35)');
        ctx.fillStyle = dark; ctx.fillRect(w * 0.82, h * 0.3, 6, h * 0.7); ctx.fillRect(w * 0.82 - 30, h * 0.3, 36, 6);
        if (night) glow(w * 0.82 - 26, h * 0.33, 80, 'rgba(255,224,140,0.8)');
        for (let x = 0; x < w; x += 18) { ctx.fillStyle = dark; ctx.fillRect(x, h * 0.86, 12, h * 0.14); }
      } else if (a.outside === 'palms') {
        const pool = ctx.createLinearGradient(0, h * 0.8, 0, h); pool.addColorStop(0, '#5ae8e0'); pool.addColorStop(1, '#1aa8b8');
        ctx.fillStyle = dark; ctx.fillRect(0, h * 0.74, w, h * 0.26);
        ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(w * 0.45, h * 0.9, w * 0.34, h * 0.08, 0, 0, 7); ctx.fill();
        if (night) glow(w * 0.45, h * 0.9, 160, 'rgba(90,232,224,0.3)');
        for (const [x, lean, tall] of [[90, 0.2, 0.62], [380, -0.15, 0.7], [450, 0.1, 0.5]] as const) {
          const top = [x + lean * 160, h * (0.78 - tall)];
          ctx.strokeStyle = dark; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, h * 0.8); ctx.quadraticCurveTo(x + lean * 40, h * 0.5, top[0], top[1]); ctx.stroke();
          ctx.lineWidth = 7;
          for (let f = 0; f < 7; f++) { const angle = -Math.PI + f * Math.PI / 6 + 0.2; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo(top[0] + Math.cos(angle) * 40, top[1] + Math.sin(angle) * 30 - 10, top[0] + Math.cos(angle) * 70, top[1] + Math.sin(angle) * 20 + 30); ctx.stroke(); }
        }
      } else {
        for (let i = 0; i < 7; i++) {
          const bx = i * 76 - 10 + random() * 20, bw = 50 + random() * 30, top = h * (0.15 + random() * 0.35);
          ctx.fillStyle = dark; ctx.fillRect(bx, top, bw, h - top);
          for (let y = top + 10; y < h; y += 16) for (let x = bx + 6; x < bx + bw - 8; x += 12) if (random() < (night ? 0.35 : 0.1)) { ctx.fillStyle = night ? pick(['#f6d278', '#ffe8a8', '#a8d0ff']) : '#c8c0d0'; ctx.fillRect(x, y, 6, 8); }
        }
      }
    }, false);
    const viewPlane = mesh(new THREE.PlaneGeometry(winW + 0.9, winH + 0.6), new THREE.MeshBasicMaterial({ map: view }), [winX, winY + 0.05, backZ - 0.3]);
    viewPlane.castShadow = viewPlane.receiveShadow = false;
    const alu = flat('#c2c4c4', { metalness: 0.6, roughness: 0.35 });
    for (const y of [winY0 + 0.025, winY1 - 0.025]) box([winW, 0.05, 0.1], [winX, y, backZ - 0.1], alu);
    for (const x of [winX0 + 0.025, winX1 - 0.025]) box([0.05, winH, 0.1], [x, winY, backZ - 0.1], alu);
    const glass = new THREE.MeshStandardMaterial({ color: '#d8e8f0', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false });
    const open = a.state === 'smelled';
    const sash = (x: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(x, winY, z);
      root.add(group);
      const sw = winW / 2 + 0.03;
      for (const side of [-1, 1]) box([0.04, winH - 0.06, 0.035], [side * (sw / 2 - 0.02), 0, 0], alu, group);
      for (const y of [-1, 1]) box([sw, 0.04, 0.035], [0, y * (winH / 2 - 0.05), 0], alu, group);
      const pane = mesh(new THREE.PlaneGeometry(sw - 0.06, winH - 0.12), glass, [0, 0, 0], group);
      pane.castShadow = false;
      return group;
    };
    sash(winX - winW / 4, backZ - 0.13);
    sash(open ? winX - winW / 4 + 0.03 : winX + winW / 4, backZ - 0.07);
    box([winW + 0.24, 0.05, 0.2], [winX, winY0 - 0.02, backZ + 0.08], trimWood);

    // Drapes: one pulled back, one drawn halfway across. They billow when the window is open.
    const drapeTone = pick(['#c8702a', '#9a7a2a', '#6a7a2a', '#a8304a', '#d8b878']);
    const drapeMap = paint(128, 256, (ctx, w, h) => {
      ctx.fillStyle = drapeTone; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        const x = (i % 2) * w / 2 + w / 4, y = Math.floor(i / 2) * h / 3 + h / 6;
        ctx.fillStyle = 'rgba(255,236,190,0.45)';
        for (let p = 0; p < 6; p++) { const angle = p * Math.PI / 3; ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, 12, 7, angle, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(80,40,10,0.55)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
      }
    });
    drapeMap.repeat.set(2, 3);
    const drapeGlow = a.light === 'dawn' ? '#ffd6c8' : a.outside === 'neon' ? '#ff6ab8' : '#203060';
    const drapeMaterial = new THREE.MeshStandardMaterial({ map: drapeMap, roughness: 1, side: THREE.DoubleSide, emissive: drapeGlow, emissiveIntensity: a.light === 'dawn' ? 0.25 : 0.08 });
    const rodY = winY1 + 0.22, rodZ = backZ + 0.14, dropH = rodY - 0.06;
    const drapes: { geometry: THREE.PlaneGeometry; base: Float32Array; width: number; phase: number }[] = [];
    const drape = (cx: number, width: number, folds: number) => {
      const geometry = new THREE.PlaneGeometry(width, dropH, Math.max(10, folds * 6), 12);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / width + 0.5) * folds * Math.PI * 2) * 0.05);
      geometry.computeVertexNormals();
      mesh(geometry, drapeMaterial, [cx, dropH / 2 + 0.04, rodZ]);
      drapes.push({ geometry, base: Float32Array.from(p.array as Float32Array), width, phase: random() * 6 });
    };
    drape(winX0 - 0.15, 0.55, 5);
    drape(winX1 + 0.3 - 0.75, 1.5, 9);
    const brass = flat('#c9a04a', { metalness: 0.8, roughness: 0.3 });
    const rod = mesh(new THREE.CylinderGeometry(0.018, 0.018, winW + 1.0, 10), brass, [winX, rodY, rodZ]);
    rod.rotation.z = Math.PI / 2;
    box([winW + 1.1, 0.22, 0.08], [winX, rodY + 0.06, rodZ + 0.06], [plain, plain, plain, plain, new THREE.MeshStandardMaterial({ map: drapeMap, roughness: 1 }), plain]);

    // ---- The built-in dresser along the left wall, with a tilt mirror between turned posts.
    const woodMap = paint(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#5a361c'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 50; i++) { ctx.strokeStyle = random() < 0.6 ? 'rgba(30,14,4,0.3)' : 'rgba(255,200,140,0.12)'; ctx.lineWidth = 1 + random() * 2; const y = random() * h; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 4); ctx.stroke(); }
    });
    const walnut = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.45 });
    const dz0 = -1.95, dz1 = 1.6, dLen = dz1 - dz0, dMid = (dz0 + dz1) / 2, dDepth = 0.55, dTop = 0.84, dFront = leftX + dDepth;
    box([dDepth - 0.04, 0.08, dLen - 0.06], [leftX + (dDepth - 0.04) / 2, 0.04, dMid], trimWood);
    box([dDepth, dTop - 0.12, dLen], [leftX + dDepth / 2, 0.08 + (dTop - 0.12) / 2, dMid], walnut);
    box([dDepth + 0.05, 0.04, dLen + 0.06], [leftX + (dDepth + 0.05) / 2, dTop - 0.02, dMid], walnut);
    const fronts: { at: P3; scale: P3 }[] = [], pulls: { at: P3; rot: P3 }[] = [];
    const cols = 4, colW = dLen / cols;
    for (let c = 0; c < cols; c++) for (let r = 0; r < 3; r++) {
      const z = dz0 + colW * (c + 0.5), y = 0.12 + (r + 0.5) * (dTop - 0.16) / 3;
      fronts.push({ at: [dFront + 0.01, y, z], scale: [1, 1, 1] });
      pulls.push({ at: [dFront + 0.03, y, z], rot: [0, Math.PI / 2, 0] });
    }
    instanced(new THREE.BoxGeometry(0.02, (dTop - 0.16) / 3 - 0.03, colW - 0.04), new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.4, color: '#e8d8c8' }), fronts);
    instanced(new THREE.TorusGeometry(0.03, 0.007, 6, 14), brass, pulls);
    // The tilt mirror on its posts.
    const mirrorZ = dMid - 0.3, mirrorX = leftX + 0.28, postH = 1.0;
    for (const side of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.028, 0.035, postH, 12), walnut, [mirrorX, dTop + postH / 2, mirrorZ + side * 0.52]);
      mesh(new THREE.SphereGeometry(0.045, 12, 8), brass, [mirrorX, dTop + postH + 0.03, mirrorZ + side * 0.52]);
    }
    mesh(new THREE.BoxGeometry(0.2, 0.05, 1.14), walnut, [mirrorX, dTop + 0.025, mirrorZ]);
    const tilt = new THREE.Group();
    tilt.position.set(mirrorX, dTop + 0.6, mirrorZ);
    tilt.rotation.z = rnd(0.05, 0.18);
    root.add(tilt);
    const mirrorMap = paint(128, 192, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, night ? '#4a5266' : '#9aa6b8'); g.addColorStop(0.62, night ? '#6a7084' : '#c8ccd8'); g.addColorStop(0.7, carpetHex); g.addColorStop(1, carpetHex);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (const [x, k] of [[0.15, 0.1], [0.32, 0.05], [0.6, 0.12]]) { ctx.beginPath(); ctx.moveTo(x * w, 0); ctx.lineTo((x + k) * w, 0); ctx.lineTo((x + k - 0.4) * w, h); ctx.lineTo((x - 0.4) * w, h); ctx.fill(); }
    }, false);
    const glassFace = mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshStandardMaterial({ map: mirrorMap, roughness: 0.1, metalness: 0.2, emissive: '#30343c', emissiveIntensity: 0.4 }), [0.012, 0, 0], tilt);
    glassFace.rotation.y = Math.PI / 2;
    glassFace.scale.set(1.15, 1.35, 1);
    const frame = mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 40), walnut, [0, 0, 0], tilt);
    frame.rotation.y = Math.PI / 2;
    frame.scale.set(1.15, 1.35, 1);
    mesh(new THREE.BoxGeometry(0.04, 0.4 * 2.7, 0.04), walnut, [-0.04, 0, 0], tilt).scale.set(1, 1, 1);
    for (const side of [-1, 1]) { const pin = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), brass, [0, 0, side * 0.49], tilt); pin.rotation.x = Math.PI / 2; }

    // What lies on the dresser, at the back end; the front end is a standing spot.
    const topY = dTop, itemZ = dz0 + 0.45, itemX = leftX + 0.28;
    const fishes: THREE.Object3D[] = [];
    if (a.dresser === 'cologne') {
      for (let i = 0; i < 4; i++) {
        const tone = ['#c8862a', '#3a6ab8', '#2a8a5a', '#a83a5a'][i];
        const bottle = new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.045, 0.02], [0.045, 0.1 + i * 0.02], [0.02, 0.13 + i * 0.02], [0.012, 0.15 + i * 0.02], [0, 0.15 + i * 0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
        const z = itemZ - 0.25 + i * 0.13;
        mesh(bottle, flat(tone, { transparent: true, opacity: 0.75, roughness: 0.1 }), [itemX - 0.05 + (i % 2) * 0.1, topY, z]);
        mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), brass, [itemX - 0.05 + (i % 2) * 0.1, topY + 0.17 + i * 0.02, z]);
      }
      const chain = mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 30), brass, [itemX + 0.08, topY + 0.01, itemZ + 0.35]);
      chain.rotation.x = Math.PI / 2; chain.scale.set(1, 0.7, 1);
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 16), brass, [itemX + 0.08, topY + 0.01, itemZ + 0.45]);
      box([0.04, 0.012, 0.2], [itemX - 0.1, topY + 0.006, itemZ + 0.4], flat('#1a1a1a', { roughness: 0.4 })).rotation.y = 0.3;
    } else if (a.dresser === 'fishbowl') {
      const bowlR = 0.17;
      mesh(new THREE.SphereGeometry(bowlR, 24, 16), new THREE.MeshStandardMaterial({ color: '#e0f0f4', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }), [itemX, topY + bowlR * 0.92, itemZ]);
      mesh(new THREE.SphereGeometry(bowlR * 0.95, 24, 16, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.68), flat('#5ab8d0', { transparent: true, opacity: 0.5, roughness: 0.1 }), [itemX, topY + bowlR * 0.92, itemZ]);
      mesh(new THREE.CylinderGeometry(bowlR * 0.6, bowlR * 0.6, 0.03, 20), flat('#d8c8a0', { roughness: 1 }), [itemX, topY + 0.03, itemZ]);
      const fish = new THREE.Group();
      fish.position.set(itemX, topY + bowlR * 0.85, itemZ);
      root.add(fish);
      const body = mesh(new THREE.SphereGeometry(0.045, 14, 10), flat('#ff7a1a', { roughness: 0.4, emissive: '#ff5a00', emissiveIntensity: 0.25 }), [0.06, 0, 0], fish);
      body.scale.set(0.7, 1, 1.4);
      const tail = mesh(new THREE.ConeGeometry(0.035, 0.05, 8), body.material as THREE.Material, [0.06, 0, -0.07], fish);
      tail.rotation.x = -Math.PI / 2;
      fishes.push(fish);
    } else if (a.dresser === 'trophies') {
      const gold = flat('#e0b63c', { metalness: 0.85, roughness: 0.25 });
      for (let i = 0; i < 3; i++) {
        const z = itemZ - 0.3 + i * 0.3, tall = 0.18 + i * 0.08 + rnd(0, 0.05);
        box([0.14, 0.06, 0.14], [itemX, topY + 0.03, z], flat('#ece6dc', { roughness: 0.25 }));
        mesh(new THREE.CylinderGeometry(0.02, 0.03, tall, 10), flat(['#b3202a', '#1f4a8a', '#2f7a4a'][i], { metalness: 0.5, roughness: 0.3 }), [itemX, topY + 0.06 + tall / 2, z]);
        mesh(new THREE.SphereGeometry(0.05, 14, 10), gold, [itemX, topY + 0.06 + tall + 0.05, z]);
        mesh(new THREE.CapsuleGeometry(0.018, 0.06, 3, 8), gold, [itemX, topY + 0.06 + tall + 0.12, z]);
      }
    } else if (a.dresser === 'records') {
      box([0.42, 0.1, 0.38], [itemX + 0.02, topY + 0.05, itemZ], walnut);
      mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 28), flat('#151515', { roughness: 0.3 }), [itemX + 0.02, topY + 0.106, itemZ - 0.03]);
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 16), flat(pick(['#e83a2a', '#f0c82a', '#3a8ae8'])), [itemX + 0.02, topY + 0.108, itemZ - 0.03]);
      for (let i = 0; i < 6; i++) {
        const sleeve = box([0.31, 0.31, 0.008], [itemX + 0.04, topY + 0.155, itemZ + 0.42 + i * 0.012], flat(pick(['#e84a2a', '#2a5ab8', '#f0d040', '#1a1a1a', '#e8e0d0', '#8a2a8a']), { roughness: 0.6 }));
        sleeve.rotation.x = -0.3 - i * 0.03; sleeve.rotation.y = Math.PI / 2;
      }
    } else {
      const cans = Array.from({ length: 5 }, (_, i) => ({ at: [itemX + rnd(-0.12, 0.12), topY + 0.06, itemZ - 0.35 + i * 0.16] as P3, color: pick(['#c82a2a', '#e8c83a', '#d8d8d8', '#2a5ab8']) }));
      instanced(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), flat('#ffffff', { metalness: 0.5, roughness: 0.35 }), cans);
      mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.03, 18), flat('#c8d8e0', { transparent: true, opacity: 0.6, roughness: 0.1 }), [itemX, topY + 0.015, itemZ + 0.5]);
      instanced(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), flat('#e8e0c8'), Array.from({ length: 7 }, () => ({ at: [itemX + rnd(-0.04, 0.04), topY + 0.035, itemZ + 0.5 + rnd(-0.04, 0.04)] as P3, rot: [rnd(-1.4, 1.4), rnd(0, 3), 0] as P3 })));
      instanced(new THREE.IcosahedronGeometry(0.035, 0), flat('#f4f2ee', { roughness: 1 }), Array.from({ length: 6 }, () => ({ at: [itemX + rnd(-0.15, 0.15), topY + 0.03, itemZ + 0.75 + rnd(-0.12, 0.12)] as P3, rot: [rnd(0, 3), rnd(0, 3), 0] as P3 })));
    }

    // ---- The swag lamp: a brass bracket on the back wall, a chain down to the globe, and the
    // chain swagged along the wall to the corner and down to the outlet.
    const lampX = -1.0, armTip = new THREE.Vector3(lampX, 2.5, backZ + 0.62);
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(lampX, 2.38, backZ + 0.02), new THREE.Vector3(lampX, 2.52, backZ + 0.25), armTip]), 12, 0.018, 8), brass);
    box([0.12, 0.18, 0.02], [lampX, 2.38, backZ + 0.01], brass);
    const swing = new THREE.Group();
    swing.position.copy(armTip);
    root.add(swing);
    const linkGeometry = new THREE.TorusGeometry(0.016, 0.0045, 5, 10);
    const chainLinks = (points: THREE.Vector3[], spacing: number) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const count = Math.max(2, Math.floor(curve.getLength() / spacing));
      return Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1), at = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        const e = new THREE.Euler().setFromQuaternion(q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i % 2 ? Math.PI / 2 : 0)));
        return { at: at.toArray() as P3, rot: [e.x, e.y, e.z] as P3, scale: [1, 1.5, 1] as P3 };
      });
    };
    const drop = 0.62;
    instanced(linkGeometry, brass, chainLinks([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -drop / 2, 0), new THREE.Vector3(0, -drop, 0)], 0.028), swing);
    const corner = new THREE.Vector3(leftX + 0.08, 2.55, backZ + 0.06);
    const swag: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; swag.push(new THREE.Vector3(mix(armTip.x, corner.x, t), mix(armTip.y, corner.y, t) - Math.sin(Math.PI * t) * 0.42, mix(armTip.z, corner.z, t) - Math.sin(Math.PI * t) * 0.3)); }
    instanced(linkGeometry, brass, [...chainLinks(swag, 0.03), ...chainLinks([corner, new THREE.Vector3(leftX + 0.06, 1.2, backZ + 0.06), new THREE.Vector3(leftX + 0.06, 0.32, backZ + 0.06)], 0.03)]);
    box([0.07, 0.11, 0.015], [leftX + 0.06, 0.28, backZ + 0.01], flat('#e8e0cc'));
    // The globe itself: amber diamond glass, or a red fringed drum.
    const lampLit = a.light === 'lamp' ? 1.6 : a.light === 'dawn' ? 0 : 0.25;
    const lampStyle = pick(['globe', 'globe', 'fringe'] as const);
    const shade = new THREE.Group();
    shade.position.set(0, -drop - 0.02, 0);
    swing.add(shade);
    mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.07, 14), brass, [0, -0.03, 0], shade);
    const lampGlow = lampStyle === 'globe' ? '#ffa040' : '#ff5a3a';
    if (lampStyle === 'globe') {
      const diamonds = paint(128, 64, (ctx, w, h) => {
        ctx.fillStyle = '#e88a2a'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,50,10,0.7)'; ctx.lineWidth = 2;
        for (let i = -h; i < w + h; i += 12) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke(); }
      });
      mesh(new THREE.SphereGeometry(0.25, 24, 16), new THREE.MeshStandardMaterial({ map: diamonds, emissiveMap: diamonds, emissive: '#ffffff', emissiveIntensity: 0.15 + lampLit * 0.6, roughness: 0.3 }), [0, -0.27, 0], shade);
      mesh(new THREE.SphereGeometry(0.045, 10, 8), brass, [0, -0.54, 0], shade);
    } else {
      mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.26, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#b01e2a', emissive: '#ff4a2a', emissiveIntensity: 0.1 + lampLit * 0.5, roughness: 0.9, side: THREE.DoubleSide }), [0, -0.2, 0], shade);
      const fringe = Array.from({ length: 36 }, (_, i) => ({ at: [Math.cos(i / 36 * Math.PI * 2) * 0.24, -0.38, Math.sin(i / 36 * Math.PI * 2) * 0.24] as P3 }));
      instanced(new THREE.CylinderGeometry(0.006, 0.006, 0.11, 4), flat('#e8c060'), fringe, shade);
      mesh(new THREE.SphereGeometry(0.07, 12, 8), flat('#fff0c0', { emissive: '#ffd080', emissiveIntensity: 0.2 + lampLit }), [0, -0.24, 0], shade);
    }
    if (lampLit > 0.5) {
      const warm = new THREE.PointLight(lampGlow, 14 * mix(0.8, 1.2, mood.cheer), 9, 1.6);
      warm.position.set(0, -drop - 0.3, 0.1);
      swing.add(warm);
    }

    // ---- The television: a wood-grain console in the far corner, turned to the bed and the room.
    const tvGroup = new THREE.Group();
    tvGroup.position.set(3.75, 0, backZ + 0.75);
    tvGroup.rotation.y = -0.62;
    root.add(tvGroup);
    for (const x of [-0.5, 0.5]) for (const z of [-0.2, 0.2]) mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.22, 8), trimWood, [x, 0.11, z], tvGroup);
    box([1.2, 0.66, 0.55], [0, 0.22 + 0.33, 0], walnut, tvGroup);
    box([0.66, 0.52, 0.02], [-0.2, 0.55, 0.28], flat('#1c1a18', { roughness: 0.5 }), tvGroup);
    const screenMap = paint(256, 192, (ctx, w, h) => {
      if (a.tv === 'bars') {
        const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
        bars.forEach((tone, i) => { ctx.fillStyle = tone; ctx.fillRect(i * w / 7, 0, w / 7 + 1, h * 0.7); });
        for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#131313' : bars[6 - i]; ctx.fillRect(i * w / 7, h * 0.7, w / 7 + 1, h * 0.08); }
        ctx.fillStyle = '#0a0a2a'; ctx.fillRect(0, h * 0.78, w * 0.3, h * 0.22); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(w * 0.3, h * 0.78, w * 0.25, h * 0.22); ctx.fillStyle = '#1a0a3a'; ctx.fillRect(w * 0.55, h * 0.78, w * 0.45, h * 0.22);
      } else if (a.tv === 'gameshow') {
        const g = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.4, w * 0.7); g.addColorStop(0, '#ff6ab0'); g.addColorStop(1, '#5a1a8a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? '#fff4a0' : '#ffffff'; ctx.beginPath(); ctx.arc(10 + i * 10.5, 12, 4, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(w / 2, h * 0.55, 54, 0, 7); ctx.fill();
        for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#e83a2a', '#2a8ae8', '#2ae86a', '#e8e82a'][i % 4]; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.55); ctx.arc(w / 2, h * 0.55, 50, i * Math.PI / 6, (i + 1) * Math.PI / 6); ctx.fill(); }
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$$$ WIN $$$', w / 2, h * 0.95);
      } else if (a.tv === 'movie') {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a3a7a'); g.addColorStop(1, '#4a7ac8');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.28, 22, 0, 7); ctx.fill();
        ctx.fillStyle = '#0a1430';
        for (const x of [w * 0.38, w * 0.52]) { ctx.beginPath(); ctx.arc(x, h * 0.48, 16, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, h * 0.85, 26, 50, 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, 18); ctx.fillRect(0, h - 18, w, 18);
      } else if (a.tv === 'static' || a.light === 'tv') {
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = Math.floor(random() * 255); ctx.fillStyle = `rgb(${v},${v},${Math.min(255, v + 20)})`; ctx.fillRect(x, y, 2, 2); }
      } else {
        const g = ctx.createRadialGradient(w * 0.35, h * 0.3, 4, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#6a7468'); g.addColorStop(1, '#262c28');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    });
    const tvOn = a.tv !== 'off' || a.light === 'tv';
    const tvPower = (a.light === 'tv' ? 1.5 : 0.9) * (tvOn ? 1 : 0);
    const screenMaterial = new THREE.MeshStandardMaterial({ map: screenMap, emissiveMap: tvOn ? screenMap : null, emissive: tvOn ? '#ffffff' : '#000000', emissiveIntensity: tvPower, roughness: 0.25 });
    const screen = mesh(new THREE.PlaneGeometry(0.56, 0.42), screenMaterial, [-0.2, 0.56, 0.292], tvGroup);
    screen.castShadow = false;
    const grille = paint(64, 64, (ctx, w, h) => { ctx.fillStyle = '#3a2a1e'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(200,160,100,0.35)'; for (let y = 0; y < h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } });
    box([0.36, 0.5, 0.02], [0.37, 0.55, 0.28], [plain, plain, plain, plain, new THREE.MeshStandardMaterial({ map: grille, roughness: 1 }), plain], tvGroup);
    for (const y of [0.74, 0.66]) { const knob = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 14), flat('#d8d0c0', { metalness: 0.4, roughness: 0.3 }), [0.37, y + 0.02, 0.3], tvGroup); knob.rotation.x = Math.PI / 2; knob.scale.setScalar(0.8); }
    mesh(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat('#2a2a2a', { roughness: 0.4 }), [0.25, 0.88, -0.05], tvGroup);
    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.7, 6), alu, [0.25 + side * 0.17, 0.88 + 0.33, -0.05], tvGroup);
      ear.rotation.z = -side * 0.5;
    }
    if (tvOn) {
      const tint = { static: '#c8d8ff', bars: '#e8e8ff', gameshow: '#ff9ad0', movie: '#7aa8ff', off: '#c8d8ff' }[a.tv];
      const spill = new THREE.PointLight(tint, (a.light === 'tv' ? 11 : 4) * mix(0.85, 1.15, mood.cheer), 9, 1.5);
      spill.position.set(-0.2, 0.8, 0.9);
      tvGroup.add(spill);
    }
    // A lava lamp on the set when that is the light.
    const blobs: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    if (a.light === 'lava') {
      const lava = new THREE.Group();
      lava.position.set(-0.3, 0.88, 0);
      tvGroup.add(lava);
      mesh(new THREE.LatheGeometry([[0, 0], [0.11, 0], [0.07, 0.05], [0.055, 0.17], [0.075, 0.18], [0, 0.18]].map(([x, y]) => new THREE.Vector2(x, y)), 20), brass, [0, 0, 0], lava);
      mesh(new THREE.LatheGeometry([[0.07, 0], [0.1, 0.12], [0.075, 0.38], [0.04, 0.48], [0, 0.48]].map(([x, y]) => new THREE.Vector2(x, y)), 20), new THREE.MeshStandardMaterial({ color: '#ff6a3a', emissive: '#ff3a1a', emissiveIntensity: 0.9, transparent: true, opacity: 0.78 }), [0, 0.18, 0], lava);
      mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 14), brass, [0, 0.68, 0], lava);
      const goo = flat('#ff2a0a', { emissive: '#ff2a0a', emissiveIntensity: 1.4 });
      for (let i = 0; i < 4; i++) { const blob = mesh(new THREE.SphereGeometry(0.035 + i * 0.006, 12, 8), goo, [rnd(-0.02, 0.02), 0.3 + i * 0.08, rnd(-0.02, 0.02)], lava); blob.scale.y = 1.4; blobs.push({ mesh: blob, base: 0.3 + i * 0.08, phase: random() * 6 }); }
      const red = new THREE.PointLight('#ff4a2a', 12 * mix(0.85, 1.15, mood.cheer), 9, 1.5);
      red.position.set(0, 0.5, 0.3);
      lava.add(red);
    }
    if (a.light === 'dawn') {
      const dawn = new THREE.PointLight('#ffc8b0', 10, 10, 1.4);
      dawn.position.set(winX, winY, backZ + 0.8);
      root.add(dawn);
    }

    // ---- What hangs over the bed.
    const artY = 2.12, artZ = backZ + 0.02;
    const framedArt = (map: THREE.Texture, w: number, h: number, frameTone: THREE.Material) => {
      box([w + 0.14, h + 0.14, 0.05], [heroX, artY, artZ + 0.025], frameTone);
      mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 1, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: night ? 0.18 : 0.05 }), [heroX, artY, artZ + 0.052]);
    };
    const gilt = flat('#b8923a', { metalness: 0.6, roughness: 0.35 });
    if (a.art === 'panther') {
      const panther = paint(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#4a2a8a';
        ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.55, 70, 20, -0.05, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w * 0.78, h * 0.44, 20, 15, 0.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(w * 0.82, h * 0.34); ctx.lineTo(w * 0.8, h * 0.26); ctx.lineTo(w * 0.77, h * 0.34); ctx.fill();
        ctx.lineWidth = 9; ctx.strokeStyle = '#4a2a8a'; ctx.lineCap = 'round';
        for (const [x0, x1] of [[0.34, 0.3], [0.42, 0.44], [0.6, 0.62], [0.68, 0.72]]) { ctx.beginPath(); ctx.moveTo(w * x0, h * 0.6); ctx.lineTo(w * x1, h * 0.9); ctx.stroke(); }
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(w * 0.24, h * 0.55); ctx.quadraticCurveTo(w * 0.08, h * 0.5, w * 0.12, h * 0.25); ctx.stroke();
        ctx.fillStyle = '#7ae8ff'; ctx.beginPath(); ctx.arc(w * 0.81, h * 0.42, 2.5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(140,100,220,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.53, 66, 14, -0.05, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }, false);
      framedArt(panther, 1.3, 0.65, gilt);
    } else if (a.art === 'sunset') {
      const sunset = paint(256, 128, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1048'); g.addColorStop(0.45, '#e8406a'); g.addColorStop(0.62, '#ffb030'); g.addColorStop(0.64, '#3a1838'); g.addColorStop(1, '#14081c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.62, 26, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#0a0410'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(w * 0.15, h); ctx.quadraticCurveTo(w * 0.2, h * 0.6, w * 0.24, h * 0.3); ctx.stroke();
        ctx.fillStyle = '#0a0410';
        for (let f = 0; f < 6; f++) { const angle = -Math.PI + f * 0.55; ctx.beginPath(); ctx.ellipse(w * 0.24 + Math.cos(angle) * 18, h * 0.3 + Math.sin(angle) * 8 + 6, 22, 5, angle, 0, 7); ctx.fill(); }
      }, false);
      framedArt(sunset, 1.3, 0.65, gilt);
    } else if (a.art === 'macrame') {
      const owl = paint(128, 192, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#d8c09a'; ctx.lineWidth = 3;
        for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 8, 4); ctx.quadraticCurveTo(w / 2 + (i - 7) * 4, h * 0.45, w / 2 + (i - 7) * 5, h * 0.75); ctx.lineTo(w / 2 + (i - 7) * 5.5, h - 4); ctx.stroke(); }
        ctx.fillStyle = '#c8aa80';
        for (let r = 0; r < 7; r++) for (let c = 0; c < 6 - Math.abs(r - 3); c++) { ctx.beginPath(); ctx.arc(w / 2 + (c - (5 - Math.abs(r - 3)) / 2) * 13, 50 + r * 14, 5, 0, 7); ctx.fill(); }
        for (const side of [-1, 1]) { ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2 + side * 17, 38, 12, 0, 7); ctx.stroke(); ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(w / 2 + side * 17, 38, 4, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.moveTo(w / 2 - 5, 48); ctx.lineTo(w / 2 + 5, 48); ctx.lineTo(w / 2, 58); ctx.fill();
      }, false);
      const hanging = mesh(new THREE.PlaneGeometry(0.62, 0.95), new THREE.MeshStandardMaterial({ map: owl, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide }), [heroX, artY - 0.1, artZ + 0.04]);
      hanging.castShadow = true;
      const dowel = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 10), flat('#8a6a48', { roughness: 0.9 }), [heroX, artY + 0.38, artZ + 0.05]);
      dowel.rotation.z = Math.PI / 2;
    } else if (a.art === 'sunburst') {
      const disc = mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshStandardMaterial({ map: mirrorMap, roughness: 0.1, metalness: 0.2, emissive: '#30343c', emissiveIntensity: 0.4 }), [heroX, artY, artZ + 0.05]);
      void disc;
      mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 32), gilt, [heroX, artY, artZ + 0.045]);
      const rays = Array.from({ length: 24 }, (_, i) => { const angle = i / 24 * Math.PI * 2, length = i % 2 ? 0.32 : 0.48; return { at: [heroX + Math.cos(angle) * (0.27 + length / 2), artY + Math.sin(angle) * (0.27 + length / 2), artZ + 0.03] as P3, rot: [0, 0, angle - Math.PI / 2] as P3, scale: [1, length, 1] as P3 }; });
      instanced(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), gilt, rays);
    }

    // ---- The state of the room: tidy, wrecked, smelled up or set for seduction.
    const clutter = mix(0.6, 1.4, mood.density);
    const floorSpot = () => {
      for (let tries = 0; tries < 12; tries++) {
        const x = rnd(leftX + 0.9, W / 2 - 0.4), z = rnd(backZ + 0.6, Dp / 2 - 0.3);
        if (Math.abs(x - heroX) < 1.6 && z < 0.6) continue;
        if (x > W / 2 - 1.7 && z < backZ + 1.6) continue;
        return [x, z] as const;
      }
      return [rnd(-2.2, 2.2), rnd(2.0, 3.4)] as const;
    };
    const hazes: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
    const stink: THREE.Mesh[] = [];
    let sock: THREE.Object3D | null = null;
    const flames: THREE.InstancedMesh[] = [];
    if (a.state === 'tidy') {
      for (const side of [-1, 1]) { const slipper = mesh(new THREE.SphereGeometry(1, 14, 10), flat(pick(['#4a2a1a', '#8a2a2a', '#2a3a5a']), { roughness: 0.9 }), [dFront + 0.35, 0.04, dMid + 0.6 + side * 0.09]); slipper.scale.set(0.13, 0.045, 0.055); }
    } else if (a.state === 'wrecked') {
      const cans = Array.from({ length: Math.round(16 * clutter) }, () => { const [x, z] = floorSpot(); const lying = random() < 0.6; return { at: [x, lying ? 0.035 : 0.06, z] as P3, rot: [lying ? Math.PI / 2 : 0, rnd(0, 6), 0] as P3, color: pick(['#c82a2a', '#e8c83a', '#d8d8d8', '#2a5ab8', '#e8e8e8']) }; });
      instanced(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), flat('#ffffff', { metalness: 0.5, roughness: 0.35 }), cans);
      for (let i = 0; i < 3; i++) { const [x, z] = floorSpot(); const bottle = mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.04, 0.18], [0.015, 0.24], [0.015, 0.3], [0, 0.3]].map(([px, py]) => new THREE.Vector2(px, py)), 12), flat(pick(['#2a5a2a', '#6a3a1a']), { roughness: 0.15 }), [x, 0.04, z]); bottle.rotation.set(Math.PI / 2, 0, rnd(0, 6)); }
      const [px, pz] = floorSpot();
      const pizza = new THREE.Group(); pizza.position.set(px, 0, pz); pizza.rotation.y = rnd(0, 6); root.add(pizza);
      box([0.42, 0.04, 0.42], [0, 0.03, 0], flat('#e8dcc0', { roughness: 0.9 }), pizza);
      const lid = box([0.42, 0.01, 0.42], [0, 0.05 + 0.21 * Math.sin(1.1), -0.21 - 0.21 * Math.cos(1.1)], flat('#e8dcc0', { roughness: 0.9 }), pizza);
      lid.rotation.x = 1.1 - Math.PI;
      for (let i = 0; i < 2; i++) { const slice = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.015, 3, 1, false, 0, Math.PI / 4), flat('#e8a03a', { roughness: 0.8 }), [0, 0.06, 0], pizza); slice.rotation.y = i * 2.4; }
      const streamerColours = ['#ff5aa8', '#5ac8ff', '#ffe05a', '#7aff7a'];
      for (let i = 0; i < 3; i++) {
        const end = new THREE.Vector3(rnd(-2.0, 0.0), 0.02, rnd(-2.2, -0.9));
        const start = new THREE.Vector3(lampX + rnd(-0.1, 0.1), 2.4, backZ + 0.6);
        const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(rnd(-0.3, 0.3), -0.3, 0.3));
        mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 24, 0.012, 5), flat(streamerColours[i], { roughness: 0.8 }));
      }
      const shirt = mesh(new THREE.PlaneGeometry(0.6, 0.7, 8, 8), flat(pick(['#e8d0a0', '#a8d8f0', '#f0a0c0']), { side: THREE.DoubleSide, roughness: 0.8 }), [rnd(-2.6, -1.8), 0.04, rnd(1.4, 2.4)]);
      const sp = shirt.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.abs(Math.sin(sp.getX(i) * 9) * Math.cos(sp.getY(i) * 7)) * 0.06);
      shirt.geometry.computeVertexNormals();
      shirt.rotation.set(-Math.PI / 2, 0, rnd(0, 6));
      for (let i = 0; i < 2; i++) { const [x, z] = floorSpot(); mesh(new THREE.SphereGeometry(0.09, 10, 8), flat(pick(['#ff5aa8', '#5ac8ff', '#ffe05a']), { roughness: 0.4 }), [x, 0.05, z]).scale.set(1, 0.5, 1.3); }
      sock = new THREE.Group();
      sock.position.set(0, -0.46, 0.12);
      shade.add(sock);
      const sockPaint = flat('#f0f0ea', { roughness: 1 });
      mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), sockPaint, [0, -0.1, 0], sock);
      const toe = mesh(new THREE.CapsuleGeometry(0.035, 0.08, 4, 8), sockPaint, [0, -0.21, 0.05], sock);
      toe.rotation.x = Math.PI / 2;
      for (const y of [-0.02, -0.05]) mesh(new THREE.TorusGeometry(0.036, 0.008, 6, 14), flat('#c82a2a'), [0, y, 0], sock).rotation.x = Math.PI / 2;
    } else if (a.state === 'smelled') {
      const hazeMaterial = new THREE.MeshStandardMaterial({ color: '#9ccc2a', emissive: '#9ccc2a', emissiveIntensity: 0.6, transparent: true, opacity: 0.26, depthWrite: false, roughness: 1 });
      for (let i = 0; i < Math.round(7 * clutter); i++) {
        const base = new THREE.Vector3(rnd(-3.2, 2.8), rnd(0.35, 0.7), rnd(-2.2, 2.6));
        const puff = mesh(new THREE.SphereGeometry(1, 16, 10), hazeMaterial, base.toArray() as P3);
        puff.scale.set(rnd(0.5, 0.9), rnd(0.25, 0.4), rnd(0.45, 0.8));
        puff.castShadow = false;
        hazes.push({ mesh: puff, base, phase: random() * 6 });
        // Cartoon stink lines wobbling up off the bigger clouds.
        if (i < 3) for (let k = 0; k < 2; k++) {
          const x0 = base.x + (k - 0.5) * 0.35, z0 = base.z, y0 = base.y + 0.1, phase = random() * 6;
          const points = Array.from({ length: 12 }, (_, j) => new THREE.Vector3(x0 + Math.sin(j * 0.8 + phase) * 0.06, y0 + j / 11 * 0.6, z0));
          const line = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.014, 6), flat('#5e7016', { roughness: 0.6 }));
          line.castShadow = false;
          stink.push(line);
        }
      }
      for (let i = 0; i < Math.round(4 * clutter); i++) {
        const [x, z] = floorSpot();
        const can = new THREE.Group(); can.position.set(x, 0, z); root.add(can);
        const lying = random() < 0.5;
        if (lying) { can.rotation.z = Math.PI / 2; can.position.y = 0.035; }
        const tone = pick(['#e84a8a', '#4a9ae8', '#f0c02a', '#5ac87a']);
        mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 14), flat(tone, { metalness: 0.4, roughness: 0.3 }), [0, 0.1, 0], can);
        mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.04, 14), flat('#f2f2f2'), [0, 0.22, 0], can);
      }
      const peg = mesh(new THREE.BoxGeometry(0.02, 0.07, 0.025), flat('#e8c060'), [0, 0, 0], tvGroup);
      peg.position.set(-0.2, 0.92, 0);
      void peg;
    } else {
      const candles: { at: P3; scale: P3 }[] = [], wicks: { at: P3 }[] = [];
      const spots: [number, number, number][] = [[leftX + 0.18, dz0 + 1.3, topY], [leftX + 0.2, dz0 + 1.45, topY], [winX - 0.8, backZ + 0.08, winY0], [winX - 0.6, backZ + 0.08, winY0], [winX - 0.38, backZ + 0.08, winY0]];
      for (let i = 0; i < Math.round(6 * clutter); i++) { const [x, z] = floorSpot(); spots.push([x, z, 0]); }
      for (const [x, z, y] of spots) { const tall = rnd(0.08, 0.22); candles.push({ at: [x, y + tall / 2, z], scale: [1, tall / 0.2, 1] }); wicks.push({ at: [x, y + tall + 0.03, z] }); }
      instanced(new THREE.CylinderGeometry(0.035, 0.038, 0.2, 12), flat(pick(['#f4ecd8', '#c8203a', '#f4ecd8']), { roughness: 0.6 }), candles);
      flames.push(instanced(new THREE.ConeGeometry(0.018, 0.06, 8), flat('#ffd060', { emissive: '#ffb030', emissiveIntensity: 2.2 }), wicks));
      flames[0].castShadow = false;
      const petals = Array.from({ length: Math.round(70 * clutter) }, () => {
        const t = random();
        const x = mix(-1.8, heroX, t) + rnd(-0.5, 0.5), z = mix(2.8, -0.2, t) + rnd(-0.4, 0.4);
        return { at: [x, 0.07, z] as P3, rot: [rnd(-0.3, 0.3), rnd(0, 6), rnd(-0.3, 0.3)] as P3, scale: [1, 0.25, 0.7] as P3 };
      });
      instanced(new THREE.SphereGeometry(0.04, 8, 6), flat('#c0102a', { roughness: 0.5 }), petals);
      const bucket = new THREE.Group(); bucket.position.set(-2.7, 0, -2.3); root.add(bucket);
      for (let i = 0; i < 3; i++) { const angle = i / 3 * Math.PI * 2; const leg = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 6), alu, [Math.cos(angle) * 0.1, 0.31, Math.sin(angle) * 0.1], bucket); leg.rotation.set(Math.sin(angle) * 0.15, 0, -Math.cos(angle) * 0.15); }
      mesh(new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.13, 0.22], [0.14, 0.23]].map(([x, y]) => new THREE.Vector2(x, y)), 20), flat('#d8dcdc', { metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide }), [0, 0.62, 0], bucket);
      const champagne = mesh(new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.045, 0.2], [0.016, 0.28], [0.016, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 14), flat('#1a3a1a', { roughness: 0.15 }), [0.02, 0.66, 0], bucket);
      champagne.rotation.z = -0.3;
      mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.07, 10), flat('#e0c050', { metalness: 0.7, roughness: 0.3 }), [0.02 + Math.sin(0.3) * 0.31, 0.66 + Math.cos(0.3) * 0.31, 0], bucket);
      instanced(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: '#eef6fa', roughness: 0.1, transparent: true, opacity: 0.7 }), Array.from({ length: 9 }, () => ({ at: [rnd(-0.08, 0.08), 0.84, rnd(-0.08, 0.08)] as P3 })), bucket);
    }
    // Stains on the shag with wear.
    const stains = Math.round(mood.wear * 6);
    for (let i = 0; i < stains; i++) {
      const [x, z] = floorSpot();
      const stain = mesh(new THREE.CircleGeometry(rnd(0.15, 0.35), 18), new THREE.MeshBasicMaterial({ color: '#2a1a0a', transparent: true, opacity: 0.18, depthWrite: false }), [x, 0.09, z]);
      stain.rotation.x = -Math.PI / 2; stain.scale.y = rnd(0.6, 1); stain.castShadow = false;
    }

    // ---- Put the hero on the open carpet; a large one (a bed) is pushed back to the wall.
    const basePlace = world.place;
    world.place = (items: readonly Placeable[]) => {
      const hero = items.find((item) => item.hero) ?? items[0];
      if (hero) {
        const fit = Math.min(Math.max(0.35, Math.min(2.6 / Math.max(hero.height, 0.05), 2.4 / Math.max(hero.radius, 0.05))), 1.12);
        const reach = hero.radius * fit;
        slots[0][1] = reach > 0.95 ? Math.min(0.2, backZ + 0.4 + reach) : -0.9;
      }
      basePlace(items);
    };

    // ---- Motion: TV flicker, the lamp swaying on its chain, drapes billowing, the goldfish, the haze.
    const energy = mood.energy;
    const draft = open ? 1 : 0.15;
    world.update = (_dt, time) => {
      if (tvOn) {
        screenMaterial.emissiveIntensity = tvPower * (0.85 + 0.15 * Math.sin(time * (7 + energy * 9)) * Math.sin(time * 3.1));
        if (a.tv === 'static' || a.tv === 'off') screenMap.offset.set((Math.sin(time * 91.7) * 43758.5) % 1, (Math.sin(time * 37.3) * 12345.6) % 1);
      }
      swing.rotation.z = Math.sin(time * 1.3) * (0.015 + draft * 0.06) * (0.4 + energy);
      swing.rotation.x = Math.sin(time * 0.9 + 1) * (0.01 + draft * 0.05) * (0.4 + energy);
      tilt.rotation.z = 0.12 + Math.sin(time * 0.7) * 0.03 * draft;
      for (const d of drapes) {
        const p = d.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          const x = d.base[i * 3], y = d.base[i * 3 + 1], z = d.base[i * 3 + 2];
          const hang = (dropH / 2 - y) / dropH;
          const gust = draft * (0.5 + energy) * hang ** 1.4;
          p.setXYZ(i, x + Math.sin(time * 1.7 + d.phase + y * 2) * 0.06 * gust, y, z + (0.18 + Math.sin(time * 2.1 + d.phase + x * 3) * 0.14) * gust);
        }
        p.needsUpdate = true;
        d.geometry.computeVertexNormals();
      }
      for (const fish of fishes) { fish.rotation.y = time * (0.6 + energy); fish.position.y = topY + 0.15 + Math.sin(time * 1.3) * 0.02; }
      for (const b of blobs) b.mesh.position.y = b.base + Math.sin(time * 0.4 + b.phase) * 0.1;
      for (const h of hazes) h.mesh.position.set(h.base.x + Math.sin(time * 0.3 + h.phase) * 0.3 - ((time * 0.05 + h.phase) % 1) * 0.4, h.base.y + Math.sin(time * 0.5 + h.phase) * 0.05, h.base.z + Math.cos(time * 0.25 + h.phase) * 0.3);
      stink.forEach((line, i) => { line.position.x = Math.sin(time * 2.2 + i) * 0.03; line.position.y = Math.sin(time * 1.6 + i * 1.3) * 0.03; });
      if (sock) sock.rotation.z = Math.sin(time * 1.1) * 0.08;
      for (const f of flames) f.scale.y = 1 + Math.sin(time * 13) * 0.08;
    };
    return world;
  },
});
