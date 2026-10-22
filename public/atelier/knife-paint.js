/** Experimental image-medium process, deliberately not a material or registered study.
 * Two pigment/height strata survive deposition. A flat blade removes their mass in
 * top-to-bottom order; a bounded fraction may be pushed into a same-owner edge lip.
 * Screen-space paint, not physical 3-D rheology. No geometry or capture mutation.
 */
import { sameDrawSurface } from "./clean-studies.js";
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, k) => v * (1 - t) + b[k] * t);
const palettes = [
  [70, 82, 72],
  [155, 136, 92],
  [179, 185, 173],
  [81, 99, 105],
  [107, 100, 74],
];

/** One owner can still self-occlude. Check local depth continuity as well as ID. */
export function sameKnifeSurface(f, x, y, u, v, a, b) {
  if (a !== b) return sameDrawSurface(f, x, y, u, v);
  if (f.materialKey && f.materialKey(x, y) !== f.materialKey(u, v))
    return false;
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
  if (ax * bx + ay * by + az * bz < 0.85) return false;
  const nx = (ax + bx) / 2,
    ny = (ay + by) / 2,
    nz = (az + bz) / 2,
    scale = f.pixelWorldSize || 8.2 / f.w,
    delta = f.distance(u, v) - f.distance(x, y);
  // A grazing normal has an unstable depth slope. Keep its local bound small;
  // never use an unbounded division as permission to cross an occlusion.
  if (Math.abs(nz) < 0.08) return Math.abs(delta) < scale * 1.5;
  const expected = ((nx * (u - x) - ny * (v - y)) * scale) / nz;
  return (
    Math.abs(delta - expected) <
    0.0015 + (scale * 0.28) / Math.max(0.15, Math.abs(nz))
  );
}

export function knifeOwners(f) {
  const n = f.w * f.w,
    ids = new Uint16Array(n),
    labels = new Uint32Array(n),
    queue = new Uint32Array(n);
  for (let i = 0; i < n; i++) ids[i] = f.ID(i % f.w, Math.floor(i / f.w));
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (ids[i] <= 1 || labels[i]) continue;
    const label = ++count;
    let head = 0,
      tail = 1;
    queue[0] = i;
    labels[i] = label;
    while (head < tail) {
      const at = queue[head++],
        x = at % f.w;
      for (const j of [
        x ? at - 1 : -1,
        x + 1 < f.w ? at + 1 : -1,
        at - f.w,
        at + f.w,
      ]) {
        if (
          j >= 0 &&
          j < n &&
          !labels[j] &&
          ids[j] > 1 &&
          sameKnifeSurface(
            f,
            x,
            Math.floor(at / f.w),
            j % f.w,
            Math.floor(j / f.w),
            ids[at],
            ids[j],
          )
        ) {
          labels[j] = label;
          queue[tail++] = j;
        }
      }
    }
  }
  return { ids, labels, count };
}

export function createKnifeLayers(f) {
  if (!Number.isInteger(f.w) || f.w < 1 || f.w > 720)
    throw RangeError(
      "Knife prototype supports integer captures from 1 through 720 pixels",
    );
  const n = f.w * f.w,
    owners = knifeOwners(f),
    layers = {
      w: f.w,
      ...owners,
      lowerHeight: new Float32Array(n),
      upperHeight: new Float32Array(n),
      lowerPigment: new Float32Array(n * 3),
      upperPigment: new Float32Array(n * 3),
    };
  for (let i = 0; i < n; i++) {
    if (!layers.labels[i]) continue;
    const material = f.B(i % f.w, Math.floor(i / f.w));
    // A mineral underpainting retains the chosen material pigment but is not
    // light-baked: changing key direction never changes deposit color or load.
    const pigment = mix(material, palettes[0], 0.57);
    layers.lowerHeight[i] = 0.18;
    for (let k = 0; k < 3; k++) layers.lowerPigment[i * 3 + k] = pigment[k];
  }
  return layers;
}

function addPaint(height, pigment, i, amount, color) {
  if (!(amount > 0)) return;
  const before = height[i],
    after = before + amount;
  for (let k = 0; k < 3; k++)
    pigment[i * 3 + k] =
      (pigment[i * 3 + k] * before + color[k] * amount) / after;
  height[i] = after;
}

