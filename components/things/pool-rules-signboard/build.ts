import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const paint = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const STYLES = {
  'english-1930s': { bg: '#f3ecd6', ink: '#1d2f55', band: '', bandInk: '#1d2f55', font: 'serif', title: 'BATHING REGULATIONS', sub: 'BY ORDER OF THE BATHS COMMITTEE', caps: ['NO RUNNING', 'NO BOMBING', 'NO PETTING', 'NO DIVING', 'NO GLASS', 'NO SMOKING'], water: 'WATER TODAY', depth: 'DEPTH', closed: ['CLOSED', 'FOR THE SEASON'], lost: ['LOST', 'small boy', 'red trunks', 'ask at kiosk'], full: 'POOL FULL', imperial: true },
  'english-1970s': { bg: '#f7f5ee', ink: '#1b1d22', band: '#1f5fa8', bandInk: '#ffffff', font: 'sans-serif', title: 'POOL RULES', sub: 'FOR YOUR SAFETY', caps: ['NO RUNNING', 'NO BOMBING', 'NO PETTING', 'NO DIVING', 'NO GLASS', 'NO SMOKING'], water: 'WATER TEMP', depth: 'DEPTH', closed: ['CLOSED', 'UNTIL MAY'], lost: ['LOST', 'girl aged 6', 'blue armbands', 'see lifeguard'], full: 'POOL FULL', imperial: true },
  french: { bg: '#1b3f8f', ink: '#ffffff', band: '', bandInk: '#ffffff', font: 'sans-serif', title: 'RÈGLEMENT DU BASSIN', sub: 'PISCINE MUNICIPALE', caps: ['NE PAS COURIR', 'PAS DE BOMBES', 'TENUE CORRECTE', 'NE PAS PLONGER', 'PAS DE VERRE', 'NE PAS FUMER'], water: 'EAU DU JOUR', depth: 'PROFONDEUR', closed: ['FERMÉ', 'JUSQU\'AU PRINTEMPS'], lost: ['PERDU', 'petit garçon', 'maillot rouge', 'voir le kiosque'], full: 'COMPLET', imperial: false },
  german: { bg: '#f6f4ec', ink: '#141414', band: '#141414', bandInk: '#f6f4ec', font: 'sans-serif', title: 'BADEORDNUNG', sub: 'STÄDTISCHES FREIBAD', caps: ['NICHT RENNEN', 'NICHT SPRINGEN', 'NICHT KNUTSCHEN', 'KEIN KOPFSPRUNG', 'KEIN GLAS', 'NICHT RAUCHEN'], water: 'WASSER HEUTE', depth: 'WASSERTIEFE', closed: ['GESCHLOSSEN', 'BIS ZUM FRÜHJAHR'], lost: ['VERMISST', 'kleiner Junge', 'rote Badehose', 'bitte zur Kasse'], full: 'ÜBERFÜLLT', imperial: false },
  modern: { bg: '#ffffff', ink: '#12313a', band: '#0d7a94', bandInk: '#ffffff', font: 'sans-serif', title: 'POOL SAFETY', sub: 'please follow the lifeguards', caps: ['No running', 'No bombing', 'No heavy petting', 'No diving', 'No glass', 'No smoking'], water: 'Water today', depth: 'Depth', closed: ['CLOSED', 'for the winter'], lost: ['LOST', 'boy, age 5', 'red shorts', 'tell a lifeguard'], full: 'POOL FULL', imperial: false },
} as const;

const TEMPS = {
  icy: { f: 52, c: 11 }, bracing: { f: 59, c: 15 }, fair: { f: 66, c: 19 }, balmy: { f: 73, c: 23 }, soup: { f: 82, c: 28 },
} as const;

