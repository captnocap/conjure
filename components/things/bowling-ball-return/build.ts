import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const ERAS = {
  atomic: 'Atomic 1960s: turquoise fibreglass with a chrome starburst, tail fins and a cream stripe.',
  woodgrain: '1970s: harvest-orange hood over wood-grain laminate sides with a brown racing stripe.',
  neon: '1990s: glossy black with glowing pink and cyan neon tubes and a squiggle pattern.',
  plain: 'Anonymous modern grey plastic with a rubber bumper, built by the lowest bidder.',
} as const;

export default defineThing({
  questions: {
    era: choice('What era is the styling?', ERAS),
    rack: choice('How are the returned balls held?', {
      rails: 'In a straight line on two chrome rails running out from the mouth.',
      carousel: 'On a round chrome ring rack like a lazy Susan in front of the mouth.',
      twotier: 'On a double-decker rail rack, a second row of balls stored underneath.',
    }),
    waiting: choice('How many balls are waiting?', {
      empty: 'None at all: bare rails.',
      one: 'A single ball, alone.',
      few: 'Three or four, room to spare.',
      full: 'Packed end to end, one more balanced on top of the others.',
    }),
    colours: choice('What colours are the balls?', {
      house: 'A mismatched house mix: marbled red, green, blue, purple and orange.',
      black: 'Serious plain black league balls.',
      pastel: 'Light pastel balls for children, pink and baby blue and yellow.',
      cosmic: 'Translucent balls glowing from inside for cosmic bowling.',
      gold: 'Dull dark house balls with one gleaming gold ball among them.',
    }),
    mouth: choice('What is happening at the mouth of the return?', {
      clear: 'Nothing: an empty dark opening.',
      emerging: 'A ball is just rolling out into the light.',
      stuck: 'A ball is jammed halfway out and has been for a while; someone has taped a note above it.',
      flap: 'A rubber flap hangs closed over the opening.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing.',
      towel: 'A grubby towel draped over the hood.',
      drink: 'A paper cup with a straw, sweating on the hood.',
      rosin: 'A rosin bag and a wrist brace.',
      ramp: 'A child\'s steel ball ramp parked beside it.',
      glove: 'A single bowling glove.',
    }),
    dryer: noul('Is the hand dryer blowing?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glow = mix(0.3, 1, mood.cheer);
    const chrome = s.material('#e3e7ea', { metalness: 0.95, roughness: mix(0.12, 0.45, mood.wear) });
    const dark = s.material('#17181c', { roughness: 0.8 });
    const hoodColour = { atomic: '#2fb5ad', woodgrain: '#d9741f', neon: '#1a1a22', plain: '#9aa0a6' }[a.era];
    const hood = s.material(hoodColour, { roughness: mix(0.22, 0.6, mood.wear), metalness: 0.05 });
    const woodMap = a.era === 'woodgrain' ? paint(256, 128, (c, w, h) => {
      c.fillStyle = '#7a4f2a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(${40 + random() * 40},${20 + random() * 20},5,0.5)`; c.lineWidth = 0.5 + random() * 2; c.beginPath(); const y = random() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 14, w * 0.6, y + (random() - 0.5) * 14, w, y + (random() - 0.5) * 8); c.stroke(); }
    }) : null;
    const side = woodMap ? new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.55 })
      : s.material({ atomic: '#f1ead2', woodgrain: '#7a4f2a', neon: '#24242e', plain: '#7c8288' }[a.era], { roughness: 0.5 });

    // ---- body: a long low pedestal with a domed hood at the back (-z), mouth facing +z
    const L = a.rack === 'carousel' ? 0.9 : 1.3;
    const HOOD_Z = -L / 2 - 0.18;
    s.box([0.66, 0.44, L + 0.8], [0, 0.26, -0.2], side);
    s.box([0.7, 0.05, L + 0.84], [0, 0.03, -0.2], dark);
    s.box([0.685, 0.03, L + 0.82], [0, 0.49, -0.2], chrome);
    const dome = s.ball([0.4, 0.46, 0.5], [0, 0.5, HOOD_Z], hood, 32);
    dome.rotation.x = 0;
    // mouth: a dark throat ringed in chrome
    const mouthZ = HOOD_Z + 0.45;
    const ring = s.ring(0.15, 0.022, [0, 0.69, mouthZ], chrome);
    const throat = s.cylinder(0.15, 0.15, 0.08, [0, 0.69, mouthZ - 0.03], dark, 24);
    throat.rotation.x = Math.PI / 2;
    ring.rotation.x = 0;

    s.label(String(1 + Math.floor(random() * 20)) + '-' + String(21 + Math.floor(random() * 20)), 0.3, 0.14, [0, 0.3, -0.2 + (L + 0.8) / 2 + 0.004], '#f4efe0', a.era === 'neon' ? '#b3126e' : a.era === 'atomic' ? '#17736e' : '#3a2a1c');
    // era trim
    if (a.era === 'atomic') {
      for (const x of [-1, 1]) {
        const fin = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.7, 0), new THREE.Vector2(0.0, 0.4)]);
        const mesh = s.mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.025, bevelEnabled: false }), chrome, [x * 0.36 - 0.0125, 0.5, HOOD_Z - 0.45]);
        mesh.rotation.y = -Math.PI / 2;
        s.box([0.012, 0.1, L + 0.7], [x * 0.333, 0.3, -0.2], hood);
      }
      // starburst on the hood top
      for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI; const ray = s.box([i % 2 ? 0.18 : 0.28, 0.008, 0.016], [0, 0.962, HOOD_Z], chrome); ray.rotation.y = t; }
    } else if (a.era === 'woodgrain') {
      for (let i = 0; i < 9; i++) { const t = (i - 4) * 0.2; s.box([0.16, 0.012, 0.11], [0, 0.5 + 0.462 * Math.cos(t), HOOD_Z + 0.502 * Math.sin(t)], s.material('#5a2f16')).rotation.x = t * 0.95; }
      for (const x of [-1, 1]) s.box([0.012, 0.06, L + 0.7], [x * 0.333, 0.4, -0.2], s.material('#f1c232'));
    } else if (a.era === 'neon') {
      const tubes = ['#ff3fb0', '#2fe6ff'];
      for (const x of [-1, 1]) tubes.forEach((tint, i) => s.box([0.02, 0.025, L + 0.8], [x * 0.34, 0.16 + i * 0.2, -0.2], s.material(tint, { emissive: tint, emissiveIntensity: 1.6 * glow })));
      const squiggle = s.material('#ffe14a', { emissive: '#ffe14a', emissiveIntensity: glow });
      s.tube(Array.from({ length: 9 }, (_u, i) => [(i % 2 ? 0.1 : -0.1), 0.5 + 0.47 * Math.cos((i - 5) * 0.16), HOOD_Z + 0.5 * Math.sin((i - 5) * 0.16)] as const), 0.012, squiggle);
    } else {
      s.box([0.72, 0.07, L + 0.86], [0, 0.2, -0.2], dark);
    }

    // hand-dryer vent: a louvred chrome dish on the hood's shoulder
    const ventAt: [number, number, number] = [0.0, 0.925, HOOD_Z + 0.2];
    const dish = s.cylinder(0.085, 0.1, 0.03, ventAt, chrome, 20);
    dish.rotation.x = 0.35;
    for (let i = -2; i <= 2; i++) s.box([0.13 - Math.abs(i) * 0.02, 0.006, 0.012], [0, ventAt[1] + 0.02 - i * 0.011, ventAt[2] + i * 0.03], dark).rotation.x = 0.35;
    const ribbons: THREE.Mesh[] = [];
    if (a.dryer) for (let i = 0; i < 5; i++) {
      const ribbon = s.box([0.014, 0.16, 0.003], [(i - 2) * 0.028, ventAt[1] + 0.1, ventAt[2] + 0.02], s.material(['#ff5a5a', '#ffd23f', '#f4f4f4'][i % 3], { side: THREE.DoubleSide }));
      ribbon.geometry.translate(0, 0.08, 0); ribbon.position.y -= 0.08;
      ribbon.rotation.x = 0.4; ribbons.push(ribbon);
    }

    // ---- ball paint
    const ballGeometry = new THREE.SphereGeometry(0.109, 24, 16);
    const marble = (hue: number, sat: number, light: number, emissive = 0) => {
      const map = paint(128, 64, (c, w, h) => {
        c.fillStyle = `hsl(${hue},${sat}%,${light}%)`; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 34; i++) {
          c.strokeStyle = `hsla(${hue + (random() - 0.5) * 50},${sat}%,${light + mix(-14, 30, random())}%,0.55)`; c.lineWidth = 1.5 + random() * 6;
          c.beginPath(); c.moveTo(random() * w, random() * h); c.bezierCurveTo(random() * w, random() * h, random() * w, random() * h, random() * w, random() * h); c.stroke();
        }
        c.fillStyle = '#060606';
        for (const [x, y] of [[60, 14], [68, 14], [64, 22]]) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
      });
      return new THREE.MeshStandardMaterial({ map, roughness: mix(0.12, 0.45, mood.wear), emissive: '#ffffff', emissiveMap: map, emissiveIntensity: emissive });
    };
    const palette: THREE.Material[] =
      a.colours === 'house' ? [0, 130, 215, 280, 28, 330].map((h) => marble(h + random() * 16, 62, 34))
        : a.colours === 'black' ? [marble(230, 8, 9), marble(0, 6, 12)]
          : a.colours === 'pastel' ? [335, 200, 52, 150].map((h) => marble(h, 75, 74))
            : a.colours === 'cosmic' ? [300, 180, 90, 20].map((h) => marble(h, 95, 55, 0.85 * glow))
              : [marble(230, 12, 14), marble(20, 18, 16), marble(140, 14, 15)];
    const gold = a.colours === 'gold' ? new THREE.MeshStandardMaterial({ color: '#e0b030', metalness: 0.9, roughness: 0.22, emissive: '#6a4a00', emissiveIntensity: 0.4 }) : null;
    let placed = 0;
    const goldIndex = 1 + Math.floor(random() * 2);
    const addBall = (x: number, y: number, z: number) => {
      const material = gold && placed === goldIndex ? gold : palette[Math.floor(random() * palette.length)];
      placed++;
      const ball = s.mesh(ballGeometry, material, [x, y, z]);
      ball.rotation.set(random() * 6.28, random() * 6.28, random() * 6.28);
      return ball;
    };
    const count = { empty: 0, one: 1, few: 3 + Math.floor(random() * 2), full: 99 }[a.waiting];

    // ---- rack
    const railY = 0.6, R = 0.109;
    if (a.rack === 'carousel') {
      const cz = mouthZ + 0.62, radius = 0.36;
      s.cylinder(0.07, 0.11, 0.34, [0, 0.66 - 0.17 + 0.0, cz], chrome, 16);
      s.ring(radius + 0.07, 0.014, [0, railY, cz], chrome).rotation.x = Math.PI / 2;
      s.ring(radius - 0.07, 0.014, [0, railY, cz], chrome).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) { const t = i / 6 * 6.283; s.rod([0, railY - 0.06, cz], [Math.sin(t) * (radius + 0.07), railY, cz + Math.cos(t) * (radius + 0.07)], 0.008, chrome); }
      s.rod([-0.07, railY + 0.04, mouthZ], [-0.07, railY, cz - radius], 0.012, chrome);
      s.rod([0.07, railY + 0.04, mouthZ], [0.07, railY, cz - radius], 0.012, chrome);
      const slots = 9, n = Math.min(count, slots), start = random() * 6.28;
      for (let i = 0; i < n; i++) { const t = start + i / slots * 6.283; addBall(Math.sin(t) * radius, railY + R * 0.82, cz + Math.cos(t) * radius); }
      if (a.waiting === 'full') addBall(0, railY + R * 0.82 + 0.03, cz);
    } else {
      const z0 = mouthZ + 0.02, z1 = L / 2 + 0.17;
      for (const x of [-0.075, 0.075]) s.rod([x, railY + 0.05, z0], [x, railY, z1], 0.012, chrome);
      for (const x of [-0.13, 0.13]) s.rod([x, railY + 0.1, z0 + 0.1], [x, railY + 0.06, z1], 0.007, chrome);
      for (let i = 0; i < 4; i++) { const z = mix(z0 + 0.25, z1 - 0.03, i / 3); s.rod([-0.13, railY + 0.07, z], [-0.13, 0.5, z], 0.007, chrome); s.rod([0.13, railY + 0.07, z], [0.13, 0.5, z], 0.007, chrome); }
      s.box([0.3, 0.14, 0.03], [0, railY + 0.07, z1 + 0.012], dark);
      const slots = Math.floor((z1 - z0 - 0.2) / (R * 2.04)), n = Math.min(count, slots);
      for (let i = 0; i < n; i++) addBall(0, railY + R * 0.9, z1 - R - 0.005 - i * R * 2.04 - (a.waiting === 'few' ? random() * 0.02 * i : 0));
      if (a.waiting === 'full') addBall(0, railY + R * 0.9 + R * 1.72, z1 - R * 2 - 0.005 - Math.floor(random() * 3) * R * 2.04);
      if (a.rack === 'twotier') {
        for (const x of [-0.29, 0.29]) {
          const sx = Math.sign(x);
          s.rod([x + sx * 0.11, 0.3, -L / 2 + 0.25], [x + sx * 0.11, 0.3, z1], 0.012, chrome);
          s.rod([x + sx * 0.25, 0.34, -L / 2 + 0.25], [x + sx * 0.25, 0.34, z1], 0.012, chrome);
          for (const z of [-L / 2 + 0.3, z1 - 0.05]) s.rod([x + sx * 0.04, 0.28, z], [x + sx * 0.25, 0.34, z], 0.008, chrome);
          const stored = a.waiting === 'empty' ? 0 : a.waiting === 'one' ? (x < 0 ? 1 : 0) : 2 + Math.floor(random() * 4);
          for (let i = 0; i < stored; i++) addBall(x + sx * 0.18, 0.3 + R * 0.95, z1 - R - 0.02 - i * R * 2.06);
        }
      }
    }

    // ---- mouth state
    let rolling: THREE.Mesh | null = null;
    if (a.mouth === 'emerging' || a.mouth === 'stuck') {
      rolling = addBall(0, railY + R * 0.9 + 0.04, mouthZ + (a.mouth === 'stuck' ? -0.02 : 0.05));
      if (a.mouth === 'stuck') {
        const note = s.label('STUCK', 0.2, 0.09, [0.02, 0.9, mouthZ - 0.02], '#b3261e', '#f6f0c8');
        note.rotation.set(-0.5, 0, 0.12);
        s.box([0.06, 0.004, 0.02], [0.02, 0.935, mouthZ - 0.045], s.material('#d8c98a')).rotation.set(-0.5, 0, 0.12);
      }
    } else if (a.mouth === 'flap') {
      const flap = s.cylinder(0.15, 0.15, 0.012, [0, 0.69, mouthZ + 0.012], s.material('#2a2623', { roughness: 0.9 }), 24);
      flap.rotation.x = Math.PI / 2 - 0.12;
      for (const x of [-0.05, 0.05]) s.box([0.004, 0.24, 0.004], [x, 0.69, mouthZ + 0.024], dark);
    }

    // ---- what was left
    const top = 0.96;
    if (a.left === 'towel') {
      const cloth = s.material(mood.wear > 0.5 ? '#b9b39c' : '#f1eee4', { roughness: 1, side: THREE.DoubleSide });
      const drape = s.mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), cloth, [0.04, 0.505, HOOD_Z - 0.1]);
      drape.scale.set(0.415, 0.475, 0.3);
      
    } else if (a.left === 'drink') {
      s.cylinder(0.045, 0.034, 0.13, [0.1, top + 0.045, HOOD_Z - 0.1], s.material('#e8433a'), 16);
      s.cylinder(0.047, 0.047, 0.012, [0.1, top + 0.115, HOOD_Z - 0.1], s.material('#f4f4f0'), 16);
      s.rod([0.1, top + 0.11, HOOD_Z - 0.1], [0.13, top + 0.22, HOOD_Z - 0.08], 0.005, s.material('#f4f4f0'));
    } else if (a.left === 'rosin') {
      s.ball([0.07, 0.04, 0.06], [-0.08, top + 0.0, HOOD_Z - 0.12], s.material('#efe7d0', { roughness: 1 }), 12);
      s.ring(0.045, 0.02, [0.12, top - 0.02, HOOD_Z - 0.05], s.material('#22242a', { roughness: 0.9 })).rotation.x = Math.PI / 2 - 0.2;
    } else if (a.left === 'glove') {
      s.box([0.1, 0.02, 0.13], [0.03, top + 0.0, HOOD_Z - 0.1], s.material('#22242a', { roughness: 0.9 })).rotation.y = 0.5;
      for (let i = 0; i < 4; i++) s.box([0.018, 0.016, 0.07], [0.0 + i * 0.027, top - 0.005 - i * 0.004, HOOD_Z - 0.0 + i * 0.012], s.material('#c8202a', { roughness: 0.9 })).rotation.y = 0.5;
    } else if (a.left === 'ramp') {
      // a tubular steel ball ramp for children
      const x = 0.72, steel = chrome;
      for (const dx of [-0.11, 0.11]) {
        s.tube([[x + dx, 0.72, -0.3], [x + dx, 0.55, -0.05], [x + dx, 0.2, 0.3], [x + dx, 0.05, 0.62]], 0.012, steel);
        s.rod([x + dx, 0.72, -0.3], [x + dx * 1.6, 0, -0.42], 0.011, steel);
        s.rod([x + dx, 0.4, 0.1], [x + dx * 1.6, 0, 0.1], 0.011, steel);
      }
      s.rod([x - 0.18, 0.02, -0.42], [x + 0.18, 0.02, -0.42], 0.011, steel);
      s.rod([x - 0.18, 0.02, 0.1], [x + 0.18, 0.02, 0.1], 0.011, steel);
      const kid = s.mesh(ballGeometry, marble(320, 80, 70), [x, 0.72 + 0.09, -0.3]);
      kid.scale.setScalar(0.9);
    }

    const energy = mix(0.2, 1.5, mood.energy);
    return s.finish({
      update(dt, time) {
        ribbons.forEach((ribbon, i) => { ribbon.rotation.x = 0.4 + Math.sin(time * 9 * energy + i * 1.7) * 0.25; ribbon.rotation.z = Math.sin(time * 7 * energy + i) * 0.2; });
        if (rolling && a.mouth === 'emerging') rolling.rotation.x += dt * 1.5 * energy;
        if (rolling && a.mouth === 'stuck') rolling.position.x = Math.sin(time * 30) * 0.0015 * energy;
      },
    });
  },
});
