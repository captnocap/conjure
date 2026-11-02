const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const celBands = (strength) => 2 + Math.round(clamp(strength) * 2);
const marching = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [
    [3, 0],
    [1, 2],
  ],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[0, 2]],
  [
    [0, 1],
    [2, 3],
  ],
  [[1, 2]],
  [[1, 3]],
  [[0, 1]],
  [[0, 3]],
  [],
];
function fallbackDiffuse(f, x, y) {
  let nx = f.N(x, y, 0) * 2 - 1,
    ny = 1 - f.N(x, y, 1) * 2,
    nz = f.N(x, y, 2) * 2 - 1;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const hemi = f.spectralHemisphere,
    sky = clamp(
      (nx * hemi.up[0] + ny * hemi.up[1] + nz * hemi.up[2]) * 0.5 + 0.5,
    ),
    luma = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  let value =
    (luma(hemi.ground) * (1 - sky) + luma(hemi.sky) * sky) * hemi.intensity;
  for (const light of f.spectralLights)
    value +=
      Math.max(
        0,
        nx * light.direction[0] +
          ny * light.direction[1] +
          nz * light.direction[2],
      ) *
      luma(light.color) *
      light.intensity;
  return clamp((0.18 * value) / Math.PI);
}
export function sameDrawSurface(f, x, y, u, v) {
  const a = f.ID(x, y),
    b = f.ID(u, v);
  if (a <= 1 || b <= 1) return false;
  // Equal pigment does not make distinct procedural/optical materials the same
  // surface. Compare stable profiles, never per-pixel textured albedo samples.
  if (f.materialKey && f.materialKey(x, y) !== f.materialKey(u, v))
    return false;
  const color = f.baseColor || f.B,
    ca = color(x, y),
    cb = color(u, v);
  if (ca.some((value, c) => Math.abs(value - cb[c]) > 0.5)) return false;
  let ax = f.N(x, y, 0) * 2 - 1,
    ay = f.N(x, y, 1) * 2 - 1,
    az = f.N(x, y, 2) * 2 - 1,
    bx = f.N(u, v, 0) * 2 - 1,
    by = f.N(u, v, 1) * 2 - 1,
    bz = f.N(u, v, 2) * 2 - 1;
  const al = Math.hypot(ax, ay, az) || 1,
    bl = Math.hypot(bx, by, bz) || 1;
  ax /= al;
  ay /= al;
  az /= al;
  bx /= bl;
  by /= bl;
  bz /= bl;
  if (ax * bx + ay * by + az * bz < 0.998 || Math.abs(az) < 0.2) return false;
  const scale = f.pixelWorldSize || 8.2 / f.w,
    expected =
      ((ax * (Math.round(u) - Math.round(x)) -
        ay * (Math.round(v) - Math.round(y))) *
        scale) /
      az;
  return (
    Math.abs(f.distance(u, v) - f.distance(x, y) - expected) <
    0.0008 + (scale * 0.06) / Math.abs(az)
  );
}

