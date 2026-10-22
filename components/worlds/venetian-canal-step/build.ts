import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

const PALETTES = {
  'ochre-red': 'Yellow ochre beside deep Venetian red, the classic pairing.',
  'rose-cream': 'Faded rose and cream, soft and bridal.',
  'grey-damp': 'Grey plaster gone green and black with damp, a forgotten corner.',
  'terracotta-sage': 'Terracotta and a mouldy sage green.',
  'blue-salmon': 'Washed-out blue-grey against salmon pink.',
} as const;
const STUCCO: Record<keyof typeof PALETTES, [string, string, string]> = {
  'ochre-red': ['#d8a650', '#b5553c', '#cf8f6a'],
  'rose-cream': ['#dba39a', '#e3d3b0', '#c97a6a'],
  'grey-damp': ['#b9b3a4', '#9c9a8a', '#c4bdaa'],
  'terracotta-sage': ['#c46a4a', '#8fa08a', '#d9b98a'],
  'blue-salmon': ['#9fb0b8', '#d99a80', '#cbbf9f'],
};

interface Opening { x: number; y: number; w: number; h: number; row: number }
interface FacadeOptions { colour: string; wear: number; cols: number; door: 'door' | 'gate-grille' | 'gate-open' | 'gate-bricked' | 'none'; shuttered: number; below: number }

