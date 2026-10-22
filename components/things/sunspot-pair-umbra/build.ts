import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { makeNoise, plasmaPaint, strand, vec } from './plasma';

const STARS = {
  sun: 'A yellow-white Sun-like surface: gold granules, black spots, brown filaments.',
  white: 'A hotter pale cream-white surface, the spots a smoky grey-brown.',
  orange: 'A cooler deep orange surface, the spots nearly black.',
  red: 'A red dwarf: an ember-red surface with spots so big they blot out the light.',
} as const;
type Rgb = readonly [number, number, number];
const PALETTES: Record<keyof typeof STARS, { cell: string; lane: string; penDark: string; penLight: string; umbra: string; core: string; faculae: string; flare: string }> = {
  sun: { cell: '#ffd98a', lane: '#d98a2c', penDark: '#5e2a0c', penLight: '#c27a34', umbra: '#2a120a', core: '#120604', faculae: '#fff8e2', flare: '#ffffff' },
  white: { cell: '#fff3d8', lane: '#e2b878', penDark: '#6a5242', penLight: '#c8a47c', umbra: '#3a2c26', core: '#1e1614', faculae: '#ffffff', flare: '#f4fbff' },
  orange: { cell: '#ffb058', lane: '#c45a14', penDark: '#4a1c06', penLight: '#a8541c', umbra: '#1c0a04', core: '#0a0302', faculae: '#ffeac0', flare: '#fff6dc' },
  red: { cell: '#ff7a46', lane: '#a83212', penDark: '#3a0e04', penLight: '#8a2c10', umbra: '#160604', core: '#080201', faculae: '#ffc8a0', flare: '#ffe8d0' },
};

interface Spot { x: number; z: number; ru: number; rp: number; id: number; edge: Float32Array; inner: Float32Array }

