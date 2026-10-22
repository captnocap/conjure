import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { RAD, anatomy, at, bentwoodChair, bottleGeometry, clothTable, glassGeometry, glassMaterial, heel, paint, pick, pickSkin, reachFoot, reachHand, rig, skirt, type P } from './milonga';

const DRESSES = {
  red: 'A red wrap dress, bold.',
  black: 'A little black dress, plain and sure.',
  teal: 'A teal satin dress with a sheen.',
  polka: 'Navy with white polka dots, a 1940s cut.',
  cream: 'Cream silk, soft and pale.',
  plum: 'Deep plum jersey.',
} as const;
const DRESS_COLOUR: Record<keyof typeof DRESSES, string> = { red: '#b3202c', black: '#1c1b1f', teal: '#1f6a6e', polka: '#1f2a4a', cream: '#ebe2cc', plum: '#5a1f44' };
const SHOES = {
  black: 'Black satin T-strap heels.',
  red: 'Red patent heels that flash when she turns.',
  gold: 'Gold leather sandals, worn soft.',
  silver: 'Silver glitter heels.',
  nude: 'Nude heels that vanish into the leg.',
} as const;
const SHOE_COLOUR: Record<keyof typeof SHOES, string> = { black: '#1a181c', red: '#b0141f', gold: '#c9a23a', silver: '#c9ccd2', nude: '#d9b393' };

