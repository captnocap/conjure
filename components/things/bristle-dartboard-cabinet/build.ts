import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    darts: choice('Where are the darts?', {
      ton80: 'Three in the triple twenty: a perfect one hundred and eighty.',
      wall: 'One stuck in the panelling well wide of the board, the others scattered low.',
      bull: 'One dead in the bullseye, alone.',
      floor: 'Bounced out and lying on the mat, one left hanging from the wire.',
      spread: 'Three scattered around the board, an ordinary throw.',
      none: 'None: the board is empty and the darts are behind the bar.',
    }),
    score: choice('What is chalked on the scoreboard doors?', {
      fresh: 'A new game: 501 written at the top of both columns.',
      close: 'Columns of crossed-out subtractions down to a tense finish, 32 against 40.',
      cricket: 'A cricket grid, numbers 20 to 15 and bull with strokes and circles.',
      tally: 'Not a game at all: a tally of beers owed, with initials.',
      wiped: 'Wiped to grey smears by a sleeve.',
    }),
    sheet: choice('What is pinned beside the cabinet?', {
      league: 'A typed league fixture sheet with results inked in.',
      cancelled: 'A fixture sheet with CANCELLED scrawled across it in marker.',
      wanted: 'A hand-lettered PLAYERS WANTED notice with tear-off tabs.',
      photo: 'A curling team photograph of last year\'s champions.',
      none: 'Nothing but old pin holes.',
    }),
    wall: choice('What is the wall behind it?', {
      panel: 'Dark tongue-and-groove wood panelling.',
      brick: 'Painted brick, cream gone yellow.',
      plaster: 'Green plaster above a brown dado rail.',
      cork: 'A sheet of cork tiles put up to save the wall.',
    }),
    surround: choice('What frames the board inside the cabinet?', {
      plain: 'Just the cabinet back, black felt.',
      tyre: 'An old rubber tyre surround.',
      red: 'A red foam catch ring.',
    }),
    lamp: noul('Is there a brass picture lamp lit over the board?'),
    doors: choice('How are the cabinet doors?', { open: 'Both open wide.', half: 'One open, one swung nearly shut.', shut: 'Shut for the night.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const WW = 1.7, WH = 2.4, cy = 1.73, R = 0.225, boardZ = 0.085;
    const wood = s.material('#6b4326', { roughness: 0.5 }), dark = s.material('#161617'), brass = s.material('#c9a03c', { metalness: 0.85, roughness: 0.28 });

    // Wall slab, painted with its surface and the pock marks of missed darts.
    const wall = paint(512, 720, (ctx, w, h) => {
      const mm = (x: number, y: number): [number, number] => [w / 2 + x / WW * w, h - y / WH * h];
      if (a.wall === 'panel') {
        ctx.fillStyle = '#5b3b24'; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 34) { ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,220,170'},${0.05 + random() * 0.1})`; ctx.fillRect(x, 0, 34, h); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, 0, 3, h); }
      } else if (a.wall === 'brick') {
        ctx.fillStyle = '#b9ae90'; ctx.fillRect(0, 0, w, h);
        for (let y = 0, r = 0; y < h; y += 22, r++) for (let x = (r % 2) * -32; x < w; x += 64) { ctx.fillStyle = `hsl(42 ${24 + random() * 14}% ${70 + random() * 12}%)`; ctx.fillRect(x + 2, y + 2, 60, 18); }
      } else if (a.wall === 'plaster') {
        ctx.fillStyle = '#5d7a62'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#4a3020'; ctx.fillRect(0, h * 0.62, w, h * 0.38); ctx.fillStyle = '#2f1f14'; ctx.fillRect(0, h * 0.62, w, 10);
      } else {
        ctx.fillStyle = '#b98a55'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '70,40,15' : '235,200,150'},0.35)`; ctx.fillRect(random() * w, random() * h, 3, 3); }
        ctx.strokeStyle = 'rgba(60,35,15,0.6)'; ctx.lineWidth = 2; for (let x = 0; x < w; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = 0; y < h; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(12,8,5,0.85)';
      for (let i = 0; i < mix(25, 260, mood.wear); i++) { const ang = random() * 6.28, d = 0.34 + random() ** 2 * 0.5; const [x, y] = mm(Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.9); ctx.beginPath(); ctx.arc(x, y, 1.6 + random() * 1.6, 0, 7); ctx.fill(); }
    });
    s.box([WW, WH, 0.1], [0, WH / 2, -0.05], s.material('#3a2a1e'));
    s.mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshStandardMaterial({ map: wall, roughness: 0.85 }), [0, WH / 2, 0.001]);
    s.box([WW, 0.14, 0.03], [0, 0.07, 0.015], wood);
    s.box([WW + 0.04, 0.05, 0.14], [0, WH + 0.025, -0.04], wood);

    // Cabinet box, back, optional surround, the board.
    const CW = 0.66, CH = 0.66, CD = 0.1;
    for (const y of [-1, 1]) s.box([CW, 0.025, CD], [0, cy + y * (CH / 2 - 0.0125), CD / 2], wood);
    for (const x of [-1, 1]) s.box([0.025, CH, CD], [x * (CW / 2 - 0.0125), cy, CD / 2], wood);
    s.box([CW - 0.04, CH - 0.04, 0.012], [0, cy, 0.008], dark);
    s.box([CW + 0.06, 0.03, CD + 0.03], [0, cy + CH / 2 + 0.015, CD / 2], wood);
    if (a.surround !== 'plain') s.ring(0.262, 0.04, [0, cy, 0.05], s.material(a.surround === 'tyre' ? '#1d1d1f' : '#b02a2a', { roughness: 0.9 }));
    const face = paint(512, 512, (ctx) => {
      const px = 256 / 225, c = 256;
      ctx.fillStyle = '#121212'; ctx.beginPath(); ctx.arc(c, c, 256, 0, 7); ctx.fill();
      const ring = (r0: number, r1: number, even: string, odd: string) => {
        for (let i = 0; i < 20; i++) { const a0 = -Math.PI / 2 + (i - 0.5) * Math.PI / 10; ctx.fillStyle = i % 2 ? odd : even; ctx.beginPath(); ctx.arc(c, c, r1 * px, a0, a0 + Math.PI / 10); ctx.arc(c, c, r0 * px, a0 + Math.PI / 10, a0, true); ctx.fill(); }
      };
      ring(16, 170, '#17171a', '#e9dcb8'); ring(99, 107, '#c0262c', '#1f8a4c'); ring(162, 170, '#c0262c', '#1f8a4c');
      ctx.fillStyle = '#1f8a4c'; ctx.beginPath(); ctx.arc(c, c, 16 * px, 0, 7); ctx.fill(); ctx.fillStyle = '#c0262c'; ctx.beginPath(); ctx.arc(c, c, 6.5 * px, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(200,200,200,0.7)'; ctx.lineWidth = 1.5;
      for (const r of [6.5, 16, 99, 107, 162, 170]) { ctx.beginPath(); ctx.arc(c, c, r * px, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#e9e4d4'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ORDER.forEach((num, i) => { const ang = -Math.PI / 2 + i * Math.PI / 10; ctx.fillText(String(num), c + Math.cos(ang) * 197 * px, c + Math.sin(ang) * 197 * px); });
      for (let i = 0; i < mood.wear * 500; i++) { const ang = -Math.PI / 2 + (random() - 0.5) * 1.2, d = (60 + random() * 110) * px; ctx.fillStyle = 'rgba(190,170,130,0.35)'; ctx.fillRect(c + Math.cos(ang) * d, c + Math.sin(ang) * d, 3, 3); }
    });
    s.cylinder(R, R, 0.04, [0, cy, boardZ - 0.02], dark, 40).rotation.x = Math.PI / 2;
    s.mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ map: face, roughness: 0.9 }), [0, cy, boardZ + 0.001]);

    // Chalk scoreboard doors.
    const chalk = (side: number) => paint(256, 512, (ctx, w, h) => {
      ctx.fillStyle = '#1c2622'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; for (let i = 0; i < 14; i++) ctx.fillRect(random() * w - 60, random() * h, 160, 26);
      ctx.fillStyle = ctx.strokeStyle = 'rgba(245,245,235,0.92)'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const write = (text: string, y: number, size = 58, x = w / 2) => { ctx.font = `bold ${size}px cursive`; ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.08); ctx.fillText(text, 0, 0, w - 24); ctx.restore(); };
      const strike = (y: number) => { ctx.beginPath(); ctx.moveTo(60, y - 24); ctx.lineTo(196, y - 10); ctx.stroke(); };
      if (a.score === 'fresh') { write(side < 0 ? 'HOME' : 'AWAY', 70, 54); ctx.fillRect(30, 92, w - 60, 5); write('501', 170, 84); }
      else if (a.score === 'close') { write(side < 0 ? 'US' : 'THEM', 60, 50); let v = 501, y = 120; const steps = side < 0 ? [100, 140, 85, 60, 84] : [60, 121, 100, 81, 99]; for (const d of steps) { write(String(v), y, 50); strike(y); v -= d; y += 66; } write(String(side < 0 ? 32 : 40), y + 8, 78); }
      else if (a.score === 'cricket') { ['20', '19', '18', '17', '16', '15', 'B'].forEach((label, i) => { const y = 70 + i * 62; if (side < 0) write(label, y, 48, 200); else write(label, y, 48, 56); const marks = Math.floor(random() * 4); const x = side < 0 ? 80 : 170; if (marks > 0) { ctx.beginPath(); ctx.moveTo(x - 20, y - 36); ctx.lineTo(x + 20, y); ctx.stroke(); } if (marks > 1) { ctx.beginPath(); ctx.moveTo(x + 20, y - 36); ctx.lineTo(x - 20, y); ctx.stroke(); } if (marks > 2) { ctx.beginPath(); ctx.arc(x, y - 18, 26, 0, 7); ctx.stroke(); } }); }
      else if (a.score === 'tally') { write(side < 0 ? 'BEERS' : 'OWED', 64, 54); ['RON', 'DEB', 'SAL', 'MICK', 'JO'].forEach((name, i) => { const y = 136 + i * 74; write(name, y, 36, 62); const k = Math.floor(random() * 9); for (let j = 0; j < k; j++) { if (j % 5 === 4) { ctx.beginPath(); ctx.moveTo(116 + (j - 4) * 14, y - 4); ctx.lineTo(116 + j * 14, y - 30); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(120 + j * 14, y - 32); ctx.lineTo(120 + j * 14, y - 2); ctx.stroke(); } } }); }
      else { for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(230,230,220,${0.05 + random() * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 50 + random() * 50, 16 + random() * 20, random() * 3, 0, 7); ctx.fill(); } }
    });
    for (const side of [-1, 1]) {
      const swing = a.doors === 'shut' ? 0.02 : a.doors === 'half' && side > 0 ? 1.35 + random() * 0.1 : 2.75 + random() * 0.2;
      const hinge = new THREE.Group(); hinge.position.set(side * CW / 2, cy, CD);
      const door = new THREE.Mesh(new THREE.BoxGeometry(CW / 2, CH, 0.02), wood); door.position.x = -side * CW / 4; door.castShadow = true;
      const slate = new THREE.Mesh(new THREE.PlaneGeometry(CW / 2 - 0.04, CH - 0.05), new THREE.MeshStandardMaterial({ map: chalk(side), roughness: 0.95 }));
      slate.position.set(-side * CW / 4, 0, -0.0105); slate.rotation.y = Math.PI;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), brass); knob.position.set(-side * (CW / 2 - 0.03), 0, 0.016);
      hinge.add(door, slate, knob); hinge.rotation.y = -side * (Math.PI - swing) + (side > 0 ? 0 : 0);
      hinge.rotation.y = side * swing;
      s.root.add(hinge);
    }

    // Darts.
    const flights = ['#c0262c', '#1f4fb8', '#f2c21b', '#1f8a4c', '#f4f1e6'];
    const flightColour = flights[Math.floor(random() * flights.length)];
    const dart = (at: P3, droop = 0.2 + random() * 0.25, yawed = (random() - 0.5) * 0.4) => {
      const g = new Sculpture(context);
      g.rod([0, 0, -0.012], [0, 0, 0.03], 0.0015, s.material('#d5d9dc', { metalness: 0.9 }), 0.004);
      g.rod([0, 0, 0.03], [0, 0, 0.085], 0.0065, brass);
      g.rod([0, 0, 0.085], [0, 0, 0.135], 0.003, dark);
      for (const r of [0, Math.PI / 2]) { const f = g.box([0.05, 0.002, 0.045], [0, 0, 0.15], new THREE.MeshStandardMaterial({ color: flightColour, roughness: 0.5, side: THREE.DoubleSide })); f.rotation.z = r + 0.4; }
      g.root.position.set(...at); g.root.rotation.set(droop, yawed, 0, 'YXZ'); g.root.scale.setScalar(1.5);
      s.root.add(g.root);
      return g.root;
    };
    const onBoard = (r: number, angle: number): P3 => [Math.sin(angle) * r, cy + Math.cos(angle) * r, boardZ + 0.004];
    if (a.darts === 'ton80') for (let i = 0; i < 3; i++) dart([(i - 1) * 0.012 + (random() - 0.5) * 0.004, cy + 0.103 + (random() - 0.5) * 0.006, boardZ + 0.004], 0.15 + i * 0.12, (i - 1) * 0.25);
    else if (a.darts === 'wall') { const side = random() < 0.5 ? -1 : 1; dart([side * (0.48 + random() * 0.2), cy + (random() - 0.3) * 0.5, 0.004], 0.5); dart(onBoard(0.15, 2.4 + random())); dart(onBoard(0.19, 3.3 + random())); }
    else if (a.darts === 'bull') dart([0, cy, boardZ + 0.004], 0.12, 0.05);
    else if (a.darts === 'spread') for (let i = 0; i < 3; i++) dart(onBoard(0.04 + random() * 0.13, random() * 6.28));
    else if (a.darts === 'floor') {
      dart(onBoard(0.17, 1 + random() * 4), 0.95, 0.3);
      for (let i = 0; i < 2; i++) { const d = dart([(random() - 0.5) * 0.5, 0.012, 0.35 + random() * 0.5], 0, 0); d.rotation.set(0, random() * 6.28, 0); }
    }

    // Ledge with chalk, duster and spare darts in a glass.
    s.box([0.5, 0.025, 0.09], [0, cy - CH / 2 - 0.1, 0.045], wood);
    for (let i = 0; i < 3; i++) s.box([0.05, 0.012, 0.012], [-0.18 + i * 0.045, cy - CH / 2 - 0.08, 0.05 + random() * 0.02], s.material('#f1eee4')).rotation.y = random() - 0.5;
    s.box([0.1, 0.035, 0.05], [0.02, cy - CH / 2 - 0.07, 0.05], s.material('#8a6a4a', { roughness: 1 }));
    if (a.darts === 'none') {
      s.cylinder(0.036, 0.03, 0.1, [0.18, cy - CH / 2 - 0.0375, 0.05], new THREE.MeshStandardMaterial({ color: '#e4f2f0', transparent: true, opacity: 0.4, roughness: 0.05 }), 12);
      for (let i = 0; i < 3; i++) { const d = dart([0.17 + i * 0.012, cy - CH / 2 - 0.075, 0.05], 0, 0); d.rotation.set(-Math.PI / 2 + (i - 1) * 0.2, 0, (i - 1) * 0.2); }
    }

    // Picture lamp.
    if (a.lamp) {
      s.rod([0, cy + CH / 2 + 0.04, 0.02], [0, cy + CH / 2 + 0.14, 0.2], 0.008, brass);
      s.cylinder(0.035, 0.035, 0.34, [0, cy + CH / 2 + 0.14, 0.2], brass, 12).rotation.z = Math.PI / 2;
      s.box([0.3, 0.012, 0.04], [0, cy + CH / 2 + 0.11, 0.2], new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#ffd98a', emissiveIntensity: mix(0.7, 1.6, mood.cheer) }));
    }

    // Pinned sheet.
    const sx = (random() < 0.5 ? -1 : 1) * 0.64, sy = cy - 0.6 + random() * 0.08;
    if (a.sheet !== 'none') {
      const sheet = paint(256, 340, (ctx, w, h) => {
        ctx.fillStyle = a.sheet === 'photo' ? '#d9cfae' : a.sheet === 'wanted' ? '#f3d94e' : '#f4f1e4'; ctx.fillRect(0, 0, w, h);
        if (a.sheet === 'photo') {
          ctx.fillStyle = '#6a7f8c'; ctx.fillRect(14, 14, w - 28, h - 80); ctx.fillStyle = '#4b6a3c'; ctx.fillRect(14, h - 150, w - 28, 84);
          for (let i = 0; i < 6; i++) { const x = 42 + (i % 3) * 86 + (i > 2 ? 0 : 20) * 0, y = i > 2 ? 150 : 96; ctx.fillStyle = ['#b03a2e', '#2f5a8c', '#3a3a3a'][i % 3]; ctx.fillRect(x - 22, y + 16, 44, 80); ctx.fillStyle = '#e0b890'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#333'; ctx.font = 'bold 26px serif'; ctx.textAlign = 'center'; ctx.fillText('CHAMPIONS', w / 2, h - 28);
        } else if (a.sheet === 'wanted') {
          ctx.fillStyle = '#16130f'; ctx.textAlign = 'center'; ctx.font = 'bold 50px cursive'; ctx.fillText('PLAYERS', w / 2, 74); ctx.fillText('WANTED', w / 2, 132); ctx.font = 'bold 28px cursive'; ctx.fillText('THURSDAYS 8PM', w / 2, 190);
          ctx.strokeStyle = '#16130f'; ctx.lineWidth = 3; for (let x = 32; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 240); ctx.lineTo(x, h); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 240); ctx.lineTo(w, 240); ctx.stroke();
          ctx.fillStyle = '#3a2a1e'; for (let i = 0; i < 8; i++) if (random() < 0.4) ctx.fillRect(i * 32 + 2, 242, 30, h);
        } else {
          ctx.fillStyle = '#222'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText('DARTS LEAGUE', w / 2, 36); ctx.fillRect(16, 48, w - 32, 3);
          for (let i = 0; i < 9; i++) { const y = 74 + i * 29; ctx.fillStyle = '#444'; ctx.fillRect(18, y, 70 + random() * 20, 7); ctx.fillRect(130, y, 60 + random() * 30, 7); ctx.fillStyle = '#1c2a8a'; if (random() < 0.6) { ctx.font = 'bold 20px cursive'; ctx.fillText(`${Math.floor(random() * 8)}-${Math.floor(random() * 8)}`, 224, y + 9); } }
          if (a.sheet === 'cancelled') { ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.5); ctx.fillStyle = '#c0262c'; ctx.font = 'bold 50px sans-serif'; ctx.fillText('CANCELLED', 0, 12); ctx.strokeStyle = '#c0262c'; ctx.lineWidth = 6; ctx.strokeRect(-140, -36, 280, 64); ctx.restore(); }
        }
      });
      const m = s.mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.9, side: THREE.DoubleSide }), [sx, sy, 0.008]);
      m.rotation.z = (random() - 0.5) * 0.16;
      s.ball([0.012, 0.012, 0.008], [sx, sy + 0.18, 0.012], s.material('#c0262c'), 8);
    }

    // Rubber mat and taped toe line.
    const far = 1.55;
    s.box([0.7, 0.012, far + 0.25], [0, 0.006, (far + 0.25) / 2], s.material('#26272a', { roughness: 0.95 }));
    s.box([0.66, 0.004, 0.05], [0, 0.0145, far], s.material(mood.wear > 0.6 ? '#b9b39a' : '#f3d94e', { roughness: 0.8 })).rotation.y = (random() - 0.5) * mood.wear * 0.12;
    for (const x of [-0.31, 0.31]) s.box([0.02, 0.004, far], [x, 0.0145, far / 2], s.material('#8a8d92'));
    if (mood.wear > 0.4) s.cylinder(0.16, 0.16, 0.003, [0.02, 0.0145, far + 0.12], s.material('#3a3b3f', { roughness: 1 }), 16).scale.set(1.6, 1, 0.6);
    return s.finish({ footprint: 0.9 });
  },
});
