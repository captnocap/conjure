import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LIVERY = {
  white: 'White with a broad green stripe, a modern contractor fleet.',
  green: 'Dark municipal green all over.',
  orange: 'Bright safety orange.',
  blue: 'Sky blue, faded on the sunny side.',
  yellow: 'Canary yellow with black trim.',
  maroon: 'Maroon and cream, an old corporation livery.',
} as const;
const BODY: Record<keyof typeof LIVERY, string> = { white: '#e9e8e0', green: '#2d6a4b', orange: '#e2661f', blue: '#6ea3c9', yellow: '#e6bb22', maroon: '#7b2a2e' };
const SLOGAN = { clean: 'KEEP OUR CITY CLEAN', dept: 'CLEANSING DEPT', recycle: 'REDUCE REUSE RECYCLE', services: 'WASTE SERVICES', away: 'THERE IS NO AWAY', none: '' } as const;

export default defineThing({
  questions: {
    style: choice('What country and era is the truck from?', {
      euro: 'A modern European low-entry truck: flat glassy cab near the ground, tall ribbed body, hi-vis chevrons on the back.',
      american: 'A big American cab-over with a chrome grille, twin exhaust stacks and a long three-axle body.',
      japanese: 'A small neat Japanese packer, short and narrow, with a rounded body and a tune-playing speaker on the roof.',
      soviet: 'A 1970s Eastern Bloc truck with a rounded bonnet, round headlamps and a plain box body.',
      vintage: 'A 1950s British dustcart: bulbous cab, split windscreen, barrel-roofed body.',
    }),
    state: choice('What is it doing?', {
      driving: 'Driving its round with everything closed up.',
      loading: 'Stopped and loading: bags in the hopper, a wheelie bin on the lift, the packer blade mid-sweep.',
      tipping: 'Tipping: tailgate swung high, body tilted, the load sliding out behind in a heap.',
      parked: 'Parked up empty at the end of the shift, hopper washed out.',
    }),
    livery: choice('What colour is the body?', LIVERY),
    slogan: choice('What is written along the side?', {
      clean: 'KEEP OUR CITY CLEAN', dept: 'CLEANSING DEPT', recycle: 'REDUCE REUSE RECYCLE', services: 'WASTE SERVICES',
      away: 'THERE IS NO AWAY, a slogan somebody meant.', none: 'Nothing.',
    }),
    mascot: choice('Is a rescued toy tied to the front grille?', {
      none: 'No, the grille is bare.',
      teddy: 'A grimy teddy bear, strapped on like a figurehead.',
      rabbit: 'A long-eared plush rabbit, once pink.',
      doll: 'A plastic doll with wild hair.',
      flowers: 'A garland of plastic flowers.',
      duck: 'A big yellow rubber duck.',
    }),
    crew: choice('Who is riding on the back?', {
      none: 'Nobody: just the driver in the cab.',
      one: 'One loader in hi-vis hanging on the step.',
      two: 'Two loaders in hi-vis, one each side.',
    }),
    beacon: noul('Are amber beacons flashing on the roof?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const t = new Sculpture(context);
    s.root.add(t.root);
    const { mood, random } = context;
    const grime = new THREE.Color('#6a5a44');
    const euro = a.style === 'euro', us = a.style === 'american', jp = a.style === 'japanese', su = a.style === 'soviet', old = a.style === 'vintage';
    const bodyHex = BODY[a.livery];
    const paint = t.material(new THREE.Color(bodyHex).lerp(grime, mood.wear * 0.3), { roughness: 0.5 });
    const cabHex = old ? (a.livery === 'maroon' ? '#7b2a2e' : '#e8dfc4') : su ? '#3f6f9f' : a.livery === 'white' || euro || jp ? '#eceae2' : bodyHex;
    const cabPaint = t.material(new THREE.Color(cabHex).lerp(grime, mood.wear * 0.25), { roughness: 0.45 });
    const stripe = t.material(a.livery === 'white' ? '#3b8a52' : a.livery === 'maroon' ? '#e8dfc4' : '#f1efe6');
    const dark = t.material('#232527', { roughness: 0.8 });
    const steel = t.material(new THREE.Color('#9aa0a2').lerp(new THREE.Color('#7c4a2d'), mood.wear * 0.5), { metalness: 0.6, roughness: 0.45 });
    const chrome = t.material('#dadfe1', { metalness: 0.9, roughness: 0.18 });
    const glass = t.material('#2f434c', { roughness: 0.12, metalness: 0.4 });
    const night = 1 - Math.sin(mood.daylight * Math.PI);
    const lamp = t.material('#fff4c8', { emissive: '#ffe9a0', emissiveIntensity: a.state === 'parked' ? 0.05 : mix(0.3, 2.2, night) });
    const red = t.material('#d02a22', { emissive: '#d01a12', emissiveIntensity: a.state === 'parked' ? 0.1 : 0.9 });
    const rbox = (rig: Sculpture, size: [number, number, number], at: [number, number, number], material: THREE.Material, radius: number) =>
      rig.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, Math.min(...size) / 2 - 0.005)), material, at);

    const W = 2.45, rear = -3.0, bodyFront = su || old ? 1.3 : 1.9, bodyH = old ? 1.9 : jp ? 2.0 : 2.3, deck = 1.0;
    const front = su ? 4.35 : old ? 4.0 : 4.2;

    // Chassis, tanks, bumpers, wheels.
    t.box([0.95, 0.26, front - rear - 0.3], [0, deck - 0.15, (front + rear) / 2], dark);
    t.cylinder(0.3, 0.3, 0.9, [1.0, 0.75, 0.9], steel, 14).rotation.x = Math.PI / 2;
    t.box([0.5, 0.45, 0.6], [-1.0, 0.75, 0.9], dark);
    const wheels: THREE.Object3D[] = [];
    const axle = (z: number, dual: boolean) => {
      for (const e of [-1, 1]) {
        const wheel = new THREE.Group();
        const width = dual ? 0.56 : 0.32;
        const tyre = t.cylinder(0.52, 0.52, width, [0, 0, 0], dark, 20);
        const hub = t.cylinder(0.26, 0.26, width + 0.04, [0, 0, 0], us ? chrome : steel, 12);
        const nut = t.box([width + 0.08, 0.1, 0.1], [0, 0, 0], steel);
        for (const part of [tyre, hub]) part.rotation.z = Math.PI / 2;
        wheel.add(tyre, hub, nut);
        wheel.position.set(e * (W / 2 - width / 2 - 0.02), 0.52, z);
        t.root.add(wheel);
        wheels.push(wheel);
      }
      t.cylinder(0.09, 0.09, W - 0.4, [0, 0.52, z], dark, 8).rotation.z = Math.PI / 2;
    };
    const frontAxle = su ? 3.45 : old ? 3.1 : euro || jp ? 3.35 : 3.2;
    axle(frontAxle, false);
    if (us || euro) { axle(-0.7, true); axle(-1.95, true); } else axle(-1.3, true);
    for (const z of us || euro ? [-0.7, -1.95] : [-1.3]) for (const e of [-1, 1]) t.box([0.6, 0.05, 1.25], [e * (W / 2 - 0.3), 1.12, z], dark);

    // Cab.
    const cabL = su ? 1.45 : old ? 1.7 : 2.1, cabZ = bodyFront + 0.12 + cabL / 2;
    const cabY0 = euro || jp ? 0.5 : us ? 0.95 : 0.9, cabH = euro ? 2.15 : jp ? 2.0 : us ? 2.15 : su ? 1.55 : 1.75;
    const cabTop = cabY0 + cabH, face = cabZ + cabL / 2;
    rbox(t, [W - 0.05, cabH, cabL], [0, cabY0 + cabH / 2, cabZ], cabPaint, old ? 0.4 : su ? 0.18 : 0.08);
    const sill = cabY0 + cabH * (euro || jp ? 0.42 : 0.5), glassH = cabTop - sill - 0.22;
    if (old) for (const e of [-1, 1]) t.box([0.9, glassH, 0.06], [e * 0.52, sill + glassH / 2, face - 0.08], glass).rotation.y = e * 0.22;
    else t.box([W - 0.4, glassH, 0.06], [0, sill + glassH / 2, face], glass);
    for (const e of [-1, 1]) {
      t.box([0.06, glassH * 0.9, cabL * 0.55], [e * (W / 2 - 0.03), sill + glassH / 2, cabZ + 0.1], glass);
      t.box([0.06, 0.02, cabL * 0.62], [e * (W / 2 - 0.025), cabY0 + 0.25, cabZ], dark);
      t.rod([e * (W / 2), sill + 0.2, face - 0.1], [e * (W / 2 + 0.28), sill + 0.5, face + 0.05], 0.02, dark);
      t.box([0.05, 0.42, 0.22], [e * (W / 2 + 0.3), sill + 0.55, face + 0.06], dark);
    }
    let nose = face;
    if (su || old) {
      const hoodL = front - face, hoodH = su ? 0.95 : 0.85;
      rbox(t, [su ? 1.5 : 1.6, hoodH, hoodL + 0.3], [0, cabY0 + hoodH / 2 + 0.05, face + hoodL / 2 - 0.15], cabPaint, su ? 0.3 : 0.35);
      for (const e of [-1, 1]) {
        const fender = t.cylinder(0.72, 0.72, 0.5, [e * 0.98, 0.62, frontAxle], cabPaint, 18);
        fender.rotation.z = Math.PI / 2;
        fender.scale.set(0.75, 1, 1);
        t.ball([0.15, 0.15, 0.08], [e * (su ? 0.95 : 0.6), su ? 1.2 : 1.35, front - (su ? 0.25 : 0.02)], lamp, 12);
      }
      nose = front;
      for (let i = 0; i < 7; i++) t.box([0.05, hoodH * 0.6, 0.04], [-0.33 + i * 0.11, cabY0 + hoodH * 0.5, front + 0.01], su ? dark : chrome);
    } else {
      const grilleY = cabY0 + (us ? 0.55 : 0.35);
      t.box([us ? 1.3 : 1.7, us ? 0.9 : 0.35, 0.05], [0, grilleY, face + 0.02], us ? chrome : dark);
      if (us) for (let i = 0; i < 6; i++) t.box([1.2, 0.03, 0.03], [0, grilleY - 0.35 + i * 0.14, face + 0.05], dark);
      for (const e of [-1, 1]) t.box([0.3, 0.16, 0.05], [e * 0.95, cabY0 + 0.22, face + 0.02], lamp);
      if (us) {
        t.box([W, 0.1, 0.35], [0, cabTop - 0.15, face + 0.15], cabPaint).rotation.x = 0.25;
        for (const e of [-1, 1]) { t.cylinder(0.07, 0.07, 2.6, [e * 1.0, 2.2, bodyFront + 0.02], chrome, 10); t.cylinder(0.09, 0.09, 0.8, [e * 1.0, 1.7, bodyFront + 0.02], steel, 10); }
      }
      if (euro || jp) t.box([W - 0.3, 0.3, 0.05], [0, cabTop - 0.2, face - 0.01], dark);
    }
    t.box([W + 0.02, 0.28, 0.2], [0, 0.6, nose + (su || old ? 0.02 : 0.05)], su || old ? chrome : dark);
    if (jp) {
      t.box([0.5, 0.2, 0.3], [0, cabTop + 0.1, cabZ], steel);
      t.cylinder(0.14, 0.08, 0.25, [0, cabTop + 0.1, cabZ + 0.25], steel, 12).rotation.x = Math.PI / 2;
      t.box([W - 0.03, 0.2, cabL + 0.01], [0, cabY0 + 0.75, cabZ], t.material('#4a8fc4'));
    }
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (a.beacon) {
      beacon = t.material('#ff9a1c', { emissive: '#ff8a00', emissiveIntensity: 1.4 });
      for (const e of [-1, 1]) { t.cylinder(0.09, 0.1, 0.16, [e * 0.75, cabTop + 0.08, cabZ - 0.2], beacon, 12); }
    }
    if (!su && !old && !us) t.cylinder(0.06, 0.06, 1.6, [W / 2 - 0.15, cabTop - 0.2, bodyFront + 0.03], steel, 8);

    // Body, hinged at the rear of the chassis so it can tip.
    const tipping = a.state === 'tipping';
    const body = new Sculpture(context);
    body.root.position.set(0, deck, rear);
    t.root.add(body.root);
    const L = bodyFront - rear;
    rbox(body, [W, bodyH, L], [0, bodyH / 2, L / 2], paint, old || jp ? 0.25 : 0.06);
    if (old || jp) { const roof = body.cylinder(W / 2 - 0.02, W / 2 - 0.02, L - 0.1, [0, bodyH - 0.15, L / 2], paint, 20); roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.42); }
    const ribs = old ? 0 : jp ? 3 : 6;
    for (let i = 0; i < ribs; i++) for (const e of [-1, 1]) body.box([0.06, bodyH - 0.3, 0.09], [e * (W / 2 + 0.01), bodyH / 2, 0.35 + i * (L - 0.7) / Math.max(ribs - 1, 1)], paint);
    if (old) for (const e of [-1, 1]) for (let i = 0; i < 3; i++) { body.box([0.04, bodyH * 0.55, L / 3 - 0.2], [e * (W / 2 + 0.005), bodyH * 0.55, L / 6 + i * L / 3], stripe); body.box([0.06, 0.05, 0.3], [e * (W / 2 + 0.02), bodyH * 0.35, L / 6 + i * L / 3], chrome); }
    if (a.livery === 'white' || a.livery === 'maroon') for (const e of [-1, 1]) body.box([0.02, 0.35, L - 0.2], [e * (W / 2 + 0.045), bodyH * 0.3, L / 2], stripe);
    const text = SLOGAN[a.slogan];
    if (text) for (const e of [-1, 1]) {
      const label = body.label(text, L - 0.5, 0.62, [e * (W / 2 + 0.06), bodyH * 0.68, L / 2], a.livery === 'white' ? '#2d6a4b' : a.livery === 'yellow' ? '#1c1c1c' : '#f3f0e4', bodyHex);
      label.rotation.y = e * Math.PI / 2;
    }
    body.box([W - 0.3, 0.1, 0.5], [0, bodyH + 0.03, L - 0.5], dark);

    // Tailgate with hopper, hinged at the top rear of the body.
    const gate = new Sculpture(context);
    gate.root.position.set(0, bodyH, 0);
    body.root.add(gate.root);
    const gh = bodyH + 0.6, gl = jp ? 1.15 : 1.45;
    const profile = new THREE.Shape([[0, 0], [-gl * 0.62, 0], [-gl, -gh * 0.38], [-gl, -gh * 0.7], [-gl * 0.75, -gh], [0, -gh]].map(([z, y]) => new THREE.Vector2(z, y)));
    const shell = new THREE.ExtrudeGeometry(profile, { depth: W, bevelEnabled: false });
    shell.rotateY(-Math.PI / 2).translate(W / 2, 0, 0);
    gate.mesh(shell, paint);
    // The open mouth: dark hopper, packer blade, whatever is in it.
    const mouthMid: [number, number, number] = [0, -gh * 0.54, -gl - 0.005];
    gate.box([W - 0.3, gh * 0.34, 0.03], mouthMid, dark);
    const loading = a.state === 'loading';
    const blade = gate.box([W - 0.4, 0.05, 0.5], [0, -gh * (loading ? 0.5 : 0.42), -gl + 0.12], steel);
    blade.rotation.x = loading ? 0.7 : 0.2;
    gate.box([W - 0.2, 0.1, 0.12], [0, -gh * 0.71, -gl - 0.03], steel);
    if (euro) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f2d21c'; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#d2271e';
      for (let i = -2; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 64); ctx.lineTo(i * 32 + 16, 64); ctx.lineTo(i * 32 + 48, 0); ctx.lineTo(i * 32 + 32, 0); ctx.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const chevrons = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, side: THREE.DoubleSide });
      const upper = gate.mesh(new THREE.PlaneGeometry(W - 0.1, 0.5), chevrons, [0, -gh * 0.19, -gl * 0.81 - 0.02]);
      upper.rotation.set(-Math.atan2(gl * 0.38, gh * 0.38), Math.PI, 0);
      gate.mesh(new THREE.PlaneGeometry(W - 0.1, 0.3), chevrons, [0, -gh * 0.86, -gl * 0.87 - 0.03]).rotation.set(Math.atan2(gl * 0.25, gh * 0.3), Math.PI, 0);
    }
    for (const e of [-1, 1]) {
      gate.box([0.14, 0.3, 0.05], [e * (W / 2 - 0.12), -gh * 0.8, -gl * 0.9 - 0.02], red);
      gate.box([0.14, 0.12, 0.05], [e * (W / 2 - 0.12), -gh * 0.1, -gl * 0.66 - 0.02], t.material('#ffb02a', { emissive: '#ff9a10', emissiveIntensity: 0.6 }));
      gate.box([0.42, 0.05, 0.45], [e * (W / 2 - 0.2), -gh + 0.08, -gl - 0.05], steel);
      gate.rod([e * (W / 2 + 0.03), -gh * 0.72, -gl * 0.95], [e * (W / 2 + 0.03), -gh * 0.3, -gl * 0.85], 0.022, chrome);
      gate.rod([e * (W / 2 + 0.02), -gh * 0.1, -0.1], [e * (W / 2 + 0.02), -gh * 0.75, -gl * 0.5], 0.05, chrome);
    }
    const junk = ['#1f2023', '#1f2023', '#e9e6dc', '#4d7fb5', '#c5a06c', '#c9483a', '#d9c04a', '#6f9a5c', '#8d9296'];
    const junkColour = () => new THREE.Color(junk[Math.floor(random() * junk.length)]).lerp(grime, mood.wear * 0.4);
    if (loading) {
      const bag = gate.material('#1f2023', { roughness: 0.35 });
      for (let i = 0; i < Math.round(mix(3, 8, mood.density)); i++) gate.ball([0.24, 0.2, 0.22], [(random() - 0.5) * (W - 0.8), -gh * 0.63 + random() * 0.12, -gl + 0.05 + random() * 0.12], i % 3 ? bag : gate.material(junkColour()), 8);
    }
    if (tipping) { body.root.rotation.x = -0.52; gate.root.rotation.x = -1.25; }
    if (tipping) t.rod([0, deck - 0.1, rear + 2.3], [0, deck + Math.sin(0.52) * (L - 0.9), rear + Math.cos(0.52) * (L - 0.9)], 0.09, chrome);

    // Loose scene around it: bins, the tipped load, the crew.
    const k = jp ? 0.74 : 1;
    t.root.scale.setScalar(k);
    const back = (rear - gl) * k;
    if (loading) {
      const binHex = ['#3d7a4a', '#2c2f33', '#3b6fa8', '#6b4a2e'][Math.floor(random() * 4)], plastic = s.material(binHex, { roughness: 0.6 });
      const bin = new Sculpture(context);
      bin.mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.95, 4).rotateY(Math.PI / 4), plastic, [0, 0.58, 0]);
      bin.box([0.52, 0.05, 0.56], [0, 1.08, -0.02], plastic).rotation.x = -0.9;
      for (const e of [-1, 1]) bin.cylinder(0.1, 0.1, 0.05, [e * 0.22, 0.1, -0.2], s.material('#1c1c1c'), 10).rotation.z = Math.PI / 2;
      bin.root.position.set(0.55 * k, 0.55 * k, back - 0.25);
      bin.root.rotation.x = -0.75;
      s.root.add(bin.root);
      const bag = s.material('#1f2023', { roughness: 0.35 });
      for (let i = 0; i < Math.round(mix(2, 7, mood.density)); i++) {
        const x = -0.4 - random() * 1.6, z = back - 0.5 - random() * 0.9;
        s.ball([0.3, 0.26, 0.28], [x, 0.24, z], bag, 8);
        s.ball([0.06, 0.08, 0.06], [x, 0.52, z], bag, 6);
      }
    }
    if (tipping) {
      const n = Math.round(mix(90, 190, mood.density));
      s.scatter(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: n }, () => {
        const u = random(), x = (random() - 0.5) * 2.6 * (0.6 + u * 0.7), z = back + 0.6 - u * 3.4;
        const ridge = Math.sin(Math.min(1, u * 1.5) * Math.PI) * mix(0.9, 1.5, mood.density) * (1 - Math.abs(x) / 2.4);
        return { at: [x, Math.max(0.08, ridge * random()), z] as const, size: 0.25 + random() * 0.4, color: junkColour() };
      }));
      // A few pieces still falling from the open body.
      s.scatter(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: 9 }, (_u, i) => ({ at: [(random() - 0.5) * 1.6, (deck + 0.3 - i * 0.08) * k + random() * 0.3, rear * k - 0.2 - i * 0.12] as const, size: 0.25 + random() * 0.3, color: junkColour() })));
    }
    const crewCount = { none: 0, one: 1, two: 2 }[a.crew];
    for (let i = 0; i < crewCount; i++) {
      const e = i === 0 ? -1 : 1;
      const p = new Sculpture(context);
      const vis = p.material(i === 0 ? '#e8e21f' : '#f27a1a', { roughness: 0.7, emissive: i === 0 ? '#5a5600' : '#5a2a00', emissiveIntensity: 0.4 }), cloth = p.material('#27303a'), skin = p.material(['#e2b58f', '#9a6a44', '#c48a5c', '#6a4630'][Math.floor(random() * 4)]), band = p.material('#d9dde0', { metalness: 0.5, roughness: 0.3 });
      for (const leg of [-1, 1]) p.box([0.15, 0.85, 0.17], [leg * 0.1, 0.43, 0], cloth);
      p.box([0.44, 0.62, 0.26], [0, 1.16, 0], vis);
      for (const y of [0.98, 1.2]) p.box([0.45, 0.05, 0.27], [0, y, 0], band);
      p.ball([0.115, 0.13, 0.12], [0, 1.62, 0], skin, 12);
      p.ball([0.125, 0.07, 0.13], [0, 1.72, 0], vis, 10);
      const riding = a.state === 'driving' || a.state === 'parked';
      p.rod([e * 0.24, 1.4, 0], riding ? [e * 0.3, 1.75, 0.3] : [e * 0.3, 0.95, 0.12], 0.055, vis);
      p.rod([-e * 0.24, 1.4, 0], [-e * 0.3, 0.9, 0.05], 0.055, vis);
      if (riding) { p.root.position.set(e * (W / 2 - 0.2) * k, (deck + bodyH - gh + 0.12) * k, back - 0.08); p.root.rotation.y = e * 0.5; }
      else if (loading) { p.root.position.set(e * 1.5 + (e < 0 ? -0.2 : 0.4), 0, back - 0.7 - i * 0.5); p.root.rotation.y = -e * 0.9; }
      else { p.root.position.set(e * (W / 2 * k + 0.9), 0, rear * k + 1.2 + i * 0.6); p.root.rotation.y = -e * 2.2; }
      s.root.add(p.root);
    }

    // The mascot on the grille.
    if (a.mascot !== 'none') {
      const m = new Sculpture(context);
      const soiled = (hex: string) => m.material(new THREE.Color(hex).lerp(grime, 0.15 + mood.wear * 0.45), { roughness: 1 });
      if (a.mascot === 'teddy' || a.mascot === 'rabbit') {
        const fur = soiled(a.mascot === 'teddy' ? '#b98a52' : '#e9a9b8');
        m.ball([0.16, 0.19, 0.13], [0, 0, 0], fur, 10);
        m.ball([0.13, 0.13, 0.12], [0, 0.27, 0.02], fur, 10);
        m.ball([0.06, 0.05, 0.05], [0, 0.24, 0.13], soiled('#f0e2c4'), 8);
        for (const e of [-1, 1]) {
          if (a.mascot === 'teddy') m.ball([0.055, 0.055, 0.03], [e * 0.1, 0.38, 0], fur, 8);
          else m.ball([0.04, 0.17, 0.025], [e * 0.07, 0.5, 0], fur, 8).rotation.z = -e * 0.25;
          m.ball([0.055, 0.13, 0.055], [e * 0.2, 0.05, 0.03], fur, 8).rotation.z = e * 1.0;
          m.ball([0.065, 0.13, 0.065], [e * 0.1, -0.22, 0.05], fur, 8);
          m.ball([0.018, 0.018, 0.012], [e * 0.045, 0.3, 0.12], m.material('#111'), 6);
        }
      } else if (a.mascot === 'doll') {
        const skin = m.material('#efc9ad', { roughness: 0.4 });
        m.cylinder(0.06, 0.15, 0.3, [0, -0.05, 0], soiled('#c8496a'), 10);
        m.ball([0.1, 0.11, 0.1], [0, 0.22, 0], skin, 10);
        m.ball([0.13, 0.11, 0.1], [0, 0.27, -0.03], soiled('#e9d36a'), 8);
        for (const e of [-1, 1]) { m.rod([e * 0.06, 0.08, 0], [e * 0.22, 0.16, 0.02], 0.022, skin); m.rod([e * 0.05, -0.2, 0], [e * 0.08, -0.38, 0.03], 0.025, skin); m.ball([0.016, 0.02, 0.01], [e * 0.04, 0.23, 0.095], m.material('#2a4a7a'), 6); }
      } else if (a.mascot === 'duck') {
        const yellow = m.material('#f2cf1f', { roughness: 0.35 });
        m.ball([0.2, 0.15, 0.17], [0, -0.05, 0], yellow, 12);
        m.ball([0.12, 0.12, 0.12], [0, 0.16, 0.06], yellow, 12);
        m.ball([0.07, 0.03, 0.07], [0, 0.14, 0.17], m.material('#e8661c'), 8);
        for (const e of [-1, 1]) m.ball([0.016, 0.02, 0.012], [e * 0.05, 0.2, 0.15], m.material('#111'), 6);
      } else {
        const petals = ['#e23a6a', '#f2c41f', '#f4f1e6', '#e86a1f', '#b84ad0'];
        for (let i = 0; i < 13; i++) { const u = i / 12 - 0.5; m.ball([0.075, 0.075, 0.05], [u * 1.5, -0.25 * (1 - (u * 2) ** 2), 0], m.material(petals[i % 5], { roughness: 0.6 }), 7); }
      }
      if (a.mascot !== 'flowers') for (const e of [-1, 1]) m.rod([e * 0.3, 0.2, -0.05], [-e * 0.3, -0.2, -0.05], 0.008, m.material('#d8d2c0'));
      m.root.scale.setScalar(1.25);
      m.root.position.set(0, (su || old ? cabY0 + 0.55 : cabY0 + (us ? 0.6 : 0.6)), nose + 0.14 + (su || old ? 0.02 : 0));
      t.root.add(m.root);
    }

    // Exhaust haze when the engine is working.
    const puffs: { mesh: THREE.Mesh; phase: number; material: THREE.MeshStandardMaterial }[] = [];
    const engine = a.state !== 'parked';
    const stack: [number, number, number] = us ? [1.0, 3.5, bodyFront] : su || old ? [-0.9, 0.5, 1.0] : [W / 2 - 0.15, cabTop + 0.6, bodyFront + 0.03];
    for (let i = 0; i < (engine ? Math.round(mix(1, 5, mood.energy)) : 0); i++) {
      const material = new THREE.MeshStandardMaterial({ color: '#57534e', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), material);
      t.root.add(mesh);
      puffs.push({ mesh, phase: i / 5 + random() * 0.1, material });
    }
    const smoke = (time: number) => {
      for (const puff of puffs) {
        const u = (time * mix(0.2, 0.5, mood.energy) + puff.phase) % 1;
        puff.mesh.position.set(stack[0] + (su || old ? -u * 0.8 : 0), stack[1] + u * 1.4, stack[2] - u * u * 1.6);
        puff.mesh.scale.setScalar(0.6 + u * 2);
        puff.material.opacity = (1 - u) * mix(0.2, 0.5, mood.energy);
      }
    };
    smoke(0.3);

    // When the work is at the back, the back is the face of the thing.
    if (loading || tipping) {
      const turn = new THREE.Group();
      for (const child of [...s.root.children]) turn.add(child);
      turn.rotation.y = Math.PI;
      s.root.add(turn);
    }

    const spin = a.state === 'driving' ? mix(1.5, 7, mood.energy) : 0;
    const bladeBase = blade.rotation.x;
    return s.finish({
      update: (dt, time) => {
        for (const wheel of wheels) wheel.rotation.x += dt * spin;
        if (loading) blade.rotation.x = bladeBase + Math.sin(time * mix(0.6, 2, mood.energy)) * 0.35;
        if (beacon) beacon.emissiveIntensity = 0.4 + 1.8 * Math.max(0, Math.sin(time * 7));
        if (puffs.length) smoke(time);
      },
    });
  },
});
