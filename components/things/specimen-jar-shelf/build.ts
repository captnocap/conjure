import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function labelMaterial(lines: string[], paper: string, ink: string, font: string, mark: 'none' | 'skull' = 'none') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const g = canvas.getContext('2d')!;
  g.fillStyle = paper;
  g.fillRect(0, 0, 128, 96);
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.strokeRect(5, 5, 118, 86);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (mark === 'skull') {
    g.beginPath();
    g.arc(64, 38, 22, 0, Math.PI * 2);
    g.fill();
    g.fillRect(50, 50, 28, 20);
    g.fillStyle = paper;
    g.fillRect(52, 32, 9, 10);
    g.fillRect(67, 32, 9, 10);
    for (let i = 0; i < 3; i++) g.fillRect(55 + i * 8, 58, 2, 12);
    g.fillStyle = ink;
    g.font = 'bold 15px monospace';
    g.fillText('POISON', 64, 82);
  } else
    lines.forEach((line, index) => {
      g.font = font;
      g.fillText(line, 64, (96 * (index + 1)) / (lines.length + 1) + 2, 112);
    });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
}

const WORDS = {
  organs: [['Cor', 'hominis'], ['Cerebrum', 'No. 12'], ['Hepar'], ['Ren. sin.'], ['Pulmo', '1897']],
  creatures: [['Rana', 'temporaria'], ['Vipera', 'berus'], ['Lacerta'], ['Natrix', 'juv.'], ['Bufo bufo']],
  sea: [['Octopus', 'vulgaris'], ['Asterias'], ['Sepia'], ['Gadus', 'juv.'], ['Loligo']],
  eyes: [['Oculus', 'dex.'], ['Manus'], ['Oculi', 'x 3'], ['Subject 9'], ['do not', 'open']],
  botanical: [['Mandragora'], ['Radix', 'No. 4'], ['Amanita'], ['Fungus', 'ign.'], ['Datura']],
  unknown: [['???'], ['found', '1911'], ['Specimen', 'X'], ['it moved'], ['unnamed']],
  empty: [['aqua'], ['No. 3'], ['vacant'], ['—'], ['spare']],
} as const;

