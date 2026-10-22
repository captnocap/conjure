import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { arc, ball, cone, cyl, paint, tube } from './parts';

export default defineThing({
  questions: {
    breed: choice('Which flat-faced breed is it?', {
      pug: 'A pug: round apple head, small folded button ears, deep forehead wrinkles and a black mask.',
      frenchie: 'A French bulldog: big upright bat ears, square jaw, heavy jowls.',
      boston: 'A Boston terrier: black coat with a white blaze, white muzzle and white shirt front, neat pricked ears.',
    }),
    expression: choice('What is it doing right now?', {
      tilt: 'Head cocked hard to one side, listening to a word it knows.',
      grin: 'A wide panting grin, mouth open, delighted with everyone.',
      worried: 'Looking up from under its brow with the whites showing, sure something bad is coming.',
      asleep: 'Flat out asleep, face squashed sideways on its paws, snoring.',
    }),
    tongue: choice('Where is the tongue?', {
      in: 'Tucked away, mouth neat.',
      tip: 'Just the pink tip poking out between the lips, forgotten there.',
      lolling: 'Hanging long out of one side of the mouth.',
    }),
    eyes: choice('How do the eyes line up?', {
      straight: 'Both looking the same way.',
      wandering: 'One eye drifting off to the side on its own business.',
    }),
    age: choice('How old is it?', {
      puppy: 'A velvet puppy: oversized head and eyes, small soft body.',
      adult: 'A sturdy adult in its prime.',
      senior: 'A grey-muzzled senior with one clouded eye.',
    }),
    coat: choice('What colour is the coat?', {
      fawn: 'Pale biscuit fawn.',
      apricot: 'Warm orange apricot.',
      silver: 'Cool silver grey.',
      black: 'Solid glossy black.',
    }),
    accessory: choice('What is it wearing?', {
      none: 'Nothing but its own folds.',
      bandana: 'A triangular bandana tied round the neck.',
      harness: 'A padded walking harness with a chest strap and buckle.',
      collar: 'A plain collar with a round tag.',
    }),
    beside: choice('What lies at its feet?', {
      nothing: 'Nothing.',
      toy: 'A chewed rubber squeaky bone.',
      bowl: 'An empty food bowl, licked clean.',
      treats: 'A few scattered biscuit treats it has not noticed yet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const puppy = a.age === 'puppy', senior = a.age === 'senior';
    const boston = a.breed === 'boston', frenchie = a.breed === 'frenchie';
    const asleep = a.expression === 'asleep';

    const coatHex = { fawn: '#d9b98a', apricot: '#d99a58', silver: '#b4b1aa', black: '#2a2624' }[a.coat];
    const dark = boston || a.coat === 'black';
    const coat = s.material(boston ? '#26221f' : coatHex, { roughness: 0.9 });
    const maskHex = senior ? '#77726c' : dark ? '#3a3431' : '#2b2522';
    const mask = paint(boston ? '#f1ece2' : maskHex, { roughness: 0.85 });
    const white = paint('#f1ece2', { roughness: 0.9 });
    const earMat = paint(boston ? '#26221f' : dark ? '#1b1817' : '#2b2522', { roughness: 0.9 });
    const fold = paint(new THREE.Color(boston ? '#26221f' : coatHex).multiplyScalar(dark ? 1.9 : 0.62), { roughness: 0.9 });
    const noseMat = paint('#0d0c0c', { roughness: 0.25 });
    const pink = paint('#e8788a', { roughness: 0.5 });
    const mouthMat = paint('#5a1f26', { roughness: 0.6 });
    const scleraMat = paint('#f4f1ea', { roughness: 0.3 });
    const irisMat = paint('#3a1e0c', { roughness: 0.12 });
    const cloudy = paint('#7f97aa', { roughness: 0.3 });
    const glint = paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });

    const dog = new THREE.Group();
    s.root.add(dog);
    const head = new THREE.Group();
    const body = new THREE.Group();
    dog.add(body, head);

    // Body: a seated bust with stubby front legs, or a flattened sleeping loaf.
    const chest = asleep
      ? ball(body, coat, [0, 0.075, -0.05], [0.125, 0.078, 0.17])
      : ball(body, coat, [0, 0.145, -0.01], [0.108, 0.13, 0.098]);
    if (!asleep) {
      ball(body, coat, [0, 0.1, -0.11], [0.118, 0.1, 0.12]);
      ball(body, coat, [0, 0.245, 0.0], [0.082, 0.05, 0.078]); // neck roll
      for (const x of [-1, 1]) {
        cyl(body, coat, 0.03, 0.027, 0.13, [x * 0.062, 0.075, 0.062]);
        ball(body, boston ? white : coat, [x * 0.064, 0.018, 0.085], [0.034, 0.02, 0.044]);
        ball(body, coat, [x * 0.1, 0.05, -0.1], [0.045, 0.05, 0.075]);
      }
      if (boston) ball(body, white, [0, 0.15, 0.062], [0.06, 0.095, 0.05]);
    } else {
      for (const x of [-1, 1]) {
        ball(body, coat, [x * 0.085, 0.022, 0.16], [0.03, 0.022, 0.07], [0, x * 0.25, 0]);
        ball(body, boston ? white : coat, [x * 0.1, 0.018, 0.225], [0.032, 0.02, 0.036]);
        ball(body, coat, [x * 0.12, 0.04, -0.14], [0.05, 0.04, 0.085]);
      }
    }
    // The tight double-curled tail on the rump.
    const tail = arc(body, coat, 0.03, 0.013, Math.PI * 1.7, asleep ? [0.03, 0.14, -0.2] : [0.02, 0.2, -0.19], [0, Math.PI / 2 - 0.3, 0]);

    // Head, built around its own centre so it can tilt, lift or flop.
    const hs = puppy ? 1.12 : 1;
    ball(head, coat, [0, 0, 0], [0.108, 0.096, 0.094]);
    ball(head, coat, [0, 0.03, -0.02], [0.1, 0.085, 0.09]);
    // Mask over the muzzle and round the eyes.
    if (boston) {
      ball(head, white, [0, 0.03, 0.058], [0.022, 0.075, 0.04]); // blaze
      ball(head, white, [0, -0.03, 0.062], [0.066, 0.046, 0.04]);
    } else {
      ball(head, mask, [0, -0.012, 0.058], [0.082, 0.064, 0.044]);
      if (frenchie && !dark) ball(head, coat, [0, 0.052, 0.07], [0.03, 0.03, 0.02]);
    }
    // Jowl pads, chin and the pushed-in nose with its roll.
    const jowl = frenchie ? 1.25 : 1;
    for (const x of [-1, 1]) ball(head, mask, [x * 0.027, -0.04, 0.09], [0.036 * jowl, 0.03 * jowl, 0.03]);
    ball(head, mask, [0, -0.068, 0.078], [0.036, 0.02, 0.026]);
    ball(head, noseMat, [0, -0.014, 0.113], [0.021, 0.014, 0.012]);
    for (const x of [-1, 1]) ball(head, paint('#000000'), [x * 0.009, -0.016, 0.1235], [0.004, 0.003, 0.003], [0, 0, x * 0.5], 8);
    arc(head, boston ? fold : mask, 0.034, 0.0095, Math.PI * 0.9, [0, -0.022, 0.092], [-0.35, 0, Math.PI * 0.05]);
    // Forehead wrinkles: deeper on the pug, deeper still with age.
    const wrinkles = (a.breed === 'pug' ? 3 : 1) + (senior ? 1 : 0) - (puppy ? 1 : 0);
    for (let i = 0; i < wrinkles; i++) {
      arc(head, fold, 0.02 + i * 0.012, 0.0032, Math.PI * 0.7, [0, 0.07 + i * 0.002, 0.066 - i * 0.008], [-0.75 - i * 0.12, 0, Math.PI * 1.15 + (random() - 0.5) * 0.1]);
    }
    for (const x of [-1, 1]) arc(head, fold, 0.03, 0.003, Math.PI * 0.45, [x * 0.07, -0.02, 0.064], [0, x * 0.7, x > 0 ? -0.4 : Math.PI - 0.4 - Math.PI * 0.45 + 0.8]);

    // Eyes: big, wet, wide-set, and not necessarily in agreement.
    const eyeR = 0.0245 * (puppy ? 1.12 : 1);
    const wanderSide = random() < 0.5 ? -1 : 1;
    const cloudSide = random() < 0.5 ? -1 : 1;
    const lookUp = a.expression === 'worried' ? 0.55 : 0;
    for (const x of [-1, 1]) {
      const centre: [number, number, number] = [x * 0.05, 0.012, 0.074];
      if (asleep) {
        ball(head, boston ? coat : mask, centre, [eyeR, eyeR * 0.9, eyeR * 0.8]);
        arc(head, paint('#0b0a0a'), eyeR * 0.75, 0.0028, Math.PI * 0.8, [centre[0], centre[1] + 0.004, centre[2] + eyeR * 0.72], [0, x * 0.3, Math.PI * 1.1]);
        continue;
      }
      ball(head, scleraMat, centre, [eyeR, eyeR, eyeR]);
      const wander = a.eyes === 'wandering' && x === wanderSide;
      const gx = wander ? x * 0.75 : -x * 0.1, gy = wander ? -0.15 : lookUp;
      const dir = new THREE.Vector3(gx + x * 0.25, gy, 1).normalize();
      const off = eyeR * 0.16;
      const iris = senior && x === cloudSide ? cloudy : irisMat;
      ball(head, iris, [centre[0] + dir.x * off, centre[1] + dir.y * off, centre[2] + dir.z * off], [eyeR * 0.93, eyeR * 0.93, eyeR * 0.93]);
      const g = eyeR * 1.06;
      ball(head, glint, [centre[0] + dir.x * g - 0.006, centre[1] + dir.y * g + 0.008, centre[2] + dir.z * g - 0.003], [0.0042, 0.0042, 0.0042], [0, 0, 0], 8);
      // Upper lid: heavy when worried, barely there on a grin.
      const lid = a.expression === 'worried' ? 0.2 : a.expression === 'grin' ? 0.55 : 0.4;
      arc(head, boston ? coat : mask, eyeR * 1.02, 0.006, Math.PI * 0.95, [centre[0], centre[1] + eyeR * lid * 0.3, centre[2] + 0.006], [-0.5, x * 0.35, Math.PI * 0.03 + (a.expression === 'worried' ? x * 0.35 : 0)]);
    }

    // Ears.
    for (const x of [-1, 1]) {
      if (a.breed === 'pug') {
        ball(head, earMat, [x * 0.092, 0.058, 0.012], [0.03, 0.04, 0.013], [0.1, x * 0.5, x * -0.55]);
      } else if (frenchie) {
        ball(head, earMat, [x * 0.07, 0.125, -0.012], [0.04, 0.066, 0.014], [-0.1, x * -0.25, x * -0.28]);
        ball(head, paint('#c98d8a'), [x * 0.07, 0.122, -0.003], [0.026, 0.05, 0.008], [-0.1, x * -0.25, x * -0.28]);
      } else {
        cone(head, earMat, 0.03, 0.085, [x * 0.066, 0.12, -0.015], [-0.1, 0, x * -0.25], [1, 1, 0.4]);
        cone(head, paint('#c98d8a'), 0.017, 0.058, [x * 0.066, 0.112, -0.004], [-0.1, 0, x * -0.25], [1, 1, 0.3]);
      }
    }

    // Mouth and tongue.
    const open = a.expression === 'grin';
    if (open) {
      ball(head, mouthMat, [0, -0.064, 0.086], [0.04, 0.022, 0.024]);
      for (const x of [-1, 1]) cone(head, white, 0.0045, 0.012, [x * 0.02, -0.058, 0.103], [Math.PI, 0, 0], [1, 1, 1], 8);
      ball(head, mask, [0, -0.088, 0.076], [0.036, 0.014, 0.026]);
    } else {
      arc(head, paint('#0b0a0a'), 0.03, 0.0026, Math.PI * 0.7, [0, -0.036, 0.107], [0.5, 0, Math.PI * 1.15]);
    }
    let tongue: THREE.Object3D | null = null;
    if (a.tongue === 'tip') {
      tongue = ball(head, pink, [0.003, open ? -0.07 : -0.063, 0.11], [0.013, 0.006, 0.012], [0.5, 0, 0]);
    } else if (a.tongue === 'lolling') {
      const side = random() < 0.5 ? -1 : 1;
      const t = new THREE.Group();
      t.position.set(side * 0.02, open ? -0.066 : -0.06, 0.102);
      ball(t, pink, [side * 0.006, -0.02, 0.006], [0.015, 0.03, 0.007], [0.25, 0, side * 0.3]);
      ball(t, pink, [side * 0.013, -0.046, 0.008], [0.016, 0.012, 0.007], [0.2, 0, side * 0.3]);
      head.add(t);
      tongue = t;
    } else if (open) {
      ball(head, pink, [0, -0.07, 0.092], [0.022, 0.008, 0.02]);
    }

    // Pose.
    head.scale.setScalar(hs);
    if (asleep) {
      head.position.set(0.012, 0.082, 0.14);
      head.rotation.set(0.25, 0.1, 0.45);
      head.scale.set(hs * 1.08, hs * 0.86, hs);
    } else {
      head.position.set(0, 0.33, 0.035);
      if (a.expression === 'tilt') head.rotation.set(0.05, 0.1, (random() < 0.5 ? -1 : 1) * mix(0.42, 0.6, random()));
      else if (a.expression === 'worried') { head.rotation.set(0.32, 0, (random() - 0.5) * 0.1); head.position.y = 0.31; }
      else if (a.expression === 'grin') head.rotation.set(-0.18, (random() - 0.5) * 0.3, (random() - 0.5) * 0.12);
    }

    // Accessory.
    const accent = new THREE.Color().setHSL(mix(0.6, 0.02, mood.warmth), 0.65, mix(0.36, 0.52, mood.cheer));
    const strap = s.material(accent, { roughness: 0.7 });
    const metal = paint('#c9ccd0', { metalness: 0.85, roughness: 0.3 });
    const ny = asleep ? 0.09 : 0.248, nz = asleep ? 0.06 : 0.0;
    const nrot: [number, number, number] = asleep ? [0.2, 0, 0] : [Math.PI / 2 - 0.15, 0, 0];
    if (a.accessory === 'collar' || a.accessory === 'bandana') {
      if (!asleep) arc(body, strap, 0.083, 0.011, Math.PI * 2, [0, ny, nz], nrot);
      else arc(body, strap, 0.105, 0.011, Math.PI, [0, 0.07, 0.06], [0, 0, 0]).scale.y = 0.62;
    }
    if (a.accessory === 'collar' && !asleep) {
      cyl(body, metal, 0.017, 0.017, 0.003, [0, 0.215, 0.094], [Math.PI / 2 - 0.2, 0, 0]);
      arc(body, metal, 0.006, 0.0015, Math.PI * 2, [0, 0.234, 0.09]);
    }
    if (a.accessory === 'bandana' && !asleep) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.085, 0); shape.lineTo(0.085, 0); shape.lineTo(0, -0.1); shape.closePath();
      const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false }), strap);
      tri.position.set(0, 0.245, 0.088);
      tri.rotation.x = 0.3;
      tri.castShadow = true;
      body.add(tri);
      for (let i = 0; i < 5; i++) ball(body, white, [(random() - 0.5) * 0.07, 0.225 - random() * 0.035, 0.097 + 0.008], [0.005, 0.005, 0.002], [0.3, 0, 0], 8);
      ball(body, strap, [0.03, 0.262, -0.08], [0.018, 0.01, 0.014]);
    }
    if (a.accessory === 'harness') {
      if (!asleep) {
        arc(body, strap, 0.104, 0.013, Math.PI * 2, [0, 0.15, 0.0], [Math.PI / 2, 0, 0]);
        arc(body, strap, 0.086, 0.012, Math.PI * 2, [0, 0.238, 0.0], nrot);
        const y = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.012), strap);
        y.position.set(0, 0.195, 0.096); y.rotation.x = -0.1; y.castShadow = true; body.add(y);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.024, 0.012), paint('#1c1d20', { roughness: 0.4 }));
        buckle.position.set(0, 0.2, 0.104); body.add(buckle);
        arc(body, metal, 0.012, 0.003, Math.PI * 2, [0, 0.27, -0.075], [0.3, 0, 0]);
      } else {
        arc(body, strap, 0.126, 0.013, Math.PI, [0, 0.075, -0.03], [0, 0, 0]).scale.y = 0.64;
        arc(body, strap, 0.12, 0.013, Math.PI, [0, 0.075, -0.12], [0, 0, 0]).scale.y = 0.62;
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.1), strap);
        spine.position.set(0, 0.155, -0.075); body.add(spine);
        arc(body, metal, 0.012, 0.003, Math.PI * 2, [0, 0.17, -0.075], [0.3, 0, 0]);
      }
    }

    const size = puppy ? 0.68 : 1;
    dog.scale.setScalar(size);

    // What lies at its feet.
    const fx = (random() < 0.5 ? -1 : 1) * 0.19 * size, fz = 0.1 * size + (asleep ? 0.05 : 0);
    if (a.beside === 'toy') {
      const rubber = s.material(new THREE.Color().setHSL(mix(0.5, 0.1, mood.warmth), 0.8, 0.5), { roughness: 0.4 });
      const toy = new THREE.Group();
      cyl(toy, rubber, 0.009, 0.009, 0.06, [0, 0, 0], [0, 0, Math.PI / 2], 10);
      for (const x of [-1, 1]) for (const z of [-1, 1]) ball(toy, rubber, [x * 0.032, 0, z * 0.009], [0.012, 0.012, 0.012], [0, 0, 0], 10);
      toy.position.set(fx, 0.012, fz); toy.rotation.y = random() * 3;
      s.root.add(toy);
    } else if (a.beside === 'bowl') {
      const steel = paint('#b9bec2', { metalness: 0.8, roughness: 0.3 });
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.004], [0.05, 0.004], [0.062, 0.0], [0.07, 0.0], [0.058, 0.04], [0.052, 0.04], [0.046, 0.01], [0, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)), 28), steel);
      bowl.position.set(fx, 0, fz); bowl.castShadow = bowl.receiveShadow = true;
      s.root.add(bowl);
    } else if (a.beside === 'treats') {
      const biscuit = paint('#b9824a');
      const n = 3 + Math.floor(random() * 4 + mood.density * 3);
      for (let i = 0; i < n; i++) {
        const ang = random() * Math.PI * 2, r = (0.17 + random() * 0.07) * size;
        ball(s.root, biscuit, [Math.cos(ang) * r, 0.005, Math.abs(Math.sin(ang)) * r * 0.9 + 0.03], [0.014, 0.005, 0.008], [0, random() * 3, 0], 8);
      }
    }

    const pant = open || a.tongue === 'lolling' ? mix(3, 11, mood.energy) : mix(0.8, 2, mood.energy);
    const baseScale = chest.scale.clone();
    const tongueY = tongue ? tongue.position.y : 0;
    const depth = asleep ? 0.05 : open ? 0.03 : 0.015;
    return s.finish({
      update: (_dt, time) => {
        const w = Math.sin(time * pant);
        chest.scale.set(baseScale.x * (1 + w * depth * 0.5), baseScale.y * (1 + w * depth), baseScale.z * (1 + w * depth * 0.5));
        if (tongue && !asleep) tongue.position.y = tongueY + w * 0.002;
        tail.rotation.z = Math.sin(time * mix(1, 9, mood.energy * mood.cheer)) * 0.25 * mood.cheer;
      },
    });
  },
});
