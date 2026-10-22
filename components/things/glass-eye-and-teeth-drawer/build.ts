import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const MIXES = {
  human: 'Realistic human spares: brown, blue and hazel eyes, pink-gummed dentures, flesh-toned noses and ears.',
  zombie: 'Undead stock: milky cataract eyes threaded with veins, rotten brown teeth, grey-green noses and bitten ears.',
  ape: 'Primate parts: amber eyes in dark sclera, heavy jaws with long canines, flat black noses.',
  vampire: 'Gothic kit: blood-red glowing eyes, rows of fang caps on cards, pale pointed ears.',
  cartoon: 'Comic props: big googly eyes, red clown noses, chattering buck teeth, bright rubber ears.',
  everything: 'A jumble bridging the whole face shop: every kind of eye, tooth, nose and ear side by side.',
} as const;
type Style = Exclude<keyof typeof MIXES, 'everything'>;
type Kind = 'eye' | 'denture' | 'fang' | 'nose' | 'ear';
const STYLES: Style[] = ['human', 'zombie', 'ape', 'vampire', 'cartoon'];

const many = (kind: Kind, count: number): Kind[] => Array.from({ length: count }, () => kind);
const STOCK: Record<keyof typeof MIXES, Kind[]> = {
  human: [...many('eye', 4), ...many('denture', 3), ...many('nose', 3), ...many('ear', 2)],
  zombie: [...many('eye', 4), ...many('denture', 3), ...many('fang', 1), ...many('nose', 2), ...many('ear', 2)],
  ape: [...many('eye', 3), ...many('denture', 4), ...many('fang', 2), ...many('nose', 2), ...many('ear', 1)],
  vampire: [...many('eye', 3), ...many('fang', 4), ...many('denture', 2), ...many('nose', 1), ...many('ear', 2)],
  cartoon: [...many('eye', 4), ...many('denture', 3), ...many('nose', 3), ...many('ear', 2)],
  everything: [...many('eye', 3), ...many('denture', 3), ...many('fang', 2), ...many('nose', 2), ...many('ear', 2)],
};

const SCLERA: Record<Style, string> = { human: '#f4f1ea', zombie: '#e6e2c2', ape: '#3b2a1f', vampire: '#f3e7e4', cartoon: '#ffffff' };
const IRIS: Record<Style, string[]> = {
  human: ['#6b4423', '#3f7fb5', '#5d8a4a', '#8a6d2f'],
  zombie: ['#c5d0cf', '#d8dcc8'],
  ape: ['#d08a1e', '#b5651d'],
  vampire: ['#d1121a', '#ff5a1f'],
  cartoon: ['#111111'],
};
const SKIN: Record<Style, string[]> = {
  human: ['#e2b79a', '#c98f6d', '#8d5b3e', '#f0cdb5'],
  zombie: ['#8fa17c', '#9aa58c', '#7f8c86'],
  ape: ['#2c2420', '#3a2c25', '#4a3930'],
  vampire: ['#e6dfe0', '#d9d3da'],
  cartoon: ['#ff6fa8', '#62c96a', '#ffd23f', '#58b8f0'],
};
const GUM: Record<Style, string> = { human: '#d9707e', zombie: '#6f5a66', ape: '#4a2f33', vampire: '#8e2337', cartoon: '#e8262e' };
const TOOTH: Record<Style, string> = { human: '#f3efe2', zombie: '#b59a5a', ape: '#e3d6ad', vampire: '#f6f3ea', cartoon: '#ffffff' };

