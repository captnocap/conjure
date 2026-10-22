import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P2 = readonly [number, number];
type Stroke = { points: P2[]; closed?: boolean; colour: 0 | 1; unit: number };
const FONT: Record<string, P2[][]> = {
  A: [[[0, 0], [2, 6], [4, 0]], [[1, 2.4], [3, 2.4]]],
  B: [[[0, 0], [0, 6], [2.6, 6], [3.5, 5], [3.5, 4], [2.6, 3], [0, 3]], [[2.6, 3], [3.9, 2.2], [3.9, 1], [2.8, 0], [0, 0]]],
  C: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
  D: [[[0, 0], [0, 6], [2.4, 6], [4, 4.5], [4, 1.5], [2.4, 0], [0, 0]]],
  E: [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]],
  F: [[[4, 6], [0, 6], [0, 0]], [[0, 3], [3, 3]]],
  G: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2.8], [2.2, 2.8]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]]],
  K: [[[0, 0], [0, 6]], [[4, 6], [0, 2.6]], [[1.4, 3.6], [4, 0]]],
  L: [[[0, 6], [0, 0], [4, 0]]],
  M: [[[0, 0], [0, 6], [2, 2.5], [4, 6], [4, 0]]],
  N: [[[0, 0], [0, 6], [4, 0], [4, 6]]],
  O: [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]]],
  P: [[[0, 0], [0, 6], [2.8, 6], [4, 5], [4, 3.8], [2.8, 2.8], [0, 2.8]]],
  R: [[[0, 0], [0, 6], [2.8, 6], [4, 5], [4, 3.8], [2.8, 2.8], [0, 2.8]], [[2, 2.8], [4, 0]]],
  S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
  U: [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
  V: [[[0, 6], [2, 0], [4, 6]]],
  W: [[[0, 6], [1, 0], [2, 4], [3, 0], [4, 6]]],
  Y: [[[0, 6], [2, 3], [4, 6]], [[2, 3], [2, 0]]],
};
const PAIRS = {
  classic: ['#ff2f2f', '#2f76ff'], miami: ['#ff4fb0', '#22e0d0'], amber: ['#ffa514', '#fff0cf'],
  green: ['#35f06a', '#ffe033'], red: ['#ff2f2f', '#ff6a2a'], violet: ['#a95cff', '#ff8a2a'],
} as const;
const BRANDS = { goat: 'OLD GOAT', mule: 'BLUE MULE', kessel: 'KESSEL', lucky: 'LUCKY DOG', falls: 'TWIN FALLS' } as const;

