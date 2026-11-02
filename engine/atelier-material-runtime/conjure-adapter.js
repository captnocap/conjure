import * as THREE from 'three';
import { createMaterialLibrary, materialDefinitions } from './material-library.js';
import { bakeMaterialGeometry, createMaterialBakeGeometry } from './material-bake.js';
import { createWovenGeometry } from './woven-linen-charts.js';
import { createPerlageChartCache } from './perlage-charts.js';

const scoped = new Set(['perforated-shell', 'shingle-relief', 'enamel-reserve', 'ribbed-clay']);
const definitions = new Map(materialDefinitions.map(definition => [definition.id, definition]));
const ids = new Set(materialDefinitions.map(definition => definition.id).filter(id => !scoped.has(id)));
const wovenTypes = new Set(['BoxGeometry', 'PlaneGeometry', 'LatheGeometry', 'TorusGeometry', 'CylinderGeometry', 'TubeGeometry', 'SphereGeometry', 'IcosahedronGeometry']);

/** A stable atlas for geometry without useful authored UVs. Each triangle uses its
 * own tangent plane. This keeps real yarn/circular-grain mechanisms on arbitrary
 * meshes, with explicit seams at triangle boundaries rather than invented UVs. */
export function triangleAtlas(geometry) {
  const position = geometry.getAttribute('position');
  if (geometry.index || !position || position.count % 3) throw new Error('An expanded triangle mesh is required for the material atlas');
  const uv = new Float32Array(position.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tangent = new THREE.Vector3(), delta = new THREE.Vector3();
  for (let at = 0; at < position.count; at += 3) {
    a.fromBufferAttribute(position, at); b.fromBufferAttribute(position, at + 1); c.fromBufferAttribute(position, at + 2);
    const span = tangent.subVectors(b, a).length();
    tangent.multiplyScalar(1 / (span || 1)); delta.subVectors(c, a);
    const x = delta.dot(tangent), y = Math.sqrt(Math.max(0, delta.lengthSq() - x * x));
    uv[(at + 1) * 2] = span;
    uv[(at + 2) * 2] = x; uv[(at + 2) * 2 + 1] = y;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.userData.atelierAtlas = 'triangle-local-tangent';
  return geometry;
}

function validUV(geometry) {
  const uv = geometry.getAttribute('uv');
  return Boolean(uv && uv.itemSize >= 2 && uv.count === geometry.getAttribute('position').count &&
    Array.from(uv.array).every(Number.isFinite));
}

/** Chart unknown forms by their native atlas at a size derived from actual
 * surface area. Source primitive charts retain their original seam handling. */
function arbitraryWoven(mesh, geometry) {
  if (!validUV(geometry)) triangleAtlas(geometry);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0, uvArea = 0;
  for (let at = 0; at < position.count; at += 3) {
    a.fromBufferAttribute(position, at).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, at + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, at + 2).applyMatrix4(mesh.matrixWorld);
    area += b.sub(a).cross(c.sub(a)).length() * 0.5;
    uvArea += Math.abs((uv.getX(at + 1) - uv.getX(at)) * (uv.getY(at + 2) - uv.getY(at)) -
      (uv.getY(at + 1) - uv.getY(at)) * (uv.getX(at + 2) - uv.getX(at))) * 0.5;
  }
  if (!(area > 1e-12)) throw new RangeError('A woven material needs non-degenerate surface triangles');
  if (!(uvArea > 1e-12)) {
    if (geometry.userData.atelierAtlas) throw new RangeError('A woven material needs a non-degenerate surface chart');
    triangleAtlas(geometry); return arbitraryWoven(mesh, geometry);
  }
  const scale = Math.sqrt(area / uvArea) / 0.035;
  const coords = new Float32Array(position.count * 2);
  for (let at = 0; at < position.count; at++) { coords[at * 2] = uv.getX(at) * scale; coords[at * 2 + 1] = uv.getY(at) * scale; }
  geometry.setAttribute('wovenCoord', new THREE.BufferAttribute(coords, 2));
  geometry.setAttribute('wovenPolar', new THREE.BufferAttribute(new Float32Array(position.count).fill(1), 1));
  geometry.setAttribute('wovenPeriod', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2));
  geometry.userData.wovenChart = { type: mesh.geometry.type, policy: geometry.userData.atelierAtlas || 'native-atlas-area-scale', pitch: 0.035 };
  return geometry;
}

