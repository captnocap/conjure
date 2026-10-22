import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = readonly [number, number, number];
type Line = readonly (readonly [number, number])[];

const BODIES: Record<string, { top: Line; house: Line; hood: number; front: number; rear: number; pillar: number }> = {
  sedan: { top: [[-2.4, 0.93], [-2.3, 0.98], [-1.3, 1.0], [0.78, 1.0], [2.25, 0.94], [2.4, 0.86]], house: [[-1.32, 1.0], [-0.95, 1.43], [0.25, 1.45], [0.8, 1.0]], hood: 0.8, front: 2.4, rear: -2.4, pillar: -0.35 },
  wagon: { top: [[-2.45, 0.93], [-2.38, 1.0], [0.78, 1.0], [2.25, 0.94], [2.4, 0.86]], house: [[-2.36, 1.0], [-2.12, 1.44], [0.25, 1.46], [0.8, 1.0]], hood: 0.8, front: 2.4, rear: -2.45, pillar: -0.35 },
  coupe: { top: [[-2.3, 0.88], [-2.15, 0.96], [-1.5, 0.98], [0.5, 0.98], [2.3, 0.9], [2.42, 0.8]], house: [[-1.6, 0.98], [-0.5, 1.33], [0.05, 1.34], [0.55, 0.98]], hood: 0.55, front: 2.42, rear: -2.3, pillar: -0.5 },
  pickup: { top: [[-2.6, 0.98], [-2.55, 1.02], [0.85, 1.06], [2.15, 1.02], [2.4, 0.9]], house: [[-0.62, 1.04], [-0.56, 1.64], [0.42, 1.64], [0.86, 1.06]], hood: 0.88, front: 2.4, rear: -2.6, pillar: 0.1 },
};

function heightAt(line: Line, z: number) {
  if (z < line[0][0] || z > line[line.length - 1][0]) return 0;
  for (let i = 0; i + 1 < line.length; i++) if (z <= line[i + 1][0]) { const [z0, y0] = line[i], [z1, y1] = line[i + 1]; return y0 + (y1 - y0) * (z - z0) / Math.max(z1 - z0, 1e-6); }
  return line[line.length - 1][1];
}
/** A side profile (z, y) pulled across the car's width. */
function slab(shape: THREE.Shape, width: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2 - bevel, 0, 0);
  return g;
}

