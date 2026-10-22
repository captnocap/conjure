// Only the three frozen original-scene treatments use this fallback, after the
// historical exact SHA check. Never round, replace or retain the caller's source.
import { PACKED_SOURCE } from './accepted-source-data.js';
import { sha256, sourceGeometrySignature } from './section-rib-signature.js';

let acceptedSource;
function reference() {
  if (acceptedSource) return acceptedSource;
  // Inline, lossless little-endian bytes. No fetch, decompression API or engine
  // trigonometry is involved in recovering the historical canonical reference.
  const text = atob(PACKED_SOURCE.base64), bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  if (bytes.length !== PACKED_SOURCE.byteLength || sha256(bytes) !== PACKED_SOURCE.sha256)
    throw Error('Accepted source reference integrity check failed');
  const view = new DataView(bytes.buffer); let at = 0;
  const u32 = () => { const value = view.getUint32(at, true); at += 4; return value; };
  const f64 = () => { const value = view.getFloat64(at, true); at += 8; return value; };
  const version = u32(), count = u32(), meshes = [];
  if (version !== 1 || count !== 20) throw Error('Invalid accepted source reference layout');
  for (let i = 0; i < count; i++) {
    const positionLength = u32(), indexBits = u32(), indexLength = u32(), side = u32();
    const drawRange = { start: f64(), count: f64() }, matrix = Array.from({length: 16}, f64);
    const position = new Float32Array(positionLength);
    for (let j = 0; j < position.length; j++, at += 4) position[j] = view.getFloat32(at, true);
    const index = indexBits === 0 ? null : indexBits === 16 ? new Uint16Array(indexLength) : indexBits === 32 ? new Uint32Array(indexLength) : undefined;
    if (index === undefined || (!index && indexLength)) throw Error('Invalid accepted source index layout');
    if (index) for (let j = 0; j < index.length; j++, at += indexBits / 8)
      index[j] = indexBits === 16 ? view.getUint16(at, true) : view.getUint32(at, true);
    // Integer bits give the exact Float32 binade without Math.log2 rounding.
    const positionBits = new Uint32Array(position.buffer);
    meshes.push({ position, positionBits, index, side, drawRange, matrix });
  }
  const source = { version, meshes };
  if (at !== bytes.length || sourceGeometrySignature(source) !== PACKED_SOURCE.sourceSignature)
    throw Error('Accepted source reference signature check failed');
  // This is the only persistent decoded reference. Nothing mutable is exported.
  acceptedSource = source;
  return source;
}

// Mesh IDs are fixed by the accepted, ordered scene. Planes/boxes are algebraic;
// the other positions are generated curves. Only these six objects are rotated.
const algebraicPositions = new Set([1, 2, 4, 5, 6]);
const rotatedMeshes = new Set([1, 8, 13, 15, 17, 19]);
const rotationSlots = new Set([0, 1, 2, 4, 5, 6, 8, 9, 10]);
// Straight extrusion depth/end planes are fixed arithmetic; only intermediate
// bevel-layer depths use cos. Vase/cylinder heights and cylinder cap centers
// are also algebraic even though they belong to otherwise curved primitives.
const exactExtrusionDepths = new Set([Math.fround(-.055), 0, Math.fround(.58), Math.fround(.58 + .055)]);

export function matchesAcceptedSourceGeometry(actual) {
  const canonical = reference();
  if (!actual || actual.version !== canonical.version || !Array.isArray(actual.meshes) || actual.meshes.length !== canonical.meshes.length) return false;
  for (let i = 0; i < canonical.meshes.length; i++) {
    const a = actual.meshes[i], b = canonical.meshes[i];
    if (!a || a.side !== b.side || !a.drawRange || a.drawRange.start !== b.drawRange.start || a.drawRange.count !== b.drawRange.count ||
        !(a.position instanceof Float32Array) || a.position.constructor !== Float32Array || a.position.length !== b.position.length ||
        !Array.isArray(a.matrix) || a.matrix.length !== 16 ||
        (b.index === null ? a.index !== null : !(a.index instanceof b.index.constructor) || a.index.constructor !== b.index.constructor || a.index.length !== b.index.length)) return false;
    if (b.index) for (let j = 0; j < b.index.length; j++) if (a.index[j] !== b.index[j]) return false;
    const curved = !algebraicPositions.has(i + 1), rotated = rotatedMeshes.has(i + 1);
    for (let j = 0; j < b.position.length; j++) {
      // One Float32 spacing at the canonical value. The 1e-12 floor covers only
      // tiny transcendental residues near mathematical zero (including +/-0).
      const component = j % 3, vertex = j - component;
      const exact = !curved || ((i === 6 || i === 8) && component === 1) ||
        (i === 8 && b.position[vertex] === 0 && b.position[vertex + 2] === 0) ||
        (i === 2 && component === 2 && exactExtrusionDepths.has(b.position[j]));
      const tolerance = exact ? 0 : Math.max(1e-12, 2 ** (((b.positionBits[j] >>> 23) & 255) - 150));
      if (!Number.isFinite(a.position[j]) || Math.abs(a.position[j] - b.position[j]) > tolerance) return false;
    }
    for (let j = 0; j < 16; j++) {
      // Translation, homogeneous slots and all unrotated transforms stay exact.
      const tolerance = rotated && rotationSlots.has(j) ? 64 * Number.EPSILON * Math.max(1, Math.abs(b.matrix[j])) : 0;
      if (!Number.isFinite(a.matrix[j]) || Math.abs(a.matrix[j] - b.matrix[j]) > tolerance) return false;
    }
  }
  return true;
}
