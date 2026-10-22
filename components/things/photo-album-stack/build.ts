import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Era = 'sepia' | 'wartime' | 'seventies' | 'nineties' | 'polaroid';
type Damage = 'none' | 'cut-out' | 'scratched' | 'water';
type Rand = () => number;

const ERAS = {
  sepia: 'Around 1900: sepia studio portraits on card mounts, stiff and unsmiling, on black pages.',
  wartime: 'The 1940s: small black-and-white snapshots with white deckle borders, on black pages.',
  seventies: 'The 1970s: square colour prints gone orange, on yellowed pages.',
  nineties: 'The 1990s: glossy colour prints with flash glare and orange date stamps, on white pages.',
  polaroid: 'Instant photos with fat white borders, greenish and soft.',
} as const;
const CAPTIONS = ['Mother, 1923', 'Blackpool', 'Aunt Vi', 'Our wedding', 'Dad & the car', 'Xmas', 'Summer', 'who is this?', 'Tom (left)', 'the old house', 'Baby Jean', 'before the war', 'last one of us all', 'Grandad'];

function figure(ctx: CanvasRenderingContext2D, cx: number, base: number, hgt: number, cloth: string, skin: string, hairColour: string) {
  ctx.fillStyle = cloth; ctx.beginPath();
  ctx.moveTo(cx - hgt * 0.2, base); ctx.lineTo(cx - hgt * 0.17, base - hgt * 0.66); ctx.quadraticCurveTo(cx, base - hgt * 0.78, cx + hgt * 0.17, base - hgt * 0.66); ctx.lineTo(cx + hgt * 0.2, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx, base - hgt * 0.84, hgt * 0.13, 0, 7); ctx.fill();
  ctx.fillStyle = hairColour; ctx.beginPath(); ctx.arc(cx, base - hgt * 0.87, hgt * 0.135, Math.PI, 0); ctx.fill();
}

