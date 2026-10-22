// Four screenshot-informed rendering studies. These transform the shared capture;
// no copied game geometry, scene changes, time-dependent state, or source mutation.
import { sameDrawSurface } from "./clean-studies.js";

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const threshold = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
export const OBRA_PALETTE = Object.freeze(
  [
    [42, 44, 24],
    [225, 250, 231],
  ].map(Object.freeze),
);
export const HYLICS_PALETTE = Object.freeze(
  [
    [16, 15, 25],
    [90, 69, 80],
    [182, 114, 57],
    [255, 178, 84],
    [255, 235, 187],
    [57, 91, 131],
    [120, 183, 218],
    [174, 57, 48],
    [246, 99, 65],
    [240, 163, 157],
  ].map(Object.freeze),
);

function noise(x, y, seed) {
  let n =
    Math.imul((x | 0) + seed * 31, 374761393) ^
    Math.imul((y | 0) + 919, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function blotch(x, y, scale, seed) {
  const xx = x / scale,
    yy = y / scale,
    ix = Math.floor(xx),
    iy = Math.floor(yy);
  const u = xx - ix,
    v = yy - iy,
    sx = u * u * (3 - 2 * u),
    sy = v * v * (3 - 2 * v);
  return mix(
    mix(noise(ix, iy, seed), noise(ix + 1, iy, seed), sx),
    mix(noise(ix, iy + 1, seed), noise(ix + 1, iy + 1, seed), sx),
    sy,
  );
}

// One bounded, intensity-independent preparation is shared by all four studies.
// Creases are geometry/normal based, never luminance edges from a material texture.
export function paintedFields(f) {
  return f.prepare("game-painted-fields-v1", () => {
    const w = f.w,
      n = w * w,
      ids = new Uint16Array(n),
      light = new Float32Array(n),
      tone = new Float32Array(n),
      base = new Uint8ClampedArray(n * 3),
      nx = new Float32Array(n),
      ny = new Float32Array(n),
      nz = new Float32Array(n),
      z = new Float32Array(n),
      edge = new Uint8Array(n),
      grain = new Float32Array(n),
      pool = new Float32Array(n),
      hist = new Uint32Array(256);
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          j = i * 4,
          k = i * 3;
        ids[i] = f.ID(x, y);
        tone[i] =
          (f.color[j] * 0.2126 +
            f.color[j + 1] * 0.7152 +
            f.color[j + 2] * 0.0722) /
          255;
        let a = f.normal[j] / 127.5 - 1,
          b = f.normal[j + 1] / 127.5 - 1,
          c = f.normal[j + 2] / 127.5 - 1;
        const len = Math.hypot(a, b, c) || 1;
        a /= len;
        b /= len;
        c /= len;
        nx[i] = a;
        ny[i] = b;
        nz[i] = c;
        z[i] = f.distance(x, y);
        const material = f.B(x, y);
        base[k] = material[0];
        base[k + 1] = material[1];
        base[k + 2] = material[2];
        light[i] = f.diffuse
          ? (f.diffuse[j] * 0.2126 +
              f.diffuse[j + 1] * 0.7152 +
              f.diffuse[j + 2] * 0.0722) /
            255
          : clamp(0.27 + 0.63 * Math.max(0, a * -0.45 + b * -0.55 + c * 0.704));
        if (ids[i] > 1) hist[Math.round(light[i] * 255)]++;
        grain[i] = noise(x, y, f.seed);
        pool[i] = blotch(x, y, Math.max(8, w / 28), f.seed);
      }
    const count = hist.reduce((a, b) => a + b, 0);
    let sum = 0,
      white = 1;
    for (let i = 0; i < 256; i++) {
      sum += hist[i];
      if (sum >= count * 0.98) {
        white = Math.max(0.1, i / 255);
        break;
      }
    }
    for (let i = 0; i < n; i++)
      light[i] = clamp((light[i] / white - 0.2) / 0.8);
    for (let y = 1; y < w - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        for (const j of [i + 1, i + w]) {
          if (ids[i] <= 1 && ids[j] <= 1) continue;
          const different = ids[i] !== ids[j],
            dot = nx[i] * nx[j] + ny[i] * ny[j] + nz[i] * nz[j];
          if (
            different &&
            !sameDrawSurface(
              f,
              x,
              y,
              j === i + 1 ? x + 1 : x,
              j === i + 1 ? y : y + 1,
            )
          )
            edge[i] |= 1;
          else if (!different && dot < 0.94) edge[i] |= 2;
        }
      }
    // Projected sharp mesh creases restore lines that are less than one pixel wide.
    for (let e = 0; e < f.edges.length; e++) {
      const [a, b] = f.edges[e],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > w * 4 || length < 0.1) continue;
      const steps = Math.ceil(length),
        dx = -(b[1] - a[1]) / length,
        dy = (b[0] - a[0]) / length;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps,
          x = Math.round(mix(a[0], b[0], t)),
          y = Math.round(mix(a[1], b[1], t));
        if (x < 1 || y < 1 || x >= w - 1 || y >= w - 1) continue;
        const i = y * w + x,
          owner = f.edgeOwners?.[e];
        if (
          ids[i] <= 1 ||
          (owner && ids[i] !== owner) ||
          mix(a[2], b[2], t) > z[i] + 0.009
        )
          continue;
        if (
          !sameDrawSurface(
            f,
            x + dx * 1.2,
            y + dy * 1.2,
            x - dx * 1.2,
            y - dy * 1.2,
          )
        )
          edge[i] |= 2;
      }
    }
    const distance = new Uint8Array(n).fill(12);
    for (let i = 0; i < n; i++) if (edge[i]) distance[i] = 0;
    for (let y = 1; y < w; y++)
      for (let x = 1; x < w; x++) {
        const i = y * w + x;
        distance[i] = Math.min(
          distance[i],
          distance[i - 1] + 1,
          distance[i - w] + 1,
        );
      }
    for (let y = w - 2; y >= 0; y--)
      for (let x = w - 2; x >= 0; x--) {
        const i = y * w + x;
        distance[i] = Math.min(
          distance[i],
          distance[i + 1] + 1,
          distance[i + w] + 1,
        );
      }
    return {
      w,
      ids,
      light,
      tone,
      base,
      nx,
      ny,
      nz,
      z,
      edge,
      distance,
      grain,
      pool,
    };
  });
}
function setPixel(data, i, color) {
  const k = i * 4;
  data[k] = color[0];
  data[k + 1] = color[1];
  data[k + 2] = color[2];
  data[k + 3] = 255;
}
function block(data, w, x, y, size, color) {
  for (let yy = y; yy < Math.min(y + size, w); yy++)
    for (let xx = x; xx < Math.min(x + size, w); xx++)
      setPixel(data, yy * w + xx, color);
}
export function obraBit(tone, x, y, strength, edge = false, grain = 0.5) {
  const cutoff = 0.43 + 0.17 * strength;
  if (edge) return tone < cutoff ? 1 : 0;
  const middle = clamp(1 - Math.abs(tone - cutoff) / 0.32);
  const dither =
    (threshold(x, y) * 0.72 + grain * 0.28 - 0.5) *
    (0.19 + strength * 0.44) *
    middle;
  return tone + dither >= cutoff ? 1 : 0;
}
export function drawObraDinn(p, f) {
  const d = paintedFields(f),
    w = f.w,
    s = clamp(f.intensity),
    step = w >= 560 ? 2 : 1;
  p.loadPixels();
  const pixels = p.pixels;
  for (let y = 0; y < w; y += step)
    for (let x = 0; x < w; x += step) {
      const i = y * w + x;
      const foreground = d.ids[i] > 1;
      let edge = d.edge[i];
      if (step > 1) edge |= d.edge[i + 1] || d.edge[Math.min(w * w - 1, i + w)];
      const tone = foreground
        ? clamp(0.7 * d.light[i] + 0.42 * d.tone[i] - 0.13)
        : 0;
      block(
        pixels,
        w,
        x,
        y,
        step,
        OBRA_PALETTE[obraBit(tone, x / step, y / step, s, edge, d.grain[i])],
      );
    }
  p.updatePixels();
}

