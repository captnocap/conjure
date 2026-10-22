import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];
const OWNERS = {
  family: 'A family: bright hard-shell cases, a small pink one, a soft toy wedged on top.',
  business: 'A business traveller: matched black cases, a garment bag, a laptop sleeve.',
  backpacker: 'A backpacker: a tall rucksack with a rolled mat, a dusty duffel, boots tied on.',
  emigrant: 'Someone moving their whole life: checked plastic market bags, a string-tied bundle, an old brown suitcase.',
  musician: 'A touring musician: a guitar case, a stickered flight case, a tired holdall.',
  nobody: 'Nobody anyone can find: grey anonymous bags with no tags at all.',
} as const;
const PALETTE: Record<keyof typeof OWNERS, string[]> = {
  family: ['#e2513f', '#2f9fd0', '#f0b730', '#e88ab0', '#5fba6a'],
  business: ['#1f2125', '#2b2e35', '#34373d', '#23262b'],
  backpacker: ['#5a6b3f', '#b5642c', '#3f5a6a', '#7a6a4a'],
  emigrant: ['#c23b3b', '#2f59a8', '#7a5234', '#d9d4c4'],
  musician: ['#1d1d1f', '#8a8f94', '#6b3a2a', '#2f3b4a'],
  nobody: ['#7f8387', '#8d8f8b', '#74787d', '#9a9c98'],
};

