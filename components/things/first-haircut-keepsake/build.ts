import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

const ERAS = {
  fifties: 'A 1950s diploma: cream card, red and navy rules, barber-pole stripes down the sides and a gold seal.',
  seventies: 'A 1970s card in orange and brown with a rainbow arc and fat rounded lettering.',
  nineties: 'A glossy 1990s chain-salon certificate: white, primary-colour confetti and a clip-art teddy.',
  modern: 'A recent kraft-brown card, minimal, with a stamped pair of scissors and lowercase type.',
  handwritten: 'No printed certificate at all: a lined index card the barber wrote out by hand in biro.',
} as const;
const HAIR = {
  gold: 'Pale gold, almost white at the tips.',
  brown: 'Soft mouse brown.',
  black: 'Fine jet black.',
  red: 'Bright copper red.',
  ash: 'Ash blond, nearly colourless.',
} as const;
const HAIR_TINT: Record<keyof typeof HAIR, [number, number, number]> = {
  gold: [0.12, 0.72, 0.66], brown: [0.07, 0.42, 0.3], black: [0.07, 0.15, 0.08], red: [0.055, 0.8, 0.45], ash: [0.11, 0.3, 0.76],
};
const NAMES = ['Tommy', 'Daniel', 'Marcus', 'Yusuf', 'Kenji', 'Sasha', 'Rosie', 'Leo', 'Mateo', 'Billy', 'Sam', 'Ana'];
const YEAR: Record<keyof typeof ERAS, number> = { fifties: 1956, seventies: 1974, nineties: 1993, modern: 2021, handwritten: 1984 };

function texture(width: number, height: number, draw: (ctx: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

/** Yellowing, foxing, fold lines and a darkened edge, painted over anything made of paper. */
function agePaper(ctx: Ctx, w: number, h: number, age: number, random: () => number) {
  if (age < 0.05) return;
  ctx.save();
  ctx.fillStyle = `rgba(236, 222, 190, ${age * 0.32})`; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(214, 170, 92, ${age * 0.62})`; ctx.fillRect(0, 0, w, h);
  const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
  edge.addColorStop(0, 'rgba(120,80,30,0)'); edge.addColorStop(1, `rgba(120,80,30,${age * 0.55})`);
  ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.round(age * 46); i++) {
    ctx.fillStyle = `rgba(128, 82, 32, ${mix(0.08, 0.3, random()) * age})`;
    ctx.beginPath(); ctx.arc(random() * w, random() * h, mix(2, 11, random() * random()), 0, Math.PI * 2); ctx.fill();
  }
  if (age > 0.5) {
    ctx.strokeStyle = `rgba(110, 80, 40, ${age * 0.35})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5 + 3, h); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5 - 2); ctx.stroke();
  }
  ctx.restore();
}

