import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P2 = [number, number];

export default defineThing({
  questions: {
    kind: choice('What is wrapped up?', {
      tall: 'A tall dressing mirror in a wooden frame.',
      round: 'A big round mirror with a thin brass rim.',
      painting: 'An oil painting in a heavy gilt frame.',
      photo: 'A large framed photograph behind glass.',
    }),
    wrap: choice('How well is it wrapped?', {
      corner: 'Wrapped tight, with one top corner left bare and catching the light.',
      full: 'Completely swaddled: an anonymous padded slab.',
      slipped: 'The blanket has slid halfway down, the top half exposed.',
      fallen: 'The blanket lies in a heap at its foot: unwrapped, arrived or abandoned.',
    }),
    blanket: choice('What is it wrapped in?', {
      mover: "A blue quilted removal blanket with zigzag stitching.",
      felt: 'A coarse grey felt furniture pad.',
      bedspread: 'An old pink floral bedspread from the airing cupboard.',
      duvet: 'A white duvet, puffy and far too good for the job.',
      bubble: 'Layers of pale bubble wrap.',
    }),
    binding: choice('What holds the wrapping on?', {
      tape: 'Bands of brown parcel tape with a word in marker.',
      fragile: 'Red and white FRAGILE tape, wound round and round.',
      rope: 'Rope, tied like a parcel.',
      nothing: 'Nothing, it is only draped.',
    }),
    condition: choice('What state is the glass or canvas in?', {
      intact: 'Intact, it survived.',
      cracked: 'One long crack starring out from a corner.',
      broken: 'Smashed or torn through: it did not survive the move.',
    }),
    subject: choice('If it is a picture, what does it show?', {
      seascape: 'A sailing ship on a grey-green sea.',
      ancestor: 'A stern portrait of an ancestor in dark clothes.',
      wedding: 'A sepia wedding couple.',
      drawing: "A child's crayon drawing of a house and a sun.",
    }),
    support: choice('What is it leaning on?', {
      wall: 'A bare wall with the picture hook still in it.',
      boxes: 'A stack of moving boxes.',
      ladder: 'An open stepladder, left out from taking the curtains down.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const round = a.kind === 'round';
    const [w, h] = ({ tall: [0.56, 1.6], round: [0.86, 0.86], painting: [1.15, 0.86], photo: [0.62, 0.78] } as Record<string, P2>)[a.kind];
    const T = 0.045;
    const item = new THREE.Group();
    const add = <O extends THREE.Object3D>(o: O, parent: THREE.Object3D = item) => { parent.add(o); o.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = n.receiveShadow = true; }); return o; };

    // --- the face: glass or canvas
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * h / w);
    const c = cv.getContext('2d')!; const CW = 256, CH = cv.height;
    const isMirror = a.kind === 'tall' || round;
    if (isMirror) {
      const g = c.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#dfeaf0'); g.addColorStop(0.5, '#9fb3bf'); g.addColorStop(1, '#6f8591'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
      // the bare window reflected: bright panes, top right
      c.save(); c.translate(CW * 0.66, CW * 0.3); c.transform(1, 0.18, -0.1, 1, 0, 0);
      c.fillStyle = `rgba(255,${mix(250, 236, mood.warmth)},${mix(255, 200, mood.warmth)},0.95)`;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) c.fillRect(-CW * 0.2 + i * CW * 0.2, -CW * 0.24 + j * CW * 0.19, CW * 0.18, CW * 0.17);
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(0, CH * 0.75); c.lineTo(CW, CH * 0.45); c.lineTo(CW, CH * 0.55); c.lineTo(0, CH * 0.9); c.fill();
      for (let i = 0; i < mood.wear * 40; i++) { c.fillStyle = `rgba(60,50,40,${random() * 0.35})`; const e = random() < 0.5; c.beginPath(); c.arc(e ? random() * CW : (random() < 0.5 ? 0 : CW), e ? (random() < 0.5 ? 0 : CH) : random() * CH, 3 + random() * 9, 0, 7); c.fill(); }
    } else if (a.subject === 'seascape') {
      const g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, '#c9c3a8'); g.addColorStop(0.55, '#9aa79a'); g.addColorStop(0.56, '#4f6a63'); g.addColorStop(1, '#2c423f'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
      c.fillStyle = '#3a2a1c'; c.beginPath(); c.moveTo(CW * 0.34, CH * 0.6); c.lineTo(CW * 0.66, CH * 0.6); c.lineTo(CW * 0.6, CH * 0.68); c.lineTo(CW * 0.4, CH * 0.68); c.fill(); c.fillRect(CW * 0.495, CH * 0.2, 3, CH * 0.4);
      c.fillStyle = '#ece4cd'; for (const [x, s2] of [[0.42, 0.8], [0.5, 1], [0.58, 0.7]]) { c.beginPath(); c.moveTo(CW * x, CH * (0.58 - 0.36 * s2)); c.lineTo(CW * (x + 0.07), CH * 0.57); c.lineTo(CW * (x - 0.05), CH * 0.57); c.fill(); }
      c.strokeStyle = 'rgba(230,235,225,0.5)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { const x = random() * CW, y = CH * (0.62 + random() * 0.36); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 5, x + 22, y); c.stroke(); }
    } else if (a.subject === 'ancestor') {
      const g = c.createRadialGradient(CW / 2, CH * 0.4, 10, CW / 2, CH / 2, CW * 0.8); g.addColorStop(0, '#5c4630'); g.addColorStop(1, '#1d1611'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
      c.fillStyle = '#17120f'; c.beginPath(); c.ellipse(CW / 2, CH * 1.02, CW * 0.3, CH * 0.42, 0, 0, 7); c.fill();
      c.fillStyle = '#e8e2d2'; c.beginPath(); c.moveTo(CW * 0.44, CH * 0.6); c.lineTo(CW * 0.56, CH * 0.6); c.lineTo(CW * 0.5, CH * 0.72); c.fill();
      c.fillStyle = '#c9a383'; c.beginPath(); c.ellipse(CW / 2, CH * 0.42, CW * 0.105, CH * 0.17, 0, 0, 7); c.fill();
      c.fillStyle = '#3a2a22'; c.beginPath(); c.ellipse(CW / 2, CH * 0.31, CW * 0.115, CH * 0.09, 0, Math.PI, 0); c.fill();
      c.fillRect(CW * 0.455, CH * 0.4, 6, 4); c.fillRect(CW * 0.525, CH * 0.4, 6, 4); c.fillRect(CW * 0.47, CH * 0.5, CW * 0.06, 2.5);
    } else if (a.subject === 'wedding') {
      c.fillStyle = '#cdb893'; c.fillRect(0, 0, CW, CH);
      const g = c.createRadialGradient(CW / 2, CH / 2, CW * 0.2, CW / 2, CH / 2, CW * 0.75); g.addColorStop(0, 'rgba(90,65,40,0)'); g.addColorStop(1, 'rgba(70,50,30,0.7)'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
      c.fillStyle = '#3b2c20'; c.beginPath(); c.moveTo(CW * 0.5, CH); c.lineTo(CW * 0.53, CH * 0.42); c.lineTo(CW * 0.74, CH * 0.42); c.lineTo(CW * 0.8, CH); c.fill(); c.beginPath(); c.arc(CW * 0.635, CH * 0.32, CW * 0.065, 0, 7); c.fill();
      c.fillStyle = '#f1e8d2'; c.beginPath(); c.moveTo(CW * 0.16, CH); c.lineTo(CW * 0.3, CH * 0.45); c.lineTo(CW * 0.44, CH * 0.45); c.lineTo(CW * 0.56, CH); c.fill(); c.beginPath(); c.arc(CW * 0.37, CH * 0.36, CW * 0.085, Math.PI, 0); c.lineTo(CW * 0.47, CH * 0.6); c.lineTo(CW * 0.27, CH * 0.6); c.fill();
      c.fillStyle = '#b89472'; c.beginPath(); c.arc(CW * 0.37, CH * 0.37, CW * 0.055, 0, 7); c.fill(); c.beginPath(); c.arc(CW * 0.635, CH * 0.33, CW * 0.05, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.moveTo(CW * 0.55, 0); c.lineTo(CW * 0.85, 0); c.lineTo(CW * 0.35, CH); c.lineTo(CW * 0.05, CH); c.fill();
    } else {
      c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, CW, CH); c.lineCap = 'round';
      c.strokeStyle = '#3f9a4a'; c.lineWidth = 9; c.beginPath(); for (let x = 0; x <= CW; x += 16) c.lineTo(x, CH * 0.86 + (random() - 0.5) * 8); c.stroke();
      c.strokeStyle = '#d8362f'; c.lineWidth = 6; c.strokeRect(CW * 0.28, CH * 0.5, CW * 0.36, CH * 0.33); c.beginPath(); c.moveTo(CW * 0.24, CH * 0.5); c.lineTo(CW * 0.46, CH * 0.3); c.lineTo(CW * 0.68, CH * 0.5); c.stroke();
      c.strokeStyle = '#1f55b8'; c.strokeRect(CW * 0.42, CH * 0.66, CW * 0.09, CH * 0.17);
      c.strokeStyle = '#f0b81c'; c.beginPath(); c.arc(CW * 0.8, CH * 0.2, CW * 0.08, 0, 7); c.stroke(); for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(CW * 0.8 + Math.cos(k * 0.785) * CW * 0.11, CH * 0.2 + Math.sin(k * 0.785) * CW * 0.11); c.lineTo(CW * 0.8 + Math.cos(k * 0.785) * CW * 0.15, CH * 0.2 + Math.sin(k * 0.785) * CW * 0.15); c.stroke(); }
      c.strokeStyle = '#222'; c.lineWidth = 4; for (const x of [0.1, 0.18]) { c.beginPath(); c.arc(CW * x, CH * 0.66, 7, 0, 7); c.moveTo(CW * x, CH * 0.66 + 7); c.lineTo(CW * x, CH * 0.78); c.lineTo(CW * x - 8, CH * 0.85); c.moveTo(CW * x, CH * 0.78); c.lineTo(CW * x + 8, CH * 0.85); c.moveTo(CW * x - 9, CH * 0.72); c.lineTo(CW * x + 9, CH * 0.72); c.stroke(); }
    }
    if (a.condition !== 'intact') {
      // damage starts low on the covered side so the bare corner still shows it running through
      const ox = CW * (0.6 + random() * 0.25), oy = CH * (0.12 + random() * 0.2);
      c.lineCap = 'butt';
      const rays = a.condition === 'broken' ? 13 : 6;
      const ends: P2[] = [];
      for (let i = 0; i < rays; i++) {
        const an = i / rays * 6.283 + random() * 0.3; let x = ox, y = oy; const len = a.condition === 'broken' ? CH * 1.4 : CH * (0.25 + random() * 0.7);
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += Math.cos(an + (random() - 0.5) * 0.5) * len / 6; y += Math.sin(an + (random() - 0.5) * 0.5) * len / 6; c.lineTo(x, y); }
        ends.push([x, y]);
        c.strokeStyle = isMirror || a.kind === 'photo' ? 'rgba(20,30,35,0.85)' : 'rgba(25,15,10,0.9)'; c.lineWidth = isMirror ? 2.2 : 4; c.stroke();
        if (isMirror || a.kind === 'photo') { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.9; c.stroke(); }
      }
      if (a.condition === 'broken') for (let i = 0; i < rays; i += 2) { // missing shards show the backing board
        const an1 = i / rays * 6.283, an2 = (i + 1) / rays * 6.283, r1 = CW * (0.1 + random() * 0.14), r2 = CW * (0.25 + random() * 0.3);
        c.fillStyle = isMirror || a.kind === 'photo' ? '#6b5a44' : '#17110d'; c.beginPath(); c.moveTo(ox + Math.cos(an1) * r1, oy + Math.sin(an1) * r1); c.lineTo(ox + Math.cos(an1) * r2, oy + Math.sin(an1) * r2); c.lineTo(ox + Math.cos(an2) * r2 * 0.9, oy + Math.sin(an2) * r2 * 0.9); c.lineTo(ox + Math.cos(an2) * r1, oy + Math.sin(an2) * r1); c.fill();
      }
    }
    const faceTex = new THREE.CanvasTexture(cv); faceTex.colorSpace = THREE.SRGBColorSpace;
    const glassy = isMirror || a.kind === 'photo';
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: glassy ? 0.12 : 0.85, metalness: isMirror ? 0.35 : 0, emissive: '#ffffff', emissiveMap: faceTex, emissiveIntensity: isMirror ? 0.4 : a.kind === 'photo' ? 0.12 : 0.05 });
    const frameHex = { tall: mood.warmth > 0.5 ? '#6b4426' : '#2c2a29', round: '#b8963f', painting: '#b8963f', photo: '#1f1e1d' }[a.kind];
    const frameMat = s.material(frameHex, { metalness: a.kind === 'round' || a.kind === 'painting' ? 0.6 : 0.1, roughness: 0.45 });
    const fw = { tall: 0.05, round: 0.022, painting: 0.09, photo: 0.035 }[a.kind];
    if (round) {
      const R = w / 2;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(R - fw * 0.5, 40), faceMat); disc.position.set(0, R, T / 2 - 0.004); add(disc);
      const back = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, T * 0.6, 40), s.material('#6b5a44')); back.rotation.x = Math.PI / 2; back.position.set(0, R, 0); add(back);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - fw / 2, fw, 10, 48), frameMat); rim.position.set(0, R, 0); add(rim);
    } else {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - fw * 1.6, h - fw * 1.6), faceMat); pane.position.set(0, h / 2, T / 2 - 0.012); add(pane);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.01, h - 0.01, T * 0.5), s.material('#6b5a44')); back.position.set(0, h / 2, -T * 0.2); add(back);
      for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(fw, h, T), frameMat); st.position.set(sx * (w / 2 - fw / 2), h / 2, 0); add(st); }
      for (const sy of [0, 1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(w, fw, T), frameMat); rl.position.set(0, sy ? h - fw / 2 : fw / 2, 0); add(rl); }
      if (a.kind === 'painting') { // carved corners and an inner slip
        for (const sx of [-1, 1]) for (const sy of [0, 1]) { const boss = new THREE.Mesh(new THREE.SphereGeometry(fw * 0.62, 10, 8), frameMat); boss.scale.z = 0.5; boss.position.set(sx * (w / 2 - fw / 2), sy ? h - fw / 2 : fw / 2, T / 2); add(boss); }
        for (const sx of [-1, 1]) { const slip = new THREE.Mesh(new THREE.BoxGeometry(0.012, h - fw * 1.5, 0.012), s.material('#e6d49a', { metalness: 0.5 })); slip.position.set(sx * (w / 2 - fw * 0.82), h / 2, T / 2); add(slip); }
      }
      if (a.kind === 'photo') { const mount = new THREE.Mesh(new THREE.PlaneGeometry(w - fw * 1.6, h - fw * 1.6), s.material('#efeadb')); mount.position.set(0, h / 2, T / 2 - 0.014); add(mount); (item.children[0] as THREE.Mesh).scale.set(0.74, 0.76, 1); }
    }

    // --- the wrapping
    const quilt = (() => {
      const q = document.createElement('canvas'); q.width = q.height = 128; const x = q.getContext('2d')!;
      const baseHex = { mover: '#2f4f86', felt: '#7e8083', bedspread: '#d9a3a8', duvet: '#f0eee8', bubble: '#dfe9ea' }[a.blanket];
      x.fillStyle = baseHex; x.fillRect(0, 0, 128, 128);
      if (a.blanket === 'mover') { x.strokeStyle = '#1b2f55'; x.lineWidth = 3; for (let y = -16; y < 144; y += 32) { x.beginPath(); for (let k = 0; k <= 8; k++) x.lineTo(k * 16, y + (k % 2 ? 16 : 0)); x.stroke(); } x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 2; for (let y = -12; y < 144; y += 32) { x.beginPath(); for (let k = 0; k <= 8; k++) x.lineTo(k * 16, y + (k % 2 ? 16 : 0)); x.stroke(); } }
      else if (a.blanket === 'felt') { for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${random() < 0.5 ? '40,40,45' : '200,200,205'},0.25)`; x.fillRect(random() * 128, random() * 128, 1 + random() * 5, 1.5); } }
      else if (a.blanket === 'bedspread') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const px = i * 32 + 16, py = j * 32 + 16; x.fillStyle = '#f4dfe0'; for (let p = 0; p < 6; p++) { x.beginPath(); x.arc(px + Math.cos(p * 1.047) * 8, py + Math.sin(p * 1.047) * 8, 5, 0, 7); x.fill(); } x.fillStyle = '#b8636e'; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); } }
      else if (a.blanket === 'duvet') { x.strokeStyle = 'rgba(150,150,160,0.5)'; x.lineWidth = 3; x.strokeRect(0, 0, 128, 128); const g = x.createRadialGradient(64, 64, 10, 64, 64, 90); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(160,160,170,0.35)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.arc(i * 16 + 8 + (j % 2) * 8, j * 16 + 8, 5.5, 0, 7); x.fill(); x.strokeStyle = 'rgba(120,150,155,0.6)'; x.lineWidth = 1; x.stroke(); } }
      x.fillStyle = `rgba(90,80,65,${mood.wear * 0.28})`; x.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(q); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2.6, 2.6);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: a.blanket === 'bubble' ? 0.35 : 1 });
    })();
    const puff = a.blanket === 'duvet' ? 0.09 : a.blanket === 'bubble' ? 0.04 : 0.05;
    const D = T + puff;
    const pad = 0.035;
    let outline: P2[] = round
      ? Array.from({ length: 36 }, (_u, i) => [Math.cos(i / 36 * 6.283) * (w / 2 + pad), w / 2 + Math.sin(i / 36 * 6.283) * (w / 2 + pad)] as P2)
      : [[-w / 2 - pad, -pad * 0.3], [w / 2 + pad, -pad * 0.3], [w / 2 + pad, h + pad], [-w / 2 - pad, h + pad]];
    const cut: P2[] = [];
    const clip = (poly: P2[], n: P2, lim: number) => {
      const out: P2[] = [];
      poly.forEach((p, i) => {
        const q = poly[(i + 1) % poly.length], dp = n[0] * p[0] + n[1] * p[1] - lim, dq = n[0] * q[0] + n[1] * q[1] - lim;
        if (dp <= 0) out.push(p);
        if (dp * dq < 0) { const f = dp / (dp - dq); const m: P2 = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; out.push(m); cut.push(m); }
      });
      return out;
    };
    const side = random() < 0.5 ? -1 : 1;
    if (a.wrap === 'corner') { const n: P2 = [0.707 * side, 0.707]; outline = clip(outline, n, round ? n[1] * w / 2 + w * 0.5 * 0.5 : n[0] * side * (w / 2) * side + n[1] * h - Math.min(w, h) * 0.52 * 0.707); }
    if (a.wrap === 'slipped') { const tilt = (random() - 0.5) * 0.5; outline = clip(outline, [Math.sin(tilt), Math.cos(tilt)], Math.cos(tilt) * h * mix(0.4, 0.58, random())); }
    const wrapped = a.wrap !== 'fallen';
    const bandY: number[] = [];
    if (wrapped) {
      const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: D - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.022, bevelSegments: 3 });
      geo.translate(0, 0, -(D - 0.04) / 2);
      add(new THREE.Mesh(geo, quilt));
      // the rolled-back edge where the blanket stops
      if (cut.length === 2) {
        const [p, q] = cut; const len = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.max(3, Math.round(len / 0.11));
        for (let i = 0; i <= n; i++) { const f = i / n; const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), quilt); const r = 0.05 + random() * 0.025; lump.scale.set(r * 1.3, r, D / 2 + 0.03); lump.position.set(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f - r * 0.4, 0); lump.rotation.z = Math.atan2(q[1] - p[1], q[0] - p[0]); add(lump); }
      }
      const top = a.wrap === 'slipped' ? Math.min(cut[0]?.[1] ?? h, cut[1]?.[1] ?? h) : a.wrap === 'corner' ? h * (round ? 0.62 : 1) - (round ? 0 : Math.min(w, h) * 0.56) : h;
      const count = a.wrap === 'slipped' ? 1 : h > 1.2 ? 3 : 2;
      for (let i = 0; i < count; i++) bandY.push(top * (i + 0.6) / (count + 0.2));
      const chord = (y: number) => (round ? 2 * Math.sqrt(Math.max(0.01, (w / 2 + pad) ** 2 - (y - w / 2) ** 2)) : w + pad * 2) + 0.05;
      if (a.binding !== 'nothing') {
        const mat = a.binding === 'tape' ? s.material('#8a5a2b', { roughness: 0.4 }) : a.binding === 'fragile' ? s.material('#d2322a', { roughness: 0.5 }) : s.material('#c9b07a', { roughness: 1 });
        const hgt = a.binding === 'rope' ? 0.016 : 0.05;
        bandY.forEach((y, i) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(chord(y), hgt, D + 0.05), mat); b.position.set(0, y, 0); b.rotation.z = (random() - 0.5) * 0.14; add(b);
          if (a.binding === 'fragile') { const t = s.label('FRAGILE', 0.3, 0.048, [0, 0, 0], '#ffffff', '#d2322a'); t.position.set((random() - 0.5) * 0.15, y, D / 2 + 0.027); t.rotation.z = b.rotation.z; item.add(t); }
          if (a.binding === 'rope' && i === 0) { const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat); knot.position.set(0, y, D / 2 + 0.03); add(knot); }
        });
        if (!round && a.wrap !== 'slipped') { const v = new THREE.Mesh(new THREE.BoxGeometry(hgt, (a.wrap === 'corner' ? top : h) + pad, D + 0.05), mat); v.position.set(-side * w * 0.12, ((a.wrap === 'corner' ? top : h) + pad) / 2 - pad * 0.3, 0); add(v); }
        if (a.binding === 'tape') { const word = isMirror ? 'MIRROR' : a.kind === 'painting' ? 'PICTURE' : 'GLASS'; const t = s.label(word, 0.3, 0.085, [0, 0, 0], '#1c1c1c', '#e3d7ae'); t.position.set(side * -0.02, (bandY[0] + (bandY[1] ?? bandY[0] * 2.4)) / 2, D / 2 + 0.004); t.rotation.z = (random() - 0.5) * 0.25; item.add(t); }
      }
    }

    // --- stand it up
    const wallish = true as boolean;
    const lean = a.support === 'ladder' ? 0.3 : 0.17 + random() * 0.08;
    const holder = new THREE.Group(); holder.add(item); s.root.add(holder);
    holder.rotation.x = -lean; holder.position.set(0, wallish ? 0 : D / 2 + 0.03, wallish ? h * Math.sin(lean) + D / 2 + 0.03 : h / 2);
    holder.rotation.y = wallish ? 0 : (random() - 0.5) * 0.4; 
    if (a.support === 'wall') {
      const wallW = w + 1.0, wallH = Math.max(1.25, h * Math.cos(lean) + 0.55);
      const wallHex = mood.warmth > 0.55 ? '#eadfc6' : mood.cheer > 0.6 ? '#dbe6dc' : '#e2e0d8';
      const wc = document.createElement('canvas'); wc.width = 256; wc.height = Math.round(256 * wallH / wallW); const x = wc.getContext('2d')!;
      x.fillStyle = wallHex; x.fillRect(0, 0, 256, wc.height); x.fillStyle = `rgba(120,105,70,${0.1 + mood.wear * 0.12})`; x.fillRect(0, 0, 256, wc.height);
      // the paler patch where it used to hang
      const px = 256 / wallW; x.fillStyle = wallHex; const gh = Math.min(h, wallH - 0.2) * px; if (round) { x.beginPath(); x.arc(128, 0.12 * px + w * px / 2, w * px / 2, 0, 7); x.fill(); } else x.fillRect(128 - w * px / 2, 0.1 * px, w * px, gh);
      const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
      const edge = s.material('#cfc9ba');
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 0.1), [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: wt, roughness: 0.95 }), edge]); wall.position.set(0, wallH / 2, -0.05); add(wall, s.root);
      const white = s.material('#f3f0e6'); s.box([wallW, 0.13, 0.02], [0, 0.065, 0.01], white); s.box([wallW, 0.02, 0.03], [0, 0.14, 0.015], white);
      s.box([0.022, 0.05, 0.012], [0, wallH - 0.14, 0.006], s.material('#b8963f', { metalness: 0.8, roughness: 0.3 }));
      s.cylinder(0.004, 0.004, 0.02, [0, wallH - 0.12, 0.012], s.material('#555')).rotation.x = Math.PI / 2;
    } else if (a.support === 'boxes') {
      const board = s.material('#b98d5c', { roughness: 0.92 }), tape = s.material('#8a5a2b', { roughness: 0.5 });
      let y = 0; const need = h * Math.cos(lean) * 0.8;
      for (let i = 0; y < need && i < 5; i++) { const bw = 0.56 - i * 0.03, bh = Math.min(0.36, need - y + 0.05), bx = (random() - 0.5) * 0.08; const bxm = s.box([bw, bh - 0.008, 0.42], [bx, y + bh / 2, -0.21 + h * Math.sin(lean) - (y + bh) * Math.tan(lean) - 0.01], board); bxm.rotation.y = (random() - 0.5) * 0.08; s.box([0.05, 0.004, 0.42], [bx, y + bh - 0.003, bxm.position.z], tape); y += bh; }
    }
    if (a.support === 'ladder') {
      const alu = s.material(mood.cheer > 0.5 ? '#d8a531' : '#b9bdc0', { metalness: 0.6, roughness: 0.4 });
      const zb = h * Math.sin(lean) - 0.02, top = Math.max(1.0, h * Math.cos(lean) * 0.9), run = top * Math.tan(lean);
      for (const sx of [-1, 1]) {
        s.rod([sx * 0.24, 0, zb], [sx * 0.18, top, zb - run], 0.016, alu);
        s.rod([sx * 0.24, 0, zb - run * 2 - 0.25], [sx * 0.18, top, zb - run], 0.014, alu);
        s.rod([sx * 0.22, top * 0.45, zb - run * 0.45], [sx * 0.22, top * 0.45, zb - run * 1.55 - 0.14], 0.006, alu);
      }
      for (let i = 1; i <= 4; i++) { const f = i / 5; s.box([0.44 - f * 0.1, 0.02, 0.09], [0, top * f, zb - run * f - 0.03], alu); }
      s.box([0.34, 0.035, 0.13], [0, top + 0.01, zb - run], s.material('#7d2a24'));
    }
    if (a.wrap === 'fallen') {
      const zf = wallish ? h * Math.sin(lean) + 0.3 : h / 2 + 0.1, xf = wallish ? 0 : w / 2 + 0.35;
      for (let i = 0; i < 11; i++) { const r = 0.16 + random() * 0.1; const lump = s.ball([r * 1.6, r * mix(0.22, 0.42, random()), r * 1.1], [xf + (random() - 0.5) * (w + 0.25), r * 0.12, zf - 0.12 + (random() - 0.5) * 0.3], quilt, 14); lump.rotation.y = (random() - 0.5) * 0.8; }
      s.box([w + 0.5, 0.025, 0.75], [xf, 0.0125, zf + 0.05], quilt).rotation.y = 0.15;
      if (a.binding !== 'nothing') { const wad = s.ball([0.07, 0.05, 0.06], [xf + w * 0.5 + 0.1, 0.05, zf + 0.25], s.material(a.binding === 'rope' ? '#c9b07a' : a.binding === 'fragile' ? '#d2322a' : '#8a5a2b', { roughness: 0.5 }), 8); wad.rotation.y = 1; }
    }
    if (a.condition === 'broken' && glassy && a.wrap !== 'full') {
      const shardMat = new THREE.MeshStandardMaterial({ color: '#cfe0e8', metalness: 0.5, roughness: 0.1, emissive: '#9fb9c6', emissiveIntensity: 0.35, side: THREE.DoubleSide });
      const zf = wallish ? h * Math.sin(lean) + D + 0.12 : h + 0.15;
      for (let i = 0; i < 9; i++) { const r = 0.03 + random() * 0.06; const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(r * 2, r * 0.3), new THREE.Vector2(r * 0.6, r * 1.3)]); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), shardMat); m.rotation.x = -Math.PI / 2; m.rotation.z = random() * 6; m.position.set((random() - 0.5) * (w + 0.2), 0.004 + i * 0.0005, zf + random() * 0.3); m.receiveShadow = true; s.root.add(m); }
    }
    return s.finish();
  },
});
