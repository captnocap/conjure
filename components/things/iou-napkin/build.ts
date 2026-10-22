import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const AMOUNTS = {
  twenty: ['Twenty dollars, a friendly marker.', '$20', ['$5', '$10']],
  hundreds: ['Five hundred dollars, a bad night.', '$500', ['$100', '$250']],
  thousands: ['Five thousand dollars, real trouble.', '$5,000', ['$800', '$2,000']],
  fortune: ['Fifty thousand dollars, a ruinous sum.', '$50,000', ['$9,000', '$20,000']],
  car: ['The car, written out in words.', 'THE CAR', ['$900', '$3,000']],
  house: ['The deed to the house.', 'THE HOUSE', ['$10,000', 'THE CAR']],
  everything: ['Simply the word "everything".', 'EVERYTHING', ['$5,000', 'THE CAR']],
} as const;
const PAPERS = {
  napkin: 'A square white bar napkin with an embossed border and a printed corner motif.',
  notebook: 'A lined page torn from a spiral notebook, ragged holes down one side.',
  receipt: 'The back of a long thin till receipt.',
  coaster: 'A round cardboard beer mat, written across its printed face.',
  stationery: 'A sheet of small hotel notepaper with a letterhead.',
} as const;
const SIZES: Record<keyof typeof PAPERS, [number, number]> = { napkin: [0.125, 0.125], notebook: [0.105, 0.148], receipt: [0.075, 0.165], coaster: [0.104, 0.104], stationery: [0.105, 0.14] };

