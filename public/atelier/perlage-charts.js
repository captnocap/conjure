import { BufferAttribute, BufferGeometry } from './vendor/three.module.min.js';

// Render-only charts. Never attach these attributes to the source/baked owner.
// CPU decisions precede float32 varying interpolation; derivatives alone cannot
// reliably recognize a mathematically rank-one chart after rasterization.
export const CHART_RELATIVE_AREA_EPSILON = 1e-6;
const standaloneCaches = new WeakMap();
const finite = Number.isFinite;
const attrStamp = (a, versioned = true) => a && [a, a.array, versioned ? a.version : null, a.count, a.itemSize, a.normalized, a.data, versioned ? a.data?.version : null];
const stamp = (source, render, copied = false) => [source.type, ...attrStamp(source.getAttribute('uv')) || [],
  render.index, ...attrStamp(render.index) || [], render.groups, render.drawRange,
  render.boundingBox, render.boundingSphere, render.morphAttributes, render.morphTargetsRelative,
  ...Object.entries(render.attributes).flatMap(([name, a]) => [name, ...attrStamp(a, copied || name === 'position' || name === 'uv')])];
const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

function bounds(uv) {
  const low = [Infinity, Infinity], high = [-Infinity, -Infinity];
  if (uv?.itemSize >= 2) for (let i = 0; i < uv.count; i++) {
    const p = [uv.getX(i), uv.getY(i)];
    if (!p.every(finite)) continue;
    for (let k = 0; k < 2; k++) { low[k] = Math.min(low[k], p[k]); high[k] = Math.max(high[k], p[k]); }
  }
  return { low, high };
}

function validTriangle(position, coord, ids) {
  if (!coord || ids.some(i => i >= coord.count)) return 0;
  const p = ids.map(i => [position.getX(i), position.getY(i), position.getZ(i)]);
  const q = ids.map(i => [coord.getX(i), coord.getY(i)]);
  if (![...p.flat(), ...q.flat()].every(finite)) return 0;
  const a = p[1].map((x, k) => x - p[0][k]), b = p[2].map((x, k) => x - p[0][k]);
  const cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  if (!(Math.hypot(...cross) > 1e-12*Math.hypot(...a)*Math.hypot(...b))) return 0;
  const x = [q[1][0]-q[0][0], q[1][1]-q[0][1]], y = [q[2][0]-q[0][0], q[2][1]-q[0][1]];
  const area = Math.abs(x[0]*y[1]-x[1]*y[0]);
  return area > CHART_RELATIVE_AREA_EPSILON*Math.hypot(...x)*Math.hypot(...y) ? 1 : 0;
}

function copyExpanded(attribute, indices) {
  const array = new attribute.array.constructor(indices.length * attribute.itemSize);
  for (let i = 0; i < indices.length; i++) for (let k = 0; k < attribute.itemSize; k++) {
    // Current scene BufferAttributes are not interleaved. Preserve stored values,
    // including normalized integer representations, when expansion is required.
    const offset = attribute.isInterleavedBufferAttribute
      ? indices[i] * attribute.data.stride + attribute.offset + k
      : indices[i] * attribute.itemSize + k;
    array[i * attribute.itemSize + k] = attribute.array[offset];
  }
  const result = new BufferAttribute(array, attribute.itemSize, attribute.normalized);
  result.name = attribute.name; result.setUsage(attribute.usage); result.gpuType = attribute.gpuType;
  return result;
}

/**
 * sourceGeometry supplies the immutable atlas/domain; renderGeometry supplies
 * the actual original or AO-baked triangle stream. Only ExtrudeGeometry gets a
 * separate affine [0,1]^2 chart, using SOURCE UV bounds. All unit-period native
 * charts retain UVs verbatim, including negative/over-one repaired pole seams.
 * Torus/Tube repeat the same 32 canonical contacts in V; other charts have four
 * finite rows. These are UV charts, not geodesic/machining coordinates.
 *
 * Mixed-validity indexed geometry is expanded only when a shared vertex cannot
 * carry both per-triangle flags. Expanded index order and every existing stored
 * attribute value are preserved exactly. Current 19 scene objects do not split.
 */
