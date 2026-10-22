import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Style =
  | 'hightop' | 'cap' | 'bald' | 'part' | 'gumby' | 'design' | 'waves' | 'pomp' | 'flattop' | 'sidepart' | 'slick'
  | 'afro' | 'curls' | 'shag' | 'feather' | 'mullet' | 'punch' | 'sports' | 'bowl' | 'locs' | 'mohawk';

const SETS = {
  fades: 'Early 1990s fades: high-tops, box cuts, shaved parts and lightning-bolt designs on a loud teal and yellow sheet.',
  pompadours: '1950s cuts: pompadours, flat-tops, side parts and slick-backs on a cream sheet with red rules.',
  westafrican: 'A hand-painted West African barber sign: bold outlined heads on flat yellow, cuts with names like a signwriter’s boast.',
  perms: '1970s styles: round afros, curly perms, shags and feathered wings on browns and oranges.',
  showa: 'A Japanese neighbourhood tokoya menu: neat side parts, sports cuts, punch perms and bowl cuts on pale blue.',
} as const;
const SHEETS: Record<keyof typeof SETS, { title: string; paper: string; panel: string[]; ink: string; skins: string[]; hair: string[]; styles: Style[]; outline: boolean }> = {
  fades: { title: 'FRESH CUTS', paper: '#12a3a0', panel: ['#f2c81e', '#f06a3c', '#f4efe2'], ink: '#191320', skins: ['#5d3a26', '#7a4b30', '#8f5c3c', '#a8714a'], hair: ['#15110f'], styles: ['hightop', 'gumby', 'part', 'design', 'cap', 'waves', 'bald', 'hightop', 'mohawk', 'locs', 'design', 'part'], outline: false },
  pompadours: { title: 'MODERN STYLES', paper: '#efe3c2', panel: ['#f7f0da', '#f1e2c0'], ink: '#8c1c22', skins: ['#e6b98f', '#d9a57c', '#c98f62', '#f0c9a2'], hair: ['#2a1a12', '#5a3a1e', '#111', '#b08a4a'], styles: ['pomp', 'flattop', 'sidepart', 'slick', 'pomp', 'sports', 'sidepart', 'flattop', 'slick', 'pomp', 'bald', 'sidepart'], outline: false },
  westafrican: { title: 'BARBING SALOON', paper: '#f2c230', panel: ['#f2c230', '#f7d75a'], ink: '#1a1a1a', skins: ['#4a2c1c', '#5d3a26', '#6b4226'], hair: ['#0f0d0c'], styles: ['hightop', 'gumby', 'design', 'afro', 'part', 'waves', 'mohawk', 'bald', 'cap', 'locs', 'hightop', 'design'], outline: true },
  perms: { title: 'UNISEX STYLES', paper: '#a85a24', panel: ['#e89a3c', '#d9c08a', '#8a4a22'], ink: '#2a160c', skins: ['#5d3a26', '#c98f62', '#8f5c3c', '#e0b48c'], hair: ['#15110f', '#4a2a16', '#8a5a2a', '#c9a060'], styles: ['afro', 'curls', 'shag', 'feather', 'afro', 'mullet', 'curls', 'afro', 'shag', 'feather', 'curls', 'mullet'], outline: false },
  showa: { title: 'CUT MENU', paper: '#cfe3ea', panel: ['#eef5f6', '#e2eef2'], ink: '#1f3a6a', skins: ['#eac9a4', '#e0b890', '#f0d2b0'], hair: ['#121212', '#1e1a18'], styles: ['sidepart', 'sports', 'punch', 'bowl', 'pomp', 'sidepart', 'slick', 'sports', 'punch', 'bowl', 'flattop', 'sidepart'], outline: false },
};
const NAMES = ['BOEING', 'CONCORDE', 'LUDO', 'SPORTY', 'OBAMA', 'SKIN', 'WAVES', 'PUNK', 'LAGOS', 'BIG BOY', 'UP', 'ZIGZAG'];

