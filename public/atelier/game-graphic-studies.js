import { cleanFields } from "./clean-studies.js";
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, c) => v * (1 - t) + b[c] * t);
export function graphicPlan(f) {
  const w = f.w,
    field = f.prepare("clean-fields", () => cleanFields(f)),
    world = new Float32Array(w * w * 3),
    bounds = new Map();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = field.ids[i];
      if (id <= 1) continue;
      world.set(f.worldPosition(x, y), i * 3);
      const b = bounds.get(id) || [w, w, 0, 0];
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x);
      b[3] = Math.max(b[3], y);
      bounds.set(id, b);
    }
  return { w, field, world, bounds };
}
const planFor = (f) => f.prepare("game-graphic-plan", () => graphicPlan(f));
export function blurGameMask(input, w, r, passes = 2) {
  r = Math.max(1, Math.round(r));
  let a = Float32Array.from(input),
    b = new Float32Array(a.length),
    c = new Float32Array(a.length),
    den = r * 2 + 1;
  for (let k = 0; k < passes; k++) {
    for (let y = 0; y < w; y++) {
      let sum = 0;
      for (let j = -r; j <= r; j++) sum += a[y * w + clamp(j, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = sum / den;
        sum +=
          a[y * w + clamp(x + r + 1, 0, w - 1)] -
          a[y * w + clamp(x - r, 0, w - 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let j = -r; j <= r; j++) sum += b[clamp(j, 0, w - 1) * w + x];
      for (let y = 0; y < w; y++) {
        c[y * w + x] = sum / den;
        sum +=
          b[clamp(y + r + 1, 0, w - 1) * w + x] -
          b[clamp(y - r, 0, w - 1) * w + x];
      }
    }
    [a, c] = [c, a];
  }
  return a;
}
function gridInk(plan, x, y, density, width) {
  const { w, world, field } = plan,
    i = y * w + x,
    id = field.ids[i];
  let line = 0;
  for (let a = 0; a < 3; a++) {
    const value = world[i * 3 + a] * density,
      fx =
        x < w - 1 && field.ids[i + 1] === id
          ? Math.abs(world[(i + 1) * 3 + a] - world[i * 3 + a])
          : x && field.ids[i - 1] === id
            ? Math.abs(world[(i - 1) * 3 + a] - world[i * 3 + a])
            : 0,
      fy =
        y < w - 1 && field.ids[i + w] === id
          ? Math.abs(world[(i + w) * 3 + a] - world[i * 3 + a])
          : y && field.ids[i - w] === id
            ? Math.abs(world[(i - w) * 3 + a] - world[i * 3 + a])
            : 0,
      derivative = Math.hypot(fx, fy) * density;
    if (derivative < 1e-6) continue;
    const distance = Math.abs(value - Math.round(value)) / derivative;
    line = Math.max(line, clamp(width + 0.55 - distance));
  }
  return line;
}
function finish(p, pixels) {
  p.loadPixels();
  p.pixels.set(pixels);
  p.updatePixels();
}
function contours(p, field, color, width, dx = 0, dy = 0) {
  p.noFill();
  p.stroke(...color);
  p.strokeWeight(width);
  for (let i = 0; i < field.contours.length; i += 5)
    p.line(
      field.contours[i] + dx,
      field.contours[i + 1] + dy,
      field.contours[i + 2] + dx,
      field.contours[i + 3] + dy,
    );
}
function glow(pixels, mask, w, color, radius, amount, preserveCore = false) {
  const soft = blurGameMask(mask, w, radius);
  for (let i = 0; i < soft.length; i++) {
    if (preserveCore && mask[i] > 0.5) continue;
    const a = clamp(soft[i] * amount);
    for (let c = 0; c < 3; c++)
      pixels[i * 4 + c] =
        255 - (255 - pixels[i * 4 + c]) * (1 - (a * color[c]) / 255);
  }
}
export function drawSable(p, f) {
  const plan = planFor(f),
    { w, field } = plan,
    pixels = new Uint8ClampedArray(w * w * 4),
    emit = new Float32Array(w * w),
    density = 2.5 + f.intensity * 5.5;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = field.ids[i],
        q = field.light[i];
      let color = [166, 167, 185];
      if (id > 1) {
        const base = f.B(x, y),
          quiet = [
            105 + base[0] * 0.24,
            88 + base[1] * 0.22,
            121 + base[2] * 0.18,
          ],
          tone = q > 0.49 ? 1 : 0.76;
        color = quiet.map((v) => v * tone);
        const grid =
          gridInk(plan, x, y, density, 0.16) * 0.5 +
          gridInk(plan, x, y, density / 3, 0.3) * 0.3;
        const wp = plan.world.subarray(i * 3, i * 3 + 3),
          panel = Math.abs(Math.sin(wp[0] * 6 + Math.sin(wp[1] * 5) * 0.7));
        if (panel < 0.035) color = color.map((v) => v * 0.8);
        color = color.map((v) => v * (1 - clamp(grid) * 0.45));
        const glowRegion = (id === 8 || id === 10) && grid > 0.22 && q > 0.22;
        if (glowRegion) {
          emit[i] = 1;
          color = [245, 56, 132];
        }
      } else color = color.map((v) => v * (0.92 + 0.08 * q));
      pixels.set([...color, 255], i * 4);
    }
  glow(pixels, emit, w, [255, 64, 142], Math.max(1, w * 0.009), 3.6);
  finish(p, pixels);
  contours(p, field, [40, 34, 49], Math.max(0.35, (w / 720) * 0.65));
  p.strokeWeight(Math.max(0.3, (w / 720) * 0.45));
  for (let i = 0; i < field.creases.length; i += 4)
    p.line(...field.creases.subarray(i, i + 4));
}
export function drawPersona(p, f) {
  const plan = planFor(f),
    { w, field } = plan,
    pixels = new Uint8ClampedArray(w * w * 4),
    red = new Set([4, 8, 13, 17]),
    scale = w / 720;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = field.ids[i],
        q = field.light[i];
      let color = [239, 232, 212];
      if (id > 1) {
        const b = plan.bounds.get(id),
          u = (x - b[0]) / Math.max(1, b[2] - b[0]),
          v = (y - b[1]) / Math.max(1, b[3] - b[1]),
          cut = v > 0.25 + 0.58 * u + (f.rnd(id, 8, 73) - 0.5) * 0.16,
          shadow = q < 0.27 || (cut && q < 0.78);
        color = shadow
          ? [25, 23, 29]
          : red.has(id)
            ? [210, 27, 46]
            : mix([238, 233, 218], f.B(x, y), 0.16);
        if (!shadow && red.has(id) && u + v > 1.43) color = [249, 244, 226];
      } else if (y > w * 0.77 && x - y * 0.4 > w * 0.39) color = [37, 31, 38];
      pixels.set([...color, 255], i * 4);
    }
  finish(p, pixels);
  const pressure = 0.6 + f.intensity * 0.8;
  contours(
    p,
    field,
    [20, 18, 23],
    Math.max(0.8, 9 * scale * pressure),
    4 * scale,
    -3 * scale,
  );
  contours(
    p,
    field,
    [252, 247, 230],
    Math.max(0.55, 5.5 * scale * pressure),
    -1.5 * scale,
    -1.5 * scale,
  );
  contours(p, field, [23, 20, 27], Math.max(0.4, 1.35 * scale));
}
export function drawWindWaker(p, f) {
  const plan = planFor(f),
    { w, field } = plan,
    pixels = new Uint8ClampedArray(w * w * 4),
    emit = new Float32Array(w * w),
    size = 0.1 + f.intensity * 0.22;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = field.ids[i],
        q = field.light[i];
      let color = q > 0.43 ? [45, 72, 105] : [23, 40, 81];
      if (id > 1) {
        const base = f.B(x, y),
          lit = q > 0.49,
          body = mix(base, [67, 114, 129], 0.5);
        color = lit
          ? body.map((v) => v * 0.93)
          : mix(
              body.map((v) => v * 0.37),
              [20, 35, 78],
              0.48,
            );
        const nx = f.N(x, y, 0) * 2 - 1,
          nz = f.N(x, y, 2) * 2 - 1,
          edge =
            x === 0 ||
            y === 0 ||
            x === w - 1 ||
            y === w - 1 ||
            field.ids[i - 1] !== id ||
            field.ids[i + 1] !== id ||
            field.ids[i - w] !== id ||
            field.ids[i + w] !== id;
        if (edge && nx < -0.12 && nz < 0.65) color = [134, 210, 214];
        const wp = plan.world.subarray(i * 3, i * 3 + 3),
          u = wp[0] * 0.95 + 0.21,
          v = wp[1] * 0.95 - 0.08,
          du = Math.abs(u - Math.round(u)),
          dv = Math.abs(v - Math.round(v));
        if ([3, 8, 10].includes(id) && du + dv < size && q > 0.16) {
          emit[i] = 1;
          const facet = u - Math.round(u) + (v - Math.round(v)) > 0;
          color = facet ? [255, 239, 64] : [221, 224, 76];
        }
      }
      pixels.set([...color, 255], i * 4);
    }
  glow(pixels, emit, w, [250, 231, 100], Math.max(1, w * 0.01), 2.5, true);
  finish(p, pixels);
}
