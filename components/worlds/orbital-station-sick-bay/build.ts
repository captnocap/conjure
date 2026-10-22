import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type V3 = [number, number, number];

// ---------------------------------------------------------------- the module's cross-section
// A cylinder lying along x. The deck is a chord across it; the front-upper quarter is cut away.
const R = 2.3, CY = 1.3, L = 6.4, HALF = L / 2;
const TOP_Y = 3.15;
const FLOOR_Z = Math.sqrt(R * R - CY * CY);
const thAt = (y: number) => Math.PI - Math.asin(Math.max(-1, Math.min(1, (y - CY) / R)));
const TH_FLOOR = thAt(0), TH_TOP = thAt(TOP_Y), TH_FRONT = Math.PI * 2 - Math.asin(CY / R);
/** Shape-space angle for an extrusion that is turned so shape x runs toward -z. */
const phi = (th: number) => Math.PI - th;
const wallPoint = (x: number, y: number, off = 0): V3 => { const th = thAt(y), r = R - off; return [x, CY + r * Math.sin(th), r * Math.cos(th)]; };

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** A piece of the inside of the hull between two heights and two stations along x, facing inward. */
function curved(x0: number, x1: number, y0: number, y1: number, r: number, ny = 16) {
  const t0 = thAt(y0), t1 = thAt(y1);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ny; j++) {
    const th = mix(t0, t1, j / ny);
    for (let i = 0; i <= 1; i++) {
      pos.push(i ? x1 : x0, CY + r * Math.sin(th), r * Math.cos(th));
      nor.push(0, -Math.sin(th), -Math.cos(th));
      uv.push(i, j / ny);
    }
  }
  for (let j = 0; j < ny; j++) { const a = j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}
function sector(rIn: number, rOut: number, th0: number, th1: number, depth = L, x0 = -HALF) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, phi(th1), phi(th0), false);
  shape.absarc(0, 0, rIn, phi(th0), phi(th1), true);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 });
  geo.rotateY(Math.PI / 2);
  geo.translate(x0, CY, 0);
  return geo;
}

// ---------------------------------------------------------------- what is outside
const OUTSIDE = {
  earth: 'The blue limb of the Earth in daylight: oceans, swirls of cloud, a thin bright line of atmosphere, stars above.',
  night: 'The Earth\'s night side: threads of city lights, a green aurora curling along the limb.',
  moon: 'The grey cratered limb of the Moon, very close.',
  mars: 'The rust-red limb of Mars under a thin pale haze.',
  stars: 'Nothing but stars and the smear of the Milky Way.',
  shutter: 'The shutter is closed: a ribbed metal blind, nothing outside at all.',
} as const;
type Outside = keyof typeof OUTSIDE;

