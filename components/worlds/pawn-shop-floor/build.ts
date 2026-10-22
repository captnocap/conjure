import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';
import { Batch, card, painted, pick } from './util';

type V3 = [number, number, number];
type Rect = { u0: number; u1: number; v0: number; v1: number };
type Fill = 'guitars' | 'tools' | 'televisions' | 'guns' | 'clocks';

/** Instanced set dressing: everything hung on a wall goes through four draw calls. */
class Goods {
  readonly boxes = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }));
  readonly discs = new Batch(new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.6 }));
  readonly rods = new Batch(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }));
  readonly glow = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  box(at: V3, size: V3, colour: THREE.ColorRepresentation, rot: V3 = [0, 0, 0]) { this.boxes.add(at, size, rot, colour); }
  disc(at: V3, r: number, thick: number, colour: THREE.ColorRepresentation, squash: [number, number] = [1, 1]) { this.discs.add(at, [r * squash[0], r * squash[1], thick], [0, 0, 0], colour); }
  rod(at: V3, r: number, length: number, colour: THREE.ColorRepresentation, rot: V3 = [0, 0, 0]) { this.rods.add(at, [r, length, r], rot, colour); }
  lit(at: V3, size: V3, colour: THREE.ColorRepresentation) { this.glow.add(at, size, [0, 0, 0], colour); }
  into(parent: THREE.Object3D) { for (const b of [this.boxes, this.discs, this.rods, this.glow]) b.into(parent); }
}

const SIGNS = {
  gold: 'WE BUY GOLD',
  loans: 'CASH LOANS',
  pawn: 'PAWN',
  trade: 'BUY · SELL · TRADE',
  final: 'ALL SALES FINAL',
  lent: 'MONEY LENT',
} as const;

