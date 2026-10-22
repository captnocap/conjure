import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';
import { circleHole, crossings, finishTexture, gearShape, ribbon, screw, slab, spiral, tile } from './bits';

const FINISH = {
  geneva: { plate: '#c9cbc4', bridge: '#dcb85c', plateGrain: 'perlage', bridgeGrain: 'stripes' },
  rhodium: { plate: '#b4b9bd', bridge: '#d2d6d9', plateGrain: 'perlage', bridgeGrain: 'stripes' },
  german: { plate: '#cfc8b2', bridge: '#ddd5bc', plateGrain: 'brushed', bridgeGrain: 'brushed' },
  gilt: { plate: '#cfa94c', bridge: '#e2bd5a', plateGrain: 'brushed', bridgeGrain: 'brushed' },
  dark: { plate: '#565a63', bridge: '#6f747e', plateGrain: 'perlage', bridgeGrain: 'stripes' },
} as const;

export default defineWorld({
  questions: {
    finish: choice('How is the movement finished?', {
      geneva: 'Gilt brass bridges with broad Geneva stripes over a pearled nickel plate: the classic Swiss look.',
      rhodium: 'Cool silvery rhodium, striped and pearled, modern and clinical.',
      german: 'Frosted German silver gone warm grey, with fat gold chatons: sober and old.',
      gilt: 'Everything frosted yellow gilt, like an English pocket watch.',
      dark: 'Blackened ruthenium bridges, so the gold wheels and rubies glow against them.',
    }),
    state: choice('What state is the watch in?', {
      running: 'Running: the balance swings and the wheels step round.',
      stopped: 'Stopped. Everything is in place and perfectly still.',
      service: 'Half way through a service: a bridge lifted, its screws out on the plate, tweezers left across it.',
      rusted: 'Water got in years ago: rust blooms across the steel and the plate is stained.',
    }),
    casing: choice('What surrounds the movement?', {
      steel: 'The polished steel case, its wall rising round the back like a cliff, crown at the side.',
      gold: 'A yellow gold case.',
      holder: 'No case: the bare movement sits in a brass movement-holder ring on the bench.',
    }),
    bench: choice('What is under it all?', {
      mat: 'A green watchmaker\'s bench mat.',
      wood: 'A scarred wooden bench top.',
      paper: 'A sheet of clean white watch paper.',
      velvet: 'A dark jeweller\'s velvet pad.',
    }),
    screws: choice('What are the screws like?', {
      blued: 'Heat-blued, cornflower against the brass.',
      polished: 'Mirror-polished steel.',
      black: 'Black, plain and cheap.',
    }),
    jewels: score('How many jewels can you count?', ['Seven, the bare minimum', 'Seventeen', 'Twenty-five, a ruby at every pivot']),
    words: choice('What is engraved on the big bridge?', {
      jewels: 'The jewel count and SWISS MADE.',
      adjusted: 'ADJUSTED 5 POSITIONS.',
      number: 'Only a serial number.',
      private: 'A name scratched small by a watchmaker long ago, where the owner would never look.',
      nothing: 'Nothing at all.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const bench = { mat: '#86a08c', wood: '#a98a63', paper: '#e9e6dc', velvet: '#5a5f70' }[a.bench];
    const lift = 0.36, terrace = lift + 0.95;
    const { art: s, world } = diorama(context, {
      background: '#ebe5d8', floor: bench, width: 18.2, depth: 18.2, maxHeight: 3.8, radius: 1.9, pitch: 38, yaw: 22,
      slots: [[1.3, 3.3, lift], [5.1, 0.9, lift, 0.8], [-2.7, 4.7, lift, 0.8], [3.4, -3.8, terrace, 0.72], [-3.7, -3.9, terrace + 0.2, 0.55]],
    });
    // A warm lamp low at the back, for the workshop glow on the metal.
    const lamp = new THREE.DirectionalLight('#ffd7a0', mix(0.4, 1.1, mood.warmth));
    lamp.position.set(-7, 5, -8);
    s.root.add(lamp);

    const look = FINISH[a.finish];
    const rusted = a.state === 'rusted';
    const dull = mix(0.22, 0.6, mood.wear) + (rusted ? 0.15 : 0);
    const plateMaterial = s.material('#ffffff', { map: tile(finishTexture(look.plateGrain, look.plate, random, mood.wear), 1.9, 0), metalness: 0.4, roughness: dull + 0.1 });
    const bridgeTexture = tile(finishTexture(look.bridgeGrain, look.bridge, random, mood.wear), 5.2, 0.55);
    const bridgeMaterial = s.material('#ffffff', { map: bridgeTexture, metalness: 0.45, roughness: look.bridgeGrain === 'brushed' ? 0.6 : dull });
    const gold = s.material('#e4b440', { metalness: 0.6, roughness: dull });
    const steel = s.material(rusted ? '#a4826a' : '#cdd2d6', { metalness: rusted ? 0.3 : 0.7, roughness: dull });
    const ruby = s.material('#d81440', { roughness: 0.12, emissive: '#c00a30', emissiveIntensity: mix(0.3, 0.8, mood.cheer) });
    const blue = s.material('#2f58cc', { metalness: 0.5, roughness: 0.25, emissive: '#10267a', emissiveIntensity: 0.55 });
    const screwMaterial = rusted ? s.material('#8a4b23', { roughness: 0.9 }) : { blued: blue, polished: steel, black: s.material('#25272b', { roughness: 0.6 }) }[a.screws];
    const caseMaterial = s.material(a.casing === 'gold' ? '#e3b74a' : a.casing === 'holder' ? '#c39a45' : '#c9ced2', { metalness: 0.65, roughness: mix(0.18, 0.5, mood.wear), side: THREE.DoubleSide });

    // The main plate.
    const PR = 7.4;
    const plate = new THREE.Shape();
    plate.absarc(0, 0, PR, 0, Math.PI * 2, false);
    slab(s, plate, lift, plateMaterial, 0, 0.05);
    // Sinks cut under the wheels read as darker pools in the plate.
    const sink = s.material(new THREE.Color(look.plate).multiplyScalar(0.72), { metalness: 0.4, roughness: 0.6 });
    const pool = (x: number, z: number, radius: number) => s.cylinder(radius, radius, 0.02, [x, lift + 0.005, z], sink, 36);

    // Wheels. Each returns its group so the going train can turn.
    const wheel = (x: number, z: number, radius: number, y: number, material: THREE.Material, spokes = 5, pinion = true) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      s.root.add(group);
      const shape = gearShape(radius, radius - Math.min(0.14, radius * 0.1), Math.max(10, Math.round(radius * 24)), 0, 0.22);
      shape.holes.push(circleHole(0.07));
      crossings(shape, radius * 0.22, radius * 0.78, spokes, 0.26);
      group.add(slab(s, shape, 0.1, material, 0, 0.02));
      const arbor = s.cylinder(0.07, 0.07, 0.9, [0, 0, 0], steel, 8);
      arbor.position.set(0, 0.05, 0);
      group.add(arbor);
      if (pinion) {
        const leaf = slab(s, gearShape(0.26, 0.15, 8, 0, 0.2), 0.28, steel, 0, 0.01);
        leaf.position.y = 0.12;
        group.add(leaf);
      }
      pool(x, z, radius + 0.18);
      return group;
    };
    const trainGold = a.finish === 'gilt' ? s.material('#c9903a', { metalness: 0.6, roughness: dull }) : gold;
    const centre = wheel(0, -0.7, 2.1, lift + 0.42, trainGold, 4);
    const third = wheel(2.7, -1.5, 1.55, lift + 0.6, trainGold);
    const fourth = wheel(-1.5, 0.5, 1.4, lift + 0.3, trainGold);
    const escape = wheel(-2.7, 2.2, 0.82, lift + 0.5, rusted ? steel : s.material('#cdd2d6', { metalness: 0.7, roughness: dull }), 4, false);

    // Bridges: raised terraces across the back, on which the upper pivots are jewelled.
    const barrelBridge = new THREE.Shape();
    barrelBridge.absarc(0, 0, PR - 0.35, 1.72, 3.5, false);
    barrelBridge.quadraticCurveTo(-4.4, -1.0, -3.1, -0.2);
    barrelBridge.quadraticCurveTo(-1.6, 0.9, -1.2, 2.6);
    barrelBridge.quadraticCurveTo(-0.9, 4.8, -1.05, 6.9);
    const trainBridge = new THREE.Shape();
    trainBridge.absarc(0, 0, PR - 0.35, 0.3, 1.6, false);
    trainBridge.quadraticCurveTo(-0.6, 4.6, 0.2, 2.6);
    trainBridge.quadraticCurveTo(0.9, 1.2, 2.6, 1.0);
    trainBridge.quadraticCurveTo(4.6, 0.9, 5.2, 0.4);
    trainBridge.quadraticCurveTo(6.2, 0.6, 6.73, 2.08);
    const barrel = slab(s, barrelBridge, 0.95, bridgeMaterial, lift, 0.07);
    const train = slab(s, trainBridge, 0.95, bridgeMaterial, lift, 0.07);
    const bridgeScrews: THREE.Object3D[] = [];
    for (const [x, z, owner] of [[-5.9, -3.2, 0], [-2.2, -6.2, 0], [-2.1, -1.4, 0], [1.2, -6.4, 1], [5.6, -3.6, 1], [4.6, -1.3, 1]] as const) {
      s.cylinder(0.5, 0.5, 0.04, [x, terrace + 0.01, z], gold, 20);
      const head = screw(s, [x, terrace, z], 0.36, screwMaterial, random() * 3);
      if (owner === 1) bridgeScrews.push(head);
    }

    // Winding wheels on top of the barrel bridge.
    const ratchet = gearShape(1.95, 1.75, 44, 0.12, 0.12);
    ratchet.holes.push(circleHole(0.3));
    const ratchetWheel = slab(s, ratchet, 0.14, steel, terrace + 0.03, 0.02);
    ratchetWheel.position.set(-3.7, terrace + 0.03, -3.9);
    screw(s, [-3.7, terrace + 0.17, -3.9], 0.42, screwMaterial, random() * 3);
    const crownWheel = slab(s, gearShape(1.05, 0.88, 24, 0, 0.2), 0.14, steel, 0, 0.02);
    crownWheel.position.set(-5.9, terrace + 0.03, -1.55);
    s.cylinder(0.5, 0.5, 0.1, [-5.9, terrace + 0.2, -1.55], steel, 20);
    for (const side of [-1, 1]) screw(s, [-5.9 + side * 0.24, terrace + 0.25, -1.55], 0.13, screwMaterial, random() * 3);
    // The click that stops the ratchet running back.
    const click = s.box([1.5, 0.12, 0.34], [-1.75, terrace + 0.09, -3.0], steel);
    click.rotation.y = 0.5;
    screw(s, [-1.3, terrace + 0.15, -2.75], 0.2, screwMaterial, random() * 3);

    // Jewels in gold chatons over each pivot.
    const pivots: [number, number, number][] = [
      [0, -0.7, terrace], [2.7, -1.5, terrace], [-3.7, -6.2, terrace], [5.9, -1.7, terrace], [2.2, -4.6, terrace], [-0.6, -5.4, terrace], [-4.9, -5.3, terrace],
      [-1.5, 0.5, lift], [-2.7, 2.2, lift], [0.9, -3.2, terrace], [-5.2, -4.0, terrace], [4.2, -5.2, terrace],
    ];
    const jewelCount = Math.round(mix(3, pivots.length, a.jewels));
    const fat = a.finish === 'german' ? 1.35 : 1;
    pivots.slice(0, jewelCount).forEach(([x, z, y], index) => {
      if (index === 0 || y === lift) return;
      s.cylinder(0.36 * fat, 0.4 * fat, 0.06, [x, y + 0.03, z], gold, 20);
      s.ball([0.21, 0.1, 0.21], [x, y + 0.06, z], ruby, 12);
    });
    // The centre arbor comes up through the bridge.
    s.cylinder(0.3, 0.34, 0.1, [0, terrace + 0.05, -0.7], gold, 18);
    s.ball([0.18, 0.09, 0.18], [0, terrace + 0.1, -0.7], ruby, 12);

    // Engraving on the train bridge.
    const words = {
      jewels: `${[7, 15, 17, 21, 25][Math.round(a.jewels * 4)]} JEWELS · SWISS MADE`,
      adjusted: 'ADJUSTED 5 POSITIONS',
      number: `No ${100000 + Math.floor(random() * 899999)}`,
      private: `${'ABEHJKMRW'[Math.floor(random() * 9)]}. ${['Weiss', 'Lund', 'Moreau', 'Okafor', 'Haas'][Math.floor(random() * 5)]} ${1921 + Math.floor(random() * 60)}`,
      nothing: '',
    }[a.words];
    if (words) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 80;
      const ctx = canvas.getContext('2d')!;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = a.words === 'private' ? 'italic 44px cursive' : 'bold 44px serif';
      const ink = a.finish === 'dark' ? '#e9d9a0' : '#3a2c12';
      ctx.fillStyle = ink;
      ctx.fillText(words, 256, 42, 500);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const length = a.words === 'private' ? 3.0 : 4.8;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(length, length * 0.156), new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.35, roughness: 0.6 }));
      sign.rotation.set(-Math.PI / 2, 0, a.words === 'private' ? 0.35 : -0.18);
      sign.position.set(a.words === 'private' ? 5.3 : 2.5, terrace + 0.012, a.words === 'private' ? -1.9 : -5.9);
      s.root.add(sign);
    }

    // The escapement and balance, front left: the part that moves.
    const fork = new THREE.Group();
    fork.position.set(-3.75, lift + 0.56, 1.75);
    const forkBar = s.box([1.9, 0.08, 0.16], [0, 0, 0], steel);
    forkBar.position.set(0, 0, 0);
    const anchor = s.box([0.16, 0.08, 1.2], [0, 0, 0], steel);
    anchor.position.set(0.85, 0, 0);
    fork.add(forkBar, anchor);
    for (const side of [-1, 1]) {
      const stone = s.box([0.3, 0.14, 0.12], [0, 0, 0], ruby);
      stone.position.set(0.98, 0, side * 0.55);
      fork.add(stone);
    }
    fork.rotation.y = 0.35;
    s.root.add(fork);

    const BX = -4.75, BZ = 0.75, BR = 1.85;
    pool(BX, BZ, BR + 0.25);
    const balance = new THREE.Group();
    balance.position.set(BX, lift + 0.6, BZ);
    s.root.add(balance);
    const rim = new THREE.Shape();
    rim.absarc(0, 0, BR, 0, Math.PI * 2, false);
    crossings(rim, 0.3, BR - 0.3, 3, 0.22);
    balance.add(slab(s, rim, 0.2, gold, 0, 0.03));
    const timing = [];
    for (let i = 0; i < 14; i++) timing.push({ at: [Math.cos((i / 14) * 6.283) * (BR + 0.07), 0.1, Math.sin((i / 14) * 6.283) * (BR + 0.07)] as [number, number, number], size: 1 });
    balance.add(s.scatter(new THREE.SphereGeometry(0.1, 8, 6), gold, timing));
    const staff = s.cylinder(0.06, 0.06, 1.3, [0, 0, 0], steel, 8);
    staff.position.set(0, 0.25, 0);
    balance.add(staff);
    const springMaterial = s.material(rusted ? '#8a4a26' : '#2c5fe0', { metalness: 0.5, roughness: 0.3, emissive: rusted ? '#2a1206' : '#12338f', emissiveIntensity: 0.55 });
    const hairspring = ribbon(s, spiral(8, 0.22, BR - 0.6, lift + 0.95, undefined, 0, random() * 6), 0.035, 0.12, springMaterial);
    hairspring.position.set(BX, 0, BZ);
    // The balance cock reaches in from the rim.
    const cock = new THREE.Shape();
    cock.moveTo(0.45, 0);
    cock.quadraticCurveTo(0.45, 0.5, 0, 0.5);
    cock.lineTo(-1.3, 0.42);
    cock.quadraticCurveTo(-1.6, 1.3, -2.45, 1.0);
    cock.lineTo(-2.45, -1.0);
    cock.quadraticCurveTo(-1.6, -1.3, -1.3, -0.42);
    cock.lineTo(0, -0.5);
    cock.quadraticCurveTo(0.45, -0.5, 0.45, 0);
    const cockTop = slab(s, cock, 0.3, bridgeMaterial, 0, 0.04);
    cockTop.position.set(BX, terrace + 0.1, BZ);
    const foot = new THREE.Shape();
    foot.moveTo(-1.45, 0.62);
    foot.quadraticCurveTo(-1.7, 1.25, -2.45, 1.0);
    foot.lineTo(-2.45, -1.0);
    foot.quadraticCurveTo(-1.7, -1.25, -1.45, -0.62);
    foot.closePath();
    const cockFoot = slab(s, foot, terrace + 0.1 - lift, bridgeMaterial, 0, 0.03);
    cockFoot.position.set(BX, lift, BZ);
    screw(s, [BX - 1.95, terrace + 0.4, BZ], 0.3, screwMaterial, random() * 3);
    s.cylinder(0.3, 0.3, 0.06, [BX, terrace + 0.43, BZ], gold, 18);
    s.ball([0.17, 0.09, 0.17], [BX, terrace + 0.46, BZ], ruby, 12);
    // Regulator pointer.
    const pointer = s.box([1.5, 0.05, 0.1], [BX - 0.55, terrace + 0.47, BZ + 0.1], steel);
    pointer.rotation.y = (random() - 0.5) * 0.5;

    // The case wall, open toward the viewer, or a bare holder ring.
    if (a.casing === 'holder') {
      s.lathe([[PR + 0.05, 0], [PR + 0.05, 0.3], [PR + 0.35, 0.55], [PR + 0.9, 0.55], [PR + 1.05, 0.3], [PR + 1.05, 0]], caseMaterial);
      for (const angle of [0.9, 2.9, 5.0]) s.cylinder(0.24, 0.24, 0.5, [Math.cos(angle) * (PR + 0.62), 0.6, Math.sin(angle) * (PR + 0.62)], steel, 10);
    } else {
      const profile = [[PR + 0.08, 0], [PR + 0.08, lift + 0.1], [PR + 0.32, lift + 0.1], [PR + 0.32, 1.7], [PR + 0.25, 1.8], [PR + 0.32, 1.9], [PR + 0.25, 2.0], [PR + 0.32, 2.1], [PR + 0.25, 2.2], [PR + 0.32, 2.3], [PR + 0.32, 2.5], [PR + 0.55, 2.7], [PR + 1.05, 2.7], [PR + 1.3, 2.4], [PR + 1.45, 1.3], [PR + 1.2, 0]];
      const from = 1.45, sweep = 4.1;
      const wall = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 56, from, sweep), caseMaterial);
      wall.receiveShadow = true;
      // Close the two cut ends so the section of the case shows as solid metal.
      for (const angle of [from, from + sweep]) {
        const section = new THREE.Shape();
        profile.forEach(([x, y], index) => (index === 0 ? section.moveTo(x, y) : section.lineTo(x, y)));
        section.closePath();
        const cap = s.mesh(new THREE.ShapeGeometry(section), caseMaterial);
        cap.rotation.y = angle - Math.PI / 2;
      }
      // Lugs at the back, and the crown on its stem coming in from the side.
      for (const side of [-1, 1]) {
        const lug = s.box([1.25, 1.5, 2.3], [side * 4.2, 1.15, -(PR + 1.55)], caseMaterial);
        lug.rotation.x = 0.25;
        lug.rotation.y = side * -0.12;
      }
      const stemZ = -0.9;
      const crown = slab(s, gearShape(1.0, 0.86, 26, 0, 0.25), 1.15, caseMaterial, 0, 0.06);
      crown.rotation.z = -Math.PI / 2;
      crown.position.set(PR + 1.55, 1.15, stemZ);
      s.rod([PR + 1.6, 1.15, stemZ], [6.25, lift + 0.5, stemZ], 0.12, steel);
      s.cylinder(0.42, 0.42, 0.35, [6.3, lift + 0.5, stemZ], steel, 12).rotation.z = Math.PI / 2;
    }

    // Keyless works by the stem: the setting lever and its springs.
    const lever = s.box([1.6, 0.1, 0.34], [5.6, lift + 0.06, -0.15], steel);
    lever.rotation.y = 0.5;
    const yoke = s.box([2.0, 0.1, 0.22], [5.9, lift + 0.06, 2.3], steel);
    yoke.rotation.y = -1.0;
    screw(s, [6.3, lift, 0.35], 0.2, screwMaterial, random() * 3);
    // Empty threaded holes and steady pins, as on any plate.
    const hole = s.material(new THREE.Color(look.plate).multiplyScalar(0.3), { roughness: 0.9 });
    for (const [x, z] of [[-0.6, 6.4], [2.2, 6.3], [-4.4, 4.9], [6.5, 2.6], [-6.4, 3.0], [0.3, 1.9], [3.4, 2.0]]) s.cylinder(0.13, 0.13, 0.02, [x, lift + 0.011, z], hole, 10);
    // An engraved ring just inside the edge of the plate.
    s.mesh(new THREE.TorusGeometry(PR - 0.32, 0.03, 4, 96), hole, [0, lift + 0.005, 0]).rotation.x = Math.PI / 2;

    // Story.
    if (a.state === 'service') {
      // The train bridge is up on one side, its screws lying where they were put down.
      train.rotation.z = 0.09;
      train.position.y += 0.55;
      for (const head of bridgeScrews) {
        head.position.set(5.6 + (random() - 0.5) * 1.4, lift + 0.36, 2.6 + (random() - 0.5) * 1.6);
        head.rotation.z = Math.PI / 2;
        head.rotation.y = random() * 6;
      }
      const brassTool = s.material('#8fa3b4', { metalness: 0.6, roughness: 0.35 });
      const tweezers = new THREE.Group();
      for (const side of [-1, 1]) {
        const leg = s.box([7.4, 0.1, 0.34], [0, 0, 0], brassTool);
        leg.position.set(0, 0, side * 0.2);
        leg.rotation.y = side * 0.045;
        tweezers.add(leg);
      }
      tweezers.position.set(-2.2, terrace + 0.75, -5.4);
      tweezers.rotation.set(0, 0.5, -0.06);
      s.root.add(tweezers);
    }
    if (rusted) {
      const rust = s.material('#ffffff', { roughness: 1 });
      const stain = s.material('#6f6a4a', { roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
      const blooms = [], tide = [];
      for (let i = 0; i < 70; i++) {
        const angle = random() * 6.3, radius = Math.sqrt(random()) * (PR - 0.4);
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        blooms.push({ at: [x, (z < -0.4 ? terrace : lift) + 0.02, z] as [number, number, number], size: 0.06 + random() * 0.24, color: random() < 0.5 ? '#b5682a' : '#8a4a1c' });
      }
      for (let i = 0; i < 26; i++) {
        const angle = 0.2 + random() * 2.2, radius = 3 + random() * 3.8;
        tide.push({ at: [Math.cos(angle) * radius, lift + 0.03, Math.sin(angle) * radius] as [number, number, number], size: 0.5 + random() * 0.9 });
      }
      const flake = new THREE.SphereGeometry(1, 7, 5);
      flake.scale(1, 0.18, 1);
      s.scatter(flake, rust, blooms);
      const pools = s.scatter(new THREE.CylinderGeometry(1, 1, 0.01, 14), stain, tide);
      pools.castShadow = false;
    }
    // Dust, filings and a stray screw or two as the place fills up.
    const strays = Math.round(mood.density * 5 + mood.wear * 3);
    for (let i = 0; i < strays; i++) {
      const angle = 0.3 + random() * 2.2, radius = 2.2 + random() * 4.6;
      const loose = screw(s, [Math.cos(angle) * radius, lift + 0.2, Math.sin(angle) * radius], 0.2, screwMaterial, random() * 3);
      loose.rotation.z = Math.PI / 2;
      loose.rotation.y = random() * 6;
    }
    if (mood.wear > 0.3) {
      const specks = [];
      for (let i = 0; i < mood.wear * 90; i++) {
        const angle = random() * 6.3, radius = Math.sqrt(random()) * (PR - 0.2);
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        specks.push({ at: [x, (z < -0.4 ? terrace : lift) + 0.02, z] as [number, number, number], size: 0.02 + random() * 0.05 });
      }
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#5a5142', { roughness: 1 }), specks);
    }
    void barrel;

    // The tick.
    const running = a.state === 'running';
    const beat = mix(1.3, 0.2, mood.energy), swing = mix(0.7, 2.2, mood.energy);
    const escapeStep = (Math.PI * 2) / 20;
    const rest = (random() - 0.5) * 1.5;
    balance.rotation.y = rest;
    const starts = [centre, third, fourth, escape].map((group) => (group.rotation.y = random() * 6));
    return {
      ...world,
      update: running
        ? (_dt: number, time: number) => {
            const phase = time / beat, count = Math.floor(phase);
            const snap = Math.min(1, (phase - count) / 0.3), eased = snap * snap * (3 - 2 * snap);
            const stepped = (count + eased) * escapeStep * 0.5;
            balance.rotation.y = rest + Math.sin(phase * Math.PI) * swing;
            const breath = 1 - Math.sin(phase * Math.PI) * 0.06;
            hairspring.scale.set(breath, 1, breath);
            hairspring.position.set(BX, 0, BZ);
            escape.rotation.y = starts[3] - stepped;
            fourth.rotation.y = starts[2] + stepped * 0.12;
            third.rotation.y = starts[1] - stepped * 0.016;
            centre.rotation.y = starts[0] + stepped * 0.002;
            const from = count % 2 === 0 ? 0.2 : 0.5;
            fork.rotation.y = from + (0.7 - from * 2) * eased;
          }
        : undefined,
    };
  },
});
