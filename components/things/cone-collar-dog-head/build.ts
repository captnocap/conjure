import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { arc, ball, cone, cyl, paint } from './parts';

export default defineThing({
  questions: {
    breed: choice('What kind of dog is inside?', {
      greyhound: 'A long-nosed greyhound: narrow head, thin neck, folded rose ears.',
      labrador: 'A blocky labrador: broad skull, square muzzle, soft hanging ears.',
      terrier: 'A scruffy terrier: wiry eyebrows, a beard, half-folded ears.',
      chihuahua: 'A tiny chihuahua with huge ears and eyes, lost at the bottom of a cone far too big for it.',
    }),
    attitude: choice('How is it taking it?', {
      droop: 'Mortified: head hung low, eyes rolled up at you, ears down.',
      joy: 'Oblivious joy: mouth open, tongue out, tail going, cone forgotten.',
      stuck: 'Wedged against a doorframe by the rim of the cone, pushing on regardless.',
      asleep: 'Asleep on the floor with its chin propped in the cone like a bowl.',
    }),
    cone: choice('What kind of cone is it?', {
      clear: 'The standard clear plastic vet cone with a white rim and snap tabs.',
      fabric: 'A soft padded blue fabric cone, slightly floppy.',
      donut: 'An inflatable donut collar, like a travel pillow round the neck.',
      cardboard: 'Improvised from a cardboard box and silver tape, angular and home-made.',
    }),
    scooped: choice('What has the cone scooped up?', {
      nothing: 'Nothing.',
      kibble: 'A scatter of kibble rattling round the bottom of it.',
      toy: 'A tennis ball, carried about in it by accident.',
      leaves: 'Dry leaves and a twig from the garden.',
    }),
    wound: choice('What is the cone protecting?', {
      hidden: 'Nothing visible.',
      paw: 'A front paw wrapped in bright bandage.',
      flank: 'A shaved square on the shoulder with a line of stitches.',
      both: 'Both a bandaged paw and a shaved, stitched patch.',
    }),
    coat: choice('What colour is the dog?', {
      golden: 'Yellow gold.',
      black: 'Glossy black.',
      brown: 'Chocolate brown.',
      white: 'White with a tan patch over one eye.',
      grey: 'Blue-grey.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grey = a.breed === 'greyhound', lab = a.breed === 'labrador', terrier = a.breed === 'terrier', chi = a.breed === 'chihuahua';
    const asleep = a.attitude === 'asleep', joy = a.attitude === 'joy', droop = a.attitude === 'droop', stuck = a.attitude === 'stuck';

    const coatHex = { golden: '#d8ad62', black: '#3b3633', brown: '#6b4530', white: '#eee7d9', grey: '#8d939b' }[a.coat];
    const coat = s.material(coatHex, { roughness: 0.9 });
    const coatDark = paint(new THREE.Color(coatHex).multiplyScalar(a.coat === 'black' ? 1.7 : 0.7), { roughness: 0.9 });
    const patch = paint('#b9793f', { roughness: 0.9 });
    const noseMat = paint('#111010', { roughness: 0.25 });
    const eyeWhite = paint('#f3f0e8', { roughness: 0.3 });
    const iris = paint('#2c1708', { roughness: 0.12 });
    const glint = paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
    const pink = paint('#e97f8f', { roughness: 0.5 });
    const mouthMat = paint('#5a1f26');
    const skin = paint('#e3b3a6', { roughness: 0.6 });
    const bandage = s.material(new THREE.Color().setHSL(mix(0.55, 0.92, mood.cheer), 0.7, 0.58), { roughness: 0.95 });

    const size = grey ? 1.08 : lab ? 1 : terrier ? 0.66 : 0.42;
    const slim = grey ? 0.78 : chi ? 0.9 : 1;
    const dog = new THREE.Group();
    s.root.add(dog);
    const head = new THREE.Group();
    dog.add(head);

    // Body.
    let tailBase: [number, number, number];
    if (asleep) {
      ball(dog, coat, [0, 0.1, -0.2], [0.15 * slim, 0.1, 0.24]);
      for (const x of [-1, 1]) {
        ball(dog, coat, [x * 0.13 * slim, 0.03, 0.02], [0.035, 0.03, 0.11], [0, x * 0.3, 0]);
        ball(dog, coat, [x * 0.15 * slim, 0.055, -0.33], [0.06, 0.055, 0.1]);
      }
      tailBase = [0, 0.08, -0.43];
    } else {
      ball(dog, coat, [0, 0.23, 0], [0.13 * slim, 0.19, 0.12]);
      ball(dog, coat, [0, 0.14, -0.15], [0.15 * slim, 0.14, 0.16]);
      cyl(dog, coat, 0.06 * slim, 0.085 * slim, 0.16, [0, 0.4, 0.03], [0.15, 0, 0]);
      for (const x of [-1, 1]) {
        cyl(dog, coat, 0.034, 0.03, 0.22, [x * 0.075 * slim, 0.11, 0.085]);
        ball(dog, coat, [x * 0.077 * slim, 0.02, 0.105], [0.038, 0.022, 0.05]);
        ball(dog, coat, [x * 0.13 * slim, 0.065, -0.12], [0.055, 0.065, 0.1]);
      }
      tailBase = [0, 0.1, -0.29];
    }
    // Tail, on a pivot so joy can wag it.
    const tail = new THREE.Group();
    tail.position.set(...tailBase);
    const tl = grey ? 0.3 : lab ? 0.26 : 0.16;
    cone(tail, coat, grey ? 0.014 : 0.024, tl, [0, 0, -tl / 2], [-Math.PI / 2, 0, 0], [1, 1, 1], 8);
    tail.rotation.x = joy ? 0.9 : droop ? -0.1 : 0.15;
    dog.add(tail);

    const woundLeg = random() < 0.5 ? -1 : 1;
    if ((a.wound === 'paw' || a.wound === 'both')) {
      if (asleep) ball(dog, bandage, [woundLeg * 0.13 * slim, 0.031, 0.06], [0.04, 0.034, 0.075], [0, woundLeg * 0.3, 0]);
      else { cyl(dog, bandage, 0.04, 0.038, 0.13, [woundLeg * 0.075 * slim, 0.07, 0.085]); ball(dog, bandage, [woundLeg * 0.077 * slim, 0.022, 0.105], [0.042, 0.026, 0.054]); }
    }
    if (a.wound === 'flank' || a.wound === 'both') {
      const sx = -woundLeg;
      const at: [number, number, number] = asleep ? [sx * 0.09 * slim, 0.175, -0.2] : [sx * 0.105 * slim, 0.27, 0.03];
      const rot: [number, number, number] = asleep ? [-Math.PI / 2 + 0.1, 0, sx * -0.6] : [0, sx * 1.1, 0];
      const shaved = new THREE.Group();
      ball(shaved, skin, [0, 0, 0], [0.05, 0.055, 0.012]);
      cyl(shaved, paint('#7a2d33'), 0.002, 0.002, 0.07, [0, 0, 0.012], [0, 0, 0.2], 6);
      for (let i = -3; i <= 3; i++) cyl(shaved, paint('#1c1c22'), 0.0015, 0.0015, 0.02, [i * 0.002, i * 0.01, 0.013], [0, 0, Math.PI / 2 + 0.2], 5);
      shaved.position.set(...at); shaved.rotation.set(...rot);
      dog.add(shaved);
    }

    // Head, nose toward +z.
    const sk: [number, number, number] = grey ? [0.062, 0.066, 0.085] : lab ? [0.088, 0.08, 0.088] : terrier ? [0.085, 0.08, 0.085] : [0.105, 0.1, 0.1];
    ball(head, coat, [0, 0, 0], sk);
    const mz = grey ? 0.125 : lab ? 0.085 : terrier ? 0.075 : 0.045;
    const mw = grey ? 0.03 : lab ? 0.05 : terrier ? 0.042 : 0.034;
    const snoutEnd = sk[2] * 0.55 + mz;
    ball(head, a.coat === 'black' ? coatDark : coat, [0, -0.022, sk[2] * 0.55 + mz * 0.3], [mw, mw * 0.88, mz * 0.82]);
    if (lab) for (const x of [-1, 1]) ball(head, coat, [x * 0.024, -0.04, snoutEnd - 0.04], [0.03, 0.03, 0.045]);
    ball(head, noseMat, [0, -0.012, snoutEnd - 0.012], [mw * 0.42, mw * 0.34, mw * 0.3]);
    if (a.coat === 'white') ball(head, patch, [0.036, 0.022, sk[2] * 0.5], [sk[0] * 0.55, sk[1] * 0.6, sk[2] * 0.6]);
    // Mouth.
    if (joy) {
      ball(head, mouthMat, [0, -0.052, sk[2] * 0.55 + mz * 0.3], [mw * 0.8, mw * 0.4, mz * 0.7]);
      ball(head, coat, [0, -0.078, sk[2] * 0.5 + mz * 0.22], [mw * 0.72, mw * 0.3, mz * 0.68], [0.3, 0, 0]);
    }
    let tongue: THREE.Object3D | null = null;
    if (joy) tongue = ball(head, pink, [0.006, -0.068, snoutEnd - mz * 0.25], [mw * 0.5, 0.008, mz * 0.5], [0.5, 0, 0]);
    if (terrier) {
      // Beard and eyebrows as wiry tufts.
      for (let i = 0; i < 9; i++) cone(head, coatDark, 0.012, 0.05 + random() * 0.02, [(random() - 0.5) * 0.07, -0.062 - random() * 0.01, snoutEnd - 0.03 - random() * 0.05], [Math.PI + (random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.6], [1, 1, 1], 5);
      for (const x of [-1, 1]) for (let i = 0; i < 3; i++) cone(head, coatDark, 0.009, 0.04, [x * (0.022 + i * 0.012), 0.05, 0.07 - i * 0.004], [1.1, 0, x * (-0.2 - i * 0.25)], [1, 1, 1], 5);
    }
    // Eyes.
    const er = (chi ? 0.026 : 0.016);
    const ex = grey ? 0.03 : chi ? 0.048 : 0.04, ez = sk[2] * 0.8, ey = 0.02;
    for (const x of [-1, 1]) {
      const c: [number, number, number] = [x * ex, ey, ez];
      if (asleep) { arc(head, a.coat === 'black' ? paint('#a39a92') : noseMat, er * 0.9, 0.004, Math.PI * 0.8, [c[0], c[1] + 0.004, c[2] + er * 0.4], [0, x * 0.35, Math.PI * 1.1]); continue; }
      ball(head, eyeWhite, c, [er, er, er]);
      const dir = new THREE.Vector3(x * 0.3, droop ? 0.75 : stuck ? -0.1 : 0.1, 1).normalize();
      ball(head, iris, [c[0] + dir.x * er * 0.2, c[1] + dir.y * er * 0.2, c[2] + dir.z * er * 0.2], [er * 0.9, er * 0.9, er * 0.9]);
      ball(head, glint, [c[0] + dir.x * er * 1.05 - 0.004, c[1] + dir.y * er * 1.05 + 0.005, c[2] + dir.z * er * 1.05], [0.0035, 0.0035, 0.0035], [0, 0, 0], 8);
      // Brow: worried inner-up for the mortified, relaxed otherwise.
      ball(head, a.coat === 'black' ? coatDark : coat, [c[0], c[1] + er * 1.05, c[2] - 0.002], [er * 1.3, er * 0.55, er * 0.9], [0.3, 0, x * (droop ? 0.5 : joy ? -0.25 : 0)]);
    }
    // Ears.
    const earMat = a.coat === 'white' ? patch : coatDark;
    const earDrop = droop || asleep ? 0.3 : 0;
    for (const x of [-1, 1]) {
      if (grey) ball(head, earMat, [x * 0.06, 0.035 - earDrop * 0.05, -0.04], [0.014, 0.03, 0.045], [0.5, 0, x * -0.5]);
      else if (lab) ball(head, earMat, [x * 0.092, -0.01 - earDrop * 0.04, -0.01], [0.016, 0.065, 0.045], [0, 0, x * (0.2 - earDrop)]);
      else if (terrier) { cone(head, earMat, 0.03, 0.05, [x * 0.062, 0.085, -0.01], [0, 0, x * -0.3], [1, 1, 0.4], 8); ball(head, earMat, [x * 0.07, 0.1, 0.018], [0.022, 0.012, 0.026], [0.6, 0, 0]); }
      else {
        const lean = droop || asleep ? -1.2 : -0.55;
        cone(head, earMat, 0.055, 0.14, [x * (0.085 + (droop ? 0.03 : 0)), droop || asleep ? 0.07 : 0.12, -0.02], [-0.15, 0, x * lean], [1, 1, 0.3], 12);
        cone(head, pink, 0.036, 0.1, [x * (0.083 + (droop ? 0.03 : 0)), droop || asleep ? 0.066 : 0.112, -0.008], [-0.15, 0, x * lean], [1, 1, 0.2], 12);
      }
    }

    // The collar. It is built in head space so it turns with the head.
    const k = chi ? 1.75 : 1;
    const r0 = (grey ? 0.07 : 0.09) * (chi ? 1.1 : 1), z0 = -0.05;
    const L = (snoutEnd + 0.1) * k, r1 = (r0 + L * 0.62) * (a.cone === 'fabric' ? 0.92 : 1);
    const collar = new THREE.Group();
    head.add(collar);
    const band = s.material(a.cone === 'cardboard' ? '#9aa0a6' : '#f4f4ee', { roughness: 0.6 });
    const scoopAt = (t: number, phi: number, lift: number): [number, number, number] => {
      const r = mix(r0, r1, t) - lift;
      return [Math.sin(phi) * r, -Math.cos(phi) * r, z0 + t * L];
    };
    if (a.cone === 'donut') {
      const vinyl = s.material(new THREE.Color().setHSL(mix(0.58, 0.08, mood.warmth), 0.45, 0.6), { roughness: 0.45 });
      arc(collar, vinyl, r0 + 0.045, 0.058, Math.PI * 2, [0, -0.01, z0 + 0.01]).scale.set(1, 1, 0.85);
      arc(collar, band, r0 + 0.045, 0.06, Math.PI * 0.12, [0, -0.01, z0 + 0.01], [0, 0, Math.PI * 0.44]);
      cyl(collar, band, 0.008, 0.008, 0.02, [r0 + 0.1, 0.01, z0 + 0.02], [0, 0, Math.PI / 2], 8);
    } else {
      const seg = a.cone === 'cardboard' ? 7 : 40;
      const geometry = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
      const material = a.cone === 'clear'
        ? new THREE.MeshPhysicalMaterial({ color: '#d6ecf2', transparent: true, opacity: mix(0.34, 0.5, mood.wear), roughness: mix(0.08, 0.5, mood.wear), side: THREE.DoubleSide, depthWrite: false })
        : a.cone === 'fabric'
          ? s.material(new THREE.Color().setHSL(0.58, 0.5, mix(0.5, 0.66, mood.cheer)), { roughness: 0.98, side: THREE.DoubleSide })
          : s.material('#b98d5a', { roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
      const shell = new THREE.Mesh(geometry, material);
      shell.rotation.x = Math.PI / 2;
      shell.position.z = z0 + L / 2;
      shell.castShadow = a.cone !== 'clear';
      collar.add(shell);
      if (a.cone !== 'cardboard') {
        arc(collar, band, r1, a.cone === 'fabric' ? 0.011 : 0.006, Math.PI * 2, [0, 0, z0 + L]);
        arc(collar, band, r0, 0.009, Math.PI * 2, [0, 0, z0]);
        // The overlapping seam with its snap tabs.
        for (let i = 0; i < 4; i++) {
          const t = 0.15 + i * 0.24;
          const p = scoopAt(t, Math.PI * 0.82, -0.002);
          ball(collar, band, p, [0.012, 0.012, 0.004], [0, 0, 0], 8).lookAt(0, 0, p[2]);
        }
      } else {
        const tape = paint('#aeb4b8', { metalness: 0.5, roughness: 0.4 });
        arc(collar, tape, r0 + 0.004, 0.012, Math.PI * 2, [0, 0, z0]);
        const a0 = scoopAt(0, Math.PI * 0.8, -0.003), a1 = scoopAt(1, Math.PI * 0.8, -0.003);
        const strip = s.rod(a0, a1, 0.011, tape); collar.add(strip);
        const lab2 = s.label(random() < 0.5 ? 'FRAGILE' : 'THIS WAY UP', 0.12, 0.035, scoopAt(0.6, -Math.PI * 0.62, -0.004), '#7a2a20', '#b98d5a');
        lab2.lookAt(0, 0, z0 + 0.6 * L - 0.1); lab2.rotateY(Math.PI); collar.add(lab2);
      }
      if (a.cone === 'fabric') { shell.scale.set(1, 1, 1); collar.rotation.x = 0.08; }
      // What it has scooped up settles in the lowest part of the cone.
      if (a.scooped === 'kibble') {
        const n = 7 + Math.floor(random() * 6 + mood.density * 8);
        for (let i = 0; i < n; i++) ball(collar, paint(random() < 0.5 ? '#8a5a33' : '#a36b3a'), scoopAt(0.45 + random() * 0.5, (random() - 0.5) * 0.9, 0.008), [0.008, 0.006, 0.008], [0, 0, 0], 8);
      } else if (a.scooped === 'toy') {
        const p = scoopAt(0.72, (random() - 0.5) * 0.5, 0.036);
        ball(collar, paint('#c9e04a', { roughness: 0.95 }), p, [0.034, 0.034, 0.034]);
        arc(collar, paint('#f4f4ea'), 0.034, 0.0025, Math.PI * 1.3, p, [0.8, 0.5, 0]);
      } else if (a.scooped === 'leaves') {
        const n = 4 + Math.floor(random() * 4);
        for (let i = 0; i < n; i++) {
          const p = scoopAt(0.4 + random() * 0.55, (random() - 0.5) * 1.1, 0.006);
          ball(collar, paint(new THREE.Color().setHSL(0.06 + random() * 0.08, 0.7, 0.42)), p, [0.022, 0.003, 0.012], [random(), random() * 3, random()], 8);
        }
        const p = scoopAt(0.6, 0.2, 0.006), q = scoopAt(0.95, -0.2, 0.006);
        const twig = s.rod(p, q, 0.003, paint('#5a4030')); collar.add(twig);
      }
    }
    if (a.cone === 'donut' && a.scooped !== 'nothing' && a.scooped !== 'leaves') {
      // A donut scoops nothing, so the thing lies on the floor in front instead.
      if (a.scooped === 'toy') ball(s.root, paint('#c9e04a', { roughness: 0.95 }), [0.14 * size, 0.034, 0.2 * size + 0.05], [0.034, 0.034, 0.034]);
      else for (let i = 0; i < 8; i++) ball(s.root, paint('#8a5a33'), [(random() - 0.5) * 0.2, 0.005, 0.18 * size + random() * 0.1], [0.008, 0.006, 0.008], [0, 0, 0], 8);
    }

    // Pose the head.
    const yawSide = random() < 0.5 ? -1 : 1;
    let baseYaw = (random() - 0.5) * 0.2, basePitch = 0;
    if (asleep) { head.position.set(0, 0.17 + (chi ? 0.1 : 0), 0.09); basePitch = -0.5; head.rotation.z = (random() - 0.5) * 0.4; }
    else {
      head.position.set(0, 0.5, 0.07);
      if (droop) { basePitch = -0.2; head.position.y = 0.4; head.position.z = 0.12; }
      else if (joy) { basePitch = -0.22; head.rotation.z = (random() - 0.5) * 0.3; }
      else { baseYaw = yawSide * 0.42; basePitch = -0.12; }
    }
    head.rotation.x = basePitch; head.rotation.y = baseYaw;

    dog.scale.setScalar(size);

    // The doorframe it is stuck on.
    if (stuck && a.cone !== 'donut') {
      const jamb = s.material('#ece7dc', { roughness: 0.6 });
      const reach = (Math.sin(Math.abs(baseYaw)) * (z0 + L) + Math.cos(baseYaw) * r1) * size;
      const zrim = (0.07 + Math.cos(baseYaw) * (z0 + L) - Math.sin(Math.abs(baseYaw)) * r1) * size;
      const px = yawSide * (reach + 0.035), h = Math.max(0.55, 0.9 * size + 0.15);
      s.box([0.07, h, 0.13], [px, h / 2, zrim], jamb);
      s.box([0.085, h, 0.02], [px, h / 2, zrim + 0.075], jamb);
      s.box([0.09, 0.09, 0.15], [px, 0.045, zrim], jamb);
      for (let i = 0; i < 3 + mood.wear * 6; i++) s.box([0.004, 0.01 + random() * 0.03, 0.02 + random() * 0.05], [px - yawSide * 0.036, 0.5 * size + (random() - 0.5) * 0.12, zrim + (random() - 0.5) * 0.06], paint('#8f8a80'));
    }

    const speed = mix(2, 12, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (joy) { tail.rotation.y = Math.sin(time * speed) * 0.7; if (tongue) tongue.position.y = -0.068 + Math.sin(time * speed * 0.8) * 0.003; }
        else if (stuck) head.rotation.y = baseYaw - yawSide * Math.max(0, Math.sin(time * speed * 0.25)) * 0.07;
        else if (asleep) head.rotation.x = basePitch + Math.sin(time * 0.9) * 0.015;
        else tail.rotation.y = Math.sin(time * 0.8) * 0.08;
      },
    });
  },
});
