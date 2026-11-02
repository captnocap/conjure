import type { Surface } from '../paint';
import type { BufferGeometry } from 'three';
export function dressAtelierSurfaces(surfaces: Surface[], prefixedId: string): () => void;
export function triangleAtlas(geometry: BufferGeometry): BufferGeometry;
