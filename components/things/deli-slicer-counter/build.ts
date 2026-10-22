import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const MENUS = {
  bodega: 'A New York bodega grill menu: bacon egg and cheese, chopped cheese, heroes, coffee regular.',
  tortas: 'A Mexican tortería board: milanesa, jamón, quesadillas, jugos, prices in pesos.',
  italian: 'An old Italian salumeria list: prosciutto, mortadella, meatball parm, chicken cutlet.',
  halal: 'A halal grill list: chicken over rice, lamb gyro, falafel, beef patties, chai.',
  breakfast: 'Breakfast only: egg on a roll, buttered roll, bagels, coffee light and sweet.',
  specials: 'Mostly empty felt with one or two specials and a lot of missing letters.',
} as const;
const LINES: Record<keyof typeof MENUS, { head: string; rows: [string, string][] }> = {
  bodega: { head: 'DELI * GRILL', rows: [['BACON EGG & CHEESE', '4.50'], ['CHOPPED CHEESE', '7.00'], ['TURKEY HERO', '8.50'], ['PASTRAMI ON RYE', '9.00'], ['COFFEE REGULAR', '1.25']] },
  tortas: { head: 'TORTAS Y JUGOS', rows: [['TORTA MILANESA', '$85'], ['TORTA DE JAMON', '$60'], ['QUESADILLA', '$35'], ['JUGO NATURAL', '$25'], ['CAFE DE OLLA', '$15']] },
  italian: { head: 'SALUMERIA', rows: [['ITALIAN COMBO', '11.00'], ['PROSCIUTTO & MOZZ', '12.50'], ['MEATBALL PARM', '9.50'], ['CHICKEN CUTLET', '9.00'], ['MORTADELLA LB', '8.99']] },
  halal: { head: 'HALAL GRILL', rows: [['CHICKEN OVER RICE', '8.00'], ['LAMB GYRO', '7.50'], ['FALAFEL WRAP', '6.00'], ['BEEF PATTY', '3.00'], ['CHAI', '1.50']] },
  breakfast: { head: 'BREAKFAST ALL DAY', rows: [['EGG ON A ROLL', '3.00'], ['SAUSAGE EGG CHEESE', '4.75'], ['BUTTERED ROLL', '1.50'], ['BAGEL CREAM CHEESE', '2.75'], ['COFFEE LIGHT SWEET', '1.25']] },
  specials: { head: 'TODAY', rows: [['SOUP', '4.00'], ['', ''], ['HERO SPECIAL', '6.99'], ['', ''], ['NO CREDIT', '']] },
};

