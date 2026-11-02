import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { BuildContext, Thing } from './contract';
import { disposeTree } from './dispose';
import { visibleBounds } from './measure';

/**
 * A thing that is a model file instead of built geometry: a GLB in the component's own folder,
 * loaded once and cloned for every build, then stood on y = 0, centred on the origin and scaled to
 * the height the answers ask for. Untextured models take the engine's paint and material passes
 * like any procedural thing; a textured model keeps its texture and is tinted instead.
 *
 *   const url = new URL('./take-1.glb', import.meta.url).href;
 *   build: (answers, context) => loadModel(url, context, { height: 1.2 })
 */
export interface ModelOptions {
  /** How tall the model stands, metres, measured over its visible bounds. */
  height: number;
  /** The footprint radius to declare, when the visible bounds mislead. */
  footprint?: number;
  /** Turn about y in radians, for a model that was not made facing +z. */
  turn?: number;
  /** Whether the model casts and receives shadows; on unless the model is a backdrop. */
  shadows?: boolean;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();

/** The model's scene, fetched and parsed once per URL for the life of the page. */
export function modelScene(url: string): Promise<THREE.Group> {
  let pending = cache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => gltf.scene);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

export async function loadModel(url: string, context: BuildContext, options: ModelOptions): Promise<Thing> {
  const source = await modelScene(url);
  const root = new THREE.Group();
  // Each build gets its own meshes and materials, so the engine's repaint of one cast member never
  // reaches another, and dispose frees only this build's copies.
  const copy = source.clone(true);
  copy.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.material = Array.isArray(node.material) ? node.material.map((material) => material.clone()) : node.material.clone();
    node.castShadow = node.receiveShadow = options.shadows ?? true;
  });
  root.add(copy);
  copy.rotation.y = options.turn ?? 0;
  copy.updateMatrixWorld(true);
  const bounds = visibleBounds(root);
  if (!bounds.isEmpty()) {
    const size = bounds.getSize(new THREE.Vector3());
    const scale = options.height / Math.max(size.y, 1e-6);
    copy.scale.multiplyScalar(scale);
    copy.updateMatrixWorld(true);
    const scaled = visibleBounds(root), centre = scaled.getCenter(new THREE.Vector3());
    copy.position.set(-centre.x, -scaled.min.y, -centre.z);
  }
  void context;
  return { object: root, ...(options.footprint !== undefined ? { footprint: options.footprint } : {}), dispose: () => disposeTree(root) };
}
