// Draw-only interpretations of the inspected publisher screenshots. No scene,
// camera, light, material or capture is modified by these treatments.
import { sameDrawSurface } from "./clean-studies.js";
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => a.map((v, k) => v - b[k]);
const unit = (v) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// The capture is orthographic. Sampling beyond one edge keeps the clamped
// captured distance constant, exposing the exact pixel-to-world camera basis.
export function capturedBasis(f) {
  const w = f.w,
    px = f.worldPosition(w + 1, 0),
    py = f.worldPosition(0, w + 1),
    dx = sub(f.worldPosition(w + 2, 0), px),
    dy = sub(f.worldPosition(0, w + 2), py),
    right = unit(dx),
    down = unit(dy),
    forward = unit(cross(right, down)),
    light = unit(f.reliefLight || [-0.45, -0.55, 0.704]);
  return {
    origin: f.worldPosition(0, 0),
    dx,
    dy,
    right,
    down,
    forward,
    scaleX: dot(dx, dx) || 1,
    scaleY: dot(dy, dy) || 1,
    light,
    worldLight: right.map(
      (v, k) => v * light[0] + down[k] * light[1] - forward[k] * light[2],
    ),
  };
}

export function spatialFields(f) {
  const w = f.w,
    count = w * w,
    ids = new Uint16Array(count),
    light = new Float32Array(count),
    depth = new Float32Array(count),
    world = new Float32Array(count * 3),
    normals = new Float32Array(count * 3),
    histogram = new Uint32Array(256),
    areas = new Map(),
    basis = capturedBasis(f),
    hemi = f.spectralHemisphere,
    sources = f.spectralLights || [],
    luma = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  let near = Infinity,
    far = -Infinity,
    objectCount = 0,
    floorY = Infinity;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 3,
        at = i * 4,
        id = f.ID(x, y),
        point = f.worldPosition(x, y),
        d = f.distance(x, y),
        nx = f.N(x, y, 0) * 2 - 1,
        ny = 1 - f.N(x, y, 1) * 2,
        nz = f.N(x, y, 2) * 2 - 1;
      ids[i] = id;
      depth[i] = d;
      world[k] = point[0];
      world[k + 1] = point[1];
      world[k + 2] = point[2];
      normals[k] = nx;
      normals[k + 1] = ny;
      normals[k + 2] = nz;
      let value;
      if (f.diffuse)
        value =
          (f.diffuse[at] * 0.2126 +
            f.diffuse[at + 1] * 0.7152 +
            f.diffuse[at + 2] * 0.0722) /
          255;
      else if (hemi) {
        const sky = clamp(
          (nx * hemi.up[0] + ny * hemi.up[1] + nz * hemi.up[2]) * 0.5 + 0.5,
        );
        value = mix(luma(hemi.ground), luma(hemi.sky), sky) * hemi.intensity;
        for (const source of sources)
          value +=
            Math.max(
              0,
              nx * source.direction[0] +
                ny * source.direction[1] +
                nz * source.direction[2],
            ) *
            luma(source.color) *
            source.intensity;
        value *= 0.18 / Math.PI;
      } else
        value =
          0.15 +
          0.35 *
            Math.max(
              0,
              nx * basis.light[0] + ny * basis.light[1] + nz * basis.light[2],
            );
      light[i] = value;
      histogram[Math.round(clamp(value) * 255)]++;
      if (id > 1) {
        near = Math.min(near, d);
        far = Math.max(far, d);
        objectCount++;
        areas.set(id, (areas.get(id) || 0) + 1);
      }
      if (id === 1 && Number.isFinite(point[1]))
        floorY = Math.min(floorY, point[1]);
    }
  if (!Number.isFinite(near)) {
    near = 6;
    far = 18;
  }
  if (!Number.isFinite(floorY)) floorY = -0.12;
  let total = 0,
    white = 0.1;
  for (let k = 0; k < 256; k++) {
    total += histogram[k];
    if (total >= count * 0.985) {
      white = Math.max(0.04, k / 255);
      break;
    }
  }
  for (let i = 0; i < count; i++)
    light[i] = clamp((light[i] / white - 0.17) / 0.83);
  let accentId = 0,
    score = -Infinity;
  for (const [id, area] of areas) {
    if (area > objectCount * 0.22 || area < objectCount * 0.004) continue;
    const c = f.materialColor ? f.materialColor(id) : [150, 145, 100],
      s = (c[0] + c[1]) * 0.5 - c[2] - Math.abs(c[0] - c[1]) * 0.18;
    if (s > score) {
      score = s;
      accentId = id;
    }
  }
  return {
    w,
    ids,
    light,
    depth,
    world,
    normals,
    near,
    far: Math.max(near + 0.5, far),
    floorY,
    basis,
    accentId,
  };
}
const fieldsFor = (f) =>
  f.prepare("game-spatial-fields", () => spatialFields(f));