/** Paint a palazzo front: stucco peeling to brick, ogee windows, damp rising from the foot. */
function facade(width: number, height: number, r: () => number, o: FacadeOptions) {
  const ppm = 1024 / width;
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = Math.round(height * ppm);
  const g = canvas.getContext('2d')!;
  const X = (m: number) => m * ppm, Y = (m: number) => canvas.height - (m + o.below) * ppm;
  g.fillStyle = '#a8563c'; g.fillRect(0, 0, 1024, canvas.height);
  g.strokeStyle = '#d2c3a8'; g.lineWidth = 1.5;
  const bh = 0.09 * ppm, bw = 0.3 * ppm;
  for (let y = 0, row = 0; y < canvas.height; y += bh, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); for (let x = row % 2 ? 0 : bw / 2; x < 1024; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); } }
  g.fillStyle = o.colour; g.beginPath(); g.rect(0, 0, 1024, canvas.height);
  for (let i = 0; i < 4 + o.wear * 16; i++) {
    const cx = r() * 1024, cy = canvas.height - r() ** 1.8 * canvas.height, rad = 16 + r() * (24 + o.wear * 60);
    g.moveTo(cx + rad, cy);
    for (let k = 13; k >= 0; k--) { const t = (k / 14) * Math.PI * 2, rr = rad * (0.55 + r() * 0.7); g.lineTo(cx + Math.cos(t) * rr * 1.3, cy + Math.sin(t) * rr); }
    g.closePath();
  }
  g.fill();
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,250,235' : '70,50,40'},${0.03 + r() * 0.06})`; g.fillRect(r() * 1024, r() * canvas.height, 8 + r() * 60, 4 + r() * 40); }
  for (let i = 0; i < 14 + o.wear * 20; i++) { const x = r() * 1024, top = r() * canvas.height * 0.6, len = 60 + r() * 200, grad = g.createLinearGradient(0, top, 0, top + len); grad.addColorStop(0, 'rgba(50,48,40,0.32)'); grad.addColorStop(1, 'rgba(50,48,40,0)'); g.fillStyle = grad; g.fillRect(x, top, 5 + r() * 14, len); }
  // String courses.
  g.fillStyle = 'rgba(236,230,214,0.85)';
  for (const level of [2.45, 4.75]) g.fillRect(0, Y(level), 1024, 0.1 * ppm);
  const openings: Opening[] = [];
  const stone = '#e9e3d2', dark = '#1c2226', green = ['#2f5a41', '#3d6a52', '#4a5a3a', '#5a4a36'];
  const ogee = (cx: number, y0: number, w: number, h: number, inset: number) => {
    const l = X(cx - w / 2) + inset, rr = X(cx + w / 2) - inset, b = Y(y0) - inset, sh = Y(y0 + h * 0.68), t = Y(y0 + h) + inset;
    g.beginPath(); g.moveTo(l, b); g.lineTo(l, sh); g.bezierCurveTo(l, sh - (sh - t) * 0.7, X(cx) - (rr - l) * 0.12, t + (sh - t) * 0.35, X(cx), t);
    g.bezierCurveTo(X(cx) + (rr - l) * 0.12, t + (sh - t) * 0.35, rr, sh - (sh - t) * 0.7, rr, sh); g.lineTo(rr, b); g.closePath();
  };
  const window = (cx: number, y0: number, w: number, h: number, row: number, arched: boolean) => {
    g.fillStyle = stone;
    if (arched) { ogee(cx, y0 - 0.06, w + 0.3, h + 0.28, 0); g.fill(); } else g.fillRect(X(cx - w / 2 - 0.1), Y(y0 + h + 0.1), X(w + 0.2), (h + 0.2) * ppm);
    const fate = r();
    g.fillStyle = fate < o.wear * 0.22 ? '#9a5a44' : dark;
    if (arched) { ogee(cx, y0, w, h, 0); g.fill(); } else g.fillRect(X(cx - w / 2), Y(y0 + h), X(w), h * ppm);
    if (fate >= o.wear * 0.22 && r() < o.shuttered) {
      g.fillStyle = green[Math.floor(r() * green.length)];
      const top = arched ? y0 + h * 0.68 : y0 + h;
      for (const side of [-1, 1]) { g.fillRect(X(cx + (side < 0 ? -w / 2 : 0.02)), Y(top), X(w / 2 - 0.02), (top - y0) * ppm); }
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5;
      for (let y = y0 + 0.08; y < top; y += 0.1) { g.beginPath(); g.moveTo(X(cx - w / 2), Y(y)); g.lineTo(X(cx + w / 2), Y(y)); g.stroke(); }
    } else if (fate >= o.wear * 0.22) openings.push({ x: cx, y: y0, w, h: arched ? h * 0.68 : h, row });
    g.fillStyle = stone; g.fillRect(X(cx - w / 2 - 0.2), Y(y0) - 2, X(w + 0.4), 0.09 * ppm);
  };
  const pitch = width / o.cols;
  for (let c = 0; c < o.cols; c++) {
    const cx = (c + 0.5) * pitch + (r() - 0.5) * 0.15;
    const isDoor = c === Math.floor(o.cols / 2);
    window(cx, 3.05, 0.95, 1.55, 1, true);
    if (5.25 + 0.75 < height - o.below - 0.25) window(cx, 5.25, 0.7, 0.75, 2, false);
    if (isDoor && o.door !== 'none') {
      const gate = o.door !== 'door', w = gate ? 2.1 : 1.25, h = gate ? 2.3 : 2.25, y0 = gate ? -0.75 : 0;
      g.fillStyle = stone; g.beginPath(); g.moveTo(X(cx - w / 2 - 0.22), Y(y0)); g.lineTo(X(cx - w / 2 - 0.22), Y(y0 + h - w / 2)); g.arc(X(cx), Y(y0 + h - w / 2), X(w / 2 + 0.22), Math.PI, 0); g.lineTo(X(cx + w / 2 + 0.22), Y(y0)); g.fill();
      g.fillStyle = o.door === 'gate-bricked' ? '#96503c' : o.door === 'door' ? '#3d2f24' : '#12171a';
      g.beginPath(); g.moveTo(X(cx - w / 2), Y(y0)); g.lineTo(X(cx - w / 2), Y(y0 + h - w / 2)); g.arc(X(cx), Y(y0 + h - w / 2), X(w / 2), Math.PI, 0); g.lineTo(X(cx + w / 2), Y(y0)); g.fill();
      if (o.door === 'gate-grille') { g.strokeStyle = '#4a4e50'; g.lineWidth = 3; for (let x = -w / 2 + 0.15; x < w / 2; x += 0.18) { g.beginPath(); g.moveTo(X(cx + x), Y(y0)); g.lineTo(X(cx + x), Y(y0 + h)); g.stroke(); } for (const y of [0.3, 1.1]) { g.beginPath(); g.moveTo(X(cx - w / 2), Y(y0 + y)); g.lineTo(X(cx + w / 2), Y(y0 + y)); g.stroke(); } }
      else if (o.door === 'gate-open') { g.fillStyle = '#4a3324'; g.fillRect(X(cx - w / 2), Y(y0 + h - w / 2), X(0.42), (h - w / 2) * ppm); const glow = g.createRadialGradient(X(cx + 0.3), Y(y0 + 0.9), 4, X(cx + 0.3), Y(y0 + 0.9), X(1)); glow.addColorStop(0, 'rgba(255,190,90,0.55)'); glow.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = glow; g.fillRect(X(cx - w / 2 + 0.42), Y(y0 + h), X(w - 0.42), h * ppm); }
      else if (o.door === 'gate-bricked') { g.strokeStyle = '#c9b89a'; g.lineWidth = 1; for (let y = y0; y < y0 + h; y += 0.1) { g.beginPath(); g.moveTo(X(cx - w / 2), Y(y)); g.lineTo(X(cx + w / 2), Y(y)); g.stroke(); } }
      else { g.strokeStyle = '#231a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(cx), Y(0)); g.lineTo(X(cx), Y(h)); g.stroke(); g.fillStyle = '#c9a44a'; g.beginPath(); g.arc(X(cx + 0.12), Y(1.05), 3, 0, 7); g.fill(); g.fillStyle = stone; g.fillRect(X(cx - w / 2 - 0.3), Y(0.12), X(w + 0.6), 0.12 * ppm); }
    } else {
      window(cx, 1.0, 0.6, 0.85, 0, false);
      g.strokeStyle = '#3a3d3f'; g.lineWidth = 2;
      for (let x = -0.2; x <= 0.21; x += 0.133) { g.beginPath(); g.moveTo(X(cx + x), Y(1.0)); g.lineTo(X(cx + x), Y(1.85)); g.stroke(); }
    }
  }
  // Rising damp and, on walls that stand in the canal, the weed line.
  const dampTop = Y(1.5 + o.wear), foot = Y(0);
  const damp = g.createLinearGradient(0, foot, 0, dampTop);
  damp.addColorStop(0, 'rgba(54,66,48,0.8)'); damp.addColorStop(0.45, 'rgba(84,84,68,0.35)'); damp.addColorStop(1, 'rgba(84,84,68,0)');
  g.fillStyle = damp; g.fillRect(0, dampTop, 1024, foot - dampTop);
  if (o.below > 0) { g.fillStyle = '#2c4030'; g.fillRect(0, Y(-0.25), 1024, canvas.height); g.fillStyle = '#5c7a3c'; g.fillRect(0, Y(-0.2), 1024, 0.09 * ppm); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, openings };
}

