import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COATS = {
  orange: 'An orange tabby with darker stripes, the classic deli cat.',
  black: 'Solid black with yellow eyes, a shadow among the loaves.',
  tuxedo: 'Black with a white bib, muzzle and paws, dressed for work.',
  calico: 'White with orange and black patches.',
  grey: 'A grey striped tabby, a little moth-eaten.',
  white: 'All white with one blue eye and one gold.',
} as const;
const BRANDS = {
  primary: 'White bags with red, yellow and blue bands: soft supermarket white bread.',
  wheat: 'Brown and gold bags of wheat and seeded loaves.',
  blue: 'White bags with royal blue and red, a Latin American pan de caja brand.',
  dulce: 'Pink, yellow and teal bags of sweet bread and conchas.',
  mixed: 'Every brand at once, whatever the distributor dropped off.',
} as const;
const BANDS: Record<keyof typeof BRANDS, { bag: string[]; band: string[]; sign: string }> = {
  primary: { bag: ['#f6f3ea'], band: ['#d8232a', '#f2c21b', '#1e5bc6'], sign: 'FRESH BREAD' },
  wheat: { bag: ['#c98f4a', '#b77a3a', '#d9a65e'], band: ['#6f431b', '#e7b34a', '#5c7a2c'], sign: 'WHOLE GRAIN' },
  blue: { bag: ['#fbfaf5'], band: ['#1b3f9c', '#d8232a', '#1b3f9c'], sign: 'PAN FRESCO' },
  dulce: { bag: ['#f9dcc8', '#fbeec2'], band: ['#ef6aa0', '#f6c445', '#58b9b2'], sign: 'PAN DULCE' },
  mixed: { bag: ['#f6f3ea', '#c98f4a', '#f9dcc8', '#fbfaf5'], band: ['#d8232a', '#f2c21b', '#1e5bc6', '#5c7a2c', '#ef6aa0', '#6f431b', '#f08a24'], sign: 'BREAD 2 FOR $5' },
};