export default defineThing({
  questions: {
    sign: choice('What does the neon spell or draw?', {
      open: 'The word OPEN inside a rounded border.',
      cocktail: 'A tilted cocktail glass with an olive and rising bubbles.',
      lager: 'A made-up lager brand name over the word LAGER with a swash underline.',
      arrow: 'The word BAR above a chasing arrow that points the way in.',
      mug: 'A foaming beer mug with a handle.',
      vacancy: 'NO VACANCY, the NO on its own line, a motel sign.',
      eat: 'The word EAT, underlined, a diner sign.',
    }),
    brand: choice('If it names a lager, which made-up brand?', { goat: 'OLD GOAT', mule: 'BLUE MULE', kessel: 'KESSEL', lucky: 'LUCKY DOG', falls: 'TWIN FALLS' }),
    colours: choice('What colours are the tubes?', {
      classic: 'Red lettering with a blue border, the standard bar window.',
      miami: 'Hot pink and turquoise.',
      amber: 'Amber beer gold and warm white.',
      green: 'Green and yellow.',
      red: 'All red, cheap and urgent.',
      violet: 'Violet and orange, a little seedy.',
    }),
    dead: choice('Which parts are dead or flickering?', {
      none: 'Every tube lit and steady.',
      one: 'One letter or piece has gone dark.',
      half: 'About half of it is dead, so it reads as something else.',
      flicker: 'One part buzzes and flickers on and off.',
      off: 'Switched off: grey glass tubes, nobody pulled the chain.',
    }),
    mount: choice('How does it stand?', {
      pole: 'On a slim floor pole with a round weighted base, chest high.',
      frame: 'On a short bracket frame with feet, to sit in a window or on a counter.',
      roadside: 'Hung by chains from the arm of a tall roadside post.',
    }),
    backing: choice('What is behind the tubes?', {
      grid: 'A black wire grid you can half see through.',
      acrylic: 'A smoked dark acrylic panel with a thin pale edge.',
      can: 'A black painted metal box.',
      board: 'A hand-painted plywood board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pair = PAIRS[a.colours];
    const strokes: Stroke[] = [];
    let units = 0, PW = 1, PH = 0.56;
    const text = (word: string, cx: number, cy: number, h: number, colour: 0 | 1, maxWidth = 9) => {
      const measure = (hh: number) => word.length * hh * 0.6 + (word.length - 1) * hh * 0.24;
      if (measure(h) > maxWidth) h *= maxWidth / measure(h);
      let x = cx - measure(h) / 2;
      for (const letter of word) {
        if (letter !== ' ') { const unit = units++; for (const line of FONT[letter] ?? []) strokes.push({ points: line.map(([px, py]) => [x + px / 4 * h * 0.6, cy - h / 2 + py / 6 * h] as const), colour, unit }); }
        x += h * 0.84;
      }
    };
    const shape = (points: P2[], colour: 0 | 1, unit: number, closed = false) => strokes.push({ points, colour, unit, closed });
    const circle = (cx: number, cy: number, r: number, colour: 0 | 1, unit: number) => shape(Array.from({ length: 8 }, (_u, i) => [cx + Math.cos(i * Math.PI / 4) * r, cy + Math.sin(i * Math.PI / 4) * r] as const), colour, unit, true);
    let chase: number[] = [];
    if (a.sign === 'open') {
      text('OPEN', 0, 0, 0.26, 0);
      const w = 0.44, h = 0.22, c = 0.06;
      shape([[-w + c, -h], [w - c, -h], [w, -h + c], [w, h - c], [w - c, h], [-w + c, h], [-w, h - c], [-w, -h + c]], 1, units++, true);
    } else if (a.sign === 'cocktail') {
      PW = 0.72; PH = 0.86;
      const g = units++; shape([[-0.24, 0.2], [0.24, 0.2], [0, -0.06]], 0, g, true);
      const st = units++; shape([[0, -0.06], [0, -0.32]], 0, st); shape([[-0.14, -0.32], [0.14, -0.32]], 0, st);
      const ol = units++; circle(0.03, 0.1, 0.04, 1, ol); shape([[-0.04, 0.03], [0.2, 0.33]], 1, ol);
      const bu = units++; circle(-0.14, 0.31, 0.025, 1, bu); circle(-0.05, 0.36, 0.018, 1, bu); circle(-0.2, 0.38, 0.014, 1, bu);
    } else if (a.sign === 'lager') {
      PW = 1.24; PH = 0.62;
      text(BRANDS[a.brand], 0, 0.1, 0.21, 0, 1.08);
      text('LAGER', 0.1, -0.14, 0.1, 1);
      shape([[-0.5, -0.1], [-0.3, -0.22], [0.1, -0.24], [0.5, -0.22]], 1, units++);
    } else if (a.sign === 'arrow') {
      PW = 1.06; PH = 0.66;
      text('BAR', 0, 0.13, 0.24, 0);
      const d = random() < 0.5 ? -1 : 1;
      shape([[-0.4 * d, -0.17], [0.12 * d, -0.17]], 1, units++);
      for (let i = 0; i < 3; i++) { chase.push(units); shape([[(0.1 + i * 0.1) * d, -0.07], [(0.2 + i * 0.1) * d, -0.17], [(0.1 + i * 0.1) * d, -0.27]], 1, units++); }
    } else if (a.sign === 'mug') {
      PW = 0.8; PH = 0.8;
      shape([[-0.22, -0.28], [-0.22, 0.1], [0.12, 0.1], [0.12, -0.28]], 0, units++, true);
      shape([[0.12, 0.03], [0.27, 0.03], [0.27, -0.2], [0.12, -0.2]], 0, units++);
      shape([[-0.26, 0.1], [-0.25, 0.22], [-0.14, 0.27], [-0.05, 0.2], [0.04, 0.28], [0.14, 0.22], [0.16, 0.1]], 1, units++);
      const li = units++; for (const x of [-0.12, -0.05, 0.02]) shape([[x, -0.2], [x, 0]], 1, li);
    } else if (a.sign === 'vacancy') {
      PW = 1.3; PH = 0.6;
      text('NO', -0.4, 0.14, 0.16, 0);
      text('VACANCY', 0, -0.1, 0.19, 1, 1.14);
    } else {
      PW = 0.86; PH = 0.56;
      text('EAT', 0, 0.03, 0.3, 0);
      shape([[-0.3, -0.19], [0.3, -0.19]], 1, units++);
    }

    // Which units are alive.
    const state = Array.from({ length: units }, () => 1 as 0 | 1 | 2);
    const someUnit = () => Math.floor(random() * units);
    if (a.dead === 'one') state[someUnit()] = 0;
    if (a.dead === 'half') { for (let i = 0; i < units; i++) if (random() < 0.5) state[i] = 0; state[someUnit()] = 0; if (!state.some((v) => v !== 0)) state[someUnit()] = 1; }
    if (a.dead === 'flicker') state[someUnit()] = 2;
    if (a.dead === 'off') state.fill(0);
    if (mood.wear > 0.8 && a.dead === 'none') state[someUnit()] = 2;

    const scale = a.mount === 'roadside' ? 1.5 : 1;
    const bottom = a.mount === 'pole' ? 1.0 : a.mount === 'frame' ? 0.14 : 1.9;
    const cy = bottom + PH * scale / 2;
    const sign = new THREE.Group(); sign.position.set(0, cy, 0); sign.scale.setScalar(scale);
    sign.rotation.z = (random() - 0.5) * mood.wear * 0.09;
    s.root.add(sign);
    const add = (mesh: THREE.Mesh) => { mesh.removeFromParent(); sign.add(mesh); return mesh; };
    const black = s.material('#18191c', { roughness: 0.6, metalness: 0.3 });

    // Backing.
    const smoke = (opacity: number) => add(s.box([PW, PH, 0.004], [0, 0, -0.042], new THREE.MeshStandardMaterial({ color: '#15171b', transparent: true, opacity, roughness: 0.4 })));
    if (a.backing === 'grid') {
      smoke(0.5);
      for (const y of [-PH / 2, PH / 2]) add(s.box([PW, 0.016, 0.016], [0, y, -0.03], black));
      for (const x of [-PW / 2, PW / 2]) add(s.box([0.016, PH, 0.016], [x, 0, -0.03], black));
      for (let x = -PW / 2 + 0.09; x < PW / 2 - 0.04; x += 0.09) add(s.box([0.006, PH, 0.006], [x, 0, -0.03], black));
      for (let y = -PH / 2 + 0.09; y < PH / 2 - 0.04; y += 0.09) add(s.box([PW, 0.006, 0.006], [0, y, -0.034], black));
    } else if (a.backing === 'acrylic') {
      smoke(0.72);
      for (const y of [-PH / 2, PH / 2]) add(s.box([PW, 0.012, 0.012], [0, y, -0.03], s.material('#aebfc6')));
      for (const x of [-PW / 2, PW / 2]) add(s.box([0.012, PH, 0.012], [x, 0, -0.03], s.material('#aebfc6')));
    } else if (a.backing === 'can') {
      add(s.box([PW + 0.06, PH + 0.06, 0.1], [0, 0, -0.08], black));
      add(s.box([PW, PH, 0.01], [0, 0, -0.03], s.material('#0c0c0e', { roughness: 0.9 })));
    } else {
      add(s.box([PW + 0.04, PH + 0.04, 0.025], [0, 0, -0.045], s.material(mix(0, 1, mood.cheer) > 0.5 ? '#274a3a' : '#3a2c22', { roughness: 0.9 })));
      for (const x of [-1, 1]) for (const y of [-1, 1]) add(s.cylinder(0.01, 0.01, 0.01, [x * (PW / 2 - 0.03), y * (PH / 2 - 0.03), -0.03], s.material('#b9bcc0', { metalness: 0.8 }), 8)).rotation.x = Math.PI / 2;
    }

    // Halo painted behind the tubes.
    const bright = mix(0.32, 0.6, mood.cheer);
    const px = 420, cw = Math.round((PW + 0.24) * px), ch = Math.round((PH + 0.24) * px);
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (state[stroke.unit] === 0) continue;
      ctx.strokeStyle = ctx.shadowColor = pair[stroke.colour]; ctx.shadowBlur = 26; ctx.lineWidth = 9; ctx.globalAlpha = state[stroke.unit] === 2 ? 0.3 : 0.6;
      ctx.beginPath();
      stroke.points.forEach(([x, y], i) => { const X = cw / 2 + x * px, Y = ch / 2 - y * px; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      if (stroke.closed) ctx.closePath();
      ctx.stroke(); ctx.stroke();
    }
    const haloTexture = new THREE.CanvasTexture(canvas); haloTexture.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.24, PH + 0.24), new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, depthWrite: false, opacity: 0.9 }));
    halo.position.z = -0.018; sign.add(halo);

    // Tubes.
    const mats: { material: THREE.MeshStandardMaterial; mode: 0 | 1 | 2; unit: number }[] = [];
    const unitMats = new Map<string, THREE.MeshStandardMaterial>();
    for (const stroke of strokes) {
      const key = `${stroke.unit}-${stroke.colour}`, mode = state[stroke.unit];
      let material = unitMats.get(key);
      if (!material) {
        const c = pair[stroke.colour];
        material = new THREE.MeshStandardMaterial(mode ? { color: c, emissive: c, emissiveIntensity: bright, roughness: 0.3 } : { color: '#9a9ea6', roughness: 0.2 });
        unitMats.set(key, material); mats.push({ material, mode, unit: stroke.unit });
      }
      const pts = stroke.points.map(([x, y]) => new THREE.Vector3(x, y, 0));
      const curve = new THREE.CatmullRomCurve3(pts, stroke.closed ?? false, 'catmullrom', 0.22);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 7, 0.013, 6, stroke.closed ?? false), material);
      tube.castShadow = true; sign.add(tube);
      if (!stroke.closed) for (const end of [pts[0], pts[pts.length - 1]]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), black);
        cap.rotation.x = Math.PI / 2; cap.position.set(end.x, end.y, -0.015); sign.add(cap);
      }
    }

    // Transformer, pull chain and lead.
    const tx = -PW / 2 + 0.14, ty = -PH / 2 - 0.05;
    add(s.box([0.2, 0.075, 0.07], [tx, ty, -0.03], s.material('#2a2c30', { roughness: 0.5 })));
    add(s.box([0.08, 0.03, 0.002], [tx, ty, 0.006], s.material('#d9d4b8')));
    const chainLen = 0.16 + random() * 0.1;
    const beads = Array.from({ length: Math.round(chainLen / 0.012) }, (_u, i) => ({ at: [tx + 0.07, ty - 0.04 - i * 0.012, 0] as [number, number, number], size: 1 }));
    sign.add(s.scatter(new THREE.SphereGeometry(0.005, 6, 4), s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }), beads));
    add(s.cylinder(0.006, 0.011, 0.03, [tx + 0.07, ty - 0.055 - chainLen, 0], s.material('#c9a24a', { metalness: 0.7 }), 8));

    // Mount.
    const steel = s.material('#3b3d42', { metalness: 0.5, roughness: 0.5 });
    if (a.mount === 'pole') {
      s.cylinder(0.24, 0.27, 0.04, [0, 0.02, -0.03], steel, 28);
      s.cylinder(0.02, 0.02, bottom + 0.06, [0, (bottom + 0.06) / 2, -0.055], steel, 12);
      s.box([0.3, 0.03, 0.03], [0, bottom + 0.02, -0.05], steel);
      s.tube([[tx, cy + ty, -0.06], [-0.1, 0.5, -0.09], [-0.05, 0.06, -0.12], [-0.3, 0.012, -0.3], [-0.6, 0.012, -0.25]], 0.006, black);
    } else if (a.mount === 'frame') {
      for (const x of [-1, 1]) {
        const fx = x * (PW / 2 - 0.08);
        s.box([0.03, 0.02, 0.36], [fx, 0.01, -0.04], steel);
        s.rod([fx, 0.02, -0.03], [fx, bottom + PH, -0.045], 0.011, steel);
        s.rod([fx, 0.02, -0.2], [fx, bottom + PH * 0.6, -0.05], 0.009, steel);
      }
      s.tube([[tx, cy + ty, -0.06], [tx - 0.1, 0.03, -0.12], [tx - 0.3, 0.008, 0.05], [tx - 0.45, 0.008, 0.2]], 0.005, black);
    } else {
      const W2 = PW * scale / 2, postX = -W2 - 0.3, topY = bottom + PH * scale + 0.3;
      s.box([0.5, 0.25, 0.5], [postX, 0.125, -0.03], s.material('#9a968c', { roughness: 0.95 }));
      s.cylinder(0.05, 0.065, topY + 0.25, [postX, (topY + 0.25) / 2, -0.03], steel, 14);
      s.rod([postX, topY, -0.03], [W2 + 0.05, topY, -0.03], 0.03, steel);
      s.rod([postX, topY - 0.6, -0.03], [postX + 0.6, topY, -0.03], 0.018, steel);
      s.ball([0.07, 0.07, 0.07], [postX, topY + 0.27, -0.03], steel, 12);
      for (const x of [-1, 1]) s.rod([x * W2 * 0.8, topY, -0.03], [x * W2 * 0.8, bottom + PH * scale, -0.045], 0.008, s.material('#8a8d92', { metalness: 0.7 }));
    }

    const speed = mix(0.5, 3, mood.energy);
    return s.finish({
      update(_dt, time) {
        const step = Math.floor(time * speed * 2.2) % (chase.length + 2);
        for (const m of mats) {
          if (m.mode === 0) continue;
          let level = bright * (0.94 + 0.06 * Math.sin(time * 37 + m.unit));
          if (m.mode === 2) level *= Math.sin(time * (9 + speed * 4) + m.unit) + Math.sin(time * 23.7) > 0.25 ? 1 : 0.08;
          const k = chase.indexOf(m.unit);
          if (k >= 0 && a.dead !== 'off' && step <= k) level *= 0.12;
          m.material.emissiveIntensity = level;
        }
      },
    });
  },
});
