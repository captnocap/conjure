import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    page: choice('What does the open page show?', {
      circle: 'A red and black summoning circle: rings, a star and crowded runes.',
      beast: 'A bestiary plate: a coiled green dragon with spread wings.',
      stars: 'A midnight-blue star chart with gold constellations.',
      eye: 'One enormous painted eye that stares straight out of the page.',
      door: 'A black arched doorway with light spilling from it.',
      blank: 'Nothing: the ink has drained away and both pages are bare.',
      torn: 'The crucial page has been ripped out, leaving a ragged stub.',
    }),
    chain: choice('What state is the chain in?', {
      locked: 'Locked: a heavy chain runs from the book to an iron ring, with a fat padlock.',
      broken: 'Broken: snapped links dangle from the book and the rest lies heaped on the floor.',
      straining: 'Straining: the book has lifted off the desk and pulls two chains taut.',
      open: 'Unlocked: the padlock hangs open on its ring and the chain is coiled aside.',
    }),
    lectern: choice('What is the lectern?', {
      eagle: 'Dark carved oak with a spread-winged eagle holding up the desk.',
      stone: 'A twisted grey stone column with a slab desk, cold and churchly.',
      iron: 'A spindly black iron tripod with clawed feet and scrollwork.',
      stack: 'Improvised: a teetering tower of other books and a crate.',
    }),
    binding: choice('How is the grimoire bound?', {
      black: 'Cracked black leather with iron corners.',
      red: 'Blood-red scaled hide with brass bosses.',
      vellum: 'Pale vellum tooled in gold.',
      green: 'Mould-green cloth with tarnished clasps, damp-looking.',
    }),
    candle: choice('What is the candle doing?', {
      burning: 'One tall candle burning with a steady flame.',
      guttered: 'A guttered stub in a pool of wax, a thread of smoke.',
      many: 'A crowd of half-melted candles fused along the desk edge.',
      none: 'No candle; the page gives its own light or none.',
    }),
    alive: choice('Is the book doing anything on its own?', {
      still: 'It lies still, like any book.',
      fluttering: 'Its pages lift and riffle with no wind.',
      glowing: 'The illumination glows and bright glyphs drift up off the page.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const theta = 0.62, C = new THREE.Vector3(0, 1.16, 0);
    const lifted = a.chain === 'straining';
    const bookLift = lifted ? 0.26 : 0;
    const coverHex = { black: '#26211f', red: '#7a1820', vellum: '#d9cba4', green: '#3f5a3a' }[a.binding];
    const metalHex = { black: '#4a4a4e', red: '#c09a44', vellum: '#d4a838', green: '#6f8a6a' }[a.binding];
    const cover = s.material(coverHex, { roughness: 0.7 });
    const fitting = s.material(metalHex, { metalness: 0.7, roughness: 0.4 });
    const iron = s.material('#2b2a2c', { metalness: 0.5, roughness: 0.6 });
    const wax = s.material('#e9dfbf', { roughness: 0.5 });

    // The lectern.
    const desk = new THREE.Group(); desk.position.copy(C); desk.rotation.x = theta; s.root.add(desk);
    const onDesk = (mesh: THREE.Object3D) => { desk.add(mesh); return mesh; };
    let ringAt: P3 = [0.2, 0.5, 0.12];
    if (a.lectern === 'eagle') {
      const oak = s.material('#4f3421'), gilt = s.material('#b98f3c', { metalness: 0.5, roughness: 0.45 });
      s.box([0.62, 0.07, 0.62], [0, 0.035, 0], oak); s.box([0.46, 0.06, 0.46], [0, 0.1, 0], oak);
      s.lathe([[0, 0.13], [0.16, 0.13], [0.09, 0.2], [0.07, 0.36], [0.11, 0.42], [0.06, 0.5], [0.075, 0.7], [0.12, 0.74], [0.13, 0.78], [0, 0.78]], oak);
      s.ball([0.15, 0.15, 0.15], [0, 0.9, 0], gilt, 16);
      s.ball([0.13, 0.2, 0.15], [0, 1.04, 0.02], oak, 14);
      s.ball([0.075, 0.085, 0.085], [0, 1.02, 0.34], oak, 12);
      s.rod([0, 1.02, 0.1], [0, 1.02, 0.3], 0.07, oak, 0.06);
      const beak = s.mesh(new THREE.ConeGeometry(0.035, 0.11, 8), gilt, [0, 0.98, 0.43]); beak.rotation.x = 2.2;
      for (const x of [-1, 1]) s.ball([0.016, 0.016, 0.016], [x * 0.05, 1.05, 0.4], gilt, 8);
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.5, 0.2); shape.lineTo(0.56, 0.02); shape.lineTo(0.45, -0.02); shape.lineTo(0.46, -0.16); shape.lineTo(0.34, -0.12); shape.lineTo(0.33, -0.26); shape.lineTo(0.2, -0.2); shape.lineTo(0.16, -0.32); shape.lineTo(0, -0.22);
        const wing = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false }), gilt, [side * 0.06, 1.04, -0.02]);
        wing.rotation.set(theta - Math.PI / 2 + 0.25, 0, 0); wing.scale.x = side;
      }
      onDesk(s.box([0.86, 0.035, 0.62], [0, -0.02, 0], oak)); onDesk(s.box([0.86, 0.06, 0.035], [0, 0.01, 0.31], gilt));
      ringAt = [0.09, 0.56, 0.06];
    } else if (a.lectern === 'stone') {
      const stone = s.material('#9a9a94', { roughness: 0.9 });
      s.box([0.6, 0.1, 0.6], [0, 0.05, 0], stone); s.cylinder(0.2, 0.26, 0.08, [0, 0.14, 0], stone, 8);
      for (let i = 0; i < 16; i++) s.box([0.2, 0.052, 0.2], [0, 0.205 + i * 0.05, 0], stone).rotation.y = i * 0.2;
      s.cylinder(0.26, 0.15, 0.1, [0, 1.03, 0], stone, 8);
      onDesk(s.box([0.88, 0.07, 0.64], [0, -0.035, 0], stone)); onDesk(s.box([0.88, 0.07, 0.05], [0, 0.02, 0.32], stone));
      ringAt = [0.15, 0.6, 0.1];
    } else if (a.lectern === 'iron') {
      for (let i = 0; i < 3; i++) {
        const t = i * 2.094 + Math.PI / 2, cx = Math.cos(t), cz = Math.sin(t);
        s.tube([[cx * 0.42, 0.02, cz * 0.42], [cx * 0.3, 0.16, cz * 0.3], [cx * 0.08, 0.5, cz * 0.08], [0, 0.72, 0]], 0.018, iron);
        s.ball([0.045, 0.03, 0.045], [cx * 0.43, 0.03, cz * 0.43], iron, 10);
        s.ring(0.07, 0.008, [cx * 0.17, 0.5, cz * 0.17], iron).rotation.y = -t;
      }
      s.cylinder(0.022, 0.022, 0.4, [0, 0.9, 0], iron, 10); s.ball([0.05, 0.05, 0.05], [0, 0.72, 0], iron, 10);
      for (const x of [-0.42, 0.42]) onDesk(s.box([0.025, 0.025, 0.62], [x, -0.015, 0], iron));
      for (const z of [-0.3, 0, 0.3]) onDesk(s.box([0.86, 0.025, 0.025], [0, -0.015, z], iron));
      onDesk(s.box([0.86, 0.07, 0.02], [0, 0.02, 0.31], iron));
      for (const x of [-0.43, 0.43]) onDesk(s.ring(0.05, 0.008, [x, 0.03, -0.31], iron));
      ringAt = [0.03, 0.72, 0.03];
    } else {
      s.box([0.6, 0.42, 0.5], [0, 0.21, 0], s.material('#7a5d3c'));
      for (const y of [0.08, 0.34]) s.box([0.62, 0.03, 0.52], [0, y, 0], s.material('#5d4429'));
      let y = 0.42;
      for (let i = 0; i < 9; i++) {
        const h = 0.05 + random() * 0.045, w = 0.36 + random() * 0.16;
        const tome = s.box([w, h, w * 0.75], [(random() - 0.5) * 0.07, y + h / 2, (random() - 0.5) * 0.06], s.material(['#6a2a2a', '#2a4a5a', '#5a4a2a', '#3a3a52', '#3f5a3a', '#73512e'][i % 6]));
        tome.rotation.y = (random() - 0.5) * 0.5;
        s.box([w * 0.94, h * 0.7, w * 0.72], [tome.position.x + 0.015, y + h / 2, tome.position.z], s.material('#e3d7b4')).rotation.y = tome.rotation.y;
        y += h;
      }
      s.box([0.3, 1.16 - y - 0.19, 0.2], [0, (1.16 - 0.19 + y) / 2, -0.05], s.material('#5d4429'));
      onDesk(s.box([0.86, 0.03, 0.62], [0, -0.018, 0], s.material('#7a5d3c'))); onDesk(s.box([0.86, 0.05, 0.03], [0, 0.01, 0.31], s.material('#5d4429')));
      ringAt = [0.31, 0.3, 0.12];
    }

    // Page paintings.
    const paint = (side: 'left' | 'right') => {
      const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 512;
      const g = canvas.getContext('2d')!;
      g.fillStyle = mood.wear > 0.6 ? '#d6c69a' : '#eadfbd'; g.fillRect(0, 0, 384, 512);
      const bare = a.page === 'blank';
      const text = (x0: number, y0: number, x1: number, y1: number) => { g.strokeStyle = bare ? 'rgba(90,70,50,0.12)' : '#2b2118'; g.lineWidth = 3; for (let y = y0; y < y1; y += 15) { g.beginPath(); let x = x0; while (x < x1 - 12) { const w = 8 + random() * 22; g.moveTo(x, y); g.lineTo(Math.min(x + w, x1), y); x += w + 6; } g.stroke(); } };
      if (!bare) { g.strokeStyle = '#a3262a'; g.lineWidth = 6; g.strokeRect(18, 18, 348, 476); g.strokeStyle = '#c9a23a'; g.lineWidth = 3; g.strokeRect(28, 28, 328, 456); }
      if (side === 'left' || bare || a.page === 'torn') {
        if (!bare) { g.fillStyle = '#a3262a'; g.fillRect(44, 48, 96, 96); g.fillStyle = '#e9c24a'; g.font = 'bold 84px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AMSVO'[Math.floor(random() * 5)], 92, 100); g.fillStyle = '#2f5a9a'; for (let i = 0; i < 6; i++) g.fillRect(44 + i * 17, 150, 9, 9); }
        text(152, 58, 340, 150); text(44, 176, 340, 470);
        return canvas;
      }
      const cx = 192, cy = 230;
      if (a.page === 'circle') {
        g.strokeStyle = '#8a1418'; g.lineWidth = 7; for (const r of [150, 128, 70]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
        g.strokeStyle = '#17120f'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 5; i++) { const t = i * 4 * Math.PI / 5 - Math.PI / 2; g.lineTo(cx + Math.cos(t) * 126, cy + Math.sin(t) * 126); } g.stroke();
        g.fillStyle = '#17120f'; g.font = 'bold 20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < 18; i++) { const t = i / 18 * 6.283; g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i % 12], cx + Math.cos(t) * 139, cy + Math.sin(t) * 139); }
        g.fillStyle = '#8a1418'; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
      } else if (a.page === 'beast') {
        g.fillStyle = '#cfe0b8'; g.fillRect(44, 60, 296, 330);
        g.strokeStyle = '#2f7a3a'; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(90, 350); g.bezierCurveTo(330, 360, 300, 230, 190, 240); g.bezierCurveTo(70, 250, 110, 120, 250, 120); g.stroke();
        g.fillStyle = '#2f7a3a'; g.beginPath(); g.ellipse(275, 112, 44, 26, -0.2, 0, 7); g.fill();
        g.fillStyle = '#b8342a'; g.beginPath(); g.moveTo(170, 235); g.lineTo(60, 110); g.lineTo(110, 200); g.lineTo(50, 190); g.lineTo(120, 250); g.fill(); g.beginPath(); g.moveTo(215, 235); g.lineTo(330, 170); g.lineTo(290, 235); g.lineTo(335, 250); g.lineTo(250, 265); g.fill();
        g.fillStyle = '#f2d24a'; g.beginPath(); g.arc(288, 104, 7, 0, 7); g.fill();
        g.strokeStyle = '#e8862a'; g.lineWidth = 6; g.beginPath(); g.moveTo(316, 118); g.lineTo(350, 140); g.moveTo(316, 110); g.lineTo(352, 112); g.stroke();
      } else if (a.page === 'stars') {
        g.fillStyle = '#16224e'; g.fillRect(40, 44, 304, 372);
        const pts = Array.from({ length: 9 }, () => [60 + random() * 264, 64 + random() * 332] as const);
        g.strokeStyle = '#e8c85a'; g.lineWidth = 3; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        g.fillStyle = '#f6e08a'; for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
        g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) g.fillRect(44 + random() * 296, 48 + random() * 364, 3, 3);
        g.fillStyle = '#f2ecd0'; g.beginPath(); g.arc(300, 90, 26, 0, 7); g.fill(); g.fillStyle = '#16224e'; g.beginPath(); g.arc(312, 82, 24, 0, 7); g.fill();
      } else if (a.page === 'eye') {
        g.fillStyle = '#f4efe0'; g.strokeStyle = '#17120f'; g.lineWidth = 8; g.beginPath(); g.moveTo(40, cy); g.quadraticCurveTo(cx, cy - 170, 344, cy); g.quadraticCurveTo(cx, cy + 170, 40, cy); g.fill(); g.stroke();
        g.fillStyle = '#d49a1e'; g.beginPath(); g.arc(cx, cy, 72, 0, 7); g.fill(); g.strokeStyle = '#7a3a12'; g.lineWidth = 4; for (let i = 0; i < 24; i++) { const t = i / 24 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(t) * 30, cy + Math.sin(t) * 30); g.lineTo(cx + Math.cos(t) * 70, cy + Math.sin(t) * 70); g.stroke(); }
        g.fillStyle = '#0c0a0a'; g.beginPath(); g.ellipse(cx, cy, 16, 56, 0, 0, 7); g.fill();
        g.strokeStyle = '#17120f'; g.lineWidth = 5; for (let i = 0; i < 9; i++) { const x = 70 + i * 31; g.beginPath(); g.moveTo(x, cy - 100 + Math.abs(i - 4) * 14); g.lineTo(x + (i - 4) * 5, cy - 140 + Math.abs(i - 4) * 14); g.stroke(); }
      } else {
        g.fillStyle = '#f3d66a'; for (let i = 0; i < 14; i++) { const t = -Math.PI + i / 13 * Math.PI; g.beginPath(); g.moveTo(cx, 300); g.lineTo(cx + Math.cos(t) * 240, 300 + Math.sin(t) * 240); g.lineTo(cx + Math.cos(t + 0.1) * 240, 300 + Math.sin(t + 0.1) * 240); g.fill(); }
        g.fillStyle = '#5b5148'; g.beginPath(); g.moveTo(96, 420); g.lineTo(96, 210); g.arc(cx, 210, 96, Math.PI, 0); g.lineTo(288, 420); g.fill();
        g.fillStyle = '#0b0908'; g.beginPath(); g.moveTo(122, 420); g.lineTo(122, 214); g.arc(cx, 214, 70, Math.PI, 0); g.lineTo(262, 420); g.fill();
        g.fillStyle = '#f6e7a0'; g.beginPath(); g.moveTo(176, 420); g.lineTo(184, 250); g.lineTo(200, 250); g.lineTo(208, 420); g.fill();
        g.fillStyle = '#5b5148'; for (let i = 0; i < 3; i++) g.fillRect(84 - i * 14, 420 + i * 16, 216 + i * 28, 16);
      }
      text(52, 440, 332, 478);
      return canvas;
    };
    const glowing = a.alive === 'glowing';
    const pageMat = (side: 'left' | 'right') => { const map = new THREE.CanvasTexture(paint(side)); map.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide, emissive: glowing ? '#ffffff' : '#000000', emissiveMap: glowing ? map : null, emissiveIntensity: glowing ? mix(0.35, 0.7, mood.cheer) : 0 }); };

    // The grimoire.
    const book = new THREE.Group();
    book.position.copy(C).add(new THREE.Vector3(0, Math.cos(theta), Math.sin(theta)).multiplyScalar(0.012)).add(new THREE.Vector3(0, bookLift, 0));
    book.rotation.set(theta - (lifted ? 0.2 : 0), lifted ? 0.18 : 0, lifted ? 0.12 : (random() - 0.5) * 0.05);
    s.root.add(book);
    const inBook = <T extends THREE.Object3D>(mesh: T) => { book.add(mesh); return mesh; };
    const bw = 0.37, bd = 0.54, thick = 0.07;
    const edges = s.material('#d8caa0');
    for (const side of [-1, 1]) {
      const split = side < 0 ? 0.6 : 0.4, h = thick * 2 * split;
      inBook(s.box([bw + 0.02, 0.016, bd + 0.04], [side * (bw / 2 + 0.005), 0.008, 0], cover)).rotation.z = side * 0.05;
      inBook(s.box([bw, h, bd], [side * bw / 2, 0.016 + h / 2, 0], edges)).rotation.z = side * -0.04;
      const leaf = new THREE.PlaneGeometry(bw, bd, 8, 1); const pos = leaf.attributes.position;
      for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) * side + bw / 2) / bw; pos.setZ(i, Math.sin(u * Math.PI) * 0.022 * (1 - u * 0.4) - (1 - u) * 0.0); }
      leaf.computeVertexNormals();
      const sheet = inBook(s.mesh(leaf, pageMat(side < 0 ? 'left' : 'right'), [side * (bw / 2 + 0.002), 0.018 + h + 0.002, 0])); sheet.rotation.x = -Math.PI / 2; sheet.rotation.y = 0; sheet.rotateZ(0); sheet.rotation.z = 0; sheet.rotateY(side * -0.04);
      for (const z of [-1, 1]) inBook(s.box([0.07, 0.022, 0.07], [side * (bw - 0.02), 0.01, z * (bd / 2 - 0.012)], fitting));
    }
    inBook(s.cylinder(0.022, 0.022, bd + 0.04, [0, 0.012, 0], cover, 10)).rotation.x = Math.PI / 2;
    if (a.page === 'torn') for (let i = 0; i < 9; i++) inBook(s.mesh(new THREE.ConeGeometry(0.02, 0.03 + random() * 0.06, 3), edges, [0.02 + random() * 0.015, 0.016 + thick * 0.8 + 0.01, -bd / 2 + 0.04 + i * 0.058])).rotation.set(0, random(), -1.2 - random() * 0.5);
    const leaves: THREE.Mesh[] = [];
    if (a.alive === 'fluttering') for (let i = 0; i < 3; i++) {
      const pivot = inBook(new THREE.Group()); pivot.position.set(0, 0.03 + thick, 0);
      const leaf = s.mesh(new THREE.PlaneGeometry(bw * 0.96, bd * 0.96), new THREE.MeshStandardMaterial({ color: '#efe5c6', side: THREE.DoubleSide, roughness: 0.9 }), [bw * 0.48, 0, 0]);
      leaf.rotation.x = -Math.PI / 2; pivot.add(leaf); pivot.rotation.z = 1.15 + i * 0.4 + random() * 0.15; leaves.push(pivot as unknown as THREE.Mesh);
    }
    const glyphs: THREE.Mesh[] = [];
    if (glowing) {
      const tint = { circle: '#ff5a3a', beast: '#7be06a', stars: '#9fc0ff', eye: '#ffc84a', door: '#fff0a0', blank: '#e8e0ff', torn: '#e8e0ff' }[a.page];
      for (let i = 0; i < 12; i++) { const m = inBook(s.mesh(i % 2 ? new THREE.TorusGeometry(0.016, 0.005, 5, 10) : new THREE.OctahedronGeometry(0.016), s.material(tint, { emissive: tint, emissiveIntensity: 2, transparent: true, opacity: 0.9, depthWrite: false }), [(random() - 0.3) * bw * 1.3, 0.12 + random() * 0.5, (random() - 0.5) * bd * 0.8])); glyphs.push(m); }
    }
    book.updateMatrixWorld(true);
    const world = (x: number, y: number, z: number): P3 => new THREE.Vector3(x, y, z).applyMatrix4(book.matrixWorld).toArray() as unknown as P3;

    // Ribbon markers trail off the lower edge.
    const ribbons = 2 + Math.round(mood.density * 4);
    for (let i = 0; i < ribbons; i++) {
      const c = ['#b0202a', '#2a4f9a', '#d0a428', '#2f7a4a', '#7a3a8a', '#e8e0d0'][i % 6], mat = s.material(c, { side: THREE.DoubleSide });
      const x = -0.14 + i * 0.06 + (random() - 0.5) * 0.02, len = 0.16 + random() * 0.22;
      const from = world(x, 0.02 + thick, bd / 2 - 0.02), edge = world(x, 0.01, bd / 2 + 0.035);
      s.box([0.024, 0.004, 0.07], [(from[0] + edge[0]) / 2, (from[1] + edge[1]) / 2, (from[2] + edge[2]) / 2], mat).lookAt(edge[0], edge[1], edge[2]);
      const strip = s.box([0.024, len, 0.004], [edge[0], edge[1] - len / 2, edge[2] + 0.004], mat); strip.rotation.z = (random() - 0.5) * 0.15;
    }

    // Chain.
    const chainMat = s.material('#55565c', { metalness: 0.7, roughness: 0.45 });
    const chain = (points: readonly P3[]) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const count = Math.max(2, Math.round(curve.getLength() / 0.042));
      const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.026, 0.008, 6, 12), chainMat, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < count; i++) { const t = (i + 0.5) / count; const tangent = curve.getTangentAt(t); q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent); roll.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i % 2 ? Math.PI / 2 : 0); q.multiply(roll); m.compose(curve.getPointAt(t), q, new THREE.Vector3(1, 1.25, 1)); mesh.setMatrixAt(i, m); }
      void up; mesh.castShadow = true; s.root.add(mesh); return mesh;
    };
    const padlock = (at: P3, open: boolean) => {
      s.box([0.1, 0.085, 0.04], [at[0], at[1] - 0.075, at[2]], fitting);
      const shackle = s.ring(0.034, 0.01, [at[0] + (open ? 0.03 : 0), at[1] - 0.03 + (open ? 0.03 : 0), at[2]], chainMat, Math.PI); if (open) shackle.rotation.y = 0.9;
      s.cylinder(0.01, 0.01, 0.045, [at[0], at[1] - 0.075, at[2]], iron, 8).rotation.x = Math.PI / 2;
    };
    const staple = (at: P3) => { s.ring(0.05, 0.011, at, iron).rotation.y = Math.PI / 2; };
    const anchor = world(bw - 0.03, 0.0, bd / 2 - 0.02);
    if (a.chain === 'locked') {
      staple(ringAt);
      chain([anchor, [anchor[0] + 0.12, anchor[1] - 0.25, anchor[2] + 0.1], [ringAt[0] + 0.2, ringAt[1] - 0.1, ringAt[2] + 0.16], [ringAt[0] + 0.02, ringAt[1] - 0.03, ringAt[2] + 0.02]]);
      padlock([ringAt[0] + 0.01, ringAt[1] - 0.05, ringAt[2] + 0.05], false);
    } else if (a.chain === 'broken') {
      staple(ringAt);
      chain([anchor, [anchor[0] + 0.03, anchor[1] - 0.14, anchor[2] + 0.03], [anchor[0] + 0.04, anchor[1] - 0.3, anchor[2] + 0.04]]);
      const heap: P3[] = [[ringAt[0], ringAt[1] - 0.05, ringAt[2] + 0.02], [ringAt[0] + 0.1, 0.1, ringAt[2] + 0.3]];
      for (let i = 0; i < 9; i++) heap.push([0.3 + Math.cos(i * 1.3) * (0.07 + i * 0.012), 0.016 + (i % 2) * 0.012, 0.42 + Math.sin(i * 1.3) * (0.07 + i * 0.012)]);
      chain(heap);
      for (let i = 0; i < 3; i++) s.ring(0.026, 0.008, [0.1 + random() * 0.5, 0.01, 0.5 + random() * 0.2], chainMat, 4.2).rotation.set(Math.PI / 2, 0, random() * 6);
    } else if (a.chain === 'straining') {
      for (const side of [-1, 1]) {
        const from = world(side * (bw - 0.03), 0, bd / 2 - 0.03), to: P3 = [side * 0.42, 0.03, 0.34];
        chain([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2], to]);
        s.ring(0.05, 0.012, [to[0], 0.035, to[2]], iron).rotation.y = Math.PI / 2; s.box([0.14, 0.02, 0.14], [to[0], 0.01, to[2]], iron);
      }
      s.ball([0.3, 0.05, 0.22], [0, C.y + 0.1, 0.05], s.material('#fff2b0', { emissive: '#ffe890', emissiveIntensity: 1.5, transparent: true, opacity: 0.35, depthWrite: false }), 14).rotation.x = theta;
    } else {
      staple(ringAt);
      padlock([ringAt[0] + 0.01, ringAt[1] - 0.05, ringAt[2] + 0.05], true);
      const heap: P3[] = [];
      for (let i = 0; i < 16; i++) heap.push([-0.36 + Math.cos(i * 1.05) * (0.06 + i * 0.008), 0.016 + (i % 3) * 0.012, 0.4 + Math.sin(i * 1.05) * (0.06 + i * 0.008)]);
      chain(heap);
    }

    // Candle on a bracket.
    const flames: THREE.Mesh[] = [];
    const flame = (at: P3, h: number) => { const hexF = new THREE.Color().setHSL(mix(0.14, 0.06, mood.warmth), 1, 0.6).getStyle(); flames.push(s.mesh(new THREE.ConeGeometry(h * 0.32, h, 8), s.material(hexF, { emissive: hexF, emissiveIntensity: 2 }), [at[0], at[1] + h / 2, at[2]])); };
    const drips = (at: P3, r: number, n: number) => { for (let i = 0; i < n; i++) { const t = random() * 6.283, len = 0.03 + random() * 0.09; s.rod([at[0] + Math.cos(t) * r, at[1], at[2] + Math.sin(t) * r], [at[0] + Math.cos(t) * r, at[1] - len, at[2] + Math.sin(t) * r], 0.007, wax, 0.01); } };
    if (a.candle === 'burning' || a.candle === 'guttered') {
      const bx = -0.56, by = 1.3, bz = -0.12;
      s.tube([[-0.38, 1.26, -0.2], [-0.48, 1.2, -0.16], [bx, 1.22, bz], [bx, by, bz]], 0.012, iron);
      s.cylinder(0.075, 0.03, 0.02, [bx, by + 0.01, bz], iron, 14);
      const h = a.candle === 'burning' ? 0.24 : 0.04;
      s.cylinder(0.026, 0.03, h, [bx, by + 0.02 + h / 2, bz], wax, 12);
      drips([bx, by + 0.02 + h, bz], 0.028, 3 + Math.round(mood.wear * 5));
      if (a.candle === 'burning') flame([bx, by + 0.03 + h, bz], 0.075);
      else {
        s.cylinder(0.07, 0.07, 0.012, [bx, by + 0.026, bz], wax, 12); drips([bx, by + 0.02, bz], 0.07, 6);
        s.cylinder(0.004, 0.004, 0.02, [bx, by + 0.07, bz], iron, 5);
        s.tube([[bx, by + 0.08, bz], [bx + 0.03, by + 0.18, bz], [bx - 0.03, by + 0.3, bz + 0.02], [bx + 0.02, by + 0.44, bz]], 0.008, s.material('#8a8a8a', { transparent: true, opacity: 0.5, depthWrite: false }));
      }
    } else if (a.candle === 'many') {
      desk.updateMatrixWorld(true);
      for (let i = 0; i < 9; i++) {
        const p = new THREE.Vector3(-0.4 + i * 0.1 + (random() - 0.5) * 0.03, 0.02, -0.3).applyMatrix4(desk.matrixWorld), h = 0.04 + random() * 0.16, r = 0.018 + random() * 0.012;
        s.cylinder(r, r * 1.15, h, [p.x, p.y + h / 2, p.z], wax, 10); s.ball([r * 2.2, 0.012, r * 2.2], [p.x, p.y, p.z], wax, 8);
        drips([p.x, p.y + h, p.z], r, 2);
        if (random() < mix(0.4, 0.95, mood.energy)) flame([p.x, p.y + h, p.z], 0.05);
      }
    }
    // Loose leaves on the floor when the place is cluttered.
    for (let i = 0; i < Math.round(Math.max(0, mood.density - 0.35) * 9); i++) s.box([0.2, 0.003, 0.27], [(random() - 0.5) * 1.1, 0.003 + i * 0.002, 0.35 + random() * 0.4], s.material('#e6dab6')).rotation.y = random() * 6;

    const speed = mix(0.3, 1.8, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const [i, f] of flames.entries()) f.scale.set(1 + Math.sin(time * 11 * speed + i) * 0.1, 1 + Math.sin(time * 8 * speed + i * 2) * 0.2, 1);
        for (const [i, leaf] of leaves.entries()) leaf.rotation.z = 1.1 + ((time * 0.4 * speed + i * 0.4) % 1.2);
        for (const [i, glyph] of glyphs.entries()) { glyph.position.y += dt * 0.06 * speed; glyph.rotation.y += dt * (1 + i * 0.1); if (glyph.position.y > 0.65) glyph.position.y = 0.1; }
        if (lifted) book.position.y = C.y + 0.012 + bookLift + Math.sin(time * 5 * speed) * 0.012;
      },
    });
  },
});