export default defineThing({
  questions: {
    moment: choice('How is the getting-ready going?', {
      calm: 'Calm and methodical: head down, both hands on the buckle, all the time in the world.',
      hurry: 'In a hurry: the music has started, the bag tipped over, the flats kicked off anyhow.',
      stuck: 'The buckle will not take: she has looked up from it, toward the dance floor, hands still at her ankle.',
    }),
    foot: choice('Where has she put her foot to buckle it?', {
      rung: 'Up on the rung of her own chair, the knee drawn high to her chest.',
      crate: 'Propped forward on a low wooden crate, the knee raised.',
      chair: 'Up on the seat of the empty chair facing hers, the knee high, the leg long.',
    }),
    shoes: choice('What are the dance shoes like?', SHOES),
    dress: choice('What is she wearing?', DRESSES),
    hair: choice('How is her hair?', {
      bun: 'Pinned up in a tight bun.',
      long: 'Long and loose, falling forward.',
      bob: 'A short bob.',
    }),
    bag: choice('What did she carry the shoes in?', {
      drawstring: 'A soft cloth drawstring bag.',
      leather: 'A small leather shoe case with a handle.',
      tote: 'A canvas tote with a rolled newspaper in it.',
    }),
    other: noul('Is her other dance shoe already on?'),
    table: choice('What is on the table at her elbow?', {
      wine: 'A glass of red wine, half drunk.',
      espresso: 'An espresso cup on its saucer.',
      purse: 'A small beaded evening purse and a lipstick.',
      water: 'A glass of water and the bottle it came from.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.56, 1.72, random());
    const skin = pickSkin(random);
    const { limb, footL } = anatomy(H, 'slight');
    const hairColour = pick(random, ['#1f1612', '#2a1e18', '#5a3a22', '#8a5a2a', '#c9a46a', '#3b2a22']);

    // ---- her dress: plain or polka-dotted, worn over the torso and thighs
    let dressMat: THREE.Material;
    if (a.dress === 'polka') {
      const dots = paint(128, 128, (c) => {
        c.fillStyle = DRESS_COLOUR.polka;
        c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#f1ece2';
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.beginPath(); c.arc(16 + x * 32 + (y % 2) * 16, 16 + y * 32, 5, 0, Math.PI * 2); c.fill(); }
      });
      dots.wrapS = dots.wrapT = THREE.RepeatWrapping;
      dots.repeat.set(2, 2);
      dressMat = new THREE.MeshStandardMaterial({ map: dots, roughness: 0.7, side: THREE.DoubleSide });
    } else dressMat = s.material(DRESS_COLOUR[a.dress], { roughness: a.dress === 'teal' ? 0.35 : 0.7, side: THREE.DoubleSide });
    const shoeColour = SHOE_COLOUR[a.shoes];
    const shoeMat = s.material(shoeColour, { roughness: a.shoes === 'red' ? 0.2 : 0.4, metalness: a.shoes === 'gold' || a.shoes === 'silver' ? 0.55 : 0 });
    const skinMat = s.material(skin, { roughness: 0.45 });
    const stocking = s.material(random() < 0.5 ? skin : '#2a2326', { roughness: 0.5 });

    // ---- the woman, seated; the left foot planted, the right still to be raised
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', skin, hair: a.hair === 'bob' ? 'short' : a.hair, hairColor: hairColour,
      top: DRESS_COLOUR[a.dress], bottom: DRESS_COLOUR[a.dress], shoes: shoeColour, sleeves: 'short', pose: 'sitting', gaze: 'down',
    });
    s.root.add(person.root);
    const pose = rig(person);
    for (const side of ['left', 'right'] as const) {
      for (const child of person.joints.hips[side].children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = dressMat;
      for (const child of person.joints.knees[side].children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = skinMat;
    }
    for (const child of person.joints.spine.children) if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'CapsuleGeometry') (child as THREE.Mesh).material = dressMat;
    for (const side of ['left', 'right'] as const) for (const child of person.joints.shoulders[side].children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = dressMat;
    const other = a.other;
    pose.leg('left', { forward: 82, out: 8, knee: 86, foot: 82 - 86 + (other ? 12 : 0) });
    pose.leg('right', { forward: 84, out: 6, knee: 86, foot: 'flat' });
    if (other) heel(person, 'left', H, shoeMat, 0.07);
    else for (const child of person.joints.ankles.left.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = stocking;
    person.settle();
    const hip = at(s, person.pelvis);

    // ---- the bentwood chair under her, with a front stretcher a foot can rest on
    const wood = s.material(pick(random, ['#4a3222', '#5a3a26', '#3a2a1e']), { roughness: 0.55 });
    const cane = s.material('#c9b47a', { roughness: 0.9 });
    const seatH = person.hipHeight - limb * 1.1 - 0.01;
    const cx = hip.x, cz = hip.z - 0.04;
    bentwoodChair(s, cx, cz, 0, wood, seatH, cane);
    const rungY = 0.2;
    s.rod([cx - 0.17, rungY, cz + 0.165], [cx + 0.17, rungY, cz + 0.165], 0.011, wood);

    // ---- the raised right foot: on the rung, on a crate, or out on the floor
    const sole = footL + limb * 0.95;
    const hipR = at(s, person.joints.hips.right);
    let ankleTarget: THREE.Vector3;
    let toe = 10;
    if (a.foot === 'rung') ankleTarget = new THREE.Vector3(hipR.x - 0.1, rungY + sole + 0.045, cz + 0.17);
    else if (a.foot === 'crate') {
      const crateZ = hip.z + 0.5, crateH = 0.27;
      const crate = s.material('#7a5a3a', { roughness: 0.9 });
      s.box([0.36, crateH, 0.26], [hipR.x - 0.04, crateH / 2, crateZ], crate);
      for (const y of [0.07, 0.17]) s.box([0.365, 0.012, 0.265], [hipR.x - 0.04, y, crateZ], s.material('#4a3422', { roughness: 0.9 }));
      s.label('MALBEC', 0.2, 0.06, [hipR.x - 0.04, crateH * 0.55, crateZ + 0.131], '#4a2a1a', '#c9a77a');
      ankleTarget = new THREE.Vector3(hipR.x - 0.05, crateH + sole + 0.04, crateZ - 0.02);
    } else {
      // A second bentwood chair pulled round to face hers: the foot goes up on its seat.
      bentwoodChair(s, hipR.x - 0.04, hip.z + 0.74, Math.PI + 0.15, wood, 0.45, cane);
      ankleTarget = new THREE.Vector3(hipR.x - 0.05, 0.45 + sole + 0.04, hip.z + 0.62);
      toe = 6;
    }
    reachFoot(s, person, 'right', ankleTarget, 'flat');
    person.joints.ankles.right.rotation.x += toe * RAD;
    heel(person, 'right', H, shoeMat, 0.07);
    s.root.updateMatrixWorld(true);

    // ---- folded over it, both hands at the strap: bow until the hands arrive
    const ankle = at(s, person.joints.ankles.right);
    const leftAt = ankle.clone().add(new THREE.Vector3(0.05, 0.025, 0.035));
    const rightAt = ankle.clone().add(new THREE.Vector3(-0.055, 0.02, 0.045));
    // Capped short of a full fold, so she bends over the knee rather than tipping off the chair.
    for (let bow = 12; bow <= 58; bow += 4) {
      pose.bow(bow, 6, -10);
      const miss = reachHand(s, person, 'left', leftAt, { across: true, outMin: -20, outMax: 60 }) + reachHand(s, person, 'right', rightAt, { across: true, outMin: -20, outMax: 70 });
      if (miss < 0.05) break;
    }
    if (a.moment === 'stuck') pose.look(-34, 22, -6);
    else pose.look(a.moment === 'hurry' ? 18 : 24, -12, 6);
    // The free strap end, caught between finger and thumb.
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.07), shoeMat);
    strap.position.set(0, -0.01, 0.03);
    strap.rotation.x = 0.4;
    person.hands.right.add(strap);

    // ---- a short hem over the seat edge (the thighs already wear the dress) and the hair
    skirt(person, H, 'slight', dressMat, { length: H * 0.06, flare: 1.08, drop: 0.0 });
    if (a.hair === 'bun') {
      const comb = s.mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), s.material(pick(random, ['#c9a23a', '#f1ece2', '#b3202c']), { roughness: 0.4 }));
      comb.position.set(0, H * 0.05, -H * 0.06);
      comb.rotation.x = -0.5;
      person.head.add(comb);
    }

    // ---- on the floor at her right: the shoe bag, the street flats, the other dance shoe
    const floorItems = new THREE.Group();
    s.root.add(floorItems);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: P, rotation: P = [0, 0, 0], scale: P = [1, 1, 1], parent: THREE.Object3D = floorItems) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const hurry = a.moment === 'hurry';
    const bagX = hip.x - 0.5, bagZ = hip.z + 0.05;
    const bag = new THREE.Group();
    bag.position.set(bagX, 0, bagZ);
    floorItems.add(bag);
    if (a.bag === 'drawstring') {
      const cloth = s.material(pick(random, ['#7a1f2e', '#2a3a5a', '#3a3a3e', '#5a1f44', '#c9b48a']), { roughness: 0.95, side: THREE.DoubleSide });
      const profile = [[0, 0], [0.09, 0.004], [0.12, 0.05], [0.115, 0.15], [0.075, 0.22], [0.035, 0.25], [0.05, 0.28], [0.07, 0.31]].map(([x, y]) => new THREE.Vector2(x, y));
      add(new THREE.LatheGeometry(profile, 20), cloth, [0, 0, 0], [0, 0, 0], [1, 1, 0.75], bag);
      add(new THREE.TorusGeometry(0.04, 0.005, 6, 16), s.material('#e3dccb', { roughness: 0.8 }), [0, 0.25, 0], [Math.PI / 2, 0, 0], [1, 1, 1], bag);
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 6), s.material('#e3dccb', { roughness: 0.8 }), [0.06, 0.16, 0.02], [0, 0, 0.35], [1, 1, 1], bag);
    } else if (a.bag === 'leather') {
      const leather = s.material(pick(random, ['#5a3a22', '#2a1e18', '#7a4a2a']), { roughness: 0.55 });
      add(new THREE.BoxGeometry(0.36, 0.2, 0.13), leather, [0, 0.1, 0], [0, 0, 0], [1, 1, 1], bag);
      add(new THREE.TorusGeometry(0.06, 0.01, 6, 16, Math.PI), leather, [0, 0.2, 0], [0, 0, 0], [1, 1, 1], bag);
      add(new THREE.BoxGeometry(0.03, 0.03, 0.01), s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 }), [0, 0.17, 0.068], [0, 0, 0], [1, 1, 1], bag);
    } else {
      const canvas = s.material(pick(random, ['#d9cfb0', '#c9b48a', '#8a9a7a']), { roughness: 0.95, side: THREE.DoubleSide });
      add(new THREE.BoxGeometry(0.32, 0.3, 0.1), canvas, [0, 0.15, 0], [0, 0, 0], [1, 1, 1], bag);
      for (const dx of [-0.07, 0.07]) add(new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI), canvas, [dx, 0.3, 0], [0, 0, 0], [1, 1.4, 1], bag);
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12), s.material('#e8e2d2', { roughness: 0.9 }), [0.06, 0.32, 0.01], [0, 0, 0.25], [1, 1, 1], bag);
    }
    if (hurry) { bag.rotation.set(0, 0.6, Math.PI / 2 - 0.15); bag.position.y = a.bag === 'leather' ? 0.065 : a.bag === 'tote' ? 0.05 : 0.11; }
    else bag.rotation.y = 0.3;

    // Street flats, set side by side or kicked off anyhow.
    const flatColour = s.material(pick(random, ['#1c1b1f', '#7a4a2a', '#8a1f2a', '#2a3a5a']), { roughness: 0.6 });
    const lining = s.material('#d9c7a8', { roughness: 0.9 });
    const flat = (x: number, z: number, yaw: number, upside = false) => {
      const g = new THREE.Group();
      g.position.set(x, upside ? 0.025 : 0, z);
      g.rotation.set(upside ? Math.PI : 0, yaw, 0);
      floorItems.add(g);
      add(new THREE.SphereGeometry(1, 14, 8), flatColour, [0, 0.016, 0], [0, 0, 0], [0.038, 0.022, 0.11], g);
      add(new THREE.SphereGeometry(1, 12, 6), lining, [0, 0.03, -0.025], [0, 0, 0], [0.026, 0.006, 0.06], g);
    };
    const fx = hip.x - 0.42, fz = hip.z + 0.36;
    if (hurry) { flat(fx - 0.08, fz + 0.05, 1.1); flat(fx + 0.12, fz + 0.22, -0.5, true); }
    else { flat(fx - 0.045, fz, 0.15); flat(fx + 0.045, fz + 0.01, 0.12); }

    // The other dance shoe, waiting its turn.
    if (!other) {
      const shoe = new THREE.Group();
      shoe.position.set(hip.x - 0.24, 0, hip.z + 0.5);
      shoe.rotation.y = hurry ? 2.2 : 0.4;
      floorItems.add(shoe);
      add(new THREE.CylinderGeometry(0.008, 0.012, 0.07, 8), shoeMat, [0, 0.035, -0.085], [0, 0, 0], [1, 1, 1], shoe);
      add(new THREE.BoxGeometry(0.06, 0.008, 0.11), shoeMat, [0, 0.042, -0.035], [-0.6, 0, 0], [1, 1, 1], shoe);
      add(new THREE.BoxGeometry(0.06, 0.008, 0.08), shoeMat, [0, 0.006, 0.05], [0, 0, 0], [1, 1, 1], shoe);
      add(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shoeMat, [0, 0.008, 0.06], [0, 0, 0], [0.032, 0.03, 0.045], shoe);
      add(new THREE.TorusGeometry(0.03, 0.004, 6, 14), shoeMat, [0, 0.095, -0.075], [Math.PI / 2 - 0.4, 0, 0], [1, 1, 1], shoe);
    }

    // ---- the table at her left elbow, and what is on it
    const tx = hip.x + 0.62, tz = hip.z + 0.06;
    const tableH = clothTable(s, tx, tz, { radius: 0.32, height: 0.74 });
    const ex = tx - 0.17, ez = tz + 0.06;
    const glass = glassMaterial('#eef3f0', 0.32);
    if (a.table === 'wine') {
      s.mesh(glassGeometry('wine'), glass, [ex, tableH, ez]).castShadow = false;
      s.lathe([[0, 0.078], [0.029, 0.082], [0.033, 0.1], [0, 0.104]], s.material('#5a0f1e', { roughness: 0.3 }), [ex, tableH, ez]);
    } else if (a.table === 'espresso') {
      const china = s.material('#f3efe6', { roughness: 0.4 });
      s.cylinder(0.055, 0.055, 0.006, [ex, tableH + 0.003, ez], china, 18);
      s.lathe([[0, 0.006], [0.02, 0.008], [0.028, 0.045], [0.03, 0.05], [0, 0.05]], china, [ex, tableH + 0.004, ez]);
      const handle = s.ring(0.012, 0.004, [ex + 0.032, tableH + 0.032, ez], china);
      handle.rotation.y = Math.PI / 2;
    } else if (a.table === 'purse') {
      const beads = paint(64, 64, (c) => {
        c.fillStyle = '#2a2326';
        c.fillRect(0, 0, 64, 64);
        for (let y = 2; y < 64; y += 5) for (let x = 2 + (y % 10 ? 2 : 0); x < 64; x += 5) { c.fillStyle = (x + y) % 3 ? '#c9b48a' : '#f1ece2'; c.fillRect(x, y, 3, 3); }
      });
      s.mesh(new THREE.BoxGeometry(0.17, 0.1, 0.04), new THREE.MeshStandardMaterial({ map: beads, roughness: 0.4, metalness: 0.3 }), [ex + 0.02, tableH + 0.05, ez]).rotation.y = 0.3;
      s.cylinder(0.009, 0.009, 0.07, [ex - 0.1, tableH + 0.008, ez + 0.05], s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 }), 10).rotation.z = Math.PI / 2;
    } else {
      s.mesh(glassGeometry('tumbler'), glass, [ex, tableH, ez]).castShadow = false;
      s.mesh(bottleGeometry(0.26), s.material('#7a9a8a', { roughness: 0.15, transparent: true, opacity: 0.75 }), [tx + 0.08, tableH, tz - 0.05]);
    }

    // ---- seen from the room: side-on, the raised knee toward us and the table behind her
    s.root.rotation.y = 58 * Math.PI / 180;

    // The hands tug at the strap; the tug quickens with the evening.
    const energy = mood.energy;
    const elbowR = person.joints.elbows.right, elbowL = person.joints.elbows.left;
    const restR = elbowR.rotation.x, restL = elbowL.rotation.x;
    const tempo = hurry ? 3.2 : a.moment === 'stuck' ? 0.6 : 1.6;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const tug = Math.sin(time * tempo * (0.6 + energy)) * 0.05 * (0.3 + energy);
        elbowR.rotation.x = restR + tug;
        elbowL.rotation.x = restL - tug * 0.6;
      },
    });
  },
});
