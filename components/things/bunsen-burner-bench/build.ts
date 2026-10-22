import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const HEATED = {
  water: 'A beaker of plain water coming to the boil.',
  copper: 'A beaker of bright blue copper sulphate solution.',
  purple: 'A conical flask of deep purple permanganate.',
  green: 'A conical flask of murky green liquid nobody can identify.',
  crucible: 'A small white lidded crucible on a pipeclay triangle, magnesium inside.',
  dish: 'A shallow white evaporating dish with a crust of salt forming.',
  tube: 'A boiling tube of brown liquid held at an angle in a clamp on a retort stand.',
  nothing: 'Nothing: the tripod and gauze stand empty over the burner.',
} as const;
const LIQUID: Record<keyof typeof HEATED, string> = {
  water: '#bfe0ea', copper: '#1d86d8', purple: '#7a1f9a', green: '#5c8a2c', crucible: '#f4f2ea', dish: '#f2efe4', tube: '#8a5326', nothing: '#ffffff',
};
const FLAMES = {
  off: 'Not lit at all: cold brass and a faint smell of gas.',
  safety: 'A tall, lazy, wavering yellow safety flame.',
  roaring: 'A short, hard blue roaring flame with a pale inner cone.',
  green: 'A vivid green flame, copper salts on the wire.',
  lilac: 'A delicate lilac flame, potassium.',
  crimson: 'A deep crimson flame, lithium or strontium.',
} as const;
const FLAME: Record<keyof typeof FLAMES, { colour: string; height: number; radius: number }> = {
  off: { colour: '#000000', height: 0, radius: 0 },
  safety: { colour: '#ffb52e', height: 0.085, radius: 0.017 },
  roaring: { colour: '#2f7dff', height: 0.06, radius: 0.014 },
  green: { colour: '#34e06a', height: 0.07, radius: 0.016 },
  lilac: { colour: '#c08cff', height: 0.07, radius: 0.016 },
  crimson: { colour: '#f02a3a', height: 0.07, radius: 0.016 },
};

