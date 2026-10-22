import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const SCHEMES = {
  seaside: 'Sky-blue and white deckchair stripes.',
  rock: 'Pillar-box red and cream, like a stick of rock.',
  icecream: 'Mint green and strawberry pink.',
  sunny: 'Custard yellow and navy.',
  creosote: 'Plain creosoted brown boards with dark green trim.',
} as const;
const PAIRS: Record<keyof typeof SCHEMES, [string, string, string]> = {
  seaside: ['#3a8fd0', '#f4efe2', '#1f5f9a'],
  rock: ['#d2302a', '#f1e6c8', '#8f1f1c'],
  icecream: ['#8fd0b8', '#f3a7c0', '#3f8f78'],
  sunny: ['#f2c230', '#f7efd2', '#263a66'],
  creosote: ['#5f4433', '#57402f', '#2f7a4a'],
};
const NAMES = { crazy: 'CRAZY GOLF', adventure: 'ADVENTURE GOLF', pirate: 'PIRATE PUTT', mini: 'MINI GOLF', tickets: 'TICKETS' } as const;
const PRIZES = { game: 'A FREE GAME', rock: 'A STICK OF ROCK', goldfish: 'A GOLDFISH', teddy: 'A GIANT TEDDY', cone: 'A FREE 99' } as const;
const PRICES = {
  pence: ['50p', 'A ROUND'],
  standard: ['ADULT £4', 'CHILD £2.50'],
  family: ['FAMILY', 'OF 4 £12'],
  dollars: ['$5', 'ALL DAY'],
  struck: ['£3', '£4.50', 'NO REFUNDS'],
} as const;

