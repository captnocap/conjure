// Effective fragment visibility is separate from the immutable original shape.
import * as T from './vendor/three.module.min.js';
import { MODEL_VERSION, ELIGIBLE_IDS, PITCH, RADIUS, PHASE, apertureFloat32CPU } from './perforated-shell-field.js';

export function materialVisibilityKey(descriptor) {
  if (descriptor == null) return '';
  if (descriptor.model !== MODEL_VERSION || !Array.isArray(descriptor.objectIds) ||
      !descriptor.objectIds.length || descriptor.objectIds.some((id, i, ids) =>
        !ELIGIBLE_IDS.includes(id) || (i > 0 && id <= ids[i - 1])))
    throw new Error('Invalid material visibility descriptor');
  return descriptor.model + ':' + descriptor.objectIds.join(',');
}
export function shellVisibilityOwner(descriptor, id) {
  return descriptor?.objectIds.includes(id) || false;
}
export function copyMaterialVisibility(descriptor) {
  if (!materialVisibilityKey(descriptor)) return undefined;
  return { model: descriptor.model, objectIds: [...descriptor.objectIds] };
}
export function createMaterialVisibility(descriptor, meshes, view, projection, size) {
  const key = materialVisibilityKey(descriptor);
  if (!key) return null;
  const inverse = new Map(), screenToLocal = new Map(),
    v = new T.Matrix4().fromArray(view.elements || view),
    p = new T.Matrix4().fromArray(projection.elements || projection);
  if (Math.abs(p.elements[11]) > 1e-12)
    throw new Error('Surface material visibility needs an orthographic capture');
  const cameraToWorld = v.clone().invert(), clipToCamera = p.clone().invert();
  for (const id of descriptor.objectIds) {
    const mesh = meshes[id - 1];
    if (!mesh) throw new Error('Missing shell visibility mesh ' + id);
    mesh.updateWorldMatrix(true, false);
    const worldToLocal = mesh.matrixWorld.clone().invert();
    inverse.set(id, worldToLocal);
    // Input coordinates are projected x/y and positive camera distance, exactly
    // the sample/path contract. No pixel rounding or source-image repainting.
    const point = (x, y, z) => {
      const q = new T.Vector3(x / size * 2 - 1, 1 - y / size * 2, 0).applyMatrix4(clipToCamera);
      q.z = -z;
      return q.applyMatrix4(cameraToWorld).applyMatrix4(worldToLocal).toArray();
    };
    screenToLocal.set(id, point);
  }
  return {
    key, descriptor,
    has: id => inverse.has(id),
    local: (id, world) => new T.Vector3(...world).applyMatrix4(inverse.get(id)).toArray(),
    point: (id, x, y, z) => screenToLocal.get(id)?.(x, y, z),
    retained: (id, x, y, z) => !inverse.has(id) || !apertureFloat32CPU(screenToLocal.get(id)(x, y, z)),
  };
}

// Every cylindrical aperture crossing of a local-coordinate line. Roots use the
// fixed analytic field; a small bracket resolves Float32 shader boundary shifts
// using the same CPU predicate. This does not sample past a thin opening.
export function apertureSegmentCuts(a, b, lo = 0, hi = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], speed2 = dx * dx + dy * dy;
  if (speed2 < 1e-24) return [];
  const x0 = a[0] + dx * lo, x1 = a[0] + dx * hi,
    y0 = a[1] + dy * lo, y1 = a[1] + dy * hi, cuts = [];
  const at = t => [a[0] + dx * t, a[1] + dy * t, 0];
  for (let ix = Math.ceil((Math.min(x0,x1) - RADIUS - PHASE[0]) / PITCH);
       ix <= Math.floor((Math.max(x0,x1) + RADIUS - PHASE[0]) / PITCH); ix++)
    for (let iy = Math.ceil((Math.min(y0,y1) - RADIUS - PHASE[1]) / PITCH);
         iy <= Math.floor((Math.max(y0,y1) + RADIUS - PHASE[1]) / PITCH); iy++) {
      const x = a[0] - (PHASE[0] + ix * PITCH), y = a[1] - (PHASE[1] + iy * PITCH),
        linear = x * dx + y * dy, constant = x*x + y*y - RADIUS*RADIUS,
        discriminant = linear*linear - speed2*constant;
      if (discriminant <= 0) continue;
      for (let root of [(-linear-Math.sqrt(discriminant))/speed2,(-linear+Math.sqrt(discriminant))/speed2]) {
        if (root <= lo || root >= hi) continue;
        const guard = 2e-6 * Math.max(1,Math.abs(x0),Math.abs(x1),Math.abs(y0),Math.abs(y1)) / Math.sqrt(speed2);
        let left = Math.max(lo,root-guard), right = Math.min(hi,root+guard);
        const leftHole = apertureFloat32CPU(at(left));
        if (leftHole !== apertureFloat32CPU(at(right))) {
          for (let k=0;k<35;k++) {
            const mid=(left+right)*.5;
            if (apertureFloat32CPU(at(mid))===leftHole) left=mid; else right=mid;
          }
          root=(left+right)*.5;
        }
        cuts.push(root);
      }
    }
  return cuts;
}
