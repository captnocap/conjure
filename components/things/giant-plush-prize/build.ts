import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const FUR = {
  pink: 'Neon carnival pink.',
  blue: 'Sky blue.',
  lime: 'Radioactive lime green.',
  brown: 'Classic teddy brown.',
  purple: 'Grape purple.',
  white: 'White, which shows every stain.',
  rainbow: 'Tie-dye: every limb a different colour.',
} as const;
const FUR_COLOURS: Record<Exclude<keyof typeof FUR, 'rainbow'>, string> = { pink: '#f0509a', blue: '#62b4e8', lime: '#9be03a', brown: '#a8703f', purple: '#8a4fc0', white: '#f3efe6' };
const RAINBOW = ['#e8413c', '#f39a2b', '#f4d53a', '#58b85c', '#3f8fd8', '#8a4fc0'];

export default defineThing({
  questions: {
    animal: choice('What kind of giant plush is it?', {
      bear: 'A fat teddy bear with round ears, the classic top-shelf prize.',
      banana: 'A grinning banana with stubby arms and legs, for no reason at all.',
      alien: 'A big-headed alien with huge black eyes and antennae.',
      unicorn: 'A unicorn with a gold horn and a rainbow mane.',
      gorilla: 'A long-armed gorilla clutching a plush banana.',
    }),
    fur: choice('What colour is its plush?', FUR),
    pose: choice('How is it sitting, and what happened to it?', {
      proud: 'Upright with arms flung wide, just won and shown off.',
      slumped: 'Sagging forward with its head down, forgotten on a bench in the rain.',
      toppled: 'Fallen over on its side where someone put it down.',
      facedown: 'Face down in the grass, abandoned outright.',
    }),
    eyes: choice('What are its eyes like?', {
      buttons: 'Glossy black buttons.',
      cartoon: 'Huge white cartoon eyes with black pupils.',
      crosses: 'Stitched black crosses.',
      missing: 'One button eye, and loose threads where the other was.',
    }),
    extra: choice('What is it wearing or carrying?', {
      bow: 'A big satin bow at the neck.',
      shades: 'Novelty sunglasses.',
      rosette: 'A blue first-place rosette pinned to its chest.',
      tag: 'The game\'s price tag still dangling from one ear.',
      none: 'Nothing.',
    }),
    size: score('How big is it?', ['An armful', 'As big as a child', 'As big as the person who won it', 'Far too big to fit in a car']),
    stuffing: noul('Has a seam split so that stuffing is spilling out?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const doll = new THREE.Group();
    const head = new THREE.Group();
    s.root.add(doll);
    const grime = mood.wear * 0.4;
    let part = Math.floor(random() * 6);
    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const mat = (colour: string, opts: THREE.MeshStandardMaterialParameters = {}) => {
      const key = colour + JSON.stringify(opts);
      if (!mats.has(key)) {
        const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 1, ...opts });
        if (!opts.metalness) m.color.lerp(new THREE.Color('#6d6558'), grime);
        mats.set(key, m);
      }
      return mats.get(key)!;
    };
    const natural = a.animal === 'banana' && a.fur !== 'rainbow' && a.fur !== 'pink' && a.fur !== 'purple' ? '#f4d23c' : a.animal === 'gorilla' && a.fur === 'brown' ? '#3c3431' : null;
    const fur = () => mat(a.fur === 'rainbow' ? RAINBOW[part++ % 6] : natural ?? FUR_COLOURS[a.fur]);
    const main = fur();
    const pale = mat(a.fur === 'white' ? '#e6d8c2' : '#f6efe0');
    const black = mat('#17171a', { roughness: 0.25 });
    const geo = new THREE.SphereGeometry(1, 18, 12);
    const blob = (group: THREE.Object3D, scale: [number, number, number], at: [number, number, number], material: THREE.Material, turn: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.scale.set(...scale); mesh.position.set(...at); mesh.rotation.set(...turn);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const proud = a.pose === 'proud';

    // Anchors that the face and accessories hang from.
    let headY = 1.12, headR = 0.34, faceZ = 0.3, eyeY = 0.06, eyeDX = 0.13, eyeR = 0.04, neckY = 0.86, chestZ = 0.37, earAt: [number, number, number] = [0.25, 0.27, 0];

    if (a.animal === 'bear' || a.animal === 'gorilla' || a.animal === 'unicorn') {
      const g = a.animal === 'gorilla';
      blob(doll, [0.44, 0.5, 0.38], [0, 0.5, 0], main);
      blob(doll, [0.3, 0.34, 0.12], [0, 0.52, 0.29], pale);
      for (const x of [-1, 1]) {
        const limb = fur();
        blob(doll, [0.16, 0.16, 0.32], [x * 0.27, 0.17, 0.4], limb, [0, x * 0.25, 0]);
        blob(doll, [0.13, 0.15, 0.05], [x * 0.33, 0.19, 0.69], pale, [0, x * 0.25, 0]);
        const arm = fur();
        const len = g ? 0.4 : 0.28, th = proud ? 2.05 : 0.4;
        blob(doll, [0.13, len, 0.13], [x * (0.4 + Math.sin(th) * len * 0.8), 0.8 - Math.cos(th) * len * 0.8, 0.08], arm, [0, 0, x * th]);
      }
      head.position.set(0, headY, 0.02);
      blob(head, [headR * 1.08, headR, headR], [0, 0, 0], fur());
      if (a.animal === 'unicorn') {
        blob(head, [0.2, 0.18, 0.26], [0, -0.08, 0.28], pale);
        for (const x of [-1, 1]) { blob(head, [0.022, 0.03, 0.02], [x * 0.07, -0.06, 0.52], black); const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), main); ear.position.set(x * 0.2, 0.34, -0.02); ear.rotation.z = -x * 0.3; ear.castShadow = true; head.add(ear); }
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 10), mat('#e9bd3c', { metalness: 0.6, roughness: 0.3 }));
        horn.position.set(0, 0.5, 0.12); horn.rotation.x = 0.25; horn.castShadow = true; head.add(horn);
        for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06 - i * 0.012, 0.012, 6, 14), mat('#fff4c9')); r.position.set(0, 0.36 + i * 0.085, 0.085 + i * 0.022); r.rotation.x = Math.PI / 2 + 0.25; head.add(r); }
        for (let i = 0; i < 7; i++) blob(i < 4 ? head : doll, [0.1, 0.11, 0.1], i < 4 ? [0, 0.3 - i * 0.13, -0.26 - i * 0.03] : [0, 0.9 - (i - 4) * 0.16, -0.36], mat(RAINBOW[i % 6]));
        for (let i = 0; i < 4; i++) blob(doll, [0.08, 0.1, 0.08], [0.1 * Math.sin(i), 0.12 + i * 0.03, -0.42 - i * 0.1], mat(RAINBOW[(i + 2) % 6]));
        faceZ = 0.26; eyeY = 0.08; eyeDX = 0.19; earAt = [0.2, 0.36, 0];
      } else {
        blob(head, [0.17, 0.13, 0.12], [0, -0.07, 0.29], pale);
        blob(head, [0.05, 0.035, 0.03], [0, -0.03, 0.4], black);
        for (const x of [-1, 1]) { blob(head, [0.12, 0.12, 0.06], [x * 0.27, 0.26, 0], main); blob(head, [0.07, 0.07, 0.03], [x * 0.27, 0.26, 0.04], pale); }
        if (g) { blob(head, [0.26, 0.2, 0.1], [0, 0.0, 0.25], pale); blob(head, [0.3, 0.07, 0.08], [0, 0.15, 0.27], main); eyeY = 0.07; }
      }
      if (g) {
        // The gorilla's banana, held in its right hand.
        const th = proud ? 2.05 : 0.4, bx = 0.4 + Math.sin(th) * 0.4 * 1.7, by = 0.8 - Math.cos(th) * 0.4 * 1.7;
        for (let i = 0; i < 5; i++) blob(doll, [0.05, 0.08, 0.05], [bx + Math.sin(i * 0.4) * 0.05, by + i * 0.09 - 0.1, 0.25], mat(i === 4 ? '#6b4a22' : '#f4d23c'), [0, 0, -i * 0.15]);
      }
    } else if (a.animal === 'banana') {
      const n = 15;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), w = 0.29 * Math.pow(Math.sin(Math.PI * mix(0.1, 0.9, t)), 0.7) + 0.02;
        blob(doll, [w, 0.22, w * 0.92], [-Math.cos(t * 2.4 - 1.2) * 0.32 + 0.2, 0.2 + t * 1.4, 0], i === 0 ? mat('#6b4a22') : a.fur === 'rainbow' && i % 3 === 0 ? fur() : main);
      }
      blob(doll, [0.05, 0.12, 0.05], [0.13, 1.76, 0], mat('#6b4a22'), [0, 0, -0.6]);
      for (const x of [-1, 1]) {
        blob(doll, [0.07, 0.24, 0.07], [x * 0.4 - 0.1, 0.86 + (proud ? 0.2 : -0.08), 0.03], main, [0, 0, x * (proud ? -1.0 : 0.5)]);
        blob(doll, [0.09, 0.09, 0.2], [x * 0.16 + 0.05, 0.1, 0.2], main, [0, x * 0.3, 0]);
        blob(doll, [0.1, 0.11, 0.05], [x * 0.2 + 0.05, 0.11, 0.4], mat('#ffffff'));
      }
      head.position.set(-0.1, 1.1, 0);
      headR = 0.3; faceZ = 0.27; eyeY = 0.1; eyeDX = 0.1; neckY = 0.72; chestZ = 0.3; earAt = [0.07, 0.62, 0];
    } else {
      blob(doll, [0.2, 0.36, 0.17], [0, 0.42, 0], main);
      for (const x of [-1, 1]) {
        blob(doll, [0.06, 0.34, 0.06], [x * (0.3 + (proud ? 0.12 : 0)), 0.5 + (proud ? 0.25 : 0), 0.04], fur(), [0, 0, x * (proud ? -0.9 : 0.35)]);
        blob(doll, [0.08, 0.08, 0.3], [x * 0.15, 0.09, 0.3], fur(), [0, x * 0.3, 0]);
        blob(doll, [0.1, 0.06, 0.14], [x * 0.22, 0.07, 0.6], main);
      }
      head.position.set(0, 1.08, 0.02);
      const skull = blob(head, [0.46, 0.4, 0.4], [0, 0.08, 0], fur());
      skull.geometry = new THREE.SphereGeometry(1, 20, 14);
      const pos = skull.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const k = y < 0 ? 1 + y * 0.45 : 1; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); if (y < 0) pos.setY(i, y * 1.3); }
      skull.geometry.computeVertexNormals();
      for (const x of [-1, 1]) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 6), black);
        stalk.position.set(x * 0.2, 0.58, 0); stalk.rotation.z = -x * 0.3; head.add(stalk);
        blob(head, [0.06, 0.06, 0.06], [x * 0.245, 0.74, 0], mat('#ff5fae', { emissive: '#ff2f8e', emissiveIntensity: 0.6 }));
      }
      headR = 0.42; faceZ = 0.33; eyeY = 0.06; eyeDX = 0.17; eyeR = 0.075; neckY = 0.76; chestZ = 0.19; earAt = [0.4, 0.2, 0];
    }
    doll.add(head);

    // Eyes, drawn in the chosen style.
    for (const x of [-1, 1]) {
      const at: [number, number, number] = [x * eyeDX, eyeY, faceZ];
      const lost = a.eyes === 'missing' && x === 1;
      const slant: [number, number, number] = a.animal === 'alien' ? [0, x * 0.4, x * 0.6] : [0, 0, 0];
      if (lost) {
        for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 4), black); t.position.set(at[0] + (i - 1) * 0.015, at[1] - 0.03, at[2] + 0.02); t.rotation.set(0.6, 0, (i - 1) * 0.5); head.add(t); }
      } else if (a.eyes === 'crosses') {
        for (const r of [-1, 1]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(eyeR * 3, eyeR * 0.5, 0.02), black); bar.position.set(at[0], at[1], at[2] + 0.02); bar.rotation.z = r * Math.PI / 4; bar.lookAt; head.add(bar); }
      } else if (a.eyes === 'cartoon') {
        blob(head, [eyeR * 2, eyeR * 2.3, eyeR], [at[0], at[1] + 0.02, at[2] - 0.01], mat('#ffffff', { roughness: 0.4 }), slant);
        blob(head, [eyeR * 0.9, eyeR * 1.1, eyeR * 0.6], [at[0] + (mood.cheer - 0.5) * 0.03, at[1] - (1 - mood.cheer) * 0.03, at[2] + eyeR * 0.7], black);
      } else {
        blob(head, a.animal === 'alien' ? [eyeR * 1.3, eyeR * 2, eyeR * 0.6] : [eyeR, eyeR, eyeR * 0.7], at, black, slant);
      }
    }
    // Mouth: a smile that flattens and inverts as cheer falls.
    if (a.animal !== 'unicorn') {
      const mouthY = a.animal === 'banana' ? -0.08 : a.animal === 'alien' ? -0.22 : -0.11;
      const mouthZ = a.animal === 'banana' ? faceZ + 0.01 : a.animal === 'alien' ? 0.25 : 0.4;
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI * 0.8), black);
      const up = mood.cheer > 0.4;
      smile.position.set(0, mouthY + (up ? 0.04 : -0.05), mouthZ);
      smile.rotation.z = up ? Math.PI * 1.1 : Math.PI * 0.1;
      head.add(smile);
    }

    // Accessories.
    if (a.extra === 'bow') {
      const satin = mat(a.fur === 'pink' ? '#3f8fd8' : '#e23b55', { roughness: 0.35 });
      for (const x of [-1, 1]) { const wing = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 4), satin); wing.position.set(x * 0.15, neckY, chestZ - 0.02); wing.rotation.z = x * Math.PI / 2; wing.scale.z = 0.45; wing.castShadow = true; doll.add(wing); }
      blob(doll, [0.06, 0.06, 0.05], [0, neckY, chestZ], satin);
      for (const x of [-1, 1]) blob(doll, [0.04, 0.14, 0.02], [x * 0.06, neckY - 0.16, chestZ + 0.01], satin, [0, 0, x * 0.3]);
    } else if (a.extra === 'shades') {
      const lens = mat('#111118', { roughness: 0.1, metalness: 0.5 });
      for (const x of [-1, 1]) blob(head, [eyeDX * 0.85, 0.075, 0.03], [x * eyeDX, eyeY + 0.01, faceZ + 0.03], lens);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(eyeDX * 2, 0.025, 0.02), lens); bridge.position.set(0, eyeY + 0.04, faceZ + 0.03); head.add(bridge);
    } else if (a.extra === 'rosette') {
      const blue = mat('#2452b8', { roughness: 0.4 });
      const rx = 0.16, ry = neckY - 0.2;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), blue); disc.rotation.x = Math.PI / 2; disc.position.set(rx, ry, chestZ + 0.01); doll.add(disc);
      const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 14), mat('#f3d46a', { roughness: 0.4 })); centre.rotation.x = Math.PI / 2; centre.position.set(rx, ry, chestZ + 0.02); doll.add(centre);
      for (const x of [-1, 1]) { const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.01), blue); tail.position.set(rx + x * 0.04, ry - 0.17, chestZ + 0.005); tail.rotation.z = x * 0.2; doll.add(tail); }
    } else if (a.extra === 'tag') {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.008), mat('#f7f1dc'));
      tag.position.set(earAt[0] + 0.1, earAt[1] - 0.18, earAt[2] + 0.06); tag.rotation.z = -0.3; tag.castShadow = true; head.add(tag);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), black); str.position.set(earAt[0] + 0.05, earAt[1] - 0.03, earAt[2] + 0.05); str.rotation.z = -0.5; head.add(str);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.01), mat('#d5332f')); stripe.position.copy(tag.position).add(new THREE.Vector3(0.012, 0.04, 0.003)); stripe.rotation.z = -0.3; head.add(stripe);
    }

    // Split seam.
    const fluff: THREE.Mesh[] = [];
    if (a.stuffing) {
      const wad = mat('#fbfaf4');
      for (let i = 0; i < 7; i++) fluff.push(blob(doll, [0.07 + random() * 0.05, 0.06 + random() * 0.04, 0.07], [-0.3 - random() * 0.2, 0.42 + (random() - 0.5) * 0.22, 0.2 + random() * 0.16], wad));
      blob(doll, [0.02, 0.16, 0.02], [-0.3, 0.44, 0.27], black, [0, 0, 0.3]);
    }

    // Pose.
    const scale = mix(0.6, 1.55, a.size);
    doll.scale.setScalar(scale);
    if (a.pose === 'slumped') { doll.rotation.x = mix(0.3, 0.5, random()); head.rotation.set(0.55, (random() - 0.5) * 0.6, (random() - 0.5) * 0.5); head.position.y -= 0.05; }
    else if (a.pose === 'toppled') { doll.rotation.z = (random() < 0.5 ? 1 : -1) * mix(1.25, 1.5, random()); doll.rotation.y = (random() - 0.5) * 0.6; head.rotation.z = (random() - 0.5) * 0.4; }
    else if (a.pose === 'facedown') { doll.rotation.x = mix(1.35, 1.55, random()); doll.rotation.y = (random() - 0.5) * 0.8; }
    else { head.rotation.z = (random() - 0.5) * 0.25; doll.rotation.y = (random() - 0.5) * 0.3; }
    doll.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(doll);
    doll.position.y = -box.min.y - (a.pose === 'proud' ? 0 : 0.03 * scale);

    // On the ground around it: a wet patch when it has been left out, and loose stuffing.
    if (!proud && mood.wear > 0.35) {
      const centre = box.getCenter(new THREE.Vector3());
      const puddle = s.cylinder(1, 1, 0.006, [centre.x + 0.1, 0.003, centre.z + 0.15], new THREE.MeshStandardMaterial({ color: '#8b949a', roughness: 0.08, metalness: 0.2 }), 28);
      puddle.scale.set(0.55 * scale * mix(0.8, 1.2, mood.wear), 1, 0.42 * scale);
      puddle.castShadow = false;
    }
    if (a.stuffing) for (let i = 0; i < 5; i++) s.ball([0.06, 0.04, 0.06], [-0.5 * scale - random() * 0.5, 0.035, (random() - 0.2) * 0.8], mat('#fbfaf4'), 8);

    return s.finish({ footprint: 0.6 * scale });
  },
});
