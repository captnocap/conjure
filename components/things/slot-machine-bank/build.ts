import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const THEMES = {
  sevens: 'Lucky Sevens: fire-engine red and yellow, the classic.',
  pharaoh: 'Pharaoh\'s Gold: teal and sand gold, an Egyptian tomb theme.',
  ocean: 'Deep Blue: ocean blue and aqua, dolphins and pearls.',
  saloon: 'Wild West: saddle brown and orange, a saloon theme.',
  fruit: 'Fruit Fiesta: green and hot pink, loud and sugary.',
  dragon: 'Fortune Dragon: lacquer red and imperial gold, Macau style.',
} as const;
const THEME: Record<keyof typeof THEMES, readonly [string, string, string]> = {
  sevens: ['#c8102e', '#ffd23f', 'LUCKY 7s'], pharaoh: ['#1c6e6a', '#e8b84a', 'PHARAOH'], ocean: ['#1456b8', '#6fe3ff', 'DEEP BLUE'],
  saloon: ['#7a3b1d', '#f0a03c', 'WILD WEST'], fruit: ['#2f9e44', '#ff5fa2', 'FIESTA'], dragon: ['#8a0f1a', '#ffb300', 'FORTUNE'],
};
type Sym = 'seven' | 'cherry' | 'bar' | 'bell' | 'lemon' | 'plum';
const SYMS: readonly Sym[] = ['seven', 'cherry', 'bar', 'bell', 'lemon', 'plum'];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function symbol(c: CanvasRenderingContext2D, kind: Sym, x: number, y: number, r: number) {
  c.save();
  c.translate(x, y);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (kind === 'seven') {
    c.font = `bold ${r * 2.3}px serif`; c.fillStyle = '#d3122a'; c.strokeStyle = '#3a0508'; c.lineWidth = r * 0.12;
    c.fillText('7', 0, r * 0.08); c.strokeText('7', 0, r * 0.08);
  } else if (kind === 'cherry') {
    c.strokeStyle = '#2c7a2c'; c.lineWidth = r * 0.14;
    c.beginPath(); c.moveTo(-r * 0.4, r * 0.3); c.lineTo(r * 0.2, -r * 0.8); c.lineTo(r * 0.45, r * 0.35); c.stroke();
    c.fillStyle = '#d3122a';
    for (const dx of [-0.42, 0.45]) { c.beginPath(); c.arc(dx * r, r * 0.42, r * 0.42, 0, 7); c.fill(); }
  } else if (kind === 'bar') {
    c.fillStyle = '#16181c'; c.fillRect(-r * 0.95, -r * 0.42, r * 1.9, r * 0.84);
    c.font = `bold ${r * 0.8}px sans-serif`; c.fillStyle = '#f6f2e2'; c.fillText('BAR', 0, r * 0.04);
  } else if (kind === 'bell') {
    c.fillStyle = '#e8a90c';
    c.beginPath(); c.arc(0, -r * 0.05, r * 0.6, Math.PI, 0); c.lineTo(r * 0.85, r * 0.55); c.lineTo(-r * 0.85, r * 0.55); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, r * 0.7, r * 0.18, 0, 7); c.fill();
  } else if (kind === 'lemon') {
    c.fillStyle = '#f2d21b'; c.beginPath(); c.ellipse(0, 0, r * 0.85, r * 0.6, -0.3, 0, 7); c.fill();
  } else {
    c.fillStyle = '#6a2d9c'; c.beginPath(); c.arc(0, 0, r * 0.68, 0, 7); c.fill();
  }
  c.restore();
}

/** Three mechanical reels behind glass with a payline. `line` is the result; null paints a spin blur. */
function reels(line: readonly Sym[] | null, random: () => number, lit: boolean) {
  return paint(256, 128, (c) => {
    c.fillStyle = '#17181c'; c.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 3; i++) {
      const x = 8 + i * 82;
      const grad = c.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#8d8a80'); grad.addColorStop(0.5, lit ? '#fffdf2' : '#5d5c58'); grad.addColorStop(1, '#8d8a80');
      c.fillStyle = grad; c.fillRect(x, 6, 76, 116);
      if (!lit) continue;
      if (line) {
        symbol(c, line[i], x + 38, 64, 30);
        symbol(c, SYMS[Math.floor(random() * 6)], x + 38, -2, 26);
        symbol(c, SYMS[Math.floor(random() * 6)], x + 38, 130, 26);
      } else {
        for (let k = 0; k < 9; k++) {
          c.fillStyle = ['#d3122a88', '#e8a90c88', '#16181c66', '#6a2d9c77'][Math.floor(random() * 4)];
          c.fillRect(x + 12 + random() * 20, random() * 128, 30 + random() * 20, 18 + random() * 40);
        }
      }
    }
    if (lit) { c.fillStyle = '#e0182d'; c.fillRect(0, 62, 256, 3); }
  });
}

