import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Rand = () => number;
type Keys = readonly (readonly [number, number])[];
type Ctx = CanvasRenderingContext2D;

const W_KEYS: Keys = [[0, 0.1], [0.07, 0.106], [0.12, 0.086], [0.3, 0.115], [0.42, 0.11], [0.55, 0.135], [0.72, 0.156], [0.8, 0.152], [0.86, 0.126], [0.93, 0.108], [0.975, 0.078], [1, 0.03]];
const D_KEYS: Keys = [[0, 0.118], [0.06, 0.122], [0.12, 0.082], [0.3, 0.092], [0.42, 0.1], [0.55, 0.105], [0.75, 0.118], [0.83, 0.114], [0.92, 0.11], [0.975, 0.075], [1, 0.02]];
const WMAX = 0.16;

function sample(keys: Keys, t: number) {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      const k = (t - t0) / Math.max(t1 - t0, 1e-6);
      const e = k * k * (3 - 2 * k);
      return v0 + (v1 - v0) * e;
    }
  }
  return keys[keys.length - 1][1];
}
const wAt = (t: number) => sample(W_KEYS, t);
const dAt = (t: number) => sample(D_KEYS, t);
const surf = (x: number, t: number) => dAt(t) * Math.pow(Math.max(0, 1 - (x / wAt(t)) ** 2), 0.4);

/** A mummiform shell: half-tube cross-sections stacked along y, closed at both ends. */
function loft(sign: 1 | -1, power: number, depth: (t: number) => number, widen = 1, from = 0, to = 1) {
  const N = 60, M = 14;
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = -1; i <= N + 1; i++) {
    const t = from + (to - from) * Math.min(1, Math.max(0, i / N));
    const cap = i < 0 || i > N;
    const w = cap ? 0 : wAt(t) * widen, d = cap ? 0 : depth(t);
    for (let j = 0; j <= M; j++) {
      const a = Math.PI * j / M;
      const x = -w * Math.cos(a);
      pos.push(x, t, sign * d * Math.pow(Math.sin(a), power));
      uv.push(x / (2 * WMAX) + 0.5, t);
    }
  }
  const rows = N + 3;
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1;
      if (sign > 0) index.push(a, b, c, b, d, c); else index.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function glyph(ctx: Ctx, x: number, y: number, s: number, r: Rand) {
  const k = Math.floor(r() * 9);
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.beginPath();
  if (k === 0) { ctx.arc(x, y, s * 0.34, 0, 7); ctx.stroke(); ctx.fillRect(x - s * 0.08, y - s * 0.08, s * 0.16, s * 0.16); }
  else if (k === 1) { for (let i = 0; i < 3; i++) { ctx.moveTo(x - s * 0.45, y - s * 0.25 + i * s * 0.25); for (let j = 1; j <= 6; j++) ctx.lineTo(x - s * 0.45 + j * s * 0.15, y - s * 0.25 + i * s * 0.25 + (j % 2 ? -1 : 1) * s * 0.07); } ctx.stroke(); }
  else if (k === 2) { ctx.moveTo(x - s * 0.12, y + s * 0.45); ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.2, x + s * 0.05, y - s * 0.45); ctx.quadraticCurveTo(x + s * 0.25, y, x + s * 0.1, y + s * 0.45); ctx.fill(); }
  else if (k === 3) { ctx.ellipse(x, y, s * 0.36, s * 0.2, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + s * 0.3, y - s * 0.26, s * 0.13, 0, 7); ctx.fill(); ctx.fillRect(x - s * 0.05, y + s * 0.12, s * 0.07, s * 0.32); }
  else if (k === 4) { ctx.arc(x, y + s * 0.2, s * 0.38, Math.PI, 0); ctx.fill(); }
  else if (k === 5) { ctx.ellipse(x, y - s * 0.22, s * 0.14, s * 0.2, 0, 0, 7); ctx.stroke(); ctx.fillRect(x - s * 0.04, y - s * 0.03, s * 0.08, s * 0.48); ctx.fillRect(x - s * 0.26, y + s * 0.02, s * 0.52, s * 0.08); }
  else if (k === 6) { ctx.moveTo(x - s * 0.42, y); ctx.quadraticCurveTo(x, y - s * 0.34, x + s * 0.42, y); ctx.quadraticCurveTo(x, y + s * 0.3, x - s * 0.42, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, s * 0.1, 0, 7); ctx.fill(); }
  else if (k === 7) { ctx.strokeRect(x - s * 0.34, y - s * 0.22, s * 0.68, s * 0.44); }
  else { ctx.moveTo(x, y + s * 0.45); ctx.lineTo(x, y - s * 0.3); ctx.arc(x + s * 0.14, y - s * 0.3, s * 0.14, Math.PI, 0); ctx.stroke(); }
}

