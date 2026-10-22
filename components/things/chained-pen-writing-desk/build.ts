import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
const DATES = {
  ordinary: 'An ordinary weekday, TUE 14 MAR: nothing special.',
  friday13: 'FRI 13: bad luck in brass.',
  crash: 'TUE 29 OCT: the day of the 1929 crash.',
  christmas: 'WED 24 DEC: Christmas Eve, closing early.',
  newyear: 'THU 1 JAN: nobody has turned it since the holiday.',
  payday: 'FRI 30 JUN: payday, end of the month.',
  stuck: 'Cards missing and askew, the date long since abandoned.',
} as const;
const DATE_TEXT: Record<keyof typeof DATES, [string, string, string]> = {
  ordinary: ['TUE', '14', 'MAR'], friday13: ['FRI', '13', 'JUN'], crash: ['TUE', '29', 'OCT'], christmas: ['WED', '24', 'DEC'],
  newyear: ['THU', '1', 'JAN'], payday: ['FRI', '30', 'JUN'], stuck: ['', '3', 'M Y'],
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    style: choice('What kind of desk is it?', {
      marble: 'A marble island on slab pedestals with brass rails, built with the hall.',
      oak: 'Dark oak on turned legs with a brass foot rail.',
      seventies: 'Orange laminate on a chrome tulip column, a 1970s branch.',
      steel: 'Grey enamelled steel, a post-office issue desk.',
      deco: 'Black glass and stepped chrome, Art Deco.',
    }),
    slips: choice('How are the deposit slips?', {
      neat: 'Squared in full stacks in every pigeonhole.',
      low: 'Nearly run out: a few holes hold a last thin stack.',
      strewn: 'Strewn across the glass and drifting onto the floor.',
      mixed: 'Stuffed back into the wrong holes at all angles.',
    }),
    pen: choice('What state are the chained pens in?', {
      holders: 'All standing in their holders.',
      inuse: 'One lies on the glass where someone just put it down.',
      dangling: 'One hangs over the edge on its chain.',
      snapped: 'One has been snapped off: a bare chain end hangs loose.',
      stolen: 'Every pen is gone, only chains remain.',
    }),
    left: choice('What has been left behind on the glass?', {
      nothing: 'Nothing.',
      halfslip: 'A deposit slip filled in halfway, then abandoned.',
      doodle: 'A slip covered in a spiralling doodle.',
      holdup: 'A hand-printed note in block capitals, the kind handed to a teller.',
      crumpled: 'A few crumpled false starts.',
      passbook: 'A passbook and a pair of reading glasses.',
      coffee: 'A paper cup and a ring where it stood.',
    }),
    date: choice('What does the perpetual calendar show?', DATES),
    lamp: noul('Does a twin green-shaded lamp stand over the pigeonholes?'),
    under: choice('What lies under the glass?', {
      blotter: 'A plain green blotter.',
      forms: 'Specimen forms laid out in a row with arrows.',
      rates: 'A typed notice of interest rates.',
      felt: 'Dark red felt.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d6a640').lerp(new THREE.Color('#77775a'), mood.wear * 0.5), metalness: 0.6, roughness: mix(0.28, 0.7, mood.wear) });
    const chrome = new THREE.MeshStandardMaterial({ color: '#dde2e5', metalness: 0.65, roughness: 0.22 });
    const dark = s.material('#24211f');
    const bodyHex = { marble: '#e6e2d8', oak: '#5a3a24', seventies: '#e2742a', steel: '#8d979a', deco: '#1d1e22' }[a.style];
    const body = s.material(bodyHex, { roughness: a.style === 'marble' || a.style === 'deco' ? 0.3 : 0.6 });
    const trim = a.style === 'seventies' || a.style === 'deco' || a.style === 'steel' ? chrome : brass;
    const W = 1.5, D = 0.76, TOP = 1.06;

    // Base.
    if (a.style === 'marble') {
      for (const x of [-0.5, 0.5]) { s.box([0.14, TOP - 0.1, D - 0.14], [x, (TOP - 0.1) / 2 + 0.05, 0], body); s.box([0.24, 0.1, D], [x, 0.05, 0], s.material('#3b3d40', { roughness: 0.4 })); }
      s.box([1.0, 0.5, 0.06], [0, 0.6, 0], body);
      for (const z of [-D / 2 - 0.03, D / 2 + 0.03]) s.rod([-0.62, 0.2, z], [0.62, 0.2, z], 0.018, brass);
    } else if (a.style === 'oak') {
      const leg: [number, number][] = [[0, 0], [0.035, 0], [0.04, 0.05], [0.028, 0.1], [0.045, 0.3], [0.03, 0.5], [0.045, 0.8], [0.04, 0.95], [0.05, 1.0]];
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe(leg, body, [x * (W / 2 - 0.1), 0, z * (D / 2 - 0.08)]);
      s.box([W - 0.1, 0.14, D - 0.06], [0, TOP - 0.1, 0], body);
      s.box([W - 0.24, 0.04, 0.1], [0, 0.22, 0], body);
      for (const x of [-1, 1]) s.box([0.06, 0.04, D - 0.2], [x * (W / 2 - 0.1), 0.22, 0], body);
      s.rod([-W / 2 + 0.1, 0.14, D / 2 - 0.02], [W / 2 - 0.1, 0.14, D / 2 - 0.02], 0.016, brass);
    } else if (a.style === 'seventies') {
      s.lathe([[0, 0], [0.38, 0], [0.36, 0.03], [0.12, 0.09], [0.07, 0.3], [0.07, 0.8], [0.2, 0.98], [0.3, 1.0]], chrome);
      s.box([W, 0.06, D], [0, TOP - 0.05, 0], s.material('#5a3d2a'));
    } else if (a.style === 'steel') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, TOP, 0.05], [x * (W / 2 - 0.06), TOP / 2, z * (D / 2 - 0.06)], body);
      s.box([W - 0.04, 0.16, D - 0.04], [0, TOP - 0.1, 0], body);
      s.box([W - 0.16, 0.03, D - 0.16], [0, 0.2, 0], body);
    } else {
      s.box([0.9, 0.08, 0.5], [0, 0.04, 0], body);
      s.box([0.7, 0.08, 0.38], [0, 0.12, 0], chrome);
      s.box([0.5, TOP - 0.3, 0.26], [0, 0.16 + (TOP - 0.3) / 2, 0], body);
      for (const y of [0.4, 0.6, 0.8]) s.box([0.52, 0.02, 0.28], [0, y, 0], chrome);
      s.box([1.0, 0.08, 0.5], [0, TOP - 0.1, 0], chrome);
    }
    // Top, what lies under the glass, and the glass.
    s.box([W, 0.05, D], [0, TOP - 0.025, 0], body);
    s.box([W + 0.02, 0.016, D + 0.02], [0, TOP - 0.052, 0], trim);
    const underHex = { blotter: '#2f6a48', forms: '#cfc7ad', rates: '#d8d2bd', felt: '#6d1c24' }[a.under];
    s.box([W - 0.1, 0.004, D - 0.1], [0, TOP + 0.002, 0], s.material(underHex, { roughness: 1 }));
    if (a.under === 'forms' || a.under === 'rates') {
      for (const z of [-0.24, 0.24]) for (let i = 0; i < (a.under === 'forms' ? 4 : 2); i++) {
        const w = a.under === 'forms' ? 0.22 : 0.4;
        const sheet = s.mesh(new THREE.PlaneGeometry(w, 0.13), paint(128, 80, (ctx) => {
          ctx.fillStyle = a.under === 'forms' ? ['#f3ecd6', '#f1d7d2', '#d8e6ee', '#f0e6b4'][i] : '#f4efe0';
          ctx.fillRect(0, 0, 128, 80);
          ctx.fillStyle = '#3a3a3a';
          for (let r = 0; r < 6; r++) ctx.fillRect(10, 12 + r * 11, 60 + ((r * 37 + i * 13) % 45), 3);
        }), [(i - (a.under === 'forms' ? 1.5 : 0.5)) * (w + 0.1), TOP + 0.005, z]);
        sheet.rotation.x = -Math.PI / 2;
        if (z < 0) sheet.rotation.z = Math.PI;
      }
    }
    const G = TOP + 0.014;
    s.box([W - 0.04, 0.01, D - 0.04], [0, TOP + 0.009, 0], new THREE.MeshStandardMaterial({ color: '#cfe6e2', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }));
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.014, 0.008, [x * (W / 2 - 0.05), G, z * (D / 2 - 0.05)], trim, 10);

    // Pigeonhole spine, open on both long sides.
    const SW = 1.1, SH = 0.2, SD = 0.2, sy = G + SH / 2;
    s.box([SW, SH, SD - 0.06], [0, sy, 0], dark);
    s.box([SW + 0.03, 0.02, SD], [0, G + SH, 0], body);
    s.box([SW + 0.03, 0.015, SD], [0, G + 0.006, 0], body);
    const holes = 6, cell = SW / holes;
    for (let i = 0; i <= holes; i++) s.box([0.014, SH, SD], [-SW / 2 + i * cell, sy, 0], body);
    const slipHex = ['#f3ecd6', '#f1cfc8', '#cfe0ec', '#efe2a4', '#d5e8cf', '#f3ecd6'];
    const fillOf = (i: number, side: number) => {
      if (a.slips === 'neat') return 0.85;
      if (a.slips === 'low') return random() < 0.3 ? 0.2 : 0;
      if (a.slips === 'strewn') return random() < 0.5 ? random() * 0.5 : 0;
      return 0.3 + random() * 0.6 + side * 0;
    };
    for (let i = 0; i < holes; i++) for (const side of [-1, 1]) {
      const fill = fillOf(i, side);
      if (fill <= 0) continue;
      const h = (SH - 0.04) * fill;
      const stack = s.box([cell - 0.04, h, 0.1], [-SW / 2 + (i + 0.5) * cell, G + 0.014 + h / 2, side * (SD / 2 - 0.035)], s.material(slipHex[(i + (side > 0 ? 0 : 3)) % 6], { roughness: 1 }));
      if (a.slips === 'mixed') { stack.rotation.y = (random() - 0.5) * 0.5; stack.rotation.z = (random() - 0.5) * 0.3; stack.position.z += side * 0.03; }
    }

    // Perpetual calendar on the spine.
    const [day, num, month] = DATE_TEXT[a.date];
    const cy = G + SH + 0.01;
    const calendar = new THREE.Group();
    calendar.position.set(a.lamp ? 0.3 : 0, cy, 0);
    calendar.rotation.y = (random() - 0.5) * 0.2;
    s.root.add(calendar);
    const frameShape = s.box([0.3, 0.3, 0.09], [0, 0.15, 0], brass);
    calendar.add(frameShape);
    calendar.add(s.box([0.34, 0.025, 0.13], [0, 0.0125, 0], brass));
    for (const side of [-1, 1]) {
      const face = s.mesh(new THREE.PlaneGeometry(0.25, 0.25), paint(256, 256, (ctx) => {
        ctx.fillStyle = '#f2ecd8'; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#1f1f1f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px monospace'; ctx.fillText(day, 128, 34);
        ctx.fillStyle = a.date === 'friday13' || a.date === 'crash' ? '#a11b1b' : '#1f1f1f';
        ctx.font = 'bold 150px monospace'; ctx.fillText(num, 128, 132);
        ctx.fillStyle = '#1f1f1f'; ctx.font = 'bold 44px monospace'; ctx.fillText(month, 128, 228);
        ctx.fillRect(0, 60, 256, 4); ctx.fillRect(0, 198, 256, 4);
      }), [0, 0.15, side * 0.046]);
      if (side < 0) face.rotation.y = Math.PI;
      if (a.date === 'stuck') face.rotation.z = (random() - 0.5) * 0.25;
      calendar.add(face);
    }
    for (const x of [-0.16, 0.16]) { const knob = s.cylinder(0.02, 0.02, 0.03, [x, 0.15, 0], brass, 10); knob.rotation.z = Math.PI / 2; calendar.add(knob); }

    if (a.lamp) {
      const lx = -0.25;
      s.cylinder(0.05, 0.06, 0.02, [lx, cy + 0.01, 0], brass, 14);
      s.rod([lx, cy, 0], [lx, cy + 0.3, 0], 0.012, brass);
      const shade = new THREE.MeshStandardMaterial({ color: '#1f7a4a', emissive: '#2fd27a', emissiveIntensity: mix(0.2, 0.7, mood.cheer), roughness: 0.4 });
      for (const side of [-1, 1]) {
        s.rod([lx, cy + 0.28, 0], [lx, cy + 0.3, side * 0.2], 0.01, brass);
        const sh = s.cylinder(0.06, 0.06, 0.4, [lx, cy + 0.3, side * 0.22], shade, 14);
        sh.rotation.z = Math.PI / 2;
        s.box([0.36, 0.01, 0.09], [lx, cy + 0.255, side * 0.22], new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffe9a0', emissiveIntensity: mix(0.6, 2, mood.cheer) }));
      }
    }

    // Pens on chains: two per long side.
    const chainMat = new THREE.MeshStandardMaterial({ color: '#c9ced1', metalness: 0.6, roughness: 0.35 });
    const penMat = s.material('#1b1b1f', { roughness: 0.35 });
    const anchors: { x: number; side: number }[] = [{ x: -0.42, side: 1 }, { x: 0.42, side: 1 }, { x: -0.42, side: -1 }, { x: 0.42, side: -1 }];
    const special = Math.floor(random() * 2);
    let swing: THREE.Group | null = null;
    anchors.forEach(({ x, side }, index) => {
      const z = side * 0.2;
      s.cylinder(0.036, 0.045, 0.06, [x, G + 0.03, z], trim, 12);
      const anchor: P3 = [x + 0.06, G + 0.006, z];
      s.cylinder(0.012, 0.012, 0.012, anchor, trim, 8);
      const state = index === special ? a.pen : a.pen === 'stolen' ? 'stolen' : 'holders';
      const pen = (from: P3, to: P3) => { s.rod(from, to, 0.013, penMat, 0.011); s.rod(to, [to[0] + (to[0] - from[0]) * 0.12, to[1] + (to[1] - from[1]) * 0.12, to[2] + (to[2] - from[2]) * 0.12], 0.006, chainMat, 0.001); };
      if (state === 'holders') {
        const tip: P3 = [x + 0.04, G + 0.26, z - side * 0.04];
        pen(tip, [x, G + 0.03, z]);
        s.tube([anchor, [x + 0.1, G + 0.02, z + side * 0.05], [x + 0.08, G + 0.12, z], tip], 0.007, chainMat);
      } else if (state === 'inuse') {
        const px = x + 0.16, pz = side * 0.31;
        pen([px - 0.07, G + 0.01, pz - 0.03], [px + 0.07, G + 0.01, pz + 0.03]);
        s.tube([anchor, [x + 0.1, G + 0.012, z + side * 0.06], [px - 0.1, G + 0.012, pz + side * 0.02], [px - 0.07, G + 0.012, pz - 0.03]], 0.007, chainMat);
      } else if (state === 'dangling' || state === 'snapped') {
        const edge: P3 = [x + 0.08, G + 0.004, side * (D / 2 - 0.01)];
        s.tube([anchor, [x + 0.07, G + 0.01, side * 0.3], edge], 0.007, chainMat);
        const hang = new THREE.Group();
        hang.position.set(...edge);
        s.root.add(hang);
        const drop = state === 'snapped' ? 0.18 : 0.34;
        hang.add(s.rod([0, 0, side * 0.012], [0, -drop, side * 0.012], 0.007, chainMat));
        if (state === 'dangling') hang.add(s.rod([0, -drop, side * 0.012], [0, -drop - 0.15, side * 0.012], 0.013, penMat, 0.006));
        swing = hang;
        if (state === 'snapped') {
          const fx = x + 0.2 + random() * 0.2, fz = side * (D / 2 + 0.15 + random() * 0.2);
          s.rod([fx, 0.01, fz], [fx + 0.1, 0.01, fz + 0.08], 0.013, penMat);
          s.rod([fx + 0.12, 0.01, fz + 0.1], [fx + 0.16, 0.01, fz + 0.1], 0.013, penMat);
        }
      } else {
        s.tube([anchor, [x + 0.1, G + 0.01, z + side * 0.05], [x + 0.16, G + 0.01, z + side * 0.02 + (random() - 0.5) * 0.06], [x + 0.2, G + 0.01, z + side * 0.07]], 0.007, chainMat);
      }
    });

    // Loose slips.
    const paper = (w: number, d: number, at: P3, hex: string, turn: number) => { const m = s.box([w, 0.002, d], at, s.material(hex, { roughness: 1 })); m.rotation.y = turn; return m; };
    if (a.slips === 'strewn') {
      const n = 10 + Math.round(mood.density * 16);
      for (let i = 0; i < n; i++) {
        const onTop = random() < 0.5;
        const side = random() < 0.5 ? -1 : 1;
        if (onTop) paper(0.17, 0.075, [(random() - 0.5) * (W - 0.2), G + 0.004 + i * 0.0015, side * (0.16 + random() * 0.18)], slipHex[i % 6], random() * 3);
        else paper(0.17, 0.075, [(random() - 0.5) * (W + 0.8), 0.004 + i * 0.001, side * (D / 2 + 0.05 + random() * 0.5)], slipHex[i % 6], random() * 3);
      }
    }
    // What was left behind, on the +z side where it faces the viewer.
    const lx = (random() - 0.5) * 0.3, lz = 0.28;
    if (a.left === 'halfslip' || a.left === 'doodle' || a.left === 'holdup') {
      const big = a.left === 'holdup';
      const sheet = s.mesh(new THREE.PlaneGeometry(big ? 0.3 : 0.26, big ? 0.17 : 0.13), paint(320, 180, (ctx) => {
        ctx.fillStyle = a.left === 'holdup' ? '#f6f1df' : '#f1d9cf'; ctx.fillRect(0, 0, 320, 180);
        if (a.left === 'halfslip') {
          ctx.fillStyle = '#7a3b34'; ctx.font = 'bold 22px monospace'; ctx.fillText('DEPOSIT', 14, 28);
          ctx.strokeStyle = '#7a3b34'; ctx.lineWidth = 2;
          for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(14, 62 + r * 30); ctx.lineTo(306, 62 + r * 30); ctx.stroke(); }
          ctx.strokeStyle = '#1b2a6b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(24, 54);
          for (let x = 24; x < 190; x += 9) ctx.lineTo(x, 54 - ((x * 7) % 19));
          ctx.stroke(); ctx.beginPath(); ctx.moveTo(24, 86);
          for (let x = 24; x < 96; x += 9) ctx.lineTo(x, 86 - ((x * 5) % 17));
          ctx.stroke();
        } else if (a.left === 'doodle') {
          ctx.strokeStyle = '#1b2a6b'; ctx.lineWidth = 4; ctx.beginPath();
          for (let t = 0; t < 40; t += 0.15) ctx.lineTo(160 + Math.cos(t) * t * 3.6, 90 + Math.sin(t) * t * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#16161a'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
          ctx.fillText('THIS IS A', 160, 50); ctx.fillText('ROBBERY', 160, 100); ctx.font = 'bold 24px monospace'; ctx.fillText('STAY CALM', 160, 150);
        }
      }), [lx, G + 0.008, lz]);
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = (random() - 0.5) * 0.5;
    } else if (a.left === 'crumpled') {
      for (let i = 0; i < 4; i++) s.mesh(new THREE.DodecahedronGeometry(0.03 + random() * 0.012, 0), s.material(slipHex[i], { roughness: 1 }), [lx + (random() - 0.5) * 0.4, G + 0.03, lz + (random() - 0.5) * 0.1]).rotation.set(random() * 3, random() * 3, 0);
    } else if (a.left === 'passbook') {
      paper(0.1, 0.15, [lx, G + 0.01, lz], '#27407a', 0.4).scale.y = 6;
      for (const f of [-0.035, 0.035]) s.ring(0.025, 0.004, [lx + 0.2 + f, G + 0.008, lz], dark).rotation.x = Math.PI / 2;
    } else if (a.left === 'coffee') {
      s.cylinder(0.04, 0.03, 0.1, [lx + 0.1, G + 0.055, lz], s.material('#f3efe6'), 14);
      s.cylinder(0.036, 0.036, 0.004, [lx + 0.1, G + 0.103, lz], s.material('#3b2416'), 14);
      s.ring(0.032, 0.003, [lx - 0.08, G + 0.007, lz - 0.02], s.material('#7a5a3a')).rotation.x = Math.PI / 2;
    }
    // A wastebasket appears as the room fills up.
    if (mood.density > 0.45) {
      const bx = W / 2 + 0.28, bz = (random() - 0.5) * 0.3;
      const bin = s.mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.36, 16, 1, true), new THREE.MeshStandardMaterial({ color: a.style === 'seventies' ? '#6d4a2a' : '#4a5052', roughness: 0.7, side: THREE.DoubleSide }), [bx, 0.18, bz]);
      bin.name = 'bin';
      s.cylinder(0.13, 0.13, 0.01, [bx, 0.005, bz], dark, 16);
      for (let i = 0; i < Math.round(mood.density * 8); i++) s.mesh(new THREE.DodecahedronGeometry(0.04, 0), s.material(slipHex[i % 6], { roughness: 1 }), [bx + (random() - 0.5) * 0.18, 0.2 + random() * 0.18, bz + (random() - 0.5) * 0.18]);
    }

    const hanging = swing as THREE.Group | null;
    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => { if (hanging) hanging.rotation.x = Math.sin(time * 3.1) * mix(0.03, 0.5, energy); },
    });
  },
});