const rgb = (color: string): Rgb => {
  const value = new THREE.Color(color).getHex();
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const blend = (a: Rgb, b: Rgb, t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

export default defineThing({
  questions: {
    arrangement: choice('How are the spots arranged?', {
      pair: 'A classic pair: a big round leader and a smaller ragged follower behind it.',
      twins: 'Two matched spots side by side, like a pair of eyes.',
      trail: 'One big leader dragging a long trail of small spots and pores behind it.',
      merged: 'Two dark cores sharing one penumbra, split by a bright light bridge.',
      delta: 'A tangled knot of several cores jammed together in one twisted penumbra: the kind that flares.',
    }),
    star: choice('What kind of star is this the surface of?', STARS),
    doing: choice('What is happening to the spots right now?', {
      quiet: 'Nothing: they sit there, dark and patient.',
      flaring: 'A flare: two blazing white ribbons and a row of bright loops between the spots.',
      loops: 'Faint glowing loops of plasma arching from one spot to the other.',
      emerging: 'Newly born: the surface bulging between them and small pores still bubbling up.',
      decaying: 'Breaking up: the penumbra torn open and the cores crumbling into fragments.',
    }),
    penumbra: choice('What do the filaments around each dark core look like?', {
      fine: 'Fine straight filaments radiating out like the iris of an eye.',
      swirl: 'Filaments swept into a spiral, as if the spot were turning.',
      ragged: 'A ragged broken fringe, thick in places and missing in others.',
    }),
    size: score('How big are the spots?', ['Small, barely bigger than the granules', 'Ordinary sunspots', 'Giant spots that could swallow worlds']),
    earth: noul('Is a tiny Earth set beside them for scale?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random, seed } = context;
    const noise = makeNoise(seed);
    const palette = PALETTES[a.star];
    const R = 3.6;
    const k = mix(0.78, 1.3, a.size) * (a.star === 'red' ? 1.2 : 1);
    const jitter = (amount: number) => (random() - 0.5) * amount;

    // ---- Where the spots sit. ----
    const spots: Spot[] = [];
    const ragged = { fine: 0.1, swirl: 0.14, ragged: 0.42 }[a.penumbra] + mood.wear * 0.15 + (a.doing === 'decaying' ? 0.25 : 0);
    const add = (x: number, z: number, ru: number, rp: number) => {
      const id = spots.length;
      const edge = new Float32Array(361), inner = new Float32Array(361);
      for (let i = 0; i <= 360; i++) {
        const angle = (i / 360) * Math.PI * 2, cx = Math.cos(angle) * 1.4 + id * 7.1, cz = Math.sin(angle) * 1.4;
        let outer = 1 + ragged * noise(cx, cz, 3);
        if (a.doing === 'decaying') outer *= mix(0.3, 1, smooth(-0.25, 0.2, noise(cx * 0.7 + 3, cz * 0.7, 8)));
        edge[i] = rp * outer;
        inner[i] = ru * (1 + 0.16 * noise(cx * 1.8 + 5, cz * 1.8, 6));
      }
      spots.push({ x, z, ru, rp, id, edge, inner });
    };
    if (a.arrangement === 'pair') {
      add(-1.35 + jitter(0.2), -0.1 + jitter(0.3), 0.42 * k, 0.95 * k);
      add(1.4 + jitter(0.2), 0.25 + jitter(0.3), 0.27 * k, 0.7 * k);
    } else if (a.arrangement === 'twins') {
      add(-1.2, jitter(0.2), 0.37 * k, 0.86 * k);
      add(1.2, jitter(0.2), 0.37 * k, 0.86 * k);
    } else if (a.arrangement === 'trail') {
      add(-1.6, jitter(0.2), 0.45 * k, 0.98 * k);
      const count = 5 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const ru = mix(0.2, 0.06, t) * k;
        add(mix(-0.4, 2.3, t) + jitter(0.2), Math.sin(t * 3 + random()) * 0.35 + jitter(0.3), ru, ru * (random() < 0.35 ? 1.1 : mix(1.6, 2.2, random())));
      }
    } else if (a.arrangement === 'merged') {
      add(-0.42 * k, jitter(0.1), 0.34 * k, 1.0 * k);
      add(0.42 * k, jitter(0.1), 0.3 * k, 0.95 * k);
    } else {
      const count = 3 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + random();
        add(Math.cos(angle) * 0.68 * k, Math.sin(angle) * 0.5 * k, mix(0.26, 0.36, random()) * k, mix(0.78, 0.98, random()) * k);
      }
    }
    // Mood scatters a few lone pores; a decaying spot sheds fragments; a new one bubbles up pores.
    const pores = Math.round(mood.density * 5) + (a.doing === 'emerging' ? 8 : 0) + (a.doing === 'decaying' ? 6 : 0);
    const main = spots.slice();
    for (let i = 0; i < pores; i++) {
      let x: number, z: number;
      if (a.doing === 'emerging') { x = jitter(1.4); z = jitter(1.0); }
      else if (a.doing === 'decaying') { const host = main[Math.floor(random() * main.length)]; const angle = random() * 6.28; x = host.x + Math.cos(angle) * host.rp * mix(0.9, 1.6, random()); z = host.z + Math.sin(angle) * host.rp * mix(0.9, 1.6, random()); }
      else { const angle = random() * 6.28, reach = mix(1.2, 2.8, random()); x = Math.cos(angle) * reach; z = Math.sin(angle) * reach * 0.7; }
      const ru = mix(0.04, 0.09, random()) * Math.max(0.8, k);
      add(x, z, ru, ru * (random() < 0.6 ? 1.1 : 1.8));
    }
    const leader = main[0];
    const follower = main.length > 1 ? main.slice(1).reduce((best, spot) => (spot.ru > best.ru ? spot : best), main[1]) : main[0];

    const swirl = a.penumbra === 'swirl' ? 1.8 : a.arrangement === 'delta' ? 1.2 : 0;
    const edgeAt = new Float32Array(721);
    for (let i = 0; i <= 720; i++) {
      const angle = (i / 720) * Math.PI * 2;
      edgeAt[i] = R * (0.9 + 0.07 * noise(Math.cos(angle) * 2 + 40, Math.sin(angle) * 2, 1));
    }
    const lookup = (table: Float32Array, angle: number) => table[Math.round(((angle / (Math.PI * 2)) % 1 + 1) % 1 * (table.length - 1))];
    const bulge = a.doing === 'emerging' ? { x: (leader.x + follower.x) / 2, z: (leader.z + follower.z) / 2 } : null;

    // ---- The surface: height (the Wilson depression of each spot, the star's curve) and paint. ----
    const heightAt = (x: number, z: number) => {
      const r = Math.hypot(x, z);
      let y = 0.2 * (1 - (r / R) ** 2);
      for (const spot of spots) {
        const d = Math.hypot(x - spot.x, z - spot.z);
        if (d < spot.rp * 1.1) y -= spot.ru * 0.32 * (1 - smooth(spot.ru * 0.5, spot.rp * 1.05, d));
      }
      if (bulge) y += 0.22 * Math.exp(-((x - bulge.x) ** 2 + (z - bulge.z) ** 2) / 0.6);
      const edge = lookup(edgeAt, Math.atan2(z, x));
      if (r > edge * 0.9) y -= Math.min(1, (r - edge * 0.9) / (edge * 0.1)) ** 2 * 0.12;
      return y;
    };

    const N = 1024, cell = 14;
    const grid = Math.ceil(N / cell) + 2;
    const seeds = new Float32Array(grid * grid * 3);
    for (let i = 0; i < grid * grid; i++) {
      seeds[i * 3] = random();
      seeds[i * 3 + 1] = random();
      seeds[i * 3 + 2] = mix(0.82, 1.08, random());
    }
    /** Granulation: bright convection cells divided by dark lanes, as a cell brightness 0..1. */
    const granule = (px: number, py: number) => {
      const gx = Math.floor(px / cell), gy = Math.floor(py / cell);
      let d1 = 1e9, d2 = 1e9, bright = 1;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const cx = gx + ox, cy = gy + oy;
          if (cx < -1 || cy < -1 || cx >= grid - 1 || cy >= grid - 1) continue;
          const index = ((cy + 1) * grid + (cx + 1)) * 3;
          const sx = (cx + seeds[index]) * cell, sy = (cy + seeds[index + 1]) * cell;
          const d = Math.hypot(px - sx, py - sy);
          if (d < d1) { d2 = d1; d1 = d; bright = seeds[index + 2]; } else if (d < d2) d2 = d;
        }
      return smooth(0, 3.2, d2 - d1) * (0.8 + 0.2 * (1 - Math.min(1, d1 / cell))) * bright;
    };
    const cellRgb = blend(rgb(palette.cell), mood.warmth > 0.5 ? rgb('#ff9440') : rgb('#fffaf0'), Math.abs(mood.warmth - 0.5) * 0.35);
    const laneRgb = rgb(palette.lane), penDark = rgb(palette.penDark), penLight = rgb(palette.penLight);
    const umbraRgb = rgb(palette.umbra), coreRgb = rgb(palette.core), faculaeRgb = rgb(palette.faculae), flareRgb = rgb(palette.flare);
    const bridge = a.arrangement === 'merged' ? [main[0], main[1]] as const : null;
    // The flare's two ribbons run either side of the line where the field flips, between leader and follower.
    const axis = new THREE.Vector2(follower.x - leader.x, follower.z - leader.z);
    const span = Math.max(axis.length(), 0.6);
    axis.normalize();
    const middle = new THREE.Vector2((leader.x + follower.x) / 2, (leader.z + follower.z) / 2);
    const ribbonOffset = Math.max(0.18, span * 0.14);
    const ribbonDistance = (x: number, z: number, side: number) => {
      const along = (x - middle.x) * -axis.y + (z - middle.y) * axis.x;
      const across = (x - middle.x) * axis.x + (z - middle.y) * axis.y;
      const bend = Math.sin(along * 1.6) * 0.12 + side * ribbonOffset;
      return { gap: Math.abs(across - bend), along };
    };

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    const g = canvas.getContext('2d')!;
    const image = g.createImageData(N, N);
    const data = image.data;
    for (let py = 0; py < N; py++) {
      const z = (py / N - 0.5) * 2 * R;
      for (let px = 0; px < N; px++) {
        const x = (px / N - 0.5) * 2 * R;
        const index = (py * N + px) * 4;
        const r = Math.hypot(x, z);
        if (r > lookup(edgeAt, Math.atan2(z, x))) { data[index + 3] = 0; continue; }
        data[index + 3] = 255;
        // The nearest spot, measured against its own ragged outline.
        let best: Spot | null = null, q = 1e9, d = 0, angle = 0;
        for (const spot of spots) {
          const dx = x - spot.x, dz = z - spot.z;
          const dist = Math.hypot(dx, dz);
          if (dist > spot.rp * 2.6) continue;
          const theta = Math.atan2(dz, dx);
          const ratio = dist / lookup(spot.edge, theta);
          if (ratio < q) { q = ratio; best = spot; d = dist; angle = theta; }
        }
        let gx = px, gy = py;
        if (bulge) {
          // Stretched granules over the swelling where new flux is rising.
          const pull = Math.exp(-((x - bulge.x) ** 2 + (z - bulge.z) ** 2) / 0.5);
          gx = px + (px - (bulge.x / (2 * R) + 0.5) * N) * pull * -0.45;
        }
        const grain = granule(gx, gy);
        let colour = blend(laneRgb, cellRgb, grain);
        if (best && q < 1.04) {
          const innerEdge = lookup(best.inner, angle);
          const turned = angle + swirl * (d / best.rp) ** 1.3;
          const streak = 0.5 + 0.5 * Math.sin(turned * 64 + noise(Math.cos(turned) * 9, Math.sin(turned) * 9, d * 3 + best.id) * 5);
          const head = smooth(0.35, 1, noise(Math.cos(turned) * 30, Math.sin(turned) * 30, d * 9));
          if (d < innerEdge) {
            const depth = (d / innerEdge) ** 2;
            colour = blend(coreRgb, umbraRgb, depth);
            if (noise(x * 40, z * 40, 2) > 0.55) colour = blend(colour, penLight, 0.45);
          } else {
            const across = (d - innerEdge) / Math.max(0.01, lookup(best.edge, angle) - innerEdge);
            colour = blend(penDark, penLight, Math.min(1, streak ** 1.5 * (0.6 + 0.6 * across) + head * 0.25));
            if (across < 0.12) colour = blend(colour, umbraRgb, 0.5 * (1 - across / 0.12));
            if (q > 0.94) colour = blend(colour, blend(laneRgb, cellRgb, grain), (q - 0.94) / 0.1);
          }
        } else if (best) {
          // Faculae: a bright broken network around each spot.
          const network = 1 - Math.abs(noise(x * 3.2, z * 3.2, 11));
          const near = 1 - smooth(1.05, 2.5, q);
          colour = blend(colour, faculaeRgb, near * (0.25 + 0.55 * smooth(0.82 - mood.density * 0.08, 0.95, network)));
        }
        if (bridge) {
          const [one, two] = bridge;
          const t = Math.max(0, Math.min(1, ((x - one.x) * (two.x - one.x) + (z - one.z) * (two.z - one.z)) / ((two.x - one.x) ** 2 + (two.z - one.z) ** 2)));
          const gap = Math.hypot(x - mix(one.x, two.x, t), z - mix(one.z, two.z, t));
          const width = 0.07 * k * (1 + 0.4 * noise(t * 6, 0, 4));
          if (gap < width && t > 0.15 && t < 0.85) colour = blend(penLight, cellRgb, grain * 0.8);
        }
        if (a.doing === 'flaring') {
          for (const side of [-1, 1]) {
            const { gap, along } = ribbonDistance(x, z, side);
            if (Math.abs(along) < span * 0.55) colour = blend(colour, flareRgb, (1 - smooth(0.02, 0.09, gap)) * 0.95);
          }
        }
        // Darken toward the cut edge, like a limb, so the patch reads against a pale ground.
        colour = blend(colour, laneRgb, smooth(0.72, 1, r / lookup(edgeAt, Math.atan2(z, x))) * 0.55);
        data[index] = colour[0];
        data[index + 1] = colour[1];
        data[index + 2] = colour[2];
      }
    }
    g.putImageData(image, 0, 0);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;

    // A polar mesh whose planar uv matches the painted square.
    const geometry = new THREE.RingGeometry(0.005, R, 200, 70);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setY(i, heightAt(position.getX(i), position.getZ(i)));
    geometry.computeVertexNormals();
    const glow = mix(0.32, 0.55, mood.cheer);
    const surface = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow, roughness: 0.9, alphaTest: 0.5, side: THREE.DoubleSide });
    const patch = s.mesh(geometry, surface);
    patch.castShadow = false;

    // ---- What is happening above them. ----
    const materials: THREE.ShaderMaterial[] = [];
    const paint = (options: Parameters<typeof plasmaPaint>[0]) => {
      const material = plasmaPaint(options);
      materials.push(material);
      return material;
    };
    const energy = mood.energy;
    const on = (x: number, z: number, lift = 0) => vec(x, heightAt(x, z) + lift, z);
    let ribbonPaint: THREE.MeshBasicMaterial | null = null;
    if (a.doing === 'flaring') {
      ribbonPaint = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.flare) });
      const perp = new THREE.Vector2(-axis.y, axis.x);
      for (const side of [-1, 1]) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 16; i++) {
          const along = mix(-span * 0.5, span * 0.5, i / 16);
          const bend = Math.sin(along * 1.6) * 0.12 + side * ribbonOffset;
          const x = middle.x + perp.x * along + axis.x * bend, z = middle.y + perp.y * along + axis.y * bend;
          points.push(on(x, z, 0.015));
        }
        const ribbon = new THREE.Mesh(strand(points, { radius: () => 0.04, rings: 48, sides: 6, rough: (_t, angle) => (Math.abs(Math.sin(angle)) > 0.7 ? 0.35 : 1) }), ribbonPaint);
        s.root.add(ribbon);
      }
      // Post-flare loops: a little arcade stepping across from one ribbon to the other.
      const loops = 7;
      for (let i = 0; i < loops; i++) {
        const along = mix(-span * 0.38, span * 0.38, i / (loops - 1));
        const from = new THREE.Vector2(middle.x + perp.x * along - axis.x * ribbonOffset, middle.y + perp.y * along - axis.y * ribbonOffset);
        const to = new THREE.Vector2(middle.x + perp.x * along + axis.x * ribbonOffset, middle.y + perp.y * along + axis.y * ribbonOffset);
        const height = ribbonOffset * mix(1.6, 2.4, random()) * mix(0.8, 1.3, energy);
        const points: THREE.Vector3[] = [];
        for (let j = 0; j <= 12; j++) {
          const t = j / 12;
          const x = mix(from.x, to.x, t), z = mix(from.y, to.y, t);
          points.push(on(x, z, Math.sin(Math.PI * t) * height));
        }
        s.root.add(new THREE.Mesh(strand(points, { radius: () => 0.028, rings: 24, sides: 6 }), paint({ base: '#ffffff', crown: '#ff9a3a', arch: 1, gamma: 0.8, glow: 1.15, shimmer: mix(0.1, 0.35, energy), waves: 2, speed: mix(0.2, 1.2, energy), phase: random() * 6 })));
      }
    }
    if (a.doing === 'loops') {
      const count = 5 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const fan = (i / (count - 1) - 0.5) * 2;
        const startAngle = Math.atan2(follower.z - leader.z, follower.x - leader.x) + fan * 0.9;
        const endAngle = Math.atan2(leader.z - follower.z, leader.x - follower.x) - fan * 0.9;
        const from = on(leader.x + Math.cos(startAngle) * leader.rp * 0.75, leader.z + Math.sin(startAngle) * leader.rp * 0.75);
        const to = on(follower.x + Math.cos(endAngle) * follower.rp * 0.75, follower.z + Math.sin(endAngle) * follower.rp * 0.75);
        const length = from.distanceTo(to);
        const points: THREE.Vector3[] = [];
        for (let j = 0; j <= 16; j++) {
          const t = j / 16;
          const point = from.clone().lerp(to, t);
          point.y += Math.sin(Math.PI * t) * length * mix(0.32, 0.5, 1 - Math.abs(fan));
          point.z += Math.sin(Math.PI * t) * fan * length * 0.18;
          points.push(point);
        }
        s.root.add(new THREE.Mesh(strand(points, { radius: () => 0.035 * Math.max(1, k), rings: 32, sides: 6 }), paint({ base: '#fff6e0', crown: a.star === 'red' ? '#ff4a20' : '#ff8a2a', arch: 1, gamma: 0.7, opacity: 0.6, depthWrite: false, fade: [0.04, 0.04], shimmer: mix(0.1, 0.35, energy), waves: 2, speed: mix(0.1, 0.8, energy), phase: random() * 6 })));
      }
    }

    // ---- A tiny Earth for scale. ----
    let earth: THREE.Mesh | null = null;
    if (a.earth) {
      const size = 256;
      const earthCanvas = document.createElement('canvas');
      earthCanvas.width = size;
      earthCanvas.height = size / 2;
      const e = earthCanvas.getContext('2d')!;
      e.fillStyle = '#2c64b4';
      e.fillRect(0, 0, size, size / 2);
      for (let i = 0; i < 14; i++) {
        e.fillStyle = random() < 0.6 ? '#4c8a3a' : '#bfa36a';
        e.beginPath();
        e.ellipse(random() * size, size * mix(0.12, 0.38, random()), mix(8, 26, random()), mix(5, 16, random()), random() * 3, 0, Math.PI * 2);
        e.fill();
      }
      e.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 26; i++) {
        e.beginPath();
        e.ellipse(random() * size, size * mix(0.04, 0.46, random()), mix(6, 20, random()), mix(1.5, 4, random()), jitter(0.6), 0, Math.PI * 2);
        e.fill();
      }
      e.fillRect(0, 0, size, 6);
      e.fillRect(0, size / 2 - 6, size, 6);
      const earthMap = new THREE.CanvasTexture(earthCanvas);
      earthMap.colorSpace = THREE.SRGBColorSpace;
      const radius = Math.max(0.09, leader.ru * 0.3);
      const angle = Math.PI / 2 + jitter(0.8);
      const x = leader.x + Math.cos(angle) * leader.rp * 1.35, z = leader.z + Math.sin(angle) * leader.rp * 1.35;
      earth = s.ball([radius, radius, radius], [x, heightAt(x, z) + radius, z], new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.6, emissive: '#1a3a70', emissiveIntensity: 0.25 }), 28);
      earth.rotation.z = 0.41;
    }

    const flicker = mix(0.01, 0.07, energy);
    return s.finish({
      footprint: R * 0.92,
      update: (dt, time) => {
        for (const material of materials) material.uniforms.time.value = time;
        surface.emissiveIntensity = glow * (1 + Math.sin(time * mix(0.5, 3, energy)) * flicker);
        if (ribbonPaint) ribbonPaint.color.set(palette.flare).multiplyScalar(0.92 + 0.08 * Math.sin(time * mix(1, 6, energy)));
        if (earth) earth.rotation.y += dt * 0.15;
      },
    });
  },
});
