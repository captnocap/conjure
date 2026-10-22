import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ERAS = {
  fifties: { cab: -0.7, rear: -2.6, lift: 0, wheel: 0.4, hood: 1.22, belt: 1.27, roof: 1.92, wide: 1.6, bevel: 0.11 },
  seventies: { cab: -0.75, rear: -2.8, lift: 0, wheel: 0.4, hood: 1.14, belt: 1.18, roof: 1.82, wide: 1.95, bevel: 0.025 },
  nineties: { cab: -1.1, rear: -2.85, lift: 0.02, wheel: 0.41, hood: 1.12, belt: 1.2, roof: 1.82, wide: 1.95, bevel: 0.06 },
  modern: { cab: -1.55, rear: -3.1, lift: 0.16, wheel: 0.48, hood: 1.34, belt: 1.36, roof: 1.98, wide: 2.05, bevel: 0.05 },
} as const;
const PAINTS = {
  white: 'Fleet white, like every other truck on the lease.',
  red: 'Faded red.',
  tan: 'Two-tone tan and cream.',
  blue: 'Sky blue.',
  black: 'Black, an oven in August.',
  green: 'Forest green.',
  primer: 'Grey primer and mismatched panels, never finished.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINTS, string> = { white: '#eceae2', red: '#a5362b', tan: '#b08b5e', blue: '#6c9cc0', black: '#232426', green: '#34583f', primer: '#85888a' };

export default defineThing({
  questions: {
    era: choice('What era is the truck?', {
      fifties: 'A round-fendered 1950s step-side with a split grille.',
      seventies: 'A square-bodied 1970s long-bed with chrome bumpers.',
      nineties: 'A 1990s extended cab, the workhorse of the last bust.',
      modern: 'A lifted modern crew cab with a tall grille.',
    }),
    paint: choice('What colour is it under the dust?', PAINTS),
    whose: choice('Whose truck is it?', {
      company: 'The company man: clean door logo, white hard hat, a tall whip flag on the bumper.',
      welder: "A rig welder's own truck, his name lettered on the door.",
      pumper: 'A lease pumper on his rounds, his dog waiting in the bed.',
      greenhand: 'A new hire from out of state who sleeps in it: duffel and bedroll in the back, green hard hat.',
      oldtimer: 'An old hand forty years in the patch: one door a different colour, a battered tin hat.',
    }),
    bed: choice('What is in the bed?', {
      welder: 'A welding machine, oxygen and acetylene bottles and coiled leads.',
      toolboxes: 'Diamond-plate toolboxes, a spare tyre and a shovel.',
      fuel: 'A white fuel transfer tank with a pump and hose.',
      pipe: 'Joints of pipe and sucker rods on a rack, overhanging with a red flag.',
      empty: 'Next to nothing: a spare, a chain, some cans.',
    }),
    mirror: choice('What is on the dash or the mirror, besides the hard hat?', {
      nothing: 'Nothing else.',
      rosary: 'A rosary hanging from the mirror.',
      freshener: 'A pine-tree air freshener.',
      dice: 'Fuzzy dice.',
      photo: 'A photograph propped on the dash.',
    }),
    moment: choice('What is happening right now?', {
      stepped_out: 'The driver just stepped out: door wide open, lights still on.',
      broke_down: 'Broken down: hood up, door open.',
      lunch: 'Lunch: tailgate down with a lunch pail and thermos on it.',
      end_of_shift: 'End of shift: door open and a pair of muddy boots standing on the ground beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const e = ERAS[a.era];
    const dust = new THREE.Color('#b59c74');
    const dusty = (hex: THREE.ColorRepresentation, amount = 1) => new THREE.Color(hex).lerp(dust, Math.min(0.7, (0.05 + mood.wear * 0.36) * amount));
    const paintColour = dusty(PAINT_HEX[a.paint]);
    const paint = new THREE.MeshStandardMaterial({ color: paintColour, roughness: 0.4 + mood.wear * 0.5, metalness: 0.25 });
    const second = new THREE.MeshStandardMaterial({ color: dusty(a.paint === 'tan' ? '#ece2c6' : a.paint === 'primer' ? '#7c4a36' : PAINT_HEX[a.paint]), roughness: 0.6, metalness: 0.2 });
    const odd = new THREE.MeshStandardMaterial({ color: dusty(a.whose === 'oldtimer' ? (a.paint === 'blue' ? '#a5362b' : '#5d86a8') : a.paint === 'primer' ? '#a5362b' : PAINT_HEX[a.paint]), roughness: 0.7, metalness: 0.15 });
    const chrome = new THREE.MeshStandardMaterial({ color: dusty(a.era === 'modern' || a.era === 'nineties' ? '#3a3c3e' : '#d5d9da', 0.6), roughness: 0.25, metalness: a.era === 'modern' ? 0.3 : 0.9 });
    const black = new THREE.MeshStandardMaterial({ color: dusty('#1b1c1d', 0.5), roughness: 0.9 });
    const interior = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 });
    const seat = new THREE.MeshStandardMaterial({ color: a.era === 'fifties' ? '#7b3d2c' : a.era === 'seventies' ? '#a88458' : '#5b5d60', roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: '#9fc0cc', roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
    const steel = new THREE.MeshStandardMaterial({ color: dusty('#aeb3b4', 0.6), roughness: 0.4, metalness: 0.8 });
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };
    const W = e.wide, half = W / 2, bottom = 0.42 + e.lift, cowl = 0.8, front = 2.75, bedFloor = bottom + 0.34;
    const hoodY = e.hood + e.lift, belt = e.belt + e.lift, roof = e.roof + e.lift, railY = bedFloor + 0.52;
    const bedWide = a.era === 'fifties' ? W - 0.3 : W;

    /** A solid drawn in side profile (z along the truck, y up) and extruded across its width. */
    const prism = (profile: readonly (readonly [number, number])[], wide: number, material: THREE.Material, bevel: number = e.bevel) => {
      const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: wide - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 4 });
      geometry.translate(0, 0, -(wide - bevel * 2) / 2);
      geometry.rotateY(-Math.PI / 2);
      return s.mesh(geometry, material);
    };

    // Chassis and wheels.
    s.box([W * 0.55, 0.16, front - e.rear - 0.3], [0, bottom - 0.02, (front + e.rear) / 2], black);
    const axles = [1.8, e.rear + 1.15];
    const flat = a.moment === 'broke_down' && random() < 0.5 ? 1 : -1;
    axles.forEach((z, index) => {
      for (const side of [-1, 1]) {
        const isFlat = index === 0 && side === flat;
        const tyre = s.cylinder(e.wheel, e.wheel, 0.27, [side * (half - 0.16), e.wheel * (isFlat ? 0.86 : 1), z], black, 22);
        tyre.rotation.z = Math.PI / 2;
        if (isFlat) tyre.scale.set(1, 1, 0.9);
        s.cylinder(e.wheel * 0.55, e.wheel * 0.55, 0.29, [side * (half - 0.16), e.wheel * (isFlat ? 0.86 : 1), z], a.era === 'fifties' ? second : steel, 14).rotation.z = Math.PI / 2;
        // Dark wheel well showing through the body side.
        s.cylinder(e.wheel + 0.1, e.wheel + 0.1, 0.03, [side * ((index === 0 ? half : bedWide / 2) + 0.005), e.wheel + e.lift * 0.4, z], interior, 22).rotation.z = Math.PI / 2;
        if (mood.wear > 0.4) s.box([0.05, 0.5, 0.42], [side * (half - 0.14), e.wheel * 0.75, z - e.wheel - 0.16], black);
      }
      s.cylinder(0.06, 0.06, W - 0.3, [0, e.wheel, z], black, 8).rotation.z = Math.PI / 2;
    });

    // Front clip.
    prism([[cowl, bottom], [front - 0.08, bottom], [front, bottom + 0.2], [front, hoodY - 0.22], [front - 0.22, hoodY], [cowl, hoodY + 0.04]], a.era === 'fifties' ? W - 0.25 : W, paint);
    if (a.era === 'fifties') for (const side of [-1, 1]) {
      s.ball([0.34, 0.5, 0.82], [side * (half - 0.18), bottom + 0.42, axles[0] + 0.02], paint, 18);
      s.ball([0.36, 0.48, 0.74], [side * (bedWide / 2 + 0.14), bottom + 0.4, axles[1]], paint, 18);
      s.box([0.26, 0.05, 1.2], [side * (half - 0.12), bottom + 0.05, 0], black);
    }
    // Grille, lights, bumpers, plate.
    const tallGrille = a.era === 'modern' ? 0.62 : 0.4;
    s.box([W * (a.era === 'fifties' ? 0.5 : 0.62), tallGrille, 0.06], [0, hoodY - 0.18 - tallGrille / 2, front + 0.01], black);
    for (let i = 0; i < (a.era === 'modern' ? 3 : 5); i++) s.box([W * (a.era === 'fifties' ? 0.5 : 0.62), 0.035, 0.08], [0, hoodY - 0.22 - (i + 0.5) * tallGrille / (a.era === 'modern' ? 3 : 5), front + 0.02], chrome);
    const lampGlow = a.moment === 'stepped_out' ? 0.6 + Math.abs(mood.daylight - 0.5) * 3 : 0.05;
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: lampGlow, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const lx = side * (half - (a.era === 'fifties' ? 0.2 : 0.24)), ly = hoodY - (a.era === 'fifties' ? 0.3 : 0.32);
      if (a.era === 'fifties' || a.era === 'seventies') s.cylinder(0.12, 0.12, 0.08, [lx, ly, front + (a.era === 'fifties' ? -0.12 : 0.02)], lamp, 14).rotation.x = Math.PI / 2;
      else s.box([0.34, a.era === 'modern' ? 0.3 : 0.18, 0.07], [lx, ly + (a.era === 'modern' ? 0.02 : 0), front + 0.01], lamp);
      s.box([0.16, 0.2, 0.05], [side * (bedWide / 2 - 0.1), bedFloor + 0.2, e.rear - 0.03], new THREE.MeshStandardMaterial({ color: '#b3231c', emissive: '#b3231c', emissiveIntensity: lampGlow * 0.4 }));
      // Towing mirrors.
      s.rod([side * half, belt + 0.05, cowl - 0.25], [side * (half + 0.3), belt + 0.16, cowl - 0.2], 0.018, black);
      s.box([0.05, 0.26, 0.17], [side * (half + 0.32), belt + 0.2, cowl - 0.2], black);
    }
    s.box([W + 0.1, 0.2, 0.16], [0, bottom + 0.12, front + 0.08], chrome);
    s.box([bedWide + 0.1, 0.18, 0.18], [0, bottom + 0.12, e.rear - 0.1], chrome);
    const state = a.whose === 'greenhand' ? ['OHIO', 'MICHIGAN', 'LOUISIANA', 'MONTANA'][Math.floor(random() * 4)] : 'TEXAS';
    s.label(state, 0.34, 0.17, [0, bottom + 0.13, front + 0.165], '#1d2a52', '#f0eee6');
    s.label(state, 0.34, 0.17, [0, bottom + 0.14, e.rear - 0.195], '#1d2a52', '#f0eee6').rotation.y = Math.PI;

    // Hood: closed, or propped open over the engine.
    const hood = into(s.root, new THREE.Group());
    hood.position.set(0, hoodY + 0.045, cowl + 0.05);
    const hoodWide = (a.era === 'fifties' ? W - 0.25 : W) - 0.1;
    const hoodPanel = into(hood, s.box([hoodWide, 0.05, front - cowl - 0.35], [0, 0, (front - cowl - 0.35) / 2], paint));
    hoodPanel.rotation.x = 0.02;
    if (a.moment === 'broke_down') {
      hood.rotation.x = -0.95;
      s.box([hoodWide - 0.1, 0.03, front - cowl - 0.5], [0, hoodY + 0.02, (front + cowl) / 2 - 0.1], interior);
      s.box([0.55, 0.22, 0.75], [0, hoodY + 0.12, (front + cowl) / 2 - 0.1], steel);
      s.cylinder(0.24, 0.24, 0.1, [0, hoodY + 0.28, (front + cowl) / 2 - 0.1], new THREE.MeshStandardMaterial({ color: '#c8572b', roughness: 0.6 }), 16);
      s.rod([half - 0.25, hoodY + 0.03, front - 0.5], [half - 0.3, hoodY + 0.9, front - 0.95], 0.012, steel);
    }

    // Cab: a solid tub to the beltline, then pillars, roof and open windows.
    const cabFront = cowl, cabBack = e.cab;
    prism([[cabBack, bottom], [cabFront, bottom], [cabFront, belt], [cabBack, belt]], W, paint);
    const lean = 0.42;
    const roofBox = s.box([W - 0.14, 0.08, cabFront - lean - cabBack - 0.08], [0, roof - 0.04, (cabFront - lean + cabBack + 0.08) / 2], paint);
    void roofBox;
    if (a.era === 'fifties') s.ball([(W - 0.14) / 2, 0.1, (cabFront - lean - cabBack - 0.08) / 2], [0, roof - 0.01, (cabFront - lean + cabBack + 0.08) / 2], paint, 16);
    for (const side of [-1, 1]) {
      s.rod([side * (half - 0.05), belt, cabFront - 0.02], [side * (half - 0.1), roof - 0.04, cabFront - lean], 0.045, paint);
      s.box([0.09, roof - belt, 0.12], [side * (half - 0.07), (roof + belt) / 2, cabBack + 0.08], paint);
      if (a.era === 'nineties' || a.era === 'modern') s.box([0.07, roof - belt, 0.1], [side * (half - 0.07), (roof + belt) / 2, cabFront - 1.12], paint);
    }
    s.box([W - 0.1, roof - belt, 0.06], [0, (roof + belt) / 2, cabBack + 0.05], paint);
    s.box([W * 0.62, (roof - belt) * 0.55, 0.07], [0, (roof + belt) / 2 + 0.03, cabBack + 0.05], interior);
    if (a.whose === 'oldtimer') for (const dy of [-0.07, 0.08]) s.box([W * 0.56, 0.025, 0.02], [0, (roof + belt) / 2 + dy, cabBack + 0.0], new THREE.MeshStandardMaterial({ color: '#6b4a2e' }));
    const screenLength = Math.hypot(lean, roof - belt - 0.04);
    const screen = s.mesh(new THREE.PlaneGeometry(W - 0.24, screenLength), glass, [0, (belt + roof - 0.04) / 2, cabFront - lean / 2]);
    screen.rotation.x = -Math.atan2(lean, roof - belt - 0.04);
    screen.castShadow = false;
    // Dash, seat backs and steering wheel show above the beltline.
    s.box([W - 0.2, 0.1, 0.4], [0, belt + 0.03, cabFront - 0.25], interior);
    const rows = a.era === 'modern' ? [cabFront - 1.0, cabBack + 0.3] : [Math.max(cabBack + 0.28, cabFront - 1.1)];
    for (const z of rows) { s.box([W - 0.28, 0.42, 0.14], [0, belt + 0.14, z], seat); for (const side of [-1, 1]) s.box([0.24, 0.16, 0.1], [side * 0.45, belt + 0.42, z], seat); }
    const wheelRing = s.ring(0.19, 0.022, [half - 0.5, belt + 0.14, cabFront - 0.52], black);
    wheelRing.rotation.x = -0.45;
    s.rod([half - 0.5, belt + 0.14, cabFront - 0.52], [half - 0.5, belt, cabFront - 0.3], 0.025, black);
    // Body trim.
    if (a.paint === 'tan' || a.era === 'seventies') for (const side of [-1, 1]) s.box([0.02, 0.2, cabFront - e.rear - 0.1], [side * (half + 0.003), bottom + 0.42, (cabFront + e.rear) / 2], second);

    // Driver door, left open.
    const doorLength = a.era === 'modern' ? 0.98 : Math.min(1.25, cabFront - cabBack - 0.22), doorTall = belt - bottom - 0.1;
    const swing = { stepped_out: 1.15, broke_down: 0.8, lunch: 0.45, end_of_shift: 1.0 }[a.moment] * mix(0.85, 1.1, random());
    s.box([0.03, doorTall, doorLength - 0.04], [half + 0.002, bottom + 0.1 + doorTall / 2, cabFront - 0.06 - doorLength / 2], interior);
    s.box([0.05, 0.2, 0.46], [half - 0.01, bottom + 0.42, cabFront - 0.7], seat);
    s.box([0.05, 0.42, 0.12], [half - 0.01, bottom + 0.72, cabFront - 0.98], seat);
    const door = into(s.root, new THREE.Group());
    door.position.set(half + 0.01, 0, cabFront - 0.06);
    door.rotation.y = -swing;
    const doorPaint = a.whose === 'oldtimer' || a.paint === 'primer' ? odd : paint;
    into(door, s.box([0.06, doorTall, doorLength], [0.02, bottom + 0.1 + doorTall / 2, -doorLength / 2], doorPaint));
    into(door, s.box([0.03, doorTall - 0.12, doorLength - 0.12], [-0.02, bottom + 0.1 + doorTall / 2, -doorLength / 2], new THREE.MeshStandardMaterial({ color: '#4a443d', roughness: 1 })));
    into(door, s.rod([0.02, belt, -doorLength + 0.03], [0, roof - 0.08, -doorLength + 0.03], 0.025, doorPaint));
    into(door, s.rod([0.02, belt, -0.03], [0, roof - 0.08, -lean - 0.02], 0.025, doorPaint));
    into(door, s.rod([0, roof - 0.08, -lean - 0.02], [0, roof - 0.08, -doorLength + 0.03], 0.025, doorPaint));
    into(door, s.box([0.03, 0.05, 0.16], [0.06, belt - 0.16, -doorLength + 0.16], chrome));
    const doorText = { company: 'PERMIAN BASIN OIL CO.', welder: `${['RUIZ', 'HOLLIS', 'BAEZA', 'McCRAW'][Math.floor(random() * 4)]} WELDING`, pumper: 'CONTRACT PUMPER', greenhand: '', oldtimer: '' }[a.whose];
    if (doorText) {
      const badge = into(door, s.label(doorText, doorLength * 0.72, 0.2, [0.055, bottom + 0.1 + doorTall * 0.52, -doorLength / 2], a.paint === 'black' || a.paint === 'green' || a.paint === 'red' ? '#f1ede0' : '#1d2a26', '#' + (doorPaint.color as THREE.Color).getHexString()));
      badge.rotation.y = Math.PI / 2;
      const other = s.label(doorText, doorLength * 0.72, 0.2, [-half - 0.012, bottom + 0.1 + doorTall * 0.52, cabFront - 0.06 - doorLength / 2], a.paint === 'black' || a.paint === 'green' || a.paint === 'red' ? '#f1ede0' : '#1d2a26', '#' + paintColour.getHexString());
      other.rotation.y = -Math.PI / 2;
    }

    // Bed.
    const bedLength = cabBack - 0.06 - e.rear, bedMid = (cabBack - 0.06 + e.rear) / 2;
    prism([[e.rear, bottom], [cabBack - 0.06, bottom], [cabBack - 0.06, bedFloor], [e.rear, bedFloor]], bedWide, paint, Math.min(e.bevel, 0.04));
    for (const side of [-1, 1]) s.box([0.07, railY - bedFloor, bedLength], [side * (bedWide / 2 - 0.035), (railY + bedFloor) / 2, bedMid], paint);
    s.box([bedWide, railY - bedFloor, 0.07], [0, (railY + bedFloor) / 2, cabBack - 0.1], paint);
    s.box([bedWide - 0.14, 0.02, bedLength - 0.07], [0, bedFloor + 0.01, bedMid], black);
    const gateDown = a.moment === 'lunch';
    const gate = into(s.root, new THREE.Group());
    gate.position.set(0, bedFloor, e.rear + 0.03);
    into(gate, s.box([bedWide - 0.02, railY - bedFloor, 0.06], [0, (railY - bedFloor) / 2, 0], paint));
    if (gateDown) gate.rotation.x = -Math.PI / 2 + 0.03;
    if (gateDown) {
      const gz = e.rear - 0.25;
      s.box([0.3, 0.2, 0.18], [-0.3, bedFloor + 0.14, gz], new THREE.MeshStandardMaterial({ color: '#2f4e79', roughness: 0.6 }));
      s.ball([0.15, 0.09, 0.09], [-0.3, bedFloor + 0.25, gz], new THREE.MeshStandardMaterial({ color: '#2f4e79', roughness: 0.6 }), 10);
      s.cylinder(0.05, 0.05, 0.3, [0.05, bedFloor + 0.19, gz - 0.02], new THREE.MeshStandardMaterial({ color: '#2e5d45', roughness: 0.5 }), 10);
      s.cylinder(0.045, 0.045, 0.06, [0.05, bedFloor + 0.37, gz - 0.02], steel, 10);
      s.box([0.2, 0.05, 0.16], [0.4, bedFloor + 0.07, gz], new THREE.MeshStandardMaterial({ color: '#efe8d6' }));
    }

    // Headache rack and the load.
    const rack = a.bed === 'welder' || a.bed === 'pipe' || a.era === 'modern';
    const rackZ = cabBack - 0.16, rackTop = roof + 0.12;
    if (rack) {
      for (const side of [-1, 1]) s.rod([side * (bedWide / 2 - 0.06), railY, rackZ], [side * (bedWide / 2 - 0.06), rackTop, rackZ], 0.035, black);
      s.rod([-(bedWide / 2 - 0.06), rackTop, rackZ], [bedWide / 2 - 0.06, rackTop, rackZ], 0.035, black);
      for (let i = 1; i < 5; i++) s.rod([mix(-bedWide / 2 + 0.06, bedWide / 2 - 0.06, i / 5), belt, rackZ], [mix(-bedWide / 2 + 0.06, bedWide / 2 - 0.06, i / 5), rackTop, rackZ], 0.015, black);
    }
    const inBed = bedWide / 2 - 0.12;
    if (a.bed === 'welder') {
      const machine = new THREE.MeshStandardMaterial({ color: dusty(mood.cheer > 0.5 ? '#b3261f' : '#5f7c96', 0.5), roughness: 0.6 });
      const mz = cabBack - 0.9;
      s.box([0.72, 0.78, 1.15], [-inBed + 0.42, bedFloor + 0.41, mz], machine);
      for (let i = 0; i < 6; i++) s.box([0.02, 0.5, 0.05], [-inBed + 0.05, bedFloor + 0.42, mz - 0.4 + i * 0.16], black);
      s.box([0.5, 0.36, 0.03], [-inBed + 0.42, bedFloor + 0.45, mz - 0.585], black);
      s.cylinder(0.04, 0.04, 0.4, [-inBed + 0.5, bedFloor + 0.98, mz + 0.3], black, 8);
      for (const [dx, hex] of [[0.02, '#2f6b45'], [-0.24, '#7a2a25']] as const) {
        s.cylinder(0.11, 0.11, 1.25, [inBed - 0.12 + dx, bedFloor + 0.63, cabBack - 0.3], new THREE.MeshStandardMaterial({ color: dusty(hex, 0.5), roughness: 0.5 }), 12);
        s.ball([0.11, 0.09, 0.11], [inBed - 0.12 + dx, bedFloor + 1.26, cabBack - 0.3], new THREE.MeshStandardMaterial({ color: dusty(hex, 0.5), roughness: 0.5 }), 10);
        s.cylinder(0.05, 0.05, 0.12, [inBed - 0.12 + dx, bedFloor + 1.37, cabBack - 0.3], steel, 8);
      }
      for (const [dx, hex] of [[-0.25, '#1b1b1b'], [0.3, '#8a2a22']] as const) {
        const reel = s.ring(0.22, 0.075, [dx, bedFloor + 0.34, e.rear + 0.42], new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8 }));
        reel.rotation.y = Math.PI / 2;
      }
      s.box([0.2, 0.16, 0.14], [bedWide / 2 - 0.2, bottom + 0.3, e.rear - 0.14], steel);
    }
    if (a.bed === 'toolboxes') {
      const plate = new THREE.MeshStandardMaterial({ color: dusty('#c7cbcc', 0.6), roughness: 0.35, metalness: 0.85 });
      s.box([bedWide + 0.04, 0.46, 0.52], [0, railY + 0.05, cabBack - 0.42], plate);
      s.box([bedWide + 0.06, 0.03, 0.56], [0, railY + 0.29, cabBack - 0.42], plate);
      for (const side of [-1, 1]) s.box([0.3, 0.3, bedLength - 0.9], [side * (bedWide / 2 - 0.15), railY + 0.02, e.rear + (bedLength - 0.9) / 2 + 0.15], plate);
      const spare = s.cylinder(e.wheel, e.wheel, 0.26, [0.05, bedFloor + 0.15, e.rear + 0.75], black, 20);
      spare.rotation.z = 0.12;
      s.rod([-0.25, bedFloor + 0.06, e.rear + 0.2], [0.15, railY + 0.5, cabBack - 0.75], 0.02, new THREE.MeshStandardMaterial({ color: '#9a7a4d' }));
      s.box([0.22, 0.28, 0.02], [0.17, railY + 0.6, cabBack - 0.72], steel).rotation.x = 0.4;
    }
    if (a.bed === 'fuel') {
      const white = new THREE.MeshStandardMaterial({ color: dusty('#e9e7df', 0.7), roughness: 0.6 });
      s.box([bedWide - 0.24, 0.42, 1.15], [0, bedFloor + 0.23, cabBack - 0.72], white);
      s.box([bedWide - 0.24, 0.5, 0.48], [0, bedFloor + 0.68, cabBack - 0.39], white);
      s.box([0.2, 0.24, 0.18], [inBed - 0.3, bedFloor + 0.57, cabBack - 0.8], new THREE.MeshStandardMaterial({ color: '#b3261f' }));
      s.tube([[inBed - 0.3, bedFloor + 0.6, cabBack - 0.9], [inBed - 0.1, bedFloor + 0.9, cabBack - 1.2], [inBed - 0.4, bedFloor + 0.3, cabBack - 1.5], [0, bedFloor + 0.1, cabBack - 1.6], [0.2, bedFloor + 0.5, cabBack - 1.25]], 0.025, black);
      for (const dx of [-0.4, -0.05]) s.cylinder(0.15, 0.14, 0.36, [dx, bedFloor + 0.19, e.rear + 0.35], new THREE.MeshStandardMaterial({ color: '#2e5fa5', roughness: 0.6 }), 12);
      s.label('DIESEL', 0.6, 0.18, [0, bedFloor + 0.7, cabBack - 0.63 - 0.01], '#b3261f', '#e9e7df').rotation.y = Math.PI;
    }
    if (a.bed === 'pipe') {
      for (const side of [-1, 1]) s.rod([side * (bedWide / 2 - 0.06), railY, e.rear + 0.2], [side * (bedWide / 2 - 0.06), rackTop, e.rear + 0.2], 0.035, black);
      s.rod([-(bedWide / 2 - 0.06), rackTop, e.rear + 0.2], [bedWide / 2 - 0.06, rackTop, e.rear + 0.2], 0.035, black);
      const rusty = new THREE.MeshStandardMaterial({ color: '#7d4a31', roughness: 0.8, metalness: 0.3 });
      const joints = 5 + Math.round(mood.density * 4);
      for (let i = 0; i < joints; i++) {
        const x = mix(-bedWide / 2 + 0.2, bedWide / 2 - 0.2, (i + 0.5) / joints), thin = i % 3 === 2, long = thin ? 7.2 : 6.2 + random() * 0.5;
        const joint = s.cylinder(thin ? 0.02 : 0.05, thin ? 0.02 : 0.05, long, [x, rackTop + (thin ? 0.06 : 0.09), (rackZ + e.rear) / 2 + 0.3 + (random() - 0.5) * 0.5], thin ? steel : rusty, 8);
        joint.rotation.x = Math.PI / 2;
      }
      const flag = s.box([0.02, 0.3, 0.3], [0, rackTop - 0.1, (rackZ + e.rear) / 2 - 3.2], new THREE.MeshStandardMaterial({ color: '#d3241c', roughness: 0.9 }));
      flag.rotation.x = 0.3;
    }
    if (a.bed === 'empty') {
      const spare = s.cylinder(e.wheel, e.wheel, 0.26, [-0.2, bedFloor + 0.15, cabBack - 0.75], black, 20);
      spare.rotation.x = 0.08;
      s.tube([[0.3, bedFloor + 0.05, e.rear + 0.5], [0.5, bedFloor + 0.08, e.rear + 0.9], [0.2, bedFloor + 0.05, e.rear + 1.1], [0.45, bedFloor + 0.05, e.rear + 1.3]], 0.03, steel);
      for (let i = 0; i < 3 + Math.round(mood.density * 6); i++) { const can = s.cylinder(0.033, 0.033, 0.12, [(random() - 0.5) * (bedWide - 0.5), bedFloor + 0.055, e.rear + 0.3 + random() * (bedLength - 0.9)], new THREE.MeshStandardMaterial({ color: random() < 0.5 ? '#c9ccd0' : '#3a5fa8', metalness: 0.6, roughness: 0.4 }), 8); can.rotation.z = Math.PI / 2; can.rotation.y = random() * 3; }
    }
    // The water cooler, strapped to the bed rail at the back corner.
    {
      const cx = bedWide / 2 - 0.19, cz = e.rear + 0.34, cy = a.bed === 'toolboxes' ? railY + 0.17 : bedFloor + 0.02;
      const coolerColour = mood.cheer > 0.45 ? '#e8791f' : '#d9b526';
      s.cylinder(0.17, 0.15, 0.44, [cx, cy + 0.22, cz], new THREE.MeshStandardMaterial({ color: dusty(coolerColour, 0.4), roughness: 0.6 }), 16);
      s.cylinder(0.175, 0.175, 0.07, [cx, cy + 0.47, cz], new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.6 }), 16);
      s.cylinder(0.02, 0.02, 0.06, [cx, cy + 0.1, cz - 0.17], new THREE.MeshStandardMaterial({ color: '#f1efe8' }), 6).rotation.x = Math.PI / 2;
      s.ring(0.18, 0.012, [cx, cy + 0.3, cz], black).rotation.x = Math.PI / 2;
      s.rod([cx + 0.17, cy + 0.3, cz], [bedWide / 2 - 0.03, railY, cz], 0.012, black);
    }

    // Hard hat on the dash and whatever hangs from the mirror.
    const hatColour = { company: '#f3f1ea', welder: '#6b4a2e', pumper: '#e6c229', greenhand: '#3f9a52', oldtimer: '#aeb3b4' }[a.whose];
    const hat = new THREE.MeshStandardMaterial({ color: hatColour, roughness: a.whose === 'oldtimer' ? 0.35 : 0.6, metalness: a.whose === 'oldtimer' ? 0.7 : 0 });
    const hx = -half + 0.5, hz = cabFront - 0.2, hy = belt + 0.08;
    s.mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat, [hx, hy, hz]).scale.set(1, 0.95, 1.15);
    s.cylinder(0.2, 0.2, 0.02, [hx, hy + 0.01, hz], hat, 16).scale.set(1, 1, 1.2);
    s.box([0.03, 0.05, 0.36], [hx, hy + 0.13, hz], hat);
    s.box([0.22, 0.06, 0.03], [0, roof - 0.16, cabFront - lean + 0.02], black);
    const hanging = into(s.root, new THREE.Group());
    hanging.position.set(0, roof - 0.19, cabFront - lean + 0.03);
    if (a.mirror === 'rosary') {
      const bead = new THREE.MeshStandardMaterial({ color: '#7a2f2a', roughness: 0.5 });
      into(hanging, s.mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), bead, [0, -0.08, 0])).scale.set(0.8, 1.3, 1);
      into(hanging, s.box([0.02, 0.12, 0.012], [0, -0.24, 0], steel));
      into(hanging, s.box([0.07, 0.02, 0.012], [0, -0.21, 0], steel));
    }
    if (a.mirror === 'freshener') {
      const tree = new THREE.Shape([[0, 0], [-0.07, -0.08], [-0.03, -0.08], [-0.09, -0.16], [-0.02, -0.16], [-0.02, -0.21], [0.02, -0.21], [0.02, -0.16], [0.09, -0.16], [0.03, -0.08], [0.07, -0.08]].map(([x, y]) => new THREE.Vector2(x, y)));
      into(hanging, s.rod([0, 0, 0], [0, -0.06, 0], 0.004, black));
      into(hanging, s.mesh(new THREE.ExtrudeGeometry(tree, { depth: 0.006, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#2f8a45', roughness: 0.9 }), [0, -0.05, 0]));
    }
    if (a.mirror === 'dice') for (const [dx, dy, hex] of [[-0.05, -0.14, '#f1efe8'], [0.05, -0.2, '#f1efe8']] as const) {
      into(hanging, s.rod([0, 0, 0], [dx, dy + 0.04, 0], 0.004, black));
      into(hanging, s.box([0.085, 0.085, 0.085], [dx, dy, 0], new THREE.MeshStandardMaterial({ color: hex, roughness: 1 }))).rotation.set(0.4, 0.5, 0.2);
    }
    if (a.mirror === 'photo') {
      const photo = s.box([0.17, 0.13, 0.008], [0.25, belt + 0.14, cabFront - 0.14], new THREE.MeshStandardMaterial({ color: '#f3efe2', roughness: 0.8 }));
      photo.rotation.x = -0.5;
      const picture = s.box([0.13, 0.09, 0.004], [0.25, belt + 0.143, cabFront - 0.133], new THREE.MeshStandardMaterial({ color: '#6f8fa6', roughness: 0.8 }));
      picture.rotation.x = -0.5;
    }

    // Whose truck: the things only that person would carry.
    let whip: THREE.Group | null = null, tail: THREE.Mesh | null = null;
    if (a.whose === 'company') {
      whip = into(s.root, new THREE.Group());
      whip.position.set(-half + 0.12, bottom + 0.22, front + 0.08);
      into(whip, s.cylinder(0.008, 0.016, 2.7, [0, 1.35, 0], new THREE.MeshStandardMaterial({ color: '#f1efe8' }), 6));
      into(whip, s.box([0.3, 0.22, 0.01], [0.15, 2.58, 0], new THREE.MeshStandardMaterial({ color: '#e8641f', roughness: 0.9, side: THREE.DoubleSide })));
      s.cylinder(0.11, 0.11, 0.06, [0, roof + 0.03, cabFront - 0.9], new THREE.MeshStandardMaterial({ color: '#e8a21f', emissive: '#e8a21f', emissiveIntensity: 0.4 }), 12);
    }
    if (a.whose === 'pumper') {
      const fur = new THREE.MeshStandardMaterial({ color: ['#8a6a44', '#2b2826', '#c9b089'][Math.floor(random() * 3)], roughness: 1 });
      const dx = -inBed + 0.35, dz = e.rear + 0.55, dy = a.bed === 'toolboxes' ? bedFloor : bedFloor;
      s.ball([0.15, 0.24, 0.2], [dx, dy + 0.26, dz], fur, 12);
      s.ball([0.11, 0.11, 0.13], [dx, dy + 0.56, dz - 0.08], fur, 12);
      s.ball([0.06, 0.055, 0.1], [dx, dy + 0.53, dz - 0.2], fur, 8);
      for (const side of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.045, 0.11, 5), fur, [dx + side * 0.07, dy + 0.67, dz - 0.05]);
      for (const side of [-1, 1]) s.cylinder(0.035, 0.035, 0.3, [dx + side * 0.08, dy + 0.15, dz - 0.14], fur, 6);
      const wag = new THREE.CylinderGeometry(0.02, 0.03, 0.26, 6);
      wag.translate(0, 0.13, 0);
      tail = s.mesh(wag, fur, [dx, dy + 0.12, dz + 0.18]);
      tail.rotation.x = 0.9;
    }
    if (a.whose === 'greenhand') {
      const bz = a.bed === 'empty' ? cabBack - 1.5 : e.rear + 0.7;
      const duffel = s.mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), new THREE.MeshStandardMaterial({ color: '#4d5a3f', roughness: 1 }), [0.1, bedFloor + 0.19, bz]);
      duffel.rotation.z = Math.PI / 2;
      const roll = s.cylinder(0.14, 0.14, 0.55, [-0.1, bedFloor + 0.16, bz + 0.38], new THREE.MeshStandardMaterial({ color: '#b3462f', roughness: 1 }), 12);
      roll.rotation.z = Math.PI / 2;
    }
    if (a.moment === 'end_of_shift') {
      const leather = new THREE.MeshStandardMaterial({ color: dusty('#5b3e27', 0.8), roughness: 1 });
      for (const [dx, dz, turn] of [[0, 0, 0.2], [0.22, 0.12, -0.3]] as const) {
        const boot = into(s.root, new THREE.Group());
        boot.position.set(half + 0.55 + dx, 0, cabFront - 0.75 + dz);
        boot.rotation.y = turn;
        into(boot, s.cylinder(0.07, 0.06, 0.34, [0, 0.2, 0], leather, 8));
        into(boot, s.box([0.12, 0.09, 0.28], [0, 0.045, 0.07], leather));
      }
    }
    // Dust and mud thrown up the flanks.
    if (mood.wear > 0.3) for (const z of axles) for (const side of [-1, 1]) {
      const splash = s.cylinder(0.5, 0.5, 0.012, [side * ((z > 0 ? half : bedWide / 2) + 0.012), bottom + 0.22, z - e.wheel - 0.32], new THREE.MeshStandardMaterial({ color: '#8a6f4a', roughness: 1 }), 12);
      splash.rotation.z = Math.PI / 2; splash.scale.set(0.5 + mood.wear * 0.5, 1, 1.3); splash.castShadow = false;
    }

    // Parked three-quarter on, driver side and open door toward the viewer.
    s.root.rotation.y = -0.95 + (random() - 0.5) * 0.3;
    return s.finish({
      update: (_dt, time) => {
        const sway = mix(0.02, 0.22, mood.energy);
        hanging.rotation.z = Math.sin(time * 2.3) * sway;
        if (whip) whip.rotation.z = Math.sin(time * 3.1) * sway * 0.4;
        if (tail) tail.rotation.z = Math.sin(time * mix(2, 14, mood.energy)) * 0.6;
      },
    });
  },
});
