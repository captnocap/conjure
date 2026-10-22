import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { grime, painted, scrawl, write } from './paint';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const ADS = {
  diner: 'A diner twelve miles ahead: pie, coffee, a friendly name in script.',
  lawyer: 'A personal-injury lawyer with a huge phone number and a pointing finger of a slogan.',
  fireworks: 'A fireworks outlet: bursts of colour on black, BUY 1 GET 3.',
  scripture: 'A plain scripture verse in black letters on a pale sky.',
  missing: 'A missing-person appeal: a silhouette, a name, LAST SEEN.',
  blank: 'Blank white with YOUR AD HERE and a phone number.',
  attraction: 'A roadside attraction: the world\'s largest something, next exit.',
  motel: 'A motel: vacancy, colour TV, a price in a starburst.',
} as const;
type Ad = keyof typeof ADS;

function drawAd(ctx: Ctx, w: number, h: number, ad: Ad, random: () => number) {
  if (ad === 'diner') {
    ctx.fillStyle = '#f3e3b6'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c93a2a'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    write(ctx, "Mabel's", w * 0.36, h * 0.28, h * 0.36, '#c93a2a', { font: 'italic bold' });
    write(ctx, 'DINER', w * 0.36, h * 0.58, h * 0.24, '#1f3d4a');
    write(ctx, 'PIE · COFFEE · OPEN 24 HRS', w * 0.4, h * 0.89, h * 0.12, '#f3e3b6', { max: w * 0.74 });
    const cx = w * 0.8, cy = h * 0.42;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1f3d4a'; ctx.lineWidth = h * 0.02;
    ctx.beginPath(); ctx.moveTo(cx - h * 0.2, cy - h * 0.12); ctx.lineTo(cx + h * 0.2, cy - h * 0.12); ctx.lineTo(cx + h * 0.15, cy + h * 0.2); ctx.lineTo(cx - h * 0.15, cy + h * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + h * 0.22, cy + h * 0.03, h * 0.09, -1.3, 1.3); ctx.stroke();
    ctx.strokeStyle = '#9aa6a8'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * h * 0.09, cy - h * 0.17); ctx.bezierCurveTo(cx + i * h * 0.09 + h * 0.05, cy - h * 0.24, cx + i * h * 0.09 - h * 0.05, cy - h * 0.3, cx + i * h * 0.09, cy - h * 0.37); ctx.stroke(); }
    ctx.fillStyle = '#1f3d4a'; ctx.beginPath(); ctx.arc(w * 0.93, h * 0.89, h * 0.09, 0, 7); ctx.fill(); write(ctx, '12 MI', w * 0.83, h * 0.89, h * 0.13, '#ffe27a');
  } else if (ad === 'lawyer') {
    ctx.fillStyle = '#f5c518'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#16181a'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
    ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.arc(w * 0.14, h * 0.3, h * 0.17, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(w * 0.02, h * 0.62); ctx.quadraticCurveTo(w * 0.14, h * 0.36, w * 0.26, h * 0.62); ctx.fill();
    ctx.fillStyle = '#d2201c'; ctx.beginPath(); ctx.moveTo(w * 0.14, h * 0.5); ctx.lineTo(w * 0.125, h * 0.62); ctx.lineTo(w * 0.155, h * 0.62); ctx.fill();
    write(ctx, 'HURT?', w * 0.47, h * 0.33, h * 0.5, '#d2201c', { outline: '#16181a' });
    write(ctx, 'CALL BIG JIM', w * 0.81, h * 0.22, h * 0.14, '#16181a', { max: w * 0.3 }); write(ctx, 'HE FIGHTS', w * 0.81, h * 0.42, h * 0.12, '#16181a', { max: w * 0.3 });
    write(ctx, '555-0199', w * 0.5, h * 0.82, h * 0.32, '#f5c518', { max: w * 0.94 });
  } else if (ad === 'fireworks') {
    ctx.fillStyle = '#11131c'; ctx.fillRect(0, 0, w, h);
    const hues = ['#ff3b30', '#ffd60a', '#34c759', '#5ac8fa', '#ff7af5'];
    for (let b = 0; b < 6; b++) { const cx = w * (0.08 + random() * 0.84), cy = h * (0.15 + random() * 0.5), r = h * (0.14 + random() * 0.16); ctx.strokeStyle = hues[b % hues.length]; ctx.lineWidth = h * 0.014; for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * r * 0.25, cy + Math.sin(t) * r * 0.25); ctx.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); ctx.stroke(); } }
    write(ctx, 'FIREWORKS', w / 2, h * 0.42, h * 0.4, '#ffd60a', { outline: '#d2201c', max: w * 0.92 });
    write(ctx, 'BUY 1 GET 3 FREE · EXIT NOW', w / 2, h * 0.82, h * 0.16, '#ffffff', { max: w * 0.9 });
  } else if (ad === 'scripture') {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bcd9ee'); g.addColorStop(1, '#f6efdc'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    write(ctx, 'COME UNTO ME', w / 2, h * 0.24, h * 0.24, '#16181a', { max: w * 0.9 });
    write(ctx, 'ALL YE THAT LABOUR', w / 2, h * 0.5, h * 0.2, '#16181a', { max: w * 0.9 });
    write(ctx, 'AND I WILL GIVE YOU REST', w / 2, h * 0.72, h * 0.15, '#16181a', { max: w * 0.9 });
    write(ctx, 'MATTHEW 11:28', w * 0.8, h * 0.9, h * 0.09, '#5a4a3a', { font: 'italic bold' });
  } else if (ad === 'missing') {
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#b3201c'; ctx.fillRect(0, 0, w, h * 0.3);
    write(ctx, 'MISSING', w * 0.5, h * 0.16, h * 0.28, '#ffffff', { max: w * 0.9 });
    ctx.fillStyle = '#c9c4b6'; ctx.fillRect(w * 0.05, h * 0.36, w * 0.24, h * 0.58);
    ctx.fillStyle = '#6f6a60'; ctx.beginPath(); ctx.arc(w * 0.17, h * 0.56, h * 0.11, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(w * 0.07, h * 0.94); ctx.quadraticCurveTo(w * 0.17, h * 0.6, w * 0.27, h * 0.94); ctx.fill();
    write(ctx, 'HAVE YOU SEEN HER?', w * 0.64, h * 0.47, h * 0.15, '#16181a', { max: w * 0.64 });
    write(ctx, 'LAST SEEN EXIT 88 · JUNE', w * 0.64, h * 0.66, h * 0.1, '#3b3f42', { max: w * 0.64 });
    write(ctx, 'CALL 555-0142', w * 0.64, h * 0.85, h * 0.16, '#b3201c', { max: w * 0.64 });
  } else if (ad === 'blank') {
    ctx.fillStyle = '#f6f5ef'; ctx.fillRect(0, 0, w, h);
    write(ctx, 'YOUR AD HERE', w / 2, h * 0.42, h * 0.3, '#2b2f33', { max: w * 0.86 });
    write(ctx, '555-0110', w / 2, h * 0.76, h * 0.16, '#2b2f33');
  } else if (ad === 'attraction') {
    ctx.fillStyle = '#f2a51c'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#7a3a1a'; ctx.fillRect(0, h * 0.8, w, h * 0.2);
    write(ctx, "WORLD'S LARGEST", w * 0.4, h * 0.2, h * 0.2, '#7a1f14', { max: w * 0.72 });
    write(ctx, 'PRAIRIE DOG', w * 0.4, h * 0.5, h * 0.3, '#ffffff', { outline: '#7a1f14', max: w * 0.74 });
    write(ctx, 'NEXT EXIT · GIFTS · CLEAN RESTROOMS', w * 0.42, h * 0.9, h * 0.1, '#ffe9a8', { max: w * 0.78 });
    const cx = w * 0.88, cy = h * 0.5;
    ctx.fillStyle = '#b7814a'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.12, h * 0.14, h * 0.26, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy - h * 0.2, h * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - h * 0.09, cy - h * 0.3, h * 0.035, 0, 7); ctx.arc(cx + h * 0.09, cy - h * 0.3, h * 0.035, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.arc(cx - h * 0.04, cy - h * 0.22, h * 0.018, 0, 7); ctx.arc(cx + h * 0.04, cy - h * 0.22, h * 0.018, 0, 7); ctx.arc(cx, cy - h * 0.15, h * 0.022, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#12606e'; ctx.fillRect(0, 0, w, h);
    write(ctx, 'Starlite', w * 0.36, h * 0.27, h * 0.36, '#ffe27a', { font: 'italic bold' });
    write(ctx, 'MOTEL', w * 0.36, h * 0.6, h * 0.26, '#ffffff');
    write(ctx, 'VACANCY · COLOR TV · POOL', w * 0.38, h * 0.88, h * 0.11, '#ffd0c0', { max: w * 0.7 });
    ctx.fillStyle = '#e8452e'; ctx.beginPath(); for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2, r = i % 2 ? h * 0.3 : h * 0.4; ctx.lineTo(w * 0.83 + Math.cos(t) * r, h * 0.48 + Math.sin(t) * r); } ctx.fill();
    write(ctx, '$39', w * 0.83, h * 0.48, h * 0.3, '#ffffff');
  }
}

