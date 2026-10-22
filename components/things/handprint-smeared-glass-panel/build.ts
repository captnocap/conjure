import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PX = 620; // canvas pixels per metre
const GW = 1.5, GH = 1.9, BASE = 0.24;

type Ctx = CanvasRenderingContext2D;

function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
  ctx.fill();
}

/** One greasy palm print, fingers up. `w` is palm width in pixels. */
function handprint(ctx: Ctx, random: () => number, x: number, y: number, w: number, kind: 'child' | 'ape', rot: number, flip: number, colour: string, alpha: number, smear: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip, 1);
  const ape = kind === 'ape';
  const palmH = ape ? w * 1.35 : w * 1.0;
  const passes = 1 + Math.round(smear * 4);
  for (let pass = passes; pass >= 0; pass--) {
    ctx.save();
    ctx.translate(0, pass * w * 0.16 * smear);
    ctx.globalAlpha = pass === 0 ? alpha : alpha * 0.22;
    ctx.fillStyle = colour;
    // Palm as two pads with a faint hollow between them.
    oval(ctx, -w * 0.12, 0, w * 0.4, palmH * 0.5);
    oval(ctx, w * 0.16, -palmH * 0.05, w * 0.36, palmH * 0.46);
    oval(ctx, 0, -palmH * 0.36, w * 0.5, palmH * 0.16);
    const fingers = ape ? [1.25, 1.5, 1.42, 1.1] : [0.62, 0.78, 0.72, 0.52];
    fingers.forEach((len, i) => {
      const fx = (i - 1.5) * w * 0.27;
      const fan = (i - 1.5) * (ape ? 0.05 : 0.17);
      ctx.save();
      ctx.translate(fx, -palmH * 0.46);
      ctx.rotate(fan);
      const fl = len * w, fw = w * (ape ? 0.105 : 0.115);
      // Three pads per finger, the tip fattest.
      oval(ctx, 0, -fl * 0.2, fw, fl * 0.17);
      oval(ctx, 0, -fl * 0.55, fw * 0.95, fl * 0.15);
      oval(ctx, 0, -fl * 0.88, fw * 1.08, fl * 0.13);
      ctx.restore();
    });
    // Thumb: splayed for a child, short and low for an ape.
    ctx.save();
    ctx.translate(-w * 0.46, ape ? palmH * 0.18 : -palmH * 0.02);
    ctx.rotate(ape ? -1.0 : -0.85);
    const tl = w * (ape ? 0.42 : 0.52);
    oval(ctx, 0, -tl * 0.3, w * 0.13, tl * 0.3);
    oval(ctx, 0, -tl * 0.85, w * 0.125, tl * 0.24);
    ctx.restore();
    ctx.restore();
  }
  // Skin creases wiped out of the grease.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, w * 0.035);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, -palmH * 0.2 + i * palmH * 0.22 + random() * 6);
    ctx.quadraticCurveTo(0, -palmH * 0.05 + i * palmH * 0.2, w * 0.5, -palmH * 0.3 + i * palmH * 0.24);
    ctx.stroke();
  }
  ctx.restore();
}