export default defineThing({
  questions: {
    menu: choice('What is on the letter-board menu above the case?', MENUS),
    board: choice('What kind of menu board is it?', {
      felt: 'Black grooved felt in an oak frame with white push-in letters.',
      red: 'Faded red felt with yellowed letters, older than the owner.',
      lightbox: 'A backlit yellow lightbox with black slide-in letters and a red header.',
    }),
    stock: score('How full is the glass case?', ['Sold down to a few stubs and empty trays', 'Half picked over', 'Well stocked', 'Packed full first thing in the morning']),
    body: choice('What is the case built like?', {
      steel: 'Brushed stainless steel, commercial and cold.',
      enamel: 'Cream enamel with a red stripe, a 1960s butcher case.',
      wood: 'Dark wood slats under the glass, an old family shop.',
      painted: 'Hand-painted in a loud colour by the owner.',
    }),
    slicer: choice('What is the slicer doing?', {
      clean: 'Wiped down and idle, blade gleaming.',
      slicing: 'Mid-order: a ham on the carriage and a fan of slices on paper.',
      towel: 'Covered with a striped towel, closed for the night.',
    }),
    sandwich: choice('Is a wrapped sandwich waiting on the counter, and for whom?', {
      none: 'Nothing is waiting.',
      regular: 'One wrapped sandwich with a regular\'s first name in marker.',
      credit: 'One wrapped sandwich marked to pay on Friday.',
      forgotten: 'A cold sandwich with a ticket number nobody came back for.',
      rush: 'A row of wrapped orders with ticket numbers, the lunch rush.',
    }),
    griddle: choice('Is there a flat-top griddle at the end of the case?', {
      none: 'No griddle, cold cuts only.',
      cold: 'A scraped-clean griddle, switched off.',
      breakfast: 'Eggs and bacon steaming on the hot plate.',
      chopped: 'A mound of chopped beef and onions under melting cheese, steam rising.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.8, D = 0.8, back = -D / 2, TOP = 1.255;
    const steel = s.material('#c3c9ca', { metalness: 0.8, roughness: 0.32 });
    const chrome = s.material('#e8ecee', { metalness: 0.95, roughness: 0.14 });
    const dark = s.material('#22262a');
    const white = s.material('#f2efe5');
    const paper = s.material('#fbf8ee', { roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: '#dff2f0', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const loud = new THREE.Color().setHSL(mix(0.58, 0.02, mood.warmth), 0.62, mix(0.32, 0.5, mood.cheer));
    const front = s.material({ steel: '#c3c9ca', enamel: '#ede6d0', wood: '#6f4a2e', painted: loud }[a.body] as THREE.ColorRepresentation, a.body === 'steel' ? { metalness: 0.8, roughness: 0.32 } : { roughness: 0.6 });

    // Lower body.
    s.box([W - 0.06, 0.06, D - 0.08], [0, 0.03, 0], dark);
    s.box([W, 0.5, D], [0, 0.31, 0], front);
    if (a.body === 'enamel') s.box([W + 0.004, 0.07, D + 0.004], [0, 0.42, 0], s.material('#b3302a'));
    if (a.body === 'wood') for (let i = 0; i < 15; i++) s.box([0.012, 0.46, 0.01], [-W / 2 + 0.06 + i * (W - 0.12) / 14, 0.31, D / 2 + 0.004], s.material('#3f2817'));
    if (a.body === 'painted') s.label({ bodega: 'COLD CUTS', tortas: 'RICAS TORTAS', italian: 'FORMAGGI', halal: 'HALAL', breakfast: 'HOT COFFEE', specials: 'DELI' }[a.menu], W * 0.7, 0.22, [0, 0.31, D / 2 + 0.006], '#fff3c4', `#${loud.getHexString()}`);
    if (a.body === 'steel') for (let i = 0; i < 6; i++) s.box([W * 0.5, 0.008, 0.004], [W * 0.2, 0.14 + i * 0.03, D / 2 + 0.002], dark);

    // Display well, back wall, riser, top and glass.
    s.box([W - 0.04, 0.02, D - 0.04], [0, 0.57, 0], white);
    s.box([W, 0.7, 0.03], [0, 0.9, back + 0.015], steel);
    s.box([W - 0.06, 0.13, 0.28], [0, 0.645, back + 0.17], white);
    s.box([W + 0.02, 0.035, 0.47], [0, TOP - 0.0175, back + 0.235], steel);
    s.box([W - 0.1, 0.02, 0.04], [0, TOP - 0.05, back + 0.42], s.material('#fff6d8', { emissive: new THREE.Color().setHSL(mix(0.55, 0.1, mood.warmth), 0.7, 0.7), emissiveIntensity: mix(0.3, 1.1, mood.cheer) }));
    const dz = 0.35, dy = TOP - 0.035 - 0.56, len = Math.hypot(dz, dy), tilt = -Math.atan2(dz, dy);
    const pane = s.box([W, len, 0.012], [0, 0.56 + dy / 2, D / 2 - dz / 2], glass);
    pane.rotation.x = tilt;
    pane.castShadow = false;
    const side = new THREE.Shape();
    side.moveTo(-D / 2, 0.56); side.lineTo(D / 2, 0.56); side.lineTo(D / 2, TOP - 0.035); side.lineTo(D / 2 - 0.45, TOP - 0.035); side.closePath();
    for (const x of [-1, 1]) {
      const end = s.mesh(new THREE.ExtrudeGeometry(side, { depth: 0.012, bevelEnabled: false }), glass, [x * (W / 2) - 0.006, 0, 0]);
      end.rotation.y = Math.PI / 2;
      end.castShadow = false;
      s.rod([x * W / 2, 0.56, D / 2], [x * W / 2, TOP - 0.035, D / 2 - dz], 0.012, chrome);
    }
    s.rod([-W / 2, 0.57, D / 2], [W / 2, 0.57, D / 2], 0.014, chrome);
    s.rod([-W / 2, TOP - 0.03, D / 2 - dz], [W / 2, TOP - 0.03, D / 2 - dz], 0.012, chrome);
    if (mood.wear > 0.6) {
      const tape = s.box([0.5, 0.045, 0.004], [W * 0.18, 0.56 + dy * 0.55, D / 2 - dz * 0.55 + 0.012], s.material('#b89b62'));
      tape.rotation.set(tilt, 0, 0.5);
    }

    // The stock: logs, loaves, blocks and wheels on trays, with price flags.
    const meat = ['#7d2a22', '#d98a90', '#e6aaa2', '#d8b88e', '#a3352c', '#8c4a36'];
    const cheese = ['#f0a02e', '#f3df8c', '#f4edd2', '#f7c94a'];
    const cols = 7, pitch = (W - 0.16) / cols;
    const flagTexture = paint(64, 40, (g, w, h) => { g.fillStyle = '#fffbe8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3241c'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8.99', w / 2, h / 2 + 2); });
    const flag = new THREE.MeshStandardMaterial({ map: flagTexture, side: THREE.DoubleSide });
    for (let row = 0; row < 2; row++) for (let i = 0; i < cols; i++) {
      const x = (i - (cols - 1) / 2) * pitch, z = row === 0 ? 0.17 : back + 0.17, y = row === 0 ? 0.582 : 0.712;
      const trayLength = row === 0 ? 0.3 : 0.24;
      s.box([pitch - 0.03, 0.012, trayLength], [x, y, z], steel);
      if (random() > mix(0.14, 1.05, a.stock)) continue;
      const f = mix(0.3, 1, a.stock) * mix(0.65, 1, random());
      const kind = Math.floor(random() * 6), L = trayLength * 0.9 * f, y0 = y + 0.006;
      if (kind < 3) {
        const r = [0.045, 0.075, 0.09][kind], colour = meat[Math.floor(random() * meat.length)];
        const log = s.cylinder(r, r, L, [x, y0 + r * 0.85, z - (trayLength * 0.9 - L) / 2], s.material(colour), 18);
        log.rotation.x = Math.PI / 2;
        log.scale.z = 0.85;
        const face = s.cylinder(r * 0.86, r * 0.86, 0.004, [x, y0 + r * 0.85, z - (trayLength * 0.9 - L) / 2 + L / 2 + 0.002], s.material(new THREE.Color(colour).lerp(new THREE.Color('#ffd9cf'), 0.45)), 18);
        face.rotation.x = Math.PI / 2;
        face.scale.z = 0.85;
      } else if (kind < 5) {
        s.box([pitch * 0.62, 0.09, L], [x, y0 + 0.045, z - (trayLength * 0.9 - L) / 2], s.material(cheese[Math.floor(random() * cheese.length)], { roughness: 0.45 }));
      } else {
        const wheel = s.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24, 1, false, 0, Math.PI * 2 * mix(0.35, 0.95, f)), s.material(cheese[Math.floor(random() * cheese.length)], { roughness: 0.45 }), [x, y0 + 0.04, z]);
        wheel.rotation.y = random() * 6;
      }
      if (random() < 0.7) {
        s.rod([x + pitch * 0.3, y0, z + trayLength * 0.4], [x + pitch * 0.3, y0 + 0.12, z + trayLength * 0.4], 0.003, dark);
        s.mesh(new THREE.PlaneGeometry(0.075, 0.045), flag, [x + pitch * 0.3, y0 + 0.13, z + trayLength * 0.4 + 0.002]);
      }
    }

    // Scale.
    const scaleX = -0.66, topZ = back + 0.22;
    s.box([0.26, 0.07, 0.28], [scaleX, TOP + 0.035, topZ], white);
    s.cylinder(0.125, 0.11, 0.014, [scaleX, TOP + 0.085, topZ + 0.01], steel, 24);
    s.rod([scaleX, TOP + 0.07, topZ - 0.12], [scaleX, TOP + 0.2, topZ - 0.12], 0.012, steel);
    s.box([0.2, 0.075, 0.04], [scaleX, TOP + 0.215, topZ - 0.12], dark);
    const weight = (0.2 + random() * 1.6).toFixed(2);
    const readout = s.mesh(new THREE.PlaneGeometry(0.18, 0.055), new THREE.MeshStandardMaterial({
      map: paint(256, 80, (g, w, h) => { g.fillStyle = '#06140c'; g.fillRect(0, 0, w, h); g.fillStyle = '#5dff8e'; g.font = 'bold 54px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${weight} LB`, w / 2, h / 2 + 3); }),
      emissive: '#3fe070', emissiveIntensity: 0.5,
    }), [scaleX, TOP + 0.215, topZ - 0.099]);
    readout.castShadow = false;
    if (a.stock > 0.35) {
      s.box([0.2, 0.004, 0.2], [scaleX, TOP + 0.094, topZ + 0.01], paper).rotation.y = random();
      for (let i = 0; i < 5; i++) s.cylinder(0.06, 0.06, 0.006, [scaleX + (random() - 0.5) * 0.03, TOP + 0.1 + i * 0.006, topZ + 0.01 + (random() - 0.5) * 0.03], s.material(meat[1 + (i % 2)]), 16);
    }

    // Paper roll on a cutter stand, a sheet pulled forward.
    const rollX = -0.26;
    for (const x of [-0.18, 0.18]) s.box([0.02, 0.17, 0.14], [rollX + x, TOP + 0.085, topZ - 0.05], steel);
    const roll = s.cylinder(0.07, 0.07, 0.32, [rollX, TOP + 0.11, topZ - 0.05], paper, 20);
    roll.rotation.z = Math.PI / 2;
    s.box([0.34, 0.012, 0.02], [rollX, TOP + 0.03, topZ + 0.04], steel);
    s.box([0.3, 0.003, 0.2], [rollX, TOP + 0.005, topZ + 0.12], paper);

    // Slicer.
    const sx = 0.56, sz = topZ - 0.02;
    s.box([0.42, 0.06, 0.32], [sx, TOP + 0.03, sz], steel);
    s.ball([0.11, 0.12, 0.14], [sx - 0.1, TOP + 0.16, sz - 0.03], steel);
    const blade = s.cylinder(0.145, 0.145, 0.012, [sx + 0.02, TOP + 0.21, sz], chrome, 36);
    blade.rotation.z = Math.PI / 2;
    const hub = s.cylinder(0.035, 0.035, 0.02, [sx + 0.02, TOP + 0.21, sz], dark, 12);
    hub.rotation.z = Math.PI / 2;
    const guard = s.ring(0.15, 0.014, [sx + 0.01, TOP + 0.21, sz], steel, Math.PI);
    guard.rotation.y = Math.PI / 2;
    s.box([0.17, 0.02, 0.22], [sx + 0.14, TOP + 0.09, sz + 0.02], steel);
    s.box([0.016, 0.15, 0.22], [sx + 0.22, TOP + 0.155, sz + 0.02], steel);
    s.rod([sx + 0.22, TOP + 0.2, sz + 0.1], [sx + 0.27, TOP + 0.27, sz + 0.14], 0.01, steel);
    s.ball([0.026, 0.026, 0.026], [sx + 0.275, TOP + 0.28, sz + 0.145], dark, 12);
    s.cylinder(0.03, 0.03, 0.03, [sx - 0.12, TOP + 0.06, sz + 0.16], dark, 14).rotation.x = Math.PI / 2;
    if (a.slicer === 'slicing') {
      const ham = s.cylinder(0.065, 0.065, 0.15, [sx + 0.125, TOP + 0.165, sz + 0.02], s.material('#d98a90'), 18);
      ham.rotation.z = Math.PI / 2;
      s.box([0.2, 0.003, 0.16], [sx - 0.09, TOP + 0.062, sz + 0.2], paper).rotation.y = 0.2;
      for (let i = 0; i < 7; i++) s.cylinder(0.06, 0.06, 0.004, [sx - 0.15 + i * 0.022, TOP + 0.066 + i * 0.003, sz + 0.2], s.material('#e39aa0'), 16);
    } else if (a.slicer === 'towel') {
      const stripes = paint(64, 64, (g, w, h) => { g.fillStyle = '#f1ede0'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a66a8'; for (let i = 0; i < 4; i++) g.fillRect(0, 6 + i * 16, w, 5); });
      const cloth = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.95 });
      s.box([0.36, 0.02, 0.34], [sx + 0.02, TOP + 0.365, sz], cloth);
      s.box([0.02, 0.26, 0.34], [sx - 0.17, TOP + 0.24, sz], cloth);
      s.box([0.02, 0.2, 0.34], [sx + 0.21, TOP + 0.27, sz], cloth);
      s.box([0.36, 0.22, 0.02], [sx + 0.02, TOP + 0.26, sz + 0.17], cloth);
    }

    // Wrapped sandwiches with a ticket.
    const wrap = (x: number, z: number, text: string, cold: boolean) => {
      const turn = (random() - 0.5) * 0.5;
      const body = s.cylinder(0.05, 0.05, 0.22, [x, TOP + 0.04, z], s.material(cold ? '#d9d6ca' : '#fbf8ee', { roughness: 0.9 }), 6);
      body.rotation.set(0, turn, Math.PI / 2);
      body.scale.x = 0.8;
      const ticket = s.label(text, 0.19, 0.075, [x, TOP + 0.125, z - 0.01], cold ? '#55606a' : '#1b2d7a', cold ? '#e3ddc9' : '#fff7c9');
      ticket.rotation.set(-0.25, turn, (random() - 0.5) * 0.2);
    };
    const names = ['MANNY', 'ROSA', 'DEVON', 'ABUELA', 'TITO', 'MRS. K'];
    const name = names[Math.floor(random() * names.length)];
    const waitX = 0.12, waitZ = back + 0.36;
    if (a.sandwich === 'regular') wrap(waitX, waitZ, name, false);
    if (a.sandwich === 'credit') wrap(waitX, waitZ, `${name} PAY FRI`, false);
    if (a.sandwich === 'forgotten') wrap(waitX, waitZ, `#${10 + Math.floor(random() * 80)} ??`, true);
    if (a.sandwich === 'rush') {
      const first = 20 + Math.floor(random() * 60);
      for (let i = 0; i < 3; i++) wrap(waitX - 0.02 + (i - 1) * 0.02, back + 0.4 - i * 0.13, `#${first + i}`, false);
      wrap(rollX, topZ + 0.12, `#${first + 3}`, false);
    }

    // Counter clutter by density: tip cup, pickle jar, napkins.
    if (mood.density > 0.3) {
      s.cylinder(0.04, 0.032, 0.09, [W / 2 - 0.08, TOP + 0.045, back + 0.4], s.material('#3d6fb5'), 14);
      s.label('TIPS', 0.06, 0.03, [W / 2 - 0.08, TOP + 0.05, back + 0.441], '#ffffff', '#3d6fb5');
    }
    if (mood.density > 0.55) {
      s.cylinder(0.065, 0.065, 0.2, [-W / 2 + 0.09, TOP + 0.1, back + 0.38], new THREE.MeshStandardMaterial({ color: '#a9c46a', roughness: 0.2, transparent: true, opacity: 0.85 }), 16);
      s.cylinder(0.068, 0.068, 0.025, [-W / 2 + 0.09, TOP + 0.21, back + 0.38], s.material('#c93b2e'), 16);
    }

    // Letter board on two posts, with a rail of hanging salami and provolone.
    const boardY = 2.02, boardW = W - 0.08, boardH = 0.62, boardZ = back + 0.07;
    for (const x of [-1, 1]) s.rod([x * (W / 2 - 0.06), TOP, back + 0.05], [x * (W / 2 - 0.06), boardY + 0.2, back + 0.05], 0.018, steel);
    const lightbox = a.board === 'lightbox';
    const ground = { felt: '#16181a', red: '#6d1f1c', lightbox: '#f6d85a' }[a.board];
    const ink = { felt: '#f4f2ea', red: '#ecdfae', lightbox: '#17171a' }[a.board];
    const menu = LINES[a.menu];
    const drop = mix(0.0, 0.16, mood.wear * mood.wear) + (a.menu === 'specials' ? 0.18 : 0);
    const menuTexture = paint(1024, Math.round(1024 * boardH / boardW), (g, w, h) => {
      g.fillStyle = ground;
      g.fillRect(0, 0, w, h);
      if (!lightbox) { g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2; for (let y = 4; y < h; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
      else { g.fillStyle = '#c12a22'; g.fillRect(0, 0, w, h * 0.22); }
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      const letters = (text: string, x: number, y: number, size: number, colour: string) => {
        g.font = `bold ${size}px monospace`;
        const step = size * 0.62;
        for (const [index, char] of [...text].entries()) {
          const gone = random() < drop, crooked = random() < mood.wear * 0.3;
          if (gone || char === ' ') continue;
          g.save();
          g.translate(x + index * step + step / 2, y + (crooked ? size * 0.12 : 0));
          g.rotate(crooked ? (random() - 0.5) * 0.6 : 0);
          g.fillStyle = colour;
          g.fillText(char, 0, 0);
          g.restore();
        }
      };
      letters(menu.head, (w - menu.head.length * 62 * 0.62) / 2, h * 0.12, 62, lightbox ? '#fff6d0' : ink);
      menu.rows.forEach(([item, price], index) => {
        const y = h * (0.32 + index * 0.14);
        letters(item, 40, y, 46, ink);
        letters(price, w - 40 - price.length * 46 * 0.62, y, 46, lightbox ? '#c12a22' : ink);
      });
    });
    s.box([boardW + 0.06, boardH + 0.06, 0.05], [0, boardY, boardZ], s.material(lightbox ? '#2a2c30' : '#9a6a3a'));
    const face = s.mesh(new THREE.PlaneGeometry(boardW, boardH), new THREE.MeshStandardMaterial({ map: menuTexture, roughness: 0.9, emissive: lightbox ? '#ffffff' : '#000000', emissiveMap: lightbox ? menuTexture : null, emissiveIntensity: lightbox ? mix(0.35, 0.8, mood.cheer) : 0 }), [0, boardY, boardZ + 0.027]);
    face.castShadow = false;

    const railY = boardY - boardH / 2 - 0.07, railZ = back + 0.16;
    s.rod([-W / 2 + 0.06, railY, railZ], [W / 2 - 0.06, railY, railZ], 0.008, steel);
    for (const x of [-1, 1]) s.rod([x * (W / 2 - 0.06), railY, back + 0.05], [x * (W / 2 - 0.06), railY, railZ], 0.008, steel);
    const hanging = Math.round(mix(1, 9, mood.density) * mix(0.4, 1, a.stock));
    for (let i = 0; i < hanging; i++) {
      const x = mix(-W / 2 + 0.14, 0.3, (i + random() * 0.6) / Math.max(hanging, 1)), drop2 = 0.04 + random() * 0.03;
      s.rod([x, railY, railZ], [x, railY - drop2, railZ], 0.002, dark);
      if (a.menu === 'italian' && i % 3 === 2 || random() < 0.2) {
        s.ball([0.045, 0.065, 0.045], [x, railY - drop2 - 0.06, railZ], s.material('#f1dfa6', { roughness: 0.4 }), 14);
        s.ball([0.02, 0.02, 0.02], [x, railY - drop2 - 0.005, railZ], s.material('#f1dfa6'), 8);
      } else {
        const length = 0.1 + random() * 0.07;
        s.cylinder(0.022, 0.022, length, [x, railY - drop2 - length / 2, railZ], s.material(meat[[0, 4, 5][i % 3]]), 10);
      }
    }

    // Flat-top griddle at the left end.
    const puffs: THREE.Mesh[] = [];
    if (a.griddle !== 'none') {
      const gx = -W / 2 - 0.34, plateY = 0.93;
      s.box([0.6, 0.06, D - 0.12], [gx, 0.03, 0], dark);
      s.box([0.64, 0.84, D - 0.04], [gx, 0.48, 0], steel);
      s.box([0.6, 0.045, D - 0.14], [gx, plateY - 0.02, -0.02], s.material('#2c2b2a', { metalness: 0.5, roughness: 0.5 }));
      s.box([0.64, 0.32, 0.02], [gx, plateY + 0.14, back + 0.03], steel);
      s.box([0.6, 0.04, 0.06], [gx, 0.87, D / 2 - 0.04], steel);
      for (const x of [-0.15, 0.15]) s.cylinder(0.03, 0.03, 0.03, [gx + x, 0.72, D / 2 - 0.01], s.material('#b3302a'), 14).rotation.x = Math.PI / 2;
      if (a.griddle === 'cold') {
        s.box([0.12, 0.012, 0.09], [gx + 0.1, plateY + 0.01, 0.12], steel).rotation.y = 0.4;
        s.rod([gx + 0.15, plateY + 0.02, 0.15], [gx + 0.24, plateY + 0.05, 0.25], 0.012, dark);
      } else {
        if (a.griddle === 'breakfast') {
          for (let i = 0; i < 2 + Math.floor(random() * 2); i++) {
            const x = gx - 0.16 + i * 0.15 + random() * 0.03, z = -0.12 + random() * 0.1;
            s.ball([0.06 + random() * 0.015, 0.006, 0.055], [x, plateY + 0.006, z], white, 14);
            s.ball([0.022, 0.014, 0.022], [x + 0.008, plateY + 0.014, z], s.material('#f2b21c', { roughness: 0.3 }), 12);
          }
          for (let i = 0; i < 4; i++) s.box([0.03, 0.008, 0.17], [gx - 0.18 + i * 0.045, plateY + 0.008, 0.14], s.material(i % 2 ? '#8e2f22' : '#a84a30')).rotation.y = (random() - 0.5) * 0.3;
          s.ball([0.07, 0.035, 0.07], [gx + 0.18, plateY + 0.03, 0.12], s.material('#d9a45c'), 14);
        } else {
          s.ball([0.15, 0.045, 0.11], [gx - 0.03, plateY + 0.03, -0.03], s.material('#6b3f2a', { roughness: 0.9 }), 14);
          s.box([0.2, 0.008, 0.13], [gx - 0.03, plateY + 0.074, -0.03], s.material('#f6b62c', { roughness: 0.35 })).rotation.y = 0.3;
          s.ball([0.07, 0.02, 0.06], [gx + 0.17, plateY + 0.015, 0.14], s.material('#e9dfbd'), 12);
        }
        s.box([0.1, 0.006, 0.12], [gx + 0.16, plateY + 0.03, -0.14], steel).rotation.set(0.2, 0.5, 0);
        s.rod([gx + 0.19, plateY + 0.04, -0.09], [gx + 0.27, plateY + 0.09, 0.05], 0.011, dark);
        const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
        for (let i = 0; i < 9; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), steam);
          puff.userData = { x: gx + (random() - 0.5) * 0.36, z: (random() - 0.5) * 0.3, phase: random(), base: plateY + 0.05 };
          s.root.add(puff);
          puffs.push(puff);
        }
      }
    }
    const place = (time: number) => {
      for (const puff of puffs) {
        const d = puff.userData, t = (d.phase + time * mix(0.12, 0.5, mood.energy)) % 1;
        puff.position.set(d.x + Math.sin(t * 6 + d.phase * 9) * 0.05, d.base + t * 0.75, d.z);
        puff.scale.setScalar(0.5 + t * 1.6);
      }
    };
    place(0);
    const spin = a.slicer === 'slicing' ? mix(2, 14, mood.energy) : 0;
    return s.finish({ update: (dt, time) => { place(time); hub.rotation.x += dt * spin; } });
  },
});