export function insideFogFactor(depth, near, far, strength) {
  const z = Math.max(0, (depth - near) / Math.max(0.5, far - near));
  return clamp(
    0.025 + 0.77 * (1 - Math.exp(-z * (0.7 + 1.7 * clamp(strength)))),
    0,
    0.91,
  );
}

export function projectFloorShadow(point, planeY, basis, elongation = 3.1) {
  const light = basis.worldLight,
    height = point[1] - planeY;
  if (height < -0.005 || light[1] <= 0.02) return null;
  const t = height / light[1],
    q = [
      point[0] - light[0] * t * elongation,
      planeY,
      point[2] - light[2] * t * elongation,
    ],
    v = sub(q, basis.origin);
  return [dot(v, basis.dx) / basis.scaleX, dot(v, basis.dy) / basis.scaleY];
}

function fillShadowTriangle(mask, fields, a, b, c, receiverId) {
  const w = fields.w,
    area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(area) < 0.01) return;
  const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))),
    x1 = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0]))),
    y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))),
    y1 = Math.min(w - 1, Math.ceil(Math.max(a[1], b[1], c[1]))),
    sign = Math.sign(area);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      if (fields.ids[i] !== receiverId || mask[i]) continue;
      const k = i * 3,
        n = fields.normals,
        basis = fields.basis,
        up =
          n[k] * basis.right[1] +
          n[k + 1] * basis.down[1] -
          n[k + 2] * basis.forward[1];
      if (up < 0.7) continue;
      if (
        sign * ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])) >=
          -0.1 &&
        sign * ((c[0] - b[0]) * (y - b[1]) - (c[1] - b[1]) * (x - b[0])) >=
          -0.1 &&
        sign * ((a[0] - c[0]) * (y - c[1]) - (a[1] - c[1]) * (x - c[0])) >= -0.1
      )
        mask[i] = 255;
    }
}