export function cleanFields(f, sameContourSurface = sameDrawSurface) {
  const w = f.w,
    ids = new Uint16Array(w * w),
    light = new Float32Array(w * w),
    hist = new Uint32Array(256);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4;
      ids[i] = f.ID(x, y);
      const value = f.diffuse
        ? (f.diffuse[at] * 0.2126 +
            f.diffuse[at + 1] * 0.7152 +
            f.diffuse[at + 2] * 0.0722) /
          255
        : fallbackDiffuse(f, x, y);
      light[i] = value;
      if (ids[i]) hist[Math.round(clamp(value) * 255)]++;
    }
  const count = hist.reduce((a, b) => a + b, 0);
  let total = 0,
    top = 255;
  for (let i = 0; i < 256; i++) {
    total += hist[i];
    if (total >= count * 0.98) {
      top = i;
      break;
    }
  }
  const white = Math.max(0.04, top / 255);
  for (let i = 0; i < light.length; i++)
    light[i] = clamp((light[i] / white - 0.26) / 0.74);
  const contours = [],
    seen = new Set(),
    get = (x, y) =>
      ids[
        Math.max(0, Math.min(w - 1, y)) * w + Math.max(0, Math.min(w - 1, x))
      ];
  for (let y = 0; y < w - 1; y++)
    for (let x = 0; x < w - 1; x++) {
      const points = [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
        ],
        values = points.map(([xx, yy]) => get(xx, yy));
      if (values.every((id) => id === values[0])) continue;
      // Adjacent overlapping stair meshes can have the same visible plane/material.
      // Their identity tie-breaking must not become spurious ink speckles.
      for (let a = 0; a < 4; a++)
        for (let b = a + 1; b < 4; b++)
          if (
            values[a] !== values[b] &&
            sameContourSurface(f, ...points[a], ...points[b])
          ) {
            const from = values[b],
              to = values[a];
            for (let k = 0; k < 4; k++) if (values[k] === from) values[k] = to;
          }
      if (values.every((id) => id === values[0])) continue;
      const endpoints = [
        [x + 1, y + 0.5],
        [x + 1.5, y + 1],
        [x + 1, y + 1.5],
        [x + 0.5, y + 1],
      ];
      for (const id of new Set(values)) {
        if (id <= 1) continue;
        let mask = 0;
        for (let k = 0; k < 4; k++) if (values[k] === id) mask |= 1 << k;
        for (const [a, b] of marching[mask]) {
          const p = endpoints[a],
            q = endpoints[b],
            key = [p.join(","), q.join(",")].sort().join(":");
          if (seen.has(key)) continue;
          seen.add(key);
          let gx = 0,
            gy = 0;
          for (let d = -2; d <= 2; d++) {
            gx +=
              (get(x + 2, y + d) === id ? 1 : 0) -
              (get(x - 2, y + d) === id ? 1 : 0);
            gy +=
              (get(x + d, y + 2) === id ? 1 : 0) -
              (get(x + d, y - 2) === id ? 1 : 0);
          }
          const length = Math.hypot(gx, gy),
            orientation = length
              ? Math.abs((gx - gy) / (Math.SQRT2 * length))
              : 0.5;
          contours.push(p[0], p[1], q[0], q[1], orientation);
        }
      }
    }
  const creases = [];
  for (let edgeIndex = 0; edgeIndex < f.edges.length; edgeIndex++) {
    const [a, b] = f.edges[edgeIndex],
      owner = f.edgeOwners?.[edgeIndex];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      steps = Math.max(1, Math.ceil(length / 0.85));
    if (steps > w * 4) continue;
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) / steps,
        x = a[0] + (b[0] - a[0]) * t,
        y = a[1] + (b[1] - a[1]) * t,
        z = f.interpolateDepth ? f.interpolateDepth(a[2], b[2], t) : a[2] + (b[2] - a[2]) * t;
      if (
        x < 0 ||
        y < 0 ||
        x >= w ||
        y >= w ||
        f.ID(x, y) <= 1 ||
        (owner && f.ID(x, y) !== owner) ||
        z > f.distance(x, y) + 0.008
      )
        continue;
      const px = (-(b[1] - a[1]) / Math.max(length, 1e-9)) * 1.1,
        py = ((b[0] - a[0]) / Math.max(length, 1e-9)) * 1.1;
      if (sameDrawSurface(f, x + px, y + py, x - px, y - py)) continue;
      const t0 = k / steps,
        t1 = (k + 1) / steps;
      creases.push(
        a[0] + (b[0] - a[0]) * t0,
        a[1] + (b[1] - a[1]) * t0,
        a[0] + (b[0] - a[0]) * t1,
        a[1] + (b[1] - a[1]) * t1,
      );
    }
  }
  return {
    ids,
    light,
    white,
    contours: smoothContours(contours),
    creases: new Float32Array(creases),
  };
}
export function smoothContours(segments) {
  const nodes = new Map(),
    key = (x, y) => x + ":" + y;
  for (let i = 0; i < segments.length; i += 5) {
    const a = key(segments[i], segments[i + 1]),
      b = key(segments[i + 2], segments[i + 3]);
    if (!nodes.has(a))
      nodes.set(a, { x: segments[i], y: segments[i + 1], neighbors: [] });
    if (!nodes.has(b))
      nodes.set(b, { x: segments[i + 2], y: segments[i + 3], neighbors: [] });
    nodes.get(a).neighbors.push(b);
    nodes.get(b).neighbors.push(a);
  }
  for (const node of nodes.values()) {
    node.sx = node.x;
    node.sy = node.y;
    if (node.neighbors.length !== 2) continue;
    const a = nodes.get(node.neighbors[0]),
      b = nodes.get(node.neighbors[1]),
      ax = node.x - a.x,
      ay = node.y - a.y,
      bx = b.x - node.x,
      by = b.y - node.y,
      cosine =
        (ax * bx + ay * by) /
        Math.max(1e-9, Math.hypot(ax, ay) * Math.hypot(bx, by));
    if (cosine < 0.6) continue;
    node.sx = 0.2 * a.x + 0.6 * node.x + 0.2 * b.x;
    node.sy = 0.2 * a.y + 0.6 * node.y + 0.2 * b.y;
  }
  const result = Float32Array.from(segments);
  for (let i = 0; i < result.length; i += 5) {
    const a = nodes.get(key(segments[i], segments[i + 1])),
      b = nodes.get(key(segments[i + 2], segments[i + 3]));
    result[i] = a.sx;
    result[i + 1] = a.sy;
    result[i + 2] = b.sx;
    result[i + 3] = b.sy;
  }
  return result;
}

