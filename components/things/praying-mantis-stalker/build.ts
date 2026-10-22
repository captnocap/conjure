import * as THREE from 'three';
import { choice, defineThing, mix } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, field, finish, leaf, matte, paint, tube, xf } from './bits';

const COLOURS = {
  green: { body: '#6fa54a', dark: '#46762f', eye: '#a9cf6e', text: 'Fresh leaf green, the classic garden mantis.' },
  brown: { body: '#8c6b48', dark: '#5c4430', eye: '#b09468', text: 'Twig brown, mottled like dead wood.' },
  straw: { body: '#cdb67c', dark: '#9c8552', eye: '#d8c58e', text: 'Dry straw yellow, late summer grass.' },
  orchid: { body: '#f3e7ee', dark: '#e2a9c4', eye: '#f2c2d6', text: 'An orchid mantis: pearl white and pink, its legs flattened into petals.' },
  ghost: { body: '#7e6c5a', dark: '#54473a', eye: '#9c8a6c', text: 'A ghost mantis: crumpled grey-brown like a dead leaf, a leafy crest on its head.' },
} as const;
type Hue = keyof typeof COLOURS;

export default defineThing({
  questions: {
    colour: choice('What does the mantis look like?', Object.fromEntries(Object.entries(COLOURS).map(([key, value]) => [key, value.text])) as Record<Hue, string>),
    perch: choice('Where is it waiting?', {
      twig: 'Along a slanting bare twig, body pressed to the bark.',
      flower: 'On top of a flat white flower head, waiting for pollinators.',
      leaf: 'On a broad green leaf, half hidden.',
      ground: 'On the ground among a few fallen leaves.',
    }),
    pose: choice('What are its forelegs doing?', {
      folded: 'Folded together under its face, "praying", absolutely still.',
      raised: 'Lifted and half open, spines bared, about to strike.',
      threat: 'Rearing in a threat display, wings flared up behind it and forelegs spread wide.',
      grooming: 'One foreleg raised to its mouth, cleaning, almost casual.',
    }),
    gaze: choice('Where is its head turned?', {
      cocked: 'Tilted sideways, watching something with unnerving interest.',
      straight: 'Staring straight ahead.',
      back: 'Swivelled right round to look over its shoulder.',
    }),
    prey: choice('Has it caught anything?', {
      nothing: 'Nothing yet: still hunting.',
      fly: 'A fly clamped in its forelegs.',
      moth: 'A pale moth, wings askew, half eaten.',
      bee: 'A striped bee, struggling.',
    }),
    age: choice('How grown is it?', {
      adult: 'A full-grown adult with long folded wings over its back.',
      nymph: 'A small wingless nymph, its abdomen curled up over its back like a scorpion.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const hue = COLOURS[a.colour];
    const nymph = a.age === 'nymph';
    const body = new THREE.Color(hue.body).lerp(new THREE.Color('#9a8a62'), mood.wear * 0.3);
    const dark = new THREE.Color(hue.dark);

    // ---- The perch, and the frame the mantis stands in: origin on the surface, +y off it, +z forward.
    const perch = new Bag();
    const frame = new THREE.Matrix4();
    let footSpread = 0.0105, footDrop = 0;
    if (a.perch === 'twig') {
      const curve = new THREE.CatmullRomCurve3([V(0.004, -0.003, -0.075), V(0.002, 0.02, -0.025), V(-0.001, 0.036, 0.015), V(0.002, 0.048, 0.05)]);
      perch.add(tube(curve.getSpacedPoints(24), (t) => mix(0.0032, 0.0018, t), { sides: 9, colour: (t) => new THREE.Color('#6d5a45').lerp(new THREE.Color('#8f7b62'), 0.4 * Math.sin(t * 37) ** 2) }));
      perch.add(tube(arc(curve.getPointAt(0.42), curve.getPointAt(0.42).add(V(-0.022, 0.018, 0.004)), V(0, 0.003, 0), 6), (t) => mix(0.0016, 0.0007, t), { sides: 7 }), '#6d5a45');
      const t = 0.52, at = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      const up = V(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize();
      const side = up.clone().cross(tangent).normalize();
      frame.makeBasis(side, up, tangent).setPosition(at.clone().addScaledVector(up, 0.0026));
      footSpread = 0.0042; footDrop = -0.0018;
    } else if (a.perch === 'flower') {
      perch.add(tube([V(0, -0.002, 0), V(0.002, 0.03, 0.001), V(0, 0.056, 0)], (t) => mix(0.0022, 0.0016, t), { sides: 8, smooth: 12 }), '#6a8a3a');
      perch.add(leaf(0.03, 0.009, { fold: 0.3, droop: 0.4, colour: (t, s) => new THREE.Color('#5f8a34').lerp(new THREE.Color('#87a84a'), Math.abs(s) * 0.3 + t * 0.2) }), null, xf(V(0.001, 0.02, 0), 1, new THREE.Euler(-0.5, 2.2, 0)));
      // A flat umbel: a dome of tiny white florets.
      // Sub-umbels: little domes of florets on green rays.
      const florets: THREE.Vector3[] = [];
      for (let c = 0; c < 8; c++) {
        const angle = (c / 8) * TAU + random() * 0.3, reach = c === 7 ? 0 : 0.016;
        const hub = V(Math.cos(angle) * reach, 0.058 + (c === 7 ? 0.003 : 0), Math.sin(angle) * reach);
        for (let i = 0; i < 12; i++) {
          const r = Math.sqrt(random()) * 0.0075, b = random() * TAU;
          florets.push(hub.clone().add(V(Math.cos(b) * r, 0.0025 * (1 - (r / 0.0075) ** 2), Math.sin(b) * r)));
        }
      }
      for (const p of florets) perch.add(new THREE.SphereGeometry(0.0021, 6, 4), new THREE.Color('#f4f1e6').lerp(new THREE.Color('#e9dfb8'), random() * 0.5), xf(p, V(1, 0.6, 1)));
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * TAU;
        perch.add(tube([V(0, 0.056, 0), V(Math.cos(angle) * 0.014, 0.059, Math.sin(angle) * 0.014)], 0.0006, { sides: 4 }), '#7a9a46');
      }
      frame.makeTranslation(0.002, 0.0625, 0.003);
      footSpread = 0.0105;
    } else if (a.perch === 'leaf') {
      perch.add(tube([V(0.004, -0.002, -0.05), V(0.002, 0.012, -0.046), V(0, 0.02, -0.04)], (t) => mix(0.0022, 0.0016, t), { sides: 8, smooth: 10 }), '#5f7f32');
      const tilt = new THREE.Euler(-0.18, 0, 0.06);
      perch.add(leaf(0.1, 0.055, { fold: 0.12, droop: 0.04, colour: (t, s) => (Math.abs(s) < 0.05 ? new THREE.Color('#a9c86a') : new THREE.Color('#4f8a34').lerp(new THREE.Color('#77a844'), t * 0.3 + Math.abs(s) * 0.2).lerp(new THREE.Color('#8f8a3a'), mood.wear * 0.4)) }), null, xf(V(0, 0.02, -0.04), 1, tilt));
      frame.compose(V(0, 0.02 + Math.sin(0.18) * 0.04 + 0.0005, 0.0), new THREE.Quaternion().setFromEuler(tilt), V(1, 1, 1));
      footSpread = 0.0105;
    } else {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * TAU + random();
        perch.add(leaf(0.035 + random() * 0.015, 0.02, { fold: -0.15, droop: -0.05, twist: 0.3, colour: (t) => new THREE.Color(['#8a6a44', '#a07a48', '#6f5a40', '#b08a52'][i]).lerp(new THREE.Color('#5a4630'), t * 0.4) }), null, xf(V(Math.cos(angle) * 0.03, 0.0012 + i * 0.0004, Math.sin(angle) * 0.03), 1, new THREE.Euler(0, angle + 1.6, 0)));
      }
      frame.makeTranslation(0, 0.0012, 0);
      footSpread = 0.012;
    }
    perch.into(root, matte({ roughness: 0.85, side: THREE.DoubleSide }));

    // ---- The mantis, built in its own frame.
    const holder = new THREE.Group();
    holder.matrixAutoUpdate = false;
    holder.matrix.copy(frame);
    root.add(holder);
    const mantis = new THREE.Group(); // sways inside the holder
    holder.add(mantis);
    const size = nymph ? 0.72 : 1;
    mantis.scale.setScalar(size);
    const shell = new Bag();
    const tone = (t: number) => body.clone().lerp(dark, 0.25 * Math.max(0, Math.sin(t * 34)) + (a.colour === 'ghost' ? 0.3 * Math.max(0, noise(V(t * 9, 0, 0), 1)) : 0));
    const h = 0.0074; // thorax height above the surface

    // Thorax and abdomen.
    const abdomenPath = nymph
      ? [V(0, h, 0.006), V(0, h - 0.0004, 0), V(0, h + 0.002, -0.01), V(0, h + 0.009, -0.017), V(0, h + 0.016, -0.015), V(0, h + 0.019, -0.009)]
      : [V(0, h, 0.006), V(0, h - 0.0004, 0), V(0, h + 0.0002, -0.012), V(0, h + 0.0015, -0.026), V(0, h + 0.003, -0.037)];
    shell.add(tube(abdomenPath, (t) => (t < 0.12 ? 0.0017 : 0.0017 + 0.0027 * Math.sin(Math.min(1, (t - 0.12) / 0.88) * Math.PI) ** 0.7 + (t > 0.92 ? -0.0006 : 0)), { sides: 12, smooth: 30, flat: 0.72, up: V(0, 1, 0), colour: (t) => (t > 0.12 ? tone(t) : body) }));
    // Prothorax: the long neck, angled up.
    const neckAngle = a.pose === 'threat' && !nymph ? 1.0 : 0.72;
    const neckLength = 0.022;
    const neckBase = V(0, h + 0.0002, 0.005), neckTip = neckBase.clone().add(V(0, Math.sin(neckAngle) * neckLength, Math.cos(neckAngle) * neckLength));
    shell.add(tube([neckBase, neckBase.clone().lerp(neckTip, 0.6), neckTip], (t) => mix(0.0013, 0.0019, Math.pow(t, 3)), { sides: 10, flat: 0.8, up: V(0, Math.cos(neckAngle), -Math.sin(neckAngle)), colour: () => body }));
    // Wings folded over the abdomen.
    if (!nymph && a.pose !== 'threat')
      for (const s of [-1, 1])
        shell.add(leaf(0.036, 0.0088, { fold: -0.35, droop: 0.02, tip: 0.6, colour: (t, w) => body.clone().lerp(dark, Math.abs(w) < 0.12 ? 0.35 : 0.08).lerp(new THREE.Color('#ffffff'), a.colour === 'orchid' ? 0.15 : 0) }), null, xf(V(s * 0.0007, h + 0.0034, 0.004), 1, new THREE.Euler(-0.05, Math.PI + s * 0.04, s * 0.05)));
    if (a.pose === 'threat' && !nymph) {
      // Flared hind wings: two fans with dark eyespots, raised behind.
      for (const s of [-1, 1]) {
        const fan = new THREE.CircleGeometry(0.024, 24, 0, Math.PI * 0.62);
        paint(fan, (q) => {
          const r = Math.hypot(q.x, q.y) / 0.024, spot = Math.hypot(q.x - 0.012, q.y - 0.008);
          const c = body.clone().lerp(new THREE.Color('#e9e2c8'), 0.35).lerp(dark, r * 0.3);
          if (spot < 0.0045) c.lerp(new THREE.Color('#1a1418'), 0.9);
          if (spot < 0.002) c.set('#e8e2a0');
          return c;
        });
        shell.add(fan, null, xf(V(s * 0.001, h + 0.003, -0.002), V(s, 1, 1), new THREE.Euler(-0.5, s * 0.5, 0)));
      }
    }

    // Walking legs: middle and hind, knees high, feet on the surface.
    const legTone = body.clone().lerp(dark, 0.2);
    for (const s of [-1, 1]) {
      for (const [hipZ, kneeZ, footZ, reach] of [[0.0035, 0.009, 0.013, 1], [-0.001, -0.009, -0.019, 1.15]] as const) {
        const hip = V(s * 0.0016, h - 0.0008, hipZ);
        const knee = V(s * 0.0085 * reach * Math.min(1, footSpread / 0.008), h + 0.005, kneeZ);
        const foot = V(s * footSpread * reach, footDrop, footZ);
        shell.add(tube([hip, knee], (t) => mix(0.0007, 0.0006, t), { sides: 6 }), legTone);
        shell.add(tube([knee, foot], (t) => mix(0.00055, 0.00042, t), { sides: 6 }), legTone);
        shell.add(tube([foot, foot.clone().add(V(s * 0.0006, 0.0002, kneeZ > 0 ? 0.003 : -0.003))], 0.0004, { sides: 5 }), dark);
        if (a.colour === 'orchid' || a.colour === 'ghost') {
          // Petal lobes on the thighs.
          const mid = hip.clone().lerp(knee, 0.55);
          shell.add(leaf(0.006, 0.006, { fold: 0.1, droop: 0, tip: 1.3, colour: () => (a.colour === 'orchid' ? new THREE.Color('#f0b8d0') : dark) }), null, aimLobe(mid, knee.clone().sub(hip).normalize(), s));
        }
      }
    }

    // Raptorial forelegs from the front of the prothorax.
    const coxaTop = neckBase.clone().lerp(neckTip, 0.82);
    const prey = new Bag();
    const preyAt = coxaTop.clone().add(V(0, -0.006, 0.008));
    for (const s of [-1, 1]) {
      const top = coxaTop.clone().add(V(s * 0.0014, -0.0008, 0));
      let coxa: THREE.Vector3, femur: THREE.Vector3, tibia: THREE.Vector3;
      const grooming = a.pose === 'grooming' && s === 1;
      if (a.pose === 'raised') {
        coxa = top.clone().add(V(s * 0.0012, -0.0065, 0.004));
        femur = coxa.clone().add(V(s * 0.0006, 0.0085, 0.0065));
        tibia = femur.clone().add(V(0, -0.0015, 0.0065));
      } else if (a.pose === 'threat') {
        coxa = top.clone().add(V(s * 0.0055, -0.004, 0.003));
        femur = coxa.clone().add(V(s * 0.0075, 0.007, 0.001));
        tibia = femur.clone().add(V(s * 0.004, -0.0025, 0.004));
      } else if (grooming) {
        coxa = top.clone().add(V(s * 0.001, -0.006, 0.003));
        femur = coxa.clone().add(V(-s * 0.0005, 0.0095, 0.0045));
        tibia = femur.clone().add(V(-s * 0.0018, -0.0012, -0.0025));
      } else {
        coxa = top.clone().add(V(s * 0.0011, -0.0075, 0.0036));
        femur = coxa.clone().add(V(s * 0.0002, 0.0062, 0.0046));
        tibia = femur.clone().add(V(-s * 0.0003, -0.0052, -0.0012));
      }
      shell.add(tube([top, coxa], (t) => mix(0.0011, 0.0009, t), { sides: 7 }), body);
      shell.add(tube([coxa, coxa.clone().lerp(femur, 0.5).add(V(0, 0, 0.0004)), femur], (t) => 0.0006 + 0.0005 * Math.sin(t * Math.PI), { sides: 7, flat: 0.6, up: V(s, 0, 0) }), body);
      shell.add(tube([femur, tibia], (t) => mix(0.00055, 0.0003, t), { sides: 6 }), legTone);
      shell.add(tube([tibia, tibia.clone().add(V(0, -0.0012, -0.0008))], 0.00025, { sides: 4 }), dark);
      // Spines along the inner edge of the femur.
      for (let k = 1; k < 6; k++) {
        const p = coxa.clone().lerp(femur, k / 6);
        const toward = tibia.clone().sub(p).normalize();
        shell.add(tube([p, p.clone().addScaledVector(toward, 0.0013)], (t) => mix(0.00025, 0.00004, t), { sides: 4 }), dark);
      }
      if (a.colour === 'orchid') shell.add(leaf(0.005, 0.004, { fold: 0, droop: 0, tip: 1.2, colour: () => new THREE.Color('#f0b8d0') }), null, aimLobe(coxa.clone().lerp(femur, 0.5), femur.clone().sub(coxa).normalize(), s));
    }

    // Prey held in the forelegs.
    if (a.prey === 'fly') {
      prey.add(paint(blob(V(0.0022, 0.002, 0.0036), null), () => '#2c2a2e'), null, xf(preyAt, 1, new THREE.Euler(0.8, 0.4, 0)));
      prey.add(paint(blob(V(0.0018, 0.0016, 0.0016), null), () => '#7a2a20'), null, xf(preyAt.clone().add(V(0.001, 0.003, 0.002))));
      for (const s of [-1, 1]) prey.add(leaf(0.006, 0.003, { fold: 0, droop: 0, colour: () => '#c9cdd2' }), null, xf(preyAt.clone().add(V(s * 0.001, 0.001, -0.001)), 1, new THREE.Euler(0.4, Math.PI + s * 0.6, s * 0.4)));
    } else if (a.prey === 'moth') {
      prey.add(paint(blob(V(0.0018, 0.0018, 0.0048), null), () => '#d8ccb0'), null, xf(preyAt, 1, new THREE.Euler(0.9, 0.2, 0.3)));
      prey.add(leaf(0.011, 0.009, { fold: 0.1, droop: 0.1, tip: 1.1, colour: (t) => new THREE.Color('#e6dcc2').lerp(new THREE.Color('#b8a888'), t) }), null, xf(preyAt.clone().add(V(0.001, 0, 0)), 1, new THREE.Euler(0.3, 1.9, 0.7)));
      prey.add(leaf(0.01, 0.008, { fold: 0.1, droop: 0.1, tip: 1.1, colour: (t) => new THREE.Color('#e6dcc2').lerp(new THREE.Color('#b8a888'), t) }), null, xf(preyAt.clone().add(V(-0.001, -0.001, 0)), 1, new THREE.Euler(-0.6, -1.4, -0.3)));
    } else if (a.prey === 'bee') {
      prey.add(paint(blob(V(0.0028, 0.0026, 0.0048), null), (q) => (Math.sin(q.z * 1500) > 0.2 ? '#1e1a16' : '#e8b22a')), null, xf(preyAt, 1, new THREE.Euler(0.7, 0.3, 0)));
      prey.add(paint(blob(V(0.0022, 0.0022, 0.0022), null), () => '#3a2e22'), null, xf(preyAt.clone().add(V(0, 0.0035, 0.0035))));
      for (const s of [-1, 1]) prey.add(leaf(0.006, 0.003, { fold: 0, droop: 0, colour: () => '#dfe4ea' }), null, xf(preyAt.clone().add(V(s * 0.0015, 0.003, 0.001)), 1, new THREE.Euler(0.9, Math.PI + s * 0.8, 0)));
    }

    shell.into(mantis, matte({ roughness: 0.55, side: THREE.DoubleSide }));
    prey.into(mantis, matte({ roughness: 0.6, side: THREE.DoubleSide }));

    // The head: a triangle with two great eyes, on a pivot so it can cock and turn.
    const head = new THREE.Group();
    head.position.copy(neckTip).add(V(0, 0.0018, 0.001));
    head.rotation.order = 'YXZ';
    const turn = a.gaze === 'back' ? 1.7 : a.gaze === 'cocked' ? -0.35 : 0;
    const cock = a.gaze === 'cocked' ? 0.5 : 0;
    head.rotation.set(0.35, turn, cock);
    mantis.add(head);
    const skull = new Bag();
    skull.add(paint(blob(V(0.0024, 0.0024, 0.0014), null), () => body), null, xf(V(0, -0.0006, 0.0004)));
    skull.add(tube([V(0, -0.0018, 0.0008), V(0, -0.0036, 0.0012)], (t) => mix(0.0011, 0.0004, t), { sides: 6 }), dark);
    for (const s of [-1, 1]) {
      skull.add(tube(arc(V(s * 0.0006, 0.0014, 0.0012), V(s * 0.006, 0.012, 0.012), V(s * 0.002, 0.002, -0.002), 8), (t) => mix(0.00022, 0.0001, t), { sides: 4 }), dark);
    }
    if (a.colour === 'ghost') skull.add(leaf(0.009, 0.006, { fold: 0.2, droop: -0.1, tip: 1.2, colour: () => dark }), null, xf(V(0, 0.0015, -0.0005), 1, new THREE.Euler(-1.2, 0, 0)));
    skull.into(head, matte({ roughness: 0.5, side: THREE.DoubleSide }));
    const eyes = new Bag();
    for (const s of [-1, 1]) {
      eyes.add(paint(blob(V(0.0017, 0.0019, 0.0016), null), (q) => (q.z > 0.0011 && Math.abs(q.x) < 0.0006 ? '#1a1612' : hue.eye)), null, xf(V(s * 0.0029, 0.0012, 0)));
    }
    eyes.into(head, matte({ roughness: 0.25, metalness: 0.1 }));

    // ---- Motion: the slow leaf-sway of a hunting mantis, and small twitches of the head.
    const sway = mix(0.015, 0.09, mood.energy);
    const rate = mix(0.6, 1.8, mood.energy);
    const rest = head.rotation.y;
    return finish(root, (_dt, time) => {
      mantis.rotation.z = Math.sin(time * rate) * sway;
      mantis.position.x = Math.sin(time * rate) * sway * 0.004;
      head.rotation.y = rest + (Math.sin(time * 0.37) > 0.92 ? 0.2 : 0) * (0.3 + mood.energy);
    });

    /** A matrix laying a small leaf-lobe along a limb, out to one side. */
    function aimLobe(at: THREE.Vector3, along: THREE.Vector3, side: number) {
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), along);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), side * 0.9));
      return new THREE.Matrix4().compose(at, q, V(1, 1, 1));
    }
  },
});
