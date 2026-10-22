import { sameDrawSurface } from "./clean-studies.js";

// Cut photographic paper, separately exposed and pasted on a black sheet.
// Nothing is resampled outside its visible owner. The source image is always the
// current scene radiance; all paper, emulsion and knife fields are generated here.
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
function random(seed, x, y, channel = 0) {
  let z =
    Math.imul((x | 0) + seed * 31, 374761393) ^
    Math.imul((y | 0) + channel * 101, 668265263);
  z = Math.imul(z ^ (z >>> 13), 1274126177);
  return ((z ^ (z >>> 16)) >>> 0) / 4294967295;
}
function field(seed, x, y, scale, channel) {
  x /= scale;
  y /= scale;
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = smooth(x - ix),
    v = smooth(y - iy);
  return mix(
    mix(random(seed, ix, iy, channel), random(seed, ix + 1, iy, channel), u),
    mix(
      random(seed, ix, iy + 1, channel),
      random(seed, ix + 1, iy + 1, channel),
      u,
    ),
    v,
  );
}
function quantile(hist, count, t) {
  let accumulated = 0;
  for (let i = 0; i < 256; i++) {
    accumulated += hist[i];
    if (accumulated >= count * t) return i / 255;
  }
  return 1;
}

export function cutPrintSettings(strength, w = 720) {
  strength = Number.isFinite(strength) ? strength : 0.6;
  const strength01 = clamp((clamp(strength, 0.15, 0.95) - 0.15) / 0.8);
  return {
    strength: strength01,
    // Stronger processing selects narrower exposure windows and cuts more of
    // each silhouette away. It is not opacity blending with a source image.
    contrast: 7 + strength01 * 15,
    trim: ((0.6 + strength01 * 6.4) * w) / 720,
    grain: (1.05 + strength01 * 1.65) * Math.max(0.45, w / 720),
    edgeWidth: Math.max(1, Math.round(((0.65 + strength01 * 0.9) * w) / 720)),
  };
}