export default defineThing({
  questions: {
    prints: choice('Whose handprints are on the glass?', {
      child: 'Small child palms on the outside only, fingers splayed, a school trip pressed against it.',
      ape: 'Long-fingered ape hands on the inside only, pressed flat and dragged.',
      meeting: 'One small hand outside and one long hand inside, matched palm to palm at the same spot.',
      crowd: 'A whole class of small prints outside and a scatter of long ones inside, layered over days.',
      wiped: 'Freshly squeegeed: only streaks and one new print already on it.',
    }),
    extra: choice('What else marks the glass?', {
      nothing: 'Nothing else.',
      fog: 'A patch of breath fog with a heart drawn in it by a fingertip.',
      nose: 'A greasy nose-and-forehead smudge where a face was pressed to look in.',
      drawing: 'A child\'s crayon drawing of an ape, taped to the glass as a gift.',
      crack: 'A star of cracks radiating from one hard blow.',
    }),
    height: score('How high up are the marks?', ['Toddler height, near the kerb', 'A child\'s chest', 'Adult shoulder', 'High above head, reached by climbing']),
    sticker: choice('Is there a notice stuck to it?', {
      none: 'No sticker.',
      tap: 'A round red prohibition sticker: a knocking hand, struck through.',
      polite: 'A yellow rectangle reading PLEASE DO NOT TAP ON THE GLASS.',
      peeled: 'The torn white remains of a sticker somebody picked off.',
    }),
    behind: choice('What waits on the far side?', {
      nobody: 'Nobody, just the dark green of the glass.',
      shadow: 'The dim hunched shadow of a seated ape, two points of eye-shine looking back.',
      rope: 'A thick knotted climbing rope hanging slack.',
      straw: 'A heap of bedding straw and a dropped piece of fruit.',
    }),
    frame: choice('What holds the glass?', {
      steel: 'Brushed steel posts bolted to a concrete kerb.',
      painted: 'Thick zoo-green painted ironwork, chipped at the edges.',
      brass: 'A mid-century frame with a brass handrail across the front.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = Math.round(GW * PX), H = Math.round(GH * PX);
    const makeCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      return [canvas, canvas.getContext('2d')!] as const;
    };
    const [frontCanvas, front] = makeCanvas();
    const [backCanvas, back] = makeCanvas();
    const yFor = (metres: number) => H - (metres - BASE) * PX; // canvas y for a height above the floor
    const markY = mix(0.55, 1.78, a.height);
    const outside = '#eef2ea', inside = '#b7c9ae';
    const smear = mix(0.05, 0.9, mood.energy);

    // The far side first: whatever is in there.
    if (a.behind === 'shadow') {
      const cx = W * (0.3 + random() * 0.4), by = H;
      back.fillStyle = 'rgba(12,16,14,0.78)';
      back.filter = 'blur(10px)';
      oval(back, cx, by - 0.42 * PX, 0.4 * PX, 0.5 * PX);
      oval(back, cx - 0.33 * PX, by - 0.25 * PX, 0.17 * PX, 0.36 * PX, 0.2);
      oval(back, cx + 0.33 * PX, by - 0.25 * PX, 0.17 * PX, 0.36 * PX, -0.2);
      oval(back, cx, by - 0.98 * PX, 0.2 * PX, 0.2 * PX);
      oval(back, cx, by - 0.9 * PX, 0.15 * PX, 0.13 * PX);
      back.filter = 'none';
      back.fillStyle = 'rgba(255,214,140,0.95)';
      for (const side of [-1, 1]) oval(back, cx + side * 0.065 * PX, by - 1.02 * PX, 0.016 * PX, 0.013 * PX);
    }

    // Grime rising from the kerb and settled in the corners.
    const grime = front.createLinearGradient(0, H, 0, H * mix(0.85, 0.3, mood.wear));
    grime.addColorStop(0, `rgba(196,190,160,${mix(0.12, 0.6, mood.wear)})`);
    grime.addColorStop(1, 'rgba(196,190,160,0)');
    front.fillStyle = grime;
    front.fillRect(0, 0, W, H);
    front.strokeStyle = 'rgba(230,232,220,0.16)';
    for (let i = 0; i < Math.round(mix(3, 26, mood.wear)); i++) {
      front.lineWidth = 1 + random() * 3;
      front.beginPath();
      const x = random() * W, y = random() * H;
      front.moveTo(x, y);
      front.lineTo(x + (random() - 0.5) * 40, y + 60 + random() * 300);
      front.stroke();
    }
    if (a.prints === 'wiped') {
      front.strokeStyle = 'rgba(240,244,236,0.13)';
      front.lineWidth = 0.3 * PX;
      for (let i = 0; i < 5; i++) {
        front.beginPath();
        front.moveTo(-20, H * (0.1 + i * 0.2));
        front.bezierCurveTo(W * 0.3, H * (0.02 + i * 0.2), W * 0.7, H * (0.2 + i * 0.2), W + 20, H * (0.08 + i * 0.2));
        front.stroke();
      }
    }

    // Prints.
    const mainX = W * (0.36 + random() * 0.28), mainY = yFor(markY);
    const childW = 0.058 * PX, apeW = 0.098 * PX;
    const flip = random() < 0.5 ? -1 : 1;
    const child = (x: number, y: number, alpha = 0.92) => handprint(front, random, x, y, childW * (0.85 + random() * 0.3), 'child', (random() - 0.5) * 0.7, random() < 0.5 ? -1 : 1, outside, alpha, smear * random());
    const ape = (x: number, y: number, alpha = 0.8) => handprint(back, random, x, y, apeW * (0.85 + random() * 0.3), 'ape', (random() - 0.5) * 0.6, random() < 0.5 ? -1 : 1, inside, alpha, smear * random());
    const spread = (n: number, fn: (x: number, y: number, alpha?: number) => void, sx: number, sy: number) => {
      for (let i = 0; i < n; i++) fn(mainX + (random() - 0.5) * sx * PX, Math.min(H - 60, Math.max(120, mainY + (random() - 0.5) * sy * PX)), 0.45 + random() * 0.5);
    };
    const many = mix(0.5, 1.6, mood.density);
    if (a.prints === 'child') { child(mainX - childW * 1.4, mainY); child(mainX + childW * 1.5, mainY - 10); spread(Math.round(5 * many), child, 1.1, 0.5); }
    if (a.prints === 'ape') { ape(mainX - apeW * 1.1, mainY); ape(mainX + apeW * 1.2, mainY + 30); spread(Math.round(3 * many), ape, 1.1, 0.8); }
    if (a.prints === 'meeting') {
      handprint(back, random, mainX, mainY, apeW, 'ape', 0.04, flip, inside, 0.95, 0);
      handprint(front, random, mainX, mainY + apeW * 0.12, childW, 'child', -0.03, flip, '#ffffff', 1, 0);
      spread(Math.round(1 * many), child, 1.2, 0.5);
    }
    if (a.prints === 'crowd') { spread(Math.round(16 * many), child, 1.35, 0.75); spread(Math.round(7 * many), ape, 1.3, 1.3); }
    if (a.prints === 'wiped') child(mainX, mainY, 1);

    const sideX = mainX > W / 2 ? W * 0.27 : W * 0.73;
    if (a.extra === 'fog') {
      const fx = sideX, fy = yFor(markY) - 0.05 * PX, r = 0.3 * PX;
      const fog = front.createRadialGradient(fx, fy, r * 0.1, fx, fy, r);
      fog.addColorStop(0, 'rgba(244,248,246,0.85)');
      fog.addColorStop(0.7, 'rgba(244,248,246,0.55)');
      fog.addColorStop(1, 'rgba(244,248,246,0)');
      front.fillStyle = fog;
      front.fillRect(fx - r, fy - r, r * 2, r * 2);
      front.globalCompositeOperation = 'destination-out';
      front.lineWidth = 0.022 * PX; front.lineCap = 'round'; front.lineJoin = 'round';
      const k = r * 0.42;
      front.beginPath();
      front.moveTo(fx, fy + k);
      front.bezierCurveTo(fx - k * 1.7, fy - k * 0.2, fx - k * 0.7, fy - k * 1.3, fx, fy - k * 0.35);
      front.bezierCurveTo(fx + k * 0.7, fy - k * 1.3, fx + k * 1.7, fy - k * 0.2, fx, fy + k);
      front.stroke();
      front.globalCompositeOperation = 'source-over';
    }
    if (a.extra === 'nose') {
      const nx = sideX, ny = yFor(markY) - 0.02 * PX;
      front.fillStyle = 'rgba(238,242,232,0.8)';
      oval(front, nx, ny, 0.03 * PX, 0.024 * PX);
      oval(front, nx, ny - 0.13 * PX, 0.085 * PX, 0.05 * PX);
      oval(front, nx - 0.075 * PX, ny + 0.01 * PX, 0.035 * PX, 0.028 * PX);
      oval(front, nx + 0.075 * PX, ny + 0.01 * PX, 0.035 * PX, 0.028 * PX);
      front.globalCompositeOperation = 'destination-out';
      for (const side of [-1, 1]) oval(front, nx + side * 0.011 * PX, ny + 0.006 * PX, 0.006 * PX, 0.008 * PX);
      front.globalCompositeOperation = 'source-over';
      front.fillStyle = 'rgba(238,242,232,0.5)';
      oval(front, nx, ny + 0.09 * PX, 0.06 * PX, 0.05 * PX);
    }
    let crackAt: [number, number] | null = null;
    if (a.extra === 'crack') {
      const cx = sideX, cy = yFor(markY) - 0.08 * PX;
      crackAt = [cx, cy];
      front.strokeStyle = 'rgba(250,255,250,0.95)';
      front.lineCap = 'round';
      const rays = 11 + Math.floor(random() * 6);
      const ends: [number, number][] = [];
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + random() * 0.3, len = (0.12 + random() * 0.45) * PX;
        let x = cx, y = cy;
        front.lineWidth = 3.5;
        front.beginPath(); front.moveTo(x, y);
        for (let k = 1; k <= 4; k++) { x = cx + Math.cos(ang + (random() - 0.5) * 0.18) * len * k / 4; y = cy + Math.sin(ang + (random() - 0.5) * 0.18) * len * k / 4; front.lineTo(x, y); }
        front.stroke();
        ends.push([ang, len]);
      }
      front.lineWidth = 2;
      for (const ring of [0.05, 0.11, 0.2]) {
        front.beginPath();
        ends.forEach(([ang, len], i) => {
          const r = Math.min(len, ring * PX * (0.8 + random() * 0.4));
          const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
          if (i === 0) front.moveTo(px, py); else front.lineTo(px, py);
        });
        front.closePath();
        front.stroke();
      }
      front.fillStyle = 'rgba(255,255,255,0.9)';
      oval(front, cx, cy, 0.022 * PX, 0.022 * PX);
    }

    // Assemble: kerb, frame, glass and the two print layers.
    const frameMat = a.frame === 'painted' ? s.material('#2f5a44', { roughness: 0.55 }) : a.frame === 'brass' ? s.material('#6d6a62', { metalness: 0.6, roughness: 0.4 }) : s.material('#aab0b0', { metalness: 0.8, roughness: 0.32 });
    const concrete = s.material('#b3ae9f', { roughness: 0.95 });
    const post = 0.09, T = 0.05;
    s.box([GW + 0.5, BASE - 0.04, 0.5], [0, (BASE - 0.04) / 2, 0], concrete);
    s.box([GW + 0.3, 0.05, 0.16], [0, BASE - 0.015, 0], frameMat);
    for (const side of [-1, 1]) {
      s.box([post, GH + 0.1, 0.13], [side * (GW / 2 + post / 2), BASE + GH / 2 + 0.03, 0], frameMat);
      s.box([0.2, 0.02, 0.3], [side * (GW / 2 + post / 2), BASE - 0.03, 0], frameMat);
      for (const z of [-0.11, 0.11]) s.cylinder(0.014, 0.014, 0.02, [side * (GW / 2 + post / 2), BASE - 0.012, z], s.material('#4b4f4f', { metalness: 0.7 }), 6);
      s.rod([side * (GW / 2 + post / 2), BASE + GH * 0.45, -0.05], [side * (GW / 2 + post / 2), BASE - 0.04, -0.23], 0.016, frameMat);
    }
    s.box([GW + post * 2 + 0.06, 0.09, 0.15], [0, BASE + GH + 0.085, 0], frameMat);
    if (a.frame === 'painted' && mood.wear > 0.3) {
      const chip = s.material('#8a4a2c', { roughness: 0.95 });
      for (let i = 0; i < Math.round(mood.wear * 14); i++) {
        const side = random() < 0.5 ? -1 : 1;
        s.box([0.02 + random() * 0.03, 0.02 + random() * 0.07, 0.004], [side * (GW / 2 + post / 2) + (random() - 0.5) * 0.04, BASE + random() * GH, 0.066], chip);
      }
    }
    if (a.frame === 'brass') {
      const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.25, emissive: '#5a3d08', emissiveIntensity: 0.25 });
      const rail = s.cylinder(0.024, 0.024, GW + 0.5, [0, 0.95, 0.3], brass, 14);
      rail.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        s.rod([side * (GW / 2 + 0.12), 0.95, 0.3], [side * (GW / 2 + 0.12), BASE - 0.04, 0.2], 0.016, brass);
        s.ball([0.034, 0.034, 0.034], [side * (GW / 2 + 0.25), 0.95, 0.3], brass, 12);
      }
    }
    // Green edge of the thick glass, visible as a bright line inside the frame.
    const edge = new THREE.MeshStandardMaterial({ color: '#7fd0a8', emissive: '#3f9a78', emissiveIntensity: 0.5, roughness: 0.2 });
    s.box([GW, 0.012, T], [0, BASE + GH - 0.006, 0], edge);
    for (const side of [-1, 1]) s.box([0.012, GH, T], [side * (GW / 2 - 0.006), BASE + GH / 2, 0], edge);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, T), new THREE.MeshPhysicalMaterial({ color: mix(0, 1, mood.daylight) > 0.75 ? '#33443f' : '#2e4a44', transparent: true, opacity: a.behind === 'nobody' ? 0.5 : 0.42, roughness: 0.06, metalness: 0.1, depthWrite: false }));
    glass.position.set(0, BASE + GH / 2, 0);
    glass.renderOrder = 2;
    s.root.add(glass);
    const layer = (canvas: HTMLCanvasElement, z: number, order: number) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      mesh.position.set(0, BASE + GH / 2, z);
      mesh.renderOrder = order;
      s.root.add(mesh);
    };
    layer(backCanvas, -T / 2 - 0.003, 1);
    layer(frontCanvas, T / 2 + 0.003, 3);
    const toWorld = (px: number, py: number): [number, number] => [(px / W - 0.5) * GW, BASE + (1 - py / H) * GH];

    if (a.extra === 'crack' && crackAt) {
      const [x, y] = toWorld(...crackAt);
      s.ball([0.03, 0.03, 0.012], [x, y, T / 2], s.material('#f4fbf6', { roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.3 }), 10);
    }
    if (a.extra === 'drawing') {
      const canvas = document.createElement('canvas');
      canvas.width = 300; canvas.height = 380;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#fbf7ea'; c.fillRect(0, 0, 300, 380);
      c.lineCap = 'round'; c.lineJoin = 'round';
      const scribble = (colour: string, cx: number, cy: number, rx: number, ry: number, n: number, lw: number) => {
        c.strokeStyle = colour; c.lineWidth = lw;
        c.beginPath();
        for (let i = 0; i <= n; i++) {
          const t = (i / n) * Math.PI * 9, r = 0.55 + 0.45 * Math.sin(i * 1.7);
          const px = cx + Math.cos(t) * rx * r, py = cy + Math.sin(t) * ry * r;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.stroke();
      };
      scribble('#7a4a26', 150, 150, 84, 84, 90, 12);
      scribble('#7a4a26', 52, 120, 30, 34, 30, 10);
      scribble('#7a4a26', 248, 120, 30, 34, 30, 10);
      scribble('#e9b98c', 150, 172, 52, 48, 60, 12);
      scribble('#7a4a26', 150, 300, 60, 56, 60, 12);
      c.fillStyle = '#1d1a18'; oval(c, 124, 132, 9, 11); oval(c, 176, 132, 9, 11);
      c.strokeStyle = '#c0282c'; c.lineWidth = 7;
      c.beginPath(); c.arc(150, 176, 30, 0.15 * Math.PI, 0.85 * Math.PI, mood.cheer < 0.3); c.stroke();
      scribble('#e8c31c', 250, 40, 22, 22, 26, 7);
      scribble('#3d9a48', 150, 368, 140, 8, 50, 7);
      c.strokeStyle = '#c0282c'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(40, 300); c.bezierCurveTo(10, 270, 40, 250, 40, 275); c.bezierCurveTo(40, 250, 70, 270, 40, 300); c.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const [x] = toWorld(sideX, 0);
      const y = Math.min(BASE + GH - 0.25, Math.max(BASE + 0.25, markY + 0.05));
      const paper = s.mesh(new THREE.PlaneGeometry(0.3, 0.38), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [x, y, T / 2 + 0.008]);
      paper.rotation.z = (random() - 0.5) * 0.3;
      const tape = s.material('#d9c98f', { roughness: 0.4 });
      for (const [dx, dy] of [[-0.13, 0.17], [0.13, 0.17], [0, -0.18]] as const) {
        const strip = s.box([0.09, 0.03, 0.002], [x + dx, y + dy, T / 2 + 0.011], tape);
        strip.rotation.z = paper.rotation.z + (random() - 0.5) * 1.2;
      }
    }
    if (a.sticker !== 'none') {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = a.sticker === 'tap' ? 384 : 192;
      const c = canvas.getContext('2d')!;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (a.sticker === 'tap') {
        c.fillStyle = '#ffffff'; oval(c, 192, 192, 190, 190);
        c.fillStyle = '#1b1b1b';
        c.fillRect(150, 150, 96, 110); for (let i = 0; i < 4; i++) c.fillRect(150 + i * 25, 96, 21, 70);
        c.strokeStyle = '#d3202a'; c.lineWidth = 38;
        c.beginPath(); c.arc(192, 192, 160, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(80, 80); c.lineTo(304, 304); c.stroke();
      } else if (a.sticker === 'polite') {
        c.fillStyle = '#f4c81e'; c.fillRect(0, 0, 384, 192);
        c.strokeStyle = '#1b1b1b'; c.lineWidth = 10; c.strokeRect(8, 8, 368, 176);
        c.fillStyle = '#1b1b1b';
        c.font = 'bold 46px sans-serif'; c.fillText('PLEASE DO NOT', 192, 64);
        c.font = 'bold 40px sans-serif'; c.fillText('TAP ON THE GLASS', 192, 126, 350);
      } else {
        c.fillStyle = '#f1efe6';
        for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(random() * 384, random() * 192); for (let k = 0; k < 4; k++) c.lineTo(random() * 384, random() * 192); c.fill(); }
        c.fillStyle = '#c9342f'; c.fillRect(30, 130, 120, 30);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const round = a.sticker === 'tap';
      const geometry = round ? new THREE.CircleGeometry(0.14, 28) : new THREE.PlaneGeometry(0.42, 0.21);
      const sticker = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, transparent: a.sticker === 'peeled', alphaTest: a.sticker === 'peeled' ? 0.5 : 0, side: THREE.DoubleSide }), [GW / 2 - 0.3, BASE + GH - 0.28, T / 2 + 0.008]);
      sticker.rotation.z = (random() - 0.5) * 0.12;
    }

    // Solid things on the far side.
    if (a.behind === 'rope') {
      const rope = s.material('#b89a62', { roughness: 0.95 });
      const rx = (random() - 0.5) * 0.8;
      s.rod([rx, BASE + GH + 0.1, -0.02], [rx, BASE + GH + 0.1, -0.24], 0.02, frameMat);
      const sway = (random() - 0.5) * 0.12;
      s.tube([[rx, BASE + GH + 0.1, -0.22], [rx + sway, 1.4, -0.22], [rx + sway * 1.6, 0.75, -0.2], [rx + sway * 1.2, 0.34, -0.22]], 0.032, rope);
      for (const y of [1.35, 0.72]) s.ball([0.062, 0.058, 0.062], [rx + sway * (y > 1 ? 1 : 1.55), y, -0.21], rope, 12);
      s.cylinder(0.02, 0.05, 0.12, [rx + sway * 1.2, 0.3, -0.22], rope, 8);
    }
    if (a.behind === 'straw') {
      const straw = Array.from({ length: 150 }, () => {
        const r = random();
        return { at: [(random() - 0.5) * 1.2, BASE - 0.02 + r * 0.14 * random(), -0.1 - random() * 0.13] as [number, number, number], size: 0.5 + random() * 0.7, color: ['#d9bf6a', '#c9a84e', '#e6d28a'][Math.floor(random() * 3)] };
      });
      const geo = new THREE.BoxGeometry(0.2, 0.012, 0.012);
      geo.rotateZ(0.3);
      const heap = s.scatter(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), straw);
      heap.rotation.y = 0.05;
      s.ball([0.05, 0.048, 0.05], [0.3 * (random() < 0.5 ? -1 : 1), BASE + 0.05, -0.17], s.material('#e8732a', { roughness: 0.5 }), 12);
    }
    return s.finish();
  },
});
