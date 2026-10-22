import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function cushion() {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = Math.sign(p.getX(i)) * Math.abs(p.getX(i)) ** 0.55;
    const z = Math.sign(p.getZ(i)) * Math.abs(p.getZ(i)) ** 0.55;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    p.setXYZ(i, x, p.getY(i) * (1 - 0.7 * edge ** 3), z);
  }
  g.computeVertexNormals();
  return g;
}

const SCREENS = {
  message: 'A chat window with a long message typed out and never sent.',
  spreadsheet: 'A spreadsheet of green-headed cells, a budget that does not add up.',
  film: 'A paused film: a letterboxed sunset frame with the pause bars over it.',
  jobs: 'A page of job listings, a column of cards each with an apply button.',
  blank: 'A blank white document with one blinking cursor.',
  call: 'A video call: one face in a window, or nobody picking up.',
  terminal: 'A black terminal of green text scrolling past.',
  crash: 'A flat blue crash screen with a sad face.',
} as const;

export default defineThing({
  questions: {
    screen: choice('What is on the screen?', SCREENS),
    perch: choice('What is the laptop balanced on?', {
      pillow: 'A bed pillow, sinking into it at an angle.',
      box: 'A taped cardboard moving box still labelled from the move.',
      books: 'A stack of heavy textbooks.',
      stool: 'A small wooden step stool.',
      floor: 'Nothing: it sits flat on the bare surface.',
    }),
    body: choice('What kind of laptop is it?', {
      silver: 'A slim silver aluminium one.',
      black: 'A thick black office laptop, issued by an employer.',
      white: 'An old chunky white plastic one, yellowing.',
      pink: 'A cheap pastel pink one.',
    }),
    stickers: choice('What is stuck on the lid and palm rest?', {
      none: 'Nothing, clean.',
      few: 'Three or four band and skate stickers.',
      covered: 'Plastered edge to edge with overlapping stickers.',
      asset: 'One white barcode asset tag from an IT department.',
    }),
    lid: score('How far is the lid open?', ['Barely cracked, light leaking out of the gap', 'Upright at a normal working angle', 'Pushed right back, nearly flat']),
    dying: noul('Is the battery about to die, with the charger nowhere plugged in?'),
    company: choice('What keeps it company?', {
      headphones: 'A pair of over-ear headphones lying beside it.',
      mug: 'A mug of tea gone cold.',
      noodles: 'A cup of instant noodles with a fork standing in it.',
      tissues: 'A scatter of crumpled tissues.',
      nothing: 'Nothing else.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const thick = a.body === 'black' || a.body === 'white';
    const W = thick ? 0.36 : 0.325, D = thick ? 0.25 : 0.225, T = thick ? 0.026 : 0.014, LT = thick ? 0.012 : 0.006;
    const shell = { silver: '#c3c7cc', black: '#24262a', white: mood.wear > 0.5 ? '#ddd3b4' : '#e8e6de', pink: '#eab4c4' }[a.body];
    const body = s.material(shell, { metalness: a.body === 'silver' ? 0.7 : 0.05, roughness: a.body === 'silver' ? 0.35 : 0.6 });
    const sat = mix(0.6, 1.1, mood.cheer);
    const amber = mood.warmth * 0.28;

    // ----- Perch -----
    let perchTop = 0, tiltX = 0, tiltZ = 0;
    if (a.perch === 'pillow') {
      const m = s.mesh(cushion(), s.material(pick(['#e9e6dd', '#c9d3e0', '#e3d1c9', '#bfc4c2']), { roughness: 1 }), [0, 0.085, 0]);
      m.scale.set(0.36, 0.085, 0.25);
      m.rotation.y = (random() - 0.5) * 0.4;
      perchTop = 0.158; tiltX = 0.05 + random() * 0.07; tiltZ = (random() - 0.5) * 0.16;
    } else if (a.perch === 'box') {
      const bw = 0.46, bh = 0.3 + random() * 0.08, bd = 0.36;
      const card = s.material('#b98d5c', { roughness: 0.95 });
      const box = s.box([bw, bh, bd], [0, bh / 2, 0], card);
      const word = pick(['KITCHEN', 'BOOKS', 'MISC', 'FRAGILE', 'BEDROOM', 'KEEP']);
      const tag = paint(256, 160, (ctx, w, h) => {
        ctx.fillStyle = '#b98d5c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(90,60,30,0.25)'; for (let i = 0; i < 40; i++) ctx.fillRect(0, i * 4, w, 1);
        ctx.fillStyle = '#1d1d22'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
        ctx.save(); ctx.translate(w / 2, h / 2 + 12); ctx.rotate((random() - 0.5) * 0.2); ctx.fillText(word, 0, 0, 230); ctx.restore();
        ctx.strokeStyle = '#1d1d22'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(40, h - 30); ctx.lineTo(w - 50, h - 24); ctx.stroke();
      });
      const front = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.96, bh * 0.92), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.95 }));
      front.position.set(0, 0, bd / 2 + 0.001);
      box.add(front);
      const tape = s.material('#d7c08a', { roughness: 0.35 });
      s.box([bw + 0.004, 0.003, 0.055], [0, bh + 0.0015, 0], tape);
      s.box([0.004, 0.09, 0.055], [bw / 2 + 0.002, bh - 0.045, 0], tape);
      s.box([0.004, 0.09, 0.055], [-bw / 2 - 0.002, bh - 0.045, 0], tape);
      if (mood.wear > 0.4) { const flap = s.box([bw * 0.5, 0.004, 0.14], [bw * 0.2, bh + 0.03, -bd / 2 - 0.04], card); flap.rotation.x = 0.7; }
      box.rotation.y = (random() - 0.5) * 0.25;
      perchTop = bh + 0.003;
    } else if (a.perch === 'books') {
      const n = 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const t = 0.035 + random() * 0.03;
        const cover = s.material(new THREE.Color().setHSL(random(), 0.5 * sat, 0.36 + random() * 0.15));
        const b = s.box([0.3 + random() * 0.06, t, 0.24 + random() * 0.03], [(random() - 0.5) * 0.04, perchTop + t / 2, (random() - 0.5) * 0.03], cover);
        b.rotation.y = (random() - 0.5) * 0.35;
        b.add(new THREE.Mesh(new THREE.BoxGeometry(0.29, t * 0.74, 0.232), s.material('#efe8d4')).translateX(0.012));
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.004, t * 0.5, 0.2), s.material('#f1ead0'));
        band.position.x = -0.16; b.add(band);
        perchTop += t;
      }
    } else if (a.perch === 'stool') {
      const wood = s.material('#b78a55', { roughness: 0.8 });
      s.box([0.42, 0.025, 0.3], [0, 0.2875, 0], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.2, 0, z * 0.14], [x * 0.17, 0.276, z * 0.11], 0.016, wood, 0.014);
      for (const z of [-1, 1]) s.rod([-0.19, 0.1, z * 0.13], [0.19, 0.1, z * 0.13], 0.009, wood);
      perchTop = 0.3;
    }

    // ----- The laptop itself -----
    const lap = new THREE.Group();
    lap.position.set(0, perchTop, 0);
    lap.rotation.set(tiltX, (random() - 0.5) * 0.3, tiltZ);
    s.root.add(lap);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = lap) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };

    add(new THREE.Mesh(new THREE.BoxGeometry(W, T, D), body)).position.y = T / 2;
    const keyTone = a.body === 'white' ? '#f3f1ea' : a.body === 'pink' ? '#f7e6ec' : '#17181b';
    const deck = paint(512, 352, (ctx, w, h) => {
      ctx.fillStyle = shell; ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) {
        if (mood.wear > 0.6 && random() < 0.03) continue;
        ctx.fillStyle = keyTone;
        ctx.fillRect(22 + c * 33.6, 26 + r * 34, r === 4 && c > 3 && c < 9 ? 33.6 : 28, 28);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(w / 2 - 90, 214, 180, 118);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(w / 2 - 90, 214, 180, 118);
      if (a.stickers === 'few' || a.stickers === 'covered') {
        const n = a.stickers === 'few' ? 1 : 4;
        for (let i = 0; i < n; i++) { ctx.fillStyle = `hsl(${random() * 360},${70 * sat}%,55%)`; ctx.beginPath(); ctx.arc(i % 2 ? 60 + random() * 70 : w - 60 - random() * 70, 250 + random() * 60, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect((i % 2 ? 50 : w - 110) + random() * 40, 262, 30, 6); }
      }
      // The glow of the screen falls on the keys.
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      g.addColorStop(0, 'rgba(170,205,255,0.35)'); g.addColorStop(1, 'rgba(170,205,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    const deckMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(W * 0.97, D * 0.97), new THREE.MeshStandardMaterial({ map: deck, roughness: 0.6 })));
    deckMesh.rotation.x = -Math.PI / 2;
    deckMesh.position.y = T + 0.0006;

    const angle = mix(1.25, 2.15, a.lid) + (random() - 0.5) * 0.12; // radians from closed
    const lid = new THREE.Group();
    lid.position.set(0, T, -D / 2 + 0.004);
    lid.rotation.x = Math.PI / 2 - angle;
    lap.add(lid);
    const LH = D - 0.004;
    add(new THREE.Mesh(new THREE.BoxGeometry(W, LH, LT), body), lid).position.y = LH / 2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(T * 0.3, T * 0.3, W * 0.8, 10), s.material('#2b2d31')), lap).rotateZ(Math.PI / 2).position.set(0, T, -D / 2 + 0.004);

    const dim = a.dying ? 0.6 : 1;
    const clock = pick(['3:07', '2:48', '4:12', '3:33', '1:59']);
    const screen = paint(512, 320, (ctx, w, h) => {
      ctx.textBaseline = 'middle';
      const bar = (x: number, y: number, bw: number, bh: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, bw, bh); };
      if (a.screen === 'message') {
        bar(0, 0, w, h, '#f4f6fa'); bar(0, 0, w, 40, '#3a66d8');
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(28, 20, 12, 0, 7); ctx.fill(); bar(50, 14, 110, 12, '#fff');
        bar(24, 56, 190, 34, '#dfe3ea'); bar(24, 98, 120, 34, '#dfe3ea');
        ctx.fillStyle = '#9aa2b0'; ctx.font = '15px monospace'; ctx.fillText('seen ' + pick(['Tuesday', '9 days ago', 'in March', 'yesterday']), 24, 146);
        // The draft, long and unsent.
        bar(150, 164, w - 174, 108, '#ffffff'); ctx.strokeStyle = '#3a66d8'; ctx.lineWidth = 3; ctx.strokeRect(150, 164, w - 174, 108);
        const lines = 3 + Math.floor(random() * 2);
        for (let i = 0; i < lines; i++) bar(162, 178 + i * 21, i === lines - 1 ? 90 + random() * 120 : w - 200 - random() * 30, 10, '#59606d');
        bar(162 + 220, 178 + (lines - 1) * 21 - 3, 3, 16, '#111');
        bar(w - 104, 282, 80, 28, '#3a66d8'); ctx.fillStyle = '#fff'; ctx.font = 'bold 17px monospace'; ctx.fillText('SEND', w - 88, 297);
      } else if (a.screen === 'spreadsheet') {
        bar(0, 0, w, h, '#ffffff'); bar(0, 0, w, 34, '#1f7a45'); bar(0, 34, w, 26, '#e7efe9');
        ctx.strokeStyle = '#c3cbc6'; ctx.lineWidth = 1;
        for (let x = 40; x < w; x += 78) { ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 60; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let r = 0; r < 10; r++) for (let c = 0; c < 3; c++) if (random() < 0.8) bar(48 + c * 78, 68 + r * 24, 20 + random() * 44, 9, c === 2 && random() < 0.5 ? '#c8372d' : '#4b5560');
        bar(40, 60 + 10 * 24, 234, 24, '#fbe3e0'); bar(204, 68 + 10 * 24, 60, 10, '#c8372d');
        for (let i = 0; i < 6; i++) { const bh = 30 + random() * 130; bar(300 + i * 32, 280 - bh, 22, bh, i > 3 ? '#c8372d' : '#2f9e5b'); }
      } else if (a.screen === 'film') {
        bar(0, 0, w, h, '#050506');
        const sky = ctx.createLinearGradient(0, 40, 0, 250);
        sky.addColorStop(0, '#2a2350'); sky.addColorStop(0.55, '#d8603a'); sky.addColorStop(1, '#f3b54a');
        ctx.fillStyle = sky; ctx.fillRect(0, 44, w, 220);
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(w * (0.3 + random() * 0.4), 206, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#17131f'; ctx.beginPath(); ctx.moveTo(0, 264); ctx.lineTo(0, 220); ctx.quadraticCurveTo(140, 180, 260, 226); ctx.quadraticCurveTo(400, 200, w, 232); ctx.lineTo(w, 264); ctx.fill();
        for (const x of [w * 0.56, w * 0.63]) { ctx.beginPath(); ctx.arc(x, 186, 9, 0, 7); ctx.fill(); ctx.fillRect(x - 8, 194, 16, 44); }
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(w / 2 - 26, 118, 18, 60); ctx.fillRect(w / 2 + 8, 118, 18, 60);
        bar(24, 288, w - 48, 5, '#555'); bar(24, 288, (w - 48) * (0.2 + random() * 0.7), 5, '#e23a2e');
      } else if (a.screen === 'jobs') {
        bar(0, 0, w, h, '#eef1f5'); bar(0, 0, w, 38, '#0f4c8a'); bar(16, 11, 150, 16, '#ffffff'); bar(w - 120, 9, 100, 20, '#f2a23a');
        for (let i = 0; i < 4; i++) {
          const y = 50 + i * 66; bar(16, y, w - 32, 56, '#ffffff');
          bar(28, y + 10, 150 + random() * 120, 12, '#0f4c8a'); bar(28, y + 32, 90 + random() * 100, 8, '#8a93a0');
          const seen = random() < 0.4;
          bar(w - 112, y + 14, 84, 28, seen ? '#c9ced6' : '#2f9e5b');
          ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.fillText(seen ? 'CLOSED' : 'APPLY', w - 102, y + 29);
        }
      } else if (a.screen === 'blank') {
        bar(0, 0, w, h, '#d5d8dd'); bar(0, 0, w, 30, '#2b579a'); bar(0, 30, w, 24, '#f1f2f4');
        for (let i = 0; i < 9; i++) bar(14 + i * 34, 37, 22, 10, '#a7adb6');
        bar(96, 66, w - 192, h, '#ffffff');
        bar(126, 96, 3, 22, '#111111');
        ctx.fillStyle = '#9aa2b0'; ctx.font = '15px monospace'; ctx.fillText('0 words', 14, h - 12);
      } else if (a.screen === 'call') {
        bar(0, 0, w, h, '#1c1f26');
        const answered = random() < 0.5;
        ctx.fillStyle = answered ? '#3d5a73' : '#2a2e37'; ctx.fillRect(20, 20, w - 40, h - 80);
        ctx.fillStyle = answered ? '#e2b79a' : '#565c69'; ctx.beginPath(); ctx.arc(w / 2, 118, 46, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w / 2, 250, 96, 70, 0, Math.PI, 0); ctx.fill();
        if (!answered) { ctx.fillStyle = '#c8ccd4'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText('calling...', w / 2, 40); ctx.textAlign = 'left'; }
        bar(w - 130, h - 150, 100, 66, '#0d0f13'); ctx.fillStyle = '#6f7785'; ctx.beginPath(); ctx.arc(w - 80, h - 122, 14, 0, 7); ctx.fill();
        ctx.fillStyle = '#e23a2e'; ctx.beginPath(); ctx.arc(w / 2, h - 30, 20, 0, 7); ctx.fill();
        ctx.fillStyle = '#3b4250'; ctx.beginPath(); ctx.arc(w / 2 - 60, h - 30, 16, 0, 7); ctx.arc(w / 2 + 60, h - 30, 16, 0, 7); ctx.fill();
      } else if (a.screen === 'terminal') {
        bar(0, 0, w, h, '#07100a');
        for (let i = 0; i < 13; i++) { let x = 12; const words = 1 + Math.floor(random() * 6); for (let k = 0; k < words; k++) { const len = 14 + random() * 70; bar(x, 12 + i * 22, len, 9, i === 9 ? '#e0483a' : k === 0 ? '#7df29a' : '#2fa551'); x += len + 9; } }
        bar(12, 12 + 13 * 22, 12, 12, '#7df29a');
      } else {
        bar(0, 0, w, h, '#1d5fd0'); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 110px monospace'; ctx.fillText(':(', 46, 96);
        for (let i = 0; i < 4; i++) bar(50, 176 + i * 24, 260 + random() * 150, 10, '#ffffff');
        bar(50, 282, 60, 10, '#ffffff');
      }
      if (a.screen !== 'film' && a.screen !== 'crash' && a.screen !== 'terminal' && a.screen !== 'call') { ctx.fillStyle = '#39404b'; ctx.font = 'bold 14px monospace'; ctx.fillText(clock, w - 58, h - 10); }
      if (a.dying) {
        bar(w - 190, 46, 174, 50, '#1a1a1e'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(w - 178, 60, 44, 22); bar(w - 134, 66, 5, 10, '#ffffff'); bar(w - 174, 64, 7, 14, '#e23a2e');
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px monospace'; ctx.fillText(`${1 + Math.floor(random() * 4)}%`, w - 116, 72);
      }
      ctx.fillStyle = `rgba(255,150,40,${amber})`; ctx.fillRect(0, 0, w, h);
      if (mood.wear > 0.55) {
        const cx = random() < 0.5 ? 30 : w - 30, cy = random() < 0.5 ? 20 : h - 20;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx, cy); let x = cx, y = cy; for (let k = 0; k < 4; k++) { x += (w / 2 - cx) * 0.16 + (random() - 0.5) * 70; y += (h / 2 - cy) * 0.2 + (random() - 0.5) * 60; ctx.lineTo(x, y); } ctx.stroke(); }
        bar(cx < w / 2 ? 0 : w - 14, 0, 14, h, 'rgba(10,10,10,0.85)');
      }
    });
    const glass = new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: dim, roughness: 0.25 });
    const bezel = thick ? 0.018 : 0.008;
    add(new THREE.Mesh(new THREE.PlaneGeometry(W - 0.004, LH - 0.004), s.material('#0c0d10', { roughness: 0.3 })), lid).position.set(0, LH / 2, LT / 2 + 0.0004);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - bezel * 2, LH - bezel * 2 - (thick ? 0.012 : 0)), glass);
    face.position.set(0, LH / 2 + (thick ? 0.004 : 0), LT / 2 + 0.0009);
    lid.add(face);

    const back = paint(512, 352, (ctx, w, h) => {
      ctx.fillStyle = shell; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, 7); ctx.fill();
      const n = a.stickers === 'covered' ? 18 + Math.floor(mood.density * 10) : a.stickers === 'few' ? 3 + Math.floor(random() * 2) : 0;
      for (let i = 0; i < n; i++) {
        const x = 40 + random() * (w - 80), y = 36 + random() * (h - 72), r = 24 + random() * 30;
        ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 1.2);
        ctx.fillStyle = `hsl(${random() * 360},${75 * sat}%,${40 + random() * 25}%)`;
        const kind = Math.floor(random() * 4);
        if (kind === 0) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.fill(); }
        else if (kind === 1) { ctx.fillRect(-r * 1.4, -r * 0.5, r * 2.8, r); ctx.fillStyle = '#fff'; ctx.fillRect(-r * 1.1, -r * 0.15, r * 2.2, r * 0.3); }
        else if (kind === 2) { ctx.beginPath(); for (let k = 0; k < 10; k++) { const q = k * Math.PI / 5, rad = k % 2 ? r * 0.5 : r * 1.1; ctx.lineTo(Math.sin(q) * rad, -Math.cos(q) * rad); } ctx.fill(); }
        else { ctx.fillStyle = '#f4f1e8'; ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4); ctx.fillStyle = '#16161a'; ctx.font = `bold ${r * 0.8}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pick(['NO', 'YES', 'RIOT', 'ZINE', 'DIY', 'HELP', 'LOUD']), 0, 0, r * 1.8); }
        ctx.restore();
      }
      if (a.stickers === 'asset') {
        ctx.fillStyle = '#f6f6f2'; ctx.fillRect(w - 190, h - 84, 160, 58);
        ctx.fillStyle = '#111'; for (let i = 0; i < 26; i++) ctx.fillRect(w - 180 + i * 5.5, h - 76, random() < 0.5 ? 2 : 4, 28);
        ctx.font = 'bold 13px monospace'; ctx.fillText('PROPERTY OF IT', w - 180, h - 34);
      }
    });
    const lidBack = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.98, LH * 0.98), new THREE.MeshStandardMaterial({ map: back, roughness: 0.5, metalness: a.body === 'silver' ? 0.4 : 0 }));
    lidBack.rotation.y = Math.PI;
    lidBack.position.set(0, LH / 2, -LT / 2 - 0.0006);
    lid.add(lidBack);

    // Light thrown forward from the screen.
    const tint = new THREE.Color({ message: '#b9cdfa', spreadsheet: '#d2f0dc', film: '#f0b070', jobs: '#c7d8f2', blank: '#eef0f6', call: '#8fa9c6', terminal: '#5fe08a', crash: '#4f8cff' }[a.screen]).lerp(new THREE.Color('#ffb060'), amber);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.3, 36), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.3 * dim, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(1, 1.25, 1);
    pool.position.set(0, 0.004, 0.2);
    s.root.add(pool);

    // Charger, or its absence.
    const sidePort = random() < 0.5 ? -1 : 1;
    if (!a.dying) {
      const wire = s.material(a.body === 'black' ? '#1c1d20' : '#e9e8e3', { roughness: 0.6 });
      const px = sidePort * (W / 2 + 0.006);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.018), s.material('#35d46a', { emissive: '#35ff70', emissiveIntensity: 1 }));
      led.position.set(px, T / 2, -D / 2 + 0.05);
      lap.add(led);
      const bx = sidePort * (0.42 + random() * 0.1), bz = -0.1 + random() * 0.25;
      s.tube([[px, perchTop + T / 2, -D / 2 + 0.05], [px + sidePort * 0.06, perchTop * 0.8, -D / 2 + 0.03], [sidePort * 0.3, 0.012, -0.2], [bx - sidePort * 0.08, 0.008, bz - 0.12], [bx, 0.02, bz]], 0.004, wire);
      s.box([0.06, 0.03, 0.11], [bx, 0.015, bz + 0.04], wire).rotation.y = random();
      s.tube([[bx, 0.015, bz + 0.09], [bx + sidePort * 0.05, 0.006, bz + 0.2], [bx - sidePort * 0.04, 0.006, bz + 0.3], [bx + sidePort * 0.1, 0.006, bz + 0.38]], 0.004, wire);
    }

    // Company.
    const cx = -sidePort * (0.4 + random() * 0.06), cz = 0.05 + random() * 0.2;
    if (a.company === 'headphones') {
      const dark = s.material(pick(['#1e2024', '#e8e6e0', '#b7392f']), { roughness: 0.5 });
      const g = new THREE.Group();
      g.position.set(cx, 0.045, cz); g.rotation.set(-1.25, random() * 3, 0);
      const bandMesh = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 8, 32, Math.PI), dark); bandMesh.castShadow = true; g.add(bandMesh);
      for (const x of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.035, 20), dark); cup.rotation.z = Math.PI / 2; cup.position.set(x * 0.085, -0.02, 0); cup.castShadow = true; g.add(cup); const pad = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.012, 8, 20), s.material('#3a3c42', { roughness: 1 })); pad.rotation.y = Math.PI / 2; pad.position.set(x * 0.066, -0.02, 0); g.add(pad); }
      s.root.add(g);
    } else if (a.company === 'mug') {
      const col = s.material(new THREE.Color().setHSL(random(), 0.5 * sat, 0.55));
      s.cylinder(0.042, 0.037, 0.095, [cx, 0.0475, cz], col, 20);
      s.cylinder(0.036, 0.036, 0.004, [cx, 0.086, cz], s.material('#6a4a2c', { roughness: 0.2 }), 20);
      s.ring(0.027, 0.007, [cx + 0.048, 0.048, cz], col);
      s.rod([cx - 0.02, 0.09, cz], [cx - 0.05, 0.1, cz + 0.05], 0.0015, s.material('#f1eee4'));
      s.box([0.022, 0.001, 0.026], [cx - 0.055, 0.06, cz + 0.055], s.material('#f1eee4'));
    } else if (a.company === 'noodles') {
      s.lathe([[0.001, 0], [0.036, 0], [0.05, 0.1], [0.053, 0.104], [0.001, 0.104]], s.material('#f2efe6'), [cx, 0, cz]);
      s.cylinder(0.0445, 0.041, 0.035, [cx, 0.05, cz], s.material(pick(['#d2372b', '#e8a22c', '#2c7fd2'])), 24);
      s.cylinder(0.047, 0.047, 0.006, [cx, 0.103, cz], s.material('#e9c96a', { roughness: 0.4 }), 20);
      s.rod([cx + 0.01, 0.09, cz], [cx + 0.07, 0.2, cz - 0.03], 0.004, s.material('#f4f4f0'));
      const lidFoil = s.cylinder(0.05, 0.05, 0.002, [cx - 0.04, 0.125, cz], s.material('#d9dcde', { metalness: 0.8, roughness: 0.3 }), 20);
      lidFoil.rotation.z = -0.9;
    } else if (a.company === 'tissues') {
      const n = 4 + Math.floor(mood.density * 8 + random() * 3);
      const paper = s.material('#f4f2ec', { roughness: 1, flatShading: true });
      for (let i = 0; i < n; i++) {
        const r = 0.025 + random() * 0.018;
        const m = s.mesh(new THREE.IcosahedronGeometry(r, 0), paper, [cx + (random() - 0.5) * 0.3, r * 0.8, cz + (random() - 0.5) * 0.45]);
        m.rotation.set(random() * 3, random() * 3, 0);
        m.scale.y = 0.7;
      }
    }

    const energy = mood.energy;
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        const flicker = mood.wear > 0.6 && Math.sin(time * 13 + phase) > 0.97 ? 0.5 : 1;
        glass.emissiveIntensity = dim * flicker * (1 + 0.05 * energy * Math.sin(time * mix(1, 9, energy) + phase));
      },
    });
  },
});
