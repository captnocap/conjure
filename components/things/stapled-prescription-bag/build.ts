import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function paw(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  c.beginPath(); c.ellipse(x, y + size * 0.35, size * 0.55, size * 0.45, 0, 0, 7); c.fill();
  for (const [dx, dy] of [[-0.6, -0.2], [-0.22, -0.6], [0.22, -0.6], [0.6, -0.2]]) { c.beginPath(); c.ellipse(x + dx * size, y + dy * size, size * 0.2, size * 0.26, 0, 0, 7); c.fill(); }
}

export default defineThing({
  questions: {
    state: choice('Where is the bag in its story?', {
      counter: 'Just filled: crisp and upright on the pharmacy counter, waiting to be handed over.',
      bin: 'Waiting for weeks in the will-call bin among other uncollected bags, going soft and dusty.',
      home: 'Collected and opened at home: the bag torn and on its side on a wooden table, bottles out.',
    }),
    bottles: choice('How much medicine is there?', {
      one: 'A single amber bottle.',
      two: 'Two bottles.',
      many: 'Five or six bottles, a whole regimen.',
    }),
    whose: choice('Who does it read as being for?', {
      adult: 'An anonymous adult: nothing but the bottles.',
      child: 'A child: a bottle of pink liquid with a dosing syringe, and a bright sticker on the bag.',
      elderly: 'Someone elderly: a weekly pill organiser with lettered lids beside it.',
      pet: 'A pet: a paw print on the label and a bone-shaped biscuit.',
    }),
    note: choice('Is a note attached to the bag?', {
      none: 'No note.',
      call: 'A yellow sticky note in a hurried hand: the pharmacist wants a word.',
      cold: 'A blue KEEP COLD sticker.',
      love: 'A hand-written get-well note with a small heart.',
      last: 'A red LAST REFILL slip.',
    }),
    print: choice('What is printed on the bag?', {
      plain: 'Plain white paper, nothing but the label.',
      rx: 'A large blue Rx symbol.',
      cross: 'A green pharmacy cross.',
      mortar: 'A red mortar and pestle, an old family drugstore.',
    }),
    receipt: choice('How long is the stapled receipt?', {
      short: 'A neat short slip.',
      long: 'An absurdly long chain-store receipt curling down past the bag.',
      wad: 'Several leaflets and slips stapled in a thick wad.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paperTone = new THREE.Color('#f7f5ee').lerp(new THREE.Color('#d9cfae'), (a.state === 'bin' ? 0.35 : 0) + mood.wear * 0.4);
    const paperHex = `#${paperTone.getHexString()}`;
    const paper = s.material(paperTone, { roughness: 0.95 });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // What it stands on.
    const top = a.state === 'bin' ? 0.03 : 0.06;
    if (a.state === 'counter') {
      s.box([0.52, 0.05, 0.36], [0, 0.035, 0], s.material(mood.warmth > 0.6 ? '#d9c9a8' : '#e4e6e3', { roughness: 0.4 }));
      s.box([0.54, 0.02, 0.38], [0, 0.01, 0], s.material('#7d8388', { roughness: 0.5 }));
      s.cylinder(0.01, 0.01, 0.34, [0, 0.045, 0.18], s.material('#c5cacc', { metalness: 0.8, roughness: 0.3 }), 8).rotation.z = Math.PI / 2;
    } else if (a.state === 'home') {
      const board = s.material(pick(['#9a6a3c', '#7c4f2a', '#b9884f']), { roughness: 0.6 });
      for (let i = 0; i < 4; i++) s.box([0.58, 0.055, 0.108], [0, 0.03, -0.165 + i * 0.11], board).position.y += (random() - 0.5) * 0.004;
    } else {
      const bin = s.material(pick(['#2f62a8', '#8a8f94', '#b8392e']), { roughness: 0.5 });
      s.box([0.6, 0.03, 0.42], [0, 0.015, 0], bin);
      for (const [w, d, x, z] of [[0.6, 0.012, 0, 0.21], [0.6, 0.012, 0, -0.21], [0.012, 0.42, 0.3, 0], [0.012, 0.42, -0.3, 0]] as const) s.box([w, 0.13, d], [x, 0.065, z], bin);
      s.box([0.63, 0.018, 0.45], [0, 0.135, 0], bin).visible = false;
    }

    const printColour = { plain: '#888888', rx: '#2458b0', cross: '#1f9a55', mortar: '#b8322a' }[a.print];
    const patient = { adult: ['M. OKAFOR', 'J. REYES', 'T. LINDQVIST', 'A. BAUER'], child: ['MILA, AGE 4', 'THEO, AGE 6', 'JUNO, AGE 3'], elderly: ['MRS E. HART', 'MR W. ABE', 'MRS R. KLEIN'], pet: ['BISCUIT (DOG)', 'MR WHISKERS', 'PEPPER (CAT)'] }[a.whose];
    const name = pick(patient);
    const bagFront = (who: string, hero: boolean) => paint(256, 400, (c, w, h) => {
      c.fillStyle = paperHex;
      c.fillRect(0, 0, w, h);
      c.fillStyle = printColour;
      c.strokeStyle = printColour;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (a.print === 'rx') { c.font = 'bold italic 150px serif'; c.fillText('Rx', w / 2, 300); }
      else if (a.print === 'cross') { c.fillRect(w / 2 - 28, 230, 56, 150); c.fillRect(w / 2 - 75, 277, 150, 56); }
      else if (a.print === 'mortar') {
        c.beginPath(); c.moveTo(70, 270); c.lineTo(186, 270); c.lineTo(165, 350); c.lineTo(91, 350); c.closePath(); c.fill();
        c.fillRect(80, 352, 96, 14);
        c.lineWidth = 14; c.beginPath(); c.moveTo(120, 280); c.lineTo(190, 215); c.stroke();
      }
      // Pharmacy label.
      c.fillStyle = '#ffffff';
      c.fillRect(22, 78, w - 44, 124);
      c.strokeStyle = '#9aa0a6'; c.lineWidth = 2; c.strokeRect(22, 78, w - 44, 124);
      c.fillStyle = printColour === '#888888' ? '#2a2f36' : printColour;
      c.fillRect(22, 78, w - 44, 22);
      c.fillStyle = '#1c2026';
      c.textAlign = 'left';
      c.font = 'bold 24px sans-serif';
      c.fillText(who, 30, 122, w - 60);
      c.fillStyle = '#6a6f76';
      for (const [y, len] of [[146, 150], [162, 180], [178, 110]]) c.fillRect(30, y, len, 6);
      if (hero && a.whose === 'pet') { c.fillStyle = '#3a3026'; paw(c, w - 50, 164, 20); }
      // Fold shadow.
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.fillRect(0, 58, w, 5);
    });
    const makeBag = (who: string, hero: boolean, width = 0.15, height = 0.24) => {
      const g = new Sculpture(context);
      const front = new THREE.MeshStandardMaterial({ map: bagFront(who, hero), roughness: 0.95 });
      const depth = 0.075;
      const body = new THREE.BoxGeometry(width, height, depth, 1, 4, 1);
      // Pinch the top closed and bulge the belly, like a filled flat-bottom bag.
      const position = body.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const t = position.getY(i) / height + 0.5;
        const pinch = t > 0.7 ? mix(1, 0.12, (t - 0.7) / 0.3) : mix(0.9, 1.05, Math.sin(t / 0.7 * Math.PI));
        position.setZ(i, position.getZ(i) * pinch);
        if (t > 0.4 && t < 0.9) position.setX(i, position.getX(i) * mix(1, 0.97, random() * mood.wear));
      }
      body.computeVertexNormals();
      g.mesh(body, [paper, paper, paper, paper, front, paper] as unknown as THREE.Material, [0, height / 2, 0]);
      // The folded-over top with two staples.
      const flap = g.box([width, 0.035, 0.006], [0, height - 0.02, 0.012], paper);
      flap.rotation.x = 0.1;
      for (const x of [-0.03, 0.03]) g.box([0.014, 0.003, 0.003], [x + (random() - 0.5) * 0.01, height - 0.02, 0.017], s.material('#9ba0a4', { metalness: 0.8, roughness: 0.3 }));
      return g;
    };

    const hero = makeBag(name, true);
    const bag = hero.root;
    bag.scale.setScalar(1.22);
    s.root.add(bag);
    const bagX = a.state === 'home' ? -0.13 : -0.1;
    // Receipt, stapled under the fold.
    const receiptMap = paint(64, 256, (c, w, h) => {
      c.fillStyle = '#fbfaf4';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#4a4e55';
      for (let y = 8; y < h - 6; y += 7) c.fillRect(6, y, 14 + ((y * 7) % 36), 2.5);
      c.fillRect(6, h - 30, 52, 16);
    });
    receiptMap.wrapT = THREE.RepeatWrapping;
    const slipMaterial = new THREE.MeshStandardMaterial({ map: receiptMap, roughness: 0.9, side: THREE.DoubleSide });
    const slips = a.receipt === 'wad' ? 4 : 1;
    const sway: THREE.Object3D[] = [];
    for (let i = 0; i < slips; i++) {
      const length = a.receipt === 'long' ? mix(0.3, 0.42, random()) : a.receipt === 'wad' ? mix(0.09, 0.16, random()) : 0.1;
      const widthSlip = a.receipt === 'wad' ? mix(0.05, 0.1, random()) : 0.05;
      const strip = new THREE.PlaneGeometry(widthSlip, length, 1, 16);
      strip.translate(0, -length / 2, 0);
      const p = strip.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const d = -p.getY(k);
        // Hangs flat against the bag, then curls out and along the counter once it is longer than the bag.
        const over = Math.max(0, d - 0.2);
        p.setZ(k, Math.min(d, 0.06) * 0.5 + Math.sin(d * 18 + i) * 0.003 + over * 0.9 + Math.sin(over * 30) * 0.012);
        if (over > 0) p.setY(k, -0.2 - over * 0.12);
      }
      strip.computeVertexNormals();
      const mesh = new THREE.Mesh(strip, slipMaterial);
      mesh.position.set((i - (slips - 1) / 2) * 0.012 + 0.025, 0.222, 0.018 + i * 0.002);
      mesh.rotation.z = (random() - 0.5) * (a.receipt === 'wad' ? 0.5 : 0.12);
      mesh.castShadow = true;
      bag.add(mesh);
      sway.push(mesh);
    }
    // The note.
    if (a.note !== 'none') {
      const spec = {
        call: { paper: '#f6e45a', ink: '#27324d', lines: ['SEE', 'PHARMACIST'], size: [0.085, 0.085] },
        cold: { paper: '#2f7fd0', ink: '#ffffff', lines: ['KEEP', 'COLD'], size: [0.09, 0.05] },
        love: { paper: '#fbe9ef', ink: '#b02a4a', lines: ['get well', 'soon  x'], size: [0.09, 0.07] },
        last: { paper: '#d6362c', ink: '#ffffff', lines: ['LAST', 'REFILL'], size: [0.09, 0.055] },
      }[a.note];
      const map = paint(160, Math.round(160 * spec.size[1] / spec.size[0]), (c, w, h) => {
        c.fillStyle = spec.paper;
        c.fillRect(0, 0, w, h);
        c.fillStyle = spec.ink;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `${a.note === 'love' || a.note === 'call' ? 'italic ' : ''}bold ${a.note === 'call' ? 26 : 34}px ${a.note === 'love' || a.note === 'call' ? 'cursive' : 'sans-serif'}`;
        spec.lines.forEach((line, index) => c.fillText(line, w / 2, h * (0.33 + index * 0.36), w - 10));
        if (a.note === 'love') { c.font = '30px serif'; c.fillText('♥', w - 22, h - 20); }
      });
      const sticky = new THREE.Mesh(new THREE.PlaneGeometry(spec.size[0], spec.size[1]), new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide }));
      sticky.position.set(-0.035, 0.07, 0.046);
      sticky.rotation.set(-0.06, 0, (random() - 0.5) * 0.35);
      sticky.castShadow = true;
      bag.add(sticky);
    }
    if (a.whose === 'child') {
      const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshStandardMaterial({ roughness: 0.4, map: paint(64, 64, (c) => {
        c.fillStyle = pick(['#ffd23a', '#ff7ab0', '#5ad0f0']);
        c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#2a2a2a';
        c.beginPath(); c.arc(22, 26, 4, 0, 7); c.arc(42, 26, 4, 0, 7); c.fill();
        c.lineWidth = 4; c.beginPath(); c.arc(32, 32, 16, 0.2, Math.PI - 0.2); c.stroke();
      }) }));
      sticker.position.set(0.045, 0.2, 0.03);
      sticker.rotation.x = -0.25;
      bag.add(sticker);
    }

    // Bottles and companions.
    const amber = new THREE.MeshStandardMaterial({ color: '#e07a12', roughness: 0.2, transparent: true, opacity: 0.88, emissive: '#b04a00', emissiveIntensity: mix(0.15, 0.45, mood.warmth) });
    const capWhite = s.material('#f4f4f0', { roughness: 0.5 });
    const labelMap = paint(128, 64, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = printColour === '#888888' ? '#2a2f36' : printColour;
      c.fillRect(0, 0, w, 12);
      c.fillStyle = '#3a3f46';
      for (const [y, len] of [[22, 90], [34, 110], [46, 60]]) c.fillRect(8, y, len, 5);
    });
    const labelMaterial = new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.8 });
    const bottle = (x: number, z: number, size: number, fallen: boolean, open = false) => {
      const g = new Sculpture(context);
      const r = 0.023 * size, h = 0.07 * size;
      g.cylinder(r, r, h, [0, h / 2, 0], amber, 20);
      g.cylinder(r * 0.6, r * 0.6, h * 0.5 * mix(0.5, 1, random()), [0, h * 0.25, 0], s.material('#f1ede2', { roughness: 0.8 }), 10).castShadow = false;
      const wrap = g.mesh(new THREE.CylinderGeometry(r + 0.0008, r + 0.0008, h * 0.62, 20, 1, true, -1.9, 3.8), labelMaterial, [0, h * 0.48, 0]);
      wrap.castShadow = false;
      if (!open) {
        g.cylinder(r * 1.12, r * 1.12, 0.017 * size, [0, h + 0.0085 * size, 0], capWhite, 20);
        for (let i = 0; i < 12; i++) g.box([0.003, 0.014 * size, 0.003], [Math.cos(i * 0.5236) * r * 1.13, h + 0.0085 * size, Math.sin(i * 0.5236) * r * 1.13], capWhite);
      }
      g.root.position.set(x, top, z);
      g.root.rotation.y = (random() - 0.5) * 1.4;
      if (fallen) { g.root.rotation.set(0, random() * 3, Math.PI / 2); g.root.position.y = top + r; }
      s.root.add(g.root);
      return g.root;
    };
    const count = { one: 1, two: 2, many: 5 + Math.floor(random() * 2) }[a.bottles];
    const spots: [number, number][] = [[0.09, 0.07], [0.17, 0.02], [0.2, 0.11], [0.12, -0.07], [0.21, -0.06], [0.06, 0.13]];
    for (let i = 0; i < count; i++) {
      const [x, z] = spots[i];
      const first = i === 0;
      if (first && a.whose === 'child') {
        // Pink liquid with a dosing syringe.
        const g = new Sculpture(context);
        g.cylinder(0.026, 0.028, 0.085, [0, 0.0425, 0], new THREE.MeshStandardMaterial({ color: '#f06a9a', roughness: 0.25, emissive: '#c03a6a', emissiveIntensity: 0.25 }), 18);
        g.cylinder(0.012, 0.022, 0.02, [0, 0.094, 0], amber, 14);
        g.cylinder(0.015, 0.015, 0.02, [0, 0.112, 0], capWhite, 14);
        g.mesh(new THREE.CylinderGeometry(0.0285, 0.0285, 0.05, 18, 1, true, -1.9, 3.8), labelMaterial, [0, 0.042, 0]);
        g.root.position.set(x + bagX + 0.1, top, z);
        s.root.add(g.root);
        const syringe = s.cylinder(0.006, 0.006, 0.09, [x + bagX + 0.17, top + 0.006, z + 0.06], s.material('#e8f2f6', { roughness: 0.2 }), 10);
        syringe.rotation.set(Math.PI / 2, 0, 0.7);
        s.cylinder(0.009, 0.009, 0.006, [x + bagX + 0.2, top + 0.006, z + 0.025], s.material('#f06a9a'), 10).rotation.set(Math.PI / 2, 0, 0.7);
        continue;
      }
      bottle(x + bagX + 0.1 + (random() - 0.5) * 0.015, z + (random() - 0.5) * 0.015, mix(0.85, 1.35, random()), a.state === 'home' && i > 0 && random() < 0.4, a.state === 'home' && first);
    }
    if (a.state === 'home') {
      // Opened: a loose cap and a few tablets on the table.
      s.cylinder(0.027, 0.027, 0.017, [bagX + 0.2, top + 0.0085, 0.15], capWhite, 20);
      const pills = Array.from({ length: 3 + Math.floor(random() * 5) }, () => ({ at: [bagX + 0.12 + random() * 0.12, top + 0.004, 0.11 + random() * 0.07] as [number, number, number], size: 1, color: pick(['#f4f1e6', '#f4f1e6', '#e9a0a0', '#a9c8ea']) }));
      s.scatter(new THREE.SphereGeometry(0.007, 10, 6).scale(1, 0.5, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), pills);
    }
    if (a.whose === 'elderly') {
      const ox = 0.02, oz = 0.16;
      const tray = s.material('#7fb3d9', { roughness: 0.4, transparent: true, opacity: 0.9 });
      s.box([0.3, 0.022, 0.05], [ox, top + 0.011, oz], tray).rotation.y = 0.0;
      'SMTWTFS'.split('').forEach((letter, index) => {
        const lidOpen = random() < mix(0.15, 0.5, mood.energy);
        const lid = s.label(letter, 0.038, 0.044, [ox - 0.123 + index * 0.041, top + 0.0235, oz], '#ffffff', '#3f7fb5');
        lid.rotation.x = -Math.PI / 2;
        if (lidOpen) { lid.rotation.x = -0.4; lid.position.y += 0.02; lid.position.z -= 0.024; }
      });
    } else if (a.whose === 'pet') {
      const biscuit = s.material('#c99a5a', { roughness: 0.9 });
      const bx = 0.03, bz = 0.15;
      s.box([0.07, 0.014, 0.022], [bx, top + 0.007, bz], biscuit).rotation.y = 0.4;
      for (const end of [-1, 1]) for (const lobe of [-1, 1]) s.ball([0.014, 0.008, 0.014], [bx + end * 0.036 * Math.cos(0.4) + lobe * 0.006, top + 0.007, bz - end * 0.036 * Math.sin(0.4) + lobe * 0.011], biscuit, 10);
    }

    // Place the hero bag, and its uncollected neighbours.
    if (a.state === 'home') {
      bag.position.set(bagX, top + 0.05, -0.06);
      bag.rotation.set(-Math.PI / 2 + 0.06, 0, 0.5 + (random() - 0.5) * 0.4, 'YXZ');
      bag.rotation.y = (random() - 0.5) * 0.6;
    } else {
      bag.position.set(bagX, top, a.state === 'bin' ? 0.0 : -0.02);
      bag.rotation.y = (random() - 0.5) * 0.35;
      bag.rotation.x = a.state === 'bin' ? -0.14 : -mood.wear * 0.05;
    }
    if (a.state === 'bin') {
      const others = 2 + Math.round(mix(1, 4, mood.density));
      for (let i = 0; i < others; i++) {
        const other = makeBag(pick(['A-D', 'HELD', 'K. MORA', 'R. OSEI', 'P. NGUYEN', 'RETURN']), false, mix(0.12, 0.16, random()), mix(0.18, 0.26, random())).root;
        other.position.set(-0.2 + (i % 4) * 0.13 + (random() - 0.5) * 0.03, top, -0.1 - Math.floor(i / 4) * 0.07 - random() * 0.03);
        other.rotation.set(-0.12 - random() * 0.15, (random() - 0.5) * 0.3, (random() - 0.5) * 0.1);
        other.scale.setScalar(1.15);
        s.root.add(other);
      }
      const tab = s.label(pick(['A - F', 'G - L', 'M - R', 'S - Z', 'WILL CALL']), 0.2, 0.06, [0.15, 0.17, 0.204], '#ffffff', '#2a2f36');
      s.box([0.2, 0.16, 0.004], [0.15, 0.12, 0.2], s.material('#e9e3c9'));
      void tab;
    }

    return s.finish({
      update: (_dt, time) => {
        for (const [index, slip] of sway.entries()) slip.rotation.x = Math.sin(time * mix(0.4, 2.6, mood.energy) + index) * mix(0, 0.05, mood.energy);
      },
    });
  },
});