const script = (ctx: Ctx, text: string, x: number, y: number, size: number, ink: string, turn = -0.03) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(turn);
  ctx.fillStyle = ink; ctx.font = `italic ${size}px cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, 0, 0); ctx.restore();
};
const scissors = (ctx: Ctx, x: number, y: number, size: number, ink: string) => {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ink; ctx.lineWidth = size * 0.09; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-size * 0.2, side * size * 0.12); ctx.lineTo(size * 0.9, -side * size * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-size * 0.42, side * size * 0.26, size * 0.2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
};

function paintCertificate(ctx: Ctx, era: keyof typeof ERAS, name: string, date: string, cheer: number, random: () => number) {
  const W = 704, H = 512;
  const line = (x0: number, y: number, x1: number, ink: string) => { ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]); };
  const title = (text: string, y: number, font: string, ink: string) => { ctx.fillStyle = ink; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, W / 2, y, W - 150); };
  if (era === 'fifties') {
    ctx.fillStyle = '#f3ead0'; ctx.fillRect(0, 0, W, H);
    for (const x of [0, W - 46]) { ctx.save(); ctx.beginPath(); ctx.rect(x, 0, 46, H); ctx.clip(); for (let i = -4; i < 16; i++) { ctx.fillStyle = i % 2 ? '#b3262d' : '#27407e'; ctx.beginPath(); ctx.moveTo(x - 10, i * 44); ctx.lineTo(x + 60, i * 44 + 50); ctx.lineTo(x + 60, i * 44 + 68); ctx.lineTo(x - 10, i * 44 + 18); ctx.fill(); } ctx.restore(); }
    ctx.strokeStyle = '#27407e'; ctx.lineWidth = 5; ctx.strokeRect(62, 16, W - 124, H - 32);
    ctx.strokeStyle = '#b3262d'; ctx.lineWidth = 2; ctx.strokeRect(72, 26, W - 144, H - 52);
    title('CERTIFICATE', 78, 'bold 30px serif', '#b3262d');
    title('My First Haircut', 142, 'italic bold 62px serif', '#27407e');
    title('This certifies that the brave young customer', 186, '19px serif', '#3a3a3a');
    ctx.fillStyle = '#c9a23a'; ctx.beginPath(); for (let i = 0; i < 28; i++) { const r = i % 2 ? 44 : 34, t = i / 28 * Math.PI * 2; ctx.lineTo(574 + Math.cos(t) * r, 408 + Math.sin(t) * r); } ctx.fill();
    ctx.fillStyle = '#e6c869'; ctx.beginPath(); ctx.arc(574, 408, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a6a1a'; ctx.font = 'bold 15px serif'; ctx.fillText('No. 1', 574, 413);
  } else if (era === 'seventies') {
    ctx.fillStyle = '#ecd9ac'; ctx.fillRect(0, 0, W, H);
    ['#7a3e1c', '#c9601b', '#e79a25', '#f0cf5e'].forEach((tint, i) => { ctx.strokeStyle = tint; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(W / 2, 250, 300 - i * 22, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
    ctx.fillStyle = '#ecd9ac'; ctx.fillRect(0, 118, W, H);
    title('my first haircut!', 176, 'bold 66px sans-serif', '#7a3e1c');
    ctx.strokeStyle = '#c9601b'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.fillStyle = '#e79a25'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(520 + i * 30, 440, 11, 0, 7); ctx.fill(); }
  } else if (era === 'nineties') {
    ctx.fillStyle = '#fbfbf6'; ctx.fillRect(0, 0, W, H);
    const tints = ['#e8322e', '#f2c81e', '#2463c9', '#29a65a', '#8a3fc0'];
    for (let i = 0; i < 70; i++) { const x = random() * W, y = random() * H; if (x > 90 && x < W - 90 && y > 70 && y < H - 60) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(random() * 6); ctx.fillStyle = tints[i % 5]; if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); } else if (i % 3 === 1) ctx.fillRect(-9, -5, 18, 10); else { ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.fill(); } ctx.restore(); }
    ctx.fillStyle = '#2463c9'; ctx.fillRect(90, 74, W - 180, 86);
    title('MY FIRST HAIRCUT', 136, 'bold 50px sans-serif', '#ffffff');
    // Clip-art teddy.
    ctx.fillStyle = '#b67a3c'; for (const [x, y, r] of [[568, 372, 40], [540, 336, 15], [596, 336, 15], [568, 436, 46]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#e9c48f'; ctx.beginPath(); ctx.arc(568, 384, 18, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1c10'; for (const [x, y] of [[554, 364], [582, 364], [568, 380]] as const) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#e8322e'; ctx.beginPath(); ctx.moveTo(568, 412); ctx.lineTo(590, 400); ctx.lineTo(590, 424); ctx.lineTo(568, 412); ctx.lineTo(546, 400); ctx.lineTo(546, 424); ctx.fill();
  } else if (era === 'modern') {
    ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(90,60,30,${random() * 0.09})`; ctx.fillRect(random() * W, random() * H, mix(2, 14, random()), 1.5); }
    ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 2.5; ctx.strokeRect(28, 28, W - 56, H - 56);
    scissors(ctx, W / 2 - 14, 92, 62, '#2a2622');
    title('first haircut', 190, '300 58px sans-serif', '#2a2622');
    ctx.save(); ctx.translate(560, 420); ctx.rotate(-0.2); ctx.strokeStyle = 'rgba(170,40,40,0.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(170,40,40,0.8)'; ctx.font = 'bold 17px monospace'; ctx.textAlign = 'center'; ctx.fillText('BRAVE', 0, -4); ctx.fillText('★ ★ ★', 0, 18); ctx.restore();
  } else {
    ctx.fillStyle = '#f7f4e6'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#e88a8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 96); ctx.lineTo(W, 96); ctx.stroke();
    ctx.strokeStyle = '#9db9dc'; ctx.lineWidth = 2; for (let y = 146; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    script(ctx, 'First haircut!', W / 2, 78, 68, '#1f3a8a', -0.02);
    script(ctx, 'sat still like a champ', 420, 290, 40, '#1f3a8a', -0.03);
    script(ctx, '— your barber', 500, 440, 40, '#1f3a8a', -0.05);
  }
  if (era !== 'handwritten') {
    const ink = era === 'modern' ? '#2a2622' : '#2a2a30', pen = era === 'nineties' ? '#1a1a1a' : '#1f3a8a';
    ctx.textAlign = 'left'; ctx.font = era === 'fifties' ? 'italic 20px serif' : '20px sans-serif'; ctx.fillStyle = ink;
    ctx.fillText(era === 'modern' ? 'name' : 'Name', 330, 262); line(392, 264, 630, ink); script(ctx, name, 510, 258, 46, pen);
    ctx.textAlign = 'left'; ctx.font = era === 'fifties' ? 'italic 20px serif' : '20px sans-serif'; ctx.fillStyle = ink;
    ctx.fillText(era === 'modern' ? 'date' : 'Date', 330, 322); line(392, 324, 630, ink); script(ctx, date, 510, 318, 36, pen);
    if (era !== 'nineties' && era !== 'fifties') { ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.fillText(era === 'modern' ? 'barber' : 'Barber', 330, 382); line(400, 384, 500, ink); script(ctx, 'J. R—', 450, 378, 34, pen, -0.1); }
    else if (era === 'fifties') { ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.fillText('Barber', 330, 382); line(400, 384, 510, ink); script(ctx, 'Sal M.', 455, 378, 34, pen, -0.1); }
  } else { script(ctx, name, 450, 180, 60, '#1f3a8a', -0.04); script(ctx, date, 450, 236, 34, '#1f3a8a', -0.02); }
  // Where the lock goes.
  ctx.fillStyle = era === 'modern' ? 'rgba(40,30,20,0.6)' : 'rgba(40,40,60,0.55)'; ctx.font = 'italic 17px serif'; ctx.textAlign = 'center';
  ctx.fillText(cheer > 0.5 ? 'the very first lock' : 'a lock of hair', 178, 470);
}

