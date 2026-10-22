import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { coil, grime, painted, ribbed, scrawl, write } from './paint';

type P = [number, number, number];

const PANEL = {
  quarters: 'AIR 75¢, quarters only, in blunt block letters.',
  dollar: 'AIR $1.50 with a little tyre pictogram.',
  card: 'AIR $2.00, a tap-to-pay logo and "CARDS ONLY".',
  free: 'FREE AIR in friendly script, a courtesy to customers.',
  oldcheap: 'AIR 25¢ on a sun-bleached decal that is decades out of date.',
  cashier: 'AIR — SEE CASHIER FOR TOKEN.',
} as const;

export default defineThing({
  questions: {
    kind: choice('What kind of air machine is it?', {
      air: 'A squat steel box on a post with a single coiled air hose: air only.',
      airvac: 'A tall two-in-one cabinet standing on the pad, air hose on one side and a fat ribbed vacuum hose on the other.',
      meter: 'An old-fashioned free-air tower: a slim pedestal with a round dial head and a crank, and a bell hose lying across the drive.',
    }),
    panel: choice('What does the front panel say?', PANEL),
    hose: choice('What state is the air hose in?', {
      hung: 'Neatly coiled and hung back on its hook.',
      sprawled: 'Left sprawled across the pad and the tarmac where the last driver dropped it.',
      stretched: 'Pulled out long and taut toward a car that is no longer there.',
      cut: 'Cut off short, a frayed stub hanging and the rest gone.',
    }),
    notice: choice('Is there a notice on it?', {
      none: 'Nothing, it simply works.',
      bag: 'A plastic bag taped over the coin slot: out of order.',
      note: 'A handwritten cardboard note taped to the front.',
      sticker: 'A crisp official "OUT OF SERVICE" tag.',
    }),
    colour: choice('What colour is the cabinet?', {
      red: 'Fire-engine red.',
      blue: 'Royal blue.',
      yellow: 'Safety yellow.',
      steel: 'Bare stainless steel.',
      green: 'Old oil-company green.',
      white: 'Chalky white with a coloured stripe.',
    }),
    left: choice('What has been left on the pad beside it?', {
      nothing: 'Nothing.',
      tyre: 'A bald spare tyre leaning against the post.',
      cup: 'A fountain-drink cup and a scatter of quarters.',
      jug: 'A jug of coolant and an oily rag.',
      cone: 'A faded traffic cone.',
    }),
    bollard: noul('Is it guarded by a yellow steel bollard?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const tint = { red: '#c8281f', blue: '#1f4fb0', yellow: '#e9b616', steel: '#b6bcbd', green: '#2d6b45', white: '#ece8dc' }[a.colour];
    const body = s.material(tint, { metalness: a.colour === 'steel' ? 0.8 : 0.25, roughness: a.colour === 'steel' ? 0.35 : 0.5 });
    const dark = s.material('#1d2022', { roughness: 0.7 });
    const steel = s.material('#aab0b2', { metalness: 0.8, roughness: 0.35 });
    const concrete = s.material('#aaa69a', { roughness: 0.95 });
    const hoseRed = s.material(mix(0.2, 1, mood.cheer) > 0.5 ? '#d8301f' : '#a5362a', { roughness: 0.55 });
    const rubber = s.material('#26282a', { roughness: 0.85 });
    const dead = a.notice !== 'none';
    const lit = dead ? 0 : mix(0.25, 1.1, Math.abs(mood.daylight - 0.5) * 2);

    // Pad with a chipped corner and an oil stain.
    s.box([1.5, 0.12, 1.25], [0, 0.06, 0], concrete);
    const stain = painted(1.4, 1.15, (ctx, w, h) => {
      ctx.fillStyle = '#aaa69a'; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, 0.15 + wear * 0.35, '#3c3a36');
      ctx.strokeStyle = '#6f6b62'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * random(), 0); ctx.lineTo(w * random(), h * 0.5); ctx.lineTo(w * random(), h); ctx.stroke();
    }, { px: 192, roughness: 0.95 });
    stain.rotation.x = -Math.PI / 2; stain.position.set(0, 0.122, 0); s.root.add(stain);

    let hook: P, hookSide = -1, panelY = 1.25, panelW = 0.42, panelH = 0.5, front = 0.2, top = 1.6;
    const face = (draw: Parameters<typeof painted>[2], w: number, h: number, at: P, glow = lit * 0.35) => {
      const m = painted(w, h, draw, { glow, roughness: 0.55 }); m.position.set(...at); s.root.add(m); return m;
    };
    const drawPanel = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const fade = wear * 0.55;
      ctx.fillStyle = a.panel === 'oldcheap' ? '#e8dfb8' : a.panel === 'free' ? '#f4f0e2' : '#f6f6f2'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = a.panel === 'free' ? '#1f7a4d' : a.panel === 'card' ? '#12324f' : '#c42a20';
      ctx.fillRect(0, 0, w, h * 0.42);
      if (a.panel === 'free') { write(ctx, 'Free', w / 2, h * 0.14, h * 0.2, '#fff', { font: 'italic bold' }); write(ctx, 'AIR', w / 2, h * 0.31, h * 0.2, '#ffe36b'); }
      else write(ctx, a.kind === 'airvac' ? 'AIR·VAC' : 'AIR', w / 2, h * 0.22, h * (a.kind === 'airvac' ? 0.2 : 0.32), '#fff', { max: w * 0.9 });
      const price = { quarters: '75¢', dollar: '$1.50', card: '$2.00', free: 'NO CHARGE', oldcheap: '25¢', cashier: 'TOKEN' }[a.panel];
      write(ctx, price, w / 2, h * 0.58, h * (price.length > 5 ? 0.11 : 0.2), '#16181a', { max: w * 0.9 });
      const small = { quarters: 'QUARTERS ONLY', dollar: 'INSERT COINS', card: 'CARDS ONLY', free: 'FOR OUR CUSTOMERS', oldcheap: '3 MINUTES', cashier: 'SEE CASHIER' }[a.panel];
      write(ctx, small, w / 2, h * 0.76, h * 0.07, '#3b3f42', { max: w * 0.88 });
      // Tyre pictogram.
      ctx.strokeStyle = '#16181a'; ctx.lineWidth = h * 0.03;
      ctx.beginPath(); ctx.arc(w / 2, h * 0.9, h * 0.055, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(232,224,200,${fade})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wear * 0.8);
    };

    if (a.kind === 'air') {
      s.box([0.36, 0.06, 0.36], [0, 0.15, 0], steel);
      s.box([0.11, 0.85, 0.11], [0, 0.55, 0], dark);
      s.box([0.56, 0.72, 0.38], [0, 1.3, 0], body);
      s.box([0.62, 0.05, 0.44], [0, 1.68, 0], dark);
      top = 1.7; panelY = 1.38; panelW = 0.44; panelH = 0.46; front = 0.191;
      hook = [-0.31, 1.45, 0.02];
    } else if (a.kind === 'airvac') {
      s.box([0.78, 1.55, 0.5], [0, 0.9, 0], body);
      s.box([0.84, 0.07, 0.56], [0, 1.71, 0], dark);
      s.box([0.8, 0.1, 0.52], [0, 0.17, 0], dark);
      // Louvres and a service door on the lower half.
      for (let i = 0; i < 6; i++) s.box([0.5, 0.012, 0.01], [0, 0.4 + i * 0.045, 0.252], dark);
      s.box([0.6, 0.02, 0.01], [0, 0.78, 0.252], dark);
      top = 1.75; panelY = 1.3; panelW = 0.6; panelH = 0.62; front = 0.252;
      hook = [-0.42, 1.4, 0.05];
      // Vacuum hose from a port on the right, draped over a cradle.
      const port: P = [0.39, 1.25, 0.05];
      s.cylinder(0.06, 0.06, 0.08, [0.42, 1.25, 0.05], dark, 12).rotation.z = Math.PI / 2;
      const sag = 0.5 + random() * 0.25;
      const end: P = a.hose === 'sprawled' ? [0.95 + random() * 0.3, 0.17, 0.75] : [0.52, 0.72, 0.22];
      const path: P[] = a.hose === 'sprawled'
        ? [port, [0.62, 1.2, 0.1], [0.78, 0.7, 0.2], [0.7, 0.19, 0.45], [0.95, 0.16, 0.25 + random() * 0.2], end]
        : [port, [0.6, 1.3, 0.08], [0.72, 1.0, 0.12], [0.66, sag, 0.2], [0.56, 0.5, 0.26], end];
      s.root.add(ribbed(path, 0.038, s.material('#3a3d40', { roughness: 0.8 }), s.material('#5a5e62', { roughness: 0.6 })));
      const nozzle = s.cylinder(0.02, 0.042, 0.22, [end[0], end[1] + (a.hose === 'sprawled' ? 0 : 0.1), end[2] + (a.hose === 'sprawled' ? 0.1 : 0)], dark, 10);
      if (a.hose === 'sprawled') nozzle.rotation.x = Math.PI / 2;
      else s.box([0.1, 0.03, 0.12], [0.45, 0.72, 0.22], steel);
    } else {
      // Classic air-meter tower: flared foot, slim column, round dial head, crank.
      s.lathe([[0.2, 0], [0.2, 0.05], [0.11, 0.12], [0.075, 0.2], [0.07, 1.15], [0.1, 1.2], [0.1, 1.24], [0, 1.24]], body, [0, 0.12, 0]);
      const head = s.cylinder(0.27, 0.27, 0.2, [0, 1.6, 0], body, 28); head.rotation.x = Math.PI / 2;
      s.ring(0.27, 0.025, [0, 1.6, 0.1], steel);
      s.ball([0.05, 0.05, 0.05], [0, 1.9, 0], steel, 12);
      s.rod([0.27, 1.6, 0], [0.4, 1.6, 0], 0.014, steel); s.rod([0.4, 1.6, 0], [0.4, 1.5, 0.06], 0.014, steel);
      s.ball([0.028, 0.028, 0.028], [0.4, 1.49, 0.07], dark, 10);
      top = 1.92; hook = [-0.12, 1.2, 0.04];
      const dial = painted(0.48, 0.48, (ctx, w, h) => {
        ctx.fillStyle = '#f3eeda'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, 7); ctx.fill();
        ctx.strokeStyle = '#1b1d1f'; ctx.lineWidth = w * 0.012;
        for (let i = 0; i < 24; i++) { const t = Math.PI * (0.8 + i / 23 * 1.4); ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(t) * w * 0.42, h / 2 + Math.sin(t) * w * 0.42); ctx.lineTo(w / 2 + Math.cos(t) * w * (i % 4 ? 0.37 : 0.33), h / 2 + Math.sin(t) * w * (i % 4 ? 0.37 : 0.33)); ctx.stroke(); }
        write(ctx, a.panel === 'free' ? 'FREE' : 'AIR', w / 2, h * 0.36, h * 0.15, '#c42a20');
        write(ctx, { quarters: '75¢', dollar: '$1.50', card: '$2.00', free: 'AIR', oldcheap: '25¢', cashier: 'TOKEN' }[a.panel], w / 2, h * 0.7, h * 0.13, '#1b1d1f');
        const needle = Math.PI * (0.9 + random() * 1.2);
        ctx.strokeStyle = '#c42a20'; ctx.lineWidth = w * 0.02; ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + Math.cos(needle) * w * 0.36, h / 2 + Math.sin(needle) * w * 0.36); ctx.stroke();
        grime(ctx, w, h, random, wear * 0.7);
      }, { glow: lit * 0.45, cutout: true });
      dial.position.set(0, 1.6, 0.103); s.root.add(dial);
      // Bell hose across the drive, with its little signal box.
      const bell: P[] = [[-0.1, 0.14, 0.3], [0.1, 0.13, 0.62], [0.35 + random() * 0.2, 0.02, 0.8], [0.8, 0.02, 0.9 + random() * 0.2], [1.25, 0.02, 0.85 + random() * 0.3]];
      s.tube(bell, 0.017, rubber);
      s.box([0.16, 0.12, 0.1], [-0.1, 0.2, 0.26], dark);
      s.ball([0.05, 0.03, 0.05], [-0.1, 0.275, 0.26], steel, 12);
    }

    if (a.kind !== 'meter') {
      face(drawPanel, panelW, panelH, [0, panelY, front + 0.003]);
      // Coin box, slot, start button and gauge lamp.
      const cy = panelY - panelH / 2 - 0.09;
      s.box([0.16, 0.12, 0.03], [0.1, cy, front + 0.012], steel);
      s.box([0.012, 0.05, 0.012], [0.1, cy, front + 0.03], dark);
      s.cylinder(0.028, 0.028, 0.025, [-0.12, cy, front + 0.012], s.material(dead ? '#473c3a' : '#3ccf5a', { emissive: dead ? '#000000' : '#3ccf5a', emissiveIntensity: lit }), 14).rotation.x = Math.PI / 2;
      if (a.colour === 'white') s.box([a.kind === 'air' ? 0.565 : 0.785, 0.06, a.kind === 'air' ? 0.385 : 0.505], [0, a.kind === 'air' ? 1.0 : 0.95, 0], s.material('#c8281f'));
      // A header lamp under a little hood.
      s.box([panelW, 0.03, 0.07], [0, panelY + panelH / 2 + 0.03, front + 0.03], dark);
    }

    // The air hose.
    const [hx, hy, hz] = hook;
    s.rod([hx + 0.06, hy, hz], [hx - 0.07, hy, hz], 0.012, steel);
    s.rod([hx - 0.07, hy, hz], [hx - 0.07, hy + 0.06, hz], 0.012, steel);
    const out: P = [hx + 0.03, hy - 0.32, hz + 0.08];
    s.cylinder(0.022, 0.022, 0.05, out, steel, 10).rotation.z = Math.PI / 2;
    const chuck = (at: P, lying: boolean) => {
      const c = s.cylinder(0.012, 0.016, 0.11, at, steel, 8);
      if (lying) c.rotation.z = Math.PI / 2 + random();
      const tip = s.ball([0.022, 0.014, 0.022], [at[0] + (lying ? 0.06 : 0), at[1] - (lying ? 0 : 0.06), at[2]], steel, 10);
      return tip;
    };
    if (a.hose === 'hung') {
      for (let i = 0; i < 5; i++) {
        const loop = s.ring(0.15 + random() * 0.012, 0.011, [hx - 0.05 - i * 0.012, hy - 0.15, hz + (random() - 0.5) * 0.01], hoseRed);
        loop.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.25; loop.rotation.x = (random() - 0.5) * 0.15;
      }
      s.tube([out, [hx - 0.04, hy - 0.42, hz + 0.1], [hx - 0.09, hy - 0.3, hz + 0.02]], 0.011, hoseRed);
      s.tube([[hx - 0.1, hy - 0.3, hz - 0.02], [hx - 0.11, hy - 0.5, hz + 0.02], [hx - 0.1, hy - 0.62, hz + 0.03]], 0.011, hoseRed);
      chuck([hx - 0.1, hy - 0.67, hz + 0.03], false);
    } else if (a.hose === 'sprawled') {
      const x1 = -0.5 - random() * 0.25, z1 = 0.5 + random() * 0.25;
      const path = coil([[out[0] - 0.03, out[1], out[2]], [hx - 0.15, 0.6, 0.25], [hx - 0.2, 0.16, 0.45], [x1 * 0.7, 0.05, z1 + 0.25], [x1, 0.04, z1 - 0.1], [x1 - 0.25, 0.04, z1 + 0.2]], 0.035, 26);
      s.tube(path, 0.011, hoseRed);
      chuck([x1 - 0.3, 0.03, z1 + 0.22], true);
    } else if (a.hose === 'stretched') {
      const far: P = [-0.95 - random() * 0.25, 0.4, 0.7 + random() * 0.25];
      const path = coil([[out[0] - 0.03, out[1], out[2]], [(out[0] + far[0]) / 2, 0.55, (out[2] + far[2]) / 2], far], 0.03, 22);
      s.tube(path, 0.011, hoseRed);
      s.tube([far, [far[0] - 0.12, 0.12, far[2] + 0.06], [far[0] - 0.2, 0.03, far[2] + 0.1]], 0.011, hoseRed);
      chuck([far[0] - 0.24, 0.03, far[2] + 0.1], true);
    } else {
      s.tube(coil([[out[0] - 0.03, out[1], out[2]], [out[0] - 0.08, out[1] - 0.14, out[2] + 0.03], [out[0] - 0.07, out[1] - 0.3, out[2] + 0.02]], 0.03, 5), 0.011, hoseRed);
      for (let i = 0; i < 4; i++) s.rod([out[0] - 0.07, out[1] - 0.3, out[2] + 0.02], [out[0] - 0.07 + (random() - 0.5) * 0.06, out[1] - 0.36, out[2] + 0.02 + (random() - 0.5) * 0.06], 0.003, steel);
    }

    // Notices.
    const noteY = a.kind === 'meter' ? 1.15 : panelY - 0.02, noteZ = a.kind === 'meter' ? 0.09 : front + 0.012;
    if (a.notice === 'bag') {
      const bag = s.ball(a.kind === 'meter' ? [0.3, 0.33, 0.16] : [panelW * 0.56, 0.3, 0.07], [0, a.kind === 'meter' ? 1.6 : panelY - panelH / 2 + 0.02, a.kind === 'meter' ? 0.03 : front + 0.02], s.material('#e9e6dc', { roughness: 0.35, transparent: true, opacity: 0.92 }), 14);
      bag.rotation.z = (random() - 0.5) * 0.1;
      for (const x of [-1, 1]) s.box([0.05, 0.16, 0.004], [x * 0.14, bag.position.y + 0.26, bag.position.z + (a.kind === 'meter' ? 0.12 : 0.03)], s.material('#9a9d9f', { metalness: 0.5 })).rotation.z = x * 0.5;
    } else if (a.notice === 'note') {
      const lines = [['BROKE', 'EATS QUARTERS'], ['OUT OF', 'ORDER', 'SORRY'], ['NO AIR', 'ASK INSIDE'], ['DO NOT', 'USE!!']][Math.floor(random() * 4)];
      const note = painted(0.3, 0.24, (ctx, w, h) => { ctx.fillStyle = '#b89263'; ctx.fillRect(0, 0, w, h); scrawl(ctx, lines, w, h, '#1b1512', random); }, { px: 256 });
      note.position.set((random() - 0.5) * 0.05, noteY, noteZ + 0.004); note.rotation.z = (random() - 0.5) * 0.25; s.root.add(note);
      for (const x of [-1, 1]) s.box([0.07, 0.03, 0.002], [note.position.x + x * 0.13, noteY + 0.11, noteZ + 0.006], s.material('#8d9193'));
    } else if (a.notice === 'sticker') {
      const tag = painted(0.3, 0.14, (ctx, w, h) => { ctx.fillStyle = '#f2c81c'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#141414'; ctx.lineWidth = h * 0.07; ctx.strokeRect(0, 0, w, h); write(ctx, 'OUT OF SERVICE', w / 2, h / 2, h * 0.36, '#141414', { max: w * 0.9 }); });
      tag.position.set(0, noteY, noteZ + 0.004); tag.rotation.z = -0.06; s.root.add(tag);
    }

    if (a.bollard) {
      const bx = 0.55, bz = 0.42;
      s.cylinder(0.075, 0.075, 0.95, [bx, 0.59, bz], s.material('#e7b512', { roughness: 0.55 }), 16);
      s.ball([0.075, 0.04, 0.075], [bx, 1.065, bz], s.material('#e7b512', { roughness: 0.55 }), 14);
      s.cylinder(0.078, 0.078, 0.1, [bx, 0.85, bz], dark, 16);
      if (wear > 0.5) s.cylinder(0.079, 0.079, 0.07, [bx, 0.42 + random() * 0.1, bz], s.material('#7a4a2a'), 16);
    }

    // What was left behind.
    const px = a.kind === 'airvac' ? -0.52 : 0.28, pz = a.kind === 'airvac' ? 0.42 : -0.2;
    if (a.left === 'tyre') {
      const tyre = s.ring(0.24, 0.085, [a.kind === 'airvac' ? -0.56 : 0.3, 0.42, a.kind === 'airvac' ? 0.1 : -0.02], rubber);
      tyre.scale.z = 1.5; tyre.rotation.y = a.kind === 'airvac' ? Math.PI / 2 : 0.3; tyre.rotation.x = a.kind === 'airvac' ? 0 : -0.3; tyre.rotation.z = a.kind === 'airvac' ? 0 : 0;
      if (a.kind === 'airvac') tyre.rotation.set(0, Math.PI / 2, 0), tyre.rotateX(0.22);
    } else if (a.left === 'cup') {
      s.cylinder(0.045, 0.033, 0.16, [px, 0.2, pz], s.material('#e9e4d4'), 14);
      s.cylinder(0.047, 0.047, 0.012, [px, 0.285, pz], s.material('#d43a2a'), 14);
      s.rod([px, 0.28, pz], [px + 0.02, 0.38, pz + 0.01], 0.004, s.material('#d43a2a'));
      for (let i = 0; i < 5; i++) s.cylinder(0.012, 0.012, 0.003, [px + 0.1 + random() * 0.2, 0.123, pz + (random() - 0.5) * 0.25], steel, 10);
    } else if (a.left === 'jug') {
      s.box([0.16, 0.24, 0.1], [px, 0.24, pz], s.material('#3fae5a', { roughness: 0.4 }));
      s.cylinder(0.022, 0.022, 0.05, [px - 0.04, 0.385, pz], s.material('#f1c21b'), 10);
      s.ring(0.04, 0.012, [px + 0.04, 0.34, pz], s.material('#3fae5a'));
      const rag = s.ball([0.11, 0.025, 0.08], [px + 0.2, 0.135, pz + 0.12], s.material('#b23b2e', { roughness: 0.95 }), 10); rag.rotation.y = random() * 3;
    } else if (a.left === 'cone') {
      s.box([0.26, 0.025, 0.26], [px, 0.132, pz + 0.1], s.material('#e8662a'));
      s.cylinder(0.025, 0.1, 0.42, [px, 0.35, pz + 0.1], s.material('#e8662a'), 16);
      s.cylinder(0.052, 0.068, 0.07, [px, 0.39, pz + 0.1], s.material('#f1ede2'), 16);
    }

    // Rust at the foot, when the mood is worn.
    if (wear > 0.45 && a.kind !== 'meter') for (let i = 0; i < 5; i++) s.box([0.03 + random() * 0.05, 0.02 + random() * 0.04, 0.004], [(random() - 0.5) * (panelW + 0.1), (a.kind === 'airvac' ? 0.25 : 0.96) + random() * 0.12, front + 0.002], s.material('#7a4a2a', { roughness: 1 }));
    void top;

    const lamp = a.kind === 'meter' ? null : s.box([panelW * 0.9, 0.018, 0.02], [0, panelY + panelH / 2 + 0.012, front + 0.03], s.material('#fff5cf', { emissive: '#ffe9a8', emissiveIntensity: lit * 1.4 }));
    const flicker = wear * mix(0.2, 1, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (!lamp || dead) return;
        const material = lamp.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = lit * 1.4 * (1 - flicker * (Math.sin(time * 23) * Math.sin(time * 7.3) > 0.55 ? 0.8 : 0));
      },
    });
  },
});
