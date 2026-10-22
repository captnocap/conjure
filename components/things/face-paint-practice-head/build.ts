import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];
type Mode = 'paint' | 'guide';
const TAU = Math.PI * 2;

const PALETTES = {
  classic: { lip: '#c8102e', shade: '#6a2c91', accent: '#d4a72c', pop: '#1d6fd1' },
  jewel: { lip: '#8e1a5e', shade: '#0f7f86', accent: '#e0b23c', pop: '#5a2ea6' },
  neon: { lip: '#ff2d9a', shade: '#b6f01e', accent: '#19d7ff', pop: '#ff7a1a' },
  mono: { lip: '#18161a', shade: '#55535a', accent: '#b9b7bd', pop: '#2a282e' },
  pastel: { lip: '#f08fb0', shade: '#a9c8f2', accent: '#f7dc8c', pop: '#b8e6c8' },
} as const;

export default defineThing({
  questions: {
    look: choice('What look is being planned on the head?', {
      glam: 'Classic drag glam: a soaring cut-crease eye, winged liner, huge lashes, carved contour and overdrawn lips.',
      bolt: 'A red-and-blue lightning bolt slashed across one eye on a pale face, glam rock.',
      kumadori: 'Kabuki kumadori: a white face with bold sweeping stripes following the muscles.',
      pierrot: 'A sad white clown: thin arched brows, a line through each eye, one black tear and a tiny dark mouth.',
      sugarskull: 'A Day of the Dead sugar skull: black petalled eye sockets, a stitched grin and flowers.',
      clubkid: 'Club-kid graphic: a flat bright base, blocked-out eyes and rows of polka dots.',
      corpse: 'Black-metal corpse paint: a white face with jagged black eye pits that drip.',
    }),
    stage: choice('How finished is it?', {
      guides: 'Only dashed chalk guide lines so far; no colour yet.',
      half: 'One half of the face fully painted, the other still guide lines.',
      complete: 'Complete and crisp.',
      wiped: 'Finished, then half scrubbed off with cold cream in broad smears.',
    }),
    symmetry: choice('How symmetrical are the two sides?', {
      mirror: 'Mirrored exactly, a steady practised hand.',
      drifted: 'Meant to match but one side has drifted: larger, lower, crooked.',
      split: 'Deliberately two-faced: each side in a different colourway.',
    }),
    palette: choice('What colours dominate?', {
      classic: 'Red lips, violet shadow, gold highlights.',
      jewel: 'Plum, teal and antique gold.',
      neon: 'Hot pink, acid lime and cyan.',
      mono: 'Black, white and greys only.',
      pastel: 'Powder pink, baby blue and butter yellow.',
    }),
    form: choice('What is the practice head made of?', {
      canvas: 'A cream canvas block head with a centre seam.',
      vinyl: 'A pale pink vinyl training head.',
      brown: 'A deep brown vinyl training head.',
      foam: 'A white polystyrene wig head.',
    }),
    top: choice('What is on top of the head?', {
      bald: 'Nothing, a bare smooth scalp.',
      cap: 'A stocking wig cap pulled tight.',
      turban: 'A towel wound into a turban to keep it clean.',
    }),
    tools: choice('What has been left beside it?', {
      brushes: 'A jar bristling with brushes.',
      palette: 'An open palette of pans and a stained sponge.',
      reference: 'A reference photo of the finished look propped on a little stand.',
      nothing: 'Nothing; the head stands alone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pal = PALETTES[a.palette];
    const formColour = { canvas: '#d9c8a4', vinyl: '#e9c4ad', brown: '#7a4e36', foam: '#f2f1ec' }[a.form];
    const splitPal = PALETTES[({ classic: 'jewel', jewel: 'neon', neon: 'pastel', mono: 'classic', pastel: 'mono' } as const)[a.palette]];
    const clubBase = new THREE.Color().setHSL(random(), 0.75, 0.62).getStyle();
    const clubBaseAlt = new THREE.Color().setHSL(random(), 0.75, 0.55).getStyle();
    const jag = Array.from({ length: 14 }, () => random());

    /** Paint the face in millimetres: x right, y down, origin between the eyes and the mouth. */
    const paintFace = (stage: typeof a.stage) => {
      const W = 512, H = 736;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = formColour; ctx.fillRect(0, 0, W, H);
      if (a.form === 'canvas') {
        ctx.strokeStyle = 'rgba(120,100,70,0.18)'; ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        for (let x = 0; x < W; x += 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(90,70,45,0.6)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.translate(W / 2, H / 2); ctx.scale(3.2, 3.2);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const chalk = a.form === 'brown' ? '#f4f1e6' : '#2f5f9e';
      let mode: Mode = 'paint';
      let p: { lip: string; shade: string; accent: string; pop: string } = pal;
      const P = (path: () => void, fill?: string | null, stroke?: string | null, lw = 1) => {
        ctx.beginPath(); path();
        if (mode === 'guide') { ctx.setLineDash([2.5, 1.8]); ctx.lineWidth = 1.1; ctx.strokeStyle = chalk; ctx.stroke(); ctx.setLineDash([]); return; }
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
      };
      const eye = (iris: string) => {
        P(() => { ctx.moveTo(18, -11); ctx.quadraticCurveTo(31, -21, 45, -13); ctx.quadraticCurveTo(31, -5, 18, -11); }, '#fbfaf5', '#1a1416', 1);
        if (mode === 'paint') {
          P(() => ctx.arc(31, -12.6, 4.6, 0, TAU), iris);
          P(() => ctx.arc(31, -12.6, 2, 0, TAU), '#0c0a0c');
          P(() => ctx.arc(29.4, -14, 1, 0, TAU), '#ffffff');
        }
      };
      const lips = (colour: string, big = 1) => {
        P(() => { ctx.moveTo(0, 50 - big); ctx.quadraticCurveTo(4, 45 - big * 2, 9, 46 - big * 2); ctx.quadraticCurveTo(20, 48 - big, 24 + big * 4, 55); ctx.quadraticCurveTo(12, 54, 0, 55); ctx.closePath(); }, colour);
        P(() => { ctx.moveTo(0, 55); ctx.quadraticCurveTo(12, 54, 24 + big * 4, 55); ctx.quadraticCurveTo(15, 66 + big * 4, 0, 65 + big * 4); ctx.closePath(); }, colour);
        if (mode === 'paint') P(() => ctx.ellipse(8, 60 + big, 4, 1.3, -0.1, 0, TAU), 'rgba(255,255,255,0.55)');
      };
      const taper = (pts: number[], colour: string) => P(() => { ctx.moveTo(pts[0], pts[1]); ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); ctx.bezierCurveTo(pts[8], pts[9], pts[10], pts[11], pts[0], pts[1]); }, colour);

      const BASE: Record<typeof a.look, string | null> = { glam: null, bolt: '#f6ebe4', kumadori: '#fbfaf6', pierrot: '#fbfbfb', sugarskull: '#fafaf7', clubkid: clubBase, corpse: mood.wear > 0.5 ? '#dedcd2' : '#f2f2ee' };

      const side = (alt: boolean) => {
        if (a.look === 'glam') {
          P(() => ctx.ellipse(54, 24, 6, 24, 0.55, 0, TAU), 'rgba(110,62,36,0.5)');
          P(() => ctx.ellipse(47, 9, 13, 7.5, -0.3, 0, TAU), `rgba(240,80,125,${mix(0.3, 0.6, mood.cheer)})`);
          P(() => ctx.ellipse(8, -2, 2.4, 22, 0.05, 0, TAU), 'rgba(110,62,36,0.3)');
          P(() => { ctx.moveTo(14, -10); ctx.bezierCurveTo(16, -36, 48, -44, 64, -27); ctx.bezierCurveTo(54, -14, 34, -19, 14, -10); }, p.shade);
          P(() => { ctx.moveTo(16, -11); ctx.bezierCurveTo(22, -25, 42, -28, 56, -19); ctx.bezierCurveTo(46, -15, 32, -19, 16, -11); }, p.pop);
          P(() => ctx.ellipse(38, -33, 13, 2.6, -0.1, 0, TAU), 'rgba(255,244,214,0.85)');
          P(() => ctx.ellipse(22, -12, 3, 3, 0, 0, TAU), p.accent);
          eye('#4a7a5a');
          P(() => { ctx.moveTo(17, -11); ctx.quadraticCurveTo(31, -23.5, 46, -14); ctx.lineTo(66, -27); ctx.quadraticCurveTo(54, -9, 44, -10); ctx.quadraticCurveTo(31, -18, 17, -11); }, '#0e0c0e');
          for (let i = 0; i < 10; i++) { const t = i / 9, x = 20 + t * 28, y = -15.5 - Math.sin(t * Math.PI) * 5 + t * 1.5; P(() => { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2 + t * 5, y - 8, x + 5 + t * 11, y - 10 - t * 5 + rr(-1, 1)); }, null, '#0e0c0e', 1.1); }
          for (let i = 0; i < 6; i++) { const x = 24 + i * 4; P(() => { ctx.moveTo(x, -7.5); ctx.lineTo(x + 1.5, -3.5); }, null, '#0e0c0e', 0.7); }
          P(() => { ctx.moveTo(12, -31); ctx.quadraticCurveTo(34, -56, 64, -39); ctx.quadraticCurveTo(36, -50, 13, -27); ctx.closePath(); }, '#2e1a12');
          lips(p.lip, 2);
        } else if (a.look === 'bolt') {
          P(() => ctx.ellipse(52, 22, 5, 20, 0.5, 0, TAU), 'rgba(170,90,80,0.35)');
          P(() => { ctx.moveTo(15, -11); ctx.bezierCurveTo(18, -28, 44, -30, 52, -18); ctx.bezierCurveTo(42, -14, 30, -18, 15, -11); }, alt ? p.shade : 'rgba(230,120,150,0.75)');
          eye('#3d6fb0');
          lips(alt ? p.lip : '#d9486a', 0);
        } else if (a.look === 'kumadori') {
          const ink = alt ? '#27409e' : p.lip === '#18161a' ? '#18161a' : '#c8102e';
          taper([13, -5, 26, 12, 58, 8, 72, -36, 60, -6, 30, 0], ink);
          taper([5, -34, 8, -62, 30, -84, 54, -88, 32, -72, 18, -58], ink);
          taper([11, 22, 30, 24, 56, 36, 62, 62, 46, 44, 28, 36], ink);
          taper([5, 76, 16, 84, 28, 80, 38, 66, 26, 76, 14, 78], ink);
          taper([10, 6, 16, 16, 18, 26, 14, 34, 13, 24, 11, 14], ink);
          eye('#2a1c14');
          P(() => { ctx.moveTo(15, -12); ctx.quadraticCurveTo(31, -25, 48, -15); ctx.lineTo(58, -22); ctx.quadraticCurveTo(50, -11, 44, -11); ctx.quadraticCurveTo(31, -19, 15, -12); }, '#101010');
          P(() => { ctx.moveTo(10, -24); ctx.quadraticCurveTo(34, -44, 66, -56); ctx.quadraticCurveTo(40, -34, 12, -19); ctx.closePath(); }, '#101010');
          P(() => { ctx.moveTo(0, 52); ctx.quadraticCurveTo(14, 49, 25, 62); ctx.quadraticCurveTo(12, 57, 0, 58); ctx.closePath(); }, '#101010');
          P(() => { ctx.moveTo(0, 58); ctx.quadraticCurveTo(10, 58, 20, 60); ctx.quadraticCurveTo(10, 64, 0, 63); ctx.closePath(); }, ink);
        } else if (a.look === 'pierrot') {
          P(() => ctx.arc(47, 20, 9, 0, TAU), `rgba(240,110,150,${mix(0.2, 0.55, mood.cheer)})`);
          eye('#5a7fa8');
          P(() => { ctx.moveTo(18, -35); ctx.quadraticCurveTo(32, -49, 49, -37); }, null, '#101010', 1.6);
          P(() => { ctx.moveTo(31, -30); ctx.lineTo(31, 6); }, null, '#101010', 1.5);
          P(() => { ctx.moveTo(31, 8); ctx.lineTo(35, 14); ctx.lineTo(31, 20); ctx.lineTo(27, 14); ctx.closePath(); }, alt ? p.pop : p.shade);
          P(() => { ctx.moveTo(0, 50); ctx.quadraticCurveTo(4, 45, 9, 50); ctx.quadraticCurveTo(10, 56, 0, 64); ctx.closePath(); }, alt ? p.lip : '#141216');
        } else if (a.look === 'sugarskull') {
          for (let i = 0; i < 11; i++) { const ang = (i / 11) * TAU; P(() => ctx.arc(31 + Math.cos(ang) * 20, -13 + Math.sin(ang) * 20, 5, 0, TAU), i % 2 ? p.accent : alt ? p.pop : p.lip); }
          P(() => ctx.arc(31, -13, 16, 0, TAU), '#121014');
          P(() => ctx.arc(31, -13, 4, 0, TAU), p.pop);
          P(() => { ctx.moveTo(0, 56); ctx.quadraticCurveTo(22, 58, 44, 46); }, null, '#121014', 1.5);
          for (let i = 0; i < 8; i++) { const x = 3 + i * 5.4, y = 56 - Math.pow(i / 8, 2) * 8; P(() => { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); }, null, '#121014', 1.2); }
          P(() => { for (let t = 0; t < 26; t++) { const ang = t * 0.5, r = 1 + t * 0.42; const x = 50 + Math.cos(ang) * r, y = 22 + Math.sin(ang) * r; if (t) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }, null, alt ? p.lip : p.shade, 1.6);
          for (let i = 0; i < 6; i++) { const t = i / 5; P(() => ctx.arc(12 + t * 44, -40 - Math.sin(t * Math.PI) * 8, 2.2, 0, TAU), i % 2 ? p.shade : p.lip); }
          P(() => { ctx.moveTo(58, -6); ctx.quadraticCurveTo(70, -2, 68, 12); ctx.quadraticCurveTo(58, 6, 58, -6); }, p.shade);
          P(() => { ctx.moveTo(8, 76); ctx.quadraticCurveTo(20, 84, 30, 74); ctx.quadraticCurveTo(18, 76, 8, 76); }, p.lip);
        } else if (a.look === 'clubkid') {
          if (alt && mode === 'paint') P(() => ctx.rect(0, -115, 80, 230), clubBaseAlt);
          P(() => { ctx.moveTo(10, -36); ctx.lineTo(64, -44); ctx.lineTo(58, 2); ctx.lineTo(14, -2); ctx.closePath(); }, alt ? p.accent : p.shade);
          eye('#111111');
          P(() => { ctx.moveTo(22, -46); ctx.lineTo(31, -80); ctx.lineTo(40, -46); ctx.closePath(); }, '#141216');
          for (let gy = -92; gy <= 96; gy += 13) for (let gx = 9 + ((Math.round(gy / 13) % 2 + 2) % 2) * 6.5; gx < 72; gx += 13) {
            if ((gx * gx) / (68 * 68) + (gy * gy) / (100 * 100) > 1) continue;
            if (gx > 8 && gx < 66 && gy > -48 && gy < 6) continue;
            if (gx < 30 && gy > 44 && gy < 70) continue;
            P(() => ctx.arc(gx, gy, 3.1, 0, TAU), (Math.round(gx + gy) % 3 === 0) ? p.lip : alt ? '#141216' : '#ffffff');
          }
          P(() => { ctx.moveTo(0, 51); ctx.quadraticCurveTo(3, 47, 6, 50); ctx.lineTo(10, 55); ctx.quadraticCurveTo(5, 62, 0, 61); ctx.closePath(); }, '#141216');
        } else {
          P(() => { for (let i = 0; i < 14; i++) { const ang = (i / 14) * TAU, r = (i % 2 ? 13 : 21) + jag[i] * 7; const x = 31 + Math.cos(ang) * r * 1.15, y = -13 + Math.sin(ang) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); }, '#0e0d10');
          for (let i = 0; i < 4; i++) { const x = 18 + i * 8 + rr(-2, 2), len = rr(18, 52); P(() => { ctx.moveTo(x - 1.6, -2); ctx.lineTo(x + 1.6, -2); ctx.lineTo(x + rr(-1, 1), len); ctx.closePath(); }, '#0e0d10'); }
          eye(alt ? p.lip : '#9fb4c2');
          P(() => { ctx.moveTo(0, 51); ctx.lineTo(24, 54); ctx.quadraticCurveTo(12, 62, 0, 61); ctx.closePath(); }, '#0e0d10');
          for (const [x2, y2] of [[42, 46], [44, 60], [36, 70]]) P(() => { ctx.moveTo(22, 55); ctx.lineTo(x2, y2); }, null, '#0e0d10', 1.1);
          for (let i = 0; i < 3; i++) { const x = 12 + i * 16 + rr(-3, 3); P(() => { ctx.moveTo(x - 2, -100); ctx.lineTo(x + 2, -100); ctx.lineTo(x + rr(-1, 1), rr(-70, -46)); ctx.closePath(); }, '#0e0d10'); }
          P(() => ctx.ellipse(50, 26, 5, 22, 0.5, 0, TAU), 'rgba(20,18,22,0.35)');
        }
      };
      const central = () => {
        if (a.look === 'glam') P(() => ctx.arc(39, 36, 1.7, 0, TAU), '#0e0c0e');
        else if (a.look === 'bolt') {
          const bolt = (dx: number, dy: number, colour: string) => P(() => { const pts = [[14, -84], [48, -64], [35, -22], [58, -18], [20, 50], [28, -2], [7, -8]]; pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy))); ctx.closePath(); }, colour);
          bolt(-3.5, 1.5, p.pop);
          bolt(0, 0, p.lip === '#18161a' ? '#d9d9de' : '#e23b1e');
          P(() => ctx.arc(0, -62, 7, 0, TAU), null, p.accent, 1.6);
        } else if (a.look === 'pierrot') {
          P(() => { ctx.moveTo(-80, -115); ctx.lineTo(80, -115); ctx.lineTo(80, -62); ctx.quadraticCurveTo(40, -88, 0, -66); ctx.quadraticCurveTo(-40, -88, -80, -62); ctx.closePath(); }, '#141216');
          P(() => { ctx.moveTo(-31, 2); ctx.bezierCurveTo(-37, 16, -36, 24, -31, 25); ctx.bezierCurveTo(-26, 24, -25, 16, -31, 2); }, '#141216');
        } else if (a.look === 'sugarskull') {
          P(() => { ctx.moveTo(0, 8); ctx.bezierCurveTo(-11, 22, -7, 33, 0, 27); ctx.bezierCurveTo(7, 33, 11, 22, 0, 8); }, '#121014');
          for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU; P(() => ctx.ellipse(Math.cos(ang) * 9, -58 + Math.sin(ang) * 9, 6, 3, ang, 0, TAU), i % 2 ? p.lip : p.shade); }
          P(() => ctx.arc(0, -58, 4, 0, TAU), p.accent);
          P(() => { ctx.moveTo(0, 82); ctx.bezierCurveTo(-8, 74, -8, 90, 0, 96); ctx.bezierCurveTo(8, 90, 8, 74, 0, 82); }, p.pop);
        } else if (a.look === 'clubkid') P(() => { ctx.moveTo(0, -100); ctx.lineTo(0, 40); }, null, '#ffffff', 3.2);
        else if (a.look === 'kumadori') P(() => { ctx.moveTo(-3, -30); ctx.quadraticCurveTo(0, -44, 3, -30); ctx.quadraticCurveTo(0, -34, -3, -30); }, '#101010');
      };

      for (const sx of [1, -1] as const) {
        mode = stage === 'guides' || (stage === 'half' && sx === -1) ? 'guide' : 'paint';
        p = a.symmetry === 'split' && sx === -1 ? splitPal : pal;
        ctx.save();
        ctx.beginPath(); ctx.rect(sx > 0 ? 0 : -80, -115, 80, 230); ctx.clip();
        const base = BASE[a.look];
        if (mode === 'paint' && base) { ctx.fillStyle = base; ctx.fillRect(-80, -115, 160, 230); }
        if (mode === 'guide') {
          P(() => { ctx.moveTo(0, -105); ctx.lineTo(0, 105); });
          P(() => { ctx.moveTo(-70, -12); ctx.lineTo(70, -12); });
          P(() => { ctx.moveTo(-50, 55); ctx.lineTo(50, 55); });
        }
        central();
        ctx.scale(sx, 1);
        if (sx === -1 && a.symmetry === 'drifted') { ctx.translate(3, 4); ctx.rotate(0.07); ctx.scale(1.1, 0.93); }
        side(a.symmetry === 'split' && sx === -1);
        ctx.restore();
      }
      if (stage === 'wiped') {
        const sample = [BASE[a.look] ?? formColour, formColour, pal.lip, '#2a2428', formColour];
        for (let i = 0; i < 9; i++) {
          ctx.strokeStyle = sample[Math.floor(random() * sample.length)];
          ctx.globalAlpha = rr(0.45, 0.8); ctx.lineWidth = rr(9, 22);
          const y = rr(-70, 80), x = rr(-70, 0), tilt = rr(-0.5, 0.5);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 40, y + rr(-14, 14), x + rr(60, 110), y + tilt * 60); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // Handling marks from many sessions.
      ctx.fillStyle = '#4a4038';
      for (let i = 0; i < mood.wear * 26; i++) { ctx.globalAlpha = rr(0.05, 0.16); ctx.beginPath(); ctx.ellipse(rr(-75, 75), rr(-105, 105), rr(3, 9), rr(4, 10), random() * 3, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    };

    // ---- The head: a sphere pushed into a face, textured from the front ----
    const headGeo = new THREE.SphereGeometry(1, 64, 48);
    {
      const pos = headGeo.getAttribute('position'), uv = headGeo.getAttribute('uv');
      const g = (v: number, c: number, w: number) => Math.exp(-Math.pow((v - c) / w, 2));
      for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i), ny = pos.getY(i), nz = pos.getZ(i);
        let x = nx * 0.078, y = ny * 0.112, z = nz * (nz > 0 ? 0.09 : 0.098);
        if (ny < 0) { const t = -ny; x *= 1 - 0.34 * Math.pow(t, 1.6); z *= 1 - 0.1 * t; }
        const w = THREE.MathUtils.smoothstep(nz, 0, 0.4);
        const ax = Math.abs(x);
        z += w * (0.021 * g(x, 0, 0.012) * (g(y, -0.024, 0.014) + 0.42 * g(y, 0.0, 0.03))
          - 0.0075 * g(ax, 0.031, 0.017) * g(y, 0.012, 0.011)
          + 0.004 * g(y, 0.031, 0.008) * g(ax, 0.03, 0.035)
          + 0.0065 * g(x, 0, 0.024) * g(y, -0.055, 0.009)
          + 0.004 * g(ax, 0.046, 0.02) * g(y, -0.012, 0.02)
          + 0.006 * g(x, 0, 0.022) * g(y, -0.092, 0.016));
        pos.setXYZ(i, x, y, z);
        uv.setXY(i, nz >= 0 ? 0.5 + x / 0.16 : x > 0 ? 1 : 0, 0.5 + y / 0.23);
      }
      headGeo.computeVertexNormals();
    }
    const skin = new THREE.MeshStandardMaterial({ map: paintFace(a.stage), roughness: a.form === 'canvas' || a.form === 'foam' ? 0.95 : 0.45 });
    const plain = s.material(formColour, { roughness: a.form === 'canvas' || a.form === 'foam' ? 0.95 : 0.45 });
    const head = new THREE.Group();
    s.root.add(head);
    const add = <T extends THREE.Object3D>(node: T) => { head.add(node); return node; };
    const hy = 0.265;
    add(s.mesh(headGeo, skin, [0, hy, 0]));
    for (const sx of [-1, 1]) { const ear = add(s.ball([0.007, 0.021, 0.012], [sx * 0.078, hy - 0.004, -0.006], plain, 12)); ear.rotation.y = sx * 0.3; }
    add(s.cylinder(0.036, 0.044, 0.11, [0, hy - 0.14, -0.008], plain, 20));
    if (a.form === 'canvas') {
      const steel = s.material('#8f979b', { metalness: 0.8, roughness: 0.3 });
      add(s.cylinder(0.05, 0.05, 0.012, [0, hy - 0.2, -0.008], steel, 20));
      s.cylinder(0.013, 0.013, 0.07, [0, 0.035, -0.008], steel, 10);
      s.box([0.1, 0.014, 0.12], [0, 0.007, -0.008], steel);
      s.box([0.04, 0.05, 0.012], [0, 0.025, -0.07], steel);
    } else {
      add(s.lathe([[0.044, 0.06], [0.06, 0.045], [0.095, 0.02], [0.1, 0.0], [0, 0]], plain, [0, 0, -0.008])).scale.z = 0.78;
    }
    if (a.form !== 'canvas') {
      const wood = s.material('#8a623c');
      s.cylinder(0.12, 0.125, 0.018, [0, -0.012, 0], wood, 28);
    }
    // Pins that hold nothing yet.
    if (a.form === 'canvas' || a.form === 'foam') {
      const pinHeads: { at: V3; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 3 + Math.round(mood.density * 6); i++) { const ang = rr(1.9, 4.4), el = rr(0.2, 1.1); pinHeads.push({ at: [Math.sin(ang) * Math.cos(el) * 0.083, hy + Math.sin(el) * 0.115, Math.cos(ang) * Math.cos(el) * 0.1], size: 1, color: new THREE.Color().setHSL(random(), 0.8, 0.55) }); }
      add(s.scatter(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), pinHeads));
    }
    if (a.top !== 'bald') {
      const turban = a.top === 'turban';
      const capGeo = new THREE.SphereGeometry(1, 32, 12, 0, TAU, 0, turban ? 1.0 : 0.92);
      const capMat = s.material(turban ? (mood.warmth > 0.5 ? '#e9a7a0' : '#9cc2d8') : a.form === 'brown' ? '#c9a27e' : '#6d4a38', { roughness: 1 });
      const cap = add(s.mesh(capGeo, capMat, [0, hy + 0.004, -0.012]));
      cap.scale.set(turban ? 0.094 : 0.081, turban ? 0.135 : 0.116, turban ? 0.112 : 0.101);
      cap.rotation.x = -0.32;
      if (turban) {
        for (let i = 0; i < 3; i++) { const band = add(s.ring(0.088 - i * 0.012, 0.016, [0, hy + 0.07 + i * 0.022, -0.02 + i * 0.004], capMat)); band.rotation.set(Math.PI / 2 - 0.32, 0, 0); band.scale.set(1, 1.15, 1); }
        add(s.ball([0.03, 0.026, 0.024], [0.012, hy + 0.105, 0.062], capMat, 12));
      }
    }
    head.rotation.y = rr(-0.18, 0.18);

    // ---- What was left beside it ----
    if (a.tools === 'brushes') {
      const jx = 0.15, jz = 0.05;
      s.cylinder(0.03, 0.026, 0.075, [jx, 0.0375, jz], s.material('#7fa7b5', { roughness: 0.2, transparent: true, opacity: 0.75 }), 18);
      const n = 4 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) {
        const ang = random() * TAU, lean = rr(0.01, 0.03), len = rr(0.13, 0.19);
        const tip: V3 = [jx + Math.cos(ang) * lean * 1.6, len, jz + Math.sin(ang) * lean * 1.6];
        s.rod([jx + Math.cos(ang) * 0.006, 0.01, jz + Math.sin(ang) * 0.006], tip, 0.0035, s.material(random() < 0.5 ? '#1b1b20' : '#b9793f'));
        const bristle = s.ball([0.007, 0.014, 0.007], [tip[0], tip[1] + 0.008, tip[2]], s.material([pal.lip, pal.shade, pal.accent, '#e8d9c4'][i % 4], { roughness: 0.9 }), 8);
        bristle.castShadow = true;
      }
    } else if (a.tools === 'palette') {
      const px = 0.15, pz = 0.07;
      const tray = s.box([0.13, 0.012, 0.09], [px, 0.006, pz], s.material('#1b1b20', { roughness: 0.4 }));
      tray.rotation.y = -0.3;
      const pans: { at: V3; size: number; color: THREE.Color }[] = [];
      const colours = [pal.lip, pal.shade, pal.accent, pal.pop, '#fbfaf5', '#141216'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        const lx = -0.045 + i * 0.03, lz = -0.02 + j * 0.04;
        pans.push({ at: [px + lx * Math.cos(0.3) + lz * Math.sin(0.3), 0.0125, pz - lx * Math.sin(0.3) + lz * Math.cos(0.3)], size: 1, color: new THREE.Color(colours[(i + j * 3) % colours.length]) });
      }
      s.scatter(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 14), new THREE.MeshStandardMaterial({ roughness: 0.7 }), pans);
      const sponge = s.mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 3), s.material('#f1dcc0', { roughness: 1 }), [px - 0.04, 0.01, pz + 0.085]);
      sponge.rotation.y = random() * 3;
      s.ball([0.012, 0.004, 0.012], [px - 0.04, 0.021, pz + 0.085], s.material(pal.lip, { roughness: 1 }), 8);
      const brush = s.rod([px - 0.07, 0.004, pz + 0.03], [px + 0.07, 0.016, pz + 0.01], 0.003, s.material('#b9793f'));
      brush.castShadow = true;
    } else if (a.tools === 'reference') {
      const fx = 0.155, fz = 0.03;
      const card = s.mesh(new THREE.PlaneGeometry(0.105, 0.15), new THREE.MeshStandardMaterial({ map: paintFace('complete'), roughness: 0.5, side: THREE.DoubleSide }), [fx, 0.085, fz]);
      card.rotation.set(-0.28, -0.35, 0, 'YXZ');
      const back = s.box([0.115, 0.16, 0.004], [fx, 0.085, fz], s.material('#f4f1e8'));
      back.rotation.copy(card.rotation); back.translateZ(-0.003);
      const leg = s.rod([fx + 0.02, 0.15, fz - 0.03], [fx + 0.045, 0, fz - 0.075], 0.003, s.material('#6a5a48'));
      leg.castShadow = true;
      s.box([0.12, 0.008, 0.02], [fx - 0.004, 0.006, fz + 0.022], s.material('#6a5a48')).rotation.y = -0.35;
    }
    // Stray cotton buds and a smear on the base.
    for (let i = 0; i < Math.round(mood.density * 4); i++) {
      const x = rr(-0.16, -0.08), z = rr(0.02, 0.12), ang = random() * 3;
      s.rod([x, 0.003, z], [x + Math.cos(ang) * 0.07, 0.003, z + Math.sin(ang) * 0.07], 0.0014, s.material('#eef2f4'));
      s.ball([0.004, 0.004, 0.004], [x, 0.004, z], s.material(i % 2 ? pal.lip : '#ffffff', { roughness: 1 }), 8);
    }

    const turn = head.rotation.y, sway = mix(0, 0.12, mood.energy);
    return s.finish({ footprint: 0.14, update: (_dt, time) => { head.rotation.y = turn + Math.sin(time * 0.5) * sway; } });
  },
});
