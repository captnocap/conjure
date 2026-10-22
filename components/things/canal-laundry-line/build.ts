import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Kind = 'sheet' | 'shirt' | 'trousers' | 'sock' | 'towel' | 'dress' | 'baby' | 'briefs' | 'vest';

const LOADS = {
  family: 'A mixed family wash: shirts, trousers, towels, socks.',
  sheets: 'Mostly big bedsheets and pillowcases, bellying like sails.',
  work: "A week of one man's work clothes: vests, shirts and trousers in a row.",
  baby: 'Rows of tiny baby clothes and bibs.',
  smalls: 'Underwear, vests and socks, cheerfully shameless.',
  kitchen: 'Tea towels, aprons and tablecloths from a trattoria.',
} as const;
const MIX: Record<keyof typeof LOADS, Kind[]> = {
  family: ['shirt', 'trousers', 'towel', 'sock', 'sock', 'sheet', 'vest', 'dress', 'briefs'],
  sheets: ['sheet', 'sheet', 'sheet', 'towel'],
  work: ['vest', 'shirt', 'trousers', 'shirt', 'sock', 'sock'],
  baby: ['baby', 'baby', 'sock', 'baby', 'towel'],
  smalls: ['briefs', 'vest', 'sock', 'sock', 'briefs', 'briefs'],
  kitchen: ['towel', 'towel', 'sheet', 'towel', 'vest'],
};
const PALETTES = {
  whites: 'All whites and creams, bleached by sun.',
  pastel: 'Faded pinks, mints and sky blues.',
  dark: 'Blacks, greys and navy: a house in mourning or a waiter.',
  loud: 'Clashing primaries and patterns.',
  denim: 'Workwear blues and khaki.',
} as const;
const CLOTH: Record<keyof typeof PALETTES, string[]> = {
  whites: ['#f6f3ea', '#ece6d6', '#f2efe8', '#e3ddcf'],
  pastel: ['#f1c9cf', '#c9e6d6', '#c6dcf0', '#f3e7b8', '#f4f0e8'],
  dark: ['#2a2b33', '#4a4d57', '#232a44', '#6b6d73', '#e8e4dc'],
  loud: ['#e03a3a', '#2f6fd0', '#f2c230', '#2fa66a', '#e85fa8', '#f08a2a'],
  denim: ['#3d5f8f', '#6f8fb8', '#8a8560', '#2f4468', '#d9d4c4'],
};
const WALLS = {
  ochre: 'Yellow ochre stucco.',
  red: 'Venetian red stucco, deep and rusty.',
  pink: 'Sun-faded pink.',
  grey: 'Bare grey plaster and brick.',
} as const;
const STUCCO: Record<keyof typeof WALLS, string> = { ochre: '#d9a94e', red: '#b5553c', pink: '#dfa596', grey: '#b3ada0' };

