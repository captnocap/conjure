import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    kind: choice('What sort of hut is it?', {
      club: 'A solid two-storey alpine club hut with rows of small windows.',
      low: 'A long low single-storey shelter hunched against the wind.',
      bivouac: 'A tiny one-room emergency bivouac, a stone box with one window.',
    }),
    walls: choice('What are the walls built of?', {
      granite: 'Pale grey granite rubble with fat mortar joints.',
      ochre: 'Warm ochre limestone.',
      slate: 'Dark blue-grey schist laid in thin courses.',
    }),
    roof: choice('What is the roof?', {
      zinc: 'Dull grey standing-seam zinc.',
      red: 'Red-painted tin.',
      slab: 'Thick stone slabs.',
      copper: 'Weathered green copper.',
    }),
    shutters: choice('How are the shutters painted?', {
      chevron: 'Red-and-white diagonal chevrons, the classic hut pattern.',
      stripes: 'Red with a white band across the middle.',
      green: 'Plain dark green.',
      blue: 'Sky blue and white diagonals.',
    }),
    state: choice('What is going on at the hut?', {
      open: 'Open for the season: shutters back, door open, smoke rising, boots on the rack.',
      storm: 'A storm is coming: upper shutters shut, every lower window lit, the door closed.',
      winter: 'Shut for winter: all shutters closed, snow drifted against the walls, the pole bare.',
      busy: 'A busy noon: rucksacks piled on the terrace, socks on a line, the rack overflowing.',
    }),
    flag: choice('What flies from the pole?', {
      cross: 'A square red flag with a white cross.',
      bars: 'Red, white and red horizontal bars.',
      tricolour: 'A green, white and red vertical tricolour.',
      pennant: 'A long yellow club pennant.',
      prayer: 'A string of small coloured prayer flags instead of one flag.',
    }),
    outside: choice('What stands on the terrace?', {
      table: 'A plank table and benches with soup bowls left on it.',
      wood: 'A long stack of split firewood against the wall and a chopping block.',
      trough: 'A hollowed-log water trough fed by a trickling pipe.',
      supplies: 'Crates, gas bottles and beer kegs dropped by the supply helicopter.',
    }),
    sign: choice('What does the board over the door say?', {
      hutte: 'HÜTTE 2647 m',
      rifugio: 'RIFUGIO',
      refuge: 'REFUGE',
      cabane: 'CABANE',
      winter: 'WINTERRAUM OFFEN',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [W, D, wallH, floors] = ({ club: [7.2, 5, 4.4, 2], low: [8.4, 4.2, 2.75, 1], bivouac: [3.8, 3.2, 2.75, 1] } as const)[a.kind];
    const winter = a.state === 'winter', storm = a.state === 'storm', busy = a.state === 'busy';
    const stoneBase = { granite: [168, 166, 160], ochre: [196, 168, 122], slate: [96, 104, 116] }[a.walls];
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d')!;
    c.fillStyle = a.walls === 'slate' ? '#5a606a' : '#d6d1c4'; c.fillRect(0, 0, 256, 256);
    const rowsN = a.walls === 'slate' ? 16 : 8;
    for (let row = 0; row < rowsN; row++) for (let x = -20 + (row % 2) * 17; x < 256;) {
      const w = (a.walls === 'slate' ? 30 : 24) + random() * 34, v = (random() - 0.5) * 46;
      c.fillStyle = `rgb(${stoneBase[0] + v},${stoneBase[1] + v},${stoneBase[2] + v})`;
      c.beginPath(); c.roundRect(x + 2, row * 256 / rowsN + 2, w - 4, 256 / rowsN - 4, a.walls === 'slate' ? 1 : 6); c.fill();
      x += w;
    }
    const wallTex = (rx: number, ry: number) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
    const front = s.material('#ffffff', { map: wallTex(W / 2.4, wallH / 2.4), roughness: 1 });
    const side = s.material('#ffffff', { map: wallTex(D / 2.4, wallH / 2.4), roughness: 1 });
    const gableMat = s.material('#ffffff', { map: wallTex(1 / 2.4, 1 / 2.4), roughness: 1 });
    const paving = s.material('#a9a79f', { map: wallTex((W + 1.4) / 2.6, (D + 3.6) / 2.6), roughness: 1 });
    const timber = s.material('#6a4a30', { roughness: 0.9 });
    const timberPale = s.material('#b8925e', { roughness: 0.9 });
    const whiteP = s.material('#f1eee6', { roughness: 0.7 });
    const metal = s.material('#8e969a', { metalness: 0.75, roughness: 0.4 });
    const iron = s.material('#33363a', { metalness: 0.6, roughness: 0.5 });
    const snow = s.material('#f5f8fb', { roughness: 0.6 });
    const lit = storm || mood.daylight > 0.8 || mood.daylight < 0.15;
    const glass = s.material(lit && !winter ? '#ffd27a' : '#27323a', { roughness: 0.2, emissive: lit && !winter ? '#ffb340' : '#000000', emissiveIntensity: lit ? 1.3 : 0 });
    const darkIn = s.material('#17130f', { roughness: 1 });

    // Terrace and body.
    const T = 0.22, zf = D / 2;
    s.box([W + 1.4, T, D + 3.6], [0, T / 2, 1.2], paving);
    s.box([W, wallH, D], [0, T + wallH / 2, 0], [side, side, front, front, front, front] as unknown as THREE.Material);
    const pitch = a.roof === 'slab' ? 0.45 : 0.58, rise = (D / 2) * Math.tan(pitch), eave = T + wallH, ridgeY = eave + rise;
    const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, rise); tri.lineTo(-D / 2, 0);
    for (const x of [-1, 1]) { const g = s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }), gableMat, [x * (W / 2) - (x > 0 ? 0.3 : 0), eave, 0]); g.rotation.y = Math.PI / 2; g.position.x = x > 0 ? W / 2 - 0.3 : -W / 2; }
    // Quoins.
    for (const x of [-1, 1]) for (const z of [-1, 1]) for (let i = 0; i < Math.floor(wallH / 0.5); i++) s.box([0.34 + (i % 2) * 0.16, 0.34, 0.34 + ((i + 1) % 2) * 0.16], [x * (W / 2 - 0.1), T + 0.25 + i * 0.5, z * (D / 2 - 0.1)], s.material(`rgb(${stoneBase.map((v) => Math.round(v * 0.82)).join(',')})`, { roughness: 1 }));

    // Roof.
    const rc = document.createElement('canvas'); rc.width = rc.height = 256;
    const r2 = rc.getContext('2d')!;
    const roofCol = { zinc: '#8d959b', red: '#a8322a', slab: '#73777d', copper: '#5c9a86' }[a.roof];
    r2.fillStyle = roofCol; r2.fillRect(0, 0, 256, 256);
    if (a.roof === 'slab') { for (let row = 0; row < 7; row++) for (let x = -10 + (row % 2) * 14; x < 256;) { const w = 22 + random() * 26; r2.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},${random() * 0.22})`; r2.fillRect(x + 1, row * 36.6, w - 2, 33); r2.fillStyle = 'rgba(0,0,0,0.4)'; r2.fillRect(x, row * 36.6 + 33, w, 4); x += w; } }
    else for (let x = 0; x < 256; x += 256 / 14) { r2.fillStyle = 'rgba(255,255,255,0.3)'; r2.fillRect(x, 0, 3, 256); r2.fillStyle = 'rgba(0,0,0,0.3)'; r2.fillRect(x + 3, 0, 3, 256); }
    for (let i = 0; i < 20 * mood.wear; i++) { r2.fillStyle = 'rgba(120,70,40,0.3)'; r2.fillRect(random() * 256, random() * 256, 6 + random() * 14, 30 + random() * 80); }
    const roofTex = new THREE.CanvasTexture(rc); roofTex.colorSpace = THREE.SRGBColorSpace; roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.repeat.set(W / 5, 1);
    const roofMat = s.material('#ffffff', { map: roofTex, roughness: a.roof === 'slab' ? 0.95 : 0.5, metalness: a.roof === 'slab' ? 0 : 0.4 });
    const over = 0.45, L = (D / 2 + over) / Math.cos(pitch), thick = a.roof === 'slab' ? 0.16 : 0.07, roofW = W + 0.7;
    const onRoof = (x: number, f: number, sideZ: number, lift = 0): P3 => [x, ridgeY - f * L * Math.sin(pitch) + thick + lift, sideZ * f * L * Math.cos(pitch)];
    for (const z of [-1, 1]) {
      const slab = s.box([roofW, thick, L], [0, ridgeY - (L / 2) * Math.sin(pitch) + thick / 2, z * (L / 2) * Math.cos(pitch)], roofMat);
      slab.rotation.x = z * pitch;
      if (winter || (mood.warmth < 0.12 && storm)) { const cap = s.box([roofW + 0.1, 0.22, L * 0.96], [0, ridgeY - (L / 2) * Math.sin(pitch) + thick + 0.1, z * (L / 2) * Math.cos(pitch)], snow); cap.rotation.x = z * pitch; }
    }
    s.box([roofW + 0.04, 0.1, 0.34], [0, ridgeY + thick + 0.02, 0], a.roof === 'slab' ? s.material('#5f6368') : metal);
    // Chimney: a stove pipe with a storm cap and stays.
    const cx = W * 0.26, cBase = onRoof(cx, 0.3, -1), cTop = ridgeY + 1.25;
    s.cylinder(0.13, 0.13, cTop - cBase[1] + 0.3, [cx, (cTop + cBase[1] - 0.3) / 2, cBase[2]], metal, 12);
    s.cylinder(0.2, 0.2, 0.05, [cx, cBase[1] + 0.12, cBase[2]], iron, 12);
    s.cylinder(0.02, 0.26, 0.16, [cx, cTop + 0.16, cBase[2]], iron, 12);
    s.cylinder(0.15, 0.15, 0.06, [cx, cTop + 0.03, cBase[2]], iron, 6);
    for (const dx of [-1, 1]) s.rod([cx, cTop - 0.25, cBase[2]], onRoof(cx + dx * 1.1, 0.45, -1), 0.012, iron);
    s.rod([cx, cTop - 0.25, cBase[2]], onRoof(cx, 0.25, 1), 0.012, iron);
    const puffs: THREE.Mesh[] = [];
    if (!winter) {
      const smokeMat = new THREE.MeshBasicMaterial({ color: storm ? '#8d9299' : '#e9ecee', transparent: true, opacity: 0.34, depthWrite: false });
      for (let i = 0; i < 5; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + i * 0.05, 10, 8), smokeMat); puff.position.set(cx + i * 0.16, cTop + 0.4 + i * 0.36, cBase[2]); s.root.add(puff); puffs.push(puff); }
    }

    // Shutters.
    const sc = document.createElement('canvas'); sc.width = 64; sc.height = 128;
    const c3 = sc.getContext('2d')!;
    if (a.shutters === 'green') { c3.fillStyle = '#23513a'; c3.fillRect(0, 0, 64, 128); c3.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 8; y < 128; y += 16) c3.fillRect(6, y, 52, 4); }
    else if (a.shutters === 'stripes') { c3.fillStyle = '#c4202a'; c3.fillRect(0, 0, 64, 128); c3.fillStyle = '#f4f1e8'; c3.fillRect(0, 46, 64, 36); }
    else {
      const [p, q] = a.shutters === 'chevron' ? ['#c4202a', '#f4f1e8'] : ['#3d8fd6', '#f4f1e8'];
      c3.fillStyle = q; c3.fillRect(0, 0, 64, 128); c3.fillStyle = p;
      for (let k = -2; k < 6; k++) { c3.beginPath(); c3.moveTo(0, k * 40 + 20); c3.lineTo(32, k * 40); c3.lineTo(64, k * 40 + 20); c3.lineTo(64, k * 40 + 40); c3.lineTo(32, k * 40 + 20); c3.lineTo(0, k * 40 + 40); c3.fill(); }
    }
    const shTex = new THREE.CanvasTexture(sc); shTex.colorSpace = THREE.SRGBColorSpace;
    const shutter = s.material('#ffffff', { map: shTex, roughness: 0.7 });
    const windowAt = (x: number, y: number, shut: boolean, w = 0.72, h = 0.92) => {
      s.box([w + 0.16, h + 0.16, 0.08], [x, y, zf], whiteP);
      s.box([w, h, 0.05], [x, y, zf + 0.03], glass);
      s.box([0.04, h, 0.03], [x, y, zf + 0.06], whiteP); s.box([w, 0.04, 0.03], [x, y, zf + 0.06], whiteP);
      s.box([w + 0.3, 0.07, 0.2], [x, y - h / 2 - 0.1, zf + 0.06], s.material('#8a8880'));
      for (const d of [-1, 1]) {
        const leaf = shut ? s.box([w / 2 + 0.04, h + 0.1, 0.045], [x + d * (w / 4 + 0.02), y, zf + 0.09], shutter) : s.box([w / 2 + 0.04, h + 0.1, 0.045], [x + d * (w * 0.75 + 0.12), y, zf + 0.045], shutter);
        if (!shut && mood.wear > 0.6 && random() < 0.3) leaf.rotation.z = d * 0.12;
      }
    };
    const doorX = a.kind === 'bivouac' ? -0.75 : -W * 0.18;
    const y1 = T + 1.45, y2 = T + 3.45;
    const lower = a.kind === 'bivouac' ? [0.95] : a.kind === 'club' ? [-W * 0.4, W * 0.05, W * 0.22, W * 0.39] : [-W * 0.4, W * 0.02, W * 0.16, W * 0.3, W * 0.43];
    for (const x of lower) windowAt(x, y1, winter);
    if (floors === 2) for (const x of [-W * 0.4, -W * 0.18, W * 0.05, W * 0.22, W * 0.39]) windowAt(x, y2, winter || storm);

    // Door, sign, lamp.
    const doorOpen = a.state === 'open' || busy;
    s.box([1.2, 2.2, 0.1], [doorX, T + 1.08, zf], timber);
    if (doorOpen) s.box([0.96, 2.0, 0.05], [doorX, T + 1.0, zf + 0.04], darkIn);
    const door = new THREE.Group(); door.position.set(doorX - 0.48, T + 1.0, zf + 0.07); door.rotation.y = doorOpen ? -1.9 : 0;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.0, 0.06), a.shutters === 'green' ? s.material('#23513a') : s.material('#8a2a22', { roughness: 0.7 }));
    leaf.position.x = 0.48; leaf.castShadow = true; door.add(leaf);
    for (const y of [-0.6, 0.6]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.015), iron); strap.position.set(0.44, y, 0.035); door.add(strap); }
    s.root.add(door);
    if (winter) s.box([1.3, 0.12, 0.06], [doorX, T + 1.1, zf + 0.13], timberPale);
    s.box([1.5, 0.16, 0.5], [doorX, T + 0.08, zf + 0.25], s.material('#8a8880'));
    const signText = { hutte: 'HÜTTE 2647 m', rifugio: 'RIFUGIO', refuge: 'REFUGE', cabane: 'CABANE', winter: 'WINTERRAUM OFFEN' }[a.sign];
    s.box([1.9, 0.44, 0.05], [doorX, T + 2.48, zf + 0.04], timber);
    s.label(signText, 1.8, 0.36, [doorX, T + 2.48, zf + 0.07], '#f6ecd0', '#5a3a24');
    s.box([0.14, 0.2, 0.14], [doorX + 0.85, T + 2.0, zf + 0.12], s.material('#ffe2a0', { emissive: '#ffc04a', emissiveIntensity: lit && !winter ? 2 : 0.1 }));
    s.box([0.2, 0.04, 0.2], [doorX + 0.85, T + 2.12, zf + 0.12], iron);

    // Boot rack beside the door.
    const rx = doorX + 1.45, bootN = winter ? 0 : Math.round(mix(2, 7, mood.density)) + (busy ? 3 : 0);
    for (const x of [-0.62, 0.62]) s.box([0.06, 0.95, 0.34], [rx + x, T + 0.47, zf + 0.26], timberPale);
    for (const y of [0.18, 0.56, 0.92]) s.box([1.3, 0.04, 0.36], [rx, T + y, zf + 0.26], timberPale);
    const bootCols = ['#6a4630', '#3a3d42', '#a85a2a', '#6f7a4a', '#b0302a', '#2f4f7a'];
    for (let i = 0; i < bootN; i++) {
      const shelf = i % 2, bx = rx - 0.5 + Math.floor(i / 2) * 0.27 + random() * 0.03, by = T + (shelf ? 0.58 : 0.2);
      const m = s.material(bootCols[Math.floor(random() * bootCols.length)], { roughness: 0.8 });
      for (const d of [-1, 1]) { s.box([0.085, 0.07, 0.24], [bx + d * 0.055, by + 0.035, zf + 0.28], m); s.box([0.085, 0.2, 0.1], [bx + d * 0.055, by + 0.14, zf + 0.21], m); }
    }
    if (!winter) for (let i = 0; i < 2 + (busy ? 3 : 0); i++) s.rod([rx + 0.75 + i * 0.07, T, zf + 0.4], [rx + 0.72 + i * 0.07, T + 1.25, zf + 0.06], 0.012, i % 2 ? s.material('#d93a2a') : metal);

    // Terrace furniture.
    const ox = a.kind === 'bivouac' ? 1.0 : W * 0.26, oz = zf + 1.75;
    if (a.outside === 'table') {
      s.box([2.0, 0.07, 0.8], [ox, T + 0.76, oz], timberPale);
      for (const x of [-0.8, 0.8]) { s.box([0.08, 0.74, 0.7], [ox + x, T + 0.37, oz], timber); }
      for (const z of [-0.68, 0.68]) { s.box([2.0, 0.06, 0.28], [ox, T + 0.45, oz + z], timberPale); for (const x of [-0.8, 0.8]) s.box([0.07, 0.44, 0.24], [ox + x, T + 0.22, oz + z], timber); }
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) { const bx = ox - 0.75 + i * 0.36; s.cylinder(0.1, 0.06, 0.07, [bx, T + 0.83, oz + (i % 2 ? 0.2 : -0.2)], whiteP, 12); s.cylinder(0.085, 0.085, 0.01, [bx, T + 0.862, oz + (i % 2 ? 0.2 : -0.2)], s.material('#c9772a'), 12); }
      s.cylinder(0.05, 0.06, 0.2, [ox + 0.8, T + 0.9, oz], s.material('#5a3a1e', { roughness: 0.3 }), 10);
    } else if (a.outside === 'wood') {
      const cut = s.material('#d2a86c', { roughness: 0.9 });
      const len = a.kind === 'bivouac' ? 5 : 12;
      for (let row = 0; row < 6; row++) for (let i = 0; i < len; i++) { if (row > 3 && random() < 0.4) continue; s.cylinder(0.085, 0.085, 0.45, [ox - len * 0.085 + i * 0.175 + (row % 2) * 0.08, T + 0.09 + row * 0.165, zf + 0.26], (i + row) % 4 ? cut : timber, 6).rotation.x = Math.PI / 2; }
      s.cylinder(0.28, 0.3, 0.5, [ox, T + 0.25, oz + 0.3], timber, 10);
      s.rod([ox + 0.02, T + 0.5, oz + 0.3], [ox + 0.45, T + 0.95, oz + 0.2], 0.02, timberPale);
      s.box([0.05, 0.2, 0.14], [ox + 0.05, T + 0.56, oz + 0.3], iron).rotation.z = -0.75;
    } else if (a.outside === 'trough') {
      const tr = s.cylinder(0.28, 0.28, 2.0, [ox, T + 0.42, oz], timber, 10); tr.rotation.z = Math.PI / 2;
      s.box([1.8, 0.03, 0.36], [ox, T + 0.62, oz], s.material('#5a8fa8', { roughness: 0.1, metalness: 0.3 }));
      for (const x of [-0.7, 0.7]) s.box([0.2, 0.26, 0.6], [ox + x, T + 0.13, oz], s.material('#8a8880'));
      s.rod([ox - 1.0, T, oz - 0.3], [ox - 1.0, T + 1.1, oz - 0.3], 0.03, metal); s.rod([ox - 1.0, T + 1.1, oz - 0.3], [ox - 0.7, T + 1.0, oz - 0.05], 0.03, metal);
      s.rod([ox - 0.7, T + 1.0, oz - 0.05], [ox - 0.68, T + 0.64, oz - 0.03], 0.012, s.material('#cfe6ee', { roughness: 0.1 }));
    } else {
      for (let i = 0; i < 4; i++) s.box([0.6, 0.4, 0.45], [ox - 0.7 + (i % 2) * 0.66, T + 0.2 + Math.floor(i / 2) * 0.41, oz + (random() - 0.5) * 0.06], i === 3 ? s.material('#3d6fb0') : timberPale).rotation.y = (random() - 0.5) * 0.15;
      for (let i = 0; i < 3; i++) { s.cylinder(0.19, 0.19, 0.5, [ox + 0.75 + i * 0.42, T + 0.25, oz + 0.2], metal, 12); s.cylinder(0.2, 0.2, 0.04, [ox + 0.75 + i * 0.42, T + 0.25, oz + 0.2], iron, 12); }
      for (let i = 0; i < 2; i++) { s.cylinder(0.15, 0.15, 0.6, [ox + 0.2 + i * 0.36, T + 0.3, oz - 0.55], s.material(i ? '#c4202a' : '#2f6f5a', { metalness: 0.3 }), 12); s.cylinder(0.05, 0.08, 0.1, [ox + 0.2 + i * 0.36, T + 0.65, oz - 0.55], iron, 8); }
    }
    if (busy) {
      const packCols = ['#e2632a', '#2f6fd0', '#3f9a4a', '#c4202a', '#f0c330', '#5a4a8a'];
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) { const bx = -W / 2 + 0.4 + random() * 1.8, bz = zf + 0.5 + random() * 1.8; const m = s.material(packCols[i % 6], { roughness: 0.8 }); s.ball([0.2, 0.3, 0.17], [bx, T + 0.26, bz], m, 10); s.ball([0.16, 0.1, 0.14], [bx, T + 0.54, bz], m, 8); }
      const lx0 = -W / 2 - 0.3, lx1 = -W / 2 + 2.2, lz = zf + 2.7;
      for (const x of [lx0, lx1]) s.rod([x, T, lz], [x, T + 1.7, lz], 0.03, timber);
      s.rod([lx0, T + 1.65, lz], [lx1, T + 1.65, lz], 0.008, iron);
      for (let i = 0; i < 7; i++) s.box([0.12 + random() * 0.14, 0.3 + random() * 0.2, 0.02], [lx0 + 0.25 + i * 0.33, T + 1.44, lz], s.material(['#f1eee6', '#c4202a', '#3d6fb0', '#6f7a4a', '#f0c330'][i % 5], { side: THREE.DoubleSide })).rotation.x = (random() - 0.5) * 0.3;
    }
    if (winter) for (let i = 0; i < 14; i++) { const x = -W / 2 - 0.2 + random() * (W + 0.4); s.ball([0.7 + random() * 0.7, 0.3 + random() * 0.45, 0.55 + random() * 0.4], [x, T, zf + 0.25 + random() * 0.5], snow, 10); }
    if (winter) for (let i = 0; i < 12; i++) s.cylinder(0.035, 0.003, 0.2 + random() * 0.35, [-roofW / 2 + 0.3 + i * (roofW - 0.6) / 11, eave - 0.3 - random() * 0.05, zf + over - 0.05], snow, 5);

    // Flag.
    const fx = W / 2 + 0.35, fz = zf + 2.6, poleH = Math.max(eave + rise * 0.6, 4.2);
    s.cylinder(0.035, 0.05, poleH, [fx, T + poleH / 2, fz], whiteP, 8);
    s.ball([0.07, 0.07, 0.07], [fx, T + poleH + 0.05, fz], s.material('#d0a23a', { metalness: 0.8, roughness: 0.3 }), 8);
    const flags: THREE.Mesh[] = [];
    if (!winter) {
      if (a.flag === 'prayer') {
        const end: P3 = [W / 2 - 0.1, eave - 0.1, zf + 0.1], start: P3 = [fx, T + poleH - 0.1, fz];
        s.rod(start, end, 0.008, iron);
        const cols = ['#2f6fd0', '#f1f1ea', '#d3312c', '#3f9a4a', '#f0c330'];
        for (let i = 0; i < 11; i++) { const t = 0.06 + i * 0.085; const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.3), new THREE.MeshStandardMaterial({ color: cols[i % 5], side: THREE.DoubleSide, roughness: 0.9 })); flag.geometry.translate(0, -0.15, 0); flag.position.set(mix(start[0], end[0], t), mix(start[1], end[1], t), mix(start[2], end[2], t)); flag.rotation.y = 0.5; s.root.add(flag); flags.push(flag); }
      } else {
        const fc = document.createElement('canvas'); fc.width = 192; fc.height = 128;
        const f = fc.getContext('2d')!;
        let fw = 1.5, fh = 1.0;
        if (a.flag === 'cross') { fw = 1.1; fh = 1.1; f.fillStyle = '#d3231f'; f.fillRect(0, 0, 192, 128); f.fillStyle = '#ffffff'; f.fillRect(76, 22, 40, 84); f.fillRect(48, 46, 96, 36); }
        else if (a.flag === 'bars') { f.fillStyle = '#d3231f'; f.fillRect(0, 0, 192, 128); f.fillStyle = '#ffffff'; f.fillRect(0, 43, 192, 42); }
        else if (a.flag === 'tricolour') { f.fillStyle = '#1f8a4a'; f.fillRect(0, 0, 64, 128); f.fillStyle = '#ffffff'; f.fillRect(64, 0, 64, 128); f.fillStyle = '#d3231f'; f.fillRect(128, 0, 64, 128); }
        else { fw = 2.0; fh = 0.6; f.fillStyle = '#f0c330'; f.fillRect(0, 0, 192, 128); f.fillStyle = '#1f2a44'; f.fillRect(0, 50, 192, 28); }
        const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
        const tatter = mood.wear > 0.7 ? 0.7 : 1;
        const g = new THREE.PlaneGeometry(fw * tatter, fh, 12, 1); g.translate(fw * tatter / 2, 0, 0);
        if (a.flag === 'pennant') { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 - p.getX(i) / fw * 0.85)); }
        const flag = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: 0.8 }));
        flag.position.set(fx + 0.04, T + poleH - fh / 2 - 0.1, fz); flag.rotation.y = 0.35; flag.castShadow = true;
        s.root.add(flag); flags.push(flag);
      }
    }
    const single = flags.length === 1 ? flags[0] : null;
    const rest = single ? Float32Array.from(single.geometry.attributes.position.array) : null;
    const gust = mix(0.25, 1.6, mood.energy) * (storm ? 1.6 : 1);
    const wave = (time: number) => {
      if (single && rest) { const p = single.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = rest[i * 3]; p.setZ(i, Math.sin(x * 4.5 - time * 5 * gust) * 0.12 * x * Math.min(gust + 0.4, 1.5)); p.setY(i, rest[i * 3 + 1] - x * x * 0.12 / Math.max(gust, 0.3) * 0.3); } p.needsUpdate = true; single.geometry.computeVertexNormals(); }
      else flags.forEach((flag, i) => { flag.rotation.x = Math.sin(time * 5 * gust + i) * 0.5 * Math.min(gust, 1.2); });
      puffs.forEach((puff, i) => { const t = (time * 0.25 * gust + i / puffs.length) % 1; puff.position.set(cx + t * 1.4 * gust, cTop + 0.3 + t * 2.0, cBase[2]); puff.scale.setScalar(0.6 + t * 1.1); });
    };
    wave(random() * 10);
    return s.finish({ update: (_dt, time) => wave(time) });
  },
});
