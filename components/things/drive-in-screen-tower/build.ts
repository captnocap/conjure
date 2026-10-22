import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, grime, paintTexture, painted, put, write } from './lib';

const NAMES = { starlite: 'STARLITE', skyvue: 'SKY-VUE', moonlight: 'MOONLIGHT', route: 'ROUTE 9', comet: 'COMET' } as const;
type Ctx = CanvasRenderingContext2D;

function western(ctx: Ctx, w: number, h: number, random: () => number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f08a3c'); sky.addColorStop(0.55, '#f7c65a'); sky.addColorStop(1, '#f3dd9a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.5, h * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#a8492c';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.02 + i * 0.27 + random() * 0.08), bw = w * (0.1 + random() * 0.1), bh = h * (0.2 + random() * 0.22), y = h * 0.74;
    ctx.beginPath(); ctx.moveTo(x - bw * 0.2, y); ctx.lineTo(x, y - bh); ctx.lineTo(x + bw, y - bh * (0.9 + random() * 0.15)); ctx.lineTo(x + bw * 1.25, y); ctx.fill();
  }
  ctx.fillStyle = '#4a2318'; ctx.fillRect(0, h * 0.74, w, h * 0.26);
  ctx.fillStyle = '#20100c';
  // Saguaro.
  const cx = w * 0.14, cy = h * 0.8;
  ctx.fillRect(cx - w * 0.008, cy - h * 0.36, w * 0.016, h * 0.36);
  ctx.fillRect(cx - w * 0.03, cy - h * 0.24, w * 0.03, h * 0.025); ctx.fillRect(cx - w * 0.034, cy - h * 0.32, w * 0.01, h * 0.1);
  ctx.fillRect(cx, cy - h * 0.18, w * 0.03, h * 0.025); ctx.fillRect(cx + w * 0.024, cy - h * 0.28, w * 0.01, h * 0.12);
  // Rider on a horse, in silhouette against the sun.
  const rx = w * 0.5, ry = h * 0.7, u = h * 0.085;
  ctx.beginPath(); ctx.ellipse(rx, ry - u * 2, u * 1.6, u * 0.7, 0, 0, 7); ctx.fill();
  for (const leg of [-1.2, -0.8, 0.9, 1.3]) ctx.fillRect(rx + leg * u - u * 0.12, ry - u * 1.8, u * 0.26, u * 2.2);
  ctx.beginPath(); ctx.moveTo(rx + u * 1.1, ry - u * 2.3); ctx.lineTo(rx + u * 2.1, ry - u * 3.7); ctx.lineTo(rx + u * 2.9, ry - u * 3.3); ctx.lineTo(rx + u * 2.5, ry - u * 3); ctx.lineTo(rx + u * 1.7, ry - u * 1.8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(rx - u * 1.5, ry - u * 2.2); ctx.quadraticCurveTo(rx - u * 2.4, ry - u * 2, rx - u * 2.2, ry - u * 0.8); ctx.lineTo(rx - u * 1.9, ry - u * 0.9); ctx.quadraticCurveTo(rx - u * 1.9, ry - u * 1.8, rx - u * 1.3, ry - u * 1.8); ctx.fill();
  ctx.fillRect(rx - u * 0.35, ry - u * 4.3, u * 0.75, u * 1.9);
  ctx.beginPath(); ctx.arc(rx, ry - u * 4.7, u * 0.36, 0, 7); ctx.fill();
  ctx.fillRect(rx - u * 0.8, ry - u * 5.0, u * 1.6, u * 0.14); ctx.fillRect(rx - u * 0.4, ry - u * 5.4, u * 0.8, u * 0.45);
}

