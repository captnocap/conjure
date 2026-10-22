import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const STYLE = {
  chinese: { wood: '#6a2a1e', dark: '#3a1410', metal: '#c9a23f', label: '#c8322a', ink: '#f6e3b0', contents: ['#8a6a3a', '#b0452c', '#6f7a3a', '#d8c9a0', '#4a3524'] },
  victorian: { wood: '#5a2f1a', dark: '#2e170d', metal: '#d8dde0', label: '#17181b', ink: '#e2c36a', contents: ['#e8e2d0', '#c9b27a', '#7a5a3a', '#d98a5a'] },
  ayurvedic: { wood: '#2f8a86', dark: '#7a4a22', metal: '#c98f3a', label: '#f0dfae', ink: '#7a2a1a', contents: ['#e0a21c', '#b8321f', '#6a8a2f', '#c96a1c', '#5a3a22'] },
  alchemist: { wood: '#2b2622', dark: '#141210', metal: '#4a4c50', label: '#b9a57a', ink: '#1c1612', contents: ['#3fd0a0', '#c9a23f', '#7a3fc0', '#b8321f', '#d8d8d0'] },
} as const;

export default defineThing({
  questions: {
    tradition: choice('Whose cabinet is it?', {
      chinese: 'A Chinese herbal dispensary chest in dark red lacquered wood: small square drawers with brass ring pulls and red paper labels.',
      victorian: 'A Victorian chemist\'s mahogany drug run with glass knobs and black-and-gilt Latin labels under a moulded cornice.',
      ayurvedic: 'An Ayurvedic vaidya\'s painted teal cabinet, worn to the wood at the edges, with brass cup pulls and cream labels.',
      alchemist: 'An alchemist\'s blackened oak cabinet with iron rings and symbols inked on parchment tags.',
    }),
    shape: choice('What shape is the cabinet?', {
      tall: 'A tall wall cabinet, higher than a person, ten rows of drawers.',
      wide: 'A long waist-high counter run of drawers you could serve across.',
      chest: 'A small countertop chest of sixteen or twenty drawers.',
    }),
    open: score('How many drawers have been left open?', ['All shut and squared', 'One or two ajar', 'Several pulled out mid-search', 'Ransacked: half of them hanging open']),
    top: choice('What sits on top?', {
      scale: 'A brass balance scale with two pans, flanked by a couple of jars.',
      jars: 'A crowded row of lidded apothecary jars.',
      mortar: 'A heavy mortar and pestle among bowls of coloured powder.',
      glassware: 'A retort and flasks, one of them faintly glowing.',
      books: 'Stacked ledgers, a candle and a skull-sized mystery.',
      bare: 'Nothing but dust.',
    }),
    labels: choice('How are the drawers labelled?', {
      neat: 'Every drawer neatly labelled.',
      patchy: 'Labels on most, some peeled away or replaced crookedly.',
      none: 'Unlabelled: only the owner knows what is where.',
    }),
    beside: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      drawer: 'One drawer pulled out entirely and set on the floor, its contents showing.',
      stool: 'A small wooden step stool for reaching the top rows.',
      spill: 'A spill of dried herbs and a few paper packets.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const style = STYLE[a.tradition];
    const [cols, rows] = { tall: [6, 10], wide: [11, 5], chest: [5, 4] }[a.shape];
    const dw = a.shape === 'chest' ? 0.15 : 0.175, dh = a.shape === 'chest' ? 0.11 : 0.15, depth = a.shape === 'chest' ? 0.3 : 0.42;
    const gap = 0.014;
    const gridW = cols * dw + (cols + 1) * gap, gridH = rows * dh + (rows + 1) * gap;
    const plinth = a.shape === 'chest' ? 0.03 : a.shape === 'wide' ? 0.16 : 0.14;
    const woodColour = new THREE.Color(style.wood).lerp(new THREE.Color('#8d8576'), mood.wear * 0.25);
    const wood = s.material(woodColour, { roughness: a.tradition === 'chinese' ? 0.35 : 0.6 });
    const darkWood = s.material(style.dark, { roughness: 0.7 });
    const metal = s.material(style.metal, { metalness: a.tradition === 'victorian' ? 0.2 : 0.85, roughness: a.tradition === 'victorian' ? 0.1 : 0.35 });
    const brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.3 });

    // Carcass: dark recess behind the drawers, sides, top, plinth, cornice or feet.
    s.box([gridW, gridH, depth - 0.04], [0, plinth + gridH / 2, -0.02], darkWood);
    const side = 0.035;
    for (const x of [-1, 1]) s.box([side, gridH + 0.02, depth + 0.02], [x * (gridW / 2 + side / 2), plinth + gridH / 2, 0], wood);
    s.box([gridW + side * 2 + 0.05, 0.04, depth + 0.06], [0, plinth + gridH + 0.02, 0], wood);
    const topY = plinth + gridH + 0.04;
    if (a.shape === 'chest') s.box([gridW + side * 2 + 0.02, plinth, depth + 0.03], [0, plinth / 2, 0], darkWood);
    else if (a.tradition === 'chinese' || a.tradition === 'ayurvedic') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.07, plinth, 0.07], [x * (gridW / 2 - 0.01), plinth / 2, z * (depth / 2 - 0.04)], wood);
      s.box([gridW + side * 2, 0.05, depth], [0, plinth - 0.025, 0], wood);
    } else s.box([gridW + side * 2 + 0.04, plinth, depth + 0.04], [0, plinth / 2, 0], wood);
    if (a.tradition === 'victorian' && a.shape !== 'chest') {
      s.box([gridW + side * 2 + 0.1, 0.03, depth + 0.1], [0, topY + 0.015, 0], wood);
      s.box([gridW + side * 2 + 0.14, 0.025, depth + 0.13], [0, topY + 0.042, 0], darkWood);
    }
    const deckY = topY + (a.tradition === 'victorian' && a.shape !== 'chest' ? 0.055 : 0);
    // Shelf rails between rows.
    for (let r = 0; r <= rows; r++) s.box([gridW, gap, depth - 0.01], [0, plinth + gap / 2 + r * (dh + gap), 0], wood);

    // Drawers, pulls, labels and visible contents, all instanced.
    const total = cols * rows;
    const removed = a.beside === 'drawer' ? Math.floor(random() * total) : -1;
    const drawers = new THREE.InstancedMesh(new THREE.BoxGeometry(dw, dh, depth - 0.03), new THREE.MeshStandardMaterial({ roughness: a.tradition === 'chinese' ? 0.35 : 0.6 }), total);
    const pullGeometry = a.tradition === 'victorian' ? new THREE.SphereGeometry(0.017, 12, 8)
      : a.tradition === 'ayurvedic' ? new THREE.SphereGeometry(0.024, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
        : new THREE.TorusGeometry(0.02, 0.0045, 6, 16);
    const pulls = new THREE.InstancedMesh(pullGeometry, metal, total);
    const labelMap = paint(96, 64, (c, w, h) => {
      c.fillStyle = style.label;
      c.fillRect(0, 0, w, h);
      c.strokeStyle = style.ink;
      c.fillStyle = style.ink;
      c.lineWidth = 3;
      if (a.tradition === 'victorian') {
        c.strokeRect(4, 4, w - 8, h - 8);
        c.font = 'bold 26px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('PULV:', w / 2, h / 2);
      } else if (a.tradition === 'chinese') {
        for (const x of [24, 48, 72]) {
          c.beginPath(); c.moveTo(x - 9, 14); c.lineTo(x + 9, 14); c.moveTo(x, 8); c.lineTo(x, 34); c.moveTo(x - 10, 34); c.lineTo(x + 10, 26);
          c.moveTo(x - 8, 44); c.lineTo(x + 8, 44); c.moveTo(x - 9, 56); c.lineTo(x, 46); c.lineTo(x + 9, 56); c.stroke();
        }
      } else if (a.tradition === 'alchemist') {
        c.beginPath(); c.arc(30, 30, 14, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(30, 44); c.lineTo(30, 60); c.moveTo(22, 53); c.lineTo(38, 53); c.stroke();
        c.beginPath(); c.moveTo(56, 52); c.lineTo(70, 14); c.lineTo(84, 52); c.closePath(); c.stroke();
      } else {
        c.lineWidth = 4;
        c.beginPath(); c.moveTo(10, 18); c.lineTo(86, 18); c.stroke();
        for (const x of [22, 40, 58, 76]) { c.beginPath(); c.moveTo(x, 18); c.lineTo(x, 46); c.arc(x - 6, 40, 6, 0, Math.PI); c.stroke(); }
      }
    });
    const labelsMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(dw * 0.6, dh * 0.36), new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.8 }), total);
    const fills = new THREE.InstancedMesh(new THREE.BoxGeometry(dw - 0.03, 0.012, depth - 0.07), new THREE.MeshStandardMaterial({ roughness: 1 }), total);
    let labelCount = 0, fillCount = 0, pullCount = 0;
    const m = new THREE.Matrix4(), child = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const openRate = a.open * a.open * 0.55;
    let forced = a.open > 0.2 ? Math.floor(random() * total) : -1;
    const pullOffset = a.tradition === 'ayurvedic' || a.tradition === 'victorian' ? 0.006 : 0.012;
    const drawerMatrices: THREE.Matrix4[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const x = -gridW / 2 + gap + dw / 2 + c * (dw + gap);
      const y = plinth + gap + dh / 2 + r * (dh + gap);
      const isOpen = index === forced || random() < openRate;
      const out = index === removed ? -0.1 : isOpen ? mix(0.05, depth * 0.62, random()) : random() * 0.006 * (1 + mood.wear * 3);
      e.set(isOpen && out > depth * 0.45 ? 0.1 : 0, 0, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y - (e.x ? 0.012 : 0), 0.015 + out), q, index === removed ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(1, 1, 1));
      drawers.setMatrixAt(index, m);
      drawerMatrices.push(m.clone());
      drawers.setColorAt(index, woodColour.clone().offsetHSL((random() - 0.5) * 0.015, 0, (random() - 0.5) * mix(0.03, 0.1, mood.wear)));
      if (index === removed) continue;
      if (random() > mood.wear * 0.18) {
        child.makeTranslation(0, a.labels === 'none' ? 0 : -dh * 0.2, (depth - 0.03) / 2 + pullOffset);
        if (a.tradition === 'ayurvedic') child.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        pulls.setMatrixAt(pullCount++, child.premultiply(m));
      }
      const hasLabel = a.labels === 'neat' || (a.labels === 'patchy' && random() > 0.3);
      if (hasLabel) {
        child.makeRotationZ(a.labels === 'patchy' ? (random() - 0.5) * 0.3 : 0).setPosition(0, dh * 0.2, (depth - 0.03) / 2 + 0.0015);
        labelsMesh.setMatrixAt(labelCount++, child.premultiply(m));
      }
      if (isOpen && out > 0.04) {
        child.makeTranslation(0, dh / 2 + 0.004, 0).premultiply(m);
        fills.setMatrixAt(fillCount, child);
        fills.setColorAt(fillCount++, new THREE.Color(style.contents[Math.floor(random() * style.contents.length)]));
      }
    }
    pulls.count = pullCount; labelsMesh.count = labelCount; fills.count = fillCount;
    for (const mesh of [drawers, pulls, labelsMesh, fills]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    void forced; void drawerMatrices;

    // Things on top.
    const deckW = gridW - 0.1;
    const jar = (x: number, z: number, size: number, colour: string) => {
      const glassy = a.tradition === 'victorian' || a.tradition === 'alchemist';
      const bodyMaterial = s.material(colour, { roughness: glassy ? 0.15 : 0.5 });
      s.lathe([[0, 0], [0.05, 0], [0.058, 0.02], [0.06, 0.12], [0.045, 0.16], [0.03, 0.175], [0.03, 0.19], [0, 0.19]].map(([r, y]) => [r * size, y * size] as const), bodyMaterial, [x, deckY, z]);
      s.lathe([[0, 0], [0.036, 0], [0.036, 0.012], [0.012, 0.03], [0.014, 0.045], [0, 0.05]].map(([r, y]) => [r * size, y * size] as const), a.tradition === 'chinese' ? bodyMaterial : brass, [x, deckY + 0.19 * size, z]);
      const band = s.mesh(new THREE.CylinderGeometry(0.0605 * size, 0.0605 * size, 0.05 * size, 20, 1, true), s.material(style.label, { roughness: 0.8 }), [x, deckY + 0.085 * size, z]);
      band.castShadow = false;
    };
    const jarColours = a.tradition === 'chinese' ? ['#e9e6dc', '#3f6a9a', '#e9e6dc', '#7a3a2a'] : a.tradition === 'victorian' ? ['#2f6fb0', '#a03a2a', '#e8e2d0', '#3f8a5a', '#c98a2a'] : a.tradition === 'ayurvedic' ? ['#b5623f', '#c98f3a', '#8a4a2a'] : ['#3a4a3f', '#5a3f6a', '#2f2a26', '#6a5a3a'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    let beam: THREE.Object3D | null = null;
    let glow: THREE.MeshStandardMaterial | null = null;
    const unit = a.shape === 'chest' ? 0.8 : 1;
    if (a.top === 'scale') {
      const g = new Sculpture(context);
      g.lathe([[0, 0], [0.09, 0], [0.095, 0.015], [0.03, 0.03], [0.014, 0.06], [0.012, 0.36], [0.02, 0.38], [0, 0.4]], brass);
      const arm = new Sculpture(context);
      arm.rod([-0.19, 0, 0], [0.19, 0, 0], 0.007, brass);
      for (const x of [-0.19, 0.19]) {
        for (const [dx, dz] of [[-0.05, -0.03], [0.05, -0.03], [0, 0.055]]) arm.rod([x, 0, 0], [x + dx, -0.2, dz], 0.0025, brass);
        arm.lathe([[0, -0.012], [0.04, -0.01], [0.065, 0], [0.068, 0.006]], s.material('#c9a23f', { metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }), [x, -0.205, 0]);
      }
      arm.ball([0.028, 0.02, 0.028], [x0(random), -0.19, 0], s.material(pick(style.contents), { roughness: 1 }), 10);
      arm.root.position.y = 0.37;
      arm.root.rotation.z = (random() - 0.5) * 0.3;
      g.root.add(arm.root);
      beam = arm.root;
      g.root.scale.setScalar(unit * 1.15);
      g.root.position.set((random() - 0.5) * deckW * 0.2, deckY, 0);
      s.root.add(g.root);
      for (const sideX of [-1, 1]) if (deckW > 0.7) jar(sideX * deckW * mix(0.34, 0.44, random()), (random() - 0.5) * 0.08, unit * mix(0.9, 1.3, random()), pick(jarColours));
    } else if (a.top === 'jars') {
      const count = Math.max(3, Math.round(deckW / 0.17 * mix(0.6, 1, mood.density)));
      for (let i = 0; i < count; i++) jar(-deckW / 2 + 0.06 + (i + random() * 0.4) * ((deckW - 0.12) / Math.max(1, count - 0.6)), (random() - 0.5) * 0.1, unit * mix(0.8, 1.5, random()), pick(jarColours));
    } else if (a.top === 'mortar') {
      const stone = s.material(a.tradition === 'ayurvedic' ? '#c98f3a' : '#b9b4a8', { roughness: a.tradition === 'ayurvedic' ? 0.35 : 0.9, metalness: a.tradition === 'ayurvedic' ? 0.8 : 0, side: THREE.DoubleSide });
      const mx = (random() - 0.5) * deckW * 0.3;
      s.lathe([[0, 0], [0.07, 0], [0.075, 0.015], [0.055, 0.03], [0.1, 0.14], [0.105, 0.15], [0.09, 0.15], [0.05, 0.05], [0, 0.04]].map(([r, y]) => [r * unit * 1.2, y * unit * 1.2] as const), stone, [mx, deckY, 0]);
      s.rod([mx + 0.02, deckY + 0.07, 0], [mx + 0.16 * unit, deckY + 0.3 * unit, 0.05], 0.022 * unit, stone, 0.014 * unit);
      const bowls = Math.round(mix(2, 5, mood.density));
      for (let i = 0; i < bowls; i++) {
        const bx = mx + (i % 2 ? 1 : -1) * (0.2 + Math.floor(i / 2) * 0.17) * unit, bz = (random() - 0.5) * 0.12;
        if (Math.abs(bx) > deckW / 2) continue;
        s.lathe([[0, 0], [0.03, 0], [0.065, 0.045], [0.068, 0.05]].map(([r, y]) => [r * unit, y * unit] as const), s.material('#c9a23f', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), [bx, deckY, bz]);
        s.ball([0.055 * unit, 0.03 * unit, 0.055 * unit], [bx, deckY + 0.035 * unit, bz], s.material(pick(style.contents), { roughness: 1 }), 12);
      }
    } else if (a.top === 'glassware') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff3ee', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false });
      const liquidColour = pick(['#3fe0a0', '#e0c23f', '#a05cf0', '#f0603f']);
      const liquid = s.material(liquidColour, { emissive: liquidColour, emissiveIntensity: 0.9, roughness: 0.3 });
      glow = liquid;
      const gx = -deckW * 0.18;
      s.ball([0.1 * unit, 0.1 * unit, 0.1 * unit], [gx, deckY + 0.16 * unit, 0], glass, 18).castShadow = false;
      s.ball([0.085 * unit, 0.06 * unit, 0.085 * unit], [gx, deckY + 0.13 * unit, 0], liquid, 16);
      s.tube([[gx, deckY + 0.25 * unit, 0], [gx + 0.04, deckY + 0.34 * unit, 0], [gx + 0.16 * unit, deckY + 0.33 * unit, 0], [gx + 0.38 * unit, deckY + 0.16 * unit, 0.02]], 0.014 * unit, s.material('#bfe0d8', { roughness: 0.1, transparent: true, opacity: 0.75 }));
      s.cylinder(0.012, 0.05 * unit, 0.06 * unit, [gx, deckY + 0.03 * unit, 0], darkWood, 3);
      for (const dx of [-0.07, 0.07]) s.rod([gx + dx * unit, deckY, 0.05], [gx + dx * 0.6 * unit, deckY + 0.07 * unit, 0], 0.006, darkWood);
      const flasks = Math.round(mix(1, 4, mood.density));
      for (let i = 0; i < flasks; i++) {
        const fx = gx + (0.4 + i * 0.14) * unit;
        if (fx > deckW / 2) break;
        const tint = pick(style.contents);
        s.lathe([[0, 0], [0.045, 0], [0.05, 0.01], [0.014, 0.1], [0.014, 0.15], [0.02, 0.155]].map(([r, y]) => [r * unit, y * unit] as const), s.material(tint, { roughness: 0.15, emissive: tint, emissiveIntensity: 0.25 }), [fx, deckY, (random() - 0.5) * 0.1]);
      }
    } else if (a.top === 'books') {
      let y = deckY;
      const bx = -deckW * 0.2;
      const books = 2 + Math.round(mix(1, 5, mood.density));
      for (let i = 0; i < books; i++) {
        const h = 0.03 + random() * 0.035;
        const book = s.box([0.26 * unit, h, 0.19 * unit], [bx + (random() - 0.5) * 0.03, y + h / 2, (random() - 0.5) * 0.03], s.material(pick(['#5a1f1a', '#1f3a2a', '#2a2a4a', '#5a4a2a', '#2a2420']), { roughness: 0.8 }));
        book.rotation.y = (random() - 0.5) * 0.4;
        s.box([0.25 * unit, h * 0.7, 0.005], [book.position.x, y + h / 2, book.position.z + 0.095 * unit], s.material('#e6dcc0')).rotation.y = book.rotation.y;
        y += h;
      }
      const cx = deckW * 0.25;
      s.cylinder(0.018, 0.02, 0.14 * mix(1, 0.4, mood.wear), [cx, deckY + 0.07 * mix(1, 0.4, mood.wear) + 0.012, 0], s.material('#efe6c8'), 10);
      s.cylinder(0.05, 0.055, 0.012, [cx, deckY + 0.006, 0], brass, 16);
      const flame = s.material('#ffb040', { emissive: '#ff9a20', emissiveIntensity: 1.4 });
      glow = flame;
      s.ball([0.012, 0.026, 0.012], [cx, deckY + 0.14 * mix(1, 0.4, mood.wear) + 0.035, 0], flame, 8);
      if (a.tradition === 'alchemist' || mood.cheer < 0.3) {
        const bone = s.material('#d9d0b8', { roughness: 0.8 });
        s.ball([0.07, 0.075, 0.085], [cx * 0.1 + 0.1, y > deckY + 0.2 ? deckY + 0.07 : deckY + 0.075, 0.02], bone, 16);
        s.box([0.07, 0.04, 0.05], [cx * 0.1 + 0.1, deckY + 0.02, 0.07], bone);
        for (const dx of [-0.025, 0.025]) s.ball([0.016, 0.018, 0.01], [cx * 0.1 + 0.1 + dx, deckY + 0.075, 0.098], darkWood, 8);
      } else s.ball([0.08, 0.08, 0.08], [cx * 0.1 + 0.1, deckY + 0.11, 0], s.material('#3a6a8a', { roughness: 0.3 }), 16);
    } else {
      // Bare: only a forgotten paper packet and a length of string.
      s.box([0.1, 0.018, 0.07], [(random() - 0.5) * deckW * 0.7, deckY + 0.009, (random() - 0.5) * 0.1], s.material('#e6dcc0', { roughness: 0.95 })).rotation.y = random() * 3;
    }

    // Left beside it.
    const floorX = gridW / 2 + 0.3;
    if (a.beside === 'drawer') {
      const tray = new Sculpture(context);
      tray.box([dw, dh, depth - 0.03], [0, dh / 2, 0], s.material(woodColour, { roughness: 0.6 }));
      tray.box([dw - 0.03, 0.012, depth - 0.07], [0, dh + 0.004, 0], s.material(pick(style.contents), { roughness: 1 }));
      tray.mesh(pullGeometry, metal, [0, dh * 0.3, (depth - 0.03) / 2 + pullOffset]);
      tray.root.position.set(floorX * (random() < 0.5 ? -1 : 1) * 0.9, 0, depth / 2 + 0.18);
      tray.root.rotation.y = (random() - 0.5) * 1.2;
      s.root.add(tray.root);
    } else if (a.beside === 'stool' && a.shape !== 'chest') {
      const sx = floorX * (random() < 0.5 ? -1 : 1) * 0.85, sz = depth / 2 + 0.2;
      s.box([0.36, 0.03, 0.26], [sx, 0.3, sz], wood);
      s.box([0.36, 0.03, 0.2], [sx, 0.15, sz + 0.2], wood);
      for (const dx of [-0.16, 0.16]) {
        s.box([0.03, 0.3, 0.24], [sx + dx, 0.15, sz], darkWood);
        s.box([0.03, 0.15, 0.2], [sx + dx, 0.075, sz + 0.2], darkWood);
      }
    } else if (a.beside === 'stool') {
      s.box([0.05, 0.012, 0.16], [gridW / 2 + 0.12, 0.006, 0.1], brass).rotation.y = 0.4;
      s.ball([0.03, 0.012, 0.03], [gridW / 2 + 0.12, 0.014, 0.16], brass, 10);
    } else if (a.beside === 'spill') {
      const px = (random() - 0.5) * gridW * 0.6, pz = depth / 2 + 0.2;
      const bits = Array.from({ length: 40 + Math.floor(mood.density * 50) }, () => {
        const angle = random() * 6.28, r = Math.sqrt(random()) * 0.22;
        return { at: [px + Math.cos(angle) * r, 0.006, pz + Math.sin(angle) * r * 0.7] as [number, number, number], size: 0.5 + random(), color: pick(style.contents) };
      });
      s.scatter(new THREE.DodecahedronGeometry(0.011), new THREE.MeshStandardMaterial({ roughness: 1 }), bits);
      for (let i = 0; i < 3; i++) {
        const packet = s.box([0.09, 0.02, 0.07], [px + (random() - 0.5) * 0.5, 0.01, pz + (random() - 0.2) * 0.2], s.material(a.tradition === 'alchemist' ? '#b9a57a' : '#efe6cf', { roughness: 0.9 }));
        packet.rotation.y = random() * 3;
      }
    }

    return s.finish({
      footprint: Math.max(gridW, depth) / 2 + 0.1,
      update: (_dt, time) => {
        if (beam) beam.rotation.z = Math.sin(time * mix(0.3, 1.6, mood.energy)) * mix(0.02, 0.16, mood.energy);
        if (glow) glow.emissiveIntensity = 0.9 + Math.sin(time * mix(1, 9, mood.energy)) * 0.3 + (a.top === 'books' ? 0.4 : 0);
      },
    });
  },
});

function x0(random: () => number) {
  return random() < 0.5 ? -0.19 : 0.19;
}