export function discoDirection(d, x, y) {
  const w = d.w,
    xx = Math.round(clamp(x, 1, w - 2)),
    yy = Math.round(clamp(y, 1, w - 2)),
    i = yy * w + xx;
  const gx = d.tone[i + 1] - d.tone[i - 1],
    gy = d.tone[i + w] - d.tone[i - w];
  // Follow long plane tangents; image gradients contribute only inside one object.
  const same = d.ids[i + 1] === d.ids[i - 1] && d.ids[i + w] === d.ids[i - w];
  return Math.atan2(
    d.nx[i] * 0.65 + (same ? gx * 2.4 : 0) + 0.16,
    -d.ny[i] * 0.65 - (same ? gy * 2.4 : 0) + 0.78,
  );
}
function discoColor(d, i, channel) {
  const c = d.base[i * 3 + channel],
    light = d.light[i],
    tone = d.tone[i];
  const shadow = [48, 55, 66][channel],
    chalk = [225, 222, 205][channel];
  const pigment = mix(
    c,
    (d.base[i * 3] + d.base[i * 3 + 1] + d.base[i * 3 + 2]) / 3,
    0.24,
  );
  const value = mix(shadow, pigment, 0.3 + light * 0.63);
  return mix(value, chalk, clamp((tone - 0.58) * 0.5));
}
export function drawDisco(p, f) {
  const d = paintedFields(f),
    w = f.w,
    s = clamp(f.intensity);
  p.loadPixels();
  const pixels = p.pixels;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        foreground = d.ids[i] > 1;
      for (let c = 0; c < 3; c++) {
        let value = foreground
          ? discoColor(d, i, c)
          : [137, 147, 146][c] + (d.tone[i] - 0.82) * 86;
        // Low-contrast boundaries dissolve into the adjacent pigment instead of ink.
        if (d.distance[i] < 3 && foreground) {
          const j = Math.max(0, i - Math.round((d.pool[i] - 0.5) * 4));
          if (Math.abs(d.tone[j] - d.tone[i]) < 0.13)
            value = mix(value, discoColor(d, j, c), s * 0.28);
        }
        pixels[k + c] =
          value + (d.pool[i] - 0.5) * (7 + s * 9) + (d.grain[i] - 0.5) * 7;
      }
      pixels[k + 3] = 255;
    }
  p.updatePixels();
  const scale = w / 720;
  for (let pass = 0; pass < 2; pass++) {
    const spacing = Math.max(3, (pass ? 7.2 : 15.5) * scale),
      lengthScale = (pass ? 10 : 20) * scale * (0.7 + s);
    for (let y = spacing; y < w - spacing; y += spacing)
      for (let x = spacing; x < w - spacing; x += spacing) {
        const px = x + (f.rnd(x, y, 101) - 0.5) * spacing,
          py = y + (f.rnd(x, y, 102) - 0.5) * spacing;
        const xx = Math.round(px),
          yy = Math.round(py),
          i = yy * w + xx;
        if (d.ids[i] <= 1 && f.rnd(x, y, 109) > 0.24) continue;
        if (pass && f.rnd(x, y, 107) < 0.14 + s * 0.2) continue;
        const angle =
          discoDirection(d, px, py) + (f.rnd(x, y, 103) - 0.5) * 0.34;
        const ux = Math.cos(angle),
          uy = Math.sin(angle),
          vx = -uy,
          vy = ux;
        const length = lengthScale * (0.5 + f.rnd(x, y, 104)),
          width = spacing * (pass ? 0.25 : 0.36);
        const chalk = pass && d.light[i] > 0.48 && f.rnd(x, y, 105) > 0.52;
        const color = [0, 1, 2].map(
          (c) =>
            (d.ids[i] > 1 ? discoColor(d, i, c) : [137, 147, 146][c]) +
            (chalk ? 23 + 13 * s : (f.rnd(x, y, 106) - 0.5) * 24),
        );
        p.noStroke();
        p.fill(...color, pass ? 68 + s * 46 : 80);
        p.beginShape();
        // Uneven dry dabs: nonparallel shoulders and a tapered, split-looking toe.
        for (const [u, v] of [
          [-0.54, -0.6],
          [-0.35, -1],
          [0.33, -0.68],
          [0.56, -0.16],
          [0.47, 0.56],
          [0.17, 0.87],
          [-0.38, 0.7],
        ])
          p.vertex(
            px + ux * length * u + vx * width * v,
            py + uy * length * u + vy * width * v,
          );
        p.endShape(p.CLOSE);
        if (pass) {
          p.stroke(...color, chalk ? 114 : 64);
          p.strokeWeight(Math.max(0.45, scale * (0.55 + s * 0.4)));
          for (let rib = -1; rib <= 1; rib++) {
            if (f.rnd(x + rib, y, 111) < 0.25) continue;
            const offset = rib * width * 0.53,
              start = -0.42 + f.rnd(x + rib, y, 112) * 0.3,
              end = 0.24 + f.rnd(x + rib, y, 113) * 0.25;
            p.line(
              px + ux * length * start + vx * offset,
              py + uy * length * start + vy * offset,
              px + ux * length * end + vx * offset,
              py + uy * length * end + vy * offset,
            );
          }
        }
      }
  }
}

