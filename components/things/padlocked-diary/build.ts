import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
const paint = (width: number, height: number, draw: Draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
const heartPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
};

const COVERS = {
  quilted: 'Quilted pink satin stitched in diamonds, with a padded heart.',
  gingham: 'Red and white gingham cotton, home-made and wholesome.',
  floral: 'Faded floral print like a grandmother\'s curtains.',
  velvet: 'Black velvet scattered with silver stars and a moon.',
  denim: 'Old jeans denim with orange stitching and a back pocket.',
  leopard: 'Fluffy leopard print, loud and proud.',
  holo: 'Iridescent holographic vinyl that shifts pink to green.',
} as const;
const BASE: Record<keyof typeof COVERS, string> = {
  quilted: '#f08ab4', gingham: '#d8343a', floral: '#e8dcc0', velvet: '#1c1a26', denim: '#4a6a9c', leopard: '#d9a04a', holo: '#c8a8f0',
};

export default defineThing({
  questions: {
    cover: choice('What is the diary covered in?', COVERS),
    words: choice('What is written on the front?', {
      diary: 'MY DIARY in careful bubble letters.',
      keepout: 'KEEP OUT!! underlined three times.',
      private: 'PRIVATE, small and serious.',
      secret: 'TOP SECRET like a spy file.',
      name: 'Just a first name and the year.',
      blank: 'Nothing: the cover gives nothing away.',
    }),
    state: choice('What has happened to it?', {
      locked: 'Locked tight, strap fastened, exactly as its owner left it.',
      writing: 'Lying open mid-entry, the pen in the gutter, the ink barely dry.',
      facedown: 'Dropped open and face-down like a tent, the padlock unhooked beside it.',
      torn: 'Pages have been ripped out and screwed into balls around it.',
      forced: 'Somebody has broken in: the strap is snapped and the cover is ajar.',
    }),
    stuffed: score('How much has been taped and tucked into it?', ['Slim and new, hardly written in', 'A few notes poking out', 'Bursting: notes, photos and wrappers splay the covers apart']),
    pen: choice('What pen is tied to it?', {
      pompom: 'A novelty pen topped with a fluffy pom-pom.',
      gel: 'A glitter gel pen.',
      biro: 'A chewed clear biro with a blue cap.',
      pencil: 'A stubby pencil with a worn pink eraser.',
    }),
    key: noul('Is the tiny key in sight?'),
    ribbon: choice('What colour are the ribbon and strap?', {
      red: 'Red.', pink: 'Baby pink.', gold: 'Gold.', purple: 'Purple.', black: 'Black.', mint: 'Mint green.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 0.19, H = 0.25, C = 0.011;
    const thick = mix(0.028, 0.06, a.stuffed), bulge = mix(0.002, 0.034, a.stuffed);
    const base = BASE[a.cover];
    const ribbonTint = { red: '#d8262c', pink: '#f6a8c8', gold: '#d8a83a', purple: '#8a4ac8', black: '#1c1c1e', mint: '#8ad8b8' }[a.ribbon];

    const pattern: Draw = (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      if (a.cover === 'quilted') {
        ctx.strokeStyle = 'rgba(160,40,90,0.55)'; ctx.lineWidth = 2;
        for (let i = -h; i < w + h; i += 36) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < w; i += 36) for (let j = 0; j < h; j += 36) { ctx.beginPath(); ctx.arc(i, j, 2.5, 0, 7); ctx.fill(); }
      } else if (a.cover === 'gingham') {
        ctx.fillStyle = '#f6f0e6'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(216,52,58,0.55)';
        for (let i = 0; i < w; i += 32) ctx.fillRect(i, 0, 16, h);
        for (let j = 0; j < h; j += 32) ctx.fillRect(0, j, w, 16);
      } else if (a.cover === 'floral') {
        for (let i = 0; i < 46; i++) {
          const x = random() * w, y = random() * h, r = 6 + random() * 9;
          ctx.fillStyle = pick(['#c8506a', '#d88a3a', '#8a6ab0', '#c84a4a']);
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.257) * r, y + Math.sin(k * 1.257) * r, r * 0.7, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#e8c63a'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fill();
          ctx.fillStyle = '#6a8a4a'; ctx.beginPath(); ctx.ellipse(x + r * 1.8, y + r, r * 0.9, r * 0.4, 0.6, 0, 7); ctx.fill();
        }
      } else if (a.cover === 'velvet') {
        ctx.fillStyle = '#d8dce8';
        for (let i = 0; i < 40; i++) { const x = random() * w, y = random() * h, r = 2 + random() * 6; ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.4 : r, t = k / 10 * 6.283; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.fill(); }
      } else if (a.cover === 'denim') {
        for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '10,20,60'},${random() * 0.16})`; ctx.fillRect(random() * w, random() * h, 1, 4); }
        ctx.strokeStyle = '#e8963a'; ctx.setLineDash([7, 5]); ctx.lineWidth = 2.5; ctx.strokeRect(10, 10, w - 20, h - 20); ctx.setLineDash([]);
      } else if (a.cover === 'leopard') {
        for (let i = 0; i < 70; i++) {
          const x = random() * w, y = random() * h, r = 7 + random() * 9;
          ctx.fillStyle = '#8a5a22'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.7, r * 0.5, random() * 3, 0, 7); ctx.fill();
          ctx.strokeStyle = '#1e1610'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, random() * 3, random() * 2, random() * 2 + 4); ctx.stroke();
        }
      } else {
        const sweep = ctx.createLinearGradient(0, 0, w, h);
        ['#ff9ad8', '#a8f0e0', '#c8a8ff', '#f8f0a0', '#9ad0ff', '#ff9ad8'].forEach((tint, i) => sweep.addColorStop(i / 5, tint));
        ctx.fillStyle = sweep; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 60; i++) ctx.fillRect(random() * w, random() * h, 3, 3);
      }
    };
    const fabric = new THREE.MeshStandardMaterial({ map: paint(256, 256, pattern), roughness: a.cover === 'holo' ? 0.2 : 0.95, metalness: a.cover === 'holo' ? 0.5 : 0 });
    const ink = a.cover === 'velvet' || a.cover === 'denim' ? '#f4f0e0' : '#3a1c4a';
    const frontArt = new THREE.MeshStandardMaterial({
      roughness: fabric.roughness, metalness: fabric.metalness,
      map: paint(384, 512, (ctx, w, h) => {
        pattern(ctx, w, h);
        if (a.cover === 'quilted' || a.cover === 'gingham') { ctx.fillStyle = a.cover === 'quilted' ? '#d8306a' : '#f6f0e6'; heartPath(ctx, w / 2, h * 0.62, 78); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; heartPath(ctx, w / 2, h * 0.62, 66); ctx.stroke(); ctx.setLineDash([]); }
        if (a.cover === 'velvet') { ctx.fillStyle = '#e8e4c8'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.64, 62, 0, 7); ctx.fill(); ctx.fillStyle = base; ctx.beginPath(); ctx.arc(w * 0.57, h * 0.61, 54, 0, 7); ctx.fill(); }
        if (a.cover === 'denim') { ctx.strokeStyle = '#e8963a'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.5); ctx.lineTo(w * 0.72, h * 0.5); ctx.lineTo(w * 0.72, h * 0.78); ctx.lineTo(w * 0.5, h * 0.86); ctx.lineTo(w * 0.28, h * 0.78); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
        if (a.words !== 'blank') {
          const text = { diary: ['MY', 'DIARY'], keepout: ['KEEP', 'OUT!!'], private: ['PRIVATE'], secret: ['TOP', 'SECRET'], name: [pick(['Katie', 'Jess', 'Maya', 'Sam', 'Danielle', 'Rosa']), pick(['1987', '1994', '1999', '2003'])] }[a.words];
          const plate = a.cover === 'floral' || a.cover === 'leopard' || a.cover === 'gingham' || a.cover === 'holo';
          if (plate) { ctx.fillStyle = '#f8f4e8'; ctx.fillRect(w * 0.14, h * 0.1, w * 0.72, h * (text.length > 1 ? 0.3 : 0.17)); ctx.strokeStyle = '#3a1c4a'; ctx.lineWidth = 3; ctx.strokeRect(w * 0.16, h * 0.11, w * 0.68, h * (text.length > 1 ? 0.28 : 0.15)); }
          ctx.fillStyle = plate ? '#3a1c4a' : ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `bold ${a.words === 'private' ? 46 : 64}px ${a.words === 'secret' ? 'monospace' : 'cursive'}`;
          text.forEach((line, i) => ctx.fillText(line, w / 2, h * (0.2 + i * 0.13), w * 0.64));
          if (a.words === 'keepout') for (let i = 0; i < 3; i++) ctx.fillRect(w * 0.24, h * 0.4 + i * 9, w * 0.52, 4);
          if (a.words === 'secret') { ctx.strokeStyle = '#c8202a'; ctx.lineWidth = 6; ctx.strokeRect(w * 0.18, h * 0.12, w * 0.64, h * 0.27); }
        }
        for (let i = 0; i < mood.wear * 14; i++) { ctx.fillStyle = `rgba(90,70,50,${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 8 + random() * 30, 6 + random() * 18, random() * 3, 0, 7); ctx.fill(); }
      }),
    });
    const edges = new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(64, 64, (ctx, w, h) => { ctx.fillStyle = '#f2ead4'; ctx.fillRect(0, 0, w, h); for (let j = 0; j < h; j += 2) { ctx.fillStyle = `rgba(120,100,70,${0.15 + random() * 0.3})`; ctx.fillRect(0, j, w, 1); } }) });
    const pageArt = (side: number) => new THREE.MeshStandardMaterial({
      roughness: 0.9,
      map: paint(256, 336, (ctx, w, h) => {
        ctx.fillStyle = '#f6efdc'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(110,150,200,0.6)'; ctx.lineWidth = 1;
        for (let y = 40; y < h - 10; y += 18) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(w - 8, y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(220,90,90,0.6)'; ctx.beginPath(); ctx.moveTo(side < 0 ? w - 30 : 30, 0); ctx.lineTo(side < 0 ? w - 30 : 30, h); ctx.stroke();
        const pen = { pompom: '#c8309a', gel: '#7a3ad8', biro: '#1c3aa8', pencil: '#55555a' }[a.pen];
        ctx.strokeStyle = pen; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const lines = side < 0 ? 15 : 3 + Math.floor(random() * 7);
        for (let i = 0; i < lines; i++) {
          const y = 36 + i * 18; let x = 38 + (i === 0 ? 0 : random() * 8);
          const end = w - 20 - random() * (i === lines - 1 ? 130 : 40);
          ctx.beginPath(); ctx.moveTo(x, y);
          while (x < end) { x += 3 + random() * 4; ctx.lineTo(x, y - random() * 7); if (random() < 0.16) { x += 7; ctx.moveTo(x, y); } }
          ctx.stroke();
        }
        if (side > 0) { ctx.fillStyle = '#e83a6a'; heartPath(ctx, w * mix(0.4, 0.7, random()), h * 0.72, 26); ctx.fill(); ctx.strokeStyle = pen; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.86); ctx.lineTo(w * 0.7, h * 0.9); ctx.moveTo(w * 0.2, h * 0.9); ctx.lineTo(w * 0.7, h * 0.86); ctx.stroke(); }
      }),
    });

    const book = new THREE.Group();
    s.root.add(book);
    const add = <T extends THREE.Object3D>(node: T, into: THREE.Object3D = book) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); into.add(node); return node; };
    const cover = (front: boolean) => {
      const group = new THREE.Group();
      const slab = new THREE.Mesh(new RoundedBoxGeometry(W + 0.008, C, H + 0.012, 3, 0.005), fabric);
      slab.position.set(W / 2, C / 2, 0);
      group.add(slab);
      if (front) {
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.006, H - 0.002), frontArt);
        face.rotation.x = -Math.PI / 2;
        face.position.set(W / 2, C + 0.0006, 0);
        group.add(face);
      }
      return group;
    };
    // A block of pages hinged at x = 0, fatter at the fore-edge where things are tucked in.
    const pages = (t: number, swell: number, top?: THREE.Material) => {
      const g = new THREE.BoxGeometry(W - 0.008, t, H - 0.012, 6, 1, 1);
      const at = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < at.count; i++) if (at.getY(i) > 0) at.setY(i, at.getY(i) + swell * (at.getX(i) / (W - 0.008) + 0.5));
      g.translate((W - 0.008) / 2, t / 2, 0);
      g.computeVertexNormals();
      return new THREE.Mesh(g, [edges, edges, top ?? edges, edges, edges, edges]);
    };
    const paperTints = ['#fff48a', '#ffb0c8', '#a8e0ff', '#f6f0e0', '#c8f0a8', '#f6f0e0', '#ffd0a0'];
    const tucked = (count: number, into: THREE.Object3D, y0: number, y1: number) => {
      for (let i = 0; i < count; i++) {
        const fore = random() < 0.6;
        const slip = new THREE.Mesh(new THREE.BoxGeometry(mix(0.03, 0.07, random()), 0.0012, mix(0.03, 0.08, random())), s.material(pick(paperTints), { roughness: 0.9 }));
        const y = mix(y0, y1, random());
        if (fore) slip.position.set(W - 0.012 + random() * 0.012, y + bulge * 0.6, (random() - 0.5) * (H - 0.07));
        else slip.position.set(mix(0.05, W - 0.04, random()), y + bulge * 0.3, (random() < 0.5 ? -1 : 1) * (H / 2 - 0.012 + random() * 0.01));
        slip.rotation.set((random() - 0.5) * 0.15, (random() - 0.5) * 0.9, (random() - 0.5) * 0.15);
        add(slip, into);
      }
    };
    const brass = s.material('#d8a83a', { metalness: 0.9, roughness: 0.28 });
    const strapMaterial = s.material(ribbonTint, { roughness: 0.7 });
    const padlock = (open: boolean) => {
      const lock = new THREE.Group();
      const heart = new THREE.Shape();
      const r = 0.017;
      heart.moveTo(0, -r * 0.95);
      heart.bezierCurveTo(-r * 1.5, r * 0.1, -r * 0.6, r * 1.1, 0, r * 0.4);
      heart.bezierCurveTo(r * 0.6, r * 1.1, r * 1.5, r * 0.1, 0, -r * 0.95);
      const body = new THREE.Mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.006, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 2 }), brass);
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0095, 10), s.material('#1a1408'));
      hole.rotation.x = Math.PI / 2;
      hole.position.set(0, -0.001, 0.003);
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0022, 8, 20, Math.PI), s.material('#c9cdd0', { metalness: 0.9, roughness: 0.25 }));
      shackle.position.set(0, 0.013, 0.003);
      if (open) { shackle.position.set(0.009, 0.019, 0.003); shackle.rotation.y = 1.2; }
      lock.add(body, hole, shackle);
      return lock;
    };

    const ajar = a.state === 'forced' ? mix(0.2, 0.4, random()) : a.state === 'torn' ? mix(0.08, 0.2, random()) : 0;
    let ribbonFrom: [number, number, number] = [0.004, C + thick, -H / 2 + 0.02];
    if (a.state === 'writing') {
      // Open flat: two leaves of pages on two covers.
      const share = mix(0.35, 0.65, random());
      for (const side of [-1, 1]) {
        const leaf = new THREE.Group();
        leaf.add(cover(false));
        const block = pages(thick * (side < 0 ? share : 1 - share), bulge * 0.3, pageArt(side));
        block.position.y = C;
        leaf.add(block);
        tucked(Math.round(a.stuffed * 5), leaf, C + 0.002, C + thick * 0.4);
        if (side < 0) leaf.scale.x = -1;
        leaf.position.x = side * 0.004;
        add(leaf);
      }
      add(new THREE.Mesh(new THREE.BoxGeometry(0.022, C, H + 0.012), fabric)).position.y = C / 2;
      ribbonFrom = [0, C + thick * 0.5, -H / 2 + 0.01];
    } else if (a.state === 'facedown') {
      const angle = mix(0.42, 0.62, random());
      for (const side of [-1, 1]) {
        const leaf = new THREE.Group();
        const shell = cover(side > 0);
        const block = pages(thick / 2, bulge * 0.4);
        block.position.y = -thick / 2 - bulge * 0.4;
        block.scale.y = 1;
        leaf.add(shell, block);
        tucked(Math.round(a.stuffed * 5), leaf, -thick / 2, -0.002);
        if (side < 0) leaf.scale.x = -1;
        leaf.rotation.z = -side * angle;
        add(leaf);
      }
      const ridge = add(new THREE.Mesh(new THREE.CylinderGeometry(C * 0.9, C * 0.9, H + 0.012, 12), fabric));
      ridge.rotation.x = Math.PI / 2;
      ridge.position.y = C * 0.3;
      book.position.y = Math.sin(angle) * (W + 0.01) + 0.03;
      ribbonFrom = [0, book.position.y, -H / 2 + 0.01];
    } else {
      add(cover(false));
      const block = add(pages(thick, bulge));
      block.position.y = C;
      tucked(Math.round(mix(0, 15, a.stuffed) + mood.density * 3), book, C + 0.004, C + thick - 0.004);
      const lid = cover(true);
      lid.position.set(0, C + thick + 0.0005, 0);
      lid.rotation.z = Math.atan2(bulge, W) + ajar;
      add(lid);
      const spine = add(new THREE.Mesh(new THREE.CylinderGeometry((thick + 2 * C) / 2, (thick + 2 * C) / 2, H + 0.012, 14, 1, false, Math.PI, Math.PI), fabric));
      spine.rotation.x = Math.PI / 2;
      spine.position.set(0.002, C + thick / 2, 0);
      if (a.state === 'torn') {
        // Ragged stubs where the pages were.
        for (let i = 0; i < 9; i++) { const stub = add(new THREE.Mesh(new THREE.BoxGeometry(0.012 + random() * 0.03, 0.001, 0.02 + random() * 0.03), s.material('#f6efdc'))); stub.position.set(0.02 + random() * 0.03, C + thick + 0.004 + random() * 0.01, (random() - 0.5) * (H - 0.05)); stub.rotation.z = 0.4 + random() * 0.8; }
      }
      // Strap from the back cover round the fore-edge to the front.
      const topY = C + thick + bulge + C + Math.sin(ajar) * W;
      const edgeX = W + 0.006;
      if (a.state === 'forced') {
        // The back half of the strap lies limp on the table; the front tab sticks up.
        add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.024), strapMaterial)).position.set(edgeX + 0.03, 0.001, 0.0);
        const tab = add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.002, 0.024), strapMaterial), lid);
        tab.position.set(W - 0.012, C + 0.002, 0);
        const frayed = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.002, 0.024), strapMaterial), lid);
        frayed.position.set(W + 0.012, C + 0.008, 0);
        frayed.rotation.z = 0.6;
      } else {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.003, topY, 0.024), strapMaterial)).position.set(edgeX, topY / 2, 0);
        const over = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.024), strapMaterial), lid);
        over.position.set(W - 0.017, C + 0.002, 0);
        const hasp = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.003, 0.03), brass), lid);
        hasp.position.set(W - 0.045, C + 0.004, 0);
      }
      const lock = padlock(a.state === 'forced' ? false : a.state === 'torn');
      lock.scale.setScalar(1.25);
      if (a.state === 'forced') { lock.rotation.set(-Math.PI / 2, 0, 1 + random()); lock.position.set(edgeX + 0.07, 0.002, 0.012); add(lock); }
      else { lock.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); lock.position.set(W - 0.072, C + 0.006, 0); add(lock, lid); }
    }
    if (a.state === 'facedown' || a.state === 'writing') {
      const lock = padlock(true);
      lock.scale.setScalar(1.25);
      lock.rotation.set(-Math.PI / 2, 0, random() * 6.28);
      lock.position.set(W + 0.045 + random() * 0.02, 0.002, H * 0.2);
      add(lock, s.root);
      const strap = add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.002, 0.024), strapMaterial), s.root);
      strap.position.set(W + 0.03, 0.001, 0);
      strap.rotation.y = (random() - 0.5) * 0.4;
    }
    book.rotation.y = (random() - 0.5) * 0.3;
    book.position.x = a.state === 'writing' || a.state === 'facedown' ? 0 : -W / 2;

    // Screwed-up and ripped-out pages.
    if (a.state === 'torn') {
      const count = 3 + Math.round(a.stuffed * 3 + mood.energy * 3);
      for (let i = 0; i < count; i++) {
        const g = new THREE.IcosahedronGeometry(mix(0.018, 0.03, random()), 1);
        const at = g.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < at.count; k++) { const q = Math.sin(at.getX(k) * 400 + i) * Math.cos(at.getY(k) * 300 + at.getZ(k) * 500); at.setXYZ(k, at.getX(k) * (1 + q * 0.25), at.getY(k) * (1 + q * 0.2), at.getZ(k) * (1 + q * 0.25)); }
        g.computeVertexNormals();
        const angle = random() * 6.28, reach = mix(0.15, 0.21, random());
        add(new THREE.Mesh(g, s.material('#f4eedc', { roughness: 1, flatShading: true })), s.root).position.set(Math.cos(angle) * reach, 0.02, Math.sin(angle) * reach * 0.9);
      }
      for (let i = 0; i < 2; i++) {
        const sheet = new THREE.Shape();
        sheet.moveTo(0, 0);
        for (let k = 0; k <= 8; k++) sheet.lineTo(k / 8 * 0.13, random() * 0.012);
        sheet.lineTo(0.13, 0.17); sheet.lineTo(0, 0.17); sheet.closePath();
        const page = add(new THREE.Mesh(new THREE.ShapeGeometry(sheet), new THREE.MeshStandardMaterial({ color: '#f6efdc', roughness: 0.9, side: THREE.DoubleSide })), s.root);
        page.rotation.set(-Math.PI / 2, 0, random() * 6.28);
        page.position.set((random() - 0.5) * 0.12, 0.0015 + i * 0.001, 0.08 + random() * 0.05);
      }
    }

    // The pen on its ribbon.
    const penAt = new THREE.Vector3(a.state === 'writing' ? 0.03 : mix(-0.06, 0.06, random()), 0.006, a.state === 'writing' ? 0 : H / 2 + mix(0.03, 0.05, random()));
    const pen = new THREE.Group();
    const barrelTint = { pompom: '#f04a98', gel: '#7a3ad8', biro: '#dfe8ee', pencil: '#e8b82a' }[a.pen];
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, a.pen === 'pencil' ? 0.09 : 0.135, a.pen === 'pencil' || a.pen === 'biro' ? 6 : 12), s.material(barrelTint, { roughness: 0.35, emissive: a.pen === 'gel' ? '#7a3ad8' : '#000000', emissiveIntensity: 0.35 }));
    const half = (a.pen === 'pencil' ? 0.09 : 0.135) / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0048, 0.014, 10), s.material(a.pen === 'pencil' ? '#e8c89a' : '#2a2a2c'));
    tip.position.y = -half - 0.007; tip.rotation.x = Math.PI;
    pen.add(barrel, tip);
    if (a.pen === 'pompom') {
      const fluff = s.material(pick(['#ff7ac0', '#a86af0', '#6ad8f0', '#ffe26a']), { roughness: 1 });
      for (let i = 0; i < 9; i++) { const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012, 1), fluff); puff.position.set((random() - 0.5) * 0.018, half + 0.016 + (random() - 0.5) * 0.018, (random() - 0.5) * 0.018); pen.add(puff); }
    } else if (a.pen === 'pencil') {
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.01, 10), brass); ferrule.position.y = half + 0.005;
      const rubber = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.008, 10), s.material('#f0909a')); rubber.position.y = half + 0.013;
      pen.add(ferrule, rubber);
    } else {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0056, 0.0056, 0.03, 10), s.material(a.pen === 'biro' ? '#1c3aa8' : '#e8c63a', { metalness: a.pen === 'gel' ? 0.6 : 0 })); cap.position.y = half - 0.01;
      pen.add(cap);
    }
    pen.scale.setScalar(1.3);
    pen.rotation.set(0, 0, Math.PI / 2 + (a.state === 'writing' ? 1.2 : (random() - 0.5) * 0.7), 'YXZ');
    pen.rotation.x = Math.PI / 2;
    pen.position.copy(penAt);
    if (a.state === 'writing') pen.position.y = C + thick * 0.5 + 0.012;
    add(pen, s.root);
    const start = new THREE.Vector3(...ribbonFrom).applyAxisAngle(new THREE.Vector3(0, 1, 0), book.rotation.y).add(new THREE.Vector3(book.position.x, 0, 0));
    const lay = 0.003;
    const points: [number, number, number][] = [[start.x, start.y, start.z], [start.x - 0.03, lay + start.y * 0.3, start.z - 0.03], [start.x - 0.07 - random() * 0.03, lay, start.z + 0.04]];
    const endsAt = a.state === 'writing' ? new THREE.Vector3(-W - 0.03, lay, H * 0.3) : penAt;
    for (let i = 1; i <= 4; i++) points.push([mix(points[2][0], endsAt.x, i / 4) + Math.sin(i * 2.1) * 0.025 * (i < 4 ? 1 : 0), lay, mix(points[2][2], endsAt.z, i / 4)]);
    s.tube(points, 0.0022, strapMaterial);

    if (a.key) {
      const key = new THREE.Group();
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0018, 6, 16), brass);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.022, 6), brass); shaft.position.y = -0.018;
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.005, 0.0015), brass); bit.position.set(0.003, -0.027, 0);
      key.add(bow, shaft, bit);
      key.scale.setScalar(1.5);
      key.rotation.set(-Math.PI / 2, 0, random() * 6.28);
      key.position.set(-W / 2 - 0.07 + random() * 0.03, 0.003, H * 0.25 + random() * 0.05);
      add(key, s.root);
      s.tube([[key.position.x, 0.003, key.position.z], [key.position.x - 0.03, 0.003, key.position.z + 0.03], [key.position.x - 0.02, 0.003, key.position.z + 0.07], [key.position.x + 0.02, 0.003, key.position.z + 0.06], [key.position.x, 0.003, key.position.z]], 0.001, strapMaterial);
    }
    return s.finish({ footprint: 0.19 });
  },
});