export default defineThing({
  questions: {
    unit: choice('What kind of shelving holds the jars?', {
      lab: 'A plain white-painted open shelf unit, a medical school teaching store.',
      cabinet: 'A tall dark mahogany cabinet with a carved cornice and a cupboard below, a gentleman collector.',
      rack: 'An industrial grey steel rack with bolted uprights, a basement archive.',
      crates: 'Rough stacked wooden crates turned on their sides, a travelling sideshow.',
    }),
    contents: choice('What floats in the jars?', {
      organs: 'Human organs: brains, hearts, kidneys, pale and anatomical.',
      creatures: 'Coiled snakes, frogs and lizards, a natural history collection.',
      sea: 'Sea creatures: small octopuses, starfish and fish.',
      eyes: 'Eyeballs trailing their nerves, and a severed hand or two.',
      botanical: 'Twisted roots, fungi and seed pods, an apothecary or a witch.',
      unknown: 'Things nobody can name, with too many limbs and one eye.',
      empty: 'Nothing but cloudy fluid: whatever was in them is gone.',
    }),
    fluid: choice('What colour is the preserving fluid?', {
      formalin: 'Pale straw-yellow formalin.',
      amber: 'Dark amber-brown, a century old and stewed like tea.',
      green: 'A sickly luminous green that seems to glow from inside.',
      blue: 'Cold pale blue, clean and recent.',
      red: 'A thin blood-tinted pink.',
      mixed: 'Every jar a different tint, collected over many years.',
    }),
    count: score('How many jars are there?', ['Three or four survivors on bare shelves', 'A sparse row on each shelf', 'Comfortably full', 'Crammed shoulder to shoulder']),
    labels: choice('How are the jars labelled?', {
      script: 'Cream paper labels in brown handwritten Latin.',
      typed: 'White labels with typed catalogue numbers.',
      warning: 'Red warning labels and a skull and crossbones here and there.',
      none: 'No labels at all. Nobody remembers what they are.',
    }),
    story: choice('What has happened here?', {
      intact: 'Nothing. Everything is in its place.',
      broken: 'One jar has fallen and smashed on the floor in a puddle, its specimen lying in the glass.',
      escaped: 'One jar stands open with its lid off and its fluid low, and a wet trail leads away.',
      taken: 'A conspicuous gap on one shelf where a jar has been removed, only its label card left.',
      toppled: 'Several jars have tipped over on their sides, something shook the room.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = a.unit === 'rack' ? 1.7 : 1.4, D = 0.38;
    const shelves: { y: number; x0: number; x1: number }[] = [];
    const wood = s.material(a.unit === 'cabinet' ? '#4a2c1e' : '#8a6a45', { roughness: 0.7 });

    if (a.unit === 'lab') {
      const paint = s.material('#e9eae2', { roughness: 0.55 });
      for (const x of [-1, 1]) s.box([0.04, 1.95, D], [x * (W / 2 - 0.02), 0.975, 0], paint);
      s.box([W, 1.95, 0.02], [0, 0.975, -D / 2 + 0.01], s.material('#d5dad3'));
      for (let i = 0; i < 5; i++) {
        s.box([W - 0.08, 0.03, D], [0, 0.1 + i * 0.44, 0], paint);
        if (i < 4) shelves.push({ y: 0.115 + i * 0.44, x0: -W / 2 + 0.06, x1: W / 2 - 0.06 });
      }
      s.box([W, 0.04, D + 0.02], [0, 1.97, 0], paint);
    } else if (a.unit === 'cabinet') {
      s.box([W, 0.62, D + 0.08], [0, 0.31, 0], wood);
      for (const x of [-1, 1]) {
        s.box([W / 2 - 0.08, 0.46, 0.015], [x * W / 4, 0.32, D / 2 + 0.045], s.material('#5a3625', { roughness: 0.6 }));
        s.ball([0.018, 0.018, 0.018], [x * 0.05, 0.34, D / 2 + 0.065], s.material('#b8923f', { metalness: 0.7, roughness: 0.3 }), 8);
      }
      s.box([W + 0.06, 0.04, D + 0.14], [0, 0.64, 0], wood);
      for (const x of [-1, 1]) s.box([0.05, 1.5, D], [x * (W / 2 - 0.025), 1.41, 0], wood);
      s.box([W, 1.5, 0.02], [0, 1.41, -D / 2 + 0.01], s.material('#2f1c14'));
      for (let i = 0; i < 4; i++) {
        if (i) s.box([W - 0.1, 0.025, D - 0.02], [0, 0.66 + i * 0.37, 0], wood);
        if (i < 4) shelves.push({ y: (i ? 0.673 : 0.66) + i * 0.37, x0: -W / 2 + 0.07, x1: W / 2 - 0.07 });
      }
      s.box([W + 0.1, 0.07, D + 0.1], [0, 2.19, 0], wood);
      s.box([W + 0.18, 0.04, D + 0.16], [0, 2.245, 0], wood);
      const crest = s.cylinder(0.3, 0.3, 0.03, [0, 2.26, 0], wood, 24);
      crest.rotation.x = Math.PI / 2;
      crest.scale.set(1, 1, 0.45);
    } else if (a.unit === 'rack') {
      const grey = s.material('#7f8a8c', { metalness: 0.4, roughness: 0.5 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.04, 2.0, 0.04], [x * (W / 2 - 0.02), 1.0, z * (D / 2 - 0.02)], grey);
      for (let i = 0; i < 4; i++) {
        s.box([W, 0.035, D], [0, 0.15 + i * 0.5, 0], grey);
        shelves.push({ y: 0.168 + i * 0.5, x0: -W / 2 + 0.07, x1: W / 2 - 0.07 });
      }
      for (const x of [-1, 1]) {
        s.rod([x * (W / 2 - 0.02), 0.15, -D / 2 + 0.02], [x * (W / 2 - 0.02), 1.15, D / 2 - 0.02], 0.008, grey);
      }
      s.rod([-W / 2 + 0.02, 0.15, -D / 2 + 0.01], [W / 2 - 0.02, 1.65, -D / 2 + 0.01], 0.008, grey);
      s.rod([W / 2 - 0.02, 0.15, -D / 2 + 0.01], [-W / 2 + 0.02, 1.65, -D / 2 + 0.01], 0.008, grey);
    } else {
      const cw = 0.7, ch = 0.46;
      const cells: [number, number][] = [[-0.36, 0], [0.36, 0], [-0.3, 1], [0.42, 1], [0.02, 2]];
      for (const [x, level] of cells) {
        const jitter = (random() - 0.5) * 0.06, y = level * ch;
        s.box([cw, 0.025, D], [x + jitter, y + 0.0125, 0], wood);
        s.box([cw, 0.025, D], [x + jitter, y + ch - 0.0125, 0], wood);
        for (const side of [-1, 1]) s.box([0.025, ch, D], [x + jitter + side * (cw / 2 - 0.0125), y + ch / 2, 0], wood);
        for (let i = 0; i < 3; i++) s.box([cw, 0.1, 0.015], [x + jitter, y + 0.08 + i * 0.15, -D / 2 + 0.008], s.material('#7a5c3a', { roughness: 0.8 }));
        shelves.push({ y: y + 0.026, x0: x + jitter - cw / 2 + 0.05, x1: x + jitter + cw / 2 - 0.05 });
      }
      shelves.push({ y: 3 * ch + 0.001, x0: -0.25, x1: 0.3 });
    }

    // Shared jar materials.
    const tints = { formalin: ['#d9c96a'], amber: ['#8a5a22'], green: ['#6fe04a'], blue: ['#8fc4d6'], red: ['#d98a8a'], mixed: ['#d9c96a', '#8a5a22', '#8fc4d6', '#9cc77a', '#d98a8a'] }[a.fluid];
    const fluids = tints.map((tint) => new THREE.MeshStandardMaterial({
      color: new THREE.Color(tint).lerp(new THREE.Color('#77704f'), mood.wear * 0.3), transparent: true, opacity: mix(0.55, 0.72, mood.wear), depthWrite: false, roughness: 0.2,
      emissive: tint, emissiveIntensity: a.fluid === 'green' ? 0.75 : 0.12,
    }));
    const glass = new THREE.MeshStandardMaterial({ color: '#eaf4f2', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05 });
    const solidGlass = s.material('#cfe0dc', { roughness: 0.15 });
    const lids = [s.material('#2a2c2d', { roughness: 0.5 }), s.material('#9c7a4c', { roughness: 0.9 }), s.material('#b9c0c0', { metalness: 0.6, roughness: 0.3 })];
    const paper = a.labels === 'typed' ? '#f4f4ee' : a.labels === 'warning' ? '#d9382c' : '#e8dcb8';
    const ink = a.labels === 'typed' ? '#1d2226' : a.labels === 'warning' ? '#fff4e0' : '#4a3018';
    const labelSet = a.labels === 'none' ? [] : WORDS[a.contents].map((words, index) =>
      labelMaterial(a.labels === 'typed' ? [`${String.fromCharCode(65 + index)}-${100 + Math.floor(random() * 899)}`] : a.labels === 'warning' ? ['DANGER', ...words.slice(0, 1)] : [...words],
        paper, ink, a.labels === 'script' ? 'italic 26px serif' : 'bold 24px monospace', a.labels === 'warning' && index % 2 === 0 ? 'skull' : 'none'));
    const jarGeometry = new THREE.CylinderGeometry(1, 1, 1, 20);
    const labelGeometry = new THREE.PlaneGeometry(1, 1);
    const flesh = (colour: string) => s.material(colour, { roughness: 0.6 });
    const floaters: THREE.Group[] = [];

    /** One specimen, roughly filling a unit-high, radius-r cylinder, centred on the origin. */
    const specimen = (r: number, h: number) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { g.add(mesh); return mesh; };
      const k = Math.min(r * 0.82, h * 0.42);
      const kind = Math.floor(random() * 3);
      if (a.contents === 'organs') {
        if (kind === 0) for (const side of [-1, 1]) add(s.ball([k * 0.55, k * 0.7, k * 0.8], [side * k * 0.42, 0, 0], flesh('#d7b9ae'), 10));
        else if (kind === 1) {
          add(s.ball([k * 0.75, k, k * 0.7], [0, 0, 0], flesh('#8f4a4a'), 10)).rotation.z = 0.3;
          add(s.rod([0, k * 0.6, 0], [k * 0.2, k * 1.3, 0], k * 0.2, flesh('#b98a86')));
        } else add(s.ball([k * 0.6, k, k * 0.45], [0, 0, 0], flesh('#7a4a3c'), 10)).rotation.z = 0.2;
      } else if (a.contents === 'creatures') {
        if (kind === 0) {
          const scale = flesh(random() < 0.5 ? '#6f7a48' : '#8a6a3a');
          for (let i = 0; i < 3; i++) add(s.ring(k * (0.95 - i * 0.14), k * 0.16, [0, (i - 1) * k * 0.3, 0], scale)).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3;
          add(s.ball([k * 0.22, k * 0.16, k * 0.3], [k * 0.5, k * 0.55, 0], scale, 8));
        } else {
          const skin = flesh(kind === 1 ? '#7d8f58' : '#9a8a62');
          add(s.ball([k * 0.5, k * (kind === 1 ? 0.75 : 1.1), k * 0.4], [0, 0, 0], skin, 10));
          for (const side of [-1, 1]) {
            add(s.rod([side * k * 0.3, k * 0.4, 0], [side * k * 0.9, k * 0.7, k * 0.1], k * 0.09, skin));
            add(s.rod([side * k * 0.3, -k * 0.5, 0], [side * k * 0.8, -k * 1.1, k * 0.1], k * 0.11, skin));
          }
          if (kind === 2) add(s.rod([0, -k, 0], [k * 0.3, -k * 1.9, 0], k * 0.14, skin, k * 0.02));
        }
      } else if (a.contents === 'sea') {
        if (kind === 0) {
          const skin = flesh('#c98f8a');
          add(s.ball([k * 0.6, k * 0.7, k * 0.6], [0, k * 0.5, 0], skin, 10));
          for (let i = 0; i < 6; i++) {
            const angle = i * 1.047;
            add(s.rod([Math.cos(angle) * k * 0.3, 0, Math.sin(angle) * k * 0.3], [Math.cos(angle + 0.5) * k * 0.9, -k * (0.8 + random() * 0.6), Math.sin(angle + 0.5) * k * 0.9], k * 0.12, skin, k * 0.03));
          }
        } else if (kind === 1) {
          const star = flesh('#d98a4a');
          for (let i = 0; i < 5; i++) {
            const arm = add(s.mesh(new THREE.ConeGeometry(k * 0.28, k * 1.1, 6), star));
            arm.position.set(Math.cos(i * 1.257 + 1.57) * k * 0.5, Math.sin(i * 1.257 + 1.57) * k * 0.5, 0);
            arm.rotation.z = i * 1.257;
            arm.scale.z = 0.4;
          }
        } else {
          const silver = s.material('#a9b4b8', { metalness: 0.4, roughness: 0.4 });
          add(s.ball([k * 0.4, k * 1.1, k * 0.25], [0, 0, 0], silver, 10));
          const tail = add(s.mesh(new THREE.ConeGeometry(k * 0.45, k * 0.6, 4), silver, [0, -k * 1.25, 0]));
          tail.scale.z = 0.2;
        }
      } else if (a.contents === 'eyes') {
        if (kind < 2) {
          const n = 1 + Math.floor(random() * 3);
          for (let i = 0; i < n; i++) {
            const e = k * (n > 1 ? 0.48 : 0.7), x = (i - (n - 1) / 2) * e * 1.3, y = (random() - 0.5) * k * 0.9;
            add(s.ball([e, e, e], [x, y, 0], flesh('#eeeadf'), 12));
            add(s.ball([e * 0.5, e * 0.5, e * 0.3], [x, y, e * 0.8], flesh(['#4a7a8c', '#6a5030', '#5d7a4a'][i % 3]), 10));
            add(s.ball([e * 0.22, e * 0.22, e * 0.15], [x, y, e * 1.02], flesh('#101214'), 8));
            add(s.rod([x, y, -e * 0.8], [x + e * 0.5, y - e * 1.6, -e * 0.6], e * 0.16, flesh('#c97a72'), e * 0.06));
          }
        } else {
          const skin = flesh('#b9ad98');
          add(s.box([k * 0.9, k * 0.9, k * 0.3], [0, -k * 0.3, 0], skin));
          for (let i = 0; i < 4; i++) add(s.rod([(i - 1.5) * k * 0.24, k * 0.1, 0], [(i - 1.5) * k * 0.3, k * (0.95 + (i === 1 || i === 2 ? 0.2 : 0)), k * 0.1], k * 0.1, skin));
          add(s.rod([-k * 0.45, -k * 0.3, 0], [-k * 0.95, k * 0.25, k * 0.05], k * 0.11, skin));
          add(s.cylinder(k * 0.3, k * 0.33, k * 0.4, [0, -k * 0.95, 0], flesh('#8f4a4a'), 10));
        }
      } else if (a.contents === 'botanical') {
        if (kind === 0) {
          const root = flesh('#b89a6a');
          add(s.cylinder(k * 0.4, k * 0.12, k * 1.5, [0, 0, 0], root, 8));
          for (const side of [-1, 1]) {
            add(s.rod([side * k * 0.1, -k * 0.5, 0], [side * k * 0.7, -k * 1.2, k * 0.1], k * 0.1, root, k * 0.02));
            add(s.rod([side * k * 0.2, k * 0.3, 0], [side * k * 0.9, k * 0.1, 0], k * 0.08, root, k * 0.02));
          }
          add(s.ball([k * 0.5, k * 0.25, k * 0.5], [0, k * 0.9, 0], flesh('#5f7a3a'), 8));
        } else if (kind === 1) {
          add(s.cylinder(k * 0.14, k * 0.2, k * 1.3, [0, -k * 0.3, 0], flesh('#e9e2cf'), 8));
          add(s.ball([k * 0.8, k * 0.45, k * 0.8], [0, k * 0.5, 0], flesh(random() < 0.5 ? '#b3382c' : '#8a6a4a'), 12));
        } else for (let i = 0; i < 3; i++) add(s.ball([k * 0.3, k * 0.5, k * 0.3], [(i - 1) * k * 0.55, (random() - 0.5) * k, 0], flesh('#7a5a34'), 8)).rotation.z = random() - 0.5;
      } else if (a.contents === 'unknown') {
        const skin = flesh(['#6a7a6a', '#8a6a7a', '#5a6a80'][kind]);
        add(s.ball([k * 0.6, k * 0.75, k * 0.55], [0, 0, 0], skin, 10));
        const limbs = 4 + Math.floor(random() * 3);
        for (let i = 0; i < limbs; i++) {
          const angle = (i / limbs) * Math.PI * 2 + random();
          add(s.rod([Math.cos(angle) * k * 0.4, Math.sin(angle) * k * 0.4, 0], [Math.cos(angle) * k * 1.15, Math.sin(angle) * k * 1.4, (random() - 0.5) * k], k * 0.09, skin, k * 0.02));
        }
        add(s.ball([k * 0.3, k * 0.3, k * 0.2], [0, k * 0.1, k * 0.45], flesh('#e8d86a'), 10));
        add(s.ball([k * 0.12, k * 0.2, k * 0.1], [0, k * 0.1, k * 0.62], flesh('#101214'), 8));
      }
      return g;
    };

    const jar = (x: number, y: number, z: number, r: number, h: number, mode: 'normal' | 'open' | 'tipped' = 'normal') => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      s.root.add(g);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, sx: number, sy: number, sz: number, py: number, shadow = true) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(sx, sy, sz);
        mesh.position.y = py;
        mesh.castShadow = shadow;
        g.add(mesh);
        return mesh;
      };
      const level = mode === 'open' ? 0.35 : mix(0.78, 0.92, random());
      add(jarGeometry, glass, r, h, r, h / 2, false);
      add(jarGeometry, fluids[Math.floor(random() * fluids.length)], r * 0.93, h * level, r * 0.93, h * level / 2 + 0.004, false);
      add(jarGeometry, solidGlass, r * 0.96, 0.008, r * 0.96, 0.004);
      const lid = add(jarGeometry, lids[Math.floor(random() * lids.length)], r * 0.9, 0.03, r * 0.9, h + 0.015);
      if (mode === 'open') {
        lid.position.set(r * 2.1, 0.015, 0.02);
      } else if (a.contents !== 'empty') {
        const body = specimen(r, h * level);
        body.position.y = h * level * 0.5;
        body.rotation.y = (random() - 0.5) * 0.9;
        g.add(body);
        floaters.push(body);
      }
      if (labelSet.length && random() < 0.92) {
        const label = add(labelGeometry, labelSet[Math.floor(random() * labelSet.length)], Math.min(r * 1.6, 0.14), Math.min(r * 1.2, 0.1), 1, h * 0.3);
        label.position.z = r + 0.002;
        label.rotation.z = (random() - 0.5) * 0.12 * (1 + mood.wear * 2);
      }
      if (mode === 'tipped') {
        g.rotation.z = (random() < 0.5 ? -1 : 1) * Math.PI / 2;
        g.rotation.y = (random() - 0.5) * 0.8;
        g.position.y += r;
        g.position.x -= Math.sign(g.rotation.z) * h * 0.3;
      }
      return g;
    };

    // Fill the shelves.
    const fill = mix(0.16, 1, a.count);
    let special = a.story === 'escaped' || a.story === 'taken' ? Math.floor(random() * Math.min(shelves.length, 3)) + (shelves.length > 3 ? 1 : 0) : -1;
    special = Math.min(special, shelves.length - 1);
    let placed = 0;
    shelves.forEach((shelf, row) => {
      const span = shelf.x1 - shelf.x0;
      const gap = a.unit === 'cabinet' ? 0.37 : a.unit === 'rack' ? 0.5 : 0.44;
      let x = shelf.x0 + random() * 0.05;
      const specialAt = row === special ? shelf.x0 + span * mix(0.3, 0.7, random()) : Infinity;
      let doneSpecial = false;
      while (x < shelf.x1 && placed < 30) {
        const r = mix(0.065, 0.115, random()), h = Math.min(gap - 0.075, mix(0.2, 0.36, random()) + r);
        if (x + r * 2 > shelf.x1) break;
        const here = x + r;
        if (!doneSpecial && here >= specialAt) {
          doneSpecial = true;
          if (a.story === 'escaped') {
            jar(here, shelf.y, 0.03, 0.085, 0.26, 'open');
            for (let i = 0; i < 4; i++) s.cylinder(0.03, 0.03, 0.004, [here + 0.02 * i, shelf.y + 0.003, 0.11 + i * 0.03], fluids[0], 10).castShadow = false;
            x += 0.36;
          } else {
            s.cylinder(0.08, 0.08, 0.003, [here + 0.03, shelf.y + 0.002, 0.04], s.material('#3a2a1e', { roughness: 1 }), 18).castShadow = false;
            if (labelSet.length) {
              const card = s.mesh(labelGeometry.clone(), labelSet[0], [here + 0.03, shelf.y + 0.004, 0.12]);
              card.scale.set(0.1, 0.07, 1);
              card.rotation.set(-Math.PI / 2, 0, 0.3);
            }
            x += 0.3;
          }
          continue;
        }
        if (random() < fill || (row === special && !doneSpecial && here > specialAt - 0.3)) {
          const tipped = a.story === 'toppled' && random() < 0.3 && h < span * 0.6;
          jar(here, shelf.y, (random() - 0.5) * 0.08 + 0.02, r, h, tipped ? 'tipped' : 'normal');
          placed++;
        }
        x += r * 2 + mix(0.07, 0.012, a.count) + random() * 0.03;
      }
    });
    if (placed === 0) jar(0, shelves[1].y, 0.02, 0.08, 0.26);

    // Floor stories.
    if (a.story === 'broken') {
      const fx = (random() - 0.5) * 0.6, fz = D / 2 + 0.35;
      const pool = s.cylinder(0.3, 0.3, 0.004, [fx, 0.003, fz], fluids[0], 24);
      pool.scale.z = 0.7;
      pool.castShadow = false;
      const shard = new THREE.MeshStandardMaterial({ color: '#d5ebe6', transparent: true, opacity: 0.6, roughness: 0.05 });
      for (let i = 0; i < 11; i++) {
        const bit = s.mesh(new THREE.TetrahedronGeometry(0.03 + random() * 0.05), shard, [fx + (random() - 0.5) * 0.55, 0.012, fz + (random() - 0.5) * 0.35]);
        bit.rotation.set(random() * 3, random() * 3, random() * 3);
        bit.scale.y = 0.35;
      }
      s.cylinder(0.075, 0.075, 0.03, [fx + 0.3, 0.015, fz + 0.12], lids[0], 16);
      if (a.contents !== 'empty') {
        const body = specimen(0.11, 0.3);
        body.rotation.x = -Math.PI / 2;
        body.position.set(fx - 0.05, 0.05, fz);
        s.root.add(body);
      }
    }
    if (a.story === 'escaped') {
      const dir = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 7; i++) {
        const spot = s.cylinder(0.05 - i * 0.004, 0.05 - i * 0.004, 0.004, [dir * (0.05 + i * 0.13), 0.003, D / 2 + 0.15 + i * 0.07 + Math.sin(i) * 0.04], fluids[0], 12);
        spot.scale.x = 1.6;
        spot.castShadow = false;
      }
    }

    const speed = mix(0.2, 1.3, mood.energy), lift = mix(0.002, 0.012, mood.energy);
    const home = floaters.map((body) => body.position.y);
    return s.finish({
      update: (_dt, time) => {
        floaters.forEach((body, index) => {
          body.position.y = home[index] + Math.sin(time * speed + index * 1.7) * lift;
          body.rotation.y += Math.sin(time * speed * 0.5 + index) * 0.0006;
        });
      },
    });
  },
});
