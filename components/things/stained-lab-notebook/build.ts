import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
type Rnd = () => number;
type Ctx = CanvasRenderingContext2D;
const PW = 384, PH = 512;

/** A line of wordless handwriting. */
function scrawl(ctx: Ctx, x: number, y: number, width: number, r: Rnd, size = 5) {
  let cx = x;
  ctx.beginPath();
  while (cx < x + width) {
    const word = 14 + r() * 38;
    ctx.moveTo(cx, y);
    for (let px = cx; px < Math.min(cx + word, x + width); px += 3) ctx.lineTo(px, y + (r() - 0.5) * size * 2 - (r() < 0.12 ? size * 1.6 : 0));
    cx += word + 9;
  }
  ctx.stroke();
}
function strike(ctx: Ctx, x: number, y: number, w: number, h: number, r: Rnd) {
  ctx.beginPath();
  for (let i = 0; i < 9; i++) { ctx.moveTo(x + r() * 8, y + (i / 9) * h); ctx.lineTo(x + w - r() * 8, y + (i / 9) * h + (r() - 0.5) * h * 0.6); }
  ctx.stroke();
}
function hexagon(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) ctx.lineTo(x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * s, y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * s);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, Math.PI * 2); ctx.stroke();
}
const EQUATIONS = ['2H₂ + O₂ → 2H₂O', 'PV = nRT', 'CuSO₄·5H₂O', 'ΔG = ΔH − TΔS', 'pH = −log[H⁺]', 'C₆H₁₂O₆', 'E = mc²', 'NaCl + AgNO₃ →', 'k = Ae^(−Ea/RT)', 'n = m / M'];

