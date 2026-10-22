import { cleanFields, sameDrawSurface } from "./clean-studies.js";

// Woodblock-only fallback for coplanar owner ties at grazing view angles.
// Orthographic scene depth is affine in image coordinates. Fit it directly:
// dividing by the small Z of an RGBA8 normal amplifies its quantization error.
// The fixed scene's native packed-depth differences are below 1.2e-5 units.
// This 2e-5 noise allowance cannot distinguish still smaller real offsets.
const grazingPlaneTolerance = 2e-5;
export function grazingPlanarSurface(f, x, y, u, v) {
  if (sameDrawSurface(f, x, y, u, v)) return true;
  const a = f.ID(x, y), b = f.ID(u, v);
  if (a <= 1 || b <= 1 || a === b) return false;
  if (f.materialKey && f.materialKey(x, y) !== f.materialKey(u, v))
    return false;
  const color = f.baseColor || f.B, ca = color(x, y), cb = color(u, v);
  if (ca.some((c, i) => Math.abs(c - cb[i]) > 0.5)) return false;
  const encoded = [0, 1, 2].map(c => f.N(x, y, c));
  if (encoded.some((c, i) => c !== f.N(u, v, i))) return false;
  const normal = encoded.map(c => 2 * c - 1),
    az = Math.abs(normal[2] / Math.hypot(...normal));
  if (!Number.isFinite(az) || az >= 0.2 || az < 0.05) return false;

  const fit = (cx, cy, id) => {
    const points = [];
    let mx = 0, my = 0, mz = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const px = cx + dx, py = cy + dy;
        if (px < 0 || py < 0 || px >= f.w || py >= f.w ||
            f.ID(px, py) !== id ||
            encoded.some((c, i) => c !== f.N(px, py, i))) continue;
        if (f.materialKey && f.materialKey(px, py) !== f.materialKey(cx, cy))
          return null;
        const z = f.distance(px, py);
        if (!Number.isFinite(z)) return null;
        points.push([px, py, z]);
        mx += dx; my += dy; mz += z;
      }
    const result = { points, predict: null };
    if (points.length < 4) return result;
    mx /= points.length; my /= points.length; mz /= points.length;
    let xx = 0, xy = 0, yy = 0, xz = 0, yz = 0;
    for (const [px, py, z] of points) {
      const dx = px - cx - mx, dy = py - cy - my, dz = z - mz;
      xx += dx * dx; xy += dx * dy; yy += dy * dy;
      xz += dx * dz; yz += dy * dz;
    }
    const determinant = xx * yy - xy * xy;
    if (determinant < 1) return result;
    const sx = (xz * yy - yz * xy) / determinant,
      sy = (yz * xx - xz * xy) / determinant;
    result.predict = (px, py) => mz + sx * (px - cx - mx) + sy * (py - cy - my);
    return result;
  };
  const fitA = fit(x, y, a), fitB = fit(u, v, b);
  if (!fitA || !fitB || (!fitA.predict && !fitB.predict)) return false;
  // Every available plane must explain ALL samples from BOTH owners. Testing
  // only the endpoints would erase a small crease between intersecting planes
  // with the same quantized normal. A thin owner may lack its own 2D fit, but
  // its samples must still agree with the other owner's supported plane.
  for (const { predict } of [fitA, fitB]) {
    if (!predict) continue;
    for (const { points } of [fitA, fitB])
      if (points.some(([px, py, z]) =>
        Math.abs(z - predict(px, py)) > grazingPlaneTolerance)) return false;
  }
  return true;
}

