import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { glass, labelPlane } from './lab';
import { makeEar } from './head';

const HUMAN = ['#e8c4a8', '#d9a784', '#b9825c', '#8a5a3c', '#f0d6c4', '#c79a7a', '#6b4630'];
const OTHER = ['#8fb07a', '#9aa6b8', '#b08ac0', '#6f8a6a', '#c9c36a'];
const VELVET = { oxblood: '#6a1420', green: '#1f4a34', midnight: '#1c2450', black: '#1b1a1e', rose: '#a8707a' } as const;
const TEXT = {
  names: ['Abel', 'Mrs. Pym', 'Otto', 'the sexton', 'Clara', 'unknown', 'H. W.', 'a sailor', 'Tom', 'a cousin', 'Dr. K.', 'Ruth'],
  dates: ['1881', 'Oct. 3', '1879', 'Lent', '1890', 'Tues.', '1884', 'May 9', '1877', 'Xmas', '1888', 'last wk'],
  prices: ['2/6', '£1', '9d.', '£4 10s', '1/-', 'n.f.s.', '3/-', '£2', '6d.', '5/-', '£7', 'free'],
  numbers: ['No. 1', 'No. 2', 'No. 3', 'No. 4', 'No. 5', 'No. 6', 'No. 7', 'No. 8', 'No. 9', 'No. 10', 'No. 11', 'No. 12'],
} as const;

type Part = 'ear' | 'nose' | 'lips' | 'lid';

