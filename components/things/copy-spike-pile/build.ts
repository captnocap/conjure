import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const VERDICTS = {
  kill: 'KILL, stamped in red: the story is dead.',
  spiked: 'SPIKED, in heavy red capitals.',
  rewrite: 'REWRITE, scrawled in blue pencil across every line.',
  libel: 'LIBEL? circled twice: the lawyers said no.',
  no: 'A single enormous NO.',
  seeme: 'SEE ME, underlined: someone is in trouble.',
  thirty: 'The end mark -30-: the last copy the paper ever handled.',
  true: 'TRUE, BUT NO: the scoop that was never allowed to run.',
} as const;
const WORDS: Record<keyof typeof VERDICTS, [string[], string]> = {
  kill: [['KILL'], '#c2261c'], spiked: [['SPIKED'], '#c2261c'], rewrite: [['REWRITE'], '#1f4fb5'], libel: [['LIBEL?'], '#1f4fb5'],
  no: [['NO'], '#c2261c'], seeme: [['SEE ME'], '#1f4fb5'], thirty: [['- 30 -'], '#26262a'], true: [['TRUE,', 'BUT NO'], '#1f4fb5'],
};

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineThing({
  questions: {
    height: score('How tall is the stack on the spike?', ['One killed story', 'A morning\'s rejections', 'Half way up the spike', 'Crammed to the point and leaning']),
    verdict: choice('What does the top sheet say?', VERDICTS),
    paper: choice('What is the copy typed on?', {
      bond: 'Clean white bond.',
      yellow: 'Cheap yellow copy paper.',
      flimsy: 'A mix of white sheets and pink and green carbon flimsies.',
      galley: 'Long narrow galley proofs hanging over the sides.',
    }),
    spike: choice('What kind of spike is it?', {
      iron: 'A steel needle on a heavy cast-iron disc.',
      brass: 'A brass spindle with a turned base, a retirement gift.',
      nail: 'A long nail driven up through a block of wood, home-made.',
      hook: 'A bill hook that curls over at the top like a question mark.',
    }),
    trays: choice('What are the trays like?', {
      none: 'No trays, just the spike.',
      pair: 'IN and OUT trays side by side.',
      tiers: 'A two-tier stack, IN over OUT.',
      tower: 'A three-tier tower: IN, OUT and HOLD.',
    }),
    flow: choice('Which tray is fuller?', {
      in: 'IN is overflowing and OUT is empty: nothing is getting through.',
      even: 'About even, a steady day.',
      out: 'IN is bare and OUT is piled high: a ruthless, efficient desk.',
      empty: 'Both empty. Everything went on the spike.',
    }),
    pot: choice('What holds the blue pencils?', {
      jar: 'A glass jam jar.',
      tin: 'An old tobacco tin can.',
      mug: 'A chipped white mug.',
      brass: 'A brass cup.',
    }),
    beside: choice('What else is at the editor\'s elbow?', {
      nothing: 'Nothing else.',
      paste: 'Scissors and a paste pot, for cutting stories to fit.',
      stamp: 'A rubber stamp on an open red ink pad.',
      shade: 'A green celluloid eyeshade, taken off.',
      rescued: 'One sheet pulled back off the spike, smoothed flat, a hole through its middle: a second thought.',
    }),
    surface: choice('What does it all sit on?', {
      blotter: 'A green leather desk blotter.',
      steel: 'A grey steel desk top.',
      oak: 'Scarred, ink-stained oak.',
      glass: 'A sheet of glass over old clippings.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#c9cdcf', { metalness: 0.9, roughness: 0.25 });
    const dark = s.material('#1f2123', { roughness: 0.6 });
    const brass = s.material('#c79a3a', { metalness: 0.85, roughness: 0.28 });
    const aged = mood.wear > 0.6;
    const whites = aged ? ['#e8dfc1', '#e2d6b2', '#ece4cb'] : ['#f6f3ea', '#efebdd', '#faf8f1'];
    const tints = a.paper === 'yellow' ? ['#f0dd7a', '#ead46a', '#f3e391'] : a.paper === 'flimsy' ? [whites[0], '#f0b9c0', '#b9dcb9', whites[1]] : whites;

    // Desk surface.
    const hasTrays = a.trays !== 'none';
    const W = a.trays === 'pair' ? 1.16 : hasTrays ? 0.92 : 0.62, D = 0.5;
    const top = 0.03;
    if (a.surface === 'blotter') {
      s.box([W, top, D], [0, top / 2, 0], s.material('#3b2a1c'));
      s.box([W - 0.06, 0.004, D - 0.06], [0, top + 0.001, 0], s.material('#35604a', { roughness: 0.8 }));
      for (const sx of [-1, 1]) s.box([0.05, 0.008, D], [sx * (W / 2 - 0.025), top + 0.003, 0], s.material('#4a2f1b'));
    } else if (a.surface === 'steel') {
      s.box([W, top, D], [0, top / 2, 0], s.material('#868f8f', { metalness: 0.4, roughness: 0.45 }));
      s.box([W - 0.04, 0.003, D - 0.04], [0, top + 0.001, 0], s.material('#5f6f66'));
    } else if (a.surface === 'oak') {
      s.box([W, top, D], [0, top / 2, 0], s.material('#7a5230', { roughness: 0.6 }));
      const ink = new THREE.MeshStandardMaterial({ color: '#1c2a55', roughness: 0.5 });
      for (let i = 0; i < 3 + Math.round(mood.wear * 5); i++) { const blot = s.cylinder(0.01 + random() * 0.025, 0.01, 0.001, [(random() - 0.5) * (W - 0.1), top + 0.0006, (random() - 0.5) * (D - 0.1)], ink, 10); blot.castShadow = false; }
    } else {
      s.box([W, top, D], [0, top / 2, 0], s.material('#4a3423'));
      for (let i = 0; i < 9; i++) s.box([0.1 + random() * 0.1, 0.001, 0.07 + random() * 0.1], [(random() - 0.5) * (W - 0.2), top + 0.001, (random() - 0.5) * (D - 0.15)], s.material(whites[i % 3])).rotation.y = random() * 3;
      s.box([W - 0.02, 0.006, D - 0.02], [0, top + 0.005, 0], new THREE.MeshStandardMaterial({ color: '#cfe3e0', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
    }
    const Y = top + (a.surface === 'glass' ? 0.008 : 0.004);

    // The spike.
    const sx = a.trays === 'pair' ? -0.38 : hasTrays ? -0.26 : -0.05, sz = 0.02;
    const spikeTop = Y + 0.34;
    const metal = a.spike === 'brass' ? brass : chrome;
    if (a.spike === 'iron') s.lathe([[0, 0], [0.065, 0], [0.068, 0.012], [0.05, 0.022], [0.016, 0.03], [0, 0.03]], dark, [sx, Y, sz]);
    else if (a.spike === 'brass') s.lathe([[0, 0], [0.055, 0], [0.058, 0.01], [0.04, 0.016], [0.03, 0.03], [0.012, 0.036], [0.018, 0.046], [0.006, 0.052], [0, 0.052]], brass, [sx, Y, sz]);
    else if (a.spike === 'nail') s.box([0.11, 0.035, 0.11], [sx, Y + 0.0175, sz], s.material('#a57a47', { roughness: 0.8 })).rotation.y = 0.2;
    else s.lathe([[0, 0], [0.06, 0], [0.06, 0.01], [0.012, 0.02], [0, 0.02]], dark, [sx, Y, sz]);
    if (a.spike === 'hook') s.tube([[sx, Y + 0.01, sz], [sx, Y + 0.2, sz], [sx + 0.004, Y + 0.31, sz], [sx + 0.035, spikeTop, sz], [sx + 0.066, Y + 0.31, sz], [sx + 0.068, Y + 0.28, sz]], 0.005, metal);
    else s.rod([sx, Y + 0.01, sz], [sx, spikeTop, sz], 0.0055, metal, 0.0008);

    // Impaled copy: drooping sheets sharing a few geometries, the top one painted.
    const base = Y + (a.spike === 'brass' ? 0.054 : a.spike === 'nail' ? 0.037 : 0.032);
    const count = Math.max(1, Math.round(mix(1, 46, Math.min(1, a.height * 0.9 + mood.density * 0.1))));
    const gap = Math.min(0.0045, (spikeTop - base - 0.09) / count);
    const galley = a.paper === 'galley';
    const sheetW = galley ? 0.12 : 0.2, sheetH = galley ? 0.42 : 0.27;
    const droopy = (amount: number) => {
      const geometry = new THREE.PlaneGeometry(sheetW, sheetH, 6, 8);
      const at = geometry.attributes.position;
      const k1 = random() * 6, k2 = random() * 6;
      for (let i = 0; i < at.count; i++) {
        const x = at.getX(i), y = at.getY(i), r = Math.hypot(x, y) / (sheetH / 2);
        at.setZ(i, -r * r * amount * (galley ? 0.09 : 0.03) + Math.sin(x * 40 + k1) * Math.cos(y * 30 + k2) * 0.004 * r);
      }
      geometry.rotateX(-Math.PI / 2);
      geometry.computeVertexNormals();
      return geometry;
    };
    const shapes = [droopy(1), droopy(0.5), droopy(1.6)];
    const papers = tints.map((tint) => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.92, side: THREE.DoubleSide }));
    const [words, ink] = WORDS[a.verdict];
    const topTexture = paint(384, 512, (g) => {
      g.fillStyle = tints[0];
      g.fillRect(0, 0, 384, 512);
      g.fillStyle = '#4a4a50';
      for (let y = 50; y < 480; y += 26) for (let x = 30; x < 350;) { const word = 20 + random() * 50; g.fillRect(x, y, Math.min(word, 354 - x), 7); x += word + 12; }
      g.strokeStyle = '#1f4fb5';
      g.lineWidth = 5;
      for (let i = 0; i < 4; i++) { const y = 70 + random() * 380; g.beginPath(); g.moveTo(30, y); g.lineTo(200 + random() * 150, y + (random() - 0.5) * 12); g.stroke(); }
      g.translate(192, 256);
      g.rotate(-0.22 + random() * 0.12);
      g.fillStyle = ink;
      g.strokeStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const size = Math.min(150, 620 / Math.max(...words.map((word) => word.length)));
      g.font = `900 ${size}px sans-serif`;
      words.forEach((word, index) => g.fillText(word, 0, (index - (words.length - 1) / 2) * size * 1.02, 350));
      if (ink === '#c2261c') { g.lineWidth = 10; g.strokeRect(-178, -size * words.length * 0.62, 356, size * words.length * 1.24); }
      else { g.lineWidth = 7; g.beginPath(); g.moveTo(-160, size * words.length * 0.56); g.lineTo(165, size * words.length * 0.5); g.stroke(); }
    });
    const topMaterial = new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.9, side: THREE.DoubleSide });
    let topSheet: THREE.Mesh | null = null;
    const lean = a.height > 0.75 ? 0.02 : 0;
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      const sheet = s.mesh(shapes[i % 3], last ? topMaterial : papers[Math.floor(random() * papers.length)], [sx + (random() - 0.5) * 0.012 + lean * i / count, base + i * gap + 0.002, sz + (random() - 0.5) * 0.012]);
      sheet.rotation.set((random() - 0.5) * 0.1, last ? 0.25 + (random() - 0.5) * 0.3 : (random() - 0.5) * 1.3, (random() - 0.5) * 0.1);
      if (last) topSheet = sheet;
    }

    // Trays.
    const trayMaterial = a.surface === 'steel' ? s.material('#6f7879', { metalness: 0.5, roughness: 0.4 }) : s.material('#8a6238', { roughness: 0.6 });
    const full = { in: [1, 0.03], even: [0.5, 0.45], out: [0.06, 1], empty: [0.02, 0.02] }[a.flow];
    const tray = (x: number, y: number, z: number, name: string, fill: number) => {
      s.box([0.26, 0.008, 0.34], [x, y + 0.004, z], trayMaterial);
      for (const side of [-1, 1]) s.box([0.008, 0.055, 0.34], [x + side * 0.13, y + 0.0275, z], trayMaterial);
      s.box([0.26, 0.055, 0.008], [x, y + 0.0275, z - 0.17], trayMaterial);
      s.box([0.07, 0.03, 0.008], [x - 0.095, y + 0.015, z + 0.17], trayMaterial);
      s.box([0.07, 0.03, 0.008], [x + 0.095, y + 0.015, z + 0.17], trayMaterial);
      s.label(name, 0.1, 0.035, [x, y + 0.02, z + 0.176], '#22262a', '#efe6c8');
      const sheets = Math.round(fill * mix(7, 13, mood.density));
      for (let i = 0; i < sheets; i++) {
        const sheet = s.box([0.21, 0.004, 0.28], [x + (random() - 0.5) * 0.02, y + 0.011 + i * 0.0042, z + (random() - 0.5) * 0.03 + (fill > 0.9 && i > 8 ? 0.05 : 0)], papers[Math.floor(random() * papers.length)]);
        sheet.rotation.y = (random() - 0.5) * (fill > 0.9 ? 0.5 : 0.12);
      }
    };
    const posts = (x: number, z: number, height: number) => { for (const px of [-0.125, 0.125]) for (const pz of [-0.15, 0.12]) s.rod([x + px, Y, z + pz], [x + px, Y + height, z + pz], 0.004, chrome); };
    const tx = 0.24;
    if (a.trays === 'pair') { tray(tx - 0.13, Y, -0.03, 'IN', full[0]); tray(tx + 0.17, Y, -0.03, 'OUT', full[1]); }
    if (a.trays === 'tiers') { posts(tx, -0.02, 0.12); tray(tx, Y + 0.12, -0.02, 'IN', Math.min(full[0], 0.7)); tray(tx, Y, -0.02, 'OUT', Math.min(full[1], 0.55)); }
    if (a.trays === 'tower') { posts(tx, -0.02, 0.24); tray(tx, Y + 0.24, -0.02, 'IN', Math.min(full[0], 0.7)); tray(tx, Y + 0.12, -0.02, 'OUT', Math.min(full[1], 0.55)); tray(tx, Y, -0.02, 'HOLD', 0.3 + random() * 0.25); }

    // Pot of blue pencils.
    const px = a.trays === 'pair' ? -0.14 : hasTrays ? -0.02 : 0.16, pz = hasTrays ? 0.15 : -0.1;
    const potMaterial = a.pot === 'jar' ? new THREE.MeshStandardMaterial({ color: '#cfe3e0', transparent: true, opacity: 0.4, roughness: 0.05 }) : a.pot === 'tin' ? s.material('#a3472f', { metalness: 0.4, roughness: 0.5 }) : a.pot === 'mug' ? s.material('#efece2', { roughness: 0.3 }) : brass;
    s.cylinder(0.036, a.pot === 'brass' ? 0.028 : 0.034, 0.1, [px, Y + 0.05, pz], potMaterial, 18);
    if (a.pot === 'mug') s.ring(0.026, 0.006, [px + 0.042, Y + 0.05, pz], potMaterial);
    if (a.pot === 'tin') s.cylinder(0.0365, 0.0365, 0.04, [px, Y + 0.05, pz], s.material('#e9dcb1'), 18);
    const blue = s.material('#2456b8', { roughness: 0.5 }), wood = s.material('#d9b680'), red = s.material('#c2261c');
    const pencils = 4 + Math.round(mood.density * 6);
    for (let i = 0; i < pencils; i++) {
      const angle = random() * 6.28, spread = 0.02 + random() * 0.035, len = 0.13 + random() * 0.06;
      const from: [number, number, number] = [px + Math.cos(angle) * 0.012, Y + 0.012, pz + Math.sin(angle) * 0.012];
      const to: [number, number, number] = [px + Math.cos(angle) * spread, Y + len, pz + Math.sin(angle) * spread];
      const tip: [number, number, number] = [to[0] + (to[0] - from[0]) * 0.12, to[1] + 0.02, to[2] + (to[2] - from[2]) * 0.12];
      s.rod(from, to, 0.0045, i === 1 ? red : blue);
      s.rod(to, tip, 0.0045, wood, 0.0008);
    }
    // One blue pencil lying where it was dropped.
    const lx = sx + 0.17, lz = 0.17;
    s.rod([lx - 0.07, Y + 0.005, lz - 0.02], [lx + 0.07, Y + 0.005, lz + 0.02], 0.0045, blue);
    s.rod([lx + 0.07, Y + 0.005, lz + 0.02], [lx + 0.088, Y + 0.005, lz + 0.025], 0.0045, wood, 0.0008);

    // At the editor's elbow.
    const ex = sx - 0.01, ez = 0.19;
    if (a.beside === 'paste') {
      s.cylinder(0.03, 0.03, 0.055, [ex - 0.02, Y + 0.0275, ez - 0.36], s.material('#efece2', { roughness: 0.3 }), 16);
      s.rod([ex - 0.02, Y + 0.04, ez - 0.36], [ex + 0.01, Y + 0.13, ez - 0.34], 0.004, wood);
      for (const side of [-1, 1]) {
        s.rod([ex - 0.04, Y + 0.004, ez + side * 0.006], [ex + 0.1, Y + 0.004, ez - side * 0.02], 0.004, chrome, 0.001);
        s.ring(0.016, 0.004, [ex - 0.055, Y + 0.004, ez + side * 0.02], dark).rotation.x = Math.PI / 2;
      }
    } else if (a.beside === 'stamp') {
      s.box([0.12, 0.014, 0.08], [ex, Y + 0.007, ez], dark);
      s.box([0.105, 0.004, 0.065], [ex, Y + 0.015, ez], red);
      const lid = s.box([0.12, 0.006, 0.08], [ex, Y + 0.04, ez - 0.07], dark);
      lid.rotation.x = -1.1;
      s.box([0.07, 0.02, 0.03], [ex + 0.01, Y + 0.027, ez], s.material('#6b4528'));
      s.lathe([[0.008, 0], [0.008, 0.03], [0.018, 0.045], [0.02, 0.06], [0.012, 0.07], [0, 0.072]], s.material('#3d2615', { roughness: 0.4 }), [ex + 0.01, Y + 0.037, ez]);
    } else if (a.beside === 'shade') {
      const band = s.ring(0.085, 0.006, [ex, Y + 0.02, ez - 0.02], dark, Math.PI * 1.3);
      band.rotation.x = Math.PI / 2;
      band.rotation.z = Math.PI * 0.85;
      const visor = new THREE.Shape();
      visor.absarc(0, 0, 0.15, Math.PI * 0.12, Math.PI * 0.88, false);
      visor.absarc(0, 0, 0.085, Math.PI * 0.88, Math.PI * 0.12, true);
      const peak = s.mesh(new THREE.ShapeGeometry(visor, 16), new THREE.MeshStandardMaterial({ color: '#1f8a55', emissive: '#135c38', emissiveIntensity: 0.5, transparent: true, opacity: 0.8, roughness: 0.2, side: THREE.DoubleSide }), [ex, Y + 0.022, ez - 0.02]);
      peak.rotation.x = Math.PI / 2 - 0.12;
    } else if (a.beside === 'rescued') {
      const hole = new THREE.Shape();
      hole.moveTo(-0.1, -0.135); hole.lineTo(0.1, -0.135); hole.lineTo(0.1, 0.135); hole.lineTo(-0.1, 0.135); hole.closePath();
      const punch = new THREE.Path();
      punch.absarc(0, 0, 0.012, 0, Math.PI * 2, true);
      hole.holes.push(punch);
      const sheet = s.mesh(new THREE.ShapeGeometry(hole), papers[0], [ex + 0.05, Y + 0.002, ez + 0.02]);
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = 0.5 + random() * 0.4;
      for (let i = 0; i < 6; i++) { const line = s.box([0.15, 0.0006, 0.006], [ex + 0.05, Y + 0.0028, ez + 0.02], dark); line.rotation.y = sheet.rotation.z; line.translateZ(-0.1 + i * 0.03 + (i > 2 ? 0.03 : 0)); }
    }

    const flutter = mix(0, 0.035, mood.energy);
    const rest = topSheet ? topSheet.rotation.x : 0;
    return s.finish({ update: (_dt, time) => { if (topSheet) topSheet.rotation.x = rest + Math.sin(time * 2.3) * flutter; } });
  },
});
