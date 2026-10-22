import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, grime, paintTexture, painted, put, roundedBox, write } from './lib';

const SIGNS = { popcorn: 'POPCORN', fresh: 'FRESH POPCORN', hot: 'HOT BUTTERED', dime: 'POPCORN 10¢' } as const;

export default defineThing({
  questions: {
    style: choice('What kind of cart is it?', {
      wagon: 'An antique red-and-gold popcorn wagon with big spoked wheels and a peaked roof.',
      fifties: 'A cream-and-red 1950s lobby machine with rounded corners, chrome trim and small rubber wheels.',
      steel: 'A plain stainless rental machine on casters with a flat lit header.',
    }),
    heap: score('How much popcorn is in the glass case?', ['Scraped empty, a few old maids', 'A drift in one corner', 'Half full', 'Heaped up to the kettle']),
    kettle: choice('What is the kettle doing?', {
      popping: 'Upright and popping, the lid lifting as corn spills over the rim.',
      tipped: 'Tipped right over, dumping a fresh batch.',
      cold: 'Hanging cold and empty.',
    }),
    sign: choice('What does its sign say?', { popcorn: 'POPCORN', fresh: 'FRESH POPCORN', hot: 'HOT BUTTERED', dime: 'POPCORN 10¢' }),
    shelf: choice('What is on the serving shelf?', {
      bags: 'A row of red-and-white striped paper bags, filled and ready.',
      boxes: 'Tall striped cardboard boxes, the cinema kind.',
      last: 'One last lonely bag.',
      nothing: 'Nothing but salt and a scoop.',
    }),
    bulb: noul('Is the warming bulb inside lit?'),
    spilled: noul('Has popcorn been spilled on the ground around it?'),
    minding: choice('Who is minding it?', {
      nobody: 'Nobody in sight.',
      apron: 'Nobody right now: an apron and a paper hat hang on the push handle.',
      note: 'A hand-lettered BACK IN 5 MIN card is propped in the glass.',
      jar: 'An honesty jar of coins sits on the shelf instead of a person.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const worn = (colour: string, amount = 0.35) => new THREE.Color(colour).lerp(new THREE.Color('#84735c'), mood.wear * amount);
    const wagon = a.style === 'wagon', fifties = a.style === 'fifties';
    const red = mood.cheer > 0.35 ? '#cf2f27' : '#9c3a32';
    const bodyColour = wagon ? red : fifties ? '#efe6cc' : '#b9bfc0';
    const body = s.material(worn(bodyColour), { metalness: a.style === 'steel' ? 0.75 : 0.15, roughness: a.style === 'steel' ? 0.35 : 0.5 });
    const trim = s.material(worn(wagon ? '#d9b04a' : '#dfe4e6', 0.4), { metalness: 0.85, roughness: 0.28 });
    const redMat = s.material(worn(red), { roughness: 0.5 });
    const dark = s.material('#1f2022', { roughness: 0.8 });
    const BW = 0.9, BD = 0.56, base = wagon ? 0.58 : 0.5, cab = wagon ? 0.42 : 0.55, glassH = 0.62;
    const deck = base + cab, top = deck + glassH;

    // Lower cabinet with a painted front panel.
    s.mesh(roundedBox(BW, cab, BD, fifties ? 0.08 : 0.02), body, [0, base + cab / 2, 0]);
    const text = SIGNS[a.sign];
    const panel = painted(BW - 0.12, cab - 0.12, (ctx, w, h) => {
      ctx.fillStyle = `#${worn(wagon ? red : fifties ? red : '#2a2d31').getHexString()}`; ctx.fillRect(0, 0, w, h);
      const gold = wagon ? '#f1cf6a' : '#fbf5e2';
      ctx.strokeStyle = gold; ctx.lineWidth = h * 0.035; ctx.strokeRect(h * 0.07, h * 0.07, w - h * 0.14, h - h * 0.14);
      if (wagon) for (const [x, y] of [[0.1, 0.2], [0.9, 0.2], [0.1, 0.8], [0.9, 0.8]]) { ctx.beginPath(); ctx.arc(w * x, h * y, h * 0.1, 0, 7); ctx.stroke(); }
      const words = text.split(' ');
      if (words.length > 1 && wagon) { write(ctx, words[0], w / 2, h * 0.34, h * 0.24, gold, { max: w * 0.7, font: 'italic bold', face: 'Georgia, serif' }); write(ctx, words.slice(1).join(' '), w / 2, h * 0.66, h * 0.3, gold, { max: w * 0.74, face: 'Georgia, serif' }); }
      else write(ctx, text, w / 2, h * 0.52, h * 0.34, gold, { max: w * 0.76, face: wagon ? 'Georgia, serif' : undefined });
      grime(ctx, w, h, mood.wear * 0.8, random);
    }, { px: 384 });
    put(s.root, panel, [0, base + cab / 2, BD / 2 + 0.004]);
    s.box([BW + 0.04, 0.03, BD + 0.04], [0, deck + 0.005, 0], trim);

    // Undercarriage.
    if (wagon) {
      const wheelX = -0.12, R = 0.37;
      const wheelMat = s.material(worn('#e2b93f', 0.4), { roughness: 0.55 });
      for (const side of [-1, 1]) {
        const wheel = put(s.root, new THREE.Group(), [wheelX, R, side * (BD / 2 + 0.07)]);
        put(wheel, new THREE.Mesh(new THREE.TorusGeometry(R - 0.025, 0.025, 8, 36), wheelMat));
        put(wheel, new THREE.Mesh(new THREE.TorusGeometry(R - 0.003, 0.012, 6, 36), dark));
        put(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 14), redMat)).rotation.x = Math.PI / 2;
        for (let i = 0; i < 12; i++) {
          const spoke = put(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, R - 0.05, 6), i % 2 ? wheelMat : redMat));
          spoke.rotation.z = (i / 12) * Math.PI * 2;
          spoke.position.set(-Math.sin(spoke.rotation.z) * (R - 0.05) / 2, Math.cos(spoke.rotation.z) * (R - 0.05) / 2, 0);
        }
        wheel.rotation.z = random() * 0.5;
      }
      s.rod([wheelX, R, -BD / 2 - 0.07], [wheelX, R, BD / 2 + 0.07], 0.02, dark);
      s.box([0.08, base - R, 0.3], [wheelX, (base + R) / 2, 0], dark);
      for (const z of [-0.2, 0.2]) { s.rod([0.38, base, z], [0.4, 0, z], 0.02, trim); s.cylinder(0.035, 0.035, 0.02, [0.4, 0.01, z], dark, 10); }
      // Push handles.
      for (const z of [-0.2, 0.2]) s.rod([-BW / 2, base + 0.25, z], [-BW / 2 - 0.34, base + 0.42, z], 0.014, trim);
      s.rod([-BW / 2 - 0.34, base + 0.42, -0.24], [-BW / 2 - 0.34, base + 0.42, 0.24], 0.018, s.material('#5a3a25'));
    } else {
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * (BW / 2 - 0.07), base, z * (BD / 2 - 0.07)], [x * (BW / 2 - 0.05), 0.1, z * (BD / 2 - 0.05)], 0.022, trim);
        const tyre = s.mesh(new THREE.CylinderGeometry(fifties ? 0.1 : 0.06, fifties ? 0.1 : 0.06, 0.05, 16), dark, [x * (BW / 2 - 0.05), fifties ? 0.1 : 0.06, z * (BD / 2 - 0.05)]);
        tyre.rotation.x = Math.PI / 2;
        if (!fifties) tyre.rotation.y = random() * 3;
      }
      s.box([BW - 0.1, 0.02, BD - 0.1], [0, 0.22, 0], trim);
      s.rod([-BW / 2 - 0.12, base + cab - 0.06, -0.22], [-BW / 2 - 0.12, base + cab - 0.06, 0.22], 0.016, trim);
      for (const z of [-0.22, 0.22]) s.rod([-BW / 2, base + cab - 0.06, z], [-BW / 2 - 0.12, base + cab - 0.06, z], 0.012, trim);
    }

    // Glass case: corner posts, panes that are not measured as solid, and a crack if it has had a life.
    const glass = new THREE.MeshPhysicalMaterial({ color: mood.wear > 0.6 ? '#e9e2c8' : '#ffffff', transparent: true, opacity: mix(0.14, 0.3, mood.wear), roughness: 0.05, depthWrite: false });
    s.box([BW - 0.03, glassH, BD - 0.03], [0, deck + glassH / 2, 0], glass).castShadow = false;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.03, glassH, 0.03], [x * (BW / 2 - 0.015), deck + glassH / 2, z * (BD / 2 - 0.015)], trim);
    s.box([BW, 0.03, BD], [0, deck + 0.03, 0], trim);
    if (mood.wear > 0.55) {
      const crack = s.material('#f4f4f0', { roughness: 0.3 });
      let cx = (random() - 0.5) * 0.5, cy = deck + 0.1;
      for (let i = 0; i < 5; i++) { const nx = cx + (random() - 0.5) * 0.22, ny = cy + 0.06 + random() * 0.08; s.rod([cx, cy, BD / 2 - 0.01], [nx, ny, BD / 2 - 0.01], 0.003, crack); cx = nx; cy = ny; }
    }

    // Roof and header.
    if (wagon) {
      const gable = new THREE.Shape();
      gable.moveTo(-BD / 2 - 0.08, 0); gable.lineTo(BD / 2 + 0.08, 0); gable.lineTo(0, 0.24); gable.closePath();
      const roofGeometry = new THREE.ExtrudeGeometry(gable, { depth: BW + 0.16, bevelEnabled: false });
      roofGeometry.rotateY(Math.PI / 2);
      roofGeometry.translate(-(BW + 0.16) / 2, 0, 0);
      const stripes = paintTexture(128, 64, (ctx, w, h) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f6f0dc' : red; ctx.fillRect((i / 8) * w, 0, w / 8 + 1, h); } grime(ctx, w, h, mood.wear * 0.7, random); });
      stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping; stripes.repeat.set(2.2, 2.2);
      s.mesh(roofGeometry, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 }), [0, top + 0.03, 0]);
      s.box([BW + 0.18, 0.035, BD + 0.18], [0, top + 0.015, 0], trim);
      const scallop = new THREE.Shape();
      const n = 9, sw = (BW + 0.16) / n;
      scallop.moveTo(0, 0);
      for (let i = 0; i < n; i++) scallop.absarc((i + 0.5) * sw, 0, sw / 2, Math.PI, 0, false);
      scallop.lineTo(n * sw, 0);
      const valance = new THREE.ExtrudeGeometry(scallop, { depth: 0.01, bevelEnabled: false });
      valance.translate(-(BW + 0.16) / 2, 0, 0);
      for (const z of [-1, 1]) s.mesh(valance, redMat, [0, top, z * (BD / 2 + 0.085)]);
      s.ball([0.03, 0.045, 0.03], [0, top + 0.3, 0], trim, 10);
    } else if (fifties) {
      const hood = new THREE.CylinderGeometry(BD / 2 + 0.02, BD / 2 + 0.02, BW + 0.04, 24, 1, false, 0, Math.PI);
      hood.rotateZ(Math.PI / 2);
      hood.rotateX(-Math.PI / 2);
      const cap = s.mesh(hood, redMat, [0, top, 0]);
      cap.scale.y = 0.45;
      s.box([BW + 0.06, 0.03, BD + 0.06], [0, top, 0], trim);
      const header = painted(BW * 0.8, 0.13, (ctx, w, h) => { ctx.fillStyle = '#fbf5e2'; ctx.fillRect(0, 0, w, h); write(ctx, text, w / 2, h * 0.54, h * 0.72, red, { max: w * 0.92 }); }, { px: 384, glow: a.bulb ? 0.6 : 0.05 });
      put(s.root, header, [0, top + 0.1, BD / 2 + 0.0]).rotation.x = -0.35;
    } else {
      s.box([BW + 0.02, 0.2, BD + 0.02], [0, top + 0.1, 0], body);
      const header = painted(BW - 0.06, 0.15, (ctx, w, h) => { ctx.fillStyle = '#f7d25a'; ctx.fillRect(0, 0, w, h); write(ctx, text, w / 2, h * 0.54, h * 0.7, '#b02a22', { max: w * 0.92 }); grime(ctx, w, h, mood.wear * 0.5, random); }, { px: 384, glow: a.bulb ? 0.8 : 0.05 });
      put(s.root, header, [0, top + 0.1, BD / 2 + 0.012]);
    }

    // The heap: a mound against one side with loose kernels over it.
    const corn = s.material('#f6e6b0', { roughness: 0.95 });
    const heapH = mix(0.015, 0.36, a.heap), heapX = a.heap < 0.45 ? mix(0.25, 0, a.heap / 0.45) : 0;
    if (a.heap > 0.08) {
      const mound = s.ball([mix(0.16, 0.48, a.heap), heapH, mix(0.14, 0.27, a.heap)], [heapX, deck + 0.04, 0], corn, 16);
      mound.castShadow = false;
    }
    const kernelColours = ['#fbf2cf', '#f3dc8f', '#fff9e6', '#e9c96a'];
    const kernels: { at: P3; size: number; color: string }[] = [];
    const count = Math.round(mix(10, 240, a.heap));
    for (let i = 0; i < count; i++) {
      const u = random() * Math.PI * 2, v = Math.sqrt(random());
      const rx = mix(0.16, 0.44, a.heap) * v, rz = mix(0.14, 0.25, a.heap) * v;
      kernels.push({ at: [Math.max(-BW / 2 + 0.05, Math.min(BW / 2 - 0.05, heapX + Math.cos(u) * rx)), deck + 0.055 + heapH * Math.sqrt(Math.max(0, 1 - v * v)) * (a.heap > 0.08 ? 1 : 0), Math.sin(u) * rz], size: 0.016 + random() * 0.012, color: kernelColours[Math.floor(random() * 4)] });
    }

    // Kettle on its yoke.
    const pivot = put(s.root, new THREE.Group(), [-0.05, top - 0.2, 0]);
    const potMat = s.material(worn('#c9cdcc', 0.5), { metalness: 0.85, roughness: 0.25 });
    put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.13, 20), potMat), [0, -0.02, 0]);
    put(pivot, new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 20), potMat), [0, 0.045, 0]).rotation.x = Math.PI / 2;
    const lid = put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.012, 20, 1, false, 0, Math.PI), potMat), [0, 0.055, 0]);
    put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6), dark), [0.17, 0, 0]).rotation.z = Math.PI / 2;
    for (const z of [-0.13, 0.13]) s.rod([-0.05, top, z], [-0.05, top - 0.2, z], 0.008, trim);
    s.rod([-0.05, top - 0.2, -0.13], [-0.05, top - 0.2, 0.13], 0.006, trim);
    s.cylinder(0.03, 0.03, 0.14, [-0.05, top - 0.07, 0], dark, 8);
    if (a.kettle === 'tipped') {
      pivot.rotation.z = -1.9;
      for (let i = 0; i < 26; i++) kernels.push({ at: [0.1 + random() * 0.12, top - 0.26 - random() * Math.max(0.05, glassH - heapH - 0.3), (random() - 0.5) * 0.16], size: 0.018 + random() * 0.012, color: kernelColours[Math.floor(random() * 4)] });
    }
    const popping: number[] = [];
    if (a.kettle === 'popping') {
      lid.rotation.z = 0.5;
      for (let i = 0; i < 22; i++) { popping.push(kernels.length); kernels.push({ at: [-0.05 + (random() - 0.5) * 0.24, top - 0.14 + random() * 0.1, (random() - 0.5) * 0.24], size: 0.018 + random() * 0.01, color: kernelColours[Math.floor(random() * 4)] }); }
    }
    if (a.spilled) {
      const n = Math.round(mix(18, 70, mood.density));
      for (let i = 0; i < n; i++) { const r = 0.35 + random() * 0.6, t = random() * Math.PI * 2; kernels.push({ at: [Math.cos(t) * r * 1.1, 0.012, Math.sin(t) * r * 0.9 + 0.2], size: 0.016 + random() * 0.012, color: kernelColours[Math.floor(random() * 4)] }); }
    }
    const cloud = s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.95 }), kernels);

    // Warming bulb.
    const bulbMat = new THREE.MeshStandardMaterial({ color: a.bulb ? '#fff0c9' : '#8d8a80', emissive: mood.warmth > 0.3 ? '#ffae3d' : '#ffe9a8', emissiveIntensity: a.bulb ? 2.2 : 0 });
    s.cylinder(0.02, 0.02, 0.04, [0.3, top - 0.03, -0.12], dark, 8);
    s.ball([0.04, 0.05, 0.04], [0.3, top - 0.09, -0.12], bulbMat, 12);
    if (a.bulb) {
      const wash = s.box([BW - 0.06, 0.004, BD - 0.06], [0, deck + 0.048, 0], new THREE.MeshStandardMaterial({ color: '#f1cf83', emissive: '#ffb347', emissiveIntensity: 0.55, roughness: 1 }));
      wash.castShadow = false;
      corn.emissive = new THREE.Color('#ff9d2e'); corn.emissiveIntensity = 0.28;
    }

    // Serving shelf, bags and boxes.
    const shelfZ = BD / 2 + 0.09;
    s.box([BW * 0.9, 0.02, 0.18], [0, deck - 0.02, shelfZ], trim);
    for (const x of [-0.3, 0.3]) s.rod([x, deck - 0.03, shelfZ + 0.06], [x, deck - 0.16, BD / 2], 0.008, trim);
    const striped = paintTexture(64, 64, (ctx, w, h) => { for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fbf7ea' : red; ctx.fillRect((i / 6) * w, 0, w / 6 + 1, h); } });
    const paper = new THREE.MeshStandardMaterial({ map: striped, roughness: 0.85 });
    const tall = a.shelf === 'boxes';
    const servings = a.shelf === 'nothing' ? 0 : a.shelf === 'last' ? 1 : Math.round(mix(3, 7, mood.density));
    for (let i = 0; i < servings; i++) {
      const x = servings === 1 ? 0.18 : -0.34 + (i / Math.max(1, servings - 1)) * 0.52 + (random() - 0.5) * 0.02;
      const h = tall ? 0.19 : 0.14;
      const bag = s.mesh(new THREE.CylinderGeometry(tall ? 0.05 : 0.045, tall ? 0.035 : 0.04, h, 4), paper, [x, deck - 0.01 + h / 2, shelfZ]);
      bag.rotation.y = Math.PI / 4 + (random() - 0.5) * 0.3;
      if (!tall) bag.scale.z = 0.7;
      s.ball([0.045, 0.035, 0.035], [x, deck - 0.01 + h + 0.01, shelfZ], corn, 8);
    }
    s.cylinder(0.022, 0.022, 0.07, [0.38, deck + 0.025, shelfZ], s.material('#f4f1e8', { metalness: 0.3 }), 10);
    s.cylinder(0.024, 0.024, 0.015, [0.38, deck + 0.065, shelfZ], trim, 10);
    if (a.minding === 'jar') {
      s.cylinder(0.045, 0.045, 0.1, [0.27, deck + 0.04, shelfZ + 0.02], new THREE.MeshPhysicalMaterial({ color: '#dff1ee', transparent: true, opacity: 0.45, roughness: 0.1 }), 14);
      s.cylinder(0.04, 0.04, 0.03 + mood.density * 0.04, [0.27, deck + 0.01, shelfZ + 0.02], s.material('#c9a13a', { metalness: 0.9, roughness: 0.3 }), 14);
    }
    if (a.minding === 'note') {
      const card = painted(0.24, 0.15, (ctx, w, h) => { ctx.fillStyle = '#f7f2dc'; ctx.fillRect(0, 0, w, h); write(ctx, 'BACK IN', w / 2, h * 0.3, h * 0.3, '#28303a', { max: w * 0.86, tilt: -0.04, font: 'italic bold', face: 'Georgia, serif' }); write(ctx, '5 MIN', w / 2, h * 0.7, h * 0.36, '#b02a22', { max: w * 0.86, tilt: -0.04, font: 'italic bold', face: 'Georgia, serif' }); }, { px: 256 });
      card.rotation.z = (random() - 0.5) * 0.25;
      put(s.root, card, [-0.2, deck + 0.3, BD / 2 + 0.002]);
    }
    if (a.minding === 'apron') {
      const hx = -BW / 2 - (wagon ? 0.34 : 0.13), hy = wagon ? base + 0.42 : base + cab - 0.06;
      const cloth = s.material(worn('#f4f1e6', 0.5), { roughness: 1, side: THREE.DoubleSide });
      const apron = s.mesh(new THREE.PlaneGeometry(0.3, 0.5, 4, 6), cloth, [hx - 0.012, hy - 0.25, 0.02]);
      apron.rotation.y = Math.PI / 2;
      const pos = apron.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 20) * 0.012 + Math.sin(pos.getY(i) * 9) * 0.01);
      apron.geometry.computeVertexNormals();
      const hat = s.mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.07, 14, 1, true), cloth, [hx, hy + 0.045, -0.12]);
      hat.scale.z = 0.45; hat.rotation.y = 0.3;
      s.box([0.02, 0.012, 0.19], [hx, hy + 0.02, -0.12], redMat).rotation.y = 0.3;
    }

    const base0 = popping.map((index) => kernels[index].at);
    const matrix = new THREE.Matrix4();
    const speed = mix(1.5, 7, mood.energy);
    return s.finish({
      footprint: 0.7,
      update: (_dt, time) => {
        popping.forEach((index, i) => {
          const phase = (time * speed * (0.6 + (i % 5) * 0.13) + i * 0.37) % 1;
          const [x, y, z] = base0[i];
          const size = kernels[index].size;
          matrix.makeScale(size, size, size).setPosition(x + Math.sin(i * 7.1) * phase * 0.05, y + Math.sin(phase * Math.PI) * 0.09, z + Math.cos(i * 3.3) * phase * 0.05);
          cloud.setMatrixAt(index, matrix);
        });
        if (popping.length) { cloud.instanceMatrix.needsUpdate = true; lid.rotation.z = 0.4 + Math.abs(Math.sin(time * speed * 2)) * 0.25; }
        if (a.bulb && mood.wear > 0.6) bulbMat.emissiveIntensity = Math.sin(time * 17) > -0.8 ? 2.2 : 0.4;
      },
    });
  },
});