export function toneIndex(value, bands) {
  return Math.min(bands - 1, Math.floor(clamp(value) * bands));
}
export function dotCoverage(x, y, radius, pitch = 6) {
  const u = (x + y) / Math.SQRT2,
    v = (y - x) / Math.SQRT2,
    dx = u - Math.round(u / pitch) * pitch,
    dy = v - Math.round(v / pitch) * pitch;
  return clamp(radius + 0.5 - Math.hypot(dx, dy));
}
export function cleanColor(base, tone, kind) {
  if (kind === "clear-line")
    return base.map((value, c) => value * 0.84 + [248, 243, 223][c] * 0.16);
  const factor =
    kind === "comic-dots" ? 0.72 + 0.38 * tone : 0.48 + 0.62 * tone;
  return base.map((value, c) => {
    let color = value * factor;
    if (tone < 0.35) color = color * 0.85 + [31, 46, 43][c] * 0.15;
    if (tone > 0.75) color = color * 0.89 + [250, 242, 216][c] * 0.11;
    return clamp(color, 0, 255);
  });
}
export function drawCleanStudy(p, f, kind) {
  const field = f.prepare("clean-fields", () => cleanFields(f)),
    w = f.w,
    bands = kind === "cel" ? celBands(f.intensity) : 2,
    ink = [25, 32, 29];
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4,
        id = field.ids[i],
        q = field.light[i],
        level = kind === "clear-line" ? 1 : toneIndex(q, bands) / (bands - 1),
        base = id <= 1 ? [190, 194, 179] : f.B(x, y),
        color = cleanColor(base, level, kind),
        metal = f.metalness(x, y),
        highlight = metal > 0.3 ? clamp((f.L(x, y) - 0.7) / 0.18) : 0;
      if (kind !== "clear-line" && highlight > 0) {
        const source = f.C(x, y),
          amount = kind === "cel" ? highlight * 0.9 : highlight > 0.6 ? 0.8 : 0;
        for (let c = 0; c < 3; c++)
          color[c] = color[c] * (1 - amount) + source[c] * amount;
      }
      if (kind === "comic-dots" && id > 1 && q < 0.5 && highlight < 0.1) {
        const coverage = dotCoverage(
          x + 0.5,
          y + 0.5,
          0.65 + 1.1 * f.intensity,
        );
        for (let c = 0; c < 3; c++)
          color[c] = color[c] * (1 - coverage) + ink[c] * coverage;
      }
      for (let c = 0; c < 3; c++) p.pixels[at + c] = color[c];
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
  p.noFill();
  p.stroke(...ink);
  const width =
    kind === "brush-cel"
      ? 1.65 + 2.2 * f.intensity
      : kind === "clear-line"
        ? 0.55 + 1.3 * f.intensity
        : kind === "comic-dots"
          ? 1.5
          : 1.15;
  p.strokeWeight(width);
  for (let i = 0; i < field.contours.length; i += 5) {
    if (kind === "brush-cel")
      p.strokeWeight(width * (0.7 + 0.6 * field.contours[i + 4]));
    p.line(
      field.contours[i],
      field.contours[i + 1],
      field.contours[i + 2],
      field.contours[i + 3],
    );
  }
  p.strokeWeight(
    kind === "clear-line"
      ? width
      : kind === "brush-cel"
        ? 0.6 + 0.4 * f.intensity
        : 0.7,
  );
  for (let i = 0; i < field.creases.length; i += 4)
    p.line(
      field.creases[i],
      field.creases[i + 1],
      field.creases[i + 2],
      field.creases[i + 3],
    );
}
