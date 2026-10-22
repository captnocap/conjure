import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const TRADITIONS = {
  dominican: 'A Dominican barbería: turquoise and yellow walls, bulb-framed mirrors, a flag, loud colour and louder music.',
  italian: 'A 1950s Italian-American shop: cream walls over mint tile, one long chrome-trimmed mirror, oxblood chairs, a tricolore.',
  black: 'A Black barbershop: deep red walls over dark panelling, framed photographs and flyers everywhere, debate in the air.',
  turkish: 'A Turkish berber: white walls with a blue tile band, arched mirrors, cologne bottles, tea on a tray, a carpet runner.',
  tokyo: 'A retro Tokyo tokoya: pale walls over blond wood, tidy white-framed mirrors, sky-blue chairs, a noren curtain and a potted plant.',
} as const;
type Trad = keyof typeof TRADITIONS;
const LOOK: Record<Trad, { wall: string; dado: string; rail: string; accent: string; chair: string; frame: string; cabinet: string; top: string; sign: string; ink: string; paper: string; tileA: string; tileB: string; pole: string[] }> = {
  dominican: { wall: '#3fb8b0', dado: '#f0c93a', rail: '#e8563a', accent: '#e8563a', chair: '#c8262c', frame: '#f4efe0', cabinet: '#1f8f92', top: '#f4efe0', sign: 'BARBERIA', ink: '#f4efe0', paper: '#c8262c', tileA: '#f4efe0', tileB: '#1f6f8a', pole: ['#c8202c', '#f4f1e8', '#1f4fa3', '#f4f1e8'] },
  italian: { wall: '#efe6cf', dado: '#a9cdb8', rail: '#2f4a3c', accent: '#8a1f24', chair: '#7a1f24', frame: '#d7dbdc', cabinet: '#ece9df', top: '#26282a', sign: 'BARBER SHOP', ink: '#f4efdc', paper: '#7a1f24', tileA: '#f1ecdc', tileB: '#23262a', pole: ['#1f8a4c', '#f4f1e8', '#c8202c', '#f4f1e8'] },
  black: { wall: '#9a3a2c', dado: '#4a2c1c', rail: '#c9a24c', accent: '#c9a24c', chair: '#1f1f21', frame: '#3a2416', cabinet: '#4a2c1c', top: '#d9d2c2', sign: 'CUTS & CONVERSATION', ink: '#e8c66a', paper: '#1f1f21', tileA: '#e9e2cf', tileB: '#7a2a22', pole: ['#c8202c', '#f4f1e8', '#1f4fa3', '#f4f1e8'] },
  turkish: { wall: '#f1ece0', dado: '#2f6fa8', rail: '#f4efe0', accent: '#c8262c', chair: '#6a1f2b', frame: '#7a4a26', cabinet: '#7a4a26', top: '#ece6d6', sign: 'BERBER', ink: '#f4efe0', paper: '#c8262c', tileA: '#f1ecdc', tileB: '#9a5a3a', pole: ['#c8202c', '#f4f1e8'] },
  tokyo: { wall: '#e9e4d4', dado: '#b98a52', rail: '#8a6436', accent: '#5aa6d6', chair: '#7fbfd6', frame: '#f4f2ea', cabinet: '#d9b98a', top: '#f4f2ea', sign: 'TOKOYA', ink: '#1f3a6a', paper: '#f4f2ea', tileA: '#ece8d8', tileB: '#6fa596', pole: ['#c8202c', '#f4f1e8', '#1f4fa3', '#f4f1e8'] },
};

function paintFlag(c: Ctx, trad: Trad, x: number, y: number, w: number, h: number) {
  if (trad === 'dominican') {
    c.fillStyle = '#f4f1e8'; c.fillRect(x, y, w, h);
    c.fillStyle = '#1f3f9a'; c.fillRect(x, y, w * 0.42, h * 0.4); c.fillRect(x + w * 0.58, y + h * 0.6, w * 0.42, h * 0.4);
    c.fillStyle = '#c8202c'; c.fillRect(x + w * 0.58, y, w * 0.42, h * 0.4); c.fillRect(x, y + h * 0.6, w * 0.42, h * 0.4);
  } else if (trad === 'italian') {
    ['#1f8a4c', '#f4f1e8', '#c8202c'].forEach((tint, i) => { c.fillStyle = tint; c.fillRect(x + (w / 3) * i, y, w / 3 + 1, h); });
  } else if (trad === 'black') {
    ['#c8202c', '#161616', '#1f8a4c'].forEach((tint, i) => { c.fillStyle = tint; c.fillRect(x, y + (h / 3) * i, w, h / 3 + 1); });
  } else if (trad === 'turkish') {
    c.fillStyle = '#d21f2a'; c.fillRect(x, y, w, h);
    c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(x + w * 0.38, y + h / 2, h * 0.27, 0, 6.3); c.fill();
    c.fillStyle = '#d21f2a'; c.beginPath(); c.arc(x + w * 0.44, y + h / 2, h * 0.215, 0, 6.3); c.fill();
    c.fillStyle = '#f4f1e8'; c.beginPath();
    for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283 - 1.57, r = h * (k % 2 ? 0.045 : 0.11); c.lineTo(x + w * 0.6 + Math.cos(t) * r, y + h / 2 + Math.sin(t) * r); }
    c.fill();
  } else {
    c.fillStyle = '#f7f5ee'; c.fillRect(x, y, w, h);
    c.fillStyle = '#c8202c'; c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.3, 0, 6.3); c.fill();
  }
}

