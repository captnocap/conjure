import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    era: choice('What era and style are the earrings?', {
      eighties: 'Eighties plastic: big neon triangles and discs on hot-pink cards.',
      nineties: 'Nineties hoops: silver and gold hoops in every size on black cards.',
      birthstone: 'Birthstone studs: tiny coloured gems, twelve months, on clean white cards.',
      goth: 'Goth: pewter crosses and black drops on purple-black cards.',
      grandma: 'Clip-on pearls and gilt buttons on cream cards, for unpierced ears.',
      novelty: 'Novelty danglers: cherries, lemons and smiley faces on yellow cards.',
    }),
    price: choice('What is the price point?', {
      bargain: 'Bargain bin: a pink plastic tower, everything a dollar or two.',
      mid: 'Mid-range mall kiosk: white tower with chrome trim.',
      boutique: 'Boutique: a slim brass and walnut tower, sparsely hung, prices not shown.',
    }),
    stripped: score('How picked over is the tower?', ['Fully stocked, every peg hung', 'A few gaps', 'Half empty', 'Stripped by shoplifters: bare pegs, torn cards, some on the floor']),
    sign: choice('What does the topper sign say?', {
      free: 'FREE PIERCING with purchase',
      sale: '3 FOR $5 sale',
      nickel: 'NICKEL FREE hypoallergenic',
      last: 'EVERYTHING MUST GO',
      watch: 'SHOPLIFTERS WILL BE PROSECUTED',
    }),
    tower: choice('What shape is the tower?', {
      square: 'A four-sided square column.',
      wings: 'Three flat wings meeting at a central pole.',
      hex: 'A six-sided drum with narrow faces.',
    }),
    extra: choice('What else is attached to it?', {
      none: 'Nothing.',
      mirror: 'A little try-on mirror on a swivel arm.',
      gun: 'A piercing gun hanging in a holster on the base, ready for the free piercing.',
      jar: 'A jar of lollipops on the base for brave customers.',
    }),
    height: choice('How many tiers of earrings does the display carry?', {
      low: 'Three low tiers for a counter beside a cashier.',
      regular: 'The usual four to six tiers of cards.',
      tall: 'Eight tiers make a tall densely hung rotating tower.',
      step: 'Five widely separated tiers display long dangling jewellery.',
    }),
    card: choice('What shape are the individual jewellery cards?', {
      rectangle: 'Simple squared-off rectangular backing cards.',
      arch: 'Cards with rounded arched tops like small windows.',
      circle: 'Round medallion cards hanging from a hole at the top.',
      tag: 'Price-tag cards with clipped upper corners.',
    }),
    pairing: choice('What is left on the cards that still hang on the stand?', {
      pairs: 'Each card carries a matching pair.',
      singles: 'One earring per card: lost partners and sample pieces.',
      mismatch: 'Deliberately mismatched colours make playful pairs.',
      samples: 'One side displays jewellery, the other carries a small sample label.',
    }),
    guarding: choice('How is the stock protected?', {
      open: 'Open pegs and cards, ready to touch.',
      hood: 'A transparent cylindrical dust hood covers the jewellery.',
      bars: 'Slim vertical brass guard rods protect each side.',
      sealed: 'A clear square display case with a small lock keeps the stock behind glass.',
    }),
    packing: choice('What packaging waits at the foot of the display?', {
      none: 'No packaging around the foot.',
      bags: 'A small standing bundle of paper gift bags.',
      boxes: 'Two tiny jewellery boxes, one open with a padded insert.',
      pouches: 'Three soft little drawstring pouches laid on the base.',
    }),
    movement: choice('What state is the rotating display in?', {
      free: 'The tower spins slowly on its pedestal.',
      stopped: 'The tower is held still for someone choosing a pair.',
      swinging: 'The tower sways gently back and forth after a touch.',
      seized: 'A little wedge jams the base and prevents it turning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = {
      bargain: s.material('#ff6fa8', { roughness: 0.4 }),
      mid: s.material('#f1f2f0', { roughness: 0.35 }),
      boutique: s.material('#5a3822', { roughness: 0.5 }),
    }[a.price];
    const trim = a.price === 'boutique' ? s.material('#c9a44c', { metalness: 0.9, roughness: 0.25 }) : s.material('#cfd5d8', { metalness: 0.9, roughness: 0.25 });
    const dark = s.material('#1d1d21');
    const faces = { square: 4, wings: 3, hex: 6 }[a.tower];
    const cols = { square: 3, wings: 2, hex: 2 }[a.tower];
    const rows = a.height === 'low' ? 3 : a.height === 'tall' ? 8 : a.height === 'step' ? 5 : a.price === 'boutique' ? 4 : 6;
    const cw = 0.05, ch = 0.068, pitchX = 0.062, pitchY = a.height === 'step' ? 0.13 : a.price === 'boutique' ? 0.115 : 0.082;
    const faceW = cols * pitchX + 0.012;
    const R = a.tower === 'wings' ? 0 : faceW / 2 / Math.tan(Math.PI / faces);
    const y0 = 0.1, colH = rows * pitchY + 0.03;

    s.lathe([[0, 0], [0.17, 0], [0.17, 0.02], [0.06, 0.045], [0.022, 0.06], [0.022, y0], [0, y0]], a.price === 'bargain' ? body : trim);
    const spin = new THREE.Group(); s.root.add(spin);
    spin.rotation.y = 0.35 + random() * 0.5;
    const add = <T extends THREE.Object3D>(o: T) => { spin.add(o); return o; };
    if (a.tower === 'wings') {
      add(s.cylinder(0.016, 0.016, colH, [0, y0 + colH / 2, 0], trim, 12));
      for (let k = 0; k < 3; k++) {
        const w = add(s.box([faceW, colH, 0.008], [0, y0 + colH / 2, 0], body));
        w.rotation.y = k * Math.PI * 2 / 3; w.translateX(faceW / 2 + 0.01);
      }
    } else {
      const col = add(s.cylinder(R / Math.cos(Math.PI / faces), R / Math.cos(Math.PI / faces), colH, [0, y0 + colH / 2, 0], body, faces));
      col.rotation.y = Math.PI / faces;
    }
    const capR = (a.tower === 'wings' ? faceW + 0.02 : R / Math.cos(Math.PI / faces)) + 0.012;
    for (const y of [y0, y0 + colH]) add(s.cylinder(capR, capR, 0.012, [0, y, 0], trim, a.tower === 'wings' ? 24 : faces)).rotation.y = Math.PI / faces;

    // Era stock.
    const cardColour = { eighties: '#ff3d94', nineties: '#18181c', birthstone: '#fbfbf7', goth: '#2a1638', grandma: '#efe2c4', novelty: '#ffe14a' }[a.era];
    const metalish = (c: string) => s.material(c, { metalness: 0.9, roughness: 0.22, emissive: c, emissiveIntensity: 0.3 });
    const plastic = s.material('#ffffff', { roughness: 0.35, emissive: '#666666', emissiveIntensity: mix(0.25, 0.6, mood.cheer) });
    const tri = new THREE.CylinderGeometry(0.014, 0.014, 0.003, 3); tri.rotateX(Math.PI / 2);
    const disc = new THREE.CylinderGeometry(0.011, 0.011, 0.003, 18); disc.rotateX(Math.PI / 2);
    const hoop = new THREE.TorusGeometry(0.011, 0.0016, 6, 24);
    const gem = new THREE.IcosahedronGeometry(0.0062, 1);
    const cross = mergeGeometries([new THREE.BoxGeometry(0.005, 0.028, 0.003), new THREE.BoxGeometry(0.017, 0.005, 0.003).translate(0, 0.005, 0)])!;
    const drop = mergeGeometries([new THREE.SphereGeometry(0.0075, 12, 8).translate(0, -0.008, 0), new THREE.CylinderGeometry(0.0008, 0.0008, 0.012, 5).translate(0, 0.002, 0), new THREE.SphereGeometry(0.003, 8, 6).translate(0, 0.009, 0)])!;
    const pearl = new THREE.SphereGeometry(0.009, 14, 10);
    const stock: { geo: THREE.BufferGeometry; mat: THREE.Material; colours: string[] }[] = {
      eighties: [{ geo: tri, mat: plastic, colours: ['#21e6ff', '#fff01f', '#7dff3c', '#ff7a1a', '#b14dff'] }, { geo: disc, mat: plastic, colours: ['#21e6ff', '#fff01f', '#ffffff', '#7dff3c'] }],
      nineties: [{ geo: hoop, mat: metalish('#ffffff'), colours: ['#e6ebee', '#f4c63c', '#e6ebee'] }],
      birthstone: [{ geo: gem, mat: s.material('#ffffff', { roughness: 0.08, emissive: '#777777', emissiveIntensity: mix(0.5, 1, mood.cheer) }), colours: ['#b3122e', '#8e44d6', '#7fdcf5', '#f4f8ff', '#18a558', '#e8e2f0', '#e0113f', '#a6d83b', '#1f4fd0', '#ff8fc0', '#f3a81f', '#1ec7c7'] }],
      goth: [{ geo: cross, mat: metalish('#ffffff'), colours: ['#b9bec6', '#8f949c'] }, { geo: drop, mat: plastic, colours: ['#15151a', '#7a0f1f', '#3b1466'] }],
      grandma: [{ geo: pearl, mat: s.material('#ffffff', { roughness: 0.2, emissive: '#8a8070', emissiveIntensity: 0.4 }), colours: ['#fbf4e8', '#f6e7d8', '#f4c63c'] }, { geo: disc, mat: metalish('#ffffff'), colours: ['#e9b93a', '#d9a520'] }],
      novelty: [{ geo: drop, mat: plastic, colours: ['#e8102e', '#ffd21f', '#ff7a1a', '#3ddc6a'] }, { geo: disc, mat: plastic, colours: ['#ffd21f', '#ff5fa2'] }],
    }[a.era];

    const keep = 1 - a.stripped * 0.88;
    const cardM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const cards: THREE.Matrix4[] = [], pegs: { at: [number, number, number]; size: number }[] = [];
    const items: { m: THREE.Matrix4; c: string }[][] = stock.map(() => []);
    for (let f = 0; f < faces; f++) for (const side of a.tower === 'wings' ? [1, -1] : [1]) {
      const th = f * Math.PI * 2 / faces;
      const faceMatrix = new THREE.Matrix4().makeRotationY(a.tower === 'wings' ? th + (side < 0 ? Math.PI : 0) : th);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lx = a.tower === 'wings' ? side * (0.01 + faceW / 2 + (c - (cols - 1) / 2) * pitchX) : (c - (cols - 1) / 2) * pitchX;
        const ly = y0 + colH - 0.035 - r * pitchY;
        const lz = (a.tower === 'wings' ? 0.004 : R) + 0.008;
        const p = new THREE.Vector3(lx, ly, lz + 0.004).applyMatrix4(faceMatrix);
        pegs.push({ at: [p.x, p.y, p.z], size: 1 });
        if (random() > keep) continue;
        const torn = a.stripped > 0.55 && random() < a.stripped * 0.35;
        const tilt = torn ? (random() - 0.5) * 1.6 : (random() - 0.5) * 0.08 * (1 + mood.energy);
        // Cards pivot on their peg.
        const pivot = new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz), q.setFromEuler(e.set(0, 0, tilt)), one);
        cards.push(cardM.clone().copy(faceMatrix).multiply(pivot).multiply(new THREE.Matrix4().makeTranslation(0, -ch / 2 + 0.008, 0)));
        if (torn) continue;
        const kind = Math.floor(random() * stock.length);
        const colour = stock[kind].colours[Math.floor(random() * stock[kind].colours.length)];
        const sc = a.era === 'nineties' ? 0.55 + random() * 0.6 : 0.9 + random() * 0.2;
        for (const dx of a.pairing === 'singles' || a.pairing === 'samples' ? [-0.011] : [-0.011, 0.011]) {
          const local = new THREE.Matrix4().compose(new THREE.Vector3(dx, -ch / 2 + 0.002 - (a.era === 'nineties' ? sc * 0.004 : 0), 0.004), q.identity(), new THREE.Vector3(sc, sc, sc));
          items[kind].push({ m: new THREE.Matrix4().copy(faceMatrix).multiply(pivot).multiply(local), c: a.pairing === 'mismatch' && dx > 0 ? stock[kind].colours[(stock[kind].colours.indexOf(colour) + 1) % stock[kind].colours.length] : colour });
        }
        if (a.pairing === 'samples') {
          const stamp = add(s.box([0.016, 0.009, 0.002], [0, 0, 0], trim));
          stamp.applyMatrix4(new THREE.Matrix4().copy(faceMatrix).multiply(pivot).multiply(new THREE.Matrix4().makeTranslation(0.012, -ch / 2, 0.004)));
        }
      }
    }
    const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: { m: THREE.Matrix4; c?: string }[]) => {
      if (!list.length) { geo.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => { mesh.setMatrixAt(i, it.m); if (it.c) mesh.setColorAt(i, new THREE.Color(it.c)); });
      mesh.castShadow = mesh.receiveShadow = true;
      spin.add(mesh);
    };
    let cardGeometry: THREE.BufferGeometry;
    if (a.card === 'rectangle') cardGeometry = new THREE.BoxGeometry(cw, ch, 0.0015);
    else {
      const shape = new THREE.Shape();
      if (a.card === 'circle') {
        shape.absellipse(0, 0, cw * 0.52, ch * 0.5, 0, Math.PI * 2, false, 0);
      } else {
        shape.moveTo(-cw / 2, -ch / 2); shape.lineTo(cw / 2, -ch / 2);
        if (a.card === 'arch') {
          shape.lineTo(cw / 2, ch / 2 - cw / 2);
          shape.absarc(0, ch / 2 - cw / 2, cw / 2, 0, Math.PI, false);
        } else {
          shape.lineTo(cw / 2, ch / 2 - 0.012); shape.lineTo(cw / 2 - 0.012, ch / 2);
          shape.lineTo(-cw / 2 + 0.012, ch / 2); shape.lineTo(-cw / 2, ch / 2 - 0.012);
        }
        shape.closePath();
      }
      cardGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.0015, bevelEnabled: false, curveSegments: 10 });
      cardGeometry.translate(0, 0, -0.00075);
    }
    instanced(cardGeometry, s.material(cardColour, { roughness: 0.8 }), cards.map((m) => ({ m })));
    stock.forEach((st, i) => instanced(st.geo, st.mat, items[i]));
    for (const g of [tri, disc, hoop, gem, cross, drop, pearl]) if (!stock.some((st) => st.geo === g)) g.dispose();
    add(s.scatter(new THREE.SphereGeometry(0.0035, 6, 5), trim, pegs));

    // Topper sign, two lines on both sides.
    const lines = { free: ['FREE PIERCING', 'with purchase'], sale: ['3 FOR $5', 'mix & match'], nickel: ['NICKEL FREE', 'hypoallergenic'], last: ['EVERYTHING', 'MUST GO'], watch: ['SHOPLIFTERS', 'will be prosecuted'] }[a.sign];
    const [ink, paper] = a.sign === 'watch' ? ['#ffffff', '#b3131f'] : a.price === 'boutique' ? ['#3a2a18', '#f2e9d2'] : a.price === 'bargain' ? ['#d1123a', '#fff04a'] : ['#ffffff', '#1f6fd6'];
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 224;
    const g = canvas.getContext('2d')!;
    g.fillStyle = paper; g.fillRect(0, 0, 512, 224);
    g.strokeStyle = ink; g.lineWidth = 10; g.strokeRect(10, 10, 492, 204);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 76px sans-serif'; g.fillText(lines[0], 256, 82, 450);
    g.font = 'bold 48px sans-serif'; g.fillText(lines[1], 256, 162, 450);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const top = y0 + colH;
    const sw = 0.3, sh = 0.13;
    add(s.cylinder(0.008, 0.008, 0.06, [0, top + 0.03, 0], trim, 8));
    const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: mix(0.1, 0.4, mood.cheer) });
    const board = add(s.box([sw, sh, 0.008], [0, top + 0.06 + sh / 2, 0], [body, body, body, body, signMat, signMat]as unknown as THREE.Material));
    board.rotation.z = (random() - 0.5) * 0.1 * (0.3 + mood.wear + a.stripped);

    // Extras on the base and floor.
    if (a.extra === 'mirror') {
      s.rod([0.14, 0.02, 0.05], [0.2, 0.3, 0.07], 0.005, trim);
      const mir = s.cylinder(0.06, 0.06, 0.008, [0.2, 0.35, 0.07], trim, 24); mir.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      const glass = s.cylinder(0.052, 0.052, 0.009, [0.2, 0.35, 0.071], s.material('#d8eefc', { metalness: 0.95, roughness: 0.05, emissive: '#a8d4f5', emissiveIntensity: 0.45 }), 24); glass.rotation.copy(mir.rotation);
    } else if (a.extra === 'gun') {
      const gunM = s.material('#f4f4f6', { roughness: 0.3 }), grip = s.material('#7b3fd6', { roughness: 0.4 });
      const gg = new THREE.Group(); gg.position.set(0.19, 0.0, 0.1); gg.rotation.y = -0.5; s.root.add(gg);
      gg.add(s.box([0.03, 0.03, 0.11], [0, 0.085, 0], gunM), s.box([0.026, 0.075, 0.03], [0, 0.04, -0.035], grip), s.box([0.012, 0.03, 0.02], [0, 0.058, 0.0], dark), s.cylinder(0.006, 0.006, 0.03, [0, 0.09, 0.065], trim, 8), s.box([0.06, 0.006, 0.06], [0, 0.003, -0.03], dark));
      gg.children[3].rotation.x = Math.PI / 2;
    } else if (a.extra === 'jar') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
      s.cylinder(0.045, 0.04, 0.09, [0.2, 0.045, 0.1], glass, 18);
      s.cylinder(0.04, 0.04, 0.012, [0.2, 0.006, 0.1], trim, 18);
      const pops: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 9; i++) {
        const an = random() * 6.3, rr = random() * 0.028, h = 0.1 + random() * 0.045;
        pops.push({ at: [0.2 + Math.cos(an) * rr, h, 0.1 + Math.sin(an) * rr], size: 0.014, color: ['#e8102e', '#ff8a1f', '#7a3fe0', '#2fc45a', '#ffd21f'][i % 5] });
        s.rod([0.2 + Math.cos(an) * rr * 0.5, 0.015, 0.1 + Math.sin(an) * rr * 0.5], [0.2 + Math.cos(an) * rr, h, 0.1 + Math.sin(an) * rr], 0.0018, s.material('#ffffff'));
      }
      s.scatter(new THREE.SphereGeometry(1, 10, 8), s.material('#ffffff', { roughness: 0.2, emissive: '#555555', emissiveIntensity: 0.5 }), pops);
    }
    if (a.stripped > 0.6) {
      const fallen = s.material(cardColour, { roughness: 0.8 });
      for (let i = 0; i < Math.round((a.stripped - 0.5) * 12); i++) {
        const an = random() * 6.3, rr = 0.2 + random() * 0.12;
        const c = s.box([cw, 0.0015, ch], [Math.cos(an) * rr, 0.001 + i * 0.0004, Math.sin(an) * rr], fallen); c.rotation.y = random() * 3;
      }
    }

    if (a.guarding !== 'open') {
      const guardR = Math.max(0.2, capR + 0.035);
      const clear = new THREE.MeshPhysicalMaterial({ color: '#cce4e5', transparent: true, opacity: 0.13, roughness: 0.1, depthWrite: false });
      const guardTop = y0 + colH + 0.022;
      if (a.guarding === 'sealed') s.box([guardR * 2 + 0.02, 0.015, guardR * 2 + 0.02], [0, 0.012, 0], trim);
      else s.cylinder(guardR + 0.007, guardR + 0.007, 0.015, [0, 0.012, 0], trim, 32);
      if (a.guarding === 'hood') {
        s.cylinder(guardR, guardR, guardTop - 0.02, [0, (guardTop + 0.02) / 2, 0], clear, 32);
        s.cylinder(guardR, guardR, 0.008, [0, guardTop, 0], clear, 32);
      } else if (a.guarding === 'bars') {
        for (let i = 0; i < faces; i++) {
          const angle = i / faces * Math.PI * 2;
          s.rod([Math.cos(angle) * guardR, 0.02, Math.sin(angle) * guardR], [Math.cos(angle) * guardR, guardTop, Math.sin(angle) * guardR], 0.0035, trim);
        }
        s.mesh(new THREE.TorusGeometry(guardR, 0.0035, 6, 32), trim, [0, guardTop, 0]).rotation.x = Math.PI / 2;
      } else {
        for (const side of [-1, 1]) {
          s.box([guardR * 2, guardTop - 0.02, 0.004], [0, (guardTop + 0.02) / 2, side * guardR], clear);
          s.box([0.004, guardTop - 0.02, guardR * 2], [side * guardR, (guardTop + 0.02) / 2, 0], clear);
          for (const back of [-1, 1]) s.rod([side * guardR, 0.02, back * guardR], [side * guardR, guardTop, back * guardR], 0.004, trim);
        }
        s.box([guardR * 2, 0.004, guardR * 2], [0, y0 + colH + 0.02, 0], clear);
        s.box([0.014, 0.021, 0.008], [0.03, y0 + 0.08, guardR + 0.006], trim);
      }
    }
    if (a.packing === 'bags') {
      const kraft = s.material('#caad80');
      for (let i = 0; i < 3; i++) {
        const x = -0.22 + i * 0.025, z = 0.06 + i * 0.012;
        s.box([0.065, 0.085, 0.025], [x, 0.043, z], kraft);
        s.tube([[x - 0.018, 0.08, z], [x - 0.018, 0.108, z], [x + 0.018, 0.108, z], [x + 0.018, 0.08, z]], 0.0018, trim);
      }
    } else if (a.packing === 'boxes') {
      const velvet = s.material('#67233f');
      s.box([0.09, 0.028, 0.07], [-0.2, 0.014, 0.08], body);
      s.box([0.08, 0.006, 0.06], [-0.2, 0.032, 0.08], velvet);
      s.box([0.09, 0.01, 0.07], [-0.2, 0.061, 0.035], body).rotation.x = -1.1;
      s.box([0.06, 0.028, 0.06], [-0.15, 0.014, -0.05], body);
    } else if (a.packing === 'pouches') {
      for (let i = 0; i < 3; i++) {
        const x = -0.21 + i * 0.035, z = 0.06 - i * 0.034;
        s.ball([0.035, 0.012, 0.045], [x, 0.012, z], s.material(['#6e3844', '#496f66', '#c7a574'][i]), 12);
        s.rod([x - 0.025, 0.02, z - 0.03], [x + 0.025, 0.02, z - 0.03], 0.0018, trim);
      }
    }
    if (a.movement === 'seized') s.box([0.035, 0.018, 0.025], [0.05, 0.063, 0], s.material('#ae7f45')).rotation.z = 0.25;
    const speed = a.movement === 'free' ? mix(0, 0.9, mood.energy) : 0;
    const rest = spin.rotation.y;
    return s.finish({ update: (dt, time) => { if (a.movement === 'swinging') spin.rotation.y = rest + Math.sin(time * 0.8) * (0.05 + mood.energy * 0.16); else spin.rotation.y += dt * speed; } });
  },
});
