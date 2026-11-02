import * as THREE from 'three';
import type { AtelierCapture, AtelierGeometry, AtelierMesh } from '../kit/contract';

export interface CaptureSolid { mesh: THREE.Mesh; id: number; material: THREE.Material | THREE.Material[] }

/** The same per-slot surface policy is used by pixel passes and triangle snapshots. */
export function isCaptureSurface(material: THREE.Material | undefined): material is THREE.Material {
  return !!material && material.visible && material.depthWrite && material.opacity > 0.2;
}

/** Copy the current deformation once per mesh, sharing it across instances and material groups. */
function positions(mesh: THREE.Mesh): Float32Array {
  const attribute = mesh.geometry.getAttribute('position');
  if (!(mesh as THREE.SkinnedMesh).isSkinnedMesh && !mesh.morphTargetInfluences?.length &&
    !('isInterleavedBufferAttribute' in attribute) && attribute.array instanceof Float32Array && attribute.itemSize === 3)
    return attribute.array.slice();
  const result = new Float32Array(attribute.count * 3);
  const point = new THREE.Vector3();
  // getVertexPosition includes the current morph targets and, for SkinnedMesh, bone transforms.
  for (let i = 0; i < attribute.count; i++) {
    mesh.getVertexPosition(i, point);
    point.toArray(result, i * 3);
  }
  return result;
}

export function snapshotAtelierGeometry(solids: readonly CaptureSolid[], camera: THREE.Camera, size: number): AtelierGeometry {
  const lens = camera as THREE.OrthographicCamera | THREE.PerspectiveCamera;
  const meshes: AtelierMesh[] = [];
  const bounds = new THREE.Box3(), subjectBounds = new THREE.Box3();
  const point = new THREE.Vector3(), instance = new THREE.Matrix4(), world = new THREE.Matrix4();
  for (const [body, { mesh, id, material }] of solids.entries()) {
    const source = mesh.geometry, attribute = source.getAttribute('position');
    if (!attribute || !attribute.count) continue;
    const position = positions(mesh), sourceIndex = source.index;
    const total = sourceIndex?.count ?? attribute.count;
    const start = Math.max(0, source.drawRange.start), end = Math.min(total, start + source.drawRange.count);
    const materials = Array.isArray(material) ? material : [material];
    const groups = Array.isArray(material) ? source.groups : [{ start, count: end - start, materialIndex: 0 }];
    const copies = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1;
    for (let copy = 0; copy < copies; copy++) {
      world.copy(mesh.matrixWorld);
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
        (mesh as THREE.InstancedMesh).getMatrixAt(copy, instance);
        world.multiply(instance);
      }
      for (const group of groups) {
        const original = materials[group.materialIndex ?? 0] as THREE.MeshPhysicalMaterial;
        if (!isCaptureSurface(original)) continue;
        const a = Math.max(start, group.start), b = Math.min(end, group.start + group.count);
        if (b - a < 3) continue;
        const indices = new Uint32Array(Math.floor((b - a) / 3) * 3);
        for (let i = 0; i < indices.length; i++) indices[i] = sourceIndex ? sourceIndex.getX(a + i) : a + i;
        const color = original.color?.clone() ?? new THREE.Color(1, 1, 1);
        if ((mesh as THREE.InstancedMesh).instanceColor) {
          const tint = new THREE.Color();
          (mesh as THREE.InstancedMesh).getColorAt(copy, tint);
          color.multiply(tint);
        }
        meshes.push({ id, bodyId: `${body}:${copy}`, ground: id === 1, position, index: indices, drawRange: { start: 0, count: indices.length },
          matrix: world.toArray(), side: original.side, castShadow: mesh.castShadow && original.userData.atelierCastShadow !== false,
          material: { color: color.toArray(), metalness: original.metalness ?? 0, roughness: original.roughness ?? 1,
            transmission: original.transmission ?? 0, alphaTest: original.alphaTest ?? 0,
            ...(typeof original.userData.atelierMaterial === 'string' ? { atelierMaterial: original.userData.atelierMaterial } : {}),
            alphaCutout: !!((original.alphaTest > 0 || original.alphaHash) && (original.map || original.alphaMap)) } });
        for (const index of indices) {
          point.fromArray(position, index * 3).applyMatrix4(world);
          bounds.expandByPoint(point);
          if (id !== 1) subjectBounds.expandByPoint(point);
        }
      }
    }
  }
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(), new THREE.Vector3());
  const inverse = lens.projectionMatrix.clone().invert();
  const left = new THREE.Vector3(-1, 0, 0).applyMatrix4(inverse), right = new THREE.Vector3(1, 0, 0).applyMatrix4(inverse);
  const orthographic = !!(lens as THREE.OrthographicCamera).isOrthographicCamera;
  const focus = (subjectBounds.isEmpty() ? bounds : subjectBounds).getCenter(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
  const focusDistance = Math.max(lens.near, -focus.z);
  const width = orthographic ? left.distanceTo(right)
    : left.distanceTo(right) * focusDistance / Math.max(1e-12, Math.abs(left.z));
  return { version: 1, source: 'conjure', size, view: camera.matrixWorldInverse.toArray(), projection: lens.projectionMatrix.toArray(),
    camera: orthographic ? 'orthographic' : 'perspective', near: lens.near, far: lens.far, worldScale: Math.max(1e-9, width / 8.2),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, meshes };
}