function prepareGeometry(caches, sourceGeometry, renderGeometry = sourceGeometry) {
  if (!sourceGeometry?.isBufferGeometry || !renderGeometry?.isBufferGeometry)
    throw new TypeError('Perlage charts require source and render BufferGeometry');
  const position = renderGeometry.getAttribute('position');
  if (!position || position.itemSize !== 3) throw new TypeError('Perlage charts require position triples');
  const count = renderGeometry.index?.count ?? position.count;
  if (count % 3) throw new RangeError('Perlage charts require complete triangle streams');
  if (renderGeometry.getAttribute('perlageChartValid') || renderGeometry.getAttribute('perlageCoord') || renderGeometry.getAttribute('perlagePeriodicV'))
    throw new TypeError('Prepare the owned source/baked geometry, not an existing perlage view');
  let cache = caches.get(renderGeometry);
  if (!cache) { cache = { entries: new Map(), views: new Set() }; caches.set(renderGeometry, cache); }
  const cached = cache.entries.get(sourceGeometry);
  const fingerprint = stamp(sourceGeometry, renderGeometry, cached?.view.userData.perlageChart.split);
  if (cached && same(cached.fingerprint, fingerprint)) return cached.view;
  const uv = renderGeometry.getAttribute('uv'), chartCoordinates = sourceGeometry.type === 'ExtrudeGeometry';
  const periodicV = sourceGeometry.type === 'TorusGeometry' || sourceGeometry.type === 'TubeGeometry';
  const domain = chartCoordinates ? bounds(sourceGeometry.getAttribute('uv')) : null;
  let coord = uv?.itemSize >= 2 ? uv : null;
  if (chartCoordinates) {
    const data = new Float32Array(position.count * 2);
    const spans = domain.high.map((v, k) => v - domain.low[k]);
    for (let i = 0; i < position.count; i++) for (let k = 0; k < 2; k++)
      data[i * 2 + k] = uv && i < uv.count && finite(spans[k]) && spans[k] > 0
        ? (uv.getComponent(i, k) - domain.low[k]) / spans[k] : NaN;
    coord = new BufferAttribute(data, 2);
  }
  const indices = Array.from({ length: count }, (_, i) => renderGeometry.index ? renderGeometry.index.getX(i) : i);
  if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= position.count)) throw new RangeError('Invalid geometry index');
  const triangleValid = new Uint8Array(count / 3), vertexValid = new Int8Array(position.count).fill(-1);
  let conflict = false, invalidTriangles = 0;
  for (let t = 0; t < count; t += 3) {
    const ids = indices.slice(t, t + 3), valid = validTriangle(position, coord, ids);
    triangleValid[t / 3] = valid; invalidTriangles += 1 - valid;
    for (const i of ids) { if (vertexValid[i] !== -1 && vertexValid[i] !== valid) conflict = true; vertexValid[i] = valid; }
  }
  const split = Boolean(renderGeometry.index && conflict), view = new BufferGeometry(), borrowed = new Set();
  for (const [name, a] of Object.entries(renderGeometry.attributes)) {
    const attribute = split ? copyExpanded(a, indices) : a;
    view.setAttribute(name, attribute); if (!split) borrowed.add(name);
  }
  view.setIndex(split ? null : renderGeometry.index);
  view.groups = renderGeometry.groups; view.drawRange = renderGeometry.drawRange;
  view.boundingBox = renderGeometry.boundingBox; view.boundingSphere = renderGeometry.boundingSphere;
  view.morphAttributes = split ? Object.fromEntries(Object.entries(renderGeometry.morphAttributes).map(([name, list]) => [name, list.map(a => copyExpanded(a, indices))])) : renderGeometry.morphAttributes;
  view.morphTargetsRelative = renderGeometry.morphTargetsRelative;
  const validity = split ? Float32Array.from(indices, (_, i) => triangleValid[Math.floor(i / 3)])
    : Float32Array.from(vertexValid, x => Math.max(0, x));
  view.setAttribute('perlageChartValid', new BufferAttribute(validity, 1));
  const periods = new Float32Array(validity.length).fill(periodicV ? 1 : 0);
  view.setAttribute('perlagePeriodicV', new BufferAttribute(periods, 1));
  if (chartCoordinates) view.setAttribute('perlageCoord', split ? copyExpanded(coord, indices) : coord);
  else if (coord) {
    // Alias the preserved UV buffer; ordinary charts allocate no duplicate UVs.
    view.setAttribute('perlageCoord', view.getAttribute('uv'));
    if (!split) borrowed.add('perlageCoord');
  } else view.setAttribute('perlageCoord', new BufferAttribute(new Float32Array(validity.length * 2), 2));
  view.userData = { ...renderGeometry.userData, perlageChart: {
    policy: chartCoordinates ? 'bounded-extrude-atlas' : 'native-unit-period',
    periodicV, chartCoordinates, domain, triangles: count / 3, invalidTriangles,
    split, epsilon: CHART_RELATIVE_AREA_EPSILON,
    addedAttributeBytes: validity.byteLength + periods.byteLength + (chartCoordinates || !coord ? view.getAttribute('perlageCoord').array.byteLength : 0),
  } };
  // Shared GPU attributes belong to renderGeometry. Before dispatching dispose,
  // detach them so Three's geometry disposal cannot delete the owner's buffers.
  // Caller must stop using a released view; invalidate alone keeps old views live.
  const ownDispose = view.dispose.bind(view); let disposed = false;
  view.dispose = () => {
    if (disposed) return; disposed = true;
    for (const name of borrowed) view.deleteAttribute(name);
    if (!split) { view.setIndex(null); view.morphAttributes = {}; }
    if (cache.entries.get(sourceGeometry)?.view === view) cache.entries.delete(sourceGeometry);
    cache.views.delete(view); ownDispose();
  };
  cache.views.add(view); cache.entries.set(sourceGeometry, { fingerprint: split ? stamp(sourceGeometry, renderGeometry, true) : fingerprint, view });
  return view;
}

