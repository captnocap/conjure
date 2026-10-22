import type { TracedImage } from './svg';

/**
 * Traced paths baked into a signed distance field, the way reactjit bakes its icon atlas: rasterise
 * once, then let bilinear filtering of the distance draw a crisp edge at any size with a single
 * alpha test at 0.5. The paths stay the recipe; this is computed when a trace is built.
 *
 * Everything here is plain arithmetic, so a bake is identical in every browser and in Node.
 */

export type Ring = [number, number][];

/** Parse the tracer's path data (absolute M, L, Q and Z) into closed rings, flattening curves. */
export function parsePath(d: string, curveSteps = 6): Ring[] {
  const tokens = d.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const rings: Ring[] = [];
  let ring: Ring = [];
  let x = 0, y = 0, command = '', at = 0;
  const number = () => Number(tokens[at++]);
  const close = () => { if (ring.length > 2) rings.push(ring); ring = []; };
  while (at < tokens.length) {
    const token = tokens[at];
    if (/[A-Za-z]/.test(token)) { command = token.toUpperCase(); at++; if (command === 'Z') { close(); continue; } }
    if (command === 'M') { close(); x = number(); y = number(); ring.push([x, y]); command = 'L'; }
    else if (command === 'L') { x = number(); y = number(); ring.push([x, y]); }
    else if (command === 'Q') {
      const cx = number(), cy = number(), ex = number(), ey = number();
      for (let step = 1; step <= curveSteps; step++) {
        const t = step / curveSteps, u = 1 - t;
        ring.push([u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey]);
      }
      x = ex; y = ey;
    } else if (command === 'C') {
      const c1x = number(), c1y = number(), c2x = number(), c2y = number(), ex = number(), ey = number();
      for (let step = 1; step <= curveSteps; step++) {
        const t = step / curveSteps, u = 1 - t;
        ring.push([u ** 3 * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * ex, u ** 3 * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ey]);
      }
      x = ex; y = ey;
    } else at++;
  }
  close();
  return rings.filter((candidate) => candidate.every(([px, py]) => Number.isFinite(px) && Number.isFinite(py)));
}

/** Fill rings into a width × height mask with the even-odd rule, sampling pixel centres. */
export function rasterize(rings: readonly Ring[], width: number, height: number, transform: (x: number, y: number) => [number, number], into = new Uint8Array(width * height)): Uint8Array {
  const edges: [number, number, number, number][] = [];
  for (const ring of rings) {
    const points = ring.map(([px, py]) => transform(px, py));
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
      if (y0 !== y1) edges.push([x0, y0, x1, y1]);
    }
  }
  const crossings: number[] = [];
  for (let row = 0; row < height; row++) {
    const yc = row + 0.5;
    crossings.length = 0;
    for (const [x0, y0, x1, y1] of edges) if ((y0 <= yc && yc < y1) || (y1 <= yc && yc < y0)) crossings.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const start = Math.max(0, Math.ceil(crossings[i] - 0.5)), end = Math.min(width - 1, Math.floor(crossings[i + 1] - 0.5));
      for (let col = start; col <= end; col++) into[row * width + col] = 1;
    }
  }
  return into;
}

const FAR = 1e20;

/** One-dimensional squared distance transform (Felzenszwalb and Huttenlocher), keeping the nearest site. */
function transform1d(f: Float64Array, n: number, d: Float64Array, nearest: Int32Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0; z[0] = -FAR; z[1] = FAR;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = FAR;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
    nearest[q] = v[k];
  }
}

/**
 * Exact Euclidean distance from every pixel to the nearest pixel where `site` is true, and the
 * index of that nearest site. Distances are in pixels.
 */
export function distanceTransform(site: (index: number) => boolean, width: number, height: number) {
  const n = Math.max(width, height);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const nearest = new Int32Array(n), v = new Int32Array(n);
  const columns = new Float64Array(width * height), nearestRow = new Int32Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = site(y * width + x) ? 0 : FAR;
    transform1d(f, height, d, nearest, v, z);
    for (let y = 0; y < height; y++) { columns[y * width + x] = d[y]; nearestRow[y * width + x] = nearest[y]; }
  }
  const distance = new Float32Array(width * height), from = new Int32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = columns[y * width + x];
    transform1d(f, width, d, nearest, v, z);
    for (let x = 0; x < width; x++) {
      const nx = nearest[x];
      distance[y * width + x] = Math.sqrt(d[x]);
      from[y * width + x] = nearestRow[y * width + nx] * width + nx;
    }
  }
  return { distance, from };
}

