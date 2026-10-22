import * as THREE from "./vendor/three.module.min.js";
import { createSurfaceHatching, createHatchVisibilityAtlas, exactHatchVisible, visibleHatchSegmentIntervals } from "./surface-hatch-geometry.js";
import { shellVisibilityOwner, materialVisibilityKey } from "./material-visibility.js";
import { projectMembraneMasks } from "./projected-membranes.js";

export function createGeometryStudies(solids, size) {
  // The factory is lazy: every other study avoids curvature tracing entirely.
  const hatching = createSurfaceHatching(solids);
  let sectionTriangles = null,
    sectionRange = null;
  const worldSectionCache = new Map();
  function ensureWorldTriangles() {
    if (sectionTriangles) return;
    for (const mesh of solids) mesh.updateWorldMatrix(true, false);
    const data = [],
      point = new THREE.Vector3();
    let minY = Infinity,
      maxY = -Infinity;
    solids.slice(1).forEach((mesh, index) => {
      const pos = mesh.geometry.getAttribute("position"),
        idx = mesh.geometry.getIndex(),
        n = idx ? idx.count : pos.count;
      for (let i = 0; i + 2 < n; i += 3) {
        for (let k = 0; k < 3; k++) {
          point
            .fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k)
            .applyMatrix4(mesh.matrixWorld);
          data.push(point.x, point.y, point.z);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
        const at = data.length - 9,
          abx = data[at + 3] - data[at],
          aby = data[at + 4] - data[at + 1],
          abz = data[at + 5] - data[at + 2],
          acx = data[at + 6] - data[at],
          acy = data[at + 7] - data[at + 1],
          acz = data[at + 8] - data[at + 2];
        const nx = aby * acz - abz * acy,
          ny = abz * acx - abx * acz,
          nz = abx * acy - aby * acx,
          length = Math.hypot(nx, ny, nz) || 1;
        const direction =
          mesh.material.side === THREE.DoubleSide
            ? 0
            : mesh.material.side === THREE.BackSide
              ? -1
              : 1;
        data.push(
          index + 2,
          (nx / length) * direction,
          (ny / length) * direction,
          (nz / length) * direction,
        );
      }
    });
    sectionTriangles = new Float64Array(data);
    sectionRange = [minY, maxY];
  }
  function worldSections(count) {
    count = Math.round(Number(count));
    if (!Number.isFinite(count) || count < 6 || count > 48)
      throw new RangeError("Section count must be between 6 and 48");
    if (worldSectionCache.has(count)) {
      const value = worldSectionCache.get(count);
      worldSectionCache.delete(count);
      worldSectionCache.set(count, value);
      return value;
    }
    ensureWorldTriangles();
    const [minY, maxY] = sectionRange,
      step = (maxY - minY) / count,
      segments = [],
      seen = new Map(),
      extraNormals = new Map(),
      epsilon = 1e-8;
    for (let i = 0; i < sectionTriangles.length; i += 13) {
      const t = sectionTriangles,
        ymin = Math.min(t[i + 1], t[i + 4], t[i + 7]),
        ymax = Math.max(t[i + 1], t[i + 4], t[i + 7]);
      const first = Math.max(
          0,
          Math.ceil((ymin - minY) / step - 0.5 - epsilon),
        ),
        last = Math.min(
          count - 1,
          Math.floor((ymax - minY) / step - 0.5 + epsilon),
        );
      for (let level = first; level <= last; level++) {
        const y = minY + (level + 0.5) * step,
          points = [];
        const add = (x, z) => {
          if (
            !points.some(
              (p) =>
                Math.abs(p[0] - x) < epsilon && Math.abs(p[1] - z) < epsilon,
            )
          )
            points.push([x, z]);
        };
        if (
          Math.abs(t[i + 1] - y) < epsilon &&
          Math.abs(t[i + 4] - y) < epsilon &&
          Math.abs(t[i + 7] - y) < epsilon
        )
          continue;
        for (let edge = 0; edge < 3; edge++) {
          const a = i + edge * 3,
            b = i + ((edge + 1) % 3) * 3,
            da = t[a + 1] - y,
            db = t[b + 1] - y;
          if (Math.abs(da) < epsilon) add(t[a], t[a + 2]);
          if (
            (da < -epsilon && db > epsilon) ||
            (da > epsilon && db < -epsilon)
          ) {
            const u = da / (da - db);
            add(t[a] + (t[b] - t[a]) * u, t[a + 2] + (t[b + 2] - t[a + 2]) * u);
          }
        }
        if (points.length !== 2) continue;
        const [a, b] = points;
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < epsilon) continue;
        const keys = points
          .map((p) => p.map((v) => Math.round(v * 1e7)).join(","))
          .sort();
        const key = t[i + 9] + ":" + level + ":" + keys.join(":");
        if (seen.has(key)) {
          const index = seen.get(key),
            extra = extraNormals.get(index) || [];
          extra.push(t[i + 10], t[i + 11], t[i + 12]);
          extraNormals.set(index, extra);
          continue;
        }
        seen.set(key, segments.length / 11);
        segments.push(
          a[0],
          y,
          a[1],
          b[0],
          y,
          b[1],
          t[i + 9],
          y,
          t[i + 10],
          t[i + 11],
          t[i + 12],
        );
      }
    }
    const result = { data: new Float64Array(segments), extraNormals };
    worldSectionCache.set(count, result);
    while (worldSectionCache.size > 2)
      worldSectionCache.delete(worldSectionCache.keys().next().value);
    return result;
  }
  function projectSections(count, view, projection) {
    const record = worldSections(count),
      source = record.data,
      result = new Float32Array((source.length / 11) * 9),
      point = new THREE.Vector3(),
      normal = new THREE.Vector3();
    const facing = (x, y, z) => {
      normal.set(x, y, z);
      return normal.lengthSq() === 0 ? 1 : normal.transformDirection(view).z;
    };
    for (let i = 0, j = 0; i < source.length; i += 11, j += 9) {
      for (let end = 0; end < 2; end++) {
        const at = i + end * 3,
          out = j + end * 3;
        point
          .set(source[at], source[at + 1], source[at + 2])
          .applyMatrix4(view);
        const z = -point.z;
        point.applyMatrix4(projection);
        result[out] = ((point.x + 1) * size) / 2;
        result[out + 1] = ((1 - point.y) * size) / 2;
        result[out + 2] = z;
      }
      let visibleFacing = facing(source[i + 8], source[i + 9], source[i + 10]);
      const extra = record.extraNormals.get(i / 11) || [];
      for (let k = 0; k < extra.length; k += 3)
        visibleFacing = Math.max(
          visibleFacing,
          facing(extra[k], extra[k + 1], extra[k + 2]),
        );
      result[j + 6] = source[i + 6];
      result[j + 7] = source[i + 7];
      result[j + 8] = visibleFacing;
    }
    return result;
  }

  let surfaceSource = null;
  function projectSurfaceSamples(view, projection, materialVisibility) {
    if (!surfaceSource) {
      for (const mesh of solids) mesh.updateWorldMatrix(true, false);
      const triangles = [],
        a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3(),
        ab = new THREE.Vector3(),
        ac = new THREE.Vector3();
      let totalArea = 0;
      solids.slice(1).forEach((mesh, objectIndex) => {
        const positions = mesh.geometry.getAttribute("position"),
          indices = mesh.geometry.getIndex(),
          count = indices ? indices.count : positions.count;
        for (let i = 0; i + 2 < count; i += 3) {
          a.fromBufferAttribute(
            positions,
            indices ? indices.getX(i) : i,
          ).applyMatrix4(mesh.matrixWorld);
          b.fromBufferAttribute(
            positions,
            indices ? indices.getX(i + 1) : i + 1,
          ).applyMatrix4(mesh.matrixWorld);
          c.fromBufferAttribute(
            positions,
            indices ? indices.getX(i + 2) : i + 2,
          ).applyMatrix4(mesh.matrixWorld);
          const area =
            ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
          if (area <= 1e-12) continue;
          totalArea += area;
          triangles.push({
            a: a.clone(),
            b: b.clone(),
            c: c.clone(),
            normal:
              mesh.material.side === THREE.DoubleSide
                ? new THREE.Vector3()
                : ab
                    .clone()
                    .normalize()
                    .multiplyScalar(
                      mesh.material.side === THREE.BackSide ? -1 : 1,
                    ),
            id: objectIndex + 2,
            limit: totalArea,
          });
        }
      });
      const count = totalArea > 0 ? 36000 : 0;
      surfaceSource = new Float32Array(count * 7);
      let state = 0x51f15e;
      const random = () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = 0; i < count; i++) {
        const target = random() * totalArea;
        let low = 0,
          high = triangles.length - 1;
        while (low < high) {
          const middle = (low + high) >>> 1;
          if (target < triangles[middle].limit) high = middle;
          else low = middle + 1;
        }
        const triangle = triangles[low],
          root = Math.sqrt(random()),
          v = random(),
          wa = 1 - root,
          wb = root * (1 - v),
          wc = root * v;
        surfaceSource.set(
          [
            triangle.a.x * wa + triangle.b.x * wb + triangle.c.x * wc,
            triangle.a.y * wa + triangle.b.y * wb + triangle.c.y * wc,
            triangle.a.z * wa + triangle.b.z * wb + triangle.c.z * wc,
            triangle.id,
            triangle.normal.x,
            triangle.normal.y,
            triangle.normal.z,
          ],
          i * 7,
        );
      }
    }
    const output = new Float32Array((surfaceSource.length / 7) * 6),
      point = new THREE.Vector3(),
      direction = new THREE.Vector3();
    for (let i = 0, j = 0; i < surfaceSource.length; i += 7, j += 6) {
      point
        .set(surfaceSource[i], surfaceSource[i + 1], surfaceSource[i + 2])
        .applyMatrix4(view);
      const distance = -point.z;
      direction.set(
        surfaceSource[i + 4],
        surfaceSource[i + 5],
        surfaceSource[i + 6],
      );
      const facing =
        shellVisibilityOwner(materialVisibility, surfaceSource[i + 3]) || direction.lengthSq() === 0 ? 1 : direction.transformDirection(view).z;
      point.applyMatrix4(projection);
      output.set(
        [
          ((point.x + 1) * size) / 2,
          ((1 - point.y) * size) / 2,
          distance,
          surfaceSource[i + 3],
          i / 7,
          facing,
        ],
        j,
      );
    }
    return output;
  }

  let boundarySource = null;
  function projectOpenBoundaries(view, projection) {
    if (!boundarySource) {
      const result = [],
        point = new THREE.Vector3();
      solids.slice(1).forEach((mesh, meshIndex) => {
        mesh.updateWorldMatrix(true, false);
        const position = mesh.geometry.getAttribute("position"),
          index = mesh.geometry.getIndex(),
          count = index ? index.count : position.count,
          vertices = new Float64Array(position.count * 3),
          keys = [];
        let minY = Infinity,
          maxY = -Infinity;
        for (let i = 0; i < position.count; i++) {
          point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
          vertices.set([point.x, point.y, point.z], i * 3);
          keys.push(
            [point.x, point.y, point.z]
              .map((v) => Math.round(v * 1e6))
              .join(","),
          );
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
        const edges = new Map();
        for (let i = 0; i + 2 < count; i += 3) {
          const triangle = [0, 1, 2].map((k) =>
            index ? index.getX(i + k) : i + k,
          );
          const a = triangle[0] * 3,
            b = triangle[1] * 3,
            c = triangle[2] * 3,
            ux = vertices[b] - vertices[a],
            uy = vertices[b + 1] - vertices[a + 1],
            uz = vertices[b + 2] - vertices[a + 2],
            vx = vertices[c] - vertices[a],
            vy = vertices[c + 1] - vertices[a + 1],
            vz = vertices[c + 2] - vertices[a + 2];
          if (
            (uy * vz - uz * vy) ** 2 +
              (uz * vx - ux * vz) ** 2 +
              (ux * vy - uy * vx) ** 2 <
            1e-20
          )
            continue;
          for (let k = 0; k < 3; k++) {
            const a = triangle[k],
              b = triangle[(k + 1) % 3],
              ka = keys[a],
              kb = keys[b];
            if (ka === kb) continue;
            const key = ka < kb ? ka + "|" + kb : kb + "|" + ka,
              edge = edges.get(key);
            if (edge) edge.count++;
            else edges.set(key, { a, b, count: 1 });
          }
        }
        for (const edge of edges.values())
          if (edge.count === 1) {
            const a = edge.a * 3,
              b = edge.b * 3,
              top = (vertices[a + 1] + vertices[b + 1]) * 0.5,
              upper = maxY > minY ? (top - minY) / (maxY - minY) : 0;
            result.push(
              vertices[a],
              vertices[a + 1],
              vertices[a + 2],
              vertices[b],
              vertices[b + 1],
              vertices[b + 2],
              meshIndex + 2,
              upper,
              result.length / 9,
            );
          }
      });
      boundarySource = new Float64Array(result);
    }
    const output = new Float64Array(boundarySource.length),
      point = new THREE.Vector3();
    for (let i = 0; i < boundarySource.length; i += 9) {
      for (let k = 0; k < 2; k++) {
        point.fromArray(boundarySource, i + k * 3).applyMatrix4(view);
        const depth = -point.z;
        point.applyMatrix4(projection);
        output.set(
          [((point.x + 1) * size) / 2, ((1 - point.y) * size) / 2, depth],
          i + k * 3,
        );
      }
      output.set(boundarySource.subarray(i + 6, i + 9), i + 6);
    }
    return output;
  }

  const voxelCache = new Map();
  function worldVoxels(cellSize) {
    cellSize = Math.round(Number(cellSize) * 1000) / 1000;
    if (!Number.isFinite(cellSize) || cellSize < 0.06 || cellSize > 0.22)
      throw new RangeError("Voxel size must be between .06 and .22");
    if (voxelCache.has(cellSize)) {
      const value = voxelCache.get(cellSize);
      voxelCache.delete(cellSize);
      voxelCache.set(cellSize, value);
      return value;
    }
    ensureWorldTriangles();
    const origin = [0.019, 0.011, 0.023],
      occupied = new Map(),
      a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      triangle = new THREE.Triangle(a, b, c),
      box = new THREE.Box3(),
      center = new THREE.Vector3(),
      closest = new THREE.Vector3(),
      half = cellSize * 0.5,
      key = (x, y, z) => x + "," + y + "," + z;
    for (let i = 0; i < sectionTriangles.length; i += 13) {
      a.fromArray(sectionTriangles, i);
      b.fromArray(sectionTriangles, i + 3);
      c.fromArray(sectionTriangles, i + 6);
      if (triangle.getArea() < 1e-12) continue;
      const lo = [
          Math.min(a.x, b.x, c.x),
          Math.min(a.y, b.y, c.y),
          Math.min(a.z, b.z, c.z),
        ].map((v, k) => Math.floor((v - origin[k]) / cellSize - 1e-9)),
        hi = [
          Math.max(a.x, b.x, c.x),
          Math.max(a.y, b.y, c.y),
          Math.max(a.z, b.z, c.z),
        ].map((v, k) => Math.floor((v - origin[k]) / cellSize + 1e-9)),
        id = sectionTriangles[i + 9];
      for (let z = lo[2]; z <= hi[2]; z++)
        for (let y = lo[1]; y <= hi[1]; y++)
          for (let x = lo[0]; x <= hi[0]; x++) {
            box.min.set(
              origin[0] + x * cellSize,
              origin[1] + y * cellSize,
              origin[2] + z * cellSize,
            );
            box.max.copy(box.min).addScalar(cellSize);
            center.copy(box.min).addScalar(half);
            // Match the candidate-range tolerance at exact grid planes, without
            // changing the grid geometry or nearest-surface ownership point.
            box.expandByScalar(cellSize * 1e-9);
            if (!box.intersectsTriangle(triangle)) continue;
            triangle.closestPointToPoint(center, closest);
            const distance = center.distanceToSquared(closest),
              code = key(x, y, z),
              old = occupied.get(code);
            if (
              !old ||
              distance < old.distance - 1e-12 ||
              (Math.abs(distance - old.distance) <= 1e-12 && id < old.id)
            )
              occupied.set(code, { x, y, z, id, distance });
          }
    }
    const cells = [],
      faces = [];
    for (const cell of occupied.values()) {
      const grid = [cell.x, cell.y, cell.z],
        mid = grid.map((v, k) => origin[k] + (v + 0.5) * cellSize);
      cells.push(...grid, cell.id);
      for (let axis = 0; axis < 3; axis++)
        for (const sign of [-1, 1]) {
          const adjacent = [...grid];
          adjacent[axis] += sign;
          if (occupied.has(key(...adjacent))) continue;
          const u = (axis + 1) % 3,
            v = (axis + 2) % 3;
          for (const [su, sv] of [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ]) {
            const point = [...mid];
            point[axis] += sign * half;
            point[u] += su * sign * half;
            point[v] += sv * half;
            faces.push(...point);
          }
          for (let k = 0; k < 3; k++) faces.push(k === axis ? sign : 0);
          faces.push(cell.id, ...grid);
        }
    }
    const result = {
      cellSize,
      origin,
      cells: new Float64Array(cells),
      faces: new Float64Array(faces),
    };
    voxelCache.set(cellSize, result);
    while (voxelCache.size > 2)
      voxelCache.delete(voxelCache.keys().next().value);
    return result;
  }
  function projectVoxelFaces(cellSize, view, projection) {
    const source = worldVoxels(cellSize),
      output = [],
      point = new THREE.Vector3(),
      normal = new THREE.Vector3(),
      center = new THREE.Vector3();
    for (let i = 0; i < source.faces.length; i += 19) {
      normal.fromArray(source.faces, i + 12).transformDirection(view);
      if (normal.z <= 1e-10) continue;
      const face = [];
      for (let k = 0; k < 4; k++) {
        point
          .fromArray(source.faces, i + k * 3)
          .applyMatrix4(view)
          .applyMatrix4(projection);
        face.push((point.x + 1) * size * 0.5, (1 - point.y) * size * 0.5);
      }
      if (
        [0, 2, 4, 6].every((k) => face[k] < -1) ||
        [0, 2, 4, 6].every((k) => face[k] > size + 1) ||
        [1, 3, 5, 7].every((k) => face[k] < -1) ||
        [1, 3, 5, 7].every((k) => face[k] > size + 1)
      )
        continue;
      center
        .set(
          ...source.origin.map(
            (v, k) => v + (source.faces[i + 16 + k] + 0.5) * source.cellSize,
          ),
        )
        .applyMatrix4(view);
      if (center.z >= 0) continue;
      face.push(
        normal.x,
        -normal.y,
        normal.z,
        source.faces[i + 15],
        -center.z,
        source.faces[i + 16],
        source.faces[i + 17],
        source.faces[i + 18],
      );
      output.push(face);
    }
    output.sort((a, b) => b[12] - a[12]);
    return new Float64Array(output.flat());
  }

  let visibilityCache = null;
  function surfaceVisibility(view, projection, materialVisibility) {
    const descriptorKey = materialVisibilityKey(materialVisibility);
    if (!descriptorKey) return null;
    const key = descriptorKey + ':' + view.toArray() + ':' + projection.toArray();
    if (visibilityCache?.key === key) return visibilityCache.value;
    // A visibility-only original triangle view avoids fitting/tracing curvature
    // merely to test a point or a Naturalist chord.
    const prepared = solids.map((mesh, i) => {
      mesh.updateWorldMatrix(true, false);
      const pos = mesh.geometry.getAttribute('position'), index = mesh.geometry.index,
        faces = [], count = index ? index.count : pos.count,
        start = Math.max(0, mesh.geometry.drawRange.start),
        end = Math.min(count, start + mesh.geometry.drawRange.count);
      for (let at=start;at+2<end;at+=3) {
        const vertices = [0,1,2].map(k => new THREE.Vector3().fromBufferAttribute(pos,index ? index.getX(at+k) : at+k).applyMatrix4(mesh.matrixWorld)),
          normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
        faces.push({ p: vertices.map(v => v.toArray()), normal: normal.toArray() });
      }
      return { mesh, id:i+1, faces };
    });
    const atlas = createHatchVisibilityAtlas(prepared, view, projection, size, { materialVisibility });
    const value = {
      atlas,
      point: (x,y,z,id,tolerance) => exactHatchVisible(atlas,x,y,z,id,tolerance),
      intervals: (a,b,id,tolerance) => visibleHatchSegmentIntervals(atlas,a,b,id,tolerance),
    };
    visibilityCache = {key,value};
    return value;
  }
  return {
    surfaceVisibility,
    surfaceHatches: (seed, view, projection, materialVisibility) =>
      hatching.visible(seed, view, projection, size, materialVisibility),
    membraneMasks: (view, projection) =>
      projectMembraneMasks(
        snapshotGeometryStudies(solids, size, view, projection),
      ),
    worldVoxels,
    voxelFaces: projectVoxelFaces,
    openBoundaries: projectOpenBoundaries,
    surfaceSamples: projectSurfaceSamples,
    sectionLines: projectSections,
  };
}