/** A flat tool has finite width and angular, fractured edges, not an ellipse. */
export function visitKnifeFootprint(field, mark, visit) {
  const { w, labels } = field,
    { x, y, halfLength: a, halfWidth: b, angle, label, phase = 0 } = mark;
  if (!label) return;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    bx = Math.abs(c * a) + Math.abs(s * b) + 2,
    by = Math.abs(s * a) + Math.abs(c * b) + 2;
  for (
    let py = Math.max(0, Math.floor(y - by));
    py <= Math.min(w - 1, Math.ceil(y + by));
    py++
  ) {
    for (
      let px = Math.max(0, Math.floor(x - bx));
      px <= Math.min(w - 1, Math.ceil(x + bx));
      px++
    ) {
      const i = py * w + px;
      if (labels[i] !== label) continue;
      const u = ((px - x) * c + (py - y) * s) / a,
        v = (-(px - x) * s + (py - y) * c) / b;
      const edge =
        0.91 +
        0.045 * Math.sin(u * 12 + phase) +
        0.04 * Math.sin(u * 29 + phase * 2);
      const end =
        0.92 +
        0.065 * Math.sin(v * 11 + phase) +
        0.045 * Math.sin(v * 27 - phase);
      if (Math.abs(u) > end || Math.abs(v) > edge) continue;
      visit(
        i,
        u,
        v,
        Math.min(1, (end - Math.abs(u)) * a, (edge - Math.abs(v)) * b),
      );
    }
  }
}

export function depositKnife(field, mark, layer = "upper") {
  const heights = field[layer + "Height"],
    pigment = field[layer + "Pigment"];
  let added = 0;
  visitKnifeFootprint(field, mark, (i, u, v, edge) => {
    // A blade tilts and leaves two lateral lips. Grooves are blade teeth carried
    // along the drag, with occasional skips; not added white lines in the image.
    const lip = Math.exp(-(((Math.abs(v) - 0.79) / 0.105) ** 2)) * 0.43;
    const tooth = 0.7 + 0.3 * Math.sin(v * 34 + mark.phase + u * 1.2) ** 2;
    const fracture =
      0.75 +
      0.25 * Math.min(1, Math.abs(Math.sin(u * 8 + v * 2 + mark.phase)) * 4);
    const amount =
      mark.load * edge * ((0.55 + 0.25 * u) * tooth * fracture + lip);
    addPaint(heights, pigment, i, amount, mark.pigment);
    added += amount;
  });
  return added;
}

function clearOwnerPath(field, from, to, label) {
  const x0 = from % field.w,
    y0 = Math.floor(from / field.w),
    x1 = to % field.w,
    y1 = Math.floor(to / field.w);
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  let px = x0,
    py = y0;
  for (let n = 1; n <= steps; n++) {
    const x = Math.round(x0 + ((x1 - x0) * n) / steps),
      y = Math.round(y0 + ((y1 - y0) * n) / steps);
    if (
      field.labels[y * field.w + x] !== label ||
      (x !== px &&
        y !== py &&
        (field.labels[py * field.w + x] !== label ||
          field.labels[y * field.w + px] !== label))
    )
      return false;
    px = x;
    py = y;
  }
  return true;
}

