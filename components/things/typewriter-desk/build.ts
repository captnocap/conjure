import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PAGES = {
  scoop: 'MAYOR INDICTED: a front-page scoop being hammered out.',
  stop: 'STOP THE PRESSES: a late bulletin that changes page one.',
  quit: 'I QUIT. A resignation letter, short and final.',
  chapter: 'CHAPTER ONE, and not much else: the novel in the bottom drawer.',
  thirty: 'The old end mark -30- alone on the page: the last story this paper will run.',
  crossed: 'Line after line struck out with XXXXX: nothing is coming out right.',
  blank: 'A clean blank sheet. Writer\'s block, or the moment before the first word.',
} as const;
const HEAD: Record<keyof typeof PAGES, string[]> = {
  scoop: ['MAYOR', 'INDICTED'], stop: ['STOP THE', 'PRESSES'], quit: ['I QUIT.'], chapter: ['CHAPTER', 'ONE'], thirty: ['- 30 -'], crossed: ['XXXXXXX', 'XXXXX'], blank: [],
};

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    page: choice('What does the page in the typewriter say?', PAGES),
    moment: choice('What is happening at the desk right now?', {
      typing: 'Mid-sentence: the page is half typed, a cigarette is burning in the ashtray, the writer has only just stepped away.',
      ripped: 'The page has just been ripped out and balled up; a torn strip is still caught in the roller.',
      jammed: 'The type bars are jammed in a tangled clump from hammering the keys too fast.',
      covered: 'A dust cover is pulled over the machine. Nobody writes here any more.',
    }),
    mess: score('How frantic is the mess?', ['Squared away, one sharpened pencil', 'A working desk', 'Crumpled drafts and loose pages everywhere', 'Buried: an avalanche of paper onto the floor']),
    owner: choice('Whose desk is it?', {
      cub: 'A cub reporter: a cup of sharp pencils and an apple, eager and tidy.',
      crime: 'A crime-beat veteran: a fedora tossed down beside a bottle and a glass.',
      society: 'The society columnist: a bud vase of flowers and a hand mirror.',
      sports: 'The sports writer: a baseball, a pennant and a small trophy.',
      editor: 'The night editor: a green-shaded banker\'s lamp and a pot of blue pencils.',
      obits: 'The obituary writer: a neat stack of black-edged files and one white lily.',
      gone: 'Nobody now: a cardboard box of belongings packed to carry out.',
    }),
    finish: choice('What colour is the steel desk?', {
      grey: 'Battleship tanker grey with a grey-green linoleum top.',
      green: 'Army olive green, government surplus.',
      tan: 'Sand tan with a brown top, an insurance office hand-me-down.',
      black: 'Black enamel with chrome trim, the publisher\'s floor.',
      seafoam: 'Two-tone seafoam and cream, optimistic 1950s.',
    }),
    machine: choice('What kind of typewriter is it?', {
      upright: 'A tall black cast-iron upright with round glass keys, heavy as an anvil.',
      portable: 'A low sage-green portable, a foreign correspondent\'s machine.',
      electric: 'A wide pale-blue office electric, humming and modern.',
      red: 'A lipstick-red designer portable, somebody\'s pride.',
    }),
    pedestals: choice('How is the desk built?', {
      double: 'A full double-pedestal desk, drawers down both sides.',
      single: 'A single pedestal of drawers with two bare legs on the other side.',
      wing: 'A double pedestal with a lower typing wing hinged out at one end.',
    }),
    chair: choice('Where is the chair?', {
      none: 'No chair at all.',
      tucked: 'A wooden swivel chair tucked squarely in.',
      back: 'Shoved back and spun aside, as if someone left in a hurry.',
      tipped: 'Lying on its side on the floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const mess = Math.min(1, a.mess * 0.8 + mood.density * 0.2 + mood.energy * 0.1);

    const palette = {
      grey: ['#8b9391', '#5f6f66'], green: ['#5f6b45', '#3f4a3c'], tan: ['#b9a481', '#6d5340'], black: ['#2b2d30', '#3d4347'], seafoam: ['#9fc9b8', '#ece3c8'],
    }[a.finish];
    const steel = s.material(palette[0], { metalness: 0.35, roughness: 0.45 });
    const lino = s.material(palette[1], { roughness: 0.8 });
    const chrome = s.material('#d5d9da', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#1d1f21', { roughness: 0.55 });
    const paperWhite = s.material(mood.wear > 0.6 ? '#e6dcb9' : '#f3efe2', { roughness: 0.9 });
    const TOP = 0.76;
    const W = 1.52, D = 0.76;

    // Desk: rolled-edge top, pedestals of drawers, a kneehole drawer and a modesty panel.
    s.box([W, 0.035, D], [0, TOP - 0.0175, 0], steel);
    s.box([W - 0.07, 0.006, D - 0.07], [0, TOP + 0.002, 0], lino);
    s.box([W + 0.004, 0.012, D + 0.004], [0, TOP - 0.03, 0], a.finish === 'black' ? chrome : dark);
    const pedestal = (x: number, layout: number[]) => {
      s.box([0.4, 0.56, 0.68], [x, 0.44, 0], steel);
      s.box([0.34, 0.1, 0.6], [x, 0.11, 0], dark);
      for (const fx of [-0.17, 0.17]) for (const fz of [-0.3, 0.3]) s.cylinder(0.018, 0.012, 0.06, [x + fx, 0.03, fz], chrome, 8);
      let y = 0.71;
      layout.forEach((h, index) => {
        const open = mess > 0.55 && index === layout.length - 1 && random() < 0.6 ? 0.18 + random() * 0.14 : 0;
        s.box([0.36, h - 0.012, 0.03 + open], [x, y - h / 2, 0.335 + open / 2], steel);
        s.box([0.14, 0.014, 0.022], [x, y - h * 0.32, 0.36 + open], chrome);
        s.box([0.05, 0.03, 0.004], [x, y - h * 0.62, 0.352 + open], paperWhite);
        if (open) for (let i = 0; i < 5; i++) s.box([0.3, 0.2 + random() * 0.05, 0.006], [x + (random() - 0.5) * 0.02, y - h + 0.14, 0.36 + i * (open - 0.04) / 5], s.material(i % 2 ? '#d1b06c' : '#c9a25c')).rotation.x = -0.08 - random() * 0.1;
        y -= h;
      });
    };
    pedestal(0.54, [0.14, 0.14, 0.27]);
    if (a.pedestals === 'single') {
      for (const z of [-0.3, 0.3]) {
        s.box([0.05, 0.72, 0.05], [-0.7, 0.36, z], steel);
        s.cylinder(0.02, 0.014, 0.03, [-0.7, 0.015, z], chrome, 8);
      }
      s.box([0.03, 0.05, 0.6], [-0.7, 0.2, 0], steel);
    } else pedestal(-0.54, [0.275, 0.275]);
    s.box([0.66, 0.075, 0.6], [0, 0.69, 0.02], steel);
    s.box([0.16, 0.012, 0.02], [0, 0.69, 0.33], chrome);
    s.box([W - 0.42, 0.42, 0.02], [0, 0.5, -0.34], steel);

    // The typewriter sits on the desk, or on a lower wing swung out to the left.
    const wing = a.pedestals === 'wing';
    const tx = wing ? -1.06 : -0.02, ty = wing ? 0.66 : TOP + 0.005, tz = wing ? 0.02 : 0.06;
    if (wing) {
      s.box([0.6, 0.03, 0.46], [-1.06, 0.645, 0.02], steel);
      s.box([0.54, 0.005, 0.4], [-1.06, 0.662, 0.02], lino);
      s.rod([-0.78, 0.2, 0.02], [-1.3, 0.63, 0.02], 0.014, chrome);
      s.rod([-1.3, 0.63, -0.16], [-1.3, 0.63, 0.2], 0.014, chrome);
    }
    const kind = a.machine;
    const tall = kind === 'upright' ? 1.25 : kind === 'electric' ? 0.9 : 0.8;
    const wide = kind === 'electric' ? 0.46 : kind === 'upright' ? 0.36 : 0.32;
    const shell = s.material({ upright: '#17181a', portable: '#7d927a', electric: '#a9c1cf', red: '#c2272d' }[kind], { roughness: 0.3, metalness: 0.25 });
    const type = new THREE.Group();
    type.position.set(tx, ty, tz);
    type.rotation.y = (random() - 0.5) * 0.2;
    type.scale.setScalar(1.25);
    s.root.add(type);
    const put = <T extends THREE.Object3D>(node: T) => { type.add(node); return node; };
    const profile = new THREE.Shape();
    for (const [index, [z, y]] of ([[0.17, 0], [0.17, 0.03], [0.03, 0.085 * tall], [0.02, 0.125 * tall], [-0.15, 0.125 * tall], [-0.15, 0]] as const).entries()) index ? profile.lineTo(z, y) : profile.moveTo(z, y);
    const body = put(s.mesh(new THREE.ExtrudeGeometry(profile, { depth: wide, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), shell));
    body.rotation.y = -Math.PI / 2;
    body.position.set(wide / 2, 0, 0);
    if (kind === 'upright') put(s.label('ROYAL', 0.12, 0.022, [0, 0.105 * tall, 0.03], '#d8b24a', '#17181a')).rotation.x = -0.25;
    // Four banked rows of keys in one instanced mesh.
    const keyCap = new THREE.CylinderGeometry(0.0095, 0.0095, 0.008, 10);
    const keyMaterial = s.material(kind === 'upright' ? '#ece5cf' : kind === 'electric' ? '#f1f1ec' : '#26282a', { roughness: 0.35 });
    const keys = new THREE.InstancedMesh(keyCap, keyMaterial, 44);
    const slopeY = (z: number) => 0.03 + (0.17 - z) / 0.14 * (0.085 * tall - 0.03);
    const matrix = new THREE.Matrix4();
    for (let row = 0; row < 4; row++) for (let col = 0; col < 11; col++) {
      const z = 0.152 - row * 0.03;
      matrix.makeTranslation((col - 5 + (row % 2) * 0.5) * (wide - 0.07) / 11, slopeY(z) + 0.02, z);
      keys.setMatrixAt(row * 11 + col, matrix);
    }
    keys.castShadow = true;
    put(keys);
    put(s.box([wide * 0.55, 0.008, 0.016], [0, slopeY(0.172) + 0.016, 0.176], keyMaterial));
    // Carriage, rubber platen, knobs and the return lever.
    const carriage = new THREE.Group();
    const shift = a.moment === 'covered' ? 0 : (random() - 0.5) * 0.14;
    carriage.position.set(shift, 0.125 * tall, -0.08);
    put(carriage);
    const onCarriage = <T extends THREE.Object3D>(node: T) => { carriage.add(node); return node; };
    onCarriage(s.box([wide + 0.1, 0.035, 0.1], [0, 0.015, 0], dark));
    const platen = onCarriage(s.cylinder(0.024, 0.024, wide + 0.06, [0, 0.05, 0], dark, 16));
    platen.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) onCarriage(s.cylinder(0.032, 0.032, 0.022, [side * (wide / 2 + 0.05), 0.05, 0], dark, 14)).rotation.z = Math.PI / 2;
    onCarriage(s.rod([-wide / 2, 0.082, 0.012], [wide / 2, 0.082, 0.012], 0.004, chrome));
    if (kind !== 'electric') {
      onCarriage(s.rod([-wide / 2 - 0.03, 0.04, 0.02], [-wide / 2 - 0.07, 0.07, 0.13], 0.006, chrome));
      onCarriage(s.ball([0.012, 0.012, 0.012], [-wide / 2 - 0.07, 0.07, 0.13], chrome, 10));
    }
    // Type basket: a crescent of bars, tangled upward when jammed.
    const basket = put(s.ring(0.065, 0.012, [0, 0.118 * tall, 0.0], chrome, Math.PI));
    basket.rotation.x = -Math.PI / 2 + 0.5;
    basket.rotation.z = Math.PI;
    if (a.moment === 'jammed') for (let i = 0; i < 7; i++) put(s.rod([(i - 3) * 0.014, 0.115 * tall, 0.02], [(random() - 0.5) * 0.03, 0.125 * tall + 0.07 + random() * 0.03, -0.045], 0.0028, chrome));

    // The page.
    const pageTexture = paint(256, 320, (g) => {
      g.fillStyle = mood.wear > 0.6 ? '#e9dfbd' : '#f6f2e6';
      g.fillRect(0, 0, 256, 320);
      g.fillStyle = '#1c1c1e';
      g.textAlign = 'center';
      g.font = 'bold 44px monospace';
      const head = HEAD[a.page];
      head.forEach((line, index) => g.fillText(line, 128, 62 + index * 50, 236));
      g.fillStyle = '#3a3a3e';
      const from = 50 + head.length * 52, rows = a.page === 'blank' || a.page === 'thirty' || a.page === 'quit' ? 0 : 5;
      for (let row = 0; row < rows; row++) {
        const end = row === rows - 1 ? 60 + random() * 90 : 226 - random() * 20;
        for (let x = 22; x < end; x += 9 + random() * 3) {
          const word = 18 + random() * 34;
          if (a.page === 'crossed') { g.font = 'bold 15px monospace'; g.textAlign = 'left'; g.fillText('XXXX', x, from + row * 24 + 6); }
          else g.fillRect(x, from + row * 24, Math.min(word, end - x), 5);
          x += word;
        }
      }
    });
    const pageMaterial = new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 0.9, side: THREE.DoubleSide });
    if (a.moment === 'typing' || a.moment === 'jammed') {
      const geometry = new THREE.PlaneGeometry(0.24, 0.3, 1, 10);
      const at = geometry.attributes.position;
      for (let i = 0; i < at.count; i++) { const t = (at.getY(i) + 0.15) / 0.3; at.setZ(i, -t * t * 0.07); }
      geometry.computeVertexNormals();
      const sheet = onCarriage(s.mesh(geometry, pageMaterial, [0, 0.215, -0.022]));
      sheet.rotation.x = -0.12;
    } else {
      pageTexture.dispose();
      pageMaterial.dispose();
    }
    if (a.moment === 'ripped') {
      const scrap = new THREE.Shape();
      scrap.moveTo(-0.1, 0);
      for (let i = 0; i <= 10; i++) scrap.lineTo(-0.1 + i * 0.02, 0.03 + random() * 0.05);
      scrap.lineTo(0.1, 0);
      onCarriage(s.mesh(new THREE.ShapeGeometry(scrap), new THREE.MeshStandardMaterial({ color: '#f3efe2', side: THREE.DoubleSide, roughness: 0.9 }), [0, 0.07, -0.02])).rotation.x = -0.15;
    }
    if (a.moment === 'covered') {
      const cover = s.material('#6f6a5c', { roughness: 0.95 });
      put(s.box([wide + 0.16, 0.2 * tall + 0.04, 0.38], [0, (0.2 * tall + 0.04) / 2, 0.01], cover));
      put(s.box([wide + 0.1, 0.03, 0.2], [0, 0.2 * tall + 0.05, -0.05], cover));
      put(s.box([wide + 0.18, 0.012, 0.4], [0, 0.012, 0.01], s.material('#565246')));
    }

    // Free desk surface to the right of the machine (the whole top when it is on the wing).
    const spot = (x: number, z: number): [number, number, number] => [x, TOP + 0.005, z];
    // Ashtray with butts, and a cigarette burning if someone was just here.
    const [ax, , az] = spot(wing ? -0.1 : 0.4, 0.22);
    s.lathe([[0, 0.004], [0.05, 0.004], [0.062, 0.022], [0.055, 0.024], [0.045, 0.01], [0, 0.01]], s.material('#b98a3a', { roughness: 0.15, metalness: 0.2 }), [ax, TOP + 0.005, az]);
    const butt = s.material('#e8dcc0');
    for (let i = 0; i < Math.round(mix(1, 9, mess)); i++) {
      const angle = random() * 6.28, r = random() * 0.03;
      s.rod([ax + Math.cos(angle) * r, TOP + 0.02, az + Math.sin(angle) * r], [ax + Math.cos(angle + 1) * (r + 0.02), TOP + 0.026 + random() * 0.01, az + Math.sin(angle + 1) * (r + 0.02)], 0.004, butt);
    }
    let smoke: THREE.Mesh | null = null;
    if (a.moment === 'typing' || a.moment === 'jammed') {
      s.rod([ax + 0.02, TOP + 0.03, az], [ax + 0.1, TOP + 0.034, az + 0.03], 0.004, butt);
      s.ball([0.005, 0.005, 0.005], [ax + 0.02, TOP + 0.03, az], s.material('#ff6a2a', { emissive: '#ff5a1a', emissiveIntensity: 1.5 }), 8);
      const wisp: [number, number, number][] = [];
      for (let i = 0; i < 7; i++) wisp.push([ax + 0.02 + Math.sin(i * 1.3) * 0.02 * i * 0.4, TOP + 0.035 + i * 0.06, az + Math.cos(i * 1.7) * 0.015 * i * 0.4]);
      smoke = s.tube(wisp, 0.006, new THREE.MeshStandardMaterial({ color: '#dcdcdc', transparent: true, opacity: 0.35, depthWrite: false }));
      smoke.castShadow = false;
    }
    // Coffee mug and the rings it has left.
    const [mx, , mz] = spot(wing ? -0.38 : 0.56, -0.12);
    s.cylinder(0.04, 0.035, 0.09, [mx, TOP + 0.05, mz], s.material('#e9e4d6', { roughness: 0.3 }), 16);
    s.cylinder(0.034, 0.034, 0.004, [mx, TOP + 0.092, mz], s.material('#3a2414', { roughness: 0.2 }), 16);
    s.ring(0.026, 0.006, [mx + 0.045, TOP + 0.05, mz], s.material('#e9e4d6')).rotation.y = 0;
    const stain = new THREE.MeshStandardMaterial({ color: '#5b3a1c', transparent: true, opacity: 0.55, roughness: 0.6 });
    for (let i = 0; i < 1 + Math.round(mood.wear * 3 + mess * 2); i++) {
      const ring = s.mesh(new THREE.RingGeometry(0.03, 0.038, 24), stain, [mx - 0.1 - random() * 0.22, TOP + 0.0062 + i * 0.0002, mz + 0.08 + random() * 0.3]);
      ring.rotation.x = -Math.PI / 2;
      ring.castShadow = false;
    }
    // Reporter's notebook, flipped open, with a pencil.
    const note = new THREE.Group();
    note.position.set(wing ? 0.18 : -0.42, TOP + 0.005, 0.2);
    note.rotation.y = (random() - 0.5) * 0.8;
    s.root.add(note);
    note.add(s.box([0.1, 0.014, 0.16], [0, 0.007, 0], paperWhite));
    note.add(s.box([0.1, 0.004, 0.15], [0, 0.004, -0.155], s.material('#2f4a63')));
    const spiral = s.cylinder(0.008, 0.008, 0.1, [0, 0.012, -0.08], chrome, 8);
    spiral.rotation.z = Math.PI / 2;
    note.add(spiral);
    for (let i = 0; i < 5; i++) note.add(s.box([0.07 - random() * 0.03, 0.001, 0.004], [-0.005, 0.0145, -0.05 + i * 0.022], dark));
    note.add(s.rod([0.07, 0.006, -0.06], [0.1, 0.006, 0.1], 0.004, s.material('#e2b23a')));

    // Loose sheets, a copy stack and crumpled drafts, by the mess.
    const sheets = Math.round(mess * 9);
    for (let i = 0; i < sheets; i++) {
      const sheet = s.box([0.21, 0.0015, 0.28], [(random() - 0.5) * 1.2, TOP + 0.008 + i * 0.002, (random() - 0.5) * 0.4 - 0.12], paperWhite);
      sheet.rotation.y = random() * 3;
      if (i > 5) { sheet.position.set((random() - 0.5) * 1.4, 0.003 + i * 0.001, 0.5 + random() * 0.3); }
    }
    const stackHeight = mix(0.01, 0.12, mess);
    s.box([0.22, stackHeight, 0.29], [wing ? -0.5 : -0.56, TOP + 0.005 + stackHeight / 2, -0.18], paperWhite).rotation.y = 0.1;
    const balls = Math.round(mess * mess * 16) + (a.moment === 'ripped' ? 3 : 0);
    if (balls) {
      const wad = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color: '#efeadb', roughness: 0.95, flatShading: true }), balls);
      const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
      for (let i = 0; i < balls; i++) {
        const onDesk = i < 4;
        const size = 0.8 + random() * 0.6;
        if (onDesk) v.set(tx + (random() - 0.5) * 0.7 + 0.2, TOP + 0.005 + 0.03 * size, 0.1 + random() * 0.22);
        else v.set((random() - 0.5) * 1.6, 0.03 * size, 0.46 + random() * 0.4);
        q.setFromEuler(e.set(random() * 6, random() * 6, random() * 6));
        wad.setMatrixAt(i, matrix.compose(v, q, sc.set(size, size * (0.7 + random() * 0.3), size)));
      }
      wad.castShadow = true;
      s.root.add(wad);
    }

    // Whose desk: one telling group of props at the back right corner.
    const px = wing ? 0.42 : 0.5, pz = -0.2, py = TOP + 0.005;
    let lampGlow: THREE.MeshStandardMaterial | null = null;
    if (a.owner === 'cub') {
      s.cylinder(0.035, 0.03, 0.09, [px, py + 0.045, pz], s.material('#3d6e8c'), 14);
      for (let i = 0; i < 6; i++) s.rod([px + (random() - 0.5) * 0.03, py + 0.05, pz + (random() - 0.5) * 0.03], [px + (random() - 0.5) * 0.08, py + 0.19, pz + (random() - 0.5) * 0.08], 0.004, s.material('#e2b23a'));
      s.ball([0.038, 0.035, 0.038], [px - 0.14, py + 0.035, pz], s.material('#c8312b', { roughness: 0.3 }), 14);
      s.rod([px - 0.14, py + 0.065, pz], [px - 0.135, py + 0.085, pz], 0.002, dark);
    } else if (a.owner === 'crime') {
      const felt = s.material('#4a4138', { roughness: 0.95 });
      s.lathe([[0, 0.11], [0.06, 0.115], [0.085, 0.1], [0.09, 0.03], [0.16, 0.02], [0.17, 0.028], [0.16, 0.012], [0, 0.012]], felt, [px - 0.02, py, pz]).rotation.y = 0.5;
      s.cylinder(0.091, 0.091, 0.02, [px - 0.02, py + 0.04, pz], dark, 20);
      s.lathe([[0, 0], [0.035, 0], [0.035, 0.14], [0.012, 0.19], [0.012, 0.24], [0.016, 0.24], [0.016, 0.25], [0, 0.25]], s.material('#7a4516', { roughness: 0.15, transparent: true, opacity: 0.85 }), [px - 0.24, py, pz - 0.03]);
      s.cylinder(0.022, 0.018, 0.045, [px - 0.3, py + 0.022, pz + 0.07], s.material('#cfd8d8', { roughness: 0.1, transparent: true, opacity: 0.6 }), 12);
    } else if (a.owner === 'society') {
      s.lathe([[0, 0], [0.03, 0], [0.04, 0.05], [0.015, 0.12], [0.02, 0.15], [0, 0.15]], s.material('#d7e5ee', { roughness: 0.15 }), [px, py, pz]);
      for (let i = 0; i < 4; i++) {
        const top: [number, number, number] = [px + (random() - 0.5) * 0.14, py + 0.26 + random() * 0.08, pz + (random() - 0.5) * 0.14];
        s.rod([px, py + 0.14, pz], top, 0.003, s.material('#4f7a3c'));
        s.ball([0.028, 0.02, 0.028], top, s.material(['#e56a8d', '#f2c14e', '#f4f0e6', '#c8312b'][i], { roughness: 0.6 }), 10);
      }
      s.cylinder(0.05, 0.05, 0.006, [px - 0.2, py + 0.003, pz + 0.04], chrome, 20);
      s.box([0.02, 0.006, 0.09], [px - 0.2, py + 0.003, pz + 0.13], s.material('#c8a13a', { metalness: 0.7, roughness: 0.3 }));
    } else if (a.owner === 'sports') {
      s.ball([0.037, 0.037, 0.037], [px - 0.16, py + 0.037, pz + 0.08], s.material('#f1ede0'), 14);
      s.ring(0.037, 0.002, [px - 0.16, py + 0.037, pz + 0.08], s.material('#c8312b')).rotation.x = 0.8;
      const gold = s.material('#d6ac3a', { metalness: 0.8, roughness: 0.25 });
      s.box([0.08, 0.04, 0.08], [px, py + 0.02, pz], s.material('#3a2618'));
      s.lathe([[0, 0], [0.012, 0], [0.012, 0.05], [0.045, 0.12], [0.05, 0.17], [0.04, 0.17], [0, 0.07]], gold, [px, py + 0.04, pz]);
      s.rod([px + 0.15, py, pz - 0.06], [px + 0.15, py + 0.34, pz - 0.06], 0.004, dark);
      const flag = new THREE.Shape();
      flag.moveTo(0, 0); flag.lineTo(0, 0.1); flag.lineTo(-0.26, 0.05); flag.closePath();
      s.mesh(new THREE.ShapeGeometry(flag), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8312b' : '#27477a', side: THREE.DoubleSide, roughness: 0.9 }), [px + 0.15, py + 0.23, pz - 0.06]);
    } else if (a.owner === 'editor') {
      const brass = s.material('#b58e3a', { metalness: 0.8, roughness: 0.3 });
      s.box([0.2, 0.02, 0.1], [px, py + 0.01, pz], brass);
      s.rod([px, py + 0.02, pz], [px, py + 0.3, pz], 0.008, brass);
      lampGlow = s.material('#1f7a4d', { emissive: '#2fae6e', emissiveIntensity: mix(1.1, 0.3, Math.abs(mood.daylight - 0.5) < 0.2 ? 1 : 0), roughness: 0.2, side: THREE.DoubleSide });
      const shade = s.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 16, 1, false, 0, Math.PI), lampGlow, [px, py + 0.3, pz + 0.02]);
      shade.rotation.z = Math.PI / 2;
      shade.rotation.y = Math.PI / 2;
      shade.rotation.set(0, 0, Math.PI / 2);
      s.cylinder(0.04, 0.035, 0.08, [px - 0.24, py + 0.04, pz], s.material('#a3472f'), 14);
      for (let i = 0; i < 6; i++) s.rod([px - 0.24 + (random() - 0.5) * 0.03, py + 0.05, pz], [px - 0.24 + (random() - 0.5) * 0.09, py + 0.18, pz + (random() - 0.5) * 0.09], 0.0045, s.material('#2456b8'));
    } else if (a.owner === 'obits') {
      for (let i = 0; i < 6; i++) {
        s.box([0.24, 0.012, 0.31], [px - 0.05 + (random() - 0.5) * 0.01, py + 0.006 + i * 0.013, pz + 0.02], s.material('#cdb279'));
        s.box([0.245, 0.004, 0.03], [px - 0.05, py + 0.012 + i * 0.013, pz + 0.16], dark);
      }
      s.cylinder(0.02, 0.016, 0.13, [px - 0.26, py + 0.065, pz], s.material('#cfd8d8', { transparent: true, opacity: 0.6, roughness: 0.1 }), 12);
      s.rod([px - 0.26, py + 0.02, pz], [px - 0.24, py + 0.3, pz + 0.02], 0.003, s.material('#4f7a3c'));
      s.lathe([[0.004, 0], [0.012, 0.03], [0.035, 0.06], [0.03, 0.065], [0, 0.02]], s.material('#f6f3ea', { side: THREE.DoubleSide }), [px - 0.24, py + 0.29, pz + 0.02]).rotation.x = 0.5;
    } else {
      const card = s.material('#b08a5a', { roughness: 0.95 });
      s.box([0.36, 0.24, 0.28], [px - 0.06, py + 0.12, pz + 0.02], card);
      for (const side of [-1, 1]) s.box([0.36, 0.006, 0.14], [px - 0.06, py + 0.27, pz + 0.02 + side * 0.17], card).rotation.x = side * -0.9;
      s.box([0.18, 0.14, 0.02], [px - 0.1, py + 0.28, pz], s.material('#2c2c2c'));
      s.box([0.15, 0.11, 0.005], [px - 0.1, py + 0.28, pz + 0.012], s.material('#d9d2bd'));
      s.rod([px + 0.06, py + 0.2, pz + 0.05], [px + 0.08, py + 0.4, pz + 0.07], 0.003, s.material('#4f7a3c'));
      s.ball([0.05, 0.035, 0.05], [px + 0.08, py + 0.41, pz + 0.07], s.material('#58864a'), 10);
    }

    // Swivel chair.
    if (a.chair !== 'none') {
      const wood = s.material('#7a5232', { roughness: 0.55 });
      const chair = new THREE.Group();
      const part = (mesh: THREE.Object3D) => { chair.add(mesh); return mesh; };
      part(s.cylinder(0.23, 0.22, 0.05, [0, 0.47, 0], wood, 20)).scale.z = 0.95;
      part(s.cylinder(0.02, 0.025, 0.3, [0, 0.3, 0], chrome, 10));
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + 0.6;
        part(s.rod([0, 0.16, 0], [Math.cos(angle) * 0.27, 0.06, Math.sin(angle) * 0.27], 0.02, wood));
        part(s.ball([0.03, 0.03, 0.03], [Math.cos(angle) * 0.27, 0.03, Math.sin(angle) * 0.27], dark, 10));
      }
      for (let i = -3; i <= 3; i++) part(s.rod([i * 0.055, 0.49, 0.19 - Math.abs(i) * 0.012], [i * 0.065, 0.84, 0.25 - Math.abs(i) * 0.02], 0.009, wood));
      const rail = part(s.ring(0.235, 0.018, [0, 0.85, 0.02], wood, Math.PI * 0.62));
      rail.rotation.x = Math.PI / 2;
      rail.rotation.z = Math.PI * 0.19;
      const cx = wing ? -0.5 : 0;
      if (a.chair === 'tucked') chair.position.set(cx, 0, 0.5);
      else if (a.chair === 'back') { chair.position.set(cx - 0.3 - random() * 0.15, 0, 0.8 + random() * 0.1); chair.rotation.y = 0.9 + random() * 1.2; }
      else { chair.position.set(cx - 0.3, 0.23, 0.85); chair.rotation.set(0, 0.4 + random(), Math.PI / 2); }
      s.root.add(chair);
    }

    const sway = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (smoke) { smoke.rotation.y = Math.sin(time * sway) * 0.25; smoke.position.x = Math.sin(time * sway * 0.7) * 0.004; }
        if (lampGlow) lampGlow.emissiveIntensity = 1 + Math.sin(time * 9) * 0.03 * mood.energy;
      },
    });
  },
});
