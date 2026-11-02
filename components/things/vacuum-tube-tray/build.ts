import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
type State = 'off' | 'on' | 'weak' | 'dead' | 'cracked';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BRANDS = {
  red: { paper: '#f1e6c8', main: '#c4302a', second: '#1f1f22' },
  blue: { paper: '#f3d54a', main: '#1f4f9a', second: '#1f4f9a' },
  orange: { paper: '#e9842c', main: '#1c2f6a', second: '#f4ecd4' },
  green: { paper: '#efe8cf', main: '#2e7a4c', second: '#b8912e' },
  military: { paper: '#a98c5e', main: '#2a241c', second: '#2a241c' },
} as const;
// Glass outline (radius, height) per shape, envelope height, base radius.
const KINDS = [
  { tall: 0.085, base: 0.0155, r: 0.021, profile: [[0.012, 0], [0.0125, 0.02], [0.021, 0.04], [0.021, 0.058], [0.013, 0.076], [0.0001, 0.085]] },
  { tall: 0.066, base: 0.0155, r: 0.0155, profile: [[0.0145, 0], [0.0145, 0.052], [0.01, 0.063], [0.0001, 0.066]] },
  { tall: 0.1, base: 0.0155, r: 0.019, profile: [[0.014, 0], [0.019, 0.03], [0.019, 0.075], [0.012, 0.094], [0.0001, 0.1]] },
  { tall: 0.05, base: 0, r: 0.0095, profile: [[0.009, 0], [0.0095, 0.038], [0.004, 0.046], [0.0001, 0.052]] },
  { tall: 0.055, base: 0.0155, r: 0.0155, profile: [[0.0145, 0], [0.0145, 0.05], [0.011, 0.055], [0.0001, 0.055]] },
  { tall: 0.13, base: 0.02, r: 0.03, profile: [[0.016, 0], [0.03, 0.035], [0.03, 0.09], [0.018, 0.12], [0.0001, 0.13]] },
] as const;
const TYPES = ['6V6', '12AX7', 'EL84', '5U4', '6L6', 'ECC83', '80', '6SN7', 'KT66', '35Z5'];

