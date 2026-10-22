import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, pick } from './util';

const GOLD = '#e7b93c', SILVER = '#d5d9dc', ROSE = '#dc9a72';
const VELVET = { black: '#1c1b20', burgundy: '#6a1626', royal: '#1d2f7c', green: '#1f4a35', sand: '#b9a37c' } as const;
const BANNERS = { none: '', gold: 'WE BUY GOLD', layaway: 'LAYAWAY', final: 'ALL SALES FINAL', watches: 'CASH 4 WATCHES' } as const;

export default defineThing({
  questions: {
    stock: choice('What fills the case?', {
      watches: 'Rows of wristwatches laid flat on their straps, steel and gold faces.',
      chains: 'Gold chains and pendants in long loops, a few on black neck forms.',
      rings: 'Slotted pads of rings standing in rows, stones catching the light.',
      coins: 'Old coins and medals in neat grids of white card holders.',
      mixed: 'A bit of everything: watches, chains, rings and coins, pad by pad.',
    }),
    fill: score('How stocked is it?', [
      'Picked over: bare velvet and a few orphaned tags',
      'Gappy, the good pieces gone',
      'Comfortably full',
      'Crammed edge to edge',
    ]),
    velvet: choice('What colour are the velvet pads?', {
      black: 'Black velvet, the gold shouting against it.',
      burgundy: 'Deep burgundy, old-jeweller rich.',
      royal: 'Royal blue, a little showy.',
      green: 'Bottle green baize like a card table.',
      sand: 'Sun-faded tan that used to be something else.',
    }),
    cabinet: choice('What is the base of the counter made of?', {
      oak: 'Panelled oak veneer with a brass rail, a proper old shop fitting.',
      black: 'Black laminate with a chrome strip, strip-mall standard.',
      white: 'White laminate with a red stripe, bright and cheap.',
      steel: 'Grey painted steel with rivets, built to resist a crowbar.',
    }),
    light: choice('What is the strip light inside doing?', {
      warm: 'A warm tube that makes everything look like more carats.',
      cold: 'A hard blue-white tube, honest and unflattering.',
      dying: 'A tube on its way out, dim and stuttering.',
      off: 'Switched off; the case sits in its own shadow.',
    }),
    cracked: noul('Is one front pane cracked and taped up?'),
    top: choice('What has been left on top of the glass?', {
      'loupe-and-scale': 'A pocket scale and a jeweller\'s loupe on a felt mat, mid-appraisal.',
      'acid-kit': 'A gold-testing kit: little acid bottles in a block and a black touchstone.',
      'ticket-book': 'A pad of pawn tickets, a pen and a short stack of cash.',
      bell: 'A service bell and a small tent card; nobody is at the counter.',
      bare: 'Nothing but fingerprints.',
    }),
    banner: choice('If a notice is stuck to the front of the base, what does it say?', {
      none: 'No notice at all.',
      gold: 'WE BUY GOLD',
      layaway: 'LAYAWAY',
      final: 'ALL SALES FINAL',
      watches: 'CASH 4 WATCHES',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = mix(1.5, 1.8, random()), D = 0.62, BASE = 0.44, TOP = 0.98;

    // ---- base cabinet ----
    const baseColour = { oak: '#8b5b34', black: '#25262a', white: '#e9e6dc', steel: '#7c8a86' }[a.cabinet];
    const base = s.material(baseColour, { roughness: a.cabinet === 'oak' ? 0.6 : 0.45, metalness: a.cabinet === 'steel' ? 0.35 : 0 });
    const dark = s.material('#1b1b1d');
    const metal = s.material(a.cabinet === 'oak' ? '#c7a04a' : '#c3c7c9', { metalness: 0.55, roughness: 0.3 });
    s.box([W - 0.06, 0.05, D - 0.06], [0, 0.025, 0], dark);
    s.box([W, BASE - 0.05, D], [0, 0.05 + (BASE - 0.05) / 2, 0], base);
    s.box([W + 0.02, 0.025, D + 0.02], [0, BASE - 0.0125, 0], metal);
    if (a.cabinet === 'oak') {
      const panel = s.material('#a26d3f', { roughness: 0.55 });
      const n = 3;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * (W / n);
        s.box([W / n - 0.08, 0.26, 0.012], [x, 0.23, D / 2 + 0.004], panel);
        s.box([W / n - 0.14, 0.2, 0.012], [x, 0.23, D / 2 + 0.01], base);
      }
    } else if (a.cabinet === 'white') {
      s.box([W + 0.004, 0.05, D + 0.004], [0, 0.33, 0], s.material('#c8262b'));
    } else if (a.cabinet === 'black') {
      s.box([W + 0.004, 0.018, D + 0.004], [0, 0.12, 0], metal);
    } else {
      const rivets = new Batch(new THREE.SphereGeometry(0.008, 6, 4), s.material('#5d6966', { metalness: 0.4 }));
      for (let i = 0; i <= 12; i++) for (const y of [0.09, 0.39]) rivets.add([-W / 2 + 0.04 + (i / 12) * (W - 0.08), y, D / 2 + 0.002]);
      rivets.into(s.root);
      for (const x of [-W / 6, W / 6]) s.box([0.012, BASE - 0.06, 0.006], [x, 0.24, D / 2 + 0.002], s.material('#66726f'));
    }
    // scuffs along the kick line grow with wear
    const scuff = s.material('#3a342e', { transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < Math.round(mood.wear * 14); i++)
      s.box([0.05 + random() * 0.18, 0.012 + random() * 0.03, 0.002], [(random() - 0.5) * (W - 0.2), 0.07 + random() * 0.12, D / 2 + 0.008], scuff).rotation.z = (random() - 0.5) * 0.4;
    if (a.banner !== 'none') {
      const paper = mood.wear > 0.6 ? '#d9cfa6' : a.banner === 'gold' ? '#f3d21f' : '#f4f0e2';
      const ink = a.banner === 'final' ? '#b3201d' : '#1d1d1d';
      const sign = s.label(BANNERS[a.banner], 0.62, 0.15, [(random() - 0.5) * 0.3, 0.24, D / 2 + 0.02], ink, paper);
      sign.rotation.z = (random() - 0.5) * 0.08 * (0.5 + mood.wear);
    }

    // ---- glass case ----
    const frame = s.material('#b6b9ba', { metalness: 0.5, roughness: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1ee', transparent: true, opacity: 0.16, roughness: 0.04, depthWrite: false });
    const H = TOP - BASE, t = 0.022;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([t, H, t], [x * (W / 2 - t / 2), BASE + H / 2, z * (D / 2 - t / 2)], frame);
    s.box([t, H, t], [0, BASE + H / 2, D / 2 - t / 2], frame);
    for (const z of [-1, 1]) s.box([W, t, t], [0, TOP - t / 2, z * (D / 2 - t / 2)], frame);
    for (const x of [-1, 0, 1]) s.box([t, t, D], [x * (W / 2 - t / 2), TOP - t / 2, 0], frame);
    s.box([W - t, H, 0.006], [0, BASE + H / 2, D / 2 - 0.004], glass);
    s.box([W - t, 0.006, D - t], [0, TOP - 0.003, 0], glass);
    for (const x of [-1, 1]) s.box([0.006, H, D - t], [x * (W / 2 - 0.004), BASE + H / 2, 0], glass);
    // sliding back doors with finger pulls
    const doorLit = { warm: 0.28, cold: 0.3, dying: 0.1, off: 0 }[a.light];
    const door = s.material(a.cabinet === 'oak' ? '#6f4728' : a.cabinet === 'black' ? '#4a4c50' : '#8f9494', { roughness: 0.5, emissive: a.light === 'cold' ? '#cfe6ff' : '#ffd590', emissiveIntensity: doorLit });
    s.box([W / 2, H - t, 0.012], [-W / 4 + 0.01, BASE + H / 2, -D / 2 + 0.012], door);
    s.box([W / 2, H - t, 0.012], [W / 4 - 0.01, BASE + H / 2, -D / 2 + 0.026], door);

    // ---- strip light ----
    const lit = a.light !== 'off';
    const tubeColour = a.light === 'cold' ? '#dff0ff' : a.light === 'dying' ? '#ffd9a8' : '#ffe2a6';
    const tubeLevel = { warm: 1.5, cold: 1.6, dying: 0.55, off: 0 }[a.light];
    const tube = new THREE.MeshStandardMaterial({ color: lit ? '#fff6dc' : '#8d8f8c', emissive: tubeColour, emissiveIntensity: tubeLevel });
    s.box([W - 0.1, 0.03, 0.05], [0, TOP - t - 0.015, D / 2 - 0.06], frame);
    s.box([W - 0.14, 0.014, 0.03], [0, TOP - t - 0.034, D / 2 - 0.06], tube);
    const glow = { warm: 0.3, cold: 0.26, dying: 0.1, off: 0 }[a.light];

    // ---- tilted velvet deck ----
    const deck = new THREE.Group();
    deck.position.set(0, BASE + 0.1, -0.01);
    deck.rotation.x = 0.3;
    s.root.add(deck);
    const cloth = new THREE.Color(VELVET[a.velvet]).lerp(new THREE.Color('#8c8474'), mood.wear * 0.3);
    const velvetGlow = cloth.clone().lerp(new THREE.Color(tubeColour), 0.35);
    const velvet = new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.95, emissive: velvetGlow, emissiveIntensity: glow });
    const padCloth = cloth.clone().offsetHSL(0, 0, a.velvet === 'sand' ? -0.08 : 0.07);
    const padMat = new THREE.MeshStandardMaterial({ color: padCloth, roughness: 0.9, emissive: padCloth.clone().lerp(new THREE.Color(tubeColour), 0.3), emissiveIntensity: glow * 1.3 });
    const L = 0.56;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.02, L), velvet);
    slab.castShadow = slab.receiveShadow = true;
    deck.add(slab);
    // the wedge under the deck
    s.box([W - 0.06, 0.1, D - 0.06], [0, BASE + 0.045, -0.01], velvet);

    const shine = { metalness: 0.45, roughness: 0.28, emissive: new THREE.Color('#5a4a22'), emissiveIntensity: lit ? mix(0.35, 0.8, mood.cheer) : 0.08 };
    const hoops = new Batch(new THREE.TorusGeometry(1, 0.2, 6, 18), new THREE.MeshStandardMaterial(shine));
    const loops = new Batch(new THREE.TorusGeometry(1, 0.09, 5, 22), new THREE.MeshStandardMaterial(shine));
    const discs = new Batch(new THREE.CylinderGeometry(1, 1, 1, 18), new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.35 }));
    const boxes = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }));
    const gems = new Batch(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.08, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: lit ? 0.25 : 0.03 }));
    const pads = new Batch(new THREE.BoxGeometry(1, 1, 1), padMat);

    const level = clamp01(mix(0.1, 1, a.fill) * mix(0.85, 1.12, mood.density));
    const metalTone = () => pick(random, [GOLD, GOLD, GOLD, SILVER, ROSE]);
    const columns = W > 1.65 ? 5 : 4, rows = 2;
    const padW = (W - 0.14) / columns - 0.025, padD = L / rows - 0.04;
    const kinds = ['watches', 'chains', 'rings', 'coins'] as const;
    let orphanTags = 0;
    const present = () => random() < level;
    const tag = (x: number, z: number) => {
      orphanTags++;
      boxes.add([x, 0.027, z], [0.022, 0.002, 0.014], [0, random() * 3, 0], '#f1ecd9');
    };

    for (let c = 0; c < columns; c++) for (let r = 0; r < rows; r++) {
      const px = (c - (columns - 1) / 2) * ((W - 0.14) / columns);
      const pz = (r - (rows - 1) / 2) * (L / rows);
      const kind = a.stock === 'mixed' ? kinds[(c + r * 2 + Math.floor(random() * 2)) % 4] : a.stock;
      pads.add([px, 0.018, pz], [padW, 0.016, padD]);
      const y = 0.027;
      if (kind === 'watches') {
        const n = 3;
        for (let i = 0; i < n; i++) {
          const x = px + (i - (n - 1) / 2) * (padW / n);
          if (!present()) { if (random() < 0.5) tag(x, pz); continue; }
          const bezel = metalTone();
          const strap = pick(random, ['#15151a', '#5b3620', bezel, bezel, '#7c1d1d']);
          const turn = (random() - 0.5) * 0.25;
          boxes.add([x, y + 0.004, pz], [0.03, 0.008, padD * 0.86], [0, turn, 0], strap);
          discs.add([x, y + 0.012, pz], [0.031, 0.016, 0.031], [0, 0, 0], bezel);
          discs.add([x, y + 0.014, pz], [0.024, 0.016, 0.024], [0, 0, 0], pick(random, ['#f6f3e8', '#f6f3e8', '#11151c', '#1b3f8a', '#e9d9a4']));
          boxes.add([x + 0.034, y, pz + padD * 0.3], [0.02, 0.002, 0.013], [0, 0.4, 0], '#f5f0dc');
        }
      } else if (kind === 'chains') {
        const bust = r === 0 && random() < 0.6;
        if (bust) {
          if (present()) {
            const form = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.9 }));
            form.scale.set(Math.min(0.075, padW * 0.26), 0.12, 0.035);
            form.position.set(px, 0.105, pz - 0.02);
            form.rotation.x = -0.5;
            form.castShadow = true;
            deck.add(form);
            for (let k = 0; k < 2; k++) loops.add([px, 0.1 - k * 0.012, pz + 0.008 + k * 0.006], [0.04 + k * 0.014, 0.05 + k * 0.022, 0.03], [-0.5, 0, 0], metalTone());
            gems.add([px, 0.03, pz + 0.045], 0.012, [0.6, 0.7, 0], pick(random, ['#d83a4a', '#3b7fe0', '#f2f6f8', '#2fae6b']));
          }
        } else {
          const n = 3;
          for (let i = 0; i < n; i++) {
            const x = px + (i - (n - 1) / 2) * (padW / n);
            if (!present()) { if (random() < 0.4) tag(x, pz); continue; }
            const tone = metalTone();
            loops.add([x, y + 0.004, pz], [padW / n * 0.36, padD * 0.42, 0.045], [Math.PI / 2, 0, (random() - 0.5) * 0.3], tone);
            if (random() < 0.6) gems.add([x, y + 0.008, pz + padD * 0.42], 0.011, [0.6, 0.7, 0], pick(random, ['#d83a4a', '#3b7fe0', '#f2f6f8', tone]));
          }
        }
      } else if (kind === 'rings') {
        const nx = 5, nz = 3;
        for (let k = 0; k < nz; k++) {
          const z = pz + (k - 1) * (padD / 3.2);
          boxes.add([px, y + 0.004, z - 0.012], [padW * 0.92, 0.012, 0.014], [0, 0, 0], padCloth.clone().offsetHSL(0, 0, -0.05));
          for (let i = 0; i < nx; i++) {
            const x = px + (i - 2) * (padW / 5.4);
            if (!present()) { if (random() < 0.15) tag(x, z); continue; }
            const tone = metalTone();
            hoops.add([x, y + 0.016, z], [0.013, 0.013, 0.02], [0.25, 0, 0], tone);
            if (random() < 0.65) gems.add([x, y + 0.034, z + 0.004], 0.0075, [0, random() * 3, 0], pick(random, ['#f4f8fb', '#f4f8fb', '#d83a4a', '#3b7fe0', '#2fae6b', '#8d4fd6']));
          }
        }
      } else {
        const nx = 4, nz = 3;
        for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
          const x = px + (i - 1.5) * (padW / 4.2), z = pz + (k - 1) * (padD / 3.2);
          if (!present()) continue;
          boxes.add([x, y + 0.002, z], [padW / 4.9, 0.004, padD / 3.7], [0, 0, 0], '#f3efe2');
          discs.add([x, y + 0.006, z], [0.019, 0.005, 0.019], [0, 0, 0], pick(random, [GOLD, SILVER, SILVER, '#b9734a', '#8a8f6a']));
        }
      }
    }
    // a handwritten shelf card standing among the pads
    if (level > 0.25) boxes.add([(random() - 0.5) * W * 0.5, 0.05, L / 2 - 0.03], [0.09, 0.05, 0.003], [-0.4, 0, 0], '#f5f0dc');
    for (const batch of [pads, hoops, loops, discs, boxes, gems]) batch.into(deck);

    // ---- cracked pane ----
    if (a.cracked) {
      const side = random() < 0.5 ? -1 : 1;
      const cx = side * W * (0.2 + random() * 0.1), cy = BASE + H * (0.35 + random() * 0.3), z = D / 2 + 0.002;
      const crack = s.material('#f4fbfa', { emissive: '#ffffff', emissiveIntensity: 0.3 });
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + random() * 0.6, len = 0.1 + random() * 0.2;
        const line = s.box([len, 0.005, 0.002], [cx + Math.cos(angle) * len / 2, cy + Math.sin(angle) * len / 2, z], crack);
        line.rotation.z = angle;
        const p = line.position;
        p.x = Math.max(-W / 2 + 0.05, Math.min(W / 2 - 0.05, p.x));
        p.y = Math.max(BASE + 0.03, Math.min(TOP - 0.04, p.y));
      }
      const tape = s.material(random() < 0.5 ? '#c8ad6b' : '#9aa0a2', { roughness: 0.6 });
      const strips = 2 + Math.floor(random() * 2);
      for (let i = 0; i < strips; i++) {
        const strip = s.box([0.34 + random() * 0.14, 0.05, 0.003], [cx + (random() - 0.5) * 0.06, Math.min(TOP - 0.1, Math.max(BASE + 0.1, cy + (i - (strips - 1) / 2) * 0.09)), z + 0.003], tape);
        strip.rotation.z = (i % 2 ? -1 : 1) * (0.35 + random() * 0.4);
      }
    }

    // ---- things left on top ----
    const ty = TOP;
    const tx = (random() - 0.5) * W * 0.3 - W * 0.12;
    if (a.top === 'loupe-and-scale') {
      s.box([0.36, 0.006, 0.26], [tx, ty + 0.003, 0.02], s.material('#1f2a24'));
      s.box([0.15, 0.03, 0.2], [tx - 0.08, ty + 0.021, 0.02], s.material('#2c2f33'));
      s.cylinder(0.055, 0.055, 0.008, [tx - 0.08, ty + 0.045, -0.01], metal, 20);
      s.box([0.08, 0.004, 0.03], [tx - 0.08, ty + 0.038, 0.09], new THREE.MeshStandardMaterial({ color: '#9fe2a0', emissive: '#58e06a', emissiveIntensity: 0.9 }));
      s.cylinder(0.014, 0.014, 0.012, [tx - 0.08, ty + 0.053, -0.01], s.material(GOLD, { metalness: 0.4, emissive: '#5a4a22', emissiveIntensity: 0.5 }), 14);
      const loupe = s.cylinder(0.028, 0.024, 0.045, [tx + 0.08, ty + 0.03, 0.05], dark, 16);
      loupe.rotation.z = 0.2;
      s.cylinder(0.03, 0.03, 0.008, [tx + 0.076, ty + 0.055, 0.05], metal, 16).rotation.z = 0.2;
    } else if (a.top === 'acid-kit') {
      s.box([0.22, 0.035, 0.09], [tx, ty + 0.018, 0], s.material('#7a5231'));
      const caps = ['#c9302c', '#2f6fd0', '#e8c22e', '#3a9a52'];
      for (let i = 0; i < 4; i++) {
        s.cylinder(0.016, 0.018, 0.06, [tx - 0.075 + i * 0.05, ty + 0.06, 0], s.material('#6b4a2a', { transparent: false, roughness: 0.2 }), 12);
        s.cylinder(0.012, 0.012, 0.022, [tx - 0.075 + i * 0.05, ty + 0.1, 0], s.material(caps[i]), 10);
      }
      const stone = s.box([0.12, 0.018, 0.07], [tx + 0.2, ty + 0.009, 0.06], s.material('#131315', { roughness: 0.4 }));
      stone.rotation.y = 0.4;
      for (let i = 0; i < 3; i++) s.box([0.05, 0.002, 0.006], [tx + 0.2, ty + 0.019, 0.045 + i * 0.016], s.material(GOLD, { emissive: '#6a5520', emissiveIntensity: 0.6 })).rotation.y = 0.4;
    } else if (a.top === 'ticket-book') {
      const book = s.box([0.2, 0.025, 0.11], [tx, ty + 0.0125, 0.02], s.material('#f2c7c9'));
      book.rotation.y = 0.2;
      s.box([0.2, 0.005, 0.03], [tx - 0.008, ty + 0.027, -0.02], s.material('#3a3f47')).rotation.y = 0.2;
      s.rod([tx - 0.06, ty + 0.033, 0.06], [tx + 0.08, ty + 0.033, 0.01], 0.006, s.material('#22419a'));
      for (let i = 0; i < 4; i++) s.box([0.16, 0.004, 0.07], [tx + 0.27 + random() * 0.01, ty + 0.002 + i * 0.004, 0.04], s.material(i % 2 ? '#7fa27a' : '#93b58c')).rotation.y = -0.3 + (random() - 0.5) * 0.25;
    } else if (a.top === 'bell') {
      s.cylinder(0.055, 0.06, 0.012, [tx, ty + 0.006, 0.02], dark, 20);
      s.lathe([[0, 0.055], [0.02, 0.053], [0.04, 0.04], [0.052, 0.018], [0.055, 0]], metal, [tx, ty + 0.012, 0.02]);
      s.cylinder(0.008, 0.008, 0.02, [tx, ty + 0.075, 0.02], dark, 8);
      const tent = s.label('RING FOR SERVICE', 0.24, 0.09, [tx + 0.28, ty + 0.045, 0.05], '#222', '#f3eedd');
      tent.rotation.x = -0.3;
    }

    const flicker = a.light === 'dying';
    const speed = mix(2, 14, mood.energy);
    return s.finish({
      update: flicker
        ? (_dt, time) => {
            const pulse = Math.sin(time * speed) * Math.sin(time * speed * 2.7 + 1.3);
            tube.emissiveIntensity = pulse > 0.55 ? 0.08 : 0.55 + pulse * 0.2;
          }
        : undefined,
    });
  },
});
