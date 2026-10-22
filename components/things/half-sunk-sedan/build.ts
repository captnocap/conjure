import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { flood } from './flood';

type Pt = readonly [number, number];
interface Style { top: Pt[]; cabin: [Pt, Pt, Pt, Pt]; width: number; wheels: [number, number]; bevel: number }
// Side profiles as [z, y] with the nose toward +z.
const STYLES: Record<'hatchback' | 'sedan' | 'ambassador' | 'microvan', Style> = {
  hatchback: { top: [[1.82, 0.42], [1.8, 0.72], [1.68, 0.86], [0.8, 0.96], [-1.7, 0.99], [-1.79, 0.62], [-1.75, 0.34]], cabin: [[0.85, 0.94], [0.22, 1.47], [-1.3, 1.47], [-1.72, 0.97]], width: 1.52, wheels: [-1.15, 1.2], bevel: 0.07 },
  sedan: { top: [[2.1, 0.42], [2.08, 0.7], [1.95, 0.84], [1.0, 0.95], [-2.08, 0.98], [-2.16, 0.62], [-2.12, 0.34]], cabin: [[1.02, 0.93], [0.36, 1.43], [-0.85, 1.43], [-1.45, 0.97]], width: 1.62, wheels: [-1.32, 1.36], bevel: 0.07 },
  ambassador: { top: [[2.05, 0.46], [2.04, 0.8], [1.86, 1.0], [0.9, 1.06], [-1.55, 1.06], [-2.02, 0.94], [-2.12, 0.62], [-2.06, 0.36]], cabin: [[0.95, 1.03], [0.56, 1.56], [-0.92, 1.56], [-1.46, 1.04]], width: 1.6, wheels: [-1.28, 1.3], bevel: 0.13 },
  microvan: { top: [[1.64, 0.42], [1.64, 0.92], [1.52, 1.02], [-1.6, 1.02], [-1.63, 0.4]], cabin: [[1.54, 0.99], [1.26, 1.78], [-1.55, 1.78], [-1.6, 1.01]], width: 1.42, wheels: [-1.05, 1.1], bevel: 0.05 },
};
const PAINT = {
  white: 'Appliance white, the commonest car on the road.',
  silver: 'Silver-grey metallic.',
  red: 'Bright red, somebody\'s first new car.',
  blue: 'Mid blue.',
  maroon: 'Dark maroon, a family car kept for years.',
  taxi: 'Black body with a yellow roof: a city taxi.',
  green: 'Pale mint green, old-fashioned.',
} as const;
const TINT: Record<keyof typeof PAINT, string> = { white: '#e9e8e2', silver: '#a9afb3', red: '#b3261f', blue: '#2c5c9c', maroon: '#6a2029', taxi: '#1c1c1e', green: '#a7c9b1' };

