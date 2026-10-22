import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Profile = [number, number][];

const DRINKS = {
  mezcal: 'A squat clear bottle of village mezcal, corked, with a worm at the bottom.',
  tequila: 'A tall slim bottle of golden tequila.',
  beer: 'A brown beer bottle with a crown cap.',
  rum: 'A square-shouldered bottle of dark cane rum.',
  soda: 'A glass bottle of bright orange soda with a straw, for someone who never drank.',
} as const;
const SHAPE: Record<keyof typeof DRINKS, { profile: Profile; liquid: string; glass: string; opacity: number; label: [number, number]; name: string }> = {
  mezcal: { profile: [[0.036, 0], [0.043, 0.006], [0.043, 0.12], [0.036, 0.142], [0.016, 0.158], [0.013, 0.168], [0.013, 0.205], [0.016, 0.208], [0.016, 0.214]], liquid: '#e3e8c4', glass: '#9cc8b0', opacity: 0.5, label: [0.04, 0.1], name: 'MEZCAL' },
  tequila: { profile: [[0.03, 0], [0.034, 0.006], [0.034, 0.165], [0.026, 0.19], [0.013, 0.205], [0.012, 0.26], [0.015, 0.263], [0.015, 0.27]], liquid: '#dba63a', glass: '#d8c890', opacity: 0.46, label: [0.06, 0.14], name: 'TEQUILA' },
  beer: { profile: [[0.028, 0], [0.032, 0.005], [0.032, 0.12], [0.026, 0.15], [0.014, 0.19], [0.012, 0.225], [0.0145, 0.228], [0.0145, 0.234]], liquid: '#3a1e0a', glass: '#6a3c14', opacity: 0.72, label: [0.045, 0.1], name: 'CERVEZA' },
  rum: { profile: [[0.036, 0], [0.04, 0.005], [0.04, 0.15], [0.036, 0.162], [0.016, 0.172], [0.014, 0.18], [0.014, 0.235], [0.017, 0.238], [0.017, 0.246]], liquid: '#6a2c10', glass: '#b08a5c', opacity: 0.5, label: [0.05, 0.125], name: 'RON' },
  soda: { profile: [[0.026, 0], [0.03, 0.005], [0.031, 0.05], [0.026, 0.085], [0.031, 0.125], [0.026, 0.155], [0.014, 0.185], [0.013, 0.215], [0.015, 0.218], [0.015, 0.224]], liquid: '#f27a12', glass: '#bcdcd2', opacity: 0.42, label: [0.1, 0.14], name: 'NARANJA' },
};

