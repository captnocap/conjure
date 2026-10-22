import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

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

const CANOPIES = {
  'red-white': ['#d8322c', '#f8f4e8'],
  'blue-white': ['#2b6fb8', '#f8f4e8'],
  'pink-mint': ['#f48fb1', '#a8e0cf'],
  'yellow-white': ['#f4c21c', '#f8f4e8'],
  'green-cream': ['#2f7a55', '#f1e6c4'],
} as const;
const BODIES = {
  cream: { wall: '#f1e9d2', trim: '#c9483a', ink: '#8c2f26' },
  mint: { wall: '#bfe3d5', trim: '#f8f4e8', ink: '#23644f' },
  pink: { wall: '#f6c3cf', trim: '#f8f4e8', ink: '#a8324f' },
  chrome: { wall: '#dfe5e8', trim: '#2b6fb8', ink: '#1d4f8a' },
} as const;
const MENUS = {
  'soft-serve': { name: 'ICES', lines: ['CORNETS  2d', 'WAFERS  3d', '99 FLAKE  6d', 'TUBS  4d'] },
  lollies: { name: 'LOLLIES', lines: ['ICE LOLLY  1d', 'ORANGE  2d', 'ROCKET  3d', 'CHOC ICE  4d'] },
  chips: { name: 'CHIPS & TEAS', lines: ['CHIPS  3d', 'TEA  1d', 'BOVRIL  2d', 'PEAS  2d'] },
  shuttered: { name: 'ICES', lines: ['CLOSED', 'back at', 'Easter'] },
} as const;

