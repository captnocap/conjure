import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, mix, score } from '@conjure/kit';
import { grime, painted, write } from './paint';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

// The shot is fixed: a camera standing just outside the canopy corner, looking down the row of islands.
const CAM = new THREE.Vector3(11.74, 1.9, 12.5);
const U = { x: -0.788, z: -0.616 }, RIGHT = { x: 0.616, z: -0.788 };
const view = (along: number, lateral: number): [number, number] => [CAM.x + U.x * along + RIGHT.x * lateral, CAM.z + U.z * along + RIGHT.z * lateral];
const FACE = Math.atan2(-U.x, -U.z);
const X0 = -21.3, X1 = 6.2, Z0 = -6.5, Z1 = 8.5, UNDER = 5.6, SLAB = 1.1;
const ISLANDS = [4, -1, -6, -11, -16];

class Batch {
  private rows: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  put(size: P, at: P, colour: THREE.ColorRepresentation, euler: P = [0, 0, 0]) {
    this.rows.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)), new THREE.Vector3(...size)), c: new THREE.Color(colour) });
  }
  mesh(geometry: THREE.BufferGeometry, material: THREE.Material, shadows = true) {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, this.rows.length));
    mesh.count = this.rows.length;
    this.rows.forEach((row, index) => { mesh.setMatrixAt(index, row.m); mesh.setColorAt(index, row.c); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = shadows;
    mesh.frustumCulled = false;
    return mesh;
  }
}

/** An unlit painted plane for sky and far silhouettes, where scene lighting should not reach. */
function backdrop(width: number, height: number, cw: number, ch: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  draw(canvas.getContext('2d')!, cw, ch);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, fog: false }));
  mesh.rotation.y = FACE;
  return mesh;
}

const SKIES = {
  dawn: { top: '#8aa6d2', low: '#f7bdb6', sun: '#ffd9c2', key: '#ffc9ae', power: 2.2, lift: 0.3, night: 0.6, hemi: 0.95 },
  heat: { top: '#93c1e6', low: '#f4ecd2', sun: '#fffbe8', key: '#fff4dc', power: 3.0, lift: 1.3, night: 0.05, hemi: 1.15 },
  dusk: { top: '#6a79aa', low: '#f5a568', sun: '#ffcf8a', key: '#ffad6a', power: 2.0, lift: 0.26, night: 0.85, hemi: 0.8 },
  rain: { top: '#4c566e', low: '#807f8c', sun: '#b9bccb', key: '#aebbdc', power: 0.8, lift: 0.8, night: 1, hemi: 0.72 },
  snow: { top: '#c0c9d4', low: '#e6e9ed', sun: '#f2f3f5', key: '#e8eef8', power: 1.2, lift: 0.7, night: 0.7, hemi: 1.1 },
} as const;
const GROUND = { desert: '#d6b78d', prairie: '#c7be88', pines: '#93a37c', snowbelt: '#e4e8ea' } as const;
const LIVERY = { red: ['#d2281f', '#f2c81c'], green: ['#1f7a4a', '#f4f1e6'], blue: ['#1d4f9e', '#f08a1c'], black: ['#1c1d20', '#d8b04a'], teal: ['#1d7f86', '#f6e7c2'] } as const;

