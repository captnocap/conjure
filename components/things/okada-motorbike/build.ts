import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const DECALS = { fear: 'NO FEAR', god: 'GOD DEY', speed: 'SPEED', boss: 'BIG BOSS', one: 'ONLY 1' } as const;

function lettering(text: string, w: number, h: number, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.max(32, Math.round((256 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${Math.min(canvas.height * 0.72, (256 / text.length) * 1.5)}px Impact, "Arial Black", sans-serif`;
  c.fillText(text, 128, canvas.height / 2 + 2, 240);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    load: choice('What is it carrying on the pillion?', {
      none: 'Nothing: the padded seat is free for the next fare.',
      helmet: "A spare passenger helmet sitting on the seat, never worn.",
      goat: 'A live goat trussed and laid across the seat, unimpressed.',
      mattress: 'A foam mattress folded double and roped on, twice as wide as the bike.',
      crates: 'A tower of bottle crates lashed to the rack.',
      kegs: 'A cluster of yellow jerrycans hung either side and stacked behind.',
    }),
    colour: choice('What colour are the tank and panels?', {
      red: 'Bright signal red.',
      blue: 'Royal blue.',
      black: 'Black with gold pinstripes.',
      green: 'Bottle green.',
      silver: 'Dull silver-grey.',
      orange: 'Loud orange.',
    }),
    decal: choice('What is stuck on the tank and the front shield?', {
      plain: 'Nothing, bare paint.',
      fear: 'NO FEAR, the swagger of a man who rides between lorries.',
      god: 'GOD DEY, a prayer in pidgin.',
      speed: 'SPEED, with racing stripes.',
      boss: 'BIG BOSS, pride of ownership.',
      one: 'ONLY 1, the only one of its kind, allegedly.',
    }),
    dressed: score('How much has the rider dressed it up?', ['Bare factory bike', 'Seat cover and a tassel', 'Tassels, extra mirrors, a flag', 'A rolling shrine of fringe, flags, horns and lights']),
    doing: choice('What is it doing right now?', {
      waiting: 'Parked on its stand at the junction, nobody on it.',
      idling: 'Engine running, shaking on its stand, exhaust puffing, lamp on.',
      astride: 'The rider sits astride, one foot down, scanning for a fare.',
      fallen: 'Lying on its side in the road where it went down.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paintColour = { red: '#c42a22', blue: '#1f4fb0', black: '#1c1c20', green: '#1f6a3c', silver: '#9aa3a6', orange: '#e86a1c' }[a.colour];
    const paint = s.material(paintColour, { roughness: 0.4, metalness: 0.2 });
    const black = s.material('#1c1c1e', { roughness: 0.8 });
    const rubber = s.material('#222226', { roughness: 0.95 });
    const chrome = s.material(mood.wear > 0.6 ? '#8f8478' : '#c9ced0', { metalness: 0.8, roughness: 0.3 });
    const engine = s.material('#6f7477', { metalness: 0.6, roughness: 0.5 });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const wheel = (x: number) => {
      s.ring(0.245, 0.058, [x, 0.3, 0], rubber);
      s.ring(0.19, 0.014, [x, 0.3, 0], chrome);
      const hub = s.cylinder(0.05, 0.05, 0.13, [x, 0.3, 0], engine, 10);
      hub.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        s.rod([x, 0.3, 0.03 * (i % 2 ? 1 : -1)], [x + Math.cos(t) * 0.19, 0.3 + Math.sin(t) * 0.19, 0], 0.005, chrome);
      }
    };
    wheel(0.66);
    wheel(-0.62);
    // Fork, bars, lamp, mirrors.
    for (const z of [-0.075, 0.075]) s.rod([0.66, 0.3, z], [0.4, 0.98, z], 0.022, chrome);
    s.box([0.07, 0.07, 0.2], [0.42, 0.93, 0], black);
    s.rod([0.38, 1.02, -0.34], [0.38, 1.02, 0.34], 0.014, chrome);
    for (const z of [-1, 1]) {
      s.rod([0.38, 1.02, z * 0.24], [0.38, 1.02, z * 0.36], 0.02, rubber);
      s.rod([0.38, 1.02, z * 0.2], [0.34, 1.24, z * 0.3], 0.006, chrome);
      const mirror = s.cylinder(0.055, 0.055, 0.012, [0.34, 1.27, z * 0.3], black, 12);
      mirror.rotation.z = Math.PI / 2;
    }
    const lit = a.doing === 'idling' || a.doing === 'astride';
    s.ball([0.09, 0.1, 0.1], [0.5, 0.88, 0], black, 14);
    const lamp = s.cylinder(0.085, 0.085, 0.03, [0.585, 0.88, 0], s.material('#f4edc8', { emissive: '#ffe9a0', emissiveIntensity: lit ? 1.1 : 0.05 }), 14);
    lamp.rotation.z = Math.PI / 2;
    const guard = s.ring(0.33, 0.028, [0.66, 0.3, 0], paint, Math.PI * 0.62);
    guard.rotation.z = 0.55;
    guard.scale.z = 2.6;
    // Front shield with its sticker.
    const shieldText = a.decal === 'plain' ? null : DECALS[a.decal];
    const shield = s.box([0.02, 0.2, 0.3], [0.52, 1.08, 0], s.material('#e9c21c'));
    shield.rotation.z = -0.25;
    if (shieldText) {
      const sticker = s.mesh(new THREE.PlaneGeometry(0.27, 0.13), lettering(shieldText, 0.27, 0.13, '#14141a', '#e9c21c'), [0.535, 1.08, 0]);
      sticker.rotation.set(0, Math.PI / 2, 0);
      sticker.rotateX(-0.25);
    }
    // Frame, tank, engine.
    s.tube([[0.42, 0.9, 0], [0.3, 0.6, 0], [0.18, 0.3, 0], [-0.2, 0.26, 0], [-0.62, 0.3, 0]], 0.022, black);
    s.tube([[0.4, 0.92, 0], [0.0, 0.76, 0], [-0.5, 0.74, 0], [-1.0, 0.8, 0]], 0.022, black);
    s.ball([0.27, 0.13, 0.15], [0.1, 0.84, 0], paint, 18);
    s.cylinder(0.035, 0.035, 0.025, [0.14, 0.975, 0], chrome, 10);
    if (shieldText) for (const z of [-1, 1]) {
      const sticker = s.mesh(new THREE.PlaneGeometry(0.3, 0.09), lettering(shieldText, 0.3, 0.09, a.colour === 'black' ? '#e8c84a' : '#ffffff', paintColour), [0.1, 0.84, z * 0.149]);
      if (z < 0) sticker.rotation.y = Math.PI;
    }
    if (a.decal === 'speed' || a.colour === 'black') for (const z of [-0.152, 0.152]) s.box([0.42, 0.012, 0.004], [0.1, 0.78, z * 0.97], s.material(a.colour === 'black' ? '#e8c84a' : '#ffffff'));
    s.box([0.3, 0.22, 0.24], [0.03, 0.42, 0], engine);
    const barrel = new THREE.Group();
    for (let i = 0; i < 6; i++) barrel.add(s.box([0.17, 0.014, 0.19], [0, i * 0.032, 0], engine));
    barrel.position.set(0.1, 0.54, 0);
    barrel.rotation.z = -0.35;
    s.root.add(barrel);
    for (const z of [-1, 1]) {
      const cover = s.cylinder(0.1, 0.1, 0.03, [0.0, 0.4, z * 0.13], chrome, 14);
      cover.rotation.x = Math.PI / 2;
      s.rod([-0.12, 0.3, z * 0.13], [-0.12, 0.3, z * 0.26], 0.014, black);
      s.rod([-0.62, 0.3, z * 0.09], [-0.1, 0.34, z * 0.09], 0.018, black);
      s.rod([-0.6, 0.32, z * 0.11], [-0.72, 0.74, z * 0.11], 0.02, chrome);
      // Side panels.
      s.box([0.28, 0.16, 0.012], [-0.3, 0.62, z * 0.12], paint);
    }
    // Exhaust along the right side.
    s.tube([[0.12, 0.5, 0.1], [0.2, 0.32, 0.15], [-0.1, 0.24, 0.17], [-0.4, 0.27, 0.17]], 0.018, chrome);
    s.rod([-0.38, 0.27, 0.17], [-0.95, 0.36, 0.17], 0.04, chrome, 0.05);
    // Seat: rider pad, then the thick padded pillion.
    const coverColour = a.dressed > 0.25 ? pick(['#7a2a2a', '#2a4a7a', '#3a3a3a', '#6a4a8a', '#8a6a2a']) : '#232326';
    s.ball([0.27, 0.06, 0.14], [-0.2, 0.83, 0], s.material(coverColour, { roughness: 0.9 }), 14);
    s.ball([0.3, 0.085, 0.16], [-0.6, 0.87, 0], s.material(coverColour, { roughness: 0.9 }), 14);
    if (a.dressed > 0.25) for (let i = 0; i < 5; i++) s.box([0.012, 0.02, 0.3], [-0.38 - i * 0.11, 0.905 - Math.abs(i - 2) * 0.018, 0], s.material('#e8dcc0'));
    // Rack, tail, plate.
    for (const z of [-0.12, 0.12]) s.rod([-0.85, 0.82, z], [-1.14, 0.84, z], 0.012, chrome);
    s.rod([-1.14, 0.84, -0.12], [-1.14, 0.84, 0.12], 0.012, chrome);
    s.rod([-1.0, 0.83, -0.12], [-1.0, 0.83, 0.12], 0.012, chrome);
    const rearGuard = s.ring(0.33, 0.028, [-0.62, 0.3, 0], paint, Math.PI * 0.55);
    rearGuard.rotation.z = Math.PI * 0.42;
    rearGuard.scale.z = 2.6;
    s.box([0.05, 0.07, 0.12], [-1.0, 0.7, 0], s.material('#b3261e', { emissive: '#b3261e', emissiveIntensity: lit ? 0.9 : 0.15 }));
    s.box([0.012, 0.11, 0.2], [-1.03, 0.58, 0], s.material('#e9e5d6'));
    // Stand.
    const centre = a.doing === 'idling' || (a.doing === 'waiting' && random() > 0.5);
    if (centre) for (const z of [-1, 1]) s.rod([-0.18, 0.28, z * 0.06], [-0.26, 0.0, z * 0.17], 0.014, black);
    else s.rod([-0.05, 0.28, -0.1], [-0.0, 0.015, -0.3], 0.012, black);

    // The rider's helmet hooked over the left bar end.
    const helmet = (at: P, colour: string, tilt = 0) => {
      const group = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), s.material(colour, { roughness: 0.35 }));
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.133, 12, 6, -0.9, 1.8, Math.PI * 0.32, Math.PI * 0.26), s.material('#30363a', { roughness: 0.2 }));
      dome.castShadow = visor.castShadow = true;
      group.add(dome, visor);
      group.position.set(...at);
      group.rotation.set(tilt, Math.PI / 2, 0);
      s.root.add(group);
      return group;
    };
    if (a.doing !== 'astride' && a.doing !== 'fallen') {
      helmet([0.36, 0.9, -0.36], pick(['#e8e2d0', '#c42a22', '#1c1c20', '#e9c21c']), 0.5);
      s.rod([0.38, 1.02, -0.34], [0.36, 0.98, -0.36], 0.006, black);
    }

    // Dressing up.
    const fringe = [s.material('#e8c020'), s.material('#c42a22'), s.material('#f0f0e8'), s.material('#2c8a56')];
    if (a.dressed > 0.25) for (const z of [-0.37, 0.37]) for (let i = 0; i < 5; i++) s.rod([0.38, 1.02, z], [0.36 + (random() - 0.5) * 0.08, 0.84 + random() * 0.05, z + (random() - 0.5) * 0.08], 0.006, pick(fringe));
    if (a.dressed > 0.5) {
      for (const z of [-1, 1]) {
        s.rod([0.38, 1.02, z * 0.14], [0.36, 1.32, z * 0.16], 0.006, chrome);
        const extra = s.cylinder(0.04, 0.04, 0.012, [0.36, 1.34, z * 0.16], black, 10);
        extra.rotation.z = Math.PI / 2;
      }
      s.rod([-1.12, 0.84, 0.12], [-1.2, 1.55, 0.14], 0.007, chrome);
      const flag = s.box([0.24, 0.15, 0.006], [-1.33, 1.46, 0.14], pick(fringe));
      flag.rotation.y = 0.2;
    }
    if (a.dressed > 0.8) {
      for (let i = 0; i < 14; i++) s.rod([-0.3 - i * 0.045, 0.82, 0.155], [-0.3 - i * 0.045, 0.72 + random() * 0.03, 0.17], 0.006, pick(fringe));
      for (let i = 0; i < 14; i++) s.rod([-0.3 - i * 0.045, 0.82, -0.155], [-0.3 - i * 0.045, 0.72 + random() * 0.03, -0.17], 0.006, pick(fringe));
      for (const z of [-0.16, 0.16]) {
        const horn = s.cylinder(0.05, 0.02, 0.09, [0.52, 0.72, z], chrome, 12);
        horn.rotation.z = -Math.PI / 2;
      }
      for (let i = 0; i < 5; i++) s.ball([0.018, 0.018, 0.018], [0.5, 1.2, -0.12 + i * 0.06], s.material(pick(['#ff4a3a', '#3affa0', '#ffe04a']), { emissive: '#ffb04a', emissiveIntensity: 0.9 }), 8);
    }
    // Wear: a taped seat, a cracked lamp, rust on the guards.
    if (mood.wear > 0.5) {
      s.box([0.06, 0.012, 0.3], [-0.52, 0.953, 0], s.material('#8a8f92'));
      for (let i = 0; i < 4; i++) s.ball([0.03, 0.02, 0.03], [mix(-0.9, 0.9, random()), 0.56 + random() * 0.08, (random() - 0.5) * 0.05], s.material('#7a4a2c'), 6);
    }

    // The load.
    const rope = s.material('#c9a35a');
    const beforeLoad = s.root.children.length;
    if (a.load === 'helmet') helmet([-0.6, 0.955, 0], pick(['#e9c21c', '#f0f0e8', '#2f6fb0']));
    if (a.load === 'goat') {
      const coat = s.material(pick(['#e8e2d4', '#6a4a34', '#2a2624', '#b89468']));
      const patch = s.material(pick(['#4a3424', '#e8e2d4', '#2a2624']));
      s.ball([0.15, 0.15, 0.3], [-0.62, 1.07, 0], coat, 14);
      s.ball([0.1, 0.09, 0.12], [-0.6, 1.14, 0.1], patch, 10);
      s.ball([0.07, 0.075, 0.11], [-0.6, 1.2, 0.4], coat, 12);
      s.ball([0.045, 0.04, 0.06], [-0.6, 1.17, 0.5], patch, 8);
      for (const x of [-0.05, 0.05]) {
        s.rod([-0.6 + x, 1.26, 0.38], [-0.6 + x * 1.8, 1.35, 0.3], 0.012, s.material('#d8cdb0'), 0.004);
        s.ball([0.02, 0.035, 0.05], [-0.6 + x * 1.7, 1.2, 0.36], patch, 6);
      }
      for (const z of [-0.2, 0.18]) for (const x of [-0.04, 0.04]) s.rod([-0.62 + x, 1.0, z], [-0.5 + x, 0.84, z * 0.3 + 0.2], 0.018, coat);
      s.ring(0.045, 0.01, [-0.48, 0.85, 0.24], rope).rotation.x = 1.2;
      s.rod([-0.62, 1.12, -0.3], [-0.64, 1.2, -0.36], 0.012, coat);
      s.tube([[-0.6, 0.86, -0.17], [-0.62, 1.23, 0], [-0.6, 0.86, 0.17]], 0.008, rope);
    }
    if (a.load === 'mattress') {
      const foam = s.material(pick(['#d86a9a', '#6fa8d8', '#e8dcc0', '#8ac49a']));
      const m1 = s.box([0.95, 0.15, 1.75], [-0.62, 1.03, 0], foam);
      const m2 = s.box([0.95, 0.15, 1.7], [-0.62, 1.19, 0.02], foam);
      m1.rotation.y = m2.rotation.y = (random() - 0.5) * 0.15;
      m2.rotation.z = 0.03;
      const fold = s.cylinder(0.155, 0.155, 0.95, [-0.62, 1.11, -0.87], foam, 12);
      fold.rotation.z = Math.PI / 2;
      for (const z of [-0.3, 0.35]) s.tube([[-1.12, 0.84, z * 0.4], [-1.12, 1.28, z], [-0.62, 1.29, z], [-0.12, 1.28, z], [-0.14, 0.9, z * 0.4]], 0.009, rope);
    }
    if (a.load === 'crates') {
      const colours = ['#c42a22', '#1f4fb0', '#e9c21c', '#2c8a56', '#8a5a2a'];
      const count = 3 + Math.floor(random() * 3);
      const caps: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        const y = 0.96 + i * 0.25, dx = (random() - 0.5) * 0.04, dz = (random() - 0.5) * 0.04;
        s.box([0.42, 0.24, 0.32], [-0.72 + dx, y + 0.12, dz], s.material(pick(colours)));
        s.box([0.38, 0.03, 0.28], [-0.72 + dx, y + 0.235, dz], black);
        if (i === count - 1) for (let u = 0; u < 4; u++) for (let v = 0; v < 3; v++) caps.push({ at: [-0.86 + u * 0.094 + dx, y + 0.27, -0.09 + v * 0.09 + dz], size: 1, color: pick(['#d8a020', '#c9ced0', '#b3261e']) });
      }
      s.scatter(new THREE.CylinderGeometry(0.03, 0.035, 0.08, 8), s.material('#ffffff'), caps);
      const top = 0.96 + count * 0.25;
      s.tube([[-0.72, 0.84, -0.17], [-0.72, top * 0.6 + 0.4, -0.18], [-0.72, top + 0.02, 0], [-0.72, top * 0.6 + 0.4, 0.18], [-0.72, 0.84, 0.17]], 0.009, rope);
    }
    if (a.load === 'kegs') {
      const kegColours = ['#e8c020', '#e8c020', '#e2b01c', '#2a5fc0'];
      const keg = (at: P, lean = 0) => {
        const body = s.box([0.24, 0.36, 0.17], at, s.material(pick(kegColours), { roughness: 0.5 }));
        body.rotation.x = lean;
        const cap = s.cylinder(0.03, 0.03, 0.05, [at[0] + 0.06, at[1] + 0.2, at[2]], black, 8);
        cap.rotation.x = lean;
      };
      for (const z of [-1, 1]) { keg([-0.72, 0.55, z * 0.27], z * 0.12); keg([-0.98, 0.58, z * 0.25], z * 0.1); }
      keg([-0.62, 1.12, -0.09]); keg([-0.62, 1.12, 0.1]); keg([-0.9, 1.08, 0]);
      if (random() > 0.4) keg([-0.74, 1.47, 0.0]);
      s.tube([[-0.72, 0.74, -0.37], [-0.72, 0.92, -0.2], [-0.7, 1.32, 0], [-0.72, 0.92, 0.2], [-0.72, 0.74, 0.37]], 0.008, rope);
    }

    const cargo = new THREE.Group();
    for (const part of s.root.children.slice(beforeLoad)) cargo.add(part);

    // The rider, astride with one foot down.
    if (a.doing === 'astride') {
      const shirt = s.material(pick(['#c8402e', '#2f6fb0', '#e8e2d0', '#2c8a56', '#e0a020', '#30383f']));
      const trousers = s.material(pick(['#30383f', '#4a4030', '#27405a']));
      const flesh = s.material(pick(['#5a3a28', '#6b4630', '#4a2f20']));
      s.rod([-0.2, 0.9, 0], [-0.12, 1.42, 0], 0.15, shirt, 0.13);
      s.ball([0.1, 0.115, 0.1], [-0.08, 1.62, 0], flesh, 12);
      helmet([-0.08, 1.64, 0], pick(['#e8e2d0', '#c42a22', '#e9c21c']), 0).rotation.set(0, Math.PI / 2, 0);
      for (const z of [-1, 1]) {
        s.rod([-0.1, 1.36, z * 0.17], [0.12, 1.12, z * 0.25], 0.04, flesh);
        s.rod([0.12, 1.12, z * 0.25], [0.38, 1.03, z * 0.3], 0.035, flesh);
      }
      s.rod([-0.2, 0.9, 0.12], [0.08, 0.72, 0.2], 0.065, trousers);
      s.rod([0.08, 0.72, 0.2], [-0.1, 0.32, 0.24], 0.05, trousers);
      s.rod([-0.2, 0.9, -0.12], [0.02, 0.68, -0.24], 0.065, trousers);
      s.rod([0.02, 0.68, -0.24], [0.0, 0.02, -0.4], 0.05, trousers);
      s.box([0.22, 0.04, 0.09], [0.04, 0.02, -0.4], black);
    }

    // Everything above is the machine; lean or drop it as one.
    const bike = new THREE.Group();
    bike.add(...s.root.children);
    s.root.add(bike);
    if (a.doing === 'fallen') {
      bike.rotation.x = 1.08;
      bike.rotation.y = (random() - 0.5) * 0.4;
      bike.position.y = 0.09;
      // The load and the helmet came off and lie where they landed.
      s.root.add(cargo);
      if (a.load === 'crates' || a.load === 'kegs') { cargo.rotation.x = 1.45; cargo.position.set(-0.1, 0.2, 0.5); }
      else if (a.load === 'mattress') { cargo.position.set(-0.2, -0.95, 1.9); cargo.rotation.y = 0.5; }
      else { cargo.position.set(0.1, -0.86, 1.25); cargo.rotation.y = random() * 2; }
      helmet([1.0 + random() * 0.3, 0.085, -0.75 - random() * 0.3], pick(['#e8e2d0', '#c42a22', '#e9c21c']), 0.4);
      // What came off it: a scrape, a mirror, a slipper.
      const scrape = s.box([1.1, 0.004, 0.1], [0.5, 0.004, 0.25], s.material('#4a4a48'));
      scrape.rotation.y = -0.2;
      s.cylinder(0.055, 0.055, 0.012, [0.9 + random() * 0.3, 0.008, 0.9 + random() * 0.3], black, 12);
      s.box([0.24, 0.025, 0.1], [0.5 + random() * 0.4, 0.014, -0.5 - random() * 0.2], s.material(pick(['#2f6fb0', '#c42a22', '#2c8a56']))).rotation.y = random() * 3;
      const oil = s.cylinder(0.3, 0.3, 0.004, [0.1, 0.003, 0.45], s.material('#2a2622', { roughness: 0.25 }), 14);
      oil.scale.z = 0.6;
    } else {
      bike.add(cargo);
      if (!centre) bike.rotation.x = -0.17;
      else bike.position.y = 0.012;
    }

    const puffs: THREE.Mesh[] = [];
    if (a.doing === 'idling') for (let i = 0; i < 4; i++) {
      const size = 0.06 + i * 0.035;
      const puff = s.ball([size, size, size], [-1.02 - i * 0.14, 0.38 + i * 0.06, 0.17 + (random() - 0.5) * 0.08], new THREE.MeshStandardMaterial({ color: '#6a6660', transparent: true, opacity: 0.35, depthWrite: false }), 8);
      puff.castShadow = false;
      puffs.push(puff);
    }
    const shake = a.doing === 'idling' ? mix(0.002, 0.008, mood.energy) : 0;
    const base = bike.position.y;
    return s.finish({
      footprint: 1.0,
      update: (_dt, time) => {
        bike.position.y = base + Math.sin(time * 46) * shake;
        puffs.forEach((puff, index) => {
          const beat = (time * mix(0.5, 1.6, mood.energy) + index * 0.25) % 1;
          puff.scale.setScalar((0.06 + index * 0.035) * (0.7 + beat * 0.8));
        });
      },
    });
  },
});
