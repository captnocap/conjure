import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
const CX = 96;
const disc = (g: G, x: number, y: number, r: number, fill: string) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
const poly = (g: G, points: number[], fill: string) => { g.fillStyle = fill; g.beginPath(); for (let i = 0; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]); g.closePath(); g.fill(); };
const rays = (g: G, x: number, y: number, r1: number, r2: number, colour: string, n = 16) => { g.strokeStyle = colour; g.lineWidth = 2.5; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(t) * r1, y + Math.sin(t) * r1); g.lineTo(x + Math.cos(t) * r2, y + Math.sin(t) * r2); g.stroke(); } };
const word = (g: G, text: string, y: number, size: number, colour: string) => { g.fillStyle = colour; g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, CX, y, 74); };
const robed = (g: G, robe: string, mantle: string, skin = '#d9a074') => {
  disc(g, CX, 34, 17, '#f2c53a');
  poly(g, [CX - 12, 46, CX + 12, 46, CX + 26, 116, CX - 26, 116], robe);
  poly(g, [CX - 12, 46, CX - 3, 46, CX - 16, 116, CX - 26, 116], mantle);
  poly(g, [CX + 12, 46, CX + 3, 46, CX + 16, 116, CX + 26, 116], mantle);
  disc(g, CX, 36, 9.5, skin);
};
const heart = (g: G, y: number, size: number, colour: string) => { disc(g, CX - size * 0.5, y, size * 0.56, colour); disc(g, CX + size * 0.5, y, size * 0.56, colour); poly(g, [CX - size * 1.02, y + size * 0.22, CX + size * 1.02, y + size * 0.22, CX, y + size * 1.45], colour); };
const cat = (g: G, y: number, colour: string) => { disc(g, CX, y, 20, colour); poly(g, [CX - 20, y - 6, CX - 16, y - 30, CX - 2, y - 14], colour); poly(g, [CX + 20, y - 6, CX + 16, y - 30, CX + 2, y - 14], colour); disc(g, CX - 8, y - 2, 4, '#e8e23a'); disc(g, CX + 8, y - 2, 4, '#e8e23a'); disc(g, CX, y + 6, 2.5, '#e88a9a'); };

