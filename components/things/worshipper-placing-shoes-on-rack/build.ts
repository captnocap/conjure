import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { armPose, at, legPose } from './pose';

/** One shoe lying flat, toe toward +z: a flattened capsule with a heel block, merged into one geometry. */
function shoeGeometry(length: number, width: number, height: number) {
  const body = new THREE.CapsuleGeometry(width / 2, length - width, 3, 10);
  body.rotateX(Math.PI / 2);
  body.scale(1, height / width, 1);
  body.translate(0, height / 2, 0);
  const heel = new THREE.BoxGeometry(width * 0.9, height * 0.5, length * 0.28);
  heel.translate(0, height * 0.25, -length * 0.32);
  return mergeGeometries([body, heel]);
}

export default defineThing({
  questions: {
    fullness: score('How full is the rack?', ['Nearly empty, he is among the first', 'A few pairs in', 'Half full', 'Full', 'Overflowing, shoes on top and on the floor around it']),
    shoes: choice('What shoes is he holding?', {
      dress: 'Black leather dress shoes, polished.',
      trainers: 'White trainers with a coloured stripe.',
      sandals: 'Brown leather sandals.',
      boots: 'Dusty work boots with the laces loose.',
    }),
    clothes: choice('What is he wearing?', {
      coat: 'A long dark coat.',
      shirt: 'A shirt tucked into trousers.',
      tunic: 'A long white tunic over loose trousers.',
      suit: 'A grey suit jacket and tie, come straight from the office.',
    }),
    taking: noul('Is he taking his shoes out of the rack instead, prayer over, bag already on his shoulder?'),
    bag: noul('Does a bag hang from his shoulder?'),
    rack: choice('What kind of rack is it?', {
      pigeonhole: 'A wooden pigeonhole rack with square compartments, open front and back.',
      slatted: 'Open slatted wooden shelves on a plain frame.',
      plastic: 'A grey plastic shelving unit with a tube frame.',
    }),
    age: score('How old is he?', ['A boy', 'A young man', 'Middle-aged', 'Old and slow about bending']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = a.age < 0.2 ? mix(1.25, 1.5, a.age * 5) : mix(1.78, 1.66, (a.age - 0.2) / 0.8);
    const build = a.age > 0.7 ? pick(['slight', 'heavy'] as const) : pick(['average', 'average', 'slight'] as const);
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const outfit = {
      coat: { top: '#2a2a30', bottom: '#2a2a30' },
      shirt: { top: pick(['#e9e4d6', '#9fb8cc', '#7a8a6a']), bottom: pick(['#3a3c44', '#4a4238', '#6d6f70']) },
      tunic: { top: '#efe9dc', bottom: '#e5dfd0' },
      suit: { top: '#5a5c60', bottom: '#4a4c50' },
    }[a.clothes];
    const sock = pick(['#e9e6df', '#2a2a2c', '#4a4f5a', '#6b6a60']);
    const hairColour = new THREE.Color('#2a211b').lerp(new THREE.Color('#d8d4cc'), Math.max(0, a.age - 0.55) * 2);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', gaze: 'down', skin: skinTone,
      hair: pick(['short', 'short', 'none'] as const), hairColor: hairColour, top: outfit.top, bottom: outfit.bottom, shoes: sock, sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = H * 0.064;
    const hipW = H * 0.075 * { slight: 0.85, average: 1, heavy: 1.3 }[build];

    // ---- the rack
    const rackH = 1.12, rackW = 1.0, rackD = 0.34, rows = 3, cols = 4;
    const rackZ = 0.62 * H / 1.7 + rackD / 2;
    const timber = s.material(pick(['#8a6a44', '#6b4f33', '#a98a5c']), { roughness: 0.7 });
    const frame = a.rack === 'plastic' ? s.material('#8d9196', { roughness: 0.5 }) : timber;
    const shelf = a.rack === 'plastic' ? s.material('#a8acb0', { roughness: 0.6 }) : timber;
    const t = a.rack === 'plastic' ? 0.025 : 0.02;
    for (const x of [-1, 1]) s.box([t, rackH, rackD], [x * (rackW / 2 - t / 2), rackH / 2, rackZ], frame);
    for (let r = 0; r <= rows; r++) {
      const y = r === 0 ? 0.03 : (r / rows) * rackH;
      if (a.rack === 'slatted' && r > 0 && r < rows) for (const dz of [-0.11, 0, 0.11]) s.box([rackW, t, 0.07], [0, y, rackZ + dz], shelf);
      else s.box([rackW, t, rackD], [0, y, rackZ], shelf);
    }
    if (a.rack === 'pigeonhole') for (let c = 1; c < cols; c++) s.box([t, rackH - 0.03, rackD - 0.02], [-rackW / 2 + (c / cols) * rackW, rackH / 2 + 0.015, rackZ], timber);
    if (a.rack === 'plastic') for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.014, rackH, [x * (rackW / 2 - 0.02), rackH / 2, rackZ + z * (rackD / 2 - 0.02)], s.material('#6e7276', { metalness: 0.5, roughness: 0.4 }), 10);

    // ---- other people's shoes, instanced, filling the holes from one end
    const shoeL = 0.27, shoeW = 0.095, shoeH = 0.075;
    const geometry = shoeGeometry(shoeL, shoeW, shoeH);
    const leather = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 });
    const colours = ['#1c1a19', '#2b211c', '#4a3324', '#6b4b33', '#e9e6df', '#2d3140', '#8a6a4a', '#111111', '#c9c3b4'];
    const fill = Math.min(1, mix(0.05, 1, a.fullness) * mix(0.75, 1.15, mood.density));
    const holes: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) holes.push([r, c]);
    // The hole he is reaching into stays free, in the middle row toward him.
    const mine: [number, number] = [1, cols - 1];
    const order = holes.filter(([r, c]) => !(r === mine[0] && c === mine[1])).sort((p, q) => (q[0] - p[0]) || (random() - 0.5));
    const taken = order.slice(0, Math.round(order.length * fill));
    const spots: { at: [number, number, number]; yaw: number; colour: string }[] = [];
    const holeX = (c: number) => -rackW / 2 + ((c + 0.5) / cols) * rackW;
    const holeY = (r: number) => (r / rows) * rackH + (r === 0 ? 0.03 : 0) + t / 2;
    for (const [r, c] of taken) {
      const colour = pick(colours);
      const pairs = fill > 0.8 && random() < 0.35 ? 2 : 1;
      for (let p = 0; p < pairs; p++) for (const side of [-1, 1]) spots.push({ at: [holeX(c) + side * (shoeW * 0.6) + (random() - 0.5) * 0.01, holeY(r) + p * shoeH, rackZ + (random() - 0.5) * 0.04], yaw: Math.PI + (random() - 0.5) * 0.2, colour });
    }
    if (fill > 0.85) {
      for (let i = 0; i < 3 + Math.round(random() * 3); i++) {
        const colour = pick(colours);
        for (const side of [-1, 1]) spots.push({ at: [-rackW / 2 + 0.12 + i * 0.2 + side * shoeW * 0.6, rackH + t / 2, rackZ + (random() - 0.5) * 0.06], yaw: Math.PI + (random() - 0.5) * 0.4, colour });
      }
      for (let i = 0; i < 2 + Math.round(random() * 3); i++) {
        const colour = pick(colours), x = rackW / 2 + 0.15 + random() * 0.3, z = rackZ - 0.1 + random() * 0.3, yaw = random() * Math.PI * 2;
        for (const side of [-1, 1]) spots.push({ at: [x + Math.cos(yaw) * side * 0.06, 0, z - Math.sin(yaw) * side * 0.06], yaw, colour });
      }
    }
    if (spots.length) {
      const mesh = new THREE.InstancedMesh(geometry, leather, spots.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      spots.forEach((spot, i) => {
        q.setFromEuler(new THREE.Euler(0, spot.yaw, 0));
        m.compose(new THREE.Vector3(...spot.at), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(spot.colour));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // ---- his pose: knees and waist bent, one hand on the rack top, the other reaching into the hole
    const reachSide = 'left', holdSide = 'right';
    const target = new THREE.Vector3(holeX(mine[1]), holeY(mine[0]) + 0.06, rackZ - rackD / 2 - 0.04);
    const bend = a.age > 0.8 ? 0.6 : 0.8;
    for (const side of ['left', 'right'] as const) legPose(person, side, { forward: 34, out: side === reachSide ? 6 : 10, knee: 44 });
    joints.spine.rotation.x = bend;
    joints.neck.rotation.x = 0.15;
    armPose(person, reachSide, { forward: 68, out: 4, bend: 16, swing: -6 });
    armPose(person, holdSide, { forward: 58, out: 26, bend: 10, swing: 0 });
    person.settle();
    person.root.updateMatrixWorld(true);
    // Slide him along so the reaching hand lands in the end hole; he stands at the rack's near end.
    const hand = at(person.hands[reachSide]);
    person.root.position.x += target.x - 0.06 - hand.x;
    person.root.position.z += target.z - hand.z;
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);

    // ---- the shoes in his hand, or coming out of the hole
    const shoeColour = { dress: '#161514', trainers: '#efece4', sandals: '#7a5a3a', boots: '#6b5436' }[a.shoes];
    const mine3 = new THREE.Group();
    const held = at(person.hands[reachSide]);
    if (a.taking) mine3.position.set(target.x, target.y - 0.06 + 0.01, rackZ - 0.02);
    else mine3.position.copy(held).add(new THREE.Vector3(0, -0.02, 0.05));
    mine3.rotation.y = Math.PI + (a.taking ? 0 : -0.2);
    s.root.add(mine3);
    for (const side of [-1, 1]) {
      const shoe = new THREE.Mesh(geometry, s.material(shoeColour, { roughness: a.shoes === 'dress' ? 0.3 : 0.7 }));
      shoe.position.set(side * shoeW * 0.6, 0, 0);
      shoe.castShadow = true;
      mine3.add(shoe);
      if (a.shoes === 'trainers') {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(shoeW + 0.004, 0.012, shoeL * 0.4), s.material(pick(['#c0392b', '#2b5fb0', '#2e8b57'])));
        stripe.position.set(side * shoeW * 0.6, shoeH * 0.45, 0);
        mine3.add(stripe);
      }
      if (a.shoes === 'boots') {
        const cuffMesh = new THREE.Mesh(new THREE.CylinderGeometry(shoeW * 0.5, shoeW * 0.5, 0.08, 12), s.material(shoeColour, { roughness: 0.8 }));
        cuffMesh.position.set(side * shoeW * 0.6, shoeH + 0.03, -shoeL * 0.22);
        mine3.add(cuffMesh);
      }
    }
    if (!a.taking) mine3.rotation.x = -0.15;

    // ---- tie, coat skirt, bag
    if (a.clothes === 'suit') {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.03, H * 0.16, 0.008), s.material(pick(['#7a1f2b', '#1f3a7a', '#2f5a3a'])));
      tie.position.set(0, H * 0.28 * 0.6, H * 0.036 * 1.35 + 0.006);
      joints.spine.add(tie);
    }
    if (a.clothes === 'coat' || a.clothes === 'tunic') {
      const cloth = s.material(outfit.top, { roughness: 0.75, side: THREE.DoubleSide });
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.15, hipW * 1.55, H * 0.3, 18, 1, true), cloth);
      skirt.position.set(0, -H * 0.3 / 2 + 0.02, 0);
      skirt.castShadow = true;
      person.pelvis.add(skirt);
    }
    if (a.bag) {
      const canvas = s.material(pick(['#5a4a3a', '#2f3a4a', '#7a6a4a', '#1f1f22']), { roughness: 0.9 });
      const sling = at(joints.shoulders[holdSide]);
      const bagAt = new THREE.Vector3(hips.x + (hipW + 0.1), hips.y - 0.02, hips.z - 0.04);
      s.box([0.1, 0.26, 0.3], [bagAt.x, bagAt.y, bagAt.z], canvas).rotation.z = 0.1;
      s.box([0.1, 0.06, 0.3], [bagAt.x, bagAt.y + 0.14, bagAt.z], canvas);
      s.rod([bagAt.x, bagAt.y + 0.12, bagAt.z], [sling.x + 0.02, sling.y + 0.05, sling.z - 0.02], 0.012, canvas);
    }

    // Turn the scene so the camera looks at the rack's face with him bending at its near end.
    s.root.rotation.y = -Math.PI * 0.7;
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
