import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, painted, pick } from './util';

type Kind = 'strat' | 'single' | 'vee' | 'acoustic' | 'bass' | 'banjo' | 'uke';
type XY = readonly [number, number];

const OUTLINES: Record<'strat' | 'single' | 'vee' | 'acoustic', readonly XY[]> = {
  strat: [[0, -0.22], [0.11, -0.213], [0.165, -0.15], [0.16, -0.06], [0.127, 0], [0.132, 0.07], [0.128, 0.135], [0.1, 0.15], [0.068, 0.09], [0.03, 0.07], [-0.03, 0.07], [-0.062, 0.1], [-0.095, 0.2], [-0.14, 0.175], [-0.142, 0.07], [-0.127, 0], [-0.165, -0.07], [-0.165, -0.15], [-0.11, -0.213]],
  single: [[0, -0.21], [0.12, -0.2], [0.172, -0.12], [0.152, -0.03], [0.117, 0.03], [0.127, 0.09], [0.115, 0.14], [0.082, 0.12], [0.052, 0.072], [0.03, 0.062], [-0.03, 0.13], [-0.1, 0.125], [-0.135, 0.08], [-0.117, 0.02], [-0.152, -0.04], [-0.172, -0.12], [-0.12, -0.2]],
  vee: [[0, 0.1], [0.05, 0.08], [0.215, -0.31], [0.14, -0.33], [0, -0.06], [-0.14, -0.33], [-0.215, -0.31], [-0.05, 0.08]],
  acoustic: [[0, -0.25], [0.1, -0.243], [0.18, -0.19], [0.196, -0.1], [0.165, 0], [0.135, 0.06], [0.146, 0.14], [0.12, 0.21], [0.05, 0.245], [0, 0.25], [-0.05, 0.245], [-0.12, 0.21], [-0.146, 0.14], [-0.135, 0.06], [-0.165, 0], [-0.196, -0.1], [-0.18, -0.19], [-0.1, -0.243]],
};

function outline(kind: keyof typeof OUTLINES) {
  const points = OUTLINES[kind].map(([x, y]) => new THREE.Vector2(x, y));
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  if (kind === 'vee') for (const p of [...points.slice(1), points[0]]) shape.lineTo(p.x, p.y);
  else shape.splineThru([...points.slice(1), points[0]]);
  return shape;
}

const WALLS = { white: '#e8e5dc', maple: '#d1ab77', black: '#2c2d31', pegboard: '#a47c52', grey: '#8d9296' } as const;
const SIGNS = { none: '', guitars: 'GUITARS', stairway: 'NO STAIRWAY', ask: 'ASK BEFORE PLAYING', final: 'ALL SALES FINAL', layaway: 'LAYAWAY AVAILABLE' } as const;