export default defineThing({
  questions: {
    coat: choice('What does the cat look like?', COATS),
    attitude: choice('What is the cat doing?', {
      loaf: 'Tucked into a loaf shape among the loaves, eyes half shut.',
      asleep: 'Curled tight and fast asleep.',
      watching: 'Sitting upright and staring straight at the customer.',
      hostile: 'Arched and bristling, ears flat, tail puffed.',
      sprawled: 'Flopped on its side with legs dangling off the shelf.',
    }),
    shelf: choice('Which shelf has the cat taken?', {
      top: 'The top shelf, looking down on everyone.',
      upper: 'The upper shelf at eye level.',
      lower: 'The lower shelf at knee height.',
      bottom: 'The bottom shelf by the floor.',
    }),
    brands: choice('What colours are the bread bags?', BRANDS),
    stock: score('How full is the rack?', ['Bare by night, a last squashed loaf', 'Picked over', 'Mostly full', 'Stacked full at dawn delivery']),
    rack: choice('What is the rack like?', {
      chrome: 'Bright chrome wire.',
      red: 'A red bakery-company rack with its header sign.',
      white: 'White epoxy wire, chipped at the corners.',
      black: 'Old black wire, bent and a little rusty.',
    }),
    extra: choice('What has been left with the rack?', {
      none: 'Nothing else.',
      bites: 'A hand-lettered warning that he bites.',
      employee: 'An employee-of-the-month card for the cat.',
      bowls: 'A food bowl and a water dish on the floor beside it.',
      trays: 'A stack of plastic bakery trays just delivered, still loaded.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.96, D = 0.46, SHELVES = [0.14, 0.54, 0.94, 1.34], H = 1.78;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wire = s.material({ chrome: '#dfe4e6', red: '#c22a24', white: '#f0eee6', black: '#2b2a2a' }[a.rack], a.rack === 'chrome' ? { metalness: 0.9, roughness: 0.22 } : { roughness: 0.55 });
    const lean = a.rack === 'black' ? 0.03 : 0;

    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.rod([x * W / 2, 0, z * D / 2], [x * W / 2 + lean, H - (z < 0 ? 0 : 0.3), z * D / 2], 0.014, wire);
      s.cylinder(0.022, 0.026, 0.03, [x * W / 2, 0.015, z * D / 2], s.material('#222'), 10);
    }
    for (const y of SHELVES) {
      for (const z of [-1, 1]) s.rod([-W / 2, y, z * D / 2], [W / 2, y, z * D / 2], 0.009, wire);
      for (const x of [-1, 1]) s.rod([x * W / 2, y, -D / 2], [x * W / 2, y, D / 2], 0.009, wire);
      for (let i = 1; i < 7; i++) s.rod([-W / 2, y, -D / 2 + i * D / 7], [W / 2, y, -D / 2 + i * D / 7], 0.004, wire);
      s.rod([-W / 2, y + 0.045, D / 2], [W / 2, y + 0.045, D / 2], 0.005, wire);
    }
    const brand = BANDS[a.brands];
    s.label(brand.sign, W - 0.04, 0.2, [lean, H - 0.1, -D / 2 + 0.016], a.rack === 'red' ? '#fff3c9' : '#b3241c', a.rack === 'red' ? '#b3241c' : '#f7efd2');
    s.box([W, 0.22, 0.012], [lean, H - 0.1, -D / 2 + 0.008], wire);

    // The cat, built facing +z with its length along x.
    const coat = { orange: '#d98432', black: '#1d1c1e', tuxedo: '#1d1c1e', calico: '#f1ece2', grey: '#8d9095', white: '#f3f0ea' }[a.coat];
    const stripe = { orange: '#a2551a', black: '#1d1c1e', tuxedo: '#1d1c1e', calico: '#f1ece2', grey: '#5a5d63', white: '#f3f0ea' }[a.coat];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d')!;
    g.fillStyle = coat;
    g.fillRect(0, 0, 128, 128);
    if (a.coat === 'orange' || a.coat === 'grey') {
      g.strokeStyle = stripe;
      g.lineWidth = 5;
      for (let y = 22; y < 118; y += 13) { g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, y + Math.sin(x * 0.2 + y) * 3); g.stroke(); }
    }
    if (a.coat === 'calico') for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 2 ? '#d98432' : '#232124';
      g.beginPath();
      g.ellipse(random() * 128, random() * 128, 12 + random() * 16, 10 + random() * 14, random() * 3, 0, 7);
      g.fill();
    }
    const fur = new THREE.CanvasTexture(canvas);
    fur.colorSpace = THREE.SRGBColorSpace;
    const pelt = new THREE.MeshStandardMaterial({ map: fur, roughness: 0.95 });
    const plain = new THREE.MeshStandardMaterial({ color: a.coat === 'calico' ? '#d98432' : coat, roughness: 0.95 });
    const pale = new THREE.MeshStandardMaterial({ color: a.coat === 'tuxedo' || a.coat === 'calico' || a.coat === 'white' ? '#f6f3ec' : a.coat === 'orange' ? '#f0c79a' : coat, roughness: 0.95 });
    const c = new Sculpture(context);
    const body = (rx: number, ry: number, rz: number, at: [number, number, number]) => {
      const mesh = c.ball([ry, rx, rz], at, pelt, 20);
      mesh.rotation.z = Math.PI / 2;
      return mesh;
    };
    const head = (x: number, y: number, z: number, eyes: 'half' | 'closed' | 'wide', flat = false) => {
      c.ball([0.078, 0.07, 0.07], [x, y, z], plain, 18);
      c.ball([0.036, 0.026, 0.03], [x, y - 0.022, z + 0.055], pale, 12);
      c.ball([0.009, 0.007, 0.007], [x, y - 0.012, z + 0.084], new THREE.MeshStandardMaterial({ color: '#d9828a' }), 8);
      for (const side of [-1, 1]) {
        const ear = c.mesh(new THREE.ConeGeometry(0.03, 0.06, 4), plain, [x + side * 0.047, y + (flat ? 0.045 : 0.07), z - 0.005]);
        ear.rotation.set(0, Math.PI / 4, flat ? -side * 1.1 : -side * 0.2);
        const iris = a.coat === 'white' ? (side < 0 ? '#5aa7e0' : '#e0b030') : a.coat === 'black' ? '#f0c020' : '#a8c838';
        if (eyes === 'closed') c.box([0.03, 0.005, 0.004], [x + side * 0.032, y + 0.012, z + 0.064], new THREE.MeshStandardMaterial({ color: '#141214' })).rotation.z = side * 0.25;
        else {
          const open = eyes === 'wide' ? 1 : 0.45;
          c.ball([0.019, 0.019 * open, 0.008], [x + side * 0.032, y + 0.014, z + 0.062], new THREE.MeshStandardMaterial({ color: iris, emissive: iris, emissiveIntensity: 0.35, roughness: 0.2 }), 12);
          c.ball([eyes === 'wide' ? 0.009 : 0.004, 0.017 * open, 0.004], [x + side * 0.032, y + 0.014, z + 0.069], new THREE.MeshStandardMaterial({ color: '#0c0b0c' }), 8);
        }
      }
    };
    const tail = new Sculpture(context);
    const paw = (x: number, y: number, z: number) => c.ball([0.028, 0.022, 0.035], [x, y, z], pale, 10);
    if (a.attitude === 'loaf') {
      body(0.21, 0.105, 0.12, [0, 0.1, 0]);
      head(0.17, 0.17, 0.05, 'half');
      paw(0.13, 0.02, 0.1); paw(0.19, 0.02, 0.09);
      tail.tube([[0, 0, 0], [-0.04, -0.02, 0.1], [0.08, -0.03, 0.16], [0.2, -0.03, 0.15]], 0.02, plain);
      tail.root.position.set(-0.19, 0.06, 0);
    } else if (a.attitude === 'asleep') {
      body(0.18, 0.09, 0.15, [0, 0.085, -0.02]);
      head(0.11, 0.075, 0.1, 'closed');
      paw(0.03, 0.02, 0.14);
      tail.tube([[0, 0, 0], [-0.05, -0.02, 0.12], [0.06, -0.03, 0.2], [0.2, -0.03, 0.19]], 0.022, plain);
      tail.root.position.set(-0.17, 0.06, 0);
    } else if (a.attitude === 'watching') {
      const seat = c.ball([0.1, 0.16, 0.11], [0, 0.15, -0.02], pelt, 20);
      seat.rotation.x = 0.15;
      c.ball([0.07, 0.11, 0.05], [0, 0.17, 0.055], pale, 14);
      head(0, 0.33, 0.04, 'wide');
      for (const side of [-1, 1]) { c.rod([side * 0.04, 0.2, 0.06], [side * 0.04, 0.02, 0.09], 0.02, plain); paw(side * 0.04, 0.02, 0.1); }
      tail.tube([[0, 0, 0], [0.1, -0.02, 0.06], [0.16, -0.02, 0.2], [0.17, -0.1, 0.25]], 0.02, plain);
      tail.root.position.set(0.06, 0.05, -0.06);
    } else if (a.attitude === 'hostile') {
      c.tube([[-0.16, 0.2, 0], [-0.06, 0.27, 0], [0.06, 0.26, 0], [0.16, 0.19, 0]], 0.072, pelt);
      head(0.22, 0.17, 0.035, 'wide', true);
      for (const x of [-0.14, -0.09, 0.1, 0.15]) { c.rod([x, 0.2, 0.03], [x, 0.02, 0.04], 0.018, plain); paw(x, 0.015, 0.05); }
      tail.rod([0, 0, 0], [-0.03, 0.15, 0], 0.03, plain, 0.04);
      tail.root.position.set(-0.19, 0.22, 0);
    } else {
      body(0.22, 0.075, 0.13, [0, 0.075, -0.03]);
      c.ball([0.13, 0.05, 0.09], [0.02, 0.06, 0.04], pale, 14);
      head(0.25, 0.075, 0.03, 'half');
      for (const x of [-0.13, -0.07, 0.08, 0.13]) { c.rod([x, 0.06, 0.05], [x + 0.01, 0.0, 0.25], 0.017, plain); paw(x + 0.01, -0.01, 0.26); }
      tail.tube([[0, 0, 0], [-0.08, -0.03, 0.08], [-0.1, -0.05, 0.24], [-0.1, -0.16, 0.26]], 0.02, plain);
      tail.root.position.set(-0.2, 0.06, 0);
    }
    c.root.add(tail.root);
    const catShelf = { bottom: 0, lower: 1, upper: 2, top: 3 }[a.shelf];
    const flip = random() < 0.5 ? -1 : 1, catX = (random() - 0.5) * 0.3, catScale = (a.attitude === 'watching' || a.attitude === 'hostile') && a.shelf !== 'top' ? 1.02 : 1.3;
    c.root.scale.set(flip * catScale, catScale, catScale);
    c.root.position.set(catX + SHELVES[catShelf] / H * lean, SHELVES[catShelf] + 0.012, a.attitude === 'sprawled' ? -0.03 : 0.04);
    s.root.add(c.root);

    // Bagged loaves: one shared profile, a brand band, an end square and the twisted bag tail.
    const lw = 0.118, lh = 0.115, ll = 0.3;
    const profile = new THREE.Shape();
    profile.moveTo(-lw / 2, 0); profile.lineTo(lw / 2, 0); profile.lineTo(lw / 2, lh * 0.5);
    profile.bezierCurveTo(lw * 0.62, lh * 1.18, -lw * 0.62, lh * 1.18, -lw / 2, lh * 0.5);
    profile.closePath();
    const loafGeometry = new THREE.ExtrudeGeometry(profile, { depth: ll, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 8 });
    loafGeometry.translate(0, 0, -ll / 2);
    const bandGeometry = new THREE.ExtrudeGeometry(profile, { depth: ll * 0.34, bevelEnabled: false, curveSegments: 8 });
    bandGeometry.translate(0, 0, -ll * 0.17);
    const tailGeometry = new THREE.ConeGeometry(0.036, 0.07, 8);
    const bags = brand.bag.map((colour) => s.material(colour, { roughness: 0.35 }));
    const bands = brand.band.map((colour) => s.material(colour, { roughness: 0.4 }));
    const loaf = (x: number, y: number, z: number, turn: number, squash = 1) => {
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      add(loafGeometry, pick(bags));
      const colour = pick(bands);
      add(bandGeometry, colour).scale.set(1.04, 1.035, 1);
      const end = add(new THREE.PlaneGeometry(lw * 0.6, lh * 0.5), colour);
      end.position.set(0, lh * 0.45, ll / 2 + 0.0095);
      const twist = add(tailGeometry, pick(bags));
      twist.rotation.x = -Math.PI / 2;
      twist.position.set(0, lh * 0.6, ll / 2 + 0.04);
      const clip = add(new THREE.BoxGeometry(0.022, 0.022, 0.006), pick(bands));
      clip.position.set(0, lh * 0.6, ll / 2 + 0.012);
      group.position.set(x, y, z);
      group.rotation.y = turn;
      group.scale.y = squash;
      s.root.add(group);
    };
    const fill = mix(0.06, 1.02, a.stock);
    const rolls: { at: [number, number, number]; size: number; color: string }[] = [];
    SHELVES.forEach((y, level) => {
      const sideways = level === 0 && random() < 0.6;
      const shift = y / H * lean;
      if (level === 1 && a.brands !== 'primary' || level === 0 && a.brands === 'dulce') {
        // A shelf of roll packs: six buns on a card.
        for (let i = 0; i < 4; i++) {
          const x = (i - 1.5) * 0.225 + shift;
          if (level === catShelf && Math.abs(x - catX) < 0.36 || random() > fill) continue;
          s.box([0.2, 0.012, 0.3], [x, y + 0.012, 0], pick(bands));
          const tone = a.brands === 'dulce' ? pick(['#f2a7c0', '#f3d27a', '#8a5a3a']) : pick(['#d9a45c', '#c98d48']);
          for (let r = 0; r < 6; r++) rolls.push({ at: [x + ((r % 2) - 0.5) * 0.095, y + 0.045, ((Math.floor(r / 2)) - 1) * 0.095], size: 0.046, color: tone });
        }
        return;
      }
      const count = sideways ? 3 : 7;
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * (sideways ? 0.31 : 0.132) + shift;
        if (level === catShelf && Math.abs(x - catX) < 0.31) continue;
        if (random() > fill) continue;
        const turn = (sideways ? Math.PI / 2 : 0) + (random() - 0.5) * mix(0.05, 0.5, mood.wear);
        loaf(x, y + 0.01, sideways ? 0.04 : 0.02, turn);
        if (a.stock > 0.72 && mood.density > 0.35 && random() < 0.7 && level !== catShelf) loaf(x, y + 0.01 + lh + 0.012, sideways ? 0.02 : 0, turn + (random() - 0.5) * 0.2);
      }
    });
    if (rolls.length) {
      const buns = s.scatter(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }), rolls);
      buns.scale.y = 1;
    }
    if (a.stock < 0.3) loaf(-0.2 + random() * 0.4, SHELVES[catShelf === 0 ? 1 : 0] + 0.01, 0.02, 1.2 + random(), 0.55);

    // What was left with it.
    if (a.extra === 'bites' || a.extra === 'employee') {
      const y = SHELVES[catShelf] - 0.075;
      const card = s.label(a.extra === 'bites' ? 'HE BITES' : 'BEST EMPLOYEE', a.extra === 'bites' ? 0.3 : 0.44, 0.12, [catX * 0.5 + (catShelf === 0 ? 0 : 0), catShelf === 0 ? SHELVES[1] - 0.075 : y, D / 2 + 0.012], a.extra === 'bites' ? '#b3241c' : '#1b2d7a', a.extra === 'bites' ? '#f6efcf' : '#fbe9a0');
      card.rotation.z = (random() - 0.5) * 0.16;
    }
    if (a.extra === 'bowls') {
      const steel = s.material('#c9cfd1', { metalness: 0.8, roughness: 0.3 });
      s.box([0.36, 0.006, 0.2], [W / 2 + 0.24, 0.003, 0.1], s.material('#7a3d3d'));
      for (const [i, x] of [W / 2 + 0.16, W / 2 + 0.32].entries()) {
        s.cylinder(0.06, 0.075, 0.04, [x, 0.026, 0.1], steel, 16);
        s.cylinder(0.052, 0.052, 0.006, [x, 0.046, 0.1], s.material(i ? '#7ab6d6' : '#7a4a2a', { roughness: i ? 0.1 : 0.9 }), 14);
      }
    }
    if (a.extra === 'trays') {
      const tray = s.material(pick(['#3d6fb5', '#b3302a', '#3d8f5a']));
      const tx = W / 2 + 0.36;
      for (let i = 0; i < 3; i++) {
        const y = i * 0.15;
        s.box([0.56, 0.02, 0.42], [tx, y + 0.01, 0], tray);
        for (const z of [-1, 1]) s.box([0.56, 0.13, 0.016], [tx, y + 0.075, z * 0.21], tray);
        for (const x of [-1, 1]) s.box([0.016, 0.13, 0.42], [tx + x * 0.28, y + 0.075, 0], tray);
        if (i === 2) for (let k = 0; k < 4; k++) if (random() < 0.85) loaf(tx + (k - 1.5) * 0.132, y + 0.02, 0, (random() - 0.5) * 0.1);
      }
    }
    if (mood.wear > 0.55) {
      const crumbs = Array.from({ length: 24 }, () => ({ at: [(random() - 0.5) * W, 0.004, (random() - 0.2) * D * 1.4] as [number, number, number], size: 0.006 + random() * 0.006, color: '#c9a56a' }));
      s.scatter(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), crumbs);
    }

    const breath = c.root.children[0];
    const baseY = breath.scale.y, speed = mix(0.8, 3.2, mood.energy), sway = a.attitude === 'asleep' ? 0.02 : mix(0.05, 0.3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        breath.scale.y = baseY * (1 + Math.sin(time * speed) * 0.025);
        tail.root.rotation.y = Math.sin(time * speed * 0.7) * sway;
      },
    });
  },
});
