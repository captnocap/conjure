import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const LABELS = {
  kitchen: 'KITCHEN, in confident capitals.',
  books: 'BOOKS, underlined twice because it is heavy.',
  mum: "MUM'S THINGS, written smaller and more carefully than the rest.",
  keep: 'KEEP, circled.',
  charity: 'CHARITY, the pile that is being let go.',
  fragile: 'FRAGILE, with an arrow pointing up.',
  question: 'Just a question mark: nobody knew where it belonged.',
} as const;
const TEXT: Record<keyof typeof LABELS, string> = {
  kitchen: 'KITCHEN', books: 'BOOKS', mum: "MUM'S THINGS", keep: 'KEEP', charity: 'CHARITY', fragile: 'FRAGILE', question: '?',
};

export default defineThing({
  questions: {
    stack: choice('How are the boxes stacked?', {
      tower: 'One tall careful tower, biggest at the bottom.',
      wall: 'A tidy wall two boxes wide, ready for the van.',
      pyramid: 'A stepped heap, three then two then one.',
      leaning: 'A hasty tower that has started to lean and crush its bottom box.',
      few: 'Only two or three boxes left, the last of it.',
    }),
    label: choice('What is written on the most prominent box?', LABELS),
    sorting: choice('How are the other boxes labelled?', {
      rooms: 'By room: BEDROOM, HALL, BATHROOM, LOFT.',
      verdicts: 'By verdict: KEEP, CHARITY, TIP, ASK DAD.',
      people: 'By person: MUM, DAD, and the names of grown children.',
      numbers: 'Numbered like an inventory: 12 of 30.',
      blank: 'Not labelled at all; whoever packed them knew.',
    }),
    open: choice('What shows in the one box left open?', {
      books: 'Paperbacks packed spine up.',
      crockery: 'Plates on edge among balls of newspaper.',
      toys: 'A teddy bear looking over the rim, kept for forty years.',
      photos: 'Framed photographs standing in a row.',
      knitwear: 'Folded jumpers, one sleeve hanging over the side.',
      empty: 'Nothing yet: it is still waiting to be filled.',
    }),
    tape: choice('What tape seals them?', {
      brown: 'Ordinary brown parcel tape.',
      clear: 'Shiny clear tape over older printed supermarket boxes.',
      fragile: 'Red and white FRAGILE tape, wrapped twice.',
      string: 'Old boxes tied with string as well as tape, reused from the last move.',
    }),
    left: choice('What has been left on top?', {
      gun: 'The tape dispenser, mid-job.',
      marker: 'The marker pen, cap off.',
      mug: 'A mug of tea gone cold.',
      nothing: 'Nothing.',
    }),
    amount: score('How many boxes are there?', ['The last few', 'A carload', 'A whole room of them']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const base = a.tape === 'clear' ? '#c9a06a' : a.tape === 'string' ? '#a9814f' : '#bd9460';
    const tapeColour = { brown: '#8a5a2c', clear: '#e8dcc0', fragile: '#d8352c', string: '#8a5a2c' }[a.tape];
    const ink = mood.cheer > 0.75 ? '#1f3f9a' : '#17171a';
    const others: Record<typeof a.sorting, string[]> = {
      rooms: ['BEDROOM', 'HALL', 'BATHROOM', 'LOFT', 'STUDY', 'GARAGE'],
      verdicts: ['KEEP', 'CHARITY', 'TIP', 'ASK DAD', 'SELL', 'KEEP?'],
      people: ['MUM', 'DAD', 'ANNA', 'TOM', 'GRAN', 'RUTH'],
      numbers: ['12 / 30', '7 / 30', '23 / 30', '4 / 30', '30 / 30', '18 / 30'],
      blank: ['', '', '', '', '', ''],
    };

    const paint = (text: string, kind: 'front' | 'side' | 'top', wide: number) => {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = kind === 'top' ? Math.round(256 / wide) : 200;
      const c = cv.getContext('2d')!;
      const W = cv.width, H = cv.height;
      c.fillStyle = base; c.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 4) { c.fillStyle = `rgba(70,45,20,${0.03 + random() * 0.05})`; c.fillRect(x, 0, 1.5, H); }
      for (let i = 0; i < 4 + mood.wear * 14; i++) {
        c.fillStyle = `rgba(60,40,20,${0.05 + random() * 0.1})`;
        c.beginPath(); c.ellipse(random() * W, random() * H, 8 + random() * 34, 5 + random() * 18, random() * 3, 0, 7); c.fill();
      }
      if (a.tape === 'clear' && kind !== 'top') {
        c.fillStyle = pick(['#3d7a4a', '#b6452f', '#2f5d93']);
        c.fillRect(W * 0.08, H * 0.62, W * 0.84, H * 0.22);
        c.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < 5; i++) c.fillRect(W * 0.14 + i * W * 0.15, H * 0.69, W * 0.1, H * 0.08);
      }
      const strip = (x: number, y: number, w: number, h: number) => {
        c.fillStyle = tapeColour; c.globalAlpha = a.tape === 'clear' ? 0.55 : 1; c.fillRect(x, y, w, h); c.globalAlpha = 1;
        if (a.tape === 'fragile') {
          c.fillStyle = '#ffffff'; c.font = `bold ${Math.min(w, h) * 0.6}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          if (w > h) for (let i = 0; i < 3; i++) c.fillText('FRAGILE', x + w * (0.18 + i * 0.32), y + h / 2);
          else { c.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.12); c.fillRect(x + w * 0.2, y + h * 0.6, w * 0.6, h * 0.12); }
        }
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, w, Math.max(2, h * 0.08));
      };
      if (kind === 'top') {
        c.strokeStyle = 'rgba(50,30,10,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
        strip(0, H / 2 - H * 0.13, W, H * 0.26);
        if (a.tape === 'fragile') strip(0, H * 0.08, W, H * 0.16);
      } else if (kind === 'side') {
        strip(W * 0.4, 0, W * 0.2, H * (0.2 + random() * 0.12));
        c.fillStyle = 'rgba(30,18,8,0.85)'; c.beginPath(); c.ellipse(W / 2, H * 0.45, W * 0.13, H * 0.05, 0, 0, 7); c.fill();
      } else {
        c.strokeStyle = 'rgba(50,30,10,0.35)'; c.lineWidth = 1.5; c.strokeRect(3, 3, W - 6, H - 6);
      }
      if (text) {
        c.save();
        c.translate(W / 2, H * (kind === 'top' ? 0.5 : 0.5)); c.rotate((random() - 0.5) * 0.14);
        c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
        const size = Math.min(H * 0.4, (W * 1.4) / Math.max(text.length, 2.2));
        c.font = `bold italic ${size}px "Comic Sans MS", "Marker Felt", "Segoe Print", sans-serif`;
        c.fillText(text, 0, 0, W * 0.9);
        const width = Math.min(c.measureText(text).width, W * 0.9);
        c.strokeStyle = ink; c.lineWidth = Math.max(3, size * 0.09); c.lineCap = 'round';
        if (text === 'BOOKS' || text === 'TIP') { c.beginPath(); c.moveTo(-width / 2, size * 0.6); c.lineTo(width / 2, size * 0.55); c.moveTo(-width / 2, size * 0.78); c.lineTo(width / 2, size * 0.72); c.stroke(); }
        if (text === 'KEEP') { c.beginPath(); c.lineWidth = Math.max(2.5, size * 0.06); c.ellipse(0, 0, width * 0.64, size * 0.8, 0.04, 0.2, 6.6); c.stroke(); }
        if (text === 'FRAGILE') { c.beginPath(); c.moveTo(width * 0.6, size * 0.5); c.lineTo(width * 0.6, -size * 0.6); c.lineTo(width * 0.52, -size * 0.3); c.moveTo(width * 0.6, -size * 0.6); c.lineTo(width * 0.68, -size * 0.3); c.stroke(); }
        c.restore();
      }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    };
    const plain = new THREE.MeshStandardMaterial({ color: base, roughness: 0.92 });
    const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.72), roughness: 0.95, side: THREE.DoubleSide });
    const stringMat = s.material('#d9cdb0');
    const sideMat = paint('', 'side', 1);

    const closed = (w: number, h: number, d: number, text: string) => {
      const g = new THREE.Group();
      const front = paint(text, 'front', w / h);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [front, sideMat, paint('', 'top', w / d), plain, front, sideMat]);
      mesh.position.y = h / 2; mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      if (a.tape === 'string') {
        for (const [sw, sd] of [[w + 0.012, 0.008], [0.008, d + 0.012]] as const) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(sw, h + 0.012, sd), stringMat);
          band.position.set(sw > 0.1 ? 0 : w * 0.18, h / 2, sd > 0.1 ? 0 : d * 0.15); band.castShadow = true; g.add(band);
        }
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), stringMat); knot.position.set(w * 0.18, h + 0.01, d * 0.15); g.add(knot);
      }
      return g;
    };

    const opened = (w: number, h: number, d: number, text: string) => {
      const g = new THREE.Group();
      const t = 0.008;
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, parent: THREE.Object3D = g) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
      };
      const front = paint(text, 'front', w / h);
      add(new THREE.BoxGeometry(w, h, t), [plain, plain, plain, plain, front, inner], 0, h / 2, d / 2);
      add(new THREE.BoxGeometry(w, h, t), inner, 0, h / 2, -d / 2);
      add(new THREE.BoxGeometry(t, h, d), [front, inner, plain, plain, plain, plain], w / 2, h / 2, 0);
      add(new THREE.BoxGeometry(t, h, d), inner, -w / 2, h / 2, 0);
      add(new THREE.BoxGeometry(w, t, d), inner, 0, t, 0);
      const flapMat = [plain, plain, inner, plain, plain, plain];
      for (const sign of [1, -1]) {
        const angle = mix(1.75, 3.3, random());
        const hinge = new THREE.Group(); hinge.position.set(0, h, sign * d / 2); hinge.rotation.x = sign * angle; g.add(hinge);
        add(new THREE.BoxGeometry(w, t, d / 2), flapMat, 0, 0, -sign * d / 4, hinge);
        const side = new THREE.Group(); side.position.set(sign * w / 2, h, 0); side.rotation.z = -sign * mix(1.75, 3.3, random()); g.add(side);
        add(new THREE.BoxGeometry(d / 2, t, d - 0.01), flapMat, -sign * d / 4, 0, 0, side);
      }
      const top = h - 0.03;
      if (a.open === 'books') {
        let x = -w / 2 + 0.03;
        for (const z of [-d * 0.22, d * 0.22]) {
          x = -w / 2 + 0.03;
          while (x < w / 2 - 0.05) {
            const thick = 0.018 + random() * 0.03;
            const book = add(new THREE.BoxGeometry(thick, 0.19, d * 0.38), s.material(pick(['#a23b2e', '#2e5e8c', '#d9c27a', '#3f6b4a', '#e8e0cf', '#5b3a6b', '#d77a2c', '#1f2a36'])), x + thick / 2, top - 0.07 + random() * 0.03, z);
            book.rotation.z = (random() - 0.5) * 0.12;
            x += thick + 0.003;
          }
        }
      } else if (a.open === 'crockery') {
        const news = s.material('#d8d6cf'), china = s.material('#f3f1ea', { roughness: 0.3 }), rim = s.material('#3f6aa8', { roughness: 0.3 });
        for (let i = 0; i < 9; i++) {
          const ball = add(new THREE.IcosahedronGeometry(0.06 + random() * 0.03, 0), news, (random() - 0.5) * (w - 0.14), top - 0.03 + random() * 0.04, (random() - 0.5) * (d - 0.14));
          ball.rotation.set(random() * 3, random() * 3, random() * 3);
        }
        for (let i = 0; i < 5; i++) {
          const plate = add(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 20), china, -0.06 + i * 0.024, top - 0.02, d * 0.12);
          plate.rotation.z = Math.PI / 2 + 0.12;
          const edge = add(new THREE.TorusGeometry(0.117, 0.005, 6, 24), rim, -0.06 + i * 0.024, top - 0.02, d * 0.12);
          edge.rotation.y = Math.PI / 2; edge.rotation.x = 0.12;
        }
      } else if (a.open === 'toys') {
        const fur = s.material('#a8763f', { roughness: 1 }), dark = s.material('#1b1512'), pale = s.material('#d6b98a', { roughness: 1 });
        const bear = new THREE.Group(); bear.position.set(-w * 0.12, top + 0.02, d * 0.2); bear.rotation.y = 0.3; g.add(bear);
        const sphere = (r: number, mat: THREE.Material, x: number, y: number, z: number, sy = 1) => { const m = add(new THREE.SphereGeometry(r, 16, 12), mat, x, y, z, bear); m.scale.y = sy; return m; };
        sphere(0.085, fur, 0, 0.09, 0, 0.92); sphere(0.03, fur, -0.07, 0.16, 0); sphere(0.03, fur, 0.07, 0.16, 0);
        sphere(0.04, pale, 0, 0.07, 0.065, 0.8); sphere(0.012, dark, 0, 0.085, 0.1); sphere(0.01, dark, -0.032, 0.115, 0.072); sphere(0.01, dark, 0.032, 0.115, 0.072);
        sphere(0.1, fur, 0, -0.06, -0.02, 1.1);
        const arm = sphere(0.035, fur, 0.1, 0.0, 0.07); arm.scale.set(1, 1, 2.2); arm.rotation.x = 0.5;
        add(new THREE.SphereGeometry(0.07, 16, 12), s.material('#d8352c', { roughness: 0.4 }), w * 0.22, top, -d * 0.15);
        add(new THREE.BoxGeometry(0.1, 0.1, 0.1), s.material('#e8c53a'), w * 0.2, top - 0.02, d * 0.22).rotation.set(0.3, 0.5, 0.2);
        add(new THREE.BoxGeometry(0.1, 0.1, 0.1), s.material('#3f7fc0'), -w * 0.25, top - 0.02, -d * 0.2).rotation.set(0.2, 0.2, 0.4);
      } else if (a.open === 'photos') {
        for (let i = 0; i < 5; i++) {
          const fw = 0.2 + random() * 0.12, fh = 0.22 + random() * 0.08;
          const z = -d * 0.32 + i * d * 0.16;
          const frame = add(new THREE.BoxGeometry(fw, fh, 0.016), s.material(pick(['#b89445', '#2a2420', '#6b4a2e', '#d8d2c4']), { metalness: 0.2 }), (random() - 0.5) * 0.08, top - 0.02, z);
          frame.rotation.x = -0.18; frame.rotation.z = (random() - 0.5) * 0.1;
          const face = add(new THREE.PlaneGeometry(fw - 0.04, fh - 0.04), s.material(pick(['#d9d2c0', '#b9c4c8', '#cdb89a'])), 0, 0, 0.009, frame);
          face.castShadow = false;
        }
      } else if (a.open === 'knitwear') {
        const wool = [s.material('#b5463a', { roughness: 1 }), s.material('#e3dcc8', { roughness: 1 }), s.material('#4a6a8a', { roughness: 1 })];
        for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(w - 0.06, 0.05, d - 0.06), wool[i], 0, top - 0.11 + i * 0.05, 0).rotation.y = (random() - 0.5) * 0.1;
        const sleeve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(w * 0.1, top + 0.03, d * 0.1), new THREE.Vector3(w * 0.15, top + 0.05, d * 0.5), new THREE.Vector3(w * 0.17, h * 0.75, d * 0.5 + 0.045), new THREE.Vector3(w * 0.2, h * 0.45, d * 0.5 + 0.04)]), 16, 0.04, 8), wool[2]);
        sleeve.scale.z = 1; sleeve.castShadow = true; g.add(sleeve);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), s.material('#2f4a66', { roughness: 1 }), w * 0.2, h * 0.44, d * 0.5 + 0.04);
      } else {
        const roll = add(new THREE.TorusGeometry(0.045, 0.02, 8, 20), s.material(tapeColour), w * 0.15, 0.04, 0.02); roll.rotation.x = Math.PI / 2;
      }
      return g;
    };

    // Lay out columns of [width, height, depth] boxes.
    const amount = Math.min(1, a.amount * 0.75 + mood.density * 0.25);
    const size = (big = 1): [number, number, number] => [mix(0.46, 0.6, random()) * big, mix(0.3, 0.42, random()) * big, mix(0.36, 0.44, random()) * big];
    const names = [TEXT[a.label], ...others[a.sorting].slice().sort(() => random() - 0.5)];
    const columns: { x: number; z: number; boxes: [number, number, number][] }[] = [];
    if (a.stack === 'tower' || a.stack === 'leaning') {
      const n = 3 + Math.round(amount * 2);
      columns.push({ x: 0, z: 0, boxes: Array.from({ length: n }, (_u, i) => size(1.12 - i * 0.07)) });
    } else if (a.stack === 'wall') {
      const n = 2 + Math.round(amount * 2);
      columns.push({ x: -0.31, z: 0, boxes: Array.from({ length: n }, () => size()) }, { x: 0.31, z: 0, boxes: Array.from({ length: Math.max(1, n - 1) }, () => size()) });
      if (amount > 0.6) columns.push({ x: 0.93, z: 0, boxes: Array.from({ length: Math.max(1, n - 2) }, () => size()) });
    } else if (a.stack === 'pyramid') {
      const wide = amount > 0.5 ? 3 : 2;
      for (let i = 0; i < wide; i++) columns.push({ x: (i - (wide - 1) / 2) * 0.62, z: 0, boxes: [size()] });
      for (let i = 0; i < wide - 1; i++) columns.push({ x: (i - (wide - 2) / 2) * 0.62, z: 0, boxes: [[0, 0.4, 0], size(0.95)] });
      if (wide === 3) columns.push({ x: 0, z: 0, boxes: [[0, 0.8, 0], size(0.85)] });
    } else {
      columns.push({ x: -0.1, z: 0, boxes: Array.from({ length: 1 + Math.round(amount) }, () => size()) });
    }

    let index = 0, topY = 0, topX = 0, topZ = 0, maxX = 0, heroDone = false;
    const heroColumn = a.stack === 'pyramid' ? columns.length - 1 : 0;
    columns.forEach((column, ci) => {
      let y = 0, lean = 0;
      column.boxes.forEach(([w, h, d], level) => {
        if (w === 0) { y += h; return; }
        const top = level === column.boxes.length - 1;
        const hero = ci === heroColumn && top && !heroDone;
        if (hero) heroDone = true;
        const crush = a.stack === 'leaning' && level === 0 ? 0.86 : 1;
        const box = closed(w, h * crush, d, hero ? names[0] : names[1 + (index++ % (names.length - 1))]);
        if (a.stack === 'leaning') lean += (0.035 + random() * 0.03) * (level > 0 ? 1 : 0);
        box.position.set(column.x + lean + (random() - 0.5) * 0.03, y, column.z + (random() - 0.5) * 0.04);
        box.rotation.y = (random() - 0.5) * mix(0.08, 0.3, mood.wear);
        if (a.stack === 'leaning') box.rotation.z = -lean * 0.35;
        s.root.add(box);
        y += h * crush;
        maxX = Math.max(maxX, column.x + w / 2);
        if (hero) { topY = y; topX = box.position.x; topZ = box.position.z; }
      });
    });
    if (!heroDone) topY = 0.4;

    const openSize = size(0.98);
    const openBox = opened(openSize[0], openSize[1], openSize[2], a.sorting === 'blank' ? '' : names[1]);
    openBox.position.set(maxX + openSize[0] / 2 + 0.16, 0, 0.22 + random() * 0.1);
    openBox.rotation.y = -0.2 - random() * 0.3;
    s.root.add(openBox);

    const item = new THREE.Group(); item.position.set(topX + 0.05, topY, topZ + 0.03); item.rotation.y = random() * 1.2 - 0.6; s.root.add(item);
    const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; item.add(m); return m; };
    if (a.left === 'gun') {
      const red = s.material('#c8362c', { roughness: 0.4 });
      put(new THREE.BoxGeometry(0.035, 0.11, 0.045), red, -0.06, 0.055, 0).rotation.z = -0.25;
      put(new THREE.BoxGeometry(0.17, 0.02, 0.06), red, 0.02, 0.115, 0);
      put(new THREE.CylinderGeometry(0.05, 0.05, 0.052, 20), s.material(tapeColour), 0.07, 0.07, 0).rotation.x = Math.PI / 2;
      put(new THREE.BoxGeometry(0.01, 0.05, 0.065), s.material('#b9bcbf', { metalness: 0.7 }), 0.115, 0.115, 0);
    } else if (a.left === 'marker') {
      put(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10), s.material('#17171a', { roughness: 0.4 }), 0, 0.011, 0).rotation.z = Math.PI / 2;
      put(new THREE.CylinderGeometry(0.004, 0.009, 0.02, 8), s.material('#55585c'), 0.075, 0.011, 0).rotation.z = -Math.PI / 2;
      put(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 10), s.material('#17171a', { roughness: 0.4 }), 0.03, 0.012, 0.07).rotation.set(Math.PI / 2, 0, 0.6);
    } else if (a.left === 'mug') {
      const glaze = s.material(mood.cheer > 0.5 ? '#e0b23a' : '#5d7f8f', { roughness: 0.35 });
      put(new THREE.CylinderGeometry(0.042, 0.038, 0.095, 20), glaze, 0, 0.0475, 0);
      put(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 20), s.material('#4a2e1a', { roughness: 0.2 }), 0, 0.09, 0);
      put(new THREE.TorusGeometry(0.028, 0.008, 8, 16, Math.PI), glaze, 0.042, 0.048, 0).rotation.z = -Math.PI / 2;
    }
    return s.finish();
  },
});
