import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, bust, eye, fur, jaw } from './ape';

function weave(a: string, b: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = a; c.fillRect(0, 0, 128, 128);
  c.fillStyle = b;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2) c.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 4);
  return texture;
}

export default defineThing({
  questions: {
    flanges: score('How big are the cheek pads?', ['None: a narrow unflanged face', 'Low ridges just starting to swell', 'Wide fleshy pads framing the face', 'Enormous dinner-plate flanges and a heavy throat sac']),
    expression: choice('What is the face doing?', {
      serene: 'Serene: lips together, eyes calm and half-lidded, a monk at rest.',
      bellow: 'A long call: head thrown back, mouth a deep open O, throat sac ballooned.',
      kiss: 'A kiss-squeak: lips puckered far forward into a tight trumpet, annoyed.',
      sad: 'Drooping sadness: heavy lids, eyes cast down, lower lip hanging loose.',
    }),
    hair: choice('What state is the long hair in?', {
      shaggy: 'A full shaggy cape of long rust-orange hair pouring off the shoulders.',
      matted: 'Thin and matted, hanging in a few dull ropes with bare skin between.',
      windblown: 'Dry and flyaway, standing off the head and arms in a bright halo.',
    }),
    age: choice('How old is it?', {
      youngster: 'A youngster: small, bright orange, pale rings round the eyes and mouth, hair on end.',
      prime: 'In its prime: deep rust coat, dark slate face.',
      old: 'Very old: dark maroon-brown hair, grey slack skin, tired.',
    }),
    draped: choice('What is draped on its head?', {
      nothing: 'Nothing.',
      sack: 'A burlap feed sack pulled over the head like a shawl, the way zoo orangutans hide.',
      leaf: 'One huge green leaf worn as a rain hat.',
      leaves: 'A loose heap of leafy twigs piled on the crown.',
    }),
    gaze: choice('Where are the eyes?', {
      viewer: 'On you, steady and unblinking.',
      up: 'Lifted to the canopy or the skylight.',
      aside: 'Slid off to one side, pretending not to notice you.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const young = a.age === 'youngster', old = a.age === 'old';
    const K = young ? 0.68 : 1;
    const f = young ? Math.min(a.flanges, 0.12) : a.flanges;
    const rust = new THREE.Color(young ? '#dd741f' : old ? '#7c3b1d' : '#b9531b').lerp(new THREE.Color('#7a6a58'), mood.wear * 0.3);
    const skinTone = young ? '#6a5650' : old ? '#4a4244' : '#40343a';
    const skin = s.material(skinTone, { roughness: 0.6 });
    const pale = s.material(young ? '#e3b79c' : old ? '#8a7f78' : '#7a6258', { roughness: 0.6 });
    const under = s.material(rust.clone().multiplyScalar(0.55), { roughness: 0.95 });
    const gum = s.material('#b65a60', { roughness: 0.45 });
    const tooth = s.material(old ? '#cdb983' : '#efe6c8', { roughness: 0.4 });
    const matted = a.hair === 'matted', blown = a.hair === 'windblown';
    const hair = (o: Parameters<typeof fur>[1]) => fur(s, {
      ...o, color: rust,
      count: Math.round(o.count * (matted ? 0.6 : 1)),
      width: matted ? 0.34 : blown ? 0.2 : 0.27,
      droop: blown ? 0.58 : matted ? 0.92 : young ? 0.6 : 0.8,
      mess: blown ? 0.5 : 0.18 + mood.wear * 0.3,
    });

    // Sloping shoulders under a cape of hair.
    const sw = young ? 0.24 : 0.36, sh = young ? 0.24 : 0.32, sd = young ? 0.2 : 0.27;
    s.root.add(bust(s, [sw, sh, sd], under));
    const long = (young ? 0.1 : 0.17) * (matted ? 1.15 : 1);
    hair({ at: [0, 0.02, 0], radii: [sw, sh, sd], count: 1300, length: long, color: rust, keep: (d) => d.y > 0.12 });

    const bellow = a.expression === 'bellow', sad = a.expression === 'sad', kiss = a.expression === 'kiss';
    const head = new THREE.Group();
    head.position.set(0, sh + 0.17, 0.08);
    const side = random() < 0.5 ? -1 : 1;
    const gaze: [number, number] = sad ? [0.1 * side, -0.45] : a.gaze === 'up' ? [0, 0.45] : a.gaze === 'aside' ? [0.6 * side, 0] : [0, 0];
    head.rotation.set(-0.26 + (bellow ? -0.16 : sad ? 0.22 : 0) - (a.gaze === 'up' ? 0.1 : 0), a.gaze === 'aside' ? 0.3 * side : 0, sad ? 0.12 * side : (random() - 0.5) * 0.08);
    head.scale.setScalar(young ? 1.3 : 1.25);
    s.root.add(head);

    // Throat sac first so the head overlaps it.
    const sacSize = mix(0.25, 1, f) * (bellow ? 1.45 : 1);
    blob(s, [0.14 * sacSize, 0.11 * sacSize, 0.1 * sacSize], [0, -0.17, 0.06], pale, [0.2, 0, 0], head, 20);

    // High domed skull with hair swept down the back and sides.
    blob(s, [0.112, 0.14, 0.125], [0, 0.045, -0.02], under, [0, 0, 0], head);
    hair({ parent: head, at: [0, 0.045, -0.02], radii: [0.112, 0.14, 0.125], count: old ? 420 : 900, length: long * 0.4, color: rust, keep: (d) => (d.z < 0.25 || d.y > 0.7) && !(old && d.y > 0.6 && random() < 0.7) });
    // Face: a dished dark plate, pale eyelids, small close eyes.
    blob(s, [0.088, 0.112, 0.055], [0, 0.01, 0.075], skin, [0, 0, 0], head);
    const lid = { serene: 0.42, bellow: 0.75, kiss: 0.15, sad: 0.6 }[a.expression];
    const lidMat = s.material(young ? '#f0cdb4' : '#9a7f70', { roughness: 0.55 });
    blob(s, [0.07, 0.016, 0.02], [0, 0.066, 0.118], skin, [0.2, 0, 0], head, 14);
    for (const sx of [-1, 1]) {
      if (young) blob(s, [0.03, 0.03, 0.012], [sx * 0.031, 0.04, 0.118], pale, [0, 0, 0], head, 14);
      eye(s, { parent: head, at: [sx * 0.031, 0.04, 0.122], r: young ? 0.019 : 0.0165, iris: '#b0651f', gaze, lid, lidMat });
      // Sad brows tilt up in the middle.
      blob(s, [0.03, 0.009, 0.012], [sx * 0.033, 0.064, 0.127], skin, [0.2, 0, sx * (sad ? 0.4 : -0.05)], head, 10);
    }
    // Cheek flanges: fleshy half moons either side.
    if (f > 0.14) {
      const fw = mix(0.035, 0.098, f), fh = mix(0.09, 0.175, f);
      const flangeMat = s.material(old ? '#3f393b' : '#33282d', { roughness: 0.7 });
      for (const sx of [-1, 1]) {
        blob(s, [fw, fh, 0.03], [sx * (0.05 + fw * 0.66), 0.0, 0.058], flangeMat, [0, sx * -0.22, sx * 0.05], head, 22);
      }
      // The fatty crown pad that goes with them.
      blob(s, [0.085, 0.05 * f + 0.02, 0.07], [0, 0.135, 0.04], skin, [-0.3, 0, 0], head, 16);
    }

    // Muzzle.
    const gape = { serene: 0, bellow: 0.75, kiss: 0.05, sad: 0.16 }[a.expression];
    const mL = (young ? 0.1 : 0.125) * (kiss ? 1.12 : 1), mW = (young ? 0.1 : 0.132) * (kiss || bellow ? 0.85 : 1);
    const j = jaw(s, {
      parent: head, hinge: [0, -0.06, 0.035], length: mL, width: mW, slope: 0.16,
      upperHeight: 0.058, lowerHeight: 0.05, gape, lift: 0.25,
      upper: pale, lower: pale, gum, tooth, lip: skin, lipRadius: 0.0045,
      canine: young ? 0.006 : 0.022, lowerCanine: young ? 0.005 : 0.016, incisor: 0.012, teeth: old && mood.wear > 0.5 ? 'stumps' : 'whole', tongue: s.material('#d9727c', { roughness: 0.5 }),
    });
    for (const sx of [-1, 1]) blob(s, [0.006, 0.008, 0.005], [sx * 0.009, 0.038, mL * 0.78], s.material('#0d0909'), [0.6, 0, sx * 0.3], j.upper, 8);
    if (kiss || bellow) {
      const r = bellow ? 0.03 : 0.016;
      const lips = s.mesh(new THREE.TorusGeometry(r, bellow ? 0.011 : 0.012, 10, 24), pale);
      lips.position.set(0, bellow ? -0.02 : -0.002, mL * (bellow ? 0.96 : 1.04));
      lips.rotation.x = bellow ? 0.35 : 0;
      j.frame.add(lips);
      j.frame.add(blob(s, [r * 0.9, r * 0.9, 0.006], [0, lips.position.y, lips.position.z + 0.002], s.material('#1c0708'), [lips.rotation.x, 0, 0], undefined, 12));
    }
    if (sad) blob(s, [mW * 0.34, 0.012, 0.022], [0, -0.002, mL * 0.98], gum, [0.5, 0, 0], j.lower, 12);
    // Beard.
    if (!young) hair({ parent: j.lower, at: [0, -0.02, mL * 0.45], radii: [mW * 0.5, 0.05, mL * 0.5], count: 260, length: long * 0.5, color: rust, keep: (d) => d.y < -0.2 && d.z < 0.8 });

    // What is on its head.
    if (a.draped === 'sack') {
      const cloth = new THREE.MeshStandardMaterial({ map: weave('#b99a63', '#9c7f4c'), roughness: 1, side: THREE.DoubleSide });
      const geo = new THREE.SphereGeometry(1, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), flare = y < 0.2 ? 1 + (0.2 - y) * 0.9 : 1;
        const wob = 1 + Math.sin(Math.atan2(pos.getZ(i), pos.getX(i)) * 7 + y * 5) * 0.05 * (1 - y);
        pos.setXYZ(i, pos.getX(i) * flare * wob, y, pos.getZ(i) * flare * wob);
      }
      geo.computeVertexNormals();
      const hood = s.mesh(geo, cloth, [0, 0.055, -0.04]);
      hood.scale.set(0.15 + f * 0.05, 0.165, 0.155);
      hood.rotation.x = -0.62;
      head.add(hood);
      const stamp = s.label(['FEED', 'RICE 50KG', 'ZOO'][Math.floor(random() * 3)], 0.12, 0.04, [0, 0, 0], '#5a3d22', '#b99a63');
      stamp.position.set(-0.02, 0.17, -0.12);
      stamp.rotation.set(-0.95, Math.PI, 0.1);
      head.add(stamp);
    }
    if (a.draped === 'leaf') {
      const geo = new THREE.SphereGeometry(1, 20, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const taper = 1 - Math.max(0, z) ** 2 * 0.75;
        pos.setXYZ(i, x * taper, pos.getY(i) * 0.05 - x * x * 0.55 - z * z * 0.25, z);
      }
      geo.computeVertexNormals();
      const hat = new THREE.Group();
      hat.position.set(0, 0.225, 0);
      hat.rotation.set(-0.15, (random() - 0.5) * 0.6, (random() - 0.5) * 0.2);
      head.add(hat);
      const leaf = s.mesh(geo, s.material('#3f8a36', { roughness: 0.45, side: THREE.DoubleSide }));
      leaf.scale.set(0.2, 0.2, 0.27);
      hat.add(leaf);
      const sag = (x: number, z: number) => 0.012 - (x / 0.2) ** 2 * 0.11 - (z / 0.27) ** 2 * 0.05;
      hat.add(s.tube([-0.3, -0.15, 0, 0.15, 0.265].map((z) => [0, sag(0, z), z] as [number, number, number]), 0.006, s.material('#a8cf6a')));
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
        const z = -0.18 + i * 0.09, x = sx * 0.15 * (1 - Math.max(0, (z + 0.05) / 0.27) ** 2 * 0.75);
        hat.add(s.rod([0, sag(0, z), z], [x, sag(x, z + 0.05), z + 0.05], 0.0025, s.material('#a8cf6a')));
      }
    }
    if (a.draped === 'leaves') {
      const greens = ['#3f8a36', '#5aa23e', '#2f6e30', '#8fb84a'];
      for (let i = 0; i < 16; i++) {
        const ang = random() * Math.PI * 2, r = random() * 0.1;
        blob(s, [0.028, 0.004, 0.07], [Math.cos(ang) * r, 0.185 + random() * 0.05 - r * 0.5, -0.02 + Math.sin(ang) * r], s.material(greens[i % 4], { roughness: 0.5 }), [(random() - 0.5) * 0.9, random() * 6, (random() - 0.5) * 0.9], head, 8);
      }
      for (let i = 0; i < 3; i++) head.add(s.rod([(random() - 0.5) * 0.2, 0.2, (random() - 0.5) * 0.16], [(random() - 0.5) * 0.3, 0.19 + random() * 0.06, (random() - 0.5) * 0.24], 0.005, s.material('#5a4326')));
    }

    s.root.scale.setScalar(K);
    let t0 = random() * 10;
    const rest = head.rotation.clone(), restJaw = j.lower.rotation.x;
    const speed = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (dt) => {
        t0 += dt * speed;
        head.rotation.z = rest.z + Math.sin(t0 * 0.6) * 0.025;
        if (bellow) j.lower.rotation.x = restJaw * (1 + Math.sin(t0 * 4) * 0.06);
      },
    });
  },
});
