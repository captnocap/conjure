import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Bit = { p: V3; s: V3; r?: V3; c?: THREE.ColorRepresentation };

function bits(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Bit[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((b, i) => {
    e.set(...(b.r ?? [0, 0, 0]), 'YXZ');
    m.compose(v.set(...b.p), q.setFromEuler(e), sc.set(...b.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(b.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const roman = (n: number) => {
  let out = '';
  for (const [v, t] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as const) while (n >= v) { out += t; n -= v; }
  return out;
};

const METALS = {
  bronze: { base: '#7c5c38', etch: '#ecd596', blot: '#5f9a84', frame: '#4a3a28', metal: 0.6 },
  steel: { base: '#aab3b5', etch: '#2f383b', blot: '#8a8f8c', frame: '#5d676a', metal: 0.75 },
  black: { base: '#22262a', etch: '#e9bf4e', blot: '#34393e', frame: '#101214', metal: 0.5 },
  copper: { base: '#bd6f42', etch: '#35201a', blot: '#4fa08a', frame: '#6a3d26', metal: 0.7 },
  hull: { base: '#e3e5dd', etch: '#2b4d7c', blot: '#b9b6a6', frame: '#8f9690', metal: 0.2 },
} as const;

export default defineThing({
  questions: {
    generations: score('How many generations are listed on it?', ['Only three: the founders and their children', 'Six or seven', 'A dozen', 'Too many to count: panel after panel bolted on']),
    form: choice('What shape is the wall?', {
      slab: 'One straight standing slab of panels side by side.',
      arc: 'A curved arc that half-embraces whoever stands before it.',
      screen: 'A folding zigzag screen of hinged panels.',
      stele: 'A tall narrow stele, panels stacked two wide and many high.',
    }),
    metal: choice('What are the panels made of?', {
      bronze: 'Dark bronze with green patina and pale gold lettering.',
      steel: 'Brushed grey steel with dark etched lines.',
      black: 'Black anodised plate with gold-filled names.',
      copper: 'Warm copper going green at the edges.',
      hull: 'Salvaged white hull plating with blue stencilled names.',
    }),
    offering: choice('What has been tucked into it and left at its foot?', {
      flowers: 'Fresh cut flowers pushed into the seams and laid in bunches.',
      ribbons: 'Coloured ribbons knotted to the frame, fluttering.',
      tokens: 'Small tokens: toys, bolts, coins, folded notes, photographs.',
      candles: 'Little candles and oil lamps along the ledge.',
      seedlings: 'Tiny pots of seedlings, a living gift.',
      nothing: 'Nothing at all.',
    }),
    story: choice('What is the state of remembrance here?', {
      tended: 'Tended daily: polished, orderly, every generation equally honoured.',
      fresh: 'A name was etched today: one bright new line, a step-stool and an engraving tool left beneath it.',
      grief: 'One name has drawn everything: offerings heaped beneath a single panel, that name ringed in red.',
      defaced: 'Someone wanted names forgotten: one panel is gouged and scratched out.',
      neglected: 'Nobody comes any more: stains, a panel fallen and leaning at the foot, the newest panel never begun.',
      full: 'Full: the last panel is etched to the bottom and there is no room left for the living.',
    }),
    crest: choice('What crowns the wall?', {
      plain: 'Nothing, just a plain cap rail.',
      tree: 'A round medallion of a branching tree.',
      ship: 'A medallion of the ship as a spoked wheel.',
      lamp: 'A small ever-burning memorial lamp.',
      stars: 'A thin arch with a row of small star points.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const metal = METALS[a.metal];
    const frame = s.material(metal.frame, { metalness: 0.6, roughness: 0.5 });
    const stone = s.material(a.metal === 'hull' ? '#8f9690' : '#6f6a62', { roughness: 0.9 });

    const stele = a.form === 'stele';
    const count = Math.round(mix(3, 10, a.generations)) + (stele && Math.round(mix(3, 10, a.generations)) % 2 ? 1 : 0);
    const w = stele ? 0.62 : 0.46, h = stele ? 0.78 : 1.75, pitch = w + 0.035, baseH = 0.24;
    const special = a.story === 'fresh' || a.story === 'full' ? count - 1 : Math.floor(random() * count);
    const fallen = a.story === 'neglected' ? Math.floor(random() * (count - 1)) : -1;

    // Where each panel stands: a group per panel, origin at its foot centre, facing its own +z.
    const frames: THREE.Group[] = [];
    const R = Math.max(1.5, count * pitch / 1.9);
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const u = i - (count - 1) / 2;
      if (a.form === 'slab') g.position.set(u * pitch, baseH, 0);
      else if (a.form === 'arc') { const phi = u * pitch / R; g.position.set(R * Math.sin(phi), baseH, R * (1 - Math.cos(phi))); g.rotation.y = -phi; }
      else if (a.form === 'screen') { const th = 0.5; g.position.set(u * w * Math.cos(th), baseH, 0); g.rotation.y = i % 2 ? th : -th; }
      else g.position.set((i % 2 - 0.5) * pitch, baseH + Math.floor(i / 2) * (h + 0.035), 0);
      s.root.add(g);
      g.updateMatrixWorld(true);
      frames.push(g);
    }
    const W = (i: number, x: number, y: number, z: number) => frames[i].localToWorld(new THREE.Vector3(x, y, z)).toArray() as V3;
    const yawOf = (i: number) => frames[i].rotation.y;

    const paint = (i: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 144; canvas.height = Math.round(144 * h / w);
      const g = canvas.getContext('2d')!;
      const H = canvas.height;
      g.fillStyle = metal.base; g.fillRect(0, 0, 144, H);
      for (let k = 0; k < 5 + mood.wear * 34; k++) {
        const x = random() * 144, y = random() * H, r = 6 + random() * 26;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, metal.blot + (a.story === 'neglected' ? 'cc' : '88')); grd.addColorStop(1, metal.blot + '00');
        g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.fillStyle = metal.etch;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 26px monospace';
      g.fillText(roman(i + 1), 72, 24);
      g.fillRect(14, 44, 116, 2);
      const last = i === count - 1;
      const fill = last ? (a.story === 'full' ? 1 : a.story === 'neglected' ? 0 : a.story === 'fresh' ? rr(0.3, 0.6) : rr(0.2, 0.7)) : 1;
      const rows = Math.floor((H - 70) / 9);
      const lastRow = Math.floor(rows * fill);
      const ringed = Math.floor(rr(0.2, 0.8) * Math.max(lastRow, 1));
      for (let row = 0; row < lastRow; row++) for (const x0 of [14, 78]) {
        if (row === lastRow - 1 && x0 === 78 && fill < 1) continue;
        const y = 56 + row * 9;
        const first = 10 + random() * 16, second = 12 + random() * 20;
        g.globalAlpha = 0.6 + random() * 0.4;
        g.fillRect(x0, y, first, 3.2);
        g.fillRect(x0 + first + 4, y, Math.min(second, 52 - first - 4), 3.2);
      }
      g.globalAlpha = 1;
      if (i === special && a.story === 'fresh' && lastRow > 0) {
        const y = 56 + (lastRow - 1) * 9;
        g.fillStyle = '#ffffff'; g.fillRect(12, y - 1.5, 54, 6);
        g.fillStyle = '#fff6c9'; g.globalAlpha = 0.35; g.fillRect(4, y - 8, 70, 20); g.globalAlpha = 1;
      }
      if (i === special && a.story === 'grief') {
        const y = 57 + ringed * 9;
        g.strokeStyle = '#d6252b'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(40, y, 34, 11, 0, 0, 7); g.stroke();
      }
      if (i === special && a.story === 'defaced') {
        g.strokeStyle = a.metal === 'black' || a.metal === 'bronze' ? '#d8d8d0' : '#1c1c1c'; g.lineWidth = 3; g.lineCap = 'round';
        for (let k = 0; k < 26; k++) { const y = 60 + random() * (H - 90); g.beginPath(); g.moveTo(8 + random() * 30, y); g.lineTo(100 + random() * 36, y + (random() - 0.5) * 60); g.stroke(); }
      }
      for (const [x, y] of [[8, 8], [136, 8], [8, H - 8], [136, H - 8]]) { g.fillStyle = metal.frame; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    };

    const edge = s.material(metal.base, { metalness: metal.metal, roughness: 0.5 });
    for (let i = 0; i < count; i++) {
      const g = frames[i];
      const face = new THREE.MeshStandardMaterial({ map: paint(i), metalness: metal.metal * 0.6, roughness: mix(0.38, 0.8, mood.wear) });
      const panel = s.mesh(new THREE.BoxGeometry(w, h, 0.05), [edge, edge, edge, edge, face, edge] as unknown as THREE.Material, [0, h / 2 + 0.02, 0]);
      g.add(panel);
      if (i === fallen) {
        panel.position.set(rr(-0.05, 0.05), h / 2 * Math.cos(0.32) - 0.02, 0.36 + h / 2 * Math.sin(0.32) - 0.24);
        panel.rotation.x = -0.32; panel.rotation.z = rr(-0.08, 0.08);
        g.add(s.box([w, h, 0.03], [0, h / 2 + 0.02, -0.02], s.material('#3a3d3f')));
      }
      // Back plate, posts and footing.
      g.add(s.box([w + 0.035, 0.05, 0.1], [0, h + 0.045, 0], frame));
      for (const x of [-pitch / 2, pitch / 2]) if (!stele || x < 0 === (i % 2 === 0)) g.add(s.box([0.035, h + 0.04, 0.09], [stele ? x * 1.0 : x, h / 2 + 0.02, 0], frame));
      if (!stele || i < 2) g.add(s.box([pitch + (a.form === 'screen' ? 0.1 : 0.01), baseH, 0.62], [0, -baseH / 2, 0.06], stone));
    }
    if (stele) s.box([pitch * 2 + 0.14, 0.1, 0.9], [0, 0.05, 0.1], stone);

    // Crest.
    const topY = baseH + (stele ? (count / 2) * (h + 0.035) : h) + 0.07;
    const mid = Math.floor((count - 1) / 2);
    const crestAt = stele ? ([0, topY, 0] as V3) : count % 2 ? W(mid, 0, h + 0.07, 0) : W(mid, pitch / 2, h + 0.07, 0);
    const crestYaw = stele || a.form === 'screen' ? 0 : count % 2 ? yawOf(mid) : (yawOf(mid) + yawOf(mid + 1)) / 2;
    if (a.crest === 'tree' || a.crest === 'ship') {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const g = c.getContext('2d')!;
      g.fillStyle = metal.base; g.beginPath(); g.arc(80, 80, 80, 0, 7); g.fill();
      g.strokeStyle = metal.etch; g.fillStyle = metal.etch; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.arc(80, 80, 70, 0, 7); g.stroke();
      if (a.crest === 'tree') {
        g.beginPath(); g.moveTo(80, 140); g.lineTo(80, 80); g.stroke();
        g.lineWidth = 4;
        for (let k = 0; k < 7; k++) { const ang = -Math.PI / 2 + (k - 3) * 0.42; g.beginPath(); g.moveTo(80, 96 - Math.abs(k - 3) * 2); g.lineTo(80 + Math.cos(ang) * 46, 86 + Math.sin(ang) * 46); g.stroke(); g.beginPath(); g.arc(80 + Math.cos(ang) * 50, 86 + Math.sin(ang) * 50, 7, 0, 7); g.fill(); }
        for (const dx of [-22, 22]) { g.beginPath(); g.moveTo(80, 132); g.lineTo(80 + dx, 144); g.stroke(); }
      } else {
        g.beginPath(); g.arc(80, 80, 44, 0, 7); g.stroke();
        g.beginPath(); g.arc(80, 80, 12, 0, 7); g.fill();
        g.lineWidth = 4;
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(80, 80); g.lineTo(80 + Math.cos(k * 1.047) * 44, 80 + Math.sin(k * 1.047) * 44); g.stroke(); }
      }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const disc = s.cylinder(0.3, 0.3, 0.05, [crestAt[0], crestAt[1] + 0.3, crestAt[2]], edge, 32);
      disc.rotation.order = 'YXZ'; disc.rotation.set(Math.PI / 2, crestYaw, 0);
      const art = s.mesh(new THREE.CircleGeometry(0.285, 32), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.4, roughness: 0.5 }), [crestAt[0] + Math.sin(crestYaw) * 0.028, crestAt[1] + 0.3, crestAt[2] + Math.cos(crestYaw) * 0.028]);
      art.rotation.y = crestYaw;
    } else if (a.crest === 'lamp') {
      const [x, y, z] = crestAt;
      s.cylinder(0.09, 0.12, 0.06, [x, y + 0.03, z], frame, 12);
      s.cylinder(0.07, 0.07, 0.18, [x, y + 0.15, z], new THREE.MeshStandardMaterial({ color: '#ffd68a', emissive: '#ffb347', emissiveIntensity: mix(1.2, 2.6, mood.cheer), roughness: 0.3 }), 12);
      s.lathe([[0.11, 0], [0.09, 0.03], [0.02, 0.1], [0, 0.12]], frame, [x, y + 0.24, z]);
    } else if (a.crest === 'stars') {
      const span = stele ? pitch : Math.min(1.4, count * pitch * 0.4);
      const arch = s.ring(span, 0.018, [crestAt[0], crestAt[1] - 0.03, crestAt[2]], frame, Math.PI);
      arch.rotation.y = crestYaw; arch.scale.y = 0.45;
      const star = new THREE.MeshStandardMaterial({ color: '#fff4c2', emissive: '#ffe28a', emissiveIntensity: 1.6 });
      for (let k = 0; k < 7; k++) { const ang = (k + 0.5) / 7 * Math.PI; s.mesh(new THREE.OctahedronGeometry(0.045), star, [crestAt[0] + Math.cos(ang) * span * Math.cos(crestYaw), crestAt[1] - 0.03 + Math.sin(ang) * span * 0.45, crestAt[2] - Math.cos(ang) * span * Math.sin(crestYaw)]); }
    }

    // Offerings: tucked into the seams and laid along the ledge.
    const blooms: Bit[] = [], sticks: Bit[] = [], strips: Bit[] = [], blocks: Bit[] = [], rounds: Bit[] = [], flames: Bit[] = [];
    const dead = a.story === 'neglected';
    const amount = a.offering === 'nothing' ? 0 : mix(0.5, 1.6, mood.density) * (dead ? 0.45 : 1);
    const bright = ['#f2c230', '#e2574a', '#f4f1e4', '#b77ad8', '#f08ab0', '#f28a1e'];
    const faded = ['#8a7a52', '#6f5a3a', '#9a8f6a'];
    const hue = () => (dead ? pick(faded) : pick(bright));
    const ground = (i: number) => (stele ? i < 2 : true);
    const spots: { i: number; x: number; y: number; z: number; seam: boolean }[] = [];
    const total = Math.round(count * 6 * amount);
    for (let k = 0; k < total; k++) {
      const i = a.story === 'grief' && random() < 0.75 ? special : Math.floor(random() * count);
      const seam = a.offering !== 'candles' && a.offering !== 'seedlings' && random() < (a.offering === 'ribbons' ? 0.9 : 0.5);
      if (seam) spots.push({ i, x: (random() < 0.5 ? -1 : 1) * pitch / 2 + rr(-0.01, 0.01), y: rr(0.25, h - 0.05), z: 0.05, seam });
      else if (ground(i)) spots.push({ i, x: rr(-w / 2, w / 2), y: stele ? -baseH + 0.1 : 0, z: rr(0.1, 0.33) + (stele ? 0.12 : 0), seam });
    }
    for (const spot of spots) {
      const { i, x, y, z } = spot, yaw = yawOf(i);
      if (a.offering === 'flowers') {
        const n = spot.seam ? 1 + Math.floor(random() * 2) : 3 + Math.floor(random() * 4);
        for (let j = 0; j < n; j++) {
          const len = rr(0.14, 0.28), lean = spot.seam ? rr(0.5, 1.1) : rr(1.2, 1.5), yo = rr(-0.9, 0.9);
          const from = W(i, x + (spot.seam ? 0 : rr(-0.06, 0.06)), y + (spot.seam ? 0 : 0.02), z);
          const dir: V3 = [Math.sin(yaw + yo) * Math.sin(lean), Math.cos(lean), Math.cos(yaw + yo) * Math.sin(lean)];
          sticks.push({ p: from, s: [0.005, len, 0.005], r: [lean, yaw + yo, 0], c: dead ? '#6f5a3a' : '#4f8a42' });
          blooms.push({ p: [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len], s: [0.045, 0.036, 0.045], c: hue() });
        }
      } else if (a.offering === 'ribbons') {
        const len = rr(0.18, 0.5), colour = hue();
        strips.push({ p: W(i, x, (spot.seam ? y : rr(0.5, h)) , 0.055), s: [0.035, len, 0.006], r: [rr(-0.15, 0.1), yaw, rr(-0.35, 0.35)], c: colour });
        strips.push({ p: W(i, x + 0.02, (spot.seam ? y : rr(0.5, h)), 0.06), s: [0.03, len * rr(0.4, 0.8), 0.006], r: [rr(-0.2, 0.1), yaw, rr(-0.5, 0.5)], c: colour });
      } else if (a.offering === 'tokens') {
        const kind = Math.floor(random() * 4);
        const at = W(i, x, spot.seam ? y : 0.03, spot.seam ? 0.06 : z);
        if (kind === 0) blocks.push({ p: at, s: [0.09, spot.seam ? 0.11 : 0.008, spot.seam ? 0.006 : 0.11], r: [0, yaw + rr(-0.4, 0.4), spot.seam ? rr(-0.3, 0.3) : 0], c: pick(['#f4f1e4', '#e9dcc0', '#cfd8dc']) });
        else if (kind === 1) rounds.push({ p: at, s: [0.035, 0.035, 0.035], c: pick(['#d8a020', '#b9c0c2', '#c0714d']) });
        else if (kind === 2) blocks.push({ p: [at[0], at[1] + 0.02, at[2]], s: [0.06, 0.06, 0.06], r: [0, rr(0, 3), 0], c: pick(bright) });
        else { rounds.push({ p: [at[0], at[1] + 0.03, at[2]], s: [0.05, 0.06, 0.045], c: '#9a6a3e' }); rounds.push({ p: [at[0], at[1] + 0.1, at[2]], s: [0.04, 0.04, 0.04], c: '#9a6a3e' }); }
      } else if (a.offering === 'candles') {
        const tall = rr(0.04, 0.2);
        const at = W(i, x, 0, z);
        sticks.push({ p: at, s: [0.045, tall, 0.045], c: pick(['#f1e8cf', '#e9d9a8', '#c8553d']) });
        if (!dead && random() < mix(0.4, 0.95, mood.cheer)) flames.push({ p: [at[0], at[1] + tall + 0.03, at[2]], s: [0.016, 0.032, 0.016] });
      } else if (a.offering === 'seedlings') {
        const at = W(i, x, 0, z);
        rounds.push({ p: [at[0], at[1] + 0.04, at[2]], s: [0.05, 0.045, 0.05], c: pick(['#c0714d', '#a85f40', '#d9d4c4']) });
        if (!dead || random() < 0.3) for (let j = 0; j < 3; j++) blooms.push({ p: [at[0] + rr(-0.03, 0.03), at[1] + rr(0.1, 0.17), at[2] + rr(-0.03, 0.03)], s: [0.028, 0.012, 0.02], r: [rr(-0.5, 0.5), rr(0, 6), rr(-0.5, 0.5)], c: dead ? '#8a7a52' : pick(['#6fbf4a', '#8fd05a', '#4fa544']) });
        sticks.push({ p: [at[0], at[1] + 0.07, at[2]], s: [0.006, rr(0.04, 0.09), 0.006], c: '#5a9a46' });
      }
    }
    const white = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 });
    const stickGeo = new THREE.BoxGeometry(1, 1, 1); stickGeo.translate(0, 0.5, 0);
    const stripGeo = new THREE.BoxGeometry(1, 1, 1); stripGeo.translate(0, -0.5, 0);
    bits(s.root, new THREE.SphereGeometry(1, 8, 6), white(), blooms);
    bits(s.root, stickGeo, white(), sticks);
    const ribbons = bits(s.root, stripGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }), strips);
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), white(), blocks);
    bits(s.root, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, metalness: 0.2 }), rounds);
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.4 });
    bits(s.root, new THREE.SphereGeometry(1, 6, 5), flameMat, flames);

    // Story props.
    if (a.story === 'fresh') {
      const wood = s.material('#a9814e');
      const g = frames[stele ? count % 2 : count - 1];
      const at = g.localToWorld(new THREE.Vector3(0.02, stele ? -baseH : 0, 0.62));
      const stool = new THREE.Group();
      stool.position.set(at.x, 0, at.z); stool.rotation.y = g.rotation.y + 0.3;
      const S = (m: THREE.Mesh) => { stool.add(m); return m; };
      S(s.box([0.4, 0.03, 0.26], [0, 0.42, 0], wood)); S(s.box([0.4, 0.03, 0.2], [0, 0.21, 0.16], wood));
      for (const x of [-0.18, 0.18]) { S(s.box([0.03, 0.42, 0.03], [x, 0.21, -0.1], wood)); S(s.box([0.03, 0.44, 0.03], [x, 0.21, 0.17], wood)).rotation.x = 0.28; }
      S(s.rod([-0.1, 0.445, 0], [0.08, 0.445, 0.06], 0.012, s.material('#c0392b')));
      S(s.rod([0.08, 0.445, 0.06], [0.14, 0.445, 0.08], 0.006, s.material('#cfd6d8', { metalness: 0.8 })));
      S(s.box([0.1, 0.008, 0.07], [-0.08, 0.44, -0.07], s.material('#e9e6dc')));
      s.root.add(stool);
    }
    if (dead) {
      const dust: Bit[] = [];
      for (let k = 0; k < 30; k++) { const i = Math.floor(random() * count); if (!ground(i)) continue; dust.push({ p: W(i, rr(-w / 2, w / 2), stele ? -baseH + 0.1 : 0.004, rr(0.1, 0.36) + (stele ? 0.1 : 0)), s: [rr(0.02, 0.05), 0.004, rr(0.02, 0.05)], r: [0, rr(0, 6), 0], c: pick(faded) }); }
      bits(s.root, new THREE.SphereGeometry(1, 6, 4), white(), dust);
    }

    const sway = mix(0.2, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        flameMat.emissiveIntensity = 2.1 + Math.sin(time * 9 * sway) * 0.35 + Math.sin(time * 23) * 0.2;
        if (ribbons) ribbons.rotation.z = Math.sin(time * 1.3 * sway) * 0.004;
      },
    });
  },
});
