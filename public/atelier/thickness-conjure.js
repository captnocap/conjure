import { cameraRays, prepareConjureRayGeometry } from './conjure-ray-geometry.js';

// Same medium as the Garden study: independent solid chords plus finite open
// sheets, four samples, then transmission averaging in filmThickness().
// Scene-relative optical units preserve useful exposure from macro to cosmic.
export function integrateConjureThickness(hits, meshes, scale, rayLength) {
  hits.sort((a, b) => a.mesh - b.mesh || a.distance - b.distance || a.triangle - b.triangle);
  const epsilon = Math.max(scale * 1e-8, 1e-12);
  let total = 0;
  for (let begin = 0; begin < hits.length;) {
    const mesh = meshes[hits[begin].mesh];
    let end = begin + 1;
    while (end < hits.length && hits[end].mesh === hits[begin].mesh) end++;
    const crossings = [];
    for (let at = begin; at < end;) {
      let next = at + 1, positive = hits[at].cosine > 0, negative = hits[at].cosine < 0;
      while (next < end && Math.abs(hits[next].distance - hits[at].distance) <= epsilon) {
        positive ||= hits[next].cosine > 0; negative ||= hits[next].cosine < 0; next++;
      }
      // Opposed coincident faces are a closed body's grazing/tangent event.
      if (!mesh.closed || !(positive && negative)) crossings.push(hits[at]);
      at = next;
    }
    if (mesh.closed) {
      // Integrate oriented closed-shell occupancy over the complete ray before
      // camera clipping. Disconnected overlapping shells in a merged mesh add;
      // an inward shell subtracts a cavity. Mirrored winding preserves depth.
      let winding = 0;
      for (let at = 0; at < crossings.length; at++) {
        winding += crossings[at].cosine < 0 ? 1 : -1;
        if (at + 1 < crossings.length)
          total += Math.abs(winding) * Math.max(0, Math.min(rayLength, crossings[at + 1].distance) - Math.max(0, crossings[at].distance)) / scale;
      }
      if (winding !== 0) throw new Error(`Thickness: non-manifold or inconsistent closed mesh ${mesh.id}`);
    } else {
      for (const hit of crossings) if (hit.distance >= 0 && hit.distance <= rayLength)
        total += 0.025 / Math.max(Math.abs(hit.cosine), 0.1);
    }
    begin = end;
  }
  return total;
}

export function prepareConjureThickness(snapshot) {
  const size = snapshot.size;
  if (!Number.isInteger(size) || size < 1 || size > 720) throw new Error('Thickness size must be an integer from 1 to 720');
  const scale = Number.isFinite(snapshot.worldScale) && snapshot.worldScale > 0 ? snapshot.worldScale : 1;
  const camera = cameraRays(snapshot), engine = prepareConjureRayGeometry(snapshot, { topology: true });
  const side = size * 2, total = new Float64Array(side * side);
  try {
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const ray = camera.at(2 * (x + 0.5) / side - 1, 1 - 2 * (y + 0.5) / side);
      const hits = engine.intersections(ray.origin, ray.direction);
      total[y * side + x] = integrateConjureThickness(hits, engine.meshes, scale, ray.length);
    }
    return { size, total, stats: { triangles: engine.triangleCount,
      closedMeshes: engine.meshes.filter(m => m.closed && !m.ground).length,
      sheetMeshes: engine.meshes.filter(m => !m.closed && !m.ground).length,
      worldScale: scale }, memory: { retainedBytes: total.byteLength, geometryArrayBytes: engine.explicitArrayBytes } };
  } finally { engine.dispose(); }
}
