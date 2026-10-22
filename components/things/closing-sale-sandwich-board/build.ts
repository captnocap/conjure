import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const MESSAGES = {
  closing: ['CLOSING', 'DOWN', 'SALE'],
  everything: ['EVERYTHING', 'MUST', 'GO!'],
  thanks: ['THANK YOU', 'FOR 20', 'YEARS'],
  lastday: ['LAST', 'DAY', 'TODAY'],
  tolet: ['TO LET', 'SHOP +', 'FLAT'],
  half: ['50% OFF', 'ALL', 'STOCK'],
  open: ['YES!', 'WE ARE', 'OPEN'],
} as const;
const SUBS = {
  none: '', fixtures: 'FIXTURES FOR SALE', final: 'ALL SALES FINAL', inside: 'ASK INSIDE',
  offers: 'NO OFFER REFUSED', cash: 'CASH ONLY', missyou: "WE'LL MISS YOU",
} as const;
const ACCENTS = { red: '#d3312b', blue: '#2456a6', green: '#2f7d4f', yellow: '#f2c12e', pink: '#ee4f9b', black: '#23262a' } as const;

type Rand = () => number;

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** One line of lettering, each glyph nudged so it reads as written by hand. */
function handLine(c: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxWidth: number, maxSize: number, family: string, wobble: number, random: Rand) {
  let size = maxSize;
  c.font = `bold ${size}px ${family}`;
  const measured = c.measureText(text).width;
  if (measured > maxWidth) size *= maxWidth / measured;
  c.font = `bold ${size}px ${family}`;
  const total = c.measureText(text).width;
  let x = cx - total / 2;
  c.textAlign = 'left'; c.textBaseline = 'middle';
  for (const glyph of text) {
    const advance = c.measureText(glyph).width;
    c.save();
    c.translate(x + advance / 2, cy + (random() - 0.5) * size * 0.14 * wobble);
    c.rotate((random() - 0.5) * 0.16 * wobble);
    const squash = 1 + (random() - 0.5) * 0.2 * wobble;
    c.scale(1, squash);
    c.fillText(glyph, -advance / 2, 0);
    c.restore();
    x += advance;
  }
  return size;
}

