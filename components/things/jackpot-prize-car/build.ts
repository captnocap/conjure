import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type XY = readonly [number, number];
interface Spec { L: number; W: number; R: number; wheels: XY; clear: number; top: XY[]; cabin: XY[] | null; cockpit: XY | null; colour: string; }
const CARS: Record<string, Spec> = {
  sports: { L: 4.2, W: 1.8, R: 0.33, wheels: [-1.3, 1.3], clear: 0.2, colour: '#c8102e', cabin: null, cockpit: [-0.75, 0.42],
    top: [[-2.1, 0.3], [-2.1, 0.7], [-1.9, 0.8], [-0.9, 0.84], [0.45, 0.84], [1.5, 0.7], [2.02, 0.56], [2.1, 0.3]] },
  saloon: { L: 5.0, W: 1.9, R: 0.35, wheels: [-1.5, 1.55], clear: 0.24, colour: '#c9a227', cockpit: null,
    top: [[-2.5, 0.35], [-2.5, 0.84], [-1.5, 0.95], [1.0, 0.95], [2.3, 0.86], [2.5, 0.7], [2.5, 0.35]], cabin: [[-1.6, 0.93], [-1.1, 1.46], [0.35, 1.46], [1.0, 0.93]] },
  pickup: { L: 5.3, W: 1.95, R: 0.42, wheels: [-1.65, 1.65], clear: 0.42, colour: '#1f4fa0', cockpit: null,
    top: [[-2.65, 0.5], [-2.65, 1.08], [0.9, 1.08], [2.45, 1.12], [2.65, 1.0], [2.65, 0.5]], cabin: [[-0.4, 1.06], [-0.35, 1.76], [0.7, 1.76], [1.1, 1.08]] },
  cruiser: { L: 5.6, W: 2.0, R: 0.36, wheels: [-1.75, 1.65], clear: 0.24, colour: '#35b5a6', cabin: null, cockpit: [-1.2, 0.5],
    top: [[-2.8, 0.38], [-2.8, 0.82], [-2.65, 0.92], [-0.9, 0.9], [0.55, 0.9], [2.3, 0.86], [2.72, 0.76], [2.8, 0.38]] },
  city: { L: 2.7, W: 1.55, R: 0.28, wheels: [-0.9, 0.88], clear: 0.2, colour: '#f2c416', cockpit: null,
    top: [[-1.35, 0.3], [-1.35, 0.88], [0.7, 0.9], [1.28, 0.76], [1.35, 0.3]], cabin: [[-1.3, 0.88], [-1.15, 1.5], [0.3, 1.5], [0.85, 0.88]] },
};

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const BOWS = { red: 'Scarlet satin.', gold: 'Metallic gold.', white: 'Bridal white.', pink: 'Hot pink.', blue: 'Royal blue.', green: 'Dollar-bill green.', silver: 'Shiny silver foil.' } as const;
const BOW: Record<keyof typeof BOWS, string> = { red: '#d3122a', gold: '#e0b030', white: '#f6f3ea', pink: '#ff4f9e', blue: '#1f55d0', green: '#1e9a4a', silver: '#c9d0d6' };

