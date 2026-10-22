import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function canvasMaterial(size: [number, number], draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, glow = false) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  draw(canvas.getContext('2d')!, size[0], size[1]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, ...(glow ? { emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 1 } : {}) });
}

export default defineThing({
  questions: {
    era: choice('What era is the scale?', {
      victorian: 'A white enamel face in a black japanned drum with a brass bezel and ornate numerals.',
      midcentury: 'A cream face in a chrome-rimmed grey steel housing, 1950s hospital issue.',
      grocer: 'A big cheerful face in a red painted housing, a market stall or a butcher.',
      digital: 'A flat grey box with glowing green digits instead of a dial.',
    }),
    support: choice('What does it hang from?', {
      stand: 'A tall floor stand with a heavy round base and a curved arm.',
      wall: 'An iron bracket bolted to a white tiled wall.',
      bench: 'A short gallows frame standing on a steel work bench.',
      beam: 'A chain from a heavy timber beam carried on two posts, a market or a barn.',
    }),
    contents: choice('What sits in the pan?', {
      empty: 'Nothing. The pan is clean and empty.',
      heart: 'A human heart, dark red, with the stubs of its vessels.',
      brain: 'A brain, pale grey-pink and folded.',
      liver: 'A liver, a broad dark brown wedge that fills the pan.',
      fruit: 'A heap of apples or tomatoes, ordinary shopping.',
      fish: 'A whole silver fish, tail hanging over the rim.',
      feather: 'A single white feather, weighing nothing.',
      weights: 'A stack of brass calibration weights.',
    }),
    weight: score('What does the needle or readout show?', ['Dead on zero', 'A light load', 'About half way round', 'Pinned hard against the maximum']),
    moment: choice('What is happening at this moment?', {
      still: 'Hanging perfectly still, the reading settled.',
      swinging: 'Just loaded: the pan is still swinging and the needle quivering.',
      dripping: 'Dripping slowly from the pan into a small puddle beneath.',
      tilted: 'One hanger has slipped and the pan hangs crooked.',
    }),
    record: choice('How is the reading being recorded?', {
      none: 'It is not. Nobody is writing anything down.',
      slate: 'A chalk slate of scribbled weights hangs beside it.',
      clipboard: 'A clipboard form hangs on a hook beside it.',
      microphone: 'A dictation microphone hangs on its cable next to the dial.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#c5cccd', { metalness: 0.55, roughness: 0.3 });
    const bright = s.material('#e6eaea', { metalness: 0.7, roughness: 0.2 });
    const dark = s.material('#1f2324', { roughness: 0.6 });
    const brass = s.material('#b8923f', { metalness: 0.7, roughness: 0.3 });
    const iron = s.material('#2c2f30', { roughness: 0.7, metalness: 0.3 });

    // Support: everything hangs from a hook at (0, hookY, 0).
    let hookY = 1.95;
    if (a.support === 'stand') {
      s.cylinder(0.3, 0.33, 0.06, [0, 0.03, -0.38], iron, 28);
      s.cylinder(0.08, 0.12, 0.1, [0, 0.11, -0.38], iron, 16);
      s.rod([0, 0.1, -0.38], [0, 1.9, -0.38], 0.025, steel);
      s.tube([[0, 1.9, -0.38], [0, 2.1, -0.34], [0, 2.16, -0.15], [0, 2.08, -0.02], [0, 1.98, 0]], 0.022, steel);
      hookY = 1.98;
    } else if (a.support === 'wall') {
      const tiles = canvasMaterial([256, 512], (g, w, h) => {
        g.fillStyle = '#b9bdb6';
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < 4; x++) for (let y = 0; y < 8; y++) {
          const tone = 232 + Math.floor(random() * 14) - Math.floor(mood.wear * random() * 50);
          g.fillStyle = y === 2 ? '#7fa79a' : `rgb(${tone},${tone + 3},${tone - 4})`;
          g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
        }
      });
      s.box([1.1, 2.4, 0.12], [0, 1.2, -0.42], [s.material('#b7b3a6'), s.material('#b7b3a6'), s.material('#b7b3a6'), s.material('#b7b3a6'), tiles, s.material('#8d897d')] as unknown as THREE.Material);
      s.box([0.1, 0.36, 0.02], [0, 1.95, -0.35], iron);
      s.rod([0, 2.08, -0.35], [0, 2.08, 0.04], 0.018, iron);
      s.rod([0, 1.8, -0.35], [0, 2.07, -0.04], 0.012, iron);
      s.ring(0.09, 0.008, [0, 1.99, -0.24], iron, Math.PI * 1.5).rotation.y = Math.PI / 2;
      hookY = 2.06;
    } else if (a.support === 'bench') {
      s.box([1.15, 0.04, 0.62], [0, 0.88, -0.12], steel);
      s.box([1.15, 0.1, 0.03], [0, 0.95, -0.42], steel);
      for (const x of [-0.52, 0.52]) for (const z of [-0.38, 0.14]) s.rod([x, 0, z], [x, 0.87, z], 0.022, steel);
      s.box([1.05, 0.02, 0.52], [0, 0.22, -0.12], steel);
      s.box([0.26, 0.03, 0.2], [0, 0.915, -0.3], iron);
      s.rod([0, 0.9, -0.3], [0, 2.0, -0.3], 0.02, bright);
      s.rod([0, 1.99, -0.3], [0, 1.99, 0.03], 0.018, bright);
      s.rod([0, 1.75, -0.3], [0, 1.98, -0.08], 0.01, bright);
      s.lathe([[0.001, 0], [0.07, 0], [0.11, 0.07], [0.1, 0.07], [0.065, 0.012]], bright, [0.38, 0.9, -0.05]).material.side = THREE.DoubleSide;
      hookY = 1.97;
    } else {
      const timber = s.material('#6b4e33', { roughness: 0.85 });
      for (const x of [-0.75, 0.75]) {
        s.box([0.12, 2.25, 0.12], [x, 1.125, 0], timber);
        s.rod([x, 1.85, 0], [x * 0.45, 2.25, 0], 0.03, timber);
        s.box([0.3, 0.06, 0.3], [x, 0.03, 0], timber);
      }
      s.box([1.9, 0.14, 0.14], [0, 2.32, 0], timber);
      for (let i = 0; i < 5; i++) s.ring(0.018, 0.005, [0, 2.23 - i * 0.03, 0], iron).rotation.y = i % 2 ? Math.PI / 2 : 0;
      hookY = 2.09;
    }
    s.ring(0.022, 0.006, [0, hookY - 0.02, 0], iron);

    // Dial or readout.
    const digital = a.era === 'digital';
    const R = a.era === 'grocer' ? 0.24 : 0.2;
    const dialY = hookY - 0.06 - (digital ? 0.1 : R);
    const jitter = a.moment === 'swinging' ? 0.06 : 0.008;
    const reading = Math.min(1, Math.max(0, a.contents === 'empty' || a.contents === 'feather' ? a.weight * 0.04 : mix(0.06, 1, a.weight)));
    const needle = new THREE.Group();
    if (digital) {
      s.box([0.36, 0.2, 0.09], [0, dialY, 0], s.material('#9aa3a5', { roughness: 0.5 }));
      const grams = Math.round(reading * 2400);
      const text = reading >= 0.999 ? '-OL-' : `${grams}`;
      const display = s.mesh(new THREE.PlaneGeometry(0.3, 0.11), canvasMaterial([256, 96], (g, w, h) => {
        g.fillStyle = '#07130c';
        g.fillRect(0, 0, w, h);
        g.fillStyle = mood.warmth > 0.6 ? '#ff7a2a' : '#49ff8a';
        g.font = 'bold 74px monospace';
        g.textAlign = 'right';
        g.textBaseline = 'middle';
        g.fillText(text, w - 44, h / 2 + 4);
        g.font = 'bold 28px monospace';
        g.fillText('g', w - 12, h / 2 + 20);
      }, true), [0, dialY + 0.025, 0.046]);
      display.castShadow = false;
      for (let i = 0; i < 3; i++) s.box([0.04, 0.02, 0.01], [-0.1 + i * 0.1, dialY - 0.065, 0.046], dark);
    } else {
      const housing = { victorian: dark, midcentury: s.material('#8f9a9b', { metalness: 0.3, roughness: 0.45 }), grocer: s.material('#b82e24', { roughness: 0.4 }) }[a.era as 'victorian'];
      const bezel = a.era === 'victorian' ? brass : a.era === 'grocer' ? s.material('#f2efe2') : bright;
      s.cylinder(R, R, 0.1, [0, dialY, 0], housing, 40).rotation.x = Math.PI / 2;
      s.ring(R - 0.006, 0.012, [0, dialY, 0.05], bezel);
      const max = a.era === 'grocer' ? 10 : 5;
      const face = s.mesh(new THREE.CircleGeometry(R - 0.012, 40), canvasMaterial([512, 512], (g) => {
        g.fillStyle = a.era === 'midcentury' ? '#efe8d2' : '#f6f4ea';
        g.fillRect(0, 0, 512, 512);
        g.translate(256, 256);
        g.fillStyle = g.strokeStyle = a.era === 'grocer' ? '#8c1f17' : '#1c1f22';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (let i = 0; i <= max * 10; i++) {
          const angle = (-225 + (270 * i) / (max * 10)) * Math.PI / 180;
          const major = i % 10 === 0, mid = i % 5 === 0;
          g.lineWidth = major ? 7 : mid ? 4 : 2;
          g.beginPath();
          g.moveTo(Math.cos(angle) * 236, Math.sin(angle) * 236);
          g.lineTo(Math.cos(angle) * (major ? 196 : mid ? 208 : 218), Math.sin(angle) * (major ? 196 : mid ? 208 : 218));
          g.stroke();
          if (major) {
            g.font = `${a.era === 'victorian' ? 'italic ' : 'bold '}${a.era === 'grocer' ? 44 : 52}px ${a.era === 'victorian' ? 'serif' : 'sans-serif'}`;
            g.fillText(`${i / 10}`, Math.cos(angle) * 156, Math.sin(angle) * 156);
          }
        }
        g.font = `${a.era === 'victorian' ? 'italic 30px serif' : 'bold 28px sans-serif'}`;
        g.fillText(a.era === 'grocer' ? 'HONEST WEIGHT' : a.era === 'victorian' ? 'Avery & Sons' : 'KILOGRAMS', 0, 90);
        g.fillText(a.era === 'grocer' ? 'kg' : a.era === 'victorian' ? 'lbs' : 'kg', 0, -70);
        if (mood.wear > 0.5) {
          g.globalAlpha = (mood.wear - 0.5) * 0.7;
          g.fillStyle = '#7a5b33';
          for (let i = 0; i < 9; i++) g.fillRect(random() * 500 - 250, random() * 500 - 250, random() * 90, random() * 60);
        }
      }), [0, dialY, 0.052]);
      face.castShadow = false;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(R * 0.86, 0.012, 0.006), s.material(a.era === 'grocer' ? '#1c1f22' : '#b3261e'));
      hand.position.x = R * 0.3;
      needle.add(hand);
      needle.position.set(0, dialY, 0.062);
      needle.rotation.z = (225 - 270 * reading) * Math.PI / 180 + (random() - 0.5) * jitter;
      s.root.add(needle);
      s.cylinder(0.018, 0.018, 0.02, [0, dialY, 0.062], a.era === 'victorian' ? brass : dark, 12).rotation.x = Math.PI / 2;
      s.cylinder(0.012, 0.012, 0.05, [0, dialY + R + 0.02, 0], iron, 8);
    }

    // The pan on its hangers: a group that can swing about the hook under the dial.
    const pivotY = dialY - (digital ? 0.1 : R);
    const swing = new THREE.Group();
    swing.position.set(0, pivotY, 0);
    s.root.add(swing);
    const hang = (mesh: THREE.Object3D) => { swing.add(mesh); return mesh; };
    const panR = 0.24, drop = 0.46, sag = a.moment === 'tilted' ? 0.09 : 0;
    hang(s.cylinder(0.012, 0.012, 0.06, [0, -0.03, 0], iron, 8));
    hang(s.ring(0.02, 0.005, [0, -0.07, 0], iron));
    const pan = new THREE.Group();
    pan.position.y = -drop;
    pan.rotation.z = sag * 2.2;
    swing.add(pan);
    const bowl = s.lathe([[0.001, -0.07], [0.09, -0.065], [0.165, -0.035], [0.2, 0], [0.212, 0.004], [0.2, 0.008], [0.16, -0.025], [0.09, -0.055], [0.001, -0.06]], a.era === 'victorian' ? brass : a.era === 'grocer' ? s.material('#e9e9e2', { roughness: 0.3 }) : steel);
    bowl.scale.setScalar(1.2);
    pan.add(bowl);
    (bowl.material as THREE.Material).side = THREE.DoubleSide;
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI / 2 + (i * Math.PI * 2) / 3;
      const end = new THREE.Vector3(Math.cos(angle) * panR, 0, Math.sin(angle) * panR).applyEuler(pan.rotation).add(pan.position);
      hang(s.rod([0, -0.08, 0], [end.x, end.y, end.z], 0.005, a.era === 'victorian' ? brass : bright));
    }
    const put = (mesh: THREE.Mesh) => { pan.add(mesh); return mesh; };
    const organ = (colour: string) => s.material(colour, { roughness: 0.35 });
    if (a.contents === 'heart') {
      const red = organ('#7a1f26');
      put(s.ball([0.075, 0.09, 0.065], [0, 0.015, 0], red, 16)).rotation.z = 0.35;
      put(s.ball([0.05, 0.05, 0.045], [-0.045, 0.06, 0.01], organ('#8f2a30'), 12));
      put(s.ball([0.045, 0.045, 0.04], [0.035, 0.075, -0.01], organ('#6a1a22'), 12));
      put(s.rod([0.0, 0.07, 0], [-0.02, 0.15, 0.01], 0.022, organ('#b9454a'), 0.02));
      put(s.rod([0.03, 0.08, 0], [0.07, 0.13, 0], 0.014, organ('#39457a')));
      put(s.rod([-0.03, 0.02, 0.06], [0.03, -0.04, 0.045], 0.006, organ('#d7b46a')));
    } else if (a.contents === 'brain') {
      const grey = organ('#c9a9a2');
      for (const side of [-1, 1]) {
        put(s.ball([0.07, 0.07, 0.1], [side * 0.058, 0.03, 0], grey, 16));
        for (let i = 0; i < 5; i++) {
          const fold = put(s.ring(0.045 + random() * 0.015, 0.012, [side * 0.06, 0.035, -0.07 + i * 0.035], organ('#b8958f'), Math.PI));
          fold.rotation.y = side * 0.25 + (random() - 0.5) * 0.4;
        }
      }
      put(s.ball([0.05, 0.035, 0.045], [0, -0.015, -0.085], organ('#b38c86'), 10));
    } else if (a.contents === 'liver') {
      const brown = organ('#5e2a22');
      put(s.ball([0.15, 0.05, 0.11], [0.02, 0.015, 0], brown, 18)).rotation.z = -0.12;
      put(s.ball([0.09, 0.04, 0.085], [-0.1, 0.012, 0.02], organ('#6b3027'), 14)).rotation.z = 0.2;
      put(s.ball([0.03, 0.02, 0.035], [0, -0.005, 0.1], organ('#5c7a3a'), 10));
    } else if (a.contents === 'fruit') {
      const tones = mood.cheer > 0.5 ? ['#c7372f', '#d9a02b', '#7fae3a', '#d6483a'] : ['#9c3a32', '#8c9a4a', '#a8582f', '#7c2f2c'];
      const count = 4 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const ring = i < 4 ? 0.095 : 0.04, angle = i * (i < 4 ? Math.PI / 2 : 2.1) + random();
        const y = i < 4 ? 0.01 : 0.085;
        put(s.ball([0.052, 0.048, 0.052], [Math.cos(angle) * ring, y, Math.sin(angle) * ring], organ(tones[i % 4]), 14));
        put(s.rod([Math.cos(angle) * ring, y + 0.04, Math.sin(angle) * ring], [Math.cos(angle) * ring + 0.01, y + 0.07, Math.sin(angle) * ring], 0.004, s.material('#4a3a22')));
      }
    } else if (a.contents === 'fish') {
      const silver = s.material('#aab6bd', { metalness: 0.6, roughness: 0.25 });
      put(s.ball([0.2, 0.05, 0.035], [0.02, 0.01, 0.02], silver, 18)).rotation.set(0, 0.2, -0.08);
      const tail = put(s.mesh(new THREE.ConeGeometry(0.07, 0.11, 4), s.material('#76858d', { metalness: 0.4, roughness: 0.4 }), [0.26, -0.035, 0.0]));
      tail.scale.z = 0.15;
      tail.rotation.z = Math.PI / 2 - 0.5;
      put(s.ball([0.012, 0.012, 0.008], [-0.13, 0.025, 0.05], s.material('#f2f2ea'), 8));
      put(s.ball([0.006, 0.006, 0.006], [-0.132, 0.026, 0.057], dark, 6));
      put(s.box([0.09, 0.03, 0.004], [0.03, 0.065, 0.02], s.material('#76858d'))).rotation.z = -0.1;
    } else if (a.contents === 'feather') {
      const white = new THREE.MeshStandardMaterial({ color: '#fbfaf4', roughness: 0.9, side: THREE.DoubleSide });
      const vane = put(s.ball([0.15, 0.004, 0.035], [0, -0.012, 0], white, 16));
      vane.rotation.set(0.1, 0.5, 0.12);
      put(s.rod([-0.19, -0.03, 0.09], [0.14, 0.01, -0.07], 0.003, s.material('#d9d2bc')));
    } else if (a.contents === 'weights') {
      const count = 3 + Math.floor(random() * 3);
      let y = -0.045;
      for (let i = 0; i < count; i++) {
        const r = 0.075 - i * 0.011;
        put(s.cylinder(r, r, 0.04, [(random() - 0.5) * 0.01, y + 0.02, (random() - 0.5) * 0.01], brass, 20));
        y += 0.04;
      }
      put(s.ball([0.018, 0.018, 0.018], [0, y + 0.012, 0], brass, 10));
      put(s.cylinder(0.035, 0.035, 0.035, [0.12, -0.02, 0.05], brass, 16));
    }
    swing.rotation.z = a.moment === 'swinging' ? (random() < 0.5 ? -1 : 1) * mix(0.12, 0.2, random()) : a.moment === 'tilted' ? 0.04 : 0;
    if (a.contents !== 'empty' && a.contents !== 'weights') s.mesh(new THREE.PlaneGeometry(0.06, 0.09), new THREE.MeshStandardMaterial({ color: '#e8d9ae', side: THREE.DoubleSide, roughness: 0.9 }), [panR * 0.9, pivotY - drop - 0.09, panR * 0.5]).rotation.set(0.1, 0.6, 0.2);

    const floorY = a.support === 'bench' ? 0.9 : 0;
    const drops: THREE.Mesh[] = [];
    if (a.moment === 'dripping') {
      const fluid = s.material(a.contents === 'fruit' ? '#c9a23a' : a.contents === 'fish' || a.contents === 'empty' || a.contents === 'feather' || a.contents === 'weights' ? '#a9c7cf' : '#7a1f26', { roughness: 0.1 });
      const pool = s.cylinder(0.12, 0.12, 0.004, [0.02, floorY + 0.004, 0.02], fluid, 22);
      pool.scale.set(1.3, 1, 0.9 + random() * 0.4);
      pool.castShadow = false;
      s.cylinder(0.035, 0.035, 0.004, [0.19, floorY + 0.004, -0.06], fluid, 12).castShadow = false;
      for (let i = 0; i < 3; i++) drops.push(s.ball([0.008, 0.014, 0.008], [0, mix(pivotY - drop - 0.08, floorY + 0.05, (i + random()) / 3), 0], fluid, 8));
    }

    // Record keeping, hung to the right of the dial.
    const rx = a.support === 'beam' ? 0.75 : a.support === 'wall' ? 0.36 : 0.02, rz = a.support === 'beam' ? 0.065 : a.support === 'wall' ? -0.35 : -0.35;
    const ry = a.support === 'beam' ? 1.45 : 1.5;
    if (a.record === 'slate' || a.record === 'clipboard') {
      const slate = a.record === 'slate';
      const page = canvasMaterial([256, 320], (g, w, h) => {
        g.fillStyle = slate ? '#262a2b' : '#f3f1e6';
        g.fillRect(0, 0, w, h);
        g.fillStyle = g.strokeStyle = slate ? '#e9e9e2' : '#2b3a55';
        g.font = `${slate ? 'italic 40px serif' : '26px monospace'}`;
        const rows = slate ? ['Heart 310', 'Liver 1480', 'Brain 1350', 'Spleen 150'] : ['WEIGHT RECORD', 'HRT ____ g', 'LIV ____ g', 'BRN ____ g', 'KID ____ g', 'SPL ____ g', 'sign: ______'];
        rows.forEach((row, index) => {
          if (index / rows.length <= mix(0.3, 1, a.weight) || !slate) g.fillText(row, 16, (slate ? 60 : 44) + index * (slate ? 66 : 40), w - 30);
        });
      });
      const edge = s.material(slate ? '#7b5c3c' : '#6b4b2c');
      const offset = a.support === 'stand' || a.support === 'bench' ? 0.3 : 0;
      s.box([0.3, 0.38, 0.016], [rx + offset, ry, rz + 0.03 + (offset ? 0.3 : 0)], [edge, edge, edge, edge, page, edge] as unknown as THREE.Material).rotation.z = (random() - 0.5) * 0.12;
      if (offset) s.rod([rx, ry + 0.2, rz], [rx + offset, ry + 0.2, rz + 0.33], 0.008, iron);
    }
    if (a.record === 'microphone') {
      const mx = 0.34, top: [number, number, number] = a.support === 'beam' ? [mx, 2.25, 0] : [0, hookY + 0.04, -0.1];
      s.tube([top, [mx * 0.6, hookY - 0.1, 0.02], [mx, dialY + 0.2, 0.04], [mx, dialY + 0.02, 0.04]], 0.006, dark);
      s.cylinder(0.02, 0.016, 0.1, [mx, dialY - 0.03, 0.04], dark, 12);
      s.ball([0.03, 0.036, 0.03], [mx, dialY - 0.1, 0.04], s.material('#8d9596', { metalness: 0.5, roughness: 0.5 }), 12);
    }

    const amplitude = swing.rotation.z, speed = mix(0.6, 2.2, mood.energy);
    const floorDrop = floorY + 0.03, start = pivotY - drop - 0.08;
    return s.finish({
      update: (dt, time) => {
        if (a.moment === 'swinging') {
          swing.rotation.z = amplitude * Math.cos(time * speed * 2);
          if (!digital) needle.rotation.z += Math.sin(time * 9) * 0.002 * mood.energy;
        }
        for (const drip of drops) {
          drip.position.y -= dt * mix(0.5, 1.6, mood.energy);
          if (drip.position.y < floorDrop) drip.position.y = start;
        }
      },
    });
  },
});
