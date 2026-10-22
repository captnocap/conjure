import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Point = [number, number, number];
const CHARMS = ['tooth', 'bat', 'eye', 'ghost', 'moon', 'hand', 'key'] as const;
type Charm = (typeof CHARMS)[number];

export default defineThing({
  questions: {
    charms: choice('What hangs from the threads?', {
      teeth: 'Milk teeth, roots and all, each on its own thread.',
      bats: 'Tiny black bats with scalloped wings.',
      eyeballs: 'Glass eyeballs trailing red nerve.',
      ghosts: 'Little white sheet ghosts.',
      hands: 'Small skeleton hands, fingers down.',
      keepsakes: 'A mixture of keepsakes: a tooth, a key, a moon, a bat, an eye, a bony hand.',
    }),
    arms: choice('What are the arms of the mobile made of?', {
      wire: 'Thin drooping wire cross-arms.',
      twig: 'Crooked twigs lashed together.',
      bone: 'Long bones tied in a cross with twine.',
      carousel: 'A striped music-box carousel canopy with a scalloped edge.',
    }),
    strands: choice('How many strands remain?', {
      all: 'All of them, evenly spaced.',
      most: 'Most: a couple of threads have snapped and hang empty.',
      few: 'Only three or four, the rest are bare broken threads.',
    }),
    playing: noul('Is the music box playing by itself?'),
    centre: choice('What hangs at the very centre, lowest of all?', {
      locket: 'A gold locket hanging open.',
      key: 'An old iron key.',
      hair: 'A lock of fine hair tied with ribbon.',
      moon: 'A softly glowing crescent moon.',
      shoe: 'A single tiny baby shoe.',
    }),
    mount: choice('How is it held up?', {
      clamp: 'On a swan-neck arm clamped to a length of cot rail.',
      stand: 'On a tall spindly floor stand.',
      'cot-end': 'On an arm rising from the iron end of a cot.',
    }),
    finish: choice('How is the frame finished?', {
      white: 'Chipped white nursery enamel.',
      brass: 'Tarnished brass.',
      black: 'Black iron.',
      pastel: 'Faded pastel mint and pink.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const ball = new THREE.SphereGeometry(1, 14, 10);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: Point = [0, 0, 0], size: Point = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (parent: THREE.Object3D, from: Point, to: Point, r0: number, r1: number, material: THREE.Material) => {
      const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), along = end.clone().sub(start);
      const mesh = add(parent, new THREE.CylinderGeometry(r1, r0, Math.max(along.length(), 0.0005), 8), material, start.clone().add(end).multiplyScalar(0.5).toArray() as Point);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
      return mesh;
    };
    const tube = (parent: THREE.Object3D, points: Point[], radius: number, material: THREE.Material) =>
      add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 8, radius, 8), material);

    const paint = {
      white: s.material('#ebe7da', { roughness: 0.45 }),
      brass: s.material('#b08d44', { metalness: 0.8, roughness: 0.4 }),
      black: s.material('#1e1d21', { metalness: 0.5, roughness: 0.5 }),
      pastel: s.material('#a9cdbb', { roughness: 0.5 }),
    }[a.finish];
    const accent = a.finish === 'pastel' ? s.material('#e3a9b6', { roughness: 0.5 }) : a.finish === 'black' ? s.material('#6a1d22', { roughness: 0.5 }) : s.material('#b9954a', { metalness: 0.8, roughness: 0.35 });
    const boneColour = new THREE.Color('#efe6cc').lerp(new THREE.Color('#b7a985'), wear * 0.5);
    const bone = new THREE.MeshStandardMaterial({ color: boneColour, roughness: 0.55 });
    const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f6f1e2').lerp(new THREE.Color('#d2c59a'), wear * 0.6), roughness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: '#131114', roughness: 0.75 });
    const thread = new THREE.MeshStandardMaterial({ color: a.finish === 'black' ? '#8a1f24' : '#4c4640', roughness: 1 });
    const gore = new THREE.MeshStandardMaterial({ color: '#8c1f24', roughness: 0.5 });
    const sheet = new THREE.MeshStandardMaterial({ color: '#f1f3f4', roughness: 0.9, emissive: '#93a7c2', emissiveIntensity: 0.3, side: THREE.DoubleSide });
    const moonGlow = new THREE.MeshStandardMaterial({ color: '#f0d67a', roughness: 0.5, emissive: '#e0b040', emissiveIntensity: mix(0.25, 0.9, mood.energy) });
    const iron = s.material('#3a383b', { metalness: 0.7, roughness: 0.5 });

    // ---- charms ---------------------------------------------------------------------------
    const wing = new THREE.Shape();
    ([[0, 0.004], [0.04, 0.016], [0.036, -0.004], [0.027, 0.001], [0.021, -0.01], [0.012, -0.003], [0.005, -0.012], [0, -0.008]] as const).forEach(([x, y], k) => (k ? wing.lineTo(x, y) : wing.moveTo(x, y)));
    const wingGeometry = new THREE.ShapeGeometry(wing);
    const crescent = (r: number) => {
      const shape = new THREE.Shape();
      for (let k = 0; k <= 20; k++) { const t = THREE.MathUtils.degToRad(mix(50, 310, k / 20)); if (k) shape.lineTo(Math.cos(t) * r, Math.sin(t) * r); else shape.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      for (let k = 0; k <= 16; k++) { const t = THREE.MathUtils.degToRad(mix(286.2, 73.8, k / 16)); shape.lineTo(0.42 * r + Math.cos(t) * 0.798 * r, Math.sin(t) * 0.798 * r); }
      return new THREE.ExtrudeGeometry(shape, { depth: r * 0.28, bevelEnabled: false });
    };
    const ghostGeometry = (() => {
      const geometry = new THREE.LatheGeometry([[0.0005, 0.05], [0.009, 0.047], [0.013, 0.038], [0.013, 0.03], [0.016, 0.018], [0.022, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 16);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) { const y = position.getY(i), fold = 1 + Math.sin(Math.atan2(position.getZ(i), position.getX(i)) * 6) * 0.16 * Math.max(0, (0.03 - y) / 0.03); position.setX(i, position.getX(i) * fold); position.setZ(i, position.getZ(i) * fold); }
      geometry.computeVertexNormals();
      return geometry;
    })();
    /** Each charm hangs below its own origin, which is where the thread is tied. */
    const charm = (kind: Charm, big = 1) => {
      const g = new THREE.Group();
      const k = 2.3 * big;
      if (kind === 'tooth') {
        add(g, ball, enamel, [0, -0.012 * k, 0], [0.011 * k, 0.0095 * k, 0.0095 * k]);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, ball, enamel, [x * 0.005 * k, -0.005 * k, z * 0.004 * k], [0.0052 * k, 0.005 * k, 0.005 * k]);
        for (const x of [-1, 1]) {
          const root = add(g, new THREE.ConeGeometry(0.0052 * k, 0.02 * k, 8), enamel, [x * 0.0055 * k, -0.028 * k, 0]);
          root.rotation.z = Math.PI + x * 0.22;
          if (mood.cheer < 0.45) add(g, ball, gore, [x * 0.0075 * k, -0.036 * k, 0], [0.003 * k, 0.004 * k, 0.003 * k]);
        }
      }
      if (kind === 'bat') {
        add(g, ball, dark, [0, -0.016 * k, 0], [0.007 * k, 0.011 * k, 0.007 * k]);
        add(g, ball, dark, [0, -0.004 * k, 0], [0.006 * k, 0.006 * k, 0.006 * k]);
        for (const x of [-1, 1]) {
          add(g, new THREE.ConeGeometry(0.0025 * k, 0.008 * k, 5), dark, [x * 0.004 * k, 0.003 * k, 0]);
          const flap = add(g, wingGeometry, new THREE.MeshStandardMaterial({ color: '#1c181d', roughness: 0.8, side: THREE.DoubleSide }), [x * 0.005 * k, -0.012 * k, 0], [x * k, k, k]);
          flap.rotation.y = -x * mix(0.1, 0.6, random());
          add(g, ball, new THREE.MeshStandardMaterial({ color: '#d32222', emissive: '#a01010', emissiveIntensity: 1.2 }), [x * 0.0025 * k, -0.003 * k, 0.0052 * k], [0.0013 * k, 0.0013 * k, 0.0013 * k]);
        }
      }
      if (kind === 'eye') {
        add(g, ball, new THREE.MeshStandardMaterial({ color: '#f3f0e6', roughness: 0.15 }), [0, -0.02 * k, 0], [0.012 * k, 0.012 * k, 0.012 * k]);
        add(g, ball, new THREE.MeshStandardMaterial({ color: ['#3f6fa8', '#5a3a1e', '#6c8a6a'][Math.floor(random() * 3)], roughness: 0.1 }), [0, -0.02 * k, 0.0072 * k], [0.0068 * k, 0.0068 * k, 0.0055 * k]);
        add(g, ball, dark, [0, -0.02 * k, 0.0112 * k], [0.0032 * k, 0.0032 * k, 0.002 * k]);
        tube(g, [[0, 0, 0], [0.002 * k, -0.004 * k, -0.002 * k], [0, -0.009 * k, -0.003 * k]], 0.0022 * k, gore);
        g.rotation.x = mix(-0.4, 0.5, random());
      }
      if (kind === 'ghost') {
        const body = add(g, ghostGeometry, sheet, [0, -0.05 * k, 0], [k, k, k]);
        body.castShadow = true;
        for (const x of [-1, 1]) add(g, ball, dark, [x * 0.0048 * k, -0.011 * k, 0.0115 * k], [0.0022 * k, 0.0032 * k, 0.0015 * k]);
      }
      if (kind === 'moon') {
        const moon = add(g, crescent(0.016 * k), moonGlow, [-0.003 * k, -0.018 * k, -0.002 * k]);
        moon.rotation.z = 0.3;
      }
      if (kind === 'hand') {
        for (const x of [-1, 1]) rod(g, [x * 0.003 * k, 0, 0], [x * 0.004 * k, -0.012 * k, 0], 0.0018 * k, 0.0022 * k, bone);
        add(g, new THREE.BoxGeometry(0.014 * k, 0.012 * k, 0.004 * k), bone, [0, -0.018 * k, 0]);
        for (let f = 0; f < 4; f++) {
          const x = (f - 1.5) * 0.0038 * k, splay = (f - 1.5) * 0.06, len = [0.015, 0.018, 0.017, 0.013][f] * k;
          rod(g, [x, -0.024 * k, 0], [x + splay * len, -0.024 * k - len * 0.55, 0.001 * k], 0.0016 * k, 0.0014 * k, bone);
          rod(g, [x + splay * len, -0.024 * k - len * 0.58, 0.001 * k], [x + splay * len * 1.8, -0.024 * k - len, 0.003 * k], 0.0014 * k, 0.001 * k, bone);
        }
        rod(g, [-0.007 * k, -0.018 * k, 0], [-0.014 * k, -0.03 * k, 0.002 * k], 0.0016 * k, 0.0012 * k, bone);
      }
      if (kind === 'key') {
        add(g, new THREE.TorusGeometry(0.0065 * k, 0.0017 * k, 6, 14), iron, [0, -0.0065 * k, 0]);
        rod(g, [0, -0.013 * k, 0], [0, -0.042 * k, 0], 0.0016 * k, 0.0016 * k, iron);
        add(g, new THREE.BoxGeometry(0.007 * k, 0.004 * k, 0.002 * k), iron, [0.0045 * k, -0.039 * k, 0]);
        add(g, new THREE.BoxGeometry(0.005 * k, 0.003 * k, 0.002 * k), iron, [0.0035 * k, -0.033 * k, 0]);
      }
      return g;
    };

    // ---- the turning part -------------------------------------------------------------------
    const hub: Point = a.mount === 'stand' ? [0, 0.98, 0] : a.mount === 'cot-end' ? [0, 1.12, 0.24] : [0, 0.78, 0];
    const spinner = new THREE.Group();
    spinner.position.set(...hub);
    s.root.add(spinner);
    const armMaterial = a.arms === 'bone' ? bone : a.arms === 'twig' ? s.material('#4d3a2a', { roughness: 0.95 }) : paint;
    const hangs: { at: Point; drop: number }[] = [];
    const R = 0.21;
    if (a.arms === 'carousel') {
      const stripes = document.createElement('canvas');
      stripes.width = 256; stripes.height = 8;
      const ctx = stripes.getContext('2d')!;
      const pair = { white: ['#e9e4d6', '#b9453a'], brass: ['#e6dcc0', '#7c5a2a'], black: ['#1e1d21', '#7a1d22'], pastel: ['#a9cdbb', '#e3a9b6'] }[a.finish];
      for (let k = 0; k < 16; k++) { ctx.fillStyle = pair[k % 2]; ctx.fillRect(k * 16, 0, 16, 8); }
      const texture = new THREE.CanvasTexture(stripes);
      texture.colorSpace = THREE.SRGBColorSpace;
      const canopy = new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.5, 0.9, wear), side: THREE.DoubleSide });
      const C = 0.115;
      add(spinner, new THREE.ConeGeometry(C, 0.075, 32, 1, true), canopy, [0, -0.055, 0]);
      add(spinner, new THREE.CylinderGeometry(C, C, 0.02, 32, 1, true), canopy, [0, -0.102, 0]);
      for (let k = 0; k < 16; k++) { const angle = (k + 0.5) / 16 * 6.283; add(spinner, ball, accent, [Math.cos(angle) * C, -0.114, Math.sin(angle) * C], [0.012, 0.01, 0.005]).rotation.y = -angle + Math.PI / 2; }
      add(spinner, new THREE.TorusGeometry(R * 0.92, 0.004, 6, 48), paint, [0, -0.118, 0]).rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) { const angle = k / 8 * 6.283; rod(spinner, [Math.cos(angle) * C * 0.9, -0.1, Math.sin(angle) * C * 0.9], [Math.cos(angle) * R * 0.92, -0.118, Math.sin(angle) * R * 0.92], 0.003, 0.003, paint); }
      add(spinner, ball, accent, [0, -0.012, 0], [0.013, 0.016, 0.013]);
      for (let k = 0; k < 8; k++) { const angle = k / 8 * 6.283; hangs.push({ at: [Math.cos(angle) * R * 0.92, -0.118, Math.sin(angle) * R * 0.92], drop: mix(0.07, 0.17, random()) }); }
    } else {
      const crossings = a.arms === 'wire' ? 2 : 2;
      for (let c = 0; c < crossings; c++) {
        const angle = c * Math.PI / 2 + (a.arms === 'wire' ? 0 : (random() - 0.5) * 0.4), y = -0.075 - c * 0.012;
        const dir: Point = [Math.cos(angle), 0, Math.sin(angle)];
        if (a.arms === 'wire') {
          tube(spinner, [-1, -0.5, 0, 0.5, 1].map((t) => [dir[0] * R * t, y + 0.03 * (1 - t * t) - 0.01, dir[2] * R * t] as Point), 0.0028, armMaterial);
          for (const t of [-1, 1]) add(spinner, new THREE.TorusGeometry(0.006, 0.0018, 5, 10), armMaterial, [dir[0] * R * t, y - 0.016, dir[2] * R * t]);
        } else if (a.arms === 'bone') {
          rod(spinner, [-dir[0] * R, y, -dir[2] * R], [dir[0] * R, y, dir[2] * R], 0.0075, 0.0075, armMaterial);
          for (const t of [-1, 1]) for (const side of [-1, 1]) add(spinner, ball, armMaterial, [dir[0] * R * t - dir[2] * side * 0.007, y, dir[2] * R * t + dir[0] * side * 0.007], [0.0105, 0.0095, 0.0105]);
        } else {
          const bend = () => (random() - 0.5) * 0.03;
          tube(spinner, [-1, -0.6, -0.2, 0.3, 0.7, 1].map((t) => [dir[0] * R * t + bend(), y + bend(), dir[2] * R * t + bend()] as Point), 0.0055, armMaterial);
          for (let k = 0; k < 3; k++) { const t = mix(-0.8, 0.8, random()); rod(spinner, [dir[0] * R * t, y, dir[2] * R * t], [dir[0] * R * t + bend() * 2, y + mix(0.02, 0.05, random()), dir[2] * R * t + bend() * 2], 0.003, 0.0012, armMaterial); }
        }
        for (const t of [-1, 1]) hangs.push({ at: [dir[0] * R * t, y - 0.02, dir[2] * R * t], drop: mix(0.1, 0.2, random()) });
        for (const t of [-0.5, 0.5]) hangs.push({ at: [dir[0] * R * t, y - (a.arms === 'wire' ? -0.006 : 0.008), dir[2] * R * t], drop: mix(0.05, 0.11, random()) });
      }
      if (a.arms !== 'wire') for (let k = 0; k < 5; k++) add(spinner, new THREE.TorusGeometry(0.011, 0.0022, 5, 12), s.material('#a89268', { roughness: 1 }), [0, -0.081, 0]).rotation.set(random() * 3, random() * 3, random() * 3);
    }
    // Music box and its key.
    add(spinner, new THREE.CylinderGeometry(0.034, 0.038, 0.05, 20), paint, [0, -0.045, 0]);
    add(spinner, new THREE.CylinderGeometry(0.039, 0.039, 0.008, 20), accent, [0, -0.07, 0]);
    add(spinner, new THREE.CylinderGeometry(0.036, 0.036, 0.006, 20), accent, [0, -0.021, 0]);
    const windKey = new THREE.Group();
    windKey.position.set(0.038, -0.045, 0);
    spinner.add(windKey);
    rod(windKey, [0, 0, 0], [0.016, 0, 0], 0.003, 0.003, accent);
    for (const side of [-1, 1]) add(windKey, new THREE.TorusGeometry(0.008, 0.0024, 6, 12), accent, [0.02, side * 0.008, 0]).rotation.y = Math.PI / 2;
    rod(spinner, [0, -0.018, 0], [0, 0, 0], 0.0025, 0.0025, thread);

    const kinds: Charm[] = { teeth: ['tooth'], bats: ['bat'], eyeballs: ['eye'], ghosts: ['ghost'], hands: ['hand'], keepsakes: ['tooth', 'key', 'moon', 'bat', 'eye', 'hand', 'tooth', 'ghost'] }[a.charms] as Charm[];
    const keep = { all: hangs.length, most: hangs.length - 2, few: 3 + Math.floor(random() * 2) }[a.strands];
    const order = hangs.map((_h, k) => k).sort(() => random() - 0.5);
    const dangling: THREE.Group[] = [];
    hangs.forEach((hang, k) => {
      const swing = new THREE.Group();
      swing.position.set(...hang.at);
      spinner.add(swing);
      const kept = order.indexOf(k) < keep;
      const drop = kept ? hang.drop : mix(0.015, 0.05, random());
      rod(swing, [0, 0, 0], [0, -drop, 0], 0.0022, 0.0022, thread);
      if (kept) {
        const piece = charm(kinds[k % kinds.length]);
        piece.position.y = -drop;
        piece.rotation.y = random() * 6.283;
        swing.add(piece);
      } else swing.rotation.z = (random() - 0.5) * 0.5;
      dangling.push(swing);
    });
    // The centrepiece hangs lowest.
    const centre = new THREE.Group();
    centre.position.set(0, -0.074, 0);
    spinner.add(centre);
    const centreDrop = 0.25;
    rod(centre, [0, 0, 0], [0, -centreDrop, 0], 0.0016, 0.0016, thread);
    const prize = new THREE.Group();
    prize.position.y = -centreDrop;
    centre.add(prize);
    const gold = s.material('#c9a03c', { metalness: 0.85, roughness: 0.3 });
    if (a.centre === 'locket') {
      add(prize, new THREE.TorusGeometry(0.006, 0.0016, 5, 12), gold, [0, -0.005, 0]);
      add(prize, ball, gold, [0, -0.032, -0.002], [0.019, 0.023, 0.005]);
      add(prize, ball, new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6 }), [0, -0.032, 0.002], [0.014, 0.018, 0.003]);
      add(prize, ball, new THREE.MeshStandardMaterial({ color: '#e8cdb8', roughness: 0.6 }), [0, -0.03, 0.004], [0.007, 0.009, 0.002]);
      const door = add(prize, ball, gold, [0.03, -0.032, 0.012], [0.019, 0.023, 0.005]);
      door.rotation.y = -1.0;
    }
    if (a.centre === 'key') { const big = charm('key', 1.7); prize.add(big); }
    if (a.centre === 'moon') { const big = charm('moon', 2.1); prize.add(big); }
    if (a.centre === 'hair') {
      const lock = s.material(['#d9bc74', '#7a4a26', '#1e1a1a'][Math.floor(random() * 3)], { roughness: 0.9 });
      for (let strand = 0; strand < 3; strand++) {
        const points: Point[] = [];
        for (let k = 0; k <= 20; k++) { const t = k / 20; points.push([Math.cos(t * 9 + strand * 2) * 0.008 * (0.4 + t), -0.012 - t * 0.065, Math.sin(t * 9 + strand * 2) * 0.008 * (0.4 + t)]); }
        tube(prize, points, 0.004, lock);
      }
      const ribbon = new THREE.MeshStandardMaterial({ color: mood.cheer < 0.35 ? '#17151a' : '#9fb8d8', roughness: 0.5 });
      for (const side of [-1, 1]) add(prize, new THREE.TorusGeometry(0.009, 0.003, 6, 12), ribbon, [side * 0.01, -0.01, 0], [1, 0.6, 1]);
      add(prize, ball, ribbon, [0, -0.01, 0], [0.005, 0.005, 0.005]);
    }
    if (a.centre === 'shoe') {
      const leather = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1ece0').lerp(new THREE.Color('#9c917b'), wear * 0.6), roughness: 0.5 });
      const shoe = new THREE.Group();
      shoe.position.y = -0.03;
      shoe.rotation.x = 0.7;
      prize.add(shoe);
      add(shoe, ball, leather, [0, 0, 0.006], [0.016, 0.011, 0.03]);
      add(shoe, new THREE.CylinderGeometry(0.014, 0.015, 0.018, 12, 1, true), new THREE.MeshStandardMaterial({ color: leather.color, roughness: 0.5, side: THREE.DoubleSide }), [0, 0.014, -0.01]);
      add(shoe, new THREE.BoxGeometry(0.034, 0.004, 0.006), leather, [0, 0.016, 0.004]);
      add(shoe, ball, gold, [0.016, 0.016, 0.004], [0.003, 0.003, 0.003]);
      add(shoe, new THREE.BoxGeometry(0.03, 0.003, 0.058), new THREE.MeshStandardMaterial({ color: '#7a6248', roughness: 0.8 }), [0, -0.01, 0.006]);
    }

    // ---- the mount --------------------------------------------------------------------------
    const still = s.root;
    const swan = (from: Point) => {
      const tip: Point = [hub[0], hub[1] + 0.045, hub[2]];
      const rise = tip[1] + 0.07;
      tube(still, [from, [from[0], mix(from[1], rise, 0.6), from[2]], [mix(from[0], tip[0], 0.2), rise - 0.02, mix(from[2], tip[2], 0.2)], [mix(from[0], tip[0], 0.7), rise + 0.012, mix(from[2], tip[2], 0.7)], [tip[0], rise - 0.02, tip[2]], tip], 0.009, paint);
      add(still, new THREE.TorusGeometry(0.01, 0.003, 6, 12), accent, [tip[0], tip[1] - 0.008, tip[2]]);
      rod(still, [tip[0], tip[1] - 0.016, tip[2]], hub, 0.002, 0.002, thread);
    };
    if (a.mount === 'clamp') {
      const wood = s.material('#c9b48c', { roughness: 0.6 });
      add(still, new THREE.BoxGeometry(0.5, 0.036, 0.045), wood, [0, 0.018, -0.26]);
      for (const x of [-0.19, -0.065, 0.065, 0.19]) add(still, new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8), wood, [x, 0.0, -0.26]).visible = false;
      add(still, new THREE.BoxGeometry(0.07, 0.014, 0.075), paint, [0, 0.045, -0.26]);
      add(still, new THREE.BoxGeometry(0.07, 0.06, 0.012), paint, [0, 0.022, -0.295]);
      add(still, new THREE.BoxGeometry(0.07, 0.03, 0.012), paint, [0, 0.036, -0.225]);
      rod(still, [0, 0.022, -0.3], [0, 0.022, -0.335], 0.004, 0.004, accent);
      add(still, ball, accent, [0, 0.022, -0.34], [0.012, 0.012, 0.007]);
      swan([0, 0.05, -0.26]);
    }
    if (a.mount === 'stand') {
      for (let k = 0; k < 3; k++) {
        const angle = k / 3 * 6.283 + 0.5;
        tube(still, [[0, 0.16, -0.3], [Math.cos(angle) * 0.1, 0.08, -0.3 + Math.sin(angle) * 0.1], [Math.cos(angle) * 0.22, 0.012, -0.3 + Math.sin(angle) * 0.22]], 0.009, paint);
        add(still, ball, accent, [Math.cos(angle) * 0.225, 0.012, -0.3 + Math.sin(angle) * 0.225], [0.013, 0.012, 0.013]);
      }
      add(still, ball, accent, [0, 0.17, -0.3], [0.02, 0.024, 0.02]);
      add(still, ball, accent, [0, 0.6, -0.3], [0.018, 0.022, 0.018]);
      swan([0, 0.16, -0.3]);
    }
    if (a.mount === 'cot-end') {
      const ironwork = a.finish === 'brass' ? paint : s.material(a.finish === 'black' ? '#1e1d21' : '#d9d5c8', { metalness: 0.4, roughness: 0.5 });
      const half = 0.36, top = 0.86;
      for (const x of [-1, 1]) {
        rod(still, [x * half, 0.03, 0], [x * half, top, 0], 0.014, 0.014, ironwork);
        add(still, ball, accent, [x * half, top + 0.022, 0], [0.026, 0.026, 0.026]);
        add(still, new THREE.CylinderGeometry(0.024, 0.024, 0.014, 12), dark, [x * half, 0.024, 0]).rotation.z = Math.PI / 2;
      }
      tube(still, [[-half, top - 0.1, 0], [-half * 0.5, top - 0.02, 0], [0, top + 0.01, 0], [half * 0.5, top - 0.02, 0], [half, top - 0.1, 0]], 0.011, ironwork);
      rod(still, [-half, 0.34, 0], [half, 0.34, 0], 0.011, 0.011, ironwork);
      for (let k = -3; k <= 3; k++) { const x = k * half / 4; rod(still, [x, 0.34, 0], [x, top - 0.025 - Math.abs(k) * 0.016, 0], 0.006, 0.006, ironwork); }
      add(still, new THREE.BoxGeometry(half * 2, 0.07, 0.03), s.material('#c9c2ae', { roughness: 0.95 }), [0, 0.3, 0.005]);
      add(still, new THREE.BoxGeometry(0.05, 0.04, 0.04), paint, [0, top + 0.01, 0]);
      swan([0, top + 0.02, 0]);
    }

    // ---- notes --------------------------------------------------------------------------------
    const notes: THREE.Group[] = [];
    if (a.playing) {
      const ink = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2b2a33' : '#5a1616', roughness: 0.6 });
      for (let i = 0; i < 4; i++) {
        const note = new THREE.Group();
        const angle = random() * 6.283;
        note.position.set(hub[0] + Math.cos(angle) * mix(0.06, 0.13, random()), hub[1] + 0.02 + i * 0.03, hub[2] + Math.sin(angle) * mix(0.03, 0.1, random()));
        note.rotation.set(0, random() - 0.5, (random() - 0.5) * 0.6);
        add(note, ball, ink, [0, 0, 0], [0.012, 0.009, 0.009]).rotation.z = 0.4;
        rod(note, [0.01, 0, 0], [0.01, 0.044, 0], 0.0024, 0.0024, ink);
        rod(note, [0.01, 0.044, 0], [0.027, 0.03, 0], 0.0032, 0.0016, ink);
        still.add(note);
        notes.push(note);
      }
    }

    spinner.rotation.y = random() * 6.283;
    spinner.rotation.z = mix(0, 0.06, wear) * (random() < 0.5 ? -1 : 1);
    const speed = mix(0.04, 0.9, mood.energy) * (a.playing ? 1.6 : 1);
    const phases = dangling.map(() => random() * 6.283);
    const noteBase = notes.map((note) => note.position.y);
    return s.finish({
      update: (dt, time) => {
        spinner.rotation.y += dt * speed;
        dangling.forEach((swing, k) => { swing.rotation.x = Math.sin(time * 1.6 + phases[k]) * mix(0.02, 0.22, mood.energy); swing.rotation.z = Math.cos(time * 1.3 + phases[k]) * mix(0.02, 0.18, mood.energy); });
        centre.rotation.y -= dt * speed * 1.7;
        if (a.playing) windKey.rotation.x += dt * 2.4;
        notes.forEach((note, i) => { note.position.y = noteBase[i] + Math.sin(time * 2 + i * 1.7) * 0.01; });
      },
    });
  },
});