function garment(kind: Kind, r: () => number): { shape: THREE.Shape; width: number; drop: number } {
  const sh = new THREE.Shape();
  const poly = (points: [number, number][]) => { sh.moveTo(...points[0]); for (const p of points.slice(1)) sh.lineTo(...p); sh.closePath(); };
  if (kind === 'sheet') {
    const w = 1.25 + r() * 0.5, h = 1.3 + r() * 0.5;
    poly([[-w / 2, 0], [w / 2, 0], [w / 2 + 0.03, -h * 0.5], [w / 2, -h], [w * 0.15, -h + 0.05], [-w * 0.2, -h - 0.03], [-w / 2, -h + 0.02], [-w / 2 - 0.03, -h * 0.5]]);
    return { shape: sh, width: w, drop: h };
  }
  if (kind === 'towel') { const w = 0.5 + r() * 0.2, h = 0.75 + r() * 0.35; poly([[-w / 2, 0], [w / 2, 0], [w / 2, -h], [-w / 2, -h]]); return { shape: sh, width: w, drop: h }; }
  if (kind === 'shirt') {
    poly([[-0.3, 0], [-0.1, 0], [0, -0.07], [0.1, 0], [0.3, 0], [0.62, -0.42], [0.47, -0.54], [0.29, -0.3], [0.31, -0.86], [-0.31, -0.86], [-0.29, -0.3], [-0.47, -0.54], [-0.62, -0.42]]);
    return { shape: sh, width: 1.05, drop: 0.86 };
  }
  if (kind === 'vest') { poly([[-0.24, 0], [-0.14, 0], [-0.1, -0.2], [0.1, -0.2], [0.14, 0], [0.24, 0], [0.27, -0.3], [0.29, -0.75], [-0.29, -0.75], [-0.27, -0.3]]); return { shape: sh, width: 0.62, drop: 0.75 }; }
  if (kind === 'trousers') { poly([[-0.26, 0], [0.26, 0], [0.3, -1.05], [0.07, -1.05], [0, -0.3], [-0.07, -1.05], [-0.3, -1.05]]); return { shape: sh, width: 0.62, drop: 1.05 }; }
  if (kind === 'sock') { poly([[-0.06, 0], [0.06, 0], [0.07, -0.3], [0.2, -0.36], [0.2, -0.45], [-0.02, -0.45], [-0.07, -0.36]]); return { shape: sh, width: 0.22, drop: 0.45 }; }
  if (kind === 'dress') { poly([[-0.2, 0], [-0.13, 0], [-0.08, -0.16], [0.08, -0.16], [0.13, 0], [0.2, 0], [0.19, -0.42], [0.48, -1.25], [0.2, -1.2], [-0.15, -1.28], [-0.48, -1.22], [-0.19, -0.42]]); return { shape: sh, width: 0.9, drop: 1.28 }; }
  if (kind === 'baby') { poly([[-0.12, 0], [-0.04, 0], [0, -0.03], [0.04, 0], [0.12, 0], [0.26, -0.14], [0.2, -0.22], [0.12, -0.14], [0.13, -0.34], [0.17, -0.5], [0.06, -0.52], [0, -0.38], [-0.06, -0.52], [-0.17, -0.5], [-0.13, -0.34], [-0.12, -0.14], [-0.2, -0.22], [-0.26, -0.14]]); return { shape: sh, width: 0.5, drop: 0.52 }; }
  poly([[-0.2, 0], [0.2, 0], [0.2, -0.1], [0.05, -0.27], [-0.05, -0.27], [-0.2, -0.1]]);
  return { shape: sh, width: 0.42, drop: 0.27 };
}