export default defineThing({
  questions: {
    car: choice('What kind of car is the prize?', {
      sports: 'A low red two-seat sports convertible.',
      saloon: 'A long gold luxury saloon with a formal roofline.',
      pickup: 'A big shiny pickup truck with a chrome grille.',
      cruiser: 'A vintage tailfin cruiser, 1950s chrome and whitewalls, top down.',
      city: 'A tiny bubble-shaped city car, a slightly disappointing prize.',
    }),
    paint: choice('What colour is its paint?', {
      signature: 'The colour that kind of car is famous for.',
      white: 'Pearl white.',
      black: 'Jet black.',
      red: 'Candy-apple red.',
      gold: 'Casino gold.',
      blue: 'Electric blue.',
      pink: 'Bubblegum pink.',
    }),
    bow: choice('What colour is the giant bow on the bonnet?', BOWS),
    turns: noul('Is the dais turning?'),
    state: choice('What state is the prize in?', {
      showroom: 'Immaculate, polished daily, waiting for its winner.',
      won: 'Just won: the driver\'s door swung open and confetti all over the dais.',
      wrapped: 'Gift-wrapped, ribbon running right over it nose to tail like a parcel.',
      unclaimed: 'Unclaimed for years: dusty, the bow sagging, one tyre gone flat.',
    }),
    dais: choice('What is the dais like?', {
      chrome: 'Mirror chrome with a white turntable.',
      red: 'Red carpet and gold trim.',
      black: 'Gloss black with a gold sunburst.',
      checker: 'A black-and-white chequered showroom turntable.',
    }),
    placard: choice('What does the placard say?', {
      win: 'WIN THIS CAR',
      jackpot: 'JACKPOT',
      grand: 'GRAND PRIZE',
      play: '$1 TO PLAY',
      winner: 'WINNER!',
      tonight: 'DRAW TONIGHT',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const car = new Sculpture(context);
    const { mood, random } = context;
    const spec = CARS[a.car];
    const { L, W, R } = spec;
    const dusty = a.state === 'unclaimed';
    const tone = new THREE.Color({ signature: spec.colour, white: '#f2efe6', black: '#16171b', red: '#c8102e', gold: '#c9a227', blue: '#1668e0', pink: '#ff7fb5' }[a.paint]);
    if (dusty) tone.lerp(new THREE.Color('#9a9488'), 0.35);
    const body = new THREE.MeshStandardMaterial({ color: tone, metalness: dusty ? 0.05 : 0.22, roughness: dusty ? 0.8 : 0.24 });
    const chrome = s.material('#e6e9ea', { metalness: 0.95, roughness: 0.15 });
    const dark = s.material('#15161a', { roughness: 0.7 });
    const glass = s.material('#1c2733', { roughness: 0.08, metalness: 0.6 });
    const hide = s.material(a.car === 'cruiser' ? '#f2efe6' : '#b98a5a', { roughness: 0.8 });
    const glow = mix(0.5, 1.3, mood.cheer);
    const DH = 0.38;
    const topY = (x: number, line: readonly XY[] = spec.top) => {
      for (let i = 0; i < line.length - 1; i++) if (x >= line[i][0] && x <= line[i + 1][0] && line[i + 1][0] > line[i][0]) return mix(line[i][1], line[i + 1][1], (x - line[i][0]) / (line[i + 1][0] - line[i][0]));
      return line[0][1];
    };

    // Body: a side profile with wheel arches, extruded across the width.
    const profile = new THREE.Shape();
    profile.moveTo(...spec.top[0]);
    for (const p of spec.top.slice(1)) profile.lineTo(...p);
    for (const wx of [spec.wheels[1], spec.wheels[0]]) { profile.lineTo(wx + R + 0.07, spec.clear); profile.absarc(wx, R - 0.02, R + 0.07, 0, Math.PI, false); profile.lineTo(wx - R - 0.07, spec.clear); }
    profile.closePath();
    const bodyGeometry = new THREE.ExtrudeGeometry(profile, { depth: W - 0.16, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 10 });
    bodyGeometry.translate(0, 0, -(W - 0.16) / 2);
    car.mesh(bodyGeometry, body);
    if (spec.cabin) {
      const cabin = new THREE.Shape();
      cabin.moveTo(...spec.cabin[0]);
      for (const p of spec.cabin.slice(1)) cabin.lineTo(...p);
      cabin.closePath();
      const cw = W - 0.4;
      const cabinGeometry = new THREE.ExtrudeGeometry(cabin, { depth: cw, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
      cabinGeometry.translate(0, 0, -cw / 2);
      car.mesh(cabinGeometry, glass);
      const [, r1, r2] = spec.cabin;
      car.box([r2[0] - r1[0] + 0.12, 0.07, cw + 0.14], [(r1[0] + r2[0]) / 2, r1[1] + 0.03, 0], a.car === 'cruiser' ? s.material('#f2efe6') : body);
      for (const x of [r1[0] + 0.05, (r1[0] + r2[0]) / 2 + 0.1, r2[0] - 0.02]) car.box([0.08, r1[1] - spec.cabin[0][1], cw + 0.115], [x, (r1[1] + spec.cabin[0][1]) / 2, 0], body);
    }
    if (spec.cockpit) {
      const [c0, c1] = spec.cockpit, belt = topY((c0 + c1) / 2);
      car.box([c1 - c0, 0.03, W - 0.42], [(c0 + c1) / 2, belt + 0.012, 0], dark);
      const rows = a.car === 'cruiser' ? [c0 + 0.3, c0 + 1.05] : [c0 + 0.35];
      for (const x of rows) {
        if (a.car === 'cruiser') { car.box([0.5, 0.14, W - 0.56], [x + 0.1, belt + 0.02, 0], hide); car.box([0.14, 0.4, W - 0.56], [x - 0.2, belt + 0.14, 0], hide).rotation.z = 0.15; }
        else for (const z of [-0.36, 0.36]) { car.box([0.5, 0.14, 0.5], [x + 0.1, belt + 0.02, z], hide); car.box([0.13, 0.48, 0.48], [x - 0.2, belt + 0.16, z], hide).rotation.z = 0.2; }
      }
      car.ring(0.17, 0.018, [c1 - 0.22, belt + 0.16, 0.36], dark).rotation.set(0, Math.PI / 2, 0.45, 'YXZ');
      const screen = car.box([0.03, 0.44, W - 0.34], [c1 + 0.14, belt + 0.2, 0], new THREE.MeshPhysicalMaterial({ color: '#bfe0ee', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }));
      screen.rotation.z = 0.55;
      const frame = car.box([0.045, 0.045, W - 0.3], [c1 + 0.02, belt + 0.4, 0], chrome);
      frame.castShadow = true;
      for (const z of [-1, 1]) car.rod([c1 + 0.26, belt, z * (W / 2 - 0.17)], [c1 + 0.02, belt + 0.4, z * (W / 2 - 0.17)], 0.022, chrome);
    }
    if (a.car === 'pickup') {
      car.box([2.1, 0.03, W - 0.4], [-1.5, 1.09, 0], dark);
      for (const z of [-1, 1]) car.box([2.2, 0.1, 0.09], [-1.5, 1.13, z * (W / 2 - 0.12)], body);
      car.box([0.09, 0.1, W - 0.2], [-2.6, 1.13, 0], body);
      car.tube([[-0.5, 1.1, -0.75], [-0.52, 1.85, -0.72], [-0.52, 1.85, 0.72], [-0.5, 1.1, 0.75]], 0.035, chrome);
    }
    if (a.car === 'cruiser') {
      for (const z of [-1, 1]) {
        const fin = new THREE.Shape(); fin.moveTo(-2.8, 0.85); fin.lineTo(-2.92, 1.28); fin.lineTo(-1.2, 0.9); fin.closePath();
        const geometry = new THREE.ExtrudeGeometry(fin, { depth: 0.1, bevelEnabled: false });
        geometry.translate(0, 0, z * (W / 2 - 0.1) - 0.05);
        car.mesh(geometry, body);
        car.ball([0.06, 0.09, 0.07], [-2.86, 1.05, z * (W / 2 - 0.1)], s.material('#ff2a2a', { emissive: '#ff2a2a', emissiveIntensity: glow }), 10);
        car.box([3.6, 0.05, 0.03], [0.2, 0.62, z * (W / 2 + 0.005)], chrome);
      }
    }
    // Wheels.
    const tyre = s.material('#131316', { roughness: 0.9 });
    const tyreGeometry = new THREE.CylinderGeometry(R, R, 0.24, 24).rotateX(Math.PI / 2);
    const hubGeometry = new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.26, 16).rotateX(Math.PI / 2);
    const flat = dusty ? Math.floor(random() * 4) : -1;
    spec.wheels.forEach((wx, i) => [-1, 1].forEach((side, j) => {
      const z = side * (W / 2 - 0.1);
      const wheel = car.mesh(tyreGeometry, tyre, [wx, R, z]);
      car.mesh(hubGeometry, chrome, [wx, R, z]);
      if (a.car === 'cruiser') car.mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.25, 20).rotateX(Math.PI / 2), s.material('#f2efe6'), [wx, R, z]);
      if (i * 2 + j === flat) { wheel.scale.y = 0.82; wheel.position.y = R * 0.82; }
    }));
    // Lights, grille, bumpers, plates, mirrors, door seams.
    const lamp = s.material('#fff8dc', { emissive: '#fff1b0', emissiveIntensity: dusty ? 0.1 : glow, roughness: 0.2 });
    const tail = s.material('#d3122a', { emissive: '#ff2a2a', emissiveIntensity: dusty ? 0.1 : glow * 0.7, roughness: 0.3 });
    const nose = spec.top[spec.top.length - 2], rear = spec.top[1];
    const fy = (nose[1] + spec.clear) / 2 + 0.06, fx = L / 2 + 0.07;
    for (const z of [-1, 1]) {
      car.ball([0.07, 0.1, 0.14], [fx - 0.02, fy + 0.06, z * (W / 2 - 0.3)], lamp, 12);
      if (a.car === 'cruiser' || a.car === 'pickup') car.ball([0.06, 0.08, 0.1], [fx - 0.02, fy + 0.06, z * (W / 2 - 0.58)], lamp, 12);
      if (a.car !== 'cruiser') car.box([0.05, 0.12, 0.34], [-L / 2 - 0.07, (rear[1] + spec.clear) / 2 + 0.12, z * (W / 2 - 0.3)], tail);
      car.box([0.14, 0.09, 0.2], [(spec.cabin ? spec.cabin[3][0] : spec.cockpit![1]) + 0.12, topY(spec.cabin ? spec.cabin[3][0] : spec.cockpit![1]) + 0.06, z * (W / 2 + 0.1)], body);
      const door = (spec.cabin ? spec.cabin[3][0] : spec.cockpit![1]) + 0.05;
      for (const x of [door, door - (a.car === 'saloon' ? 1.0 : 1.1)]) car.box([0.012, topY(0) - spec.clear - 0.12, 0.012], [x, (topY(0) + spec.clear) / 2, z * (W / 2 + 0.003)], dark);
      car.box([0.14, 0.025, 0.03], [door - 0.85, topY(0) - 0.14, z * (W / 2 + 0.012)], chrome);
    }
    const gw = a.car === 'pickup' ? W - 0.9 : a.car === 'sports' ? W - 1.1 : W - 1.0;
    car.box([0.05, a.car === 'pickup' ? 0.34 : 0.16, gw], [fx - 0.015, fy + (a.car === 'pickup' ? 0.02 : -0.05), 0], dark);
    for (let i = 0; i < (a.car === 'pickup' ? 4 : 2); i++) car.box([0.06, 0.02, gw], [fx - 0.01, fy - 0.1 + i * 0.09, 0], chrome);
    for (const x of [fx, -L / 2 - 0.07]) car.box([0.1, a.car === 'cruiser' || a.car === 'pickup' ? 0.14 : 0.08, W - 0.1], [x, spec.clear + 0.08, 0], a.car === 'sports' || a.car === 'city' ? dark : chrome);
    const plate = car.label(a.state === 'won' ? 'WINNER' : 'WIN ME', 0.42, 0.11, [fx + 0.052, spec.clear + 0.09, 0], '#16181c', '#f6eed2');
    plate.rotation.y = Math.PI / 2; plate.castShadow = false;

    // Ribbon and the giant bow.
    const ribbonColour = new THREE.Color(BOW[a.bow]);
    if (dusty) ribbonColour.lerp(new THREE.Color('#9a9488'), 0.4);
    const satin = new THREE.MeshStandardMaterial({ color: ribbonColour, roughness: 0.35, metalness: a.bow === 'gold' || a.bow === 'silver' ? 0.7 : 0.1 });
    const cowl = spec.cabin ? spec.cabin[3][0] : spec.cockpit![1] + 0.3;
    const bx = mix(cowl, L / 2, 0.42), by = topY(bx);
    car.box([0.2, 0.014, W + 0.04], [bx, by + 0.009, 0], satin);
    for (const z of [-1, 1]) car.box([0.2, by - spec.clear - 0.25, 0.014], [bx, (by + spec.clear + 0.25) / 2, z * (W / 2 + 0.012)], satin);
    if (a.state === 'wrapped') {
      const outline: XY[] = [];
      for (let x = -L / 2 + 0.02; x <= L / 2 - 0.02; x += 0.14) outline.push([x, Math.max(topY(x), spec.cabin && x > spec.cabin[0][0] && x < spec.cabin[3][0] ? topY(x, spec.cabin) + 0.07 : 0)]);
      for (let i = 0; i < outline.length - 1; i++) {
        const [x0, y0] = outline[i], [x1, y1] = outline[i + 1];
        const strip = car.box([Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.014, 0.2], [(x0 + x1) / 2, (y0 + y1) / 2 + 0.012, 0], satin);
        strip.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      }
    }
    const bow = new THREE.Group();
    const loopGeometry = new THREE.TorusGeometry(0.24, 0.085, 8, 20);
    for (const side of [-1, 1]) {
      const loop = new THREE.Mesh(loopGeometry, satin);
      loop.scale.set(1, 0.8, 2.0); loop.position.set(0, 0.3, side * 0.33); loop.rotation.set(0, Math.PI / 2, 0); loop.rotateZ(side * (dusty ? -0.45 : 0.55));
      const tailRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.55), satin);
      tailRibbon.position.set(-0.05, 0.03, side * 0.38); tailRibbon.rotation.set(side * (dusty ? 0.05 : -0.12), side * 0.35, 0);
      bow.add(loop, tailRibbon);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), satin);
    knot.position.y = 0.2; knot.scale.set(1, 0.9, 0.8);
    bow.add(knot);
    bow.traverse((n) => { n.castShadow = true; });
    bow.position.set(bx, by, 0);
    bow.scale.setScalar(a.car === 'city' ? 1.25 : 1.75);
    if (dusty) { bow.scale.y *= 0.62; bow.rotation.x = 0.2; }
    car.root.add(bow);

    if (a.state === 'won') {
      const hinge = (spec.cabin ? spec.cabin[3][0] : spec.cockpit![1]) + 0.05;
      const door = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, topY(0) - spec.clear - 0.14, 0.07), body);
      panel.position.set(-0.5, 0, 0); panel.castShadow = true;
      door.add(panel);
      door.position.set(hinge, (topY(0) + spec.clear) / 2, W / 2 + 0.03);
      door.rotation.y = -1.05;
      car.root.add(door);
    }
    if (dusty) car.root.rotation.x = 0.012;

    // The dais: fixed skirt with chaser bulbs, turning top.
    const DR = L / 2 + 0.28;
    const P = { chrome: ['#dfe3e6', '#f4f2ec', '#c9ccd0'], red: ['#d9a93a', '#a3161f', '#7d1019'], black: ['#d9a93a', '#17171b', '#d9a93a'], checker: ['#dfe3e6', '#f4f2ec', '#17171b'] }[a.dais];
    const skirt = s.material(a.dais === 'red' ? '#7d1019' : a.dais === 'black' ? '#17171b' : '#c9ccd0', { metalness: a.dais === 'chrome' || a.dais === 'checker' ? 0.9 : 0.2, roughness: 0.25 });
    s.cylinder(DR, DR + 0.14, DH - 0.06, [0, (DH - 0.06) / 2, 0], skirt, 56);
    s.cylinder(DR + 0.03, DR + 0.03, 0.05, [0, DH - 0.085, 0], s.material(P[0], { metalness: 0.9, roughness: 0.25 }), 56);
    s.cylinder(DR + 0.2, DR + 0.23, 0.05, [0, 0.025, 0], s.material(P[0], { metalness: 0.9, roughness: 0.25 }), 56);
    const topTexture = paint(512, 512, (c) => {
      c.fillStyle = P[1]; c.fillRect(0, 0, 512, 512);
      c.translate(256, 256);
      if (a.dais === 'checker') { c.fillStyle = P[2]; for (let x = -8; x < 8; x++) for (let y = -8; y < 8; y++) if ((x + y) & 1) c.fillRect(x * 32, y * 32, 32, 32); }
      else { c.fillStyle = P[2]; c.globalAlpha = a.dais === 'red' ? 0.6 : a.dais === 'chrome' ? 0.5 : 0.9; for (let i = 0; i < 16; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 256, i * 0.3927, i * 0.3927 + (a.dais === 'black' ? 0.09 : 0.196)); c.closePath(); c.fill(); } }
      c.globalAlpha = 1; c.strokeStyle = P[0]; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 248, 0, 7); c.stroke();
      if (dusty) { c.fillStyle = 'rgba(120,112,98,0.4)'; c.fillRect(-256, -256, 512, 512); }
    });
    const spin = new THREE.Group();
    spin.position.y = DH - 0.06;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(DR - 0.1, DR - 0.1, 0.06, 56), [skirt, new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.4 }), skirt]);
    top.position.y = 0.03; top.receiveShadow = true;
    car.root.position.y = 0.06;
    spin.add(top, car.root);
    spin.rotation.y = -0.55 + (random() - 0.5) * 0.5;
    s.root.add(spin);
    if (a.state === 'won') {
      const colours = ['#ff4f9e', '#f2c416', '#1f9ae0', '#3bd67a', '#ffffff', '#d3122a'];
      const bits = Array.from({ length: 160 }, () => { const r = Math.sqrt(random()) * (DR - 0.15), t = random() * 6.3; return { at: [Math.cos(t) * r, 0.07, Math.sin(t) * r] as const, size: 0.6 + random(), color: colours[Math.floor(random() * 6)] }; });
      const confetti = s.scatter(new THREE.BoxGeometry(0.07, 0.006, 0.04), new THREE.MeshStandardMaterial({ roughness: 0.6 }), bits);
      spin.add(confetti);
    }
    const count = Math.floor((Math.PI * 2 * DR) / 0.26 / 3) * 3;
    const groups: (readonly [number, number, number])[][] = [[], [], []];
    for (let i = 0; i < count; i++) { const t = (i / count) * Math.PI * 2; groups[i % 3].push([Math.cos(t) * (DR + 0.085), DH * 0.45, Math.sin(t) * (DR + 0.085)]); }
    const dead = dusty ? 0.25 : mood.wear * 0.12;
    const bulbs = groups.map((points, index) => {
      const material = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: index === 1 && mood.cheer > 0.5 ? '#ff9ad0' : '#ffd98a', emissiveIntensity: glow, roughness: 0.3 });
      s.scatter(new THREE.SphereGeometry(0.055, 10, 8), material, points.filter(() => random() >= dead).map((at) => ({ at, size: 1 }))).castShadow = false;
      return material;
    });

    // Placard on its own stand beside the dais.
    const text = { win: 'WIN THIS CAR', jackpot: 'JACKPOT', grand: 'GRAND PRIZE', play: '$1 TO PLAY', winner: 'WINNER!', tonight: 'DRAW TONIGHT' }[a.placard];
    const px = DR * 0.5, pz = DR * 0.87 + 0.42;
    const sign = new Sculpture(context);
    sign.cylinder(0.24, 0.27, 0.04, [0, 0.02, 0], chrome, 24);
    sign.cylinder(0.025, 0.025, 1.2, [0, 0.62, 0], chrome, 10);
    sign.box([1.24, 0.74, 0.05], [0, 1.45, 0], s.material(P[0] === '#d9a93a' ? '#d9a93a' : '#17171b', { metalness: 0.6, roughness: 0.3 }));
    const boardTexture = paint(512, 288, (c) => {
      c.fillStyle = '#b3101f'; c.fillRect(0, 0, 512, 288);
      c.fillStyle = '#ffe14a'; for (let i = 0; i < 22; i++) for (const y of [16, 272]) { c.beginPath(); c.arc(14 + i * 23, y, 6, 0, 7); c.fill(); }
      c.fillStyle = '#fff8dc'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const words = text.split(' ');
      if (words.length > 2) { c.font = 'bold 84px sans-serif'; c.fillText(words.slice(0, -1).join(' '), 256, 104, 470); c.font = 'bold 110px sans-serif'; c.fillStyle = '#ffe14a'; c.fillText(words[words.length - 1], 256, 200, 470); }
      else { c.font = 'bold 120px sans-serif'; c.fillStyle = '#ffe14a'; c.fillText(text, 256, 150, 470); }
    });
    const board = sign.mesh(new THREE.PlaneGeometry(1.16, 0.66), new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.5, emissive: '#ffffff', emissiveMap: boardTexture, emissiveIntensity: dusty ? 0.05 : glow * 0.45 }), [0, 1.45, 0.027]);
    board.castShadow = false;
    sign.root.position.set(px, 0, pz);
    sign.root.rotation.y = 0.25;
    s.root.add(sign.root);

    const speed = mix(0.25, 3, mood.energy), turn = a.turns ? mix(0.12, 0.6, mood.energy) : 0;
    return s.finish({
      footprint: DR + 0.45,
      update: (dt, time) => {
        spin.rotation.y += dt * turn;
        bulbs.forEach((material, index) => { material.emissiveIntensity = glow * (0.25 + 1.5 * Math.max(0, Math.sin(time * speed * 2 + index * 2.1))); });
      },
    });
  },
});
