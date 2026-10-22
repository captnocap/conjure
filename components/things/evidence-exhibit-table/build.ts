import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const EXHIBITS = {
  revolver: 'A snub revolver, dark and oily.',
  knife: 'A kitchen knife with a long blade.',
  letters: 'A bundle of letters tied with red ribbon.',
  shoe: "One small child's shoe, bright red.",
  ledgers: 'A pile of fat account ledgers.',
  clock: 'A mantel clock with a cracked face, stopped.',
  bottle: 'A small brown medicine bottle with a paper label.',
  shirt: 'A folded white shirt with a dark stain.',
  key: 'A single large old iron key.',
  photographs: 'A fan of black-and-white photographs.',
  phone: 'A smashed mobile phone.',
  cash: 'Banded bricks of banknotes.',
} as const;
type Exhibit = keyof typeof EXHIBITS;

export default defineThing({
  questions: {
    first: choice('What is the most important exhibit, front and centre?', EXHIBITS),
    second: choice('What lies beside it?', EXHIBITS),
    third: choice('And the third exhibit?', EXHIBITS),
    count: score('How many exhibits are on the table altogether?', ['Just those three', 'Five or six', 'A crowded table of eight']),
    packaging: choice('How are the exhibits kept?', {
      bags: 'Sealed in clear plastic evidence bags with red tape and white labels.',
      boxes: 'In open cardboard trays and brown paper bags.',
      bare: 'Laid bare on the table, each with a manila tag on a string.',
    }),
    markers: choice('How are they numbered?', {
      tents: 'Yellow numbered tent markers, as at a crime scene.',
      cards: 'White cards lettered A, B, C.',
      discs: 'Small brass numbered discs on stands.',
      none: 'They are not numbered at all.',
    }),
    table: choice('What kind of table is it?', {
      baize: 'A trestle table under a green baize cloth.',
      oak: 'A heavy dark oak table with turned legs.',
      trolley: 'A stainless steel trolley on castors, wheeled in from the store.',
      paper: 'A folding table covered in white lining paper, forensic and bright.',
    }),
    state: choice('What state is the table in?', {
      orderly: 'An orderly row, everything squared up.',
      missing: 'Orderly, except one marker stands by an empty space: an exhibit is missing.',
      disarray: 'Rifled through: bags askew, things knocked to the floor.',
      packing: 'Being packed away into an archive box at one end; the case is over.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => s.material(c, o);
    const steel = mat('#b9c0c4', { metalness: 0.85, roughness: 0.3 });
    const dark = mat('#1b1c1f', { roughness: 0.5 });
    const white = mat('#f3f0e6');
    const red = mat('#c21f2b');
    const clear = new THREE.MeshPhysicalMaterial({ color: '#eef7fa', transparent: true, opacity: 0.28, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
    const card = mat('#b89468', { roughness: 0.95 });

    const TW = 2.1, TD = 0.98, TH = 0.78;
    // Table.
    if (a.table === 'baize') {
      const cloth = mat(mood.cheer > 0.6 ? '#2f7a4d' : '#27563c', { roughness: 1 });
      s.box([TW + 0.06, 0.03, TD + 0.06], [0, TH - 0.015, 0], cloth);
      s.box([TW + 0.07, 0.42, 0.012], [0, TH - 0.22, TD / 2 + 0.035], cloth);
      for (const x of [-1, 1]) s.box([0.012, 0.3, TD + 0.07], [x * (TW / 2 + 0.035), TH - 0.16, 0], cloth);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * (TW / 2 - 0.3), TH - 0.03, z * 0.05], [x * (TW / 2 - 0.3), 0, z * (TD / 2 - 0.05)], 0.025, mat('#7a5632'));
    } else if (a.table === 'oak') {
      const oak = mat('#4b2a18', { roughness: 0.45 });
      s.box([TW, 0.06, TD], [0, TH - 0.03, 0], oak);
      s.box([TW - 0.2, 0.12, TD - 0.16], [0, TH - 0.12, 0], mat('#5e3521'));
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe([[0.04, 0], [0.055, 0.08], [0.03, 0.16], [0.06, 0.38], [0.035, 0.55], [0.05, 0.66]], oak, [x * (TW / 2 - 0.14), 0, z * (TD / 2 - 0.12)]);
    } else if (a.table === 'trolley') {
      s.box([TW, 0.03, TD], [0, TH - 0.015, 0], steel);
      s.box([TW - 0.06, 0.02, TD - 0.06], [0, 0.26, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.cylinder(0.018, 0.018, TH - 0.1, [x * (TW / 2 - 0.04), TH / 2 + 0.04, z * (TD / 2 - 0.04)], steel, 8);
        s.cylinder(0.05, 0.05, 0.03, [x * (TW / 2 - 0.04), 0.05, z * (TD / 2 - 0.04)], dark, 14).rotation.z = Math.PI / 2;
      }
      s.rod([TW / 2 + 0.1, TH + 0.12, -TD / 2 + 0.04], [TW / 2 + 0.1, TH + 0.12, TD / 2 - 0.04], 0.014, steel);
      for (const z of [-1, 1]) s.rod([TW / 2 - 0.04, TH, z * (TD / 2 - 0.04)], [TW / 2 + 0.1, TH + 0.12, z * (TD / 2 - 0.04)], 0.014, steel);
      for (let i = 0; i < 3; i++) s.box([0.4, 0.26, 0.5], [-0.7 + i * 0.6, 0.4, 0], card).rotation.y = (random() - 0.5) * 0.2;
    } else {
      s.box([TW, 0.035, TD], [0, TH - 0.03, 0], mat('#8f8a80'));
      s.box([TW + 0.03, 0.008, TD - 0.06], [0, TH - 0.006, 0], white);
      s.box([0.5, 0.006, TD - 0.06], [-TW / 2 - 0.02, TH - 0.2, 0], white).rotation.z = 1.25;
      for (const x of [-1, 1]) {
        for (const z of [-1, 1]) s.rod([x * (TW / 2 - 0.25), TH - 0.04, z * (TD / 2 - 0.08)], [x * (TW / 2 - 0.12), 0, z * (TD / 2 - 0.08)], 0.016, steel);
        s.rod([x * (TW / 2 - 0.15), 0.2, -TD / 2 + 0.08], [x * (TW / 2 - 0.15), 0.2, TD / 2 - 0.08], 0.012, steel);
      }
    }

    // Exhibit builders: each sits on y = 0 inside roughly 0.34 x 0.26.
    const make = (kind: Exhibit) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
      };
      const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
      const cyl = (r1: number, r2: number, h: number, n = 14) => new THREE.CylinderGeometry(r1, r2, h, n);
      if (kind === 'revolver') {
        const gun = mat('#22252a', { metalness: 0.7, roughness: 0.35 });
        add(cyl(0.014, 0.014, 0.13, 10), gun, [0.085, 0.03, 0], [0, 0, Math.PI / 2]);
        add(box(0.12, 0.05, 0.03), gun, [-0.02, 0.028, 0]);
        add(cyl(0.032, 0.032, 0.055, 12), gun, [0, 0.03, 0], [0, 0, Math.PI / 2]);
        add(box(0.05, 0.035, 0.11), mat('#5a371f'), [-0.09, 0.02, 0.05], [0, 0.35, 0]);
        add(new THREE.TorusGeometry(0.02, 0.004, 6, 14), gun, [-0.03, 0.01, 0.035], [Math.PI / 2, 0, 0]);
      } else if (kind === 'knife') {
        const shape = new THREE.Shape(); shape.moveTo(0, -0.022); shape.lineTo(0.2, -0.018); shape.lineTo(0.25, 0.02); shape.lineTo(0, 0.022); shape.closePath();
        add(new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false }), mat('#dfe4e6', { metalness: 0.9, roughness: 0.2 }), [-0.03, 0.01, 0], [-Math.PI / 2, 0, 0]);
        add(box(0.12, 0.022, 0.034), dark, [-0.09, 0.012, 0]);
        if (mood.cheer < 0.5) add(box(0.09, 0.002, 0.03), mat('#6b1016'), [0.12, 0.016, 0]);
      } else if (kind === 'letters') {
        for (let i = 0; i < 7; i++) add(box(0.22, 0.012, 0.13), i % 3 ? white : mat('#e6dcc0'), [(random() - 0.5) * 0.02, 0.006 + i * 0.012, (random() - 0.5) * 0.02], [0, (random() - 0.5) * 0.2, 0]);
        add(box(0.024, 0.09, 0.15), red, [0, 0.045, 0]); add(box(0.24, 0.09, 0.024), red, [0, 0.045, 0]);
        add(new THREE.TorusGeometry(0.03, 0.008, 6, 12), red, [0.03, 0.095, 0], [Math.PI / 2, 0, 0]); add(new THREE.TorusGeometry(0.03, 0.008, 6, 12), red, [-0.03, 0.095, 0], [Math.PI / 2, 0, 0]);
      } else if (kind === 'shoe') {
        const leather = mat('#d3222e', { roughness: 0.35 });
        add(box(0.19, 0.016, 0.085), mat('#e9dcc0'), [0, 0.008, 0]);
        const toe = add(new THREE.SphereGeometry(0.05, 14, 10), leather, [0.05, 0.04, 0]); toe.scale.set(1.15, 0.75, 0.86);
        const heel = add(new THREE.SphereGeometry(0.045, 14, 10), leather, [-0.055, 0.045, 0]); heel.scale.set(0.95, 1.0, 0.92);
        add(box(0.03, 0.012, 0.1), leather, [-0.01, 0.078, 0]);
        add(cyl(0.012, 0.012, 0.008, 8), mat('#f2d470', { metalness: 0.6 }), [-0.01, 0.08, 0.05], [Math.PI / 2, 0, 0]);
      } else if (kind === 'ledgers') {
        const hues = ['#1f4a35', '#6a1826', '#22386b', '#3a2a20'];
        for (let i = 0; i < 3; i++) {
          const h = 0.05 + random() * 0.025, y = i * 0.07;
          add(box(0.3, h, 0.22), mat(hues[Math.floor(random() * hues.length)]), [0, y + h / 2, 0], [0, (random() - 0.5) * 0.3, 0]);
          add(box(0.285, h - 0.014, 0.21), white, [0.012, y + h / 2, 0.01]);
          add(box(0.1, 0.004, 0.06), white, [0, y + h + 0.001, 0]);
        }
      } else if (kind === 'clock') {
        const wood = mat('#6b3f22', { roughness: 0.4 });
        const body = new THREE.Group(); g.add(body);
        const sub = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = true; body.add(mesh); };
        sub(box(0.3, 0.04, 0.12), wood, [0, 0.02, 0]);
        sub(box(0.24, 0.16, 0.1), wood, [0, 0.12, 0]);
        sub(cyl(0.12, 0.12, 0.1, 24), wood, [0, 0.2, 0], [Math.PI / 2, 0, 0]);
        sub(cyl(0.095, 0.095, 0.105, 24), white, [0, 0.2, 0.002], [Math.PI / 2, 0, 0]);
        sub(cyl(0.1, 0.1, 0.012, 24), mat('#c9a24a', { metalness: 0.7 }), [0, 0.2, 0.05], [Math.PI / 2, 0, 0]);
        sub(cyl(0.088, 0.088, 0.014, 24), white, [0, 0.2, 0.052], [Math.PI / 2, 0, 0]);
        const h1 = random() * 6.28, h2 = random() * 6.28;
        sub(box(0.01, 0.07, 0.004), dark, [Math.sin(h1) * 0.03, 0.2 + Math.cos(h1) * 0.03, 0.062], [0, 0, -h1]);
        sub(box(0.014, 0.05, 0.004), dark, [Math.sin(h2) * 0.02, 0.2 + Math.cos(h2) * 0.02, 0.063], [0, 0, -h2]);
        sub(box(0.004, 0.15, 0.003), dark, [0.02, 0.2, 0.061], [0, 0, 0.7]); sub(box(0.004, 0.09, 0.003), dark, [-0.03, 0.22, 0.061], [0, 0, -0.9]);
        body.rotation.x = -1.25; body.position.set(0, 0.06, 0.12);
      } else if (kind === 'bottle') {
        const brown = mat('#5a3214', { roughness: 0.15, transparent: true, opacity: 0.9 });
        add(cyl(0.04, 0.04, 0.12), brown, [0, 0.06, 0]); add(cyl(0.018, 0.035, 0.03), brown, [0, 0.135, 0]); add(cyl(0.02, 0.02, 0.03), dark, [0, 0.165, 0]);
        add(cyl(0.0415, 0.0415, 0.06, 14), white, [0, 0.06, 0]);
        add(box(0.03, 0.03, 0.002), red, [0, 0.06, 0.0425]);
        for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.009, 6, 5), white, [0.07 + random() * 0.07, 0.008, (random() - 0.5) * 0.1]);
      } else if (kind === 'shirt') {
        add(box(0.3, 0.04, 0.24), white, [0, 0.02, 0]);
        add(box(0.12, 0.012, 0.05), white, [0, 0.046, -0.085], [0, 0, 0]);
        for (const x of [-1, 1]) add(box(0.07, 0.012, 0.05), white, [x * 0.045, 0.05, -0.07], [0, x * 0.6, 0]);
        const stain = add(cyl(0.07, 0.07, 0.004, 14), mat(mood.cheer > 0.6 ? '#7a4a22' : '#6b1016'), [0.04, 0.042, 0.04]); stain.scale.set(1.2, 1, 0.8);
        add(cyl(0.025, 0.025, 0.004, 10), mat(mood.cheer > 0.6 ? '#7a4a22' : '#6b1016'), [-0.07, 0.042, 0.07]);
      } else if (kind === 'key') {
        const iron = mat('#3b3d42', { metalness: 0.7, roughness: 0.5 });
        add(new THREE.TorusGeometry(0.04, 0.011, 8, 18), iron, [-0.1, 0.012, 0], [Math.PI / 2, 0, 0]);
        add(cyl(0.01, 0.01, 0.2, 8), iron, [0.03, 0.012, 0], [0, 0, Math.PI / 2]);
        add(box(0.03, 0.012, 0.05), iron, [0.11, 0.012, 0.03]); add(box(0.016, 0.012, 0.035), iron, [0.075, 0.012, 0.022]);
        add(box(0.07, 0.003, 0.04), mat('#d8c9a0'), [-0.14, 0.004, 0.08], [0, 0.6, 0]);
      } else if (kind === 'photographs') {
        for (let i = 0; i < 5; i++) {
          const r = (i - 2) * 0.28 + (random() - 0.5) * 0.1;
          add(box(0.16, 0.003, 0.12), white, [(i - 2) * 0.05, 0.003 + i * 0.004, (random() - 0.5) * 0.03], [0, r, 0]);
          add(box(0.14, 0.003, 0.1), mat(['#34363a', '#5a5d62', '#22242a'][i % 3]), [(i - 2) * 0.05, 0.0045 + i * 0.004, 0], [0, r, 0]);
        }
      } else if (kind === 'phone') {
        add(box(0.085, 0.012, 0.17), dark, [0, 0.006, 0], [0, 0.3, 0]);
        add(box(0.075, 0.002, 0.155), mat('#3c4654', { roughness: 0.1 }), [0, 0.013, 0], [0, 0.3, 0]);
        for (let i = 0; i < 5; i++) add(box(0.002, 0.002, 0.05 + random() * 0.07), white, [(random() - 0.5) * 0.04, 0.015, (random() - 0.5) * 0.05], [0, random() * 3, 0]);
        for (let i = 0; i < 5; i++) add(box(0.012, 0.004, 0.012), dark, [0.08 + random() * 0.06, 0.003, (random() - 0.5) * 0.12], [0, random() * 3, 0]);
      } else {
        const note = mat(mood.cheer > 0.5 ? '#7fae78' : '#8a9a84');
        for (let i = 0; i < 5; i++) {
          const x = (i % 3 - 1) * 0.11 + (i > 2 ? 0.05 : 0), y = i > 2 ? 0.05 : 0;
          add(box(0.1, 0.05, 0.19), note, [x, y + 0.025, 0], [0, (random() - 0.5) * 0.15, 0]);
          add(box(0.102, 0.052, 0.035), white, [x, y + 0.025, 0]);
        }
      }
      return g;
    };

    const numberTile = (text: string, ink: string, paper: string) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = paper; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = ink; ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 36);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    };

    // Lay them out.
    const kinds = Object.keys(EXHIBITS) as Exhibit[];
    const total = Math.round(mix(3, 8, a.count));
    const list: Exhibit[] = [a.first, a.second, a.third];
    while (list.length < total) list.push(kinds[Math.floor(random() * kinds.length)]);
    const rows = total > 5 ? 2 : 1;
    const perFront = rows === 2 ? Math.ceil(total / 2) : total;
    const order = [Math.floor((perFront - 1) / 2)];
    for (let i = 0; i < total; i++) if (i !== order[0]) order.push(i);
    const missing = a.state === 'missing' ? 1 + Math.floor(random() * Math.min(2, total - 1)) : -1;
    const usable = a.state === 'packing' ? TW - 0.75 : TW - 0.3;
    const x0 = a.state === 'packing' ? -TW / 2 + 0.15 + usable / 2 : 0;
    const messy = a.state === 'disarray';
    list.forEach((kind, n) => {
      const slot = order[n];
      const row = slot < perFront ? 0 : 1, col = row ? slot - perFront : slot, inRow = row ? total - perFront : perFront;
      const x = x0 + (col - (inRow - 1) / 2) * usable / Math.max(inRow, 1 + (inRow > 1 ? 0 : 0)) * (inRow > 1 ? inRow / (inRow - 0.0) : 1) * 0.92;
      const z = rows === 2 ? (row ? -0.24 : 0.24) : 0.02;
      const packed = a.state === 'packing' && n >= Math.ceil(total * 0.55);
      const gone = n === missing || packed;
      const spot = new THREE.Group();
      const fallen = messy && n > 0 && random() < 0.3;
      spot.position.set(x + (messy ? (random() - 0.5) * 0.15 : 0), TH, z + (messy ? (random() - 0.5) * 0.1 : 0));
      spot.rotation.y = (random() - 0.5) * (messy ? 1.6 : 0.16);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = mesh.receiveShadow = true; spot.add(mesh); return mesh;
      };
      const big = (n === 0 ? 1.75 : 1.4) * (total > 6 ? 0.88 : 1);
      if (!gone) {
        const item = make(kind); item.scale.setScalar(big);
        if (a.packaging === 'boxes' && !fallen) {
          add(new THREE.BoxGeometry(0.4, 0.012, 0.3), card, [0, 0.006, 0]);
          for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.07, 0.3), card, [sx * 0.2, 0.035, 0]);
          add(new THREE.BoxGeometry(0.4, 0.07, 0.012), card, [0, 0.035, -0.15]); add(new THREE.BoxGeometry(0.4, 0.045, 0.012), card, [0, 0.022, 0.15]);
          item.position.y = 0.012;
        }
        if (fallen) {
          item.position.set((random() - 0.5) * 0.3, -TH, TD / 2 + 0.2 + random() * 0.35 - z); item.rotation.y = random() * 6;
        }
        spot.add(item);
        if (a.packaging === 'bags') {
          const bag = add(new THREE.BoxGeometry(0.4, kind === 'clock' || kind === 'ledgers' ? 0.2 : 0.07, 0.3), clear, [0, kind === 'clock' || kind === 'ledgers' ? 0.1 : 0.035, 0]);
          bag.castShadow = false;
          if (fallen) bag.position.copy(item.position).setY(-TH + 0.035);
          add(new THREE.BoxGeometry(0.4, 0.004, 0.035), red, [bag.position.x, bag.position.y + (kind === 'clock' || kind === 'ledgers' ? 0.1 : 0.036), bag.position.z - 0.13]);
          add(new THREE.BoxGeometry(0.13, 0.004, 0.07), white, [bag.position.x - 0.12, bag.position.y + (kind === 'clock' || kind === 'ledgers' ? 0.101 : 0.037), bag.position.z + 0.1]);
        } else if (a.packaging === 'bare') {
          add(new THREE.BoxGeometry(0.09, 0.003, 0.05), mat('#d8c9a0'), [0.19, 0.003, 0.11], [0, 0.5, 0]);
          add(new THREE.CylinderGeometry(0.002, 0.002, 0.12, 4), dark, [0.13, 0.004, 0.08], [0, 0.6, Math.PI / 2]);
        }
      } else if (n === missing && a.packaging === 'bags') {
        add(new THREE.BoxGeometry(0.4, 0.006, 0.3), clear, [0, 0.004, 0]).castShadow = false;
        add(new THREE.BoxGeometry(0.4, 0.004, 0.035), red, [0, 0.008, -0.13], [0, 0, 0]);
      } else if (n === missing && a.packaging === 'boxes') {
        add(new THREE.BoxGeometry(0.4, 0.012, 0.3), card, [0, 0.006, 0]);
        for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.07, 0.3), card, [sx * 0.2, 0.035, 0]);
        add(new THREE.BoxGeometry(0.4, 0.07, 0.012), card, [0, 0.035, -0.15]);
      }
      s.root.add(spot);
      // Marker stays square to the table even when the exhibit is askew.
      const label = a.markers === 'cards' ? String.fromCharCode(65 + n) : String(n + 1);
      const mx = spot.position.x - 0.14, mz = z + 0.2 > TD / 2 - 0.06 ? TD / 2 - 0.07 : z + 0.19;
      const tip = messy && random() < 0.35;
      if (a.markers === 'tents') {
        const tent = new THREE.Shape(); tent.moveTo(-0.045, 0); tent.lineTo(0.045, 0); tent.lineTo(0, 0.1); tent.closePath();
        const body = s.mesh(new THREE.ExtrudeGeometry(tent, { depth: 0.08, bevelEnabled: false }), mat('#f2c81e', { emissive: '#f2c81e', emissiveIntensity: 0.15 }), [mx + 0.04, TH, mz]);
        body.rotation.y = -Math.PI / 2;
        const face = s.mesh(new THREE.PlaneGeometry(0.07, 0.08), numberTile(label, '#17181b', '#f2c81e'), [mx, TH + 0.047, mz + 0.026]);
        face.rotation.x = -0.42;
        if (tip) { body.rotation.z = Math.PI / 2; body.position.y += 0.04; face.visible = false; }
      } else if (a.markers === 'cards') {
        const c = s.mesh(new THREE.BoxGeometry(0.1, 0.1, 0.006), numberTile(label, '#17181b', '#f6f3ea'), [mx, TH + 0.048, mz]);
        c.rotation.x = tip ? -1.5 : -0.3; if (tip) c.position.y = TH + 0.005;
        s.box([0.1, 0.008, 0.05], [mx, TH + 0.004, mz - 0.012], white);
      } else if (a.markers === 'discs') {
        const brass = mat('#c9a24a', { metalness: 0.8, roughness: 0.3 });
        s.cylinder(0.03, 0.035, 0.012, [mx, TH + 0.006, mz], brass, 14);
        s.cylinder(0.005, 0.005, 0.09, [mx, TH + 0.05, mz], brass, 6);
        s.cylinder(0.045, 0.045, 0.008, [mx, TH + 0.12, mz], brass, 20).rotation.x = Math.PI / 2;
        s.mesh(new THREE.CircleGeometry(0.036, 20), numberTile(label, '#2a1c08', '#d9b860'), [mx, TH + 0.12, mz + 0.005]);
      }
    });

    if (a.state === 'packing') {
      const bx = TW / 2 - 0.32;
      s.box([0.46, 0.3, 0.6], [bx, TH + 0.15, 0], card);
      s.box([0.42, 0.02, 0.56], [bx, TH + 0.3, 0], dark);
      const lid = s.box([0.5, 0.06, 0.64], [bx + 0.16, TH + 0.4, 0.02], card); lid.rotation.z = -0.6;
      s.label('CLOSED', 0.3, 0.1, [bx, TH + 0.16, 0.302], '#17181b', '#f3f0e6');
      for (let i = 0; i < 3; i++) s.box([0.3, 0.1 + random() * 0.1, 0.02], [bx - 0.02, TH + 0.3, -0.2 + i * 0.16], clear).rotation.y = (random() - 0.5) * 0.3;
    }
    if (messy || mood.wear > 0.6) for (let i = 0; i < 5; i++) { const p = s.box([0.21, 0.004, 0.3], [(random() - 0.5) * TW, 0.004, TD / 2 + 0.15 + random() * 0.5], white); p.rotation.y = random() * 3; }

    return s.finish();
  },
});