/** Creases use the captured camera and copied geometry, so disposal or a later orbit cannot move them. */
export function projectedAtelierEdges(snapshot: AtelierGeometry): { edges: number[][][]; edgeOwners: number[] } {
  const edges: number[][][] = [], edgeOwners: number[] = [];
  const view = new THREE.Matrix4().fromArray(snapshot.view), projection = new THREE.Matrix4().fromArray(snapshot.projection);
  const point = new THREE.Vector3();
  const bodies = new Map<string, AtelierMesh[]>();
  for (const mesh of snapshot.meshes) {
    const parts = bodies.get(mesh.bodyId) ?? [];
    parts.push(mesh); bodies.set(mesh.bodyId, parts);
  }
  for (const parts of bodies.values()) {
    const mesh = parts[0];
    if (mesh.ground) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(mesh.position, 3));
    const count = parts.reduce((sum, part) => sum + (part.index?.length ?? part.position.length / 3), 0);
    const indices = new Uint32Array(count);
    let at = 0;
    for (const part of parts) {
      const index = part.index ?? Uint32Array.from({ length: part.position.length / 3 }, (_, i) => i);
      indices.set(index, at); at += index.length;
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    const creases = new THREE.EdgesGeometry(geometry, 25), positions = creases.getAttribute('position');
    const modelView = view.clone().multiply(new THREE.Matrix4().fromArray(mesh.matrix));
    for (let i = 0; i < positions.count; i += 2) {
      if (Math.abs(projection.elements[11]) > 1e-12) {
        const a = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(modelView);
        const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1).applyMatrix4(modelView);
        const ca = new THREE.Vector4(a.x, a.y, a.z, 1).applyMatrix4(projection);
        const cb = new THREE.Vector4(b.x, b.y, b.z, 1).applyMatrix4(projection);
        let lo = 0, hi = 1;
        for (const axis of ['x', 'y', 'z'] as const) for (const sign of [-1, 1]) {
          const da = ca.w + sign * ca[axis], db = cb.w + sign * cb[axis];
          if (da < 0 && db < 0) { hi = -1; break; }
          if ((da >= 0) !== (db >= 0)) {
            const t = da / (da - db);
            if (da < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
          }
        }
        if (hi <= lo) continue;
        const pair = [lo, hi].map(t => {
          const clip = ca.clone().lerp(cb, t);
          return [(clip.x / clip.w + 1) * snapshot.size / 2, (1 - clip.y / clip.w) * snapshot.size / 2, -(a.z + (b.z - a.z) * t)];
        });
        if (pair.every(p => p.every(Number.isFinite))) { edges.push(pair); edgeOwners.push(mesh.id); }
        continue;
      }
      const pair: number[][] = [];
      for (let k = 0; k < 2; k++) {
        point.fromBufferAttribute(positions, i + k).applyMatrix4(modelView);
        const depth = -point.z;
        point.applyMatrix4(projection);
        pair.push([(point.x + 1) * snapshot.size / 2, (1 - point.y) * snapshot.size / 2, depth]);
      }
      if (pair.every((p) => p.every(Number.isFinite)) && !pair.every((p) => p[2] <= 0) &&
        ![0, 1].some((axis) => pair.every((p) => p[axis] < 0) || pair.every((p) => p[axis] > snapshot.size))) {
        edges.push(pair); edgeOwners.push(mesh.id);
      }
    }
    creases.dispose(); geometry.dispose();
  }
  return { edges, edgeOwners };
}