/** An eye as an equirectangular painting: the iris sits on the sphere's +y pole. */
function eyeTexture(style: Style, iris: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = SCLERA[style];
  ctx.fillRect(0, 0, 128, 128);
  const veins = { human: 5, zombie: 22, ape: 0, vampire: 12, cartoon: 0 }[style];
  ctx.strokeStyle = style === 'zombie' ? '#a8322c' : '#c9605a';
  ctx.lineWidth = 1;
  for (let i = 0; i < veins; i++) {
    let x = random() * 128, y = 30 + random() * 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 12; y += 6 + random() * 8; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const rim = style === 'cartoon' ? 0 : 30, pupil = style === 'cartoon' ? 22 : style === 'zombie' ? 6 : 12;
  if (rim) {
    ctx.fillStyle = '#1d1512';
    ctx.fillRect(0, 0, 128, rim + 2);
    const band = ctx.createLinearGradient(0, 0, 0, rim);
    band.addColorStop(0, iris);
    band.addColorStop(1, style === 'zombie' ? '#aab5b3' : iris);
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, 128, rim);
    // Radial flecks in the iris.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    for (let x = 0; x < 128; x += 5) { ctx.beginPath(); ctx.moveTo(x + random() * 3, pupil); ctx.lineTo(x + random() * 3, rim - 3); ctx.stroke(); }
  }
  ctx.fillStyle = style === 'zombie' ? '#8f9a98' : '#0b0908';
  ctx.fillRect(0, 0, 128, pupil);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Collects many small solids of one shape and draws them in one call, each with its own colour. */
class Batch {
  private readonly matrices: THREE.Matrix4[] = [];
  private readonly colours: THREE.Color[] = [];
  add(matrix: THREE.Matrix4, colour: THREE.ColorRepresentation = '#ffffff') {
    this.matrices.push(matrix);
    this.colours.push(new THREE.Color(colour));
  }
  mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    if (!this.matrices.length) { geometry.dispose(); material.dispose(); return null; }
    const mesh = new THREE.InstancedMesh(geometry, material, this.matrices.length);
    this.matrices.forEach((matrix, index) => { mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, this.colours[index]); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    return mesh;
  }
}

type Triple = [number, number, number];
const ONE = new THREE.Vector3(1, 1, 1);
const local = (p: Triple, s: Triple, r: Triple = [0, 0, 0]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
const frameAt = (x: number, y: number, z: number, yaw = 0, tilt = 0, size = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, 'YXZ')), new THREE.Vector3(size, size, size));

