import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, visibleBounds } from '@conjure/kit';

type P = [number, number, number];
const W = 18, D = 11;

/** A long stretch of painted wall: stains first, then whatever the street has put on it. */
function wallTexture(kind: 'adverts' | 'posters' | 'warnings' | 'mural', base: string, wear: number, cheer: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 480;
  const c = canvas.getContext('2d')!;
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  c.fillStyle = base;
  c.fillRect(0, 0, 2048, 480);
  const text = (lines: readonly string[], x: number, y: number, w: number, h: number, ink: string, tilt = 0.03) => {
    const longest = Math.max(...lines.map((line) => line.length));
    const size = Math.min((h / lines.length) * 0.78, (w / longest) * 1.6);
    c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((line, index) => {
      c.save();
      c.translate(x + w / 2, y + (h * (index + 0.5)) / lines.length);
      c.rotate((random() - 0.5) * tilt);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillText(line, 3, 4, w * 0.94);
      c.fillStyle = ink;
      c.fillText(line, 0, 0, w * 0.94);
      c.restore();
    });
  };
  if (kind === 'adverts') {
    const ads: [string, string, string[]][] = [
      ['#d8342c', '#fff4d0', ['COLD', 'MINERALS']], ['#1f52b4', '#ffffff', ['PURE', 'WATER']], ['#f2c21a', '#1c1c1e', ['GSM', 'REPAIRS']],
      ['#1f8a4a', '#fff4d0', ['RICE &', 'BEANS']], ['#f4f0e0', '#b3261e', ['BARBING', 'SALON']], ['#1c1c1e', '#f2c21a', ['VULCANIZER', 'HERE']],
      ['#e87a1c', '#1c1c1e', ['BREAD', 'HOT HOT']], ['#7a2a8a', '#ffe9a0', ['GOD IS GOOD', 'VENTURES']], ['#2aa0b0', '#ffffff', ['TAILOR', '& FASHION']],
      ['#f4f0e0', '#1f52b4', ['PHOTOCOPY', 'TYPING']], ['#b3261e', '#ffffff', ['CEMENT', 'SOLD HERE']],
    ];
    ads.sort(() => random() - 0.5);
    let x = 20;
    for (const [bg, ink, lines] of ads) {
      const w = 230 + random() * 130;
      if (x + w > 2030) break;
      const y = 40 + random() * 50, h = 300 + random() * 70;
      c.fillStyle = bg;
      c.fillRect(x, y, w, h);
      c.strokeStyle = ink;
      c.lineWidth = 8;
      c.strokeRect(x + 12, y + 12, w - 24, h - 24);
      text(lines, x + 16, y + 24, w - 32, h * 0.58, ink);
      // A painted emblem under the words.
      c.fillStyle = ink;
      const cx = x + w / 2, cy = y + h * 0.78, emblem = Math.floor(random() * 4);
      if (emblem === 0) { c.fillRect(cx - 18, cy - 40, 36, 70); c.fillRect(cx - 8, cy - 62, 16, 26); }
      else if (emblem === 1) { c.beginPath(); c.arc(cx, cy - 5, 36, 0, 7); c.fill(); c.fillStyle = bg; c.beginPath(); c.arc(cx, cy - 5, 18, 0, 7); c.fill(); }
      else if (emblem === 2) { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 40, t = (i / 10) * Math.PI * 2 - Math.PI / 2; c.lineTo(cx + Math.cos(t) * r, cy - 5 + Math.sin(t) * r); } c.fill(); }
      else { c.beginPath(); c.moveTo(cx - 70, cy + 14); c.lineTo(cx + 40, cy + 14); c.lineTo(cx + 70, cy - 5); c.lineTo(cx + 40, cy - 24); c.lineTo(cx - 70, cy - 24); c.fill(); }
      x += w + 14 + random() * 40;
    }
  } else if (kind === 'posters') {
    const sorts: [string, string, string][] = [['#f4f0e0', '#b3261e', 'CRUSADE'], ['#f2c21a', '#1f8a4a', 'VOTE'], ['#d8ecf4', '#1f52b4', 'NIGHT VIGIL'], ['#f4d0d8', '#7a2a8a', 'OBITUARY'], ['#ffffff', '#1c1c1e', 'LIVE SHOW']];
    for (let row = 0; row < 3; row++) {
      let x = 10 + random() * 60;
      while (x < 1960) {
        const [bg, ink, word] = pick(sorts);
        const run = 2 + Math.floor(random() * 6);
        for (let i = 0; i < run && x < 1960; i++) {
          if (random() > 0.14 + wear * 0.3) {
            const y = 26 + row * 138 + (random() - 0.5) * 12;
            c.save();
            c.translate(x + 44, y + 60);
            c.rotate((random() - 0.5) * 0.08);
            c.fillStyle = bg;
            c.fillRect(-44, -60, 88, 120);
            c.fillStyle = ink;
            c.fillRect(-44, -60, 88, 24);
            c.beginPath(); c.arc(0, -8, 20, 0, 7); c.fill();
            c.font = '900 17px Impact, sans-serif'; c.textAlign = 'center'; c.fillText(word, 0, 38, 80);
            c.fillRect(-30, 46, 60, 5);
            if (random() < wear * 0.6) { c.fillStyle = base; c.beginPath(); c.moveTo(-44, 60); c.lineTo(44, 60); c.lineTo(44, 10 + random() * 30); c.lineTo(-10, 30 + random() * 20); c.lineTo(-44, random() * 30); c.fill(); }
            c.restore();
          }
          x += 92;
        }
        x += 20 + random() * 120;
      }
    }
  } else if (kind === 'warnings') {
    for (let x = 30; x < 2000; x += 420) text(['POST NO BILL'], x, 30, 330, 70, '#1c1c1e', 0.02);
    text(['THIS HOUSE IS', 'NOT FOR SALE'], 180, 130, 760, 250, '#b3261e', 0.04);
    text(['BEWARE OF 419'], 1020, 150, 520, 110, '#1c1c1e', 0.05);
    text(['DO NOT URINATE HERE', 'FINE N5000'], 1120, 280, 780, 150, '#1f52b4', 0.05);
  } else {
    const blocks = ['#f2c21a', '#2aa0b0', '#e87a1c', '#1f8a4a', '#d8342c', '#7a2a8a'];
    for (let i = 0; i < 9; i++) { c.fillStyle = pick(blocks); c.beginPath(); const x = i * 240 - 40 + random() * 60; c.moveTo(x, 480); c.lineTo(x + 120 + random() * 160, 60 + random() * 160); c.lineTo(x + 330 + random() * 60, 480); c.fill(); }
    c.fillStyle = '#fff1b0'; c.beginPath(); c.arc(300, 150, 96, 0, 7); c.fill();
    // A painted danfo.
    c.fillStyle = '#f6c416'; c.fillRect(1320, 230, 430, 150); c.beginPath(); c.moveTo(1750, 230); c.lineTo(1800, 300); c.lineTo(1800, 380); c.lineTo(1750, 380); c.fill();
    c.fillStyle = '#1c1c1e'; c.fillRect(1320, 310, 480, 14); c.fillRect(1320, 334, 480, 14);
    c.fillStyle = '#27384a'; for (let i = 0; i < 4; i++) c.fillRect(1340 + i * 104, 246, 84, 50);
    c.fillStyle = '#1c1c1e'; for (const x of [1400, 1700]) { c.beginPath(); c.arc(x, 386, 34, 0, 7); c.fill(); }
    text(['EKO O NI BAJE'], 460, 110, 800, 190, '#ffffff', 0.03);
    text(['LAGOS NO DEY SLEEP'], 520, 300, 700, 90, '#1c1c1e', 0.03);
  }
  // Weather: streaks from the coping, splash-back from the gutter.
  for (let i = 0; i < 40 + wear * 120; i++) {
    const x = random() * 2048, h = 60 + random() * 320;
    const gradient = c.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, `rgba(60,50,40,${0.08 + wear * 0.18})`);
    gradient.addColorStop(1, 'rgba(60,50,40,0)');
    c.fillStyle = gradient;
    c.fillRect(x, 0, 6 + random() * 22, h);
  }
  const splash = c.createLinearGradient(0, 360, 0, 480);
  splash.addColorStop(0, 'rgba(110,84,56,0)');
  splash.addColorStop(1, `rgba(110,84,56,${0.45 + wear * 0.3})`);
  c.fillStyle = splash;
  c.fillRect(0, 360, 2048, 120);
  if (cheer < 0.3) { c.fillStyle = 'rgba(90,90,90,0.18)'; c.fillRect(0, 0, 2048, 480); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
}