export default defineThing({
  questions: {
    body: choice('What kind of small car is it?', {
      hatchback: 'A short modern hatchback with a steep tailgate.',
      sedan: 'A compact three-box sedan with a boot.',
      ambassador: 'A rounded, upright old saloon with a bulbous bonnet, the kind used as taxis and official cars for decades.',
      microvan: 'A boxy little microvan with a flat face and sliding doors.',
    }),
    paint: choice('What colour is it?', PAINT),
    waterline: score('How high has the water come up the car?', ['Just over the hubcaps', 'To the door sills', 'To the door handles', 'To the bottom of the windows', 'Only the roof and glass still showing']),
    lights: choice('What are its lights doing?', {
      dead: 'Everything dark, the battery drowned.',
      hazards: 'All four amber hazard lights still blinking.',
      headlights: 'Headlights left on, glowing dimly under the brown water.',
      cabin: 'Only the little interior dome light, left on by an open door.',
      brake: 'Red tail lights stuck on, staining the water behind it.',
    }),
    roof: choice('What is on the roof?', {
      nothing: 'Nothing. The car is simply abandoned.',
      luggage: 'Suitcases and cloth bundles roped down in a hurry.',
      cat: 'A cat sitting upright, waiting it out.',
      shoes: 'A pair of shoes and a folded shirt, left neatly by someone who waded away.',
      person: 'The owner, sitting hunched on the roof under a black umbrella.',
      household: 'A red gas cylinder, a potted plant and rolled bedding lifted clear of the water.',
    }),
    state: choice('How was the car left?', {
      shut: 'Doors shut and locked as if it were only parked.',
      'door-open': 'The driver\'s door hanging open where they climbed out.',
      'bonnet-up': 'Bonnet propped open after a failed attempt to restart it.',
      tilted: 'Nose down and listing, one front wheel dropped into a hidden open drain.',
      'windows-down': 'Windows wound down, water running through the cabin.',
    }),
    wipers: choice('Where did the wipers stop?', {
      parked: 'Parked flat at the bottom of the windscreen.',
      mid: 'Frozen mid-sweep, upright across the glass.',
      splayed: 'One up and one down, with wet leaves stuck under them.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const style = STYLES[a.body];
    const W = style.width;
    const taxi = a.paint === 'taxi';
    const paint = s.material(TINT[a.paint], { roughness: 0.38, metalness: a.paint === 'silver' ? 0.5 : 0.15 });
    const roofPaint = taxi ? s.material('#e9b821', { roughness: 0.4 }) : paint;
    const glassOpen = a.state === 'windows-down';
    const cabinLit = a.lights === 'cabin';
    const glass = new THREE.MeshStandardMaterial({ color: cabinLit ? '#6b5a34' : glassOpen ? '#15191c' : '#2c3a42', roughness: 0.12, metalness: 0.3, emissive: cabinLit ? '#ffd98a' : '#000000', emissiveIntensity: cabinLit ? 0.6 : 0 });
    const black = s.material('#17181a', { roughness: 0.8 });
    const chrome = s.material('#d5d8d8', { metalness: 0.85, roughness: 0.25 });

    const car = new THREE.Group();
    s.root.add(car);
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = car) => {
      object.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      parent.add(object);
      return object;
    };
    const slab = (points: THREE.Shape, width: number, bevel: number, material: THREE.Material) => {
      const geometry = new THREE.ExtrudeGeometry(points, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 10 });
      geometry.rotateY(-Math.PI / 2);
      geometry.translate(width / 2 - bevel, 0, 0);
      return add(new THREE.Mesh(geometry, material));
    };
    const box = (size: readonly [number, number, number], at: readonly [number, number, number], material: THREE.Material, parent: THREE.Object3D = car) => {
      const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(...size), material), parent);
      mesh.position.set(...at);
      return mesh;
    };
    const rod = (from: readonly [number, number, number], to: readonly [number, number, number], radius: number, material: THREE.Material, parent: THREE.Object3D = car) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), material), parent);
      mesh.position.copy(p.add(q).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };

    // Lower body with wheel arches cut into the sill.
    const front = style.top[0][0], rear = style.top[style.top.length - 1][0];
    const lower = new THREE.Shape();
    lower.moveTo(rear + 0.04, 0.27);
    for (const wz of style.wheels) { lower.lineTo(wz - 0.37, 0.27); lower.absarc(wz, 0.3, 0.37, Math.PI, 0, true); }
    lower.lineTo(front - 0.04, 0.27);
    for (const [z, y] of style.top) lower.lineTo(z, y);
    lower.closePath();
    slab(lower, W, style.bevel, paint);
    // Glasshouse, then a painted roof and pillars over it.
    const [c0, c1, c2, c3] = style.cabin;
    const house = new THREE.Shape();
    house.moveTo(c3[0], c3[1] - 0.06); house.lineTo(c0[0], c0[1] - 0.06); house.lineTo(c1[0], c1[1]); house.lineTo(c2[0], c2[1]); house.closePath();
    const cw = W - 0.14;
    slab(house, cw, 0.06, glass);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(c2[0] - 0.03, c2[1] - 0.03); roofShape.lineTo(c1[0] + 0.05, c1[1] - 0.03); roofShape.lineTo(c1[0] + 0.02, c1[1] + 0.035); roofShape.lineTo(c2[0], c2[1] + 0.035); roofShape.closePath();
    slab(roofShape, cw + 0.02, 0.03, roofPaint);
    const roofY = c1[1] + 0.035;
    const midZ = (c1[0] + c2[0]) / 2 + 0.1;
    for (const side of [-1, 1]) {
      const x = side * (cw / 2 - 0.02);
      rod([x, c0[1] - 0.02, c0[0] - 0.02], [x, c1[1], c1[0] + 0.03], 0.04, roofPaint);
      rod([x, c3[1] - 0.02, c3[0] + 0.03], [x, c2[1], c2[0] - 0.01], 0.05, roofPaint);
      rod([x + side * 0.005, c0[1] - 0.05, midZ], [x + side * 0.005, c1[1], midZ], 0.035, roofPaint);
      if (a.body !== 'hatchback') rod([x + side * 0.005, c0[1] - 0.05, c2[0] + 0.12], [x + side * 0.005, c1[1], c2[0] + 0.12], 0.035, roofPaint);
      // Door seams, handles and mirrors.
      const skin = side * (W / 2 + 0.002);
      for (const z of [c0[0] - 0.05, midZ, c2[0] + (a.body === 'sedan' || a.body === 'ambassador' ? 0.2 : 0.35)]) box([0.006, 0.56, 0.012], [skin, 0.64, z], black);
      for (const z of [midZ + 0.14, c2[0] + 0.5]) box([0.03, 0.035, 0.14], [skin + side * 0.008, 0.83, z], taxi ? chrome : black);
      const mirror = box([0.1, 0.09, 0.05], [side * (W / 2 + 0.07), c0[1] + 0.06, c0[0] - 0.12], black);
      mirror.rotation.y = side * 0.2;
      box([0.012, 0.03, Math.abs(front - rear) * 0.72], [skin, 0.56, (front + rear) / 2], taxi ? s.material('#e9b821') : black);
    }
    // Wheels.
    for (const wz of style.wheels) for (const side of [-1, 1]) {
      const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20), black));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * (W / 2 - 0.12), 0.3, wz);
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.21, 14), chrome));
      cap.rotation.z = Math.PI / 2;
      cap.position.copy(wheel.position);
    }
    // Face: grille, bumpers, lamps and number plates.
    const noseY = a.body === 'microvan' ? 0.72 : style.top[1][1] - 0.04;
    const lampOn = a.lights === 'headlights', hazard = a.lights === 'hazards', brake = a.lights === 'brake';
    const lamp = new THREE.MeshStandardMaterial({ color: '#f4efd8', roughness: 0.2, emissive: '#ffe9a8', emissiveIntensity: lampOn ? 1.6 : 0.02 });
    const amber = new THREE.MeshStandardMaterial({ color: '#e08a1c', roughness: 0.3, emissive: '#ff9a1f', emissiveIntensity: hazard ? 2.2 : 0 });
    const red = new THREE.MeshStandardMaterial({ color: '#a8201c', roughness: 0.3, emissive: '#ff2a1a', emissiveIntensity: brake ? 2 : 0.05 });
    box([W * 0.5, 0.13, 0.03], [0, noseY - 0.02, front - 0.015], black);
    for (let i = 0; i < 4; i++) box([W * 0.46, 0.012, 0.035], [0, noseY - 0.065 + i * 0.03, front - 0.012], chrome);
    box([W + 0.04, 0.13, 0.12], [0, 0.44, front - 0.04], a.body === 'ambassador' ? chrome : black);
    box([W + 0.04, 0.13, 0.12], [0, 0.44, rear + 0.05], a.body === 'ambassador' ? chrome : black);
    const rearY = a.body === 'microvan' ? 0.8 : 0.8;
    for (const side of [-1, 1]) {
      const eye = add(new THREE.Mesh(a.body === 'ambassador' ? new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16) : new THREE.BoxGeometry(0.26, 0.13, 0.06), lamp));
      if (a.body === 'ambassador') eye.rotation.x = Math.PI / 2;
      eye.position.set(side * (W / 2 - 0.2), noseY, front - 0.03);
      box([0.09, 0.07, 0.06], [side * (W / 2 - 0.05), noseY - 0.01, front - 0.06], amber);
      box([0.09, 0.07, 0.06], [side * (W / 2 - 0.05), rearY + 0.09, rear + 0.05], amber);
      box([0.2, 0.12, 0.06], [side * (W / 2 - 0.16), rearY, rear + 0.04], red);
    }
    const number = `${['MH', 'WB', 'KA', 'DL', 'TN', 'KL'][Math.floor(random() * 6)]} ${10 + Math.floor(random() * 80)} ${'ABCDEFGHJK'[Math.floor(random() * 10)]} ${1000 + Math.floor(random() * 8999)}`;
    const plateFront = s.label(number, 0.42, 0.11, [0, 0.47, front + 0.025], '#15151a', taxi ? '#e9c21f' : '#f0efe8');
    const plateRear = s.label(number, 0.42, 0.11, [0, 0.62, rear - 0.012], '#15151a', taxi ? '#e9c21f' : '#f0efe8');
    plateRear.rotation.y = Math.PI;
    car.add(plateFront, plateRear);
    // Wipers lie on the windscreen plane.
    const screen = (u: number, x: number): [number, number, number] => [x, mix(c0[1], c1[1], u) + 0.035, mix(c0[0], c1[0], u) + 0.035];
    const sweep = { parked: [0.02, 0.02], mid: [0.72, 0.68], splayed: [0.8, 0.12] }[a.wipers];
    [-1, 1].forEach((side, index) => {
      const base = side * 0.32 - 0.1, u = sweep[index] + (random() - 0.5) * 0.04;
      const tip = screen(Math.max(0.05, u), base + (u > 0.3 ? 0.08 : 0.5));
      rod(screen(0.02, base), tip, 0.012, black);
      if (a.wipers === 'splayed') {
        const leaf = add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), s.material(index ? '#6b7a35' : '#8a6f2c', { side: THREE.DoubleSide })));
        leaf.position.set(tip[0] - 0.05, tip[1] - 0.03, tip[2] + 0.045);
        leaf.rotation.x = -Math.atan2(c0[0] - c1[0], c1[1] - c0[1]);
        leaf.scale.set(1.5, 0.8, 1);
      }
    });
    rod([-cw / 2 + 0.05, roofY, c2[0] + 0.1], [-cw / 2 + 0.02, roofY + 0.5, c2[0] - 0.15], 0.006, black);
    if (taxi) {
      const sign = s.label('TAXI', 0.36, 0.12, [0, roofY + 0.09, c1[0] - 0.22], '#1a1a1a', '#f3d23c');
      car.add(sign);
      box([0.38, 0.14, 0.1], [0, roofY + 0.085, c1[0] - 0.275], s.material('#f3d23c', { emissive: '#f3d23c', emissiveIntensity: mood.daylight > 0.75 ? 0.5 : 0.05 }));
    }

    // How it was left.
    if (a.state === 'door-open') {
      const door = new THREE.Group();
      const dl = c0[0] - 0.05 - midZ;
      box([0.05, 0.6, dl], [0, 0, -dl / 2], paint, door);
      box([0.03, 0.42, 0.04], [0, 0.5, -0.03], roofPaint, door).rotation.x = -0.5;
      box([0.03, 0.04, dl - 0.2], [0, 0.69, -dl / 2 - 0.1], roofPaint, door);
      box([0.03, 0.42, 0.04], [0, 0.5, -dl + 0.02], roofPaint, door);
      box([0.03, 0.035, 0.14], [0.03, 0.2, -dl + 0.2], black, door);
      door.position.set(W / 2 + 0.01, 0.63, c0[0] - 0.05);
      door.rotation.y = -(0.9 + random() * 0.3);
      add(door);
      box([0.012, 0.9, dl - 0.06], [W / 2 - 0.02, 0.86, (c0[0] - 0.05 + midZ) / 2], s.material('#0e0f10'));
    }
    if (a.state === 'bonnet-up' && a.body !== 'microvan') {
      const hood = new THREE.Group();
      const hl = front - c0[0] - 0.12;
      box([W - 0.12, 0.035, hl], [0, 0, hl / 2], paint, hood);
      hood.position.set(0, c0[1] + 0.03, c0[0] + 0.02);
      hood.rotation.x = -0.95;
      add(hood);
      box([W - 0.2, 0.02, hl - 0.1], [0, style.top[2][1] + 0.03, c0[0] + hl / 2 + 0.05], black);
      rod([W / 2 - 0.2, style.top[2][1], front - 0.25], [W / 2 - 0.22, c0[1] + 0.55, c0[0] + 0.42], 0.01, chrome);
    } else if (a.state === 'bonnet-up') {
      const hatch = new THREE.Group();
      box([W - 0.1, 0.7, 0.04], [0, -0.35, 0], paint, hatch);
      hatch.position.set(0, c2[1], c2[0] - 0.05);
      hatch.rotation.x = 1.25;
      add(hatch);
    }
    if (glassOpen) for (const side of [-1, 1]) box([0.02, 0.26, (c1[0] - c2[0]) * 0.8], [side * (cw / 2 + 0.005), c0[1] + 0.2, (c1[0] + c2[0]) / 2 - 0.05], s.material('#0c0d0e'));

    // What is on the roof.
    const rz = (c1[0] + c2[0]) / 2;
    const deck = new THREE.Group();
    deck.position.set(0, roofY, rz - 0.1);
    add(deck);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number], scale: readonly [number, number, number] = [1, 1, 1]) => {
      const mesh = add(new THREE.Mesh(geometry, material), deck);
      mesh.position.set(...at); mesh.scale.set(...scale);
      return mesh;
    };
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    if (a.roof === 'luggage') {
      for (const side of [-1, 1]) rod([side * (cw / 2 - 0.12), 0.07, -0.55], [side * (cw / 2 - 0.12), 0.07, 0.55], 0.015, chrome, deck);
      const cases = ['#7b3b2a', '#2f4a6b', '#3d6b4a', '#8a2b2b', '#c9a23a'];
      box([0.72, 0.22, 0.48], [-0.2, 0.2, -0.18], s.material(cases[Math.floor(random() * 5)]), deck).rotation.y = (random() - 0.5) * 0.3;
      box([0.55, 0.2, 0.4], [0.22, 0.19, 0.32], s.material(cases[Math.floor(random() * 5)]), deck).rotation.y = (random() - 0.5) * 0.4;
      box([0.5, 0.16, 0.36], [-0.18, 0.39, -0.16], s.material(cases[Math.floor(random() * 5)]), deck).rotation.y = (random() - 0.5) * 0.5;
      put(sphere, s.material(mood.cheer > 0.5 ? '#d96a8a' : '#8f8a78', { roughness: 0.95 }), [0.3, 0.22, -0.3], [0.26, 0.2, 0.24]);
      put(sphere, s.material('#d9cfb2', { roughness: 0.95 }), [-0.32, 0.2, 0.36], [0.2, 0.16, 0.22]);
      for (const z of [-0.2, 0.3]) {
        const rope = put(new THREE.TorusGeometry(cw / 2 - 0.1, 0.012, 5, 20, Math.PI), s.material('#d8c07a'), [0, 0.08, z], [1, 0.62, 1]);
        rope.rotation.y = 0;
      }
    } else if (a.roof === 'cat') {
      const fur = s.material(['#d08a3a', '#2a2a2c', '#e8e2d4', '#8d8a85'][Math.floor(random() * 4)], { roughness: 0.95 });
      const cat = new THREE.Group();
      const m = (geometry: THREE.BufferGeometry, at: readonly [number, number, number], scale: readonly [number, number, number]) => { const mesh = add(new THREE.Mesh(geometry, fur), cat); mesh.position.set(...at); mesh.scale.set(...scale); return mesh; };
      m(sphere, [0, 0.15, 0], [0.12, 0.17, 0.14]);
      m(sphere, [0, 0.36, 0.05], [0.095, 0.085, 0.09]);
      for (const side of [-1, 1]) m(new THREE.ConeGeometry(1, 1, 4), [side * 0.055, 0.46, 0.04], [0.035, 0.07, 0.03]);
      for (const side of [-1, 1]) m(sphere, [side * 0.05, 0.05, 0.11], [0.03, 0.05, 0.04]);
      const tail = m(new THREE.TorusGeometry(0.15, 0.022, 6, 14, Math.PI * 0.9), [0.08, 0.03, -0.02], [1, 1, 1]);
      tail.rotation.x = Math.PI / 2;
      cat.rotation.y = 0.4 + random() * 1.2;
      cat.scale.setScalar(1.35);
      cat.position.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
      deck.add(cat);
    } else if (a.roof === 'shoes') {
      const leather = s.material('#3a2618', { roughness: 0.5 });
      for (const side of [-1, 1]) {
        put(sphere, leather, [side * 0.07 - 0.2, 0.045, 0.1], [0.055, 0.045, 0.14]);
        put(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 10), s.material('#17120e'), [side * 0.07 - 0.2, 0.07, 0.03]);
      }
      box([0.34, 0.07, 0.26], [0.2, 0.035, 0.05], s.material('#dfe5ea'), deck).rotation.y = 0.2;
      box([0.3, 0.04, 0.24], [0.2, 0.09, 0.05], s.material('#5a6f8c'), deck).rotation.y = 0.28;
      box([0.07, 0.012, 0.14], [0.02, 0.008, -0.2], black, deck).rotation.y = -0.5;
    } else if (a.roof === 'person') {
      const skin = s.material('#8a5a3c', { roughness: 0.8 }), shirt = s.material(mood.cheer > 0.5 ? '#3f7fb5' : '#6f7570', { roughness: 0.9 }), trouser = s.material('#3b3f45', { roughness: 0.9 });
      const p = new THREE.Group();
      const m = (geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number], scale: readonly [number, number, number]) => { const mesh = add(new THREE.Mesh(geometry, material), p); mesh.position.set(...at); mesh.scale.set(...scale); return mesh; };
      m(sphere, shirt, [0, 0.36, -0.05], [0.17, 0.26, 0.14]).rotation.x = 0.3;
      m(sphere, skin, [0, 0.68, 0.06], [0.1, 0.115, 0.105]);
      m(sphere, s.material('#16130f'), [0, 0.72, 0.035], [0.105, 0.09, 0.105]);
      for (const side of [-1, 1]) {
        rod([side * 0.09, 0.1, 0], [side * 0.1, 0.4, 0.3], 0.06, trouser, p);
        rod([side * 0.1, 0.4, 0.3], [side * 0.1, 0.06, 0.42], 0.05, trouser, p);
        m(sphere, skin, [side * 0.1, 0.035, 0.47], [0.045, 0.03, 0.09]);
        rod([side * 0.17, 0.5, 0], [side * 0.12, 0.36, 0.3], 0.04, shirt, p);
      }
      rod([0.16, 0.34, 0.26], [0.2, 1.12, 0.02], 0.012, black, p);
      const brolly = m(new THREE.ConeGeometry(0.55, 0.2, 10, 1, true), s.material('#1b1b1f', { side: THREE.DoubleSide, roughness: 0.6 }), [0.2, 1.1, 0.02], [1, 1, 1]);
      brolly.rotation.set(0.12, 0, -0.12);
      p.rotation.y = (random() - 0.5) * 1.2 + 0.5;
      p.position.z = -0.1;
      deck.add(p);
    } else if (a.roof === 'household') {
      put(new THREE.LatheGeometry([[0, 0], [0.14, 0], [0.15, 0.05], [0.15, 0.4], [0.1, 0.5], [0.05, 0.52]].map(([x, y]) => new THREE.Vector2(x, y)), 18), s.material('#b8281f', { roughness: 0.45 }), [-0.28, 0, 0.2]);
      put(new THREE.TorusGeometry(0.085, 0.014, 6, 16), s.material('#b8281f'), [-0.28, 0.57, 0.2]).rotation.x = Math.PI / 2;
      put(new THREE.CylinderGeometry(0.13, 0.09, 0.2, 14), s.material('#b0623f', { roughness: 0.9 }), [0.3, 0.1, 0.3]);
      for (let i = 0; i < 9; i++) put(sphere, s.material(i % 2 ? '#3f7a3a' : '#57954a'), [0.3 + (random() - 0.5) * 0.2, 0.27 + random() * 0.26, 0.3 + (random() - 0.5) * 0.2], [0.07, 0.06, 0.07]);
      const roll = put(new THREE.CylinderGeometry(0.15, 0.15, 0.85, 16), s.material(mood.cheer > 0.5 ? '#c9508a' : '#7f6f8f', { roughness: 0.95 }), [0.05, 0.15, -0.35]);
      roll.rotation.z = Math.PI / 2;
      for (const x of [-0.25, 0.3]) put(new THREE.TorusGeometry(0.153, 0.012, 5, 16), s.material('#d8c07a'), [x + 0.05, 0.15, -0.35]).rotation.y = Math.PI / 2;
      put(new THREE.CylinderGeometry(0.16, 0.12, 0.13, 16), s.material('#b9bcbb', { metalness: 0.7, roughness: 0.35 }), [-0.3, 0.065, -0.05]);
    }

    // Into the water.
    const level = mix(0.34, roofY - 0.26, a.waterline);
    const length = front - rear;
    const f = flood(s, W / 2 + 1.0, length / 2 + 1.0, level);
    if (a.state === 'tilted') { car.rotation.set(0.085, 0, -0.11); car.position.set(0, -0.02, 0); }
    car.rotation.y = (random() - 0.5) * 0.16;
    f.ripple(0, 0, W / 2 + 0.16, 1, (length / 2 + 0.18) / (W / 2 + 0.16));
    f.ripple(0, 0, W / 2 + 0.42, 1, (length / 2 + 0.44) / (W / 2 + 0.42));
    if (lampOn && level > noseY - 0.1) {
      const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0.42, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2;
      glow.scale.set(W * 0.62, 0.5, 1);
      glow.position.set(0, level + 0.012, front + 0.42);
      s.root.add(glow);
    }
    if (brake) {
      const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#ff3b25', transparent: true, opacity: 0.3, depthWrite: false }));
      stain.rotation.x = -Math.PI / 2;
      stain.scale.set(W * 0.6, 0.42, 1);
      stain.position.set(0, level + 0.012, rear - 0.4);
      s.root.add(stain);
    }
    // A stained tide line where the water stood higher, when the scene is worn.
    if (mood.wear > 0.35 && level < 0.8) for (const side of [-1, 1]) box([0.008, 0.035, length * 0.86], [side * (W / 2 + 0.003), Math.min(0.92, level + 0.13 + mood.wear * 0.1), (front + rear) / 2], s.material('#6b5a44', { roughness: 1 }));

    const rate = mix(1.2, 3.2, mood.energy);
    return s.finish({
      footprint: Math.max(W, length) / 2 + 0.7,
      update: (dt, time) => {
        f.update(dt, time);
        if (hazard) amber.emissiveIntensity = Math.sin(time * rate * Math.PI) > -0.2 ? 2.2 : 0.05;
        if (cabinLit) glass.emissiveIntensity = 0.6 + Math.sin(time * 9) * 0.03;
      },
    });
  },
});
