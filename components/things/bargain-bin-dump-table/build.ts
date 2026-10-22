import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PRICES = {
  dollar: ['$1', 'EACH'], three: ['3 FOR', '$5'], fifty: ['50¢', 'ANY TAPE'], free: ['FREE', 'HELP YOURSELF'], two: ['$2', 'OR LESS'], offer: ['MAKE AN', 'OFFER'], last: ['LAST', 'CHANCE'],
} as const;
const BRIGHTS = ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#f4f1ea', '#ff8a2a', '#b45ad6', '#23283a', '#ff6fae', '#1f8f98'];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    container: choice('What is the stock dumped in?', {
      wire: 'A square wire dump bin on castors, the supermarket kind.',
      trestle: 'A folding trestle table with shallow cardboard trays on it.',
      dumpbin: 'A printed corrugated-card dump bin with a header card, a promotion long over.',
      boxes: 'Open cardboard boxes straight on the floor, flaps up.',
    }),
    stock: choice('What is mostly in it?', {
      tapes: 'VHS tapes, in sleeves and bare black cassettes.',
      discs: 'DVD cases and loose shiny discs.',
      mixed: 'Everything together: tapes, discs, cases.',
      dregs: 'The dregs: loose discs, bare cassettes and rolled posters.',
    }),
    ransacked: score('How ransacked is it?', ['Heaped high, just tipped out', 'Well rummaged', 'Half gone', 'A scatter across the bottom', 'The last one or two']),
    price: choice('What does the price sign say?', {
      dollar: '$1 EACH.', three: '3 FOR $5.', fifty: '50¢ ANY TAPE.', free: 'FREE, HELP YOURSELF.', two: '$2 OR LESS.', offer: 'MAKE AN OFFER.', last: 'LAST CHANCE.',
    }),
    sign: choice('How is the price sign made?', {
      star: 'A fluorescent starburst card on a stick.',
      marker: 'Marker pen on a torn flap of brown cardboard.',
      printed: 'A printed red-and-white sale card in a metal holder.',
    }),
    posters: noul('Are there rolled posters standing in it?'),
    spilled: noul('Have things spilled onto the floor around it?'),
    relic: choice('What lies on top, left by the last rummager?', {
      nothing: 'Nothing in particular.',
      hometape: 'A bare cassette with a handwritten label: somebody’s home recording.',
      emptycase: 'A case lying open and empty, the disc gone.',
      basket: 'A plastic hand basket with a few picks abandoned in it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const card = s.material('#b58d5a', { roughness: 0.95 });
    const cardDark = s.material('#96713f', { roughness: 0.95 });
    const steel = s.material('#c3c8ca', { metalness: 0.7, roughness: 0.35 });
    const fill = Math.max(0, 1 - a.ransacked);
    interface Region { g: THREE.Matrix4; w: number; d: number; base: number; rim: number; share: number }
    const regions: Region[] = [];
    const at = (x: number, y: number, z: number, turn = 0) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(turn));

    const openBox = (x: number, z: number, w: number, d: number, y: number, h: number, material: THREE.Material, turn = 0, flaps = false) => {
      const group = new THREE.Group();
      group.position.set(x, y, z); group.rotation.y = turn;
      s.root.add(group);
      const t = 0.008;
      group.add(s.box([w, t, d], [0, t / 2, 0], material));
      for (const side of [-1, 1]) {
        group.add(s.box([w, h, t], [0, h / 2, side * (d / 2 - t / 2)], material));
        group.add(s.box([t, h, d], [side * (w / 2 - t / 2), h / 2, 0], material));
        if (flaps) {
          const long = s.box([w, t, d * 0.42], [0, h, side * (d / 2)], material);
          const open = 0.5 + random() * 1.3;
          long.geometry.translate(0, 0, side * d * 0.21);
          long.rotation.x = side * open;
          group.add(long);
          const short = s.box([w * 0.3, t, d], [side * (w / 2), h, 0], material);
          short.geometry.translate(side * w * 0.15, 0, 0);
          short.rotation.z = -side * (0.6 + random() * 1.2);
          group.add(short);
        }
      }
      return at(x, y, z, turn);
    };

    let signAt: [number, number, number] = [0, 0.86, -0.45];
    let reach = 0.75;
    if (a.container === 'wire') {
      const wire = s.material('#d9dde0', { metalness: 0.8, roughness: 0.3 });
      const rods: THREE.Matrix4[] = [];
      const rod = (from: [number, number, number], to: [number, number, number], radius: number) => {
        const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), dir = q.clone().sub(p), len = dir.length();
        rods.push(new THREE.Matrix4().compose(p.add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), new THREE.Vector3(radius, len, radius)));
      };
      const half = 0.45, lower = 0.4, y0 = 0.5, y1 = 0.88;
      for (let i = 0; i <= 12; i++) {
        const f = i / 12 * 2 - 1;
        for (const side of [-1, 1]) {
          rod([f * lower, y0, side * lower], [f * half, y1, side * half], 0.004);
          rod([side * lower, y0, f * lower], [side * half, y1, f * half], 0.004);
        }
        rod([f * lower, y0, -lower], [f * lower, y0, lower], 0.004);
        if (i % 2 === 0) rod([-lower, y0, f * lower], [lower, y0, f * lower], 0.004);
      }
      for (const [y, h, r] of [[y1, half, 0.009], [(y0 + y1) / 2, (lower + half) / 2, 0.005], [y0, lower, 0.007]] as const) {
        rod([-h, y, -h], [h, y, -h], r); rod([-h, y, h], [h, y, h], r); rod([-h, y, -h], [-h, y, h], r); rod([h, y, -h], [h, y, h], r);
      }
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), wire, rods.length);
      rods.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true; s.root.add(mesh);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * lower, y0, z * lower], [x * 0.36, 0.08, z * 0.36], 0.012, wire);
        s.cylinder(0.035, 0.035, 0.025, [x * 0.36, 0.035, z * 0.36], s.material('#2a2c2e'), 12).rotation.z = Math.PI / 2;
      }
      s.rod([-0.36, 0.2, -0.36], [0.36, 0.2, -0.36], 0.008, wire); s.rod([-0.36, 0.2, 0.36], [0.36, 0.2, 0.36], 0.008, wire);
      regions.push({ g: at(0, 0, 0), w: 0.78, d: 0.78, base: y0 + 0.006, rim: y1, share: 1 });
      signAt = [0.3, y1, -0.45];
    } else if (a.container === 'trestle') {
      const top = s.material('#d8d2c2');
      s.box([1.6, 0.03, 0.72], [0, 0.745, 0], top);
      s.box([1.6, 0.012, 0.74], [0, 0.726, 0], s.material('#8a8d90', { metalness: 0.5 }));
      for (const x of [-0.6, 0.6]) {
        for (const z of [-1, 1]) s.rod([x, 0.72, z * 0.06], [x, 0, z * 0.32], 0.014, steel);
        s.rod([x, 0.3, -0.2], [x, 0.3, 0.2], 0.008, steel);
      }
      s.rod([-0.6, 0.3, 0], [0.6, 0.3, 0], 0.008, steel);
      const turnA = (random() - 0.5) * 0.2, turnB = (random() - 0.5) * 0.2;
      regions.push({ g: openBox(-0.4, 0, 0.66, 0.56, 0.76, 0.14, card, turnA), w: 0.62, d: 0.52, base: 0.01, rim: 0.14, share: 0.55 });
      regions.push({ g: openBox(0.4, 0.02, 0.62, 0.5, 0.76, 0.11, cardDark, turnB), w: 0.58, d: 0.46, base: 0.01, rim: 0.11, share: 0.45 });
      signAt = [0, 0.76, -0.33]; reach = 1.0;
    } else if (a.container === 'dumpbin') {
      const hue = ['#d3312b', '#2456a6', '#f08a1c', '#7a35c2'][Math.floor(random() * 4)];
      const print = paint(256, 320, (c) => {
        c.fillStyle = hue; c.fillRect(0, 0, 256, 320);
        c.fillStyle = 'rgba(255,255,255,0.16)';
        for (let i = -6; i < 10; i++) { c.beginPath(); c.moveTo(i * 50, 0); c.lineTo(i * 50 + 26, 0); c.lineTo(i * 50 + 186, 320); c.lineTo(i * 50 + 160, 320); c.fill(); }
        c.fillStyle = '#ffe24a'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 60px Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
        c.fillText('MOVIE', 128, 110, 220); c.fillText('MADNESS', 128, 180, 220);
        const fade = c.createLinearGradient(0, 0, 0, 320);
        fade.addColorStop(0, `rgba(220,214,200,${mood.wear * 0.45})`); fade.addColorStop(1, `rgba(120,100,70,${mood.wear * 0.5})`);
        c.fillStyle = fade; c.fillRect(0, 0, 256, 320);
      });
      const printed = new THREE.MeshStandardMaterial({ map: print, roughness: 0.8 });
      const side = s.material(hue, { roughness: 0.85 });
      s.box([0.62, 0.74, 0.5], [0, 0.37, 0], [side, side, card, card, printed, side] as unknown as THREE.Material);
      const tray = openBox(0, 0, 0.66, 0.54, 0.74, 0.13, side);
      const headerMap = paint(256, 180, (c) => {
        c.fillStyle = '#ffe24a'; c.fillRect(0, 0, 256, 180);
        c.fillStyle = hue; c.fillRect(0, 0, 256, 34); c.fillRect(0, 150, 256, 30);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 64px Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
        c.fillText('BARGAINS', 128, 94, 236);
      });
      const header = s.box([0.66, 0.42, 0.008], [0, 1.07, -0.27], [card, card, card, card, new THREE.MeshStandardMaterial({ map: headerMap, roughness: 0.8 }), card] as unknown as THREE.Material);
      header.rotation.x = -0.06 - mood.wear * 0.2;
      regions.push({ g: tray, w: 0.62, d: 0.5, base: 0.01, rim: 0.13, share: 1 });
      signAt = [0.56, 0.5, -0.1]; reach = 0.6;
    } else {
      const sizes: [number, number, number, number, number][] = [[-0.36, 0.05, 0.6, 0.46, 0.34], [0.34, -0.1, 0.5, 0.4, 0.28], [0.22, 0.42, 0.42, 0.34, 0.2]];
      sizes.forEach(([x, z, w, d, h], index) => {
        const g = openBox(x, z, w, d, 0, h, index === 1 ? cardDark : card, (random() - 0.5) * 0.5, true);
        regions.push({ g, w: w - 0.04, d: d - 0.04, base: 0.012, rim: h, share: [0.45, 0.33, 0.22][index] });
      });
      signAt = [-0.36, 0.34, -0.2]; reach = 0.95;
    }

    // The heap. Only the top of it is ever seen, so pieces are thrown into a mound and left overlapping.
    type Kind = 'cassette' | 'sleeve' | 'dvd' | 'disc';
    const mixOf: Record<typeof a.stock, [Kind, number][]> = {
      tapes: [['sleeve', 0.6], ['cassette', 0.4]],
      discs: [['dvd', 0.7], ['disc', 0.3]],
      mixed: [['sleeve', 0.3], ['cassette', 0.2], ['dvd', 0.35], ['disc', 0.15]],
      dregs: [['disc', 0.45], ['cassette', 0.4], ['dvd', 0.15]],
    };
    const pick = (): Kind => { let r = random(); for (const [kind, p] of mixOf[a.stock]) { if (r < p) return kind; r -= p; } return mixOf[a.stock][0][0]; };
    const SIZE: Record<Kind, [number, number, number]> = { cassette: [0.187, 0.025, 0.103], sleeve: [0.192, 0.03, 0.112], dvd: [0.19, 0.015, 0.135], disc: [0.12, 0.0016, 0.12] };
    const items: Record<Kind, { m: THREE.Matrix4; color: THREE.Color }[]> = { cassette: [], sleeve: [], dvd: [], disc: [] };
    const grey = new THREE.Color('#8f8a80');
    const colourOf = (kind: Kind) => kind === 'cassette' ? new THREE.Color('#ffffff') : kind === 'disc' ? new THREE.Color().setHSL(random(), 0.25, 0.8)
      : new THREE.Color(BRIGHTS[Math.floor(random() * BRIGHTS.length)]).lerp(grey, (1 - mood.cheer) * 0.25 + mood.wear * 0.12);
    const drop = (g: THREE.Matrix4, x: number, y: number, z: number, tilt: number, kind = pick()) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * tilt, random() * Math.PI * 2, (random() - 0.5) * tilt, 'YXZ'));
      items[kind].push({ m: g.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(...SIZE[kind]))), color: colourOf(kind) });
    };
    let topSpot: THREE.Vector3 | null = null;
    for (const region of regions) {
      const count = Math.max(a.ransacked > 0.9 ? (region === regions[0] ? 1 + Math.round(random()) : 0) : 2, Math.round(mix(4, 150, Math.pow(fill, 1.4)) * region.share * mix(0.8, 1.15, mood.density)));
      const depth = region.rim - region.base;
      const crown = mix(0.01, depth + 0.13, Math.pow(fill, 0.8));
      for (let i = 0; i < count; i++) {
        const u = random() * 2 - 1, v = random() * 2 - 1;
        const x = u * (region.w / 2 - 0.08), z = v * (region.d / 2 - 0.06);
        const edge = Math.max(Math.abs(u), Math.abs(v));
        const height = crown * (1 - 0.55 * edge * edge);
        const layer = fill < 0.2 ? 0 : Math.pow(random(), 0.45);
        drop(region.g, x, region.base + 0.012 + height * layer, z, fill < 0.2 ? 0.08 : 0.9);
      }
      if (!topSpot) topSpot = new THREE.Vector3(0.05, region.base + crown + 0.03, 0.04).applyMatrix4(region.g);
    }
    if (a.spilled) {
      const count = 3 + Math.round(random() * 3 + mood.density * 5);
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, r = reach * (0.75 + random() * 0.45);
        drop(at(0, 0, 0), Math.cos(t) * r, 0.014, Math.abs(Math.sin(t)) * r * 0.9 + 0.05, 0.05);
      }
    }
    const faces = {
      cassette: paint(128, 72, (c) => {
        c.fillStyle = '#1b1b1e'; c.fillRect(0, 0, 128, 72);
        c.fillStyle = '#f1eee3'; c.fillRect(22, 10, 84, 30);
        c.fillStyle = '#3a3a40'; c.fillRect(30, 46, 68, 18);
        c.fillStyle = '#e8e6dc'; c.beginPath(); c.arc(44, 55, 7, 0, 7); c.arc(84, 55, 7, 0, 7); c.fill();
        c.fillStyle = '#c3221c'; c.fillRect(22, 10, 84, 6);
      }),
      sleeve: paint(128, 72, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 72);
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, 34, 72); c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.arc(82, 36, 24, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.fillRect(8, 8, 8, 56); c.fillRect(20, 20, 5, 44);
      }),
      dvd: paint(128, 92, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 92);
        c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, 128, 24); c.fillStyle = '#fff'; c.fillRect(12, 8, 80, 8);
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(20, 92); c.lineTo(64, 34); c.lineTo(108, 92); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.strokeRect(2, 2, 124, 88);
      }),
      disc: paint(64, 64, (c) => {
        const g = c.createConicGradient(0, 32, 32);
        ['#e9edf0', '#bfd8ee', '#f4e6c8', '#e9edf0', '#d8c8ee', '#c8eed8', '#e9edf0'].forEach((hue, i) => g.addColorStop(i / 6, hue));
        c.fillStyle = g; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#8a8f94'; c.beginPath(); c.arc(32, 32, 8, 0, 7); c.fill();
        c.fillStyle = '#2a2c2e'; c.beginPath(); c.arc(32, 32, 4, 0, 7); c.fill();
      }),
    };
    (Object.keys(items) as Kind[]).forEach((kind) => {
      const set = items[kind];
      if (!set.length) { faces[kind].dispose(); return; }
      const edge = new THREE.MeshStandardMaterial({ color: kind === 'cassette' ? '#1b1b1e' : '#e4e1d8', roughness: 0.6, metalness: kind === 'disc' ? 0.6 : 0 });
      const face = new THREE.MeshStandardMaterial({ map: faces[kind], roughness: kind === 'disc' ? 0.25 : 0.5, metalness: kind === 'disc' ? 0.5 : 0 });
      const geometry = kind === 'disc' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 20) : new THREE.BoxGeometry(1, 1, 1);
      const materials = kind === 'disc' ? [edge, face, face] : [edge, edge, face, face, edge, edge];
      const mesh = new THREE.InstancedMesh(geometry, materials, set.length);
      set.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.color); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });

    if (a.posters) {
      const region = regions[regions.length - 1];
      const count = 2 + Math.round(random() * 2 + mood.density * 2);
      for (let i = 0; i < count; i++) {
        const local = new THREE.Vector3((random() < 0.5 ? -1 : 1) * (region.w / 2 - 0.07 - random() * 0.05), region.base + 0.02, -(region.d / 2 - 0.07) + random() * 0.1).applyMatrix4(region.g);
        const length = 0.55 + random() * 0.35;
        const tip = local.clone().add(new THREE.Vector3((random() - 0.5) * 0.35, length, -0.05 - random() * 0.2));
        const roll = s.rod(local.toArray() as [number, number, number], tip.toArray() as [number, number, number], 0.024 + random() * 0.008, s.material(random() < 0.6 ? '#f1eee4' : BRIGHTS[Math.floor(random() * BRIGHTS.length)]));
        const band = s.rod(local.clone().lerp(tip, 0.5).toArray() as [number, number, number], local.clone().lerp(tip, 0.53).toArray() as [number, number, number], 0.034, s.material('#b3202c'));
        roll.castShadow = band.castShadow = true;
      }
    }
    if (topSpot && a.relic !== 'nothing') {
      const p = topSpot;
      if (a.relic === 'hometape') {
        const tape = s.box([0.187, 0.025, 0.103], [p.x, p.y, p.z], s.material('#1b1b1e'));
        tape.rotation.set(0.12, 0.5 + random(), -0.1);
        const label = s.label(['XMAS 94', 'WEDDING', 'DO NOT ERASE', 'DAD 60TH'][Math.floor(random() * 4)], 0.15, 0.045, [p.x, p.y + 0.02, p.z], '#1b2a6b', '#fbf9ee');
        label.rotation.copy(tape.rotation); label.rotateX(-Math.PI / 2); label.position.y = p.y + 0.016;
      } else if (a.relic === 'emptycase') {
        const shell = s.material('#17181a');
        const left = s.box([0.135, 0.008, 0.19], [p.x - 0.07, p.y, p.z], shell); left.rotation.z = 0.25;
        const right = s.box([0.135, 0.008, 0.19], [p.x + 0.07, p.y, p.z], shell); right.rotation.z = -0.25;
        s.cylinder(0.012, 0.012, 0.01, [p.x + 0.07, p.y + 0.012, p.z], s.material('#3a3c40'), 12).rotation.z = -0.25;
      } else {
        const red = s.material('#c8242b', { roughness: 0.5 });
        const base = at(p.x, p.y, p.z, random());
        const basket = new THREE.Group(); basket.applyMatrix4(base); basket.rotation.z = 0.15; s.root.add(basket);
        basket.add(s.box([0.4, 0.01, 0.28], [0, 0.005, 0], red));
        for (const side of [-1, 1]) { basket.add(s.box([0.4, 0.18, 0.01], [0, 0.09, side * 0.14], red)); basket.add(s.box([0.01, 0.18, 0.28], [side * 0.2, 0.09, 0], red)); }
        basket.add(s.tube([[-0.2, 0.18, 0], [-0.12, 0.3, 0.02], [0.12, 0.3, 0.02], [0.2, 0.18, 0]], 0.008, s.material('#22252b')));
        basket.add(s.box([0.19, 0.03, 0.11], [0.03, 0.03, 0], s.material('#2f7fe0'))); basket.add(s.box([0.19, 0.03, 0.11], [-0.04, 0.06, 0.02], s.material('#f6c829')));
      }
    }

    // Price sign.
    const [l1, l2] = PRICES[a.price];
    const [px, py, pz] = signAt;
    const holder = a.container === 'dumpbin' ? 0.5 : 0.62;
    s.rod([px, py - 0.25, pz], [px, py + holder, pz], a.sign === 'printed' ? 0.009 : 0.012, a.sign === 'printed' ? steel : s.material('#b58d5a'));
    const signMap = paint(320, 256, (c) => {
      const hand = '"Comic Sans MS", "Marker Felt", "DejaVu Sans", sans-serif', block = 'Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
      c.clearRect(0, 0, 320, 256);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (a.sign === 'star') {
        c.fillStyle = ['#f9f02a', '#ff5fb0', '#ff8a2a', '#a6f23a'][Math.floor(random() * 4)]; c.beginPath();
        for (let i = 0; i < 32; i++) { const r = i % 2 ? 0.8 : 1, t = i / 32 * Math.PI * 2; c.lineTo(160 + Math.cos(t) * 158 * r, 128 + Math.sin(t) * 126 * r); }
        c.fill(); c.fillStyle = '#16171a';
      } else if (a.sign === 'marker') {
        c.fillStyle = '#b58d5a'; c.beginPath(); c.moveTo(6, 14); c.lineTo(300, 4); c.lineTo(316, 240); c.lineTo(150, 252); c.lineTo(20, 236); c.fill();
        c.fillStyle = '#16171a';
      } else {
        c.fillStyle = '#fbfaf3'; c.fillRect(0, 0, 320, 256); c.fillStyle = '#c3221c'; c.fillRect(0, 0, 320, 56); c.fillRect(0, 232, 320, 24);
        c.fillStyle = '#fff'; c.font = `bold 40px ${block}`; c.fillText('SALE', 160, 30);
        c.fillStyle = '#c3221c';
      }
      const family = a.sign === 'printed' ? block : hand;
      const big = l1.length <= 4;
      c.font = `bold ${big ? 120 : 66}px ${family}`;
      c.save(); c.translate(160, a.sign === 'printed' ? 116 : 96); c.rotate(a.sign === 'printed' ? 0 : (random() - 0.5) * 0.12); c.fillText(l1, 0, 0, a.sign === 'star' ? 200 : 280); c.restore();
      c.font = `bold ${l2.length <= 4 ? 80 : 42}px ${family}`;
      c.fillText(l2, 160, a.sign === 'printed' ? 196 : 184, a.sign === 'star' ? 190 : 280);
    });
    const plate = s.mesh(new THREE.PlaneGeometry(0.42, 0.336), new THREE.MeshStandardMaterial({ map: signMap, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.8 }), [px, py + holder, pz + 0.014]);
    plate.rotation.z = a.sign === 'printed' ? 0 : (random() - 0.5) * 0.25;
    plate.rotation.x = -0.08;
    return s.finish({ footprint: a.container === 'trestle' ? 0.85 : 0.62 });
  },
});
