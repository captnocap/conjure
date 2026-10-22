import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Inst = { p: V3; s: V3; c: THREE.ColorRepresentation; r?: V3 };

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const KINDS = {
  parish: { lower: '#7f9a80', upper: '#ece4cc', wood: '#6a4a2e', sign: 'KITCHEN' },
  village: { lower: '#8fa3b0', upper: '#efe9d8', wood: '#8a6238', sign: 'TEAS' },
  mission: { lower: '#7a5a3c', upper: '#c3d0b6', wood: '#5a3e28', sign: 'KITCHEN' },
  club: { lower: '#7a3038', upper: '#e6d9bd', wood: '#4a2c1e', sign: 'BAR' },
  school: { lower: '#9fc0d0', upper: '#f0eee6', wood: '#b08a54', sign: 'SERVERY' },
} as const;

export default defineWorld({
  questions: {
    kind: choice('Whose hall is it?', {
      parish: 'A parish hall beside the church: sage green below the dado, cream above, a plain wooden cross and a hymn board.',
      village: 'A village hall: blue-grey and cream, a noticeboard thick with flyers, a shelf of tarnished trophies.',
      mission: 'A tin mission hall: dark boarding below, pale green tongue-and-groove above, GOD IS LOVE lettered over the stage.',
      club: 'The function room of a social club: maroon and nicotine cream, a dartboard, the hatch is a bar.',
      school: 'A school hall borrowed for the afternoon: gloss blue and white, wall bars and a basketball backboard.',
    }),
    stage: choice('What is happening on the little stage?', {
      closed: 'The curtains are drawn shut.',
      empty: 'The curtains are open on an upright piano and a stack of chairs.',
      lectern: 'The curtains are open on a lectern, a microphone and two pedestal flower arrangements: the tributes were read from here.',
      panto: 'The curtains are open on scenery left over from the pantomime: painted trees, a cardboard castle, a yellow sun. Nobody thought to close them.',
    }),
    curtain: choice('What colour are the stage curtains?', {
      red: 'Dusty red velvet.',
      green: 'Bottle green.',
      blue: 'Royal blue.',
      gold: 'Faded gold.',
    }),
    hatch: choice('How is the serving hatch?', {
      open: 'Shutter right up, the kitchen lit, an urn and ranks of cups on the counter.',
      half: 'Shutter half down, the washing-up being done behind it.',
      closed: 'Shutter down. The kitchen has finished.',
    }),
    weather: choice('What is the afternoon doing outside the high windows?', {
      grey: 'Flat grey: blank white windows, no shadows.',
      rain: 'Raining: streaked panes, the room dim, the strip lights on.',
      sun: 'A late shaft of sun has broken through and lies in long bars across the floor.',
      dusk: 'Already getting dark: navy windows, the strip lights doing all the work.',
    }),
    floor: choice('What state is the floor in?', {
      clean: 'Swept and bare, the court lines bright.',
      scuffed: 'Scuffed by chair legs, with crumbs, a dropped napkin and a paper cup on its side.',
      wet: 'A trail of wet footprints and umbrella drips leading in from the door.',
      petals: 'Scattered with petals trodden in from the wreaths.',
      cleared: 'Being cleared: folded trestle tables leaning on the wall, a wide broom, a full black bin bag.',
    }),
    dressing: choice('What else is on the walls?', {
      none: 'Nothing more.',
      clock: 'A big plain clock and a fire notice.',
      bunting: 'A string of faded bunting left up from some happier occasion.',
      flowers: 'Tall funeral flower arrangements on pedestals either side of the stage and a wreath on its front.',
      paintings: 'A row of children\'s paintings stuck up at child height.',
      portraits: 'A row of framed photographs of past committees, all looking down.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const K = KINDS[a.kind];
    const W = 14, D = 11, WH = 5.4;
    const background = { grey: '#dedfd9', rain: '#d0d3d2', sun: '#e6e2d4', dusk: '#cbc8c6' }[a.weather];
    const floorBase = new THREE.Color('#b98a54').lerp(new THREE.Color(mood.warmth > 0.5 ? '#c98f4a' : '#a89274'), Math.abs(mood.warmth - 0.5) * 0.9);
    const { art: s, world } = diorama(context, {
      background, floor: `#${floorBase.clone().multiplyScalar(0.8).getHexString()}`, width: W, depth: D, maxHeight: 2.9, radius: 1.3, pitch: 31, yaw: 30,
      slots: [[0.4, 1.7], [-5.1, -1.5, 0, 0.9], [4.7, 2.6, 0, 0.9], [-2.9, -2.1, 0, 0.9], [-5.1, 2.5, 0, 0.9], [3.7, -2.3, 0, 0.9]],
    });
    const boxes: Inst[] = [];
    const box = (p: V3, size: V3, c: THREE.ColorRepresentation, r?: V3) => boxes.push({ p, s: size, c, r });

    // ---- light: a grey afternoon is flat, not dark ----
    const hemi = s.root.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    const key = world.keyLight!;
    const lit = a.weather === 'rain' || a.weather === 'dusk';
    key.intensity = { grey: 1.5, rain: 1.15, sun: 2.7, dusk: 1.0 }[a.weather];
    if (hemi) hemi.intensity = { grey: 1.75, rain: 1.6, sun: 1.35, dusk: 1.55 }[a.weather];
    if (a.weather !== 'sun') key.color.lerp(new THREE.Color(a.weather === 'dusk' ? '#ffe2b0' : '#dfe6ee'), 0.7);

    // ---- parquet with the badminton court ----
    const PX = 1024 / W, CH = Math.round(D * PX);
    const parquet = canvasTexture(1024, CH, (ctx) => {
      const base = floorBase;
      ctx.fillStyle = base.getStyle(); ctx.fillRect(0, 0, 1024, CH);
      const cell = 30;
      for (let cy = 0; cy < CH / cell; cy++) for (let cx = 0; cx < 1024 / cell; cx++) {
        const across = (cx + cy) % 2 === 0;
        for (let k = 0; k < 4; k++) {
          const tone = base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.085);
          ctx.fillStyle = tone.getStyle();
          if (across) ctx.fillRect(cx * cell, cy * cell + k * cell / 4, cell - 0.6, cell / 4 - 0.6);
          else ctx.fillRect(cx * cell + k * cell / 4, cy * cell, cell / 4 - 0.6, cell - 0.6);
        }
      }
      const X = (x: number) => (x + W / 2) * PX, Z = (z: number) => (z + D / 2) * PX;
      const line = (x0: number, z0: number, x1: number, z1: number, colour: string, wpx = 4.5) => { ctx.strokeStyle = colour; ctx.lineWidth = wpx; ctx.beginPath(); ctx.moveTo(X(x0), Z(z0)); ctx.lineTo(X(x1), Z(z1)); ctx.stroke(); };
      // An older netball marking under the badminton court, mostly worn away.
      ctx.globalAlpha = 0.55 - mood.wear * 0.25;
      ctx.strokeStyle = '#d9b62a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(X(0.3), Z(0.9), 0.95 * PX, 0, Math.PI * 2); ctx.stroke();
      line(-6.6, -3.3, 6.8, -3.3, '#d9b62a', 4); line(-6.6, 5.1, 6.8, 5.1, '#d9b62a', 4);
      ctx.strokeStyle = '#3f7fb8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(X(-7), Z(0.9), 3.2 * PX, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.globalAlpha = 0.95 - mood.wear * 0.3;
      const x0 = -5.3, x1 = 5.9, z0 = -1.7, z1 = 3.5, white = a.floor === 'clean' ? '#fbfaf2' : '#efeadb';
      for (const [za, zb] of [[z0, z0], [z1, z1], [z0 + 0.38, z0 + 0.38], [z1 - 0.38, z1 - 0.38]]) line(x0, za, x1, zb, white);
      const net = (x0 + x1) / 2;
      for (const x of [x0, x1, x0 + 0.62, x1 - 0.62, net - 1.65, net + 1.65]) line(x, z0, x, z1, white);
      line(x0, (z0 + z1) / 2, net - 1.65, (z0 + z1) / 2, white); line(net + 1.65, (z0 + z1) / 2, x1, (z0 + z1) / 2, white);
      ctx.globalAlpha = 1;
      // Missing and replaced blocks.
      for (let i = 0; i < Math.round(mood.wear * 14); i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(60,40,25,0.55)' : 'rgba(225,190,140,0.6)'; const across = random() < 0.5; ctx.fillRect(Math.floor(rnd(0, 34)) * cell, Math.floor(rnd(0, CH / cell)) * cell, across ? cell : cell / 4, across ? cell / 4 : cell); }
      if (a.weather === 'sun') {
        for (const zw of [-3.9, -1.3, 1.3, 3.9]) {
          const g = ctx.createLinearGradient(X(-7), 0, X(0.5), 0); g.addColorStop(0, 'rgba(255,240,200,0.5)'); g.addColorStop(1, 'rgba(255,240,200,0.12)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(-6.6), Z(zw - 0.6)); ctx.lineTo(X(0.8), Z(zw + 1.1)); ctx.lineTo(X(0.8), Z(zw + 2.5)); ctx.lineTo(X(-6.6), Z(zw + 0.6)); ctx.fill();
        }
      }
      const scuffs = Math.round((a.floor === 'scuffed' ? 70 : a.floor === 'cleared' ? 40 : 8) + mood.wear * 50);
      for (let i = 0; i < scuffs; i++) { ctx.strokeStyle = random() < 0.6 ? 'rgba(240,225,200,0.4)' : 'rgba(40,30,25,0.3)'; ctx.lineWidth = rnd(1, 3); const x = rnd(0, 1024), y = rnd(0, CH), t = rnd(0, 6.28), l = rnd(10, 46); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(t) * l * 0.5 + rnd(-8, 8), y + Math.sin(t) * l * 0.5 + rnd(-8, 8), x + Math.cos(t) * l, y + Math.sin(t) * l); ctx.stroke(); }
      if (a.floor === 'scuffed') for (let i = 0; i < 500; i++) { ctx.fillStyle = pick(['rgba(240,220,170,0.9)', 'rgba(120,80,50,0.8)', 'rgba(250,245,235,0.9)']); const cx = rnd(0.2, 0.8) * 1024 + rnd(-200, 200), cy = rnd(0.3, 0.9) * CH; ctx.fillRect(cx, cy, rnd(1.5, 4), rnd(1.5, 4)); }
      if (a.floor === 'wet') {
        // Footprints come in from the door at the front right and wander to the middle.
        for (let trail = 0; trail < 4; trail++) {
          let x = rnd(5.2, 6.6), z = 5.3, heading = Math.atan2(rnd(-1.5, 2) - z, rnd(-3, 2.5) - x);
          for (let step = 0; step < 16; step++) {
            heading += rnd(-0.25, 0.25); x += Math.cos(heading) * 0.42; z += Math.sin(heading) * 0.42;
            const side = step % 2 ? 1 : -1, fx = x + Math.cos(heading + Math.PI / 2) * 0.12 * side, fz = z + Math.sin(heading + Math.PI / 2) * 0.12 * side;
            ctx.fillStyle = `rgba(50,45,45,${0.4 * (1 - step / 18)})`; ctx.beginPath(); ctx.ellipse(X(fx), Z(fz), 0.17 * PX, 0.07 * PX, heading, 0, 7); ctx.fill();
            if (random() < 0.5) { ctx.beginPath(); ctx.arc(X(fx + rnd(-0.3, 0.3)), Z(fz + rnd(-0.3, 0.3)), rnd(1.5, 5), 0, 7); ctx.fill(); }
          }
        }
      }
      if (a.floor === 'petals') for (let i = 0; i < 420; i++) { const t = random(); const x = mix(6, -1.5, t) + rnd(-1.6, 1.6) * (0.4 + t), z = mix(5, 0.5, t) + rnd(-1.4, 1.4) * (0.4 + t); ctx.fillStyle = pick(['rgba(252,250,244,0.95)', 'rgba(244,200,210,0.95)', 'rgba(250,240,200,0.95)', 'rgba(200,60,70,0.9)', 'rgba(110,140,80,0.8)']); ctx.beginPath(); ctx.ellipse(X(x), Z(z), rnd(2.5, 5), rnd(1.5, 3), rnd(0, 3), 0, 7); ctx.fill(); }
    });
    const boards = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: parquet, roughness: mix(0.38, 0.75, mood.wear) }), [0, 0.004, 0]);
    boards.rotation.x = -Math.PI / 2; boards.castShadow = false;

    // ---- walls ----
    const sat = (hex: string) => new THREE.Color(hex).offsetHSL(0, (mood.cheer - 0.5) * 0.16, (mood.cheer - 0.5) * 0.05 - mood.wear * 0.03);
    const upper = s.material(sat(K.upper), { roughness: 0.9 }), lower = s.material(sat(K.lower), { roughness: a.kind === 'school' ? 0.35 : 0.8 });
    const wood = s.material(K.wood, { roughness: 0.55 }), white = s.material('#f3f1ea'), dark = s.material('#2a2a2e');
    const HX0 = 2.4, HX1 = 5.4, HY0 = 1.6, HY1 = 3.0;
    s.box([HX0 + 7.3, WH, 0.3], [(HX0 - 7.3) / 2, WH / 2, -5.65], upper);
    s.box([7 - HX1, WH, 0.3], [(7 + HX1) / 2, WH / 2, -5.65], upper);
    s.box([HX1 - HX0, HY0, 0.3], [(HX0 + HX1) / 2, HY0 / 2, -5.65], upper);
    s.box([HX1 - HX0, WH - HY1, 0.3], [(HX0 + HX1) / 2, (WH + HY1) / 2, -5.65], upper);
    s.box([0.3, WH, D + 0.3], [-7.15, WH / 2, -0.15], upper);
    s.box([W, HY0, 0.04], [0, HY0 / 2, -5.49], lower); s.box([0.04, HY0, D], [-6.99, HY0 / 2, 0], lower);
    s.box([W, 0.09, 0.08], [0, HY0 + 0.045, -5.47], wood); s.box([0.08, 0.09, D], [-6.97, HY0 + 0.045, 0], wood);
    s.box([W, 0.22, 0.07], [0, 0.11, -5.47], wood); s.box([0.07, 0.22, D], [-6.97, 0.11, 0], wood);
    if (a.kind === 'mission') { for (let x = -6.8; x < 7; x += 0.36) box([x, HY0 / 2 + 0.1, -5.465], [0.025, HY0 - 0.2, 0.012], '#5a4028'); for (let z = -3.5; z < 5.5; z += 0.36) box([-6.965, HY0 / 2 + 0.1, z], [0.012, HY0 - 0.2, 0.025], '#5a4028'); }
    for (let i = 0; i < Math.round(mood.wear * 5); i++) { const patch = s.mesh(new THREE.CircleGeometry(1, 9), new THREE.MeshStandardMaterial({ color: '#8a7a5a', transparent: true, opacity: 0.22, depthWrite: false }), [rnd(-6, 1.8), rnd(4.2, 5.1), -5.495]); patch.scale.set(rnd(0.3, 0.8), rnd(0.2, 0.5), 1); patch.castShadow = false; }

    // ---- high windows on the long wall ----
    const arched = a.kind === 'parish' || a.kind === 'mission';
    const WW = 1.5, WHt = 2.1, WY = 2.75;
    const glass = canvasTexture(192, 300, (ctx) => {
      const sky = { grey: ['#f1f3f3', '#dfe4e6'], rain: ['#b9c2c8', '#9aa5ad'], sun: ['#fff6da', '#f6e2ae'], dusk: ['#3d4a68', '#27304a'] }[a.weather];
      const g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 192, 300);
      if (a.weather !== 'dusk') { ctx.fillStyle = a.weather === 'sun' ? 'rgba(120,130,90,0.25)' : 'rgba(110,120,120,0.28)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(rnd(0, 192), 300 - rnd(0, 50), rnd(30, 60), rnd(30, 70), 0, 0, 7); ctx.fill(); } }
      if (a.weather === 'rain') { ctx.strokeStyle = 'rgba(240,246,250,0.55)'; ctx.lineWidth = 1.5; for (let i = 0; i < 46; i++) { const x = rnd(0, 192), y = rnd(0, 280); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(-3, 3), y + rnd(14, 50)); ctx.stroke(); } }
      if (a.weather === 'dusk') { ctx.fillStyle = 'rgba(255,230,170,0.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(30 + i * 50, 40, 34, 7); }
      ctx.fillStyle = a.kind === 'school' ? '#e9eef0' : '#f5f3ec';
      for (const x of [0, 62, 126, 186]) ctx.fillRect(x, 0, 6, 300);
      for (const y of [0, 72, 148, 222, 294]) ctx.fillRect(0, y, 192, 6);
    });
    const paneShape = new THREE.Shape();
    paneShape.moveTo(-WW / 2, 0); paneShape.lineTo(WW / 2, 0); paneShape.lineTo(WW / 2, WHt - (arched ? WW / 2 : 0));
    if (arched) paneShape.absarc(0, WHt - WW / 2, WW / 2, 0, Math.PI, false); else paneShape.lineTo(-WW / 2, WHt);
    paneShape.lineTo(-WW / 2, 0);
    const paneGeometry = new THREE.ShapeGeometry(paneShape, 16);
    const puv = paneGeometry.getAttribute('uv'), ppos = paneGeometry.getAttribute('position');
    for (let i = 0; i < puv.count; i++) puv.setXY(i, ppos.getX(i) / WW + 0.5, ppos.getY(i) / WHt);
    const paneMaterial = new THREE.MeshStandardMaterial({ map: glass, emissiveMap: glass, emissive: '#ffffff', emissiveIntensity: { grey: 0.6, rain: 0.4, sun: 0.85, dusk: 0.3 }[a.weather], roughness: 0.2 });
    for (const z of [-3.9, -1.3, 1.3, 3.9]) {
      const pane = s.mesh(paneGeometry, paneMaterial, [-6.985, WY, z]); pane.rotation.y = Math.PI / 2; pane.castShadow = false;
      s.box([0.22, 0.09, WW + 0.3], [-6.9, WY - 0.045, z], white);
      for (const side of [-1, 1]) s.box([0.06, WHt - (arched ? WW / 2 : 0), 0.09], [-6.97, WY + (WHt - (arched ? WW / 2 : 0)) / 2, z + side * (WW / 2 + 0.045)], white);
      if (arched) { const arch = s.ring(WW / 2 + 0.045, 0.045, [-6.97, WY + WHt - WW / 2, z], white, Math.PI); arch.rotation.y = Math.PI / 2; }
      else s.box([0.06, 0.09, WW + 0.18], [-6.97, WY + WHt + 0.045, z], white);
    }
    // Cast-iron radiators along the same wall.
    for (const z of [0.45, 4.45]) { for (let i = 0; i < 9; i++) box([-6.8, 0.62, z - 0.44 + i * 0.11], [0.2, 1.0, 0.085], '#d9d5c8'); box([-6.8, 0.1, z - 0.4], [0.1, 0.2, 0.06], '#8a8a86'); box([-6.8, 0.1, z + 0.4], [0.1, 0.2, 0.06], '#8a8a86'); }
    // Strip lights high on both walls.
    const tube = new THREE.MeshStandardMaterial({ color: '#fbfbf4', emissive: lit ? '#fff3cf' : '#b9bcb4', emissiveIntensity: lit ? 1.5 : 0.15 });
    for (const x of [-4.2, 0.2, 4.6]) { s.box([2.2, 0.12, 0.16], [x, 5.02, -5.4], white); const t = s.box([2.0, 0.07, 0.07], [x, 4.95, -5.33], tube); t.castShadow = false; }

    // ---- the stage ----
    const SX0 = -6.4, SX1 = 0.4, SZ = -3.6, SH = 0.95, SC = (SX0 + SX1) / 2, SW = SX1 - SX0;
    s.box([SW, SH, SZ + 5.5], [SC, SH / 2, (SZ - 5.5) / 2], wood);
    s.box([SW, 0.05, SZ + 5.5 + 0.08], [SC, SH + 0.0, (SZ - 5.5) / 2 + 0.04], s.material('#3d2c20', { roughness: 0.6 }));
    for (let i = 0; i < 6; i++) box([SX0 + 0.6 + i * (SW - 1.2) / 5, SH / 2, SZ + 0.012], [SW / 6 - 0.22, SH - 0.3, 0.03], new THREE.Color(K.wood).multiplyScalar(1.22));
    for (let i = 0; i < 2; i++) s.box([0.36, SH * (2 - i) / 3, 1.2], [SX1 + 0.18 + i * 0.36, SH * (2 - i) / 6, -4.7], wood);
    const PT = 4.0;
    for (const x of [SX0 + 0.2, SX1 - 0.2]) s.box([0.4, PT - SH, 0.36], [x, (PT + SH) / 2, SZ - 0.22], upper);
    s.box([SW, 0.75, 0.36], [SC, PT + 0.375, SZ - 0.22], upper);
    s.box([SW + 0.1, 0.1, 0.42], [SC, PT + 0.78, SZ - 0.22], wood);
    const velvetHex = { red: '#8a2630', green: '#1f5a40', blue: '#254a9a', gold: '#b99646' }[a.curtain];
    const velvet = s.material(new THREE.Color(velvetHex).offsetHSL(0, -mood.wear * 0.15, 0), { roughness: 1, side: THREE.DoubleSide });
    const drape = (x0: number, x1: number, y0: number, y1: number, z: number, folds: number, amp: number) => {
      const w = x1 - x0, h = y1 - y0;
      const g = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round(folds * 8)), 4);
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w + 0.5, v = p.getY(i) / h + 0.5; p.setZ(i, Math.sin(u * folds * Math.PI * 2 + Math.sin(u * 7) * 0.8) * amp * (1.15 - v * 0.4)); }
      g.computeVertexNormals();
      return s.mesh(g, velvet, [(x0 + x1) / 2, (y0 + y1) / 2, z]);
    };
    const CX0 = SX0 + 0.4, CX1 = SX1 - 0.4, CZ = SZ - 0.3;
    drape(CX0, CX1, PT - 0.55, PT, CZ + 0.1, 16, 0.05);
    if (a.stage === 'closed') { drape(CX0, SC - 0.02, SH, PT - 0.3, CZ, 9, 0.07); drape(SC + 0.02, CX1, SH, PT - 0.3, CZ, 9, 0.07); }
    else { drape(CX0, CX0 + 0.95, SH, PT - 0.3, CZ, 6, 0.09); drape(CX1 - 0.95, CX1, SH, PT - 0.3, CZ, 6, 0.09); }
    const fairy: Inst[] = [];
    if (a.stage !== 'closed') {
      const backdrop = a.stage === 'panto' ? '#7fbfe0' : { parish: '#3a3f4a', village: '#4a3f3a', mission: '#3f4a40', club: '#2a2a30', school: '#4a4a52' }[a.kind];
      s.box([SW - 0.8, PT - SH, 0.05], [SC, (PT + SH) / 2, -5.46], s.material(backdrop, { roughness: 0.95 }));
      if (a.stage === 'empty') {
        const px = SC - 1.3, pz = -4.95, piano = s.material('#3a2418', { roughness: 0.35 });
        s.box([1.9, 1.55, 0.6], [px, SH + 0.775, pz], piano); s.box([1.9, 0.14, 0.4], [px, SH + 0.95, pz + 0.48], piano);
        s.box([1.7, 0.03, 0.26], [px, SH + 1.03, pz + 0.52], s.material('#f6f3ea')); for (const side of [-1, 1]) s.box([0.1, 0.9, 0.1], [px + side * 0.88, SH + 0.45, pz + 0.6], piano);
        s.box([0.7, 0.1, 0.4], [px, SH + 0.62, pz + 1.0], s.material('#6a2a30')); s.box([0.6, 0.6, 0.3], [px, SH + 0.3, pz + 1.0], piano);
        for (let i = 0; i < 7; i++) { const c = pick(['#7a2a36', '#27365a', '#8a8f92']); box([SC + 2.0, SH + 0.75 + i * 0.14, -4.9], [0.7, 0.06, 0.65], c); box([SC + 2.0, SH + 1.05 + i * 0.14, -5.2], [0.7, 0.45, 0.05], c, [-0.15, 0, 0]); }
        for (const x of [-0.32, 0.32]) for (const z of [-0.3, 0.3]) box([SC + 2.0 + x, SH + 0.37, -4.9 + z], [0.04, 0.75, 0.04], '#9aa0a3');
      } else if (a.stage === 'lectern') {
        s.box([0.7, 0.08, 0.6], [SC, SH + 0.04, -4.5], wood); s.box([0.22, 1.5, 0.2], [SC, SH + 0.8, -4.5], wood);
        const top = s.box([0.85, 0.07, 0.65], [SC, SH + 1.6, -4.45], wood); top.rotation.x = 0.4;
        s.rod([SC + 0.9, SH, -4.3], [SC + 0.9, SH + 1.9, -4.3], 0.025, dark); s.cylinder(0.2, 0.22, 0.04, [SC + 0.9, SH + 0.02, -4.3], dark, 12); s.ball([0.07, 0.09, 0.07], [SC + 0.9, SH + 1.95, -4.3], dark, 10);
        for (const side of [-1, 1]) {
          const fx = SC + side * 1.9;
          s.lathe([[0.001, 0], [0.3, 0], [0.28, 0.06], [0.12, 0.14], [0.1, 1.0], [0.26, 1.1], [0.26, 1.16], [0.001, 1.16]], white, [fx, SH, -4.8]);
          for (let i = 0; i < 16; i++) { const t = rnd(0, 6.28), r = Math.sqrt(random()) * 0.42, up = rnd(0.1, 0.75); const bloom = s.mesh(new THREE.IcosahedronGeometry(1, 0), s.material(random() < 0.4 ? '#4f7a3a' : mood.cheer > 0.55 ? pick(['#e8432e', '#f2b632', '#e96aa0', '#fbf9f2']) : pick(['#fbf9f2', '#f4efdf', '#f1e3ea']), { flatShading: true }), [fx + Math.cos(t) * r, SH + 1.2 + up, -4.8 + Math.sin(t) * r * 0.7]); bloom.scale.setScalar(rnd(0.11, 0.17)); bloom.rotation.set(rnd(0, 3), rnd(0, 3), 0); }
        }
      } else {
        const sun = s.cylinder(0.55, 0.55, 0.04, [SC + 1.6, PT - 0.75, -5.42], s.material('#f6cf3a', { emissive: '#f6cf3a', emissiveIntensity: 0.25 }), 24); sun.rotation.x = Math.PI / 2;
        for (const [x, h, z] of [[-2.3, 2.3, -5.0], [-1.6, 1.8, -4.7], [2.3, 2.5, -4.9], [-0.9, 2.0, -5.2]] as const) {
          s.box([0.16, h * 0.4, 0.05], [SC + x, SH + h * 0.2, z], s.material('#6a4424'));
          for (let k = 0; k < 3; k++) { const tri = s.mesh(new THREE.ConeGeometry(0.62 - k * 0.13, h * 0.38, 3), s.material(pick(['#2f8a4a', '#3f9a54', '#2a7a44'])), [SC + x, SH + h * (0.45 + k * 0.2), z]); tri.scale.z = 0.08; tri.rotation.y = Math.PI / 6 + Math.PI / 2; }
        }
        s.box([1.5, 1.7, 0.06], [SC + 0.6, SH + 0.85, -4.6], s.material('#d9cfc0'));
        for (let i = 0; i < 4; i++) s.box([0.22, 0.25, 0.06], [SC + 0.6 - 0.63 + i * 0.42, SH + 1.82, -4.6], s.material('#d9cfc0'));
        s.box([0.45, 0.8, 0.07], [SC + 0.6, SH + 0.4, -4.58], s.material('#6a4424'));
        s.box([0.5, 0.5, 0.5], [SC - 0.4, SH + 0.25, -4.2], s.material('#c8342e')).rotation.y = 0.4;
      }
    }
    if (a.kind === 'mission') s.label('GOD IS LOVE', 4.2, 0.48, [SC, PT + 0.38, SZ - 0.03], '#6a2a22', '#efe6cf');
    if (a.kind === 'club') for (let i = 0; i < 26; i++) fairy.push({ p: [SX0 + 0.3 + i * (SW - 0.6) / 25, PT - 0.02 - Math.abs(Math.sin(i * 0.63)) * 0.1, SZ - 0.02], s: [0.07, 0.07, 0.07], c: pick(['#ff5a4a', '#ffd23a', '#4ad27a', '#4a9aff', '#ff7ad2']) });

    // ---- the serving hatch and the kitchen behind it ----
    const HC = (HX0 + HX1) / 2, HW = HX1 - HX0;
    s.box([HW + 0.36, 0.1, 0.9], [HC, HY0 - 0.02, -5.45], s.material(a.kind === 'club' ? '#3a2418' : '#cfc9b8', { roughness: 0.35 }));
    for (const x of [HX0 - 0.07, HX1 + 0.07]) s.box([0.14, HY1 - HY0 + 0.2, 0.38], [x, (HY0 + HY1) / 2 + 0.05, -5.62], wood);
    s.box([HW + 0.3, 0.3, 0.42], [HC, HY1 + 0.15, -5.56], s.material('#9aa0a3', { metalness: 0.3, roughness: 0.4 }));
    const shutterH = { open: 0.14, half: 0.72, closed: HY1 - HY0 }[a.hatch];
    const slats = canvasTexture(64, 128, (ctx) => { ctx.fillStyle = '#b4b9bb'; ctx.fillRect(0, 0, 64, 128); for (let y = 0; y < 128; y += 9) { ctx.fillStyle = '#8f9598'; ctx.fillRect(0, y, 64, 2); ctx.fillStyle = '#d0d4d6'; ctx.fillRect(0, y + 3, 64, 2); } });
    slats.wrapT = THREE.RepeatWrapping; slats.repeat.set(1, shutterH / 0.75);
    s.box([HW, shutterH, 0.06], [HC, HY1 - shutterH / 2, -5.6], new THREE.MeshStandardMaterial({ map: slats, roughness: 0.5, metalness: 0.2 }));
    s.label(K.sign, 1.5, 0.34, [HC, HY1 + 0.62, -5.485], '#f4f1e6', a.kind === 'club' ? '#5a1f24' : '#2f4a3a');
    if (a.hatch !== 'closed') {
      const tile = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = '#f4f3ea'; ctx.fillRect(0, 0, 128, 128); ctx.strokeStyle = '#cfd3cf'; ctx.lineWidth = 2; for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16, 128); ctx.moveTo(0, i * 16); ctx.lineTo(128, i * 16); ctx.stroke(); } ctx.fillStyle = a.kind === 'club' ? '#7a3038' : '#5f93b4'; ctx.fillRect(0, 48, 128, 14); });
      const glow = { open: 0.75, half: 0.55 }[a.hatch] * (lit ? 1.15 : 0.9);
      s.box([HW + 0.8, 4.2, 0.2], [HC, 2.1, -7.5], new THREE.MeshStandardMaterial({ map: tile, emissiveMap: tile, emissive: '#fff4d6', emissiveIntensity: glow, roughness: 0.3 }));
      for (const x of [HX0 - 0.45, HX1 + 0.45]) s.box([0.2, 4.2, 1.9], [x, 2.1, -6.6], new THREE.MeshStandardMaterial({ color: '#e9e6da', emissive: '#fff4d6', emissiveIntensity: glow * 0.4 }));
      s.box([HW + 0.8, 0.1, 1.9], [HC, 0.3, -6.6], s.material('#6f7a72'));
      s.box([HW + 0.6, 1.55, 0.7], [HC, 0.78, -7.05], s.material('#e3dfd0')); s.box([HW + 0.6, 0.06, 0.74], [HC, 1.58, -7.05], s.material('#b9bec0', { metalness: 0.4, roughness: 0.3 }));
      s.box([HW + 0.2, 0.06, 0.34], [HC, 2.75, -7.25], white);
      for (let i = 0; i < 9; i++) box([HX0 + 0.2 + i * 0.32, 2.9, -7.25], [0.2, 0.24, 0.2], pick(['#f4f1e8', '#a9c7a7', '#2f5d8a', '#c8412f', '#e8c13a']));
      s.lathe([[0.001, 0], [0.2, 0], [0.24, 0.12], [0.2, 0.36], [0.1, 0.42], [0.001, 0.44]], s.material('#c9cfd2', { metalness: 0.4, roughness: 0.3 }), [HX0 + 0.6, 1.61, -7.0]);
      for (let i = 0; i < 3; i++) s.cylinder(0.2, 0.2, rnd(0.12, 0.34), [HC + 0.2 + i * 0.5, 1.72, -7.0], white, 14);
      box([HX1 - 0.3, 1.82, -7.0], [0.14, 0.42, 0.1], '#3fa85a');
      if (a.hatch === 'open') {
        // Urn and ranked cups on the counter.
        const steel = s.material('#cfd5d8', { metalness: 0.35, roughness: 0.3 });
        s.cylinder(0.27, 0.27, 0.72, [HX1 - 0.5, HY0 + 0.42, -5.4], steel, 20); s.cylinder(0.29, 0.29, 0.07, [HX1 - 0.5, HY0 + 0.07, -5.4], dark, 20);
        s.lathe([[0.001, 0.1], [0.08, 0.09], [0.27, 0]], steel, [HX1 - 0.5, HY0 + 0.78, -5.4]); s.ball([0.04, 0.04, 0.04], [HX1 - 0.5, HY0 + 0.9, -5.4], dark, 8);
        s.rod([HX1 - 0.5, HY0 + 0.2, -5.14], [HX1 - 0.5, HY0 + 0.2, -5.0], 0.03, dark);
        const cupC = { parish: '#a9c7a7', village: '#f5f3ee', mission: '#f5f3ee', club: '#f5f3ee', school: '#9fc0d0' }[a.kind];
        const cols = 3 + Math.round(mood.density * 3);
        for (let i = 0; i < cols; i++) for (let j = 0; j < 2; j++) { box([HX0 + 0.3 + i * 0.3, HY0 + 0.045, -5.42 + j * 0.28], [0.24, 0.025, 0.24], cupC); box([HX0 + 0.3 + i * 0.3, HY0 + 0.13, -5.42 + j * 0.28], [0.15, 0.15, 0.15], cupC); }
      } else {
        box([HC - 0.5, HY0 + 0.05, -5.2], [0.5, 0.03, 0.36], '#f4f1e8'); for (const dx of [-0.16, 0, 0.16]) box([HC - 0.5 + dx, HY0 - 0.2, -4.99], [0.05, 0.5, 0.02], '#2f5d8a'); box([HC - 0.5, HY0 - 0.2, -5.0], [0.5, 0.5, 0.015], '#f4f1e8');
        for (let i = 0; i < 4; i++) box([HC + 0.5 + i * 0.05, HY0 + 0.1 + i * 0.07, -5.35], [0.3, 0.06, 0.3], '#f5f3ee');
      }
      if (a.kind === 'club') for (let i = 0; i < 3; i++) { s.rod([HC - 0.3 + i * 0.3, HY0 + 0.03, -5.15], [HC - 0.3 + i * 0.3, HY0 + 0.5, -5.1], 0.035, s.material(pick(['#c9a23c', '#1c1c20', '#a3241f']), { metalness: 0.3 })); box([HC - 0.3 + i * 0.3, HY0 + 0.38, -5.08], [0.12, 0.14, 0.02], pick(['#f4e9c9', '#2f5a44', '#a3241f'])); }
    }
    // Kitchen door and the exit sign over it.
    const doorX = 6.22;
    s.box([1.2, 3.3, 0.07], [doorX, 1.65, -5.46], s.material(sat(K.lower).multiplyScalar(0.8), { roughness: 0.5 }));
    s.box([0.4, 0.6, 0.02], [doorX - 0.2, 2.45, -5.42], new THREE.MeshStandardMaterial({ color: '#dfe6e6', emissive: '#fff4d6', emissiveIntensity: a.hatch === 'closed' ? 0.05 : 0.5 }));
    s.box([0.16, 0.5, 0.03], [doorX + 0.42, 1.7, -5.41], s.material('#c9cfd2', { metalness: 0.4 }));
    for (const x of [doorX - 0.65, doorX + 0.65]) s.box([0.1, 3.4, 0.1], [x, 1.7, -5.45], wood);
    s.box([1.4, 0.1, 0.1], [doorX, 3.4, -5.45], wood);
    const exit = s.label('EXIT', 0.8, 0.3, [doorX, 3.75, -5.48], '#ffffff', '#1f8a4a');
    (exit.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#1f8a4a'); (exit.material as THREE.MeshStandardMaterial).emissiveIntensity = lit ? 0.9 : 0.4;
    s.cylinder(0.13, 0.13, 0.75, [1.9, 0.45, -5.25], s.material('#c8202a', { roughness: 0.3 }), 14); s.cylinder(0.05, 0.08, 0.14, [1.9, 0.89, -5.25], dark, 10);

    // ---- what belongs to this particular hall ----
    const MX = 1.55;
    if (a.kind === 'parish') {
      s.box([0.16, 1.3, 0.08], [MX, 3.25, -5.45], wood); s.box([0.8, 0.16, 0.08], [MX, 3.55, -5.45], wood);
      s.box([0.08, 1.3, 0.9], [-6.95, 2.3, 0.0], dark);
      const hymns = s.label(`${Math.floor(rnd(1, 600))}  ${Math.floor(rnd(1, 600))}  ${Math.floor(rnd(1, 600))}`, 0.72, 0.22, [-6.9, 2.6, 0.0], '#22222a', '#f6f3ea'); hymns.rotation.y = Math.PI / 2;
      const hymns2 = s.label(`${Math.floor(rnd(1, 600))}  ${Math.floor(rnd(1, 600))}`, 0.72, 0.22, [-6.9, 2.25, 0.0], '#22222a', '#f6f3ea'); hymns2.rotation.y = Math.PI / 2;
    } else if (a.kind === 'village') {
      s.box([1.5, 1.1, 0.06], [MX, 2.7, -5.46], s.material('#b98a54')); for (let i = 0; i < 12; i++) box([MX + rnd(-0.6, 0.6), 2.7 + rnd(-0.4, 0.4), -5.42], [rnd(0.16, 0.3), rnd(0.2, 0.36), 0.01], pick(['#f6f3ea', '#f6e08a', '#f4b9c8', '#b9dff0', '#c8e6c0', '#f6f3ea']), [0, 0, rnd(-0.15, 0.15)]);
      s.box([0.3, 0.06, 1.6], [-6.84, 2.25, 0.0], wood);
      for (let i = 0; i < 4; i++) s.lathe([[0.001, 0], [0.09, 0], [0.03, 0.05], [0.03, 0.14], [0.1, 0.3], [0.11, 0.34], [0.001, 0.2]], s.material(i % 2 ? '#c9a23c' : '#c8ccd0', { metalness: 0.5, roughness: 0.4 + mood.wear * 0.3 }), [-6.84, 2.28, -0.6 + i * 0.4]);
    } else if (a.kind === 'club') {
      const board = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = '#17161a'; ctx.beginPath(); ctx.arc(64, 64, 64, 0, 7); ctx.fill(); for (let i = 0; i < 20; i++) { ctx.fillStyle = i % 2 ? '#e9dfc0' : '#17161a'; ctx.beginPath(); ctx.moveTo(64, 64); ctx.arc(64, 64, 52, (i / 20) * Math.PI * 2, ((i + 1) / 20) * Math.PI * 2); ctx.fill(); } for (const [r, w] of [[52, 5], [32, 5]] as const) { for (let i = 0; i < 20; i++) { ctx.strokeStyle = i % 2 ? '#1f8a4a' : '#c8202a'; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(64, 64, r, (i / 20) * Math.PI * 2, ((i + 1) / 20) * Math.PI * 2); ctx.stroke(); } } ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.arc(64, 64, 5, 0, 7); ctx.fill(); });
      const dart = s.mesh(new THREE.CircleGeometry(0.42, 28), new THREE.MeshStandardMaterial({ map: board, roughness: 0.8 }), [MX, 2.95, -5.455]); dart.castShadow = false;
      s.box([1.1, 1.3, 0.05], [MX, 2.95, -5.47], s.material('#2f5a44')); s.box([0.5, 0.7, 0.04], [MX - 0.02, 3.95, -5.46], dark);
    } else if (a.kind === 'school') {
      for (let i = 0; i < 4; i++) box([-6.88, 2.1, -0.75 + i * 0.5], [0.08, 4.0, 0.1], '#b08a54');
      for (let j = 0; j < 12; j++) box([-6.86, 0.35 + j * 0.32, 0.0], [0.05, 0.05, 1.6], '#c9a56a');
      s.box([1.5, 1.0, 0.06], [MX, 4.3, -5.45], white); box([MX, 4.15, -5.41], [0.5, 0.4, 0.012], '#c8202a'); const hoop = s.ring(0.26, 0.022, [MX, 3.9, -5.15], s.material('#e8641f')); hoop.rotation.x = Math.PI / 2;
      for (const z of [-2.3]) { box([-6.5, 0.48, z], [0.34, 0.05, 2.2], '#c9a56a'); box([-6.5, 0.23, z - 0.9], [0.3, 0.46, 0.06], '#b08a54'); box([-6.5, 0.23, z + 0.9], [0.3, 0.46, 0.06], '#b08a54'); }
    }

    // ---- extra dressing ----
    if (a.dressing === 'clock' || a.kind === 'village' || a.kind === 'parish') {
      const face = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = '#fbfaf4'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, 7); ctx.fill(); ctx.strokeStyle = '#1c1c20'; ctx.lineWidth = 5; for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(64 + Math.cos(t) * 50, 64 + Math.sin(t) * 50); ctx.lineTo(64 + Math.cos(t) * 58, 64 + Math.sin(t) * 58); ctx.stroke(); } const hour = rnd(2.4, 4.8), hr = (hour / 12) * Math.PI * 2 - Math.PI / 2, mn = (hour % 1) * Math.PI * 2 - Math.PI / 2; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(hr) * 30, 64 + Math.sin(hr) * 30); ctx.stroke(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(mn) * 46, 64 + Math.sin(mn) * 46); ctx.stroke(); });
      const cy = a.kind === 'school' ? 3.3 : 4.45;
      const rim = s.cylinder(0.46, 0.46, 0.08, [MX, cy, -5.45], dark, 28); rim.rotation.x = Math.PI / 2;
      const dial = s.mesh(new THREE.CircleGeometry(0.41, 28), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }), [MX, cy, -5.405]); dial.castShadow = false;
    }
    if (a.dressing === 'clock') { box([-6.96, 2.2, 2.6], [0.02, 0.6, 0.45], '#f6f3ea'); box([-6.95, 2.38, 2.6], [0.02, 0.14, 0.4], '#c8202a'); }
    if (a.dressing === 'bunting') {
      const A = new THREE.Vector3(-6.95, 5.0, 4.6), B = new THREE.Vector3(1.6, 5.0, -5.45), n = 30;
      const pts: V3[] = [];
      for (let i = 0; i <= n; i++) { const t = i / n, p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * 0.9; pts.push([p.x, p.y, p.z]); }
      s.tube(pts, 0.012, s.material('#f1eee4'));
      const yaw = Math.atan2(-(B.z - A.z), B.x - A.x);
      const flagGeometry = new THREE.ConeGeometry(0.17, 0.36, 3); flagGeometry.rotateX(Math.PI); flagGeometry.rotateY(Math.PI / 6); flagGeometry.translate(0, -0.18, 0);
      const flags = new THREE.InstancedMesh(flagGeometry, s.material('#ffffff', { roughness: 0.9, side: THREE.DoubleSide }), n - 1);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      for (let i = 1; i < n; i++) { m.compose(new THREE.Vector3(...pts[i]), q, new THREE.Vector3(1, 1, 0.06)); flags.setMatrixAt(i - 1, m); flags.setColorAt(i - 1, new THREE.Color(['#c8545a', '#f1eee4', '#5a78b0'][i % 3]).lerp(new THREE.Color('#cfc8b8'), 0.25 + mood.wear * 0.4)); }
      flags.castShadow = true; s.root.add(flags);
    }
    if (a.dressing === 'flowers') {
      for (const fx of [SX0 + 0.55, SX1 - 0.55]) {
        s.lathe([[0.001, 0], [0.32, 0], [0.3, 0.06], [0.12, 0.16], [0.1, 1.5], [0.28, 1.62], [0.28, 1.7], [0.001, 1.7]], white, [fx, 0, SZ + 0.55]);
        for (let i = 0; i < 20; i++) { const t = rnd(0, 6.28), r = Math.sqrt(random()) * 0.5, up = rnd(0.05, 0.95); const bloom = s.mesh(new THREE.IcosahedronGeometry(1, 0), s.material(random() < 0.4 ? '#4f7a3a' : mood.cheer > 0.55 ? pick(['#e8432e', '#f2b632', '#e96aa0', '#fbf9f2']) : pick(['#fbf9f2', '#f4efdf', '#f1e3ea', '#d9c9e6']), { flatShading: true }), [fx + Math.cos(t) * r * (1.1 - up * 0.6), 1.75 + up, SZ + 0.55 + Math.sin(t) * r * (1.1 - up * 0.6)]); bloom.scale.setScalar(rnd(0.12, 0.2)); bloom.rotation.set(rnd(0, 3), rnd(0, 3), 0); }
      }
      s.ring(0.3, 0.1, [SC, SH * 0.52, SZ + 0.08], s.material('#3f6e3a', { roughness: 1 }));
      for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; const bloom = s.mesh(new THREE.IcosahedronGeometry(1, 0), s.material(pick(['#fbf9f2', '#f4efdf', '#f1e3ea']), { flatShading: true }), [SC + Math.cos(t) * 0.3, SH * 0.52 + Math.sin(t) * 0.3, SZ + 0.17]); bloom.scale.setScalar(0.085); }
    }
    if (a.dressing === 'paintings') for (let i = 0; i < 9; i++) { const z = -2.9 + i * 0.75 + rnd(-0.05, 0.05); if (Math.abs(z) < 0.6 && (a.kind === 'parish' || a.kind === 'school')) continue; box([-6.955, 2.15 + rnd(-0.08, 0.08), z], [0.012, 0.5, 0.62], '#fbfaf4', [rnd(-0.06, 0.06), 0, 0]); box([-6.945, 2.15 + rnd(-0.1, 0.1), z + rnd(-0.1, 0.1)], [0.012, rnd(0.2, 0.34), rnd(0.2, 0.4)], pick(['#e8432e', '#f2b632', '#3f8fd0', '#3fa85a', '#8c5cc4', '#e96aa0'])); box([-6.94, 2.02, z + rnd(-0.2, 0.2)], [0.012, 0.12, 0.3], pick(['#3fa85a', '#3f8fd0', '#f2b632'])); }
    if (a.dressing === 'portraits') for (let i = 0; i < 7; i++) { const z = -2.8 + i * 0.95; if (Math.abs(z) < 0.6 && (a.kind === 'parish' || a.kind === 'school')) continue; box([-6.955, 2.2, z], [0.03, 0.56, 0.7], '#2a2422', [rnd(-0.03, 0.03), 0, 0]); box([-6.935, 2.2, z], [0.012, 0.44, 0.58], pick(['#b9ad98', '#a8a8a4', '#c9b796'])); for (let k = 0; k < 5; k++) box([-6.925, 2.13 + (k % 2) * 0.1, z - 0.22 + k * 0.11], [0.008, 0.16, 0.08], pick(['#3a3a40', '#4a4038', '#2a2a2e'])); }

    // ---- chairs left along the wall, and what the clearing-up has left ----
    const chair = (x: number, z: number, yaw: number, c: string) => {
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      const at = (dx: number, dy: number, dz: number): V3 => [x + dx * cs + dz * sn, dy, z - dx * sn + dz * cs];
      box(at(0, 0.72, 0), [0.66, 0.06, 0.62], c, [0, yaw, 0]); box(at(0, 1.12, -0.3), [0.66, 0.34, 0.05], c, [-0.14, yaw, 0]);
      for (const dx of [-0.29, 0.29]) { box(at(dx, 0.36, 0.27), [0.04, 0.72, 0.04], '#9aa0a3', [0, yaw, 0]); box(at(dx, 0.66, -0.29), [0.04, 1.32, 0.04], '#9aa0a3', [-0.06, yaw, 0]); }
    };
    const seat = pick(['#7a2a36', '#27365a', '#2f5a44', '#8a8f92']);
    const wallChairs = Math.round(mix(1, 5, mood.density));
    const spots: [number, number, number][] = [[-6.35, 0.55, Math.PI / 2], [-6.35, 4.3, Math.PI / 2], [-6.35, 5.05, Math.PI / 2], [-6.35, -0.25, Math.PI / 2], [1.5, -4.9, 0]];
    if (a.kind === 'school') spots.splice(0, 1), spots.splice(2, 1);
    if (a.floor !== 'cleared') for (let i = 0; i < Math.min(wallChairs, spots.length); i++) chair(spots[i][0] + rnd(-0.05, 0.05), spots[i][1], spots[i][2] + rnd(-0.15, 0.15), seat);
    if (a.floor === 'cleared') {
      for (let i = 0; i < 4; i++) { const t = s.box([0.07, 1.5, 3.4], [-6.75 + i * 0.1, 0.78, 3.6 + rnd(-0.1, 0.1)], s.material(i % 2 ? '#c9b796' : '#b9a684')); t.rotation.z = -0.1; }
      for (let i = 0; i < 8; i++) { box([-6.3, 0.75 + i * 0.13, 0.4], [0.66, 0.06, 0.62], seat, [0, Math.PI / 2, 0]); box([-6.62 + i * 0.01, 1.1 + i * 0.13, 0.4], [0.05, 0.36, 0.66], seat, [0, 0, 0.1]); }
      for (const dz of [-0.28, 0.28]) for (const dx of [-0.28, 0.28]) box([-6.3 + dx, 0.36, 0.4 + dz], [0.04, 0.72, 0.04], '#9aa0a3');
      const bx = rnd(2.2, 3.6), bz = rnd(3.6, 4.6);
      s.rod([bx, 0.06, bz], [bx + 0.9, 2.3, bz - 0.5], 0.03, s.material('#c9a56a'));
      const headB = s.box([1.1, 0.12, 0.16], [bx, 0.07, bz], s.material('#8a2a22')); headB.rotation.y = 0.5;
      const dust = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#a89a86', { flatShading: true, roughness: 1 }), [bx - 0.5, 0.03, bz + 0.3]); dust.scale.set(0.4, 0.04, 0.28);
      const bag = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#1c1c20', { flatShading: true, roughness: 0.3 }), [6.1, 0.42, -3.2]); bag.scale.set(0.5, 0.48, 0.45);
      s.ball([0.12, 0.14, 0.12], [6.1, 0.92, -3.2], s.material('#1c1c20', { roughness: 0.3 }), 8);
    }
    if (a.floor === 'scuffed') {
      const nap = s.mesh(new THREE.IcosahedronGeometry(1, 0), s.material('#f6f3ea', { flatShading: true }), [rnd(1.8, 3), 0.05, rnd(3.6, 4.8)]); nap.scale.set(0.2, 0.05, 0.16); nap.rotation.y = rnd(0, 3);
      const cup = s.cylinder(0.09, 0.07, 0.2, [rnd(-3.5, -2), 0.08, rnd(3.6, 4.8)], white, 12); cup.rotation.z = Math.PI / 2; cup.rotation.y = rnd(0, 3);
    }
    if (a.floor === 'wet') {
      const water = new THREE.MeshStandardMaterial({ color: '#59666c', transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.3, depthWrite: false });
      for (let i = 0; i < 3; i++) { const p = s.cylinder(1, 1, 0.006, [rnd(5, 6.5), 0.008, rnd(3.8, 5.2)], water, 16); p.scale.set(rnd(0.3, 0.6), 1, rnd(0.2, 0.45)); p.castShadow = false; }
      s.cylinder(0.3, 0.26, 0.1, [6.4, 0.05, 4.9], dark, 16);
    }

    if (boxes.length) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.7 }), boxes.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      boxes.forEach((b, i) => { const r = b.r ?? [0, 0, 0]; q.setFromEuler(e.set(r[0], r[1], r[2], 'YXZ')); m.compose(new THREE.Vector3(...b.p), q, new THREE.Vector3(...b.s)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(b.c)); });
      mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; s.root.add(mesh);
    }
    if (fairy.length) {
      const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 }), fairy.length);
      const m = new THREE.Matrix4();
      fairy.forEach((b, i) => { m.compose(new THREE.Vector3(...b.p), new THREE.Quaternion(), new THREE.Vector3(...b.s)); bulbs.setMatrixAt(i, m); bulbs.setColorAt(i, new THREE.Color(b.c)); });
      s.root.add(bulbs);
    }
    return world;
  },
});