export default defineThing({
  questions: {
    scheme: choice('What is the colour scheme?', SCHEMES),
    hatch: choice('What state is the hatch in?', {
      open: 'Slid wide open on a dark interior, ready to take your money.',
      ajar: 'Half open, somebody is in there but not keen.',
      sign: 'Shut, with a BACK IN 5 MINS card hung on it.',
      boarded: 'Boarded over for the winter with rough planks nailed across.',
    }),
    prize: choice('What prize is advertised for a hole in one?', {
      game: 'A free game, on a pink ticket.',
      rock: 'A stick of seaside rock from the jar.',
      goldfish: 'A goldfish in a bag.',
      teddy: 'A giant teddy bear that nobody has ever won.',
      cone: 'A free 99 ice cream with a flake.',
    }),
    prices: choice('What does the price board say?', {
      pence: '50p a round, a price from decades ago.',
      standard: 'Adult and child prices, ordinary and fair.',
      family: 'A family ticket deal.',
      dollars: 'Five dollars all day, boardwalk style.',
      struck: 'An old price crossed out and a higher one painted beside it, no refunds.',
    }),
    name: choice('What is painted on the name board?', {
      crazy: 'CRAZY GOLF', adventure: 'ADVENTURE GOLF', pirate: 'PIRATE PUTT', mini: 'MINI GOLF', tickets: 'TICKETS',
    }),
    roof: choice('What kind of roof does it have?', {
      gable: 'A simple pitched felt roof.',
      pyramid: 'A pointed pavilion roof with a ball finial and a little flag.',
      flat: 'A flat lid with a tall sign board standing on top.',
      leanto: 'A single slope like a garden shed.',
    }),
    outside: choice('What stands outside it?', {
      nothing: 'Nothing.',
      aboard: 'A folding A-board on the pavement.',
      bin: 'A litter bin overflowing with chip papers.',
      lifebuoy: 'A red and white lifebuoy propped by the hatch.',
      putters: 'A bucket of putters by the hatch.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [stripeA, stripeB, trimHex] = PAIRS[a.scheme];
    const W = 1.9, D = 1.5, H = 2.1, front = D / 2;
    const texture = (width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const board = (lines: readonly string[], w: number, h: number, at: P3, ink: string, paper: string, strike = false) => {
      const map = texture(256, Math.max(48, Math.round(256 * h / w)), (c) => {
        const ch = c.canvas.height;
        c.fillStyle = paper; c.fillRect(0, 0, 256, ch);
        c.strokeStyle = ink; c.lineWidth = 6; c.strokeRect(5, 5, 246, ch - 10);
        c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.globalAlpha = 1 - mood.wear * 0.4;
        const rowH = (ch - 16) / lines.length;
        lines.forEach((line, i) => {
          const size = Math.min(rowH * 0.78, 235 / Math.max(line.length, 2) * 1.55);
          c.font = `bold ${size}px sans-serif`;
          const y = 8 + rowH * (i + 0.5);
          c.save(); c.translate(128, y); c.rotate((random() - 0.5) * 0.05); c.fillText(line, 0, 0, 236);
          if (strike && i === 0) { c.lineWidth = 7; c.strokeStyle = '#c21f1a'; c.beginPath(); c.moveTo(-70, size * 0.2); c.lineTo(70, -size * 0.2); c.stroke(); }
          c.restore();
        });
      });
      return s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide }), at);
    };

    const walls = new THREE.MeshStandardMaterial({
      roughness: 0.7 + mood.wear * 0.25,
      map: texture(256, 256, (c) => {
        for (let i = 0; i < 12; i++) {
          c.fillStyle = i % 2 ? stripeB : stripeA;
          c.fillRect(i * 256 / 12, 0, 256 / 12 + 1, 256);
          c.fillStyle = 'rgba(0,0,0,0.18)';
          c.fillRect(i * 256 / 12, 0, 2, 256);
        }
        for (let i = 0; i < Math.round(mood.wear * 60); i++) {
          c.fillStyle = random() < 0.5 ? 'rgba(150,145,130,0.75)' : 'rgba(110,86,60,0.55)';
          const y = random() < 0.6 ? 170 + random() * 86 : random() * 256;
          c.fillRect(random() * 256, y, 3 + random() * 9, 6 + random() * 30);
        }
        c.fillStyle = `rgba(90,80,60,${mood.wear * 0.35})`;
        c.fillRect(0, 226, 256, 30);
      }),
    });
    const trim = s.material(trimHex, { roughness: 0.6 });
    const pale = s.material('#f4efe2', { roughness: 0.6 });
    const dark = s.material('#15181b', { roughness: 0.95 });
    const raw = s.material('#b89466', { roughness: 0.95 });
    const steel = s.material('#9aa1a3', { metalness: 0.6, roughness: 0.4 });

    s.box([W + 0.3, 0.1, D + 0.3], [0, 0.05, 0], s.material('#b9b5a8', { roughness: 1 }));
    s.box([W, H, D], [0, 0.1 + H / 2, 0], walls);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.09, H, 0.09], [x * W / 2, 0.1 + H / 2, z * D / 2], trim);
    s.box([W + 0.06, 0.12, D + 0.06], [0, 0.16, 0], trim);

    // Hatch opening, frame, counter and the sliding shutter on its rail.
    const ox = 0.32, ow = 0.86, oy = 1.42, oh = 0.72;
    s.box([ow, oh, 0.04], [ox, oy, front + 0.005], dark);
    for (const side of [-1, 1]) s.box([0.07, oh + 0.14, 0.06], [ox + side * (ow / 2 + 0.035), oy, front + 0.03], trim);
    s.box([1.75, 0.06, 0.07], [0, oy + oh / 2 + 0.05, front + 0.05], steel);
    s.box([1.75, 0.05, 0.05], [0, oy - oh / 2 - 0.02, front + 0.04], trim);
    s.box([ow + 0.3, 0.05, 0.34], [ox, oy - oh / 2 - 0.02, front + 0.19], pale);
    for (const side of [-1, 1]) { const bracket = s.box([0.04, 0.3, 0.04], [ox + side * 0.42, oy - oh / 2 - 0.16, front + 0.13], trim); bracket.rotation.x = 0.75; }
    const slide = { open: -ow + 0.03, ajar: -ow * (0.35 + random() * 0.25), sign: 0, boarded: 0 }[a.hatch];
    const sx = ox + slide;
    s.box([ow + 0.04, oh + 0.04, 0.035], [sx, oy, front + 0.055], pale);
    for (const dy of [-0.2, 0.2]) s.box([ow + 0.04, 0.05, 0.02], [sx, oy + dy, front + 0.08], trim);
    s.box([0.03, 0.14, 0.04], [sx + ow / 2 - 0.08, oy, front + 0.09], steel);
    if (a.hatch === 'open' || a.hatch === 'ajar') {
      // A glimpse of the inside: a shelf, a mug, a bare bulb.
      s.box([ow - 0.06, 0.03, 0.02], [ox, oy + 0.1, front + 0.03], s.material('#3a3028'));
      s.cylinder(0.035, 0.03, 0.07, [ox + 0.25, oy + 0.15, front + 0.035], s.material('#e9e2d0'), 10);
      s.ball([0.04, 0.05, 0.04], [ox + 0.05, oy + 0.27, front + 0.03], s.material('#ffe9a0', { emissive: '#ffd060', emissiveIntensity: 1.2 }), 10);
    }
    if (a.hatch === 'sign') {
      const card = board(['BACK IN', '5 MINS'], 0.5, 0.3, [sx, oy - 0.02, front + 0.1], '#22262a', '#f6f1df');
      card.rotation.z = (random() - 0.5) * 0.25;
      s.rod([sx - 0.2, oy + 0.12, front + 0.095], [sx, oy + 0.33, front + 0.095], 0.004, dark);
      s.rod([sx + 0.2, oy + 0.12, front + 0.095], [sx, oy + 0.33, front + 0.095], 0.004, dark);
    }
    if (a.hatch === 'boarded') {
      for (const [dy, turn, len] of [[0.2, 0.08, 1.2], [-0.12, -0.06, 1.25], [0, 0.62, 1.3], [0.02, -0.66, 1.25]] as const) {
        const plank = s.box([len, 0.13, 0.03], [ox + (random() - 0.5) * 0.06, oy + dy, front + 0.1 + Math.abs(turn) * 0.04], raw);
        plank.rotation.z = turn + (random() - 0.5) * 0.08;
      }
      const closed = board(['CLOSED', 'SEE YOU AT EASTER'], 0.62, 0.26, [ox, oy - 0.02, front + 0.15], '#c21f1a', '#f6f1df');
      closed.rotation.z = (random() - 0.5) * 0.12;
    }

    // Ticket roll with a trailing strip.
    if (a.hatch !== 'boarded') {
      const ticket = s.material(mood.cheer > 0.5 ? '#f08ab0' : '#f2c860', { roughness: 0.9 });
      const tx = ox - 0.36;
      s.cylinder(0.085, 0.085, 0.06, [tx, oy - oh / 2 + 0.09, front + 0.2], ticket, 20).rotation.z = Math.PI / 2;
      s.cylinder(0.02, 0.02, 0.065, [tx, oy - oh / 2 + 0.09, front + 0.2], dark, 10).rotation.z = Math.PI / 2;
      s.box([0.06, 0.004, 0.2], [tx, oy - oh / 2 + 0.008, front + 0.28], ticket);
      const tail = 0.12 + random() * 0.3 * (0.4 + mood.energy);
      s.box([0.06, tail, 0.004], [tx + (random() - 0.5) * 0.02, oy - oh / 2 - tail / 2, front + 0.365], ticket).rotation.z = (random() - 0.5) * 0.3;
    }

    // Prize board under the counter and price board on the side wall.
    const prize = board(['HOLE IN ONE WINS', PRIZES[a.prize]], 1.5, 0.58, [0, 0.62, front + 0.02], trimHex === '#263a66' ? '#263a66' : '#c21f1a', '#f7f0d6');
    prize.rotation.z = (random() - 0.5) * 0.04 * (1 + mood.wear * 2);
    s.box([1.56, 0.64, 0.03], [0, 0.62, front], trim);
    const prices = board(PRICES[a.prices], 0.95, 0.85, [W / 2 + 0.03, 1.3, 0], '#1d2733', a.prices === 'pence' ? '#e6dcb8' : '#f6f1df', a.prices === 'struck');
    prices.rotation.y = Math.PI / 2;
    prices.rotation.z = 0;
    s.box([0.03, 0.93, 1.03], [W / 2 + 0.005, 1.3, 0], trim);

    // Roof and name board.
    const felt = s.material(a.scheme === 'creosote' ? '#3a4a44' : '#4a4e55', { roughness: 1 });
    const top = 0.1 + H;
    let nameAt: P3 = [0, top - 0.17, front + 0.07], nameW = 1.7, nameH = 0.26, eaveY = top - 0.02, eaveZ = front + 0.24;
    if (a.roof === 'gable') {
      const shape = new THREE.Shape();
      shape.moveTo(-D / 2 - 0.22, 0); shape.lineTo(0, 0.5); shape.lineTo(D / 2 + 0.22, 0); shape.lineTo(D / 2 + 0.22, -0.06); shape.lineTo(-D / 2 - 0.22, -0.06); shape.closePath();
      const roof = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: W + 0.3, bevelEnabled: false }), felt, [-(W + 0.3) / 2, top + 0.03, 0]);
      roof.rotation.y = Math.PI / 2;
      eaveZ = front + 0.24;
    } else if (a.roof === 'pyramid') {
      const roof = s.mesh(new THREE.ConeGeometry(1, 0.7, 4), felt, [0, top + 0.35, 0]);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((W + 0.44) / 1.414, 1, (D + 0.44) / 1.414);
      s.ball([0.08, 0.08, 0.08], [0, top + 0.73, 0], s.material('#e3b23a', { metalness: 0.5 }), 12);
      s.rod([0, top + 0.75, 0], [0, top + 1.3, 0], 0.012, steel);
      s.label(' ', 0.34, 0.2, [0.17, top + 1.18, 0], stripeA, stripeA);
      s.box([W + 0.44, 0.06, D + 0.44], [0, top, 0], trim);
      eaveZ = front + 0.23;
    } else if (a.roof === 'flat') {
      s.box([W + 0.4, 0.1, D + 0.4], [0, top + 0.05, 0], felt);
      s.box([W + 0.44, 0.07, D + 0.44], [0, top + 0.02, 0], trim);
      for (const x of [-0.75, 0.75]) s.rod([x, top + 0.1, front - 0.1], [x, top + 0.75, front - 0.1], 0.03, raw);
      nameAt = [0, top + 0.5, front - 0.05]; nameW = 1.95; nameH = 0.56;
      eaveZ = front + 0.22;
    } else {
      const roof = s.box([W + 0.3, 0.07, D + 0.4], [0, top + 0.17, 0], felt);
      roof.rotation.x = 0.2;
      s.box([W, 0.34, D * 0.5], [0, top + 0.1, -D * 0.25], trim);
      eaveY = top; eaveZ = front + 0.2;
    }
    if (a.roof !== 'flat') nameAt = [0, eaveY + 0.19, eaveZ + 0.02];
    eaveY -= a.roof === 'flat' ? 0 : 0.02;
    s.box([nameW + 0.08, nameH + 0.08, 0.03], [nameAt[0], nameAt[1], nameAt[2] - 0.01], trim);
    board([NAMES[a.name]], nameW, nameH, [nameAt[0], nameAt[1], nameAt[2] + 0.01], a.scheme === 'creosote' ? '#2f7a4a' : trimHex, '#f7f0d6');

    // Bulbs strung along the front eave.
    const glow = mix(0.35, 1.5, Math.abs(mood.daylight - 0.5) * 2) * mix(0.6, 1, mood.cheer);
    const colours = mood.cheer > 0.35 ? ['#ff4a3a', '#ffd23a', '#3ad27a', '#3a9aff', '#ff7ad0'] : ['#ffe2a0', '#fff0c8'];
    const wire: P3[] = [];
    const bulbs: THREE.MeshStandardMaterial[] = [];
    const count = 11, half = W / 2 + 0.16;
    for (let i = 0; i <= count; i++) {
      const u = i / count, x = mix(-half, half, u), sag = Math.abs(Math.sin(u * Math.PI * 3)) * 0.07;
      wire.push([x, eaveY - sag, eaveZ + 0.03]);
      if (i === 0 || i === count) continue;
      const dead = random() < mood.wear * 0.5;
      const hex = colours[i % colours.length];
      const lamp = new THREE.MeshStandardMaterial({ color: dead ? '#5a5a58' : hex, emissive: dead ? '#000000' : hex, emissiveIntensity: glow, roughness: 0.4 });
      if (!dead) bulbs.push(lamp);
      s.ball([0.05, 0.065, 0.05], [x, eaveY - sag - 0.07, eaveZ + 0.03], lamp, 10);
    }
    s.tube(wire, 0.008, dark);

    // The prize itself, on show.
    const px = -0.66, pz = front + 0.24;
    if (a.prize === 'teddy') {
      const fur = s.material('#b98a4e', { roughness: 1 }), snout = s.material('#ead8b0', { roughness: 1 });
      s.rod([px, eaveY - 0.05, pz], [px, 1.78, pz], 0.006, dark);
      s.ball([0.19, 0.22, 0.16], [px, 1.3, pz], fur, 14);
      s.ball([0.15, 0.14, 0.14], [px, 1.62, pz], fur, 14);
      s.ball([0.07, 0.055, 0.05], [px, 1.59, pz + 0.12], snout, 10);
      for (const side of [-1, 1]) {
        s.ball([0.055, 0.055, 0.03], [px + side * 0.12, 1.74, pz], fur, 8);
        s.ball([0.07, 0.11, 0.07], [px + side * 0.22, 1.36, pz + 0.03], fur, 10).rotation.z = side * 0.7;
        s.ball([0.08, 0.12, 0.08], [px + side * 0.13, 1.08, pz + 0.05], fur, 10);
        s.ball([0.018, 0.018, 0.018], [px + side * 0.055, 1.65, pz + 0.125], dark, 6);
      }
    } else if (a.prize === 'goldfish') {
      for (const dx of [0, 0.22]) {
        const drop = 1.56 + random() * 0.12;
        s.rod([px + dx, eaveY - 0.05, pz], [px + dx, drop + 0.1, pz], 0.005, dark);
        s.ball([0.085, 0.11, 0.085], [px + dx, drop, pz], new THREE.MeshStandardMaterial({ color: '#cfeaf2', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }), 12);
        s.ball([0.04, 0.025, 0.02], [px + dx, drop - 0.03, pz], s.material('#ff7a1a', { emissive: '#c2410c', emissiveIntensity: 0.4 }), 8).rotation.y = random() * 3;
      }
    } else if (a.prize === 'rock') {
      const jarX = ox + 0.3, jarY = oy - oh / 2 + 0.005;
      for (let i = 0; i < 7; i++) {
        const lean = (random() - 0.5) * 0.09, dx = (random() - 0.5) * 0.08;
        s.rod([jarX + dx, jarY, front + 0.22], [jarX + dx + lean, jarY + 0.28 + random() * 0.06, front + 0.22 + (random() - 0.5) * 0.06], 0.017, s.material(i % 2 ? '#f08ab0' : '#f6f1e6'));
      }
      s.cylinder(0.075, 0.075, 0.16, [jarX, jarY + 0.08, front + 0.22], new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), 14);
    } else if (a.prize === 'cone') {
      s.box([0.05, 0.05, 0.22], [px, 1.2, front + 0.12], trim);
      s.mesh(new THREE.ConeGeometry(0.11, 0.36, 12).rotateX(Math.PI), s.material('#d9a45a'), [px, 1.38, pz]);
      s.ball([0.13, 0.11, 0.13], [px, 1.59, pz], s.material('#fbf5e4', { roughness: 0.5 }), 12);
      s.ball([0.09, 0.1, 0.09], [px, 1.7, pz], s.material('#fbf5e4', { roughness: 0.5 }), 12);
      s.rod([px + 0.03, 1.66, pz + 0.03], [px + 0.12, 1.86, pz + 0.05], 0.02, s.material('#5a3320'));
    } else {
      const strip = s.material('#f08ab0', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) s.box([0.12, 0.2, 0.004], [px - 0.1 + i * 0.07, 1.42 - i * 0.03, front + 0.1 + i * 0.004], strip).rotation.z = (random() - 0.5) * 0.4;
    }

    // Outside.
    if (a.outside === 'aboard') {
      const text = a.hatch === 'boarded' ? ['CLOSED'] : a.hatch === 'sign' ? ['BACK', 'SOON'] : ['OPEN', 'PLAY HERE'];
      for (const side of [-1, 1]) {
        const face = board(text, 0.5, 0.75, [-0.55, 0.42, front + 0.95 + side * 0.13], '#f6f1df', '#22303a');
        face.rotation.x = side * -0.3;
        if (side < 0) face.rotation.y = Math.PI;
      }
      s.box([0.54, 0.03, 0.06], [-0.55, 0.8, front + 0.95], raw);
    } else if (a.outside === 'bin') {
      const bx = -0.75, bz = front + 0.75;
      s.cylinder(0.2, 0.17, 0.62, [bx, 0.41, bz], s.material('#2f5f4a', { roughness: 0.6 }), 16);
      s.ring(0.2, 0.02, [bx, 0.72, bz], dark).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4 + Math.round(mood.density * 6); i++) {
        const far = i > 3;
        const scrap = s.box([0.12, 0.08, 0.1], [bx + (random() - 0.5) * (far ? 0.8 : 0.25), far ? 0.14 : 0.74 + random() * 0.08, bz + (random() - 0.5) * (far ? 0.6 : 0.25)], s.material(['#f1ead8', '#e8e0c8', '#d8322b', '#f6f2e6'][Math.floor(random() * 4)], { roughness: 1 }));
        scrap.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    } else if (a.outside === 'lifebuoy') {
      const buoy = new THREE.Group();
      buoy.position.set(-W / 2 + 0.2, 0.55, front + 0.1);
      s.root.add(buoy);
      buoy.add(s.ring(0.25, 0.075, [0, 0, 0], s.material('#f6f1e6')));
      for (let i = 0; i < 4; i++) {
        const band = s.ring(0.25, 0.08, [0, 0, 0], s.material('#d2302a'), 0.55);
        band.rotation.z = i * Math.PI / 2 + 0.5;
        buoy.add(band);
      }
      buoy.rotation.x = -0.12;
    } else if (a.outside === 'putters') {
      const bx = -0.7, bz = front + 0.5;
      s.cylinder(0.19, 0.15, 0.36, [bx, 0.28, bz], s.material('#a9afb0', { metalness: 0.7, roughness: 0.4 }), 16);
      for (let i = 0; i < 5; i++) {
        const lean = (random() - 0.5) * 0.3, back = (random() - 0.5) * 0.24;
        const tip: P3 = [bx + lean, 0.95 + random() * 0.3, bz + back];
        s.rod([bx + lean * 0.2, 0.2, bz + back * 0.2], tip, 0.012, steel);
        s.rod([bx + lean * 0.75, 0.2 + (tip[1] - 0.2) * 0.72, bz + back * 0.75], tip, 0.024, s.material(['#d8322b', '#f2b90f', '#2c6fd0', '#22262a'][Math.floor(random() * 4)]));
      }
    }

    const speed = mix(0.4, 6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        bulbs.forEach((lamp, i) => { lamp.emissiveIntensity = glow * (0.7 + 0.3 * Math.sin(time * speed + i * 2.1)); });
      },
    });
  },
});