const FINISHES = {
  gilded: 'Sheet gold all over, inlaid with lapis blue, turquoise and carnelian; a king or a very rich burial.',
  black: 'Glossy black resin varnish with bands and face picked out in yellow gold; sombre and expensive.',
  white: 'Chalk-white ground crossed by bright yellow bands of text, with small painted gods between them.',
  yellow: 'Honey-yellow varnish crammed with tiny red, blue and green scenes edge to edge; busy, priestly.',
  feathered: 'Covered from shoulder to foot in overlapping painted feathers, as if wrapped in a great pair of wings.',
  cedar: 'Bare reddish cedar wood with only the face, collar and one column of text painted on; plain and dignified.',
} as const;
type Finish = keyof typeof FINISHES;
const PALETTE: Record<Finish, { base: string; band: string; ink: string; a: string; b: string; c: string; metal: number }> = {
  gilded: { base: '#d9a936', band: '#274f9e', ink: '#f1d27a', a: '#274f9e', b: '#2c9c8c', c: '#b23a2a', metal: 0.55 },
  black: { base: '#1c1916', band: '#e2b84a', ink: '#1c1916', a: '#e2b84a', b: '#c8982f', c: '#e2b84a', metal: 0.1 },
  white: { base: '#efe7d2', band: '#e3b23b', ink: '#22201c', a: '#2d5aa8', b: '#3c8f5a', c: '#b8402c', metal: 0 },
  yellow: { base: '#dba43a', band: '#f0cf78', ink: '#3a2010', a: '#27549a', b: '#2f7d55', c: '#a8321f', metal: 0.05 },
  feathered: { base: '#d6aa3c', band: '#c94a2c', ink: '#f4dc8e', a: '#2a5ea6', b: '#2f9a86', c: '#c94a2c', metal: 0.3 },
  cedar: { base: '#8d5732', band: '#e6c25a', ink: '#3a2414', a: '#2d5aa8', b: '#e6c25a', c: '#b8402c', metal: 0 },
};
const SKIN = { gold: '#e2b441', red: '#a8502f', pale: '#e6c58f', green: '#4f8a5a', black: '#26211e' } as const;

