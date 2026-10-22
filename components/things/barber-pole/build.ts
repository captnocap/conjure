import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const STRIPES = {
  classic: ['#c8202c', '#f4f0e6', '#1f3f9a', '#f4f0e6'],
  'red-white': ['#c8202c', '#f4f0e6'],
  'black-gold': ['#1b1a1c', '#d4a437'],
  seafoam: ['#3f9c8c', '#f4f0e6', '#e58c9b', '#f4f0e6'],
  sunbleached: ['#d9a59c', '#efe9dc', '#a9b4cf', '#efe9dc'],
} as const;

const SIGNS = { barber: 'BARBER', open: 'OPEN', walkins: 'WALK-INS', price: 'CUTS $8', fishing: "GONE FISHIN'", lease: 'FOR LEASE' } as const;

export default defineThing({
  questions: {
    stripes: choice('What colours spiral inside the glass?', {
      classic: 'Red, white and blue, the American barbershop standard.',
      'red-white': 'Only red and white, the older candy-cane surgeon-barber pole.',
      'black-gold': 'Black and gold, a slick modern fade-and-beard parlour.',
      seafoam: 'Seafoam green and pink, a 1950s beauty-salon pastel.',
      sunbleached: 'The original colours bleached to chalky pink and grey-blue by decades of sun.',
    }),
    state: choice('What is the pole doing right now?', {
      open: 'Turning steadily with the globe lit: the shop is open.',
      closed: 'Stopped and dark for the night, perfectly intact.',
      stuttering: 'Motor failing: it sits crooked in the glass and the globe flickers.',
      shuttered: 'Dead for years, glass cracked, the helix slumped and dust-grey.',
      memorial: 'Stopped, with a wreath and flowers left at its foot for the barber who is gone.',
    }),
    pedestal: choice('What does it stand on?', {
      column: 'A fluted cast-iron column with a flared foot.',
      cabinet: 'A square panelled enamel cabinet, like a porcelain stove.',
      tripod: 'Three curved claw legs meeting under a slim stem.',
      tyre: 'A steel pipe set in a concrete-filled tyre, a homemade sidewalk stand.',
    }),
    top: choice('What crowns it?', {
      globe: 'A round milk-glass globe.',
      twin: 'A large globe with a smaller one stacked on top.',
      acorn: 'A pointed acorn-shaped glass finial.',
      cap: 'No lamp at all, only a domed metal cap.',
    }),
    metal: choice('What are the caps and fittings made of?', {
      chrome: 'Bright chrome.',
      brass: 'Warm polished brass.',
      enamel: 'White porcelain enamel with a red pinstripe.',
      iron: 'Black painted iron.',
    }),
    sign: choice('If a small sign hangs from it, what does it say?', {
      none: 'There is no sign.',
      barber: 'BARBER',
      open: 'OPEN',
      walkins: 'WALK-INS',
      price: 'CUTS $8',
      fishing: "GONE FISHIN'",
      lease: 'FOR LEASE',
    }),
    height: score('How tall does it stand?', ['Waist-high and stubby', 'Shoulder high', 'Head high', 'Towering over the sidewalk']),
    cylinder: score('How long is the striped glass cylinder?', ['A short fat drum', 'Ordinary', 'A long slender tube']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dead = a.state === 'shuttered';
    const lit = a.state === 'open' || a.state === 'stuttering';
    const wear = Math.min(1, mood.wear + (dead ? 0.35 : 0));
    const metal = {
      chrome: s.material('#dfe4e6', { metalness: 0.9, roughness: 0.18 + wear * 0.4 }),
      brass: s.material('#c79a3e', { metalness: 0.85, roughness: 0.25 + wear * 0.4 }),
      enamel: s.material('#f1eee4', { roughness: 0.3 + wear * 0.4 }),
      iron: s.material('#232326', { roughness: 0.55 }),
    }[a.metal];
    const rust = new THREE.Color('#7a4a2c');
    const ironColour = new THREE.Color(a.pedestal === 'cabinet' ? '#ece8dc' : a.metal === 'brass' ? '#2c3a33' : '#2b2d31').lerp(rust, wear * 0.45);
    const iron = s.material(ironColour, { roughness: 0.6, metalness: a.pedestal === 'cabinet' ? 0 : 0.35 });
    const accent = s.material('#b3242c', { roughness: 0.5 });

    const baseTop = mix(0.55, 1.35, a.height);
    const tubeHeight = mix(0.42, 0.95, a.cylinder);
    const radius = mix(0.14, 0.1, a.cylinder) * mix(0.9, 1.35, a.height);

    // Pedestal.
    if (a.pedestal === 'column') {
      s.lathe([[0, 0], [0.25, 0], [0.25, 0.04], [0.2, 0.07], [0.12, 0.13], [0.085, 0.2], [0.075, baseTop * 0.5], [0.08, baseTop - 0.14], [0.12, baseTop - 0.08], [0.13, baseTop - 0.03], [0.1, baseTop], [0, baseTop]], iron);
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        s.rod([Math.cos(angle) * 0.082, 0.22, Math.sin(angle) * 0.082], [Math.cos(angle) * 0.082, baseTop - 0.16, Math.sin(angle) * 0.082], 0.012, iron);
      }
      s.ring(0.105, 0.014, [0, baseTop * 0.5, 0], metal).rotation.x = Math.PI / 2;
    } else if (a.pedestal === 'cabinet') {
      s.box([0.4, 0.05, 0.4], [0, 0.025, 0], s.material('#26272a'));
      s.box([0.34, baseTop - 0.1, 0.34], [0, 0.05 + (baseTop - 0.1) / 2, 0], iron);
      s.box([0.4, 0.05, 0.4], [0, baseTop - 0.025, 0], metal);
      for (const [x, z, turn] of [[0, 0.172, 0], [0.172, 0, 1], [0, -0.172, 0], [-0.172, 0, 1]] as const) {
        const panel = s.box([0.24, baseTop - 0.28, 0.008], [x, baseTop / 2, z], s.material(new THREE.Color('#d9d4c6').lerp(rust, wear * 0.3)));
        panel.rotation.y = (turn * Math.PI) / 2;
        const stripe = s.box([0.25, 0.018, 0.012], [x, baseTop - 0.17, z], accent);
        stripe.rotation.y = (turn * Math.PI) / 2;
      }
    } else if (a.pedestal === 'tripod') {
      const hub = baseTop * 0.42;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + 0.5;
        const c = Math.cos(angle), n = Math.sin(angle);
        s.tube([[c * 0.03, hub, n * 0.03], [c * 0.16, hub * 0.9, n * 0.16], [c * 0.22, hub * 0.45, n * 0.22], [c * 0.27, 0.05, n * 0.27], [c * 0.33, 0.03, n * 0.33]], 0.022, iron);
        s.ball([0.04, 0.03, 0.04], [c * 0.33, 0.03, n * 0.33], metal, 12);
      }
      s.ball([0.07, 0.07, 0.07], [0, hub, 0], metal, 16);
      s.cylinder(0.035, 0.035, baseTop - hub, [0, (baseTop + hub) / 2, 0], iron, 16);
      s.cylinder(0.11, 0.05, 0.06, [0, baseTop - 0.03, 0], metal, 24);
    } else {
      const tyre = s.ring(0.25, 0.1, [0, 0.1, 0], s.material('#1c1c1d', { roughness: 0.9 }));
      tyre.rotation.x = Math.PI / 2;
      s.cylinder(0.2, 0.2, 0.17, [0, 0.085, 0], s.material('#a9a79d', { roughness: 0.95 }), 20);
      s.cylinder(0.04, 0.04, baseTop - 0.1, [0, 0.1 + (baseTop - 0.1) / 2, 0], iron, 14);
      s.cylinder(0.1, 0.045, 0.05, [0, baseTop - 0.025, 0], iron, 20);
      s.ring(0.045, 0.012, [0, 0.19, 0], iron).rotation.x = Math.PI / 2;
    }

    // Lower cap, striped helix, glass, upper cap.
    const capH = 0.11;
    const y0 = baseTop + capH;
    s.lathe([[0, 0], [radius * 0.85, 0], [radius * 1.25, 0.03], [radius * 1.25, capH - 0.02], [radius * 1.08, capH], [0, capH]], metal, [0, baseTop, 0]);
    const colours = STRIPES[a.stripes];
    const grey = new THREE.Color('#8f8c84');
    const fade = dead ? 0.6 : wear * 0.35;
    const stripeMap = paint(256, 256, (g, w, h) => {
      const band = w / colours.length;
      for (let i = -colours.length * 2; i < colours.length * 3; i++) {
        g.fillStyle = `#${new THREE.Color(colours[((i % colours.length) + colours.length) % colours.length]).lerp(grey, fade).getHexString()}`;
        g.beginPath();
        g.moveTo(i * band, h);
        g.lineTo((i + 1) * band + 1, h);
        g.lineTo((i + 1) * band + w + 1, 0);
        g.lineTo(i * band + w, 0);
        g.fill();
      }
      g.globalAlpha = 0.5;
      for (let i = 0; i < wear * 26; i++) {
        g.fillStyle = random() < 0.5 ? '#5d5346' : '#d8d2c2';
        g.fillRect(random() * w, random() * h, 3 + random() * 14, 6 + random() * 50);
      }
    });
    stripeMap.wrapS = stripeMap.wrapT = THREE.RepeatWrapping;
    stripeMap.repeat.set(1, Math.max(1, Math.round(tubeHeight / (radius * 5))));
    const helix = s.cylinder(radius * 0.8, radius * 0.8, tubeHeight - 0.02, [0, y0 + tubeHeight / 2, 0], new THREE.MeshStandardMaterial({ map: stripeMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: stripeMap, emissiveIntensity: lit ? mix(0.15, 0.4, mood.cheer) : 0 }), 28);
    if (a.state === 'stuttering') helix.rotation.z = 0.06;
    if (dead) {
      helix.rotation.z = 0.11;
      helix.position.y -= 0.02;
    }
    const glass = new THREE.MeshPhysicalMaterial({ color: dead ? '#b9b39f' : '#ffffff', transparent: true, opacity: mix(0.14, 0.34, wear), roughness: 0.05 + wear * 0.5, depthWrite: false });
    s.cylinder(radius, radius, tubeHeight, [0, y0 + tubeHeight / 2, 0], glass, 28);
    if (dead || wear > 0.75) {
      const crack = s.material('#f3f1ea', { roughness: 0.4 });
      let angle = random() * Math.PI * 2, y = y0 + tubeHeight * (0.3 + random() * 0.4);
      for (let i = 0; i < 9; i++) {
        const nextAngle = angle + (random() - 0.5) * 0.7, nextY = Math.min(y0 + tubeHeight, Math.max(y0, y + (random() - 0.4) * 0.14));
        s.rod([Math.cos(angle) * radius, y, Math.sin(angle) * radius], [Math.cos(nextAngle) * radius, nextY, Math.sin(nextAngle) * radius], 0.003, crack);
        angle = nextAngle;
        y = nextY;
      }
    }
    const y1 = y0 + tubeHeight;
    s.lathe([[0, 0], [radius * 1.08, 0], [radius * 1.25, 0.02], [radius * 1.25, capH - 0.03], [radius * 0.7, capH], [0, capH]], metal, [0, y1, 0]);
    if (a.metal === 'enamel') for (const y of [baseTop + capH * 0.5, y1 + capH * 0.4]) s.ring(radius * 1.26, 0.006, [0, y, 0], accent).rotation.x = Math.PI / 2;

    // Crown.
    const warm = new THREE.Color('#dfeaff').lerp(new THREE.Color('#ffd38a'), mood.warmth);
    const glow = lit ? mix(0.55, 1.3, mood.cheer) : 0;
    const milk = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f5f1e4').lerp(new THREE.Color('#a39c8a'), wear * 0.5), roughness: 0.35, emissive: warm, emissiveIntensity: glow });
    const top = y1 + capH;
    const globeR = radius * 1.25;
    if (a.top === 'globe' || a.top === 'twin') {
      s.cylinder(globeR * 0.45, globeR * 0.55, 0.03, [0, top + 0.015, 0], metal, 16);
      s.ball([globeR, globeR, globeR], [0, top + 0.02 + globeR * 0.95, 0], milk, 24);
      if (a.top === 'twin') {
        s.cylinder(globeR * 0.3, globeR * 0.3, 0.02, [0, top + 0.02 + globeR * 1.95, 0], metal, 12);
        s.ball([globeR * 0.55, globeR * 0.55, globeR * 0.55], [0, top + 0.02 + globeR * 2.4, 0], milk, 18);
      } else s.ball([0.018, 0.022, 0.018], [0, top + 0.02 + globeR * 1.97, 0], metal, 10);
    } else if (a.top === 'acorn') {
      s.lathe([[0, 0], [globeR * 0.6, 0], [globeR * 0.95, globeR * 0.5], [globeR * 0.9, globeR * 1.1], [globeR * 0.5, globeR * 1.8], [globeR * 0.12, globeR * 2.3], [0, globeR * 2.45]], milk, [0, top, 0]);
      s.ring(globeR * 0.95, 0.012, [0, top + globeR * 0.5, 0], metal).rotation.x = Math.PI / 2;
    } else {
      s.ball([radius * 0.75, radius * 0.5, radius * 0.75], [0, top - 0.01, 0], metal, 20);
      s.ball([0.022, 0.03, 0.022], [0, top + radius * 0.5, 0], metal, 10);
    }

    // Hanging sign on a little bracket.
    if (a.sign !== 'none') {
      const y = baseTop + capH * 0.5;
      s.rod([radius * 1.2, y, 0], [radius * 1.2 + 0.34, y, 0], 0.008, iron);
      s.rod([radius * 1.2, y - 0.07, 0], [radius * 1.2 + 0.2, y, 0], 0.005, iron);
      const closedText = a.sign === 'lease' || a.sign === 'fishing';
      const board = s.label(SIGNS[a.sign], 0.3, 0.11, [radius * 1.2 + 0.18, y - 0.1, 0], closedText ? '#2a2a2a' : '#f4f0e6', closedText ? '#e9dfc0' : a.stripes === 'black-gold' ? '#1b1a1c' : '#9c1f27');
      board.rotation.z = (random() - 0.5) * (0.06 + wear * 0.3);
      for (const dx of [-0.11, 0.11]) s.rod([radius * 1.2 + 0.18 + dx, y, 0], [radius * 1.2 + 0.18 + dx, y - 0.05, 0], 0.003, iron);
    }

    // Story dressing.
    if (a.state === 'memorial') {
      const wreath = s.ring(0.15, 0.04, [0.02, 0.22, 0.2], s.material('#34603a', { roughness: 0.9 }));
      wreath.rotation.x = -0.35;
      const petals = ['#f4f0e6', '#d83a45', '#e9c34b', '#f4f0e6'];
      const blooms = Array.from({ length: 16 + Math.floor(mood.density * 14) }, (_unused, i) => {
        const onWreath = i < 10;
        const angle = random() * Math.PI * 2, reach = onWreath ? 0.15 : 0.28 + random() * 0.14;
        return { at: onWreath ? [0.02 + Math.cos(angle) * reach, 0.22 + Math.sin(angle) * reach * 0.94, 0.25 - Math.sin(angle) * 0.05] as const : [Math.cos(angle) * reach, 0.03, Math.abs(Math.sin(angle)) * reach + 0.05] as const, size: 0.022 + random() * 0.02, color: petals[i % 4] };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms);
      s.cylinder(0.025, 0.03, 0.12, [-0.24, 0.06, 0.2], s.material('#b23535', { emissive: '#ff9a4a', emissiveIntensity: 0.5 }), 12);
    }
    if (dead) {
      const weeds = s.material('#6f7a45', { roughness: 0.95 });
      for (let i = 0; i < 7; i++) {
        const angle = random() * Math.PI * 2, reach = 0.2 + random() * 0.12;
        s.rod([Math.cos(angle) * reach, 0, Math.sin(angle) * reach], [Math.cos(angle) * (reach + 0.05), 0.12 + random() * 0.2, Math.sin(angle) * (reach + 0.03)], 0.006, weeds, 0.001);
      }
    }

    const speed = a.state === 'open' ? mix(0.12, 0.55, mood.energy) : a.state === 'stuttering' ? 0.08 : 0;
    const flicker = a.state === 'stuttering';
    return s.finish({
      update: (dt, time) => {
        const stall = flicker && Math.sin(time * 1.7) > 0.3;
        if (!stall) stripeMap.offset.x = (stripeMap.offset.x + dt * speed) % 1;
        if (flicker) milk.emissiveIntensity = glow * (Math.sin(time * 23) * Math.sin(time * 7.3) > 0.1 ? 1 : 0.15);
      },
    });
  },
});