export default defineThing({
  questions: {
    drink: choice('What is in the bottle?', DRINKS),
    level: score('How much is left in the bottle?', ['Only a finger at the bottom', 'A third', 'Half', 'Just opened, one cup poured']),
    cup: choice('What has happened to the cup that was poured?', {
      poured: 'Filled to the brim and left untouched.',
      sipped: 'Half gone, as though someone has been drinking from it.',
      spilled: 'Knocked over, a puddle spreading from it.',
      two: 'Two cups: one for the dead and one for whoever came to sit with them.',
      empty: 'Drained dry and turned upside down.',
    }),
    extra: choice('What favourite vice sits beside the bottle?', {
      cigarettes: 'A soft pack of cigarettes with one lit and left burning.',
      cards: 'A hand of playing cards fanned face up beside the deck.',
      harmonica: 'A worn chrome harmonica.',
      candy: 'A handful of wrapped sweets and a lollipop.',
      dice: 'A pair of dice and a few coins, a gambler\'s stake.',
      none: 'Nothing: only the drink.',
    }),
    label: choice('What is on the hand-made label?', {
      name: 'The name of the drink in careful capitals.',
      papa: 'PARA PAPÁ.',
      casa: 'DE LA CASA, home-made.',
      year: 'Only a year, long ago.',
      skull: 'A doodled skull and crossbones, a family joke.',
      none: 'No label at all, just the bare glass.',
    }),
    garnish: choice('What is set out to go with it?', {
      none: 'Nothing.',
      orange: 'Orange slices on a saucer with red chilli salt.',
      lime: 'Lime wedges and a little heap of salt.',
      peanuts: 'A dish of peanuts.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const d = SHAPE[a.drink];
    const total = d.profile[d.profile.length - 1][1];
    const liquidMat = s.material(d.liquid, { roughness: 0.15, emissive: d.liquid, emissiveIntensity: a.drink === 'soda' ? 0.3 : 0.12 });
    const bx = -0.035, bz = -0.03;

    // Bottle: opaque liquid inside see-through glass.
    const neckStart = d.profile.findIndex(([r]) => r < 0.02);
    const fillTop = d.profile[Math.max(1, neckStart - 1)][1];
    const yl = mix(0.022, fillTop, Math.min(1, a.level));
    const liquid: Profile = [[0, 0.004]];
    for (let i = 0; i < d.profile.length; i++) {
      const [r, y] = d.profile[i];
      if (y < yl) { liquid.push([r * 0.9, Math.max(0.004, y)]); continue; }
      const [pr, py] = d.profile[i - 1] ?? [r, 0];
      const t = (yl - py) / Math.max(1e-6, y - py);
      liquid.push([mix(pr, r, t) * 0.9, yl]);
      break;
    }
    liquid.push([0, yl]);
    s.lathe(liquid, liquidMat, [bx, 0, bz]);
    const glass = new THREE.MeshPhysicalMaterial({ color: d.glass, transparent: true, opacity: d.opacity, roughness: 0.06 });
    s.lathe([[0, 0], ...d.profile], glass, [bx, 0, bz]);
    if (a.drink === 'mezcal') s.tube([[bx - 0.015, 0.012, bz + 0.01], [bx - 0.004, 0.016, bz + 0.018], [bx + 0.008, 0.011, bz + 0.014], [bx + 0.016, 0.014, bz + 0.004]], 0.0035, s.material('#d98a4a'));
    const opened = a.level < 0.99 || a.cup !== 'empty';
    const corked = a.drink === 'mezcal' || a.drink === 'tequila' || a.drink === 'rum';
    const stopperMat = corked ? s.material('#b88a52', { roughness: 0.9 }) : s.material(a.drink === 'beer' ? '#c9a23a' : '#d8262e', { metalness: 0.5, roughness: 0.4 });
    if (a.drink === 'soda') {
      const straw = s.rod([bx, 0.03, bz], [bx + 0.03, total + 0.06, bz + 0.01], 0.003, s.material('#f4f4f0'));
      straw.castShadow = true;
      s.cylinder(0.0155, 0.0155, 0.006, [bx + 0.09, 0.003, bz - 0.03], stopperMat, 16);
    } else if (opened) {
      if (corked) { const cork = s.cylinder(0.011, 0.013, 0.026, [bx + 0.085, 0.012, bz - 0.035], stopperMat, 12); cork.rotation.z = Math.PI / 2; cork.rotation.y = random() * 3; }
      else s.cylinder(0.0155, 0.0155, 0.006, [bx + 0.085, 0.003, bz - 0.035], stopperMat, 16);
    } else s.cylinder(corked ? 0.013 : 0.0155, corked ? 0.012 : 0.0155, corked ? 0.02 : 0.007, [bx, total + (corked ? 0.006 : 0.002), bz], stopperMat, 14);

    // Label.
    if (a.label !== 'none') {
      const [y0, y1] = d.label, lh = y1 - y0;
      const rAt = d.profile.find(([, y]) => y >= (y0 + y1) / 2)?.[0] ?? 0.035;
      const r = Math.max(rAt, d.profile[1][0]) * 1.012, arc = 1.9, lw = r * arc;
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = Math.round(256 * lh / lw);
      const g = canvas.getContext('2d')!;
      const H = canvas.height;
      g.fillStyle = new THREE.Color('#f1e6c6').lerp(new THREE.Color('#b89a6a'), mood.wear * 0.5).getStyle(); g.fillRect(0, 0, 256, H);
      g.strokeStyle = '#7a2a1e'; g.lineWidth = 4; g.strokeRect(8, 8, 240, H - 16);
      g.fillStyle = '#2a2420'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const write = (text: string, y: number, size: number, style = 'italic bold') => { g.font = `${style} ${size}px Georgia, serif`; g.save(); g.translate(128, y); g.rotate((random() - 0.5) * 0.08); g.fillText(text, 0, 0, 220); g.restore(); };
      if (a.label === 'name') { write(d.name, H * 0.42, Math.min(58, 300 / d.name.length * 1.3)); write('hecho en casa', H * 0.76, 22, 'italic'); }
      else if (a.label === 'papa') { write('PARA', H * 0.32, 50); write('PAPÁ', H * 0.68, 60); }
      else if (a.label === 'casa') { write('DE LA', H * 0.32, 46); write('CASA', H * 0.68, 60); }
      else if (a.label === 'year') { write(String(1952 + Math.floor(random() * 40)), H * 0.5, 76); }
      else {
        g.beginPath(); g.ellipse(128, H * 0.42, 40, 36, 0, 0, 7); g.fill(); g.fillRect(106, H * 0.42 + 22, 44, 22);
        g.strokeStyle = '#2a2420'; g.lineWidth = 9; g.lineCap = 'round';
        for (const side of [-1, 1]) { g.beginPath(); g.moveTo(128 - side * 70, H * 0.42 + 50); g.lineTo(128 + side * 70, H * 0.42 - 34); g.stroke(); }
        g.fillStyle = '#f1e6c6'; for (const side of [-1, 1]) { g.beginPath(); g.arc(128 + side * 15, H * 0.42 - 4, 10, 0, 7); g.fill(); }
        g.fillStyle = '#2a2420'; write('XXX', H * 0.86, 30);
      }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const label = s.mesh(new THREE.CylinderGeometry(r, r, lh, 24, 1, true, -arc / 2, arc), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), [bx, (y0 + y1) / 2, bz]);
      label.rotation.y = 0.25 + (random() - 0.5) * 0.3; label.rotation.z = (random() - 0.5) * 0.05;
    }

    // Cups.
    const clayCup = a.drink === 'mezcal';
    const cupMat = clayCup ? s.material('#a8532f', { roughness: 0.75 }) : new THREE.MeshPhysicalMaterial({ color: '#bcd4ce', transparent: true, opacity: 0.48, roughness: 0.05 });
    const cupH = clayCup ? 0.03 : a.drink === 'beer' || a.drink === 'soda' ? 0.085 : 0.055, cupR = clayCup ? 0.03 : a.drink === 'beer' || a.drink === 'soda' ? 0.03 : 0.02;
    const cupProfile: Profile = clayCup ? [[0, 0], [0.014, 0], [0.026, 0.014], [cupR, cupH], [cupR - 0.004, cupH], [0.022, 0.014], [0, 0.007]] : [[0, 0], [cupR * 0.78, 0], [cupR, cupH], [cupR - 0.002, cupH], [cupR * 0.74, 0.006], [0, 0.006]];
    const cup = (x: number, z: number, fill: number, mode: 'up' | 'side' | 'down') => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry(cupProfile.map(([r, y]) => new THREE.Vector2(r, y)), 24), cupMat);
      body.castShadow = true; g.add(body);
      if (fill > 0 && mode === 'up') {
        const y = mix(0.008, cupH - 0.003, fill), rr = mix(cupR * 0.76, cupR - 0.003, y / cupH);
        const drink = new THREE.Mesh(clayCup ? new THREE.CylinderGeometry(rr, rr, 0.003, 20) : new THREE.CylinderGeometry(rr, cupR * 0.72, y - 0.006, 20), liquidMat);
        drink.position.y = clayCup ? y : (y + 0.006) / 2; g.add(drink);
      }
      g.position.set(x, 0, z);
      if (mode === 'side') { g.rotation.z = Math.PI / 2 - 0.12; g.position.y = cupR; g.rotation.y = 0.5; }
      if (mode === 'down') { g.rotation.z = Math.PI; g.position.y = cupH; }
      s.root.add(g);
    };
    const cx = 0.055, cz = 0.055;
    if (a.cup === 'poured') cup(cx, cz, 1, 'up');
    else if (a.cup === 'sipped') cup(cx, cz, 0.45, 'up');
    else if (a.cup === 'empty') cup(cx, cz, 0, 'down');
    else if (a.cup === 'two') { cup(cx, cz, 1, 'up'); cup(cx + cupR * 2 + 0.03, cz + 0.035, 0.3, 'up'); }
    else {
      cup(cx, cz, 0, 'side');
      const puddle = s.material(d.liquid, { roughness: 0.05, emissive: d.liquid, emissiveIntensity: 0.1 });
      for (let i = 0; i < 4; i++) s.ball([mix(0.03, 0.06, random()), 0.0018, mix(0.025, 0.045, random())], [cx + 0.03 + i * 0.022 + random() * 0.02, 0.001, cz + 0.03 + random() * 0.04], puddle, 16).castShadow = false;
    }

    // The personal extra.
    const ex = -0.1, ez = 0.085;
    let wisp: THREE.Mesh | null = null;
    if (a.extra === 'cigarettes') {
      const pack = s.box([0.056, 0.022, 0.086], [ex, 0.011, ez], s.material('#f1ece0', { roughness: 0.8 }));
      pack.rotation.y = 0.35;
      const band = s.box([0.0565, 0.0225, 0.03], [ex + Math.sin(0.35) * 0.02, 0.011, ez + Math.cos(0.35) * 0.02], s.material('#b8262e')); band.rotation.y = 0.35;
      const paper = s.material('#f8f6ee'), filter = s.material('#c98a4a');
      for (let i = 0; i < 2; i++) { const z0 = ez - 0.05 - i * 0.008, x0 = ex - 0.025 + i * 0.014; s.rod([x0, 0.014, z0 + 0.012], [x0 - 0.008, 0.016, z0 - 0.022], 0.0038, i ? filter : paper); }
      const tx = ex + 0.085, tz = ez + 0.025;
      s.lathe([[0, 0.003], [0.026, 0.003], [0.034, 0.014], [0.03, 0.014], [0.024, 0.007], [0, 0.007]], s.material('#7a8a8c', { roughness: 0.2, metalness: 0.3 }), [tx, 0, tz]);
      s.rod([tx - 0.03, 0.016, tz + 0.012], [tx + 0.012, 0.012, tz - 0.004], 0.0038, paper);
      s.rod([tx - 0.046, 0.0175, tz + 0.018], [tx - 0.03, 0.016, tz + 0.012], 0.0039, filter);
      s.rod([tx + 0.012, 0.012, tz - 0.004], [tx + 0.022, 0.011, tz - 0.008], 0.0038, new THREE.MeshStandardMaterial({ color: '#5a5654', emissive: '#ff5a14', emissiveIntensity: 1.2 }));
      const pts: V3[] = []; for (let i = 0; i < 8; i++) pts.push([tx + 0.022 + Math.sin(i * 1.1) * 0.006 * i * 0.4, 0.014 + i * 0.02, tz - 0.008 + Math.cos(i * 0.8) * 0.004 * i * 0.3]);
      wisp = s.tube(pts, 0.002, new THREE.MeshBasicMaterial({ color: '#8f96a2', transparent: true, opacity: 0.3, depthWrite: false })); wisp.castShadow = false;
    } else if (a.extra === 'cards') {
      const suits = ['♠', '♥', '♦', '♣'], ranks = ['A', 'K', 'Q', 'J', '10', '7', '2'];
      for (let i = 0; i < 5; i++) {
        const c = document.createElement('canvas'); c.width = 64; c.height = 90;
        const g = c.getContext('2d')!;
        const suit = suits[Math.floor(random() * 4)], rank = i === 0 ? 'A' : ranks[Math.floor(random() * ranks.length)];
        g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, 64, 90); g.strokeStyle = '#b8b0a0'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 88);
        g.fillStyle = suit === '♥' || suit === '♦' ? '#c8202a' : '#1a1a1e'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 20px Georgia, serif'; g.fillText(rank, 14, 16); g.font = '40px serif'; g.fillText(suit, 32, 52);
        const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
        const ang = (i - 2) * 0.3;
        const card = s.mesh(new THREE.PlaneGeometry(0.057, 0.08), new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }), [ex + Math.sin(ang) * 0.05, 0.002 + i * 0.0012, ez + 0.02 - Math.cos(ang) * 0.02 + 0.02]);
        card.rotation.set(-Math.PI / 2, 0, -ang, 'YXZ'); card.rotation.y = 0;
      }
      const deck = s.box([0.058, 0.014, 0.082], [ex - 0.005, 0.007, ez - 0.075], s.material('#f1ece0')); deck.rotation.y = -0.3;
      const back = s.box([0.054, 0.0145, 0.078], [ex - 0.005, 0.0075, ez - 0.075], s.material('#a8262e')); back.rotation.y = -0.3;
    } else if (a.extra === 'harmonica') {
      const g = new THREE.Group();
      const chrome = s.material('#cfd4d8', { metalness: 0.75, roughness: 0.25 }), comb = s.material('#6a3c1c');
      const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); };
      add(new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.012, 0.026), comb));
      for (const side of [-1, 1]) { const cover = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.007, 0.03), chrome); cover.position.y = side * 0.0095; add(cover); }
      for (let i = 0; i < 10; i++) { const hole = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.007, 0.002), s.material('#120c08')); hole.position.set(-0.045 + i * 0.01, 0, 0.0135); add(hole); }
      g.position.set(ex + 0.01, 0.013, ez); g.rotation.y = 0.3 + (random() - 0.5) * 0.4;
      s.root.add(g);
    } else if (a.extra === 'candy') {
      const hues = ['#e5257e', '#18b5b0', '#f6c21c', '#49b848', '#7a3fc0', '#f2702a', '#d8262e'];
      for (let i = 0; i < 7 + Math.floor(random() * 4); i++) {
        const mat = s.material(hues[i % hues.length], { roughness: 0.3, emissive: hues[i % hues.length], emissiveIntensity: 0.15 });
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat); body.scale.set(0.012, 0.009, 0.009);
        g.add(body);
        for (const side of [-1, 1]) { const twist = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.012, 8), mat); twist.rotation.z = side * Math.PI / 2; twist.position.x = side * 0.016; g.add(twist); }
        g.traverse((m) => { m.castShadow = true; });
        g.position.set(ex + (random() - 0.5) * 0.09, 0.009, ez + (random() - 0.5) * 0.08); g.rotation.y = random() * 6.28;
        s.root.add(g);
      }
      s.rod([ex + 0.05, 0.004, ez + 0.05], [ex - 0.02, 0.012, ez + 0.085], 0.002, s.material('#f8f6ee'));
      s.ball([0.016, 0.016, 0.007], [ex - 0.03, 0.014, ez + 0.09], s.material('#d8262e', { roughness: 0.2, emissive: '#d8262e', emissiveIntensity: 0.2 }), 14).rotation.x = Math.PI / 2 - 0.2;
    } else if (a.extra === 'dice') {
      const faces = [1, 2, 3, 4, 5, 6].map((n) => {
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
        g.fillStyle = '#f8f4e8'; g.fillRect(0, 0, 64, 64); g.fillStyle = n === 1 ? '#c8202a' : '#1a1a1e';
        const spots: [number, number][] = [[32, 32], [16, 16], [48, 48], [48, 16], [16, 48], [16, 32], [48, 32]];
        const on = { 1: [0], 2: [1, 2], 3: [0, 1, 2], 4: [1, 2, 3, 4], 5: [0, 1, 2, 3, 4], 6: [1, 2, 3, 4, 5, 6] }[n]!;
        for (const k of on) { g.beginPath(); g.arc(spots[k][0], spots[k][1], 6, 0, 7); g.fill(); }
        const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshStandardMaterial({ map, roughness: 0.35 });
      });
      for (let i = 0; i < 2; i++) {
        const order = [...faces].sort(() => random() - 0.5);
        const die = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), order); die.castShadow = true;
        die.position.set(ex + i * 0.04 + random() * 0.01, 0.009, ez + i * 0.025); die.rotation.y = random() * 3;
        s.root.add(die);
      }
      const brass = s.material('#c9a23a', { metalness: 0.7, roughness: 0.3 }), silver = s.material('#c4c8ca', { metalness: 0.7, roughness: 0.3 });
      for (let i = 0; i < 6; i++) s.cylinder(0.011, 0.011, 0.002, [ex - 0.035 + (i % 2) * 0.004, 0.001 + i * 0.002, ez - 0.05], i % 3 ? brass : silver, 14);
      for (let i = 0; i < 3; i++) s.cylinder(0.011, 0.011, 0.002, [ex + random() * 0.07, 0.001, ez + 0.05 + random() * 0.03], silver, 14);
    }

    // Garnish.
    const gx = 0.11, gz = -0.045;
    if (a.garnish !== 'none') {
      s.lathe([[0, 0.003], [0.034, 0.003], [0.05, 0.011], [0.052, 0.013], [0.048, 0.007], [0.028, 0], [0, 0]], s.material(a.garnish === 'peanuts' ? '#a8532f' : '#f1ece0', { roughness: 0.4 }), [gx, 0, gz]);
      if (a.garnish === 'orange' || a.garnish === 'lime') {
        const rind = s.material(a.garnish === 'orange' ? '#f28a12' : '#5a9a2a', { roughness: 0.6 }), flesh = s.material(a.garnish === 'orange' ? '#f8b040' : '#c4dc7a', { roughness: 0.4 });
        for (let i = 0; i < 4; i++) {
          const ang = i * 1.5 + random(), x = gx + Math.cos(ang) * 0.02, z = gz + Math.sin(ang) * 0.02;
          const wedge = s.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 14, 1, false, 0, Math.PI), rind, [x, 0.012 + i * 0.003, z]);
          wedge.rotation.y = ang; wedge.rotation.x = 0.2;
          const inner = s.mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.0066, 14, 1, false, 0, Math.PI), flesh, [x, 0.012 + i * 0.003, z]);
          inner.rotation.y = ang; inner.rotation.x = 0.2;
        }
        s.mesh(new THREE.ConeGeometry(0.014, 0.01, 12), s.material(a.garnish === 'orange' ? '#b83a1e' : '#f8f6f0', { roughness: 1 }), [gx + 0.03, 0.012, gz + 0.022]);
      } else {
        const nuts = []; for (let i = 0; i < 34; i++) { const ang = random() * 6.28, r = Math.sqrt(random()) * 0.03; nuts.push({ at: [gx + Math.cos(ang) * r, 0.009 + random() * 0.008, gz + Math.sin(ang) * r] as V3, size: mix(0.004, 0.006, random()), color: random() < 0.5 ? '#c99a5a' : '#a8683a' }); }
        s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.7 }), nuts);
      }
    }
    if (mood.density > 0.65) for (let i = 0; i < 4; i++) { const bloom = s.mesh(new THREE.IcosahedronGeometry(0.018, 1), s.material('#ee7a0c', { flatShading: true }), [bx - 0.07 - random() * 0.04, 0.013, bz - 0.03 + (random() - 0.5) * 0.08]); bloom.scale.y = 0.7; }

    const speed = mix(0.3, 1.8, mood.energy);
    return s.finish({ update: (_dt, time) => { if (wisp) wisp.rotation.y = Math.sin(time * speed) * 0.25; } });
  },
});
