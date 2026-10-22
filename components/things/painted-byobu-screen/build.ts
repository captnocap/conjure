import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

const SUBJECTS = {
  cranes: 'Red-crowned cranes stepping beneath a twisting pine, long life and New Year.',
  waves: 'Rolling blue waves with clawed white foam under a red sun.',
  mountains: 'Ink-grey mountain ridges dissolving into bands of mist, with one tiny pavilion.',
  plum: 'A dark old plum branch in pink blossom crossing a huge pale moon.',
  grasses: 'Autumn grasses and small flowers bending before a half-sunk silver moon.',
  bamboo: 'Green bamboo stalks with sparrows, fresh and upright.',
  blank: 'Nothing painted at all: only the bare squares of leaf, austere and expensive.',
} as const;

export default defineThing({
  questions: {
    subject: choice('What is painted across the screen?', SUBJECTS),
    ground: choice('What is the ground behind the painting?', {
      gold: 'Squares of gold leaf, glowing and grand.',
      silver: 'Tarnished silver leaf, cool and moonlit.',
      paper: 'Plain cream paper, quiet and scholarly.',
      indigo: 'Deep indigo paper with flecks of gold dust, like night.',
    }),
    panels: choice('How many panels does it have?', {
      two: 'Two panels, a small corner screen.',
      four: 'Four panels, the usual room screen.',
      six: 'Six panels, a long formal screen that fills a wall.',
    }),
    height: choice('How tall is it?', {
      low: 'Knee-to-waist high, a tea-hearth or pillow screen.',
      standing: 'Shoulder high, enough to change behind.',
      grand: 'Taller than a person, made for a hall.',
    }),
    fold: score('How is it standing?', ['Pulled almost flat like a wall', 'An easy zigzag', 'Folded tight and narrow, half put away']),
    draped: choice('What has been left on it?', {
      nothing: 'Nothing; it stands as it was arranged.',
      kimono: 'A patterned kimono thrown over the top of one panel.',
      sash: 'A long obi sash trailing over one fold to the floor.',
      towel: 'A plain white towel, someone bathing behind it.',
    }),
    border: choice('What brocade border frames the panels?', {
      black: 'Thin black lacquer only, severe.',
      red: 'Vermilion brocade with small gold diamonds.',
      green: 'Moss-green brocade with a woven key pattern.',
      purple: 'Faded purple silk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { two: 2, four: 4, six: 6 }[a.panels];
    const H = { low: 0.85, standing: 1.55, grand: 1.95 }[a.height];
    const panelW = a.height === 'low' ? 0.48 : a.height === 'grand' ? 0.62 : 0.52;
    const wear = mood.wear;

    // --- The painting: one long canvas shared by every panel -----------------------------------
    const CW = 256 * count, CH = Math.round(256 * H / panelW / 1.0);
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const c = canvas.getContext('2d') as Ctx;
    const groundColour = { gold: '#d6a83c', silver: '#b9bcb6', paper: '#e9e0c8', indigo: '#1f2a4f' }[a.ground];
    c.fillStyle = groundColour; c.fillRect(0, 0, CW, CH);
    if (a.ground === 'gold' || a.ground === 'silver') {
      const cell = 64;
      for (let x = 0; x < CW; x += cell) for (let y = 0; y < CH; y += cell) {
        c.fillStyle = `rgba(${a.ground === 'gold' ? '255,225,140' : '235,238,232'},${random() * 0.28})`; c.fillRect(x, y, cell, cell);
        c.fillStyle = `rgba(${a.ground === 'gold' ? '120,70,10' : '70,74,80'},${random() * 0.16})`; c.fillRect(x, y, cell, cell);
        c.strokeStyle = 'rgba(90,60,10,0.18)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, cell, cell);
      }
    } else if (a.ground === 'indigo') {
      c.fillStyle = '#e6c25a';
      for (let k = 0; k < 500 * count; k++) c.fillRect(random() * CW, random() ** 2 * CH, 1.6, 1.6);
    }
    const ink = a.ground === 'indigo' ? '#e8e2cf' : '#22201c';
    const cloud = (x: number, y: number, w: number, colour: string) => {
      c.fillStyle = colour;
      c.beginPath(); c.ellipse(x, y, w, w * 0.16, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(x + w * 0.4, y + w * 0.14, w * 0.7, w * 0.12, 0, 0, 7); c.fill();
    };

    if (a.subject === 'cranes') {
      // Pine: a twisting trunk with flat pads of needles.
      const tx = CW * mix(0.12, 0.3, random());
      c.strokeStyle = '#4a2f1c'; c.lineCap = 'round';
      const limb = (x0: number, y0: number, x1: number, y1: number, w: number) => { c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + 30, (y0 + y1) / 2 - 20, x1, y1); c.stroke(); };
      limb(tx, CH, tx + 40, CH * 0.5, 34); limb(tx + 40, CH * 0.5, tx - 30, CH * 0.16, 22);
      limb(tx + 34, CH * 0.52, tx + CW * 0.3, CH * 0.3, 14); limb(tx, CH * 0.3, tx - 90, CH * 0.36, 10);
      for (const [px, py, pw] of [[tx - 30, CH * 0.13, 110], [tx + CW * 0.3, CH * 0.27, 130], [tx - 100, CH * 0.33, 80], [tx + 110, CH * 0.14, 90], [tx + CW * 0.16, CH * 0.4, 70]]) {
        for (let k = 0; k < 3; k++) { c.fillStyle = ['#2f5a3a', '#3f7048', '#27492f'][k]; c.beginPath(); c.ellipse(px + (k - 1) * pw * 0.45, py + k * 6, pw * 0.55, pw * 0.2, 0, Math.PI, 0); c.fill(); }
      }
      const cranes = Math.max(1, count - 1);
      for (let k = 0; k < cranes; k++) {
        const x = CW * (0.42 + (k + random() * 0.5) * 0.5 / cranes), y = CH * mix(0.6, 0.76, random()), sc = CH / 620 * mix(0.9, 1.2, random()), flip = random() < 0.5 ? -1 : 1;
        c.save(); c.translate(x, y); c.scale(sc * flip, sc);
        c.strokeStyle = '#2a2622'; c.lineWidth = 5; c.beginPath(); c.moveTo(-8, 30); c.lineTo(-12, 120); c.moveTo(14, 30); c.lineTo(22, 70); c.lineTo(10, 120); c.stroke();
        c.fillStyle = '#f6f3ea'; c.beginPath(); c.ellipse(0, 0, 62, 36, -0.15, 0, 7); c.fill();
        c.fillStyle = '#1c1a18'; c.beginPath(); c.moveTo(-40, -18); c.quadraticCurveTo(-100, 0, -84, 34); c.quadraticCurveTo(-60, 22, -30, 20); c.fill();
        c.strokeStyle = '#1c1a18'; c.lineWidth = 12; c.beginPath(); c.moveTo(46, -14); c.quadraticCurveTo(76, -60, 58, -112); c.stroke();
        c.fillStyle = '#f6f3ea'; c.beginPath(); c.ellipse(60, -120, 14, 11, 0, 0, 7); c.fill();
        c.fillStyle = '#c0282c'; c.beginPath(); c.ellipse(58, -129, 8, 5, 0, 0, 7); c.fill();
        c.fillStyle = '#8a7a3a'; c.beginPath(); c.moveTo(72, -124); c.lineTo(110, -114); c.lineTo(72, -114); c.fill();
        c.restore();
      }
      cloud(CW * 0.7, CH * 0.12, 150, 'rgba(255,240,200,0.4)');
    } else if (a.subject === 'waves') {
      c.fillStyle = '#c0282c'; c.beginPath(); c.arc(CW * mix(0.6, 0.85, random()), CH * 0.2, CH * 0.11, 0, 7); c.fill();
      for (let row = 0; row < 7; row++) {
        const y = CH * (0.42 + row * 0.095), amp = 26 + row * 7, length = 150 + row * 22, shift = random() * length;
        c.fillStyle = ['#2f5f8f', '#24507f', '#3a74a8', '#1f456f'][row % 4];
        c.beginPath(); c.moveTo(0, CH);
        for (let x = -length; x <= CW + length; x += 6) c.lineTo(x, y - Math.abs(Math.sin((x + shift) / length * Math.PI)) ** 0.6 * amp);
        c.lineTo(CW, CH); c.fill();
        c.strokeStyle = '#f2f4f0'; c.lineWidth = 4;
        for (let x = -shift + length / 2; x < CW + length; x += length) {
          c.beginPath(); c.arc(x - 12, y - amp + 12, 16, Math.PI * 0.9, Math.PI * 2.2); c.stroke();
          c.fillStyle = '#f2f4f0'; for (let d = 0; d < 4; d++) { c.beginPath(); c.arc(x + 4 + d * 9, y - amp + 2 + d * 5, 5 - d, 0, 7); c.fill(); }
          c.fillStyle = ['#2f5f8f', '#24507f', '#3a74a8', '#1f456f'][row % 4];
        }
      }
    } else if (a.subject === 'mountains') {
      for (let layer = 0; layer < 5; layer++) {
        const base = CH * (0.3 + layer * 0.14), tone = 185 - layer * 34;
        c.fillStyle = a.ground === 'indigo' ? `rgb(${100 + layer * 30},${110 + layer * 30},${150 + layer * 22})` : `rgb(${tone},${tone + 2},${tone})`;
        c.beginPath(); c.moveTo(0, CH);
        let y = base;
        const seedA = random() * 9, seedB = random() * 9;
        for (let x = 0; x <= CW; x += 8) { y = base - (Math.abs(Math.sin(x / (170 - layer * 16) + seedA)) * 90 + Math.sin(x / 37 + seedB) * 12) * (1 - layer * 0.12); c.lineTo(x, y); }
        c.lineTo(CW, CH); c.fill();
        const mist = c.createLinearGradient(0, base - 10, 0, base + CH * 0.15);
        mist.addColorStop(0, 'rgba(0,0,0,0)'); mist.addColorStop(1, groundColour);
        c.fillStyle = mist; c.fillRect(0, base - 10, CW, CH * 0.16);
      }
      const px = CW * mix(0.55, 0.8, random()), py = CH * 0.6;
      c.fillStyle = '#8a2a1c'; c.fillRect(px - 9, py, 18, 20);
      c.fillStyle = '#22201c'; c.beginPath(); c.moveTo(px - 22, py); c.lineTo(px, py - 14); c.lineTo(px + 22, py); c.fill();
    } else if (a.subject === 'plum') {
      const mx = CW * mix(0.55, 0.75, random());
      c.fillStyle = a.ground === 'paper' ? '#f6f1dc' : 'rgba(250,246,226,0.85)'; c.beginPath(); c.arc(mx, CH * 0.32, CH * 0.24, 0, 7); c.fill();
      c.strokeStyle = '#2a1c18'; c.lineCap = 'round';
      const buds: [number, number][] = [];
      const branch = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
        const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
        c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
        buds.push([x1, y1], [(x + x1) / 2, (y + y1) / 2]);
        if (depth > 0) { branch(x1, y1, ang + (random() - 0.5) * 1.3, len * 0.72, w * 0.62, depth - 1); if (random() < 0.8) branch(x1, y1, ang - 0.8 - random() * 0.5, len * 0.5, w * 0.45, depth - 1); }
      };
      branch(0, CH * 0.92, -0.5, CW * 0.2, 26, 5);
      for (const [x, y] of buds) {
        if (random() < 0.3) continue;
        c.fillStyle = random() < 0.25 ? '#f6f0ea' : '#e88aa0';
        for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * 6, y + Math.sin(p * 1.257) * 6, 5.5, 0, 7); c.fill(); }
        c.fillStyle = '#e6c25a'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill();
      }
    } else if (a.subject === 'grasses') {
      c.fillStyle = a.ground === 'silver' ? '#e9ebe6' : '#c9ccc6'; c.beginPath(); c.arc(CW * mix(0.4, 0.7, random()), CH * 0.82, CH * 0.34, 0, 7); c.fill();
      for (let k = 0; k < 70 * count; k++) {
        const x = random() * CW, tall = CH * mix(0.25, 0.7, random()), lean = (random() - 0.3) * 160;
        c.strokeStyle = ['#4a6a3a', '#7a7a3a', '#35502c', '#8a6a3a'][k % 4]; c.lineWidth = 1.5 + random() * 2;
        c.beginPath(); c.moveTo(x, CH); c.quadraticCurveTo(x + lean * 0.2, CH - tall * 0.8, x + lean, CH - tall); c.stroke();
        if (k % 5 === 0) { c.fillStyle = ['#e8e2cf', '#c96f8c', '#7a5aa8', '#e6c25a'][k % 4]; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + lean + Math.cos(p * 1.257) * 6, CH - tall + Math.sin(p * 1.257) * 6, 4.5, 0, 7); c.fill(); } }
        else if (k % 5 === 1) { c.strokeStyle = '#d9cfa8'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + lean, CH - tall); c.quadraticCurveTo(x + lean + 20, CH - tall - 10, x + lean + 34, CH - tall + 24); c.stroke(); }
      }
    } else if (a.subject === 'bamboo') {
      for (let k = 0; k < 4 * count; k++) {
        const x = random() * CW, w = 10 + random() * 20, lean = (random() - 0.5) * 50;
        const shade = ['#3f7a3a', '#5a9548', '#2f5f2f'][k % 3];
        for (let y = CH; y > -40; y -= 86) { const t = (CH - y) / CH; c.fillStyle = shade; c.fillRect(x + lean * t, y - 82, w, 80); c.fillStyle = '#1f3f1f'; c.fillRect(x + lean * t - 1, y - 2, w + 2, 3); }
        for (let l = 0; l < 6; l++) { const y = random() * CH * 0.7, dir = random() < 0.5 ? -1 : 1; c.fillStyle = shade; c.beginPath(); c.ellipse(x + dir * 34, y, 34, 6, dir * (0.3 + random() * 0.5), 0, 7); c.fill(); }
      }
      for (let k = 0; k < count; k++) {
        const x = random() * CW, y = CH * mix(0.2, 0.6, random());
        c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(x, y, 16, 10, 0.2, 0, 7); c.fill(); c.beginPath(); c.arc(x + 14, y - 7, 7, 0, 7); c.fill();
        c.fillStyle = '#f0e6d0'; c.beginPath(); c.ellipse(x + 3, y + 4, 9, 5, 0.2, 0, 7); c.fill();
      }
    } else if (a.ground === 'paper') {
      c.strokeStyle = 'rgba(120,100,60,0.2)'; for (let x = 0; x < CW; x += 9) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 2, CH); c.stroke(); }
    }
    // A seal and a line of signature strokes in one corner.
    if (a.subject !== 'blank') {
      c.fillStyle = '#b0242c'; c.fillRect(CW - 70, CH - 110, 26, 26);
      c.strokeStyle = ink; c.lineWidth = 3;
      for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(CW - 66 + random() * 6, CH - 220 + k * 20); c.lineTo(CW - 48 + random() * 6, CH - 212 + k * 20); c.stroke(); }
    }
    // Age: a brown veil, foxing, lost leaf and water stains.
    if (wear > 0.08) {
      c.fillStyle = `rgba(150,128,96,${wear * 0.38})`; c.fillRect(0, 0, CW, CH);
      for (let k = 0; k < wear * 26 * count; k++) {
        const x = random() * CW, y = random() * CH, r = 3 + random() * 13 * wear;
        c.fillStyle = random() < 0.5 ? `rgba(90,60,30,${0.12 + random() * 0.2})` : `rgba(226,214,186,${0.2 + random() * 0.25})`;
        c.beginPath(); c.ellipse(x, y, r, r * (0.5 + random()), random() * 3, 0, 7); c.fill();
      }
      if (wear > 0.6) for (let k = 0; k < count; k++) {
        const x = random() * CW, y = CH * mix(0.3, 0.9, random());
        c.fillStyle = '#3a3026'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14 + random() * 20, y + 30 + random() * 60); c.lineTo(x - 10, y + 50 + random() * 40); c.fill();
      }
    }
    // Brocade border round every panel.
    const brocade = { black: '#1a1714', red: '#a8322a', green: '#4a6a42', purple: '#6a5078' }[a.border];
    for (let k = 0; k < count; k++) {
      const x0 = k * 256, bw = a.border === 'black' ? 7 : 18;
      c.fillStyle = brocade;
      c.fillRect(x0, 0, bw, CH); c.fillRect(x0 + 256 - bw, 0, bw, CH); c.fillRect(x0, 0, 256, bw * 1.4); c.fillRect(x0, CH - bw * 1.4, 256, bw * 1.4);
      if (a.border !== 'black') {
        c.fillStyle = 'rgba(230,194,90,0.75)';
        for (let y = 10; y < CH; y += 22) { for (const x of [x0 + bw / 2, x0 + 256 - bw / 2]) { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 4, y); c.lineTo(x, y + 5); c.lineTo(x - 4, y); c.fill(); } }
      }
    }
    const fade = new THREE.Color('#ffffff').lerp(new THREE.Color('#c9c2b2'), wear * 0.4);
    const lacquer = s.material('#16130f', { roughness: 0.3 });
    const backing = s.material({ black: '#3a4a3a', red: '#2a3a5a', green: '#5a3a2a', purple: '#3a3a44' }[a.border], { roughness: 0.9 });
    const leafGlow = a.ground === 'gold' ? mix(0.05, 0.28, mood.warmth) : 0;

    // --- Panels in a zigzag ---------------------------------------------------------------------
    const bend = mix(0.14, 0.92, a.fold) + (random() - 0.5) * 0.08;
    const hinges: [number, number][] = [[0, 0]];
    const turns: number[] = [];
    for (let k = 0; k < count; k++) {
      const angle = (k % 2 === 0 ? 1 : -1) * bend * (0.9 + random() * 0.2);
      turns.push(angle);
      const [x, z] = hinges[k];
      hinges.push([x + Math.cos(angle) * panelW, z + Math.sin(angle) * panelW]);
    }
    const lift = 0.012;
    for (let k = 0; k < count; k++) {
      const [x0, z0] = hinges[k], [x1, z1] = hinges[k + 1];
      const group = new THREE.Group();
      group.position.set((x0 + x1) / 2, lift + H / 2, (z0 + z1) / 2);
      group.rotation.y = -turns[k];
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(1 / count, 1); texture.offset.set(k / count, 0);
      const face = new THREE.MeshStandardMaterial({ map: texture, color: fade, roughness: a.ground === 'gold' || a.ground === 'silver' ? 0.5 : 0.9, metalness: a.ground === 'gold' || a.ground === 'silver' ? 0.25 : 0, emissive: '#b8842a', emissiveIntensity: leafGlow, emissiveMap: leafGlow ? texture : null });
      const front = new THREE.Mesh(new THREE.PlaneGeometry(panelW - 0.016, H - 0.016), face);
      front.position.z = 0.0105;
      const core = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.004, H, 0.02), backing);
      const parts: THREE.Mesh[] = [front, core];
      for (const side of [-1, 1]) {
        const stile = new THREE.Mesh(new THREE.BoxGeometry(0.01, H + 0.012, 0.026), lacquer); stile.position.x = side * (panelW / 2 - 0.006); parts.push(stile);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.004, 0.012, 0.026), lacquer); rail.position.y = side * H / 2; parts.push(rail);
      }
      // Brass corner fittings.
      const brass = s.material('#b8963a', { metalness: 0.8, roughness: 0.35 });
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const fit = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.03), brass); fit.position.set(sx * (panelW / 2 - 0.016), sy * (H / 2 - 0.012), 0); parts.push(fit); }
      for (const part of parts) { part.castShadow = part.receiveShadow = true; group.add(part); }
      s.root.add(group);
    }

    // --- Something left on it -------------------------------------------------------------------
    if (a.draped !== 'nothing') {
      const k = Math.min(count - 1, Math.floor(random() * count));
      const [x0, z0] = hinges[k], [x1, z1] = hinges[k + 1];
      const group = new THREE.Group();
      group.position.set((x0 + x1) / 2, lift + H, (z0 + z1) / 2);
      group.rotation.y = -turns[k];
      const clothColour = a.draped === 'kimono' ? ['#a8242c', '#2f4a7a', '#5a3a7a', '#1f6a5a'][Math.floor(random() * 4)] : a.draped === 'sash' ? '#c79a2c' : '#f3f1ea';
      const pattern = document.createElement('canvas'); pattern.width = pattern.height = 128;
      const pc = pattern.getContext('2d')!;
      pc.fillStyle = clothColour; pc.fillRect(0, 0, 128, 128);
      if (a.draped === 'kimono') for (let d = 0; d < 14; d++) { pc.fillStyle = ['#f6ece2', '#e6c25a', '#f2a9b4'][d % 3]; const x = random() * 128, y = random() * 128; for (let p = 0; p < 5; p++) { pc.beginPath(); pc.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 7, 5, 0, 7); pc.fill(); } }
      else if (a.draped === 'sash') { pc.fillStyle = '#7a2a1c'; for (let d = 0; d < 8; d++) pc.fillRect(0, d * 16, 128, 5); }
      else { pc.fillStyle = '#3f6a9a'; pc.fillRect(0, 10, 128, 6); pc.fillRect(0, 112, 128, 6); }
      const clothMap = new THREE.CanvasTexture(pattern); clothMap.colorSpace = THREE.SRGBColorSpace;
      const cloth = new THREE.MeshStandardMaterial({ map: clothMap, roughness: 0.9, side: THREE.DoubleSide });
      const width = a.draped === 'kimono' ? panelW * 0.9 : a.draped === 'sash' ? 0.16 : 0.3;
      const frontDrop = a.draped === 'kimono' ? Math.min(H * 0.62, 0.95) : a.draped === 'sash' ? H : Math.min(H * 0.4, 0.4);
      const backDrop = a.draped === 'kimono' ? Math.min(H * 0.5, 0.7) : 0.3;
      const offset = (random() - 0.5) * (panelW - width) * 0.8;
      // A strip of cloth bent over the top edge, hanging with a few soft folds.
      const strip = new THREE.PlaneGeometry(width, frontDrop + backDrop + 0.05, 10, 26);
      const p = strip.attributes.position;
      const total = frontDrop + backDrop + 0.05;
      for (let v = 0; v < p.count; v++) {
        const along = p.getY(v) + total / 2; // 0 at the front hem, total at the back hem
        const x = p.getX(v);
        const fold = Math.sin(x / width * 9 + k) * 0.012;
        let y: number, z: number;
        if (along < frontDrop) { y = -(frontDrop - along); z = 0.022 + fold * (1 + (frontDrop - along) * 2) + (frontDrop - along) * 0.03; }
        else if (along < frontDrop + 0.05) { const t = (along - frontDrop) / 0.05; y = 0.012 * Math.sin(t * Math.PI) + 0.008; z = 0.022 - t * 0.044; }
        else { y = -(along - frontDrop - 0.05); z = -0.022 - fold - (along - frontDrop - 0.05) * 0.03; }
        p.setXYZ(v, x + offset, y, z);
      }
      strip.computeVertexNormals();
      const drape = new THREE.Mesh(strip, cloth);
      drape.castShadow = drape.receiveShadow = true;
      group.add(drape);
      if (a.draped === 'sash') {
        const pool = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.34), cloth);
        pool.position.set(offset, -H + 0.004, 0.2); pool.rotation.y = 0.3; pool.castShadow = true; group.add(pool);
      }
      s.root.add(group);
    }
    return s.finish();
  },
});