function paintHead(c: Ctx, x: number, y: number, r: number, skin: string, hair: string, style: Style, shirt: string, outline: boolean, random: () => number) {
  const stroke = () => { if (outline) { c.lineWidth = Math.max(2, r * 0.09); c.strokeStyle = '#111'; c.stroke(); } };
  const blob = (pts: [number, number][]) => { c.beginPath(); c.moveTo(x + pts[0][0] * r, y + pts[0][1] * r); for (const p of pts.slice(1)) c.lineTo(x + p[0] * r, y + p[1] * r); c.closePath(); };
  const disc = (dx: number, dy: number, rr: number) => { c.beginPath(); c.arc(x + dx * r, y + dy * r, rr * r, 0, 6.3); };
  const ell = (dx: number, dy: number, rx: number, ry: number, from = 0, to = 6.3) => { c.beginPath(); c.ellipse(x + dx * r, y + dy * r, rx * r, ry * r, 0, from, to); };
  c.fillStyle = hair;
  // Hair that falls behind the face.
  if (style === 'afro') { disc(0, -0.35, 1.5); c.fill(); stroke(); }
  if (style === 'curls') { for (let i = 0; i < 16; i++) { const t = Math.PI + (i / 15) * Math.PI * 1.5 - Math.PI * 0.25; disc(Math.cos(t) * 1.02, -0.2 + Math.sin(t) * 1.05, 0.34); c.fill(); } }
  if (style === 'shag') { blob([[-1.15, -0.7], [-0.6, -1.3], [0.6, -1.3], [1.15, -0.7], [1.25, 0.9], [0.8, 1.25], [0.75, 0], [-0.75, 0], [-0.8, 1.25], [-1.25, 0.9]]); c.fill(); stroke(); }
  if (style === 'mullet') { blob([[-0.95, -0.6], [-0.5, -1.15], [0.5, -1.15], [0.95, -0.6], [1.2, 1.5], [0.5, 1.2], [-0.5, 1.2], [-1.2, 1.5]]); c.fill(); stroke(); }
  if (style === 'feather') { blob([[-1.0, -0.8], [0, -1.35], [1.0, -0.8], [1.7, -0.1], [1.2, 0.5], [0.9, -0.1], [-0.9, -0.1], [-1.2, 0.5], [-1.7, -0.1]]); c.fill(); stroke(); }
  if (style === 'locs') { for (let i = 0; i < 9; i++) { c.lineWidth = r * 0.2; c.strokeStyle = hair; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + (i - 4) * r * 0.22, y - r * 0.9); c.lineTo(x + (i - 4) * r * 0.33, y + r * (0.5 + random() * 0.5) * (Math.abs(i - 4) > 1 ? 1 : -0.2)); c.stroke(); } }
  // Shoulders, neck, ears, face.
  c.fillStyle = shirt; ell(0, 2.05, 1.5, 0.9, Math.PI, 0); c.fill(); stroke();
  c.fillStyle = skin; c.fillRect(x - r * 0.36, y + r * 0.6, r * 0.72, r * 0.75);
  ell(-0.92, 0.05, 0.16, 0.26); c.fill(); ell(0.92, 0.05, 0.16, 0.26); c.fill();
  ell(0, 0, 0.9, 1.12); c.fill(); stroke();
  // Features, kept to a signwriter's minimum.
  c.fillStyle = '#16100d';
  for (const side of [-1, 1]) { ell(side * 0.36, -0.05, 0.11, 0.08); c.fill(); c.fillRect(x + side * 0.36 * r - r * 0.2, y - r * 0.3, r * 0.4, r * 0.08); }
  c.fillRect(x - r * 0.05, y + r * 0.08, r * 0.1, r * 0.3);
  c.fillStyle = '#7a2a22'; c.fillRect(x - r * 0.26, y + r * 0.6, r * 0.52, r * 0.1);
  // Hair on top.
  c.fillStyle = hair;
  const cap = (h: number, w = 0.93) => { blob([[-w, -0.25], [-w, -0.6], [-0.6, -h], [0.6, -h], [w, -0.6], [w, -0.25], [0.7, -0.62], [-0.7, -0.62]]); c.fill(); stroke(); };
  switch (style) {
    case 'hightop': blob([[-0.92, -0.3], [-0.98, -2.0], [0.98, -2.0], [0.92, -0.3], [0.7, -0.66], [-0.7, -0.66]]); c.fill(); stroke(); break;
    case 'gumby': blob([[-0.92, -0.3], [-0.98, -1.2], [0.98, -2.1], [0.92, -0.3], [0.7, -0.66], [-0.7, -0.66]]); c.fill(); stroke(); break;
    case 'flattop': blob([[-0.94, -0.3], [-1.0, -1.32], [1.0, -1.32], [0.94, -0.3], [0.7, -0.66], [-0.7, -0.66]]); c.fill(); stroke(); break;
    case 'cap': case 'sports': cap(1.14); break;
    case 'part': cap(1.2); c.strokeStyle = skin; c.lineWidth = r * 0.09; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.6); c.lineTo(x - r * 0.75, y - r * 1.12); c.stroke(); break;
    case 'design': cap(1.2); c.strokeStyle = skin; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(x + r * 0.95, y - r * 0.35); c.lineTo(x + r * 0.7, y - r * 0.75); c.lineTo(x + r * 0.9, y - r * 0.8); c.lineTo(x + r * 0.55, y - r * 1.1); c.stroke(); break;
    case 'waves': cap(1.18); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = r * 0.05; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x, y - r * 0.4, r * (0.45 + i * 0.2), Math.PI * 1.15, Math.PI * 1.85); c.stroke(); } break;
    case 'bald': c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = r * 0.1; c.beginPath(); c.arc(x, y - r * 0.2, r * 0.7, Math.PI * 1.2, Math.PI * 1.5); c.stroke(); break;
    case 'pomp': blob([[-0.95, -0.25], [-0.98, -0.8], [-0.5, -1.25], [0.3, -1.7], [1.05, -1.5], [1.15, -0.95], [0.9, -0.5], [0.92, -0.25], [0.7, -0.62], [-0.7, -0.62]]); c.fill(); stroke(); break;
    case 'sidepart': blob([[-0.95, -0.25], [-0.98, -0.8], [-0.5, -1.22], [0.6, -1.3], [1.0, -0.9], [0.95, -0.25], [0.7, -0.55], [-0.35, -0.78], [-0.75, -0.55]]); c.fill(); stroke(); break;
    case 'slick': cap(1.22, 0.95); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = r * 0.04; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * r * 0.22, y - r * 0.66); c.lineTo(x + i * r * 0.28, y - r * 1.15); c.stroke(); } break;
    case 'afro': ell(0, -0.75, 0.86, 0.42, Math.PI, 0); c.fill(); break;
    case 'curls': case 'punch': for (let i = 0; i < 26; i++) { const t = Math.PI + random() * Math.PI, rr = 0.55 + random() * 0.5; disc(Math.cos(t) * rr * 0.95, -0.35 + Math.sin(t) * rr * 0.85, style === 'punch' ? 0.13 : 0.2); c.fill(); } break;
    case 'shag': case 'bowl': blob([[-0.95, -0.2], [-0.98, -0.8], [-0.5, -1.22], [0.5, -1.22], [0.98, -0.8], [0.95, -0.2], [0.72, -0.38], [-0.72, -0.38]]); c.fill(); stroke(); break;
    case 'feather': case 'mullet': blob([[-0.92, -0.3], [-0.6, -1.15], [0.6, -1.15], [0.92, -0.3], [0.5, -0.7], [0, -0.55], [-0.5, -0.7]]); c.fill(); stroke(); break;
    case 'mohawk': blob([[-0.28, -0.6], [-0.34, -1.9], [0.34, -1.9], [0.28, -0.6]]); c.fill(); stroke(); break;
    case 'locs': cap(1.2); break;
  }
  if (style === 'sports') { c.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 30; i++) c.fillRect(x + (random() - 0.5) * r * 1.4, y - r * (0.7 + random() * 0.4), r * 0.05, r * 0.05); }
}