function paintSpace(g: G, w: number, h: number, kind: Outside, rand: () => number, limbTop: number, radius: number, stars: number) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#05070f'); sky.addColorStop(1, kind === 'earth' ? '#0d2348' : '#080b18');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < stars; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`; const r = rand() < 0.06 ? 1.8 : 0.6 + rand() * 0.8; g.beginPath(); g.arc(rand() * w, rand() * h, r, 0, 7); g.fill(); }
  if (kind === 'stars') {
    for (let i = 0; i < 40; i++) { const x = (i / 40) * w + (rand() - 0.5) * 60, y = h * (0.75 - (i / 40) * 0.5) + (rand() - 0.5) * h * 0.2, r = h * (0.1 + rand() * 0.2); const c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, 'rgba(200,210,255,0.16)'); c.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = c; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < stars; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.5})`; const t = rand(); g.fillRect(t * w + (rand() - 0.5) * 80, h * (0.75 - t * 0.5) + (rand() - 0.5) * h * 0.25, 1.4, 1.4); }
    return;
  }
  if (kind === 'shutter') return;
  const cx = w * 0.5, cy = limbTop + radius;
  const tone = { earth: '#2f7fd8', night: '#0b1326', moon: '#8d8c88', mars: '#b7552b' }[kind];
  const edge = { earth: '#b8e4ff', night: '#2fd88a', moon: '#b8b7b2', mars: '#f0c8a0' }[kind];
  const haze = { earth: h * 0.18, night: h * 0.2, moon: 0, mars: h * 0.08 }[kind];
  if (haze > 0) { const glow = g.createRadialGradient(cx, cy, radius, cx, cy, radius + haze); glow.addColorStop(0, edge); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h); }
  const fill = g.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius); fill.addColorStop(0, tone); fill.addColorStop(0.9, tone); fill.addColorStop(1, edge);
  g.fillStyle = fill; g.beginPath(); g.arc(cx, cy, radius, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, radius - 1, 0, 7); g.clip();
  const band = h - limbTop;
  if (kind === 'earth') {
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? '90,140,70' : '170,150,100'},0.7)`; g.beginPath(); g.ellipse(rand() * w, limbTop + band * (0.2 + rand() * 0.8), w * (0.03 + rand() * 0.06), band * (0.06 + rand() * 0.1), rand() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.45 + rand() * 0.5})`; g.beginPath(); g.ellipse(rand() * w, limbTop + band * rand(), w * (0.01 + rand() * 0.04), band * (0.02 + rand() * 0.05), (rand() - 0.5) * 0.4, 0, 7); g.fill(); }
  } else if (kind === 'night') {
    for (let c = 0; c < 22; c++) { const x = rand() * w, y = limbTop + band * (0.15 + rand() * 0.85); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,${190 + Math.round(rand() * 50)},120,${0.4 + rand() * 0.6})`; g.fillRect(x + (rand() - 0.5) * w * 0.05 * rand(), y + (rand() - 0.5) * band * 0.12 * rand(), 1.8, 1.8); } }
    g.strokeStyle = 'rgba(255,210,130,0.45)'; g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(rand() * w, limbTop + band * (0.2 + rand() * 0.8)); g.lineTo(rand() * w, limbTop + band * (0.2 + rand() * 0.8)); g.stroke(); }
  } else if (kind === 'moon') {
    for (let i = 0; i < 90; i++) { const x = rand() * w, y = limbTop + band * rand(), r = band * (0.03 + rand() * 0.12); g.fillStyle = 'rgba(60,60,58,0.6)'; g.beginPath(); g.ellipse(x, y, r * 1.6, r, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(225,225,220,0.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r * 1.6, r, 0, Math.PI * 0.9, Math.PI * 1.9); g.stroke(); }
  } else {
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,35,20,${0.2 + rand() * 0.35})`; g.beginPath(); g.ellipse(rand() * w, limbTop + band * rand(), w * (0.03 + rand() * 0.08), band * (0.05 + rand() * 0.15), rand() * 3, 0, 7); g.fill(); }
  }
  g.restore();
  g.strokeStyle = kind === 'night' ? 'rgba(90,255,170,0.85)' : kind === 'earth' ? 'rgba(210,245,255,0.95)' : 'rgba(255,255,255,0.25)';
  g.lineWidth = Math.max(2, h * 0.012); g.beginPath(); g.arc(cx, cy, radius + 2, 0, 7); g.stroke();
  if (kind === 'night') {
    // aurora curtains rising off the limb
    for (let i = 0; i < 70; i++) {
      const x = w * (0.1 + rand() * 0.5) + i * 2, top = limbTop - h * (0.05 + rand() * 0.18);
      const yAt = cy - Math.sqrt(Math.max(0, radius * radius - (x - cx) ** 2));
      const c = g.createLinearGradient(0, top, 0, yAt);
      c.addColorStop(0, 'rgba(120,255,170,0)'); c.addColorStop(0.7, 'rgba(110,255,170,0.22)'); c.addColorStop(1, 'rgba(160,255,200,0.5)');
      g.fillStyle = c; g.fillRect(x, top, 3, yAt - top);
    }
  }
}

const MODULES = {
  white: { panel: '#e6e8e3', seam: '#c3c7c0', velcro: '#d6ccb2', accent: '#2f6fb0', rail: '#c9ced3', note: 'Padded off-white panels with beige velcro squares and blue labels, the modern international look.' },
  soviet: { panel: '#b8c4ae', seam: '#99a590', velcro: '#cdbf9c', accent: '#c8902a', rail: '#8a9488', note: 'Pale green-grey panels and ochre labels, an old Soviet-era module patched for decades.' },
  skylab: { panel: '#d6b07a', seam: '#b48e5c', velcro: '#a88a5a', accent: '#a0522d', rail: '#5f4f40', note: 'Seventies ochre and brown with chunky dials, a retro space-age lab.' },
  sleek: { panel: '#f4f6f8', seam: '#d8dde2', velcro: '#e0e4e8', accent: '#18a8d8', rail: '#a8b2bc', note: 'Glossy white with cyan light lines, a new commercial station.' },
} as const;

export default defineWorld({
  questions: {
    outside: choice('What is outside the viewport?', OUTSIDE),
    lighting: choice('How is the module lit?', {
      night: 'Night cycle: dimmed cool white strips, the room lit mostly by the window.',
      emergency: 'Emergency: red strip lights and a turning red beacon.',
      full: 'Full day cycle: bright even clinical white.',
    }),
    state: choice('What has happened in here?', {
      tidy: 'Tidy: everything stowed and strapped down, one pen floating on its tether.',
      used: 'In use: a drink pouch, a tablet and a crumpled tissue drifting, a blanket half off the couch.',
      emergency: 'After an emergency: wrappers, gloves and gauze drifting everywhere, a drawer hanging open, an IV bag floating on its line.',
      longstay: 'A long stay: a sleeping bag tethered to the wall, a book and headphones drifting, someone has been here for weeks.',
    }),
    walls: choice('What hangs on the walls by the couch?', {
      photos: 'Family photos and a child\'s drawing velcroed up where the patient can see them.',
      charts: 'An eye chart, a body chart and a laminated checklist.',
      patches: 'Embroidered mission patches and a small flag.',
      plants: 'A lettuce growth chamber glowing pink-violet and a pouch of orange flowers.',
      bare: 'Nothing but labels, cable runs and velcro.',
    }),
    comms: choice('What is on the comms screen?', {
      call: 'A video call from home, a figure blurred by the link, LIVE in red.',
      message: 'A priority text message from the ground, lines of small type.',
      static: 'Static and SIGNAL LOST: out of contact.',
      off: 'Dark: the screen is off, the headset floats on its coiled cord.',
    }),
    couch: choice('How is the exam couch?', {
      made: 'Made up: a paper sheet, a pillow, the restraint straps folded neatly at the sides.',
      rumpled: 'Rumpled: a blanket tangled and drifting off it, straps unbuckled and floating.',
      strapped: 'Straps buckled tight across an empty couch, waiting for someone.',
    }),
    module: choice('What kind of module is it?', Object.fromEntries(Object.entries(MODULES).map(([k, v]) => [k, v.note])) as Record<keyof typeof MODULES, string>),
    hatch: noul('Is the round hatch at the end standing open?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const M = MODULES[a.module];
    const lightMode = a.lighting;
    const background = { night: '#2b3550', emergency: '#3a2430', full: '#4a5878' }[lightMode];
    const { art: s, world } = diorama(context, {
      background, floor: null, width: L, depth: FLOOR_Z * 2, pitch: 18, yaw: 24, maxHeight: 2.0, radius: 0.95, scale: [0.8, 1.35],
      slots: [[0.45, 0.55], [-0.5, -0.6], [2.05, 0.05], [-1.9, 0.95], [1.35, 1.35]],
      viewBox: [[-HALF - 0.6, -0.5, -R], [HALF + 0.1, 3.0, FLOOR_Z]],
    });
    const { root } = s;
    const energy = mood.energy, wear = mood.wear;
    const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = root) => { parent.add(o); return o; };
    const onWall = <T extends THREE.Object3D>(o: T, x: number, y: number, off: number) => { o.position.set(...wallPoint(x, y, off)); o.rotation.x = Math.PI - thAt(y); return add(o); };
    const wallQuat = (y: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI - thAt(y), 0, 0));

    // ---------------------------------------------------------------- light
    let hemi: THREE.HemisphereLight | null = null, fill: THREE.DirectionalLight | null = null;
    root.traverse((node) => { if ((node as THREE.HemisphereLight).isHemisphereLight) hemi = node as THREE.HemisphereLight; else if ((node as THREE.DirectionalLight).isDirectionalLight && node !== world.keyLight) fill = node as THREE.DirectionalLight; });
    const warmTint = (c: string) => new THREE.Color(c).lerp(new THREE.Color('#ffd8a8'), mood.warmth * 0.25);
    const setHemi = (sky: string, ground: string, i: number) => { const h = hemi as THREE.HemisphereLight | null; if (h) { h.color = warmTint(sky); h.groundColor = new THREE.Color(ground); h.intensity = i; } };
    if (lightMode === 'night') { setHemi('#9fb4e8', '#2a3040', 0.9); if (world.keyLight) { world.keyLight.color = warmTint('#c8d8ff'); world.keyLight.intensity = 1.15; } }
    if (lightMode === 'emergency') { setHemi('#ff5444', '#2a080c', 0.85); if (world.keyLight) { world.keyLight.color = new THREE.Color('#ff8c7c'); world.keyLight.intensity = 0.9; } }
    if (lightMode === 'full') { setHemi('#ffffff', '#707880', 1.45); if (world.keyLight) { world.keyLight.color = warmTint('#ffffff'); world.keyLight.intensity = 2.6; } }
    const f = fill as THREE.DirectionalLight | null;
    if (f) f.intensity = lightMode === 'full' ? 0.6 : 0.35;

    // ---------------------------------------------------------------- the hull, in section
    const hull = s.material('#f2f2ee', { roughness: 0.9 });
    const mli = s.material('#d8b85a', { roughness: 0.55, metalness: 0.4 });
    const structure = s.material('#8a8e94', { roughness: 0.7, metalness: 0.3 });
    const subfloor = s.material('#4a4e56', { roughness: 0.8 });
    add(new THREE.Mesh(sector(R + 0.15, R + 0.2, TH_TOP, TH_FRONT), [hull, hull])).receiveShadow = true;
    add(new THREE.Mesh(sector(R + 0.03, R + 0.15, TH_TOP, TH_FRONT), [mli, mli]));
    add(new THREE.Mesh(sector(R - 0.02, R + 0.03, TH_TOP, TH_FRONT), [structure, structure]));
    add(new THREE.Mesh(sector(R - 0.06, R - 0.02, TH_FLOOR, TH_FRONT), [subfloor, subfloor]));
    // a few tanks and cable bundles under the deck, seen at the cut end
    for (const [z, rr] of [[-0.9, 0.32], [0.1, 0.36], [1.05, 0.3]] as const) {
      const tank = s.cylinder(rr, rr, L - 0.4, [0, -0.5 - (z === 0.1 ? 0.15 : 0), z], s.material(pick(['#c8ccd0', '#e8e4dc', '#9aa4ae']), { metalness: 0.4, roughness: 0.4 }), 20);
      tank.rotation.z = Math.PI / 2;
    }
    s.tube([[-HALF, -0.18, 1.5], [0, -0.22, 1.45], [HALF, -0.18, 1.5]], 0.05, s.material('#2a2d33'));

    // ---------------------------------------------------------------- the padded inner wall, painted
    const pxAt = (x: number, w: number) => ((x + HALF) / L) * w;
    const pyAt = (y: number, h: number) => (1 - (TH_FLOOR - thAt(y)) / (TH_FLOOR - TH_TOP)) * h;
    const VX0 = -2.75, VX1 = 0.55, VY0 = 1.24, VY1 = 1.96;
    const DX0 = 1.85, DX1 = 3.1, DY0 = 0.12, DY1 = 1.15;
    const wallMap = paint(2048, 1126, (g, w, h) => {
      g.fillStyle = M.panel; g.fillRect(0, 0, w, h);
      // padded panels in a grid, each softly pillowed and stitched
      const cols = 12, pw = w / cols;
      const rowsY = [0, 0.5, 1.0, VY0, VY1, 2.4, 2.8, TOP_Y];
      for (let c = 0; c < cols; c++) for (let rI = 0; rI < rowsY.length - 1; rI++) {
        const x = c * pw, y0 = pyAt(rowsY[rI + 1], h), y1 = pyAt(rowsY[rI], h);
        const grad = g.createRadialGradient(x + pw * 0.45, (y0 + y1) / 2 - 6, 4, x + pw / 2, (y0 + y1) / 2, pw * 0.75);
        grad.addColorStop(0, 'rgba(255,255,255,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0.12)');
        g.fillStyle = grad; g.fillRect(x + 2, y0 + 2, pw - 4, y1 - y0 - 4);
        g.strokeStyle = M.seam; g.lineWidth = 4; g.strokeRect(x + 1, y0 + 1, pw - 2, y1 - y0 - 2);
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.setLineDash([5, 5]); g.strokeRect(x + 10, y0 + 10, pw - 20, y1 - y0 - 20); g.setLineDash([]);
      }
      // the window recess
      g.fillStyle = '#2a2e36'; g.fillRect(pxAt(VX0 - 0.06, w), pyAt(VY1 + 0.06, h), pxAt(VX1 + 0.06, w) - pxAt(VX0 - 0.06, w), pyAt(VY0 - 0.06, h) - pyAt(VY1 + 0.06, h));
      // the accent band and labels
      const band = pyAt(0.95, h);
      g.fillStyle = M.accent; g.fillRect(0, band - 6, w, 12);
      g.fillStyle = M.accent; g.font = 'bold 26px sans-serif'; g.textAlign = 'left';
      for (const [x, y, t] of [[-3.0, 0.7, 'MED-1'], [0.7, 2.5, 'CHeCS'], [-0.5, 0.45, 'O2 ▼'], [2.4, 2.62, 'RACK M3'], [-2.0, 2.62, 'CREW MED RESTRAINT']] as const) g.fillText(t, pxAt(x, w), pyAt(y, h));
      // velcro squares wherever things get parked
      g.fillStyle = M.velcro;
      for (let i = 0; i < 70; i++) { const x = random() * w, y = random() * h, sz = 14 + random() * 14; g.fillRect(x, y, sz, sz * (0.6 + random() * 0.8)); }
      // the drawer bank, labelled
      const dx0 = pxAt(DX0, w), dx1 = pxAt(DX1, w), dy0 = pyAt(DY1, h), dy1 = pyAt(DY0, h);
      g.fillStyle = '#d8dcde'; g.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
      const labels = ['AIRWAY', 'IV', 'MEDS A', 'MEDS B', 'DRESSINGS', 'SUTURE', 'DIAG', 'DENTAL', 'EYE', 'OINTMENT', 'SPLINTS', 'GLOVES', 'SHARPS', 'BP / ECG', 'SPARE'];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) {
        const x = dx0 + (i * (dx1 - dx0)) / 3, y = dy0 + (j * (dy1 - dy0)) / 5, cw = (dx1 - dx0) / 3, ch = (dy1 - dy0) / 5;
        g.fillStyle = '#eef0f0'; g.fillRect(x + 4, y + 4, cw - 8, ch - 8);
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
        g.fillStyle = j === 0 && i === 0 ? '#d8262c' : M.accent; g.fillRect(x + 10, y + ch - 28, cw - 20, 16);
        g.fillStyle = '#ffffff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(labels[(i * 5 + j) % labels.length], x + cw / 2, y + ch - 15);
      }
      // pouch panel backing
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(pxAt(DX0, w), pyAt(2.45, h), pxAt(DX1, w) - pxAt(DX0, w), pyAt(1.3, h) - pyAt(2.45, h));
      // grime where hands and feet go
      for (let i = 0; i < 10 + wear * 60; i++) { g.fillStyle = `rgba(90,80,60,${0.04 + wear * 0.08})`; g.beginPath(); g.ellipse(random() * w, pyAt(random() < 0.5 ? 1.12 : 0.3, h) + (random() - 0.5) * 60, 10 + random() * 40, 6 + random() * 14, 0, 0, 7); g.fill(); }
    });
    const inner = add(new THREE.Mesh(curved(-HALF, HALF, 0, TOP_Y, R - 0.06, 40), new THREE.MeshStandardMaterial({ map: wallMap, roughness: a.module === 'sleek' ? 0.45 : 0.85 })));
    inner.receiveShadow = true;
    // the padded layer's thickness shows along the top cut
    add(new THREE.Mesh(sector(R - 0.06, R - 0.02, TH_TOP, TH_FLOOR), [s.material(M.panel), s.material(M.seam)]));

    // ---------------------------------------------------------------- the deck, with foot loops and seat tracks
    const deckMap = paint(1024, 608, (g, w, h) => {
      g.fillStyle = a.module === 'skylab' ? '#7a6a58' : '#8d939a'; g.fillRect(0, 0, w, h);
      const tile = w / 16;
      for (let x = 0; x < w; x += tile) for (let y = 0; y < h; y += tile) { g.fillStyle = `rgba(255,255,255,${0.04 + random() * 0.05})`; g.fillRect(x + 2, y + 2, tile - 4, tile - 4); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, tile - 2, tile - 2); }
      g.fillStyle = 'rgba(30,32,36,0.6)';
      for (const y of [0.3, 0.7]) { g.fillRect(0, h * y - 6, w, 12); g.fillStyle = 'rgba(200,205,210,0.6)'; for (let x = 0; x < w; x += 18) g.fillRect(x, h * y - 2, 8, 4); g.fillStyle = 'rgba(30,32,36,0.6)'; }
      // hatch keep-clear stripes at the left end
      for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#1d1d1f' : '#e8c22a'; g.save(); g.translate(30, h * 0.2 + i * 22); g.rotate(-0.6); g.fillRect(-20, 0, 40, 22); g.restore(); }
      for (let i = 0; i < wear * 40; i++) { g.strokeStyle = `rgba(30,30,30,${random() * 0.25})`; g.lineWidth = 1 + random() * 3; const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 80, y + (random() - 0.5) * 20); g.stroke(); }
    });
    const deckSide = s.material('#5a5e66', { roughness: 0.7 });
    const deck = add(new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, FLOOR_Z * 2), [deckSide, deckSide, new THREE.MeshStandardMaterial({ map: deckMap, roughness: 0.8 }), deckSide, deckSide, deckSide]));
    deck.position.y = -0.05; deck.receiveShadow = true;
    world.ground = deck;
    const loopGeo = new THREE.TorusGeometry(0.07, 0.014, 6, 14, Math.PI);
    const loops = new THREE.InstancedMesh(loopGeo, s.material(a.module === 'skylab' ? '#5f4f40' : '#4a5a7a', { roughness: 0.9 }), 14);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < 14; i++) {
      const row = i < 7, x = row ? -2.5 + i * 0.32 : -0.6 + (i - 7) * 0.55, z = row ? -0.7 + (random() - 0.5) * 0.1 : 0.15 + (random() - 0.5) * 0.6;
      mtx.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (random() - 0.5) * 0.5, 0)), new THREE.Vector3(1, 1, 1));
      loops.setMatrixAt(i, mtx);
    }
    loops.castShadow = loops.receiveShadow = true;
    add(loops);

    // ---------------------------------------------------------------- the end bulkhead and its round hatch
    const HZ = -0.6, HY = 1.05, HR = 0.48;
    const bulkShape = new THREE.Shape();
    bulkShape.absarc(0, 0, R + 0.2, phi(TH_FRONT), phi(TH_TOP), false);
    bulkShape.closePath();
    const hole = new THREE.Path(); hole.absarc(-HZ, HY - CY, HR, 0, Math.PI * 2, true);
    bulkShape.holes.push(hole);
    const bulkGeo = new THREE.ExtrudeGeometry(bulkShape, { depth: 0.14, bevelEnabled: false, curveSegments: 48 });
    bulkGeo.rotateY(Math.PI / 2); bulkGeo.translate(-HALF - 0.14, CY, 0);
    const bulkMat = s.material(new THREE.Color(M.panel).lerp(new THREE.Color('#9aa0a8'), 0.25), { roughness: 0.75 });
    add(new THREE.Mesh(bulkGeo, [bulkMat, structure])).receiveShadow = true;
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(HR + 0.02, 0.06, 10, 40), s.material('#b8bec4', { metalness: 0.7, roughness: 0.3 })));
    rim.rotation.y = Math.PI / 2; rim.position.set(-HALF + 0.02, HY, HZ);
    const tunnel = add(new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, 0.7, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#5a6070', roughness: 0.8, side: THREE.BackSide })));
    tunnel.rotation.z = Math.PI / 2; tunnel.position.set(-HALF - 0.45, HY, HZ);
    const collar = add(new THREE.Mesh(new THREE.CylinderGeometry(HR + 0.12, HR + 0.12, 0.55, 28, 1, true), hull));
    collar.rotation.z = Math.PI / 2; collar.position.set(-HALF - 0.42, HY, HZ);
    const far = add(new THREE.Mesh(new THREE.CircleGeometry(HR, 28), new THREE.MeshStandardMaterial({ color: '#cfe0ff', emissive: lightMode === 'emergency' ? '#ff5040' : '#bcd4ff', emissiveIntensity: a.hatch ? 0.9 : 0.2 })));
    far.rotation.y = Math.PI / 2; far.position.set(-HALF - 0.78, HY, HZ);
    const hatchHinge = add(new THREE.Group());
    hatchHinge.position.set(-HALF + 0.05, HY, HZ + HR);
    hatchHinge.rotation.y = a.hatch ? -1.9 : 0;
    const door = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, 0.08, 32), s.material('#c8ccd0', { metalness: 0.5, roughness: 0.4 }));
    door.rotation.z = Math.PI / 2; door.position.set(0, 0, -HR); door.castShadow = door.receiveShadow = true;
    hatchHinge.add(door);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 24), s.material('#2a2d33'));
    wheel.rotation.y = Math.PI / 2; wheel.position.set(0.07, 0, -HR);
    hatchHinge.add(wheel);
    for (let k = 0; k < 3; k++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.02), s.material('#2a2d33')); spoke.position.set(0.07, 0, -HR); spoke.rotation.x = (k / 3) * Math.PI; hatchHinge.add(spoke); }
    // MEDICAL sign and the beacon
    const signMap = paint(256, 96, (g, w, h) => {
      g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d8262c'; g.fillRect(22, 18, 20, 60); g.fillRect(2, 38, 60, 20);
      g.fillStyle = '#1d1d1f'; g.font = 'bold 40px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('MEDICAL', 74, h / 2 + 2, 176);
    });
    const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.28), new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.6, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: lightMode === 'night' ? 0.35 : 0.15 })));
    sign.rotation.y = Math.PI / 2; sign.position.set(-HALF + 0.005, 2.05, -0.75);
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#d82a20', emissive: '#ff2a1a', emissiveIntensity: lightMode === 'emergency' ? 2.2 : 0.15, roughness: 0.3, transparent: true, opacity: 0.85 });
    const beacon = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), beaconMat));
    beacon.rotation.z = -Math.PI / 2; beacon.position.set(-HALF + 0.005, 1.7, -1.5);
    // one point light at most: the beacon in an emergency, the window's glow at night
    const beaconLight = lightMode === 'emergency' ? add(new THREE.PointLight('#ff2a18', 12, 9, 1.1)) : null;
    if (beaconLight) beaconLight.position.set(-1.2, 2.2, -0.6);

    // ---------------------------------------------------------------- the long viewport
    const outside: Outside = a.outside;
    const windowMap = paint(1536, 270, (g, w, h) => paintSpace(g, w, h, outside, random, h * 0.42, w * 3, 220));
    const glass = add(new THREE.Mesh(curved(VX0, VX1, VY0, VY1, R - 0.075, 8), new THREE.MeshStandardMaterial({ color: '#000000', map: windowMap, emissive: '#ffffff', emissiveMap: windowMap, emissiveIntensity: mix(0.85, 1.15, mood.cheer), roughness: 0.15 })));
    glass.receiveShadow = false;
    const steel = s.material(a.module === 'skylab' ? '#7a6a58' : '#9aa2aa', { metalness: 0.6, roughness: 0.35 });
    const darkSteel = s.material('#3a3e44', { metalness: 0.5, roughness: 0.45 });
    const VW = VX1 - VX0, VXM = (VX0 + VX1) / 2;
    for (const y of [VY0 - 0.05, VY1 + 0.05]) onWall(new THREE.Mesh(new THREE.BoxGeometry(VW + 0.2, 0.1, 0.1), steel), VXM, y, 0.1).castShadow = true;
    for (const x of [VX0 - 0.05, VX1 + 0.05]) onWall(new THREE.Mesh(new THREE.BoxGeometry(0.1, VY1 - VY0 + 0.2, 0.1), steel), x, (VY0 + VY1) / 2, 0.1).castShadow = true;
    for (const t of [1 / 3, 2 / 3]) onWall(new THREE.Mesh(new THREE.BoxGeometry(0.07, VY1 - VY0, 0.07), steel), VX0 + VW * t, (VY0 + VY1) / 2, 0.1);
    const rivets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 6, 4), darkSteel, 2 * 24);
    for (let i = 0; i < 24; i++) for (const [k, y] of [[0, VY0 - 0.05], [1, VY1 + 0.05]] as const) {
      const p = wallPoint(VX0 - 0.05 + (VW + 0.1) * (i / 23), y, 0.155);
      rivets.setMatrixAt(i * 2 + k, mtx.compose(new THREE.Vector3(...p), wallQuat(y), new THREE.Vector3(1, 1, 1)));
    }
    add(rivets);
    // a ribbed shutter slid partly or wholly across
    const shutterMap = paint(512, 96, (g, w, h) => { g.fillStyle = '#9aa2aa'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 10, 0, 4, h); } });
    shutterMap.wrapS = THREE.RepeatWrapping;
    const shutterLen = outside === 'shutter' ? VW : VW * (random() < 0.5 ? 0.12 + random() * 0.2 : 0.02);
    shutterMap.repeat.set(Math.max(1, shutterLen / 0.5), 1);
    add(new THREE.Mesh(curved(VX0, VX0 + shutterLen, VY0, VY1, R - 0.09, 6), new THREE.MeshStandardMaterial({ map: shutterMap, metalness: 0.5, roughness: 0.4 }))).castShadow = true;
    const windowGlow = outside === 'shutter' || lightMode !== 'night' ? null : add(new THREE.PointLight({ earth: '#a8c8ff', night: '#88a8e0', moon: '#e0e0d8', mars: '#ffb088', stars: '#a8b0d0', shutter: '#000000' }[outside], { earth: 8, night: 4.5, moon: 6, mars: 6, stars: 3.5, shutter: 0 }[outside], 6, 1.3));
    if (windowGlow) windowGlow.position.set(VXM, 1.6, -1.5);

    // ---------------------------------------------------------------- the exam couch with restraint straps
    const CX0 = -2.65, CX1 = -0.85, CXM = (CX0 + CX1) / 2, CL = CX1 - CX0, CZ = -1.38, CWd = 0.68, CTop = 0.64;
    const pad = s.material(pick(['#3a5a8a', '#4a6a5a', '#5a4a6a', '#2f4f6a']), { roughness: 0.65 });
    s.box([1.1, CTop - 0.14, 0.4], [CXM, (CTop - 0.14) / 2, CZ - 0.1], darkSteel);
    s.box([CL, 0.06, CWd - 0.04], [CXM, CTop - 0.12, CZ], steel);
    for (const x of [CX0 + 0.25, CX1 - 0.25]) s.rod([x, CTop - 0.2, CZ - 0.2], wallPoint(x, CTop - 0.2, 0.05), 0.025, steel);
    const mattress = s.mesh(new RoundedBoxGeometry(CL, 0.14, CWd, 4, 0.05), pad, [CXM, CTop - 0.02, CZ]);
    void mattress;
    const head = s.mesh(new RoundedBoxGeometry(0.42, 0.1, CWd - 0.04, 4, 0.04), pad, [CX0 + 0.24, CTop + 0.09, CZ]);
    head.rotation.z = -0.22;
    const strapMat = s.material(pick(['#1d1d1f', '#d8a028', '#2a2d33']), { roughness: 0.8 });
    const buckle = s.material('#c8ccd0', { metalness: 0.8, roughness: 0.25 });
    const strapXs = a.couch === 'strapped' ? [-2.25, -1.85, -1.45, -1.05] : [-2.15, -1.6, -1.1];
    const floaters: { o: THREE.Object3D; base: THREE.Vector3; amp: THREE.Vector3; w: number; ph: number; spin: THREE.Vector3 }[] = [];
    const drift = (o: THREE.Object3D, amp: V3 = [0.04, 0.05, 0.04], spin: V3 = [0.2, 0.3, 0.1]) => { floaters.push({ o, base: o.position.clone(), amp: new THREE.Vector3(...amp), w: 0.25 + random() * 0.35, ph: random() * 6.28, spin: new THREE.Vector3(...spin).multiplyScalar(random() < 0.5 ? -1 : 1) }); return o; };
    for (const x of strapXs) {
      const top = CTop + 0.055;
      if (a.couch === 'rumpled' && random() < 0.75) {
        // unbuckled: the strap floats up off the couch in a lazy curve
        const tail = s.tube([[x, top, CZ - CWd / 2], [x + 0.05, top + 0.25, CZ - 0.1], [x - 0.04, top + 0.42, CZ + 0.2], [x + 0.06, top + 0.5, CZ + 0.4]], 0.018, strapMat);
        tail.scale.z = 0.6;
        drift(s.box([0.07, 0.03, 0.05], [x + 0.06, top + 0.5, CZ + 0.4], buckle), [0.03, 0.04, 0.03], [0.3, 0.2, 0.3]);
      } else if (a.couch === 'made') {
        // folded neatly over the side
        s.box([0.07, 0.15, 0.012], [x, CTop - 0.02, CZ + CWd / 2 + 0.008], strapMat);
        s.box([0.07, 0.15, 0.012], [x, CTop - 0.02, CZ - CWd / 2 - 0.008], strapMat);
      } else {
        s.box([0.07, 0.012, CWd + 0.02], [x, top + 0.004, CZ], strapMat);
        s.box([0.07, 0.15, 0.012], [x, CTop - 0.02, CZ + CWd / 2 + 0.008], strapMat);
        s.box([0.09, 0.012, 0.06], [x, top + 0.012, CZ + 0.12], buckle);
      }
    }
    if (a.couch === 'made') {
      s.box([CL - 0.25, 0.004, CWd - 0.08], [CXM + 0.1, CTop + 0.052, CZ], s.material('#f4f4ee', { roughness: 0.9 }));
      s.cylinder(0.05, 0.05, CWd - 0.06, [CX1 + 0.04, CTop + 0.02, CZ], s.material('#f4f4ee'), 14).rotation.x = Math.PI / 2;
      s.mesh(new RoundedBoxGeometry(0.34, 0.08, 0.46, 3, 0.035), s.material('#f0f0ea', { roughness: 0.9 }), [CX0 + 0.26, CTop + 0.17, CZ]).rotation.z = -0.22;
    }
    if (a.couch === 'rumpled' || a.state === 'used') {
      const blanket = s.mesh(new THREE.TorusKnotGeometry(0.18, 0.08, 48, 8, 2, 3), s.material(pick(['#8a8f96', '#5a6a8a', '#b8a888']), { roughness: 1 }), [CXM + 0.25, CTop + 0.32, CZ + 0.15]);
      blanket.scale.set(1.5, 0.55, 1.1);
      drift(blanket, [0.05, 0.06, 0.04], [0.05, 0.1, 0.05]);
    }

    // ---------------------------------------------------------------- handrails, the drawer bank, the pouch wall
    const railMat = s.material(M.rail, { roughness: 0.4, metalness: a.module === 'skylab' ? 0.2 : 0.5 });
    const rail = (x0: number, x1: number, y: number) => {
      s.rod(wallPoint(x0, y, 0.09), wallPoint(x1, y, 0.09), 0.018, railMat);
      for (let x = x0 + 0.15; x <= x1 - 0.1; x += 0.8) s.rod(wallPoint(x, y, 0.0), wallPoint(x, y, 0.09), 0.012, railMat);
    };
    rail(-3.0, 0.7, 1.08);
    rail(-3.0, 3.1, 2.82);
    s.tube([wallPoint(1.68, 0.35, 0.09), wallPoint(1.68, 1.2, 0.09), wallPoint(1.68, 2.0, 0.09), wallPoint(1.68, 2.6, 0.09)], 0.018, railMat);
    // drawer handles in relief
    const handles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.018, 0.025), darkSteel, 15);
    let hi = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) {
      const x = DX0 + (i + 0.5) * ((DX1 - DX0) / 3), y = DY1 - (j + 0.35) * ((DY1 - DY0) / 5);
      handles.setMatrixAt(hi++, mtx.compose(new THREE.Vector3(...wallPoint(x, y, 0.075)), wallQuat(y), new THREE.Vector3(1, 1, 1)));
    }
    add(handles);
    const openDrawer = a.state === 'emergency' || (a.state === 'used' && random() < 0.5);
    if (openDrawer) {
      const y = DY1 - 1.5 * ((DY1 - DY0) / 5);
      const drawer = onWall(new THREE.Group(), DX0 + 1.5 * ((DX1 - DX0) / 3), y, 0.06);
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.17, 0.32), s.material('#eef0f0'));
      d.position.z = 0.17; d.castShadow = true;
      drawer.add(d);
      const inside = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.28), s.material(pick(['#2f6fb0', '#d8262c', '#f0c419'])));
      inside.position.set(0, 0.07, 0.17);
      drawer.add(inside);
    }
    // the pouch wall: colour-coded velcro pouches in rows, straps across
    const pouchGeo = new RoundedBoxGeometry(0.34, 0.22, 0.09, 3, 0.03);
    const pouchCodes = ['#2f5a9a', '#d8262c', '#f07a1a', '#3f7a4a', '#f0efe8', '#6a4a8a'];
    const pouches = new THREE.InstancedMesh(pouchGeo, s.material('#ffffff', { roughness: 0.9 }), 12);
    const straps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.24, 0.1), s.material('#2a2d33', { roughness: 0.8 }), 12);
    let pi = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const x = DX0 + 0.21 + i * 0.41 + (random() - 0.5) * 0.03, y = 1.42 + j * 0.27;
      const q = wallQuat(y), p = new THREE.Vector3(...wallPoint(x, y, 0.1));
      pouches.setMatrixAt(pi, mtx.compose(p, q, new THREE.Vector3(1, 1, 1)));
      pouches.setColorAt(pi, new THREE.Color(a.module === 'soviet' && random() < 0.5 ? '#6a7458' : pick(pouchCodes)));
      straps.setMatrixAt(pi, mtx.compose(new THREE.Vector3(...wallPoint(x + 0.08, y, 0.105)), q, new THREE.Vector3(1, 1, 1)));
      pi++;
    }
    pouches.castShadow = straps.castShadow = true;
    add(pouches); add(straps);
    // fire extinguisher and the vent with streamers
    const ext = onWall(new THREE.Group(), 1.05, 0.55, 0.15);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 16), s.material('#c8262c', { roughness: 0.4 }));
    bottle.castShadow = true;
    ext.add(bottle);
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), darkSteel); valve.position.y = 0.25; ext.add(valve);
    const vent = onWall(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.03), s.material('#c8ccd0')), 1.25, 2.3, 0.075);
    const ventMap = paint(128, 96, (g, w, h) => { g.fillStyle = '#c8ccd0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2d33'; for (let y = 10; y < h - 8; y += 12) g.fillRect(8, y, w - 16, 6); });
    const ventFace = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshStandardMaterial({ map: ventMap }));
    ventFace.position.z = 0.016; vent.add(ventFace);
    const ribbons: THREE.Group[] = [];
    for (let k = 0; k < 3; k++) {
      const pivot = new THREE.Group(); pivot.position.set(-0.1 + k * 0.1, -0.1, 0.02); vent.add(pivot);
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.3), new THREE.MeshStandardMaterial({ color: pick(['#f0f0ea', '#d8262c', '#2f6fb0']), side: THREE.DoubleSide, roughness: 0.8 }));
      ribbon.position.y = -0.15; pivot.add(ribbon);
      pivot.rotation.x = -1.0;
      ribbons.push(pivot);
    }

    // ---------------------------------------------------------------- comms panel with a headset on a coiled cord
    const commsMap = paint(320, 200, (g, w, h) => {
      g.fillStyle = '#0a0f16'; g.fillRect(0, 0, w, h);
      if (a.comms === 'call') {
        const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#3a4a5a'); bg.addColorStop(1, '#5a4a40'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.filter = 'blur(3px)';
        g.fillStyle = '#c89a78'; g.beginPath(); g.ellipse(w * 0.5, h * 0.42, 34, 42, 0, 0, 7); g.fill();
        g.fillStyle = pick(['#3a2a22', '#8a6a3a', '#1a1a1a']); g.beginPath(); g.ellipse(w * 0.5, h * 0.32, 38, 30, 0, Math.PI, 0); g.fill();
        g.fillStyle = pick(['#5a7a9a', '#a84a4a', '#4a6a4a']); g.beginPath(); g.ellipse(w * 0.5, h * 1.0, 90, 70, 0, Math.PI, 0); g.fill();
        g.filter = 'none';
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, random() * h, w, 2 + random() * 6); }
        g.fillStyle = '#ff3030'; g.beginPath(); g.arc(18, 18, 7, 0, 7); g.fill();
        g.fillStyle = '#ffffff'; g.font = 'bold 16px monospace'; g.fillText('LIVE', 30, 24); g.fillText(`00:${10 + Math.floor(random() * 40)}:${10 + Math.floor(random() * 49)}`, w - 100, 24);
      } else if (a.comms === 'message') {
        g.fillStyle = '#e8b830'; g.fillRect(0, 0, w, 30); g.fillStyle = '#0a0f16'; g.font = 'bold 16px monospace'; g.fillText('PRIORITY  ·  FROM GROUND', 10, 21);
        g.fillStyle = '#d8e0e8'; g.font = '13px monospace';
        const lines = ['Please call when you are', 'able. It is about your', 'family. We are so sorry.', '', 'Flight surgeon on loop', 'at 0400 GMT.'];
        lines.forEach((t, i) => g.fillText(t, 12, 54 + i * 22));
      } else if (a.comms === 'static') {
        const img = g.createImageData(w, h);
        for (let i = 0; i < img.data.length; i += 4) { const v = random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        g.fillStyle = 'rgba(10,10,10,0.75)'; g.fillRect(40, h / 2 - 26, w - 80, 52);
        g.fillStyle = '#ff9a30'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.fillText('SIGNAL LOST', w / 2, h / 2 + 8);
      } else {
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.4, 0); g.lineTo(w * 0.55, 0); g.lineTo(w * 0.15, h); g.fill();
      }
    });
    const comms = onWall(new THREE.Group(), 1.22, 1.6, 0.11);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.08), s.material('#2a2d33', { roughness: 0.5 }));
    box.castShadow = true;
    comms.add(box);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.35), new THREE.MeshStandardMaterial({ color: '#000000', map: commsMap, emissive: '#ffffff', emissiveMap: commsMap, emissiveIntensity: a.comms === 'off' ? 0.1 : 1.0, roughness: 0.2 }));
    screen.position.set(-0.03, 0.04, 0.041);
    comms.add(screen);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), s.material(['#3fa34a', '#e8b830', '#d8262c', '#c8ccd0'][k], { emissive: ['#3fa34a', '#e8b830', '#d8262c', '#000000'][k], emissiveIntensity: 0.6 })); b.position.set(-0.24 + k * 0.08, -0.2, 0.045); comms.add(b); }
    // the cord coils out and floats, the headset at its end
    const coil: V3[] = [];
    const start = new THREE.Vector3(0.36, -0.12, 0.05).applyMatrix4(comms.matrix.compose(comms.position, comms.quaternion, comms.scale));
    const end = new THREE.Vector3(1.75, 1.35, -1.2);
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, ang = t * Math.PI * 2 * 14;
      const p = start.clone().lerp(end, t);
      p.y += Math.sin(t * Math.PI) * 0.25;
      coil.push([p.x + Math.cos(ang) * 0.025, p.y + Math.sin(ang) * 0.025, p.z + Math.sin(ang + 1) * 0.02]);
    }
    s.tube(coil, 0.006, s.material('#1d1d1f'));
    const headset = add(new THREE.Group());
    headset.position.copy(end);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20, Math.PI), s.material('#1d1d1f'));
    headset.add(band);
    for (const sx of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), s.material('#2a2d33')); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.09, 0, 0); cup.castShadow = true; headset.add(cup); }
    headset.rotation.set(0.4, 0.8, 0.2);
    drift(headset, [0.03, 0.04, 0.03], [0.1, 0.25, 0.1]);

    // ---------------------------------------------------------------- what hangs on the wall over the couch
    const hangY = 2.36;
    const sheet = (w: number, h: number, x: number, y: number, map: THREE.Texture, tilt = 0) => {
      const m = onWall(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.7 })), x, y, 0.065);
      m.rotateZ(tilt);
      return m;
    };
    if (a.walls === 'photos') {
      for (let i = 0; i < 6; i++) {
        const x = -2.6 + i * 0.42 + (random() - 0.5) * 0.08, y = hangY + (random() - 0.5) * 0.25;
        const kind = Math.floor(random() * 4);
        const map = paint(96, 120, (g, w, h) => {
          g.fillStyle = '#f5f3ee'; g.fillRect(0, 0, w, h);
          const sky = ['#5aa8e8', '#f0a060', '#a8c0d8', '#7ac0e8'][kind]; g.fillStyle = sky; g.fillRect(5, 5, w - 10, h * 0.5);
          g.fillStyle = ['#ecd8a8', '#3a2a4a', '#f4f6f8', '#5aa04a'][kind]; g.fillRect(5, h * 0.55, w - 10, h * 0.45 - 16);
          for (let p = 0; p < 1 + Math.floor(random() * 3); p++) { const px = w * (0.3 + p * 0.22), ph = h * (0.45 - p * 0.06); g.fillStyle = pick(['#d8262c', '#2f6fd8', '#f2c21a', '#e86aa0']); g.beginPath(); g.roundRect(px - 8, h * 0.85 - ph * 0.7, 16, ph * 0.6, 5); g.fill(); g.fillStyle = pick(['#e8c4a0', '#9a6b4b', '#7a4f33']); g.beginPath(); g.arc(px, h * 0.85 - ph * 0.8, 7, 0, 7); g.fill(); }
        });
        sheet(0.16, 0.2, x, y, map, (random() - 0.5) * 0.15);
      }
      const drawing = paint(192, 144, (g, w, h) => {
        g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#2f6fd8'; g.lineWidth = 5; g.beginPath(); g.arc(w * 0.3, h * 0.55, 34, 0, 7); g.stroke();
        g.strokeStyle = '#3fa34a'; g.beginPath(); g.moveTo(w * 0.22, h * 0.45); g.lineTo(w * 0.32, h * 0.5); g.lineTo(w * 0.28, h * 0.65); g.stroke();
        g.fillStyle = '#d8262c'; g.font = 'bold 34px sans-serif'; g.fillText('♥', w * 0.6, h * 0.45);
        g.fillStyle = '#8a3fc2'; g.font = 'bold 18px sans-serif'; g.fillText('COME HOME', w * 0.42, h * 0.75); g.fillText('SOON', w * 0.55, h * 0.9);
      });
      sheet(0.42, 0.32, -0.15, hangY + 0.02, drawing, 0.05);
    }
    if (a.walls === 'charts') {
      const eye = paint(160, 224, (g, w, h) => {
        g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1d1f'; g.textAlign = 'center';
        ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D', 'E D F C Z P'].forEach((t, i) => { g.font = `bold ${Math.round(56 / (1 + i * 0.75))}px serif`; g.fillText(t, w / 2, 52 + i * 30 - (i > 0 ? 0 : 0)); });
        g.fillStyle = '#d8262c'; g.fillRect(14, h - 26, w - 28, 3);
      });
      sheet(0.32, 0.45, -2.3, hangY, eye);
      const body = paint(160, 224, (g, w, h) => {
        g.fillStyle = '#f4f8fa'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#d8e4ec'; g.beginPath(); g.arc(w / 2, 34, 18, 0, 7); g.fill(); g.beginPath(); g.roundRect(w / 2 - 26, 54, 52, 80, 14); g.fill();
        g.fillRect(w / 2 - 44, 58, 14, 70); g.fillRect(w / 2 + 30, 58, 14, 70); g.fillRect(w / 2 - 22, 134, 18, 76); g.fillRect(w / 2 + 4, 134, 18, 76);
        g.fillStyle = '#d8262c'; g.beginPath(); g.ellipse(w / 2 - 6, 80, 10, 12, 0.3, 0, 7); g.fill();
        g.fillStyle = '#e8a0a0'; g.beginPath(); g.ellipse(w / 2 + 10, 76, 10, 16, 0, 0, 7); g.fill();
        g.strokeStyle = '#2f6fb0'; g.lineWidth = 1.5; for (const [x, y] of [[w / 2 - 6, 80], [w / 2 + 10, 110], [w / 2, 34]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x < w / 2 ? 8 : w - 8, y); g.stroke(); }
      });
      sheet(0.32, 0.45, -1.7, hangY, body);
      const check = paint(200, 150, (g, w, h) => {
        g.fillStyle = '#f7f2d8'; g.fillRect(0, 0, w, h); g.fillStyle = M.accent; g.fillRect(0, 0, w, 24);
        g.fillStyle = '#ffffff'; g.font = 'bold 14px sans-serif'; g.fillText('RESTRAINT CHECKLIST', 8, 17);
        g.fillStyle = '#1d1d1f'; g.font = '11px sans-serif'; for (let i = 0; i < 7; i++) g.fillText(`${i + 1}. ${pick(['Secure torso strap', 'Check airway', 'Attach ECG leads', 'Log vitals', 'Call surgeon', 'Stow sharps', 'O2 at 2 L/min'])}`, 8, 42 + i * 15);
      });
      sheet(0.4, 0.3, -0.9, hangY, check, -0.03);
    }
    if (a.walls === 'patches') {
      for (let i = 0; i < 6; i++) {
        const map = paint(128, 128, (g, w, h) => {
          g.clearRect(0, 0, w, h);
          const field = pick(['#1f3a7a', '#7a1f2a', '#1d1d1f', '#2a6a4a', '#d8a028']);
          g.fillStyle = '#e8d8a0'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill();
          g.fillStyle = field; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 10, 0, 7); g.fill();
          g.fillStyle = '#ffffff'; for (let k = 0; k < 7; k++) g.fillRect(14 + random() * (w - 28), 14 + random() * (h - 28), 3, 3);
          g.strokeStyle = '#f0c040'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, h / 2 + 8, 40, 14, -0.3, 0, 7); g.stroke();
          g.fillStyle = '#5aa8e8'; g.beginPath(); g.arc(w / 2, h / 2 + 30, 22, Math.PI, 0); g.fill();
          g.fillStyle = '#ffffff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText(`EXP ${60 + Math.floor(random() * 30)}`, w / 2, 30);
        });
        const m = onWall(new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshStandardMaterial({ map, roughness: 0.9, transparent: true, alphaTest: 0.4 })), -2.6 + i * 0.38, hangY + (i % 2 ? 0.12 : -0.08), 0.065);
        void m;
      }
      const flag = paint(150, 96, (g, w, h) => { const cols = [pick(['#1f3a7a', '#d8262c', '#2a6a4a']), '#f4f4f0', pick(['#d8262c', '#1f3a7a', '#f0c040'])]; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * h) / 3, w, h / 3 + 1); }); g.fillStyle = '#f0c040'; g.beginPath(); g.arc(w * 0.25, h / 2, 12, 0, 7); g.fill(); });
      sheet(0.3, 0.19, -0.1, hangY + 0.05, flag, 0.02);
    }
    if (a.walls === 'plants') {
      const chamber = onWall(new THREE.Group(), -1.9, hangY, 0.2);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.28), s.material('#d8dcde'));
      shell.castShadow = true; chamber.add(shell);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.26), new THREE.MeshStandardMaterial({ color: '#d050ff', emissive: '#e040ff', emissiveIntensity: 1.4, transparent: true, opacity: 0.45, depthWrite: false }));
      glow.position.z = 0.142; chamber.add(glow);
      const leaves = s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#5ab84a', { roughness: 0.8, emissive: '#3a1050', emissiveIntensity: 0.4 }), Array.from({ length: 14 }, (_u, k) => ({ at: [-0.24 + (k % 7) * 0.08, -0.08 + Math.floor(k / 7) * 0.08 + random() * 0.03, 0.04 + random() * 0.05] as V3, size: 0.04 + random() * 0.02, color: pick(['#5ab84a', '#7ad05a', '#4a8a3a', '#8a3a5a']) })));
      chamber.add(leaves);
      const pouch = onWall(new THREE.Group(), -0.7, hangY, 0.12);
      const bag = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.26, 0.12, 3, 0.04), s.material('#e8e4d8')); pouch.add(bag);
      const flowers = s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff'), Array.from({ length: 5 }, () => ({ at: [(random() - 0.5) * 0.2, 0.16 + random() * 0.12, 0.05 + random() * 0.05] as V3, size: 0.035, color: pick(['#f07a1a', '#f0b020', '#e8483c']) })));
      pouch.add(flowers);
      for (let k = 0; k < 4; k++) { const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 5), s.material('#3a7a3a')); stem.position.set((random() - 0.5) * 0.15, 0.17, 0.06); pouch.add(stem); }
    }

    // ---------------------------------------------------------------- the LED strips and the cable tray along the top
    const ledColour = { night: '#cfe0ff', emergency: '#ff3428', full: '#ffffff' }[lightMode];
    const ledMat = new THREE.MeshStandardMaterial({ color: ledColour, emissive: ledColour, emissiveIntensity: { night: 0.7, emergency: 1.6, full: 1.8 }[lightMode] });
    onWall(new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.05, 0.03), ledMat), 0, 3.02, 0.075);
    if (a.module === 'sleek') onWall(new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.012, 0.01), new THREE.MeshStandardMaterial({ color: M.accent, emissive: M.accent, emissiveIntensity: 1.2 })), 0, 0.95, 0.065);
    s.tube([wallPoint(-HALF, 2.62, 0.1), wallPoint(-1, 2.6, 0.12), wallPoint(1, 2.66, 0.1), wallPoint(HALF, 2.62, 0.12)], 0.035, s.material(pick(['#2a2d33', '#d8a028', '#f0f0ea'])));

    // ---------------------------------------------------------------- what drifts, by what happened here
    const spot = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): V3 => [mix(x0, x1, random()), mix(y0, y1, random()), mix(z0, z1, random())];
    const floatAbove = () => spot(-2.6, 2.6, 2.0, 2.6, -1.5, 0.6);
    const floatCouch = () => spot(-2.5, -1.0, 0.95, 1.35, -1.6, -0.9);
    const pen = (at: V3, colour = pick(['#1d1d1f', '#2f6fd8', '#d8262c'])) => { const p = s.cylinder(0.008, 0.008, 0.14, at, s.material(colour), 8); p.rotation.set(random() * 3, random() * 3, random() * 3); return drift(p); };
    if (a.state === 'tidy') {
      const at: V3 = [0.95, 2.05, -1.55];
      pen(at);
      s.rod(wallPoint(0.95, 2.3, 0.08), at, 0.002, s.material('#e8e0c8'));
    }
    if (a.state === 'used') {
      const pouch = s.mesh(new RoundedBoxGeometry(0.1, 0.16, 0.03, 2, 0.012), s.material('#c8d8e8', { roughness: 0.4 }), floatAbove());
      s.cylinder(0.005, 0.005, 0.08, [pouch.position.x, pouch.position.y + 0.11, pouch.position.z], s.material('#f4f4f0'), 6);
      drift(pouch);
      const tablet = s.box([0.24, 0.17, 0.012], floatAbove(), s.material('#1d1f24', { roughness: 0.4 }));
      tablet.rotation.set(0.6, 0.3, 0.2); drift(tablet, [0.05, 0.04, 0.05], [0.05, 0.12, 0.04]);
      drift(s.ball([0.035, 0.03, 0.035], floatCouch(), s.material('#f4f4f0', { roughness: 1 }), 8));
      pen(floatAbove());
    }
    if (a.state === 'emergency') {
      for (let i = 0; i < 9; i++) {
        const w = s.box([0.07 + random() * 0.08, 0.004, 0.05 + random() * 0.06], random() < 0.5 ? floatAbove() : floatCouch(), s.material(pick(['#f4f4f0', '#c8dcf0', '#e8e8e0', '#f0d0c0'])));
        w.rotation.set(random() * 3, random() * 3, random() * 3); drift(w, [0.06, 0.06, 0.06], [0.4, 0.6, 0.3]);
      }
      for (let i = 0; i < 2; i++) { const glove = s.ball([0.05, 0.02, 0.09], floatCouch(), s.material('#4a7ad8', { roughness: 0.5 }), 10); glove.rotation.set(random() * 3, random() * 3, 0); drift(glove, [0.04, 0.05, 0.04], [0.3, 0.4, 0.2]); }
      const gauze = s.cylinder(0.035, 0.035, 0.06, floatAbove(), s.material('#f8f8f4', { roughness: 1 }), 12); drift(gauze, [0.05, 0.05, 0.05], [0.5, 0.3, 0.4]);
      // an IV bag clipped to the upper rail, its line wandering down to the couch
      const bagAt = wallPoint(-1.5, 2.6, 0.2);
      const ivBag = s.mesh(new RoundedBoxGeometry(0.14, 0.22, 0.04, 2, 0.02), new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.6, roughness: 0.2 }), bagAt);
      void ivBag;
      s.tube([[bagAt[0], bagAt[1] - 0.12, bagAt[2]], [-1.4, 1.9, -1.0], [-1.7, 1.3, -0.9], [-1.9, CTop + 0.1, CZ + 0.1]], 0.005, new THREE.MeshStandardMaterial({ color: '#f0f8ff', transparent: true, opacity: 0.7, roughness: 0.2 }));
      // a defibrillator left open on the deck
      s.box([0.32, 0.12, 0.26], [-0.35, 0.06, -1.25], s.material('#f07a1a', { roughness: 0.5 }));
      const lid = s.box([0.32, 0.02, 0.26], [-0.35, 0.2, -1.42], s.material('#f07a1a'));
      lid.rotation.x = -1.2;
      s.tube([[-0.3, 0.12, -1.2], [-0.5, 0.5, -0.9], [-0.9, 0.8, -1.0], [-1.3, 0.75, -1.2]], 0.006, s.material('#d8262c'));
    }
    if (a.state === 'longstay') {
      // a sleeping bag tethered to the bulkhead, hood at the top
      const bagGroup = add(new THREE.Group());
      bagGroup.position.set(-HALF + 0.14, 0, -1.7);
      const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.3, 6, 14), s.material(pick(['#2f4f8a', '#3a6a4a', '#8a3a2a']), { roughness: 0.9 }));
      sb.position.y = 1.2; sb.scale.set(0.55, 1, 1); sb.castShadow = true;
      bagGroup.add(sb);
      const hood = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), s.material('#1d1d1f'));
      hood.position.set(0.06, 1.75, 0); hood.rotation.y = Math.PI / 2; bagGroup.add(hood);
      for (const y of [0.75, 1.5]) { const tether = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.5), s.material('#d8a028')); tether.position.set(0.02, y, 0); bagGroup.add(tether); }
      const book = s.box([0.16, 0.22, 0.03], floatAbove(), s.material(pick(['#8a2a26', '#1f3a7a', '#2a6a4a']))); book.rotation.set(0.4, 0.6, 0.3); drift(book, [0.04, 0.04, 0.04], [0.1, 0.15, 0.1]);
      const phones = s.ring(0.08, 0.012, floatAbove(), s.material('#1d1d1f'), Math.PI); drift(phones, [0.04, 0.05, 0.04], [0.2, 0.3, 0.1]);
      const bear = s.ball([0.07, 0.08, 0.06], floatCouch(), s.material('#b07a4a', { roughness: 1 }), 12); drift(bear, [0.03, 0.04, 0.03], [0.1, 0.2, 0.1]);
      pen(floatAbove());
    }
    for (let i = 0; i < Math.round(mood.density * 4); i++) { const bit = s.box([0.03 + random() * 0.04, 0.01, 0.03], floatAbove(), s.material(pick(['#f0f0ea', '#d8262c', '#2f6fd8', '#f2c21a']))); bit.rotation.set(random() * 3, random() * 3, random() * 3); drift(bit, [0.05, 0.05, 0.05], [0.5, 0.6, 0.4]); }

    // ---------------------------------------------------------------- the view beyond the cutaway
    // calm space: a mid-tone gradient, fine stars, the glow of whatever lies below
    const tones = { earth: ['#1a2a4a', '#4a6a9a', '#9ac4f0'], night: ['#121a2e', '#26324a', '#3a9a70'], moon: ['#16181e', '#3a3c44', '#9a9a96'], mars: ['#1a1416', '#4a2e2a', '#d08a5a'], stars: ['#141830', '#2c2c50', '#6a6aa0'], shutter: ['#1a2a4a', '#4a6a9a', '#9ac4f0'] }[outside];
    const backMap = paint(1024, 1024, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, tones[0]); grad.addColorStop(0.7, tones[1]); grad.addColorStop(1, tones[2]);
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + random() * 0.6})`; g.fillRect(random() * w, random() * h * 0.85, random() < 0.08 ? 2 : 1, random() < 0.08 ? 2 : 1); }
      if (outside === 'stars') for (let i = 0; i < 30; i++) { const x = (i / 30) * w, y = h * (0.6 - (i / 30) * 0.4), r = 60 + random() * 80; const c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, 'rgba(210,210,255,0.12)'); c.addColorStop(1, 'rgba(210,210,255,0)'); g.fillStyle = c; g.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    const backdrop = add(new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.MeshBasicMaterial({ map: backMap })));
    backdrop.position.set(0, -3, -12);
    world.background.set(tones[1]);
    backdrop.castShadow = backdrop.receiveShadow = false;

    // ---------------------------------------------------------------- motion: drift, streamers, a beacon, a hum
    const speed = 0.35 + energy * 1.2;
    world.update = (dt, time) => {
      for (const fl of floaters) {
        const t = time * fl.w * speed + fl.ph;
        fl.o.position.set(fl.base.x + Math.sin(t) * fl.amp.x, fl.base.y + Math.sin(t * 0.83 + 1) * fl.amp.y, fl.base.z + Math.cos(t * 0.71) * fl.amp.z);
        fl.o.rotation.x += fl.spin.x * dt * speed; fl.o.rotation.y += fl.spin.y * dt * speed; fl.o.rotation.z += fl.spin.z * dt * speed;
      }
      ribbons.forEach((r, k) => { r.rotation.x = -1.0 - 0.25 * Math.sin(time * (5 + k) * (0.4 + energy) + k) ; r.rotation.z = 0.1 * Math.sin(time * 3.1 + k * 2); });
      if (lightMode === 'emergency') {
        const pulse = 0.5 + 0.5 * Math.sin(time * (3 + energy * 4));
        beaconMat.emissiveIntensity = 0.6 + pulse * 2.2;
        if (beaconLight) beaconLight.intensity = 2 + pulse * 6;
        ledMat.emissiveIntensity = 1.1 + pulse * 0.6;
      }
      if (a.comms === 'static') commsMap.offset.y = (Math.floor(time * 12) % 7) * 0.13;
    };
    commsMap.wrapT = THREE.RepeatWrapping;
    return world;
  },
});