export function captureAtelier(solids: readonly CaptureSolid[], scene: THREE.Scene, camera: THREE.Camera, size: number, keyLight: THREE.DirectionalLight | null): AtelierCapture {
  const geometry = snapshotAtelierGeometry(solids, camera, size);
  const directional: THREE.DirectionalLight[] = [];
  let hemisphere: THREE.HemisphereLight | undefined;
  scene.traverseVisible((node) => {
    if ((node as THREE.DirectionalLight).isDirectionalLight) directional.push(node as THREE.DirectionalLight);
    if (!hemisphere && (node as THREE.HemisphereLight).isHemisphereLight) hemisphere = node as THREE.HemisphereLight;
  });
  if (keyLight) directional.sort((a, b) => +(b === keyLight) - +(a === keyLight));
  const toward = (light: THREE.DirectionalLight) => light.getWorldPosition(new THREE.Vector3()).sub(light.target.getWorldPosition(new THREE.Vector3())).normalize();
  const imageDirection = (direction: THREE.Vector3) => direction.transformDirection(camera.matrixWorldInverse).toArray().map((v, i) => i === 1 ? -v : v);
  const shadow = keyLight?.shadow.clone();
  if (shadow && keyLight) { shadow.camera.updateProjectionMatrix(); shadow.updateMatrices(keyLight); }
  const metalnesses: number[] = [], transmissions: number[] = [], counts: number[] = [];
  for (const mesh of geometry.meshes) {
    const count = mesh.index?.length ?? mesh.position.length / 3;
    metalnesses[mesh.id] = (metalnesses[mesh.id] ?? 0) + mesh.material.metalness * count;
    transmissions[mesh.id] = (transmissions[mesh.id] ?? 0) + mesh.material.transmission * count;
    counts[mesh.id] = (counts[mesh.id] ?? 0) + count;
  }
  for (let id = 0; id < counts.length; id++) {
    metalnesses[id] = (metalnesses[id] ?? 0) / (counts[id] || 1);
    transmissions[id] = (transmissions[id] ?? 0) / (counts[id] || 1);
  }
  let crease: ReturnType<typeof projectedAtelierEdges> | undefined;
  return { geometry, get edges() { return (crease ??= projectedAtelierEdges(geometry)).edges; },
    get edgeOwners() { return (crease ??= projectedAtelierEdges(geometry)).edgeOwners; }, metalnesses, transmissions,
    worldFromClip: camera.matrixWorld.clone().multiply((camera as THREE.PerspectiveCamera).projectionMatrixInverse).toArray(),
    sectionRibLighting: { directional: directional.map((light) => ({ direction: toward(light).toArray(), color: light.color.toArray().map((v) => v * light.intensity) })),
      shadowMatrix: shadow?.matrix.toArray() ?? new THREE.Matrix4().toArray() },
    cutawayShadowCamera: { view: shadow?.camera.matrixWorldInverse.toArray() ?? geometry.view, projection: shadow?.camera.projectionMatrix.toArray() ?? geometry.projection },
    spectralLights: directional.map((light) => ({ direction: imageDirection(toward(light)), color: light.color.toArray(), intensity: light.intensity })),
    spectralHemisphere: { sky: hemisphere?.color.toArray() ?? [0, 0, 0], ground: hemisphere?.groundColor.toArray() ?? [0, 0, 0],
      intensity: hemisphere?.intensity ?? 0, up: hemisphere ? imageDirection(hemisphere.getWorldPosition(new THREE.Vector3()).normalize()) : [0, -1, 0] } };
}
