import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PAINTS = {
  white: 'White clapboard with red trim, freshly done each June.',
  mustard: 'Mustard yellow with brown trim.',
  barn: 'Barn red with white trim, built by the 4-H dads.',
  mint: 'Mint green with cream trim, a seaside pier colour.',
  circus: 'Circus blue with gold stars and trim.',
} as const;
const PAINT_COLOURS: Record<keyof typeof PAINTS, [string, string]> = {
  white: ['#f0ece0', '#c22f2b'], mustard: ['#d9a92f', '#5f3d22'], barn: ['#9c2f26', '#f2ecdd'], mint: ['#8fcdb4', '#f6efd9'], circus: ['#2a50a8', '#e6b93a'],
};
const BOARDS = {
  tickets: 'A plain list: 1 ticket $1, 12 for $10, 25 for $20.',
  wristband: 'One big offer: ALL-NIGHT WRISTBAND $25.',
  admit: 'Just ADMIT ONE and an arrow, like the ticket itself.',
  rides: 'RIDES 3 TICKETS, GAMES 2, KIDS FREE.',
} as const;
const NOTES = {
  closed: 'CLOSED',
  back: 'BACK IN 5 MIN',
  soldout: 'SOLD OUT',
  nextyear: 'SEE YOU NEXT YEAR',
  cash: 'CASH ONLY',
} as const;
const TICKET_COLOURS = { red: '#d5332f', blue: '#2f6fc9', yellow: '#edc531', green: '#3fa35a', pink: '#e86a9a' } as const;

