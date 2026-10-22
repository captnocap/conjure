import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const BODIES = { red: '#c9252b', blue: '#2458b8', yellow: '#f0bf1f', green: '#2f8a4c', chrome: '#cfd5d8', pink: '#ee6aa7' } as const;
const RAINBOW = ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#ff8a2a', '#f4f1ea', '#b45ad6', '#ff6fae'];

export default defineThing({
  questions: {
    fill: choice('How much is left in the globe?', {
      full: 'Brim-full, freshly loaded, a wall of colour.',
      half: 'About half, the level sloping where the wheel takes them.',
      low: 'A shallow layer rattling round the bottom.',
      single: 'One last ball, alone in the glass.',
      empty: 'Nothing. A clean empty globe.',
    }),
    contents: choice('What does it vend?', {
      gumballs: 'Classic gumballs in every colour.',
      mono: 'Gumballs all of one colour, the flavour nobody wanted.',
      bouncy: 'Big rubber bouncy balls.',
      capsules: 'Plastic capsules with tiny toys inside.',
      candy: 'Small loose candies or peanuts, a pour rather than a count.',
    }),
    body: choice('What colour is the cast body and lid?', {
      red: 'Fire-engine red, the classic.', blue: 'Royal blue.', yellow: 'Taxi yellow.', green: 'Racing green.', chrome: 'Bare polished chrome.', pink: 'Bubblegum pink.',
    }),
    globe: choice('What shape is the glass?', {
      round: 'A round fishbowl globe.',
      square: 'A square panelled glass box with chrome corner posts.',
      tall: 'A tall cylinder jar, more candy shop than arcade.',
    }),
    stand: choice('How is it mounted?', {
      pedestal: 'On a flared cast-iron pedestal and pole, waist high to an adult.',
      counter: 'No stand: sitting directly on a counter on rubber feet.',
      twin: 'Two heads side by side on a T-bar stand.',
      rack: 'Three in a row on a steel rack, the kind inside a supermarket door.',
    }),
    price: choice('What does the label on the coin mechanism say?', {
      penny: '1¢, an antique price.',
      nickel: '5¢.',
      quarter: '25¢.',
      free: 'FREE, hand-lettered, taped over the slot.',
      broken: 'OUT OF ORDER on a paper note stuck to the glass.',
    }),
    escaped: noul('Have a few balls got loose and rolled onto the floor around its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#d9dee0', { metalness: 0.9, roughness: 0.22 + mood.wear * 0.3 });
    const iron = s.material('#26282b', { metalness: 0.5, roughness: 0.6 });
    const dark = s.material('#141516');
    const glass = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#f4fbff').lerp(new THREE.Color('#d9cfa4'), mood.wear * 0.6), transparent: true, opacity: 0.2 + mood.wear * 0.14, roughness: 0.06, depthWrite: false, side: THREE.DoubleSide });
    const bodyKeys = Object.keys(BODIES) as (keyof typeof BODIES)[];
    const r = { gumballs: 0.0135, mono: 0.0135, bouncy: 0.019, capsules: 0.02, candy: 0.0085 }[a.contents];
    const monoColour = RAINBOW[Math.floor(random() * RAINBOW.length)];
    const candyTones = ['#c98a4a', '#e0b070', '#a86a35', '#d94b3f', '#f1e0b0'];
    const tone = () => {
      const base = a.contents === 'mono' ? monoColour : a.contents === 'candy' ? candyTones[Math.floor(random() * candyTones.length)] : RAINBOW[Math.floor(random() * RAINBOW.length)];
      return new THREE.Color(base).lerp(new THREE.Color('#9b968a'), (1 - mood.cheer) * 0.35);
    };
    const balls: { at: [number, number, number]; color: THREE.Color }[] = [];

    const head = (x: number, y: number, colourKey: keyof typeof BODIES, fill: typeof a.fill) => {
      const group = new THREE.Group();
      group.position.set(x, y, 0);
      s.root.add(group);
      const add = <T extends THREE.Object3D>(node: T) => { group.add(node); return node; };
      const paint = s.material(BODIES[colourKey], { metalness: colourKey === 'chrome' ? 0.9 : 0.25, roughness: colourKey === 'chrome' ? 0.25 : 0.38 });
      add(s.lathe([[0, 0], [0.1, 0], [0.108, 0.012], [0.104, 0.03], [0.088, 0.05], [0.084, 0.115], [0.098, 0.135], [0.098, 0.15], [0.07, 0.156], [0, 0.156]], paint));
      // Coin mechanism: plate, slot, crank, and the chute with its flap.
      add(s.box([0.078, 0.078, 0.03], [0, 0.088, 0.082], chrome));
      add(s.box([0.004, 0.026, 0.004], [0.022, 0.104, 0.098], dark));
      const crank = add(s.cylinder(0.022, 0.022, 0.018, [-0.006, 0.08, 0.104], chrome, 16));
      crank.rotation.x = Math.PI / 2;
      const bar = add(s.box([0.052, 0.014, 0.012], [-0.006, 0.08, 0.118], chrome));
      bar.rotation.z = random() * Math.PI;
      const flap = add(s.box([0.056, 0.04, 0.008], [0, 0.03, 0.108], chrome));
      flap.rotation.x = -0.35;
      add(s.box([0.062, 0.012, 0.03], [0, 0.012, 0.1], chrome));
      const tag = { penny: '1¢', nickel: '5¢', quarter: '25¢', free: 'FREE', broken: '25¢' }[a.price];
      const label = add(s.label(tag, a.price === 'free' ? 0.07 : 0.04, a.price === 'free' ? 0.034 : 0.022, [a.price === 'free' ? 0.004 : -0.014, a.price === 'free' ? 0.1 : 0.112, 0.0985], a.price === 'free' ? '#b3202c' : '#1b1b1b', a.price === 'free' ? '#fff8d8' : '#f1ecdc'));
      if (a.price === 'free') label.rotation.z = (random() - 0.5) * 0.3;

      const R = 0.104;
      let centre = 0.238, top = 0.335;
      const inside = (px: number, py: number, pz: number, margin: number) => {
        if (a.globe === 'round') return Math.hypot(px, py - centre, pz) < R - margin && py > 0.158 + margin;
        if (a.globe === 'square') return Math.abs(px) < 0.088 - margin && Math.abs(pz) < 0.088 - margin && py > 0.158 + margin;
        return Math.hypot(px, pz) < 0.082 - margin && py > 0.158 + margin;
      };
      if (a.globe === 'round') {
        add(s.ball([R, R, R], [0, centre, 0], glass, 28));
        add(s.ring(0.074, 0.006, [0, 0.158, 0], chrome)).rotation.x = Math.PI / 2;
      } else if (a.globe === 'square') {
        centre = 0.26; top = 0.365;
        add(s.box([0.19, 0.205, 0.19], [0, centre, 0], glass));
        for (const cx of [-1, 1]) for (const cz of [-1, 1]) add(s.box([0.012, 0.21, 0.012], [cx * 0.095, centre, cz * 0.095], chrome));
        add(s.box([0.205, 0.01, 0.205], [0, 0.158, 0], chrome));
      } else {
        centre = 0.29; top = 0.425;
        add(s.cylinder(0.088, 0.088, 0.27, [0, centre, 0], glass, 28));
        add(s.ring(0.088, 0.005, [0, 0.158, 0], chrome)).rotation.x = Math.PI / 2;
      }
      // Lid and lock.
      if (a.globe === 'square') add(s.box([0.215, 0.022, 0.215], [0, top + 0.008, 0], paint));
      else add(s.lathe([[0, 0.03], [0.03, 0.028], [0.058, 0.016], [a.globe === 'tall' ? 0.094 : 0.066, 0.002], [a.globe === 'tall' ? 0.094 : 0.066, -0.01], [0, -0.01]], paint, [0, top, 0]));
      add(s.cylinder(0.012, 0.016, 0.018, [0, top + 0.036, 0], chrome, 12));

      // Fill the glass from the bottom in jittered hex layers, keeping only what can be seen.
      const floorY = 0.16;
      const level = { full: top - 0.02, half: mix(floorY, top, 0.5), low: mix(floorY, top, 0.27), single: floorY, empty: floorY }[fill] + (random() - 0.5) * 0.02;
      if (fill === 'single') {
        balls.push({ at: [x + (random() - 0.5) * 0.05, y + floorY + r + 0.001, (random() - 0.5) * 0.05], color: tone() });
      } else if (fill !== 'empty') {
        let layer = 0;
        for (let py = floorY + r + 0.001; py < level; py += r * 1.66, layer++) {
          const lastLayer = py + r * 1.66 * 2 >= level;
          for (let gx = -0.1; gx <= 0.1; gx += r * 2.02) for (let gz = -0.1; gz <= 0.1; gz += r * 1.76) {
            const px = gx + (layer % 2 ? r : 0) + (Math.round(gz / (r * 1.76)) % 2 ? r : 0) + (random() - 0.5) * r * 0.3, pz = gz + (random() - 0.5) * r * 0.3;
            const lift = lastLayer && layer > 0 ? -Math.abs(px + pz * 0.4) * 0.12 + (random() - 0.5) * r * 0.5 : 0;
            if (!inside(px, py + lift, pz, r)) continue;
            if (!lastLayer && inside(px, py, pz, r * 3.6)) continue;
            balls.push({ at: [x + px, y + py + lift, pz], color: tone() });
          }
        }
      }
      if (a.price === 'broken') {
        const note = add(s.label('OUT OF ORDER', 0.13, 0.05, [0.01, centre + 0.01, (a.globe === 'round' ? R : 0.096) + 0.002], '#22252b', '#f6f1dc'));
        note.rotation.z = (random() - 0.5) * 0.35;
        add(s.box([0.03, 0.012, 0.001], [0.01, centre + 0.036, (a.globe === 'round' ? R : 0.096) + 0.003], s.material('#d9c79a')));
      }
      return top + 0.045;
    };

    if (a.stand === 'pedestal') {
      s.lathe([[0, 0], [0.17, 0], [0.175, 0.012], [0.13, 0.035], [0.06, 0.06], [0.03, 0.09], [0.022, 0.12], [0.022, 0.6], [0.034, 0.63], [0.07, 0.65], [0.07, 0.66], [0, 0.66]], iron);
      s.ring(0.03, 0.006, [0, 0.3, 0], chrome).rotation.x = Math.PI / 2;
      head(0, 0.66, a.body, a.fill);
    } else if (a.stand === 'counter') {
      for (const fx of [-1, 1]) for (const fz of [-1, 1]) s.cylinder(0.012, 0.014, 0.012, [fx * 0.065, 0.006, fz * 0.065], dark, 10);
      head(0, 0.012, a.body, a.fill);
    } else if (a.stand === 'twin') {
      s.lathe([[0, 0], [0.2, 0], [0.205, 0.012], [0.15, 0.035], [0.06, 0.06], [0.026, 0.1], [0.026, 0.6]], iron);
      s.box([0.44, 0.03, 0.08], [0, 0.605, 0], iron);
      const other = bodyKeys[(bodyKeys.indexOf(a.body) + 1 + Math.floor(random() * 4)) % bodyKeys.length];
      head(-0.14, 0.62, a.body, a.fill);
      head(0.14, 0.62, other, a.fill === 'full' ? 'half' : a.fill === 'single' ? 'empty' : a.fill);
    } else {
      const steel = s.material('#3a3d42', { metalness: 0.6, roughness: 0.5 });
      for (const fx of [-1, 1]) for (const fz of [-1, 1]) s.rod([fx * 0.4, 0, fz * 0.13], [fx * 0.36, 0.62, fz * 0.09], 0.012, steel);
      s.box([0.84, 0.025, 0.24], [0, 0.63, 0], steel);
      s.box([0.76, 0.012, 0.012], [0, 0.2, 0.125], steel); s.box([0.76, 0.012, 0.012], [0, 0.2, -0.125], steel);
      const fills: (typeof a.fill)[] = [a.fill, a.fill === 'full' ? 'half' : a.fill === 'single' ? 'empty' : a.fill, a.fill === 'empty' ? 'empty' : a.fill === 'single' ? 'empty' : 'low'];
      [-0.27, 0, 0.27].forEach((hx, index) => head(hx, 0.643, index === 0 ? a.body : bodyKeys[(bodyKeys.indexOf(a.body) + index * 2) % bodyKeys.length], fills[index]));
    }

    if (a.escaped) {
      const loose = 2 + Math.round(mood.density * 7 + random() * 2);
      const reach = a.stand === 'counter' ? 0.2 : 0.34;
      for (let i = 0; i < loose; i++) {
        const t = random() * Math.PI * 2, d = 0.13 + random() * reach;
        balls.push({ at: [Math.cos(t) * d, r, Math.abs(Math.sin(t)) * d * (random() < 0.8 ? 1 : -1)], color: tone() });
      }
    }
    if (balls.length) {
      const geometry = a.contents === 'candy' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 1);
      const mesh = s.scatter(geometry, new THREE.MeshStandardMaterial({ roughness: a.contents === 'bouncy' ? 0.5 : 0.28, flatShading: a.contents === 'candy' }), balls.map((ball) => ({ at: ball.at, size: r, color: ball.color })));
      mesh.frustumCulled = false;
    }
    return s.finish();
  },
});
