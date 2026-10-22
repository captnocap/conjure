import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const TASTES = {
  horror: {
    names: ['RICK', 'MORTICIA', 'GUS'], ink: ['#b0141a', '#141414'], stars: '☠',
    notes: ['SO GROSS!!', 'TOO SCARY 4 U', 'THE HEAD SCENE', 'BANNED IN 9 COUNTRIES', 'WATCH ALONE', 'REAL SLIME!', 'DO NOT EAT FIRST', 'BEST KILLS', 'PART 2 IS BETTER', 'NIGHTMARES 4 A WEEK', 'THE DOG LIVES', 'CURSED TAPE'],
    covers: ['#17141a', '#8f1414', '#2b3a1f', '#3a1238', '#d9380f', '#101a2a'],
  },
  romantic: {
    names: ['JUNE', 'DANNY', 'ROSALIND'], ink: ['#a01c6a', '#5a2a8a'], stars: '♥',
    notes: ['I CRIED 3x', 'HE NEVER CALLED', 'FOR RAINY DAYS', 'TRUE LOVE IS REAL', 'BRING TISSUES', 'WHY, DANIEL', 'THE AIRPORT SCENE', 'WATCH W/ ICE CREAM', 'I STILL BELIEVE', 'TOO REAL', 'CALL YOUR EX (DONT)', 'PERFECT KISS'],
    covers: ['#f08ab4', '#c4161c', '#f6d8c8', '#8a4a9a', '#f6c66a', '#7a1c3c'],
  },
  snob: {
    names: ['JULIAN', 'MARGOT', 'THEO'], ink: ['#141414', '#141414'], stars: '★',
    notes: ['A MASTERWORK.', 'SUBTITLED. DEAL.', 'NOT THE REMAKE', 'PURE CINEMA', '3 HRS. WORTH IT', "YOU WON'T GET IT", 'THE DIRECTORS CUT ONLY', 'SEE: THE LIGHTING', 'ESSENTIAL', 'NOTHING HAPPENS (GOOD)', 'LETTERBOXED!!', 'BEFORE HE SOLD OUT'],
    covers: ['#f2f0e8', '#141414', '#8a8a86', '#f2f0e8', '#b0141a', '#2a2a2c'],
  },
  kid: {
    names: ['TOMMY', 'ZOE', 'MAX'], ink: ['#e0201c', '#1c5ad0', '#1c9a3a', '#e07a10'], stars: '★',
    notes: ['DOGS!!!', 'THE BEST ONE', 'ROBOT FITE', 'I WACHED 40 TIMES', 'FUNY', 'MOM SAYS OK', 'DINOSORS', 'SO COOL', 'THE SONG IS GOOD', 'NOT SCARY', 'HE FARTS', 'AGAIN AGAIN'],
    covers: ['#f2c21a', '#2f8fe0', '#e8443a', '#58b84a', '#f08a1c', '#8a5ad6'],
  },
  oldtimer: {
    names: ['WALT', 'EARL', 'DOLORES'], ink: ['#1c2f8a', '#1c2f8a'], stars: '★',
    notes: ['A REAL PICTURE', "THEY DON'T MAKE EM", 'THE DUKE', 'SAW IT IN 1956', 'NO SWEARING', 'GOOD HORSES', 'MY WIFE LOVED IT', 'TRUE STORY', 'CLASSIC', 'B&W AS GOD INTENDED', 'TWO THUMBS', 'WATCH W/ DAD'],
    covers: ['#b98a52', '#6e1f2c', '#e9e0c6', '#3a4a5a', '#c99a2e', '#4a3a2a'],
  },
} as const;

function coverAtlas() {
  return paint(512, 224, (ctx) => {
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 0, 512, 224);
    const dark = 'rgba(0,0,0,0.6)', light = 'rgba(255,255,255,0.85)';
    ctx.fillStyle = dark; ctx.fillRect(8, 10, 112, 40);
    ctx.fillStyle = light; ctx.fillRect(18, 22, 92, 14);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(64, 118, 40, 0, 7); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.arc(76, 108, 26, 0, 7); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(14, 186, 100, 6);
    ctx.fillStyle = dark; ctx.fillRect(128, 60, 128, 164);
    ctx.fillStyle = light; ctx.fillRect(138, 12, 108, 34);
    ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(192, 112, 30, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(140, 224); ctx.quadraticCurveTo(192, 110, 244, 224); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(384, 0); ctx.lineTo(256, 150); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(384, 40); ctx.lineTo(384, 150); ctx.lineTo(290, 150); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(264, 164, 112, 44);
    ctx.fillStyle = light; ctx.fillRect(274, 176, 92, 8);
    ctx.fillStyle = dark; ctx.fillRect(384, 0, 128, 224);
    ctx.fillStyle = light;
    for (let i = 0; i < 4; i++) ctx.fillRect(396, 20 + i * 36, 104 - (i % 2) * 28, 24);
  });
}