export default defineWorld({
  questions: {
    region: choice('What country does the interstate cross here?', {
      desert: 'High desert: red buttes and mesas on the horizon, sand and saguaro beyond the lot.',
      prairie: 'Flat prairie: one ruled horizon, a grain elevator, a line of telephone poles.',
      pines: 'Pine mountains: blue ridges stacked behind a saw-toothed tree line.',
      snowbelt: 'Snowbelt farmland: white fields, bare trees and a barn, ploughed banks at the lot edge.',
    }),
    sky: choice('What are the hour and the weather?', {
      dawn: 'Pink dawn, the canopy lights still on, the first coffee of the day.',
      heat: 'White midday heat, shimmer on the tarmac, lights off.',
      dusk: 'Gold dusk sliding to blue, every lamp just come on.',
      rain: 'Rain at night under sodium lamps, the concrete slick and streaked with reflections.',
      snow: 'Blowing snow under a flat white sky, drifts along the kerbs.',
    }),
    busy: score('How busy is the lot?', ['Dead empty', 'One or two rigs parked far off', 'A steady row of trailers', 'Jammed: every lane and stall full']),
    sign: choice('What does the mile-high sign advertise?', {
      diesel: 'The fuel brand and tonight\'s diesel price in big digits.',
      eat: 'One enormous word: EAT.',
      plaza: 'BIG RIG TRAVEL PLAZA with a star.',
      amenities: 'A stack of panels: SHOWERS, SCALES, LAUNDRY, CB SHOP.',
      jerky: 'JERKY · FIREWORKS · CLEAN RESTROOMS.',
      dead: 'TRUCK STOP with half its letters burnt out.',
    }),
    livery: choice('What are the canopy and pump colours?', {
      red: 'Red with a yellow stripe.',
      green: 'Green and white.',
      blue: 'Blue with an orange stripe.',
      black: 'Black and gold, the premium brand.',
      teal: 'Teal and cream, an older independent.',
    }),
    lanes: choice('What state are the fuel lanes in?', {
      clean: 'Hosed down and tidy, cones stacked.',
      stained: 'Decades of diesel stains and tyre scrub.',
      closed: 'Two lanes coned off, a pump bagged out of order.',
      spill: 'A fresh spill being soaked up with absorbent, a mop bucket left standing.',
    }),
  },

  build(a, context) {
    const art = new Sculpture(context);
    const { root } = art;
    const { mood, random } = context;
    const sky = SKIES[a.sky], wear = mood.wear;
    const night = sky.night;
    const [brand, stripe] = LIVERY[a.livery];
    const snowy = a.sky === 'snow' || a.region === 'snowbelt';
    const wet = a.sky === 'rain';
    const horizon = new THREE.Color(sky.low);
    const haze = (colour: string, amount: number) => '#' + new THREE.Color(colour).lerp(horizon, amount).getHexString();
    const lampColour = new THREE.Color(wet ? '#ffb45a' : '#fff1d6').lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffb45a' : '#e4f0ff'), Math.abs(mood.warmth - 0.5) * 0.9);

    // ---- Light.
    root.add(new THREE.HemisphereLight(new THREE.Color(sky.top).lerp(new THREE.Color('#ffffff'), 0.35), new THREE.Color(GROUND[a.region]).lerp(new THREE.Color('#9a958c'), 0.5), sky.hemi));
    const key = new THREE.DirectionalLight(sky.key, sky.power);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    // ---- Ground.
    const terrain = art.mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ color: snowy ? '#e6eaec' : GROUND[a.region], roughness: 1 }), [-200, -0.04, -200]);
    terrain.rotation.x = -Math.PI / 2; terrain.castShadow = false;
    const lotColour = wet ? '#565c64' : snowy ? '#b4b9be' : a.sky === 'heat' ? '#8f8d87' : '#7c7c7a';
    const lot = art.mesh(new THREE.PlaneGeometry(190, 150), new THREE.MeshStandardMaterial({ color: lotColour, roughness: wet ? 0.28 : 0.95, metalness: wet ? 0.35 : 0 }), [-30, 0, -22]);
    lot.rotation.x = -Math.PI / 2; lot.castShadow = false;
    const laneArt = painted(X1 - X0 + 3, Z1 - Z0 + 3, (ctx, w, h) => {
      const mpx = w / (X1 - X0 + 3);
      ctx.fillStyle = wet ? '#84868a' : snowy ? '#c4c7c6' : '#b1ad9f'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(70,68,62,0.45)'; ctx.lineWidth = 2;
      for (let x = 0; x < w; x += mpx * 2.5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += mpx * 3.75) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const amount = (a.lanes === 'clean' ? 0.15 : a.lanes === 'stained' ? 1 : 0.55) * mix(0.6, 1.3, wear);
      // Stains gather down the middle of each lane, where engines drip, with tyre scrub either side.
      for (const lane of [6.6, 1.5, -3.5, -8.5, -13.5, -18.5]) {
        const cx = (lane - X0 + 1.5) * mpx;
        for (let i = 0; i < 60 * amount; i++) {
          ctx.fillStyle = `rgba(${30 + random() * 25},${28 + random() * 20},${26 + random() * 14},${0.22 + random() * 0.4})`;
          const y = random() * h, r = mpx * (0.12 + random() * 0.5);
          ctx.beginPath(); ctx.ellipse(cx + (random() - 0.5) * mpx * 1.3, y, r, r * (1 + random() * 2.5), 0, 0, 7); ctx.fill();
        }
        ctx.fillStyle = `rgba(40,40,40,${0.07 + amount * 0.09})`;
        for (const dx of [-1.05, 1.05]) ctx.fillRect(cx + dx * mpx - mpx * 0.3, 0, mpx * 0.6, h);
      }
      if (a.lanes === 'spill') {
        const cx = (1.5 - X0 + 1.5) * mpx, cy = (Z1 + 1.5 - 5.6) * mpx;
        ctx.fillStyle = 'rgba(24,26,34,0.75)'; ctx.beginPath(); ctx.ellipse(cx - mpx * 2.6, cy + mpx * 0.6, mpx * 1.5, mpx * 2.2, 0.5, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(214,196,150,0.9)'; for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(cx - mpx * 2.6 + (random() - 0.5) * mpx * 2.2, cy + mpx * 0.6 + (random() - 0.5) * mpx * 2.4, mpx * 0.08, 0, 7); ctx.fill(); }
      }
      if (snowy) { ctx.fillStyle = 'rgba(246,248,250,0.9)'; for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mpx * (0.3 + random() * 1.2), mpx * (0.2 + random() * 0.6), random() * 3, 0, 7); ctx.fill(); } }
      if (wet) { for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(255,190,110,${0.12 + random() * 0.2})`; ctx.fillRect(random() * w, random() * h, mpx * 0.35, mpx * (1.5 + random() * 3)); } }
      ctx.strokeStyle = '#e3b414'; ctx.lineWidth = mpx * 0.14; ctx.strokeRect(mpx * 1.2, mpx * 1.2, w - mpx * 2.4, h - mpx * 2.4);
    }, { px: 1024, roughness: wet ? 0.25 : 0.9, glow: night * 0.3 });
    laneArt.rotation.x = -Math.PI / 2; laneArt.position.set((X0 + X1) / 2, 0.012, (Z0 + Z1) / 2); root.add(laneArt);
    (laneArt.material as THREE.MeshStandardMaterial).metalness = wet ? 0.3 : 0;

    // ---- Sky and horizon.
    const skyAt = view(600, 0);
    const skyPlane = backdrop(1500, 760, 512, 512, (ctx, w, h) => {
      const hy = h * (640 / 760);
      const g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, sky.top); g.addColorStop(0.55, '#' + new THREE.Color(sky.top).lerp(horizon, 0.45).getHexString()); g.addColorStop(1, sky.low);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.fillStyle = sky.low; ctx.fillRect(0, hy, w, h - hy);
      if (a.sky === 'dawn' || a.sky === 'dusk' || a.sky === 'heat') {
        const sx = w * (a.sky === 'dawn' ? 0.66 : 0.3), sy = a.sky === 'heat' ? h * 0.2 : hy - h * 0.035;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.3); glow.addColorStop(0, sky.sun); glow.addColorStop(0.12, sky.sun); glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      }
      const clouds = a.sky === 'rain' ? 26 : a.sky === 'snow' ? 0 : a.sky === 'heat' ? 3 : 9;
      for (let i = 0; i < clouds; i++) {
        const cx = random() * w, cy = h * (0.08 + random() * 0.62), cw = w * (0.08 + random() * 0.16);
        ctx.fillStyle = a.sky === 'rain' ? `rgba(70,76,94,${0.25 + random() * 0.25})` : a.sky === 'dusk' ? `rgba(246,160,120,${0.35 + random() * 0.3})` : a.sky === 'dawn' ? `rgba(255,214,214,${0.4 + random() * 0.3})` : 'rgba(255,255,255,0.55)';
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(cx + (k - 2) * cw * 0.3, cy + (random() - 0.5) * 6, cw * 0.36, h * (0.008 + random() * 0.014), 0, 0, 7); ctx.fill(); }
      }
    });
    skyPlane.position.set(skyAt[0], 260, skyAt[1]); root.add(skyPlane);

    const ridge = (distance: number, width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) => {
      const plane = backdrop(width, height, 1024, 160, draw);
      const at = view(distance, width * 0.12);
      plane.position.set(at[0], height / 2 - 1.5, at[1]); root.add(plane);
    };
    const profile = (ctx: Ctx, w: number, h: number, colour: string, level: (t: number) => number) => {
      ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(0, h);
      for (let i = 0; i <= 256; i++) ctx.lineTo((i / 256) * w, h - h * Math.max(0.02, level(i / 256)));
      ctx.lineTo(w, h); ctx.fill();
    };
    const waves = (n: number, rough: number) => { const p = Array.from({ length: n }, () => [random() * 6.28, 2 + random() * 14, random()] as const); return (t: number) => p.reduce((sum, [ph, f, amp]) => sum + Math.sin(t * f * 6.28 + ph) * amp, 0) / n * rough; };
    if (a.region === 'desert') {
      const buttes = Array.from({ length: 9 }, () => ({ c: random(), w: 0.02 + random() * 0.06, h: 0.35 + random() * 0.55 }));
      const roll = waves(5, 0.2);
      ridge(540, 1300, 92, (ctx, w, h) => profile(ctx, w, h, haze('#b86f58', 0.5), (t) => 0.16 + roll(t) + Math.max(...buttes.map((b) => (Math.abs(t - b.c) < b.w ? b.h : Math.abs(t - b.c) < b.w * 1.9 ? b.h * (1 - (Math.abs(t - b.c) - b.w) / (b.w * 0.9)) * 0.6 : 0)))));
      const low = waves(7, 0.5);
      ridge(380, 1000, 40, (ctx, w, h) => profile(ctx, w, h, haze('#a8674c', 0.25), (t) => 0.34 + low(t)));
    } else if (a.region === 'prairie') {
      const roll = waves(4, 0.12);
      ridge(540, 1300, 30, (ctx, w, h) => profile(ctx, w, h, haze('#a9b08a', 0.45), (t) => 0.3 + roll(t)));
      ridge(360, 1000, 60, (ctx, w, h) => {
        const c = haze('#6f7660', 0.3); profile(ctx, w, h, c, () => 0.1);
        ctx.fillStyle = c;
        const ex = w * (0.42 + random() * 0.2);
        ctx.fillRect(ex, h * 0.25, w * 0.012, h * 0.7); ctx.fillRect(ex + w * 0.012, h * 0.4, w * 0.03, h * 0.55); ctx.fillRect(ex + w * 0.004, h * 0.12, w * 0.006, h * 0.2);
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(ex + w * 0.05 + i * w * 0.012, h * 0.55, w * 0.006, Math.PI, 0); ctx.fill(); ctx.fillRect(ex + w * 0.044 + i * w * 0.012, h * 0.55, w * 0.012, h * 0.4); }
        const tx = w * (0.15 + random() * 0.15); ctx.fillRect(tx, h * 0.45, w * 0.002, h * 0.5); ctx.beginPath(); ctx.ellipse(tx, h * 0.4, w * 0.012, h * 0.12, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 40; i++) { const px = (i / 40) * w; ctx.fillRect(px, h * 0.72, 1.5, h * 0.2); ctx.fillRect(px - 4, h * 0.74, 9, 1.5); }
      });
    } else if (a.region === 'pines') {
      const far = waves(9, 1.1), mid = waves(8, 0.8);
      ridge(560, 1300, 110, (ctx, w, h) => {
        profile(ctx, w, h, haze('#7f95b3', 0.5), (t) => 0.5 + far(t) * 0.7);
        ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = haze('#f2f5f8', 0.2); ctx.fillRect(0, 0, w, h * 0.3); ctx.globalCompositeOperation = 'source-over';
      });
      ridge(420, 1100, 66, (ctx, w, h) => profile(ctx, w, h, haze('#536f7e', 0.3), (t) => 0.5 + mid(t) * 0.6));
      ridge(240, 760, 26, (ctx, w, h) => { ctx.fillStyle = haze('#2c463d', 0.12); ctx.fillRect(0, h * 0.7, w, h); for (let i = 0; i < 150; i++) { const px = random() * w, tw = 4 + random() * 5, th = h * (0.35 + random() * 0.6); ctx.beginPath(); ctx.moveTo(px - tw, h); ctx.lineTo(px, h - th); ctx.lineTo(px + tw, h); ctx.fill(); } });
    } else {
      const roll = waves(5, 0.25);
      ridge(540, 1300, 36, (ctx, w, h) => profile(ctx, w, h, haze('#cdd4da', 0.4), (t) => 0.4 + roll(t)));
      ridge(330, 900, 40, (ctx, w, h) => {
        const c = haze('#868f98', 0.3); profile(ctx, w, h, haze('#dfe4e8', 0.1), () => 0.22);
        ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1.4;
        for (let i = 0; i < 70; i++) { const px = random() * w, th = h * (0.25 + random() * 0.35); ctx.beginPath(); ctx.moveTo(px, h * 0.8); ctx.lineTo(px, h * 0.8 - th); for (let k = 0; k < 5; k++) { const y = h * 0.8 - th * (0.4 + k * 0.12); ctx.moveTo(px, y); ctx.lineTo(px + (k % 2 ? 1 : -1) * (5 + random() * 6), y - 6); } ctx.stroke(); }
        const bx = w * (0.35 + random() * 0.3); ctx.fillStyle = haze('#8a3d38', 0.3); ctx.fillRect(bx, h * 0.5, w * 0.03, h * 0.3); ctx.beginPath(); ctx.moveTo(bx - 3, h * 0.5); ctx.lineTo(bx + w * 0.015, h * 0.36); ctx.lineTo(bx + w * 0.03 + 3, h * 0.5); ctx.fill();
        ctx.fillStyle = c; ctx.fillRect(bx + w * 0.036, h * 0.38, w * 0.008, h * 0.42); ctx.beginPath(); ctx.arc(bx + w * 0.04, h * 0.38, w * 0.004, Math.PI, 0); ctx.fill();
      });
    }

    // ---- Everything boxy goes in two instanced batches.
    const boxes = new Batch(), drums = new Batch(), lamps = new Batch(), ambers = new Batch(), snow = new Batch();
    const white = '#ecebe4', concrete = '#b3afa3', yellow = '#e3b414', steelGrey = '#8d9396', darkGrey = '#2b2d30';

    // Canopy.
    boxes.put([X1 - X0, SLAB, Z1 - Z0], [(X0 + X1) / 2, UNDER + SLAB / 2, (Z0 + Z1) / 2], white);
    if (snowy) snow.put([(X1 - X0) * 0.58, 0.5, (Z1 - Z0) * 0.6], [(X0 + X1) / 2, UNDER + SLAB + 0.02, (Z0 + Z1) / 2], '#f6f8fa');
    const fasciaText = ['DIESEL', 'TRUCK LANES', 'DEF AT EVERY PUMP', "CLEARANCE 14' 6\"", 'DIESEL', 'SHOWERS · SCALES'];
    const fascia = (length: number, words: number) => painted(length, SLAB, (ctx, w, h) => {
      ctx.fillStyle = a.livery === 'black' ? '#1c1d20' : '#f1f0ea'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = brand; ctx.fillRect(0, h * 0.58, w, h * 0.3); ctx.fillStyle = stripe; ctx.fillRect(0, h * 0.5, w, h * 0.09);
      for (let i = 0; i < words; i++) write(ctx, fasciaText[i % fasciaText.length], (w * (i + 0.5)) / words, h * 0.27, h * 0.36, a.livery === 'black' ? stripe : brand, { max: (w / words) * 0.8 });
      ctx.fillStyle = `rgba(210,204,186,${wear * 0.4})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wear * 0.4, '#5d564a');
    }, { px: 1024, glow: 0.08 + night * 0.4, roughness: 0.6 });
    const front = fascia(X1 - X0, 6); front.position.set((X0 + X1) / 2, UNDER + SLAB / 2, Z1 + 0.02); root.add(front);
    const side = fascia(Z1 - Z0, 3); side.position.set(X1 + 0.02, UNDER + SLAB / 2, (Z0 + Z1) / 2); side.rotation.y = Math.PI / 2; root.add(side);
    const soffit = painted(X1 - X0 - 0.3, Z1 - Z0 - 0.3, (ctx, w, h) => {
      ctx.fillStyle = '#d6d5cd'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#a9a79d'; ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x += w / 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      grime(ctx, w, h, random, wear * 0.6, '#7a7366');
    }, { px: 256, glow: 0.06 + night * 0.3 });
    soffit.rotation.x = Math.PI / 2; soffit.position.set((X0 + X1) / 2, UNDER - 0.012, (Z0 + Z1) / 2); root.add(soffit);
    const lanesX = [6.0, 1.5, -3.5, -8.5, -13.5, -18.5];
    for (const x of lanesX) for (const z of [-3.6, 1.2, 6.0]) { if (x === 1.5 && z === 6.0) continue; lamps.put([0.8, 0.07, 1.9], [x, UNDER - 0.05, z], '#ffffff'); boxes.put([1.0, 0.1, 2.1], [x, UNDER - 0.03, z], steelGrey); }

    // Islands: kerb, column, pumps, bollards, bin.
    const pumpFaces: { at: P; yaw: number }[] = [];
    const bagged = a.lanes === 'closed' ? 1 : -1;
    ISLANDS.forEach((x, k) => {
      boxes.put([1.34, 0.11, 7.54], [x, 0.055, 1.25], yellow); boxes.put([1.3, 0.17, 7.5], [x, 0.085, 1.25], concrete);
      for (const z of [-2.5, 5.0]) { drums.put([1.34, 0.11, 1.34], [x, 0.055, z], yellow); drums.put([1.3, 0.17, 1.3], [x, 0.085, z], concrete); }
      if (snowy) { snow.put([1.5, 0.3, 1.3], [x, 0.2, 5.3], '#f6f8fa'); snow.put([1.2, 0.22, 1.6], [x + 0.2, 0.18, -2.6], '#f6f8fa'); }
      boxes.put([0.75, UNDER, 0.75], [x, UNDER / 2, 0.5], white); boxes.put([0.82, 1.5, 0.82], [x, 0.9, 0.5], brand); boxes.put([0.84, 0.14, 0.84], [x, 1.7, 0.5], stripe);
      boxes.put([1.3, 0.5, 1.3], [x, UNDER - 0.25, 0.5], white);
      for (const z of [-1.3, 2.3]) {
        boxes.put([0.6, 2.05, 0.95], [x, 0.17 + 1.025, z], white); boxes.put([0.68, 0.3, 1.03], [x, 0.17 + 2.2, z], brand); boxes.put([0.64, 0.5, 0.99], [x, 0.17 + 0.25, z], darkGrey);
        if (k === bagged && z > 0) boxes.put([0.66, 1.2, 1.0], [x, 0.17 + 1.5, z], '#e3b414');
        else for (const sx of [-1, 1]) pumpFaces.push({ at: [x + sx * 0.306, 0.17 + 1.3, z], yaw: sx * Math.PI / 2 });
        for (const sx of [-1, 1]) { boxes.put([0.09, 0.34, 0.12], [x + sx * 0.36, 0.17 + 1.05, z + 0.3], '#1f8a43'); boxes.put([0.09, 0.34, 0.12], [x + sx * 0.36, 0.17 + 1.05, z - 0.3], k % 2 ? '#1f5fb0' : '#1f8a43'); }
      }
      for (const z of [-2.75, 5.25]) for (const sx of [-1, 1]) { drums.put([0.17, 1.05, 0.17], [x + sx * 0.36, 0.17 + 0.52, z], yellow); drums.put([0.18, 0.12, 0.18], [x + sx * 0.36, 0.17 + 0.8, z], darkGrey); }
      if (k > 0) { boxes.put([0.5, 0.85, 0.45], [x, 0.17 + 0.42, 3.5], k % 2 ? steelGrey : brand); boxes.put([0.42, 0.25, 0.3], [x, 0.17 + 1.1, 3.5], darkGrey); boxes.put([0.06, 1.3, 0.06], [x, 0.17 + 0.65, 3.7], steelGrey); }
    });
    // Hoses on the two nearest islands, where they can be seen.
    const hoseMat = art.material('#1b1c1e', { roughness: 0.7 });
    for (const x of [ISLANDS[0], ISLANDS[1]]) for (const z of [-1.3, 2.3]) for (const sx of [-1, 1]) for (const dz of [-0.3, 0.3])
      art.tube([[x + sx * 0.33, 0.17 + 2.0, z + dz * 0.5], [x + sx * 0.62, 0.17 + 1.3, z + dz], [x + sx * 0.56, 0.17 + 0.62, z + dz * 1.2], [x + sx * 0.4, 0.17 + 1.2, z + dz]], 0.028, hoseMat);
    const faceProto = painted(0.86, 1.25, (ctx, w, h) => {
      ctx.fillStyle = '#e9e8e1'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = brand; ctx.fillRect(0, 0, w, h * 0.13); write(ctx, 'DIESEL', w / 2, h * 0.07, h * 0.09, a.livery === 'black' ? stripe : '#ffffff');
      ctx.fillStyle = '#16211a'; ctx.fillRect(w * 0.1, h * 0.18, w * 0.8, h * 0.3);
      ctx.font = `bold ${h * 0.085}px monospace`; ctx.textAlign = 'right'; ctx.fillStyle = '#7dffa0';
      ctx.fillText((60 + random() * 380).toFixed(2), w * 0.86, h * 0.28); ctx.fillText((20 + random() * 110).toFixed(3), w * 0.86, h * 0.38); ctx.fillStyle = '#ffd36b'; ctx.fillText('3.' + (59 + Math.floor(random() * 40)) + '9', w * 0.86, h * 0.46);
      ctx.fillStyle = '#2b2d30'; ctx.fillRect(w * 0.12, h * 0.54, w * 0.32, h * 0.2); ctx.fillStyle = '#9aa0a3'; for (let i = 0; i < 12; i++) ctx.fillRect(w * (0.15 + (i % 3) * 0.09), h * (0.56 + Math.floor(i / 3) * 0.045), w * 0.06, h * 0.03);
      ctx.fillStyle = '#1f8a43'; ctx.fillRect(w * 0.54, h * 0.54, w * 0.34, h * 0.09); ctx.fillStyle = '#1f5fb0'; ctx.fillRect(w * 0.54, h * 0.66, w * 0.34, h * 0.09);
      ctx.fillStyle = stripe; ctx.fillRect(0, h * 0.82, w, h * 0.05);
      grime(ctx, w, h, random, wear * 0.7, '#3a3632');
    }, { px: 256, glow: 0.15 + night * 0.5, roughness: 0.5 });
    const faces = new THREE.InstancedMesh(faceProto.geometry, faceProto.material, Math.max(1, pumpFaces.length));
    faces.count = pumpFaces.length;
    pumpFaces.forEach((f, i) => faces.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(...f.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, f.yaw, 0)), new THREE.Vector3(1, 1, 1))));
    faces.frustumCulled = false; root.add(faces);
    // Lane numbers on the columns.
    ISLANDS.forEach((x, k) => {
      const plate = painted(0.7, 0.7, (ctx, w, h) => { ctx.fillStyle = a.livery === 'black' ? stripe : '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = brand; ctx.lineWidth = w * 0.08; ctx.strokeRect(0, 0, w, h); write(ctx, String(k + 1), w / 2, h * 0.54, h * 0.72, a.livery === 'black' ? '#1c1d20' : brand); }, { px: 128, glow: 0.2 + night * 0.6 });
      plate.position.set(x, 3.1, 0.5 + 0.382); root.add(plate);
      const twin = new THREE.Mesh(plate.geometry, plate.material); twin.position.set(x + 0.382, 3.1, 0.5); twin.rotation.y = Math.PI / 2; root.add(twin);
    });

    // Rigs: trailers parked far off and, when it is busy, fuelling in the lanes behind the cast.
    const hues = ['#f1f0ea', '#f1f0ea', '#d9dcdf', '#c9cdd0', '#e9dfc8', '#bcd0df', '#f1f0ea'], cabs = ['#b3201f', '#162a5c', '#1f4d36', '#16171a', '#d2601c', '#eeece4', '#4c2a6e', '#1d6f78'];
    const rig = (x: number, z: number, yaw: number, trailer: boolean) => {
      const at = (lx: number, y: number, lz: number): P => [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), y, z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
      const cab = cabs[Math.floor(random() * cabs.length)], e: P = [0, yaw, 0];
      if (trailer) {
        boxes.put([2.6, 2.85, 14.6], at(0, 2.75, -8.6), hues[Math.floor(random() * hues.length)], e); boxes.put([2.5, 0.25, 14.2], at(0, 1.2, -8.6), darkGrey, e);
        boxes.put([1.8, 1.0, 0.15], at(0, 0.6, -4.4), darkGrey, e);
        for (const lz of [-13.3, -14.6]) drums.put([1.0, 2.5, 1.0], at(0, 0.5, lz), '#1b1c1d', [0, yaw, Math.PI / 2]);
        if (snowy) snow.put([2.5, 0.16, 14.4], at(0, 4.22, -8.6), '#f6f8fa', e);
        for (const lx of [-1.1, 0, 1.1]) ambers.put([0.14, 0.08, 0.06], at(lx, 4.05, -1.28), '#ffab2e', e);
      }
      boxes.put([2.45, 2.7, 2.0], at(0, 2.5, 0.1), cab, e); boxes.put([2.35, 1.95, 1.6], at(0, 2.12, 1.85), cab, e); boxes.put([2.0, 1.15, 2.1], at(0, 1.72, 3.6), cab, e);
      boxes.put([2.1, 0.7, 0.05], at(0, 2.72, 2.67), '#1b2932', e); boxes.put([2.5, 0.4, 0.16], at(0, 0.72, 4.72), '#c9cdd0', e); boxes.put([1.3, 0.95, 0.06], at(0, 1.7, 4.66), '#c9cdd0', e);
      for (const lx of [-1.32, 1.32]) boxes.put([0.15, 2.9, 0.15], at(lx, 2.7, 1.0), '#c9cdd0', e);
      for (const lz of [3.6, -0.7, -2.0]) drums.put([1.02, 2.5, 1.02], at(0, 0.51, lz), '#1b1c1d', [0, yaw, Math.PI / 2]);
      for (const lx of [-0.9, -0.45, 0, 0.45, 0.9]) ambers.put([0.12, 0.08, 0.1], at(lx, 3.14, 2.5), '#ffab2e', e);
      for (const lx of [-0.85, 0.85]) lamps.put([0.3, 0.2, 0.06], at(lx, 1.15, 4.76), '#ffffff', e);
    };
    const laneRigs = Math.round(a.busy * 2.6 + mood.density * 0.6);
    [[-8.5, 1.0], [-13.5, 2.5], [-3.5, 0.2], [-18.5, 1.5]].slice(0, laneRigs).forEach(([x, z]) => rig(x, z + random() * 2, (random() - 0.5) * 0.03, true));
    const stalls = Math.round(a.busy * 13 + (a.busy > 0.1 ? mood.density * 3 : 0));
    const order = Array.from({ length: 16 }, (_u, i) => i).sort(() => random() - 0.5).slice(0, stalls);
    for (const i of order) rig(-52 + i * 4.3 + (i > 9 ? 6 : 0), -26 - random() * 2.5, -0.35 + (random() - 0.5) * 0.04, random() < 0.85);

    // Travel plaza building, far back on the left.
    const plazaAt = view(50, -7), plaza = new THREE.Group();
    plaza.position.set(plazaAt[0], 0, plazaAt[1]); plaza.rotation.y = FACE + 0.12; root.add(plaza);
    const wall = art.material('#d9d2bf', { roughness: 0.9 });
    const hall = new THREE.Mesh(new THREE.BoxGeometry(38, 6.4, 14), wall); hall.position.set(0, 3.2, -7); hall.castShadow = hall.receiveShadow = true; plaza.add(hall);
    const band = new THREE.Mesh(new THREE.BoxGeometry(38.4, 1.3, 14.4), art.material(brand, { roughness: 0.7 })); band.position.set(0, 6.6, -7); plaza.add(band);
    const facade = painted(38, 6.4, (ctx, w, h) => {
      ctx.fillStyle = '#d9d2bf'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = night > 0.4 ? '#ffe2a0' : '#8fb0c4'; ctx.fillRect(w * 0.05, h * 0.42, w * 0.9, h * 0.44);
      ctx.fillStyle = '#4a4d50'; for (let i = 0; i <= 18; i++) ctx.fillRect(w * (0.05 + (i * 0.9) / 18) - 2, h * 0.42, 4, h * 0.44);
      ctx.fillStyle = '#2b2d30'; ctx.fillRect(w * 0.46, h * 0.36, w * 0.08, h * 0.64);
      ctx.fillStyle = brand; ctx.fillRect(w * 0.3, h * 0.06, w * 0.4, h * 0.26); write(ctx, 'TRAVEL PLAZA', w / 2, h * 0.19, h * 0.19, a.livery === 'black' ? stripe : '#ffffff', { max: w * 0.37 });
      write(ctx, 'RESTAURANT', w * 0.15, h * 0.3, h * 0.11, '#b3201f', { max: w * 0.2 }); write(ctx, 'SHOWERS · LAUNDRY', w * 0.85, h * 0.3, h * 0.1, '#2b2d30', { max: w * 0.24 });
      grime(ctx, w, h, random, wear * 0.4, '#5d564a');
    }, { px: 512, glow: 0.1 + night * 0.75 });
    facade.position.set(0, 3.2, 0.02); plaza.add(facade);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 4), wall); porch.position.set(0, 4.2, 2); plaza.add(porch);

    // The mile-high sign, standing over the canopy line on the left.
    const signAt = view(100, -37), tower = new THREE.Group();
    tower.position.set(signAt[0], 0, signAt[1]); tower.rotation.y = FACE - 0.1; root.add(tower);
    const poleMat = art.material('#d9dcde', { metalness: 0.3, roughness: 0.6 });
    for (const x of [-3.2, 3.2]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.1, 58, 10), poleMat); leg.position.set(x, 29, 0); tower.add(leg); }
    const dead = a.sign === 'dead';
    const panelGlow = dead ? 0.15 : 0.35 + night * 0.65;
    const main = painted(15, 10, (ctx, w, h) => {
      const lit = (on: boolean, c: string) => (on ? c : '#4a4640');
      if (a.sign === 'diesel') {
        ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = brand; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.3, w * 0.4, h * 0.22, 0, 0, 7); ctx.fill();
        write(ctx, ['ROADKING', 'BIG SKY', 'PILGRIM', 'LONESTAR'][Math.floor(random() * 4)], w / 2, h * 0.3, h * 0.2, stripe, { max: w * 0.7 });
        ctx.fillStyle = '#16181a'; ctx.fillRect(w * 0.06, h * 0.58, w * 0.88, h * 0.36); write(ctx, 'DIESEL', w * 0.3, h * 0.76, h * 0.16, '#ffffff', { max: w * 0.4 });
        ctx.font = `bold ${h * 0.26}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#56ff7a'; ctx.fillText('3.' + (59 + Math.floor(random() * 40)), w * 0.72, h * 0.77, w * 0.4);
      } else if (a.sign === 'eat') {
        ctx.fillStyle = '#f2c81c'; ctx.fillRect(0, 0, w, h); write(ctx, 'EAT', w / 2, h * 0.42, h * 0.62, '#d2281f', { outline: '#ffffff', max: w * 0.92 });
        ctx.fillStyle = '#16181a'; ctx.fillRect(0, h * 0.78, w, h * 0.22); write(ctx, 'OPEN 24 HRS', w / 2, h * 0.89, h * 0.15, '#f2c81c', { max: w * 0.9 });
      } else if (a.sign === 'plaza') {
        ctx.fillStyle = brand; ctx.fillRect(0, 0, w, h); ctx.fillStyle = stripe; ctx.beginPath(); for (let i = 0; i < 10; i++) { const t = (i / 10) * 6.283 - 1.5708, r = i % 2 ? h * 0.09 : h * 0.22; ctx.lineTo(w / 2 + Math.cos(t) * r, h * 0.25 + Math.sin(t) * r); } ctx.fill();
        write(ctx, 'BIG RIG', w / 2, h * 0.6, h * 0.24, '#ffffff', { max: w * 0.9 }); write(ctx, 'TRAVEL PLAZA', w / 2, h * 0.84, h * 0.15, stripe, { max: w * 0.9 });
      } else if (a.sign === 'amenities') {
        ['SHOWERS', 'SCALES', 'LAUNDRY', 'CB SHOP'].forEach((word, i) => { ctx.fillStyle = [brand, '#f4f1e6', stripe, '#16181a'][i]; ctx.fillRect(0, (h * i) / 4, w, h / 4 - 4); write(ctx, word, w / 2, (h * (i + 0.5)) / 4, h * 0.18, ['#ffffff', brand, '#16181a', '#f4f1e6'][i], { max: w * 0.9 }); });
      } else if (a.sign === 'jerky') {
        ctx.fillStyle = '#7a2a1c'; ctx.fillRect(0, 0, w, h); write(ctx, 'JERKY', w / 2, h * 0.22, h * 0.32, '#ffd92e', { outline: '#16181a', max: w * 0.9 });
        write(ctx, 'FIREWORKS', w / 2, h * 0.55, h * 0.2, '#ffffff', { max: w * 0.9 }); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, h * 0.72, w, h * 0.28); write(ctx, 'CLEAN RESTROOMS', w / 2, h * 0.86, h * 0.13, '#1d4f9e', { max: w * 0.92 });
      } else {
        ctx.fillStyle = '#2a2826'; ctx.fillRect(0, 0, w, h);
        const rows = ['TRUCK', 'STOP'];
        rows.forEach((row, r) => [...row].forEach((letter, i) => write(ctx, letter, w * (0.14 + (i * 0.72) / (row.length - 1)), h * (0.3 + r * 0.42), h * 0.34, lit(random() > 0.45, r ? '#ff5a3c' : '#ffd36b'))));
      }
      ctx.fillStyle = `rgba(200,194,176,${wear * 0.35})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wear * 0.4, '#4a4640');
    }, { px: 512, glow: panelGlow, roughness: 0.6 });
    main.position.set(0, 61, 0.9); tower.add(main);
    const backing = new THREE.Mesh(new THREE.BoxGeometry(15.6, 10.6, 1.6), art.material('#3a3d40')); backing.position.set(0, 61, 0); tower.add(backing);
    const sub = painted(12, 4.4, (ctx, w, h) => {
      ctx.fillStyle = '#16181a'; ctx.fillRect(0, 0, w, h);
      write(ctx, a.sign === 'diesel' ? 'TRUCK STOP' : 'DIESEL', w * 0.3, h * 0.3, h * 0.3, '#ffffff', { max: w * 0.5 });
      ctx.font = `bold ${h * 0.4}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = dead ? '#3d5a44' : '#56ff7a'; ctx.fillText('3.' + (59 + Math.floor(random() * 40)) + '9', w * 0.76, h * 0.34, w * 0.4);
      ctx.fillStyle = '#f2c81c'; ctx.fillRect(0, h * 0.62, w, h * 0.38); write(ctx, 'EXIT NOW · EASY ON / OFF', w / 2, h * 0.81, h * 0.24, '#16181a', { max: w * 0.92 });
    }, { px: 384, glow: panelGlow });
    sub.position.set(0, 52.4, 0.82); tower.add(sub);
    const subBack = new THREE.Mesh(new THREE.BoxGeometry(12.5, 4.9, 1.4), art.material('#3a3d40')); subBack.position.set(0, 52.4, 0); tower.add(subBack);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), art.material('#ff3a2a', { emissive: '#ff2a1c', emissiveIntensity: 1 + night * 2 })); beacon.position.set(0, 67.2, 0); tower.add(beacon);

    // Regional dressing along the right-hand edge of the lot, and light poles out on the apron.
    const cones = new Batch();
    for (let i = 0; i < 12; i++) {
      const [x, z] = view(34 + random() * 46, 9 + random() * 30);
      if (a.region === 'desert') { const h = 3 + random() * 3; drums.put([0.5, h, 0.5], [x, h / 2, z], '#5d7a4a'); for (const sx of [-1, 1]) if (random() < 0.75) { const ay = h * (0.35 + random() * 0.2); drums.put([0.32, 0.9, 0.32], [x + sx * 0.6, ay, z], '#5d7a4a', [0, 0, Math.PI / 2]); drums.put([0.32, 1.2 + random(), 0.32], [x + sx * 1.0, ay + 0.6, z], '#5d7a4a'); } }
      else if (a.region === 'pines') { const h = 9 + random() * 7; drums.put([0.5, h * 0.3, 0.5], [x, h * 0.15, z], '#4a3526'); for (let t = 0; t < 3; t++) cones.put([3.4 - t * 0.8, h * 0.42, 3.4 - t * 0.8], [x, h * (0.36 + t * 0.24), z], snowy ? '#6f8a7c' : '#2f5240'); }
      else if (a.region === 'prairie') { const [px, pz] = view(30 + i * 7, 14 + i * 1.2); drums.put([0.3, 9, 0.3], [px, 4.5, pz], '#5a4636'); boxes.put([2.4, 0.16, 0.16], [px, 8.4, pz], '#5a4636', [0, FACE, 0]); }
      else { snow.put([7 + random() * 6, 1.6 + random() * 1.4, 3 + random() * 2], [x, 0.5, z], '#f2f5f7', [0, random() * 3, 0]); }
    }
    for (const [al, la] of [[30, 13], [52, 20], [44, -3], [70, 8]]) { const [x, z] = view(al, la); drums.put([0.3, 12, 0.3], [x, 6, z], steelGrey); boxes.put([2.6, 0.18, 0.7], [x, 12, z], steelGrey, [0, FACE, 0]); lamps.put([2.3, 0.1, 0.55], [x, 11.9, z], '#ffffff', [0, FACE, 0]); }
    if (snowy) for (let i = 0; i < 9; i++) { const [x, z] = view(16 + random() * 30, 5 + random() * 14); snow.put([3 + random() * 4, 0.7 + random() * 0.9, 2 + random() * 2], [x, 0.2, z], '#f2f5f7', [0, random() * 3, 0]); }

    // Lane dressing: cones, barrels, a mop bucket; more of it when the place is cluttered.
    const coneAt = (x: number, z: number) => { cones.put([0.36, 0.7, 0.36], [x, 0.36, z], '#e8662a'); boxes.put([0.42, 0.04, 0.42], [x, 0.02, z], '#e8662a'); };
    if (a.lanes === 'closed') { for (let i = 0; i < 5; i++) coneAt(-3.5 + (i - 2) * 0.9, 7.4 + Math.abs(i - 2) * 0.25); for (let i = 0; i < 4; i++) coneAt(-8.5 + (i - 1.5) * 1.0, 7.6); }
    if (a.lanes === 'clean') for (let i = 0; i < 4; i++) cones.put([0.36, 0.7, 0.36], [ISLANDS[1] + 0.1, 0.17 + 0.36 + i * 0.12, 4.9], '#e8662a');
    if (a.lanes === 'spill') { drums.put([0.4, 0.45, 0.4], [-0.6, 0.23, 6.6], '#e3b414'); drums.put([0.04, 1.4, 0.04], [-0.5, 0.8, 6.5], '#c9b08a', [0.3, 0, 0.2]); coneAt(0.2, 7.6); coneAt(-2.2, 6.9); boxes.put([0.5, 0.6, 0.34], [-1.4, 0.3, 7.3], '#d9c9a0'); }
    const clutter = Math.round(mood.density * 6);
    for (let i = 0; i < clutter; i++) { const [x, z] = view(15 + random() * 16, 5 + random() * 7); if (i % 2) drums.put([0.6, 0.9, 0.6], [x, 0.45, z], ['#1f5fb0', '#2b2d30', '#c9281f'][i % 3]); else boxes.put([1.2, 0.14, 1.0], [x, 0.07, z], '#b98d5c', [0, random() * 3, 0]); }
    for (const k of [0, 2, 3]) { drums.put([0.5, 0.85, 0.5], [ISLANDS[k] + 0.0, 0.17 + 0.43, -2.0], darkGrey); }

    const plain = (colour = '#ffffff', extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.82, ...extra });
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    root.add(boxes.mesh(unitBox, plain()));
    root.add(drums.mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 14), plain()));
    root.add(cones.mesh(new THREE.ConeGeometry(0.5, 1, 9), plain()));
    root.add(snow.mesh(new THREE.SphereGeometry(0.5, 12, 8), plain('#ffffff', { roughness: 1 })));
    const lampMat = plain('#ffffff', { emissive: lampColour, emissiveIntensity: 0.2 + night * 1.6 });
    root.add(lamps.mesh(unitBox, lampMat, false));
    root.add(ambers.mesh(unitBox, plain('#ffab2e', { emissive: '#ff9a1c', emissiveIntensity: 0.3 + night * 2 }), false));
    // The fixture over the hero's lane is its own mesh so it can flicker.
    const flickerMat = plain('#ffffff', { emissive: lampColour, emissiveIntensity: 0.2 + night * 1.6 });
    const flickerLamp = art.box([0.8, 0.07, 1.9], [1.5, UNDER - 0.05, 6.0], flickerMat); flickerLamp.castShadow = false;
    art.box([1.0, 0.1, 2.1], [1.5, UNDER - 0.03, 6.0], plain(steelGrey));

    // Wet-night reflections and heat mirage: soft unlit streaks on the ground.
    if (wet) for (const x of lanesX) for (const z of [-3.6, 1.2, 6.0]) {
      const streak = art.box([0.9, 0.005, 5.5], [x + 1.6, 0.02, z + 1.4], new THREE.MeshStandardMaterial({ color: '#000000', emissive: lampColour, emissiveIntensity: 0.9, transparent: true, opacity: 0.2, depthWrite: false }));
      streak.rotation.y = FACE; streak.castShadow = false;
    }
    if (a.sky === 'heat') for (let i = 0; i < 4; i++) { const [x, z] = view(46 + i * 14, 6 + (random() - 0.5) * 30); const mirage = art.box([26 + random() * 20, 0.005, 2.2], [x, 0.03, z], new THREE.MeshStandardMaterial({ color: '#000000', emissive: sky.top, emissiveIntensity: 0.9, transparent: true, opacity: 0.45, depthWrite: false })); mirage.rotation.y = FACE; mirage.castShadow = false; }

    // Rain or snow, falling through the view.
    const falling = a.sky === 'rain' || a.sky === 'snow' ? 320 : 0;
    const drops: { x: number; y: number; z: number; v: number; ph: number }[] = [];
    let weather: THREE.InstancedMesh | null = null;
    if (falling) {
      const geometry = a.sky === 'rain' ? new THREE.BoxGeometry(0.012, 0.55, 0.012) : new THREE.SphereGeometry(0.035, 5, 4);
      weather = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: a.sky === 'rain' ? '#cfd8ea' : '#ffffff', emissiveIntensity: 0.7, transparent: true, opacity: a.sky === 'rain' ? 0.5 : 0.95, depthWrite: false }), falling);
      for (let i = 0; i < falling; i++) {
        const [x, z] = view(3 + random() * 26, (random() - 0.5) * 22);
        const inside = x > X0 && x < X1 && z > Z0 && z < Z1;
        drops.push({ x, y: random() * (inside && a.sky === 'rain' ? 0 : 9), z, v: a.sky === 'rain' ? 9 + random() * 4 : 0.8 + random() * 0.9, ph: random() * 6.28 });
        if (inside && a.sky === 'rain') { const edge = view(4 + random() * 8, (random() - 0.5) * 9); drops[i].x = Math.max(edge[0], X1 + 0.2 + random() * 5); drops[i].z = edge[1]; drops[i].y = random() * 9; }
      }
      weather.frustumCulled = false; root.add(weather);
    }
    const matrix = new THREE.Matrix4(), lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, -0.18));
    const fall = (dt: number, time: number) => {
      if (!weather) return;
      const gust = mix(0.4, 2.2, mood.energy);
      drops.forEach((drop, i) => {
        drop.y -= drop.v * dt; if (drop.y < 0) drop.y += 9;
        const sway = a.sky === 'snow' ? Math.sin(time * 1.3 + drop.ph) * 0.5 * gust + ((time * gust * 1.4 + drop.ph * 3) % 6) - 3 : 0;
        matrix.compose(new THREE.Vector3(drop.x + sway * RIGHT.x, drop.y, drop.z + sway * RIGHT.z), lean, new THREE.Vector3(1, 1, 1));
        weather!.setMatrixAt(i, matrix);
      });
      weather.instanceMatrix.needsUpdate = true;
    };
    fall(0, 0);

    // ---- Camera and placement.
    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1500);
    camera.position.copy(CAM);
    camera.lookAt(CAM.x + U.x * 20 * Math.cos(0.175), CAM.y + 20 * Math.sin(0.175), CAM.z + U.z * 20 * Math.cos(0.175));
    const heroAt: [number, number] = [1.5, 4.4];
    const slots: { x: number; z: number; y: number; r: number; h: number }[] = [
      { x: ISLANDS[0], z: 4.35, y: 0.17, r: 0.62, h: 3.0 },
      { x: 1.9, z: 8.7, y: 0, r: 1.4, h: 3.2 },
      { x: 6.9, z: 5.2, y: 0, r: 1.25, h: 2.7 },
      { x: -4.0, z: -11.2, y: 0, r: 4.2, h: 6.5 },
      { x: ISLANDS[2], z: 4.4, y: 0.17, r: 0.62, h: 3.0 },
      { x: -14.2, z: -12.8, y: 0, r: 4.5, h: 7 },
    ];
    // Near true size: big things shrink a little, small things grow a little, a cab still towers.
    const shown = (item: Placeable) => Math.min(1.7, (1.7 * item.height ** 0.55) / Math.max(item.height, 0.05));

    const place = (items: readonly Placeable[]) => {
      const free = slots.map(() => true);
      items.forEach((item, index) => {
        let scale = shown(item);
        if (index === 0) {
          scale = Math.min(scale, 4.5 / Math.max(item.height, 0.05), 3.4 / Math.max(item.radius, 0.05));
          const long = item.radius * scale > 1.7;
          item.holder.scale.setScalar(scale);
          item.holder.position.set(heroAt[0], 0, long ? heroAt[1] - 2.0 : heroAt[1]);
          item.holder.rotation.y = long ? 0.1 + (random() - 0.5) * 0.08 : FACE - 0.4 + (random() - 0.5) * 0.3;
          return;
        }
        const fits = (slot: (typeof slots)[number]) => Math.min(slot.r / Math.max(item.radius * scale, 0.01), slot.h / Math.max(item.height * scale, 0.01));
        let pick = slots.findIndex((slot, i) => free[i] && fits(slot) >= 1);
        if (pick < 0) pick = slots.reduce((best, slot, i) => (free[i] && (best < 0 || fits(slot) > fits(slots[best])) ? i : best), -1);
        if (pick < 0) pick = index % slots.length;
        free[pick] = false;
        const slot = slots[pick];
        scale *= Math.min(1, fits(slot));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, slot.y, slot.z);
        item.holder.rotation.y = FACE - 0.25 + (random() - 0.5) * 0.7;
      });
      // Low sun from the camera's side, so it reaches in under the canopy and lights the faces we see.
      const swing = mix(-1, 1, mood.daylight);
      key.target.position.set(-3, 0, 1);
      key.position.set(-3 + 22 + swing * 10, 6 + sky.lift * 26, 1 + 30 - swing * 8);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -30; shadow.right = shadow.top = 30;
      shadow.near = 1; shadow.far = 140;
      shadow.updateProjectionMatrix();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    const flick = wear * mix(0.3, 1, mood.energy), base = 0.2 + night * 1.6;
    return {
      object: root,
      camera,
      background: new THREE.Color(sky.low),
      capacity: 7,
      ground: lot,
      keyLight: key,
      place,
      update(dt, time) {
        fall(Math.min(dt, 0.1), time);
        flickerMat.emissiveIntensity = base * (1 - flick * (Math.sin(time * 19) * Math.sin(time * 6.3) > 0.5 ? 0.85 : 0));
      },
      dispose() { key.shadow.map?.dispose(); skyPlane.geometry.dispose(); art.finish().dispose(); },
    };
  },
});
