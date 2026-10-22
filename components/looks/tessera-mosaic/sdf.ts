/**
 * Exact Euclidean distance transform (Felzenszwalb and Huttenlocher), copied from the forge kit's
 * sdf.ts so this look stays self-contained.
 */

const FAR = 1e20;

/** One-dimensional squared distance transform, keeping the nearest site. */
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
 * Distance from every pixel to the nearest pixel where `site` is true, and the index of that
 * nearest site. Distances are in pixels.
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