/** Build every resource before installing any material. The caller owns the
 * returned disposer; original component buffers and material slots are restored. */
export function dressAtelierSurfaces(surfaces, prefixedId) {
  const id = prefixedId.replace(/^atelier-/, '');
  if (!ids.has(id)) throw new RangeError(`Atelier material is not portable to arbitrary scenes: ${id}`);
  if (!surfaces.length) return () => {};
  const meshes = [...new Set(surfaces.map(surface => surface.mesh))];
  for (const mesh of meshes) mesh.updateWorldMatrix(true, false);
  // Keep the source 16-ray geometric curvature/AO bake. It sees the complete
  // selected body and its local contacts; the live renderer handles scene shadows.
  const bake = bakeMaterialGeometry(meshes);
  const library = createMaterialLibrary();
  const charts = createPerlageChartCache();
  const owned = new Set(), geometryChanges = [], materialChanges = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const change of materialChanges) {
      if (change.mesh.material === change.next) change.mesh.material = change.original;
      if (change.mesh.castShadow === change.nextCastShadow) change.mesh.castShadow = change.castShadow;
    }
    for (const change of geometryChanges) if (change.mesh.geometry === change.next) change.mesh.geometry = change.original;
    charts.dispose();
    for (const geometry of owned) geometry.dispose();
    library.dispose();
  }
  try {
    for (let at = 0; at < meshes.length; at++) {
      const mesh = meshes[at], original = mesh.geometry;
      const baked = createMaterialBakeGeometry(mesh, bake.meshes[at]);
      owned.add(baked);
      if (!baked.getAttribute('normal')) baked.computeVertexNormals();
      // Physical anisotropy expects a UV derivative basis even for custom meshes.
      if (!validUV(baked)) triangleAtlas(baked);
      let next = baked;
      if (id === 'woven-linen') {
        next = wovenTypes.has(original.type) ? createWovenGeometry(mesh, baked) : arbitraryWoven(mesh, baked);
        owned.add(next);
      }
      if (id === 'perlage-metal') {
        next = charts.createGeometry(original, baked);
        next.setAttribute('perlageEnabled', new THREE.BufferAttribute(new Float32Array(next.getAttribute('position').count).fill(1), 1));
      }
      geometryChanges.push({ mesh, original, next });
      const old = mesh.material, nextMaterials = Array.isArray(old) ? old.slice() : null;
      let replacement = old;
      for (const surface of surfaces.filter(surface => surface.mesh === mesh)) {
        const material = library.create(id, { side: surface.material.side });
        // Create before attaching the companion: the generic source albedo factory
        // clones physical.userData, which must not contain live Material objects.
        const albedo = library.createAlbedo(id, { side: surface.material.side });
        Object.defineProperty(material.userData, 'atelierAlbedoMaterial', { value: albedo, configurable: true, enumerable: false });
        material.userData.atelierTransmission = definitions.get(id).transmission;
        material.userData.atelierCastShadow = id !== 'frosted-glass';
        material.userData.material = prefixedId;
        material.userData.atelierMaterial = id;
        material.userData.materials = 'own';
        if (nextMaterials && surface.slot !== null) nextMaterials[surface.slot] = material;
        else replacement = material;
      }
      const nextMaterial = nextMaterials || replacement;
      const allFrosted = [nextMaterial].flat().every(material => material.userData.atelierMaterial === 'frosted-glass');
      materialChanges.push({ mesh, original: old, next: nextMaterial, castShadow: mesh.castShadow, nextCastShadow: allFrosted ? false : mesh.castShadow });
    }
    for (const change of geometryChanges) change.mesh.geometry = change.next;
    for (const change of materialChanges) { change.mesh.material = change.next; change.mesh.castShadow = change.nextCastShadow; }
    return dispose;
  } catch (error) { dispose(); throw error; }
}