export default defineThing({
  questions: {
    styles: choice('What era and place are the haircuts from?', SETS),
    mount: choice('How is the chart displayed?', {
      wall: 'Taped or framed on a slice of shop wall at eye level.',
      aframe: 'Painted on a wooden A-frame sandwich board out on the pavement.',
      propped: 'A sheet of plywood leaned back on a strut with a brick at its foot.',
      window: 'Taped inside a shop window, facing the street through the glass.',
    }),
    count: choice('How many portraits are on it?', {
      six: 'Six large heads, two rows of three.',
      nine: 'Nine heads in a square grid.',
      twelve: 'Twelve heads, four rows of three.',
      twenty: 'Twenty small heads, a crowded catalogue.',
    }),
    sun: choice('How has the sun got at it?', {
      even: 'Bleached evenly all over, the reds gone first.',
      band: 'A diagonal band of window light has bleached a stripe across it.',
      ghost: 'Faded everywhere except a fresh rectangle where another notice was pinned over it.',
      spared: 'Barely touched: it hangs in the shade.',
    }),
    marked: choice('Has anyone marked it?', {
      none: 'No marks.',
      circled: 'One portrait is circled in thick red marker.',
      crossed: 'One portrait is crossed out: they do not do that one any more.',
      starred: 'A gold star sticker and SPECIAL beside one of them.',
      number: 'A phone number scrawled in marker across the bottom.',
    }),
    prices: choice('Is there a price strip under the portraits?', {
      none: 'No prices.',
      cheap: 'Old low prices, never updated.',
      amended: 'Prices crossed out and rewritten higher in pen.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sheet = SHEETS[a.styles];
    const [cols, rows] = { six: [3, 2], nine: [3, 3], twelve: [3, 4], twenty: [4, 5] }[a.count];
    const CW = 600, CH = 800;
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const c = canvas.getContext('2d')!;
    c.fillStyle = sheet.paper; c.fillRect(0, 0, CW, CH);
    c.fillStyle = sheet.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 62px monospace';
    if (a.styles === 'fades') { c.fillStyle = '#f2c81e'; c.fillText(sheet.title, CW / 2 + 4, 58, CW - 50); c.fillStyle = sheet.ink; }
    c.fillText(sheet.title, CW / 2, 54, CW - 50);
    c.fillRect(30, 96, CW - 60, 6);
    const footer = a.prices === 'none' ? 30 : 104;
    const gx = 30, gy = 116, gw = CW - 60, gh = CH - gy - footer;
    const cw = gw / cols, ch = gh / rows;
    const pick = Math.floor(random() * cols * rows);
    const SHIRTS = ['#f4efe2', '#2b4a8c', '#b3232a', '#2f7a4a', '#333', '#e08a1e'];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const i = row * cols + col, x0 = gx + col * cw, y0 = gy + row * ch;
      c.fillStyle = sheet.panel[(row + col) % sheet.panel.length];
      c.fillRect(x0 + 5, y0 + 5, cw - 10, ch - 10);
      if (sheet.outline) { c.lineWidth = 4; c.strokeStyle = '#b3232a'; c.strokeRect(x0 + 5, y0 + 5, cw - 10, ch - 10); }
      const r = Math.min(cw * 0.2, ch * 0.2);
      const style = sheet.styles[(i + Math.floor(context.seed % 5)) % sheet.styles.length];
      paintHead(c, x0 + cw / 2, y0 + ch * 0.52, r, sheet.skins[Math.floor(random() * sheet.skins.length)], sheet.hair[Math.floor(random() * sheet.hair.length)], style, SHIRTS[Math.floor(random() * SHIRTS.length)], sheet.outline, random);
      // Number roundel, and a painted name on the signwriter's board.
      c.fillStyle = sheet.ink; c.beginPath(); c.arc(x0 + 24 + cw * 0.04, y0 + 26 + ch * 0.03, Math.min(20, cw * 0.13), 0, 6.3); c.fill();
      c.fillStyle = '#fff'; c.font = `bold ${Math.min(24, cw * 0.16)}px monospace`; c.fillText(String(i + 1), x0 + 24 + cw * 0.04, y0 + 27 + ch * 0.03);
      if (a.styles === 'westafrican' && rows < 5) { c.fillStyle = '#b3232a'; c.font = `bold ${Math.min(22, cw * 0.13)}px monospace`; c.fillText(NAMES[i % NAMES.length], x0 + cw / 2, y0 + ch - 18, cw - 16); }
      if (i === pick) {
        const px = x0 + cw / 2, py = y0 + ch * 0.48;
        if (a.marked === 'circled') {
          c.strokeStyle = '#d21f2a'; c.lineWidth = 9; c.lineCap = 'round';
          c.beginPath(); c.ellipse(px, py, cw * 0.44, ch * 0.43, -0.12, 0.3, 6.9); c.stroke();
        } else if (a.marked === 'crossed') {
          c.strokeStyle = '#151515'; c.lineWidth = 11; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x0 + 14, y0 + 14); c.lineTo(x0 + cw - 14, y0 + ch - 14); c.moveTo(x0 + cw - 16, y0 + 12); c.lineTo(x0 + 12, y0 + ch - 16); c.stroke();
        } else if (a.marked === 'starred') {
          c.fillStyle = '#f0b81e'; c.beginPath();
          for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283 - 1.57, rr = k % 2 ? 11 : 26; c.lineTo(x0 + cw - 34 + Math.cos(t) * rr, y0 + 36 + Math.sin(t) * rr); }
          c.fill();
          c.fillStyle = '#d21f2a'; c.font = 'bold 20px monospace'; c.fillText('SPECIAL', px, y0 + ch - 20, cw - 14);
        }
      }
    }
    if (a.prices !== 'none') {
      c.fillStyle = sheet.ink; c.fillRect(30, CH - footer + 6, CW - 60, 5);
      c.font = 'bold 30px monospace'; c.textAlign = 'left';
      const items: [string, string, string][] = [['CUT', '3.00', '18'], ['SHAVE', '1.50', '12'], ['KIDS', '2.00', '10']];
      items.forEach(([name, old, now], i) => {
        const x = 40 + i * 180, y = CH - footer + 44;
        c.fillStyle = sheet.ink; c.font = 'bold 26px monospace'; c.fillText(name, x, y);
        c.fillText(old, x, y + 32);
        if (a.prices === 'amended') { c.strokeStyle = '#1b3fa8'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 4, y + 34); c.lineTo(x + 70, y + 28); c.stroke(); c.fillStyle = '#1b3fa8'; c.font = 'bold 32px monospace'; c.fillText(now, x + 86, y + 28); }
      });
      c.textAlign = 'center';
    }
    if (a.marked === 'number') {
      c.save(); c.translate(CW / 2, CH - footer - 26); c.rotate(-0.07);
      c.fillStyle = '#151515'; c.font = 'bold 44px monospace'; c.fillText('CALL 555 0' + (100 + Math.floor(random() * 899)), 0, 0, CW - 80);
      c.restore();
    }

    // Sun: push the pigments toward a pale blue-grey, by region.
    const strength = a.sun === 'spared' ? mood.wear * 0.2 : mix(0.22, 0.62, mood.wear);
    const image = c.getImageData(0, 0, CW, CH), d = image.data;
    const gx0 = 150 + random() * 200, gy0 = 180 + random() * 250, gw0 = 170, gh0 = 220;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      let f = strength;
      if (a.sun === 'band') { const t = (x + y * 0.7) / CW; f = strength * 0.35 + strength * 0.75 * Math.max(0, 1 - Math.abs(t - 0.95) * 3.2); }
      if (a.sun === 'ghost' && x > gx0 && x < gx0 + gw0 && y > gy0 && y < gy0 + gh0) f = 0.03;
      const i = (y * CW + x) * 4;
      d[i] += (226 - d[i]) * f * 0.92; d[i + 1] += (224 - d[i + 1]) * f * 0.78; d[i + 2] += (222 - d[i + 2]) * f * 0.55;
    }
    c.putImageData(image, 0, 0);
    if (a.sun === 'ghost') for (const [px, py] of [[gx0 + 10, gy0 + 8], [gx0 + gw0 - 10, gy0 + 8]]) { c.fillStyle = '#3a3a3a'; c.beginPath(); c.arc(px, py, 3, 0, 6.3); c.fill(); }
    for (let i = 0; i < mood.wear * 14; i++) { c.fillStyle = `rgba(90,70,40,${0.06 + random() * 0.1})`; c.beginPath(); c.ellipse(random() * CW, random() * CH, 10 + random() * 40, 8 + random() * 26, random() * 3, 0, 6.3); c.fill(); }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;

    // The sheet itself, with one corner curling off as it ages.
    const paperMat = new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
    const sheetMesh = (w: number, h: number, curl: number) => {
      const geo = new THREE.PlaneGeometry(w, h, 12, 16);
      const p = geo.attributes.position as THREE.BufferAttribute;
      const cx = random() < 0.5 ? -1 : 1, cy = random() < 0.6 ? 1 : -1;
      for (let i = 0; i < p.count; i++) {
        const dx = (p.getX(i) * cx + w / 2) / w, dy = (p.getY(i) * cy + h / 2) / h;
        const k = Math.max(0, dx + dy - (2 - curl * 0.7));
        p.setZ(i, k * k * w * 1.6 + Math.sin(p.getY(i) * 9) * 0.002);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, paperMat);
      mesh.castShadow = true;
      return mesh;
    };
    const tapeMat = s.material('#e9dfb4', { roughness: 0.6, transparent: true, opacity: 0.85 });
    const wood = s.material('#a9814e', { roughness: 0.8 });
    const darkWood = s.material('#6a4a2c', { roughness: 0.8 });
    const curl = Math.max(0, mood.wear - 0.25) * 0.75;

    if (a.mount === 'wall' || a.mount === 'window') {
      const W = a.mount === 'window' ? 0.98 : 1.12, pw = 0.78, ph = 1.04, py = 1.42;
      if (a.mount === 'wall') {
        const tints: Record<keyof typeof SETS, string> = { fades: '#d9d2c2', pompadours: '#9fb9a4', westafrican: '#3f8ac0', perms: '#c9a56a', showa: '#e6dfcf' };
        s.box([W, 2.15, 0.1], [0, 1.075, -0.05], s.material(tints[a.styles], { roughness: 0.9 }));
        s.box([W, 0.9, 0.012], [0, 0.45, 0.004], s.material(a.styles === 'westafrican' ? '#1f5f9a' : '#7b6a55', { roughness: 0.7 }));
        s.box([W, 0.04, 0.03], [0, 0.92, 0.012], darkWood);
        s.box([W + 0.02, 0.1, 0.03], [0, 0.05, 0.012], darkWood);
        const framed = a.styles === 'pompadours' || a.styles === 'showa';
        const paper = sheetMesh(pw, ph, framed ? 0 : curl);
        paper.position.set(0, py, framed ? 0.022 : 0.006);
        paper.rotation.z = (random() - 0.5) * mix(0.02, 0.12, mood.wear);
        s.root.add(paper);
        if (framed) {
          const f = s.material('#2a2320', { roughness: 0.5 });
          for (const sx of [-1, 1]) s.box([0.035, ph + 0.07, 0.035], [sx * (pw / 2 + 0.017), py, 0.018], f).rotation.z = paper.rotation.z;
          for (const sy of [-1, 1]) s.box([pw + 0.07, 0.035, 0.035], [0, py + sy * (ph / 2 + 0.017), 0.018], f).rotation.z = paper.rotation.z;
        } else for (const [tx, ty] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
          if (random() < mood.wear * 0.5) continue;
          s.box([0.09, 0.035, 0.002], [tx * (pw / 2 - 0.01), py + ty * (ph / 2 - 0.01), 0.011], tapeMat).rotation.z = tx * ty * -0.7 + paper.rotation.z;
        }
      } else {
        const frame = s.material(a.styles === 'westafrican' ? '#1f5f9a' : '#3a4a44', { roughness: 0.6 });
        s.box([W + 0.1, 0.62, 0.16], [0, 0.31, -0.04], s.material('#b9ad98', { roughness: 0.9 }));
        s.box([W + 0.16, 0.05, 0.22], [0, 0.645, -0.02], frame);
        for (const sx of [-1, 1]) s.box([0.06, 1.3, 0.08], [sx * (W / 2 + 0.02), 1.3, -0.04], frame);
        s.box([W + 0.1, 0.07, 0.08], [0, 1.97, -0.04], frame);
        const pane = s.box([W, 1.28, 0.008], [0, 1.3, -0.035], new THREE.MeshStandardMaterial({ color: '#dff0f2', transparent: true, opacity: 0.1, roughness: 0.05, depthWrite: false }));
        pane.castShadow = false;
        for (const [x, w] of [[-0.3, 0.07], [-0.16, 0.02], [0.36, 0.04]] as const) {
          const glint = s.box([w, 1.6, 0.002], [x, 1.3, -0.029], new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false }));
          glint.rotation.z = -0.3; glint.scale.y = 0.7; glint.castShadow = false;
        }
        const paper = sheetMesh(pw, ph, curl * 0.6);
        paper.position.set((random() - 0.5) * 0.12, 1.3, -0.045);
        paper.rotation.z = (random() - 0.5) * mix(0.02, 0.14, mood.wear);
        s.root.add(paper);
        for (const [tx, ty] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) s.box([0.08, 0.03, 0.002], [paper.position.x + tx * (pw / 2 - 0.01), 1.3 + ty * (ph / 2 - 0.01), -0.04], tapeMat).rotation.z = tx * ty * -0.7;
      }
    } else if (a.mount === 'aframe') {
      const pw = 0.62, ph = 0.83, lean = 0.2, H = 1.08;
      for (const side of [1, -1]) {
        const leaf = new THREE.Group();
        const add = (m: THREE.Object3D) => { leaf.add(m); return m; };
        add(s.box([pw + 0.1, H, 0.025], [0, -H / 2, 0], wood));
        for (const sx of [-1, 1]) add(s.box([0.05, H + 0.1, 0.035], [sx * (pw / 2 + 0.05), -H / 2 - 0.05, 0], darkWood));
        if (side === 1) { const paper = sheetMesh(pw, ph, curl * 0.5); paper.position.set(0, -ph / 2 - 0.08, 0.015); leaf.add(paper); }
        leaf.position.set(0, H * Math.cos(lean) + 0.1, 0);
        leaf.rotation.x = -side * lean;
        if (side === -1) leaf.rotation.y = 0;
        s.root.add(leaf);
      }
      s.cylinder(0.012, 0.012, pw + 0.16, [0, H * Math.cos(lean) + 0.1, 0], s.material('#3a3a3a', { metalness: 0.6 }), 8).rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) s.rod([sx * (pw / 2 + 0.05), 0.45, 0.13], [sx * (pw / 2 + 0.05), 0.45, -0.13], 0.004, s.material('#3a3a3a', { metalness: 0.6 }));
    } else {
      const pw = 0.8, ph = 1.07, lean = 0.2;
      const board = new THREE.Group();
      const add = (m: THREE.Object3D) => { board.add(m); return m; };
      add(s.box([pw + 0.06, ph + 0.1, 0.02], [0, (ph + 0.1) / 2, 0], wood));
      const paper = sheetMesh(pw, ph, 0);
      paper.position.set(0, (ph + 0.1) / 2, 0.012);
      board.add(paper);
      for (const sx of [-1, 1]) add(s.box([0.04, ph + 0.1, 0.03], [sx * (pw / 2 - 0.1), (ph + 0.1) / 2, -0.025], darkWood));
      board.rotation.x = -lean;
      board.position.set(0, 0.02, 0.2);
      s.root.add(board);
      const topY = (ph * 0.8) * Math.cos(lean), topZ = 0.2 - ph * 0.8 * Math.sin(lean) - 0.03;
      s.rod([0, topY, topZ], [0, 0, topZ - 0.42], 0.022, darkWood);
      const brick = s.material('#a8523a', { roughness: 0.95 });
      s.box([0.21, 0.07, 0.1], [-0.2 + random() * 0.4, 0.035, 0.29], brick).rotation.y = (random() - 0.5) * 0.5;
      if (mood.density > 0.5) s.box([0.21, 0.07, 0.1], [0.28, 0.035, 0.31], brick).rotation.y = 0.9;
    }
    return s.finish();
  },
});
