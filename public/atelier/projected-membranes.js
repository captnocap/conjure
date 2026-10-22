// Dependency-free snapshot API for Atelier geometrySnapshot version 1.
// Full projected triangle unions are computed independently of owner/depth maps.
// Deliberately restricted to the fixed orthographic reference scene. Reject a
// cropped domain instead of silently letting the viewport become a physical rim.
const matrixOK = (m) =>
  m?.length === 16 && Array.from(m).every(Number.isFinite);
const multiply = (a, b) => {
  const c = new Float64Array(16);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        c[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return c;
};
export function projectMembraneMasks(
  snapshot,
  resolution = 128,
  { excludeIds = [1] } = {},
) {
  if (
    snapshot?.version !== 1 ||
    !Array.isArray(snapshot.meshes) ||
    !matrixOK(snapshot.view) ||
    !matrixOK(snapshot.projection) ||
    !Number.isInteger(resolution) ||
    resolution < 2 ||
    resolution > 128
  )
    throw Error("Invalid projected membrane snapshot");
  const n = resolution,
    projection = snapshot.projection,
    exclude = new Set(excludeIds),
    vp = multiply(projection, snapshot.view),
    result = [];
  if (
    Math.abs(projection[3]) +
      Math.abs(projection[7]) +
      Math.abs(projection[11]) >
      1e-12 ||
    Math.abs(projection[15] - 1) > 1e-12
  )
    throw Error("Projected membranes require an orthographic camera");
  for (let j = 0; j < snapshot.meshes.length; j++) {
    const id = j + 1;
    if (exclude.has(id)) continue;
    const mesh = snapshot.meshes[j],
      source = mesh.position,
      index = mesh.index;
    if (!matrixOK(mesh.matrix) || !source || source.length % 3)
      throw Error("Invalid projected membrane mesh");
    const matrix = multiply(vp, mesh.matrix),
      points = new Float64Array((source.length / 3) * 2),
      mask = new Uint8Array(n * n);
    for (let i = 0; i < source.length; i += 3) {
      const x = source[i],
        y = source[i + 1],
        z = source[i + 2];
      if (!Number.isFinite(x + y + z)) throw Error("Invalid vertex");
      const sx =
          ((matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12] + 1) *
            n) /
          2,
        sy =
          ((1 - (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13])) *
            n) /
          2;
      points[(i / 3) * 2] = sx;
      points[(i / 3) * 2 + 1] = sy;
    }
    const total = index?.length ?? source.length / 3,
      start = Math.max(0, mesh.drawRange?.start ?? 0),
      end = Math.min(total, start + (mesh.drawRange?.count ?? Infinity));
    if (
      !Number.isInteger(start) ||
      start % 3 ||
      (!Number.isInteger(end) && end !== Infinity)
    )
      throw Error("Invalid triangle draw range");
    for (let k = start; k + 2 < end; k += 3) {
      const ai = (index ? index[k] : k) * 2,
        bi = (index ? index[k + 1] : k + 1) * 2,
        ci = (index ? index[k + 2] : k + 2) * 2;
      if (
        ![ai, bi, ci].every(
          (i) => Number.isInteger(i) && i >= 0 && i + 1 < points.length,
        )
      )
        throw Error("Invalid triangle index");
      const ax = points[ai],
        ay = points[ai + 1],
        bx = points[bi],
        by = points[bi + 1],
        cx = points[ci],
        cy = points[ci + 1];
      if (
        Math.min(ax, bx, cx, ay, by, cy) < -1e-8 ||
        Math.max(ax, bx, cx, ay, by, cy) > n + 1e-8
      )
        throw Error(
          "A foreground projected membrane extends outside the viewport",
        );
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-12) continue;
      const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)),
        x1 = Math.min(n - 1, Math.floor(Math.max(ax, bx, cx) - 0.5)),
        y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)),
        y1 = Math.min(n - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5,
            py = y + 0.5,
            u = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area,
            v = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
          if (u >= -1e-10 && v >= -1e-10 && u + v <= 1 + 1e-10)
            mask[y * n + x] = 1;
        }
    }
    result.push({ id, resolution: n, mask });
  }
  return result;
}
