import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix, visibleBounds } from '@conjure/kit';
import { type V, add, ball, box, cyl, group, hazard, paint, rod, stencil, tube } from './h';

type Ctx = CanvasRenderingContext2D;
const HW = 15, HD = 11, WH = 12.5, DW = 6.5, DH = 10;
const HERO: V = [0, 0, -1.5];
/** Where the supporting cast stands relative to the hero, and how much ground each may take. */
const OFFSETS: readonly (readonly [number, number, number])[] = [[-8.4, 5.6, 3.0], [8.0, 6.4, 3.0], [9.8, -0.6, 2.8], [-9.8, -0.2, 2.8], [0.4, 7.6, 2.5]];

const PAL = {
  military: { wall: '#959e94', low: '#667264', steel: '#e3ae1e', frame: '#4b5350', door: '#77827c', floor: '#a5a6a0', accent: '#e3ae1e', suit: '#d9792b', crate: '#5f6d47' },
  corporate: { wall: '#d3d8d8', low: '#9fa9ae', steel: '#e4e7e6', frame: '#7d888e', door: '#b9c1c5', floor: '#b7bcbb', accent: '#f07a1d', suit: '#f07a1d', crate: '#dfe3e4' },
  rebel: { wall: '#a48d6f', low: '#705c46', steel: '#b5673a', frame: '#5a4a3c', door: '#84735f', floor: '#9d9386', accent: '#c8452c', suit: '#6f7f52', crate: '#8a6d46' },
  ceremonial: { wall: '#7d808d', low: '#484a55', steel: '#3a3c45', frame: '#2f3138', door: '#6d2a30', floor: '#8f9097', accent: '#d4af37', suit: '#f1ecdc', crate: '#3d3f49' },
} as const;
const OUT = {
  snow: { sky: '#e9eef1', ground: '#f4f6f7', spill: '255,255,255', glow: 0.5, back: '#e3e7e9' },
  desert: { sky: '#f6e7bd', ground: '#d9bb86', spill: '255,240,200', glow: 0.55, back: '#eadfc8' },
  rain: { sky: '#aeb9bf', ground: '#6f7a80', spill: '215,228,236', glow: 0.25, back: '#d0d6d7' },
  night: { sky: '#2c395c', ground: '#3a4152', spill: '170,190,255', glow: 0.16, back: '#a3adc0' },
  orbit: { sky: '#161b2e', ground: '#555a66', spill: '190,215,255', glow: 0.3, back: '#b1b2c2' },
} as const;

function emblem(ctx: Ctx, kind: keyof typeof PAL, x: number, y: number, r: number, random: () => number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  const disc = (q: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, q, 0, 7); ctx.fill(); };
  if (kind === 'military') {
    disc(1, '#f1ecdc'); disc(0.86, '#33452f'); ctx.fillStyle = '#f1ecdc'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? 0.3 : 0.74; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    ctx.fill();
  } else if (kind === 'corporate') {
    ctx.fillStyle = '#f07a1d'; ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * Math.PI / 3) * 1, Math.sin(i * Math.PI / 3) * 1); ctx.fill();
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) ctx.fillRect(-0.5 + i * 0.12, -0.42 + i * 0.3, 1 - i * 0.24, 0.17);
  } else if (kind === 'rebel') {
    ctx.strokeStyle = '#c8452c'; ctx.lineWidth = 0.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 0.85, 0.5, 5.6); ctx.stroke();
    ctx.fillStyle = '#c8452c'; ctx.fillRect(-0.3, -0.45, 0.6, 0.6); ctx.fillRect(-0.2, 0.1, 0.4, 0.7); for (let i = 0; i < 4; i++) ctx.fillRect(-0.3 + i * 0.16, -0.62, 0.12, 0.3);
    for (let i = 0; i < 5; i++) ctx.fillRect(-0.7 + random() * 1.4, 0.7, 0.05, 0.3 + random() * 0.6);
  } else {
    ctx.fillStyle = '#d4af37'; ctx.beginPath(); for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, q = i % 2 ? 0.6 : 1; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.fill();
    disc(0.5, '#6d2a30'); disc(0.3, '#d4af37');
  }
  ctx.restore();
}