/** A five-by-three video slot grid, optionally with a banner across it. */
function video(theme: readonly [string, string, string], random: () => number, banner: string | null, win: boolean) {
  return paint(256, 320, (c) => {
    const grad = c.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, theme[0]); grad.addColorStop(1, '#0a0d24');
    c.fillStyle = grad; c.fillRect(0, 0, 256, 320);
    c.fillStyle = theme[1]; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(theme[2], 128, 30, 230);
    for (let col = 0; col < 5; col++) for (let row = 0; row < 3; row++) {
      const x = 10 + col * 48, y = 62 + row * 62;
      c.fillStyle = '#f4f1e4'; c.fillRect(x, y, 44, 58);
      symbol(c, win && row === 1 ? 'seven' : SYMS[Math.floor(random() * 6)], x + 22, y + 29, 17);
    }
    if (win) { c.strokeStyle = '#ffe14a'; c.lineWidth = 6; c.strokeRect(8, 122, 240, 62); }
    c.fillStyle = '#05060f'; c.fillRect(0, 254, 256, 66);
    c.fillStyle = theme[1]; c.font = 'bold 22px monospace';
    c.fillText(win ? 'WIN 250,000' : `CREDIT ${Math.floor(random() * 90)}`, 128, 287, 230);
    if (banner) {
      c.fillStyle = '#000000cc'; c.fillRect(0, 110, 256, 86);
      c.fillStyle = '#ffe14a'; c.font = 'bold 40px sans-serif'; c.fillText(banner, 128, 154, 236);
    }
  });
}

