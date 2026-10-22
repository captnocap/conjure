import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
const PAPER = '#f3f0e6';
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export default defineWorld({
  questions: {
    house: choice('What is the back of the house like?', {
      pebbledash: 'Cream pebble-dashed wall, a green kitchen door and a high window.',
      brick: 'Red brick terrace with a blue back door.',
      clapboard: 'White weatherboard with a screen door.',
      bungalow: 'A low rendered bungalow with wide sliding patio doors.',
      'doorway-only': 'No wall at all: only the back door and its step are remembered, standing in white.',
    }),
    door: choice('What is happening at the back door?', {
      'open-lit': 'The door stands open and warm kitchen light spills onto the step: dinner is ready.',
      'window-lit': 'The door is shut but the kitchen window glows.',
      silhouette: 'Someone tall is standing in the lit doorway, calling; a shape without a face.',
      shut: 'Shut and dark; nobody is home any more.',
    }),
    boundary: choice('What runs along the edge of the garden?', {
      panel: 'Tall brown larch-lap fence panels.',
      picket: 'A white picket fence.',
      hedge: 'A privet hedge, clipped into lumps.',
      wall: 'An old brick wall with a coping.',
    }),
    lawn: choice('What is the lawn like?', {
      striped: 'Mown in stripes, greener than any real grass.',
      daisies: 'Soft and full of daisies and clover.',
      parched: 'Yellowed by a hot summer, worn bare in patches.',
      long: 'Long and unmown, gone to seed.',
    }),
    memory: score('How much of it is still remembered?', ['Only a patch of lawn and a doorway', 'The main shapes, the edges gone', 'Most of it, soft at the edges', 'Nearly everything, crisp']),
    feature: choice('What else is remembered in the garden?', {
      flowerbed: 'A border of flowers taller than you were.',
      'apple-tree': 'An apple tree whose top is lost in white.',
      shed: 'The corner of a shed.',
      path: 'A line of stepping stones from the back door.',
      nothing: 'Nothing else.',
    }),
    drifting: noul('Are pieces of the garden drifting off the edge, as if being forgotten right now?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const m = a.memory;
    const { art: s, world } = diorama(context, {
      background: PAPER, floor: null, width: 12.5, depth: 9.5, maxHeight: 3.3, radius: 2.1, pitch: 25, yaw: 31,
      slots: [[0.1, 1.0], [-3.5, -1.3, 0, 0.8], [3.8, -0.5, 0, 0.8], [-3.0, 2.9, 0, 0.62], [3.2, 3.2, 0, 0.62], [-1.6, -2.8, 0, 0.55]],
    });
    const root = s.root;
    root.add(new THREE.AmbientLight('#fff6e4', mix(0.35, 0.6, mood.cheer)));
    const paper = new THREE.Color(PAPER);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const faded = (hex: THREE.ColorRepresentation, f: number) => new THREE.Color(hex).lerp(paper, clamp01(f));
    const flat = (hex: THREE.ColorRepresentation, f = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: faded(hex, f), roughness: 0.9, ...extra });
    const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
    };
    // How far from the remembered centre a thing can be before it starts to go.
    const core = mix(3.2, 6.6, m), reach = mix(2.2, 3.4, m);
    const forget = (x: number, z: number) => smooth(core, core + reach, Math.hypot(x * 0.82, z + 0.6));
    interface Inst { p: P3; s: P3; yaw?: number; c: THREE.Color }
    const inst = (geometry: THREE.BufferGeometry, items: Inst[], roughness = 0.9) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness }), items.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      items.forEach((item, i) => { matrix.compose(new THREE.Vector3(...item.p), q.setFromAxisAngle(up, item.yaw ?? 0), new THREE.Vector3(...item.s)); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, item.c); });
      mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
    };
    const unitBox = new THREE.BoxGeometry(1, 1, 1);

    // The island: an irregular piece of lawn torn out of a larger place.
    const lobes = [random() * 6, random() * 6, random() * 6];
    const edge = (t: number) => 1 + 0.07 * Math.sin(t * 2 + lobes[0]) + 0.06 * Math.sin(t * 3 + lobes[1]) + 0.035 * Math.sin(t * 7 + lobes[2]);
    const RX = 6.8, RZ = 5.5;
    const outline: [number, number][] = [];
    for (let i = 0; i < 72; i++) { const t = i / 72 * Math.PI * 2, r = edge(t); outline.push([Math.cos(t) * RX * r, Math.sin(t) * RZ * r]); }
    const lawnHex = { striped: '#6cd23c', daisies: '#86cf5a', parched: '#c9c46a', long: '#5fae48' }[a.lawn];
    const lawnTex = tex(1024, 1024, (g) => {
      const at = (x: number, z: number): [number, number] => [(x / 16 + 0.5) * 1024, (z / 16 + 0.5) * 1024];
      g.fillStyle = lawnHex; g.fillRect(0, 0, 1024, 1024);
      if (a.lawn === 'striped') { g.fillStyle = 'rgba(255,255,210,0.2)'; for (let i = 0; i < 22; i += 2) g.fillRect(i * 46.5 + 8, 0, 46.5, 1024); }
      for (let i = 0; i < 2600; i++) { g.fillStyle = random() > 0.5 ? 'rgba(255,255,200,0.1)' : 'rgba(20,90,30,0.1)'; g.fillRect(random() * 1024, random() * 1024, 3, 7); }
      if (a.lawn === 'parched') for (let i = 0; i < 16; i++) { const [x, y] = at((random() - 0.5) * 11, (random() - 0.5) * 8); g.fillStyle = `rgba(${170 + random() * 30},${140 + random() * 20},90,0.5)`; g.beginPath(); g.ellipse(x, y, 20 + random() * 50, 14 + random() * 34, random() * 3, 0, 7); g.fill(); }
      if (a.lawn === 'daisies') for (let i = 0; i < 520; i++) { g.fillStyle = random() > 0.2 ? '#ffffff' : '#f6dd6a'; g.beginPath(); g.arc(random() * 1024, random() * 1024, 2.4, 0, 7); g.fill(); }
      // Scuffed earth by the back step, where everyone walked.
      { const [x, y] = at(1.2, -3.1); g.fillStyle = 'rgba(150,120,80,0.35)'; g.beginPath(); g.ellipse(x, y, 60, 46, 0, 0, 7); g.fill(); }
      // Blank paper creeping in from the rim.
      g.strokeStyle = PAPER; g.lineJoin = 'round';
      const width = mix(330, 90, m);
      for (let pass = 0; pass < 14; pass++) {
        g.globalAlpha = 0.17; g.lineWidth = width * (1 - pass / 14) + 6;
        g.beginPath(); outline.forEach(([x, z], i) => { const [px, py] = at(x, z); if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.closePath(); g.stroke();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < Math.round(mix(18, 2, m)); i++) { const [x, y] = at((random() - 0.5) * 13, (random() - 0.5) * 10); if (Math.hypot(x - 512, y - 560) < 150) continue; g.fillStyle = PAPER; g.globalAlpha = 0.5 + random() * 0.4; g.beginPath(); g.ellipse(x, y, 12 + random() * 36, 8 + random() * 22, random() * 3, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    });
    lawnTex.repeat.set(1 / 16, 1 / 16); lawnTex.offset.set(0.5, 0.5);
    const blob = (scale: number, depth: number) => { const shape = new THREE.Shape(); outline.forEach(([x, z], i) => { if (i) shape.lineTo(x * scale, -z * scale); else shape.moveTo(x * scale, -z * scale); }); const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 }); geo.rotateX(-Math.PI / 2); return geo; };
    const island = new THREE.Mesh(blob(1, 0.3).translate(0, -0.3, 0), [new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 }), flat('#a98a60', 0.25)]);
    island.receiveShadow = true; root.add(island);
    world.ground = island;
    [[0.93, 0.25, -0.3, 0.3], [0.8, 0.25, -0.55, 0.45]].forEach(([scale, depth, y, f]) => { const clod = new THREE.Mesh(blob(scale, depth).translate((random() - 0.5) * 0.6, y - depth, (random() - 0.5) * 0.5), flat('#9c7c54', f)); root.add(clod); });

    // Lawn dressing that stands up.
    if (a.lawn === 'long' || a.lawn === 'daisies') {
      const blades: Inst[] = [];
      const count = a.lawn === 'long' ? Math.round(mix(260, 520, mood.density)) : 110;
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.88, x = Math.cos(t) * RX * r, z = Math.sin(t) * RZ * r, f = forget(x, z);
        if (z < -3.9 || f > 0.9) continue;
        if (a.lawn === 'long') blades.push({ p: [x, 0, z], s: [1, 0.6 + random() * 1.4, 1], c: faded(pick(['#5fa64a', '#78b852', '#a9b860', '#4f9a44']), f) });
        else blades.push({ p: [x, 0.05, z], s: [1.8, 0.35, 1.8], c: faded(random() > 0.25 ? '#ffffff' : '#f6dd6a', f * 0.6) });
      }
      const blade = new THREE.ConeGeometry(0.035, 0.42, 4); blade.translate(0, 0.21, 0);
      inst(blade, blades, 1);
    }

    // The back of the house, torn like a photograph: tallest over the door, gone at the sides.
    const z0 = -4.25, doorX = 1.2, lit = a.door !== 'shut', open = a.door === 'open-lit' || a.door === 'silhouette';
    const low = a.house === 'bungalow';
    const wallW = mix(6.4, 10.4, m), wallH = low ? 4.0 : 5.5, wallX = 0.2;
    const glow = mix(0.75, 1.25, mood.cheer);
    const trimF = mix(0.25, 0, m);
    const white = flat('#f6f3ea', trimF), darkTrim = flat('#3d4046', trimF);
    if (a.house !== 'doorway-only') {
      const shape = new THREE.Shape();
      shape.moveTo(-wallW / 2, 0); shape.lineTo(wallW / 2, 0);
      const n = 34;
      for (let i = 0; i <= n; i++) {
        const u = 1 - i / n * 2, x = u * wallW / 2, lean = Math.abs((x + wallX - doorX) / (wallW / 2 + 1.2));
        const h = wallH * mix(1, mix(0.22, 0.55, m), smooth(0.15, 1, lean)) * (0.9 + random() * 0.1) - (i % 2) * random() * 0.35;
        shape.lineTo(x + (random() - 0.5) * 0.16, Math.max(0.8, h));
      }
      const wallTex = tex(1024, 640, (g) => {
        const sx = 1024 / 11, sy = 640 / wallH;
        if (a.house === 'brick') {
          g.fillStyle = '#d6c9b2'; g.fillRect(0, 0, 1024, 640);
          for (let row = 0; row < 640 / 15; row++) for (let col = -1; col < 1024 / 40 + 1; col++) { g.fillStyle = pick(['#b5553c', '#a94c36', '#c06246', '#9d4633']); g.fillRect(col * 40 + (row % 2) * 20, row * 15, 37, 12); }
        } else if (a.house === 'clapboard') {
          g.fillStyle = '#e4e6e2'; g.fillRect(0, 0, 1024, 640);
          for (let y = 0; y < 640; y += 24) { g.fillStyle = 'rgba(90,100,110,0.55)'; g.fillRect(0, y, 1024, 3); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, y + 3, 1024, 3); }
        } else {
          g.fillStyle = a.house === 'bungalow' ? '#e2c97f' : '#cdb98a'; g.fillRect(0, 0, 1024, 640);
          for (let i = 0; i < (a.house === 'bungalow' ? 2500 : 9000); i++) { g.fillStyle = pick(['rgba(120,100,70,0.35)', 'rgba(255,255,245,0.5)', 'rgba(90,90,90,0.25)']); g.fillRect(random() * 1024, random() * 640, 3, 3); }
          g.fillStyle = '#a5553f'; g.fillRect(0, 640 - 0.45 * sy, 1024, 0.45 * sy);
          g.fillStyle = 'rgba(230,215,190,0.8)'; for (let x = 0; x < 1024; x += 42) g.fillRect(x, 640 - 0.45 * sy, 3, 0.45 * sy); g.fillRect(0, 640 - 0.24 * sy, 1024, 3);
        }
        // Memory bleaches the top and the far ends.
        const door = (doorX - wallX + 5.5) * sx;
        const top = g.createLinearGradient(0, 0, 0, 640 * mix(0.6, 0.3, m)); top.addColorStop(0, PAPER); top.addColorStop(0.3, 'rgba(243,240,230,0.7)'); top.addColorStop(1, 'rgba(243,240,230,0)'); g.fillStyle = top; g.fillRect(0, 0, 1024, 640);
        for (const dir of [-1, 1]) { const from = door + dir * mix(1.6, 3.4, m) * sx, to = door + dir * mix(3.6, 5.6, m) * sx; const side = g.createLinearGradient(from, 0, to, 0); side.addColorStop(0, 'rgba(243,240,230,0)'); side.addColorStop(1, PAPER); g.fillStyle = side; if (dir < 0) g.fillRect(0, 0, from, 640); else g.fillRect(from, 0, 1024 - from, 640); }
      });
      wallTex.repeat.set(1 / 11, 1 / wallH); wallTex.offset.set(0.5, 0);
      const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), [new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), flat(PAPER)]);
      wall.position.set(wallX, 0, z0 - 0.3); wall.castShadow = wall.receiveShadow = true; root.add(wall);
    }

    // Door, step and what waits there. Everything is a little too tall: the handle is above your head.
    const doorW = low ? 3.4 : 1.3, doorH = low ? 2.75 : 3.0;
    const doorHex = { pebbledash: '#3f7a55', brick: '#2f4f8a', clapboard: '#9aa79a', bungalow: '#e9e6dc', 'doorway-only': '#b8382e' }[a.house];
    const warm = new THREE.MeshStandardMaterial({ color: '#ffe3a0', emissive: '#ffcf70', emissiveIntensity: glow, roughness: 1 });
    const cold = flat('#7d8f9c', 0, { roughness: 0.25, metalness: 0.2 });
    s.box([doorW + 0.9, 0.24, 0.85], [doorX, 0.12, z0 + 0.42], flat('#bdb8aa', trimF));
    s.box([doorW + 0.5, 0.03, 0.5], [doorX, 0.255, z0 + 0.4], flat(pick(['#8a5a34', '#5a6a4a', '#7a3f3a']), trimF));
    for (const sx of [-1, 1]) s.box([0.16, doorH + 0.16, 0.2], [doorX + sx * (doorW / 2 + 0.08), 0.24 + doorH / 2 + 0.08, z0 + 0.06], white);
    s.box([doorW + 0.32, 0.18, 0.2], [doorX, 0.24 + doorH + 0.09, z0 + 0.06], white);
    s.mesh(new THREE.PlaneGeometry(doorW, doorH), lit && (open || low) ? warm : flat('#2b2a2c'), [doorX, 0.24 + doorH / 2, z0 + 0.02]);
    if (low) {
      for (const sx of [-1, 1]) {
        const slid = open && sx === 1 ? -0.55 : 0;
        const pane = s.box([doorW / 2, doorH, 0.05], [doorX + sx * doorW / 4 + slid * doorW / 2, 0.24 + doorH / 2, z0 + 0.06 + (sx > 0 ? 0.05 : 0)], lit ? new THREE.MeshStandardMaterial({ color: '#ffe9b8', emissive: '#ffd98a', emissiveIntensity: glow * 0.7, roughness: 0.3 }) : cold);
        pane.castShadow = false;
        for (const edgeX of [-1, 1]) s.box([0.07, doorH, 0.07], [pane.position.x + edgeX * (doorW / 4 - 0.035), 0.24 + doorH / 2, pane.position.z], white);
      }
      for (const sx of [-1, 1]) s.box([0.5, doorH - 0.1, 0.06], [doorX + sx * (doorW / 2 - 0.3), 0.24 + doorH / 2, z0 + 0.035], flat(pick(['#c9705a', '#6f8fae', '#d9b85a']), trimF));
    } else {
      const leaf = new THREE.Group();
      leaf.position.set(doorX - doorW / 2, 0.24, z0 + 0.1);
      const body = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), flat(doorHex, trimF, { roughness: 0.5 })); body.position.set(doorW / 2, doorH / 2, 0); body.castShadow = true; leaf.add(body);
      if (a.house === 'clapboard') { const mesh = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.3, doorH - 0.9, 0.09), flat('#4a5258', trimF)); mesh.position.set(doorW / 2, doorH / 2 + 0.25, 0); leaf.add(mesh); }
      else { const pane = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.45, 0.9, 0.09), lit ? warm : cold); pane.position.set(doorW / 2, doorH - 0.8, 0); leaf.add(pane); }
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), flat('#d9b23a', 0, { metalness: 0.8, roughness: 0.3 })); handle.position.set(doorW - 0.16, 1.75, 0.08); leaf.add(handle);
      if (open) leaf.rotation.y = -mix(1.2, 1.9, random());
      root.add(leaf);
    }
    if (lit && open) {
      const spill = new THREE.Shape(); spill.moveTo(-doorW / 2, 0); spill.lineTo(doorW / 2, 0); spill.lineTo(doorW / 2 + 0.9, -3.0); spill.lineTo(-doorW / 2 - 0.3, -3.2);
      const pool = s.mesh(new THREE.ShapeGeometry(spill), new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffd77a', emissiveIntensity: glow * 0.45, roughness: 1 }), [doorX, 0.012, z0 + 0.86]);
      pool.rotation.x = -Math.PI / 2; pool.scale.y = -1; pool.castShadow = false; (pool.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.mesh(new THREE.PlaneGeometry(doorW + 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffd77a', emissiveIntensity: glow * 0.5, roughness: 1 }), [doorX, 0.275, z0 + 0.6]).rotation.x = -Math.PI / 2;
    }
    if (a.door === 'silhouette') {
      // A parent-shaped absence: tall, backlit, no face.
      const figure = new THREE.Shape();
      const pts: [number, number][] = [[-0.3, 0], [-0.42, 1.25], [-0.36, 1.3], [-0.52, 1.75], [-0.4, 2.12], [-0.14, 2.22], [-0.12, 2.3], [-0.2, 2.42], [-0.19, 2.62], [-0.08, 2.76], [0.08, 2.76], [0.19, 2.62], [0.2, 2.42], [0.12, 2.3], [0.14, 2.22], [0.4, 2.12], [0.62, 1.9], [0.86, 2.3], [0.95, 2.26], [0.7, 1.66], [0.44, 1.5], [0.38, 1.28], [0.44, 1.24], [0.34, 0]];
      pts.forEach(([x, y], i) => { if (i) figure.lineTo(x, y); else figure.moveTo(x, y); });
      const person = s.mesh(new THREE.ShapeGeometry(figure), new THREE.MeshStandardMaterial({ color: faded('#5d5148', mix(0.35, 0.05, mood.cheer)), roughness: 1, side: THREE.DoubleSide }), [doorX + (low ? 0.75 : 0.02), 0.25, z0 + 0.2]);
      person.scale.setScalar(low ? 0.95 : 1.02);
    }

    // The kitchen window, too high to see into.
    if (a.house !== 'doorway-only' && !low && m > 0.12) {
      const wx = doorX - 3.05, wy = 2.9, ww = 2.0, wh = 1.55;
      s.box([ww + 0.2, wh + 0.2, 0.12], [wx, wy, z0 + 0.03], white);
      const pane = s.mesh(new THREE.PlaneGeometry(ww, wh), lit ? warm : cold, [wx, wy, z0 + 0.1]); pane.castShadow = false;
      s.box([0.07, wh, 0.05], [wx, wy, z0 + 0.11], white); s.box([ww, 0.07, 0.05], [wx, wy + 0.2, z0 + 0.11], white);
      s.box([ww + 0.4, 0.1, 0.3], [wx, wy - wh / 2 - 0.1, z0 + 0.12], white);
      const curtain = flat(pick(['#c9705a', '#6f8fae', '#d9b85a', '#7fa67a']), trimF);
      for (const sx of [-1, 1]) s.box([0.36, wh - 0.06, 0.03], [wx + sx * (ww / 2 - 0.2), wy, z0 + 0.105], curtain);
      if (m > 0.45) { const pot = s.cylinder(0.14, 0.1, 0.2, [wx + 0.5, wy - wh / 2 + 0.06, z0 + 0.2], flat('#b5633f'), 10); void pot; s.ball([0.2, 0.18, 0.16], [wx + 0.5, wy - wh / 2 + 0.3, z0 + 0.2], flat('#4f9a44'), 8); }
      if (m > 0.55) { const px = wx - 1.55; s.rod([px, 0, z0 + 0.1], [px, mix(2.4, 3.9, m), z0 + 0.1], 0.07, darkTrim); s.box([0.3, 0.1, 0.25], [px, 0.05, z0 + 0.14], flat('#8f8c84')); }
      if (m > 0.7) { s.rod([doorX + 1.6, 0.9, z0], [doorX + 1.6, 0.9, z0 + 0.22], 0.03, flat('#c9a23a', 0, { metalness: 0.7, roughness: 0.3 })); s.box([0.06, 0.12, 0.06], [doorX + 1.6, 0.86, z0 + 0.22], flat('#c9a23a', 0, { metalness: 0.7, roughness: 0.3 })); }
    }
    if (m > 0.4 && a.house !== 'doorway-only') for (let i = 0; i < 2; i++) { const bx = doorX + doorW / 2 + 0.3 + i * 0.16; s.cylinder(0.05, 0.06, 0.26, [bx, 0.37, z0 + 0.62 + i * 0.08], flat('#f7f7f2', 0, { roughness: 0.2 }), 10); s.cylinder(0.03, 0.03, 0.08, [bx, 0.54, z0 + 0.62 + i * 0.08], flat('#f7f7f2', 0, { roughness: 0.2 }), 8); }

    // The boundary: clear near the house, losing colour, then pieces, then nothing.
    const runs: [P3, P3][] = [[[-5.7, 0, -4.35], [-5.7, 0, 4.4]], [[-5.7, 0, -4.35], [wallX - wallW / 2 + 0.5, 0, -4.35]], [[wallX + wallW / 2 - 0.5, 0, -4.35], [6.0, 0, -4.35]]];
    const posts: Inst[] = [], boards: Inst[] = [], lumps: Inst[] = [];
    const fenceH = 2.45;
    const tone = { panel: '#b07a45', picket: '#f7f5ee', hedge: '#3f8a48', wall: '#b05a40' }[a.boundary];
    for (const [from, to] of runs) {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), length = A.distanceTo(B);
      if (length < 0.6) continue;
      const yaw = -Math.atan2(B.z - A.z, B.x - A.x);
      const step = a.boundary === 'picket' ? 0.34 : a.boundary === 'hedge' ? 0.95 : 1.9;
      const count = Math.max(1, Math.round(length / step));
      for (let i = 0; i <= count; i++) {
        const p = A.clone().lerp(B, i / count), q = A.clone().lerp(B, (i + 0.5) / count);
        const f = forget(p.x, p.z), fq = forget(q.x, q.z);
        const gone = f > 0.97 || random() < f * 0.55, goneQ = fq > 0.9 || random() < fq * 0.8;
        const sink = 1 - f * 0.25;
        if (a.boundary === 'picket') {
          if (!gone) boards.push({ p: [p.x, fenceH * 0.36 * sink, p.z], s: [0.2, fenceH * 0.72 * sink, 0.05], yaw, c: faded(tone, f) });
          if (i < count && !goneQ) for (const y of [0.45, 1.3]) boards.push({ p: [q.x, y, q.z], s: [length / count + 0.02, 0.1, 0.04], yaw, c: faded(tone, fq) });
        } else if (a.boundary === 'hedge') {
          if (!gone) { lumps.push({ p: [p.x + (random() - 0.5) * 0.2, 0.75, p.z + (random() - 0.5) * 0.2], s: [0.85, 0.95, 0.85], c: faded(pick(['#3f8a48', '#4a9a50', '#357a40']), f) }); if (random() > f) lumps.push({ p: [p.x + (random() - 0.5) * 0.25, 1.75 + random() * 0.25, p.z + (random() - 0.5) * 0.25], s: [0.75, 0.8, 0.75], c: faded(pick(['#4a9a50', '#58a858', '#3f8a48']), f + 0.08) }); }
        } else {
          if (!gone) posts.push({ p: [p.x, (fenceH + 0.15) / 2, p.z], s: a.boundary === 'wall' ? [0.42, fenceH + 0.15, 0.42] : [0.14, fenceH + 0.15, 0.14], yaw, c: faded(a.boundary === 'wall' ? '#a55239' : '#8a5c33', f) });
          if (i < count && !goneQ) {
            const span = length / count;
            if (a.boundary === 'wall') { boards.push({ p: [q.x, fenceH * 0.46, q.z], s: [span, fenceH * 0.92, 0.26], yaw, c: faded(tone, fq) }); boards.push({ p: [q.x, fenceH * 0.94, q.z], s: [span, 0.1, 0.36], yaw, c: faded('#cfc6b4', fq) }); for (const y of [0.5, 1.0, 1.5, 2.0]) boards.push({ p: [q.x, y, q.z], s: [span, 0.025, 0.27], yaw, c: faded('#d9c9b0', fq) }); }
            else { const slats = 9; for (let k = 0; k < slats; k++) { if (random() < fq * 0.5) continue; boards.push({ p: [q.x, 0.2 + (k + 0.5) * (fenceH - 0.3) / slats, q.z], s: [span - 0.1, (fenceH - 0.3) / slats + 0.03, 0.035 + (k % 2) * 0.02], yaw, c: faded(k % 2 ? '#b98350' : tone, fq) }); } }
          }
        }
      }
    }
    inst(unitBox, posts); inst(unitBox, boards); inst(new THREE.IcosahedronGeometry(1, 1), lumps, 1);

    // One more thing the garden kept.
    if (a.feature === 'flowerbed') {
      s.box([0.9, 0.1, 6.0], [-5.0, 0.04, 0.1], flat('#6a4f36', 0.25));
      const stems: Inst[] = [], heads: Inst[] = [], hearts: Inst[] = [];
      const n = Math.round(mix(7, 15, mood.density));
      for (let i = 0; i < n; i++) {
        const z = mix(-2.8, 3.2, (i + random() * 0.6) / n), x = -5.0 + (random() - 0.5) * 0.45, h = 1.0 + random() * 1.5, f = forget(x, z) * 0.8;
        stems.push({ p: [x, h / 2, z], s: [0.045, h, 0.045], c: faded('#4f9a44', f) });
        const hue = pick(['#e2412f', '#f4c62c', '#e56d9c', '#8f5fd0', '#ffffff', '#f08a2a']);
        heads.push({ p: [x, h, z], s: [0.3 + random() * 0.14, 0.12, 0.3 + random() * 0.14], c: faded(hue, f) });
        hearts.push({ p: [x, h + 0.07, z], s: [0.11, 0.1, 0.11], c: faded(hue === '#f4c62c' ? '#7a4a24' : '#f4c62c', f) });
      }
      inst(unitBox, stems); inst(new THREE.SphereGeometry(1, 10, 6), heads); inst(new THREE.SphereGeometry(1, 8, 6), hearts);
    } else if (a.feature === 'apple-tree') {
      const tx = 5.0, tz = -2.9, f0 = forget(tx, tz) * 0.5;
      s.rod([tx, 0, tz], [tx - 0.15, 2.6, tz + 0.1], 0.3, flat('#7a5a3a', f0), 0.2);
      s.rod([tx - 0.15, 2.5, tz + 0.1], [tx - 1.1, 3.9, tz + 0.5], 0.14, flat('#7a5a3a', f0 + 0.15), 0.08);
      s.rod([tx - 0.15, 2.5, tz + 0.1], [tx + 0.7, 4.0, tz - 0.2], 0.14, flat('#7a5a3a', f0 + 0.15), 0.08);
      const crown: Inst[] = [], apples: Inst[] = [];
      for (let i = 0; i < 11; i++) { const ang = random() * Math.PI * 2, rad = random() * 1.5, y = 3.3 + random() * 2.4, f = f0 + smooth(3.6, mix(4.6, 6.2, m), y); crown.push({ p: [tx - 0.2 + Math.cos(ang) * rad, y, tz + 0.15 + Math.sin(ang) * rad * 0.9], s: [1.0 + random() * 0.4, 0.85 + random() * 0.3, 1.0 + random() * 0.4], c: faded(pick(['#4f9a48', '#62ad52', '#3f8a44']), f) }); }
      for (let i = 0; i < Math.round(mix(4, 12, mood.cheer)); i++) { const ang = random() * Math.PI * 2, rad = 0.9 + random() * 0.8; apples.push({ p: [tx - 0.2 + Math.cos(ang) * rad, 2.9 + random() * 1.2, tz + 0.15 + Math.sin(ang) * rad], s: [0.13, 0.13, 0.13], c: new THREE.Color(pick(['#d8352f', '#e8a02a', '#c9d04a'])) }); }
      for (let i = 0; i < 3; i++) apples.push({ p: [tx - 1.5 + random() * 2.4, 0.12, tz + 0.9 + random() * 1.1], s: [0.13, 0.13, 0.13], c: new THREE.Color('#c4452f') });
      inst(new THREE.IcosahedronGeometry(1, 1), crown, 1); inst(new THREE.SphereGeometry(1, 10, 8), apples, 0.5);
    } else if (a.feature === 'shed') {
      const sx = 5.0, sz = -3.2, f = forget(sx, sz) * 0.5 + 0.1;
      s.box([2.3, 2.7, 1.9], [sx, 1.35, sz], flat('#8f6a45', f));
      for (let i = 0; i < 9; i++) s.box([0.03, 2.7, 0.02], [sx - 1.05 + i * 0.26, 1.35, sz + 0.96], flat('#6f5034', f));
      s.box([0.9, 2.2, 0.06], [sx - 0.45, 1.1, sz + 0.97], flat('#7a5838', f)); s.ball([0.05, 0.05, 0.05], [sx - 0.12, 1.5, sz + 1.02], darkTrim, 8);
      s.box([0.7, 0.6, 0.05], [sx + 0.6, 1.8, sz + 0.97], cold);
      const roof = s.box([2.7, 0.12, 2.3], [sx, 2.85, sz], flat('#4f5358', f + 0.2)); roof.rotation.x = 0.16;
    } else if (a.feature === 'path') {
      const stones: Inst[] = [];
      for (let i = 0; i < 8; i++) { const t = i / 7, x = doorX + Math.sin(t * 2.2) * 1.3 + (random() - 0.5) * 0.15, z = mix(z0 + 1.5, 4.3, t), f = forget(x, z); if (f > 0.9) continue; stones.push({ p: [x, 0.02, z], s: [0.42 + random() * 0.1, 0.05, 0.34 + random() * 0.08], yaw: random() * 3, c: faded(pick(['#c1bcae', '#b3ae9f', '#cbc5b5']), f) }); }
      inst(new THREE.CylinderGeometry(1, 1, 1, 9), stones, 1);
    }

    // Pieces coming loose at the rim.
    const loose: { node: THREE.Object3D; y: number; phase: number; spin: number }[] = [];
    if (a.drifting) {
      const count = Math.round(mix(7, 16, 1 - m));
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2;
        if (Math.sin(t) < -0.55 && Math.abs(Math.cos(t)) < 0.75) continue;
        const r = edge(t) * (1.02 + random() * 0.13), x = Math.cos(t) * RX * r, z = Math.sin(t) * RZ * r, y = -0.2 + random() * 2.0, f = 0.25 + random() * 0.55;
        const kind = random();
        const node = kind < 0.45 ? new THREE.Mesh(new THREE.BoxGeometry(0.5 + random() * 0.6, 0.16, 0.4 + random() * 0.5), [flat('#a5855c', f), flat('#a5855c', f), flat(lawnHex, f), flat('#a5855c', f), flat('#a5855c', f), flat('#a5855c', f)])
          : kind < 0.8 ? new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2 + random() * 0.8, 0.05), flat(tone, f))
          : new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), flat(PAPER, 0, { side: THREE.DoubleSide }));
        node.position.set(x, y, z); node.rotation.set((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9); (node as THREE.Mesh).castShadow = true;
        root.add(node); loose.push({ node, y, phase: random() * 6, spin: (random() - 0.5) * 0.3 });
      }
    }
    const pace = mix(0.25, 1.2, mood.energy);
    world.update = (dt, time) => {
      for (const piece of loose) { piece.node.position.y = piece.y + Math.sin(time * 0.6 * pace + piece.phase) * 0.12; piece.node.rotation.y += dt * piece.spin * pace; }
      warm.emissiveIntensity = glow * (1 + Math.sin(time * 1.3 * pace) * 0.04);
    };
    return world;
  },
});