/** Drop cache entries after unversioned source changes; existing views stay valid. */
export function invalidatePerlageGeometry(renderGeometry) { standaloneCaches.get(renderGeometry)?.entries.clear(); }

/** Call after removing ALL these views from meshes; owners remain undisposed. */
function releaseGeometryViews(caches, renderGeometry) {
  const cache = caches.get(renderGeometry); if (!cache) return;
  for (const view of [...cache.views]) view.dispose();
  caches.delete(renderGeometry);
}

/** Diagnostic convenience API. Integrations should own one cache per library. */
export function createPerlageGeometry(sourceGeometry, renderGeometry = sourceGeometry) {
  return prepareGeometry(standaloneCaches, sourceGeometry, renderGeometry);
}
export function releasePerlageGeometryViews(renderGeometry) {
  releaseGeometryViews(standaloneCaches, renderGeometry);
}

/** Scope cached views to one material library/scene owner, never global meshes. */
export function createPerlageChartCache() {
  const scopedCaches = new WeakMap(), owners = new Set();
  return {
    createGeometry(sourceGeometry, renderGeometry = sourceGeometry) {
      owners.add(renderGeometry);
      return prepareGeometry(scopedCaches, sourceGeometry, renderGeometry);
    },
    invalidateGeometry(renderGeometry) { scopedCaches.get(renderGeometry)?.entries.clear(); },
    releaseGeometryViews(renderGeometry) { releaseGeometryViews(scopedCaches, renderGeometry); owners.delete(renderGeometry); },
    dispose() { for (const owner of owners) releaseGeometryViews(scopedCaches, owner); owners.clear(); },
  };
}
