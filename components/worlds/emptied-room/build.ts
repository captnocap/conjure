import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ghost = { x: number; y: number; w: number; h: number; hook?: boolean; round?: boolean };

export default defineWorld({
  questions: {
    occasion: choice('Why is the room empty?', {
      out: 'Moving out: swept clean, a broom and one last bin bag in the corner.',
      in: 'Moving in: a stepladder, a paint tin and test patches of colour on the wall.',
      eviction: 'Eviction: bin bags heaped in haste, a notice taped up, hangers on the floor.',
      parent: "Clearing a parent's house: a clock and a calendar still on the wall, albums stacked on the floor.",
      sold: 'Sold and staged as nothing: spotless, anonymous, already someone else’s.',
    }),
    walls: choice('What are the walls like?', {
      magnolia: 'Rented magnolia, yellowed everywhere except where things hung.',
      wallpaper: 'Decades-old floral wallpaper, faded around brighter ghosts.',
      colour: 'A strong colour somebody chose and loved, teal or terracotta.',
      white: 'Fresh brilliant white, the ghosts painted over and almost gone.',
      nursery: 'Pale sky blue with a border of clouds: it was a child’s room.',
    }),
    marks: choice('What stood against the walls and left its shape?', {
      gallery: 'A whole wall of pictures: a cluster of frames of every size.',
      bedroom: 'A wardrobe, a headboard and two small frames above the bed.',
      living: 'A sofa, a television and three shelves with their bracket holes.',
      sparse: 'Almost nothing: one cross or clock and a single frame.',
    }),
    floor: choice('What is the floor?', {
      boards: 'Honey-coloured bare floorboards.',
      stained: 'Boards stained dark around the edge, pale in the middle where the rug lay.',
      carpet: 'Worn carpet with dents where furniture feet stood.',
      parquet: 'Herringbone parquet, dulled along the walking routes.',
    }),
    window: choice('What is the window like?', {
      sash: 'A tall sash window with glazing bars.',
      picture: 'A wide low picture window.',
      pair: 'Two narrow windows side by side.',
      small: 'One small high window: a box room.',
    }),
    door: choice('How is the door?', {
      open: 'Wide open onto a bright hallway.',
      ajar: 'Ajar, the hall dark beyond it.',
      closed: 'Closed.',
      gone: 'Taken off its hinges, just an empty frame.',
    }),
    pendant: choice('What hangs from the ceiling rose?', {
      bulb: 'A bare bulb on a flex, switched on.',
      dead: 'A bare bulb, off.',
      flex: 'Only the flex and an empty lampholder.',
      wires: 'Two capped wires where a fitting was taken down.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 14, D = 11, H = 5, X0 = -W / 2, Z0 = -D / 2;
    const { art: s, world } = diorama(context, {
      background: '#e7e6df', floor: null, width: W, depth: D, maxHeight: 3.1, radius: 1.55, pitch: 30, yaw: 30,
      slots: [[0.9, 0.9], [-4.7, 3.2, 0, 0.8], [-4.6, 0.2, 0, 0.75], [-1.9, 3.9, 0, 0.7], [4.9, -2.9, 0, 0.8]],
    });
    const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!, w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const flat = (hex: THREE.ColorRepresentation, rough = 0.9) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });
    const age = 0.25 + mood.wear * 0.75;

    // --- floor
    const floorTex = tex(1024, 804, (c, w, h) => {
      const px = w / W;
      if (a.floor === 'carpet') {
        c.fillStyle = mood.warmth > 0.5 ? '#a8876a' : '#8b9198'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 16000; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},0.06)`; c.fillRect(random() * w, random() * h, 2, 2); }
        c.fillStyle = `rgba(60,50,40,${0.1 + age * 0.14})`; c.beginPath(); c.moveTo(0, h * 0.8); c.quadraticCurveTo(w * 0.4, h * 0.6, w * 0.6, h * 0.3); c.lineTo(w * 0.75, h * 0.3); c.quadraticCurveTo(w * 0.5, h * 0.75, 0, h); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(w * 0.3, h * 0.02, w * 0.32, h * 0.16);
        c.fillStyle = 'rgba(30,25,20,0.35)'; for (const [x, y] of [[0.31, 0.03], [0.6, 0.03], [0.31, 0.16], [0.6, 0.16], [0.82, 0.6], [0.9, 0.6], [0.82, 0.72], [0.9, 0.72]]) c.fillRect(w * x, h * y, 9, 9);
      } else if (a.floor === 'parquet') {
        c.fillStyle = '#b58a55'; c.fillRect(0, 0, w, h); const bl = 44, bw = 11;
        for (let j = -2; j < h / bw + 4; j++) for (let i = -2; i < w / bl + 2; i++) { const tone = 150 + Math.floor(random() * 50); c.fillStyle = `rgb(${tone + 30},${tone - 12},${tone - 70})`; c.save(); c.translate(i * bl + (j % 2) * bl / 2, j * bw * 1.42); c.rotate(i % 2 ? 0.785 : -0.785); c.fillRect(0, 0, bl, bw - 1); c.restore(); }
        c.fillStyle = `rgba(230,220,200,${0.1 + age * 0.12})`; c.beginPath(); c.ellipse(w * 0.35, h * 0.6, w * 0.4, h * 0.14, -0.5, 0, 7); c.fill();
      } else {
        const dark = a.floor === 'stained';
        for (let y = 0; y < h; y += px * 0.42) {
          let x = -random() * 200;
          while (x < w) { const len = 200 + random() * 380, t = random(); c.fillStyle = `rgb(${196 + t * 24},${150 + t * 24},${96 + t * 22})`; c.fillRect(x, y, len - 1.5, px * 0.42 - 1.5); c.fillStyle = 'rgba(70,45,20,0.5)'; c.fillRect(x + 6, y + 6, 2.5, 2.5); c.fillRect(x + 6, y + px * 0.42 - 10, 2.5, 2.5); x += len; }
        }
        c.fillStyle = 'rgba(60,35,15,0.5)'; for (let y = 0; y < h; y += px * 0.42) c.fillRect(0, y - 1.5, w, 1.5);
        if (dark) { c.fillStyle = 'rgba(52,30,16,0.72)'; c.beginPath(); c.rect(0, 0, w, h); c.rect(w * 0.25, h * 0.27, w * 0.58, h * 0.5); c.fill('evenodd'); c.strokeStyle = 'rgba(40,22,10,0.5)'; c.lineWidth = 5; c.strokeRect(w * 0.25, h * 0.27, w * 0.58, h * 0.5); }
        else { c.fillStyle = `rgba(250,235,205,${0.1 + age * 0.12})`; c.fillRect(w * 0.27, h * 0.3, w * 0.52, h * 0.44); }
      }
      // dust and scuffs
      for (let i = 0; i < age * 50; i++) { c.strokeStyle = `rgba(245,240,230,${0.12 + random() * 0.15})`; c.lineWidth = 1 + random() * 2; const x = random() * w, y = random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 30); c.stroke(); }
    });
    const edge = flat('#8f7a5e');
    const ground = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, D), [edge, edge, new THREE.MeshStandardMaterial({ map: floorTex, roughness: a.floor === 'carpet' ? 1 : 0.6 }), edge, edge, edge]);
    ground.position.y = -0.12; ground.receiveShadow = true; s.root.add(ground); world.ground = ground;

    // --- wall finish
    const fresh = new THREE.Color({ magnolia: '#efe6cb', wallpaper: '#e6d9c2', colour: mood.warmth > 0.5 ? '#c9714f' : '#3f8a8c', white: '#f4f4ef', nursery: '#bcd9ea' }[a.walls]);
    const ghostStrength = a.walls === 'white' ? 0.25 : 1;
    const fade = (c: CanvasRenderingContext2D, w: number, h: number, ghosts: Ghost[], px: number) => {
      c.fillStyle = `#${fresh.getHexString()}`; c.fillRect(0, 0, w, h);
      if (a.walls === 'wallpaper') {
        for (let x = 0; x < w; x += 30) { c.fillStyle = 'rgba(150,120,90,0.25)'; c.fillRect(x, 0, 2, h); for (let y = (x / 30 % 2) * 22; y < h; y += 44) { c.fillStyle = '#b8636e'; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + 15 + Math.cos(p * 1.257) * 5, y + 12 + Math.sin(p * 1.257) * 5, 4, 0, 7); c.fill(); } c.fillStyle = '#e3c36a'; c.beginPath(); c.arc(x + 15, y + 12, 2.5, 0, 7); c.fill(); c.fillStyle = '#6f8f6a'; c.beginPath(); c.ellipse(x + 15, y + 26, 2.5, 7, 0.3, 0, 7); c.fill(); } }
      }
      if (a.walls === 'nursery') { c.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = 20; x < w; x += 110) { const y = h * 0.2 + Math.sin(x) * 6; for (const [dx, r] of [[0, 15], [17, 20], [38, 15]]) { c.beginPath(); c.arc(x + dx, y - r * 0.3, r, 0, 7); c.fill(); } c.fillRect(x - 8, y, 54, 12); } }
      // years of light and smoke everywhere except where things hung
      c.fillStyle = `rgba(${a.walls === 'colour' ? '225,215,195' : a.walls === 'nursery' ? '150,150,140' : '150,125,80'},${(0.22 + age * 0.24) * ghostStrength})`;
      c.beginPath(); c.rect(0, 0, w, h);
      for (const g of ghosts) { if (g.round) { c.moveTo(g.x * px + g.w * px / 2 + g.w * px / 2, h - g.y * px - g.h * px / 2); c.arc(g.x * px + g.w * px / 2, h - g.y * px - g.h * px / 2, g.w * px / 2, 0, Math.PI * 2); } else c.rect(g.x * px, h - (g.y + g.h) * px, g.w * px, g.h * px); }
      c.fill('evenodd');
      for (const g of ghosts) {
        c.strokeStyle = `rgba(70,55,35,${(0.16 + age * 0.2) * ghostStrength})`; c.lineWidth = 3;
        if (g.round) { c.beginPath(); c.arc(g.x * px + g.w * px / 2, h - g.y * px - g.h * px / 2, g.w * px / 2 + 1, 0.3, Math.PI - 0.3); c.stroke(); }
        else { c.beginPath(); c.moveTo(g.x * px, h - g.y * px + 1.5); c.lineTo((g.x + g.w) * px, h - g.y * px + 1.5); c.stroke(); c.lineWidth = 1.5; c.strokeRect(g.x * px, h - (g.y + g.h) * px, g.w * px, g.h * px); }
        if (g.hook) { c.fillStyle = '#4a3a22'; c.fillRect((g.x + g.w / 2) * px - 2, h - (g.y + g.h) * px + g.h * px * 0.12, 4, 7); }
      }
      for (let i = 0; i < age * 16; i++) { c.fillStyle = `rgba(70,55,40,${0.05 + random() * 0.07})`; c.beginPath(); c.ellipse(random() * w, h - random() * 1.3 * px, 6 + random() * 26, 3 + random() * 8, 0, 0, 7); c.fill(); }
    };
    // ghost layouts in wall metres: back wall x from 0 (left) to 14, left wall x from 0 (front) to 11
    const backGhosts: Ghost[] = [], leftGhosts: Ghost[] = [];
    const winX = a.window === 'picture' ? 7.6 : a.window === 'small' ? 10.4 : 8.6; // window occupies the right of the back wall
    if (a.marks === 'gallery') {
      const n = 5 + Math.round(mood.density * 5); let x = 0.9;
      for (let i = 0; i < n && x < winX - 1.4; i++) { const w = 0.6 + random() * 1.1, h = 0.6 + random() * 1.0; backGhosts.push({ x, y: 1.9 + random() * (2.4 - h), w, h, hook: true }); if (random() < 0.5 && h < 0.9) backGhosts.push({ x: x + 0.1, y: 1.3 + random() * 0.2, w: w * 0.7, h: 0.45, hook: true }); x += w + 0.25 + random() * 0.4; }
      leftGhosts.push({ x: 6.2, y: 1.7, w: 2.6, h: 1.8, hook: true }, { x: 9.3, y: 2.3, w: 0.8, h: 1.0, hook: true });
    } else if (a.marks === 'bedroom') {
      backGhosts.push({ x: 2.6, y: 0.35, w: 3.6, h: 1.9 }, { x: 2.9, y: 2.75, w: 0.9, h: 0.75, hook: true }, { x: 5.0, y: 2.75, w: 0.9, h: 0.75, hook: true }, { x: 1.2, y: 0.35, w: 1.0, h: 1.2 }, { x: 6.6, y: 0.35, w: 1.0, h: 1.2 });
      leftGhosts.push({ x: 6.0, y: 0.35, w: 3.2, h: 4.0 }, { x: 9.7, y: 1.6, w: 0.9, h: 2.3, hook: true });
    } else if (a.marks === 'living') {
      backGhosts.push({ x: 1.0, y: 0.35, w: 4.6, h: 1.55 }, { x: 1.9, y: 2.6, w: 2.8, h: 1.3, hook: true });
      for (let i = 0; i < 3; i++) backGhosts.push({ x: 6.0, y: 1.7 + i * 0.85, w: winX - 7.0, h: 0.12 });
      leftGhosts.push({ x: 6.3, y: 1.3, w: 3.0, h: 1.7 }, { x: 6.9, y: 0.35, w: 1.8, h: 0.9 });
    } else {
      backGhosts.push({ x: 3.6, y: 2.7, w: 1.0, h: 1.0, round: true, hook: true }, { x: 5.6, y: 2.3, w: 0.9, h: 1.2, hook: true });
      leftGhosts.push({ x: 7.6, y: 2.2, w: 0.5, h: 0.9, hook: true });
    }
    const swatch: [number, number, string][] = a.occasion === 'in' ? [[1.0, 2.4, '#d9a441'], [1.9, 2.5, '#7fa88f'], [2.8, 2.35, '#c9714f']] : [];
    const backTex = tex(1024, Math.round(1024 * H / W), (c, w, h) => { fade(c, w, h, backGhosts, w / W); for (const [x, y, col] of swatch) { c.fillStyle = col; c.fillRect(x * w / W, h - (y + 0.75) * w / W, 0.75 * w / W, 0.75 * w / W); c.fillRect(x * w / W + 6, h - y * w / W, 5, 14); } });
    const leftTex = tex(804, Math.round(804 * H / D), (c, w, h) => fade(c, w, h, leftGhosts, w / D));
    const wallEdge = flat('#d5cfc0');
    const back = new THREE.Mesh(new THREE.BoxGeometry(W + 0.25, H, 0.25), [wallEdge, wallEdge, wallEdge, wallEdge, new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.95 }), wallEdge]);
    back.position.set(-0.125, H / 2, Z0 - 0.125); back.receiveShadow = true; s.root.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, D), [new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.95 }), wallEdge, wallEdge, wallEdge, wallEdge, wallEdge]);
    left.position.set(X0 - 0.125, H / 2, 0); left.receiveShadow = true; s.root.add(left);
    const trim = s.material('#f3f0e6', { roughness: 0.6 });
    const noShadow = (m: THREE.Mesh) => { m.castShadow = false; return m; };
    s.box([W, 0.36, 0.06], [0, 0.18, Z0 + 0.03], trim); s.box([0.06, 0.36, D], [X0 + 0.03, 0.18, 0], trim);
    s.box([W, 0.1, 0.1], [0, H - 0.4, Z0 + 0.05], trim); s.box([0.1, 0.1, D], [X0 + 0.05, H - 0.4, 0], trim); // picture rail
    // real hooks standing proud of the wall
    const brass = s.material('#b8963f', { metalness: 0.8, roughness: 0.3 });
    for (const g of backGhosts) if (g.hook) s.box([0.05, 0.1, 0.04], [X0 + g.x + g.w / 2, g.y + g.h * 0.84, Z0 + 0.02], brass);
    for (const g of leftGhosts) if (g.hook) s.box([0.04, 0.1, 0.05], [X0 + 0.02, g.y + g.h * 0.84, D / 2 - g.x - g.w / 2], brass);

    // --- window(s) in the back wall, bare, with the rail left up
    const sky = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.45, mix(0.78, 0.9, mood.cheer));
    const glass = new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: mix(0.55, 1.0, 1 - Math.abs(mood.daylight - 0.5) * 2), roughness: 0.2 });
    const spec = { sash: [[2.5, 3.2, 1.2, 2, 3]], picture: [[4.6, 2.2, 1.4, 3, 1]], pair: [[1.3, 3.1, 1.2, 1, 3], [1.3, 3.1, 1.2, 1, 3]], small: [[1.6, 1.4, 2.8, 2, 1]] }[a.window] as number[][];
    const patches: THREE.Mesh[] = [];
    spec.forEach(([ww, wh, sill, cols, rows], idx) => {
      const cx = X0 + winX + ww / 2 + 0.3 + idx * (ww + 0.9), z = Z0 + 0.02;
      noShadow(s.box([ww, wh, 0.04], [cx, sill + wh / 2, z], glass));
      for (const sx of [-1, 1]) s.box([0.16, wh + 0.32, 0.12], [cx + sx * (ww / 2 + 0.08), sill + wh / 2, z + 0.06], trim);
      s.box([ww + 0.32, 0.16, 0.12], [cx, sill + wh + 0.08, z + 0.06], trim);
      s.box([ww + 0.5, 0.1, 0.42], [cx, sill - 0.05, z + 0.2], trim);
      for (let i = 1; i < cols; i++) s.box([0.05, wh, 0.06], [cx - ww / 2 + i * ww / cols, sill + wh / 2, z + 0.04], trim);
      for (let j = 1; j < rows; j++) s.box([ww, j === 1 && a.window === 'sash' ? 0.1 : 0.05, 0.06], [cx, sill + j * wh / rows, z + 0.04], trim);
      // the pool of daylight it throws on the floor
      const lean = mix(-2.4, 2.4, mood.daylight), reach = mix(2.4, 4.6, Math.abs(mood.daylight - 0.5) * 2) * (wh / 3);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x0 = cx - ww / 2 + i * ww / cols + 0.05, x1 = x0 + ww / cols - 0.1, f0 = j / rows, f1 = (j + 1) / rows - 0.04;
        const near = 0.7 + sill * 0.5;
        const pts = [[x0 + lean * (f0 + 0.3), near + reach * f0], [x1 + lean * (f0 + 0.3), near + reach * f0], [x1 + lean * (f1 + 0.3), near + reach * f1], [x0 + lean * (f1 + 0.3), near + reach * f1]];
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(([x, d]) => [x, 0.012, Z0 + d]), 3)); geo.setIndex([0, 2, 1, 0, 3, 2]); geo.computeVertexNormals();
        const patch = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6').lerp(sky, 0.25), transparent: true, opacity: mix(0.3, 0.5, mood.cheer), depthWrite: false })); s.root.add(patch); patches.push(patch);
      }
      // curtain rail with a few orphaned rings
      const railY = sill + wh + 0.42;
      s.rod([cx - ww / 2 - 0.5, railY, z + 0.22], [cx + ww / 2 + 0.5, railY, z + 0.22], 0.035, brass);
      for (const sx of [-1, 1]) { s.ball([0.07, 0.07, 0.07], [cx + sx * (ww / 2 + 0.52), railY, z + 0.22], brass, 10); s.box([0.05, 0.05, 0.22], [cx + sx * (ww / 2 + 0.3), railY, z + 0.11], brass); }
      for (let i = 0; i < 2 + Math.round(random() * 3); i++) { const ring = s.ring(0.07, 0.012, [cx - ww / 2 + random() * ww, railY - 0.05, z + 0.22], brass); ring.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.5; }
      // radiator under the first window
      if (idx === 0 && a.window !== 'small') { const rw = Math.min(ww, 2.6), rad = s.material('#ecebe4', { roughness: 0.5 }); for (let i = 0; i < Math.round(rw / 0.16); i++) s.box([0.11, sill - 0.55, 0.14], [cx - rw / 2 + 0.08 + i * 0.16, 0.25 + (sill - 0.55) / 2, z + 0.16], rad); s.rod([cx - rw / 2 - 0.1, 0.2, z + 0.16], [cx - rw / 2 - 0.1, 0.02, z + 0.16], 0.025, brass); s.rod([cx + rw / 2 + 0.1, 0.2, z + 0.16], [cx + rw / 2 + 0.1, 0.02, z + 0.16], 0.025, brass); }
    });

    // --- door in the left wall, towards the front
    const dz = 3.3, dw = 1.7, dh = 3.9, wx = X0 + 0.01;
    const hallLit = a.door === 'open' || a.door === 'gone';
    if (a.door !== 'closed') noShadow(s.box([0.03, dh, dw], [wx + 0.01, dh / 2, dz], hallLit ? new THREE.MeshStandardMaterial({ color: '#f1dfb4', emissive: '#f3d596', emissiveIntensity: 0.6 }) : flat('#3a3833')));
    for (const sz of [-1, 1]) s.box([0.1, dh + 0.18, 0.18], [wx + 0.05, (dh + 0.18) / 2, dz + sz * (dw / 2 + 0.09)], trim);
    s.box([0.1, 0.18, dw + 0.36], [wx + 0.05, dh + 0.09, dz], trim);
    if (a.door !== 'gone') {
      const swing = a.door === 'open' ? 1.75 : a.door === 'ajar' ? 0.42 : 0;
      const leaf = new THREE.Group(); leaf.position.set(wx + 0.06, 0, dz - dw / 2); leaf.rotation.y = swing;
      const doorMat = s.material(a.walls === 'colour' ? '#f1ede2' : mood.cheer > 0.6 ? '#e9dfc9' : '#e6e2d6', { roughness: 0.6 });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.09, dh - 0.06, dw - 0.04), doorMat); panel.position.set(0.045, dh / 2, dw / 2); leaf.add(panel);
      for (const [py, ph] of [[0.9, 1.2], [2.75, 1.7]]) for (const pz of [0.48, 1.22]) { const inset = new THREE.Mesh(new THREE.BoxGeometry(0.1, ph, 0.52), s.material('#d9d4c6', { roughness: 0.7 })); inset.position.set(0.05, py, pz); leaf.add(inset); }
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), brass); knob.position.set(0.14, 1.95, dw - 0.22); leaf.add(knob);
      if (a.occasion === 'eviction') { const notice = s.label('NOTICE', 0.7, 0.28, [0, 0, 0], '#ffffff', '#c4221c'); notice.rotation.y = Math.PI / 2; notice.position.set(0.105, 2.9, dw / 2); leaf.add(notice); const body = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.75, 0.7), flat('#f6f4ec')); body.position.set(0.098, 2.42, dw / 2); leaf.add(body); for (let i = 0; i < 5; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.03, 0.54), flat('#555')); line.position.set(0.105, 2.62 - i * 0.11, dw / 2); leaf.add(line); } }
      leaf.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = n.receiveShadow = true; }); s.root.add(leaf);
    }
    s.box([0.04, 0.26, 0.2], [wx + 0.02, 2.25, dz - dw / 2 - 0.55], trim); s.box([0.03, 0.09, 0.05], [wx + 0.05, 2.25, dz - dw / 2 - 0.55], s.material('#d9d5c8'));

    // --- a cut-away strip of ceiling with the rose
    const ceil = s.material('#efede6', { roughness: 0.95 });
    const rx = 0.9, rz = -2.9;
    noShadow(s.box([1.7, 0.12, rz - Z0 + 0.85], [rx, H + 0.06, (Z0 + rz + 0.85) / 2], ceil));
    s.lathe([[0, 0], [0.62, 0], [0.6, -0.05], [0.44, -0.07], [0.42, -0.12], [0.26, -0.14], [0.2, -0.2], [0.07, -0.24], [0, -0.24]], ceil, [rx, H, rz]);
    for (let i = 0; i < 12; i++) s.ball([0.045, 0.03, 0.045], [rx + Math.cos(i * 0.5236) * 0.52, H - 0.06, rz + Math.sin(i * 0.5236) * 0.52], ceil, 8);
    const pendant = new THREE.Group(); pendant.position.set(rx, H - 0.22, rz); s.root.add(pendant);
    const hang = (m: THREE.Mesh, y: number) => { m.position.y = y; m.castShadow = true; pendant.add(m); return m; };
    const lit = a.pendant === 'bulb';
    if (a.pendant === 'wires') {
      for (const sx of [-1, 1]) { const wire = hang(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 6), flat(sx > 0 ? '#8a2a22' : '#22272b')), -0.14); wire.position.x = sx * 0.04; wire.rotation.z = sx * 0.3; const capm = hang(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.07, 8), flat('#e9e6dc')), -0.3); capm.position.x = sx * 0.085; }
    } else {
      const drop = 1.15;
      hang(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, drop, 6), flat('#e9e4d6')), -drop / 2);
      hang(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 12), flat('#f1eee4', 0.5)), -drop - 0.06);
      if (a.pendant !== 'flex') {
        hang(new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), new THREE.MeshStandardMaterial({ color: lit ? '#fff3cf' : '#e6e7e2', emissive: '#ffd27a', emissiveIntensity: lit ? 1.7 : 0, roughness: 0.2 })), -drop - 0.26);
        if (lit) hang(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffdf9c', transparent: true, opacity: 0.15, depthWrite: false })), -drop - 0.26).castShadow = false;
      }
    }

    // --- what the occasion left in the back-left corner and along the wall
    const kraft = s.material('#b98d5c', { roughness: 0.92 }), bagMat = s.material('#1f2224', { roughness: 0.35 });
    const cxn = X0 + 1.2, czn = Z0 + 1.1;
    const bag = (x: number, z: number, r: number) => { const b = s.ball([r, r * 0.92, r * 0.9], [x, r * 0.8, z], bagMat, 12); b.rotation.y = random() * 3; s.mesh(new THREE.ConeGeometry(r * 0.25, r * 0.5, 8), bagMat, [x, r * 1.75, z]).rotation.x = Math.PI; };
    if (a.occasion === 'out') {
      s.rod([cxn + 0.4, 0.1, czn + 0.2], [cxn - 0.9, 3.3, czn - 0.95], 0.035, s.material('#c9a36a'));
      s.box([0.8, 0.12, 0.14], [cxn + 0.42, 0.2, czn + 0.22], s.material('#3f6f8c')).rotation.y = 0.7; s.box([0.74, 0.14, 0.2], [cxn + 0.46, 0.07, czn + 0.26], s.material('#c9b37a', { roughness: 1 })).rotation.y = 0.7;
      bag(cxn + 1.5, czn - 0.2, 0.5);
      const pan = s.box([0.55, 0.04, 0.45], [cxn + 0.9, 0.03, czn + 1.2], s.material('#c8372d')); pan.rotation.y = -0.5; s.rod([cxn + 1.05, 0.05, czn + 1.45], [cxn + 1.3, 0.12, czn + 1.85], 0.03, s.material('#c8372d'));
      const dust: { at: [number, number, number]; size: number }[] = []; for (let i = 0; i < 60; i++) { const an = random() * 6.3, r = Math.sqrt(random()) * 0.35; dust.push({ at: [cxn + 0.6 + Math.cos(an) * r, 0.02, czn + 0.85 + Math.sin(an) * r * 0.7], size: 0.02 + random() * 0.04 }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), flat('#a59a8a'), dust);
    } else if (a.occasion === 'in') {
      const alu = s.material('#b9bdc0', { metalness: 0.6, roughness: 0.4 }); const lx = X0 + 3.1, lz = Z0 + 1.6;
      for (const sx of [-1, 1]) { s.rod([lx + sx * 0.5, 0, lz + 0.55], [lx + sx * 0.38, 2.6, lz], 0.04, alu); s.rod([lx + sx * 0.5, 0, lz - 0.75], [lx + sx * 0.38, 2.6, lz], 0.035, alu); }
      for (let i = 1; i <= 4; i++) s.box([0.98 - i * 0.04, 0.05, 0.2], [lx, i * 0.52, lz + 0.55 - i * 0.11], alu);
      s.box([0.86, 0.07, 0.42], [lx, 2.63, lz], s.material('#c8372d'));
      const sheet = s.box([3.4, 0.03, 2.4], [X0 + 3.0, 0.015, Z0 + 1.9], s.material('#e9e6da', { roughness: 1 })); sheet.rotation.y = 0.08; sheet.castShadow = false;
      s.cylinder(0.26, 0.26, 0.5, [lx + 1.2, 0.28, lz + 0.5], s.material('#d9dcdc', { metalness: 0.6, roughness: 0.35 }), 20); s.cylinder(0.24, 0.24, 0.02, [lx + 1.2, 0.54, lz + 0.5], s.material('#d9a441'), 20); s.ring(0.3, 0.012, [lx + 1.2, 0.5, lz + 0.5], alu, Math.PI).rotation.y = 0.5;
      s.box([0.6, 0.1, 0.8], [lx + 0.2, 0.08, lz + 1.5], s.material('#2a2c2e')).rotation.y = 0.4; const roller = s.cylinder(0.07, 0.07, 0.5, [lx + 0.2, 0.19, lz + 1.4], s.material('#d9a441', { roughness: 1 }), 12); roller.rotation.z = Math.PI / 2; roller.rotation.y = 0.4;
    } else if (a.occasion === 'eviction') {
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) bag(cxn + (i % 3) * 0.85 + random() * 0.3, czn + Math.floor(i / 3) * 0.8 + random() * 0.3, 0.42 + random() * 0.16);
      const wire = s.material('#8c9094', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < 4; i++) { const hx = X0 + 2 + random() * 3.5, hz = Z0 + 2.4 + random() * 1.4, r = random() * 3; const g = new THREE.Group(); const tri = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 4, 3), wire); tri.rotation.x = Math.PI / 2; tri.scale.z = 1; tri.scale.y = 0.45; g.add(tri); const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10, 4), wire); hook.rotation.x = Math.PI / 2; hook.position.set(0.02, 0, -0.2); g.add(hook); g.position.set(hx, 0.02, hz); g.rotation.y = r; s.root.add(g); }
      const shoe = s.ball([0.3, 0.1, 0.12], [X0 + 4.6, 0.1, Z0 + 1.2], s.material('#6b3f2a'), 10); shoe.rotation.y = 0.8;
    } else if (a.occasion === 'parent') {
      // the clock nobody has had the heart to take down, a calendar, and the albums
      const ck: [number, number, number] = [X0 + 3.4, 3.4, Z0 + 0.05];
      s.cylinder(0.42, 0.42, 0.1, ck, s.material('#5b3b22'), 28).rotation.x = Math.PI / 2; s.cylinder(0.36, 0.36, 0.11, ck, flat('#f3efe2', 0.4), 28).rotation.x = Math.PI / 2;
      s.rod([ck[0], ck[1], ck[2] + 0.07], [ck[0] + 0.14, ck[1] + 0.2, ck[2] + 0.07], 0.014, flat('#222')); s.rod([ck[0], ck[1], ck[2] + 0.07], [ck[0] - 0.24, ck[1] - 0.06, ck[2] + 0.07], 0.01, flat('#222'));
      const cal = s.label(['MARCH', 'NOVEMBER', 'JUNE', 'JANUARY'][Math.floor(random() * 4)], 0.7, 0.2, [X0 + 5.3, 2.75, Z0 + 0.04], '#ffffff', '#a3352c'); cal.castShadow = false;
      s.box([0.7, 0.7, 0.02], [X0 + 5.3, 2.3, Z0 + 0.02], flat('#f6f4ec')); for (let i = 0; i < 5; i++) s.box([0.58, 0.012, 0.01], [X0 + 5.3, 2.5 - i * 0.11, Z0 + 0.035], flat('#888'));
      const cols = ['#7a2e2a', '#23405f', '#2f5a45', '#5b3b22', '#c2912e']; let y = 0;
      for (let i = 0; i < 5 + Math.round(mood.density * 3); i++) { const h = 0.1 + random() * 0.07; s.box([0.9 - random() * 0.1, h, 0.7], [cxn + 0.7 + (random() - 0.5) * 0.06, y + h / 2, czn + 0.5], s.material(cols[i % 5])).rotation.y = (random() - 0.5) * 0.3; y += h; }
      const tea = s.box([1.3, 0.95, 1.0], [cxn + 2.3, 0.475, czn + 0.3], kraft); tea.rotation.y = 0.15; const text = s.label("MUM'S", 0.95, 0.36, [cxn + 2.3 + 0.075, 0.5, czn + 0.3 + 0.503], '#161616', '#b98d5c'); text.rotation.y = 0.15;
      s.rod([X0 + 0.35, 0, Z0 + 3.4], [X0 + 0.12, 2.0, Z0 + 3.3], 0.03, s.material('#5b3b22')); s.ring(0.11, 0.03, [X0 + 0.12, 2.08, Z0 + 3.24], s.material('#5b3b22'), Math.PI).rotation.y = Math.PI / 2;
    } else {
      const board = s.label('SOLD', 1.3, 0.5, [0, 0, 0], '#ffffff', '#1d3f8f'); board.position.set(X0 + 2.2, 0.75, Z0 + 0.5); board.rotation.x = -0.35; s.box([1.4, 0.6, 0.04], [X0 + 2.2, 0.74, Z0 + 0.47], flat('#f3f0e6')).rotation.x = -0.35; s.rod([X0 + 2.2, 0, Z0 + 0.7], [X0 + 2.2, 0.5, Z0 + 0.52], 0.03, flat('#f3f0e6'));
    }
    // unpainted squares where sockets and the aerial point are, and a phone line trailing on the floor
    s.box([0.3, 0.3, 0.04], [X0 + 0.02, 0.6, -1.9], trim); s.box([0.3, 0.3, 0.04], [X0 + 6.8, 0.6, Z0 + 0.02], trim);
    s.tube([[X0 + 6.8, 0.5, Z0 + 0.06], [X0 + 6.9, 0.03, Z0 + 0.3], [X0 + 7.4, 0.02, Z0 + 0.9], [X0 + 6.7, 0.02, Z0 + 1.3], [X0 + 7.1, 0.02, Z0 + 1.7]], 0.02, flat('#e9e4d6'));

    const sway = mood.energy * 0.05, flick = lit ? mood.energy * 0.12 : 0;
    world.update = (_dt, time) => { pendant.rotation.z = Math.sin(time * 0.9) * sway; pendant.rotation.x = Math.cos(time * 0.7) * sway * 0.6; if (flick) { const bulb = pendant.children[2] as THREE.Mesh | undefined; const m = bulb?.material as THREE.MeshStandardMaterial | undefined; if (m && 'emissiveIntensity' in m) m.emissiveIntensity = 1.7 + Math.sin(time * 13) * flick + Math.sin(time * 31) * flick; } };
    void patches;
    return world;
  },
});
