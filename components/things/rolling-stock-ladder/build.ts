import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const WORDS = ['NAILS', 'HINGES', 'TACKS', 'WICKS', 'BOLTS', 'HOOKS', 'RIVETS', 'CORKS', 'WASHERS', 'FUSES'];
const HERBS = ['SENNA', 'CLOVE', 'ALUM', 'MYRRH', 'ANISE', 'BORAX', 'SALVE', 'QUININE'];

function cardTexture(text: string, style: 'hand' | 'printed' | 'stencil', paper: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 56;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 128, 56);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = style === 'hand' ? 'italic bold 30px serif' : style === 'printed' ? 'bold 22px monospace' : 'bold 38px monospace';
  if (style === 'printed') { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 122, 50); }
  ctx.fillText(text, 64, 30, 116);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    stock: choice('What does the shelving hold?', {
      hardware: 'Hardware: a wall of small drawers below, cartons and tins on open shelves above.',
      library: 'Books, spine after spine to the ceiling.',
      archive: 'Archive boxes and bound ledgers, grey and buff, each with a label.',
      apothecary: 'An apothecary wall: tiny knobbed drawers below, rows of amber jars above.',
    }),
    wood: choice('What is the woodwork like?', {
      oak: 'Honey oak, worn pale at the edges.',
      walnut: 'Dark walnut, nearly black with polish.',
      green: 'Painted shop green with the wood showing through.',
      cream: 'Cream paint, chipped.',
      pine: 'Raw pine boards, knotty and practical.',
    }),
    position: choice('Where along the rail is the ladder?', {
      left: 'Parked at the left end.',
      centre: 'In the middle, where it was last needed.',
      right: 'Pushed to the right end.',
    }),
    rung: choice('What is on the ladder?', {
      nothing: 'Nothing.',
      box: 'A cardboard box balanced on a rung, about to be shelved or about to fall.',
      books: 'A short stack of books or ledgers on a tread.',
      bucket: 'A pail hooked over the side rail with a rag in it.',
      lamp: 'A lit lantern hung from the top rung.',
    }),
    apron: noul('Is a shop apron hung over the ladder?'),
    labels: choice('How are the drawers and shelves labelled?', {
      hand: 'Hand-painted words in a signwriter\'s italic.',
      printed: 'Printed cards in brass holders.',
      stencil: 'Stencilled numbers.',
      none: 'Not labelled; the keeper just knows.',
    }),
    disturbed: score('How disturbed is the stock?', ['Everything shut and squared', 'One drawer or gap left open', 'Several open, someone is hunting for something', 'Ransacked: drawers hanging out, things on the floor']),
    width: choice('How wide is the slice of shelving?', {
      narrow: 'One narrow bay.',
      double: 'Two bays.',
      long: 'A long three-bay run with room for the ladder to travel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bays = { narrow: 1, double: 2, long: 3 }[a.width];
    const bayW = 0.92, W = bays * bayW + 0.06, H = 3.0, D = 0.42;
    const WOOD = { oak: '#b58a52', walnut: '#4a3324', green: '#3f5f4a', cream: '#d8ceb0', pine: '#d2b17c' }[a.wood];
    const base = new THREE.Color(WOOD);
    const wood = s.material(base);
    const inner = s.material(base.clone().multiplyScalar(0.55));
    const edge = s.material(base.clone().multiplyScalar(0.8));
    const brass = s.material('#c9a14a', { metalness: 0.8, roughness: 0.35 });
    const iron = s.material('#2a2b2d', { metalness: 0.6, roughness: 0.5 });
    const front = D / 2;
    const drawers = a.stock === 'hardware' || a.stock === 'apothecary';
    const drawerTop = drawers ? 1.9 : 0.12;

    // Carcass.
    s.box([W, H, 0.03], [0, H / 2, -front + 0.015], inner);
    for (let i = 0; i <= bays; i++) s.box([0.045, H, D], [-W / 2 + 0.0225 + i * (W - 0.045) / bays, H / 2, 0], wood);
    s.box([W + 0.1, 0.1, D + 0.08], [0, H + 0.05, 0.02], edge);
    s.box([W + 0.16, 0.04, D + 0.12], [0, H + 0.12, 0.03], wood);
    s.box([W, 0.12, D], [0, 0.06, 0], edge);
    if (drawers) s.box([W + 0.03, 0.035, D + 0.06], [0, drawerTop + 0.018, 0.02], edge);

    const dummy = new THREE.Object3D();
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { p: [number, number, number]; r?: [number, number, number]; sc?: [number, number, number]; c?: THREE.Color }[]) => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((item, index) => {
        dummy.position.set(...item.p);
        dummy.rotation.set(...(item.r ?? [0, 0, 0]));
        dummy.scale.set(...(item.sc ?? [1, 1, 1]));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (item.c) mesh.setColorAt(index, item.c);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 });
    const openChance = [0, 0.012, 0.07, 0.3][Math.min(3, Math.floor(a.disturbed * 3.999))];
    const floorMess: { p: [number, number, number]; r: [number, number, number]; sc: [number, number, number]; c: THREE.Color }[] = [];

    // Drawer wall.
    if (drawers) {
      const small = a.stock === 'apothecary';
      const perBay = small ? 6 : 4, rows = small ? 11 : 8;
      const dw = (bayW - 0.06) / perBay, dh = (drawerTop - 0.14) / rows;
      const style = a.labels === 'none' ? null : a.labels;
      const paper = a.labels === 'hand' ? WOOD : a.labels === 'printed' ? '#efe8d2' : WOOD;
      const ink = a.labels === 'printed' ? '#1b1b1b' : a.wood === 'walnut' || a.wood === 'green' ? '#e8d9a8' : '#2a1c10';
      const variants = style ? Array.from({ length: 6 }, (_, i) => new THREE.MeshStandardMaterial({
        map: cardTexture(style === 'stencil' ? String(10 + Math.floor(random() * 89)) : (small ? HERBS : WORDS)[(i + Math.floor(random() * 4)) % (small ? HERBS : WORDS).length], style, paper, ink), roughness: 0.85,
      })) : [];
      const fronts: Parameters<typeof instanced>[2] = [], pulls: Parameters<typeof instanced>[2] = [];
      const cards: Parameters<typeof instanced>[2][] = variants.map(() => []);
      let forced = a.disturbed >= 0.25;
      for (let b = 0; b < bays; b++) for (let r = 0; r < rows; r++) for (let c = 0; c < perBay; c++) {
        const x = -W / 2 + 0.045 + b * (W - 0.045) / bays + 0.008 + dw * (c + 0.5);
        const y = 0.13 + dh * (r + 0.5);
        let out = random() < openChance ? mix(0.08, 0.3, random()) : mood.wear * random() * 0.012;
        if (forced && b === bays - 1 && r === Math.floor(rows * 0.55) && c === 1) { out = 0.22; forced = false; }
        const z = front + out;
        const tone = base.clone().multiplyScalar(mix(0.92, 1.12, random()));
        fronts.push({ p: [x, y, z], sc: [dw - 0.012, dh - 0.012, 1], c: tone });
        pulls.push({ p: [x, y - (style ? dh * 0.2 : 0), z + 0.016] });
        if (style) cards[Math.floor(random() * variants.length)].push({ p: [x, y + dh * 0.18, z + 0.0115], sc: [Math.min(dw * 0.72, 0.16), dh * 0.36, 1] });
        if (out > 0.05) {
          s.box([dw - 0.03, dh - 0.03, out], [x, y, front + out / 2 - 0.01], inner);
          if (a.disturbed > 0.7 && random() < 0.5) for (let k = 0; k < 4; k++) floorMess.push({ p: [x + (random() - 0.5) * 0.3, 0.012, front + 0.25 + random() * 0.5], r: [0, random() * 6, 0], sc: [0.05, 0.02, 0.03], c: new THREE.Color(small ? '#7a8f5a' : '#b9bec2') });
        }
      }
      instanced(new THREE.BoxGeometry(1, 1, 0.02), white, fronts);
      instanced(small ? new THREE.SphereGeometry(0.014, 8, 6) : new THREE.BoxGeometry(0.07, 0.022, 0.02), small ? s.material('#efe9d8', { roughness: 0.3 }) : brass, pulls);
      variants.forEach((material, index) => instanced(new THREE.PlaneGeometry(1, 1), material, cards[index]));
    }

    // Open shelves above (or all the way down).
    const shelfGap = a.stock === 'library' ? 0.33 : a.stock === 'archive' ? 0.38 : 0.36;
    const levels = Math.floor((H - drawerTop - 0.05) / shelfGap);
    const gap = (H - drawerTop - 0.02) / levels;
    const items: Parameters<typeof instanced>[2] = [], tags: Parameters<typeof instanced>[2] = [], jars: Parameters<typeof instanced>[2] = [], lids: Parameters<typeof instanced>[2] = [];
    const BOOKS = ['#7a2f2a', '#2f4a3a', '#243a5e', '#8a6a2f', '#4a2f4f', '#b9ac8c', '#30302f', '#a4502a'];
    for (let level = 0; level < levels; level++) {
      const y = drawerTop + 0.02 + level * gap;
      if (level > 0 || !drawers) s.box([W - 0.04, 0.025, D - 0.02], [0, y, 0.005], wood);
      if (!drawers && a.labels !== 'none') s.box([W - 0.05, 0.03, 0.004], [0, y + 0.002, front + 0.001], a.labels === 'printed' ? brass : edge);
      for (let b = 0; b < bays; b++) {
        const x0 = -W / 2 + 0.05 + b * (W - 0.045) / bays, x1 = x0 + bayW - 0.075;
        let x = x0;
        const emptyRun = a.disturbed > 0.3 && random() < a.disturbed * 0.5 ? x0 + random() * (x1 - x0) * 0.7 : Infinity;
        while (x < x1) {
          if (x > emptyRun && x < emptyRun + 0.25) { x += 0.25; continue; }
          if (a.stock === 'library') {
            const w = mix(0.025, 0.06, random()), h = mix(0.19, gap - 0.06, random()), d = mix(0.16, 0.22, random());
            if (x + w > x1) break;
            const lean = random() < a.disturbed * 0.18 ? mix(0.12, 0.3, random()) : 0;
            const colour = new THREE.Color(BOOKS[Math.floor(random() * BOOKS.length)]).lerp(new THREE.Color('#8a7a60'), mood.wear * 0.4);
            items.push({ p: [x + w / 2 + lean * h * 0.5, y + 0.0125 + h / 2, front - d / 2 - 0.02], r: [0, 0, -lean], sc: [w, h, d], c: colour });
            if (random() < 0.5) tags.push({ p: [x + w / 2 + lean * h * 0.5, y + 0.0125 + h * mix(0.6, 0.8, random()), front - 0.0195], sc: [w * 0.7, 0.03, 1], c: new THREE.Color(random() < 0.5 ? '#c9a14a' : '#e9dfc0') });
            x += w + lean * h + 0.002;
            if (random() < 0.03 + a.disturbed * 0.05) x += mix(0.03, 0.12, random());
          } else if (a.stock === 'archive') {
            const ledger = random() < 0.15;
            const w = ledger ? mix(0.05, 0.08, random()) : 0.13, h = ledger ? gap - 0.08 : gap - 0.1;
            if (x + w > x1) break;
            const pulled = random() < a.disturbed * 0.15 ? mix(0.05, 0.16, random()) : 0;
            items.push({ p: [x + w / 2, y + 0.0125 + h / 2, front - 0.17 + pulled], sc: [w - 0.008, h, 0.32], c: new THREE.Color(ledger ? ['#5a2a24', '#2f3f33', '#2a2f45'][Math.floor(random() * 3)] : ['#8f948e', '#a89f84', '#7f8a8c'][Math.floor(random() * 3)]) });
            if (!ledger) {
              tags.push({ p: [x + w / 2, y + h * 0.66, front - 0.0095 + pulled], sc: [w * 0.66, h * 0.3, 1], c: new THREE.Color(mood.wear > 0.6 ? '#d9cfae' : '#f2efe4') });
              tags.push({ p: [x + w / 2, y + h * 0.25, front - 0.0092 + pulled], sc: [0.03, 0.03, 1], c: new THREE.Color('#1c1c1c') });
            }
            x += w + 0.004;
          } else if (a.stock === 'apothecary') {
            const r = mix(0.045, 0.06, random()), h = mix(0.16, gap - 0.12, random());
            if (x + r * 2 > x1) break;
            jars.push({ p: [x + r, y + 0.0125 + h / 2, front - 0.1], sc: [r, h, r], c: new THREE.Color(['#8a4a16', '#6b3a12', '#3f5f4a', '#d8d2c0', '#2f4f6a'][Math.floor(random() * 5)]) });
            lids.push({ p: [x + r, y + 0.0125 + h + 0.015, front - 0.1], sc: [r * 0.75, 0.03, r * 0.75] });
            if (a.labels !== 'none') tags.push({ p: [x + r, y + h * 0.5, front - 0.1 + r + 0.001], sc: [r * 1.2, h * 0.35, 1], c: new THREE.Color('#efe8d2') });
            x += r * 2 + mix(0.012, 0.04, random());
          } else {
            const w = mix(0.1, 0.24, random()), h = mix(0.09, gap - 0.08, random());
            if (x + w > x1) break;
            const stack = h < gap * 0.4 && random() < 0.6 ? 2 : 1;
            for (let k = 0; k < stack; k++) {
              const colour = new THREE.Color(['#b98f5c', '#a67c4a', '#c9a56a', '#35506b', '#8a2f25', '#d9d2bd', '#3f5f4a'][Math.floor(random() * 7)]);
              items.push({ p: [x + w / 2, y + 0.0125 + h / 2 + k * h, front - 0.16 + (random() - 0.5) * 0.03], sc: [w - 0.01, h - 0.004, 0.28], c: colour });
              if (a.labels !== 'none') tags.push({ p: [x + w / 2, y + 0.0125 + h / 2 + k * h, front - 0.019 + 0.001], sc: [w * 0.55, h * 0.5, 1], c: new THREE.Color('#efe8d2') });
            }
            x += w + mix(0.008, 0.05, 1 - mood.density);
          }
        }
      }
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), white, items);
    instanced(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), tags);
    instanced(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }), jars);
    instanced(new THREE.CylinderGeometry(1, 1, 1, 10), s.material('#2a2422'), lids);
    // Things fallen to the floor when ransacked.
    if (a.disturbed > 0.7 && !drawers) for (let i = 0; i < 7; i++) {
      const book = a.stock === 'library';
      floorMess.push({ p: [mix(-W / 2, W / 2, random()), book ? 0.02 : 0.07, front + 0.2 + random() * 0.6], r: [0, random() * 6, 0], sc: book ? [0.16, 0.04, 0.22] : [0.13, 0.14, 0.3], c: new THREE.Color(book ? BOOKS[Math.floor(random() * BOOKS.length)] : '#a89f84') });
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), white, floorMess);

    // Rail on brackets.
    const railY = 2.42, railZ = front + 0.13;
    s.rod([-W / 2 + 0.02, railY, railZ], [W / 2 - 0.02, railY, railZ], 0.016, brass);
    for (let i = 0; i <= bays; i++) {
      const x = -W / 2 + 0.0225 + i * (W - 0.045) / bays;
      s.rod([x, railY - 0.05, front], [x, railY, railZ], 0.01, iron);
      s.ball([0.024, 0.024, 0.024], [x, railY, railZ], brass, 10);
    }

    // The ladder: a group that slides along x.
    const ladder = new THREE.Group();
    const lw = 0.42;
    const reach = Math.max(0, W / 2 - lw / 2 - 0.12);
    const lx = { left: -reach, centre: (random() - 0.5) * reach * 0.5, right: reach }[a.position];
    ladder.position.x = lx;
    s.root.add(ladder);
    const ladderWood = s.material(a.wood === 'walnut' ? '#6b4a2c' : a.wood === 'green' || a.wood === 'cream' ? '#a5804f' : base.clone().multiplyScalar(0.9));
    const footZ = front + 0.92, topExtra = 0.22;
    const dir = new THREE.Vector3(0, railY, railZ - footZ).normalize();
    const length = Math.hypot(railY, railZ - footZ);
    const tilt = Math.atan2(footZ - railZ, railY); // lean back toward the shelves
    const lmesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      ladder.add(mesh);
      return mesh;
    };
    const along = (t: number): [number, number] => [0.05 + (railY - 0.05) * t, footZ + (railZ - footZ) * t];
    for (const side of [-1, 1]) {
      const stile = lmesh(new THREE.BoxGeometry(0.035, length + topExtra, 0.075), ladderWood, side * lw / 2, (railY + dir.y * topExtra) / 2 + 0.03, (footZ + railZ + dir.z * topExtra) / 2);
      stile.rotation.x = -tilt;
      lmesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), iron, side * (lw / 2 + 0.035), 0.04, footZ + 0.01).rotation.z = Math.PI / 2;
      lmesh(new THREE.TorusGeometry(0.03, 0.008, 6, 14, Math.PI * 1.3), iron, side * lw / 2, railY + 0.012, railZ).rotation.set(0, Math.PI / 2, 0);
    }
    const rungs = 9;
    const rungAt: [number, number][] = [];
    for (let i = 0; i < rungs; i++) {
      const [y, z] = along((i + 0.7) / (rungs + 0.4));
      rungAt.push([y, z]);
      lmesh(new THREE.BoxGeometry(lw, 0.022, 0.085), ladderWood, 0, y, z);
    }
    let lampLight: THREE.Mesh | null = null;
    if (a.rung === 'box') {
      const [y, z] = rungAt[5];
      const box = lmesh(new THREE.BoxGeometry(0.3, 0.2, 0.24), s.material('#b98f5c', { roughness: 0.95 }), 0.03, y + 0.115, z + 0.03);
      box.rotation.set(mix(-0.02, 0.2, mood.energy), 0.3, mix(0, 0.18, mood.energy) * (random() < 0.5 ? -1 : 1));
      lmesh(new THREE.BoxGeometry(0.31, 0.03, 0.05), s.material('#d9cba6'), 0.03, y + 0.21, z + 0.03).rotation.copy(box.rotation);
    } else if (a.rung === 'books') {
      const [y, z] = rungAt[4];
      let top = y + 0.011;
      const n = 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const h = mix(0.03, 0.05, random());
        lmesh(new THREE.BoxGeometry(mix(0.16, 0.22, random()), h, 0.14), s.material(BOOKS[Math.floor(random() * BOOKS.length)]), (random() - 0.5) * 0.06, top + h / 2, z + 0.01).rotation.y = (random() - 0.5) * 0.5;
        top += h;
      }
    } else if (a.rung === 'bucket') {
      const [y, z] = rungAt[3];
      const pail = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.12, 0.22], [0.125, 0.22]].map(([x, yy]) => new THREE.Vector2(x, yy)), 20), s.material('#9aa3a6', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
      pail.position.set(lw / 2 + 0.15, y - 0.3, z);
      pail.castShadow = true;
      ladder.add(pail);
      lmesh(new THREE.TorusGeometry(0.125, 0.005, 5, 16, Math.PI), iron, lw / 2 + 0.15, y - 0.08, z);
      lmesh(new THREE.BoxGeometry(0.12, 0.012, 0.012), iron, lw / 2 + 0.07, y + 0.04, z);
      lmesh(new THREE.SphereGeometry(0.07, 8, 6), s.material(mood.cheer > 0.5 ? '#d8563a' : '#8f8a78', { roughness: 1 }), lw / 2 + 0.17, y - 0.09, z + 0.02).scale.set(1.2, 0.6, 1);
    } else if (a.rung === 'lamp') {
      const [y, z] = rungAt[rungs - 2];
      lmesh(new THREE.TorusGeometry(0.05, 0.004, 5, 14), iron, 0.08, y - 0.06, z + 0.045);
      lmesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 12), s.material('#b3261e', { metalness: 0.4 }), 0.08, y - 0.12, z + 0.045);
      lampLight = lmesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 12), new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb648', emissiveIntensity: 1.8, roughness: 0.3 }), 0.08, y - 0.2, z + 0.045);
      lmesh(new THREE.CylinderGeometry(0.06, 0.065, 0.06, 12), s.material('#b3261e', { metalness: 0.4 }), 0.08, y - 0.29, z + 0.045);
    }
    if (a.apron) {
      const [y, z] = rungAt[6];
      const cloth = s.material(mood.cheer > 0.5 ? '#3d6a8f' : mood.warmth > 0.5 ? '#8a6a48' : '#5f6a5c', { roughness: 1, side: THREE.DoubleSide });
      const drape = lmesh(new THREE.BoxGeometry(0.3, 0.62, 0.012), cloth, -0.03, y - 0.3, z + 0.085);
      drape.rotation.x = -tilt;
      drape.rotation.z = 0.05;
      lmesh(new THREE.BoxGeometry(0.3, 0.03, 0.11), cloth, -0.03, y + 0.02, z + 0.01);
      const backFall = lmesh(new THREE.BoxGeometry(0.26, 0.2, 0.012), cloth, -0.03, y - 0.09, z - 0.04);
      backFall.rotation.x = 0.05;
      lmesh(new THREE.BoxGeometry(0.14, 0.12, 0.008), s.material(mood.cheer > 0.5 ? '#2f5676' : '#4f584c', { roughness: 1 }), -0.03, y - 0.42, z + 0.155).rotation.x = -tilt;
    }

    const roll = mix(0, 0.06, Math.max(0, mood.energy - 0.4)) * Math.min(1, reach * 10);
    return s.finish({
      footprint: W / 2 + 0.1,
      update: (_dt, time) => {
        if (roll) ladder.position.x = lx + Math.sin(time * 0.8) * roll;
        if (lampLight) (lampLight.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(time * 9) * 0.25 * mood.energy;
      },
    });
  },
});
