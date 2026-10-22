import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const SHAPES = {
  saloon: 'An ordinary three-box family saloon: bonnet, cabin, boot.',
  sports: 'Something long and very low with a small cabin set far back: a sports car.',
  bubble: 'A small round humped shape, an old people\'s car or a microcar.',
  van: 'A tall slab-sided box: a van or camper.',
  pickup: 'A high cab and a long flat bed behind it.',
  finned: 'A very long, wide classic with a rise at each rear corner that can only be tail fins.',
  hatch: 'A short upright hatchback, a first car.',
} as const;
/** length, width, windscreen position along the length, then [u, height] from nose to tail. */
const PROFILE: Record<keyof typeof SHAPES, { L: number; W: number; screen: number; pts: [number, number][] }> = {
  saloon: { L: 4.6, W: 1.8, screen: 0.33, pts: [[0, 0.62], [0.05, 0.76], [0.26, 0.9], [0.4, 1.4], [0.62, 1.43], [0.78, 1.02], [0.95, 0.98], [1, 0.66]] },
  sports: { L: 4.4, W: 1.9, screen: 0.44, pts: [[0, 0.45], [0.06, 0.62], [0.36, 0.76], [0.52, 1.14], [0.68, 1.14], [0.86, 0.86], [1, 0.58]] },
  bubble: { L: 3.2, W: 1.45, screen: 0.3, pts: [[0, 0.55], [0.1, 0.84], [0.24, 0.98], [0.42, 1.42], [0.66, 1.42], [0.9, 0.86], [1, 0.52]] },
  van: { L: 4.9, W: 1.95, screen: 0.16, pts: [[0, 0.75], [0.03, 1.1], [0.1, 1.22], [0.22, 1.92], [0.5, 1.98], [0.96, 1.96], [1, 1.3]] },
  pickup: { L: 5.3, W: 1.95, screen: 0.3, pts: [[0, 0.74], [0.05, 1.02], [0.24, 1.12], [0.36, 1.76], [0.54, 1.78], [0.6, 1.16], [0.97, 1.14], [1, 0.84]] },
  finned: { L: 5.5, W: 2.0, screen: 0.36, pts: [[0, 0.62], [0.05, 0.86], [0.3, 0.96], [0.44, 1.4], [0.6, 1.4], [0.73, 0.98], [0.88, 0.98], [0.96, 1.2], [1, 0.74]] },
  hatch: { L: 3.7, W: 1.65, screen: 0.3, pts: [[0, 0.6], [0.06, 0.8], [0.24, 0.94], [0.4, 1.44], [0.84, 1.42], [0.96, 1.05], [1, 0.62]] },
};
const COVERS = {
  silver: 'Silver-grey fitted outdoor cover, the usual kind.',
  blue: 'A bright blue polytarp, not made for it.',
  canvas: 'Heavy tan canvas, an old dust sheet.',
  black: 'Black stretch fabric, sleek and deliberate.',
  red: 'Red satin, a showroom reveal that never happened.',
  white: 'A white bedsheet, like furniture in a closed house.',
} as const;
const COVER_TINT: Record<keyof typeof COVERS, string> = { silver: '#aeb4b8', blue: '#2f6fc4', canvas: '#b59a6c', black: '#2e3033', red: '#b3222a', white: '#ebe8de' };
const PAINTS = {
  red: 'Bright red.',
  green: 'Dark racing green.',
  cream: 'Cream.',
  black: 'Black.',
  sky: 'Pale sky blue.',
  primer: 'Patchy primer grey and rust.',
} as const;
const PAINT_TINT: Record<keyof typeof PAINTS, string> = { red: '#c2281f', green: '#1f4a36', cream: '#e6dcbc', black: '#17181a', sky: '#8ebfe0', primer: '#8a7f78' };

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    silhouette: choice('What does the shape under the cover suggest?', SHAPES),
    cover: choice('What is the cover?', COVERS),
    fit: choice('How does the cover sit?', {
      strapped: 'Lashed down with bungee cords and weighted with bricks.',
      fitted: 'Tight and elasticated under the bumpers, every contour legible.',
      slipped: 'Slipped back off the nose, showing a headlight and a corner of paint.',
      loose: 'Loose and generous, pooling on the floor in soft folds.',
    }),
    time: score('How long has it clearly been there?', ['Parked last night, the cover still creased from its bag', 'A few weeks', 'A whole winter: an even film of dust', 'Years: thick dust, flat tyres, leaves drifted against the wheels']),
    notice: choice('What is stuck to the windscreen bulge?', {
      none: 'Nothing.',
      penalty: 'A yellow and black penalty notice in a plastic sleeve.',
      aware: 'A fluorescent orange sticker: the authorities are aware of this vehicle.',
      sale: 'A handwritten FOR SALE sign with a phone number.',
      note: 'A folded handwritten note under a strip of tape.',
    }),
    paint: choice('If a corner of the car shows, what colour is the paint?', PAINTS),
    cat: noul('Is a cat asleep on the roof?'),
    bay: noul('Is it parked inside painted bay lines?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const { L, W, screen, pts } = PROFILE[a.silhouette];
    const age = Math.min(1, a.time * 0.85 + mood.wear * 0.25);
    const flat = a.time > 0.7 ? mix(0.4, 1, (a.time - 0.7) / 0.3) : 0;
    const sink = flat * 0.07;
    const loose = { fitted: 0.15, loose: 1, strapped: 0.7, slipped: 0.55 }[a.fit];
    const N = 112, M = 44;

    // Height along the length, softened the way cloth bridges hollows.
    let heights = Array.from({ length: N + 1 }, (_unused, i) => {
      const u = i / N;
      let k = 0;
      while (k < pts.length - 2 && pts[k + 1][0] < u) k++;
      const t = THREE.MathUtils.clamp((u - pts[k][0]) / (pts[k + 1][0] - pts[k][0]), 0, 1);
      return mix(pts[k][1], pts[k + 1][1], t * t * (3 - 2 * t));
    });
    const blur = (values: number[], passes: number) => { for (let p = 0; p < passes; p++) values = values.map((_unused, i) => (values[Math.max(0, i - 1)] + values[i] * 2 + values[Math.min(N, i + 1)]) / 4); return values; };
    const bodyHeights = blur(heights, 2);
    heights = blur(heights, 2 + Math.round(loose * 3));
    // Cloth can only rest on or above the car.
    heights = heights.map((h, i) => Math.max(h, bodyHeights[i]) + 0.012);

    const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2);
    const liftAt = random() < 0.5 ? 1 : -1; // which side the hem rides up on
    const hemAt = (u: number, side: number) => {
      if (a.fit === 'fitted') return 0.3 + Math.sin(u * 23 + phases[0]) * 0.012;
      const base = a.fit === 'loose' ? 0.015 : a.fit === 'strapped' ? 0.24 : 0.2;
      const wave = (Math.sin(u * 31 + phases[1] + side) * 0.5 + 0.5) * (a.fit === 'loose' ? 0.03 : 0.08);
      // One wheel is always left peeking out.
      const peek = side === liftAt ? Math.exp(-(((u - 0.2) / 0.09) ** 2)) * 0.3 : Math.exp(-(((u - 0.8) / 0.08) ** 2)) * 0.18;
      return base + wave + peek;
    };
    const surface = (u: number, v: number, shrink = 0, cloth = true) => {
      const i = Math.min(N - 1, Math.floor(u * N)), f = u * N - i;
      const table = cloth ? heights : bodyHeights;
      const H = mix(table[i], table[i + 1], f) - sink - shrink;
      const e = Math.sqrt(1 - (1 - Math.min(1, u / 0.07, (1 - u) / 0.07)) ** 2);
      const th = v * Math.PI, c = Math.cos(th), sn = Math.sin(th);
      const side = c >= 0 ? 1 : -1;
      const hem = cloth ? hemAt(u, side) : 0.34;
      const top = hem + Math.max(0.05, H - hem) * (0.25 + 0.75 * e);
      const up = sn ** 0.55;
      let x = (W / 2 - shrink) * (0.84 + 0.16 * e) * side * Math.abs(c) ** 0.3;
      const y = hem + (top - hem) * up;
      const belt = 0.95 - sink;
      if (top > belt + 0.12 && y > belt) x *= 1 - 0.24 * Math.min(1, (top - belt) / 0.3) * ((y - belt) / (top - belt)) ** 0.8;
      // Wing mirrors push two small tents into the cloth at the foot of the windscreen.
      const mirror = Math.exp(-(((u - screen + 0.02) / 0.022) ** 2)) * Math.exp(-(((y - belt - 0.05) / 0.1) ** 2));
      x += side * mirror * 0.17 * (cloth ? 1 : 0.9);
      let z = L / 2 - L * u;
      if (cloth) {
        const low = (1 - up) ** 2;
        x *= 1 + loose * low * (a.fit === 'loose' ? 0.07 : 0.02) + loose * low * 0.04 * Math.sin(u * 64 + phases[2] + side * 2);
        if (a.fit === 'fitted') x *= 1 - low * 0.07;
        // Creases and sags across the whole sheet.
        const crease = Math.sin(u * 38 + phases[3] + Math.sin(v * 9 + phases[4]) * 2.5) * 0.008 + Math.sin(v * 27 + phases[5] + u * 11) * 0.006;
        const out = (0.35 + loose) * crease * (0.4 + (1 - up));
        x += side * out * Math.abs(c); z += out * 0.5;
        return new THREE.Vector3(x, y + out * sn, z);
      }
      return new THREE.Vector3(x, y, z);
    };
    const loft = (u0: number, u1: number, shrink: number, cloth: boolean) => {
      const geometry = new THREE.PlaneGeometry(1, 1, N, M);
      const p = geometry.attributes.position;
      for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
        const point = surface(mix(u0, u1, i / N), j / M, shrink, cloth);
        p.setXYZ(j * (N + 1) + i, point.x, point.y, point.z);
      }
      geometry.computeVertexNormals();
      return geometry;
    };

    // The cover, dusted from above.
    const uStart = a.fit === 'slipped' ? Math.max(0.16, screen - 0.1) : 0;
    const cloth = loft(uStart, 1, 0, true);
    const base = new THREE.Color(COVER_TINT[a.cover]).lerp(new THREE.Color('#8b8275'), mood.wear * 0.15);
    const dust = new THREE.Color('#b9ad97');
    const colours = new Float32Array(cloth.attributes.position.count * 3);
    const normal = cloth.attributes.normal, tmp = new THREE.Color();
    for (let i = 0; i < normal.count; i++) {
      const facingUp = Math.max(0, Math.abs(normal.getY(i)) - 0.25) / 0.75;
      const patch = 0.75 + 0.25 * Math.sin(cloth.attributes.position.getX(i) * 7 + phases[6]) * Math.sin(cloth.attributes.position.getZ(i) * 5 + phases[7]);
      tmp.copy(base).lerp(dust, Math.min(0.92, age * (0.2 + facingUp * 0.95) * patch));
      colours.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    cloth.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const sheen = a.cover === 'red' ? 0.32 : a.cover === 'blue' || a.cover === 'black' ? 0.5 : 0.85;
    s.mesh(cloth, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: Math.min(1, sheen + age * 0.3), side: THREE.DoubleSide, flatShading: a.cover === 'blue' }));

    // What is underneath: chassis shadow, tyres, and the car itself where it shows.
    const dark = s.material('#17181a', { roughness: 0.9 });
    s.box([W * 0.82, 0.3, L * 0.86], [0, 0.36 - sink, 0], dark);
    const tyre = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 22);
    const hubMat = s.material('#9aa0a2', { metalness: 0.6, roughness: 0.4 });
    for (const x of [-1, 1]) for (const z of [0.3, -0.3]) {
      const squash = 1 - flat * mix(0.12, 0.3, random());
      const wheel = s.mesh(tyre.clone(), dark, [x * (W / 2 - 0.1), 0.33 * squash, z * L]);
      wheel.rotation.z = Math.PI / 2; wheel.scale.set(squash, 1, 1 + (1 - squash) * 0.6);
      s.cylinder(0.19, 0.19, 0.01, [x * (W / 2 + 0.014), 0.33 * squash, z * L], hubMat, 14).rotation.z = Math.PI / 2;
    }
    tyre.dispose();
    if (a.fit === 'slipped') {
      const bodyMat = s.material(PAINT_TINT[a.paint], { roughness: a.paint === 'primer' ? 0.9 : 0.28, metalness: 0.3, side: THREE.DoubleSide });
      s.mesh(loft(0, Math.min(1, uStart + 0.12), 0.03, false), bodyMat);
      const noseY = bodyHeights[4] - sink;
      const chrome = s.material('#d9dee0', { metalness: 0.9, roughness: 0.18 });
      const glass = new THREE.MeshStandardMaterial({ color: '#f4f1dc', emissive: '#fff1c2', emissiveIntensity: mix(0.05, 0.35, mood.cheer), roughness: 0.15 });
      for (const x of [-1, 1]) {
        const lamp = s.cylinder(0.1, 0.1, 0.05, [x * W * 0.33, noseY - 0.1, L / 2 - 0.035], chrome, 18);
        lamp.rotation.x = Math.PI / 2;
        s.ball([0.085, 0.085, 0.04], [x * W * 0.33, noseY - 0.1, L / 2 - 0.005], glass, 16);
      }
      s.box([W * 0.42, 0.13, 0.04], [0, noseY - 0.12, L / 2 - 0.02], dark);
      for (let i = 0; i < 6; i++) s.box([0.012, 0.12, 0.05], [(i - 2.5) * W * 0.07, noseY - 0.12, L / 2 - 0.015], chrome);
      s.box([W * 0.92, 0.09, 0.09], [0, 0.42 - sink, L / 2 - 0.0], chrome);
      s.label(['KDX 417', 'B 0417', '417 JEV', 'SOLD'][Math.floor(random() * 4)], 0.44, 0.11, [0, 0.42 - sink, L / 2 + 0.047], '#16181a', '#e9e2b8');
      if (a.paint === 'primer') for (let i = 0; i < 6; i++) s.mesh(new THREE.CircleGeometry(0.05 + random() * 0.08, 7), s.material('#7a4028', { roughness: 1 }), [(random() - 0.5) * W * 0.7, noseY + 0.045, L / 2 - 0.25 - random() * L * (uStart - 0.08)]).rotation.x = -Math.PI / 2 + 0.06;
      // The cover bunched in a roll where it stopped.
      const roll: [number, number, number][] = [];
      for (let j = 0; j <= 16; j++) { const p = surface(uStart, j / 16); roll.push([p.x * 1.01, p.y + 0.03, p.z + 0.02 + Math.sin(j * 1.7 + phases[0]) * 0.03]); }
      s.tube(roll, 0.055, s.material(base.clone().lerp(dust, age * 0.5), { roughness: sheen }));
    }

    // Bungees and bricks.
    if (a.fit === 'strapped') {
      const cord = s.material(['#e2702a', '#2fa35a', '#d8c832'][Math.floor(random() * 3)], { roughness: 0.6 });
      const brick = s.material('#a3543a', { roughness: 0.95 });
      for (const u of [0.2 + random() * 0.06, 0.48 + random() * 0.08, 0.76 + random() * 0.06]) {
        const line: [number, number, number][] = [];
        const lean = (random() - 0.5) * 0.06;
        for (let j = 0; j <= 20; j++) { const v = 0.02 + (j / 20) * 0.96; const p = surface(u + lean * (v - 0.5), v); line.push([p.x * 1.012, p.y + 0.012, p.z]); }
        s.tube(line, 0.013, cord);
      }
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const side = i % 2 ? 1 : -1, u = 0.1 + random() * 0.8;
        const p = surface(u, side > 0 ? 0.0 : 1.0);
        const b = s.box([0.21, 0.07, 0.1], [p.x + side * 0.02, 0.035, p.z], brick);
        b.rotation.y = random() * 3;
      }
    }

    // Notice on the windscreen bulge, lying on the cloth.
    const stick = (map: THREE.Texture, w: number, h: number, u: number, v: number, turn: number, glow = 0) => {
      const p = surface(u, v), du = surface(u + 0.01, v).sub(p), dv = surface(u, v + 0.02).sub(p);
      const n = du.cross(dv).normalize();
      if (n.y < 0) n.negate();
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.7, side: THREE.DoubleSide });
      if (glow) { material.emissiveMap = map; material.emissive = new THREE.Color('#ffffff'); material.emissiveIntensity = glow; }
      const sheet = s.mesh(new THREE.PlaneGeometry(w, h), material, [p.x + n.x * 0.014, p.y + n.y * 0.014, p.z + n.z * 0.014]);
      sheet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      sheet.rotateZ(turn);
      return sheet;
    };
    const su = THREE.MathUtils.clamp(screen + 0.035, uStart + 0.06, 0.9), sv = 0.5 - liftAt * 0.12;
    const fade = (ctx: CanvasRenderingContext2D, w: number, h: number) => { ctx.fillStyle = `rgba(200,190,165,${age * 0.45})`; ctx.fillRect(0, 0, w, h); };
    if (a.notice === 'penalty') {
      stick(paint(256, 160, (ctx) => {
        ctx.fillStyle = '#f2cf1d'; ctx.fillRect(0, 0, 256, 160);
        ctx.fillStyle = '#151515'; for (let i = -2; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 28, 0); ctx.lineTo(i * 28 + 14, 0); ctx.lineTo(i * 28 - 6, 26); ctx.lineTo(i * 28 - 20, 26); ctx.fill(); }
        ctx.fillRect(0, 134, 256, 26);
        ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PENALTY', 128, 76); ctx.fillText('NOTICE', 128, 118);
        fade(ctx, 256, 160);
      }), 0.36, 0.225, su, sv, (random() - 0.5) * 0.5);
      // Older ones pile up with the months.
      for (let i = 0; i < Math.round(a.time * 3); i++) stick(paint(64, 40, (ctx) => { ctx.fillStyle = '#e6d9a0'; ctx.fillRect(0, 0, 64, 40); ctx.fillStyle = '#5a5648'; ctx.fillRect(6, 8, 52, 6); ctx.fillRect(6, 22, 38, 5); }), 0.3, 0.19, su + 0.012 + i * 0.012, sv + liftAt * (0.09 + i * 0.07), random() * 2 - 1);
    } else if (a.notice === 'aware') {
      stick(paint(256, 200, (ctx) => {
        ctx.fillStyle = '#ff6a1a'; ctx.fillRect(0, 0, 256, 200);
        ctx.fillStyle = '#111'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('AUTHORITY', 128, 62, 236); ctx.fillText('AWARE', 128, 116);
        ctx.fillRect(24, 140, 208, 6); ctx.fillRect(24, 160, 150, 6);
        fade(ctx, 256, 200);
      }), 0.4, 0.31, su, sv, (random() - 0.5) * 0.4, 0.35);
    } else if (a.notice === 'sale') {
      stick(paint(256, 180, (ctx) => {
        ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, 256, 180);
        ctx.fillStyle = '#b3271f'; ctx.font = 'bold 58px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FOR SALE', 128, 70, 236);
        ctx.fillStyle = '#1f2a4a'; ctx.font = 'bold 38px monospace'; ctx.fillText('555-0417', 128, 126); ctx.font = 'bold 24px sans-serif'; ctx.fillText('RUNS (DID)', 128, 162);
        fade(ctx, 256, 180);
      }), 0.48, 0.34, su, 0.5, (random() - 0.5) * 0.2);
    } else if (a.notice === 'note') {
      stick(paint(128, 96, (ctx) => {
        ctx.fillStyle = '#f6f3e6'; ctx.fillRect(0, 0, 128, 96);
        ctx.strokeStyle = '#27407a'; ctx.lineWidth = 2;
        for (let r = 0; r < 4; r++) { ctx.beginPath(); for (let x = 10; x < 118 - (r === 3 ? 50 : 0); x += 4) ctx.lineTo(x, 22 + r * 18 + Math.sin(x * 0.7 + r) * 3); ctx.stroke(); }
        fade(ctx, 128, 96);
      }), 0.26, 0.195, su, sv, (random() - 0.5) * 0.8);
      stick(paint(8, 8, (ctx) => { ctx.fillStyle = '#c9b86a'; ctx.fillRect(0, 0, 8, 8); }), 0.12, 0.035, su - 0.02, sv, random());
    }

    // A cat on the warmest, highest place.
    if (a.cat) {
      let best = Math.round(N * 0.5);
      for (let i = Math.round(N * Math.max(0.2, uStart + 0.12)); i < N * 0.8; i++) if (heights[i] > heights[best] + 0.001) best = i;
      const at = surface(best / N, 0.5 + (random() - 0.5) * 0.12);
      const fur = s.material(['#2a2a2c', '#c9803a', '#d8d4c8', '#7a7872'][Math.floor(random() * 4)], { roughness: 1 });
      const g = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geometry, fur); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
      const ball = new THREE.SphereGeometry(1, 14, 10);
      part(ball, 0, 0.08, 0, 0.2, 0.1, 0.15);
      part(ball, 0.13, 0.085, 0.09, 0.075, 0.065, 0.07);
      for (const z of [0.05, 0.13]) part(new THREE.ConeGeometry(0.025, 0.05, 4), 0.14, 0.16, z);
      const tail = part(new THREE.TorusGeometry(0.15, 0.022, 6, 16, Math.PI * 1.1), 0.0, 0.03, 0.02);
      tail.rotation.x = Math.PI / 2; tail.rotation.z = 2.4;
      g.position.copy(at); g.rotation.y = random() * Math.PI * 2;
      s.root.add(g);
    }

    // The floor around it.
    if (a.bay) {
      const line = s.material('#ecebe2', { roughness: 0.9 });
      for (const x of [-1, 1]) s.box([0.1, 0.005, L + 0.9], [x * (W / 2 + 0.42), 0.003, 0], line);
      s.box([W + 0.94, 0.005, 0.1], [0, 0.003, -L / 2 - 0.45], line);
      const number = s.label(String(100 + Math.floor(random() * 380)), 1.1, 0.5, [0, 0.004, L / 2 + 0.42], '#ecebe2', '#8f8e87');
      number.rotation.x = -Math.PI / 2;
      const m = number.material as THREE.MeshStandardMaterial;
      m.alphaMap = m.map; m.transparent = true; m.alphaTest = 0.62; m.map = null; m.color.set('#ecebe2');
    }
    if (age > 0.35) {
      // Oil that has had time to spread, and what the draught has brought in.
      const oil = new THREE.MeshStandardMaterial({ color: '#1b1a18', roughness: 0.25, transparent: true, opacity: 0.75, depthWrite: false });
      for (let i = 0; i < 1 + Math.round(age * 2); i++) { const r = mix(0.1, 0.42, random()) * age; const m = s.mesh(new THREE.CircleGeometry(r, 18), oil, [(random() - 0.5) * 0.5, 0.004 + i * 0.001, L * mix(0.1, 0.5, random())]); m.rotation.x = -Math.PI / 2; m.scale.y = mix(0.6, 1, random()); }
      const count = Math.round(age * mix(8, 46, mood.density));
      const leaves = Array.from({ length: count }, () => {
        const side = random() < 0.5 ? -1 : 1, nearWheel = random() < 0.6;
        const z = nearWheel ? (random() < 0.5 ? 0.3 : -0.3) * L + (random() - 0.5) * 0.7 : (random() - 0.5) * L;
        return { at: [side * (W / 2 + 0.05 + random() * 0.3), 0.012, z] as const, size: 0.02 + random() * 0.035, color: ['#8a6a3a', '#a8843a', '#6e5232', '#b0603a'][Math.floor(random() * 4)] };
      });
      if (count) s.scatter(new THREE.TetrahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), leaves);
    }

    return s.finish({ footprint: Math.max(W, L) * 0.5 });
  },
});
