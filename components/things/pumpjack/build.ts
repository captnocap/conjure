import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PAINTS = {
  black: 'Plain oilfield black, the anonymous default, gone grey with dust.',
  orange: 'Company orange with a cream horsehead, a big operator that repaints every spring.',
  blue: 'Royal blue with white trim, a tidy independent proud of its lease.',
  rust: 'Never repainted: bare rust-red steel from skid to horsehead.',
  grasshopper: 'Painted as a giant grasshopper: green body, yellow legs, bulging eyes and antennae on the horsehead.',
  horse: 'Painted as a rocking horse: chestnut head with ears, mane and a rolling eye, carousel-red frame.',
  lonestar: 'Red, white and blue with a lone star on the counterweights, Texas pride for the highway to see.',
} as const;
const SCHEME: Record<keyof typeof PAINTS, { beam: string; head: string; post: string; weight: string; box: string; leg: string }> = {
  black: { beam: '#24272a', head: '#24272a', post: '#24272a', weight: '#303338', box: '#2b2e31', leg: '#3a3d40' },
  orange: { beam: '#d9641e', head: '#f1e8d2', post: '#d9641e', weight: '#2c2d30', box: '#d9641e', leg: '#2c2d30' },
  blue: { beam: '#2c5fae', head: '#ecece6', post: '#2c5fae', weight: '#d7d7cf', box: '#2c5fae', leg: '#d7d7cf' },
  rust: { beam: '#8e4c2b', head: '#9a5631', post: '#84472a', weight: '#6f3d27', box: '#7c4429', leg: '#8e4c2b' },
  grasshopper: { beam: '#5aa92c', head: '#7ccb3a', post: '#3f8a26', weight: '#2f6d20', box: '#4c9a29', leg: '#ecc92e' },
  horse: { beam: '#c63b2e', head: '#9c5a2b', post: '#c63b2e', weight: '#ecdcaa', box: '#2f5fa0', leg: '#ecdcaa' },
  lonestar: { beam: '#f2eee4', head: '#b6262d', post: '#24418f', weight: '#24418f', box: '#b6262d', leg: '#f2eee4' },
};
const SIGNS = {
  lease: 'A lease sign with the well name and number.',
  h2s: 'DANGER: POISON GAS.',
  keepout: 'NO TRESPASSING.',
  forsale: 'FOR SALE, with a phone number.',
  none: 'No sign at all.',
} as const;