export default defineThing({
  questions: {
    load: choice('What is on the trolley?', {
      empty: 'Nothing: an empty trolley standing by itself.',
      box: 'A single cardboard box wound round and round with brown tape.',
      one: 'One suitcase, lying flat.',
      stack: 'A stack of three or four mismatched bags.',
      tower: 'A teetering overloaded tower, strapped down, far too much for one trolley.',
    }),
    owner: choice('Whose luggage is it?', OWNERS),
    waiting: choice('How long has it been standing there?', {
      moments: 'Moments: its owner has only stepped away, a coat and a coffee still on it.',
      hours: 'Hours: nothing has moved, a newspaper has slid to the floor beside it.',
      days: 'Days: security has taped a bright UNATTENDED notice to it and set a cone beside it.',
      forever: 'So long it has become furniture: a brake gone flat, a wheel off, a sag in everything.',
    }),
    frame: choice('What does the trolley itself look like?', {
      steel: 'Bare galvanised steel with a grey handle.',
      yellow: 'Steel with a fat yellow brake handle.',
      blue: 'Blue powder-coated frame.',
      red: 'Red frame with an advertising panel.',
      brass: 'Old brass-coloured hotel-style frame, from a grander age of travel.',
    }),
    panel: choice('What does the panel on the front basket say?', {
      free: 'FREE TROLLEY',
      coin: 'INSERT COIN',
      push: 'PRESS BAR TO MOVE',
      welcome: 'WELCOME',
      dutyfree: 'DUTY FREE',
    }),
    nested: noul('Is it at the front of a nested row of other trolleys?'),
    tag: noul('Does the luggage carry long white airline tags and a priority sticker?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const frameColour = { steel: '#b3b9bd', yellow: '#b3b9bd', blue: '#2f5fb0', red: '#c2362e', brass: '#b8964a' }[a.frame];
    const metal = s.material(frameColour, { metalness: a.frame === 'blue' || a.frame === 'red' ? 0.2 : 0.85, roughness: 0.35 });
    const grip = s.material({ steel: '#5a5f66', yellow: '#f2c21c', blue: '#1c1e22', red: '#1c1e22', brass: '#5a3a24' }[a.frame], { roughness: 0.6 });
    const rubber = s.material('#1b1c1e', { roughness: 0.9 });
    const panelText = { free: 'FREE TROLLEY', coin: 'INSERT COIN', push: 'PRESS BAR TO MOVE', welcome: 'WELCOME', dutyfree: 'DUTY FREE' }[a.panel];
    const tired = a.waiting === 'forever';

    // One trolley, origin under the handle end, pointing +z. Built into a group so a row can nest.
    const trolley = (lead: boolean) => {
      const g = new THREE.Group();
      const local = new Sculpture(context);
      const tube = (points: P[], r = 0.013, mat: THREE.Material = metal) => local.tube(points, r, mat);
      const hw = 0.3;
      // Tapered deck frame: wide at the back, narrow nose, so the next trolley slides in.
      tube([[-hw, 0.2, -0.42], [-hw, 0.19, 0.1], [-0.2, 0.17, 0.5], [0, 0.17, 0.56], [0.2, 0.17, 0.5], [hw, 0.19, 0.1], [hw, 0.2, -0.42]], 0.015);
      for (const z of [-0.2, 0, 0.2, 0.38]) { const w = z > 0.1 ? mix(hw, 0.2, (z - 0.1) / 0.4) : hw; tube([[-w, 0.185, z], [0, 0.18, z], [w, 0.185, z]], 0.008); }
      tube([[0, 0.185, -0.3], [0, 0.175, 0.54]], 0.008);
      // Upright back with the handle, raked toward the pusher.
      for (const x of [-hw, hw]) tube([[x, 0.2, -0.42], [x, 0.6, -0.47], [x, 0.98, -0.56]], 0.015);
      for (const y of [0.42, 0.62, 0.8]) tube([[-hw, y, -0.42 - (y - 0.2) * 0.17], [hw, y, -0.42 - (y - 0.2) * 0.17]], 0.008);
      for (const x of [-0.15, 0, 0.15]) tube([[x, 0.2, -0.42], [x, 0.8, -0.522]], 0.006);
      // The push-bar brake: squeeze it to the handle to roll.
      const droop = tired ? 0.06 : 0;
      local.rod([-hw - 0.02, 0.99, -0.565], [hw + 0.02, 0.99, -0.565], 0.02, grip);
      local.rod([-hw + 0.03, 0.93 - droop, -0.6], [hw - 0.03, 0.93 - droop, -0.6], 0.012, a.frame === 'yellow' ? grip : metal);
      for (const x of [-hw + 0.03, hw - 0.03]) local.rod([x, 0.93 - droop, -0.6], [x, 0.84, -0.53], 0.008, metal);
      // Small top basket for coats and duty-free, with the printed panel.
      tube([[-hw, 0.82, -0.53], [-hw, 0.8, -0.3], [hw, 0.8, -0.3], [hw, 0.82, -0.53]], 0.009);
      tube([[-hw, 0.66, -0.5], [-hw, 0.66, -0.34], [hw, 0.66, -0.34], [hw, 0.66, -0.5]], 0.007);
      for (const x of [-hw, -0.1, 0.1, hw]) local.rod([x, 0.66, -0.34], [x, 0.8, -0.3], 0.006, metal);
      if (lead) {
        const sign = local.label(panelText, 0.5, 0.12, [0, 0.73, -0.31], '#ffffff', a.frame === 'red' ? '#a0261f' : a.frame === 'brass' ? '#3a2a1a' : '#1f4f9a');
        sign.rotation.x = -0.28;
      }
      // Wheels: two fixed at the back, one caster under the nose.
      const wheel = (x: number, z: number, lost = false) => {
        if (lost) { const w = local.cylinder(0.065, 0.065, 0.035, [x + 0.25, 0.018, z + 0.2], rubber, 16); w.rotation.y = 0.4; return; }
        const w = local.cylinder(0.065, 0.065, 0.035, [x, 0.065, z], rubber, 16); w.rotation.z = Math.PI / 2;
        const hub = local.cylinder(0.03, 0.03, 0.04, [x, 0.065, z], metal, 10); hub.rotation.z = Math.PI / 2;
        local.rod([x, 0.065, z], [x, 0.19, z], 0.012, metal);
      };
      wheel(-hw + 0.02, -0.36);
      wheel(hw - 0.02, -0.36, lead && tired);
      wheel(0, 0.48);
      g.add(local.root);
      if (lead && tired) g.rotation.z = -0.05;
      return g;
    };

    const lead = trolley(true);
    s.root.add(lead);
    if (a.nested) {
      const count = 2 + Math.floor(random() * 3 + mood.density * 2);
      for (let k = 1; k <= count; k++) { const t = trolley(false); t.position.z = -k * 0.24; t.position.x = (random() - 0.5) * 0.015; s.root.add(t); }
    }

    // Luggage: each piece is built at the origin, then stacked on the deck.
    const colours = PALETTE[a.owner];
    const tint = () => colours[Math.floor(random() * colours.length)];
    const pieces: { mesh: THREE.Group; h: number }[] = [];
    const piece = (h: number, build: (g: Sculpture) => void) => { const g = new Sculpture(context); build(g); pieces.push({ mesh: g.root, h }); };
    const hard = (w: number, h: number, d: number, colour: string) => piece(h, (g) => {
      const shell = g.material(colour, { roughness: 0.35 });
      g.mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(h, d) * 0.22), shell, [0, h / 2, 0]);
      for (let i = -2; i <= 2; i++) g.box([w * 0.9, h * 1.01, 0.012], [0, h / 2, i * d * 0.17], g.material(new THREE.Color(colour).multiplyScalar(0.8), { roughness: 0.4 }));
      g.box([w * 1.005, 0.012, d * 1.005], [0, h / 2, 0], g.material('#2a2a2a'));
      g.tube([[-0.07, h / 2, d / 2], [-0.06, h / 2, d / 2 + 0.035], [0.06, h / 2, d / 2 + 0.035], [0.07, h / 2, d / 2]], 0.008, g.material('#2a2a2a'));
      for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) g.cylinder(0.02, 0.02, 0.03, [x, h / 2 - 0.02, -d / 2 - 0.02], rubber, 8).rotation.x = Math.PI / 2;
    });
    const soft = (w: number, h: number, d: number, colour: string) => piece(h, (g) => {
      const cloth = g.material(colour, { roughness: 0.95 });
      const body = g.ball([w / 2, h / 2, d / 2], [0, h / 2, 0], cloth, 16);
      body.scale.multiplyScalar(1.05);
      g.box([w * 0.7, 0.01, 0.02], [0, h * 0.98, 0], g.material('#d8d2c0'));
      g.tube([[-w * 0.2, h * 0.9, 0.04], [0, h + 0.07, 0.03], [w * 0.2, h * 0.9, 0.04]], 0.01, g.material('#1e1e1e'));
    });
    const market = (w: number, h: number, d: number) => piece(h, (g) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const c = canvas.getContext('2d')!; c.fillStyle = '#eeeae0'; c.fillRect(0, 0, 128, 128);
      const [p, q] = random() < 0.5 ? ['#c23b3b', '#2f59a8'] : ['#2f59a8', '#c23b3b'];
      for (let i = 0; i < 4; i++) { c.fillStyle = p; c.globalAlpha = 0.75; c.fillRect(i * 32 + 8, 0, 12, 128); c.fillStyle = q; c.fillRect(0, i * 32 + 8, 128, 12); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 2);
      g.mesh(new RoundedBoxGeometry(w, h, d, 3, 0.06), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }), [0, h / 2, 0]);
      g.box([w * 0.8, 0.012, 0.015], [0, h + 0.004, 0], g.material('#3a3a3a'));
      for (const x of [-w * 0.2, w * 0.2]) g.tube([[x - 0.06, h, 0], [x, h + 0.09, 0.03], [x + 0.06, h, 0]], 0.008, g.material('#2f59a8'));
    });
    const carton = (w: number, h: number, d: number) => piece(h, (g) => {
      const card = g.material('#b58a56', { roughness: 0.95 });
      const tape = g.material('#8a5f2e', { roughness: 0.35 });
      g.box([w, h, d], [0, h / 2, 0], card);
      for (let k = 0; k < 3 + Math.floor(random() * 3); k++) g.box([w + 0.006, h + 0.006, 0.055], [0, h / 2, (random() - 0.5) * d * 0.8], tape).rotation.y = (random() - 0.5) * 0.12;
      for (let k = 0; k < 2 + Math.floor(random() * 2); k++) g.box([0.055, h + 0.008, d + 0.008], [(random() - 0.5) * w * 0.8, h / 2, 0], tape);
      // An address written large in marker, and a FRAGILE label.
      const mark = g.label(['FRAGILE', 'THIS WAY UP', 'KITCHEN', 'MAMA', 'DO NOT OPEN', 'BOOKS'][Math.floor(random() * 6)], w * 0.6, h * 0.28, [0.02, h * 0.55, d / 2 + 0.004], '#2a2420', '#c79c66');
      mark.rotation.z = (random() - 0.5) * 0.15;
      g.box([w * 0.3, 0.004, d * 0.4], [w * 0.2, h + 0.004, 0], g.material('#f2efe6'));
    });
    const guitar = () => piece(0.14, (g) => {
      const c = g.material('#1b1b1d', { roughness: 0.5 });
      g.cylinder(0.2, 0.2, 0.13, [0, 0.07, 0.18], c, 20); g.cylinder(0.15, 0.15, 0.13, [0, 0.07, -0.06], c, 20);
      g.box([0.12, 0.11, 0.5], [0, 0.06, -0.38], c); g.box([0.16, 0.11, 0.16], [0, 0.06, -0.66], c);
      for (const z of [0.1, -0.3]) g.box([0.04, 0.02, 0.03], [0.17, 0.08, z], g.material('#c9a03a', { metalness: 0.8 }));
    });
    const rucksack = () => piece(0.34, (g) => {
      const c = g.material(tint(), { roughness: 0.95 });
      const body = g.mesh(new RoundedBoxGeometry(0.36, 0.3, 0.72, 4, 0.12), c, [0, 0.17, 0]);
      body.rotation.y = 0;
      g.cylinder(0.07, 0.07, 0.42, [0, 0.36, 0.26], g.material('#3f7fa8', { roughness: 0.9 }), 14).rotation.z = Math.PI / 2;
      g.mesh(new RoundedBoxGeometry(0.26, 0.1, 0.24, 3, 0.04), g.material('#2a2a2a', { roughness: 0.9 }), [0, 0.34, -0.12]);
      for (const x of [-0.08, 0.08]) g.mesh(new RoundedBoxGeometry(0.1, 0.11, 0.26, 2, 0.04), g.material('#6a4a30', { roughness: 0.8 }), [x, 0.07, -0.47]);
    });

    const special: Record<keyof typeof OWNERS, () => void> = {
      family: () => hard(0.34, 0.2, 0.46, '#e88ab0'),
      business: () => soft(0.5, 0.1, 0.6, '#16181b'),
      backpacker: rucksack,
      emigrant: () => market(0.5, 0.34, 0.6),
      musician: guitar,
      nobody: () => soft(0.46, 0.24, 0.62, '#85898d'),
    };
    const generic = () => {
      if (a.owner === 'emigrant' && random() < 0.6) return market(0.46 + random() * 0.1, 0.26 + random() * 0.12, 0.56 + random() * 0.12);
      if ((a.owner === 'backpacker' || a.owner === 'nobody') && random() < 0.6) return soft(0.46 + random() * 0.08, 0.24 + random() * 0.08, 0.6 + random() * 0.14, tint());
      return hard(0.44 + random() * 0.1, 0.2 + random() * 0.1, 0.6 + random() * 0.16, tint());
    };
    if (a.load === 'box') carton(0.5, 0.36 + random() * 0.12, 0.56 + random() * 0.1);
    else if (a.load === 'one') (a.owner === 'emigrant' ? () => hard(0.5, 0.2, 0.72, '#6b452c') : generic)();
    else if (a.load !== 'empty') {
      const n = a.load === 'stack' ? 2 + Math.floor(random() * 2) : 4 + Math.floor(random() * 2);
      for (let k = 0; k < n; k++) generic();
      if (a.load === 'tower' && a.owner === 'emigrant') carton(0.42, 0.3, 0.46);
      special[a.owner]();
    }
    let y = 0.2;
    let lean = 0;
    const topple = a.load === 'tower' ? 0.07 : 0.03;
    for (const [index, entry] of pieces.entries()) {
      entry.mesh.position.set((random() - 0.5) * 0.06 + lean, y, 0.02 + (random() - 0.5) * 0.08 - index * 0.015);
      entry.mesh.rotation.y = (random() - 0.5) * (0.25 + mood.energy * 0.3) + (random() < 0.25 ? Math.PI / 2 * 0 : 0);
      entry.mesh.rotation.z = (random() - 0.5) * topple;
      lean += (random() - 0.5) * topple;
      lead.add(entry.mesh);
      y += entry.h * (a.owner === 'backpacker' || a.owner === 'nobody' ? 0.9 : 1) + 0.004;
    }
    if (a.load === 'tower') {
      // Ratchet straps cinched over the whole pile.
      const strap = s.material('#e6b422', { roughness: 0.8 });
      for (const z of [-0.12, 0.2]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.035, y - 0.18, 0.006), strap); for (const x of [-0.3, 0.3]) { const b = band.clone(); b.position.set(x, (y + 0.2) / 2, z); b.rotation.y = Math.PI / 2; b.rotation.z = x > 0 ? 0.04 : -0.04; lead.add(b); } const over = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.006, 0.035), strap); over.position.set(lean / 2, y + 0.004, z); lead.add(over); }
      if (a.owner === 'family') { const bear = s.material('#b98a58', { roughness: 1 }); const b = new Sculpture(context); b.ball([0.08, 0.09, 0.07], [0, 0.09, 0], bear, 12); b.ball([0.06, 0.06, 0.055], [0, 0.2, 0.01], bear, 12); for (const x of [-0.045, 0.045]) b.ball([0.022, 0.022, 0.015], [x, 0.255, 0], bear, 8); b.root.position.set(lean, y, 0.1); b.root.rotation.z = 0.3; lead.add(b.root); }
    }

    if (a.tag && pieces.length) {
      const paper = new THREE.MeshStandardMaterial({ color: '#f5f3ea', roughness: 0.8, side: THREE.DoubleSide });
      for (const entry of pieces) {
        if (random() < 0.3) continue;
        const tagX = (random() < 0.5 ? -1 : 1) * 0.27, base = entry.mesh.position.y + entry.h * 0.6;
        const strip = s.mesh(new THREE.PlaneGeometry(0.045, 0.2), paper, [tagX, base - 0.08, 0.2 + random() * 0.15]);
        strip.rotation.y = Math.PI / 2; strip.rotation.x = (random() - 0.5) * 0.5;
        s.box([0.004, 0.03, 0.045], [tagX, base - 0.12, strip.position.z], s.material('#2a2a2a'));
        strip.removeFromParent(); lead.add(strip);
      }
      s.box([0.1, 0.004, 0.06], [0.05, y + 0.002, 0.1], s.material('#e0372c', { emissive: '#7a1410', emissiveIntensity: 0.3 }));
    }

    // How long it has waited.
    if (a.waiting === 'moments') {
      const coat = s.material(mood.cheer > 0.5 ? '#c7862d' : '#5a5348', { roughness: 0.95 });
      const drape = s.mesh(new RoundedBoxGeometry(0.5, 0.26, 0.09, 3, 0.04), coat, [0, 0.86, -0.57]);
      drape.rotation.x = -0.2;
      s.tube([[0.2, 0.9, -0.6], [0.3, 0.7, -0.64], [0.28, 0.52, -0.62]], 0.045, coat);
      s.cylinder(0.04, 0.03, 0.11, [-0.14, 0.725, -0.42], s.material('#f0ece0'), 14);
      s.cylinder(0.042, 0.042, 0.012, [-0.14, 0.785, -0.42], rubber, 14);
    } else if (a.waiting === 'hours') {
      const paper = s.material('#d9d5c8', { roughness: 1 });
      const sheet = s.box([0.3, 0.012, 0.4], [0.5 + random() * 0.15, 0.006, 0.1 + random() * 0.3], paper);
      sheet.rotation.y = random() * 3;
      s.box([0.3, 0.004, 0.4], [sheet.position.x + 0.12, 0.003, sheet.position.z + 0.2], paper).rotation.y = random() * 3;
      s.cylinder(0.03, 0.04, 0.1, [-0.45 - random() * 0.1, 0.02, 0.3], s.material('#f0ece0'), 12).rotation.z = Math.PI / 2;
    } else if (a.waiting === 'days') {
      const notice = s.label('UNATTENDED', 0.42, 0.16, [0, Math.max(y - 0.1, 0.5), 0.6], '#141414', '#ffd21e');
      notice.position.z = pieces.length ? 0.42 : -0.29;
      notice.position.y = pieces.length ? 0.2 + pieces[0].h * 0.55 : 0.5;
      notice.rotation.z = (random() - 0.5) * 0.2;
      const hazard = s.material('#ef6a1c', { roughness: 0.6 });
      const cx = 0.55 + random() * 0.15, cz = 0.35 + random() * 0.3;
      s.box([0.3, 0.025, 0.3], [cx, 0.0125, cz], hazard);
      s.cylinder(0.03, 0.12, 0.5, [cx, 0.27, cz], hazard, 16);
      s.cylinder(0.062, 0.085, 0.1, [cx, 0.33, cz], s.material('#f4f4f0'), 16);
    } else {
      // Dust sheet of grey over everything flat, and a cobweb strand off the handle.
      const web = new THREE.MeshStandardMaterial({ color: '#e8e8e4', transparent: true, opacity: 0.55, depthWrite: false });
      for (let k = 0; k < 4; k++) s.rod([-0.3 + random() * 0.6, 0.98, -0.565], [-0.3 + random() * 0.6, 0.66 + random() * 0.14, -0.4 + random() * 0.1], 0.0025, web);
      s.cylinder(0.3, 0.3, 0.004, [0.05, 0.002, 0.1], new THREE.MeshStandardMaterial({ color: '#77756e', transparent: true, opacity: 0.25, depthWrite: false }), 24).scale.set(1.3, 1, 2.2);
    }

    return s.finish();
  },
});