export default defineThing({
  questions: {
    message: choice('What does the board announce?', {
      closing: 'CLOSING DOWN SALE: the plain bad news.',
      everything: 'EVERYTHING MUST GO! Urgent, a little desperate.',
      thanks: 'THANK YOU FOR 20 YEARS: a gracious goodbye to regulars.',
      lastday: 'LAST DAY TODAY: the very end, tonight the shutters come down.',
      tolet: 'TO LET, SHOP + FLAT: the shop is already gone and the agent has moved in.',
      half: '50% OFF ALL STOCK: a sale, cheerful or ominous.',
      open: 'YES! WE ARE OPEN: still trading, stubbornly hopeful.',
    }),
    sub: choice('What smaller line is added underneath?', {
      none: 'Nothing more.',
      fixtures: 'FIXTURES FOR SALE: even the shelves are going.',
      final: 'ALL SALES FINAL.',
      inside: 'ASK INSIDE.',
      offers: 'NO OFFER REFUSED.',
      cash: 'CASH ONLY.',
      missyou: "WE'LL MISS YOU.",
    }),
    style: choice('How is the message made?', {
      chalk: 'Chalk on a blackboard, smudged and rewritten.',
      painted: 'Brush-painted signwriting on a cream board with a coloured border.',
      printed: 'A crisp printed poster with a solid colour band, corporate and final.',
      dayglo: 'Thick marker on a fluorescent starburst card taped to the board.',
      stencil: 'Sprayed stencil letters on bare plywood.',
    }),
    frame: choice('What is the A-frame built from?', {
      timber: 'Two hinged plywood boards on timber legs, home-made.',
      steel: 'A welded steel tube frame with a sheet panel, the kind a pub owns.',
      plastic: 'A chunky moulded plastic swing sign with a carry handle.',
    }),
    accent: choice('What is its accent colour?', {
      red: 'Sale red.', blue: 'Shopfront blue.', green: 'Grocer green.', yellow: 'Warning yellow.', pink: 'Hot pink.', black: 'Black, sober.',
    }),
    attached: choice('What has been tied or hung on it?', {
      nothing: 'Nothing, just the sign.',
      balloons: 'A few balloons on strings, trying to make it a party.',
      sandbag: 'A sandbag slung over the brace to hold it down.',
      arrow: 'A cardboard arrow tacked on top pointing at the door.',
      flowers: 'A bunch of flowers left at its foot by a regular.',
    }),
    state: choice('How is it standing right now?', {
      standing: 'Squarely on the pavement, doing its job.',
      splayed: 'Legs slid too far apart, chain snapped, sagging low.',
      toppled: 'Blown over flat on its back, message to the sky.',
    }),
    amended: noul('Has an older message been struck through or a note pasted over a corner?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const accent: string = ACCENTS[a.accent];
    const W = 0.62, L = 1.08;
    const half = a.state === 'splayed' ? 0.52 : a.state === 'toppled' ? 0.03 : 0.3;
    const theta = Math.asin(half / L);
    const thick = a.frame === 'plastic' ? 0.05 : 0.02;

    const face = (side: number) => paint(512, 800, (c) => {
      const hand = '"Comic Sans MS", "Marker Felt", "Chalkboard SE", "DejaVu Sans", sans-serif';
      const block = 'Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
      const lines = MESSAGES[a.message];
      let ink = '#1d1d1f', ink2: string = accent, family = hand, wobble = 1;
      if (a.style === 'chalk') {
        c.fillStyle = '#262b2c'; c.fillRect(0, 0, 512, 800);
        for (let i = 0; i < 26; i++) {
          c.fillStyle = `rgba(230,232,226,${0.02 + random() * 0.05})`;
          c.beginPath(); c.ellipse(random() * 512, random() * 800, 40 + random() * 120, 20 + random() * 50, random() * 3, 0, 7); c.fill();
        }
        ink = '#f3f1e8'; ink2 = a.accent === 'black' ? '#ffe37a' : new THREE.Color(accent).lerp(new THREE.Color('#ffffff'), 0.45).getStyle();
      } else if (a.style === 'painted') {
        c.fillStyle = '#f2e8cd'; c.fillRect(0, 0, 512, 800);
        c.strokeStyle = accent; c.lineWidth = 16; c.strokeRect(20, 20, 472, 760);
        c.lineWidth = 3; c.strokeRect(40, 40, 432, 720);
        wobble = 0.5; family = 'Georgia, "DejaVu Serif", serif';
      } else if (a.style === 'printed') {
        c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, 512, 800);
        c.fillStyle = accent; c.fillRect(0, 0, 512, 250); c.fillRect(0, 740, 512, 60);
        wobble = 0; family = block;
      } else if (a.style === 'dayglo') {
        c.fillStyle = '#e9e2cf'; c.fillRect(0, 0, 512, 800);
        const glow = a.accent === 'pink' ? '#ff5fb0' : a.accent === 'green' ? '#a6f23a' : a.accent === 'blue' ? '#5fe0ff' : a.accent === 'red' ? '#ff7a3a' : '#f9f02a';
        c.fillStyle = glow; c.beginPath();
        for (let i = 0; i < 40; i++) {
          const r = i % 2 ? 0.86 : 1.02, t = i / 40 * Math.PI * 2;
          c.lineTo(256 + Math.cos(t) * 250 * r, 400 + Math.sin(t) * 380 * r);
        }
        c.fill();
        c.fillStyle = 'rgba(210,200,170,0.85)';
        for (const [x, y] of [[40, 40], [472, 40], [40, 760], [472, 760]]) { c.save(); c.translate(x, y); c.rotate(random() * 3); c.fillRect(-34, -12, 68, 24); c.restore(); }
        ink2 = '#1d1d1f';
      } else {
        c.fillStyle = '#c9a56d'; c.fillRect(0, 0, 512, 800);
        for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(110,75,35,${0.05 + random() * 0.12})`; c.lineWidth = 1 + random() * 3; c.beginPath(); const y = random() * 800; c.moveTo(0, y); c.bezierCurveTo(170, y + random() * 30 - 15, 340, y + random() * 30 - 15, 512, y + random() * 20 - 10); c.stroke(); }
        ink = accent === '#f2c12e' ? '#1d1d1f' : accent; ink2 = '#1d1d1f'; wobble = 0.15; family = '"Courier New", "DejaVu Sans Mono", monospace';
      }
      // The older message, struck through, sits behind and above the new one.
      if (a.amended) {
        c.save(); c.globalAlpha = a.style === 'chalk' ? 0.35 : 0.5; c.fillStyle = ink;
        const old = side > 0 ? 'OPEN 9 - 6' : 'SALE NOW ON';
        handLine(c, old, 256, 76, 380, 50, family, wobble, random);
        c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.moveTo(70, 84); c.lineTo(445, 66); c.stroke();
        c.restore();
      }
      const top = a.style === 'printed' ? 60 : a.amended ? 130 : 80;
      const bottom = a.sub === 'none' ? 730 : 640;
      const step = (bottom - top) / lines.length;
      lines.forEach((line, index) => {
        const y = top + step * (index + 0.5);
        if (a.style === 'printed') c.fillStyle = y < 250 ? '#ffffff' : index === lines.length - 1 && a.accent !== 'yellow' ? accent : '#1d1d1f';
        else c.fillStyle = index === 0 || lines.length < 3 ? ink : index === 1 ? ink2 : ink;
        const size = handLine(c, line, 256, y, a.style === 'dayglo' ? 360 : 420, step * 0.92, family, wobble, random);
        if (a.style === 'chalk' && index === lines.length - 1) {
          c.strokeStyle = ink2; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath();
          c.moveTo(90, y + size * 0.55); c.quadraticCurveTo(256, y + size * 0.55 + 16, 422, y + size * 0.5); c.stroke();
        }
      });
      if (a.sub !== 'none') {
        c.fillStyle = a.style === 'printed' ? '#1d1d1f' : ink;
        handLine(c, SUBS[a.sub], 256, 692, a.style === 'dayglo' ? 300 : 410, 46, family, wobble, random);
      }
      if (a.amended && a.style !== 'chalk') {
        c.save(); c.translate(400, 610); c.rotate(-0.2); c.fillStyle = '#fff36b'; c.fillRect(-70, -34, 140, 68);
        c.fillStyle = '#c3221c'; handLine(c, 'FINAL', 0, -12, 120, 30, hand, 1, random); handLine(c, 'WEEK', 0, 16, 120, 30, hand, 1, random); c.restore();
      }
      // Weather: runs, grime rising from the pavement, chips.
      const wear = mood.wear;
      for (let i = 0; i < wear * 40; i++) {
        const x = random() * 512, y = random() * 500;
        c.strokeStyle = a.style === 'chalk' ? `rgba(38,43,44,${0.25 + random() * 0.3})` : `rgba(90,80,62,${0.08 + random() * 0.14})`;
        c.lineWidth = 2 + random() * 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + random() * 10 - 5, y + 60 + random() * 260); c.stroke();
      }
      const grime = c.createLinearGradient(0, 520, 0, 800);
      grime.addColorStop(0, 'rgba(70,62,50,0)'); grime.addColorStop(1, `rgba(70,62,50,${wear * 0.55})`);
      c.fillStyle = grime; c.fillRect(0, 0, 512, 800);
    });

    const frameColour = { timber: '#b98d55', steel: a.accent === 'black' ? '#2b2e31' : '#30343a', plastic: a.accent === 'yellow' ? '#f0c730' : '#f1efe8' }[a.frame];
    const frameMat = s.material(frameColour, { metalness: a.frame === 'steel' ? 0.6 : 0, roughness: a.frame === 'plastic' ? 0.45 : 0.7 });
    const dark = s.material('#2a2c2e', { metalness: 0.5 });
    const rig = new THREE.Group();
    s.root.add(rig);

    for (const side of [1, -1]) {
      const leaf = new THREE.Group();
      leaf.position.set(0, 0, 0);
      leaf.rotation.x = -side * theta;
      rig.add(leaf);
      const add = (mesh: THREE.Mesh) => { leaf.add(mesh); return mesh; };
      const posterMat = new THREE.MeshStandardMaterial({ map: face(side), roughness: a.style === 'printed' ? 0.5 : 0.9 });
      const z = side * (thick / 2 + 0.003);
      if (a.frame === 'timber') {
        add(s.box([W, L * 0.84, thick], [0, -L * 0.44, 0], frameMat));
        for (const x of [-1, 1]) add(s.box([0.045, L, 0.035], [x * (W / 2 - 0.022), -L / 2, -side * 0.012], s.material('#8f6a3c')));
        const poster = add(s.mesh(new THREE.PlaneGeometry(W * 0.9, L * 0.8), posterMat, [0, -L * 0.44, z]));
        if (side < 0) poster.rotation.y = Math.PI;
      } else if (a.frame === 'steel') {
        for (const x of [-1, 1]) add(s.rod([x * W / 2, 0, 0], [x * W / 2, -L, 0], 0.014, frameMat));
        add(s.rod([-W / 2, -0.01, 0], [W / 2, -0.01, 0], 0.014, frameMat));
        add(s.rod([-W / 2, -L * 0.86, 0], [W / 2, -L * 0.86, 0], 0.012, frameMat));
        add(s.box([W * 0.95, L * 0.8, 0.012], [0, -L * 0.44, 0], s.material('#e9e6dc')));
        const poster = add(s.mesh(new THREE.PlaneGeometry(W * 0.9, L * 0.77), posterMat, [0, -L * 0.44, side * 0.01]));
        if (side < 0) poster.rotation.y = Math.PI;
      } else {
        add(s.box([W, L * 0.93, thick], [0, -L * 0.5, 0], frameMat));
        add(s.box([W * 1.06, 0.07, thick * 1.5], [0, -L * 0.985, 0], frameMat));
        add(s.box([0.2, 0.035, thick * 1.2], [0, -0.01, 0], frameMat));
        add(s.box([W * 0.92, L * 0.8, 0.006], [0, -L * 0.5, side * thick / 2], s.material(accent)));
        const poster = add(s.mesh(new THREE.PlaneGeometry(W * 0.86, L * 0.76), posterMat, [0, -L * 0.5, side * (thick / 2 + 0.006)]));
        if (side < 0) poster.rotation.y = Math.PI;
      }
    }
    // Hinges and the stay that stops it doing the splits.
    for (const x of [-1, 1]) { const hinge = s.cylinder(0.014, 0.014, 0.07, [x * W * 0.3, 0, 0], dark, 10); hinge.rotation.z = Math.PI / 2; rig.add(hinge); }
    const stayY = -L * 0.62 * Math.cos(theta), stayZ = L * 0.62 * Math.sin(theta);
    if (a.state === 'standing') {
      for (const x of [-1, 1]) rig.add(s.rod([x * (W / 2 + 0.005), stayY, -stayZ], [x * (W / 2 + 0.005), stayY - 0.012, stayZ], 0.006, dark));
    } else if (a.state === 'splayed') {
      for (const x of [-1, 1]) rig.add(s.tube([[x * (W / 2 + 0.005), stayY, stayZ], [x * (W / 2 + 0.02), stayY - 0.12, stayZ - 0.02], [x * (W / 2 + 0.03), stayY - 0.22, stayZ - 0.05 - random() * 0.05]], 0.005, dark));
    }

    const height = L * Math.cos(theta);
    const bobbers: { node: THREE.Object3D; phase: number; reach: number }[] = [];
    if (a.state === 'toppled') {
      rig.rotation.x = -Math.PI / 2 + 0.04;
      rig.rotation.z = (random() - 0.5) * 0.5;
      rig.position.set(0, 0.06, -L / 2);
    } else {
      rig.position.y = height;
      rig.rotation.y = (random() - 0.5) * 0.12;
    }

    if (a.attached === 'balloons') {
      const count = 2 + Math.round(mood.density * 2 + random());
      const limp = mood.cheer < 0.3 || a.state === 'toppled';
      const hues = ['#e8382f', '#f6c829', '#2f7fe0', '#ee4f9b', '#3cb563', '#ff8a2a'];
      for (let i = 0; i < count; i++) {
        const colour = new THREE.Color(hues[Math.floor(random() * hues.length)]).lerp(new THREE.Color('#9a968c'), (1 - mood.cheer) * 0.5);
        const anchor: [number, number, number] = a.state === 'toppled' ? [0.2, 0.05, 0] : [(random() - 0.5) * 0.3, height, 0];
        const float = new THREE.Group();
        const reach = limp ? 0.25 + random() * 0.2 : 0.5 + random() * 0.45;
        const lean = (random() - 0.5) * 0.9;
        const tip: [number, number, number] = limp
          ? [anchor[0] + W / 2 + 0.1 + random() * 0.25, 0.09, anchor[2] + (random() - 0.5) * 0.5]
          : [anchor[0] + lean * reach, anchor[1] + reach, anchor[2] + (random() - 0.5) * 0.3];
        s.root.add(float);
        float.position.set(...anchor);
        const string = s.rod([0, 0, 0], [tip[0] - anchor[0], tip[1] - anchor[1], tip[2] - anchor[2]], 0.0025, s.material('#e8e4da'));
        const shrink = limp ? 0.6 : 1;
        const balloon = s.ball([0.11 * shrink, 0.135 * shrink, 0.11 * shrink], [tip[0] - anchor[0], tip[1] - anchor[1] + (limp ? 0 : 0.12), tip[2] - anchor[2]], s.material(colour, { roughness: limp ? 0.8 : 0.25 }), 16);
        float.add(string, balloon);
        if (!limp) bobbers.push({ node: float, phase: random() * 6, reach });
      }
    } else if (a.attached === 'sandbag' && a.state !== 'toppled') {
      const sack = s.material('#b9a47a', { roughness: 0.95 });
      const y = Math.max(0.07, height * 0.36);
      s.ball([0.2, 0.07, 0.11], [0.03, y, 0], sack, 14);
      s.ball([0.07, 0.13, 0.1], [0.03, y - 0.08, 0.12], sack, 12);
      s.ball([0.07, 0.13, 0.1], [0.03, y - 0.08, -0.12], sack, 12);
      s.rod([-W / 2, y - 0.02, 0], [W / 2, y - 0.02, 0], 0.01, dark);
    } else if (a.attached === 'sandbag') {
      s.ball([0.2, 0.07, 0.13], [W / 2 + 0.22, 0.06, -0.2 + random() * 0.3], s.material('#b9a47a', { roughness: 0.95 }), 14);
    } else if (a.attached === 'arrow') {
      const shape = new THREE.Shape();
      const points: [number, number][] = [[-0.3, -0.05], [0.08, -0.05], [0.08, -0.12], [0.3, 0], [0.08, 0.12], [0.08, 0.05], [-0.3, 0.05]];
      points.forEach(([x, y], index) => (index ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const arrow = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }), s.material(a.accent === 'yellow' ? '#d3312b' : '#f6d53a'));
      if (a.state === 'toppled') { arrow.rotation.x = -Math.PI / 2; arrow.position.set(0.25, 0.012, 0.35); arrow.rotation.z = random() * 3; }
      else { arrow.position.set(0, height + 0.12, -0.004); arrow.rotation.z = (random() - 0.5) * 0.3 + (random() < 0.5 ? Math.PI : 0); s.rod([0, height - 0.02, 0], [0, height + 0.1, 0], 0.008, s.material('#8f6a3c')); }
    } else if (a.attached === 'flowers') {
      const fx = W / 2 + 0.08, fz = a.state === 'toppled' ? 0.2 : half + 0.1;
      const wrap = s.cylinder(0.075, 0.02, 0.3, [fx, 0.06, fz], s.material('#e9e4d6', { side: THREE.DoubleSide }), 10);
      wrap.rotation.set(Math.PI / 2 - 0.18, 0, 0.5);
      const blooms = ['#f2d43a', '#e8477a', '#f4f1ea', '#e2692f'];
      for (let i = 0; i < 7; i++) s.ball([0.032, 0.028, 0.032], [fx - 0.07 + (random() - 0.5) * 0.1, 0.1 + random() * 0.05, fz + 0.14 + (random() - 0.5) * 0.08], s.material(blooms[i % 4]), 8);
      for (let i = 0; i < 5; i++) s.ball([0.03, 0.012, 0.045], [fx - 0.07 + (random() - 0.5) * 0.14, 0.09, fz + 0.11 + (random() - 0.5) * 0.1], s.material('#3f7d43'), 6);
    }

    // Litter gathers round a sign nobody moves any more.
    const leaves = Math.round(mood.wear * mood.density * 9);
    for (let i = 0; i < leaves; i++) {
      const leaf = s.box([0.06 + random() * 0.05, 0.003, 0.04 + random() * 0.04], [(random() - 0.5) * 1.0, 0.004 + i * 0.0005, (random() - 0.5) * 1.0], s.material(random() < 0.5 ? '#a8713a' : '#ded8c6'));
      leaf.rotation.y = random() * 3;
    }

    const sway = mix(0.02, 0.12, mood.energy);
    return s.finish({
      footprint: Math.max(W / 2 + 0.05, a.state === 'toppled' ? 0.6 : half + 0.05),
      update: bobbers.length ? (_dt, time) => {
        for (const b of bobbers) { b.node.rotation.z = Math.sin(time * 1.3 + b.phase) * sway; b.node.rotation.x = Math.cos(time * 0.9 + b.phase) * sway * 0.6; }
      } : undefined,
    });
  },
});
