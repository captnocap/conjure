import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const WHO = {
  madonna: 'The Madonna and child in a blue mantle under gold stars.',
  'sacred-heart': 'Christ in red and white pointing to a burning heart.',
  anthony: 'Saint Anthony in a brown habit holding a lily and a child.',
  'black-madonna': 'A dark-faced Madonna in a stiff cone of gold and red robes, crowned.',
  photograph: 'No saint: a framed black-and-white photograph of a neighbour who died.',
  empty: 'Nobody: the image is gone, leaving a pale rectangle and a nail.',
} as const;

function icon(who: keyof typeof WHO, r: () => number, wear: number) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d')!;
  const oval = (x: number, y: number, rx: number, ry: number, fill: string) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  const path = (points: number[][], fill: string) => { g.fillStyle = fill; g.beginPath(); g.moveTo(points[0][0], points[0][1]); for (const [x, y] of points.slice(1)) g.lineTo(x, y); g.closePath(); g.fill(); };
  const face = (x: number, y: number, size: number, skin: string) => { oval(x, y, size, size * 1.25, skin); g.fillStyle = '#2a1c14'; g.fillRect(x - size * 0.5, y - size * 0.1, size * 0.28, size * 0.14); g.fillRect(x + size * 0.22, y - size * 0.1, size * 0.28, size * 0.14); g.fillRect(x - size * 0.2, y + size * 0.6, size * 0.4, size * 0.1); };
  if (who === 'madonna') {
    g.fillStyle = '#1d3f8a'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#f2cf5a'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(r() * 256, r() * 320, 2 + r() * 3, 0, 7); g.fill(); }
    oval(128, 96, 58, 58, '#f2c84a'); oval(128, 96, 50, 50, '#f7dd88');
    path([[128, 40], [176, 80], [196, 200], [236, 320], [20, 320], [60, 200], [80, 80]], '#2f6fd0');
    path([[128, 150], [170, 320], [86, 320]], '#c4283a');
    path([[128, 52], [164, 86], [160, 140], [96, 140], [92, 86]], '#f4f0e6');
    face(128, 100, 25, '#eac6a2');
    oval(170, 196, 30, 30, '#f2c84a'); path([[150, 210], [196, 215], [206, 290], [140, 290]], '#f6efd8'); face(170, 198, 16, '#eac6a2');
  } else if (who === 'sacred-heart') {
    g.fillStyle = '#f1e2b8'; g.fillRect(0, 0, 256, 320);
    g.strokeStyle = '#e5b93f'; g.lineWidth = 5; for (let i = 0; i < 24; i++) { g.beginPath(); g.moveTo(128, 100); g.lineTo(128 + Math.cos(i * 0.262) * 300, 100 + Math.sin(i * 0.262) * 300); g.stroke(); }
    oval(128, 92, 52, 52, '#f2c84a');
    path([[90, 130], [166, 130], [220, 320], [36, 320]], '#f6f1e2');
    path([[84, 130], [116, 130], [90, 320], [30, 320]], '#c4283a'); path([[172, 130], [150, 150], [200, 320], [230, 320]], '#c4283a');
    oval(128, 86, 34, 44, '#5a3a22'); face(128, 96, 24, '#e6bf9a'); path([[108, 112], [148, 112], [128, 140]], '#5a3a22');
    oval(128, 210, 34, 34, '#f7dd6a'); oval(118, 204, 13, 13, '#d81f2f'); oval(138, 204, 13, 13, '#d81f2f'); path([[105, 208], [151, 208], [128, 236]], '#d81f2f');
  } else if (who === 'anthony') {
    g.fillStyle = '#a9cbe6'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#7fae6a'; g.fillRect(0, 260, 256, 60);
    oval(118, 92, 52, 52, '#f2c84a');
    path([[84, 130], [156, 130], [196, 320], [44, 320]], '#6b4a30'); g.fillStyle = '#e9e2cf'; g.fillRect(70, 226, 110, 6);
    oval(118, 86, 31, 34, '#4a3020'); face(118, 96, 24, '#e6bf9a'); oval(118, 70, 16, 10, '#e6bf9a');
    oval(182, 170, 24, 24, '#f2c84a'); face(182, 172, 14, '#eac6a2'); path([[166, 186], [200, 186], [206, 240], [160, 240]], '#f6efd8');
    g.strokeStyle = '#3f7a3c'; g.lineWidth = 5; g.beginPath(); g.moveTo(60, 280); g.lineTo(46, 150); g.stroke();
    for (const [x, y] of [[46, 140], [34, 158], [58, 162]]) oval(x, y, 12, 16, '#fbf8ee');
  } else if (who === 'black-madonna') {
    g.fillStyle = '#d9ae3c'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#c28f24'; for (let y = 0; y < 320; y += 20) for (let x = (y / 20) % 2 ? 0 : 10; x < 256; x += 20) g.fillRect(x, y, 5, 5);
    path([[128, 70], [226, 310], [30, 310]], '#b01f2c');
    g.strokeStyle = '#f2d060'; g.lineWidth = 7; for (let y = 140; y < 310; y += 34) { g.beginPath(); g.moveTo(128 - (y - 70) * 0.38, y); g.lineTo(128 + (y - 70) * 0.38, y); g.stroke(); }
    face(128, 82, 24, '#3d2a20'); path([[100, 58], [108, 22], [120, 46], [128, 16], [136, 46], [148, 22], [156, 58]], '#f2d060');
    face(128, 168, 14, '#3d2a20'); path([[114, 156], [120, 138], [128, 150], [136, 138], [142, 156]], '#f2d060');
  } else if (who === 'photograph') {
    g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#e9e4d6'; g.fillRect(22, 22, 212, 276);
    oval(128, 150, 84, 106, '#8c8a84'); oval(128, 250, 80, 70, '#3a3a3c'); g.fillStyle = '#e9e4d6'; g.fillRect(22, 256, 212, 42);
    oval(128, 108, 40, 30, '#55524e'); face(128, 128, 30, '#c9c6be'); path([[112, 196], [128, 214], [144, 196], [128, 188]], '#dedbd2');
    g.fillStyle = '#1c1c1e'; g.fillRect(124, 264, 8, 28); g.fillRect(116, 272, 24, 7);
  } else {
    g.fillStyle = '#b9b09c'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#d6cfbd'; g.fillRect(48, 60, 160, 210);
    g.strokeStyle = 'rgba(80,70,55,0.5)'; g.lineWidth = 3; g.strokeRect(48, 60, 160, 210);
    g.fillStyle = '#3a342c'; g.beginPath(); g.arc(128, 78, 5, 0, 7); g.fill();
  }
  // Soot, fading and damp over the picture.
  g.fillStyle = `rgba(190,180,150,${wear * 0.35})`; g.fillRect(0, 0, 256, 320);
  for (let i = 0; i < wear * 26; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,62,48' : '226,220,200'},${0.15 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 256, r() * 320, 6 + r() * 24, 5 + r() * 14, r() * 3, 0, 7); g.fill(); }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function stuccoTexture(base: string, r: () => number, wear: number) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#a8563c'; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = '#d2c3a8'; g.lineWidth = 2;
  for (let y = 0; y < 512; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 14) % 2 ? 0 : 20; x < 256; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 14); g.stroke(); } }
  g.fillStyle = base; g.beginPath(); g.rect(0, 0, 256, 512);
  for (let i = 0; i < 2 + wear * 8; i++) {
    const cx = r() < 0.5 ? r() * 60 : 196 + r() * 60, cy = r() * 512, rad = 16 + r() * (20 + wear * 40);
    g.moveTo(cx + rad, cy);
    for (let k = 11; k >= 0; k--) { const t = (k / 12) * Math.PI * 2, rr = rad * (0.6 + r() * 0.6); g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 1.3); }
    g.closePath();
  }
  g.fill();
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,250,235' : '70,50,40'},${0.03 + r() * 0.07})`; g.fillRect(r() * 256, r() * 512, 6 + r() * 40, 4 + r() * 30); }
  const soot = g.createRadialGradient(128, 150, 10, 128, 110, 130);
  soot.addColorStop(0, 'rgba(40,34,30,0.45)'); soot.addColorStop(1, 'rgba(40,34,30,0)');
  g.fillStyle = soot; g.fillRect(0, 0, 256, 300);
  const damp = g.createLinearGradient(0, 512, 0, 400);
  damp.addColorStop(0, 'rgba(52,70,48,0.8)'); damp.addColorStop(1, 'rgba(70,72,60,0)');
  g.fillStyle = damp; g.fillRect(0, 400, 256, 112);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    who: choice('Who is depicted in the niche?', WHO),
    frame: choice('What is the shrine itself made of?', {
      marble: 'White stone with little columns and a pediment, a miniature temple.',
      wood: 'A dark wooden box with a pitched tin roof, home-made.',
      gilded: 'An arched baroque frame, gilded and scrolled, too grand for its alley.',
      cage: 'A plain niche in the wall behind an iron grille.',
    }),
    candle: choice('What light burns in front of it?', {
      lit: 'One red glass candle, lit.',
      many: 'A crowd of candles, all lit: an anniversary, or a crisis.',
      out: 'A burnt-out stub in a puddle of wax.',
      electric: 'A cold electric bulb pretending to be a flame.',
      none: 'No light at all.',
    }),
    flowers: choice('What flowers have been left?', {
      plastic: 'Gaudy plastic flowers that never die.',
      fresh: 'Fresh white lilies and roses, brought today.',
      dead: 'Brown dead stalks nobody has replaced.',
      none: 'None.',
    }),
    tucked: choice('What has someone added?', {
      nothing: 'Nothing.',
      note: 'A folded paper note tucked into the frame.',
      rosary: 'A rosary hung over one corner.',
      exvoto: 'Silver ex-voto hearts pinned around it in thanks.',
      coins: 'A scatter of coins on the ledge.',
      photo: 'A small snapshot taped to the glass.',
      shoes: "A pair of baby's shoes on the ledge.",
    }),
    wall: choice('What wall is it fixed to?', {
      red: 'Rusty Venetian red stucco.',
      ochre: 'Yellow ochre stucco.',
      plaster: 'Grey-white plaster.',
      brick: 'Bare old brick.',
    }),
    cracked: noul('Is the glass of the niche cracked?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.candle === 'lit' || a.candle === 'many';
    const wallColour = { red: '#b5553c', ochre: '#d9a94e', plaster: '#c9c4b6', brick: '#a8563c' }[a.wall];
    const wall = new THREE.MeshStandardMaterial({ map: stuccoTexture(wallColour, random, a.wall === 'brick' ? 0 : mood.wear), roughness: 0.95 });
    const brick = s.material('#a8563c', { roughness: 1 });
    const W = 1.95, H = 3, face = 0.16;
    s.box([W, H, 0.32], [0, H / 2, 0], wall);
    for (let i = 0; i < 7; i++) s.box([W / 7 + 0.01, 0.1 + random() * 0.3, 0.32], [-W / 2 + (i + 0.5) * W / 7, H + 0.05, 0], brick);
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) if (random() < 0.6) s.box([0.1 + random() * 0.14, 0.14, 0.32], [side * (W / 2 + 0.03), 0.25 + i * 0.3, 0], brick);
    s.box([W + 0.1, 0.22, 0.4], [0, 0.11, 0.02], s.material('#bdb6a4'));

    const frameMat = { marble: s.material('#e6e1d4'), wood: s.material('#4a3324'), gilded: s.material('#dcae3a', { metalness: 0.3, roughness: 0.35, emissive: '#a87a1a', emissiveIntensity: 0.15 }), cage: s.material('#2b2b2e') }[a.frame];
    const iron = s.material('#2b2b2e');
    const cy = 1.82, fw = 0.9, fh = 1.14, depth = a.frame === 'cage' ? 0.03 : 0.2;
    const front = face + depth;
    // Niche: back, picture, sides.
    const picture = new THREE.MeshStandardMaterial({ map: icon(a.who, random, mood.wear), roughness: 0.8 });
    if (lit) { picture.emissive = new THREE.Color('#ffb060'); picture.emissiveMap = picture.map; picture.emissiveIntensity = 0.35; }
    s.box([fw, fh, 0.02], [0, cy, face + 0.01], s.material('#2a2622'));
    s.mesh(new THREE.PlaneGeometry(fw - 0.14, fh - 0.14), picture, [0, cy, face + (a.frame === 'cage' ? 0.03 : 0.1)]);
    if (a.frame !== 'cage') {
      for (const side of [-1, 1]) s.box([0.07, fh, depth], [side * (fw / 2 - 0.035), cy, face + depth / 2], frameMat);
      s.box([fw, 0.07, depth], [0, cy - fh / 2 + 0.035, face + depth / 2], frameMat);
      s.box([fw, 0.07, depth], [0, cy + fh / 2 - 0.035, face + depth / 2], frameMat);
    } else {
      s.box([fw + 0.1, 0.07, 0.08], [0, cy + fh / 2 + 0.03, face + 0.03], s.material('#bdb6a4'));
      for (let i = 0; i <= 6; i++) s.rod([-fw / 2 + i * fw / 6, cy - fh / 2, front + 0.02], [-fw / 2 + i * fw / 6, cy + fh / 2, front + 0.02], 0.011, iron);
      for (const y of [-0.3, 0, 0.3]) s.rod([-fw / 2, cy + y, front + 0.025], [fw / 2, cy + y, front + 0.025], 0.011, iron);
    }
    const top = cy + fh / 2;
    if (a.frame === 'marble') {
      for (const side of [-1, 1]) {
        s.cylinder(0.045, 0.05, fh - 0.1, [side * (fw / 2 + 0.03), cy, front + 0.02], frameMat, 12);
        s.box([0.13, 0.06, 0.13], [side * (fw / 2 + 0.03), top - 0.03, front + 0.02], frameMat);
        s.box([0.13, 0.06, 0.13], [side * (fw / 2 + 0.03), cy - fh / 2 + 0.03, front + 0.02], frameMat);
      }
      const gable = new THREE.Shape(); gable.moveTo(-fw / 2 - 0.14, 0); gable.lineTo(fw / 2 + 0.14, 0); gable.lineTo(0, 0.32); gable.closePath();
      s.mesh(new THREE.ExtrudeGeometry(gable, { depth: depth + 0.12, bevelEnabled: false }), frameMat, [0, top, face]);
      s.box([fw + 0.3, 0.05, depth + 0.16], [0, top + 0.01, face + depth / 2 + 0.06], frameMat);
    } else if (a.frame === 'wood') {
      const tin = s.material(new THREE.Color('#8f9aa0').lerp(new THREE.Color('#8a5a3a'), mood.wear * 0.7), { metalness: 0.3, roughness: 0.6 });
      for (const side of [-1, 1]) { const roof = s.box([0.7, 0.03, depth + 0.14], [side * 0.29, top + 0.17, face + depth / 2 + 0.05], tin); roof.rotation.z = -side * 0.55; }
      const gable = new THREE.Shape(); gable.moveTo(-fw / 2, 0); gable.lineTo(fw / 2, 0); gable.lineTo(0, 0.3); gable.closePath();
      s.mesh(new THREE.ExtrudeGeometry(gable, { depth: depth, bevelEnabled: false }), frameMat, [0, top, face]);
    } else if (a.frame === 'gilded') {
      const arch = s.mesh(new THREE.CylinderGeometry(fw / 2, fw / 2, depth, 24, 1, false, 0, Math.PI), frameMat, [0, top - 0.01, face + depth / 2]);
      arch.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      const inner = s.mesh(new THREE.CylinderGeometry(fw / 2 - 0.08, fw / 2 - 0.08, 0.02, 24, 1, false, 0, Math.PI), s.material('#7a1f2a'), [0, top - 0.01, front + 0.005]);
      inner.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      for (const side of [-1, 1]) {
        s.ring(0.09, 0.03, [side * (fw / 2 + 0.05), cy - fh / 2 + 0.08, front - 0.03], frameMat);
        s.ring(0.07, 0.025, [side * (fw / 2 + 0.04), top - 0.02, front - 0.03], frameMat);
        s.ring(0.11, 0.03, [side * (fw / 2 + 0.07), cy, front - 0.03], frameMat, Math.PI).rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      s.ball([0.1, 0.12, 0.06], [0, top + fw / 2 + 0.06, front - 0.04], frameMat, 12);
    }
    if (a.frame !== 'cage') {
      const crossY = top + (a.frame === 'marble' ? 0.32 : a.frame === 'wood' ? 0.36 : fw / 2 + 0.16);
      s.box([0.03, 0.22, 0.03], [0, crossY + 0.11, face + depth / 2], iron);
      s.box([0.13, 0.03, 0.03], [0, crossY + 0.15, face + depth / 2], iron);
      // Glass, with streaks of reflection and perhaps a crack.
      const glass = new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.07, roughness: 0.05, depthWrite: false });
      s.mesh(new THREE.PlaneGeometry(fw - 0.14, fh - 0.14), glass, [0, cy, front - 0.02]).castShadow = false;
      const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false });
      for (const [x, w] of [[-0.24, 0.04], [-0.17, 0.015]]) { const streak = s.mesh(new THREE.PlaneGeometry(w, fh * 0.5), glint, [x, cy + 0.1, front - 0.018]); streak.rotation.z = -0.5; streak.castShadow = false; }
      if (a.cracked) {
        const crack = new THREE.MeshBasicMaterial({ color: '#f4fbff' });
        const hub: [number, number, number] = [0.1 + random() * 0.1, cy - 0.15 + random() * 0.2, front - 0.015];
        for (let i = 0; i < 4; i++) { const angle = i * 1.57 + random() * 0.5, len = 0.14 + random() * 0.26; s.rod(hub, [THREE.MathUtils.clamp(hub[0] + Math.cos(angle) * len, -fw / 2 + 0.08, fw / 2 - 0.08), THREE.MathUtils.clamp(hub[1] + Math.sin(angle) * len, cy - fh / 2 + 0.08, cy + fh / 2 - 0.08), hub[2]], 0.003, crack).castShadow = false; }
      }
    }

    // Ledge with its offerings.
    const ledgeY = cy - fh / 2 - 0.05, ledgeZ = face + 0.2;
    s.box([fw + 0.4, 0.05, 0.4], [0, ledgeY - 0.025, ledgeZ], a.frame === 'wood' ? frameMat : s.material('#d9d3c4'));
    for (const side of [-1, 1]) { const corbel = s.box([0.06, 0.2, 0.3], [side * (fw / 2 + 0.05), ledgeY - 0.14, face + 0.13], a.frame === 'wood' ? frameMat : s.material('#d9d3c4')); corbel.rotation.x = 0.5; }
    const flames: THREE.Mesh[] = [];
    const candleAt = (x: number, z: number, tall: number, burning: boolean) => {
      const glassRed = s.material('#c21a26', { emissive: '#ff3a20', emissiveIntensity: burning ? mix(0.9, 1.6, 1 - Math.abs(mood.daylight - 0.5) * 2) : 0, roughness: 0.3 });
      s.cylinder(0.045, 0.04, tall, [x, ledgeY + tall / 2, z], glassRed, 12);
      if (burning) {
        const flame = s.mesh(new THREE.ConeGeometry(0.02, 0.07, 8), new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ffc040', emissiveIntensity: 3 }), [x, ledgeY + tall + 0.04, z]);
        flame.castShadow = false;
        flames.push(flame);
      }
    };
    if (a.candle === 'lit') candleAt(0, ledgeZ + 0.08, 0.16, true);
    else if (a.candle === 'many') { const n = 5 + Math.round(mood.density * 4); for (let i = 0; i < n; i++) candleAt(-0.3 + (i / (n - 1)) * 0.6 + (random() - 0.5) * 0.04, ledgeZ + 0.03 + (i % 2) * 0.1, 0.09 + random() * 0.1, random() > 0.12); }
    else if (a.candle === 'out') {
      const wax = s.material('#e9e2d0');
      s.cylinder(0.05, 0.07, 0.012, [0, ledgeY + 0.006, ledgeZ + 0.08], wax, 12).scale.set(1.5, 1, 1.1);
      s.cylinder(0.022, 0.03, 0.05, [0, ledgeY + 0.03, ledgeZ + 0.08], wax, 10);
      s.rod([0, ledgeY + 0.05, ledgeZ + 0.08], [0.008, ledgeY + 0.075, ledgeZ + 0.08], 0.004, iron);
      s.rod([0.07, ledgeY - 0.05, ledgeZ + 0.2], [0.07, ledgeY - 0.17, ledgeZ + 0.2], 0.012, wax, 0.004);
    } else if (a.candle === 'electric') {
      s.cylinder(0.03, 0.035, 0.14, [0, ledgeY + 0.07, ledgeZ + 0.08], s.material('#f0ead8'), 10);
      s.ball([0.028, 0.045, 0.028], [0, ledgeY + 0.18, ledgeZ + 0.08], s.material('#fff2c8', { emissive: '#ffd070', emissiveIntensity: 1.6 }), 10);
      s.tube([[0, ledgeY + 0.01, ledgeZ + 0.05], [0.2, ledgeY + 0.01, ledgeZ - 0.1], [fw / 2 + 0.16, ledgeY - 0.1, face + 0.01], [fw / 2 + 0.2, 0.3, face + 0.01]], 0.007, s.material('#e9e4d6'));
    }
    if (a.flowers !== 'none') for (const side of [-1, 1]) {
      const vx = side * (fw / 2 + 0.03), vz = ledgeZ + 0.05;
      s.lathe([[0.03, 0], [0.05, 0.05], [0.035, 0.13], [0.045, 0.16]], s.material(a.flowers === 'plastic' ? '#4f9ad0' : '#d9e4e0', { roughness: 0.3 }), [vx, ledgeY, vz]);
      const count = a.flowers === 'dead' ? 4 : 6;
      const tones = a.flowers === 'plastic' ? ['#ff3d7f', '#ffd21f', '#ff7a1a', '#b03cff', '#ff2a2a'] : a.flowers === 'fresh' ? ['#fbf8ee', '#f7e7ea', '#f2a0b0'] : ['#7a6248', '#8f7a56'];
      for (let i = 0; i < count; i++) {
        const tip: [number, number, number] = [vx + (random() - 0.5) * 0.22, ledgeY + (a.flowers === 'dead' ? 0.2 + random() * 0.12 : 0.28 + random() * 0.16), vz + random() * 0.12 - 0.02];
        s.rod([vx, ledgeY + 0.15, vz], tip, 0.006, s.material(a.flowers === 'dead' ? '#6b5a3c' : '#3f8a3c'));
        const tone = tones[Math.floor(random() * tones.length)];
        const bloom = s.ball(a.flowers === 'dead' ? [0.025, 0.035, 0.025] : [0.05, 0.045, 0.05], tip, s.material(tone, a.flowers === 'plastic' ? { emissive: tone, emissiveIntensity: 0.25, roughness: 0.3 } : {}), 8);
        if (a.flowers === 'dead') bloom.position.y -= 0.03;
      }
      if (a.flowers === 'dead') for (let i = 0; i < 4; i++) s.box([0.03, 0.004, 0.02], [vx + (random() - 0.5) * 0.2, ledgeY + 0.003, vz + random() * 0.12], s.material('#8f7a56')).rotation.y = random() * 3;
    }

    // What someone added.
    const paper = s.material('#f6f1e2', { emissive: '#f6f1e2', emissiveIntensity: 0.1 });
    if (a.tucked === 'note') {
      const note = s.box([0.13, 0.17, 0.012], [fw / 2 - 0.1, cy - 0.2, front + 0.012], paper); note.rotation.z = -0.3;
      s.box([0.13, 0.004, 0.014], [fw / 2 - 0.1, cy - 0.2, front + 0.014], s.material('#c9c2ae')).rotation.z = -0.3;
    } else if (a.tucked === 'rosary') {
      const bead = s.material('#5a2f1f');
      const cx = -fw / 2 - 0.02, hang = cy + fh / 2 - 0.05;
      for (let i = 0; i < 22; i++) { const t = (i / 21) * Math.PI * 2; s.ball([0.014, 0.014, 0.014], [cx + Math.sin(t) * 0.09, hang - 0.2 + Math.cos(t) * 0.2, front + 0.02], bead, 6); }
      for (let i = 0; i < 4; i++) s.ball([0.014, 0.014, 0.014], [cx, hang - 0.42 - i * 0.035, front + 0.02], bead, 6);
      s.box([0.02, 0.1, 0.01], [cx, hang - 0.62, front + 0.02], s.material('#c9c9c4', { metalness: 0.4 }));
      s.box([0.06, 0.02, 0.01], [cx, hang - 0.6, front + 0.02], s.material('#c9c9c4', { metalness: 0.4 }));
    } else if (a.tucked === 'exvoto') {
      const silver = s.material('#e3e6ea', { metalness: 0.4, roughness: 0.25, emissive: '#9aa4b0', emissiveIntensity: 0.2 });
      const heart = new THREE.Shape(); heart.moveTo(0, -0.06); heart.bezierCurveTo(0.09, 0, 0.07, 0.08, 0, 0.035); heart.bezierCurveTo(-0.07, 0.08, -0.09, 0, 0, -0.06);
      const geometry = new THREE.ExtrudeGeometry(heart, { depth: 0.012, bevelEnabled: false });
      for (let i = 0; i < 9 + Math.round(mood.density * 6); i++) {
        const side = i % 2 ? 1 : -1;
        const pin = s.mesh(geometry, silver, [side * (fw / 2 + 0.22 + random() * 0.2), cy - 0.45 + random() * 0.95, face + 0.005]);
        pin.rotation.z = (random() - 0.5) * 0.5; pin.scale.setScalar(0.9 + random() * 0.5);
      }
    } else if (a.tucked === 'coins') {
      for (let i = 0; i < 9; i++) s.cylinder(0.02, 0.02, 0.005, [(random() - 0.5) * 0.5, ledgeY + 0.004 + (i % 3) * 0.005, ledgeZ + 0.1 + random() * 0.08], s.material(i % 2 ? '#d9b04a' : '#b9bcc0', { metalness: 0.4, roughness: 0.3 }), 10);
    } else if (a.tucked === 'photo') {
      const snap = s.box([0.14, 0.16, 0.006], [-0.14, cy - 0.22, front + 0.006], paper); snap.rotation.z = 0.12;
      const face2 = s.box([0.11, 0.1, 0.004], [-0.14, cy - 0.205, front + 0.009], s.material('#7f8a94')); face2.rotation.z = 0.12;
      s.box([0.07, 0.02, 0.004], [-0.13, cy - 0.13, front + 0.011], s.material('#e9dfae'));
    } else if (a.tucked === 'shoes') {
      for (const side of [-1, 1]) {
        s.ball([0.03, 0.022, 0.055], [-0.2 + side * 0.04, ledgeY + 0.02, ledgeZ + 0.12], s.material('#f2ede2'), 10).rotation.y = side * 0.25;
        s.cylinder(0.024, 0.026, 0.04, [-0.2 + side * 0.04, ledgeY + 0.04, ledgeZ + 0.09], s.material('#f2ede2'), 10);
      }
    }
    // A lamp arm above, and a jar on the ground when the mood is crowded.
    s.tube([[0.5, top + 0.5, face], [0.5, top + 0.62, face + 0.2], [0.5, top + 0.52, face + 0.34]], 0.012, iron);
    s.cylinder(0.02, 0.07, 0.06, [0.5, top + 0.47, face + 0.34], iron, 8);
    s.cylinder(0.06, 0.045, 0.14, [0.5, top + 0.37, face + 0.34], s.material('#e9e2c4', lit || a.candle === 'electric' ? { emissive: '#ffcf80', emissiveIntensity: 0.9 } : {}), 8);
    if (mood.density > 0.55) {
      s.cylinder(0.06, 0.06, 0.16, [-0.4, 0.3, face + 0.12], s.material('#cfe0dc', { roughness: 0.2 }), 10);
      for (let i = 0; i < 5; i++) s.ball([0.04, 0.04, 0.04], [-0.4 + (random() - 0.5) * 0.14, 0.46 + random() * 0.1, face + 0.12 + (random() - 0.5) * 0.1], s.material(['#f2e24a', '#f6f1e2', '#e86a8a'][i % 3]), 8);
    }

    const energy = mix(0.4, 1.6, mood.energy), phases = flames.map(() => random() * 10);
    const update = (_dt: number, time: number) => flames.forEach((flame, i) => {
      const f = Math.sin(time * 9 * energy + phases[i]) * 0.5 + Math.sin(time * 23 * energy + phases[i] * 2) * 0.5;
      flame.scale.set(1 + f * 0.12, 1 + f * 0.3 * energy, 1 + f * 0.12);
      flame.rotation.z = f * 0.2 * energy;
    });
    return s.finish({ update });
  },
});
