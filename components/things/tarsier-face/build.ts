import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { type V3, blob, bough, coat, eye, leaves, settle, skin, sweep, tufts } from './beast';

export default defineThing({
  questions: {
    pupils: score('How wide are its pupils?', ['Pinprick dots in bright day', 'Small and wary', 'Wide at dusk', 'Huge black night discs that fill the eye']),
    head: choice('Which way is its head turned?', {
      viewer: 'Square at the viewer, both eyes locked on.',
      stem: 'Three-quarters toward the stem it holds, one eye sliding back at you.',
      back: 'Rotated right round over its own back like an owl.',
      up: 'Tipped up toward something in the canopy.',
    }),
    ears: choice('How are its ears held?', {
      up: 'Both ears up and spread, listening hard.',
      flat: 'Both ears pressed flat and back in fright.',
      folded: 'One ear up, the other crumpled and folded down.',
      swivel: 'Each ear turned a different way, tracking two sounds.',
    }),
    caught: choice('What has it caught?', {
      nothing: 'Nothing yet; its mouth is shut.',
      cricket: 'A green cricket clamped in its jaws, legs still kicking.',
      moth: 'One pale moth wing sticking out of its mouth.',
      beetle: 'A glossy beetle held in its teeth.',
    }),
    grip: choice('How is it holding on?', {
      cling: 'Both hands and both feet wrapped round the stem.',
      reach: 'One hand stretched high up the stem, about to climb.',
      leap: 'Mid-leap beside the stem, arms out, legs and tail trailing.',
    }),
    stem: choice('What is it clinging to?', {
      bamboo: 'A smooth green bamboo cane with pale joints.',
      sapling: 'A mossy sapling trunk with a few leaves.',
      liana: 'Two brown lianas twisted round each other.',
    }),
    coat: choice('What colour is its fur?', {
      buff: 'Soft grey-buff, like dry leaves.',
      rust: 'Warm rusty brown.',
      ash: 'Dark ash grey, a spectral night animal.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const g = new THREE.Group();
    g.scale.setScalar(0.01); // modelled in centimetres
    root.add(g);
    const [base, streak] = { buff: ['#b9a380', '#7f6c52'], rust: ['#b47242', '#7b4421'], ash: ['#77706a', '#423d39'] }[a.coat];
    const fur = coat(context, base, streak);
    const pale = coat(context, new THREE.Color(base).lerp(new THREE.Color('#efe4cf'), 0.55), base);
    const flesh = skin('#c79a80'), pad = skin('#e6c2a4'), darkSkin = skin('#3a2c26'), pink = skin('#d99a8c');
    const SX = -3.3, R = 1.05, leap = a.grip === 'leap';

    // The stem.
    if (a.stem === 'bamboo') {
      const cane = skin(new THREE.Color('#7fa04a').lerp(new THREE.Color('#b5a35c'), mood.wear * 0.7), { roughness: 0.45 });
      sweep(g, [[SX, 0, 0], [SX + 0.25, 15, 0.1], [SX - 0.1, 31, 0]], R, cane, { radial: 14 });
      for (const y of [3.5, 10.5, 17.5, 24.5]) blob(g, [R * 1.13, 0.22, R * 1.13], [SX + 0.2 * Math.sin(y / 10), y, 0.05], skin('#d6cf9a'), [0, 0, 0], 14);
      leaves(g, Array.from({ length: 3 + Math.round(mood.density * 5) }, (_u, i) => ({ at: [SX - 1.5 - random() * 1.5, 24.5 + i * 0.9, (random() - 0.5) * 2] as V3, size: 2.2 + random(), rot: [random() - 0.5, random() * 6, 0.5] as V3, long: 1.8 })), skin('#5f9440', { side: THREE.DoubleSide }));
    } else if (a.stem === 'sapling') {
      bough(g, context, [[SX, 0, 0], [SX + 0.3, 12, 0.2], [SX - 0.2, 22, -0.1], [SX + 0.1, 31, 0.1]], R, { moss: mix(0.3, 1, mood.density), leafy: mix(0.2, 0.9, mood.density) });
    } else {
      const vine = skin('#6d5540', { roughness: 0.95 });
      for (const phase of [0, Math.PI]) sweep(g, Array.from({ length: 17 }, (_u, i) => [SX + Math.cos(i * 0.95 + phase) * 0.55, i * 1.95, Math.sin(i * 0.95 + phase) * 0.55] as V3), 0.62, vine, { segments: 90, radial: 8 });
    }

    // The animal, side-on to the viewer with its belly to the stem.
    const t = new THREE.Group();
    if (leap) { t.position.set(5.2, 3.5, 0); t.rotation.z = 0.55; }
    g.add(t);
    const body = blob(t, [2.3, 3.5, 2.5], [0.2, 12.8, 0], fur, [0, 0, 0.12], 22);
    blob(t, [1.5, 2.8, 2.0], [-0.75, 12.8, 0], pale, [0, 0, 0.12], 18);

    const finger = (parent: THREE.Object3D, from: V3, to: V3, bend: V3) => {
      const mid: V3 = [(from[0] + to[0]) / 2 + bend[0], (from[1] + to[1]) / 2 + bend[1], (from[2] + to[2]) / 2 + bend[2]];
      sweep(parent, [from, mid, to], 0.13, flesh, { segments: 8, radial: 6 });
      blob(parent, [0.3, 0.3, 0.22], to, pad, [0, 0, 0], 8);
    };
    /** A hand or foot: on the stem the digits wrap it; in the air they splay. */
    const paw = (at: V3, side: number, gripping: boolean) => {
      blob(t, [0.4, 0.45, 0.4], at, flesh, [0, 0, 0], 10);
      for (let i = 0; i < 4; i++) {
        const lift = (i - 1.2) * 0.55;
        if (gripping) {
          const angle = side * (0.5 + i * 0.12);
          finger(t, at, [SX + Math.cos(angle) * -R * 0.2 - 0.25, at[1] + lift + 0.5, Math.sin(angle) * R + side * 0.15], [0.3, 0.2, side * 0.5]);
        } else finger(t, at, [at[0] - 1.6 + Math.abs(lift) * 0.3, at[1] + lift * 1.3 + 0.3, at[2] + side * (0.2 + i * 0.25)], [0, 0.3, 0]);
      }
    };
    for (const side of [-1, 1]) {
      const reach = a.grip === 'reach' && side < 0;
      const hand: V3 = leap ? [-4.2, 17.6 + side * 0.6, side * 1.2] : [SX + R + 0.25, reach ? 22.5 : 16.2, side * 0.75];
      sweep(t, [[-0.7, 15.4, side * 1.5], leap ? [-2.4, 16.8, side * 1.9] : [-1.7, reach ? 18.5 : 14.3, side * 2.2], hand], (k) => mix(0.5, 0.26, k), fur);
      paw(hand, side, !leap);
      const foot: V3 = leap ? [4.4, 5.2, side * 1.3] : [SX + R + 0.25, 9.2, side * 0.8];
      sweep(t, leap ? [[1.0, 11, side * 1.4], [2.4, 9.3, side * 2.0], [3.3, 7.2, side * 1.7], foot] : [[0.9, 11.2, side * 1.4], [-1.0, 13.3, side * 3.0], [0.9, 9.9, side * 2.2], foot], (k) => mix(0.75, 0.22, Math.min(1, k * 1.4)), fur);
      paw(foot, side, !leap);
    }
    const sway = random() - 0.5;
    const tailTip: V3 = leap ? [9.5, 9 + sway * 2, sway] : [1.5 + sway * 1.5, 0.8, 0.8 + sway];
    sweep(t, leap ? [[1.6, 10.2, 0], [4, 9, 0.2], [7, 9.6, 0.3], tailTip] : [[1.6, 10.2, 0], [2.3, 6.2, 0.3], [1.7, 2.8, 0.6], tailTip], (k) => mix(0.24, 0.12, k), flesh);
    tufts(t, Array.from({ length: 9 }, () => ({ at: tailTip, dir: (leap ? [1, (random() - 0.5), (random() - 0.5)] : [(random() - 0.5), -1, (random() - 0.5)]) as V3, len: 0.9 + random() * 0.6, r: 0.16 })), fur);

    // The head: nearly all eye.
    const head = new THREE.Group();
    head.position.set(0.15, 18.3, 0);
    head.rotation.order = 'YXZ';
    head.rotation.set(a.head === 'up' ? -0.5 : (random() - 0.5) * 0.12, { viewer: 0, stem: -0.8, back: 0.95, up: -0.2 }[a.head], (leap ? -0.45 : 0) + (random() - 0.5) * 0.25);
    t.add(head);
    blob(head, [2.75, 2.3, 2.4], [0, 0, 0], fur, [0, 0, 0], 24);
    blob(head, [2.3, 1.75, 1.0], [0, -0.15, 1.5], pale, [0, 0, 0], 20);
    blob(head, [0.85, 0.6, 0.65], [0, -1.1, 1.95], pale, [0, 0, 0], 12);
    blob(head, [0.3, 0.2, 0.22], [0, -0.82, 2.52], pink, [0, 0, 0], 8);
    const night = a.pupils;
    const iris = new THREE.MeshStandardMaterial({ color: '#c98524' }).color.lerp(new THREE.Color('#e0a030'), mood.warmth * 0.5);
    for (const side of [-1, 1]) {
      const at: V3 = [side * 1.22, 0.3, 1.5];
      eye(head, { at, r: 1.22, look: [side * 0.14, 0, 1], iris, irisSize: 0.93, pupil: mix(0.09, 0.93, night), white: '#d9b98a', lid: 0.02, lower: 0, lidMaterial: fur });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.13, 6, 28), darkSkin);
      rim.position.set(at[0] + side * 0.07, at[1], at[2] + 0.5);
      rim.lookAt(at[0] + side * 0.14 * 9, at[1], at[2] + 9.5);
      head.add(rim);
    }
    // Ears pivot at the skull so they can fold, flatten and twitch.
    const ears: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 2.2, 1.35, -0.3);
      const folded = a.ears === 'folded' && side > 0;
      blob(ear, [1.15, folded ? 0.9 : 1.6, 0.13], [0, folded ? 0.6 : 1.25, 0], fur, [0, 0, 0], 14);
      blob(ear, [0.85, folded ? 0.6 : 1.25, 0.1], [0, folded ? 0.6 : 1.2, 0.09], pink, [0, 0, 0], 12);
      if (mood.wear > 0.6 && side < 0) blob(ear, [0.4, 0.4, 0.3], [-0.9, 2.2, 0], darkSkin, [0, 0, 0], 6);
      const pose = { up: [0, side * 0.35, 0.5], flat: [0.9, side * 0.5, 1.45], folded: folded ? [0.3, 0.6, 1.3] : [0, side * 0.35, 0.45], swivel: side > 0 ? [0, 1.1, 0.4] : [0.5, -0.2, 0.9] }[a.ears];
      ear.rotation.set(-pose[0], pose[1], -side * pose[2]);
      head.add(ear);
      ears.push(ear);
    }
    // Mouth and prey.
    sweep(head, [[-0.55, -1.38, 2.2], [0, -1.5, 2.5], [0.55, -1.38, 2.2]], 0.05, darkSkin, { segments: 8, radial: 5 });
    const prey = new THREE.Group();
    prey.position.set(0, -1.55, 2.5);
    head.add(prey);
    if (a.caught === 'cricket') {
      const green = skin('#7fae3a');
      blob(prey, [0.35, 0.3, 0.95], [0.5, -0.05, 0.5], green, [0.2, 0.7, 0], 10);
      blob(prey, [0.28, 0.26, 0.28], [1.05, -0.02, 1.15], green, [0, 0, 0], 8);
      for (const s of [-1, 1]) {
        sweep(prey, [[0.3, 0, 0.3], [0.2 + s * 0.5, 0.9, 0.6], [0.3 + s * 1.0, -0.5, 1.0]], 0.06, green, { segments: 8, radial: 5 });
        sweep(prey, [[1.1, 0.1, 1.3], [1.4 + s * 0.3, 0.8, 1.9], [1.5 + s * 0.6, 0.9, 2.8]], 0.025, darkSkin, { segments: 8, radial: 4 });
      }
    } else if (a.caught === 'moth') {
      const wing = new THREE.MeshStandardMaterial({ color: '#e9dfc4', roughness: 0.9, side: THREE.DoubleSide });
      leaves(prey, [{ at: [0.5, -0.5, 0.6], size: 1.9, rot: [1.1, 0.5, 0.3], long: 1.1 }, { at: [-0.3, -0.3, 0.4], size: 1.1, rot: [1.3, -0.4, -0.2], long: 1 }], wing);
      blob(prey, [0.22, 0.22, 0.03], [0.6, -0.75, 0.95], skin('#6b5a48'), [1.1, 0.5, 0.3], 8);
    } else if (a.caught === 'beetle') {
      const shell = new THREE.MeshStandardMaterial({ color: '#1f5a4a', metalness: 0.7, roughness: 0.2 });
      blob(prey, [0.6, 0.42, 0.75], [0, -0.1, 0.45], shell, [0.3, 0, 0], 12);
      blob(prey, [0.3, 0.22, 0.25], [0, 0.05, 1.15], darkSkin, [0, 0, 0], 8);
      for (let i = 0; i < 6; i++) sweep(prey, [[0, -0.2, 0.2 + (i >> 1) * 0.3], [(i % 2 ? 1 : -1) * 0.8, -0.1, 0.3 + (i >> 1) * 0.35], [(i % 2 ? 1 : -1) * 1.0, -0.7, 0.4 + (i >> 1) * 0.4]], 0.04, darkSkin, { segments: 6, radial: 4 });
    }

    settle(root);
    const speed = mix(0.4, 2.6, mood.energy);
    const rest = ears.map((ear) => ear.rotation.z);
    return {
      object: root,
      update(_dt, time) {
        ears.forEach((ear, i) => { ear.rotation.z = rest[i] + Math.sin(time * speed * 3 + i * 2) * 0.05 * (1 + mood.energy); });
        body.scale.x = 2.3 * (1 + Math.sin(time * speed * 2.4) * 0.03);
        prey.rotation.z = a.caught === 'cricket' ? Math.sin(time * speed * 9) * 0.12 : 0;
      },
      dispose: () => disposeTree(root),
    };
  },
});