export default defineThing({
  questions: {
    dominant: choice('Which parts fill most of the tray?', {
      ears: 'Mostly ears, lefts and rights.',
      noses: 'Mostly noses.',
      lips: 'Mostly pairs of lips.',
      mixed: 'An even mix of ears, noses, lips and the odd eyelid.',
    }),
    matched: choice('How well matched is the collection?', {
      set: 'A fine matched set: one skin tone, one size, sorted in pairs.',
      mixed: 'Wildly mixed sizes and skin tones, taken as they came.',
      inhuman: 'Mixed, and several are plainly not human: pointed ears, snouts, fanged lips, green and grey skin.',
    }),
    empty: score('How many slots are empty because the part was just used?', ['None, the tray is full', 'One gap', 'Several gaps', 'Nearly cleared out']),
    condition: choice('What condition are the parts in?', {
      fresh: 'Fresh: pink and soft, with a little blood on the velvet.',
      waxy: 'Waxy and yellowed, preserved and slightly shiny.',
      mummified: 'Mummified: dark, shrunken and leathery.',
    }),
    labels: choice('What is written on the little labels?', {
      names: 'The names of who each came from.',
      dates: 'Dates of collection.',
      prices: 'Prices.',
      numbers: 'Catalogue numbers.',
    }),
    velvet: choice('What colour is the velvet lining?', {
      oxblood: 'Deep oxblood red.',
      green: 'Bottle green.',
      midnight: 'Midnight blue.',
      black: 'Black.',
      rose: 'Faded dusty rose.',
    }),
    tray: choice('What kind of tray is it?', {
      drawer: 'A shallow wooden drawer pulled from a cabinet, with a brass handle.',
      case: 'A hinged presentation case with its satin-lined lid standing open.',
      glazed: 'A specimen box with a glass lid propped ajar.',
    }),
    needle: noul('Has a threaded needle been left on the tray?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });
    const tray = new THREE.Group();
    s.root.add(tray);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = tray) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const box = (size: [number, number, number], at: [number, number, number], material: THREE.Material, parent: THREE.Object3D = tray) => { const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(...size), material), parent); mesh.position.set(...at); return mesh; };

    // The tray: x across, y up the slope, z out of the velvet.
    const IW = 0.44, IH = 0.35, wall = 0.014, depth = 0.03;
    const wood = s.material(a.tray === 'case' ? '#2a1a14' : '#6a4226', { roughness: 0.5 });
    const velvetTone = new THREE.Color(VELVET[a.velvet]).lerp(new THREE.Color('#6f6860'), mood.wear * 0.3);
    const velvet = flat(velvetTone, { roughness: 1 });
    const ridge = flat(velvetTone.clone().multiplyScalar(1.25), { roughness: 1 });
    box([IW + wall * 2, IH + wall * 2, 0.01], [0, 0, -0.005], wood);
    box([IW, IH, 0.002], [0, 0, 0.001], velvet);
    for (const sx of [-1, 1]) box([wall, IH + wall * 2, depth], [sx * (IW + wall) / 2, 0, depth / 2 - 0.01], wood);
    for (const sy of [-1, 1]) box([IW, wall, depth], [0, sy * (IH + wall) / 2, depth / 2 - 0.01], wood);
    const cols = 4, rows = 3, cw = IW / cols, strip = 0.05, ch = (IH - strip) / rows;
    for (let c = 1; c < cols; c++) box([0.005, IH - strip, 0.008], [-IW / 2 + c * cw, strip / 2, 0.005], ridge);
    for (let r = 0; r <= rows; r++) if (r > 0) box([IW, 0.005, 0.008], [0, IH / 2 - r * ch, 0.005], ridge);

    // Stock.
    const tone = (inhuman: boolean) => {
      const base = new THREE.Color(inhuman ? OTHER[Math.floor(random() * OTHER.length)] : HUMAN[Math.floor(random() * HUMAN.length)]);
      if (a.condition === 'waxy') base.lerp(new THREE.Color('#ead9a0'), 0.55);
      if (a.condition === 'mummified') base.lerp(new THREE.Color('#4a3020'), 0.78);
      return base;
    };
    const setTone = tone(false);
    const skinRough = { fresh: 0.55, waxy: 0.22, mummified: 0.98 }[a.condition];
    const shrink = a.condition === 'mummified' ? 0.82 : 1;
    const ball = new THREE.SphereGeometry(1, 14, 10);
    const steel = flat('#d5d9dc', { metalness: 0.9, roughness: 0.25 });
    const pinHead = flat(a.tray === 'case' ? '#d9b24a' : '#e9e6dc', { metalness: a.tray === 'case' ? 0.9 : 0.1, roughness: 0.3 });
    const blood = flat('#5a0c12', { roughness: 0.35 });
    const dark = flat('#1c0f0f', { roughness: 0.9 });
    const pool: Part[] = a.dominant === 'mixed' ? ['ear', 'nose', 'lips', 'ear', 'nose', 'lips', 'lid'] : ({ ears: ['ear', 'ear', 'ear', 'ear', 'ear', 'nose', 'lips'], noses: ['nose', 'nose', 'nose', 'nose', 'nose', 'ear', 'lips'], lips: ['lips', 'lips', 'lips', 'lips', 'lips', 'ear', 'lid'] } as const)[a.dominant].slice();
    const emptyChance = [0, 0.09, 0.34, 0.72][Math.round(a.empty * 3)];
    const forced = a.empty > 0.16 ? Math.floor(random() * cols * rows) : -1;
    const twitchers: THREE.Object3D[] = [];
    let firstEmpty: THREE.Vector3 | null = null;

    const build = (part: Part, inhuman: boolean, colour: THREE.Color, size: number, mirror: number) => {
      const group = new THREE.Group();
      const skin = flat(colour, { roughness: skinRough });
      const inner = flat(colour.clone().multiplyScalar(0.62), { roughness: skinRough });
      const blob = (scale: [number, number, number], at: [number, number, number], material: THREE.Material = skin) => { const mesh = add(new THREE.Mesh(ball, material), group); mesh.scale.set(...scale); mesh.position.set(...at); return mesh; };
      if (part === 'ear') {
        const ear = makeEar(0.066, skin, inner, inhuman ? 0.9 + random() * 0.5 : 0);
        ear.scale.set(mirror, 1, 1);
        add(ear, group);
      } else if (part === 'nose') {
        if (inhuman) {
          blob([0.02, 0.026, 0.014], [0, 0.004, 0.008]);
          blob([0.019, 0.013, 0.011], [0, -0.02, 0.014], flat('#231a1c', { roughness: 0.3 }));
          for (const sx of [-1, 1]) blob([0.004, 0.006, 0.004], [sx * 0.008, -0.024, 0.022], dark);
        } else {
          const bridge = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.012, 0.04, 10), skin), group);
          bridge.position.set(0, 0.008, 0.006); bridge.rotation.x = 0.3; bridge.scale.z = 0.9;
          blob([0.0125, 0.0125, 0.0125], [0, -0.014, 0.013]);
          for (const sx of [-1, 1]) { blob([0.009, 0.0095, 0.008], [sx * 0.012, -0.017, 0.006]); blob([0.0042, 0.0034, 0.003], [sx * 0.006, -0.0265, 0.008], dark); }
        }
      } else if (part === 'lips') {
        const lip = flat(colour.clone().lerp(new THREE.Color(a.condition === 'mummified' ? '#2a1a14' : '#a8404a'), 0.55), { roughness: Math.min(skinRough, 0.45) });
        blob([0.03, 0.0125, 0.006], [0, 0, 0.003]);
        for (const sx of [-1, 1]) blob([0.0135, 0.0062, 0.0065], [sx * 0.0105, 0.0052, 0.006], lip);
        blob([0.021, 0.0072, 0.0075], [0, -0.005, 0.006], lip);
        blob([0.02, 0.0012, 0.002], [0, 0.0008, 0.0105], dark);
        if (inhuman) for (const sx of [-1, 1]) { const fang = add(new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.013, 5), flat('#f1ecd8', { roughness: 0.3 })), group); fang.position.set(sx * 0.009, -0.004, 0.013); fang.rotation.x = Math.PI; }
      } else {
        const lid = add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), skin), group);
        lid.rotation.x = Math.PI / 2; lid.scale.set(1.25, 0.8, 0.75);
        for (let i = 0; i < 9; i++) { const lash = add(new THREE.Mesh(new THREE.BoxGeometry(0.0009, 0.011, 0.0009), dark), group); const t = (i - 4) / 4; lash.position.set(t * 0.021, -0.014 - (1 - t * t) * 0.004, 0.004); lash.rotation.z = -t * 0.5; }
      }
      group.scale.setScalar(size * shrink);
      if (a.condition === 'mummified') group.scale.z *= 0.7;
      return group;
    };

    let serial = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const index = serial++;
        const cx = -IW / 2 + (c + 0.5) * cw, cy = IH / 2 - (r + 0.5) * ch;
        const empty = index === forced || random() < emptyChance;
        const part = a.matched === 'set' && a.dominant !== 'mixed' ? ({ ears: 'ear', noses: 'nose', lips: 'lips', mixed: 'ear' } as const)[a.dominant] : pool[Math.floor(random() * pool.length)];
        const inhuman = a.matched === 'inhuman' && random() < 0.5;
        const size = a.matched === 'set' ? 1.25 : mix(0.9, 1.5, random());
        const at = new THREE.Vector3(cx + (a.matched === 'set' ? 0 : (random() - 0.5) * 0.012), cy + 0.012, 0.003);
        const text = TEXT[a.labels][index];
        const card = labelPlane([text], 0.07, 0.02, { hand: a.labels === 'names' ? 'script' : a.labels === 'numbers' ? 'caps' : 'type', wear: mood.wear, random, border: false });
        card.position.set(cx, cy - ch / 2 + 0.018, 0.0035); card.rotation.z = (random() - 0.5) * (a.matched === 'set' ? 0.04 : 0.16);
        tray.add(card);
        if (empty) {
          // The dent it left in the pile, its pin, and a line through the label.
          const dent = add(new THREE.Mesh(ball, flat(velvetTone.clone().multiplyScalar(0.55), { roughness: 1 })));
          dent.scale.set(part === 'lips' ? 0.03 : 0.02, part === 'lips' ? 0.013 : 0.03, 0.0012); dent.position.set(at.x, at.y, 0.0026);
          const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.04, 5), steel)); pin.position.set(at.x + 0.02, at.y - 0.01, 0.004); pin.rotation.z = 0.9 + random();
          const head = add(new THREE.Mesh(ball, pinHead)); head.scale.setScalar(0.003); head.position.set(pin.position.x - Math.sin(pin.rotation.z) * 0.02, pin.position.y + Math.cos(pin.rotation.z) * 0.02, 0.005);
          box([0.06, 0.0022, 0.0006], [cx, card.position.y, 0.0042], flat('#8a1616')).rotation.z = card.rotation.z + 0.12;
          if (!firstEmpty) firstEmpty = at.clone();
          continue;
        }
        const mirror = a.matched === 'set' ? (c % 2 ? 1 : -1) : random() < 0.5 ? 1 : -1;
        const group = build(part, inhuman, a.matched === 'set' ? setTone : tone(inhuman), size, mirror);
        group.position.copy(at);
        group.rotation.z = (random() - 0.5) * (a.matched === 'set' ? 0.08 : 0.5);
        tray.add(group);
        if (inhuman) twitchers.push(group);
        const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.034, 5), steel)); pin.rotation.x = Math.PI / 2; pin.position.set(at.x + (part === 'ear' ? mirror * 0.006 : 0), at.y + (part === 'nose' ? 0.012 : 0.002), 0.017);
        const head = add(new THREE.Mesh(ball, pinHead)); head.scale.setScalar(0.0036); head.position.set(pin.position.x, pin.position.y, 0.034);
        if (a.condition === 'fresh' && random() < 0.75) { const stain = add(new THREE.Mesh(ball, blood)); stain.scale.set(0.012 + random() * 0.014, 0.008 + random() * 0.01, 0.0008); stain.position.set(at.x + (random() - 0.5) * 0.03, at.y - 0.02 - random() * 0.012, 0.0028); }
      }

    // The working strip along the front edge.
    const stripY = -IH / 2 + strip / 2;
    if (a.needle) {
      const needle = add(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0011, 5, 20, Math.PI * 0.9), steel));
      needle.position.set(IW * 0.2, stripY - 0.01, 0.004); needle.rotation.z = 0.3;
      const threadTone = flat(a.velvet === 'black' ? '#d8d2c0' : '#14110f', { roughness: 0.9 });
      const eye = new THREE.Vector3(IW * 0.2 + Math.cos(0.3) * 0.022, stripY - 0.01 + Math.sin(0.3) * 0.022, 0.004);
      const end = firstEmpty ?? new THREE.Vector3(-IW * 0.1, stripY + 0.03, 0.003);
      const path = [eye, eye.clone().add(new THREE.Vector3(0.04, 0.012, 0.002)), new THREE.Vector3(IW * 0.36, stripY + 0.012, 0.004), new THREE.Vector3(IW * 0.1, stripY + 0.016, 0.004), new THREE.Vector3(mix(IW * 0.1, end.x, 0.5), stripY + 0.005, 0.004), new THREE.Vector3(end.x, Math.min(end.y, stripY + 0.03), 0.004)];
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 60, 0.0007, 4), threadTone));
      const spool = add(new THREE.Group()); spool.position.set(IW * 0.4, stripY, 0.012); spool.rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 14), threadTone), spool);
      for (const sy of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 14), flat('#b08a55')), spool).position.y = sy * 0.011;
    }
    const scissors = add(new THREE.Group()); scissors.position.set(-IW * 0.3, stripY, 0.004); scissors.rotation.z = 0.25;
    for (const sy of [-1, 1]) { const blade = add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.004, 0.0015), steel), scissors); blade.position.set(0.02, 0, 0); blade.rotation.z = sy * 0.12; const loop = add(new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0014, 5, 14), steel), scissors); loop.position.set(-0.016, sy * 0.008, 0); }
    if (mood.density > 0.45) { const card = labelPlane(['Spares', 'ask before taking'], 0.085, 0.036, { hand: 'script', random, wear: mood.wear }); card.position.set(-IW * 0.02, stripY, 0.0036); card.rotation.z = -0.05; tray.add(card); }

    // Handle, lid or glass.
    const brass = s.material('#c39a3c', { metalness: 0.85, roughness: 0.3 });
    if (a.tray === 'drawer') {
      const pull = add(new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 6, 16, Math.PI), brass));
      pull.position.set(0, -IH / 2 - wall, 0.004); pull.rotation.z = Math.PI;
      for (const sx of [-1, 1]) add(new THREE.Mesh(ball, brass)).position.set(sx * 0.028, -IH / 2 - wall, 0.004);
      tray.children.slice(-2).forEach((knob) => knob.scale.setScalar(0.006));
      const plate = labelPlane(['EARS · NOSES · &c.'], 0.12, 0.016, { hand: 'caps', random, wear: mood.wear, paper: '#e2d3a8' });
      plate.rotation.x = Math.PI / 2; plate.position.set(0, -IH / 2 - wall - 0.0006, 0.022); plate.scale.y = -1; plate.rotation.x = -Math.PI / 2; plate.scale.y = 1;
      tray.add(plate);
    } else {
      const lid = add(new THREE.Group());
      lid.position.set(0, IH / 2 + wall, depth - 0.01);
      const open = a.tray === 'case' ? 1.3 : 0.55;
      lid.rotation.x = open;
      if (a.tray === 'case') {
        box([IW + wall * 2, IH + wall * 2, 0.012], [0, (IH + wall * 2) / 2, 0.006], wood, lid);
        box([IW, IH, 0.002], [0, (IH + wall * 2) / 2, 0.0125], flat('#e9dfc6', { roughness: 0.35 }), lid);
        const mark = labelPlane(['Finest Spare Parts', 'fitted while you wait'], 0.2, 0.07, { hand: 'script', random, wear: mood.wear * 0.4, paper: '#e9dfc6', ink: '#8a6a1c', border: false });
        mark.position.set(0, IH * 0.55, 0.0142);
        lid.add(mark);
        for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8), brass), lid).rotation.z = Math.PI / 2, lid.children[lid.children.length - 1].position.set(sx * IW * 0.3, 0, 0);
      } else {
        const L = IH + wall * 2;
        const pane = new THREE.Mesh(new THREE.BoxGeometry(IW, IH, 0.002), glass('#e4f4ea', 0.16)); pane.position.set(0, L / 2, 0.004); lid.add(pane);
        for (const sx of [-1, 1]) box([wall, L, 0.008], [sx * (IW + wall) / 2, L / 2, 0.004], wood, lid);
        for (const y of [wall / 2, L - wall / 2]) box([IW, wall, 0.008], [0, y, 0.004], wood, lid);
        const shine = new THREE.Mesh(new THREE.PlaneGeometry(IW * 0.16, IH * 0.9), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); shine.position.set(-IW * 0.22, L / 2, 0.0055); shine.rotation.z = 0.35; lid.add(shine);
        const prop = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.19, 6), brass)); prop.position.set(IW / 2 + wall * 0.5, IH / 2 - 0.09, depth + 0.06); prop.rotation.x = -1.05;
      }
    }

    // Prop the whole tray up toward the viewer on a block.
    const tilt = a.tray === 'case' ? 0.2 : 0.42;
    tray.rotation.x = -(Math.PI / 2 - tilt);
    const half = (IH + wall * 2) / 2;
    tray.position.y = Math.sin(tilt) * half + 0.012;
    const rise = Math.sin(tilt) * half * 2;
    s.box([IW * 0.7, rise * 0.8, 0.05], [0, rise * 0.4, -Math.cos(tilt) * half * 0.7], s.material('#3d2a1c', { roughness: 0.7 }));

    const energy = mix(0.1, 1, mood.energy);
    const rest = twitchers.map((one) => one.rotation.z);
    return s.finish({
      update(_dt, time) {
        twitchers.forEach((one, i) => { one.rotation.z = rest[i] + Math.max(0, Math.sin(time * 2.3 + i * 1.9)) ** 12 * 0.25 * energy; });
      },
    });
  },
});
