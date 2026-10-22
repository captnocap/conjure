import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { dressParts, paint, pick, pickSkin, reach, rig } from './rig';

export default defineThing({
  questions: {
    metal: choice('What is the horn made of?', {
      brass: 'Lacquered gold brass.',
      silver: 'Silver plate, bright and cold.',
      worn: 'Raw brass, lacquer worn off, dents in the bell.',
    }),
    head: choice('What is on the head?', {
      flatcap: 'A tweed flat cap.',
      bandana: 'A bandana tied over the head.',
      bare: 'Bare head.',
      fedora: 'A straw fedora tipped back.',
    }),
    shirt: choice('What is the shirt?', {
      white: 'A white shirt, sleeves rolled.',
      black: 'A black shirt.',
      print: 'A loud printed shirt, flowers or dots.',
      club: 'A yellow or red club T-shirt.',
    }),
    horn: choice('Where is the horn pointed?', {
      sky: 'Straight up at the sky, back arched, the big note.',
      ahead: 'Level, straight ahead, playing to the crowd.',
      down: 'Down at the ground, the dirge, head bowed.',
    }),
    towel: noul('Is a white second-line towel hanging from the back pocket?'),
    mute: noul('Is a plunger mute lying at the feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.66, 1.86, random());
    const build = pick(random, ['slight', 'average', 'average'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const limb = H * 0.036 * wide, headR = H * 0.064, hipW = H * 0.075 * wide;
    const shirtHex = { white: '#f1ede4', black: '#1d1c22', print: '#f0e6d2', club: pick(random, ['#e2b43a', '#c42a2a']) }[a.shirt];
    const trousers = pick(random, ['#1d1c22', '#3a3a40', '#5a4a3a', '#2a3a5a']);
    const person = figure(s, {
      height: H, build, style: 'doll', skin: pickSkin(random), hair: a.head === 'bare' ? 'short' : 'none', hairColor: '#1a1512',
      top: shirtHex, bottom: trousers, shoes: pick(random, ['#141416', '#f1ede4', '#6a4a3a']), sleeves: 'short', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const r = rig(person);
    if (a.shirt === 'print') {
      const base = pick(random, ['#2a6ad8', '#c42a2a', '#1f7a3a', '#f0e6d2']);
      const spot = pick(random, ['#f6f2ea', '#e2b43a', '#f0a0c0', '#e85a2a']);
      const printMap = paint(256, 256, (c) => {
        c.fillStyle = base;
        c.fillRect(0, 0, 256, 256);
        c.fillStyle = spot;
        for (let i = 0; i < 40; i++) {
          const x = random() * 256, y = random() * 256, rad = 8 + random() * 10;
          for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * rad * 0.7, y + Math.sin(p * 1.257) * rad * 0.7, rad * 0.5, 0, 6.3); c.fill(); }
        }
      });
      printMap.wrapS = printMap.wrapT = THREE.RepeatWrapping;
      const printed = new THREE.MeshStandardMaterial({ map: printMap, roughness: 0.8 });
      const parts = dressParts(person);
      parts.torso.material = printed;
      parts.upper('left').material = printed;
      parts.upper('right').material = printed;
    }

    // Stance: planted feet, and the lean follows where the horn points.
    const up = a.horn === 'sky', down = a.horn === 'down';
    r.leg('left', { forward: 6, out: 9, knee: 2 });
    r.leg('right', { forward: -10, out: 7, knee: 0 });
    r.lean(up ? -17 : down ? 6 : -3, 1);
    r.bow(up ? -18 : down ? 18 : -2, 0, 0);
    r.look(up ? -38 : down ? 32 : -6, 0, 0);
    person.settle();

    // The trumpet, built along +z from the mouthpiece, then set at the lips at its angle.
    const metalHex = { brass: '#d9b23a', silver: '#d8dce0', worn: '#a8863a' }[a.metal];
    const metal = new THREE.MeshStandardMaterial({ color: metalHex, metalness: a.metal === 'worn' ? 0.6 : 0.9, roughness: a.metal === 'worn' ? 0.5 : 0.2 });
    const metalDouble = metal.clone();
    metalDouble.side = THREE.DoubleSide;
    const horn = new THREE.Group();
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = horn) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const alongZ = (mesh: THREE.Mesh, z: number, y = 0, x = 0) => { mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); return mesh; };
    const L = 0.58;
    alongZ(add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.045, 10), metal)), 0.022);
    alongZ(add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.2, 8), metal)), 0.14);
    // The valve block: three pistons with pearl caps, straddled by the lower pipe.
    for (let i = 0; i < 3; i++) {
      const casing = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 12), metal));
      casing.position.set(0, -0.015, 0.22 + i * 0.034);
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 10), s.material('#f1ede4', { roughness: 0.3 })));
      cap.position.set(0, 0.035, 0.22 + i * 0.034);
    }
    alongZ(add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), metal)), 0.22, -0.055);
    // Three loops: the tuning slide behind the valves, two valve slides below them.
    const loop = (z: number, y: number, radius: number, rotY: number) => { const t = add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.007, 6, 18, Math.PI), metal)); t.position.set(0, y, z); t.rotation.set(0, rotY, 0); return t; };
    loop(0.1, -0.027, 0.03, Math.PI / 2).rotation.z = Math.PI;
    loop(0.22, -0.06, 0.026, 0).rotation.x = Math.PI / 2;
    loop(0.29, -0.065, 0.03, 0).rotation.x = Math.PI / 2;
    const slide = alongZ(add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), metal)), 0.1, -0.055);
    void slide;
    // The bell: a lathe flaring over the last quarter of the horn.
    const profile = [[0.009, 0], [0.011, 0.3], [0.016, 0.55], [0.028, 0.75], [0.05, 0.88], [0.076, 0.97], [0.09, 1]].map(([x, y]) => new THREE.Vector2(x, y * (L - 0.26)));
    const bell = add(new THREE.Mesh(new THREE.LatheGeometry(profile, 28), metalDouble));
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, 0, 0.26);
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.005, 6, 28), metal));
    rim.position.set(0, 0, L);
    if (a.metal === 'worn') {
      const dents = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#6a5020', metalness: 0.5, roughness: 0.7 }), Array.from({ length: 4 }, () => ({ at: [Math.sin(random() * 6.3) * 0.07, Math.cos(random() * 6.3) * 0.07, L - 0.03 - random() * 0.06] as [number, number, number], size: 0.006 + random() * 0.005 })));
      horn.add(dents);
    }
    // Set the horn at the lips, angled with the stance.
    person.root.updateMatrixWorld(true);
    const mouth = person.head.localToWorld(new THREE.Vector3(0, -headR * 0.22, headR * 0.98));
    const pitch = up ? -45 : down ? 34 : -4;
    horn.position.copy(mouth);
    horn.rotation.x = pitch * Math.PI / 180;
    s.root.add(horn);
    // Hands: right on the valve caps, left cradling the valve block from below, elbows wide.
    horn.updateMatrixWorld(true);
    const valveTop = horn.localToWorld(new THREE.Vector3(0.005, 0.05, 0.255));
    const valveBottom = horn.localToWorld(new THREE.Vector3(0.0, -0.085, 0.2));
    reach(person, 'right', valveTop, { forward: 100, out: 45, bend: 110, across: 45 });
    reach(person, 'left', valveBottom, { forward: 80, out: 45, bend: 110, across: 50 });
    // Settling after the arms would move the figure away from the horn, so refit the horn to the lips instead.
    person.measure();

    // Headgear.
    if (a.head === 'flatcap') {
      const tweed = s.material(pick(random, ['#6a5a48', '#4a4a50', '#8a7a5a']), { roughness: 1 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), tweed);
      cap.position.set(0, headR * 0.2, -headR * 0.12);
      cap.scale.set(1, 0.6, 1.1);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.2, headR * 0.08, headR * 0.6), tweed);
      peak.position.set(0, headR * 0.42, headR * 1.05);
      cap.castShadow = peak.castShadow = true;
      person.head.add(cap, peak);
    }
    if (a.head === 'bandana') {
      const cloth = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material(pick(random, ['#c42a2a', '#2a3a7a', '#1a1a1e', '#e2b43a']), { roughness: 1 }));
      cloth.position.y = headR * 0.12;
      const knot = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.25, headR * 0.3), cloth.material);
      knot.position.set(0, headR * 0.2, -headR * 1.0);
      cloth.castShadow = true;
      person.head.add(cloth, knot);
    }
    if (a.head === 'fedora') {
      const straw = s.material('#d8c27a', { roughness: 1 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.75, headR * 1.75, headR * 0.08, 24), straw);
      brim.position.set(0, headR * 0.75, -headR * 0.2);
      brim.rotation.x = 0.25;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.9, headR * 1.05, headR * 1.0, 20), straw);
      crown.position.set(0, headR * 1.2, -headR * 0.3);
      crown.rotation.x = 0.25;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.07, headR * 1.07, headR * 0.2, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#1d1c22', side: THREE.DoubleSide, roughness: 0.8 }));
      band.position.set(0, headR * 0.85, -headR * 0.23);
      band.rotation.x = 0.25;
      brim.castShadow = crown.castShadow = true;
      person.head.add(brim, crown, band);
    }
    // A towel from the back pocket, and a plunger mute on the ground.
    if (a.towel) {
      const towel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.02), s.material('#f6f2ea', { roughness: 1 }));
      towel.position.set(-hipW * 0.6, -0.17, -limb * 1.25);
      towel.rotation.set(0.08, 0, 0.1);
      towel.castShadow = true;
      person.pelvis.add(towel);
    }
    if (a.mute) {
      const rubber = s.material('#8a2a2a', { roughness: 0.9 });
      const px = (random() - 0.5) * 0.3 + 0.3, pz = 0.25 + random() * 0.15;
      s.cylinder(0.075, 0.05, 0.08, [px, 0.04, pz], rubber, 18);
      s.cylinder(0.009, 0.009, 0.22, [px, 0.19, pz], s.material('#d9c49a', { roughness: 0.7 }), 8);
    }

    // The long note: the bell lifts a little with the breath, the body rocks back.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const restPitch = horn.rotation.x;
    const spine = person.joints.spine, restSpine = spine.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const breath = Math.sin(time * mix(0.8, 2.2, energy) + phase);
        horn.rotation.x = restPitch - Math.max(0, breath) * 0.04 * (0.3 + energy);
        spine.rotation.x = restSpine - Math.max(0, breath) * 0.03 * energy;
      },
    });
  },
});
