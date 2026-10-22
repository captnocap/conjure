import type * as THREE from 'three';

/** Free every geometry, material and texture under an object. For things with no disposer of their own. */
export function disposeTree(root: THREE.Object3D) {
  const seen = new Set<{ dispose(): void }>();
  const release = (resource: { dispose(): void } | null | undefined) => {
    if (!resource || seen.has(resource)) return;
    seen.add(resource);
    resource.dispose();
  };
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    release(mesh.geometry);
    for (const material of [mesh.material].flat()) {
      if (!material) continue;
      for (const value of Object.values(material))
        if (value && (value as THREE.Texture).isTexture) release(value as THREE.Texture);
      release(material);
    }
  });
  root.removeFromParent();
}