export function okamiPressure(x, y, orientation, strength, seed = 0) {
  const wave = 0.5 + 0.5 * Math.sin(x * 0.039 + y * 0.025 + seed * 0.07);
  const taper = 0.18 + 0.82 * wave * wave;
  return (
    (0.45 + (1.1 + 2.0 * strength) * taper) *
    (0.65 + 0.35 * Math.abs(orientation))
  );
}
export function drawOkami(p, f) {
  const d = paintedFields(f),
    w = f.w,
    s = clamp(f.intensity),
    mask = new Uint8Array(w * w),
    scale = Math.max(0.65, w / 720);
  for (let y = 1; y < w - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!d.edge[i]) continue;
      const crease = !(d.edge[i] & 1),
        pressure =
          okamiPressure(x / scale, y / scale, d.nx[i] - d.ny[i], s, f.seed) *
          scale *
          (crease ? 0.65 : 1);
      const radius = Math.ceil(pressure);
      for (let yy = -radius; yy <= radius; yy++)
        for (let xx = -radius; xx <= radius; xx++) {
          const px = x + xx,
            py = y + yy;
          if (px < 0 || py < 0 || px >= w || py >= w) continue;
          const distance = Math.hypot(xx, yy * 1.15),
            cover = clamp(pressure + 0.4 - distance);
          const j = py * w + px;
          mask[j] = Math.max(mask[j], Math.round(cover * (crease ? 212 : 242)));
        }
    }
  p.loadPixels();
  const pixels = p.pixels;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        material = i * 3,
        foreground = d.ids[i] > 1;
      const pooling = foreground
        ? Math.exp(-d.distance[i] / (1.5 + 3 * s)) * (0.09 + 0.11 * s)
        : 0;
      const alpha = foreground
        ? clamp(
            0.54 + s * 0.15 + (d.pool[i] - 0.5) * (0.18 + s * 0.2) + pooling,
          )
        : 0.08;
      const tooth = (d.grain[i] - 0.5) * (3 + 11 * s) + (d.pool[i] - 0.5) * 8;
      for (let c = 0; c < 3; c++) {
        const paper = [239, 233, 205][c];
        const pigment = foreground
          ? d.base[material + c] * (0.47 + 0.56 * d.light[i]) + [0, 8, 8][c]
          : [135, 180, 158][c];
        const wash = mix(paper, pigment, alpha) + tooth - pooling * 36;
        pixels[k + c] = mix(
          wash,
          [24, 35, 31][c] + d.grain[i] * 8,
          mask[i] / 255,
        );
      }
      pixels[k + 3] = 255;
    }
  p.updatePixels();
}