export default defineThing({
  questions: {
    taste: choice('Whose taste is on the shelf?', {
      horror: 'A horror obsessive: black and red covers, notes in dripping red marker.',
      romantic: 'A heartbroken romantic: pink and rose covers, notes in purple with little hearts.',
      snob: 'A film-school snob: stark black-and-white covers, curt notes in neat capitals.',
      kid: "The owner's kid: loud primary covers, crayon notes with wrong spelling.",
      oldtimer: 'The old owner: westerns and war pictures, notes in careful blue ballpoint.',
    }),
    picks: score('How many picks are on it?', ['Two lonely picks', 'A few', 'Most of the shelf', 'Every slot full']),
    cards: choice('What are the recommendations written on?', {
      index: 'White ruled index cards.',
      neon: 'Fluorescent pink, green and orange cards.',
      sticky: 'Yellow sticky notes.',
      torn: 'Torn lined notebook paper.',
    }),
    header: choice('What tops the shelf?', {
      marker: 'A yellow poster board hand-lettered with the clerk\'s name and stars.',
      printed: 'A printed blue STAFF PICKS plaque from head office.',
      chalk: 'A little chalkboard.',
      marquee: 'A miniature cinema marquee edged with light bulbs.',
    }),
    farewell: noul('Is there a farewell note pinned among the cards, the clerk\'s last day?'),
    touch: choice('What personal touch has the clerk added?', {
      none: 'Nothing more.',
      mascot: 'An object that sums up their taste sits on top of the shelf.',
      lights: 'A string of coloured fairy lights is wound round the frame.',
      photo: 'A snapshot of the clerk is taped to the header.',
      rosette: 'An EMPLOYEE OF THE MONTH rosette is pinned to it.',
    }),
    fixture: choice('What is the shelf itself?', {
      slat: 'White slatwall on a boxy base.',
      pine: 'Rough pine boards knocked together.',
      black: 'Black wire and black board.',
      blue: 'Royal blue laminate with a yellow kick, a chain store.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const taste = TASTES[a.taste];
    const name = taste.names[Math.floor(random() * taste.names.length)];
    const W = 0.76, D = 0.34;
    const tones = { slat: ['#eceadf', '#bdb9aa'], pine: ['#c79a5e', '#8a6236'], black: ['#26262a', '#48484e'], blue: ['#1f46a8', '#f2c21a'] }[a.fixture];
    const board = s.material(tones[0], { roughness: 0.65 });
    const trim = s.material(tones[1], { roughness: 0.65 });
    const rowsY = [0.5, 0.83, 1.16];
    const lipZ = (r: number) => -D / 2 + 0.16 + (2 - r) * 0.07;

    // Carcass.
    s.box([W, 0.4, D], [0, 0.2, 0], board);
    s.box([W + 0.01, 0.08, D + 0.01], [0, 0.04, 0], trim);
    s.box([W, 1.02, 0.03], [0, 0.4 + 0.51, -D / 2 + 0.015], board);
    if (a.fixture === 'slat') for (let i = 0; i < 12; i++) s.box([W, 0.006, 0.004], [0, 0.44 + i * 0.082, -D / 2 + 0.032], trim);
    for (const x of [-1, 1]) s.box([0.025, 1.04, 0.07], [x * (W / 2 + 0.0125), 0.92, -D / 2 + 0.035], trim);
    rowsY.forEach((y, r) => {
      const z = lipZ(r);
      s.box([W, 0.02, z + D / 2], [0, y - 0.01, (z - D / 2) / 2], board);
      s.box([W, 0.035, 0.008], [0, y - 0.006, z], trim);
    });

    // Picks: covers and a card under each.
    const atlas = coverAtlas();
    const coverM = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6 });
    const slots: [number, number][] = [];
    for (let r = 2; r >= 0; r--) { const cols = [0, 1, 2, 3].sort(() => random() - 0.5); for (const col of cols) slots.push([r, col]); }
    const n = Math.max(2, Math.round(mix(2, 12, a.picks)));
    const used = slots.slice(0, n);
    const perVariant: { matrix: THREE.Matrix4; colour: THREE.Color }[][] = [[], [], [], []];
    const kidColour = new THREE.Color(taste.covers[Math.floor(random() * taste.covers.length)]);
    const cardTones = { index: ['#f8f6ec'], neon: ['#ff5fb0', '#b8ff3a', '#ff9a1a', '#4ae8e0'], sticky: ['#ffe95a'], torn: ['#f4f2ea'] }[a.cards];
    const notes = [...taste.notes].sort(() => random() - 0.5);
    const cardAtlas = paint(640, 384, (ctx) => {
      for (let i = 0; i < 12; i++) {
        const x0 = (i % 4) * 160, y0 = Math.floor(i / 4) * 128;
        ctx.fillStyle = cardTones[Math.floor(random() * cardTones.length)]; ctx.fillRect(x0, y0, 160, 128);
        if (a.cards === 'index' || a.cards === 'torn') {
          ctx.fillStyle = a.cards === 'index' ? '#e06a6a' : '#9ab8e0'; ctx.fillRect(x0, y0 + 22, 160, 2);
          ctx.fillStyle = 'rgba(110,150,210,0.5)'; for (let l = 1; l < 5; l++) ctx.fillRect(x0, y0 + 22 + l * 22, 160, 1.5);
        }
        const text = notes[i % notes.length].split(' ');
        const lines: string[] = [];
        for (const word of text) { if (lines.length && (lines[lines.length - 1] + ' ' + word).length <= 9) lines[lines.length - 1] += ' ' + word; else lines.push(word); }
        ctx.fillStyle = taste.ink[Math.floor(random() * taste.ink.length)];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const size = Math.min(34, 88 / lines.length, 250 / Math.max(...lines.map((line) => line.length)));
        ctx.font = `${a.taste === 'snob' ? '700' : 'italic 900'} ${size}px ${a.taste === 'snob' ? 'monospace' : '"Comic Sans MS", "Chalkboard SE", cursive'}`;
        lines.slice(0, 3).forEach((line, k) => {
          ctx.save(); ctx.translate(x0 + 80, y0 + 52 + (k - (Math.min(lines.length, 3) - 1) / 2) * size * 1.02); ctx.rotate((random() - 0.5) * (a.taste === 'kid' ? 0.16 : 0.05));
          ctx.fillText(line, 0, 0, 148); ctx.restore();
        });
        ctx.font = '700 20px sans-serif';
        ctx.fillText(taste.stars.repeat(2 + Math.floor(random() * 4)), x0 + 80, y0 + 110);
      }
    });
    const cardM = new THREE.MeshStandardMaterial({ map: cardAtlas, roughness: 0.85, side: THREE.DoubleSide });
    used.forEach(([r, col], i) => {
      const x = (col - 1.5) * 0.178 + (random() - 0.5) * 0.01, y = rowsY[r], z = lipZ(r);
      const colour = (a.taste === 'kid' && random() < 0.5 ? kidColour.clone() : new THREE.Color(taste.covers[Math.floor(random() * taste.covers.length)])).lerp(new THREE.Color('#8e8676'), mood.wear * 0.3);
      const leanBack = -(0.14 + random() * 0.05);
      perVariant[Math.floor(random() * 4)].push({ colour, matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.094, z - 0.045), new THREE.Quaternion().setFromEuler(new THREE.Euler(leanBack, 0, (random() - 0.5) * 0.08 * (1 + mood.wear), 'YXZ')), new THREE.Vector3(1, 1, 1)) });
      const geometry = new THREE.PlaneGeometry(0.145, 0.116);
      const uv = geometry.getAttribute('uv');
      const cu = i % 4, cv = Math.floor(i / 4) % 3;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + cu) / 4, 1 - (1 - uv.getY(k) + cv) / 3);
      const card = s.mesh(geometry, cardM, [x + (random() - 0.5) * 0.012, y - 0.07, z + 0.006 + random() * 0.003]);
      card.rotation.z = (random() - 0.5) * mix(0.06, 0.3, mood.wear * 0.5 + (a.taste === 'kid' ? 0.4 : 0));
      card.rotation.x = 0.05;
      s.box([0.03, 0.012, 0.002], [card.position.x, y - 0.014, z + 0.008], s.material('#d8cfa8', { roughness: 0.9 })).rotation.z = card.rotation.z;
    });
    perVariant.forEach((list, variant) => {
      if (!list.length) return;
      const geometry = new THREE.BoxGeometry(0.105, 0.19, 0.028);
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + variant) / 4);
      const mesh = new THREE.InstancedMesh(geometry, coverM, list.length);
      list.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });

    // Header.
    const hy = 1.42 + 0.14, hz = -D / 2 + 0.03;
    const headText = a.header === 'marker' || a.header === 'chalk' ? `${name}'S PICKS` : 'STAFF PICKS';
    const headTexture = paint(512, 192, (ctx) => {
      const paper = { marker: '#ffe23a', printed: '#1f46a8', chalk: '#26302a', marquee: '#f6f2e2' }[a.header];
      const ink = { marker: taste.ink[0], printed: '#ffffff', chalk: '#f2f2ea', marquee: '#141414' }[a.header];
      ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, 192);
      if (a.header === 'marquee') { ctx.fillStyle = '#b0141a'; ctx.fillRect(0, 0, 512, 22); ctx.fillRect(0, 170, 512, 22); ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 60; y < 170; y += 44) ctx.fillRect(20, y, 472, 2); }
      if (a.header === 'printed') { ctx.fillStyle = '#f2c21a'; ctx.fillRect(0, 150, 512, 14); }
      if (a.header === 'chalk') { ctx.fillStyle = 'rgba(255,255,255,0.07)'; for (let i = 0; i < 30; i++) ctx.fillRect(random() * 512, random() * 192, 60 + random() * 80, 6); }
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const size = Math.min(92, 760 / headText.length);
      ctx.font = `${a.header === 'printed' || a.header === 'marquee' ? '900' : 'italic 900'} ${size}px ${a.header === 'printed' ? 'sans-serif' : a.header === 'marquee' ? 'monospace' : '"Comic Sans MS", "Chalkboard SE", cursive'}`;
      ctx.save(); ctx.translate(256, a.header === 'printed' ? 82 : 96); if (a.header === 'marker') ctx.rotate(-0.03); ctx.fillText(headText, 0, 0, 470); ctx.restore();
      if (a.header === 'marker' || a.header === 'chalk') { ctx.font = '700 34px sans-serif'; ctx.fillText(`${taste.stars} ${taste.stars} ${taste.stars}`, 256, 160); ctx.fillText(taste.stars, 40, 40); ctx.fillText(taste.stars, 472, 40); }
    });
    const hw = W + 0.06, hh = 0.27;
    s.box([hw, hh, 0.03], [0, hy, hz], a.header === 'chalk' ? s.material('#8a6236') : a.header === 'marquee' ? s.material('#b0141a') : board);
    const headFace = new THREE.MeshStandardMaterial({ map: headTexture, roughness: 0.7, emissive: '#ffffff', emissiveMap: headTexture, emissiveIntensity: a.header === 'marquee' ? 0.45 : 0.05 });
    const head = s.mesh(new THREE.PlaneGeometry(hw - 0.03, hh - 0.03), headFace, [0, hy, hz + 0.0165]);
    head.rotation.z = a.header === 'marker' ? (random() - 0.5) * 0.06 : 0;
    const bulbsA = s.material('#fff2a8', { emissive: '#ffd84a', emissiveIntensity: 1.3 });
    const bulbsB = s.material('#fff2a8', { emissive: '#ffd84a', emissiveIntensity: 0.25 });
    if (a.header === 'marquee') {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) { pts.push([-hw / 2 + 0.02 + (i / 12) * (hw - 0.04), hy + hh / 2 - 0.018, hz + 0.02]); pts.push([-hw / 2 + 0.02 + (i / 12) * (hw - 0.04), hy - hh / 2 + 0.018, hz + 0.02]); }
      for (const [group, material] of [[0, bulbsA], [1, bulbsB]] as const)
        s.scatter(new THREE.SphereGeometry(0.012, 8, 6), material, pts.filter((_p, i) => (Math.floor(i / 2) % 2) === group).map((at) => ({ at, size: 1 })));
    }

    // Farewell note.
    if (a.farewell) {
      const texture = paint(320, 256, (ctx) => {
        ctx.fillStyle = '#fbf8ec'; ctx.fillRect(0, 0, 320, 256);
        ctx.fillStyle = 'rgba(110,150,210,0.45)'; for (let l = 1; l < 9; l++) ctx.fillRect(0, l * 28, 320, 2);
        ctx.fillStyle = taste.ink[0]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'italic 900 50px "Comic Sans MS", "Chalkboard SE", cursive';
        ctx.fillText('GOODBYE!', 160, 50, 300);
        ctx.font = 'italic 700 34px "Comic Sans MS", "Chalkboard SE", cursive';
        ctx.fillText('MY LAST DAY', 160, 108, 300); ctx.fillText('IS FRIDAY', 160, 148, 300);
        ctx.fillText(`THANKS — ${name}`, 160, 212, 300);
      });
      const note = s.mesh(new THREE.PlaneGeometry(0.3, 0.24), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }), [(random() - 0.5) * 0.2, 0.72 + random() * 0.1, lipZ(0) + 0.02]);
      note.rotation.z = (random() - 0.5) * 0.25;
      const pin = s.ball([0.012, 0.012, 0.012], [note.position.x, note.position.y + 0.1, note.position.z + 0.006], s.material('#e0201c', { roughness: 0.3 }), 10);
      void pin;
    }

    // Personal touches.
    const topY = 1.42 + hh + 0.01;
    if (a.touch === 'mascot') {
      const x = W / 2 - 0.12, z = -D / 2 + 0.03;
      const bone = s.material('#eee8d6', { roughness: 0.6 }), ink = s.material('#141414');
      if (a.taste === 'horror') {
        s.ball([0.055, 0.06, 0.06], [x, topY + 0.085, z], bone, 16); s.box([0.06, 0.035, 0.05], [x, topY + 0.025, z + 0.012], bone);
        for (const e of [-1, 1]) s.ball([0.014, 0.017, 0.008], [x + e * 0.022, topY + 0.08, z + 0.054], ink, 8);
        for (let i = 0; i < 4; i++) s.box([0.004, 0.02, 0.004], [x - 0.02 + i * 0.013, topY + 0.02, z + 0.038], ink);
      } else if (a.taste === 'romantic') {
        s.lathe([[0, 0], [0.03, 0], [0.032, 0.07], [0.012, 0.1], [0.012, 0.14], [0, 0.14]], s.material('#7fb8a8', { roughness: 0.15 }), [x, topY, z]);
        const droop = mix(0.0, 0.07, mood.wear);
        s.tube([[x, topY + 0.13, z], [x + 0.005, topY + 0.22, z], [x + droop, topY + 0.28 - droop, z + droop * 0.5]], 0.004, s.material('#3a7a3a'));
        s.ball([0.03, 0.03, 0.03], [x + droop, topY + 0.29 - droop * 1.2, z + droop * 0.5], s.material('#c4161c', { roughness: 0.6 }), 12);
      } else if (a.taste === 'snob') {
        const reel = s.cylinder(0.09, 0.09, 0.02, [x - 0.02, topY + 0.09, z], s.material('#b9bfc2', { metalness: 0.8, roughness: 0.3 }), 24);
        reel.rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++) { const hole = s.cylinder(0.024, 0.024, 0.022, [x - 0.02 + Math.cos(i * 1.257) * 0.052, topY + 0.09 + Math.sin(i * 1.257) * 0.052, z], ink, 12); hole.rotation.x = Math.PI / 2; }
      } else if (a.taste === 'kid') {
        const green = s.material('#3fae4a', { roughness: 0.5 });
        s.ball([0.07, 0.045, 0.04], [x, topY + 0.07, z], green, 14);
        s.rod([x + 0.04, topY + 0.08, z], [x + 0.09, topY + 0.16, z], 0.018, green, 0.014); s.ball([0.03, 0.022, 0.022], [x + 0.105, topY + 0.17, z], green, 10);
        s.rod([x - 0.05, topY + 0.07, z], [x - 0.14, topY + 0.03, z], 0.02, green, 0.004);
        for (const lx of [-0.03, 0.03]) for (const lz of [-0.02, 0.02]) s.cylinder(0.012, 0.014, 0.05, [x + lx, topY + 0.025, z + lz], green, 8);
      } else {
        const felt = s.material('#7a5632', { roughness: 0.9 });
        s.lathe([[0, 0.085], [0.04, 0.09], [0.055, 0.03], [0.06, 0.012], [0.12, 0.004], [0.125, 0.012], [0.12, 0]], felt, [x - 0.03, topY, z]);
      }
    }
    if (a.touch === 'lights') {
      const colours = ['#ff3a3a', '#ffd21a', '#3ae06a', '#3a8aff', '#ff6ad0'];
      const pts: { at: [number, number, number]; size: number; color: string }[] = [];
      const path: [number, number, number][] = [];
      for (let i = 0; i <= 44; i++) {
        const t = i / 44;
        const p: [number, number, number] = t < 0.36 ? [-W / 2 - 0.03, 0.42 + (t / 0.36) * 1.26, -D / 2 + 0.08] : t < 0.64 ? [-W / 2 - 0.03 + ((t - 0.36) / 0.28) * (W + 0.06), 1.69 + Math.sin(((t - 0.36) / 0.28) * Math.PI * 3) * 0.02, -D / 2 + 0.06] : [W / 2 + 0.03, 1.68 - ((t - 0.64) / 0.36) * 1.26, -D / 2 + 0.08];
        p[0] += (random() - 0.5) * 0.015; p[1] += (random() - 0.5) * 0.015;
        path.push(p);
        if (i % 2 === 0) pts.push({ at: [p[0], p[1] - 0.012, p[2] + 0.01], size: 1, color: colours[(i / 2) % colours.length] });
      }
      s.tube(path, 0.003, s.material('#1c3a1c'));
      s.scatter(new THREE.SphereGeometry(0.013, 8, 6), s.material('#ffffff', { emissive: '#ffffff', emissiveIntensity: mix(0.25, 0.9, mood.cheer), roughness: 0.3 }), pts);
    }
    if (a.touch === 'photo') {
      const photo = paint(96, 112, (ctx) => {
        ctx.fillStyle = '#f8f6ee'; ctx.fillRect(0, 0, 96, 112);
        ctx.fillStyle = mood.warmth > 0.5 ? '#c98a4a' : '#5a8ab0'; ctx.fillRect(8, 8, 80, 76);
        ctx.fillStyle = '#e8c4a0'; ctx.beginPath(); ctx.arc(48, 42, 17, 0, 7); ctx.fill();
        ctx.fillStyle = '#2a2a3a'; ctx.beginPath(); ctx.moveTo(18, 84); ctx.quadraticCurveTo(48, 44, 78, 84); ctx.fill();
        ctx.fillStyle = '#3a2414'; ctx.beginPath(); ctx.arc(48, 34, 18, Math.PI, 0); ctx.fill();
      });
      const p = s.mesh(new THREE.PlaneGeometry(0.1, 0.117), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.4, side: THREE.DoubleSide }), [W / 2 + 0.03, hy - 0.2, hz + 0.022]);
      p.rotation.z = -0.18 + (random() - 0.5) * 0.2;
      s.box([0.05, 0.016, 0.002], [W / 2 + 0.03, hy - 0.145, hz + 0.024], s.material('#d8cfa8'));
    }
    if (a.touch === 'rosette') {
      const x = -W / 2 - 0.02, y = hy - 0.2, z = hz + 0.03;
      const blue = s.material('#1c4ad0', { roughness: 0.5 }), goldM = s.material('#e8c23a', { metalness: 0.5, roughness: 0.4 });
      const frill = s.cylinder(0.065, 0.065, 0.008, [x, y, z], blue, 14); frill.rotation.x = Math.PI / 2;
      const core = s.cylinder(0.04, 0.04, 0.012, [x, y, z + 0.004], goldM, 18); core.rotation.x = Math.PI / 2;
      for (const d of [-1, 1]) { const tail = s.box([0.035, 0.16, 0.004], [x + d * 0.025, y - 0.12, z - 0.002], blue); tail.rotation.z = d * 0.2; }
    }

    const chase = a.header === 'marquee' ? mix(0.6, 5, mood.energy) : 0;
    return s.finish({
      footprint: 0.5,
      update: chase ? (_dt, time) => { const on = Math.floor(time * chase) % 2 === 0; bulbsA.emissiveIntensity = on ? 1.3 : 0.25; bulbsB.emissiveIntensity = on ? 0.25 : 1.3; } : undefined,
    });
  },
});
