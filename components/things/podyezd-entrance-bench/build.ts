import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

function canvasTexture(width: number, height: number, paint: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    door: choice('What colour is the steel door?', {
      oxide: 'Red-brown oxide primer, the default of every housing office.',
      green: 'Thick dark green gloss.',
      blue: 'Pale blue, repainted every spring.',
      grey: 'Bare grey steel with weld seams showing.',
      black: 'Black with a hammered finish, newly fitted.',
    }),
    doorState: choice('How has the door been left?', {
      shut: 'Shut tight, the magnet lock holding.',
      ajar: 'Ajar, a slice of the dim yellow stairwell showing.',
      propped: 'Propped wide open with a brick, someone is moving furniture.',
    }),
    notices: choice('What is pasted on and around the door?', {
      none: 'Nothing, scraped clean.',
      official: 'One typed notice from the housing office about the hot water.',
      adverts: 'A dozen handwritten adverts with tear-off phone-number strips.',
      layers: 'Years of torn paper in layers, with a missing-cat poster on top.',
    }),
    bench: choice('What kind of bench stands beside the door?', {
      slatted: 'A slatted wooden bench with a back, on cast-concrete legs.',
      plank: 'A backless plank on two concrete blocks.',
      striped: 'A bench with slats painted in alternating bright colours.',
      pipe: 'A welded pipe frame with three boards.',
    }),
    sitting: choice('What is on the bench?', {
      empty: 'Nothing: the grandmothers have gone in.',
      bag: 'A cloth shopping bag with a loaf and a bottle of kefir, set down for a breather.',
      cat: 'A cat, loafed and watching.',
      husks: 'A newspaper cone of sunflower seeds and a litter of husks.',
      cushions: 'Two flat cushions and some knitting, the grandmothers will be back.',
      bottle: 'An empty bottle and a faceted glass from last night.',
    }),
    canopy: choice('What shelters the door?', {
      slab: 'A flat concrete slab resting on a side wall.',
      sheet: 'A sloped corrugated sheet on welded pipe brackets.',
      none: 'Nothing, the door is flat in the wall.',
    }),
    wall: choice('What is the wall made of?', {
      panel: 'Grey prefab concrete panels with tarred seams.',
      tile: 'Panels faced in tiny pale-blue mosaic tile.',
      brick: 'White silicate brick.',
      painted: 'Panels with the lower half painted institutional green.',
    }),
    season: choice('What season is it at the door?', {
      winter: 'Winter, snow shovelled to the sides.',
      thaw: 'The thaw, wet concrete and dirty slush.',
      summer: 'Summer, dust, and marigolds in a tyre.',
      autumn: 'Autumn, yellow poplar leaves blown into the corner.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = mood.daylight > 0.72 || mood.daylight < 0.18;
    const glow = dusk ? 1 : mix(0.15, 0.5, 1 - mood.cheer * 0.5);
    const warm = new THREE.Color('#ffd98a').lerp(new THREE.Color('#ffb060'), mood.warmth * 0.6);
    const concrete = s.material('#9c9a93', { roughness: 0.95 });
    const snowMat = new THREE.MeshStandardMaterial({ color: '#eef1f5', roughness: 0.95 });
    const W = 4.8, H = 3.5, wz = -0.75;

    // Wall section with seams, stains and whatever has been written on it.
    const base = { panel: '#a9a79e', tile: '#a9c3cf', brick: '#d8d5cb', painted: '#aaa89f' }[a.wall];
    const wallTexture = canvasTexture(768, 560, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 768, 560);
      if (a.wall === 'tile') { for (let y = 0; y < 560; y += 8) for (let x = 0; x < 768; x += 8) { g.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,70,90'},${random() * 0.18})`; g.fillRect(x, y, 7, 7); } }
      if (a.wall === 'brick') { g.strokeStyle = 'rgba(90,85,80,0.5)'; g.lineWidth = 1.5; for (let row = 0; row < 40; row++) { g.beginPath(); g.moveTo(0, row * 14); g.lineTo(768, row * 14); g.stroke(); for (let x = (row % 2) * 20; x < 768; x += 40) { g.beginPath(); g.moveTo(x, row * 14); g.lineTo(x, row * 14 + 14); g.stroke(); } } }
      if (a.wall === 'painted') { g.fillStyle = '#56775f'; g.fillRect(0, 300, 768, 260); g.fillStyle = '#3c5745'; g.fillRect(0, 296, 768, 6); }
      if (a.wall !== 'brick') { g.strokeStyle = '#3a3936'; g.lineWidth = 5; for (const x of [250, 630]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 560); g.stroke(); } g.beginPath(); g.moveTo(0, 96); g.lineTo(768, 96); g.stroke(); }
      for (let i = 0; i < 6 + mood.wear * 26; i++) { const x = random() * 768, y = random() * 300, h = 60 + random() * 240; const grad = g.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, `rgba(60,50,40,${0.1 + mood.wear * 0.25})`); grad.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = grad; g.fillRect(x, y, 6 + random() * 26, h); }
      g.fillStyle = `rgba(70,62,52,${0.15 + mood.wear * 0.3})`; g.fillRect(0, 520, 768, 40);
      if (mood.wear > 0.45) {
        const tags = ['ЦОЙ ЖИВ', 'СПАРТАК', 'МАША + ДИМА', 'ДМБ-89', 'КИНО', 'ЗДЕСЬ БЫЛ ВАСЯ'];
        for (let i = 0; i < 1 + Math.floor(mood.wear * 2.5); i++) {
          g.save(); g.translate(430 + random() * 180, 330 + random() * 150); g.rotate((random() - 0.5) * 0.3);
          g.font = `bold ${26 + random() * 16}px sans-serif`; g.fillStyle = ['#1d1d22', '#8c1d1d', '#1f3f8a', '#f2efe6'][Math.floor(random() * 4)];
          g.fillText(tags[Math.floor(random() * tags.length)], 0, 0); g.restore();
        }
      }
    });
    s.box([W, H, 0.3], [0, H / 2, wz - 0.15], s.material(base, { roughness: 0.95 }));
    s.mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.95 }), [0, H / 2, wz + 0.002]);
    s.box([W, 0.35, 0.36], [0, 0.175, wz - 0.14], s.material('#6f6d68', { roughness: 1 }));

    // A kitchen window over the bench: somebody is always looking out.
    const wx = 1.25, wy = 2.3;
    const frameMat = s.material(mood.wear > 0.6 ? '#b9b4a4' : '#eeeade');
    s.box([1.3, 1.15, 0.08], [wx, wy, wz + 0.02], frameMat);
    const paneLit = random() < mix(0.35, 0.9, mood.cheer) || dusk;
    const curtain = canvasTexture(128, 128, (g) => {
      g.fillStyle = paneLit ? '#f2c66a' : '#3d4a55'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = paneLit ? 'rgba(255,250,235,0.75)' : 'rgba(210,215,215,0.45)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(128, 30); g.quadraticCurveTo(64, 70, 0, 30); g.fill();
      g.fillRect(0, 0, 22, 128); g.fillRect(106, 0, 22, 128);
      g.fillStyle = '#4d6b3a'; g.fillRect(52, 92, 26, 36); g.fillStyle = '#b5522f'; g.fillRect(50, 112, 30, 16);
    });
    for (const dx of [-0.31, 0.31]) s.mesh(new THREE.PlaneGeometry(0.54, 0.98), new THREE.MeshStandardMaterial({ map: curtain, emissive: paneLit ? warm : new THREE.Color('#000'), emissiveMap: curtain, emissiveIntensity: paneLit ? mix(0.4, 0.95, glow) : 0, roughness: 0.3 }), [wx + dx, wy, wz + 0.065]);
    s.box([1.42, 0.05, 0.16], [wx, wy - 0.6, wz + 0.07], concrete);

    // Stoop, door frame and door.
    const dx = -0.95, doorW = 1.0, doorH = 2.05, stoopH = 0.3;
    s.box([2.1, stoopH, 1.25], [dx, stoopH / 2, wz + 0.625], concrete);
    s.box([2.4, stoopH / 2, 1.55], [dx, stoopH / 4, wz + 0.775], concrete);
    s.box([1.9, 0.012, 0.5], [dx, stoopH + 0.006, wz + 0.9], s.material('#3b3a37', { roughness: 1 }));
    const doorColour = new THREE.Color({ oxide: '#84402e', green: '#2e5a41', blue: '#7fa6c4', grey: '#8a8f92', black: '#2a2b2e' }[a.door]).lerp(new THREE.Color('#77706a'), mood.wear * 0.25);
    const doorMat = s.material(doorColour, { metalness: 0.35, roughness: 0.55 });
    s.box([doorW + 0.5, doorH + 0.22, 0.1], [dx + 0.17, stoopH + (doorH + 0.22) / 2, wz + 0.05], doorMat);
    s.box([doorW, doorH, 0.06], [dx, stoopH + doorH / 2, wz + 0.09], new THREE.MeshStandardMaterial({ color: '#17140f', emissive: warm, emissiveIntensity: a.doorState === 'shut' ? 0 : mix(0.08, 0.25, glow), roughness: 1 }));
    const leaf = new THREE.Group();
    leaf.position.set(dx - doorW / 2, stoopH, wz + 0.13);
    leaf.rotation.y = { shut: 0, ajar: -0.55 - random() * 0.2, propped: -1.75 }[a.doorState];
    s.root.add(leaf);
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = m.receiveShadow = true; leaf.add(m); return m; };
    part(new THREE.BoxGeometry(doorW, doorH, 0.05), doorMat, [doorW / 2, doorH / 2, 0]);
    const dark = s.material(doorColour.clone().multiplyScalar(0.7), { metalness: 0.4 });
    for (const y of [0.55, 1.5]) part(new THREE.BoxGeometry(doorW - 0.16, 0.7, 0.012), dark, [doorW / 2, y, 0.03]);
    part(new THREE.BoxGeometry(0.035, 0.42, 0.06), s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), [doorW - 0.1, 1.05, 0.07]);
    part(new THREE.BoxGeometry(0.3, 0.06, 0.07), s.material('#55595c', { metalness: 0.6 }), [0.2, doorH - 0.06, 0.06]);
    if (a.doorState === 'propped') { const brick = s.box([0.25, 0.09, 0.12], [dx - doorW / 2 - 0.02, stoopH + 0.045, wz + 0.75], s.material('#a3492f')); brick.rotation.y = 0.4; }
    // Intercom panel on the fixed leaf, with a tiny red eye.
    const ix = dx + doorW / 2 + 0.17, iy = stoopH + 1.3;
    s.box([0.16, 0.3, 0.03], [ix, iy, wz + 0.115], s.material('#b9bdc0', { metalness: 0.7, roughness: 0.35 }));
    const keys: { at: P3; size: number }[] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push({ at: [ix - 0.04 + c * 0.04, iy - 0.1 + r * 0.045, wz + 0.132], size: 0.013 });
    s.scatter(new THREE.BoxGeometry(1, 1, 0.5), s.material('#2a2c2f'), keys);
    s.box([0.1, 0.035, 0.01], [ix, iy + 0.11, wz + 0.132], new THREE.MeshStandardMaterial({ color: '#501010', emissive: '#ff2a1a', emissiveIntensity: 0.9 }));
    // Entrance plaque and lamp.
    const entrance = 1 + Math.floor(random() * 6), firstFlat = (entrance - 1) * 20 + 1;
    s.label(`ПОДЪЕЗД ${entrance}`, 1.05, 0.22, [dx, stoopH + doorH + 0.36, wz + 0.012], '#f2efe4', '#28457a');
    s.label(`кв. ${firstFlat}–${firstFlat + 19}`, 0.5, 0.12, [dx, stoopH + doorH + 0.2, wz + 0.112], '#f2efe4', '#28457a');
    const canopyY = stoopH + doorH + 0.55;
    const lampAt: P3 = a.canopy === 'none' ? [dx + 0.9, canopyY - 0.1, wz + 0.12] : [dx + 0.15, canopyY - 0.1, wz + 0.5];
    s.cylinder(0.07, 0.09, 0.05, [lampAt[0], lampAt[1] + 0.03, lampAt[2]], s.material('#3a3d40', { metalness: 0.5 }), 12);
    s.ball([0.085, 0.1, 0.085], [lampAt[0], lampAt[1] - 0.06, lampAt[2]], new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: warm, emissiveIntensity: dusk ? 1.6 : mix(0, 0.5, 1 - mood.cheer), roughness: 0.4 }), 12);

    // Canopy.
    if (a.canopy === 'slab') {
      s.box([2.3, 0.14, 1.45], [dx, canopyY + 0.07, wz + 0.725], concrete);
      s.box([0.14, canopyY, 1.2], [dx - 1.0, canopyY / 2, wz + 0.6], concrete);
      const holes: { at: P3; size: number }[] = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) holes.push({ at: [dx - 1.0, 0.7 + r * 0.34, wz + 0.45 + c * 0.4], size: 0.11 });
      s.scatter(new THREE.BoxGeometry(1.5, 1, 1), s.material('#4a4944'), holes);
      if (a.season === 'winter') s.box([2.2, 0.1, 1.35], [dx, canopyY + 0.19, wz + 0.7], snowMat);
    } else if (a.canopy === 'sheet') {
      const sheet = new THREE.Group(); sheet.position.set(dx, canopyY + 0.1, wz + 0.02); sheet.rotation.x = 0.26; s.root.add(sheet);
      const tin = s.material(a.season === 'winter' ? '#e4e8ea' : '#8d9496', { metalness: a.season === 'winter' ? 0 : 0.6, roughness: 0.5 });
      for (let i = 0; i < 14; i++) { const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8, 1, false, 0, Math.PI), tin); rib.rotation.x = Math.PI / 2; rib.rotation.z = Math.PI / 2; rib.rotation.order = 'ZXY'; rib.position.set(-1.04 + i * 0.16, 0, 0.7); rib.castShadow = true; sheet.add(rib); }
      for (const x of [-1.0, 1.0]) { s.rod([dx + x, canopyY - 0.75, wz + 0.02], [dx + x, canopyY - 0.27, wz + 1.38], 0.022, doorMat); s.rod([dx + x, canopyY + 0.08, wz + 0.02], [dx + x, canopyY - 0.27, wz + 1.38], 0.022, doorMat); }
    }

    // Notices: paper with ruled lines and tear-off strips.
    if (a.notices !== 'none') {
      const paperTexture = canvasTexture(96, 128, (g) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 96, 128);
        g.fillStyle = '#3b3f52'; g.fillRect(10, 10, 60, 9);
        for (let y = 28; y < 84; y += 9) g.fillRect(10, y, 40 + random() * 36, 3);
        g.fillStyle = '#ffffff'; g.fillRect(0, 96, 96, 32);
        g.strokeStyle = '#555'; g.lineWidth = 1.5; for (let x = 0; x <= 96; x += 12) { g.beginPath(); g.moveTo(x, 94); g.lineTo(x, 128); g.stroke(); }
        g.fillStyle = '#3b3f52'; for (let x = 4; x < 96; x += 12) g.fillRect(x, 100, 3, 22);
      });
      const tints = ['#f4f1e6', '#e9e2c6', '#f3d6d0', '#d6e6ee', '#f1e9a8', '#d9ecd0'];
      const count = { official: 1, adverts: 10 + Math.floor(random() * 4), layers: 22 + Math.floor(mood.density * 10) }[a.notices];
      for (let i = 0; i < count; i++) {
        const big = a.notices === 'official';
        const w = big ? 0.3 : 0.11 + random() * 0.1, h = w * 1.35;
        const onWall = !big && random() < 0.55;
        const px = onWall ? dx + doorW / 2 + 0.55 + random() * 0.55 : dx + (random() - 0.5) * (doorW - 0.3);
        const py = stoopH + (big ? 1.5 : 0.95 + random() * 0.85);
        const note = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: paperTexture, color: big ? '#f6f3ea' : tints[Math.floor(random() * tints.length)], roughness: 1 }));
        note.rotation.z = (random() - 0.5) * (big ? 0.06 : 0.4);
        if (onWall || a.doorState === 'shut') { note.position.set(px, py, (onWall ? wz + 0.006 : wz + 0.16) + i * 0.0006); s.root.add(note); }
        else { note.position.set(px - dx + doorW / 2, py - stoopH, 0.04 + i * 0.0006); leaf.add(note); }
      }
      if (a.notices === 'layers') {
        const poster = canvasTexture(128, 160, (g) => {
          g.fillStyle = '#f4f0e2'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#b3261f'; g.font = 'bold 21px sans-serif'; g.textAlign = 'center'; g.fillText('ПРОПАЛ КОТ', 64, 24);
          g.fillStyle = '#33302c'; g.beginPath(); g.ellipse(64, 86, 30, 26, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(38, 76); g.lineTo(42, 46); g.lineTo(58, 64); g.fill(); g.beginPath(); g.moveTo(90, 76); g.lineTo(86, 46); g.lineTo(70, 64); g.fill();
          g.fillStyle = '#d9c53a'; g.beginPath(); g.arc(53, 82, 5, 0, 7); g.arc(75, 82, 5, 0, 7); g.fill();
          g.fillStyle = '#3b3f52'; g.fillRect(16, 126, 96, 4); g.fillRect(28, 138, 72, 4);
        });
        s.mesh(new THREE.PlaneGeometry(0.3, 0.375), new THREE.MeshStandardMaterial({ map: poster, roughness: 1 }), [dx + doorW / 2 + 0.8, stoopH + 1.55, wz + 0.03]).rotation.z = -0.05;
      }
    }

    // The bench.
    const bx = 1.25, bz = wz + 0.55, seatY = 0.45, bw = 1.7;
    const stripe = ['#c9302b', '#e0b22a', '#2f62ad', '#3f8a4a', '#e9e2cf'];
    const timber = (i: number) => a.bench === 'striped' ? s.material(stripe[i % stripe.length]) : s.material(new THREE.Color('#8c6a43').lerp(new THREE.Color(a.bench === 'slatted' ? '#5a7d5c' : '#8c6a43'), 0.6).lerp(new THREE.Color('#8f8a80'), mood.wear * 0.5));
    if (a.bench === 'plank') {
      s.box([bw, 0.06, 0.34], [bx, seatY, bz], timber(0));
      for (const x of [-0.6, 0.6]) s.box([0.2, seatY - 0.03, 0.34], [bx + x, (seatY - 0.03) / 2, bz], concrete);
    } else {
      const slats = a.bench === 'pipe' ? 3 : 5;
      for (let i = 0; i < slats; i++) s.box([bw, 0.035, 0.42 / slats - 0.015], [bx, seatY, bz - 0.19 + (i + 0.5) * 0.42 / slats], timber(i)).rotation.z = (random() - 0.5) * mood.wear * 0.03;
      if (a.bench === 'pipe') {
        const tubeMat = s.material('#3c5f8a', { metalness: 0.3 });
        for (const x of [-0.7, 0.7]) { s.tube([[bx + x, 0, bz + 0.2], [bx + x, seatY - 0.03, bz + 0.2], [bx + x, seatY - 0.03, bz - 0.2], [bx + x, 0, bz - 0.2]], 0.02, tubeMat); }
      } else {
        for (const x of [-0.65, 0.65]) { s.box([0.12, seatY - 0.02, 0.44], [bx + x, (seatY - 0.02) / 2, bz], concrete); s.box([0.1, 0.5, 0.08], [bx + x, seatY + 0.23, bz - 0.24], concrete).rotation.x = -0.15; }
        for (let i = 0; i < 3; i++) s.box([bw, 0.1, 0.03], [bx, seatY + 0.2 + i * 0.14, bz - 0.21 - i * 0.02], timber(i + 2));
      }
    }
    const top = seatY + 0.02;
    if (a.sitting === 'bag') {
      const cloth = s.material(['#b7a57c', '#5a6f8f', '#8a4a3c'][Math.floor(random() * 3)], { roughness: 1 });
      const sx = bx - 0.3 + random() * 0.5;
      s.box([0.36, 0.3, 0.18], [sx, top + 0.15, bz], cloth).rotation.z = 0.05;
      for (const z of [-0.07, 0.07]) s.tube([[sx - 0.1, top + 0.3, bz + z], [sx, top + 0.46, bz + z], [sx + 0.1, top + 0.3, bz + z]], 0.008, cloth);
      const loaf = s.cylinder(0.05, 0.05, 0.3, [sx - 0.08, top + 0.33, bz], s.material('#b97a35'), 10); loaf.rotation.z = 0.5;
      s.cylinder(0.03, 0.04, 0.24, [sx + 0.1, top + 0.3, bz + 0.02], s.material('#f1f2ee', { roughness: 0.2 }), 10);
      s.cylinder(0.032, 0.032, 0.02, [sx + 0.1, top + 0.43, bz + 0.02], s.material('#3f9a54', { metalness: 0.6 }), 10);
    } else if (a.sitting === 'cat') {
      const fur = s.material(['#d08a3c', '#2b2a2c', '#8a8a86', '#e9e4d8'][Math.floor(random() * 4)], { roughness: 1 });
      const cx = bx - 0.35 + random() * 0.7;
      s.ball([0.2, 0.12, 0.13], [cx, top + 0.11, bz], fur, 14);
      s.ball([0.085, 0.08, 0.085], [cx + 0.19, top + 0.2, bz + 0.03], fur, 12);
      for (const z of [-0.035, 0.085]) { const ear = s.mesh(new THREE.ConeGeometry(0.03, 0.06, 4), fur, [cx + 0.19, top + 0.285, bz + z]); ear.rotation.y = 0.8; }
      s.tube([[cx - 0.18, top + 0.06, bz], [cx - 0.26, top + 0.04, bz + 0.1], [cx - 0.12, top + 0.03, bz + 0.17], [cx + 0.04, top + 0.03, bz + 0.15]], 0.02, fur);
      for (const z of [0.0, 0.06]) s.ball([0.012, 0.014, 0.012], [cx + 0.265, top + 0.21, bz + z], new THREE.MeshStandardMaterial({ color: '#d7c63a', emissive: '#d7c63a', emissiveIntensity: 0.5 }), 6);
    } else if (a.sitting === 'husks') {
      const cone = s.mesh(new THREE.ConeGeometry(0.07, 0.2, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#ddd8c8', side: THREE.DoubleSide, roughness: 1 }), [bx + 0.2, top + 0.06, bz]);
      cone.rotation.z = Math.PI / 2 + 0.3;
      const husks: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 110 + mood.density * 120; i++) {
        const onGround = random() < 0.6;
        husks.push({ at: onGround ? [bx - 0.5 + random() * 1.1, 0.01, bz + 0.25 + random() * 0.6] : [bx - 0.4 + random() * 0.9, top + 0.005, bz - 0.15 + random() * 0.32], size: 0.012 + random() * 0.01, color: random() < 0.75 ? '#1f1d1b' : '#d9d5c8' });
      }
      const g = new THREE.SphereGeometry(1, 5, 4); g.scale(1.6, 0.4, 0.8);
      s.scatter(g, new THREE.MeshStandardMaterial({ roughness: 1 }), husks);
    } else if (a.sitting === 'cushions') {
      for (const [x, c] of [[-0.42, '#a3423a'], [0.15, '#4c6a8c']] as const) s.box([0.38, 0.06, 0.34], [bx + x, top + 0.03, bz], s.material(c, { roughness: 1 })).rotation.y = (random() - 0.5) * 0.3;
      s.ball([0.08, 0.08, 0.08], [bx + 0.55, top + 0.08, bz + 0.03], s.material('#c9502f', { roughness: 1 }), 10);
      s.rod([bx + 0.45, top + 0.1, bz - 0.08], [bx + 0.7, top + 0.14, bz + 0.12], 0.005, s.material('#c9cdd0', { metalness: 0.8 }));
      s.rod([bx + 0.48, top + 0.14, bz + 0.1], [bx + 0.68, top + 0.1, bz - 0.06], 0.005, s.material('#c9cdd0', { metalness: 0.8 }));
    } else if (a.sitting === 'bottle') {
      const glass = new THREE.MeshStandardMaterial({ color: '#3d6b45', roughness: 0.15, metalness: 0.2 });
      const sx = bx + 0.3;
      const bottle = s.lathe([[0, 0], [0.036, 0], [0.036, 0.16], [0.014, 0.23], [0.014, 0.29], [0, 0.29]], glass, [sx, top, bz]);
      if (random() < 0.5) { bottle.rotation.z = Math.PI / 2; bottle.position.y = top + 0.036; }
      s.cylinder(0.035, 0.028, 0.09, [sx - 0.25, top + 0.045, bz + 0.05], new THREE.MeshStandardMaterial({ color: '#dfe9ea', roughness: 0.1, metalness: 0.3 }), 10);
    }

    // Rubbish urn between door and bench, and the season on the ground.
    s.cylinder(0.17, 0.13, 0.42, [0.2, 0.21, bz + 0.05], s.material('#5b6a5c', { metalness: 0.3 }), 10);
    const groundColour = { winter: '#e4e8eb', thaw: '#77726a', summer: '#a59c88', autumn: '#857d6c' }[a.season];
    s.box([W + 0.4, 0.06, 2.6], [0, -0.03, wz + 1.05], new THREE.MeshStandardMaterial({ color: groundColour, roughness: 1 }));
    if (a.season === 'winter') {
      for (const [x, z, r] of [[-2.25, 0.2, 0.55], [0.45, 0.75, 0.4], [2.25, 0.5, 0.5], [0.3, -0.4, 0.3]] as const) s.ball([r * (0.9 + random() * 0.3), r * 0.5, r * 0.8], [x, 0, z], snowMat, 12);
      s.box([W, 0.07, 0.12], [0, H + 0.03, wz - 0.1], snowMat);
      s.box([1.42, 0.05, 0.14], [wx, wy - 0.56, wz + 0.08], snowMat);
      if (a.sitting === 'empty') s.box([bw * 0.96, 0.05, 0.36], [bx, top + 0.02, bz], snowMat);
    } else if (a.season === 'thaw') {
      for (let i = 0; i < 4; i++) s.cylinder(0.2 + random() * 0.2, 0.2, 0.012, [-2 + random() * 4, 0.004, 0.5 + random() * 0.8], new THREE.MeshStandardMaterial({ color: '#59616a', roughness: 0.08, metalness: 0.5 }), 14).scale.z = 0.6;
      for (const [x, z] of [[-2.2, 0.0], [2.2, 0.3]] as const) s.ball([0.4, 0.14, 0.3], [x, 0, z], s.material('#b9bab6', { roughness: 1 }), 10);
    } else if (a.season === 'summer') {
      const tx = 2.05, tz = 0.75;
      const tyre = s.ring(0.3, 0.1, [tx, 0.1, tz], s.material(mood.cheer > 0.4 ? '#e9e4d6' : '#232325', { roughness: 0.9 })); tyre.rotation.x = Math.PI / 2;
      s.cylinder(0.28, 0.28, 0.12, [tx, 0.08, tz], s.material('#4a3a2a', { roughness: 1 }), 14);
      const blooms: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 16; i++) { const t = random() * 6.28, d = random() * 0.22; blooms.push({ at: [tx + Math.cos(t) * d, 0.2 + random() * 0.12, tz + Math.sin(t) * d], size: 0.04 + random() * 0.03, color: random() < 0.6 ? '#e8922a' : random() < 0.5 ? '#e3c22c' : '#3f8a3f' }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.9 }), blooms);
    } else {
      const leaves: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 90 + mood.density * 80; i++) { const corner = random() < 0.5; leaves.push({ at: corner ? [-2.3 + random() * 1.0, 0.012, wz + 0.1 + random() * random() * 1.4] : [-2.3 + random() * 4.6, 0.012, wz + 0.1 + random() * 2.1], size: 0.035 + random() * 0.03, color: ['#d9a521', '#c98a1c', '#e3c545', '#9c6a24'][Math.floor(random() * 4)] }); }
      const g = new THREE.SphereGeometry(1, 5, 3); g.scale(1, 0.12, 0.7);
      s.scatter(g, new THREE.MeshStandardMaterial({ roughness: 1 }), leaves);
    }
    return s.finish();
  },
});