export function floorShadows(fields) {
  const { w, ids, world, basis, normals } = fields,
    mask = new Uint8Array(w * w),
    planes = [{ id: 1, y: fields.floorY }];
  // The plinth is a second real receiver. Its top plane is measured, not moved.
  for (let i = 0; i < ids.length; i += 7) {
    const k = i * 3,
      up =
        normals[k] * basis.right[1] +
        normals[k + 1] * basis.down[1] -
        normals[k + 2] * basis.forward[1];
    if (ids[i] === 2 && up > 0.96) {
      planes.push({ id: 2, y: world[k + 1] });
      break;
    }
  }
  const step = w >= 400 ? 2 : 1;
  for (const plane of planes) {
    const projected = new Float32Array(w * w * 2).fill(NaN);
    for (let y = 0; y < w; y += step)
      for (let x = 0; x < w; x += step) {
        const i = y * w + x,
          k = i * 3;
        if (ids[i] <= 1 || ids[i] === plane.id) continue;
        const point = projectFloorShadow(
          [world[k], world[k + 1], world[k + 2]],
          plane.y,
          basis,
        );
        if (point) {
          projected[i * 2] = point[0];
          projected[i * 2 + 1] = point[1];
        }
      }
    for (let y = 0; y < w - step; y += step)
      for (let x = 0; x < w - step; x += step) {
        const a = y * w + x,
          b = a + step,
          c = a + step * w,
          d = c + step,
          id = ids[a];
        if (
          id <= 1 ||
          id === plane.id ||
          ids[b] !== id ||
          ids[c] !== id ||
          ids[d] !== id ||
          !Number.isFinite(projected[a * 2]) ||
          !Number.isFinite(projected[b * 2]) ||
          !Number.isFinite(projected[c * 2]) ||
          !Number.isFinite(projected[d * 2])
        )
          continue;
        // Do not bridge a fold/occlusion just because its two sides share an ID.
        if (
          Math.max(
            fields.depth[a],
            fields.depth[b],
            fields.depth[c],
            fields.depth[d],
          ) -
            Math.min(
              fields.depth[a],
              fields.depth[b],
              fields.depth[c],
              fields.depth[d],
            ) >
          Math.max(0.03, Math.sqrt(basis.scaleX) * step * 12)
        )
          continue;
        const aa = [projected[a * 2], projected[a * 2 + 1]],
          bb = [projected[b * 2], projected[b * 2 + 1]],
          cc = [projected[c * 2], projected[c * 2 + 1]],
          dd = [projected[d * 2], projected[d * 2 + 1]];
        fillShadowTriangle(mask, fields, aa, bb, cc, plane.id);
        fillShadowTriangle(mask, fields, bb, dd, cc, plane.id);
      }
  }
  return mask;
}

// INSIDE: depth is the organizing variable; only the light-facing edge receives
// a narrow back rim, and visible surface fragments project long floor shadows.
export function drawInside(p, f) {
  const s = fieldsFor(f),
    { w, ids, light, depth, normals, near, far, basis } = s,
    shadow = f.prepare("game-inside-floor-shadows", () => floorShadows(s)),
    strength = clamp(f.intensity),
    length = Math.hypot(basis.light[0], basis.light[1]) || 1,
    rx = Math.round((basis.light[0] / length) * Math.max(1.2, w / 600)),
    ry = Math.round((basis.light[1] / length) * Math.max(1.2, w / 600));
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        at = i * 3,
        id = ids[i],
        l = light[i],
        fog = insideFogFactor(depth[i], near, far, strength),
        j = clamp(y + ry, 0, w - 1) * w + clamp(x + rx, 0, w - 1),
        rim =
          id > 1 &&
          ids[j] !== id &&
          depth[j] > depth[i] + 0.015 &&
          normals[at] * basis.light[0] +
            normals[at + 1] * basis.light[1] +
            normals[at + 2] * basis.light[2] >
            -0.1 &&
          !sameDrawSurface(f, x, y, j % w, Math.floor(j / w)),
        cast = shadow[i] / 255,
        base = id <= 1 ? 27 + l * 32 : 4 + l * (15 - strength * 5),
        warm = id === 7 ? l * 7 : 0,
        r = mix(base + warm, 93, fog),
        g = mix(base + 7, 112, fog),
        b = mix(base + 12, 120, fog),
        shade = 1 - cast * (0.43 + strength * 0.18) * (1 - fog * 0.5),
        edge = rim ? (1 - fog) * 36 : 0;
      p.pixels[k] = r * shade + edge;
      p.pixels[k + 1] = g * shade + edge * 1.05;
      p.pixels[k + 2] = b * shade + edge * 1.03;
      p.pixels[k + 3] = 255;
    }
  p.updatePixels();
}

const repeatDistance = (v, period) =>
  Math.abs((((v % period) + period) % period) - period * 0.5);
