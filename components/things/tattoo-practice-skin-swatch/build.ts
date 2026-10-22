import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const TONES = { pale: '#f1d8c6', light: '#e2b792', tan: '#c8925f', brown: '#8f5c3b', deep: '#5d3c2b', rubber: '#eee2ba' } as const;
const NAMES = ['Jesica', 'Brittny', 'Regerts', 'Forver', 'Danniele', 'Micheal', 'Stay Stong', 'Angle'];

const heart = (c: Ctx, x: number, y: number, r: number) => {
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.1, x, y - r * 0.35);
  c.bezierCurveTo(x + r * 0.75, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
};

function texture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export default defineThing({
  questions: {
    design: choice('What design is tattooed on the practice skin?', {
      swallow: 'An old-school swallow in flight, blue wings and a red breast.',
      rose: 'A fat traditional rose with two leaves on a stem.',
      'mum-heart': 'A red heart with a banner across it reading MUM.',
      'barbed-wire': 'A strand of barbed wire running edge to edge, an armband rehearsal.',
      koi: 'A curving orange koi with scales and water swirls.',
      name: 'A name in looping script, spelt wrong.',
    }),
    skin: choice('What tone is the practice skin?', {
      pale: 'Pale pinkish silicone.',
      light: 'Light beige.',
      tan: 'Warm tan.',
      brown: 'Mid brown.',
      deep: 'Deep dark brown, where ink sits low and quiet.',
      rubber: 'Unpainted yellowish practice rubber, obviously fake.',
    }),
    finish: choice('How far has the tattoo got?', {
      stencil: 'Only the purple transfer stencil, nothing inked yet.',
      linework: 'Black outlines done, no colour.',
      shaded: 'Fully lined, packed with colour and shaded: proud work.',
      botched: 'Wobbly, blown out, colour outside the lines, then crossed out in marker.',
    }),
    who: choice('Whose attempt is it?', {
      apprentice: "A shop apprentice's: green cutting mat, a numbered practice tag and the mentor's red-pen verdict.",
      scratcher: "A kitchen-table scratcher's: newspaper underneath, masking tape, a roll of tape and a battery.",
      veteran: "An old hand trying something new: a steel tray, a tin of jelly and a wash bottle, everything squared up.",
      lover: 'Someone rehearsing before doing it on a person they love: a wooden board with a snapshot propped beside it.',
    }),
    machine: choice('What machine lies beside it?', {
      'brass-coil': 'A classic brass coil machine with two wrapped coils.',
      'iron-coil': 'A heavy black iron coil machine.',
      'rotary-pen': 'A sleek anodised rotary pen.',
      homemade: 'A home-made rig: a biro strapped to a toy motor with tape and wires.',
    }),
    inks: choice('What inks are out?', {
      black: 'Black only, blackwork and grey wash.',
      traditional: 'Old-school red, green, yellow and blue.',
      pastel: 'Soft candy pastels.',
      neon: 'Loud saturated neons.',
    }),
    moment: choice('What moment is it?', {
      setup: 'Just set up: caps brim full, everything clean, the machine laid ready.',
      mid: 'Mid-session: the machine buzzing on the skin, an inky wad of paper towel in reach.',
      done: 'Just finished: caps drained, smeared towel, the machine set down.',
      abandoned: 'Abandoned: ink dried in the caps, cord pulled out, left where it lay.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = TONES[a.skin];
    const stencil = a.finish === 'stencil', shaded = a.finish === 'shaded', botched = a.finish === 'botched';
    const dark = a.skin === 'deep' || a.skin === 'brown';

    const tint = (hex: string) => {
      const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      if (a.inks === 'black') c.setHSL(0, 0, mix(0.12, 0.55, hsl.l));
      else if (a.inks === 'pastel') c.setHSL(hsl.h, hsl.s * 0.75, mix(hsl.l, 0.85, 0.5));
      else if (a.inks === 'neon') c.setHSL(hsl.h, 1, 0.55);
      if (dark && a.inks !== 'black') c.lerp(new THREE.Color(tone), 0.18);
      return `#${c.getHexString()}`;
    };

    // ---- The tattoo, painted on a canvas.
    const paint = () => {
      const W = 768, H = 512;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const c = canvas.getContext('2d')!;
      c.fillStyle = tone; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 500; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.03)';
        c.beginPath(); c.arc(random() * W, random() * H, 2 + random() * 9, 0, 7); c.fill();
      }
      c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 5; c.strokeRect(12, 12, W - 24, H - 24);
      const lineInk = stencil ? (dark ? '#b79cf0' : '#5a3aa8') : '#121216';
      c.lineJoin = c.lineCap = 'round';

      const part = (path: (c: Ctx) => void, fill?: string, mask = false) => {
        c.save();
        if (botched) c.translate((random() - 0.5) * 12, (random() - 0.5) * 12);
        c.beginPath(); path(c);
        if (mask) { c.fillStyle = tone; c.fill(); }
        if (fill && (shaded || (botched && random() < 0.65))) {
          c.save();
          if (botched) c.translate((random() - 0.5) * 26, (random() - 0.5) * 26);
          c.globalAlpha = botched ? 0.7 : 0.92; c.fillStyle = tint(fill); c.fill();
          c.restore();
        }
        c.globalAlpha = stencil ? 0.8 : 1;
        c.strokeStyle = lineInk;
        c.lineWidth = stencil ? 4.5 : botched ? 5 + random() * 8 : 8;
        c.stroke();
        if (botched) { c.translate(4, 3); c.globalAlpha = 0.45; c.lineWidth = 3; c.stroke(); }
        c.restore();
      };
      const text = (words: string, x: number, y: number, font: string, solid: boolean) => {
        c.save();
        c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (botched) { c.translate((random() - 0.5) * 10, (random() - 0.5) * 10); c.rotate((random() - 0.5) * 0.06); }
        c.strokeStyle = c.fillStyle = lineInk;
        c.lineWidth = stencil ? 2.5 : 4;
        if (!stencil && (solid || shaded || botched)) c.fillText(words, x, y, 620);
        c.strokeText(words, x, y, 620);
        if (botched) { c.globalAlpha = 0.4; c.strokeText(words, x + 5, y + 4, 620); }
        c.restore();
      };
      const oval = (x: number, y: number, rx: number, ry: number, rot = 0) => (k: Ctx) => { k.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };

      if (a.design === 'swallow') {
        part((k) => { k.moveTo(330, 268); k.lineTo(120, 215); k.lineTo(235, 288); k.lineTo(110, 350); k.lineTo(340, 305); k.closePath(); }, '#24408f');
        part((k) => { k.moveTo(450, 232); k.quadraticCurveTo(390, 80, 262, 36); k.quadraticCurveTo(318, 160, 345, 250); k.closePath(); }, '#2b55b8');
        part((k) => { k.moveTo(400, 280); k.quadraticCurveTo(350, 400, 232, 468); k.quadraticCurveTo(300, 350, 322, 272); k.closePath(); }, '#2b55b8');
        part(oval(410, 255, 125, 50, -0.28), '#24408f', true);
        part(oval(446, 278, 78, 24, -0.28), '#cf2f2a');
        part(oval(528, 205, 42, 40), '#24408f', true);
        part((k) => { k.moveTo(564, 192); k.lineTo(618, 204); k.lineTo(562, 222); k.closePath(); }, '#f0c22e');
        part(oval(538, 198, 5, 5), '#111111');
        part((k) => { k.moveTo(560, 330); k.quadraticCurveTo(640, 300, 690, 350); k.moveTo(590, 370); k.quadraticCurveTo(640, 350, 680, 385); });
      } else if (a.design === 'rose') {
        part((k) => { k.moveTo(384, 290); k.quadraticCurveTo(346, 400, 396, 496); });
        part(oval(292, 382, 78, 30, -0.55), '#2f8a45');
        part(oval(482, 404, 78, 30, 0.55), '#2f8a45');
        part((k) => { k.moveTo(232, 400); k.lineTo(352, 362); k.moveTo(424, 384); k.lineTo(542, 424); });
        for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2 + 0.3; part(oval(384 + Math.cos(t) * 78, 190 + Math.sin(t) * 70, 70, 62, t), '#cf2733', true); }
        part(oval(384, 190, 74, 68), '#a3141f', true);
        part((k) => { for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 5, r = 6 + i * 0.95; const x = 384 + Math.cos(t) * r, y = 190 + Math.sin(t) * r * 0.9; if (i) k.lineTo(x, y); else k.moveTo(x, y); } });
      } else if (a.design === 'mum-heart') {
        part((k) => heart(k, 384, 235, 185), '#d1242f');
        part((k) => { k.moveTo(90, 270); k.lineTo(160, 232); k.lineTo(160, 318); k.lineTo(96, 350); k.lineTo(126, 304); k.closePath(); }, '#e9cf8e', true);
        part((k) => { k.moveTo(678, 270); k.lineTo(608, 232); k.lineTo(608, 318); k.lineTo(672, 350); k.lineTo(642, 304); k.closePath(); }, '#e9cf8e', true);
        part((k) => { k.moveTo(140, 222); k.quadraticCurveTo(384, 170, 628, 222); k.lineTo(628, 322); k.quadraticCurveTo(384, 270, 140, 322); k.closePath(); }, '#f6e7b4', true);
        text(['MUM', 'MOM', 'MAM', 'MUM'][Math.floor(random() * 4)], 384, 252, 'bold 92px Georgia, serif', true);
        part((k) => { k.moveTo(250, 80); k.lineTo(232, 44); k.moveTo(384, 52); k.lineTo(384, 14); k.moveTo(518, 80); k.lineTo(536, 44); });
      } else if (a.design === 'barbed-wire') {
        if (shaded || botched) {
          c.strokeStyle = 'rgba(40,50,70,0.3)'; c.lineWidth = 22; c.beginPath();
          for (let x = 20; x <= 748; x += 8) { const y = 272 + Math.sin(x / 46) * 20; if (x === 20) c.moveTo(x, y); else c.lineTo(x, y); }
          c.stroke();
        }
        for (const ph of [0, Math.PI])
          part((k) => { for (let x = 20; x <= 748; x += 6) { const y = 256 + Math.sin(x / 46 + ph) * 22; if (x === 20) k.moveTo(x, y); else k.lineTo(x, y); } });
        for (let i = 0; i < 5; i++) {
          const x = 92 + i * 146, lean = random() < 0.5 ? 1 : -1;
          part((k) => { k.moveTo(x - 16, 236); k.lineTo(x + 16, 276); k.moveTo(x - 6, 232); k.lineTo(x + 24, 270); });
          part((k) => { k.moveTo(x - 10, 250); k.lineTo(x - 10 - 34 * lean, 168); k.lineTo(x + 4, 240); k.closePath(); }, '#8d98a8', true);
          part((k) => { k.moveTo(x + 12, 262); k.lineTo(x + 12 + 34 * lean, 346); k.lineTo(x - 2, 272); k.closePath(); }, '#8d98a8', true);
        }
        const dx = 92 + 146 * Math.floor(random() * 5);
        part((k) => { k.moveTo(dx + 40, 360); k.quadraticCurveTo(dx + 16, 410, dx + 40, 424); k.quadraticCurveTo(dx + 64, 410, dx + 40, 360); }, '#c81f27');
        part(oval(dx + 62, 452, 9, 12), '#c81f27');
      } else if (a.design === 'koi') {
        part((k) => { k.moveTo(196, 300); k.quadraticCurveTo(118, 214, 60, 150); k.quadraticCurveTo(116, 290, 72, 420); k.quadraticCurveTo(140, 352, 196, 300); }, '#e2532a');
        part((k) => { k.moveTo(318, 190); k.quadraticCurveTo(380, 86, 468, 162); k.closePath(); }, '#e2532a');
        part((k) => { k.moveTo(470, 336); k.quadraticCurveTo(440, 436, 530, 410); k.quadraticCurveTo(516, 362, 506, 336); k.closePath(); }, '#e2532a');
        part((k) => { k.moveTo(180, 300); k.bezierCurveTo(260, 140, 490, 130, 604, 226); k.quadraticCurveTo(664, 272, 604, 318); k.bezierCurveTo(490, 372, 300, 388, 180, 300); k.closePath(); }, '#f18a1f', true);
        part(oval(400, 232, 62, 30, -0.1), '#f7f1e3');
        part(oval(290, 300, 40, 22, 0.3), '#f7f1e3');
        for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row; i++) {
          const x = 250 + i * 46 + row * 22, y = 232 + row * 40;
          part((k) => { k.arc(x, y, 22, Math.PI * 0.55, Math.PI * 1.45, true); });
        }
        part((k) => { k.moveTo(548, 190); k.quadraticCurveTo(520, 262, 556, 334); });
        part(oval(594, 248, 9, 9), '#111111');
        part((k) => { k.moveTo(640, 270); k.quadraticCurveTo(690, 290, 700, 340); k.moveTo(634, 288); k.quadraticCurveTo(660, 330, 650, 372); });
        part((k) => { k.moveTo(150, 462); k.bezierCurveTo(250, 420, 320, 496, 430, 452); k.bezierCurveTo(510, 426, 570, 470, 640, 440); }, undefined);
        part((k) => { k.arc(600, 110, 30, 0.6, 5.2); k.moveTo(640, 80); k.arc(668, 86, 12, 3, 8.5); });
      } else {
        const name = NAMES[Math.floor(random() * NAMES.length)];
        text(name, 384, 220, 'italic bold 150px Georgia, serif', false);
        part((k) => { k.moveTo(110, 330); k.bezierCurveTo(260, 290, 430, 380, 560, 318); k.bezierCurveTo(620, 290, 640, 340, 590, 352); });
        part((k) => heart(k, 668, 320, 34), '#d1242f');
        part((k) => { k.moveTo(96, 120); k.lineTo(124, 96); k.moveTo(86, 150); k.lineTo(52, 150); k.moveTo(672, 108); k.lineTo(700, 84); });
      }

      if (stencil) for (let i = 0; i < 5; i++) {
        const x = 80 + random() * 608, y = 60 + random() * 392, r = 30 + random() * 40;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(96,60,180,0.16)'); g.addColorStop(1, 'rgba(96,60,180,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const smears = Math.round((botched ? 7 : stencil ? 0 : 2) + mood.wear * 5);
      for (let i = 0; i < smears; i++) {
        const x = 90 + random() * 588, y = 70 + random() * 372, r = 26 + random() * 46;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(30,36,60,${botched ? 0.32 : 0.14})`); g.addColorStop(1, 'rgba(30,36,60,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      if (botched) {
        c.strokeStyle = 'rgba(12,12,16,0.9)'; c.lineWidth = 20;
        for (const [x0, y0, x1, y1] of [[70, 60, 700, 450], [690, 70, 80, 440]]) {
          c.beginPath(); c.moveTo(x0 + random() * 30, y0 + random() * 30);
          c.quadraticCurveTo(384 + (random() - 0.5) * 90, 256 + (random() - 0.5) * 90, x1 - random() * 30, y1 - random() * 30); c.stroke();
        }
      }
      return canvas;
    };

    // ---- Board.
    const BW = 0.46, BD = 0.34, BT = 0.018, top = BT;
    const slab = (size: P, at: P, face: THREE.Material, side: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), [side, side, face, side, side, side]);
      mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh);
      return mesh;
    };
    const steel = s.material('#c3c9cc', { metalness: 0.85, roughness: 0.3 });
    const black = s.material('#1b1c20', { roughness: 0.5 });
    if (a.who === 'apprentice') {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 384;
      const c = cv.getContext('2d')!; c.fillStyle = '#2c7a58'; c.fillRect(0, 0, 512, 384);
      for (let i = 0; i <= 32; i++) { c.fillStyle = i % 4 ? 'rgba(220,255,230,0.22)' : 'rgba(235,255,240,0.6)'; c.fillRect(i * 16, 0, i % 4 ? 1 : 2, 384); c.fillRect(0, i * 16, 512, i % 4 ? 1 : 2); }
      slab([BW, BT, BD], [0, BT / 2, 0], new THREE.MeshStandardMaterial({ map: texture(cv), roughness: 0.8 }), s.material('#1f5a41'));
    } else if (a.who === 'scratcher') {
      s.box([BW, BT * 0.6, BD], [0, BT * 0.3, 0], s.material('#b98c58'));
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 384;
      const c = cv.getContext('2d')!; c.fillStyle = '#d8d3c4'; c.fillRect(0, 0, 512, 384);
      c.fillStyle = '#26262a'; c.fillRect(20, 16, 300, 30); c.fillRect(20, 56, 190, 12);
      c.fillStyle = '#8a8a86'; c.fillRect(356, 16, 136, 110);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 34; row++) { if (col === 3 && row < 14) continue; c.fillStyle = 'rgba(60,60,64,0.55)'; c.fillRect(20 + col * 122, 84 + row * 8.6, 80 + random() * 30, 3); }
      const sheet = slab([BW * 1.06, 0.002, BD * 1.02], [0.004, BT * 0.6 + 0.001, 0.003], new THREE.MeshStandardMaterial({ map: texture(cv), roughness: 0.95 }), s.material('#d8d3c4'));
      sheet.rotation.y = (random() - 0.5) * 0.12;
    } else if (a.who === 'veteran') {
      s.box([BW, BT * 0.5, BD], [0, BT * 0.25, 0], steel);
      for (const z of [-1, 1]) s.box([BW, BT, 0.008], [0, BT / 2, z * (BD / 2 - 0.004)], steel);
      for (const x of [-1, 1]) s.box([0.008, BT, BD], [x * (BW / 2 - 0.004), BT / 2, 0], steel);
      s.box([BW - 0.03, 0.002, BD - 0.03], [0, BT * 0.5 + 0.001, 0], s.material('#e9eef2', { roughness: 0.4 }));
    } else {
      s.box([BW, BT, BD], [0, BT / 2, 0], s.material('#a5713f'));
      for (let i = 0; i < 5; i++) s.box([BW, 0.0006, 0.002], [0, BT + 0.0002, -BD / 2 + 0.05 + i * 0.062], s.material('#7d532c'));
    }
    const deck = a.who === 'veteran' ? BT * 0.5 + 0.002 : a.who === 'scratcher' ? BT * 0.6 + 0.002 : top;

    // ---- Practice skin, pinned.
    const SW = 0.3, SD = 0.2, ST = 0.007, sx = -0.066, sz = 0.02;
    const skin = new THREE.Group(); skin.position.set(sx, deck, sz); skin.rotation.y = (random() - 0.5) * 0.14; s.root.add(skin);
    const skinSide = s.material(tone, { roughness: 0.55 });
    const face = new THREE.MeshStandardMaterial({ map: texture(paint()), roughness: a.moment === 'mid' ? 0.3 : 0.55 });
    skin.add(slab([SW, ST, SD], [0, ST / 2, 0], face, skinSide));
    const pinColours = ['#e23b3b', '#f2c230', '#2f7de0', '#35b56a', '#f4f4f0'];
    for (const [kx, kz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = kx * (SW / 2 - 0.012), z = kz * (SD / 2 - 0.012);
      if (a.who === 'scratcher') {
        const tape = s.box([0.06, 0.0012, 0.02], [kx * SW / 2, ST + 0.0006, kz * SD / 2], s.material('#e6d49a', { roughness: 0.9 }));
        tape.rotation.y = kx * kz * -0.78 + (random() - 0.5) * 0.3; skin.add(tape);
      } else if (a.who === 'veteran') {
        skin.add(s.box([0.022, 0.012, 0.016], [x, ST + 0.004, kz * (SD / 2 - 0.002)], black));
        const bar = s.cylinder(0.003, 0.003, 0.024, [x, ST + 0.011, kz * (SD / 2 - 0.006)], steel, 8); bar.rotation.z = Math.PI / 2; skin.add(bar);
      } else {
        const pin = s.material(pinColours[Math.floor(random() * pinColours.length)], { roughness: 0.3 });
        skin.add(s.cylinder(0.0012, 0.0012, 0.012, [x, ST + 0.005, z], steel, 6));
        skin.add(s.ball([0.0065, 0.0065, 0.0065], [x, ST + 0.012, z], pin, 12));
      }
    }

    // ---- Machine.
    const rig = new THREE.Group();
    const lying = new THREE.Group(); rig.add(lying);
    const zc = (r0: number, r1: number, len: number, at: P, m: THREE.Material, seg = 16) => {
      const g = new THREE.CylinderGeometry(r1, r0, len, seg); g.rotateX(Math.PI / 2);
      const mesh = s.mesh(g, m, at); lying.add(mesh); return mesh;
    };
    const put = <T extends THREE.Object3D>(o: T) => { lying.add(o); return o; };
    const accent = ['#d23b3b', '#2f9e6a', '#2f6fd0', '#d8a020', '#8a3fd0'][Math.floor(random() * 5)];
    let lift = 0.012, tipZ = 0.125;
    if (a.machine === 'brass-coil' || a.machine === 'iron-coil') {
      const frame = a.machine === 'brass-coil' ? s.material('#c9a243', { metalness: 0.9, roughness: 0.28 }) : s.material('#2a2b30', { metalness: 0.6, roughness: 0.45 });
      const wrap = s.material(a.machine === 'brass-coil' ? accent : '#15151a', { roughness: 0.7 });
      put(s.box([0.015, 0.012, 0.068], [0, 0.006, -0.034], frame));
      put(s.box([0.015, 0.07, 0.013], [0, 0.035, -0.066], frame));
      put(s.box([0.015, 0.022, 0.012], [0, 0.011, 0.002], frame));
      for (const z of [-0.016, -0.043]) {
        put(s.cylinder(0.0115, 0.0115, 0.034, [0, 0.029, z], wrap, 16));
        put(s.cylinder(0.0125, 0.0125, 0.003, [0, 0.0475, z], steel, 16));
        put(s.cylinder(0.0125, 0.0125, 0.003, [0, 0.0125, z], steel, 16));
      }
      put(s.box([0.012, 0.005, 0.05], [0, 0.053, -0.024], steel));
      put(s.box([0.011, 0.0015, 0.034], [0, 0.058, -0.05], s.material('#3b6fd0', { metalness: 0.7, roughness: 0.3 })));
      put(s.rod([0, 0.078, -0.07], [0, 0.058, -0.036], 0.0028, steel));
      put(s.ball([0.006, 0.006, 0.006], [0, 0.079, -0.071], frame, 10));
      for (const y of [0.03, 0.05]) put(s.cylinder(0.004, 0.004, 0.024, [0, y, -0.066], steel, 8)).rotation.z = Math.PI / 2;
      zc(0.0125, 0.0125, 0.046, [0, 0.011, 0.034], s.material('#2c2d33', { roughness: 0.75 }));
      for (let i = 0; i < 5; i++) zc(0.0131, 0.0131, 0.003, [0, 0.011, 0.016 + i * 0.009], steel);
      zc(0.0045, 0.0045, 0.05, [0, 0.011, 0.082], steel, 10);
      zc(0.0045, 0.0008, 0.018, [0, 0.011, 0.116], steel, 10);
      lying.rotation.z = Math.PI / 2; lying.position.set(0.011, 0.0085, 0);
      rig.add(s.tube([[-0.04, 0.012, -0.066], [-0.045, 0.006, -0.1], [-0.01, 0.004, -0.125], [0.035, 0.004, -0.11], [0.05, 0.004, -0.08]], 0.0022, black));
      lift = 0;
    } else if (a.machine === 'rotary-pen') {
      const body = s.material(accent, { metalness: 0.8, roughness: 0.3, emissive: accent, emissiveIntensity: 0.12 });
      zc(0.015, 0.015, 0.085, [0, 0, -0.03], body);
      zc(0.012, 0.015, 0.012, [0, 0, -0.078], black);
      zc(0.0165, 0.014, 0.042, [0, 0, 0.034], s.material('#232429', { roughness: 0.8 }));
      for (let i = 0; i < 4; i++) zc(0.0168, 0.0168, 0.003, [0, 0, 0.02 + i * 0.009], s.material('#3a3b42'));
      zc(0.008, 0.005, 0.03, [0, 0, 0.07], s.material('#dfe7ee', { roughness: 0.2 }), 12);
      zc(0.0012, 0.0004, 0.014, [0, 0, 0.092], steel, 6);
      lying.position.y = 0.0165; tipZ = 0.1;
      rig.add(s.tube([[0, 0.014, -0.084], [0.01, 0.005, -0.115], [0.05, 0.004, -0.12], [0.07, 0.004, -0.085], [0.05, 0.004, -0.06]], 0.0025, black));
      lift = 0;
    } else {
      const biro = s.material('#3f7fe0', { roughness: 0.25 });
      zc(0.0045, 0.0045, 0.13, [0, 0, 0.02], biro, 6);
      zc(0.0045, 0.0012, 0.014, [0, 0, 0.092], s.material('#d9b96a', { metalness: 0.8, roughness: 0.3 }), 6);
      zc(0.0048, 0.0048, 0.012, [0, 0, -0.048], s.material('#1c3f8a'), 6);
      put(s.box([0.014, 0.003, 0.085], [0, 0.007, -0.03], steel));
      put(s.ball([0.012, 0.003, 0.017], [0, 0.007, -0.08], steel, 12));
      const motor = put(s.cylinder(0.0125, 0.0125, 0.026, [0.004, 0.021, -0.058], s.material('#aeb4b8', { metalness: 0.85, roughness: 0.35 }), 14)); motor.rotation.z = Math.PI / 2;
      put(s.cylinder(0.005, 0.005, 0.004, [-0.012, 0.021, -0.058], s.material('#e7c53a'), 10)).rotation.z = Math.PI / 2;
      for (const z of [-0.012, -0.04, 0.02]) zc(0.0085, 0.0085, 0.013, [0, 0.003, z], s.material('#e6d49a', { roughness: 0.95 }), 10);
      lying.position.y = 0.006; tipZ = 0.1;
      rig.add(s.box([0.027, 0.018, 0.049], [0.06, 0.009, -0.1], s.material('#20222a')));
      rig.add(s.box([0.027, 0.004, 0.049], [0.06, 0.02, -0.1], s.material('#d8a020', { metalness: 0.7, roughness: 0.35 })));
      for (const [k, col] of [[-1, '#d22b2b'], [1, '#18181c']] as const)
        rig.add(s.tube([[0.017, 0.022, -0.058], [0.035, 0.03 + k * 0.004, -0.07 + k * 0.006], [0.055 + k * 0.006, 0.026, -0.09]], 0.0012, s.material(col)));
      lift = 0;
    }
    // Mid-session the tip rests on the skin; otherwise the machine lies to the right of it.
    const onSkin = a.moment === 'mid';
    const heading = onSkin ? -1.15 + (random() - 0.5) * 0.3 : -0.35 + (random() - 0.5) * 0.5;
    rig.rotation.y = heading;
    const tipAt: [number, number] = onSkin ? [sx + SW * 0.32, sz + SD * 0.18] : [0.165 + (random() - 0.5) * 0.02, 0.1];
    rig.position.set(tipAt[0] - Math.sin(heading) * tipZ, (onSkin ? deck + ST * 0.6 : deck) + lift, tipAt[1] - Math.cos(heading) * tipZ);
    if (onSkin) rig.position.x = Math.min(rig.position.x, BW / 2 - 0.06);
    s.root.add(rig);

    // ---- Ink caps and bottles along the back edge.
    const palette = { black: ['#16161a', '#3a3a40', '#77777c'], traditional: ['#16161a', '#cf2f2a', '#2f8a45', '#f0c22e', '#2b55b8', '#e2532a'], pastel: ['#16161a', '#f6a6c8', '#a8e0c8', '#f9e3a0', '#b0c8f4', '#d6b0f0'], neon: ['#16161a', '#ff2fa0', '#3dff6a', '#f6ff2f', '#2fd8ff', '#ff7a1f'] }[a.inks];
    const caps = Math.min(palette.length + 2, Math.max(2, Math.round(palette.length * mix(0.5, 1.3, mood.density))));
    const level = { setup: 1, mid: 0.7, done: 0.25, abandoned: 0.5 }[a.moment];
    const capM = s.material('#f3f3ee', { roughness: 0.4 });
    const stripW = caps * 0.03 + 0.012;
    const capX = -BW / 2 + 0.03 + stripW / 2;
    s.box([stripW, 0.004, 0.034], [capX, deck + 0.002, -BD / 2 + 0.04], a.who === 'scratcher' ? s.material('#c7b08a') : steel);
    for (let i = 0; i < caps; i++) {
      const x = capX - stripW / 2 + 0.021 + i * 0.03, z = -BD / 2 + 0.04, col = palette[i % palette.length];
      s.cylinder(0.012, 0.0085, 0.016, [x, deck + 0.012, z], capM, 14);
      const dried = a.moment === 'abandoned';
      const ink = s.material(dried ? new THREE.Color(col).multiplyScalar(0.55) : col, { roughness: dried ? 0.95 : 0.15, emissive: col, emissiveIntensity: dried ? 0 : mix(0.1, 0.45, mood.cheer) });
      s.cylinder(0.0105, 0.0105, 0.002, [x, deck + 0.0125 + 0.0075 * level * mix(0.7, 1, random()), z], ink, 14);
      if (a.moment !== 'setup' && random() < 0.35 + mood.wear * 0.4) s.cylinder(0.006 + random() * 0.006, 0.007, 0.0012, [x + (random() - 0.5) * 0.02, deck + 0.0046, z + 0.012 + random() * 0.006], ink, 10);
    }
    const bottles = 1 + Math.round(mood.density * 3);
    for (let i = 0; i < bottles; i++) {
      const col = palette[i % palette.length], x = BW / 2 - 0.04 - i * 0.042, z = -BD / 2 + 0.042 + (random() - 0.5) * 0.012;
      if (random() < mood.wear * 0.5 && i > 0) { const b = s.cylinder(0.015, 0.015, 0.058, [x, deck + 0.015, z + 0.03], s.material(col, { roughness: 0.35 }), 14); b.rotation.set(Math.PI / 2, 0, random() * 2); continue; }
      s.cylinder(0.015, 0.015, 0.058, [x, deck + 0.029, z], s.material(col, { roughness: 0.35 }), 14);
      s.cylinder(0.003, 0.009, 0.02, [x, deck + 0.068, z], black, 10);
      s.cylinder(0.0155, 0.0155, 0.024, [x, deck + 0.03, z], s.material('#f1ede0', { roughness: 0.8 }), 14);
    }

    // ---- The towel, and what the owner left around.
    if (a.moment === 'mid' || a.moment === 'done') {
      const paper = s.material('#f4f2ea', { roughness: 1 });
      const tx = 0.11, tz = -0.035;
      for (let i = 0; i < 6; i++) {
        const g = new THREE.IcosahedronGeometry(0.022 + random() * 0.012, 1);
        const p = g.attributes.position;
        for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.8 + random() * 0.4), p.getY(v) * (0.5 + random() * 0.3), p.getZ(v) * (0.8 + random() * 0.4));
        g.computeVertexNormals();
        s.mesh(g, paper, [tx + (random() - 0.5) * 0.06, deck + 0.012 + random() * 0.008, tz + (random() - 0.5) * 0.05]);
      }
      for (let i = 0; i < 5; i++) s.ball([0.008 + random() * 0.008, 0.004, 0.008 + random() * 0.008], [tx + (random() - 0.5) * 0.05, deck + 0.026 + random() * 0.004, tz + (random() - 0.5) * 0.04], s.material(palette[i % palette.length], { roughness: 0.6 }), 10);
    }
    const flat = (mesh: THREE.Mesh, turn: number) => { mesh.rotation.set(-Math.PI / 2, 0, turn); return mesh; };
    const fx = sx - 0.02, fz = BD / 2 - 0.035;
    if (a.who === 'apprentice') {
      flat(s.label('PRACTICE No.' + (2 + Math.floor(random() * 60)), 0.13, 0.03, [fx - 0.03, deck + 0.0012, fz]), (random() - 0.5) * 0.12);
      const verdict = botched ? 'AGAIN' : stencil ? 'GO SLOW' : shaded ? (mood.cheer > 0.5 ? 'GOOD!' : 'B-') : 'DEPTH?';
      flat(s.label(verdict, 0.075, 0.032, [fx + 0.1, deck + 0.0014, fz], '#c81f27', '#fbf7e6'), -0.12 + (random() - 0.5) * 0.2);
    } else if (a.who === 'scratcher') {
      const roll = s.ring(0.022, 0.009, [fx - 0.06, deck + 0.009, fz - 0.005], s.material('#e6d49a', { roughness: 0.9 })); roll.rotation.x = Math.PI / 2;
      s.cylinder(0.014, 0.014, 0.016, [fx - 0.06, deck + 0.009, fz - 0.005], s.material('#9a8250'), 14);
      const lighter = s.box([0.014, 0.012, 0.05], [fx + 0.03, deck + 0.006, fz], s.material(accent, { roughness: 0.3 })); lighter.rotation.y = random() * 2;
    } else if (a.who === 'veteran') {
      s.cylinder(0.03, 0.03, 0.018, [fx - 0.07, deck + 0.009, fz - 0.008], s.material('#e8e2c8', { roughness: 0.5 }), 20);
      s.cylinder(0.031, 0.031, 0.005, [fx - 0.07, deck + 0.02, fz - 0.008], s.material('#2b55b8', { metalness: 0.5, roughness: 0.4 }), 20);
      s.cylinder(0.019, 0.019, 0.075, [BW / 2 - 0.035, deck + 0.0375, fz - 0.01], s.material('#7fc48a', { roughness: 0.3 }), 14);
      s.cylinder(0.004, 0.012, 0.022, [BW / 2 - 0.035, deck + 0.086, fz - 0.01], s.material('#f1f1ec'), 10);
    } else {
      const snap = new THREE.Group(); snap.position.set(fx - 0.085, deck, fz - 0.03); snap.rotation.set(-0.5, 0.25 + (random() - 0.5) * 0.3, 0); s.root.add(snap);
      snap.add(s.box([0.075, 0.09, 0.002], [0, 0.045, 0], s.material('#f6f3ea', { roughness: 0.6 })));
      snap.add(s.box([0.063, 0.06, 0.001], [0, 0.052, 0.0014], s.material(mix(0, 1, mood.warmth) > 0.5 ? '#7a5a48' : '#4a5a6a', { roughness: 0.3 })));
      snap.add(s.ball([0.012, 0.015, 0.001], [0, 0.058, 0.0022], s.material('#e9c9a8'), 10));
      snap.add(s.ball([0.02, 0.014, 0.001], [0, 0.034, 0.0022], s.material('#d1242f'), 10));
      s.box([0.02, 0.016, 0.02], [fx - 0.085, deck + 0.008, fz - 0.046], s.material('#7d532c'));
    }

    // Ink flicked across the board with use.
    const flecks = Math.round(mood.wear * 36 + (botched ? 10 : 0));
    if (flecks) {
      const disc = new THREE.CylinderGeometry(1, 1, 0.08, 8);
      s.scatter(disc, s.material('#ffffff', { roughness: 0.5 }), Array.from({ length: flecks }, (_u, i) => ({
        at: [(random() - 0.5) * (BW - 0.04), deck + 0.0003, (random() - 0.5) * (BD - 0.04)] as P, size: 0.002 + random() * 0.006, color: palette[i % 3 === 0 ? 0 : i % palette.length],
      })));
    }

    // Prop the whole board up a little so the design faces the viewer.
    const tilt = new THREE.Group();
    for (const child of [...s.root.children]) tilt.add(child);
    tilt.rotation.x = 0.36; tilt.position.set(0, 0, 0);
    s.root.add(tilt);
    s.box([BW * 0.8, 0.12, 0.02], [0, -0.015, -BD / 2 + 0.03], s.material('#5b4634'));

    const buzz = onSkin ? mix(0.0002, 0.0012, mood.energy) : 0;
    const baseY = lying.position.y;
    return s.finish(buzz ? { update: (_dt, time) => { lying.position.y = baseY + Math.sin(time * 90) * buzz; } } : {});
  },
});
