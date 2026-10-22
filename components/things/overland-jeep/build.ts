import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds, disposeTree } from '@conjure/kit';

const BODIES = {
  wagon: { length: 4.7, wheel: 1.42, cabRear: -2.35, roof: 1.86 },
  short: { length: 3.8, wheel: 1.08, cabRear: -1.9, roof: 1.84 },
  pickup: { length: 5.0, wheel: 1.58, cabRear: -0.55, roof: 1.8 },
  troopy: { length: 4.9, wheel: 1.5, cabRear: -2.45, roof: 2.12 },
} as const;

function saltTexture(random: () => number, amount: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 128);
  const gradient = ctx.createLinearGradient(0, 128, 0, 0);
  gradient.addColorStop(0, `rgba(240,238,230,${0.55 + amount * 0.4})`);
  gradient.addColorStop(0.35, `rgba(240,238,230,${0.25 + amount * 0.4})`);
  gradient.addColorStop(1, 'rgba(240,238,230,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(244,242,234,0.85)';
  for (let i = 0; i < 900 + amount * 1600; i++) {
    const y = 128 - Math.pow(random(), 1.8) * 128;
    ctx.beginPath();
    ctx.arc(random() * 512, y, 0.8 + random() * 2.6, 0, 6.3);
    ctx.fill();
  }
  // Rooster tails thrown up behind the wheels.
  for (const x of [110, 400]) for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(x + (random() - 0.5) * 120, 128 - random() * 110, 2 + random() * 5, 0, 6.3);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    body: choice('What kind of 4x4 is it?', {
      wagon: 'A long five-door station wagon, the classic tour-company land cruiser.',
      short: 'A short stubby two-door, almost as tall as it is long.',
      pickup: 'A crew-cab pickup with an open tray of cargo behind.',
      troopy: 'A high-roofed troop carrier, slab-sided like a small bus.',
    }),
    paint: choice('What colour is the paint under the salt?', {
      white: 'Fleet white.',
      sand: 'Desert beige.',
      red: 'Sun-faded red.',
      green: 'Dark expedition green.',
      blue: 'Pale blue with a white roof.',
      yellow: 'Mustard yellow.',
    }),
    state: choice('What is happening to it?', {
      parked: 'Simply parked, doors shut, engine ticking as it cools.',
      doors: 'Stopped with all the doors flung open, a folding table and stools set out beside it.',
      bogged: 'Bogged to the axle on a tilt, a shovel and boards by the sunken wheel.',
      breakdown: 'Broken down: bonnet up, one wheel off and lying on the ground, tools spread out.',
      abandoned: 'Abandoned long ago: tyres flat, glass gone, crusted white.',
    }),
    load: score('How much is on the roof rack or tray?', ['A bare rack', 'A few cans and a spare', 'A full expedition load', 'Stacked absurdly high']),
    cargo: choice('If it is loaded, mostly with what?', {
      fuel: 'Rows of jerrycans, red and green and yellow.',
      expedition: 'A tarped bundle, barrels, a spare wheel and crates lashed down.',
      tourist: 'A heap of bright backpacks and duffels under a cargo net.',
      market: 'Woven sacks, gas bottles and a bicycle on top.',
    }),
    spare: choice('Where is the spare wheel?', {
      rear: 'Hung on the rear door.',
      roof: 'Lying flat on the roof rack.',
      bonnet: 'Bolted on the bonnet.',
      missing: 'There is none: it has already been used.',
    }),
    front: choice('What is fitted to the front?', {
      bullbar: 'A tubular bull bar with a winch and two spotlights.',
      snorkel: 'A raised air snorkel up the windscreen pillar and a plain bumper.',
      lightbar: 'A row of roof-mounted spotlights above the windscreen.',
      plain: 'Nothing extra: a plain steel bumper.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const spec = BODIES[a.body];
    const wear = mood.wear;
    const abandoned = a.state === 'abandoned', bogged = a.state === 'bogged', breakdown = a.state === 'breakdown';
    const W = 1.7, half = W / 2 + 0.05, front = spec.length / 2, rear = -spec.length / 2;
    const colour = new THREE.Color({ white: '#e6e3d8', sand: '#c8b288', red: '#b33a2d', green: '#3c5741', blue: '#5c93b6', yellow: '#d6a11e' }[a.paint]);
    colour.lerp(new THREE.Color('#b8b0a2'), wear * 0.3 + (abandoned ? 0.25 : 0));
    const mat = (c: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra });
    const paint = mat(colour, { metalness: 0.25, roughness: mix(0.38, 0.85, wear) });
    const roofPaint = a.paint === 'blue' ? mat('#e6e3d8', { roughness: 0.6 }) : paint;
    const trim = mat('#23262a', { roughness: 0.7 });
    const steel = mat('#7d858a', { metalness: 0.6, roughness: 0.45 });
    const rubber = mat('#1c1c1e', { roughness: 0.95 });
    const hubPaint = mat(abandoned ? '#b9b3a6' : '#d9d6cc', { metalness: 0.3 });
    const glass = mat(abandoned ? '#0b0c0d' : '#2c3a44', { roughness: abandoned ? 1 : 0.15, metalness: abandoned ? 0 : 0.6 });
    const interior = mat('#101214', { roughness: 1 });
    const salt = mat('#efece3', { roughness: 1 });
    const lit = mood.daylight < 0.2 || mood.daylight > 0.82;
    const car = new Sculpture(context);

    // Body: one side profile extruded across the width.
    const sill = 0.5, belt = 1.14, roofY = spec.roof;
    const profile = new THREE.Shape();
    const arch = (zc: number) => { for (let i = 0; i <= 10; i++) { const t = Math.PI * (i / 10); profile.lineTo(zc + Math.cos(t) * 0.53, sill - 0.02 + Math.sin(t) * 0.5); } };
    profile.moveTo(front, sill);
    arch(spec.wheel);
    arch(-spec.wheel);
    profile.lineTo(rear, sill);
    if (a.body === 'pickup') {
      profile.lineTo(rear, belt + 0.02);
      profile.lineTo(spec.cabRear, belt + 0.02);
      profile.lineTo(spec.cabRear, roofY - 0.05);
    } else profile.lineTo(rear, roofY - 0.06);
    profile.lineTo(a.body === 'pickup' ? spec.cabRear + 0.08 : rear + 0.08, roofY);
    const screenTop = front - 1.75, screenBase = front - 1.32;
    profile.lineTo(screenTop, roofY);
    profile.lineTo(screenBase, belt + 0.06);
    profile.lineTo(front - 0.1, belt - 0.04);
    profile.lineTo(front, belt - 0.2);
    profile.closePath();
    const shell = car.mesh(new THREE.ExtrudeGeometry(profile, { depth: W, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 2 }).rotateY(-Math.PI / 2).translate(W / 2, 0, 0), paint);
    void shell;
    if (a.paint === 'blue') car.box([W + 0.06, 0.05, screenTop - (a.body === 'pickup' ? spec.cabRear : rear) - 0.1], [0, roofY + 0.012, (screenTop + (a.body === 'pickup' ? spec.cabRear : rear)) / 2], roofPaint);
    // Chassis rails, bumpers.
    car.box([1.0, 0.16, spec.length - 0.5], [0, 0.42, 0], trim);
    car.box([W + 0.14, 0.17, 0.16], [0, 0.56, front + 0.08], a.front === 'plain' ? steel : trim);
    car.box([W + 0.1, 0.15, 0.14], [0, 0.56, rear - 0.06], trim);
    // Grille, lamps.
    car.box([0.9, 0.3, 0.04], [0, belt - 0.33, front + 0.04], trim);
    for (let i = 0; i < 5; i++) car.box([0.86, 0.018, 0.02], [0, belt - 0.44 + i * 0.055, front + 0.065], steel);
    const lamp = mat('#f4efd8', { emissive: '#ffe9a8', emissiveIntensity: lit && !abandoned && !breakdown ? 1.6 : 0.05, roughness: 0.3 });
    for (const side of [-1, 1]) {
      if (abandoned && side === 1) car.cylinder(0.11, 0.11, 0.04, [side * 0.63, belt - 0.33, front + 0.035], interior, 14).rotation.x = Math.PI / 2;
      else car.cylinder(0.11, 0.11, 0.05, [side * 0.63, belt - 0.33, front + 0.04], lamp, 14).rotation.x = Math.PI / 2;
      car.box([0.1, 0.06, 0.04], [side * 0.63, belt - 0.5, front + 0.04], mat('#e8892b'));
      car.box([0.12, 0.24, 0.04], [side * (W / 2 - 0.08), belt - 0.25, rear - 0.045], mat('#b5261e', { emissive: '#ff2a1a', emissiveIntensity: lit && !abandoned ? 0.7 : 0 }));
    }
    // Glazing: windscreen, side windows between pillars, rear window.
    const screen = car.box([W - 0.2, Math.hypot(screenBase - screenTop, roofY - belt) - 0.2, 0.03], [0, (roofY + belt) / 2 + 0.02, (screenTop + screenBase) / 2 + 0.035], glass);
    screen.rotation.x = -Math.atan2(screenBase - screenTop, roofY - belt - 0.06);
    const cabRear = a.body === 'pickup' ? spec.cabRear : rear;
    const winTop = roofY - 0.13, winBottom = belt + 0.1;
    const frontDoorRear = screenBase - 1.02, bayEnd = cabRear + 0.14;
    const bays: [number, number][] = [];
    if (a.body === 'short') bays.push([bayEnd, frontDoorRear - 0.1]);
    else if (a.body === 'pickup') bays.push([bayEnd, frontDoorRear - 0.08]);
    else { const midDoor = frontDoorRear - 0.95; bays.push([midDoor + 0.05, frontDoorRear - 0.07], [bayEnd, midDoor - 0.07]); }
    for (const side of [-1, 1]) for (const [z0, z1] of bays) {
      if (abandoned && random() < 0.5) car.box([0.02, winTop - winBottom, z1 - z0], [side * (half + 0.004), (winTop + winBottom) / 2, (z0 + z1) / 2], interior);
      else car.box([0.025, winTop - winBottom, z1 - z0], [side * (half + 0.006), (winTop + winBottom) / 2, (z0 + z1) / 2], glass);
    }
    car.box([W - 0.3, winTop - winBottom - 0.05, 0.03], [0, (winTop + winBottom) / 2, cabRear - 0.035], glass);

    // Front doors: a dark opening behind, and a leaf that can swing.
    const doorOpen = a.state === 'doors' ? 1 : breakdown ? 0.55 : abandoned ? 0.3 : 0;
    const doorLength = 0.98, hingeZ = screenBase - 0.04;
    for (const side of [-1, 1]) {
      const open = doorOpen * (side === 1 || a.state === 'doors' ? mix(0.8, 1.25, random()) : 0);
      if (open > 0) car.box([0.02, roofY - sill - 0.18, doorLength - 0.06], [side * (half + 0.002), (roofY + sill) / 2, hingeZ - doorLength / 2], interior);
      const door = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.045, belt - sill + 0.02, doorLength - 0.03), paint);
      leaf.position.set(0, (belt + sill) / 2 + 0.04, -doorLength / 2);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.035, winTop - winBottom + 0.14, doorLength - 0.03), paint);
      frame.position.set(0, (winTop + winBottom) / 2, -doorLength / 2);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.045, winTop - winBottom, doorLength - 0.2), glass);
      pane.position.copy(frame.position);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.13), trim);
      handle.position.set(0, belt - 0.08, -doorLength + 0.14);
      door.add(leaf, frame, pane, handle);
      door.traverse((node) => { node.castShadow = true; });
      door.position.set(side * (half + 0.01), 0, hingeZ);
      door.rotation.y = -side * open;
      car.root.add(door);
      // Rear doors on the long bodies open too.
      if (a.state === 'doors' && (a.body === 'wagon' || a.body === 'troopy')) {
        car.box([0.02, roofY - sill - 0.18, 0.86], [side * (half + 0.002), (roofY + sill) / 2, hingeZ - doorLength - 0.47], interior);
        const back = door.clone();
        back.scale.z = 0.9;
        back.position.z = hingeZ - doorLength - 0.02;
        back.rotation.y = -side * mix(0.7, 1.2, random());
        car.root.add(back);
      }
      // Mirrors and door seam shadow.
      car.box([0.14, 0.11, 0.05], [side * (half + 0.1), belt + 0.16, screenBase - 0.02], trim);
      car.box([0.012, belt - sill, 0.015], [side * (half + 0.012), (belt + sill) / 2 + 0.04, hingeZ - doorLength], trim);
    }

    // Bonnet: closed panel line, or propped up over a dark engine bay.
    {
      const length = front - 0.12 - screenBase - 0.04;
      const hood = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.035, length), paint);
      panel.position.set(0, 0, length / 2);
      panel.castShadow = true;
      hood.add(panel);
      hood.position.set(0, belt + 0.062, screenBase + 0.03);
      hood.rotation.x = 0.077;
      if (breakdown) {
        hood.rotation.x = -mix(0.85, 1.05, random());
        car.box([W - 0.2, 0.03, length - 0.1], [0, belt + 0.03, screenBase + length / 2 + 0.05], interior);
        car.box([0.6, 0.22, 0.5], [0, belt + 0.02, screenBase + length / 2], steel);
        car.rod([W / 2 - 0.15, belt, front - 0.25], [W / 2 - 0.15, belt + 0.85, front - 0.75], 0.012, steel);
      }
      car.root.add(hood);
    }

    // Wheels.
    const wheelR = 0.42, flat = abandoned ? 0.78 : 1;
    const offWheel = breakdown ? { side: -1, end: 1 } : abandoned && random() < 0.6 ? { side: 1, end: -1 } : null;
    const tyreGeometry = new THREE.CylinderGeometry(wheelR, wheelR, 0.27, 20).rotateZ(Math.PI / 2);
    const hubGeometry = new THREE.CylinderGeometry(wheelR * 0.56, wheelR * 0.56, 0.29, 14).rotateZ(Math.PI / 2);
    const capGeometry = new THREE.CylinderGeometry(wheelR * 0.2, wheelR * 0.2, 0.33, 8).rotateZ(Math.PI / 2);
    const wheel = (x: number, y: number, z: number, lying = false, target: THREE.Object3D = car.root) => {
      const group = new THREE.Group();
      const tyre = new THREE.Mesh(tyreGeometry, rubber), hub = new THREE.Mesh(hubGeometry, hubPaint), cap = new THREE.Mesh(capGeometry, steel);
      group.add(tyre, hub, cap);
      for (let i = 0; i < 2; i++) {
        const tread = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.03, 5, 16).rotateY(Math.PI / 2), rubber);
        tread.position.x = (i - 0.5) * 0.2;
        group.add(tread);
      }
      group.traverse((node) => { node.castShadow = true; });
      group.position.set(x, y, z);
      if (lying) group.rotation.z = Math.PI / 2;
      target.add(group);
      return group;
    };
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      if (offWheel && offWheel.side === side && offWheel.end === end) {
        // On a jack or a pile of blocks instead.
        car.box([0.2, 0.34, 0.2], [side * 0.6, 0.17, end * spec.wheel], abandoned ? mat('#9a9388') : steel);
        car.cylinder(0.13, 0.13, 0.06, [side * 0.8, wheelR, end * spec.wheel], steel, 10).rotation.z = Math.PI / 2;
        continue;
      }
      const w = wheel(side * 0.8, wheelR * flat, end * spec.wheel);
      w.scale.y = flat;
      if (end === 1 && a.state !== 'parked') w.rotation.y = (bogged ? 0.45 : 0.2) * (random() < 0.5 ? 1 : -1);
      // Mud flaps.
      car.box([0.3, 0.3, 0.02], [side * 0.8, 0.36, end * spec.wheel - 0.55], rubber);
    }

    // Front fittings.
    if (a.front === 'bullbar') {
      const z = front + 0.26;
      car.tube([[-0.8, 0.5, z - 0.1], [-0.62, 0.6, z], [-0.6, 1.08, z], [-0.3, 1.14, z], [0.3, 1.14, z], [0.6, 1.08, z], [0.62, 0.6, z], [0.8, 0.5, z - 0.1]], 0.035, trim);
      car.rod([-0.6, 0.85, z], [0.6, 0.85, z], 0.03, trim);
      car.box([0.36, 0.18, 0.2], [0, 0.6, z - 0.02], steel);
      for (const side of [-1, 1]) car.cylinder(0.09, 0.09, 0.07, [side * 0.28, 1.25, z], lamp, 12).rotation.x = Math.PI / 2;
    } else if (a.front === 'snorkel') {
      const x = half + 0.07;
      car.tube([[x, belt - 0.1, screenBase + 0.5], [x, belt + 0.02, screenBase + 0.12], [x, roofY - 0.1, screenTop + 0.12], [x, roofY + 0.22, screenTop + 0.1]], 0.045, trim);
      car.box([0.12, 0.14, 0.16], [x, roofY + 0.28, screenTop + 0.13], trim);
    } else if (a.front === 'lightbar') {
      car.rod([-0.6, roofY + 0.1, screenTop + 0.08], [0.6, roofY + 0.1, screenTop + 0.08], 0.02, trim);
      for (let i = 0; i < 4; i++) car.cylinder(0.085, 0.085, 0.07, [-0.45 + i * 0.3, roofY + 0.16, screenTop + 0.1], lamp, 12).rotation.x = Math.PI / 2;
    }
    // Whip antenna with a pennant.
    car.rod([-half + 0.1, belt + 0.05, screenBase + 0.3], [-half + 0.02, belt + 1.75, screenBase + 0.15], 0.008, trim, 0.004);
    car.box([0.01, 0.1, 0.2], [-half + 0.03, belt + 1.62, screenBase + 0.05], mat(mood.cheer > 0.5 ? '#e8452e' : '#d9d2c0', { side: THREE.DoubleSide }));

    // Spare wheel.
    if (a.spare === 'rear') { wheel(0.22, 1.05, rear - 0.24).rotation.y = Math.PI / 2; }
    else if (a.spare === 'bonnet' && !breakdown) { const sp = wheel(0, belt + 0.2, (screenBase + front) / 2 + 0.05, true); sp.rotation.x = 0.08; sp.scale.setScalar(0.9); }

    // Rack and cargo.
    const zone = a.body === 'pickup' ? { z0: rear + 0.15, z1: spec.cabRear - 0.12, y: belt + 0.03, w: W - 0.2 } : { z0: rear + 0.25, z1: screenTop - 0.15, y: roofY + 0.14, w: W - 0.25 };
    if (a.body !== 'pickup') {
      const y = zone.y - 0.03, x = zone.w / 2 + 0.05;
      for (const side of [-1, 1]) car.rod([side * x, y + 0.14, zone.z0], [side * x, y + 0.14, zone.z1], 0.02, trim);
      for (const z of [zone.z0, zone.z1]) car.rod([-x, y + 0.14, z], [x, y + 0.14, z], 0.02, trim);
      for (const side of [-1, 1]) {
        car.rod([side * x, y, zone.z0], [side * x, y, zone.z1], 0.02, trim);
        for (let i = 0; i < 4; i++) { const z = mix(zone.z0, zone.z1, i / 3); car.rod([side * x, y - 0.14, z], [side * x, y + 0.14, z], 0.016, trim); }
      }
      for (let i = 0; i < 6; i++) { const z = mix(zone.z0, zone.z1, i / 5); car.rod([-x, y, z], [x, y, z], 0.014, trim); }
      // Rear ladder.
      for (const dx of [-0.16, 0.16]) car.rod([-0.45 + dx, 0.7, rear - 0.1], [-0.45 + dx, y + 0.1, rear - 0.1], 0.014, trim);
      for (let i = 0; i < 5; i++) car.rod([-0.61, 0.8 + i * 0.25, rear - 0.1], [-0.29, 0.8 + i * 0.25, rear - 0.1], 0.012, trim);
    } else {
      // Tray sides and headboard.
      for (const side of [-1, 1]) car.box([0.05, 0.36, zone.z1 - zone.z0 + 0.2], [side * (W / 2), belt + 0.2, (zone.z0 + zone.z1) / 2], paint);
      car.box([W, 0.36, 0.05], [0, belt + 0.2, rear + 0.03], paint);
      car.tube([[-0.75, belt + 0.02, spec.cabRear - 0.06], [-0.75, roofY + 0.06, spec.cabRear - 0.06], [0.75, roofY + 0.06, spec.cabRear - 0.06], [0.75, belt + 0.02, spec.cabRear - 0.06]], 0.03, trim);
    }
    const canColours = mood.cheer > 0.4 ? ['#b8322a', '#3f6b45', '#d7a81e', '#2f5f9a'] : ['#7c3b33', '#48574a', '#8f8255', '#4a5560'];
    const bagColours = mood.cheer > 0.4 ? ['#e2562f', '#2f8fc2', '#7bbf3a', '#d43d7a', '#f0b429', '#6a4fc2'] : ['#77604f', '#4f6170', '#5d6a4c', '#6e4d5a', '#8a7a4f'];
    const pickOf = (list: string[]) => list[Math.floor(random() * list.length)];
    const jerry = (x: number, y: number, z: number) => {
      const body = car.box([0.16, 0.42, 0.33], [x, y + 0.21, z], mat(pickOf(canColours), { metalness: 0.2 }));
      body.rotation.y = (random() - 0.5) * 0.12;
      car.box([0.08, 0.05, 0.2], [x, y + 0.45, z - 0.02], trim);
      car.cylinder(0.03, 0.03, 0.06, [x, y + 0.45, z + 0.13], steel, 8);
    };
    const amount = Math.min(1, a.load * 0.85 + mood.density * 0.2);
    if (amount > 0.12) {
      let z = zone.z0 + 0.05;
      const end = mix(zone.z0 + 0.7, zone.z1, Math.min(1, amount * 1.5));
      const tiers = amount > 0.75 ? 2 : 1;
      if (a.spare === 'roof') { wheel(0, zone.y + 0.15, z + wheelR, true); z += wheelR * 2 + 0.06; }
      let guard = 0;
      while (z < end - 0.3 && guard++ < 12) {
        const kind = a.cargo === 'fuel' ? (random() < 0.8 ? 'cans' : 'barrel') : a.cargo === 'expedition' ? pickOf(['tarp', 'barrel', 'crate', 'cans', 'tarp']) : a.cargo === 'tourist' ? (random() < 0.85 ? 'bags' : 'cans') : pickOf(['sacks', 'gas', 'sacks', 'crate']);
        if (kind === 'cans') {
          const across = Math.floor(zone.w / 0.2);
          for (let i = 0; i < across; i++) if (random() < 0.9) jerry((i - (across - 1) / 2) * 0.2, zone.y, z + 0.18);
          z += 0.4;
        } else if (kind === 'barrel') {
          for (const x of [-0.36, 0.36]) {
            const drum = car.cylinder(0.27, 0.27, 0.72, [x, zone.y + 0.27, z + 0.38], mat(random() < 0.5 ? '#2f6aa8' : '#9a3b2b', { roughness: 0.5 }), 16);
            drum.rotation.x = Math.PI / 2;
            car.ring(0.275, 0.012, [x, zone.y + 0.27, z + 0.2], trim);
            car.ring(0.275, 0.012, [x, zone.y + 0.27, z + 0.56], trim);
          }
          z += 0.8;
        } else if (kind === 'crate') {
          const h = mix(0.25, 0.4, random());
          car.box([zone.w * mix(0.5, 0.9, random()), h, 0.55], [(random() - 0.5) * 0.2, zone.y + h / 2, z + 0.3], mat('#9b7a4f', { roughness: 0.9 }));
          for (const dz of [0.1, 0.5]) car.box([zone.w * 0.92, 0.02, 0.05], [0, zone.y + h + 0.005, z + dz], trim);
          z += 0.62;
        } else if (kind === 'tarp') {
          const length = mix(0.8, 1.3, random()), h = mix(0.22, 0.34, random()) * tiers;
          car.ball([zone.w / 2, h, length / 2], [0, zone.y + h * 0.7, z + length / 2], mat(pickOf(mood.cheer > 0.4 ? ['#2f6aa8', '#3d7a4c', '#c4712a'] : ['#59605a', '#6a6252']), { roughness: 0.9 }), 14);
          for (const dz of [0.3, 0.7]) car.ring(1, 0.012, [0, zone.y, z + length * dz], mat('#e7dfc9'), Math.PI).scale.set(zone.w / 2 + 0.01, h * 1.72 + 0.01, 1);
          z += length + 0.05;
        } else if (kind === 'bags') {
          for (let tier = 0; tier < tiers + 1; tier++) for (let i = 0; i < 3 - tier; i++) {
            const bag = car.ball([0.2, 0.15, 0.32], [(i - (2 - tier) / 2) * 0.42 + (random() - 0.5) * 0.08, zone.y + 0.14 + tier * 0.24, z + 0.34 + (random() - 0.5) * 0.1], mat(pickOf(bagColours), { roughness: 0.9 }), 10);
            bag.rotation.y = (random() - 0.5) * 0.8;
          }
          z += 0.66;
        } else if (kind === 'sacks') {
          for (let tier = 0; tier < tiers + 1; tier++) for (let i = 0; i < 2; i++) {
            const sack = car.ball([0.3, 0.12, 0.26], [(i - 0.5) * 0.6 + (random() - 0.5) * 0.1, zone.y + 0.12 + tier * 0.2, z + 0.28], mat(pickOf(['#d8cfae', '#c9b98e', '#e3dcc6']), { roughness: 1 }), 10);
            sack.rotation.y = (random() - 0.5) * 0.5;
          }
          z += 0.56;
        } else {
          for (const x of [-0.3, 0.05, 0.4]) {
            car.cylinder(0.15, 0.15, 0.5, [x, zone.y + 0.25, z + 0.18], mat(pickOf(['#d98b1f', '#3d6fa3', '#b3b7b9']), { metalness: 0.3 }), 12);
            car.cylinder(0.05, 0.08, 0.1, [x, zone.y + 0.55, z + 0.18], steel, 8);
          }
          z += 0.4;
        }
      }
      if (a.cargo === 'market' && amount > 0.5) {
        // A bicycle lashed flat on top.
        const y = zone.y + 0.42 + (tiers - 1) * 0.2, zc = (zone.z0 + end) / 2;
        for (const dz of [-0.5, 0.5]) car.ring(0.3, 0.018, [0, y, zc + dz], rubber).rotation.x = Math.PI / 2 - 0.1;
        car.rod([0, y, zc - 0.5], [0, y + 0.03, zc + 0.5], 0.016, mat('#c23a2e'));
        car.rod([0.2, y + 0.02, zc - 0.1], [0, y, zc + 0.5], 0.014, mat('#c23a2e'));
      }
    }
    if (a.spare === 'roof' && amount <= 0.12) wheel(0, zone.y + 0.15, zone.z0 + wheelR + 0.05, true);

    // Salt: a crust climbing the flanks, heavier when worn.
    const crust = Math.min(1, 0.3 + wear * 0.6 + (abandoned ? 0.4 : bogged ? 0.2 : 0));
    const saltMap = saltTexture(random, crust);
    const veil = new THREE.MeshBasicMaterial({ map: saltMap, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.95 });
    const height = mix(0.45, 1.05, crust);
    for (const side of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(spec.length - 0.1, height), veil);
      plane.position.set(side * (half + 0.03), sill - 0.06 + height / 2, 0);
      plane.rotation.y = side * Math.PI / 2;
      car.root.add(plane);
    }
    for (const [z, turn] of [[front + 0.17, 0], [rear - 0.14, Math.PI]] as const) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, height * 0.7), veil);
      plane.position.set(0, sill - 0.06 + height * 0.35, z);
      plane.rotation.y = turn;
      car.root.add(plane);
    }
    if (crust > 0.6) for (const side of [-1, 1]) car.box([0.06, 0.08, spec.length * 0.55], [side * (half + 0.01), sill + 0.01, 0], salt);

    // Stance.
    const sink = bogged ? mix(0.3, 0.42, random()) : abandoned ? 0.1 : 0;
    const roll = bogged ? (random() < 0.5 ? 1 : -1) * mix(0.07, 0.13, random()) : 0, pitch = bogged ? mix(0.03, 0.09, random()) : abandoned ? -0.03 : 0;
    car.root.position.y = -sink;
    car.root.rotation.set(pitch, 0, roll);
    s.root.add(car.root);

    // What is on the ground around it.
    const wood = mat('#9a7448', { roughness: 0.9 });
    if (bogged) {
      const low = roll > 0 ? -1 : 1;
      const slush = mat('#d9d6cc', { roughness: 1 }), wet = mat('#8f979c', { roughness: 0.25, metalness: 0.3 });
      for (const end of [-1, 1]) for (const side of [-1, 1]) {
        s.ball([0.55, 0.16, 0.7], [side * 1.05, 0, end * spec.wheel + 0.1], slush, 10);
        if (side === low) s.ball([0.5, 0.02, 0.9], [side * 0.9, 0.01, end * spec.wheel - 0.6], wet, 10).castShadow = false;
      }
      // Ruts leading in from behind.
      for (const side of [-1, 1]) s.box([0.3, 0.02, 3.2], [side * 0.8, 0.005, rear - 1.5], wet).castShadow = false;
      // Boards under the front wheel, a shovel stabbed in.
      for (let i = 0; i < 2; i++) s.box([0.28, 0.04, 1.2], [low * (0.75 + i * 0.3), 0.05 + i * 0.03, spec.wheel + 0.75], mat('#d0702a')).rotation.set(-0.12, (random() - 0.5) * 0.3, 0);
      const sx = low * 1.7, sz = spec.wheel - 0.3;
      s.rod([sx, 0.05, sz], [sx + low * 0.2, 1.2, sz + 0.1], 0.02, wood);
      s.box([0.2, 0.28, 0.015], [sx - low * 0.02, 0.08, sz - 0.01], steel);
      s.ring(0.05, 0.012, [sx + low * 0.21, 1.25, sz + 0.1], wood);
      // A tow strap run out ahead to nothing.
      s.tube([[0.3, 0.3, front + 0.1], [0.4, 0.03, front + 1.0], [0.1, 0.02, front + 1.9], [0.5, 0.02, front + 2.6]], 0.02, mat('#e0b21e'));
    }
    if (breakdown) {
      const side = -1;
      wheel(side * 1.75, 0.14, spec.wheel + 0.3, true, s.root);
      const box = s.box([0.5, 0.2, 0.24], [side * 1.5, 0.1, spec.wheel - 0.7], mat('#b8322a', { metalness: 0.3 }));
      box.rotation.y = 0.4;
      s.box([0.5, 0.02, 0.24], [side * 1.5 - 0.02, 0.26, spec.wheel - 0.84], mat('#b8322a')).rotation.set(-1.1, 0.4, 0);
      for (let i = 0; i < 4; i++) s.rod([side * 1.2 + random() * 0.4 - 0.2, 0.012, spec.wheel - 0.2 + random() * 0.5], [side * 1.2 + random() * 0.4 - 0.2, 0.012, spec.wheel - 0.2 + random() * 0.5], 0.014, steel);
      // Warning triangle set out behind.
      const tri = s.mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 3), mat('#e02a1a', { emissive: '#e02a1a', emissiveIntensity: 0.4 }), [0.5, 0.2, rear - 1.6]);
      tri.rotation.z = Math.PI / 2;
      // A bonnet-side oil stain.
      s.ball([0.4, 0.008, 0.3], [0.2, 0.005, front - 0.6], mat('#2a2622', { roughness: 0.3 }), 10).castShadow = false;
    }
    if (a.state === 'doors') {
      const tx = 2.0, tz = 0.2;
      s.box([0.7, 0.03, 1.0], [tx, 0.62, tz], mat('#c9c5b8', { metalness: 0.3 }));
      for (const dx of [-0.3, 0.3]) for (const dz of [-0.42, 0.42]) s.rod([tx + dx, 0, tz + dz * 1.1], [tx + dx * 0.9, 0.62, tz + dz], 0.012, steel);
      s.cylinder(0.05, 0.06, 0.24, [tx - 0.1, 0.76, tz + 0.2], mat('#2f6aa8', { metalness: 0.4 }), 10);
      s.box([0.26, 0.08, 0.2], [tx + 0.1, 0.68, tz - 0.2], mat('#3d3f42'));
      s.cylinder(0.07, 0.06, 0.07, [tx + 0.1, 0.75, tz - 0.2], steel, 10);
      for (const [dx, dz] of [[0.75, -0.1], [-0.1, 0.9], [0.5, 0.75]] as const) {
        s.box([0.3, 0.03, 0.3], [tx + dx, 0.4, tz + dz], mat(pickOf(bagColours), { roughness: 0.9 }));
        for (const p of [-0.12, 0.12]) for (const q of [-0.12, 0.12]) s.rod([tx + dx + p, 0, tz + dz + q], [tx + dx + p, 0.4, tz + dz + q], 0.01, steel);
      }
      s.box([0.5, 0.32, 0.32], [tx - 0.2, 0.16, tz - 0.95], mat(mood.cheer > 0.4 ? '#2f8fc2' : '#5d6a70', { roughness: 0.5 }));
      s.box([0.52, 0.05, 0.34], [tx - 0.2, 0.34, tz - 0.95], mat('#f0eee6'));
    }
    if (abandoned || crust > 0.75) for (let i = 0; i < 6; i++) s.ball([mix(0.4, 0.8, random()), mix(0.06, 0.16, random()), mix(0.5, 0.9, random())], [(i % 2 ? 1 : -1) * mix(0.8, 1.05, random()), 0, mix(rear, front, random())], salt, 10).castShadow = false;

    const bounds = visibleBounds(s.root);
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.position.set(-centre.x, 0, -centre.z);
    // Stand a little side-on so the flank, wheels and open doors show.
    const stand = new THREE.Group();
    stand.add(s.root);
    stand.rotation.y = -0.38;
    return { object: stand, dispose: () => { saltMap.dispose(); disposeTree(stand); } };
  },
});
