import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type P3 = [number, number, number];

const STONE = {
  granite: { base: '#b46f60', a: '#7c3f38', b: '#e3b7a6', cut: '#70352f' },
  limestone: { base: '#e5dcc5', a: '#cfc4a8', b: '#f3ecda', cut: '#a2957a' },
  sandstone: { base: '#d3b37c', a: '#b9955c', b: '#e4cc9c', cut: '#93733f' },
  basalt: { base: '#3d3f42', a: '#2b2c2f', b: '#55585c', cut: '#8b8f94' },
  plaster: { base: '#c97d5c', a: '#8f4a36', b: '#e8c7a4', cut: '#f1d27a' },
} as const;

export default defineThing({
  questions: {
    form: choice('What form does the false door take?', {
      classic: 'The full Old Kingdom form: nested jambs and lintels, a roll moulding round the edge and a flaring cornice on top.',
      palace: 'A palace-facade door: the jambs broken into tall narrow pilasters and niches painted like woven mats.',
      crude: 'A squat provincial slab with a single frame and a few clumsy signs.',
      chapel: 'Set at the back of a small stone niche-chapel with side walls and a roof slab.',
    }),
    stone: choice('What is it cut from?', {
      granite: 'Speckled pink-red granite, royal and expensive.',
      limestone: 'Fine pale limestone.',
      sandstone: 'Warm yellow sandstone.',
      basalt: 'Dark grey-black basalt, the signs showing pale where cut.',
      plaster: 'Cheap plastered mud brick painted to look like red granite, with yellow signs.',
    }),
    paint: choice('How much colour is on the carving?', {
      bare: 'None: only the cut shadows of the signs.',
      traces: 'Faint traces of blue and red clinging in the cuts.',
      full: 'Fully painted: blue and green signs, red-brown figures, bright as the day it was finished.',
    }),
    scene: choice('What is shown in the panel above the door?', {
      owner: 'The owner seated alone before a table of tall loaves.',
      couple: 'A husband and wife facing each other across the table.',
      eyes: 'A pair of great watching eyes.',
      blank: 'Nothing; the panel was never carved.',
    }),
    statue: noul('Does a statue of the dead owner stand in the central niche, stepping out toward the living?'),
    slab: choice('What lies at the foot of the door?', {
      mat: 'An offering slab carved as a reed mat with a loaf on it and a spout toward the visitor.',
      basins: 'A slab with two square libation basins sunk into it.',
      steps: 'Two shallow steps leading up to a low altar block.',
      none: 'Nothing; bare floor.',
    }),
    story: choice('What is the door\'s situation now?', {
      tended: 'Someone still comes: bread, a jar, flowers and a bowl of incense are set out fresh.',
      forgotten: 'Nobody has come for centuries: sand has drifted against it and the slab is empty.',
      broken: 'Cracked through, half the cornice fallen and lying in pieces at its foot.',
      defaced: 'The names and figures have been chiselled out by someone who wanted the owner forgotten.',
      museum: 'Mounted on a clean plinth with a label, far from the tomb it was made for.',
    }),
    size: score('How large is it?', ['A household stela, knee to waist high', 'A man-sized door', 'A monumental door towering over the visitor']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const St = STONE[a.stone];
    const G = new THREE.Group();
    const fade = a.story === 'museum' ? 0.15 : mood.wear;
    const paints = a.paint === 'bare' ? [St.cut, St.cut, St.cut] : ['#2c64b0', '#3f9160', '#b8412c'];
    const paintAlpha = a.paint === 'bare' ? 1 : a.paint === 'traces' ? 0.4 * (1 - fade * 0.4) : 1 - fade * 0.45;
    const defaced = a.story === 'defaced';

    const glyph = (c: Ctx, x: number, y: number, z: number) => {
      const k = Math.floor(random() * 8), tint = paints[Math.floor(random() * 3)];
      const draw = () => {
        c.lineWidth = Math.max(1.5, z * 0.15); c.beginPath();
        if (k === 0) { c.arc(x, y, z * 0.34, 0, 7); c.stroke(); }
        else if (k === 1) { for (let i = 0; i < 3; i++) { c.moveTo(x - z * 0.42, y - z * 0.22 + i * z * 0.22); for (let j = 1; j <= 6; j++) c.lineTo(x - z * 0.42 + j * z * 0.14, y - z * 0.22 + i * z * 0.22 + (j % 2 ? -1 : 1) * z * 0.06); } c.stroke(); }
        else if (k === 2) { c.moveTo(x - z * 0.1, y + z * 0.45); c.quadraticCurveTo(x - z * 0.3, y - z * 0.2, x + z * 0.05, y - z * 0.45); c.quadraticCurveTo(x + z * 0.25, y, x + z * 0.1, y + z * 0.45); c.fill(); }
        else if (k === 3) { c.ellipse(x, y, z * 0.36, z * 0.2, -0.3, 0, 7); c.fill(); c.beginPath(); c.arc(x + z * 0.3, y - z * 0.26, z * 0.13, 0, 7); c.fill(); c.fillRect(x - z * 0.04, y + z * 0.12, z * 0.07, z * 0.3); }
        else if (k === 4) { c.arc(x, y + z * 0.2, z * 0.38, Math.PI, 0); c.fill(); }
        else if (k === 5) { c.ellipse(x, y - z * 0.22, z * 0.14, z * 0.2, 0, 0, 7); c.stroke(); c.fillRect(x - z * 0.04, y - z * 0.03, z * 0.08, z * 0.46); c.fillRect(x - z * 0.26, y + z * 0.02, z * 0.52, z * 0.08); }
        else if (k === 6) { c.strokeRect(x - z * 0.34, y - z * 0.2, z * 0.68, z * 0.4); }
        else { c.moveTo(x, y + z * 0.45); c.lineTo(x, y - z * 0.3); c.arc(x + z * 0.14, y - z * 0.3, z * 0.14, Math.PI, 0); c.stroke(); }
      };
      c.globalAlpha = 1; c.fillStyle = c.strokeStyle = St.cut; draw();
      if (a.paint !== 'bare') { c.globalAlpha = paintAlpha; c.fillStyle = c.strokeStyle = tint; draw(); c.globalAlpha = 1; }
    };
    const hack = (c: Ctx, x: number, y: number, w: number, h: number) => {
      c.fillStyle = St.b; c.globalAlpha = 0.85; c.fillRect(x, y, w, h); c.globalAlpha = 1; c.strokeStyle = St.a; c.lineWidth = 2;
      for (let i = 0; i < w * h / 160; i++) { const px = x + random() * w, py = y + random() * h; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 6 + random() * 6, py + 5 + random() * 6); c.stroke(); }
    };
    const stoneMat = (w: number, h: number, draw?: (c: Ctx, W: number, H: number) => void) => {
      const scale = 260, W = Math.max(32, Math.round(w * scale)), H = Math.max(32, Math.round(h * scale));
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const c = canvas.getContext('2d')!;
      c.fillStyle = St.base; c.fillRect(0, 0, W, H);
      const dots = a.stone === 'granite' || a.stone === 'plaster' ? W * H / 60 : W * H / 400;
      for (let i = 0; i < dots; i++) { c.fillStyle = random() < 0.5 ? St.a : St.b; c.globalAlpha = 0.5; const r = 1 + random() * 2.2; c.fillRect(random() * W, random() * H, r, r); }
      c.globalAlpha = 1;
      draw?.(c, W, H);
      c.globalAlpha = 1;
      for (let i = 0; i < fade * W * H / 2600; i++) { c.fillStyle = random() < 0.5 ? St.a : St.b; c.globalAlpha = 0.5 + random() * 0.3; c.beginPath(); c.ellipse(random() * W, random() * H, 3 + random() * 16, 2 + random() * 9, random() * 3, 0, 7); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = `rgba(92,74,52,${fade * 0.22})`; c.fillRect(0, 0, W, H);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: a.stone === 'basalt' || a.stone === 'granite' ? 0.55 + fade * 0.3 : 0.9 });
    };
    const column = (crude = false) => (c: Ctx, W: number, H: number) => {
      const z = Math.min(W * 0.72, 30), step = z * (crude ? 1.9 : mix(1.5, 1.08, mood.density));
      c.fillStyle = St.cut; c.fillRect(2, 0, 2, H); c.fillRect(W - 4, 0, 2, H);
      for (let y = z * 0.7; y < H - z * 2.6; y += step) glyph(c, W / 2, y, z);
      // the owner, standing at the foot of the jamb
      if (!crude) { const fy = H - z * 2.4; c.fillStyle = a.paint === 'bare' ? St.cut : '#a04a2c'; c.globalAlpha = a.paint === 'bare' ? 1 : Math.max(paintAlpha, 0.55); c.fillRect(W / 2 - z * 0.16, fy + z * 0.5, z * 0.32, z * 1.0); c.beginPath(); c.moveTo(W / 2 - z * 0.3, fy + z * 1.5); c.lineTo(W / 2 + z * 0.34, fy + z * 1.5); c.lineTo(W / 2 + z * 0.16, fy + z * 0.95); c.lineTo(W / 2 - z * 0.16, fy + z * 0.95); c.fill(); c.fillRect(W / 2 - z * 0.2, fy + z * 1.5, z * 0.14, z * 0.75); c.fillRect(W / 2 + z * 0.08, fy + z * 1.5, z * 0.14, z * 0.75); c.beginPath(); c.arc(W / 2, fy + z * 0.3, z * 0.22, 0, 7); c.fill(); c.globalAlpha = 1; if (defaced) hack(c, 4, fy - 2, W - 8, z * 2.4); }
      if (defaced) hack(c, 5, z * 0.4, W - 10, z * 2.4);
    };
    const row = (c: Ctx, W: number, H: number) => { const z = Math.min(H * 0.7, 30); for (let x = z * 0.7; x < W - z * 0.4; x += z * mix(1.5, 1.05, mood.density)) glyph(c, x, H / 2, z); if (defaced) hack(c, W * 0.55, 3, W * 0.4, H - 6); };
    const tableau = (c: Ctx, W: number, H: number) => {
      c.strokeStyle = St.cut; c.lineWidth = 3; c.strokeRect(4, 4, W - 8, H - 8);
      const skin = a.paint === 'bare' ? St.cut : '#a04a2c', alpha = a.paint === 'bare' ? 1 : Math.max(paintAlpha, 0.6);
      const sitter = (x: number, dir: number, pale: boolean) => {
        c.globalAlpha = alpha; c.fillStyle = pale && a.paint !== 'bare' ? '#d9a858' : skin; const u = H / 10;
        c.fillRect(x - u * 0.5, H - u * 6.2, u * 1.0, u * 2.6); c.fillRect(x - u * 0.5, H - u * 3.9, u * 2.0 * dir, u * 0.8); c.fillRect(x + dir * u * 1.3, H - u * 3.9, u * 0.6, u * 2.7); c.beginPath(); c.arc(x, H - u * 7.0, u * 0.75, 0, 7); c.fill(); c.fillRect(x, H - u * 5.4, dir * u * 2.2, u * 0.4);
        c.fillStyle = St.cut; c.fillRect(x - u * 1.1, H - u * 3.2, u * 1.9, u * 0.4); c.fillRect(x - dir * u * 1.0, H - u * 3.2, u * 0.35, u * 2.0); c.fillRect(x - dir * u * 1.0, H - u * 5.4, u * 0.3, u * 2.4);
        c.globalAlpha = 1;
      };
      if (a.scene === 'owner' || a.scene === 'couple') {
        sitter(a.scene === 'couple' ? W * 0.2 : W * 0.25, 1, false);
        if (a.scene === 'couple') sitter(W * 0.8, -1, true);
        const tx = a.scene === 'couple' ? W * 0.5 : W * 0.62, u = H / 10;
        c.fillStyle = St.cut; c.fillRect(tx - u * 0.2, H - u * 3.6, u * 0.4, u * 2.4); c.fillRect(tx - u * 2, H - u * 3.9, u * 4, u * 0.35);
        for (let i = -3; i <= 3; i++) { c.fillStyle = a.paint === 'bare' ? St.cut : '#d9b25a'; c.globalAlpha = alpha; c.beginPath(); c.ellipse(tx + i * u * 0.55, H - u * 5.2, u * 0.2, u * 1.3, 0, 0, 7); c.fill(); }
        c.globalAlpha = 1;
        if (a.scene === 'owner') for (let i = 0; i < 3; i++) glyph(c, W * 0.5 + i * u * 2, u * 1.6, u * 1.6);
        if (defaced) { hack(c, W * 0.08, H * 0.18, W * 0.3, H * 0.7); if (a.scene === 'couple') hack(c, W * 0.64, H * 0.18, W * 0.3, H * 0.7); }
      } else if (a.scene === 'eyes') {
        for (const side of [-1, 1]) { const ex = W / 2 + side * W * 0.22, ey = H * 0.45, r = W * 0.13; c.fillStyle = '#f2ecdc'; c.globalAlpha = a.paint === 'bare' ? 0 : alpha; c.beginPath(); c.moveTo(ex - r, ey); c.quadraticCurveTo(ex, ey - r * 0.75, ex + r, ey); c.quadraticCurveTo(ex, ey + r * 0.6, ex - r, ey); c.fill(); c.globalAlpha = 1; c.strokeStyle = c.fillStyle = a.paint === 'bare' ? St.cut : '#1d1b1a'; c.lineWidth = 5; c.beginPath(); c.moveTo(ex - r, ey); c.quadraticCurveTo(ex, ey - r * 0.75, ex + r, ey); c.quadraticCurveTo(ex, ey + r * 0.6, ex - r, ey); c.stroke(); c.beginPath(); c.arc(ex, ey - 2, r * 0.3, 0, 7); c.fill(); c.beginPath(); c.moveTo(ex - r * 0.9, ey - r * 0.75); c.quadraticCurveTo(ex, ey - r * 1.15, ex + r * 1.1, ey - r * 0.6); c.stroke(); c.beginPath(); c.moveTo(ex, ey + r * 0.4); c.lineTo(ex - side * r * 0.1, ey + r * 1.2); c.moveTo(ex + side * r * 0.5, ey + r * 0.3); c.quadraticCurveTo(ex + side * r * 1.1, ey + r * 1.4, ex + side * r * 1.3, ey + r * 0.7); c.stroke(); }
      }
    };
    const fronds = (c: Ctx, W: number, H: number) => { for (let x = 4, i = 0; x < W; x += 13, i++) { c.fillStyle = a.paint === 'bare' ? St.cut : paints[i % 3]; c.globalAlpha = a.paint === 'bare' ? 0.8 : paintAlpha; c.fillRect(x, 3, a.paint === 'bare' ? 2 : 8, H - 6); } };
    const mats = (c: Ctx, W: number, H: number) => { const cols = ['#2c64b0', '#3f9160', '#b8412c', '#d9b25a']; for (let y = 0, i = 0; y < H; y += 14, i++) { c.fillStyle = a.paint === 'bare' ? (i % 2 ? St.cut : St.base) : cols[Math.floor(random() * 4)]; c.globalAlpha = a.paint === 'bare' ? 0.55 : paintAlpha; c.fillRect(2, y + 1, W - 4, 11); } };

    const plain = stoneMat(0.5, 0.5);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, parent: THREE.Object3D = G) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const block = (w: number, h: number, d: number, at: P3, draw?: (c: Ctx, W: number, H: number) => void) => put(new THREE.BoxGeometry(w, h, d), draw ? stoneMat(w, h, draw) : plain, at);

    // ---- the door ----
    const crude = a.form === 'crude';
    const W = crude ? 0.95 : 1.15, H = crude ? 1.25 : 1.95, D = 0.22, F = D / 2;
    const corniceH = crude ? 0 : 0.17, Hf = H - corniceH - (crude ? 0 : 0.05);
    block(W, H - corniceH, D, [0, (H - corniceH) / 2, 0]);
    const broken = a.story === 'broken';
    if (!crude) {
      const flare = (w: number) => { const g = new THREE.BoxGeometry(w, corniceH, D + 0.02), p = g.getAttribute('position'); for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setZ(i, p.getZ(i) + (p.getZ(i) > 0 ? 0.09 : 0)); p.setX(i, p.getX(i) * 1.0 + Math.sign(p.getX(i)) * (Math.abs(p.getX(i)) > w * 0.49 ? 0.0 : 0)); } g.computeVertexNormals(); return g; };
      if (broken) {
        put(flare(W * 0.55), stoneMat(W * 0.55, corniceH, fronds), [-W * 0.225, H - corniceH / 2, 0]);
        const fallen = put(flare(W * 0.4), stoneMat(W * 0.4, corniceH, fronds), [W * 0.45, 0.09, F + 0.55]); fallen.rotation.set(-1.2, 0.5, 0.2);
      } else put(flare(W), stoneMat(W, corniceH, fronds), [0, H - corniceH / 2, 0]);
      const roll = put(new THREE.CylinderGeometry(0.028, 0.028, W, 10), plain, [0, Hf + 0.022, F + 0.02]); roll.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) put(new THREE.CylinderGeometry(0.028, 0.028, Hf, 10), plain, [side * (W / 2 - 0.028), Hf / 2, F + 0.02]);
    }
    const inner = W - (crude ? 0.1 : 0.14), jamb = crude ? 0.2 : 0.19, lintel = crude ? 0.2 : 0.18;
    const midW = inner - jamb * 2;
    // outer frame
    block(inner, lintel, 0.06, [0, Hf - lintel / 2, F + 0.03], row);
    for (const side of [-1, 1]) {
      const x = side * (inner / 2 - jamb / 2);
      if (a.form === 'palace') { for (let k = 0; k < 3; k++) block(jamb / 4, Hf - lintel, 0.06 - (k % 2) * 0.025, [x + (k - 1) * jamb * 0.36, (Hf - lintel) / 2, F + 0.03 - (k % 2) * 0.0125], mats); block(jamb, 0.1, 0.07, [x, Hf - lintel - 0.05, F + 0.035]); }
      else block(jamb, Hf - lintel, 0.06, [x, (Hf - lintel) / 2, F + 0.03], column(crude));
    }
    let nicheTop = Hf - lintel, nicheW = midW;
    if (!crude) {
      const panelH = 0.36, in2 = 0.11, jamb2 = 0.15;
      if (a.scene !== 'blank' || true) block(midW - 0.1, panelH - 0.04, 0.025, [0, nicheTop - panelH / 2, F + 0.0125], a.scene === 'blank' ? undefined : tableau);
      block(midW, in2, 0.04, [0, nicheTop - panelH - in2 / 2, F + 0.02], row);
      nicheTop -= panelH + in2;
      for (const side of [-1, 1]) block(jamb2, nicheTop, 0.035, [side * (midW / 2 - jamb2 / 2), nicheTop / 2, F + 0.0175], a.form === 'palace' ? mats : column());
      nicheW = midW - jamb2 * 2;
    }
    // the blind niche and its drum
    const shade = s.material(new THREE.Color(St.base).multiplyScalar(0.55), { roughness: 1 });
    put(new THREE.BoxGeometry(nicheW, nicheTop, 0.004), shade, [0, nicheTop / 2, F + 0.002]);
    const drum = put(new THREE.CylinderGeometry(0.045, 0.045, nicheW, 12), plain, [0, nicheTop - 0.05, F + 0.02]); drum.rotation.z = Math.PI / 2;

    if (a.statue) {
      const skin = s.material(a.paint === 'bare' ? St.base : '#a04a2c', { roughness: 0.8 }), white = s.material(a.paint === 'bare' ? St.b : '#efe8d6', { roughness: 0.9 }), wig = s.material(a.paint === 'bare' ? St.a : '#1c1a19');
      const hgt = Math.min(nicheTop - 0.14, 1.25), u = hgt / 7.2, z0 = F + 0.06, fig = new THREE.Group();
      const part = (w: number, h: number, d: number, at: P3, m: THREE.Material) => put(new THREE.BoxGeometry(w, h, d), m, at, fig);
      part(u * 0.45, u * 3.1, u * 0.5, [-u * 0.35, u * 1.55, u * 0.45], skin); part(u * 0.45, u * 3.1, u * 0.5, [u * 0.35, u * 1.55, 0], skin);
      part(u * 0.5, u * 0.2, u * 0.9, [-u * 0.35, u * 0.1, u * 0.6], skin); part(u * 0.5, u * 0.2, u * 0.9, [u * 0.35, u * 0.1, u * 0.15], skin);
      const kilt = put(new THREE.CylinderGeometry(u * 0.62, u * 0.85, u * 1.5, 4), white, [0, u * 3.3, u * 0.25], fig); kilt.rotation.y = Math.PI / 4; kilt.scale.z = 0.75;
      const torso = put(new THREE.CylinderGeometry(u * 0.95, u * 0.6, u * 1.7, 4), skin, [0, u * 4.85, u * 0.15], fig); torso.rotation.y = Math.PI / 4; torso.scale.z = 0.55;
      for (const side of [-1, 1]) { part(u * 0.32, u * 2.5, u * 0.36, [side * u * 0.92, u * 4.3, u * 0.15], skin); }
      put(new THREE.SphereGeometry(u * 0.48, 14, 10), skin, [0, u * 6.35, u * 0.2], fig);
      const hair = put(new THREE.SphereGeometry(u * 0.56, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), wig, [0, u * 6.42, u * 0.12], fig); hair.scale.set(1.08, 1, 1.05);
      put(new THREE.BoxGeometry(u * 1.2, u * 0.75, u * 0.5), wig, [0, u * 5.95, -u * 0.18], fig);
      put(new THREE.BoxGeometry(Math.min(nicheW, u * 2.6), u * 0.16, u * 1.9), plain, [0, -u * 0.02, u * 0.3], fig);
      if (defaced) put(new THREE.DodecahedronGeometry(u * 0.5, 0), s.material(St.b, { roughness: 1 }), [0, u * 6.3, u * 0.35], fig);
      fig.position.set(0, 0.05, z0); G.add(fig);
    }

    if (a.form === 'chapel') {
      const wallD = 0.75;
      for (const side of [-1, 1]) block(0.16, H + 0.02, wallD, [side * (W / 2 + 0.08), (H + 0.02) / 2, F + wallD / 2 - D]);
      const roof = put(new THREE.BoxGeometry(W + 0.44, 0.14, wallD + 0.1), plain, [0, H + 0.09, F + wallD / 2 - D + 0.03]);
      roof.castShadow = true;
      put(new THREE.BoxGeometry(W + 0.5, 0.06, wallD + 0.5), plain, [0, -0.03, F + wallD / 2 - D + 0.2]);
    }

    // ---- offering place ----
    const front = F + 0.12;
    let tableY = 0, tableZ = front + 0.3;
    if (a.slab === 'mat') {
      put(new THREE.BoxGeometry(0.72, 0.1, 0.5), plain, [0, 0.05, front + 0.25]);
      put(new THREE.BoxGeometry(0.14, 0.07, 0.14), plain, [0, 0.035, front + 0.56]);
      put(new THREE.BoxGeometry(0.6, 0.016, 0.3), stoneMat(0.6, 0.3, (c, w, h) => { c.strokeStyle = St.cut; c.lineWidth = 2; for (let x = 4; x < w; x += 7) { c.beginPath(); c.moveTo(x, 2); c.lineTo(x, h - 2); c.stroke(); } }), [0, 0.108, front + 0.2]);
      const loaf = put(new THREE.SphereGeometry(0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), plain, [0, 0.115, front + 0.36]); loaf.scale.set(1, 1.3, 0.7);
      put(new THREE.BoxGeometry(0.03, 0.012, 0.16), s.material(St.cut), [0, 0.096, front + 0.5]);
      tableY = 0.118; tableZ = front + 0.2;
    } else if (a.slab === 'basins') {
      put(new THREE.BoxGeometry(0.78, 0.14, 0.46), plain, [0, 0.07, front + 0.23]);
      for (const side of [-1, 1]) { put(new THREE.BoxGeometry(0.24, 0.006, 0.24), s.material(new THREE.Color(St.base).multiplyScalar(0.4), { roughness: 0.3 }), [side * 0.19, 0.142, front + 0.25]); }
      put(new THREE.BoxGeometry(0.03, 0.006, 0.14), s.material(St.cut), [0, 0.142, front + 0.38]);
      tableY = 0.142; tableZ = front + 0.08;
    } else if (a.slab === 'steps') {
      put(new THREE.BoxGeometry(1.0, 0.09, 0.7), plain, [0, 0.045, front + 0.33]);
      put(new THREE.BoxGeometry(0.8, 0.09, 0.48), plain, [0, 0.135, front + 0.22]);
      put(new THREE.BoxGeometry(0.46, 0.2, 0.32), plain, [0, 0.28, front + 0.16]);
      put(new THREE.BoxGeometry(0.52, 0.04, 0.38), plain, [0, 0.4, front + 0.16]);
      tableY = 0.42; tableZ = front + 0.16;
    }
    if (a.story === 'tended') {
      const bread = s.material('#c99a58', { roughness: 0.9 }), clay = s.material('#a85f3c', { roughness: 0.85 }), spanX = a.slab === 'steps' ? 0.18 : 0.28;
      const n = 2 + Math.round(mood.density * 4);
      for (let i = 0; i < n; i++) { const m = put(new THREE.SphereGeometry(1, 12, 8), bread, [(i - (n - 1) / 2) * spanX * 2 / n + (random() - 0.5) * 0.02, tableY + 0.03, tableZ + (random() - 0.5) * 0.08]); m.scale.set(0.05 + random() * 0.02, i % 2 ? 0.07 : 0.03, 0.05); }
      put(new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.06, 0.1], [0.05, 0.2], [0.028, 0.24], [0.034, 0.27]].map(([x, y]) => new THREE.Vector2(x, y)), 14), clay, [-spanX - 0.12, a.slab === 'steps' ? 0.18 : tableY > 0 ? 0 : 0, tableZ + 0.2]);
      put(new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.065, 0.04], [0.07, 0.045]].map(([x, y]) => new THREE.Vector2(x, y)), 14), clay, [spanX + 0.1, a.slab === 'steps' ? 0.18 : 0, tableZ + 0.22]);
      const ember = new THREE.MeshStandardMaterial({ color: '#3a2a22', emissive: '#ff7a2a', emissiveIntensity: mix(0.3, 1.3, mood.warmth), roughness: 1 });
      put(new THREE.SphereGeometry(0.04, 10, 6), ember, [spanX + 0.1, (a.slab === 'steps' ? 0.18 : 0) + 0.04, tableZ + 0.22]).scale.y = 0.4;
      for (let i = 0; i < 3; i++) { const stem = put(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 5), s.material('#5f8a4a'), [-0.08 + i * 0.03, tableY + 0.012, tableZ + 0.11 + i * 0.02]); stem.rotation.set(0, 0.3 * i, Math.PI / 2 - 0.05); const bud = put(new THREE.ConeGeometry(0.022, 0.06, 8), s.material(i % 2 ? '#e9e4f2' : '#5b84cf'), [0.06 + i * 0.025, tableY + 0.02, tableZ + 0.1 + i * 0.03 - i * 0.012]); bud.rotation.z = -Math.PI / 2; }
    }
    G.scale.setScalar(mix(0.5, 1.45, a.size));
    s.root.add(G);
    const k = G.scale.x;
    if (a.story === 'forgotten') {
      const sand = s.material('#d5c095', { roughness: 1 });
      for (let i = 0; i < 5; i++) s.ball([(0.16 + random() * 0.2) * k, (0.04 + random() * 0.07) * k, (0.1 + random() * 0.12) * k], [(random() - 0.5) * W * k * 1.1, 0, (F + 0.06 + random() * 0.12) * k], sand);
    }
    if (broken || defaced) {
      const rubble = Array.from({ length: broken ? 14 : 22 }, () => ({ at: [(random() - 0.5) * W * k * 1.2, 0.02 * k, (F + 0.2 + random() * 0.7) * k] as P3, size: (broken ? 0.03 + random() * 0.07 : 0.012 + random() * 0.025) * k }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material(St.base, { roughness: 1 }), rubble);
    }
    if (broken) {
      const dark = s.material('#1c1714', { roughness: 1 });
      let x = W * 0.36, y = Hf;
      for (let i = 0; i < 9; i++) { const nx = x - 0.07 - random() * 0.1, ny = y - 0.12 - random() * 0.14; const seg = s.rod([x * k, y * k, (F + 0.065) * k], [nx * k, ny * k, (F + 0.065) * k], 0.0045 * k, dark); seg.castShadow = false; x = nx; y = ny; if (y < 0.1 || x < -W / 2 + 0.05) break; }
    }
    if (a.story === 'museum') {
      const base = s.material('#dedcd4', { roughness: 0.85 });
      s.box([(W + 0.5) * k, 0.12, (1.3) * k], [0, -0.06, 0.4 * k], base);
      s.label('FALSE DOOR', 0.3, 0.1, [(W / 2 + 0.05) * k, 0.06, (F + 0.75) * k], '#333', '#f6f3ea').rotation.x = -0.9;
    }
    return s.finish();
  },
});
