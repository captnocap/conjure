import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { beacon, cone, crew, rbox, slab, wheel } from './parts';

const COLOURS = {
  white: 'Airport white with grey skirts, clean and corporate.',
  yellow: 'Ground-equipment yellow, the default colour of the ramp.',
  red: 'Airline red, proud and freshly waxed.',
  navy: 'Deep navy blue with a silver line, a flag carrier\'s fleet.',
  orange: 'Loud safety orange.',
  olive: 'Flat military olive drab.',
  primrose: 'Pale primrose and cream, a 1960s colour scheme.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = { white: '#e9ebe8', yellow: '#f1bd16', red: '#c9252b', navy: '#213a6b', orange: '#ef6a1c', olive: '#5f6a45', primrose: '#ead98c' };

function hazard(a: string, b: string) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = a; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = b;
  for (let x = -64; x < 256; x += 48) { ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x + 24, 64); ctx.lineTo(x + 64, 0); ctx.lineTo(x + 40, 0); ctx.fill(); }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
}

export default defineThing({
  questions: {
    type: choice('What kind of tug is it?', {
      conventional: 'A conventional pushback tractor: a long flat slab with a small glazed cab at one corner, used with a towbar.',
      towbarless: 'A towbarless tug: wide and even lower, with a U-shaped cradle at the back that swallows the aircraft\'s nose wheels.',
      vintage: 'A 1950s airfield tractor: rounded bonnet, big mudguards and an open seat, half farm machine.',
    }),
    coupling: choice('What is it coupled to?', {
      nothing: 'Nothing. It sits alone with an empty hitch.',
      towbar: 'A towbar is pinned on and points out across the concrete, waiting for a nose wheel.',
      dropped: 'The towbar has been unhitched and left lying on the concrete beside it.',
      aircraft: 'It has hold of an aircraft: twin nose wheels and a gear leg rise out of frame behind it.',
    }),
    beacon: choice('What is the beacon doing?', {
      amber: 'Amber and turning: the tug is working.',
      dark: 'Fitted but switched off.',
      blue: 'A blue airside beacon, turning.',
      twin: 'Two amber beacons flashing, one at each end.',
    }),
    colour: choice('What colour is the tug?', COLOURS),
    marking: choice('What is painted on it?', {
      chevrons: 'Red and white hazard chevrons across both bumpers.',
      number: 'A big stencilled fleet number on the flank.',
      airline: 'An invented ground-handling company name along the side.',
      plain: 'Nothing: bare paint.',
    }),
    driver: noul('Is there a driver in the cab?'),
    state: choice('What is going on with it?', {
      ready: 'Idling and ready, lights on, waiting for the call.',
      chocked: 'Parked up for the night: chocks under the wheels and a cone at each end.',
      service: 'Broken down mid-shift: engine cover propped open, a toolbox on the deck and a dark puddle underneath.',
      derelict: 'Left at the edge of the apron for years: one wheel off and on blocks, weeds round the tyres.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paint = s.material(HEX[a.colour], { roughness: 0.45, metalness: 0.15 });
    const skirt = s.material('#3a3e42', { roughness: 0.7 });
    const tyre = s.material('#1c1d1f', { roughness: 0.9 });
    const hub = s.material(a.colour === 'white' ? '#c9a21a' : '#d9d9d2', { metalness: 0.3 });
    const steel = s.material('#8f9698', { metalness: 0.6, roughness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: '#27394a', roughness: 0.15, metalness: 0.5 });
    const orange = s.material('#f0641e'), white = s.material('#f1efe6');
    const chev = a.marking === 'chevrons' ? hazard('#f2f0e8', '#cf2a2a') : hazard('#f1bd16', '#222428');
    const lampsOn = a.state === 'ready' ? mix(0.6, 2.4, Math.abs(mood.daylight - 0.5) * 2) : 0;
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a6', emissiveIntensity: lampsOn });
    const tail = new THREE.MeshStandardMaterial({ color: '#c8281e', emissive: '#ff2a1a', emissiveIntensity: lampsOn * 0.6 });
    const vest = s.material('#d8e62a', { emissive: '#8a9a00', emissiveIntensity: 0.25 }), cloth = s.material('#2b3550'), skin = s.material('#c9a58a');
    const ticks: ((time: number, speed: number) => void)[] = [];
    const derelict = a.state === 'derelict';
    let hitchX = -2.7, hitchY = 0.55, cabX = 1.3, cabZ = 0.6, deck = 1.05, half = 2.6, width = 2.5, wheelR = 0.52;
    let beaconAt: [number, number, number] = [0, 0, 0];

    if (a.type === 'conventional') {
      slab(s, [[-2.6, 0.42], [-2.45, 0.3], [2.45, 0.3], [2.6, 0.42], [2.6, 0.92], [2.45, 1.05], [-2.45, 1.05], [-2.6, 0.92]], width, paint, 0, 0.06);
      s.box([5.0, 0.16, width + 0.04], [0, 0.36, 0], skirt);
      // Ballast bumpers.
      for (const x of [-2.63, 2.63]) s.box([0.1, 0.42, width - 0.1], [x, 0.66, 0], chev);
      // Engine hump with louvres.
      rbox(s, [2.2, 0.32, 1.5], [-0.9, 1.2, -0.2], paint, 0.08);
      for (let i = 0; i < 9; i++) s.box([0.05, 0.2, 0.9], [-1.8 + i * 0.21, 1.21, 0.3], skirt).rotation.z = 0.5;
      s.cylinder(0.05, 0.05, 0.9, [-1.9, 1.75, -0.8], steel, 10);
      s.cylinder(0.065, 0.065, 0.2, [-1.9, 2.2, -0.8], skirt, 10);
      wheelR = 0.52;
    } else if (a.type === 'towbarless') {
      deck = 0.85; half = 3.2; width = 3.2; cabX = 2.2; cabZ = 0; hitchX = -2.0; wheelR = 0.48;
      // Forward body, then two arms either side of the open cradle.
      slab(s, [[-0.6, 0.28], [3.0, 0.28], [3.2, 0.45], [3.2, 0.7], [2.9, 0.85], [-0.6, 0.85]], width, paint, 0, 0.06);
      for (const z of [-1.15, 1.15]) slab(s, [[-3.2, 0.28], [-0.6, 0.28], [-0.6, 0.85], [-2.9, 0.85], [-3.2, 0.6]], 0.9, paint, z, 0.06);
      s.box([0.1, 0.34, width - 0.1], [3.22, 0.55, 0], chev);
      for (const z of [-1.15, 1.15]) s.box([0.1, 0.26, 0.8], [-3.22, 0.5, z], chev);
      // Cradle floor and clamp paddles.
      s.box([2.4, 0.08, 1.4], [-1.8, 0.2, 0], steel);
      for (const z of [-0.62, 0.62]) rbox(s, [0.5, 0.5, 0.14], [a.coupling === 'aircraft' ? -1.75 : -2.6, 0.5, z], skirt, 0.04);
      rbox(s, [1.6, 0.2, 1.8], [0.6, 0.95, 0], paint, 0.06);
      for (let i = 0; i < 6; i++) s.box([0.05, 0.14, 1.5], [0.05 + i * 0.22, 0.98, 0], skirt).rotation.z = 0.5;
    } else {
      deck = 0.95; half = 1.7; width = 1.7; cabX = -0.55; cabZ = 0; hitchX = -1.75; wheelR = 0.6;
      // Chassis, rounded bonnet, radiator grille, mudguards and an open bench.
      s.box([3.2, 0.22, 1.0], [0, 0.6, 0], skirt);
      rbox(s, [1.5, 0.75, 0.95], [0.85, 1.05, 0], paint, 0.3);
      s.box([0.06, 0.55, 0.7], [1.62, 1.02, 0], steel);
      for (let i = 0; i < 6; i++) s.box([0.07, 0.5, 0.03], [1.63, 1.02, -0.3 + i * 0.12], skirt);
      for (const z of [-0.78, 0.78]) {
        const shell = paint.clone(); shell.side = THREE.DoubleSide;
        const guard = s.mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.46, 20, 1, true, -Math.PI / 2, Math.PI), shell, [-0.95, 0.6, z]);
        guard.rotation.x = -Math.PI / 2;
      }
      rbox(s, [0.6, 0.12, 0.9], [-0.6, 0.98, 0], s.material('#5a3a26', { roughness: 0.8 }), 0.05);
      rbox(s, [0.1, 0.5, 0.9], [-0.92, 1.25, 0], s.material('#5a3a26', { roughness: 0.8 }), 0.04);
      s.rod([0.1, 1.2, 0], [-0.25, 1.55, 0], 0.02, steel);
      s.ring(0.2, 0.018, [-0.27, 1.57, 0], skirt).rotation.set(0, Math.PI / 2, 0.75);
      s.box([0.5, 0.3, 1.5], [-1.55, 0.72, 0], chev);
      s.cylinder(0.04, 0.04, 0.8, [0.6, 1.75, 0.3], steel, 8);
      for (const z of [-0.33, 0.33]) s.ball([0.08, 0.11, 0.11], [1.64, 1.2, z], lamp, 12);
      beaconAt = [0.3, 1.43, 0];
    }

    // ---- Wheels. The derelict has one corner on blocks.
    const axles = a.type === 'vintage' ? [[-0.95, 0.6], [1.0, 0.42]] : a.type === 'towbarless' ? [[-2.4, wheelR], [1.9, wheelR]] : [[-1.6, wheelR], [1.6, wheelR]];
    const track = a.type === 'vintage' ? 0.78 : width / 2 - 0.22;
    axles.forEach(([x, r], ai) => [-1, 1].forEach((side) => {
      const z = side * track;
      if (derelict && ai === 1 && side === 1) {
        s.box([0.5, r - 0.1, 0.4], [x, (r - 0.1) / 2, z * 0.8], s.material('#8a7a62', { roughness: 1 }));
        const off = s.cylinder(r, r, 0.4, [x + 0.5, 0.2, z + 1.1], tyre, 20); off.rotation.z = 0.06;
        s.cylinder(r * 0.55, r * 0.55, 0.42, [x + 0.5, 0.2, z + 1.1], hub, 14);
        return;
      }
      wheel(s, r, a.type === 'vintage' ? 0.36 : 0.44, [x, r, z], tyre, hub);
      if (a.type !== 'vintage') s.box([r * 2.5, 0.06, 0.5], [x, deck + 0.0, z], skirt);
    }));

    // ---- Cab.
    if (a.type !== 'vintage') {
      const cw = a.type === 'towbarless' ? 1.5 : 1.0, ch = 0.95, cl = 1.05;
      rbox(s, [cl, 0.28, cw], [cabX, deck + 0.14, cabZ], paint, 0.04);
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) s.box([0.06, ch, 0.06], [cabX + dx * (cl / 2 - 0.03), deck + 0.28 + ch / 2, cabZ + dz * (cw / 2 - 0.03)], paint);
      const pane = new THREE.MeshStandardMaterial({ color: '#27394a', roughness: 0.15, metalness: 0.5, transparent: true, opacity: a.driver ? 0.38 : 0.82 });
      for (const dz of [-1, 1]) s.box([cl - 0.12, ch - 0.08, 0.02], [cabX, deck + 0.28 + ch / 2, cabZ + dz * (cw / 2 - 0.03)], pane);
      for (const dx of [-1, 1]) s.box([0.02, ch - 0.08, cw - 0.12], [cabX + dx * (cl / 2 - 0.03), deck + 0.28 + ch / 2, cabZ], pane);
      rbox(s, [cl + 0.14, 0.08, cw + 0.14], [cabX, deck + 0.28 + ch + 0.04, cabZ], a.colour === 'white' ? skirt : white, 0.03);
      beaconAt = [cabX, deck + 0.28 + ch + 0.08, cabZ];
      for (const z of [-width / 2 + 0.3, width / 2 - 0.3]) s.ball([0.05, 0.1, 0.14], [half + 0.05, 0.78 * (deck / 1.05), z], lamp, 12);
      for (const z of [-width / 2 + 0.25, width / 2 - 0.25]) s.box([0.04, 0.1, 0.2], [-half - 0.04, 0.82 * (deck / 1.05), z], tail);
      // Mirrors and a step.
      s.rod([cabX + cl / 2, deck + 1.0, cabZ + cw / 2], [cabX + cl / 2 + 0.2, deck + 1.05, cabZ + cw / 2 + 0.25], 0.012, steel);
      s.box([0.03, 0.22, 0.14], [cabX + cl / 2 + 0.2, deck + 1.05, cabZ + cw / 2 + 0.27], skirt);
      if (a.type === 'conventional') s.box([0.5, 0.05, 0.25], [cabX, 0.55, width / 2 + 0.1], steel);
    }
    if (a.driver && !derelict) crew(s, a.type === 'vintage' ? [-0.62, 1.12, 0] : [cabX - 0.12, deck + 0.5, cabZ], 0, vest, cloth, skin, true);

    // ---- Markings.
    const side = width / 2 + 0.012 + (a.type === 'conventional' ? 0.02 : 0);
    if (a.marking === 'number') {
      const n = String(1 + Math.floor(random() * 98)).padStart(2, '0');
      if (a.type === 'vintage') s.label(n, 0.5, 0.36, [0.9, 1.1, 0.49], '#1d1f22', HEX[a.colour]);
      else s.label(n, 0.9, 0.5, [-0.6, 0.7 * (deck / 1.05), a.type === 'towbarless' ? 1.615 : side], '#1d1f22', '#f2f0e8');
    } else if (a.marking === 'airline') {
      const name = ['AEROLUX GROUND', 'MERIDIAN RAMP', 'NORTHSTAR', 'SKYPORT SERVICES', 'ORBIS HANDLING'][Math.floor(random() * 5)];
      if (a.type === 'vintage') s.label(name, 1.1, 0.2, [0.85, 1.1, 0.49], '#f2f0e8', '#22262b');
      else s.label(name, 2.6, 0.34, [a.type === 'towbarless' ? 1.2 : -0.2, 0.68 * (deck / 1.05), a.type === 'towbarless' ? 1.615 : side], '#f2f0e8', '#22262b');
    }
    if (a.type === 'conventional') s.box([4.6, 0.07, 0.02], [0, 0.97, side - 0.01], a.colour === 'white' ? s.material('#cf2a2a') : white);

    // ---- Beacons.
    const tint = a.beacon === 'blue' ? '#2f6bff' : '#ffa51a';
    const lit = a.beacon !== 'dark' && !derelict;
    if (!derelict || random() > 0.5) ticks.push(beacon(s, beaconAt, tint, lit, 1.5));
    if (a.beacon === 'twin') ticks.push(beacon(s, [a.type === 'vintage' ? -1.55 : -half + 0.4, a.type === 'vintage' ? 0.87 : deck + (a.type === 'towbarless' ? 0 : 0.0), a.type === 'towbarless' ? 1.15 : 0], tint, lit, 1.5));

    // ---- Hitch, towbar or aircraft.
    hitchY = a.type === 'vintage' ? 0.6 : 0.5;
    if (a.type !== 'towbarless') { s.box([0.3, 0.12, 0.3], [hitchX, hitchY, 0], steel); s.cylinder(0.035, 0.035, 0.3, [hitchX - 0.08, hitchY, 0], skirt, 8); }
    const noseGear = (x: number) => {
      for (const z of [-0.3, 0.3]) wheel(s, 0.42, 0.24, [x, 0.42, z], tyre, s.material('#d7dadb', { metalness: 0.5 }));
      const leg = s.material('#dcdfe0', { metalness: 0.5, roughness: 0.35 });
      s.cylinder(0.05, 0.05, 0.6, [x, 0.42, 0], leg, 10).rotation.x = Math.PI / 2;
      s.cylinder(0.09, 0.11, 1.5, [x, 1.15, 0], leg, 14);
      s.cylinder(0.065, 0.065, 1.5, [x, 2.5, 0], s.material('#f4f4f2', { metalness: 0.9, roughness: 0.15 }), 14);
      s.rod([x, 1.2, 0], [x - 0.7, 3.2, 0], 0.035, leg);
      s.rod([x + 0.12, 1.0, 0], [x + 0.3, 1.5, 0], 0.03, leg); s.rod([x + 0.3, 1.5, 0], [x + 0.12, 1.9, 0], 0.03, leg);
      // Gear doors hanging either side, cut off by the frame.
      const belly = s.mesh(new THREE.CylinderGeometry(2.1, 2.1, 4.2, 24, 1, true, Math.PI - 0.62, 1.24), new THREE.MeshStandardMaterial({ color: '#eef0ee', roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }), [x - 0.5, 5.35, 0]);
      belly.geometry.rotateZ(Math.PI / 2); belly.geometry.rotateX(-Math.PI / 2);
      for (const z of [-0.36, 0.36]) s.box([1.2, 0.5, 0.03], [x - 0.2, 3.02, z], white);
      s.ball([0.05, 0.05, 0.05], [x + 0.12, 2.3, 0], lamp, 8);
    };
    const towbar = (group: THREE.Group, len: number) => {
      const add = (m: THREE.Mesh) => { m.castShadow = true; group.add(m); return m; };
      const bar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 12), s.material('#f1bd16', { roughness: 0.5 })));
      bar.rotation.z = Math.PI / 2; bar.position.set(-len / 2, 0, 0);
      for (let i = 0; i < 3; i++) { const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.073, 0.25, 12), s.material('#222428'))); band.rotation.z = Math.PI / 2; band.position.set(-len * (0.2 + i * 0.3), 0, 0); }
      for (const z of [-0.4, 0.4]) { const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14), tyre)); w.rotation.x = Math.PI / 2; w.position.set(-len * 0.6, -0.22, z); }
      const axle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), steel)); axle.rotation.x = Math.PI / 2; axle.position.set(-len * 0.6, -0.22, 0);
      const strut = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), steel)); strut.position.set(-len * 0.6, -0.11, 0);
      const head = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.3), steel)); head.position.set(-len - 0.1, 0, 0);
      const eye = add(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 14), steel)); eye.rotation.x = Math.PI / 2; eye.position.set(0.05, 0, 0);
      s.root.add(group);
    };
    if (a.type === 'towbarless') {
      if (a.coupling === 'aircraft') noseGear(-1.75);
      else if (a.coupling === 'dropped') { const g = new THREE.Group(); g.position.set(1.4, 0.42, 2.6); g.rotation.y = 0.12 + random() * 0.3; towbar(g, 3.2); }
    } else if (a.coupling === 'towbar' || a.coupling === 'aircraft') {
      const len = a.type === 'vintage' ? 2.8 : 3.6;
      const g = new THREE.Group(); g.position.set(hitchX - 0.15, hitchY, 0);
      g.rotation.y = a.coupling === 'aircraft' ? 0 : (random() - 0.5) * 0.25;
      g.rotation.z = a.coupling === 'aircraft' ? 0.0 : -0.02;
      towbar(g, len);
      if (a.coupling === 'aircraft') noseGear(hitchX - 0.15 - len - 0.45);
    } else if (a.coupling === 'dropped') {
      const g = new THREE.Group(); g.position.set(hitchX + 2.6 + random(), 0.42, width / 2 + 1.2 + random() * 0.5); g.rotation.y = 0.15 + random() * 0.5;
      towbar(g, a.type === 'vintage' ? 2.8 : 3.6);
    }

    // ---- What is going on.
    if (a.state === 'chocked') {
      const rubber = s.material('#f1bd16', { roughness: 0.9 });
      for (const [x, r] of axles) for (const d of [-1, 1]) slab(s, [[x + d * (r * 0.75), 0], [x + d * (r * 0.75 + 0.3), 0], [x + d * (r * 0.75 + 0.02), 0.22]].sort(() => 0) as [number, number][], 0.4, rubber, track, 0.01);
      cone(s, half + 0.9, width / 2 - 0.2 + random() * 0.4, orange, white);
      cone(s, -half - 0.9 - (a.coupling === 'towbar' ? 3.5 : 0), width / 2 + random() * 0.4, orange, white);
    } else if (a.state === 'service') {
      const ex = a.type === 'vintage' ? 0.85 : a.type === 'towbarless' ? 0.6 : -0.9;
      const ey = a.type === 'vintage' ? 1.45 : a.type === 'towbarless' ? 1.08 : 1.38;
      const lid = s.box([a.type === 'vintage' ? 1.3 : 1.6, 0.04, 1.1], [ex - 0.25, ey + 0.42, -0.25], paint); lid.rotation.z = -0.6;
      s.rod([ex + 0.3, ey - 0.05, 0.25], [ex + 0.25, ey + 0.2, 0.25], 0.012, steel);
      rbox(s, [0.5, 0.22, 0.24], [a.type === 'vintage' ? 0.2 : ex + 1.3, (a.type === 'vintage' ? 0 : deck) + 0.11, a.type === 'vintage' ? 1.2 : 0.75], s.material('#c9252b'), 0.03);
      const oil = s.cylinder(0.5 + random() * 0.25, 0.5, 0.012, [ex + random() * 0.4, 0.006, width / 2 - 0.1], new THREE.MeshStandardMaterial({ color: '#3a3026', roughness: 0.2, metalness: 0.3 }), 20);
      oil.scale.z = 0.5 + random() * 0.3; oil.castShadow = false;
      cone(s, half + 0.7, width / 2 + 0.3, orange, white);
    } else if (derelict) {
      const tufts = [] as { at: [number, number, number]; size: number; color: string }[];
      for (let i = 0; i < 26; i++) tufts.push({ at: [(random() - 0.5) * half * 2.2, 0, (random() > 0.5 ? 1 : -1) * (width / 2 - 0.1 + random() * 0.5)], size: 0.1 + random() * 0.18, color: random() > 0.5 ? '#5f7436' : '#7d8a44' });
      s.scatter(new THREE.ConeGeometry(0.5, 1.5, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
    }
    // Grime: rust streaks down the flanks as wear rises.
    const rust = s.material('#7a4a2a', { roughness: 1 });
    for (let i = 0; i < Math.round((mood.wear + (derelict ? 0.5 : 0)) * 10); i++) {
      const h = 0.15 + random() * 0.35;
      s.box([0.05 + random() * 0.12, h, 0.012], [(random() - 0.5) * half * 1.7, deck - 0.08 - h / 2, (a.type === 'vintage' ? 0.48 : width / 2 + 0.035)], rust);
    }
    void glass;

    const speed = mix(2.5, 9, mood.energy);
    return s.finish({ update: (_dt, time) => { for (const tick of ticks) tick(time, speed); } });
  },
});