function pictogram(c: Ctx, kind: number, cx: number, cy: number, r: number) {
  const u = r / 40;
  c.save();
  c.translate(cx, cy);
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.scale(u, u);
  c.strokeStyle = c.fillStyle = '#16181c'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
  const dot = (x: number, y: number, rad: number) => { c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill(); };
  const line = (...p: number[]) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  const wave = (y: number) => { c.save(); c.lineWidth = 3.5; c.strokeStyle = '#2a7fc4'; c.beginPath(); c.moveTo(-28, y); for (let x = -28; x < 28; x += 14) c.quadraticCurveTo(x + 3.5, y - 5, x + 7, y), c.quadraticCurveTo(x + 10.5, y + 5, x + 14, y); c.stroke(); c.restore(); };
  if (kind === 0) {
    dot(7, -22, 6.5); line(4, -13, -2, 4); line(-2, 4, 10, 11, 8, 24); line(-2, 4, -12, 11, -23, 8); line(2, -9, 14, -5, 19, -13); line(2, -9, -10, -12, -15, -3);
  } else if (kind === 1) {
    dot(0, -17, 6.5); dot(0, -1, 11); line(-9, -6, -12, 6, 0, 10); wave(20);
    c.lineWidth = 3.5; line(-17, 14, -24, 0); line(17, 14, 24, 0); line(-9, 11, -15, -8); line(9, 11, 15, -8);
  } else if (kind === 2) {
    dot(-9, -4, 8.5); dot(9, -4, 8.5);
    c.beginPath(); c.ellipse(-11, 22, 11, 14, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(11, 22, 11, 14, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#d8232a'; c.beginPath(); c.moveTo(0, -17); c.bezierCurveTo(-10, -30, -16, -18, 0, -9); c.bezierCurveTo(16, -18, 10, -30, 0, -17); c.fill();
  } else if (kind === 3) {
    wave(20); dot(9, 7, 6); line(5, 1, -9, -17); line(-9, -17, -17, -27); line(9, 7, 15, 15); line(2, -4, 12, 13);
  } else if (kind === 4) {
    c.fillRect(-7, -6, 14, 28); c.fillRect(-3, -24, 6, 20); c.fillStyle = '#ffffff'; c.fillRect(-4, 2, 8, 9);
  } else {
    c.fillRect(-22, 0, 30, 8); c.fillStyle = '#c2622a'; c.fillRect(8, 0, 9, 8);
    c.lineWidth = 3; c.strokeStyle = '#6c7278'; c.beginPath(); c.moveTo(14, -4); c.bezierCurveTo(4, -12, 22, -16, 12, -26); c.stroke();
  }
  c.restore();
  c.strokeStyle = '#d8232a'; c.lineWidth = r * 0.17;
  c.beginPath(); c.arc(cx, cy, r * 0.94, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(cx - r * 0.66, cy - r * 0.66); c.lineTo(cx + r * 0.66, cy + r * 0.66); c.stroke();
}

export default defineThing({
  questions: {
    style: choice('What language and era is the board?', {
      'english-1930s': 'Cream vitreous enamel with navy serif lettering: BATHING REGULATIONS, by order of the Baths Committee.',
      'english-1970s': 'A municipal blue header and bold sans-serif POOL RULES, the classic British leisure-centre poster.',
      french: 'Deep blue enamel with white capitals, like a French street sign: RÈGLEMENT DU BASSIN.',
      german: 'Stark black on white: BADEORDNUNG, orderly and unarguable.',
      modern: 'A clean laminated safety panel in teal and white with friendly lower-case captions.',
    }),
    temperature: choice('What water temperature is chalked on the slate?', {
      icy: 'Shockingly cold: 52°F / 11°C.',
      bracing: 'Bracing: 59°F / 15°C.',
      fair: 'Fair, for an unheated pool: 66°F / 19°C.',
      balmy: 'Balmy: 73°F / 23°C.',
      soup: 'Like soup at the end of a heatwave: 82°F / 28°C.',
      wiped: 'Wiped to a grey smear: nobody has chalked it today.',
    }),
    depth: choice('What does the depth marker say?', {
      shallow: 'The shallow end, about three feet.',
      middle: 'The middle, about five feet.',
      deep: 'A red DEEP WATER plate, over twelve feet.',
    }),
    added: choice('What has been added to the board?', {
      nothing: 'Nothing: it is exactly as the council left it.',
      closed: 'A CLOSED FOR THE SEASON notice pasted across it.',
      'lost-child': 'A handwritten lost-child note pinned to a corner.',
      graffiti: 'Spray-paint tags and a felt-tip moustache or two.',
      towel: 'A wet towel and a pair of goggles hung over the corner to dry.',
      full: 'A POOL FULL board hung from hooks beneath.',
    }),
    mount: choice('How is it mounted?', {
      posts: 'On two stout painted timber posts with ball finials.',
      tubular: 'In a tubular steel frame on round weighted feet.',
      easel: 'On a freestanding A-frame, leaning back, moved about each morning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STYLES[a.style];
    const W = 1.3, HB = 1.05;
    const board = new THREE.Group();
    s.root.add(board);
    const into = <T extends THREE.Object3D>(mesh: T) => { board.add(mesh); return mesh; };
    const flat = (map: THREE.Texture, w: number, h: number, x: number, y: number, z: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
      into(s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.35 + mood.wear * 0.4, ...extra }), [x, y, z]));
    const rustSpots = (c: Ctx, w: number, h: number, amount: number) => {
      const spots = Math.round(amount * mood.wear * mood.wear);
      for (let i = 0; i < spots; i++) {
        const edge = random() < 0.6;
        const x = edge ? (random() < 0.5 ? random() * 14 : w - random() * 14) : random() * w;
        const y = edge && random() < 0.5 ? (random() < 0.5 ? random() * 14 : h - random() * 14) : random() * h;
        const r = 2 + random() * 7;
        c.fillStyle = '#7a3d1c'; c.beginPath(); c.ellipse(x, y, r, r * (0.7 + random() * 0.6), random() * 3, 0, 7); c.fill();
        c.fillStyle = '#2b1a12'; c.beginPath(); c.arc(x, y, r * 0.45, 0, 7); c.fill();
        c.fillStyle = 'rgba(122,61,28,0.35)'; c.fillRect(x - r * 0.4, y, r * 0.8, 12 + random() * 40);
      }
      c.fillStyle = `rgba(214,206,190,${mood.wear * 0.25})`; c.fillRect(0, 0, w, h);
    };

    // Main enamel board.
    const mainMap = paint(640, 512, (c) => {
      c.fillStyle = st.bg; c.fillRect(0, 0, 640, 512);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (st.band) { c.fillStyle = st.band; c.fillRect(0, 0, 640, 104); }
      else { c.strokeStyle = st.ink; c.lineWidth = 5; c.strokeRect(12, 12, 616, 488); c.lineWidth = 2; c.strokeRect(22, 22, 596, 468); }
      c.fillStyle = st.bandInk;
      c.font = `bold ${st.title.length > 14 ? 44 : 58}px ${st.font}`; c.fillText(st.title, 320, 52, 580);
      c.font = `${a.style === 'modern' ? '' : 'bold '}19px ${st.font}`; c.fillText(st.sub, 320, 90, 560);
      if (!st.band) { c.fillRect(120, 106, 400, 3); }
      for (let i = 0; i < 6; i++) {
        const cx = 114 + (i % 3) * 206, cy = 186 + Math.floor(i / 3) * 190;
        pictogram(c, i, cx, cy, 62);
        c.fillStyle = st.ink; c.font = `bold ${a.style === 'modern' ? 24 : 22}px ${st.font}`;
        c.fillText(st.caps[i], cx, cy + 86, 196);
      }
      if (a.added === 'graffiti') {
        const inks = ['#e0218a', '#16181c', '#2fb34a', '#f2c21c'];
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let k = 0; k < 2; k++) {
          c.strokeStyle = inks[Math.floor(random() * inks.length)]; c.lineWidth = 12 + random() * 6; c.globalAlpha = 0.85;
          let x = 60 + random() * 200, y = 180 + random() * 220;
          c.beginPath(); c.moveTo(x, y);
          for (let j = 0; j < 6; j++) { const nx = x + 40 + random() * 70, ny = y + (random() - 0.5) * 190; c.quadraticCurveTo(x + 30, ny - 40, nx, ny); x = nx; y = ny; }
          c.stroke();
        }
        c.globalAlpha = 1; c.fillStyle = '#16181c'; c.font = 'italic bold 34px sans-serif';
        c.save(); c.translate(430, 300); c.rotate(-0.15); c.fillText(['KEV 4 SAL', 'DAZ WOZ ERE', 'BOMB SQUAD', 'SK8'][Math.floor(random() * 4)], 0, 0); c.restore();
        // A moustache on the petting couple.
        c.strokeStyle = '#16181c'; c.lineWidth = 5; c.beginPath(); c.moveTo(498, 190); c.quadraticCurveTo(520, 176, 534, 192); c.quadraticCurveTo(548, 176, 566, 190); c.stroke();
      }
      rustSpots(c, 640, 512, 46);
    });
    const yb = 1.76;
    const enamel = s.material(st.bg, { roughness: 0.4 });
    into(s.box([W + 0.04, HB + 0.04, 0.03], [0, yb, 0], a.style === 'english-1970s' || a.style === 'modern' ? s.material('#d9dcdc') : enamel));
    flat(mainMap, W, HB, 0, yb, 0.017);
    const bolt = s.material('#8d9396', { metalness: 0.7, roughness: 0.4 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) into(s.cylinder(0.014, 0.014, 0.01, [sx * (W / 2 - 0.04), yb + sy * (HB / 2 - 0.04), 0.02], bolt, 8)).rotation.x = Math.PI / 2;

    // Depth marker plate.
    const deep = a.depth === 'deep';
    const figure = st.imperial ? { shallow: '3 FT', middle: '5 FT', deep: '12 FT 6' }[a.depth] : { shallow: '0,90 m', middle: '1,50 m', deep: '3,80 m' }[a.depth];
    const depthMap = paint(256, 176, (c) => {
      c.fillStyle = deep ? '#c9232b' : '#f7f5ee'; c.fillRect(0, 0, 256, 176);
      c.strokeStyle = deep ? '#ffffff' : '#c9232b'; c.lineWidth = 8; c.strokeRect(8, 8, 240, 160);
      c.fillStyle = deep ? '#ffffff' : '#16181c'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold 30px ${st.font}`; c.fillText(deep && st.imperial ? 'DEEP WATER' : st.depth.toUpperCase(), 128, 46, 220);
      c.font = `bold 66px ${st.font}`; c.fillText(figure, 128, 112, 224);
      rustSpots(c, 256, 176, 14);
    });
    const yl = 0.95;
    into(s.box([0.52, 0.37, 0.02], [-0.37, yl, 0], s.material(deep ? '#c9232b' : '#f7f5ee')));
    flat(depthMap, 0.5, 0.35, -0.37, yl, 0.012);

    // The slate with today's water temperature.
    const temp = a.temperature === 'wiped' ? null : TEMPS[a.temperature];
    const slateMap = paint(256, 192, (c) => {
      c.fillStyle = '#262c2b'; c.fillRect(0, 0, 256, 192);
      for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(235,235,225,${0.03 + random() * 0.06})`; c.beginPath(); c.ellipse(random() * 256, random() * 192, 20 + random() * 50, 8 + random() * 16, random() * 3, 0, 7); c.fill(); }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(245,244,236,0.92)';
      c.font = `bold 26px ${st.font}`; c.fillText(st.water.toUpperCase(), 128, 34, 230);
      c.fillRect(30, 54, 196, 2);
      c.save(); c.translate(128, 122); c.rotate((random() - 0.5) * 0.12);
      if (temp) {
        c.font = 'italic bold 92px sans-serif';
        c.fillStyle = a.temperature === 'icy' ? 'rgba(170,215,245,0.95)' : a.temperature === 'soup' ? 'rgba(250,205,150,0.95)' : 'rgba(245,244,236,0.95)';
        c.fillText(st.imperial ? `${temp.f}°F` : `${temp.c}°C`, 0, 0, 220);
      } else {
        for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(235,235,225,${0.1 + random() * 0.12})`; c.beginPath(); c.ellipse((random() - 0.5) * 120, (random() - 0.5) * 50, 50 + random() * 40, 12 + random() * 10, (random() - 0.5) * 0.6, 0, 7); c.fill(); }
      }
      c.restore();
    });
    const timber = s.material('#8a6238', { roughness: 0.8 });
    into(s.box([0.68, 0.5, 0.03], [0.29, yl - 0.03, 0], timber));
    flat(slateMap, 0.6, 0.42, 0.29, yl - 0.03, 0.017, { roughness: 0.95 });
    into(s.box([0.5, 0.03, 0.05], [0.29, yl - 0.275, 0.03], timber));
    const chalk = into(s.cylinder(0.011, 0.011, 0.07, [0.2 + random() * 0.2, yl - 0.25, 0.04], s.material('#f4f2ea'), 8));
    chalk.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.4;
    into(s.box([0.09, 0.03, 0.035], [0.1, yl - 0.245, 0.035], s.material('#b9a27a', { roughness: 0.95 })));

    // Era flourishes above the board.
    const top = yb + HB / 2;
    if (a.style === 'english-1930s') {
      into(s.box([W * 0.7, 0.09, 0.05], [0, top + 0.065, 0], enamel));
      into(s.box([W * 0.4, 0.1, 0.05], [0, top + 0.16, 0], enamel));
      into(s.label('LIDO', W * 0.34, 0.08, [0, top + 0.16, 0.027], st.ink, st.bg));
    } else if (a.style === 'french') {
      into(s.cylinder(0.11, 0.11, 0.03, [0, top + 0.13, 0], enamel, 24)).rotation.x = Math.PI / 2;
      into(s.label('P', 0.12, 0.12, [0, top + 0.13, 0.017], '#ffffff', st.bg));
    } else if (a.style === 'modern') {
      into(s.box([W + 0.04, 0.05, 0.04], [0, top + 0.045, 0], s.material('#0d7a94')));
    }

    // Additions.
    const paper = '#f4efdf';
    if (a.added === 'closed') {
      const map = paint(512, 224, (c) => {
        c.fillStyle = paper; c.fillRect(0, 0, 512, 224);
        c.strokeStyle = '#c9232b'; c.lineWidth = 10; c.strokeRect(10, 10, 492, 204);
        c.fillStyle = '#c9232b'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 104px sans-serif'; c.fillText(st.closed[0], 256, 88, 460);
        c.fillStyle = '#16181c'; c.font = 'bold 40px sans-serif'; c.fillText(st.closed[1], 256, 172, 450);
      });
      const notice = flat(map, 1.08, 0.47, 0.02, yb - 0.04, 0.024, { roughness: 0.9 });
      notice.rotation.z = -0.16 + (random() - 0.5) * 0.12;
      for (const sx of [-1, 1]) into(s.box([0.12, 0.05, 0.004], [sx * 0.5, yb - 0.04 - sx * -0.08 * Math.sign(notice.rotation.z), 0.027], s.material('#c9b98a', { roughness: 0.9 }))).rotation.z = sx * 0.7;
    } else if (a.added === 'lost-child') {
      const map = paint(200, 240, (c) => {
        c.fillStyle = '#fbf7e6'; c.fillRect(0, 0, 200, 240);
        c.fillStyle = '#c9232b'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 52px sans-serif'; c.fillText(st.lost[0], 100, 40, 180);
        c.fillStyle = '#1d2f8a'; c.font = 'italic 28px sans-serif';
        st.lost.slice(1).forEach((text, i) => c.fillText(text, 100, 96 + i * 38, 184));
        c.strokeStyle = '#1d2f8a'; c.lineWidth = 3; c.beginPath(); c.arc(100, 212, 14, 0, 7); c.stroke();
        c.beginPath(); c.arc(94, 208, 1.5, 0, 7); c.arc(106, 208, 1.5, 0, 7); c.stroke(); c.beginPath(); c.arc(100, 214, 7, 0.2, Math.PI - 0.2); c.stroke();
      });
      const note = flat(map, 0.34, 0.41, W / 2 - 0.22, yb - HB / 2 + 0.22, 0.026, { roughness: 0.95, side: THREE.DoubleSide });
      note.rotation.z = 0.12 + (random() - 0.5) * 0.2; note.rotation.x = 0.06;
      into(s.ball([0.018, 0.018, 0.012], [W / 2 - 0.22, yb - HB / 2 + 0.4, 0.034], s.material('#d8232a', { roughness: 0.3 }), 10));
    } else if (a.added === 'towel') {
      const map = paint(64, 64, (c) => {
        const pair = mood.cheer > 0.5 ? ['#f2a51c', '#fbf3df'] : ['#3d6f8f', '#e6e1d4'];
        for (let i = 0; i < 8; i++) { c.fillStyle = pair[i % 2]; c.fillRect(i * 8, 0, 8, 64); }
      });
      const cloth = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      const tx = -W / 2 + 0.24;
      into(s.box([0.4, 0.62, 0.03], [tx, top - 0.3, 0.04], cloth)).rotation.z = 0.05;
      into(s.box([0.4, 0.06, 0.1], [tx, top + 0.035, 0], cloth));
      into(s.box([0.4, 0.4, 0.03], [tx, top - 0.18, -0.04], cloth));
      const strap = s.material('#16181c');
      into(s.ring(0.12, 0.008, [W / 2 - 0.02, top - 0.11, 0.03], strap, Math.PI)).rotation.z = Math.PI;
      for (const sx of [-1, 1]) into(s.ball([0.035, 0.028, 0.02], [W / 2 - 0.02 + sx * 0.04, top - 0.235, 0.035], s.material('#3aa0d8', { roughness: 0.2 }), 10));
    } else if (a.added === 'full') {
      const map = paint(256, 96, (c) => {
        c.fillStyle = '#c9232b'; c.fillRect(0, 0, 256, 96);
        c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 56px sans-serif'; c.fillText(st.full, 128, 50, 236);
      });
      const hang = new THREE.Group();
      hang.position.set(0, yl - 0.36, 0.01); hang.rotation.z = (random() - 0.5) * 0.12;
      into(hang);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.02), s.material('#c9232b')); plank.position.y = -0.2; plank.castShadow = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.28), new THREE.MeshStandardMaterial({ map, roughness: 0.5 })); face.position.set(0, -0.2, 0.011);
      hang.add(plank, face);
      for (const sx of [-1, 1]) { const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 5), bolt); chain.position.set(sx * 0.36, -0.01, 0); hang.add(chain); }
    }

    // Mount.
    const half = W / 2 + 0.07;
    if (a.mount === 'posts') {
      const post = s.material(a.style === 'english-1930s' ? '#f1ede2' : a.style === 'french' ? '#27402f' : '#e9e6dc');
      for (const sx of [-1, 1]) {
        s.box([0.1, 2.5, 0.1], [sx * half, 1.25, -0.02], post);
        s.ball([0.07, 0.07, 0.07], [sx * half, 2.56, -0.02], post, 12);
        s.box([0.2, 0.08, 0.2], [sx * half, 0.04, -0.02], s.material('#a9a79c', { roughness: 0.95 }));
      }
      s.box([W + 0.14, 0.05, 0.04], [0, 0.66, -0.03], post);
    } else if (a.mount === 'tubular') {
      const tube = s.material('#cfd5d8', { metalness: 0.8, roughness: 0.3 });
      s.tube([[-half, 0.04, 0], [-half, 2.25, 0], [-half + 0.14, 2.42, 0], [half - 0.14, 2.42, 0], [half, 2.25, 0], [half, 0.04, 0]], 0.026, tube);
      s.rod([-half, 0.62, 0], [half, 0.62, 0], 0.02, tube);
      for (const sx of [-1, 1]) s.cylinder(0.2, 0.22, 0.05, [sx * half, 0.025, 0], s.material('#3a3f44', { roughness: 0.8 }), 20);
    } else {
      const wood = s.material('#b98b54', { roughness: 0.8 });
      const lean = 0.217;
      board.scale.setScalar(0.82);
      board.position.set(0, -0.36, 0.13);
      board.rotation.x = -lean;
      const topY = 2.0, footZ = 0.42;
      for (const sx of [-1, 1]) {
        s.rod([sx * 0.6, 0, footZ], [sx * 0.6, topY, -0.02], 0.028, wood);
        s.rod([sx * 0.6, 0, -footZ - 0.25], [sx * 0.6, topY, -0.02], 0.028, wood);
        s.rod([sx * 0.6, 0.5, footZ * 0.75], [sx * 0.6, 0.5, -(footZ + 0.25) * 0.75], 0.006, bolt);
      }
      s.rod([-0.64, topY, -0.02], [0.64, topY, -0.02], 0.02, bolt);
      s.rod([-0.6, 0.28, footZ * 0.86], [0.6, 0.28, footZ * 0.86], 0.022, wood);
    }

    // Weeds at the feet when it has been left a long time.
    if (mood.wear > 0.55) {
      const weed = s.material('#6f8a4a', { roughness: 0.9 });
      for (let i = 0; i < Math.round(mood.wear * 8); i++) {
        const x = (random() < 0.5 ? -1 : 1) * (half + (random() - 0.5) * 0.25), z = (random() - 0.5) * 0.3;
        s.rod([x, 0, z], [x + (random() - 0.5) * 0.14, 0.12 + random() * 0.2, z + (random() - 0.5) * 0.1], 0.008, weed, 0.002);
      }
    }
    void mix;
    return s.finish();
  },
});