function monster(ctx: Ctx, w: number, h: number, random: () => number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#12343a'); sky.addColorStop(1, '#5fae7d');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e9f3c0'; ctx.beginPath(); ctx.arc(w * 0.16, h * 0.24, h * 0.13, 0, 7); ctx.fill();
  // The creature: a hunched lizard with back plates, wading through the skyline.
  const mx = w * 0.6, my = h * 0.95, u = h * 0.1;
  ctx.fillStyle = '#0c1c1b';
  ctx.beginPath(); ctx.ellipse(mx, my - u * 3, u * 2.2, u * 3.4, 0.25, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(mx - u * 2.3, my - u * 6.6, u * 1.5, u * 0.95, -0.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(mx - u * 1.4, my - u * 5.9); ctx.lineTo(mx - u * 0.2, my - u * 6.4); ctx.lineTo(mx + u * 0.9, my - u * 4); ctx.lineTo(mx - u * 1.4, my - u * 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(mx - u * 3.6, my - u * 6.3); ctx.lineTo(mx - u * 2.2, my - u * 5.5); ctx.lineTo(mx - u * 3.3, my - u * 5.6); ctx.fill();
  for (let i = 0; i < 6; i++) { const t = i / 5, px = mx - u * 0.8 + t * u * 3.4, py = my - u * 6.9 + t * t * u * 4.4; ctx.beginPath(); ctx.moveTo(px - u * 0.35, py + u * 0.4); ctx.lineTo(px + u * 0.25, py - u * 0.8); ctx.lineTo(px + u * 0.6, py + u * 0.5); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(mx - u * 1.6, my - u * 4.4); ctx.lineTo(mx - u * 3.5, my - u * 3.6); ctx.lineTo(mx - u * 3.7, my - u * 3.1); ctx.lineTo(mx - u * 1.5, my - u * 3.5); ctx.fill();
  ctx.fillStyle = '#f6e04a'; ctx.beginPath(); ctx.arc(mx - u * 2.6, my - u * 6.9, u * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#10201f';
  for (let x = 0; x < w;) {
    const bw = w * (0.03 + random() * 0.05), bh = h * (0.12 + random() * 0.3);
    ctx.fillStyle = '#10201f'; ctx.fillRect(x, h - bh, bw, bh);
    ctx.fillStyle = '#f6e04a';
    for (let wy = h - bh + 6; wy < h - 6; wy += 12) for (let wx = x + 4; wx < x + bw - 5; wx += 9) if (random() < 0.35) ctx.fillRect(wx, wy, 4, 6);
    x += bw + 2;
  }
  write(ctx, 'IT CAME AT DUSK', w * 0.3, h * 0.56, h * 0.13, '#f6e04a', { outline: '#7a1010', tilt: -0.07, max: w * 0.5 });
}

function intermission(ctx: Ctx, w: number, h: number, random: () => number) {
  ctx.fillStyle = '#1d2f7a'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { ctx.fillStyle = ['#f6d743', '#ff8fb0', '#ffffff'][i % 3]; const x = random() * w, y = random() * h, r = h * 0.012; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); }
  write(ctx, 'INTERMISSION', w * 0.5, h * 0.2, h * 0.2, '#f6d743', { outline: '#c02a2a', max: w * 0.8 });
  // Countdown clock.
  const minutes = 2 + Math.floor(random() * 8);
  const cx = w * 0.5, cy = h * 0.6, r = h * 0.25;
  ctx.fillStyle = '#fdf6dc'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#e2453c'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * 0.92, -Math.PI / 2, -Math.PI / 2 + (minutes / 10) * Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d2f7a'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill();
  write(ctx, String(minutes), cx, cy, r * 0.75, '#fdf6dc');
  write(ctx, 'MINUTES', cx, cy + r * 1.22, h * 0.09, '#fdf6dc');
  // A striped popcorn box and a soda cup marching to the snack bar.
  const bx = w * 0.18, by = h * 0.86;
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#fdf6dc' : '#e2453c'; ctx.beginPath(); ctx.moveTo(bx + (i - 2.5) * h * 0.05, by - h * 0.34); ctx.lineTo(bx + (i - 1.5) * h * 0.05, by - h * 0.34); ctx.lineTo(bx + (i - 1.5) * h * 0.04, by); ctx.lineTo(bx + (i - 2.5) * h * 0.04, by); ctx.fill(); }
  ctx.fillStyle = '#fbe9a0'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(bx + (random() - 0.5) * h * 0.22, by - h * (0.36 + random() * 0.08), h * 0.04, 0, 7); ctx.fill(); }
  const sx = w * 0.82;
  ctx.fillStyle = '#fdf6dc'; ctx.beginPath(); ctx.moveTo(sx - h * 0.09, by - h * 0.36); ctx.lineTo(sx + h * 0.09, by - h * 0.36); ctx.lineTo(sx + h * 0.065, by); ctx.lineTo(sx - h * 0.065, by); ctx.fill();
  ctx.fillStyle = '#e2453c'; ctx.fillRect(sx - h * 0.085, by - h * 0.25, h * 0.17, h * 0.1);
  ctx.strokeStyle = '#fdf6dc'; ctx.lineWidth = h * 0.02; ctx.beginPath(); ctx.moveTo(sx + h * 0.02, by - h * 0.36); ctx.lineTo(sx + h * 0.08, by - h * 0.52); ctx.stroke();
}

function leader(ctx: Ctx, w: number, h: number, random: () => number) {
  ctx.fillStyle = '#b9b6ab'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = h * 0.42;
  ctx.fillStyle = '#8f8c82'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, w, -Math.PI / 2, -Math.PI / 2 + (0.2 + random() * 0.7) * Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2b2a'; ctx.lineWidth = h * 0.012;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  for (const k of [1, 0.82]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 7); ctx.stroke(); }
  write(ctx, String(2 + Math.floor(random() * 7)), cx, cy + h * 0.02, h * 0.6, '#2b2b2a');
  for (let i = 0; i < 14; i++) { ctx.strokeStyle = 'rgba(30,30,30,0.5)'; ctx.lineWidth = 1 + random() * 2; const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (random() - 0.5) * 8, h); ctx.stroke(); }
}

function theEnd(ctx: Ctx, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.6);
  g.addColorStop(0, '#8c8a86'); g.addColorStop(1, '#1b1b1d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  write(ctx, 'The End', w / 2, h * 0.5, h * 0.36, '#f5f1e4', { font: 'italic bold', face: 'Georgia, serif', max: w * 0.7 });
  ctx.strokeStyle = '#f5f1e4'; ctx.lineWidth = h * 0.012; ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.74); ctx.quadraticCurveTo(w * 0.5, h * 0.8, w * 0.7, h * 0.74); ctx.stroke();
}

export default defineThing({
  questions: {
    structure: choice('How is the screen held up?', {
      truss: 'An open steel truss of columns, girts and raking back legs, sky showing through.',
      tower: 'An enclosed wedge-shaped screen tower clad in sheet metal, with the theatre name painted under the screen.',
      timber: 'A home-built frame of creosoted telephone poles and plank bracing.',
    }),
    playing: choice('What is on the screen right now?', {
      western: 'A western: a lone rider crossing in front of a huge setting sun and red mesas.',
      monster: 'A monster movie: a giant lizard wading through a city skyline under a sickly green sky.',
      intermission: 'The intermission reel: a countdown clock, dancing popcorn and a soda cup.',
      leader: 'Film leader: a grey countdown number in a crosshair circle, the show about to start.',
      the_end: 'The words "The End" in white script on fading grey.',
      blank: 'Nothing. A bare white face waiting for dark, or for nobody.',
    }),
    panels: choice('Are any of the screen panels missing?', {
      intact: 'Every panel is in place.',
      few: 'A handful blew out in a storm, leaving dark gaps and one hanging by a corner.',
      gutted: 'Half the face is gone and the frame shows through like ribs.',
    }),
    width: score('How big is the screen?', ['A small-town single screen', 'A standard lot screen', 'An enormous CinemaScope wall']),
    crown: choice('What runs along the top of the screen?', {
      none: 'Nothing but the top edge.',
      name: 'The theatre name in big freestanding letters.',
      stars: 'A row of star shapes studded with bulbs.',
      horns: 'A cluster of big horn loudspeakers from before window speakers.',
    }),
    name: choice('What is the drive-in called, where its name shows?', {
      starlite: 'Starlite.', skyvue: 'Sky-Vue.', moonlight: 'Moonlight.', route: 'Route 9.', comet: 'Comet.',
    }),
    foot: choice('What is at the foot of the screen?', {
      bare: 'Bare gravel and a few weeds.',
      playground: 'A little playground: a swing set and a seesaw for kids before the show.',
      fence: 'A low white rail fence keeping cars back.',
      garden: 'A clipped hedge and a flower bed somebody still tends.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rust = (colour: string, amount = 0.5) => new THREE.Color(colour).lerp(new THREE.Color('#7a4a2e'), mood.wear * amount);
    const W = Math.round(mix(13, 25, a.width)), H = W / (a.playing === 'blank' && a.structure === 'timber' ? 1.8 : 2.15);
    const lift = a.structure === 'tower' ? 4.2 : mix(3.2, 5, a.width);
    const top = lift + H;
    const cols = Math.round(W / 1.8), rows = Math.max(4, Math.round(H / 1.7));

    // The picture, with age painted over it.
    const showing = a.playing !== 'blank';
    const map = paintTexture(1024, 1024 / (W / H), (ctx, w, h) => {
      if (a.playing === 'western') western(ctx, w, h, random);
      else if (a.playing === 'monster') monster(ctx, w, h, random);
      else if (a.playing === 'intermission') intermission(ctx, w, h, random);
      else if (a.playing === 'leader') leader(ctx, w, h, random);
      else if (a.playing === 'the_end') theEnd(ctx, w, h);
      else { ctx.fillStyle = mood.wear > 0.5 ? '#e4e0d2' : '#f6f5ef'; ctx.fillRect(0, 0, w, h); }
      if (showing) { ctx.fillStyle = `rgba(245,243,235,${mix(0.12, 0.3, 1 - Math.abs(mood.daylight - 0.5) * 2)})`; ctx.fillRect(0, 0, w, h); }
      ctx.strokeStyle = 'rgba(40,40,40,0.16)'; ctx.lineWidth = 1.5;
      for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo((c / cols) * w, 0); ctx.lineTo((c / cols) * w, h); ctx.stroke(); }
      for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, (r / rows) * h); ctx.lineTo(w, (r / rows) * h); ctx.stroke(); }
      grime(ctx, w, h, mood.wear * (showing ? 0.6 : 1), random, '96,84,60');
      // Peeling paint: grey patches along seams.
      for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = `rgba(150,146,134,${0.4 + random() * 0.4})`; const x = Math.floor(random() * cols) / cols * w, y = random() * h; ctx.beginPath(); ctx.ellipse(x + (random() - 0.5) * 20, y, 6 + random() * 22, 10 + random() * 40, random(), 0, 7); ctx.fill(); }
    });
    const glow = showing ? mix(0.95, 0.6, 1 - Math.abs(mood.daylight - 0.5) * 2) : 0.12;
    const face = new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow, roughness: 0.9 });
    const backing = s.material(rust('#8f9590', 0.5), { roughness: 0.9, side: THREE.BackSide });

    const chance = { intact: 0, few: 0.07, gutted: 0.42 }[a.panels] * mix(0.8, 1.3, mood.wear);
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    const gaps: [number, number][] = [];
    const hotC = random() * cols, hotR = rows * (0.4 + random() * 0.6);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const near = 1.6 - Math.min(1, Math.hypot((c - hotC) / cols * 2, (r - hotR) / rows));
      if (random() < chance * near) { gaps.push([c, r]); continue; }
      const x0 = -W / 2 + (c / cols) * W, x1 = -W / 2 + ((c + 1) / cols) * W, y0 = lift + (r / rows) * H, y1 = lift + ((r + 1) / rows) * H;
      const base = positions.length / 3;
      positions.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
      uvs.push(c / cols, r / rows, (c + 1) / cols, r / rows, (c + 1) / cols, (r + 1) / rows, c / cols, (r + 1) / rows);
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    if (a.panels !== 'intact' && !gaps.length) gaps.push([Math.floor(random() * cols), rows - 1]);
    const sheet = new THREE.BufferGeometry();
    sheet.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    sheet.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    sheet.setIndex(index);
    sheet.computeVertexNormals();
    const faceZ = 0.32;
    s.mesh(sheet, face, [0, 0, faceZ]);
    s.mesh(sheet.clone(), backing, [0, 0, faceZ - 0.02]);
    // A panel or two still hanging by one corner.
    const loose = s.material('#dcd8ca', { roughness: 0.9, side: THREE.DoubleSide });
    for (const [c, r] of gaps.slice(0, a.panels === 'few' ? 1 : 3)) {
      if (r < 1) continue;
      const pw = W / cols, ph = H / rows;
      const hang = new THREE.Group();
      put(hang, new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), loose), [pw / 2, -ph / 2, 0]);
      hang.rotation.z = -0.5 - random() * 0.9;
      hang.rotation.x = 0.15;
      put(s.root, hang, [-W / 2 + (c / cols) * W, lift + ((r + 1) / rows) * H, faceZ + 0.05]);
    }
    // A few fallen panels lie at the foot.
    if (a.panels === 'gutted') for (let i = 0; i < 4; i++) {
      const slab = s.box([W / cols, 0.04, H / rows], [(random() - 0.5) * W * 0.8, 0.03 + i * 0.03, 1.5 + random() * 2.5], loose);
      slab.rotation.y = random() * 3;
      slab.rotation.z = (random() - 0.5) * 0.2;
    }

    const steel = s.material(rust(a.structure === 'timber' ? '#5a4332' : '#7f8a8c', a.structure === 'timber' ? 0.1 : 0.7), { roughness: 0.75, metalness: a.structure === 'timber' ? 0 : 0.4 });
    const depth = top * 0.42;
    if (a.structure === 'tower') {
      // Enclosed wedge: vertical front, raking back, clad in sheet metal.
      const cladColour = mood.cheer > 0.55 ? '#e9dfc2' : mood.warmth > 0.5 ? '#cfc4a6' : '#b8c4bf';
      const side = new THREE.Shape();
      side.moveTo(0, 0); side.lineTo(0, top + 0.5); side.lineTo(-1.2, top + 0.5); side.lineTo(-depth, 0); side.closePath();
      const stripes = paintTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = cladColour; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 8) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x, 0, 3, h); }
        grime(ctx, w, h, mood.wear, random, '122,74,46');
      });
      stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
      stripes.repeat.set(0.25, 0.12);
      const body = new THREE.ExtrudeGeometry(side, { depth: W + 0.8, bevelEnabled: false });
      body.rotateY(-Math.PI / 2);
      body.translate((W + 0.8) / 2, 0, 0);
      const clad = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8 });
      s.mesh(body, clad, [0, 0, 0.2]);
      clad.side = THREE.DoubleSide;
      // White surround and the name on the skirt below the picture.
      const trim = s.material('#f1eee2', { roughness: 0.85 });
      s.box([W + 0.8, 0.5, 0.1], [0, top + 0.25, 0.27], trim);
      for (const x of [-1, 1]) s.box([0.4, H + 0.5, 0.1], [x * (W / 2 + 0.2), lift + H / 2, 0.27], trim);
      const accent = mood.cheer > 0.5 ? '#c5372c' : '#2c5a78';
      const skirt = painted(W + 0.8, lift, (ctx, w, h) => {
        ctx.fillStyle = cladColour; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = accent; ctx.fillRect(0, h * 0.08, w, h * 0.06); ctx.fillRect(0, h * 0.86, w, h * 0.06);
        write(ctx, `${NAMES[a.name]} DRIVE-IN`, w / 2, h * 0.5, h * 0.42, accent, { max: w * 0.84 });
        grime(ctx, w, h, mood.wear, random, '122,74,46');
      }, { px: 768 });
      put(s.root, skirt, [0, lift / 2, 0.23]);
      s.box([0.9, 2, 0.06], [W / 2 - 1.4, 1, 0.24], s.material(accent, { roughness: 0.7 }));
    } else {
      const n = Math.max(4, Math.round(W / 3.2));
      const thick = a.structure === 'timber' ? 0.16 : 0.11;
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + 0.4 + (i / (n - 1)) * (W - 0.8);
        const lean = a.structure === 'timber' ? (random() - 0.5) * 0.3 : 0;
        s.rod([x, 0, 0], [x, top + (a.structure === 'timber' ? random() * 0.6 : 0.1), 0], thick, steel);
        s.rod([x + lean, 0, -depth], [x, top - 0.4, -0.1], thick * 0.85, steel);
        s.rod([x + lean / 2, 0, -depth * 0.55], [x, top * 0.5, -0.1], thick * 0.7, steel);
        if (a.structure === 'truss') {
          s.rod([x, top * 0.5, 0], [x, top * 0.5 - 0.2, -depth * 0.5 + 0.2], thick * 0.5, steel);
          s.rod([x, 0.2, 0], [x, top * 0.5 - 0.2, -depth * 0.5 + 0.2], thick * 0.5, steel);
        }
      }
      const girts = Math.round(top / 2.2);
      for (let g = 1; g <= girts; g++) s.box([W, a.structure === 'timber' ? 0.22 : 0.12, 0.1], [0, (g / girts) * top, 0.16], steel);
      s.box([W, 0.12, 0.12], [0, top * 0.46, -depth * 0.52], steel);
      if (a.structure === 'truss') for (let i = 0; i < n - 1; i++) {
        const x0 = -W / 2 + 0.4 + (i / (n - 1)) * (W - 0.8), x1 = -W / 2 + 0.4 + ((i + 1) / (n - 1)) * (W - 0.8);
        s.rod([x0, i % 2 ? 0.2 : lift, 0.05], [x1, i % 2 ? lift : 0.2, 0.05], 0.045, steel);
      }
      // A white-painted border board round the picture.
      const trim = s.material(rust('#efece0', 0.2), { roughness: 0.9 });
      s.box([W + 0.3, 0.3, 0.08], [0, lift - 0.15, faceZ - 0.06], trim);
    }

    // Crown.
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#ffcf6a', emissiveIntensity: mix(0.8, 2, mood.cheer) });
    const crownY = top + (a.structure === 'tower' ? 0.5 : 0.15);
    if (a.crown === 'name') {
      const text = NAMES[a.name];
      const letter = Math.min(2.2, (W * 0.8) / text.length);
      const neon = mood.warmth > 0.5 ? '#ff5a3c' : '#4fd6e8';
      const sign = painted(text.length * letter, letter * 1.25, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const drop = Math.floor(random() * text.length);
        [...text].forEach((glyph, i) => {
          if (mood.wear > 0.65 && i === drop) return;
          write(ctx, glyph, (i + 0.5) * (w / text.length), h * 0.55, h * 0.86, neon, { outline: '#3a1c12' });
        });
      }, { px: 768, cutout: true, glow: mix(0.5, 1.1, mood.cheer) });
      put(s.root, sign, [0, crownY + letter * 0.62, 0.2]);
      for (let i = 0; i <= 6; i++) s.rod([-text.length * letter * 0.45 + i * text.length * letter * 0.15, crownY, 0.1], [-text.length * letter * 0.45 + i * text.length * letter * 0.15, crownY + letter * 0.5, 0.15], 0.04, steel);
    }
    if (a.crown === 'stars') {
      const star = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const ang = k * Math.PI / 5 + Math.PI / 2, r = k % 2 ? 0.32 : 0.75; if (k) star.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); else star.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); }
      const starGeometry = new THREE.ExtrudeGeometry(star, { depth: 0.12, bevelEnabled: false });
      const count = Math.max(3, Math.round(W / 4));
      const gold = s.material(mood.cheer > 0.5 ? '#e8b730' : '#b9b4a2', { metalness: 0.4, roughness: 0.45, emissive: '#e8b730', emissiveIntensity: mood.cheer * 0.5 });
      for (let i = 0; i < count; i++) {
        const x = -W / 2 + (i + 0.5) * (W / count), big = i === Math.floor(count / 2) ? 1.5 : 1;
        const m = s.mesh(starGeometry, gold, [x, crownY + 0.9 * big, 0.1]);
        m.scale.setScalar(big);
        m.rotation.z = (random() - 0.5) * mood.wear * 0.8;
        s.rod([x, crownY, 0.14], [x, crownY + 0.5, 0.14], 0.04, steel);
        s.ball([0.09, 0.09, 0.09], [x, crownY + 0.9 * big, 0.26], bulb, 8);
      }
    }
    if (a.crown === 'horns') {
      const horn = s.material(rust('#9aa09a', 0.6), { metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide });
      for (const x of [-W * 0.3, 0, W * 0.3]) {
        s.rod([x, crownY, 0], [x, crownY + 0.7, 0], 0.06, steel);
        for (const turn of [-0.5, 0.5]) {
          const bell = s.mesh(new THREE.ConeGeometry(0.7, 1.3, 18, 1, true), horn, [x + turn * 1.0, crownY + 1.0, 0.6]);
          bell.rotation.set(-Math.PI / 2 - 0.2, 0, -turn * 0.5);
        }
      }
    }

    // Foot of the screen.
    const frontZ = 3.2;
    if (a.foot === 'fence') {
      const white = s.material(rust('#f0ede4', 0.25), { roughness: 0.9 });
      const posts = Math.round(W / 2);
      for (let i = 0; i <= posts; i++) {
        if (mood.wear > 0.6 && random() < 0.2) continue;
        s.box([0.12, 0.9, 0.12], [-W / 2 + (i / posts) * W, 0.45, frontZ], white).rotation.z = (random() - 0.5) * mood.wear * 0.3;
      }
      for (const y of [0.45, 0.8]) s.box([W, 0.1, 0.05], [0, y, frontZ + 0.06], white);
    }
    if (a.foot === 'garden') {
      s.mesh(new THREE.BoxGeometry(W * 0.9, 0.7, 0.8, 12, 2, 2), s.material(mood.wear > 0.6 ? '#7d7a4a' : '#4e7d4a', { roughness: 1 }), [0, 0.35, frontZ - 1]);
      s.box([W * 0.9, 0.12, 1.2], [0, 0.06, frontZ], s.material('#5a4636', { roughness: 1 }));
      const blooms = Array.from({ length: Math.round(mix(20, 90, mood.density)) }, () => ({ at: [(random() - 0.5) * W * 0.86, 0.2 + random() * 0.15, frontZ + (random() - 0.5) * 1] as P3, size: 0.09 + random() * 0.08, color: ['#e8475f', '#f2d23c', '#f4f1e6', '#e87ac0'][Math.floor(random() * 4)] }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.7 }), blooms);
    }
    if (a.foot === 'playground') {
      const pipe = s.material(rust(mood.cheer > 0.5 ? '#d8433a' : '#6f8fa8', 0.5), { metalness: 0.3, roughness: 0.5 });
      const sx = -W * 0.2, sw = 3.4, sh = 2.6;
      for (const x of [sx - sw / 2, sx + sw / 2]) for (const z of [-1, 1]) s.rod([x, 0, frontZ + z * 0.9], [x, sh, frontZ], 0.05, pipe);
      s.rod([sx - sw / 2, sh, frontZ], [sx + sw / 2, sh, frontZ], 0.05, pipe);
      const chain = s.material('#3a3c3e', { metalness: 0.6 });
      for (const k of [-0.8, 0.8]) {
        const swing = put(s.root, new THREE.Group(), [sx + k, sh, frontZ]);
        const broken = mood.wear > 0.7 && k > 0;
        for (const cx of [-0.22, 0.22]) put(swing, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, broken && cx > 0 ? 0.7 : 1.9, 5), chain), [cx, broken && cx > 0 ? -0.35 : -0.95, 0]);
        const seat = put(swing, new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.2), s.material('#2c2c2e')), [0, -1.9, 0]);
        if (broken) { seat.rotation.z = 1.2; seat.position.set(-0.22, -2.15, 0); }
        swing.rotation.x = (random() - 0.5) * mix(0.1, 0.9, mood.energy);
      }
      const seesaw = put(s.root, new THREE.Group(), [W * 0.22, 0, frontZ]);
      put(seesaw, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 3), pipe), [0, 0.3, 0]).rotation.x = Math.PI / 2;
      const plank = put(seesaw, new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 0.3), s.material(mood.cheer > 0.5 ? '#f0c53a' : '#b0a78c')), [0, 0.6, 0]);
      plank.rotation.z = random() < 0.5 ? 0.3 : -0.3;
    }
    if (a.foot === 'bare' || mood.wear > 0.55) {
      const tufts = Array.from({ length: Math.round(mix(8, 40, mood.wear)) }, () => ({ at: [(random() - 0.5) * W, 0.1, (random() - 0.3) * 4] as P3, size: 0.3 + random() * 0.5, color: random() < 0.5 ? '#8c8a55' : '#657c48' }));
      s.scatter(new THREE.ConeGeometry(0.22, 1.1, 4), s.material('#ffffff', { roughness: 1 }), tufts);
    }

    const flicker = mix(0.02, 0.14, mood.energy);
    return s.finish({
      footprint: W * 0.5,
      update: (_dt, time) => {
        if (showing) face.emissiveIntensity = glow * (1 + Math.sin(time * 23) * flicker * 0.5 + Math.sin(time * 7.3) * flicker);
      },
    });
  },
});