function panelChannel(x, y, z, nx, ny, nz, pixelWidth) {
  const ax = Math.abs(nx),
    ay = Math.abs(ny),
    az = Math.abs(nz),
    top = ay > Math.max(ax, az),
    u = top ? x : ax > az ? z : x,
    v = top ? z : y,
    period = top ? 0.55 : 0.235,
    width = Math.max(0.009, pixelWidth * 0.64),
    rib = 1 - clamp((repeatDistance(v, period) - 0.014) / width),
    joint = 1 - clamp((repeatDistance(u, 0.79) - 0.007) / width);
  return Math.max(rib * (top ? 0.5 : 1), joint * 0.57);
}
export function architecturalPanels(point, normal, pixelWidth = 0.01) {
  return panelChannel(...point, ...normal, pixelWidth);
}

function softGlare(source, w, radius) {
  const temp = new Float32Array(source.length),
    out = new Float32Array(source.length),
    span = radius * 2 + 1;
  for (let y = 0; y < w; y++) {
    let sum = 0;
    for (let dx = -radius; dx <= radius; dx++)
      sum += source[y * w + clamp(dx, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      temp[y * w + x] = sum / span;
      sum +=
        source[y * w + Math.min(w - 1, x + radius + 1)] -
        source[y * w + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy++)
      sum += temp[clamp(dy, 0, w - 1) * w + x];
    for (let y = 0; y < w; y++) {
      out[y * w + x] = sum / span;
      sum +=
        temp[Math.min(w - 1, y + radius + 1) * w + x] -
        temp[Math.max(0, y - radius) * w + x];
    }
  }
  return out;
}

export function drawMirrorsEdge(p, f) {
  const s = fieldsFor(f),
    { w, ids, light, world, normals, basis } = s,
    strength = clamp(f.intensity),
    glare = f.prepare("game-mirrors-edge-glare", () => {
      const source = new Float32Array(w * w);
      for (let i = 0; i < source.length; i++)
        if (ids[i] > 1) source[i] = clamp((light[i] - 0.92) / 0.08);
      return softGlare(source, w, Math.max(2, Math.round(w / 105)));
    }),
    pixelWidth = f.pixelWorldSize || 8.2 / w;
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        at = i * 3,
        id = ids[i],
        l = light[i],
        nx = normals[at],
        ny = normals[at + 1],
        nz = normals[at + 2],
        wx = nx * basis.right[0] + ny * basis.down[0] - nz * basis.forward[0],
        wy = nx * basis.right[1] + ny * basis.down[1] - nz * basis.forward[1],
        wz = nx * basis.right[2] + ny * basis.down[2] - nz * basis.forward[2],
        seam =
          id > 1
            ? panelChannel(
                world[at],
                world[at + 1],
                world[at + 2],
                wx,
                wy,
                wz,
                pixelWidth,
              )
            : 0;
      let contact = 0;
      if (wy > 0.65)
        for (let direction = 0; direction < 4; direction++) {
          const xx = x + (direction === 2 ? -2 : direction === 3 ? 2 : 0),
            yy = y + (direction === 0 ? -2 : direction === 1 ? 2 : 0),
            j = yy * w + xx;
          if (
            xx < 0 ||
            xx >= w ||
            yy < 0 ||
            yy >= w ||
            ids[j] <= 1 ||
            ids[j] === id
          )
            continue;
          const h = world[j * 3 + 1] - world[at + 1],
            dz = s.depth[i] - s.depth[j];
          if (h > 0.005 && h < 0.23 && dz > 0.005 && dz < 0.35) contact = 0.19;
        }
      const sun = clamp((l - 0.12) / 0.75),
        shoulder = 1 - (1 - sun) ** 1.7,
        shade = clamp(shoulder - seam * (0.055 + strength * 0.13) - contact),
        accent = id === s.accentId,
        glow = glare[i] * (6 + strength * 10),
        dark = accent ? [162, 114, 13] : [113, 100, 155],
        bright = accent ? [255, 222, 30] : [255, 254, 246];
      p.pixels[k] = mix(dark[0], bright[0], shade) + glow;
      p.pixels[k + 1] = mix(dark[1], bright[1], shade) + glow;
      p.pixels[k + 2] = mix(dark[2], bright[2], shade) + glow;
      p.pixels[k + 3] = 255;
    }
  p.updatePixels();
}

export function photoWindow(w, strength) {
  const s = clamp(strength),
    angle = -0.064;
  return {
    cx: w * 0.53,
    cy: w * 0.49,
    halfWidth: w * (0.17 + 0.155 * s),
    halfHeight: w * (0.205 + 0.165 * s),
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    border: Math.max(2, w * 0.006),
  };
}
export function photoSignedDistance(x, y, box) {
  const dx = x - box.cx,
    dy = y - box.cy,
    u = Math.abs(dx * box.cos + dy * box.sin) - box.halfWidth,
    v = Math.abs(-dx * box.sin + dy * box.cos) - box.halfHeight;
  return (
    Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0)
  );
}

