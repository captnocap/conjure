import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
type Dot = { at: P3; size: number; color?: string };

function rockGeometry(seed: number) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = 1 + 0.2 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.12 * Math.sin(z * 5 + seed * 2.1);
    p.setXYZ(i, x * r, y * r, z * r);
  }
  g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    form: choice('What kind of shrine is it?', {
      post: 'A gabled wooden box on a single carved post.',
      pillar: 'A whitewashed stone pillar with a niche and a little pointed roof.',
      cross: 'A tall wayside cross with a wide pent roof, the box at its heart.',
      tree: 'A box nailed to the trunk of a dead larch.',
    }),
    holds: choice('What is inside the box?', {
      madonna: 'A painted Madonna in a blue cloak with a gold halo.',
      traveller: 'A naive painting of a saint with a staff carrying a child across water.',
      photo: 'A black-and-white memorial photograph in an oval frame, with a name and dates.',
      accident: 'A folk-painted scene of the accident itself: a small figure, an avalanche, a cross.',
      empty: 'Nothing: a pale rectangle and two nail holes where a picture hung.',
    }),
    flowers: choice('What flowers are there?', {
      fresh: 'A fresh bunch of meadow flowers in a jam jar.',
      dried: 'A bunch dried brown long ago, still in its jar.',
      plastic: 'Plastic roses, sun-faded but upright.',
      planted: 'Flowers planted in the ground all around the foot.',
      none: 'None.',
    }),
    candle: noul('Is a red grave candle burning in it?'),
    left: choice('What have passers-by left?', {
      nothing: 'Nothing.',
      coins: 'Coins and small stones lined up on the ledge.',
      rosary: 'A rosary hanging from the roof.',
      climbing: 'A climbing helmet and a coil of rope at the foot.',
      toy: 'A small weathered teddy bear.',
      boots: 'A pair of worn-out walking boots, laces tied together.',
    }),
    roof: choice('What is the little roof?', {
      shingle: 'Grey split shingles.',
      copper: 'Green weathered copper.',
      tin: 'Rusty tin.',
      mossy: 'Bark and boards under a pad of moss.',
    }),
    words: choice('What does the plaque say?', {
      pray: 'BITT FÜR UNS.',
      memory: 'A cross and a year.',
      stay: 'WANDERER STEH STILL.',
      thanks: 'DANK.',
      blank: 'The words have weathered away.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const wood = s.material(new THREE.Color('#6b4a32').lerp(new THREE.Color('#8f8a80'), wear * 0.5), { roughness: 0.9 });
    const woodDark = s.material(new THREE.Color('#3f2c20').lerp(new THREE.Color('#6b665e'), wear * 0.4), { roughness: 0.95 });
    const white = s.material(new THREE.Color('#ece7da').lerp(new THREE.Color('#b9b3a4'), wear * 0.6), { roughness: 0.95 });
    const stone = s.material('#96948e', { roughness: 0.95, flatShading: true });
    const iron = s.material('#2f3033', { metalness: 0.6, roughness: 0.5 });
    const grass = s.material('#5f8e3c', { roughness: 1 });
    const roofMat = s.material({ shingle: '#8d8980', copper: '#5fa08a', tin: '#96573a', mossy: '#5c4a38' }[a.roof], { roughness: a.roof === 'copper' ? 0.5 : 0.9, metalness: a.roof === 'copper' || a.roof === 'tin' ? 0.35 : 0 });

    // The painting.
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 250;
    const c = canvas.getContext('2d')!;
    const fade = (hex: string) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#cfc6b2'), wear * 0.55).getHexString();
    if (a.holds === 'madonna') {
      c.fillStyle = fade('#f2e2b0'); c.fillRect(0, 0, 200, 250);
      c.fillStyle = fade('#e9b62a'); c.beginPath(); c.arc(100, 78, 46, 0, 7); c.fill();
      c.fillStyle = fade('#1f48b8'); c.beginPath(); c.moveTo(100, 40); c.quadraticCurveTo(10, 150, 28, 250); c.lineTo(172, 250); c.quadraticCurveTo(190, 150, 100, 40); c.fill();
      c.fillStyle = fade('#f4f1ea'); c.beginPath(); c.ellipse(100, 92, 30, 36, 0, 0, 7); c.fill();
      c.fillStyle = fade('#eec3a0'); c.beginPath(); c.ellipse(100, 96, 21, 26, 0, 0, 7); c.fill();
      c.fillStyle = fade('#c22a2a'); c.beginPath(); c.moveTo(100, 150); c.lineTo(70, 250); c.lineTo(130, 250); c.fill();
      c.fillStyle = fade('#eec3a0'); c.beginPath(); c.ellipse(100, 170, 13, 20, 0, 0, 7); c.fill();
    } else if (a.holds === 'traveller') {
      c.fillStyle = fade('#bfe0ee'); c.fillRect(0, 0, 200, 250);
      c.fillStyle = fade('#2e6fb0'); c.fillRect(0, 190, 200, 60);
      c.strokeStyle = fade('#e9f3f7'); c.lineWidth = 4; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(30 + i * 50, 215 + (i % 2) * 14, 18, Math.PI, 0); c.stroke(); }
      c.fillStyle = fade('#8a4a22'); c.beginPath(); c.moveTo(95, 80); c.lineTo(55, 200); c.lineTo(140, 200); c.fill();
      c.fillStyle = fade('#eec3a0'); c.beginPath(); c.arc(95, 66, 20, 0, 7); c.fill();
      c.fillStyle = fade('#7a5a3c'); c.beginPath(); c.arc(95, 80, 18, 0, Math.PI); c.fill();
      c.fillStyle = fade('#e9b62a'); c.beginPath(); c.arc(128, 38, 20, 0, 7); c.fill();
      c.fillStyle = fade('#eec3a0'); c.beginPath(); c.arc(128, 40, 12, 0, 7); c.fill();
      c.fillStyle = fade('#d93a2a'); c.fillRect(116, 52, 26, 30);
      c.strokeStyle = fade('#4a3220'); c.lineWidth = 7; c.beginPath(); c.moveTo(40, 20); c.lineTo(52, 240); c.stroke();
    } else if (a.holds === 'photo') {
      c.fillStyle = '#16130f'; c.fillRect(0, 0, 200, 250);
      c.fillStyle = fade('#d9cfb8'); c.beginPath(); c.ellipse(100, 100, 66, 84, 0, 0, 7); c.fill();
      c.fillStyle = '#4a443c'; c.beginPath(); c.ellipse(100, 180, 62, 60, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#8f877a'; c.beginPath(); c.ellipse(100, 92, 26, 32, 0, 0, 7); c.fill();
      c.fillStyle = '#3a342e'; c.beginPath(); c.ellipse(100, 70, 28, 16, 0, Math.PI, 0); c.fill();
      c.globalCompositeOperation = 'destination-over'; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#16130f'; c.fillRect(0, 186, 200, 64);
      c.fillStyle = '#d9cfb8'; c.font = 'bold 26px serif'; c.textAlign = 'center';
      const born = 1930 + Math.floor(random() * 50);
      c.fillText(`${born} – ${born + 19 + Math.floor(random() * 40)}`, 100, 228);
    } else if (a.holds === 'accident') {
      c.fillStyle = fade('#8fb6d8'); c.fillRect(0, 0, 200, 250);
      c.fillStyle = fade('#6d7480'); c.beginPath(); c.moveTo(0, 250); c.lineTo(60, 50); c.lineTo(110, 130); c.lineTo(150, 30); c.lineTo(200, 160); c.lineTo(200, 250); c.fill();
      c.fillStyle = fade('#f6f6f2'); c.beginPath(); c.moveTo(150, 30); c.lineTo(135, 70); c.lineTo(60, 215); c.lineTo(150, 235); c.lineTo(168, 80); c.fill();
      c.fillStyle = fade('#f6f6f2'); for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(60 + random() * 90, 200 + random() * 35, 14, 0, 7); c.fill(); }
      c.fillStyle = fade('#b8242a'); c.fillRect(100, 150, 12, 22); c.fillStyle = '#2a2420'; c.beginPath(); c.arc(106, 144, 7, 0, 7); c.fill();
      c.strokeStyle = '#2a2420'; c.lineWidth = 4; c.beginPath(); c.moveTo(100, 156); c.lineTo(84, 140); c.moveTo(112, 156); c.lineTo(128, 142); c.stroke();
      c.fillStyle = '#2a2420'; c.fillRect(26, 190, 6, 44); c.fillRect(14, 202, 30, 6);
      c.fillStyle = fade('#e9b62a'); c.beginPath(); c.arc(30, 36, 18, 0, 7); c.fill();
    } else {
      c.fillStyle = '#5b4634'; c.fillRect(0, 0, 200, 250);
      c.fillStyle = '#8a7358'; c.fillRect(34, 40, 132, 170);
      c.fillStyle = '#1f1812'; c.beginPath(); c.arc(60, 54, 4, 0, 7); c.arc(140, 54, 4, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(40,28,18,0.8)'; c.lineWidth = 8; c.strokeRect(4, 4, 192, 242);
    const pictureTex = new THREE.CanvasTexture(canvas); pictureTex.colorSpace = THREE.SRGBColorSpace;
    const picture = new THREE.MeshStandardMaterial({ map: pictureTex, roughness: 0.8, emissive: '#ffffff', emissiveMap: pictureTex, emissiveIntensity: 0.45 });

    // Supports. Each returns where the box sits: its floor height and front plane.
    const shrine = new THREE.Group();
    s.root.add(shrine);
    let target: THREE.Object3D = shrine;
    const S = <T extends THREE.Object3D>(m: T) => { target.add(m); return m; };
    let by = 1.05, bz = 0.13;
    if (a.form === 'post') {
      S(s.box([0.16, by + 0.3, 0.16], [0, (by - 0.3) / 2, 0], wood));
      for (const y of [0.35, by - 0.2]) S(s.box([0.2, 0.06, 0.2], [0, y, 0], woodDark));
      for (const x of [-1, 1]) S(s.rod([x * 0.24, by - 0.02, 0], [x * 0.07, by - 0.32, 0], 0.03, woodDark));
    } else if (a.form === 'pillar') {
      by = 1.0; bz = 0.26;
      S(s.box([0.62, 0.16, 0.62], [0, 0.08, 0], white));
      S(s.box([0.46, by - 0.1, 0.46], [0, by / 2 + 0.03, 0], white));
      S(s.box([0.96, 0.08, 0.62], [0, by - 0.05, 0.04], white));
      S(s.box([0.9, 0.95, 0.4], [0, by + 0.45, -0.2], white));
    } else if (a.form === 'cross') {
      by = 1.35; bz = 0.41;
      const top = by + 1.6, armY = by + 0.55;
      S(s.box([0.17, top + 0.3, 0.17], [0, (top - 0.3) / 2, 0], wood));
      S(s.box([1.8, 0.15, 0.14], [0, armY, 0.0], wood));
      for (const x of [-1, 1]) {
        const board = S(s.box([1.42, 0.04, 0.5], [x * 0.46, top - 0.5, 0.04], roofMat));
        board.rotation.z = -x * 0.84;
      }
    } else {
      by = 1.2; bz = 0.52;
      const bark = s.material(new THREE.Color('#5a4a3e').lerp(new THREE.Color('#9a968c'), 0.3 + wear * 0.4), { roughness: 1 });
      S(s.cylinder(0.14, 0.24, 2.7, [0, 1.35, 0], bark, 9));
      S(s.cylinder(0.02, 0.14, 0.5, [0.03, 2.9, 0.02], bark, 7)).rotation.z = 0.2;
      for (const [y, ang, len] of [[1.9, 0.9, 0.9], [2.3, -1.1, 0.7], [1.5, 2.6, 0.5]] as const) S(s.rod([0, y, 0], [Math.cos(ang) * len, y + len * 0.5, Math.sin(ang) * len * 0.4 - 0.1], 0.05, bark, 0.012));
      for (let i = 0; i < 4; i++) { const ang = i * 1.6 + random(); S(s.rod([Math.cos(ang) * 0.18, 0.15, Math.sin(ang) * 0.18], [Math.cos(ang) * 0.5, -0.03, Math.sin(ang) * 0.5], 0.07, bark, 0.03)); }
    }

    // The box itself, built at the origin of its own group and enlarged so the picture reads.
    const box = new THREE.Group(); box.position.set(0, by, bz); box.scale.setScalar(1.45); shrine.add(box);
    target = box; by = 0; bz = 0;
    S(s.box([0.5, 0.6, 0.03], [0, by + 0.3, bz - 0.2], woodDark));
    for (const x of [-1, 1]) S(s.box([0.03, 0.6, 0.22], [x * 0.25, by + 0.3, bz - 0.1], wood));
    S(s.box([0.62, 0.04, 0.36], [0, by, bz - 0.05], wood));
    const diamond = S(s.box([0.36, 0.36, 0.03], [0, by + 0.6, bz - 0.2], woodDark)); diamond.rotation.z = Math.PI / 4;
    S(s.mesh(new THREE.PlaneGeometry(0.4, 0.5), picture, [0, by + 0.31, bz - 0.182]));
    const apexY = by + 0.86;
    if (a.form !== 'cross') {
      for (const x of [-1, 1]) {
        const slab = S(s.box([0.56, 0.035, 0.46], [x * 0.2, apexY - 0.17, bz - 0.07], roofMat));
        slab.rotation.z = -x * 0.7;
      }
      S(s.box([0.05, 0.05, 0.48], [0, apexY + 0.01, bz - 0.07], woodDark));
      if (a.roof === 'mossy') { const pts: Dot[] = []; for (let i = 0; i < 26; i++) { const x = (random() - 0.5) * 0.7; pts.push({ at: [x, apexY + 0.03 - Math.abs(x) * 0.84, bz - 0.07 + (random() - 0.5) * 0.4], size: 0.035 + random() * 0.03, color: random() < 0.5 ? '#6f8a3a' : '#4f6e2f' }); } S(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), pts)); }
      S(s.box([0.025, 0.24, 0.025], [0, apexY + 0.14, bz - 0.07], iron));
      S(s.box([0.14, 0.025, 0.025], [0, apexY + 0.18, bz - 0.07], iron));
    }
    // Plaque.
    if (a.words !== 'blank') {
      const text = { pray: 'BITT FÜR UNS', memory: `† ${1890 + Math.floor(random() * 120)}`, stay: 'WANDERER STEH STILL', thanks: 'DANK' }[a.words];
      S(s.label(text, 0.46, 0.13, [0, by - 0.12, bz + 0.0], '#f1e6c8', wear > 0.6 ? '#5a4a3c' : '#3a2418')).rotation.z = (random() - 0.5) * 0.06;
    } else S(s.box([0.4, 0.12, 0.015], [0, by - 0.12, bz - 0.01], woodDark));

    // Candle on the ledge.
    const ledgeZ = bz + 0.06, ledgeY = by + 0.02;
    const glow = a.candle ? mix(1.6, 0.7, Math.abs(mood.daylight - 0.5) < 0.25 ? 1 : 0) : 0;
    S(s.cylinder(0.04, 0.035, 0.12, [0.17, ledgeY + 0.06, ledgeZ], s.material('#c0181f', { roughness: 0.3, emissive: '#ff3a14', emissiveIntensity: glow })));
    S(s.cylinder(0.03, 0.042, 0.03, [0.17, ledgeY + 0.135, ledgeZ], s.material('#c9a03a', { metalness: 0.8, roughness: 0.3 })));
    if (a.candle) {
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffb24a', transparent: true, opacity: 0.16, depthWrite: false }));
      halo.position.set(0.17, ledgeY + 0.08, ledgeZ); target.add(halo);
    }

    // Flowers.
    const bloomCols = a.flowers === 'dried' ? ['#7b6247', '#93805c', '#5e4a36'] : a.flowers === 'plastic' ? ['#d99aa6', '#e6c9c2', '#c98f9a'] : mood.cheer > 0.3 ? ['#f4d13a', '#ffffff', '#2c4fd6', '#d85aa0', '#e8312f'] : ['#d9d6c2', '#8a86c2', '#c9b85a'];
    const blooms: Dot[] = [];
    const bunch = (parent: THREE.Object3D, at: P3, n: number, h: number, droop: number) => {
      const stem = a.flowers === 'dried' ? s.material('#6b5a3c') : grass;
      for (let i = 0; i < n; i++) {
        const ang = random() * 6.3, lean = 0.3 + random() * 0.6;
        const tip: P3 = [at[0] + Math.cos(ang) * h * lean * 0.5, at[1] + h * (1 - droop * lean), at[2] + Math.sin(ang) * h * lean * 0.5];
        const rod = s.rod(at, tip, 0.006, stem); parent.add(rod);
        blooms.push({ at: tip, size: h * (0.07 + random() * 0.06), color: bloomCols[Math.floor(random() * bloomCols.length)] });
      }
    };
    if (a.flowers !== 'none' && a.flowers !== 'planted') {
      S(s.cylinder(0.04, 0.035, 0.1, [-0.17, ledgeY + 0.05, ledgeZ], s.material('#bcd3d6', { roughness: 0.1, metalness: 0.3 }), 10));
      bunch(target, [-0.17, ledgeY + 0.08, ledgeZ], 7 + Math.round(mood.density * 8), 0.32, a.flowers === 'dried' ? 0.7 : 0.1);
    }
    if (blooms.length) S(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms));

    // Offerings on the ledge or hung from the box.
    if (a.left === 'coins') {
      const gold = s.material('#d0a23a', { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 6; i++) S(s.cylinder(0.018, 0.018, 0.006, [-0.07 + i * 0.03, ledgeY + 0.004 + (i % 2) * 0.006, ledgeZ + 0.06], i % 3 ? gold : s.material('#b8bcc0', { metalness: 0.8 }), 10));
      for (let i = 0; i < 4; i++) S(s.mesh(rockGeometry(i * 3), stone, [-0.05 + i * 0.045, ledgeY + 0.02, ledgeZ - 0.02])).scale.set(0.022, 0.016, 0.02);
    } else if (a.left === 'rosary') {
      const bead = s.material('#2a1c14', { roughness: 0.4 });
      S(s.tube([[0.27, by + 0.56, bz + 0.03], [0.33, by + 0.3, bz + 0.05], [0.29, by + 0.12, bz + 0.05], [0.25, by + 0.3, bz + 0.05], [0.27, by + 0.56, bz + 0.03]], 0.008, bead));
      S(s.box([0.012, 0.09, 0.008], [0.29, by + 0.05, bz + 0.05], s.material('#c9cdd0', { metalness: 0.8 })));
      S(s.box([0.05, 0.012, 0.008], [0.29, by + 0.07, bz + 0.05], s.material('#c9cdd0', { metalness: 0.8 })));
    }

    // Lean with age, pivoting at the ground.
    target = shrine;
    shrine.rotation.z = (random() - 0.5) * 0.03 + wear * wear * 0.1 * (random() < 0.5 ? -1 : 1);
    shrine.rotation.x = -wear * 0.04;

    // Foot: packing stones, grass, things left on the ground.
    const rocks = [0, 1, 2].map((i) => rockGeometry(random() * 20 + i * 4));
    const footR = a.form === 'pillar' ? 0.42 : a.form === 'tree' ? 0.5 : 0.24;
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05 + random() * 0.5, r = footR + random() * 0.1, h = 0.07 + random() * 0.09;
      const m = s.mesh(rocks[i % 3], stone, [Math.cos(ang) * r, h * 0.4, Math.sin(ang) * r]);
      m.scale.set(0.12 + random() * 0.08, h, 0.11 + random() * 0.07); m.rotation.y = random() * 6;
    }
    const tufts: Dot[] = [];
    for (let i = 0; i < Math.round(mix(10, 40, Math.max(mood.density, wear))); i++) { const ang = random() * 6.3, r = footR + 0.1 + random() * 0.45; tufts.push({ at: [Math.cos(ang) * r, 0.06, Math.sin(ang) * r], size: 0.5 + random() * 0.8 }); }
    s.scatter(new THREE.ConeGeometry(0.025, 0.14, 4), grass, tufts);
    if (a.flowers === 'planted') {
      const ground: Dot[] = [];
      for (let i = 0; i < 5 + Math.round(mood.density * 5); i++) {
        const ang = -0.4 + i * 0.75 + random() * 0.3, r = footR + 0.25 + random() * 0.2;
        const start = blooms.length; bunch(s.root, [Math.cos(ang) * r, 0.02, Math.sin(ang) * r], 5, 0.26, 0.15);
        ground.push(...blooms.slice(start));
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), ground);
    }
    const gx = footR + 0.28, gz = 0.38;
    if (a.left === 'climbing') {
      s.ball([0.13, 0.1, 0.15], [gx, 0.09, gz], s.material(mood.cheer > 0.4 ? '#e3542a' : '#d8d6cf', { roughness: 0.4 }), 14);
      s.box([0.2, 0.02, 0.22], [gx, 0.02, gz], iron);
      const rope = s.material(mood.cheer > 0.4 ? '#3fa0c2' : '#7f8a80', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) s.ring(0.15 - i * 0.008, 0.016, [-gx + 0.02, 0.02 + i * 0.03, gz + 0.02], rope).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.1;
    } else if (a.left === 'toy') {
      const plush = s.material(new THREE.Color('#b98a52').lerp(new THREE.Color('#8f8a80'), wear * 0.6), { roughness: 1 });
      s.ball([0.07, 0.08, 0.06], [gx, 0.09, gz], plush, 10); s.ball([0.055, 0.05, 0.05], [gx, 0.2, gz + 0.01], plush, 10);
      for (const x of [-1, 1]) { s.ball([0.02, 0.02, 0.012], [gx + x * 0.045, 0.245, gz], plush, 6); s.ball([0.025, 0.03, 0.045], [gx + x * 0.055, 0.035, gz + 0.06], plush, 6); s.ball([0.022, 0.04, 0.022], [gx + x * 0.085, 0.12, gz + 0.02], plush, 6); }
      s.ball([0.022, 0.018, 0.02], [gx, 0.19, gz + 0.055], s.material('#e6d6b2'), 6);
    } else if (a.left === 'boots') {
      const hide = s.material('#5a3d2a', { roughness: 0.8 });
      for (const x of [-1, 1]) {
        s.box([0.1, 0.03, 0.27], [gx + x * 0.08, 0.015, gz], iron).rotation.y = x * 0.25;
        s.ball([0.05, 0.05, 0.13], [gx + x * 0.08, 0.06, gz + 0.02], hide, 10).rotation.y = x * 0.25;
        s.cylinder(0.05, 0.048, 0.16, [gx + x * 0.085, 0.13, gz - 0.07], hide, 10).rotation.z = x * -0.2;
      }
      s.tube([[gx - 0.08, 0.2, gz - 0.06], [gx, 0.14, gz + 0.02], [gx + 0.08, 0.2, gz - 0.06]], 0.006, s.material('#d9c9a0'));
    }
    return s.finish({ footprint: 0.75 });
  },
});