export default defineThing({
  questions: {
    ad: choice('What does the billboard advertise?', ADS),
    structure: choice('What holds it up?', {
      monopole: 'A single thick steel monopole under the centre, modern interstate style.',
      flag: 'A steel pole at one end with the face cantilevered off it like a flag.',
      trestle: 'An old timber trestle: a row of creosoted posts with diagonal back braces, lower to the ground.',
      twin: 'Two riveted steel I-beam legs with cross bracing.',
    }),
    poster: choice('What state is the poster in?', {
      crisp: 'Crisp and freshly posted.',
      peeling: 'Peeling in long strips to reveal an older advertisement beneath.',
      half: 'Half pasted: the job abandoned midway, a ladder and paste bucket left on the catwalk.',
      tagged: 'Tagged across the bottom with spray paint.',
      bare: 'Stripped to bare weathered panels with only scraps of paper left.',
    }),
    lamps: noul('Are the gooseneck lamps lit?'),
    base: choice('What is at its base?', {
      nothing: 'Bare gravel and weeds.',
      fence: 'A barbed-wire fence line with a tumbleweed caught in it.',
      memorial: 'A small white roadside cross with plastic flowers.',
      sunflowers: 'A stand of wild sunflowers.',
      junk: 'Dumped tyres and a rotting mattress.',
      trooper: 'A highway-patrol speed trap sign: a radar board on a little trailer.',
    }),
    birds: choice('What perches on the top edge?', {
      none: 'Nothing.',
      crows: 'A row of crows.',
      hawk: 'A single hawk, watching the verge.',
      nest: 'A big untidy stick nest on one corner.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const old = a.structure === 'trestle';
    const FW = old ? 6.4 : 7.4, FH = old ? 2.8 : 3.2, Y0 = old ? 2.6 : a.structure === 'twin' ? 4.2 : 5.4;
    const cy = Y0 + FH / 2;
    const steel = s.material('#6f777b', { metalness: 0.55, roughness: 0.55 });
    const rusty = s.material(wear > 0.5 ? '#7a5a44' : '#5f676b', { metalness: 0.4, roughness: 0.7 });
    const timber = s.material('#4f3b2a', { roughness: 0.95 });
    const dark = s.material('#1b1e21', { roughness: 0.7 });
    const frameMat = old ? timber : steel;
    const night = Math.abs(mood.daylight - 0.5) * 2;
    const litAmount = a.lamps ? mix(0.25, 0.75, night) : 0;

    // Poster art.
    const adKeys = Object.keys(ADS) as Ad[];
    const older = adKeys.filter((k) => k !== a.ad && k !== 'blank')[Math.floor(random() * (adKeys.length - 2))];
    const curls: { x: number; y: number; w: number; len: number; up: boolean }[] = [];
    const face = painted(FW, FH, (ctx, w, h) => {
      const strips = 10, sw = w / strips;
      const panels = () => { ctx.fillStyle = '#c9c5b6'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#a39e8e'; ctx.lineWidth = 2; for (let i = 1; i < strips; i++) { ctx.beginPath(); ctx.moveTo(i * sw, 0); ctx.lineTo(i * sw, h); ctx.stroke(); } grime(ctx, w, h, random, 0.5, '#8d8672'); };
      const fresh = document.createElement('canvas'); fresh.width = w; fresh.height = h;
      const f = fresh.getContext('2d')!; drawAd(f, w, h, a.ad, random);
      if (a.poster === 'crisp' || a.poster === 'tagged') ctx.drawImage(fresh, 0, 0);
      else if (a.poster === 'peeling') {
        drawAd(ctx, w, h, older, random);
        ctx.fillStyle = 'rgba(214,206,186,0.45)'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < strips; i++) {
          const torn = random() < 0.55 ? random() * 0.75 : 0, fromTop = random() < 0.6;
          const y0 = fromTop ? h * torn : 0, hh = h * (1 - torn);
          ctx.drawImage(fresh, i * sw, y0, sw, hh, i * sw, y0, sw, hh);
          if (torn > 0.05) {
            ctx.fillStyle = '#f4f1e6'; const edge = fromTop ? y0 : hh;
            ctx.beginPath(); ctx.moveTo(i * sw, edge); for (let k = 0; k <= 6; k++) ctx.lineTo(i * sw + (sw * k) / 6, edge + (random() - 0.5) * h * 0.05); ctx.lineTo(i * sw + sw, edge + (fromTop ? h * 0.012 : -h * 0.012)); ctx.lineTo(i * sw, edge + (fromTop ? h * 0.012 : -h * 0.012)); ctx.fill();
            curls.push({ x: (i + 0.5) / strips, y: fromTop ? torn : 1 - torn, w: 1 / strips, len: Math.min(torn, 0.3), up: !fromTop });
          }
        }
      } else if (a.poster === 'half') {
        panels();
        const done = 3 + Math.floor(random() * 4);
        ctx.drawImage(fresh, 0, 0, done * sw, h, 0, 0, done * sw, h);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(done * sw, 0, sw * 0.5, h);
        curls.push({ x: (done + 0.25) / strips, y: 0.02, w: 0.7 / strips, len: 0.3, up: false });
        curls.push({ x: -1, y: done / strips, w: 0, len: 0, up: false });
      } else {
        panels();
        for (let i = 0; i < 9; i++) { const x = random() * w, y = random() * h, ww = w * (0.03 + random() * 0.1), hh = h * (0.05 + random() * 0.25); ctx.drawImage(fresh, x, y, ww, hh, x, y, ww, hh); }
      }
      if (a.poster === 'tagged') {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const tags = [['#e83e8c', 'ZEKE 4EVR'], ['#1fd1c1', 'NOWHERE'], ['#111111', 'U R HERE'], ['#f5f5f5', 'GO HOME']];
        for (let t = 0; t < 2; t++) { const [c, word] = tags[Math.floor(random() * tags.length)]; ctx.save(); ctx.translate(w * (0.25 + t * 0.45 + random() * 0.1), h * (0.78 + random() * 0.1)); ctx.rotate((random() - 0.5) * 0.2); ctx.font = `italic bold ${h * 0.2}px 'Comic Sans MS', cursive, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = h * 0.035; ctx.strokeStyle = c; ctx.strokeText(word, 0, 0); ctx.restore(); }
      }
      ctx.fillStyle = `rgba(226,220,200,${wear * 0.38})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wear * 0.4, '#6d6656');
    }, { px: 1024, glow: litAmount * 0.55, roughness: 0.85 });
    face.position.set(0, cy, 0.075); s.root.add(face);

    // Face backing, trim and back stringers.
    s.box([FW, FH, 0.12], [0, cy, 0], s.material('#8d8f88', { roughness: 0.8 }));
    for (const y of [-1, 1]) s.box([FW + 0.24, 0.12, 0.2], [0, cy + y * (FH / 2 + 0.06), 0], frameMat);
    for (const x of [-1, 1]) s.box([0.12, FH + 0.24, 0.2], [x * (FW / 2 + 0.06), cy, 0], frameMat);
    for (let i = 0; i < 6; i++) s.box([0.1, FH, 0.14], [-FW / 2 + 0.4 + (i * (FW - 0.8)) / 5, cy, -0.13], frameMat);
    for (const y of [-0.3, 0.3]) s.box([FW, 0.14, 0.14], [0, cy + y * FH, -0.24], frameMat);

    // Structure.
    if (a.structure === 'monopole' || a.structure === 'flag') {
      const px = a.structure === 'flag' ? -FW / 2 + 0.5 : 0;
      s.cylinder(0.3, 0.36, cy, [px, cy / 2, -0.62], rusty, 20);
      s.cylinder(0.6, 0.6, 0.06, [px, 0.03, -0.62], steel, 20);
      for (let i = 0; i < 8; i++) s.cylinder(0.04, 0.04, 0.12, [px + Math.cos(i * 0.785) * 0.5, 0.09, -0.62 + Math.sin(i * 0.785) * 0.5], dark, 6);
      const beam = s.cylinder(0.22, 0.22, FW * 0.92, [0, cy, -0.62], rusty, 16); beam.rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) s.box([0.1, 0.1, 0.4], [-FW * 0.4 + i * FW * 0.2, cy, -0.44], steel);
      s.cylinder(0.33, 0.33, 0.5, [px, cy, -0.62], steel, 20);
    } else if (a.structure === 'twin') {
      for (const x of [-1, 1]) {
        const lx = x * FW * 0.3;
        s.box([0.3, Y0 + FH, 0.05], [lx, (Y0 + FH) / 2, -0.4], rusty);
        for (const z of [-1, 1]) s.box([0.3, Y0 + FH, 0.04], [lx, (Y0 + FH) / 2, -0.4 + z * 0.14], rusty).rotation.y = 0;
        s.box([0.03, Y0 + FH, 0.3], [lx, (Y0 + FH) / 2, -0.4], rusty);
        s.box([0.7, 0.3, 0.7], [lx, 0.15, -0.4], s.material('#aaa69a', { roughness: 0.95 }));
        s.rod([lx, 0.3, -2.2], [lx, Y0 + FH * 0.5, -0.5], 0.07, rusty);
      }
      s.rod([-FW * 0.3, 0.6, -0.4], [FW * 0.3, Y0 - 0.3, -0.4], 0.05, steel); s.rod([FW * 0.3, 0.6, -0.4], [-FW * 0.3, Y0 - 0.3, -0.4], 0.05, steel);
      s.box([FW * 0.6, 0.12, 0.12], [0, Y0 - 0.3, -0.4], steel);
    } else {
      const posts = 5;
      for (let i = 0; i < posts; i++) {
        const x = -FW / 2 + 0.35 + (i * (FW - 0.7)) / (posts - 1), lean = (random() - 0.5) * 0.02 * (1 + wear * 3);
        const post = s.cylinder(0.11, 0.14, Y0 + FH + 0.2, [x, (Y0 + FH + 0.2) / 2, -0.32], timber, 9); post.rotation.z = lean;
        s.rod([x, 0, -2.4 - random() * 0.3], [x, Y0 + FH * 0.6, -0.36], 0.08, timber);
        s.rod([x, Y0 * 0.45, -1.35], [x, Y0 * 0.45, -0.32], 0.05, timber);
      }
      s.rod([-FW / 2 + 0.35, 0.5, -0.36], [FW / 2 - 0.35, Y0 - 0.2, -0.36], 0.05, timber); s.rod([FW / 2 - 0.35, 0.5, -0.36], [-FW / 2 + 0.35, Y0 - 0.2, -0.36], 0.05, timber);
      s.box([FW, 0.1, 0.06], [0, Y0 - 0.25, -0.36], timber);
      // Lattice skirt below the face, the old highway look.
      const skirt = painted(FW, 0.9, (ctx, w, h) => { ctx.strokeStyle = '#e9e4d2'; ctx.lineWidth = h * 0.07; const st = h * 0.5; for (let x = -h; x < w + h; x += st) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.moveTo(x, 0); ctx.lineTo(x - h, h); ctx.stroke(); } ctx.strokeRect(0, 0, w, h); grime(ctx, w, h, random, wear, '#6d6656'); }, { px: 768, cutout: true });
      skirt.position.set(0, Y0 - 0.6, -0.1); s.root.add(skirt);
    }

    // Catwalk with handrail and ladder.
    const cw = 0.75, wy = Y0 - 0.22;
    if (!old) {
      s.box([FW + 0.2, 0.06, cw], [0, wy, 0.1 + cw / 2], s.material('#55595c', { metalness: 0.5, roughness: 0.7 }));
      for (let i = 0; i < 7; i++) { const x = -FW / 2 + (i * FW) / 6; s.rod([x, wy, 0.1 + cw - 0.04], [x, wy + 0.95, 0.1 + cw - 0.04], 0.022, steel); s.box([0.06, 0.06, cw + 0.5], [x, wy - 0.05, 0.1 + cw / 2 - 0.3], steel); }
      for (const y of [0.5, 0.95]) s.rod([-FW / 2, wy + y, 0.1 + cw - 0.04], [FW / 2, wy + y, 0.1 + cw - 0.04], 0.022, steel);
      const lx = a.structure === 'flag' ? -FW / 2 + 0.5 : a.structure === 'twin' ? FW * 0.3 : 0.5;
      const lz = a.structure === 'twin' ? -0.75 : -1.02;
      for (const dx of [-0.2, 0.2]) s.rod([lx + dx, 2.4, lz], [lx + dx, wy, lz], 0.02, steel);
      const rungs: { at: P; size: number }[] = [];
      for (let y = 2.5; y < wy; y += 0.3) rungs.push({ at: [lx, y, lz], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.4, 0.03, 0.03), steel, rungs);
    } else {
      s.box([FW, 0.05, 0.4], [0, wy, 0.3], timber);
      for (let i = 0; i < 5; i++) s.rod([-FW / 2 + 0.35 + (i * (FW - 0.7)) / 4, wy - 0.4, 0.0], [-FW / 2 + 0.35 + (i * (FW - 0.7)) / 4, wy, 0.45], 0.035, timber);
    }

    // Gooseneck lamps reaching out from the catwalk and looking back at the face.
    const lampCount = old ? 3 : 4;
    const bulbs: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < lampCount; i++) {
      const x = -FW / 2 + (FW * (i + 0.5)) / lampCount, z0 = old ? 0.5 : 0.1 + cw;
      const broken = a.lamps && wear > 0.55 && random() < wear * 0.4;
      s.tube([[x, wy, z0], [x, wy + 0.1, z0 + 0.7], [x, wy + 0.45, z0 + 1.05], [x, wy + 0.75, z0 + 0.95]], 0.03, steel);
      const hood = s.cylinder(0.08, 0.2, 0.26, [x, wy + 0.8, z0 + 0.88], dark, 12); hood.rotation.x = 0.95;
      const bulb = s.material('#fff3cf', { emissive: '#ffe6a3', emissiveIntensity: a.lamps && !broken ? 2.2 : 0 });
      const lens = s.cylinder(0.17, 0.17, 0.03, [x, wy + 0.88, z0 + 0.77], bulb, 12); lens.rotation.x = 0.95;
      if (a.lamps && !broken) {
        bulbs.push(bulb);
      }
    }

    // Peeled strips hanging off the face, and the paster's kit.
    const flutter: THREE.Mesh[] = [];
    const paperMat = s.material('#efece0', { side: THREE.DoubleSide, roughness: 0.9 });
    for (const curl of curls) {
      if (curl.x < 0) {
        const lx = -FW / 2 + curl.y * FW + 0.5;
        if (!old) {
          for (const dx of [-0.22, 0.22]) s.rod([lx + dx, wy + 0.03, 0.75], [lx + dx, wy + 2.9, 0.2], 0.025, s.material('#c9cdcf', { metalness: 0.7 }));
          for (let r = 0; r < 8; r++) s.rod([lx - 0.22, wy + 0.3 + r * 0.33, 0.75 - (0.3 + r * 0.33) * 0.19], [lx + 0.22, wy + 0.3 + r * 0.33, 0.75 - (0.3 + r * 0.33) * 0.19], 0.018, s.material('#c9cdcf', { metalness: 0.7 }));
          s.cylinder(0.16, 0.13, 0.3, [lx + 0.8, wy + 0.18, 0.5], s.material('#e9e6dc'), 14);
          s.rod([lx + 0.8, wy + 0.2, 0.5], [lx + 1.0, wy + 0.75, 0.42], 0.018, timber);
          for (let r = 0; r < 3; r++) { const roll = s.cylinder(0.07, 0.07, 0.9, [lx + 1.5 + r * 0.17, wy + 0.1, 0.45], paperMat, 10); roll.rotation.x = Math.PI / 2; roll.rotation.z = (random() - 0.5) * 0.3; }
        }
        continue;
      }
      const stripW = curl.w * FW * 0.9, len = Math.max(0.25, curl.len * FH);
      const geo = new THREE.PlaneGeometry(stripW, len, 1, 6);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const t = 0.5 - pos.getY(i) / len; pos.setZ(i, Math.sin(t * 2.2) * len * 0.3); pos.setX(i, pos.getX(i) + Math.sin(t * 3) * 0.05); }
      geo.computeVertexNormals();
      const strip = new THREE.Mesh(geo, paperMat);
      const yEdge = Y0 + FH * (1 - curl.y);
      strip.position.set(-FW / 2 + curl.x * FW, yEdge - len / 2, 0.09); strip.castShadow = true;
      if (curl.up) { strip.position.y = yEdge - len / 2; }
      strip.userData.phase = random() * 6;
      s.root.add(strip); flutter.push(strip);
    }

    // Perchers.
    const topY = Y0 + FH + 0.12;
    const black = s.material('#17181b', { roughness: 0.6 });
    const bird = (x: number, size: number, colour: THREE.Material) => {
      const turn = random() < 0.5 ? 1 : -1;
      s.ball([0.1 * size, 0.09 * size, 0.17 * size], [x, topY + 0.1 * size, 0], colour, 10).rotation.x = -0.4;
      s.ball([0.06 * size, 0.06 * size, 0.065 * size], [x + turn * 0.02, topY + 0.2 * size, 0.1 * size], colour, 8);
      s.rod([x + turn * 0.02, topY + 0.2 * size, 0.15 * size], [x + turn * 0.03, topY + 0.19 * size, 0.24 * size], 0.02 * size, dark, 0.004);
      s.rod([x, topY + 0.08 * size, -0.1 * size], [x, topY + 0.02 * size, -0.3 * size], 0.04 * size, colour, 0.02 * size);
    };
    if (a.birds === 'crows') { const n = 3 + Math.floor(mood.density * 6 + random() * 2); let x = -FW / 2 + 0.4 + random(); for (let i = 0; i < n && x < FW / 2 - 0.2; i++) { bird(x, 1.5 + random() * 0.3, black); x += 0.35 + random() * 1.3; } }
    else if (a.birds === 'hawk') bird((random() - 0.5) * FW * 0.7, 2.6, s.material('#7a5636', { roughness: 0.8 }));
    else if (a.birds === 'nest') {
      const nx = (random() < 0.5 ? -1 : 1) * (FW / 2 - 0.5);
      const twig = s.material('#6b5236', { roughness: 1 });
      s.ball([0.55, 0.2, 0.4], [nx, topY + 0.14, 0], twig, 9);
      for (let i = 0; i < 16; i++) { const t = random() * 6.28; s.rod([nx + Math.cos(t) * 0.2, topY + 0.1 + random() * 0.15, Math.sin(t) * 0.15], [nx + Math.cos(t) * (0.6 + random() * 0.25), topY + 0.05 + random() * 0.4, Math.sin(t) * 0.45], 0.012, twig); }
    }

    // Ground dressing.
    const gravel = s.material('#9a9484', { roughness: 1 });
    s.cylinder(1.6, 1.9, 0.08, [0, 0.03, -0.5], gravel, 18).scale.set(old || a.structure === 'twin' ? 2.1 : 1, 1, 1);
    const weed = s.material('#6d7d45', { roughness: 0.9, side: THREE.DoubleSide });
    const tufts: { at: P; size: number }[] = [];
    for (let i = 0; i < 18; i++) tufts.push({ at: [(random() - 0.5) * FW, 0.12, -0.6 + (random() - 0.5) * 2.4], size: 0.5 + random() });
    s.scatter(new THREE.ConeGeometry(0.12, 0.45, 5), weed, tufts);
    const bz = 1.9;
    if (a.base === 'fence') {
      for (let i = 0; i < 6; i++) { const x = -FW / 2 - 0.3 + (i * (FW + 0.6)) / 5; s.cylinder(0.05, 0.06, 1.2, [x, 0.6, bz], timber, 7).rotation.z = (random() - 0.5) * 0.12; }
      const wire = s.material('#5c5f60', { metalness: 0.6 });
      for (const y of [0.45, 0.8, 1.1]) s.tube([[-FW / 2 - 0.3, y, bz], [-FW * 0.2, y - 0.05, bz + 0.02], [FW * 0.2, y - 0.03, bz], [FW / 2 + 0.3, y, bz]], 0.012, wire);
      const tx = (random() - 0.5) * FW * 0.6;
      for (let i = 0; i < 26; i++) { const ring = s.ring(0.3 + random() * 0.14, 0.012, [tx, 0.45, bz + 0.45], s.material('#a58d5c', { roughness: 1 })); ring.rotation.set(random() * 3, random() * 3, random() * 3); }
    } else if (a.base === 'memorial') {
      const white = s.material('#f3f1ea', { roughness: 0.7 }), mx = FW * 0.22 + random();
      s.box([0.09, 1.0, 0.05], [mx, 0.5, bz], white); s.box([0.6, 0.09, 0.05], [mx, 0.72, bz], white);
      const hues = ['#d43a5a', '#f0c63a', '#e9e2f2', '#d96a2c'];
      for (let i = 0; i < 12; i++) s.ball([0.07, 0.07, 0.07], [mx + (random() - 0.5) * 0.55, 0.12 + random() * 0.25, bz + 0.1 + random() * 0.2], s.material(hues[i % 4]), 7);
      s.ring(0.17, 0.045, [mx, 0.74, bz + 0.05], s.material('#3f7a45'));
      s.cylinder(0.05, 0.05, 0.14, [mx - 0.4, 0.07, bz + 0.2], s.material('#b3201c', { emissive: '#ff8a3a', emissiveIntensity: mix(0.2, 0.9, night) }), 10);
    } else if (a.base === 'sunflowers') {
      const stem = s.material('#557a3a'), petal = s.material('#f2b91c', { side: THREE.DoubleSide }), seed = s.material('#4a3320');
      const n = 10 + Math.floor(mood.density * 14);
      for (let i = 0; i < n; i++) {
        const x = (random() - 0.5) * FW * 0.9, z = bz + (random() - 0.5) * 1.2, hgt = 1.1 + random() * 1.0, nod = 0.2 + random() * 0.5;
        s.rod([x, 0, z], [x + 0.05, hgt, z + 0.08], 0.025, stem);
        const head = s.cylinder(0.2, 0.2, 0.03, [x + 0.05, hgt + 0.05, z + 0.14], petal, 11); head.rotation.x = Math.PI / 2 - nod;
        const eye = s.cylinder(0.1, 0.1, 0.05, [x + 0.05, hgt + 0.055, z + 0.15], seed, 9); eye.rotation.x = Math.PI / 2 - nod;
        const leaf = s.ball([0.16, 0.02, 0.08], [x + 0.14, hgt * 0.55, z + 0.04], stem, 6); leaf.rotation.z = -0.5;
      }
    } else if (a.base === 'junk') {
      const rubber = s.material('#1f2123', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) { const tyre = s.ring(0.3, 0.12, [-1.6 + random() * 0.8, 0.12 + i * 0.22, bz + (random() - 0.5) * 0.3], rubber); tyre.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.2; }
      const lone = s.ring(0.3, 0.12, [-0.4, 0.4, bz + 0.2], rubber); lone.rotation.y = 0.5; lone.rotation.x = 0.25;
      const mattress = s.box([1.9, 0.2, 0.95], [1.5, 0.3, bz], s.material('#c9bfa3', { roughness: 1 })); mattress.rotation.set(0.12, 0.3, 0.2);
      for (let i = 0; i < 5; i++) s.box([1.9, 0.205, 0.05], [1.5, 0.3, bz], s.material('#7f95a8')).rotation.copy(mattress.rotation);
    } else if (a.base === 'trooper') {
      const tx = FW * 0.2;
      s.box([1.3, 0.12, 0.9], [tx, 0.45, bz], dark);
      for (const x of [-1, 1]) s.ring(0.2, 0.09, [tx + x * 0.72, 0.29, bz], s.material('#1f2123')).rotation.y = Math.PI / 2;
      s.rod([tx, 0.45, bz + 0.45], [tx, 0.3, bz + 1.3], 0.03, steel);
      s.box([0.1, 1.5, 0.1], [tx, 1.25, bz], steel);
      s.box([1.3, 1.5, 0.12], [tx, 2.4, bz], s.material('#f2f2ee'));
      const board = painted(1.2, 1.4, (ctx, w, h) => { ctx.fillStyle = '#f5f5f0'; ctx.fillRect(0, 0, w, h); write(ctx, 'YOUR SPEED', w / 2, h * 0.14, h * 0.12, '#16181a', { max: w * 0.9 }); ctx.fillStyle = '#16181a'; ctx.fillRect(w * 0.1, h * 0.26, w * 0.8, h * 0.5); write(ctx, String(58 + Math.floor(random() * 30)), w / 2, h * 0.52, h * 0.4, '#ffb21c'); write(ctx, 'LIMIT 65', w / 2, h * 0.88, h * 0.12, '#16181a'); }, { px: 256, glow: 0.5 });
      board.position.set(tx, 2.4, bz + 0.065); s.root.add(board);
    }

    const flick = wear * mix(0.3, 1, mood.energy), wind = mix(0.2, 1.4, mood.energy);
    return s.finish({
      footprint: FW * 0.42,
      update: (_dt, time) => {
        bulbs.forEach((bulb, index) => { bulb.emissiveIntensity = 2.2 * (1 - flick * (Math.sin(time * (17 + index * 3)) * Math.sin(time * 5.1 + index) > 0.6 ? 0.85 : 0)); });
        for (const strip of flutter) strip.rotation.x = Math.sin(time * 2.2 * wind + (strip.userData.phase as number)) * 0.12 * wind;
      },
    });
  },
});