export default defineThing({
  questions: {
    pose: choice('How is the coffin found?', {
      lying: 'Lying flat on its back on the floor, closed and whole.',
      bier: 'Laid out on a low lion-headed funeral bed.',
      standing: 'Stood upright on its foot board, facing you like a person.',
      ajar: 'Lying with the lid pushed askew, a strip of wrapped mummy showing in the gap.',
      open: 'Lid lifted off and laid beside the trough, the bandaged mummy exposed.',
    }),
    finish: choice('How is the body of the coffin decorated?', FINISHES),
    headcloth: choice('What does it wear on its head?', {
      nemes: 'The royal striped headcloth in blue and gold with a cobra at the brow.',
      wig: 'A heavy blue-black wig bound with a gold fillet, lappets tipped in gold.',
      lotus: 'A dark wig crowned with a band of lotus petals and a flower on the brow.',
      red: 'A striped headcloth in red ochre and cream, a provincial copy of a royal one.',
    }),
    face: choice('What colour is the painted face?', {
      gold: 'Gilded: the flesh of a god.',
      red: 'Red-brown, the conventional skin of a man.',
      pale: 'Pale yellow cream, the conventional skin of a woman.',
      green: 'Green, the face of Osiris and of new growth.',
      black: 'Black as Nile silt, the colour of rebirth.',
    }),
    arms: choice('What are the arms doing?', {
      regalia: 'Crossed on the chest, fists gripping a crook and a flail.',
      fists: 'Crossed on the chest with empty clenched fists.',
      sides: 'No arms shown: only a great collar and the wings of a goddess spread across the chest.',
    }),
    beard: noul('Does it wear the plaited false beard of a god?'),
    story: choice('What has happened to it since the burial?', {
      untouched: 'Nothing. It is exactly as the priests left it.',
      garland: 'A wreath of leaves and flowers still lies on its chest, dried where it was placed.',
      pall: 'A linen shroud has been drawn up over its legs.',
      robbed: 'Robbers have hacked the precious face away and chopped a hole through the chest.',
      museum: 'It rests on conservation blocks with a small label card, an exhibit now.',
    }),
    size: score('How large is it?', ['A child-sized coffin', 'An ordinary adult', 'A giant outer coffin, larger than life']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = PALETTE[a.finish];
    const H = mix(1.15, 2.35, a.size);
    const robbed = a.story === 'robbed';
    const wig = { nemes: ['#234a98', '#e0b23c'], wig: ['#1a2238', '#1f2a48'], lotus: ['#1d1c1c', '#27242a'], red: ['#a8402a', '#ead9a8'] }[a.headcloth];
    const dull = (c: string) => '#' + new THREE.Color(c).lerp(new THREE.Color('#857a68'), mood.wear * 0.3 + (1 - mood.cheer) * 0.12).getHexString();

    // ---- painted lid texture ----
    const CW = 320, CH = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const c = canvas.getContext('2d')!;
    const px = (x: number) => (x / (2 * WMAX) + 0.5) * CW, py = (t: number) => (1 - t) * CH;
    c.fillStyle = dull(P.base); c.fillRect(0, 0, CW, CH);
    if (a.finish === 'cedar') { c.strokeStyle = 'rgba(60,30,12,0.35)'; c.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const x = random() * CW; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 14, CH * 0.3, x - 14, CH * 0.6, x + 6, CH); c.stroke(); } }
    const bands = 2 + Math.round(mood.density * 3);
    if (a.finish === 'feathered') {
      for (let y = py(0.6); y < py(0.1); y += 20) for (let x = -10; x < CW + 20; x += 22) {
        const off = Math.round(y / 20) % 2 ? 11 : 0;
        c.fillStyle = dull([P.a, P.b, P.c][Math.floor(random() * 3)]);
        c.beginPath(); c.ellipse(x + off, y, 10, 17, 0, 0, Math.PI); c.fill();
        c.strokeStyle = dull(P.ink); c.lineWidth = 1.5; c.stroke();
      }
    } else {
      for (let b = 0; b < bands; b++) {
        const y = py(mix(0.5, 0.15, bands === 1 ? 0.5 : b / (bands - 1)));
        c.fillStyle = dull(P.band); c.fillRect(0, y - 11, CW, 22);
        c.fillStyle = c.strokeStyle = dull(a.finish === 'gilded' ? P.ink : a.finish === 'black' ? P.ink : '#2a211a');
        for (let x = 14; x < CW; x += 24) if (Math.abs(x - CW / 2) > 36) glyph(c, x, y, 17, random);
        if (b < bands - 1 && (a.finish === 'white' || a.finish === 'yellow' || mood.density > 0.55)) {
          const y2 = py(mix(0.5, 0.15, (b + 0.5) / (bands - 1)));
          for (const side of [-1, 1]) for (let f = 0; f < (a.finish === 'yellow' ? 2 : 1); f++) {
            const fx = CW / 2 + side * (70 + f * 44), tint = dull([P.a, P.b, P.c][Math.floor(random() * 3)]);
            c.fillStyle = tint; c.fillRect(fx - 8, y2 - 14, 16, 42);
            c.beginPath(); c.arc(fx, y2 - 22, 8, 0, 7); c.fill();
            c.fillStyle = dull(P.c); c.beginPath(); c.arc(fx, y2 - 36, 6, 0, 7); c.fill();
          }
        }
      }
    }
    // centre column of text
    c.fillStyle = dull(a.finish === 'black' ? P.band : a.finish === 'gilded' ? '#e9c458' : '#f0e2b6'); c.fillRect(CW / 2 - 26, py(0.52), 52, py(0.1) - py(0.52));
    c.strokeStyle = dull(P.c); c.lineWidth = 3; c.strokeRect(CW / 2 - 26, py(0.52), 52, py(0.1) - py(0.52));
    c.fillStyle = c.strokeStyle = dull(a.finish === 'gilded' ? '#23468e' : '#231c16');
    for (let y = py(0.52) + 22; y < py(0.1) - 10; y += 30) glyph(c, CW / 2, y, 24, random);
    // foot board stripes
    for (let x = 0; x < CW; x += 20) { c.fillStyle = dull([P.a, P.band, P.c, P.b][(x / 20) % 4]); c.fillRect(x, py(0.085), 20, CH); }
    c.fillStyle = dull(P.ink === P.base ? P.band : P.c); c.fillRect(0, py(0.095), CW, 8);
    // wings across the chest
    const wy = py(0.585);
    for (const side of [-1, 1]) for (let f = 0; f < 11; f++) {
      const ang = mix(-0.5, 0.45, f / 10);
      c.save(); c.translate(CW / 2 + side * 8, wy); c.rotate(side * ang); c.fillStyle = dull([P.a, P.b, P.c][f % 3]);
      c.beginPath(); c.ellipse(side * 72, 0, 70, 7.5, 0, 0, 7); c.fill(); c.restore();
    }
    c.fillStyle = dull('#c0392b'); c.beginPath(); c.arc(CW / 2, wy - 6, 15, 0, 7); c.fill();
    c.strokeStyle = dull('#e9c458'); c.lineWidth = 3; c.stroke();
    // head cloth and collar
    for (let y = 0, i = 0; y < py(0.79); y += 13, i++) { c.fillStyle = dull(wig[i % 2]); c.fillRect(0, y, CW, 13); }
    const collar = [P.a, '#e9c458', P.c, P.b, '#e9c458', P.a, P.c, '#e9c458'];
    for (let k = 7; k >= 0; k--) { c.fillStyle = dull(collar[k]); c.beginPath(); c.ellipse(CW / 2, py(0.835), 46 + k * 15, 40 + k * 15, 0, 0, Math.PI); c.fill(); }
    c.fillStyle = dull(a.finish === 'black' ? '#1c1916' : P.base); c.beginPath(); c.ellipse(CW / 2, py(0.835), 40, 30, 0, 0, Math.PI); c.fill();
    for (let k = 0; k < 15; k++) { const an = Math.PI * (k + 0.5) / 15; c.fillStyle = dull(k % 2 ? P.a : P.c); c.beginPath(); c.ellipse(CW / 2 + Math.cos(an) * 166, py(0.835) + Math.sin(an) * 160, 5, 9, an - Math.PI / 2, 0, 7); c.fill(); }
    // age
    c.fillStyle = `rgba(52,38,24,${mood.wear * 0.3})`; c.fillRect(0, 0, CW, CH);
    for (let i = 0; i < Math.floor(mood.wear * 34); i++) {
      c.fillStyle = random() < 0.5 ? '#c9bb9c' : '#6d4c30';
      c.beginPath(); c.ellipse(random() * CW, random() * CH, 6 + random() * 22, 5 + random() * 16, random() * 3, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(30,20,12,0.8)'; c.lineWidth = 1.5;
    for (let i = 0; i < Math.floor(mood.wear * 12); i++) { let x = random() * CW, y = random() * CH; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 26; y += 20 + random() * 30; c.lineTo(x, y); } c.stroke(); }
    if (robbed) {
      c.fillStyle = '#150e09'; c.strokeStyle = '#b08a55'; c.lineWidth = 7; c.beginPath();
      for (let k = 0; k < 13; k++) { const an = k / 13 * Math.PI * 2, r = 34 + random() * 34; c[k ? 'lineTo' : 'moveTo'](CW / 2 + 20 + Math.cos(an) * r, py(0.66) + Math.sin(an) * r * 1.3); }
      c.closePath(); c.fill(); c.stroke();
    }
    const lidMap = new THREE.CanvasTexture(canvas); lidMap.colorSpace = THREE.SRGBColorSpace;
    const lidMat = new THREE.MeshStandardMaterial({ map: lidMap, roughness: mix(0.38, 0.85, mood.wear), metalness: P.metal * (1 - mood.wear * 0.5), side: THREE.DoubleSide });
    const sideMat = s.material(P.base, { roughness: 0.6, metalness: P.metal * 0.7, side: THREE.DoubleSide });
    const gold = s.material('#e0b040', { metalness: 0.6, roughness: 0.35 });
    const wood = s.material('#6b4a2e');
    const skinMat = s.material(robbed ? '#7a5a3a' : SKIN[a.face], { metalness: a.face === 'gold' && !robbed ? 0.55 : 0, roughness: 0.45 });

    // ---- face texture ----
    const fc = document.createElement('canvas'); fc.width = 512; fc.height = 256;
    const f = fc.getContext('2d')!;
    f.fillStyle = dull(robbed ? '#74522f' : SKIN[a.face]); f.fillRect(0, 0, 512, 256);
    if (robbed) { f.strokeStyle = '#2a1a0e'; f.lineWidth = 5; for (let i = 0; i < 16; i++) { const x = 60 + random() * 140, y = 40 + random() * 170; f.beginPath(); f.moveTo(x, y); f.lineTo(x + 20 + random() * 30, y + (random() - 0.5) * 40); f.stroke(); } }
    else {
      const line = a.face === 'black' ? '#e7c35a' : '#14110f';
      for (const side of [-1, 1]) {
        const ex = 128 + side * 30, ey = 108;
        f.fillStyle = '#f6f1e2'; f.beginPath(); f.moveTo(ex - 20, ey); f.quadraticCurveTo(ex, ey - 15, ex + 20, ey); f.quadraticCurveTo(ex, ey + 12, ex - 20, ey); f.fill();
        f.strokeStyle = line; f.lineWidth = 5; f.stroke();
        f.fillStyle = '#14110f'; f.beginPath(); f.arc(ex, ey - 1, 7.5, 0, 7); f.fill();
        f.beginPath(); f.moveTo(ex + side * 18, ey); f.lineTo(ex + side * 44, ey + 3); f.stroke();
        f.lineWidth = 6; f.beginPath(); f.moveTo(ex - side * 20, ey - 19); f.quadraticCurveTo(ex, ey - 30, ex + side * 44, ey - 14); f.stroke();
      }
      f.strokeStyle = a.face === 'red' || a.face === 'black' ? '#e8c9a0' : '#8c2f22'; f.lineWidth = 6; f.beginPath(); f.moveTo(110, 178); f.quadraticCurveTo(128, 186 + (mood.cheer - 0.5) * 8, 146, 178); f.stroke();
    }
    const faceMap = new THREE.CanvasTexture(fc); faceMap.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.45, metalness: a.face === 'gold' && !robbed ? 0.5 : 0 });

    // ---- assembly in a standing frame one unit tall ----
    const body = new THREE.Group(), lid = new THREE.Group(), trough = new THREE.Group();
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const DEPTH = 0.085;
    put(trough, loft(-1, 0.3, (t) => DEPTH * Math.min(1, 0.55 + (1 - t) * 6)), sideMat);
    put(lid, loft(1, 0.8, dAt), lidMat);
    body.add(trough, lid);

    const opened = a.pose === 'ajar' || a.pose === 'open' || robbed;
    if (opened) {
      const linen = s.material('#d9cba6', { roughness: 0.95 });
      const mummy = put(trough, loft(1, 0.9, (t) => dAt(t) * 0.55, 0.8, 0.04, 0.95), linen, 0, 0, -0.07);
      mummy.scale.set(1, 1, 1);
      for (let i = 0; i < 9; i++) { const t = 0.12 + i * 0.08; const band = put(trough, new THREE.BoxGeometry(wAt(t) * 1.5, 0.012, 0.012), s.material('#a98f62'), 0, t, -0.07 + dAt(t) * 0.55); band.rotation.z = i % 2 ? 0.35 : -0.35; }
      if (a.pose === 'open') put(trough, new THREE.SphereGeometry(1, 16, 10), robbed ? linen : gold, 0, 0.875, -0.02).scale.set(0.062, 0.075, 0.04);
    }

    // head
    const headZ = dAt(0.895) + 0.004;
    const face = put(lid, new THREE.SphereGeometry(1, 28, 18), faceMat, 0, 0.895, headZ);
    face.scale.set(0.074, 0.088, 0.056);
    if (!robbed) {
      const nose = put(lid, new THREE.ConeGeometry(0.011, 0.042, 8), skinMat, 0, 0.888, headZ + 0.057); nose.rotation.x = 0.25;
      for (const side of [-1, 1]) put(lid, new THREE.SphereGeometry(1, 10, 8), skinMat, side * 0.077, 0.895, headZ + 0.006).scale.set(0.012, 0.026, 0.012);
    }
    // lappets fall from the head cloth onto the chest
    const lap = document.createElement('canvas'); lap.width = 32; lap.height = 128;
    const lc = lap.getContext('2d')!;
    for (let i = 0; i < 10; i++) { lc.fillStyle = dull(wig[i % 2]); lc.fillRect(0, i * 13, 32, 13); }
    if (a.headcloth !== 'nemes' && a.headcloth !== 'red') { lc.fillStyle = dull('#e0b23c'); lc.fillRect(0, 104, 32, 24); }
    const lapMap = new THREE.CanvasTexture(lap); lapMap.colorSpace = THREE.SRGBColorSpace;
    const lapMat = new THREE.MeshStandardMaterial({ map: lapMap, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const lp = put(lid, new THREE.CapsuleGeometry(0.5, 1, 4, 10), lapMat, side * 0.083, 0.815, surf(side * 0.083, 0.815) + 0.004);
      lp.scale.set(0.058, 0.075, 0.034);
    }
    const crown = put(lid, new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), lapMat, 0, 0.93, headZ - 0.02);
    crown.scale.set(0.094, 0.07, 0.056);
    if (a.headcloth === 'nemes' && !robbed) { put(lid, new THREE.CapsuleGeometry(0.008, 0.035, 3, 8), gold, 0, 0.972, headZ + 0.04).rotation.x = 0.5; put(lid, new THREE.SphereGeometry(0.013, 10, 8), gold, 0, 0.992, headZ + 0.046); }
    if (a.headcloth === 'wig') put(lid, new THREE.TorusGeometry(0.086, 0.007, 6, 28, Math.PI), gold, 0, 0.945, headZ - 0.012).scale.set(1, 0.7, 0.75);
    if (a.headcloth === 'lotus') {
      for (let i = 0; i < 9; i++) { const an = Math.PI * (i + 0.5) / 9; const petal = put(lid, new THREE.ConeGeometry(0.011, 0.04, 6), s.material(i % 2 ? '#e9e4d2' : '#3f6fb5'), Math.cos(an) * 0.085, 0.94 + Math.sin(an) * 0.035, headZ + 0.012); petal.rotation.z = an - Math.PI / 2; }
      put(lid, new THREE.ConeGeometry(0.02, 0.04, 8, 1, true), s.material('#e9e4d2', { side: THREE.DoubleSide }), 0, 0.966, headZ + 0.046).rotation.x = Math.PI * 0.6;
    }
    if (a.beard && !robbed) { const beard = put(lid, new THREE.CylinderGeometry(0.014, 0.019, 0.085, 10), s.material(a.face === 'gold' ? '#27407e' : '#1c1a1a'), 0, 0.782, surf(0, 0.79) + 0.03); beard.rotation.x = -0.35; }

    // arms
    if (a.arms !== 'sides') {
      for (const side of [-1, 1]) {
        const from = new THREE.Vector3(side * 0.135, 0.685, surf(side * 0.12, 0.685) + 0.006), to = new THREE.Vector3(-side * 0.045, 0.745 + side * 0.012, surf(0.045, 0.75) + 0.012 + (side > 0 ? 0.014 : 0));
        const arm = put(lid, new THREE.CapsuleGeometry(0.024, from.distanceTo(to), 4, 10), a.finish === 'cedar' || a.finish === 'white' ? skinMat : sideMat, ...from.clone().lerp(to, 0.5).toArray());
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        arm.scale.z = 0.6;
        put(lid, new THREE.SphereGeometry(0.031, 12, 10), skinMat, to.x, to.y, to.z + 0.006);
        if (a.arms === 'regalia' && !robbed) {
          const tip = new THREE.Vector3(-side * 0.125, 0.85, surf(0.12, 0.85) + 0.03);
          const base = to.clone().add(new THREE.Vector3(side * 0.03, -0.045, 0.012));
          const staff = put(lid, new THREE.CylinderGeometry(0.0075, 0.0075, base.distanceTo(tip), 8), s.material(side > 0 ? '#2a55a2' : '#e0b040', { metalness: 0.4 }), ...base.clone().lerp(tip, 0.5).toArray());
          staff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(base).normalize());
          if (side > 0) { const hook = put(lid, new THREE.TorusGeometry(0.022, 0.0075, 6, 16, Math.PI * 1.2), gold, tip.x + 0.018, tip.y, tip.z); hook.rotation.z = 0.3; }
          else for (let k = 0; k < 3; k++) { const strand = put(lid, new THREE.CylinderGeometry(0.006, 0.009, 0.09, 6), gold, tip.x + 0.012 + k * 0.016, tip.y - 0.036, tip.z + 0.004); strand.rotation.z = 0.15 + k * 0.16; }
        }
      }
    }

    // story dressing that rides on the lid
    if (a.story === 'garland') {
      const leaves: THREE.Mesh[] = [];
      for (let i = 0; i < 46; i++) {
        const an = i / 46 * Math.PI * 2, r = 0.085 + (random() - 0.5) * 0.012, x = Math.cos(an) * r, t = 0.6 + Math.sin(an) * r * 0.9;
        const flower = i % 6 === 0;
        const leaf = put(lid, new THREE.SphereGeometry(1, 8, 6), s.material(flower ? (random() < 0.5 ? '#5b7fc0' : '#e8dfc4') : mix(0, 1, random()) < 0.5 ? '#6f7d3c' : '#8a8748'), x, t, surf(x, t) + 0.012);
        leaf.scale.set(flower ? 0.016 : 0.02, flower ? 0.016 : 0.011, 0.009); leaf.rotation.z = an + Math.PI / 2; leaves.push(leaf);
      }
    }
    if (a.story === 'pall') put(lid, loft(1, 0.8, (t) => dAt(t) * 1.07 + 0.006, 1.09, 0.0, 0.5 + random() * 0.12), s.material('#e4dcc6', { roughness: 0.95, side: THREE.DoubleSide }));

    // ---- pose ----
    const pose = new THREE.Group();
    pose.add(body);
    const lying = a.pose !== 'standing';
    if (lying) {
      body.rotation.x = -Math.PI / 2;
      body.position.set(0, DEPTH, 0.5);
      pose.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3 - 0.2;
      if (a.pose === 'ajar' || (robbed && a.pose !== 'open')) { lid.position.set(0.12 + random() * 0.05, 0, 0.014); lid.rotation.z = (random() < 0.5 ? -1 : 1) * (0.09 + random() * 0.07); lid.rotation.y = -0.16; }
      if (a.pose === 'open') { lid.position.set(0.37 + random() * 0.05, (random() - 0.5) * 0.1, -DEPTH + 0.004); lid.rotation.z = (random() - 0.5) * 0.3; }
      if (a.pose === 'bier') {
        body.position.y += 0.26;
        const bw = s.material(a.finish === 'black' ? '#1c1916' : '#c79a35', { metalness: 0.4, roughness: 0.45 });
        put(pose, new THREE.BoxGeometry(0.46, 0.035, 1.16), bw, 0, 0.242, 0);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) { const leg = put(pose, new THREE.CylinderGeometry(0.022, 0.03, 0.24, 8), bw, sx * 0.2, 0.12, sz * 0.44 + 0.03); leg.rotation.x = 0.12; put(pose, new THREE.SphereGeometry(0.034, 8, 6), bw, sx * 0.2, 0.02, sz * 0.44 + 0.05).scale.set(1, 0.6, 1.5); }
          put(pose, new THREE.SphereGeometry(0.05, 12, 10), bw, sx * 0.2, 0.3, -0.63).scale.set(1, 1.05, 1.2);
          put(pose, new THREE.BoxGeometry(0.045, 0.03, 0.05), bw, sx * 0.2, 0.285, -0.69);
          for (const e of [-1, 1]) put(pose, new THREE.SphereGeometry(0.016, 6, 5), bw, sx * 0.2 + e * 0.035, 0.345, -0.61);
          const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.2, 0.25, 0.55), new THREE.Vector3(sx * 0.2, 0.33, 0.62), new THREE.Vector3(sx * 0.2, 0.46, 0.6), new THREE.Vector3(sx * 0.2, 0.5, 0.54)]), 12, 0.012, 6), bw);
          tail.castShadow = true; pose.add(tail);
        }
      }
    } else {
      body.rotation.x = -0.06 - random() * 0.04;
      pose.rotation.y = (random() - 0.5) * 0.3;
      if (robbed) { lid.position.set(0.05, 0, 0.01); lid.rotation.z = 0.05; }
    }
    if (a.story === 'museum') {
      const block = s.material('#d8d6cf', { roughness: 0.8 });
      if (lying && a.pose !== 'bier') { body.position.y += 0.07; for (const z of [-0.3, 0.28]) put(pose, new THREE.BoxGeometry(0.42, 0.07, 0.09), block, 0, 0.035, z); }
      else if (!lying) { put(pose, new THREE.BoxGeometry(0.5, 0.05, 0.45), block, 0, -0.02, -0.05); }
    }
    pose.scale.setScalar(H);
    s.root.add(pose);
    if (a.story === 'museum') {
      const card = s.label('No. ' + (100 + Math.floor(random() * 880)), 0.2, 0.09, lying ? [0.1, 0.05, H * 0.24 + 0.2] : [H * 0.3, 0.05, 0.25], '#333333', '#f4f1e8');
      card.rotation.x = -0.9;
    }
    if (robbed) {
      const chips = Array.from({ length: 16 + Math.floor(random() * 10) }, () => {
        const an = random() * Math.PI * 2, r = (0.2 + random() * 0.5) * H * (lying ? 0.6 : 0.4);
        return { at: [Math.cos(an) * r * (lying ? 1.4 : 1), 0.008, Math.sin(an) * r * 0.8 + (lying ? 0 : 0.2)] as [number, number, number], size: 0.02 + random() * 0.045, color: random() < 0.4 ? dull(P.base) : '#7a5a3a' };
      });
      s.scatter(new THREE.BoxGeometry(1, 0.25, 0.45), new THREE.MeshStandardMaterial({ roughness: 0.8 }), chips);
    }
    return s.finish();
  },
});
