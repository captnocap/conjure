import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SIGNS = {
  pharmacy: 'PHARMACY',
  rx: 'PRESCRIPTIONS',
  apothecary: 'APOTHECARY',
  farmacia: 'FARMACIA',
  herbs: 'HERBS & REMEDIES',
  dispensary: 'DISPENSARY',
} as const;

export default defineWorld({
  questions: {
    pharmacy: choice('What kind of pharmacy is it?', {
      chain: 'An American chain drugstore: white laminate, a bold colour stripe, fluorescent panels, rows of identical white bottles.',
      apothecary: 'An old wood-and-brass apothecary: mahogany shelves of coloured bottles, pendant globes, glowing show carboys on the counter.',
      farmacia: 'A European green-cross farmacia: white and green, a glass-fronted counter, a neon cross, very clean.',
      herbal: 'A Chinese herbal dispensary: a wall of small wooden drawers with brass pulls behind a dark red counter, lanterns overhead.',
    }),
    state: choice('Is it open?', {
      open: 'Open in ordinary hours, evenly bright and over-clean.',
      shuttered: 'Shuttered: a roll-down grille closes the counter while the rest of the shop stays lit.',
      night: 'Night: the shop is dim and blue and the dispensary counter is the only lit thing.',
    }),
    floor: choice('What is the floor of the waiting zone?', {
      checker: 'Checkerboard vinyl tiles.',
      lino: 'Pale speckled linoleum, mopped to a shine.',
      wood: 'Old wooden boards.',
      terrazzo: 'Terrazzo with coloured chips.',
      carpet: 'Thin grey-blue carpet tiles, hushed.',
    }),
    sign: choice('What does the sign over the counter say?', SIGNS),
    clock: choice('What time does the wall clock show?', {
      morning: 'Five past nine: just opened, the first of the day.',
      lull: 'Twenty to three: the dead middle of the afternoon.',
      closing: 'Five to six: minutes before closing.',
      small: 'Ten past three in the morning.',
      stopped: 'The clock has stopped at some forgotten time, its hands drooping at half past six.',
    }),
    corner: choice('What stands in the corner by the counter gate?', {
      none: 'Nothing.',
      leaflets: 'A wire rack of health leaflets.',
      cooler: 'A water cooler with a blue bottle and paper cups.',
      plant: 'A tall potted palm that might be plastic.',
      wetfloor: 'A yellow wet-floor sign and a mop bucket.',
      scale: 'A coin-operated step-on weighing scale with a big dial.',
    }),
    counter: choice('What is waiting on the counter?', {
      bare: 'Nothing; it is wiped clean.',
      bags: 'A line of stapled white bags, ready for collection.',
      single: 'One uncollected bag that has been there a long time.',
      flowers: 'A vase of flowers and a collection tin.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const night = a.state === 'night';
    const shut = a.state === 'shuttered';
    const P = {
      chain: { wall: '#eef0ea', trim: mood.cheer > 0.5 ? '#d8322f' : '#1f4f9a', counter: '#f5f5f0', top: '#c9cdca', shelf: '#e9ebe6', back: '#f7f8f4', bg: '#e3e6e0' },
      apothecary: { wall: '#dccba3', trim: '#b8923a', counter: '#5a341c', top: '#2e1a0e', shelf: '#4a2a16', back: '#3a2010', bg: '#e6e0d0' },
      farmacia: { wall: '#f4f7f3', trim: '#1f9a55', counter: '#ffffff', top: '#dfe8e2', shelf: '#e6ece6', back: '#eef5ef', bg: '#e2e8e2' },
      herbal: { wall: '#e6d8b8', trim: '#b8322a', counter: '#6a2a1e', top: '#3a1410', shelf: '#5a2218', back: '#4a1c14', bg: '#e6dfd0' },
    }[a.pharmacy];
    const shade = new THREE.Color(night ? '#6f7799' : '#ffffff');
    const dim = (hex: string) => new THREE.Color(hex).multiply(shade);
    const { art: s, world } = diorama(context, {
      background: night ? '#59607c' : P.bg, floor: '#ffffff', width: 14, depth: 11, maxHeight: 3.0, radius: 1.5, pitch: 29, yaw: 25,
      slots: [[0, 0.8], [-3.6, -0.1], [3.5, -0.1], [-3.4, 3.4], [3.4, 3.4], [0, 3.9]],
    });
    for (const child of s.root.children) {
      const light = child as THREE.Light;
      if (light.isLight) light.intensity *= night ? 0.5 : 1;
    }
    const mat = (hex: string, options: THREE.MeshStandardMaterialParameters = {}) => s.material(dim(hex), options);
    const glowScale = night ? 1.5 : 1;
    const counterLit = !shut;
    const shopLit = !night;

    // ----- Floor: one painted map on the diorama ground. -----
    const floorMap = paint(1024, 800, (c, w, h) => {
      const px = w / 14;
      const tone = { chain: ['#e4e6de', '#b9c2c4'], apothecary: ['#e6dcc2', '#3f342c'], farmacia: ['#eef0ea', '#9fc7ac'], herbal: ['#d8ccb4', '#6a3a30'] }[a.pharmacy];
      if (a.floor === 'checker') {
        const tile = px * 0.5;
        for (let y = 0; y * tile < h; y++) for (let x = 0; x * tile < w; x++) { c.fillStyle = tone[(x + y) % 2]; c.fillRect(x * tile, y * tile, tile + 1, tile + 1); }
      } else if (a.floor === 'lino') {
        c.fillStyle = tone[0];
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 5000; i++) { c.fillStyle = ['#b9b7a8', '#f6f6f0', '#9aa6a8', '#c9b9a0'][i % 4]; c.fillRect(random() * w, random() * h, 2.2, 2.2); }
        c.strokeStyle = 'rgba(0,0,0,0.12)';
        for (let x = 0; x < w; x += px * 2) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      } else if (a.floor === 'wood') {
        const row = px * 0.19;
        for (let y = 0; y * row < h; y++) {
          let x = -random() * 120;
          while (x < w) {
            const length = 110 + random() * 120;
            c.fillStyle = `hsl(${26 + random() * 8}, ${32 + random() * 12}%, ${38 + random() * 14}%)`;
            c.fillRect(x, y * row, length - 1.5, row - 1.2);
            x += length;
          }
        }
      } else if (a.floor === 'terrazzo') {
        c.fillStyle = '#e6e2d6';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) {
          c.fillStyle = ['#b9a48a', '#8a8f8a', '#c98a6a', '#f6f4ec', '#5f6a6a', '#d8c08a'][i % 6];
          c.beginPath();
          c.ellipse(random() * w, random() * h, 2 + random() * 4, 1.5 + random() * 3, random() * 3, 0, 7);
          c.fill();
        }
        c.strokeStyle = '#b8923a'; c.lineWidth = 2;
        for (let x = px * 2; x < w; x += px * 2.5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      } else {
        const tile = px * 0.6;
        for (let y = 0; y * tile < h; y++) for (let x = 0; x * tile < w; x++) { c.fillStyle = `hsl(212, 14%, ${50 + ((x * 7 + y * 13) % 5) * 1.6 + random() * 2}%)`; c.fillRect(x * tile, y * tile, tile, tile); }
      }
      // The privacy line.
      const lineY = ((-1.45 + 5.5) / 11) * h;
      c.fillStyle = a.pharmacy === 'apothecary' || a.pharmacy === 'herbal' ? P.trim : '#f2c81e';
      c.fillRect(px * 1.4, lineY, px * 9.9, 9);
      c.fillStyle = a.floor === 'carpet' || (a.floor === 'checker' && a.pharmacy !== 'chain') ? '#f6f4ec' : '#3a3f46';
      c.font = 'bold 20px sans-serif';
      c.textAlign = 'center';
      c.fillText('PLEASE WAIT BEHIND THE LINE', px * 6.3, lineY + 30);
      // Wear: a trodden path to the counter, scuffs and one old stain.
      const path = c.createRadialGradient(px * 6.5, h * 0.42, 10, px * 6.5, h * 0.42, px * 3.2);
      path.addColorStop(0, `rgba(70,62,50,${mood.wear * 0.35})`);
      path.addColorStop(1, 'rgba(70,62,50,0)');
      c.fillStyle = path;
      c.fillRect(0, 0, w, h);
      c.strokeStyle = `rgba(30,30,30,${mood.wear * 0.4})`;
      c.lineWidth = 1.5;
      for (let i = 0; i < mood.wear * 40; i++) { const x = random() * w, y = h * 0.3 + random() * h * 0.7; c.beginPath(); c.arc(x, y, 10 + random() * 30, random() * 6, random() * 6 + 0.6); c.stroke(); }
    });
    const ground = world.ground as THREE.Mesh;
    const groundMaterial = ground.material as THREE.MeshStandardMaterial;
    groundMaterial.map = floorMap;
    groundMaterial.color.copy(dim('#ffffff'));
    groundMaterial.roughness = !night && (a.floor === 'lino' || a.floor === 'terrazzo') ? mix(0.35, 0.75, mood.wear) : 0.85;

    // ----- Shell: back wall, left wall, the raised dispensary floor. -----
    const wall = mat(P.wall, { roughness: 0.9 });
    const trim = mat(P.trim, { roughness: 0.5, metalness: a.pharmacy === 'apothecary' ? 0.7 : 0 });
    const shelfMat = mat(P.shelf, { roughness: 0.6 });
    const counterMat = mat(P.counter, { roughness: a.pharmacy === 'herbal' ? 0.35 : 0.55 });
    const dark = mat('#24282c', { roughness: 0.6 });
    const steel = mat('#c5cacc', { metalness: 0.8, roughness: 0.3 });
    s.box([14, 4.4, 0.22], [0, 2.2, -5.4], wall);
    s.box([0.22, 4.4, 10.8], [-6.9, 2.2, 0], wall);
    s.box([0.06, 0.14, 8.1], [-6.76, 0.07, 1.35], dark);
    if (a.pharmacy === 'chain' || a.pharmacy === 'farmacia') { s.box([0.03, 0.3, 8.1], [-6.78, 3.5, 1.35], trim); s.box([14, 0.3, 0.03], [0, 4.0, -5.28], trim); }
    else { s.box([0.05, 1.3, 8.1], [-6.77, 0.72, 1.35], mat(P.shelf)); s.box([0.08, 0.08, 8.1], [-6.75, 1.4, 1.35], trim); }
    const raise = 0.3;
    s.box([13.56, raise, 2.7], [0.11, raise / 2, -3.95], mat(a.pharmacy === 'chain' || a.pharmacy === 'farmacia' ? '#b9bdb8' : '#4a3222', { roughness: 0.8 }));
    s.box([13.56, 0.05, 0.05], [0.11, raise - 0.025, -2.585], mat('#f2c81e'));

    // ----- Back wall stock. -----
    const backZ = -5.1;
    s.box([12.9, 3.35, 0.08], [-0.1, raise + 1.675, -5.26], mat(P.back, counterLit ? { emissive: night ? '#ffe9b8' : '#000000', emissiveIntensity: night ? 0.6 : 0 } : {}));
    s.box([12.9, 0.7, 0.5], [-0.1, raise + 0.35, backZ + 0.05], shelfMat);
    const levels = [0.72, 1.27, 1.82, 2.37, 2.92];
    const m = new THREE.Matrix4();
    const stock = mix(0.5, 1, mood.density) * mix(1, 0.72, mood.wear);
    if (a.pharmacy === 'herbal') {
      // A wall of drawers with brass pulls and paper labels, jars along the top.
      const cols = 40, rows = 8, dw = 12.6 / cols, dh = 2.5 / rows;
      const fronts = new THREE.InstancedMesh(new THREE.BoxGeometry(dw - 0.03, dh - 0.03, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.4 }), cols * rows);
      const pulls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#c9a23f', { metalness: 0.85, roughness: 0.3 }), cols * rows);
      const tags = new THREE.InstancedMesh(new THREE.BoxGeometry(dw * 0.45, dh * 0.3, 0.004), mat('#c8322a', { roughness: 0.8 }), cols * rows);
      const base = dim('#6a2a1e');
      for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
        const i = r * cols + col;
        const x = -6.4 + (col + 0.5) * dw, y = raise + 0.72 + (r + 0.5) * dh;
        const out = random() < mood.energy * 0.05 + mood.wear * 0.03 ? 0.08 + random() * 0.14 : random() * 0.012;
        m.makeTranslation(x, y, backZ + out);
        fronts.setMatrixAt(i, m);
        fronts.setColorAt(i, base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.05));
        m.makeTranslation(x, y - dh * 0.2, backZ + out + 0.16);
        pulls.setMatrixAt(i, m);
        m.makeTranslation(x, y + dh * 0.18, backZ + out + 0.152);
        tags.setMatrixAt(i, m);
      }
      for (const mesh of [fronts, pulls, tags]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh); }
      s.box([12.9, 0.06, 0.45], [-0.1, raise + 3.25, backZ + 0.03], shelfMat);
      const jarShape = new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.15, 0.1], [0.15, 0.24], [0.08, 0.32], [0.09, 0.36], [0, 0.37]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
      const jarCount = Math.round(22 * stock);
      const jars = new THREE.InstancedMesh(jarShape, new THREE.MeshStandardMaterial({ roughness: 0.3 }), jarCount);
      for (let i = 0; i < jarCount; i++) {
        m.makeScale(1, mix(0.8, 1.3, random()), 1).setPosition(-6.1 + (i + random() * 0.5) * (12.2 / jarCount), raise + 3.28, backZ);
        jars.setMatrixAt(i, m);
        jars.setColorAt(i, dim(['#e9e6dc', '#3f6a9a', '#e9e6dc', '#7a3a2a', '#2f5a4a'][Math.floor(random() * 5)]));
      }
      jars.instanceMatrix.needsUpdate = true; jars.castShadow = true; s.root.add(jars);
    } else {
      for (const y of levels) s.box([12.9, 0.05, 0.42], [-0.1, raise + y, backZ], shelfMat);
      for (let x = -6.5; x <= 6.31; x += 12.8 / 6) s.box([0.06, 2.75, 0.42], [x, raise + 0.72 + 1.375, backZ], shelfMat);
      const bottle = new THREE.LatheGeometry([[0, 0], [0.055, 0], [0.058, 0.015], [0.058, 0.13], [0.034, 0.16], [0.034, 0.175], [0.042, 0.175], [0.042, 0.205], [0, 0.205]].map(([r, y]) => new THREE.Vector2(r, y)), 8);
      const tints = a.pharmacy === 'apothecary' ? ['#6a3a1c', '#2f5a8a', '#3a6a4a', '#e8e2d0', '#8a5a2a', '#7a2a2a'] : a.pharmacy === 'farmacia' ? ['#ffffff', '#ffffff', '#ffffff', '#bfe3cc', '#d9e6f2'] : ['#fafaf6', '#fafaf6', '#fafaf6', '#fafaf6', '#e08a2a', '#fafaf6'];
      const spots: { x: number; y: number; z: number; size: number; tint: string }[] = [];
      for (const y of levels) {
        // Stock comes in runs of the same product, with gaps where something has run out.
        let x = -6.3;
        while (x < 6.1) {
          const run = 2 + Math.floor(random() * 7);
          const tint = tints[Math.floor(random() * tints.length)];
          const size = mix(0.95, 1.7, random());
          const present = random() < stock;
          for (let k = 0; k < run && x < 6.1; k++) {
            if (present && random() < 0.96) spots.push({ x, y: raise + y + 0.025, z: backZ + 0.08 + (random() - 0.5) * 0.03, size, tint });
            x += 0.125 * Math.max(1, size * 0.85);
          }
          x += random() < 0.3 ? 0.12 : 0.02;
        }
      }
      const bottles = new THREE.InstancedMesh(bottle, new THREE.MeshStandardMaterial({ roughness: a.pharmacy === 'apothecary' ? 0.2 : 0.45 }), spots.length);
      spots.forEach((spot, i) => {
        m.makeScale(spot.size, spot.size, spot.size).setPosition(spot.x, spot.y, spot.z);
        bottles.setMatrixAt(i, m);
        bottles.setColorAt(i, dim(spot.tint).lerp(new THREE.Color('#fff2cc'), night && counterLit ? 0.45 : 0));
      });
      bottles.instanceMatrix.needsUpdate = true;
      if (bottles.instanceColor) bottles.instanceColor.needsUpdate = true;
      bottles.castShadow = bottles.receiveShadow = true;
      s.root.add(bottles);
      if (a.pharmacy !== 'apothecary') for (const y of levels) s.box([12.8, 0.035, 0.006], [-0.1, raise + y - 0.005, backZ + 0.214], trim);
    }

    // ----- The dispensing counter on the edge of the raised floor. -----
    const cx = -0.7, cw = 10, counterTop = raise + 1.02, cz = -2.95;
    s.box([cw, counterTop, 0.6], [cx, counterTop / 2, cz], counterMat);
    s.box([cw + 0.1, 0.06, 0.78], [cx, counterTop + 0.03, cz + 0.03], mat(P.top, { roughness: 0.35 }));
    s.box([cw, 0.12, 0.02], [cx, 0.06, cz + 0.31], dark);
    const front = cz + 0.305;
    if (a.pharmacy === 'chain') { s.box([cw, 0.2, 0.015], [cx, 0.98, front], trim); s.box([cw, 0.045, 0.015], [cx, 0.8, front], trim); }
    else if (a.pharmacy === 'apothecary' || a.pharmacy === 'herbal') {
      for (let i = 0; i < 8; i++) {
        s.box([cw / 8 - 0.16, 0.82, 0.02], [cx - cw / 2 + (i + 0.5) * cw / 8, 0.68, front], mat(P.shelf));
        s.box([cw / 8 - 0.34, 0.62, 0.02], [cx - cw / 2 + (i + 0.5) * cw / 8, 0.68, front + 0.012], counterMat);
      }
      s.rod([cx - cw / 2 + 0.1, 0.26, front + 0.13], [cx + cw / 2 - 0.1, 0.26, front + 0.13], 0.022, mat('#c9a23f', { metalness: 0.85, roughness: 0.3 }));
      s.box([cw, 0.05, 0.02], [cx, 1.22, front], trim);
    } else {
      // Farmacia: a lit glass display let into the counter front.
      s.box([cw - 0.6, 0.62, 0.02], [cx, 0.72, front], mat('#f4fbf6', { emissive: '#e6fff0', emissiveIntensity: counterLit ? 0.55 * glowScale : 0.05 }));
      for (let i = 0; i < 46; i++) {
        const tall = 0.1 + random() * 0.14;
        s.box([0.11 + random() * 0.06, tall, 0.03], [cx - cw / 2 + 0.5 + i * 0.198, (i % 2 ? 0.47 : 0.8) + tall / 2, front + 0.02], mat(['#1f9a55', '#ffffff', '#2f7fd0', '#f2c81e', '#e9eef0', '#d8322f'][Math.floor(random() * 6)]));
      }
      s.box([cw - 0.6, 0.03, 0.06], [cx, 0.78, front + 0.02], steel);
      s.box([cw, 0.06, 0.02], [cx, 1.2, front], trim);
    }
    // Gate and steps at the right-hand end: the way up.
    const gx = cx + cw / 2 + 0.6;
    for (const [i, depth] of [0.62, 0.31].entries()) s.box([1.15, raise / 2, depth], [gx, raise / 4 + (i * raise) / 2, -2.6 + depth / 2], mat(a.pharmacy === 'chain' || a.pharmacy === 'farmacia' ? '#a9ada8' : '#3a2618', { roughness: 0.8 }));
    const gate = s.box([1.05, 0.85, 0.05], [gx, raise + 0.55, -2.72], counterMat);
    gate.rotation.y = shut || night ? 0 : -mix(0, 0.5, random());
    s.label('STAFF ONLY', 0.8, 0.16, [gx, raise + 0.72, -2.69], '#ffffff', P.trim).rotation.y = gate.rotation.y;

    // Posts, header, the big sign and the two bay blades.
    const headBottom = 2.62;
    for (const x of [cx - cw / 2 - 0.05, cx + cw / 2 + 0.05]) s.box([0.18, 3.2, 0.18], [x, 1.6, -2.72], shelfMat);
    s.box([cw + 0.3, 0.58, 0.26], [cx, headBottom + 0.29, -2.72], shelfMat);
    const classic = a.pharmacy === 'apothecary' || a.pharmacy === 'herbal';
    const signMap = paint(1024, 128, (c, w, h) => {
      c.fillStyle = classic ? '#24120a' : P.trim;
      c.fillRect(0, 0, w, h);
      if (classic) { c.strokeStyle = '#e2c36a'; c.lineWidth = 5; c.strokeRect(8, 8, w - 16, h - 16); }
      c.fillStyle = classic ? '#e2c36a' : '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold 86px ${classic ? 'serif' : 'sans-serif'}`;
      c.fillText(SIGNS[a.sign], w / 2, h / 2 + 4, w - 240);
      if (a.pharmacy === 'farmacia') for (const x of [70, w - 70]) { c.fillRect(x - 14, 22, 28, 84); c.fillRect(x - 42, 50, 84, 28); }
      if (a.pharmacy === 'chain') { c.font = 'bold italic 90px serif'; c.fillText('Rx', 80, h / 2 + 4); }
    });
    const signMaterial = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: counterLit ? 0.55 * glowScale : 0.05 });
    if (!counterLit || night) signMaterial.color.copy(dim('#ffffff'));
    s.mesh(new THREE.PlaneGeometry(6.4, 0.44), signMaterial, [cx, headBottom + 0.29, -2.585]);
    const strip = mat('#fff8dc', { emissive: '#fff1c0', emissiveIntensity: counterLit ? 1.2 * glowScale : 0 });
    s.box([cw - 0.4, 0.04, 0.16], [cx, headBottom - 0.02, -2.74], strip);
    const blades = classic ? ['COMPOUNDING', 'COLLECT'] : ['DROP OFF', 'PICK UP'];
    for (const [i, x] of [cx - 2.9, cx + 2.9].entries()) {
      s.label(blades[i], 1.5, 0.26, [x, headBottom - 0.26, -2.7], classic ? '#e2c36a' : '#ffffff', classic ? '#24120a' : '#2a2f36');
      for (const dx of [-0.6, 0.6]) s.rod([x + dx, headBottom, -2.7], [x + dx, headBottom - 0.14, -2.7], 0.012, steel);
    }
    // Privacy dividers and terminals.
    const frosted = new THREE.MeshStandardMaterial({ color: dim(classic ? '#6a4024' : '#dfeef0'), roughness: 0.6, transparent: !classic, opacity: classic ? 1 : 0.7 });
    for (const x of [cx - 4.1, cx - 1.7, cx + 1.7, cx + 4.1]) {
      s.box([0.04, 0.62, 0.72], [x, counterTop + 0.37, cz + 0.05], frosted);
      s.box([0.06, 0.04, 0.74], [x, counterTop + 0.7, cz + 0.05], classic ? trim : steel);
    }
    for (const x of [cx - 3.6, cx + 2.4]) {
      if (a.pharmacy === 'herbal' || a.pharmacy === 'apothecary') {
        // A brass balance instead of a screen.
        const brass = mat('#c9a23f', { metalness: 0.85, roughness: 0.3 });
        s.cylinder(0.1, 0.12, 0.03, [x, counterTop + 0.075, cz - 0.05], brass, 16);
        s.cylinder(0.015, 0.015, 0.5, [x, counterTop + 0.32, cz - 0.05], brass, 8);
        const beam = s.rod([x - 0.3, counterTop + 0.55, cz - 0.05], [x + 0.3, counterTop + 0.55 + (random() - 0.5) * 0.12, cz - 0.05], 0.01, brass);
        void beam;
        for (const dx of [-0.3, 0.3]) s.cylinder(0.1, 0.07, 0.02, [x + dx, counterTop + 0.3, cz - 0.05], brass, 14);
        for (const dx of [-0.3, 0.3]) s.rod([x + dx, counterTop + 0.55, cz - 0.05], [x + dx, counterTop + 0.31, cz - 0.05], 0.004, brass);
      } else {
        const screen = s.box([0.5, 0.36, 0.04], [x, counterTop + 0.36, cz - 0.1], dark);
        screen.rotation.y = 0.35;
        s.box([0.44, 0.3, 0.01], [x - 0.008, counterTop + 0.36, cz - 0.125], mat('#bfe0ff', { emissive: '#9fd0ff', emissiveIntensity: counterLit ? 0.7 * glowScale : 0 })).rotation.y = 0.35;
        s.box([0.1, 0.16, 0.08], [x, counterTop + 0.14, cz - 0.1], dark);
      }
    }
    if (a.pharmacy === 'apothecary') {
      // Show carboys: tall coloured glass, lit from within.
      for (const [i, x] of [cx - 4.65, cx + 4.65].entries()) {
        const tint = ['#c0282a', '#1f8a6a', '#2a5fc0'][(i + Math.floor(random() * 3)) % 3];
        s.lathe([[0, 0], [0.12, 0], [0.13, 0.03], [0.05, 0.08], [0.2, 0.3], [0.24, 0.48], [0.14, 0.72], [0.05, 0.86], [0.06, 0.95], [0, 1.02]], mat(tint, { roughness: 0.1, emissive: tint, emissiveIntensity: counterLit ? 0.7 * glowScale : 0.15 }), [x, counterTop + 0.06, cz + 0.05]);
      }
    }

    // What waits on the counter.
    const top = counterTop + 0.06;
    const paper = mat('#f6f4ec', { roughness: 0.95 });
    const bag = (x: number, z: number, size: number, tone = paper) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { g.add(mesh); return mesh; };
      add(s.box([0.24, 0.36, 0.12], [0, 0.18, 0], tone));
      add(s.box([0.24, 0.07, 0.03], [0, 0.385, 0.01], tone)).rotation.x = 0.25;
      add(s.box([0.17, 0.09, 0.004], [0, 0.2, 0.062], mat('#ffffff')));
      add(s.box([0.17, 0.02, 0.005], [0, 0.235, 0.063], trim));
      add(s.box([0.07, 0.22, 0.004], [0.06, 0.26, 0.068], mat('#fbfaf4'))).rotation.z = (random() - 0.5) * 0.25;
      g.position.set(x, top, z);
      g.rotation.y = (random() - 0.5) * 0.5;
      g.scale.setScalar(size);
      s.root.add(g);
    };
    if (a.counter === 'bags') {
      const n = 4 + Math.round(mix(0, 5, mood.density));
      for (let i = 0; i < n; i++) bag(cx - 1.2 + i * 0.36 + (random() - 0.5) * 0.06, cz + 0.12 + (random() - 0.5) * 0.1, mix(0.9, 1.2, random()));
    } else if (a.counter === 'single') {
      bag(cx - 0.4 + random() * 0.8, cz + 0.12, 1.15, mat('#e2d8b8', { roughness: 0.95 }));
    } else if (a.counter === 'flowers') {
      const vx = cx - 0.5;
      s.lathe([[0, 0], [0.07, 0], [0.1, 0.12], [0.06, 0.28], [0.08, 0.34]], new THREE.MeshStandardMaterial({ color: dim('#bfe0e6'), roughness: 0.1, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), [vx, top, cz + 0.1]);
      const droop = mix(0.1, 0.9, Math.max(mood.wear, 1 - mood.cheer) * 0.7);
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * 6.28 + random(), lean = 0.12 + random() * 0.14;
        const head: [number, number, number] = [vx + Math.cos(angle) * lean * (1 + droop), top + 0.62 - droop * 0.22 - random() * 0.12, cz + 0.1 + Math.sin(angle) * lean * (1 + droop)];
        s.rod([vx, top + 0.2, cz + 0.1], head, 0.008, mat('#3f7a3c'));
        s.ball([0.07, 0.06, 0.07], head, mat(['#e86a8a', '#f2c81e', '#ffffff', '#d8322f', '#b07ad0'][i % 5], { roughness: 0.8 }), 10);
      }
      s.cylinder(0.08, 0.08, 0.2, [vx + 0.6, top + 0.1, cz + 0.12], mat('#d8322f', { roughness: 0.4 }), 16);
      s.box([0.07, 0.008, 0.012], [vx + 0.6, top + 0.203, cz + 0.12], dark);
    }
    // A desk bell, always: somebody has to be summoned.
    s.cylinder(0.1, 0.11, 0.02, [cx + 0.9, top + 0.01, cz + 0.18], dark, 16);
    s.ball([0.09, 0.065, 0.09], [cx + 0.9, top + 0.02, cz + 0.18], mat('#c9a23f', { metalness: 0.85, roughness: 0.25 }), 16);
    s.ball([0.018, 0.012, 0.018], [cx + 0.9, top + 0.092, cz + 0.18], dark, 8);
    if (mood.wear > 0.6) s.label('SYSTEM DOWN - CASH ONLY', 1.3, 0.3, [cx + 2.6, 0.75, front + 0.03], '#b01c1c', '#f6f1df').rotation.z = (random() - 0.5) * 0.1;

    // The grille.
    if (shut) {
      const pitch = 0.11, rowsG = Math.floor((headBottom - counterTop - 0.1) / pitch);
      const slatMaterial = mat('#aeb4b8', { metalness: 0.7, roughness: 0.4 });
      const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(cw - 0.1, 0.035, 0.02), slatMaterial, rowsG);
      const perRow = Math.floor((cw - 0.1) / 0.22);
      const links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, pitch, 0.015), slatMaterial, rowsG * perRow);
      let k = 0;
      for (let i = 0; i < rowsG; i++) {
        m.makeTranslation(cx, headBottom - 0.06 - i * pitch, -2.6);
        slats.setMatrixAt(i, m);
        for (let j = 0; j < perRow; j++) { m.makeTranslation(cx - (cw - 0.1) / 2 + 0.11 + j * 0.22 + (i % 2) * 0.11 - 0.05, headBottom - 0.06 - i * pitch - pitch / 2, -2.6); links.setMatrixAt(k++, m); }
      }
      for (const mesh of [slats, links]) { mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; s.root.add(mesh); }
      s.box([cw - 0.05, 0.07, 0.04], [cx, headBottom - 0.06 - rowsG * pitch, -2.6], steel);
      s.label('CLOSED', 1.5, 0.42, [cx, 1.95, -2.58], '#ffffff', '#b01c1c').rotation.z = (random() - 0.5) * 0.06;
    }

    // ----- Left wall: an over-the-counter gondola of boxes. -----
    const gz0 = -2.1, gz1 = 4.9;
    s.box([0.1, 2.1, gz1 - gz0], [-6.72, 1.05, (gz0 + gz1) / 2], shelfMat);
    s.box([0.55, 0.3, gz1 - gz0], [-6.5, 0.15, (gz0 + gz1) / 2], shelfMat);
    const rungs = [0.3, 0.78, 1.26, 1.74];
    for (const y of rungs) { s.box([0.5, 0.04, gz1 - gz0], [-6.5, y, (gz0 + gz1) / 2], shelfMat); s.box([0.01, 0.05, gz1 - gz0], [-6.245, y - 0.005, (gz0 + gz1) / 2], trim); }
    const boxColours = a.pharmacy === 'herbal' ? ['#b8322a', '#e2c36a', '#3a6a4a', '#e6d8b8', '#6a2a1e'] : a.pharmacy === 'apothecary' ? ['#6a3a1c', '#e8e2d0', '#2f5a8a', '#7a2a2a', '#b8923a'] : ['#2f7fd0', '#ffffff', '#d8322f', '#f2c81e', '#1f9a55', '#f06aa8', '#7a46c9', '#e9eef0'];
    const goods: THREE.Matrix4[] = [], goodColours: THREE.Color[] = [];
    for (const y of rungs) {
      let z = gz0 + 0.12;
      while (z < gz1 - 0.15) {
        const width = 0.12 + random() * 0.16, tall = 0.16 + random() * 0.24, run = 1 + Math.floor(random() * 5);
        const colour = dim(boxColours[Math.floor(random() * boxColours.length)]);
        const present = random() < stock;
        for (let i = 0; i < run && z < gz1 - 0.15; i++) {
          if (present) { goods.push(new THREE.Matrix4().makeScale(0.22, tall, width - 0.012).setPosition(-6.42 + random() * 0.04, y + 0.02 + tall / 2, z + width / 2)); goodColours.push(colour); }
          z += width;
        }
        z += 0.03;
      }
    }
    const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), goods.length);
    goods.forEach((matrix, i) => { boxes.setMatrixAt(i, matrix); boxes.setColorAt(i, goodColours[i]); });
    boxes.instanceMatrix.needsUpdate = true;
    if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true;
    boxes.castShadow = boxes.receiveShadow = true;
    s.root.add(boxes);

    // ----- Clock, cross, corner dressing, ceiling fixtures. -----
    const [hour, minute] = { morning: [9, 5], lull: [2, 40], closing: [5, 55], small: [3, 10], stopped: [6, 30] }[a.clock];
    const clockAt: [number, number, number] = [5.1, 3.82, -5.27];
    const face = paint(256, 256, (c) => {
      c.fillStyle = '#fbfaf2';
      c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.fillStyle = '#1c2026';
      for (let i = 0; i < 12; i++) { c.save(); c.translate(128, 128); c.rotate((i / 12) * Math.PI * 2); c.fillRect(-4, -116, 8, i % 3 === 0 ? 30 : 16); c.restore(); }
      const hand = (turn: number, length: number, width: number) => { c.save(); c.translate(128, 128); c.rotate(turn * Math.PI * 2); c.fillRect(-width / 2, -length, width, length + 14); c.restore(); };
      hand((hour + minute / 60) / 12, 62, 12);
      hand(minute / 60, 98, 7);
    });
    s.mesh(new THREE.CircleGeometry(0.36, 40), new THREE.MeshStandardMaterial({ map: face, color: dim('#ffffff'), roughness: 0.4 }), clockAt);
    s.ring(0.37, 0.03, clockAt, classic ? trim : dark);
    const second = s.box([0.008, 0.3, 0.004], [0, 0.12, 0], mat('#d8322f'));
    const secondPivot = new THREE.Group();
    secondPivot.position.set(clockAt[0], clockAt[1], clockAt[2] + 0.012);
    secondPivot.add(second);
    s.root.add(secondPivot);
    secondPivot.rotation.z = -random() * 6.28;
    let neon: THREE.MeshStandardMaterial | null = null;
    if (a.pharmacy === 'farmacia') {
      neon = mat('#27d070', { emissive: '#1fe070', emissiveIntensity: 1.1 * glowScale });
      neon.color.set('#27d070');
      s.box([0.26, 0.84, 0.06], [-5.2, 3.8, -5.26], neon);
      s.box([0.84, 0.26, 0.06], [-5.2, 3.8, -5.26], neon);
    } else if (a.pharmacy === 'herbal') {
      for (const [i, x] of [-5.3, -4.4].entries()) s.label(['GINSENG', 'ROOTS'][i], 0.36, 1.1, [x, 3.72, -5.27], '#e2c36a', '#7a1c16');
    }

    const cornerX = 5.95, cornerZ = -1.2;
    if (a.corner === 'leaflets') {
      for (const x of [-0.3, 0.3]) s.rod([cornerX + x, 0, cornerZ], [cornerX + x, 1.6, cornerZ - 0.25], 0.015, steel);
      for (let row = 0; row < 4; row++) {
        s.box([0.7, 0.02, 0.08], [cornerX, 0.35 + row * 0.36, cornerZ - 0.03 - row * 0.056], steel);
        for (let i = 0; i < 4; i++) if (random() < stock + 0.2) s.box([0.14, 0.3, 0.02], [cornerX - 0.24 + i * 0.16, 0.5 + row * 0.36, cornerZ - 0.06 - row * 0.056], mat(['#2f7fd0', '#f2c81e', '#1f9a55', '#f06aa8', '#ffffff', '#d8322f'][Math.floor(random() * 6)])).rotation.x = -0.15;
      }
    } else if (a.corner === 'cooler') {
      s.box([0.38, 1.0, 0.38], [cornerX, 0.5, cornerZ], mat('#eceee9', { roughness: 0.4 }));
      s.lathe([[0, 0], [0.09, 0], [0.16, 0.08], [0.16, 0.38], [0.13, 0.42], [0, 0.42]], new THREE.MeshStandardMaterial({ color: dim('#6fb6e8'), roughness: 0.1, transparent: true, opacity: 0.8 }), [cornerX, 1.0, cornerZ]);
      for (const [dx, tint] of [[-0.07, '#2f7fd0'], [0.07, '#d8322f']] as const) s.box([0.04, 0.05, 0.05], [cornerX + dx, 0.78, cornerZ + 0.2], mat(tint));
      s.box([0.3, 0.02, 0.1], [cornerX, 0.64, cornerZ + 0.22], dark);
      s.cylinder(0.045, 0.045, 0.4, [cornerX + 0.26, 0.8, cornerZ], mat('#ffffff'), 12);
    } else if (a.corner === 'plant') {
      s.cylinder(0.3, 0.22, 0.5, [cornerX, 0.25, cornerZ], mat(classic ? '#2f5a8a' : '#e9eef0', { roughness: 0.5 }), 20);
      s.rod([cornerX, 0.5, cornerZ], [cornerX + 0.05, 1.5, cornerZ], 0.04, mat('#6a4a2a'));
      const leaf = mat(new THREE.Color('#3d7a3c').lerp(new THREE.Color('#8a8f6a'), mood.wear * 0.6).getStyle(), { roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 11; i++) {
        const angle = (i / 11) * 6.28 + random() * 0.4, reach = 0.6 + random() * 0.35, rise = 0.25 + random() * 0.5 - mood.wear * 0.3;
        const frond = s.ball([0.1, reach * 0.55, 0.012], [cornerX + 0.05 + Math.cos(angle) * reach * 0.5, 1.5 + rise * 0.5, cornerZ + Math.sin(angle) * reach * 0.5], leaf, 8);
        frond.rotation.set(0, -angle, -Math.atan2(reach, rise));
      }
    } else if (a.corner === 'wetfloor') {
      const yellow = mat('#f2c81e', { roughness: 0.5 });
      const wx = 5.6, wz = 0.6;
      for (const lean of [-1, 1]) { const panel = s.box([0.34, 0.72, 0.025], [wx, 0.35, wz + lean * 0.13], yellow); panel.rotation.x = lean * 0.36; }
      s.label('WET FLOOR', 0.3, 0.14, [wx, 0.42, wz + 0.215], '#1c1c1c', '#f2c81e').rotation.x = -0.36;
      s.box([0.42, 0.36, 0.32], [cornerX, 0.2, cornerZ], yellow);
      for (const dx of [-0.17, 0.17]) for (const dz of [-0.12, 0.12]) s.cylinder(0.03, 0.03, 0.03, [cornerX + dx, 0.015, cornerZ + dz], dark, 8);
      s.rod([cornerX + 0.05, 0.3, cornerZ], [cornerX - 0.3, 1.55, cornerZ - 0.5], 0.018, mat('#c9a878'));
      s.ball([0.12, 0.1, 0.12], [cornerX + 0.05, 0.36, cornerZ], mat('#d9d9d0', { roughness: 1 }), 8);
      s.cylinder(0.75, 0.75, 0.004, [wx - 0.4, 0.004, wz + 0.3], new THREE.MeshStandardMaterial({ color: dim('#dfeaf0'), roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.4 }), 28).scale.z = 0.6;
    } else if (a.corner === 'scale') {
      s.box([0.5, 0.12, 0.62], [cornerX, 0.06, cornerZ], mat('#c9ced1', { metalness: 0.5, roughness: 0.4 }));
      s.box([0.42, 0.01, 0.42], [cornerX, 0.125, cornerZ + 0.07], dark);
      s.box([0.14, 1.5, 0.12], [cornerX, 0.75, cornerZ - 0.26], mat(classic ? '#7a1c16' : '#e9eef0', { roughness: 0.4 }));
      s.cylinder(0.27, 0.27, 0.1, [cornerX, 1.6, cornerZ - 0.24], mat(classic ? '#7a1c16' : '#e9eef0'), 28).rotation.x = Math.PI / 2;
      const dial = s.mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshStandardMaterial({ color: dim('#ffffff'), roughness: 0.4, map: paint(128, 128, (c) => {
        c.fillStyle = '#fbfaf2'; c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#1c2026';
        for (let i = 0; i < 30; i++) { c.save(); c.translate(64, 64); c.rotate((i / 30) * 6.283); c.fillRect(-1.5, -60, 3, i % 5 ? 8 : 16); c.restore(); }
        c.save(); c.translate(64, 64); c.rotate(1 + random() * 3); c.fillStyle = '#d8322f'; c.fillRect(-2, -52, 4, 60); c.restore();
      }) }), [cornerX, 1.6, cornerZ - 0.188]);
      void dial;
      s.label('YOUR WEIGHT 1c', 0.13, 0.3, [cornerX, 1.0, cornerZ - 0.198], '#ffffff', P.trim);
    }

    // Ceiling fixtures hang in the air above the waiting zone; the diorama has no ceiling.
    const lamps: THREE.MeshStandardMaterial[] = [];
    const lampGlow = shopLit ? 0.75 : 0.03;
    if (a.pharmacy === 'chain' || a.pharmacy === 'farmacia') {
      for (const [x, z] of [[-3, 1.4], [3, 1.4], [0, 4.2]]) {
        const tube = mat('#fffbe2', { emissive: '#fff8d0', emissiveIntensity: lampGlow });
        lamps.push(tube);
        s.box([3.2, 0.07, 0.6], [x, 4.25, z], tube);
        s.box([3.3, 0.05, 0.7], [x, 4.31, z], mat('#d9dcd6'));
      }
    } else {
      for (const [x, z] of [[-3.4, 1.2], [0, 2.6], [3.4, 1.2]]) {
        s.rod([x, 4.9, z], [x, 4.15, z], 0.015, mat(a.pharmacy === 'herbal' ? '#2a1a12' : '#b8923a', { metalness: 0.7, roughness: 0.3 }));
        const shadeMat = mat(a.pharmacy === 'herbal' ? '#d8281f' : '#fff2cc', { emissive: a.pharmacy === 'herbal' ? '#e03a1c' : '#ffe6a8', emissiveIntensity: lampGlow + (a.pharmacy === 'herbal' ? 0.15 : 0) });
        lamps.push(shadeMat);
        if (a.pharmacy === 'herbal') {
          s.ball([0.36, 0.3, 0.36], [x, 3.85, z], shadeMat, 18);
          for (const y of [4.13, 3.57]) s.cylinder(0.15, 0.15, 0.06, [x, y, z], mat('#e2c36a', { metalness: 0.6, roughness: 0.4 }), 14);
          s.rod([x, 3.54, z], [x, 3.2, z], 0.02, mat('#e2c36a'));
        } else {
          s.ball([0.27, 0.27, 0.27], [x, 3.88, z], shadeMat, 18);
          s.cylinder(0.1, 0.14, 0.1, [x, 4.13, z], trim, 14);
        }
      }
    }
    if (night) {
      const lamp = new THREE.PointLight('#ffe2b0', 42, 15, 1.5);
      lamp.position.set(cx, 2.5, -3.7);
      s.root.add(lamp);
    }
    // A water stain where the roof has leaked, once the place is worn.
    if (mood.wear > 0.5) {
      const stain = s.mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshStandardMaterial({ color: '#8a7a55', transparent: true, opacity: (mood.wear - 0.5) * 0.7, depthWrite: false, roughness: 1 }), [-6.78, 3.4, 2.6 + random() * 2]);
      stain.rotation.y = Math.PI / 2;
      stain.scale.set(1.5, 0.8, 1);
      stain.castShadow = false;
    }

    const flickerLamp = mood.wear > 0.55 && lamps.length ? lamps[Math.floor(random() * lamps.length)] : null;
    const tick = a.clock === 'stopped' ? 0 : 1;
    world.update = (dt, time) => {
      secondPivot.rotation.z -= dt * tick * (Math.PI * 2 / 60) * mix(0.6, 4, mood.energy);
      if (flickerLamp && shopLit) flickerLamp.emissiveIntensity = Math.sin(time * 27) * Math.sin(time * 6.1) > 0.5 ? 0.12 : lampGlow;
      if (neon) neon.emissiveIntensity = (1.1 + Math.sin(time * mix(0.8, 5, mood.energy)) * 0.25) * glowScale;
      if (night && counterLit) strip.emissiveIntensity = 1.8 + Math.sin(time * 50) * 0.04 * mood.wear;
    };
    return world;
  },
});