interface Label { ground: string; wax: string; draw(g: G): void }
const SAINTS: Label[] = [
  { ground: '#1f6f5c', wax: '#f3efe2', draw: (g) => { g.fillStyle = '#f2c53a'; g.beginPath(); g.ellipse(CX, 76, 34, 50, 0, 0, 7); g.fill(); rays(g, CX, 76, 36, 46, '#f2c53a', 22); robed(g, '#d9788a', '#1f7f8a'); } },
  { ground: '#f3ead0', wax: '#c8242c', draw: (g) => { rays(g, CX, 70, 30, 46, '#e8a81c', 18); heart(g, 62, 21, '#c4162a'); poly(g, [CX - 3, 22, CX + 3, 22, CX + 3, 42, CX - 3, 42], '#8a5a1c'); poly(g, [CX - 9, 28, CX + 9, 28, CX + 9, 33, CX - 9, 33], '#8a5a1c'); poly(g, [CX - 8, 46, CX, 34, CX + 8, 46], '#f28a1c'); } },
  { ground: '#f3ead0', wax: '#2f8f4a', draw: (g) => { robed(g, '#f1eee4', '#2f7f3c'); poly(g, [CX - 5, 14, CX, 2, CX + 5, 14], '#f2742a'); g.strokeStyle = '#6a4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(CX + 30, 40); g.lineTo(CX + 30, 118); g.stroke(); } },
  { ground: '#2a4fa8', wax: '#f3efe2', draw: (g) => { poly(g, [CX - 12, 54, CX - 44, 36, CX - 38, 86, CX - 14, 78], '#f3f1ea'); poly(g, [CX + 12, 54, CX + 44, 36, CX + 38, 86, CX + 14, 78], '#f3f1ea'); robed(g, '#c4262a', '#e8c23a'); g.strokeStyle = '#dfe4e6'; g.lineWidth = 4; g.beginPath(); g.moveTo(CX + 20, 60); g.lineTo(CX + 34, 112); g.stroke(); } },
  { ground: '#6a2d6a', wax: '#f3efe2', draw: (g) => { rays(g, CX, 34, 18, 28, '#f2c53a', 14); robed(g, '#8a5a34', '#5a3a1c'); g.strokeStyle = '#f2c53a'; g.lineWidth = 3; g.beginPath(); g.moveTo(CX - 30, 48); g.lineTo(CX - 30, 118); g.moveTo(CX - 38, 60); g.lineTo(CX - 22, 60); g.stroke(); } },
];
const FOLK: Label[] = [
  { ground: '#15141a', wax: '#15141a', draw: (g) => { robed(g, '#eeeae0', '#3a3a44', '#f3f1ea'); disc(g, CX - 4, 35, 2.6, '#15141a'); disc(g, CX + 4, 35, 2.6, '#15141a'); g.strokeStyle = '#c9cfd2'; g.lineWidth = 3; g.beginPath(); g.moveTo(CX + 31, 26); g.lineTo(CX + 31, 118); g.stroke(); g.beginPath(); g.arc(CX + 14, 30, 18, -1.5, 0.1); g.stroke(); } },
  { ground: '#e8c23a', wax: '#f3efe2', draw: (g) => { poly(g, [CX - 18, 56, CX + 18, 56, CX + 22, 116, CX - 22, 116], '#1b1b20'); disc(g, CX, 42, 11, '#c98f64'); poly(g, [CX - 22, 34, CX + 22, 34, CX + 12, 26, CX - 12, 26], '#1b1b20'); poly(g, [CX - 9, 46, CX + 9, 46, CX + 6, 50, CX - 6, 50], '#1b1b20'); poly(g, [CX - 3, 56, CX + 3, 56, CX, 84], '#c4262a'); } },
  { ground: '#1f7a3c', wax: '#2f8f4a', draw: (g) => { disc(g, CX, 62, 30, '#f2c53a'); word(g, '$', 64, 50, '#1f7a3c'); word(g, 'MONEY', 108, 15, '#f2c53a'); } },
  { ground: '#f3ead0', wax: '#e83a8a', draw: (g) => { ['#c4262a', '#f2742a', '#f2c53a', '#2f8f4a', '#2a6fc8', '#6a2d9a', '#e83a8a'].forEach((colour, i) => poly(g, [CX - 35 + i * 10, 20, CX - 25 + i * 10, 20, CX - 25 + i * 10, 96, CX - 35 + i * 10, 96], colour)); word(g, '7 POWERS', 110, 13, '#1b1b20'); } },
  { ground: '#c4262a', wax: '#c4262a', draw: (g) => { cat(g, 64, '#15141a'); word(g, 'LUCK', 106, 20, '#f2c53a'); } },
];
const POP: Label[] = [
  { ground: '#f08ab8', wax: '#f3efe2', draw: (g) => { rays(g, CX, 36, 16, 30, '#fff3a0', 12); poly(g, [CX - 14, 52, CX + 14, 52, CX + 22, 116, CX - 22, 116], '#2a1c3a'); disc(g, CX, 38, 11, '#2a1c3a'); g.strokeStyle = '#2a1c3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(CX + 12, 60); g.lineTo(CX + 28, 40); g.stroke(); disc(g, CX + 29, 38, 5, '#dfe4e6'); } },
  { ground: '#59b8e0', wax: '#f3efe2', draw: (g) => { g.strokeStyle = '#f2c53a'; g.lineWidth = 4; g.beginPath(); g.ellipse(CX, 28, 18, 5, 0, 0, 7); g.stroke(); cat(g, 68, '#e08a34'); word(g, 'ST. BODEGA', 110, 12, '#15141a'); } },
  { ground: '#f3ead0', wax: '#f2742a', draw: (g) => { g.strokeStyle = '#f2c53a'; g.lineWidth = 4; g.beginPath(); g.ellipse(CX, 24, 20, 5, 0, 0, 7); g.stroke(); poly(g, [CX - 28, 40, CX + 28, 40, CX, 104], '#e8b84a'); poly(g, [CX - 23, 46, CX + 23, 46, CX, 96], '#d9442a'); disc(g, CX - 6, 56, 4.5, '#8a1f1c'); disc(g, CX + 8, 62, 4.5, '#8a1f1c'); disc(g, CX, 76, 4, '#8a1f1c'); } },
  { ground: '#9a7ad0', wax: '#f3efe2', draw: (g) => { rays(g, CX, 60, 30, 44, '#fff3a0', 16); g.fillStyle = '#8d9095'; g.beginPath(); g.ellipse(CX - 2, 72, 22, 15, -0.3, 0, 7); g.fill(); disc(g, CX + 14, 50, 10, '#8d9095'); poly(g, [CX + 22, 48, CX + 34, 52, CX + 22, 55], '#e8a81c'); disc(g, CX + 16, 48, 2.2, '#e8442a'); poly(g, [CX - 20, 74, CX - 40, 84, CX - 18, 84], '#5d6066'); } },
  { ground: '#15141a', wax: '#f3efe2', draw: (g) => { rays(g, CX, 58, 26, 40, '#e83a8a', 14); disc(g, CX, 58, 22, '#f2c53a'); disc(g, CX - 8, 52, 3.5, '#15141a'); disc(g, CX + 8, 52, 3.5, '#15141a'); g.strokeStyle = '#15141a'; g.lineWidth = 3; g.beginPath(); g.arc(CX, 60, 11, 0.3, 2.84); g.stroke(); word(g, 'GOOD VIBES', 108, 12, '#f2c53a'); } },
];
const PLAIN = ['#c8242c', '#2f8f4a', '#f3efe2', '#2a5fc8', '#f2c53a', '#6a2d9a', '#15141a', '#e83a8a', '#f2742a'];

export default defineThing({
  questions: {
    figures: choice('Who or what is painted on the candle glasses?', {
      saints: 'Catholic saints, the Virgin in her rays and the Sacred Heart.',
      folk: 'Folk saints and spell candles: a robed skeleton, a moustached bandit, money-drawing green, seven colours, a black cat for luck.',
      pop: 'Joke and pop-icon candles: a haloed singer, a sainted shop cat, a pizza slice, a holy pigeon.',
      plain: 'No pictures at all, just plain glass over wax of every colour.',
      mixed: 'Everything together, saints beside jokes beside plain colours.',
    }),
    burning: score('How many of the candles are burning?', ['None lit', 'One', 'A few', 'Most of them', 'Every wick alight']),
    burned: score('How far have they burned down?', ['Brand new, wax to the brim', 'A little used', 'Half gone', 'Guttering in the bottom of sooty glass']),
    offering: choice('What has been left in front of the candles?', {
      none: 'Nothing.',
      coins: 'A saucer and a scatter of coins.',
      flowers: 'A jar of marigolds and loose petals.',
      photo: 'A framed photograph of someone and a string of beads.',
      petitions: 'Folded handwritten petitions and a pencil stub.',
      drink: 'A shot of rum, a cigar and a sweet roll.',
    }),
    shelf: choice('What kind of shelf is it?', {
      pine: 'A plain home-made pine shelf.',
      botanica: 'Red paint and gold trim strung with tiny lights, a botánica altar.',
      store: 'A white shop shelf with a price strip: these are for sale.',
      tile: 'A niche backed with blue and white tiles under a small arch.',
    }),
    banner: choice('What hangs above it?', {
      nothing: 'Nothing.',
      picado: 'A string of cut-paper flags in bright colours.',
      cross: 'A small wooden cross.',
      sign: 'A hand-lettered sign naming the price or the saint of the day.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 0.94, H = 0.74, back = -0.15;
    const texture = (w: number, h: number, draw: (g: G) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const frame = s.material({ pine: '#c9a06a', botanica: '#b3201c', store: '#eeeee8', tile: '#f0ebdc' }[a.shelf], { roughness: 0.65 });
    const trim = s.material({ pine: '#a67c48', botanica: '#e8b82a', store: '#c9cdd0', tile: '#2a5fa8' }[a.shelf], a.shelf === 'botanica' ? { metalness: 0.6, roughness: 0.35 } : {});
    const backMap = texture(256, 200, (g) => {
      g.fillStyle = { pine: '#b88f58', botanica: '#8a1716', store: '#e3e3dc', tile: '#f3f1e8' }[a.shelf];
      g.fillRect(0, 0, 256, 200);
      if (a.shelf === 'tile') for (let x = 0; x < 8; x++) for (let y = 0; y < 7; y++) {
        g.strokeStyle = '#c9c5b5'; g.lineWidth = 1; g.strokeRect(x * 32, y * 32, 32, 32);
        g.strokeStyle = '#2a5fa8'; g.lineWidth = 3;
        g.beginPath(); g.arc(x * 32 + 16, y * 32 + 16, 9, 0, 7); g.stroke();
        disc(g, x * 32 + 16, y * 32 + 16, 3, (x + y) % 2 ? '#e8b82a' : '#2a5fa8');
      }
      if (a.shelf === 'pine') { g.strokeStyle = 'rgba(90,60,30,0.35)'; g.lineWidth = 1.5; for (let y = 6; y < 200; y += 11) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 5, 170, y - 5, 256, y + 2); g.stroke(); } }
      if (a.shelf === 'store') { g.fillStyle = '#b9bcbc'; for (let x = 8; x < 256; x += 16) for (let y = 8; y < 200; y += 16) g.fillRect(x, y, 3, 6); }
      if (a.shelf === 'botanica') { g.fillStyle = '#e8b82a'; for (let x = 16; x < 256; x += 32) for (let y = 16; y < 200; y += 32) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.fill(); } }
    });
    s.box([W, H, 0.014], [0, H / 2, back], new THREE.MeshStandardMaterial({ map: backMap, roughness: 0.8 }));
    for (const x of [-1, 1]) s.box([0.022, H, 0.2], [x * (W / 2 + 0.011), H / 2, back + 0.1], frame);
    s.box([W + 0.044, 0.03, 0.44], [0, 0.015, back + 0.22], frame);
    s.box([W + 0.044, 0.022, 0.19], [0, 0.365, back + 0.095], frame);
    s.box([W + 0.06, 0.03, 0.22], [0, H + 0.015, back + 0.1], trim);
    for (const [y, z] of [[0.03, back + 0.44], [0.376, back + 0.19]]) s.box([W + 0.044, 0.016, 0.008], [0, y, z], trim);
    if (a.shelf === 'tile') {
      const arch = s.mesh(new THREE.CylinderGeometry(W / 2 + 0.03, W / 2 + 0.03, 0.06, 32, 1, false, -Math.PI / 2, Math.PI), frame, [0, H + 0.03, back + 0.03]);
      arch.rotation.x = Math.PI / 2;
      arch.scale.y = 1; arch.scale.x = 1; arch.scale.z = 0.36;
    }
    if (a.shelf === 'store') {
      s.label('VELAS $3.99', 0.34, 0.045, [-0.22, 0.34, back + 0.196], '#c4162a', '#fff3a0');
      s.label('7 DAY CANDLE 2/$7', 0.4, 0.045, [0.18, 0.02, back + 0.446], '#15141a', '#ffffff');
    }
    const flames: THREE.Mesh[] = [];
    const flameColour = new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 1, 0.6);
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: flameColour, emissiveIntensity: 2.2 });
    const glowMaterial = new THREE.MeshStandardMaterial({ color: flameColour, emissive: flameColour, emissiveIntensity: 1.2, transparent: true, opacity: 0.42, depthWrite: false });
    if (a.shelf === 'botanica') {
      const bulbs = Array.from({ length: 15 }, (_unused, i) => ({ at: [-W / 2 + (i + 0.5) * W / 15, H - 0.03 - Math.sin((i + 0.5) / 15 * Math.PI) * 0.04, back + 0.02] as [number, number, number], size: 0.011, color: ['#ff4a3a', '#ffd23a', '#3adf6a', '#3a9aff'][i % 4] }));
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: mix(0.2, 0.9, mood.cheer), roughness: 0.3 }), bulbs);
    }

    // Candles.
    const pools = { saints: [SAINTS], folk: [FOLK], pop: [POP], plain: [], mixed: [SAINTS, FOLK, POP] }[a.figures] as Label[][];
    const glass = new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.26, roughness: 0.05, depthWrite: false });
    const soot = new THREE.MeshStandardMaterial({ color: '#1a1512', transparent: true, opacity: mix(0.15, 0.75, mood.wear), depthWrite: false });
    const GH = 0.215, R = 0.031;
    const glassGeometry = new THREE.CylinderGeometry(R, R, GH, 18, 1, true);
    const labelGeometry = new THREE.CylinderGeometry(R + 0.0008, R + 0.0008, 0.14, 18, 1, true);
    const candle = (x: number, y: number, z: number, lit: boolean) => {
      const plain = !pools.length || a.figures === 'mixed' && random() < 0.25;
      const label = plain ? null : pick(pick(pools));
      const wax = plain ? pick(PLAIN) : label!.wax;
      const level = Math.max(0.06, 1 - a.burned * mix(0.6, 1, random()) - (lit ? 0.08 : 0));
      const waxHeight = (GH - 0.02) * level;
      s.cylinder(R + 0.001, R + 0.001, 0.008, [x, y + 0.004, z], s.material('#dfeaec', { roughness: 0.2 }), 18);
      const core = s.cylinder(R - 0.003, R - 0.003, waxHeight, [x, y + 0.008 + waxHeight / 2, z], new THREE.MeshStandardMaterial({ color: wax, roughness: 0.55, emissive: lit ? flameColour : new THREE.Color('#000'), emissiveIntensity: lit ? 0.5 : 0 }), 14);
      core.castShadow = true;
      const tube = s.mesh(glassGeometry, glass, [x, y + GH / 2, z]);
      tube.castShadow = false;
      if (label) {
        const map = texture(192, 128, (g) => {
          g.fillStyle = label.ground; g.fillRect(0, 0, 192, 128);
          g.fillStyle = '#e8b82a'; g.fillRect(0, 0, 192, 5); g.fillRect(0, 123, 192, 5);
          label.draw(g);
        });
        const sleeve = s.mesh(labelGeometry, new THREE.MeshStandardMaterial({ map, roughness: 0.5, emissive: lit ? flameColour : new THREE.Color('#000'), emissiveIntensity: lit ? 0.12 : 0 }), [x, y + 0.09, z]);
        sleeve.rotation.y = Math.PI + (random() - 0.5) * 0.7;
      }
      if (a.burned > 0.45 && !lit && random() < 0.6) s.mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.05, 18, 1, true), soot, [x, y + GH - 0.027, z]).castShadow = false;
      if (lit) {
        const base = y + 0.008 + waxHeight;
        s.cylinder(0.0015, 0.0015, 0.012, [x, base + 0.006, z], s.material('#1a1512'), 5);
        const flame = s.ball([0.012, 0.03, 0.012], [x, base + 0.034, z], flameMaterial, 10);
        flame.castShadow = false;
        flame.userData.phase = random() * 9;
        flames.push(flame);
        const glow = s.ball([0.05, 0.06, 0.05], [x, base + 0.035, z], glowMaterial, 12);
        glow.castShadow = false;
        const column = Math.max(0.02, y + GH - base);
        s.cylinder(R - 0.002, R - 0.002, column, [x, base + column / 2, z], glowMaterial, 14).castShadow = false;
      } else if (level < 0.98) s.cylinder(0.0015, 0.0015, 0.01, [x, y + 0.008 + waxHeight + 0.005, z], s.material('#1a1512'), 5);
    };
    const perRow = Math.round(mix(4, 6, mood.density));
    const spots: [number, number, number][] = [];
    for (let i = 0; i < perRow; i++) {
      const x = (i - (perRow - 1) / 2) * (W - 0.1) / perRow;
      spots.push([x + (random() - 0.5) * 0.02, 0.376, back + 0.095 + (random() - 0.5) * 0.03]);
      spots.push([x + (W - 0.1) / perRow * 0.5 * (i < perRow - 1 || perRow < 5 ? 1 : -1) * 0 + (random() - 0.5) * 0.03, 0.03, back + 0.14 + (random() - 0.5) * 0.04]);
    }
    if (mood.density > 0.6) for (const x of [-W / 2 + 0.07, W / 2 - 0.07]) spots.push([x, 0.03, back + 0.33]);
    const litCount = a.burning < 0.08 ? 0 : Math.max(1, Math.round(a.burning ** 1.3 * spots.length));
    const orderLit = spots.map((_unused, index) => index).sort(() => random() - 0.5).slice(0, litCount);
    spots.forEach(([x, y, z], index) => candle(x, y, z, orderLit.includes(index)));

    // Spilled wax by wear.
    for (let i = 0; i < Math.round(mood.wear * 9); i++) s.ball([0.012 + random() * 0.02, 0.004, 0.012 + random() * 0.015], [(random() - 0.5) * W * 0.9, 0.032, back + 0.2 + random() * 0.2], s.material(pick(PLAIN), { roughness: 0.4 }), 8);

    // The offering on the front ledge.
    const fz = back + 0.33;
    if (a.offering === 'coins') {
      s.cylinder(0.07, 0.045, 0.012, [0.02, 0.037, fz], s.material('#f1ede2', { roughness: 0.3 }), 20);
      const coins = Array.from({ length: Math.round(mix(8, 22, mood.density)) }, (_unused, i) => {
        const inDish = i < 6, r = inDish ? random() * 0.04 : 0.09 + random() * 0.25, t = random() * 7;
        return { at: [0.02 + Math.cos(t) * r * (inDish ? 1 : 1.2), inDish ? 0.046 + i * 0.002 : 0.032, fz + Math.sin(t) * r * (inDish ? 1 : 0.22)] as [number, number, number], size: 0.011 + random() * 0.004, color: pick(['#d9b23a', '#c9cdd0', '#b87a4a', '#c9cdd0']) };
      });
      const coin = new THREE.CylinderGeometry(1, 1, 0.16, 12);
      s.scatter(coin, new THREE.MeshStandardMaterial({ metalness: 0.8, roughness: 0.35 }), coins);
    }
    if (a.offering === 'flowers') {
      s.cylinder(0.035, 0.03, 0.09, [-0.05, 0.075, fz], new THREE.MeshStandardMaterial({ color: '#bfe0e6', transparent: true, opacity: 0.6, roughness: 0.1 }), 14);
      const blooms: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const t = i / 7 * Math.PI * 2, top: [number, number, number] = [-0.05 + Math.cos(t) * 0.05, 0.17 + random() * 0.06, fz + Math.sin(t) * 0.04];
        s.rod([-0.05, 0.07, fz], top, 0.0035, s.material('#3f7a34'));
        blooms.push({ at: top, size: 0.024 + random() * 0.008, color: pick(['#f28a12', '#f6a81c', '#f6d21c']) });
      }
      for (let i = 0; i < 16; i++) blooms.push({ at: [(random() - 0.5) * 0.6, 0.033, fz + (random() - 0.3) * 0.12], size: 0.007, color: pick(['#f28a12', '#f6a81c']) });
      const head = new THREE.SphereGeometry(1, 9, 6);
      head.scale(1, 0.6, 1);
      s.scatter(head, new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms);
    }
    if (a.offering === 'photo') {
      const portrait = texture(96, 128, (g) => {
        g.fillStyle = '#d9c7a0'; g.fillRect(0, 0, 96, 128);
        g.fillStyle = '#6a5238'; g.beginPath(); g.ellipse(48, 132, 36, 46, 0, 0, 7); g.fill();
        disc(g, 48, 56, 20, '#8a6a48'); g.fillStyle = '#4a3826'; g.beginPath(); g.arc(48, 50, 21, Math.PI, 0); g.fill();
      });
      const lean = -0.28, px = 0.06;
      const holder = s.box([0.13, 0.17, 0.012], [px, 0.11, fz - 0.01], s.material(pick(['#2a2420', '#c9a23a', '#8a8d92']), { metalness: 0.4 }));
      holder.rotation.x = lean;
      const picture = s.mesh(new THREE.PlaneGeometry(0.105, 0.14), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), [px, 0.11, fz - 0.003]);
      picture.rotation.x = lean;
      const beads = Array.from({ length: 26 }, (_unused, i) => { const t = i / 26 * Math.PI * 2; return { at: [px - 0.19 + Math.cos(t) * 0.06, 0.035, fz + 0.02 + Math.sin(t) * 0.035] as [number, number, number], size: 0.005, color: '#3a2a6a' }; });
      for (let i = 0; i < 5; i++) beads.push({ at: [px - 0.13 + i * 0.012, 0.035, fz + 0.02 + i * 0.006], size: 0.005, color: '#3a2a6a' });
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.3 }), beads);
    }
    if (a.offering === 'petitions') {
      const paper = s.material('#f6f1dc', { roughness: 0.9 });
      for (let i = 0; i < Math.round(mix(4, 11, mood.density)); i++) {
        const slip = s.box([0.07, 0.003, 0.045], [(random() - 0.5) * 0.7, 0.033 + i * 0.001, fz + (random() - 0.5) * 0.1], paper);
        slip.rotation.y = random() * 3;
        if (random() < 0.5) { const fold = s.box([0.07, 0.003, 0.03], [slip.position.x, 0.045, slip.position.z + 0.012], paper); fold.rotation.set(0.6, slip.rotation.y, 0); }
      }
      s.rod([0.18, 0.036, fz + 0.06], [0.26, 0.036, fz + 0.04], 0.004, s.material('#e8b82a'));
    }
    if (a.offering === 'drink') {
      s.cylinder(0.022, 0.017, 0.05, [-0.08, 0.055, fz], new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.4, roughness: 0.05 }), 12);
      s.cylinder(0.019, 0.015, 0.032, [-0.08, 0.048, fz], s.material('#b06a1c', { roughness: 0.2 }), 12);
      s.rod([0.02, 0.04, fz + 0.03], [0.14, 0.04, fz + 0.0], 0.009, s.material('#5a3a22'));
      s.ball([0.01, 0.01, 0.01], [0.145, 0.04, fz - 0.001], s.material('#c9c5bd'), 8);
      s.ball([0.05, 0.028, 0.05], [0.26, 0.055, fz], s.material('#d9a45c'), 14);
      s.ball([0.04, 0.012, 0.04], [0.26, 0.078, fz], s.material('#f2a7c0'), 12);
      s.cylinder(0.06, 0.05, 0.008, [0.26, 0.034, fz], s.material('#f1ede2'), 16);
    }

    // What hangs above.
    const top = H + 0.03;
    const flags: THREE.Mesh[] = [];
    if (a.banner === 'picado') {
      for (const x of [-1, 1]) s.rod([x * (W / 2 + 0.01), top, back + 0.02], [x * (W / 2 + 0.01), top + 0.22, back + 0.02], 0.006, trim);
      s.rod([-W / 2, top + 0.21, back + 0.02], [W / 2, top + 0.21, back + 0.02], 0.002, s.material('#1a1512'));
      const cut = texture(64, 64, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 56); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(8 + i * 16, 56, 8, 0, Math.PI); g.fill(); } g.globalCompositeOperation = 'destination-out'; for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) { g.beginPath(); g.arc(14 + x * 18, 16 + y * 20, 5, 0, 7); g.fill(); } g.beginPath(); g.moveTo(32, 20); g.lineTo(38, 28); g.lineTo(32, 36); g.lineTo(26, 28); g.fill(); });
      for (let i = 0; i < 7; i++) {
        const flag = s.mesh(new THREE.PlaneGeometry(0.115, 0.115), new THREE.MeshStandardMaterial({ map: cut, color: ['#e83a8a', '#f2c53a', '#2a9ad0', '#3ab85a', '#f2742a', '#8a4ad0', '#e8442a'][i], alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), [-W / 2 + (i + 0.5) * W / 7, top + 0.15, back + 0.02]);
        flag.userData.phase = i;
        flags.push(flag);
      }
    }
    if (a.banner === 'cross') {
      const wood = s.material('#5a3a22');
      s.box([0.03, 0.26, 0.02], [0, top + 0.13, back + 0.05], wood);
      s.box([0.16, 0.03, 0.02], [0, top + 0.18, back + 0.05], wood);
    }
    if (a.banner === 'sign') {
      const text = a.shelf === 'store' ? pick(['VELAS 2 X $7', 'CANDLES $3.99', 'ALL SAINTS $4']) : pick(['SE VENDEN VELAS', 'PRAY FOR US', 'LUZ Y PROGRESO', 'NO TOCAR']);
      s.label(text, 0.62, 0.15, [0, top + 0.095, back + 0.03], '#8a1716', '#f6efcf').rotation.z = (random() - 0.5) * 0.06;
      for (const x of [-0.2, 0.2]) s.rod([x, top, back + 0.02], [x, top + 0.05, back + 0.025], 0.005, trim);
    }

    const speed = mix(4, 16, mood.energy), wobble = mix(0.08, 0.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const flame of flames) {
          const p = flame.userData.phase as number, f = Math.sin(time * speed + p) * Math.sin(time * speed * 0.37 + p * 2);
          flame.scale.set(0.012 * (1 - f * wobble * 0.4), 0.03 * (1 + f * wobble), 0.012);
          flame.rotation.z = f * wobble * 0.5;
        }
        flameMaterial.emissiveIntensity = 2.2 + Math.sin(time * speed * 0.8) * wobble;
        for (const flag of flags) flag.rotation.x = Math.sin(time * speed * 0.2 + (flag.userData.phase as number)) * wobble * 0.5;
      },
    });
  },
});
