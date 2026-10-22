import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { armPose, at, skullcap } from './pose';

/** A pigeon from two spheres, a beak and a tail, merged so a flock is one draw call. */
function pigeonGeometry(pecking: boolean) {
  const body = new THREE.SphereGeometry(0.06, 10, 8);
  body.scale(0.85, 0.78, 1.25);
  body.translate(0, 0.072, 0);
  const headY = pecking ? 0.05 : 0.13, headZ = pecking ? 0.1 : 0.072;
  const head = new THREE.SphereGeometry(0.03, 8, 6);
  head.translate(0, headY, headZ);
  const beak = new THREE.ConeGeometry(0.008, 0.022, 5);
  beak.rotateX(pecking ? Math.PI * 0.75 : Math.PI / 2);
  beak.translate(0, headY - (pecking ? 0.02 : 0), headZ + (pecking ? 0.02 : 0.032));
  const tail = new THREE.BoxGeometry(0.05, 0.012, 0.08);
  tail.rotateX(-0.25);
  tail.translate(0, 0.082, -0.1);
  return mergeGeometries([body, head, beak, tail]);
}

const PIGEON_COLOURS = ['#7d7f86', '#5a5c64', '#9a9ba0', '#3e3f45', '#b7b3ad', '#6f5f58', '#e4e2dd', '#8a8d95'];

