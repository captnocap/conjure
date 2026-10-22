import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

type V3 = [number, number, number];

const PAINTS = {
  red: 'Fire-engine red enamel, the classic hardware-store marker.',
  green: 'Parks-department green.',
  yellow: 'School-bus yellow.',
  blue: 'Royal blue, the home team colour.',
  galvanised: 'Bare galvanised sheet steel, no paint at all.',
} as const;
const PAINT_TINT: Record<keyof typeof PAINTS, string> = { red: '#c2331f', green: '#3d7046', yellow: '#e2b21f', blue: '#2a53a6', galvanised: '#a9b0b2' };

/** Flat-shaded copy of a geometry, for sheet-metal shapes. */
const facet = (geometry: THREE.BufferGeometry) => {
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return flat;
};

export default defineThing({
  questions: {
    machine: choice('What kind of line marker is it?', {
      boxcart: 'A sheet-metal box hopper tapering to a slot, on four small wheels with a bent tube handle.',
      bucket: 'A tall round funnel hopper slung between two big wheels, with a rear skid leg.',
      drum: 'An antique: a perforated rolling drum is both wheel and hopper, pushed like a wheelbarrow.',
      spray: 'A modern three-wheeled aerosol striper with an upside-down paint can and a pistol-grip handle.',
    }),
    paint: choice('What colour is the machine painted?', PAINTS),
    surface: choice('What ground is it marking?', {
      infield: 'Raked red-brown infield dirt: a baseball foul line.',
      grass: 'Mown turf in light and dark stripes: a football or soccer pitch.',
      cinder: 'A charcoal cinder running track.',
      asphalt: 'Grey playground asphalt: four-square and hopscotch courts.',
    }),
    line: choice('What does the line it has laid look like?', {
      straight: 'Ruler straight and crisp, a professional job.',
      wobbly: 'Wandering and wavering, laid by a kid or a tired volunteer.',
      corner: "It runs back and then turns a square corner: a batter's box or a penalty area.",
      sputter: 'Solid far away but breaking into dashes and puffs near the machine: the hopper ran dry.',
      doubled: 'A bright new line laid slightly off a faded old one.',
      none: 'No line yet: the job has not started.',
    }),
    state: choice('What is happening with it right now?', {
      working: 'Mid-job: lid thrown open, chalk heaped in the hopper, paused for a moment.',
      parked: 'Finished and parked neatly, lid shut, ready for the game.',
      tipped: 'Knocked over on its side with a white fan of chalk spilled across the ground.',
      abandoned: 'Left out for seasons: weeds through the wheels, chalk caked hard by rain.',
    }),
    bag: choice('If it uses dry chalk, what is the bag beside it like?', {
      slumped: 'An open sack slumped against nothing, half empty, a scoop stuck in the top.',
      full: 'A fat unopened fifty-pound sack lying flat.',
      empties: 'A couple of flattened empty sacks.',
      none: 'No bag at all.',
    }),
    beside: choice('What else is lying with it?', {
      nothing: 'Nothing else.',
      string: 'A taut string line between two stakes to steer by.',
      rake: 'An infield rake laid on the ground.',
      base: 'A white canvas base bag and a mallet, waiting to be set.',
      footprints: 'White chalky footprints walking away from it.',
    }),
    dust: score('How much loose chalk has got everywhere?', ['Spotless', 'A light dusting', 'Smears and drifts', 'Everything is white with it']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const G = 0.03;
    const abandoned = a.state === 'abandoned';
    const rust = Math.min(1, mood.wear * 0.6 + (abandoned ? 0.45 : 0));
    const body = aged(new THREE.Color(PAINT_TINT[a.paint]).lerp(new THREE.Color('#9a9a94'), (1 - mood.cheer) * 0.12), rust * 0.6, '#7a4b30');
    const steel = aged('#9aa1a3', rust * 0.7, '#7a4b30');
    const rubber = '#26282a';
    const chalk = new THREE.Color('#f7f5ee').lerp(new THREE.Color('#d8d4c6'), abandoned ? 0.5 : mood.wear * 0.2);
    const dusty = (color: THREE.ColorRepresentation, amount = 1) => new THREE.Color(color).lerp(chalk, Math.min(0.7, a.dust * 0.3 * amount));

    // ----- the patch of ground it is marking -----
    const ground = new Batch();
    const GW = 2.2, GL = 2.8, GZ = -0.65;
    if (a.surface === 'grass') {
      const bands = 6;
      for (let i = 0; i < bands; i++) ground.box([GW, G, GL / bands], [0, G / 2, GZ - GL / 2 + (i + 0.5) * (GL / bands)], new THREE.Color().setHSL(0.27, mix(0.4, 0.62, mood.cheer), i % 2 ? 0.17 : 0.22));
    } else {
      const tint = { infield: aged('#96552f', mood.wear * 0.2, '#7d6a56'), cinder: '#34312f', asphalt: '#565856' }[a.surface];
      ground.box([GW, G, GL], [0, G / 2, GZ], tint);
      const marks = a.surface === 'infield' ? 16 : a.surface === 'cinder' ? 0 : 5;
      for (let i = 0; i < marks; i++) {
        if (a.surface === 'infield') ground.box([GW - 0.1, 0.002, 0.012], [0, G + 0.001, GZ - GL / 2 + 0.1 + i * (GL - 0.2) / marks + random() * 0.05], new THREE.Color(tint).multiplyScalar(0.86));
        else {
          const x = (random() - 0.5) * GW * 0.8, z = GZ + (random() - 0.5) * GL * 0.8, turn = random() * 3;
          ground.box([0.5 + random() * 0.6, 0.002, 0.012], [x, G + 0.001, z], '#3a3c3a', [0, turn, 0]);
        }
      }
      if (a.surface === 'cinder') for (const x of [-0.85, 0.85]) ground.box([0.05, 0.002, GL], [x, G + 0.001, GZ], '#a9a698');
    }
    ground.into(s.root, { roughness: 0.95 });

    // ----- the line -----
    const marks = new Batch();
    const L = 1.8, step = 0.075, width = 0.115;
    const phase = random() * 6, drift = (random() - 0.5) * 0.12;
    const path = (d: number): [number, number, number] => {
      if (a.line === 'wobbly') {
        const x = Math.sin(d * 2.6 + phase) * 0.09 * Math.min(1, d * 2) + Math.sin(d * 6.1 + phase) * 0.025 + drift * d;
        return [x, -d, Math.cos(d * 2.6 + phase) * 0.22];
      }
      if (a.line === 'corner' && d > 1.05) return [-(d - 1.05), -1.05, Math.PI / 2];
      return [0, -d, 0];
    };
    const lay = (tint: THREE.Color, offsetX: number, skew: number, patchy: number, w: number) => {
      for (let d = 0.02; d < L; d += step) {
        const [x, z, heading] = path(d);
        const gap = a.line === 'sputter' ? Math.max(0, 1 - d / 1.3) : 0;
        if (random() < patchy || random() < gap * 0.85) continue;
        const thin = a.line === 'sputter' ? mix(0.35, 1, Math.min(1, d / 1.1)) : 1;
        marks.box([w * thin * mix(0.88, 1.1, random()), 0.006, step * 1.12], [x + offsetX + skew * d, G + 0.004, z], tint, [0, heading, 0]);
      }
    };
    if (a.line !== 'none') {
      if (a.line === 'doubled') lay(new THREE.Color(chalk).lerp(new THREE.Color('#9d9484'), 0.55), 0.09, 0.03, 0.3, width * 0.9);
      lay(chalk, 0, 0, abandoned ? 0.22 : mood.wear * 0.08, width);
      // Overspray flecks along the edges.
      const flecks = Math.round(mix(6, 60, a.dust));
      for (let i = 0; i < flecks; i++) {
        const [x, z] = path(random() * L);
        marks.cyl(0.012 + random() * 0.02, 0.012 + random() * 0.02, 0.004, [x + (random() - 0.5) * 0.34, G + 0.002, z + (random() - 0.5) * 0.1], chalk, 6);
      }
    }

    // ----- the machine, built in its own group so it can be tipped over -----
    const cart = new THREE.Group();
    const m = new Batch();
    const wheel = (x: number, y: number, z: number, r: number, w: number, hub: THREE.ColorRepresentation) => {
      m.cyl(r, r, w, [x, y, z], dusty(rubber, 0.8), 16, [0, 0, Math.PI / 2]);
      m.cyl(r * 0.58, r * 0.58, w + 0.012, [x, y, z], dusty(hub, 0.5), 12, [0, 0, Math.PI / 2]);
      m.cyl(r * 0.16, r * 0.16, w + 0.03, [x, y, z], steel, 8, [0, 0, Math.PI / 2]);
    };
    const handle = (x: number, from: V3, grip: V3) => {
      const bend: V3 = [from[0], mix(from[1], grip[1], 0.82), mix(from[2], grip[2], 0.7)];
      for (const side of [-1, 1]) {
        m.rod([side * from[0], from[1], from[2]], [side * bend[0], bend[1], bend[2]], 0.014, steel, 6);
        m.rod([side * bend[0], bend[1], bend[2]], [side * x, grip[1], grip[2]], 0.014, steel, 6);
      }
      m.rod([-x, grip[1], grip[2]], [x, grip[1], grip[2]], 0.014, steel, 6);
      for (const side of [-1, 1]) m.rod([side * x, grip[1], grip[2]], [side * (x - 0.11), grip[1], grip[2]], 0.02, rubber, 8);
    };
    const open = a.state === 'working';
    let spout: V3 = [0, 0.1, 0.05];
    let top = 0.7;

    if (a.machine === 'boxcart') {
      const hopper = facet(new THREE.CylinderGeometry(0.7071, 0.7071 * 0.62, 0.42, 4, 1, !open ? false : true));
      hopper.rotateY(Math.PI / 4);
      m.add(hopper, dusty(body, 0.7), [0, 0.45, 0], [0, 0, 0], [0.44, 1, 0.52]);
      m.box([0.47, 0.03, 0.55], [0, 0.655, 0], dusty(body, 0.4));
      if (open) m.box([0.4, 0.02, 0.48], [0, 0.6, 0], chalk);
      m.box([0.16, 0.08, 0.2], [0, 0.2, 0], steel);
      m.box([0.3, 0.02, 0.04], [0, 0.155, 0.02], dusty(steel, 2));
      for (const z of [-0.2, 0.22]) {
        m.rod([-0.25, 0.1, z], [0.25, 0.1, z], 0.012, steel, 6);
        for (const x of [-0.27, 0.27]) wheel(x, 0.1, z, 0.1, 0.045, '#d9d6cc');
        for (const side of [-1, 1]) m.rod([side * 0.17, 0.26, z * 0.7], [side * 0.2, 0.1, z], 0.012, steel, 5);
      }
      const hinge: V3 = [0, 0.675, -0.27];
      if (open) m.box([0.46, 0.014, 0.54], [0, hinge[1] + 0.27 * 0.94, hinge[2] - 0.27 * 0.34], body, [-1.92, 0, 0]);
      else { m.box([0.48, 0.016, 0.56], [0, 0.68, 0], dusty(body, 1.4)); m.box([0.1, 0.03, 0.03], [0, 0.7, 0.2], steel); }
      handle(0.2, [0.19, 0.5, -0.22], [0, 0.94, -0.72]);
      m.rod([0.1, 0.94, -0.72], [0.12, 1.02, -0.66], 0.008, steel, 5);
      m.rod([0.12, 1.0, -0.67], [0.1, 0.22, -0.06], 0.004, '#3a3d3f', 4);
      spout = [0, 0.14, 0.02];
      top = 0.67;
    } else if (a.machine === 'bucket') {
      m.cyl(0.22, 0.11, 0.5, [0, 0.52, 0], dusty(body, 0.7), 16);
      m.add(new THREE.TorusGeometry(0.22, 0.012, 5, 20), steel, [0, 0.77, 0], [Math.PI / 2, 0, 0]);
      m.cyl(0.07, 0.05, 0.14, [0, 0.21, 0], steel, 10);
      if (open) m.cyl(0.2, 0.2, 0.02, [0, 0.74, 0], chalk, 16);
      else { m.cyl(0.03, 0.23, 0.07, [0, 0.805, 0], dusty(body, 1.4), 16); m.ball([0.025, 0.025, 0.025], [0, 0.85, 0], steel, 8); }
      if (open) m.cyl(0.03, 0.23, 0.07, [0.34, 0.07, -0.45], body, 16, [0.15, 0, 0.1]);
      m.rod([-0.3, 0.17, 0], [0.3, 0.17, 0], 0.012, steel, 6);
      for (const x of [-0.29, 0.29]) {
        wheel(x, 0.17, 0, 0.17, 0.04, '#d9d6cc');
        m.rod([x * 0.62, 0.45, 0], [x * 0.9, 0.17, 0], 0.012, steel, 5);
      }
      m.rod([0, 0.4, -0.12], [0, 0.02, -0.34], 0.014, steel, 6);
      m.box([0.16, 0.02, 0.05], [0, 0.01, -0.34], steel);
      handle(0.19, [0.17, 0.62, -0.13], [0, 0.96, -0.68]);
      spout = [0, 0.14, 0];
      top = 0.76;
    } else if (a.machine === 'drum') {
      const axle: V3 = [0, 0.21, 0.08];
      m.cyl(0.2, 0.2, 0.28, axle, dusty(body, 0.8), 20, [0, 0, Math.PI / 2]);
      for (const x of [-0.14, 0.14]) m.cyl(0.215, 0.215, 0.03, [x, axle[1], axle[2]], steel, 20, [0, 0, Math.PI / 2]);
      m.cyl(0.204, 0.204, 0.09, axle, dusty('#c9c5b8', 2), 20, [0, 0, Math.PI / 2]);
      for (let i = 0; i < 14; i++) { const t = i / 14 * 6.283; m.box([0.07, 0.012, 0.012], [0, axle[1] + Math.sin(t) * 0.205, axle[2] + Math.cos(t) * 0.205], '#2b2c2c', [-t, 0, 0]); }
      m.cyl(0.05, 0.05, 0.03, [0.08, axle[1] + 0.2, axle[2]], open ? '#1f1f1f' : steel, 10);
      const wood = aged('#8a6642', rust * 0.5, '#8a857a');
      for (const side of [-1, 1]) {
        m.rod([side * 0.17, axle[1], axle[2]], [side * 0.24, 0.86, -0.82], 0.02, wood, 6);
        m.rod([side * 0.24, 0.86, -0.82], [side * 0.25, 0.86, -0.95], 0.024, rubber, 8);
        m.rod([side * 0.2, 0.5, -0.33], [side * 0.22, 0, -0.4], 0.016, wood, 5);
        m.cyl(0.03, 0.03, 0.03, [side * 0.165, axle[1], axle[2]], steel, 8, [0, 0, Math.PI / 2]);
      }
      m.rod([-0.2, 0.5, -0.33], [0.2, 0.5, -0.33], 0.016, wood, 5);
      m.rod([-0.22, 0.72, -0.62], [0.22, 0.72, -0.62], 0.016, wood, 5);
      spout = [0, 0.02, 0.08];
      top = 0.42;
    } else {
      m.box([0.22, 0.03, 0.46], [0, 0.2, 0.02], dusty(body, 0.6));
      m.box([0.24, 0.16, 0.02], [0, 0.11, 0.26], dusty(body, 1.2));
      for (const x of [-0.13, 0.13]) m.box([0.02, 0.16, 0.2], [x, 0.11, 0.17], dusty(body, 1.2));
      wheel(0, 0.1, 0.38, 0.1, 0.04, body);
      m.rod([0, 0.2, 0.24], [0, 0.1, 0.38], 0.012, steel, 5);
      m.rod([-0.24, 0.1, -0.16], [0.24, 0.1, -0.16], 0.012, steel, 6);
      for (const x of [-0.25, 0.25]) wheel(x, 0.1, -0.16, 0.1, 0.04, body);
      m.cyl(0.034, 0.034, 0.2, [0, 0.33, 0.14], '#ecebe6', 12);
      m.cyl(0.02, 0.034, 0.03, [0, 0.215, 0.14], rubber, 10);
      m.cyl(0.036, 0.036, 0.05, [0, 0.36, 0.14], PAINT_TINT[a.paint === 'galvanised' ? 'red' : a.paint], 12);
      m.rod([0, 0.2, -0.12], [0, 0.86, -0.62], 0.016, steel, 6);
      m.rod([0, 0.86, -0.62], [0, 0.97, -0.6], 0.016, steel, 6);
      m.rod([-0.16, 0.97, -0.6], [0.16, 0.97, -0.6], 0.02, rubber, 8);
      m.rod([0.05, 0.93, -0.6], [0.05, 0.84, -0.52], 0.008, '#c0392b', 5);
      m.rod([0.03, 0.86, -0.58], [0, 0.44, 0.14], 0.004, '#3a3d3f', 4);
      // Spare cans in a clip on the handle.
      for (let i = 0; i < 2; i++) m.cyl(0.033, 0.033, 0.19, [-0.05 + i * 0.1, 0.5, -0.31], '#ecebe6', 10, [0.64, 0, 0]);
      spout = [0, 0.05, 0.14];
      top = 0.45;
    }
    // Chalk caked and smeared on the machine itself.
    const smears = Math.round(a.dust * 14 + (abandoned ? 6 : 0));
    for (let i = 0; i < smears; i++) m.ball([0.03 + random() * 0.05, 0.015, 0.03 + random() * 0.05], [(random() - 0.5) * 0.3, top + 0.012, (random() - 0.5) * 0.36], chalk, 6);
    m.into(cart, { roughness: mix(0.45, 0.85, rust), metalness: 0.2, side: THREE.DoubleSide });
    cart.position.y = G;
    s.root.add(cart);

    if (a.state === 'tipped') {
      cart.rotation.set(0, (random() - 0.5) * 0.5, -(1.42 + random() * 0.12));
      cart.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(cart);
      cart.position.y += G - box.min.y;
      cart.position.x -= 0.12;
      // The spill fans out from the open top.
      for (let i = 0; i < 46; i++) {
        const reach = random(), spread = (random() - 0.5) * (0.25 + reach * 0.9);
        const r = mix(0.11, 0.03, reach) * mix(0.7, 1.3, random());
        marks.ball([r, mix(0.03, 0.006, reach), r], [0.4 + reach * 0.55, G + 0.003, spread * 0.7 + 0.02], chalk, 8);
      }
      marks.ball([0.2, 0.06, 0.2], [0.46, G, 0], chalk, 12);
    } else if (a.line !== 'none') {
      marks.ball([0.07, 0.012, 0.07], [spout[0], G + 0.004, spout[2]], chalk, 8);
    }
    if (abandoned) cart.rotation.z = 0.05;

    // ----- loose chalk drifts -----
    const drifts = Math.round(a.dust * a.dust * 60 * mix(0.6, 1.3, mood.density));
    for (let i = 0; i < drifts; i++) {
      const angle = random() * 6.283, r = 0.15 + random() * random() * 0.7;
      const size = 0.015 + random() * 0.045;
      marks.ball([size, 0.004, size * mix(0.6, 1.2, random())], [Math.cos(angle) * r * 0.8, G + 0.002, Math.sin(angle) * r - 0.15], chalk, 8);
    }

    // ----- the bag of chalk -----
    const dry = a.machine !== 'spray';
    const sack = aged('#cdb98f', mood.wear * 0.3, '#8f8674');
    const stripe = aged('#2f4f8f', mood.wear * 0.4, '#8f8674');
    const bagX = 0.64, bagZ = -0.25 + (random() - 0.5) * 0.2, bagTurn = (random() - 0.5) * 0.8;
    const bagLabel = () => new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e4d6b0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2f4f8f'; ctx.fillRect(0, 0, w, 54); ctx.fillRect(0, h - 30, w, 30);
      ctx.fillStyle = '#e4d6b0'; ctx.textAlign = 'center'; ctx.font = 'bold 38px Arial, sans-serif'; ctx.fillText('FIELD', w / 2, 42);
      ctx.fillStyle = '#2f4f8f'; ctx.font = 'bold 50px Arial, sans-serif'; ctx.fillText('MARKING', w / 2, 118, w - 16); ctx.fillText('CHALK', w / 2, 170, w - 16);
      ctx.font = 'bold 30px Arial, sans-serif'; ctx.fillText('50 LB', w / 2, 212);
    }) });
    if (dry && a.bag === 'full') {
      const bag = new Batch();
      bag.ball([0.21, 0.09, 0.33], [0, 0.085, 0], sack, 14);
      bag.box([0.36, 0.012, 0.03], [0, 0.085, 0.32], sack);
      bag.box([0.36, 0.012, 0.03], [0, 0.085, -0.32], sack);
      const mesh = bag.into(s.root, { roughness: 0.95 })!;
      mesh.position.set(bagX, G, bagZ);
      mesh.rotation.y = bagTurn;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.34), bagLabel());
      label.rotation.x = -Math.PI / 2;
      label.position.y = 0.178;
      mesh.add(label);
    } else if (dry && a.bag === 'slumped') {
      const bag = new Batch();
      bag.ball([0.2, 0.2, 0.14], [0, 0.17, 0], sack, 14);
      bag.ball([0.22, 0.09, 0.17], [0, 0.07, 0.02], sack, 14);
      bag.cyl(0.14, 0.17, 0.14, [0.02, 0.36, -0.01], sack, 10, [0.1, 0, -0.18]);
      bag.cyl(0.125, 0.125, 0.012, [0.035, 0.425, -0.015], chalk, 10, [0.1, 0, -0.18]);
      bag.box([0.3, 0.07, 0.006], [0, 0.2, 0.139], stripe);
      // The scoop: a cut-down tin with a handle.
      bag.cyl(0.045, 0.045, 0.12, [0.06, 0.47, 0], steel, 10, [0.5, 0, -0.4]);
      bag.rod([0.09, 0.52, 0.03], [0.14, 0.6, 0.06], 0.012, '#7a5a3a', 5);
      bag.ball([0.13, 0.03, 0.11], [0.06, 0.012, 0.22], chalk, 10);
      const mesh = bag.into(s.root, { roughness: 0.95 })!;
      mesh.position.set(bagX, G, bagZ);
      mesh.rotation.set(0, bagTurn - 0.5, 0.12);
    } else if (dry && a.bag === 'empties') {
      const bag = new Batch();
      const count = 2 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const x = (random() - 0.5) * 0.3, z = (random() - 0.5) * 0.5, turn = random() * 3;
        bag.box([0.34, 0.014, 0.52], [x, 0.01 + i * 0.016, z], sack, [(random() - 0.5) * 0.06, turn, (random() - 0.5) * 0.08]);
        bag.box([0.34, 0.016, 0.09], [x, 0.011 + i * 0.016, z], stripe, [0, turn, 0]);
        bag.ball([0.06, 0.004, 0.05], [x + 0.2, 0.003, z + 0.25], chalk, 6);
      }
      const mesh = bag.into(s.root, { roughness: 0.95 })!;
      mesh.position.set(bagX, G, bagZ);
      mesh.rotation.y = bagTurn;
    }

    // ----- what else lies with it -----
    const extra = new Batch();
    if (a.beside === 'string') {
      const x = -0.22;
      for (const z of [0.55, -1.9]) {
        extra.rod([x, G - 0.05, z], [x + 0.01, G + 0.26, z], 0.012, '#8a6a45', 5);
        extra.cyl(0.016, 0.016, 0.02, [x + 0.01, G + 0.27, z], '#c0392b', 6);
      }
      extra.rod([x + 0.005, G + 0.2, 0.55], [x + 0.005, G + 0.2, -1.9], 0.004, '#f0d24a', 4);
      extra.cyl(0.05, 0.05, 0.07, [x - 0.12, G + 0.05, 0.6], '#f0d24a', 10, [0, 0, Math.PI / 2]);
    } else if (a.beside === 'rake') {
      const z0 = -1.25, turn = 0.35 + random() * 0.3;
      const dir: V3 = [Math.sin(turn), 0, Math.cos(turn)];
      const head: V3 = [-0.7, G + 0.03, z0];
      extra.rod(head, [head[0] + dir[0] * 1.35, G + 0.05, head[2] + dir[2] * 1.35], 0.016, '#b08a55', 6);
      extra.box([0.6, 0.03, 0.04], head, steel, [0, turn, 0]);
      for (let i = 0; i < 12; i++) { const t = (i - 5.5) * 0.05; extra.box([0.008, 0.07, 0.008], [head[0] + Math.cos(turn) * t, G + 0.045, head[2] - Math.sin(turn) * t], steel); }
    } else if (a.beside === 'base') {
      const x = -0.62, z = -0.35;
      extra.box([0.38, 0.07, 0.38], [x, G + 0.035, z], aged('#f1eee4', mood.wear * 0.4, '#a08a6a'), [0, 0.3, 0]);
      extra.box([0.3, 0.075, 0.3], [x, G + 0.036, z], aged('#f8f6ee', mood.wear * 0.4, '#a08a6a'), [0, 0.3, 0]);
      extra.rod([x + 0.1, G + 0.03, z - 0.5], [x + 0.36, G + 0.04, z - 0.85], 0.016, '#9a7445', 6);
      extra.cyl(0.05, 0.05, 0.14, [x + 0.08, G + 0.05, z - 0.47], '#2f2f2f', 10, [Math.PI / 2, 0, 0.6]);
    } else if (a.beside === 'footprints') {
      let x = -0.25, z = -0.15;
      const heading = -2.6 + (random() - 0.5) * 0.3;
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, fade = 1 - i / 8;
        const px = x + Math.cos(heading) * side * 0.09, pz = z + Math.sin(heading) * side * -0.09;
        const tint = new THREE.Color(chalk).lerp(new THREE.Color('#8f8273'), 1 - fade);
        extra.ball([0.05, 0.003, 0.085], [px, G + 0.002, pz], tint, 8, [0, heading + side * 0.12, 0]);
        extra.ball([0.04, 0.003, 0.04], [px - Math.sin(heading) * 0.1, G + 0.002, pz - Math.cos(heading) * 0.1], tint, 8);
        x += Math.sin(heading) * 0.24; z += Math.cos(heading) * 0.24;
      }
    }
    extra.into(s.root, { roughness: 0.85 });
    marks.into(s.root, { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.06 });

    // ----- weeds for a machine left out -----
    const tufts = Math.round((abandoned ? 26 : 0) + (a.surface === 'grass' ? 0 : mood.wear * mood.density * 10));
    if (tufts) {
      const blade = new THREE.ConeGeometry(0.02, 0.2, 4);
      blade.translate(0, 0.1, 0);
      s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: tufts }, () => {
        const angle = random() * 6.283, r = abandoned ? 0.1 + random() * 0.45 : 0.4 + random() * 0.8;
        return { at: [Math.cos(angle) * r, G, Math.sin(angle) * r - (abandoned ? 0.05 : 0.6)] as V3, size: 0.6 + random() * (abandoned ? 1.6 : 0.8), color: new THREE.Color().setHSL(mix(0.2, 0.3, random()), 0.4, mix(0.25, 0.4, random())) };
      }));
    }

    // Turn the whole vignette so the line trails off diagonally instead of hiding behind the machine.
    const vignette = new THREE.Group();
    for (const child of [...s.root.children]) vignette.add(child);
    vignette.rotation.y = 0.75 + (random() - 0.5) * 0.3;
    s.root.add(vignette);
    return s.finish({ footprint: 1.3 });
  },
});
