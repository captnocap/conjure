/* Opaque contour painting. No blur, emission, additive light, or displaced geometry. */
import { sameDrawSurface } from "./clean-studies.js";
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const luma = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
export function electricHash(x, y, seed = 0) {
  let n =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(seed | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function electricSettings(intensity = 0.6, size = 720) {
  const strength = clamp(
      Number.isFinite(intensity) ? intensity : 0.6,
      0.15,
      0.95,
    ),
    scale = size / 720;
  return Object.freeze({
    strength,
    scale,
    ribbonWidth: (4 + 17 * strength) * scale,
    markLength: (7.4 + 18.2 * strength) * scale,
    markWidth: (0.8 + 1.8 * strength) * scale,
    markSpacing: Math.max(2, (13.3 - 3.4 * strength) * scale),
    markCoverage: 0.18 + 0.6 * strength,
    maxReach: 26 * scale,
    shadowCut: 0.32 + 0.07 * strength,
  });
}
/** Camera-space normals use up-positive Y; the shared light is screen-Y-positive. */
export function electricLight(normal, direction) {
  const n = Math.hypot(...normal) || 1,
    d = Math.hypot(...direction) || 1;
  return clamp(
    (normal[0] * direction[0] -
      normal[1] * direction[1] +
      normal[2] * direction[2]) /
      (n * d),
    -1,
    1,
  );
}
/** Unequal, nested ribbons change width and emphasis with incident edge light. */
export function electricRibbon(
  distance,
  incident,
  along,
  seed,
  settings,
  kind = 1,
) {
  const taper =
    0.66 +
    0.34 * Math.sin(along * 0.038 + electricHash(seed, kind, seed) * 6.28) ** 2;
  const width = settings.ribbonWidth * taper * (kind === 2 ? 0.73 : 1);
  const light = clamp(incident),
    shadow = 1 - light;
  const outer = width * (0.08 + light * 0.67),
    inner = width * (0.13 + shadow * 0.55);
  const gap = (0.45 + 0.8 * shadow) * settings.scale;
  const phase =
    (along / Math.max(1, settings.scale)) * 0.065 +
    electricHash(seed, 31, seed) * 12;
  const broken = Math.sin(phase) + 0.28 * Math.sin(phase * 2.31 + 1.7) > -0.72;
  let band = 0,
    ink = distance < 0.8 * settings.scale;
  if (light >= 0.58) {
    if (distance < outer && broken)
      band = distance < Math.max(0.7 * settings.scale, outer * 0.22) ? 3 : 1;
    else if (
      distance >= outer + gap &&
      distance < outer + gap + inner &&
      broken
    )
      band = 2;
    ink ||= distance >= outer && distance < outer + gap;
  } else if (light < 0.34) {
    if (distance < inner && broken) band = 2;
    else if (
      distance >= inner + gap &&
      distance < inner + gap + outer * 0.62 &&
      Math.sin(phase + 1.2) > 0.5
    )
      band = 1;
    ink ||= distance >= inner && distance < inner + gap;
  } else {
    // Quiet stretches separate the broad painted ribbons. Mid-facing contours
    // receive only occasional small violet wedges, not a continuous neon line.
    if (distance < inner * 0.38 && Math.sin(phase * 0.77) > 0.68) band = 2;
  }
  return { band, outer, inner, width, broken, ink };
}

/** Pure preparation. All fields are new arrays; the source frame is only read. */
export function buildElectricContour(f) {
  const w = f.w,
    count = w * w,
    reach = (26 * w) / 720,
    scale = f.pixelWorldSize || 8.2 / w;
  const owner = new Uint16Array(count),
    profile = new Uint16Array(count),
    profiles = new Map(),
    normal = new Float32Array(count * 3),
    depth = new Float32Array(count);
  const material = new Uint8ClampedArray(count * 3),
    light = new Float32Array(count),
    observed = new Float32Array(count);
  const edgeKind = new Uint8Array(count),
    edgeX = new Float32Array(count),
    edgeY = new Float32Array(count);
  const nearest = new Int32Array(count).fill(-1),
    distance = new Float32Array(count).fill(reach + 1);
  const direction = f.reliefLight || [-0.45, -0.55, 0.704],
    dl = Math.hypot(...direction) || 1;
  const lightDirection = Object.freeze(direction.map((v) => v / dl));
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 3,
        b = f.B(x, y);
      owner[i] = f.ID(x, y);
      depth[i] = f.distance(x, y);
      material.set(b, k);
      const key = f.materialKey ? f.materialKey(x, y) : "original";
      if (!profiles.has(key)) profiles.set(key, profiles.size);
      profile[i] = profiles.get(key);
      let nx = f.N(x, y, 0) * 2 - 1,
        ny = f.N(x, y, 1) * 2 - 1,
        nz = f.N(x, y, 2) * 2 - 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      normal.set([nx, ny, nz], k);
      light[i] = clamp(
        nx * lightDirection[0] -
          ny * lightDirection[1] +
          nz * lightDirection[2],
        -1,
        1,
      );
      observed[i] = clamp(luma(f.C(x, y)) / Math.max(24, luma(b)));
    }
  const normalDot = (i, j) =>
    normal[i * 3] * normal[j * 3] +
    normal[i * 3 + 1] * normal[j * 3 + 1] +
    normal[i * 3 + 2] * normal[j * 3 + 2];
  const shared = (i, j) =>
    sameDrawSurface(f, i % w, Math.floor(i / w), j % w, Math.floor(j / w));
  const planeGap = (i, j) => {
    const k = i * 3,
      nz = normal[k + 2];
    if (Math.abs(nz) < 0.15) return Math.abs(depth[i] - depth[j]);
    const dx = (j % w) - (i % w),
      dy = Math.floor(j / w) - Math.floor(i / w);
    return Math.abs(
      depth[j] -
        depth[i] -
        ((normal[k] * dx - normal[k + 1] * dy) * scale) / nz,
    );
  };
  const joins = (i, j) =>
    owner[i] > 1 &&
    owner[j] > 1 &&
    profile[i] === profile[j] &&
    (owner[i] === owner[j]
      ? normalDot(i, j) > 0.86 && planeGap(i, j) < scale * 3 + 0.008
      : shared(i, j));
  const seed = (i, dx, dy, kind) => {
    if (owner[i] <= 1) return;
    if (kind > edgeKind[i]) {
      edgeKind[i] = kind;
      edgeX[i] = 0;
      edgeY[i] = 0;
    }
    if (kind === edgeKind[i]) {
      edgeX[i] += dx;
      edgeY[i] += dy;
      nearest[i] = i;
      distance[i] = 0.25;
    }
  };
  let suppressedSeams = 0;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        if (x + dx >= w || y + dy >= w) continue;
        const j = i + dx + dy * w;
        if (owner[i] <= 1 && owner[j] <= 1) continue;
        if (
          owner[i] !== owner[j] &&
          profile[i] === profile[j] &&
          shared(i, j)
        ) {
          suppressedSeams++;
          continue;
        }
        let kind = owner[i] !== owner[j] || profile[i] !== profile[j] ? 1 : 0;
        if (owner[i] > 1 && owner[j] > 1 && normalDot(i, j) < 0.86) kind = 2;
        else if (owner[i] === owner[j] && planeGap(i, j) > scale * 3 + 0.008)
          kind = 1;
        if (kind) {
          seed(i, dx, dy, kind);
          seed(j, -dx, -dy, kind);
        }
      }
    }
  let edgePixels = 0;
  for (let i = 0; i < count; i++)
    if (edgeKind[i]) {
      edgePixels++;
      const len = Math.hypot(edgeX[i], edgeY[i]);
      if (len) {
        edgeX[i] /= len;
        edgeY[i] /= len;
      } else {
        edgeX[i] = normal[i * 3];
        edgeY[i] = -normal[i * 3 + 1];
      }
    }
  // Smooth local raster stair steps along the same side of a contour. Opposing
  // sides of thin stems cannot cancel each other; actual corners remain local.
  const oldX = edgeX.slice(),
    oldY = edgeY.slice();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!edgeKind[i]) continue;
      let sx = oldX[i] * 3,
        sy = oldY[i] * 3;
      for (let yy = Math.max(0, y - 2); yy <= Math.min(w - 1, y + 2); yy++)
        for (let xx = Math.max(0, x - 2); xx <= Math.min(w - 1, x + 2); xx++) {
          const j = yy * w + xx;
          if (
            edgeKind[j] !== edgeKind[i] ||
            owner[j] !== owner[i] ||
            profile[j] !== profile[i] ||
            oldX[i] * oldX[j] + oldY[i] * oldY[j] < 0.15
          )
            continue;
          const weight = 1 / (1 + Math.hypot(xx - x, yy - y));
          sx += oldX[j] * weight;
          sy += oldY[j] * weight;
        }
      const len = Math.hypot(sx, sy) || 1;
      edgeX[i] = sx / len;
      edgeY[i] = sy / len;
    }
  // Two bounded nearest-edge sweeps. A ribbon never passes through a crease,
  // owner/depth discontinuity, or an unrelated material to reach another face.
  const relax = (i, j) => {
    const origin = nearest[j];
    if (origin < 0) return;
    const candidate =
      Math.hypot(
        (i % w) - (origin % w),
        Math.floor(i / w) - Math.floor(origin / w),
      ) + 0.25;
    if (candidate >= distance[i] || candidate > reach || !joins(i, j)) return;
    distance[i] = candidate;
    nearest[i] = origin;
  };
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x) relax(i, i - 1);
      if (y) relax(i, i - w);
    }
  for (let y = w - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x + 1 < w) relax(i, i + 1);
      if (y + 1 < w) relax(i, i + w);
    }
  return Object.freeze({
    w,
    owner,
    profile,
    normal,
    depth,
    material,
    light,
    observed,
    edgeKind,
    edgeX,
    edgeY,
    nearest,
    distance,
    lightDirection,
    stats: Object.freeze({
      edgePixels,
      suppressedSeams,
      maxReach: reach,
      bytes: [
        owner,
        profile,
        normal,
        depth,
        material,
        light,
        observed,
        edgeKind,
        edgeX,
        edgeY,
        nearest,
        distance,
      ].reduce((n, a) => n + a.byteLength, 0),
    }),
  });
}
export function prepareElectricContour(f) {
  return f.prepare
    ? f.prepare(`electric-contour-v1:${f.w}`, () => buildElectricContour(f))
    : buildElectricContour(f);
}