export default defineThing({
  questions: {
    load: choice('What kind of wash is hanging?', LOADS),
    palette: choice('What colours is the washing?', PALETTES),
    bright: choice('Which one bright thing stands out among it?', {
      'red-dress': 'A scarlet dress.',
      'football-shirt': 'A striped football shirt.',
      'yellow-sheet': 'A sunflower-yellow sheet.',
      'harlequin': 'A diamond-patterned carnival costume.',
      'blue-overalls': 'Bright blue overalls.',
      none: 'Nothing: it is all of a piece.',
    }),
    fullness: score('How full is the line?', ['Three lonely things and bare pegs', 'Half hung', 'Crammed edge to edge, sagging with weight']),
    lines: choice('How many lines cross the gap?', {
      one: 'One line.',
      two: 'Two lines, one above the other.',
      three: 'Three lines at different heights, a whole street of washing.',
    }),
    fallen: choice('Has anything come loose?', {
      nothing: 'No, everything is pegged.',
      ground: 'One garment has fallen and lies on the ground below.',
      'one-peg': 'One thing hangs crooked by a single peg, about to go.',
      sock: 'A single sock has dropped.',
    }),
    wall: choice('What colour are the walls it is strung between?', WALLS),
    window: choice('What do the windows say about who is home?', {
      shut: 'Green shutters closed tight.',
      open: 'Shutters open, a geranium box on the sill.',
      basket: 'Shutters open and a laundry basket waiting on the sill, mid-chore.',
      bricked: 'One window bricked up, the other dark and empty.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const HW = 2.9, H = 5.3;

    // Stucco with patches peeled back to brick, and damp at the foot.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#a8563c';
    ctx.fillRect(0, 0, 256, 512);
    ctx.strokeStyle = '#d2c3a8'; ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 12) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      for (let x = (y / 12) % 2 ? 0 : 16; x < 256; x += 32) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); }
    }
    ctx.fillStyle = STUCCO[a.wall];
    const holes = a.wall === 'grey' ? 12 : 3 + mood.wear * 9;
    ctx.beginPath();
    ctx.rect(0, 0, 256, 512);
    for (let i = 0; i < holes; i++) {
      const cx = random() * 256, cy = 512 - random() ** 1.6 * 512, rad = 14 + random() * (18 + mood.wear * 40);
      ctx.moveTo(cx + rad, cy);
      for (let k = 11; k >= 0; k--) { const t = (k / 12) * Math.PI * 2, rr = rad * (0.6 + random() * 0.6); ctx.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 1.3); }
      ctx.closePath();
    }
    ctx.fill();
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,250,235' : '70,50,40'},${0.03 + random() * 0.07})`; ctx.fillRect(random() * 256, random() * 512, 6 + random() * 40, 4 + random() * 30); }
    const damp = ctx.createLinearGradient(0, 512, 0, 380);
    damp.addColorStop(0, 'rgba(52,70,48,0.85)'); damp.addColorStop(0.5, 'rgba(70,72,60,0.4)'); damp.addColorStop(1, 'rgba(70,72,60,0)');
    ctx.fillStyle = damp; ctx.fillRect(0, 380, 256, 132);
    const stuccoMap = new THREE.CanvasTexture(canvas);
    stuccoMap.colorSpace = THREE.SRGBColorSpace;
    const stucco = new THREE.MeshStandardMaterial({ map: stuccoMap, roughness: 0.95 });
    const brick = s.material('#a8563c', { roughness: 1 });
    const stone = s.material('#d8d2c0');
    const shutter = s.material(new THREE.Color('#2f5a41').lerp(new THREE.Color('#7f8a72'), mood.wear * 0.6));
    const dark = s.material('#22262b');
    const iron = s.material('#2b2b2e');

    for (const side of [-1, 1]) {
      const X = side * (HW + 0.22);
      s.box([0.44, H, 1.9], [X, H / 2, 0], stucco);
      s.box([1.5, H, 0.4], [side * (HW - 0.75), H / 2, -0.75], stucco);
      // Broken tops and a ragged inner edge make them fragments rather than buildings.
      for (let i = 0; i < 6; i++) s.box([0.44, 0.15 + random() * 0.5, 0.3], [X, H + 0.1, -0.8 + i * 0.32], brick);
      for (let i = 0; i < 5; i++) s.box([0.3, 0.15 + random() * 0.45, 0.4], [side * (HW - 0.15 - i * 0.3), H + 0.1 - i * 0.05, -0.75], brick);
      for (let i = 0; i < 14; i++) s.box([0.12 + random() * 0.22, 0.2, 0.38], [side * (HW - 1.5 - 0.05), 0.2 + i * 0.38, -0.75], i % 3 ? brick : stone);
      // A window on each return.
      const wx = side * (HW - 0.78), wy = 3.25, bricked = a.window === 'bricked' && side < 0;
      s.box([0.8, 1.25, 0.08], [wx, wy, -0.56], bricked ? brick : dark);
      s.box([0.96, 0.1, 0.2], [wx, wy - 0.68, -0.5], stone);
      s.box([0.96, 0.12, 0.14], [wx, wy + 0.68, -0.52], stone);
      if (!bricked && a.window !== 'bricked') {
        const open = a.window !== 'shut';
        for (const leaf of [-1, 1]) {
          const panel = s.box([0.4, 1.25, 0.05], open ? [wx + leaf * 0.56, wy, -0.42] : [wx + leaf * 0.2, wy, -0.5], shutter);
          if (open) panel.rotation.y = -leaf * (0.9 + random() * 0.4);
          for (let slat = 0; slat < 6; slat++) { const bar = s.box([0.34, 0.02, 0.06], [0, -0.5 + slat * 0.2, 0], dark); panel.add(bar); }
        }
        if (a.window === 'open' || (a.window === 'basket' && side > 0)) {
          s.box([0.8, 0.16, 0.2], [wx, wy - 0.56, -0.42], s.material('#a35a3a'));
          for (let i = 0; i < 9; i++) {
            s.ball([0.07, 0.07, 0.07], [wx - 0.32 + random() * 0.64, wy - 0.4 + random() * 0.14, -0.4 + random() * 0.1], s.material(mood.cheer > 0.3 ? (i % 3 ? '#e03048' : '#f08aa0') : '#7a6a4a', { emissive: '#a01028', emissiveIntensity: mood.cheer * 0.3 }), 8);
            s.ball([0.09, 0.06, 0.07], [wx - 0.32 + random() * 0.64, wy - 0.47, -0.38], s.material('#3f7a3c'), 6);
          }
        } else if (a.window === 'basket') {
          s.mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.26, 14, 1, true), s.material('#c79a5a', { side: THREE.DoubleSide }), [wx, wy - 0.5, -0.38]);
          s.ball([0.26, 0.12, 0.26], [wx, wy - 0.4, -0.38], s.material(CLOTH[a.palette][0]), 10);
        }
      }
    }

    // Lines, pulleys and washing.
    const colours = CLOTH[a.palette];
    const rope = s.material('#ded6bf');
    const peg = s.material('#c9a56a');
    const swaying: { node: THREE.Object3D; phase: number; amp: number; base: number }[] = [];
    const lineCount = { one: 1, two: 2, three: 3 }[a.lines];
    const heights = [[3.2], [2.75, 4.1], [2.45, 3.5, 4.5]][lineCount - 1];
    const brightLine = Math.floor(random() * lineCount);
    let brightDone = a.bright === 'none', looseDone = a.fallen !== 'one-peg';
    const dropped: { kind: Kind; colour: string }[] = [];
    heights.forEach((height, lineIndex) => {
      const z = 0.35 - lineIndex * 0.38;
      const sag = mix(0.12, 0.34, a.fullness) + random() * 0.05;
      const lineY = (x: number) => height - sag * (1 - (x / HW) ** 2);
      const points = (lift: number) => Array.from({ length: 9 }, (_n, i) => { const x = -HW + (i / 8) * HW * 2; return [x, lineY(x) + lift * (0.4 + 0.6 * (x / HW) ** 2), z] as [number, number, number]; });
      s.tube(points(0), 0.012, rope);
      s.tube(points(0.16), 0.012, rope);
      for (const side of [-1, 1]) {
        s.box([0.08, 0.05, 0.05], [side * (HW - 0.03), height + 0.08, z], iron);
        const wheel = s.cylinder(0.09, 0.09, 0.03, [side * (HW - 0.1), height + 0.08, z], s.material('#8f8f8a', { metalness: 0.3 }), 14);
        wheel.rotation.x = Math.PI / 2;
      }
      const kinds = MIX[a.load];
      let x = -HW + 0.35 + random() * 0.2;
      const gapChance = mix(0.6, 0.02, a.fullness);
      let hung = 0;
      while (x < HW - 0.4) {
        let kind = kinds[Math.floor(random() * kinds.length)];
        let colour = colours[Math.floor(random() * colours.length)];
        let special: string | null = null;
        if (!brightDone && lineIndex === brightLine && (x > -0.9 || hung >= 2)) {
          brightDone = true;
          special = a.bright;
          kind = ({ 'red-dress': 'dress', 'football-shirt': 'shirt', 'yellow-sheet': 'sheet', harlequin: 'dress', 'blue-overalls': 'trousers' } as const)[a.bright as Exclude<typeof a.bright, 'none'>];
          colour = ({ 'red-dress': '#e3172d', 'football-shirt': '#f2f2f2', 'yellow-sheet': '#f5c518', harlequin: '#f2f2f2', 'blue-overalls': '#1668e0' } as const)[a.bright as Exclude<typeof a.bright, 'none'>];
        } else if (hung >= 2 && random() < gapChance) { x += 0.35 + random() * 0.5; if (random() < 0.5) s.box([0.025, 0.09, 0.03], [x - 0.2, lineY(x - 0.2), z], peg); continue; }
        const { shape, width, drop } = garment(kind, random);
        if (x + width > HW - 0.15) { if (special) brightDone = a.bright === 'none'; break; }
        const cx = x + width / 2;
        let material: THREE.MeshStandardMaterial;
        if (special === 'football-shirt' || special === 'harlequin') {
          const c = document.createElement('canvas'); c.width = c.height = 64;
          const g = c.getContext('2d')!;
          if (special === 'football-shirt') { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#d6182a'; for (let i = 0; i < 64; i += 16) g.fillRect(i, 0, 8, 64); }
          else { const tones = ['#e3172d', '#f5c518', '#1668e0', '#1fa35a']; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = tones[(i + j * 3) % 4]; g.beginPath(); g.moveTo(i * 8 + 4, j * 16 - 8); g.lineTo(i * 8 + 8, j * 16); g.lineTo(i * 8 + 4, j * 16 + 8); g.lineTo(i * 8, j * 16); g.fill(); g.fillStyle = tones[(i + j * 3 + 2) % 4]; g.fillRect(i * 8 + 3, j * 16 + 7, 2, 2); } }
          const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 3);
          material = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
        } else material = s.material(colour, { roughness: 0.9, side: THREE.DoubleSide, ...(special ? { emissive: colour, emissiveIntensity: 0.28 } : {}) });
        const pivot = new THREE.Group();
        pivot.position.set(cx, lineY(cx), z);
        const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
        cloth.castShadow = cloth.receiveShadow = true;
        pivot.add(cloth);
        if (special === 'blue-overalls') { const bib = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.4), material); bib.position.y = 0.2; pivot.add(bib); pivot.position.y -= 0.42; for (const strap of [-0.13, 0.13]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.24), material); st.position.set(strap, 0.5, 0); pivot.add(st); } }
        if (kind === 'towel' && !special) { const band = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.07), s.material(colours[(colours.indexOf(colour) + 1) % colours.length], { side: THREE.DoubleSide })); band.position.set(0, -drop + 0.15, 0.004); pivot.add(band); }
        const loose = !looseDone && !special && hung >= 1 && kind !== 'sock';
        const pegs = loose ? [-width * 0.42] : width > 0.5 ? [-width * 0.38, width * 0.38] : [0];
        if (loose) { looseDone = true; cloth.position.x = width * 0.42; pivot.position.x -= width * 0.42; pivot.rotation.z = -0.75; }
        for (const px of pegs) s.box([0.03, 0.1, 0.035], [cx + px, lineY(cx + px) + (special === 'blue-overalls' ? 0 : 0), z], peg);
        s.root.add(pivot);
        swaying.push({ node: pivot, phase: cx * 0.9 + lineIndex * 1.7 + random(), amp: (kind === 'sheet' ? 0.3 : kind === 'sock' ? 0.12 : 0.2) * (loose ? 1.6 : 1), base: (random() - 0.5) * 0.1 });
        if (dropped.length === 0) dropped.push({ kind, colour });
        x += width * mix(1.02, 0.86, a.fullness) + 0.06 + random() * mix(0.3, 0.04, a.fullness);
        hung++;
      }
    });

    // What fell.
    if (a.fallen === 'ground' || a.fallen === 'sock') {
      const kind: Kind = a.fallen === 'sock' ? 'sock' : dropped[0]?.kind === 'sheet' ? 'towel' : dropped[0]?.kind ?? 'shirt';
      const { shape } = garment(kind, random);
      const cloth = s.mesh(new THREE.ShapeGeometry(shape), s.material(a.fallen === 'sock' ? colours[0] : colours[Math.floor(random() * colours.length)], { side: THREE.DoubleSide }), [(random() - 0.5) * 3, 0.03, 0.9 + random() * 0.4]);
      cloth.rotation.set(-Math.PI / 2 + 0.06, 0, random() * 6);
      cloth.scale.setScalar(a.fallen === 'sock' ? 1.5 : 1);
      s.box([0.03, 0.035, 0.1], [cloth.position.x + 0.3, 0.02, cloth.position.z + 0.25], peg).rotation.y = random() * 3;
    }

    const energy = mix(0.2, 1.5, mood.energy);
    const update = (_dt: number, time: number) => {
      for (const { node, phase, amp, base } of swaying) {
        const gust = Math.sin(time * 0.9 * energy - phase) + 0.4 * Math.sin(time * 2.3 * energy - phase * 1.7);
        node.rotation.x = base - (0.1 + gust * 0.5 + 0.5) * amp * energy;
      }
    };
    update(0, 1.3);
    return s.finish({ footprint: HW + 0.5, update });
  },
});