/** Mutating subtractive pass. No stroke can return more paint than it removed. */
export function scrapeKnife(
  field,
  mark,
  { pressure = 0.6, ridgeFraction = 0.28 } = {},
) {
  ridgeFraction = clamp(ridgeFraction, 0, 0.45);
  pressure = clamp(pressure);
  const ridge = new Map(),
    c = Math.cos(mark.angle),
    s = Math.sin(mark.angle);
  let removed = 0,
    moved = 0,
    exposed = 0;
  visitKnifeFootprint(field, mark, (i, u, v, edge) => {
    const beforeUpper = field.upperHeight[i];
    // The blade plane intersects the stacked height, exposing earlier pigment.
    // Teeth give broken cuts; pressure actually lowers the plane through strata.
    const teeth = mark.quiet
      ? 0.015
      : 0.025 + (0.075 * (1 + Math.sin(v * 29 + mark.phase))) / 2;
    const plane = Math.max(
      0.04,
      mark.plane * (1 - pressure * 0.96) + u * 0.065 + teeth,
    );
    const contact = mark.quiet
      ? 0.55 + 0.45 * pressure
      : 0.18 + 0.82 * pressure;
    let cut =
      Math.max(0, field.lowerHeight[i] + beforeUpper - plane) * edge * contact;
    const top = Math.min(beforeUpper, cut);
    cut -= top;
    const bottom = Math.min(Math.max(0, field.lowerHeight[i] - 0.04), cut),
      amount = top + bottom;
    if (!(amount > 0)) return;
    const rgb = [0, 1, 2].map(
      (k) =>
        (field.upperPigment[i * 3 + k] * top +
          field.lowerPigment[i * 3 + k] * bottom) /
        amount,
    );
    field.upperHeight[i] -= top;
    field.lowerHeight[i] -= bottom;
    removed += amount;
    if (beforeUpper > 0 && field.upperHeight[i] === 0) exposed++;
    if (!ridgeFraction) return;
    const side = v < 0 ? -1 : 1,
      offset = Math.min(
        7,
        Math.max(1, mark.halfWidth * (0.97 - Math.abs(v)) + 0.8),
      );
    const x = Math.round((i % field.w) - s * side * offset),
      y = Math.round(Math.floor(i / field.w) + c * side * offset);
    if (x < 0 || y < 0 || x >= field.w || y >= field.w) return;
    const j = y * field.w + x;
    if (
      j === i ||
      field.labels[j] !== mark.label ||
      !clearOwnerPath(field, i, j, mark.label)
    )
      return;
    const mass = amount * ridgeFraction * (mark.quiet ? 0.45 : 1),
      transfer = ridge.get(j) || [0, 0, 0, 0];
    transfer[0] += mass;
    for (let k = 0; k < 3; k++) transfer[k + 1] += rgb[k] * mass;
    ridge.set(j, transfer);
    moved += mass;
  });
  // Commit after cutting. A lip cannot become a donor again in this same pass.
  for (const [i, transfer] of ridge)
    addPaint(
      field.upperHeight,
      field.upperPigment,
      i,
      transfer[0],
      transfer.slice(1).map((v) => v / transfer[0]),
    );
  return {
    removed,
    moved,
    discarded: removed - moved,
    exposed,
    transferredCells: ridge.size,
  };
}

function markAt(f, field, x, y, pass, key) {
  const scale = f.w / 720,
    px = clamp(Math.round(x), 0, f.w - 1),
    py = clamp(Math.round(y), 0, f.w - 1),
    label = field.labels[py * f.w + px];
  if (!label) return null;
  const nAngle = Math.atan2(f.N(px, py, 0) - 0.5, f.N(px, py, 1) - 0.5);
  const angle =
    -0.62 +
    nAngle * 0.25 +
    (f.rnd(key, pass, 716) - 0.5) * 0.95 +
    (pass === 2 ? 0.75 : 0);
  const material = f.B(px, py),
    swatch = palettes[Math.floor(f.rnd(key, pass, 719) * palettes.length)],
    quiet = pass === 2 && f.rnd(key, pass, 726) < 0.2;
  return {
    x,
    y,
    label,
    angle,
    quiet,
    halfLength: Math.max(
      1.1,
      (pass === 0 ? 45 : pass === 1 ? 30 : 43) *
        scale *
        (0.6 + f.rnd(key, pass, 717) * 0.85),
    ),
    halfWidth: Math.max(
      0.8,
      (pass === 0 ? 14 : pass === 1 ? 8.5 : quiet ? 13 : 5.2) *
        scale *
        (0.7 + f.rnd(key, pass, 718) * 0.65),
    ),
    load: (pass ? 0.65 : 0.45) * (0.5 + f.rnd(key, pass, 721)),
    phase: f.rnd(key, pass, 722) * Math.PI * 2,
    pigment: mix(material, swatch, pass ? 0.64 : 0.52),
    plane: 0.36 + 0.44 * f.rnd(key, pass, 723),
  };
}

