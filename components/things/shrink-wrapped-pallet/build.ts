import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Item { shape: 'box' | 'tin' | 'sack'; size: P3; at: P3; turn: number; colour: string }

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    contents: choice('What is stacked on the pallet?', {
      cartons: 'Plain brown cardboard cartons, all the same size.',
      retail: 'Bright printed retail cases in brand colours, cereal or detergent.',
      water: 'Shrink packs of bottled water, pale blue, with card sheets between the layers.',
      tins: 'White paint buckets with coloured lids.',
      sacks: 'Heavy paper sacks of flour, feed or cement.',
      mixed: 'A jumble of odd parcels in every size, a mixed consignment.',
    }),
    height: score('How tall is the stack?', ['A couple of layers, knee high', 'Waist high', 'Shoulder high', 'Towering above head height']),
    lean: score('How well is it stacked?', ['Perfectly square', 'A little shuffled', 'Visibly leaning', 'About to topple']),
    wrap: choice('How is it wrapped?', {
      tight: 'Freshly wound in tight clear film, glossy and complete.',
      torn: 'The film is ripped open on one side, shreds hanging loose.',
      half: 'Cut open and peeled halfway down, the top layers bare.',
      black: 'Opaque black security film hiding everything inside.',
      banded: 'No film at all, only two plastic straps holding it together.',
    }),
    sticker: choice('What sticker is slapped on the front?', {
      none: 'No sticker, only the shipping label.',
      fragile: 'A red and white FRAGILE sticker.',
      returned: 'A stamped RETURN TO SENDER notice.',
      up: 'THIS WAY UP arrows.',
      hold: 'A yellow QA HOLD tag: do not ship.',
      heavy: 'An orange HEAVY warning.',
    }),
    story: choice('What has happened to it?', {
      waiting: 'Nothing yet: it is simply waiting to be collected.',
      spiked: 'A forklift has spiked it: two ragged holes punched low in the front.',
      raided: 'Someone has slit it and lifted a box out, left open on the floor beside it.',
      leaking: 'Something inside has burst: a dark stain runs down the front into a puddle.',
      forgotten: 'Long forgotten, with a handwritten DO NOT MOVE note taped on.',
    }),
    corners: noul('Is it strapped with cardboard corner boards?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material('#c49a62', { roughness: 0.9 });
    const woodDark = s.material('#a67c48', { roughness: 0.9 });
    const L = 1.2, W = 1.0, base = 0.144;
    for (const z of [-W / 2 + 0.05, 0, W / 2 - 0.05]) {
      s.box([L, 0.022, 0.1], [0, 0.011, z], woodDark);
      for (const x of [-L / 2 + 0.0725, 0, L / 2 - 0.0725]) s.box([0.145, 0.078, 0.1], [x, 0.061, z], wood);
    }
    for (const x of [-L / 2 + 0.0725, 0, L / 2 - 0.0725]) s.box([0.145, 0.022, W], [x, 0.111, 0], woodDark);
    for (let i = 0; i < 6; i++) s.box([L, 0.022, 0.125], [0, 0.133, -W / 2 + 0.0625 + i * (W - 0.125) / 5], wood);

    // The stack leans as one, so it lives in a sheared group.
    const stack = new THREE.Group();
    const leanAngle = (random() < 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.9;
    const shear = a.lean ** 1.5 * 0.3;
    stack.matrixAutoUpdate = false;
    stack.matrix.set(1, Math.cos(leanAngle) * shear, 0, 0, 0, 1, 0, 0, 0, Math.sin(leanAngle) * shear * 0.6, 1, 0, 0, 0, 0, 1);
    stack.matrix.multiply(new THREE.Matrix4().makeTranslation(0, base, 0));
    s.root.add(stack);

    const target = mix(0.5, 1.9, a.height);
    const mess = 0.008 + a.lean * 0.035;
    const j = () => (random() - 0.5) * 2 * mess;
    const items: Item[] = [];
    const SW = 1.16, SD = 0.96;
    let H = 0;
    const grid = (nx: number, nz: number, h: number, colour: (layer: number, i: number) => string, shape: Item['shape'] = 'box', gap = 0.008) => {
      const layers = Math.max(2, Math.round(target / h));
      const w = SW / nx, d = SD / nz;
      for (let layer = 0; layer < layers; layer++)
        for (let ix = 0; ix < nx; ix++)
          for (let iz = 0; iz < nz; iz++)
            items.push({ shape, size: [w - gap, h - 0.004, d - gap], at: [-SW / 2 + w * (ix + 0.5) + j(), h * (layer + 0.5), -SD / 2 + d * (iz + 0.5) + j()], turn: j() * 2, colour: colour(layer, ix * nz + iz) });
      H = layers * h;
    };
    const browns = ['#b98a55', '#c79a63', '#ad8250', '#bf9460'];
    const brands = [['#d8322c', '#f2c230'], ['#1f6fc2', '#f4f4f0'], ['#2e9a57', '#f1e7c8'], ['#e2671c', '#3a2a7a'], ['#c22a78', '#f6d7e6']][Math.floor(random() * 5)];
    if (a.contents === 'cartons') grid(3, 2, 0.3, () => browns[Math.floor(random() * browns.length)]);
    else if (a.contents === 'retail') grid(4, 3, 0.25, (layer) => (mood.cheer < 0.25 ? ['#8f8a7c', '#b5b0a2'] : brands)[layer % 2]);
    else if (a.contents === 'water') grid(3, 2, 0.32, () => '#8cc4ea');
    else if (a.contents === 'tins') grid(4, 3, 0.31, () => '#f1f0ea', 'tin');
    else if (a.contents === 'sacks') grid(2, 3, 0.14, () => '#c9ab78', 'sack', -0.03);
    else {
      const parcel = ['#b98a55', '#c79a63', '#e9e6dc', '#2c2f33', '#3f6fa8', '#ad8250', '#d7c9a2'];
      for (let ix = 0; ix < 3; ix++)
        for (let iz = 0; iz < 2; iz++) {
          let y = 0;
          const limit = target * (0.7 + random() * 0.4);
          while (y < limit) {
            const h = 0.14 + random() * 0.32;
            const w = 0.22 + random() * 0.16, d = 0.26 + random() * 0.2;
            items.push({ shape: 'box', size: [w, h, d], at: [-SW / 2 + (ix + 0.5) * SW / 3 + j() * 2, y + h / 2, -SD / 2 + (iz + 0.5) * SD / 2 + j() * 2], turn: (random() - 0.5) * 0.5, colour: parcel[Math.floor(random() * parcel.length)] });
            y += h;
          }
          H = Math.max(H, y);
        }
    }

    // A box taken out, or tumbled off a bad stack, lands on the floor.
    const loose: Item[] = [];
    const takeTop = () => {
      let best = -1, value = -Infinity;
      items.forEach((item, index) => {
        const v = item.at[1] * 3 + item.at[2] + item.at[0] * 0.5;
        if (v > value) { value = v; best = index; }
      });
      return best < 0 ? null : items.splice(best, 1)[0];
    };
    if (a.story === 'raided') { const taken = takeTop(); if (taken) loose.push(taken); }
    if (a.lean > 0.85 && a.wrap !== 'tight' && a.wrap !== 'black') { const fallen = takeTop(); if (fallen) loose.push(fallen); }

    const cardboard = paint(128, 128, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = 'rgba(40,25,10,0.5)'; c.lineWidth = 5; c.strokeRect(0, 0, 128, 128);
      if (a.contents === 'retail') {
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(64, 60, 40, 26, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(34, 54, 60, 12); c.fillRect(20, 104, 88, 6);
      } else if (a.contents === 'water') {
        c.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(16 + i * 32, 22, 11, 16, 0, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(20,60,150,0.7)'; c.fillRect(0, 52, 128, 30);
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(0, 62, 128, 5);
      } else {
        c.fillStyle = 'rgba(245,225,170,0.75)'; c.fillRect(0, 54, 128, 18);
        c.fillStyle = 'rgba(30,20,10,0.5)'; c.fillRect(84, 88, 30, 22);
      }
    });
    const place = (list: Item[], parent: THREE.Object3D) => {
      const dummy = new THREE.Object3D();
      const make = (shape: Item['shape'], geometry: THREE.BufferGeometry, material: THREE.Material, resize: (i: Item) => P3 = (i) => i.size, lift = 0, tint?: (i: Item) => string) => {
        const group = list.filter((item) => item.shape === shape);
        if (!group.length) { geometry.dispose(); material.dispose(); return; }
        const mesh = new THREE.InstancedMesh(geometry, material, group.length);
        group.forEach((item, index) => {
          dummy.position.set(item.at[0], item.at[1] + lift * item.size[1], item.at[2]);
          dummy.rotation.set(0, item.turn, 0);
          dummy.scale.set(...resize(item));
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
          mesh.setColorAt(index, new THREE.Color(tint ? tint(item) : item.colour));
        });
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
      };
      make('box', new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: cardboard, roughness: 0.85 }));
      make('tin', new THREE.CylinderGeometry(0.47, 0.42, 1, 20), new THREE.MeshStandardMaterial({ roughness: 0.4 }), (i) => [i.size[0], i.size[1] * 0.92, i.size[0]]);
      const lids = ['#d8322c', '#1f6fc2', '#2e9a57', '#f2c230', '#f1f0ea'];
      make('tin', new THREE.CylinderGeometry(0.49, 0.49, 1, 20), new THREE.MeshStandardMaterial({ roughness: 0.4 }), (i) => [i.size[0], i.size[1] * 0.1, i.size[0]], 0.45, () => lids[Math.floor(random() * (mood.cheer > 0.4 ? 4 : 2))]);
      make('sack', new THREE.SphereGeometry(0.5, 16, 10), new THREE.MeshStandardMaterial({ roughness: 0.95 }), (i) => [i.size[0], i.size[1] * 1.25, i.size[2]]);
      make('sack', new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.95 }), (i) => [i.size[0] * 0.3, i.size[1] * 1.28, i.size[2] * 1.01], 0, () => (mood.cheer > 0.5 ? '#c8452f' : '#3b6ea5'));
    };
    place(items, stack);
    if (a.contents === 'water') {
      const layers = Math.round(H / 0.32);
      for (let i = 1; i < layers; i++) {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.03, 0.008, SD + 0.03), woodDark);
        sheet.position.y = i * 0.32;
        stack.add(sheet);
      }
    }

    // Loose boxes on the floor.
    loose.forEach((item, index) => {
      const side = index === 0 ? 1 : -1;
      item.at = [side * (L / 2 + 0.25 + random() * 0.15), item.size[item.shape === 'tin' ? 0 : 1] / 2, W / 2 - 0.1 + random() * 0.3];
      item.turn = random() * 3;
    });
    if (loose.length) {
      const floor = new THREE.Group();
      s.root.add(floor);
      place(loose, floor);
      if (a.story === 'raided' && loose[0].shape === 'box') {
        const item = loose[0];
        for (const side of [-1, 1]) {
          const flap = s.box([item.size[0] * 0.5, 0.008, item.size[2]], [item.at[0], item.at[1] * 2 + 0.05, item.at[2]], s.material('#b98a55', { roughness: 0.9 }));
          flap.rotation.y = item.turn;
          flap.translateX(side * item.size[0] * 0.62);
          flap.rotation.z = side * 0.9;
        }
      }
    }

    // Film.
    const fw = SW + 0.04, fd = SD + 0.04;
    const black = a.wrap === 'black';
    const filmTexture = paint(256, 256, (c) => {
      c.clearRect(0, 0, 256, 256);
      c.fillStyle = black ? '#17191c' : 'rgba(226,240,246,0.3)';
      c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) {
        const y = random() * 256, slope = (random() - 0.5) * 26;
        c.strokeStyle = black ? `rgba(120,128,136,${0.08 + random() * 0.2})` : `rgba(255,255,255,${0.25 + random() * 0.45})`;
        c.lineWidth = 1 + random() * 6;
        c.beginPath(); c.moveTo(0, y); c.lineTo(256, y + slope); c.stroke();
      }
      for (let i = 0; i < 5; i++) {
        c.fillStyle = black ? 'rgba(170,180,190,0.16)' : 'rgba(255,255,255,0.4)';
        c.fillRect(random() * 240, 0, 3 + random() * 10, 256);
      }
    });
    const film = new THREE.MeshStandardMaterial({ map: filmTexture, transparent: !black, roughness: black ? 0.25 : 0.08, metalness: black ? 0.2 : 0, side: THREE.DoubleSide, depthWrite: black });
    const bottom = -0.07;
    const sheet = (w: number, h: number, at: P3, turnY: number, material: THREE.Material = film) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
      mesh.position.set(...at);
      mesh.rotation.y = turnY;
      mesh.castShadow = black;
      stack.add(mesh);
      return mesh;
    };
    const tornSide = Math.floor(random() * 2);
    if (a.wrap !== 'banded') {
      const topY = a.wrap === 'half' ? H * mix(0.35, 0.55, random()) : H + 0.012;
      const sides: [number, number, number, number][] = [[fw, 0, fd / 2, 0], [fd, fw / 2, 0, Math.PI / 2], [fw, 0, -fd / 2, Math.PI], [fd, -fw / 2, 0, -Math.PI / 2]];
      sides.forEach(([w, x, z, turn], index) => {
        const from = a.wrap === 'torn' && index === tornSide ? H * 0.55 : bottom;
        sheet(w, topY - from, [x, (topY + from) / 2, z], turn);
        if (a.wrap === 'torn' && index === tornSide)
          for (let i = 0; i < 5; i++) {
            const len = 0.2 + random() * 0.5;
            const strip = sheet(0.05 + random() * 0.1, len, [x + (index === 0 ? (random() - 0.5) * w * 0.9 : 0.03), from - len / 2, z + (index === 1 ? (random() - 0.5) * w * 0.9 : 0.03)], turn);
            strip.rotation.z = (random() - 0.5) * 0.5;
            strip.rotation.x = (random() - 0.5) * 0.4;
          }
      });
      if (a.wrap === 'half') {
        const roll = new THREE.MeshStandardMaterial({ color: '#eef5f7', transparent: true, opacity: 0.8, roughness: 0.2 });
        for (const [w, x, z, turn] of sides) {
          const bunch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, w + 0.04, 8), roll);
          bunch.position.set(x, topY - 0.02 + (random() - 0.5) * 0.05, z);
          bunch.rotation.set(0, turn, Math.PI / 2 + (random() - 0.5) * 0.1);
          stack.add(bunch);
        }
      } else {
        const lid = sheet(fw, fd, [0, topY, 0], 0);
        lid.rotation.x = -Math.PI / 2;
      }
      // The tail of the film, twisted and stuck down at a corner.
      const tail = new THREE.MeshStandardMaterial({ color: black ? '#17191c' : '#f2f7f8', roughness: 0.2, transparent: !black, opacity: black ? 1 : 0.85 });
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(fw / 2 + 0.005, 0.5, fd / 2 - 0.1), new THREE.Vector3(fw / 2 + 0.02, 0.3, fd / 2 - 0.03), new THREE.Vector3(fw / 2 + 0.03, 0.12, fd / 2 + 0.03), new THREE.Vector3(fw / 2 + 0.09, 0.02, fd / 2 + 0.1)]);
      const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.014, 6), tail);
      if (H > 0.6) stack.add(tailMesh); else { tailMesh.geometry.dispose(); tail.dispose(); }
    } else {
      const strap = s.material('#1d2024', { roughness: 0.5 });
      for (const x of [-0.25, 0.25]) {
        for (const z of [-1, 1]) stack.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, H + 0.01, 0.004), strap).translateX(x).translateY(H / 2).translateZ(z * (SD / 2 + 0.012)));
        stack.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, SD + 0.02), strap).translateX(x).translateY(H + 0.006));
      }
    }
    if (a.corners) {
      const card = s.material('#c9a976', { roughness: 0.9 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, H + 0.02, 0.07), card);
        post.position.set(x * (fw / 2 - 0.02), H / 2, z * (fd / 2 - 0.02));
        post.castShadow = true;
        stack.add(post);
      }
      const band = s.material('#e8e3d2', { roughness: 0.5 });
      for (const y of [0.3, 0.7]) {
        const hoop = new THREE.Mesh(new THREE.BoxGeometry(fw + 0.036, 0.022, fd + 0.036), band);
        hoop.position.y = H * y;
        stack.add(hoop);
      }
    }

    // Paperwork and stickers on the front face.
    const decal = (w: number, h: number, at: P3, draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void, turnY = 0, tilt = 0, clear = false) => {
      const cw = 256, ch = Math.round(256 * h / w);
      const material = new THREE.MeshStandardMaterial({ map: paint(cw, ch, (c) => draw(c, cw, ch)), roughness: 0.7, transparent: clear, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = sheet(w, h, at, turnY, material);
      mesh.rotation.z = tilt;
      mesh.castShadow = false;
      return mesh;
    };
    const fz = fd / 2 + 0.006;
    const labelY = Math.max(0.2, H - 0.24);
    const shipping = (c: CanvasRenderingContext2D, cw: number, ch: number) => {
      c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#111'; c.fillRect(8, 8, cw - 16, 30);
      c.fillStyle = '#fbfaf5'; c.font = 'bold 22px monospace'; c.fillText('SHIP TO', 16, 31);
      c.fillStyle = '#333';
      for (let i = 0; i < 4; i++) c.fillRect(14, 52 + i * 18, 90 + random() * 110, 7);
      let x = 14;
      while (x < cw - 20) { const w = 2 + Math.floor(random() * 6); c.fillRect(x, ch - 70, w, 54); x += w + 2 + Math.floor(random() * 4); }
    };
    decal(0.3, 0.21, [SW / 2 - 0.24, labelY, fz], shipping, 0, (random() - 0.5) * 0.08);
    decal(0.3, 0.21, [fw / 2 + 0.006, labelY - 0.05, 0.1], shipping, Math.PI / 2, (random() - 0.5) * 0.08);
    if (a.sticker !== 'none') {
      const big = Math.min(0.5, H * 0.6);
      const at: P3 = [-SW / 2 + 0.32, Math.max(big * 0.4, H * 0.5), fz + 0.002];
      const tilt = (random() - 0.5) * (a.sticker === 'returned' ? 0.5 : 0.14);
      const text = (c: CanvasRenderingContext2D, lines: string[], ink: string, cw: number, ch: number, size = 46) => {
        c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${size}px sans-serif`;
        lines.forEach((line, i) => c.fillText(line, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.1, cw - 24));
      };
      if (a.sticker === 'fragile') decal(big, big * 0.6, at, (c, cw, ch) => { c.fillStyle = '#d3261f'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#fff'; c.fillRect(10, 10, cw - 20, ch - 20); text(c, ['FRAGILE'], '#d3261f', cw, ch, 52); c.fillRect(30, ch - 34, cw - 60, 8); }, 0, tilt);
      else if (a.sticker === 'returned') decal(big, big * 0.6, at, (c, cw, ch) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#b3201a'; c.lineWidth = 10; c.strokeRect(12, 12, cw - 24, ch - 24); text(c, ['RETURN', 'TO SENDER'], '#b3201a', cw, ch, 42); }, 0, tilt);
      else if (a.sticker === 'up') decal(big * 0.75, big * 0.75, at, (c, cw, ch) => {
        c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#16181a';
        for (const x of [cw * 0.3, cw * 0.7]) { c.beginPath(); c.moveTo(x, 24); c.lineTo(x + 44, 96); c.lineTo(x + 16, 96); c.lineTo(x + 16, 190); c.lineTo(x - 16, 190); c.lineTo(x - 16, 96); c.lineTo(x - 44, 96); c.fill(); }
        c.fillRect(24, 204, cw - 48, 14); text(c, ['THIS WAY UP'], '#16181a', cw, ch * 2 - 26, 24);
      }, 0, tilt);
      else if (a.sticker === 'hold') decal(big, big * 0.6, at, (c, cw, ch) => { c.fillStyle = '#f5cf1d'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#16181a'; for (let x = -ch; x < cw; x += 44) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 22, 0); c.lineTo(x + 22 + 26, 26); c.lineTo(x + 26, 26); c.fill(); } text(c, ['QA HOLD', 'DO NOT SHIP'], '#16181a', cw, ch + 26, 38); }, 0, tilt);
      else decal(big, big * 0.6, at, (c, cw, ch) => { c.fillStyle = '#ee7a1b'; c.fillRect(0, 0, cw, ch); text(c, ['HEAVY', '38 kg'], '#16181a', cw, ch, 50); }, 0, tilt);
    }
    if (a.story === 'spiked') {
      decal(0.9, 0.3, [0, 0.2, fz + 0.004], (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch);
        for (const x of [cw * 0.27, cw * 0.73]) {
          c.fillStyle = '#0d0b09'; c.beginPath();
          for (let i = 0; i < 14; i++) { const t = i / 14 * Math.PI * 2, r = 0.6 + random() * 0.5; c.lineTo(x + Math.cos(t) * 30 * r, ch / 2 + Math.sin(t) * 20 * r); }
          c.fill();
          c.strokeStyle = '#6b4d2c'; c.lineWidth = 3;
          for (let i = 0; i < 7; i++) { const t = random() * 7; c.beginPath(); c.moveTo(x + Math.cos(t) * 20, ch / 2 + Math.sin(t) * 14); c.lineTo(x + Math.cos(t) * 46, ch / 2 + Math.sin(t) * 32); c.stroke(); }
        }
      }, 0, 0, true);
      for (const x of [-0.21, 0.21]) s.box([0.1, 0.02, 0.14], [x + random() * 0.05, 0.01, W / 2 + 0.12 + random() * 0.1], s.material('#b98a55', { roughness: 0.9 })).rotation.y = random() * 3;
    } else if (a.story === 'leaking') {
      const tone = a.contents === 'tins' ? ['#d8322c', '#1f6fc2', '#2e9a57', '#f1f0ea'][Math.floor(random() * 4)] : a.contents === 'water' ? '#5d7f96' : '#3a2a1c';
      const wide = 0.3 + random() * 0.2, x0 = (random() - 0.5) * 0.4, y0 = H * mix(0.5, 0.85, random());
      decal(wide, y0 + 0.07, [x0, (y0 - 0.07) / 2, fz + 0.004], (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch); c.fillStyle = tone; c.globalAlpha = 0.88;
        for (let i = 0; i < 6; i++) { const x = 20 + random() * (cw - 60), w = 10 + random() * 34; c.beginPath(); c.moveTo(x, random() * ch * 0.4); c.lineTo(x + w, random() * ch * 0.3); c.lineTo(x + w * 0.8, ch); c.lineTo(x + w * 0.2, ch); c.fill(); }
      }, 0, 0, true);
      const pool = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.1 });
      for (let i = 0; i < 3; i++) s.cylinder(0.12 + random() * 0.12, 0.12, 0.004, [x0 + (random() - 0.5) * 0.3, 0.002 + i * 0.0006, W / 2 + 0.08 + random() * 0.14], pool, 20).scale.z = 0.7;
    } else if (a.story === 'forgotten') {
      decal(0.36, 0.26, [-SW / 2 + 0.3, Math.min(H - 0.15, H * 0.5 + 0.38), fz + 0.004], (c, cw, ch) => {
        c.fillStyle = '#f3ecd6'; c.fillRect(0, 0, cw, ch);
        c.fillStyle = '#23325e'; c.textAlign = 'center'; c.font = 'italic bold 44px cursive';
        c.fillText('DO NOT', cw / 2, 62); c.fillText('MOVE', cw / 2, 112);
        c.font = 'italic 26px cursive'; c.fillText('- Keith', cw * 0.68, 158);
        c.fillStyle = 'rgba(210,190,140,0.9)'; c.fillRect(cw / 2 - 30, 0, 60, 16);
      }, 0, (random() - 0.5) * 0.25);
    } else if (a.story === 'raided' && a.wrap !== 'banded') {
      decal(0.07, Math.min(0.5, H * 0.5), [SW / 2 - 0.5, H - Math.min(0.5, H * 0.5) / 2, fz + 0.004], (c, cw, ch) => { c.clearRect(0, 0, cw, ch); c.fillStyle = '#0d0b09'; c.beginPath(); c.moveTo(cw / 2, 0); c.lineTo(cw * 0.9, ch * 0.4); c.lineTo(cw / 2, ch); c.lineTo(cw * 0.1, ch * 0.5); c.fill(); }, 0, 0.1, true);
    }

    s.root.rotation.y = 0.3 + (random() - 0.5) * 0.3;
    return s.finish();
  },
});
