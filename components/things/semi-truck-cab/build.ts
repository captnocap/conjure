import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { coil, grime, painted, write } from './paint';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;
const BY = 1.15, R = 0.52;

const COLOURS = { red: ['#b3201f', '#f2ead2'], blue: ['#162a5c', '#c9d6e8'], black: ['#16171a', '#c9a13a'], green: ['#1f4d36', '#e9dfb8'], orange: ['#d2601c', '#2a211c'], white: ['#eeece4', '#1f5fb0'], purple: ['#4c2a6e', '#e2c8f2'], teal: ['#1d6f78', '#f6e7c2'] } as const;

/** A solid from a side profile in (z, y), as wide as given and centred on x. */
function prism(points: readonly (readonly [number, number])[], width: number) {
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y))), { depth: width, bevelEnabled: false });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  return geometry;
}

export default defineThing({
  questions: {
    style: choice('What style of cab is it?', {
      classic: 'A classic long-nose conventional: square hood, separate fenders, flat windshield, tall stacks.',
      aero: 'A modern aerodynamic tractor: sloped hood, roof fairing swept up to a tall sleeper, side skirts.',
      cabover: 'A 1970s cabover: a tall flat-faced box sitting right over the front axle, no hood at all.',
    }),
    colour: choice('What is the base paint colour?', {
      red: 'Candy-apple red.', blue: 'Midnight blue.', black: 'Gloss black.', green: 'Forest green.',
      orange: 'Burnt orange.', white: 'Fleet white.', purple: 'Deep purple.', teal: 'Sea-foam teal, a 1950s colour.',
    }),
    scheme: choice('What is the paint scheme?', {
      solid: 'One solid colour, nothing else.',
      twotone: 'Two-tone: a second colour sweeping up along the lower body.',
      stripes: 'Hand-laid pinstripes arcing from nose to sleeper.',
      flames: 'Hot-rod flames licking back from the nose.',
      fleet: 'Company livery: a bold slanted block and a logo roundel on the sleeper.',
      patch: 'Primer patches and a mismatched panel, a working truck kept alive.',
    }),
    driver: choice('What is the driver doing?', {
      asleep: 'Asleep in the bunk: every curtain drawn, the truck dark.',
      idling: 'Idling: running lights and headlamps on, exhaust shimmering off the stacks.',
      away: 'Gone inside: the driver\'s door hangs open, dome light on, cab empty.',
      repair: 'Broken down: the hood (or the whole cab) is tilted forward and a toolbox sits by the wheel.',
    }),
    lettering: choice('What is lettered on it?', {
      none: 'Nothing.',
      owner: 'An owner-operator\'s name and home town on the door.',
      fleet: 'A company name and unit number on the door.',
      nickname: 'A nickname in script along the sleeper.',
      forsale: 'A FOR SALE card in the windshield.',
    }),
    chrome: score('How much chrome does it carry?', ['None: painted bumper, black stacks', 'A chrome bumper and grille', 'Chrome tanks, stacks and wheels', 'A full show truck dripping chrome and rows of amber lights']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear, night = Math.abs(mood.daylight - 0.5) * 2;
    const [base, accent] = COLOURS[a.colour];
    const paint = s.material(base, { metalness: 0.4, roughness: mix(0.25, 0.7, wear) });
    const trim = s.material(accent, { metalness: 0.3, roughness: 0.5 });
    const shiny = s.material('#e9edef', { metalness: 0.95, roughness: 0.14 });
    const blackout = s.material('#26282a', { roughness: 0.6, metalness: 0.3 });
    const chrome1 = a.chrome > 0.2 ? shiny : blackout;   // bumper, grille
    const chrome2 = a.chrome > 0.5 ? shiny : blackout;   // tanks, stacks
    const hubMat = a.chrome > 0.5 ? shiny : s.material('#d9d6cc', { roughness: 0.6 });
    const dark = s.material('#17181a', { roughness: 0.8 });
    const rubber = s.material('#1b1c1d', { roughness: 0.92 });
    const frameMat = s.material(wear > 0.6 ? '#4a372c' : '#2a2c2e', { roughness: 0.8 });
    const running = a.driver === 'idling', asleep = a.driver === 'asleep';
    const curtainMat = s.material(mood.cheer > 0.5 ? '#9a3b3f' : '#4a4f63', { roughness: 1 });
    const glass = asleep ? curtainMat : s.material('#1b2932', { roughness: 0.08, metalness: 0.6, emissive: '#ffcf87', emissiveIntensity: a.driver === 'away' ? mix(0.25, 0.9, night) : 0 });
    const amber = s.material('#ffab2e', { emissive: '#ff9a1c', emissiveIntensity: running ? 2 : asleep ? 0.25 : 0.1 });
    const headMat = s.material('#fff6dc', { emissive: '#fff0c4', emissiveIntensity: running ? 2.4 : 0.05, roughness: 0.2 });
    const red = s.material('#d0201c', { emissive: '#ff2a1c', emissiveIntensity: running ? 1.6 : 0.1 });

    const lay = {
      classic: { nose: 3.5, front: 2.6, tandem: [-2.5, -3.8], end: -4.5, fifth: -3.15, stackZ: -0.32, stackX: 1.3, stackTop: 4.15, tankZ: 0.45, tankLen: 1.6 },
      aero: { nose: 3.3, front: 2.4, tandem: [-2.7, -4.0], end: -4.7, fifth: -3.35, stackZ: -2.52, stackX: 1.02, stackTop: 4.2, tankZ: 0, tankLen: 0 },
      cabover: { nose: 3.5, front: 2.55, tandem: [-1.6, -2.9], end: -3.6, fifth: -2.25, stackZ: 0.72, stackX: 1.02, stackTop: 3.95, tankZ: -0.1, tankLen: 1.4 },
    }[a.style];

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    const box = (parent: THREE.Object3D, size: P, at: P, material: THREE.Material) => add(parent, new THREE.BoxGeometry(...size), material, at);
    const cyl = (parent: THREE.Object3D, r0: number, r1: number, h: number, at: P, material: THREE.Material, axis: 'x' | 'y' | 'z' = 'y', seg = 16) => { const m = add(parent, new THREE.CylinderGeometry(r0, r1, h, seg), material, at); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m; };

    // ---- Chassis: rails, crossmembers, axles, wheels.
    const flen = lay.nose - lay.end;
    for (const x of [-1, 1]) box(s.root, [0.1, 0.26, flen], [x * 0.43, 0.92, (lay.nose + lay.end) / 2], frameMat);
    for (let i = 0; i < 5; i++) box(s.root, [0.86, 0.12, 0.1], [0, 0.9, lay.end + 0.3 + (i * (lay.fifth - lay.end + 1.6)) / 4], frameMat);
    const tyres: { at: P; size: number; color: string }[] = [], hubs: { at: P; size: number; color: string }[] = [];
    const wheel = (x: number, z: number, outer: boolean) => { tyres.push({ at: [x, R, z], size: 1, color: '#ffffff' }); if (outer) hubs.push({ at: [x + Math.sign(x) * 0.08, R, z], size: 1, color: '#ffffff' }); };
    for (const x of [-1, 1]) { wheel(x * 1.07, lay.front, true); for (const z of lay.tandem) { wheel(x * 0.78, z, false); wheel(x * 1.1, z, true); } }
    const tyreGeo = new THREE.CylinderGeometry(R, R, 0.3, 22); tyreGeo.rotateZ(Math.PI / 2);
    s.scatter(tyreGeo, s.material('#ffffff', { color: '#1b1c1d', roughness: 0.92 }), tyres);
    const hubGeo = new THREE.LatheGeometry([[0, 0.2], [0.09, 0.2], [0.12, 0.13], [0.3, 0.1], [0.33, 0.14], [0.33, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 18); hubGeo.rotateZ(-Math.PI / 2);
    const hubMesh = s.scatter(hubGeo, hubMat, hubs);
    { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1); hubs.forEach((hub, i) => { q.setFromEuler(new THREE.Euler(0, hub.at[0] < 0 ? Math.PI : 0, 0)); hubMesh.setMatrixAt(i, m.compose(new THREE.Vector3(...hub.at), q, one)); }); }
    for (const z of [lay.front, ...lay.tandem]) cyl(s.root, 0.09, 0.09, 2.0, [0, R, z], frameMat, 'x', 8);
    for (const z of lay.tandem) box(s.root, [0.3, 0.3, 0.3], [0, R, z], frameMat);

    // Rear: mud flaps, tail lamps, fifth wheel, air lines.
    for (const x of [-1, 1]) {
      const flap = box(s.root, [0.62, 0.62, 0.025], [x * 0.94, 0.52, lay.end + 0.12], rubber); flap.rotation.x = 0.06;
      box(s.root, [0.5, 0.06, 0.03], [x * 0.94, 0.26, lay.end + 0.1], chrome1);
      box(s.root, [0.62, 0.05, 0.08], [x * 0.94, 0.85, lay.end + 0.14], frameMat);
      box(s.root, [0.2, 0.1, 0.05], [x * 0.5, 0.95, lay.end - 0.01], red);
      // Half fenders over the tandems.
      const fender = add(s.root, new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.64, 14, 1, false, -Math.PI / 2, Math.PI), a.chrome > 0.7 ? shiny : blackout, [x * 0.94, R + 0.02, (lay.tandem[0] + lay.tandem[1]) / 2]);
      fender.rotation.z = Math.PI / 2; fender.scale.set(1, 1, (lay.tandem[0] - lay.tandem[1] + 2 * R + 0.2) / (2 * R + 0.2) * 0.62);
    }
    const plate = cyl(s.root, 0.5, 0.5, 0.07, [0, BY + 0.14, lay.fifth], s.material('#2c2d2e', { metalness: 0.7, roughness: 0.35 }), 'y', 20); plate.rotation.x = -0.07;
    box(s.root, [0.16, 0.08, 0.5], [0, BY + 0.145, lay.fifth - 0.3], dark).rotation.x = -0.07;
    for (const x of [-1, 1]) box(s.root, [0.12, 0.2, 0.5], [x * 0.36, BY, lay.fifth], frameMat);
    box(s.root, [1.0, 0.04, 0.9], [0, 1.07, lay.fifth], frameMat);

    // ---- Body.
    const tilt = a.driver === 'repair';
    const bodyG = new THREE.Group(); bodyG.position.set(0, BY, 0); s.root.add(bodyG);
    const noseG = new THREE.Group(); noseG.position.set(0, BY, lay.nose); s.root.add(noseG);
    type Section = { parent: THREE.Object3D; zf: number; zr: number; y0: number; y1: number; half: number; x0: number };
    const sections: Section[] = [];
    let doorInfo: { parent: THREE.Object3D; zf: number; zr: number; y1: number; half: number } | null = null;
    let roof = { parent: bodyG as THREE.Object3D, z: 1.2, y: 1.85, half: 1.1 };
    let sleeperBack = { z: -2.2, top: 3.5 - BY, half: 1.2 };
    let nick: Section | null = null;

    const door = (parent: THREE.Object3D, zf: number, zr: number, y1: number, half: number) => {
      doorInfo = { parent, zf, zr, y1, half };
      const len = zf - zr, winH = y1 * 0.4;
      for (const side of [-1, 1]) {
        const open = side === 1 && a.driver === 'away';
        const x = side * (half + 0.006);
        if (open) {
          box(parent, [0.02, y1 - 0.1, len], [side * (half + 0.002), y1 / 2, (zf + zr) / 2], dark);
          box(parent, [0.06, 0.55, 0.5], [side * (half - 0.25), 0.7, (zf + zr) / 2 - 0.1], s.material('#6b4a36', { roughness: 0.9 }));
          const hinge = new THREE.Group(); hinge.position.set(side * (half + 0.02), 0, zf); hinge.rotation.y = -side * mix(0.9, 1.25, random()); parent.add(hinge);
          box(hinge, [0.05, y1 - 0.1, len], [0, y1 / 2, -len / 2], paint);
          box(hinge, [0.03, winH, len - 0.2], [-0.02, y1 - winH / 2 - 0.12, -len / 2], glass);
          box(hinge, [0.02, 0.5, len - 0.1], [-0.035, 0.45, -len / 2], s.material('#3a3d40', { roughness: 0.9 }));
        } else {
          box(parent, [0.02, winH, len - 0.2], [x, y1 - winH / 2 - 0.12, (zf + zr) / 2], glass);
          for (const z of [zf, zr]) box(parent, [0.012, y1 - 0.1, 0.02], [x, y1 / 2, z], dark);
          box(parent, [0.03, 0.04, 0.14], [x, y1 - winH - 0.22, zr + 0.14], chrome1);
        }
        // West-coast mirror on a loop bracket.
        const mx = side * (half + 0.36), mz = zf - 0.05;
        for (const y of [y1 - 0.2, y1 - winH - 0.25]) { const arm = add(parent, new THREE.CylinderGeometry(0.014, 0.014, 0.38, 6), chrome1, [side * (half + 0.18), y, mz]); arm.rotation.z = Math.PI / 2; }
        box(parent, [0.05, winH + 0.1, 0.2], [mx, y1 - winH / 2 - 0.2, mz], chrome1);
        if (mood.density > 0.35) add(parent, new THREE.CylinderGeometry(0.006, 0.01, 1.5 + random() * 0.5, 5), dark, [mx, y1 + 0.45, mz]).rotation.z = side * -0.05;
        // Steps under the door.
        box(parent, [0.22, 0.04, len * 0.7], [side * (half - 0.02), -0.3, (zf + zr) / 2], chrome2);
      }
    };
    const sleeperWindow = (parent: THREE.Object3D, z: number, y: number, half: number) => {
      for (const side of [-1, 1]) {
        box(parent, [0.02, 0.42, 0.5], [side * (half + 0.006), y, z], running ? glass : curtainMat);
        box(parent, [0.025, 0.46, 0.03], [side * (half + 0.008), y, z + (running ? 0.2 : 0.0)], running ? curtainMat : s.material('#000000', { color: new THREE.Color(curtainMat.color).multiplyScalar(0.7) }));
        box(parent, [0.014, 0.5, 0.54], [side * (half + 0.002), y, z], dark);
      }
    };
    const markers = (parent: THREE.Object3D, z: number, y: number, half: number) => {
      const pts: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 5; i++) pts.push({ at: [-half * 0.8 + (i * half * 1.6) / 4, y, z], size: 1, color: '#ffffff' });
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), amber, 5);
      const m = new THREE.Matrix4(); pts.forEach((p, i) => { m.makeScale(1, 0.8, 1.4).setPosition(...p.at); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color('#ffffff')); });
      parent.add(mesh);
      for (const x of [-1, 1]) { const horn = cyl(parent, 0.035, 0.09, 0.62, [x * half * 0.42, y + 0.09, z - 0.38], chrome1, 'z', 10); horn.rotation.x = -Math.PI / 2; box(parent, [0.05, 0.1, 0.05], [x * half * 0.42, y + 0.03, z - 0.5], chrome1); }
    };
    const grille = (parent: THREE.Object3D, w: number, h: number, at: P) => {
      box(parent, [w, h, 0.06], at, chrome1);
      const slats: { at: P; size: number; color: string }[] = [];
      const n = Math.round(w / 0.11);
      for (let i = 0; i < n; i++) slats.push({ at: [at[0] - w / 2 + 0.07 + (i * (w - 0.14)) / (n - 1), at[1], at[2] + 0.02], size: 1, color: '#ffffff' });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, h - 0.14, 0.04), s.material('#0f1011', { roughness: 0.5 }), n);
      const m = new THREE.Matrix4(); slats.forEach((p, i) => { m.makeTranslation(...p.at); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color('#ffffff')); });
      parent.add(mesh);
      box(parent, [0.26, 0.1, 0.03], [at[0], at[1] + h / 2 - 0.1, at[2] + 0.04], trim);
    };
    const lamp = (parent: THREE.Object3D, at: P, r: number) => { cyl(parent, r + 0.025, r + 0.025, 0.1, at, chrome1, 'z', 14); cyl(parent, r, r, 0.03, [at[0], at[1], at[2] + 0.045], headMat, 'z', 14); };
    const windshield = (parent: THREE.Object3D, w: number, y: number, h: number, z: number, rake: number) => {
      const pane = box(parent, [w, h, 0.03], [0, y, z], glass); pane.rotation.x = -rake;
      const post = box(parent, [0.05, h, 0.04], [0, y, z + 0.005], paint); post.rotation.x = -rake;
      if (asleep) for (let i = 0; i < 9; i++) { const pleat = box(parent, [0.015, h * 0.96, 0.034], [-w / 2 + 0.1 + (i * (w - 0.2)) / 8, y, z + 0.002], s.material('#000000', { color: new THREE.Color(curtainMat.color).multiplyScalar(0.72) })); pleat.rotation.x = -rake; }
      else { for (const x of [-1, 1]) { const wiper = box(parent, [0.5, 0.02, 0.02], [x * w * 0.24, y - h / 2 + 0.1, z + 0.03 + rake * 0.3], dark); wiper.rotation.z = x * 0.25; } }
      if (a.lettering === 'forsale') {
        const card = painted(0.6, 0.38, (ctx, cw, ch) => { ctx.fillStyle = '#f26a1b'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#16181a'; ctx.fillRect(0, 0, cw, ch * 0.46); write(ctx, 'FOR SALE', cw / 2, ch * 0.24, ch * 0.3, '#f26a1b', { max: cw * 0.9 }); write(ctx, '555-0' + (100 + Math.floor(random() * 899)), cw / 2, ch * 0.72, ch * 0.3, '#16181a', { max: cw * 0.9 }); }, { px: 256, glow: 0.2 });
        card.position.set(-w * 0.24, y - h * 0.12, z + 0.03 - rake * 0.05); card.rotation.x = -rake; parent.add(card);
      }
    };

    if (a.style === 'cabover') {
      // The whole cab is one tilting box over the engine.
      const H = 2.25, half = 1.2, len = 2.6;
      box(noseG, [half * 2, H, len], [0, H / 2, -len / 2], paint);
      box(noseG, [half * 2 + 0.04, 0.1, len + 0.04], [0, H + 0.03, -len / 2], paint);
      windshield(noseG, half * 2 - 0.3, 1.55, 0.85, 0.012, 0);
      grille(noseG, 1.5, 0.78, [0, 0.52, 0.02]);
      for (const x of [-1, 1]) { lamp(noseG, [x * 0.98, 0.42, 0.02], 0.1); lamp(noseG, [x * 0.98, 0.68, 0.02], 0.1); }
      const badge = painted(1.3, 0.14, (ctx, w, h) => { ctx.fillStyle = accent; ctx.fillRect(0, 0, w, h); write(ctx, ['TRANSTAR', 'ROADKING', 'HIGHLINER'][Math.floor(random() * 3)], w / 2, h / 2, h * 0.7, base, { max: w * 0.9 }); }, { px: 256 });
      badge.position.set(0, 1.02, 0.02); noseG.add(badge);
      door(noseG, -0.15, -1.1, H - 0.1, half);
      sleeperWindow(noseG, -1.95, 1.5, half);
      markers(noseG, -0.1, H + 0.1, half);
      box(noseG, [half * 2, 0.05, 0.36], [0, H - 0.05, 0.16], a.chrome > 0.5 ? shiny : paint).rotation.x = 0.3;
      sections.push({ parent: noseG, zf: 0, zr: -len, y0: 0, y1: H, half, x0: 0 });
      nick = { parent: noseG, zf: -1.25, zr: -2.55, y0: 0.2, y1: 1.1, half, x0: 0 };
      roof = { parent: noseG, z: -0.1, y: H + 0.1, half };
      sleeperBack = { z: lay.nose - len, top: H, half };
      if (tilt) noseG.rotation.x = mix(0.55, 0.75, random());
      // Engine on the rails.
      box(s.root, [0.85, 0.75, 1.5], [0, BY + 0.3, lay.nose - 1.25], s.material('#c9a11a', { roughness: 0.6 }));
      box(s.root, [0.5, 0.14, 1.3], [0, BY + 0.74, lay.nose - 1.25], dark);
      cyl(s.root, 0.16, 0.16, 0.3, [0.45, BY + 0.6, lay.nose - 1.6], shiny, 'z', 12);
      box(s.root, [1.3, 0.9, 0.1], [0, BY + 0.2, lay.nose - 0.25], dark);
    } else {
      const aero = a.style === 'aero';
      const cabHalf = aero ? 1.2 : 1.15, cabTop = aero ? 1.9 : 1.85, slHalf = aero ? 1.23 : 1.2, slTop = aero ? 2.85 : 2.35, slRear = aero ? -2.45 : -2.2;
      // Hood, on a pivot at the bumper.
      const hl = lay.nose - 1.3;
      if (aero) {
        add(noseG, prism([[-hl, 0], [0, 0], [0, 0.5], [-0.55, 0.92], [-hl, 1.22]], 2.34), paint);
        grille(noseG, 1.0, 0.42, [0, 0.3, 0.0]);
        for (const x of [-1, 1]) { box(noseG, [0.42, 0.22, 0.08], [x * 0.9, 0.36, -0.02], chrome1); box(noseG, [0.36, 0.16, 0.03], [x * 0.9, 0.36, 0.03], headMat); }
        for (const x of [-1, 1]) { const arch = add(noseG, new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.06, 16, 1, false, -Math.PI / 2, Math.PI), dark, [x * 1.16, R - BY, lay.front - lay.nose]); arch.rotation.z = Math.PI / 2; }
        sections.push({ parent: noseG, zf: -0.6, zr: -hl, y0: 0, y1: 0.9, half: 1.17, x0: 0 });
      } else {
        add(noseG, prism([[-hl, 0], [0, 0], [0, 1.08], [-hl, 1.2]], 1.5), paint);
        grille(noseG, 1.34, 1.06, [0, 0.56, 0.02]);
        cyl(noseG, 0.02, 0.03, 0.14, [0, 1.15, -0.08], chrome1, 'y', 6);
        for (const x of [-1, 1]) {
          const fender = add(noseG, new THREE.CylinderGeometry(R + 0.14, R + 0.14, 0.56, 16, 1, false, -Math.PI / 2, Math.PI), paint, [x * 1.02, R - BY + 0.02, lay.front - lay.nose]); fender.rotation.z = Math.PI / 2;
          box(noseG, [0.56, 0.06, 0.9], [x * 1.02, R - BY + 0.0, lay.front - lay.nose - 1.05], paint).rotation.x = -0.25;
          lamp(noseG, [x * 0.98, 0.42, -0.02], 0.13);
          box(noseG, [0.03, 0.08, 1.1], [x * 0.752, 0.75, -hl / 2], dark);
          amberBead(noseG, [x * 1.02, R - BY + 0.72, lay.front - lay.nose + 0.1]);
        }
        sections.push({ parent: noseG, zf: 0, zr: -hl, y0: 0, y1: 1.08, half: 0.75, x0: 0 });
      }
      if (tilt) noseG.rotation.x = mix(0.75, 1.0, random());
      // Engine and radiator, seen when the hood is up.
      if (tilt) {
        box(s.root, [0.8, 0.8, 1.5], [0, BY + 0.38, lay.nose - 1.25], s.material(random() < 0.5 ? '#c9a11a' : '#a3251f', { roughness: 0.6 }));
        box(s.root, [0.45, 0.14, 1.3], [0, BY + 0.84, lay.nose - 1.25], dark);
        cyl(s.root, 0.17, 0.17, 0.3, [0.5, BY + 0.62, lay.nose - 1.5], shiny, 'z', 12);
        cyl(s.root, 0.2, 0.2, 0.5, [-0.55, BY + 0.7, lay.nose - 1.8], dark, 'y', 12);
        box(s.root, [1.2, 1.0, 0.12], [0, BY + 0.5, lay.nose - 0.3], dark);
        const fan = cyl(s.root, 0.4, 0.4, 0.04, [0, BY + 0.45, lay.nose - 0.42], s.material('#5a5e60', { metalness: 0.6 }), 'z', 10); void fan;
      }
      // Cab.
      box(bodyG, [cabHalf * 2, cabTop, 1.6], [0, cabTop / 2, 0.5], paint);
      box(bodyG, [cabHalf * 2 - 0.4, 0.6, 0.3], [0, 0.6, 1.3], paint);
      windshield(bodyG, cabHalf * 2 - 0.26, cabTop - 0.52, 0.78, 1.31 - (aero ? 0.1 : 0.03), aero ? 0.32 : 0.1);
      door(bodyG, 1.15, 0.2, cabTop - 0.1, cabHalf);
      sections.push({ parent: bodyG, zf: 1.3, zr: -0.3, y0: 0, y1: cabTop, half: cabHalf, x0: lay.nose - 1.3 });
      // Sleeper.
      box(bodyG, [slHalf * 2, slTop, -0.3 - slRear], [0, slTop / 2, (slRear - 0.3) / 2], paint);
      box(bodyG, [slHalf * 2 + 0.03, 0.06, -0.3 - slRear + 0.03], [0, slTop + 0.02, (slRear - 0.3) / 2], aero ? paint : trim);
      sleeperWindow(bodyG, (slRear - 0.3) / 2 + 0.25, 1.45, slHalf);
      sections.push({ parent: bodyG, zf: -0.3, zr: slRear, y0: 0, y1: Math.min(slTop, 2.35), half: slHalf, x0: lay.nose + 0.3 });
      nick = { parent: bodyG, zf: -0.42, zr: slRear + 0.1, y0: 0.25, y1: 1.05, half: slHalf, x0: 0 };
      sleeperBack = { z: slRear, top: slTop, half: slHalf };
      if (aero) {
        add(bodyG, prism([[1.3, cabTop], [-0.3, slTop], [-0.3, cabTop]], cabHalf * 2), paint);
        for (const x of [-1, 1]) box(bodyG, [0.07, 0.72, 3.5], [x * 1.2, -0.4, -1.0], paint);
        for (const x of [-1, 1]) box(bodyG, [0.05, slTop - 0.3, 0.4], [x * slHalf, slTop / 2 + 0.1, slRear - 0.2], paint);
        roof = { parent: bodyG, z: 1.2, y: cabTop + 0.06, half: cabHalf };
        const pts = [[1.2, cabTop + 0.04]]; void pts;
        markers(bodyG, 0.9, cabTop + 0.27, cabHalf * 0.9);
      } else {
        add(bodyG, prism([[0.35, cabTop], [-0.3, slTop], [-0.3, cabTop]], cabHalf * 2 - 0.2), paint);
        box(bodyG, [cabHalf * 2 + 0.06, 0.05, 0.42], [0, cabTop - 0.02, 1.46], a.chrome > 0.5 ? shiny : paint).rotation.x = 0.28;
        markers(bodyG, 1.2, cabTop + 0.05, cabHalf);
      }
    }
    function amberBead(parent: THREE.Object3D, at: P) { add(parent, new THREE.SphereGeometry(0.05, 8, 6), amber, at); }

    // Bumper.
    if (a.style === 'aero') { box(s.root, [2.5, 0.55, 0.3], [0, 0.6, lay.nose + 0.05], paint); box(s.root, [1.4, 0.2, 0.05], [0, 0.55, lay.nose + 0.2], dark); for (const x of [-1, 1]) box(s.root, [0.2, 0.1, 0.04], [x * 1.0, 0.55, lay.nose + 0.2], headMat); }
    else { box(s.root, [2.5, 0.4, 0.14], [0, 0.72, lay.nose + 0.17], chrome1); for (const x of [-1, 1]) box(s.root, [0.3, 0.42, 0.3], [x * 1.25, 0.72, lay.nose + 0.06], chrome1).rotation.y = x * 0.5; box(s.root, [0.5, 0.16, 0.02], [0, 0.72, lay.nose + 0.245], s.material('#f2f2ee')); }

    // Saddle tanks with straps and steps.
    if (lay.tankLen) for (const x of [-1, 1]) {
      cyl(s.root, 0.34, 0.34, lay.tankLen, [x * 0.98, 0.72, lay.tankZ], chrome2, 'z', 18);
      for (const dz of [-0.3, 0.3]) cyl(s.root, 0.35, 0.35, 0.06, [x * 0.98, 0.72, lay.tankZ + dz * lay.tankLen], dark, 'z', 18);
      cyl(s.root, 0.06, 0.06, 0.06, [x * 0.98, 1.07, lay.tankZ + lay.tankLen * 0.3], dark, 'y', 8);
    }

    // Exhaust stacks with heat shields and turned-out tips.
    const tops: P[] = [];
    for (const x of [-1, 1]) {
      const sx = x * lay.stackX;
      cyl(s.root, 0.075, 0.075, lay.stackTop - 0.9, [sx, (lay.stackTop + 0.9) / 2, lay.stackZ], chrome2, 'y', 12);
      cyl(s.root, 0.105, 0.105, 1.25, [sx, 2.1, lay.stackZ], a.chrome > 0.5 ? shiny : s.material('#4a4d50', { metalness: 0.5, roughness: 0.5 }), 'y', 12);
      const tip = cyl(s.root, 0.078, 0.078, 0.3, [sx + x * 0.05, lay.stackTop + 0.1, lay.stackZ - 0.03], chrome2, 'y', 12); tip.rotation.set(-0.35, 0, -x * 0.3);
      cyl(s.root, 0.065, 0.065, 0.02, [sx + x * 0.095, lay.stackTop + 0.235, lay.stackZ - 0.08], dark, 'y', 10).rotation.copy(tip.rotation);
      box(s.root, [0.3, 0.04, 0.04], [sx - x * 0.14, 2.6, lay.stackZ], dark);
      tops.push([sx + x * 0.1, lay.stackTop + 0.3, lay.stackZ - 0.1]);
    }

    // Air lines coiled on the back of the sleeper.
    const backZ = sleeperBack.z - 0.04, by = BY + Math.min(sleeperBack.top, 2.2) * 0.62;
    if (a.driver !== 'repair' || a.style !== 'cabover') {
      box(s.root, [0.5, 0.08, 0.06], [0, by + 0.02, backZ], dark);
      ['#c9281f', '#1f5fb0', '#2d8a4a'].forEach((colour, i) => {
        const x = -0.16 + i * 0.16;
        const pts = coil([[x, by, backZ - 0.05], [x + 0.03, by - 0.5, backZ - 0.2], [x * 0.6, BY + 0.2, Math.max(lay.fifth + 0.75, backZ - 0.5)]], 0.045, 13, 9);
        add(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), pts.length * 2, 0.012, 5), s.material(colour, { roughness: 0.5 }));
      });
    }

    // ---- Side paint, one continuous design drawn across hood, door and sleeper.
    const total = lay.nose - (a.style === 'cabover' ? lay.nose - 2.6 : a.style === 'aero' ? -2.45 : -2.2);
    const motif = (ctx: Ctx, top: number, seed: () => number) => {
      const Y = (hb: number) => top - hb;
      if (a.scheme === 'twotone') {
        ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(-0.2, Y(-0.1)); ctx.lineTo(total + 0.2, Y(-0.1)); ctx.lineTo(total + 0.2, Y(1.15)); ctx.bezierCurveTo(total * 0.55, Y(1.1), total * 0.4, Y(0.42), -0.2, Y(0.45)); ctx.fill();
        ctx.strokeStyle = a.colour === 'black' ? '#f2ead2' : '#16171a'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(total + 0.2, Y(1.27)); ctx.bezierCurveTo(total * 0.55, Y(1.22), total * 0.4, Y(0.54), -0.2, Y(0.57)); ctx.stroke();
      } else if (a.scheme === 'stripes') {
        for (let k = 0; k < 3; k++) { ctx.strokeStyle = k === 1 ? '#f4f1e6' : accent; ctx.lineWidth = k === 1 ? 0.03 : 0.06; ctx.beginPath(); ctx.moveTo(-0.2, Y(0.5 + k * 0.1)); ctx.bezierCurveTo(total * 0.4, Y(0.45 + k * 0.1), total * 0.6, Y(1.05 + k * 0.1), total + 0.2, Y(1.1 + k * 0.1)); ctx.stroke(); }
        ctx.strokeStyle = accent; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(-0.2, Y(0.14)); ctx.lineTo(total + 0.2, Y(0.14)); ctx.stroke();
      } else if (a.scheme === 'flames') {
        const layers: [string, number][] = [['#d2301c', 1], ['#f08a1c', 0.78], ['#f6d32d', 0.52]];
        const tongues = Array.from({ length: 6 }, (_u, i) => ({ hb: 0.1 + i * 0.19, len: total * (0.35 + seed() * 0.5), wob: (seed() - 0.5) * 0.3 }));
        for (const [colour, scale] of layers) {
          ctx.fillStyle = colour; ctx.fillRect(-0.2, Y(1.2), 0.5 * scale + 0.2, 1.3);
          for (const t of tongues) { ctx.beginPath(); ctx.moveTo(0, Y(t.hb - 0.13)); ctx.bezierCurveTo(t.len * scale * 0.5, Y(t.hb - 0.16), t.len * scale * 0.7, Y(t.hb + t.wob + 0.12), t.len * scale, Y(t.hb + t.wob)); ctx.bezierCurveTo(t.len * scale * 0.6, Y(t.hb + t.wob - 0.04), t.len * scale * 0.4, Y(t.hb + 0.2), 0, Y(t.hb + 0.14)); ctx.fill(); }
        }
      } else if (a.scheme === 'fleet') {
        ctx.fillStyle = accent; ctx.fillRect(-0.2, Y(0.4), total + 0.4, 0.12);
        ctx.beginPath(); ctx.moveTo(total - 1.9, Y(0.55)); ctx.lineTo(total - 0.2, Y(0.55)); ctx.lineTo(total + 0.3, Y(2.1)); ctx.lineTo(total - 1.4, Y(2.1)); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(total - 0.85, Y(1.75), 0.26, 0, 7); ctx.fill();
        ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(total - 1.02, Y(1.62)); ctx.lineTo(total - 0.85, Y(1.95)); ctx.lineTo(total - 0.68, Y(1.62)); ctx.fill();
      } else if (a.scheme === 'patch') {
        const hues = ['#8d8f8c', '#6f4a36', '#b8b4a8', accent, '#55585a'];
        for (let i = 0; i < 9; i++) { ctx.fillStyle = hues[Math.floor(seed() * hues.length)]; ctx.fillRect(seed() * total, Y(0.1 + seed() * 1.6), 0.3 + seed() * 0.8, 0.2 + seed() * 0.5); }
      }
    };
    if (a.scheme !== 'solid') for (const sec of sections) for (const side of [-1, 1]) {
      const len = sec.zf - sec.zr, H = sec.y1 - sec.y0;
      let state = (context.seed ^ 0x51ed) >>> 0;
      const seed = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
      const plane = painted(len, H, (ctx, w, h) => {
        ctx.save();
        if (side < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
        ctx.scale(w / len, h / H); ctx.translate(-sec.x0, 0);
        motif(ctx, sec.y1, seed);
        ctx.restore();
      }, { px: 512, cutout: true, roughness: mix(0.3, 0.7, wear) });
      plane.position.set(side * (sec.half + 0.004), (sec.y0 + sec.y1) / 2, (sec.zf + sec.zr) / 2); plane.rotation.y = side * Math.PI / 2; sec.parent.add(plane);
    }

    // Lettering.
    if (doorInfo && (a.lettering === 'owner' || a.lettering === 'fleet')) {
      const d = doorInfo as { parent: THREE.Object3D; zf: number; zr: number; y1: number; half: number };
      const owner = [['R. DUNN & SON', 'AMARILLO, TX'], ['M. OKAFOR', 'CHEYENNE, WY'], ['LUPE REYES TRUCKING', 'LAREDO, TX'], ['B&J HAULING', 'SALINA, KS']][Math.floor(random() * 4)];
      const fleetName = [['TRI-STATE', 'FREIGHT'], ['NORTHERN', 'EXPRESS'], ['SUNBELT', 'CARRIERS']][Math.floor(random() * 3)], unit = 'UNIT ' + (1000 + Math.floor(random() * 8999));
      for (const side of [-1, 1]) {
        if (side === 1 && a.driver === 'away') continue;
        const plane = painted(0.78, 0.4, (ctx, w, h) => {
          const ink = a.scheme === 'twotone' ? base : a.colour === 'white' ? '#16171a' : '#f4f1e6';
          if (a.lettering === 'owner') { write(ctx, owner[0], w / 2, h * 0.3, h * 0.26, ink, { font: 'italic bold', max: w * 0.96 }); write(ctx, owner[1], w / 2, h * 0.7, h * 0.2, ink, { max: w * 0.9 }); }
          else { write(ctx, fleetName[0], w / 2, h * 0.22, h * 0.26, ink, { max: w * 0.96 }); write(ctx, fleetName[1], w / 2, h * 0.52, h * 0.22, ink, { max: w * 0.9 }); write(ctx, unit, w / 2, h * 0.84, h * 0.17, ink); }
        }, { px: 384, cutout: true });
        plane.position.set(side * (d.half + 0.009), d.y1 * 0.33, (d.zf + d.zr) / 2); plane.rotation.y = side * Math.PI / 2; d.parent.add(plane);
      }
    }
    if (nick && a.lettering === 'nickname') {
      const n = nick as Section, name = ['Midnight Rose', 'Lonesome Dove', 'Second Chance', 'Miss Behavin', 'Dust Devil', 'Long Way Home'][Math.floor(random() * 6)];
      for (const side of [-1, 1]) {
        const plane = painted(n.zf - n.zr, n.y1 - n.y0, (ctx, w, h) => { write(ctx, name, w / 2, h * 0.5, h * 0.5, a.colour === 'white' ? '#b3201f' : '#f6e7c2', { font: 'italic bold', max: w * 0.94, outline: a.colour === 'white' ? '#f4f1e6' : '#16171a' }); }, { px: 512, cutout: true });
        plane.position.set(side * (n.half + 0.011), (n.y0 + n.y1) / 2, (n.zf + n.zr) / 2); plane.rotation.y = side * Math.PI / 2; n.parent.add(plane);
      }
    }
    void roof;

    // Show-truck lights: a string of amber along the rocker and the bumper.
    if (a.chrome > 0.72) {
      const pts: { at: P; size: number; color: string }[] = [];
      const z0 = lay.tandem[0] + 0.9, z1 = lay.front - 0.9;
      for (const x of [-1, 1]) for (let z = z0; z <= z1; z += 0.28) pts.push({ at: [x * 1.24, 1.08, z], size: 1, color: '#ffffff' });
      for (let x = -1.1; x <= 1.1; x += 0.28) pts.push({ at: [x, 0.48, lay.nose + 0.2], size: 1, color: '#ffffff' });
      s.scatter(new THREE.SphereGeometry(0.04, 7, 5), s.material('#ffab2e', { emissive: '#ff9a1c', emissiveIntensity: running ? 2.2 : 0.6 }), pts);
      for (const x of [-1, 1]) box(s.root, [0.04, 0.03, z1 - z0 + 0.3], [x * 1.22, 1.08, (z0 + z1) / 2], shiny);
    }

    // Road dirt on the lower body and flaps when worn.
    if (wear > 0.35) {
      const mud = painted(2.3, 0.6, (ctx, w, h) => { ctx.fillStyle = '#6b5a44'; for (let i = 0; i < 260 * wear; i++) { ctx.globalAlpha = 0.25 + random() * 0.5; const y = h * (1 - Math.pow(random(), 2.2)); ctx.beginPath(); ctx.arc(random() * w, y, 2 + random() * 7, 0, 7); ctx.fill(); } grime(ctx, w, h, random, wear * 0.5, '#5a4a38'); }, { px: 256, cutout: true, roughness: 1 });
      mud.position.set(0, 0.62, lay.end + 0.14); mud.rotation.y = Math.PI; s.root.add(mud);
    }

    // Breakdown kit.
    if (tilt) {
      const tx = 1.75, tz = lay.front + 0.4;
      box(s.root, [0.55, 0.26, 0.26], [tx, 0.13, tz], s.material('#b3201f', { roughness: 0.5 }));
      const lid = box(s.root, [0.55, 0.03, 0.26], [tx, 0.33, tz - 0.12], s.material('#b3201f', { roughness: 0.5 })); lid.rotation.x = -1.1;
      for (let i = 0; i < 4; i++) { const tool = box(s.root, [0.3, 0.015, 0.035], [tx - 0.5 + random() * 0.3, 0.012, tz + 0.3 + random() * 0.4], shiny); tool.rotation.y = random() * 3; }
      const rag = s.ball([0.14, 0.03, 0.11], [tx + 0.1, 0.03, tz + 0.5], s.material('#c2302a', { roughness: 1 }), 8); rag.rotation.y = random() * 3;
      cyl(s.root, 0.13, 0.11, 0.3, [tx + 0.5, 0.15, tz - 0.1], s.material('#2a2c2e'), 'y', 12);
      const puddle = cyl(s.root, 0.5, 0.5, 0.006, [0.5, 0.004, lay.nose - 1.4], s.material('#101112', { roughness: 0.1, metalness: 0.5 }), 'y', 18); puddle.scale.set(1, 1, 1.5);
    }

    // Exhaust shimmer.
    const puffs: { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; origin: P; phase: number }[] = [];
    const strength = running ? 1 : asleep ? 0.45 : 0;
    if (strength) for (const origin of tops) for (let i = 0; i < 4; i++) {
      const material = new THREE.MeshStandardMaterial({ color: mood.warmth < 0.35 ? '#e9eef2' : '#8f8f8c', transparent: true, opacity: 0.1, depthWrite: false, roughness: 1 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), material);
      s.root.add(mesh); puffs.push({ mesh, material, origin, phase: i / 4 + random() * 0.2 });
    }
    const place = (time: number) => {
      const speed = mix(0.25, 0.9, mood.energy);
      for (const puff of puffs) {
        const t = (time * speed + puff.phase) % 1;
        puff.mesh.position.set(puff.origin[0] + Math.sin(time * 1.7 + puff.phase * 9) * 0.06 * t, puff.origin[1] + t * 1.3, puff.origin[2] - t * 0.5);
        puff.mesh.scale.setScalar(0.1 + t * 0.32);
        puff.material.opacity = (1 - t) * 0.17 * strength;
      }
    };
    place(0.3);
    const lampFlicker = running ? mix(0, 0.12, mood.energy) : 0;
    return s.finish({
      footprint: 2.6,
      update: (_dt, time) => { place(time); if (lampFlicker) amber.emissiveIntensity = 2 * (1 - lampFlicker * (0.5 + 0.5 * Math.sin(time * 31))); },
    });
  },
});
