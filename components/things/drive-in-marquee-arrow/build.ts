import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type P3, grime, painted, put, write } from './lib';

const NAMES = { starlite: 'STARLITE', skyvue: 'SKY-VUE', moonlight: 'MOONLIGHT', route: 'ROUTE 9', comet: 'COMET' } as const;
const BILLS = {
  monster: ['IT CAME AT DUSK', 'TEENAGE SWAMP THING'],
  western: ['SIX GUNS WEST', 'LAST TRAIN TO YUMA GULCH'],
  beach: ['BIKINI SURF PARTY', 'HOT ROD SUMMER'],
  scifi: ['ROCKET TO SATURN', 'THE ROBOT WHO LOVED'],
} as const;
const THEMES = {
  red: { arrow: '#cf2f27', edge: '#f4c531', panel: '#f6efd8', ink: '#b02a22' },
  turquoise: { arrow: '#27a6a4', edge: '#f58fb4', panel: '#fbf3e6', ink: '#1d6f73' },
  green: { arrow: '#3d7a52', edge: '#f1e6bd', panel: '#f1e6bd', ink: '#2f5a3e' },
} as const;

export default defineThing({
  questions: {
    message: choice('What do the marquee letters spell?', {
      double: 'Tonight\'s double feature, both titles.',
      weekends: 'OPEN FRI SAT SUN and KIDS FREE.',
      closing: 'A closing-night thank-you for all the summers.',
      fallen: 'Half-fallen titles: gaps, a letter hanging sideways, the rest in the weeds.',
      sale: 'FOR SALE and an acreage.',
      blank: 'Nothing: bare letter tracks.',
    }),
    bill: choice('If titles show, what kind of double bill is it?', {
      monster: 'Monster movies.', western: 'Westerns.', beach: 'Beach-party and hot-rod pictures.', scifi: 'Rocket-age science fiction.',
    }),
    arrow: choice('What shape is the arrow?', {
      swoop: 'A great curved swoop arching over the sign and diving toward the entrance.',
      straight: 'A fat straight arrow, tilted downward like a pointing finger.',
      elbow: 'A right-angled arrow that runs along the top and then drops to point at the gate.',
    }),
    bulbs: choice('What are the bulbs doing?', {
      chasing: 'Chasing along the arrow in a running wave.',
      steady: 'All burning steadily.',
      patchy: 'Mostly dead, a few survivors blinking out of step.',
      dark: 'Dark, every one.',
    }),
    name: choice('What is the drive-in called?', { starlite: 'Starlite.', skyvue: 'Sky-Vue.', moonlight: 'Moonlight.', route: 'Route 9.', comet: 'Comet.' }),
    colours: choice('What colours is it painted?', {
      red: 'Fire red with a yellow edge and cream panels.',
      turquoise: 'Turquoise with flamingo pink.',
      green: 'Forest green and cream, older and quieter.',
    }),
    foot: choice('What is at its foot?', {
      nothing: 'Bare ground.',
      planter: 'A brick planter of petunias somebody waters.',
      board: 'A sandwich board with the carload price.',
      weeds: 'Tall weeds.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const theme = THEMES[a.colours];
    const worn = (colour: string, amount = 0.4) => new THREE.Color(colour).lerp(new THREE.Color('#8a7a66'), mood.wear * amount);
    const steel = s.material(worn('#70787a', 0.7), { metalness: 0.5, roughness: 0.55 });
    const dead = a.bulbs === 'dark';
    const glowScale = dead ? 0 : mix(1, 0.7, 1 - Math.abs(mood.daylight - 0.5) * 2);

    const sign = put(s.root, new THREE.Group());
    sign.rotation.z = (random() - 0.5) * mix(0, 0.07, mood.wear);
    const add = <T extends THREE.Object3D>(object: T, at: P3 = [0, 0, 0]): T => put(sign, object, at);
    for (const x of [-1.5, 1.5]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 6.6, 14), steel), [x, 3.3, 0]);
    for (const y of [1.2, 1.75]) add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.07, 0.07), steel), [0, y, 0]);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 6), steel), [0, 1.475, 0]).rotation.z = Math.atan2(3, 0.55);

    // Marquee: a lit letter board on both faces.
    const MW = 4.5, MH = 1.9, MY = 2.95;
    const bill = BILLS[a.bill];
    const lines: string[] = {
      double: ['2 BIG HITS', bill[0], '- AND -', bill[1]],
      weekends: ['OPEN FRI SAT SUN', bill[0], 'KIDS UNDER 12 FREE', 'SHOW AT DUSK'],
      closing: ['CLOSING NIGHT', `THANKS FOR ${22 + Math.floor(random() * 30)} SUMMERS`, 'DRIVE SAFE', 'GOOD NIGHT'],
      fallen: ['2 BIG HITS', bill[0], '- AND -', bill[1]],
      sale: ['FOR SALE', `${6 + Math.floor(random() * 12)} ACRES`, 'ZONED COMMERCIAL', 'CALL OWNER'],
      blank: ['', '', '', ''],
    }[a.message];
    const dropRate = a.message === 'fallen' ? 0.45 : a.message === 'blank' ? 0 : mood.wear * 0.12;
    const fallenCount = { n: 0 };
    const board = (flip: boolean) => painted(MW - 0.2, MH - 0.2, (ctx, w, h) => {
      ctx.fillStyle = `#${worn('#fbf8ea', 0.5).getHexString()}`; ctx.fillRect(0, 0, w, h);
      for (let r = 0; r <= 4; r++) { ctx.fillStyle = 'rgba(70,70,70,0.45)'; ctx.fillRect(0, (r / 4) * h - 1.5, w, 3); }
      const cell = Math.min(h / 4 * 0.62, w / 22);
      lines.forEach((line, row) => {
        const colour = row % 2 ? '#1c1d20' : theme.ink;
        const x0 = w / 2 - (line.length * cell) / 2;
        [...line].forEach((glyph, i) => {
          if (glyph === ' ') return;
          if (random() < dropRate) { fallenCount.n++; if (random() < 0.25) write(ctx, glyph, x0 + (i + 0.5) * cell, (row + 0.75) * (h / 4), cell * 1.25, colour, { tilt: 0.6 + random() * 1.6, face: 'monospace' }); return; }
          write(ctx, glyph, x0 + (i + 0.5) * cell, (row + 0.54) * (h / 4), cell * 1.3, colour, { face: 'monospace', tilt: (random() - 0.5) * mood.wear * 0.25 });
        });
      });
      grime(ctx, w, h, mood.wear * 0.7, random, '110,96,60');
      if (flip) { /* same message both sides */ }
    }, { px: 768, glow: dead ? 0.03 : 0.7 * glowScale });
    add(new THREE.Mesh(new THREE.BoxGeometry(MW, MH, 0.5), s.material(worn(theme.arrow), { roughness: 0.6 })), [0, MY, 0]);
    add(board(false), [0, MY, 0.256]);
    add(board(true), [0, MY, -0.256]).rotation.y = Math.PI;

    // Name panel.
    const NY = 4.5;
    add(new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.95, 0.36), s.material(worn(theme.panel, 0.5), { roughness: 0.7 })), [0, NY, 0]);
    for (const face of [1, -1]) {
      const panel = add(painted(3.6, 0.86, (ctx, w, h) => {
        ctx.fillStyle = `#${worn(theme.panel, 0.5).getHexString()}`; ctx.fillRect(0, 0, w, h);
        write(ctx, NAMES[a.name], w * 0.5, h * 0.36, h * 0.56, theme.ink, { max: w * 0.9, font: 'italic bold', face: 'Georgia, serif' });
        write(ctx, 'D R I V E - I N   T H E A T R E', w * 0.5, h * 0.8, h * 0.2, theme.arrow, { max: w * 0.9 });
        grime(ctx, w, h, mood.wear * 0.8, random, '120,80,50');
      }, { px: 768, glow: dead ? 0 : 0.3 * glowScale }), [0, NY, face * 0.184]);
      if (face < 0) panel.rotation.y = Math.PI;
    }

    // Arrow outline and the path its bulbs follow.
    const shape = new THREE.Shape();
    const path: [number, number][] = [];
    const AZ = 0.3;
    if (a.arrow === 'swoop') {
      const cx = 0.35, cy = 4.75, R0 = 2.45, R1 = 1.8, t0 = 0.3, t1 = 2.75, mid = (R0 + R1) / 2;
      const at = (r: number, t: number): [number, number] => [cx + Math.cos(t) * r, cy + Math.sin(t) * r];
      shape.moveTo(...at(R0, t0));
      for (let i = 1; i <= 24; i++) shape.lineTo(...at(R0, mix(t0, t1, i / 24)));
      shape.lineTo(...at(R0 + 0.5, t1));
      shape.lineTo(...at(mid, t1 + 0.62));
      shape.lineTo(...at(R1 - 0.5, t1));
      for (let i = 0; i <= 24; i++) shape.lineTo(...at(R1, mix(t1, t0, i / 24)));
      shape.closePath();
      for (let i = 0; i <= 40; i++) path.push(at(mid, mix(t0 + 0.04, t1 + 0.45, i / 40)));
    } else if (a.arrow === 'straight') {
      const pts: [number, number][] = [[2.4, -0.42], [2.4, 0.42], [-0.8, 0.42], [-0.8, 0.95], [-2.5, 0], [-0.8, -0.95], [-0.8, -0.42]];
      const tilt = 0.22, oy = 6.05;
      const turn = ([x, y]: [number, number]): [number, number] => [x * Math.cos(tilt) - y * Math.sin(tilt), oy + x * Math.sin(tilt) + y * Math.cos(tilt)];
      pts.map(turn).forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      for (let i = 0; i <= 30; i++) path.push(turn([mix(2.2, -2.2, i / 30), 0]));
    } else {
      const pts: [number, number][] = [[2.4, 6.15], [2.4, 6.9], [-2.4, 6.9], [-2.4, 5.2], [-2.95, 5.2], [-2.02, 4.1], [-1.1, 5.2], [-1.65, 5.2], [-1.65, 6.15]];
      pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      for (let i = 0; i <= 22; i++) path.push([mix(2.2, -2.02, i / 22), 6.52]);
      for (let i = 1; i <= 11; i++) path.push([-2.02, mix(6.52, 4.4, i / 11)]);
    }
    const arrowGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    arrowGeometry.translate(0, 0, -0.15);
    add(new THREE.Mesh(arrowGeometry, s.material(worn(theme.arrow, 0.45), { roughness: 0.55, metalness: 0.15 })), [0, 0, AZ]);
    const rimGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.01, bevelSegments: 1 });
    rimGeometry.translate(0, 0, -0.12);
    add(new THREE.Mesh(rimGeometry, s.material(worn(theme.edge, 0.45), { roughness: 0.6 })), [0, 0, AZ]);
    for (const x of [-1.5, 1.5]) add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, AZ), steel), [x, 6.3, AZ / 2]);

    // Bulbs, evenly spaced along the path on both faces.
    const spots: [number, number][] = [];
    let carry = 0;
    for (let i = 1; i < path.length; i++) {
      const [x0, y0] = path[i - 1], [x1, y1] = path[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      let d = carry;
      while (d < seg) { spots.push([mix(x0, x1, d / seg), mix(y0, y1, d / seg)]); d += 0.21; }
      carry = d - seg;
    }
    const alive = spots.map(() => (a.bulbs === 'dark' ? false : a.bulbs === 'patchy' ? random() < 0.22 : random() > mood.wear * 0.3));
    const present = spots.map(() => random() > mood.wear * 0.2);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.062, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), spots.length * 2);
    const m = new THREE.Matrix4();
    const on = new THREE.Color(mood.warmth > 0.35 ? '#ffe9a0' : '#f4f6ff'), dim = new THREE.Color('#8a6a3a'), off = new THREE.Color('#5c5548');
    spots.forEach(([x, y], i) => {
      for (const face of [0, 1]) {
        m.makeScale(present[i] ? 1 : 0.001, present[i] ? 1 : 0.001, present[i] ? 1 : 0.001).setPosition(x, y, AZ + (face ? -0.2 : 0.2));
        bulbs.setMatrixAt(i * 2 + face, m);
        bulbs.setColorAt(i * 2 + face, alive[i] ? on : off);
      }
    });
    bulbs.instanceMatrix.needsUpdate = true;
    add(bulbs);
    const sockets = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.46, 8), s.material('#d9d2b8', { metalness: 0.4, roughness: 0.5 }), spots.length);
    spots.forEach(([x, y], i) => { m.makeRotationX(Math.PI / 2).setPosition(x, y, AZ); sockets.setMatrixAt(i, m); });
    add(sockets);

    // Foot.
    if (a.message === 'fallen' || fallenCount.n > 3) {
      const letters = Array.from({ length: Math.min(16, 4 + fallenCount.n) }, () => ({ at: [(random() - 0.5) * 4, 0.02, 0.4 + random() * 1.4] as P3, size: 1, color: random() < 0.5 ? '#1c1d20' : theme.ink }));
      const tiles = s.scatter(new THREE.BoxGeometry(0.16, 0.012, 0.22), s.material('#ffffff', { roughness: 0.6 }), letters);
      tiles.rotation.y = 0.2;
    }
    if (a.foot === 'planter') {
      const brick = s.material(worn('#a3523c', 0.3), { roughness: 0.95 });
      s.box([4.2, 0.55, 1.1], [0, 0.275, 0], brick);
      s.box([4.3, 0.06, 1.2], [0, 0.57, 0], s.material('#d8d2c2', { roughness: 0.9 }));
      s.box([3.9, 0.04, 0.8], [0, 0.6, 0], s.material('#4a3b2c', { roughness: 1 }));
      const live = mood.wear < 0.7;
      const blooms = Array.from({ length: Math.round(mix(24, 90, mood.density)) }, () => ({ at: [(random() - 0.5) * 3.8, 0.66 + random() * 0.14, (random() - 0.5) * 0.75] as P3, size: 0.06 + random() * 0.06, color: live ? ['#e8475f', '#c05ad0', '#f4f1e6', '#f08ab8', '#4f8f4a', '#4f8f4a'][Math.floor(random() * 6)] : ['#8c8a55', '#6f6a4a', '#a09468'][Math.floor(random() * 3)] }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.8 }), blooms);
    }
    if (a.foot === 'board') {
      const g = put(s.root, new THREE.Group(), [2.6, 0, 0.9]);
      for (const face of [1, -1]) {
        const leaf = put(g, painted(0.8, 1.15, (ctx, w, h) => {
          ctx.fillStyle = '#f7f2dc'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = theme.ink; ctx.lineWidth = w * 0.04; ctx.strokeRect(w * 0.04, h * 0.03, w * 0.92, h * 0.94);
          write(ctx, '$1', w / 2, h * 0.3, h * 0.36, theme.ink); write(ctx, 'A', w / 2, h * 0.56, h * 0.12, '#222'); write(ctx, 'CARLOAD', w / 2, h * 0.72, h * 0.15, '#222', { max: w * 0.8 }); write(ctx, 'TONITE', w / 2, h * 0.88, h * 0.1, theme.ink);
          grime(ctx, w, h, mood.wear * 0.7, random);
        }, { px: 256 }), [0, 0.56, face * 0.17]);
        leaf.rotation.x = -face * 0.3;
        if (face < 0) leaf.rotation.y = Math.PI;
      }
      g.rotation.y = -0.3 + (random() - 0.5) * 0.4;
    }
    if (a.foot === 'weeds' || mood.wear > 0.6) {
      const tufts = Array.from({ length: Math.round(mix(14, 60, a.foot === 'weeds' ? 0.5 + mood.density * 0.5 : 0.2)) }, () => ({ at: [(random() - 0.5) * 4.6, 0.1, (random() - 0.5) * 1.6] as P3, size: 0.4 + random() * 0.9, color: random() < 0.5 ? '#8c8a55' : '#657c48' }));
      s.scatter(new THREE.ConeGeometry(0.16, 1, 4), s.material('#ffffff', { roughness: 1 }), tufts);
    }

    const speed = mix(2, 14, mood.energy);
    const blink = spots.map(() => random() * 10);
    return s.finish({
      footprint: 2.6,
      update: (_dt, time) => {
        if (a.bulbs === 'dark' || a.bulbs === 'steady') return;
        spots.forEach((_spot, i) => {
          let lit = alive[i];
          if (lit && a.bulbs === 'chasing') lit = (((i - time * speed) % 6) + 6) % 6 < 3.4;
          if (lit && a.bulbs === 'patchy') lit = Math.sin(time * (1 + blink[i] * 0.3) + blink[i]) > -0.3;
          const colour = lit ? on : alive[i] ? dim : off;
          bulbs.setColorAt(i * 2, colour); bulbs.setColorAt(i * 2 + 1, colour);
        });
        if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
      },
    });
  },
});