export function drawViewfinder(p, f) {
  const s = fieldsFor(f),
    { w, ids, light, depth } = s,
    box = photoWindow(w, f.intensity),
    shadowShift = Math.max(2, w * 0.008),
    edgeWidth = Math.max(1, w / 600);
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        id = ids[i],
        l = light[i],
        d = photoSignedDistance(x + 0.5, y + 0.5, box),
        physical = f.C(x, y),
        material = f.B(x, y),
        lum =
          material[0] * 0.2126 + material[1] * 0.7152 + material[2] * 0.0722,
        gray =
          physical[0] * 0.2126 + physical[1] * 0.7152 + physical[2] * 0.0722,
        grain = (f.rnd(x, y, 911) - 0.5) * 2.8;
      let r, g, b;
      if (d < -box.border) {
        let ink = 0;
        for (const off of [1, w]) {
          const j = Math.min(ids.length - 1, i + off),
            xx = off === 1 ? Math.min(w - 1, x + 1) : x,
            yy = off === w ? Math.min(w - 1, y + 1) : y;
          if (
            (ids[j] !== id && !sameDrawSurface(f, x, y, xx, yy)) ||
            Math.abs(depth[j] - depth[i]) > 0.095
          )
            ink = 1;
        }
        const photo = clamp((gray - 48) * 1.15 + 28 + l * 16, 10, 245),
          hatch = l < 0.42 && (x + 2 * y) % 7 === 0 ? (1 - l) * 10 : 0;
        r = g = b = photo - ink * (24 + (1 - l) * 18) - hatch + grain;
      } else if (d <= 0) {
        r = 250 + grain * 0.35;
        g = 248 + grain * 0.35;
        b = 239 + grain * 0.35;
      } else {
        const sat = 1.62,
          shade = 0.57 + l * 0.47;
        r = (lum + (material[0] - lum) * sat) * shade;
        g = (lum + (material[1] - lum) * sat) * shade;
        b = (lum + (material[2] - lum) * sat) * shade;
        if (id <= 1) {
          r = mix(33, 132, l);
          g = mix(132, 211, l);
          b = mix(165, 228, l);
        } else {
          g += (1 - l) * 10;
          b += (1 - l) * 17;
        }
        const sd = photoSignedDistance(
            x + 0.5 - shadowShift,
            y + 0.5 - shadowShift,
            box,
          ),
          shadow = clamp(1 - Math.max(0, sd) / (edgeWidth * 4)) * 0.19;
        r *= 1 - shadow;
        g *= 1 - shadow;
        b *= 1 - shadow;
      }
      p.pixels[k] = r;
      p.pixels[k + 1] = g;
      p.pixels[k + 2] = b;
      p.pixels[k + 3] = 255;
    }
  p.updatePixels();
}