export function snapshotGeometryStudies(solids, size, view, projection) {
  return {
    version: 1,
    size,
    view: view.toArray(),
    projection: projection.toArray(),
    meshes: solids.map((mesh) => ({
      position: mesh.geometry.getAttribute("position").array,
      index: mesh.geometry.index?.array || null,
      drawRange: { ...mesh.geometry.drawRange },
      matrix: mesh.matrixWorld.toArray(),
      side: mesh.material.side,
    })),
  };
}
export function restoreGeometryStudies(snapshot, materialVisibility) {
  materialVisibilityKey(materialVisibility);
  if (snapshot.version !== 1) throw Error("Unsupported geometry snapshot");
  const solids = snapshot.meshes.map((source) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(source.position, 3),
    );
    if (source.index)
      geometry.setIndex(new THREE.BufferAttribute(source.index, 1));
    if (source.drawRange)
      geometry.setDrawRange(source.drawRange.start, source.drawRange.count);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ side: source.side }),
    );
    mesh.matrixAutoUpdate = false;
    mesh.matrix.fromArray(source.matrix);
    mesh.updateMatrixWorld(true);
    return mesh;
  });
  const studies = createGeometryStudies(solids, snapshot.size),
    view = new THREE.Matrix4().fromArray(snapshot.view),
    projection = new THREE.Matrix4().fromArray(snapshot.projection),
    sections = new Map(),
    voxelViews = new Map(),
    hatchViews = new Map();
  let points, boundaries, membranes;
  return {
    ...(materialVisibility ? { surfaceVisibility: () => studies.surfaceVisibility(view, projection, materialVisibility) } : {}),
    membraneMasks: () =>
      membranes ?? (membranes = studies.membraneMasks(view, projection)),
    surfaceHatches: (seed) => {
      if (hatchViews.has(seed)) {
        const value = hatchViews.get(seed);
        hatchViews.delete(seed);
        hatchViews.set(seed, value);
        return value;
      }
      const value = studies.surfaceHatches(seed, view, projection, materialVisibility);
      hatchViews.set(seed, value);
      while (hatchViews.size > 2)
        hatchViews.delete(hatchViews.keys().next().value);
      return value;
    },
    voxelFaces: (cellSize) => {
      cellSize = Math.round(Number(cellSize) * 1000) / 1000;
      if (voxelViews.has(cellSize)) {
        const value = voxelViews.get(cellSize);
        voxelViews.delete(cellSize);
        voxelViews.set(cellSize, value);
        return value;
      }
      const value = studies.voxelFaces(cellSize, view, projection);
      voxelViews.set(cellSize, value);
      while (voxelViews.size > 2)
        voxelViews.delete(voxelViews.keys().next().value);
      return value;
    },
    openBoundaries: () =>
      boundaries ?? (boundaries = studies.openBoundaries(view, projection)),
    surfaceSamples: () =>
      points ?? (points = studies.surfaceSamples(view, projection, materialVisibility)),
    sectionLines: (count) => {
      count = Math.round(Number(count));
      if (sections.has(count)) {
        const value = sections.get(count);
        sections.delete(count);
        sections.set(count, value);
        return value;
      }
      const value = studies.sectionLines(count, view, projection);
      sections.set(count, value);
      while (sections.size > 2) sections.delete(sections.keys().next().value);
      return value;
    },
  };
}
