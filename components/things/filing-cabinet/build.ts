import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PAINT = {
  putty: 'Putty beige, the default of every back office.',
  grey: 'Battleship grey, government issue.',
  olive: 'Olive green, army surplus.',
  black: 'Black, a lawyer or a private detective.',
  blue: 'Institutional blue, a school or a hospital.',
  oxide: 'Red oxide, a workshop or a depot.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINT, string> = {
  putty: '#cfc3a3', grey: '#8d9498', olive: '#6f7a52', black: '#34363a', blue: '#5578a3', oxide: '#9c4a38',
};
const LABEL_SETS = {
  alpha: ['A–F', 'G–M', 'N–S', 'T–Z', 'MISC', 'DEAD'],
  years: ['1994', '1993', '1992', '1991', '1990', 'OLD'],
  secret: ['CONFIDENTIAL', 'PERSONNEL', 'LEGAL', 'DO NOT OPEN', 'CLOSED', 'SEALED'],
  dull: ['INVOICES', 'PAYROLL', 'CLAIMS', 'TAX', 'FORMS', 'MISC'],
  cases: ['OPEN CASES', 'COLD CASES', 'MISSING', 'UNSOLVED', 'EVIDENCE', 'CLOSED'],
} as const;

export default defineThing({
  questions: {
    kind: choice('What kind of cabinet is it?', {
      four: 'The standard tall four-drawer vertical steel cabinet.',
      two: 'A squat two-drawer cabinet that hides under a desk.',
      lateral: 'A wide, low lateral cabinet with three broad drawers.',
      five: 'An over-tall five-drawer tower that needs a step to reach the top.',
      cards: 'An old oak card-index cabinet with rows of little brass-pulled drawers.',
    }),
    paint: choice('If it is steel, what colour is it painted?', PAINT),
    open: choice('Which drawers are open?', {
      none: 'None. Everything is shut tight.',
      top: 'The top drawer hangs open.',
      middle: 'A middle drawer has been pulled right out.',
      bottom: 'The bottom drawer is open at ankle height.',
      several: 'Several are pulled out to different lengths, as if ransacked.',
    }),
    contents: choice('If a drawer is open, what is in it?', {
      folders: 'Manila folders fanned neatly with coloured tabs.',
      crammed: 'Far too much paper, crammed in and bulging over the edges.',
      empty: 'Nothing. It has been cleared out.',
      bottle: 'A whisky bottle and a glass hidden behind a few token folders.',
      shreds: 'A nest of shredded paper strips.',
    }),
    labels: choice('What do the drawer labels say?', {
      alpha: 'Alphabetical ranges, A to Z.',
      years: 'Years, counting backwards.',
      secret: 'Warnings: CONFIDENTIAL, PERSONNEL, DO NOT OPEN.',
      dull: 'Invoices, payroll, tax: pure administration.',
      cases: 'Case files: open, cold, missing, unsolved.',
      blank: 'The label holders are empty.',
    }),
    top: choice('What is sitting on top of it?', {
      nothing: 'Nothing but dust.',
      plant: 'A spider plant in a pot, trailing down the side.',
      boxes: 'Archive boxes stacked toward the ceiling.',
      papers: 'A heap of things waiting to be filed.',
      fan: 'A desk fan, turning.',
      trophy: 'A small gilt trophy that nobody remembers winning.',
    }),
    secured: choice('If every drawer is shut, how is it secured?', {
      plain: 'It is not. Anyone could open it.',
      key: 'The key is still in the lock with a tag hanging from it.',
      bar: 'A steel locking bar runs down the front with a padlock.',
      tape: 'Yellow tape is crossed over the front: sealed.',
    }),
    spilled: noul('Have files and loose pages spilled onto the floor in front of it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const oak = a.kind === 'cards';
    const dims = { four: [0.46, 1.32, 0.62, 1, 4], two: [0.46, 0.72, 0.62, 1, 2], lateral: [0.92, 1.02, 0.48, 1, 3], five: [0.46, 1.62, 0.62, 1, 5], cards: [0.62, 1.2, 0.44, 3, 6] }[a.kind];
    const [w, h, d, cols, rows] = dims;
    const hue = oak ? '#8a5a33' : PAINT_HEX[a.paint];
    const paint = s.material(hue, { metalness: oak ? 0 : 0.2, roughness: oak ? 0.6 : 0.45 });
    const face = s.material(new THREE.Color(hue).multiplyScalar(oak ? 1.12 : 1.06), { metalness: oak ? 0 : 0.2, roughness: 0.45 });
    const inside = s.material(new THREE.Color(hue).multiplyScalar(0.55));
    const hollow = s.material('#1b1c1e');
    const chrome = s.material(oak ? '#c9a24a' : '#d5d9da', { metalness: 0.6, roughness: 0.25 });
    const manila = ['#e2c98a', '#d9bd78', '#e8d39b', '#d2b56e'].map((c) => s.material(c, { roughness: 0.9 }));
    const tabs = ['#d9534a', '#4f8fd0', '#58a86a', '#e8b23a', '#f1ecd9'].map((c) => s.material(c));
    const sheet = s.material('#f3f0e6', { roughness: 0.95 });
    const plinth = 0.06, gap = 0.012;
    const dw = (w - gap * (cols + 1)) / cols, dh = (h - plinth - 0.02 - gap * (rows + 1)) / rows;
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Carcass.
    s.box([w, h - plinth, d], [0, plinth + (h - plinth) / 2, 0], paint);
    s.box([w - 0.03, plinth, d - 0.04], [0, plinth / 2, -0.01], hollow);
    if (oak) s.box([w + 0.04, 0.03, d + 0.03], [0, h + 0.015, 0], paint);

    // Which drawers are out, and how far.
    const pulled = new Map<string, number>();
    const column = Math.floor(random() * cols);
    const reach = oak ? 0.3 : d * 0.72;
    if (a.open === 'top') pulled.set(`${column},${rows - 1}`, mix(0.6, 1, random()));
    if (a.open === 'middle') pulled.set(`${column},${Math.max(0, Math.floor(rows / 2) - (rows % 2 ? 0 : 1) + (rows > 3 ? 1 : 0))}`, 1);
    if (a.open === 'bottom') pulled.set(`${column},0`, mix(0.6, 1, random()));
    if (a.open === 'several') {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (random() < (oak ? 0.3 : 0.6)) pulled.set(`${c},${r}`, mix(0.15, 1, random()));
      pulled.set(`${column},${Math.floor(random() * rows)}`, 0.9);
    }

    const names = a.labels === 'blank' ? null : LABEL_SETS[a.labels];
    const fill = (drawer: THREE.Group, length: number) => {
      // Contents sit in a tray dw wide, dh tall, running back from the front panel.
      const inner = dw - 0.05, tall = dh * 0.82;
      if (a.contents === 'empty') {
        for (const x of [-1, 1]) add(drawer, new THREE.BoxGeometry(0.008, 0.008, length), chrome, [x * (inner / 2 - 0.01), dh * 0.35, -length / 2]);
        return;
      }
      if (a.contents === 'shreds') {
        const points = Array.from({ length: 70 }, () => ({ at: [(random() - 0.5) * inner, mix(-0.1, 0.32, random()) * dh, -random() * length] as [number, number, number], size: mix(0.6, 1.3, random()) }));
        const strips = s.scatter(new THREE.BoxGeometry(0.1, 0.004, 0.012), sheet, points);
        strips.removeFromParent(); drawer.add(strips);
        for (let i = 0; i < 10; i++) add(drawer, new THREE.TorusGeometry(mix(0.02, 0.05, random()), 0.003, 4, 12), sheet, [(random() - 0.5) * inner, dh * mix(0.1, 0.4, random()), -random() * length]).rotation.set(random() * 3, random() * 3, 0);
        return;
      }
      const hidden = a.contents === 'bottle';
      const start = hidden ? length * 0.5 : 0.03;
      const count = Math.round((length - start) / (a.contents === 'crammed' ? 0.016 : 0.03) * mix(0.55, 1, mood.density));
      for (let i = 0; i < count; i++) {
        const z = -start - (i + random() * 0.5) / count * (length - start - 0.03);
        const rise = a.contents === 'crammed' ? mix(0, 0.09, random()) : mix(0, 0.015, random());
        const folder = add(drawer, new THREE.BoxGeometry(inner * mix(0.9, 1, random()), tall, 0.004), a.contents === 'crammed' && random() < 0.35 ? sheet : manila[i % manila.length], [0, -dh / 2 + 0.03 + tall / 2 + rise, z]);
        folder.rotation.x = a.contents === 'crammed' ? (random() - 0.5) * 0.5 : mix(0.1, 0.4, random()) * (i < count / 2 ? 1 : -0.6);
        folder.rotation.z = a.contents === 'crammed' ? (random() - 0.5) * 0.25 : 0;
        if (random() < 0.8) {
          const tab = add(folder, new THREE.BoxGeometry(inner * 0.2, 0.022, 0.005), tabs[Math.floor(random() * tabs.length)], [(Math.floor(random() * 4) - 1.5) * inner * 0.22, tall / 2 + 0.008, 0]);
          tab.castShadow = false;
        }
      }
      if (hidden) {
        const glass = new THREE.MeshStandardMaterial({ color: '#8a4b16', roughness: 0.15, emissive: '#6b3208', emissiveIntensity: 0.35 });
        const bottle = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.04, 0.16], [0.016, 0.21], [0.014, 0.27], [0, 0.27]].map(([x, y]) => new THREE.Vector2(x, y)), 16), glass);
        bottle.position.set(-inner * 0.2, -dh / 2 + 0.03, -length * 0.22);
        bottle.castShadow = true;
        drawer.add(bottle);
        add(drawer, new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10), hollow, [-inner * 0.2, -dh / 2 + 0.31, -length * 0.22]);
        add(drawer, new THREE.BoxGeometry(0.06, 0.07, 0.002), sheet, [-inner * 0.2, -dh / 2 + 0.12, -length * 0.22 + 0.041]);
        add(drawer, new THREE.CylinderGeometry(0.03, 0.025, 0.07, 14), new THREE.MeshStandardMaterial({ color: '#dfeef2', roughness: 0.1, transparent: true, opacity: 0.6 }), [inner * 0.18, -dh / 2 + 0.065, -length * 0.25]);
      }
    };

    let labelIndex = 0;
    const skew = mood.wear > 0.6 ? Math.floor(random() * rows) : -1;
    for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) {
      const x = -w / 2 + gap + dw / 2 + c * (dw + gap);
      const y = plinth + gap + dh / 2 + r * (dh + gap);
      const out = (pulled.get(`${c},${r}`) ?? 0) * reach;
      const drawer = new THREE.Group();
      drawer.position.set(x, y, d / 2 + out);
      s.root.add(drawer);
      add(drawer, new THREE.BoxGeometry(dw, dh, 0.022), face, [0, 0, 0.008]);
      if (r === skew && out === 0) { drawer.rotation.z = (random() - 0.5) * 0.03; drawer.position.z += 0.012; }
      // Handle, label holder.
      if (oak) {
        add(drawer, new THREE.SphereGeometry(0.014, 10, 8), chrome, [0, -dh * 0.22, 0.03]);
        add(drawer, new THREE.BoxGeometry(dw * 0.5, dh * 0.3, 0.004), chrome, [0, dh * 0.15, 0.02]);
        add(drawer, new THREE.BoxGeometry(dw * 0.42, dh * 0.2, 0.005), sheet, [0, dh * 0.15, 0.021]);
      } else {
        const hw = Math.min(0.16, dw * 0.4);
        add(drawer, new THREE.BoxGeometry(hw, 0.022, 0.03), chrome, [0, dh * 0.08, 0.03]);
        add(drawer, new THREE.BoxGeometry(hw * 0.9, 0.03, 0.01), hollow, [0, dh * 0.08 - 0.012, 0.021]);
        add(drawer, new THREE.BoxGeometry(0.13, 0.05, 0.005), chrome, [0, dh * 0.3, 0.02]);
        if (names) {
          const card = s.label(names[labelIndex % names.length], 0.118, 0.04, [0, 0, 0], a.labels === 'secret' ? '#a3211b' : '#2a2d33', '#f4f0e2');
          card.removeFromParent(); card.position.set(0, dh * 0.3, 0.0235); card.castShadow = false;
          drawer.add(card);
        }
        labelIndex++;
      }
      if (out > 0) {
        s.box([dw - 0.01, dh - 0.01, 0.004], [x, y, d / 2 + 0.001], hollow);
        const length = out - 0.01;
        add(drawer, new THREE.BoxGeometry(dw - 0.03, 0.01, length), inside, [0, -dh / 2 + 0.02, -length / 2]);
        for (const side of [-1, 1]) add(drawer, new THREE.BoxGeometry(0.008, dh * 0.72, length), inside, [side * (dw / 2 - 0.018), -dh * 0.1, -length / 2]);
        fill(drawer, length);
      }
    }
    // Lock, top right.
    if (!oak) {
      const lx = w / 2 - 0.05, ly = h - 0.045;
      const lock = s.cylinder(0.014, 0.014, 0.012, [lx, ly, d / 2 + 0.024], chrome, 12);
      lock.rotation.x = Math.PI / 2;
      if (a.secured === 'key') {
        s.box([0.006, 0.02, 0.03], [lx, ly, d / 2 + 0.045], chrome);
        s.rod([lx, ly, d / 2 + 0.058], [lx + 0.01, ly - 0.07, d / 2 + 0.05], 0.002, hollow);
        const tag = s.box([0.035, 0.05, 0.004], [lx + 0.012, ly - 0.095, d / 2 + 0.05], s.material('#d9534a'));
        tag.rotation.z = 0.2;
      }
    }
    if (pulled.size === 0 && a.secured === 'bar') {
      const steel = s.material('#565b60', { metalness: 0.5, roughness: 0.4 });
      s.box([0.045, h - plinth - 0.02, 0.012], [-w * 0.3, plinth + (h - plinth) / 2, d / 2 + 0.04], steel);
      s.box([0.07, 0.03, 0.03], [-w * 0.3, h - 0.03, d / 2 + 0.03], steel);
      s.box([0.06, 0.055, 0.025], [-w * 0.3, h - 0.13, d / 2 + 0.06], s.material('#c9a24a', { metalness: 0.6, roughness: 0.3 }));
      const shackle = s.ring(0.02, 0.006, [-w * 0.3, h - 0.1, d / 2 + 0.06], chrome, Math.PI);
      shackle.castShadow = true;
    }
    if (pulled.size === 0 && a.secured === 'tape') {
      const yellow = s.material('#f0c419', { emissive: '#f0c419', emissiveIntensity: 0.15 });
      for (const side of [-1, 1]) {
        const band = s.box([Math.hypot(w, h * 0.7) * 1.02, 0.06, 0.004], [0, h * 0.55, d / 2 + 0.045 + side * 0.003], yellow);
        band.rotation.z = side * Math.atan2(h * 0.7, w);
      }
    }

    // Dents, rust and old stickers.
    const scars = Math.round(mix(-1, 6, mood.wear));
    const rust = new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 1, transparent: true, opacity: 0.45, depthWrite: false });
    const dent = new THREE.MeshStandardMaterial({ color: new THREE.Color(hue).multiplyScalar(0.6), roughness: 0.7, transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < scars; i++) {
      const side = random() < 0.5 ? -1 : 1;
      const mark = s.ball([0.004, mix(0.02, 0.07, random()), mix(0.03, 0.1, random())], [side * (w / 2 + 0.001), mix(0.2, h - 0.15, random()), (random() - 0.5) * d * 0.7], random() < 0.5 ? rust : dent, 10);
      mark.castShadow = false;
    }
    if (mood.wear > 0.45) s.box([w * 0.8, 0.03, 0.003], [0, plinth + 0.03, d / 2 + 0.001], rust).castShadow = false;

    // On top.
    const topY = h + (oak ? 0.03 : 0);
    let blades: THREE.Object3D | null = null;
    if (a.top === 'plant') {
      const px = (random() - 0.5) * (w - 0.3), pz = (random() - 0.5) * 0.15;
      s.lathe([[0, 0], [0.07, 0], [0.095, 0.14], [0.105, 0.14], [0.105, 0.16], [0, 0.16]], s.material('#b5613f'), [px, topY, pz]);
      const alive = mix(1, 0.25, mood.wear) * mix(0.6, 1, mood.cheer);
      const leaf = s.material(new THREE.Color('#8a7a3d').lerp(new THREE.Color('#4f9a48'), alive));
      const n = Math.round(mix(7, 20, alive));
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, out = mix(0.12, 0.3, random()), droop = mix(0.0, 0.5, random()) + (1 - alive) * 0.2;
        const peak = mix(0.2, 0.34, random()) * mix(0.6, 1, alive);
        s.tube([[px, topY + 0.15, pz], [px + Math.cos(angle) * out * 0.45, topY + 0.15 + peak, pz + Math.sin(angle) * out * 0.45], [px + Math.cos(angle) * out, topY + 0.15 + peak * 0.6 - droop * 0.3, pz + Math.sin(angle) * out], [px + Math.cos(angle) * out * 1.25, topY + 0.1 - droop * 0.5, pz + Math.sin(angle) * out * 1.25]], 0.008, leaf).scale.set(1, 1, 1);
      }
    } else if (a.top === 'boxes') {
      const card = s.material('#b89a6a', { roughness: 0.95 });
      const lid = s.material('#a68657', { roughness: 0.95 });
      const n = 1 + Math.round(mix(0, 2, mood.density));
      const bw = Math.min(0.4, w - 0.04);
      for (let i = 0; i < n; i++) {
        const turn = (random() - 0.5) * 0.3;
        const box = s.box([bw, 0.26, 0.5 > d - 0.04 ? d - 0.04 : 0.5], [(random() - 0.5) * 0.03, topY + 0.13 + i * 0.29, 0], card);
        box.rotation.y = turn;
        s.box([bw + 0.02, 0.05, (0.5 > d - 0.04 ? d - 0.04 : 0.5) + 0.02], [box.position.x, topY + 0.265 + i * 0.29, 0], lid).rotation.y = turn;
        const tag = s.label(['1987', 'TAX', 'OLD', 'KEEP?'][Math.floor(random() * 4)], 0.16, 0.07, [box.position.x, topY + 0.12 + i * 0.29, 0], '#2a2d33', '#f4f0e2');
        tag.position.set(box.position.x + Math.sin(turn) * 0.252, topY + 0.12 + i * 0.29, Math.cos(turn) * (Math.min(0.5, d - 0.04) / 2 + 0.002));
        tag.rotation.y = turn;
      }
    } else if (a.top === 'papers') {
      const n = Math.round(mix(6, 22, mood.density));
      for (let i = 0; i < n; i++) {
        const isFolder = random() < 0.4;
        const page = s.box(isFolder ? [0.24, 0.012, 0.31] : [0.21, 0.004, 0.297], [(random() - 0.5) * (w - 0.3), topY + 0.006 + i * 0.011, (random() - 0.5) * 0.14], isFolder ? manila[i % 4] : sheet);
        page.rotation.y = (random() - 0.5) * 0.9;
      }
    } else if (a.top === 'fan') {
      const cream = s.material('#d9d2bd');
      s.cylinder(0.09, 0.1, 0.03, [0, topY + 0.015, 0], cream, 20);
      s.cylinder(0.018, 0.022, 0.18, [0, topY + 0.12, -0.02], cream, 12);
      s.cylinder(0.05, 0.05, 0.09, [0, topY + 0.24, -0.02], cream, 14).rotation.x = Math.PI / 2;
      const cage = s.material('#b9bdbf', { metalness: 0.6, roughness: 0.3 });
      for (const z of [0.03, 0.075]) s.ring(0.15, 0.004, [0, topY + 0.24, z], cage);
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; s.rod([Math.cos(t) * 0.15, topY + 0.24 + Math.sin(t) * 0.15, 0.03], [Math.cos(t) * 0.15, topY + 0.24 + Math.sin(t) * 0.15, 0.075], 0.003, cage); s.rod([0, topY + 0.24, 0.08], [Math.cos(t) * 0.15, topY + 0.24 + Math.sin(t) * 0.15, 0.075], 0.0025, cage); }
      blades = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const blade = add(blades, new THREE.BoxGeometry(0.06, 0.12, 0.004), s.material('#5f93b8'), [0, 0.065, 0]);
        const arm = new THREE.Group(); arm.add(blade); arm.rotation.z = i * Math.PI * 2 / 3; blade.rotation.y = 0.4; blades.add(arm);
      }
      blades.position.set(0, topY + 0.24, 0.05);
      s.root.add(blades);
    } else if (a.top === 'trophy') {
      const gold = s.material('#d9b13b', { metalness: 0.6, roughness: 0.3, emissive: '#7a5a10', emissiveIntensity: mix(0.05, 0.35, mood.cheer) });
      const tx = (random() - 0.5) * (w - 0.25);
      s.box([0.1, 0.05, 0.1], [tx, topY + 0.025, 0], s.material('#3a2a20'));
      s.lathe([[0, 0], [0.035, 0], [0.012, 0.03], [0.012, 0.08], [0.05, 0.12], [0.065, 0.22], [0.058, 0.22], [0.045, 0.13], [0, 0.11]], gold, [tx, topY + 0.05, 0]);
      for (const side of [-1, 1]) s.ring(0.03, 0.006, [tx + side * 0.07, topY + 0.21, 0], gold, Math.PI * 2);
    }
    if (mood.wear > 0.5 && a.top === 'nothing') s.box([w * 0.5, 0.004, d * 0.4], [0.03, topY + 0.002, -0.05], s.material('#b9b3a3'));

    // On the floor.
    if (a.spilled) {
      const n = Math.round(mix(5, 16, mood.density));
      for (let i = 0; i < n; i++) {
        const isFolder = random() < 0.3;
        const page = s.box(isFolder ? [0.24, 0.008, 0.31] : [0.21, 0.003, 0.297], [mix(-0.5, 0.5, random()), 0.004 + i * 0.003, d / 2 + mix(0.12, 0.75, random())], isFolder ? manila[i % 4] : sheet);
        page.rotation.y = random() * Math.PI;
      }
    }

    const spin = mix(4, 26, mood.energy);
    return s.finish({ update: (dt) => { if (blades) blades.rotation.z += dt * spin; } });
  },
});