function signMaterial(lines: readonly string[], w: number, h: number, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  const longest = Math.max(...lines.map((line) => line.length));
  c.font = `900 ${Math.min((canvas.height / lines.length) * 0.72, (512 / longest) * 1.5)}px Impact, "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = ink;
  lines.forEach((line, index) => c.fillText(line, 256, (canvas.height * (index + 0.5)) / lines.length, 480));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
}

export default defineWorld({
  questions: {
    wall: choice('What covers the long wall behind the stop?', {
      adverts: 'Hand-painted adverts in clashing panels: cold minerals, GSM repairs, barbing salon.',
      posters: 'Row upon row of pasted posters, crusades and candidates, peeling at the corners.',
      warnings: 'Bare stained plaster with stencilled warnings: POST NO BILL, THIS HOUSE IS NOT FOR SALE.',
      mural: 'A bright painted mural with a sun, a danfo and EKO O NI BAJE.',
    }),
    drain: choice('What is in the open concrete drain?', {
      dry: 'Dry, with a drift of litter and sand.',
      green: 'Still green water with a skin on it.',
      black: 'Black sludge, brimming, with plastic bottles afloat.',
      flowing: 'Brown storm water running fast after rain.',
    }),
    road: choice('What state is the edge of the road in?', {
      cracked: 'Cracked and crumbling into the dust, with a pothole or two.',
      puddled: 'Potholes brimming with rain water that mirrors the sky.',
      patched: 'Freshly patched in darker squares, the kerb stones repainted black and white.',
      sanded: 'Half buried under drifted sand and laterite.',
    }),
    stop: choice('What marks this as a bus stop?', {
      sign: 'A bent metal pole with a BUS STOP plate.',
      shelter: 'A rusted shelter frame whose roof went years ago.',
      tyres: 'Nothing official: a stack of painted tyres everyone knows.',
      bench: 'A concrete bench with a faded advert panel behind it.',
    }),
    air: choice('What hangs in the air?', {
      dust: 'Golden dust, the low sun turned to a glare.',
      exhaust: 'Blue-grey exhaust from a thousand idling engines.',
      harmattan: 'Pale harmattan haze, everything bleached and dry.',
      clear: 'Rain has washed it clean: sharp shadows and wet ground.',
    }),
    moment: choice('What has just happened here?', {
      left: 'A bus has just pulled out: fresh tyre tracks, settling dust, someone left behind.',
      rush: 'Rush hour: a knot of people waiting with bags and basins.',
      raid: 'A task-force raid: traders have run, a stool lies overturned and goods are scattered.',
      lull: 'The dead hour: a dog asleep in the shade and nobody hurrying.',
    }),
    trade: choice('What lines the back of the stop along the drain?', {
      parasols: 'Trader parasols over trays of oranges and bread.',
      tyres: "A vulcanizer's pitch: tyre stacks, a compressor, an old rim on a pole.",
      wood: 'A plank kiosk with a zinc roof and a bench.',
      bare: 'Nothing but the wall and the drain.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const sky = { dust: '#eee0c0', exhaust: '#d9dad6', harmattan: '#ebe7dc', clear: '#dfe8ea' }[a.air];
    const ground = a.air === 'clear' ? '#9c7a56' : '#b99870';
    const slots: readonly (readonly [number, number, number])[] = [[0.3, 2.0, 2.7], [-5.2, 0.3, 1.9], [5.2, 0.6, 1.9], [-2.6, -2.2, 1.3], [2.6, -2.3, 1.3], [7.6, -2.4, 1.15]];
    const { art: s, world } = diorama(context, { background: sky, floor: ground, width: W, depth: D, pitch: 27, yaw: 24, slots: slots.map(([x, z]) => [x, z] as const) });
    const { root } = s;
    const concrete = s.material('#a8a498'), darkConcrete = s.material('#807c72'), tarmac = s.material('#3f4144', { roughness: 0.95 });
    const rust = s.material('#7c4a2c', { roughness: 0.95 }), wood = s.material('#86653f'), black = s.material('#1e1e20');
    const dummy = new THREE.Object3D();
    const many = (geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly { at: P; scale?: P; turn?: P; colour?: string }[], shadow = true) => {
      if (!list.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((item, index) => {
        dummy.position.set(...item.at);
        dummy.rotation.set(...(item.turn ?? [0, 0, 0]));
        dummy.scale.set(...(item.scale ?? [1, 1, 1]));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (item.colour) mesh.setColorAt(index, new THREE.Color(item.colour));
      });
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    // ---- Road: tarmac with a ragged edge biting into the shoulder.
    const edge = 3.05;
    s.box([W, 0.05, D / 2 - edge], [0, 0.02, (D / 2 + edge) / 2], tarmac).castShadow = false;
    const bites: { at: P; scale: P; turn: P }[] = [], sands: { at: P; scale: P; turn: P }[] = [];
    for (let x = -W / 2 + 0.3; x < W / 2 - 0.2; x += 0.45 + random() * 0.5) {
      bites.push({ at: [x, 0.022, edge - 0.05 - random() * 0.25], scale: [0.5 + random() * 0.9, 0.025, 0.12 + random() * 0.3], turn: [0, (random() - 0.5) * 0.7, 0] });
      if (random() < 0.5 + mood.wear * 0.4 || a.road === 'sanded') sands.push({ at: [x + 0.2, 0.05, edge + 0.1 + random() * (a.road === 'sanded' ? 1.4 : 0.35)], scale: [0.5 + random() * (a.road === 'sanded' ? 1.6 : 0.9), 0.012, 0.1 + random() * (a.road === 'sanded' ? 0.5 : 0.22)], turn: [0, (random() - 0.5) * 0.8, 0] });
    }
    many(new THREE.CylinderGeometry(1, 1, 1, 7), tarmac, bites, false);
    many(new THREE.CylinderGeometry(1, 1, 1, 7), s.material(ground), sands, false);
    // Cracks, potholes, patches, faded paint.
    const cracks: { at: P; scale: P; turn: P }[] = [];
    for (let i = 0; i < 16 + mood.wear * 30; i++) {
      let x = (random() - 0.5) * W * 0.96, z = edge + 0.2 + random() * 2.1, heading = random() * 3;
      for (let k = 0; k < 3; k++) {
        const length = 0.2 + random() * 0.4;
        cracks.push({ at: [x, 0.048, z], scale: [length, 0.004, 0.02], turn: [0, heading, 0] });
        x += Math.cos(heading) * length * 0.9; z -= Math.sin(heading) * length * 0.9; heading += (random() - 0.5) * 1.6;
        if (z > D / 2 - 0.1 || z < edge) break;
      }
    }
    many(new THREE.BoxGeometry(1, 1, 1), s.material('#232426'), cracks, false);
    const wet = new THREE.MeshStandardMaterial({ color: new THREE.Color(sky).multiplyScalar(0.82), roughness: 0.06, metalness: 0.35 });
    const holes = a.road === 'patched' ? 0 : a.road === 'puddled' ? 6 : a.road === 'cracked' ? 3 + Math.round(mood.wear * 3) : 2;
    for (let i = 0; i < holes; i++) {
      const x = (random() - 0.5) * W * 0.88, z = edge + 0.5 + random() * 1.6, r = 0.3 + random() * 0.5;
      const hole = s.cylinder(r, r, 0.012, [x, 0.047, z], a.road === 'puddled' || a.air === 'clear' ? wet : s.material('#6e6252'), 12);
      hole.scale.z = 0.55 + random() * 0.3;
      hole.rotation.y = random() * 3;
      hole.castShadow = false;
    }
    if (a.road === 'patched') for (let i = 0; i < 6; i++) s.box([0.8 + random() * 1.4, 0.008, 0.6 + random() * 0.8], [(random() - 0.5) * W * 0.9, 0.049, edge + 0.6 + random() * 1.5], s.material('#27282a')).castShadow = false;
    const dashes: { at: P; scale: P }[] = [];
    for (let x = -W / 2 + 0.8; x < W / 2 - 1; x += 2.6) if (random() > mood.wear * 0.6) dashes.push({ at: [x, 0.047, D / 2 - 0.35], scale: [1.3, 0.004, 0.11] });
    many(new THREE.BoxGeometry(1, 1, 1), s.material('#d8d2b8'), dashes, false);
    // Kerb stones, some missing, some tipped.
    const kerbs: { at: P; scale: P; turn: P; colour: string }[] = [];
    const kerbKeep = a.road === 'patched' ? 0.95 : a.road === 'sanded' ? 0.3 : 0.6 - mood.wear * 0.25;
    let stripe = 0;
    for (let x = -W / 2 + 0.4; x < W / 2 - 0.3; x += 0.82) {
      stripe++;
      if (random() > kerbKeep) continue;
      const fresh = a.road === 'patched';
      kerbs.push({ at: [x, 0.08, edge - 0.12 + (random() - 0.5) * 0.06], scale: [0.78, 0.17, 0.17], turn: [(random() - 0.5) * (fresh ? 0.02 : 0.3), (random() - 0.5) * (fresh ? 0.02 : 0.2), 0], colour: stripe % 2 ? (fresh ? '#f2f0e8' : '#c9c5b6') : fresh ? '#1e1e20' : '#57544e' });
    }
    many(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), kerbs);

    // ---- The open drain along the back.
    const dz = -4.15, lip = 0.28;
    for (const z of [dz - 0.55, dz + 0.55]) s.box([W, lip, 0.16], [0, lip / 2, z], concrete);
    const fillColour = { dry: '#6f6a5e', green: '#5c7a3a', black: '#1c1b1a', flowing: '#8a6a44' }[a.drain];
    const level = { dry: 0.03, green: 0.12, black: 0.25, flowing: 0.2 }[a.drain];
    const liquid = new THREE.MeshStandardMaterial({ color: fillColour, roughness: a.drain === 'dry' ? 0.95 : 0.12, metalness: a.drain === 'dry' ? 0 : 0.25 });
    s.box([W, 0.02, 0.94], [0, level, dz], liquid).castShadow = false;
    s.box([W, 0.012, 0.94], [0, 0.012, dz], s.material('#3a3832')).castShadow = false;
    // Slabs bridging the drain where people cross.
    for (const x of [-6.3, -1.2 + random(), 4.2 + random() * 0.5]) {
      const slab = s.box([0.9 + random() * 0.5, 0.09, 1.34], [x, lip + 0.045, dz], random() > 0.5 ? darkConcrete : wood);
      slab.rotation.y = (random() - 0.5) * 0.12;
    }
    const flotsam: { at: P; scale: P; turn: P; colour: string }[] = [];
    const flotsamCount = a.drain === 'black' ? 26 : a.drain === 'dry' ? 16 : 8;
    for (let i = 0; i < flotsamCount; i++) flotsam.push({ at: [(random() - 0.5) * W * 0.96, level + 0.03, dz + (random() - 0.5) * 0.7], scale: [0.09 + random() * 0.1, 0.03, 0.05 + random() * 0.06], turn: [0, random() * 3, 0], colour: pick(['#dfe9ec', '#dfe9ec', '#2a62c8', '#c8322a', '#e8c020', '#1e1e20', '#2c8a56']) });
    if (a.drain === 'black') {
      // It has come over the lip in one place.
      const spill = s.cylinder(1.1, 1.1, 0.01, [3 + random() * 3, 0.006, dz + 0.9], liquid, 14);
      spill.scale.z = 0.5;
      spill.castShadow = false;
    }
    const ripples: THREE.Mesh[] = [];
    if (a.drain === 'flowing') for (let i = 0; i < 9; i++) {
      const ripple = s.box([0.5 + random() * 0.5, 0.006, 0.03], [(random() - 0.5) * W * 0.9, level + 0.012, dz + (random() - 0.5) * 0.7], s.material('#c8a880'));
      ripple.castShadow = false;
      ripples.push(ripple);
    }

    // ---- Back wall and the building it runs into.
    const wz = -D / 2 + 0.22, wallH = 2.9, bx = -W / 2 + 2.9, bw = 5.8;
    const wallBase = { adverts: '#d9cdb0', posters: '#cfc6ae', warnings: '#d8d0bc', mural: '#e9dcb4' }[a.wall];
    const wallX0 = bx + bw / 2, wallW = W / 2 - wallX0;
    s.box([wallW, wallH, 0.24], [wallX0 + wallW / 2, wallH / 2, wz], s.material(wallBase));
    s.mesh(new THREE.PlaneGeometry(wallW, wallH), wallTexture(a.wall, wallBase, mood.wear, mood.cheer, random), [wallX0 + wallW / 2, wallH / 2, wz + 0.125]);
    s.box([wallW, 0.1, 0.34], [wallX0 + wallW / 2, wallH + 0.05, wz], darkConcrete);
    // Broken bottle glass and a leaning zinc sheet on the coping; a gap patched with zinc.
    const shards: { at: P; scale: P; turn: P; colour: string }[] = [];
    for (let x = wallX0 + 0.2; x < W / 2 - 0.1; x += 0.16 + random() * 0.12) shards.push({ at: [x, wallH + 0.14, wz + (random() - 0.5) * 0.14], scale: [0.02, 0.06 + random() * 0.06, 0.03], turn: [random(), random() * 3, random() - 0.5], colour: pick(['#5a8a4a', '#8a5a2a', '#cfe0d8']) });
    many(new THREE.ConeGeometry(1, 1, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }), shards, false);
    const zinc = s.box([1.7, 2.1, 0.03], [W / 2 - 1.4, 1.05, wz + 0.3], mood.wear > 0.4 ? rust : s.material('#9aa2a4', { metalness: 0.5 }));
    zinc.rotation.x = -0.12;
    for (let i = 0; i < 8; i++) s.box([0.03, 2.1, 0.035], [W / 2 - 2.2 + i * 0.22, 1.05, wz + 0.32], s.material('#6a6f70')).rotation.x = -0.12;

    // The building: two storeys of stained render, a shop below, a balcony above.
    const bh = 6.4, bz = wz - 0.1;
    const render = s.material(pick(['#d8c9a4', '#c9d0c4', '#e0c4a8', '#cfc0c8']));
    s.box([bw, bh, 0.5], [bx, bh / 2, bz], render);
    s.box([bw + 0.3, 0.16, 0.9], [bx, bh + 0.08, bz + 0.1], darkConcrete);
    s.box([bw, 0.14, 0.2], [bx, 3.2, bz + 0.3], darkConcrete);
    // Shop front: a roller shutter, a doorway, a signboard, a zinc awning on poles.
    const shutterOpen = a.moment !== 'raid';
    s.box([2.6, 2.5, 0.06], [bx - 1.2, 1.25, bz + 0.27], s.material('#2a2622'));
    if (shutterOpen) {
      for (let i = 0; i < 4; i++) s.box([2.4, 0.04, 0.3], [bx - 1.2, 0.6 + i * 0.5, bz + 0.33], wood);
      const goods: { at: P; scale: P; colour: string }[] = [];
      for (let i = 0; i < 44; i++) goods.push({ at: [bx - 2.3 + random() * 2.2, 0.7 + Math.floor(random() * 4) * 0.5, bz + 0.36], scale: [0.11 + random() * 0.08, 0.13 + random() * 0.1, 0.12], colour: pick(['#d8342c', '#f2c21a', '#1f52b4', '#f4f0e0', '#1f8a4a', '#e87a1c']) });
      many(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), goods, false);
      s.box([2.6, 0.5, 0.08], [bx - 1.2, 2.3, bz + 0.3], s.material('#6a7074', { metalness: 0.5 }));
    } else for (let i = 0; i < 12; i++) s.box([2.6, 0.17, 0.05 + (i % 2) * 0.03], [bx - 1.2, 0.12 + i * 0.205, bz + 0.3], s.material('#6a7074', { metalness: 0.5 }));
    s.box([1.0, 2.2, 0.06], [bx + 1.6, 1.1, bz + 0.27], s.material(pick(['#2a5a4a', '#5a3a2a', '#2a4a7a'])));
    s.mesh(new THREE.PlaneGeometry(3.6, 0.6), signMaterial([pick(['GOD IS GOOD VENTURES', 'MAMA PUT & SONS', 'NO SHAKING STORES', 'DE YOUNG SHALL GROW', 'BLESSED ASSURANCE'])], 3.6, 0.6, pick(['#b3261e', '#1b3f8f', '#1c1c1e']), pick(['#f2d24a', '#f4f0e0', '#bfe0e8'])), [bx - 0.7, 2.86, bz + 0.42]);
    const awning = s.box([3.4, 0.04, 1.5], [bx - 0.9, 2.42, bz + 1.05], mood.wear > 0.5 ? rust : s.material('#8f9698', { metalness: 0.5 }));
    awning.rotation.x = 0.16;
    for (const x of [bx - 2.5, bx + 0.7]) s.rod([x, 0, bz + 1.72], [x, 2.3, bz + 1.72], 0.035, wood);
    // Upper floor: louvred windows, a balcony with washing, an air conditioner that drips.
    const louvre = s.material('#4a5a60', { roughness: 0.3 });
    for (const x of [bx - 2.0, bx + 1.9]) {
      s.box([1.0, 1.2, 0.06], [x, 4.6, bz + 0.27], louvre);
      for (let i = 0; i < 6; i++) s.box([1.0, 0.03, 0.1], [x, 4.1 + i * 0.2, bz + 0.3], s.material('#b9c4c8'));
      for (let i = 0; i < 5; i++) s.rod([x - 0.4 + i * 0.2, 4.0, bz + 0.36], [x - 0.4 + i * 0.2, 5.2, bz + 0.36], 0.012, black);
    }
    s.box([1.9, 0.1, 0.9], [bx, 3.55, bz + 0.65], concrete);
    for (let i = 0; i < 9; i++) s.rod([bx - 0.9 + i * 0.225, 3.6, bz + 1.06], [bx - 0.9 + i * 0.225, 4.45, bz + 1.06], 0.014, black);
    s.rod([bx - 0.92, 4.45, bz + 1.06], [bx + 0.92, 4.45, bz + 1.06], 0.02, black);
    s.box([0.9, 2.0, 0.06], [bx, 4.6, bz + 0.27], s.material('#3a3028'));
    const washing = Math.round(mix(2, 6, mood.density));
    for (let i = 0; i < washing; i++) s.box([0.26 + random() * 0.12, 0.4 + random() * 0.25, 0.02], [bx - 0.75 + i * (1.5 / washing) + 0.1, 4.2 - random() * 0.1, bz + 1.1], s.material(pick(['#d8342c', '#f2c21a', '#1f52b4', '#f4f0e0', '#d86a9a', '#2aa0b0']))).rotation.z = (random() - 0.5) * 0.1;
    s.box([0.7, 0.45, 0.3], [bx + 1.9, 3.75, bz + 0.4], s.material('#d0d0c8'));
    // Roof clutter: a water tank, a dish.
    s.cylinder(0.55, 0.6, 1.1, [bx - 1.6, bh + 0.7, bz - 0.0], black, 14);
    const dish = s.mesh(new THREE.SphereGeometry(0.42, 14, 6, 0, Math.PI * 2, 0, 0.9), s.material('#c9cdd0', { side: THREE.DoubleSide, metalness: 0.4 }), [bx + 1.7, bh + 0.6, bz + 0.1]);
    dish.rotation.set(-1.9, 0.5, 0);
    s.rod([bx + 1.7, bh + 0.16, bz + 0.1], [bx + 1.7, bh + 0.5, bz + 0.1], 0.03, black);

    // ---- Poles and the tangle of wires.
    const pole = (x: number, z: number, height: number, tilt: number) => {
      const top: P = [x + tilt * height, height, z];
      s.rod([x, 0, z], top, 0.11, s.material('#6a543c'), 0.08);
      const arm = s.box([0.1, 0.1, 1.5], [top[0], height - 0.35, z], s.material('#5a4632'));
      arm.rotation.x = (random() - 0.5) * 0.15;
      for (const dzz of [-0.6, 0, 0.6]) s.cylinder(0.035, 0.045, 0.14, [top[0], height - 0.24, z + dzz], s.material('#d8d4c8'), 8);
      return top;
    };
    const p1 = pole(-W / 2 + 0.55, -3.0, 7.2, 0.012), p2 = pole(W / 2 - 0.6, -3.15, 6.8, -0.02);
    s.box([0.5, 0.75, 0.45], [p1[0] + 0.05, 5.5, -3.0 + 0.33], s.material('#6f777a', { metalness: 0.4 }));
    const wire = s.material('#1c1c1e');
    const strands = 5 + Math.round(mood.density * 5);
    for (let i = 0; i < strands; i++) {
      const y1 = p1[1] - 0.25 - random() * (i < 3 ? 0.1 : 1.6), y2 = p2[1] - 0.25 - random() * (i < 3 ? 0.1 : 1.6);
      const dzz = (i % 3 - 1) * 0.6 * (i < 3 ? 1 : random());
      const sag = 0.5 + random() * 1.1;
      s.tube([[p1[0], y1, -3.0 + dzz], [p1[0] * 0.4, (y1 + y2) / 2 - sag * 0.8, -3.05 + dzz], [0, (y1 + y2) / 2 - sag, -3.07 + dzz], [p2[0] * 0.4, (y1 + y2) / 2 - sag * 0.8, -3.1 + dzz], [p2[0], y2, -3.15 + dzz]], 0.012, wire).castShadow = false;
    }
    // Illegal taps: drops running down to the shop and the wall.
    for (let i = 0; i < 3; i++) s.tube([[p1[0], 6.2 - i * 0.3, -3.0], [p1[0] + 1.2 + i, 4.6, -4.2], [bx - 2 + i * 1.6, 3.1, bz + 0.5]], 0.009, wire).castShadow = false;
    s.ball([0.3, 0.22, 0.25], [p1[0] + 0.1, 6.25, -2.95], wire, 8);

    // ---- The stop itself, at the left kerb.
    const sx = -7.6, sz = 2.35;
    if (a.stop === 'sign') {
      s.rod([sx, 0, sz], [sx + 0.18, 2.7, sz], 0.035, s.material('#8a8f92', { metalness: 0.6 }));
      const plate = s.mesh(new THREE.PlaneGeometry(0.75, 0.55), signMaterial(['BUS', 'STOP'], 0.75, 0.55, '#f4f0e0', '#1f52b4'), [sx + 0.2, 2.5, sz + 0.05]);
      plate.rotation.set(0, 0.25, -0.12);
      s.box([0.5, 0.3, 0.01], [sx + 0.1, 1.5, sz + 0.05], s.material('#f2d24a')).rotation.z = 0.1;
    } else if (a.stop === 'shelter') {
      for (const x of [-1.2, 1.2]) for (const z of [-0.5, 0.5]) s.rod([sx + x, 0, sz + z], [sx + x, 2.5, sz + z], 0.035, rust);
      for (const z of [-0.5, 0.5]) s.rod([sx - 1.3, 2.5, sz + z], [sx + 1.3, 2.5, sz + z], 0.03, rust);
      for (let i = 0; i < 5; i++) s.rod([sx - 1.2 + i * 0.6, 2.5, sz - 0.5], [sx - 1.2 + i * 0.6, 2.62, sz + 0.5], 0.02, rust);
      const sheet = s.box([0.9, 0.02, 1.1], [sx + 0.8, 2.6, sz], rust);
      sheet.rotation.z = -0.25;
      s.box([2.2, 0.06, 0.3], [sx, 0.45, sz - 0.35], wood);
      for (const x of [-0.9, 0.9]) s.box([0.08, 0.45, 0.28], [sx + x, 0.22, sz - 0.35], concrete);
    } else if (a.stop === 'tyres') {
      const paints = ['#f2f0e8', '#d8342c', '#f2c21a', '#1e1e20'];
      for (let i = 0; i < 4; i++) s.ring(0.3, 0.12, [sx + (random() - 0.5) * 0.06, 0.12 + i * 0.235, sz + (random() - 0.5) * 0.06], s.material(paints[i % paints.length], { roughness: 0.9 })).rotation.x = Math.PI / 2;
      s.rod([sx, 0.9, sz], [sx + 0.05, 2.0, sz], 0.02, wood);
      s.box([0.5, 0.3, 0.02], [sx + 0.06, 1.9, sz], s.material('#f2d24a'));
    } else {
      s.box([2.3, 0.1, 0.5], [sx, 0.45, sz - 0.2], concrete);
      for (const x of [-0.9, 0.9]) s.box([0.14, 0.42, 0.46], [sx + x, 0.21, sz - 0.2], darkConcrete);
      s.box([2.3, 1.5, 0.1], [sx, 1.25, sz - 0.55], darkConcrete);
      s.mesh(new THREE.PlaneGeometry(2.1, 0.9), signMaterial(['YOUR ADVERT HERE', 'CALL 080...'], 2.1, 0.9, '#8a8f92', '#d9d6c8'), [sx, 1.45, sz - 0.495]);
    }

    // ---- Trade along the drain.
    const stalls = a.trade === 'bare' ? [] : [-7.3, -0.1, 5.1].slice(0, 1 + Math.round(mood.density * 2));
    const figure = (x: number, z: number, facing: number, carry: 'none' | 'bag' | 'basin') => {
      const group = new THREE.Group();
      const shirt = s.material(pick(['#c8402e', '#2f6fb0', '#e8e2d0', '#2c8a56', '#e0a020', '#7a3a8a', '#d86a9a', '#2aa0b0']));
      const lower = s.material(pick(['#30383f', '#4a4030', '#27405a', '#7a2a4a', '#3a6a4a']));
      const flesh = s.material(pick(['#5a3a28', '#6b4630', '#4a2f20']));
      const tall = 0.9 + random() * 0.15;
      for (const dx of [-0.08, 0.08]) group.add(s.rod([dx, 0, 0], [dx * 0.9, 0.82, 0], 0.06, lower));
      group.add(s.rod([0, 0.8, 0], [0, 1.4, 0.02], 0.16, shirt, 0.14), s.ball([0.1, 0.115, 0.1], [0, 1.6, 0.03], flesh, 10));
      group.add(s.rod([-0.18, 1.36, 0], [-0.22, 0.88, 0.05], 0.04, flesh));
      if (carry === 'basin') {
        group.add(s.rod([0.18, 1.36, 0], [0.2, 1.74, 0.02], 0.04, flesh));
        group.add(s.cylinder(0.3, 0.2, 0.16, [0, 1.8, 0.03], s.material(pick(['#d8342c', '#2a62c8', '#f2f0e8'])), 12));
        group.add(s.ball([0.24, 0.1, 0.24], [0, 1.9, 0.03], s.material(pick(['#e88a1c', '#e8dcc0', '#3f7a35'])), 8));
      } else {
        group.add(s.rod([0.18, 1.36, 0], [0.22, 0.88, 0.05], 0.04, flesh));
        if (carry === 'bag') group.add(s.box([0.3, 0.3, 0.12], [0.25, 0.68, 0.05], s.material(pick(['#1e1e20', '#d8342c', '#2a62c8', '#e8dcc0']))));
      }
      group.scale.setScalar(tall);
      group.position.set(x, 0, z);
      group.rotation.y = facing;
      root.add(group);
    };
    stalls.forEach((x, index) => {
      const z = -3.15;
      if (a.trade === 'parasols') {
        const colours = pick([['#d8342c', '#f2f0e6'], ['#f6c61a', '#f6c61a'], ['#1f9a4a', '#f2f0e6'], ['#3a8ad0', '#f2f0e6'], ['#e87a1c', '#1c1c1e']]);
        const positions: number[] = [], tints: number[] = [];
        const tiltX = (random() - 0.5) * 0.2, r = 1.05;
        for (let i = 0; i < 8; i++) {
          const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
          const tint = new THREE.Color(colours[i % 2]).lerp(new THREE.Color('#ddd6c4'), mood.wear * 0.4);
          for (const p of [[0, 0.32, 0], [Math.cos(a1) * r, 0, Math.sin(a1) * r], [Math.cos(a0) * r, 0, Math.sin(a0) * r]]) { positions.push(...p); tints.push(tint.r, tint.g, tint.b); }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
        geometry.computeVertexNormals();
        const canopy = s.mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), [x, 2.05, z]);
        canopy.rotation.set(tiltX, random(), 0.1);
        s.rod([x, 0, z], [x, 2.35, z], 0.022, s.material('#c9c6ba'));
        s.box([1.0, 0.04, 0.6], [x + 0.1, 0.62, z + 0.35], wood);
        for (const dx of [-0.4, 0.4]) s.box([0.05, 0.62, 0.5], [x + 0.1 + dx, 0.31, z + 0.35], wood);
        // A pyramid of oranges or a stack of loaves.
        const fruit: { at: P; scale: P; colour: string }[] = [];
        const loaves = index % 2 === 1;
        for (let layer = 0; layer < 3; layer++) for (let u = 0; u < 4 - layer; u++) for (let v = 0; v < 3 - layer; v++)
          fruit.push({ at: [x - 0.2 + u * 0.14 + layer * 0.07, 0.7 + layer * 0.1, z + 0.22 + v * 0.14 + layer * 0.07], scale: loaves ? [0.1, 0.045, 0.06] : [0.065, 0.065, 0.065], colour: loaves ? '#c8904a' : pick(['#e8901c', '#e8a020', '#8ab03a']) });
        many(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), fruit, false);
        if (a.moment !== 'raid') figure(x - 0.55, z + 0.1, 0.3, 'none');
      } else if (a.trade === 'tyres') {
        for (let i = 0; i < 3 + Math.floor(random() * 4); i++) s.ring(0.27, 0.11, [x + (random() - 0.5) * 0.05, 0.11 + i * 0.22, z + (random() - 0.5) * 0.05], black).rotation.x = Math.PI / 2;
        s.ring(0.27, 0.11, [x + 0.75, 0.38, z - 0.12], black).rotation.set(0.25, 0.4, 0);
        if (index === 0) {
          s.cylinder(0.2, 0.2, 0.7, [x + 1.4, 0.4, z + 0.2], s.material('#c8322a', { metalness: 0.3 }), 12).rotation.z = Math.PI / 2;
          s.box([0.3, 0.25, 0.25], [x + 1.4, 0.72, z + 0.2], black);
          s.rod([x - 0.7, 0, z], [x - 0.7, 2.4, z], 0.03, rust);
          s.ring(0.22, 0.05, [x - 0.7, 2.55, z], rust);
          s.mesh(new THREE.PlaneGeometry(0.9, 0.34), signMaterial(['VULCANIZER'], 0.9, 0.34, '#f4f0e0', '#1c1c1e'), [x - 0.7, 1.9, z + 0.04]);
        }
      } else {
        s.box([1.9, 1.9, 1.1], [x, 0.95, z - 0.05], s.material(pick(['#7a8a6a', '#8a6a4a', '#6a7a8a', '#a8905a'])));
        s.box([1.5, 0.9, 0.05], [x, 1.25, z + 0.5], s.material('#2a2622'));
        s.box([1.6, 0.05, 0.4], [x, 0.8, z + 0.68], wood);
        const roof = s.box([2.3, 0.04, 1.7], [x, 2.0, z + 0.1], mood.wear > 0.4 ? rust : s.material('#9aa2a4', { metalness: 0.5 }));
        roof.rotation.x = 0.14;
        const tins: { at: P; scale: P; colour: string }[] = [];
        for (let i = 0; i < 14; i++) tins.push({ at: [x - 0.65 + (i % 7) * 0.2, 0.9 + Math.floor(i / 7) * 0.5, z + 0.56], scale: [0.07, 0.11, 0.07], colour: pick(['#d8342c', '#f2c21a', '#1f52b4', '#f4f0e0', '#1f8a4a']) });
        many(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), tins, false);
      }
    });

    // ---- The moment.
    const litter: { at: P; scale: P; turn: P; colour: string }[] = [];
    const litterCount = Math.round(mix(14, 70, mood.wear * 0.6 + mood.density * 0.4)) + (a.moment === 'raid' ? 30 : 0);
    for (let i = 0; i < litterCount; i++) litter.push({ at: [(random() - 0.5) * W * 0.96, 0.008, mix(-3.4, 3.0, random() ** 1.6 * (random() > 0.5 ? 1 : 0.3))], scale: [0.07 + random() * 0.1, 0.006, 0.05 + random() * 0.07], turn: [0, random() * 3, 0], colour: pick(['#dfe9ec', '#dfe9ec', '#eef2f0', '#1e1e20', '#2a62c8', '#c8322a', '#e8c020', '#d8c08a']) });
    many(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), [...litter, ...flotsam], false);
    const dustPuffs: THREE.Mesh[] = [];
    const cloud = (at: P, size: number, colour: string, opacity: number) => {
      const puff = s.ball([size, size * 0.6, size], at, new THREE.MeshStandardMaterial({ color: colour, transparent: true, opacity, roughness: 1, depthWrite: false }), 8);
      puff.castShadow = puff.receiveShadow = false;
      puff.userData.size = size;
      dustPuffs.push(puff);
    };
    if (a.moment === 'left') {
      const trackMat = s.material(a.air === 'clear' ? '#5a4632' : '#a5875f');
      for (const z of [3.5, 5.0]) { const track = s.tube([[1.5, 0.05, z - 0.9], [4, 0.05, z - 0.5], [6.5, 0.05, z - 0.1], [W / 2 - 0.1, 0.05, z]], 0.09, trackMat); track.scale.y = 0.08; track.position.y = 0.046; track.castShadow = false; }
      for (let i = 0; i < 7; i++) cloud([5 + random() * 3.6, 0.3 + random() * 0.5, 3.4 + random() * 1.8], 0.5 + random() * 0.6, a.air === 'exhaust' ? '#77736c' : '#c9ad82', 0.3);
      figure(3.6 + random(), 2.6, 1.3, 'bag');
      s.box([0.24, 0.03, 0.1], [5.6, 0.07, 3.5], s.material('#2a62c8')).rotation.y = 0.7;
    } else if (a.moment === 'rush') {
      const crowd = 5 + Math.round(mood.density * 5);
      for (let i = 0; i < crowd; i++) figure(sx + 0.9 + (random() - 0.5) * 2.4, sz - 0.4 - random() * 1.5 + (i % 2) * 1.2, 0.2 + (random() - 0.5) * 1.2, pick(['none', 'bag', 'bag', 'basin']));
      for (let i = 0; i < 3; i++) figure(7.6 + (random() - 0.5) * 1.2, 1.2 + random() * 1.4, -0.6 + random(), pick(['bag', 'basin']));
    } else if (a.moment === 'raid') {
      const stool = s.cylinder(0.17, 0.21, 0.44, [-3.9, 0.2, -1.0], s.material('#2a62c8'), 12);
      stool.rotation.set(0, 0.5, Math.PI / 2 - 0.1);
      const tray = s.cylinder(0.4, 0.34, 0.08, [1.2 + random(), 0.05, -1.3], s.material('#b8bcc0', { metalness: 0.6 }), 14);
      tray.rotation.x = 0.1;
      const spilled: { at: P; scale: P; colour: string }[] = [];
      for (let i = 0; i < 26; i++) spilled.push({ at: [1.4 + (random() - 0.5) * 2.4, 0.06, -1.2 + (random() - 0.5) * 1.6], scale: [0.065, 0.065, 0.065], colour: pick(['#e8901c', '#e8a020', '#d8342c']) });
      many(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), spilled, false);
      for (let i = 0; i < 5; i++) s.box([0.24, 0.03, 0.1], [(random() - 0.5) * 12, 0.02, -2 + random() * 3.5], s.material(pick(['#2a62c8', '#c8322a', '#2c8a56']))).rotation.y = random() * 3;
      const cloth = s.box([1.4, 0.02, 1.0], [-1.0, 0.012, 0.2], s.material(pick(['#d86a9a', '#2aa0b0', '#e0a020'])));
      cloth.rotation.y = 0.4;
    } else {
      // A dog asleep in the shade of the wall, and one person sitting on the drain lip.
      const dog = s.material(pick(['#b89468', '#6a4a34', '#d8cdb0']));
      const dx = 6.6, dzz = -3.1;
      s.ball([0.34, 0.14, 0.2], [dx, 0.13, dzz], dog, 10);
      s.ball([0.12, 0.09, 0.1], [dx + 0.36, 0.09, dzz + 0.08], dog, 8);
      s.rod([dx - 0.3, 0.1, dzz], [dx - 0.42, 0.04, dzz + 0.22], 0.025, dog);
      for (const z of [-0.06, 0.1]) s.rod([dx + 0.15, 0.06, dzz + z + 0.1], [dx + 0.42, 0.03, dzz + z + 0.24], 0.025, dog);
      figure(-4.1, dz + 0.85, 0.2, 'none');
    }
    // A few people always wait, however quiet it is.
    if (a.moment !== 'rush' && a.moment !== 'raid') for (let i = 0; i < 1 + Math.round(mood.density * 2); i++) figure(sx + 0.6 + i * 0.7, sz - 0.9 - random() * 0.6, 0.3 + random() * 0.6, pick(['none', 'bag']));
    // Wet ground after rain.
    if (a.air === 'clear') for (let i = 0; i < 6; i++) {
      const puddle = s.cylinder(0.5 + random() * 0.7, 0.5, 0.008, [(random() - 0.5) * W * 0.9, 0.005, -2.6 + random() * 5], wet, 12);
      puddle.scale.z = 0.4 + random() * 0.4;
      puddle.rotation.y = random() * 3;
      puddle.castShadow = false;
    }

    // ---- Haze: low drifts of dust or smoke, and a veil in front of the far wall.
    const hazeColour = { dust: '#eed9aa', exhaust: '#b4b8ba', harmattan: '#efeadc', clear: '#ffffff' }[a.air];
    const hazeAmount = { dust: 0.3, exhaust: 0.3, harmattan: 0.34, clear: 0 }[a.air];
    if (hazeAmount) {
      // The veil thins upward so it has no edge against the sky.
      const fade = document.createElement('canvas');
      fade.width = 4;
      fade.height = 128;
      const fc = fade.getContext('2d')!;
      const gradient = fc.createLinearGradient(0, 0, 0, 128);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(1, 'rgba(255,255,255,1)');
      fc.fillStyle = gradient;
      fc.fillRect(0, 0, 4, 128);
      const alphaMap = new THREE.CanvasTexture(fade);
      for (const [z, h, o] of [[-4.9, 4.4, 1], [-2.9, 2.6, 0.7], [1.2, 1.6, 0.5]] as const) {
        const veil = s.mesh(new THREE.PlaneGeometry(W, h), new THREE.MeshBasicMaterial({ color: hazeColour, map: alphaMap, transparent: true, opacity: hazeAmount * o, depthWrite: false }), [0, h / 2, z]);
        veil.castShadow = veil.receiveShadow = false;
      }
      for (let i = 0; i < 9; i++) cloud([(random() - 0.5) * W * 0.9, 0.25 + random() * 0.5, a.air === 'exhaust' ? 3.2 + random() * 2 : -2 + random() * 6], 0.7 + random() * 0.9, hazeColour, 0.16);
    }

    // ---- Standing places, at true size.
    const camera = world.camera as THREE.OrthographicCamera;
    const key = world.keyLight!;
    const yaw = (24 * Math.PI) / 180, pitch = (27 * Math.PI) / 180;
    world.place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [new THREE.Box3(new THREE.Vector3(-W / 2, -0.3, -D / 2), new THREE.Vector3(W / 2, 1, D / 2))];
      items.forEach((item, index) => {
        const [x, z, room] = slots[index % slots.length];
        // Real metres, unless the thing would not fit its patch of street or would vanish in it.
        let scale = Math.min(1, room / Math.max(item.radius, 0.05), 4.6 / Math.max(item.height, 0.05));
        const least = item.hero ? 1.5 : 0.9;
        if (Math.max(item.height, item.radius * 1.4) * scale < least) scale = Math.min(least / Math.max(item.height, item.radius * 1.4, 0.05), room / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = (item.hero ? 0.08 : yaw * 0.4) + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      boxes.push(visibleBounds(root));
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 80);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          projection.expandByPoint(new THREE.Vector2(p.x, p.y));
        }
      const middle = projection.getCenter(new THREE.Vector2()), size = projection.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.52;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      const span = bounds.getSize(new THREE.Vector3()).length();
      // Late-afternoon sun: low and from the road side, so the wall is lit and shadows run long.
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(mix(-9, 9, mood.daylight), mix(9, 5.5, Math.abs(mood.daylight - 0.5) * 2), 8).normalize().multiplyScalar(span * 1.5));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.55;
      shadow.right = shadow.top = span * 0.55;
      shadow.near = 0.1;
      shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };
    key.shadow.mapSize.set(2048, 2048);
    key.intensity = a.air === 'clear' ? 3.1 : 2.7;

    const speed = mix(0.1, 0.6, mood.energy);
    world.update = (_dt: number, time: number) => {
      dustPuffs.forEach((puff, index) => {
        const size = puff.userData.size as number;
        puff.scale.set(size * (1 + Math.sin(time * speed + index) * 0.15), size * 0.6, size * (1 + Math.cos(time * speed * 0.8 + index * 2) * 0.15));
        puff.position.x += Math.sin(time * speed * 0.5 + index * 1.3) * 0.0015;
      });
      ripples.forEach((ripple, index) => { ripple.position.x = ((ripple.position.x + W / 2 + 0.01 + speed * 0.02) % W) - W / 2; ripple.scale.x = 1 + Math.sin(time * 3 + index) * 0.2; });
    };
    return world;
  },
});
