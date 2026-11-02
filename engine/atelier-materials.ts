import type * as THREE from 'three';
import { isAtelierMaterial, type AtelierMaterialName } from '../kit/atelier-materials';
import { bodyOf, surfacesOf, type Surface } from './paint';

type Runtime = { dressAtelierSurfaces(surfaces: Surface[], id: AtelierMaterialName): () => void };
let runtime: Runtime | undefined;
let pending: Promise<Runtime> | undefined;

/** Load the native-Three shader runtime only when a selected material needs it. */
export async function prepareAtelierMaterials(names: readonly (string | undefined)[]): Promise<void> {
  if (!names.some(isAtelierMaterial)) return;
  pending ??= import('./atelier-material-runtime/conjure-adapter.js').then(module => (runtime = module)).catch(error => { pending = undefined; throw error; });
  await pending;
}

/** Call after prepareAtelierMaterials, in the same place as ordinary refinish. */
export function refinishAtelier(root: THREE.Object3D, name: AtelierMaterialName, whole = false): () => void {
  if (!runtime) throw new Error('The Atelier material runtime must be prepared before dressing a scene.');
  const surfaces = surfacesOf(root, { glass: true });
  return runtime.dressAtelierSurfaces(whole ? surfaces : bodyOf(surfaces).body, name);
}
