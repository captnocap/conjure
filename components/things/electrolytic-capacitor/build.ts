import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { MASK_OPTIONS, board, gather, paint, pick, solder } from './pcb';

const SLEEVES = {
  black: { body: '#23262b', stripe: '#b9bcc0', ink: '#d9dadc' },
  blue: { body: '#1f3f8f', stripe: '#c9d2e6', ink: '#e8ecf6' },
  brown: { body: '#4a2f22', stripe: '#d9b45a', ink: '#e6c877' },
  green: { body: '#1f6a4c', stripe: '#e2e6dc', ink: '#f1f3ea' },
  purple: { body: '#4b2a78', stripe: '#d9b45a', ink: '#e9cf86' },
  bare: { body: '#b9bdc0', stripe: '#2a2c30', ink: '#2a2c30' },
} as const;

export default defineThing({
  questions: {
    size: choice('What shape of can is it?', {
      squat: 'A short fat drum, barely taller than it is wide.',
      standard: 'The ordinary can, twice as tall as wide, the one in every power supply.',
      tower: 'A tall thin tower that stands well above everything near it.',
      tank: 'A big wide filter can, a storage tank that dominates the board.',
    }),
    sleeve: choice('What colour is the shrink-wrap sleeve?', {
      black: 'Black with a pale grey stripe, anonymous and cheap.',
      blue: 'Royal blue with a silver stripe, a respectable brand.',
      brown: 'Chocolate brown with a gold stripe, the long-life kind.',
      green: 'Dark green with a cream stripe, an audio part.',
      purple: 'Purple with gold lettering, boutique and proud of itself.',
      bare: 'No sleeve left at all: a bare aluminium can with ink stamped on it.',
    }),
    state: choice('What has happened to it?', {
      healthy: 'Nothing. The top is flat and clean and it still works.',
      bulging: 'The scored top has domed upward. It has not burst yet but it will.',
      vented: 'The top has split along the score and brown crust has dried around the tear.',
      'base-leak': 'It leaked from underneath: a brown tide mark and crust spread over the board around its feet.',
      exploded: 'It blew its top off. A torn open can with paper and foil unspooling out of it.',
    }),
    company: choice('Is it alone?', {
      alone: 'A single capacitor.',
      bank: 'A row of three identical cans, all in the same condition.',
      'one-bad': 'A row of three where only the middle one has failed and its neighbours are fine.',
      mismatched: 'Next to a smaller replacement of a different brand that someone fitted later.',
    }),
    rating: choice('What is printed on the sleeve?', {
      low: '1000uF 16V, an ordinary power supply value.',
      high: '10uF 450V, a mains-side part that deserves respect.',
      hot: '2200uF 6.3V 105C, the kind packed beside a processor.',
      plague: 'A brand nobody has heard of, in letters slightly too large.',
    }),
    score: choice('What pattern is scored into the top as a safety vent?', {
      cross: 'A plain cross.',
      k: 'A K shape.',
      y: 'A three-armed Y.',
    }),
    leaning: noul('Has it been knocked over at an angle on its legs?'),
    board: choice('What kind of board is it soldered to?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dims = { squat: [5, 11], standard: [5, 20], tower: [5.2, 33], tank: [9, 27] }[a.size];
    const R = dims[0], H = dims[1];
    const count = a.company === 'alone' ? 1 : a.company === 'mismatched' ? 2 : 3;
    const pitch = R * 2 + 2.2;
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const alu = s.material('#c4c8ca', { metalness: 0.8, roughness: 0.36 });
    const rubber = s.material('#1b1c1e', { roughness: 0.9 });
    const crust = s.material('#6a4424', { roughness: 1 });
    const crustLight = s.material('#a67a3c', { roughness: 1 });
    const paper = s.material('#d8c9a0', { roughness: 0.95 });
    const dark = s.material('#2b2a28', { roughness: 0.8 });
    const text = { low: ['1000uF', '16V'], high: ['10uF', '450V'], hot: ['2200uF', '6.3V 105C'], plague: ['LUCKY-CAP', '1000uF 10V'] }[a.rating];

    const xs = Array.from({ length: count }, (_unused, index) => (index - (count - 1) / 2) * pitch);
    const pads: { x: number; z: number; square?: boolean }[] = [];
    const puddles: { x: number; z: number; r: number }[] = [];
    const span = count * pitch;
    const w = Math.max(30, span + 14), d = Math.max(24, R * 2 + 14);

    const caps: { x: number; r: number; h: number; state: typeof a.state; sleeve: keyof typeof SLEEVES; lines: readonly string[] }[] = xs.map((x, index) => {
      const failed = a.company !== 'one-bad' || index === 1 ? a.state : 'healthy';
      if (a.company === 'mismatched' && index === 1) {
        const others = (Object.keys(SLEEVES) as (keyof typeof SLEEVES)[]).filter((key) => key !== a.sleeve && key !== 'bare');
        return { x, r: R * 0.72, h: H * 0.62, state: 'healthy' as const, sleeve: pick(random, others), lines: ['NEW', '105C'] };
      }
      return { x, r: R, h: H, state: failed, sleeve: a.sleeve, lines: text };
    });
    for (const cap of caps) {
      const lead = cap.r > 7 ? 3.75 : cap.r > 4 ? 2.5 : 1.75;
      pads.push({ x: cap.x - lead, z: 0, square: true }, { x: cap.x + lead, z: 0 });
      if (cap.state === 'base-leak') for (let i = 0; i < 7; i++) {
        const angle = random() * Math.PI * 2, reach = cap.r * (0.7 + random() * 0.9);
        puddles.push({ x: cap.x + Math.cos(angle) * reach, z: Math.sin(angle) * reach, r: cap.r * (0.35 + random() * 0.5) });
      }
    }

    board(s, {
      w, d, mask: a.board, random, wear: mood.wear, pads,
      outlines: caps.map((cap) => ({ x: cap.x, z: 0, w: cap.r * 2 + 1, d: cap.r * 2 + 1, round: true })),
      silk: [
        ...caps.map((cap, index) => ({ text: `C${12 + index + Math.floor(random() * 3) * 10}`, x: cap.x, z: cap.r + 3.2, size: 2.4 })),
        ...caps.map((cap) => ({ text: '+', x: cap.x - cap.r - 1.6, z: -cap.r * 0.5, size: 2.6 })),
      ],
      extra: (ctx) => {
        for (const puddle of puddles) {
          const gradient = ctx.createRadialGradient(puddle.x, puddle.z, puddle.r * 0.2, puddle.x, puddle.z, puddle.r);
          gradient.addColorStop(0, 'rgba(70,42,18,0.85)');
          gradient.addColorStop(0.8, 'rgba(96,60,24,0.7)');
          gradient.addColorStop(1, 'rgba(120,84,40,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(puddle.x, puddle.z, puddle.r, 0, Math.PI * 2); ctx.fill();
        }
      },
    });

    const leanSide = random() < 0.5 ? -1 : 1;
    for (const cap of caps) {
      const { r, h } = cap;
      const tone = SLEEVES[cap.sleeve];
      const wrap = s.material(tone.body, { roughness: cap.sleeve === 'bare' ? 0.4 : 0.38, metalness: cap.sleeve === 'bare' ? 0.8 : 0.05 });
      const blown = cap.state === 'exploded';
      const top = blown ? h * mix(0.5, 0.7, random()) : h;
      const group = gather(s, () => {
        const lead = r > 7 ? 3.75 : r > 4 ? 2.5 : 1.75;
        for (const side of [-1, 1]) {
          s.rod([cap.x + side * lead, -1.6, 0], [cap.x + side * lead, 1.2, 0], 0.32, tin);
          solder(s, cap.x + side * lead, 0, tin, 0.8);
        }
        const groove = 0.9 + Math.min(h * 0.09, 2.4);
        s.cylinder(r - 0.5, r - 0.5, 0.5, [cap.x, 0.75, 0], rubber, 28);
        // Lower sleeve with the crimped bead groove.
        s.lathe([[r - 0.5, 0.9], [r, 1.3], [r, groove], [r - 0.55, groove + 0.6], [r, groove + 1.2]], wrap, [cap.x, 0, 0]);
        // Printed straight section.
        const bodyFrom = groove + 1.2, bodyTo = top - (blown ? 0 : 0.9);
        const circumference = Math.PI * 2 * r, tall = bodyTo - bodyFrom;
        const ppm = Math.min(24, 1024 / circumference);
        const print = paint(circumference * ppm, tall * ppm, (ctx, cw, ch) => {
          ctx.fillStyle = tone.body;
          ctx.fillRect(0, 0, cw, ch);
          const fade = ctx.createLinearGradient(0, 0, cw, 0);
          for (let i = 0; i <= 8; i++) fade.addColorStop(i / 8, `rgba(255,255,255,${i % 2 ? 0.07 : 0})`);
          ctx.fillStyle = fade;
          ctx.fillRect(0, 0, cw, ch);
          // Polarity stripe with minus signs, a little to one side of the front.
          const stripeWidth = cw * 0.17, stripeAt = cw * 0.6;
          ctx.fillStyle = tone.stripe;
          ctx.fillRect(stripeAt, 0, stripeWidth, ch);
          ctx.fillStyle = tone.body;
          const dash = stripeWidth * 0.52;
          for (let y = dash; y < ch - dash * 0.4; y += dash * 1.5) ctx.fillRect(stripeAt + (stripeWidth - dash) / 2, y, dash, dash * 0.28);
          ctx.fillStyle = tone.ink;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const size = Math.min(ch * 0.17, cw * 0.058);
          ctx.font = `bold ${size}px monospace`;
          cap.lines.forEach((line, index) => ctx.fillText(line, cw * 0.42, ch * 0.3 + index * size * 1.25, cw * 0.3));
          ctx.font = `${size * 0.55}px monospace`;
          ctx.fillText('(M) 85C  ' + (cap.sleeve === 'purple' ? 'AUDIO' : 'CE'), cw * 0.42, ch * 0.3 + cap.lines.length * size * 1.3, cw * 0.3);
          if (mood.wear > 0.3) {
            ctx.fillStyle = `rgba(190,180,160,${(mood.wear - 0.3) * 0.35})`;
            for (let i = 0; i < 160; i++) ctx.fillRect(random() * cw, random() * ch * 0.5, 2 + random() * 5, 1 + random() * 3);
          }
        });
        const printed = new THREE.MeshStandardMaterial({ map: print, roughness: cap.sleeve === 'bare' ? 0.4 : 0.36, metalness: cap.sleeve === 'bare' ? 0.7 : 0.05 });
        const body = s.mesh(new THREE.CylinderGeometry(r, r, tall, 40, 1, true), printed, [cap.x, (bodyFrom + bodyTo) / 2, 0]);
        body.rotation.y = Math.PI + (random() - 0.5) * 0.7;

        if (!blown) {
          // Shoulder where the sleeve shrinks over the rim, then the bare scored lid.
          s.lathe([[r, h - 0.9], [r - 0.12, h - 0.35], [r - 0.6, h - 0.02], [r - 1.25, h]], wrap, [cap.x, 0, 0]);
          const lid = r - 1.2;
          const rise = cap.state === 'bulging' ? lid * 0.42 : cap.state === 'vented' ? lid * 0.3 : cap.state === 'base-leak' ? lid * 0.12 : 0.02;
          s.cylinder(lid, lid, 0.1, [cap.x, h - 0.06, 0], alu, 32);
          if (rise > 0.1) s.ball([lid, rise, lid], [cap.x, h - 0.02, 0], alu, 28);
          const arms = a.score === 'cross' ? [0, Math.PI / 2] : a.score === 'y' ? [Math.PI / 2, Math.PI * 7 / 6, Math.PI * 11 / 6] : [Math.PI / 2, 0.6, -0.6];
          const turn = random() * Math.PI;
          for (const [index, arm] of arms.entries()) {
            const half = a.score === 'cross', flat = rise > 0.5 ? 0.62 : 1, length = (half ? lid * 1.7 : lid * 0.85) * flat;
            const offset = half ? 0 : length / 2;
            const kShift = a.score === 'k' && index === 0 ? -lid * 0.3 : 0;
            const line = s.box([a.score === 'k' && index === 0 ? lid * 1.5 : length, 0.08, cap.state === 'vented' ? 0.5 : 0.16], [0, 0, 0], dark);
            const angle = arm + turn;
            const cx = a.score === 'k' && index === 0 ? Math.cos(turn) * kShift : Math.cos(angle) * offset + (a.score === 'k' ? Math.cos(turn) * kShift : 0);
            const cz = a.score === 'k' && index === 0 ? -Math.sin(turn) * kShift : -Math.sin(angle) * offset - (a.score === 'k' ? Math.sin(turn) * kShift : 0);
            const along = Math.hypot(cx, cz) / Math.max(lid, 0.01);
            line.position.set(cap.x + cx, h + rise * Math.sqrt(Math.max(0, 1 - along * along)) * (half ? 1 : 0.9) + 0.02, cz);
            line.rotation.y = angle;
          }
          if (cap.state === 'vented') {
            for (let i = 0; i < 16; i++) {
              const angle = random() * Math.PI * 2, reach = Math.sqrt(random()) * lid * 0.95, size = 0.35 + random() * r * 0.2;
              s.ball([size, size * 0.6, size], [cap.x + Math.cos(angle) * reach, h + rise * (1 - reach / lid) + 0.15, Math.sin(angle) * reach], i % 3 ? crust : crustLight, 8);
            }
            // A dried run down the side.
            const angle = 0.5 + random() * 1.2;
            for (let i = 0; i < 7; i++) s.ball([0.5 + random() * 0.4, 0.9, 0.3], [cap.x + Math.cos(angle) * (r + 0.05), h - 0.6 - i * 1.3, Math.sin(angle) * (r + 0.05)], crust, 8).rotation.y = -angle + Math.PI / 2;
          }
        } else {
          // Torn rim: jagged petals of aluminium peeled outward, with the wound roll escaping.
          const petals = 9;
          for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2 + random() * 0.3, tall2 = 1.2 + random() * r * 0.6;
            const petal = s.mesh(new THREE.ConeGeometry(r * 0.36, tall2, 3, 1), alu, [cap.x + Math.cos(angle) * (r + tall2 * 0.18), top + tall2 * 0.38, Math.sin(angle) * (r + tall2 * 0.18)]);
            petal.rotation.set(0, -angle, -0.5 - random() * 0.5, 'YXZ');
          }
          s.cylinder(r * 0.82, r * 0.82, 1.6, [cap.x, top + 0.2, 0], paper, 24);
          for (let ring = 1; ring < 4; ring++) s.ring(r * 0.2 * ring, 0.12, [cap.x, top + 1.02, 0], dark).rotation.x = Math.PI / 2;
          const points: [number, number, number][] = [];
          const lean = random() * Math.PI * 2;
          for (let i = 0; i <= 26; i++) {
            const t = i / 26, angle = t * Math.PI * 5 + lean, reach = r * (0.5 + t * 1.5);
            points.push([cap.x + Math.cos(angle) * reach + Math.cos(lean) * t * r, top + 1 + Math.sin(t * Math.PI) * h * 0.55 - t * t * (top + 0.6), Math.sin(angle) * reach + Math.sin(lean) * t * r * 0.4]);
          }
          const ribbon = s.tube(points, 0.5, paper);
          ribbon.scale.y = 1;
          for (let i = 0; i < 14; i++) {
            const angle = random() * Math.PI * 2, reach = r * (1.2 + random() * 1.6);
            const scrap = s.box([0.6 + random() * 1.4, 0.08, 0.5 + random()], [cap.x + Math.cos(angle) * reach, 0.06, Math.sin(angle) * reach * 0.6], i % 2 ? paper : alu);
            scrap.rotation.y = random() * 3;
          }
        }
        if (cap.state === 'base-leak') for (let i = 0; i < 18; i++) {
          const angle = random() * Math.PI * 2, reach = r * (0.95 + random() * 0.5), size = 0.4 + random() * r * 0.16;
          s.ball([size, size * 0.55, size], [cap.x + Math.cos(angle) * reach, 0.2 + random() * 0.6, Math.sin(angle) * reach], i % 3 ? crust : crustLight, 8);
        }
      });
      // Tilt about the feet.
      const tilt = a.leaning ? mix(0.16, 0.3, random()) * leanSide : (random() - 0.5) * 0.05;
      group.position.set(cap.x, 0.6, 0);
      group.children.forEach((child) => { child.position.x -= cap.x; child.position.y -= 0.6; });
      group.rotation.set(tilt, 0, a.leaning ? (random() - 0.5) * 0.12 : 0);
    }

    s.root.scale.setScalar(0.001);
    return s.finish();
  },
});
