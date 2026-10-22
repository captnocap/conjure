import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, decal, group, paint, rod, stencil, tube } from './h';

export default defineThing({
  questions: {
    fate: choice('Did the pilot come back? What is the locker now?', {
      ready: 'In use: suit on its hanger, helmet on the shelf, boots squared away. They fly tomorrow.',
      back: 'Just back: suit dropped in a heap, helmet on the floor, gloves thrown in. They made it.',
      cleared: 'Cleared out: bare hanger, pale squares where photos were, one cardboard box at its foot.',
      shrine: 'Turned into a shrine: candles and flowers at the foot, notes tucked in the vents, nothing moved.',
    }),
    owner: choice('Whose locker is it?', {
      rookie: 'A rookie: name on masking tape, everything new, one photo from home.',
      ace: 'An ace: rows of tally marks stencilled on the door and a striped helmet.',
      veteran: 'An old hand: faded stickers, a patched suit, decades of photographs.',
      nobody: 'Unmarked: just a stencilled number, could be anyone.',
    }),
    suit: choice('What colour is the flight suit?', {
      orange: 'High-visibility orange.', olive: 'Olive green.', blue: 'Dark blue.', grey: 'Pale grey with black panels.', white: 'White, like an astronaut.',
    }),
    helmet: choice('What is the helmet like?', {
      plain: 'Plain white with a dark visor.',
      stripes: 'Bold red racing stripes over white.',
      black: 'Matt black with a gold visor.',
      checks: 'Yellow with a black checker band.',
    }),
    charm: choice('What lucky charm hangs on the hook?', {
      dice: 'A pair of fuzzy dice.',
      rabbit: 'A rabbit-foot keychain.',
      amulet: 'A small cloth amulet pouch on a red cord.',
      toy: 'A little plush animal, a child gave it.',
      tags: 'A set of dog tags on a ball chain.',
      none: 'No charm; they did not believe in luck.',
    }),
    colour: choice('What colour is the locker?', {
      grey: 'Institutional grey.', green: 'Barracks green.', blue: 'Pale service blue.', tan: 'Old cream-tan enamel.',
    }),
    photos: score('How many photographs are taped inside the door?', ['None', 'One or two', 'A handful', 'Papered with them']),
    door: score('How far open is the door?', ['Ajar', 'Half open', 'Swung wide']),
    row: noul('Does it stand in a row with closed neighbouring lockers?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = s.root;
    const W = 0.56, H = 1.95, D = 0.52, T = 0.02;
    const tone = { grey: '#8d949a', green: '#5f7359', blue: '#7e9db5', tan: '#cdbd94' }[a.colour];
    const metal = s.material(tone, { metalness: 0.35, roughness: 0.55 });
    const inner = s.material(new THREE.Color(tone).multiplyScalar(0.62), { roughness: 0.8 });
    const dark = s.material('#1f2224', { roughness: 0.7 });
    const chrome = s.material('#cfd4d6', { metalness: 0.9, roughness: 0.25 });
    const dent = new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).multiplyScalar(0.72), roughness: 0.9 });
    const rust = new THREE.MeshStandardMaterial({ color: '#7a4628', roughness: 1 });
    const suitTone = { orange: '#e0661c', olive: '#5b6641', blue: '#27395c', grey: '#aab0b2', white: '#eceeea' }[a.suit];
    const cloth = s.material(suitTone, { roughness: 0.95 });
    const empty = a.fate === 'cleared';

    /** One steel locker carcass centred on x; the hero gets its insides, the neighbours a shut door. */
    const carcass = (x: number, shut: boolean) => {
      box(R, [W, H, T], [x, H / 2 + 0.08, -D / 2], inner);
      for (const sx of [-1, 1]) box(R, [T, H, D], [x + sx * (W / 2 - T / 2), H / 2 + 0.08, 0], metal);
      box(R, [W, T, D], [x, H + 0.07, 0], metal);
      box(R, [W, T, D], [x, 0.09, 0], inner);
      box(R, [W * 0.92, 0.08, D * 0.9], [x, 0.04, 0], dark);
      // A sloped top so nothing can be left on it, as regulations like.
      box(R, [W, T, D * 1.04], [x, H + 0.15, 0], metal, [0.3, 0, 0]);
      if (shut) {
        box(R, [W - 0.01, H - 0.02, T], [x, H / 2 + 0.08, D / 2], metal);
        for (let i = 0; i < 5; i++) box(R, [W * 0.6, 0.012, 0.012], [x, H - 0.18 - i * 0.035, D / 2 + T / 2 + 0.004], dark);
        box(R, [0.04, 0.14, 0.03], [x + W * 0.36, H * 0.55, D / 2 + T], chrome);
        box(R, [0.1, 0.06, 0.004], [x, H - 0.42, D / 2 + T / 2 + 0.003], s.material('#e9e4d0'));
      }
    };
    carcass(0, false);
    if (a.row) for (const side of [-1, 1]) for (let i = 1; i <= (side < 0 ? 1 : 2); i++) carcass(side * i * (W + 0.005), true);
    // Shelf and hanging rail.
    box(R, [W - 2 * T, T, D - T], [0, 1.62, 0], metal);
    rod(R, [-W / 2 + T, 1.52, 0], [W / 2 - T, 1.52, 0], 0.012, chrome);

    // The door, hinged on the left edge; its inside face carries the photographs.
    const swing = mix(1.25, 2.15, a.door);
    const door = group(R, [-W / 2, 0.08, D / 2], [0, -swing, 0]);
    box(door, [W - 0.01, H - 0.02, T], [W / 2, H / 2, 0], metal);
    for (let i = 0; i < 5; i++) box(door, [W * 0.6, 0.012, 0.03], [W / 2, H - 0.18 - i * 0.035, 0], dark);
    box(door, [0.04, 0.14, 0.05], [W * 0.86, H * 0.53, 0.02], chrome);
    for (const y of [0.25, H / 2, H - 0.25]) cyl(door, 0.014, 0.014, 0.1, [0, y, 0], chrome, [0, 0, 0], 8);
    // Outside of the door: a name or a number, and whatever the owner earned.
    const serial = `${1 + Math.floor(random() * 8)}${Math.floor(random() * 10)}`;
    const names = ['VOSS', 'OKAFOR', 'REYES', 'LINDQVIST', 'TANAKA', 'MBEKI', 'HALE', 'DUARTE'];
    const name = names[Math.floor(random() * names.length)];
    const plate = paint(256, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      if (a.owner === 'rookie') {
        ctx.save(); ctx.translate(w / 2, 90); ctx.rotate(-0.05); ctx.fillStyle = '#e8dcb4'; ctx.fillRect(-100, -24, 200, 48); stencil(ctx, name, 0, 2, 34, '#27303a'); ctx.restore();
      } else if (a.owner === 'nobody') stencil(ctx, serial, w / 2, 90, 90, '#1c1f22');
      else {
        ctx.fillStyle = '#1c1f22'; ctx.fillRect(40, 60, w - 80, 56); stencil(ctx, name, w / 2, 90, 34, '#e9e4d0');
      }
      if (a.owner === 'ace') {
        const count = 9 + Math.floor(random() * 14);
        for (let i = 0; i < count; i++) {
          const cx = 52 + (i % 6) * 30, cy = 170 + Math.floor(i / 6) * 44;
          ctx.fillStyle = '#f1efe6'; ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.lineTo(cx + 9, cy + 14); ctx.lineTo(cx - 9, cy + 14); ctx.fill();
          ctx.fillStyle = '#b3261e'; ctx.fillRect(cx - 9, cy + 6, 18, 5);
        }
      } else if (a.owner === 'veteran') {
        const tints = ['#c9a23a', '#4a78a8', '#b3261e', '#3f7a52', '#e9e4d0'];
        for (let i = 0; i < 6; i++) {
          ctx.save(); ctx.translate(60 + ((i * 71) % 140), 180 + i * 48); ctx.rotate((random() - 0.5) * 0.7);
          ctx.fillStyle = tints[i % tints.length]; ctx.globalAlpha = 0.85;
          if (i % 2) { ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill(); } else ctx.fillRect(-30, -18, 60, 36);
          ctx.restore();
        }
      }
    });
    decal(door, plate, W * 0.8, W * 1.6, [W / 2, H - 0.42 - W * 0.6, T / 2 + 0.004]);

    // Photographs: each a little painted print with a white border and tape at the corners.
    const maxPhotos = a.owner === 'rookie' ? 1 : a.owner === 'veteran' ? 11 : 8;
    const want = empty ? 0 : Math.min(maxPhotos, Math.round(a.photos * (a.owner === 'veteran' ? 11 : 8) + (a.fate === 'shrine' ? 1 : 0)));
    const ghosts = empty ? 3 + Math.floor(random() * 3) : 0;
    const spots: V[] = [];
    for (let i = 0; i < 12; i++) spots.push([0.15 + (i % 2) * 0.24 + (random() - 0.5) * 0.05, H - 0.42 - Math.floor(i / 2) * 0.24 + (random() - 0.5) * 0.04, (random() - 0.5) * 0.3]);
    for (let i = 0; i < want + ghosts; i++) {
      const [px, py, tilt] = spots[i];
      if (i >= want) { box(door, [0.17, 0.13, 0.002], [px, py, -T / 2 - 0.002], s.material(new THREE.Color(tone).lerp(new THREE.Color('#ffffff'), 0.35)), [0, 0, tilt]); continue; }
      const hue = random();
      const print = paint(96, 72, (ctx, w, h) => {
        ctx.fillStyle = '#f4f0e4'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `hsl(${Math.round(hue * 360)}, ${a.owner === 'veteran' ? 18 : 45}%, 62%)`; ctx.fillRect(6, 6, w - 12, h - 20);
        ctx.fillStyle = `hsl(${Math.round(hue * 360 + 150)}, 25%, 38%)`; ctx.fillRect(6, h - 34, w - 12, 20);
        const people = 1 + Math.floor(random() * 3);
        for (let p = 0; p < people; p++) {
          const cx = w / 2 + (p - (people - 1) / 2) * 20;
          ctx.fillStyle = '#e8c7a4'; ctx.beginPath(); ctx.arc(cx, 28, 7, 0, 7); ctx.fill();
          ctx.fillStyle = ['#2d3b55', '#8f302b', '#3f6a48'][p % 3]; ctx.fillRect(cx - 9, 35, 18, 20);
        }
      });
      const big = a.fate === 'shrine' && i === 0 ? 1.6 : 1;
      decal(door, print, 0.18 * big, 0.135 * big, [px, py, -T / 2 - 0.004 - i * 0.0006], [0, Math.PI, tilt], { alphaTest: 0 });
      if (big > 1) box(door, [0.2, 0.025, 0.003], [px + 0.07, py + 0.07, -T / 2 - 0.012], dark, [0, 0, -0.75]);
      box(door, [0.05, 0.02, 0.003], [px, py + 0.068 * big, -T / 2 - 0.01], s.material('#d9cf9c'), [0, 0, tilt + 0.1]);
    }

    // Helmet: shell, visor, chin bar and its paint scheme.
    const helmetAt = (parent: THREE.Object3D, at: V, yaw: number) => {
      const g = group(parent, at, [0, yaw, 0]);
      const shellTone = { plain: '#eeeeea', stripes: '#eeeeea', black: '#1b1c1e', checks: '#e8c11f' }[a.helmet];
      const shell = s.material(shellTone, { roughness: 0.3 });
      ball(g, [0.13, 0.135, 0.15], [0, 0.135, 0], shell, 18);
      const visor = new THREE.MeshStandardMaterial({ color: a.helmet === 'black' ? '#c9a23a' : '#16191c', metalness: 0.8, roughness: 0.15 });
      add(g, new THREE.SphereGeometry(0.134, 16, 8, -Math.PI * 0.42 + Math.PI / 2, Math.PI * 0.84, Math.PI * 0.32, Math.PI * 0.3), visor, [0, 0.135, 0.022]).scale.set(1, 1, 1.1);
      box(g, [0.2, 0.05, 0.1], [0, 0.045, 0.085], shell);
      cyl(g, 0.11, 0.1, 0.03, [0, 0.015, 0], dark, [0, 0, 0], 14);
      if (a.helmet === 'stripes' || a.owner === 'ace') for (const sx of [-0.035, 0.035]) add(g, new THREE.TorusGeometry(0.139, 0.012, 4, 16, Math.PI), s.material('#c22a1e'), [sx, 0.135, 0], [0, Math.PI / 2, 0]).scale.set(1.1, 1, 1);
      if (a.helmet === 'checks') for (let i = 0; i < 10; i++) box(g, [0.04, 0.03, 0.01], [Math.sin((i / 10) * Math.PI * 2) * 0.13, 0.2 + (i % 2) * 0.015, Math.cos((i / 10) * Math.PI * 2) * 0.148], dark, [0, (i / 10) * Math.PI * 2, 0]);
      tube(g, [[-0.08, 0.04, 0.1], [-0.12, -0.02, 0.14], [-0.1, 0.0, 0.2]], 0.012, dark);
      return g;
    };
    /** A flight suit as a soft body: torso, sleeves, legs and collar. */
    const suitAt = (parent: THREE.Object3D, at: V) => {
      const g = group(parent, at);
      const torso = cyl(g, 0.13, 0.17, 0.6, [0, -0.36, 0], cloth, [0, 0, 0], 10); torso.scale.z = 0.55;
      for (const sx of [-1, 1]) {
        const sleeve = cyl(g, 0.055, 0.05, 0.6, [sx * 0.18, -0.4, 0.01], cloth, [0, 0, sx * 0.12], 8); sleeve.scale.z = 0.7;
        const leg = cyl(g, 0.085, 0.07, 0.72, [sx * 0.08, -1.0, 0], cloth, [0, 0, sx * 0.03], 8); leg.scale.z = 0.6;
        box(g, [0.07, 0.02, 0.012], [sx * 0.08, -0.22, 0.095], a.owner === 'veteran' && sx > 0 ? s.material('#8a7a52') : dark);
      }
      box(g, [0.2, 0.06, 0.1], [0, -0.05, 0], cloth);
      rod(g, [0, -0.08, 0.095], [0, -0.62, 0.095], 0.006, chrome);
      box(g, [0.09, 0.07, 0.008], [-0.08, -0.25, 0.097], s.material(a.owner === 'ace' ? '#c9a23a' : '#3d5f8f'));
      if (a.suit === 'grey') for (const sx of [-1, 1]) box(g, [0.05, 0.6, 0.012], [sx * 0.135, -0.36, 0.085], dark);
      // The hanger.
      add(g, new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI * 1.4), chrome, [0, 0.04, 0], [0, 0, -0.4]);
      rod(g, [-0.2, -0.05, 0], [0, 0.01, 0], 0.006, chrome); rod(g, [0.2, -0.05, 0], [0, 0.01, 0], 0.006, chrome);
      return g;
    };
    const bootAt = (x: number, z: number, yaw: number, tip = 0) => {
      const g = group(R, [x, 0.1, z], [0, yaw, tip]);
      cyl(g, 0.05, 0.055, 0.26, [0, 0.13, -0.03], dark, [0, 0, 0], 10);
      box(g, [0.1, 0.07, 0.2], [0, 0.035, 0.03], dark);
    };

    if (a.fate === 'ready' || a.fate === 'shrine') {
      suitAt(R, [0, 1.5, 0.02]);
      helmetAt(R, [0, 1.63, 0.03], a.fate === 'shrine' ? 0 : (random() - 0.5) * 0.6);
      bootAt(-0.09, 0.08, 0.05); bootAt(0.09, 0.08, -0.05);
    } else if (a.fate === 'back') {
      // Empty hanger swinging, suit in a heap spilling over the sill, helmet on the floor outside.
      add(R, new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI * 1.4), chrome, [0.05, 1.49, 0], [0, 0, -0.4]);
      rod(R, [-0.15, 1.38, 0], [0.05, 1.46, 0], 0.006, chrome); rod(R, [0.24, 1.42, 0], [0.05, 1.46, 0], 0.006, chrome);
      for (let i = 0; i < 6; i++) ball(R, [0.13 + random() * 0.08, 0.06 + random() * 0.05, 0.12 + random() * 0.06], [(random() - 0.5) * 0.22, 0.15 + i * 0.035, 0.05 + (random() - 0.3) * 0.2], cloth, 10);
      const sleeve = cyl(R, 0.055, 0.05, 0.5, [0.12, 0.13, D / 2 + 0.12], cloth, [1.35, 0.5, 0], 8); sleeve.scale.x = 1.3;
      const leg = cyl(R, 0.08, 0.07, 0.55, [-0.12, 0.06, D / 2 + 0.2], cloth, [Math.PI / 2, 0, 0.35], 8); leg.scale.z = 0.5;
      helmetAt(R, [0.3, 0, D / 2 + 0.28], 0.9 + random()).rotation.z = 0.25;
      bootAt(-0.3, D / 2 + 0.3, 0.6, 0); bootAt(-0.12, D / 2 + 0.42, 1.2, Math.PI / 2 - 0.1);
      for (const sx of [-1, 1]) box(R, [0.09, 0.03, 0.16], [sx * 0.07, 1.65, 0.1], dark, [0, sx * 0.4 + random() * 0.3, 0]);
    } else {
      // Cleared: one bare hanger, and a box of what was left.
      add(R, new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI * 1.4), chrome, [0.06, 1.49, 0], [0, 0, -0.4]);
      rod(R, [-0.14, 1.4, 0], [0.06, 1.46, 0], 0.006, chrome); rod(R, [0.26, 1.4, 0], [0.06, 1.46, 0], 0.006, chrome); rod(R, [-0.14, 1.4, 0], [0.26, 1.4, 0], 0.006, chrome);
      const card = s.material('#b3905c', { roughness: 0.95 });
      const bx = 0.12, bz = D / 2 + 0.36;
      const crate = group(R, [bx, 0, bz], [0, 0.3 + random() * 0.4, 0]);
      box(crate, [0.44, 0.02, 0.34], [0, 0.01, 0], card);
      for (const sx of [-1, 1]) { box(crate, [0.02, 0.28, 0.34], [sx * 0.21, 0.15, 0], card); box(crate, [0.44, 0.28, 0.02], [0, 0.15, sx * 0.16], card); }
      box(crate, [0.2, 0.01, 0.34], [-0.3, 0.27, 0], card, [0, 0, 0.5]);
      box(crate, [0.2, 0.01, 0.34], [0.3, 0.25, 0], card, [0, 0, -0.7]);
      helmetAt(crate, [-0.06, 0.12, 0], 0.4);
      box(crate, [0.16, 0.12, 0.2], [0.11, 0.2, 0.02], cloth, [0.1, 0.2, 0.1]);
      box(crate, [0.2, 0.012, 0.05], [0, 0.2, 0.172], s.material('#e9e4d0'));
    }

    // The charm, hung on a hook under the shelf lip where the hand finds it last.
    if (a.charm !== 'none' && !empty) {
      const hx = 0.17, hy = 1.6, hz = D / 2 - 0.03;
      const cord = s.material('#b3261e');
      rod(R, [hx, hy, hz], [hx, hy - 0.16, hz], 0.004, a.charm === 'tags' ? chrome : cord, 5);
      if (a.charm === 'dice') for (const sx of [-1, 1]) {
        const die = box(R, [0.07, 0.07, 0.07], [hx + sx * 0.04, hy - 0.2 - (sx > 0 ? 0.04 : 0), hz], s.material('#f1efe6'), [0.4, 0.5 * sx, 0.3]);
        for (let i = 0; i < 3; i++) ball(die, [0.008, 0.008, 0.004], [(i - 1) * 0.018, (i - 1) * 0.018, 0.036], dark, 6);
      } else if (a.charm === 'rabbit') {
        ball(R, [0.028, 0.07, 0.028], [hx, hy - 0.23, hz], s.material('#e7dcc6', { roughness: 1 }), 10);
        cyl(R, 0.03, 0.03, 0.03, [hx, hy - 0.165, hz], s.material('#c9a23a', { metalness: 0.8 }), [0, 0, 0], 8);
      } else if (a.charm === 'amulet') {
        box(R, [0.07, 0.1, 0.015], [hx, hy - 0.21, hz], s.material(mood.cheer > 0.5 ? '#d8452b' : '#3a4f8a'));
        box(R, [0.03, 0.05, 0.017], [hx, hy - 0.21, hz], s.material('#e9d9a0'));
        ball(R, [0.012, 0.012, 0.012], [hx, hy - 0.155, hz], cord, 6);
      } else if (a.charm === 'toy') {
        const fur = s.material(mood.cheer > 0.5 ? '#e8b24a' : '#8d7a6a', { roughness: 1 });
        ball(R, [0.045, 0.055, 0.04], [hx, hy - 0.25, hz], fur, 10);
        ball(R, [0.04, 0.04, 0.038], [hx, hy - 0.18, hz + 0.005], fur, 10);
        for (const sx of [-1, 1]) { ball(R, [0.016, 0.02, 0.01], [hx + sx * 0.03, hy - 0.145, hz], fur, 6); ball(R, [0.006, 0.006, 0.004], [hx + sx * 0.014, hy - 0.175, hz + 0.04], dark, 6); }
      } else for (const sx of [-1, 1]) box(R, [0.035, 0.055, 0.004], [hx + sx * 0.012, hy - 0.19, hz + sx * 0.004], chrome, [0, 0, sx * 0.25]);
    }

    // A shrine gathers things at its foot.
    const flames: THREE.Mesh[] = [];
    if (a.fate === 'shrine') {
      const wax = s.material('#efe8d4', { roughness: 0.6 });
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2e', emissiveIntensity: 2.2 });
      const candles = 4 + Math.round(mood.density * 5);
      for (let i = 0; i < candles; i++) {
        const x = (random() - 0.5) * 0.9, z = D / 2 + 0.1 + random() * 0.35, h = 0.05 + random() * 0.14;
        cyl(R, 0.022, 0.024, h, [x, h / 2, z], i % 3 ? wax : s.material('#b3261e'), [0, 0, 0], 8);
        flames.push(ball(R, [0.012, 0.028, 0.012], [x, h + 0.028, z], flame, 6));
      }
      const jar = new THREE.MeshStandardMaterial({ color: '#9fc4c9', roughness: 0.1, metalness: 0.3 });
      cyl(R, 0.05, 0.045, 0.16, [-0.34, 0.08, D / 2 + 0.2], jar, [0, 0, 0], 10);
      for (let i = 0; i < 6; i++) {
        const lean: V = [-0.34 + (random() - 0.5) * 0.22, 0.38 + random() * 0.14, D / 2 + 0.2 + (random() - 0.5) * 0.2];
        rod(R, [-0.34, 0.1, D / 2 + 0.2], lean, 0.005, s.material('#4d7a45'), 5);
        ball(R, [0.035, 0.03, 0.035], lean, s.material(['#f1efe6', '#e8c11f', '#d8452b', '#c77fb6'][i % 4]), 8);
      }
      for (let i = 0; i < 3; i++) box(door, [0.09, 0.07, 0.003], [0.14 + i * 0.13, H - 0.2 - (i % 2) * 0.03, T / 2 + 0.02], s.material('#f1ecd6'), [0.25, 0, (random() - 0.5) * 0.5]);
    }

    // Dents and rust follow wear: the locker has been kicked shut more than once.
    const dents = Math.round(mix(1, 9, mood.wear));
    for (let i = 0; i < dents; i++) {
      const onSide = random() < 0.5;
      const y = 0.25 + random() * 1.5;
      if (onSide && !a.row) ball(R, [0.004, 0.04 + random() * 0.07, 0.05 + random() * 0.08], [W / 2 + 0.001, y, (random() - 0.5) * D * 0.7], random() < mood.wear * 0.6 ? rust : dent, 8);
      else ball(door, [0.05 + random() * 0.07, 0.04 + random() * 0.06, 0.004], [0.1 + random() * (W - 0.2), y, T / 2 + 0.001], random() < mood.wear * 0.6 ? rust : dent, 8);
    }

    return s.finish({
      footprint: 0.6,
      update: (_dt, time) => {
        flames.forEach((f, i) => { f.scale.y = 0.028 * (1 + Math.sin(time * (9 + i) + i) * 0.25 * (0.4 + mood.energy)); });
      },
    });
  },
});
