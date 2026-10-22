import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { type Bit, clods, lettered, limb, many, mottled, mound, paint, put, shade } from './grave';

export default defineThing({
  questions: {
    decay: choice('How far has it rotted?', {
      leathery: 'Whole but mummified: tight tan leather skin with one cheek split open over the teeth.',
      half: 'Half and half: one side still has grey-green skin, the other is bare skull.',
      bare: 'Nearly bare skull with only a few dry scraps of skin clinging on.',
    }),
    missing: choice('What part has it lost?', {
      nothing: 'Nothing more than rot has taken.',
      jaw: 'The whole lower jaw is gone, leaving a row of upper teeth.',
      ear: 'One ear has dropped off.',
      scalp: 'The scalp is gone and the dome of the skull shows through.',
      crown: 'The top of the skull is broken open like an egg.',
    }),
    eye: choice('What about the eyes?', {
      swinging: 'One eye hangs out on its stalk and swings against the cheek.',
      lost: 'One socket is empty and dark; the other eye stares.',
      both: 'Both eyes are in place, clouded and bulging.',
      glowing: 'No eyeballs at all, only two points of light deep in the sockets.',
    }),
    hair: choice('How much hair remains?', {
      bald: 'None.',
      wisps: 'A few long white wisps standing off the crown.',
      clumps: 'Patchy dark clumps here and there.',
      lank: 'Long lank curtains of grey hair hanging down both sides.',
    }),
    wearing: choice('What is it wearing?', {
      nothing: 'Nothing.',
      bonnet: 'A frilled white burial bonnet tied under the chin.',
      glasses: 'Round wire spectacles sitting crooked, one lens cracked.',
      lamp: 'A battered miner\'s helmet with a lamp on the front.',
      worms: 'A wriggling crown of pink earthworms.',
      tophat: 'A crushed undertaker\'s top hat.',
    }),
    mouth: choice('What is the mouth doing?', {
      moan: 'Hanging wide open in a long moan.',
      grin: 'Teeth clenched in a wide lipless grin.',
      bite: 'Snapping: half open and ready to bite.',
      slack: 'Jaw askew and hanging to one side.',
    }),
    rest: choice('Where has the head ended up?', {
      stump: 'Sitting upright on its own ragged neck.',
      stake: 'Stuck on a wooden stake as a warning.',
      soil: 'Poking up out of loose earth to the chin.',
      stand: 'Mounted on a brass specimen stand with a label, a collector\'s piece.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    root.add(tilt);
    const H = new THREE.Group();
    tilt.add(H);
    const dirt = mood.wear;
    const side = random() < 0.5 ? 1 : -1; // the side that keeps its skin and its good eye

    const skinTone = shade(shade({ leathery: '#a9a283', half: '#8f9c78', bare: '#8a7a58' }[a.decay], mood.warmth > 0.5 ? '#c08a52' : '#8fa3a8', Math.abs(mood.warmth - 0.5) * 0.5), '#4a3c2a', dirt * 0.3);
    const skin = paint('#ffffff', { roughness: 0.82, side: THREE.DoubleSide, map: mottled(random, skinTone, [
      { color: '#5a4a2e', count: 26, size: 0.05, alpha: 0.35 }, { color: '#3a3020', count: 46, size: 0.012, alpha: 0.6, line: true },
      { color: a.decay === 'half' ? '#55683c' : '#d8c8a0', count: 10, size: 0.06, alpha: 0.4 }, { color: '#2a2218', count: Math.round(dirt * 30), size: 0.03, alpha: 0.5 }]) });
    const boneTone = shade('#e9e1c8', '#9a875e', dirt * 0.5);
    const bone = paint('#ffffff', { roughness: 0.6, map: mottled(random, boneTone, [{ color: '#8a7850', count: 16, size: 0.05, alpha: 0.25 }, { color: '#4a4030', count: 12, size: 0.01, alpha: 0.6, line: true }]) });
    const dark = paint('#1b1512', { roughness: 1 });
    const ball = (r: number, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h);

    const skinOn = (x: number) => a.decay === 'leathery' || (a.decay === 'half' && x * side >= 0);
    const brokenCrown = a.missing === 'crown';

    // Bone skull.
    const cranium = brokenCrown ? new THREE.SphereGeometry(1, 26, 16, 0, Math.PI * 2, 0.62, Math.PI - 0.62) : ball(1, 26, 16);
    put(H, cranium, bone, [0, 0.012, -0.008], [0, 0, 0], [0.08, 0.095, 0.096]);
    if (brokenCrown) {
      put(H, new THREE.CircleGeometry(1, 20), dark, [0, 0.012 + 0.095 * Math.cos(0.62) - 0.004, -0.008], [-Math.PI / 2, 0, 0], [0.08 * Math.sin(0.62), 0.096 * Math.sin(0.62), 1]);
      for (let i = 0; i < 9; i++) {
        const t = i / 9 * Math.PI * 2 + random() * 0.4, r = Math.sin(0.62);
        put(H, new THREE.ConeGeometry(0.012, 0.02 + random() * 0.022, 3), bone, [Math.cos(t) * 0.08 * r, 0.012 + 0.095 * Math.cos(0.62) + 0.006, -0.008 + Math.sin(t) * 0.096 * r], [(random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5]);
      }
    }
    put(H, ball(1), bone, [0, -0.03, 0.044], [0, 0, 0], [0.06, 0.042, 0.05]);
    for (const x of [-1, 1]) {
      put(H, ball(1, 10, 8), bone, [x * 0.06, -0.022, 0.05], [0, 0, 0], [0.02, 0.013, 0.024]);
      // Brow ridge and socket.
      put(H, new THREE.CapsuleGeometry(0.009, 0.034, 3, 8), skinOn(x) ? skin : bone, [x * 0.034, 0.04, 0.083], [0, 0, Math.PI / 2 + x * mix(-0.35, 0.3, mood.cheer)]);
      put(H, ball(1, 14, 10), dark, [x * 0.034, 0.01, 0.081], [0, 0, 0], [0.025, 0.024, 0.016]);
    }
    for (const x of [-1, 1]) if (skinOn(x)) put(H, ball(1, 10, 8), paint(shade(skinTone, '#2a2218', 0.55), { roughness: 0.9 }), [x * 0.05, -0.05, 0.058], [0, 0, x * 0.3], [0.014, 0.022, 0.02]);
    // The nose is gone: a split dark hole.
    for (const x of [-1, 1]) put(H, ball(1, 8, 6), dark, [x * 0.008, -0.03, 0.09], [0, 0, x * -0.3], [0.008, 0.017, 0.008]);

    // Teeth along the upper and lower arcs, with gaps.
    const toothBits = (y: number, up: boolean, cz: number): Bit[] => {
      const bits: Bit[] = [];
      for (let i = 0; i < 13; i++) {
        if (i !== 6 && random() < 0.1 + dirt * 0.22) continue;
        const ang = (i - 6) / 6 * 1.35;
        const long = 0.019 * (0.8 + random() * 0.5) * (Math.abs(i - 6) === 2 ? 1.35 : 1);
        bits.push({ p: [Math.sin(ang) * 0.043, y + (up ? long / 2 : -long / 2), cz + Math.cos(ang) * 0.043], r: [(random() - 0.5) * 0.25, ang, (random() - 0.5) * 0.2], s: [0.011, long, 0.008], c: `#${shade('#f1e9c8', '#a88f4a', random() * 0.5 + dirt * 0.4).getHexString()}` });
      }
      return bits;
    };
    const toothGeometry = new THREE.CylinderGeometry(0.42, 0.6, 1, 5);
    const gum = (parent: THREE.Object3D, y: number, cz: number, material: THREE.Material) => put(parent, new THREE.TorusGeometry(0.043, 0.0105, 6, 18, Math.PI * 0.92), material, [0, y, cz], [Math.PI / 2, 0, 0.126]);
    gum(H, -0.062, 0.036, bone);
    many(H, toothGeometry, paint('#ffffff', { roughness: 0.4 }), toothBits(-0.064, false, 0.038));

    // Lower jaw, hinged just below the ears.
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.04, 0.0);
    const open = { moan: 0.62, grin: 0.02, bite: 0.3, slack: 0.42 }[a.mouth];
    jaw.rotation.x = open;
    if (a.mouth === 'slack') { jaw.rotation.z = 0.2 * side; jaw.rotation.y = 0.12 * side; }
    if (a.missing !== 'jaw') {
      H.add(jaw);
      gum(jaw, -0.052, 0.034, bone);
      many(jaw, toothGeometry, paint('#ffffff', { roughness: 0.4 }), toothBits(-0.05, true, 0.036));
      put(jaw, ball(1, 12, 8), skinOn(side) && a.decay === 'leathery' ? skin : bone, [0, -0.062, 0.07], [0, 0, 0], [0.026, 0.017, 0.016]);
      for (const x of [-1, 1]) {
        limb(jaw, [x * 0.043, -0.052, 0.034], [x * 0.06, 0.0, -0.004], 0.011, 0.009, bone, 7);
        if (skinOn(x)) put(jaw, ball(1, 10, 8), skin, [x * 0.052, -0.035, 0.03], [0.5, 0, 0], [0.012, 0.034, 0.03]);
      }
      // The dark of the mouth.
      put(jaw, ball(1, 10, 8), dark, [0, -0.03, 0.025], [0, 0, 0], [0.036, 0.02, 0.036]);
    }
    put(H, ball(1, 10, 8), dark, [0, -0.06, 0.03], [0, 0, 0], [0.036, 0.016, 0.036]);

    // Skin, where any is left.
    const top = a.missing === 'scalp' ? 0.85 : brokenCrown ? 0.68 : 0;
    const skinShell = (phi0: number, phiLen: number, theta0: number, thetaLen: number, at: readonly [number, number, number], size: readonly [number, number, number], k = 1.05) =>
      put(H, new THREE.SphereGeometry(1, 26, 16, phi0, phiLen, theta0, thetaLen), skin, at, [0, 0, 0], [size[0] * k, size[1] * k, size[2] * k]);
    const C = [0, 0.012, -0.008] as const, CS = [0.08, 0.095, 0.096] as const, F = [0, -0.03, 0.044] as const, FS = [0.06, 0.042, 0.05] as const;
    if (a.decay === 'leathery') {
      skinShell(0, Math.PI * 2, top, Math.PI - top, C, CS);
      // The face keeps its skin except one cheek, split open over the teeth.
      const from = side > 0 ? 0.95 : 0, len = Math.PI * 2 - 0.95;
      skinShell(from, len - (side > 0 ? 0 : 0) , 0, Math.PI, F, FS, 1.07);
      put(H, ball(1, 10, 8), skin, [side * 0.044, -0.064, 0.05], [0, 0, 0], [0.018, 0.02, 0.03]);
    } else if (a.decay === 'half') {
      const from = side > 0 ? Math.PI / 2 - 0.12 : Math.PI * 1.5 - 0.12;
      skinShell(from, Math.PI + 0.24, top, Math.PI - top, C, CS);
      skinShell(from, Math.PI + 0.24, 0, Math.PI, F, FS, 1.07);
      put(H, ball(1, 10, 8), skin, [side * 0.044, -0.064, 0.05], [0, 0, 0], [0.018, 0.02, 0.03]);
      // A ragged torn edge down the middle.
      for (let i = 0; i < 9; i++) {
        const t = top + 0.15 + (Math.PI * 0.6 - top) * i / 8;
        put(H, new THREE.ConeGeometry(0.01, 0.02 + random() * 0.02, 3), skin, [-side * 0.006, C[1] + Math.cos(t) * CS[1] * 1.05, C[2] + Math.sin(t) * CS[2] * 1.05], [random() * 0.6, 0, side * (Math.PI / 2 + (random() - 0.5) * 0.7)], [1, 1, 0.3]);
      }
    } else {
      for (let i = 0; i < 5 + Math.round((1 - dirt) * 3); i++) {
        const phi = random() * Math.PI * 2, theta = Math.max(top, 0.3) + random() * 1.4;
        skinShell(phi, 0.5 + random() * 0.7, theta, 0.3 + random() * 0.45, C, CS, 1.04);
      }
    }
    // Ears.
    for (const x of [-1, 1]) {
      if (!skinOn(x) || (a.missing === 'ear' && x === -side)) continue;
      put(H, new THREE.TorusGeometry(0.02, 0.008, 6, 14), skin, [x * 0.083, 0.002, -0.004], [0.1, x * (Math.PI / 2 - 0.5), 0], [0.8, 1.25, 1]);
      put(H, ball(1, 8, 6), skin, [x * 0.081, -0.022, -0.002], [0, 0, 0], [0.007, 0.012, 0.009]);
    }
    if (a.missing === 'ear' && skinOn(-side)) put(H, ball(1, 8, 6), dark, [-side * 0.081, 0, -0.004], [0, 0, 0], [0.006, 0.012, 0.01]);

    // Eyes.
    const glow = mix(0.25, 1.1, mood.energy);
    const white = paint(shade('#efe9cf', '#c9c06a', dirt * 0.5), { roughness: 0.3, emissive: '#6a6a2a', emissiveIntensity: 0.25 });
    const eyeball = (parent: THREE.Object3D, at: readonly [number, number, number], r: number) => {
      const eye = new THREE.Group();
      eye.position.set(...at);
      parent.add(eye);
      put(eye, ball(r, 14, 10), white);
      put(eye, ball(r * 0.52, 10, 8), paint(mood.cheer > 0.5 ? '#7f9a3a' : '#9a4a2a', { roughness: 0.3, emissive: mood.cheer > 0.5 ? '#4a6a10' : '#6a1a08', emissiveIntensity: glow * 0.6 }), [0, 0, r * 0.62]);
      put(eye, ball(r * 0.24, 8, 6), dark, [0, 0, r * 0.98]);
      return eye;
    };
    let pendulum: THREE.Group | null = null;
    const goodX = side * 0.034, badX = -side * 0.034;
    if (a.eye === 'glowing') {
      for (const x of [-1, 1]) put(H, ball(0.008, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff2a0', emissive: mood.warmth > 0.5 ? '#ff7a1a' : '#7affc0', emissiveIntensity: 1.5 + glow * 2 }), [x * 0.034, 0.01, 0.09]);
    } else {
      eyeball(H, [goodX, 0.01, 0.083], 0.019).rotation.set((random() - 0.5) * 0.4, (random() - 0.5) * 0.5, 0);
      if (a.eye === 'both') eyeball(H, [badX, 0.008, 0.088], 0.022).rotation.set((random() - 0.5) * 0.5, (random() - 0.5) * 0.9, 0);
      if (a.eye === 'swinging') {
        pendulum = new THREE.Group();
        pendulum.position.set(badX, 0.004, 0.094);
        H.add(pendulum);
        const drop = 0.07 + random() * 0.025;
        const stalk = paint('#b0584a', { roughness: 0.6 });
        limb(pendulum, [0, 0, 0], [0, -drop, 0.008], 0.0045, 0.0035, stalk, 6);
        put(pendulum, ball(0.007, 8, 6), stalk, [0, 0, 0]);
        eyeball(pendulum, [0, -drop - 0.016, 0.01], 0.021).rotation.set(0.7, (random() - 0.5), 0);
      }
    }

    // Hair.
    const hairTone = a.hair === 'clumps' ? '#2e2a26' : shade('#d9d6cc', '#8a8474', dirt * 0.6);
    const hair = paint(hairTone, { roughness: 0.9 });
    const scalpPoint = (phi: number, theta: number, k = 1.06) => new THREE.Vector3(C[0] - Math.cos(phi) * Math.sin(theta) * CS[0] * k, C[1] + Math.cos(theta) * CS[1] * k, C[2] + Math.sin(phi) * Math.sin(theta) * CS[2] * k);
    const hairTop = Math.max(top + 0.1, 0.15);
    const hatted = a.wearing === 'lamp' || a.wearing === 'tophat' || a.wearing === 'bonnet';
    if (a.hair === 'wisps') {
      for (let i = 0; i < 9; i++) {
        const phi = random() * Math.PI * 2, p = scalpPoint(phi, hatted ? 1.35 : hairTop + random() * 0.5);
        const outward = p.clone().sub(new THREE.Vector3(...C)).normalize();
        const mid = p.clone().addScaledVector(outward, 0.04).add(new THREE.Vector3(0, hatted ? -0.02 : 0.03, 0)), end = mid.clone().addScaledVector(outward, 0.035).add(new THREE.Vector3((random() - 0.5) * 0.05, hatted ? -0.06 : 0.02 - random() * 0.05, 0));
        put(H, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, mid, end]), 8, 0.0022, 4), hair);
      }
    } else if (a.hair === 'clumps') {
      const bits: Bit[] = [];
      for (let c = 0; c < 6; c++) {
        const phi0 = Math.PI * 1.5 + (random() - 0.5) * 3.4, theta0 = hatted ? 1.3 + random() * 0.4 : hairTop + random() * 1.2;
        for (let i = 0; i < 12; i++) {
          const p = scalpPoint(phi0 + (random() - 0.5) * 0.5, theta0 + (random() - 0.5) * 0.4, 1.03);
          bits.push({ p: [p.x, p.y, p.z], r: [Math.PI + (random() - 0.5) * 1.2, 0, (random() - 0.5) * 1.2], s: [0.007, 0.03 + random() * 0.035, 0.007] });
        }
      }
      const tuft = new THREE.ConeGeometry(1, 1, 4);
      tuft.translate(0, 0.5, 0);
      many(H, tuft, hair, bits);
    } else if (a.hair === 'lank') {
      for (let i = 0; i < 18; i++) {
        const sideways = i % 2 ? 1 : -1;
        const phi = sideways > 0 ? Math.PI + (random() - 0.2) * 1.5 : (random() - 0.8) * 1.5;
        const p = scalpPoint(phi, Math.max(hairTop, hatted ? 1.2 : 0.35) + random() * 0.5);
        const fall = 0.12 + random() * 0.1;
        const mid = new THREE.Vector3(p.x * 1.2, p.y - fall * 0.45, p.z + 0.004), end = new THREE.Vector3(p.x * 1.1 + (random() - 0.5) * 0.03, p.y - fall, p.z + (random() - 0.3) * 0.04);
        put(H, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, mid, end]), 8, 0.0042, 4), hair, [0, 0, 0], [0, 0, 0], 1);
      }
    }

    // What it wears.
    const spinners: THREE.Object3D[] = [];
    if (a.wearing === 'bonnet') {
      const linen = paint(shade('#f3efe4', '#9a8c6c', dirt * 0.5), { side: THREE.DoubleSide, roughness: 0.95 });
      const cap = new THREE.Group();
      cap.position.set(C[0], C[1], C[2]);
      cap.rotation.x = -1.05;
      H.add(cap);
      put(cap, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, 1.75), linen, [0, 0, 0], [0, 0, 0], [0.088, 0.104, 0.1]);
      const frill = new THREE.TorusGeometry(0.097, 0.012, 6, 40);
      const pos = frill.attributes.position;
      for (let i = 0; i < pos.count; i++) { const t = Math.atan2(pos.getY(i), pos.getX(i)); pos.setZ(i, pos.getZ(i) + Math.sin(t * 16) * 0.007); }
      frill.computeVertexNormals();
      put(cap, frill, linen, [0, Math.cos(1.75) * 0.104, 0], [Math.PI / 2, 0, 0], [0.9, 1.02, 1.5]);
      const ribbon = paint(shade('#c9d6e8', '#7a7460', dirt * 0.5));
      for (const x of [-1, 1]) limb(H, [x * 0.082, -0.01, 0.02], [x * 0.012, -0.118, 0.06], 0.006, 0.005, ribbon, 5);
      for (const x of [-1, 1]) put(H, ball(1, 8, 6), ribbon, [x * 0.02, -0.122, 0.064], [0, 0, x * 0.5], [0.022, 0.011, 0.008]);
    } else if (a.wearing === 'glasses') {
      const wire = paint('#c8a84a', { metalness: 0.85, roughness: 0.3 });
      const specs = new THREE.Group();
      specs.position.set(0, 0.008, 0.102);
      specs.rotation.z = (0.2 + random() * 0.2) * (random() < 0.5 ? 1 : -1);
      specs.rotation.x = 0.1;
      H.add(specs);
      for (const x of [-1, 1]) {
        put(specs, new THREE.TorusGeometry(0.026, 0.003, 6, 22), wire, [x * 0.034, 0, 0]);
        put(specs, new THREE.CircleGeometry(0.025, 18), new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.1 }), [x * 0.034, 0, 0]);
        limb(specs, [x * 0.06, 0, 0], [x * 0.084, 0.004, -0.1], 0.0022, 0.0022, wire, 5);
      }
      limb(specs, [-0.01, 0.006, 0], [0.01, 0.006, 0], 0.0025, 0.0025, wire, 5);
      for (let i = 0; i < 4; i++) limb(specs, [0.034, 0, 0.001], [0.034 + Math.cos(i * 1.7 + 0.4) * 0.024, Math.sin(i * 1.7 + 0.4) * 0.024, 0.001], 0.0012, 0.0008, paint('#f4f7f7'), 4);
    } else if (a.wearing === 'lamp') {
      const tin = paint(shade('#b9a13c', '#5a5040', dirt * 0.7), { metalness: 0.5, roughness: 0.5 });
      const hat = new THREE.Group();
      hat.position.set(0, 0.05, -0.008);
      hat.rotation.set(-0.08, 0, (random() - 0.5) * 0.3);
      H.add(hat);
      put(hat, new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), tin, [0, 0, 0], [0, 0, 0], [0.092, 0.075, 0.108]);
      put(hat, new THREE.CylinderGeometry(0.118, 0.122, 0.008, 26), tin, [0, 0.002, 0.012], [0, 0, 0], [0.92, 1, 1.1]);
      put(hat, new THREE.BoxGeometry(0.012, 0.012, 0.2), tin, [0, 0.072, 0]);
      put(hat, new THREE.CylinderGeometry(0.03, 0.02, 0.03, 16), paint('#8c8a80', { metalness: 0.7, roughness: 0.35 }), [0, 0.035, 0.108], [Math.PI / 2, 0, 0]);
      put(hat, new THREE.CylinderGeometry(0.024, 0.024, 0.006, 16), new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: '#ffd070', emissiveIntensity: mix(0.3, 3, mood.energy) }), [0, 0.035, 0.124], [Math.PI / 2, 0, 0]);
    } else if (a.wearing === 'worms') {
      const wormy = paint('#d98a8f', { roughness: 0.45 });
      const wreath = new THREE.Group();
      wreath.position.set(0, 0.012 + 0.095 * Math.cos(Math.max(top, 0.7)), -0.008);
      H.add(wreath);
      spinners.push(wreath);
      const ringR = 0.08 * Math.sin(Math.max(top, 0.7)) + 0.008;
      for (let i = 0; i < 9; i++) {
        const t0 = i / 9 * Math.PI * 2, pts: THREE.Vector3[] = [];
        for (let j = 0; j < 6; j++) { const t = t0 + j * 0.19; pts.push(new THREE.Vector3(Math.cos(t) * ringR * (1 + Math.sin(j * 2 + i) * 0.14), Math.sin(j * 1.9 + i * 2) * 0.012 + (j === 5 && i % 3 === 0 ? 0.04 : 0), Math.sin(t) * ringR * 1.18 * (1 + Math.sin(j * 2 + i) * 0.14))); }
        put(wreath, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.0058, 6), i % 3 ? wormy : paint('#c06a78', { roughness: 0.45 }));
      }
      // One more on its way out of the nose.
      put(H, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.006, -0.028, 0.085), new THREE.Vector3(0.012, -0.04, 0.108), new THREE.Vector3(0.03, -0.03, 0.114), new THREE.Vector3(0.036, -0.012, 0.11)]), 10, 0.005, 6), wormy);
    } else if (a.wearing === 'tophat') {
      const felt = paint(shade('#1d1b20', '#4a443c', dirt * 0.6));
      const hat = new THREE.Group();
      hat.position.set(0, 0.012 + 0.095 * Math.cos(0.6), -0.008);
      hat.rotation.set(-0.12, 0, 0.16 * side);
      H.add(hat);
      put(hat, new THREE.CylinderGeometry(0.108, 0.108, 0.008, 26), felt, [0, 0, 0], [0, 0, 0], [1, 1, 1.12]);
      const crush = mix(0.14, 0.07, dirt);
      put(hat, new THREE.CylinderGeometry(0.07, 0.064, crush, 22), felt, [0, crush / 2, 0], [0, 0, dirt * 0.12], [1, 1, 1.1]);
      put(hat, new THREE.CylinderGeometry(0.066, 0.066, 0.018, 22), paint('#5a1a22'), [0, 0.014, 0], [0, 0, 0], [1, 1, 1.1]);
    }

    // Neck and whatever the head rests on.
    const neckSkin = a.decay !== 'bare';
    const neck = (length: number) => {
      for (let i = 0; i < Math.ceil(length / 0.022); i++) put(H, new THREE.CylinderGeometry(0.014, 0.016, 0.015, 8), bone, [0, -0.085 - i * 0.022, -0.03]);
      if (neckSkin) {
        limb(H, [0, -0.07, -0.022], [0, -0.07 - length * 0.85, -0.026], 0.036, 0.04, skin, 12);
        for (let i = 0; i < 8; i++) {
          const t = i / 8 * Math.PI * 2;
          put(H, new THREE.ConeGeometry(0.014, 0.02 + random() * 0.03, 3), skin, [Math.cos(t) * 0.033, -0.07 - length * 0.85, -0.026 + Math.sin(t) * 0.033], [Math.PI + (random() - 0.5) * 0.4, random() * 3, (random() - 0.5) * 0.4]);
        }
      }
    };
    const soilTone = shade('#5a4030', mood.warmth > 0.5 ? '#7a4a2c' : '#3f3a38', Math.abs(mood.warmth - 0.5) * 0.9);
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    let baseY = 0.17;
    if (a.rest === 'stump') {
      neck(0.1);
      baseY = 0.165;
      tilt.rotation.set((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.3);
      clods(root, random, Math.round(mix(6, 26, mood.density)), 0.03, 0.1, 0.01, [hex(soilTone), hex(shade(soilTone, '#1c1512', 0.4))]);
    } else if (a.rest === 'stake') {
      neck(0.05);
      const wood = paint(shade('#8a6a44', '#4a3c2c', dirt * 0.6), { flatShading: true });
      baseY = 0.33;
      limb(root, [0, 0, -0.03], [0, baseY - 0.06, -0.03], 0.02, 0.017, wood, 6);
      limb(H, [0, -0.11, -0.03], [0, -0.04, -0.03], 0.017, 0.006, wood, 6);
      tilt.rotation.set(0.1, 0, (random() - 0.5) * 0.35);
      mound(root, random, 0.08, 0.03, 0.075, paint(soilTone, { roughness: 1 }), [0, 0, -0.03]);
      limb(root, [-0.06, 0.13, -0.03], [0.06, 0.13 + (random() - 0.5) * 0.04, -0.03], 0.01, 0.01, wood, 5);
    } else if (a.rest === 'soil') {
      baseY = 0.118;
      tilt.rotation.set(-0.22 + random() * 0.12, 0, (random() - 0.5) * 0.4);
      const soil = paint(soilTone, { roughness: 1 });
      mound(root, random, 0.135, 0.045, 0.13, soil, [0, 0, 0], 0.3);
      put(root, new THREE.TorusGeometry(0.085, 0.03, 6, 16), soil, [0, 0.03, 0], [Math.PI / 2, 0, 0]);
      clods(root, random, Math.round(mix(20, 70, mood.density)), 0.08, 0.17, 0.014, [hex(soilTone), hex(shade(soilTone, '#1c1512', 0.4)), hex(shade(soilTone, '#a08060', 0.3))]);
    } else {
      neck(0.045);
      baseY = 0.25;
      const brass = paint('#c8a444', { metalness: 0.85, roughness: 0.3 });
      const wood = paint('#3a2418', { roughness: 0.4 });
      put(root, new THREE.CylinderGeometry(0.07, 0.078, 0.03, 28), wood, [0, 0.015, 0]);
      put(root, new THREE.CylinderGeometry(0.058, 0.07, 0.012, 28), wood, [0, 0.036, 0]);
      limb(root, [0, 0.04, -0.03], [0, baseY - 0.1, -0.03], 0.006, 0.006, brass, 8);
      put(root, new THREE.CylinderGeometry(0.02, 0.008, 0.02, 12), brass, [0, baseY - 0.105, -0.03]);
      put(root, new THREE.SphereGeometry(0.012, 10, 8), brass, [0, 0.045, -0.03]);
      const names = ['No. 13', 'Uncle Ned', 'SPECIMEN', 'Do Not Feed', 'Lot 404', 'R.I.P.?'];
      const tag = put(root, new THREE.PlaneGeometry(0.07, 0.026), new THREE.MeshStandardMaterial({ map: lettered([names[Math.floor(random() * names.length)]], { width: 256, height: 100, paper: '#d9b95a', ink: '#2a1c0c' }), metalness: 0.5, roughness: 0.4 }), [0, 0.022, 0.079], [-0.1, 0, 0]);
      tag.castShadow = false;
    }
    tilt.position.y = baseY - 0.17;
    H.position.y = 0.17;
    // Tilt about the base of the neck rather than the middle of the head.
    tilt.position.y += 0;

    const energy = mood.energy;
    const biting = a.mouth === 'bite';
    return {
      object: root,
      update(_dt, time) {
        if (pendulum) { pendulum.rotation.z = Math.sin(time * (1.5 + energy * 3)) * (0.12 + energy * 0.5); pendulum.rotation.x = Math.cos(time * (1.1 + energy * 2)) * 0.08; }
        jaw.rotation.x = biting ? open * (0.55 + 0.45 * Math.sin(time * (2 + energy * 12))) : open + Math.sin(time * (0.8 + energy * 2)) * 0.05 * (0.3 + energy);
        for (const spinner of spinners) spinner.rotation.y = time * (0.15 + energy * 1.2);
      },
      dispose: () => disposeTree(root),
    };
  },
});
