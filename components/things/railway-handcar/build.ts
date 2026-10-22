import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type Block, type P3, HALF_GAUGE, RAIL_TOP, blocks, figure, snowOf, track, weeds } from './rail';

const PAINTS = {
  yellow: 'Maintenance-of-way yellow with black ironwork, a mid-century section car.',
  oxide: 'Red oxide from the same tin as the wagons, a gang trolley of the steam age.',
  varnish: 'Varnished oak and polished brass, a Victorian inspector’s pride.',
  green: 'Army green with white stencils, built for a military railway.',
  blue: 'Sky blue and cream, restored for a heritage line and a little too clean.',
  bare: 'No paint left at all: silver-grey boards and brown iron.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINTS, [string, string]> = {
  yellow: ['#dba51e', '#222325'], oxide: ['#8a3f2c', '#2a2726'], varnish: ['#8b5a2b', '#b8963a'], green: ['#55653f', '#2a2c26'], blue: ['#5a9ac8', '#efe6cc'], bare: ['#8e8a82', '#5e4433'],
};

export default defineThing({
  questions: {
    paint: choice('What era and paint is it?', PAINTS),
    crew: choice('Who is with it?', {
      nobody: 'Nobody.',
      one: 'One railwayman on his own.',
      two: 'A crew of two, one at each handle.',
    }),
    state: choice('What is it doing right now?', {
      parked: 'Parked and scotched, the lever level.',
      pumping: 'Mid-pump and rolling, the lever swinging.',
      derailed: 'Derailed: slewed off the rails and tipped into the ballast.',
      setoff: 'Lifted off the line and set down on timbers beside it to let a train by.',
    }),
    cargo: choice('What is it carrying on its push trailer?', {
      nothing: 'Nothing: there is no trailer, just the car.',
      tools: 'Track tools: picks, a lining bar, a jack and a keg of spikes.',
      sleepers: 'A stack of fresh sleepers.',
      coffin: 'A plain pine coffin with a rope across it.',
      churns: 'Milk churns and a crate, the morning run.',
      mail: 'Mail sacks, a parcel and a guitar case.',
      dog: 'Only a dog, sitting up and looking down the line.',
    }),
    lantern: choice('What about its lantern?', {
      none: 'It carries no lantern.',
      dark: 'An unlit lantern on its staff.',
      amber: 'Lit, warm amber, for working after dark.',
      red: 'Lit red, a tail light for whatever follows.',
    }),
    flag: noul('Is a red flag flying from a staff at its rear corner?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snow = snowOf(s);
    const trailer = a.cargo !== 'nothing';
    const length = trailer ? 5.4 : 3.5;
    track(s, { length });

    const [bodyHex, trimHex] = PAINT_HEX[a.paint];
    const body = new THREE.Color(bodyHex).lerp(new THREE.Color('#857c70'), mood.wear * 0.45);
    const trim = s.material(trimHex, { roughness: a.paint === 'varnish' ? 0.35 : 0.7, metalness: a.paint === 'varnish' ? 0.7 : 0.3 });
    const iron = s.material(new THREE.Color('#2a2b2d').lerp(new THREE.Color('#6a4630'), mood.wear * 0.6), { roughness: 0.75, metalness: 0.3 });
    const wood = s.material('#9a7a4c', { roughness: 0.9 });
    const plankColour = new THREE.Color(a.paint === 'varnish' ? '#a06a34' : '#9c8566').lerp(new THREE.Color('#8b8880'), mood.wear * 0.6);
    const D = RAIL_TOP + 0.6; // deck top
    const wheelR = 0.27;

    /** A four-wheeled flat truck: used for the car itself and for the trailer. */
    const truck = (deckLength: number) => {
      const t = new Sculpture(context);
      const parts: Block[] = [], wheels: Block[] = [], axles: Block[] = [];
      const n = Math.round(deckLength / 0.25);
      for (let i = 0; i < n; i++) parts.push({ size: [deckLength / n - 0.012, 0.045, 1.5], at: [-deckLength / 2 + (i + 0.5) * (deckLength / n), D - 0.022, 0], color: plankColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.07) });
      for (const side of [-1, 1]) parts.push({ size: [deckLength + 0.06, 0.13, 0.09], at: [0, D - 0.1, side * 0.74], color: body });
      for (const end of [-1, 1]) parts.push({ size: [0.09, 0.13, 1.5], at: [end * (deckLength / 2), D - 0.1, 0], color: body });
      for (const x of [-deckLength * 0.32, deckLength * 0.32]) {
        for (const side of [-1, 1]) {
          wheels.push({ size: [wheelR * 2, 0.1, wheelR * 2], at: [x, RAIL_TOP + wheelR, side * HALF_GAUGE], rot: [Math.PI / 2, 0, 0] });
          wheels.push({ size: [wheelR * 2 + 0.08, 0.025, wheelR * 2 + 0.08], at: [x, RAIL_TOP + wheelR, side * (HALF_GAUGE - 0.055)], rot: [Math.PI / 2, 0, 0] });
          parts.push({ size: [0.2, 0.3, 0.08], at: [x, D - 0.25, side * (HALF_GAUGE + 0.1)], color: body.clone().multiplyScalar(0.8) });
        }
        axles.push({ size: [0.07, 1.7, 0.07], at: [x, RAIL_TOP + wheelR, 0], rot: [Math.PI / 2, 0, 0] });
      }
      blocks(t.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), parts);
      blocks(t.root, iron, wheels, new THREE.CylinderGeometry(0.5, 0.5, 1, 20));
      blocks(t.root, iron, axles, new THREE.CylinderGeometry(0.5, 0.5, 1, 8));
      s.root.add(t.root);
      return t;
    };

    const carX = trailer ? 1.05 : 0;
    const car = truck(2.3);
    // Drive: a big spur gear through the deck, the A-frame, and the walking beam.
    const gear = car.cylinder(0.3, 0.3, 0.05, [0.05, D - 0.04, 0.16], trim, 24);
    gear.rotation.x = Math.PI / 2;
    car.cylinder(0.1, 0.1, 0.07, [-0.32, D - 0.14, 0.16], iron, 12).rotation.x = Math.PI / 2;
    const pivotY = D + 0.98;
    for (const side of [-1, 1]) for (const end of [-1, 1]) car.rod([end * 0.36, D, side * 0.26], [0, pivotY, side * 0.13], 0.03, trim);
    car.rod([0, pivotY, -0.2], [0, pivotY, 0.2], 0.035, iron);
    for (const side of [-1, 1]) car.rod([-0.2, D + 0.45, side * 0.2], [0.2, D + 0.45, side * 0.2], 0.02, trim);
    const beam = new THREE.Group();
    beam.position.set(0, pivotY, 0);
    car.root.add(beam);
    const beamParts: THREE.Mesh[] = [car.box([2.0, 0.09, 0.07], [0, 0, 0], iron)];
    for (const end of [-1, 1]) {
      beamParts.push(car.rod([end * 0.98, 0, -0.5], [end * 0.98, 0, 0.5], 0.028, wood));
      beamParts.push(car.box([0.1, 0.12, 0.1], [end * 0.98, 0, 0], iron));
    }
    for (const part of beamParts) beam.add(part);
    const pumping = a.state === 'pumping';
    const tilt = pumping ? 0.3 : a.state === 'derailed' ? -0.36 : 0.04;
    beam.rotation.z = tilt;
    const link = car.rod([0.5, pivotY + Math.sin(tilt) * 0.5, 0.16], [0.22, D + 0.12, 0.16], 0.018, iron);
    // Brake lever, toolbox, lantern and flag.
    car.rod([-0.55, D, -0.6], [-0.7, D + 0.55, -0.6], 0.02, iron);
    car.box([0.52, 0.2, 0.26], [0.1, D + 0.1, -0.58], s.material(body.clone().multiplyScalar(0.75)));
    car.box([0.54, 0.03, 0.28], [0.1, D + 0.21, -0.58], trim);
    let lampMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.lantern !== 'none') {
      const lit = a.lantern !== 'dark';
      const tint = a.lantern === 'red' ? '#ff3a28' : a.lantern === 'amber' ? '#ffb53a' : '#5a5246';
      lampMaterial = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: lit ? 2 : 0, roughness: 0.3 });
      car.rod([1.08, D, 0.62], [1.08, D + 0.62, 0.62], 0.018, iron);
      car.cylinder(0.075, 0.085, 0.17, [1.08, D + 0.72, 0.62], lampMaterial, 12);
      car.cylinder(0.095, 0.095, 0.03, [1.08, D + 0.63, 0.62], iron, 12);
      car.mesh(new THREE.ConeGeometry(0.1, 0.09, 12), iron, [1.08, D + 0.85, 0.62]);
      car.ring(0.06, 0.008, [1.08, D + 0.93, 0.62], iron);
    }
    if (a.flag) {
      car.rod([-1.08, D, -0.64], [-1.12, D + 1.55, -0.66], 0.016, wood);
      const cloth = car.mesh(new THREE.PlaneGeometry(0.55, 0.42, 8, 1), new THREE.MeshStandardMaterial({ color: '#d02a22', side: THREE.DoubleSide, roughness: 0.9 }), [-1.4, D + 1.32, -0.66]);
      const p = cloth.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.05 * (0.5 + mood.energy));
      cloth.geometry.computeVertexNormals();
    }
    if (a.paint === 'green') { const mark = car.label('MR 47', 0.6, 0.11, [0.5, D - 0.1, 0.79], '#e8e4d0', `#${body.getHexString()}`); mark.rotation.y = 0; }

    // Crew.
    const crewCount = a.crew === 'two' ? 2 : a.crew === 'one' ? 1 : 0;
    const coats = [a.paint === 'yellow' ? '#e8791c' : '#3c4a5c', a.paint === 'varnish' ? '#2a2a2e' : '#5a4636'];
    const hats = a.paint === 'yellow' ? (['hardhat', 'hardhat'] as const) : a.paint === 'varnish' ? (['brim', 'cap'] as const) : (['cap', 'beanie'] as const);
    const onCar = (group: THREE.Group, at: P3, yaw: number) => { car.root.add(group); group.position.set(...at); group.rotation.y = yaw; };
    for (let i = 0; i < crewCount; i++) {
      const end = i === 0 ? 1 : -1;
      const base = { coat: coats[i], hat: hats[i], hatColour: a.paint === 'yellow' ? '#f2f0e8' : '#2c2f33', at: [0, 0, 0] as P3 };
      if (pumping) onCar(figure(s, { ...base, pose: end * tilt > 0 ? 'reach' : 'hunch' }), [end * 0.62, D, (random() - 0.5) * 0.1], -end * Math.PI / 2);
      else if (a.state === 'derailed') figure(s, { ...base, pose: i ? 'stand' : 'hunch', at: [carX + end * 1.2, 0.2, i ? 2.5 : -1.9], yaw: i ? Math.PI * 0.9 : 0.4 });
      else onCar(figure(s, { ...base, pose: 'sit' }), [end * 0.5, D + 0.02, 0.62], (random() - 0.5) * 0.4);
    }

    // Trailer and load.
    if (trailer) {
      const tr = truck(1.9);
      tr.root.position.x = carX - 2.3;
      tr.rod([0.95, D - 0.12, 0], [1.2, D - 0.12, 0], 0.03, iron);
      const lay = (mesh: THREE.Object3D) => mesh;
      if (a.cargo === 'tools') {
        tr.rod([-1.2, D + 0.04, 0.45], [0.9, D + 0.04, 0.5], 0.018, iron);
        tr.rod([-0.8, D + 0.03, 0.2], [0.3, D + 0.03, 0.3], 0.022, wood); tr.box([0.07, 0.05, 0.6], [0.3, D + 0.04, 0.3], iron);
        tr.rod([-0.7, D + 0.03, -0.1], [0.4, D + 0.03, 0.05], 0.022, wood); tr.box([0.3, 0.02, 0.24], [0.52, D + 0.03, 0.07], iron);
        tr.lathe([[0.01, 0], [0.14, 0.01], [0.18, 0.2], [0.14, 0.4], [0.01, 0.41]], s.material('#7a5a3a'), [-0.5, D, -0.45]);
        for (const y of [0.1, 0.3]) tr.ring(0.172, 0.012, [-0.5, D + y, -0.45], iron).rotation.x = Math.PI / 2;
        tr.box([0.22, 0.42, 0.22], [0.25, D + 0.21, -0.45], s.material('#a63a2a')); tr.rod([0.25, D + 0.42, -0.45], [0.25, D + 0.62, -0.45], 0.03, iron);
        tr.cylinder(0.13, 0.1, 0.24, [0.65, D + 0.12, -0.3], s.material('#8e979b', { metalness: 0.5 }), 12);
      } else if (a.cargo === 'sleepers') {
        const stack: Block[] = [];
        for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 4 - layer; i++) stack.push({ size: [2.3, 0.15, 0.25], at: [(random() - 0.5) * 0.15, D + 0.08 + layer * 0.155, (i - (3 - layer) / 2) * 0.3], rot: [0, (random() - 0.5) * 0.04, 0], color: new THREE.Color('#5a4630').offsetHSL(0, 0, (random() - 0.5) * 0.07) });
        blocks(tr.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), stack);
        tr.rod([0, D + 0.02, -0.72], [0, D + 0.5, -0.4], 0.012, s.material('#b9a274')); tr.rod([0, D + 0.5, -0.4], [0, D + 0.5, 0.4], 0.012, s.material('#b9a274')); tr.rod([0, D + 0.5, 0.4], [0, D + 0.02, 0.72], 0.012, s.material('#b9a274'));
      } else if (a.cargo === 'coffin') {
        const outline = new THREE.Shape([[-1, -0.2], [-0.45, -0.34], [1, -0.22], [1, 0.22], [-0.45, 0.34], [-1, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)));
        const coffin = new THREE.ExtrudeGeometry(outline, { depth: 0.36, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
        coffin.rotateX(-Math.PI / 2);
        lay(tr.mesh(coffin, s.material('#c2a06a', { roughness: 0.8 }), [0, D + 0.02, 0])).rotation.y = Math.PI + (random() - 0.5) * 0.08;
        for (const x of [-0.4, 0.5]) tr.ring(0.4, 0.014, [x, D + 0.12, 0], s.material('#a48a58')).rotation.y = Math.PI / 2;
        tr.box([0.5, 0.012, 0.012], [0.2, D + 0.42, 0], iron); tr.box([0.012, 0.012, 0.26], [0.32, D + 0.42, 0], iron);
        if (mood.cheer < 0.6) { tr.ring(0.16, 0.05, [-0.3, D + 0.44, 0], s.material('#35603a')).rotation.x = Math.PI / 2; }
      } else if (a.cargo === 'churns') {
        const tin = s.material('#aab2b5', { metalness: 0.7, roughness: 0.35 });
        for (const [x, z] of [[-0.55, -0.35], [-0.5, 0.3], [0.05, -0.4], [0.1, 0.2]]) { tr.lathe([[0.01, 0], [0.17, 0.01], [0.18, 0.42], [0.11, 0.56], [0.11, 0.64], [0.14, 0.66], [0.14, 0.7], [0.01, 0.71]], tin, [x + (random() - 0.5) * 0.06, D, z]); }
        tr.box([0.5, 0.3, 0.4], [0.6, D + 0.15, 0.3], wood);
      } else if (a.cargo === 'mail') {
        const canvas = s.material('#b9ab8a', { roughness: 1 });
        for (const [x, z, r] of [[-0.55, -0.3, 0.2], [-0.5, 0.3, 0.9], [0.0, 0.3, 1.7]]) { const sack = tr.ball([0.36, 0.26, 0.3], [x, D + 0.22, z], canvas, 12); sack.rotation.y = r; tr.cylinder(0.05, 0.09, 0.14, [x + Math.cos(r) * 0.3, D + 0.34, z - Math.sin(r) * 0.25], canvas, 8).rotation.z = -1; }
        tr.box([0.4, 0.26, 0.3], [0.62, D + 0.13, 0.3], s.material('#a5814e')); tr.box([0.42, 0.02, 0.04], [0.62, D + 0.27, 0.3], s.material('#d8d2c0'));
        const guitarCase = tr.box([1.1, 0.13, 0.4], [0.1, D + 0.07, 0.42], s.material('#1f1c1a')); guitarCase.position.set(0.3, D + 0.07, -0.42); guitarCase.rotation.y = 0.1;
      } else if (a.cargo === 'dog') {
        const fur = s.material(['#8a5a34', '#2b2622', '#cbbf9e'][Math.floor(random() * 3)], { roughness: 1 });
        tr.ball([0.2, 0.3, 0.2], [0.1, D + 0.3, 0], fur, 12).rotation.z = -0.25;
        tr.ball([0.24, 0.16, 0.22], [-0.03, D + 0.15, 0], fur, 12);
        tr.ball([0.13, 0.13, 0.13], [0.25, D + 0.68, 0], fur, 12);
        tr.box([0.2, 0.1, 0.1], [0.4, D + 0.64, 0], fur);
        tr.ball([0.035, 0.035, 0.035], [0.5, D + 0.66, 0], s.material('#151515'), 8);
        for (const side of [-1, 1]) { tr.mesh(new THREE.ConeGeometry(0.05, 0.14, 4), fur, [0.2, D + 0.84, side * 0.08]); tr.rod([0.22, D + 0.42, side * 0.1], [0.3, D + 0.02, side * 0.1], 0.035, fur); }
        tr.rod([-0.2, D + 0.1, 0], [-0.5, D + 0.22, 0.1], 0.03, fur, 0.015);
        tr.ball([0.3, 0.14, 0.26], [-0.55, D + 0.12, -0.4], s.material('#7a6a4a'), 10);
      }
      if (snow > 0.5) tr.box([1.9, 0.03, 1.5], [0, D + 0.015, 0], new THREE.MeshStandardMaterial({ color: '#f3f6f8' }));
    }

    // Where the car sits.
    car.root.position.x = carX;
    if (a.state === 'derailed') {
      car.root.position.set(carX + 0.25, -0.2, 0.75);
      car.root.rotation.set(0.24, 0.42, 0.05);
      const gouge: Block[] = Array.from({ length: 12 }, () => ({ size: [0.16, 0.1, 0.16] as const, at: [carX + mix(-1.4, 0.6, random()), 0.3, mix(0.2, 1.5, random())] as const, rot: [random() * 3, random() * 3, 0] as const }));
      blocks(s.root, new THREE.MeshStandardMaterial({ color: '#77716a', roughness: 1, flatShading: true }), gouge, new THREE.DodecahedronGeometry(0.6, 0));
      car.box([0.5, 0.2, 0.26], [0.5, 0.28 + 0.2, 1.75], s.material(body.clone().multiplyScalar(0.75))).rotation.set(0, 0.8, 0.9);
    } else if (a.state === 'setoff') {
      car.root.position.set(carX, -(RAIL_TOP - 0.17), 2.75);
      car.root.rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) s.box([0.2, 0.16, 2.8], [carX + side * HALF_GAUGE, 0.08, 2.75], s.material('#4b3b2d'));
    } else if (a.state === 'parked') {
      for (const end of [-1, 1]) { const chock = s.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 3), s.material('#7a5a3a'), [carX + end * (2.3 * 0.32 + 0.3), RAIL_TOP + 0.06, HALF_GAUGE]); chock.rotation.set(Math.PI / 2, 0, end > 0 ? Math.PI : 0); }
    }
    if (mood.wear > 0.5) weeds(s, Array.from({ length: Math.round(mood.wear * 16) }, () => ({ at: [(random() - 0.5) * length, 0.12, (random() < 0.5 ? -1 : 1) * mix(1.4, 2.1, random())] as const, size: mix(0.3, 0.8, random()) })));
    if (snow > 0.5 && !pumping) car.box([2.3, 0.03, 1.5], [0, D + 0.015, 0], new THREE.MeshStandardMaterial({ color: '#f3f6f8' }));

    const speed = mix(1.5, 6, mood.energy);
    const lit = a.lantern === 'amber' || a.lantern === 'red';
    return s.finish({
      update: (_dt, time) => {
        if (pumping) { beam.rotation.z = Math.sin(time * speed) * 0.3; link.position.y = (pivotY + D + 0.12) / 2 + Math.sin(time * speed) * 0.07; }
        if (lampMaterial && lit) lampMaterial.emissiveIntensity = 1.8 + Math.sin(time * 9) * 0.25;
      },
    });
  },
});