function paintPhoto(ctx: Ctx, w: number, h: number, hair: THREE.Color, mono: boolean, cheer: number, random: () => number) {
  const skin = ['#f1cfae', '#d9a877', '#a8713f', '#f6dcc4'][Math.floor(random() * 4)];
  const back = mono ? '#8a8a86' : ['#7fa8c8', '#c9b48a', '#9cbf9a', '#c98d7a'][Math.floor(random() * 4)];
  ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 0, w, h * 0.45);
  // The cape, the head, the new fringe.
  ctx.fillStyle = mono ? '#e6e6e2' : '#f3efe4'; ctx.beginPath(); ctx.moveTo(w * 0.08, h); ctx.quadraticCurveTo(w * 0.5, h * 0.52, w * 0.92, h); ctx.fill();
  if (!mono) { ctx.strokeStyle = '#c2343a'; ctx.lineWidth = w * 0.02; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(w * (0.26 + i * 0.12), h); ctx.lineTo(w * (0.38 + i * 0.06), h * 0.74); ctx.stroke(); } }
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.46, w * 0.24, h * 0.25, 0, 0, 7); ctx.fill();
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(w * (0.5 + side * 0.25), h * 0.48, w * 0.045, h * 0.055, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = `#${hair.getHexString()}`; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.34, w * 0.25, h * 0.16, 0, Math.PI, 0); ctx.lineTo(w * 0.75, h * 0.4); ctx.lineTo(w * 0.25, h * 0.4); ctx.fill();
  ctx.fillStyle = '#2a2018'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(w * (0.5 + side * 0.1), h * 0.48, w * 0.022, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#7a3028'; ctx.lineWidth = w * 0.018; ctx.lineCap = 'round'; ctx.beginPath();
  if (cheer > 0.4) ctx.arc(w * 0.5, h * 0.54, w * 0.09, 0.25, Math.PI - 0.25); else ctx.arc(w * 0.5, h * 0.66, w * 0.08, Math.PI + 0.5, -0.5);
  ctx.stroke();
  if (cheer <= 0.4) { ctx.fillStyle = 'rgba(190,225,250,0.95)'; ctx.beginPath(); ctx.ellipse(w * 0.37, h * 0.56, w * 0.018, h * 0.03, 0, 0, 7); ctx.fill(); }
  if (mono) { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
}

export default defineThing({
  questions: {
    era: choice('What era and style is the certificate?', ERAS),
    hair: choice('What colour is the lock of baby hair?', HAIR),
    curl: score('How curly is the lock?', ['A straight flat wisp', 'A soft wave', 'One fat ringlet', 'Tight springy coils']),
    kept: choice('How has it been kept, and for how long?', {
      today: 'Fresh from the barber’s today: crisp white card propped up on the counter, tape still clear.',
      framed: 'A few years on: a proud parent put it in a small standing frame.',
      album: 'Mounted on a black scrapbook page with photo corners, the page beginning to yellow.',
      drawer: 'Found decades later loose in a drawer tray: yellowed and foxed, tape gone brown, the lock slipping free.',
    }),
    photo: choice('Is a photo attached?', {
      none: 'No photo.',
      polaroid: 'A square instant photo with a white border, clipped to the corner.',
      mono: 'A small black-and-white print with a deckled edge.',
      strip: 'A photo-booth strip of three frames.',
    }),
    lollipop: choice('What became of the lollipop?', {
      wrapped: 'Still in its twisted cellophane, saved rather than eaten.',
      swirl: 'A big unwrapped rainbow swirl, proudly earned.',
      licked: 'Half-licked and set down, sticky, with a hair stuck to it.',
      stick: 'Only the chewed paper stick is left.',
      none: 'There was no lollipop.',
    }),
    car: choice('Which toy-car booster seat did the child sit in?', {
      racer: 'A blue racing car with a number on the bonnet.',
      fire: 'A red fire engine with a ladder and a bell.',
      taxi: 'A yellow taxi with a checker stripe and roof light.',
      jeep: 'An olive-green jeep with a star and a spare wheel.',
      none: 'No toy car, just the card.',
    }),
    ribbon: noul('Is the lock tied with a tiny ribbon bow?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const age = clamp01({ today: 0, framed: 0.3, album: 0.55, drawer: 0.92 }[a.kept] + (mood.wear - 0.4) * 0.25);
    const name = NAMES[Math.floor(random() * NAMES.length)];
    const year = YEAR[a.era] + Math.floor(random() * 5);
    const date = `${1 + Math.floor(random() * 28)} ${['Jan', 'Mar', 'May', 'June', 'Aug', 'Oct', 'Dec'][Math.floor(random() * 7)]} ${year}`;
    const [hh, hs, hl] = HAIR_TINT[a.hair];
    const hairTint = new THREE.Color().setHSL(hh, hs, hl);

    // --- The card, with everything fixed to it, in its own tilted frame of reference.
    const CW = 0.22, CH = 0.16;
    const card = new Sculpture(context);
    s.root.add(card.root);
    const face = texture(704, 512, (ctx) => { paintCertificate(ctx, a.era, name, date, mood.cheer, random); agePaper(ctx, 704, 512, age, random); });
    const paper = new THREE.MeshStandardMaterial({ map: face, roughness: 0.85 });
    const backing = s.material(a.era === 'modern' ? '#b89a6c' : '#e6dcc0', { roughness: 0.9 });
    const sheet = card.mesh(new THREE.BoxGeometry(CW, CH, 0.0024, 12, 1, 1), [backing, backing, backing, backing, paper, backing] as unknown as THREE.Material);
    if (a.kept === 'drawer' || a.kept === 'today') {
      // A soft bow in the card, and a curled corner once it is old.
      const p = sheet.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / (CW / 2);
        let z = p.getZ(i) + (1 - u * u) * (a.kept === 'drawer' ? 0.006 : -0.003);
        if (a.kept === 'drawer' && u > 0.6 && p.getY(i) > 0) z += (u - 0.6) ** 2 * 0.09;
        p.setZ(i, z);
      }
      sheet.geometry.computeVertexNormals();
    }

    // The lock: a small bundle of strands hanging from a strip of tape.
    const lock = new Sculpture(context);
    card.root.add(lock.root);
    const lockAt: [number, number] = [-0.055, 0.0];
    lock.root.position.set(lockAt[0], lockAt[1], 0.004);
    const strands = 9 + Math.round(mood.density * 4);
    const turns = mix(0.35, 3.4, a.curl), amp = mix(0.0015, 0.011, Math.min(1, a.curl * 1.4)), drop = mix(0.082, 0.05, a.curl);
    for (let i = 0; i < strands; i++) {
      const spread = (i - (strands - 1) / 2) / strands, phase = random() * 1.2, tone = hairTint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12);
      const pts: [number, number, number][] = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14, grow = Math.min(1, t * 2.4);
        pts.push([spread * 0.018 + spread * t * 0.03 + Math.sin(t * turns * Math.PI * 2 + phase) * amp * grow, 0.012 - t * drop * mix(0.85, 1.1, random()), (1 + Math.cos(t * turns * Math.PI * 2 + phase)) * amp * 0.8 * grow + Math.abs(spread) * 0.002]);
      }
      lock.tube(pts, mix(0.0012, 0.002, random()), new THREE.MeshStandardMaterial({ color: tone, roughness: 0.45 }));
    }
    const tapeTint = new THREE.Color('#f4f0dc').lerp(new THREE.Color('#a8772c'), age);
    const tape = new THREE.MeshStandardMaterial({ color: tapeTint, roughness: 0.3, transparent: true, opacity: mix(0.62, 0.95, age) });
    const strip = lock.box([0.055, 0.017, 0.0012], [0, 0.011, 0.0045], tape);
    strip.rotation.z = (random() - 0.5) * 0.5;
    strip.castShadow = false;
    if (a.ribbon) {
      const silk = s.material(mood.cheer > 0.5 ? '#5aa2e0' : '#c9a0b4', { roughness: 0.45 });
      const by = -drop * 0.28;
      lock.box([0.014, 0.006, 0.006], [0, by, 0.006], silk);
      for (const side of [-1, 1]) {
        const loop = lock.ring(0.008, 0.0022, [side * 0.011, by + 0.002, 0.006], silk);
        loop.scale.set(1.25, 0.8, 1);
        lock.rod([0, by, 0.006], [side * 0.008, by - 0.02, 0.006], 0.002, silk);
      }
    }
    if (a.kept === 'drawer') { lock.root.rotation.z = mix(0.35, 0.8, random()); lock.root.position.y -= 0.012; strip.rotation.z += 0.9; strip.position.set(0.02, 0.03, 0.003); }

    // The photo.
    if (a.photo !== 'none') {
      const mono = a.photo !== 'polaroid' && !(a.photo === 'strip' && YEAR[a.era] > 1985);
      const [pw, ph] = a.photo === 'polaroid' ? [0.07, 0.084] : a.photo === 'mono' ? [0.066, 0.086] : [0.036, 0.118];
      const print = texture(a.photo === 'strip' ? 128 : 256, a.photo === 'strip' ? 420 : 320, (ctx) => {
        const w = ctx.canvas.width, h = ctx.canvas.height;
        ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, w, h);
        if (a.photo === 'strip') for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(10, 10 + i * 134); ctx.beginPath(); ctx.rect(0, 0, w - 20, 124); ctx.clip(); paintPhoto(ctx, w - 20, 124, hairTint, mono, i === 1 ? 0.1 : mood.cheer, random); ctx.restore(); }
        else { const m = a.photo === 'polaroid' ? 18 : 12, bottom = a.photo === 'polaroid' ? 62 : 12; ctx.save(); ctx.translate(m, m); ctx.beginPath(); ctx.rect(0, 0, w - m * 2, h - m - bottom); ctx.clip(); paintPhoto(ctx, w - m * 2, h - m - bottom, hairTint, mono, mood.cheer, random); ctx.restore(); if (a.photo === 'polaroid') script(ctx, String(year), w / 2, h - 20, 34, '#30324a'); }
        agePaper(ctx, w, h, age * 0.8, random);
      });
      const photo = card.mesh(new THREE.BoxGeometry(pw, ph, 0.0012), [backing, backing, backing, backing, new THREE.MeshStandardMaterial({ map: print, roughness: a.photo === 'mono' ? 0.7 : 0.3 }), backing] as unknown as THREE.Material, [CW / 2 - pw * 0.42, CH / 2 - ph * 0.36, 0.0045]);
      photo.rotation.z = mix(-0.22, 0.1, random());
      // A paperclip over the top edge.
      const clip = s.material('#b9bec4', { metalness: 0.85, roughness: 0.3 });
      const cx = CW / 2 - pw * 0.5, cy = CH / 2;
      card.tube([[cx - 0.004, cy - 0.03, 0.006], [cx - 0.004, cy + 0.004, 0.006], [cx + 0.004, cy + 0.004, 0.006], [cx + 0.004, cy - 0.022, 0.006], [cx, cy - 0.022, 0.006], [cx, cy - 0.004, 0.006]], 0.0008, clip);
    }

    // --- How the card is kept decides how it stands.
    let lean = 0.3, halfH = CH / 2, backDepth = 0.0012;
    const wood = s.material('#8a5a2e', { roughness: 0.6 });
    if (a.kept === 'today') {
      // A little folded card stand behind it.
      card.box([0.05, CH * 0.9, 0.002], [0, -CH * 0.04, -0.03], backing).rotation.x = 0.42;
    } else if (a.kept === 'framed') {
      const frame = s.material(mood.warmth > 0.5 ? '#b8923a' : '#3a2a20', { metalness: mood.warmth > 0.5 ? 0.6 : 0, roughness: 0.4 });
      const t = 0.014;
      for (const side of [-1, 1]) { card.box([CW + t * 2, t, 0.016], [0, side * (CH / 2 + t / 2), 0.002], frame); card.box([t, CH, 0.016], [side * (CW / 2 + t / 2), 0, 0.002], frame); }
      card.box([CW + t * 2, CH + t * 2, 0.004], [0, 0, -0.005], s.material('#4a3a2c'));
      card.box([0.04, CH * 0.95, 0.004], [0, -CH * 0.05, -0.036], s.material('#4a3a2c')).rotation.x = 0.4;
      lean = 0.2; halfH = CH / 2 + t; backDepth = 0.007;
    } else if (a.kept === 'album') {
      const page = s.material('#26231f', { roughness: 0.95 });
      card.box([CW + 0.09, CH + 0.08, 0.003], [0.01, 0, -0.003], page);
      card.box([CW + 0.1, CH + 0.09, 0.024], [0.012, 0, -0.017], s.material('#e9dfc4', { roughness: 0.9 }));
      card.box([CW + 0.11, CH + 0.1, 0.006], [0.012, 0, -0.032], s.material(mood.cheer > 0.5 ? '#8a2f3a' : '#2f4a3a', { roughness: 0.7 }));
      const corner = s.material('#d9cfae', { roughness: 0.7 });
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const c = card.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.0008, 3), corner, [sx * (CW / 2 - 0.004), sy * (CH / 2 - 0.004), 0.002]); c.rotation.x = Math.PI / 2; c.rotation.y = (sx > 0 ? (sy > 0 ? -1 : 1) : (sy > 0 ? 1 : -1)) * Math.PI / 4 + (sx > 0 ? 0 : Math.PI); }
      lean = 1.1; halfH = (CH + 0.1) / 2; backDepth = 0.035;
      // The album rests on two books to tilt it toward us.
      s.box([0.25, 0.045, 0.1], [0.012, 0.0225, -0.1], s.material('#5a4632', { roughness: 0.8 }));
      s.box([0.22, 0.036, 0.085], [0.0, 0.063, -0.1], s.material('#3a4a5c', { roughness: 0.8 })).rotation.y = 0.12;
    } else {
      // A shallow drawer tray; the card leans on its back wall.
      const TW = 0.38, TD = 0.3, TH = 0.05;
      s.box([TW, 0.006, TD], [0, 0.003, 0.03], wood);
      for (const side of [-1, 1]) s.box([0.008, TH, TD], [side * TW / 2, TH / 2, 0.03], wood);
      s.box([TW, TH, 0.008], [0, TH / 2, 0.03 - TD / 2], wood);
      s.box([TW, TH * 0.9, 0.008], [0, TH * 0.45, 0.03 + TD / 2], wood);
      s.cylinder(0.011, 0.014, 0.014, [0, TH * 0.5, 0.03 + TD / 2 + 0.011], s.material('#c2a35a', { metalness: 0.7, roughness: 0.4 }), 14).rotation.x = Math.PI / 2;
      const liner = texture(128, 128, (ctx) => { ctx.fillStyle = '#b9c2ac'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#aab69e'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc((i % 4) * 32 + 16, Math.floor(i / 4) * 32 + 16, 7, 0, 7); ctx.fill(); } agePaper(ctx, 128, 128, 0.6, random); });
      s.mesh(new THREE.PlaneGeometry(TW - 0.01, TD - 0.01), new THREE.MeshStandardMaterial({ map: liner, roughness: 0.9 }), [0, 0.0065, 0.03]).rotation.x = -Math.PI / 2;
      lean = 0.7;
    }
    card.root.rotation.x = -lean;
    card.root.rotation.y = (random() - 0.5) * 0.12;
    const cardZ = a.kept === 'drawer' ? -0.118 : a.kept === 'album' ? -0.02 : -0.06;
    const floor = a.kept === 'drawer' ? 0.007 : 0;
    card.root.position.set(0, floor + Math.cos(lean) * halfH + Math.sin(lean) * backDepth, cardZ);

    // --- The lollipop.
    if (a.lollipop !== 'none') {
      const pop = new Sculpture(context);
      s.root.add(pop.root);
      const stickLength = a.lollipop === 'stick' ? 0.07 : 0.085;
      const stick = pop.rod([0, 0, 0], [stickLength, 0, 0], 0.0022, s.material('#f1ede2', { roughness: 0.8 }));
      stick.castShadow = true;
      const flavour = new THREE.Color().setHSL([0.0, 0.08, 0.3, 0.58, 0.85][Math.floor(random() * 5)], mix(0.55, 0.9, mood.cheer), 0.5).lerp(new THREE.Color('#b9a078'), age * 0.45);
      let lift = 0.0022;
      if (a.lollipop === 'wrapped') {
        const r = 0.014;
        pop.ball([r, r, r], [stickLength + r * 0.8, 0, 0], new THREE.MeshStandardMaterial({ color: flavour, roughness: 0.25, emissive: flavour, emissiveIntensity: 0.15 }), 18);
        const cello = new THREE.MeshStandardMaterial({ color: '#f4f6f4', roughness: 0.15, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const twist = pop.mesh(new THREE.ConeGeometry(0.013, 0.024, 9, 1, true), cello, [stickLength - 0.012, 0, 0]);
        twist.rotation.z = -Math.PI / 2; twist.castShadow = false;
        pop.ring(0.004, 0.0012, [stickLength - 0.001, 0, 0], s.material('#d43a3a')).rotation.y = Math.PI / 2;
        lift = r;
      } else if (a.lollipop === 'swirl') {
        const r = 0.024;
        const swirl = texture(128, 128, (ctx) => { ctx.fillStyle = '#fff6ea'; ctx.fillRect(0, 0, 128, 128); const tints = ['#e8322e', '#f2c81e', '#2f8fdc', '#3bb06a']; for (let k = 0; k < 4; k++) { ctx.strokeStyle = tints[k]; ctx.lineWidth = 9; ctx.beginPath(); for (let t = 0; t < 60; t++) { const ang = t * 0.22 + k * Math.PI / 2, rad = t * 1.05; ctx.lineTo(64 + Math.cos(ang) * rad, 64 + Math.sin(ang) * rad); } ctx.stroke(); } agePaper(ctx, 128, 128, age * 0.6, random); });
        const face2 = new THREE.MeshStandardMaterial({ map: swirl, roughness: 0.2 });
        const rim = new THREE.MeshStandardMaterial({ color: '#f1e3d0', roughness: 0.25 });
        const disc = pop.mesh(new THREE.CylinderGeometry(r, r, 0.008, 28), [rim, face2, face2] as unknown as THREE.Material, [stickLength + r * 0.8, 0.002, 0]);
        disc.rotation.y = random() * 6;
        lift = 0.004;
      } else if (a.lollipop === 'licked') {
        const r = 0.012;
        const wet = new THREE.MeshStandardMaterial({ color: flavour, roughness: 0.05, emissive: flavour, emissiveIntensity: 0.25 });
        pop.ball([r, r * 0.7, r * 0.85], [stickLength + r * 0.7, 0, 0], wet, 16);
        pop.cylinder(0.015, 0.017, 0.0008, [stickLength + r * 0.7, -r * 0.7 + 0.0004, 0], new THREE.MeshStandardMaterial({ color: flavour, roughness: 0.1, transparent: true, opacity: 0.55 }), 14).castShadow = false;
        pop.tube([[stickLength, 0.004, 0.004], [stickLength + 0.012, r * 0.75, 0.002], [stickLength + 0.026, 0.006, -0.008], [stickLength + 0.034, -0.005, -0.012]], 0.0007, new THREE.MeshStandardMaterial({ color: hairTint, roughness: 0.5 }));
        lift = r * 0.7;
      } else {
        // Chewed end.
        for (let i = 0; i < 4; i++) pop.rod([stickLength, 0, 0], [stickLength + 0.008 + random() * 0.006, (random() - 0.5) * 0.006, (random() - 0.5) * 0.008], 0.0014, s.material('#e4dccb', { roughness: 0.95 }), 0.0006);
      }
      pop.root.position.set(0.035, floor + lift, 0.105);
      pop.root.rotation.y = mix(-0.5, 0.35, random());
    }

    // --- The toy-car booster seat.
    if (a.car !== 'none') {
      const car = new Sculpture(context);
      s.root.add(car.root);
      const paint = { racer: '#2463c9', fire: '#cf2a26', taxi: '#f0c020', jeep: '#5f7040' }[a.car];
      const body = s.material(paint, { roughness: 0.35, metalness: 0.15 });
      const tyre = s.material('#1c1c1e', { roughness: 0.8 });
      const chrome = s.material('#dfe3e6', { metalness: 0.85, roughness: 0.25 });
      const L = 0.14, Wd = 0.07;
      const low = a.car === 'racer';
      const side = new THREE.Shape();
      const hood = low ? 0.038 : 0.046, tail = a.car === 'jeep' ? 0.046 : low ? 0.044 : 0.05;
      side.moveTo(-L / 2, 0.014); side.lineTo(-L / 2, tail - 0.006); side.quadraticCurveTo(-L / 2, tail, -L / 2 + 0.008, tail);
      side.lineTo(-0.022, tail); side.lineTo(-0.018, 0.03); side.lineTo(0.014, 0.03); side.lineTo(0.02, hood + 0.004);
      if (a.car === 'jeep' || a.car === 'fire') { side.lineTo(L / 2 - 0.004, hood + 0.002); side.lineTo(L / 2, hood - 0.006); }
      else { side.lineTo(L / 2 - 0.03, hood); side.quadraticCurveTo(L / 2, hood - 0.004, L / 2, hood - 0.018); }
      side.lineTo(L / 2, 0.014); side.closePath();
      const shell = new THREE.ExtrudeGeometry(side, { depth: Wd - 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
      shell.translate(0, 0, -(Wd - 0.008) / 2);
      car.mesh(shell, body);
      // Cockpit: seat, back and wheel.
      const seat = s.material(a.car === 'taxi' ? '#2a2a2e' : '#e9dfc8', { roughness: 0.6 });
      car.box([0.03, 0.008, Wd - 0.022], [-0.004, 0.032, 0], seat);
      car.box([0.008, 0.034, Wd - 0.02], [-0.022, 0.05, 0], seat).rotation.z = 0.14;
      const wheel = car.ring(0.011, 0.0024, [0.014, 0.052, 0], tyre);
      wheel.rotation.set(0, Math.PI / 2, 0); wheel.rotation.z = -0.5;
      car.rod([0.014, 0.052, 0], [0.024, 0.04, 0], 0.002, chrome);
      for (const x of [-L / 2 + 0.03, L / 2 - 0.03]) for (const z of [-1, 1]) {
        const w = car.cylinder(0.017, 0.017, 0.013, [x, 0.017, z * (Wd / 2 + 0.002)], tyre, 20); w.rotation.x = Math.PI / 2;
        const hub = car.cylinder(0.008, 0.008, 0.015, [x, 0.017, z * (Wd / 2 + 0.002)], a.car === 'racer' ? s.material('#f2c81e') : chrome, 12); hub.rotation.x = Math.PI / 2;
      }
      for (const z of [-1, 1]) car.ball([0.006, 0.007, 0.007], [L / 2 + 0.002, hood - 0.014, z * 0.02], new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffe9a0', emissiveIntensity: mix(0.1, 0.7, mood.cheer), roughness: 0.2 }), 10);
      car.box([0.004, 0.008, Wd + 0.004], [L / 2 + 0.003, 0.02, 0], chrome);
      car.box([0.004, 0.008, Wd + 0.004], [-L / 2 - 0.003, 0.02, 0], chrome);
      if (a.car === 'racer') {
        const num = car.label(String(1 + Math.floor(random() * 9)), 0.026, 0.026, [0.045, hood + 0.0052, 0], '#1b1b1b', '#ffffff');
        num.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); num.castShadow = false;
        car.box([0.07, 0.0012, 0.012], [0.03, hood + 0.0046, 0], s.material('#ffffff')).castShadow = false;
        car.box([0.012, 0.003, Wd + 0.01], [-L / 2 + 0.006, tail + 0.016, 0], body);
        for (const z of [-1, 1]) car.box([0.006, 0.016, 0.004], [-L / 2 + 0.006, tail + 0.008, z * 0.022], body);
      } else if (a.car === 'fire') {
        for (const z of [-1, 1]) { car.rod([-L / 2 + 0.006, tail + 0.008, z * 0.008 + 0.022], [L / 2 - 0.02, hood + 0.016, z * 0.008 + 0.022], 0.0018, chrome); }
        for (let i = 0; i < 9; i++) { const t = i / 8; car.rod([mix(-L / 2 + 0.01, L / 2 - 0.024, t), mix(tail + 0.008, hood + 0.016, t), 0.014], [mix(-L / 2 + 0.01, L / 2 - 0.024, t), mix(tail + 0.008, hood + 0.016, t), 0.03], 0.0014, chrome); }
        car.ball([0.008, 0.008, 0.008], [0.045, hood + 0.01, -0.012], s.material('#d9b23a', { metalness: 0.8, roughness: 0.3 }), 12);
      } else if (a.car === 'taxi') {
        car.box([0.02, 0.012, 0.034], [0.036, hood + 0.008, 0], new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: '#ffe680', emissiveIntensity: mix(0.2, 0.9, mood.cheer), roughness: 0.4 }));
        for (const z of [-1, 1]) for (let i = 0; i < 12; i++) if (i % 2 === 0) car.box([L / 13, 0.007, 0.0012], [-L / 2 + 0.012 + i * (L / 13), 0.036 - (i % 4 === 0 ? 0 : 0), z * (Wd / 2 + 0.0002)], tyre).castShadow = false;
      } else {
        const spare = car.cylinder(0.016, 0.016, 0.011, [-L / 2 - 0.008, 0.036, 0], tyre, 18); spare.rotation.z = Math.PI / 2;
        const star = car.mesh(new THREE.CircleGeometry(0.012, 5), s.material('#f1ede2'), [0.045, hood + 0.0062, 0]); star.rotation.x = -Math.PI / 2; star.castShadow = false;
        car.box([0.003, 0.026, Wd - 0.014], [0.022, hood + 0.016, 0], chrome).rotation.z = -0.2;
      }
      // Chipped paint on an old toy.
      if (age > 0.4 || mood.wear > 0.6) {
        const chips = Array.from({ length: Math.round(mix(6, 26, Math.max(age, mood.wear))) }, () => ({ at: [(random() - 0.5) * L * 0.9, mix(0.02, hood, random()), (random() < 0.5 ? -1 : 1) * (Wd / 2 + 0.0005)] as [number, number, number], size: mix(0.0015, 0.004, random()) }));
        car.scatter(new THREE.OctahedronGeometry(1, 0), s.material('#8f8d86', { metalness: 0.6, roughness: 0.6 }), chips).castShadow = false;
      }
      car.root.position.set(-0.09, floor, 0.1);
      car.root.rotation.y = mix(0.25, 0.75, random());
    }

    // --- Loose snippets around the base: more on the day, almost none after years.
    const loose = Math.round(mix(30, 2, age) * mix(0.4, 1.4, mood.density));
    if (loose > 0) {
      const curlGeo = new THREE.TorusGeometry(1, 0.16, 4, 10, Math.PI * mix(0.5, 1.7, a.curl));
      const bits = new THREE.InstancedMesh(curlGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), loose);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < loose; i++) {
        dummy.position.set((random() - 0.5) * 0.3, floor + 0.002, mix(0.03, 0.16, random()));
        dummy.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.4, 0, random() * 6.3);
        dummy.scale.setScalar(mix(0.004, 0.009, random()));
        dummy.updateMatrix();
        bits.setMatrixAt(i, dummy.matrix);
        bits.setColorAt(i, hairTint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
      bits.castShadow = true;
      s.root.add(bits);
    }
    if (a.kept === 'drawer') {
      // Other saved things in the tray: a hospital bracelet and a tiny envelope.
      s.ring(0.022, 0.003, [0.13, floor + 0.004, 0.12], s.material('#dfe8f0', { roughness: 0.5 })).rotation.x = Math.PI / 2;
      const env = s.box([0.07, 0.002, 0.045], [-0.125, floor + 0.002, -0.06 + 0.2], s.material('#e3d3a8', { roughness: 0.9 }));
      env.rotation.y = 0.4;
    }

    return s.finish();
  },
});