export default defineWorld({
  questions: {
    tradition: choice('Whose barber shop is it?', TRADITIONS),
    moment: choice('What moment is it?', {
      saturday: 'A packed Saturday: every lamp on, capes on the chairs, hair all over the floor, coats on every hook.',
      morning: 'Just opened: floor mopped, towels stacked, chairs squared to the mirrors, low sun through the window.',
      lastcut: 'The last cut of the night: one station still lit, the others dark, a broom against the wall, streetlight on the floor.',
      closed: 'Closed for good: chairs under dust sheets or gone, a mirror missing, pale patches on the walls, mail on the floor, a FOR LEASE sign.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Checkerboard tiles in two colours.',
      diamond: 'Checkerboard laid on the diagonal, harlequin diamonds.',
      terrazzo: 'Speckled terrazzo with brass divider strips.',
      lino: 'Marbled linoleum, worn pale along the path to the chairs.',
      wood: 'Dark wooden boards.',
    }),
    stations: choice('How many barber chairs are there?', {
      two: 'Two: a small shop, a man and his nephew.',
      three: 'Three in a row.',
      four: 'Four, a proper run of stations.',
    }),
    waiting: choice('What does the waiting side offer?', {
      chairs: 'A row of chrome and vinyl chairs.',
      bench: 'A long wooden bench, polished by trousers.',
      sofa: 'A sagging leather sofa nobody wants to get up from.',
      folding: 'Mismatched folding and plastic chairs dragged in as needed.',
    }),
    wall: choice('What covers the wall above the waiting side?', {
      photos: 'Framed photographs: customers, boxers, ballplayers, the founder.',
      flag: 'A big flag from home and a wall clock.',
      charts: 'Haircut style charts and a price list.',
      shelf: 'A long shelf of trophies, bottles and a radio.',
    }),
    sound: choice('What fills the room with sound?', {
      speakers: 'A stack of big speakers in the corner.',
      tv: 'A television on a high bracket showing the game.',
      radio: 'A small radio on the back-bar.',
      quiet: 'Nothing but the clock and the scissors.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const L = LOOK[a.tradition];
    const closed = a.moment === 'closed', busy = a.moment === 'saturday', night = a.moment === 'lastcut';
    const W = 9.4, D = 6.8, WH = 3.2, hx = W / 2, hz = D / 2;
    const background = { saturday: '#e8e4d8', morning: '#efe7d6', lastcut: '#b7b1c2', closed: '#d3d4cf' }[a.moment];
    const { art: s, world } = diorama(context, {
      background, floor: '#7d776c', width: W, depth: D, maxHeight: 1.9, radius: 0.92, pitch: 31, yaw: 31,
      slots: [[0.5, 1.0], [-2.7, 1.9], [3.3, 1.7], [-0.9, -3.02, 0.93, 0.42], [1.9, 2.6], [3.7, -0.4]],
    });
    const mat = (tint: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(tint, options);
    const dim = closed ? 0.82 : night ? 0.8 : 1;
    const shade = (tint: string) => `#${new THREE.Color(tint).multiplyScalar(dim).getHexString()}`;
    const chrome = mat('#dfe3e4', { metalness: 0.9, roughness: 0.25 });
    const dark = mat('#1d1d1e', { roughness: 0.5 });
    const texture = (canvas: HTMLCanvasElement) => { const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; return map; };
    const sheet = (w: number, h: number) => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return { canvas, c: canvas.getContext('2d')! }; };

    // Floor finish, painted once.
    {
      const { canvas, c } = sheet(1024, Math.round((1024 * D) / W));
      const cw = canvas.width, ch = canvas.height, px = cw / W;
      c.fillStyle = L.tileA; c.fillRect(0, 0, cw, ch);
      if (a.floor === 'checker' || a.floor === 'diamond') {
        const t = 0.42 * px;
        c.save();
        if (a.floor === 'diamond') { c.translate(cw / 2, ch / 2); c.rotate(Math.PI / 4); c.translate(-cw, -cw); }
        for (let i = 0; i < 80; i++) for (let j = 0; j < 80; j++) if ((i + j) % 2) { c.fillStyle = L.tileB; c.fillRect(i * t, j * t, t - 1, t - 1); }
        c.restore();
      } else if (a.floor === 'terrazzo') {
        c.fillStyle = '#d9d2c2'; c.fillRect(0, 0, cw, ch);
        const chips = [L.tileB, '#8a8478', '#f4efe2', '#5a5650', L.accent];
        for (let i = 0; i < 5200; i++) { c.fillStyle = chips[Math.floor(random() * chips.length)]; c.beginPath(); c.ellipse(random() * cw, random() * ch, 1 + random() * 3.5, 1 + random() * 2.5, random() * 3, 0, 6.3); c.fill(); }
        c.fillStyle = '#b9983a';
        for (let x = 1.4 * px; x < cw; x += 1.4 * px) c.fillRect(x, 0, 2.5, ch);
        for (let y = 1.4 * px; y < ch; y += 1.4 * px) c.fillRect(0, y, cw, 2.5);
      } else if (a.floor === 'lino') {
        c.fillStyle = L.tileB; c.fillRect(0, 0, cw, ch);
        for (let i = 0; i < 260; i++) { c.strokeStyle = `rgba(255,255,255,${0.05 + random() * 0.12})`; c.lineWidth = 2 + random() * 10; c.beginPath(); const x = random() * cw, y = random() * ch; c.moveTo(x, y); c.bezierCurveTo(x + 80, y - 40 + random() * 80, x + 160, y - 40 + random() * 80, x + 240, y + random() * 60); c.stroke(); }
        const worn = c.createRadialGradient(cw * 0.5, ch * 0.42, 20, cw * 0.5, ch * 0.42, cw * 0.42);
        worn.addColorStop(0, `rgba(235,228,210,${mix(0.25, 0.7, mood.wear)})`); worn.addColorStop(1, 'rgba(235,228,210,0)');
        c.fillStyle = worn; c.fillRect(0, 0, cw, ch);
      } else {
        c.fillStyle = '#6a4a2e'; c.fillRect(0, 0, cw, ch);
        const board = 0.16 * px;
        for (let y = 0; y < ch; y += board) {
          c.fillStyle = `rgba(${random() < 0.5 ? '40,24,12' : '150,110,70'},${0.08 + random() * 0.18})`; c.fillRect(0, y, cw, board - 1.5);
          c.fillStyle = '#2f1f12'; c.fillRect(0, y + board - 1.5, cw, 1.5);
          for (let x = random() * 300; x < cw; x += 200 + random() * 300) c.fillRect(x, y, 1.5, board);
        }
      }
      for (let i = 0; i < mood.wear * 50; i++) { c.fillStyle = `rgba(50,42,34,${0.05 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * cw, random() * ch, 10 + random() * 50, 6 + random() * 26, random() * 3, 0, 6.3); c.fill(); }
      if (dim < 1) { c.fillStyle = `rgba(40,40,60,${(1 - dim) * 0.9})`; c.fillRect(0, 0, cw, ch); }
      const plane = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: texture(canvas), roughness: a.floor === 'wood' ? 0.7 : 0.45 }), [0, 0.006, 0]);
      plane.rotation.x = -Math.PI / 2;
      plane.castShadow = false;
    }

    // Light from the street window behind the camera, lettering and all.
    {
      const { canvas, c } = sheet(512, 512);
      const lean = (mood.daylight - 0.5) * -0.9;
      c.setTransform(1, 0, lean, 1, 256 * -lean + 0, 0);
      const tint = night ? '255,176,96' : a.moment === 'morning' ? '255,238,190' : `255,${Math.round(mix(250, 232, mood.warmth))},${Math.round(mix(244, 196, mood.warmth))}`;
      const alpha = night ? 0.4 : closed ? 0.36 : a.moment === 'morning' ? 0.6 : 0.5;
      const glow = c.createLinearGradient(0, 40, 0, 500);
      glow.addColorStop(0, `rgba(${tint},0)`); glow.addColorStop(0.25, `rgba(${tint},${alpha * 0.8})`); glow.addColorStop(1, `rgba(${tint},${alpha})`);
      c.fillStyle = glow;
      c.fillRect(60, 40, 250, 460); c.fillRect(330, 40, 120, 460);
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = '#000';
      c.fillRect(182, 40, 7, 460); c.fillRect(60, 250, 250, 7);
      if (closed) for (let y = 60; y < 500; y += 34) c.fillRect(50, y, 410, 15);
      else {
        c.font = 'bold 62px monospace'; c.textAlign = 'center';
        c.save(); c.translate(185, 380); c.scale(1.25, -1.5); c.fillText(a.tradition === 'turkish' ? 'BERBER' : 'BARBER', 0, 0); c.restore();
      }
      c.globalCompositeOperation = 'source-over';
      const patch = s.mesh(new THREE.PlaneGeometry(6.2, 5.2), new THREE.MeshBasicMaterial({ map: texture(canvas), transparent: true, depthWrite: false }), [0.5, 0.012, 0.75]);
      patch.rotation.x = -Math.PI / 2;
      patch.castShadow = patch.receiveShadow = false;
    }

    // Walls: back (mirrors) and left (waiting side), with dado, rail and skirting.
    const wall = mat(shade(L.wall), { roughness: 0.9 }), dado = mat(shade(L.dado), { roughness: a.tradition === 'italian' || a.tradition === 'turkish' ? 0.35 : 0.7 }), rail = mat(shade(L.rail), { roughness: 0.6 });
    s.box([W + 0.2, WH, 0.2], [-0.1, WH / 2, -hz - 0.1], wall);
    s.box([0.2, WH, D], [-hx - 0.1, WH / 2, 0], wall);
    const dadoH = a.tradition === 'turkish' ? 1.25 : 1.0;
    s.box([W, dadoH, 0.03], [0, dadoH / 2, -hz + 0.015], dado);
    s.box([0.03, dadoH, D], [-hx + 0.015, dadoH / 2, 0], dado);
    s.box([W, 0.06, 0.05], [0, dadoH + 0.03, -hz + 0.025], rail);
    s.box([0.05, 0.06, D], [-hx + 0.025, dadoH + 0.03, 0], rail);
    if (a.tradition === 'italian' || a.tradition === 'turkish') {
      const grout = mat(shade('#e9e4d6'));
      for (let i = 1; i < 30; i++) s.box([0.012, dadoH, 0.032], [-hx + i * (W / 30), dadoH / 2, -hz + 0.016], grout);
      for (let i = 1; i < 22; i++) s.box([0.032, dadoH, 0.012], [-hx + 0.016, dadoH / 2, -hz + i * (D / 22)], grout);
    }
    s.box([W, 0.1, 0.04], [0, WH - 0.05, -hz + 0.02], rail);
    s.box([0.04, 0.1, D], [-hx + 0.02, WH - 0.05, 0], rail);

    // Stations along the back wall.
    const count = { two: 2, three: 3, four: 4 }[a.stations];
    const pitch = count === 2 ? 2.7 : count === 3 ? 2.35 : 1.95;
    const xs = Array.from({ length: count }, (_u, i) => (i - (count - 1) / 2) * pitch + 0.25);
    const span = (count - 1) * pitch + 1.7;
    const cz = -hz + 0.3, topY = 0.9;
    const cabinet = mat(shade(L.cabinet), { roughness: 0.55 }), counter = mat(shade(L.top), { roughness: 0.3 });
    const continuous = a.tradition === 'italian' || a.tradition === 'dominican' || a.tradition === 'black';
    const blocks: [number, number][] = continuous ? [[0.25, span]] : xs.map((x) => [x, 1.5]);
    for (const [x, w] of blocks) {
      s.box([w, topY - 0.14, 0.52], [x, 0.1 + (topY - 0.14) / 2, cz], cabinet);
      s.box([w - 0.08, 0.1, 0.44], [x, 0.05, cz], dark);
      s.box([w + 0.06, 0.04, 0.58], [x, topY - 0.02, cz + 0.01], counter);
    }
    const handle = mat(a.tradition === 'black' ? '#c9a24c' : '#d7dbdc', { metalness: 0.8, roughness: 0.3 });
    const openDrawer = closed ? Math.floor(random() * count) : -1;
    xs.forEach((x, i) => {
      for (const sx of [-1, 1]) for (let row = 0; row < 2; row++) {
        const out = i === openDrawer && sx === 1 && row === 1 ? 0.22 : 0;
        s.box([0.6, 0.3, 0.02], [x + sx * 0.33, 0.3 + row * 0.34, cz + 0.27 + out], mat(shade(L.cabinet), { roughness: 0.5 }));
        s.box([0.2, 0.02, 0.025], [x + sx * 0.33, 0.37 + row * 0.34, cz + 0.29 + out], handle);
      }
    });

    // Mirrors: one shared silvering, with the street window reflected in it.
    const { canvas: glassCanvas, c: g } = sheet(256, 256);
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, night ? '#aeb4c6' : '#e6f0f1'); sky.addColorStop(1, night ? '#6f7890' : '#a9bfc8');
    g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
    g.fillStyle = night ? 'rgba(255,190,120,0.7)' : 'rgba(255,248,226,0.8)';
    g.fillRect(64, 60, 128, 86);
    g.fillStyle = night ? '#6f7890' : '#94aab3'; g.fillRect(126, 60, 4, 86); g.fillRect(64, 100, 128, 4);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [x, w] of [[24, 26], [66, 8], [196, 14]] as const) { g.beginPath(); g.moveTo(x, 256); g.lineTo(x + w, 256); g.lineTo(x + w + 110, 0); g.lineTo(x + 110, 0); g.fill(); }
    for (let i = 0; i < mood.wear * 50 + (closed ? 30 : 0); i++) { g.fillStyle = `rgba(70,62,50,${0.2 + random() * 0.35})`; g.beginPath(); g.arc(random() < 0.5 ? random() * 28 : 256 - random() * 28, random() * 256, 2 + random() * 6, 0, 6.3); g.fill(); }
    if (closed) { g.strokeStyle = 'rgba(245,245,240,0.8)'; g.lineWidth = 22; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(30 + random() * 200, 30 + random() * 200, 24 + random() * 30, 0, 5); g.stroke(); } }
    const glassMap = texture(glassCanvas);
    const glassMat = () => new THREE.MeshStandardMaterial({ map: glassMap, roughness: 0.18, metalness: 0.25, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: night ? 0.12 : 0.22 });
    const frame = mat(shade(L.frame), { roughness: 0.4, metalness: a.tradition === 'italian' ? 0.85 : 0.1 });
    const my = 1.78, mh = a.tradition === 'turkish' ? 1.45 : 1.2, mw = Math.min(1.35, pitch - 0.45), wz = -hz + 0.02;
    const missing = closed ? Math.floor(random() * count) : -1;
    const lamps: THREE.MeshStandardMaterial[] = [];
    const litStation = Math.min(count - 1, Math.floor(count / 2));
    if (a.tradition === 'italian') {
      s.box([span + 0.1, mh + 0.1, 0.04], [0.25, my, wz], frame);
      s.mesh(new THREE.PlaneGeometry(span, mh), glassMat(), [0.25, my, wz + 0.024]).castShadow = false;
      for (let i = 0; i < count - 1; i++) s.box([0.05, mh + 0.1, 0.06], [(xs[i] + xs[i + 1]) / 2, my, wz + 0.01], frame);
    }
    xs.forEach((x, i) => {
      if (a.tradition !== 'italian') {
        if (i === missing) {
          s.box([mw, mh, 0.006], [x, my, wz + 0.002], mat(new THREE.Color(L.wall).lerp(new THREE.Color('#ffffff'), 0.35), { roughness: 0.9 }));
          for (const sx of [-1, 1]) s.cylinder(0.012, 0.012, 0.04, [x + sx * (mw / 2 - 0.1), my + mh / 2 - 0.1, wz + 0.02], dark, 6).rotation.x = Math.PI / 2;
        } else if (a.tradition === 'turkish') {
          const arch = (w: number, h: number) => { const shape = new THREE.Shape(); shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2 - w / 2); shape.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); shape.closePath(); return shape; };
          s.mesh(new THREE.ExtrudeGeometry(arch(mw + 0.14, mh + 0.14), { depth: 0.04, bevelEnabled: false, curveSegments: 20 }), frame, [x, my, wz]);
          const map = glassMap.clone(); map.needsUpdate = true; map.repeat.set(1 / mw, 1 / mh); map.offset.set(0.5, 0.5);
          const glass = glassMat(); glass.map = map; glass.emissiveMap = map;
          s.mesh(new THREE.ShapeGeometry(arch(mw, mh), 20), glass, [x, my, wz + 0.045]).castShadow = false;
        } else {
          const border = a.tradition === 'dominican' ? 0.12 : a.tradition === 'black' ? 0.09 : 0.06;
          s.box([mw + border * 2, mh + border * 2, 0.045], [x, my, wz], frame);
          s.mesh(new THREE.PlaneGeometry(mw, mh), glassMat(), [x, my, wz + 0.026]).castShadow = false;
          if (a.tradition === 'dominican') {
            const bulb = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#ffe9a8', emissiveIntensity: closed ? 0 : night && i !== litStation ? 0.05 : mix(0.6, 1.3, mood.cheer) });
            lamps.push(bulb);
            s.scatter(new THREE.SphereGeometry(1, 8, 6), bulb, Array.from({ length: 7 }, (_u, k) => ({ at: [x - mw / 2 + (k * mw) / 6, my + mh / 2 + border / 2, wz + 0.04] as V3, size: 0.04 })));
          }
        }
      }
      // A lamp over every station.
      if (a.tradition !== 'dominican') {
        const on = closed ? 0 : night ? (i === litStation ? 1.2 : 0.03) : a.moment === 'morning' ? 0.25 : mix(0.7, 1.2, mood.cheer);
        const lamp = new THREE.MeshStandardMaterial({ color: on > 0.1 ? '#fff3cf' : '#cfc9b8', emissive: '#ffe2a0', emissiveIntensity: on, roughness: 0.4 });
        lamps.push(lamp);
        const ly = my + mh / 2 + (a.tradition === 'turkish' ? 0.02 : 0.2);
        if (a.tradition === 'tokyo' || a.tradition === 'italian') {
          s.box([0.7, 0.07, 0.09], [x, ly, wz + 0.1], lamp);
          s.box([0.76, 0.03, 0.12], [x, ly + 0.05, wz + 0.08], chrome);
        } else {
          s.rod([x, ly, wz], [x, ly, wz + 0.16], 0.012, handle);
          s.lathe([[0.03, 0], [0.09, 0.04], [0.1, 0.12], [0.05, 0.17], [0, 0.175]], lamp, [x, ly - 0.05, wz + 0.17]);
        }
      }
      // Things on the back-bar: bottles, the blue jar, towels.
      if (!closed) {
        const tonics = a.tradition === 'turkish' ? ['#e6c93a', '#e6c93a', '#d9a02a', '#7fc4e8'] : ['#2f9a6a', '#d08a1e', '#2f6fc0', '#b3232a', '#e6d8a0', '#6b3f8c', '#3aa9a0'];
        const n = 3 + Math.round(mood.density * 6);
        s.scatter(new THREE.CylinderGeometry(0.45, 0.5, 2.2, 10), mat('#ffffff', { roughness: 0.2 }),
          Array.from({ length: n }, (_u, k) => ({ at: [x - 0.55 + (k * 1.1) / Math.max(n - 1, 1) + (random() - 0.5) * 0.04, topY + 0.07 + random() * 0.03, cz - 0.14 + (random() - 0.5) * 0.06] as V3, size: 0.055 + random() * 0.03, color: tonics[Math.floor(random() * tonics.length)] })));
        s.cylinder(0.05, 0.05, 0.24, [x + 0.48, topY + 0.12, cz + 0.08], new THREE.MeshStandardMaterial({ color: '#1687e0', emissive: '#1687e0', emissiveIntensity: 0.3, roughness: 0.1, transparent: true, opacity: 0.85 }), 14);
        s.cylinder(0.056, 0.056, 0.03, [x + 0.48, topY + 0.255, cz + 0.08], chrome, 14);
        for (let k = 0; k < (busy ? 2 : 4); k++) s.box([0.26, 0.035, 0.18], [x - 0.42, topY + 0.018 + k * 0.036, cz + 0.08], mat(k % 2 ? '#f4f1e8' : '#e6e2d6', { roughness: 1 }));
        if (busy || (night && i === litStation)) { s.box([0.06, 0.045, 0.17], [x + 0.05, topY + 0.023, cz + 0.1], dark).rotation.y = random() * 2; s.box([0.2, 0.01, 0.03], [x + 0.22, topY + 0.006, cz + 0.16], dark).rotation.y = random() * 2; }
      } else if (random() < 0.5) s.cylinder(0.045, 0.045, 0.2, [x + 0.4, topY + 0.1, cz], mat('#cfd3cf', { roughness: 0.3, transparent: true, opacity: 0.6 }), 12);
    });
    // Shop sign over the mirrors.
    s.box([Math.min(span, 4.2) + 0.1, 0.4, 0.04], [0.25, WH - 0.36, wz], mat(shade(L.paper)));
    s.label(closed ? 'FOR LEASE' : L.sign, Math.min(span, 4.2), 0.32, [0.25, WH - 0.36, wz + 0.024], closed ? '#1d1d1e' : L.ink, closed ? '#f2e9c8' : L.paper);

    // Barber chairs: simple set pieces, so the cast can bring its own hero.
    const leather = mat(shade(L.chair), { roughness: 0.45 });
    const enamel = mat(a.tradition === 'tokyo' || a.tradition === 'italian' ? '#eeece4' : '#d5d9da', { metalness: a.tradition === 'tokyo' ? 0.1 : 0.85, roughness: 0.25 });
    const hairTufts: { at: V3; size: number; color: string }[] = [];
    const HAIRS = ['#1b1512', '#231a15', '#3a2618', '#6b6660', '#16110f'];
    const chairZ = -hz + 1.75;
    xs.forEach((x, i) => {
      if (closed && (i === missing || random() < 0.25)) {
        // Gone: a bolt circle and a cleaner disc of floor.
        s.cylinder(0.36, 0.36, 0.004, [x, 0.012, chairZ], mat('#cfc9bb', { roughness: 0.6 }), 28);
        for (let k = 0; k < 4; k++) s.cylinder(0.02, 0.02, 0.02, [x + Math.cos(k * 1.571 + 0.5) * 0.26, 0.02, chairZ + Math.sin(k * 1.571 + 0.5) * 0.26], dark, 8);
        return;
      }
      if (closed) {
        const cloth = s.lathe([[0, 1.36], [0.2, 1.34], [0.36, 1.2], [0.42, 0.95], [0.5, 0.7], [0.56, 0.3], [0.66, 0.04], [0.7, 0]], mat('#e6e3d8', { roughness: 1, side: THREE.DoubleSide }), [x, 0, chairZ]);
        cloth.scale.set(0.95, 1, 1.15); cloth.rotation.y = random() * 3;
        s.ball([0.3, 0.2, 0.12], [x, 1.18, chairZ - 0.22], mat('#e6e3d8', { roughness: 1 }), 12);
        return;
      }
      const chair = new THREE.Group();
      const put = (m: THREE.Object3D) => { chair.add(m); return m; };
      put(s.lathe([[0, 0], [0.34, 0], [0.35, 0.03], [0.2, 0.07], [0.1, 0.12], [0.08, 0.5], [0, 0.5]], enamel));
      put(s.box([0.56, 0.14, 0.54], [0, 0.6, 0.02], leather));
      put(s.box([0.52, 0.62, 0.12], [0, 0.98, -0.27], leather)).rotation.x = -0.14;
      put(s.box([0.27, 0.13, 0.1], [0, 1.42, -0.33], leather));
      for (const sx of [-0.07, 0.07]) put(s.rod([sx, 1.22, -0.32], [sx, 1.38, -0.33], 0.01, chrome));
      for (const sx of [-1, 1]) {
        put(s.box([0.07, 0.05, 0.42], [sx * 0.32, 0.86, 0], leather));
        put(s.box([0.04, 0.24, 0.36], [sx * 0.32, 0.72, 0], enamel));
        put(s.rod([sx * 0.2, 0.56, 0.28], [sx * 0.2, 0.2, 0.62], 0.015, chrome));
      }
      put(s.box([0.5, 0.03, 0.2], [0, 0.2, 0.66], chrome)).rotation.x = 0.35;
      put(s.rod([0.2, 0.5, 0], [0.44, 0.7, 0.16], 0.013, chrome));
      put(s.ball([0.03, 0.03, 0.03], [0.45, 0.71, 0.17], dark, 10));
      const occupiedLook = busy || (night && i === litStation);
      if (occupiedLook && random() < 0.75) {
        const cape = mat(['#1d1e24', '#f0ede4', L.accent][Math.floor(random() * 3)], { roughness: 0.6, side: THREE.DoubleSide });
        put(s.box([0.6, 0.5, 0.02], [0, 1.02, -0.2], cape)).rotation.x = -0.14;
        put(s.box([0.6, 0.03, 0.16], [0, 1.3, -0.31], cape));
        put(s.box([0.6, 0.46, 0.02], [0, 1.06, -0.4], cape)).rotation.x = -0.1;
      }
      chair.position.set(x, 0, chairZ);
      chair.rotation.y = a.moment === 'morning' ? Math.PI : Math.PI + (random() - 0.5) * (busy ? 2.4 : 1.2);
      if (night && i !== litStation) chair.rotation.y = Math.PI;
      s.root.add(chair);
      if (occupiedLook) for (let k = 0; k < (busy ? 26 + mood.density * 30 : 10); k++) {
        const t = random() * 6.283, r = 0.35 + random() * 0.6;
        hairTufts.push({ at: [x + Math.cos(t) * r, 0.02, chairZ + Math.sin(t) * r], size: 0.02 + random() * 0.03, color: HAIRS[Math.floor(random() * HAIRS.length)] });
      }
    });
    if (busy || night) {
      const px = busy ? -hx + 1.2 : xs[litStation] + 0.9, pz = busy ? -hz + 1.0 : chairZ + 1.1;
      for (let k = 0; k < 90; k++) { const t = random() * 6.283, r = Math.pow(random(), 0.7) * 0.3; hairTufts.push({ at: [px + Math.cos(t) * r, 0.02 + (0.3 - r) * 0.3 * random(), pz + Math.sin(t) * r], size: 0.025 + random() * 0.03, color: HAIRS[Math.floor(random() * HAIRS.length)] }); }
      // The broom, against the nearest wall or standing by the pile.
      const bx = busy ? -hx + 0.75 : px + 0.45, bz = busy ? -hz + 0.42 : pz - 0.1;
      s.rod([bx, 0.1, bz + 0.25], [bx - (busy ? 0.3 : -0.3), 1.45, bz - (busy ? 0.05 : 0.5)], 0.016, mat('#b98a52'));
      s.box([0.5, 0.1, 0.09], [bx, 0.06, bz + 0.27], mat('#c42a2a', { roughness: 1 })).rotation.y = busy ? 0.3 : 1.2;
    }
    if (hairTufts.length) s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.3, 0.6), mat('#ffffff', { roughness: 1 }), hairTufts);

    // Waiting side, along the left wall.
    const seatX = -hx + 0.42;
    const seats = closed ? 2 : Math.round(mix(3, 6, mood.density)) + (busy ? 1 : 0);
    const z0 = -hz + 2.2;
    const vinyl = mat(shade(a.tradition === 'black' ? '#7a2a22' : a.tradition === 'tokyo' ? '#c9b48a' : L.accent), { roughness: 0.5 });
    const wood = mat(shade('#7a4a26'), { roughness: 0.55 });
    const seatLen = Math.min(seats, 6) * 0.68;
    if (a.waiting === 'bench' && !closed) {
      s.box([0.46, 0.06, seatLen], [seatX, 0.45, z0 + seatLen / 2], wood);
      s.box([0.06, 0.5, seatLen], [seatX - 0.2, 0.75, z0 + seatLen / 2], wood);
      for (const dz of [0.1, seatLen / 2, seatLen - 0.1]) { s.box([0.44, 0.45, 0.06], [seatX, 0.225, z0 + dz], wood); s.box([0.06, 0.1, 0.5], [seatX, 0.62, z0 + dz], wood).rotation.x = 0; }
    } else if (a.waiting === 'sofa' && !closed) {
      const hide = mat(shade(a.tradition === 'tokyo' ? '#8a9a6a' : '#5a3320'), { roughness: 0.6 });
      const len = Math.min(seatLen, 3.2);
      s.box([0.8, 0.3, len], [seatX + 0.15, 0.25, z0 + len / 2], hide);
      s.box([0.22, 0.6, len], [seatX - 0.18, 0.55, z0 + len / 2], hide);
      for (const dz of [0.1, len - 0.1]) s.box([0.8, 0.5, 0.2], [seatX + 0.15, 0.4, z0 + dz], hide);
      for (let k = 0; k < Math.round(len / 0.75); k++) s.box([0.56, 0.14, len / Math.round(len / 0.75) - 0.24], [seatX + 0.22, 0.45, z0 + 0.2 + (k + 0.5) * ((len - 0.4) / Math.round(len / 0.75))], mat(shade('#6a3f28'), { roughness: 0.7 }));
    } else {
      for (let k = 0; k < Math.min(seats, 6); k++) {
        const z = z0 + 0.3 + k * 0.68, mixed = a.waiting === 'folding' || closed;
        const g = new THREE.Group();
        const put = (m: THREE.Object3D) => { g.add(m); return m; };
        const tint = mixed ? mat(['#eeece4', '#6f7a80', '#c8262c', '#2f6a8a', '#7a5a3c'][Math.floor(random() * 5)], { roughness: 0.5 }) : vinyl;
        put(s.box([0.44, 0.06, 0.46], [0, 0.45, 0], tint));
        put(s.box([0.44, 0.4, 0.05], [0, 0.78, -0.22], tint)).rotation.x = -0.12;
        for (const sx of [-1, 1]) { put(s.rod([sx * 0.2, 0, 0.2], [sx * 0.2, 0.44, 0.2], 0.013, chrome)); put(s.rod([sx * 0.2, 0, -0.2], [sx * 0.2, 0.95, -0.25], 0.013, chrome)); }
        g.position.set(seatX + (mixed ? random() * 0.25 : 0), 0, z);
        g.rotation.y = Math.PI / 2 + (mixed ? (random() - 0.5) * 0.7 : (random() - 0.5) * 0.08);
        if (closed) { g.position.set(seatX + 0.1, k * 0.14, z0 + 0.5); g.rotation.y = Math.PI / 2; }
        s.root.add(g);
      }
    }
    // Coat hooks, coats, and a low table of magazines.
    const hookZ = hz - 1.5;
    s.box([0.03, 0.1, 1.5], [-hx + 0.03, 1.75, hookZ], wood);
    for (let k = 0; k < 5; k++) {
      const z = hookZ - 0.6 + k * 0.3;
      s.rod([-hx + 0.04, 1.75, z], [-hx + 0.13, 1.79, z], 0.012, handle);
      const hung = busy ? random() < 0.8 : night ? k === 2 : false;
      if (hung) {
        const coat = mat(['#3a4a5a', '#5a4632', '#1f1f21', '#7a2a22', '#6a6a4a'][Math.floor(random() * 5)], { roughness: 0.95 });
        s.box([0.12, 0.75 + random() * 0.2, 0.26], [-hx + 0.13, 1.33, z], coat).rotation.x = (random() - 0.5) * 0.1;
        if (random() < 0.4) s.ball([0.1, 0.05, 0.12], [-hx + 0.15, 1.84, z], mat('#4a4a3a', { roughness: 1 }), 10);
      }
    }
    if (!closed) {
      const tz = z0 + Math.min(seats, 6) * 0.34, tx = seatX + 1.0;
      if (a.tradition === 'turkish') {
        const rug = sheet(64, 256);
        rug.c.fillStyle = '#8a1f24'; rug.c.fillRect(0, 0, 64, 256);
        rug.c.strokeStyle = '#e6c98a'; rug.c.lineWidth = 3; rug.c.strokeRect(5, 5, 54, 246);
        for (let y = 24; y < 240; y += 36) { rug.c.fillStyle = y % 72 ? '#1f3f6a' : '#e6c98a'; rug.c.beginPath(); rug.c.moveTo(32, y - 14); rug.c.lineTo(48, y); rug.c.lineTo(32, y + 14); rug.c.lineTo(16, y); rug.c.fill(); }
        const runner = s.mesh(new THREE.PlaneGeometry(1.0, 3.8), new THREE.MeshStandardMaterial({ map: texture(rug.canvas), roughness: 1 }), [seatX + 1.0, 0.016, z0 + 1.7]);
        runner.rotation.x = -Math.PI / 2; runner.castShadow = false;
      }
      s.cylinder(0.3, 0.3, 0.03, [tx, 0.44, tz], a.tradition === 'turkish' ? mat('#c9a24c', { metalness: 0.8, roughness: 0.3 }) : wood, 20);
      s.cylinder(0.03, 0.2, 0.43, [tx, 0.215, tz], wood, 10);
      if (a.tradition === 'turkish') {
        for (let k = 0; k < 3 + Math.round(mood.density * 2); k++) { const t = k * 1.3; s.cylinder(0.028, 0.02, 0.08, [tx + Math.cos(t) * 0.15, 0.5, tz + Math.sin(t) * 0.15], new THREE.MeshStandardMaterial({ color: '#b5501c', roughness: 0.1, transparent: true, opacity: 0.9 }), 10); }
        s.lathe([[0, 0], [0.06, 0], [0.08, 0.08], [0.05, 0.16], [0.02, 0.2], [0, 0.21]], mat('#c9a24c', { metalness: 0.8, roughness: 0.3 }), [tx, 0.455, tz]);
      } else for (let k = 0; k < 2 + Math.round(mood.density * 3); k++) s.box([0.22, 0.012, 0.29], [tx + (random() - 0.5) * 0.12, 0.461 + k * 0.012, tz + (random() - 0.5) * 0.1], mat(['#c8262c', '#f0c93a', '#2f6fc0', '#f4efe0', '#2f8a4a'][Math.floor(random() * 5)], { roughness: 0.6 })).rotation.y = random() * 3;
    } else {
      // Mail and boxes where the customers were.
      for (let k = 0; k < 9; k++) s.box([0.24, 0.006, 0.12], [1.5 + (random() - 0.5) * 1.6, 0.02 + k * 0.001, hz - 0.5 - random() * 0.9], mat(k % 3 ? '#f1ede2' : '#d9c79a', { roughness: 0.9 })).rotation.y = random() * 3;
      for (let k = 0; k < 2; k++) s.box([0.5, 0.36, 0.4], [-hx + 0.9 + k * 0.2, 0.18 + k * 0.36, hz - 1.1 - k * 0.05], mat('#b89464', { roughness: 0.95 })).rotation.y = 0.2 + k * 0.4;
    }

    // What hangs over the waiting side: one painted, alpha-cut sheet on the left wall.
    {
      const { canvas, c } = sheet(1024, 384);
      const tones = ['#8a5a3c', '#c98f62', '#5d3a26', '#e0b48c', '#a8714a'];
      const portrait = (x: number, y: number, w: number, h: number) => {
        c.fillStyle = a.tradition === 'black' ? '#1d1d1e' : '#3a2416'; c.fillRect(x, y, w, h);
        c.fillStyle = ['#d9d2c2', '#b9c6c9', '#cdbb94', '#e6dcc6'][Math.floor(random() * 4)]; c.fillRect(x + 7, y + 7, w - 14, h - 14);
        const r = Math.min(w, h) * 0.2, cx = x + w / 2, cy = y + h * 0.46;
        c.fillStyle = ['#2b3a55', '#f4f0e4', '#8c2a2a', '#333'][Math.floor(random() * 4)]; c.fillRect(cx - r * 1.5, cy + r * 0.8, r * 3, h * 0.54 - r * 0.8 - 7);
        c.fillStyle = '#1c1613'; c.beginPath(); c.arc(cx, cy - r * 0.3, r * 1.1, 0, 6.3); c.fill();
        c.fillStyle = tones[Math.floor(random() * tones.length)]; c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.fill();
      };
      const ghost = (x: number, y: number, w: number, h: number) => { c.fillStyle = 'rgba(255,255,255,0.32)'; c.fillRect(x, y, w, h); c.fillStyle = '#2a2a2a'; c.fillRect(x + w / 2 - 3, y + 8, 6, 6); };
      const clock = (x: number, y: number, r: number) => {
        c.fillStyle = '#1d1d1e'; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
        c.fillStyle = '#f6f2e6'; c.beginPath(); c.arc(x, y, r * 0.86, 0, 6.3); c.fill();
        c.strokeStyle = '#1d1d1e'; c.lineWidth = 7; c.lineCap = 'round';
        const hour = night ? 5.3 : a.moment === 'morning' ? 4.2 : 0.6, minute = random() * 6.283;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(hour) * r * 0.45, y + Math.sin(hour) * r * 0.45); c.moveTo(x, y); c.lineTo(x + Math.cos(minute) * r * 0.7, y + Math.sin(minute) * r * 0.7); c.stroke();
      };
      const frames: [number, number, number, number][] = [];
      for (let col = 0; col < 8; col++) { let y = 20 + random() * 30; while (y < 290) { const w = 80 + random() * 34, h = 80 + random() * 60; if (y + h < 374) frames.push([20 + col * 124 + random() * 10, y, w, h]); y += h + 16 + random() * 20; } }
      if (a.wall === 'photos') frames.forEach((f, i) => (closed && i % 5 !== 0 ? ghost(...f) : random() < mix(0.5, 1, mood.density) ? portrait(...f) : null));
      else if (a.wall === 'flag') {
        if (closed) ghost(250, 60, 430, 270); else { c.fillStyle = '#2a2a2a'; c.fillRect(246, 56, 438, 278); paintFlag(c, a.tradition, 250, 60, 430, 270); }
        clock(850, 150, 92);
        if (!closed) { portrait(60, 90, 120, 160); }
      } else if (a.wall === 'charts') {
        for (let k = 0; k < 3; k++) {
          const x = 60 + k * 300, w = 230, h = 320, y = 30 + random() * 20;
          if (closed && k !== 1) { ghost(x, y, w, h); continue; }
          c.fillStyle = k === 2 ? '#f6f2e6' : ['#f2c230', '#efe3c2', '#12a3a0', '#cfe3ea'][Math.floor(random() * 4)]; c.fillRect(x, y, w, h);
          c.fillStyle = '#1d1d1e'; c.fillRect(x + 14, y + 14, w - 28, 22);
          if (k === 2) for (let row = 0; row < 7; row++) { c.fillRect(x + 20, y + 62 + row * 34, 110, 10); c.fillStyle = '#b3232a'; c.fillRect(x + 160, y + 62 + row * 34, 46, 10); c.fillStyle = '#1d1d1e'; }
          else for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
            const cx = x + 44 + col * 71, cy = y + 96 + row * 86;
            c.fillStyle = '#1c1613'; c.beginPath(); c.arc(cx, cy - 8 - random() * 12, 22 + random() * 8, 0, 6.3); c.fill();
            c.fillStyle = tones[Math.floor(random() * tones.length)]; c.beginPath(); c.arc(cx, cy, 20, 0, 6.3); c.fill();
          }
        }
      } else {
        c.fillStyle = '#4a2c1c'; c.fillRect(30, 250, 964, 22);
        for (const x of [120, 500, 880]) { c.beginPath(); c.moveTo(x - 10, 272); c.lineTo(x + 10, 272); c.lineTo(x, 330); c.fill(); }
        if (!closed) {
          let x = 50;
          while (x < 930) {
            const kind = random();
            if (kind < 0.35) { c.fillStyle = '#c9a24c'; c.fillRect(x + 12, 236, 30, 14); c.fillRect(x + 22, 200, 10, 38); c.beginPath(); c.arc(x + 27, 180, 24, 0, Math.PI); c.fill(); c.fillRect(x + 3, 170, 48, 12); x += 70; }
            else if (kind < 0.75) { const h = 50 + random() * 60; c.fillStyle = ['#2f9a6a', '#d08a1e', '#2f6fc0', '#b3232a', '#6b3f8c'][Math.floor(random() * 5)]; c.fillRect(x, 250 - h, 26, h); c.fillRect(x + 8, 236 - h, 10, 16); x += 40; }
            else { c.fillStyle = '#b3232a'; c.fillRect(x, 170, 120, 80); c.fillStyle = '#1d1d1e'; c.beginPath(); c.arc(x + 36, 212, 24, 0, 6.3); c.fill(); c.fillStyle = '#f1e6b8'; c.fillRect(x + 70, 190, 40, 16); x += 140; }
            x += random() * 60;
          }
        } else { c.fillStyle = '#c9a24c'; c.fillRect(400, 236, 30, 14); c.fillRect(410, 200, 10, 38); }
        clock(880, 110, 70);
      }
      const hang = s.mesh(new THREE.PlaneGeometry(4.6, 1.72), new THREE.MeshStandardMaterial({ map: texture(canvas), transparent: true, alphaTest: 0.25, roughness: 0.8 }), [-hx + 0.012, 2.15, -0.2]);
      hang.rotation.y = Math.PI / 2;
      hang.castShadow = false;
    }

    // Tradition's own corner piece, at the back left.
    const bx = -hx + 0.6, bz = -hz + 0.6;
    if (a.tradition === 'tokyo') {
      s.box([0.9, 0.05, 0.05], [bx + 0.1, 2.05, -hz + 0.05], wood);
      for (let k = 0; k < 3; k++) s.box([0.28, 0.75, 0.012], [bx - 0.19 + k * 0.29, 1.66, -hz + 0.06], mat(shade('#2f4f8a'), { roughness: 0.95 }));
      s.cylinder(0.16, 0.12, 0.3, [bx + 0.05, 0.15, bz + 0.5], mat('#f1ede2', { roughness: 0.4 }), 14);
      for (let k = 0; k < 9; k++) { const t = k * 0.7; s.rod([bx + 0.05, 0.3, bz + 0.5], [bx + 0.05 + Math.cos(t) * 0.3, 0.7 + (k % 3) * 0.22, bz + 0.5 + Math.sin(t) * 0.3], 0.012, mat(shade('#3f7a3c')), 0.05); }
    } else if (a.tradition === 'italian') {
      s.cylinder(0.02, 0.02, 1.8, [bx, 0.9, bz], wood, 8);
      s.cylinder(0.22, 0.25, 0.04, [bx, 0.02, bz], wood, 14);
      for (let k = 0; k < 4; k++) s.rod([bx, 1.7, bz], [bx + Math.cos(k * 1.57) * 0.18, 1.82, bz + Math.sin(k * 1.57) * 0.18], 0.012, wood);
      if (!closed) { s.ball([0.15, 0.06, 0.15], [bx + 0.18, 1.86, bz], mat('#5a5a4a', { roughness: 1 }), 12); s.box([0.1, 0.8, 0.3], [bx - 0.02, 1.35, bz + 0.2], mat('#3a3f4a', { roughness: 0.95 })); }
    } else if (a.tradition === 'black' && !closed) {
      s.box([0.6, 0.72, 0.6], [bx + 0.1, 0.36, bz + 0.3], wood);
      for (let k = 0; k < 16; k++) if ((k + Math.floor(k / 4)) % 2) s.box([0.12, 0.004, 0.12], [bx - 0.08 + (k % 4) * 0.12, 0.722, bz + 0.12 + Math.floor(k / 4) * 0.12], dark);
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.5, 10), mat('#ffffff'), Array.from({ length: 9 }, (_u, k) => ({ at: [bx - 0.08 + Math.floor(random() * 4) * 0.12, 0.735, bz + 0.12 + Math.floor(random() * 4) * 0.12] as V3, size: 0.04, color: k % 2 ? '#b3232a' : '#1d1d1e' })));
    } else if (a.tradition === 'dominican' && !closed) {
      const strand = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: mix(0.3, 0.9, mood.cheer) });
      lamps.push(strand);
      const tints = ['#ff5a5a', '#ffd23a', '#4ad6c8', '#6aa8ff', '#ff8ad0'];
      s.scatter(new THREE.SphereGeometry(1, 8, 6), strand, Array.from({ length: 26 }, (_u, k) => ({ at: [-hx + 0.4 + k * ((W - 0.8) / 25), WH - 0.2 - Math.abs(Math.sin(k * 0.6)) * 0.14, -hz + 0.07] as V3, size: 0.035, color: tints[k % 5] })));
    }

    // Sound.
    let screen: THREE.MeshStandardMaterial | null = null;
    if (a.sound === 'tv') {
      const tx = hx - 0.9, ty = 2.5;
      s.box([0.9, 0.56, 0.12], [tx, ty, -hz + 0.3], dark).rotation.set(0.2, -0.25, 0);
      screen = new THREE.MeshStandardMaterial({ color: closed ? '#22262a' : '#2f8a4a', emissive: closed ? '#000000' : '#3fae5a', emissiveIntensity: closed ? 0 : 0.9, roughness: 0.2 });
      s.box([0.8, 0.46, 0.02], [tx - 0.016, ty - 0.012, -hz + 0.365], screen).rotation.set(0.2, -0.25, 0);
      s.rod([tx, ty, -hz + 0.02], [tx, ty, -hz + 0.26], 0.02, dark);
    } else if (a.sound === 'speakers') {
      const sx = hx - 0.5, sz = -hz + 0.5;
      for (let k = 0; k < (closed ? 1 : 2); k++) {
        s.box([0.6, 0.8, 0.5], [sx, 0.4 + k * 0.8, sz], dark);
        s.cylinder(0.2, 0.2, 0.02, [sx, 0.32 + k * 0.8, sz + 0.255], mat('#3a3a3c', { roughness: 0.8 }), 20).rotation.x = Math.PI / 2;
        s.cylinder(0.08, 0.08, 0.02, [sx, 0.64 + k * 0.8, sz + 0.255], mat('#3a3a3c', { roughness: 0.8 }), 14).rotation.x = Math.PI / 2;
      }
    } else if (a.sound === 'radio' && !closed) {
      const rx = xs[0] - 0.05;
      s.box([0.34, 0.2, 0.12], [rx, topY + 0.1, cz - 0.05], mat(shade('#8a4a2a'), { roughness: 0.5 }));
      s.cylinder(0.06, 0.06, 0.01, [rx - 0.08, topY + 0.1, cz + 0.012], dark, 16).rotation.x = Math.PI / 2;
      s.box([0.12, 0.04, 0.006], [rx + 0.08, topY + 0.14, cz + 0.012], mat('#f1e6b8', { emissive: '#f1c868', emissiveIntensity: 0.6 }));
      s.rod([rx + 0.15, topY + 0.2, cz - 0.08], [rx + 0.3, topY + 0.6, cz - 0.1], 0.005, chrome);
    }

    // The pole by the door, on the front end of the left wall.
    const stripes = sheet(128, 128);
    const bw = 128 / L.pole.length / 2;
    for (let i = -L.pole.length * 2; i < L.pole.length * 4; i++) { stripes.c.fillStyle = L.pole[((i % L.pole.length) + L.pole.length) % L.pole.length]; stripes.c.beginPath(); stripes.c.moveTo(i * bw, 0); stripes.c.lineTo((i + 1) * bw + 1, 0); stripes.c.lineTo((i + 1) * bw + 129, 128); stripes.c.lineTo(i * bw + 128, 128); stripes.c.fill(); }
    const stripeMap = texture(stripes.canvas);
    stripeMap.wrapS = stripeMap.wrapT = THREE.RepeatWrapping; stripeMap.repeat.set(1, 1.6);
    const poleMat = new THREE.MeshStandardMaterial({ map: stripeMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: stripeMap, emissiveIntensity: closed ? 0 : night ? 0.7 : 0.35 });
    const pz = hz - 0.4, pxw = -hx + 0.28;
    const drum = s.cylinder(0.1, 0.1, 0.7, [pxw, 2.1, pz], poleMat, 20);
    for (const y of [1.7, 2.5]) { s.cylinder(0.13, 0.13, 0.1, [pxw, y, pz], chrome, 20); s.rod([-hx, y, pz], [pxw, y, pz], 0.02, dark); }
    s.ball([0.11, 0.11, 0.11], [pxw, 2.64, pz], new THREE.MeshStandardMaterial({ color: '#fff6de', emissive: '#fff0c8', emissiveIntensity: closed ? 0 : 0.8 }), 14);
    const card = s.label(closed ? 'CLOSED' : night ? 'CLOSING' : 'OPEN', 0.62, 0.24, [-hx + 0.02, 1.3, pz - 0.05], '#f4efdc', closed ? '#3a3a3c' : '#b3232a');
    card.rotation.y = Math.PI / 2; card.rotation.z = closed ? 0.12 : 0;

    const spin = closed ? 0 : mix(0.4, 3, mood.energy);
    const flick = mood.energy;
    world.update = (dt, time) => {
      drum.rotation.y += dt * spin;
      if (screen && !closed) screen.emissiveIntensity = 0.75 + Math.sin(time * 9 * (0.4 + flick)) * 0.12 + Math.sin(time * 23) * 0.08;
    };
    return world;
  },
});