export default defineThing({
  questions: {
    body: choice('What kind of vehicle is it?', {
      sedan: 'A boxy four-door family sedan from around 1980.',
      pickup: 'A single-cab pickup truck with a long bed.',
      wagon: 'A long-roofed station wagon.',
      coupe: 'A long-hooded muscle coupe that was going to be something.',
    }),
    paint: choice('What colour was it painted?', {
      red: 'Red, oxidised to a chalky pink on the flat panels.',
      teal: 'Faded teal.',
      brown: 'Brown metallic, the colour of 1979.',
      white: 'Refrigerator white with rust at every seam.',
      yellow: 'Mustard yellow.',
      blue: 'Dark blue gone dull.',
      primer: 'Flat grey primer all over, waiting on paint that never came.',
    }),
    panel: choice('Is any panel a different colour?', {
      none: 'No, it is all one colour.',
      hood: 'The hood came off another car and is a different colour.',
      fender: 'One front fender is in grey primer.',
      spots: 'Grey filler patches are sanded smooth along the side but never painted.',
    }),
    progress: choice('How is the project going?', {
      'someone-under-it': 'Being worked on right now: hood up, toolbox open, a pair of boots sticking out from under it.',
      stalled: 'Stalled: hood up, a tarp pulled half over the back, parts still in their boxes.',
      'given-up': 'Given up: hood shut, weeds grown through the bumper and up the doors.',
      'parting-out': 'Being parted out: hood off and leaning on the side, engine sitting on the ground.',
    }),
    wheels: choice('Where are the wheels?', {
      gone: 'All four gone, sold long ago.',
      stacked: 'Stacked in a pile beside the car.',
      leaning: 'Two bald tyres lean against the side.',
      'one-on': 'Three are off; one flat one is still bolted on.',
    }),
    sign: choice('Is there a sign in the windshield?', {
      none: 'No sign.',
      'for-sale': 'FOR SALE $500 OBO.',
      runs: 'RUNS.',
      'no-tow': 'DO NOT TOW.',
      'not-for-sale': 'NOT FOR SALE, after too many people asked.',
    }),
    yard: choice('What sits on the ground around it?', {
      nothing: 'Nothing.',
      'oil-pan': 'A drain pan of black oil and a few empty oil jugs.',
      'jack-and-stands': 'A floor jack and a spare cinder block.',
      'seat': 'The bench seat pulled out and set on the dirt as a sofa.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context); // everything on the ground
    const car = new Sculpture(context); // everything that tilts with the body
    const { mood, random } = context;
    const B = BODIES[a.body];
    const W = a.body === 'pickup' ? 1.9 : 1.8, base = 0.44, zf = 1.48, zr = a.body === 'pickup' ? -1.55 : -1.45, arch = 0.42;
    const paintHex = { red: '#b8372c', teal: '#3f9a94', brown: '#7a5234', white: '#e9e6da', yellow: '#d2a62a', blue: '#2f4a78', primer: '#8a8d8e' }[a.paint];
    const sun = new THREE.Color(paintHex).lerp(new THREE.Color('#d9cfc4'), mood.wear * 0.38);
    const patina = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 6 + mood.wear * 10; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + random() * 0.3})`; c.fillStyle = `rgba(215,205,195,${0.25 * random()})`; c.beginPath(); c.ellipse(random() * 256, random() * 256, 30 + random() * 60, 20 + random() * 30, random() * 3, 0, 7); c.fill(); }
      for (let i = 0; i < mood.wear * mood.wear * 26 + 2; i++) {
        const x = random() * 256, y = random() * 256, r = 3 + random() * (5 + mood.wear * 13);
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(96,48,20,0.95)'); g.addColorStop(0.6, 'rgba(140,74,30,0.7)'); g.addColorStop(1, 'rgba(140,74,30,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(0.45, 0.45);
      return texture;
    })();
    const lacquer = (colour: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: colour, map: patina, roughness: mix(0.35, 0.9, mood.wear), metalness: a.paint === 'brown' ? 0.4 : 0.15 });
    const paint = lacquer(sun);
    const primer = lacquer('#8a8d8e');
    const chrome = s.material('#d6dadb', { metalness: mix(0.9, 0.5, mood.wear), roughness: mix(0.15, 0.6, mood.wear) });
    const dark = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: mood.wear > 0.85 ? '#59676a' : '#26343c', roughness: mix(0.08, 0.6, mood.wear), metalness: 0.3 });
    const rust = s.material('#7a4424', { roughness: 1 });
    const rubber = s.material('#1d1d1f', { roughness: 0.9 });

    // Lower body with open wheel arches.
    const lower = new THREE.Shape();
    lower.moveTo(B.rear + 0.1, base + 0.03); lower.lineTo(B.rear, base + 0.14);
    for (const [z, y] of B.top) lower.lineTo(z, y);
    lower.lineTo(B.front, base + 0.14); lower.lineTo(B.front - 0.1, base + 0.03);
    lower.lineTo(zf + arch, base); lower.absarc(zf, base, arch, 0, Math.PI, false);
    lower.lineTo(zr + arch, base); lower.absarc(zr, base, arch, 0, Math.PI, false);
    lower.lineTo(B.rear + 0.1, base + 0.03);
    car.mesh(slab(lower, W, 0.07), paint);
    const house = new THREE.Shape(B.house.map(([z, y]) => new THREE.Vector2(z, y - 0.02)));
    car.mesh(slab(house, W - 0.2, 0.03), glass);
    const roofZ0 = B.house[1][0], roofZ1 = B.house[2][0], roofY = Math.max(B.house[1][1], B.house[2][1]) + 0.02;
    const roofPaint = a.paint === 'white' || a.panel !== 'none' || random() < 0.6 ? paint : lacquer(new THREE.Color('#e9e6da'));
    car.box([W - 0.14, 0.1, roofZ1 - roofZ0 + 0.2], [0, roofY + 0.02, (roofZ0 + roofZ1) / 2], roofPaint);
    for (const x of [-1, 1]) {
      const px = x * (W / 2 - 0.11);
      car.rod([px, B.house[0][1], B.house[0][0] + 0.04], [px, roofY, roofZ0 - 0.04], 0.06, paint);
      car.rod([px, B.house[3][1], B.house[3][0] - 0.04], [px, roofY, roofZ1 + 0.04], 0.055, paint);
      if (a.body !== 'coupe') car.box([0.07, roofY - 1.0, 0.12], [px, (roofY + 1.0) / 2, B.pillar], paint);
      // Door seams, handle and a strip of side trim.
      for (const z of a.body === 'pickup' ? [-0.55, 0.78] : a.body === 'coupe' ? [-0.75, 0.55] : [-1.2, -0.3, 0.75]) car.box([0.012, 0.46, 0.018], [x * (W / 2 + 0.002), 0.76, z], dark);
      car.box([0.014, 0.035, B.front - B.rear - 0.5], [x * (W / 2 + 0.003), 0.74, (B.front + B.rear) / 2], chrome);
      car.box([0.03, 0.03, 0.13], [x * (W / 2 + 0.008), 0.9, B.pillar + 0.22], chrome);
    }
    if (a.body === 'pickup') {
      // The bed: a dark floor ringed by raised rails.
      car.box([W - 0.34, 0.02, 1.9], [0, 1.03, -1.6], dark);
      for (const x of [-1, 1]) car.box([0.14, 0.1, 1.98], [x * (W / 2 - 0.09), 1.06, -1.6], paint);
      car.box([W - 0.04, 0.1, 0.1], [0, 1.06, -0.66], paint);
      const gate = car.box([W - 0.06, 0.1, 0.08], [0, 1.06, -2.56], paint);
      if (mood.wear > 0.6) gate.visible = false;
      for (let i = 0; i < Math.round(mood.density * 5); i++) car.box([0.3 + random() * 0.4, 0.12 + random() * 0.2, 0.3 + random() * 0.3], [(random() - 0.5) * 1.0, 1.12, -1.0 - random() * 1.2], s.material(['#6a5a44', '#8d9396', '#b98d5a', '#3a4a3a'][i % 4])).rotation.y = random();
    }

    // Faces: bumpers, grille, lamps.
    const droop = mood.wear > 0.55 ? (random() - 0.5) * 0.3 : 0;
    const frontBumper = car.box([W + 0.06, 0.14, 0.13], [0, 0.6 + Math.abs(droop) * -0.25, B.front + 0.03], chrome);
    frontBumper.rotation.z = droop;
    if (!(a.progress === 'parting-out' && mood.wear > 0.5)) car.box([W + 0.06, 0.14, 0.13], [0, 0.6, B.rear - 0.03], chrome);
    const noseY = heightAt(B.top, B.front) - 0.13;
    car.box([W - 0.7, 0.2, 0.05], [0, noseY, B.front + 0.012], dark);
    for (let i = 0; i < 4; i++) car.box([W - 0.72, 0.012, 0.06], [0, noseY - 0.075 + i * 0.05, B.front + 0.014], chrome);
    const missingLamp = mood.wear > 0.45 ? (random() < 0.5 ? -1 : 1) : 0;
    for (const x of [-1, 1]) {
      const lamp = car.cylinder(0.095, 0.095, 0.05, [x * (W / 2 - 0.2), noseY, B.front + 0.015], x === missingLamp ? dark : new THREE.MeshStandardMaterial({ color: '#eef2e6', roughness: 0.15, metalness: 0.3, emissive: '#fff6d0', emissiveIntensity: 0.08 }), 14);
      lamp.rotation.x = Math.PI / 2;
      car.box([0.26, 0.11, 0.04], [x * (W / 2 - 0.22), heightAt(B.top, B.rear) - 0.16, B.rear - 0.005], new THREE.MeshStandardMaterial({ color: '#9a1f1c', roughness: 0.3, emissive: '#5a0c0a', emissiveIntensity: 0.25 }));
    }
    car.label(['4KJ 928', 'LVN 351', 'EXPIRED', 'TRK 5150'][Math.floor(random() * 4)], 0.3, 0.14, [0, 0.62, B.rear - 0.1], '#22305a', '#e8e4d2').rotation.y = Math.PI;

    // Bare hubs where the wheels were.
    const tyre = (to: Sculpture, at: P, lying: boolean, flat = false) => {
      const t = new Sculpture(context);
      const g = new THREE.TorusGeometry(0.24, 0.115, 8, 20);
      const ring = t.mesh(g, rubber);
      ring.scale.z = 1.05;
      t.cylinder(0.17, 0.17, 0.16, [0, 0, 0], s.material(mood.wear > 0.5 ? '#6f5a4a' : '#b9bfc2', { metalness: 0.5, roughness: 0.5 }), 14).rotation.x = Math.PI / 2;
      t.cylinder(0.07, 0.07, 0.18, [0, 0, 0], chrome, 10).rotation.x = Math.PI / 2;
      if (flat) ring.scale.y = 0.86;
      t.root.position.set(...at);
      if (lying) t.root.rotation.x = Math.PI / 2;
      to.root.add(t.root);
      return t.root;
    };
    const corners: [number, number][] = [[-1, zf], [1, zf], [-1, zr], [1, zr]];
    const keeper = a.wheels === 'one-on' ? 2 + Math.floor(random() * 2) : -1;
    corners.forEach(([x, z], index) => {
      if (index === keeper) { tyre(car, [x * (W / 2 - 0.13), base - 0.02, z], false, true).rotation.y = Math.PI / 2; return; }
      const hub = car.cylinder(0.15, 0.15, 0.09, [x * (W / 2 - 0.16), base, z], rust, 14);
      hub.rotation.z = Math.PI / 2;
      car.cylinder(0.05, 0.05, 0.16, [x * (W / 2 - 0.13), base, z], rust, 8).rotation.z = Math.PI / 2;
      car.cylinder(0.3, 0.3, 0.3, [x * (W / 2 - 0.34), base + 0.06, z], dark, 12).rotation.z = Math.PI / 2;
    });
    car.box([0.08, 0.08, zf - zr], [0, base - 0.06, (zf + zr) / 2], dark);

    // Hood and what is under it.
    const hoodLength = B.top[B.top.length - 2][0] - B.hood + 0.05;
    const hoodY = heightAt(B.top, B.hood) + 0.012;
    const slope = Math.atan2(heightAt(B.top, B.hood) - B.top[B.top.length - 2][1], hoodLength);
    const hoodPaint = a.panel === 'hood' ? lacquer(a.paint === 'primer' ? '#b8372c' : a.paint === 'white' ? '#2f4a78' : '#8a8d8e') : paint;
    const hoodOpen = a.progress === 'someone-under-it' || a.progress === 'stalled';
    const hoodOff = a.progress === 'parting-out';
    const hood = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.035, hoodLength), hoodPaint);
    panel.position.z = hoodLength / 2;
    panel.castShadow = panel.receiveShadow = true;
    hood.add(panel);
    if (hoodOff) {
      hood.position.set(-(W / 2 + 0.24), (W - 0.2) / 2 * 0.97, -0.9);
      hood.rotation.set(0, 0, Math.PI / 2 - 0.2);
      s.root.add(hood);
    } else {
      hood.position.set(0, hoodY, B.hood);
      hood.rotation.x = hoodOpen ? -mix(0.8, 1.05, random()) : slope;
      car.root.add(hood);
    }
    if (hoodOpen || hoodOff) {
      car.box([W - 0.3, 0.03, hoodLength - 0.12], [0, hoodY - 0.01 - Math.sin(slope) * hoodLength / 2, B.hood + hoodLength / 2], dark).rotation.x = slope;
      const bayZ = B.hood + hoodLength * 0.5;
      if (hoodOpen) {
        car.rod([W / 2 - 0.2, hoodY - 0.02, B.hood + hoodLength - 0.1], [W / 2 - 0.2, hoodY + Math.sin(-hood.rotation.x) * hoodLength * 0.7, B.hood + Math.cos(hood.rotation.x) * hoodLength * 0.7], 0.012, chrome);
        car.box([0.62, 0.22, 0.72], [0, hoodY + 0.02, bayZ - 0.05], s.material('#5a5f63', { metalness: 0.5, roughness: 0.6 }));
        for (const x of [-0.2, 0.2]) car.box([0.16, 0.06, 0.66], [x, hoodY + 0.15, bayZ - 0.05], s.material(mood.cheer > 0.5 ? '#c8632a' : '#3a5a8a', { roughness: 0.5 }));
        car.cylinder(0.2, 0.2, 0.08, [0, hoodY + 0.22, bayZ - 0.05], chrome, 16);
        car.box([0.22, 0.18, 0.16], [W / 2 - 0.36, hoodY + 0.02, bayZ + 0.35], dark);
        car.box([W - 0.6, 0.2, 0.05], [0, hoodY - 0.02, B.hood + hoodLength - 0.12], s.material('#2c2f30', { metalness: 0.4 }));
      }
    }

    // Mismatched or unfinished panels.
    if (a.panel === 'fender') {
      const side = random() < 0.5 ? -1 : 1;
      car.box([0.03, 0.34, 0.5], [side * (W / 2 + 0.004), 0.82, zf + 0.62], primer);
      car.box([0.03, 0.12, 1.3], [side * (W / 2 + 0.004), 0.93, zf + 0.05], primer);
      car.box([0.03, 0.34, 0.36], [side * (W / 2 + 0.004), 0.8, zf - 0.6], primer);
    } else if (a.panel === 'spots') {
      for (let i = 0; i < 7; i++) { const side = i % 2 ? -1 : 1; const spot = car.cylinder(0.1 + random() * 0.14, 0.1, 0.012, [side * (W / 2 + 0.004), 0.62 + random() * 0.3, mix(B.rear + 0.3, B.front - 0.3, random())], primer, 10); spot.rotation.z = Math.PI / 2; spot.scale.z = 1 + random(); }
    }
    if (a.sign !== 'none') {
      const text = { 'for-sale': 'FOR SALE $500 OBO', runs: 'RUNS', 'no-tow': 'DO NOT TOW', 'not-for-sale': 'NOT FOR SALE' }[a.sign];
      const [z0, y0] = B.house[3], [z1, y1] = B.house[2];
      const tiltBack = Math.atan2(z0 - z1, y1 - y0);
      const card = car.label(text, 0.75, 0.24, [(random() - 0.5) * 0.3, (y0 + y1) / 2, (z0 + z1) / 2 + 0.04], a.sign === 'for-sale' ? '#c81e1e' : '#1c1c1c', a.sign === 'for-sale' ? '#f6e84a' : '#f1ecda');
      card.rotation.x = -tiltBack;
    }
    if (a.progress === 'stalled') {
      // A tarp pulled over the back half and weighted with a brick.
      const topLine = (z: number) => Math.max(heightAt(B.top, z), heightAt(B.house, z) + 0.04, 0);
      const g = new THREE.PlaneGeometry(W + 1.3, 3.2, 14, 12);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      const startZ = a.body === 'pickup' ? -2.75 : B.rear - 0.25;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i) + startZ + 1.6;
        const over = Math.max(0, Math.abs(x) - (W / 2 - 0.05));
        const behind = Math.max(0, B.rear + 0.05 - z);
        const crown = topLine(Math.min(Math.max(z, B.rear + 0.02), B.front));
        const y = Math.max(0.5 + Math.sin(i * 1.7) * 0.08, crown + 0.035 - over * 2.6 - behind * 3 + Math.sin(x * 5 + z * 3) * 0.02);
        p.setXYZ(i, Math.sign(x) * Math.min(Math.abs(x), W / 2 + 0.06 + Math.min(over, 0.12)) , y, z);
      }
      g.computeVertexNormals();
      const tarpColour = mood.cheer > 0.5 ? '#2f6fc0' : '#6f7a6a';
      car.mesh(g, new THREE.MeshStandardMaterial({ color: tarpColour, roughness: 0.7, side: THREE.DoubleSide }));
      const brickZ = startZ + 1.2;
      car.box([0.2, 0.07, 0.1], [0.2, topLine(brickZ) + 0.08, brickZ], s.material('#9a4a34')).rotation.y = 0.5;
    }

    // The blocks it stands on.
    const blockSkin = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#a3a39c'; c.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '70,70,66' : '200,200,192'},0.35)`; c.fillRect(random() * 128, random() * 64, 2, 2); }
      c.fillStyle = '#3c3c39';
      for (const x of [14, 72]) c.fillRect(x, 12, 42, 40);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const blockMaterial = new THREE.MeshStandardMaterial({ map: blockSkin, roughness: 1 });
    const block = (at: P, turn = 0) => { const b = s.box([0.4, 0.195, 0.2], at, blockMaterial); b.rotation.y = turn; return b; };
    let slump = 0;
    for (const [x, z] of corners) {
      const bz = z + (z > 0 ? -0.72 : 0.72), bx = x * (W / 2 - 0.38);
      const short = mood.wear > 0.5 && x === 1 && z < 0;
      block([bx, 0.0975, bz], (random() - 0.5) * 0.3);
      if (!short) block([bx + (random() - 0.5) * 0.04, 0.2925, bz], Math.PI / 2 + (random() - 0.5) * 0.3);
      else { slump = 0.045; block([bx + 0.5, 0.0975, bz - 0.3], 0.8).rotation.z = 0.2; s.box([0.3, 0.08, 0.2], [bx, 0.235, bz], s.material('#8a6a44', { roughness: 1 })); }
      if (!short) s.box([0.3, 0.045, 0.12], [bx, 0.41, bz], s.material('#9a7a50', { roughness: 1 })).rotation.y = random();
    }
    car.root.rotation.set(-slump * 0.6, 0, -slump);
    car.root.position.y = -slump * 0.5;
    s.root.add(car.root);

    // Around it.
    const side = W / 2;
    if (a.wheels === 'stacked') for (let i = 0; i < 3 + Math.round(random()); i++) tyre(s, [side + 0.75 + (random() - 0.5) * 0.06, 0.12 + i * 0.235, -1.3 + (random() - 0.5) * 0.06], true);
    if (a.wheels === 'leaning') for (let i = 0; i < 2; i++) { const t = tyre(s, [side + 0.17, 0.34, -0.9 + i * 0.85], false); t.rotation.set(0, Math.PI / 2, 0); t.rotateX(0); t.rotation.z = 0.0; t.position.x += 0.02; t.rotateY(0); t.rotateX(i ? 0.1 : -0.06); t.rotation.z = -0.18; }
    if (a.progress === 'someone-under-it') {
      const denim = s.material('#3f5a86', { roughness: 0.95 }), boot = s.material('#6a4426', { roughness: 0.8 });
      for (const dz of [-0.13, 0.13]) {
        s.rod([side - 0.3, 0.1, 0.1 + dz], [side + 0.55, 0.09, 0.1 + dz * 1.6], 0.075, denim);
        s.box([0.12, 0.26, 0.11], [side + 0.6, 0.13, 0.1 + dz * 1.7], boot).rotation.x = dz * 2;
      }
      // Toolbox, open, with a tray of sockets.
      const red = s.material('#b8281f', { roughness: 0.45, metalness: 0.3 });
      s.box([0.55, 0.2, 0.24], [side + 0.75, 0.1, 1.1], red).rotation.y = 0.3;
      const lid = s.box([0.55, 0.03, 0.24], [side + 0.82, 0.3, 0.98], red);
      lid.rotation.set(1.2, 0.3, 0, 'YXZ');
      s.scatter(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), chrome, Array.from({ length: 6 }, () => ({ at: [side + 0.5 + random() * 0.6, 0.012, 0.5 + random() * 0.35] as P, size: 1 }))).rotation.set(0, 0, 0);
      s.ball([0.06, 0.06, 0.06], [side + 0.35, 0.36, 1.5], new THREE.MeshStandardMaterial({ color: '#fff3c0', emissive: '#ffd870', emissiveIntensity: 1.2 }), 10);
      s.rod([side + 0.35, 0, 1.5], [side + 0.35, 0.3, 1.5], 0.012, dark);
    }
    if (a.progress === 'parting-out') {
      const iron = s.material('#5a5f63', { metalness: 0.5, roughness: 0.6 });
      const ex = side + 0.9, ez = 1.5;
      tyre(s, [ex, 0.12, ez], true);
      s.box([0.5, 0.42, 0.66], [ex, 0.45, ez], iron).rotation.y = 0.4;
      s.cylinder(0.19, 0.19, 0.08, [ex, 0.7, ez], chrome, 14);
      s.box([0.24, 0.3, 0.4], [ex + 0.05, 0.4, ez - 0.48], iron).rotation.y = 0.4;
    }
    if (a.progress === 'stalled') for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) s.box([0.3 + random() * 0.2, 0.18 + random() * 0.15, 0.28], [-(side + 0.5 + random() * 0.3), 0.12, -0.6 + i * 0.5], s.material(i % 2 ? '#b98d5a' : '#e9e0c4', { roughness: 0.9 })).rotation.y = random();
    if (a.yard === 'oil-pan') {
      s.cylinder(0.24, 0.2, 0.08, [-(side + 0.5), 0.04, 1.3], dark, 18);
      s.cylinder(0.215, 0.215, 0.01, [-(side + 0.5), 0.078, 1.3], new THREE.MeshStandardMaterial({ color: '#0c0b0a', roughness: 0.05, metalness: 0.4 }), 18);
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) { const jug = s.box([0.09, 0.24, 0.16], [-(side + 0.3 + random() * 0.6), 0.12, 0.7 - i * 0.24], s.material(['#e9c62a', '#2f5a9a', '#b8281f'][i % 3], { roughness: 0.45 })); if (random() < 0.4) { jug.rotation.z = Math.PI / 2; jug.position.y = 0.05; } }
    } else if (a.yard === 'jack-and-stands') {
      const jackRed = s.material('#b8281f', { metalness: 0.3, roughness: 0.5 });
      s.box([0.26, 0.12, 0.62], [-(side + 0.55), 0.09, 1.0], jackRed).rotation.y = 0.5;
      s.rod([-(side + 0.4), 0.14, 0.75], [-(side + 0.95), 0.62, 0.4], 0.018, dark);
      s.cylinder(0.07, 0.07, 0.03, [-(side + 0.62), 0.17, 1.14], chrome, 12);
      block([-(side + 0.55), 0.0975, 0.1], 0.4);
    } else if (a.yard === 'seat') {
      const vinyl = s.material(a.paint === 'brown' || a.paint === 'yellow' ? '#8a5a34' : '#7a2f2a', { roughness: 0.6 });
      const sx = -(side + 0.8);
      const cushion = s.box([0.55, 0.2, 1.4], [sx, 0.16, 0.2], vinyl);
      const back = s.box([0.18, 0.55, 1.4], [sx - 0.27, 0.45, 0.2], vinyl);
      cushion.rotation.y = back.rotation.y = 0.12; back.rotation.z = 0.2;
      for (let i = 0; i < 5; i++) s.box([0.56, 0.205, 0.015], [sx, 0.16, -0.36 + i * 0.28], dark).rotation.y = 0.12;
    }

    // Weeds through the bumper and along the sills, more the longer it has sat.
    const growth = (a.progress === 'given-up' ? 1 : a.progress === 'stalled' ? 0.55 : 0.2) * mix(0.5, 1, mood.wear);
    const weeds: { at: P; size: number; color: string }[] = [];
    const sprout = (x: number, z: number, tall: number) => weeds.push({ at: [x, tall * 0.22, z], size: tall, color: new THREE.Color(random() < 0.3 + mood.wear * 0.4 ? '#a59a4e' : '#5d9442').offsetHSL(0, 0, (random() - 0.5) * 0.12).getStyle() });
    for (let i = 0; i < 90 * growth; i++) sprout((random() - 0.5) * (W + 0.3), B.front - 0.1 + random() * 0.45, 0.8 + random() * 2.4 * growth);
    for (let i = 0; i < 160 * growth; i++) { const x = (random() < 0.5 ? -1 : 1) * (W / 2 + (random() - 0.35) * 0.3); sprout(x, mix(B.rear - 0.3, B.front, random()), 0.5 + random() * 2.2 * growth); }
    for (let i = 0; i < 12; i++) sprout((random() - 0.5) * W, B.front + random() * 0.3, 0.6 + random());
    s.scatter(new THREE.ConeGeometry(0.024, 0.44, 4), s.material('#ffffff', { roughness: 1 }), weeds);
    if (growth > 0.6) s.scatter(new THREE.IcosahedronGeometry(0.035, 0), s.material('#f2d23a', { roughness: 0.8 }), weeds.filter((_w, i) => i % 9 === 0).map((w) => ({ at: [w.at[0], w.at[1] * 2, w.at[2]] as P, size: 1 })));

    const work = a.progress === 'someone-under-it' ? mix(0.2, 1, mood.energy) : 0;
    return s.finish({ update: (_dt, time) => { if (!hoodOff && hoodOpen) hood.rotation.z = Math.sin(time * 9) * 0.004 * work; } });
  },
});