export default defineThing({
  questions: {
    size: score('How big is the pumping unit?', ['A little stripper-well jack a man can look over', 'An ordinary lease unit, twice head height', 'A giant long-stroke unit as tall as a house']),
    paint: choice('How is it painted?', PAINTS),
    state: choice('What is it doing right now?', {
      pumping: 'Pumping: the head dips and rises, the counterweights turn.',
      stalled: 'Shut in and stopped mid-stroke, waiting for the price to come back.',
      abandoned: 'Abandoned for years: head stuck in the air, bridle gone, belt guard missing, weeds through the skid.',
      stripped: 'Being scrapped: the horsehead has been unbolted and lies on the ground beside it.',
    }),
    balance: choice('What counterbalances the beam?', {
      slabs: 'Heavy rectangular slab weights bolted to the rotating cranks.',
      moons: 'Rounded half-moon weights on the cranks, like a locomotive wheel.',
      beam: 'An old-style box of scrap iron hung on the tail of the beam, with bare skinny cranks.',
    }),
    power: choice('What drives it?', {
      electric: 'An electric motor, with a control box on a short power pole.',
      engine: 'A single-cylinder gas engine with a big flywheel and a popping exhaust stack.',
    }),
    fence: choice('What stands around it?', {
      none: 'Nothing: open ground, cattle can walk right up.',
      pipe: 'A low welded pipe-rail fence.',
      chainlink: 'A tall chain-link cage, the kind used near houses and schools.',
    }),
    sign: choice('If it carries a sign, what does it say?', SIGNS),
    leak: noul('Has crude leaked and pooled black around the wellhead?'),
    extra: choice('What else is there?', {
      nothing: 'Nothing else.',
      drum: 'A blue chemical drum on a stand, dripping treatment into the well.',
      hawk: 'A hawk perched on top of the beam, riding it.',
      chair: 'A folding lawn chair and a cooler: somebody sits here and watches it.',
      skull: 'A bleached cow skull propped against the skid.',
      tumbleweeds: 'Tumbleweeds blown up against the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = mix(0.6, 1.5, a.size);
    const dead = a.state === 'abandoned' || a.state === 'stripped';
    const rustiness = Math.min(1, mood.wear * 0.3 + (a.state === 'abandoned' ? 0.5 : a.state === 'stripped' ? 0.25 : 0) + (a.paint === 'rust' ? 0.2 : 0));
    const scheme = SCHEME[a.paint];
    const paint = (hex: string, options: THREE.MeshStandardMaterialParameters = {}) => {
      const colour = new THREE.Color(hex).lerp(new THREE.Color('#7b4528'), rustiness * 0.6);
      colour.offsetHSL(0, (mood.cheer - 0.5) * 0.15, (mood.cheer - 0.5) * 0.06);
      return new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55 + rustiness * 0.4, metalness: 0.15, ...options });
    };
    const mBeam = paint(scheme.beam), mHead = paint(scheme.head), mPost = paint(scheme.post), mWeight = paint(scheme.weight), mBox = paint(scheme.box), mLeg = paint(scheme.leg);
    const steel = paint('#9aa0a2', { metalness: 0.7, roughness: 0.3 });
    const dark = paint('#1c1d1f');
    const concrete = s.material('#b9b3a4', { roughness: 0.95 });
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };

    const H = 4.4 * k, R = 3.1 * k, T = 2.6 * k, crank = 0.75 * k, A = 0.28;
    const Cx = T - 0.15 * k, Cy = 2.0 * k, zc = 0.8 * k;
    const wellTop = 0.95 * k + 0.1;

    // Pad, skid and ground stains.
    const padLength = R + Cx + 3.6 * k;
    const padX = (Cx + 2.4 * k - R - 1.2 * k) / 2;
    s.box([padLength, 0.12, 2.9 * k], [padX, 0.06, 0], concrete);
    for (const z of [-0.5, 0.5]) {
      s.box([R + Cx + 2.2 * k, 0.26 * k, 0.16 * k], [(Cx + 1.6 * k - R + 0.6 * k) / 2, 0.12 + 0.13 * k, z * k], mPost);
    }
    for (let i = 0; i < 5; i++) s.box([0.16 * k, 0.2 * k, 1.16 * k], [mix(-R + 0.9 * k, Cx + 1.5 * k, i / 4), 0.12 + 0.11 * k, 0], mPost);

    // Samson post: four legs to a saddle bearing, with a ladder.
    const top: [number, number, number] = [0, H - 0.32 * k, 0];
    for (const [x, z] of [[-1.15, 0.5], [-1.15, -0.5], [1.0, 0.5], [1.0, -0.5]] as const)
      s.rod([x * k, 0.2, z * k], [top[0] + Math.sign(x) * 0.12 * k, top[1], z * 0.3 * k], 0.085 * k, mPost);
    s.rod([-0.62 * k, H * 0.5, 0.42 * k], [0.55 * k, H * 0.5, 0.42 * k], 0.05 * k, mPost);
    s.rod([-0.62 * k, H * 0.5, -0.42 * k], [0.55 * k, H * 0.5, -0.42 * k], 0.05 * k, mPost);
    s.rod([-0.9 * k, H * 0.25, 0.47 * k], [0.55 * k, H * 0.5, 0.42 * k], 0.035 * k, mPost);
    s.box([0.5 * k, 0.16 * k, 0.8 * k], [0, H - 0.3 * k, 0], mPost);
    s.cylinder(0.14 * k, 0.14 * k, 0.9 * k, [0, H - 0.12 * k, 0], steel, 12).rotation.x = Math.PI / 2;
    {
      const rungs = Math.max(4, Math.round((H - 0.6) / 0.32));
      for (const z of [-0.2, 0.2]) s.rod([1.25 * k, 0.15, z], [0.28 * k, H - 0.4 * k, z], 0.022, mLeg);
      for (let i = 1; i < rungs; i++) { const t = i / rungs; s.rod([mix(1.25 * k, 0.28 * k, t), mix(0.15, H - 0.4 * k, t), -0.2], [mix(1.25 * k, 0.28 * k, t), mix(0.15, H - 0.4 * k, t), 0.2], 0.016, mLeg); }
    }

    // Walking beam with its horsehead, pivoting on the saddle.
    const beamG = into(s.root, new THREE.Group());
    beamG.position.set(0, H, 0);
    const beamFrom = -R + 1.0 * k, beamTo = T + 0.25 * k, beamMid = (beamFrom + beamTo) / 2, beamLen = beamTo - beamFrom;
    into(beamG, s.box([beamLen, 0.5 * k, 0.1 * k], [beamMid, 0.1 * k, 0], mBeam));
    for (const y of [-0.15, 0.35]) into(beamG, s.box([beamLen, 0.06 * k, 0.34 * k], [beamMid, y * k, 0], mBeam));
    into(beamG, s.box([0.5 * k, 0.5 * k, 0.4 * k], [0, 0.1 * k, 0], mBeam));
    if (a.paint === 'orange' || a.paint === 'blue' || a.paint === 'lonestar')
      for (const z of [-1, 1]) into(beamG, s.box([beamLen * 0.3, 0.14 * k, 0.012], [beamMid + beamLen * 0.2, 0.1 * k, z * 0.056 * k], paint(a.paint === 'lonestar' ? '#b6262d' : '#f1e8d2')));
    // Equalizer at the tail.
    into(beamG, s.box([0.3 * k, 0.3 * k, 2 * zc + 0.2 * k], [T, -0.3 * k, 0], mBeam));

    const headG = new THREE.Group();
    {
      const shape = new THREE.Shape();
      shape.moveTo(-R * Math.cos(0.33), R * Math.sin(0.33));
      shape.absarc(0, 0, R, Math.PI - 0.33, Math.PI + 0.38, false);
      shape.lineTo(-R + 1.15 * k, -0.2 * k);
      shape.lineTo(-R + 1.15 * k, 0.4 * k);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.36 * k, bevelEnabled: true, bevelSize: 0.03 * k, bevelThickness: 0.03 * k, bevelSegments: 1, curveSegments: 16 });
      geometry.translate(0, 0, -0.18 * k);
      into(headG, s.mesh(geometry, mHead));
      // Lightening hole and face plate.
      into(headG, s.cylinder(0.2 * k, 0.2 * k, 0.44 * k, [-R + 0.75 * k, 0.05 * k, 0], dark, 16)).rotation.x = Math.PI / 2;
      const eyeAt: [number, number] = [-R + 0.42 * k, 0.55 * k];
      if (a.paint === 'grasshopper' || a.paint === 'horse') {
        for (const z of [-1, 1]) {
          const big = a.paint === 'grasshopper' ? 0.27 : 0.15;
          into(headG, s.ball([big * k, big * k, 0.1 * k], [eyeAt[0], eyeAt[1], z * 0.22 * k], paint(a.paint === 'grasshopper' ? '#f4d21f' : '#f6f1e4')));
          into(headG, s.ball([big * 0.5 * k, big * 0.5 * k, 0.06 * k], [eyeAt[0] - 0.05 * k, eyeAt[1] - 0.03 * k, z * 0.29 * k], dark));
        }
      }
      if (a.paint === 'grasshopper') {
        for (const z of [-1, 1]) into(headG, s.tube([[-R + 0.3 * k, 0.95 * k, z * 0.1 * k], [-R + 0.1 * k, 1.7 * k, z * 0.3 * k], [-R + 0.7 * k, 2.3 * k, z * 0.45 * k], [-R + 1.5 * k, 2.4 * k, z * 0.5 * k]], 0.03 * k, mLeg));
        for (let i = 0; i < 4; i++) into(headG, s.box([0.03 * k, 0.5 * k, 0.4 * k], [-R + (1.5 + i * 0.45) * k, 0.1 * k, 0], paint('#2f6d20')));
      }
      if (a.paint === 'horse') {
        for (const z of [-1, 1]) { const ear = into(headG, s.mesh(new THREE.ConeGeometry(0.11 * k, 0.42 * k, 8), mHead, [-R + 0.62 * k, 1.12 * k, z * 0.12 * k])); ear.rotation.z = -0.25; }
        for (let i = 0; i < 9; i++) into(headG, s.box([0.2 * k, (0.34 - Math.abs(i - 3) * 0.02) * k, 0.1 * k], [-R + (0.85 + i * 0.2) * k, (0.92 - i * 0.065) * k, 0], dark)).rotation.z = 0.5;
        into(headG, s.box([0.5 * k, 0.07 * k, 0.4 * k], [-R + 0.35 * k, -0.35 * k, 0], paint('#e9d9a8'))).rotation.z = 1.1;
      }
    }
    if (a.state === 'stripped') {
      const lay = into(s.root, new THREE.Group());
      headG.position.set(R - 0.55 * k, 0, 0);
      lay.add(headG);
      lay.rotation.set(-Math.PI / 2 + 0.12, 0, 0.5 + random() * 0.8);
      lay.position.set(-R + 0.8 * k, 0.3 * k, 1.45 * k + 0.95 * k);
    } else beamG.add(headG);

    // Bridle, carrier bar and polished rod.
    const carrierRest = H - 2.15 * k;
    const hang = into(s.root, new THREE.Group());
    const cable = into(s.root, s.cylinder(0.02 * k, 0.02 * k, 1, [0, 0, 0], steel, 6));
    const cable2 = into(s.root, s.cylinder(0.02 * k, 0.02 * k, 1, [0, 0, 0], steel, 6));
    const rod = into(s.root, s.cylinder(0.028 * k, 0.028 * k, 1, [0, 0, 0], steel, 8));
    into(hang, s.box([0.12 * k, 0.1 * k, 0.5 * k], [0, 0, 0], dark));
    into(hang, s.box([0.1 * k, 0.16 * k, 0.1 * k], [0, 0.1 * k, 0], steel));
    const bridle = !dead;
    hang.visible = cable.visible = cable2.visible = rod.visible = bridle;

    // Wellhead: casing, tee, stuffing box and a flowline running off to the side.
    const wx = -R - 0.02 * k;
    s.cylinder(0.16, 0.19, wellTop * 0.45, [wx, 0.12 + wellTop * 0.22, 0], dark, 14);
    s.cylinder(0.25, 0.25, 0.06, [wx, 0.12 + wellTop * 0.45, 0], mLeg, 14);
    s.cylinder(0.1, 0.1, wellTop * 0.4, [wx, 0.12 + wellTop * 0.67, 0], dark, 12);
    s.cylinder(0.13, 0.1, wellTop * 0.14, [wx, wellTop, 0], mLeg, 12);
    s.tube([[wx, 0.12 + wellTop * 0.62, 0], [wx, 0.12 + wellTop * 0.62, -0.5], [wx + 0.1, 0.3, -0.9 * k - 0.4], [wx + 0.6, 0.1, -1.35 * k - 0.3]], 0.05, dark);
    s.cylinder(0.035, 0.035, 0.22, [wx, 0.12 + wellTop * 0.62, -0.32], paint('#c8372c'), 8).rotation.z = Math.PI / 2;
    if (dead) s.cylinder(0.14, 0.14, 0.05, [wx, wellTop + 0.08, 0], paint('#8a4b2c'), 12);

    // Gear reducer, crankshaft, cranks and counterweights.
    s.box([1.3 * k, Cy - 0.5 * k, 0.9 * k], [Cx, 0.12 + (Cy - 0.5 * k) / 2, 0], mPost);
    s.box([1.15 * k, 0.95 * k, 1.15 * k], [Cx, Cy, 0], mBox);
    s.cylinder(0.5 * k, 0.5 * k, 1.2 * k, [Cx, Cy + 0.1 * k, 0], mBox, 20).rotation.x = Math.PI / 2;
    s.cylinder(0.1 * k, 0.1 * k, 2 * zc + 0.3 * k, [Cx, Cy, 0], steel, 12).rotation.x = Math.PI / 2;
    const crankG = into(s.root, new THREE.Group());
    crankG.position.set(Cx, Cy, 0);
    for (const z of [-1, 1]) {
      into(crankG, s.box([1.95 * k, 0.34 * k, 0.12 * k], [0.72 * k, 0, z * zc], a.balance === 'beam' ? mBox : mWeight));
      into(crankG, s.cylinder(0.07 * k, 0.07 * k, 0.3 * k, [crank, 0, z * (zc + 0.1 * k)], steel, 10)).rotation.x = Math.PI / 2;
      if (a.balance === 'slabs') {
        into(crankG, s.box([0.95 * k, 1.05 * k, 0.2 * k], [1.2 * k, 0, z * (zc - 0.02 * k)], mWeight));
        into(crankG, s.box([0.6 * k, 0.8 * k, 0.26 * k], [1.25 * k, 0, z * (zc - 0.02 * k)], mWeight));
      }
      if (a.balance === 'moons') {
        const moon = into(crankG, s.mesh(new THREE.CylinderGeometry(1.0 * k, 1.0 * k, 0.22 * k, 28, 1, false, 0, Math.PI), mWeight, [0.72 * k, 0, z * (zc - 0.02 * k)]));
        moon.rotation.x = Math.PI / 2;
      }
      if (a.paint === 'lonestar' && a.balance !== 'beam') {
        const star = new THREE.Shape();
        for (let i = 0; i < 10; i++) { const radius = (i % 2 ? 0.14 : 0.36) * k, angle = i * Math.PI / 5 + Math.PI / 2; if (i) star.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); else star.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius); }
        const badge = into(crankG, s.mesh(new THREE.ExtrudeGeometry(star, { depth: 0.03 * k, bevelEnabled: false }), paint('#f2eee4'), [1.25 * k, 0, z * (zc + 0.12 * k) - 0.015 * k]));
        badge.rotation.z = -Math.PI / 2;
      }
    }
    if (a.balance === 'beam') {
      into(beamG, s.box([1.0 * k, 0.75 * k, 0.9 * k], [T + 0.55 * k, 0.2 * k, 0], mWeight));
      for (let i = 0; i < 7; i++) into(beamG, s.box([(0.2 + random() * 0.4) * k, 0.12 * k, (0.2 + random() * 0.5) * k], [T + (0.3 + random() * 0.5) * k, 0.62 * k, (random() - 0.5) * 0.4 * k], paint('#6f3d27'))).rotation.y = random() * 3;
    }
    const pitmans = [-1, 1].map((z) => { const arm = into(s.root, s.cylinder(0.055 * k, 0.055 * k, 1, [0, 0, z * (zc + 0.12 * k)], mLeg, 10)); return arm; });

    // Prime mover and belt guard.
    const mx = Cx + 1.75 * k;
    let flywheel: THREE.Object3D | null = null;
    if (a.state !== 'stripped') {
      if (a.power === 'electric') {
        s.box([0.9 * k, 0.3 * k, 0.8 * k], [mx, 0.12 + 0.15 * k, 0], mPost);
        s.cylinder(0.3 * k, 0.3 * k, 0.8 * k, [mx, 0.12 + 0.6 * k, -0.05 * k], paint('#6f7477'), 16).rotation.x = Math.PI / 2;
        const px = mx + 1.0 * k + 0.3, pz = -1.0 * k - 0.2;
        s.cylinder(0.07, 0.09, 3.4, [px, 1.7, pz], s.material('#6b5540'), 8);
        s.box([0.5, 0.7, 0.22], [px, 1.5, pz + 0.18], paint('#aab0ae'));
        s.box([0.22, 0.3, 0.16], [px, 2.2, pz + 0.16], paint('#8d9391'));
        s.box([1.1, 0.08, 0.08], [px, 3.2, pz], s.material('#6b5540'));
        for (const x of [-0.45, 0.45]) s.cylinder(0.04, 0.05, 0.14, [px + x, 3.31, pz], s.material('#d8dcd4'), 8);
        s.tube([[px, 1.2, pz + 0.2], [px, 0.2, pz + 0.3], [mx, 0.25, -0.5 * k]], 0.025, dark);
      } else {
        s.box([1.3 * k, 0.25 * k, 0.9 * k], [mx + 0.1 * k, 0.12 + 0.12 * k, 0], mPost);
        s.box([0.8 * k, 0.6 * k, 0.5 * k], [mx + 0.1 * k, 0.12 + 0.55 * k, 0], paint('#3f6a48'));
        s.cylinder(0.2 * k, 0.2 * k, 0.6 * k, [mx + 0.75 * k, 0.12 + 0.55 * k, 0], paint('#3f6a48'), 12).rotation.z = Math.PI / 2;
        const wheel = new THREE.Group();
        wheel.position.set(mx + 0.05 * k, 0.12 + 0.62 * k, -0.42 * k);
        into(wheel, s.ring(0.52 * k, 0.06 * k, [0, 0, 0], paint('#2c2d30')));
        for (let i = 0; i < 3; i++) into(wheel, s.box([1.0 * k, 0.06 * k, 0.04 * k], [0, 0, 0], paint('#2c2d30'))).rotation.z = i * Math.PI / 3;
        flywheel = into(s.root, wheel);
        s.cylinder(0.05 * k, 0.05 * k, 1.5 * k, [mx + 0.4 * k, 0.12 + 1.5 * k, 0.1 * k], dark, 8);
        s.cylinder(0.09 * k, 0.09 * k, 0.4 * k, [mx + 0.4 * k, 0.12 + 1.75 * k, 0.1 * k], dark, 10);
        s.cylinder(0.3 * k, 0.3 * k, 0.9 * k, [mx + 1.3 * k, 0.12 + 0.45 * k + 0.2, -0.8 * k], paint('#b9bcb4'), 14);
      }
      if (a.state !== 'abandoned') {
        const guard = s.box([1.9 * k, 0.55 * k, 0.14 * k], [(Cx + mx) / 2 + 0.05 * k, (Cy + 0.3 * k + 0.12 + 0.6 * k) / 2, 0.36 * k], paint(a.paint === 'black' || a.paint === 'rust' ? '#d8b62a' : scheme.leg));
        guard.rotation.z = -Math.atan2(Cy + 0.3 * k - 0.12 - 0.6 * k, mx - Cx);
      } else {
        s.cylinder(0.32 * k, 0.32 * k, 0.08 * k, [Cx + 0.35 * k, Cy + 0.3 * k, 0.4 * k], dark, 16).rotation.x = Math.PI / 2;
      }
    } else {
      s.box([0.9 * k, 0.08 * k, 0.8 * k], [mx, 0.12 + 0.04 * k, 0], paint('#6f3d27'));
    }

    // Fence, sign.
    const x0 = -R - 1.0 * k - 0.4, x1 = Cx + 2.5 * k + 0.5, zf = 1.45 * k + 0.5;
    const fenceMetal = paint(a.fence === 'chainlink' ? '#a9afae' : '#d9d5c8', { metalness: 0.3 });
    if (a.fence !== 'none') {
      const tall = a.fence === 'pipe' ? 1.15 : 2.0;
      const corners: [number, number][] = [[x0, zf], [x1, zf], [x1, -zf], [x0, -zf]];
      corners.forEach(([ax, az], index) => {
        const [bx, bz] = corners[(index + 1) % 4];
        const length = Math.hypot(bx - ax, bz - az), posts = Math.max(2, Math.round(length / 2.4));
        for (let i = 0; i < posts; i++) { const t = i / posts; s.cylinder(0.05, 0.05, tall, [mix(ax, bx, t), tall / 2, mix(az, bz, t)], fenceMetal, 8); }
        s.rod([ax, tall - 0.03, az], [bx, tall - 0.03, bz], 0.04, fenceMetal);
        if (a.fence === 'pipe') s.rod([ax, tall * 0.5, az], [bx, tall * 0.5, bz], 0.035, fenceMetal);
        else {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          ctx.strokeStyle = '#9ea4a3'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(64, 64); ctx.moveTo(64, 0); ctx.lineTo(0, 64); ctx.stroke();
          const map = new THREE.CanvasTexture(canvas);
          map.wrapS = map.wrapT = THREE.RepeatWrapping;
          map.repeat.set(length / 0.42, tall / 0.42);
          map.colorSpace = THREE.SRGBColorSpace;
          const mesh = s.mesh(new THREE.PlaneGeometry(length, tall - 0.1), new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, roughness: 0.6 }), [(ax + bx) / 2, tall / 2, (az + bz) / 2]);
          mesh.rotation.y = Math.atan2(-(bz - az), bx - ax);
          mesh.castShadow = false;
        }
      });
    }
    if (a.sign !== 'none') {
      const text = { lease: `${['HOLT', 'UNIVERSITY', 'YATES', 'COWDEN', 'MABEE', 'SCHARBAUER'][Math.floor(random() * 6)]} ${1 + Math.floor(random() * 40)}-${'ABCH'[Math.floor(random() * 4)]}`, h2s: 'DANGER POISON GAS', keepout: 'NO TRESPASSING', forsale: 'FOR SALE 555-0142' }[a.sign];
      const [ink, paper] = { lease: ['#1f2a24', '#efe9d6'], h2s: ['#ffffff', '#c02a24'], keepout: ['#1b1b1b', '#e9c62a'], forsale: ['#c02a24', '#f4f0e2'] }[a.sign];
      const sx = -R * 0.45, sz = a.fence === 'none' ? 1.45 * k + 0.25 : zf + 0.06, sy = a.fence === 'chainlink' ? 1.35 : 0.95;
      if (a.fence === 'none') for (const dx of [-0.6, 0.6]) s.cylinder(0.035, 0.035, sy + 0.3, [sx + dx, (sy + 0.3) / 2, sz - 0.03], fenceMetal, 6);
      const plate = s.label(text, 1.6, 0.62, [sx, sy, sz], ink, paper);
      plate.rotation.z = (random() - 0.5) * (0.04 + mood.wear * 0.2);
      s.box([1.66, 0.68, 0.02], [sx, sy, sz - 0.015], dark);
    }

    // Stains, leak, weeds and whatever has been left here.
    const oil = new THREE.MeshStandardMaterial({ color: '#15110d', roughness: 0.25, metalness: 0.3 });
    const stains = Math.round(2 + mood.wear * 7 + (a.leak ? 4 : 0));
    for (let i = 0; i < stains; i++) {
      const near = a.leak || i % 2 === 0, size = (0.15 + random() * 0.35) * (a.leak ? 1.35 : 1) * Math.sqrt(k);
      const blot = s.cylinder(size, size, 0.012, [near ? wx + (random() - 0.4) * 1.4 * k : Cx + (random() - 0.5) * 2 * k, 0.127 + i * 0.0006, (random() - 0.5) * (near ? 1.6 : 2.2) * k], oil, 14);
      blot.scale.z = 0.5 + random() * 0.6;
      blot.castShadow = false;
    }
    if (a.leak) { s.rod([wx + 0.1, wellTop * 0.9, 0.1], [wx + 0.14, 0.13, 0.16], 0.03, oil, 0.015); s.cylinder(0.14, 0.2, wellTop * 0.5, [wx, 0.12 + wellTop * 0.22, 0], oil, 14).scale.set(1.04, 1, 1.04); }
    const weeds = Math.round((dead ? 26 : 5) + mood.density * 14 + mood.wear * 10);
    const tufts = Array.from({ length: weeds }, () => {
      const edge = random() < 0.7, x = mix(x0 + 0.3, x1 - 0.3, random()), z = edge ? (random() < 0.5 ? -1 : 1) * (1.45 * k + 0.05 + random() * 0.35) : (random() - 0.5) * 2.2 * k;
      return { at: [x, edge ? 0 : 0.12, z] as [number, number, number], size: 0.25 + random() * (dead ? 0.75 : 0.4), color: new THREE.Color().setHSL(0.14 + random() * 0.08, 0.55, 0.12 + random() * 0.1) };
    });
    const tuft = new THREE.ConeGeometry(0.22, 1, 5);
    tuft.translate(0, 0.5, 0);
    s.scatter(tuft, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), tufts);

    const ex = wx + 0.9 * k + 0.5, ez = 1.0 * k + 0.25;
    if (a.extra === 'drum') {
      for (const [dx, dz] of [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]] as const) s.cylinder(0.025, 0.025, 0.7, [wx + 0.2 + dx, 0.47, ez + dz], steel, 6);
      const drum = s.cylinder(0.29, 0.29, 0.88, [wx + 0.2, 1.1, ez], paint('#2767b0'), 18);
      drum.rotation.z = Math.PI / 2;
      for (const dx of [-0.2, 0.2]) s.ring(0.295, 0.015, [wx + 0.2 + dx, 1.1, ez], paint('#1f4f8c')).rotation.y = Math.PI / 2;
      s.tube([[wx + 0.2, 0.82, ez], [wx + 0.1, 0.5, ez * 0.6], [wx + 0.05, wellTop * 0.7, 0.15]], 0.015, dark);
    }
    if (a.extra === 'chair') {
      const web = s.material(mood.cheer > 0.5 ? '#3f9a62' : '#7b8d86');
      const cx = ex + 0.3, cz = ez + 0.75;
      s.box([0.52, 0.03, 0.46], [cx, 0.42, cz], web);
      s.box([0.52, 0.5, 0.03], [cx, 0.7, cz - 0.27], web).rotation.x = -0.25;
      for (const dx of [-0.26, 0.26]) { s.rod([cx + dx, 0, cz + 0.25], [cx + dx, 0.62, cz - 0.2], 0.014, steel); s.rod([cx + dx, 0, cz - 0.25], [cx + dx, 0.45, cz + 0.22], 0.014, steel); s.rod([cx + dx, 0.62, cz - 0.2], [cx + dx, 0.62, cz + 0.2], 0.014, steel); }
      s.box([0.5, 0.32, 0.32], [cx + 0.75, 0.16, cz + 0.05], paint('#c63b2e'));
      s.box([0.52, 0.06, 0.34], [cx + 0.75, 0.35, cz + 0.05], paint('#f1ede2'));
    }
    if (a.extra === 'skull') {
      const bone = s.material('#e9e3d0');
      const g = new THREE.Group();
      into(g, s.ball([0.17, 0.26, 0.12], [0, 0.3, 0], bone));
      into(g, s.ball([0.1, 0.2, 0.09], [0, 0.08, 0.03], bone));
      for (const d of [-1, 1]) { into(g, s.tube([[d * 0.12, 0.46, 0], [d * 0.36, 0.52, 0.02], [d * 0.5, 0.72, 0.05]], 0.03, bone)); into(g, s.ball([0.045, 0.06, 0.03], [d * 0.08, 0.32, 0.1], dark)); }
      g.position.set(ex - 0.4, 0.14, 0.62 * k + 0.12);
      g.rotation.x = -0.3;
      g.scale.setScalar(1.25);
      s.root.add(g);
    }
    if (a.extra === 'tumbleweeds') {
      const brush = new THREE.MeshStandardMaterial({ color: '#b39a63', roughness: 1, wireframe: true });
      const twig = new THREE.MeshStandardMaterial({ color: '#9c8250', roughness: 1, flatShading: true });
      for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) {
        const size = 0.3 + random() * 0.4, x = mix(x0 + 1, x1 - 1, random()), z = 0.62 * k + size * 0.9 + random() * 0.5;
        s.mesh(new THREE.IcosahedronGeometry(size, 2), brush, [x, size * 0.9 + (z < 1.45 * k ? 0.12 : 0), z]);
        s.mesh(new THREE.IcosahedronGeometry(size * 0.72, 1), twig, [x, size * 0.9 + (z < 1.45 * k ? 0.12 : 0), z]);
      }
    }
    if (a.extra === 'hawk') {
      const feather = s.material('#6b4a33'), g = new THREE.Group();
      into(g, s.ball([0.1, 0.19, 0.11], [0, 0.2, 0], feather));
      into(g, s.ball([0.07, 0.07, 0.07], [-0.02, 0.41, 0], s.material('#8a6444')));
      into(g, s.mesh(new THREE.ConeGeometry(0.025, 0.07, 6), s.material('#d9b23a'), [-0.09, 0.4, 0])).rotation.z = Math.PI / 2 + 0.4;
      into(g, s.box([0.2, 0.03, 0.09], [0.14, 0.06, 0], feather)).rotation.z = -0.5;
      into(g, s.ball([0.08, 0.14, 0.1], [-0.03, 0.2, 0], s.material('#e6d9bd')));
      g.scale.setScalar(1.5);
      g.position.set(0.1 * k, H + 0.38 * k, 0);
      s.root.add(g);
    }

    // Kinematics.
    const up = new THREE.Vector3(0, 1, 0), span = new THREE.Vector3();
    const stretch = (mesh: THREE.Mesh, x0: number, y0: number, x1: number, y1: number) => {
      span.set(x1 - x0, y1 - y0, 0);
      const length = Math.max(span.length(), 0.001);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, mesh.position.z);
      mesh.scale.set(1, length, 1);
      mesh.quaternion.setFromUnitVectors(up, span.normalize());
    };
    const pose = (phase: number) => {
      const theta = A * Math.sin(phase);
      beamG.rotation.z = theta;
      crankG.rotation.z = phase;
      const tx = T * Math.cos(theta) + 0.3 * k * Math.sin(theta), ty = H + T * Math.sin(theta) - 0.3 * k * Math.cos(theta);
      for (const arm of pitmans) stretch(arm, Cx + crank * Math.cos(phase), Cy + crank * Math.sin(phase), tx, ty);
      const carrier = carrierRest - R * Math.sin(theta);
      hang.position.set(-R - 0.02 * k, carrier, 0);
      cable.position.z = 0.16 * k; cable2.position.z = -0.16 * k;
      stretch(cable, -R - 0.02 * k, carrier, -R - 0.02 * k, H);
      stretch(cable2, -R - 0.02 * k, carrier, -R - 0.02 * k, H);
      stretch(rod, -R - 0.02 * k, wellTop - 0.05, -R - 0.02 * k, carrier + 0.1 * k);
    };
    let phase = a.state === 'abandoned' ? -Math.PI / 2 + (random() - 0.5) * 0.5 : a.state === 'stripped' ? (random() - 0.5) * 0.6 : random() * Math.PI * 2;
    pose(phase);
    const speed = a.state === 'pumping' ? mix(0.25, 1.9, mood.energy) : 0;
    return s.finish({
      update: (dt) => {
        if (!speed) return;
        phase += dt * speed;
        pose(phase);
        if (flywheel) flywheel.rotation.z -= dt * speed * 9;
      },
    });
  },
});