export default defineThing({
  questions: {
    sells: choice('What does the kiosk sell?', {
      'soft-serve': 'Soft-serve cones and wafers: a giant whipped cone with a flake on the roof.',
      lollies: 'Ice lollies: a giant striped rocket lolly on the roof and posters of lollies by the hatch.',
      chips: 'Hot chips and tea: a giant paper cone of chips on the roof and steam at the hatch.',
      shuttered: 'Nothing today: the roller shutter is down and padlocked.',
    }),
    canopy: choice('What colours is the striped canopy?', {
      'red-white': 'Red and white, like a stick of rock.',
      'blue-white': 'Blue and white, crisp and nautical.',
      'pink-mint': 'Pink and mint, ice-cream parlour sweet.',
      'yellow-white': 'Sunny yellow and white.',
      'green-cream': 'Park-keeper green and cream.',
    }),
    body: choice('What is the drum of the kiosk like?', {
      cream: 'Cream render with a red plinth and trim.',
      mint: 'Mint-green enamel panels with white trim.',
      pink: 'Sugar pink with white trim.',
      chrome: 'Streamlined pale steel with blue speed bands, very 1930s.',
    }),
    dropped: noul('Has someone dropped a cone, now melting on the paving in front?'),
    counter: choice('What is at the hatch?', {
      bell: 'A brass bell and a napkin dispenser: ring for service.',
      sauces: 'Sauce bottles, salt and vinegar lined up on the counter.',
      'back-soon': 'A hand-lettered BACK IN 5 MINS card propped on the counter.',
      bin: 'An overflowing litter bin of wrappers and lolly sticks beside it.',
      queue: 'A QUEUE HERE post and a sagging rope.',
    }),
    gull: noul('Is a seagull perched on the roof?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [c1, c2] = CANOPIES[a.canopy];
    const body = BODIES[a.body];
    const menu = MENUS[a.sells];
    const shut = a.sells === 'shuttered';
    const R = 1.1, H = 2.3, base = 0.14;
    const TW = 1024, TH = 256, pxm = TH / H;
    const yPx = (metres: number) => (H - metres) * pxm;

    // Drum, painted as one wrapped canvas: the hatch faces +z at the middle of the texture.
    const wallMap = paint(TW, TH, (c) => {
      c.fillStyle = body.wall; c.fillRect(0, 0, TW, TH);
      c.strokeStyle = 'rgba(0,0,0,0.1)'; c.lineWidth = 2;
      for (let x = 0; x < TW; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, TH); c.stroke(); }
      c.fillStyle = body.trim; c.fillRect(0, yPx(0.26), TW, TH);
      if (a.body === 'chrome') for (let i = 0; i < 3; i++) c.fillRect(0, yPx(2.2 - i * 0.09), TW, 5);
      else c.fillRect(0, yPx(2.2), TW, 6);
      // Hatch.
      const hw = 230, hx = TW / 2 - hw / 2, hTop = yPx(1.95), hBot = yPx(1.05);
      c.fillStyle = body.trim; c.fillRect(hx - 10, hTop - 10, hw + 20, hBot - hTop + 20);
      if (shut) {
        c.fillStyle = '#9aa2a6'; c.fillRect(hx, hTop, hw, hBot - hTop);
        c.strokeStyle = '#6f777b'; c.lineWidth = 2;
        for (let y = hTop + 6; y < hBot; y += 7) { c.beginPath(); c.moveTo(hx, y); c.lineTo(hx + hw, y); c.stroke(); }
        c.fillStyle = '#c9a13c'; c.fillRect(TW / 2 - 7, hBot - 16, 14, 12);
        c.save(); c.translate(TW / 2, (hTop + hBot) / 2); c.rotate(-0.06);
        c.fillStyle = '#f4efdf'; c.fillRect(-62, -20, 124, 40); c.fillStyle = '#c9232b'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CLOSED', 0, 2);
        c.restore();
      } else {
        c.fillStyle = '#2b2622'; c.fillRect(hx, hTop, hw, hBot - hTop);
        c.fillStyle = '#4a4038'; c.fillRect(hx, hTop + 34, hw, 4);
        // Stock on the back shelves.
        for (let i = 0; i < 11; i++) {
          const x = hx + 12 + i * 19.5;
          if (a.sells === 'soft-serve') { c.fillStyle = '#d9a35c'; c.beginPath(); c.moveTo(x, hTop + 34); c.lineTo(x + 12, hTop + 34); c.lineTo(x + 6, hTop + 12); c.fill(); }
          else if (a.sells === 'lollies') { c.fillStyle = ['#e23a2c', '#f6c915', '#3fae4a', '#ff8a1f'][i % 4]; c.fillRect(x + 1, hTop + 8, 9, 18); c.fillStyle = '#d9c79a'; c.fillRect(x + 4, hTop + 26, 3, 8); }
          else { c.fillStyle = i % 2 ? '#f4efdf' : '#b9c2c6'; c.fillRect(x, hTop + 16, 12, 18); }
        }
        if (a.sells === 'soft-serve') { c.fillStyle = '#c3cacd'; c.fillRect(hx + 30, hTop + 50, 50, 60); c.fillStyle = '#8d9396'; c.fillRect(hx + 48, hTop + 86, 14, 20); }
        if (a.sells === 'chips') { c.fillStyle = '#c3cacd'; c.fillRect(hx + 120, hTop + 52, 80, 60); c.fillStyle = '#f2c14a'; c.fillRect(hx + 126, hTop + 58, 68, 14); }
        c.fillStyle = `rgba(255,214,140,${mix(0.05, 0.28, mood.cheer)})`; c.fillRect(hx, hTop, hw, hBot - hTop);
      }
      // Name panel under the counter.
      c.fillStyle = body.wall; c.fillRect(TW / 2 - 130, yPx(0.92), 260, yPx(0.34) - yPx(0.92));
      c.strokeStyle = body.ink; c.lineWidth = 4; c.strokeRect(TW / 2 - 126, yPx(0.92) + 4, 252, yPx(0.34) - yPx(0.92) - 8);
      c.fillStyle = body.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 54px serif'; c.fillText(menu.name, TW / 2, (yPx(0.92) + yPx(0.34)) / 2 + 2, 236);
      // Enamel adverts either side, a door round the back.
      for (const side of [-1, 1]) {
        const px = TW / 2 + side * 250;
        c.fillStyle = side < 0 ? '#1d4f8a' : '#c9232b'; c.beginPath(); c.arc(px, yPx(1.5), 42, 0, 7); c.fill();
        c.fillStyle = '#fbf7ea'; c.font = 'bold 26px sans-serif'; c.fillText(side < 0 ? 'ICES' : a.sells === 'chips' ? 'TEAS' : 'COLD', px, yPx(1.5));
        c.fillStyle = '#f6e7a8'; c.fillRect(px - 32, yPx(0.95), 64, 62);
        c.fillStyle = '#c9483a'; c.font = 'bold 15px sans-serif'; c.fillText(side < 0 ? 'WAFERS' : 'MINERALS', px, yPx(0.95) + 16, 58); c.fillText('2d', px, yPx(0.95) + 42);
      }
      c.fillStyle = body.trim; c.fillRect(-60, yPx(2.0), 120, TH); c.fillRect(TW - 60, yPx(2.0), 120, TH);
      // Weathering.
      for (let i = 0; i < Math.round(mood.wear * 60); i++) { c.fillStyle = `rgba(90,70,50,${0.1 + random() * 0.2})`; const x = random() * TW; c.fillRect(x, random() * 60, 2 + random() * 5, 40 + random() * 180); }
      for (let i = 0; i < Math.round(mood.wear * mood.wear * 50); i++) { c.fillStyle = 'rgba(150,140,122,0.8)'; c.beginPath(); c.ellipse(random() * TW, random() * TH, 3 + random() * 9, 2 + random() * 6, random() * 3, 0, 7); c.fill(); }
    });
    const drum = s.mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true), new THREE.MeshStandardMaterial({ map: wallMap, roughness: a.body === 'chrome' ? 0.35 : 0.75, metalness: a.body === 'chrome' ? 0.35 : 0 }), [0, base + H / 2, 0]);
    drum.rotation.y = Math.PI;
    const trim = s.material(body.trim);
    s.cylinder(R + 0.07, R + 0.1, base, [0, base / 2, 0], trim, 40);
    s.cylinder(R + 0.03, R + 0.03, 0.06, [0, base + H - 0.03, 0], trim, 40);

    // Counter shelf, curved round the front.
    const steel = s.material('#c3cacd', { metalness: 0.75, roughness: 0.3 });
    const counterY = base + 1.03;
    const shelf = s.mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.05, 32, 1, false, -0.72, 1.44), steel, [0, counterY, 0]);
    void shelf;
    for (const sx of [-1, 1]) s.rod([sx * 0.7, counterY - 0.03, R + 0.2], [sx * 0.7, counterY - 0.4, R * 0.78], 0.015, steel);

    // Canopy: striped cone, scalloped valance, a string of bulbs.
    const stripeMap = paint(512, 64, (c) => {
      c.clearRect(0, 0, 512, 64);
      for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? c2 : c1; c.fillRect(i * 32, 0, 32, 40); c.beginPath(); c.arc(i * 32 + 16, 40, 16, 0, Math.PI); c.fill(); }
    });
    const coneMap = paint(512, 8, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? c2 : c1; c.fillRect(i * 32, 0, 32, 8); } });
    const fade = new THREE.Color('#a9a294');
    const cloth = new THREE.MeshStandardMaterial({ map: coneMap, roughness: 0.85, side: THREE.DoubleSide });
    cloth.color.lerp(fade, mood.wear * 0.4);
    const CR = 1.55, roofY = base + H, CH = 0.78;
    s.mesh(new THREE.ConeGeometry(CR, CH, 32, 1, true), cloth, [0, roofY + CH / 2, 0]);
    const valance = new THREE.MeshStandardMaterial({ map: stripeMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
    valance.color.lerp(fade, mood.wear * 0.4);
    s.mesh(new THREE.CylinderGeometry(CR, CR, 0.26, 32, 1, true), valance, [0, roofY - 0.13, 0]);
    s.cylinder(CR - 0.02, CR - 0.02, 0.03, [0, roofY - 0.01, 0], s.material('#e9e4d4'), 32);
    const bulbs = 24;
    const glow = mix(0.1, 1.6, mood.cheer) * (shut ? 0.1 : 1);
    s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd36a', emissiveIntensity: glow, roughness: 0.3 }),
      Array.from({ length: bulbs }, (_u, i) => ({ at: [Math.sin((i / bulbs) * Math.PI * 2) * (CR + 0.03), roofY + 0.02, Math.cos((i / bulbs) * Math.PI * 2) * (CR + 0.03)] as const, size: 0.04 })));

    // The giant fibreglass thing on the roof.
    const topper = new THREE.Group();
    topper.position.set(0, roofY + CH - 0.08, 0);
    topper.rotation.z = (random() - 0.5) * 0.16 + mood.wear * 0.12;
    topper.rotation.x = 0.06;
    s.root.add(topper);
    const on = (mesh: THREE.Mesh) => { topper.add(mesh); return mesh; };
    on(s.cylinder(0.12, 0.2, 0.16, [0, 0.06, 0], trim, 16));
    if (a.sells === 'lollies') {
      const lollyMap = paint(64, 128, (c) => { ['#e23a2c', '#f6c915', '#3fae4a'].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 43, 64, 43); }); });
      const shape = new THREE.Shape();
      const lw = 0.3, lh = 0.95;
      shape.moveTo(-lw, 0); shape.lineTo(lw, 0); shape.lineTo(lw, lh - lw); shape.absarc(0, lh - lw, lw, 0, Math.PI, false); shape.lineTo(-lw, 0);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 14 });
      geometry.translate(0, 0, -0.1);
      // Remap UVs so the bands run up the lolly.
      const uv = geometry.attributes.uv, pos = geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, 1 - Math.max(0, Math.min(1, pos.getY(i) / lh)));
      const lolly = on(s.mesh(geometry, new THREE.MeshStandardMaterial({ map: lollyMap, roughness: 0.3 }), [0, 0.62, 0]));
      lolly.rotation.y = 0.35;
      on(s.box([0.11, 0.56, 0.035], [0, 0.36, 0], s.material('#e3cf9f')));
    } else if (a.sells === 'chips') {
      const paperMap = paint(128, 128, (c) => {
        c.fillStyle = '#f6f1e2'; c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#c9232b'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) c.fillRect(i * 16, j * 16, 16, 16);
      });
      const paper = on(s.mesh(new THREE.ConeGeometry(0.46, 0.95, 20, 1, true), new THREE.MeshStandardMaterial({ map: paperMap, roughness: 0.8, side: THREE.DoubleSide }), [0, 0.6, 0]));
      paper.rotation.x = Math.PI;
      on(s.cylinder(0.43, 0.4, 0.06, [0, 1.02, 0], s.material('#d99a2b'), 18));
      const chip = s.material('#f2c14a', { roughness: 0.6 });
      for (let i = 0; i < 16; i++) {
        const t = random() * Math.PI * 2, r = random() * 0.32;
        const fry = on(s.box([0.07, 0.3 + random() * 0.25, 0.07], [Math.sin(t) * r, 1.12 + random() * 0.1, Math.cos(t) * r], chip));
        fry.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
      }
    } else {
      const waffleMap = paint(128, 128, (c) => {
        c.fillStyle = '#d9a35c'; c.fillRect(0, 0, 128, 128);
        c.strokeStyle = '#a8742f'; c.lineWidth = 3;
        for (let i = -128; i < 256; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.stroke(); c.beginPath(); c.moveTo(i + 128, 0); c.lineTo(i, 128); c.stroke(); }
      });
      const wafer = on(s.mesh(new THREE.ConeGeometry(0.36, 0.92, 22), new THREE.MeshStandardMaterial({ map: waffleMap, roughness: 0.7 }), [0, 0.6, 0]));
      wafer.rotation.x = Math.PI;
      const cream = s.material(shut ? '#e6dfcc' : a.canopy === 'pink-mint' ? '#f9c2d2' : '#fbf5e3', { roughness: 0.35 });
      const whirl = [[0.4, 0.15], [0.33, 0.14], [0.25, 0.13], [0.16, 0.11]] as const;
      let y = 1.1;
      whirl.forEach(([r, t], i) => {
        const turn = on(s.mesh(new THREE.TorusGeometry(r - t * 0.6, t, 10, 24), cream, [(i % 2 ? 1 : -1) * 0.02, y, 0]));
        turn.rotation.x = Math.PI / 2 + 0.08 * (i % 2 ? 1 : -1);
        y += t * 1.25;
      });
      on(s.mesh(new THREE.ConeGeometry(0.11, 0.26, 12), cream, [0.03, y + 0.02, 0])).rotation.z = -0.25;
      if (a.sells === 'soft-serve') on(s.box([0.09, 0.5, 0.09], [0.2, 1.5, 0.05], s.material('#5a3320', { roughness: 0.8 }))).rotation.z = -0.5;
    }

    // Chalked price board on an A-frame.
    const boardMap = paint(256, 384, (c) => {
      c.fillStyle = '#262c2b'; c.fillRect(0, 0, 256, 384);
      for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(235,235,225,${0.03 + random() * 0.05})`; c.beginPath(); c.ellipse(random() * 256, random() * 384, 30 + random() * 50, 10 + random() * 16, random() * 3, 0, 7); c.fill(); }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#f6d86a'; c.font = 'bold 44px sans-serif'; c.fillText(shut ? 'SORRY' : 'TODAY', 128, 46);
      c.fillStyle = 'rgba(245,244,236,0.95)';
      menu.lines.forEach((line, i) => { c.save(); c.translate(128, 116 + i * 68); c.rotate((random() - 0.5) * 0.06); c.font = `italic bold ${shut ? 50 : 38}px sans-serif`; c.fillText(line, 0, 0, 232); c.restore(); });
    });
    const sign = new THREE.Group();
    sign.position.set(-(R + 0.75), 0, R + 0.35 + random() * 0.3);
    sign.rotation.y = 0.35 + (random() - 0.5) * 0.3;
    s.root.add(sign);
    const wood = s.material('#8a6238', { roughness: 0.8 });
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.03), wood); front.position.set(0, 0.5, 0.13); front.rotation.x = -0.26; front.castShadow = true;
    const slate = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.82), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.95 })); slate.position.set(0, 0.51, 0.149); slate.rotation.x = -0.26;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.03), wood); back.position.set(0, 0.5, -0.13); back.rotation.x = 0.26; back.castShadow = true;
    sign.add(front, slate, back);

    // At the hatch.
    const cz = R + 0.16;
    if (a.counter === 'bell') {
      const brass = s.material('#c9a13c', { metalness: 0.8, roughness: 0.3 });
      s.ball([0.07, 0.05, 0.07], [0.4, counterY + 0.05, cz], brass, 14);
      s.cylinder(0.012, 0.012, 0.03, [0.4, counterY + 0.11, cz], brass, 8);
      s.box([0.16, 0.14, 0.12], [-0.42, counterY + 0.095, cz], steel);
      s.box([0.12, 0.05, 0.02], [-0.42, counterY + 0.12, cz + 0.065], s.material('#fbf7ea'));
    } else if (a.counter === 'sauces') {
      const tints = ['#c9232b', '#5a3320', '#f2c21c', '#f4f1e8', '#b9c2c6'];
      for (let i = 0; i < 5; i++) {
        const x = -0.5 + i * 0.25 + (random() - 0.5) * 0.06;
        s.cylinder(0.035, 0.04, 0.16, [x, counterY + 0.105, Math.sqrt(Math.max(0.01, (R + 0.17) ** 2 - x * x))], s.material(tints[i], { roughness: 0.35 }), 12);
        s.cylinder(0.012, 0.03, 0.05, [x, counterY + 0.21, Math.sqrt(Math.max(0.01, (R + 0.17) ** 2 - x * x))], s.material(i < 3 ? tints[i] : '#8d9396'), 10);
      }
    } else if (a.counter === 'back-soon') {
      const card = s.label('BACK IN 5 MINS', 0.6, 0.26, [0.1, counterY + 0.155, cz + 0.02], '#c9232b', '#fbf7e6');
      card.rotation.x = -0.25; card.rotation.z = (random() - 0.5) * 0.12;
    } else if (a.counter === 'bin') {
      const bx = R + 0.75, bz = R * 0.75;
      const wireMap = paint(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.strokeStyle = '#6f777b'; c.lineWidth = 4; for (let k = 0; k <= 8; k++) { c.beginPath(); c.moveTo(k * 8, 0); c.lineTo(k * 8, 64); c.stroke(); } for (let k = 0; k <= 3; k++) { c.beginPath(); c.moveTo(0, k * 21); c.lineTo(64, k * 21); c.stroke(); } });
      wireMap.wrapS = THREE.RepeatWrapping; wireMap.repeat.x = 3;
      s.mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.7, 20, 1, true), new THREE.MeshStandardMaterial({ map: wireMap, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }), [bx, 0.35, bz]);
      s.cylinder(0.2, 0.2, 0.03, [bx, 0.015, bz], s.material('#6f777b'), 16);
      const litter = ['#f4efdf', '#e23a2c', '#f6c915', '#7fc8e8', '#f4efdf', '#d9a35c'];
      const pile = 8 + Math.round(mood.density * 12);
      for (let i = 0; i < pile; i++) {
        const spilled = i > pile * 0.55;
        const t = random() * 6, r = spilled ? 0.3 + random() * 0.45 : random() * 0.17;
        const scrap = s.box([0.1 + random() * 0.1, 0.03 + random() * 0.05, 0.08 + random() * 0.08], [bx + Math.sin(t) * r, spilled ? 0.02 : 0.45 + random() * 0.36, bz + Math.cos(t) * r], s.material(litter[i % litter.length], { roughness: 0.9 }));
        scrap.rotation.set(random(), random() * 3, random());
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#d9a01c'), Array.from({ length: 5 }, () => ({ at: [bx + (random() - 0.5) * 0.5, 0.75 + random() * 0.4, bz + (random() - 0.5) * 0.5] as const, size: 0.018 })));
    } else {
      const px = R + 0.55, pz = R + 0.55;
      const post = s.material('#c9a13c', { metalness: 0.7, roughness: 0.35 });
      for (const [x, z] of [[px, pz], [px + 0.2, pz - 1.3]] as const) {
        s.cylinder(0.16, 0.18, 0.04, [x, 0.02, z], post, 16);
        s.cylinder(0.022, 0.022, 0.95, [x, 0.5, z], post, 10);
        s.ball([0.045, 0.045, 0.045], [x, 0.99, z], post, 10);
      }
      s.tube([[px, 0.92, pz], [px + 0.07, 0.68, pz - 0.45], [px + 0.13, 0.68, pz - 0.85], [px + 0.2, 0.92, pz - 1.3]], 0.02, s.material('#a8232b', { roughness: 0.9 }));
      const queue = s.label('QUEUE HERE', 0.44, 0.14, [px, 1.12, pz], '#fbf7ea', '#a8232b');
      queue.rotation.y = 0.4;
    }

    // Steam from a chip kiosk.
    const puffs: THREE.Mesh[] = [];
    if (a.sells === 'chips') {
      const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false });
      for (let i = 0; i < 4; i++) { const puff = s.ball([0.14, 0.14, 0.14], [0.3 + (random() - 0.5) * 0.2, counterY + 0.7 + i * 0.22, R + 0.12], steam, 10); puff.castShadow = false; puffs.push(puff); }
    }

    // A dropped cone, melting.
    if (a.dropped) {
      const dx = 0.2 + random() * 0.7, dz = R + 0.95 + random() * 0.35;
      const flavour = ['#fbf5e3', '#f9b8cc', '#7a4a2c', '#bfe8c9'][Math.floor(random() * 4)];
      const blob = s.material(flavour, { roughness: 0.25 });
      const puddle = s.cylinder(1, 1, 0.012, [dx, 0.006, dz], blob, 20);
      puddle.scale.set(0.2 + random() * 0.08, 1, 0.15 + random() * 0.06); puddle.rotation.y = random() * 3;
      for (let i = 0; i < 3; i++) { const run = s.cylinder(1, 1, 0.01, [dx + (random() - 0.5) * 0.4, 0.005, dz + (random() - 0.5) * 0.3], blob, 12); run.scale.set(0.05 + random() * 0.05, 1, 0.04 + random() * 0.04); }
      s.ball([0.09, 0.06, 0.09], [dx, 0.045, dz], blob, 12);
      const fallen = s.mesh(new THREE.ConeGeometry(0.06, 0.2, 12), s.material('#d9a35c'), [dx + 0.11, 0.06, dz + 0.06]);
      fallen.rotation.set(Math.PI / 2 + 0.25, 0, -0.9, 'YXZ'); fallen.rotation.y = 0.8;
    }

    // Seagull on the canopy.
    let gull: THREE.Group | null = null;
    if (a.gull) {
      gull = new THREE.Group();
      const t = 0.9 + random() * 1.2, r = CR * 0.62;
      gull.position.set(Math.sin(t) * r, roofY + CH * (1 - 0.62) + 0.1, Math.cos(t) * r);
      gull.rotation.y = random() * 6; gull.scale.setScalar(1.7);
      const white = s.material('#f6f4ee'), grey = s.material('#9aa2a8'), yellow = s.material('#f2b61c');
      const part = (mesh: THREE.Mesh) => { gull!.add(mesh); return mesh; };
      part(s.ball([0.1, 0.09, 0.19], [0, 0.1, 0], white, 12));
      part(s.ball([0.105, 0.05, 0.16], [0, 0.14, -0.04], grey, 10));
      part(s.ball([0.065, 0.065, 0.07], [0, 0.23, 0.14], white, 10));
      part(s.mesh(new THREE.ConeGeometry(0.02, 0.09, 6), yellow, [0, 0.22, 0.24])).rotation.x = Math.PI / 2;
      part(s.box([0.05, 0.02, 0.12], [0, 0.12, -0.24], s.material('#2a2d30')));
      for (const sx of [-1, 1]) part(s.cylinder(0.006, 0.006, 0.1, [sx * 0.03, 0, 0.02], yellow, 5));
      s.root.add(gull);
    }

    const lively = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        puffs.forEach((puff, i) => { const k = (time * 0.25 * lively + i * 0.25) % 1; puff.position.y = counterY + 0.6 + k * 1.0; puff.scale.setScalar(0.1 + k * 0.22); });
        if (gull) gull.children[2].rotation.y = Math.sin(time * 0.9 * lively) * 0.5;
      },
    });
  },
});
