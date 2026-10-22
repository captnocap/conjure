import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const lines = (g: CanvasRenderingContext2D, w: number, rows: [string, number, string][], top: number) => {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let y = top;
  for (const [text, size, colour] of rows) {
    g.font = `bold ${size}px monospace`;
    g.fillStyle = colour;
    g.fillText(text, w / 2, y, w - 16);
    y += size * 1.25;
  }
};

export default defineThing({
  questions: {
    screen: choice('What is on the screen?', {
      welcome: 'A bright blue welcome screen asking for a card.',
      service: 'OUT OF SERVICE in block capitals with a warning triangle.',
      funds: 'A red INSUFFICIENT FUNDS notice with a tiny balance.',
      retained: 'CARD RETAINED: the machine has eaten someone\'s card.',
      cash: 'A green PLEASE TAKE YOUR CASH prompt.',
      crashed: 'A crashed operating system: white error text on blue.',
      dead: 'Dark and cracked, nothing at all.',
    }),
    topper: choice('What does the lit sign on top say?', {
      blue: 'ATM in white on glowing blue.',
      green: 'CASH in white on money green.',
      red: 'ATM 24 HR in yellow on red.',
      yellow: 'A yellow box with black dollar signs.',
      broken: 'An ATM sign with a dead tube, cracked and unlit.',
    }),
    fee: choice('What does the fee notice say?', {
      printed: 'A small printed sticker: fee $2.50.',
      marker: 'A handwritten sheet taped on: FEE $3.75.',
      steep: 'A big taped notice: $4.95 PER TRANSACTION, NO REFUNDS.',
      minimum: 'CASH ONLY STORE, $10 MINIMUM on a neon card.',
    }),
    cabinet: choice('What colour is the cabinet?', {
      grey: 'Putty-grey steel, anonymous.',
      black: 'Matte black with a silver fascia.',
      beige: 'Yellowed beige plastic from the 1990s.',
      blue: 'Wrapped in bright blue vinyl by the operator.',
    }),
    stickers: choice('How covered in stickers and tags is it?', {
      clean: 'Clean, newly installed.',
      few: 'A few stickers on the door.',
      slapped: 'Slap stickers and marker tags all over the sides.',
      layered: 'Years of layers: stickers over tags over scraped-off stickers.',
    }),
    receipts: score('How many receipts litter the floor around it?', ['None', 'One or two', 'A scattering', 'A drift of curled receipts']),
    left: choice('What has been left at the machine?', {
      nothing: 'Nothing.',
      card: 'A bank card forgotten in the slot.',
      bills: 'Cash still sticking out of the dispenser.',
      chain: 'A heavy chain and padlock around the cabinet.',
      cup: 'A paper coffee cup abandoned on top.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 0.52;
    const shell = s.material({ grey: '#b9b8ae', black: '#26272a', beige: '#d9cda6', blue: '#1f5fc0' }[a.cabinet], { roughness: 0.55, metalness: a.cabinet === 'grey' ? 0.3 : 0.05 });
    const fascia = s.material(a.cabinet === 'black' ? '#c3c7c8' : '#3a3d42', { roughness: 0.45, metalness: 0.4 });
    const dark = s.material('#1a1b1e', { roughness: 0.5 });
    const steel = s.material('#c6cbcc', { metalness: 0.8, roughness: 0.3 });

    // Pedestal, lower safe cabinet and door.
    s.box([W + 0.04, 0.07, 0.6], [0, 0.035, 0], dark);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.014, 0.02, [x * 0.24, 0.08, z * 0.27], steel, 6);
    s.box([W, 0.84, 0.52], [0, 0.49, 0], shell);
    s.box([W - 0.07, 0.72, 0.012], [0, 0.48, 0.262], shell);
    s.box([0.012, 0.72, 0.004], [-W / 2 + 0.04, 0.48, 0.27], dark);
    s.cylinder(0.022, 0.022, 0.02, [W / 2 - 0.09, 0.56, 0.275], steel, 12).rotation.x = Math.PI / 2;
    s.box([0.03, 0.1, 0.025], [W / 2 - 0.09, 0.44, 0.275], steel);
    for (let i = 0; i < 5; i++) for (const x of [-1, 1]) s.box([0.004, 0.012, 0.22], [x * (W / 2 + 0.001), 0.2 + i * 0.03, -0.08], dark);

    // Head: one extruded side profile with a slanted screen and a keypad shelf.
    const profile = new THREE.Shape();
    for (const [z, y] of [[-0.26, 0.9], [-0.26, 1.46], [0.05, 1.46], [0.2, 1.16], [0.34, 1.085], [0.34, 1.0], [0.27, 0.93], [0.27, 0.9]]) profile.lineTo(-z, y);
    profile.closePath();
    const head = s.mesh(new THREE.ExtrudeGeometry(profile, { depth: W + 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), shell, [-(W + 0.03) / 2, 0, 0]);
    head.rotation.y = Math.PI / 2;
    const screenTilt = -Math.atan2(0.15, 0.3), sy = 1.31, sz = 0.125;
    const onFascia = (mesh: THREE.Object3D, dx: number, along: number, out: number) => {
      // Position on the slanted fascia: dx sideways, `along` up the slope from its centre, `out` off the surface.
      mesh.position.set(dx, sy + along * Math.cos(-screenTilt) + out * Math.sin(-screenTilt), sz - along * Math.sin(-screenTilt) + out * Math.cos(-screenTilt));
      mesh.rotation.x = screenTilt;
    };
    onFascia(s.box([W - 0.02, 0.31, 0.012], [0, 0, 0], fascia), 0, 0, 0.004);
    onFascia(s.box([0.32, 0.25, 0.012], [0, 0, 0], dark), -0.07, 0.005, 0.012);

    const bright = mix(0.5, 1.15, mood.cheer);
    const screens: Record<typeof a.screen, Draw> = {
      welcome: (g, w, h) => { g.fillStyle = '#1456c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#0c3c96'; g.fillRect(0, h - 44, w, 44); lines(g, w, [['WELCOME', 46, '#ffffff'], ['PLEASE INSERT', 24, '#cfe2ff'], ['YOUR CARD', 24, '#cfe2ff']], 62); g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(w - 60, h - 34); g.lineTo(w - 22, h - 22); g.lineTo(w - 60, h - 10); g.fill(); },
      service: (g, w, h) => { g.fillStyle = '#101216'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6c21c'; g.beginPath(); g.moveTo(w / 2, 16); g.lineTo(w / 2 + 44, 86); g.lineTo(w / 2 - 44, 86); g.fill(); g.fillStyle = '#101216'; g.fillRect(w / 2 - 4, 40, 8, 26); g.fillRect(w / 2 - 4, 72, 8, 8); lines(g, w, [['OUT OF', 36, '#ffffff'], ['SERVICE', 36, '#ffffff']], 122); },
      funds: (g, w, h) => { g.fillStyle = '#b3201c'; g.fillRect(0, 0, w, h); lines(g, w, [['INSUFFICIENT', 32, '#ffffff'], ['FUNDS', 44, '#ffffff'], [`BALANCE $${(random() * 9).toFixed(2)}`, 22, '#ffd9c9']], 54); },
      retained: (g, w, h) => { g.fillStyle = '#e9e6da'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3201c'; g.fillRect(0, 0, w, 20); lines(g, w, [['CARD', 44, '#1a1b1e'], ['RETAINED', 40, '#b3201c'], ['CONTACT YOUR BANK', 20, '#1a1b1e']], 62); },
      cash: (g, w, h) => { g.fillStyle = '#0f7a3c'; g.fillRect(0, 0, w, h); lines(g, w, [['PLEASE TAKE', 30, '#ffffff'], ['YOUR CASH', 40, '#e8ffd0'], ['$ $ $', 40, '#9cf07a']], 52); },
      crashed: (g, w, h) => { g.fillStyle = '#0a1ea8'; g.fillRect(0, 0, w, h); g.textAlign = 'left'; g.textBaseline = 'top'; g.font = 'bold 15px monospace'; g.fillStyle = '#ffffff'; ['A fatal exception 0E has', 'occurred at 0028:C0011E36', '', '* Press any key to', '  terminate the application', '', 'KERNEL32.DLL  ERR 0x7B', 'cash_dispenser not found', '', 'Press any key to continue _'].forEach((text, i) => g.fillText(text, 10, 12 + i * 18)); },
      dead: (g, w, h) => { g.fillStyle = '#0c0d10'; g.fillRect(0, 0, w, h); g.strokeStyle = '#59606a'; g.lineWidth = 2; const cx = w * (0.3 + random() * 0.4), cy = h * (0.3 + random() * 0.4); for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(cx, cy); const t = random() * 7; g.lineTo(cx + Math.cos(t) * 70 + random() * 30, cy + Math.sin(t) * 60); g.lineTo(cx + Math.cos(t + 0.2) * 190, cy + Math.sin(t + 0.2) * 170); g.stroke(); } },
    };
    const screenTexture = paint(256, 200, screens[a.screen]);
    const lit = a.screen !== 'dead';
    const screenMaterial = new THREE.MeshStandardMaterial({ map: screenTexture, emissive: lit ? '#ffffff' : '#000000', emissiveMap: lit ? screenTexture : null, emissiveIntensity: lit ? bright : 0, roughness: 0.25 });
    const screen = s.mesh(new THREE.PlaneGeometry(0.29, 0.225), screenMaterial);
    screen.castShadow = false;
    onFascia(screen, -0.07, 0.005, 0.0195);
    // Function keys beside the screen, card reader and receipt slot on the right.
    for (let i = 0; i < 4; i++) onFascia(s.box([0.018, 0.022, 0.01], [0, 0, 0], steel), 0.1, 0.085 - i * 0.055, 0.014);
    onFascia(s.box([0.1, 0.07, 0.03], [0, 0, 0], dark), 0.185, 0.07, 0.02);
    const slotGlow = new THREE.MeshStandardMaterial({ color: '#39e06a', emissive: '#39e06a', emissiveIntensity: a.screen === 'retained' || a.screen === 'service' || !lit ? 0.05 : 1 });
    onFascia(s.box([0.075, 0.008, 0.006], [0, 0, 0], a.screen === 'retained' ? new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff3a2a', emissiveIntensity: 1 }) : slotGlow), 0.185, 0.07, 0.038);
    onFascia(s.box([0.09, 0.012, 0.012], [0, 0, 0], dark), 0.185, -0.06, 0.014);
    const paper = s.material('#fbfaf2', { roughness: 0.9 });
    if (a.receipts > 0.15) { const tongue = s.box([0.07, 0.09, 0.002], [0, 0, 0], paper); onFascia(tongue, 0.185, -0.1, 0.03); tongue.rotation.x = screenTilt + 0.5; }

    // Keypad on the shelf, cash mouth below it.
    const shelfTilt = -Math.PI / 2 + Math.atan2(0.075, 0.14);
    const keypad = s.mesh(new THREE.PlaneGeometry(0.17, 0.125), new THREE.MeshStandardMaterial({
      map: paint(136, 100, (g, w, h) => {
        g.fillStyle = '#2a2c30'; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          g.fillStyle = c === 3 ? ['#c4262a', '#e0b020', '#2a9a4a', '#8a8d92'][r] : '#d9dbd6';
          g.fillRect(8 + c * 32, 6 + r * 23, 26, 18);
          if (c < 3) { g.fillStyle = '#1a1b1e'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][r * 3 + c], 21 + c * 32, 16 + r * 23); }
        }
      }), roughness: 0.5, metalness: 0.3,
    }), [-0.06, 1.129, 0.268]);
    keypad.rotation.x = shelfTilt;
    s.box([0.3, 0.035, 0.02], [0, 1.042, 0.343], dark);
    s.box([0.3, 0.004, 0.03], [0, 1.062, 0.35], steel);

    // Topper lightbox.
    const topperLit = a.topper !== 'broken';
    const topperTexture = paint(256, 112, (g, w, h) => {
      const [ground, ink, text] = { blue: ['#1766e0', '#ffffff', 'ATM'], green: ['#12894a', '#ffffff', 'CASH'], red: ['#c81e1e', '#ffe14a', 'ATM 24HR'], yellow: ['#f6cf1c', '#151515', '$ ATM $'], broken: ['#59666e', '#c9cfd2', 'ATM'] }[a.topper];
      g.fillStyle = ground; g.fillRect(0, 0, w, h);
      g.strokeStyle = ink; g.lineWidth = 5; g.strokeRect(7, 7, w - 14, h - 14);
      lines(g, w, [[text, text.length > 4 ? 46 : 72, ink]], h / 2 + 3);
      if (!topperLit) { g.strokeStyle = '#1c2226'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 0); g.lineTo(90, 60); g.lineTo(70, 112); g.moveTo(90, 60); g.lineTo(170, 80); g.stroke(); }
    });
    const topperMaterial = new THREE.MeshStandardMaterial({ map: topperTexture, emissive: topperLit ? '#ffffff' : '#000000', emissiveMap: topperLit ? topperTexture : null, emissiveIntensity: topperLit ? bright : 0, roughness: 0.4 });
    s.box([0.16, 0.06, 0.08], [0, 1.49, -0.1], dark);
    s.box([W + 0.06, 0.26, 0.13], [0, 1.65, -0.1], dark);
    for (const z of [-1, 1]) {
      const face = s.mesh(new THREE.PlaneGeometry(W + 0.03, 0.23), topperMaterial, [0, 1.65, -0.1 + z * 0.0665]);
      face.rotation.y = z < 0 ? Math.PI : 0;
      face.castShadow = false;
    }

    // Fee notice on the door.
    const fee = { printed: [0.16, 0.09], marker: [0.24, 0.17], steep: [0.34, 0.26], minimum: [0.3, 0.2] }[a.fee];
    const notice = s.mesh(new THREE.PlaneGeometry(fee[0], fee[1]), new THREE.MeshStandardMaterial({
      map: paint(256, Math.round(256 * fee[1] / fee[0]), (g, w, h) => {
        g.fillStyle = a.fee === 'minimum' ? '#f4f01c' : a.fee === 'printed' ? '#f2f2ee' : '#fbf8ea'; g.fillRect(0, 0, w, h);
        if (a.fee === 'printed') { g.fillStyle = '#1c4ea8'; g.fillRect(0, 0, w, 30); lines(g, w, [['TRANSACTION FEE', 20, '#ffffff'], ['$2.50', 64, '#1a1b1e']], 16); }
        else if (a.fee === 'marker') lines(g, w, [['ATM FEE', 44, '#16161c'], ['$3.75', 78, '#b3201c']], 50);
        else if (a.fee === 'steep') lines(g, w, [['FEE', 40, '#16161c'], ['$4.95', 74, '#b3201c'], ['PER TRANSACTION', 22, '#16161c'], ['NO REFUNDS', 28, '#16161c']], 30);
        else lines(g, w, [['CASH ONLY', 42, '#16161c'], ['$10 MINIMUM', 34, '#c81e1e'], ['ATM FEE $3', 26, '#16161c']], 38);
        if (a.fee !== 'printed') { g.fillStyle = 'rgba(196,170,110,0.75)'; for (const [x, y] of [[0, 0], [w - 34, 0], [0, h - 16], [w - 34, h - 16]]) g.fillRect(x, y, 34, 16); }
      }), roughness: 0.9,
    }), [(random() - 0.5) * 0.06, 0.82 - fee[1] / 2 - 0.02, 0.2695]);
    notice.rotation.z = (random() - 0.5) * (a.fee === 'printed' ? 0.03 : 0.16);

    // Stickers and tags: one transparent overlay per face.
    const amount = { clean: 0, few: 4, slapped: 12, layered: 26 }[a.stickers];
    if (amount) {
      const words = ['HELLO', 'NO!', '718', 'LOVE', 'DSK', 'VOTE', 'LOST CAT', 'PIZZA', 'ROOM 4 RENT', 'WE BUY GOLD', 'DJ', 'XO', 'KEYS', 'OK', 'BAD LUCK', '$$$'];
      const hues = ['#f43a5a', '#ffd21c', '#19b8e8', '#ffffff', '#111111', '#3ad06a', '#ff7a1c', '#b04ae0', '#e9e2c9'];
      const overlay = (w: number, h: number, count: number, tags: number) => paint(256, Math.round(256 * h / w), (g, cw, ch) => {
        g.clearRect(0, 0, cw, ch);
        for (let i = 0; i < count; i++) {
          const text = pick(words), size = 14 + random() * 14, sw = text.length * size * 0.66 + 14, sh = size + 12;
          g.save();
          g.translate(20 + random() * (cw - 40), 20 + random() * (ch - 40));
          g.rotate((random() - 0.5) * 0.9);
          const ground = pick(hues);
          g.fillStyle = ground;
          if (random() < 0.3) { g.beginPath(); g.ellipse(0, 0, sw / 2, sh / 1.6, 0, 0, 7); g.fill(); } else g.fillRect(-sw / 2, -sh / 2, sw, sh);
          g.fillStyle = ground === '#111111' ? '#ffffff' : ground === '#ffffff' || ground === '#ffd21c' || ground === '#e9e2c9' ? '#b3201c' : '#111111';
          g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(text, 0, 1);
          // Peeling: bite pieces out of the sticker as it wears.
          g.globalCompositeOperation = 'destination-out';
          for (let p = 0; p < mood.wear * 5; p++) g.fillRect(-sw / 2 + random() * sw, -sh / 2 + random() * sh, sw * 0.3 * random(), sh * 0.6 * random());
          g.restore();
        }
        g.lineCap = 'round';
        for (let i = 0; i < tags; i++) {
          g.strokeStyle = pick(['#111111', '#111111', '#c4162a', '#f2f2f2', '#1c3ea8']);
          g.lineWidth = 3 + random() * 4;
          g.beginPath();
          let x = 20 + random() * (cw - 110), y = 30 + random() * (ch - 60);
          g.moveTo(x, y);
          for (let k = 0; k < 7; k++) { const nx = x + 8 + random() * 22, ny = y + (random() - 0.5) * 60; g.quadraticCurveTo(x + (random() - 0.5) * 30, ny, nx, y + (random() - 0.5) * 24); x = nx; }
          g.stroke();
        }
      });
      const film = (w: number, h: number, at: [number, number, number], turn: number, count: number, tags: number) => {
        const sheet = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: overlay(w, h, count, tags), transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }), at);
        sheet.rotation.y = turn;
        sheet.castShadow = false;
      };
      const tags = { clean: 0, few: 0, slapped: 3, layered: 6 }[a.stickers];
      film(W - 0.08, 0.5, [0, 0.36, 0.2705], 0, Math.ceil(amount * 0.4), Math.ceil(tags / 2));
      if (amount > 4) for (const x of [-1, 1]) {
        film(0.5, 0.8, [x * (W / 2 + 0.002), 0.5, 0], x * Math.PI / 2, Math.ceil(amount * 0.5), tags);
        film(0.42, 0.4, [x * (W / 2 + 0.026), 1.17, -0.04], x * Math.PI / 2, Math.ceil(amount * 0.25), Math.ceil(tags / 2));
      }
    }

    // Receipts on the floor.
    const count = Math.round(a.receipts ** 1.4 * mix(14, 30, mood.density));
    for (let i = 0; i < count; i++) {
      const r = 0.32 + random() * 0.36, t = random() * Math.PI * 1.5 - Math.PI * 0.25;
      const x = Math.cos(t) * r * 0.9, z = 0.1 + Math.sin(t) * r;
      if (random() < 0.3) s.ball([0.022, 0.016, 0.02], [x, 0.016, z], paper, 6);
      else {
        const slip = s.box([0.055, 0.0015, 0.09 + random() * 0.08], [x, 0.004 + i * 0.0004, z], paper);
        slip.rotation.set((random() - 0.5) * 0.25, random() * 6, 0);
      }
    }

    if (a.left === 'card') {
      const card = s.box([0.07, 0.003, 0.05], [0, 0, 0], s.material(pick(['#1c4ea8', '#c9a23a', '#1f8f6a', '#b3201c']), { metalness: 0.3 }));
      onFascia(card, 0.185, 0.07, 0.062);
      card.rotation.x = screenTilt + Math.PI / 2;
    }
    if (a.left === 'bills') for (let i = 0; i < 3; i++) s.box([0.14, 0.002, 0.07], [(i - 1) * 0.012, 1.05 + i * 0.002, 0.385], s.material(i % 2 ? '#7fae78' : '#93bf8a')).rotation.y = (i - 1) * 0.08;
    if (a.left === 'chain') {
      const iron = s.material('#5a5e62', { metalness: 0.8, roughness: 0.45 });
      const y = 0.66, links = 34, rx = W / 2 + 0.03, rz = 0.3;
      for (let i = 0; i < links; i++) {
        const t = i / links * Math.PI * 2;
        const cx = Math.max(-rx, Math.min(rx, Math.cos(t) * rx * 1.5)), cz = Math.max(-rz, Math.min(rz, Math.sin(t) * rz * 1.5));
        const link = s.mesh(new THREE.TorusGeometry(0.022, 0.006, 5, 10), iron, [cx, y + Math.sin(i * 1.3) * 0.006 - (cz > 0 ? 0.03 * Math.cos(cx * 5) : 0), cz]);
        link.rotation.set(i % 2 ? Math.PI / 2 : 0, Math.atan2(cx, cz), 0);
      }
      s.box([0.07, 0.06, 0.03], [0.05, y - 0.09, rz + 0.01], s.material('#c9a23a', { metalness: 0.7, roughness: 0.35 }));
      s.ring(0.025, 0.007, [0.05, y - 0.05, rz + 0.01], steel, Math.PI);
    }
    if (a.left === 'cup') {
      s.cylinder(0.04, 0.03, 0.1, [-0.15, 1.51, -0.2], s.material('#f1ede2'), 14);
      s.cylinder(0.042, 0.042, 0.012, [-0.15, 1.565, -0.2], s.material('#2a2c30'), 14);
      s.cylinder(0.041, 0.036, 0.04, [-0.15, 1.5, -0.2], s.material('#8a5a34'), 14);
    }
    if (mood.wear > 0.65) for (let i = 0; i < 3; i++) s.box([0.1 + random() * 0.14, 0.003, 0.002], [(random() - 0.5) * 0.24, 0.2 + random() * 0.4, 0.27], steel).rotation.z = (random() - 0.5) * 1.2;

    const flick = mix(0, 0.5, mood.energy), blink = a.topper === 'broken' ? 0 : 1;
    return s.finish({
      footprint: 0.55,
      update: (_dt, time) => {
        topperMaterial.emissiveIntensity = blink * bright * (1 - flick * (Math.sin(time * 37) * Math.sin(time * 5.3) > 0.72 ? 0.6 : 0));
        if (lit) screenMaterial.emissiveIntensity = bright * (0.94 + Math.sin(time * 3) * 0.06);
      },
    });
  },
});