export function prepareCutPrint(f) {
  const w = f.w,
    n = w * w,
    settings = cutPrintSettings(f.intensity, w),
    seed = f.seed;
  const owner = new Uint16Array(n),
    material = new Uint16Array(n),
    radiance = new Float32Array(n);
  const nx = new Float32Array(n),
    ny = new Float32Array(n),
    nz = new Float32Array(n);
  const viewDepth = new Float32Array(n),
    pixelScale = f.pixelWorldSize || 8.2 / w;
  const materialKeys = new Map();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      owner[i] = f.ID(x, y);
      radiance[i] = clamp(f.L(x, y));
      if (owner[i] <= 1) continue;
      viewDepth[i] = f.distance(x, y);
      const key = f.materialKey ? f.materialKey(x, y) : `owner:${owner[i]}`;
      if (!materialKeys.has(key)) materialKeys.set(key, materialKeys.size + 1);
      material[i] = materialKeys.get(key);
      let a = f.N(x, y, 0) * 2 - 1,
        b = f.N(x, y, 1) * 2 - 1,
        c = f.N(x, y, 2) * 2 - 1;
      const length = Math.hypot(a, b, c) || 1;
      nx[i] = a / length;
      ny[i] = b / length;
      nz[i] = c / length;
    }
  const region = new Uint32Array(n),
    queue = new Uint32Array(n),
    regions = [null];
  const connected = (a, b) => {
    if (owner[b] <= 1 || material[a] !== material[b]) return false;
    if (owner[a] !== owner[b])
      return sameDrawSurface(
        f,
        a % w,
        Math.floor(a / w),
        b % w,
        Math.floor(b / w),
      );
    // A sharp fold separates printable photographic facets; gradual curvature
    // remains a single continuous photograph. IDs alone cannot join materials.
    if (nx[a] * nx[b] + ny[a] * ny[b] + nz[a] * nz[b] <= 0.78) return false;
    // One mesh can occlude itself. Equal owner and normal do not make a depth
    // discontinuity continuous paper. Remove the expected local plane slope
    // before comparing depth, so slanted and gently curved surfaces stay whole.
    const dx = (b % w) - (a % w),
      dy = Math.floor(b / w) - Math.floor(a / w);
    const ax = (nx[a] + nx[b]) * 0.5,
      ay = (ny[a] + ny[b]) * 0.5,
      az = (nz[a] + nz[b]) * 0.5;
    const delta = viewDepth[b] - viewDepth[a];
    if (Math.abs(az) < 0.12) return Math.abs(delta) < pixelScale * 6 + 0.007;
    const expected = ((ax * dx - ay * dy) * pixelScale) / az;
    return (
      Math.abs(delta - expected) < 0.007 + (pixelScale * 0.65) / Math.abs(az)
    );
  };
  for (let origin = 0; origin < n; origin++) {
    if (owner[origin] <= 1 || region[origin]) continue;
    const id = regions.length,
      x0 = origin % w,
      y0 = Math.floor(origin / w);
    const r = {
      id,
      origin,
      owner: owner[origin],
      material: material[origin],
      count: 0,
      minX: x0,
      maxX: x0,
      minY: y0,
      maxY: y0,
      hist: new Uint32Array(256),
      sum: 0,
    };
    let head = 0,
      tail = 1;
    queue[0] = origin;
    region[origin] = id;
    while (head < tail) {
      const i = queue[head++],
        x = i % w,
        y = Math.floor(i / w);
      r.count++;
      r.minX = Math.min(r.minX, x);
      r.maxX = Math.max(r.maxX, x);
      r.minY = Math.min(r.minY, y);
      r.maxY = Math.max(r.maxY, y);
      r.hist[Math.round(radiance[i] * 255)]++;
      r.sum += radiance[i];
      const visit = (j) => {
        if (!region[j] && connected(i, j)) {
          region[j] = id;
          queue[tail++] = j;
        }
      };
      if (x) visit(i - 1);
      if (x + 1 < w) visit(i + 1);
      if (y) visit(i - w);
      if (y + 1 < w) visit(i + w);
    }
    r.low = quantile(r.hist, r.count, 0.08);
    r.high = quantile(r.hist, r.count, 0.92);
    r.mean = r.sum / r.count;
    delete r.hist;
    delete r.sum;
    r.key = (Math.imul(r.owner + 1, 2971) ^ Math.imul(origin + 1, 1297)) >>> 0;
    const width = r.maxX - r.minX + 1,
      height = r.maxY - r.minY + 1;
    r.support = width > w * 0.55 && (r.minY + r.maxY) / 2 > w * 0.58;
    r.exposure =
      (random(seed, r.key, 1, 711) - 0.5) * (0.2 + settings.strength * 0.3) +
      (r.support ? -0.5 : 0.08);
    r.detail = 0.2 + random(seed, r.key, 1, 712) * 0.8;
    r.focusX = mix(r.minX, r.maxX, 0.2 + random(seed, r.key, 1, 713) * 0.6);
    r.focusY = mix(r.minY, r.maxY, 0.2 + random(seed, r.key, 1, 714) * 0.6);
    r.focusRX = Math.max(2, width * (0.2 + random(seed, r.key, 1, 715) * 0.4));
    r.focusRY = Math.max(
      2,
      height * (0.22 + random(seed, r.key, 1, 716) * 0.4),
    );
    r.cuts = [];
    // Knife planes are found from the actual fragment, not a bounding rectangle.
    // Their intersection only subtracts the visible silhouette; no displaced copy.
    for (let cut = 0; cut < 3; cut++) {
      const angle = random(seed, r.key, cut, 717) * Math.PI * 2;
      const cx = Math.cos(angle),
        cy = Math.sin(angle);
      let maximum = -Infinity,
        minimum = Infinity;
      for (let k = 0; k < tail; k++) {
        const i = queue[k],
          projection = (i % w) * cx + Math.floor(i / w) * cy;
        maximum = Math.max(maximum, projection);
        minimum = Math.min(minimum, projection);
      }
      const trim = Math.min(
        settings.trim * (0.25 + random(seed, r.key, cut, 718)),
        (maximum - minimum) * 0.06,
        Math.sqrt(r.count) * 0.045,
      );
      r.cuts.push({ x: cx, y: cy, boundary: maximum - trim });
    }
    regions.push(r);
  }
  const cutMask = new Uint8Array(n),
    print = new Float32Array(n),
    exposure = new Float32Array(n);
  const detail = new Float32Array(n),
    edge = new Uint8Array(n),
    grain = new Float32Array(n);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        r = regions[region[i]];
      if (!r) continue;
      if (r.count < 18 || r.cuts.every((c) => x * c.x + y * c.y <= c.boundary))
        cutMask[i] = 1;
      if (!cutMask[i]) continue;
      const focus = Math.exp(
        -(
          ((x - r.focusX) / r.focusRX) ** 2 +
          ((y - r.focusY) / r.focusRY) ** 2
        ) * 1.5,
      );
      const patch = field(
        seed,
        x + (r.key % 177),
        y,
        Math.max(3, w * 0.056),
        719,
      );
      const localDetail = clamp(r.detail * 0.3 + focus * 0.65 + patch * 0.35);
      detail[i] = localDetail;
      // Variable source resolution is photographic detail loss, locked to this
      // fragment. A neighboring bright owner can never become a white smear.
      const radius = Math.round(((1 - localDetail) * 2.5 * w) / 720);
      let source = radiance[i],
        weight = 1;
      if (radius)
        for (const [dx, dy] of [
          [-radius, 0],
          [radius, 0],
          [0, -radius],
          [0, radius],
        ]) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= w) continue;
          const j = yy * w + xx;
          if (region[j] === region[i]) {
            source += radiance[j];
            weight++;
          }
        }
      source /= weight;
      // A separate contact exposure for each cut print. Local dodging has an
      // elliptical footprint and moves the characteristic curve, not final opacity.
      const localExposure =
        r.exposure + (focus - 0.32) * (0.1 + settings.strength * 0.2);
      exposure[i] = localExposure;
      const relative = clamp((source - r.low) / Math.max(0.15, r.high - r.low));
      const negative = source * 0.55 + relative * 0.45;
      // Grain size belongs to the physical print, so spatial detail modulation
      // changes its density rather than warping its sample coordinates.
      const crystalScale = settings.grain * (0.7 + (1 - r.detail) * 1.9);
      const clump =
        (field(seed, x, y, crystalScale, (r.key % 1009) + 720) - 0.5) * 1.8;
      const fine = random(seed, x, y, (r.key % 991) + 721) - 0.5;
      const amplitude = (0.035 + localDetail * 0.28) * (0.48 + patch * 0.8);
      grain[i] = amplitude * (clump * 0.72 + fine * 0.28);
      const logExposure = negative + localExposure + grain[i] - 0.48;
      // Finite continuous silver-paper response: gray detail between clipped
      // blacks/whites survives. This is neither ordered dithering nor one bit.
      print[i] = smooth(
        (1 / (1 + Math.exp(-logExposure * settings.contrast)) - 0.07) / 0.86,
      );
    }
  const width = settings.edgeWidth;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!cutMask[i]) continue;
      const r = regions[region[i]];
      // Reveal a short paper lip only on two knife-facing sides. It lives inside
      // the cut piece and never paints over an occluding owner or joins holes.
      let cutEdge = false;
      for (const [dx, dy] of [
        [-width, 0],
        [0, -width],
      ]) {
        const xx = x + dx,
          yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= w) {
          cutEdge = true;
          continue;
        }
        const j = yy * w + xx;
        if (region[j] !== region[i] || !cutMask[j]) cutEdge = true;
      }
      if (
        cutEdge &&
        field(seed, x, y, Math.max(2, w / 55), (r.key % 991) + 722) > 0.49
      )
        edge[i] = 1;
    }
  return {
    w,
    settings,
    owner,
    material,
    materialKeys: [...materialKeys.keys()],
    radiance,
    viewDepth,
    region,
    regions,
    cutMask,
    exposure,
    detail,
    grain,
    print,
    edge,
    work: {
      pixels: n,
      regions: regions.length - 1,
      maxFloodQueue: n,
      knifePlanes: 3,
    },
  };
}

export function getCutPrint(f) {
  const strength = Number.isFinite(f.intensity)
    ? clamp(f.intensity, 0.15, 0.95)
    : 0.6;
  const key = `cut-print:v1:${strength}`;
  return f.prepare
    ? f.prepare(key, () => prepareCutPrint(f))
    : prepareCutPrint(f);
}

export function drawCutPrint(p, f) {
  const d = getCutPrint(f),
    w = f.w;
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4;
      let value = 0;
      if (d.cutMask[i])
        value = d.edge[i] ? Math.max(d.print[i], 0.74) : d.print[i];
      else if (d.owner[i] <= 1) {
        // Dust on the mounting sheet is sparse, and cannot create subject shapes.
        const dust = random(f.seed, x, y, 727);
        if (dust > 0.99935) value = 0.28 + random(f.seed, x, y, 728) * 0.67;
      }
      const neutral = 5 + value * 244;
      p.pixels[at] = neutral;
      p.pixels[at + 1] = neutral;
      p.pixels[at + 2] = neutral;
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
}