export default defineWorld({
  questions: {
    shop: choice('What kind of pawn shop is it?', {
      'strip-mall': 'A desert strip-mall unit: beige slatwall, black laminate counters, fluorescent tubes and sun-blasted lino.',
      'old-city': 'An old-city jeweller-lender: dark panelling, oak counters, opal lamps and the three gold balls.',
      'hong-kong': 'A Hong Kong pawn house: a towering wooden counter behind iron bars, green tile, red and gold boards and a privacy screen by the door.',
      rural: 'A rural gun-and-tackle pawn: knotty pine boards, plain wood counters and shop lights over bare concrete.',
    }),
    walls: choice('What dominates the walls?', {
      guitars: 'Guitars, rows of them, hung by their necks.',
      tools: 'Tools on pegboard: saws, drills, wrenches, cases of somebody\'s trade.',
      televisions: 'Shelves of televisions and stereo boxes, a few left running.',
      guns: 'Racks of long guns, fishing rods, a mounted fish.',
      clocks: 'Wall clocks, framed pictures and mirrors from cleared-out houses.',
      everything: 'All of it in bays: instruments, electronics and tools side by side.',
    }),
    window: choice('What is the barred window doing?', {
      daylight: 'Bare barred glass, throwing long stripes of daylight across the floor.',
      neon: 'A neon sign hangs in it, and its colour spills across the floor.',
      shutter: 'A steel shutter is pulled halfway down behind the bars.',
      painted: 'Painted over with hand-lettered offers; only a dull glow gets through.',
    }),
    cases: choice('What is in the glass counters?', {
      jewellery: 'Gold chains and rings on dark velvet.',
      watches: 'Rows of wristwatches.',
      knives: 'Pocket knives, lighters and old coins.',
      pistols: 'Handguns and fishing reels on green baize.',
      bare: 'Almost nothing: bare pads and a few tags.',
    }),
    state: choice('What is going on in the shop?', {
      slow: 'An ordinary slow day: a newspaper on the counter, nothing moving.',
      'closing-sale': 'A closing-down sale: bunting, EVERYTHING MUST GO, half the hooks already empty.',
      'break-in': 'The morning after a break-in: a smashed case boarded with plywood, tape across the floor.',
      holiday: 'Decorated for the holidays with string lights and tinsel, trying its best.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Checkerboard lino, scuffed in a path to the counter.',
      carpet: 'Worn commercial carpet with a bald track.',
      concrete: 'Bare sealed concrete with a painted WAIT HERE line.',
      boards: 'Old wooden floorboards.',
      mosaic: 'Small green and white mosaic tile.',
    }),
    sign: choice('What does the big sign over the back wall say?', {
      gold: 'WE BUY GOLD',
      loans: 'CASH LOANS',
      pawn: 'PAWN',
      trade: 'BUY · SELL · TRADE',
      final: 'ALL SALES FINAL',
      lent: 'MONEY LENT',
    }),
    behind: choice('What is behind the counter?', {
      safe: 'A big iron safe with a brass dial.',
      parcels: 'Shelves of brown-paper parcels, each with a ticket.',
      cage: 'A wire cashier\'s cage built up from the counter.',
      dog: 'A stool, a small television and an old dog asleep on a rug.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const WD = 14, DP = 11, WH = 4.9, CH = 1.45;
    const hk = a.shop === 'hong-kong';
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const slots: [number, number, number?, number?][] = [
      [1.3, 1.5], [4.7, -0.2, 0, 0.95], [-1.4, 3.6, 0, 0.9], [-4.1, 0.5, CH + 0.03, 0.42],
      hk ? [4.9, 3.6, 0, 0.8] : [1.6, -2.7, CH + 0.03, 0.42], [4.9, 3.5, 0, 0.8],
    ];
    const paper = new THREE.Color('#e4e2d8').lerp(new THREE.Color(mood.warmth > 0.5 ? '#e6d2b8' : '#cfd6dc'), dusk * 0.5);
    const { art: s, world } = diorama(context, { background: '#' + paper.getHexString(), floor: null, width: WD, depth: DP, maxHeight: 2.75, radius: 1.3, pitch: 31, yaw: 27, slots });
    const root = s.root;

    // ---- palette by kind of shop ----
    const P = {
      'strip-mall': { wall: '#d8d0bb', wains: '#c9c0a8', trim: '#3f6f8a', counter: '#2a2b2f', metal: '#c3c7c9', velvet: '#22222a' },
      'old-city': { wall: '#7d9484', wains: '#5e3d27', trim: '#c4a04e', counter: '#7a4d2a', metal: '#c9a23e', velvet: '#5a1422' },
      'hong-kong': { wall: '#e6dcc0', wains: '#4f8a76', trim: '#a8231f', counter: '#6a2f22', metal: '#c9a23e', velvet: '#7a1620' },
      rural: { wall: '#c69a5e', wains: '#a67c46', trim: '#3d4a36', counter: '#9a7448', metal: '#9aa0a2', velvet: '#1f4a35' },
    }[a.shop];
    const wallMat = s.material(P.wall, { roughness: 0.9 });
    const wainsMat = s.material(P.wains, { roughness: 0.75 });
    const trimMat = s.material(P.trim, { roughness: 0.6 });
    const metal = s.material(P.metal, { metalness: 0.5, roughness: 0.35 });
    const dark = s.material('#1a1a1d');
    const fill = clamp01(mix(0.72, 1, mood.density) * (a.state === 'closing-sale' ? 0.5 : 1));

    // ---- floor ----
    const ground = s.box([WD, 0.24, DP], [0, -0.12, 0], s.material('#8d8779'));
    world.ground = ground;
    const floorTex = painted(1024, 804, (ctx, w, h) => {
      const u = w / WD;
      if (a.floor === 'checker') {
        for (let x = 0; x < WD * 1.25; x++) for (let z = 0; z < DP * 1.25; z++) {
          ctx.fillStyle = (x + z) % 2 ? '#cfc8b4' : pick(random, ['#6f6a62', '#6a655d', '#74706a']);
          ctx.fillRect(x * u * 0.8, z * u * 0.8, u * 0.8, u * 0.8);
        }
      } else if (a.floor === 'carpet') {
        ctx.fillStyle = mood.warmth > 0.5 ? '#8a4a3c' : '#4f6272';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},0.06)`; ctx.fillRect(random() * w, random() * h, 3, 3); }
      } else if (a.floor === 'concrete') {
        ctx.fillStyle = '#a9a69c';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(60,55,48,${0.03 + random() * 0.07})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 90, 14 + random() * 50, random() * 3, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(40,40,40,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.2); ctx.lineTo(w * 0.4, h * 0.5); ctx.lineTo(w * 0.45, h * 0.95); ctx.stroke();
        ctx.fillStyle = '#e2c02a';
        ctx.fillRect(w * 0.36, h * 0.44, w * 0.5, 9);
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('WAIT HERE', w * 0.52, h * 0.44 + 44);
      } else if (a.floor === 'boards') {
        for (let x = 0; x < w; x += u * 0.42) {
          ctx.fillStyle = pick(random, ['#9a7448', '#8f6a40', '#a47c4e', '#86623a']);
          ctx.fillRect(x, 0, u * 0.42, h);
          ctx.fillStyle = 'rgba(40,25,10,0.55)';
          ctx.fillRect(x, 0, 2, h);
          for (let k = 0; k < 3; k++) ctx.fillRect(x, random() * h, u * 0.42, 2);
        }
      } else {
        const t = u * 0.2;
        for (let x = 0; x < w / t; x++) for (let z = 0; z < h / t; z++) {
          const band = (x % 12 === 0 || z % 12 === 0) || ((x % 12 === 6) && (z % 12 === 6));
          ctx.fillStyle = band ? '#3f7a68' : pick(random, ['#e4dfcc', '#dcd6c0', '#e9e5d4']);
          ctx.fillRect(x * t + 1, z * t + 1, t - 2, t - 2);
        }
      }
      // the track everyone walks from the door to the counter
      const g = ctx.createLinearGradient(0, h, w * 0.6, h * 0.3);
      g.addColorStop(0, `rgba(235,228,210,${0.05 + mood.wear * 0.22})`);
      g.addColorStop(1, 'rgba(235,228,210,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = u * 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, h * 0.86); ctx.quadraticCurveTo(w * 0.35, h * 0.85, w * 0.55, h * 0.36); ctx.stroke();
      ctx.fillStyle = `rgba(50,44,36,${mood.wear * 0.16})`;
      ctx.fillRect(0, 0, w, h);
    });
    const floorSkin = card(WD, DP, floorTex, { roughness: 0.85, side: THREE.FrontSide });
    floorSkin.rotation.x = -Math.PI / 2;
    floorSkin.position.y = 0.006;
    floorSkin.castShadow = false;
    root.add(floorSkin);

    // ---- walls ----
    const backZ = -DP / 2 + 0.11, leftX = -WD / 2 + 0.11;
    s.box([WD, WH, 0.22], [0, WH / 2, backZ], wallMat);
    const WIN = { z0: -1.4, z1: 2.2, y0: 1.55, y1: 3.75 }, DOOR = { z0: 3.3, z1: 4.9, y1: 3.3 };
    const leftPiece = (z0: number, z1: number, y0: number, y1: number) => s.box([0.22, y1 - y0, z1 - z0], [leftX, (y0 + y1) / 2, (z0 + z1) / 2], wallMat);
    leftPiece(-DP / 2, WIN.z0, 0, WH);
    leftPiece(WIN.z1, DOOR.z0, 0, WH);
    leftPiece(DOOR.z1, DP / 2, 0, WH);
    leftPiece(WIN.z0, WIN.z1, 0, WIN.y0);
    leftPiece(WIN.z0, WIN.z1, WIN.y1, WH);
    leftPiece(DOOR.z0, DOOR.z1, DOOR.y1, WH);
    const inBack = backZ + 0.115, inLeft = leftX + 0.115;
    // wainscot, skirting and cornice
    s.box([WD, 0.34, 0.03], [0, 0.17, inBack + 0.01], wainsMat);
    s.box([WD, 0.16, 0.06], [0, WH - 0.08, inBack + 0.03], trimMat);
    s.box([0.06, 0.16, DP], [inLeft + 0.03, WH - 0.08, 0], trimMat);
    for (const [z0, z1] of [[-DP / 2, WIN.z0], [WIN.z1, DOOR.z0], [DOOR.z1, DP / 2]] as const) s.box([0.03, a.shop === 'old-city' || hk ? 1.5 : 0.34, z1 - z0], [inLeft + 0.01, (a.shop === 'old-city' || hk ? 1.5 : 0.34) / 2, (z0 + z1) / 2], wainsMat);
    s.box([0.03, a.shop === 'old-city' || hk ? 1.5 : 0.34, WIN.z1 - WIN.z0], [inLeft + 0.01, (a.shop === 'old-city' || hk ? 1.5 : 0.34) / 2, (WIN.z0 + WIN.z1) / 2], wainsMat);
    const lines = new Batch(new THREE.BoxGeometry(1, 1, 1), s.material(new THREE.Color(P.wall).multiplyScalar(0.78)));
    if (a.shop === 'strip-mall') for (let y = 0.5; y < WH - 0.3; y += 0.22) lines.add([0, y, inBack + 0.004], [WD, 0.022, 0.01]);
    if (a.shop === 'rural') {
      for (let x = -WD / 2 + 0.4; x < WD / 2; x += 0.52) lines.add([x, WH / 2, inBack + 0.004], [0.03, WH, 0.01]);
      for (let z = -DP / 2 + 0.4; z < DP / 2; z += 0.52) if (z < WIN.z0 - 0.1 || (z > WIN.z1 + 0.1 && z < DOOR.z0 - 0.1) || z > DOOR.z1 + 0.1) lines.add([inLeft + 0.004, WH / 2, z], [0.01, WH, 0.03]);
    }
    lines.into(root);

    // ---- wall goods ----
    const gFill = (g: Goods, kind: Fill, r: Rect) => {
      const W = r.u1 - r.u0, H = r.v1 - r.v0;
      const present = () => random() < fill;
      if (kind === 'guitars') {
        const rows = Math.max(1, Math.floor(H / 1.72)), rowH = H / rows, cols = Math.max(1, Math.floor(W / 0.7));
        for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
          const x = r.u0 + (c + 0.5) * (W / cols), hook = r.v0 + rowH * (row + 1) - 0.1;
          g.box([x, hook - 0.02, 0.05], [0.05, 0.05, 0.1], '#8f9496');
          if (!present()) continue;
          const type = random();
          const neck = pick(random, ['#3a2618', '#c9a264', '#2a1d16']);
          if (type < 0.45) {
            const wood = pick(random, ['#d9a85c', '#c98f45', '#e3c184', '#a8672f', '#7a4424', '#1c1b1b']);
            g.disc([x, hook - 1.24, 0.11], 0.26, 0.14, wood);
            g.disc([x, hook - 0.9, 0.11], 0.19, 0.14, wood);
            g.disc([x, hook - 1.0, 0.185], 0.07, 0.01, '#14100c');
            g.box([x, hook - 1.36, 0.19], [0.2, 0.04, 0.02], '#14100c');
          } else if (type < 0.9) {
            const paint = pick(random, mood.cheer > 0.45 ? ['#c8202c', '#5fc7b8', '#f1ead6', '#e9a23b', '#3b78c9', '#f0c62e', '#18181b'] : ['#17171a', '#5a1620', '#6b3a1c', '#22324a', '#8a8a86', '#a8231f']);
            g.disc([x, hook - 1.22, 0.1], 0.23, 0.07, paint, [1, 1.12]);
            g.disc([x - 0.12, hook - 0.98, 0.1], 0.1, 0.07, paint, [1, 1.5]);
            g.disc([x + 0.12, hook - 1.02, 0.1], 0.09, 0.07, paint, [1, 1.3]);
            g.disc([x + 0.04, hook - 1.2, 0.14], 0.13, 0.01, random() < 0.5 ? '#efe8d2' : '#15151a', [0.8, 1.1]);
            g.box([x, hook - 1.3, 0.15], [0.12, 0.05, 0.02], '#d0d3d5');
          } else {
            const paint = pick(random, ['#121214', '#7c0f16', '#e8e6df']);
            for (const sgn of [-1, 1]) g.box([x + sgn * 0.13, hook - 1.22, 0.1], [0.13, 0.56, 0.06], paint, [0, 0, sgn * 0.42]);
          }
          g.box([x, hook - 0.42, 0.13], [0.065, 0.78, 0.045], neck);
          g.box([x, hook + 0.05, 0.11], [0.1, 0.2, 0.04], type < 0.45 ? neck : '#15151a');
          if (random() < 0.6) g.box([x + 0.09, hook - 0.2, 0.17], [0.09, 0.12, 0.005], pick(random, ['#f6f1e0', '#f6ff3a', '#d32a26']), [0, 0, (random() - 0.5) * 0.6]);
        }
      } else if (kind === 'tools') {
        g.box([(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, 0.02], [W, H, 0.04], '#a98458');
        const shelfY = r.v0 + 0.62;
        g.box([(r.u0 + r.u1) / 2, shelfY, 0.22], [W, 0.05, 0.44], '#6a4a2c');
        for (let x = r.u0 + 0.35; x < r.u1 - 0.3; ) {
          const w = 0.45 + random() * 0.4, h = 0.25 + random() * 0.3;
          if (present()) {
            const colour = pick(random, ['#c8262b', '#e2c81f', '#2a5fb0', '#1f6a4a', '#2a2a2e', '#d9642a']);
            g.box([x + w / 2, shelfY + 0.025 + h / 2, 0.24], [w, h, 0.34], colour);
            g.box([x + w / 2, shelfY + 0.03 + h, 0.24], [w * 0.4, 0.03, 0.05], '#15151a');
          }
          if (present()) g.box([x + w / 2, r.v0 + 0.02 + h / 2, 0.26], [w, h * 1.2, 0.36], pick(random, ['#c8262b', '#2a2a2e', '#e2c81f', '#5f6769']));
          x += w + 0.08;
        }
        const cols = Math.max(1, Math.floor(W / 0.85)), rows = Math.max(1, Math.floor((r.v1 - shelfY - 0.6) / 0.82));
        for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
          if (!present()) { g.rod([r.u0 + (c + 0.5) * (W / cols), shelfY + 0.95 + row * 0.82 + 0.25, 0.07], 0.012, 0.08, '#c3c7c9', [Math.PI / 2, 0, 0]); continue; }
          const x = r.u0 + (c + 0.5) * (W / cols), y = shelfY + 0.95 + row * 0.82, t = Math.floor(random() * 7);
          const handle = pick(random, ['#c8262b', '#e2c81f', '#2a5fb0', '#d9642a', '#8a5a34', '#1f6a4a']);
          if (t === 0) { g.box([x + 0.06, y, 0.06], [0.52, 0.17, 0.015], '#cfd3d5', [0, 0, -0.1]); g.box([x - 0.26, y + 0.03, 0.07], [0.16, 0.2, 0.04], '#8a5a34'); }
          else if (t === 1) { g.rod([x, y, 0.07], 0.022, 0.55, '#8a5a34'); g.box([x, y + 0.27, 0.07], [0.22, 0.09, 0.07], '#33363a'); }
          else if (t === 2) for (let k = 0; k < 5; k++) g.box([x - 0.24 + k * 0.12, y + 0.02 - k * 0.02, 0.06], [0.05, 0.5 - k * 0.06, 0.015], '#cfd3d5', [0, 0, 0.08]);
          else if (t === 3) { g.box([x, y + 0.08, 0.1], [0.36, 0.2, 0.12], handle); g.box([x - 0.06, y - 0.12, 0.1], [0.1, 0.26, 0.09], handle, [0, 0, 0.2]); g.rod([x + 0.24, y + 0.08, 0.1], 0.03, 0.14, '#33363a', [0, 0, Math.PI / 2]); }
          else if (t === 4) g.box([x, y, 0.06], [0.72, 0.09, 0.04], '#e2c81f', [0, 0, (random() - 0.5) * 0.2]);
          else if (t === 5) { g.disc([x + 0.08, y - 0.02, 0.07], 0.2, 0.015, '#cfd3d5'); g.box([x - 0.06, y + 0.1, 0.11], [0.3, 0.2, 0.14], handle); g.disc([x + 0.08, y - 0.02, 0.085], 0.05, 0.01, '#33363a'); }
          else { g.disc([x, y, 0.07], 0.2, 0.06, '#d9642a'); g.disc([x, y, 0.105], 0.12, 0.012, '#a98458'); }
        }
      } else if (kind === 'televisions') {
        const tiers = Math.max(2, Math.floor(H / 1.15)), tierH = H / tiers;
        for (let tier = 0; tier < tiers; tier++) {
          const y0 = r.v0 + tier * tierH;
          g.box([(r.u0 + r.u1) / 2, y0 + 0.03, 0.3], [W, 0.06, 0.6], '#5f5a52');
          for (let x = r.u0 + 0.08; x < r.u1 - 0.5; ) {
            const flat = random() < 0.3, w = Math.min(r.u1 - x - 0.05, 0.6 + random() * 0.6), h = Math.min(tierH - 0.16, flat ? w * 0.6 : w * 0.82);
            if (present()) {
              if (random() < 0.22) {
                const n = 2 + Math.floor(random() * 3);
                for (let k = 0; k < n; k++) { const face = pick(random, ['#c5c9cb', '#1c1d21', '#d6cdb6']); g.box([x + w / 2, y0 + 0.06 + (k + 0.5) * (h / n), 0.3], [w * 0.95, h / n - 0.02, 0.5], face); g.box([x + w / 2 + w * 0.3, y0 + 0.06 + (k + 0.5) * (h / n), 0.555], [w * 0.14, h / n * 0.45, 0.02], '#111113'); }
              } else {
                const shellC = flat ? '#141416' : pick(random, ['#2a2a2e', '#6a4a2c', '#b9b3a2', '#3a3c42', '#8a8a86']);
                const dz = flat ? 0.08 : 0.5;
                g.box([x + w / 2, y0 + 0.06 + h / 2, flat ? 0.34 : 0.28], [w, h, dz], shellC);
                const sw = flat ? w * 0.94 : w * 0.74, sh = flat ? h * 0.9 : h * 0.72, sx = x + (flat ? w / 2 : w * 0.42), sy = y0 + 0.06 + h / 2 + (flat ? 0 : h * 0.02), szz = (flat ? 0.34 : 0.28) + dz / 2 + 0.006;
                const on = random() < mix(0.08, 0.4, mood.energy);
                if (on) g.lit([sx, sy, szz], [sw, sh, 0.012], pick(random, ['#9fc4e8', '#cfe0d0', '#e8d6a0', '#8fb0ff', '#d8e8f0']));
                else g.box([sx, sy, szz], [sw, sh, 0.012], '#27302f');
                if (!flat) { g.disc([x + w * 0.9, sy + sh * 0.25, szz], w * 0.045, 0.02, '#c3c7c9'); g.disc([x + w * 0.9, sy, szz], w * 0.045, 0.02, '#c3c7c9'); }
                if (random() < 0.5) g.box([x + w * 0.2, y0 + 0.06 + h * 0.86, szz + 0.01], [0.16, 0.1, 0.004], pick(random, ['#f6ff3a', '#f6f1e0', '#ff8a2a']), [0, 0, (random() - 0.5) * 0.4]);
              }
            }
            x += w + 0.1;
          }
        }
      } else if (kind === 'guns') {
        const rackTop = r.v0 + H * 0.62;
        const bays = Math.max(1, Math.floor(W / 1.9)), bayW = W / bays;
        for (let b = 0; b < bays; b++) {
          const cx = r.u0 + (b + 0.5) * bayW;
          for (const sgn of [-1, 1]) g.box([cx + sgn * 0.55, (r.v0 + rackTop) / 2, 0.06], [0.09, rackTop - r.v0 - 0.1, 0.12], '#6a4a2c');
          for (let y = r.v0 + 0.3; y < rackTop - 0.1; y += 0.36) {
            for (const sgn of [-1, 1]) g.box([cx + sgn * 0.55, y - 0.07, 0.16], [0.06, 0.04, 0.1], '#3a2618');
            if (!present()) continue;
            const flip = random() < 0.5 ? -1 : 1, wood = pick(random, ['#7a4a28', '#5a3418', '#9a6a3a', '#2a2a2e', '#4a5a3a']);
            g.box([cx - flip * 0.5, y - 0.02, 0.17], [0.52, 0.13, 0.05], wood, [0, 0, flip * 0.07]);
            g.box([cx + flip * 0.12, y + 0.02, 0.17], [0.95, 0.04, 0.04], '#2a2c30');
            if (random() < 0.4) g.rod([cx - flip * 0.1, y + 0.07, 0.17], 0.025, 0.36, '#1a1a1d', [0, 0, Math.PI / 2]);
          }
        }
        // rods and trophies above
        for (let x = r.u0 + 0.2; x < r.u1 - 0.1; x += 0.24) {
          if (random() > fill * 0.8) continue;
          const len = (r.v1 - rackTop) * (0.75 + random() * 0.22);
          g.rod([x, rackTop + 0.1 + len / 2, 0.06], 0.012, len, pick(random, ['#2a2a2e', '#7a2a22', '#3a5a3a', '#c9a264']), [0, 0, (random() - 0.5) * 0.06]);
          g.disc([x + 0.04, rackTop + 0.34, 0.09], 0.055, 0.05, '#c3c7c9');
        }
        const fx = r.u0 + W * (0.3 + random() * 0.4), fy = r.v1 - 0.45;
        g.disc([fx, fy, 0.05], 0.55, 0.04, '#6a4a2c', [1, 0.42]);
        g.disc([fx - 0.04, fy, 0.11], 0.36, 0.08, pick(random, ['#6f8a5a', '#8fa0a8', '#b98a52']), [1, 0.36]);
        g.box([fx + 0.36, fy, 0.11], [0.16, 0.2, 0.03], '#5f7a4a', [0, 0, 0.78]);
      } else {
        for (let y = r.v0 + 0.45; y < r.v1 - 0.3; y += 0.92) for (let x = r.u0 + 0.5; x < r.u1 - 0.35; x += 0.95) {
          if (!present()) { g.rod([x, y + 0.2, 0.03], 0.012, 0.05, '#55504a', [Math.PI / 2, 0, 0]); continue; }
          const jx = x + (random() - 0.5) * 0.16, jy = y + (random() - 0.5) * 0.16, t = random();
          const lean: V3 = [0, 0, (random() - 0.5) * mix(0.02, 0.22, mood.wear)];
          if (t < 0.36) {
            const rr = 0.24 + random() * 0.14;
            g.disc([jx, jy, 0.05], rr, 0.08, pick(random, ['#3a2618', '#c9a23e', '#1c1c1f', '#c8262b', '#e9e4d6']));
            g.disc([jx, jy, 0.095], rr * 0.84, 0.01, '#f3efe2');
            g.box([jx, jy + rr * 0.25, 0.105], [0.02, rr * 0.5, 0.006], '#141416', [0, 0, random() * 6]);
            g.box([jx + rr * 0.15, jy, 0.105], [rr * 0.36, 0.02, 0.006], '#141416', [0, 0, random() * 6]);
          } else if (t < 0.75) {
            const w = 0.5 + random() * 0.32, h = 0.42 + random() * 0.36;
            g.box([jx, jy, 0.04], [w, h, 0.06], pick(random, ['#c9a23e', '#3a2618', '#1c1c1f', '#e9e4d6', '#7a4a28']), lean);
            g.box([jx, jy, 0.075], [w - 0.12, h - 0.12, 0.006], pick(random, ['#7a9ab0', '#b98a52', '#5f7a5a', '#c8a8a0', '#3a4a6a', '#d8cfae', '#8a3a2a']), lean);
          } else if (t < 0.88) {
            const w = 0.42 + random() * 0.2, h = 0.7 + random() * 0.1;
            g.disc([jx, jy, 0.04], w / 2, 0.05, '#c9a23e', [1, h / w]);
            g.disc([jx, jy, 0.07], w / 2 - 0.05, 0.006, '#cfe0e6', [1, h / w]);
          } else {
            g.box([jx, jy, 0.1], [0.36, 0.4, 0.2], '#6a3f22');
            for (const sgn of [-1, 1]) g.box([jx + sgn * 0.11, jy + 0.26, 0.1], [0.3, 0.05, 0.24], '#4a2a16', [0, 0, -sgn * 0.7]);
            g.disc([jx, jy + 0.03, 0.205], 0.1, 0.01, '#f3efe2');
            g.rod([jx, jy - 0.42, 0.1], 0.008, 0.45, '#c9a23e');
            g.disc([jx, jy - 0.66, 0.1], 0.06, 0.02, '#c9a23e');
          }
        }
      }
    };
    const secondary: Fill = { 'strip-mall': 'televisions', 'old-city': 'clocks', 'hong-kong': 'clocks', rural: 'guns' }[a.shop] as Fill;
    const main: Fill = a.walls === 'everything' ? 'guitars' : a.walls;
    const backGoods = new Goods();
    const backGroup = new THREE.Group();
    backGroup.position.set(0, 0, inBack);
    root.add(backGroup);
    const V0 = 0.36, V1 = 3.86;
    const backRight = a.behind === 'parcels' ? 3.3 : a.behind === 'safe' ? 4.9 : WD / 2 - 0.2;
    const backRect: Rect = { u0: -WD / 2 + 0.35, u1: backRight, v0: V0, v1: V1 };
    if (a.walls === 'everything') {
      const third = (backRect.u1 - backRect.u0) / 3;
      const order = (['guitars', 'televisions', 'tools'] as Fill[]).sort(() => random() - 0.5);
      order.forEach((k, i) => gFill(backGoods, k, { ...backRect, u0: backRect.u0 + i * third + 0.05, u1: backRect.u0 + (i + 1) * third - 0.05 }));
    } else gFill(backGoods, main, backRect);
    backGoods.into(backGroup);
    const leftGoods = new Goods();
    const leftGroup = new THREE.Group();
    leftGroup.position.set(inLeft, 0, 0);
    leftGroup.rotation.y = Math.PI / 2;
    root.add(leftGroup);
    const leftKind: Fill = main === secondary ? 'tools' : secondary;
    gFill(leftGoods, leftKind, { u0: -WIN.z0 + 0.35, u1: DP / 2 - 0.3, v0: V0, v1: V1 });
    // a narrow strip between the window and the door takes one more column of whatever fits
    gFill(leftGoods, 'clocks', { u0: -DOOR.z0 - 0.02, u1: -WIN.z1 + 0.02, v0: 1.3, v1: 3.9 });
    leftGoods.into(leftGroup);

    // ---- the big sign ----
    const signText = SIGNS[a.sign];
    const signStyle = {
      'strip-mall': { paper: '#f0d23a', ink: '#141416', font: 'bold SIZEpx sans-serif' },
      'old-city': { paper: '#1f3a2c', ink: '#e9c85a', font: 'bold SIZEpx serif' },
      'hong-kong': { paper: '#a8231f', ink: '#f0d27a', font: 'bold SIZEpx serif' },
      rural: { paper: '#7a5530', ink: '#f3efe2', font: 'bold SIZEpx monospace' },
    }[a.shop];
    const signW = Math.min(7.5, signText.length * 0.5 + 1.6), signH = 0.82;
    const signTex = painted(1024, Math.round(1024 * signH / signW), (ctx, w, h) => {
      ctx.fillStyle = signStyle.paper;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = signStyle.ink;
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = signStyle.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = signStyle.font.replace('SIZE', String(Math.min(h * 0.62, (w / signText.length) * 1.5)));
      ctx.fillText(signText, w / 2, h / 2 + 3, w - (hk ? 260 : 60));
      if (hk) for (const cx of [70, w - 70]) {
        // the pawn house emblem: a bat spread over a coin
        ctx.beginPath(); ctx.arc(cx, h * 0.62, h * 0.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 56, h * 0.2); ctx.quadraticCurveTo(cx - 28, h * 0.5, cx, h * 0.3); ctx.quadraticCurveTo(cx + 28, h * 0.5, cx + 56, h * 0.2); ctx.quadraticCurveTo(cx + 30, h * 0.26, cx, h * 0.16); ctx.quadraticCurveTo(cx - 30, h * 0.26, cx - 56, h * 0.2); ctx.fill();
        ctx.fillStyle = signStyle.paper; ctx.fillRect(cx - 9, h * 0.62 - 9, 18, 18); ctx.fillStyle = signStyle.ink;
      }
    });
    const bigSign = card(signW, signH, signTex);
    bigSign.position.set(Math.min(0.4, backRight - signW / 2 - 0.2), WH - 0.62, inBack + 0.05);
    bigSign.rotation.z = (random() - 0.5) * 0.02 * (1 + mood.wear * 3);
    root.add(bigSign);
    s.box([signW + 0.1, signH + 0.1, 0.04], [bigSign.position.x, WH - 0.62, inBack + 0.02], trimMat).rotation.z = bigSign.rotation.z;

    // ---- window, bars, door ----
    const winMidZ = (WIN.z0 + WIN.z1) / 2, winMidY = (WIN.y0 + WIN.y1) / 2, winW = WIN.z1 - WIN.z0, winH = WIN.y1 - WIN.y0;
    const neonHue = new THREE.Color(pick(random, mood.warmth > 0.5 ? ['#ff2a3c', '#ff4fb8', '#ffae2a'] : ['#ff4fb8', '#4fcfff', '#b06bff']));
    const sky = a.window === 'neon'
      ? new THREE.Color('#5d5873')
      : new THREE.Color('#e6f0f4').lerp(new THREE.Color(mood.warmth > 0.4 ? '#f3b27a' : '#b9c6e0'), dusk * 0.85);
    if (a.window === 'painted') sky.lerp(new THREE.Color('#e9e2c8'), 0.7);
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ color: sky }));
    outside.rotation.y = Math.PI / 2;
    outside.position.set(leftX - 0.06, winMidY, winMidZ);
    root.add(outside);
    s.box([0.3, 0.07, winW + 0.2], [inLeft + 0.06, WIN.y0 - 0.02, winMidZ], trimMat);
    s.box([0.26, 0.09, winW + 0.2], [inLeft + 0.02, WIN.y1 + 0.03, winMidZ], trimMat);
    for (const z of [WIN.z0 - 0.05, WIN.z1 + 0.05]) s.box([0.26, winH + 0.1, 0.1], [inLeft + 0.02, winMidY, z], trimMat);
    const bars = new Batch(new THREE.CylinderGeometry(0.028, 0.028, 1, 6), s.material('#3a3d40', { metalness: 0.4, roughness: 0.5 }));
    const NB = 9;
    for (let i = 0; i < NB; i++) bars.add([inLeft + 0.02, winMidY, WIN.z0 + (i + 0.5) * (winW / NB)], [1, winH, 1]);
    for (const y of [WIN.y0 + winH * 0.3, WIN.y0 + winH * 0.72]) bars.add([inLeft + 0.02, y, winMidZ], [1.2, winW, 1.2], [Math.PI / 2, 0, 0]);
    bars.into(root);
    let neonMat: THREE.MeshBasicMaterial | null = null;
    if (a.window === 'neon') {
      const word = a.sign === 'gold' ? 'GOLD' : a.sign === 'pawn' || a.sign === 'lent' ? 'PAWN' : a.sign === 'loans' ? 'LOANS' : 'OPEN';
      const tex = painted(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#17171c';
        ctx.fillRect(0, 0, w, h);
        const css = '#' + neonHue.getHexString();
        ctx.shadowColor = css;
        ctx.shadowBlur = 26;
        ctx.strokeStyle = css;
        ctx.lineWidth = 9;
        ctx.strokeRect(26, 26, w - 52, h - 52);
        ctx.font = 'bold 120px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#fff4f0';
        ctx.strokeText(word, w / 2, h / 2 + 6, w - 110);
        ctx.strokeStyle = css;
        ctx.lineWidth = 4;
        ctx.strokeText(word, w / 2, h / 2 + 6, w - 110);
      });
      neonMat = new THREE.MeshBasicMaterial({ map: tex });
      const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), neonMat);
      neon.rotation.y = Math.PI / 2;
      neon.position.set(inLeft + 0.2, winMidY + 0.1, winMidZ);
      root.add(neon);
      s.box([0.05, 1.21, 2.36], [inLeft + 0.17, winMidY + 0.1, winMidZ], dark);
      for (const z of [-0.9, 0.9]) s.rod([inLeft + 0.18, winMidY + 0.7, winMidZ + z], [inLeft + 0.1, WIN.y1, winMidZ + z], 0.012, metal);
    } else if (a.window === 'shutter') {
      const drop = mix(0.4, 0.62, random()) * winH;
      const slatMat = s.material('#8f979a', { metalness: 0.4, roughness: 0.5 });
      s.box([0.03, drop, winW], [leftX + 0.02, WIN.y1 - drop / 2, winMidZ], slatMat);
      const slats = new Batch(new THREE.BoxGeometry(0.025, 0.03, 1), s.material('#6f777a', { metalness: 0.4 }));
      for (let y = WIN.y1 - 0.06; y > WIN.y1 - drop; y -= 0.14) slats.add([leftX + 0.04, y, winMidZ], [1, 1, winW]);
      slats.into(root);
    } else if (a.window === 'painted') {
      const tex = painted(512, 320, (ctx, w, h) => {
        ctx.fillStyle = '#efe7cc';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 40; i++) ctx.fillRect(random() * w, 0, 6 + random() * 20, h);
        ctx.textAlign = 'center';
        ctx.font = 'italic bold 86px cursive, serif';
        ctx.fillStyle = '#b3201d';
        ctx.fillText('LOANS', w / 2, 110, w - 40);
        ctx.font = 'italic bold 54px cursive, serif';
        ctx.fillStyle = '#1f3a8a';
        ctx.fillText('gold · tools · guns', w / 2, 200, w - 40);
        ctx.fillStyle = '#b3201d';
        ctx.fillText('NO QUESTIONS', w / 2, 276, w - 40);
      });
      const pane = card(winW, winH, tex, { emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.45 });
      pane.rotation.y = Math.PI / 2;
      pane.position.set(leftX - 0.02, winMidY, winMidZ);
      root.add(pane);
    }
    // light through the bars, laid on the floor as a patch crossed by bar shadows
    {
      const elev = mix(0.42, 1.0, 1 - dusk);
      const near = WIN.y0 / Math.tan(elev), far = (a.window === 'shutter' ? WIN.y0 + winH * 0.45 : WIN.y1) / Math.tan(elev);
      const skew = (0.5 - mood.daylight) * 1.1 + 0.12;
      const quad = (x0: number, x1: number, z0: number, z1: number, out: number[]) => {
        const p = (x: number, z: number) => [inLeft + x, 0, z + x * skew];
        const [A, B, C, Dd] = [p(x0, z0), p(x0, z1), p(x1, z1), p(x1, z0)];
        out.push(...A, ...B, ...C, ...A, ...C, ...Dd);
      };
      const makeMesh = (verts: number[], colour: THREE.ColorRepresentation, opacity: number, y: number) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
        mesh.position.y = y;
        root.add(mesh);
        return mesh;
      };
      const strength = a.window === 'painted' ? 0.35 : 1;
      const lightColour = a.window === 'neon' ? neonHue.clone().lerp(new THREE.Color('#ffffff'), 0.25) : new THREE.Color('#fff8e0').lerp(new THREE.Color(mood.warmth > 0.4 ? '#ffb057' : '#cfdcff'), dusk * 0.8);
      const lightVerts: number[] = [], shadeVerts: number[] = [];
      quad(near, far, WIN.z0, WIN.z1, lightVerts);
      for (let i = 0; i < NB; i++) { const z = WIN.z0 + (i + 0.5) * (winW / NB); quad(near, far, z - 0.06, z + 0.06, shadeVerts); }
      for (const f of [0.3, 0.72]) { const x = (WIN.y0 + winH * f) / Math.tan(elev); if (x < far) quad(x - 0.07, x + 0.07, WIN.z0, WIN.z1, shadeVerts); }
      makeMesh(lightVerts, lightColour, mix(0.3, 0.55, dusk) * strength, 0.012);
      makeMesh(shadeVerts, '#2c2620', 0.42 * strength, 0.016);
    }
    // the door, ajar, with a bell
    const doorMidZ = (DOOR.z0 + DOOR.z1) / 2;
    for (const z of [DOOR.z0 - 0.05, DOOR.z1 + 0.05]) s.box([0.26, DOOR.y1, 0.1], [inLeft + 0.02, DOOR.y1 / 2, z], trimMat);
    s.box([0.26, 0.1, DOOR.z1 - DOOR.z0 + 0.2], [inLeft + 0.02, DOOR.y1 + 0.05, doorMidZ], trimMat);
    const doorLeaf = new THREE.Group();
    doorLeaf.position.set(inLeft, 0, DOOR.z1);
    doorLeaf.rotation.y = -mix(0.25, 0.9, random());
    root.add(doorLeaf);
    const leafW = DOOR.z1 - DOOR.z0;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, DOOR.y1 - 0.06, leafW), trimMat);
    leaf.position.set(0, DOOR.y1 / 2, -leafW / 2);
    leaf.castShadow = true;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.09, DOOR.y1 * 0.5, leafW - 0.4), new THREE.MeshBasicMaterial({ color: sky.clone().lerp(new THREE.Color('#ffffff'), 0.2) }));
    pane.position.set(0, DOOR.y1 * 0.62, -leafW / 2);
    const push = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, leafW - 0.3), metal);
    push.position.set(0.02, DOOR.y1 * 0.33, -leafW / 2);
    doorLeaf.add(leaf, pane, push);
    const openCard = card(0.5, 0.3, painted(200, 120, (ctx, w, h) => { ctx.fillStyle = a.state === 'break-in' ? '#f6f3ea' : '#c8202c'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = a.state === 'break-in' ? '#c8202c' : '#fff'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.state === 'break-in' ? 'CLOSED' : 'OPEN', w / 2, h / 2 + 4, w - 16); }));
    openCard.rotation.y = Math.PI / 2;
    openCard.position.set(0.06, DOOR.y1 * 0.66, -leafW / 2);
    doorLeaf.add(openCard);
    s.rod([inLeft + 0.02, DOOR.y1 + 0.2, doorMidZ], [inLeft + 0.3, DOOR.y1 + 0.26, doorMidZ], 0.012, metal);
    s.lathe([[0, 0.12], [0.04, 0.11], [0.07, 0.06], [0.1, 0]], s.material('#c9a23e', { metalness: 0.5, roughness: 0.3, emissive: '#4a3a10', emissiveIntensity: 0.5 }), [inLeft + 0.3, DOOR.y1 + 0.1, doorMidZ]);
    if (a.shop === 'old-city' || a.shop === 'strip-mall') {
      // the three balls
      const gold = s.material('#e7b93c', { metalness: 0.5, roughness: 0.3, emissive: '#5a4a22', emissiveIntensity: 0.6 });
      const bx = inLeft + 0.75, bz = WIN.z1 + 0.55, by = 4.3;
      s.rod([inLeft, by + 0.3, bz], [bx + 0.1, by + 0.3, bz], 0.02, dark);
      for (const [dz, dy] of [[-0.24, 0], [0.24, 0], [0, -0.3]] as const) { s.rod([bx, by + 0.3, bz + dz * 0.6], [bx, by + dy, bz + dz], 0.008, dark); s.ball([0.15, 0.15, 0.15], [bx, by + dy - 0.14, bz + dz], gold, 16); }
    }

    // ---- counters ----
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1ee', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
    const counterMat = s.material(P.counter, { roughness: 0.55 });
    const velvetColour = new THREE.Color(a.cases === 'pistols' ? '#1f4a35' : P.velvet).lerp(new THREE.Color('#8a8272'), mood.wear * 0.25);
    const velvetMat = s.material(velvetColour, { roughness: 1, emissive: velvetColour, emissiveIntensity: 0.25 });
    const stock = new Goods();
    const caseFill = a.cases === 'bare' ? 0.12 : fill;
    const smashed = a.state === 'break-in';
    /** A glass display run. `alongX` runs left-right; otherwise front-back with customers on the +x side. */
    const counterRun = (cx: number, cz: number, length: number, alongX: boolean, boardAt = -99) => {
      const depth = 0.95, baseH = 0.72;
      const size = (l: number, h: number, d: number): V3 => (alongX ? [l, h, d] : [d, h, l]);
      const at = (along: number, y: number, across: number): V3 => (alongX ? [cx + along, y, cz + across] : [cx + across, y, cz + along]);
      s.box(size(length, baseH - 0.1, depth), at(0, 0.1 + (baseH - 0.1) / 2, 0), counterMat);
      s.box(size(length - 0.1, 0.1, depth - 0.1), at(0, 0.05, 0), dark);
      s.box(size(length + 0.04, 0.05, depth + 0.04), at(0, baseH, 0), metal);
      if (a.shop === 'old-city') for (let k = -1; k <= 1; k++) s.box(size(length / 3 - 0.3, baseH - 0.36, 0.03), at(k * length / 3, 0.42, depth / 2 + 0.01), s.material('#8f5c34'));
      if (a.shop === 'strip-mall') s.box(size(length + 0.01, 0.05, depth + 0.01), at(0, 0.3, 0), metal);
      // glass box and frame
      const gh = CH - baseH;
      s.box(size(length, gh, 0.02), at(0, baseH + gh / 2, depth / 2 - 0.02), glass);
      s.box(size(length, 0.02, depth), at(0, CH - 0.01, 0), glass);
      s.box(size(length, gh, 0.04), at(0, baseH + gh / 2, -depth / 2 + 0.02), counterMat);
      for (const e of [-1, 1]) s.box(size(length, 0.04, 0.04), at(0, CH - 0.02, e * (depth / 2 - 0.02)), metal);
      const posts = Math.max(2, Math.round(length / 1.9));
      for (let i = 0; i <= posts; i++) {
        const along = -length / 2 + (i / posts) * length;
        s.box(size(0.04, gh, 0.04), at(along, baseH + gh / 2, depth / 2 - 0.02), metal);
        s.box(size(0.04, 0.04, depth), at(along, CH - 0.02, 0), metal);
      }
      // sloped deck and what lies on it
      const deck = s.box(size(length - 0.06, 0.04, depth - 0.1), at(0, baseH + 0.2, 0), velvetMat);
      const tilt = 0.28;
      if (alongX) deck.rotation.x = tilt; else deck.rotation.z = -tilt;
      const cells = Math.floor(length / 0.62);
      for (let i = 0; i < cells; i++) for (let row = 0; row < 2; row++) {
        const along = -length / 2 + (i + 0.5) * (length / cells), across = (row - 0.5) * 0.4, y = baseH + 0.235 - across * Math.tan(tilt);
        if (Math.abs(along - boardAt) < 0.9) continue;
        const rot: V3 = alongX ? [tilt, 0, 0] : [0, 0, -tilt];
        const padCol = velvetColour.clone().offsetHSL(0, 0, 0.07);
        stock.box(at(along, y, across), size(length / cells - 0.08, 0.02, 0.34), padCol, rot);
        const n = a.cases === 'watches' ? 3 : a.cases === 'pistols' ? 1 : 4;
        for (let k = 0; k < n; k++) {
          if (random() > caseFill) continue;
          const da = (k - (n - 1) / 2) * ((length / cells - 0.16) / n), p = at(along + da, y + 0.03, across + (random() - 0.5) * 0.12);
          if (a.cases === 'watches') { stock.box(p, size(0.05, 0.015, 0.28), pick(random, ['#15151a', '#5b3620', '#c9a23e', '#cfd3d5']), rot); stock.box([p[0], p[1] + 0.015, p[2]], [0.08, 0.02, 0.08], pick(random, ['#f6f3e8', '#e7b93c', '#11151c']), rot); }
          else if (a.cases === 'pistols') { if (random() < 0.6) { stock.box(p, size(0.34, 0.03, 0.09), '#2a2c30', rot); stock.box(at(along + da - 0.11, y + 0.03, across + 0.09), size(0.1, 0.03, 0.16), pick(random, ['#3a2618', '#1a1a1d']), rot); } else { stock.box(p, size(0.14, 0.09, 0.14), '#c3c7c9', rot); stock.box([p[0], p[1] + 0.03, p[2]], [0.06, 0.06, 0.06], '#2a2c30', rot); } }
          else if (a.cases === 'knives') { const t = random(); if (t < 0.5) { stock.box(p, size(0.035, 0.02, 0.24), '#cfd3d5', rot); stock.box(at(along + da, y + 0.035, across + 0.1), size(0.045, 0.03, 0.12), pick(random, ['#7a2a22', '#3a2618', '#1a1a1d', '#e9e4d6']), rot); } else stock.box(p, size(0.07, 0.03, 0.07), pick(random, ['#e7b93c', '#cfd3d5', '#b8703f']), rot); }
          else stock.box(p, size(0.045 + random() * 0.05, 0.03, 0.045 + random() * 0.12), pick(random, ['#e7b93c', '#e7b93c', '#f2cf5a', '#cfd3d5', '#dc9a72']), rot);
        }
      }
    };
    counterRun(-4.1, 0.45, 5.3, false, smashed ? 1.2 : -99);
    const tallH = 2.6;
    if (hk) {
      // the towering counter of a Hong Kong pawn house, bars up to the ceiling
      const len = 9.6, cx = 0.95, cz = -2.7;
      s.box([len, tallH, 1.0], [cx, tallH / 2, cz], counterMat);
      const panel = s.material('#8a3f2c');
      for (let i = 0; i < 6; i++) s.box([len / 6 - 0.3, tallH - 0.7, 0.04], [cx - len / 2 + (i + 0.5) * (len / 6), tallH / 2 - 0.05, cz + 0.51], panel);
      s.box([len + 0.1, 0.1, 1.16], [cx, tallH + 0.05, cz], s.material('#3f1c14'));
      s.box([len + 0.1, 0.16, 0.16], [cx, 4.2, cz + 0.4], s.material('#3f1c14'));
      const iron = new Batch(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), s.material('#2c2f33', { metalness: 0.4, roughness: 0.5 }));
      const gapAt = cx + 0.4;
      for (let x = cx - len / 2 + 0.15; x < cx + len / 2; x += 0.3) {
        const inGap = Math.abs(x - gapAt) < 0.62;
        iron.add([x, inGap ? 3.85 : (tallH + 4.2) / 2, cz + 0.4], [1, inGap ? 0.6 : 4.2 - tallH, 1]);
      }
      iron.add([cx, 3.55, cz + 0.4], [1, len, 1], [0, 0, Math.PI / 2]);
      iron.into(root);
      s.box([1.3, 0.06, 0.5], [gapAt, tallH + 0.13, cz + 0.6], metal);
      // red boards with gold strokes either side of the opening
      for (const sgn of [-1, 1]) {
        s.box([0.5, 1.9, 0.05], [gapAt + sgn * 2.4, 1.35, cz + 0.55], s.material('#a8231f'));
        for (let k = 0; k < 4; k++) s.box([0.26, 0.07, 0.02], [gapAt + sgn * 2.4, 2.0 - k * 0.42, cz + 0.585], s.material('#e9c85a', { emissive: '#5a4a22', emissiveIntensity: 0.5 })).rotation.z = (k % 2 ? 1 : -1) * 0.5;
      }
      // privacy screen by the door
      s.box([0.14, 2.7, 2.1], [-4.3, 1.35, 4.25], counterMat);
      s.box([0.2, 0.14, 2.3], [-4.3, 2.75, 4.25], s.material('#3f1c14'));
      s.cylinder(0.42, 0.42, 0.03, [-4.21, 1.7, 4.25], s.material('#e9c85a', { emissive: '#5a4a22', emissiveIntensity: 0.5 }), 20).rotation.z = Math.PI / 2;
    } else counterRun(1.0, -2.7, 9.2, true);
    stock.into(root);
    // the corner where the two runs meet
    s.box([1.0, CH, 1.0], [-4.1, CH / 2, -2.7], counterMat);
    s.box([1.06, 0.05, 1.06], [-4.1, CH + 0.025, -2.7], metal);

    // register on the corner block
    const regY = CH + 0.05;
    if (a.shop === 'old-city' || hk) {
      const brassy = s.material('#c9a23e', { metalness: 0.5, roughness: 0.35, emissive: '#3a2c10', emissiveIntensity: 0.5 });
      s.box([0.62, 0.3, 0.6], [-4.1, regY + 0.15, -2.7], brassy);
      s.box([0.56, 0.4, 0.3], [-4.1, regY + 0.5, -2.82], brassy).rotation.x = -0.25;
      s.box([0.4, 0.14, 0.05], [-4.1, regY + 0.78, -2.85], s.material('#f3efe2'));
      const keys = new Batch(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8), s.material('#f3efe2'));
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) keys.add([-4.3 + i * 0.1, regY + 0.33 + j * 0.03, -2.55 - j * 0.07]);
      keys.into(root);
    } else {
      s.box([0.6, 0.16, 0.6], [-4.1, regY + 0.08, -2.7], s.material('#3c4044'));
      s.box([0.5, 0.36, 0.06], [-4.1, regY + 0.4, -2.85], s.material('#2a2d30')).rotation.x = -0.25;
      s.box([0.4, 0.26, 0.01], [-4.1, regY + 0.41, -2.81], new THREE.MeshBasicMaterial({ color: '#8fe0a0' })).rotation.x = -0.25;
    }

    // ---- behind the counter ----
    let tvGlow: THREE.MeshBasicMaterial | null = null;
    if (a.behind === 'safe') {
      const iron = s.material('#27352e', { roughness: 0.5, metalness: 0.3 });
      const gold = s.material('#c9a23e', { metalness: 0.5, roughness: 0.3, emissive: '#3a2c10', emissiveIntensity: 0.6 });
      const sx = 5.95, sz = -4.45;
      s.box([1.6, 2.5, 1.4], [sx, 1.25, sz], iron);
      s.box([1.3, 2.1, 0.08], [sx, 1.3, sz + 0.72], s.material('#2f4238', { roughness: 0.45, metalness: 0.3 }));
      for (const [w, h] of [[1.14, 1.94], [1.02, 1.82]] as const) s.box([w, h, 0.01], [sx, 1.3, sz + 0.765 + (w < 1.1 ? 0.004 : 0)], w < 1.1 ? s.material('#2f4238') : gold);
      s.cylinder(0.14, 0.14, 0.08, [sx - 0.2, 1.45, sz + 0.8], gold, 20).rotation.x = Math.PI / 2;
      s.rod([sx + 0.15, 1.2, sz + 0.82], [sx + 0.5, 1.2, sz + 0.82], 0.03, gold);
      s.rod([sx + 0.32, 1.0, sz + 0.82], [sx + 0.32, 1.4, sz + 0.82], 0.03, gold);
      for (const y of [0.5, 2.1]) s.box([0.08, 0.24, 0.06], [sx + 0.68, y, sz + 0.74], gold);
      for (let i = 0; i < 3; i++) s.box([0.7 - i * 0.1, 0.09, 0.5], [sx - 0.2 + i * 0.05, 2.55 + i * 0.09, sz], s.material(pick(random, ['#7a2a22', '#22324a', '#3a2618', '#1f4a35']))).rotation.y = (random() - 0.5) * 0.3;
    } else if (a.behind === 'parcels') {
      const x0 = 3.45, x1 = WD / 2 - 0.15, z = inBack + 0.3;
      const wood = s.material('#7a5a38');
      for (const x of [x0, (x0 + x1) / 2, x1]) s.box([0.08, 4.0, 0.6], [x, 2.0, z], wood);
      const parcels = new Goods();
      for (let y = 0.3; y < 4.0; y += 0.62) {
        s.box([x1 - x0, 0.05, 0.6], [(x0 + x1) / 2, y, z], wood);
        for (let x = x0 + 0.12; x < x1 - 0.3; ) {
          const w = 0.26 + random() * 0.34, h = 0.18 + random() * 0.34;
          if (random() < fill) {
            parcels.box([x + w / 2, y + 0.03 + h / 2, z + 0.02], [w, h, 0.36 + random() * 0.14], pick(random, ['#b08a5a', '#a67c4a', '#c29a66', '#8a6a44', '#d8cfb8']));
            parcels.box([x + w / 2, y + 0.03 + h / 2, z + 0.02], [w + 0.006, 0.012, 0.52], '#e9e1c6');
            parcels.box([x + w * 0.5, y + 0.03 + h * 0.4, z + 0.3], [0.11, 0.15, 0.004], pick(random, ['#f2a7c0', '#f6f3ea', '#e2c583']), [0, 0, (random() - 0.5) * 0.5]);
          }
          x += w + 0.05;
        }
      }
      parcels.into(root);
    } else if (a.behind === 'cage' && !hk) {
      const x0 = 3.3, x1 = 5.6, z = -2.3;
      const wire = new Batch(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), s.material('#3a3d40', { metalness: 0.4 }));
      for (let x = x0; x <= x1 + 0.01; x += 0.115) { if (Math.abs(x - (x0 + x1) / 2) < 0.34) wire.add([x, 3.0, z], [1, 1.1, 1]); else wire.add([x, 2.5, z], [1, 2.1, 1]); }
      for (let y = CH + 0.14; y < 3.5; y += 0.14) { if (y < 2.45) { wire.add([(x0 + (x0 + x1) / 2 - 0.34) / 2, y, z], [1, (x1 - x0) / 2 - 0.34, 1], [0, 0, Math.PI / 2]); wire.add([(x1 + (x0 + x1) / 2 + 0.34) / 2, y, z], [1, (x1 - x0) / 2 - 0.34, 1], [0, 0, Math.PI / 2]); } else wire.add([(x0 + x1) / 2, y, z], [1, x1 - x0, 1], [0, 0, Math.PI / 2]); }
      wire.into(root);
      for (const x of [x0 - 0.03, x1 + 0.03]) s.box([0.08, 3.65 - CH, 0.08], [x, (CH + 3.65) / 2, z], trimMat);
      s.box([x1 - x0 + 0.14, 0.1, 0.1], [(x0 + x1) / 2, 3.6, z], trimMat);
      s.label('CASHIER', x1 - x0, 0.42, [(x0 + x1) / 2, 3.9, z], signStyle.ink, signStyle.paper);
      s.box([0.5, 0.03, 0.4], [(x0 + x1) / 2, CH + 0.03, z], metal);
      // green-shaded lamp inside
      s.cylinder(0.1, 0.12, 0.04, [x1 - 0.4, CH + 0.03, -2.85], dark, 12);
      s.rod([x1 - 0.4, CH + 0.03, -2.85], [x1 - 0.4, CH + 0.5, -2.85], 0.015, metal);
      s.box([0.5, 0.12, 0.2], [x1 - 0.4, CH + 0.56, -2.85], s.material('#2f6b4a', { emissive: '#1f5a3a', emissiveIntensity: 0.5 }));
      s.box([0.44, 0.02, 0.16], [x1 - 0.4, CH + 0.49, -2.85], new THREE.MeshBasicMaterial({ color: '#fff0b8' }));
    } else {
      // stool, portable television and the dog
      const dx = 5.6, dz = -4.3;
      s.cylinder(0.3, 0.3, 0.08, [3.4, 1.15, -4.1], s.material('#7a2a22'), 18);
      for (let i = 0; i < 4; i++) { const t = (i / 4) * 6.283 + 0.6; s.rod([3.4 + Math.cos(t) * 0.2, 1.1, -4.1 + Math.sin(t) * 0.2], [3.4 + Math.cos(t) * 0.32, 0, -4.1 + Math.sin(t) * 0.32], 0.022, metal); }
      s.cylinder(0.95, 0.95, 0.03, [dx, 0.02, dz], s.material(pick(random, ['#7a2a22', '#3a5a6a', '#8a6a3a']), { roughness: 1 }), 24).scale.set(1.2, 1, 0.8);
      const fur = s.material(pick(random, ['#8a5a34', '#c9a264', '#2a2a2c', '#b9b3a8']), { roughness: 1 });
      s.ball([0.6, 0.26, 0.36], [dx, 0.28, dz], fur, 16);
      s.ball([0.24, 0.2, 0.22], [dx - 0.62, 0.2, dz + 0.16], fur, 14);
      s.ball([0.16, 0.1, 0.1], [dx - 0.82, 0.14, dz + 0.22], fur, 10);
      for (const sgn of [-1, 1]) s.ball([0.09, 0.14, 0.05], [dx - 0.56, 0.24, dz + 0.16 + sgn * 0.19], s.material('#3a2618', { roughness: 1 }), 8);
      s.tube([[dx + 0.5, 0.2, dz], [dx + 0.75, 0.1, dz + 0.2], [dx + 0.6, 0.08, dz + 0.42]], 0.05, fur);
      s.box([0.7, 0.6, 0.6], [4.4, 0.3, -4.7], s.material('#8a6a44'));
      s.box([0.62, 0.5, 0.5], [4.4, 0.85, -4.7], s.material('#2a2a2e'));
      tvGlow = new THREE.MeshBasicMaterial({ color: '#a8cbe8' });
      s.box([0.44, 0.36, 0.02], [4.34, 0.86, -4.44], tvGlow);
      s.rod([4.5, 1.1, -4.7], [4.75, 1.6, -4.75], 0.008, metal);
      s.rod([4.5, 1.1, -4.7], [4.2, 1.55, -4.8], 0.008, metal);
    }

    // ---- ceiling beams and lights ----
    const lampMats: THREE.MeshBasicMaterial[] = [];
    const lampColour = new THREE.Color().setHSL(mix(0.56, 0.11, mood.warmth), 0.55, 0.86);
    let fan: THREE.Group | null = null;
    for (const bx of [-2.4, 3.2]) {
      if (a.shop === 'old-city') {
        for (const z of [-2.7, 0.2]) { s.rod([bx, WH - 0.28, z], [bx, 4.05, z], 0.012, metal); const m = new THREE.MeshBasicMaterial({ color: lampColour }); lampMats.push(m); s.ball([0.24, 0.24, 0.24], [bx, 3.85, z], m, 16); s.cylinder(0.08, 0.14, 0.08, [bx, 4.08, z], metal, 12); }
      } else if (hk && bx > 0) {
        fan = new THREE.Group();
        fan.position.set(bx, 4.2, 0.4);
        for (let i = 0; i < 3; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.22), s.material('#d8d2bd')); blade.position.set(Math.cos((i / 3) * 6.283) * 0.62, 0, Math.sin((i / 3) * 6.283) * 0.62); blade.rotation.y = -(i / 3) * 6.283; blade.castShadow = true; fan.add(blade); }
        root.add(fan);
        s.cylinder(0.12, 0.12, 0.16, [bx, 4.24, 0.4], metal, 12);
        s.rod([bx, 4.3, 0.4], [bx, WH - 0.28, 0.4], 0.02, metal);
      } else if (a.shop === 'rural') {
        s.rod([bx, WH - 0.28, 0.4], [bx, 4.0, 0.4], 0.006, dark);
        const m = new THREE.MeshBasicMaterial({ color: '#ffe2a0' });
        lampMats.push(m);
        s.ball([0.1, 0.13, 0.1], [bx, 3.9, 0.4], m, 10);
      }
    }
    if (a.shop !== 'old-city') {
      // strip lights fixed along the top of the walls, either side of the sign
      const tubeAt = (from: V3, to: V3) => {
        const alongX = Math.abs(to[0] - from[0]) > Math.abs(to[2] - from[2]);
        const len = alongX ? Math.abs(to[0] - from[0]) : Math.abs(to[2] - from[2]);
        if (len < 1) return;
        const mid: V3 = [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2];
        const m = new THREE.MeshBasicMaterial({ color: lampColour });
        lampMats.push(m);
        s.box(alongX ? [len, 0.1, 0.16] : [0.16, 0.1, len], mid, s.material('#d8d6cc'));
        s.box(alongX ? [len - 0.1, 0.06, 0.06] : [0.06, 0.06, len - 0.1], [mid[0] + (alongX ? 0 : 0.09), mid[1] - 0.06, mid[2] + (alongX ? 0.09 : 0)], m);
      };
      const sx = bigSign.position.x, y = WH - 0.62;
      tubeAt([-WD / 2 + 0.5, y, inBack + 0.1], [sx - signW / 2 - 0.35, y, inBack + 0.1]);
      tubeAt([sx + signW / 2 + 0.35, y, inBack + 0.1], [WD / 2 - 0.3, y, inBack + 0.1]);
      tubeAt([inLeft + 0.1, y, WIN.z0 + 0.2], [inLeft + 0.1, y, WIN.z1 - 0.2]);
    }

    // ---- what is going on ----
    const twinkles: THREE.MeshBasicMaterial[] = [];
    if (a.state === 'slow') {
      const paperMat = s.material('#e9e4d2');
      const np = s.box([0.7, 0.02, 0.5], [-4.1, CH + 0.02, 2.3], paperMat);
      np.rotation.y = 0.3;
      s.box([0.34, 0.006, 0.44], [-4.2, CH + 0.034, 2.26], s.material('#cfc9b6')).rotation.y = 0.3;
      s.cylinder(0.07, 0.06, 0.14, [-3.85, CH + 0.08, 1.8], s.material(pick(random, ['#f4f1e6', '#c8262b', '#2a5fb0'])), 12);
      // a mat at the door
      s.box([1.1, 0.02, 1.5], [-5.9, 0.012, doorMidZ], s.material('#3a3a3c', { roughness: 1 }));
    } else if (a.state === 'closing-sale') {
      const flags = new Batch(new THREE.ConeGeometry(0.16, 0.34, 3).rotateX(Math.PI), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }));
      const pts: V3[] = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([inLeft + t * (WD - 0.6), 4.25 - Math.sin(t * Math.PI) * 0.55, -1.7 + t * 0.6]); }
      s.tube(pts, 0.012, dark);
      pts.forEach((p, i) => { if (i > 0 && i < 24) flags.add([p[0], p[1] - 0.18, p[2]], [1, 1, 0.12], [0, 0, 0], ['#c8262b', '#f0d23a', '#f4f1e6', '#2a5fb0'][i % 4]); });
      flags.into(root);
      const banner = s.label('EVERYTHING MUST GO', 4.6, 0.52, [hk ? -1 : 1.2, hk ? 1.2 : 0.4, -2.7 + (hk ? 0.56 : 0.5)], '#fff6e0', '#c8202c');
      banner.rotation.z = (random() - 0.5) * 0.04;
      for (let i = 0; i < 4; i++) {
        const tagCard = s.label(pick(random, ['50% OFF', 'SALE', 'LAST DAY', '70% OFF']), 0.62, 0.3, [-3.55, 0.42, -1.4 + i * 1.25], '#141416', '#f6ff3a');
        tagCard.rotation.y = Math.PI / 2;
        tagCard.rotation.z = (random() - 0.5) * 0.3;
      }
      // boxes being packed
      for (let i = 0; i < 3; i++) { const b = s.box([0.8, 0.6, 0.7], [5.6 + (random() - 0.5) * 0.5, 0.3 + i * 0.6, 1.6 + (random() - 0.5) * 0.3], s.material('#b08a5a')); b.rotation.y = (random() - 0.5) * 0.6; }
    } else if (a.state === 'break-in') {
      const ply = s.box([1.0, 0.04, 1.75], [-4.1, CH + 0.03, 0.45 + 1.2], s.material('#c9a86a'));
      ply.rotation.y = (random() - 0.5) * 0.1;
      const front = s.box([0.04, CH - 0.74, 1.75], [-3.6, 1.09, 0.45 + 1.2], s.material('#c2a060'));
      front.rotation.x = (random() - 0.5) * 0.06;
      const shards = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#dff1ee', roughness: 0.1, emissive: '#bfe0dc', emissiveIntensity: 0.5 }));
      for (let i = 0; i < 46; i++) shards.add([-3.3 + random() * 1.5 * random(), 0.02, 0.6 + random() * 2.2], [0.05 + random() * 0.12, 0.012, 0.04 + random() * 0.1], [0, random() * 3, 0]);
      shards.into(root);
      const tapeTex = painted(512, 32, (ctx, w, h) => { ctx.fillStyle = '#f0d23a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#141416'; ctx.font = 'bold 22px sans-serif'; ctx.textBaseline = 'middle'; for (let x = 6; x < w; x += 256) ctx.fillText('POLICE LINE DO NOT CROSS', x, h / 2 + 1, 244); });
      tapeTex.wrapS = THREE.RepeatWrapping;
      const stretch = (from: V3, to: V3) => {
        const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), len = A.distanceTo(B);
        const tex = tapeTex.clone(); tex.needsUpdate = true; tex.repeat.set(len / 3, 1);
        const tape = card(len, 0.12, tex);
        tape.position.copy(A).add(B).multiplyScalar(0.5);
        tape.rotation.y = Math.atan2(-(B.z - A.z), B.x - A.x);
        tape.rotation.z = Math.atan2(B.y - A.y, Math.hypot(B.x - A.x, B.z - A.z));
        root.add(tape);
      };
      stretch([inLeft + 0.2, 1.5, DOOR.z0 - 0.1], [-3.5, 1.35, -1.9]);
      stretch([-3.5, 1.35, -1.9], [hk ? 5.6 : 5.9, 1.3, -2.15]);
      tapeTex.dispose();
      const stool = s.cylinder(0.3, 0.3, 0.08, [-1.2, 0.3, -0.9], s.material('#7a2a22'), 18);
      stool.rotation.z = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const t = (i / 4) * 6.283; s.rod([-1.16, 0.3 + Math.cos(t) * 0.2, -0.9 + Math.sin(t) * 0.2], [-0.1, 0.3 + Math.cos(t) * 0.3, -0.9 + Math.sin(t) * 0.3], 0.022, metal); }
    } else {
      const colours = ['#ff3b30', '#ffd23a', '#42e06a', '#4fa8ff', '#ff6fd0'];
      const bulbs = colours.map((c) => { const m = new THREE.MeshBasicMaterial({ color: c }); twinkles.push(m); return new Batch(new THREE.SphereGeometry(0.06, 8, 6), m); });
      const wirePts: V3[] = [];
      let n = 0;
      for (let x = -WD / 2 + 0.4; x < WD / 2 - 0.2; x += 0.34) { const y = WH - 0.36 - Math.abs(Math.sin(x * 2.2)) * 0.22; wirePts.push([x, y + 0.05, inBack + 0.1]); bulbs[n++ % 5].add([x, y, inBack + 0.12]); }
      s.tube(wirePts, 0.008, dark);
      const wire2: V3[] = [];
      for (let z = -DP / 2 + 0.4; z < DP / 2 - 0.2; z += 0.34) { const y = WH - 0.36 - Math.abs(Math.sin(z * 2.2)) * 0.22; wire2.push([inLeft + 0.1, y + 0.05, z]); bulbs[n++ % 5].add([inLeft + 0.12, y, z]); }
      s.tube(wire2, 0.008, dark);
      bulbs.forEach((b) => b.into(root));
      const tinsel = new Batch(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.4, emissive: '#333322', emissiveIntensity: 0.6 }));
      for (let z = -1.9; z < 3.0; z += 0.11) tinsel.add([-3.6, CH - 0.08 - Math.abs(Math.sin(z * 3)) * 0.16, z], [1, 1 + random(), 1], [random() * 3, random() * 3, 0], pick(random, ['#c8262b', '#e9c85a', '#2f9a52', '#cfd3d5']));
      if (!hk) for (let x = -3.4; x < 5.5; x += 0.11) tinsel.add([x, CH - 0.08 - Math.abs(Math.sin(x * 3)) * 0.16, -2.2], [1, 1 + random(), 1], [random() * 3, random() * 3, 0], pick(random, ['#c8262b', '#e9c85a', '#2f9a52', '#cfd3d5']));
      tinsel.into(root);
      // a small tinsel tree on the corner
      const green = s.material('#2f8a52', { roughness: 0.6, emissive: '#0f3a1f', emissiveIntensity: 0.5 });
      for (let i = 0; i < 4; i++) s.mesh(new THREE.ConeGeometry(0.34 - i * 0.07, 0.34, 9), green, [-4.1, CH + 0.3 + i * 0.22, 3.4]);
      s.ball([0.07, 0.07, 0.07], [-4.1, CH + 1.2, 3.4], new THREE.MeshBasicMaterial({ color: '#ffe066' }), 8);
    }
    // a customer-side stool and a rubber mat give the floor some scale
    s.cylinder(0.3, 0.3, 0.08, [-2.6, 1.1, -1.6], s.material('#2a2a2e'), 18);
    for (let i = 0; i < 4; i++) { const t = (i / 4) * 6.283 + 0.6; s.rod([-2.6 + Math.cos(t) * 0.2, 1.06, -1.6 + Math.sin(t) * 0.2], [-2.6 + Math.cos(t) * 0.33, 0, -1.6 + Math.sin(t) * 0.33], 0.022, metal); }

    // ---- life ----
    const nerves = mood.energy;
    const lampBase = lampMats.map((m) => m.color.clone());
    const twBase = twinkles.map((m) => m.color.clone());
    const neonBase = neonMat ? neonMat.color.clone() : null;
    const tvBase = tvGlow ? tvGlow.color.clone() : null;
    const seedPhase = random() * 100;
    world.update = (dt, time) => {
      if (fan) fan.rotation.y += dt * mix(0.4, 7, nerves);
      lampMats.forEach((m, i) => {
        const buzz = i === 1 && Math.sin(time * 31 + seedPhase) * Math.sin(time * 7.3 + seedPhase) > 1 - nerves * 0.5 ? 0.45 : 1;
        m.color.copy(lampBase[i]).multiplyScalar(buzz);
      });
      twinkles.forEach((m, i) => m.color.copy(twBase[i]).multiplyScalar(0.55 + 0.45 * (Math.sin(time * mix(1, 6, nerves) + i * 1.3) > 0 ? 1 : 0.3)));
      if (neonMat && neonBase) neonMat.color.copy(neonBase).multiplyScalar(Math.sin(time * 23 + seedPhase) * Math.sin(time * 3.1) > 1 - nerves * 0.4 ? 0.5 : 1);
      if (tvGlow && tvBase) tvGlow.color.copy(tvBase).multiplyScalar(0.8 + 0.2 * Math.sin(time * 9 + Math.sin(time * 2.3) * 4));
    };
    return world;
  },
});