export default defineThing({
  questions: {
    mix: choice('What is hanging on the wall?', {
      electrics: 'Solid-body electrics in candy colours and sunbursts, somebody\'s teenage years.',
      acoustics: 'Big-bodied acoustic guitars in honey and spruce, campfire and church.',
      mixed: 'An even shuffle of electrics and acoustics, whatever came through the door.',
      oddities: 'The strange end of the rack: a banjo, a bass, a ukulele, a pointed flying V.',
      metal: 'Pointed black and blood-red guitars for a band that never got out of the garage.',
    }),
    count: score('How many instruments are hanging?', ['Two or three, widely spaced', 'A modest row', 'Shoulder to shoulder, more than the wall wants']),
    empty: noul('Is one hook conspicuously empty, a paler ghost on the wall where a guitar used to hang?'),
    special: choice('What sets one of the guitars apart?', {
      none: 'Nothing; they are all equally anonymous.',
      signed: 'A scrawled marker signature across its body. Maybe real.',
      'missing-string': 'A snapped string curling loose from the bridge.',
      stickers: 'Covered in band stickers its owner once cared about.',
      taped: 'A cracked body held together with strips of grey tape.',
      childs: 'It is a child\'s half-size guitar in bright pink, hung among the adults.',
    }),
    wall: choice('What is the wall panel?', {
      white: 'White melamine slatwall, shop-fitting standard.',
      maple: 'Honey maple slatwall, a proper music shop.',
      black: 'Black slatwall that makes the finishes glow.',
      pegboard: 'Brown pegboard full of holes, older and cheaper.',
      grey: 'Grey carpeted panel, tired and sound-deadening.',
    }),
    tags: choice('What are the price tags like?', {
      string: 'Small white handwritten tags on strings from the headstocks.',
      starburst: 'Fluorescent starburst stickers slapped on the bodies.',
      red: 'Red SALE tags, marked down again.',
      ticket: 'Yellow pawn tickets with numbers, not yet for sale.',
    }),
    sign: choice('If a sign runs along the top, what does it say?', {
      none: 'No sign.',
      guitars: 'GUITARS',
      stairway: 'NO STAIRWAY',
      ask: 'ASK BEFORE PLAYING',
      final: 'ALL SALES FINAL',
      layaway: 'LAYAWAY AVAILABLE',
    }),
    foot: choice('What stands at the foot of the wall?', {
      nothing: 'Bare floor.',
      amp: 'A small practice amplifier with a cable coiled on top.',
      cases: 'Battered hard cases leaning against the panel.',
      stool: 'A chrome stool for trying one out.',
      pedals: 'A milk crate of cables and a row of effects pedals.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wanted = Math.round(mix(2.6, 9, a.count) + (mood.density - 0.5) * 2);
    const hooks = Math.max(2, Math.min(10, wanted));
    const rows = hooks >= 4 ? 2 : 1;
    const columns = Math.ceil(hooks / rows);
    const pitch = mix(0.5, 0.4, a.count);
    const W = columns * pitch + 0.24, H = rows === 2 ? 2.78 : 2.2, T = 0.05;
    const TOP_HOOK = H - 0.47;
    const spots: { x: number; y: number }[] = [];
    for (let i = 0; i < hooks; i++) {
      const lower = i >= columns, inRow = lower ? hooks - columns : columns, k = lower ? i - columns : i;
      spots.push({ x: (k - (inRow - 1) / 2) * pitch, y: TOP_HOOK - (lower ? 1.09 : 0) });
    }

    // ---- the panel ----
    const wallColour = new THREE.Color(WALLS[a.wall]);
    const wall = s.material(wallColour, { roughness: a.wall === 'grey' ? 1 : 0.7 });
    const groove = s.material(wallColour.clone().multiplyScalar(a.wall === 'black' ? 0.45 : 0.62));
    const steel = s.material('#b9bdbf', { metalness: 0.5, roughness: 0.35 });
    const dark = s.material('#1c1c1f');
    s.box([W, H - 0.1, T], [0, 0.1 + (H - 0.1) / 2, 0], wall);
    s.box([W + 0.06, 0.1, 0.36], [0, 0.05, 0.08], dark);
    for (const x of [-1, 1]) s.box([0.04, H, T + 0.03], [x * (W / 2 + 0.02), H / 2, 0], steel);
    s.box([W + 0.08, 0.04, T + 0.03], [0, H + 0.02, 0], steel);
    if (a.wall === 'pegboard') {
      const holes = new Batch(new THREE.CircleGeometry(0.008, 6), groove);
      const nx = Math.floor(W / 0.075), ny = Math.floor((H - 0.3) / 0.075);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) holes.add([-W / 2 + 0.06 + i * ((W - 0.12) / (nx - 1)), 0.2 + j * 0.075, T / 2 + 0.002]);
      holes.into(s.root);
    } else if (a.wall !== 'grey') {
      const slots = new Batch(new THREE.BoxGeometry(1, 1, 1), groove);
      for (let y = 0.22; y < H - 0.05; y += 0.1) slots.add([0, y, T / 2], [W - 0.01, 0.014, 0.006]);
      slots.into(s.root);
    }
    if (a.sign !== 'none') {
      const board = s.label(SIGNS[a.sign], Math.min(W * 0.8, 0.12 * SIGNS[a.sign].length + 0.3), 0.18, [0, H - 0.135, T / 2 + 0.03], a.sign === 'final' || a.sign === 'stairway' ? '#f6efdc' : '#1f2023', a.sign === 'final' || a.sign === 'stairway' ? '#a8231f' : '#f0d23a');
      board.rotation.z = (random() - 0.5) * 0.03 * (1 + mood.wear * 3);
    }

    // ---- shared detail batches ----
    const strings = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#e9e6da', metalness: 0.3, roughness: 0.4 }));
    const frets = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#d6d2c4', metalness: 0.4, roughness: 0.4 }));
    const pegs = new Batch(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.4, roughness: 0.35 }));
    const knobs = new Batch(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshStandardMaterial({ roughness: 0.5 }));
    const bits = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.5 }));

    const bright = ['#c8202c', '#5fc7b8', '#f1ead6', '#e9a23b', '#3b78c9', '#f0c62e', '#d9642a', '#18181b'];
    const sombre = ['#17171a', '#5a1620', '#3c3a2a', '#6b3a1c', '#22324a', '#8a8a86', '#a8231f'];
    const woods = ['#d9a85c', '#c98f45', '#e3c184', '#a8672f', '#7a4424', '#1c1b1b'];
    const colourFor = (kind: Kind) => {
      if (a.mix === 'metal') return pick(random, ['#121214', '#121214', '#7c0f16', '#1f1f24', '#e8e6df']);
      if (kind === 'acoustic' || kind === 'uke') return pick(random, woods);
      return random() < mix(0.2, 0.85, mood.cheer) ? pick(random, bright) : pick(random, sombre);
    };
    const kindFor = (index: number): Kind => {
      switch (a.mix) {
        case 'electrics': return pick(random, ['strat', 'strat', 'single', 'single', 'bass'] as const);
        case 'acoustics': return random() < 0.12 ? 'uke' : 'acoustic';
        case 'mixed': return index % 2 === 0 ? pick(random, ['strat', 'single'] as const) : 'acoustic';
        case 'oddities': return (['banjo', 'vee', 'bass', 'uke', 'acoustic', 'banjo', 'single', 'vee'] as const)[(index + Math.floor(random() * 2)) % 8];
        default: return pick(random, ['vee', 'vee', 'strat', 'bass', 'single'] as const);
      }
    };

    const tagTextures = new Map<string, THREE.Texture>();
    const tagTexture = (text: string, paper: string, ink: string) => {
      const key = text + paper;
      if (!tagTextures.has(key))
        tagTextures.set(key, painted(128, 160, (ctx, w, h) => {
          ctx.fillStyle = paper;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = ink;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'italic bold 46px cursive, sans-serif';
          ctx.fillText(text, w / 2, h * 0.58, w - 14);
          ctx.beginPath();
          ctx.arc(w / 2, 18, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#3a3a3a';
          ctx.fill();
        }));
      return tagTextures.get(key)!;
    };
    const prices = ['$40', '$65', '$89', '$120', '$149', '$199', '$275', '$350'];
    const swingers: THREE.Object3D[] = [];
    const hangTag = (parent: THREE.Object3D, x: number, y: number, z: number, big = 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const red = a.tags === 'red', ticket = a.tags === 'ticket';
      const text = ticket ? `#${1000 + Math.floor(random() * 8999)}` : pick(random, prices);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.075 * big, 0.095 * big), new THREE.MeshStandardMaterial({ map: tagTexture(text, red ? '#d32a26' : ticket ? '#f1d43c' : '#f6f1e0', red ? '#fff6e6' : '#1d1d1d'), roughness: 0.9, side: THREE.DoubleSide }));
      tag.position.y = -0.11 * big;
      tag.castShadow = true;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.07 * big, 4), new THREE.MeshStandardMaterial({ color: '#d8d2c0' }));
      cord.position.y = -0.035 * big;
      pivot.add(tag, cord);
      pivot.rotation.z = (random() - 0.5) * 0.7;
      parent.add(pivot);
      swingers.push(pivot);
    };
    const star = new THREE.Shape();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? 0.036 : 0.055, t = (i / 24) * Math.PI * 2;
      if (i === 0) star.moveTo(Math.cos(t) * r, Math.sin(t) * r);
      else star.lineTo(Math.cos(t) * r, Math.sin(t) * r);
    }
    const starGeometry = a.tags === 'starburst' ? new THREE.ShapeGeometry(star) : null;
    const neon = ['#f6ff3a', '#ff5fb0', '#63ff6a', '#ff8a2a'];

    const specialIndex = Math.floor(random() * hooks);
    let emptyIndex = a.empty ? Math.floor(random() * hooks) : -1;
    if (emptyIndex === specialIndex && a.special !== 'none') emptyIndex = (emptyIndex + 1) % hooks;

    const makeGuitar = (kind: Kind, special: boolean) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const tiny = special && a.special === 'childs';
      const colour = new THREE.Color(tiny ? '#f25fa5' : colourFor(kind));
      colour.lerp(new THREE.Color('#8a8272'), mood.wear * 0.22);
      const gloss = new THREE.MeshStandardMaterial({ color: colour, roughness: mix(0.22, 0.6, mood.wear), metalness: 0.05 });
      const neckWood = new THREE.MeshStandardMaterial({ color: kind === 'acoustic' || kind === 'uke' ? '#6b4326' : pick(random, ['#d7b071', '#c99a5a', '#3a2618']), roughness: 0.6 });
      const board = new THREE.MeshStandardMaterial({ color: random() < 0.6 ? '#2a1d16' : '#c9a264', roughness: 0.7 });
      const chrome = new THREE.MeshStandardMaterial({ color: '#d0d3d5', metalness: 0.5, roughness: 0.3 });
      const black = new THREE.MeshStandardMaterial({ color: '#15151a', roughness: 0.5 });
      const cream = new THREE.MeshStandardMaterial({ color: '#efe8d2', roughness: 0.6 });

      const isAcoustic = kind === 'acoustic' || kind === 'uke';
      const depth = isAcoustic ? 0.095 : kind === 'banjo' ? 0.07 : 0.04;
      let neckBase = 0.07, neckLen = 0.47, bodyBottom = -0.22, nStrings = 6, frontZ = depth / 2 + 0.008;
      if (kind === 'bass') { neckLen = 0.62; nStrings = 4; }
      if (kind === 'acoustic') { neckBase = 0.22; neckLen = 0.36; bodyBottom = -0.25; }
      if (kind === 'uke') { neckBase = 0.22; neckLen = 0.3; nStrings = 4; }
      if (kind === 'banjo') { neckBase = 0.13; neckLen = 0.5; nStrings = 5; bodyBottom = -0.15; }

      if (kind === 'banjo') {
        const rim = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, depth, 28), chrome));
        rim.rotation.x = Math.PI / 2;
        const head = add(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.01, 28), cream));
        head.rotation.x = Math.PI / 2;
        head.position.z = depth / 2 + 0.002;
        const back = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.03, 28), gloss));
        back.rotation.x = Math.PI / 2;
        back.position.z = -depth / 2;
        frontZ = depth / 2 + 0.01;
      } else {
        const key = kind === 'bass' ? 'strat' : kind === 'uke' ? 'acoustic' : kind;
        const geometry = new THREE.ExtrudeGeometry(outline(key), { depth, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 8 });
        geometry.translate(0, 0, -depth / 2);
        const edge = (key === 'single' || key === 'acoustic') && !tiny && random() < 0.7;
        add(new THREE.Mesh(geometry, edge ? new THREE.MeshStandardMaterial({ color: colour.clone().multiplyScalar(0.32), roughness: 0.4 }) : gloss));
        if (edge) {
          const top = add(new THREE.Mesh(new THREE.ShapeGeometry(outline(key), 8), gloss));
          top.scale.set(0.87, 0.9, 1);
          top.position.set(0, -0.004, depth / 2 + 0.0068);
        }
        if (key === 'acoustic') {
          const hole = add(new THREE.Mesh(new THREE.CircleGeometry(0.048, 20), black));
          hole.position.set(0, 0.06, frontZ);
          const rose = add(new THREE.Mesh(new THREE.RingGeometry(0.05, 0.06, 20), cream));
          rose.position.set(0, 0.06, frontZ);
          const bridge = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.012), black));
          bridge.position.set(0, -0.11, frontZ);
          if (random() < 0.6) {
            const guard = add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 14, 0, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: pick(random, ['#201512', '#5a2a18', '#111111']), roughness: 0.35 })));
            guard.position.set(0.075, 0.02, frontZ);
            guard.rotation.z = -1.9;
          }
        } else {
          if (key === 'strat' && kind !== 'bass') {
            const guard = add(new THREE.Mesh(new THREE.ShapeGeometry(outline('strat'), 8), random() < 0.6 ? cream : black));
            guard.scale.set(0.62, 0.7, 1);
            guard.position.set(0.012, -0.03, frontZ - 0.001);
          }
          const pickups = kind === 'bass' ? 1 : key === 'strat' ? 3 : 2;
          for (let i = 0; i < pickups; i++) {
            const pu = add(new THREE.Mesh(new THREE.BoxGeometry(key === 'strat' ? 0.085 : 0.075, key === 'strat' ? 0.02 : 0.036, 0.01), key === 'strat' ? (kind === 'bass' ? black : cream) : random() < 0.5 ? chrome : black));
            pu.position.set(0, 0.02 - i * (pickups === 3 ? 0.058 : 0.085) - (key === 'vee' ? 0.02 : 0), frontZ + 0.003);
            if (key === 'strat' && i === pickups - 1) pu.rotation.z = 0.2;
          }
          const bridge = add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.014), chrome));
          bridge.position.set(0, key === 'vee' ? -0.16 : -0.14, frontZ + 0.003);
        }
      }

      // neck, fretboard, headstock
      const neckW = kind === 'bass' ? 0.05 : 0.046;
      const neck = add(new THREE.Mesh(new THREE.BoxGeometry(neckW, neckLen + 0.08, 0.024), neckWood));
      neck.position.set(0, neckBase + neckLen / 2 - 0.04, frontZ - 0.02);
      const fb = add(new THREE.Mesh(new THREE.BoxGeometry(neckW + 0.002, neckLen + (isAcoustic ? 0.06 : 0.1), 0.008), board));
      fb.position.set(0, neckBase + neckLen / 2 - (isAcoustic ? 0.03 : 0.05), frontZ - 0.004);
      const neckTop = neckBase + neckLen;
      const inline = kind === 'strat' || kind === 'bass' || (kind === 'vee' && random() < 0.5);
      const headLen = kind === 'bass' ? 0.2 : kind === 'uke' ? 0.11 : 0.17;
      const head = add(new THREE.Mesh(new THREE.BoxGeometry(inline ? 0.062 : 0.078, headLen, 0.016), inline || isAcoustic ? neckWood : black));
      head.position.set(inline ? -0.01 : 0, neckTop + headLen / 2, frontZ - 0.024);
      if (inline) head.rotation.z = 0.07;
      const pegSpots: [number, number, number][] = [];
      const perSide = inline ? nStrings : Math.ceil(nStrings / 2);
      for (let i = 0; i < perSide; i++) {
        const y = neckTop + 0.025 + (i / Math.max(1, perSide - 1)) * (headLen - 0.05);
        if (inline) pegSpots.push([-0.05 - i * 0.002, y, frontZ - 0.024]);
        else for (const x of [-1, 1]) pegSpots.push([x * 0.05, y, frontZ - 0.024]);
      }
      return { g, neckTop, bodyBottom, frontZ, nStrings, neckBase, neckLen, neckW, tiny, colour, depth, kind, pegSpots, isAcoustic };
    };

    // strings and frets are added in wall space once the guitar is placed
    const placeDetail = (info: ReturnType<typeof makeGuitar>, special: boolean) => {
      const { g, neckTop, frontZ, nStrings, neckBase, neckLen, neckW, kind } = info;
      g.updateMatrix();
      const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(g.matrix).toArray() as [number, number, number];
      const scale = g.scale.x, turn = g.rotation.z;
      for (const [px, py, pz] of info.pegSpots) pegs.add(local(px, py, pz), [0.012 * scale, 0.008 * scale, 0.008], [0, 0, turn], info.isAcoustic ? '#f1ead8' : '#e2e4e6');
      const bridgeY = kind === 'acoustic' || kind === 'uke' ? -0.11 : kind === 'banjo' ? -0.07 : kind === 'vee' ? -0.16 : -0.14;
      const length = neckTop + 0.02 - bridgeY;
      const skip = special && a.special === 'missing-string' ? 1 + Math.floor(random() * (nStrings - 2)) : -1;
      for (let i = 0; i < nStrings; i++) {
        if (i === skip) continue;
        const x = (i - (nStrings - 1) / 2) * ((neckW - 0.012) / (nStrings - 1));
        strings.add(local(x, bridgeY + length / 2, frontZ + 0.006), [0.0022 * scale, length * scale, 0.002], [0, 0, turn]);
      }
      const nFrets = kind === 'uke' ? 8 : 12;
      for (let i = 1; i <= nFrets; i++) {
        const y = neckTop - (neckLen + 0.06) * (1 - Math.pow(0.5, i / 9)) * 1.25;
        if (y < neckBase - 0.06) break;
        frets.add(local(0, y, frontZ + 0.001), [neckW * scale, 0.003, 0.003], [0, 0, turn]);
      }
      if (kind !== 'acoustic' && kind !== 'uke' && kind !== 'banjo') {
        const n = kind === 'bass' ? 2 : 3;
        for (let i = 0; i < n; i++) knobs.add(local(0.07 + i * 0.022, -0.1 - i * 0.035, frontZ + 0.008), [0.013 * scale, 0.012, 0.013 * scale], [Math.PI / 2, 0, 0], pick(random, ['#e8e2cc', '#17171a', '#d8b24a']));
      }
      if (skip >= 0) {
        // the snapped string springs away from the bridge in a loose curl
        const from = local(0.004, bridgeY, frontZ + 0.008);
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 14; i++) {
          const t = i / 14, r = 0.03 + t * 0.09;
          pts.push([from[0] + Math.sin(t * 7) * r + t * 0.08, from[1] + t * 0.34 + Math.cos(t * 7) * 0.02, from[2] + 0.02 + Math.sin(t * 3.14) * 0.07]);
        }
        s.tube(pts, 0.0035, new THREE.MeshStandardMaterial({ color: '#f1efe6', metalness: 0.3, roughness: 0.3, emissive: '#77756c', emissiveIntensity: 0.4 }));
      }
    };

    for (let i = 0; i < hooks; i++) {
      const { x, y: HOOK_Y } = spots[i];
      // slatwall hook: a bracket plate, an arm and a padded yoke
      s.box([0.05, 0.07, 0.012], [x, HOOK_Y + 0.02, T / 2 + 0.006], steel);
      s.rod([x, HOOK_Y, T / 2], [x, HOOK_Y - 0.01, T / 2 + 0.12], 0.006, steel);
      for (const dx of [-1, 1]) s.rod([x + dx * 0.035, HOOK_Y - 0.012, T / 2 + 0.07], [x + dx * 0.035, HOOK_Y + 0.012, T / 2 + 0.135], 0.008, dark);
      s.rod([x - 0.035, HOOK_Y - 0.012, T / 2 + 0.07], [x + 0.035, HOOK_Y - 0.012, T / 2 + 0.07], 0.006, steel);

      if (i === emptyIndex) {
        // a paler ghost where the sun and dust never reached
        const ghost = new THREE.Mesh(new THREE.ShapeGeometry(outline('strat'), 8), new THREE.MeshStandardMaterial({ color: wallColour.clone().lerp(new THREE.Color('#ffffff'), a.wall === 'black' ? 0.14 : 0.45), roughness: 0.8 }));
        ghost.position.set(x, HOOK_Y - 0.62, T / 2 + 0.008);
        ghost.receiveShadow = true;
        s.root.add(ghost);
        s.box([0.04, 0.5, 0.002], [x, HOOK_Y - 0.3, T / 2 + 0.008], ghost.material as THREE.Material);
        hangTag(s.root, x + 0.02, HOOK_Y - 0.01, T / 2 + 0.11, 1.25);
        continue;
      }
      const special = i === specialIndex && a.special !== 'none';
      const info = makeGuitar(kindFor(i), special);
      const { g, neckTop, frontZ, tiny, colour } = info;
      const scale = tiny ? 0.62 : info.kind === 'uke' ? 0.72 : 1;
      g.scale.setScalar(scale);
      g.rotation.z = (random() - 0.5) * mix(0.03, 0.14, mood.wear);
      g.position.set(x, HOOK_Y - neckTop * scale + 0.004, T / 2 + 0.085 + info.depth * 0.3);
      s.root.add(g);
      placeDetail(info, special);

      if (a.tags === 'starburst' && starGeometry) {
        const sticker = new THREE.Mesh(starGeometry!, new THREE.MeshStandardMaterial({ color: pick(random, neon), emissive: '#665500', emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }));
        sticker.position.set(-0.08 + random() * 0.03, -0.12 + random() * 0.05, frontZ + 0.012);
        sticker.rotation.z = random() * 0.5;
        g.add(sticker);
      } else hangTag(g, 0.03, neckTop + 0.01, frontZ + 0.02, 1 / scale);

      if (special && a.special === 'signed') {
        const light = colour.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
        const scrawl = painted(256, 160, (ctx, w, h) => {
          ctx.strokeStyle = light ? '#101014' : '#f4f4f4';
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(18, h * 0.6);
          for (let k = 0; k < 9; k++) ctx.bezierCurveTo(20 + k * 24 + random() * 20, 10 + random() * 40, 30 + k * 24, h - 10 - random() * 40, 46 + k * 23, h * (0.35 + random() * 0.4));
          ctx.moveTo(30, h * 0.85);
          ctx.lineTo(w - 20, h * 0.72);
          ctx.stroke();
        });
        const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshStandardMaterial({ map: scrawl, transparent: true, alphaTest: 0.35, roughness: 0.5, emissive: light ? '#000000' : '#ffffff', emissiveIntensity: 0.25, emissiveMap: scrawl }));
        mark.position.set(-0.035, -0.15, frontZ + 0.016);
        mark.rotation.z = 0.25;
        g.add(mark);
      } else if (special && a.special === 'stickers') {
        for (let k = 0; k < 8; k++) {
          const sticker = new THREE.Mesh(random() < 0.4 ? new THREE.CircleGeometry(0.022 + random() * 0.012, 12) : new THREE.PlaneGeometry(0.04 + random() * 0.05, 0.025 + random() * 0.03), new THREE.MeshStandardMaterial({ color: pick(random, ['#f4f1e6', '#121212', '#e22b2b', '#ffd21f', '#2b6fe2', '#35b35a', '#ff6fb1']), roughness: 0.6 }));
          sticker.position.set((random() - 0.5) * 0.22, -0.02 - random() * 0.16, frontZ + 0.013 + k * 0.0006);
          sticker.rotation.z = (random() - 0.5) * 1.6;
          g.add(sticker);
        }
      } else if (special && a.special === 'taped') {
        for (let k = 0; k < 3; k++) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.004), new THREE.MeshStandardMaterial({ color: '#9da2a4', roughness: 0.55, metalness: 0.2 }));
          strip.position.set(0, -0.05 - k * 0.055, frontZ + 0.014);
          strip.rotation.z = -0.5 + k * 0.22 + (random() - 0.5) * 0.2;
          strip.castShadow = true;
          g.add(strip);
        }
        const crackLine = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.3, 0.003), new THREE.MeshStandardMaterial({ color: '#0d0d0d' }));
        crackLine.position.set(0.02, -0.08, frontZ + 0.011);
        crackLine.rotation.z = 0.5;
        g.add(crackLine);
      }
    }
    for (const batch of [strings, frets, pegs, knobs, bits]) batch.into(s.root);

    // ---- the foot of the wall ----
    const fz = 0.2;
    if (a.foot === 'amp') {
      const ax = (random() - 0.5) * (W - 0.7);
      s.box([0.46, 0.42, 0.24], [ax, 0.31, fz], s.material('#1a1a1c', { roughness: 0.9 }));
      s.box([0.4, 0.27, 0.01], [ax, 0.265, fz + 0.121], s.material(pick(random, ['#b9a57b', '#8d8f92', '#4a3a2a']), { roughness: 1 }));
      s.box([0.4, 0.06, 0.012], [ax, 0.46, fz + 0.121], steel);
      for (let i = 0; i < 5; i++) s.cylinder(0.012, 0.012, 0.02, [ax - 0.14 + i * 0.07, 0.46, fz + 0.135], dark, 10).rotation.x = Math.PI / 2;
      s.box([0.02, 0.012, 0.012], [ax + 0.17, 0.475, fz + 0.13], new THREE.MeshStandardMaterial({ color: '#ff4a3a', emissive: '#ff2a1a', emissiveIntensity: 1.2 }));
      s.box([0.16, 0.02, 0.03], [ax, 0.535, fz], dark);
      s.ring(0.07, 0.012, [ax + 0.1, 0.535, fz], dark).rotation.x = Math.PI / 2;
    } else if (a.foot === 'cases') {
      const n = 2 + Math.floor(random() * 2);
      const coffin = new THREE.Shape();
      for (const [i, [x, y]] of ([[-0.2, 0], [0.2, 0], [0.21, 0.42], [0.09, 0.56], [0.08, 1.05], [-0.08, 1.05], [-0.09, 0.56], [-0.21, 0.42]] as XY[]).entries()) i ? coffin.lineTo(x, y) : coffin.moveTo(x, y);
      for (let i = 0; i < n; i++) {
        const mat = s.material(pick(random, ['#1b1b1e', '#3d2a1c', '#5a4632', '#22252b']), { roughness: 0.85 });
        const c = s.mesh(new THREE.ExtrudeGeometry(coffin, { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }), mat, [(i - (n - 1) / 2) * 0.5 + (random() - 0.5) * (W - n * 0.5 - 0.3), 0.1, 0.12]);
        c.rotation.x = -0.16 - random() * 0.05;
        c.rotation.z = (random() - 0.5) * 0.14;
        const latch = s.box([0.03, 0.05, 0.02], [c.position.x + 0.2, 0.42, 0.21], steel);
        latch.rotation.x = c.rotation.x;
      }
    } else if (a.foot === 'stool') {
      const sx = (random() - 0.5) * (W - 0.8);
      s.cylinder(0.17, 0.17, 0.06, [sx, 0.67, 0.42], s.material(pick(random, ['#8a1c1c', '#17171a', '#2f4a7a'])), 20);
      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * Math.PI * 2 + 0.6;
        s.rod([sx + Math.cos(t) * 0.12, 0.64, 0.42 + Math.sin(t) * 0.12], [sx + Math.cos(t) * 0.19, 0.1, 0.42 + Math.sin(t) * 0.19], 0.012, steel);
      }
      s.ring(0.165, 0.008, [sx, 0.3, 0.42], steel).rotation.x = Math.PI / 2;
    } else if (a.foot === 'pedals') {
      const cx = -W / 2 + 0.3;
      const crate = s.material(pick(random, ['#2a5fb0', '#b02a2a', '#2a2a2e']));
      s.box([0.36, 0.03, 0.3], [cx, 0.115, 0.3], crate);
      for (const dx of [-1, 1]) s.box([0.02, 0.26, 0.3], [cx + dx * 0.17, 0.23, 0.3], crate);
      for (const dz of [-1, 1]) for (let k = 0; k < 3; k++) s.box([0.36, 0.035, 0.02], [cx, 0.16 + k * 0.08, 0.3 + dz * 0.14], crate);
      for (let k = 0; k < 4; k++) s.ring(0.09 + random() * 0.03, 0.01, [cx + (random() - 0.5) * 0.08, 0.3 + k * 0.025, 0.3 + (random() - 0.5) * 0.06], dark).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.5;
      const n = Math.min(5, Math.floor((W - 0.8) / 0.17));
      for (let k = 0; k < n; k++) {
        const px = cx + 0.36 + k * 0.17;
        s.box([0.075, 0.04, 0.125], [px, 0.12, 0.34], s.material(pick(random, ['#f08a1c', '#2fae6b', '#e2c81f', '#c8262b', '#6d3fc0', '#3d8fe0', '#d8d8d2'])));
        s.cylinder(0.012, 0.012, 0.016, [px, 0.148, 0.37], steel, 10);
        s.cylinder(0.009, 0.009, 0.014, [px - 0.02, 0.147, 0.31], dark, 8);
        s.cylinder(0.009, 0.009, 0.014, [px + 0.02, 0.147, 0.31], dark, 8);
      }
    }

    const sway = mix(0.0, 0.12, mood.energy);
    const phases = swingers.map(() => random() * 6.28);
    const rest = swingers.map((p) => p.rotation.z);
    return s.finish({
      update: (_dt, time) => {
        swingers.forEach((p, i) => { p.rotation.z = rest[i] + Math.sin(time * 1.7 + phases[i]) * sway; });
      },
    });
  },
});
