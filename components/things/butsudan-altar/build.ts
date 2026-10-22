import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const PHOTOS = {
  grandfather: 'A stern grandfather in a black suit and glasses, on studio grey.',
  grandmother: 'A smiling grandmother with a grey bun and a mauve kimono collar.',
  soldier: 'A sepia young man in an army cap who never came home.',
  child: 'A child in a yellow school hat, far too young.',
  couple: 'A black-and-white wedding couple, both gone now.',
  dog: 'The family dog, a ginger shiba, in a small frame.',
  none: 'No photograph: only the black memorial tablets with gold names.',
} as const;

export default defineThing({
  questions: {
    finish: choice('What is the cabinet finished in?', {
      lacquer: 'Glossy black lacquer with gold fittings, grand and formal.',
      rosewood: 'Dark polished rosewood, sober and expensive.',
      vermilion: 'Deep red lacquer worn dark at the edges, a temple colour.',
      modern: 'Pale blond wood with clean lines, a small modern apartment altar.',
    }),
    photo: choice('Whose photograph stands inside?', PHOTOS),
    centre: choice('What is enshrined at the back?', {
      seated: 'A small gilt Buddha seated on a lotus with a round halo.',
      standing: 'A slim standing Amida with a pointed, rayed halo.',
      scroll: 'A hanging scroll with a painted figure on dark silk.',
    }),
    offering: choice('What has been offered on the stand?', {
      mikan: 'A pyramid of mandarins.',
      apples: 'Polished red apples and one green one.',
      melon: 'A single netted melon, a prized gift still unopened.',
      sweets: 'Wrapped sweet boxes and white steamed buns.',
      mochi: 'Stacked round rice cakes topped with a mandarin, for New Year.',
      bananas: 'A bunch of bananas, whatever the house had.',
    }),
    fresh: score('How fresh is the offering?', [
      'Nothing offered in a long time: bare stand, empty vases, cold ash',
      'Shrivelled fruit, browned flowers, a burnt-out stub of incense',
      'Yesterday\'s rice and flowers, still presentable',
      'Fruit piled high, new flowers, incense lit this minute',
    ]),
    doors: choice('How are the doors standing?', {
      wide: 'Thrown wide open, as on a memorial day.',
      half: 'Half open, the ordinary daily state.',
      one: 'One leaf pushed nearly shut, as if someone could not look.',
    }),
    candles: noul('Are the candles lit?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.66, D = 0.46, B = 0.5, U = 0.9;
    const bodyColour = { lacquer: '#17130f', rosewood: '#4a2418', vermilion: '#7a1c16', modern: '#c9a67a' }[a.finish];
    const gloss = a.finish === 'modern' ? 0.55 : mix(0.18, 0.5, mood.wear);
    const body = s.material(bodyColour, { roughness: gloss });
    const inset = s.material(new THREE.Color(bodyColour).offsetHSL(0, 0, a.finish === 'modern' ? -0.07 : 0.05), { roughness: gloss });
    const glow = mix(0.3, 0.8, mood.warmth) * (a.candles ? 1.4 : 1);
    const gold = s.material(a.finish === 'modern' ? '#e2c98a' : '#d9a93a', { metalness: 0.75, roughness: 0.32, emissive: '#a8741a', emissiveIntensity: glow });
    const bronze = s.material('#8a6a2c', { metalness: 0.7, roughness: 0.4 });

    // --- Base cabinet -----------------------------------------------------------------------
    s.box([W + 0.05, 0.05, D + 0.05], [0, 0.025, 0], body);
    s.box([W, B - 0.05, D], [0, 0.05 + (B - 0.05) / 2, 0], body);
    s.box([W + 0.05, 0.03, D + 0.05], [0, B + 0.015, 0], body);
    for (const x of [-1, 1]) {
      s.box([W / 2 - 0.03, 0.09, 0.012], [x * W / 4, B - 0.07, D / 2 + 0.004], inset);
      s.ring(0.016, 0.004, [x * W / 4, B - 0.075, D / 2 + 0.014], gold, Math.PI).rotation.z = Math.PI;
      s.box([W / 2 - 0.03, B - 0.22, 0.012], [x * W / 4, 0.07 + (B - 0.22) / 2, D / 2 + 0.004], inset);
      s.box([0.012, 0.06, 0.012], [x * 0.03, 0.26, D / 2 + 0.014], gold);
    }
    // Pull-out offering shelf.
    const y0 = B + 0.03;
    s.box([W - 0.08, 0.022, 0.24], [0, y0 + 0.011, D / 2 + 0.06], body);
    const shelf = y0 + 0.022;

    // --- Upper shrine shell --------------------------------------------------------------------
    s.box([W, U, 0.02], [0, y0 + U / 2, -D / 2 + 0.01], body);
    for (const x of [-1, 1]) {
      s.box([0.025, U, D], [x * (W / 2 - 0.0125), y0 + U / 2, 0], body);
      s.box([0.004, U - 0.04, D - 0.04], [x * (W / 2 - 0.028), y0 + U / 2, 0], gold);
    }
    s.box([W, 0.03, D], [0, y0 + U - 0.015, 0], body);
    s.box([W + 0.07, 0.05, D + 0.07], [0, y0 + U + 0.025, 0], body);
    if (a.finish !== 'modern') s.box([W + 0.11, 0.018, D + 0.11], [0, y0 + U + 0.059, 0], body);
    s.box([W - 0.05, U - 0.04, 0.004], [0, y0 + U / 2, -D / 2 + 0.023], gold);
    // Carved transom along the top of the opening.
    const friezeMap = paint(256, 48, (c, w, h) => {
      c.fillStyle = '#d9a93a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#5a3a10'; c.lineWidth = 3;
      for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(14 + k * 28.5, h / 2, 10, 0, 7); c.stroke(); c.beginPath(); c.arc(14 + k * 28.5, h / 2, 4, 0, 7); c.stroke(); }
      c.strokeRect(2, 2, w - 4, h - 4);
    });
    s.mesh(new THREE.BoxGeometry(W - 0.05, 0.08, 0.012), new THREE.MeshStandardMaterial({ map: friezeMap, metalness: 0.6, roughness: 0.4, emissive: '#a8741a', emissiveIntensity: glow * 0.6, emissiveMap: friezeMap }), [0, y0 + U - 0.07, D / 2 - 0.02]);

    // --- Tiers --------------------------------------------------------------------------------
    const tiers = [
      { top: y0 + 0.1, front: 0.19 },
      { top: y0 + 0.23, front: 0.05 },
      { top: y0 + 0.38, front: -0.07 },
    ];
    let below = y0;
    for (const tier of tiers) {
      const back = -D / 2 + 0.02, depth = tier.front - back;
      s.box([W - 0.05, tier.top - below, depth], [0, (tier.top + below) / 2, back + depth / 2], body);
      s.box([W - 0.06, tier.top - below - 0.016, 0.006], [0, (tier.top + below) / 2 - 0.006, tier.front + 0.002], gold);
      below = tier.top;
    }
    const [A, Bt, C] = tiers.map((tier) => tier.top);

    // Inner palace with its roof and the enshrined figure.
    const pz = -0.14;
    for (const x of [-1, 1]) s.cylinder(0.009, 0.009, 0.3, [x * 0.11, C + 0.15, pz + 0.05], gold, 10);
    const roof = s.mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.06, 4), a.finish === 'modern' ? gold : body, [0, C + 0.335, pz + 0.02]);
    roof.rotation.y = Math.PI / 4; roof.scale.z = 0.55;
    s.box([0.3, 0.012, 0.16], [0, C + 0.303, pz + 0.02], gold);
    if (a.centre === 'seated') {
      s.cylinder(0.06, 0.045, 0.03, [0, C + 0.015, pz], gold, 14);
      s.lathe([[0, 0], [0.055, 0.005], [0.05, 0.04], [0.032, 0.09], [0.022, 0.12], [0, 0.125]], gold, [0, C + 0.03, pz]);
      s.ball([0.022, 0.025, 0.022], [0, C + 0.17, pz], gold, 12);
      s.ball([0.008, 0.008, 0.008], [0, C + 0.198, pz], gold, 8);
      s.cylinder(0.045, 0.045, 0.004, [0, C + 0.17, pz - 0.03], gold, 24).rotation.x = Math.PI / 2;
    } else if (a.centre === 'standing') {
      s.cylinder(0.04, 0.05, 0.025, [0, C + 0.0125, pz], gold, 14);
      s.lathe([[0, 0], [0.032, 0.002], [0.022, 0.08], [0.026, 0.15], [0.014, 0.19], [0, 0.195]], gold, [0, C + 0.025, pz]);
      s.ball([0.017, 0.02, 0.017], [0, C + 0.235, pz], gold, 12);
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * Math.PI * 2;
        s.rod([Math.cos(ang) * 0.03, C + 0.2 + Math.sin(ang) * 0.045, pz - 0.03], [Math.cos(ang) * 0.085, C + 0.2 + Math.sin(ang) * 0.11, pz - 0.03], 0.004, gold, 0.001);
      }
    } else {
      const scroll = paint(96, 192, (c, w, h) => {
        c.fillStyle = '#6a5a2c'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#1c2438'; c.fillRect(10, 22, w - 20, h - 50);
        c.fillStyle = '#d9a93a'; c.beginPath(); c.arc(w / 2, 70, 22, 0, 7); c.fill();
        c.fillStyle = '#b84a2c'; c.beginPath(); c.moveTo(w / 2 - 20, 150); c.quadraticCurveTo(w / 2, 60, w / 2 + 20, 150); c.fill();
        c.fillStyle = '#e8c9a0'; c.beginPath(); c.arc(w / 2, 74, 9, 0, 7); c.fill();
      });
      s.mesh(new THREE.PlaneGeometry(0.13, 0.26), new THREE.MeshStandardMaterial({ map: scroll, roughness: 0.8 }), [0, C + 0.15, pz - 0.02]);
      s.cylinder(0.006, 0.006, 0.15, [0, C + 0.02, pz - 0.018], body, 8).rotation.z = Math.PI / 2;
    }
    // Hanging lanterns.
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb54a', emissiveIntensity: mix(0.3, 1.6, mood.warmth) });
    for (const x of [-1, 1]) {
      s.rod([x * 0.22, y0 + U - 0.03, 0.08], [x * 0.22, y0 + U - 0.2, 0.08], 0.002, gold);
      s.lathe([[0, 0.07], [0.028, 0.06], [0.014, 0.05], [0.024, 0.04], [0.024, 0.005], [0.01, 0], [0, 0]], gold, [x * 0.22, y0 + U - 0.27, 0.08]);
      s.cylinder(0.02, 0.02, 0.03, [x * 0.22, y0 + U - 0.248, 0.08], lamp, 10);
    }

    // --- Doors --------------------------------------------------------------------------------
    const leafW = W / 2, leafH = U - 0.035;
    const angles = { wide: [2.25, 2.25], half: [1.6, 1.7], one: [2.1, 0.95] }[a.doors];
    [-1, 1].forEach((side, k) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * W / 2, y0 + leafH / 2, D / 2 + 0.012);
      hinge.rotation.y = side * (angles[k] + (random() - 0.5) * 0.12);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.02), body);
      leaf.position.x = -side * leafW / 2;
      const inner = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.04, leafH - 0.04, 0.004), gold);
      inner.position.set(-side * leafW / 2, 0, -0.012);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.07, leafH - 0.08, 0.004), inset);
      panel.position.set(-side * leafW / 2, 0, 0.011);
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.1, 0.008), gold);
      pull.position.set(-side * (leafW - 0.025), 0, 0.014);
      for (const part of [leaf, inner, panel, pull]) { part.castShadow = part.receiveShadow = true; hinge.add(part); }
      s.root.add(hinge);
    });

    // --- Photograph and tablets -------------------------------------------------------------
    const tablet = (x: number, z: number, y: number, h: number) => {
      s.box([0.05, 0.016, 0.03], [x, y + 0.008, z], body);
      s.box([0.034, h, 0.01], [x, y + 0.016 + h / 2, z], s.material('#14100d', { roughness: 0.25 }));
      s.box([0.012, h * 0.7, 0.002], [x, y + 0.016 + h / 2, z + 0.006], gold);
      s.box([0.042, 0.012, 0.014], [x, y + 0.02 + h, z], gold);
    };
    const tabletCount = (a.photo === 'none' ? 3 : 1) + Math.floor(mood.density * 2.4);
    for (let k = 0; k < tabletCount; k++) tablet((k - (tabletCount - 1) / 2) * 0.062, -0.01 + (random() - 0.5) * 0.01, Bt, 0.1 + random() * 0.035);
    if (a.photo !== 'none') {
      const sepia = a.photo === 'soldier', mono = a.photo === 'couple';
      const picture = paint(128, 160, (c, w, h) => {
        const head = (x: number, y: number, r: number, skin: string, hair: string, top: 'bald' | 'bun' | 'cap' | 'short' | 'hood') => {
          c.fillStyle = skin; c.beginPath(); c.ellipse(x, y, r * 0.82, r, 0, 0, 7); c.fill();
          c.fillStyle = hair;
          if (top === 'bald') { c.fillRect(x - r * 0.9, y - r * 0.2, r * 0.22, r * 0.5); c.fillRect(x + r * 0.68, y - r * 0.2, r * 0.22, r * 0.5); }
          else if (top === 'bun') { c.beginPath(); c.ellipse(x, y - r * 0.55, r * 0.88, r * 0.55, 0, Math.PI, 0); c.fill(); c.beginPath(); c.arc(x, y - r * 1.1, r * 0.34, 0, 7); c.fill(); }
          else if (top === 'cap') { c.beginPath(); c.ellipse(x, y - r * 0.6, r * 0.95, r * 0.5, 0, Math.PI, 0); c.fill(); c.fillRect(x - r * 1.05, y - r * 0.66, r * 2.1, r * 0.16); }
          else if (top === 'hood') { c.beginPath(); c.ellipse(x, y - r * 0.3, r * 1.2, r * 1.15, 0, Math.PI, 0); c.fill(); }
          else { c.beginPath(); c.ellipse(x, y - r * 0.45, r * 0.9, r * 0.65, 0, Math.PI, 0); c.fill(); }
          c.fillStyle = '#2a2018';
          c.fillRect(x - r * 0.42, y - r * 0.05, r * 0.2, r * 0.08); c.fillRect(x + r * 0.22, y - r * 0.05, r * 0.2, r * 0.08);
          c.strokeStyle = '#7a3a2a'; c.lineWidth = 2; c.beginPath(); c.arc(x, y + r * 0.35, r * 0.3, 0.2, Math.PI - 0.2); c.stroke();
        };
        const shoulders = (x: number, colour: string, collar: string, span = 46) => {
          c.fillStyle = colour; c.beginPath(); c.ellipse(x, h + 4, span, 52, 0, Math.PI, 0); c.fill();
          c.fillStyle = collar; c.beginPath(); c.moveTo(x - 12, h - 44); c.lineTo(x, h - 14); c.lineTo(x + 12, h - 44); c.fill();
        };
        if (a.photo === 'grandfather') {
          c.fillStyle = '#9aa0a4'; c.fillRect(0, 0, w, h);
          shoulders(64, '#1a1a1e', '#f2f2ee'); head(64, 72, 33, '#d9b494', '#b8b8b4', 'bald');
          c.strokeStyle = '#1a1a1a'; c.lineWidth = 3; c.strokeRect(42, 62, 18, 13); c.strokeRect(68, 62, 18, 13);
        } else if (a.photo === 'grandmother') {
          c.fillStyle = '#b9cbd8'; c.fillRect(0, 0, w, h);
          shoulders(64, '#8a5a8f', '#f2f2ee'); head(64, 76, 31, '#e2c0a2', '#c9c9c6', 'bun');
        } else if (a.photo === 'soldier') {
          c.fillStyle = '#b89a6a'; c.fillRect(0, 0, w, h);
          shoulders(64, '#6a5a36', '#8a2a1c'); head(64, 74, 30, '#d9bc8f', '#5a4a2a', 'cap');
        } else if (a.photo === 'child') {
          c.fillStyle = '#8fc9e0'; c.fillRect(0, 0, w, h);
          shoulders(64, '#2a3a6a', '#f2f2ee', 38); head(64, 84, 30, '#f0cdb0', '#f0cf3a', 'cap');
          c.fillStyle = '#f0a0a0'; c.beginPath(); c.arc(46, 94, 6, 0, 7); c.arc(82, 94, 6, 0, 7); c.fill();
        } else if (a.photo === 'couple') {
          c.fillStyle = '#8a8a88'; c.fillRect(0, 0, w, h);
          shoulders(38, '#1a1a1a', '#e8e8e8', 34); shoulders(92, '#eeeeee', '#cfcfcf', 34);
          head(38, 78, 22, '#c8c8c4', '#1a1a1a', 'short'); head(92, 82, 21, '#dadad6', '#f4f4f4', 'hood');
        } else {
          c.fillStyle = '#9fbf8a'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#d98a3a'; c.beginPath(); c.moveTo(28, 34); c.lineTo(50, 62); c.lineTo(30, 76); c.fill(); c.beginPath(); c.moveTo(100, 34); c.lineTo(78, 62); c.lineTo(98, 76); c.fill();
          c.beginPath(); c.ellipse(64, 92, 40, 38, 0, 0, 7); c.fill();
          c.fillStyle = '#f6efe2'; c.beginPath(); c.ellipse(64, 108, 24, 22, 0, 0, 7); c.fill();
          c.fillStyle = '#1a1410'; c.beginPath(); c.arc(64, 100, 6, 0, 7); c.arc(48, 82, 4, 0, 7); c.arc(80, 82, 4, 0, 7); c.fill();
          c.fillStyle = '#d96a7a'; c.fillRect(60, 114, 8, 12);
        }
        if (sepia || mono || mood.wear > 0.5) { c.fillStyle = sepia ? 'rgba(150,110,50,0.35)' : 'rgba(200,190,160,0.22)'; c.fillRect(0, 0, w, h); }
      });
      const small = a.photo === 'dog' ? 1 : 1.3;
      const px = -0.18, pzp = 0.1, lean = -0.16;
      const frame = s.box([0.125 * small, 0.16 * small, 0.012], [px, A + 0.08 * small, pzp], s.material(sepia ? '#6a4a26' : '#16130f', { roughness: 0.3 }));
      frame.rotation.set(lean, 0.22, 0, 'YXZ');
      const image = s.mesh(new THREE.PlaneGeometry(0.1 * small, 0.134 * small), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.5 }), [px + 0.0016, A + 0.08 * small, pzp + 0.0072]);
      image.rotation.set(lean, 0.22, 0, 'YXZ');
    }

    // --- Offerings ----------------------------------------------------------------------------
    const f = a.fresh;
    const stale = (colour: string) => new THREE.Color(colour).lerp(new THREE.Color('#5a4630'), Math.min(1, Math.max(0, (0.55 - f) * 1.9)));
    const ox = 0.19, oz = 0.1;
    s.lathe([[0, 0], [0.04, 0], [0.04, 0.008], [0.014, 0.02], [0.014, 0.05], [0.06, 0.064], [0.062, 0.07], [0, 0.07]], s.material(a.finish === 'vermilion' ? '#17130f' : '#8a1c16', { roughness: 0.25 }), [ox, A, oz]);
    const dishTop = A + 0.07;
    if (f > 0.14) {
      const shrink = mix(0.72, 1, Math.min(1, f * 1.6));
      const amount = Math.min(1, (f - 0.14) / 0.6);
      if (a.offering === 'mikan' || a.offering === 'apples') {
        const r = (a.offering === 'mikan' ? 0.022 : 0.027) * shrink;
        const spots: [number, number, number][] = [];
        const ringCount = a.offering === 'mikan' ? 5 : 3;
        for (let k = 0; k < ringCount; k++) spots.push([Math.cos(k / ringCount * 6.283) * r * 1.35, r * 0.85, Math.sin(k / ringCount * 6.283) * r * 1.35]);
        for (let k = 0; k < 3; k++) spots.push([Math.cos(k * 2.09 + 0.5) * r * 0.75, r * 2.35, Math.sin(k * 2.09 + 0.5) * r * 0.75]);
        spots.push([0, r * 3.8, 0]);
        const shown = a.offering === 'mikan' ? Math.max(1, Math.round(amount * spots.length)) : Math.max(1, Math.round(amount * 4));
        spots.slice(0, shown).forEach(([x, y, z], k) => {
          const colour = a.offering === 'mikan' ? '#f08a1c' : k === 1 ? '#9fb83a' : '#c0282c';
          s.ball([r, r * (a.offering === 'mikan' ? 0.85 : 0.95), r], [ox + x, dishTop + y, oz + z], s.material(stale(colour), { roughness: mix(0.9, 0.4, f) }), 12);
        });
      } else if (a.offering === 'melon') {
        s.ball([0.05 * shrink, 0.048 * shrink, 0.05 * shrink], [ox, dishTop + 0.047 * shrink, oz], s.material(stale('#a9bf7a'), { roughness: 0.8 }), 16);
        s.rod([ox, dishTop + 0.09 * shrink, oz], [ox, dishTop + 0.115 * shrink, oz], 0.003, s.material(stale('#5a7a3a')));
        s.rod([ox - 0.018, dishTop + 0.115 * shrink, oz], [ox + 0.018, dishTop + 0.115 * shrink, oz], 0.003, s.material(stale('#5a7a3a')));
      } else if (a.offering === 'sweets') {
        const boxes = Math.max(1, Math.round(amount * 3));
        for (let k = 0; k < boxes; k++) s.box([0.09 - k * 0.012, 0.022, 0.06 - k * 0.008], [ox, dishTop + 0.011 + k * 0.022, oz], s.material(stale(['#e8dcc0', '#c96f8c', '#5a8a6a'][k]), { roughness: 0.6 })).rotation.y = (random() - 0.5) * 0.3;
        for (let k = 0; k < 2; k++) s.ball([0.016, 0.012, 0.016], [ox - 0.02 + k * 0.04, dishTop + boxes * 0.022 + 0.01, oz], s.material(stale('#f6f1e6')), 10);
      } else if (a.offering === 'mochi') {
        s.ball([0.05 * shrink, 0.025, 0.05 * shrink], [ox, dishTop + 0.024, oz], s.material(stale('#f6f1e6')), 16);
        s.ball([0.038 * shrink, 0.021, 0.038 * shrink], [ox, dishTop + 0.062, oz], s.material(stale('#f6f1e6')), 16);
        s.ball([0.018, 0.015, 0.018], [ox, dishTop + 0.094, oz], s.material(stale('#f08a1c')), 12);
      } else {
        const peel = s.material(stale('#f0cf3a'), { roughness: 0.6 });
        const fingers = Math.max(2, Math.round(amount * 5));
        for (let k = 0; k < fingers; k++) { const o = (k - (fingers - 1) / 2) * 0.02; s.tube([[ox - 0.05, dishTop + 0.03, oz + o * 0.4], [ox - 0.015, dishTop + 0.014, oz + o], [ox + 0.03, dishTop + 0.014, oz + o * 1.2], [ox + 0.06, dishTop + 0.035, oz + o * 0.9]], 0.011, peel); }
      }
    }
    // Flower vases on the middle tier.
    for (const x of [-1, 1]) {
      s.lathe([[0, 0], [0.02, 0], [0.012, 0.012], [0.024, 0.045], [0.012, 0.08], [0.02, 0.095]], bronze, [x * 0.235, Bt, 0.0]);
      if (f < 0.14) continue;
      const wilt = f < 0.5;
      for (let k = 0; k < 4; k++) {
        const ang = k * 1.6 + random() * 0.6, lean = wilt ? 0.07 : 0.03, hgt = (wilt ? 0.07 : 0.11) + random() * 0.04;
        const tip: [number, number, number] = [x * 0.235 + Math.cos(ang) * lean, Bt + 0.095 + hgt * (wilt ? 0.6 : 1), Math.sin(ang) * lean * 0.6 + 0.01];
        s.rod([x * 0.235, Bt + 0.09, 0], tip, 0.003, s.material(stale('#4a7a3a')));
        s.ball([0.02, wilt ? 0.012 : 0.018, 0.02], tip, s.material(stale(['#f2d23a', '#f6f1e6', '#7a4a9a', '#e86a8a'][k]), { roughness: 0.9 }), 10);
      }
    }
    // Rice and tea in front of the tablets.
    s.lathe([[0, 0], [0.014, 0], [0.01, 0.02], [0.022, 0.03], [0.024, 0.036]], gold, [-0.06, A, -0.0]);
    if (f > 0.4) s.ball([0.018, 0.02, 0.018], [-0.06, A + 0.04, 0], s.material(stale('#fbf8ee'), { roughness: 0.9 }), 10);
    s.cylinder(0.018, 0.014, 0.03, [0.03, A + 0.015, 0.02], s.material('#eef0ea', { roughness: 0.3 }), 12);

    // --- The offering shelf: incense, bell, candles ---------------------------------------------
    const sz = D / 2 + 0.07;
    s.lathe([[0, 0.012], [0.03, 0.012], [0.046, 0.03], [0.044, 0.055], [0.04, 0.058], [0, 0.056]], bronze, [0, shelf, sz]);
    for (let k = 0; k < 3; k++) s.ball([0.008, 0.008, 0.008], [Math.cos(k * 2.09 + 0.5) * 0.028, shelf + 0.008, sz + Math.sin(k * 2.09 + 0.5) * 0.028], bronze, 8);
    s.cylinder(0.038, 0.038, 0.004, [0, shelf + 0.055, sz], s.material('#b9b4a8', { roughness: 1 }), 16);
    const lit = f > 0.62;
    let smoke: THREE.Mesh | null = null, smokeBase: Float32Array | null = null;
    if (f > 0.3) {
      const sticks = lit ? 1 + Math.floor(random() * 3) : 2;
      for (let k = 0; k < sticks; k++) {
        const len = lit ? 0.09 + random() * 0.04 : 0.02 + random() * 0.02, sx = (k - (sticks - 1) / 2) * 0.012;
        s.rod([sx, shelf + 0.055, sz], [sx, shelf + 0.055 + len, sz], 0.0025, s.material('#5a6a3a'));
        if (lit) s.ball([0.004, 0.005, 0.004], [sx, shelf + 0.057 + len, sz], new THREE.MeshStandardMaterial({ color: '#ff7a2c', emissive: '#ff5a1c', emissiveIntensity: 2.5 }), 8);
      }
      if (lit) {
        const drift = (random() - 0.5) * 0.08;
        const points: [number, number, number][] = [];
        for (let k = 0; k <= 8; k++) points.push([Math.sin(k * 0.9) * 0.012 * k * 0.4 + drift * (k / 8) ** 2, shelf + 0.18 + k * 0.06, sz + Math.cos(k * 1.3) * 0.008 * k * 0.4]);
        smoke = s.tube(points, 0.006, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
        smoke.castShadow = smoke.receiveShadow = false;
        smokeBase = (smoke.geometry.attributes.position.array as Float32Array).slice();
      }
    }
    // Bell on its cushion, with the striker.
    const bx = 0.2;
    s.ball([0.05, 0.016, 0.05], [bx, shelf + 0.014, sz], s.material('#7a2a5a', { roughness: 0.9 }), 14);
    s.lathe([[0, 0.004], [0.022, 0.004], [0.04, 0.02], [0.044, 0.05], [0.041, 0.05], [0.037, 0.022], [0.02, 0.01], [0, 0.01]], s.material('#e0b84a', { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }), [bx, shelf + 0.026, sz]);
    s.rod([bx - 0.07, shelf + 0.008, sz + 0.07], [bx + 0.03, shelf + 0.008, sz + 0.09], 0.006, s.material('#5a2a1c'), 0.004);
    // Candle stands.
    const flames: THREE.Mesh[] = [];
    const flame = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffa53a', emissiveIntensity: 3 });
    for (const cx of [-0.2, -0.12]) {
      s.lathe([[0, 0], [0.022, 0], [0.008, 0.012], [0.008, 0.07], [0.02, 0.08], [0, 0.08]], gold, [cx, shelf, sz]);
      const tall = 0.03 + random() * 0.04;
      s.cylinder(0.006, 0.008, tall, [cx, shelf + 0.08 + tall / 2, sz], s.material(a.finish === 'vermilion' ? '#f1ebdc' : '#c0282c', { roughness: 0.6 }), 10);
      if (a.candles) flames.push(s.mesh(new THREE.ConeGeometry(0.006, 0.022, 8), flame, [cx, shelf + 0.094 + tall, sz]));
    }
    if (mood.density > 0.5) s.box([0.05, 0.014, 0.035], [0.09, shelf + 0.007, sz + 0.07], s.material('#d9c9a0')).rotation.y = 0.4;

    const sway = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update(_dt, time) {
        flames.forEach((mesh, k) => mesh.scale.set(1, 1 + 0.25 * Math.sin(time * 9 * sway + k * 2), 1));
        if (smoke && smokeBase) {
          const p = smoke.geometry.attributes.position;
          for (let v = 0; v < p.count; v++) {
            const rise = Math.max(0, smokeBase[v * 3 + 1] - shelf - 0.18);
            p.setX(v, smokeBase[v * 3] + Math.sin(rise * 14 - time * 1.4 * sway) * rise * 0.07);
            p.setZ(v, smokeBase[v * 3 + 2] + Math.cos(rise * 11 - time * sway) * rise * 0.04);
          }
          p.needsUpdate = true;
        }
      },
    });
  },
});