export default defineThing({
  questions: {
    heating: choice('What is being heated over the burner?', HEATED),
    flame: choice('What is the flame doing?', FLAMES),
    story: choice('What is happening at this bench?', {
      ready: 'Set out neatly before the lesson, nothing touched yet.',
      running: 'Mid-experiment: steam rising, a notebook open beside it.',
      abandoned: 'Left burning after the bell: boiled almost dry, soot on the gauze, a notebook left open.',
      wrong: 'It has gone wrong: foam pouring over the rim, a scorch on the bench, broken glass.',
      flooded: 'The sink tap was left running and water is sheeting over the edge onto the floor.',
    }),
    bench: choice('What kind of bench is it?', {
      teak: 'Old dark oiled hardwood on varnished cupboards with brass knobs.',
      epoxy: 'A black resin top on white modern units with steel handles.',
      steel: 'Grey laminate on a tubular steel frame, open underneath with a shelf.',
      green: 'A cream top on institutional green painted cupboards, mid-century.',
    }),
    sink: choice('What is the sink like?', {
      ceramic: 'A deep white ceramic sink with a tall swan-neck tap.',
      steel: 'A small stainless drip sink with a short cranked tap.',
      none: 'No sink in this section, just more bench.',
    }),
    tubes: choice('What is in the test-tube rack?', {
      rainbow: 'A rainbow of bright solutions, one colour per tube.',
      indicator: 'A graded run from red through green to purple: universal indicator.',
      clear: 'Clear liquids that all look the same.',
      murk: 'Brown and grey sludges with precipitate at the bottom.',
      empty: 'Empty tubes, a couple missing from the rack.',
    }),
    goggles: noul('Have safety goggles been left on the bench?'),
    stand: noul('Is there a retort stand with a clamp on the bench?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.6, D = 0.7, T = 0.86;
    const top = { teak: '#4a2f1f', epoxy: '#1d2023', steel: '#9aa0a0', green: '#d8cfb4' }[a.bench];
    const body = { teak: '#8a5a34', epoxy: '#e9e9e4', steel: '#7c8588', green: '#6f9479' }[a.bench];
    const topMat = s.material(top, { roughness: 0.55 });
    const bodyMat = s.material(body, { roughness: 0.6, metalness: a.bench === 'steel' ? 0.5 : 0 });
    const brass = s.material('#b08a3c', { metalness: 0.8, roughness: 0.35 });
    const steel = s.material('#c5cbcc', { metalness: 0.85, roughness: 0.3 });
    const iron = s.material('#2c2d2e', { metalness: 0.5, roughness: 0.6 });
    const white = s.material('#f1efe8', { roughness: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f2', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const hasSink = a.sink !== 'none' || a.story === 'flooded';
    const sx = 0.56, sw = a.sink === 'ceramic' ? 0.34 : 0.26, sd = a.sink === 'ceramic' ? 0.4 : 0.3;

    // Worktop, pieced around the sink hole.
    const th = 0.05, ty = T - th / 2, o = 0.02;
    if (hasSink) {
      const l = sx - sw / 2, r = sx + sw / 2;
      s.box([l + W / 2 + o, th, D + o * 2], [(l - W / 2 - o) / 2, ty, 0], topMat);
      s.box([W / 2 + o - r, th, D + o * 2], [(r + W / 2 + o) / 2, ty, 0], topMat);
      s.box([sw, th, D / 2 + o - sd / 2], [sx, ty, (sd / 2 + D / 2 + o) / 2], topMat);
      s.box([sw, th, D / 2 + o - sd / 2], [sx, ty, -(sd / 2 + D / 2 + o) / 2], topMat);
      const bowl = a.sink === 'ceramic' ? white : steel, depth = a.sink === 'ceramic' ? 0.2 : 0.12;
      s.box([sw, 0.015, sd], [sx, T - depth, 0], bowl);
      for (const k of [-1, 1]) {
        s.box([0.015, depth, sd], [sx + k * (sw / 2 - 0.0075), T - depth / 2, 0], bowl);
        s.box([sw, depth, 0.015], [sx, T - depth / 2, k * (sd / 2 - 0.0075)], bowl);
      }
      s.cylinder(0.018, 0.018, 0.004, [sx, T - depth + 0.01, 0], iron, 12);
      // Tap.
      const tz = -sd / 2 - 0.05;
      s.cylinder(0.018, 0.022, 0.05, [sx, T + 0.025, tz], brass, 12);
      if (a.sink === 'ceramic') s.tube([[sx, T + 0.04, tz], [sx, T + 0.3, tz], [sx, T + 0.36, tz + 0.06], [sx, T + 0.33, tz + 0.14], [sx, T + 0.27, tz + 0.15]], 0.011, brass);
      else s.tube([[sx, T + 0.04, tz], [sx, T + 0.14, tz], [sx, T + 0.16, tz + 0.05], [sx, T + 0.13, tz + 0.13]], 0.01, steel);
      s.rod([sx - 0.05, T + 0.07, tz], [sx + 0.05, T + 0.07, tz], 0.007, brass);
      s.ball([0.014, 0.014, 0.014], [sx - 0.055, T + 0.07, tz], s.material('#2a6fc0'), 10);
    } else s.box([W + o * 2, th, D + o * 2], [0, ty, 0], topMat);
    s.box([W + o * 2, 0.1, 0.02], [0, T + 0.05, -D / 2 - o + 0.01], topMat);

    // Base.
    if (a.bench === 'steel') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, T - th, 0.035], [x * (W / 2 - 0.04), (T - th) / 2, z * (D / 2 - 0.04)], bodyMat);
      s.box([W - 0.08, 0.03, D - 0.08], [0, 0.22, 0], s.material('#b7b2a4'));
      s.box([W - 0.06, 0.06, 0.02], [0, T - th - 0.03, D / 2 - 0.04], bodyMat);
      const boxes = Math.round(mix(1, 4, mood.density));
      for (let i = 0; i < boxes; i++) s.box([0.22, 0.14 + random() * 0.1, 0.3], [-0.55 + i * 0.36, 0.31, (random() - 0.5) * 0.1], s.material(['#3a6ea8', '#b9b29b', '#a34a3a', '#567a52'][i % 4]));
    } else {
      const h = T - th - 0.08;
      s.box([W, 0.08, D - 0.08], [0, 0.04, -0.02], s.material('#2b2a28'));
      const sinkDrop = hasSink ? 0.2 : 0;
      const l = hasSink ? sx - sw / 2 - 0.01 : W / 2;
      s.box([l + W / 2, h, D - 0.03], [(l - W / 2) / 2, 0.08 + h / 2, 0], bodyMat);
      if (hasSink) s.box([W / 2 - l, h - sinkDrop, D - 0.03], [(l + W / 2) / 2, 0.08 + (h - sinkDrop) / 2, 0], bodyMat), s.box([W / 2 - l, sinkDrop, 0.02], [(l + W / 2) / 2, 0.08 + h - sinkDrop / 2, D / 2 - 0.025], bodyMat), s.box([0.02, sinkDrop, D - 0.03], [W / 2 - 0.01, 0.08 + h - sinkDrop / 2, 0], bodyMat);
      const panel = s.material(new THREE.Color(body).multiplyScalar(0.86));
      const handle = a.bench === 'epoxy' ? steel : brass;
      const doors = 3, dw = W / doors;
      for (let i = 0; i < doors; i++) {
        const x = -W / 2 + dw * (i + 0.5);
        const drawer = i === 0;
        if (drawer) {
          for (let j = 0; j < 3; j++) {
            s.box([dw - 0.04, h / 3 - 0.03, 0.012], [x, 0.08 + h / 6 + j * h / 3, D / 2 - 0.012], panel);
            s.box([0.12, 0.014, 0.02], [x, 0.08 + h / 6 + j * h / 3 + 0.04, D / 2 + 0.004], handle);
          }
        } else {
          const ajar = a.story === 'wrong' && i === 1 ? 0.5 : 0;
          const door = s.box([dw - 0.04, h - 0.05, 0.012], [x, 0.08 + h / 2, D / 2 - 0.012], panel);
          if (ajar) { door.rotation.y = -ajar; door.position.x -= 0.03; door.position.z += 0.09; }
          else if (a.bench === 'epoxy') s.box([0.014, 0.14, 0.02], [x + (i === 1 ? 1 : -1) * (dw / 2 - 0.06), 0.62, D / 2 + 0.004], handle);
          else s.ball([0.016, 0.016, 0.016], [x + (i === 1 ? 1 : -1) * (dw / 2 - 0.06), 0.6, D / 2 + 0.004], handle, 10);
        }
      }
    }

    // Stains from years of spills.
    const stain = s.material(a.bench === 'epoxy' ? '#3a3d40' : '#2a1c14', { transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < Math.round(mood.wear * 9); i++) {
      const r = 0.02 + random() * 0.05;
      s.cylinder(r, r, 0.002, [-0.75 + random() * 1, T + 0.002, (random() - 0.5) * 0.6], stain, 12);
    }

    // Everything on the bench top is built slightly over life size so it reads from across a room.
    const kit = new THREE.Group();
    kit.position.y = T;
    kit.scale.setScalar(1.8);
    s.root.add(kit);
    const on = <M extends THREE.Object3D>(m: M) => (kit.add(m), m);

    // Gas tap: a brass turret with two nozzles and a yellow lever.
    on(s.cylinder(0.014, 0.018, 0.07, [-0.08, 0.035, -0.185], brass, 12));
    on(s.rod([-0.12, 0.06, -0.185], [-0.04, 0.06, -0.185], 0.007, brass));
    on(s.box([0.012, 0.012, 0.05], [-0.08, 0.078, -0.175], s.material('#f2c318')));
    on(s.cylinder(0.02, 0.02, 0.004, [-0.08, 0.002, -0.185], s.material('#f2c318'), 12));

    // The burner.
    const bx = -0.1, bz = 0.03;
    on(s.cylinder(0.03, 0.045, 0.014, [bx, 0.007, bz], iron, 20));
    on(s.cylinder(0.009, 0.011, 0.125, [bx, 0.075, bz], steel, 14));
    on(s.cylinder(0.015, 0.015, 0.022, [bx, 0.035, bz], brass, 14));
    on(s.rod([bx, 0.022, bz], [bx + 0.05, 0.022, bz - 0.01], 0.006, brass));
    on(s.tube([[bx + 0.05, 0.022, bz - 0.01], [bx + 0.11, 0.012, bz - 0.04 - random() * 0.04], [bx + 0.1, 0.012, bz - 0.13], [-0.03, 0.03, -0.185], [-0.04, 0.06, -0.185]], 0.0065, s.material('#c8502c', { roughness: 0.8 })));

    const flame = FLAME[a.flame];
    const flames: THREE.Mesh[] = [];
    const lit = a.flame !== 'off';
    const tall = a.heating === 'tube';
    if (lit) {
      const glow = new THREE.MeshStandardMaterial({ color: flame.colour, emissive: flame.colour, emissiveIntensity: 1.6, roughness: 1 });
      const outer = on(s.mesh(new THREE.ConeGeometry(flame.radius, flame.height, 14), glow, [bx, 0.1375 + flame.height / 2, bz]));
      outer.castShadow = false;
      flames.push(outer);
      if (a.flame === 'roaring') {
        const inner = on(s.mesh(new THREE.ConeGeometry(0.007, 0.03, 10), new THREE.MeshStandardMaterial({ color: '#c8f2ff', emissive: '#c8f2ff', emissiveIntensity: 2 }), [bx, 0.1525, bz + 0.012]));
        inner.castShadow = false;
      }
    }

    // Tripod and gauze.
    const gy = 0.215;
    const liquidColour = new THREE.Color(LIQUID[a.heating]).lerp(new THREE.Color('#77766a'), (1 - mood.cheer) * 0.25);
    const liquid = s.material(liquidColour, { roughness: 0.2, emissive: liquidColour, emissiveIntensity: 0.12 });
    const dry = a.story === 'abandoned';
    const fill = dry ? 0.12 : a.story === 'wrong' ? 1 : mix(0.5, 0.75, random());
    let rimY = gy, rimR = 0.04;
    if (!tall) {
      const ring = on(s.ring(0.05, 0.004, [bx, gy - 0.004, bz], iron));
      ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + 0.5;
        on(s.rod([bx + Math.cos(t) * 0.05, gy - 0.004, bz + Math.sin(t) * 0.05], [bx + Math.cos(t) * 0.075, 0, bz + Math.sin(t) * 0.075], 0.004, iron));
      }
      const gauze = on(s.box([0.125, 0.003, 0.125], [bx, gy, bz], s.material(dry || a.story === 'wrong' ? '#3b3a38' : '#8d8f8c', { metalness: 0.5 })));
      gauze.rotation.y = (random() - 0.5) * 0.4;
      on(s.cylinder(0.035, 0.035, 0.004, [bx, gy + 0.001, bz], s.material(dry ? '#5a4d40' : '#e6e1d3'), 16));

      const y0 = gy + 0.003;
      if (a.heating === 'water' || a.heating === 'copper') {
        on(s.mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 24, 1, true), glass, [bx, y0 + 0.05, bz]));
        const rim = on(s.ring(0.042, 0.0025, [bx, y0 + 0.1, bz], white));
        rim.rotation.x = Math.PI / 2;
        on(s.cylinder(0.039, 0.039, 0.09 * fill, [bx, y0 + 0.002 + 0.045 * fill, bz], liquid, 24));
        for (let i = 1; i < 4; i++) on(s.box([0.012, 0.0015, 0.001], [bx + 0.025, y0 + i * 0.022, bz + 0.0425], white));
        rimY = y0 + 0.1; rimR = 0.042;
      } else if (a.heating === 'purple' || a.heating === 'green') {
        on(s.lathe([[0, 0], [0.05, 0], [0.055, 0.008], [0.016, 0.1], [0.016, 0.14], [0.021, 0.146]], glass, [bx, y0, bz]));
        const neck = on(s.ring(0.019, 0.0028, [bx, y0 + 0.146, bz], white));
        neck.rotation.x = Math.PI / 2;
        const h = 0.008 + 0.085 * Math.min(fill, 0.9);
        const r = 0.052 - (h - 0.008) / 0.092 * 0.036;
        on(s.lathe([[0, 0.003], [0.049, 0.003], [0.052, 0.008], [r, h], [0, h]], liquid, [bx, y0, bz]));
        rimY = y0 + 0.146; rimR = 0.018;
      } else if (a.heating === 'crucible') {
        for (let i = 0; i < 3; i++) {
          const t = i * Math.PI * 2 / 3;
          on(s.rod([bx + Math.cos(t) * 0.055, y0 + 0.004, bz + Math.sin(t) * 0.055], [bx + Math.cos(t + 2.094) * 0.055, y0 + 0.004, bz + Math.sin(t + 2.094) * 0.055], 0.005, white));
        }
        on(s.lathe([[0, 0], [0.014, 0], [0.026, 0.04], [0.024, 0.04], [0.012, 0.004], [0, 0.004]], white, [bx, y0 + 0.008, bz]));
        const lid = on(s.cylinder(0.006, 0.029, 0.01, [bx + 0.012, y0 + 0.055, bz], white, 16));
        lid.rotation.z = -0.35;
        if (lit) on(s.ball([0.012, 0.008, 0.012], [bx - 0.006, y0 + 0.046, bz], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 3 }), 10)).castShadow = false;
        rimY = y0 + 0.05; rimR = 0.02;
      } else if (a.heating === 'dish') {
        on(s.lathe([[0, 0], [0.02, 0], [0.05, 0.022], [0.056, 0.03], [0.053, 0.03], [0.02, 0.005], [0, 0.005]], white, [bx, y0, bz]));
        on(s.cylinder(0.046, 0.03, 0.012, [bx, y0 + 0.02, bz], dry ? s.material('#f6f4ec') : liquid, 20));
        rimY = y0 + 0.03; rimR = 0.045;
      }
    }

    // Retort stand, and the clamped boiling tube when that is the experiment.
    if (a.stand || tall) {
      const rx = bx + 0.13, rz = bz - 0.07;
      on(s.box([0.14, 0.012, 0.09], [rx - 0.03, 0.006, rz], iron));
      on(s.cylinder(0.005, 0.005, 0.42, [rx + 0.02, 0.21, rz], steel, 10));
      const cy = tall ? 0.24 : 0.33;
      on(s.box([0.022, 0.022, 0.022], [rx + 0.02, cy, rz], iron));
      on(s.rod([rx + 0.02, cy, rz], [bx + 0.02, cy, bz], 0.004, steel));
      on(s.box([0.03, 0.014, 0.03], [bx + 0.015, cy, bz], iron));
      if (tall) {
        const tube = new THREE.Group();
        tube.position.set(bx + 0.005, cy - 0.035, bz);
        tube.rotation.z = -0.6;
        kit.add(tube);
        const g = s.cylinder(0.013, 0.013, 0.15, [0, 0.045, 0], glass, 14);
        const l = s.cylinder(0.0115, 0.0115, 0.07 * Math.max(fill, 0.3), [0, -0.03 + 0.035 * Math.max(fill, 0.3), 0], liquid, 14);
        const b = s.ball([0.0115, 0.0115, 0.0115], [0, -0.03, 0], liquid, 12);
        const rim = s.ring(0.014, 0.002, [0, 0.12, 0], white);
        rim.rotation.x = Math.PI / 2;
        tube.add(g, l, b, rim);
        rimY = cy + 0.08; rimR = 0.012;
      }
    }

    // What the story leaves on and around the vessel.
    const puffs: THREE.Mesh[] = [];
    const steamy = lit && a.heating !== 'nothing' && a.heating !== 'crucible' && (a.story === 'running' || a.story === 'wrong');
    if (steamy) {
      const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const p = on(s.ball([0.014, 0.014, 0.014], [bx + (tall ? -0.05 : 0), rimY + 0.03 + i * 0.03, bz], steam, 10));
        p.castShadow = false;
        puffs.push(p);
      }
    }
    if (a.story === 'wrong') {
      const foam = s.material(new THREE.Color(liquidColour).lerp(new THREE.Color('#ffffff'), 0.6), { roughness: 0.9 });
      if (a.heating !== 'nothing') {
        const vx = tall ? bx - 0.05 : bx;
        for (let i = 0; i < 16; i++) {
          const t = random() * Math.PI * 2, down = random();
          const r = rimR * (0.5 + down * 0.9) + (down > 0.6 ? 0.03 * down : 0);
          const size = 0.012 + random() * 0.014;
          on(s.ball([size, size, size], [vx + Math.cos(t) * r, Math.max(0.01, rimY + 0.012 - down * down * rimY), bz + Math.sin(t) * r], foam, 8));
        }
        on(s.cylinder(0.09, 0.1, 0.004, [bx + 0.02, 0.002, bz + 0.03], foam, 18)).scale.z = 0.7;
      }
      on(s.cylinder(0.06, 0.06, 0.002, [bx - 0.12, 0.0015, bz + 0.11], s.material('#161412', { roughness: 1 }), 16)).scale.x = 1.5;
      const shard = new THREE.MeshStandardMaterial({ color: '#e8f6f6', roughness: 0.1, metalness: 0.2 });
      for (let i = 0; i < 7; i++) {
        const c = on(s.mesh(new THREE.TetrahedronGeometry(0.008 + random() * 0.01), shard, [bx + 0.1 + random() * 0.13, 0.004, bz + 0.09 + random() * 0.09]));
        c.rotation.set(random() * 3, random() * 3, random() * 3);
        c.scale.y = 0.3;
      }
    }
    if (a.story === 'running' || a.story === 'abandoned') {
      const book = new THREE.Group();
      book.position.set(-0.3, 0, 0.115);
      book.rotation.y = (random() - 0.5) * 0.6;
      kit.add(book);
      for (const k of [-1, 1]) {
        const page = s.label(k < 0 ? 'Cu + S' : '~~~ ~~', 0.085, 0.12, [k * 0.044, 0.006, 0], '#3b4a8a', '#f6f3e6');
        page.rotation.x = -Math.PI / 2;
        page.rotation.y = k * 0.08;
        book.add(page);
      }
      book.add(s.box([0.18, 0.004, 0.125], [0, 0.002, 0], s.material('#b23a3a')));
      const pen = s.rod([-0.03, 0.012, 0.03], [0.05, 0.012, -0.02], 0.004, s.material('#1c3fa0'));
      book.add(pen);
    }
    if (a.story === 'flooded' && hasSink) {
      const water = new THREE.MeshStandardMaterial({ color: '#9fd3e6', roughness: 0.05, metalness: 0.1, emissive: '#3a7f9c', emissiveIntensity: 0.15 });
      s.box([sw - 0.03, 0.01, sd - 0.03], [sx, T + 0.002, 0], water);
      s.box([sw + 0.04, 0.006, D / 2 - sd / 2 + 0.03], [sx, T + 0.003, (sd / 2 + D / 2 + o) / 2], water);
      s.box([sw + 0.04, T, 0.008], [sx, T / 2, D / 2 + o + 0.004], water);
      s.cylinder(0.3, 0.34, 0.006, [sx - 0.05, 0.003, D / 2 + 0.22], water, 28).scale.z = 0.7;
      s.rod([sx, T + 0.27, -sd / 2 + 0.1], [sx, T, -sd / 2 + 0.1], 0.008, water);
    }

    // Test-tube rack.
    const wood = s.material('#b98a52');
    const rack = new THREE.Group();
    rack.position.set(-0.33, 0, -0.03 + (random() - 0.5) * 0.03);
    rack.rotation.y = (random() - 0.5) * 0.35;
    kit.add(rack);
    rack.add(s.box([0.2, 0.01, 0.05], [0, 0.005, 0], wood), s.box([0.2, 0.008, 0.05], [0, 0.07, 0], wood));
    for (const k of [-1, 1]) rack.add(s.box([0.008, 0.075, 0.05], [k * 0.1, 0.0375, 0], wood));
    const sets = {
      rainbow: ['#e23b3b', '#f08a24', '#f3d33b', '#3fb555', '#2f7fe0', '#8a45c8'],
      indicator: ['#d5222a', '#ee7b25', '#e8d43a', '#4daf4a', '#2b6fb8', '#5b2a8c'],
      clear: ['#d5e9ee', '#d5e9ee', '#dfeff0', '#d5e9ee', '#cfe6ea', '#d5e9ee'],
      murk: ['#6e5a3c', '#8a8576', '#4d4a3a', '#7b5b2e', '#9a9382', '#5c5246'],
      empty: [] as string[],
    }[a.tubes];
    for (let i = 0; i < 6; i++) {
      if (a.tubes === 'empty' && random() < 0.35) continue;
      const x = -0.075 + i * 0.03;
      rack.add(s.cylinder(0.0095, 0.0095, 0.11, [x, 0.065, 0], glass, 12));
      const rim = s.ring(0.0105, 0.002, [x, 0.12, 0], white);
      rim.rotation.x = Math.PI / 2;
      rack.add(rim);
      if (sets[i]) {
        const h = 0.04 + random() * 0.045;
        const c = new THREE.Color(sets[i]);
        rack.add(s.cylinder(0.0082, 0.0082, h, [x, 0.012 + h / 2, 0], s.material(c, { emissive: c, emissiveIntensity: 0.15 + mood.cheer * 0.2, roughness: 0.3 }), 12));
      }
    }

    // Spare glassware along the back, more of it on a crowded day.
    const spare = Math.round(mix(1, 5, mood.density));
    const tints = ['#d9a62a', '#2f9c8a', '#c84a6a', '#e9e4d2', '#3d62b8'];
    for (let i = 0; i < spare; i++) {
      const x = -0.42 + i * 0.075 + (random() - 0.5) * 0.02, z = -0.14 + (random() - 0.5) * 0.04;
      if (Math.abs(x + 0.08) < 0.035) continue;
      const tint = s.material(tints[Math.floor(random() * tints.length)], { roughness: 0.3 });
      if (i % 2 === 0) {
        on(s.cylinder(0.026, 0.028, 0.085, [x, 0.0425, z], s.material('#6b4a26', { roughness: 0.25 }), 14));
        on(s.cylinder(0.011, 0.02, 0.025, [x, 0.097, z], s.material('#6b4a26', { roughness: 0.25 }), 12));
        on(s.cylinder(0.013, 0.012, 0.014, [x, 0.115, z], iron, 10));
        const label = on(s.box([0.03, 0.035, 0.002], [x, 0.045, z + 0.0275], white));
        label.rotation.y = 0;
      } else {
        on(s.lathe([[0, 0], [0.03, 0], [0.033, 0.006], [0.011, 0.07], [0.011, 0.095]], glass, [x, 0, z]));
        on(s.lathe([[0, 0.002], [0.029, 0.002], [0.031, 0.006], [0.02, 0.04], [0, 0.04]], tint, [x, 0, z]));
      }
    }

    if (a.goggles) {
      const g = new THREE.Group();
      g.position.set(0.09, 0.02, 0.13);
      g.rotation.y = (random() - 0.5) * 1.2;
      kit.add(g);
      const frame = s.material('#e8eef0', { roughness: 0.2 });
      for (const k of [-1, 1]) {
        const lens = s.cylinder(0.024, 0.026, 0.03, [k * 0.027, 0, 0], frame, 14);
        lens.rotation.x = Math.PI / 2;
        g.add(lens);
      }
      const strap = s.ring(0.05, 0.004, [0, 0, -0.045], s.material('#22262a'));
      strap.rotation.x = Math.PI / 2;
      strap.scale.y = 0.8;
      g.add(strap);
    }

    const speed = mix(4, 18, mood.energy);
    return s.finish({
      update(_dt, time) {
        flames.forEach((f) => {
          const k = 1 + Math.sin(time * speed) * 0.08 + Math.sin(time * speed * 2.7) * 0.05;
          f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
          f.rotation.z = a.flame === 'safety' ? Math.sin(time * speed * 0.3) * 0.12 : 0;
        });
        puffs.forEach((p, i) => {
          const t = (time * mix(0.15, 0.5, mood.energy) + i / puffs.length) % 1;
          p.position.y = rimY + 0.02 + t * 0.2;
          p.position.x = bx + (tall ? -0.05 : 0) + Math.sin(t * 5 + i) * 0.015;
          p.scale.setScalar(0.012 + t * 0.022);
        });
      },
    });
  },
});
