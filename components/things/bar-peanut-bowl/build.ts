import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SNACKS = {
  shells: 'Roasted peanuts still in their pale papery shells.',
  nuts: 'Shelled salted peanuts, glossy and red-brown.',
  twists: 'Knotted pretzel twists, dark and salted.',
  mix: 'A bar mix of pretzel sticks, nuts and bright crackers.',
  peas: 'Green wasabi peas.',
  popcorn: 'Popcorn, pale yellow and fluffy.',
} as const;

interface Piece { at: THREE.Vector3; turn: THREE.Euler; size: number; colour?: string }

export default defineThing({
  questions: {
    snack: choice('What is in the bowl?', SNACKS),
    bowl: choice('What kind of bowl is it?', {
      wood: 'A turned dark wooden bowl.',
      steel: 'A dented stainless steel dish.',
      ramekin: 'A white fluted ceramic ramekin.',
      basket: 'A red plastic diner basket lined with checked paper.',
      glass: 'A cut-glass dish, a hotel bar nicety.',
    }),
    picked: score('How picked over is it?', ['Freshly heaped and untouched', 'A good dent taken out', 'Half gone', 'Down to the last few and crumbs']),
    mess: score('How much shell and crumb mess is on the bar around it?', ['None, the bar is wiped clean', 'A few strays', 'A scatter all around', 'A drift of debris covering the bar']),
    fidget: choice('What have idle hands done with the debris?', {
      nothing: 'Nothing: it lies where it fell.',
      row: 'Lined pieces up in a neat row, like a counting game.',
      heap: 'Swept it into one tidy little heap.',
      face: 'Arranged pieces into a smiley face.',
      tower: 'Balanced a small stack, a nervous tower.',
    }),
    beside: choice('What is next to the bowl?', {
      nothing: 'Nothing.',
      napkin: 'A crumpled paper napkin.',
      coaster: 'A beer mat with a wet ring on it.',
      picks: 'A shot glass of toothpicks.',
      second: 'A second, smaller bowl for the empty shells.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // One geometry per snack piece, in unit-ish size, instanced everywhere.
    const peanutShell = () => new THREE.LatheGeometry([[0, -1], [0.3, -0.92], [0.43, -0.6], [0.36, -0.12], [0.3, 0], [0.37, 0.14], [0.44, 0.6], [0.3, 0.92], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const pretzel = () => {
      const points = Array.from({ length: 40 }, (_u, i) => {
        const t = i / 39 * Math.PI * 2;
        // A three-lobed loop reads as a pretzel knot at this size.
        return new THREE.Vector3(Math.sin(t) * (0.62 + 0.36 * Math.cos(3 * t)), Math.sin(3 * t) * 0.07, -Math.cos(t) * (0.62 + 0.36 * Math.cos(3 * t)) * 0.85);
      });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 48, 0.13, 6, true);
    };
    const popped = () => {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.65 + (Math.abs(Math.sin(i * 7.31 + p.getX(i) * 5)) * 0.6); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      g.computeVertexNormals();
      return g;
    };
    const kinds: Record<keyof typeof SNACKS, { geometry: THREE.BufferGeometry; size: number; colours: string[]; rough: number; flat?: boolean }> = {
      shells: { geometry: peanutShell(), size: 0.019, colours: ['#d2a868', '#c79a58', '#dcb878'], rough: 0.95 },
      nuts: { geometry: new THREE.SphereGeometry(1, 10, 8).scale(0.55, 0.55, 1), size: 0.0085, colours: ['#b0703a', '#c08346', '#9c5a2c', '#d39a5a'], rough: 0.35 },
      twists: { geometry: pretzel(), size: 0.021, colours: ['#8a4f22', '#9a5c28', '#7a431c'], rough: 0.5 },
      mix: { geometry: new THREE.CylinderGeometry(0.16, 0.16, 2, 6), size: 0.017, colours: ['#9a5c28', '#8a4f22', '#e8a13a', '#c08346', '#d8472e'], rough: 0.6 },
      peas: { geometry: new THREE.SphereGeometry(1, 10, 8), size: 0.0062, colours: ['#8fb53a', '#a3c44a', '#7ba02e', '#b9cf6a'], rough: 0.8 },
      popcorn: { geometry: popped(), size: 0.012, colours: ['#f6ecc2', '#fbf3d6', '#f0dc98', '#fff8e0'], rough: 0.9, flat: true },
    };
    const kind = kinds[a.snack];
    const debris = a.snack === 'shells'
      ? { geometry: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.42, 0.42, 0.95), size: 0.019, colours: ['#d2a868', '#c09050', '#dcb878', '#a87a44'], rough: 0.95, flat: false }
      : a.snack === 'twists' || a.snack === 'mix'
        ? { geometry: new THREE.CylinderGeometry(0.2, 0.2, 1, 5), size: 0.008, colours: kind.colours, rough: 0.6, flat: false }
        : { ...kind, size: kind.size * (a.snack === 'popcorn' ? 0.6 : 1), flat: !!kind.flat };

    const lay = (spec: { geometry: THREE.BufferGeometry; size: number; colours: string[]; rough: number; flat?: boolean }, pieces: Piece[]) => {
      if (!pieces.length) return;
      const mesh = new THREE.InstancedMesh(spec.geometry, new THREE.MeshStandardMaterial({ roughness: spec.rough, flatShading: !!spec.flat, side: THREE.DoubleSide }), pieces.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), colour = new THREE.Color();
      pieces.forEach((piece, i) => {
        m.compose(piece.at, q.setFromEuler(piece.turn), sc.setScalar(spec.size * piece.size));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, colour.set(piece.colour ?? spec.colours[Math.floor(random() * spec.colours.length)]).lerp(new THREE.Color('#6d5d48'), mood.wear * 0.2));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const tumble = (flatness = 0) => new THREE.Euler((random() - 0.5) * Math.PI * (1 - flatness), random() * Math.PI * 2, (random() - 0.5) * Math.PI * (1 - flatness) + (a.snack === 'mix' || a.snack === 'shells' ? Math.PI / 2 : 0));

    // The bowl.
    let rim = 0.085, lip = 0.05, floor = 0.012, inner = 0.05;
    const side = THREE.DoubleSide;
    if (a.bowl === 'wood') {
      s.lathe([[0, 0], [0.04, 0], [0.045, 0.006], [0.075, 0.03], [0.088, 0.055], [0.084, 0.057], [0.07, 0.034], [0.04, 0.014], [0, 0.012]], s.material('#6a4228', { roughness: 0.5, side }));
      rim = 0.084; lip = 0.056;
    } else if (a.bowl === 'steel') {
      s.lathe([[0, 0], [0.035, 0], [0.07, 0.022], [0.092, 0.045], [0.096, 0.046], [0.09, 0.043], [0.068, 0.024], [0.034, 0.005], [0, 0.005]], new THREE.MeshStandardMaterial({ color: '#c6cccf', metalness: 0.9, roughness: 0.28 + mood.wear * 0.3, side }));
      rim = 0.09; lip = 0.045; floor = 0.006; inner = 0.045;
    } else if (a.bowl === 'ramekin') {
      const white = s.material('#f3f0e8', { roughness: 0.25, side });
      s.lathe([[0, 0], [0.058, 0], [0.062, 0.004], [0.066, 0.05], [0.07, 0.054], [0.062, 0.052], [0.058, 0.01], [0, 0.008]], white);
      for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; s.rod([Math.cos(t) * 0.063, 0.006, Math.sin(t) * 0.063], [Math.cos(t) * 0.067, 0.046, Math.sin(t) * 0.067], 0.004, white); }
      rim = 0.062; lip = 0.052; floor = 0.009; inner = 0.056;
    } else if (a.bowl === 'glass') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e2f0f3', transparent: true, opacity: 0.4, roughness: 0.05, side });
      s.lathe([[0, 0], [0.04, 0], [0.044, 0.008], [0.078, 0.036], [0.086, 0.058], [0.08, 0.056], [0.04, 0.014], [0, 0.012]], glass);
      const bright = new THREE.MeshStandardMaterial({ color: '#f4fcff', transparent: true, opacity: 0.75, roughness: 0.05 });
      s.ring(0.085, 0.0022, [0, 0.058, 0], bright).rotation.x = Math.PI / 2;
      for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; s.rod([Math.cos(t) * 0.045, 0.009, Math.sin(t) * 0.045], [Math.cos(t + 0.3) * 0.084, 0.054, Math.sin(t + 0.3) * 0.084], 0.0016, bright); }
      rim = 0.08; lip = 0.056;
    } else {
      const plastic = s.material(mood.cheer > 0.3 ? '#c9302a' : '#7a3a34', { roughness: 0.45, side });
      const oval = s.lathe([[0, 0], [0.06, 0], [0.064, 0.004], [0.092, 0.042], [0.097, 0.044], [0.09, 0.04], [0.06, 0.005], [0, 0.004]], plastic);
      oval.scale.set(1.3, 1, 0.95);
      for (let i = 0; i < 26; i++) { const t = i / 26 * Math.PI * 2; s.rod([Math.cos(t) * 0.064 * 1.3, 0.006, Math.sin(t) * 0.064 * 0.95], [Math.cos(t) * 0.093 * 1.3, 0.042, Math.sin(t) * 0.093 * 0.95], 0.0035, plastic); }
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, 128, 128);
      c.fillStyle = mood.cheer > 0.3 ? 'rgba(200,50,45,0.75)' : 'rgba(60,70,80,0.6)';
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if ((x + y) % 2 === 0) c.fillRect(x * 16, y * 16, 16, 16);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const paper = new THREE.MeshStandardMaterial({ map, roughness: 1, side });
      const liner = s.lathe([[0, 0.0055], [0.058, 0.0065], [0.086, 0.04], [0.1, 0.05]], paper);
      liner.scale.set(1.3, 1, 0.95);
      for (let i = 0; i < 4; i++) { const corner = s.mesh(new THREE.PlaneGeometry(0.07, 0.07), paper, [Math.cos(i * 1.57 + 0.6) * 0.115, 0.05, Math.sin(i * 1.57 + 0.6) * 0.085]); corner.rotation.set(-Math.PI / 2 + 0.5 * Math.sin(i * 1.57 + 0.6), i, 0.4 * Math.cos(i * 1.57 + 0.6)); }
      rim = 0.082; lip = 0.042; floor = 0.007; inner = 0.058;
    }

    // The heap: a dome that sinks as the bowl is picked over.
    const level = 1 - a.picked;
    const crown = mix(floor + 0.004, lip + 0.03, level);
    const edge = mix(floor + 0.002, lip - 0.004, level);
    const spread = mix(inner * 0.75, rim * 0.92, level);
    const volume = mix(0.08, 1, level ** 1.4);
    const perLitre = { shells: 110, nuts: 420, twists: 100, mix: 230, peas: 520, popcorn: 220 }[a.snack];
    const count = Math.max(a.snack === 'peas' || a.snack === 'nuts' ? 7 : 3, Math.round(perLitre * volume));
    const heap: Piece[] = [];
    const stretch = a.bowl === 'basket' ? 1.25 : 1;
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(random()) * spread, t = random() * Math.PI * 2;
      const dome = mix(edge, crown, 1 - (r / Math.max(spread, 0.001)) ** 2);
      const depth = random() ** 2.2;
      const y = mix(dome, Math.max(floor + 0.003, dome - 0.02), depth);
      heap.push({ at: new THREE.Vector3(Math.cos(t) * r * stretch, y, Math.sin(t) * r), turn: tumble(0.35), size: mix(0.8, 1.2, random()) });
    }
    lay(kind, heap);
    // A darker bed under the heap so the pile reads solid from above.
    const bed = s.cylinder(spread * 0.96, spread * 0.8, Math.max(0.002, edge - floor), [0, floor + Math.max(0.002, edge - floor) / 2, 0], new THREE.MeshStandardMaterial({ color: new THREE.Color(kind.colours[0]).multiplyScalar(0.62), roughness: 1 }), 24);
    bed.scale.x = stretch; bed.castShadow = false;
    // Salt and crumbs left in an emptying bowl.
    if (a.picked > 0.55) {
      const crumbs = Array.from({ length: 40 }, () => { const r = Math.sqrt(random()) * inner * 0.9, t = random() * 6.28; return { at: [Math.cos(t) * r * stretch, floor + 0.002, Math.sin(t) * r] as const, size: mix(0.0008, 0.002, random()) }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#f1e9d2', roughness: 1 }), crumbs);
    }

    // Debris on the bar.
    const reach = rim * stretch + 0.02;
    const loose: Piece[] = [];
    const strays = Math.round(a.mess ** 1.3 * mix(30, 75, mood.density));
    const fidgeted = a.fidget === 'nothing' ? 0 : a.fidget === 'row' ? 7 : a.fidget === 'heap' ? 16 : a.fidget === 'face' ? 11 : 5;
    for (let i = 0; i < strays; i++) {
      const t = random() * Math.PI * 2, r = reach + (random() ** 1.6) * mix(0.04, 0.095, a.mess);
      const z = Math.sin(t) * r * 0.9;
      // Keep the patch in front clear when something has been arranged there.
      if (fidgeted && z > reach * 0.7 && Math.abs(Math.cos(t) * r) < 0.11) continue;
      loose.push({ at: new THREE.Vector3(Math.cos(t) * r, debris.size * 0.3, z), turn: new THREE.Euler(random() < 0.5 ? 0 : Math.PI, random() * 6.28, (random() - 0.5) * 0.5), size: mix(0.6, 1.1, random()) });
    }
    const whole: Piece[] = [];
    const frontZ = reach + 0.05;
    const flat = (x: number, z: number, yaw: number, lift = 0): Piece => ({ at: new THREE.Vector3(x, kind.size * (a.snack === 'shells' ? 0.44 : a.snack === 'twists' ? 0.2 : a.snack === 'mix' ? 0.17 : a.snack === 'nuts' ? 0.55 : 1) + lift, z), turn: new THREE.Euler(a.snack === 'shells' || a.snack === 'mix' ? Math.PI / 2 : 0, 0, yaw, 'YXZ'), size: 1 });
    if (a.fidget === 'row') for (let i = 0; i < fidgeted; i++) whole.push(flat((i - 3) * kind.size * (a.snack === 'twists' ? 1.9 : a.snack === 'shells' || a.snack === 'mix' ? 1.1 : 2.6), frontZ + (random() - 0.5) * 0.003, (random() - 0.5) * 0.15));
    else if (a.fidget === 'heap') for (let i = 0; i < fidgeted; i++) { const r = Math.sqrt(random()) * 0.03, t = random() * 6.28; loose.push({ at: new THREE.Vector3(-0.05 + Math.cos(t) * r, debris.size * 0.3 + (0.03 - r) * 0.5, frontZ + Math.sin(t) * r), turn: tumble(0.2), size: 1 }); }
    else if (a.fidget === 'face') {
      for (const x of [-0.022, 0.022]) whole.push(flat(x, frontZ - 0.012, Math.PI / 2));
      for (let i = 0; i < 9; i++) { const t = mix(0.35, Math.PI - 0.35, i / 8); loose.push({ at: new THREE.Vector3(Math.cos(t) * 0.045, debris.size * 0.3, frontZ + 0.005 + Math.sin(t) * 0.032), turn: new THREE.Euler(0, -t, 0), size: 0.8 }); }
    } else if (a.fidget === 'tower') for (let i = 0; i < fidgeted; i++) whole.push(flat(0.04 + (random() - 0.5) * 0.004, frontZ, i * 1.4, i * kind.size * (a.snack === 'shells' ? 0.82 : a.snack === 'twists' ? 0.3 : a.snack === 'mix' ? 0.3 : a.snack === 'nuts' ? 1 : 1.7)));
    lay(debris, loose);
    lay(kind, whole);

    // Company.
    const bx = -(reach + 0.065), bz = -0.02;
    if (a.beside === 'napkin') {
      const g = new THREE.IcosahedronGeometry(0.032, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.7 + Math.abs(Math.sin(i * 3.7 + p.getY(i) * 90)) * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); }
      g.computeVertexNormals();
      s.mesh(g, new THREE.MeshStandardMaterial({ color: '#f5f2e8', roughness: 1, flatShading: true }), [bx, 0.014, bz]).rotation.y = random() * 6;
    } else if (a.beside === 'coaster') {
      const mat = s.box([0.093, 0.003, 0.093], [bx - 0.01, 0.0015, bz], s.material('#ece3cc', { roughness: 1 }));
      mat.rotation.y = random();
      s.ring(0.032, 0.003, [bx - 0.01, 0.0032, bz], s.material(mood.cheer > 0.5 ? '#c8463c' : '#2f5a48')).rotation.x = Math.PI / 2;
      s.ring(0.036, 0.0015, [bx - 0.004, 0.0034, bz + 0.006], new THREE.MeshStandardMaterial({ color: '#a89878', roughness: 0.2 })).rotation.x = Math.PI / 2;
    } else if (a.beside === 'picks') {
      s.lathe([[0, 0], [0.019, 0], [0.024, 0.06], [0.022, 0.06], [0.017, 0.008], [0, 0.008]], new THREE.MeshPhysicalMaterial({ color: '#e2f0f3', transparent: true, opacity: 0.4, roughness: 0.05, side }), [bx, 0, bz]);
      const stick = s.material('#dcc391');
      for (let i = 0; i < 16; i++) { const t = random() * 6.28, r = random() * 0.013; s.rod([bx + Math.cos(t) * r * 0.6, 0.009, bz + Math.sin(t) * r * 0.6], [bx + Math.cos(t) * r * 1.5, 0.072 + random() * 0.006, bz + Math.sin(t) * r * 1.5], 0.0009, stick); }
    } else if (a.beside === 'second') {
      s.lathe([[0, 0], [0.028, 0], [0.05, 0.03], [0.047, 0.03], [0.027, 0.006], [0, 0.006]], s.material('#3a3d42', { roughness: 0.5, side }), [bx, 0, bz]);
      const husks: Piece[] = Array.from({ length: 16 }, () => { const r = Math.sqrt(random()) * 0.035, t = random() * 6.28; return { at: new THREE.Vector3(bx + Math.cos(t) * r, 0.014 + random() * 0.018, bz + Math.sin(t) * r), turn: tumble(), size: mix(0.7, 1, random()) }; });
      lay(debris, husks);
    }

    return s.finish();
  },
});
