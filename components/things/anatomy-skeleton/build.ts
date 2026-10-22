import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    dress: choice('How have the students dressed it, if at all?', {
      plain: 'Not at all: bare bones, as supplied.',
      coat: 'A white lab coat hanging open, with pens in the pocket and safety goggles.',
      winter: 'A woolly bobble hat and a long striped school scarf.',
      santa: 'A red Santa hat and loops of gold tinsel, end of the autumn term.',
      party: 'A paper party hat, dark sunglasses and a loose necktie.',
      graduate: 'A mortarboard with a tassel, for the leavers.',
      top: 'A battered top hat and a bow tie, a gentleman of the old school.',
    }),
    pose: choice('How is it posed?', {
      plain: 'Hanging straight, arms at its sides, as anatomy intends.',
      wave: 'One arm wired up in a cheerful wave.',
      hip: 'A hand on its hip, jaunty and impatient.',
      crossed: 'Arms folded across the ribs like a disappointed teacher.',
      point: 'One arm stretched out, pointing at someone.',
      slump: 'Head bowed and shoulders dropped, tired of it all.',
    }),
    bones: choice('What are the bones like?', {
      ivory: 'Yellowed ivory, possibly real, decades old.',
      plastic: 'Bright white moulded plastic, new from the catalogue.',
      painted: 'Cream with muscle attachments painted in red and blue.',
      glow: 'Faintly luminous green-white, glowing in the dark.',
    }),
    stand: choice('What does it hang from?', {
      chrome: 'A chrome pole on a five-legged castor base.',
      wood: 'An old turned wooden post on a square wheeled board, with an iron hook.',
      case: 'A tall glazed wooden case on castors with its door standing open.',
    }),
    state: choice('What condition is it in?', {
      complete: 'All there and properly wired.',
      jaw: 'The jaw has dropped loose and hangs wide open.',
      armless: 'One whole arm is missing; a wire dangles from the shoulder.',
      leg: 'A lower leg has come off and lies on the base.',
      backwards: 'Somebody has turned the skull to face backwards.',
    }),
    sign: choice('If a card hangs round its neck, what does it say?', {
      none: 'There is no card.',
      bones: 'MR BONES',
      late: 'LATE AGAIN',
      detention: 'DETENTION',
      last: 'LAST DAY',
      touch: 'DO NOT TOUCH',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const boneColour = new THREE.Color({ ivory: '#d9c99a', plastic: '#f3f1e8', painted: '#e9dfc4', glow: '#d8ffd0' }[a.bones]).lerp(new THREE.Color('#a8956a'), mood.wear * (a.bones === 'plastic' ? 0.12 : 0.3));
    const bone = new THREE.MeshStandardMaterial({ color: boneColour, roughness: a.bones === 'plastic' ? 0.35 : 0.7, emissive: a.bones === 'glow' ? '#7dff7a' : '#000000', emissiveIntensity: a.bones === 'glow' ? 0.7 : 0 });
    const red = a.bones === 'painted' ? s.material('#c8382e') : bone;
    const blue = a.bones === 'painted' ? s.material('#3560b8') : bone;
    const hollow = s.material('#1a1714', { roughness: 1 });
    const steel = s.material('#cdd2d3', { metalness: 0.9, roughness: 0.25 });
    const iron = s.material('#2a2b2c', { metalness: 0.5, roughness: 0.6 });
    const wood = s.material('#7a4b2a', { roughness: 0.6 });
    const bright = (c: string) => s.material(new THREE.Color(c).lerp(new THREE.Color('#77756c'), (1 - mood.cheer) * 0.35), { roughness: 0.85 });

    const HANG = 1.78;
    const pivot = new THREE.Group();
    pivot.position.y = HANG;
    const sk = new THREE.Group();
    sk.position.y = -HANG;
    pivot.add(sk);
    s.root.add(pivot);
    const k = <M extends THREE.Object3D>(m: M) => (sk.add(m), m);
    const limb = (from: P, to: P, r: number, m: THREE.Material = bone, knob = 1.5) => {
      k(s.rod(from, to, r, m, r * 0.9));
      k(s.ball([r * knob, r * knob, r * knob], from, m, 10));
      k(s.ball([r * knob, r * knob, r * knob], to, m, 10));
    };
    const slump = a.pose === 'slump';

    // Skull.
    const skull = new THREE.Group();
    skull.position.set(0, 1.665, 0.01);
    sk.add(skull);
    const h = <M extends THREE.Object3D>(m: M) => (skull.add(m), m);
    h(s.ball([0.082, 0.09, 0.1], [0, 0.02, -0.012], bone, 22));
    h(s.ball([0.06, 0.055, 0.045], [0, -0.04, 0.052], bone, 16));
    for (const x of [-1, 1]) {
      h(s.ball([0.023, 0.025, 0.014], [x * 0.03, -0.012, 0.088], hollow, 12));
      h(s.rod([x * 0.07, -0.035, 0.02], [x * 0.048, -0.045, 0.075], 0.008, bone));
    }
    const nose = h(s.mesh(new THREE.ConeGeometry(0.012, 0.028, 3), hollow, [0, -0.048, 0.097]));
    nose.rotation.y = Math.PI;
    h(s.box([0.066, 0.016, 0.02], [0, -0.084, 0.078], s.material('#f6f3ea')));
    for (let i = -3; i <= 3; i++) h(s.box([0.002, 0.016, 0.004], [i * 0.009, -0.084, 0.0885], hollow));
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.06, 0);
    skull.add(jaw);
    const arc = s.ring(0.05, 0.011, [0, -0.05, 0.035], bone, Math.PI);
    arc.rotation.x = Math.PI / 2;
    arc.scale.y = 1.15;
    const teeth = s.box([0.056, 0.014, 0.014], [0, -0.038, 0.086], s.material('#f6f3ea'));
    jaw.add(arc, teeth);
    for (const x of [-1, 1]) jaw.add(s.rod([x * 0.05, -0.05, 0.035], [x * 0.058, 0.01, 0], 0.01, bone));
    if (a.state === 'jaw') { jaw.rotation.x = 0.75; jaw.rotation.z = 0.22; jaw.position.y -= 0.01; }
    else jaw.rotation.x = mix(0.02, 0.22, mood.cheer);
    skull.rotation.set(slump ? 0.55 : (random() - 0.5) * 0.12, a.state === 'backwards' ? Math.PI : (random() - 0.5) * 0.5, (random() - 0.5) * 0.12 + (a.pose === 'hip' ? 0.15 : 0));
    if (slump) skull.position.set(0, 1.64, 0.05);

    // Spine and ribs.
    const spinePts: P[] = [[0, 1.6, 0], [0, 1.47, -0.05], [0, 1.32, -0.068], [0, 1.16, -0.035], [0, 1.06, -0.035], [0, 0.985, -0.055]];
    k(s.tube(spinePts, 0.016, bone));
    const curve = new THREE.CatmullRomCurve3(spinePts.map((p) => new THREE.Vector3(...p)));
    const discs = Array.from({ length: 20 }, (_u, i) => ({ at: curve.getPoint((i + 0.5) / 20).toArray() as P, size: 1 }));
    k(s.scatter(new THREE.CylinderGeometry(0.024, 0.024, 0.016, 10), bone, discs));
    const radii = [0.07, 0.098, 0.115, 0.126, 0.133, 0.136, 0.135, 0.13, 0.12, 0.108];
    radii.forEach((r, i) => {
      const y = 1.475 - i * 0.031;
      const rib = k(s.ring(r, 0.0075, [0, y - 0.015, -0.065 + r * 0.74 - 0.008], bone, i > 7 ? Math.PI * 1.5 : Math.PI * 2));
      rib.rotation.x = Math.PI / 2 + 0.3;
      rib.rotation.z = i > 7 ? Math.PI * 0.75 : 0;
      rib.scale.y = 0.74;
    });
    const sternum = k(s.box([0.036, 0.19, 0.012], [0, 1.36, 0.105], bone));
    sternum.rotation.x = -0.18;

    // Shoulder girdle and pelvis.
    for (const x of [-1, 1]) {
      limb([x * 0.015, 1.485, 0.075], [x * 0.175, slump ? 1.47 : 1.5, -0.02], 0.009);
      const blade = k(s.box([0.085, 0.12, 0.01], [x * 0.11, 1.39, -0.095], bone));
      blade.rotation.set(0.1, x * -0.3, x * 0.25);
      const wing = k(s.ball([0.085, 0.075, 0.02], [x * 0.085, 1.045, -0.03], bone, 16));
      wing.rotation.set(-0.2, x * 0.7, x * -0.25);
      limb([x * 0.095, 0.97, 0.01], [x * 0.012, 0.935, 0.065], 0.012, bone, 1.2);
    }
    k(s.mesh(new THREE.ConeGeometry(0.045, 0.11, 8), bone, [0, 0.99, -0.06])).rotation.x = Math.PI - 0.3;

    // Arms.
    const hand = (at: P, towards: THREE.Vector3) => {
      const g = new THREE.Group();
      g.position.set(...at);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), towards.clone().normalize());
      g.add(s.box([0.05, 0.065, 0.014], [0, 0.04, 0], bone));
      for (let i = 0; i < 4; i++) g.add(s.rod([-0.02 + i * 0.013, 0.07, 0], [-0.032 + i * 0.021, 0.145 - Math.abs(i - 1.5) * 0.012, 0.01], 0.0055, bone));
      g.add(s.rod([0.025, 0.03, 0], [0.058, 0.085, 0.012], 0.006, bone));
      sk.add(g);
      return g;
    };
    const arms: Record<string, (x: number) => [P, P] | null> = {
      plain: () => null,
      slump: () => null,
      wave: (x) => (x > 0 ? [[0.25, 0.04, 0.02], [0.06, 0.26, 0.05]] : null),
      hip: (x) => (x > 0 ? [[0.2, -0.2, -0.06], [-0.24, -0.26, 0.12]] : null),
      crossed: (x) => [[x * 0.05, -0.27, 0.07], [-x * 0.25, 0.06 + (x > 0 ? 0.04 : 0), 0.1]],
      point: (x) => (x > 0 ? [[0.12, -0.04, 0.26], [0.06, 0.02, 0.25]] : null),
    };
    const sleeves: [P, P][] = [];
    for (const x of [-1, 1]) {
      const shoulder: P = [x * 0.185, slump ? 1.46 : 1.49, -0.02];
      if (a.state === 'armless' && x < 0) {
        k(s.tube([shoulder, [shoulder[0] - 0.02, shoulder[1] - 0.08, 0], [shoulder[0] + 0.02, shoulder[1] - 0.16, 0.02]], 0.003, iron));
        continue;
      }
      const offs = arms[a.pose](x) ?? [[x * 0.035, -0.3, 0.0 + (slump ? 0.04 : 0)], [x * (0.02 + random() * 0.03), -0.25, 0.04 + random() * 0.04]];
      const elbow: P = [shoulder[0] + offs[0][0], shoulder[1] + offs[0][1], shoulder[2] + offs[0][2]];
      const wrist: P = [elbow[0] + offs[1][0], elbow[1] + offs[1][1], elbow[2] + offs[1][2]];
      limb(shoulder, elbow, 0.014, bone, 1.7);
      if (a.bones === 'painted') k(s.rod(shoulder, [mix(shoulder[0], elbow[0], 0.4), mix(shoulder[1], elbow[1], 0.4), mix(shoulder[2], elbow[2], 0.4)], 0.016, x > 0 ? red : blue));
      limb(elbow, wrist, 0.01, bone, 1.5);
      k(s.rod([elbow[0] + 0.012, elbow[1], elbow[2] + 0.012], [wrist[0] + 0.014, wrist[1], wrist[2] + 0.008], 0.007, bone));
      hand(wrist, new THREE.Vector3(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]));
      sleeves.push([shoulder, elbow], [elbow, wrist]);
    }

    // Legs.
    for (const x of [-1, 1]) {
      const hip: P = [x * 0.098, 0.955, 0], knee: P = [x * 0.078, 0.545, 0.02 + random() * 0.02], ankle: P = [x * 0.072, 0.155, 0];
      k(s.ball([0.026, 0.026, 0.026], hip, bone, 12));
      limb(hip, knee, 0.017, bone, 1.6);
      if (a.bones === 'painted') k(s.rod([mix(hip[0], knee[0], 0.1), mix(hip[1], knee[1], 0.1), 0.004], [mix(hip[0], knee[0], 0.5), mix(hip[1], knee[1], 0.5), 0.014], 0.019, x > 0 ? blue : red));
      k(s.ball([0.022, 0.024, 0.016], [knee[0], knee[1], knee[2] + 0.022], bone, 10));
      if (a.state === 'leg' && x > 0) {
        k(s.tube([knee, [knee[0], knee[1] - 0.08, knee[2]], [knee[0] + 0.02, knee[1] - 0.14, knee[2] + 0.01]], 0.003, iron));
        // The fallen shin lies across the base.
        const ly = a.stand === 'chrome' ? 0.1 : 0.075;
        const lost = new THREE.Group();
        lost.position.set(0.02, ly, 0.2);
        lost.rotation.y = 0.5 + random() * 0.8;
        s.root.add(lost);
        lost.add(s.rod([-0.2, 0, 0], [0.19, 0, 0], 0.014, bone), s.rod([-0.19, 0, 0.024], [0.18, 0, 0.02], 0.008, bone), s.ball([0.022, 0.022, 0.022], [-0.2, 0, 0], bone, 10), s.box([0.13, 0.022, 0.055], [0.24, 0, 0.02], bone));
        continue;
      }
      limb(knee, ankle, 0.013, bone, 1.5);
      k(s.rod([knee[0] + x * 0.024, knee[1] - 0.02, knee[2] - 0.005], [ankle[0] + x * 0.022, ankle[1], ankle[2] - 0.005], 0.007, bone));
      k(s.ball([0.022, 0.022, 0.028], [ankle[0], ankle[1] - 0.03, ankle[2] - 0.02], bone, 10));
      const foot = k(s.box([0.055, 0.02, 0.12], [ankle[0], ankle[1] - 0.065, ankle[2] + 0.045], bone));
      foot.rotation.x = 0.7;
      for (let i = 0; i < 4; i++) k(s.rod([ankle[0] - 0.021 + i * 0.014, ankle[1] - 0.1, ankle[2] + 0.09], [ankle[0] - 0.03 + i * 0.02, ankle[1] - 0.135, ankle[2] + 0.125], 0.006, bone));
    }

    // Costume.
    const hat = (build: (add: (m: THREE.Object3D) => void) => void) => {
      const g = new THREE.Group();
      g.position.set(0, 0.085, -0.012);
      g.rotation.set(-0.12, 0, (random() - 0.5) * 0.4);
      skull.add(g);
      build((m) => g.add(m));
    };
    const stripeA = bright(['#a8262c', '#1f4f9c', '#2f7d4a', '#6a2c8a'][Math.floor(random() * 4)]), stripeB = bright(['#f2c318', '#f1efe6', '#e8e2c8'][Math.floor(random() * 3)]);
    if (a.dress === 'coat') {
      const cloth = s.material('#f3f3ee', { roughness: 0.9 });
      k(s.box([0.42, 0.78, 0.02], [0, 1.14, -0.125], cloth));
      for (const x of [-1, 1]) {
        const flap = k(s.box([0.14, 0.78, 0.018], [x * 0.155, 1.14, 0.105], cloth));
        flap.rotation.y = x * -0.3;
        k(s.box([0.02, 0.78, 0.23], [x * 0.21, 1.14, -0.01], cloth));
        k(s.box([0.14, 0.03, 0.25], [x * 0.15, 1.535, -0.01], cloth));
        const lapel = k(s.box([0.06, 0.2, 0.01], [x * 0.1, 1.42, 0.125], cloth));
        lapel.rotation.z = x * -0.35;
      }
      k(s.box([0.09, 0.1, 0.006], [0.155, 1.0, 0.118], s.material('#e2e2dc'))).rotation.y = -0.3;
      for (let i = 0; i < 3; i++) k(s.rod([-0.18 + i * 0.022, 1.3, 0.12], [-0.18 + i * 0.022, 1.39, 0.12], 0.006, s.material(['#1c3fa0', '#c0202a', '#1d1d1d'][i])));
      for (const [from, to] of sleeves) k(s.rod(from, to, 0.042, cloth, 0.038));
      for (const x of [-1, 1]) {
        const lens = h(s.cylinder(0.027, 0.029, 0.025, [x * 0.031, -0.01, 0.098], s.material('#bfe6f0', { roughness: 0.15 }), 14));
        lens.rotation.x = Math.PI / 2;
      }
      h(s.ring(0.092, 0.006, [0, -0.005, -0.005], iron)).rotation.x = Math.PI / 2;
    } else if (a.dress === 'winter') {
      hat((add) => {
        const dome = s.mesh(new THREE.SphereGeometry(0.094, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), stripeA, [0, -0.04, 0]);
        dome.scale.y = 1.25;
        const band = s.cylinder(0.098, 0.098, 0.04, [0, -0.03, 0], stripeB, 20);
        add(dome); add(band); add(s.ball([0.035, 0.035, 0.035], [0, 0.085, 0], stripeB, 10));
      });
      const wrap = k(s.ring(0.062, 0.03, [0, 1.565, -0.005], stripeA));
      wrap.rotation.x = Math.PI / 2;
      for (const [x, len] of [[-0.055, 0.5], [0.06, 0.34]] as const) {
        const n = Math.round(len / 0.06);
        for (let i = 0; i < n; i++) k(s.box([0.075, 0.062, 0.014], [x + i * 0.002 * Math.sign(x), 1.54 - i * 0.06, 0.1 + Math.sin(i) * 0.008 + (x > 0 ? 0.012 : 0)], i % 2 ? stripeB : stripeA));
      }
    } else if (a.dress === 'santa') {
      const crimson = bright('#c8202a'), fur = s.material('#f6f4ee', { roughness: 1 });
      hat((add) => {
        const cone = s.mesh(new THREE.ConeGeometry(0.09, 0.2, 18), crimson, [0.02, 0.07, 0]);
        cone.rotation.z = -0.35;
        const brim = s.ring(0.09, 0.022, [0, -0.02, 0], fur);
        brim.rotation.x = Math.PI / 2;
        add(cone); add(brim); add(s.ball([0.03, 0.03, 0.03], [0.065, 0.16, 0], fur, 10));
      });
      const gold = new THREE.MeshStandardMaterial({ color: '#f0c23a', metalness: 0.7, roughness: 0.3, emissive: '#a87a10', emissiveIntensity: 0.5 });
      const loops = Math.round(mix(2, 5, mood.density));
      const pts: P[] = [];
      for (let i = 0; i <= loops * 10; i++) {
        const t = i / 10 * Math.PI * 2, y = 1.52 - i / (loops * 10) * 0.55, r = 0.15 - Math.abs(y - 1.3) * 0.12;
        pts.push([Math.cos(t) * r, y + Math.sin(t * 3) * 0.006, -0.02 + Math.sin(t) * r * 0.85]);
      }
      k(s.tube(pts, 0.016, gold));
    } else if (a.dress === 'party') {
      hat((add) => {
        const cone = s.mesh(new THREE.ConeGeometry(0.06, 0.2, 18), stripeA, [0.02, 0.09, 0.01]);
        cone.rotation.z = -0.2;
        add(cone); add(s.ball([0.02, 0.02, 0.02], [0.04, 0.19, 0.01], stripeB, 8));
        for (let i = 0; i < 3; i++) { const r = s.ring(0.05 - i * 0.014, 0.006, [0.008 + i * 0.01, 0.03 + i * 0.05, 0.01], stripeB); r.rotation.x = Math.PI / 2; r.rotation.y = -0.2; add(r); }
      });
      h(s.box([0.14, 0.036, 0.012], [0, -0.012, 0.098], iron));
      for (const x of [-1, 1]) h(s.rod([x * 0.07, -0.012, 0.095], [x * 0.082, -0.005, 0], 0.004, iron));
      const tie = bright(['#c8202a', '#1f6f4c', '#d88a1c'][Math.floor(random() * 3)]);
      const knot = k(s.ring(0.045, 0.012, [0, 1.555, 0.0], tie));
      knot.rotation.x = Math.PI / 2;
      k(s.box([0.035, 0.035, 0.02], [0, 1.52, 0.085], tie));
      const blade = k(s.mesh(new THREE.ConeGeometry(0.04, 0.34, 4), tie, [0.01, 1.35, 0.118]));
      blade.rotation.set(-0.15, Math.PI / 4, 0.05);
      blade.scale.z = 0.25;
    } else if (a.dress === 'graduate') {
      const black = s.material('#1c1d22', { roughness: 0.8 });
      hat((add) => {
        add(s.cylinder(0.088, 0.092, 0.045, [0, 0, 0], black, 18));
        const board = s.box([0.27, 0.012, 0.27], [0, 0.03, 0], black);
        board.rotation.y = 0.5;
        add(board);
        add(s.ball([0.012, 0.008, 0.012], [0, 0.04, 0], bright('#f2c318'), 8));
        add(s.tube([[0, 0.04, 0], [0.09, 0.04, 0.09], [0.125, 0.02, 0.125], [0.125, -0.07, 0.125]], 0.004, bright('#f2c318')));
        add(s.cylinder(0.004, 0.014, 0.05, [0.125, -0.09, 0.125], bright('#f2c318'), 8));
      });
    } else if (a.dress === 'top') {
      const black = s.material('#18181c', { roughness: 0.5 });
      hat((add) => {
        add(s.cylinder(0.082, 0.078, 0.17, [0, 0.075, 0], black, 20));
        add(s.cylinder(0.125, 0.125, 0.01, [0, -0.008, 0], black, 24));
        add(s.cylinder(0.08, 0.08, 0.025, [0, 0.01, 0], bright('#8a2030'), 20));
        if (mood.wear > 0.5) { const dent = s.box([0.06, 0.05, 0.02], [0.02, 0.12, 0.072], black); dent.rotation.z = 0.5; add(dent); }
      });
      for (const x of [-1, 1]) {
        const wing = k(s.mesh(new THREE.ConeGeometry(0.03, 0.065, 4), bright('#8a2030'), [x * 0.038, 1.555, 0.07]));
        wing.rotation.z = x * Math.PI / 2;
        wing.scale.z = 0.4;
      }
      k(s.ball([0.012, 0.012, 0.012], [0, 1.555, 0.072], bright('#8a2030'), 8));
    }

    // A card round the neck.
    if (a.sign !== 'none') {
      const text = { bones: 'MR BONES', late: 'LATE AGAIN', detention: 'DETENTION', last: 'LAST DAY', touch: 'DO NOT TOUCH' }[a.sign];
      const cy = 1.2 + random() * 0.06;
      const card = k(s.label(text, 0.3, 0.12, [0, cy, 0.155], a.sign === 'touch' || a.sign === 'detention' ? '#b0202a' : '#22262e', '#f1ead2'));
      card.rotation.set(-0.12, 0, (random() - 0.5) * 0.2);
      for (const x of [-1, 1]) k(s.rod([x * 0.13, cy + 0.055, 0.15], [x * 0.05, 1.56, -0.01], 0.0025, s.material('#8a6a3a')));
    }

    // Stand.
    if (a.stand === 'chrome') {
      for (let i = 0; i < 5; i++) {
        const t = i / 5 * Math.PI * 2 + 0.3, x = Math.sin(t) * 0.33, z = -0.2 + Math.cos(t) * 0.33;
        s.rod([0, 0.075, -0.2], [x, 0.065, z], 0.016, steel);
        s.ball([0.03, 0.03, 0.03], [x, 0.03, z], iron, 10);
      }
      s.cylinder(0.04, 0.05, 0.06, [0, 0.09, -0.2], steel, 14);
      s.cylinder(0.014, 0.016, 1.9, [0, 1.02, -0.2], steel, 12);
      s.tube([[0, 1.95, -0.2], [0, 2.0, -0.17], [0, 2.0, -0.03], [0, 1.96, 0], [0, 1.77, 0]], 0.009, steel);
    } else if (a.stand === 'wood') {
      s.box([0.6, 0.045, 0.6], [0, 0.07, -0.05], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.028, 0.028, 0.03, [x * 0.25, 0.028, -0.05 + z * 0.25], iron, 10).rotation.z = Math.PI / 2;
      s.lathe([[0, 0], [0.045, 0], [0.045, 0.06], [0.028, 0.1], [0.034, 0.5], [0.024, 0.56], [0.03, 1.2], [0.022, 1.8], [0.035, 1.85], [0, 1.9]], wood, [0, 0.09, -0.24]);
      s.box([0.04, 0.05, 0.3], [0, 1.96, -0.1], wood);
      s.rod([0, 1.8, -0.24], [0, 1.94, -0.1], 0.012, wood);
      s.tube([[0, 1.94, 0.02], [0, 1.86, 0.02], [0, 1.83, 0], [0, 1.77, 0]], 0.006, iron);
    } else {
      const cw = 0.78, cd = 0.52, ch = 2.08, cz = -0.03;
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d5ecef', transparent: true, opacity: 0.14, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
      s.box([cw, 0.1, cd], [0, 0.1, cz], wood);
      s.box([cw + 0.04, 0.08, cd + 0.04], [0, ch, cz], wood);
      s.box([cw, ch - 0.15, 0.02], [0, ch / 2 + 0.07, cz - cd / 2 + 0.01], s.material('#3d4a44'));
      for (const x of [-1, 1]) {
        for (const z of [-1, 1]) {
          s.box([0.04, ch - 0.15, 0.04], [x * (cw / 2 - 0.02), ch / 2 + 0.07, cz + z * (cd / 2 - 0.02)], wood);
          s.cylinder(0.03, 0.03, 0.03, [x * (cw / 2 - 0.06), 0.03, cz + z * (cd / 2 - 0.06)], iron, 10).rotation.z = Math.PI / 2;
        }
        s.box([0.006, ch - 0.2, cd - 0.08], [x * (cw / 2 - 0.02), ch / 2 + 0.07, cz], glass);
      }
      const door = new THREE.Group();
      door.position.set(-cw / 2, 0, cz + cd / 2);
      door.rotation.y = -mix(1.7, 2.5, random());
      s.root.add(door);
      const dh = ch - 0.2;
      door.add(s.box([cw, 0.05, 0.03], [cw / 2, 0.17, 0], wood), s.box([cw, 0.05, 0.03], [cw / 2, 0.17 + dh, 0], wood), s.box([0.05, dh, 0.03], [0.025, 0.17 + dh / 2, 0], wood), s.box([0.05, dh, 0.03], [cw - 0.025, 0.17 + dh / 2, 0], wood), s.box([cw - 0.08, dh - 0.04, 0.005], [cw / 2, 0.17 + dh / 2, 0], glass), s.ball([0.018, 0.018, 0.018], [cw - 0.03, 1.05, 0.03], s.material('#b08a3c', { metalness: 0.8, roughness: 0.3 }), 10));
      s.tube([[0, ch - 0.04, 0], [0, 1.9, 0], [0, 1.86, 0.015], [0, 1.77, 0]], 0.006, iron);
    }

    if (a.pose === 'hip') pivot.rotation.z = 0.04;
    const base = pivot.rotation.z, swing = mix(0.004, 0.05, mood.energy), phase = random() * 6;
    return s.finish({
      update(_dt, time) {
        pivot.rotation.z = base + Math.sin(time * 1.9 + phase) * swing;
        pivot.rotation.y = Math.sin(time * 0.8 + phase) * swing * 2.5;
      },
    });
  },
});