export default defineThing({
  questions: {
    stock: score('How many tray positions are occupied?', ['Only a few left', 'A partial tray', 'Most positions filled', 'Every position filled']),
    order: choice('How is the assortment sorted?', { random: 'Mixed without an obvious order.', rows: 'Like envelope shapes together in rows.', columns: 'Matching types in columns.', alternating: 'Alternating shapes in a checkerboard arrangement.' }),
    cartons: choice('How are the carton tops closed?', { sealed: 'Tucked closed.', open: 'Open with short flaps standing up.', folded: 'Open with the flaps folded outward.', banded: 'Closed with a narrow paper band around each carton.' }),
    pins: choice('What pin bases do the loose tubes have?', { octal: 'Eight pins round a central key.', miniature: 'A close ring of nine fine pins.', four: 'Four thick old-style pins.', loctal: 'Eight thin pins with a prominent locking spigot.' }),
    getter: choice('Where is the getter deposit visible?', { top: 'A bright silver flash near the crown.', side: 'A silver patch on the side.', dark: 'A dark mirror-like crown.', clear: 'Little visible deposit, a clearer envelope.' }),
    lining: choice('What lines the bottom of the tray?', { card: 'Plain buff card.', felt: 'A green felt pad.', corrugated: 'Corrugated packing card.', tissue: 'Pale folded tissue paper.' }),
    records: choice('What test record lies alongside?', { none: 'No paperwork.', card: 'A test-results card with ticks and crosses.', sockets: 'A socket-pin reference sheet.', book: 'A small open valve-data booklet.' }),
    shapes: choice('What shapes are the tubes?', {
      mixed: 'An assortment: fat shouldered bottles, straight tubulars, little miniatures, the odd black metal one.',
      bottles: 'Big old shouldered "coke bottle" valves on brown bakelite bases.',
      miniature: 'Small all-glass miniatures, thin as a thumb with a pointed tip.',
      metal: 'Squat black metal-cased tubes mixed with plain glass tubulars.',
      giants: 'Large transmitting tubes with swollen envelopes and metal caps on top.',
    }),
    packing: choice('How are they kept in the tray?', {
      boxed: 'Every one in its own printed carton, standing in neat rows.',
      half: 'Half still boxed, half standing loose in the cells.',
      upright: 'All out of their boxes, standing upright with pins pushed into a punched card.',
      loose: 'Loose and jumbled on their sides on a bed of tissue.',
    }),
    brand: choice('What do the printed cartons look like?', {
      red: 'Cream card with a red band and black lettering.',
      blue: 'Yellow card with royal blue print.',
      orange: 'Orange and navy with a cream stripe.',
      green: 'Cream with green and gold, an old continental make.',
      military: 'Plain brown military surplus with stencilled numbers.',
    }),
    dead: score('How many of the tubes are dead?', ['All good, tested and marked', 'One or two duds', 'About half are dead', 'Nearly all dead: milky white glass and red crosses']),
    tester: choice('What is happening at the valve tester beside the tray?', {
      good: 'A tube glows orange in the socket and the meter needle sits in the green: GOOD.',
      weak: 'A tube glows dimly and the needle hovers at the question mark.',
      bad: 'A dark tube sits in the socket, needle slumped in the red: REPLACE.',
      empty: 'The tester is switched off with its socket empty.',
      none: 'There is no tester, only the tray.',
    }),
    cracked: choice('Where is the cracked tube?', {
      front: 'Lying out in front of the tray with shards of glass around it.',
      tray: 'Still standing in the tray, its top broken off.',
      none: 'None are cracked.',
    }),
    tray: choice('What kind of tray is it?', {
      cardboard: 'A shallow brown cardboard tray with card dividers.',
      wooden: 'A wooden drawer pulled from a parts cabinet.',
      tin: 'A dented biscuit tin without its lid.',
      crate: 'A grey fibre trade tray with a paper stock label.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const brand = BRANDS[a.brand];
    const warm = mix(0.9, 1.7, mood.warmth);
    const bakelite = s.material('#3a2418', { roughness: 0.35 });
    const plate = s.material('#5f6466', { metalness: 0.5, roughness: 0.5 });
    const silver = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.15 });
    const brass = s.material('#b8913f', { metalness: 0.7, roughness: 0.35 });
    const blackMetal = s.material('#1d1e20', { metalness: 0.6, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: '#a9c4c6', transparent: true, opacity: 0.5, roughness: 0.05, depthWrite: false });
    const glassOn = new THREE.MeshStandardMaterial({ color: '#ffd7a0', emissive: '#ff7a1c', emissiveIntensity: 1.2 * warm, transparent: true, opacity: 0.62, roughness: 0.1, depthWrite: false });
    const glassWeak = new THREE.MeshStandardMaterial({ color: '#e8d4b8', emissive: '#c2501a', emissiveIntensity: 0.6, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
    const glassDead = s.material('#cdc8b6', { roughness: 0.7 });
    const heaterOn = new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff6a10', emissiveIntensity: 2.6 * warm });

    const valve = (kind: number, state: State) => {
      const k = KINDS[kind], g = new THREE.Group();
      const pinCount = a.pins === 'four' ? 4 : a.pins === 'miniature' ? 9 : 8;
      const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(a.pins === 'four' ? 0.0014 : 0.0008, a.pins === 'four' ? 0.0014 : 0.0008, 0.007, 6), brass, pinCount);
      const pinMatrix = new THREE.Matrix4();
      for (let i = 0; i < pinCount; i++) { const t = i / pinCount * Math.PI * 2, r = Math.min(0.011, k.r * 0.7); pinMatrix.makeTranslation(Math.sin(t) * r, 0.0035, Math.cos(t) * r); pins.setMatrixAt(i, pinMatrix); }
      g.add(pins);
      if (a.pins === 'octal' || a.pins === 'loctal') { const key = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0022, a.pins === 'loctal' ? 0.009 : 0.006, 8), bakelite); key.position.y = 0.0045; g.add(key); }
      const put = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
        const m = new THREE.Mesh(geometry, material); m.position.y = y + 0.007; m.castShadow = true; g.add(m); return m;
      };
      const lift = k.base ? 0.018 : 0.004;
      if (k.base) put(new THREE.CylinderGeometry(k.base, k.base, 0.02, 14), kind === 4 ? blackMetal : bakelite, 0.01);
      else put(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 7), silver, 0.001);
      if (kind === 4) {
        put(new THREE.CylinderGeometry(0.0145, 0.0155, k.tall, 16), blackMetal, lift + k.tall / 2);
        put(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 8), silver, lift + k.tall + 0.003);
        return g;
      }
      const points = k.profile.map(([x, y]) => new THREE.Vector2(x, y));
      const shell = state === 'cracked' ? points.slice(0, Math.ceil(points.length / 2) + 1) : points;
      const material = state === 'on' ? glassOn : state === 'weak' ? glassWeak : state === 'dead' ? glassDead : glass;
      put(new THREE.LatheGeometry(shell, 16), material, lift);
      put(new THREE.CylinderGeometry(k.r * 0.5, k.r * 0.5, k.tall * 0.55, 10), plate, lift + k.tall * 0.4);
      put(new THREE.CylinderGeometry(0.003, 0.003, k.tall * 0.2, 6), state === 'on' ? heaterOn : plate, lift + k.tall * 0.74);
      if (state !== 'cracked' && a.getter !== 'clear') {
        if (a.getter === 'side') { const patch = put(new THREE.SphereGeometry(1, 10, 8), silver, lift + k.tall * 0.63); patch.scale.set(k.r * 0.55, k.tall * 0.17, 0.001); patch.position.z = k.r * 0.92; }
        else put(new THREE.SphereGeometry(k.r * 0.42, 10, 6, 0, Math.PI * 2, 0, 1.1), a.getter === 'dark' ? blackMetal : silver, lift + k.tall - k.r * 0.55);
      }
      if (kind === 2 || kind === 5) put(new THREE.CylinderGeometry(0.0045, 0.0045, 0.012, 8), brass, lift + k.tall + 0.004);
      return g;
    };

    const pool = { mixed: [0, 1, 2, 3, 4, 1, 0], bottles: [0, 0, 2], miniature: [3], metal: [4, 4, 1], giants: [5, 5, 2] }[a.shapes];
    const size = Math.max(...pool.map((k) => KINDS[k].r)) * 2 + 0.006;
    const boxTall = Math.max(...pool.map((k) => KINDS[k].tall)) + 0.03;
    const pitch = size + 0.01;
    const cols = Math.max(3, Math.min(8, Math.round(0.3 / pitch))), rows = Math.max(2, Math.min(5, Math.round(0.18 / pitch)));
    const TW = cols * pitch + 0.012, TD = rows * pitch + 0.012, wall = { cardboard: 0.04, wooden: 0.05, tin: 0.055, crate: 0.035 }[a.tray];

    // ---- Tray.
    const trayMat = {
      cardboard: s.material('#a9824f', { roughness: 0.95 }),
      wooden: s.material('#7a5632', { roughness: 0.6 }),
      tin: s.material(mood.cheer > 0.5 ? '#b23a32' : '#3c5a7a', { metalness: 0.6, roughness: 0.35 }),
      crate: s.material('#7b7d7c', { roughness: 0.9 }),
    }[a.tray];
    const t = a.tray === 'wooden' ? 0.008 : 0.003;
    s.box([TW, 0.004, TD], [0, 0.002, 0], trayMat);
    for (const side of [-1, 1]) {
      s.box([TW, wall, t], [0, wall / 2, side * (TD / 2 - t / 2)], trayMat);
      s.box([t, wall, TD], [side * (TW / 2 - t / 2), wall / 2, 0], trayMat);
    }
    if (a.tray === 'wooden') s.ball([0.012, 0.012, 0.009], [0, wall / 2, TD / 2 + 0.006], brass, 12);
    if (a.tray === 'crate' || a.tray === 'wooden') s.label(a.tray === 'crate' ? 'VALVES N.O.S.' : 'TUBES', 0.09, 0.02, [a.tray === 'crate' ? -TW * 0.2 : TW * 0.25, wall * 0.55, TD / 2 + 0.0008], '#2a241c', '#eadfc0');
    if (a.tray === 'tin') {
      const lip = s.material('#c9b46a', { metalness: 0.7, roughness: 0.3 });
      for (const z of [-TD / 2, TD / 2]) s.box([TW + 0.004, 0.004, 0.004], [0, wall, z], lip);
      for (const x of [-TW / 2, TW / 2]) s.box([0.004, 0.004, TD + 0.004], [x, wall, 0], lip);
    }
    const liner = s.material(a.lining === 'felt' ? '#3e674f' : a.lining === 'tissue' ? '#e0d7c1' : '#c0a176', { roughness: 1 });
    s.box([TW - 0.012, 0.001, TD - 0.012], [0, 0.0045, 0], liner);
    if (a.lining === 'corrugated') for (let x = -TW / 2 + 0.012; x < TW / 2 - 0.01; x += 0.006) s.rod([x, 0.005, -TD / 2 + 0.008], [x, 0.005, TD / 2 - 0.008], 0.001, liner);
    if (a.lining === 'tissue') for (let i = 0; i < 5; i++) s.box([TW * 0.7, 0.0007, TD * 0.26], [(random() - 0.5) * TW * 0.15, 0.005 + i * 0.0004, (i - 2) * TD * 0.13], liner).rotation.y = (i % 2 ? 1 : -1) * 0.08;
    const divided = a.packing !== 'loose' && a.packing !== 'upright';
    if (divided) {
      const card = s.material('#c2a06c', { roughness: 0.95 });
      for (let i = 1; i < cols; i++) s.box([0.0015, wall * 0.75, TD - 0.01], [-TW / 2 + 0.006 + i * pitch, wall * 0.375, 0], card);
      for (let i = 1; i < rows; i++) s.box([TW - 0.01, wall * 0.75, 0.0015], [0, wall * 0.375, -TD / 2 + 0.006 + i * pitch], card);
    } else if (a.packing === 'upright') {
      s.box([TW - 0.012, 0.012, TD - 0.012], [0, 0.01, 0], s.material('#d9cfb6', { roughness: 0.95 }));
    } else {
      const tissue = [];
      for (let i = 0; i < 16; i++) tissue.push({ at: [(random() - 0.5) * (TW - 0.05), 0.008, (random() - 0.5) * (TD - 0.05)] as P, size: 0.7 + random() * 0.7 });
      s.scatter(new THREE.IcosahedronGeometry(0.03, 0), s.material('#b89a68', { roughness: 1, flatShading: true }), tissue).scale.y = 0.4;
    }

    // ---- Cartons: three printed faces shared between all boxes.
    const carton = (text: string, crossed: boolean) => new THREE.MeshStandardMaterial({
      roughness: 0.9,
      map: paint(128, 256, (ctx) => {
        const fade = mood.wear * 0.35;
        ctx.fillStyle = brand.paper; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = brand.main; ctx.fillRect(0, 0, 128, 54); ctx.fillRect(0, 226, 128, 30);
        ctx.fillStyle = brand.second; ctx.fillRect(0, 58, 128, 7);
        // A little tube pictogram.
        ctx.strokeStyle = brand.main; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(48, 205); ctx.lineTo(48, 150); ctx.quadraticCurveTo(36, 110, 64, 92); ctx.quadraticCurveTo(92, 110, 80, 150); ctx.lineTo(80, 205); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = brand.main; ctx.fillRect(56, 130, 16, 50);
        ctx.fillStyle = a.brand === 'orange' || a.brand === 'blue' ? '#ffffff' : brand.paper;
        ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText(text, 64, 38, 116);
        ctx.fillStyle = `rgba(190,170,130,${fade})`; ctx.fillRect(0, 0, 128, 256);
        if (crossed) { ctx.strokeStyle = '#d0181a'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(18, 70); ctx.lineTo(110, 215); ctx.moveTo(110, 70); ctx.lineTo(18, 215); ctx.stroke(); }
      }),
    });
    const names = [TYPES[Math.floor(random() * 10)], TYPES[Math.floor(random() * 10)]];
    const cartons = [carton(names[0], false), carton(names[1], false), carton(names[0], true)];
    const lidGood = s.material(brand.main, { roughness: 0.9 }), lidPaper = s.material(brand.paper, { roughness: 0.9 });
    const boxGeo = new THREE.BoxGeometry(size, boxTall, size);
    const box = (dead: boolean, at: P, turn: number, lying = false) => {
      const mat = dead ? cartons[2] : cartons[random() < 0.5 ? 0 : 1];
      const m = new THREE.Group();
      if (a.cartons === 'open' || a.cartons === 'folded') {
        for (const side of [-1, 1]) {
          const xwall = new THREE.Mesh(new THREE.BoxGeometry(0.0007, boxTall, size), mat); xwall.position.x = side * size / 2; m.add(xwall);
          const zwall = new THREE.Mesh(new THREE.BoxGeometry(size, boxTall, 0.0007), mat); zwall.position.z = side * size / 2; m.add(zwall);
          const flap = new THREE.Mesh(new THREE.BoxGeometry(size, 0.0007, 0.012), lidPaper); flap.position.set(0, boxTall / 2 + (a.cartons === 'open' ? 0.006 : 0.0005), side * (size / 2 + (a.cartons === 'folded' ? 0.006 : 0))); flap.rotation.x = a.cartons === 'open' ? Math.PI / 2 : side * 0.05; m.add(flap);
        }
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(size, 0.0007, size), lidPaper); bottom.position.y = -boxTall / 2; m.add(bottom);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.25, size * 0.25, boxTall * 0.7, 10), plate); inner.position.y = -boxTall * 0.1; m.add(inner);
      } else {
        m.add(new THREE.Mesh(boxGeo, [mat, mat, dead ? lidPaper : lidGood, lidPaper, mat, mat]));
        if (a.cartons === 'banded') { for (const side of [-1, 1]) { const band = new THREE.Mesh(new THREE.BoxGeometry(size + 0.001, boxTall * 0.12, 0.0008), lidPaper); band.position.set(0, boxTall * 0.12, side * size / 2); m.add(band); } }
      }
      m.traverse(o => { o.castShadow = o.receiveShadow = true; });
      m.castShadow = m.receiveShadow = true;
      m.position.set(...at);
      if (lying) { m.rotation.order = 'YXZ'; m.rotation.set(Math.PI / 2, turn, 0); } else m.rotation.y = turn;
      s.root.add(m);
      return m;
    };

    // ---- Fill the cells.
    const fill = mix(0.2, 1, a.stock);
    const crackCell = a.cracked === 'tray' ? Math.floor(random() * cols) + (rows - 1) * cols : -1;
    let index = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, index++) {
      const x = -TW / 2 + 0.006 + (c + 0.5) * pitch, z = -TD / 2 + 0.006 + (r + 0.5) * pitch;
      const kind = pool[a.order === 'rows' ? r % pool.length : a.order === 'columns' ? c % pool.length : a.order === 'alternating' ? (r + c) % pool.length : Math.floor(random() * pool.length)];
      const dead = random() < Math.pow(a.dead, 1.4) * 0.9;
      if (index !== crackCell && random() > fill) continue;
      const boxed = index !== crackCell && (a.packing === 'boxed' || (a.packing === 'half' && random() < 0.5));
      if (boxed) { box(dead, [x + (random() - 0.5) * 0.003, 0.004 + boxTall / 2, z + (random() - 0.5) * 0.003], (random() - 0.5) * 0.14 + (random() < 0.5 ? 0 : Math.PI)); continue; }
      const v = valve(kind, index === crackCell ? 'cracked' : dead ? 'dead' : 'off');
      if (a.packing === 'loose' && index !== crackCell) {
        v.rotation.set(0, random() * 6.28, Math.PI / 2 + (random() - 0.5) * 0.2);
        v.rotation.order = 'YXZ';
        v.position.set(x * 0.8, 0.02 + KINDS[kind].r + random() * 0.012, z * 0.8);
      } else {
        v.position.set(x, a.packing === 'upright' ? 0.014 : 0.004, z);
        v.rotation.set((random() - 0.5) * 0.1, random() * 6, (random() - 0.5) * 0.1);
      }
      s.root.add(v);
    }

    // ---- In front: an opened carton with its tube slid out, and the cracked one.
    const fz = TD / 2 + 0.05;
    if (a.packing !== 'loose' && a.packing !== 'upright') {
      const turn = 1.2 + random() * 0.5, bx = -TW * 0.3;
      box(false, [bx, size / 2, fz + 0.02], turn, true);
      const v = valve(pool[0], 'off');
      v.rotation.order = 'YXZ'; v.rotation.set(Math.PI / 2, turn, 0);
      v.position.set(bx + Math.sin(turn) * (boxTall * 0.42), size / 2, fz + 0.02 + Math.cos(turn) * (boxTall * 0.42));
      s.root.add(v);
    }
    if (a.cracked === 'front') {
      const kind = pool[0] === 4 ? 1 : pool[0];
      const v = valve(kind, 'cracked');
      v.rotation.order = 'YXZ'; v.rotation.set(Math.PI / 2, -0.9, 0);
      v.position.set(TW * 0.12, KINDS[kind].r, fz + 0.01);
      s.root.add(v);
      const shards = [];
      for (let i = 0; i < 12; i++) shards.push({ at: [TW * 0.12 - 0.05 - random() * 0.07, 0.002, fz + 0.02 + (random() - 0.3) * 0.08] as P, size: 0.5 + random() * 1.2 });
      s.scatter(new THREE.TetrahedronGeometry(0.006, 0), new THREE.MeshStandardMaterial({ color: '#dff0ea', transparent: true, opacity: 0.75, roughness: 0.05, flatShading: true }), shards).scale.y = 1;
    }

    // ---- Valve tester.
    const pointer: THREE.Mesh[] = [];
    if (a.tester !== 'none') {
      const q = new Sculpture(context);
      const W = 0.16, H = 0.06, D = 0.14;
      q.box([W, H, D], [0, H / 2, 0], s.material('#4a5a52', { roughness: 0.55 }));
      const reading = { good: 0.82, weak: 0.5, bad: 0.12, empty: 0.02 }[a.tester];
      const face = paint(256, 224, (ctx) => {
        ctx.fillStyle = '#23282a'; ctx.fillRect(0, 0, 256, 224);
        ctx.fillStyle = '#efe7cc'; ctx.fillRect(108, 96, 136, 112);
        for (const [from, to, colour] of [[0, 0.36, '#c9302a'], [0.36, 0.62, '#e0b62c'], [0.62, 1, '#3c9a52']] as const) {
          ctx.strokeStyle = colour; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(176, 204, 80, Math.PI * (1.12 + from * 0.76), Math.PI * (1.12 + to * 0.76)); ctx.stroke();
        }
        ctx.fillStyle = '#23282a'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('BAD', 126, 196); ctx.fillText('?', 176, 152); ctx.fillText('GOOD', 222, 196);
        ctx.fillStyle = '#d8d2bc'; ctx.font = 'bold 14px monospace'; ctx.fillText('VALVE TESTER', 128, 20);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(30 + (i % 2) * 44, 62 + Math.floor(i / 2) * 0, 0, 0, 7); ctx.fill(); }
      });
      const top = q.mesh(new THREE.PlaneGeometry(W - 0.006, D - 0.006), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }), [0, H + 0.0006, 0]);
      top.rotation.x = -Math.PI / 2;
      // Meter needle, pivoting at the bottom of the scale.
      const px = (176 / 256 - 0.5) * (W - 0.006), pz = (204 / 224 - 0.5) * (D - 0.006);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.001, 0.05).translate(0, 0, -0.025), new THREE.MeshStandardMaterial({ color: '#c41818' }));
      needle.position.set(px, H + 0.002, pz);
      needle.rotation.y = -(reading - 0.5) * Math.PI * 0.76;
      q.root.add(needle); pointer.push(needle);
      // Sockets, knobs and a pilot lamp.
      const sx = -W * 0.24, sz = -D * 0.16;
      q.cylinder(0.02, 0.02, 0.006, [sx, H + 0.003, sz], bakelite, 18);
      q.cylinder(0.012, 0.012, 0.005, [sx + 0.045, H + 0.0025, sz - 0.02], bakelite, 14);
      for (let i = 0; i < 3; i++) { q.cylinder(0.009, 0.011, 0.012, [-W * 0.38 + i * 0.026, H + 0.006, D * 0.3], blackMetal, 14); q.box([0.002, 0.003, 0.012], [-W * 0.38 + i * 0.026, H + 0.012, D * 0.3 - 0.003], silver).rotation.y = random() * 3; }
      const live = a.tester !== 'empty';
      q.ball([0.006, 0.006, 0.006], [W * 0.38, H + 0.004, -D * 0.34], new THREE.MeshStandardMaterial({ color: live ? '#ff4a30' : '#5a2a22', emissive: '#ff2a10', emissiveIntensity: live ? 2 : 0 }), 10);
      q.rod([sx + 0.07, H, -D * 0.34], [sx + 0.07, H + 0.014, -D * 0.34 + (live ? -0.006 : 0.006)], 0.002, silver);
      if (live) {
        const kind = pool[0] === 4 ? 1 : pool[0] === 3 ? 0 : pool[0];
        const v = valve(kind, a.tester === 'good' ? 'on' : a.tester === 'weak' ? 'weak' : 'off');
        v.position.set(sx, H + 0.006, sz);
        v.scale.setScalar(1.15);
        q.root.add(v);
      }
      q.root.position.set(TW / 2 + W / 2 + 0.03, 0, 0.01);
      q.root.rotation.y = -0.25 + (random() - 0.5) * 0.1;
      s.root.add(q.root);
      // Mains lead away behind.
      s.tube([[TW / 2 + 0.1, 0.03, -0.06], [TW / 2 + 0.11, 0.004, -0.1], [TW / 2 + 0.05, 0.004, -TD / 2 - 0.035], [TW / 2 - 0.05, 0.004, -TD / 2 - 0.03]], 0.0028, s.material('#2a2a2c', { roughness: 0.7 }));
    }

    if (a.records !== 'none') {
      const data = paint(256, 192, c => {
        c.fillStyle = '#e1d7b9'; c.fillRect(0, 0, 256, 192); c.fillStyle = '#37433b'; c.textAlign = 'center'; c.font = 'bold 22px monospace'; c.fillText(a.records === 'sockets' ? 'SOCKET BASES' : a.records === 'book' ? 'VALVE DATA' : 'TEST RESULTS', 128, 32);
        if (a.records === 'sockets') { for (let n = 0; n < 3; n++) { c.strokeStyle = '#43564e'; c.lineWidth = 2; c.beginPath(); c.arc(48 + n * 80, 105, 29, 0, Math.PI * 2); c.stroke(); for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; c.beginPath(); c.arc(48 + n * 80 + Math.sin(t) * 22, 105 + Math.cos(t) * 22, 3, 0, Math.PI * 2); c.fill(); } } }
        else { c.font = '19px monospace'; ['6V6   82   PASS', '12AX7 74   PASS', 'EL84  21   FAIL', '6L6   91   PASS'].forEach((line, i) => c.fillText(line, 128, 72 + i * 31)); }
      });
      const h = a.records === 'book' ? 0.008 : 0.001;
      const at: P = [-0.035, h / 2, -TD / 2 - 0.075];
      s.box([0.16, h, 0.11], at, s.material('#a99770'));
      const page = s.mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshStandardMaterial({ map: data, roughness: 1 }), [at[0], h + 0.0003, at[2]]); page.rotation.x = -Math.PI / 2;
      if (a.records === 'book') s.rod([at[0], h + 0.0005, at[2] - 0.055], [at[0], h + 0.0005, at[2] + 0.055], 0.0008, bakelite);
    }
    const energy = mood.energy, phase = random() * 10, base = pointer[0]?.rotation.y ?? 0;
    const live = a.tester === 'good' || a.tester === 'weak';
    return s.finish({
      update: live ? (_dt, time) => {
        glassOn.emissiveIntensity = 1.2 * warm * (1 + Math.sin(time * 8 + phase) * 0.06 * energy);
        glassWeak.emissiveIntensity = 0.35 * (1 + Math.sin(time * 3 + phase) * 0.5);
        if (pointer[0]) pointer[0].rotation.y = base + Math.sin(time * (a.tester === 'weak' ? 2.2 : 5) + phase) * (a.tester === 'weak' ? 0.12 : 0.015) * (0.3 + energy);
      } : undefined,
    });
  },
});