function paintPage(side: 0 | 1, content: string, last: string, stains: string, paper: string, ink: string, wear: number, r: Rnd, torn: boolean, ruling: string, annotations: string) {
  const canvas = document.createElement('canvas');
  canvas.width = PW; canvas.height = PH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, PW, PH);
  // Shadow into the gutter.
  const gx = side === 0 ? PW : 0;
  const shade = ctx.createLinearGradient(gx, 0, side === 0 ? PW - 70 : 70, 0);
  shade.addColorStop(0, 'rgba(60,50,30,0.35)'); shade.addColorStop(1, 'rgba(60,50,30,0)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, PW, PH);
  // Feint rules and a margin.
  ctx.strokeStyle = 'rgba(90,130,170,0.35)'; ctx.lineWidth = 1;
  if (ruling === 'lined' || ruling === 'grid') for (let y = 60; y < PH - 10; y += ruling === 'grid' ? 20 : 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PW, y); ctx.stroke(); }
  if (ruling === 'grid') for (let x = 4; x < PW; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, PH); ctx.stroke(); }
  if (ruling === 'dots') {
    ctx.fillStyle = 'rgba(90,130,170,0.55)';
    for (let y = 20; y < PH; y += 20) for (let x = 14; x < PW; x += 20) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill(); }
  }
  if (ruling !== 'plain') {
    ctx.strokeStyle = 'rgba(200,70,70,0.4)';
    ctx.beginPath(); ctx.moveTo(side === 0 ? 46 : PW - 46, 0); ctx.lineTo(side === 0 ? 46 : PW - 46, PH); ctx.stroke();
  }

  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  const L = 58, W = PW - 100;
  const blankRight = torn && side === 1;
  if (blankRight) {
    scrawl(ctx, L, 80, W * 0.5, r);
  } else if (content === 'formulae') {
    ctx.font = 'italic 25px Georgia, serif';
    let y = 84;
    for (let i = 0; i < 6; i++) {
      if (r() < 0.55) { ctx.fillText(EQUATIONS[Math.floor(r() * EQUATIONS.length)], L + r() * 30, y + 6); if (r() < 0.3) strike(ctx, L, y - 12, 200, 16, r); y += 52; } else { scrawl(ctx, L, y, W, r); scrawl(ctx, L, y + 26, W * (0.4 + r() * 0.6), r); y += 62; }
    }
    hexagon(ctx, L + 60, PH - 95, 34); hexagon(ctx, L + 119, PH - 95, 34);
    ctx.beginPath(); ctx.moveTo(L + 170, PH - 95); ctx.lineTo(L + 235, PH - 95); ctx.lineTo(L + 222, PH - 104); ctx.moveTo(L + 235, PH - 95); ctx.lineTo(L + 222, PH - 86); ctx.stroke();
    ctx.fillText('?', L + 252, PH - 86);
  } else if (content === 'sketches') {
    const bx = L + 90 + r() * 60, by = 250;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx - 18, by - 110); ctx.lineTo(bx - 18, by - 50); ctx.lineTo(bx - 70, by + 50); ctx.lineTo(bx + 70, by + 50); ctx.lineTo(bx + 18, by - 50); ctx.lineTo(bx + 18, by - 110); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 52, by + 14); ctx.bezierCurveTo(bx - 20, by + 4, bx + 20, by + 24, bx + 52, by + 14); ctx.stroke();
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(bx - 40 + r() * 80, by + 22 + r() * 22, 3 + r() * 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(bx - 80, by + 62); ctx.lineTo(bx + 80, by + 62); ctx.moveTo(bx - 60, by + 62); ctx.lineTo(bx - 76, by + 150); ctx.moveTo(bx + 60, by + 62); ctx.lineTo(bx + 76, by + 150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 8, by + 150); ctx.lineTo(bx - 8, by + 100); ctx.quadraticCurveTo(bx, by + 66, bx + 8, by + 100); ctx.lineTo(bx + 8, by + 150); ctx.stroke();
    ctx.lineWidth = 1.6;
    for (const [fx, fy, tx, ty] of [[bx + 40, by - 20, bx + 110, by - 60], [bx + 12, by + 110, bx + 100, by + 130], [bx - 30, by + 30, bx - 110, by - 20]]) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); scrawl(ctx, Math.min(tx, PW - 90), ty - 6, 60, r, 3); }
    ctx.lineWidth = 3.2;
    scrawl(ctx, L, 84, W, r); scrawl(ctx, L, 110, W * 0.7, r); scrawl(ctx, L, PH - 50, W * 0.8, r);
  } else if (content === 'frantic') {
    ctx.lineWidth = 2.8;
    for (let y = 70; y < PH - 30; y += 22) {
      ctx.save(); ctx.translate(0, y); ctx.rotate((r() - 0.5) * 0.09);
      scrawl(ctx, L - 20 + r() * 20, 0, W + 20, r, 7);
      if (r() < 0.4) strike(ctx, L + r() * 100, -9, 90 + r() * 120, 14, r);
      ctx.restore();
    }
    ctx.font = 'bold 54px Georgia, serif';
    ctx.save(); ctx.translate(L + 60 + r() * 60, 200 + r() * 150); ctx.rotate(-0.25 + r() * 0.3); ctx.fillText(side === 0 ? 'NO' : 'AGAIN', 0, 0); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(170, 6); ctx.moveTo(-2, 22); ctx.lineTo(160, 18); ctx.stroke(); ctx.restore();
    ctx.font = 'bold 40px Georgia, serif';
    for (let i = 0; i < 3; i++) ctx.fillText('!', 14 + (side === 0 ? 0 : PW - 46), 120 + i * 130 + r() * 40);
  } else if (content === 'table') {
    scrawl(ctx, L, 80, W * 0.7, r);
    ctx.lineWidth = 2;
    const top = 108, rows = 7, cols = 4, cw = W / cols, rh = 26;
    for (let i = 0; i <= rows; i++) { ctx.beginPath(); ctx.moveTo(L, top + i * rh); ctx.lineTo(L + W, top + i * rh); ctx.stroke(); }
    for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(L + i * cw, top); ctx.lineTo(L + i * cw, top + rows * rh); ctx.stroke(); }
    ctx.font = 'italic 17px Georgia, serif';
    for (let i = 1; i < rows; i++) for (let j = 0; j < cols; j++) if (r() < 0.85) ctx.fillText((j === 0 ? i : (r() * 40 + i * 3)).toFixed(j === 0 ? 0 : 1), L + j * cw + 10, top + i * rh + 19);
    const gx0 = L + 20, gy0 = PH - 50, gw = W - 40, gh = 150;
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx0, gy0 - gh); ctx.lineTo(gx0, gy0); ctx.lineTo(gx0 + gw, gy0); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const px = gx0 + (i / 8) * gw * 0.95, py = gy0 - gh * (1 - Math.exp(-i / 2.6)) * 0.9 + (r() - 0.5) * 10; ctx.moveTo(px - 4, py - 4); ctx.lineTo(px + 4, py + 4); ctx.moveTo(px + 4, py - 4); ctx.lineTo(px - 4, py + 4); }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.quadraticCurveTo(gx0 + gw * 0.25, gy0 - gh * 0.95, gx0 + gw * 0.95, gy0 - gh * 0.86); ctx.stroke();
  } else {
    scrawl(ctx, L, 80, W, r); scrawl(ctx, L, 106, W * 0.5, r);
    ctx.lineWidth = 2.6;
    const cx = L + 70, cy = 210;
    ctx.beginPath(); for (let t = 0; t < 22; t += 0.2) ctx.lineTo(cx + Math.cos(t) * t * 2.6, cy + Math.sin(t) * t * 2.6); ctx.stroke();
    const star = (sx: number, sy: number, s: number) => { ctx.beginPath(); for (let i = 0; i <= 5; i++) ctx.lineTo(sx + Math.cos(i * 4 * Math.PI / 5 - Math.PI / 2) * s, sy + Math.sin(i * 4 * Math.PI / 5 - Math.PI / 2) * s); ctx.stroke(); };
    for (let i = 0; i < 5; i++) star(L + 170 + r() * 110, 150 + r() * 120, 10 + r() * 16);
    const hx = L + 200, hy = 350;
    ctx.beginPath(); ctx.moveTo(hx, hy + 44); ctx.bezierCurveTo(hx - 70, hy - 6, hx - 30, hy - 50, hx, hy - 14); ctx.bezierCurveTo(hx + 30, hy - 50, hx + 70, hy - 6, hx, hy + 44); ctx.stroke();
    ctx.font = 'italic 20px Georgia, serif'; ctx.fillText('J + R', hx - 24, hy + 10);
    const tx = L + 20, ty = 320;
    ctx.beginPath(); for (const k of [1, 2]) { ctx.moveTo(tx + k * 30, ty); ctx.lineTo(tx + k * 30, ty + 90); ctx.moveTo(tx, ty + k * 30); ctx.lineTo(tx + 90, ty + k * 30); } ctx.stroke();
    ctx.font = 'bold 24px Georgia, serif'; for (let i = 0; i < 5; i++) ctx.fillText(i % 2 ? 'X' : 'O', tx + 6 + Math.floor(r() * 3) * 30, ty + 24 + Math.floor(r() * 3) * 30);
    ctx.font = 'bold 34px Georgia, serif'; ctx.fillText('BORED', L + 40, PH - 40);
  }

  if (annotations !== 'none') {
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = '#46734b'; ctx.lineWidth = 2;
    if (annotations === 'arrows') for (let i = 0; i < 3; i++) {
      const y = 125 + i * 103;
      ctx.beginPath(); ctx.moveTo(20, y - 18); ctx.quadraticCurveTo(56, y - 28, 90, y); ctx.lineTo(77, y - 1); ctx.moveTo(90, y); ctx.lineTo(86, y - 13); ctx.stroke();
    }
    if (annotations === 'marginal') for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(PW - 24, 90 + i * 93); ctx.rotate(-Math.PI / 2); scrawl(ctx, 0, 0, 62, r, 3); ctx.restore();
    }
    if (annotations === 'revision') {
      ctx.font = 'bold 19px Georgia, serif'; ctx.fillText('REPEAT  /  CHECK', 55, 36);
      ctx.lineWidth = 3; ctx.strokeRect(43, 12, 287, 35);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(PW - 30, 170 + i * 87, 10, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  // The last thing written, in red.
  if (side === 1 && last !== 'nothing') {
    ctx.strokeStyle = ctx.fillStyle = '#b3201c'; ctx.lineWidth = 5;
    if (last === 'cross') {
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(PW - 50, PH - 40); ctx.moveTo(PW - 50, 60); ctx.lineTo(46, PH - 50); ctx.stroke();
    } else {
      const text = { eureka: 'EUREKA!', why: 'WHY?', works: 'it works', sorry: "I'm sorry", day: 'Day 112' }[last] ?? '';
      ctx.fillStyle = paper; ctx.globalAlpha = 0.8; ctx.fillRect(40, PH - 150, PW - 70, 104); ctx.globalAlpha = 1; ctx.fillStyle = '#b3201c';
      ctx.font = 'italic bold 56px Georgia, serif'; ctx.textAlign = 'center';
      ctx.save(); ctx.translate(PW / 2 + 10, PH - 86); ctx.rotate(-0.07); ctx.fillText(text, 0, 0, PW - 90);
      if (last === 'eureka') { ctx.beginPath(); ctx.ellipse(0, -18, 160, 46, 0, 0, Math.PI * 2); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(-120, 16); ctx.lineTo(120, 12); ctx.stroke(); }
      ctx.restore(); ctx.textAlign = 'left';
    }
  }

  // Stains.
  const n = 1 + Math.round(wear * 3) + (r() < 0.5 ? 1 : 0);
  if (stains === 'coffee') for (let i = 0; i < n; i++) {
    const x = 60 + r() * (PW - 120), y = 70 + r() * (PH - 140), rad = 42 + r() * 16;
    ctx.strokeStyle = 'rgba(110,70,30,0.55)'; ctx.lineWidth = 6 + r() * 4; ctx.beginPath(); ctx.arc(x, y, rad, r() * 2, r() * 2 + 4.6 + r() * 1.6); ctx.stroke();
    ctx.fillStyle = 'rgba(140,95,45,0.14)'; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  } else if (stains === 'burns') for (let i = 0; i < n + 2; i++) {
    const x = 40 + r() * (PW - 80), y = 50 + r() * (PH - 100), rad = 12 + r() * 26;
    const g = ctx.createRadialGradient(x, y, rad * 0.35, x, y, rad * 1.5);
    g.addColorStop(0, '#15110d'); g.addColorStop(0.42, '#15110d'); g.addColorStop(0.5, '#5a3414'); g.addColorStop(0.7, 'rgba(190,140,40,0.7)'); g.addColorStop(1, 'rgba(210,180,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rad * 1.5, rad * (1.1 + r() * 0.5), r() * 3, 0, Math.PI * 2); ctx.fill();
  } else if (stains === 'ink') {
    const x = side === 0 ? PW - 90 - r() * 80 : 70 + r() * 80, y = 150 + r() * 220;
    ctx.fillStyle = '#141a3a';
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 70, y + (r() - 0.5) * 70, 22 + r() * 30, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 26; i++) { const t = r() * 6.28, d = 70 + r() * 110; ctx.beginPath(); ctx.arc(x + Math.cos(t) * d, y + Math.sin(t) * d, 1.5 + r() * 6, 0, Math.PI * 2); ctx.fill(); }
  } else if (stains === 'water') for (let i = 0; i < n + 1; i++) {
    const x = r() * PW, y = r() * PH, rad = 60 + r() * 70;
    ctx.fillStyle = 'rgba(150,130,80,0.13)'; ctx.strokeStyle = 'rgba(120,100,60,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let t = 0; t <= 6.3; t += 0.3) ctx.lineTo(x + Math.cos(t) * rad * (0.8 + r() * 0.3), y + Math.sin(t) * rad * (0.8 + r() * 0.3)); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (stains === 'scorched') {
    const cx = side === 0 ? 0 : PW, cy = PH;
    const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, 250 + wear * 80);
    g.addColorStop(0, '#0d0b0a'); g.addColorStop(0.5, '#1a130e'); g.addColorStop(0.68, '#6a3d16'); g.addColorStop(0.85, 'rgba(190,140,50,0.55)'); g.addColorStop(1, 'rgba(200,170,90,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function marbled(r: Rnd) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#17171a'; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#eeeee6';
  for (let i = 0; i < 520; i++) { ctx.beginPath(); ctx.ellipse(r() * 256, r() * 256, 2 + r() * 7, 1 + r() * 3, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    ruling: choice('What printed guides are on the pages?', {
      lined: 'Faint horizontal lines with a red margin.',
      grid: 'Fine square graph ruling for figures and measurements.',
      dots: 'An understated regular dot grid.',
      plain: 'Unruled paper for freehand notes and drawings.',
    }),
    annotations: choice('What later annotations accompany the writing?', {
      none: 'The original writing stands alone.',
      arrows: 'Green curved arrows point to passages worth revisiting.',
      marginal: 'Small sideways notes crowd the outside margins.',
      revision: 'A green REPEAT / CHECK heading and circled items mark a revision.',
    }),
    insert: choice('What loose insert is kept with the notebook?', {
      none: 'No loose insert.',
      graph: 'A small graph slip peeks over the top edge.',
      blotter: 'A pink blotting sheet protrudes from the lower pages.',
      photograph: 'A small monochrome specimen photograph is tucked above the pages.',
    }),
    markers: choice('How are useful pages marked?', {
      none: 'No added page markers.',
      tabs: 'Three coloured index tabs project from the fore-edge.',
      clips: 'Small brass paper clips grip two page edges.',
      thread: 'A long blue thread trails out from a marked page.',
    }),
    hold: choice('What keeps the open notebook in place?', {
      none: 'Nothing holds down the open pages.',
      weight: 'A narrow brass page weight rests across the lower margin.',
      clip: 'A black binder clip grips the far outer corner.',
      band: 'A green elastic band crosses the low margin of the pages.',
    }),
    station: choice('What supports the notebook?', {
      bare: 'The book rests directly on the work surface.',
      board: 'A small dark writing board lies beneath it.',
      folder: 'An open buff document folder holds the book.',
      pad: 'A dark green desk blotter supports the notebook.',
    }),
    content: choice('What fills the open pages?', {
      formulae: 'Chemical formulae and equations, benzene rings, an arrow to a question mark.',
      sketches: 'A careful labelled drawing of apparatus: a flask on a tripod over a flame.',
      frantic: 'Frantic slanting notes, half of them scribbled out, NO underlined twice.',
      table: 'A ruled table of readings and a hand-plotted graph.',
      doodles: 'Two lines of notes, then spirals, stars, a heart with initials, noughts and crosses: a bored pupil.',
    }),
    last: choice('What is the last thing written, in red, on the right-hand page?', {
      nothing: 'Nothing in red.',
      eureka: 'EUREKA! with a ring drawn round it.',
      why: 'WHY? underlined.',
      works: 'it works',
      sorry: "I'm sorry",
      day: 'Day 112',
      cross: 'No words: a huge red cross through the whole page.',
    }),
    stains: choice('What has marked the paper?', {
      clean: 'Nothing: clean pages.',
      coffee: 'Brown coffee-cup rings.',
      burns: 'Chemical burns: brown-edged holes eaten through by acid drops.',
      ink: 'A spilled pool of blue-black ink and its spatter.',
      water: 'Tide-marked water stains, dried and cockled.',
      scorched: 'A charred, blackened lower corner: it has been in a fire.',
    }),
    torn: noul('Has the right-hand page been torn out, leaving a ragged stub and a crumpled ball of paper?'),
    writing: choice('What lies with it to write with?', {
      pencil: 'A yellow pencil with a pink eraser, resting in the gutter.',
      stub: 'A chewed stub of pencil and its shavings.',
      pen: 'A black fountain pen, uncapped.',
      none: 'Nothing: whoever wrote took the pen away.',
    }),
    binding: choice('How is the notebook bound?', {
      hardback: 'A black hardback with a red ribbon marker.',
      spiral: 'A wire spiral down the middle, a cheap reporter-style pad.',
      composition: 'A black-and-white marbled composition book.',
      leather: 'Worn brown leather with a wrap-around strap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const w = 0.15, d = 0.21, T = 0.014, coverT = 0.005;
    const height = (u: number) => coverT + T * (0.3 + 0.7 * Math.sin(Math.min(1, u * 2.4) * Math.PI / 2)) - 0.004 * u * u;
    const paper = new THREE.Color('#f4efe0').lerp(new THREE.Color('#d9c79a'), mood.wear * 0.8).getStyle();
    const ink = a.writing === 'pen' ? '#14215c' : '#22232a';

    // Cover.
    const coverMat = a.binding === 'composition' ? new THREE.MeshStandardMaterial({ map: marbled(random), roughness: 0.8 })
      : s.material({ hardback: '#1c1d21', spiral: '#2b4f8a', leather: '#7a4a26', composition: '#111' }[a.binding], { roughness: a.binding === 'leather' ? 0.6 : 0.8 });
    const margin = a.binding === 'leather' ? 0.012 : 0.006;
    for (const side of [-1, 1]) s.box([w + margin, coverT, d + margin * 2], [side * (w + margin) / 2, coverT / 2, 0], coverMat);
    // Page blocks: a cream slab with a curved, painted top sheet.
    const edge = s.material(new THREE.Color(paper).multiplyScalar(0.9), { roughness: 1 });
    for (const side of [0, 1] as const) {
      const sign = side === 0 ? -1 : 1;
      s.box([w - 0.002, T * 0.62, d - 0.002], [sign * (w / 2 + 0.001), coverT + T * 0.31, 0], edge);
      const nu = 18, positions: number[] = [], uvs: number[] = [], index: number[] = [];
      const cockle = a.stains === 'water' ? 0.0016 : 0.0004 + mood.wear * 0.0008;
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= 4; j++) {
        const u = i / nu, v = j / 4;
        positions.push(sign * u * w, height(u) + Math.sin(u * 11 + v * 7 + side) * cockle * u, (0.5 - v) * d);
        uvs.push(side === 0 ? 1 - u : u, v);
      }
      for (let i = 0; i < nu; i++) for (let j = 0; j < 4; j++) {
        const p = i * 5 + j;
        if (side === 1) index.push(p, p + 6, p + 5, p, p + 1, p + 6); else index.push(p, p + 5, p + 6, p, p + 6, p + 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      s.mesh(geometry, new THREE.MeshStandardMaterial({ map: paintPage(side, a.content, a.last, a.stains, paper, ink, mood.wear, random, a.torn, a.ruling, a.annotations), roughness: 0.92, side: THREE.DoubleSide }));
      // Fore-edge of the block.
      s.box([0.002, T * 0.7, d - 0.001], [sign * (w - 0.001), coverT + T * 0.35, 0], edge);
    }

    const gutterY = height(0) + 0.001;
    if (a.binding === 'spiral') {
      const wire = s.material('#c9cdd0', { metalness: 0.85, roughness: 0.3 });
      for (let i = 0; i < 17; i++) s.ring(0.008, 0.0011, [0, gutterY + 0.002, -d / 2 + 0.012 + i * (d - 0.024) / 16], wire).rotation.y = 0.12;
    } else if (a.binding === 'hardback') {
      s.tube([[0.004, gutterY + 0.001, -d / 2], [0.01, gutterY + 0.004, 0], [0.02, height(0.15) + 0.001, d / 2], [0.03, 0.002, d / 2 + 0.02], [0.034 + random() * 0.02, 0.001, d / 2 + 0.05]], 0.0022, s.material('#b3201c', { roughness: 0.7 })).scale.set(1, 1, 1);
    } else if (a.binding === 'leather') {
      s.tube([[-(w + margin), 0.004, 0.02], [-(w + margin) - 0.02, 0.002, 0.03], [-(w + margin) - 0.06, 0.0015, 0.01 + random() * 0.05]], 0.003, coverMat).scale.set(1, 0.5, 1);
    }

    if (!a.torn && (mood.energy > 0.6 || random() < 0.5)) {
      // A leaf caught mid-turn, standing up out of the gutter.
      const positions: number[] = [], index: number[] = [];
      let x = -0.002, y = gutterY, lean = mix(1.35, 1.0, random());
      for (let i = 0; i <= 14; i++) {
        for (const z of [-d / 2 + 0.001, d / 2 - 0.001]) positions.push(x, y, z);
        const angle = lean - (i / 14) ** 1.5 * mix(0.5, 1.1, random() * 0.3 + mood.energy * 0.5);
        x -= Math.cos(angle) * (w / 14); y += Math.sin(angle) * (w / 14);
      }
      for (let i = 0; i < 14; i++) index.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
      const leaf = new THREE.BufferGeometry();
      leaf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      leaf.setIndex(index);
      leaf.computeVertexNormals();
      s.mesh(leaf, new THREE.MeshStandardMaterial({ color: paper, roughness: 0.95, side: THREE.DoubleSide }));
    }
    if (a.torn) {
      // The ragged stub left standing in the gutter, and the page itself, screwed up.
      const shape = new THREE.Shape();
      shape.moveTo(-d / 2 + 0.004, 0);
      let z = -d / 2 + 0.004;
      while (z < d / 2 - 0.006) { z += 0.004 + random() * 0.008; shape.lineTo(z, 0.006 + random() * 0.016); }
      shape.lineTo(d / 2 - 0.004, 0);
      const stub = s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: paper, roughness: 0.95, side: THREE.DoubleSide }), [0.006, gutterY + 0.002, 0]);
      stub.rotation.y = -Math.PI / 2; stub.rotation.z = 0; stub.rotateX(-0.5);
      const ballGeo = new THREE.IcosahedronGeometry(0.03, 1);
      const pos = ballGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) { const k = 0.72 + random() * 0.5; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.85, pos.getZ(i) * k); }
      ballGeo.computeVertexNormals();
      s.mesh(ballGeo, new THREE.MeshStandardMaterial({ color: paper, roughness: 0.95, flatShading: true }), [w + 0.055, 0.024, d / 2 - 0.04 - random() * 0.08]).rotation.set(random() * 3, random() * 3, 0);
    }

    // Something to write with.
    const pencil = (length: number, at: P3, yaw: number, chewed: boolean) => {
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      const body = add(s.cylinder(0.0038, 0.0038, length, [0, 0, 0], s.material('#e8b820', { roughness: 0.5 }), 6));
      body.rotation.x = Math.PI / 2;
      const cone = add(s.cylinder(0.0038, 0.0012, 0.012, [0, 0, length / 2 + 0.006], s.material('#e3c79a'), 6)); cone.rotation.x = -Math.PI / 2;
      const lead = add(s.cylinder(0.0012, 0.0002, 0.004, [0, 0, length / 2 + 0.013], s.material('#2a2a2e'), 6)); lead.rotation.x = -Math.PI / 2;
      if (!chewed) {
        add(s.cylinder(0.004, 0.004, 0.008, [0, 0, -length / 2 - 0.004], s.material('#b9bcbf', { metalness: 0.8, roughness: 0.3 }), 10)).rotation.x = Math.PI / 2;
        add(s.cylinder(0.0038, 0.0038, 0.008, [0, 0, -length / 2 - 0.012], s.material('#e88a9a'), 10)).rotation.x = Math.PI / 2;
      } else add(s.ball([0.0036, 0.0034, 0.004], [0, 0, -length / 2], s.material('#c9a878', { roughness: 1 }), 6));
      g.position.set(...at); g.rotation.y = yaw;
      s.root.add(g);
    };
    const inGutter = a.binding !== 'spiral';
    if (a.writing === 'pencil') pencil(0.15, inGutter ? [0, gutterY + 0.0045, 0.01] : [w * 0.55, height(0.55) + 0.0045, 0.02], inGutter ? (random() - 0.5) * 0.08 : 0.5 + random() * 0.5, false);
    else if (a.writing === 'stub') {
      pencil(0.05, inGutter ? [0, gutterY + 0.0045, 0.05] : [w * 0.5, height(0.5) + 0.0045, 0.05], inGutter ? (random() - 0.5) * 0.1 : 0.7, true);
      const curl = s.material('#e3c79a', { side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) s.ring(0.004 + random() * 0.003, 0.0006, [w + 0.02 + random() * 0.04, 0.004, d / 2 - random() * 0.05], curl, 4 + random() * 2).rotation.set(random() * 3, random() * 3, 0);
    } else if (a.writing === 'pen') {
      const black = s.material('#16171a', { roughness: 0.3 }), gold = s.material('#d2a637', { metalness: 0.9, roughness: 0.25 });
      const y = height(0.6) + 0.0055, g = new THREE.Group();
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      add(s.cylinder(0.0055, 0.005, 0.1, [0, 0, 0], black, 12)).rotation.x = Math.PI / 2;
      add(s.cylinder(0.0056, 0.0056, 0.004, [0, 0, 0.045], gold, 12)).rotation.x = Math.PI / 2;
      add(s.cylinder(0.004, 0.0008, 0.018, [0, 0, 0.059], gold, 8)).rotation.x = -Math.PI / 2;
      g.position.set(w * 0.6, y, 0.03); g.rotation.y = 2.3 + random() * 0.5;
      s.root.add(g);
      const cap = s.cylinder(0.0062, 0.0062, 0.05, [w + 0.03, 0.0062, d / 2 - 0.03], black, 12);
      cap.rotation.z = Math.PI / 2; cap.rotation.y = random() * 2;
    }
    if (a.stains === 'burns') for (let i = 0; i < 4; i++) s.cylinder(0.006 + random() * 0.006, 0.006, 0.0008, [(random() - 0.5) * 0.4, 0.0004, d / 2 + 0.015 + random() * 0.03], s.material('#3a2a14', { roughness: 1 }), 10);
    if (a.stains === 'scorched') for (let i = 0; i < 12; i++) s.box([0.004 + random() * 0.008, 0.0008, 0.004 + random() * 0.006], [(random() - 0.5) * 0.36, 0.0006, d / 2 + 0.008 + random() * 0.03], s.material('#141210', { roughness: 1 })).rotation.y = random() * 3;
    const brass = s.material('#bd9b53', { metalness: 0.75, roughness: 0.33 });
    if (a.insert !== 'none') {
      const insert = s.box([0.09, 0.0008, 0.09], [0.06, coverT + 0.002, -d / 2 - 0.016], s.material(a.insert === 'blotter' ? '#cfa6ab' : '#e8e1ca'));
      if (a.insert === 'graph') {
        for (let i = 0; i < 5; i++) {
          s.box([0.075, 0.0003, 0.0004], [0.06, insert.position.y + 0.0005, -d / 2 - 0.055 + i * 0.009], s.material('#7b9a9d'));
          s.box([0.0004, 0.0003, 0.04], [0.029 + i * 0.015, insert.position.y + 0.0005, -d / 2 - 0.035], s.material('#7b9a9d'));
        }
      } else if (a.insert === 'photograph') {
        s.box([0.075, 0.0004, 0.043], [0.06, insert.position.y + 0.0006, -d / 2 - 0.035], s.material('#4c5250'));
        for (let i = 0; i < 5; i++) s.ball([0.006, 0.0004, 0.011], [0.035 + i * 0.012, insert.position.y + 0.001, -d / 2 - 0.036], s.material(i % 2 ? '#9baca0' : '#c4cbc0'), 10);
      }
    }
    if (a.markers === 'tabs') for (let i = 0; i < 3; i++) s.box([0.02, 0.0007, 0.023], [w + 0.005, coverT + 0.004 + i * 0.002, -0.06 + i * 0.05], s.material(['#a75542', '#d3b54c', '#5b918d'][i]));
    if (a.markers === 'clips') for (const z of [-0.06, 0.04]) s.tube([[w - 0.025, height(0.85) + 0.002, z], [w + 0.006, height(1) + 0.002, z], [w + 0.009, height(1) + 0.002, z + 0.008], [w - 0.022, height(0.85) + 0.002, z + 0.008], [w - 0.022, height(0.85) + 0.002, z + 0.004], [w + 0.003, height(1) + 0.002, z + 0.004]], 0.0007, brass);
    if (a.markers === 'thread') s.tube([[-0.11, coverT + 0.003, 0], [-w - 0.01, coverT + 0.003, 0.004], [-w - 0.035, 0.001, 0.055], [-w - 0.01, 0.001, 0.11]], 0.001, s.material('#3b7185'));
    if (a.hold === 'weight') s.box([0.21, 0.004, 0.012], [0, height(0.7) + 0.002, 0.085], brass);
    if (a.hold === 'clip') {
      s.box([0.024, 0.018, 0.017], [w - 0.005, 0.012, -0.074], s.material('#30383c'));
      for (const z of [-0.08, -0.067]) s.tube([[w - 0.013, 0.019, z], [w - 0.013, 0.039, z], [w + 0.005, 0.039, z], [w + 0.005, 0.019, z]], 0.0008, brass);
    }
    if (a.hold === 'band') {
      const band = s.material('#56806b');
      s.box([w * 2 + 0.012, 0.0008, 0.007], [0, height(0.7) + 0.001, 0.08], band);
      for (const side of [-1, 1]) s.box([0.001, 0.018, 0.007], [side * (w + 0.006), 0.009, 0.08], band);
    }
    if (a.station !== 'bare') {
      const supportT = a.station === 'board' ? 0.006 : a.station === 'pad' ? 0.003 : 0.0015;
      // Raise the whole assembly with the supporting board, including loose paper and tools.
      const assembly = new THREE.Group();
      for (const child of [...s.root.children]) assembly.add(child);
      assembly.position.y = supportT; s.root.add(assembly);
      s.box([0.48, supportT, 0.38], [0, supportT / 2, 0.005], s.material(a.station === 'board' ? '#66513b' : a.station === 'pad' ? '#355f54' : '#c8b486'));
      if (a.station === 'folder') s.box([0.08, 0.001, 0.022], [-0.13, 0.0005, -0.192], s.material('#c8b486'));
    }
    return s.finish();
  },
});
