import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul } from '@conjure/kit';

type City = readonly [string, number];
const SETS: Record<string, { header: string; cities: readonly City[] }> = {
  news: { header: 'WIRE DESK', cities: [['NEW YORK', -5], ['LONDON', 0], ['MOSCOW', 3], ['TOKYO', 9], ['PARIS', 1], ['SYDNEY', 10]] },
  markets: { header: 'MARKETS', cities: [['NEW YORK', -5], ['LONDON', 0], ['FRANKFURT', 1], ['HONG KONG', 8], ['TOKYO', 9], ['CHICAGO', -6]] },
  war: { header: 'SITUATION ROOM', cities: [['WASHINGTON', -5], ['MOSCOW', 3], ['BERLIN', 1], ['HAVANA', -5], ['SAIGON', 7], ['PEKING', 8]] },
  hotel: { header: 'RECEPTION', cities: [['PARIS', 1], ['ROME', 1], ['CAIRO', 2], ['BOMBAY', 5.5], ['RIO', -3], ['NEW YORK', -5]] },
  space: { header: 'MISSION CONTROL', cities: [['HOUSTON', -6], ['THE CAPE', -5], ['ZULU', 0], ['MADRID', 1], ['CANBERRA', 10], ['MOSCOW', 3]] },
  local: { header: 'LOCAL TIME', cities: [['MILLBROOK', 0], ['EAST MILLBROOK', 0], ['THE MALL', 0], ['GRANDMA\'S', 0], ['THE LAKE', 0], ['HERE', 0]] },
};

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineThing({
  questions: {
    cities: choice('Which places do the clocks show?', {
      news: 'A foreign desk: New York, London, Moscow, Tokyo.',
      markets: 'A trading floor: New York, London, Frankfurt, Hong Kong.',
      war: 'A cold-war situation room: Washington, Moscow, Berlin, Havana.',
      hotel: 'A grand hotel reception: Paris, Rome, Cairo, Bombay.',
      space: 'Mission control: Houston, the Cape, Zulu time.',
      local: 'A small-town joke: every clock is a nearby place and they all show the same time.',
    }),
    count: choice('How many clocks are in the row?', { three: 'Three.', four: 'Four.', five: 'Five.', six: 'Six, a long bank.' }),
    style: choice('What style are the clocks?', {
      deco: 'Art deco: octagonal chrome bezels and black faces on a dark glass board.',
      school: 'Round oak schoolhouse clocks with cream faces.',
      plastic: 'White plastic quartz clocks on wood-grain laminate, 1970s.',
      ship: 'Brass porthole clocks on mahogany, a shipping office.',
      flip: 'Flip-digit clocks in brushed aluminium cases.',
      neon: 'Clocks ringed in glowing neon, an all-night bar or a casino.',
    }),
    hour: choice('What time is it in the first city?', {
      small: 'The small hours, about ten past three in the morning.',
      dawn: 'Six o\'clock, dawn.',
      noon: 'High noon exactly.',
      close: 'Five o\'clock, closing time.',
      deadline: 'Five minutes to midnight.',
    }),
    trouble: choice('Are all the clocks running?', {
      fine: 'Yes, all ticking together.',
      one: 'One has stopped, its glass cracked, hours behind the rest.',
      all: 'All of them have stopped at the same instant.',
      missing: 'One has been taken down: a pale circle and two screw holes above its label.',
    }),
    home: noul('Is the first city\'s clock bigger than the rest, the one that matters?'),
    labels: choice('How are the cities labelled?', {
      brass: 'Engraved brass plates.',
      tape: 'Strips of embossed label tape, slightly crooked.',
      card: 'Hand-lettered cards pinned up.',
      lit: 'Backlit glowing signs.',
    }),
    mount: choice('How is the board mounted?', {
      wall: 'Fixed to a section of office wall.',
      posts: 'Freestanding on two steel posts, like a terminal sign.',
      credenza: 'Propped on top of a low steel credenza.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { three: 3, four: 4, five: 5, six: 6 }[a.count];
    const set = SETS[a.cities];
    const R = 0.2, pitch = 0.5;
    const bw = n * pitch + 0.16, bh = 0.9;
    const style = a.style;
    const boardColour = { deco: '#1c2126', school: '#4a2f1b', plastic: '#9a6a3c', ship: '#5a2a1c', flip: '#aab0b2', neon: '#1a1420' }[style];
    const board = s.material(boardColour, { roughness: style === 'deco' ? 0.15 : 0.55, metalness: style === 'flip' ? 0.6 : 0.05 });
    const chrome = s.material('#d2d6d8', { metalness: 0.9, roughness: 0.22 });
    const brass = s.material('#c79a3a', { metalness: 0.85, roughness: 0.28 });
    const dark = s.material('#17181a', { roughness: 0.5 });

    // Mount.
    let cy = 1.44;
    if (a.mount === 'wall') {
      const ww = bw + 0.3, wh = 2.05;
      s.box([ww, wh, 0.08], [0, wh / 2, -0.07], s.material(mood.warmth > 0.5 ? '#d9cfae' : '#b9c4bd', { roughness: 0.85 }));
      s.box([ww, 0.72, 0.012], [0, 0.36, -0.026], s.material(mood.warmth > 0.5 ? '#8a6a44' : '#6f8078', { roughness: 0.7 }));
      s.box([ww + 0.02, 0.05, 0.03], [0, 0.74, -0.02], s.material('#4a3423'));
      s.box([ww + 0.02, 0.12, 0.03], [0, 0.06, -0.02], s.material('#4a3423'));
    } else if (a.mount === 'posts') {
      cy = 1.45;
      for (const side of [-1, 1]) {
        s.cylinder(0.03, 0.03, cy + bh / 2, [side * (bw / 2 - 0.2), (cy + bh / 2) / 2, -0.06], chrome, 14);
        s.box([0.12, 0.03, 0.5], [side * (bw / 2 - 0.2), 0.015, -0.06], dark);
      }
      s.rod([-(bw / 2 - 0.2), 0.4, -0.06], [bw / 2 - 0.2, 0.4, -0.06], 0.015, chrome);
    } else {
      cy = 0.74 + bh / 2 + 0.01;
      const steel = s.material('#8b9391', { metalness: 0.35, roughness: 0.45 });
      s.box([bw + 0.1, 0.62, 0.46], [0, 0.41, 0.12], steel);
      s.box([bw + 0.14, 0.03, 0.5], [0, 0.735, 0.12], s.material('#5f6f66'));
      for (const sx of [-1, 1]) for (const sz of [-0.05, 0.29]) s.cylinder(0.02, 0.015, 0.1, [sx * (bw / 2 - 0.05), 0.05, sz], chrome, 10);
      for (const side of [-1, 1]) { s.box([bw / 2 - 0.02, 0.54, 0.012], [side * (bw / 4 + 0.012), 0.41, 0.352 + (side > 0 ? 0.012 : 0)], steel); s.box([0.02, 0.1, 0.014], [side * 0.08, 0.41, 0.366 + (side > 0 ? 0.012 : 0)], chrome); }
      for (const side of [-1, 1]) s.rod([side * (bw / 2 - 0.1), cy + 0.2, -0.05], [side * (bw / 2 - 0.1), 0.75, -0.11], 0.012, dark);
    }

    // Board and header.
    s.box([bw, bh, 0.04], [0, cy, -0.01], board);
    const rim = style === 'deco' || style === 'flip' ? chrome : style === 'ship' ? brass : s.material(new THREE.Color(boardColour).multiplyScalar(0.6));
    for (const side of [-1, 1]) { s.box([bw + 0.03, 0.025, 0.055], [0, cy + side * bh / 2, -0.005], rim); s.box([0.025, bh + 0.03, 0.055], [side * bw / 2, cy, -0.005], rim); }
    const headerInk = style === 'neon' ? '#ff5ad1' : style === 'deco' ? '#e9d9a8' : style === 'flip' ? '#17181a' : '#f1e6c4';
    const header = s.label(set.header, Math.min(bw - 0.2, 0.9), 0.1, [0, cy + bh / 2 - 0.085, 0.012], headerInk, boardColour);
    if (style === 'neon') { const m = header.material as THREE.MeshStandardMaterial; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 1.2; }

    // Shared painted face.
    const faceColours = { deco: ['#16181b', '#e9d9a8'], school: ['#f1e8cf', '#2a2018'], plastic: ['#fbfbf6', '#1a1a1c'], ship: ['#f6f0dc', '#1b2740'], flip: ['#000', '#fff'], neon: ['#0f0c16', '#f6f0ff'] }[style];
    const faceTexture = paint(256, 256, (g) => {
      g.fillStyle = faceColours[0];
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = faceColours[1];
      g.strokeStyle = faceColours[1];
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = 0; i < 60; i++) {
        const angle = i / 60 * Math.PI * 2, major = i % 5 === 0;
        g.lineWidth = major ? 7 : 2;
        g.beginPath();
        g.moveTo(128 + Math.sin(angle) * (major ? 96 : 108), 128 - Math.cos(angle) * (major ? 96 : 108));
        g.lineTo(128 + Math.sin(angle) * 118, 128 - Math.cos(angle) * 118);
        g.stroke();
      }
      const numerals = style === 'school' || style === 'ship' ? ['XII', 'III', 'VI', 'IX'] : ['12', '3', '6', '9'];
      g.font = `bold ${style === 'deco' ? 40 : 34}px ${style === 'school' || style === 'ship' ? 'serif' : 'sans-serif'}`;
      numerals.forEach((numeral, index) => g.fillText(numeral, 128 + Math.sin(index * Math.PI / 2) * 70, 128 - Math.cos(index * Math.PI / 2) * 70));
    });
    const lit = style === 'neon' || (style !== 'flip' && mood.daylight > 0.8);
    const faceMaterial = new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.5, emissive: lit ? '#ffffff' : '#000000', emissiveMap: lit ? faceTexture : null, emissiveIntensity: lit ? 0.35 : 0 });
    const handMaterial = s.material(faceColours[1], { roughness: 0.4 });
    const redHand = s.material('#d0281f', { roughness: 0.4, emissive: '#d0281f', emissiveIntensity: 0.3 });
    const neonColours = ['#ff3d9a', '#3de0ff', '#ffd23d', '#7dff5a', '#b46bff', '#ff7a2a'];

    const baseHour = { small: 3 + 10 / 60, dawn: 6, noon: 12, close: 17, deadline: 23 + 55 / 60 }[a.hour];
    const stoppedIndex = 1 + Math.floor(random() * (n - 1));
    const seconds: { hand: THREE.Object3D; phase: number }[] = [];
    const minutes: { hand: THREE.Object3D; base: number }[] = [];
    const glows: THREE.MeshStandardMaterial[] = [];
    const clockY = cy - 0.025;
    const labelPaper = { brass: '#c9a24a', tape: '#1c3f8f', card: '#f3ecd6', lit: '#fff4c9' }[a.labels];
    const labelInk = { brass: '#2a1c0c', tape: '#f4f4f4', card: '#b3261e', lit: '#22180a' }[a.labels];

    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * pitch;
      const [name, offset] = set.cities[i];
      const big = a.home && i === 0 ? 1.18 : 1;
      const r = R * big;
      const gone = a.trouble === 'missing' && i === stoppedIndex;
      const stopped = a.trouble === 'all' || (a.trouble === 'one' && i === stoppedIndex);
      let hours = baseHour + (offset - set.cities[0][1]) + (a.cities === 'local' ? 0 : (random() - 0.5) * 0.02);
      if (a.trouble === 'one' && stopped) hours -= 2 + random() * 7;
      hours = ((hours % 24) + 24) % 24;
      const minute = (hours % 1) * 60;

      // Label under each clock.
      const plate = s.label(name, pitch - 0.04, 0.095, [x, cy - bh / 2 + 0.09, 0.014], labelInk, labelPaper);
      if (a.labels === 'tape') plate.rotation.z = (random() - 0.5) * 0.12;
      if (a.labels === 'card') { plate.rotation.z = (random() - 0.5) * 0.08; s.ball([0.008, 0.008, 0.008], [x, cy - bh / 2 + 0.13, 0.02], redHand, 8); }
      if (a.labels === 'lit') { const m = plate.material as THREE.MeshStandardMaterial; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.9; }
      if (a.labels === 'brass') { const m = plate.material as THREE.MeshStandardMaterial; m.metalness = 0.6; m.roughness = 0.35; }

      if (gone) {
        const ghost = s.cylinder(r, r, 0.002, [x, clockY, 0.011], s.material(new THREE.Color(boardColour).lerp(new THREE.Color('#ffffff'), 0.25)), 32);
        ghost.rotation.x = Math.PI / 2;
        for (const side of [-1, 1]) s.cylinder(0.007, 0.007, 0.004, [x + side * r * 0.5, clockY + r * 0.6, 0.013], dark, 8).rotation.x = Math.PI / 2;
        s.tube([[x, clockY + r * 0.2, 0.012], [x + 0.03, clockY - 0.05, 0.03], [x + 0.01, clockY - r * 0.9, 0.035]], 0.003, dark);
        continue;
      }

      if (style === 'flip') {
        const hh = Math.floor(hours), mm = Math.floor(minute);
        const text = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        s.box([0.38 * big, 0.22 * big, 0.12], [x, clockY, 0.06], s.material('#b9bfc1', { metalness: 0.7, roughness: 0.3 }));
        const digits = paint(256, 128, (g) => {
          g.fillStyle = '#101113';
          g.fillRect(0, 0, 256, 128);
          g.fillStyle = stopped ? '#77736a' : '#f4f1e6';
          g.font = 'bold 92px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(text, 128, 68, 236);
          g.fillStyle = '#101113';
          g.fillRect(0, 62, 256, 4);
        });
        s.mesh(new THREE.PlaneGeometry(0.33 * big, 0.165 * big), new THREE.MeshStandardMaterial({ map: digits, roughness: 0.6 }), [x, clockY, 0.1215]);
        continue;
      }

      // Bezel, face and hands.
      const bezelMaterial = style === 'deco' ? chrome : style === 'ship' ? brass : style === 'school' ? s.material('#7a5232', { roughness: 0.5 }) : style === 'plastic' ? s.material('#f4f3ee', { roughness: 0.35 }) : dark;
      const sides = style === 'deco' ? 8 : 40;
      const bezel = s.cylinder(r, r * 1.04, style === 'ship' ? 0.07 : 0.05, [x, clockY, 0.035], bezelMaterial, sides);
      bezel.rotation.x = Math.PI / 2;
      if (style === 'deco') bezel.rotation.y = Math.PI / 8;
      const face = s.mesh(new THREE.CircleGeometry(r * 0.88, 40), faceMaterial, [x, clockY, style === 'ship' ? 0.0712 : 0.0612]);
      const front = face.position.z;
      if (style === 'ship') for (let k = 0; k < 6; k++) s.ball([0.012, 0.012, 0.008], [x + Math.cos(k * Math.PI / 3) * r * 0.95, clockY + Math.sin(k * Math.PI / 3) * r * 0.95, 0.07], brass, 8);
      if (style === 'school') { s.box([0.11 * big, 0.12 * big, 0.04], [x, clockY - r - 0.03, 0.025], bezelMaterial); s.cylinder(0.022, 0.022, 0.006, [x, clockY - r - 0.035, 0.05], brass, 14).rotation.x = Math.PI / 2; }
      if (style === 'neon') {
        const colour = neonColours[(i + Math.floor(mood.cheer * 3)) % neonColours.length];
        const glow = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: stopped ? 0.15 : 2.2, roughness: 0.3 });
        s.ring(r * 1.02, 0.012, [x, clockY, 0.07], glow);
        if (!stopped) glows.push(glow);
      }
      const hand = (length: number, width: number, material: THREE.Material, angle: number, z: number) => {
        const geometry = new THREE.BoxGeometry(width, length, 0.004);
        geometry.translate(0, length * 0.38, 0);
        const mesh = s.mesh(geometry, material, [x, clockY, front + z]);
        mesh.rotation.z = -angle;
        return mesh;
      };
      hand(r * 0.48, 0.016, handMaterial, (hours % 12) / 12 * Math.PI * 2, 0.004);
      const minuteHand = hand(r * 0.74, 0.011, handMaterial, minute / 60 * Math.PI * 2, 0.008);
      const start = random() * 60;
      const second = hand(r * 0.8, 0.004, redHand, start / 60 * Math.PI * 2, 0.012);
      s.cylinder(0.012, 0.012, 0.016, [x, clockY, front + 0.008], style === 'deco' ? chrome : dark, 10).rotation.x = Math.PI / 2;
      if (stopped) {
        const crack = s.material('#d9dedf', { roughness: 0.2 });
        const cx0 = x + (random() - 0.5) * r * 0.6, cy0 = clockY + (random() - 0.5) * r * 0.6;
        for (let k = 0; k < 5; k++) { const angle = random() * 6.28, len = r * (0.4 + random() * 0.5); s.rod([cx0, cy0, front + 0.016], [cx0 + Math.cos(angle) * len, cy0 + Math.sin(angle) * len, front + 0.016], 0.0018, crack); }
        if (a.trouble === 'one') bezel.rotation.z = 0;
      } else {
        seconds.push({ hand: second, phase: start });
        minutes.push({ hand: minuteHand, base: minute });
      }
    }

    return s.finish({
      update: (_dt, time) => {
        const speed = 0.6 + mood.energy * 0.8;
        for (const { hand, phase } of seconds) hand.rotation.z = -Math.floor(phase + time * speed) / 60 * Math.PI * 2;
        for (const { hand, base } of minutes) hand.rotation.z = -(base + time * speed / 60) / 60 * Math.PI * 2;
        for (const [index, glow] of glows.entries()) glow.emissiveIntensity = 2.2 + Math.sin(time * 9 + index * 2) * 0.25 * (0.3 + mood.wear);
      },
    });
  },
});