export interface TraceBake {
  width: number;
  height: number;
  /** RGBA rows top to bottom: colour in RGB, signed distance in A with the edge at 128. */
  data: Uint8ClampedArray;
  /** Inside distance to the edge, 0 at the edge … 1 at the deepest point, for relief. */
  depth: Float32Array;
  /** Pixels of distance that A spans either side of the edge. */
  spread: number;
  /** The picture's own size, for the thing's aspect: the cropped region in traced pixels. */
  sourceWidth: number;
  sourceHeight: number;
}

export interface BakeOptions {
  /** The longer side of the bake in pixels. */
  resolution?: number;
  /** Keep the colours the tracer took for background. */
  keepBackground?: boolean;
  /** A band of this many bake pixels around the outline, in `borderColor`. */
  border?: number;
  borderColor?: string;
  /** Pixels of distance either side of the edge that A can express. */
  spread?: number;
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0) as [number, number, number];

/** Bake a traced picture into a colour + signed distance texture, cropped to what is kept. */
export function bakeTrace(image: TracedImage, options: BakeOptions = {}): TraceBake {
  const resolution = Math.max(32, Math.min(2048, Math.round(options.resolution ?? 512)));
  const spread = Math.max(2, options.spread ?? 10);
  const border = Math.max(0, Math.round(options.border ?? 0));
  const kept = image.shapes.filter((shape) => options.keepBackground || !shape.background);
  const parsed = kept.map((shape) => ({ shape, rings: parsePath(shape.d) }));
  // Crop to the kept shapes, so a subject without its background stands on its own outline.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { rings } of parsed) for (const ring of rings) for (const [x, y] of ring) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = image.width; y1 = image.height; }
  const sourceWidth = Math.max(1, x1 - x0), sourceHeight = Math.max(1, y1 - y0);
  const pad = spread + border + 2;
  const scale = (resolution - pad * 2) / Math.max(sourceWidth, sourceHeight);
  const width = Math.ceil(sourceWidth * scale + pad * 2), height = Math.ceil(sourceHeight * scale + pad * 2);
  const place = (x: number, y: number): [number, number] => [(x - x0) * scale + pad, (y - y0) * scale + pad];
  // Paint colours in the tracer's order, later layers over earlier ones.
  const colour = new Uint8ClampedArray(width * height * 3);
  const inside = new Uint8Array(width * height);
  const mask = new Uint8Array(width * height);
  for (const { shape, rings } of parsed) {
    mask.fill(0);
    rasterize(rings, width, height, place, mask);
    const [r, g, b] = rgb(shape.fill);
    for (let i = 0; i < mask.length; i++) if (mask[i]) { inside[i] = 1; colour[i * 3] = r; colour[i * 3 + 1] = g; colour[i * 3 + 2] = b; }
  }
  const outward = distanceTransform((i) => inside[i] === 1, width, height);
  const inward = distanceTransform((i) => inside[i] === 0, width, height);
  const band = rgb(options.borderColor ?? '#f6f3ec');
  const data = new Uint8ClampedArray(width * height * 4);
  const depth = new Float32Array(width * height);
  let deepest = 1;
  for (let i = 0; i < inward.distance.length; i++) if (inside[i]) deepest = Math.max(deepest, inward.distance[i]);
  for (let i = 0; i < width * height; i++) {
    // Positive inside, negative outside; the border moves the edge outward by its width.
    const signed = (inside[i] ? inward.distance[i] - 0.5 : -(outward.distance[i] - 0.5)) + border;
    data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, 0.5 + signed / (2 * spread))) * 255);
    if (inside[i]) {
      data[i * 4] = colour[i * 3]; data[i * 4 + 1] = colour[i * 3 + 1]; data[i * 4 + 2] = colour[i * 3 + 2];
      depth[i] = inward.distance[i] / deepest;
    } else {
      // Outside the outline: the border colour within the band, else the nearest inside colour so filtering never darkens the edge.
      const source = outward.from[i];
      const [r, g, b] = border > 0 ? band : [colour[source * 3], colour[source * 3 + 1], colour[source * 3 + 2]];
      data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b;
    }
  }
  return { width, height, data, depth, spread, sourceWidth, sourceHeight };
}
