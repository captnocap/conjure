import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex } from '@conjure/kit';

type P3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default defineThing({
  questions: {
    age: choice('Who is the witch?', {
      apprentice: 'A young apprentice, slight and upright, eager and a little nervous.',
      herbalist: 'A sharp middle-aged herbalist, tall, straight-backed and knowing.',
      grandmother: 'A stooped old grandmother witch, bent over with decades of spells.',
    }),
    pose: choice('What is she doing?', {
      stirring: 'Stirring a bubbling pot with the long wooden paddle in both hands.',
      reciting: 'Reading a recipe aloud, holding something up before her face, the paddle planted like a staff.',
      sniffing: 'Sniffing at something held to her nose, head bent, the paddle at her side.',
      cackling: 'Cackling with both arms flung up, paddle brandished high.',
    }),
    holding: choice('What does she hold besides the paddle?', {
      book: 'A fat open spellbook.',
      jar: 'A stoppered glass jar with something glowing inside.',
      candle: 'A lit candle stub.',
      skull: 'A small yellowed skull.',
      herbs: 'A fresh-cut bunch of herbs.',
    }),
    dress: paint('What colour is her long dress?', ['black', 'charcoal', 'forest', 'purple', 'indigo', 'brown', 'crimson', 'olive']),
    shawl: paint('What colour is her shawl?', ['rust', 'amber', 'crimson', 'olive', 'lavender', 'cream', 'teal', 'grey']),
    head: choice('What is on her head?', {
      pointed: 'A tall crisp pointed witch hat with a wide brim.',
      crumpled: 'A battered pointed hat bent over at the tip.',
      scarf: 'A knotted headscarf over her hair.',
      hood: 'The hood of her cloak pulled up.',
    }),
    hair: choice('What is her hair like?', {
      grey: 'Long wild grey hair.',
      black: 'Long raven-black hair.',
      red: 'Long flaming red hair.',
      white: 'Snow-white hair in a bun.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = { apprentice: 1.55, herbalist: 1.7, grandmother: 1.55 }[a.age];
    const dressHex = paintHex(a.dress);
    const shawlHex = paintHex(a.shawl);
    const hairHex = { grey: '#8e8a86', black: '#1a1618', red: '#a8401c', white: '#e8e4dc' }[a.hair];
    const skin = ['#e3c0a0', '#c89a74', '#8a5a3c', '#f0d2b8', '#a87a58'][Math.floor(random() * 5)];
    const wood = s.material('#8a6038', { roughness: 0.75 });
    const cloth = s.material(dressHex, { roughness: 0.9, side: THREE.DoubleSide });
    const shawlMat = s.material(shawlHex, { roughness: 0.95, side: THREE.DoubleSide });
    const glowLevel = mix(0.5, 2.6, 0.5 * mood.energy + 0.5 * mood.daylight);

    const person = figure(s, {
      height: H, build: a.age === 'apprentice' ? 'slight' : a.age === 'grandmother' ? 'average' : 'slight',
      style: 'doll', face: 'dots', pose: 'standing',
      hair: a.head === 'hood' ? 'hood' : a.hair === 'white' ? 'bun' : 'long', hairColor: hairHex,
      skin, top: dressHex, bottom: dressHex, shoes: '#1c1612', sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const stooped = a.age === 'grandmother';
    if (stooped) { joints.spine.rotation.x = 0.42; joints.neck.rotation.x = -0.3; }
    if (a.pose === 'stirring') joints.spine.rotation.x += 0.12;
    if (a.pose === 'sniffing') joints.neck.rotation.x += 0.25;
    if (a.pose === 'cackling') { joints.neck.rotation.x -= 0.45; joints.spine.rotation.x -= stooped ? 0.15 : 0.1; }
    joints.hips.left.rotation.z = 0.08; joints.hips.right.rotation.z = -0.08;
    person.settle();
    s.root.updateMatrixWorld(true);
    const world = (o: THREE.Object3D) => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };

    // The long skirt, falling from the waist to the floor in folds.
    const waist = world(person.pelvis);
    const phase = random() * 6;
    s.surface((u, v, target) => {
      const t = u * Math.PI * 2;
      const fold = 1 + 0.06 * Math.sin(t * 9 + phase) * v + 0.03 * Math.sin(t * 4 + phase * 2) * v;
      const rx = mix(0.085 * H, 0.2 * H, Math.pow(v, 0.8)) * fold, rz = mix(0.07 * H, 0.17 * H, Math.pow(v, 0.8)) * fold;
      target.set(waist.x + Math.cos(t) * rx, mix(waist.y + 0.06 * H, 0.015 * H, v), waist.z + 0.02 * H * v + Math.sin(t) * rz);
    }, cloth, { segments: [48, 14], wrap: true });
    s.ring(0.085 * H, 0.012 * H, [waist.x, waist.y + 0.05 * H, waist.z], s.material('#3a2a1a')).scale.set(1, 0.82, 1);
    s.root.children[s.root.children.length - 1].rotation.x = Math.PI / 2;

    // The shawl hangs from the shoulders, following the spine, with its point down the back.
    const torsoL = H * 0.28;
    const shawlGeo = (() => {
      const tmp = new Sculpture(context);
      return tmp.surface((u, v, target) => {
        const t = mix(0.35, Math.PI * 2 - 0.35, u) + Math.PI / 2; // open at the front (+z)
        const back = Math.max(0, -Math.sin(t));
        const rx = mix(0.05 * H, 0.175 * H, Math.pow(v, 0.6)), rz = mix(0.05 * H, 0.095 * H, Math.pow(v, 0.6));
        const drop = mix(0, torsoL * (0.55 + 0.6 * back * back), v);
        target.set(Math.cos(t) * rx, torsoL * 1.02 - drop, Math.sin(t) * rz - 0.004 * H);
      }, shawlMat, { segments: [36, 10] }).geometry;
    })();
    const shawl = new THREE.Mesh(shawlGeo, shawlMat);
    shawl.castShadow = true;
    joints.spine.add(shawl);
    // Fringe along the shawl's point.
    const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.02 * H, 0.06 * H, 6), shawlMat);
    fringe.position.set(0, torsoL * 1.02 - torsoL * 1.15 - 0.02 * H, -0.095 * H);
    fringe.rotation.x = Math.PI;
    joints.spine.add(fringe);

    // Headwear.
    const headR = H * 0.064;
    const felt = s.material('#16141a', { roughness: 0.9, side: THREE.DoubleSide });
    if (a.head === 'pointed' || a.head === 'crumpled') {
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.95, headR * 1.95, headR * 0.08, 28), felt);
      hat.add(brim);
      const bend = a.head === 'crumpled' ? 0.9 : 0.08;
      const tmp = new Sculpture(context);
      const cone = new THREE.Mesh(tmp.surface((u, v, target) => {
        const t = u * Math.PI * 2;
        const r = headR * 1.0 * Math.pow(1 - v, 1.1) * (a.head === 'crumpled' ? 1 + 0.06 * Math.sin(v * 18 + t) : 1);
        const fold = Math.max(0, v - 0.55);
        target.set(-bend * headR * Math.pow(v, 2.4) + Math.cos(t) * r, headR * 4.6 * v - fold * fold * headR * 5 * bend, -0.25 * headR * v * v + Math.sin(t) * r);
      }, felt, { segments: [28, 20], wrap: true }).geometry, felt);
      hat.add(cone);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.0, headR * 0.3, 24, 1, true), s.material(shawlHex, { side: THREE.DoubleSide }));
      band.position.y = headR * 0.17; hat.add(band);
      hat.position.set(0, headR * 0.75, -headR * 0.05);
      hat.rotation.set(-0.08, 0, (random() - 0.5) * 0.2);
      hat.traverse((c) => { c.castShadow = true; });
      person.head.add(hat);
    } else if (a.head === 'scarf') {
      const scarf = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), shawlMat);
      scarf.position.y = headR * 0.08; scarf.rotation.x = -0.25; scarf.castShadow = true;
      person.head.add(scarf);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.3, 10, 8), shawlMat);
      knot.position.set(0, -headR * 0.75, headR * 0.6); person.head.add(knot);
    } else {
      const hood = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.6, headR * 1.4, 10), s.material(dressHex));
      hood.position.set(0, headR * 0.7, -headR * 0.9); hood.rotation.x = -1.1; person.head.add(hood);
    }

    // The paddle: a long wooden pole with a flat blade.
    const paddle = (from: THREE.Vector3, to: THREE.Vector3) => {
      // `from` is the blade end.
      s.rod(from.toArray() as P3, to.toArray() as P3, 0.017, wood);
      const dir = to.clone().sub(from).normalize();
      const blade = s.box([0.1, 0.24, 0.022], from.clone().addScaledVector(dir, 0.08).toArray() as P3, wood);
      blade.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      s.ball([0.022, 0.022, 0.022], to.toArray() as P3, wood, 8);
    };

    // What she holds.
    const item = (kind: typeof a.holding) => {
      const g = new THREE.Group();
      const m = (geo: THREE.BufferGeometry, mat: THREE.Material, at: P3, rot: P3 = [0, 0, 0]) => { const x = new THREE.Mesh(geo, mat); x.position.set(...at); x.rotation.set(...rot); x.castShadow = true; g.add(x); return x; };
      if (kind === 'book') {
        const cover = s.material('#5a1f22', { roughness: 0.7 });
        const page = s.material('#ece2c6', { roughness: 0.9 });
        for (const sgn of [-1, 1]) {
          m(new THREE.BoxGeometry(0.15, 0.2, 0.012), cover, [sgn * 0.075, 0, -0.006], [0, -sgn * 0.25, 0]);
          m(new THREE.BoxGeometry(0.135, 0.185, 0.02), page, [sgn * 0.07, 0, 0.008], [0, -sgn * 0.25, 0]);
        }
      } else if (kind === 'jar') {
        const glow = s.material('#8adc3a', { emissive: '#6ac02a', emissiveIntensity: glowLevel });
        m(new THREE.CylinderGeometry(0.04, 0.045, 0.1, 14), glow, [0, 0, 0]);
        m(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe8e0', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), [0, 0.01, 0]);
        m(new THREE.CylinderGeometry(0.03, 0.026, 0.04, 10), s.material('#8a6a4a'), [0, 0.09, 0]);
      } else if (kind === 'candle') {
        m(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 14), s.material('#3a3836', { metalness: 0.5 }), [0, -0.02, 0]);
        m(new THREE.CylinderGeometry(0.022, 0.024, 0.1, 12), s.material('#efe6cf'), [0, 0.035, 0]);
        m(new THREE.SphereGeometry(1, 8, 6), s.material('#ffd070', { emissive: '#ffa030', emissiveIntensity: glowLevel }), [0, 0.105, 0]).scale.set(0.01, 0.025, 0.01);
      } else if (kind === 'skull') {
        const bone = s.material('#e0d4b0', { roughness: 0.6 });
        m(new THREE.SphereGeometry(0.06, 14, 10), bone, [0, 0.02, 0]).scale.set(0.9, 0.95, 1.05);
        m(new THREE.BoxGeometry(0.06, 0.04, 0.05), bone, [0, -0.03, 0.025]);
        for (const sgn of [-1, 1]) m(new THREE.SphereGeometry(0.016, 8, 6), s.material('#1a1410'), [sgn * 0.022, 0.012, 0.055]);
        m(new THREE.ConeGeometry(0.008, 0.016, 3), s.material('#1a1410'), [0, -0.01, 0.06], [Math.PI, 0, 0]);
      } else {
        for (let i = 0; i < 8; i++) {
          const t = i / 8 * Math.PI * 2;
          m(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), s.material('#4a6a2a'), [Math.cos(t) * 0.012, 0.05, Math.sin(t) * 0.012], [Math.sin(t) * 0.25, 0, -Math.cos(t) * 0.25]);
          m(new THREE.SphereGeometry(1, 6, 4), s.material(i % 3 ? '#5a8a3a' : '#8a6ac8'), [Math.cos(t) * 0.035, 0.15, Math.sin(t) * 0.035]).scale.set(0.02, 0.035, 0.01);
        }
        m(new THREE.TorusGeometry(0.016, 0.005, 6, 10), s.material('#b49a6a'), [0, 0.0, 0], [Math.PI / 2, 0, 0]);
      }
      s.root.add(g);
      return g;
    };

    const head = world(person.head);
    const flames: THREE.Mesh[] = [];
    const bubbles: THREE.Mesh[] = [];
    if (a.pose === 'stirring') {
      // A small cauldron in front of her.
      const potZ = waist.z + 0.42 * H * (stooped ? 0.95 : 1), potX = waist.x - 0.02;
      const iron = s.material('#1c1b1d', { roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide });
      const pr = 0.24;
      s.lathe([[0.001, 0.08], [0.12, 0.085], [0.2, 0.13], [pr, 0.24], [0.22, 0.35], [0.19, 0.4], [0.205, 0.42], [0.18, 0.42]], iron, [potX, 0, potZ]);
      for (let i = 0; i < 3; i++) { const t = i * 2.1 + 0.5; s.rod([potX + Math.sin(t) * 0.12, 0.1, potZ + Math.cos(t) * 0.12], [potX + Math.sin(t) * 0.16, 0, potZ + Math.cos(t) * 0.16], 0.02, iron); }
      const brew = s.material('#6aa83a', { emissive: '#5a9a2a', emissiveIntensity: glowLevel * 0.6 });
      s.cylinder(0.19, 0.19, 0.01, [potX, 0.4, potZ], brew, 24);
      for (let i = 0; i < 5; i++) {
        const t = random() * 6, d = random() * 0.13;
        bubbles.push(s.ball([0.025, 0.02, 0.025], [potX + Math.cos(t) * d, 0.405, potZ + Math.sin(t) * d], s.material('#a8dc6a', { emissive: '#5a9a2a', emissiveIntensity: glowLevel * 0.4 }), 8));
      }
      for (let i = 0; i < 4; i++) {
        const t = i * 1.6;
        const f = s.mesh(new THREE.ConeGeometry(0.04, 0.12, 6), new THREE.MeshStandardMaterial({ color: '#ff9a2a', emissive: '#ff6a10', emissiveIntensity: glowLevel, transparent: true, opacity: 0.9, depthWrite: false }), [potX + Math.cos(t) * 0.06, 0.06, potZ + Math.sin(t) * 0.06]);
        flames.push(f);
      }
      // The paddle stands in the pot and leans back to her hands.
      const blade = V(potX + 0.02, 0.28, potZ);
      const topEnd = V(waist.x - 0.1, waist.y + 0.27 * H * (stooped ? 0.85 : 1), waist.z + 0.14 * H);
      paddle(blade, topEnd);
      const along = (f: number) => blade.clone().lerp(topEnd, f);
      person.reach('right', along(0.6), { space: s.root });
      person.reach('left', along(0.85), { space: s.root });
      person.lookAt(V(potX, 0.42, potZ), s.root);
      const it = item(a.holding);
      it.position.set(waist.x + 0.32 * H, a.holding === 'book' ? 0.12 : 0.08, waist.z + 0.18 * H);
      if (a.holding === 'book') it.rotation.x = -Math.PI / 2 + 0.05;
      if (a.holding !== 'book') s.box([0.16, 0.06, 0.16], [it.position.x, 0.03, it.position.z], s.material('#6b4a2e'));
    } else {
      // The paddle is planted like a staff at her right side, or brandished overhead.
      const it = item(a.holding);
      if (a.pose === 'cackling') {
        const up = V(waist.x - 0.4 * H, waist.y + 1.4 * H, waist.z + 0.1 * H);
        person.reach('right', up, { space: s.root });
        person.reach('left', V(waist.x + 0.4 * H, waist.y + 1.4 * H, waist.z + 0.15 * H), { space: s.root });
        s.root.updateMatrixWorld(true);
        const hand = world(person.hands.right);
        const dir = hand.clone().sub(world(joints.shoulders.right)).normalize();
        paddle(hand.clone().addScaledVector(dir, 0.55), hand.clone().addScaledVector(dir, -0.55));
        it.position.copy(world(person.hands.left)).add(V(0, 0.06, 0));
      } else {
        const staffX = waist.x - 0.24 * H, staffZ = waist.z + 0.12 * H;
        paddle(V(staffX, 0.03, staffZ), V(staffX, 0.03 + 1.15 * H, staffZ));
        person.reach('right', V(staffX + 0.015, 0.68 * H, staffZ), { space: s.root });
        const target = a.pose === 'reciting'
          ? head.clone().add(V(0.04 * H, -0.08 * H, 0.28 * H))
          : head.clone().add(V(0.01 * H, -0.07 * H, 0.12 * H));
        const gap = person.reach('left', target, { space: s.root });
        s.root.updateMatrixWorld(true);
        it.position.copy(gap > 0.05 ? world(person.hands.left) : target);
        if (a.holding === 'book') it.rotation.x = -0.5;
        person.lookAt(it.position, s.root);
      }
    }

    const flameBase = flames.map((f) => f.scale.y);
    const bubbleBase = bubbles.map((b) => b.scale.x);
    const speed = mix(1, 6, mood.energy);
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        flames.forEach((f, i) => { f.scale.y = flameBase[i] * (0.8 + 0.3 * Math.sin(time * speed * 2 + i)); });
        bubbles.forEach((b, i) => { const p = (time * speed * 0.3 + i * 0.37) % 1; b.scale.setScalar(bubbleBase[i] * Math.sin(p * Math.PI) + 0.001); });
      },
    });
  },
});