export function buildKnifePlan(f) {
  const field = createKnifeLayers(f),
    marks = [[], [], []];
  let key = 0;
  for (let pass = 0; pass < 3; pass++) {
    const step = Math.max(
      2,
      ((pass === 0 ? 27 : pass === 1 ? 17 : 19) * f.w) / 720,
    );
    for (let y = step / 2; y < f.w; y += step)
      for (let x = step / 2; x < f.w; x += step) {
        const mark = markAt(
          f,
          field,
          x + (f.rnd(key, pass, 724) - 0.5) * step * 0.8,
          y + (f.rnd(key, pass, 725) - 0.5) * step * 0.8,
          pass,
          key++,
        );
        if (mark) marks[pass].push(mark);
      }
  }
  for (const mark of marks[0]) depositKnife(field, mark, "lower");
  for (const mark of marks[1]) depositKnife(field, mark, "upper");
  // A few final, wider clean-blade sweeps leave quiet scraped planes between
  // the narrow fractured ridges, instead of uniformly shredding every patch.
  marks[2].sort((a, b) => Number(a.quiet) - Number(b.quiet));
  return { field, marks };
}

export function processKnifePlan(
  plan,
  strength,
  { ridgeFraction = 0.28, subtract = true } = {},
) {
  const field = { ...plan.field };
  for (const key of [
    "lowerHeight",
    "upperHeight",
    "lowerPigment",
    "upperPigment",
  ])
    field[key] = plan.field[key].slice();
  const pressure = clamp(strength),
    stats = {
      removed: 0,
      moved: 0,
      discarded: 0,
      exposed: 0,
      transferredCells: 0,
      passes: 0,
    };
  if (subtract)
    for (const mark of plan.marks[2]) {
      const result = scrapeKnife(field, mark, { pressure, ridgeFraction });
      for (const key of Object.keys(result)) stats[key] += result[key];
      stats.passes++;
    }
  return { ...field, stats };
}

export function visibleKnifePigment(field, i, out = [0, 0, 0]) {
  const coverage = clamp(field.upperHeight[i] / 0.075);
  for (let k = 0; k < 3; k++)
    out[k] =
      field.lowerPigment[i * 3 + k] * (1 - coverage) +
      field.upperPigment[i * 3 + k] * coverage;
  return out;
}

export function shadeKnifeLayers(p, f, field, { relief = 1 } = {}) {
  const w = f.w,
    rgb = [0, 0, 0],
    light = f.reliefLight,
    ll = Math.hypot(...light) || 1,
    [lx, ly, lz] = light.map((v) => v / ll),
    hl = Math.hypot(lx, ly, lz + 1) || 1,
    hx = lx / hl,
    hy = ly / hl,
    hz = (lz + 1) / hl;
  const height = (i) => field.lowerHeight[i] + field.upperHeight[i];
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4,
        label = field.labels[i];
      if (!label) {
        const source = f.C(x, y);
        for (let k = 0; k < 3; k++)
          p.pixels[at + k] = source[k] * 0.43 + [129, 126, 108][k] * 0.57;
      } else {
        const center = height(i),
          same = (j) =>
            j >= 0 && j < w * w && field.labels[j] === label
              ? height(j)
              : center;
        const dx =
            ((x ? same(i - 1) : center) - (x + 1 < w ? same(i + 1) : center)) *
            1.25 *
            relief,
          dy = (same(i - w) - same(i + w)) * 1.25 * relief;
        // Captured geometric Y is view-up; the shared light and pixel heights
        // use image-down coordinates. Convert before combining the two normals.
        let nx = (f.N(x, y, 0) * 2 - 1) * 0.52 + dx,
          ny = (1 - f.N(x, y, 1) * 2) * 0.52 + dy,
          nz = Math.max(0.25, f.N(x, y, 2) * 2 - 1),
          nl = Math.hypot(nx, ny, nz);
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz),
          sheen = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 22) * 9,
          gain = 0.52 + 0.67 * diffuse;
        visibleKnifePigment(field, i, rgb);
        for (let k = 0; k < 3; k++)
          p.pixels[at + k] = clamp(rgb[k] * gain + sheen, 0, 255);
      }
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
}

export function drawKnifePaint(p, f) {
  const plan = f.prepare("knife-paint-plan-v1", () => buildKnifePlan(f));
  const pressure = Math.round(clamp(f.intensity) * 1000) / 1000;
  const field = f.prepare("knife-paint-process-v1:" + pressure, () =>
    processKnifePlan(plan, pressure),
  );
  shadeKnifeLayers(p, f, field);
}