export default defineThing({
  questions: {
    cap: choice('What is on his head?', {
      flat: 'A flat tweed cap.',
      knitted: 'A knitted wool cap.',
      skullcap: 'A white crocheted cap.',
      none: 'Bare, short grey hair.',
    }),
    tray: choice('What holds the cones?', {
      wooden: 'A wooden tray on a tripod, rows of holes drilled for the cones.',
      crate: 'An upturned plastic crate with the cones standing in it.',
      box: 'A cardboard box on a folding stool, cones in rows.',
    }),
    flock: score('How many pigeons has he drawn?', ['Two or three', 'A dozen', 'A grey carpet of them']),
    business: score('How is business today?', ['Every cone still in the tray, nobody buying', 'Half the cones sold', 'Nearly sold out, the last few cones left']),
    stool: noul('Is there a folding stool behind him for the slow hours?'),
    tin: noul('Is there a tin of coins on the tray?'),
    clothes: choice('What does he wear?', {
      tweed: 'A brown tweed waistcoat over a white shirt.',
      black: 'A black waistcoat and grey trousers.',
      green: 'An olive green waistcoat and a checked shirt.',
      anorak: 'A worn blue anorak, no waistcoat at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.64, 1.78, random());
    const build = pick(['average', 'heavy', 'slight', 'average'] as const);
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const outfit = {
      tweed: { shirt: '#eeeae0', vest: '#6b4f33', bottom: '#4a4238' },
      black: { shirt: '#dcdcd4', vest: '#1f1d20', bottom: '#5a5c60' },
      green: { shirt: '#9a7a5a', vest: '#5a6a3a', bottom: '#3a3c44' },
      anorak: { shirt: '#3a5a8a', vest: null, bottom: '#2f3038' },
    }[a.clothes];
    const grey = random() < 0.6;
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', gaze: 'ahead', skin: skinTone,
      hair: a.cap === 'flat' ? 'cap' : 'short', hairColor: a.cap === 'flat' ? pick(['#5a4a38', '#3f3a33', '#6b6456']) : grey ? '#b9b4aa' : '#3a2e26',
      top: outfit.shirt, bottom: outfit.bottom, shoes: '#2a211b', sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = H * 0.064;
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;

    // ---- the pose: one cone held out, the other hand resting on the tray edge
    const offerSide = random() < 0.5 ? 'right' : 'left';
    const restSide = offerSide === 'right' ? 'left' : 'right';
    armPose(person, offerSide, { forward: 58, out: 10, bend: 12, swing: 0 });
    armPose(person, restSide, { forward: 36, out: 8, bend: 30, swing: -20 });
    joints.neck.rotation.y = (offerSide === 'right' ? -1 : 1) * 0.25;
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);

    // ---- waistcoat, cap
    if (outfit.vest) {
      const torso = joints.spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
      const vest = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.42 * (build === 'heavy' ? 1.25 : 1), torsoL * 0.98 - limb * 2.6, 4, 14), s.material(outfit.vest, { roughness: 0.85 }));
      vest.position.y = torsoL * 0.44;
      vest.scale.x = torso.scale.x * 1.02;
      vest.castShadow = true;
      joints.spine.add(vest);
      const front = limb * 1.42 * (build === 'heavy' ? 1.25 : 1) + 0.004;
      for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#2a2320'));
        button.position.set(0, torsoL * 0.2 + i * torsoL * 0.11, front);
        joints.spine.add(button);
      }
    }
    if (a.cap === 'knitted') skullcap(person.head, headR, s.material(pick(['#3a3a40', '#5a2a2a', '#2f3b33']), { roughness: 1 }), { tall: 1.25 });
    if (a.cap === 'skullcap') skullcap(person.head, headR, s.material('#f3f1ea', { roughness: 0.95 }));

    // ---- the tray and its stand
    const trayW = 0.62, trayD = 0.4, trayY = 0.86 * H / 1.7;
    const trayZ = hips.z + 0.42;
    const wood = s.material(pick(['#8a6a44', '#6b4f33', '#a98a5c']), { roughness: 0.7 });
    const paper = new THREE.MeshStandardMaterial({ color: '#ece4cf', roughness: 0.95 });
    const grain = new THREE.MeshStandardMaterial({ color: '#b8923a', roughness: 0.9 });
    let topY = trayY;
    if (a.tray === 'wooden') {
      s.box([trayW, 0.05, trayD], [0, trayY - 0.025, trayZ], wood);
      s.box([trayW + 0.02, 0.03, 0.02], [0, trayY + 0.015, trayZ + trayD / 2], wood);
      s.box([trayW + 0.02, 0.03, 0.02], [0, trayY + 0.015, trayZ - trayD / 2], wood);
      for (const [dx, dz] of [[-0.22, 0.16], [0.22, 0.16], [0, -0.18]]) s.rod([dx * 1.4, 0, trayZ + dz * 1.5], [dx * 0.4, trayY - 0.05, trayZ + dz * 0.5], 0.012, wood);
      s.ring(0.09, 0.006, [0, trayY * 0.45, trayZ], s.material('#5a4a38', { roughness: 0.8 })).rotation.x = Math.PI / 2;
    } else if (a.tray === 'crate') {
      const plastic = s.material(pick(['#2f5fa8', '#c0392b', '#2a7a4a']), { roughness: 0.6 });
      topY = 0.5;
      s.box([0.5, 0.5, 0.36], [0, 0.25, trayZ], plastic);
      for (let i = 0; i < 5; i++) s.box([0.52, 0.03, 0.38], [0, 0.06 + i * 0.1, trayZ], s.material('#f1f1f1', { roughness: 0.7, transparent: true, opacity: 0.0, depthWrite: false }));
      for (let i = 0; i < 4; i++) s.box([0.52, 0.02, 0.37], [0, 0.1 + i * 0.1, trayZ], plastic);
    } else {
      topY = 0.72;
      const canvas = s.material('#4a4a4c', { roughness: 0.8 });
      for (const [dx, dz] of [[-0.14, 0.1], [0.14, 0.1], [-0.14, -0.1], [0.14, -0.1]]) s.rod([dx * 1.3, 0, trayZ + dz * 1.3], [dx, 0.45, trayZ + dz], 0.01, s.material('#6b6b6b', { metalness: 0.6, roughness: 0.4 }));
      s.box([0.34, 0.02, 0.26], [0, 0.46, trayZ], canvas);
      const card = s.material('#b8945e', { roughness: 0.95 });
      s.box([0.5, 0.26, 0.38], [0, 0.6, trayZ], card);
      s.box([0.44, 0.02, 0.32], [0, 0.73, trayZ], s.material('#8a6a44', { roughness: 0.95 }));
    }

    // ---- the cones of grain, standing in rows, sold from one end
    const cone = new THREE.ConeGeometry(0.03, 0.12, 9);
    cone.rotateX(Math.PI);
    const rows = 3, cols = 7;
    const total = rows * cols;
    const left = Math.max(1, Math.round(total * mix(1, 0.1, a.business) * mix(0.9, 1.05, mood.density)));
    const spots: { at: [number, number, number]; size: number }[] = [];
    const tops: { at: [number, number, number]; size: number }[] = [];
    let index = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (index++ >= left) continue;
      const x = (c - (cols - 1) / 2) * 0.078 + (random() - 0.5) * 0.01, z = trayZ + (r - 1) * 0.11 + (random() - 0.5) * 0.01;
      spots.push({ at: [x, topY + 0.055, z], size: 0.9 + random() * 0.2 });
      tops.push({ at: [x, topY + 0.115, z], size: 1 });
    }
    if (spots.length) {
      s.scatter(cone, paper, spots);
      s.scatter(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 9), grain, tops);
    }
    // The cone held out in his hand.
    const hand = at(person.hands[offerSide]);
    const held = new THREE.Mesh(cone, paper);
    held.position.set(hand.x, hand.y + 0.03, hand.z + 0.02);
    held.rotation.x = 0.5;
    held.castShadow = true;
    s.root.add(held);
    const heldTop = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 9), grain);
    heldTop.position.set(hand.x, hand.y + 0.03 + 0.06 * Math.cos(0.5), hand.z + 0.02 - 0.06 * Math.sin(0.5));
    heldTop.rotation.x = 0.5;
    s.root.add(heldTop);
    if (a.tin) {
      const tin = s.material('#b8b8b0', { metalness: 0.7, roughness: 0.35 });
      s.cylinder(0.05, 0.05, 0.06, [trayW / 2 - 0.08, topY + 0.03, trayZ - 0.12], tin, 16);
      for (let i = 0; i < 5; i++) s.cylinder(0.011, 0.011, 0.003, [trayW / 2 - 0.08 + (random() - 0.5) * 0.05, topY + 0.062, trayZ - 0.12 + (random() - 0.5) * 0.05], s.material(i % 2 ? '#c9a44a' : '#c7c9cc', { metalness: 0.7, roughness: 0.3 }), 10);
    }
    if (a.stool) {
      const stoolZ = hips.z - 0.4, stoolX = 0.25;
      const frame = s.material('#5a5a5c', { metalness: 0.5, roughness: 0.5 });
      for (const sx of [-1, 1]) {
        s.rod([stoolX + sx * 0.16, 0, stoolZ + 0.12], [stoolX + sx * 0.12, 0.42, stoolZ - 0.1], 0.008, frame);
        s.rod([stoolX + sx * 0.16, 0, stoolZ - 0.12], [stoolX + sx * 0.12, 0.42, stoolZ + 0.1], 0.008, frame);
      }
      s.box([0.3, 0.015, 0.26], [stoolX, 0.43, stoolZ], s.material(pick(['#8a3a3a', '#3a5a8a', '#c9b26a']), { roughness: 0.9 }));
    }

    // ---- the flock round his feet, and the grain they are after
    const count = Math.round(mix(2, 22, a.flock) * mix(0.8, 1.2, mood.density));
    const standing: { at: [number, number, number]; yaw: number; colour: string }[] = [];
    const pecking: typeof standing = [];
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, distance = 0.35 + random() * 0.75;
      const x = Math.sin(angle) * distance, z = hips.z + 0.25 + Math.cos(angle) * distance * 0.8;
      if (Math.hypot(x - hips.x, z - hips.z) < 0.3) continue;
      (random() < 0.55 ? pecking : standing).push({ at: [x, 0, z], yaw: random() * Math.PI * 2, colour: pick(PIGEON_COLOURS) });
    }
    const feathers = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    for (const [list, peck] of [[standing, false], [pecking, true]] as const) {
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(pigeonGeometry(peck), feathers, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      list.forEach((spot, i) => {
        const size = 0.9 + random() * 0.2;
        q.setFromEuler(new THREE.Euler(0, spot.yaw, 0));
        m.compose(new THREE.Vector3(...spot.at), q, new THREE.Vector3(size, size, size));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(spot.colour));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 6), grain, Array.from({ length: 30 + Math.round(a.flock * 40) }, () => ({ at: [(random() - 0.5) * 1.6, 0.003, hips.z + 0.3 + (random() - 0.5) * 1.3] as const, size: 0.006 + random() * 0.005 })));

    // A three-quarter turn so the tray sits to his front-left and the offered cone is seen.
    s.root.rotation.y = -Math.PI / 5;
    const bob = mix(0.2, 1, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        held.position.y = hand.y + 0.03 + Math.sin(time * 1.6 * bob) * 0.01;
        heldTop.position.y = held.position.y + 0.06 * Math.cos(0.5);
      },
    });
  },
});