function boardTexture(kind: keyof typeof BOARDS, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 248, 312);
  ctx.fillStyle = ink; ctx.textAlign = 'center';
  const lines: [string, number][] = {
    tickets: [['TICKETS', 44], ['1 ...... $1', 30], ['12 .... $10', 30], ['25 .... $20', 30], ['NO REFUNDS', 22]],
    wristband: [['ALL', 40], ['NIGHT', 54], ['WRISTBAND', 36], ['$25', 84]],
    admit: [['ADMIT', 62], ['ONE', 84], ['→', 90]],
    rides: [['RIDES', 40], ['3 TICKETS', 30], ['GAMES 2', 34], ['KIDS', 34], ['FREE', 60]],
  }[kind] as [string, number][];
  let y = 26;
  for (const [text, size] of lines) {
    ctx.font = `bold ${size}px sans-serif`;
    y += size * 1.02;
    ctx.fillText(text, 128, y, 228);
    y += 300 / lines.length - size;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function noteTexture(text: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#efe3c2'; ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#1d1b1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = text.split(' ');
  const rows = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 ? words : [text];
  rows.forEach((row, i) => {
    ctx.save();
    ctx.translate(128, 160 * (i + 0.5) / rows.length);
    ctx.rotate((random() - 0.5) * 0.12);
    ctx.font = `italic bold ${Math.min(150 / rows.length, 330 / row.length)}px cursive`;
    ctx.fillText(row, 0, 0, 236);
    ctx.restore();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    paint: choice('What colours is the booth painted?', PAINTS),
    roof: choice('What kind of roof does it have?', {
      pyramid: 'A steep shingled pyramid with a ball finial.',
      dome: 'A swooping onion dome, a little fairy-tale.',
      canvas: 'A striped canvas cone like a tiny big top, with a pennant.',
      crown: 'A flat top crowned with a ring of bulbs and a big TICKETS board.',
    }),
    state: choice('Is anybody selling?', {
      attended: 'Open: a warm glow inside, cash drawer out, tickets ready.',
      stepped: 'Lit but empty: the seller has stepped away and left a note.',
      closed: 'Dark, the shutter down behind the grille, a hand-lettered sign taped up.',
      boarded: 'Boarded over with plywood for the winter.',
    }),
    note: choice('If there is a hand-lettered note, what does it say?', NOTES),
    board: choice('What does the price board say?', BOARDS),
    tickets: choice('What colour is the roll of tickets?', { red: 'Red.', blue: 'Blue.', yellow: 'Yellow.', green: 'Green.', pink: 'Pink.' }),
    trail: score('How far has the roll of tickets unspooled?', ['Neatly on the counter', 'A tail hanging off the ledge', 'Down to the grass', 'A long ribbon snaking away across the ground']),
    queue: noul('Are there rope-and-post queue rails in front of it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [main, trim] = PAINT_COLOURS[a.paint];
    const W = 1.35, H = 2.15, h = W / 2;
    const wall = s.material(main), trimMat = s.material(trim), dark = s.material('#2a2927');
    const brass = s.material('#c79a3e', { metalness: 0.8, roughness: 0.3 });
    const lit = a.state === 'attended' || a.state === 'stepped';
    const y0 = 1.0, y1 = 1.82, ww = 0.9;

    // Base skid, four walls with a window opening in front and glazed sides.
    s.box([W + 0.14, 0.1, W + 0.14], [0, 0.05, 0], dark);
    s.box([W, H, 0.05], [0, H / 2 + 0.1, -h], wall);
    for (const x of [-1, 1]) {
      s.box([0.05, y0, W], [x * h, y0 / 2 + 0.1, 0], wall);
      s.box([0.05, H - y1, W], [x * h, (H + y1) / 2 + 0.1, 0], wall);
      for (const z of [-1, 1]) s.box([0.05, y1 - y0, 0.2], [x * h, (y0 + y1) / 2 + 0.1, z * (h - 0.1)], wall);
    }
    s.box([W, y0, 0.05], [0, y0 / 2 + 0.1, h], wall);
    s.box([W, H - y1, 0.05], [0, (H + y1) / 2 + 0.1, h], wall);
    for (const x of [-1, 1]) s.box([(W - ww) / 2, y1 - y0, 0.05], [x * (ww / 2 + (W - ww) / 4), (y0 + y1) / 2 + 0.1, h], wall);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.09, H, 0.09], [x * h, H / 2 + 0.1, z * h], trimMat);
    // Clapboard lines and a panel on the front apron.
    for (let i = 1; i < 6; i++) s.box([W + 0.02, 0.012, W + 0.02], [0, 0.1 + i * 0.16, 0], s.material(new THREE.Color(main).multiplyScalar(0.8)));
    s.box([ww, 0.55, 0.02], [0, 0.55, h + 0.03], trimMat);
    s.box([ww - 0.12, 0.43, 0.02], [0, 0.55, h + 0.04], wall);
    if (a.paint === 'circus') {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.045 : 0.11, t = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) star.lineTo(Math.cos(t) * r, Math.sin(t) * r); else star.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      const g = new THREE.ShapeGeometry(star);
      for (const x of [-0.22, 0, 0.22]) s.mesh(g, trimMat, [x, 0.55, h + 0.055]);
    }

    // Inside: glow or shutter.
    const glow = new THREE.MeshStandardMaterial({ color: lit ? '#ffe0a0' : '#3b3833', emissive: '#ffb45a', emissiveIntensity: lit ? mix(0.6, 1.2, mood.cheer) : 0 });
    s.box([W - 0.12, y1 - y0 + 0.3, 0.03], [0, (y0 + y1) / 2 + 0.1, -h + 0.06], glow);
    for (const x of [-1, 1]) s.box([0.02, y1 - y0, W - 0.4], [x * (h - 0.0), (y0 + y1) / 2 + 0.1, 0], new THREE.MeshStandardMaterial({ color: lit ? '#ffe7b5' : '#59666b', emissive: '#ffb45a', emissiveIntensity: lit ? 0.5 : 0, roughness: 0.15 }));
    // Counter ledge, grille and pass-through arch.
    const ledgeY = y0 + 0.1;
    s.box([ww + 0.25, 0.05, 0.36], [0, ledgeY, h + 0.1], trimMat);
    for (const x of [-1, 1]) s.rod([x * 0.42, ledgeY - 0.03, h + 0.24], [x * 0.42, ledgeY - 0.3, h + 0.03], 0.014, dark);
    if (a.state === 'boarded') {
      for (let i = 0; i < 4; i++) {
        const b = s.box([ww + 0.2, 0.21, 0.025], [(random() - 0.5) * 0.06, ledgeY + 0.14 + i * 0.215, h + 0.045], s.material(i % 2 ? '#b89868' : '#a88a5c'));
        b.rotation.z = (random() - 0.5) * 0.07;
      }
      const cross = s.box([1.3, 0.12, 0.025], [0, ledgeY + 0.45, h + 0.07], s.material('#9a7c50'));
      cross.rotation.z = 0.6;
    } else {
      if (a.state === 'closed') s.box([ww, y1 - y0, 0.02], [0, (y0 + y1) / 2 + 0.1, h - 0.06], s.material('#6b6f6c', { metalness: 0.4 }));
      const bars = 9;
      for (let i = 0; i < bars; i++) {
        const x = (i - (bars - 1) / 2) * ww / bars;
        const gap = Math.abs(x) < 0.17;
        s.rod([x, gap ? ledgeY + 0.3 - Math.abs(x) * 0.4 : ledgeY + 0.02, h + 0.01], [x, y1 + 0.1, h + 0.01], 0.009, brass);
      }
      s.ring(0.17, 0.012, [0, ledgeY + 0.13, h + 0.01], brass, Math.PI);
      s.box([ww, 0.02, 0.02], [0, ledgeY + 0.52, h + 0.01], brass);
    }
    // Fascia sign.
    const fascia = s.label(a.roof === 'crown' ? 'PAY HERE' : 'TICKETS', W - 0.1, 0.26, [0, H - 0.07, h + 0.03], trim === '#f2ecdd' || trim === '#f6efd9' ? main === '#8fcdb4' ? '#2d6b55' : '#f2ecdd' : '#fbf5e2', trim === '#f6efd9' ? '#f6efd9' : trim === '#f2ecdd' ? '#3a1d16' : trim);
    if (lit) { const m = fascia.material as THREE.MeshStandardMaterial; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.3; }

    // Roof.
    const top = H + 0.1;
    s.box([W + 0.34, 0.08, W + 0.34], [0, top + 0.04, 0], trimMat);
    const shingle = s.material(a.paint === 'barn' ? '#4a4a4c' : '#6d4b3b', { flatShading: true });
    if (a.roof === 'pyramid') {
      const g = new THREE.ConeGeometry((W + 0.3) / Math.SQRT2, 0.95, 4, 4); g.rotateY(Math.PI / 4);
      s.mesh(g, shingle, [0, top + 0.08 + 0.475, 0]);
      s.ball([0.07, 0.07, 0.07], [0, top + 1.08, 0], brass, 12);
    } else if (a.roof === 'dome') {
      s.lathe([[0.95, 0], [0.93, 0.08], [0.72, 0.3], [0.62, 0.5], [0.5, 0.7], [0.26, 0.9], [0.09, 1.05], [0.04, 1.3], [0, 1.42]].map(([r, y]) => [r * 0.9, y * 0.85] as const), s.material(trim === '#f2ecdd' || trim === '#f6efd9' ? '#3f7f78' : trim, { metalness: 0.3, roughness: 0.45 }), [0, top + 0.08, 0]);
      s.ball([0.06, 0.06, 0.06], [0, top + 1.3, 0], brass, 12);
    } else if (a.roof === 'canvas') {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 4;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = main === '#f0ece0' ? trim : main; ctx.fillRect(0, 0, 32, 4); ctx.fillStyle = '#f6efd9'; ctx.fillRect(32, 0, 32, 4);
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(8, 1);
      s.mesh(new THREE.ConeGeometry(1.02, 0.85, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), [0, top + 0.08 + 0.425, 0]);
      s.rod([0, top + 0.9, 0], [0, top + 1.4, 0], 0.012, dark);
      const flag = new THREE.Shape(); flag.moveTo(0, 0); flag.lineTo(0.32, -0.08); flag.lineTo(0, -0.16);
      s.mesh(new THREE.ShapeGeometry(flag), new THREE.MeshStandardMaterial({ color: trim, side: THREE.DoubleSide }), [0, top + 1.39, 0]).rotation.y = random() - 0.5;
    } else {
      s.box([W + 0.2, 0.5, 0.08], [0, top + 0.33, h], trimMat);
      const big = s.label('TICKETS', W + 0.1, 0.4, [0, top + 0.33, h + 0.045], '#fff3c4', '#b3262b');
      if (lit) { const m = big.material as THREE.MeshStandardMaterial; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.45; }
      const bm = new THREE.MeshStandardMaterial({ color: lit ? '#fff2c2' : '#8d897c', emissive: '#ffc15a', emissiveIntensity: lit ? 1.4 : 0 });
      const pts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 9; i++) for (const y of [0.07, 0.6]) if (random() > mood.wear * 0.4) pts.push({ at: [(i - 4) * (W + 0.1) / 8, top + y + 0.02, h + 0.06], size: 0.035 });
      for (let i = 1; i < 8; i++) for (const x of [-1, 1]) pts.push({ at: [x * (h + 0.15), top + 0.12, h - i * W / 8], size: 0.035 });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), bm, pts);
    }

    // Price board on the right side of the front, leaning out on its own post.
    const board = s.mesh(new THREE.PlaneGeometry(0.62, 0.78), new THREE.MeshStandardMaterial({ map: boardTexture(a.board, trim === '#f2ecdd' || trim === '#f6efd9' ? '#3a1d16' : trim === '#e6b93a' ? '#2a50a8' : trim, '#fbf3d8'), roughness: 0.8, side: THREE.DoubleSide }), [h + 0.48, 1.45, h + 0.05]);
    board.rotation.y = -0.25 + (random() - 0.5) * 0.15;
    board.rotation.z = (random() - 0.5) * 0.05 * (1 + mood.wear * 4);
    s.box([0.05, 1.9, 0.05], [h + 0.48, 0.95, h + 0.02], s.material('#7a5c3c'));
    s.box([0.4, 0.05, 0.4], [h + 0.48, 0.025, h + 0.02], s.material('#7a5c3c'));

    // Hand-lettered note.
    if (a.state !== 'attended') {
      const note = s.mesh(new THREE.PlaneGeometry(0.46, 0.29), new THREE.MeshStandardMaterial({ map: noteTexture(NOTES[a.note], random), roughness: 0.9 }), [(random() - 0.5) * 0.2, a.state === 'boarded' ? ledgeY + 0.5 : ledgeY + 0.6, h + (a.state === 'boarded' ? 0.09 : 0.03)]);
      note.rotation.z = (random() - 0.5) * 0.25;
    }

    // Ticket roll and its trailing ribbon.
    const tc = TICKET_COLOURS[a.tickets];
    const tmat = s.material(tc, { roughness: 0.8 });
    const rollX = 0.36, rollZ = h + 0.17;
    const roll = s.cylinder(0.085, 0.085, 0.05, [rollX, ledgeY + 0.11, rollZ], tmat, 20);
    roll.rotation.z = Math.PI / 2;
    s.cylinder(0.025, 0.025, 0.052, [rollX, ledgeY + 0.11, rollZ], s.material('#e9e3d2'), 10).rotation.z = Math.PI / 2;
    if (a.trail > 0.15) {
      const path: THREE.Vector3[] = [new THREE.Vector3(rollX, ledgeY + 0.19, rollZ), new THREE.Vector3(rollX, ledgeY + 0.12, rollZ + 0.12)];
      const reach = a.trail;
      if (reach < 0.5) path.push(new THREE.Vector3(rollX + 0.02, ledgeY - mix(0.1, 0.7, reach * 2), rollZ + 0.14));
      else {
        path.push(new THREE.Vector3(rollX + 0.03, 0.5, rollZ + 0.15), new THREE.Vector3(rollX + 0.05, 0.02, rollZ + 0.22));
        let x = rollX + 0.05, z = rollZ + 0.22, dir = random() * 1.2 - 0.9;
        const steps = Math.round(mix(1, 9, (reach - 0.5) * 2));
        for (let i = 0; i < steps; i++) { dir += (random() - 0.5) * 1.5; x += Math.sin(dir) * 0.4; z += Math.abs(Math.cos(dir)) * 0.35 + 0.05; path.push(new THREE.Vector3(x, 0.012 + random() * 0.03, z)); }
      }
      const curve = new THREE.CatmullRomCurve3(path);
      const count = Math.max(4, Math.round(curve.getLength() / 0.075));
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.085, 0.006, 0.07), tmat, count);
      const m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), look = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < count; i++) {
        const p = curve.getPointAt(i / (count - 1)), t = curve.getTangentAt(i / (count - 1));
        look.lookAt(new THREE.Vector3(), t, Math.abs(t.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up);
        q.setFromRotationMatrix(look);
        mesh.setMatrixAt(i, m.compose(p, q, one));
        mesh.setColorAt(i, new THREE.Color(tc).multiplyScalar(i % 2 ? 1 : 0.86));
      }
      mesh.castShadow = true;
      s.root.add(mesh);
    }
    if (a.state === 'attended') {
      s.box([0.3, 0.07, 0.2], [-0.2, ledgeY + 0.06, h + 0.12], s.material('#4d5a55', { metalness: 0.5 }));
      for (let i = 0; i < 3; i++) s.cylinder(0.018, 0.018, 0.012 + i * 0.008, [-0.27 + i * 0.07, ledgeY + 0.1, h + 0.12], brass, 10);
    }

    // Queue rails.
    if (a.queue) {
      const rope = s.material('#8e2430', { roughness: 0.9 });
      const posts: [number, number][] = [[-0.75, h + 0.7], [-0.75, h + 2.1], [0.75, h + 0.7], [0.75, h + 2.1]];
      for (const [x, z] of posts) { s.cylinder(0.025, 0.025, 0.95, [x, 0.475, z], brass, 10); s.cylinder(0.14, 0.16, 0.04, [x, 0.02, z], brass, 14); s.ball([0.045, 0.045, 0.045], [x, 0.97, z], brass, 10); }
      for (const x of [-0.75, 0.75]) s.tube([[x, 0.9, h + 0.7], [x, 0.68 - mood.wear * 0.2, h + 1.4], [x, 0.9, h + 2.1]], 0.018, rope);
    }
    // Trampled ticket stubs on the ground when it has been busy.
    const stubs = Math.round(mood.density * 14);
    if (stubs) s.scatter(new THREE.BoxGeometry(1, 0.08, 1.5), tmat, Array.from({ length: stubs }, () => ({ at: [(random() - 0.5) * 2.2, 0.004, h + 0.3 + random() * 1.6] as [number, number, number], size: 0.045 })));

    return s.finish({ footprint: 1.2 });
  },
});