function painted(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    walls: choice('What colours are the palazzo walls?', PALETTES),
    tide: score('Where is the tide?', ['Low: slimy green steps and a tall weed line exposed', 'Mid tide', 'High: water over the landing and lapping at the quay']),
    mist: score('How heavy is the morning mist?', ['A clear cold dawn', 'Thin haze over the water', 'Fog swallowing the bridge and the upper windows']),
    bridge: choice('What kind of bridge crosses behind?', {
      stone: 'A brick humpback with a white stone arch ring and low solid parapets.',
      bare: 'An old-style humpback with no parapets at all, just steps over the water.',
      iron: 'A brick humpback with a thin wrought-iron railing.',
      timber: 'A shallow wooden footbridge on posts, weathered grey.',
    }),
    windows: choice('What do the windows say?', {
      shuttered: 'Every shutter closed: the city is still asleep, or empty.',
      'one-lit': 'One window lit amber high up: somebody is awake.',
      waking: 'Several shutters open and a few lamps on, the day starting.',
      blind: 'Dark empty openings with no shutters at all, a house nobody lives in.',
    }),
    gate: choice('What is the water door of the palazzo across the canal like?', {
      grille: 'Shut behind an iron grille, black inside.',
      open: 'One leaf open on a glow of lamplight, expecting a boat.',
      bricked: 'Bricked up long ago.',
    }),
    trace: choice('What trace of someone is here?', {
      nothing: 'None: only water and stone.',
      suitcase: 'A suitcase standing alone on the water steps.',
      footprints: 'Wet footprints coming up the steps and across the quay.',
      petals: 'Flowers thrown on the water, drifting apart.',
      sandolo: 'A small rowing boat tied at the landing, oars shipped.',
      lantern: 'A lantern left burning at the foot of the steps.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const QX = 0.6, BASE = -1.6, LAND = -0.8;
    const waterY = mix(-1.3, -0.62, a.tide);
    const background = new THREE.Color('#dce3de').lerp(new THREE.Color('#eef0ea'), a.mist).lerp(new THREE.Color('#f0e6d6'), mood.warmth * 0.25).getStyle();
    const { art: s, world } = diorama(context, {
      background, floor: null, width: 16, depth: 12, maxHeight: 3.4, radius: 1.6, pitch: 31, yaw: 31,
      slots: [[-1.9, 1.0], [QX + 1.45, 2.75, LAND, 0.72], [-5.4, -2.9], [-5.3, 3.5, 0, 0.9], [-2.2, -3.7, 0, 0.75], [-2.3, 4.6, 0, 0.7]],
    });
    if (world.keyLight) world.keyLight.intensity = mix(2.7, 1.7, a.mist);
    const [stuccoA, stuccoB, stuccoC] = STUCCO[a.walls];
    const istrian = s.material('#e6e0cf');
    const brick = s.material('#a5543c', { roughness: 1 });
    const algae = new THREE.Color('#3f5a36'), slime = new THREE.Color('#6f8a3c');
    const iron = s.material('#2b2b2e');
    const plain = (colour: string) => s.material(new THREE.Color(colour).multiplyScalar(0.8));

    // Fondamenta: paved top, brick face with the weed line, a white kerb.
    const paving = painted(512, 512, (g, w, h) => {
      g.fillStyle = '#8f8d86'; g.fillRect(0, 0, w, h);
      for (let y = 0, row = 0; y < h; y += 64, row++) for (let x = row % 2 ? -48 : 0; x < w; x += 96) {
        const tone = 132 + Math.floor(random() * 30);
        g.fillStyle = `rgb(${tone},${tone - 2},${tone - 8})`; g.fillRect(x + 2, y + 2, 92, 60);
        if (random() < 0.12 + mood.wear * 0.3) { g.fillStyle = 'rgba(70,84,60,0.45)'; g.fillRect(x + 2, y + 2, 92, 60); }
      }
    });
    paving.wrapS = paving.wrapT = THREE.RepeatWrapping; paving.repeat.set(2.9, 4);
    const quayFace = painted(1024, 128, (g, w, h) => {
      g.fillStyle = '#9a5440'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9b89a'; g.lineWidth = 1;
      for (let y = 0, row = 0; y < h; y += 7, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = row % 2 ? 0 : 13; x < w; x += 26) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 7); g.stroke(); } }
      const line = h * (1 - (waterY + 0.55 + mood.wear * 0.25 - BASE) / -BASE);
      const grad = g.createLinearGradient(0, line - 22, 0, line + 6);
      grad.addColorStop(0, 'rgba(60,84,48,0)'); grad.addColorStop(1, 'rgba(44,64,40,1)');
      g.fillStyle = grad; g.fillRect(0, line - 22, w, 30); g.fillStyle = '#2c4028'; g.fillRect(0, line + 6, w, h);
      g.fillStyle = '#7a9a40'; for (let x = 0; x < w; x += 5) g.fillRect(x, line - 2 + random() * 8, 5, 3 + random() * 4);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(30,40,28,0.35)'; g.fillRect(random() * w, 8 + random() * 30, 3 + random() * 6, 20 + random() * 60); }
    });
    const quay = new THREE.Mesh(new THREE.BoxGeometry(QX + 8, -BASE, 12), [
      new THREE.MeshStandardMaterial({ map: quayFace, roughness: 0.95 }), plain('#8a7a6a'),
      new THREE.MeshStandardMaterial({ map: paving, roughness: 0.92 }), plain('#8a7a6a'), plain('#9a8a78'), plain('#8a7a6a'),
    ]);
    quay.position.set((QX - 8) / 2, BASE / 2, 0);
    quay.receiveShadow = true;
    s.root.add(quay);
    world.ground = quay;
    s.box([0.34, 0.14, 12.02], [QX - 0.15, 0.0, 0], istrian);

    // The canal.
    const waterColour = new THREE.Color('#5e9079').lerp(new THREE.Color('#70805a'), mood.wear * 0.55).lerp(new THREE.Color('#9ab0a4'), a.mist * 0.3);
    const water = s.box([8 - QX + 0.3, waterY - BASE, 12], [(8 + QX - 0.3) / 2, (waterY + BASE) / 2, 0], new THREE.MeshStandardMaterial({ color: waterColour, roughness: 0.16, metalness: 0.15 }));
    water.castShadow = false;

    // Water steps along the quay down to a landing, and two more steps going under.
    const stepStone = (depth: number) => s.material(new THREE.Color('#ded8c6').lerp(algae, THREE.MathUtils.clamp(0.15 + (waterY + 0.75 - depth) * 1.3 + mood.wear * 0.25, 0, 0.92)), { roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const top = -0.16 * (i + 1), z0 = -1.8 + i * 0.52;
      s.box([1.4, top - BASE, 0.52], [QX + 0.7, (top + BASE) / 2, z0 + 0.26], stepStone(top));
      s.box([1.42, 0.03, 0.06], [QX + 0.7, top + 0.001, z0 + 0.5], s.material(slime.clone().lerp(new THREE.Color('#e6e0cf'), THREE.MathUtils.clamp(1.2 - i * 0.3 + waterY, 0, 1))));
    }
    s.box([1.4, -BASE, 1.4], [QX + 0.7, BASE / 2, -2.5], stepStone(0));
    s.box([2.9, LAND - BASE, 3.8], [QX + 1.45, (LAND + BASE) / 2, 2.7], stepStone(LAND));
    s.box([2.96, 0.05, 0.14], [QX + 1.45, LAND - 0.02, 4.55], stepStone(LAND - 0.3));
    for (let i = 1; i <= 2; i++) {
      s.box([0.4, LAND - 0.17 * i - BASE, 3.8], [QX + 2.9 + 0.4 * i - 0.2, (LAND - 0.17 * i + BASE) / 2, 2.7], stepStone(LAND - 0.17 * i - 0.2));
      s.box([2.9 + 0.4 * i, LAND - 0.17 * i - BASE, 0.4], [QX + (2.9 + 0.4 * i) / 2, (LAND - 0.17 * i + BASE) / 2, 4.6 + 0.4 * i - 0.2], stepStone(LAND - 0.17 * i - 0.2));
    }
    for (const z of [-0.6, 3.6]) { s.ring(0.12, 0.022, [QX + 0.03, -0.42, z + (z < 0 ? 6 : 1.9)], iron).rotation.y = Math.PI / 2; }
    for (const [x, z] of [[QX + 3.85, 0.55], [QX + 4.0, 5.15]]) {
      const post = s.cylinder(0.11, 0.14, 3.0, [x, BASE + 1.5, z], s.material('#6b5a48'), 12);
      post.rotation.set((random() - 0.5) * 0.14, 0, (random() - 0.5) * 0.14);
      s.cylinder(0.15, 0.16, 0.7, [x, waterY + 0.2, z], s.material(algae), 12).rotation.copy(post.rotation);
    }

    // Palazzo walls: the back one on the quay, one rising from the canal, and the side street wall.
    const shut = { shuttered: 1, 'one-lit': 0.9, waking: 0.45, blind: 0 }[a.windows];
    const lamps: THREE.Mesh[] = [];
    const amber = () => new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb04a', emissiveIntensity: mix(1.8, 0.9, Math.sin(mood.daylight * Math.PI)) });
    const lightUp = (list: { at: [number, number, number]; w: number; h: number; ry: number; row: number }[]) => {
      const candidates = list.filter((o) => o.row > 0);
      const count = a.windows === 'one-lit' ? 1 : a.windows === 'waking' ? Math.ceil(candidates.length * 0.5) : 0;
      for (let i = 0; i < count && candidates.length; i++) {
        const [o] = candidates.splice(Math.floor(random() * candidates.length), 1);
        const pane = s.mesh(new THREE.PlaneGeometry(o.w * 0.9, o.h * 0.92), amber(), o.at);
        pane.rotation.y = o.ry; pane.castShadow = false;
        lamps.push(pane);
      }
    };
    const lit: Parameters<typeof lightUp>[0] = [];
    const wallBox = (size: [number, number, number], at: [number, number, number], map: THREE.Texture, face: number, tint: string) => {
      const sides = Array.from({ length: 6 }, (_n, i) => (i === face ? new THREE.MeshStandardMaterial({ map, roughness: 0.95 }) : plain(tint)));
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), sides);
      mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const HA = 6.7 + random() * 0.5, HB = 5.9 + random() * 0.5, HC = 6.3 + random() * 0.4, splitX = QX - 0.8;
    const wA = splitX + 8, fa = facade(wA, HA, random, { colour: stuccoA, wear: mood.wear, cols: 4, door: 'door', shuttered: shut, below: 0 });
    wallBox([wA, HA, 0.5], [(splitX - 8) / 2, HA / 2, -6.2], fa.texture, 4, stuccoA);
    for (const o of fa.openings) lit.push({ at: [-8 + o.x, o.y + o.h / 2, -5.94], w: o.w, h: o.h, ry: 0, row: o.row });
    const wB = 8 - splitX, fb = facade(wB, HB - BASE, random, { colour: stuccoB, wear: Math.min(1, mood.wear + 0.15), cols: 3, door: `gate-${a.gate}` as FacadeOptions['door'], shuttered: shut, below: -BASE });
    wallBox([wB, HB - BASE, 0.5], [(splitX + 8) / 2, (HB + BASE) / 2, -6.2], fb.texture, 4, stuccoB);
    for (const o of fb.openings) lit.push({ at: [splitX + o.x, o.y + o.h / 2, -5.94], w: o.w, h: o.h, ry: 0, row: o.row });
    const fc = facade(12, HC, random, { colour: stuccoC, wear: mood.wear, cols: 5, door: 'door', shuttered: shut, below: 0 });
    wallBox([0.5, HC, 12.4], [-8.2, HC / 2, -0.2], fc.texture, 0, stuccoC);
    for (const o of fc.openings) lit.push({ at: [-7.94, o.y + o.h / 2, 6 - o.x], w: o.w, h: o.h, ry: Math.PI / 2, row: o.row });
    lightUp(lit);
    // Cornices, roof edges and the flared Venetian chimneys.
    const tile = s.material('#b0644a', { roughness: 0.9 });
    for (const [w, x, h] of [[wA, (splitX - 8) / 2, HA], [wB, (splitX + 8) / 2, HB]] as const) { s.box([w + 0.1, 0.16, 0.8], [x, h + 0.02, -6.1], istrian); s.box([w + 0.2, 0.12, 0.95], [x, h + 0.16, -6.1], tile); }
    s.box([0.8, 0.16, 12.5], [-8.1, HC + 0.02, -0.2], istrian); s.box([0.95, 0.12, 12.6], [-8.1, HC + 0.16, -0.2], tile);
    for (const [x, h] of [[-5.6 + random() * 2, HA], [3.2 + random() * 3, HB]]) {
      s.cylinder(0.2, 0.22, 1.1, [x, h + 0.7, -6.25], plain(stuccoA), 10);
      s.cylinder(0.52, 0.2, 0.6, [x, h + 1.5, -6.25], plain(stuccoA), 12);
      s.cylinder(0.56, 0.56, 0.08, [x, h + 1.84, -6.25], tile, 12);
    }
    // A balcony on the piano nobile and a wall lamp by the door.
    const nobile = fa.openings.find((o) => o.row === 1) ?? { x: wA / 2, y: 3.05, w: 0.95, h: 1.1, row: 1 };
    const bx = -8 + nobile.x;
    s.box([1.7, 0.1, 0.55], [bx, 2.98, -5.72], istrian);
    for (let i = 0; i <= 8; i++) s.cylinder(0.03, 0.04, 0.5, [bx - 0.78 + i * 0.195, 3.28, -5.5], istrian, 6);
    s.box([1.72, 0.07, 0.1], [bx, 3.56, -5.5], istrian);
    for (const side of [-1, 1]) s.box([0.1, 0.24, 0.5], [bx + side * 0.6, 2.84, -5.74], istrian);
    if (mood.cheer > 0.35) for (let i = 0; i < 10; i++) s.ball([0.1, 0.09, 0.1], [bx - 0.6 + random() * 1.2, 3.62 + random() * 0.14, -5.48], s.material(i % 3 ? '#d83a4a' : '#3f7a3c', { emissive: i % 3 ? '#8a1020' : '#000000', emissiveIntensity: 0.3 }), 6);
    const lampOn = a.mist > 0.45 || mood.daylight < 0.3 || mood.daylight > 0.8;
    s.tube([[-2.6, 3.5, -5.95], [-2.6, 3.75, -5.5], [-2.6, 3.55, -5.25]], 0.025, iron);
    const lamp = s.cylinder(0.17, 0.11, 0.34, [-2.6, 3.32, -5.25], s.material('#f0d6c0', lampOn ? { emissive: '#ffb878', emissiveIntensity: 1.6 } : {}), 6);
    s.cylinder(0.03, 0.2, 0.1, [-2.6, 3.54, -5.25], iron, 6);
    if (lampOn) lamps.push(lamp);
    if (mood.density > 0.3) for (const z of [0.4, -1.4]) {
      const mid = 6 - (Math.floor(5 / 2) + 0.5) * 2.4;
      s.cylinder(0.26, 0.19, 0.42, [-7.5, 0.21, mid + z * 1.1 + 0.5], s.material('#b5654a'), 12);
      s.ball([0.36, 0.42, 0.36], [-7.5, 0.72, mid + z * 1.1 + 0.5], s.material(mix(0, 1, mood.wear) > 0.75 ? '#7a7448' : '#3f6b3c', { roughness: 1 }), 10);
    }
    if (mood.density > 0.6) for (let i = 0; i < 4; i++) s.box([0.62, 0.36, 0.44], [-6.9 + (i % 2) * 0.66 + random() * 0.08, 0.18 + Math.floor(i / 2) * 0.37, -5.3], s.material(i % 2 ? '#b89a66' : '#a58656')).rotation.y = (random() - 0.5) * 0.2;

    // The bridge behind.
    const X0 = QX - 0.6, X1 = 8.3, Z0 = -5.0, Z1 = -3.35, MID = (Z0 + Z1) / 2, WIDTH = Z1 - Z0;
    const timber = a.bridge === 'timber';
    const C = timber ? 1.7 : 3.0;
    const topY = (x: number) => { const t = (x - X0) / (X1 - X0); return 2 * C * t * (1 - t); };
    const band = (low: (x: number) => number, high: (x: number) => number, from = X0, to = X1) => {
      const shape = new THREE.Shape();
      const xs = Array.from({ length: 25 }, (_n, i) => from + (i / 24) * (to - from));
      shape.moveTo(xs[0], low(xs[0]));
      for (const x of xs) shape.lineTo(x, high(x));
      for (const x of xs.reverse()) shape.lineTo(x, low(x));
      shape.closePath();
      return shape;
    };
    const AX0 = QX + 0.7, AX1 = 7.3, AC = 2.3;
    const archY = (x: number) => { const t = THREE.MathUtils.clamp((x - AX0) / (AX1 - AX0), 0, 1); return BASE + 2 * (AC - BASE) * t * (1 - t); };
    if (!timber) {
      s.mesh(new THREE.ExtrudeGeometry(band((x) => (x > AX0 && x < AX1 ? Math.min(archY(x), topY(x) - 0.3) : BASE), topY), { depth: WIDTH, bevelEnabled: false }), brick, [0, 0, Z0]);
      for (const z of [Z0 - 0.03, Z1 + 0.03]) s.tube(Array.from({ length: 13 }, (_n, i) => { const x = AX0 + (i / 12) * (AX1 - AX0); return [x, Math.min(archY(x), topY(x) - 0.3), z] as [number, number, number]; }), 0.1, istrian);
      for (let i = 1; i < 18; i++) {
        const x = X0 + (i / 18) * (X1 - X0), slope = Math.atan2(topY(x + 0.05) - topY(x - 0.05), 0.1);
        const nosing = s.box([0.1, 0.07, WIDTH + 0.04], [x, topY(x) + 0.03, MID], istrian); nosing.rotation.z = slope;
      }
    } else {
      const grey = s.material('#8f8676', { roughness: 1 }), greyDark = s.material('#6f6658', { roughness: 1 });
      s.mesh(new THREE.ExtrudeGeometry(band((x) => topY(x) - 0.14, topY), { depth: WIDTH, bevelEnabled: false }), grey, [0, 0, Z0]);
      for (let i = 1; i < 22; i++) { const x = X0 + (i / 22) * (X1 - X0); const gap = s.box([0.03, 0.02, WIDTH], [x, topY(x) + 0.005, MID], greyDark); gap.rotation.z = Math.atan2(topY(x + 0.05) - topY(x - 0.05), 0.1); }
      for (const x of [QX + 1.9, 6.3]) for (const z of [Z0 + 0.12, Z1 - 0.12]) { s.cylinder(0.09, 0.1, topY(x) - BASE, [x, (topY(x) + BASE) / 2 - 0.1, z], greyDark, 8); s.cylinder(0.12, 0.13, 0.5, [x, waterY + 0.15, z], s.material(algae), 8); }
      for (const x of [QX + 1.9, 6.3]) s.rod([x, topY(x) - 0.5, Z0 + 0.12], [x, waterY + 0.6, Z1 - 0.12], 0.04, greyDark);
    }
    const railTop = a.bridge === 'stone' ? 0.6 : 0.95;
    for (const z of [Z0 + 0.09, Z1 - 0.09]) {
      if (a.bridge === 'stone') {
        s.mesh(new THREE.ExtrudeGeometry(band(topY, (x) => topY(x) + railTop), { depth: 0.18, bevelEnabled: false }), brick, [0, 0, z - 0.09]);
        s.tube(Array.from({ length: 13 }, (_n, i) => { const x = X0 + (i / 12) * (X1 - X0); return [x, topY(x) + railTop + 0.03, z] as [number, number, number]; }), 0.11, istrian);
      } else if (a.bridge === 'iron' || timber) {
        const rail = timber ? s.material('#7f7666', { roughness: 1 }) : iron;
        for (const lift of [railTop, railTop * 0.5]) s.tube(Array.from({ length: 13 }, (_n, i) => { const x = X0 + (i / 12) * (X1 - X0); return [x, topY(x) + lift, z] as [number, number, number]; }), timber ? 0.045 : 0.025, rail);
        for (let i = 0; i <= 10; i++) { const x = X0 + (i / 10) * (X1 - X0); s.rod([x, topY(x), z], [x, topY(x) + railTop + (timber ? 0.05 : 0.1), z], timber ? 0.05 : 0.022, rail); }
      }
    }
    // The far bank the bridge lands on.
    s.box([1.0, -BASE, 3.2], [7.9, BASE / 2, -4.5], s.material('#9a5440'));
    s.box([1.04, 0.14, 3.24], [7.9, 0, -4.5], istrian);

    // Slow ripples, reflections under the walls, and the mist.
    const inWater = (x: number, z: number) => !(x < QX + 3.9 && z > -3.3 && z < 5.6) && !(z < -3.2);
    const rippleGeometry = new THREE.CircleGeometry(1, 14); rippleGeometry.rotateX(-Math.PI / 2);
    const ripples = new THREE.InstancedMesh(rippleGeometry, new THREE.MeshBasicMaterial({ color: '#d5e8dc', transparent: true, opacity: mix(0.5, 0.3, a.mist), depthWrite: false }), 46);
    const seeds = Array.from({ length: 46 }, () => {
      let x = 0, z = 0;
      for (let tries = 0; tries < 20; tries++) { x = QX + 0.4 + random() * (8 - QX - 0.6); z = -5.6 + random() * 11.4; if (inWater(x, z)) break; }
      return { x, z, len: 0.25 + random() * 0.7, phase: random() * 6.3, speed: 0.4 + random() * 0.6 };
    });
    s.root.add(ripples);
    const matrix = new THREE.Matrix4();
    const drift = mix(0.25, 1.4, mood.energy);
    const ripple = (time: number) => {
      seeds.forEach((seed, i) => {
        const swell = 0.6 + 0.4 * Math.sin(time * seed.speed * drift + seed.phase);
        matrix.makeScale(seed.len * swell, 1, 0.035 + 0.02 * swell).setPosition(seed.x + Math.sin(time * 0.3 * drift + seed.phase) * 0.25, waterY + 0.012, seed.z);
        ripples.setMatrixAt(i, matrix);
      });
      ripples.instanceMatrix.needsUpdate = true;
    };
    // Rings where the steps and posts meet the water.
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#e2f0e6', transparent: true, opacity: 0.55, depthWrite: false });
    for (const [x, z] of [[QX + 3.85, 0.55], [QX + 4.0, 5.15]]) { const ring = s.ring(0.34, 0.025, [x, waterY + 0.015, z], ringMaterial); ring.rotation.x = Math.PI / 2; ring.castShadow = false; }
    const reflect = (x: number, z: number, w: number, d: number, colour: string, opacity: number) => {
      const plane = s.mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false }), [x, waterY + 0.008, z]);
      plane.rotation.x = -Math.PI / 2; plane.castShadow = false;
    };
    reflect((splitX + 8) / 2 + 0.4, -5.45, wB - 0.9, 0.9, stuccoB, 0.4);
    reflect((AX0 + AX1) / 2, MID, AX1 - AX0 - 0.6, WIDTH + 0.5, '#2f4238', 0.38);
    if (a.gate === 'open') reflect(splitX + wB / 2 + 0.3, -5.2, 1.2, 1.4, '#ffc878', 0.5);
    const mistMap = painted(256, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 26; i++) { const x = random() * w, y = random() * h * 0.8, rad = 20 + random() * 50; const hole = g.createRadialGradient(x, y, 2, x, y, rad); hole.addColorStop(0, 'rgba(0,0,0,0.5)'); hole.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hole; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.fillRect(x - rad - w, y - rad, rad * 2, rad * 2); g.fillRect(x - rad + w, y - rad, rad * 2, rad * 2); }
    });
    mistMap.wrapS = THREE.RepeatWrapping;
    const mists: THREE.Texture[] = [];
    const veil = (w: number, h: number, at: [number, number, number], ry: number, opacity: number, flat = false) => {
      if (opacity < 0.04) return new THREE.Object3D();
      const map = mistMap.clone(); map.offset.x = random(); map.needsUpdate = true; mists.push(map);
      const plane = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color: '#f4f6f1', transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }), at);
      plane.rotation.y = ry; if (flat) plane.rotation.x = -Math.PI / 2;
      plane.castShadow = false; plane.renderOrder = 5;
      return plane as THREE.Object3D;
    };
    veil(16.6, 7.6, [0, 2.2, -5.85], 0, a.mist * 0.95);
    veil(12.4, 7.2, [-7.9, 2.0, -0.2], Math.PI / 2, a.mist * 0.7);
    veil(8.6, 5.2, [4.3, 0.9, -3.1], 0, a.mist * 0.9);
    veil(7.2, 3.0, [4.4, waterY + 1.3, 1.2], 0, a.mist * 0.4);
    veil(wA, 4, [(splitX - 8) / 2, HA - 1.95, -5.8], 0, a.mist ** 2 * 0.8).rotation.z = Math.PI;
    veil(wB, 4, [(splitX + 8) / 2, HB - 1.95, -5.8], 0, a.mist ** 2 * 0.8).rotation.z = Math.PI;
    veil(12, 4, [-7.85, HC - 1.95, -0.2], Math.PI / 2, a.mist ** 2 * 0.7).rotation.z = Math.PI;
    // Low mist lying on the water, soft-edged so it never reads as a sheet.
    const puffMap = painted(128, 128, (g) => { const puff = g.createRadialGradient(64, 64, 4, 64, 64, 62); puff.addColorStop(0, 'rgba(255,255,255,0.9)'); puff.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = puff; g.fillRect(0, 0, 128, 128); });
    for (let i = 0; i < 9; i++) {
      const puff = s.mesh(new THREE.PlaneGeometry(2.6 + random() * 2.4, 1.6 + random() * 1.6), new THREE.MeshBasicMaterial({ map: puffMap, color: '#f4f6f1', transparent: true, opacity: 0.1 + a.mist * 0.45, depthWrite: false }), [QX + 1 + random() * (7 - QX), waterY + 0.12 + random() * 0.25, -5 + random() * 10.5]);
      puff.rotation.x = -Math.PI / 2; puff.castShadow = false; puff.renderOrder = 5;
    }

    const floating: THREE.Object3D[] = [];
    // Whoever was here.
    if (a.trace === 'suitcase') {
      const leather = s.material('#7a4a2a'), strap = s.material('#3a2416');
      const cx = QX + 0.75, cz = -1.0, top = -0.32;
      const caseBox = s.box([0.72, 0.5, 0.24], [cx, top + 0.25, cz], leather); caseBox.rotation.y = 0.35;
      for (const dx of [-0.2, 0.2]) { const st = s.box([0.05, 0.52, 0.26], [cx + dx * Math.cos(0.35), top + 0.25, cz - dx * Math.sin(0.35)], strap); st.rotation.y = 0.35; }
      s.ring(0.09, 0.016, [cx, top + 0.52, cz], strap, Math.PI).rotation.y = 0.35;
      s.cylinder(0.17, 0.17, 0.02, [cx + 0.02, top + 0.515, cz + 0.6], s.material('#2c2a30'), 16);
      s.cylinder(0.1, 0.11, 0.1, [cx + 0.02, top + 0.57, cz + 0.6], s.material('#2c2a30'), 16);
      s.box([0.74, 0.02, 0.3], [cx, top + 0.01, cz], s.material('#5a5a52'));
    } else if (a.trace === 'footprints') {
      const wet = new THREE.MeshStandardMaterial({ color: '#55574f', roughness: 0.25 });
      const path: [number, number, number][] = [];
      for (let i = 0; i < 5; i++) path.push([QX + 0.7, -0.16 * (5 - i) + 0.004, 0.55 - i * 0.52]);
      for (let i = 0; i < 9; i++) path.push([QX + 0.5 - i * 0.62, 0.004 + (i === 0 ? 0 : 0), -2.3 - Math.sin(i * 0.5) * 0.5 + i * 0.12]);
      path.forEach(([x, y, z], i) => {
        const side = i % 2 ? 1 : -1, fade = 1 - i / path.length * 0.6;
        const print = s.cylinder(0.075 * fade + 0.03, 0.075 * fade + 0.03, 0.006, [x + (i < 5 ? side * 0.14 : 0), y, z + (i < 5 ? 0 : side * 0.14)], wet, 10);
        print.scale.set(i < 5 ? 1 : 2.1, 1, i < 5 ? 2.1 : 1); print.castShadow = false;
      });
      const pool = s.cylinder(0.5, 0.5, 0.005, [QX + 0.7, LAND + 0.004, 1.3], wet, 16); pool.scale.z = 0.6; pool.castShadow = false;
    } else if (a.trace === 'petals') {
      const tones = ['#f4e9ec', '#e8607a', '#f2c8d0', '#f6f0d8'];
      for (let i = 0; i < 34; i++) {
        const angle = random() * 6.3, reach = 0.2 + random() ** 0.7 * 2.2;
        const x = QX + 4.6 + Math.cos(angle) * reach * 0.9, z = 2.2 + Math.sin(angle) * reach * 1.4;
        if (x > 7.9 || !inWater(x, z)) continue;
        const petal = s.cylinder(0.06 + random() * 0.05, 0.06, 0.006, [x, waterY + 0.014, z], s.material(tones[i % 4], { emissive: tones[i % 4], emissiveIntensity: 0.25 }), 7); petal.scale.z = 0.6; petal.rotation.y = random() * 3; petal.castShadow = false;
      }
      for (let i = 0; i < 3; i++) { s.rod([QX + 4.3 + i * 0.07, waterY + 0.03, 2.0], [QX + 4.85 + i * 0.05, waterY + 0.03, 2.3 + i * 0.1], 0.012, s.material('#3f7a3c')); s.ball([0.09, 0.06, 0.09], [QX + 4.9 + i * 0.06, waterY + 0.05, 2.32 + i * 0.12], s.material(tones[1 + (i % 2)], { emissive: '#8a1030', emissiveIntensity: 0.3 }), 8); }
    } else if (a.trace === 'sandolo') {
      const hullShape = new THREE.Shape(); hullShape.moveTo(-1.9, 0); hullShape.quadraticCurveTo(-0.6, 0.62, 0.5, 0.56); hullShape.quadraticCurveTo(1.5, 0.45, 2.1, 0); hullShape.quadraticCurveTo(1.5, -0.45, 0.5, -0.56); hullShape.quadraticCurveTo(-0.6, -0.62, -1.9, 0);
      const boat = new THREE.Group();
      const paint = s.material(a.walls === 'ochre-red' || a.walls === 'rose-cream' ? '#2f5f8a' : '#3a6a4a');
      const hull = s.mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.42, bevelEnabled: false }), paint); hull.rotation.x = -Math.PI / 2; hull.position.y = -0.14;
      const well = s.mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.02, bevelEnabled: false }), s.material('#8a6a48')); well.rotation.x = -Math.PI / 2; well.scale.set(0.9, 0.84, 1); well.position.y = 0.285;
      boat.add(hull, well);
      for (const x of [-0.6, 0.6]) boat.add(s.box([0.22, 0.04, 1.02], [x, 0.31, 0], s.material('#b89468')));
      for (const side of [-1, 1]) { const oar = s.rod([-1.1, 0.34, side * 0.2], [1.2, 0.36, side * 0.34], 0.025, s.material('#c9a56a')); boat.add(oar); boat.add(s.box([0.5, 0.02, 0.12], [1.35, 0.36, side * 0.35], s.material('#c9a56a'))); }
      boat.position.set(QX + 4.75, waterY, 2.7); boat.rotation.y = Math.PI / 2 + 0.12;
      s.root.add(boat);
      s.tube([[QX + 4.7, waterY + 0.3, 0.75], [QX + 4.4, waterY + 0.1, 0.6], [QX + 3.92, waterY + 0.75, 0.55]], 0.02, s.material('#d5c79d'));
      floating.push(boat);
    } else if (a.trace === 'lantern') {
      const lx = QX + 0.35, lz = 0.95;
      s.cylinder(0.1, 0.12, 0.04, [lx, LAND + 0.02, lz], iron, 8);
      const glow = s.cylinder(0.085, 0.085, 0.22, [lx, LAND + 0.15, lz], s.material('#ffe2a8', { emissive: '#ffae3a', emissiveIntensity: 2.4 }), 8);
      s.cylinder(0.03, 0.12, 0.09, [lx, LAND + 0.3, lz], iron, 8);
      s.ring(0.06, 0.01, [lx, LAND + 0.39, lz], iron);
      for (const [dx, dz] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) s.rod([lx + dx, LAND + 0.04, lz + dz], [lx + dx, LAND + 0.26, lz + dz], 0.008, iron);
      const halo = s.cylinder(0.8, 0.8, 0.004, [lx + 0.2, LAND + 0.005, lz + 0.1], new THREE.MeshBasicMaterial({ color: '#ffc878', transparent: true, opacity: 0.35, depthWrite: false }), 20); halo.castShadow = false;
      lamps.push(glow);
    }

    const baseGlow = lamps.map((lampMesh) => (lampMesh.material as THREE.MeshStandardMaterial).emissiveIntensity);
    world.update = (dt: number, time: number) => {
      ripple(time);
      for (const map of mists) map.offset.x += dt * 0.006 * drift;
      for (const boat of floating) { boat.position.y = waterY + Math.sin(time * 0.9 * drift) * 0.025; boat.rotation.z = Math.sin(time * 0.7 * drift) * 0.02; }
      lamps.forEach((lampMesh, i) => { (lampMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = baseGlow[i] * (0.93 + 0.07 * Math.sin(time * 5 + i * 2.1)); });
    };
    ripple(0);
    const disposeBase = world.dispose.bind(world);
    world.dispose = () => { for (const map of mists) map.dispose(); disposeBase(); };
    return world;
  },
});
