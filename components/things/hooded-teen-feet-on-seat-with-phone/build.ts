import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { SKINS, anatomy, at, busSeat, earbuds, garment, joints, pick, poseArm, reachArm, reachLeg, seatPalette } from './bus';

const HOODIES = {
  black: 'A black hoodie.',
  grey: 'A grey marl hoodie.',
  red: 'A faded red hoodie.',
  navy: 'A navy hoodie.',
  lilac: 'A pastel lilac hoodie.',
  green: 'A forest green hoodie with a small logo.',
} as const;
const HOODIE_COLOUR: Record<keyof typeof HOODIES, string> = { black: '#1c1d21', grey: '#8d8f93', red: '#9a3a34', navy: '#263556', lilac: '#b7a2cf', green: '#2f5a3e' };
const GLOWS = {
  white: 'A white feed scrolling past: cold white light on the face.',
  blue: 'A blue chat window: cool blue light.',
  green: 'A green game screen: sickly green light.',
  warm: 'A video playing: warm orange light.',
} as const;
const GLOW_COLOUR: Record<keyof typeof GLOWS, string> = { white: '#e8eeff', blue: '#5b8dff', green: '#7dff9c', warm: '#ffa860' };

export default defineThing({
  questions: {
    hold: choice('What do they hold?', {
      phone: 'A phone held in both hands, glowing on the face.',
      console: 'A handheld games console gripped in both hands.',
      kebab: 'A kebab in foil, held up to the mouth.',
    }),
    hood: choice('Hood up or down?', {
      up: 'Hood up, face in shadow.',
      down: 'Hood down, bunched behind the neck.',
    }),
    hoodie: choice('What colour is the hoodie?', HOODIES),
    glow: choice('If a screen is lit, what colour is its glow?', GLOWS),
    beside: choice('What lies beside them?', {
      nothing: 'Nothing: the empty seat.',
      bag: 'A school backpack dumped on the seat beside them.',
      skateboard: 'A skateboard propped against the seat.',
      both: 'A backpack on the seat and a skateboard on the floor.',
    }),
    slump: score('How low have they slumped?', ['Sitting up, feet just resting on the seat opposite', 'Slouched, chin on chest', 'Nearly horizontal, hips at the edge of the cushion']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.6, 1.8, random());
    const build = random() < 0.6 ? 'slight' : 'average';
    const skin = pick(random, SKINS);
    const hoodie = HOODIE_COLOUR[a.hoodie];
    const hoodieMat = s.material(hoodie, { roughness: 0.95 });
    const hairColor = pick(random, ['#2a1d18', '#3b2a22', '#6b4a2e', '#c89a5a', '#1f1a18']);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin, hairColor,
      hair: a.hood === 'up' ? 'hood' : pick(random, ['short', 'long', 'cap']),
      top: hoodie, bottom: pick(random, ['#5a5d63', '#1f2024', '#3b4f72', '#8a8a86']), shoes: pick(random, ['#f1f1ee', '#1c1c1e', '#e8d84a', '#d94848']), sleeves: 'long',
    });
    s.root.add(person.root);
    const { limb, torsoL, headR, chestR, spine } = anatomy(person, H, build);

    // ---- the oversized hoodie: a baggy body, a kangaroo pocket, drawstrings, a hood bunched when down.
    garment(person, H, build, hoodieMat, { grow: 1.22, length: 1.06, lift: -0.02 });
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(chestR * 2.2, torsoL * 0.22, 0.03), hoodieMat);
    pocket.position.set(0, torsoL * 0.3, chestR * 1.22 * 0.9);
    pocket.castShadow = true;
    spine.add(pocket);
    const string = s.material('#f1ede4', { roughness: 0.9 });
    for (const side of [-1, 1]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, torsoL * 0.3, 5), string);
      cord.position.set(side * chestR * 0.35, torsoL * 0.82, chestR * 1.22 + 0.005);
      cord.rotation.z = side * 0.1;
      spine.add(cord);
    }
    if (a.hood === 'down') {
      const bunch = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.8, headR * 0.3, 8, 16, Math.PI), hoodieMat);
      bunch.position.set(0, torsoL * 1.0, -chestR * 0.6);
      bunch.rotation.set(Math.PI / 2 + 0.4, 0, Math.PI);
      bunch.scale.x = 1.3;
      bunch.castShadow = true;
      spine.add(bunch);
    }
    earbuds(person, headR, s.material(random() < 0.7 ? '#f4f4f0' : '#1a1a1c', { roughness: 0.4 }));

    // ---- the slump: hips slid forward, torso reclined into the backrest, head dropped to the screen.
    const slump = a.slump;
    const recline = mix(0.12, 0.52, slump);
    spine.rotation.x = -recline;
    const { neck } = joints(person, 'left');
    neck.rotation.set(recline + mix(0.35, 0.55, slump), (random() - 0.5) * 0.2, (random() - 0.5) * 0.15);
    const seatTop = 0.45;
    person.settle();
    // The hips sit on the cushion: lift the figure so the seat of the trousers meets the fabric.
    person.root.position.y += seatTop + limb * 1.1 - at(person.pelvis).y;
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);
    const seatX = hips.x + 0.215;
    const slide = mix(0.0, 0.12, slump);
    const seatZ = hips.z + 0.06 - slide;
    const frontZ = seatZ + 0.74;
    // Knees up, trainers hooked over the top edge of the seat in front: each ankle lands on that rail.
    const railY = seatTop - 0.02 + 0.6 * Math.cos(0.16) + 0.03;
    const railZ = frontZ - 0.2 - 0.6 * Math.sin(0.16) - 0.02;
    for (const side of ['left', 'right'] as const) {
      const hip = at(joints(person, side).hip);
      const ankleY = railY + limb * 0.95 + (side === 'left' ? 0.02 : 0);
      const ankleZ = railZ - 0.03 + (side === 'left' ? 0.02 : -0.02);
      reachLeg(person, side, H, ankleY - hip.y, ankleZ - hip.z, side === 'left' ? 16 : 8, -20);
    }

    // ---- what the hands hold.
    const glow = GLOW_COLOUR[a.glow];
    const lit = a.hold !== 'kebab';
    let screen: THREE.Mesh | null = null;
    if (lit) {
      // Both hands cup the device in front of the chest; the screen tips back toward the face.
      for (const side of ['left', 'right'] as const) {
        const shoulder = at(joints(person, side).shoulder);
        const target = new THREE.Vector3(hips.x, hips.y + torsoL * mix(0.55, 0.35, slump), hips.z + chestR + 0.2);
        reachArm(person, side, H, target.y - shoulder.y, target.z - shoulder.z, 2, 42);
      }
      person.root.updateMatrixWorld(true);
      const left = at(person.hands.left), right = at(person.hands.right);
      const mid = left.clone().add(right).multiplyScalar(0.5);
      mid.y += 0.015;
      const dark = s.material('#15161a', { roughness: 0.3 });
      const screenMat = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: mix(0.9, 2.2, 1 - mood.daylight), roughness: 0.3 });
      const device = new THREE.Group();
      device.position.copy(mid);
      device.rotation.x = recline + 0.75;
      if (a.hold === 'phone') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.009), dark);
        screen = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.138, 0.002), screenMat);
        screen.position.z = -0.005;
        device.add(body, screen);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.014), s.material(pick(random, ['#2a2a2e', '#e8e4dc', '#3a5aa8', '#d94848']), { roughness: 0.5 }));
        screen = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.002), screenMat);
        screen.position.z = -0.008;
        device.add(body, screen);
        for (const side of [-1, 1]) {
          const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), dark);
          stick.position.set(side * 0.095, 0.015, -0.012);
          stick.rotation.x = Math.PI / 2;
          device.add(stick);
        }
      }
      device.traverse((node) => { node.castShadow = true; });
      s.root.add(device);
      // The screen lights the face: the skull keeps a faint glow of the screen's colour.
      const skull = person.head.children.find((child) => (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'SphereGeometry' && Math.abs(child.position.x) < 0.001) as THREE.Mesh | undefined;
      if (skull) {
        const litSkin = (skull.material as THREE.MeshStandardMaterial).clone();
        litSkin.emissive = new THREE.Color(glow);
        litSkin.emissiveIntensity = mix(0.12, 0.35, 1 - mood.daylight);
        skull.material = litSkin;
      }
    } else {
      // The kebab hand goes to the mouth; the other arm sprawls along the backrest.
      person.root.updateMatrixWorld(true);
      const mouth = person.head.localToWorld(new THREE.Vector3(0, -headR * 0.3, headR * 1.1));
      const shoulder = at(joints(person, 'right').shoulder);
      reachArm(person, 'right', H, mouth.y - 0.08 - shoulder.y, mouth.z + 0.06 - shoulder.z, 10, 30);
      poseArm(person, 'left', { forward: -8, out: 55, bend: 20, inward: -10 });
      person.root.updateMatrixWorld(true);
      const hand = at(person.hands.right);
      const foil = s.material('#c9ccd2', { metalness: 0.8, roughness: 0.25 });
      const cone = s.cylinder(0.045, 0.02, 0.16, [hand.x, hand.y + 0.02, hand.z + 0.02], foil, 12);
      cone.rotation.x = -0.5;
      s.ball([0.045, 0.03, 0.045], [hand.x, hand.y + 0.1, hand.z + 0.06], s.material('#b8743a', { roughness: 0.9 }), 10);
      s.ball([0.035, 0.02, 0.035], [hand.x + 0.01, hand.y + 0.115, hand.z + 0.075], s.material('#7fbf4a', { roughness: 1 }), 8);
    }

    // ---- the two facing seats.
    const palette = seatPalette(s, random);
    busSeat(s, palette, { x: seatX, z: seatZ, seatTop, aisle: 'right', cantilever: true });
    busSeat(s, palette, { x: seatX, z: frontZ, seatTop, aisle: 'right', cantilever: true });

    // ---- the bag and the board.
    if (a.beside === 'bag' || a.beside === 'both') {
      const canvas = s.material(pick(random, ['#1f2a3a', '#3a3a3c', '#8a2a2a', '#2d6a4a']), { roughness: 1 });
      const bx = seatX + 0.22, bz = seatZ + 0.02;
      const bag = s.box([0.3, 0.38, 0.18], [bx, seatTop + 0.17, bz + 0.03], canvas);
      bag.rotation.set(0.35, 0.3, 0.1);
      s.box([0.28, 0.14, 0.06], [bx + 0.01, seatTop + 0.2, bz + 0.15], canvas).rotation.set(0.35, 0.3, 0.1);
      for (const dx of [-0.08, 0.08]) s.box([0.04, 0.3, 0.02], [bx + dx, seatTop + 0.17, bz - 0.08], s.material('#1a1a1c', { roughness: 1 })).rotation.set(0.35, 0.3, 0.1);
    }
    if (a.beside === 'skateboard' || a.beside === 'both') {
      const deckColour = pick(random, ['#d94848', '#2a2a2e', '#f0c040', '#3a8ad4']);
      const deck = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.8), s.material(deckColour, { roughness: 0.6 }));
      board.castShadow = true;
      deck.add(board);
      for (const z of [-0.26, 0.26]) {
        const truck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), s.material('#8a8f96', { metalness: 0.6, roughness: 0.4 }));
        truck.position.set(0, -0.025, z);
        deck.add(truck);
        for (const x of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 12), s.material('#e8e0c0', { roughness: 0.5 }));
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x * 0.09, -0.03, z);
          deck.add(wheel);
        }
      }
      if (random() < 0.5) {
        // Lying on the floor in front of the seat.
        deck.rotation.set(0, (random() - 0.5) * 0.6, 0);
        deck.position.set(seatX + 0.12, 0.057, seatZ + 0.4);
      } else {
        // Standing on its tail, leaning against the aisle side of the seat.
        deck.rotation.set(-Math.PI / 2, 0, 0);
        deck.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.18);
        deck.position.set(seatX + 0.5, 0.4, seatZ);
      }
      deck.traverse((node) => { node.castShadow = true; });
      s.root.add(deck);
    }

    const pulse = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (screen) (screen.material as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.9, 2.2, 1 - mood.daylight) * (1 + Math.sin(time * 3.7 * pulse) * 0.08 + Math.sin(time * 11 * pulse) * 0.04);
      },
    });
  },
});
