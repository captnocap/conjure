import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P2 = [number, number];
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function outline(kind: 'rect' | 'arch' | 'oval', w: number, h: number): P2[] {
  const shape = new THREE.Shape();
  if (kind === 'rect') {
    const r = 0.035;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w / 2, h / 2 - r);
    shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  } else if (kind === 'arch') {
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2 - w / 2);
    shape.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false);
    shape.lineTo(-w / 2, -h / 2);
  } else shape.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
  return shape.getSpacedPoints(120).slice(0, 120).map((p) => [p.x, p.y] as P2);
}

function grow(points: P2[], by: number): P2[] {
  const n = points.length;
  return points.map((p, i) => {
    const a = points[(i + n - 2) % n], b = points[(i + 2) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
    return [p[0] + (ty / len) * by, p[1] - (tx / len) * by] as P2;
  });
}

const MESSAGES = {
  star: 'YOU ARE A STAR',
  breakleg: 'BREAK A LEG',
  number: 'CALL ME 555-0199',
  goodbye: 'GOODBYE DARLING',
  last: 'LAST SHOW',
} as const;

export default defineThing({
  questions: {
    frame: choice('What style is the mirror frame?', {
      hollywood: 'A wide white-lacquer rectangle, the classic Hollywood makeup mirror.',
      deco: 'A tall black-and-chrome arch from a 1930s revue dressing room.',
      gilt: 'A gold oval with beaded edging, grand and a little camp.',
      plywood: 'A home-made board painted hot pink with bulbs screwed straight in.',
      round: 'A round pastel ring like a giant compact.',
    }),
    lit: score('How many of the bulbs are still lit?', ['Only two or three hanging on', 'About half, gaps of dead glass', 'Most, one or two blown', 'Every bulb blazing']),
    bulbs: choice('What colour is the light from the bulbs?', {
      warm: 'Warm tungsten white, flattering and golden.',
      cool: 'Hard bluish daylight white that hides nothing.',
      pink: 'Soft rose-pink bulbs.',
      party: 'A mismatched string of coloured party bulbs.',
    }),
    taped: choice('What is tucked and taped into the frame?', {
      polaroids: 'A scatter of polaroids of friends and old shows.',
      telegram: 'A yellowed telegram with a few typed lines.',
      memorial: 'A black-bordered memorial card and a pressed flower for someone gone.',
      setlist: 'Tonight’s setlist, hand-numbered on lined paper.',
      tickets: 'Ticket stubs and a prize rosette.',
      bare: 'Nothing at all; the frame is bare.',
    }),
    lipstick: choice('What is written on the glass in lipstick?', {
      star: 'YOU ARE A STAR, a pep talk to herself.',
      breakleg: 'BREAK A LEG, left by a friend.',
      kiss: 'No words, just a kiss print.',
      heart: 'A big drawn heart.',
      number: 'A phone number with CALL ME.',
      goodbye: 'GOODBYE DARLING, a farewell.',
      last: 'LAST SHOW, underlined twice.',
      none: 'Nothing; the glass is clean.',
    }),
    lipColour: choice('What colour is the lipstick?', {
      red: 'Classic pillar-box red.',
      fuchsia: 'Hot fuchsia pink.',
      plum: 'Dark plum, nearly black.',
      coral: 'Orange coral.',
    }),
    draped: choice('What hangs over a corner of the mirror?', {
      nothing: 'Nothing.',
      boa: 'A feather boa slung over the top.',
      beads: 'Loops of pearl beads.',
      sash: 'A pageant sash.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const panel = new THREE.Group();
    s.root.add(panel);
    const put = <T extends THREE.Object3D>(node: T) => { panel.add(node); return node; };

    const kind = a.frame === 'deco' ? 'arch' : a.frame === 'gilt' || a.frame === 'round' ? 'oval' : 'rect';
    const w = { hollywood: 0.82, deco: 0.52, gilt: 0.56, plywood: 0.7, round: 0.62 }[a.frame];
    const h = { hollywood: 0.6, deco: 0.84, gilt: 0.76, plywood: 0.62, round: 0.62 }[a.frame];
    const border = { hollywood: 0.085, deco: 0.07, gilt: 0.08, plywood: 0.1, round: 0.075 }[a.frame];
    const inner = outline(kind, w, h);
    const outer = grow(inner, border);
    const mid = grow(inner, border * 0.5);

    const frameMat = {
      hollywood: s.material('#f2efe8', { roughness: 0.35 }),
      deco: s.material('#1d1d24', { roughness: 0.25, metalness: 0.4 }),
      gilt: s.material('#c9a13c', { roughness: 0.35, metalness: 0.75 }),
      plywood: s.material('#e8418f', { roughness: 0.8 }),
      round: s.material('#f3b8cf', { roughness: 0.4 }),
    }[a.frame];
    const trim = s.material(a.frame === 'gilt' ? '#e7c76a' : a.frame === 'plywood' ? '#b98a57' : '#cfd3d6', { metalness: 0.8, roughness: 0.25 });

    const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes.push(new THREE.Path(inner.map(([x, y]) => new THREE.Vector2(x, y))));
    const frameGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 4 });
    frameGeo.translate(0, 0, -0.025);
    put(s.mesh(frameGeo, frameMat));
    // Backing board behind the glass.
    const backShape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x * 0.98, y * 0.98)));
    const back = put(s.mesh(new THREE.ShapeGeometry(backShape), s.material('#5b4a3c')));
    back.position.z = -0.03;
    back.rotation.y = Math.PI;

    // The glass: a painted reflection of a bright room, smudges, and the lipstick.
    const lip = { red: '#d3122f', fuchsia: '#e61f93', plum: '#5a1038', coral: '#f0603c' }[a.lipColour];
    const glassTex = paint(512, Math.round(512 * h / w), (ctx, cw, ch) => {
      const sky = ctx.createLinearGradient(0, 0, cw, ch);
      sky.addColorStop(0, mood.warmth > 0.5 ? '#e9dfd2' : '#dfe6ea');
      sky.addColorStop(0.55, '#aab6bb');
      sky.addColorStop(1, '#7d8b93');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);
      // Reflected room: soft dark shapes and a few blurred lights.
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#3b3640';
      ctx.fillRect(cw * 0.62, ch * 0.3, cw * 0.3, ch * 0.7);
      ctx.beginPath(); ctx.ellipse(cw * 0.3, ch * 0.95, cw * 0.28, ch * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 7; i++) {
        const x = random() * cw, y = random() * ch * 0.5, r = 14 + random() * 26;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
        glow.addColorStop(0, '#fff6dc'); glow.addColorStop(1, 'rgba(255,246,220,0)');
        ctx.fillStyle = glow; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(cw * 0.08, ch); ctx.lineTo(cw * 0.42, 0); ctx.lineTo(cw * 0.56, 0); ctx.lineTo(cw * 0.22, ch); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cw * 0.3, ch); ctx.lineTo(cw * 0.64, 0); ctx.lineTo(cw * 0.68, 0); ctx.lineTo(cw * 0.34, ch); ctx.fill();
      // Age: desilvered spots creeping in from the edge.
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#4c4a44';
      for (let i = 0; i < mood.wear * 90; i++) {
        const side = Math.floor(random() * 4), t = random(), d = random() * random() * 0.16;
        const x = side === 0 ? d * cw : side === 1 ? (1 - d) * cw : t * cw;
        const y = side === 2 ? d * ch : side === 3 ? (1 - d) * ch : t * ch;
        ctx.beginPath(); ctx.arc(x, y, 2 + random() * 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = lip; ctx.fillStyle = lip;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.save();
      ctx.translate(cw / 2, ch * 0.47);
      ctx.rotate(-0.08 + (random() - 0.5) * 0.1);
      if (a.lipstick === 'kiss') {
        for (const flip of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(-70, 0);
          ctx.bezierCurveTo(-40, -58 * flip, -12, -46 * flip, 0, -30 * flip);
          ctx.bezierCurveTo(12, -46 * flip, 40, -58 * flip, 70, 0);
          ctx.bezierCurveTo(30, -10 * flip, -30, -10 * flip, -70, 0);
          ctx.fill();
        }
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 11, -38); ctx.lineTo(i * 12, 38); ctx.stroke(); }
      } else if (a.lipstick === 'heart') {
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(0, 110);
        ctx.bezierCurveTo(-190, -20, -90, -160, 0, -60);
        ctx.bezierCurveTo(90, -160, 190, -20, 0, 110);
        ctx.stroke();
      } else if (a.lipstick !== 'none') {
        const words = MESSAGES[a.lipstick].split(' ');
        const lines = words.length > 2 ? [words.slice(0, words.length - 1).join(' '), words[words.length - 1]] : words;
        const size = Math.min(ch * 0.2, (cw * 1.5) / Math.max(...lines.map((line) => line.length)));
        ctx.font = `italic bold ${size}px Georgia, serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * size * 1.15, cw * 0.86));
        ctx.lineWidth = size * 0.11;
        const under = (lines.length / 2) * size * 1.15 + 6;
        ctx.beginPath(); ctx.moveTo(-cw * 0.3, under); ctx.quadraticCurveTo(0, under + 14, cw * 0.3, under - 6); ctx.stroke();
        if (a.lipstick === 'last') { ctx.beginPath(); ctx.moveTo(-cw * 0.27, under + 20); ctx.quadraticCurveTo(0, under + 32, cw * 0.28, under + 14); ctx.stroke(); }
      }
      ctx.restore();
    });
    const glassGeo = new THREE.ShapeGeometry(new THREE.Shape(inner.map(([x, y]) => new THREE.Vector2(x, y))));
    const uv = glassGeo.getAttribute('uv') as THREE.BufferAttribute, pos = glassGeo.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    const glass = put(s.mesh(glassGeo, new THREE.MeshStandardMaterial({ map: glassTex, roughness: 0.18, metalness: 0.25, emissive: '#ffffff', emissiveMap: glassTex, emissiveIntensity: 0.22 })));
    glass.position.z = 0.004;

    // Bulbs round the frame.
    const count = Math.max(10, Math.round((2 * (w + h) + border * 4) / 0.125));
    const litShare = clamp01(mix(0.12, 1, a.lit) - mood.wear * 0.15);
    const tones = { warm: ['#ffd9a0'], cool: ['#dfeaff'], pink: ['#ff9ec4'], party: ['#ff5a5a', '#ffd23f', '#5ad1ff', '#7dff8a', '#ff7de1'] }[a.bulbs];
    const order = Array.from({ length: count }, (_u, i) => i).sort(() => random() - 0.5);
    const litSet = new Set(order.slice(0, Math.max(2, Math.round(count * litShare))));
    const flickers: { material: THREE.MeshStandardMaterial; halo: THREE.MeshBasicMaterial; base: number; phase: number; rate: number }[] = [];
    const sockets: { at: [number, number, number]; size: number }[] = [];
    const bulbGeo = new THREE.SphereGeometry(0.03, 14, 10);
    for (let i = 0; i < count; i++) {
      const [x, y] = mid[Math.floor(((i + 0.5) / count) * mid.length) % mid.length];
      sockets.push({ at: [x, y, 0.03], size: 1 });
      const tone = tones[i % tones.length];
      const lit = litSet.has(i);
      const base = mix(1.3, 2.3, mood.cheer);
      const material = new THREE.MeshStandardMaterial(lit
        ? { color: '#fff6e6', emissive: tone, emissiveIntensity: base, roughness: 0.3 }
        : { color: a.bulbs === 'party' ? new THREE.Color(tone).multiplyScalar(0.35) : '#6f6a62', roughness: 0.25, metalness: 0.2 });
      const bulb = put(s.mesh(bulbGeo, material, [x, y, 0.058]));
      bulb.scale.set(1, 1, 1.15);
      if (lit) {
        const haloMat = new THREE.MeshBasicMaterial({ color: tone, transparent: true, opacity: 0.2, depthWrite: false });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), haloMat);
        halo.position.set(x, y, 0.058);
        panel.add(halo);
        if (random() < 0.18 + mood.wear * 0.4) flickers.push({ material, halo: haloMat, base, phase: random() * 50, rate: mix(3, 14, random()) });
      }
    }
    put(s.scatter(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 12).rotateX(Math.PI / 2), trim, sockets));
    if (a.frame === 'gilt') {
      const beads = grow(inner, border * 0.97).filter((_p, i) => i % 2 === 0).map(([x, y]) => ({ at: [x, y, 0.02] as [number, number, number], size: 1 }));
      put(s.scatter(new THREE.SphereGeometry(0.012, 8, 6), trim, beads));
      put(s.ball([0.07, 0.05, 0.03], [0, h / 2 + border + 0.03, 0], trim));
      for (const sx of [-1, 1]) put(s.ball([0.05, 0.03, 0.02], [sx * 0.09, h / 2 + border + 0.01, 0], trim));
    }
    if (a.frame === 'deco') for (const sx of [-1, 1]) put(s.box([0.03, h * 0.62, 0.06], [sx * (w / 2 + border + 0.005), -h * 0.19, 0], trim));
    if (a.frame === 'plywood') for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(s.cylinder(0.01, 0.01, 0.01, [sx * (w / 2 + border * 0.8), sy * (h / 2 + border * 0.8), 0.03], trim, 8)).rotation.x = Math.PI / 2;

    // Things tucked into the frame.
    const tuck = (texture: THREE.Texture, pw: number, ph: number, index: number, tilt: number) => {
      const [x, y] = inner[index % inner.length];
      const pull = 0.82 + random() * 0.1;
      const card = put(s.mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [x * pull, y * pull, 0.036 + random() * 0.006]));
      card.rotation.z = tilt;
      const tape = put(s.box([0.05, 0.018, 0.002], [x * pull, y * pull + ph / 2 - 0.004, 0.044], s.material('#e9dfb0', { transparent: true, opacity: 0.85 })));
      tape.rotation.z = tilt + (random() - 0.5) * 0.6;
      return card;
    };
    const spots = [8, 52, 70, 100, 22, 86, 112, 40].map((v) => v + Math.floor(random() * 8));
    const many = 1 + Math.round(mood.density * 3);
    const lined = (ink: string, paper: string, title: string, rows: number, numbered: boolean) => paint(160, 220, (ctx, cw, ch) => {
      ctx.fillStyle = paper; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = ink; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
      ctx.fillText(title, cw / 2, 28);
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let r = 0; r < rows; r++) {
        const y = 52 + r * ((ch - 70) / rows);
        if (numbered) { ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left'; ctx.fillText(`${r + 1}.`, 12, y + 5); }
        ctx.beginPath(); ctx.moveTo(numbered ? 40 : 16, y); ctx.lineTo(60 + random() * (cw - 80), y); ctx.stroke();
      }
    });
    if (a.taped === 'polaroids') {
      for (let i = 0; i < many + 2; i++) {
        const hue = Math.floor(random() * 360);
        tuck(paint(120, 140, (ctx, cw, ch) => {
          ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = `hsl(${hue} 55% ${35 + random() * 25}%)`; ctx.fillRect(10, 10, cw - 20, cw - 20);
          ctx.fillStyle = `hsl(${(hue + 150 + random() * 60) % 360} 60% 75%)`;
          ctx.beginPath(); ctx.arc(cw / 2 + (random() - 0.5) * 20, 50, 17, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cw / 2, 108, 34, 34, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = `hsl(${(hue + 40) % 360} 80% 60%)`; ctx.fillRect(cw / 2 - 22, 22, 44, 16);
        }), 0.105, 0.122, spots[i], (random() - 0.5) * 0.7);
      }
    } else if (a.taped === 'telegram') {
      tuck(lined('#3b2f22', '#e9d48c', 'TELEGRAM', 5, false), 0.2, 0.15, spots[0], -0.2 + random() * 0.3);
      if (many > 2) tuck(lined('#3b2f22', '#efe2b0', 'STOP', 3, false), 0.13, 0.09, spots[3], 0.3);
    } else if (a.taped === 'memorial') {
      tuck(paint(140, 200, (ctx, cw, ch) => {
        ctx.fillStyle = '#f3ecd9'; ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = '#17151a'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, cw - 12, ch - 12);
        ctx.fillStyle = '#7b7f88'; ctx.beginPath(); ctx.ellipse(cw / 2, 78, 30, 38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d9d2c0'; ctx.beginPath(); ctx.arc(cw / 2, 68, 13, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cw / 2, 108, 22, 20, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#17151a'; for (let r = 0; r < 3; r++) ctx.fillRect(34 + r * 8, 136 + r * 16, cw - 68 - r * 16, 5);
      }), 0.11, 0.155, spots[1], (random() - 0.5) * 0.25);
      // A pressed flower beside it.
      const [fx, fy] = inner[(spots[1] + 9) % inner.length];
      const flower = new THREE.Group();
      flower.position.set(fx * 0.86, fy * 0.86, 0.05);
      const petal = s.material('#b87f9a'), stem = s.material('#6f7b4a');
      for (let p = 0; p < 6; p++) { const m = s.ball([0.018, 0.01, 0.004], [Math.cos(p * 1.05) * 0.016, Math.sin(p * 1.05) * 0.016, 0], petal, 8); m.rotation.z = p * 1.05; flower.add(m); }
      flower.add(s.ball([0.008, 0.008, 0.005], [0, 0, 0.002], s.material('#d8b24a'), 8));
      flower.add(s.rod([0, -0.01, 0], [0.02, -0.11, 0], 0.003, stem));
      flower.rotation.z = (random() - 0.5) * 0.8;
      panel.add(flower);
    } else if (a.taped === 'setlist') {
      tuck(lined('#27304f', '#f5f2e6', 'TONIGHT', 4 + Math.floor(random() * 4), true), 0.13, 0.18, spots[2], (random() - 0.5) * 0.3);
    } else if (a.taped === 'tickets') {
      for (let i = 0; i < many + 1; i++) {
        const hue = Math.floor(random() * 360);
        tuck(paint(160, 70, (ctx, cw, ch) => {
          ctx.fillStyle = `hsl(${hue} 60% 78%)`; ctx.fillRect(0, 0, cw, ch);
          ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 3; ctx.strokeRect(5, 5, cw - 10, ch - 10);
          ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(cw * 0.72, 5); ctx.lineTo(cw * 0.72, ch - 5); ctx.stroke();
          ctx.fillStyle = '#2a2a33'; ctx.font = 'bold 26px monospace'; ctx.fillText('ADMIT 1', 12, 44);
        }), 0.12, 0.052, spots[i + 3], (random() - 0.5) * 1.1);
      }
      const [rx, ry] = inner[spots[0] % inner.length];
      const rosette = new THREE.Group();
      rosette.position.set(rx * 0.9, ry * 0.9, 0.05);
      const ribbon = s.material(mood.cheer > 0.4 ? '#2a56c8' : '#8a2030');
      rosette.add(s.cylinder(0.05, 0.05, 0.008, [0, 0, 0], ribbon, 14).rotateX(Math.PI / 2));
      rosette.add(s.cylinder(0.028, 0.028, 0.012, [0, 0, 0.004], s.material('#f1d36b', { metalness: 0.6 }), 14).rotateX(Math.PI / 2));
      for (const sx of [-1, 1]) { const tail = s.box([0.028, 0.12, 0.004], [sx * 0.02, -0.09, 0], ribbon); tail.rotation.z = sx * 0.18; rosette.add(tail); }
      panel.add(rosette);
    }

    // Something slung over a corner.
    const top = h / 2 + border;
    if (a.draped === 'boa') {
      const hue = mood.cheer > 0.5 ? '#ff4fa3' : '#7a3fa0';
      const puffs: { at: [number, number, number]; size: number; color: string }[] = [];
      const side = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 46; i++) {
        const t = i / 45;
        const x = side * (w / 2 + border) * mix(-0.2, 1.08, Math.min(1, t * 1.6));
        const y = t < 0.62 ? top + 0.03 - Math.pow(t - 0.3, 2) * 0.3 : top - (t - 0.62) * (h * 1.5);
        for (let k = 0; k < 2; k++) puffs.push({ at: [x + (random() - 0.5) * 0.04, y + (random() - 0.5) * 0.04, 0.02 + (random() - 0.5) * 0.06], size: 0.6 + random() * 0.7, color: random() < 0.3 ? '#ffffff' : hue });
      }
      put(s.scatter(new THREE.IcosahedronGeometry(0.04, 0), s.material('#ffffff', { roughness: 1, flatShading: true }), puffs));
    } else if (a.draped === 'beads') {
      const side = random() < 0.5 ? -1 : 1, pearls: { at: [number, number, number]; size: number }[] = [];
      for (let loop = 0; loop < 3; loop++) {
        const drop = 0.16 + loop * 0.09 + random() * 0.04, cx = side * (w / 2 + border - 0.07 - loop * 0.02);
        for (let i = 0; i <= 26; i++) { const t = i / 26 - 0.5; pearls.push({ at: [cx + t * 0.16, top + 0.01 - drop * (1 - 4 * t * t) + (t > 0 ? 0 : 0), 0.045 + loop * 0.008], size: 1 }); }
      }
      put(s.scatter(new THREE.SphereGeometry(0.009, 8, 6), s.material('#f6f0e2', { roughness: 0.25, metalness: 0.3 }), pearls));
    } else if (a.draped === 'sash') {
      const side = random() < 0.5 ? -1 : 1;
      const sash = put(s.mesh(new THREE.PlaneGeometry(0.11, h * 0.95), new THREE.MeshStandardMaterial({ map: paint(64, 512, (ctx, cw, ch) => {
        ctx.fillStyle = '#f4f0f6'; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#c9a13c'; ctx.fillRect(0, 0, 6, ch); ctx.fillRect(cw - 6, 0, 6, ch);
        ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#b0123e'; ctx.font = 'bold 40px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(mood.cheer > 0.5 ? 'MISS THING 1989' : 'RUNNER-UP', 0, 0, ch * 0.9); ctx.restore();
      }), roughness: 0.5, side: THREE.DoubleSide }), [side * (w / 2 + border * 0.45), top - h * 0.44, 0.075]));
      sash.rotation.z = side * 0.12;
    }

    // Stand and counter clutter.
    const baseW = Math.max(0.34, (kind === 'rect' ? w + border * 2 : w * 0.7));
    const lift = kind === 'rect' ? 0.05 : 0.13;
    panel.position.set(0, lift + h / 2 + border, 0);
    panel.rotation.x = -0.1;
    s.box([baseW, 0.035, 0.24], [0, 0.0175, -0.02], frameMat);
    if (kind === 'rect') for (const sx of [-1, 1]) s.box([0.05, 0.07, 0.1], [sx * (baseW / 2 - 0.08), 0.05, -0.03], frameMat);
    else { s.lathe([[0.1, 0], [0.085, 0.03], [0.03, 0.06], [0.026, 0.11], [0.045, 0.14]], trim, [0, 0.03, -0.03]); }
    const brace = s.rod([0, lift + (h / 2 + border) * 1.1, -0.06], [0, 0.03, -0.13], 0.012, trim);
    brace.castShadow = true;
    const clutter = Math.round(mood.density * 5);
    for (let i = 0; i < clutter; i++) {
      const x = (random() - 0.5) * (baseW - 0.08), z = 0.045 + random() * 0.04;
      if (random() < 0.6) {
        const lying = random() < 0.4;
        const tube = s.cylinder(0.011, 0.011, 0.065, [x, lying ? 0.046 : 0.0675, z], s.material(random() < 0.5 ? '#1b1b20' : '#c9a13c', { metalness: 0.6, roughness: 0.3 }), 10);
        if (lying) { tube.rotation.z = Math.PI / 2; tube.rotation.y = random() * 3; }
        else s.cylinder(0.007, 0.009, 0.02, [x, 0.108, z], s.material(lip), 8);
      } else {
        s.cylinder(0.03, 0.03, 0.03, [x, 0.05, z], s.material('#e9c9d2', { roughness: 0.4 }), 14);
        s.ball([0.03, 0.018, 0.03], [x, 0.072, z], s.material('#fbe7ee', { roughness: 1 }), 10);
      }
    }

    const speed = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const f of flickers) {
          const n = Math.sin(time * f.rate * speed + f.phase) + Math.sin(time * f.rate * 2.7 * speed + f.phase * 1.7);
          const on = n > -0.9 ? 1 : 0.12;
          f.material.emissiveIntensity = f.base * on;
          f.halo.opacity = 0.2 * on;
        }
      },
    });
  },
});
