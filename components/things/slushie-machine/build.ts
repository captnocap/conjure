import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const FLAVOURS = {
  cherry: 'Cherry red, the classic.',
  'blue-raspberry': 'Electric blue raspberry that stains the tongue.',
  lime: 'Acid lime green.',
  cola: 'Dark cola brown with a foamy top.',
  grape: 'Deep artificial grape purple.',
  'mystery-white': 'An unlabelled white flavour nobody chooses.',
} as const;
const TINT: Record<keyof typeof FLAVOURS, string> = {
  cherry: '#d8263c', 'blue-raspberry': '#1f8fe8', lime: '#7fd62a', cola: '#5a3320', grape: '#7a35c2', 'mystery-white': '#eef2f4',
};

export default defineThing({
  questions: {
    tanks: choice('How many tanks does the machine have?', {
      one: 'A single lonely tank.',
      two: 'Two tanks side by side, the usual pair.',
      three: 'Three tanks, a full rainbow.',
      four: 'Four tanks, an overstocked wall of sugar.',
    }),
    first: choice('What flavour is in the first tank?', FLAVOURS),
    second: choice('If there is a second tank, what flavour is in it?', FLAVOURS),
    fill: score('How full are the tanks?', ['Scraped nearly empty', 'A third left', 'Half', 'Freshly filled to the brim']),
    housing: choice('What is the body like?', {
      steel: 'Brushed stainless steel, commercial and anonymous.',
      branded: 'Glossy plastic in loud brand colours with a light-up header.',
      retro: 'Rounded cream enamel with chrome trim, from a 1960s soda fountain.',
    }),
    sign: choice('What does the header sign say, if it has one?', {
      slush: 'SLUSH', frozen: 'FROZEN', icy: 'ICY COLD', broken: 'OUT OF ORDER', cheap: '99¢',
    }),
    cups: noul('Is there a stack of cups beside it?'),
    spill: noul('Has some slush dripped and pooled on the tray and counter?'),
    vessel: choice('What shape are the transparent freezing tanks?', {
      square: 'Flat-sided square tanks with broad rectangular lids.',
      barrel: 'Round upright bowls with circular black lids.',
      faceted: 'Octagonal tanks with broad glass facets and matching lids.',
      tapered: 'Wide-topped tapered bowls on narrower stainless collars.',
    }),
    lid: choice('How are the tank lids left?', {
      shut: 'Every lid lies flat, ready for customers.',
      tilted: 'The first lid is hinged upward for a refill.',
      lifted: 'The first lid rests upright against the tank, during cleaning.',
      absent: 'The first lid is missing; the open tank exposes its contents.',
    }),
    controls: choice('How does a customer operate the dispenser?', {
      levers: 'Simple physical levers and small round indicator lamps.',
      keypad: 'A blue digital display above a row of square selection buttons.',
      coin: 'A coin slot, return knob and metal price plate on the cabinet.',
      switches: 'A row of industrial toggle switches with white printed labels.',
    }),
    service: choice('What is happening to the machine right now?', {
      trading: 'The cabinet is closed and serving normally.',
      repair: 'A front service panel is swung open, showing the compressor and tubing.',
      stripped: 'The front panel has been removed, leaving a dark open service bay.',
      tagged: 'A maintenance tag hangs from the first tap and the machine is stopped.',
    }),
    straws: choice('What straw service sits next to the machine?', {
      none: 'No straws or dispenser alongside it.',
      cup: 'A little cylindrical caddy with loose striped straws.',
      wrapped: 'A flat tray of individually wrapped paper straws.',
      dispenser: 'A tall clear dispenser with a domed cap and upright straws inside.',
    }),
    branding: choice('What decorates the broad front cabinet?', {
      plain: 'An unadorned cabinet with a small badge.',
      chevron: 'Large diagonal cream bands like a highway concession stand.',
      bubbles: 'A cluster of bright circular fruit-bubble decals.',
      stripe: 'A wide red horizontal stripe with a smaller cream stripe below.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { one: 1, two: 2, three: 3, four: 4 }[a.tanks];
    const keys = Object.keys(FLAVOURS) as (keyof typeof FLAVOURS)[];
    const flavours = Array.from({ length: count }, (_unused, index) =>
      index === 0 ? a.first : index === 1 ? a.second : keys[Math.floor(random() * keys.length)]);
    const pitch = 0.27;
    const width = count * pitch + 0.08;
    const bodyColour = { steel: '#b9bfc0', branded: mood.cheer > 0.5 ? '#ff5a36' : '#2a4fa8', retro: '#efe6cf' }[a.housing];
    const body = s.material(bodyColour, { metalness: a.housing === 'steel' ? 0.75 : 0.1, roughness: a.housing === 'steel' ? 0.35 : 0.5 });
    const dark = s.material('#22282b', { roughness: 0.6 });
    const chrome = s.material('#dfe4e6', { metalness: 0.9, roughness: 0.2 });
    const clear = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });

    // Base cabinet with vents, feet and a drip tray.
    s.box([width, 0.3, 0.42], [0, 0.17, 0], body);
    if (a.branding === 'stripe') {
      s.box([width * 0.94, 0.055, 0.006], [0, 0.205, 0.214], s.material('#b73536'));
      s.box([width * 0.94, 0.014, 0.006], [0, 0.165, 0.214], s.material('#f5e4b8'));
    } else if (a.branding === 'bubbles') {
      for (let i = 0; i < 5; i++) s.ball([0.025 + i * 0.002, 0.025 + i * 0.002, 0.004], [(i - 2) * width * 0.13, 0.19 + Math.sin(i * 1.7) * 0.035, 0.215], s.material(TINT[flavours[i % count]]), 12);
    } else if (a.branding === 'chevron') {
      for (const side of [-1, 1]) s.box([width * 0.38, 0.035, 0.006], [side * width * 0.18, 0.2, 0.215], s.material('#f5e4b8')).rotation.z = side * 0.25;
    } else s.box([0.06, 0.025, 0.006], [-width * 0.35, 0.25, 0.215], chrome);
    if (a.service === 'repair' || a.service === 'stripped') {
      s.box([width * 0.75, 0.19, 0.008], [0, 0.17, 0.221], dark);
      s.ball([0.07, 0.06, 0.035], [-width * 0.13, 0.14, 0.245], chrome, 12);
      for (let i = 0; i < 4; i++) s.rod([width * 0.03, 0.12 + i * 0.024, 0.24], [width * 0.26, 0.12 + i * 0.024, 0.24], 0.006, s.material('#b9854a'));
      if (a.service === 'repair') {
        const panel = s.box([width * 0.36, 0.2, 0.018], [-width * 0.37, 0.17, 0.295], body);
        panel.rotation.y = -0.9;
      }
    }
    const controlY = 0.282;
    if (a.controls === 'keypad') {
      s.box([width * 0.5, 0.035, 0.012], [0, controlY, 0.222], dark);
      s.label('-4.0 C', Math.min(0.18, width * 0.34), 0.026, [0, controlY, 0.23], '#91e9d9', '#173539');
      for (let i = 0; i < 3; i++) s.box([0.018, 0.018, 0.012], [(i - 1) * 0.027, controlY - 0.035, 0.225], chrome);
    } else if (a.controls === 'coin') {
      s.box([0.075, 0.1, 0.012], [width * 0.3, 0.24, 0.223], chrome);
      s.box([0.007, 0.038, 0.008], [width * 0.3, 0.26, 0.234], dark);
      s.ball([0.012, 0.012, 0.009], [width * 0.3, 0.22, 0.237], dark, 10);
    } else for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * pitch;
      if (a.controls === 'switches') {
        s.box([0.038, 0.038, 0.008], [x, controlY, 0.219], dark);
        s.rod([x, controlY, 0.225], [x, controlY + 0.009, 0.25], 0.005, chrome);
      } else s.ball([0.008, 0.008, 0.006], [x, controlY, 0.223], s.material(a.service === 'tagged' ? '#bf432c' : '#73a44c'), 10);
    }
    for (let i = 0; i < 7; i++) s.box([width * 0.7, 0.008, 0.004], [0, 0.07 + i * 0.022, -0.212], dark);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.02, 0.025, 0.03, [x * (width / 2 - 0.04), 0.015, z * 0.17], dark, 10);
    s.box([width, 0.02, 0.1], [0, 0.07, 0.26], chrome);
    for (let i = 0; i < Math.round(width / 0.02); i++) s.box([0.006, 0.006, 0.09], [-width / 2 + 0.012 + i * 0.02, 0.083, 0.26], dark);

    const paddles: THREE.Object3D[] = [];
    flavours.forEach((flavour, index) => {
      const x = (index - (count - 1) / 2) * pitch;
      const slush = s.material(TINT[flavour], { roughness: 0.35, emissive: TINT[flavour], emissiveIntensity: mix(0.05, 0.3, mood.cheer) });
      const level = mix(0.04, 0.3, a.fill) * mix(0.75, 1, random());
      // Tank: clear walls, a lid, the slush and the auger that churns it.
      const round = a.vessel !== 'square';
      const facets = a.vessel === 'faceted' ? 8 : 24;
      if (round) {
        s.cylinder(0.12, a.vessel === 'tapered' ? 0.085 : 0.12, 0.34, [x, 0.49, 0], clear, facets);
        s.cylinder(a.vessel === 'tapered' ? 0.084 + 0.032 * level / 0.34 : 0.115, a.vessel === 'tapered' ? 0.082 : 0.115, level, [x, 0.325 + level / 2, 0], slush, facets);
      } else {
        s.box([0.23, 0.34, 0.3], [x, 0.49, 0], clear);
        s.box([0.22, level, 0.29], [x, 0.325 + level / 2, 0], slush);
      }
      if (index !== 0 || a.lid !== 'absent') {
        const cap = round ? s.cylinder(0.128, 0.128, 0.03, [x, 0.675, 0], dark, facets) : s.box([0.25, 0.03, 0.32], [x, 0.675, 0], dark);
        if (index === 0 && a.lid === 'tilted') { cap.rotation.x = -0.65; cap.position.y += 0.065; cap.position.z -= 0.025; }
        if (index === 0 && a.lid === 'lifted') { cap.rotation.x = -1.4; cap.position.y -= 0.02; cap.position.z -= 0.13; }
      }
      const auger = new THREE.Group();
      for (let turn = 0; turn < 10; turn++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.085, 0.02), chrome);
        blade.position.set(0, Math.cos(turn * 1.25) * 0.05, -0.12 + turn * 0.027);
        blade.rotation.z = turn * 1.25;
        blade.castShadow = true;
        auger.add(blade);
      }
      auger.position.set(x, 0.4, 0);
      s.root.add(auger);
      paddles.push(auger);
      // Tap: a spout and a lever with a coloured knob.
      s.box([0.05, 0.05, 0.06], [x, 0.33, 0.18], chrome);
      s.cylinder(0.012, 0.016, 0.05, [x, 0.295, 0.2], chrome, 10);
      s.rod([x, 0.35, 0.2], [x, 0.43, 0.25], 0.008, chrome);
      s.ball([0.022, 0.022, 0.022], [x, 0.44, 0.255], s.material(TINT[flavour]), 12);
      if (a.spill) {
        s.cylinder(0.035 + random() * 0.03, 0.04 + random() * 0.03, 0.006, [x + (random() - 0.5) * 0.05, 0.095, 0.26], slush, 14);
        s.rod([x, 0.27, 0.2], [x, 0.2 + random() * 0.04, 0.2], 0.006, slush, 0.003);
      }
    });

    if (a.housing !== 'steel') {
      const lit = a.sign !== 'broken';
      s.box([width, 0.13, 0.1], [0, 0.76, -0.08], body);
      s.label({ slush: 'SLUSH', frozen: 'FROZEN', icy: 'ICY COLD', broken: 'OUT OF ORDER', cheap: '99¢' }[a.sign], width * 0.92, 0.1, [0, 0.76, -0.028], lit ? '#ffffff' : '#30343a', lit ? '#1c2a6b' : '#c9c4b4');
    } else if (a.sign === 'broken') s.label('OUT OF ORDER', 0.2, 0.07, [0, 0.5, 0.152], '#30343a', '#f2ecd8').rotation.z = -0.08;
    if (a.housing === 'retro') s.box([width + 0.01, 0.015, 0.43], [0, 0.325, 0], chrome);

    if (a.cups) {
      const paper = s.material('#f4f1e6');
      const cx = width / 2 + 0.09;
      const stack = 6 + Math.floor(random() * 8);
      for (let i = 0; i < stack; i++) s.cylinder(0.042, 0.03, 0.09, [cx, 0.045 + i * 0.014, 0.05], paper, 14);
      s.cylinder(0.046, 0.046, 0.012, [cx, 0.09 + stack * 0.014, 0.05], s.material(TINT[a.first]), 14);
    }

    if (a.service === 'tagged') {
      const x = -(count - 1) / 2 * pitch;
      s.rod([x, 0.43, 0.25], [x + 0.02, 0.35, 0.28], 0.002, chrome);
      s.label('SERVICE', 0.105, 0.05, [x + 0.02, 0.325, 0.29], '#652a22', '#f1d88d').rotation.z = -0.16;
    }
    if (a.straws !== 'none') {
      const x = -width / 2 - 0.09;
      const paper = s.material('#eee9d7');
      if (a.straws === 'wrapped') {
        s.box([0.13, 0.025, 0.26], [x, 0.014, 0], dark);
        for (let i = 0; i < 7; i++) s.box([0.012, 0.008, 0.22], [x + (i - 3) * 0.016, 0.032, (random() - 0.5) * 0.025], paper);
      } else {
        s.cylinder(0.058, 0.045, a.straws === 'cup' ? 0.1 : 0.22, [x, a.straws === 'cup' ? 0.05 : 0.11, 0], a.straws === 'cup' ? chrome : clear, 20);
        for (let i = 0; i < 9; i++) {
          const theta = i * 2.4, radius = 0.032 * Math.sqrt((i + 1) / 9);
          s.rod([x + Math.cos(theta) * radius, 0.015, Math.sin(theta) * radius], [x + Math.cos(theta) * radius, 0.2 + random() * 0.025, Math.sin(theta) * radius], 0.0035, i % 2 ? paper : s.material('#c34342'));
        }
        if (a.straws === 'dispenser') s.ball([0.06, 0.035, 0.06], [x, 0.235, 0], chrome, 16);
      }
    }

    const speed = a.service === 'trading' ? mix(0.3, 2.4, mood.energy) : 0;
    return s.finish({ update: (dt) => { for (const paddle of paddles) paddle.rotation.z += dt * speed; } });
  },
});
