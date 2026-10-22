import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    watches: choice('What does she watch through?', {
      opera: 'Little mother-of-pearl opera glasses held up to her eyes.',
      lorgnette: 'A lorgnette on a stick, held up like a judgement.',
      bare: 'Bare eyes, narrowed, leaning in so as not to miss a stumble.',
    }),
    coat: choice('What is her coat?', {
      black: 'A black wool coat with a deep brown fur collar.',
      camel: 'A camel coat with a pale fox collar.',
      cloth: 'A thin cloth coat with no fur at all, the collar turned up.',
      stole: 'A fox stole over a green coat, the fox still wearing its head.',
    }),
    posture: choice('How is she sitting?', {
      rapt: 'Rapt, leaning well forward, elbows in, glasses up.',
      back: 'Sat back, bored, one arm hooked over the chair.',
      edge: 'On the very edge of the seat, half rising at something on the floor.',
    }),
    holds: choice('What is in her other hand?', {
      holder: 'A long black cigarette holder with a lit cigarette.',
      programme: 'A folded printed programme.',
      peanuts: 'A paper bag of peanuts, shells on the floor.',
    }),
    cloche: choice('What colour is the cloche hat?', {
      red: 'Cherry red felt.', black: 'Black felt with a small bow.', cream: 'Cream felt with a dark band.', green: 'Bottle green felt.',
    }),
    companion: noul('Does a man doze in the chair beside her, hat tipped and chin on chest?'),
    empty: noul('If she is alone, is the chair beside her empty with a coat flung over it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.56, 1.66, random());
    const headR = H * 0.064, torsoL = H * 0.28, shoulderW = H * 0.115 * 0.85, limb = H * 0.036 * 0.85;
    const coatColour = { black: '#1d1b1e', camel: '#b8925a', cloth: '#5a5560', stole: '#2f4a3a' }[a.coat];
    const furColour = { black: '#5a3e2a', camel: '#e3d6c0', cloth: '', stole: '#b5703a' }[a.coat];
    const wood = s.material(pick(['#7a5a3a', '#8a6a44', '#5e4630']), { roughness: 0.75 });
    const stocking = s.material('#c9b08a', { roughness: 0.6 });

    /** A wooden folding chair: an X of legs in side view, two slats for a back. */
    const chair = (x: number, z: number, turn: number, seatH: number) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const rod = (from: [number, number, number], to: [number, number, number], radius: number) => {
        const p0 = new THREE.Vector3(...from), p1 = new THREE.Vector3(...to);
        const d = p1.clone().sub(p0);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), wood);
        m.position.copy(p0).add(p1).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        add(m);
      };
      for (const sx of [-1, 1]) {
        rod([sx * 0.2, 0, 0.21], [sx * 0.2, seatH + 0.46, -0.24], 0.016);
        rod([sx * 0.2, 0, -0.2], [sx * 0.2, seatH, 0.19], 0.016);
      }
      const seat = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.028, 0.38), wood));
      seat.position.set(0, seatH, 0);
      for (const y of [seatH + 0.28, seatH + 0.4]) {
        const slat = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.02), wood));
        const t = (y - 0) / (seatH + 0.46);
        slat.position.set(0, y, 0.21 - 0.45 * t);
      }
      g.position.set(x, 0, z);
      g.rotation.y = turn;
      s.root.add(g);
      return g;
    };

    // ---- the woman, seated and leaning
    const woman = figure(s, {
      height: H, style: 'doll', build: 'slight', pose: 'sitting', sleeves: 'long', hair: 'short', hairColor: pick(['#2a1c14', '#8a5a2a', '#1f1a18']),
      skin: pickSkin(random), top: coatColour, bottom: coatColour, shoes: pick(['#1a1a1c', '#4a2a22', '#7a5a4a']),
    });
    s.root.add(woman.root);
    const rw = rig(woman);
    for (const knee of [woman.joints.knees.left, woman.joints.knees.right]) (knee.children[0] as THREE.Mesh).material = stocking;
    const lean = { rapt: 22, back: -8, edge: 34 }[a.posture];
    rw.bow(lean, 0);
    if (a.posture === 'edge') { rw.leg('left', { forward: 70, out: 8, knee: 95 }); rw.leg('right', { forward: 62, out: 10, knee: 100 }); }
    if (a.posture === 'back') { rw.leg('left', { forward: 82, out: 8, knee: 70 }); rw.leg('right', { forward: 84, out: 6, knee: 78 }); }
    // The glasses hand: up to the eyes, or down on the bag when she looks with bare eyes.
    const glassesHand = a.watches !== 'bare';
    if (glassesHand) rw.arm('right', { forward: 80 + lean * 0.3, out: 10, bend: 130, across: 40 });
    else rw.arm('right', { forward: 36, out: 10, bend: 80, across: 25 });
    if (a.posture === 'back') rw.arm('left', { forward: -20, out: 40, bend: 20, across: 0 });
    else rw.arm('left', { forward: 34, out: 14, bend: 90, across: 25 });
    rw.look(a.watches === 'bare' ? 4 : -2, 0, 0);
    rw.settle();
    woman.root.position.set(0, 0, 0);
    rw.settle(false);
    const pelvis = worldOf(woman.pelvis);
    const seatH = Math.max(0.3, pelvis.y - 0.025);
    chair(pelvis.x, pelvis.z + 0.02, 0, seatH);

    // Cloche, collar, stole.
    const felt = s.material({ red: '#9c2a2a', black: '#1a1a1c', cream: '#e8dfc8', green: '#1f4a3a' }[a.cloche], { roughness: 0.9, side: THREE.DoubleSide });
    const cloche = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.001, headR * 1.2), new THREE.Vector2(headR * 0.7, headR * 1.1), new THREE.Vector2(headR * 1.1, headR * 0.65), new THREE.Vector2(headR * 1.17, headR * 0.15),
      new THREE.Vector2(headR * 1.15, headR * 0.02), new THREE.Vector2(headR * 1.4, -headR * 0.12), new THREE.Vector2(headR * 1.38, -headR * 0.2),
    ], 24), felt);
    cloche.castShadow = true;
    woman.head.add(cloche);
    const bandMat = s.material(a.cloche === 'cream' ? '#2a2a30' : a.cloche === 'black' ? '#8a8a90' : '#e8dfc8', { roughness: 0.8 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.19, headR * 1.19, headR * 0.16, 24, 1, true), new THREE.MeshStandardMaterial({ color: bandMat.color, roughness: 0.8, side: THREE.DoubleSide }));
    band.position.y = headR * 0.28;
    woman.head.add(band);
    if (a.cloche === 'black') { const bow = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.22, headR * 0.1), bandMat); bow.position.set(headR * 0.9, headR * 0.3, headR * 0.5); bow.rotation.y = 0.6; woman.head.add(bow); }
    if (a.coat !== 'cloth') {
      const fur = new THREE.Mesh(new THREE.TorusGeometry(shoulderW * 0.95, limb * 1.25, 10, 24), s.material(furColour, { roughness: 1 }));
      fur.rotation.x = Math.PI / 2;
      fur.position.set(0, torsoL * 0.93, 0.01);
      fur.scale.z = 0.8;
      fur.castShadow = true;
      woman.joints.spine.add(fur);
      if (a.coat === 'stole') {
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 0.7, torsoL * 0.5, 4, 10), s.material(furColour, { roughness: 1 }));
        tail.position.set(shoulderW * 0.7, torsoL * 0.62, limb * 1.5);
        tail.rotation.z = 0.15;
        const snout = new THREE.Mesh(new THREE.ConeGeometry(limb * 0.55, limb * 1.6, 10), s.material(furColour, { roughness: 1 }));
        snout.position.set(-shoulderW * 0.75, torsoL * 0.72, limb * 1.6);
        snout.rotation.x = Math.PI;
        tail.castShadow = snout.castShadow = true;
        woman.joints.spine.add(tail, snout);
      }
    } else {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.6, limb * 1.9, headR * 0.9, 16, 1, true), new THREE.MeshStandardMaterial({ color: coatColour, roughness: 0.9, side: THREE.DoubleSide }));
      collar.position.set(0, torsoL * 1.05, -0.01);
      woman.joints.spine.add(collar);
    }

    // What she watches through, at the eyes.
    const pearl = s.material('#e9e4dc', { metalness: 0.3, roughness: 0.3 });
    const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 });
    if (a.watches === 'opera') {
      for (const side of [-1, 1]) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.05, 12), pearl);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(side * headR * 0.36, headR * 0.12, headR * 1.15);
        woman.head.add(tube);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, 0.008, 0.012), brass);
      bridge.position.set(0, headR * 0.12, headR * 1.15);
      woman.head.add(bridge);
    } else if (a.watches === 'lorgnette') {
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 16), brass);
        lens.position.set(side * headR * 0.36, headR * 0.12, headR * 1.1);
        woman.head.add(lens);
      }
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8), brass);
      stick.position.set(-headR * 0.5, -headR * 0.5, headR * 1.1);
      stick.rotation.z = 0.35;
      woman.head.add(stick);
    }

    // The handbag on the knees and what the other hand holds.
    const kneeL = worldOf(woman.joints.knees.left), kneeR = worldOf(woman.joints.knees.right);
    const lapAt = kneeL.clone().add(kneeR).multiplyScalar(0.5);
    lapAt.z = pelvis.z + (lapAt.z - pelvis.z) * 0.6;
    const leather = s.material(pick(['#3a2a22', '#1a1a1c', '#6a3a2a']), { roughness: 0.4 });
    const bag = s.box([0.24, 0.13, 0.09], [lapAt.x, lapAt.y + 0.09, lapAt.z], leather);
    bag.rotation.x = -lean * 0.004;
    const handle = s.ring(0.07, 0.006, [lapAt.x, lapAt.y + 0.17, lapAt.z], leather, Math.PI);
    handle.rotation.z = 0;
    const clasp = s.ball([0.012, 0.012, 0.012], [lapAt.x, lapAt.y + 0.155, lapAt.z + 0.045], brass, 8);
    void clasp;
    let ember: THREE.Mesh | null = null;
    const handL = worldOf(woman.hands.left);
    if (a.holds === 'holder') {
      const holder = s.rod([handL.x, handL.y, handL.z], [handL.x + 0.08, handL.y + 0.16, handL.z + 0.08], 0.004, s.material('#101010', { roughness: 0.3 }));
      void holder;
      s.rod([handL.x + 0.08, handL.y + 0.16, handL.z + 0.08], [handL.x + 0.1, handL.y + 0.2, handL.z + 0.1], 0.004, s.material('#f4f1ea'));
      ember = s.ball([0.006, 0.006, 0.006], [handL.x + 0.1, handL.y + 0.2, handL.z + 0.1], new THREE.MeshStandardMaterial({ color: '#ff7a30', emissive: '#ff5a10', emissiveIntensity: 2 }), 8);
    } else if (a.holds === 'programme') {
      const sheet = s.box([0.1, 0.14, 0.004], [handL.x + 0.02, handL.y + 0.04, handL.z + 0.04], s.material('#efe6cc', { roughness: 0.9 }));
      sheet.rotation.set(-0.5, 0.2, 0.1);
      s.box([0.08, 0.02, 0.005], [handL.x + 0.02, handL.y + 0.08, handL.z + 0.02], s.material('#8a2a2a'));
    } else {
      s.box([0.1, 0.12, 0.07], [handL.x + 0.02, handL.y + 0.03, handL.z + 0.03], s.material('#c9a06a', { roughness: 1 }));
      const shell = s.material('#d8b888', { roughness: 1 });
      s.scatter(new THREE.SphereGeometry(1, 6, 5), shell, Array.from({ length: 10 }, () => ({ at: [pelvis.x + (random() - 0.5) * 0.5, 0.008, pelvis.z + 0.2 + random() * 0.3] as [number, number, number], size: 0.008 + random() * 0.006 })));
    }

    // ---- the chair beside her: a dozing man, a coat, or nothing
    let man: Figure | null = null;
    const sideX = pelvis.x + 0.56;
    if (a.companion) {
      const Hm = mix(1.7, 1.8, random());
      man = figure(s, {
        height: Hm, style: 'doll', build: pick(['average', 'heavy']), pose: 'sitting', sleeves: 'long', hair: 'hat', hairColor: '#2a2a2e',
        skin: pickSkin(random), top: pick(['#2a2a30', '#3a3a3a', '#4a3a2e']), bottom: pick(['#2a2a30', '#3a3a3a', '#4a3a2e']), shoes: '#1a1a1c',
      });
      s.root.add(man.root);
      const rm = rig(man);
      rm.bow(10, -4);
      rm.look(28, -12, 8);
      rm.arm('left', { forward: 10, out: 12, bend: 60, across: 30 });
      rm.arm('right', { forward: 12, out: 10, bend: 55, across: 30 });
      rm.leg('left', { forward: 80, out: 14, knee: 70 });
      rm.leg('right', { forward: 86, out: 6, knee: 80 });
      rm.settle();
      man.root.position.set(sideX, 0, pelvis.z + 0.22);
      rm.settle(false);
      const mp = worldOf(man.pelvis);
      chair(mp.x, mp.z + 0.02, 0.06, Math.max(0.3, mp.y - 0.025));
    } else if (a.empty) {
      const g = chair(sideX, pelvis.z + 0.02, -0.1, seatH);
      const coat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.14), s.material(pick(['#2a2a30', '#4a3f33', '#5a4a3a']), { roughness: 1 }));
      coat.position.set(0, seatH + 0.42, -0.2);
      coat.rotation.x = -0.3;
      coat.castShadow = true;
      g.add(coat);
    }

    // She breathes and leans with the action; the ember pulses.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const spine = woman.joints.spine, restSpine = spine.rotation.x;
    return s.finish({
      update(dt, time) {
        woman.update(dt, time);
        man?.update(dt, time);
        spine.rotation.x = restSpine + Math.sin(time * mix(0.5, 2, energy) + phase) * mix(0.01, 0.05, energy);
        if (ember) (ember.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(time * 2.5 + phase) * 0.8;
      },
    });
  },
});
