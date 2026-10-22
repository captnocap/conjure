import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, visibleBounds } from '@conjure/kit';
import { type Bit, type StoneShape, type V3, buildHand, flexHand, grass, headstone, lettered, limb, many, mottled, paint, put, shade } from './grave';

const INSCRIPTIONS = {
  asleep: ['ASLEEP'],
  daybreak: ['UNTIL', 'THE DAY', 'BREAK'],
  home: ['GONE', 'HOME'],
  blink: ["DON'T", 'BLINK'],
  angel: ['OUR', 'ANGEL'],
  family: ['ASHDOWN', '1841 - 1903', 'AND HIS WIFE'],
  waits: ['SHE', 'WAITS'],
  worn: [''],
} as const;

export default defineThing({
  questions: {
    face: choice('What is the angel doing with its face?', {
      hidden: 'Hidden: bowed right over, face buried in its folded arms on top of the stone.',
      weeping: 'Weeping: head down, one hand over an eye, dark tear stains run down the cheeks.',
      worn: 'Worn away: the face is a blank weathered oval with no features left.',
      staring: 'Lifted and looking straight at you with blank carved eyes.',
      snarling: 'Snarling: head up, mouth open on fangs, a clawed hand reaching toward you.',
    }),
    wings: choice('What state are its wings in?', {
      half: 'Half open and drooping behind it, tips near the ground.',
      spread: 'Raised and spread wide.',
      folded: 'Folded tight against its back.',
      broken: 'One whole, the other snapped off to a stump, the piece lying in the grass.',
      stumps: 'Both broken off long ago: only two jagged stumps.',
    }),
    holds: choice('What does it hold in its other hand?', {
      nothing: 'Nothing.',
      wreath: 'A carved laurel wreath, hung against the corner of the stone.',
      trumpet: 'A long trumpet, lowered and silent.',
      child: 'A small stone child stands at its side under its hand.',
    }),
    stone: choice('What is the monument carved from?', {
      marble: 'White marble gone grey in the creases.',
      granite: 'Speckled grey granite.',
      sandstone: 'Soft honey sandstone, edges rounding off.',
      bronze: 'Bronze turned green with verdigris.',
      basalt: 'Dark, nearly black stone.',
    }),
    marker: choice('What shape is the headstone it leans on?', {
      round: 'A round-topped slab.',
      shoulder: 'A round head on square shoulders.',
      gothic: 'A pointed gothic arch.',
      slab: 'A blunt square block.',
    }),
    inscription: choice('What is carved on the headstone?', {
      asleep: 'ASLEEP',
      daybreak: 'UNTIL THE DAY BREAK',
      home: 'GONE HOME',
      blink: "DON'T BLINK",
      angel: 'OUR ANGEL',
      family: 'A family name and dates.',
      waits: 'SHE WAITS',
      worn: 'Nothing legible: worn smooth.',
    }),
    offerings: choice('What has been left at the base?', {
      nothing: 'Nothing: nobody comes.',
      flowers: 'Bunches of cut flowers and a jar.',
      candles: 'Votive candles in red glasses, burning.',
      pebbles: 'Rows of small pebbles and a few coins.',
      toy: 'A rain-soaked teddy bear.',
      lantern: 'A small storm lantern, lit.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const outer = new THREE.Group();
    const root = new THREE.Group();
    outer.add(root);
    const wear = mood.wear;
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    const ball = (w = 14, h = 10) => new THREE.SphereGeometry(1, w, h);

    // Stone.
    const raw = { marble: '#e2e0d8', granite: '#8f9498', sandstone: '#c4a77a', bronze: '#4a8a78', basalt: '#484b52' }[a.stone];
    const tone = shade(shade(raw, mood.warmth > 0.5 ? '#c9a878' : '#8fa2c0', Math.abs(mood.warmth - 0.5) * 0.3), '#5b5f4c', wear * 0.3);
    const lichen = [
      { color: a.stone === 'bronze' ? '#6b4a2a' : '#2c2e2c', count: 26, size: 0.012, alpha: 0.35 },
      { color: a.stone === 'bronze' ? '#8fd0b4' : '#4a5a34', count: Math.round(6 + wear * 60), size: 0.035, alpha: 0.3 },
      { color: '#c9b458', count: Math.round(wear * 30), size: 0.022, alpha: 0.45 },
      { color: '#d8d6c4', count: Math.round(wear * 20), size: 0.02, alpha: 0.4 },
      { color: '#1e201e', count: Math.round(3 + wear * 12), size: 0.015, alpha: 0.35, line: true },
    ];
    const stone = paint('#ffffff', { roughness: a.stone === 'bronze' ? 0.55 : 0.95, metalness: a.stone === 'bronze' ? 0.45 : 0, map: mottled(random, tone, lichen, 256) });
    const crease = paint(shade(tone, '#141614', 0.72), { roughness: 1 });
    const pale = paint(shade(tone, '#ffffff', 0.3), { roughness: 0.8 });

    // Ground and stepped plinth.
    const greens = mood.cheer > 0.5 ? ['#5f8f3c', '#7aa648', '#4c7a34'] : ['#566b3a', '#6d7343', '#4a5a36'];
    put(root, new THREE.CylinderGeometry(1.12, 1.16, 0.05, 40), paint(shade(greens[0], '#6f6a3c', wear * 0.5), { roughness: 1 }), [0, -0.012, 0]);
    grass(root, random, Math.round(mix(160, 420, mood.density) * (0.6 + wear * 0.7)), 1.08, mix(0.06, 0.16, wear), greens, (x, z) => Math.abs(x) > 0.78 || Math.abs(z + 0.05) > 0.6, [0, 0.012, 0]);
    const Y0 = 0.3, T = 1.45, ZS = 0.18, ZA = -0.3;
    put(root, new THREE.BoxGeometry(1.5, 0.14, 1.15), stone, [0, 0.07, -0.05]);
    put(root, new THREE.BoxGeometry(1.3, 0.16, 0.95), stone, [0, 0.22, -0.05]);

    // The headstone it leans on.
    const lines = INSCRIPTIONS[a.inscription];
    const plate = a.inscription === 'worn' ? null : lettered(lines, { paper: hex(tone), ink: hex(shade(tone, a.stone === 'basalt' ? '#f0ead0' : '#000000', 0.7)), grime: wear, random, width: 256, height: 256 });
    const marker = headstone(root, a.marker as StoneShape, 0.64, T - Y0, 0.17, stone, plate);
    marker.position.set(0, Y0, ZS);

    // The figure. Built facing +z with the expressive arm on -x, then possibly mirrored.
    const figure = new THREE.Group();
    root.add(figure);
    const lean = { hidden: 0.75, weeping: 0.5, worn: 0.28, staring: 0.1, snarling: 0.42 }[a.face];
    const tilt = { hidden: 0.55, weeping: 0.4, worn: 0.25, staring: -0.12, snarling: -0.55 }[a.face];

    // Robe: a fluted bell from the plinth to the waist.
    const robeR = (v: number) => mix(0.31, 0.15, v ** 0.8);
    const robe = new THREE.CylinderGeometry(1, 1, 1, 44, 12, true);
    {
      const pos = robe.attributes.position;
      const k = random() * 6;
      for (let i = 0; i < pos.count; i++) {
        const v = pos.getY(i) + 0.5, ang = Math.atan2(pos.getZ(i), pos.getX(i));
        const r = robeR(v) * (1 + Math.sin(ang * 11 + k + v * 1.5) * 0.09 * (1 - v * 0.8));
        pos.setXYZ(i, Math.cos(ang) * r, v * 0.97, Math.sin(ang) * r * 0.82);
      }
      robe.computeVertexNormals();
    }
    put(figure, robe, stone, [0, Y0, ZA]);
    for (const x of [-1, 1]) put(figure, ball(10, 8), stone, [x * 0.09, Y0 + 0.03, ZA + 0.25], [0, 0, 0], [0.05, 0.035, 0.08]);

    const torso = new THREE.Group();
    torso.position.set(0, Y0 + 0.93, ZA);
    torso.rotation.x = lean;
    figure.add(torso);
    put(torso, ball(18, 12), stone, [0, 0.2, 0], [0, 0, 0], [0.17, 0.27, 0.125]);
    put(torso, new THREE.TorusGeometry(0.15, 0.022, 6, 24), stone, [0, 0.03, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1]);
    for (const x of [-1, 1]) put(torso, ball(12, 10), stone, [x * 0.185, 0.36, 0], [0, 0, 0], 0.078);
    put(torso, new THREE.CylinderGeometry(0.045, 0.055, 0.12, 12), stone, [0, 0.46, 0.005]);
    // Neckline folds.
    for (let i = 0; i < 3; i++) put(torso, new THREE.TorusGeometry(0.09 + i * 0.03, 0.012, 5, 20, Math.PI), stone, [0, 0.4 - i * 0.045, 0.085 - i * 0.004], [0.25, 0, Math.PI], [1, 0.7, 1]);

    // Head.
    const head = new THREE.Group();
    head.position.set(0, 0.5, 0.012);
    head.rotation.x = tilt;
    head.rotation.z = (random() - 0.5) * 0.2;
    torso.add(head);
    put(head, ball(20, 14), stone, [0, 0.1, 0], [0, 0, 0], [0.098, 0.118, 0.106]);
    put(head, ball(18, 12), stone, [0, 0.118, -0.022], [0, 0, 0], [0.108, 0.116, 0.108]);
    put(head, new THREE.TorusGeometry(0.1, 0.02, 6, 26), stone, [0, 0.145, -0.012], [Math.PI / 2 - 0.35, 0, 0]);
    put(head, ball(12, 10), stone, [0, 0.085, -0.115], [0, 0, 0], [0.055, 0.05, 0.05]);
    for (let i = 0; i < 9; i++) { const t = i / 8 * Math.PI; put(head, ball(8, 6), stone, [Math.cos(t) * 0.098, 0.15 + Math.sin(t) * 0.035, 0.03 + Math.sin(t) * 0.035], [0, 0, 0], 0.026); }
    if (a.face === 'worn') {
      put(head, ball(8, 6), stone, [0, 0.092, 0.1], [0, 0, 0], [0.014, 0.012, 0.01]);
      for (let i = 0; i < 6; i++) put(head, ball(6, 5), crease, [(random() - 0.5) * 0.11, 0.05 + random() * 0.1, 0.092 + random() * 0.006], [0, 0, 0], 0.004 + random() * 0.007);
    } else {
      put(head, new THREE.ConeGeometry(0.014, 0.05, 6), stone, [0, 0.098, 0.108], [-0.35, 0, 0], [1, 1, 1.3]);
      const open = a.face === 'staring' || a.face === 'snarling';
      for (const x of [-1, 1]) {
        if (open) {
          put(head, ball(10, 8), crease, [x * 0.037, 0.118, 0.089], [0, 0, 0], [0.021, 0.015, 0.01]);
          put(head, ball(10, 8), pale, [x * 0.037, 0.118, 0.093], [0, 0, 0], [0.015, 0.011, 0.009]);
          put(head, ball(8, 6), a.face === 'snarling' ? paint('#1a0a08', { emissive: '#ff3a1a', emissiveIntensity: mix(0.6, 2, mood.energy) }) : crease, [x * 0.037, 0.117, 0.1], [0, 0, 0], 0.0058);
        } else {
          put(head, ball(10, 8), stone, [x * 0.037, 0.118, 0.092], [0, 0, 0], [0.021, 0.011, 0.01]);
          put(head, new THREE.BoxGeometry(0.036, 0.004, 0.004), crease, [x * 0.037, 0.111, 0.1], [0, 0, x * -0.12]);
        }
        const brow = a.face === 'snarling' ? -0.5 : a.face === 'weeping' || a.face === 'hidden' ? 0.3 : 0;
        put(head, new THREE.BoxGeometry(0.042, 0.009, 0.012), stone, [x * 0.038, 0.138 + (a.face === 'snarling' ? -0.004 : 0), 0.094], [0, 0, x * brow]);
        if (a.face === 'weeping' || (a.face === 'staring' && wear > 0.6)) {
          put(head, new THREE.BoxGeometry(0.009, 0.075, 0.004), crease, [x * 0.04, 0.072, 0.094], [0.22, 0, x * 0.06]);
          put(head, new THREE.BoxGeometry(0.006, 0.04, 0.004), crease, [x * 0.05, 0.03, 0.078], [0.5, 0, x * 0.1]);
        }
      }
      if (a.face === 'snarling') {
        put(head, ball(12, 8), crease, [0, 0.046, 0.088], [0, 0, 0], [0.042, 0.034, 0.02]);
        for (const [x, y, l, flip] of [[-0.024, 0.066, 0.03, 1], [0.024, 0.066, 0.03, 1], [-0.009, 0.068, 0.016, 1], [0.009, 0.068, 0.016, 1], [-0.02, 0.022, 0.022, -1], [0.02, 0.022, 0.022, -1], [-0.007, 0.02, 0.012, -1], [0.007, 0.02, 0.012, -1]] as const)
          put(head, new THREE.ConeGeometry(0.006, l, 5), pale, [x, y - flip * l / 2, 0.104], [flip > 0 ? Math.PI : 0, 0, 0]);
      } else put(head, new THREE.BoxGeometry(0.04, 0.005, 0.004), crease, [0, 0.05, 0.097], [0, 0, 0]);
    }

    // Wings.
    const wingShape = (scale: number) => {
      const s = new THREE.Shape();
      const p = (x: number, y: number): [number, number] => [x * scale, y * scale];
      s.moveTo(...p(0, -0.12));
      s.quadraticCurveTo(...p(0.0, 0.3), ...p(0.2, 0.44));
      s.quadraticCurveTo(...p(0.44, 0.44), ...p(0.48, -0.15));
      s.quadraticCurveTo(...p(0.52, -0.65), ...p(0.4, -1.02));
      const N = 7;
      for (let i = 1; i <= N; i++) {
        const t0 = (i - 1) / N, t1 = i / N;
        const x0 = mix(0.4, 0.04, t0), y0 = mix(-1.02, -0.5, t0 ** 0.8), x1 = mix(0.4, 0.04, t1), y1 = mix(-1.02, -0.5, t1 ** 0.8);
        s.quadraticCurveTo(...p((x0 + x1) / 2 + 0.02, Math.min(y0, y1) - 0.1), ...p(x1, y1 - (i < N ? 0.05 : 0)));
      }
      s.closePath();
      return s;
    };
    const stumpShape = () => {
      const s = new THREE.Shape();
      s.moveTo(0, -0.12); s.quadraticCurveTo(0, 0.28, 0.17, 0.39);
      s.lineTo(0.25, 0.22); s.lineTo(0.18, 0.14); s.lineTo(0.27, 0.0); s.lineTo(0.15, -0.07); s.lineTo(0.17, -0.2); s.closePath();
      return s;
    };
    const wingMesh = (parent: THREE.Object3D, whole: boolean) => {
      if (!whole) {
        const g = new THREE.ExtrudeGeometry(stumpShape(), { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
        g.translate(0, 0, -0.035);
        put(parent, g, stone);
        return;
      }
      [[1, 0.035], [0.74, 0.07], [0.48, 0.1]].forEach(([scale, depth]) => {
        const g = new THREE.ExtrudeGeometry(wingShape(scale), { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 8 });
        g.translate(0, 0, -depth / 2);
        put(parent, g, stone);
      });
    };
    const wingPose = { half: [0.02, 0.6], spread: [0.62, 0.22], folded: [-0.14, 1.12], broken: [0.12, 0.5], stumps: [0.1, 0.5] }[a.wings];
    const brokenSide = random() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      const whole = a.wings === 'stumps' ? false : a.wings === 'broken' ? side !== brokenSide : true;
      const wing = new THREE.Group();
      wing.position.set(side * 0.07, 0.34, -0.115);
      wing.scale.set(side * 1.2, 1.2, 1.2);
      wing.rotation.order = 'YZX';
      wing.rotation.set(-lean * 0.75, side * wingPose[1], side * (wingPose[0] + (random() - 0.5) * 0.08));
      torso.add(wing);
      wingMesh(wing, whole);
    }
    if (a.wings === 'broken') {
      const piece = new THREE.Group();
      piece.position.set(brokenSide * 0.98, 0.07, 0.25 + random() * 0.2);
      piece.rotation.set(-Math.PI / 2 + 0.12, 0, brokenSide * (0.6 + random() * 0.6));
      piece.scale.setScalar(0.72);
      piece.scale.x *= brokenSide;
      root.add(piece);
      const holder = new THREE.Group();
      holder.position.set(-0.2, 0.3, 0);
      piece.add(holder);
      wingMesh(holder, true);
    }

    // Arms, placed in figure space from the leaning shoulders.
    torso.updateMatrixWorld(true);
    const shoulder = (x: number): V3 => torso.localToWorld(new THREE.Vector3(x * 0.195, 0.35, 0.01)).toArray() as [number, number, number];
    const hands: ReturnType<typeof buildHand>[] = [];
    const arm = (from: V3, elbow: V3, wrist: V3, curls: readonly number[], spread: number, roll: number, claw: boolean) => {
      limb(figure, from, elbow, 0.07, 0.058, stone, 12);
      put(figure, ball(10, 8), stone, elbow, [0, 0, 0], 0.06);
      const mid: V3 = [mix(elbow[0], wrist[0], 0.72), mix(elbow[1], wrist[1], 0.72), mix(elbow[2], wrist[2], 0.72)];
      limb(figure, elbow, mid, 0.056, 0.082, stone, 12);
      limb(figure, mid, wrist, 0.036, 0.03, stone, 10);
      const hand = buildHand({ curls, spread, flesh: stone, bone: stone, nail: claw ? pale : stone, bare: [false, false, false, false, false], skeleton: false, nailLength: claw ? 0.035 : 0, size: 1.15 });
      hand.group.position.set(...wrist);
      hand.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]).normalize());
      hand.group.rotateY(roll);
      figure.add(hand.group);
      hands.push(hand);
      return hand;
    };
    const rest = [0.3, 0.22, 0.28, 0.32, 0.38], clawed = [0.5, 0.75, 0.8, 0.8, 0.72];
    const sl = shoulder(-1), sr = shoulder(1);
    if (a.face === 'hidden') arm(sl, [-0.34, T + 0.05, ZS - 0.03], [0.08, T + 0.06, ZS + 0.02], rest, 0.15, Math.PI / 2, false);
    else if (a.face === 'weeping') arm(sl, [-0.3, T + 0.04, ZS - 0.05], [-0.075, 1.69, 0.03], [0.2, 0.3, 0.3, 0.3, 0.3], 0.2, Math.PI, false);
    else if (a.face === 'snarling') arm(sl, [-0.4, sl[1] + 0.12, 0.12], [-0.33, sl[1] + 0.3, 0.46], clawed, 0.7, 0, true);
    else arm(sl, [-0.37, mix(sl[1], T, 0.6), -0.02], [-0.2, T + 0.035, ZS - 0.02], rest, 0.25, 0, false);

    if (a.holds === 'wreath') {
      arm(sr, [0.37, 1.25, -0.05], [0.42, 1.04, 0.22], [0.5, 0.9, 0.9, 0.9, 0.9], 0, Math.PI, false);
      const wreath = new THREE.Group();
      wreath.position.set(0.42, 0.84, 0.3);
      wreath.rotation.set(-0.12, 0, random() * 0.3);
      figure.add(wreath);
      put(wreath, new THREE.TorusGeometry(0.17, 0.028, 6, 26), stone);
      const leaves: Bit[] = [];
      for (let i = 0; i < 34; i++) { const t = i / 34 * Math.PI * 2; leaves.push({ p: [Math.cos(t) * 0.17, Math.sin(t) * 0.17, (i % 2 ? 0.02 : -0.012)], r: [0, 0, t + (i % 2 ? 0.7 : 2.4)], s: [0.022, 0.055, 0.012] }); }
      many(wreath, ball(8, 6), stone, leaves);
      put(wreath, new THREE.BoxGeometry(0.03, 0.14, 0.01), stone, [-0.025, -0.24, 0.02], [0, 0, 0.25]);
      put(wreath, new THREE.BoxGeometry(0.03, 0.14, 0.01), stone, [0.025, -0.24, 0.02], [0, 0, -0.25]);
    } else if (a.holds === 'trumpet') {
      arm(sr, [0.38, 1.26, -0.08], [0.43, 1.06, 0.14], [0.5, 0.9, 0.9, 0.9, 0.9], 0, Math.PI, false);
      const top: V3 = [0.41, 1.2, 0.06], knee: V3 = [0.5, 0.62, 0.36], bell: V3 = [0.53, 0.42, 0.46];
      limb(figure, top, knee, 0.014, 0.02, stone, 10);
      limb(figure, knee, bell, 0.02, 0.105, new THREE.MeshStandardMaterial({ map: stone.map, roughness: stone.roughness, metalness: stone.metalness, side: THREE.DoubleSide }), 18);
      put(figure, ball(8, 6), stone, top, [0, 0, 0], 0.022);
      for (const t of [0.3, 0.55]) put(figure, ball(8, 6), stone, [mix(top[0], knee[0], t), mix(top[1], knee[1], t), mix(top[2], knee[2], t)], [0, 0, 0], 0.024);
    } else if (a.holds === 'child') {
      const cx = 0.5, cz = -0.02;
      arm(sr, [0.4, 1.24, -0.14], [cx - 0.01, 0.99, cz - 0.07], rest, 0.2, 0, false);
      const child = new THREE.Group();
      child.position.set(cx, Y0, cz);
      child.rotation.y = -0.35;
      figure.add(child);
      put(child, new THREE.CylinderGeometry(0.055, 0.13, 0.42, 14), stone, [0, 0.21, 0]);
      put(child, ball(12, 10), stone, [0, 0.4, 0], [0, 0, 0], [0.075, 0.06, 0.06]);
      put(child, ball(14, 10), stone, [0, 0.52, 0.005], [0, 0, 0], [0.078, 0.084, 0.08]);
      put(child, ball(12, 8), stone, [0, 0.54, -0.012], [0, 0, 0], [0.084, 0.078, 0.08]);
      for (const x of [-1, 1]) {
        put(child, ball(6, 5), crease, [x * 0.028, 0.53, 0.076], [0, 0, 0], [0.012, 0.005, 0.004]);
        limb(child, [x * 0.075, 0.4, 0], [x * 0.05, 0.28, 0.09], 0.028, 0.022, stone, 8);
      }
      put(child, ball(8, 6), stone, [0, 0.275, 0.1], [0, 0, 0], [0.06, 0.028, 0.03]);
    } else if (a.face === 'hidden') arm(sr, [0.34, T + 0.05, ZS - 0.02], [-0.04, T + 0.12, ZS + 0.04], rest, 0.15, -Math.PI / 2, false);
    else if (a.face === 'snarling') arm(sr, [0.42, sr[1] + 0.05, 0.1], [0.3, sr[1] + 0.16, 0.48], clawed, 0.7, 0, true);
    else arm(sr, [0.37, mix(sr[1], T, 0.6), -0.02], [0.22, T + 0.035, ZS - 0.02], rest, 0.25, 0, false);
    if (random() < 0.5) figure.scale.x = -1;

    // Ivy climbing with neglect.
    const vines = wear < 0.25 ? 0 : Math.round(mix(1, 5, (wear - 0.25) / 0.75) * mix(0.7, 1.3, mood.density));
    if (vines > 0) {
      const leafGreen = mood.cheer > 0.5 ? ['#3f7a34', '#55913e', '#2f6230'] : ['#34573a', '#42633a', '#2b4a34'];
      const vineMat = paint('#4a3c28', { roughness: 1 });
      const leaves: Bit[] = [];
      for (let v = 0; v < vines; v++) {
        const pts: THREE.Vector3[] = [];
        const onStone = v % 2 === 0;
        const reach = mix(0.45, 1.25, wear) * (0.7 + random() * 0.5);
        let x = (random() - 0.5) * 0.6, ang = Math.PI * (0.9 + random() * 1.2);
        for (let i = 0; i <= 9; i++) {
          const y = i / 9 * reach;
          x += (random() - 0.5) * 0.12; ang += (random() - 0.5) * 0.25;
          if (onStone) {
            const cx = Math.max(-0.28, Math.min(0.28, x));
            pts.push(y < Y0 ? new THREE.Vector3(cx, y, y < 0.14 ? 0.535 : 0.435) : new THREE.Vector3(cx, Math.min(y, T - 0.2), ZS + 0.108));
          } else {
            const vv = Math.max(0, Math.min(0.98, (y - Y0) / 0.97));
            pts.push(y < Y0 ? new THREE.Vector3(Math.cos(ang) * 0.5, y, ZA + Math.sin(ang) * 0.45) : new THREE.Vector3(Math.cos(ang) * (robeR(vv) + 0.02), Y0 + vv * 0.97, ZA + Math.sin(ang) * (robeR(vv) + 0.02) * 0.82));
          }
        }
        put(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.009, 5), vineMat);
        const curve = new THREE.CatmullRomCurve3(pts);
        const count = Math.round(reach * mix(22, 46, mood.density));
        for (let i = 0; i < count; i++) {
          const p = curve.getPoint(random());
          const out = onStone ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(p.x, 0, p.z - ZA).normalize();
          const s = 0.022 + random() * 0.022;
          leaves.push({ p: [p.x + (random() - 0.5) * 0.09 + out.x * 0.012, p.y + (random() - 0.5) * 0.07, p.z + out.z * 0.012], r: [onStone ? 0 : (random() - 0.5), onStone ? (random() - 0.5) * 0.6 : Math.atan2(out.x, out.z), random() * 6], s: [s, s * 1.15, 0.006], c: leafGreen[Math.floor(random() * 3)] });
        }
      }
      many(root, new THREE.CircleGeometry(1, 5), paint('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), leaves);
    }

    // Offerings on the plinth ledge and the grass in front.
    const flames: THREE.Mesh[] = [];
    const amount = mix(0.4, 1, mood.density);
    const flameMat = () => new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.2, roughness: 0.4 });
    if (a.offerings === 'flowers') {
      const petals = mood.cheer > 0.5 ? ['#f2c230', '#e8508a', '#f4f0e4', '#e2622a'] : ['#f1ece0', '#b9a8d8', '#8a2a3a', '#d8d2c0'];
      const dead = shade('#8a7a4a', '#5a4a30', 0.5);
      const stemMat = paint('#3f6a34'), blooms: Bit[] = [];
      const bunches = Math.round(1 + amount * 4);
      for (let b = 0; b < bunches; b++) {
        const bx = (b - (bunches - 1) / 2) * 0.27 + (random() - 0.5) * 0.08, ledge = b % 2 === 0;
        const by = ledge ? Y0 + 0.02 : 0.03, bz = ledge ? 0.34 : 0.68 + random() * 0.12, turn = (random() - 0.5) * 1.6;
        for (let i = 0; i < 6; i++) {
          const dx = Math.sin(turn + (i - 2.5) * 0.14) * 0.24, dz = Math.cos(turn + (i - 2.5) * 0.14) * (ledge ? 0.07 : 0.24);
          limb(root, [bx, by, bz], [bx + dx, by + 0.03, bz + dz], 0.005, 0.004, stemMat, 4);
          const c = shade(petals[Math.floor(random() * petals.length)], dead, wear * 0.7);
          blooms.push({ p: [bx + dx, by + 0.045, bz + dz], s: [0.03, 0.022, 0.03], c: hex(c) });
          blooms.push({ p: [bx + dx, by + 0.058, bz + dz], s: 0.012, c: '#e0b040' });
        }
        put(root, new THREE.ConeGeometry(0.05, 0.16, 8, 1, true), paint(b % 2 ? '#e8e4d8' : '#b8d0c8', { side: THREE.DoubleSide }), [bx + Math.sin(turn) * 0.09, by + 0.03, bz + Math.cos(turn) * (ledge ? 0.03 : 0.09)], [Math.PI / 2 + 0.15, 0, -turn]);
      }
      many(root, ball(8, 6), paint('#ffffff', { roughness: 0.6 }), blooms);
      const jar = put(root, new THREE.CylinderGeometry(0.04, 0.035, 0.11, 12), new THREE.MeshStandardMaterial({ color: '#cfe6e0', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }), [0.44, Y0 + 0.055, 0.34]);
      jar.castShadow = false;
    } else if (a.offerings === 'candles') {
      const n = Math.round(2 + amount * 8);
      for (let i = 0; i < n; i++) {
        const ledge = i % 3 !== 2;
        const x = (i - (n - 1) / 2) * (1.0 / n) + (random() - 0.5) * 0.05, y = ledge ? Y0 : (random() < 0.5 ? 0.14 : 0.01), z = ledge ? 0.31 + random() * 0.08 : y > 0.1 ? 0.48 : 0.62 + random() * 0.1;
        const h = 0.07 + random() * 0.07;
        put(root, new THREE.CylinderGeometry(0.028, 0.024, h, 10), paint(i % 4 === 1 ? '#f0ead8' : '#b3202c', { roughness: 0.3, emissive: i % 4 === 1 ? '#6a5a30' : '#7a1010', emissiveIntensity: 0.7 }), [x, y + h / 2, z]);
        if (random() > wear * 0.5) flames.push(put(root, new THREE.ConeGeometry(0.011, 0.04, 6), flameMat(), [x, y + h + 0.018, z]));
      }
    } else if (a.offerings === 'pebbles') {
      const bits: Bit[] = [];
      const n = Math.round(8 + amount * 26);
      for (let i = 0; i < n; i++) {
        const row = i % 3, s = 0.016 + random() * 0.018;
        bits.push({ p: [(random() - 0.5) * 1.1, [Y0, 0.14, Y0][row] + s * 0.5, [0.3 + random() * 0.1, 0.47 + random() * 0.03, 0.31 + random() * 0.1][row]], r: [random() * 3, random() * 3, 0], s: [s, s * 0.6, s * 0.85], c: ['#d8d4c8', '#8a8c8a', '#5a5450', '#b89a78', '#eeeeea'][Math.floor(random() * 5)] });
      }
      many(root, ball(8, 6), paint('#ffffff', { roughness: 0.7 }), bits);
      const coin = paint('#c9a030', { metalness: 0.8, roughness: 0.35, emissive: '#3a2a05', emissiveIntensity: 0.4 });
      for (let i = 0; i < 5; i++) put(root, new THREE.CylinderGeometry(0.014, 0.014, 0.003, 10), coin, [(random() - 0.5) * 0.9, Y0 + 0.003, 0.3 + random() * 0.1]);
    } else if (a.offerings === 'toy') {
      const fur = paint(shade('#b0703a', '#5a4a3a', wear * 0.6), { roughness: 1 });
      const bear = new THREE.Group();
      bear.position.set((random() - 0.5) * 0.5, Y0, 0.36);
      bear.rotation.set(-0.15, (random() - 0.5) * 0.8, (random() - 0.5) * 0.4 * (0.3 + wear));
      bear.scale.setScalar(1.35);
      root.add(bear);
      put(bear, ball(12, 10), fur, [0, 0.07, 0], [0, 0, 0], [0.06, 0.07, 0.05]);
      put(bear, ball(12, 10), fur, [0, 0.17, 0.005], [0, 0, 0], 0.052);
      put(bear, ball(8, 6), paint('#e0c8a0'), [0, 0.16, 0.045], [0, 0, 0], [0.024, 0.02, 0.02]);
      put(bear, ball(6, 5), paint('#1a1412'), [0, 0.167, 0.064], [0, 0, 0], 0.007);
      for (const x of [-1, 1]) {
        put(bear, ball(8, 6), fur, [x * 0.04, 0.215, 0], [0, 0, 0], [0.02, 0.02, 0.012]);
        put(bear, ball(6, 5), paint('#1a1412'), [x * 0.02, 0.183, 0.046], [0, 0, 0], 0.006);
        limb(bear, [x * 0.055, 0.11, 0], [x * 0.09, 0.05, 0.03], 0.02, 0.018, fur, 8);
        limb(bear, [x * 0.035, 0.025, 0.02], [x * 0.06, 0.02, 0.1], 0.024, 0.022, fur, 8);
      }
      put(bear, new THREE.TorusGeometry(0.04, 0.008, 5, 14), paint(mood.cheer > 0.5 ? '#d83a4a' : '#4a5a8a'), [0, 0.125, 0], [Math.PI / 2, 0, 0]);
    } else if (a.offerings === 'lantern') {
      const lx = (random() - 0.5) * 0.6, metal = paint('#2a2c2e', { metalness: 0.6, roughness: 0.5 });
      put(root, new THREE.CylinderGeometry(0.06, 0.068, 0.03, 14), metal, [lx, Y0 + 0.015, 0.35]);
      const glass = put(root, new THREE.CylinderGeometry(0.045, 0.05, 0.13, 14), new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb040', emissiveIntensity: 1.1, transparent: true, opacity: 0.55, depthWrite: false }), [lx, Y0 + 0.095, 0.35]);
      glass.castShadow = false;
      put(root, new THREE.ConeGeometry(0.062, 0.05, 14), metal, [lx, Y0 + 0.185, 0.35]);
      put(root, new THREE.TorusGeometry(0.05, 0.005, 5, 16, Math.PI), metal, [lx, Y0 + 0.2, 0.35]);
      for (let i = 0; i < 4; i++) limb(root, [lx + Math.cos(i * 1.57 + 0.78) * 0.052, Y0 + 0.03, 0.35 + Math.sin(i * 1.57 + 0.78) * 0.052], [lx + Math.cos(i * 1.57 + 0.78) * 0.048, Y0 + 0.16, 0.35 + Math.sin(i * 1.57 + 0.78) * 0.048], 0.004, 0.004, metal, 4);
      flames.push(put(root, new THREE.ConeGeometry(0.016, 0.06, 6), flameMat(), [lx, Y0 + 0.08, 0.35]));
    }
    for (const flame of flames) flame.castShadow = false;

    // Centre the assembly.
    const bounds = visibleBounds(outer);
    const centre = bounds.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, 0, -centre.z);

    const energy = mood.energy;
    const moves = a.face !== 'worn';
    const headX = head.rotation.x, headY = head.rotation.y;
    return {
      object: outer,
      footprint: 1.15,
      update(_dt, time) {
        flames.forEach((flame, i) => {
          const f = 1 + Math.sin(time * (9 + energy * 14) + i * 2.1) * 0.18 + Math.sin(time * 23 + i) * 0.08;
          flame.scale.set(1, f, 1);
        });
        if (!moves) return;
        // It only moves a little, and only sometimes: a slow peek, then still again.
        const peek = Math.max(0, Math.sin(time * (0.25 + energy * 0.5))) ** 6 * energy;
        if (a.face === 'hidden' || a.face === 'weeping') head.rotation.x = headX - peek * 0.35;
        else head.rotation.y = headY + Math.sin(time * (0.3 + energy * 0.6)) * 0.3 * energy;
        if (a.face === 'snarling') for (const hand of hands) flexHand(hand, time, 0.12 * (0.2 + energy), 1 + energy * 4);
      },
      dispose: () => disposeTree(outer),
    };
  },
});
