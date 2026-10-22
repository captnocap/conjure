import * as THREE from 'three';

/**
 * The box around the solid surfaces that will be drawn. Hidden helpers, lights, sprites and
 * see-through effects (glows, beams, heat haze) are ignored, so a car measures as its body
 * and not as the reach of its headlights.
 */
export function visibleBounds(root: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = [mesh.material].flat()[0];
    if (material && (!material.depthWrite || material.opacity <= 0.2)) return;
    bounds.expandByObject(node, true);
  });
  return bounds;
}
