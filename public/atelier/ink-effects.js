import { cleanFields } from "./clean-studies.js";
export const inkKeys = [
  "spatter",
  "bloom",
  "scrape",
  "nervous",
  "bristles",
  "accent",
  "warp",
];
export const inkStyleIds = [
  "expressive-ink",
  "ink-bloom",
  "ink-scrape",
  "ink-storm",
];
export const defaultInk = () => ({
  spatter: 0.7,
  bloom: 0.8,
  scrape: 0.65,
  nervous: 0.75,
  bristles: 0.6,
  accent: 0.9,
  warp: 0.2,
});
export function validateInk(value = defaultInk()) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Choose valid ink controls");
  const result = {};
  for (const key of inkKeys) {
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1)
      throw Error("Ink controls must be between 0 and 1");
    result[key] = value[key];
  }
  return result;
}
export const inkSignature = (value) =>
  inkKeys.map((key) => value[key]).join(":");
export const inkEffectsFor = (id) =>
  id === "expressive-ink"
    ? inkKeys
    : id === "ink-bloom"
      ? ["bloom"]
      : id === "ink-scrape"
        ? ["bloom", "scrape"]
        : id === "ink-storm"
          ? ["bloom", "spatter", "nervous", "bristles"]
          : [];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function powerLawRadius(u, min = 0.35, max = 18, exponent = 1.35) {
  return (
    (min ** -exponent + clamp(u) * (max ** -exponent - min ** -exponent)) **
    (-1 / exponent)
  );
}
function noise(f, x, y, k) {
  const a = Math.floor(x),
    b = Math.floor(y),
    u = x - a,
    v = y - b,
    s = u * u * (3 - 2 * u),
    t = v * v * (3 - 2 * v);
  return (
    (f.rnd(a, b, k) * (1 - s) + f.rnd(a + 1, b, k) * s) * (1 - t) +
    (f.rnd(a, b + 1, k) * (1 - s) + f.rnd(a + 1, b + 1, k) * s) * t
  );
}
function blur(input, n, r, passes = 1) {
  let current = Float32Array.from(input),
    temp = new Float32Array(input.length),
    out = new Float32Array(input.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let sum = 0;
        for (let d = -r; d <= r; d++)
          sum += current[y * n + clamp(x + d, 0, n - 1)];
        temp[y * n + x] = sum / (2 * r + 1);
      }
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let sum = 0;
        for (let d = -r; d <= r; d++)
          sum += temp[clamp(y + d, 0, n - 1) * n + x];
        out[y * n + x] = sum / (2 * r + 1);
      }
    [current, out] = [out, current];
  }
  return current;
}
function chainsFromContours(contours) {
  const vertices = new Map(),
    edges = [];
  const key = (x, y) => x + ":" + y;
  for (let i = 0; i < contours.length; i += 5) {
    const a = key(contours[i], contours[i + 1]),
      b = key(contours[i + 2], contours[i + 3]),
      index = edges.length;
    for (const [k, x, y] of [
      [a, contours[i], contours[i + 1]],
      [b, contours[i + 2], contours[i + 3]],
    ]) {
      if (!vertices.has(k)) vertices.set(k, { x, y, edges: [] });
      vertices.get(k).edges.push(index);
    }
    edges.push({ a, b, used: false });
  }
  const chains = [];
  const walk = (start, edgeIndex) => {
    let at = start,
      index = edgeIndex;
    const points = [];
    while (index !== undefined && !edges[index].used) {
      const node = vertices.get(at);
      points.push([node.x, node.y]);
      const edge = edges[index];
      edge.used = true;
      at = edge.a === at ? edge.b : edge.a;
      const next = vertices.get(at);
      if (next.edges.length !== 2) {
        points.push([next.x, next.y]);
        break;
      }
      index = next.edges.find((i) => !edges[i].used);
      if (index === undefined) points.push([next.x, next.y]);
    }
    if (points.length > 2) chains.push(points);
  };
  for (const [k, v] of vertices)
    if (v.edges.length !== 2)
      for (const e of v.edges) if (!edges[e].used) walk(k, e);
  for (let i = 0; i < edges.length; i++)
    if (!edges[i].used) walk(edges[i].a, i);
  return chains;
}
export function buildInkWarp(f) {
  if (f.w < 2)
    return {
      n: 2,
      step: 1,
      dx: new Float32Array(4),
      dy: new Float32Array(4),
      bound: 0,
    };
  const n = Math.min(65, f.w),
    step = (f.w - 1) / Math.max(1, n - 1),
    depth = new Float32Array(n * n),
    mask = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const px = x * step,
        py = y * step,
        i = y * n + x;
      if (f.ID(px, py) > 1) {
        mask[i] = 1;
        depth[i] = clamp(1 - f.Z(px, py));
      }
    }
  const mass = blur(depth, n, 3, 2),
    weight = blur(mask, n, 3, 2),
    dx = new Float32Array(n * n),
    dy = new Float32Array(n * n),
    radius = Math.max(1, f.w * 0.46);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x,
        u = (x * step - f.w * 0.5) / radius,
        v = (y * step - f.w * 0.53) / radius,
        falloff = Math.max(0, 1 - u * u - v * v) ** 2,
        driver =
          weight[i] > 0.0001
            ? (0.35 + (0.65 * mass[i]) / weight[i]) * weight[i]
            : 0;
      dx[i] = radius * falloff * driver * (-0.42 * u - 0.54 * v);
      dy[i] = radius * falloff * driver * (-0.42 * v + 0.54 * u);
    }
  let bound = 0;
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const i = y * n + x;
      for (const field of [dx, dy])
        bound = Math.max(
          bound,
          (Math.max(
            Math.abs(field[i + 1] - field[i]),
            Math.abs(field[i + n + 1] - field[i + n]),
          ) +
            Math.max(
              Math.abs(field[i + n] - field[i]),
              Math.abs(field[i + n + 1] - field[i + 1]),
            )) /
            Math.max(step, 1),
        );
    }
  const gain = Math.min(1, 0.55 / Math.max(bound, 1e-9));
  for (let i = 0; i < dx.length; i++) {
    dx[i] *= gain;
    dy[i] *= gain;
  }
  return { n, step, dx, dy, bound: bound * gain };
}
export function sampleWarp(field, x, y, strength, out = [0, 0]) {
  if (!strength) {
    out[0] = x;
    out[1] = y;
    return out;
  }
  const u = clamp(x / Math.max(field.step, 1), 0, field.n - 1),
    v = clamp(y / Math.max(field.step, 1), 0, field.n - 1),
    ix = Math.min(field.n - 2, Math.floor(u)),
    iy = Math.min(field.n - 2, Math.floor(v)),
    a = u - ix,
    b = v - iy,
    i = iy * field.n + ix;
  for (let k = 0; k < 2; k++) {
    const d = k ? field.dy : field.dx;
    out[k] =
      (k ? y : x) +
      strength *
        ((d[i] * (1 - a) + d[i + 1] * a) * (1 - b) +
          (d[i + field.n] * (1 - a) + d[i + field.n + 1] * a) * b);
  }
  return out;
}
export function makeInkPlan(f) {
  const w = f.w,
    scale = w / 720,
    field = f.prepare("clean-fields", () => cleanFields(f)),
    ids = field.ids,
    paper = new Uint8ClampedArray(w * w * 3),
    tooth = new Uint8Array(w * w),
    distance = new Float32Array(w * w).fill(w),
    bleach = new Float32Array(w * w),
    pool = new Float32Array(w * w),
    active = [];
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        inside = ids[i] > 1;
      if (inside) active.push(i);
      const grain = f.rnd(x, y, 501),
        weave =
          0.32 * Math.cos(x * Math.PI * 0.81) +
          0.25 * Math.cos(y * Math.PI * 0.67) +
          0.43 * grain;
      tooth[i] = clamp(weave * 0.5 + 0.4) * 255;
      for (let c = 0; c < 3; c++)
        paper[i * 3 + c] =
          [229, 224, 207][c] + (weave - 0.4) * 8 + (grain - 0.5) * 4;
      if (
        (x && inside !== ids[i - 1] > 1) ||
        (y && inside !== ids[i - w] > 1) ||
        (x < w - 1 && inside !== ids[i + 1] > 1) ||
        (y < w - 1 && inside !== ids[i + w] > 1)
      )
        distance[i] = 0;
    }
  for (let pass = 0; pass < 2; pass++) {
    const begin = pass ? w * w - 1 : 0,
      end = pass ? -1 : w * w,
      inc = pass ? -1 : 1;
    for (let i = begin; i !== end; i += inc) {
      const x = i % w,
        y = Math.floor(i / w),
        neighbors = pass
          ? [
              [x < w - 1 ? i + 1 : -1, 1],
              [y < w - 1 ? i + w : -1, 1],
              [x < w - 1 && y < w - 1 ? i + w + 1 : -1, Math.SQRT2],
              [x && y < w - 1 ? i + w - 1 : -1, Math.SQRT2],
            ]
          : [
              [x ? i - 1 : -1, 1],
              [y ? i - w : -1, 1],
              [x && y ? i - w - 1 : -1, Math.SQRT2],
              [x < w - 1 && y ? i - w + 1 : -1, Math.SQRT2],
            ];
      for (const [j, cost] of neighbors)
        if (j >= 0) distance[i] = Math.min(distance[i], distance[j] + cost);
    }
  }
  const outer = [];
  for (let i = 0; i < field.contours.length; i += 5) {
    const x = (field.contours[i] + field.contours[i + 2]) * 0.5 - 0.5,
      y = (field.contours[i + 1] + field.contours[i + 3]) * 0.5 - 0.5,
      tx = field.contours[i + 2] - field.contours[i],
      ty = field.contours[i + 3] - field.contours[i + 1],
      len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len,
      ny = tx / len;
    const left = f.ID(x + nx * 2, y + ny * 2) > 1,
      right = f.ID(x - nx * 2, y - ny * 2) > 1;
    if (left === right) continue;
    if (left) {
      nx = -nx;
      ny = -ny;
    }
    outer.push({ x, y, nx, ny });
  }
  for (let b = 0; b < 145 && active.length; b++) {
    const i =
        active[
          Math.min(
            active.length - 1,
            Math.floor(f.rnd(b, 9, 503) * active.length),
          )
        ],
      cx = i % w,
      cy = Math.floor(i / w),
      id = ids[i],
      radius = (9 + 63 * f.rnd(b, 2, 504) ** 1.7) * scale,
      phase = f.rnd(b, 3, 505) * Math.PI * 2,
      lobes = 3 + Math.floor(f.rnd(b, 4, 506) * 5),
      aspect = 0.55 + 0.7 * f.rnd(b, 6, 507),
      co = Math.cos(phase),
      si = Math.sin(phase),
      extent = radius * 1.7;
    for (
      let y = Math.max(0, Math.floor(cy - extent));
      y <= Math.min(w - 1, Math.ceil(cy + extent));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(cx - extent));
        x <= Math.min(w - 1, Math.ceil(cx + extent));
        x++
      ) {
        const at = y * w + x;
        if (ids[at] !== id) continue;
        const xx = ((x - cx) * co + (y - cy) * si) / aspect,
          yy = (-(x - cx) * si + (y - cy) * co) * aspect,
          angle = Math.atan2(yy, xx),
          irregular =
            0.83 +
            0.13 * Math.sin(angle * lobes + phase) +
            0.2 * (noise(f, x / (9 * scale), y / (9 * scale), 600 + b) - 0.5) +
            0.18 *
              (noise(f, x / (23 * scale), y / (23 * scale), 800 + b) - 0.5),
          r = Math.hypot(xx, yy) / (radius * irregular);
        if (r > 1.25) continue;
        const front = clamp(
            (noise(f, x / (13 * scale), y / (13 * scale), 1000 + b) - 0.3) *
              2.4,
          ),
          body =
            0.45 +
            0.55 * noise(f, x / (18 * scale), y / (18 * scale), 1200 + b);
        bleach[at] = Math.max(
          bleach[at],
          Math.sqrt(Math.max(0, 1 - r)) * (0.4 + 0.6 * f.rnd(b, 5, 507)) * body,
        );
        pool[at] = Math.max(
          pool[at],
          Math.exp(-(((r - 0.88) * 11) ** 2)) * front,
        );
      }
  }
  const droplets = [];
  for (let i = 0; i < 3600 && outer.length; i++) {
    const edge =
        outer[
          Math.min(
            outer.length - 1,
            Math.floor(f.rnd(i, 1, 510) * outer.length),
          )
        ],
      angle = (f.rnd(i, 2, 510) - 0.5) * 2.7,
      c = Math.cos(angle),
      s = Math.sin(angle),
      nx = edge.nx * c - edge.ny * s,
      ny = edge.nx * s + edge.ny * c,
      travel =
        (-Math.log(Math.max(1e-6, 1 - f.rnd(i, 3, 510))) *
          (10 + 22 * f.rnd(i, 4, 510)) +
          (i % 31 === 0 ? 50 + 95 * f.rnd(i, 5, 510) : 0)) *
        scale;
    droplets.push({
      x: edge.x + nx * travel,
      y: edge.y + ny * travel,
      r: powerLawRadius(
        f.rnd(i, 6, 510),
        Math.max(0.2, 0.35 * scale),
        Math.max(0.4, 18 * scale),
      ),
      nx,
      ny,
      streak: i % 83 === 0,
      length: (15 + 60 * f.rnd(i, 7, 510)) * scale,
    });
  }
  const scrapes = [];
  for (let k = 0; k < 620 && active.length; k++) {
    const i =
        active[
          Math.min(
            active.length - 1,
            Math.floor(f.rnd(k, 11, 515) * active.length),
          )
        ],
      id = ids[i],
      points = [];
    let x = i % w,
      y = Math.floor(i / w),
      px = 1,
      py = 0;
    const steps = 8 + Math.floor(f.rnd(k, 12, 515) * 33);
    for (let j = 0; j < steps; j++) {
      points.push([x, y]);
      let dx = f.N(x, y, 1) * 2 - 1,
        dy = f.N(x, y, 0) * 2 - 1,
        len = Math.hypot(dx, dy);
      if (len < 0.06) {
        dx = px;
        dy = py;
      } else {
        dx /= len;
        dy /= len;
      }
      if (dx * px + dy * py < 0) {
        dx = -dx;
        dy = -dy;
      }
      px = dx;
      py = dy;
      const xx = x + dx * Math.max(0.8, 2.2 * scale),
        yy = y + dy * Math.max(0.8, 2.2 * scale);
      if (
        xx < 0 ||
        yy < 0 ||
        xx >= w ||
        yy >= w ||
        f.ID(xx, yy) !== id ||
        f.ID((x + xx) / 2, (y + yy) / 2) !== id
      )
        break;
      x = xx;
      y = yy;
    }
    if (points.length > 2)
      scrapes.push({
        id,
        points,
        width: (1.2 + 4 * f.rnd(k, 13, 515)) * Math.max(0.25, scale),
        key: k,
      });
  }
  return {
    w,
    scale,
    field,
    ids,
    paper,
    tooth,
    distance,
    bleach,
    pool,
    outer,
    droplets,
    scrapes,
    chains: chainsFromContours(field.contours),
    warp: buildInkWarp(f),
  };
}
function over(paint, i, rgb, alpha) {
  alpha = clamp(alpha);
  const at = i * 4,
    keep = 1 - alpha;
  for (let c = 0; c < 3; c++)
    paint[at + c] = rgb[c] * alpha + paint[at + c] * keep;
  paint[at + 3] = alpha + paint[at + 3] * keep;
}
function disc(paint, plan, x, y, radius, rgb, alpha, clipId = 0) {
  const w = plan.w;
  for (
    let yy = Math.max(0, Math.floor(y - radius - 0.5));
    yy <= Math.min(w - 1, Math.ceil(y + radius + 0.5));
    yy++
  )
    for (
      let xx = Math.max(0, Math.floor(x - radius - 0.5));
      xx <= Math.min(w - 1, Math.ceil(x + radius + 0.5));
      xx++
    ) {
      const i = yy * w + xx;
      if (clipId && plan.ids[i] !== clipId) continue;
      const a = clamp(radius + 0.5 - Math.hypot(xx - x, yy - y)) * alpha;
      if (a > 0) over(paint, i, rgb, a);
    }
}
function stroke(
  paint,
  plan,
  x,
  y,
  u,
  v,
  width,
  rgb,
  alpha,
  clipId = 0,
  taper = false,
) {
  const length = Math.hypot(u - x, v - y),
    steps = Math.max(1, Math.ceil(length / 0.8));
  for (let j = 0; j <= steps; j++) {
    const t = j / steps;
    disc(
      paint,
      plan,
      x + (u - x) * t,
      y + (v - y) * t,
      Math.max(0.12, width * 0.5 * (taper ? 1 - t * 0.88 : 1)),
      rgb,
      alpha * (taper ? 1 - t * 0.5 : 1),
      clipId,
    );
  }
}
export function inkSettingsFor(kind, settings) {
  const out = { ...settings };
  for (const key of inkKeys)
    if (!inkEffectsFor(kind).includes(key)) out[key] = 0;
  return out;
}
export function paintInk(f, plan, settings) {
  const w = plan.w,
    pressure = 0.5 + f.intensity * 0.85,
    ink = [25, 29, 27],
    white = [241, 237, 217],
    paint = new Float32Array(w * w * 4),
    scale = Math.max(0.25, plan.scale),
    accentIds = new Set([8, 13, 19]);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        inside = plan.ids[i] > 1,
        sd = plan.distance[i] * (inside ? 1 : -1),
        edgeNoise =
          (noise(f, x / (8 * scale), y / (8 * scale), 531) - 0.45) *
          7 *
          scale *
          settings.bloom,
        coverage = clamp((sd + edgeNoise + 1.1) / 2.2);
      if (!inside && sd < -8 * scale) continue;
      const grain = plan.tooth[i] / 255,
        base = 0.67 + 0.27 * (1 - plan.field.light[i]),
        bloom = -0.48 * plan.bleach[i] + 0.3 * plan.pool[i],
        alpha =
          clamp(
            (base + settings.bloom * bloom) * pressure -
              (grain > 0.65 ? (grain - 0.65) * 1.15 : 0),
          ) * coverage;
      over(paint, i, ink, alpha);
      if (accentIds.has(plan.ids[i]) && settings.accent > 0) {
        const colorAlpha =
          settings.accent *
          (0.3 + 0.6 * plan.field.light[i]) *
          (0.7 + 0.3 * grain);
        over(paint, i, [238, 91, 10], colorAlpha * coverage);
      }
    }
  const dropCount = Math.min(
    plan.droplets.length,
    Math.floor(plan.droplets.length * settings.spatter * pressure),
  );
  for (let i = 0; i < dropCount; i++) {
    const d = plan.droplets[i],
      alpha = 0.24 + 0.65 * f.rnd(i, 31, 540);
    disc(paint, plan, d.x, d.y, d.r, ink, alpha);
    if (d.streak)
      stroke(
        paint,
        plan,
        d.x,
        d.y,
        d.x + d.nx * d.length,
        d.y + d.ny * d.length,
        Math.max(0.4, d.r * 0.85),
        ink,
        alpha,
        0,
        true,
      );
  }
  const scrapeCount = Math.min(
    plan.scrapes.length,
    Math.floor(plan.scrapes.length * settings.scrape * pressure),
  );
  for (let k = 0; k < scrapeCount; k++) {
    const s = plan.scrapes[k];
    for (let j = 1; j < s.points.length; j++) {
      if (f.rnd(s.key, j >> 1, 550) < 0.22) continue;
      const a = s.points[j - 1],
        b = s.points[j],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        nx = -(b[1] - a[1]) / len,
        ny = (b[0] - a[0]) / len,
        taper = Math.sin((Math.PI * j) / s.points.length) ** 0.6;
      for (let rib = 0; rib < 3; rib++) {
        const offset = (rib - 1) * s.width * 0.45;
        stroke(
          paint,
          plan,
          a[0] + nx * offset,
          a[1] + ny * offset,
          b[0] + nx * offset,
          b[1] + ny * offset,
          Math.max(0.35, s.width * (rib === 1 ? 0.62 : 0.18) * taper),
          white,
          (0.35 + 0.6 * f.rnd(s.key, rib, 551)) * taper,
          s.id,
        );
      }
    }
  }
  if (settings.nervous > 0) {
    const offsetX = (4 + 5 * f.rnd(17, 29, 560)) * scale * settings.nervous,
      offsetY = (-3 - 4 * f.rnd(22, 31, 560)) * scale * settings.nervous;
    for (let k = 0; k < plan.chains.length; k++) {
      const path = plan.chains[k];
      for (let j = 1; j < path.length; j++) {
        const a = path[j - 1],
          b = path[j],
          block = Math.floor(j / (5 + Math.floor(f.rnd(k, 1, 561) * 10)));
        if (f.rnd(k, block, 562) < 0.3) continue;
        const shift = (p) => [
            p[0] +
              offsetX +
              (noise(f, p[0] / (12 * scale), p[1] / (12 * scale), 563) - 0.5) *
                6 *
                scale *
                settings.nervous,
            p[1] +
              offsetY +
              (noise(f, p[0] / (17 * scale), p[1] / (17 * scale), 564) - 0.5) *
                5 *
                scale *
                settings.nervous,
          ],
          u = shift(a),
          v = shift(b);
        let ex = v[0],
          ey = v[1];
        if (j % 17 === 0) {
          const len = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1,
            extra = (2 + 7 * f.rnd(k, j, 565)) * scale * settings.nervous;
          ex += ((v[0] - u[0]) / len) * extra;
          ey += ((v[1] - u[1]) / len) * extra;
        }
        stroke(
          paint,
          plan,
          u[0],
          u[1],
          ex,
          ey,
          Math.max(0.4, (0.55 + 0.7 * f.rnd(k, block, 566)) * scale),
          ink,
          0.65 + 0.3 * settings.nervous,
        );
      }
    }
  }
  const hairs = Math.floor(500 * settings.bristles * pressure);
  for (let i = 0; i < hairs && plan.outer.length; i++) {
    const e =
        plan.outer[
          Math.min(
            plan.outer.length - 1,
            Math.floor(f.rnd(i, 41, 570) * plan.outer.length),
          )
        ],
      length = (5 + 25 * f.rnd(i, 42, 570) ** 2) * scale,
      fan = (f.rnd(i, 43, 570) - 0.5) * 0.7,
      nx = e.nx * Math.cos(fan) - e.ny * Math.sin(fan),
      ny = e.nx * Math.sin(fan) + e.ny * Math.cos(fan);
    stroke(
      paint,
      plan,
      e.x - e.nx * 1.5,
      e.y - e.ny * 1.5,
      e.x + nx * length,
      e.y + ny * length,
      Math.max(0.35, (0.65 + 0.75 * f.rnd(i, 44, 570)) * scale),
      ink,
      0.85,
      0,
      true,
    );
  }
  return paint;
}
export function compositeInk(plan, paint, warp) {
  const out = new Uint8ClampedArray(plan.w * plan.w * 4),
    point = [0, 0],
    w = plan.w;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      sampleWarp(plan.warp, x, y, warp, point);
      const sx = clamp(point[0], 0, w - 1),
        sy = clamp(point[1], 0, w - 1),
        ix = Math.floor(sx),
        iy = Math.floor(sy),
        jx = Math.min(w - 1, ix + 1),
        jy = Math.min(w - 1, iy + 1),
        u = sx - ix,
        v = sy - iy,
        indices = [
          (iy * w + ix) * 4,
          (iy * w + jx) * 4,
          (jy * w + ix) * 4,
          (jy * w + jx) * 4,
        ],
        weights = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
      let alpha = 0;
      for (let k = 0; k < 4; k++) alpha += paint[indices[k] + 3] * weights[k];
      for (let c = 0; c < 3; c++) {
        let value = 0;
        for (let k = 0; k < 4; k++) value += paint[indices[k] + c] * weights[k];
        out[i * 4 + c] = value + plan.paper[i * 3 + c] * (1 - alpha);
      }
      out[i * 4 + 3] = 255;
    }
  return out;
}
export function drawInkStudy(p, f, kind) {
  const plan = f.prepare("expressive-ink-plan", () => makeInkPlan(f)),
    settings = inkSettingsFor(kind, f.ink || defaultInk()),
    paint = paintInk(f, plan, settings),
    pixels = compositeInk(plan, paint, settings.warp);
  p.loadPixels();
  for (let i = 0; i < pixels.length; i++) p.pixels[i] = pixels[i];
  p.updatePixels();
}
