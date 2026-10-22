import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const SCHEMES = {
  harvest: ['#d9601a', '#6b3f22'],
  atomic: ['#2fb5b0', '#efe6cf'],
  mustard: ['#d9a81e'],
  rainbow: ['#d8263c', '#f2c12e', '#1f8fe8', '#2fa86a', '#e8731c', '#7a35c2'],
  cosmic: ['#1b1b22', '#ff2e88'],
  avocado: ['#7d8a3a', '#cdbd8c'],
} as const;

/** One bucket shell: a side profile swept across the width, cupped at the edges, rounded at the corners. */
function shellGeometry() {
  const profile = new THREE.CatmullRomCurve3([
    [0.235, 0.385], [0.225, 0.425], [0.12, 0.42], [-0.04, 0.405], [-0.15, 0.42], [-0.21, 0.48], [-0.24, 0.6], [-0.255, 0.74], [-0.27, 0.86], [-0.285, 0.875],
  ].map(([z, y]) => new THREE.Vector3(0, y, z)));
  const U = 20, V = 10, positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, p = profile.getPoint(u), t = profile.getTangent(u);
    const end = Math.min(u, 1 - u);
    const half = mix(0.235, 0.2, THREE.MathUtils.smoothstep(u, 0.45, 1)) * (0.72 + 0.28 * Math.sqrt(Math.min(1, end / 0.12)));
    for (let j = 0; j <= V; j++) {
      const v = j / V * 2 - 1, cup = 0.055 * v * v * v * v + 0.02 * v * v;
      positions.push(v * half, p.y - t.z * cup, p.z + t.y * cup);
      uvs.push(j / V, u);
    }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; index.push(a, a + 1, b, a + 1, b + 1, b); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    seats: choice('How many seats are in the bank?', {
      three: 'Three, a short bench for one lane.',
      four: 'Four.',
      five: 'Five, the usual league team.',
      six: 'Six.',
      eight: 'Eight, a long sweep for a big party.',
    }),
    scheme: choice('What colours are the seats?', {
      harvest: 'Alternating burnt orange and chocolate brown, pure 1970s.',
      atomic: 'Turquoise and cream, 1960s atomic.',
      mustard: 'Every seat the same mustard yellow.',
      rainbow: 'Each seat a different primary colour, like a playroom.',
      cosmic: 'Black with hot pink, 1990s cosmic bowling.',
      avocado: 'Avocado green and faded oatmeal.',
    }),
    layout: choice('What shape is the bank?', {
      horseshoe: 'A tight horseshoe wrapped around the table.',
      arc: 'A gentle curve.',
      straight: 'A dead straight row, like a bus station.',
    }),
    table: choice('What kind of table is it?', {
      round: 'A small round laminate table on a chrome pedestal.',
      scorer: 'A scorer\'s desk with a sloping lit top where the sheet is kept.',
      boomerang: 'A kidney-shaped table with a boomerang-pattern top.',
    }),
    left: choice('What has been left on the table?', {
      pitcher: 'A half-drunk pitcher of beer and a scatter of plastic cups.',
      cake: 'A birthday cake with candles, paper plates and party hats.',
      jacket: 'A folded jacket and nothing else.',
      sheets: 'Score sheets, stubby pencils and a towel: a game in progress.',
      wreckage: 'Nacho trays, empty bottles and a full ashtray, the end of a long night.',
      nothing: 'Nothing: wiped clean.',
    }),
    seatStory: choice('What is on or around the seats?', {
      nothing: 'Nothing, they are empty.',
      ball: 'A bowling ball parked on one seat.',
      shoes: 'A pair of street shoes tucked underneath.',
      coat: 'A coat draped over a seat back.',
      balloon: 'A helium balloon tied to one seat.',
      bag: 'A bowling bag on the floor beside the end seat.',
    }),
    carpet: choice('What is the floor under it?', {
      cosmic: 'Black carpet with neon squiggles, stars and planets.',
      geometric: 'Brown and orange interlocking squares.',
      red: 'Plain worn red carpet.',
      lino: 'Speckled grey linoleum tiles.',
      none: 'No floor of its own.',
    }),
    broken: noul('Is one seat missing, leaving only its bolted pedestal?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { three: 3, four: 4, five: 5, six: 6, eight: 8 }[a.seats];
    const colours = SCHEMES[a.scheme];
    const chrome = s.material('#d5dadc', { metalness: 0.9, roughness: 0.22 });
    const steel = s.material('#6d7378', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#1c1c1f', { roughness: 0.75 });

    // ---- where the seats go
    const pitch = 0.6;
    const R = a.layout === 'horseshoe' ? Math.max(a.table === 'round' ? 1.05 : 1.25, n * pitch / 3.5) : a.layout === 'arc' ? Math.max(2.6, n * pitch / 1.6) : 60;
    const spots = Array.from({ length: n }, (_u, i) => {
      const theta = (i - (n - 1) / 2) * pitch / R;
      return { theta, x: R * Math.sin(theta), z: -R * Math.cos(theta) + R };
    });
    const gone = a.broken ? 1 + Math.floor(random() * (n - 2)) : -1;
    const shell = shellGeometry();
    const seatMaterials = colours.map((colour) => s.material(colour, { roughness: 0.32, side: THREE.DoubleSide }));
    const seatGroups: THREE.Group[] = [];
    spots.forEach((spot, i) => {
      const g = new THREE.Group();
      g.position.set(spot.x, 0, spot.z); g.rotation.y = -spot.theta;
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.4, 12), chrome)).position.set(0, 0.2, -0.03);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.018, 16), steel)).position.set(0, 0.009, -0.03);
      for (let k = 0; k < 4; k++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 6), chrome)).position.set(Math.cos(k * 1.571 + 0.78) * 0.085, 0.024, -0.03 + Math.sin(k * 1.571 + 0.78) * 0.085);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.2), steel)).position.set(0, 0.398, -0.03);
      if (i !== gone) add(new THREE.Mesh(shell, seatMaterials[i % colours.length]));
      else for (let k = 0; k < 4; k++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), chrome)).position.set((k % 2 ? 1 : -1) * 0.07, 0.415, -0.03 + (k < 2 ? 1 : -1) * 0.07);
      s.root.add(g);
      seatGroups.push(g);
    });
    // the beam that ties the pedestals together
    if (n > 1) s.tube(spots.map((spot) => [spot.x + Math.sin(spot.theta) * 0.03, 0.26, spot.z - Math.cos(spot.theta) * 0.03] as const), 0.022, steel);

    // ---- the table
    const back = spots.reduce((min, spot) => Math.min(min, spot.z), 9);
    const tz = a.layout === 'horseshoe' ? back + Math.min(R, 1.0) : back + 1.12;
    const top = 0.72;
    const topColour = { harvest: '#8a5a34', atomic: '#f0ebdc', mustard: '#e9e2cf', rainbow: '#f4f4f0', cosmic: '#24242c', avocado: '#d8cfae' }[a.scheme];
    const topMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = topColour; c.fillRect(0, 0, w, h);
      if (a.table === 'boomerang') for (let i = 0; i < 26; i++) { c.save(); c.translate(random() * w, random() * h); c.rotate(random() * 6.3); c.strokeStyle = ['#2fb5b0', '#e8731c', '#c9a03a', '#6b6b6b'][i % 4]; c.lineWidth = 4; c.beginPath(); c.moveTo(-14, 8); c.quadraticCurveTo(0, -16, 14, 8); c.stroke(); c.restore(); }
      else if (a.scheme === 'harvest') for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(40,20,8,${0.15 + random() * 0.2})`; c.lineWidth = 1 + random() * 2; const y = random() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 12, w * 0.7, y + (random() - 0.5) * 12, w, y); c.stroke(); }
      else for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},0.12)`; c.fillRect(random() * w, random() * h, 2, 2); }
      for (let i = 0; i < 9 * mood.wear; i++) { c.strokeStyle = 'rgba(60,40,20,0.35)'; c.lineWidth = 2; c.beginPath(); c.arc(random() * w, random() * h, 16 + random() * 8, 0, 7); c.stroke(); }
    });
    const topMaterial = new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.4 });
    let reach = 0.3;
    if (a.table === 'round') {
      s.cylinder(0.43, 0.43, 0.035, [0, top - 0.0175, tz], topMaterial, 36);
      s.ring(0.43, 0.018, [0, top - 0.0175, tz], chrome).rotation.x = Math.PI / 2;
      s.cylinder(0.04, 0.05, top - 0.04, [0, top / 2 - 0.02, tz], chrome, 14);
      s.lathe([[0, 0], [0.26, 0], [0.25, 0.02], [0.08, 0.06], [0.05, 0.1], [0, 0.1]], steel, [0, 0, tz]);
    } else if (a.table === 'boomerang') {
      const shape = new THREE.Shape();
      const pts: [number, number][] = [[-0.55, -0.12], [-0.35, -0.3], [0, -0.22], [0.35, -0.3], [0.55, -0.12], [0.5, 0.14], [0.25, 0.26], [0, 0.18], [-0.25, 0.26], [-0.5, 0.14]];
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true);
      curve.getPoints(48).forEach((p, i) => (i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y)));
      const slab = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), topMaterial, [0, top - 0.008, tz]);
      slab.rotation.x = -Math.PI / 2;
      topMap.wrapS = topMap.wrapT = THREE.RepeatWrapping; topMap.repeat.set(1.2, 1.2);
      for (const x of [-0.3, 0.3]) { s.rod([x * 1.25, 0, tz + 0.02], [x, top - 0.04, tz], 0.018, chrome); s.cylinder(0.03, 0.035, 0.012, [x * 1.25, 0.006, tz + 0.02], dark, 10); }
      s.rod([0, 0, tz - 0.22], [0, top - 0.04, tz - 0.08], 0.018, chrome);
    } else {
      // scorer's desk: a pedestal box with a sloping, back-lit sheet
      s.box([0.9, top - 0.06, 0.5], [0, (top - 0.06) / 2, tz], s.material(topColour === '#f4f4f0' ? '#d8263c' : colours[0], { roughness: 0.4 }));
      s.box([0.94, 0.05, 0.54], [0, 0.025, tz], dark);
      s.box([0.96, 0.03, 0.56], [0, top - 0.045, tz], chrome);
      const sheetMap = paint(256, 128, (c, w, h) => {
        c.fillStyle = '#fffbe6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a5a8a'; c.lineWidth = 1.5;
        for (let r = 0; r < 5; r++) for (let k = 0; k < 11; k++) c.strokeRect(6 + k * 22.2, 8 + r * 23, 22.2, 23);
        c.fillStyle = '#26303a'; c.font = 'bold 12px monospace'; c.textAlign = 'center';
        for (let r = 0; r < 4; r++) for (let k = 1; k < 4 + random() * 7; k++) c.fillText(random() < 0.2 ? 'X' : random() < 0.3 ? '/' : String(Math.floor(random() * 9)), 6 + k * 22.2 + 11, 24 + r * 23);
      });
      const sheet = s.mesh(new THREE.BoxGeometry(0.8, 0.02, 0.4), [dark, dark, new THREE.MeshStandardMaterial({ map: sheetMap, emissive: '#fff2c0', emissiveMap: sheetMap, emissiveIntensity: mix(0.3, 0.8, mood.cheer), roughness: 0.4 }), dark, dark, dark] as unknown as THREE.Material, [0, top + 0.03, tz - 0.02]);
      sheet.rotation.x = 0.22;
      s.box([0.9, 0.04, 0.12], [0, top - 0.01, tz + 0.2], topMaterial);
      reach = 0.0;
    }
    // surface the clutter sits on
    const flat = a.table === 'scorer';
    const on = (dx: number, dz: number): [number, number, number] => flat ? [dx * 2.6, top + 0.012, tz + 0.2 + dz * 0.1] : [dx, top, tz + dz];
    const spotOn = (): [number, number, number] => { const t = random() * 6.283, r = Math.sqrt(random()) * (flat ? 0.15 : reach); return on(Math.cos(t) * r, Math.sin(t) * r * (a.table === 'boomerang' ? 0.5 : 1)); };

    // ---- what was left
    const clear = (colour: string, opacity: number) => new THREE.MeshPhysicalMaterial({ color: colour, transparent: true, opacity, roughness: 0.08, depthWrite: false });
    const cup = (at: [number, number, number], colour: string, tipped = false) => {
      const m = s.cylinder(0.04, 0.028, 0.11, [at[0], at[1] + (tipped ? 0.04 : 0.055), at[2]], s.material(colour, { roughness: 0.35 }), 12);
      if (tipped) { m.rotation.z = Math.PI / 2; m.rotation.y = random() * 6; }
      return m;
    };
    const clutter = 0.4 + mood.density * 0.9;
    if (a.left === 'pitcher') {
      const p = on(-0.05, -0.02);
      const level = mix(0.06, 0.14, random());
      s.cylinder(0.072, 0.062, 0.21, [p[0], p[1] + 0.105, p[2]], clear('#e8f4f6', 0.3), 16);
      s.cylinder(0.066, 0.06, level, [p[0], p[1] + level / 2 + 0.005, p[2]], s.material('#d9981e', { roughness: 0.2, emissive: '#a05a08', emissiveIntensity: 0.35 }), 16);
      s.cylinder(0.066, 0.066, 0.012, [p[0], p[1] + level + 0.01, p[2]], s.material('#f6efd8'), 16);
      const handle = s.ring(0.045, 0.01, [p[0] + 0.085, p[1] + 0.12, p[2]], clear('#e8f4f6', 0.45), Math.PI); handle.rotation.z = -Math.PI / 2;
      const cupColour = mood.cheer > 0.5 ? '#d8263c' : '#e9eef0';
      for (let i = 0; i < Math.round(2 + clutter * 4); i++) cup(spotOn(), cupColour, random() < 0.25 + mood.wear * 0.3);
      if (mood.wear > 0.4) s.cylinder(0.09, 0.1, 0.004, [p[0] + 0.12, p[1] + 0.003, p[2] + 0.1], s.material('#c98a1e', { roughness: 0.1, transparent: true, opacity: 0.7 }), 14);
    } else if (a.left === 'cake') {
      const p = on(0, -0.03);
      const frosting = s.material(mood.cheer > 0.4 ? '#fff4f0' : '#e8dcc8', { roughness: 0.6 });
      s.cylinder(0.17, 0.17, 0.008, [p[0], p[1] + 0.004, p[2]], s.material('#d9dde0', { metalness: 0.6, roughness: 0.3 }), 20);
      s.cylinder(0.14, 0.14, 0.09, [p[0], p[1] + 0.053, p[2]], frosting, 24);
      const pink = s.material(['#ff5a9a', '#3fb8e0', '#ffd23f'][Math.floor(random() * 3)], { roughness: 0.5 });
      s.ring(0.14, 0.014, [p[0], p[1] + 0.02, p[2]], pink).rotation.x = Math.PI / 2;
      s.ring(0.128, 0.012, [p[0], p[1] + 0.098, p[2]], pink).rotation.x = Math.PI / 2;
      const cut = random() < 0.5;
      if (cut) { const wedge = s.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8, 1, false, 0.3, 1.0), s.material('#6a3a1e'), [p[0], p[1] + 0.053, p[2]]); wedge.scale.setScalar(0.98); }
      const candles = 3 + Math.floor(random() * 6);
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffa020', emissiveIntensity: mood.energy > 0.15 ? 2.2 : 0 });
      for (let i = 0; i < candles; i++) { const t = i / candles * 6.283 + 2; if (cut && t % 6.283 > 0.2 && t % 6.283 < 1.4) continue; const cx = p[0] + Math.cos(t) * 0.085, cz = p[2] + Math.sin(t) * 0.085; s.cylinder(0.006, 0.006, 0.06, [cx, p[1] + 0.128, cz], s.material(['#ff5a9a', '#3fb8e0', '#ffd23f', '#7fd62a'][i % 4]), 6); s.ball([0.008, 0.016, 0.008], [cx, p[1] + 0.17, cz], flame, 8); }
      for (let i = 0; i < Math.round(1 + clutter * 3); i++) { const q = spotOn(); const t = 2.4 + i * 1.3; const at: [number, number, number] = flat ? q : [p[0] + Math.cos(t) * 0.3, q[1], p[2] + Math.sin(t) * 0.26]; s.cylinder(0.075, 0.06, 0.008, [at[0], at[1] + 0.004, at[2]], s.material('#f6f4ec'), 14); if (random() < 0.6) s.box([0.05, 0.03, 0.04], [at[0], at[1] + 0.022, at[2]], frosting); }
      for (let i = 0; i < 2 + Math.round(clutter * 2); i++) { const q = spotOn(); const t = 0.6 + i * 1.7; const at: [number, number, number] = flat ? q : [p[0] + Math.cos(t) * 0.32, q[1], p[2] + Math.sin(t) * 0.3]; const hat = s.cylinder(0, 0.055, 0.16, [at[0], at[1] + 0.08, at[2]], s.material(['#d8263c', '#1f8fe8', '#f2c12e', '#2fa86a'][i % 4], { roughness: 0.4 }), 14); if (random() < 0.4) { hat.rotation.z = Math.PI / 2 - 0.34; hat.position.y = at[1] + 0.05; hat.rotation.y = random() * 6; } }
    } else if (a.left === 'jacket') {
      const p = on(0, 0);
      const cloth = s.material(['#2f4a7a', '#6b4a2a', '#8a1c2a', '#3a4a3a', '#1c1c1f'][Math.floor(random() * 5)], { roughness: 0.95 });
      const lining = s.material('#c9a03a', { roughness: 0.7 });
      const turn = (random() - 0.5) * 0.8;
      const fold = (size: [number, number, number], y: number, dx = 0) => { const m = s.mesh(new THREE.SphereGeometry(0.5, 14, 8), cloth, [p[0] + dx, p[1] + y, p[2]]); m.scale.set(...size); m.rotation.y = turn; return m; };
      fold([0.46, 0.07, 0.36], 0.03); fold([0.42, 0.07, 0.33], 0.065, 0.01); fold([0.2, 0.05, 0.1], 0.1, -0.08);
      const collar = s.ring(0.06, 0.016, [p[0], p[1] + 0.1, p[2] - 0.11], lining, Math.PI); collar.rotation.set(-Math.PI / 2 + 0.3, 0, 0);
      if (flat) for (const m of s.root.children.slice(-4)) m.scale.multiplyScalar(0.8);
    } else if (a.left === 'sheets') {
      for (let i = 0; i < Math.round(2 + clutter * 3); i++) { const q = spotOn(); const paper = s.box([0.21, 0.002, 0.28], [q[0], q[1] + 0.002 + i * 0.002, q[2]], s.material(i % 3 === 2 ? '#f6d0d0' : '#fbf7e6')); paper.rotation.y = (random() - 0.5) * 1.6; }
      for (let i = 0; i < 3; i++) { const q = spotOn(); const pencil = s.cylinder(0.005, 0.005, 0.11, [q[0], q[1] + 0.012, q[2]], s.material('#e8b81e'), 6); pencil.rotation.set(Math.PI / 2, 0, random() * 6); }
      const q = on(0.16, 0.1); const towel = s.box([0.16, 0.035, 0.24], [q[0], q[1] + 0.018, q[2]], s.material(['#f2f0ea', '#3fb8e0', '#d8263c'][Math.floor(random() * 3)], { roughness: 1 })); towel.rotation.y = 0.4;
      cup(on(-0.2, -0.12), '#e9eef0');
    } else if (a.left === 'wreckage') {
      const bottle = s.material('#6a3a12', { roughness: 0.2 });
      for (let i = 0; i < Math.round(3 + clutter * 5); i++) {
        const q = spotOn(), down = random() < 0.3;
        const b = s.lathe([[0, 0], [0.028, 0], [0.03, 0.02], [0.03, 0.12], [0.012, 0.17], [0.012, 0.22], [0, 0.22]], bottle, [q[0], q[1] + (down ? 0.03 : 0), q[2]]);
        if (down) { b.rotation.z = Math.PI / 2; b.rotation.y = random() * 6; }
      }
      const q = on(-0.1, 0.1);
      s.box([0.2, 0.025, 0.14], [q[0], q[1] + 0.0125, q[2]], s.material('#f4f1e6'));
      const chips = s.material('#e8b02a', { roughness: 0.7 });
      for (let i = 0; i < 9; i++) { const chip = s.mesh(new THREE.CircleGeometry(0.03, 3), chips, [q[0] + (random() - 0.5) * 0.16, q[1] + 0.03 + random() * 0.02, q[2] + (random() - 0.5) * 0.1]); chip.rotation.set(random() * 3, random() * 3, random() * 3); (chip.material as THREE.Material).side = THREE.DoubleSide; }
      const ash = on(0.18, -0.08);
      s.cylinder(0.06, 0.05, 0.025, [ash[0], ash[1] + 0.0125, ash[2]], clear('#c9a03a', 0.6), 14);
      for (let i = 0; i < 6; i++) { const butt = s.cylinder(0.005, 0.005, 0.04, [ash[0] + (random() - 0.5) * 0.06, ash[1] + 0.03, ash[2] + (random() - 0.5) * 0.06], s.material(i % 2 ? '#f1ead2' : '#c98a4a'), 5); butt.rotation.set(random() * 2, 0, random() * 2); }
      cup(spotOn(), '#d8263c', true); cup(spotOn(), '#d8263c');
    }

    // the pencil on a string, always
    const edge: [number, number, number] = a.table === 'scorer' ? [0.44, top - 0.03, tz + 0.27] : a.table === 'round' ? [0.31, top - 0.02, tz + 0.31] : [0.42, top - 0.02, tz + 0.16];
    const swing = new THREE.Group(); swing.position.set(...edge); s.root.add(swing);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.3, 4), s.material('#efe9d8')); string.position.y = -0.15;
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 6), s.material('#e8b81e')); pencil.position.y = -0.35; pencil.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.02, 6), dark); tip.position.y = -0.42; tip.rotation.x = Math.PI;
    swing.add(string, pencil, tip); swing.rotation.z = 0.12;

    // ---- on or around the seats
    const free = spots.map((_spot, i) => i).filter((i) => i !== gone);
    const chosen = free[Math.floor(random() * free.length)];
    const seatAt = (i: number, local: [number, number, number]) => { const v = new THREE.Vector3(...local).applyAxisAngle(new THREE.Vector3(0, 1, 0), -spots[i].theta); return [spots[i].x + v.x, v.y, spots[i].z + v.z] as [number, number, number]; };
    let balloon: THREE.Object3D | null = null;
    if (a.seatStory === 'ball') {
      const hue = random();
      const ballMap = paint(128, 64, (c, w, h) => { c.fillStyle = `hsl(${hue * 360},70%,35%)`; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.strokeStyle = `hsla(${hue * 360 + (random() - 0.5) * 60},80%,${40 + random() * 40}%,0.6)`; c.lineWidth = 1 + random() * 4; c.beginPath(); c.moveTo(random() * w, random() * h); c.bezierCurveTo(random() * w, random() * h, random() * w, random() * h, random() * w, random() * h); c.stroke(); } });
      const ball = s.mesh(new THREE.SphereGeometry(0.109, 24, 16), new THREE.MeshStandardMaterial({ map: ballMap, roughness: 0.15 }), seatAt(chosen, [0, 0.525, 0.0]));
      ball.rotation.set(random() * 3, random() * 3, 0);
    } else if (a.seatStory === 'shoes') {
      for (const side of [-1, 1]) {
        const at = seatAt(chosen, [side * 0.07 + 0.05, 0, 0.18 + side * 0.02]);
        const shoe = s.mesh(new THREE.SphereGeometry(0.5, 12, 8), s.material(mood.cheer > 0.5 ? '#f4f1e6' : '#4a3424', { roughness: 0.6 }), [at[0], 0.045, at[2]]);
        shoe.scale.set(0.1, 0.09, 0.27); shoe.rotation.y = -spots[chosen].theta + side * 0.12;
        s.cylinder(0.04, 0.042, 0.05, [at[0], 0.09, at[2] - 0.06 * Math.cos(spots[chosen].theta)], dark, 10);
      }
    } else if (a.seatStory === 'coat') {
      const cloth = s.material(['#7a5a2a', '#2f4a7a', '#3a3a40', '#8a1c2a'][Math.floor(random() * 4)], { roughness: 1, side: THREE.DoubleSide });
      const g = new THREE.Group(); g.position.set(spots[chosen].x, 0, spots[chosen].z); g.rotation.y = -spots[chosen].theta; s.root.add(g);
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.44, 12, 1, true, 0, Math.PI), cloth);
      drape.rotation.set(0, 0, Math.PI / 2); drape.scale.set(1, 1, 3.4); drape.position.set(0, 0.82, -0.28); drape.castShadow = true;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.03), cloth); tail.position.set(0, 0.56, -0.37); tail.rotation.x = 0.1; tail.castShadow = true;
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.03), cloth); front.position.set(0, 0.7, -0.19); front.rotation.x = -0.12; front.castShadow = true;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 8), cloth); sleeve.position.set(0.24, 0.52, -0.34); sleeve.rotation.z = 0.12; sleeve.castShadow = true;
      g.add(drape, tail, front, sleeve);
    } else if (a.seatStory === 'balloon') {
      const end = random() < 0.5 ? free[0] : free[free.length - 1];
      const base = seatAt(end, [0.2, 0.84, -0.26]);
      const g = new THREE.Group(); g.position.set(...base); s.root.add(g);
      const droop = mood.cheer < 0.25;
      const height = droop ? 0.25 : mix(0.7, 1.0, random());
      const colour = ['#d8263c', '#f2c12e', '#1f8fe8', '#ff5a9a', '#c9d2d6'][Math.floor(random() * 5)];
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), s.material(colour, { roughness: 0.15, metalness: colour === '#c9d2d6' ? 0.8 : 0.1 }));
      body.scale.set(1, 1.2, 1); body.position.y = height + 0.17; body.castShadow = true;
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 8), s.material(colour)); knot.position.y = height;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, height, 4), s.material('#f4f1e6')); ribbon.position.y = height / 2;
      g.add(body, knot, ribbon);
      if (droop) { g.rotation.z = -1.9; body.scale.set(0.8, 0.9, 0.7); }
      else balloon = g;
    } else if (a.seatStory === 'bag') {
      const end = random() < 0.5 ? 0 : n - 1, side = end === 0 ? -1 : 1;
      const at = seatAt(end, [side * 0.48, 0, 0.05]);
      const vinyl = s.material(['#8a1c2a', '#1f3f7a', '#1c1c1f', '#b8862a'][Math.floor(random() * 4)], { roughness: 0.45 });
      const bag = s.mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), vinyl, [at[0], 0.11, at[2]]); bag.scale.set(0.42, 0.36, 0.3); bag.rotation.y = -spots[end].theta;
      s.box([0.4, 0.03, 0.28], [at[0], 0.015, at[2]], dark).rotation.y = -spots[end].theta;
      s.ring(0.09, 0.012, [at[0], 0.27, at[2]], dark, Math.PI).rotation.y = -spots[end].theta;
      s.box([0.3, 0.012, 0.012], [at[0], 0.29, at[2]], s.material('#d9dde0', { metalness: 0.8, roughness: 0.3 })).rotation.y = -spots[end].theta;
    }

    // ---- the floor it is bolted to
    if (a.carpet !== 'none') {
      const xs = spots.map((spot) => spot.x), zs = spots.map((spot) => spot.z);
      const minX = Math.min(...xs, -0.6) - 0.6, maxX = Math.max(...xs, 0.6) + 0.6, minZ = Math.min(...zs) - 0.55, maxZ = Math.max(...zs, tz + 0.5) + 0.45;
      const w = maxX - minX, d = maxZ - minZ;
      const map = paint(512, 512, (c, cw, ch) => {
        if (a.carpet === 'cosmic') {
          c.fillStyle = '#16141f'; c.fillRect(0, 0, cw, ch);
          const neon = ['#ff2e88', '#2ee6d6', '#ffe14a', '#7a5cff', '#5aff6a'];
          for (let i = 0; i < 46; i++) { c.strokeStyle = c.fillStyle = neon[i % 5]; c.lineWidth = 5; const x = random() * cw, y = random() * ch, kind = i % 4;
            if (kind === 0) { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y - 40, x + 50, y + 40, x + 80, y); c.stroke(); }
            else if (kind === 1) { c.beginPath(); c.arc(x, y, 12 + random() * 10, 0, 7); c.stroke(); c.beginPath(); c.ellipse(x, y, 30, 6, 0.4, 0, 7); c.stroke(); }
            else if (kind === 2) { c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 16, t = k / 10 * 6.283; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.fill(); }
            else { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 22, y + 34); c.lineTo(x - 22, y + 34); c.closePath(); c.stroke(); } }
        } else if (a.carpet === 'geometric') {
          c.fillStyle = '#6b3f22'; c.fillRect(0, 0, cw, ch);
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#d9601a' : '#c9a03a'; c.fillRect(x * 64 + 8, y * 64 + 8, 34, 34); c.fillStyle = '#3a2212'; c.fillRect(x * 64 + 28, y * 64 + 28, 28, 28); c.fillStyle = '#efe0b8'; c.fillRect(x * 64 + 36, y * 64 + 36, 12, 12); }
        } else if (a.carpet === 'red') {
          c.fillStyle = '#8a2424'; c.fillRect(0, 0, cw, ch);
          for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '40,0,0' : '220,120,90'},0.25)`; c.fillRect(random() * cw, random() * ch, 3, 3); }
          for (let i = 0; i < 6 * mood.wear; i++) { c.fillStyle = 'rgba(60,30,30,0.35)'; c.beginPath(); c.ellipse(random() * cw, random() * ch, 30 + random() * 50, 20 + random() * 30, random() * 3, 0, 7); c.fill(); }
        } else {
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#b9bcb6' : '#a2a6a2'; c.fillRect(x * 64, y * 64, 64, 64); }
          for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '30,30,30' : '255,255,255'},0.3)`; c.fillRect(random() * cw, random() * ch, 2, 2); }
        }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(w / 2.4, d / 2.4);
      const sideMat = s.material(a.carpet === 'lino' ? '#7e827e' : '#2a2026');
      const slab = s.mesh(new THREE.BoxGeometry(w, 0.05, d), [sideMat, sideMat, new THREE.MeshStandardMaterial({ map, roughness: a.carpet === 'lino' ? 0.5 : 1 }), sideMat, sideMat, sideMat] as unknown as THREE.Material, [(minX + maxX) / 2, -0.025, (minZ + maxZ) / 2]);
      slab.castShadow = false;
    }

    const energy = mood.energy;
    return s.finish({
      update(_dt, time) {
        swing.rotation.z = 0.05 + Math.sin(time * 2.2) * 0.22 * energy;
        if (balloon) { balloon.rotation.z = Math.sin(time * 0.9) * 0.1 * (0.3 + energy); balloon.rotation.x = Math.cos(time * 0.7) * 0.08 * (0.3 + energy); }
      },
    });
  },
});