export default defineThing({
  questions: {
    amount: choice('How much is owed?', Object.fromEntries(Object.entries(AMOUNTS).map(([key, value]) => [key, value[0]])) as Record<keyof typeof AMOUNTS, string>),
    hand: score('What is the handwriting like?', ['Calm, neat and level, a businesslike note', 'Hurried', 'Frantic: slanting, blotted, earlier amounts crossed out and raised']),
    paper: choice('What is it written on?', PAPERS),
    weight: choice('What holds it down?', {
      chips: 'A short stack of poker chips.',
      pen: 'The fountain pen that wrote it, cap off.',
      knife: 'A switchblade stabbed straight through it into the table.',
      bullet: 'A single brass cartridge stood on end: a reminder.',
      coins: 'A few coins, all that was left.',
      nothing: 'Nothing. It just lies there.',
    }),
    signed: choice('How is it signed?', {
      scrawl: 'A looping illegible signature.',
      cross: 'A plain X: he could not or would not write his name.',
      thumb: 'A thumbprint in dark red.',
      unsigned: 'It is not signed at all.',
    }),
    fate: choice('What has happened to the note since?', {
      fresh: 'Nothing yet. The ink is barely dry.',
      crumpled: 'Crumpled into a ball, then smoothed out again.',
      torn: 'Torn clean in two, the halves pushed back together.',
      paid: 'Stamped PAID in red.',
      stained: 'A drink has been set on it, leaving a brown ring.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [width, depth] = SIZES[a.paper];
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = Math.round(512 * depth / width);
    const ctx = canvas.getContext('2d')!, w = canvas.width, h = canvas.height;
    const age = new THREE.Color('#c9b98f');
    const tone = (hex: string) => '#' + new THREE.Color(hex).lerp(age, mood.wear * 0.45).getHexString();

    // The paper itself.
    ctx.fillStyle = tone({ napkin: '#f6f3ea', notebook: '#f3eedc', receipt: '#f5f3ee', coaster: '#e9dfc4', stationery: '#f4ecd6' }[a.paper]);
    if (a.paper === 'coaster') { ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(0, 0, w, h);
    if (a.paper === 'napkin') {
      ctx.fillStyle = 'rgba(160,150,130,0.45)';
      for (let i = 0; i < 40; i++) for (const edge of [18, 34]) {
        const t = 14 + i * (w - 28) / 39;
        for (const [x, y] of [[t, edge], [t, h - edge], [edge, t], [w - edge, t]]) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.28); ctx.fill(); }
      }
      ctx.strokeStyle = mood.cheer > 0.5 ? '#c2473a' : '#2f5a4a'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(396, 398); ctx.lineTo(456, 398); ctx.lineTo(426, 436); ctx.closePath(); ctx.moveTo(426, 436); ctx.lineTo(426, 468); ctx.moveTo(408, 470); ctx.lineTo(444, 470); ctx.stroke();
      for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(i * w / 9); ctx.clearRect(x - 1, 0, 0, 0); }
    } else if (a.paper === 'notebook') {
      ctx.strokeStyle = 'rgba(70,120,190,0.55)'; ctx.lineWidth = 2;
      for (let y = 90; y < h - 20; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,60,60,0.6)'; ctx.beginPath(); ctx.moveTo(78, 0); ctx.lineTo(78, h); ctx.stroke();
      for (let y = 22; y < h; y += 30) { ctx.clearRect(14, y, 18, 16); if (random() < 0.6) ctx.clearRect(0, y + 4, 16, 8); }
      for (let y = 0; y < h; y += 6) ctx.clearRect(0, y, random() * 7, 6);
    } else if (a.paper === 'receipt') {
      ctx.fillStyle = 'rgba(60,60,70,0.35)'; ctx.font = '22px monospace'; ctx.textAlign = 'center';
      ctx.fillText('* BAR TAB *', w / 2, 44);
      for (let i = 0; i < 5; i++) { ctx.fillRect(40, 70 + i * 26, 190 + random() * 90, 8); ctx.fillRect(w - 110, 70 + i * 26, 70, 8); }
      for (let x = 0; x < w; x += 22) { ctx.clearRect(x, 0, 11, 7); ctx.clearRect(x + 11, h - 7, 11, 7); }
    } else if (a.paper === 'coaster') {
      ctx.strokeStyle = mood.cheer > 0.5 ? 'rgba(190,60,45,0.75)' : 'rgba(35,80,60,0.75)'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 24, 0, 6.28); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 44, 0, 6.28); ctx.stroke();
    } else {
      ctx.fillStyle = '#7a2a22'; ctx.textAlign = 'center'; ctx.font = 'bold 30px serif'; ctx.fillText('HOTEL  MERIDIAN', w / 2, 52);
      ctx.fillRect(w / 2 - 150, 68, 300, 3);
      ctx.font = '16px serif'; ctx.fillText('ROOMS  ·  BAR  ·  CARD ROOM', w / 2, 92);
    }

    // The writing: letter by letter, so the hand can shake.
    const shake = a.hand, ink = mood.cheer < 0.35 ? '#15151a' : '#1c2f7a';
    const write = (text: string, cx: number, y: number, size: number, strike = false) => {
      ctx.font = `italic bold ${size}px "Segoe Script", "Bradley Hand", "Comic Sans MS", cursive`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink; ctx.strokeStyle = ink;
      const fit = Math.min(1, (w * 0.84) / ctx.measureText(text).width);
      const total = ctx.measureText(text).width * fit, slope = (random() - 0.3) * shake * 0.22;
      let x = cx - total / 2;
      ctx.save(); ctx.translate(cx, y); ctx.rotate(-slope); ctx.translate(-cx, -y);
      for (const char of text) {
        const advance = ctx.measureText(char).width * fit;
        ctx.save();
        ctx.translate(x + advance / 2, y + (random() - 0.5) * size * 0.28 * shake);
        ctx.rotate((random() - 0.5) * 0.5 * shake);
        ctx.scale(fit * mix(1, mix(0.8, 1.25, random()), shake), mix(1, mix(0.8, 1.3, random()), shake));
        ctx.fillText(char, -ctx.measureText(char).width / 2, 0);
        ctx.restore();
        x += advance;
      }
      if (strike) { ctx.lineWidth = size * 0.1; ctx.lineCap = 'round'; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(cx - total * 0.58, y + (random() - 0.5) * size * 0.4); ctx.lineTo(cx + total * 0.58, y + (random() - 0.5) * size * 0.4); ctx.stroke(); } }
      ctx.restore();
      return total;
    };
    const [, amount, earlier] = AMOUNTS[a.amount];
    const top = a.paper === 'receipt' ? 0.34 : a.paper === 'stationery' ? 0.3 : 0.24;
    write('I.O.U.', w / 2, h * top, w * 0.2);
    let line = h * (top + 0.2);
    if (shake > 0.6) for (const old of earlier) { write(old, w * mix(0.36, 0.6, random()), line, w * 0.1, true); line += w * 0.12; }
    else line += w * 0.04;
    const amountWidth = write(amount, w / 2, line + w * 0.06, w * (amount.length > 7 ? 0.17 : 0.24));
    ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineWidth = 7;
    for (let k = 0; k < 1 + Math.round(shake * 2); k++) {
      const y = line + w * 0.2 + k * 12;
      ctx.beginPath(); ctx.moveTo(w / 2 - amountWidth * 0.55, y + (random() - 0.5) * 16 * shake); ctx.lineTo(w / 2 + amountWidth * 0.55, y + (random() - 0.5) * 16 * shake); ctx.stroke();
    }
    const signY = Math.min(h - 54, line + w * 0.36), signX = w * 0.64;
    if (a.signed === 'scrawl') {
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(signX - 110, signY);
      for (let i = 1; i <= 16; i++) ctx.quadraticCurveTo(signX - 110 + i * 13 - 12, signY + (i % 2 ? -1 : 1) * (10 + random() * 26), signX - 110 + i * 13, signY + (random() - 0.5) * 12);
      ctx.lineTo(signX + 130, signY + 14 - random() * 30); ctx.stroke();
    } else if (a.signed === 'cross') {
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(signX - 34, signY - 30); ctx.lineTo(signX + 34, signY + 30); ctx.moveTo(signX + 36, signY - 28); ctx.lineTo(signX - 30, signY + 32); ctx.stroke();
    } else if (a.signed === 'thumb') {
      ctx.strokeStyle = 'rgba(120,14,18,0.8)'; ctx.lineWidth = 3;
      for (let r = 4; r < 34; r += 5) { ctx.beginPath(); ctx.ellipse(signX, signY - 6, r, r * 1.3, 0.3, 0, 6.28); ctx.stroke(); }
    }
    for (let i = 0; i < shake * 5; i++) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(random() * w, h * 0.2 + random() * h * 0.7, 3 + random() * 9, 0, 6.28); ctx.fill(); }

    if (a.fate === 'paid') {
      ctx.save(); ctx.translate(w / 2, h * 0.55); ctx.rotate(-0.3); ctx.globalAlpha = 0.82;
      ctx.strokeStyle = ctx.fillStyle = '#c3232a'; ctx.lineWidth = 10; ctx.strokeRect(-170, -62, 340, 124);
      ctx.font = 'bold 104px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PAID', 0, 6);
      ctx.restore();
    } else if (a.fate === 'stained') {
      ctx.strokeStyle = 'rgba(140,88,30,0.6)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(w * mix(0.3, 0.6, random()), h * mix(0.4, 0.7, random()), w * 0.27, 0, 6.28); ctx.stroke();
    } else if (a.fate === 'crumpled') {
      ctx.strokeStyle = 'rgba(90,80,60,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 240, y + (random() - 0.5) * 240); ctx.stroke(); }
    } else if (a.fate === 'torn') {
      let x = w * mix(0.42, 0.58, random());
      for (let y = 0; y < h; y += 5) { x += (random() - 0.5) * 9; ctx.clearRect(x - 8, y, 16, 5); }
    }

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const sheetMaterial = new THREE.MeshStandardMaterial({ map, roughness: 0.92, side: THREE.DoubleSide, alphaTest: 0.5 });
    const geometry = new THREE.PlaneGeometry(width, depth, 28, 28);
    geometry.rotateX(-Math.PI / 2);
    // Ripple and curl; the pinned spot stays flat on the table.
    const pin: [number, number] = a.weight === 'pen' ? [0, -depth * 0.47] : a.weight === 'knife' ? [width * 0.04, -depth * 0.43] : [-width * 0.33, depth * 0.36];
    const ripple = (a.fate === 'crumpled' ? 0.006 : mix(0.0006, 0.003, mood.wear)) * (a.paper === 'coaster' ? 0.1 : 1);
    const phases = Array.from({ length: 6 }, () => random() * 6.28);
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      const free = a.weight === 'nothing' ? 1 : Math.min(1, Math.hypot(x - pin[0], z - pin[1]) / 0.05);
      const f = a.fate === 'crumpled' ? 150 : 60;
      const wave = Math.abs(Math.sin(x * f + phases[0]) * Math.sin(z * f * 0.9 + phases[1]) + 0.5 * Math.sin(x * f * 2.3 + phases[2]) * Math.sin(z * f * 1.9 + phases[3]));
      const corner = Math.pow(Math.max(Math.abs(x) / (width / 2), Math.abs(z) / (depth / 2)), 5) * (a.paper === 'coaster' ? 0 : mix(0.002, 0.012, mood.wear)) * (0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 2 + phases[4]));
      position.setY(i, 0.0006 + (wave * ripple + Math.max(0, corner)) * free * free);
    }
    geometry.computeVertexNormals();
    const sheet = s.mesh(geometry, sheetMaterial);
    sheet.castShadow = false;
    if (a.paper === 'coaster') s.cylinder(width / 2 - 0.0006, width / 2 - 0.0006, 0.0018, [0, -0.0004, 0], s.material('#b9a987', { roughness: 1 }), 40);
    const yaw = mix(-0.4, 0.4, random());
    s.root.rotation.y = yaw;

    // What pins it.
    const steel = s.material('#c7ccd0', { metalness: 0.9, roughness: 0.22 });
    const [px, pz] = pin;
    if (a.weight === 'chips') {
      const colours = ['#b32a2a', '#1d1d20', '#2f7a48', '#27468f'];
      const n = 2 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const c = colours[Math.floor(random() * colours.length)];
        const ox = (random() - 0.5) * 0.004, oz = (random() - 0.5) * 0.004;
        s.cylinder(0.0195, 0.0195, 0.0034, [px + ox, 0.0025 + i * 0.0034, pz + oz], s.material(c, { roughness: 0.7 }), 24);
        s.cylinder(0.0197, 0.0197, 0.0012, [px + ox, 0.0025 + i * 0.0034, pz + oz], s.material('#efe8d6', { roughness: 0.7 }), 6);
      }
      s.ring(0.012, 0.0007, [px, 0.0044 + (n - 1) * 0.0034, pz], s.material('#efe8d6')).rotation.x = Math.PI / 2;
    } else if (a.weight === 'pen') {
      const body = s.material('#16161a', { roughness: 0.25 }), gold = s.material('#dcb24a', { metalness: 0.9, roughness: 0.25 });
      const pen = new THREE.Group();
      pen.position.set(px, 0.007, pz); pen.rotation.y = mix(-0.25, 0.25, random());
      s.root.add(pen);
      const barrel = s.cylinder(0.0058, 0.0048, 0.1, [0, 0, 0], body, 14); barrel.rotation.z = Math.PI / 2;
      const grip = s.cylinder(0.0048, 0.004, 0.018, [-0.058, 0, 0], body, 12); grip.rotation.z = Math.PI / 2;
      const band = s.cylinder(0.006, 0.006, 0.004, [-0.047, 0, 0], gold, 14); band.rotation.z = Math.PI / 2;
      const nib = s.cylinder(0.0038, 0.0003, 0.018, [-0.075, -0.0008, 0], gold, 4); nib.rotation.z = Math.PI / 2; nib.scale.set(0.5, 1, 1);
      pen.add(barrel, grip, band, nib);
      const cap = new THREE.Group();
      cap.position.set(width * 0.36, 0.0065, depth * 0.2 + 0.03); cap.rotation.y = random() * 3;
      s.root.add(cap);
      const shell = s.cylinder(0.0065, 0.006, 0.05, [0, 0, 0], body, 14); shell.rotation.z = Math.PI / 2;
      const clip = s.box([0.036, 0.0012, 0.0024], [0.004, 0.0068, 0], gold);
      cap.add(shell, clip);
    } else if (a.weight === 'knife') {
      const knife = new THREE.Group();
      knife.position.set(px, 0, pz);
      knife.rotation.set(mix(-0.3, -0.1, random()), random() * 3, mix(-0.2, 0.2, random()));
      s.root.add(knife);
      const blade = s.cylinder(0.009, 0.0004, 0.08, [0, 0.032, 0], steel, 4); blade.scale.set(1, 1, 0.12);
      const guard = s.box([0.03, 0.005, 0.008], [0, 0.074, 0], steel);
      const handle = s.box([0.017, 0.085, 0.011], [0, 0.118, 0], s.material('#3b2418', { roughness: 0.5 }));
      const pommel = s.box([0.018, 0.008, 0.012], [0, 0.164, 0], steel);
      const stud = s.cylinder(0.003, 0.003, 0.013, [0, 0.092, 0], steel, 10); stud.rotation.x = Math.PI / 2;
      knife.add(blade, guard, handle, pommel, stud);
    } else if (a.weight === 'bullet') {
      const brass = s.material('#c99a3d', { metalness: 0.9, roughness: 0.3, emissive: '#4a3206', emissiveIntensity: 0.3 });
      s.cylinder(0.0058, 0.0062, 0.002, [px, 0.002, pz], brass, 16);
      s.cylinder(0.0056, 0.0056, 0.022, [px, 0.014, pz], brass, 16);
      s.lathe([[0.0056, 0], [0.0052, 0.006], [0.0036, 0.012], [0.0012, 0.0155], [0, 0.016]], s.material('#a9603a', { metalness: 0.8, roughness: 0.35 }), [px, 0.025, pz]);
    } else if (a.weight === 'coins') {
      const silver = s.material('#c9cbcc', { metalness: 0.9, roughness: 0.35 }), copper = s.material('#b0703f', { metalness: 0.85, roughness: 0.4 });
      for (let i = 0; i < 5; i++) {
        const r = mix(0.0095, 0.0125, random());
        s.cylinder(r, r, 0.0017, [px + (random() - 0.5) * 0.04, 0.002 + i * 0.0009, pz + (random() - 0.5) * 0.03], random() < 0.4 ? copper : silver, 20);
      }
    }
    return s.finish();
  },
});