export default defineThing({
  questions: {
    mix: choice('What kind of spare face parts fill the drawer?', MIXES),
    fill: score('How full is the drawer?', ['A few stragglers left in the corners', 'Half the compartments stocked', 'Every compartment crammed']),
    tonight: choice('Which compartment is flagged with a paper tag?', {
      eyes: 'A compartment of eyes.',
      teeth: 'A compartment of teeth.',
      noses: 'A compartment of noses.',
      ears: 'A compartment of ears.',
      none: 'None: nothing is flagged.',
    }),
    tag: choice('If a compartment is flagged, what does its tag say?', {
      tonight: 'TONIGHT, for this evening’s show.',
      hero: 'HERO, the close-up pieces.',
      act2: 'ACT II, the change at the interval.',
      spares: 'SPARES, the understudy set.',
      broken: 'DO NOT USE, cracked or mismatched.',
    }),
    rolled: noul('Has one eye rolled out of the drawer onto the bench?'),
    lining: choice('What felt lines the compartments?', {
      baize: 'Green billiard baize.',
      burgundy: 'Deep burgundy velvet.',
      black: 'Black jeweller’s felt.',
      mustard: 'Faded mustard felt.',
      blue: 'Dusty surgical blue.',
    }),
    cabinet: choice('What is the drawer pulled out of?', {
      oak: 'A small oak specimen cabinet with brass pulls and paper labels.',
      steel: 'A white enamelled steel dental cabinet with chrome handles.',
      loose: 'Nothing: the drawer has been lifted out and set down on the bench alone.',
    }),
    state: choice('What has just been happening at the drawer?', {
      sorted: 'Freshly sorted, every piece squared up in its own compartment.',
      rummaged: 'Rummaged through in a hurry, pieces in the wrong compartments and a few spilled out in front.',
      fitting: 'Mid-fitting: tweezers, a bottle of adhesive and an eye on a painting stick set down beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const messy = a.state === 'rummaged' ? 1 : mix(0.08, 0.4, mood.wear);

    // Dimensions, metres.
    const DW = 0.5, DD = 0.34, DH = 0.058, WALL = 0.012, FRONT = 0.018;
    const IW = DW - WALL * 2, ID = DD - WALL - FRONT;
    const COLS = 4, ROWS = 3, cw = IW / COLS, cd = ID / ROWS;
    const hasCabinet = a.cabinet !== 'loose';
    const slot = 0.075, plinth = 0.02, CD = 0.26;
    const baseY = hasCabinet ? plinth + slot * 2 + 0.004 : 0;
    const centreZ = hasCabinet ? 0.13 : 0;
    const floorY = baseY + 0.008;
    const innerZ = centreZ + (WALL - FRONT) / 2;

    const steelBody = a.cabinet === 'steel';
    const body = steelBody ? s.material('#e6e9e2', { roughness: 0.35, metalness: 0.15 }) : s.material('#8f6a40', { roughness: 0.6 });
    const side = steelBody ? s.material('#aeb4b6', { roughness: 0.4, metalness: 0.6 }) : s.material('#c7a676', { roughness: 0.7 });
    const metal = steelBody ? s.material('#dfe4e6', { metalness: 0.9, roughness: 0.2 }) : s.material('#c79a3a', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#1c1714', { roughness: 0.9 });
    const feltTint = { baize: '#2f6b45', burgundy: '#6d1f33', black: '#232326', mustard: '#b58f2e', blue: '#4f7391' }[a.lining];
    const felt = s.material(feltTint, { roughness: 1 });

    const labels: Record<keyof typeof MIXES, string> = { human: 'FACES', zombie: 'UNDEAD', ape: 'APES', vampire: 'FANGS', cartoon: 'GAGS', everything: 'EYES+TEETH' };
    const drawerFront = (y: number, z: number, text: string) => {
      s.box([DW + 0.016, slot - 0.007, FRONT], [0, y, z], body);
      s.ball([0.034, 0.011, 0.012], [0, y - 0.012, z + FRONT / 2 + 0.003], metal, 14);
      s.box([0.1, 0.03, 0.003], [0, y + 0.015, z + FRONT / 2 + 0.001], metal);
      s.label(text, 0.09, 0.022, [0, y + 0.015, z + FRONT / 2 + 0.0032], '#2c2620', '#efe6cc');
    };

    if (hasCabinet) {
      const CW = DW + 0.04, CH = plinth + slot * 3 + 0.016;
      s.box([CW, plinth, CD - 0.02], [0, plinth / 2, -CD / 2], dark);
      s.box([CW, CH - plinth, CD], [0, plinth + (CH - plinth) / 2, -CD / 2], body);
      s.box([CW + 0.012, 0.012, CD + 0.012], [0, CH + 0.002, -CD / 2], body);
      // The open slot is a dark mouth; the two below are shut and labelled.
      s.box([DW + 0.004, slot - 0.006, 0.004], [0, plinth + slot * 2.5, 0.001], dark);
      const others = ['WIGS', 'SCARS', 'HANDS', 'MOUSTACHES', 'BALD CAPS', 'NOSES A-M', 'MISC'].sort(() => random() - 0.5);
      drawerFront(plinth + slot * 0.5, FRONT / 2, others[0]);
      drawerFront(plinth + slot * 1.5, FRONT / 2 + (random() < 0.4 ? 0.02 + random() * 0.03 : 0), others[1]);
      // Runners under the open drawer.
      for (const x of [-1, 1]) s.box([0.008, 0.008, 0.2], [x * (DW / 2 - 0.004), baseY - 0.002, 0.03], metal);
    }

    // The open drawer.
    s.box([DW, 0.008, DD], [0, baseY + 0.004, centreZ], side);
    for (const x of [-1, 1]) s.box([WALL, DH, DD], [x * (DW - WALL) / 2, baseY + DH / 2, centreZ], side);
    s.box([DW, DH, WALL], [0, baseY + DH / 2, centreZ - DD / 2 + WALL / 2], side);
    drawerFront(baseY + (slot - 0.007) / 2 - 0.002, centreZ + DD / 2 - FRONT / 2, labels[a.mix]);
    s.box([IW, 0.002, ID], [0, floorY, innerZ], felt);
    const partition = s.material(new THREE.Color(feltTint).multiplyScalar(0.72), { roughness: 1 });
    for (let i = 1; i < COLS; i++) s.box([0.005, DH * 0.62, ID], [-IW / 2 + i * cw, floorY + DH * 0.31, innerZ], partition);
    for (let j = 1; j < ROWS; j++) s.box([IW, DH * 0.62, 0.005], [0, floorY + DH * 0.31, innerZ - ID / 2 + j * cd], partition);

    // Batched small parts.
    const balls = new Batch(), boxes = new Batch(), cones = new Batch();
    const eyes = new Map<string, { batch: Batch; texture: THREE.CanvasTexture; style: Style }>();
    const eyeBatch = (style: Style) => {
      const iris = pick(IRIS[style]);
      const key = `${style}:${iris}`;
      let entry = eyes.get(key);
      if (!entry) { entry = { batch: new Batch(), texture: eyeTexture(style, iris, random), style }; eyes.set(key, entry); }
      return entry;
    };
    const eyeRadius = (style: Style) => (style === 'cartoon' ? 0.0175 : style === 'ape' ? 0.015 : 0.0145);
    /** An eye resting on a surface at y, gazing up and toward the viewer. */
    const eye = (style: Style, x: number, y: number, z: number, wild: number) => {
      const r = eyeRadius(style);
      const tilt = mix(0.35, 0.8, random()) + (random() - 0.5) * 2.4 * wild, yaw = (random() - 0.5) * (0.5 + 5 * wild);
      eyeBatch(style).batch.add(frameAt(x, y + r, z, yaw, tilt, r));
    };

    const archGeometry = new THREE.TorusGeometry(0.02, 0.0052, 8, 18, Math.PI);
    const gums = new Map<Style, THREE.Material>();
    const denture = (frame: THREE.Matrix4, style: Style) => {
      const R = 0.02;
      const open = style === 'cartoon' ? 0.8 : mix(0.3, 0.6, random());
      let gum = gums.get(style);
      if (!gum) { gum = new THREE.MeshStandardMaterial({ color: GUM[style], roughness: 0.4 }); gums.set(style, gum); }
      for (const upper of [false, true]) {
        const jaw = frame.clone().multiply(upper ? local([0, 0.019, -0.003], [1, 1, 1], [-open, 0, 0]) : local([0, 0.0052, 0], [1, 1, 1]));
        const arch = new THREE.Mesh(archGeometry, gum);
        jaw.clone().multiply(local([0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0])).decompose(arch.position, arch.quaternion, arch.scale);
        arch.castShadow = arch.receiveShadow = true;
        s.root.add(arch);
        const dir = upper ? -1 : 1;
        const count = style === 'cartoon' ? 8 : 12;
        for (let k = 0; k < count; k++) {
          const t = Math.PI * (k + 0.5) / count, central = Math.abs(t - Math.PI / 2) < 0.55;
          if (style === 'zombie' && random() < 0.28) continue;
          const canine = (style === 'ape' || (style === 'vampire' && upper)) && (k === count / 2 - 2 || k === count / 2 + 1);
          const tint = new THREE.Color(TOOTH[style]).multiplyScalar(style === 'zombie' ? mix(0.6, 1, random()) : 1);
          if (canine) {
            const h = style === 'ape' ? 0.017 : 0.019;
            cones.add(jaw.clone().multiply(local([Math.cos(t) * R, dir * (0.002 + h / 2), Math.sin(t) * R], [0.0075, h, 0.0075], [upper ? Math.PI : 0, 0, 0])), tint);
            continue;
          }
          const w = style === 'cartoon' ? (central ? 0.012 : 0.008) : central ? 0.0048 : 0.0056;
          const h = style === 'cartoon' ? (central ? 0.015 : 0.008) : central ? 0.0085 : 0.006;
          boxes.add(jaw.clone().multiply(local([Math.cos(t) * R, dir * (0.003 + h / 2), Math.sin(t) * R], [w, h, 0.0042], [0, Math.PI / 2 - t, 0])), tint);
        }
      }
    };

    const fangPair = (frame: THREE.Matrix4, style: Style) => {
      if (style === 'zombie' || style === 'human') {
        // Loose single teeth, roots and all.
        for (let i = 0; i < 4; i++)
          boxes.add(frame.clone().multiply(local([(random() - 0.5) * 0.03, 0.003, (random() - 0.5) * 0.014], [0.005, 0.005, 0.011], [0, random() * 3, 0])), new THREE.Color(TOOTH[style]).multiplyScalar(mix(0.65, 1, random())));
        return;
      }
      boxes.add(frame.clone().multiply(local([0, 0.0015, 0], [0.04, 0.003, 0.018])), style === 'vampire' ? '#16090c' : style === 'cartoon' ? '#ffe14a' : '#efe6cc');
      const h = style === 'ape' ? 0.024 : style === 'cartoon' ? 0.02 : 0.02, w = style === 'ape' ? 0.011 : 0.008;
      for (const x of [-0.009, 0.009]) cones.add(frame.clone().multiply(local([x, 0.003 + h / 2, 0], [w, h, w], [0, 0, x * 8])), TOOTH[style]);
    };

    const nose = (frame: THREE.Matrix4, style: Style) => {
      const tint = new THREE.Color(pick(SKIN[style]));
      const shade = tint.clone().multiplyScalar(0.25);
      if (style === 'cartoon') {
        balls.add(frame.clone().multiply(local([0, 0.019, 0], [0.019, 0.019, 0.019])), pick(['#e3202a', '#e3202a', '#ff7a1a', '#2f7fe0']));
        balls.add(frame.clone().multiply(local([-0.007, 0.031, 0.008], [0.005, 0.004, 0.005])), '#ffffff');
        return;
      }
      if (style === 'ape') {
        balls.add(frame.clone().multiply(local([0, 0.006, 0], [0.024, 0.008, 0.017])), tint);
        balls.add(frame.clone().multiply(local([0, 0.009, -0.012], [0.012, 0.006, 0.012])), tint);
        for (const x of [-1, 1]) balls.add(frame.clone().multiply(local([x * 0.009, 0.011, 0.006], [0.0065, 0.004, 0.0075], [0, x * 0.5, 0])), shade);
        return;
      }
      // Thin blending edge, bridge, tip and wings; lying on its back with the tip toward the viewer.
      balls.add(frame.clone().multiply(local([0, 0.002, -0.002], [0.019, 0.003, 0.024])), tint.clone().lerp(new THREE.Color('#ffffff'), 0.25));
      balls.add(frame.clone().multiply(local([0, 0.007, -0.009], [0.008, 0.008, 0.017])), tint);
      balls.add(frame.clone().multiply(local([0, 0.011, 0.008], [0.0105, 0.0105, 0.0105])), tint);
      for (const x of [-1, 1]) {
        balls.add(frame.clone().multiply(local([x * 0.009, 0.007, 0.007], [0.007, 0.0065, 0.0075])), tint);
        balls.add(frame.clone().multiply(local([x * 0.0048, 0.006, 0.0165], [0.0032, 0.0028, 0.002])), shade);
      }
      if (style === 'zombie') balls.add(frame.clone().multiply(local([0.006, 0.012, -0.004], [0.006, 0.004, 0.008])), '#7d1414');
    };

    const ear = (frame: THREE.Matrix4, style: Style, hand: number) => {
      const tint = new THREE.Color(pick(SKIN[style]));
      const k = style === 'cartoon' ? 1.35 : style === 'ape' ? 1.2 : 1;
      // A handed x scale would turn instanced faces inside out, so the ear is mirrored by position instead.
      const g = frame.clone().multiply(local([0, 0.004, 0], [k, k, k], [0.45, 0, 0]));
      balls.add(g.clone().multiply(local([0, 0.002, 0], [0.012, 0.004, 0.018])), tint);
      balls.add(g.clone().multiply(local([hand * 0.002, 0.0045, 0.001], [0.0068, 0.003, 0.0115])), tint.clone().multiplyScalar(0.5));
      balls.add(g.clone().multiply(local([hand * -0.002, 0.003, 0.016], [0.0062, 0.004, 0.0062])), tint);
      if (style === 'vampire' || style === 'cartoon') cones.add(g.clone().multiply(local([hand * -0.003, 0.002, -0.021], [0.012, 0.016, 0.006], [-Math.PI / 2, 0, hand * 0.25])), tint);
      if (style === 'zombie') balls.add(g.clone().multiply(local([hand * -0.009, 0.004, -0.006], [0.005, 0.003, 0.006])), '#6e1212');
    };

    // Decide what each compartment holds.
    const kinds = [...STOCK[a.mix]];
    if (a.state === 'rummaged') kinds.sort(() => random() - 0.5);
    const cells = kinds.map((kind, index) => ({
      kind,
      style: a.mix === 'everything' ? pick(STYLES) : a.mix,
      x: -IW / 2 + (index % COLS + 0.5) * cw,
      z: innerZ - ID / 2 + (Math.floor(index / COLS) + 0.5) * cd,
      stocked: false,
    }));
    const wanted: Kind[] = { eyes: ['eye'], teeth: ['denture', 'fang'], noses: ['nose'], ears: ['ear'], none: [] }[a.tonight] as Kind[];
    const flagged = cells.find((cell) => wanted.includes(cell.kind)) ?? null;
    const stockedCount = Math.max(flagged ? 2 : 3, Math.round(cells.length * mix(0.3, 1, a.fill)));
    const order = cells.map((_cell, index) => index).sort(() => random() - 0.5);
    if (flagged) order.unshift(cells.indexOf(flagged));
    for (const index of order.slice(0, stockedCount)) cells[index].stocked = true;
    const amount = mix(0.3, 1, a.fill) * mix(0.8, 1.1, mood.density);

    const spilled: { kind: Kind; style: Style }[] = [];
    for (const cell of cells) {
      if (!cell.stocked) continue;
      const y = floorY + 0.001;
      const j = () => (random() - 0.5) * 0.012 * messy;
      const stray = () => (a.state === 'rummaged' && random() < 0.22 ? pick(cells).style : cell.style);
      if (cell.kind === 'eye') {
        const spots: [number, number][] = [];
        for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) spots.push([u * 0.035, v * 0.031]);
        if (messy > 0.5) spots.sort(() => random() - 0.5);
        const count = Math.max(1, Math.round(9 * amount * mix(0.75, 1, random())));
        for (const [u, v] of spots.slice(0, count)) eye(stray(), cell.x + u + j(), y, cell.z + v + j(), messy > 0.5 ? 0.45 : 0.05);
      } else if (cell.kind === 'denture') {
        const count = amount > 0.55 ? 2 : 1;
        for (let i = 0; i < count; i++)
          denture(frameAt(cell.x + (count === 2 ? (i - 0.5) * 0.054 : 0) + j(), y, cell.z - 0.012 + j(), (random() - 0.5) * (0.25 + messy * 1.6), 0, cell.style === 'ape' ? 1.18 : 1.05), stray());
      } else if (cell.kind === 'fang') {
        const count = Math.max(1, Math.round(6 * amount));
        for (let i = 0; i < count; i++)
          fangPair(frameAt(cell.x + (i % 2 - 0.5) * 0.05 + j(), y, cell.z + (Math.floor(i / 2) - 1) * 0.03 + j(), (random() - 0.5) * (0.2 + messy * 1.4)), stray());
      } else if (cell.kind === 'nose') {
        const count = Math.max(1, Math.round(4 * amount));
        for (let i = 0; i < count; i++)
          nose(frameAt(cell.x + (i % 2 - 0.5) * 0.052 + j(), y, cell.z + (Math.floor(i / 2) - 0.5) * 0.046 + j(), (random() - 0.5) * (0.3 + messy * 2), 0, cell.style === 'cartoon' ? 0.95 : 1.15), stray());
      } else {
        const count = Math.max(1, Math.round(4 * amount));
        for (let i = 0; i < count; i++)
          ear(frameAt(cell.x + (i % 2 - 0.5) * 0.05 + j(), y, cell.z + (Math.floor(i / 2) - 0.5) * 0.046 + j(), (random() - 0.5) * (0.3 + messy * 2), 0, 1.1), stray(), i % 2 ? 1 : -1);
      }
      if (a.state === 'rummaged' && random() < 0.4) spilled.push({ kind: cell.kind, style: cell.style });
    }

    // The paper tag, propped against the back of its compartment.
    if (flagged) {
      const text = { tonight: 'TONIGHT', hero: 'HERO', act2: 'ACT II', spares: 'SPARES', broken: 'DO NOT USE' }[a.tag];
      const paper = a.tag === 'broken' ? '#e8452e' : '#ffd84a';
      const tag = s.label(text, 0.084, 0.034, [flagged.x, floorY + DH * 0.62 + 0.012, flagged.z - cd / 2 + 0.006], a.tag === 'broken' ? '#ffffff' : '#2d2208', paper);
      tag.rotation.set(-0.5, 0, (random() - 0.5) * 0.16);
      s.rod([flagged.x, floorY + 0.004, flagged.z - cd / 2 + 0.004], [flagged.x, floorY + DH * 0.62, flagged.z - cd / 2 + 0.004], 0.0012, metal);
    }

    // Things that left the drawer.
    const benchZ = centreZ + DD / 2 + 0.05;
    for (const [index, item] of spilled.slice(0, 4).entries()) {
      const x = (index - 1.5) * 0.11 + (random() - 0.5) * 0.04, z = benchZ + random() * 0.05;
      const frame = frameAt(x, 0, z, random() * 6, 0, 1.1);
      if (item.kind === 'eye') eye(item.style, x, 0, z, 0.5);
      else if (item.kind === 'denture') denture(frame, item.style);
      else if (item.kind === 'fang') fangPair(frame, item.style);
      else if (item.kind === 'nose') nose(frame, item.style);
      else ear(frame, item.style, 1);
    }

    let roller: THREE.Mesh | null = null;
    const rollStyle = cells.find((cell) => cell.kind === 'eye')?.style ?? 'human';
    if (a.rolled) {
      const r = eyeRadius(rollStyle) * 1.15;
      const lone = eyeBatch(rollStyle);
      roller = s.mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ map: lone.texture, roughness: 0.12 }), [mix(0.1, 0.2, random()), r, benchZ + 0.03 + random() * 0.03]);
      roller.rotation.set(0.7, (random() - 0.5) * 0.8, 0);
    }

    // Mid-fitting: the tools set down on the cabinet top, or beside a loose drawer.
    if (a.state === 'fitting') {
      const topY = hasCabinet ? plinth + slot * 3 + 0.024 : 0;
      const at = (x: number, z: number): Triple => (hasCabinet ? [x, topY, -CD / 2 + z * 0.6] : [DW / 2 + 0.075, 0, x * 0.9]);
      const [bx, by, bz] = at(-0.14, 0.02);
      s.cylinder(0.016, 0.018, 0.045, [bx, by + 0.0225, bz], s.material('#7a4a1c', { roughness: 0.2 }), 16);
      s.cylinder(0.008, 0.008, 0.016, [bx, by + 0.053, bz], dark, 12);
      s.label('GUM', 0.03, 0.02, [bx, by + 0.022, bz + 0.0185], '#2c2620', '#efe6cc');
      const [tx, ty, tz] = at(0.02, 0.05);
      for (const spread of [-1, 1]) s.rod([tx - 0.05, ty + 0.003, tz], [tx + 0.05, ty + 0.003, tz + spread * 0.006], 0.0018, metal, 0.0008);
      // An eye mid-paint on a stick stuck in a block.
      const [px, py, pz] = at(0.15, 0);
      s.box([0.05, 0.025, 0.04], [px, py + 0.0125, pz], s.material('#b89466'));
      s.rod([px, py + 0.02, pz], [px, py + 0.075, pz + 0.012], 0.002, s.material('#d8c9a3'));
      const r = eyeRadius(rollStyle);
      const painted = s.mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ map: eyeBatch(rollStyle).texture, roughness: 0.12 }), [px, py + 0.075 + r * 0.8, pz + 0.014]);
      painted.rotation.set(1.05, 0, 0);
    }

    // Lint and plaster crumbs in an old drawer.
    for (let i = 0; i < Math.round(mood.wear * 26); i++)
      boxes.add(local([(random() - 0.5) * IW * 0.94, floorY + 0.002, innerZ + (random() - 0.5) * ID * 0.94], [0.003 + random() * 0.004, 0.0012, 0.002], [0, random() * 3, 0]), '#d9d2c2');

    for (const { batch, texture, style } of eyes.values()) {
      const glow = style === 'vampire' ? 0.32 : style === 'zombie' ? 0.15 : 0;
      const mesh = batch.mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.12, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: glow * mix(0.6, 1.2, mood.cheer) }));
      if (mesh) s.root.add(mesh);
    }
    const ballMesh = balls.mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.55 }));
    const boxMesh = boxes.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.3 }));
    const coneMesh = cones.mesh(new THREE.ConeGeometry(0.5, 1, 10), new THREE.MeshStandardMaterial({ roughness: 0.3 }));
    for (const mesh of [ballMesh, boxMesh, coneMesh]) if (mesh) s.root.add(mesh);

    const rest = roller ? roller.rotation.z : 0, rock = mix(0.05, 0.5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (roller) roller.rotation.z = rest + Math.sin(time * 1.4) * rock;
      },
    });
  },
});