function sign(text: string, ink: string, paper: string, w = 256, h = 96) {
  return paint(w, h, (c) => {
    c.fillStyle = paper; c.fillRect(0, 0, w, h);
    c.strokeStyle = ink; c.lineWidth = 5; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${Math.min(h * 0.6, (w / text.length) * 1.5)}px sans-serif`;
    c.fillText(text, w / 2, h / 2 + 2, w - 24);
  });
}

export default defineThing({
  questions: {
    era: choice('What era are the machines from?', {
      mechanical: 'Cast-metal one-armed bandits on wooden pedestals, domed chrome tops and long levers, 1940s.',
      eighties: 'Boxy 1980s three-reel cabinets with lit belly glass, a coin tray and a pull lever.',
      video: 'Tall wall-of-screen video slots, glowing portrait displays and button decks, no levers.',
    }),
    count: choice('How many machines stand on each side of the bank?', {
      two: 'Two a side, a small forgotten island.',
      three: 'Three a side, the usual bank.',
      four: 'Four a side, a long glowing rank.',
    }),
    hero: choice('What is the middle machine facing us showing?', {
      jackpot: 'Three sevens on the line, topper flashing, coins pouring into the tray.',
      miss: 'Two cherries and a miss, the third reel stopped one notch short.',
      spinning: 'Mid-spin, reels a blur, the outcome not yet known.',
      handpay: 'Locked up on CALL ATTENDANT, candle lit, waiting for someone to come.',
      dark: 'Dark and out of service with a note taped over the glass.',
    }),
    theme: choice('What is the bank themed as?', THEMES),
    cup: choice('Has a coin cup been left behind?', {
      none: 'No cup, nothing left.',
      empty: 'An empty plastic cup abandoned on a machine.',
      full: 'A cup brimming with coins, left unattended on a stool.',
      spilled: 'A cup knocked over on the floor, coins rolled everywhere.',
    }),
    stools: choice('How have the stools been left?', {
      tucked: 'Every stool squared up neatly in front of its machine.',
      turned: 'One stool swivelled away and pushed back, someone just got up.',
      toppled: 'A stool lying on its side.',
      bare: 'No stools at all; players stand.',
    }),
    meter: choice('Is there a progressive jackpot meter above the bank?', {
      none: 'No overhead sign.',
      modest: 'A small red LED meter showing a few thousand.',
      million: 'A big glowing meter ticking past a million.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const theme = THEME[a.theme];
    const per = { two: 2, three: 3, four: 4 }[a.count];
    const D = { mechanical: { w: 0.5, d: 0.44, pitch: 0.64 }, eighties: { w: 0.56, d: 0.5, pitch: 0.6 }, video: { w: 0.64, d: 0.5, pitch: 0.68 } }[a.era];
    const z0 = D.d / 2 + 0.02;
    const glow = mix(0.45, 1.15, mood.cheer);

    const body = s.material(a.era === 'mechanical' ? '#b9bcc0' : a.era === 'eighties' ? '#2b2d33' : '#15161c', { metalness: a.era === 'mechanical' ? 0.85 : 0.3, roughness: a.era === 'mechanical' ? 0.3 : 0.5 });
    const accent = s.material(theme[0], { roughness: 0.4 });
    const chrome = s.material('#e3e6e8', { metalness: 0.95, roughness: 0.18 });
    const dark = s.material('#121316', { roughness: 0.7 });
    const wood = s.material('#5a3a22', { roughness: 0.7 });
    const gold = s.material('#e6b43a', { metalness: 0.9, roughness: 0.3 });
    const seat = s.material(mood.wear > 0.6 ? '#4a3030' : theme[0], { roughness: 0.8 });
    const lit = (map: THREE.Texture, power = 1) => new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow * power, roughness: 0.4 });
    const unlit = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
    const plane = (g: THREE.Group, w: number, h: number, at: [number, number, number], material: THREE.Material, tilt = 0) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), material, at);
      mesh.rotation.x = tilt; mesh.castShadow = false;
      g.add(mesh);
      return mesh;
    };
    const flashers: { material: THREE.MeshStandardMaterial; rate: number; phase: number; base: number }[] = [];
    let spinTexture: THREE.Texture | null = null;
    const bulbs: [number, number, number][][] = [[], [], []];
    const topperTexture = sign(theme[2], theme[1], theme[0]);
    const bellyTexture = paint(128, 128, (c) => {
      c.fillStyle = theme[0]; c.fillRect(0, 0, 128, 128);
      c.fillStyle = theme[1]; c.beginPath(); c.arc(64, 64, 44, 0, 7); c.fill();
      symbol(c, a.theme === 'fruit' ? 'cherry' : a.theme === 'saloon' ? 'bell' : 'seven', 64, 64, 30);
    });
    const coins: { at: [number, number, number]; size: number }[] = [];

    for (let side = 0; side < 2; side++) for (let i = 0; i < per; i++) {
      const front = side === 0;
      const isHero = front && i === Math.floor((per - 1) / 2);
      const x = (i - (per - 1) / 2) * D.pitch;
      const g = new THREE.Group();
      g.position.set(x, 0.06, front ? z0 : -z0);
      g.rotation.y = front ? 0 : Math.PI;
      s.root.add(g);
      const world = (lx: number, ly: number, lz: number): [number, number, number] => [x + (front ? lx : -lx), ly + 0.06, front ? z0 + lz : -z0 - lz];
      const add = <T extends THREE.Object3D>(mesh: T) => { g.add(mesh); return mesh; };
      const state = isHero ? a.hero : random() < mood.wear * 0.35 ? 'dark' : 'idle';
      const on = state !== 'dark';
      const fz = D.d / 2;
      const win = state === 'jackpot';
      const line: Sym[] | null = state === 'spinning' ? null
        : win ? ['seven', 'seven', 'seven']
        : state === 'miss' ? ['cherry', 'cherry', 'lemon']
        : state === 'handpay' ? ['bar', 'bar', 'bar']
        : [SYMS[Math.floor(random() * 6)], SYMS[Math.floor(random() * 6)], SYMS[Math.floor(random() * 6)]];
      let top = 0;
      let deckY = 0.9;

      if (a.era === 'mechanical') {
        add(s.box([D.w + 0.04, 0.72, D.d], [0, 0.36, 0], wood));
        add(s.box([D.w + 0.1, 0.04, D.d + 0.06], [0, 0.74, 0], dark));
        add(s.box([D.w, 0.42, D.d - 0.04], [0, 0.97, 0], body));
        const dome = add(s.cylinder(D.w / 2, D.w / 2, D.d - 0.04, [0, 1.18, 0], body, 28));
        dome.rotation.x = Math.PI / 2;
        add(s.box([D.w - 0.08, 0.3, 0.02], [0, 1.0, fz - 0.015], accent));
        const reelTexture = reels(line, random, on);
        plane(g, D.w - 0.14, 0.17, [0, 1.2, fz - 0.012], on ? lit(reelTexture, 0.6) : unlit(reelTexture));
        add(s.box([D.w - 0.1, 0.02, 0.03], [0, 1.3, fz - 0.01], chrome));
        add(s.box([D.w - 0.1, 0.02, 0.03], [0, 1.1, fz - 0.01], chrome));
        add(s.box([0.03, 0.07, 0.02], [0.12, 1.36, fz - 0.03], dark));
        add(s.box([D.w - 0.16, 0.08, 0.12], [0, 0.82, fz + 0.03], chrome));
        plane(g, 0.2, 0.1, [0, 0.98, fz - 0.003], unlit(topperTexture));
        deckY = 0.78; top = 1.18 + D.w / 2;
        if (isHero) spinTexture = line ? null : reelTexture;
      } else if (a.era === 'eighties') {
        add(s.box([D.w, 0.82, D.d], [0, 0.41, 0], body));
        plane(g, D.w - 0.1, 0.42, [0, 0.36, fz + 0.002], on ? lit(bellyTexture, 0.55) : unlit(bellyTexture));
        add(s.box([D.w - 0.12, 0.06, 0.14], [0, 0.66, fz + 0.06], chrome));
        const deck = add(s.box([D.w, 0.1, D.d + 0.16], [0, 0.87, 0.08], accent));
        deck.rotation.x = 0.06;
        for (let b = 0; b < 4; b++) add(s.cylinder(0.022, 0.022, 0.02, [-0.16 + b * 0.105, 0.935, fz + 0.09], s.material(['#f2f2ee', '#e6b43a', '#f2f2ee', '#d3122a'][b], { emissive: on ? '#554422' : '#000000' }), 10));
        add(s.box([D.w, 0.72, D.d - 0.08], [0, 1.28, -0.04], body));
        add(s.box([D.w - 0.06, 0.3, 0.03], [0, 1.16, fz - 0.07], chrome));
        const reelTexture = reels(line, random, on);
        plane(g, D.w - 0.12, 0.24, [0, 1.16, fz - 0.052], on ? lit(reelTexture, 0.7) : unlit(reelTexture));
        plane(g, D.w - 0.08, 0.24, [0, 1.47, fz - 0.078], on ? lit(topperTexture, 0.6) : unlit(topperTexture));
        deckY = 0.94; top = 1.64;
        if (isHero) spinTexture = line ? null : reelTexture;
      } else {
        add(s.box([D.w, 0.78, D.d], [0, 0.39, 0], body));
        add(s.box([D.w - 0.1, 0.5, 0.02], [0, 0.4, fz], accent));
        const deck = add(s.box([D.w + 0.02, 0.09, D.d + 0.2], [0, 0.82, 0.1], dark));
        deck.rotation.x = 0.1;
        for (let b = 0; b < 5; b++) add(s.cylinder(0.026, 0.026, 0.02, [-0.2 + b * 0.1, 0.875, fz + 0.12], s.material(theme[1], { emissive: on ? theme[1] : '#000000', emissiveIntensity: 0.5 * glow }), 10));
        const tower = add(s.box([D.w, 1.16, 0.16], [0, 1.44, -0.1], body));
        tower.rotation.x = -0.07;
        const screenTexture = on ? video(theme, random, win ? 'BIG WIN' : state === 'handpay' ? 'CALL ATTENDANT' : state === 'miss' ? 'SO CLOSE' : null, win) : paint(8, 8, (c) => { c.fillStyle = '#08090c'; c.fillRect(0, 0, 8, 8); });
        const screen = plane(g, D.w - 0.07, 1.06, [0, 1.44, -0.012], on ? lit(screenTexture, 0.8) : unlit(screenTexture), -0.07);
        if (isHero && state === 'spinning') { const m = screen.material as THREE.MeshStandardMaterial; flashers.push({ material: m, rate: 9, phase: 0, base: m.emissiveIntensity }); }
        deckY = 0.9; top = 2.0;
      }

      // Topper: a lit marquee with a candle light and a ring of chaser bulbs.
      const topperOn = on;
      const tw = D.w - 0.06, th = a.era === 'mechanical' ? 0.16 : 0.24;
      add(s.box([0.05, 0.08, 0.05], [0, top + 0.03, -0.05], dark));
      add(s.box([tw + 0.05, th + 0.05, 0.08], [0, top + 0.06 + th / 2, -0.05], a.era === 'mechanical' ? gold : accent));
      const marquee = plane(g, tw, th, [0, top + 0.06 + th / 2, -0.008], topperOn ? lit(topperTexture, 0.9) : unlit(topperTexture));
      if (win || state === 'handpay') { const m = marquee.material as THREE.MeshStandardMaterial; flashers.push({ material: m, rate: win ? 7 : 2.5, phase: 0, base: m.emissiveIntensity * 1.5 }); }
      const candle = s.material(state === 'handpay' || win ? '#ffffff' : '#c7c2b0', { emissive: state === 'handpay' ? '#ffe9a0' : win ? '#ff3b3b' : '#000000', emissiveIntensity: 1.6, roughness: 0.3 });
      add(s.cylinder(0.03, 0.03, 0.09, [0, top + 0.16 + th, -0.05], candle, 12));
      if (state === 'handpay' || win) flashers.push({ material: candle, rate: 4, phase: 1, base: 1.8 });
      if (topperOn) {
        const nx = 7;
        for (let b = 0; b < nx; b++) for (const yy of [top + 0.045, top + 0.075 + th]) bulbs[(b + (yy > top + 0.06 ? 1 : 0)) % 3].push(world(-tw / 2 + (b * tw) / (nx - 1), yy, 0));
      }

      // Lever on the right flank, for machines old enough to have one.
      if (a.era !== 'video') {
        const pulled = isHero && state === 'spinning';
        const ly = a.era === 'mechanical' ? 0.95 : 1.0, lx = D.w / 2 + 0.05;
        add(s.cylinder(0.045, 0.045, 0.05, [D.w / 2 + 0.02, ly, 0.02], chrome, 14)).rotation.z = Math.PI / 2;
        const tip: [number, number, number] = pulled ? [lx, ly + 0.12, 0.34] : [lx, ly + 0.42, 0.1];
        add(s.rod([lx, ly, 0.02], tip, 0.013, chrome));
        add(s.ball([0.04, 0.04, 0.04], tip, s.material(a.era === 'mechanical' ? '#16181c' : '#d3122a', { roughness: 0.3 }), 12));
      }

      // Out-of-service note.
      if (state === 'dark') {
        const note = plane(g, 0.26, 0.16, a.era === 'video' ? [0.02, 1.5, 0.0] : [0.02, a.era === 'mechanical' ? 1.2 : 1.17, fz - (a.era === 'mechanical' ? 0.005 : 0.045)], unlit(sign(isHero ? 'OUT OF SERVICE' : 'SORRY', '#22252b', '#f3eeda', 256, 150)), a.era === 'video' ? -0.07 : 0);
        note.rotation.z = (random() - 0.5) * 0.3;
      }

      // Coins: a jackpot spill, or a few strays where the room is busy.
      const trayY = a.era === 'mechanical' ? 0.87 : a.era === 'eighties' ? 0.695 : deckY + 0.05;
      const pile = win ? 70 : random() < mood.density * 0.5 ? 4 : 0;
      for (let c = 0; c < pile; c++) {
        const fall = win && c > 40;
        coins.push({ at: fall ? world((random() - 0.5) * 0.7, -0.05 + random() * 0.004, fz + 0.2 + random() * 0.5) : world((random() - 0.5) * (D.w - 0.24), trayY + random() * (win ? 0.05 : 0.005), fz + 0.03 + random() * 0.07), size: 1 });
      }

      // Stool.
      if (a.stools !== 'bare') {
        const odd = isHero && a.stools !== 'tucked';
        const stool = new THREE.Group();
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.09, 20), seat);
        pad.position.y = 0.62;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 10), chrome);
        post.position.y = 0.3;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.035, 20), chrome);
        foot.position.y = 0.018;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), seat);
        back.position.set(0, 0.84, 0.17);
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), chrome);
        spine.position.set(0, 0.7, 0.19);
        stool.add(pad, post, foot, back, spine);
        stool.traverse((n) => { n.castShadow = true; });
        stool.position.set(...world((random() - 0.5) * 0.05, -0.06, fz + 0.48 + random() * 0.05));
        stool.rotation.y = (front ? 0 : Math.PI) + (random() - 0.5) * 0.3;
        if (odd && a.stools === 'turned') { stool.position.z += 0.32; stool.position.x += 0.14; stool.rotation.y += 1.1; }
        if (odd && a.stools === 'toppled') { stool.rotation.z = Math.PI / 2; stool.rotation.y = 0.5; stool.position.set(x + 0.35, 0.21, z0 + fz + 0.75); }
        s.root.add(stool);
        if (isHero && a.cup === 'full' && a.stools !== 'toppled') cupAt(stool.position.x, 0.665, stool.position.z, true, false);
      }
      if (isHero && a.cup === 'full' && (a.stools === 'bare' || a.stools === 'toppled')) cupAt(x + 0.1, deckY + 0.06, z0 + fz + 0.08, true, false);
      if (isHero && a.cup === 'empty') cupAt(x - 0.14, deckY + 0.06 + (a.era === 'eighties' ? 0.02 : 0.03), z0 + fz + (a.era === 'mechanical' ? -0.02 : 0.1), false, false);
      if (isHero && a.cup === 'spilled') cupAt(x - 0.5, 0.045, z0 + fz + 0.85, true, true);
    }

    function cupAt(x: number, y: number, z: number, full: boolean, tipped: boolean) {
      const cupMaterial = s.material(theme[1], { roughness: 0.5, side: THREE.DoubleSide });
      const cup = s.mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.12, 16, 1, true), cupMaterial, [x, y + 0.06, z]);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), cupMaterial);
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.058;
      cup.add(floor);
      if (tipped) {
        cup.rotation.z = Math.PI / 2 - 0.12; cup.rotation.y = 0.6;
        for (let c = 0; c < 45; c++) { const r = 0.08 + random() * 0.55, t = -0.9 + random() * 1.6; coins.push({ at: [x - Math.cos(t) * r, 0.002 + random() * 0.003, z + Math.sin(t) * r * 0.8], size: 1 }); }
      } else if (full) {
        const heap = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold);
        heap.scale.y = 0.5; heap.position.y = 0.05;
        cup.add(heap);
      }
    }

    // Shared plinth, end caps and the back-to-back spine.
    const length = per * D.pitch;
    s.box([length + 0.06, 0.06, z0 * 2 + D.d + 0.06], [0, 0.03, 0], dark);
    for (const sx of [-1, 1]) s.box([0.03, a.era === 'mechanical' ? 0.76 : 0.86, z0 * 2 + D.d - 0.04], [sx * (length / 2 + 0.005), (a.era === 'mechanical' ? 0.76 : 0.86) / 2 + 0.06, 0], accent);

    if (a.meter !== 'none') {
      const big = a.meter === 'million';
      const h = a.era === 'video' ? 2.62 : a.era === 'eighties' ? 2.26 : 1.92;
      const mw = Math.min(length - 0.1, big ? 1.9 : 1.0), mh = big ? 0.3 : 0.2;
      for (const sx of [-1, 1]) s.rod([sx * mw * 0.4, 0.5, 0], [sx * mw * 0.4, h, 0], 0.022, chrome);
      s.box([mw, mh + 0.06, 0.12], [0, h + mh / 2, 0], dark);
      const amount = big ? `$1,${String(100000 + Math.floor(random() * 899999)).replace(/(\d{3})(\d{3})/, '$1,$2')}` : `$${2 + Math.floor(random() * 7)},${String(100 + Math.floor(random() * 899))}`;
      const meterTexture = paint(512, 96, (c) => {
        c.fillStyle = '#120406'; c.fillRect(0, 0, 512, 96);
        c.fillStyle = big ? '#ffcf33' : '#ff3524'; c.font = 'bold 70px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(amount, 256, 52, 490);
      });
      for (const dir of [1, -1]) {
        const face = s.mesh(new THREE.PlaneGeometry(mw - 0.05, mh), lit(meterTexture, 1.1), [0, h + mh / 2, dir * 0.062]);
        face.rotation.y = dir === 1 ? 0 : Math.PI; face.castShadow = false;
      }
    }

    const bulbMaterials = bulbs.map((points, index) => {
      const material = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: index === 1 ? theme[1] : '#ffd98a', emissiveIntensity: glow, roughness: 0.3 });
      if (points.length) s.scatter(new THREE.SphereGeometry(0.014, 8, 6), material, points.map((at) => ({ at, size: 1 }))).castShadow = false;
      return material;
    });
    if (coins.length) s.scatter(new THREE.CylinderGeometry(0.017, 0.017, 0.004, 10), gold, coins);

    const speed = mix(0.4, 3.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        bulbMaterials.forEach((material, index) => { material.emissiveIntensity = glow * (0.25 + 1.5 * Math.max(0, Math.sin(time * speed * 2 + index * 2.1))); });
        for (const f of flashers) f.material.emissiveIntensity = f.base * (0.45 + 0.75 * Math.max(0, Math.sin(time * speed * f.rate * 0.5 + f.phase)));
        if (spinTexture) { spinTexture.offset.y = (time * speed * 2) % 1; }
      },
    });
  },
});