/** Hard pigment masses keep material chroma; these are opaque paint mixtures. */
export function electricPigment(
  material,
  incidence,
  observed,
  strength,
  ground = false,
) {
  const source = clamp((observed - 0.38) / 0.54),
    exposure = 0.69 * clamp(incidence) + 0.31 * source;
  const dark = exposure < 0.32 + strength * 0.07 || observed < 0.44;
  if (ground) return [22, 20, 34].map((v) => v + (dark ? 0 : source * 3));
  if (dark) return material.map((v, c) => mix([18, 17, 29][c], v * 0.21, 0.36));
  const factor = exposure > 0.72 ? 0.76 : 0.48 + exposure * 0.1;
  return material.map((v, c) => mix(v * factor, [80, 79, 75][c], 0.09));
}

export function drawElectricContour(p, f) {
  const a = prepareElectricContour(f),
    { w } = a,
    s = electricSettings(f.intensity, w),
    seed = f.seed | 0;
  const pixels = new Uint8ClampedArray(w * w * 4),
    bandCounts = [0, 0, 0, 0];
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 3,
        q = i * 4,
        id = a.owner[i];
      if (id === 0) {
        pixels.set([21, 19, 31, 255], q);
        continue;
      }
      const color = electricPigment(
        a.material.subarray(k, k + 3),
        a.light[i],
        a.observed[i],
        s.strength,
        id === 1,
      );
      const origin = a.nearest[i];
      if (id > 1 && origin >= 0) {
        const ox = origin % w,
          oy = Math.floor(origin / w),
          ex = a.edgeX[origin],
          ey = a.edgeY[origin];
        const incident = clamp(
          0.4 +
            0.53 * (ex * a.lightDirection[0] + ey * a.lightDirection[1]) +
            0.25 * a.light[origin],
        );
        // A slowly varying spatial phase stays continuous when tangent direction
        // rotates. Dotting absolute position with that tangent would create combs.
        const along = ox * 0.73 + oy * 0.41;
        const ribbon = electricRibbon(
          a.distance[i],
          incident,
          along,
          seed + a.owner[origin] * 101,
          s,
          a.edgeKind[origin],
        );
        bandCounts[ribbon.band]++;
        if (ribbon.band) {
          const paint =
            ribbon.band === 3
              ? [251, 249, 212]
              : ribbon.band === 1
                ? [146 + incident * 38, 181 + incident * 45, 40 + incident * 39]
                : [136, 84, 183];
          const opacity = ribbon.band === 2 ? 0.8 : 0.9;
          for (let c = 0; c < 3; c++)
            color[c] = mix(color[c], paint[c], opacity);
        } else if (ribbon.ink) {
          for (let c = 0; c < 3; c++)
            color[c] = mix(color[c], [16, 16, 25][c], 0.5);
        }
      }
      pixels.set([...color, 255], q);
    }
  // Each short tapered bristle follows the projected tangent of shared light on
  // the surface. Per-pixel owner/normal/depth clipping preserves narrow geometry.
  let marks = 0,
    paintedPixels = 0;
  const step = s.markSpacing;
  for (let gy = step; gy < w - step; gy += step)
    for (let gx = step; gx < w - step; gx += step) {
      const x = Math.floor(
          gx + (electricHash(gx, gy, seed + 11) - 0.5) * step * 0.8,
        ),
        y = Math.floor(
          gy + (electricHash(gx, gy, seed + 41) - 0.5) * step * 0.8,
        );
      const i = y * w + x,
        id = a.owner[i];
      if (
        id <= 1 ||
        a.light[i] < 0.04 ||
        electricHash(gx, gy, seed + 79) >
          s.markCoverage * (0.2 + 0.8 * clamp(a.light[i]))
      )
        continue;
      if (a.distance[i] < s.ribbonWidth * 0.82) continue;
      const k = i * 3,
        nx = a.normal[k],
        ny = -a.normal[k + 1],
        nz = a.normal[k + 2],
        dot = a.light[i];
      let tx = a.lightDirection[0] - nx * dot,
        ty = a.lightDirection[1] - ny * dot;
      let length = Math.hypot(tx, ty);
      if (length < 0.08) {
        tx = -ny;
        ty = nx;
        length = Math.hypot(tx, ty);
      }
      if (length < 0.08) {
        tx = 0.7;
        ty = -0.7;
        length = 1;
      }
      tx /= length;
      ty /= length;
      const len =
          s.markLength * (0.55 + 0.8 * electricHash(gx, gy, seed + 211)),
        width = s.markWidth * (0.75 + 0.6 * electricHash(gx, gy, seed + 307));
      const half = len * 0.5,
        radius = Math.ceil(half + width),
        bright = a.light[i] > 0.66;
      const paint = bright ? [229, 231, 165] : [150, 169, 88];
      let touched = 0;
      for (
        let yy = Math.max(0, y - radius);
        yy <= Math.min(w - 1, y + radius);
        yy++
      )
        for (
          let xx = Math.max(0, x - radius);
          xx <= Math.min(w - 1, x + radius);
          xx++
        ) {
          const j = yy * w + xx,
            dx = xx - x,
            dy = yy - y,
            u = dx * tx + dy * ty,
            v = -dx * ty + dy * tx;
          if (
            Math.abs(u) > half ||
            Math.abs(v) > width * (0.25 + 0.75 * (1 - Math.abs(u) / half))
          )
            continue;
          if (
            a.owner[j] !== id ||
            a.profile[j] !== a.profile[i] ||
            (a.nearest[j] >= 0 && a.distance[j] < s.ribbonWidth * 0.6)
          )
            continue;
          const n = j * 3,
            nDot =
              nx * a.normal[n] - ny * a.normal[n + 1] + nz * a.normal[n + 2];
          if (nDot < 0.91) continue;
          const expected =
            Math.abs(nz) > 0.2
              ? ((nx * dx + ny * dy) * (f.pixelWorldSize || 8.2 / w)) / nz
              : 0;
          if (
            Math.abs(a.depth[j] - a.depth[i] - expected) >
            0.035 + (f.pixelWorldSize || 8.2 / w) * 1.8
          )
            continue;
          // A longitudinal missing bristle creates a short dry break, never noise fog.
          const breakAt = (electricHash(gx, gy, seed + 419) - 0.5) * half;
          if (u > breakAt && u < breakAt + len * 0.09) continue;
          const coverage = clamp(
            width * (0.25 + 0.75 * (1 - Math.abs(u) / half)) -
              Math.abs(v) +
              0.5,
          );
          const q = j * 4,
            opacity =
              (0.4 + 0.32 * s.strength) * (bright ? 1 : 0.64) * coverage;
          for (let c = 0; c < 3; c++)
            pixels[q + c] = mix(pixels[q + c], paint[c], opacity);
          touched++;
          paintedPixels++;
        }
      if (touched) marks++;
    }
  p.loadPixels();
  for (let i = 0; i < pixels.length; i++) p.pixels[i] = pixels[i];
  p.updatePixels();
  return Object.freeze({
    marks,
    paintedPixels,
    bandCounts: Object.freeze(bandCounts),
    preparation: a.stats,
  });
}
