import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P2 = readonly [number, number];
interface Style {
  length: number; width: number; bottom: number; wheel: number; axles: P2;
  top: readonly P2[]; cabin: readonly [P2, P2, P2, P2]; round: boolean; chrome: boolean; years: readonly string[]; bed?: P2;
}
// Side profiles: x runs rear (-) to front (+), y is height. The car is turned to face +z afterwards.
const STYLES: Record<string, Style> = {
  nineties: { length: 4.7, width: 1.76, bottom: 0.24, wheel: 0.31, axles: [-1.4, 1.42], round: true, chrome: false, years: ["'94", "'96", "'98"],
    top: [[-2.35, 0.62], [-2.28, 0.9], [-1.4, 0.96], [0.9, 0.96], [2.0, 0.82], [2.35, 0.64]], cabin: [[-1.6, 0.94], [-0.95, 1.42], [0.15, 1.42], [1.02, 0.94]] },
  eighties: { length: 4.5, width: 1.72, bottom: 0.25, wheel: 0.3, axles: [-1.3, 1.38], round: false, chrome: true, years: ["'84", "'86", "'88"],
    top: [[-2.25, 0.6], [-2.25, 0.9], [-1.35, 0.92], [0.85, 0.92], [2.2, 0.86], [2.25, 0.6]], cabin: [[-1.42, 0.92], [-1.1, 1.4], [0.3, 1.4], [0.82, 0.92]] },
  seventies: { length: 5.4, width: 1.96, bottom: 0.25, wheel: 0.34, axles: [-1.65, 1.62], round: false, chrome: true, years: ["'72", "'76", "'78"],
    top: [[-2.7, 0.58], [-2.7, 0.83], [-1.5, 0.87], [0.3, 0.89], [2.62, 0.85], [2.7, 0.58]], cabin: [[-1.62, 0.87], [-0.85, 1.31], [-0.05, 1.31], [0.5, 0.88]] },
  pickup: { length: 5.2, width: 1.92, bottom: 0.38, wheel: 0.39, axles: [-1.55, 1.62], round: false, chrome: true, years: ["'79", "'87", "'93"], bed: [-2.5, -0.42],
    top: [[-2.6, 0.72], [-2.6, 1.02], [-0.35, 1.02], [0.95, 1.04], [2.5, 0.98], [2.6, 0.72]], cabin: [[-0.34, 1.03], [-0.24, 1.72], [0.72, 1.72], [1.16, 1.03]] },
  hatchback: { length: 3.8, width: 1.6, bottom: 0.22, wheel: 0.28, axles: [-1.15, 1.2], round: true, chrome: false, years: ["'89", "'92", "'01"],
    top: [[-1.9, 0.56], [-1.86, 0.9], [-1.5, 0.92], [0.62, 0.92], [1.72, 0.8], [1.9, 0.58]], cabin: [[-1.84, 0.92], [-1.3, 1.4], [0.02, 1.4], [0.68, 0.92]] },
  suv: { length: 4.6, width: 1.84, bottom: 0.4, wheel: 0.39, axles: [-1.35, 1.42], round: false, chrome: false, years: ["'95", "'99", "'03"],
    top: [[-2.3, 0.72], [-2.3, 1.06], [-1.0, 1.07], [0.85, 1.07], [2.2, 1.0], [2.3, 0.72]], cabin: [[-2.26, 1.06], [-2.1, 1.76], [0.25, 1.76], [0.9, 1.06]] },
};
const PAINT = { red: '#a3140d', white: '#ecebe4', silver: '#aab0b4', teal: '#1f7f82', gold: '#b99a5b', blue: '#27478f', black: '#202226', brown: '#6b4630' } as const;
const PITCH: Record<string, readonly string[]> = {
  runs: ['RUNS GREAT!', 'COLD A/C'],
  credit: ['NO CREDIT? OK!', '$99 DOWN'],
  owner: ['1 OWNER', 'LOW MILES'],
  asis: ['AS IS', 'MECHANIC SPECIAL'],
  wow: ['WOW!!', 'MUST GO'],
  first: ['1ST CAR?', 'GAS SAVER'],
  sold: ['SOLD', 'THANK YOU'],
};
const PRICES = ['$495', '$995', '$1,995', '$2,995', '$4,995', '$7,995', '$12,995'];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    style: choice('What kind of car is it, and from when?', {
      nineties: 'A rounded 1990s family sedan, the anonymous jellybean everyone had.',
      eighties: 'A boxy 1980s economy sedan, all straight lines and chrome bumpers.',
      seventies: 'A long-hooded 1970s personal coupe with a vinyl roof, a land yacht.',
      pickup: 'A single-cab pickup truck with a long bed.',
      hatchback: 'A tiny commuter hatchback, the classic first car.',
      suv: 'A tall boxy 1990s SUV.',
    }),
    paint: choice('What colour is it?', {
      red: 'Resale red.', white: 'Appliance white.', silver: 'Silver, like every other car.', teal: 'Nineties teal.',
      gold: 'Champagne gold.', blue: 'Dark blue.', black: 'Black.', brown: 'Chocolate brown.',
    }),
    price: score('How much is scrawled on the windshield?', ['A few hundred dollars: a beater', 'A couple of thousand', 'A cream puff, well into five figures']),
    pitch: choice('What is the pitch written under the price?', {
      runs: 'RUNS GREAT! COLD A/C: honest-ish reassurance.',
      credit: 'NO CREDIT? OK! $99 DOWN: buy here, pay here.',
      owner: '1 OWNER, LOW MILES: the little old lady story.',
      asis: 'AS IS, MECHANIC SPECIAL: it does not run.',
      wow: 'WOW!! MUST GO: pure volume.',
      first: '1ST CAR? GAS SAVER: aimed at a teenager and a nervous parent.',
      sold: 'SOLD, THANK YOU: somebody drove a hard bargain today.',
    }),
    polish: choice('What colour is the window paint?', {
      white: 'White shoe polish.', yellow: 'Fluorescent yellow.', pink: 'Hot pink.', green: 'Lime green.', mixed: 'Every marker they had.',
    }),
    hat: choice('What is on the roof?', {
      tent: 'A yellow A-frame SALE tent sign.',
      year: 'A plastic model-year number sign.',
      flags: 'Clip-on window flags.',
      star: 'A big foam starburst on a spring.',
      none: 'Nothing.',
    }),
    mirror: choice('What is tied to the wing mirror?', {
      balloons: 'A bunch of bright balloons.',
      mylar: 'One big foil star balloon.',
      ribbon: 'A streamer of plastic ribbon.',
      none: 'Nothing.',
    }),
    story: choice('What is its story on the lot?', {
      detailed: 'Front-row star: washed, waxed, tyres shined.',
      backrow: 'Back-row lifer: dusty, one tyre gone flat, leaves in the wiper well.',
      hoodup: 'Hood propped open to show the engine, or because it needed a jump.',
      tradein: 'Fresh trade-in, still wearing its old life: roof rack, one odd-coloured door, a missing hubcap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const style = STYLES[a.style];
    const { length, width, bottom, wheel } = style;
    const dusty = a.story === 'backrow' ? 0.45 : a.story === 'detailed' ? 0 : 0.15;
    const dull = Math.min(1, dusty + mood.wear * 0.6);
    const bodyColour = new THREE.Color(PAINT[a.paint]).lerp(new THREE.Color('#8f8573'), dull * 0.3);
    const body = new THREE.MeshStandardMaterial({ color: bodyColour, roughness: mix(0.22, 0.85, dull), metalness: mix(0.35, 0.05, dull) });
    const glass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#22313b').lerp(new THREE.Color('#8a8474'), dull * 0.4), roughness: mix(0.08, 0.5, dull), metalness: 0.4 });
    const chrome = s.material('#d5d9db', { metalness: 0.9, roughness: 0.22 });
    const black = s.material('#16171a', { roughness: 0.85 });
    const rubber = s.material('#1b1b1d', { roughness: a.story === 'detailed' ? 0.4 : 0.95 });

    // Everything is modelled in profile space (x = along the car) inside `car`, then turned to face +z.
    const car = new THREE.Group();
    car.rotation.y = -Math.PI / 2;
    s.root.add(car);
    const add = <T extends THREE.Object3D>(node: T) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); car.add(node); return node; };
    const boxAt = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at);
      return add(mesh);
    };

    // ---- body -----------------------------------------------------------------
    const arch = wheel + 0.07;
    const phi = Math.asin(Math.min(0.99, (wheel - bottom) / arch));
    const outline = new THREE.Shape();
    outline.moveTo(-length / 2, bottom);
    const top = style.top.map(([x, y]) => new THREE.Vector2(x, y));
    if (style.round) { outline.lineTo(top[0].x, top[0].y); outline.splineThru(top.slice(1)); }
    else for (const point of top) outline.lineTo(point.x, point.y);
    outline.lineTo(length / 2, bottom);
    outline.absarc(style.axles[1], wheel, arch, -phi, Math.PI + phi, false);
    outline.absarc(style.axles[0], wheel, arch, -phi, Math.PI + phi, false);
    outline.lineTo(-length / 2, bottom);
    const bevel = style.round ? 0.11 : 0.045;
    const bodyGeometry = new THREE.ExtrudeGeometry(outline, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: style.round ? 3 : 1, curveSegments: 10 });
    bodyGeometry.translate(0, 0, -(width - bevel * 2) / 2);
    add(new THREE.Mesh(bodyGeometry, body));

    // ---- cabin ----------------------------------------------------------------
    const [rearBase, rearTop, frontTop, frontBase] = style.cabin;
    const cabinWidth = width * 0.84;
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(rearBase[0], rearBase[1] - 0.05);
    cabinShape.lineTo(rearTop[0], rearTop[1]);
    cabinShape.lineTo(frontTop[0], frontTop[1]);
    cabinShape.lineTo(frontBase[0], frontBase[1] - 0.05);
    const cabinGeometry = new THREE.ExtrudeGeometry(cabinShape, { depth: cabinWidth - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 1 });
    cabinGeometry.translate(0, 0, -(cabinWidth - 0.1) / 2);
    add(new THREE.Mesh(cabinGeometry, glass));
    const vinyl = a.style === 'seventies' ? s.material(a.paint === 'white' ? '#2a211c' : '#e9e2d0', { roughness: 0.95 }) : body;
    boxAt([frontTop[0] - rearTop[0] + 0.12, 0.05, cabinWidth + 0.02], [(frontTop[0] + rearTop[0]) / 2, frontTop[1] + 0.035, 0], vinyl);
    const pillar = (from: P2, to: P2, radius: number, material: THREE.Material) => {
      for (const side of [-1, 1]) {
        const p = new THREE.Vector3(from[0], from[1], side * (cabinWidth / 2 - 0.01)), q = new THREE.Vector3(to[0], to[1] + 0.03, side * (cabinWidth / 2 - 0.01));
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, p.distanceTo(q), 6), material);
        rod.position.copy(p).add(q).multiplyScalar(0.5);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
        add(rod);
      }
    };
    pillar(frontBase, frontTop, 0.04, body);
    pillar(rearBase, rearTop, a.style === 'seventies' || a.style === 'pickup' ? 0.09 : 0.055, vinyl);
    const midX = (rearTop[0] + frontTop[0]) / 2 - 0.05;
    if (a.style !== 'seventies' && a.style !== 'pickup') pillar([midX, rearBase[1]], [midX, frontTop[1] - 0.03], 0.04, body);

    if (style.bed) boxAt([style.bed[1] - style.bed[0], 0.04, width - 0.24], [(style.bed[0] + style.bed[1]) / 2, style.top[1][1] + 0.005, 0], black);

    // ---- trim -----------------------------------------------------------------
    const belt = frontBase[1];
    const nose = style.top[style.top.length - 1][1];
    const bumper = style.chrome ? chrome : new THREE.MeshStandardMaterial({ color: bodyColour.clone().multiplyScalar(0.8), roughness: 0.6 });
    boxAt([0.14, 0.15, width + 0.04], [length / 2 + 0.02, bottom + 0.09, 0], bumper);
    boxAt([0.14, 0.15, width + 0.04], [-length / 2 - 0.02, bottom + 0.09, 0], bumper);
    const faceY = (nose + bottom + 0.16) / 2 + 0.02, faceH = Math.max(0.12, nose - bottom - 0.22);
    boxAt([0.05, faceH, width * 0.5], [length / 2 + bevel * 0.75, faceY, 0], black);
    for (let i = 0; i < 5; i++) boxAt([0.06, 0.012, width * 0.48], [length / 2 + bevel * 0.76, faceY - faceH / 2 + (i + 0.5) * faceH / 5, 0], chrome);
    const night = mood.daylight < 0.12 || mood.daylight > 0.88;
    const lamp = new THREE.MeshStandardMaterial({ color: '#f4f1e2', roughness: 0.2, emissive: '#fff2c4', emissiveIntensity: night && a.story !== 'backrow' ? 1.2 : 0.08 });
    const tail = new THREE.MeshStandardMaterial({ color: '#a8141a', roughness: 0.3, emissive: '#ff2a2a', emissiveIntensity: night ? 0.7 : 0.1 });
    for (const side of [-1, 1]) {
      const headlight = style.round
        ? add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), lamp))
        : boxAt([0.05, faceH * 0.9, width * 0.17], [0, 0, 0], lamp);
      headlight.position.set(length / 2 + bevel * 0.72, faceY, side * width * 0.36);
      if (style.round) headlight.scale.set(0.05, faceH * 0.42, width * 0.11);
      boxAt([0.05, 0.12, width * 0.2], [-length / 2 - bevel * 0.72, style.top[1][1] - 0.14, side * width * 0.36], tail);
      // mirrors, door lines and handles
      boxAt([0.07, 0.1, 0.16], [frontBase[0] - 0.08, belt + 0.07, side * (width / 2 + 0.05)], side === 1 ? body : body);
      const doorFront = frontBase[0] - 0.12, doorRear = a.style === 'pickup' ? rearBase[0] + 0.05 : a.style === 'seventies' || a.style === 'hatchback' ? midX - 0.55 : midX;
      for (const x of a.style === 'pickup' || a.style === 'seventies' || a.style === 'hatchback' ? [doorFront, doorRear] : [doorFront, midX, Math.max(rearBase[0] + 0.25, style.axles[0] + arch * 0.6)])
        boxAt([0.012, belt - bottom - 0.16, 0.01], [x, (belt + bottom) / 2 + 0.03, side * (width / 2 + 0.002)], black);
      boxAt([0.12, 0.025, 0.02], [doorFront - 0.82, belt - 0.12, side * (width / 2 + 0.008)], style.chrome ? chrome : black);
      if (a.story === 'tradein' && side === 1) {
        const odd = new THREE.MeshStandardMaterial({ color: new THREE.Color(a.paint === 'silver' ? '#7b2a22' : '#8f9497'), roughness: 0.9 });
        boxAt([doorFront - doorRear - 0.03, belt - bottom - 0.2, 0.012], [(doorFront + doorRear) / 2, (belt + bottom) / 2 + 0.04, side * (width / 2 + 0.003)], odd);
      }
    }
    // dealer plate
    const plate = s.label('DEALER', 0.32, 0.15, [0, 0, 0], '#1b3a8a', '#f2f0e4');
    plate.removeFromParent();
    plate.position.set(length / 2 + 0.095, bottom + 0.1, 0);
    plate.rotation.y = Math.PI / 2;
    add(plate);

    // ---- wheels ---------------------------------------------------------------
    const flat = a.story === 'backrow' ? (random() < 0.5 ? 0 : 1) : -1;
    const missingCap = a.story === 'tradein' || mood.wear > 0.75 ? Math.floor(random() * 2) * 2 + 1 : -1;
    let index = 0;
    for (const axle of style.axles) for (const side of [-1, 1]) {
      const squash = index === flat * 2 + 1 ? 0.8 : 1;
      const tyre = add(new THREE.Mesh(new THREE.CylinderGeometry(wheel, wheel, 0.22, 20), rubber));
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(axle, wheel * squash, side * (width / 2 - 0.13));
      tyre.scale.set(1, 1, squash);
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(wheel * 0.62, wheel * 0.62, 0.03, 16), index === missingCap ? black : chrome));
      cap.rotation.x = Math.PI / 2;
      cap.position.set(axle, wheel * squash, side * (width / 2 - 0.01));
      index++;
    }

    // ---- windshield writing -----------------------------------------------------
    const slopeX = frontBase[0] - frontTop[0], slopeY = frontTop[1] - frontBase[1];
    const slope = Math.hypot(slopeX, slopeY);
    const inks = { white: '#ffffff', yellow: '#f6ff3a', pink: '#ff5fb4', green: '#8dff4a' };
    const inkList = Object.values(inks);
    const ink = (i: number) => (a.polish === 'mixed' ? inkList[i % inkList.length] : inks[a.polish]);
    const lines = PITCH[a.pitch];
    const price = PRICES[Math.min(PRICES.length - 1, Math.floor(a.price * PRICES.length))];
    const writing = paint(512, 256, (ctx) => {
      ctx.clearRect(0, 0, 512, 256);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const scrawl = (text: string, x: number, y: number, size: number, colour: string, tilt: number) => {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(tilt);
        ctx.font = `italic bold ${size}px "Comic Sans MS", "Marker Felt", "Trebuchet MS", sans-serif`;
        const fit = Math.min(1, 470 / ctx.measureText(text).width);
        ctx.scale(fit, 1);
        ctx.lineWidth = size * 0.1; ctx.strokeStyle = colour; ctx.fillStyle = colour;
        ctx.strokeText(text, 0, 0); ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      if (a.pitch === 'sold') {
        scrawl('SOLD', 256, 110, 150, ink(1), -0.1);
        scrawl(lines[1], 256, 212, 44, ink(0), 0.03);
      } else {
        scrawl(price, 256, 84, 118, ink(0), (random() - 0.5) * 0.12);
        scrawl(lines[0], 256, 172, 54, ink(1), (random() - 0.5) * 0.08);
        scrawl(lines[1], 256, 224, 42, ink(2), (random() - 0.5) * 0.08);
      }
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(cabinWidth * 0.9, slope * 0.9),
      new THREE.MeshStandardMaterial({ map: writing, transparent: true, alphaTest: 0.25, roughness: 0.8, emissive: '#ffffff', emissiveMap: writing, emissiveIntensity: 0.35 }));
    // plane normal starts as +z in car space; turn it to face forward (+x) and lean it back with the glass
    screen.rotation.order = 'YXZ';
    screen.rotation.y = Math.PI / 2;
    screen.rotation.x = -Math.atan2(slopeX, slopeY);
    const normal = new THREE.Vector3(slopeY, slopeX, 0).normalize();
    screen.position.set((frontBase[0] + frontTop[0]) / 2, (frontBase[1] + frontTop[1]) / 2 - 0.01, 0).addScaledVector(normal, 0.055);
    car.add(screen);
    if (a.story === 'backrow') {
      const leaf = s.material('#8a6a2c', { side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) boxAt([0.07, 0.006, 0.045], [frontBase[0] + 0.07 + random() * 0.08, frontBase[1] + 0.03, (random() - 0.5) * cabinWidth * 0.9], leaf).rotation.y = random() * 3;
    }

    // ---- hood up --------------------------------------------------------------
    if (a.story === 'hoodup') {
      const hoodLength = length / 2 - frontBase[0] - 0.25;
      const hood = new THREE.Group();
      hood.position.set(frontBase[0] + 0.12, belt + 0.02, 0);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(hoodLength, 0.035, width * 0.86), body);
      panel.position.x = hoodLength / 2;
      hood.add(panel);
      hood.rotation.z = 0.85;
      add(hood);
      boxAt([hoodLength * 0.9, 0.02, width * 0.8], [frontBase[0] + 0.15 + hoodLength / 2, belt - 0.005 - (belt - nose) * 0.5, 0], black).rotation.z = -Math.atan2(belt - nose, hoodLength) * 0.6;
      const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, hoodLength * 0.72, 5), chrome);
      prop.position.set(frontBase[0] + 0.15 + hoodLength * 0.72, belt + hoodLength * 0.27, width * 0.3);
      prop.rotation.z = 0.25;
      add(prop);
    }

    // ---- roof hat -------------------------------------------------------------
    const roofY = frontTop[1] + 0.06, roofX = (frontTop[0] + rearTop[0]) / 2;
    if (a.story === 'tradein') {
      for (const x of [rearTop[0] + 0.15, frontTop[0] - 0.15]) boxAt([0.04, 0.04, cabinWidth + 0.1], [x, roofY + 0.07, 0], black);
      for (const z of [-1, 1]) boxAt([frontTop[0] - rearTop[0] - 0.1, 0.03, 0.03], [roofX, roofY + 0.1, z * cabinWidth * 0.45], black);
    }
    const hatBase = roofY + (a.story === 'tradein' ? 0.1 : 0);
    if (a.hat === 'tent') {
      for (const side of [-1, 1]) {
        const face = s.label(a.pitch === 'sold' ? 'SOLD' : 'SALE!', 0.9, 0.42, [0, 0, 0], '#c81e1e', '#ffe23a');
        face.removeFromParent();
        face.position.set(roofX + side * 0.12, hatBase + 0.2, 0);
        face.rotation.order = 'YXZ';
        face.rotation.y = side * Math.PI / 2;
        face.rotation.x = -0.5;
        add(face);
      }
    } else if (a.hat === 'year') {
      boxAt([0.06, 0.16, 0.06], [roofX, hatBase + 0.08, 0], black);
      const face = s.label(style.years[Math.floor(random() * style.years.length)], 0.62, 0.38, [0, 0, 0], '#ffffff', '#d21f1f');
      face.removeFromParent();
      face.position.set(roofX + 0.036, hatBase + 0.34, 0);
      face.rotation.y = Math.PI / 2;
      add(face);
      boxAt([0.07, 0.4, 0.66], [roofX, hatBase + 0.34, 0], s.material('#d21f1f'));
    } else if (a.hat === 'flags') {
      const flagColours = ['#d22b2b', '#f5f2ea', '#22459c', '#ffcf1f'];
      for (const side of [-1, 1]) for (const x of [rearTop[0] + 0.25, frontTop[0] - 0.2]) {
        boxAt([0.015, 0.5, 0.015], [x, roofY + 0.2, side * (cabinWidth / 2 + 0.02)], s.material('#f5f2ea'));
        const flag = boxAt([0.3, 0.2, 0.006], [x - 0.15, roofY + 0.34, side * (cabinWidth / 2 + 0.02)], s.material(flagColours[Math.floor(random() * 4)], { side: THREE.DoubleSide }));
        flag.rotation.y = (random() - 0.5) * 0.7;
      }
    } else if (a.hat === 'star') {
      const star = new THREE.Shape();
      for (let i = 0; i < 20; i++) {
        const r = i % 2 ? 0.2 : 0.38, angle = (i / 20) * Math.PI * 2;
        if (i === 0) star.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); else star.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      const burst = add(new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#ffd21f', roughness: 0.5, emissive: '#ffd21f', emissiveIntensity: 0.15 })));
      burst.rotation.y = Math.PI / 2;
      burst.position.set(roofX - 0.025, hatBase + 0.62, 0);
      boxAt([0.02, 0.3, 0.02], [roofX, hatBase + 0.15, 0], chrome);
      const face = s.label(a.pitch === 'sold' ? 'SOLD' : 'WOW', 0.34, 0.16, [0, 0, 0], '#c81e1e', '#ffd21f');
      face.removeFromParent();
      face.position.set(roofX + 0.03, hatBase + 0.62, 0);
      face.rotation.y = Math.PI / 2;
      add(face);
    }

    // ---- mirror dressing ------------------------------------------------------
    const bobbers: { node: THREE.Object3D; phase: number; reach: number }[] = [];
    const anchor = new THREE.Vector3(frontBase[0] - 0.08, belt + 0.12, width / 2 + 0.08);
    const balloonColours = ['#e3342f', '#ffcf1f', '#1f6fd8', '#2f9e44', '#ff5fa8', '#f5f2ea'];
    const limp = dull > 0.55;
    if (a.mirror === 'balloons' || a.mirror === 'mylar') {
      const count = a.mirror === 'mylar' ? 1 : 3 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const pivot = new THREE.Group();
        pivot.position.copy(anchor);
        const sag = limp && random() < 0.6;
        const reach = sag ? 0.5 + random() * 0.3 : 0.75 + random() * 0.6;
        pivot.rotation.set((random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7 + (sag ? Math.PI * 0.82 : 0));
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, reach, 4), s.material('#f1eee4'));
        string.position.y = reach / 2;
        const colour = balloonColours[Math.floor(random() * balloonColours.length)];
        const balloon = a.mirror === 'mylar'
          ? new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: '#e8eaee', metalness: 0.9, roughness: 0.2 }))
          : new THREE.Mesh(new THREE.SphereGeometry(sag ? 0.1 : 0.15, 12, 10), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.25, emissive: colour, emissiveIntensity: 0.1 }));
        balloon.scale.set(1, a.mirror === 'mylar' ? 1 : 1.25, a.mirror === 'mylar' ? 0.35 : 1);
        balloon.position.y = reach + (sag ? 0.1 : 0.17);
        pivot.add(string, balloon);
        add(pivot);
        if (!sag) bobbers.push({ node: pivot, phase: random() * 6.28, reach: pivot.rotation.z });
      }
    } else if (a.mirror === 'ribbon') {
      for (let i = 0; i < 4; i++) {
        const ribbon = boxAt([0.9 + random() * 0.5, 0.03, 0.004], [0, 0, 0], s.material(balloonColours[i], { side: THREE.DoubleSide }));
        ribbon.geometry.translate(-ribbon.geometry.parameters.width / 2, 0, 0);
        ribbon.position.copy(anchor);
        ribbon.rotation.set((random() - 0.5) * 0.5, (random() - 0.5) * 0.4, -0.25 - random() * 0.6);
      }
    }

    const sway = mix(0.03, 0.2, mood.energy), speed = mix(0.8, 3.2, mood.energy);
    return s.finish({
      footprint: length / 2,
      update: bobbers.length ? (_dt, time) => { for (const bob of bobbers) bob.node.rotation.z = bob.reach + Math.sin(time * speed + bob.phase) * sway; } : undefined,
    });
  },
});