export default defineWorld({
  questions: {
    door: choice('How far open is the great blast door?', {
      crack: 'Barely: a single blade of outside light down the middle.',
      half: 'Half open, a tall slot of weather behind the machine.',
      wide: 'Rolled right back, the whole bay open to the outside.',
      lopsided: 'One leaf run back and the other still shut.',
    }),
    outside: choice('What is beyond the door?', {
      snow: 'White daylight and snow blowing in across the deck.',
      desert: 'Hard desert glare, dunes and sand drifting over the sill.',
      rain: 'Grey rain on an apron, the deck wet inside the door.',
      night: 'Blue night with stars and a line of field lights.',
      orbit: 'Black space with stars and the curve of a planet: the bay is on a ship or a station.',
    }),
    state: choice('What is the bay doing?', {
      eve: 'The eve of a sortie: everything staged, hoses run out, ammunition stacked, amber lights turning.',
      still: 'Stood down and eerily still: dust sheets over the stores, one work lamp left on.',
      scramble: 'A scramble: red lights flashing, the gantry arms swung clear.',
      repair: 'Deep in repairs: weld sparks, armour plates leaned on the wall, scaffolding and open crates.',
      abandoned: 'Long abandoned: dead lamps, a fallen beam, weeds and vines coming in.',
    }),
    crane: choice('What hangs from the overhead crane?', {
      hook: 'Only the empty hook block.',
      plate: 'A slab of armour plate on chains.',
      crate: 'A stencilled ammunition crate.',
      core: 'A reactor core in a lifting frame, glowing faintly.',
      arm: 'A whole machine forearm and fist, dangling.',
      banner: 'No load: a huge flag hung from the crane bridge.',
    }),
    owner: choice('Whose bay is it?', {
      military: 'A regular army: grey-green walls, yellow steel, a white star.',
      corporate: 'A contractor: clean white panels, orange trim, a logo.',
      rebel: 'Rebels or salvagers: rust, patched sheeting, a red hand-painted mark.',
      ceremonial: 'A royal or ceremonial guard: dark slate, crimson doors, gold trim and banners.',
    }),
    sign: choice('What is lettered over the door?', {
      bay: 'Just the bay number.',
      danger: 'DANGER WALKER MOVEMENT',
      motto: 'THEY WALK BECAUSE WE WORK',
      days: 'DAYS SINCE LAST INCIDENT and a number.',
      home: 'BRING THEM ALL HOME',
    }),
    crew: choice('Who is on the deck?', {
      nobody: 'Nobody at all.',
      pilot: 'One pilot standing alone, looking up.',
      mechanics: 'A scatter of mechanics at work around the bay.',
      parade: 'A short line of pilots drawn up in front of the machine.',
    }),
    view: choice('Where is it seen from?', {
      deck: 'Low on the deck, the machines looming against the door.',
      gallery: 'From a catwalk, a three-quarter view down into the bay.',
      crane: 'High in the roof, looking steeply down at the floor markings.',
      axis: 'Square-on down the centre line, formal and symmetrical.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pal = PAL[a.owner], out = OUT[a.outside];
    const [pitch, yaw] = { deck: [15, 30], gallery: [27, 27], crane: [44, 21], axis: [17, 5] }[a.view];
    const { art: s, world } = diorama(context, { background: out.back, floor: null, width: HW * 2, depth: HD * 2, pitch, yaw });
    const R = s.root;
    const dead = a.state === 'abandoned';
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const [openL, openR] = { crack: [0.3, 0.3], half: [3.1, 3.1], wide: [6.1, 6.1], lopsided: [5.6, 0] }[a.door];
    const bay = String(1 + Math.floor(random() * 19)).padStart(2, '0');
    const jit = (v: number) => (random() - 0.5) * 2 * v;

    for (const child of R.children) if ((child as THREE.HemisphereLight).isHemisphereLight) {
      const hemi = child as THREE.HemisphereLight;
      hemi.intensity = { snow: 1.5, desert: 1.5, rain: 1.3, night: 1.15, orbit: 1.2 }[a.outside] * (a.state === 'still' ? 0.9 : 1);
      hemi.color.set(a.outside === 'night' || a.outside === 'orbit' ? '#cfd8ff' : '#f6f4ee');
    }

    // ---- Floor: one painted deck with the bay pad, lane lines, footprints and the light from the door.
    const fw = 2048, fh = Math.round(fw * HD / HW);
    const fx = (x: number) => (x + HW) / (HW * 2) * fw, fz = (z: number) => (z + HD) / (HD * 2) * fh, fm = fw / (HW * 2);
    const floorTex = paint(fw, fh, (ctx) => {
      ctx.fillStyle = pal.floor; ctx.fillRect(0, 0, fw, fh);
      for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.015 + random() * 0.03})`; ctx.beginPath(); ctx.ellipse(random() * fw, random() * fh, 40 + random() * 200, 30 + random() * 120, random() * 3, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3;
      for (let x = -HW; x <= HW; x += 5) { ctx.beginPath(); ctx.moveTo(fx(x), 0); ctx.lineTo(fx(x), fh); ctx.stroke(); }
      for (let z = -HD + 1; z <= HD; z += 5) { ctx.beginPath(); ctx.moveTo(0, fz(z)); ctx.lineTo(fw, fz(z)); ctx.stroke(); }
      // Scuffs where the machines walk in from the door.
      for (let i = 0; i < 6; i++) { const z = -10.3 + i * 1.75, x = (i % 2 ? 1 : -1) * 1.7; ctx.fillStyle = `rgba(20,20,20,${0.1 + mood.wear * 0.2})`; ctx.beginPath(); ctx.roundRect(fx(x) - 0.7 * fm, fz(z) - 1.0 * fm, 1.4 * fm, 2 * fm, 0.3 * fm); ctx.fill(); }
      // Oil and scorch by wear.
      for (let i = 0; i < Math.round(mood.wear * 40); i++) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(25,22,20,0.55)'); g.addColorStop(1, 'rgba(25,22,20,0)'); ctx.save(); ctx.translate(random() * fw, random() * fh); ctx.scale(20 + random() * 90, 15 + random() * 60); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore(); }
      // The bay pad: a hazard-striped square with its number.
      const P = 5.6, band = 0.55;
      ctx.save(); ctx.beginPath(); ctx.rect(fx(-P), fz(HERO[2] - P), 2 * P * fm, 2 * P * fm); ctx.rect(fx(-P + band), fz(HERO[2] - P + band), 2 * (P - band) * fm, 2 * (P - band) * fm); ctx.clip('evenodd');
      ctx.fillStyle = '#e8b21c'; ctx.fillRect(fx(-P), fz(HERO[2] - P), 2 * P * fm, 2 * P * fm);
      ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 0.36 * fm;
      for (let d = -30; d < 30; d += 1.0) { ctx.beginPath(); ctx.moveTo(fx(d), fz(-HD)); ctx.lineTo(fx(d + 2 * HD), fz(HD)); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(232,178,28,0.9)'; ctx.lineWidth = 0.14 * fm;
      ctx.beginPath(); ctx.arc(fx(0), fz(HERO[2]), 3.4 * fm, 0, 7); ctx.stroke();
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx(sx * DW), fz(-HD)); ctx.lineTo(fx(sx * P), fz(HERO[2] - P)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx(sx * P), fz(HERO[2] + P)); ctx.lineTo(fx(sx * P), fz(HD)); ctx.stroke(); }
      ctx.save(); ctx.translate(fx(0), fz(HERO[2] + P + 1.5)); stencil(ctx, `BAY ${bay}`, 0, 0, 1.5 * fm, 'rgba(232,178,28,0.92)', 'center'); ctx.restore();
      stencil(ctx, 'KEEP CLEAR', fx(0), fz(HD - 1.5), 0.9 * fm, 'rgba(240,236,220,0.75)', 'center');
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(240,236,220,0.7)'; ctx.beginPath(); const x = fx(sx * 10.5), z = fz(6 - i * 5); ctx.moveTo(x, z - 0.9 * fm); ctx.lineTo(x + 0.6 * fm, z + 0.3 * fm); ctx.lineTo(x + 0.2 * fm, z + 0.3 * fm); ctx.lineTo(x + 0.2 * fm, z + 0.9 * fm); ctx.lineTo(x - 0.2 * fm, z + 0.9 * fm); ctx.lineTo(x - 0.2 * fm, z + 0.3 * fm); ctx.lineTo(x - 0.6 * fm, z + 0.3 * fm); ctx.fill(); }
      // Cut edges of the stage in hazard paint.
      ctx.save(); ctx.beginPath(); ctx.rect(0, fh - 0.4 * fm, fw, 0.4 * fm); ctx.rect(fw - 0.4 * fm, 0, 0.4 * fm, fh); ctx.clip(); ctx.fillStyle = '#e8b21c'; ctx.fillRect(0, 0, fw, fh); ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 0.3 * fm; for (let d = -30; d < 30; d += 0.8) { ctx.beginPath(); ctx.moveTo(fx(d), fz(-HD)); ctx.lineTo(fx(d + 2 * HD), fz(HD)); ctx.stroke(); } ctx.restore();
      // What blows or runs in under the door.
      const gl = -openL, gr = openR, lean = (0.5 - mood.daylight) * 9;
      if (a.outside === 'snow' || a.outside === 'desert' || a.outside === 'rain') {
        const tone = a.outside === 'snow' ? '250,252,253' : a.outside === 'desert' ? '217,187,134' : '70,84,94';
        const reach = (a.outside === 'rain' ? 5 : 3.2) + (gr - gl) * 0.35;
        const g = ctx.createLinearGradient(0, fz(-HD), 0, fz(-HD + reach)); g.addColorStop(0, `rgba(${tone},0.95)`); g.addColorStop(0.5, `rgba(${tone},0.55)`); g.addColorStop(1, `rgba(${tone},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx(gl - 0.3), fz(-HD)); ctx.lineTo(fx(gr + 0.3), fz(-HD)); ctx.lineTo(fx(gr + 1.5 + lean * 0.2), fz(-HD + reach)); ctx.lineTo(fx(gl - 1.5 + lean * 0.2), fz(-HD + reach)); ctx.fill();
        for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(${tone},${0.3 + random() * 0.5})`; ctx.beginPath(); ctx.ellipse(fx(mix(gl - 1, gr + 1, random())), fz(-HD + random() * reach * 1.1), (0.2 + random() * 0.7) * fm, (0.1 + random() * 0.3) * fm, jit(0.4), 0, 7); ctx.fill(); }
      }
      // The shaft of outside light across the deck.
      const g = ctx.createLinearGradient(0, fz(-HD), 0, fz(HD)); g.addColorStop(0, `rgba(${out.spill},${out.glow})`); g.addColorStop(0.75, `rgba(${out.spill},${out.glow * 0.25})`); g.addColorStop(1, `rgba(${out.spill},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx(gl), fz(-HD)); ctx.lineTo(fx(gr), fz(-HD)); ctx.lineTo(fx(gr + 2.2 + lean), fz(HD)); ctx.lineTo(fx(gl - 2.2 + lean), fz(HD)); ctx.fill();
      if (dead) for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(${60 + random() * 40},${90 + random() * 40},50,${0.25 + random() * 0.3})`; const edge = random() < 0.5; ctx.beginPath(); ctx.ellipse(edge ? fx(-HW + random() * 2.2) : random() * fw, edge ? random() * fh : fz(-HD + random() * 2), (0.2 + random() * 0.6) * fm, (0.15 + random() * 0.4) * fm, random() * 3, 0, 7); ctx.fill(); }
    });
    const floor = add(R, new THREE.PlaneGeometry(HW * 2, HD * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: a.outside === 'rain' ? 0.45 : a.owner === 'ceremonial' || a.owner === 'corporate' ? 0.55 : 0.9 }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
    floor.castShadow = false;
    world.ground = floor;
    box(R, [HW * 2, 0.6, HD * 2], [0, -0.31, 0], s.material('#6d6f6c')).castShadow = false;

    // ---- Back wall with the door opening, painted in one piece.
    const bw = 2048, bh = Math.round(bw * WH / (HW * 2)), bm = bw / (HW * 2);
    const wx = (x: number) => (x + HW) * bm, wy = (y: number) => (WH - y) * bm;
    const signText = { bay: `BAY ${bay}`, danger: 'DANGER  WALKER MOVEMENT', motto: 'THEY WALK BECAUSE WE WORK', days: `DAYS SINCE LAST INCIDENT  ${Math.floor((1 - mood.wear) ** 2 * 400 * random())}`, home: 'BRING THEM ALL HOME' }[a.sign];
    const sheeting = (ctx: Ctx, w: number, h: number, m: number) => {
      ctx.fillStyle = pal.wall; ctx.fillRect(0, 0, w, h);
      if (a.owner === 'rebel') for (let i = 0; i < 26; i++) { ctx.fillStyle = ['#8b5a3c', '#7d8a86', '#b59b6a', '#6f5b4a', '#9c4a35'][Math.floor(random() * 5)]; ctx.globalAlpha = 0.75; ctx.fillRect(random() * w, random() * h, (1 + random() * 3) * m, (1 + random() * 2.5) * m); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 0.5 * m) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 4;
      for (const y of [4, 8]) { ctx.beginPath(); ctx.moveTo(0, h - y * m); ctx.lineTo(w, h - y * m); ctx.stroke(); }
      ctx.fillStyle = pal.low; ctx.fillRect(0, h - 1.5 * m, w, 1.5 * m);
      ctx.save(); ctx.beginPath(); ctx.rect(0, h - 1.85 * m, w, 0.35 * m); ctx.clip(); ctx.fillStyle = '#e8b21c'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 0.22 * m; for (let x = -h; x < w + h; x += 0.6 * m) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke(); } ctx.restore();
      if (a.owner === 'ceremonial') { ctx.fillStyle = '#d4af37'; for (let x = 0.3 * m; x < w; x += 5 * m) ctx.fillRect(x, 0, 0.18 * m, h - 1.85 * m); ctx.fillRect(0, 0.25 * m, w, 0.14 * m); }
      for (let i = 0; i < Math.round(mood.wear * 70 + (dead ? 40 : 0)); i++) { const x = random() * w, y = random() * h * 0.8, l = (0.5 + random() * 3) * m; const g = ctx.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, dead && random() < 0.4 ? 'rgba(40,60,35,0.5)' : 'rgba(105,60,32,0.5)'); g.addColorStop(1, 'rgba(105,60,32,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, (0.05 + random() * 0.2) * m, l); }
    };
    const backTex = paint(bw, bh, (ctx) => {
      sheeting(ctx, bw, bh, bm);
      // Door frame in chevrons.
      ctx.save(); ctx.beginPath(); ctx.rect(wx(-DW - 0.7), wy(DH + 0.7), (DW * 2 + 1.4) * bm, (DH + 0.7) * bm); ctx.clip();
      ctx.fillStyle = '#e8b21c'; ctx.fillRect(0, 0, bw, bh); ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 0.34 * bm;
      for (let x = -bh; x < bw + bh; x += 0.9 * bm) { ctx.beginPath(); ctx.moveTo(x, bh); ctx.lineTo(x + bh, 0); ctx.stroke(); }
      ctx.restore();
      // Sign board over the door.
      ctx.fillStyle = a.owner === 'corporate' ? '#f4f5f4' : '#1f2224'; ctx.fillRect(wx(-DW), wy(WH - 0.25), DW * 2 * bm, 1.3 * bm);
      stencil(ctx, signText, wx(0), wy(WH - 0.9), 0.95 * bm, a.owner === 'corporate' ? '#1f2224' : a.owner === 'ceremonial' ? '#d4af37' : '#f0ece0', 'center', DW * 2 * bm - 30);
      emblem(ctx, a.owner, wx(-10.9), wy(7.3), 1.9 * bm, random);
      // A sortie board on the right.
      ctx.fillStyle = '#20262a'; ctx.fillRect(wx(8.4), wy(9.4), 5.2 * bm, 4.6 * bm); ctx.strokeStyle = '#c9cdd0'; ctx.lineWidth = 3; ctx.strokeRect(wx(8.4), wy(9.4), 5.2 * bm, 4.6 * bm);
      stencil(ctx, a.state === 'repair' ? 'WORK ORDERS' : 'SORTIE BOARD', wx(11), wy(8.95), 0.42 * bm, '#f0ece0', 'center');
      for (let r = 0; r < 6; r++) {
        const y = wy(8.3 - r * 0.6);
        ctx.fillStyle = 'rgba(240,236,224,0.8)'; ctx.fillRect(wx(8.7), y - 3, (1 + random() * 1.6) * bm, 7);
        const lamp = dead || a.state === 'still' ? '#4b5357' : a.state === 'scramble' ? '#e2362a' : random() < 0.6 ? '#57c46a' : '#e3ae1e';
        ctx.fillStyle = lamp; ctx.fillRect(wx(12.4), y - 9, 0.8 * bm, 18);
        if (random() < 0.5) { ctx.fillStyle = 'rgba(240,236,224,0.6)'; ctx.fillRect(wx(11), y - 3, (0.4 + random()) * bm, 7); }
      }
      stencil(ctx, 'NO SMOKING', wx(-10.9), wy(3), 0.5 * bm, 'rgba(240,236,224,0.8)', 'center');
      stencil(ctx, 'HEARING PROTECTION', wx(11), wy(3), 0.42 * bm, 'rgba(240,236,224,0.8)', 'center');
    });
    backTex.repeat.set(1 / (HW * 2), 1 / WH); backTex.offset.set(0.5, 0);
    const wallShape = new THREE.Shape([[-HW - 0.5, 0], [-DW, 0], [-DW, DH], [DW, DH], [DW, 0], [HW, 0], [HW, WH], [-HW - 0.5, WH]].map(([x, y]) => new THREE.Vector2(x, y)));
    const wallMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.85 });
    add(R, new THREE.ExtrudeGeometry(wallShape, { depth: 0.5, bevelEnabled: false }), wallMat, [0, 0, -HD - 0.25]).castShadow = false;

    // Left wall.
    const leftTex = paint(1024, Math.round(1024 * WH / (HD * 2)), (ctx, w, h) => {
      const m = w / (HD * 2); sheeting(ctx, w, h, m);
      ctx.fillStyle = '#2a2f33'; for (let i = 0; i < 4; i++) { ctx.fillRect((5.5 + i * 3.2) * m, h - 11.3 * m, 2 * m, 1.1 * m); }
      ctx.fillStyle = dead ? '#3b4246' : `rgba(${out.spill},0.9)`; for (let i = 0; i < 4; i++) ctx.fillRect((5.6 + i * 3.2) * m, h - 11.2 * m, 1.8 * m, 0.9 * m);
    });
    box(R, [0.5, WH, HD * 2 + 0.5], [-HW - 0.25, WH / 2, -0.25], new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.85 })).castShadow = false;

    // ---- The door leaves and what is outside.
    const leafTex = (digit: string, flip: boolean) => paint(512, 788, (ctx, w, h) => {
      const m = w / DW;
      ctx.fillStyle = pal.door; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < h; y += m) ctx.fillRect(0, y, w, 0.12 * m);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; for (let y = 0.12 * m; y < h; y += m) ctx.fillRect(0, y, w, 0.08 * m);
      ctx.save(); ctx.beginPath(); ctx.rect(0, h - 1.7 * m, w, 1.7 * m); ctx.rect(flip ? 0 : w - 0.5 * m, 0, 0.5 * m, h); ctx.clip(); ctx.fillStyle = '#e8b21c'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 0.42 * m;
      for (let x = -h; x < w + h; x += 1.1 * m) { ctx.beginPath(); if (flip) { ctx.moveTo(x, h); ctx.lineTo(x + h, 0); } else { ctx.moveTo(x, 0); ctx.lineTo(x + h, h); } ctx.stroke(); } ctx.restore();
      stencil(ctx, digit, w / 2, h * 0.4, 4.6 * m, a.owner === 'ceremonial' ? '#d4af37' : 'rgba(240,236,224,0.9)', 'center');
      ctx.fillStyle = '#1b2227'; for (let i = 0; i < 3; i++) ctx.fillRect((1 + i * 1.6) * m, h - 3.1 * m, 1.0 * m, 0.5 * m);
      for (let i = 0; i < Math.round(mood.wear * 30); i++) { const x = random() * w, y = random() * h * 0.8, l = (0.5 + random() * 3) * m; const g = ctx.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, 'rgba(105,60,32,0.55)'); g.addColorStop(1, 'rgba(105,60,32,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, (0.05 + random() * 0.2) * m, l); }
    });
    const leafL = box(R, [DW, DH, 0.5], [-DW / 2 - openL, DH / 2, -HD - 0.62], new THREE.MeshStandardMaterial({ map: leafTex(bay[0], false), roughness: 0.7, metalness: 0.2 }));
    const leafR = box(R, [DW, DH, 0.5], [DW / 2 + openR, DH / 2, -HD - 0.62], new THREE.MeshStandardMaterial({ map: leafTex(bay[1], true), roughness: 0.7, metalness: 0.2 }));
    leafL.castShadow = leafR.castShadow = false;
    if (dead) { leafR.rotation.z = -0.035; leafR.position.y -= 0.12; }
    const skyTex = paint(640, 400, (ctx, w, h) => {
      const top = new THREE.Color(out.sky), low = top.clone();
      if (a.outside === 'snow' || a.outside === 'desert' || a.outside === 'rain') { low.lerp(new THREE.Color('#ffd7b0'), lowSun * 0.6); top.lerp(new THREE.Color(a.outside === 'desert' ? '#bcd3e6' : '#c9d3dc'), 0.35); }
      if (a.outside === 'night') low.lerp(new THREE.Color('#5b6a94'), 0.6);
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.72); g.addColorStop(0, `#${top.getHexString()}`); g.addColorStop(1, `#${low.getHexString()}`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (a.outside === 'night' || a.outside === 'orbit') for (let i = 0; i < 130; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + random() * 0.6})`; const r = random() < 0.1 ? 2.4 : 1.2; ctx.fillRect(random() * w, random() * h * (a.outside === 'orbit' ? 1 : 0.7), r, r); }
      if (a.outside === 'orbit') {
        const pc = new THREE.Color().setHSL(mix(0.58, 0.07, mood.warmth), 0.55, 0.55);
        const pg = ctx.createRadialGradient(w * 0.42, h * 2.05, h * 1.2, w * 0.42, h * 2.05, h * 1.5); pg.addColorStop(0, `#${pc.getHexString()}`); pg.addColorStop(0.9, `#${pc.clone().lerp(new THREE.Color('#ffffff'), 0.6).getHexString()}`); pg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(w * 0.42, h * 2.05, h * 1.5, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(random() * w, h * (0.72 + random() * 0.25), 30 + random() * 70, 5 + random() * 8, -0.1, 0, 7); ctx.fill(); }
        return;
      }
      // Horizon: mountains, dunes or the far side of the field.
      const hz = h * 0.7, far = new THREE.Color(out.ground).lerp(top, 0.45);
      ctx.fillStyle = `#${far.getHexString()}`; ctx.beginPath(); ctx.moveTo(0, hz);
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, hz - (a.outside === 'desert' ? 18 + Math.sin(x * 0.012 + bay.charCodeAt(1)) * 16 : a.outside === 'snow' ? 30 + random() * 46 : 8 + (Math.floor(x / 64) % 3) * 12));
      ctx.lineTo(w, hz); ctx.fill();
      ctx.fillStyle = out.ground; ctx.fillRect(0, hz, w, h - hz);
      if (a.outside === 'desert') { ctx.fillStyle = 'rgba(255,255,245,0.95)'; ctx.beginPath(); ctx.arc(w * mix(0.25, 0.75, mood.daylight), h * mix(0.12, 0.5, lowSun), 26, 0, 7); ctx.fill(); }
      if (a.outside === 'night') for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#ffd27a' : '#9fd0ff'; ctx.beginPath(); ctx.arc(w * (0.08 + i * 0.065), hz + 8 + (i % 3) * 5, 3.2, 0, 7); ctx.fill(); }
      if (a.outside === 'rain') { ctx.strokeStyle = 'rgba(235,242,246,0.45)'; ctx.lineWidth = 1.5; for (let i = 0; i < 160; i++) { const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 26); ctx.stroke(); } }
      if (a.outside === 'snow') for (let i = 0; i < 150; i++) { ctx.fillStyle = `rgba(255,255,255,${0.5 + random() * 0.5})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 1 + random() * 2.4, 0, 7); ctx.fill(); }
    });
    add(R, new THREE.PlaneGeometry(22, 9.4), new THREE.MeshBasicMaterial({ map: skyTex }), [-1.5, 4.5, -HD - 3.4]).castShadow = false;
    box(R, [22, 0.3, 3.4], [-1.5, -0.16, -HD - 1.9], new THREE.MeshStandardMaterial({ color: out.ground, roughness: a.outside === 'rain' ? 0.3 : 0.95 })).castShadow = false;
    if (a.outside === 'orbit') { const shield = add(R, new THREE.PlaneGeometry(DW * 2, DH), new THREE.MeshBasicMaterial({ color: '#7fc4ff', transparent: true, opacity: 0.13, depthWrite: false }), [0, DH / 2, -HD - 0.3]); shield.castShadow = false; }

    // ---- Structure: every boxy member goes into one instanced mesh.
    const solids: { m: THREE.Matrix4; c: string }[] = [];
    const UP = new THREE.Vector3(0, 1, 0);
    const beam = (from: V, to: V, w: number, d: number, c: string) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), dir = q.clone().sub(p), len = Math.max(dir.length(), 0.001);
      solids.push({ m: new THREE.Matrix4().compose(p.add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), new THREE.Vector3(w, len, d)), c });
    };
    const block = (size: V, at: V, c: string, ry = 0, rz = 0) =>
      solids.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(...size)), c });
    const lattice = (x: number, z: number, side: number, height: number, c: string) => {
      const hs = side / 2;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam([x + sx * hs, 0, z + sz * hs], [x + sx * hs, height, z + sz * hs], 0.14, 0.14, c);
      const bays = Math.round(height / 2);
      for (let i = 0; i < bays; i++) {
        const y0 = i * height / bays, y1 = (i + 1) * height / bays, f = i % 2 ? 1 : -1;
        beam([x - hs * f, y0, z + hs], [x + hs * f, y1, z + hs], 0.07, 0.07, c); beam([x + hs, y0, z + hs * f], [x + hs, y1, z - hs * f], 0.07, 0.07, c);
        beam([x - hs * f, y0, z - hs], [x + hs * f, y1, z - hs], 0.07, 0.07, c); beam([x - hs, y0, z + hs * f], [x - hs, y1, z - hs * f], 0.07, 0.07, c);
        block([side + 0.1, 0.08, side + 0.1], [x, y1, z], c);
      }
      block([side + 0.5, 0.25, side + 0.5], [x, 0.125, z], '#3a3d3f');
    };
    const steel = pal.steel, frame = pal.frame;
    const lampOn = new THREE.MeshStandardMaterial({ color: '#fff6da', emissive: new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.7, 0.7), emissiveIntensity: a.state === 'still' ? 0.5 : 1.4 });
    const lampOff = new THREE.MeshStandardMaterial({ color: '#4d5356', roughness: 0.4 });
    const beaconTone = a.state === 'scramble' || a.state === 'repair' ? '#ff3b2a' : '#ffae1a';
    const beaconA = new THREE.MeshStandardMaterial({ color: beaconTone, emissive: beaconTone, emissiveIntensity: 1 });
    const beaconB = beaconA.clone();
    const beaconsLive = !dead && a.state !== 'still';
    const dark = s.material('#2b2e30', { roughness: 0.6, metalness: 0.4 });
    const hazardMat = new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.7 });

    // Gantry towers flanking the pad, with docking arms.
    const engaged = a.state === 'eve' || a.state === 'repair' || a.state === 'still';
    const sparks: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const tx = sx * 7.0, tz = -8.2, th = 10.2;
      lattice(tx, tz, 1.4, th, steel);
      block([1.9, 0.14, 1.9], [tx, th + 0.07, tz], frame);
      for (const [arm, len] of [[7.0, 1], [3.8, 0.8]] as const) {
        const end: V = engaged ? [sx * mix(7, 3.9, len), arm, mix(tz, -6.3, len)] : [tx + sx * 3 * len, arm, tz - 0.3];
        const from: V = [tx - sx * 0.5 * (engaged ? 1 : -1), arm, tz + (engaged ? 0.6 : 0)];
        beam(from, end, 0.3, 0.3, steel); beam([tx, arm + 2.2, tz], [mix(from[0], end[0], 0.8), arm + 0.15, mix(from[2], end[2], 0.8)], 0.08, 0.08, frame);
        block([1.5, 0.1, 1.3], [end[0], arm + 0.2, end[2]], frame, sx * 0.5);
        for (const o of [-0.6, 0.6]) beam([end[0] + o, arm + 0.25, end[2] + 0.55], [end[0] + o, arm + 1.25, end[2] + 0.55], 0.05, 0.05, '#e8b21c');
        beam([end[0] - 0.65, arm + 1.25, end[2] + 0.55], [end[0] + 0.65, arm + 1.25, end[2] + 0.55], 0.05, 0.05, '#e8b21c');
        // Umbilicals hanging off the arm end.
        const cables = 1 + Math.round(mood.density * 2);
        for (let i = 0; i < cables; i++) { const cx = end[0] - sx * (0.3 + i * 0.25), drop = 1.2 + random() * 1.6; tube(R, [[end[0], arm, end[2]], [cx, arm - drop * 0.7, end[2] + 0.2 + jit(0.2)], [cx - sx * 0.25, arm - drop, end[2] + 0.4 + jit(0.3)]], 0.05, dark); }
        if (a.state === 'repair' && sx < 0 && arm > 5) for (let i = 0; i < 7; i++) { const sp = ball(R, [0.07, 0.07, 0.07], [end[0] + 0.9 + jit(0.5), arm - 0.6 + jit(0.7), end[2] + 0.7 + jit(0.4)], new THREE.MeshStandardMaterial({ color: '#fff3c2', emissive: '#ffb640', emissiveIntensity: 3 }), 6); sp.castShadow = false; sparks.push(sp); }
      }
      box(R, [1.1, 0.55, 0.3], [tx - sx * 0.2, th + 0.5, tz + 0.75], dead ? lampOff : lampOn, [0.5, -sx * 0.5, 0]);
      cyl(R, 0.16, 0.2, 0.28, [tx, th + 0.28, tz - 0.5], beaconsLive ? (sx < 0 ? beaconA : beaconB) : lampOff, [0, 0, 0], 10);
      box(R, [0.16, 1.6, 1.42], [tx - sx * 0.72, 1.1, tz], hazardMat);
    }
    // Door-frame beacons and a signal mast.
    for (const sx of [-1, 1]) cyl(R, 0.2, 0.24, 0.32, [sx * (DW + 0.35), DH + 0.9, -HD + 0.42], beaconsLive ? (sx < 0 ? beaconB : beaconA) : lampOff, [Math.PI / 2, 0, 0], 10);
    beam([8.1, 0, -10.3], [8.1, 3.4, -10.3], 0.16, 0.16, frame);
    const lit = { eve: 1, still: -1, scramble: 0, repair: 0, abandoned: -1 }[a.state];
    ['#ff3b2a', '#ffae1a', '#4be06a'].forEach((tone, i) => ball(R, [0.2, 0.2, 0.2], [8.1, 3.3 - i * 0.5, -10.1], i === lit ? new THREE.MeshStandardMaterial({ color: tone, emissive: tone, emissiveIntensity: 1.6 }) : new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).multiplyScalar(0.3), roughness: 0.4 }), 10));

    // Overhead travelling crane.
    const railY = 11.0;
    beam([-HW + 0.6, railY, -HD], [-HW + 0.6, railY, dead ? 4 : HD], 0.4, 0.55, steel);
    for (let z = -9; z <= 9; z += 4.5) if (!dead || z < 4) beam([-HW, railY - 1.2, z], [-HW + 0.7, railY - 0.3, z], 0.2, 0.2, frame);
    beam([HW - 0.6, railY, -HD], [HW - 0.6, railY, 0.6], 0.4, 0.55, steel);
    lattice(HW - 0.6, -HD + 0.7, 0.9, railY - 0.3, frame); lattice(HW - 0.6, -0.6, 0.9, railY - 0.3, frame);
    if (dead) { beam([-HW + 0.6, railY, 4], [-HW + 2.4, 0.2, 9.6], 0.4, 0.55, steel); block([1.6, 0.3, 0.5], [-HW + 3.4, 0.15, 9.2], steel, 0.7, 0.1); }
    const bz = -4.3 + jit(0.3), tx = (random() < 0.5 ? -1 : 1) * mix(5.7, 6.4, random());
    for (const o of [-0.65, 0.65]) beam([-HW + 0.4, railY + 0.75, bz + o], [HW - 0.4, railY + 0.75, bz + o], 0.3, 0.7, steel);
    for (const sx of [-1, 1]) { block([0.9, 0.6, 2.6], [sx * (HW - 0.6), railY + 0.55, bz], frame); block([0.2, 0.9, 2.4], [sx * (HW - 1.15), railY + 0.75, bz], '#1d1d1b'); }
    block([2.0, 0.7, 1.9], [tx, railY + 0.6, bz], frame);
    const swing = group(R, [tx, railY + 0.25, bz]);
    const liveryMat = s.material(pal.crate, { roughness: 0.7, metalness: 0.2 });
    const steelMat = s.material('#8b9296', { roughness: 0.35, metalness: 0.8 });
    const drop = a.crane === 'hook' ? (dead ? 1.2 : mix(2, 4, random())) : a.crane === 'banner' ? 0.9 : 2.3;
    for (const o of [-0.2, 0.2]) rod(swing, [o, 0, 0], [o, -drop, 0], 0.03, dark, 5);
    box(swing, [0.7, 0.5, 0.4], [0, -drop - 0.25, 0], new THREE.MeshStandardMaterial({ color: '#e8b21c', roughness: 0.6 }));
    add(swing, new THREE.TorusGeometry(0.22, 0.07, 6, 12, Math.PI * 1.4), steelMat, [0, -drop - 0.72, 0], [0, 0, -Math.PI * 0.7]);
    const hookY = -drop - 0.9;
    const sling = (w: number, d: number, y: number) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(swing, [0, hookY + 0.1, 0], [sx * w, y, sz * d], 0.022, dark, 4); };
    if (a.crane === 'plate') {
      sling(1.5, 0.05, hookY - 1.1);
      const plate = box(swing, [3.4, 2.5, 0.22], [0, hookY - 2.3, 0], liveryMat, [0.06, jit(0.4), 0]);
      box(plate, [3.4, 0.4, 0.24], [0, -0.9, 0], hazardMat); box(plate, [0.9, 0.9, 0.3], [0.8, 0.3, 0], s.material('#3a3d3f'));
    } else if (a.crane === 'crate') {
      sling(1.1, 0.7, hookY - 1.0);
      const cr = box(swing, [2.4, 1.5, 1.6], [0, hookY - 1.75, 0], liveryMat, [0, jit(0.5), 0]);
      for (const y of [-0.55, 0.55]) box(cr, [2.46, 0.12, 1.66], [0, y, 0], dark);
      const tag = paint(256, 128, (ctx, w, h) => { ctx.fillStyle = '#f1ecdc'; ctx.fillRect(0, 0, w, h); stencil(ctx, 'AMMUNITION', w / 2, 40, 40, '#1d1d1b', 'center', w - 20); stencil(ctx, '30 MM  HE', w / 2, 92, 34, '#b3261e', 'center', w - 20); });
      add(cr, new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.8 }), [0, 0, 0.81]).castShadow = false;
    } else if (a.crane === 'core') {
      sling(0.9, 0.9, hookY - 0.9);
      const g = group(swing, [0, hookY - 2.3, 0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, [sx * 0.9, -1.4, sz * 0.9], [sx * 0.9, 1.4, sz * 0.9], 0.05, steelMat, 5);
      for (const y of [-1.4, 1.4]) add(g, new THREE.TorusGeometry(1.27, 0.06, 5, 4), steelMat, [0, y, 0], [Math.PI / 2, 0, Math.PI / 4]);
      cyl(g, 0.75, 0.75, 2.4, [0, 0, 0], s.material('#b9bfc2', { metalness: 0.7, roughness: 0.3 }), [0, 0, 0], 20);
      const glow = new THREE.Color().setHSL(mix(0.52, 0.06, mood.warmth), 0.9, 0.6);
      for (const y of [-0.7, 0, 0.7]) cyl(g, 0.78, 0.78, 0.2, [0, y, 0], new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: dead ? 0.1 : 1.6 }), [0, 0, 0], 20);
      cyl(g, 0.5, 0.75, 0.4, [0, 1.4, 0], dark, [0, 0, 0], 16); cyl(g, 0.75, 0.5, 0.4, [0, -1.4, 0], dark, [0, 0, 0], 16);
    } else if (a.crane === 'arm') {
      const g = group(swing, [0, hookY, 0], [0, jit(0.6), 0.08]); g.scale.setScalar(0.8);
      rod(g, [0, 0.1, 0], [0, -0.5, 0], 0.03, dark, 4);
      cyl(g, 0.5, 0.5, 0.9, [0, -0.9, 0], steelMat, [Math.PI / 2, 0, 0], 14);
      box(g, [0.9, 2.2, 1.0], [0, -2.2, 0], liveryMat); box(g, [1.0, 0.5, 1.1], [0, -1.7, 0], hazardMat);
      cyl(g, 0.42, 0.42, 1.1, [0, -3.5, 0], steelMat, [Math.PI / 2, 0, 0], 14);
      box(g, [1.1, 0.8, 1.1], [0, -4.1, 0], liveryMat);
      for (let i = 0; i < 4; i++) box(g, [0.22, 0.75, 0.3], [-0.42 + i * 0.28, -4.8, 0.3], dark, [0.5 + jit(0.2), 0, 0]);
      box(g, [0.24, 0.6, 0.3], [0.5, -4.7, -0.3], dark, [-0.6, 0, 0]);
    } else if (a.crane === 'banner') {
      const cloth = paint(512, 640, (ctx, w, h) => { ctx.fillStyle = a.owner === 'ceremonial' ? '#6d2a30' : a.owner === 'corporate' ? '#f4f5f4' : a.owner === 'rebel' ? '#1f2224' : '#33452f'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = pal.accent; ctx.fillRect(0, 0, w, 26); ctx.fillRect(0, h - 26, w, 26); emblem(ctx, a.owner, w / 2, h * 0.45, w * 0.33, random); for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(0,0,0,${0.05 + (i % 2) * 0.06})`; ctx.fillRect(i * w / 8, 0, w / 16, h); } });
      const flag = add(R, new THREE.PlaneGeometry(5.2, 6.5, 8, 1), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9, side: THREE.DoubleSide }), [-tx, railY - 3.1, bz + 0.7]);
      const pos = flag.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.4) * 0.14); flag.geometry.computeVertexNormals();
      rod(R, [-tx - 2.7, railY + 0.2, bz + 0.7], [-tx + 2.7, railY + 0.2, bz + 0.7], 0.05, dark, 6);
    }

    // Catwalk along the left wall with a control booth, stairs and service pipes.
    const cy = 5.4, cx0 = -HW, cx1 = -HW + 1.6;
    block([1.6, 0.14, 17], [(cx0 + cx1) / 2, cy, -2.5], frame);
    for (let z = -10.5; z <= 6; z += 2.75) { beam([cx1, cy, z], [cx1, cy + 1.1, z], 0.06, 0.06, '#e8b21c'); beam([cx0, cy - 1.5, z], [cx1, cy - 0.05, z], 0.1, 0.1, frame); }
    if (!dead) beam([cx1, cy + 1.1, -10.5], [cx1, cy + 1.1, 6], 0.06, 0.06, '#e8b21c'); else { beam([cx1, cy + 1.1, -10.5], [cx1, cy + 1.1, -1], 0.06, 0.06, '#e8b21c'); beam([cx1, cy + 1.1, -1], [cx1 + 0.8, cy + 0.3, 3], 0.06, 0.06, '#e8b21c'); }
    beam([cx1, cy + 0.55, -10.5], [cx1, cy + 0.55, 6], 0.04, 0.04, '#e8b21c');
    for (const x of [cx0 + 0.25, cx1 - 0.1]) beam([x, cy, 6], [x, 0.1, 10.6], 0.08, 0.28, frame);
    for (let i = 1; i < 14; i++) block([1.2, 0.05, 0.3], [(cx0 + cx1) / 2 + 0.05, cy - i * (cy / 14), 6 + i * (4.6 / 14)], '#3a3d3f');
    beam([cx1 - 0.1, cy + 1.1, 6], [cx1 - 0.1, 1.1, 10.6], 0.05, 0.05, '#e8b21c');
    block([1.4, 2.5, 3.6], [cx0 + 0.75, cy + 1.32, -8.4], pal.low);
    box(R, [0.06, 0.9, 2.8], [cx0 + 1.47, cy + 1.6, -8.4], dead ? lampOff : new THREE.MeshStandardMaterial({ color: '#bfe6ff', emissive: '#9fd4ff', emissiveIntensity: a.state === 'still' ? 0.35 : 1 }));
    for (const [y, r, c] of [[8.2, 0.16, '#b3261e'], [8.75, 0.11, '#3d6f9a'], [9.2, 0.2, '#c9cdd0']] as const) cyl(R, r, r, HD * 2, [-HW + 0.3 + r, y, 0], s.material(c, { metalness: 0.3 }), [Math.PI / 2, 0, 0], 10).castShadow = false;
    // Wall floodlights.
    let lone = 0;
    for (let i = 0; i < 4; i++) { const on = !dead && (a.state !== 'still' || i === 2) && random() > mood.wear * 0.4; if (on) lone++; box(R, [0.3, 0.5, 1.0], [-HW + 0.4, 10.1, -7.5 + i * 5], on ? lampOn : lampOff, [0, 0, -0.5]); }
    // Extractor fan.
    const fan = group(R, [-HW + 0.12, 9.6, 8.6], [0, Math.PI / 2, 0]);
    add(R, new THREE.TorusGeometry(1.0, 0.1, 6, 20), dark, [-HW + 0.15, 9.6, 8.6], [0, Math.PI / 2, 0]);
    for (let i = 0; i < 5; i++) box(fan, [0.3, 0.92, 0.04], [Math.sin(i * 1.2566) * 0.46, Math.cos(i * 1.2566) * 0.46, 0], steelMat, [0.3, 0, -i * 1.2566]);
    // Ceremonial bays hang banners down the left wall.
    if (a.owner === 'ceremonial') for (const z of [-3, 2.5]) { box(R, [0.04, 3.4, 1.5], [-HW + 0.05, 10.2 - 1.7, z], new THREE.MeshStandardMaterial({ color: '#6d2a30', roughness: 0.9 })).castShadow = false; box(R, [0.05, 0.25, 1.5], [-HW + 0.06, 7.0, z], new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.4, metalness: 0.7 })).castShadow = false; }

    // ---- Stores and state dressing, kept to the strips the cast never stands on.
    const drums: { at: V; size: number; color: string }[] = [];
    const strip = (i: number): [number, number] => {
      const zone = i % 4;
      if (zone === 0) return [mix(-HW + 2.4, -8.6, random()), mix(-10.2, -9.4, random())];
      if (zone === 1) return [mix(8.9, HW - 2, random()), mix(-10.2, -9.2, random())];
      if (zone === 2) return [mix(-HW + 2.1, -HW + 3.2, random()), mix(-8, 4.5, random())];
      return [mix(HW - 2.6, HW - 1.7, random()), mix(-8, 8, random())];
    };
    const tints = [pal.crate, pal.crate, '#7b6a4a', '#4a5a66', pal.accent];
    const stores = Math.round(mix(3, 20, mood.density)) + (a.state === 'eve' ? 4 : 0);
    const sheets: THREE.Mesh[] = [];
    for (let i = 0; i < stores; i++) {
      const [x, z] = strip(i), ry = jit(0.3);
      if (i % 3 === 2) { drums.push({ at: [x, 0.45, z], size: 1, color: ['#2f5f7c', '#a4432c', '#d6d2c4', '#3d4a3a'][Math.floor(random() * 4)] }); if (random() < 0.5) drums.push({ at: [x + 0.65, 0.45, z + jit(0.2)], size: 1, color: '#2f5f7c' }); continue; }
      const w = 1.1 + random() * 0.9, h = 0.7 + random() * 0.5, d = 0.9 + random() * 0.4, c = tints[Math.floor(random() * tints.length)];
      block([w, h, d], [x, h / 2, z], c, ry); block([w + 0.04, 0.08, d + 0.04], [x, h * 0.75, z], '#2b2e30', ry);
      const up = random() < 0.5 + mood.density * 0.3;
      if (up) block([w * 0.8, h * 0.8, d * 0.9], [x + jit(0.1), h + h * 0.4, z], tints[Math.floor(random() * tints.length)], ry + jit(0.2));
      if (a.state === 'still' && i % 2 === 0) { const sh = ball(R, [w * 0.85, (up ? h * 1.9 : h * 1.15), d * 0.95], [x, 0, z], new THREE.MeshStandardMaterial({ color: '#d8d3c2', roughness: 1 }), 10); sheets.push(sh); }
    }
    if (a.state === 'eve') {
      // Ammunition belts of shells stood ready and hoses run out to the towers.
      for (let i = 0; i < 9; i++) cyl(R, 0.13, 0.13, 0.9, [9.2 + i * 0.34, 0.45, -8.9], new THREE.MeshStandardMaterial({ color: '#c9a246', roughness: 0.3, metalness: 0.8 }), [0, 0, 0], 8);
      block([3.3, 0.12, 0.5], [10.55, 0.06, -8.9], '#3a3d3f');
      for (let i = 0; i < 2; i++) tube(R, [[-HW + 0.6, 1.2 + i * 0.3, -9.4 + i * 0.4], [-HW + 1.6, 0.12, -9.2 + i * 0.5], [-10.5, 0.08, -8.9 + jit(0.5)], [-8.6, 0.08, -9.3 + jit(0.3)], [-7.7, 0.4, -8.4], [-7.5, 2.4, -8.3]], 0.09, s.material(i ? '#2b2e30' : '#b3261e'));
    } else if (a.state === 'repair') {
      for (let i = 0; i < 3; i++) block([2.4 + random(), 2.6 + random() * 0.8, 0.18], [9.3 + i * 1.5, 1.4, -10.2 + i * 0.12], i % 2 ? pal.crate : '#9c4a35', 0, 0);
      lattice(-10.6, -9.4, 1.5, 4.2, '#9aa0a3'); block([1.9, 0.1, 1.9], [-10.6, 4.25, -9.4], '#b08a55');
      for (let i = 0; i < 5; i++) block([0.5 + random() * 0.6, 0.06, 0.3 + random() * 0.5], [mix(HW - 2.8, HW - 1.6, random()), 0.03, mix(-6, 6, random())], '#8b9296', random() * 3);
    } else if (dead) {
      const vine = s.material('#4f7040', { roughness: 1 });
      for (let i = 0; i < 7; i++) { const x = mix(-DW - 0.5, DW + 0.5, random()), l = 2 + random() * 5; tube(R, [[x, DH + 0.2, -HD + 0.3], [x + jit(0.4), DH - l * 0.5, -HD + 0.45], [x + jit(0.8), DH - l, -HD + 0.4]], 0.05 + random() * 0.04, vine); }
      const leaves: { at: V; size: number; color: string }[] = [];
      for (let i = 0; i < 46; i++) { const [x, z] = strip(i); leaves.push({ at: [x + jit(0.6), 0.1 + random() * 0.5, z + jit(0.5)], size: 0.3 + random() * 0.5, color: random() < 0.5 ? '#5e8548' : '#476a3a' }); }
      for (let i = 0; i < 12; i++) leaves.push({ at: [mix(-DW, DW, random()), 0.15, -HD + 0.3 + random() * 0.8], size: 0.3 + random() * 0.5, color: '#6f9454' });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), leaves);
      for (let i = 0; i < 8; i++) block([0.6 + random() * 1.4, 0.12, 0.2 + random() * 0.3], [mix(-HW + 2, -HW + 3.4, random()), 0.08, mix(-7, 9, random())], steel, random() * 3, jit(0.1));
    }
    if (a.state === 'still') {
      // The one work lamp left burning, on a tripod by the cut edge.
      const lx = HW - 2.2, lz = 9.6;
      for (let i = 0; i < 3; i++) rod(R, [lx, 1.6, lz], [lx + Math.cos(i * 2.1) * 0.5, 0, lz + Math.sin(i * 2.1) * 0.5], 0.025, dark, 5);
      rod(R, [lx, 1.6, lz], [lx, 2.1, lz], 0.025, dark, 5);
      box(R, [0.5, 0.36, 0.14], [lx, 2.2, lz], new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffd98a', emissiveIntensity: 2.2 }), [0.2, -2.3, 0]);
    }
    if (drums.length) { const dm = s.scatter(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 }), drums); dm.castShadow = true; }
    // Bollards along the open edge.
    for (let z = -9; z <= 9; z += 3) { block([0.22, 0.9, 0.22], [HW - 0.75, 0.45, z], '#e8b21c'); block([0.24, 0.2, 0.24], [HW - 0.75, 0.6, z], '#1d1d1b'); }

    const solid = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: mix(0.55, 0.9, mood.wear), metalness: 0.25 }), solids.length);
    const wearTint = new THREE.Color('#7d6a58');
    solids.forEach((entry, i) => { solid.setMatrixAt(i, entry.m); solid.setColorAt(i, new THREE.Color(entry.c).lerp(wearTint, mood.wear * 0.3 * random())); });
    solid.castShadow = solid.receiveShadow = true;
    R.add(solid);

    // Snow or dust drifting in through the gap.
    const flakes = a.outside === 'snow' || a.outside === 'desert' ? Math.round(mix(40, 130, mood.energy)) : 0;
    const drift: { p: THREE.Vector3; v: number }[] = [];
    const gap = Math.max(openL + openR, 0.8);
    const flakeMesh = flakes ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: a.outside === 'snow' ? '#ffffff' : '#d9bb86' }), flakes) : null;
    const scratch = new THREE.Matrix4();
    const settle = () => { if (!flakeMesh) return; drift.forEach((f, i) => { scratch.makeScale(0.05, 0.05, 0.05).setPosition(f.p); flakeMesh.setMatrixAt(i, scratch); }); flakeMesh.instanceMatrix.needsUpdate = true; };
    if (flakeMesh) {
      for (let i = 0; i < flakes; i++) { const depth = random() ** 1.6; drift.push({ p: new THREE.Vector3(mix(-openL, openR, random()) + jit(1 + depth * 3), random() * mix(9, 4, depth), -HD + depth * 11), v: 0.5 + random() }); }
      settle(); R.add(flakeMesh);
    }

    // ---- People, for scale. They are stood in place once the cast is known.
    const people = group(R);
    const person = (suit: string, pilot: boolean) => {
      const g = group(people);
      const cloth = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.85 });
      box(g, [0.34, 0.86, 0.22], [0, 0.43, 0], cloth); box(g, [0.46, 0.62, 0.26], [0, 1.16, 0], cloth);
      ball(g, [0.12, 0.13, 0.12], [0, 1.62, 0], new THREE.MeshStandardMaterial({ color: ['#e2b48c', '#c68a5e', '#8a5a3a', '#f0cdb0'][Math.floor(random() * 4)], roughness: 0.8 }), 10);
      if (pilot) ball(g, [0.15, 0.15, 0.16], [0.33, 0.95, 0.05], new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.3 }), 10);
      else cyl(g, 0.13, 0.13, 0.07, [0, 1.75, 0], new THREE.MeshStandardMaterial({ color: pal.accent, roughness: 0.6 }), [0, 0, 0], 10);
      return g;
    };
    const overalls = ['#4d6a86', '#6b7075', '#3f5e52', pal.suit];
    const headcount = a.crew === 'nobody' ? 0 : a.crew === 'pilot' ? 1 : a.crew === 'parade' ? 4 + Math.round(mood.density * 3) : 3 + Math.round(mood.density * 5);
    const crew = Array.from({ length: headcount }, (_u, i) => person(a.crew === 'mechanics' ? overalls[i % overalls.length] : pal.suit, a.crew !== 'mechanics'));
    const stand = (g: THREE.Group, x: number, y: number, z: number, lookX: number, lookZ: number) => { g.position.set(x, y, z); g.rotation.y = Math.atan2(lookX - x, lookZ - z); };

    const camera = world.camera as THREE.OrthographicCamera, key = world.keyLight!;
    key.intensity = a.state === 'still' ? 1.7 : dead ? 2.1 : a.outside === 'night' || a.outside === 'orbit' ? 2.3 : 2.8;
    const yawR = yaw * Math.PI / 180, pitchR = pitch * Math.PI / 180;
    const show = (h: number) => (h < 1.2 ? 1.2 * Math.sqrt(Math.max(h, 0.02) / 1.2) : Math.min(h, 9.2));
    world.capacity = OFFSETS.length + 1;
    world.place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [];
      let heroR = 2.5, heroH = 5, k = 0.8;
      items.forEach((item, index) => {
        if (index === 0) {
          const scale = Math.min(Math.max(show(item.height), 3.2) / Math.max(item.height, 0.02), 5.4 / Math.max(item.radius, 0.02));
          heroR = item.radius * scale; heroH = item.height * scale;
          k = Math.min(1, Math.max(0.6, Math.max(heroH, heroR * 2.2) / 8));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(HERO[0], 0, HERO[2]);
          item.holder.rotation.y = yawR * 0.45;
        } else {
          const [ox, oz, room] = OFFSETS[(index - 1) % OFFSETS.length];
          const tall = Math.max(1.5, Math.min(show(item.height), Math.max(heroH * 1.5, 3.4)));
          const scale = Math.min(tall / Math.max(item.height, 0.02), room * k / Math.max(item.radius, 0.02));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(HERO[0] + ox * k, 0, HERO[2] + oz * k);
          item.holder.rotation.y = yawR * 0.5 - ox * 0.035 + (random() - 0.5) * 0.3;
        }
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      const reach = Math.max(heroR + 2.2, 4.2 * k + 1.5);
      boxes.push(new THREE.Box3(new THREE.Vector3(-reach, 0, HERO[2] - reach), new THREE.Vector3(reach, Math.max(heroH * 1.25, 4.5), HERO[2] + reach)));
      // The door stays in frame: it is what makes the place.
      boxes.push(new THREE.Box3(new THREE.Vector3(-5.5, 0, -HD - 0.2), new THREE.Vector3(5.5, 9.4, -HD)));

      // Crew take their places around the hero.
      const front = HERO[2] + heroR + 1.3;
      crew.forEach((g, i) => {
        if (a.crew === 'pilot') stand(g, heroR * 0.55 + 0.8, 0, front + 0.3, 0, HERO[2]);
        else if (a.crew === 'parade') stand(g, (i - (crew.length - 1) / 2) * 0.95 - 0.4, 0, front, (i - (crew.length - 1) / 2) * 0.95 - 0.4, HERO[2]);
        else if (i === 0) stand(g, -heroR * 0.6 - 0.9, 0, front, 0, HERO[2]);
        else if (i === 1) stand(g, -HW + 0.9, cy + 0.07, -4 + (random() - 0.5) * 6, 0, HERO[2]);
        else if (i === 2) stand(g, 7 + 1.6, 0, -8.4, 7, -8.2);
        else if (i === 3) stand(g, mix(-openL, openR, 0.5) + 0.4, 0, -HD + 0.9, 0, -30);
        else { const [x, z] = strip(i); stand(g, x + (x < 0 ? 1.1 : -1.1), 0, z + (z < -9 ? 1.2 : 0), x, z); }
      });
      people.updateMatrixWorld(true);
      if (a.crew === 'pilot' || a.crew === 'parade') crew.forEach((g) => boxes.push(visibleBounds(g)));

      const bounds = boxes.reduce((sum, b) => sum.union(b), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yawR) * Math.cos(pitchR), Math.sin(pitchR), Math.cos(yawR) * Math.cos(pitchR));
      camera.position.copy(centre).addScaledVector(direction, 90);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      for (const b of boxes) for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        projection.expandByPoint(new THREE.Vector2(p.x, p.y));
      }
      const middle = projection.getCenter(new THREE.Vector2()), size = projection.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y, 9) * 0.6;
      camera.translateX(middle.x);
      camera.translateY(middle.y + extent * 0.12);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.near = 0.1; camera.far = 260;
      camera.updateProjectionMatrix();
      const span = extent * 2.6;
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(-9 + mood.daylight * 14, 12, 9).normalize().multiplyScalar(60));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6;
      shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1; shadow.far = 160;
      shadow.updateProjectionMatrix();
    };

    const spin = mix(0.3, 2.6, mood.energy);
    world.update = (dt, time) => {
      fan.rotation.z += dt * (dead ? 0.08 : spin * 2);
      if (beaconsLive) {
        const rate = a.state === 'scramble' ? mix(2.5, 7, mood.energy) : mix(0.6, 2.2, mood.energy);
        const phase = Math.sin(time * rate);
        beaconA.emissiveIntensity = 0.25 + Math.max(0, phase) * 2.2; beaconB.emissiveIntensity = 0.25 + Math.max(0, -phase) * 2.2;
      }
      swing.rotation.z = Math.sin(time * 0.7) * mix(0.004, 0.035, mood.energy);
      swing.rotation.x = Math.sin(time * 0.53 + 1) * mix(0.003, 0.025, mood.energy);
      sparks.forEach((sp, i) => sp.scale.setScalar(0.07 * (0.3 + Math.abs(Math.sin(time * (9 + i * 3.1) + i)) * 1.6)));
      if (flakeMesh) {
        for (const f of drift) {
          f.p.y -= dt * f.v * (a.outside === 'snow' ? 0.8 : 0.25) * (0.5 + mood.energy);
          f.p.z += dt * f.v * (0.6 + mood.energy * 2.2);
          f.p.x += Math.sin(time * 0.8 + f.v * 9) * dt * 0.4;
          if (f.p.y < 0.03 || f.p.z > 2) f.p.set(-openL + (openL + openR) * ((f.v * 7.3 + time * 0.13) % 1) + Math.sin(f.v * 40) * Math.min(gap, 2) * 0.3, 2 + ((f.v * 3.7 + time * 0.31) % 1) * 7, -HD + 0.2);
        }
        settle();
      }
    };
    void lone; void sheets; void clamp01;
    return world;
  },
});