export function clayRelief(u, v, strength, seed = 0) {
  const bend = Math.sin(u * 3.1 + seed * 0.03) * 0.8 + Math.sin(v * 4.3) * 0.35;
  const phase = v * 32 + u * 7.2 + bend * 4.0;
  const ridge = Math.sin(phase),
    secondary = Math.sin(u * 13 - v * 11 + seed * 0.013);
  return [
    Math.cos(phase) * (0.1 + 0.28 * strength) + secondary * strength * 0.14,
    Math.cos(phase + 0.73) * (0.13 + 0.36 * strength),
    clamp((-ridge - 0.36) * (0.2 + 0.42 * strength)),
  ];
}
export function clayWorldRelief(position, strength, seed = 0) {
  // A fixed oblique world projection keeps ridge phase and cavities unchanged
  // when the camera or the view-space normal changes.
  return clayRelief(
    position[0] + position[2] * 0.37,
    position[1] + position[2] * 0.23,
    strength,
    seed,
  );
}
function hylicsFamily(r, g, b) {
  if (b > r * 0.95 || g > r * 1.025) return [0, 5, 6, 4];
  if (r > g * 1.35 && r > b * 1.28) return [0, 7, 8, 9];
  return [0, 2, 3, 4];
}
export function drawHylics(p, f) {
  const d = paintedFields(f),
    w = f.w,
    s = clamp(f.intensity),
    step = w >= 560 ? 2 : 1;
  const light = f.reliefLight || [-0.45, -0.55, 0.704],
    lightLength = Math.hypot(...light) || 1;
  p.loadPixels();
  const pixels = p.pixels;
  for (let y = 0; y < w; y += step)
    for (let x = 0; x < w; x += step) {
      const i = y * w + x,
        k = i * 3,
        cut = threshold(x / step, y / step),
        foreground = d.ids[i] > 1;
      let index;
      if (!foreground) {
        const shade = clamp((d.tone[i] - 0.65) * 2.8);
        index = cut < shade ? 4 : 6;
      } else {
        const position = f.worldPosition(x, y),
          nx = d.nx[i],
          ny = d.ny[i],
          nz = d.nz[i];
        const relief = clayWorldRelief(position, s, f.seed);
        let ax = nx + relief[0] * (0.45 + Math.abs(nz)),
          ay = ny + relief[1] * (0.45 + Math.abs(nz)),
          az = nz - relief[0] * nx - relief[1] * ny;
        const length = Math.hypot(ax, ay, az) || 1;
        // MeshNormalMaterial is view-Y-up; captured reliefLight is image-Y-down.
        const molded = Math.max(
          0,
          (ax * light[0] - ay * light[1] + az * light[2]) /
            (length * lightLength),
        );
        const illumination = clamp(
          0.14 +
            molded * 0.63 +
            d.light[i] * 0.19 +
            d.tone[i] * 0.08 -
            relief[2] * (0.32 + s * 0.32),
        );
        const family = hylicsFamily(d.base[k], d.base[k + 1], d.base[k + 2]);
        const level = clamp(illumination * 3.1, 0, 2.999),
          band = Math.floor(level),
          fraction = level - band;
        index = family[Math.min(3, band + (cut < fraction ? 1 : 0))];
        const cavity =
          relief[2] * (0.32 + s * 0.33) + (d.edge[i] ? 0.32 + s * 0.25 : 0);
        const silhouette =
          d.edge[i] |
          (step > 1
            ? d.edge[i + 1] |
              d.edge[Math.min(w * w - 1, i + w)] |
              d.edge[Math.min(w * w - 1, i + w + 1)]
            : 0);
        if (silhouette & 1 || cut < cavity * (1.1 - molded * 0.58)) index = 0;
      }
      block(pixels, w, x, y, step, HYLICS_PALETTE[index]);
    }
  p.updatePixels();
}