// Research prototype: separately carved color blocks plus a dark keyblock.
// The reference image supplies visible shape/material identity, never wash or
// shading pixels. All broad ink loading is an explicit plate-coordinate ramp.
export const LIMITS = Object.freeze({
  maxSize: 1440,
  maxOwners: 64,
  maxPlates: 129,
  maxMaskBytes: 8 * 1024 * 1024,
  maxEdges: 32768,
  maxEdgeSamples: 8 * 1024 * 1024,
});
const PAPER = Object.freeze([247, 241, 218]);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
function random(seed, x, y, channel = 0) {
  let z =
    Math.imul((x | 0) + seed * 31, 374761393) ^
    Math.imul((y | 0) + channel * 101, 668265263);
  z = Math.imul(z ^ (z >>> 13), 1274126177);
  return ((z ^ (z >>> 16)) >>> 0) / 4294967295;
}
const mix = (a, b, t) => a + (b - a) * t;
function field(seed, x, y, scale) {
  x /= scale;
  y /= scale;
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = smooth(x - ix),
    v = smooth(y - iy);
  return mix(
    mix(random(seed, ix, iy), random(seed, ix + 1, iy), u),
    mix(random(seed, ix, iy + 1), random(seed, ix + 1, iy + 1), u),
    v,
  );
}
export function pressureSettings(strength = 0.6) {
  strength = Number.isFinite(strength) ? clamp(strength) : 0.6;
  // Pressure raises saturating contact pickup, with the carved plan fixed.
  return { strength, pressure: 0.15 + 1.3 * strength };
}
export function contactPickup(pressure, paperContact) {
  return 2 * (1 - Math.exp(-Math.max(0, pressure) * Math.max(0, paperContact)));
}
export function bokashiLoading(plate, x, y) {
  if (!plate.ramp) return plate.loading;
  const { axis, start, end, low, high } = plate.ramp;
  const t = (x * axis[0] + y * axis[1] - start) / Math.max(1e-6, end - start);
  return low + (high - low) * smooth(t);
}
export function displayToLinear(byte) {
  const value = clamp(byte / 255);
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
export function linearToDisplay(value) {
  value = clamp(value);
  return (
    255 *
    (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055)
  );
}
export function opticalDensity(ink, paper = PAPER) {
  // Transmittance is a ratio of linear reflectances, not display-code values.
  return ink.map(
    (value, c) =>
      -Math.log(
        clamp(
          displayToLinear(value) / Math.max(1e-6, displayToLinear(paper[c])),
          1e-5,
          1,
        ),
      ),
  );
}
export function absorbOverprint(paper, deposits) {
  const density = [0, 0, 0];
  for (const { ink, amount } of deposits) {
    const d = opticalDensity(ink, paper);
    for (let c = 0; c < 3; c++) density[c] += d[c] * Math.max(0, amount);
  }
  return paper.map((value, c) =>
    linearToDisplay(displayToLinear(value) * Math.exp(-density[c])),
  );
}
function plateBounds(owner) {
  return {
    x: owner.minX,
    y: owner.minY,
    width: owner.maxX - owner.minX + 1,
    height: owner.maxY - owner.minY + 1,
  };
}
function addStroke(mask, w, ax, ay, bx, by, width) {
  const dx = bx - ax,
    dy = by - ay,
    length2 = dx * dx + dy * dy,
    r = width * 0.5;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1)),
    x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + r + 1));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1)),
    y1 = Math.min(w - 1, Math.ceil(Math.max(ay, by) + r + 1));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const t = length2
        ? clamp(((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / length2)
        : 0;
      const coverage = clamp(
        r + 0.5 - Math.hypot(x + 0.5 - ax - dx * t, y + 0.5 - ay - dy * t),
      );
      const i = y * w + x;
      mask[i] = Math.max(mask[i], Math.round(coverage * 255));
    }
}
export function prepareWoodblock(f) {
  const w = f.w;
  if (!Number.isInteger(w) || w < 2 || w > LIMITS.maxSize)
    throw RangeError("Color woodblock size must be 2–1440.");
  if (f.edges.length > LIMITS.maxEdges)
    throw RangeError("Color woodblock edge budget exceeded.");
  let edgeSamples = 0;
  for (const [a, b] of f.edges) {
    if (![...a, ...b].every(Number.isFinite))
      throw RangeError("Invalid geometry edge.");
    const samples = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.85),
    );
    if (samples <= w * 4) edgeSamples += samples;
  }
  if (edgeSamples > LIMITS.maxEdgeSamples)
    throw RangeError("Color woodblock edge sample budget exceeded.");
  const n = w * w,
    ownerIds = new Uint16Array(n),
    owners = new Map(),
    parent = new Map();
  const root = (id) => {
    while (parent.get(id) !== id) id = parent.get(id);
    return id;
  };
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const id = f.ID(x, y);
      if (!Number.isInteger(id) || id < 0 || id > 65535)
        throw RangeError("Invalid owner ID.");
      ownerIds[y * w + x] = id;
      if (id > 1) parent.set(id, id);
    }
  if (parent.size > LIMITS.maxOwners)
    throw RangeError("Color woodblock owner budget exceeded.");
  // Coplanar neighboring meshes are one printable form, including the fixture's
  // overlapping stairs. Global owner union prevents their ID tie noise from
  // resetting independent ramp coordinates in the same visible plane.
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const id = ownerIds[y * w + x];
      if (id <= 1) continue;
      for (const [u, v] of [
        [x + 1, y],
        [x, y + 1],
      ]) {
        if (u >= w || v >= w) continue;
        const other = ownerIds[v * w + u];
        if (other <= 1 || root(other) === root(id)) continue;
        if (sameDrawSurface(f, x, y, u, v)) parent.set(root(other), root(id));
      }
    }
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = ownerIds[i] > 1 ? root(ownerIds[i]) : ownerIds[i];
      ownerIds[i] = id;
      if (id <= 1) continue;
      let o = owners.get(id);
      if (!o) {
        if (owners.size >= LIMITS.maxOwners)
          throw RangeError("Color woodblock owner budget exceeded.");
        o = {
          id,
          minX: x,
          maxX: x,
          minY: y,
          maxY: y,
          count: 0,
          color: [0, 0, 0],
        };
        owners.set(id, o);
      }
      o.minX = Math.min(o.minX, x);
      o.maxX = Math.max(o.maxX, x);
      o.minY = Math.min(o.minY, y);
      o.maxY = Math.max(o.maxY, y);
      o.count++;
      const color = f.B(x, y);
      for (let c = 0; c < 3; c++)
        o.color[c] += clamp(Number.isFinite(color[c]) ? color[c] : 160, 0, 255);
    }
  // Deterministic farthest-point initialization, then six weighted color means.
  // These are source-derived inks, never a preset historical palette.
  const regions = [...owners.values()];
  for (const o of regions) o.color = o.color.map((v) => v / o.count);
  const distance = (a, b) => a.reduce((sum, v, c) => sum + (v - b[c]) ** 2, 0);
  const palette = regions.length
    ? [regions.reduce((a, b) => (a.count > b.count ? a : b)).color.slice()]
    : [];
  while (palette.length < Math.min(6, regions.length)) {
    const chosen = regions.reduce((a, b) =>
      Math.min(...palette.map((c) => distance(a.color, c))) >
      Math.min(...palette.map((c) => distance(b.color, c)))
        ? a
        : b,
    );
    if (Math.min(...palette.map((c) => distance(chosen.color, c))) < 0.001)
      break;
    palette.push(chosen.color.slice());
  }
  const nearest = (color) =>
    palette.reduce(
      (best, c, index) =>
        distance(color, c) < distance(color, palette[best]) ? index : best,
      0,
    );
  for (let pass = 0; pass < 5; pass++) {
    const sums = palette.map(() => [0, 0, 0, 0]);
    for (const o of regions) {
      const sum = sums[nearest(o.color)],
        weight = Math.sqrt(o.count);
      for (let c = 0; c < 3; c++) sum[c] += o.color[c] * weight;
      sum[3] += weight;
    }
    for (let k = 0; k < palette.length; k++)
      if (sums[k][3])
        palette[k] = sums[k].slice(0, 3).map((v) => v / sums[k][3]);
  }
  const inks = palette.map((color) =>
    color.map((v, c) => Math.min(PAPER[c], v * 0.73 + [22, 39, 34][c] * 0.27)),
  );
  const plates = [],
    reserves = new Uint8Array(n);
  let plannedMaskBytes = n; // Includes the final full-frame keyblock mask.
  for (const o of regions) {
    const bounds = plateBounds(o);
    plannedMaskBytes += bounds.width * bounds.height;
    if (plannedMaskBytes > LIMITS.maxMaskBytes)
      throw RangeError("Color woodblock mask budget exceeded.");
    const mask = new Uint8Array(bounds.width * bounds.height);
    const normalBins = new Map();
    const normalKey = (x, y) =>
      [0, 1, 2].map((c) => Math.round((f.N(x, y, c) * 2 - 1) * 32)).join(",");
    for (let y = 0; y < bounds.height; y++)
      for (let x = 0; x < bounds.width; x++)
        if (ownerIds[(y + bounds.y) * w + x + bounds.x] === o.id) {
          const key = normalKey(x + bounds.x, y + bounds.y);
          normalBins.set(key, (normalBins.get(key) || 0) + 1);
        }
    // The same damp paper is printed by each color plate. Masks never grow with pressure.
    for (let y = 0; y < bounds.height; y++)
      for (let x = 0; x < bounds.width; x++) {
        const xx = x + bounds.x,
          yy = y + bounds.y,
          local = y * bounds.width + x;
        if (ownerIds[yy * w + xx] !== o.id) continue;
        mask[local] = 255;
        // Broad upward planar faces are cut out of the color block as paper
        // reserves. Curved highlights never become little cel-shaped patches.
        const ny = f.N(xx, yy, 1) * 2 - 1;
        if (
          bounds.width / bounds.height > 1.3 &&
          ny > 0.82 &&
          normalBins.get(normalKey(xx, yy)) > Math.max(16, o.count * 0.04)
        ) {
          mask[local] = 0;
          reserves[yy * w + xx] = 255;
        }
      }
    const inkIndex = nearest(o.color),
      deepInk = inks[inkIndex];
    const cool = o.color[1] > o.color[0],
      neutral = Math.max(...o.color) - Math.min(...o.color) < 35;
    const topLoaded = cool || (neutral && bounds.height > bounds.width);
    const slope = (random(f.seed, o.id, 17) - 0.5) * 0.6,
      axis = [slope, topLoaded ? -1 : 1];
    const corners = [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x, bounds.y + bounds.height],
      [bounds.x + bounds.width, bounds.y + bounds.height],
    ];
    const projections = corners.map(([x, y]) => x * axis[0] + y * axis[1]),
      lo = Math.min(...projections),
      hi = Math.max(...projections);
    // A short, deliberate ink band fades across less than half of each block,
    // leaving a large flat-tinted passage. It does not reproduce source light.
    const start = lo + (hi - lo) * 0.52,
      end = lo + (hi - lo) * 0.92;
    plates.push({
      name: `color-${o.id}`,
      kind: "flat-color",
      owner: o.id,
      bounds,
      mask,
      ink: deepInk,
      inkIndex,
      loading: 0.25,
    });
    plates.push({
      name: `bokashi-${o.id}`,
      kind: "bokashi",
      owner: o.id,
      bounds,
      mask,
      ink: deepInk,
      inkIndex,
      ramp: { axis, start, end, low: 0, high: 1.1 },
    });
  }
  // The existing geometry-aware contour routine suppresses coincident stair
  // owner seams. Its computed lighting array is discarded and never printed.
  const boundaries = cleanFields(f, grazingPlanarSurface),
    keyMask = new Uint8Array(n),
    lineScale = w / 720;
  for (let i = 0; i < boundaries.contours.length; i += 5)
    addStroke(
      keyMask,
      w,
      ...boundaries.contours.slice(i, i + 4),
      1.08 * lineScale,
    );
  for (let i = 0; i < boundaries.creases.length; i += 4)
    addStroke(
      keyMask,
      w,
      ...boundaries.creases.slice(i, i + 4),
      0.64 * lineScale,
    );
  // Keyblock is still clipped to the union of carved scene masks. Apertures
  // and the ground are unprinted reserves, with no outside registration halo.
  for (let i = 0; i < n; i++) if (ownerIds[i] <= 1) keyMask[i] = 0;
  plates.push({
    name: "keyblock",
    kind: "keyblock",
    bounds: { x: 0, y: 0, width: w, height: w },
    mask: keyMask,
    ink: [31, 43, 36],
    loading: 0.92,
  });
  const paperTransfer = new Float32Array(n);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      paperTransfer[y * w + x] =
        0.982 +
        0.012 * field(f.seed, x, y, 31) +
        0.006 * random(f.seed, x, y, 49);
    }
  const masks = new Set(plates.map((p) => p.mask));
  const maskBytes = [...masks].reduce((n, m) => n + m.byteLength, 0);
  const visits = plates.reduce((sum, p) => sum + p.mask.length, 0);
  if (plates.length > LIMITS.maxPlates)
    throw RangeError("Color woodblock plate budget exceeded.");
  return {
    w,
    seed: f.seed,
    paper: [...PAPER],
    ownerIds,
    paperTransfer,
    plates,
    palette,
    reserves,
    stats: {
      owners: owners.size,
      sourceOwners: parent.size,
      inks: palette.length + 1,
      plates: plates.length,
      maskBytes,
      retainedTypedBytes:
        maskBytes +
        ownerIds.byteLength +
        paperTransfer.byteLength +
        reserves.byteLength,
      platePixelVisits: visits,
      edgeSamples,
      fullFramePixels: n,
      registrationPixels: 0,
    },
  };
}
export function renderWoodblock(plan, strength = 0.6, { omitKinds = [] } = {}) {
  const { w, paper, plates, paperTransfer } = plan,
    n = w * w,
    settings = pressureSettings(strength),
    density = new Float32Array(n * 3),
    paperLinear = paper.map(displayToLinear);
  for (const plate of plates) {
    if (omitKinds.includes(plate.kind)) continue;
    const d = opticalDensity(plate.ink, paper),
      b = plate.bounds;
    for (let y = 0; y < b.height; y++)
      for (let x = 0; x < b.width; x++) {
        const coverage = plate.mask[y * b.width + x] / 255;
        if (!coverage) continue;
        const xx = x + b.x,
          yy = y + b.y,
          i = yy * w + xx;
        const amount =
          coverage *
          bokashiLoading(plate, xx, yy) *
          contactPickup(settings.pressure, paperTransfer[i]);
        for (let c = 0; c < 3; c++) density[i * 3 + c] += d[c] * amount;
      }
  }
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++)
      rgba[i * 4 + c] = linearToDisplay(
        paperLinear[c] * Math.exp(-density[i * 3 + c]),
      );
    rgba[i * 4 + 3] = 255;
  }
  return { rgba, density, settings };
}
export function drawColorWoodblock(p, f) {
  const plan = f.prepare("color-woodblock-v1", () => prepareWoodblock(f));
  const { rgba } = renderWoodblock(plan, f.intensity);
  p.loadPixels();
  for (let i = 0; i < rgba.length; i++) p.pixels[i] = rgba[i];
  p.updatePixels();
}
export const colorWoodblockCandidate = Object.freeze({
  id: "color-woodblock",
  name: "Color woodblock",
  family: "Print & transfer",
  control: "Print pressure",
  description:
    "Independent color blocks lay broad brushed ink gradations inside carved silhouettes. A quiet paper reserve and dark keyblock keep the forms clear.",
  mechanism:
    "Bounded carved plate masks · directional bokashi ramps · shared pressure transfer · optical-density overprint · clipped keyblock",
  draw: drawColorWoodblock,
});
