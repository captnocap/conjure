import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    doing: choice('What is he doing?', {
      bellowing: 'Bellowing into the megaphone, head back, the other arm pointing across the floor.',
      whistle: 'Whistle in his teeth, one arm straight up to stop the music, the megaphone hanging at his hip.',
      pointing: 'Pointing a couple off the floor, arm out like a bayonet, the megaphone down at his side.',
      watch: 'Checking the stopwatch held up to his face, head bowed over it, counting the seconds of a rest break.',
    }),
    hat: choice('What is on his head?', {
      boater: 'A flat straw boater with a dark ribbon.',
      none: 'No hat: hair slicked flat with brilliantine.',
      bowler: 'A black bowler, slightly too small.',
    }),
    build: choice('What is his build?', {
      wiry: 'Wiry and quick, a bantamweight.',
      average: 'Average, nothing to notice but the voice.',
      heavy: 'Heavy, a paunch straining the shirt, red in the face.',
    }),
    stance: choice('How does he stand?', {
      striding: 'Mid-stride, one leg out ahead, covering the floor.',
      planted: 'Feet planted wide, rooted to the spot.',
      tiptoe: 'Up on the balls of his feet, leaning in over the rail.',
    }),
    armband: choice('What is the armband?', {
      red: 'A red band with white letters: JUDGE.',
      white: 'A white band with black letters: FLOOR.',
      black: 'A plain black band, like mourning.',
      striped: 'A striped band in the marathon\'s colours.',
    }),
    clipboard: noul('Is a clipboard tucked under one arm?'),
    waistcoat: noul('Does he wear a waistcoat over the shirt?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = { wiry: mix(1.66, 1.74, random()), average: mix(1.72, 1.8, random()), heavy: mix(1.7, 1.78, random()) }[a.build];
    const limb = H * 0.036 * (a.build === 'heavy' ? 1.3 : a.build === 'wiry' ? 0.85 : 1);
    const headR = H * 0.064, torsoL = H * 0.28, shoulderW = H * 0.115 * (a.build === 'heavy' ? 1.3 : a.build === 'wiry' ? 0.85 : 1), upperL = H * 0.17;
    const skin = pickSkin(random);
    const trousers = pick(['#3a3f4a', '#4a4038', '#2f2f33', '#5a5248']);
    const person = figure(s, {
      height: H, build: a.build === 'wiry' ? 'slight' : a.build, style: 'doll', pose: 'walking', sleeves: 'short',
      hair: 'short', hairColor: a.hat === 'none' ? '#1a1410' : '#2a1c14', skin,
      top: '#f2efe6', bottom: trousers, shoes: '#1d1a18',
    });
    s.root.add(person.root);
    const r = rig(person);
    const tin = s.material('#c9c2b0', { metalness: 0.55, roughness: 0.45 });
    const red = s.material('#a8322a', { roughness: 0.6 });
    const silver = s.material('#d8dadd', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#1d1a18', { roughness: 0.7 });

    // ---- the stance
    if (a.stance === 'striding') {
      r.leg('left', { forward: 26, out: 3, knee: 10 });
      r.leg('right', { forward: -20, out: 3, knee: 28 });
      r.lean(5);
    } else if (a.stance === 'planted') {
      r.leg('left', { forward: 0, out: 14, knee: 2 });
      r.leg('right', { forward: 0, out: 14, knee: 2 });
      r.lean(0);
    } else {
      r.leg('left', { forward: 4, out: 5, knee: 6, foot: 20 });
      r.leg('right', { forward: 4, out: 5, knee: 6, foot: 20 });
      r.lean(13);
      r.bow(8);
    }

    // ---- bow tie, belt, waistcoat, armband
    const bow = new THREE.Group();
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.42, headR * 0.26, headR * 0.12), dark);
      wing.position.x = side * headR * 0.24;
      bow.add(wing);
    }
    bow.add(new THREE.Mesh(new THREE.BoxGeometry(headR * 0.12, headR * 0.16, headR * 0.16), dark));
    bow.position.set(0, torsoL * 0.99, limb * 1.2);
    bow.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
    person.joints.spine.add(bow);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(H * 0.075 * (a.build === 'heavy' ? 1.3 : 1) * 1.08, 0.012, 6, 24), dark);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = H * 0.07 * 0.42;
    belt.scale.z = 0.6;
    person.pelvis.add(belt);
    if (a.waistcoat) {
      const vest = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.43, Math.max(0.01, torsoL * 0.74 - limb * 2.86), 4, 12), s.material(pick(['#3a3a40', '#4a3a30', '#2b3a3a']), { roughness: 0.8 }));
      vest.scale.x = (shoulderW * 2) / (limb * 2.7) * (a.build === 'heavy' ? 1 / 1.25 : 1);
      vest.position.y = torsoL * 0.4;
      vest.castShadow = true;
      person.joints.spine.add(vest);
    }
    const bandColour = { red: ['#b8322a', '#ffffff'], white: ['#f0ece2', '#1a1a1a'], black: ['#1a1a1c', '#1a1a1c'], striped: ['#2a4a8a', '#e8c23a'] }[a.armband];
    const bandMap = paint(256, 48, (c) => {
      c.fillStyle = bandColour[0];
      c.fillRect(0, 0, 256, 48);
      if (a.armband === 'striped') {
        c.fillStyle = bandColour[1];
        for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 16, 48);
      } else if (a.armband !== 'black') {
        c.fillStyle = bandColour[1];
        c.font = 'bold 30px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (const x of [64, 192]) c.fillText(a.armband === 'red' ? 'JUDGE' : 'FLOOR', x, 25);
      }
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.1, limb * 1.1, 0.055, 16, 1, true), new THREE.MeshStandardMaterial({ map: bandMap, roughness: 0.8, side: THREE.DoubleSide }));
    band.position.y = -upperL * 0.42;
    band.castShadow = true;
    person.joints.shoulders.left.add(band);

    // ---- hat
    if (a.hat === 'boater') {
      const straw = s.material('#e2c98c', { roughness: 0.9 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.0, headR * 1.02, headR * 0.7, 24), straw);
      crown.position.y = headR * 0.98;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.85, headR * 1.85, headR * 0.07, 28), straw);
      brim.position.y = headR * 0.64;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.03, headR * 1.03, headR * 0.2, 24, 1, true), s.material(pick(['#1f2a4a', '#4a1f1f', '#1a1a1a']), { roughness: 0.7, side: THREE.DoubleSide }));
      ribbon.position.y = headR * 0.78;
      crown.castShadow = brim.castShadow = true;
      person.head.add(crown, brim, ribbon);
    } else if (a.hat === 'bowler') {
      const felt = s.material('#141414', { roughness: 0.6 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), felt);
      dome.position.y = headR * 0.42;
      dome.scale.y = 1.05;
      const brim = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.28, headR * 0.16, 8, 28), felt);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = headR * 0.5;
      brim.scale.y = 0.6;
      dome.castShadow = brim.castShadow = true;
      person.head.add(dome, brim);
    } else {
      // The hair cap is the one head part scaled taller; brilliantine makes it shine.
      const slick = person.head.children.find((n, i) => i > 0 && (n as THREE.Mesh).isMesh && n.scale.y > 1.05) as THREE.Mesh | undefined;
      if (slick) (slick.material as THREE.MeshStandardMaterial).roughness = 0.25;
    }

    // ---- the megaphone: a lathe with its mouthpiece at the group origin and the bell along +y
    const megaphone = () => {
      const g = new THREE.Group();
      const L = 0.46;
      const cone = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(0.018, 0), new THREE.Vector2(0.026, 0.05), new THREE.Vector2(0.045, 0.16), new THREE.Vector2(0.085, 0.32), new THREE.Vector2(0.14, L),
      ], 28), new THREE.MeshStandardMaterial({ color: tin.color, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide }));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 28), tin);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = L;
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.07, 28, 1, true), new THREE.MeshStandardMaterial({ color: red.color, roughness: 0.6, side: THREE.DoubleSide }));
      stripe.position.y = L * 0.75;
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.004), s.material('#5a3a22', { roughness: 0.9 }));
      strap.position.set(0, 0.2, -0.07);
      strap.rotation.x = -0.25;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), s.material('#2a1c14'));
      handle.position.set(0, 0.11, -0.085);
      handle.rotation.x = Math.PI / 2;
      for (const m of [cone, rim, stripe, strap, handle]) { m.castShadow = true; g.add(m); }
      return g;
    };
    const horn = megaphone();

    // ---- the whistle and its lanyard, the stopwatch and its chain
    const whistle = new THREE.Group();
    whistle.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.038), silver), new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 12), silver));
    (whistle.children[1] as THREE.Mesh).rotation.z = Math.PI / 2;
    (whistle.children[1] as THREE.Mesh).position.z = 0.017;
    const cord = s.material('#2a2a2a', { roughness: 1 });
    const neck = new THREE.Vector3(0, torsoL * 1.03, 0);
    const mouthLocal = new THREE.Vector3(0, -headR * 0.32, headR * 0.98);
    const lanyard = (to: THREE.Vector3) => {
      const path = new THREE.CatmullRomCurve3([
        to.clone(), new THREE.Vector3(-shoulderW * 0.55, neck.y, limb * 0.6), new THREE.Vector3(0, neck.y + 0.01, -limb * 1.3), new THREE.Vector3(shoulderW * 0.55, neck.y, limb * 0.6), to.clone(),
      ], true);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.0035, 6, true), cord);
      person.joints.spine.add(mesh);
    };
    const watch = new THREE.Group();
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 20), silver);
    dial.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.023, 20), new THREE.MeshStandardMaterial({ map: paint(64, 64, (c) => {
      c.fillStyle = '#f1ece0'; c.fillRect(0, 0, 64, 64);
      c.strokeStyle = '#222'; c.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(32 + Math.sin(t) * 24, 32 - Math.cos(t) * 24); c.lineTo(32 + Math.sin(t) * 28, 32 - Math.cos(t) * 28); c.stroke(); }
      c.lineWidth = 3; c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.sin(random() * 6.3) * 22, 32 - Math.cos(random() * 6.3) * 22); c.stroke();
    }), roughness: 0.5 }));
    face.position.z = 0.0055;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 8), silver);
    crown.position.y = 0.032;
    watch.add(dial, face, crown);
    watch.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
    const hipW = H * 0.075 * (a.build === 'heavy' ? 1.3 : 1);
    const pocket = new THREE.Vector3(-hipW * 1.05, H * 0.07 * 0.3, limb * 1.15);

    // ---- arms and props by action
    const chain = (from: THREE.Vector3, to: THREE.Vector3, parent: THREE.Object3D) => {
      const mid = from.clone().lerp(to, 0.5);
      mid.y -= from.distanceTo(to) * 0.18;
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 12, 0.003, 6), silver);
      parent.add(mesh);
    };
    const hornAtHip = () => {
      horn.position.set(hipW * 1.25, H * 0.07 * 0.2, limb * 0.4);
      horn.rotation.set(Math.PI - 0.3, 0, -0.25);
      person.pelvis.add(horn);
    };
    const hornInHand = () => {
      horn.rotation.x = Math.PI;
      horn.position.y = -0.01;
      person.hands.right.add(horn);
    };
    const watchAtHip = () => {
      watch.position.copy(pocket).add(new THREE.Vector3(-0.025, -H * 0.07 * 1.3, -0.02));
      watch.rotation.y = -0.5;
      person.pelvis.add(watch);
      chain(pocket, watch.position.clone().add(new THREE.Vector3(0, 0.03, 0)), person.pelvis);
    };
    if (a.doing === 'bellowing') {
      r.arm('right', { forward: 60, out: 15, bend: 130, across: 40 });
      r.arm('left', { forward: 88, out: 22, bend: 4, across: 0 });
      r.look(-12, 12, 0);
      horn.position.copy(mouthLocal);
      horn.rotation.x = Math.PI / 2 + 0.12;
      person.head.add(horn);
      whistle.position.set(0, torsoL * 0.7, limb * 1.5);
      person.joints.spine.add(whistle);
      lanyard(new THREE.Vector3(0, torsoL * 0.72, limb * 1.45));
      watchAtHip();
    } else if (a.doing === 'whistle') {
      r.arm('right', { forward: 60, out: 15, bend: 135, across: 40 });
      r.arm('left', { forward: 168, out: 12, bend: 6, across: 0 });
      r.look(-8, 0, 0);
      whistle.position.copy(mouthLocal).add(new THREE.Vector3(0, 0, 0.012));
      person.head.add(whistle);
      // The lanyard runs from the neck up to the mouth.
      lanyard(new THREE.Vector3(0, torsoL + headR * 0.95, limb * 1.5 + headR * 0.4));
      hornAtHip();
      watchAtHip();
    } else if (a.doing === 'pointing') {
      r.arm('left', { forward: 92, out: 34, bend: 0, across: 0 });
      r.arm('right', { forward: 8, out: 10, bend: 14, across: 0 });
      r.look(2, 28, 0);
      r.bow(4, 0);
      hornInHand();
      whistle.position.set(0, torsoL * 0.7, limb * 1.5);
      person.joints.spine.add(whistle);
      lanyard(new THREE.Vector3(0, torsoL * 0.72, limb * 1.45));
      watchAtHip();
    } else {
      r.arm('left', { forward: 72, out: 14, bend: 118, across: 28 });
      r.arm('right', { forward: 6, out: 10, bend: 14, across: 0 });
      r.look(34, 16, 0);
      r.bow(6, 0);
      hornInHand();
      whistle.position.set(0, torsoL * 0.7, limb * 1.5);
      person.joints.spine.add(whistle);
      lanyard(new THREE.Vector3(0, torsoL * 0.72, limb * 1.45));
      watch.position.set(0, -0.02, 0.02);
      watch.rotation.x = -0.6;
      person.hands.left.add(watch);
    }

    if (a.clipboard) {
      // Clamped against the ribs under the right arm, paper face out.
      const board = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.32, 0.23), s.material('#6b4a2e', { roughness: 0.8 }));
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.3, 0.21), s.material('#f1ece0', { roughness: 0.9 }));
      sheet.position.x = -0.008;
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.08), silver);
      clip.position.set(-0.004, 0.15, 0);
      board.add(back, sheet, clip);
      board.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
      board.position.set(-(shoulderW + limb * 0.4), torsoL * 0.5, limb * 0.5);
      board.rotation.y = -0.15;
      person.joints.spine.add(board);
    }
    r.settle();
    if (a.doing === 'watch') {
      // The chain runs from the hand down to the trouser pocket, in the sculpture's frame, once the figure has settled.
      const from = worldOf(person.hands.left), to = person.pelvis.localToWorld(pocket.clone());
      s.root.worldToLocal(from); s.root.worldToLocal(to);
      chain(from, to, s.root);
    }

    // The judge rocks on his feet and the free arm jabs with the music's energy.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const lead = a.doing === 'watch' ? person.joints.shoulders.right : person.joints.shoulders.left;
    const restLead = lead.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        lead.rotation.x = restLead + Math.sin(time * mix(1.5, 4, energy) + phase) * mix(0.01, 0.07, energy);
      },
    });
  },
});
