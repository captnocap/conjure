import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const NAMES = ['OKAFOR, M.', 'HALE, R.', 'LINDQVIST', 'MORROW, T.', 'VANCE, E.', 'PARDO, S.', 'IWATA, K.', 'FENN, D.', 'ABARA, L.', 'QUILL, H.', 'STROUD, B.', 'MEIER, C.'];

function cardMaterial(lines: string[], ink: string, paper: string, stripe: string | null) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = paper;
  g.fillRect(0, 0, 256, 128);
  if (stripe) {
    g.fillStyle = stripe;
    g.fillRect(0, 0, 256, 30);
  }
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const top = stripe ? 34 : 0;
  lines.forEach((line, index) => {
    g.font = `bold ${lines.length > 1 ? 38 : 50}px monospace`;
    g.fillText(line, 128, top + ((128 - top) * (index + 1)) / (lines.length + 1), 236);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
}

/** A sheet settled over a lying figure: head at -z, feet at +z, resting on y = 0. */
function shroud(length: number, width: number, bulk: number, random: () => number) {
  const nu = 44, nv = 18;
  const positions: number[] = [], index: number[] = [];
  const bump = (t: number, at: number, spread: number) => Math.exp(-(((t - at) / spread) ** 2));
  const phase = random() * 6;
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const t = i / nu, v = (j / nv) * 2 - 1, x = (v * width) / 2;
      const height = Math.max(0.2 * bump(t, 0.07, 0.05), 0.23 * bulk * bump(t, 0.3, 0.14), 0.2 * bulk * bump(t, 0.48, 0.12), 0.13 * bump(t, 0.72, 0.22), 0.23 * bump(t, 0.95, 0.035));
      const half = (0.1 + 0.13 * bump(t, 0.26, 0.13) + 0.09 * bump(t, 0.5, 0.15) + 0.03 * bump(t, 0.75, 0.2)) * bulk;
      const across = Math.abs(x) / half;
      const edge = Math.min(1, (1 - Math.abs(v)) * 6) * Math.min(1, t * 14, (1 - t) * 14);
      positions.push(x, (height * Math.exp(-1.25 * across * across) + 0.012 + 0.006 * Math.sin(t * 31 + v * 9 + phase)) * edge, (t - 0.5) * length);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    size: choice('How big is the bank of drawers?', {
      column: 'A single narrow column of three doors, a small-town funeral home.',
      four: 'Two by two: four doors, a modest hospital basement.',
      nine: 'Three by three: nine doors, the classic wall.',
      long: 'A long low run, five wide and two high, a busy city coroner.',
      vast: 'Four wide and four high, a towering wall that needs a lift to reach the top row.',
    }),
    era: choice('What era and finish is it?', {
      modern: 'Brushed stainless steel with slim lever handles, bright and anonymous.',
      enamel: 'White enamel with heavy chrome latch handles, a 1950s county morgue.',
      green: 'Institutional green painted steel, chipped at the edges, a 1970s police building.',
      oak: 'Varnished oak icebox doors with brass latches and hinges, a Victorian dead-house.',
    }),
    state: choice('What state are the doors in right now?', {
      shut: 'Every door shut and latched. Nothing to see; everything implied.',
      ajar: 'One door left hanging ajar on a dark opening.',
      empty: 'One door open and its bare steel tray slid out, waiting for someone.',
      occupied: 'One door open and its tray slid out with a sheeted form lying on it, toe tag showing.',
      several: 'Several doors standing open on empty dark compartments, cleared out or ransacked.',
    }),
    occupancy: score('How many of the drawers carry a name card?', ['None, the whole wall is empty', 'One or two', 'About half', 'Every single one is taken']),
    cards: choice('If there are name cards, what do they say?', {
      names: 'Typed surnames and initials, ordinary people properly recorded.',
      unknown: 'UNKNOWN and JOHN DOE and JANE DOE, nobody has come for them.',
      numbers: 'Case numbers only, bureaucratic and cold.',
      hold: 'Red-striped HOLD and CORONER cards, cases that are not closed.',
      blank: 'Blank cards, not yet filled in.',
    }),
    top: choice('What sits on top of the unit?', {
      plain: 'Nothing, a clean flat top.',
      compressor: 'A louvred refrigeration unit with a round temperature dial.',
      lights: 'A strip of small status lamps, green for cold and one showing red.',
      boxes: 'Dusty cardboard archive boxes, storage has crept in.',
    }),
    left: choice('Has anything been left on it?', {
      nothing: 'Nothing at all.',
      flower: 'A single flower taped to one door by somebody who came to say goodbye.',
      clipboard: 'A clipboard of paperwork hanging from a hook on the side.',
      tape: 'Striped evidence tape sealed across one door.',
      padlock: 'A padlock and chain through one handle, this one stays closed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [cols, rows] = ({ column: [1, 3], four: [2, 2], nine: [3, 3], long: [5, 2], vast: [4, 4] } as const)[a.size];
    const dw = 0.74, dh = 0.62, depth = 0.95, plinth = 0.14;
    const width = cols * dw + 0.12, height = rows * dh + 0.12;
    const wood = a.era === 'oak';
    const bodyColour = { modern: '#b4bdbf', enamel: '#e7e9e1', green: '#8ea596', oak: '#6f4d31' }[a.era];
    const doorColour = { modern: '#ccd3d4', enamel: '#f2f3ec', green: '#a3b8a9', oak: '#8a6240' }[a.era];
    const metal = a.era === 'modern' ? 0.55 : 0;
    const body = s.material(bodyColour, { metalness: metal, roughness: wood ? 0.6 : 0.42 });
    const doorPaint = s.material(doorColour, { metalness: metal, roughness: wood ? 0.5 : 0.35 });
    const panelPaint = s.material(new THREE.Color(doorColour).multiplyScalar(wood ? 0.82 : 0.93), { metalness: metal, roughness: 0.4 });
    const hardware = s.material(wood ? '#b8923f' : '#e3e7e8', { metalness: 0.7, roughness: 0.28 });
    const dark = s.material('#161b1c', { roughness: 0.9 });
    const rust = s.material('#7d4a2c', { roughness: 0.95 });
    const steel = s.material('#c5cccd', { metalness: 0.5, roughness: 0.35 });

    s.box([width, plinth, depth - 0.06], [0, plinth / 2, -0.03], dark);
    s.box([width, height, depth], [0, plinth + height / 2, 0], body);
    s.box([width + 0.04, 0.05, depth + 0.04], [0, plinth + height + 0.025, 0], panelPaint);

    // Decide which doors are open.
    const open = new Map<number, number>();
    const total = cols * rows;
    const pick = () => Math.floor(random() * cols) + cols * Math.min(rows - 1, Math.floor(random() * Math.min(rows, 2)));
    const heroDoor = pick();
    if (a.state === 'ajar') open.set(heroDoor, mix(0.5, 1.1, random()));
    if (a.state === 'empty' || a.state === 'occupied') open.set(heroDoor, 1.75);
    if (a.state === 'several') {
      const wanted = Math.max(2, Math.round(total * mix(0.3, 0.6, random())));
      while (open.size < Math.min(wanted, total)) open.set(Math.floor(random() * total), mix(0.7, 1.9, random()));
    }

    const texts: Record<typeof a.cards, () => string[]> = {
      names: () => [NAMES[Math.floor(random() * NAMES.length)], `${10 + Math.floor(random() * 18)}-${100 + Math.floor(random() * 899)}`],
      unknown: () => [['UNKNOWN', 'JOHN DOE', 'JANE DOE', 'UNIDENTIFIED'][Math.floor(random() * 4)], `#${1 + Math.floor(random() * 40)}`],
      numbers: () => [`${String.fromCharCode(65 + Math.floor(random() * 6))}-${1000 + Math.floor(random() * 8999)}`],
      hold: () => [random() < 0.5 ? 'HOLD' : 'CORONER', random() < 0.5 ? 'DO NOT RELEASE' : 'PENDING'],
      blank: () => [],
    };
    const sealed = a.left === 'tape' || a.left === 'padlock' || a.left === 'flower'
      ? [...Array(total).keys()].filter((n) => !open.has(n))[Math.floor(random() * Math.max(1, total - open.size))] ?? -1
      : -1;

    for (let col = 0; col < cols; col++)
      for (let row = 0; row < rows; row++) {
        const n = row * cols + col;
        const cx = (col - (cols - 1) / 2) * dw, cy = plinth + 0.06 + dh / 2 + row * dh;
        const angle = open.get(n) ?? 0;
        const hinge = new THREE.Group();
        hinge.position.set(cx - dw / 2 + 0.03, cy, depth / 2);
        hinge.rotation.y = -angle;
        s.root.add(hinge);
        const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(x + dw / 2 - 0.03, y, z);
          mesh.castShadow = mesh.receiveShadow = true;
          hinge.add(mesh);
          return mesh;
        };
        add(new THREE.BoxGeometry(dw - 0.06, dh - 0.06, 0.06), doorPaint, 0, 0, 0.03);
        add(new THREE.BoxGeometry(dw - 0.2, dh - 0.2, 0.02), panelPaint, 0, 0, 0.068);
        for (const y of [-0.19, 0.19]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 10), hardware, -dw / 2 + 0.035, y, 0.07);
        // Lever handle on the latch side.
        const hx = dw / 2 - 0.11;
        add(new THREE.BoxGeometry(0.07, 0.17, 0.03), hardware, hx, -0.02, 0.085);
        if (a.era === 'modern' || a.era === 'green') add(new THREE.BoxGeometry(0.3, 0.05, 0.035), hardware, hx - 0.115, -0.02, 0.13);
        else {
          const lever = add(new THREE.BoxGeometry(0.055, 0.3, 0.04), hardware, hx, -0.1, 0.13);
          lever.rotation.z = 0.25;
          add(new THREE.SphereGeometry(0.03, 12, 8), hardware, hx + 0.03, -0.23, 0.13);
        }
        // Card holder and card.
        add(new THREE.BoxGeometry(0.25, 0.135, 0.012), hardware, -0.07, 0.13, 0.082);
        if (random() < a.occupancy * 1.05 - 0.02) {
          const lines = texts[a.cards]();
          const card = add(new THREE.PlaneGeometry(0.225, 0.11), cardMaterial(lines, a.cards === 'hold' ? '#7a1010' : '#20262b', mood.wear > 0.6 ? '#e2d8b8' : '#f4f1e4', a.cards === 'hold' ? '#c0392b' : null), -0.07, 0.13, 0.09);
          card.rotation.z = (random() - 0.5) * mood.wear * 0.25;
        }
        if (mood.wear > 0.45 && random() < mood.wear * 0.6)
          add(new THREE.BoxGeometry(0.03 + random() * 0.04, 0.1 + random() * 0.18, 0.004), rust, hx - 0.05 + random() * 0.08, -0.2, 0.063);
        if (n === sealed && a.left === 'tape') {
          const tape = s.material('#e7c531', { roughness: 0.7 });
          for (const turn of [0.32, -0.32]) add(new THREE.BoxGeometry(dw * 1.1, 0.05, 0.004), tape, 0, 0, 0.1).rotation.z = turn;
          add(new THREE.BoxGeometry(0.12, 0.12, 0.006), s.material('#b3261e'), 0, 0, 0.104);
        }
        if (n === sealed && a.left === 'padlock') {
          add(new THREE.TorusGeometry(0.035, 0.008, 6, 18), steel, hx - 0.06, -0.08, 0.15);
          add(new THREE.BoxGeometry(0.075, 0.065, 0.03), s.material('#c9a23a', { metalness: 0.6, roughness: 0.35 }), hx - 0.06, -0.15, 0.15);
          add(new THREE.BoxGeometry(0.09, 0.16, 0.004), s.material('#b3261e'), hx - 0.16, -0.14, 0.1).rotation.z = 0.2;
        }
        if (n === sealed && a.left === 'flower') {
          const stem = add(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 6), s.material('#3f6b3a'), 0.02, -0.08, 0.095);
          stem.rotation.z = 0.5;
          add(new THREE.SphereGeometry(0.045, 12, 8), s.material(mood.cheer > 0.5 ? '#f0c63a' : '#f3efe6'), -0.065, 0.065, 0.11).scale.z = 0.6;
          add(new THREE.SphereGeometry(0.02, 8, 6), s.material('#c9892a'), -0.065, 0.065, 0.135);
          add(new THREE.BoxGeometry(0.09, 0.03, 0.003), s.material('#d8cfae'), 0.06, -0.12, 0.098).rotation.z = 0.5;
        }
        if (angle > 0) {
          s.box([dw - 0.1, dh - 0.1, 0.01], [cx, cy, depth / 2 + 0.002], dark);
          s.box([dw - 0.1, 0.02, 0.012], [cx, cy - dh / 2 + 0.11, depth / 2 + 0.006], steel);
        }
        if (n === heroDoor && (a.state === 'empty' || a.state === 'occupied')) {
          const reach = 1.45, ty = cy - dh / 2 + 0.13, tw = dw - 0.18;
          const tz = depth / 2 + reach - 0.95;
          s.box([tw, 0.025, 1.9], [cx, ty, tz], steel);
          for (const side of [-1, 1]) {
            s.box([0.02, 0.05, 1.9], [cx + (side * tw) / 2, ty + 0.02, tz], steel);
            s.box([0.03, 0.03, reach], [cx + side * (tw / 2 - 0.05), ty - 0.03, depth / 2 + reach / 2 - 0.1], dark);
          }
          s.box([tw, 0.05, 0.02], [cx, ty + 0.02, tz + 0.95], steel);
          s.rod([cx - 0.12, ty + 0.03, tz + 0.99], [cx + 0.12, ty + 0.03, tz + 0.99], 0.012, hardware);
          if (a.state === 'occupied') {
            const sheet = s.mesh(shroud(1.74, tw - 0.02, mix(0.85, 1.15, random()), random), new THREE.MeshStandardMaterial({ color: mood.wear > 0.7 ? '#d9d6c6' : '#f1f2ee', roughness: 0.92, side: THREE.DoubleSide }), [cx, ty + 0.013, tz + 0.04]);
            sheet.castShadow = true;
            const tag = s.mesh(new THREE.PlaneGeometry(0.07, 0.11), cardMaterial(texts[a.cards === 'blank' ? 'numbers' : a.cards]().slice(0, 1), '#20262b', '#e9dcb4', null), [cx + 0.09, ty + 0.11, tz + 0.93]);
            tag.rotation.set(-0.2, 0.3, 0.25);
            (tag.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
            s.rod([cx + 0.03, ty + 0.23, tz + 0.86], [cx + 0.08, ty + 0.16, tz + 0.93], 0.003, dark);
          }
        }
      }

    const topY = plinth + height + 0.05;
    if (a.top === 'compressor') {
      const w = Math.min(width * 0.7, 1.3);
      s.box([w, 0.3, depth * 0.7], [0, topY + 0.15, -0.05], body);
      for (let i = 0; i < 7; i++) s.box([w * 0.55, 0.012, 0.01], [-w * 0.16, topY + 0.06 + i * 0.03, depth * 0.35 - 0.045], dark);
      s.cylinder(0.075, 0.075, 0.02, [w * 0.33, topY + 0.16, depth * 0.35 - 0.04], s.material('#f3f1e6'), 20).rotation.x = Math.PI / 2;
      s.box([0.008, 0.06, 0.004], [w * 0.33 + 0.012, topY + 0.175, depth * 0.35 - 0.027], s.material('#b3261e')).rotation.z = -0.6 + mood.warmth * 1.4;
    }
    if (a.top === 'lights') {
      s.box([width * 0.8, 0.09, 0.08], [0, topY + 0.045, depth / 2 - 0.06], dark);
      const bad = Math.floor(random() * cols);
      for (let i = 0; i < cols; i++) {
        const colour = i === bad ? '#ff3b2f' : '#49e07a';
        s.ball([0.028, 0.028, 0.02], [(i - (cols - 1) / 2) * dw * 0.8, topY + 0.045, depth / 2 - 0.02], s.material(colour, { emissive: colour, emissiveIntensity: 1.4 }), 10);
      }
    }
    if (a.top === 'boxes') {
      const card = s.material('#b89a6a', { roughness: 0.95 });
      const count = Math.max(1, Math.round(cols * mix(0.7, 1.6, mood.density)));
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * Math.min(0.5, (width - 0.4) / Math.max(1, count - 1) || 0.5);
        const box = s.box([0.4, 0.28, 0.5], [x, topY + 0.14, (random() - 0.5) * 0.2], card);
        box.rotation.y = (random() - 0.5) * 0.4;
        s.box([0.42, 0.06, 0.52], [x, topY + 0.29, box.position.z], s.material('#a58858', { roughness: 0.95 })).rotation.y = box.rotation.y;
      }
    }
    if (a.left === 'clipboard') {
      const x = width / 2 + 0.012;
      const board = s.box([0.012, 0.34, 0.24], [x, plinth + height * 0.6, 0.2], s.material('#6b4b2c'));
      board.rotation.x = 0.05;
      s.box([0.004, 0.29, 0.2], [x + 0.008, plinth + height * 0.6 - 0.015, 0.2], s.material('#f3f1e6'));
      s.box([0.02, 0.035, 0.1], [x + 0.01, plinth + height * 0.6 + 0.15, 0.2], hardware);
    }
    // Cold air pooling out of an open compartment.
    if (open.size && mood.warmth < 0.6) {
      const mist = new THREE.MeshStandardMaterial({ color: '#eef6f8', transparent: true, opacity: 0.1, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const puff = s.ball([0.3 + random() * 0.3, 0.07 + random() * 0.05, 0.25 + random() * 0.2], [(random() - 0.5) * width * 0.8, 0.07, depth / 2 + 0.2 + random() * 0.4], mist, 12);
        puff.castShadow = false;
      }
    }
    return s.finish();
  },
});