/** One snapshot, border and all, drawn in true colour and then aged to its era. */
function makePhoto(era: Era, w: number, h: number, random: Rand, damage: Damage, cheer: number, paper: string) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
  const border = era === 'sepia' ? '#d9c8a0' : era === 'seventies' ? '#f1ead6' : '#f6f4ee';
  const m = era === 'sepia' ? w * 0.09 : era === 'nineties' ? 0 : w * 0.055;
  const ix = m, iy = m, iw = w - m * 2, ih = era === 'polaroid' ? h - m * 4.6 : h - m * 2;
  ctx.fillStyle = border; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
  const studio = era === 'sepia';
  const sunny = ['beach', 'group', 'baby', 'wedding', 'car', 'house', 'couple'], solemn = ['portrait', 'couple', 'group', 'house', 'portrait', 'wedding'];
  const kind = studio ? pick(['portrait', 'couple', 'group', 'wedding', 'baby']) : pick(random() < cheer ? sunny : solemn);
  const sky = ctx.createLinearGradient(0, iy, 0, iy + ih); sky.addColorStop(0, studio ? '#8a8a8a' : '#7fb4e6'); sky.addColorStop(1, studio ? '#c9c9c9' : '#d6e6f0');
  ctx.fillStyle = sky; ctx.fillRect(ix, iy, iw, ih);
  const horizon = iy + ih * (kind === 'beach' ? 0.5 : 0.66);
  ctx.fillStyle = studio ? '#5f5a52' : kind === 'beach' ? '#e2cf94' : '#5c9a48'; ctx.fillRect(ix, horizon, iw, ih);
  const cloths = ['#c8322f', '#2f5fb0', '#e3b530', '#f2f0ea', '#2a2a30', '#3f8f6a', '#b05fa8', '#e07a3a'], skins = ['#e9c4a2', '#d9a680', '#f0d2b6', '#b98560'], hairs = ['#2a1d14', '#5a3a1c', '#c9b27a', '#8a8a86', '#15130f'];
  const people: { cx: number; base: number; hgt: number }[] = [];
  const person = (cx: number, base: number, hgt: number, cloth = pick(cloths)) => { figure(ctx, cx, base, hgt, cloth, pick(skins), pick(hairs)); people.push({ cx, base, hgt }); };
  const floor = iy + ih * 1.02;
  if (kind === 'beach') { ctx.fillStyle = '#3f86c0'; ctx.fillRect(ix, horizon - ih * 0.12, iw, ih * 0.12); ctx.fillStyle = '#f6dc6a'; ctx.beginPath(); ctx.arc(ix + iw * 0.8, iy + ih * 0.2, ih * 0.1, 0, 7); ctx.fill(); for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#f2f0ea' : '#c8322f'; ctx.fillRect(ix + iw * 0.06 + i * iw * 0.05, horizon - ih * 0.05, iw * 0.05, ih * 0.3); } for (let i = 0; i < 3; i++) person(ix + iw * (0.45 + i * 0.18), floor - ih * 0.05, ih * (0.42 + random() * 0.2)); }
  else if (kind === 'house') { ctx.fillStyle = '#b06a48'; ctx.fillRect(ix + iw * 0.15, iy + ih * 0.3, iw * 0.55, ih * 0.42); ctx.fillStyle = '#4a3a34'; ctx.beginPath(); ctx.moveTo(ix + iw * 0.1, iy + ih * 0.32); ctx.lineTo(ix + iw * 0.425, iy + ih * 0.08); ctx.lineTo(ix + iw * 0.75, iy + ih * 0.32); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f1ead6'; for (const fx of [0.22, 0.52]) ctx.fillRect(ix + iw * fx, iy + ih * 0.38, iw * 0.11, ih * 0.13); ctx.fillStyle = '#2f4a3a'; ctx.fillRect(ix + iw * 0.385, iy + ih * 0.48, iw * 0.09, ih * 0.24); person(ix + iw * 0.78, floor - ih * 0.08, ih * 0.42); person(ix + iw * 0.9, floor - ih * 0.08, ih * 0.3); }
  else if (kind === 'car') { ctx.fillStyle = pick(['#b03a2e', '#3a6a9a', '#d8d2bd', '#3f6a4a']); ctx.beginPath(); ctx.roundRect(ix + iw * 0.3, iy + ih * 0.52, iw * 0.62, ih * 0.22, ih * 0.06); ctx.fill(); ctx.beginPath(); ctx.roundRect(ix + iw * 0.42, iy + ih * 0.37, iw * 0.34, ih * 0.2, ih * 0.06); ctx.fill(); ctx.fillStyle = '#cfe2ee'; ctx.fillRect(ix + iw * 0.46, iy + ih * 0.41, iw * 0.26, ih * 0.12); ctx.fillStyle = '#1a1a1a'; for (const fx of [0.42, 0.8]) { ctx.beginPath(); ctx.arc(ix + iw * fx, iy + ih * 0.75, ih * 0.08, 0, 7); ctx.fill(); } person(ix + iw * 0.17, floor - ih * 0.1, ih * 0.62); }
  else if (kind === 'baby') { person(ix + iw * 0.3, floor, ih * 0.9); ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.ellipse(ix + iw * 0.68, iy + ih * 0.62, iw * 0.2, ih * 0.12, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(ix + iw * 0.76, iy + ih * 0.56, ih * 0.17, Math.PI, Math.PI * 1.9); ctx.lineTo(ix + iw * 0.76, iy + ih * 0.56); ctx.fill(); ctx.strokeStyle = '#26262c'; ctx.lineWidth = Math.max(2, ih * 0.025); for (const fx of [0.57, 0.8]) { ctx.beginPath(); ctx.arc(ix + iw * fx, iy + ih * 0.84, ih * 0.09, 0, 7); ctx.stroke(); } ctx.fillStyle = '#f2f0ea'; ctx.beginPath(); ctx.arc(ix + iw * 0.62, iy + ih * 0.53, ih * 0.06, 0, 7); ctx.fill(); }
  else if (kind === 'wedding') { const bx = ix + iw * 0.4; ctx.fillStyle = '#f6f4ee'; ctx.beginPath(); ctx.moveTo(bx - iw * 0.26, floor); ctx.lineTo(bx - iw * 0.06, floor - ih * 0.62); ctx.lineTo(bx + iw * 0.06, floor - ih * 0.62); ctx.lineTo(bx + iw * 0.22, floor); ctx.closePath(); ctx.fill(); person(bx, floor - ih * 0.25, ih * 0.68, '#f6f4ee'); person(ix + iw * 0.68, floor, ih * 0.98, '#222226'); ctx.fillStyle = '#d8506a'; ctx.beginPath(); ctx.arc(bx + iw * 0.08, floor - ih * 0.45, ih * 0.05, 0, 7); ctx.fill(); }
  else if (kind === 'portrait') person(ix + iw * 0.5, floor + ih * 0.35, ih * 1.5);
  else if (kind === 'couple') { person(ix + iw * 0.34, floor + ih * 0.1, ih * 1.05); person(ix + iw * 0.66, floor + ih * 0.1, ih * 1.15); }
  else { const n = 3 + Math.floor(random() * 4); for (let i = 0; i < n; i++) person(ix + iw * (0.5 + (i - (n - 1) / 2) * 0.85 / n), floor, ih * (0.55 + random() * 0.3)); }
  if (era === 'sepia') { const v = ctx.createRadialGradient(ix + iw / 2, iy + ih / 2, ih * 0.3, ix + iw / 2, iy + ih / 2, ih * 0.75); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(255,255,255,0.85)'); ctx.fillStyle = v; ctx.fillRect(ix, iy, iw, ih); }
  if (era === 'nineties') { const g = ctx.createRadialGradient(ix + iw * 0.5, iy + ih * 0.45, 0, ix + iw * 0.5, iy + ih * 0.45, ih * 0.5); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih); }
  ctx.restore();
  // age the picture area
  const image = ctx.getImageData(Math.floor(ix), Math.floor(iy), Math.ceil(iw), Math.ceil(ih)), d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], l = 0.3 * r + 0.59 * g + 0.11 * b;
    if (era === 'sepia') { d[i] = 60 + l * 0.72; d[i + 1] = 42 + l * 0.66; d[i + 2] = 22 + l * 0.52; }
    else if (era === 'wartime') { const c = (l - 128) * 1.25 + 128; d[i] = d[i + 1] = c; d[i + 2] = c * 0.97; }
    else if (era === 'seventies') { d[i] = Math.min(255, r * 0.6 + l * 0.3 + 62); d[i + 1] = g * 0.55 + l * 0.3 + 34; d[i + 2] = b * 0.45 + l * 0.25 + 12; }
    else if (era === 'polaroid') { d[i] = r * 0.6 + l * 0.2 + 34; d[i + 1] = g * 0.62 + l * 0.2 + 46; d[i + 2] = b * 0.55 + l * 0.2 + 40; }
  }
  ctx.putImageData(image, Math.floor(ix), Math.floor(iy));
  if (era === 'nineties') { ctx.fillStyle = '#ff8a1e'; ctx.font = `bold ${Math.round(h * 0.085)}px monospace`; ctx.textAlign = 'right'; ctx.fillText(`'9${Math.floor(random() * 9)} ${1 + Math.floor(random() * 12)} ${1 + Math.floor(random() * 27)}`, w - 6, h - 7); }
  // someone removed
  const victim = people.length > 1 || damage === 'scratched' ? people[Math.floor(random() * people.length)] : null;
  if (victim && damage === 'cut-out') {
    ctx.fillStyle = paper; ctx.beginPath();
    const { cx, base, hgt } = victim;
    for (let k = 0; k < 14; k++) { const t = k / 14 * 6.283, rx = hgt * 0.25 * (0.9 + random() * 0.25), ry = hgt * 0.56 * (0.92 + random() * 0.16); ctx.lineTo(cx + Math.cos(t) * rx, base - hgt * 0.5 + Math.sin(t) * ry); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (victim && damage === 'scratched') {
    ctx.strokeStyle = '#f6f2e6'; ctx.lineWidth = Math.max(1.5, h * 0.016); ctx.beginPath();
    for (let k = 0; k < 16; k++) { const x = victim.cx + (random() - 0.5) * victim.hgt * 0.36, y = victim.base - victim.hgt * 0.84 + (random() - 0.5) * victim.hgt * 0.34; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  return canvas;
}

export default defineThing({
  questions: {
    era: choice('When were the photographs in the open album taken?', ERAS),
    missing: score('How many photographs are missing from their corners?', ['None, every one in place', 'One gap', 'Several gone', 'Nearly all of them taken out']),
    damage: choice('What has been done to the pictures?', {
      none: 'Nothing: they are intact.',
      'cut-out': 'One person has been carefully cut out of every picture they were in.',
      scratched: 'A face has been scratched away to white.',
      water: 'Water got in: brown tide marks across the pages.',
    }),
    covers: choice('What are the albums bound in?', {
      leatherette: 'Padded burgundy, navy and green leatherette with gilt bands.',
      floral: 'Seventies vinyl in orange and brown flowers.',
      black: 'Plain black ring binders with handwritten year labels.',
      wedding: 'White padded satin and silver, the wedding album on top.',
      mixed: 'A mismatched pile gathered over generations.',
    }),
    shoebox: choice('What state is the shoebox of loose prints in?', {
      neat: 'Lid off, prints filed upright in a tidy row.',
      overflowing: 'Crammed past the brim and spilling onto the floor.',
      lidded: 'Lid still on, held with a rubber band, not yet opened.',
      absent: 'There is no shoebox, only the albums.',
    }),
    left: choice('What has been left lying on the open page?', {
      glasses: 'A pair of reading glasses.',
      magnifier: 'A magnifying glass, for making out a face.',
      print: 'One loose photograph pulled out and set down across the page.',
      nothing: 'Nothing.',
    }),
    captions: noul('Are there handwritten captions under the photographs?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const era = a.era as Era, damage = a.damage as Damage;
    const darkPage = era === 'sepia' || era === 'wartime';
    const paperBase = new THREE.Color(darkPage ? '#1f1d1e' : era === 'nineties' ? '#efede6' : '#e6d9b4').lerp(new THREE.Color(darkPage ? '#3a3530' : '#c9b683'), mood.wear * 0.5);
    const paper = `#${paperBase.getHexString()}`;
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const textureOf = (canvas: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const W = 0.38, D = 0.33;

    // ---- album covers
    type Style = 'leatherette' | 'floral' | 'black' | 'wedding';
    const styleOf = (index: number, top: boolean): Style => a.covers === 'mixed' ? pick(['leatherette', 'floral', 'black', 'wedding', 'leatherette'] as const) : a.covers === 'wedding' ? (top ? 'wedding' : pick(['leatherette', 'wedding', 'black'] as const)) : a.covers;
    const floralTexture = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d')!; ctx.fillStyle = '#b5601f'; ctx.fillRect(0, 0, 128, 128); for (let i = 0; i < 9; i++) { const x = (i % 3) * 43 + 21, y = Math.floor(i / 3) * 43 + 21 + (i % 2) * 8; ctx.fillStyle = i % 2 ? '#f0c23a' : '#f1e6c4'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.047) * 10, y + Math.sin(k * 1.047) * 10, 8, 0, 7); ctx.fill(); } ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); } const t = textureOf(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
    const coverMaterial = (style: Style) => style === 'floral' ? new THREE.MeshStandardMaterial({ map: floralTexture, roughness: 0.45 })
      : s.material(style === 'leatherette' ? pick(['#5e1a24', '#1f2c4a', '#1f3d2c', '#4a2f1c']) : style === 'black' ? '#1c1c1f' : '#f1ede4', { roughness: style === 'wedding' ? 0.4 : 0.6 });
    const gilt = new THREE.MeshStandardMaterial({ color: '#c9a046', metalness: 0.7, roughness: 0.35 });
    const silver = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.7, roughness: 0.3 });
    const leaf = s.material(darkPage ? '#2a2727' : '#e9dfc4', { roughness: 0.95 });

    /** A closed album, spine to the front (+z), sitting on y = 0 of its group. */
    const closedAlbum = (thickness: number, style: Style, width = W, depth = D) => {
      const group = new THREE.Group(), cover = coverMaterial(style);
      put(group, new THREE.BoxGeometry(width, 0.009, depth), cover, [0, 0.0045, 0]);
      put(group, new THREE.BoxGeometry(width, 0.009, depth), cover, [0, thickness - 0.0045, 0]);
      put(group, new THREE.BoxGeometry(width - 0.024, thickness - 0.018, depth - 0.02), leaf, [0, thickness / 2, -0.008]);
      const spine = put(group, new THREE.CylinderGeometry(thickness / 2, thickness / 2, width, 14), cover, [0, thickness / 2, depth / 2 - 0.004]); spine.rotation.z = Math.PI / 2;
      const front = depth / 2 + thickness / 2 - 0.003;
      if (style === 'leatherette') for (const x of [-0.11, -0.09, 0.09, 0.11]) put(group, new THREE.BoxGeometry(0.006, thickness * 0.9, 0.004), gilt, [x * width / W, thickness / 2, front]);
      if (style === 'black') { const label = s.label(String(1950 + Math.floor(random() * 45)), 0.09, Math.min(0.035, thickness * 0.6), [0, 0, 0], '#27304a', '#efe9d6'); group.add(label); label.position.set((random() - 0.5) * 0.1, thickness / 2, front + 0.002); label.castShadow = false; }
      if (style === 'wedding') put(group, new THREE.BoxGeometry(width * 0.5, thickness * 0.3, 0.004), silver, [0, thickness / 2, front]);
      return group;
    };

    // ---- the stack
    const count = 2 + Math.round(mood.density * 3 + random() * 0.8);
    let top = 0;
    for (let i = 0; i < count; i++) {
      const thickness = 0.045 + random() * 0.03;
      const album = closedAlbum(thickness, styleOf(i, i === count - 1));
      album.position.set((random() - 0.5) * 0.04, top, (random() - 0.5) * 0.04); album.rotation.y = (random() - 0.5) * 0.3;
      s.root.add(album); top += thickness + 0.001;
    }

    // ---- the open album
    const pageTexture = (side: number) => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 464;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, 464);
      const shade = ctx.createLinearGradient(side < 0 ? 512 : 0, 0, side < 0 ? 420 : 92, 0); shade.addColorStop(0, 'rgba(0,0,0,0.35)'); shade.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 512, 464);
      const landscape = era === 'polaroid' ? false : random() < 0.6;
      const slots = random() < 0.5
        ? [[34, 26], [274, 26], [34, 242], [274, 242]].map(([x, y]) => ({ x, y, w: 204, h: 188 }))
        : [{ x: 30, y: 30, w: 270, h: 250 }, { x: 318, y: 40, w: 168, h: 170 }, { x: 318, y: 250, w: 168, h: 170 }, { x: 40, y: 300, w: 240, h: 140 }];
      const gone = a.missing ** 1.2 * 0.95;
      slots.forEach((slot, index) => {
        const tall = era === 'polaroid' || (index % 2 ? !landscape : landscape) === false;
        let w = tall ? slot.h * 0.74 : slot.w * 0.92, h = tall ? slot.h * 0.9 : slot.w * 0.92 * 0.7;
        if (era === 'seventies') w = h = Math.min(slot.w, slot.h) * 0.86;
        const fit = Math.min(1, (slot.w - 8) / w, (slot.h - 26) / h); w *= fit; h *= fit;
        const cx = slot.x + slot.w / 2, cy = slot.y + (slot.h - 22) / 2, tilt = (random() - 0.5) * 0.09;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
        const absent = random() < gone;
        if (absent) {
          ctx.fillStyle = darkPage ? 'rgba(0,0,0,0.5)' : 'rgba(150,120,60,0.28)'; ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = darkPage ? 'rgba(255,255,255,0.14)' : 'rgba(90,70,30,0.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
          ctx.drawImage(makePhoto(era, Math.round(w), Math.round(h), random, damage, mood.cheer, paper), -w / 2, -h / 2);
          ctx.shadowColor = 'transparent';
        }
        if (era !== 'nineties') { ctx.fillStyle = darkPage ? '#cdb98a' : '#2a2622'; const c = 15; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(sx * (w / 2 + 3), sy * (h / 2 + 3)); ctx.lineTo(sx * (w / 2 + 3 - c), sy * (h / 2 + 3)); ctx.lineTo(sx * (w / 2 + 3), sy * (h / 2 + 3 - c)); ctx.closePath(); ctx.fill(); } }
        ctx.restore();
        if (a.captions && random() < 0.8) { ctx.fillStyle = darkPage ? '#efe9d8' : '#2a3f8a'; ctx.font = 'italic 19px serif'; ctx.textAlign = 'center'; ctx.fillText(pick(CAPTIONS), cx, slot.y + slot.h - 2, slot.w); }
      });
      if (damage === 'water' || mood.wear > 0.7) for (let i = 0; i < (damage === 'water' ? 4 : 1); i++) {
        const x = random() * 512, y = random() * 464, r = 70 + random() * 110;
        const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r); g.addColorStop(0, 'rgba(120,90,40,0.16)'); g.addColorStop(0.88, 'rgba(110,80,36,0.3)'); g.addColorStop(0.95, 'rgba(84,56,22,0.62)'); g.addColorStop(1, 'rgba(84,56,22,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      return textureOf(canvas);
    };
    const open = new THREE.Group();
    const tilt = 0.42;
    open.position.set((random() - 0.5) * 0.03, top + 0.004, D / 2 - 0.01); open.rotation.x = tilt; open.rotation.y = (random() - 0.5) * 0.16; open.rotation.order = 'YXZ';
    s.root.add(open);
    const openStyle = styleOf(count, true), openCover = coverMaterial(openStyle);
    const split = mix(0.3, 0.7, random()), pagesTotal = 0.05;
    for (const side of [-1, 1]) {
      const half = new THREE.Group(); half.rotation.z = side * 0.04; open.add(half);
      const thickness = Math.max(0.008, pagesTotal * (side < 0 ? split : 1 - split));
      put(half, new THREE.BoxGeometry(W, 0.009, D), openCover, [side * W / 2, 0.0045, -D / 2]);
      put(half, new THREE.BoxGeometry(W - 0.016, thickness, D - 0.02), leaf, [side * (W - 0.016) / 2, 0.009 + thickness / 2, -D / 2]);
      const page = put(half, new THREE.PlaneGeometry(W - 0.016, D - 0.02), new THREE.MeshStandardMaterial({ map: pageTexture(side), roughness: era === 'nineties' ? 0.5 : 0.9 }), [side * (W - 0.016) / 2, 0.009 + thickness + 0.0012, -D / 2]);
      page.rotation.x = -Math.PI / 2; page.castShadow = false;
      if (side > 0) {
        const y = 0.009 + thickness + 0.004, px = W * 0.5, pz = -D * 0.42;
        if (a.left === 'glasses') {
          const frame = s.material('#3a2a1c', { roughness: 0.4 }), lens = new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05 });
          const g = new THREE.Group(); g.position.set(px, y + 0.004, pz); g.rotation.y = (random() - 0.5) * 1.2; half.add(g);
          for (const e of [-1, 1]) { const rim = put(g, new THREE.TorusGeometry(0.026, 0.004, 6, 20), frame, [e * 0.033, 0.02, 0]); rim.rotation.x = -0.25; const glass = put(g, new THREE.CircleGeometry(0.025, 16), lens, [e * 0.033, 0.02, 0]); glass.rotation.x = -0.25; glass.castShadow = false; const arm = put(g, new THREE.BoxGeometry(0.004, 0.004, 0.12), frame, [e * 0.06, 0.012, -0.06]); arm.rotation.x = 0.12; }
          put(g, new THREE.BoxGeometry(0.016, 0.004, 0.004), frame, [0, 0.026, 0]);
        } else if (a.left === 'magnifier') {
          const g = new THREE.Group(); g.position.set(px - 0.02, y + 0.008, pz + 0.02); g.rotation.y = 0.6 + random(); half.add(g);
          const rim = put(g, new THREE.TorusGeometry(0.045, 0.006, 8, 24), gilt); rim.rotation.x = Math.PI / 2;
          const glass = put(g, new THREE.CircleGeometry(0.044, 20), new THREE.MeshStandardMaterial({ color: '#e6f4f6', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.02 })); glass.rotation.x = -Math.PI / 2; glass.castShadow = false;
          const handle = put(g, new THREE.CylinderGeometry(0.009, 0.011, 0.1, 10), s.material('#2a1c14', { roughness: 0.4 }), [0.098, 0, 0]); handle.rotation.z = Math.PI / 2;
        } else if (a.left === 'print') {
          const print = put(half, new THREE.PlaneGeometry(0.14, 0.1), new THREE.MeshStandardMaterial({ map: textureOf(makePhoto(era, 196, 140, random, 'none', mood.cheer, paper)), roughness: 0.6, side: THREE.DoubleSide }), [px - 0.03, y + 0.003, pz + 0.03]);
          print.rotation.set(-Math.PI / 2 + 0.05, 0, 0.5 + random() * 0.6);
        }
      }
    }
    // what props the open album up at the back
    const wedge = closedAlbum(0.05 + D * Math.sin(tilt) * 0.55 - 0.05, 'black', 0.24, 0.13);
    wedge.position.set((random() - 0.5) * 0.1, top, -D * 0.22); wedge.rotation.y = (random() - 0.5) * 0.4; s.root.add(wedge);

    // ---- loose prints, and the shoebox they came from
    const looseTextures = Array.from({ length: 4 }, () => textureOf(makePhoto(era === 'sepia' ? pick(['sepia', 'wartime'] as const) : era, 168, 120, random, 'none', mood.cheer, paper)));
    const back = s.material('#eee9db', { roughness: 0.8 });
    const loosePrint = (at: P3, flat: boolean) => {
      const faceUp = random() < 0.75;
      const print = put(s.root, new THREE.BoxGeometry(0.125, 0.0016, 0.09), back, at);
      print.rotation.set(flat ? 0 : (random() - 0.5) * 0.4, random() * 6.3, flat ? 0 : (random() - 0.5) * 0.4);
      if (faceUp) { const image = put(print, new THREE.PlaneGeometry(0.125, 0.09), new THREE.MeshStandardMaterial({ map: pick(looseTextures), roughness: 0.55 }), [0, 0.0012, 0]); image.rotation.x = -Math.PI / 2; image.castShadow = false; }
    };
    if (a.shoebox !== 'absent') {
      const BW = 0.31, BD = 0.19, BH = 0.115, t = 0.004;
      const box = new THREE.Group(); box.position.set(0.44, 0, 0.02 + random() * 0.06); box.rotation.y = -0.35 + (random() - 0.5) * 0.4; s.root.add(box);
      const cardboard = s.material(pick(['#8c6a4a', '#3f5a7a', '#a8482f', '#d9d2c0', '#2c2c30']), { roughness: 0.85 });
      const inside = s.material('#b7a384', { roughness: 0.95 });
      put(box, new THREE.BoxGeometry(BW, t, BD), cardboard, [0, t / 2, 0]);
      for (const z of [-1, 1]) put(box, new THREE.BoxGeometry(BW, BH, t), cardboard, [0, BH / 2, z * (BD - t) / 2]);
      for (const x of [-1, 1]) put(box, new THREE.BoxGeometry(t, BH, BD), cardboard, [x * (BW - t) / 2, BH / 2, 0]);
      put(box, new THREE.BoxGeometry(BW - 0.01, 0.002, BD - 0.01), inside, [0, t + 0.001, 0]);
      const tag = s.label(pick(['PHOTOS', 'LOOSE', 'MISC ' + (1950 + Math.floor(random() * 40)), 'SORT LATER', 'MUM']), 0.12, 0.05, [0, 0, 0], '#27304a', '#f1ead6'); box.add(tag); tag.position.set(0.02, BH * 0.5, BD / 2 + 0.0015); tag.rotation.z = (random() - 0.5) * 0.1; tag.castShadow = false;
      const lid = new THREE.Group(); box.add(lid);
      put(lid, new THREE.BoxGeometry(BW + 0.012, t, BD + 0.012), cardboard, [0, 0.03, 0]);
      for (const z of [-1, 1]) put(lid, new THREE.BoxGeometry(BW + 0.012, 0.03, t), cardboard, [0, 0.015, z * (BD + 0.012 - t) / 2]);
      for (const x of [-1, 1]) put(lid, new THREE.BoxGeometry(t, 0.03, BD + 0.012), cardboard, [x * (BW + 0.012 - t) / 2, 0.015, 0]);
      if (a.shoebox === 'lidded') {
        lid.position.y = BH - 0.027;
        const bandMaterial = s.material('#b5452f', { roughness: 0.6 });
        put(box, new THREE.BoxGeometry(0.008, BH + 0.012, BD + 0.022), bandMaterial, [BW * 0.2, BH / 2 + 0.004, 0]);
        loosePrint([0.44 - 0.05, BH + 0.008 + 0.002, 0.14], true);
      } else {
        lid.position.set(-0.03, 0.001, -BD - 0.03); lid.rotation.set(0, 0.25, 0); lid.rotation.x = Math.PI; lid.position.y = 0.033;
        const n = a.shoebox === 'neat' ? 26 : 34;
        const edges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0022, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
        const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < n; i++) {
          const messy = a.shoebox === 'overflowing';
          const height = (messy ? 0.1 : 0.085) + random() * (messy ? 0.05 : 0.02), width = 0.12 + random() * 0.04;
          e.set((random() - 0.5) * (messy ? 0.5 : 0.08), (random() - 0.5) * (messy ? 0.5 : 0.06), (random() - 0.5) * (messy ? 0.5 : 0.2) - 0.12); q.setFromEuler(e);
          matrix.compose(new THREE.Vector3(-BW / 2 + 0.025 + (i / (n - 1)) * (BW - 0.05), t + height / 2 + (messy ? random() * 0.03 : 0), (random() - 0.5) * 0.02), q, new THREE.Vector3(1, height, width));
          edges.setMatrixAt(i, matrix); edges.setColorAt(i, new THREE.Color(pick(['#f1eee4', '#e6dcc0', '#d9c8a0', '#f6f4ee', '#c9b98f', '#b9cbd6', '#d9a98a'])));
        }
        edges.castShadow = true; box.add(edges);
        if (a.shoebox === 'neat') for (const x of [-0.06, 0.05]) put(box, new THREE.BoxGeometry(0.003, 0.115, BD - 0.02), s.material('#d98a3a'), [x, t + 0.0575, 0]);
      }
    }
    const scattered = Math.round((a.shoebox === 'overflowing' ? 9 : a.shoebox === 'absent' ? 4 : 2) * mix(0.5, 1.3, mood.density));
    for (let i = 0; i < scattered; i++) loosePrint([-0.26 + random() * 0.6, 0.002 + i * 0.0018, D / 2 + 0.1 + random() * 0.2], true);

    return s.finish();
  },
});
