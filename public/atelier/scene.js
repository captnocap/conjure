import * as THREE from "./vendor/three.module.min.js";
import { createStableOpaqueSort } from "./capture-order.js";
import {
  createGeometryStudies,
  snapshotGeometryStudies,
} from "./geometry-studies.js";
import { createMaterialLibrary } from "./material-library.js";
import {
  bakeMaterialGeometry,
  createMaterialBakeGeometry,
  applyOpaqueMask,
  applyShellMask,
  opaqueAssignmentMask,
} from "./material-bake.js";
import {
  defaultMaterials,
  validateMaterials,
  materialSignature,
  PERFORATED_SHELL_ID,
  MODEL_VERSION,
} from "./material-state.js";
/** Immutable reference geometry. Rendering controls alter only the shared view/light. */
export function createReference(container, size = 720) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.domElement.setAttribute(
    "aria-label",
    "Three-dimensional Quiet Garden reference scene",
  );
  renderer.domElement.setAttribute("role", "img");
  container.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e5e7de");
  const camera = new THREE.OrthographicCamera(-4.1, 4.1, 4.1, -4.1, 0.1, 100);
  const hemi = new THREE.HemisphereLight("#ffffff", "#708075", 2.25);
  scene.add(hemi);
  const light = new THREE.DirectionalLight("#fff5df", 4.5);
  light.position.set(-4, 8, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -7;
  light.shadow.camera.right = 7;
  light.shadow.camera.top = 7;
  light.shadow.camera.bottom = -7;
  light.shadow.normalBias = 0.025;
  light.shadow.bias = -0.0002;
  light.shadow.radius = 5;
  scene.add(light);
  const fill = new THREE.DirectionalLight("#d0e4ef", 0.65);
  fill.position.set(4, 3, -4);
  scene.add(fill);
  const mat = (color, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const limestone = mat("#d9cabb"),
    clay = mat("#b26148", 0.72),
    green = mat("#516b48"),
    brass = mat("#bc933d", 0.32, 0.72),
    plaster = mat("#afbdaf"),
    pink = mat("#d29c8e");
  let count = 0;
  const solids = [];
  function add(geo, material, x, y, z) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    solids.push(mesh);
    count++;
    return mesh;
  }
  const floor = add(
    new THREE.PlaneGeometry(200, 200),
    mat("#e5e7de"),
    0,
    -0.12,
    0,
  );
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(5.7, 0.24, 4.2), limestone, 0, 0, 0);
  const s = new THREE.Shape();
  s.moveTo(-1.7, 0);
  s.lineTo(-1.7, 2.2);
  s.absarc(0, 2.2, 1.7, Math.PI, 0, true);
  s.lineTo(1.7, 0);
  s.lineTo(1.08, 0);
  s.lineTo(1.08, 2.2);
  s.absarc(0, 2.2, 1.08, 0, Math.PI, false);
  s.lineTo(-1.08, 0);
  s.closePath();
  add(
    new THREE.ExtrudeGeometry(s, {
      depth: 0.58,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.055,
      bevelThickness: 0.055,
      curveSegments: 50,
    }),
    limestone,
    -0.65,
    0.17,
    -1.5,
  );
  for (let i = 0; i < 3; i++)
    add(
      new THREE.BoxGeometry(1.5, 0.3 * (i + 1), 1.2),
      plaster,
      1.8,
      0.15 * (i + 1) + 0.12,
      0.8 - i * 0.56,
    );
  const profile = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const r =
      0.31 +
      0.31 * Math.sin(Math.PI * t) ** 0.8 -
      0.14 * Math.exp(-(((t - 0.9) / 0.15) ** 2));
    profile.push(new THREE.Vector2(r, 1.65 * t));
  }
  const vase = add(
    new THREE.LatheGeometry(profile, 72),
    clay,
    -1.45,
    0.13,
    0.9,
  );
  vase.material.side = THREE.DoubleSide;
  add(
    new THREE.TorusGeometry(0.72, 0.19, 24, 96),
    brass,
    0.1,
    1.05,
    0.5,
  ).rotation.y = -0.28;
  add(new THREE.CylinderGeometry(0.58, 0.68, 0.33, 64), pink, 0.1, 0.28, 0.5);
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#9ac1b5",
    roughness: 0.12,
    metalness: 0,
    transmission: 0.74,
    thickness: 0.8,
    ior: 1.45,
    transparent: true,
    opacity: 0.93,
  });
  add(new THREE.SphereGeometry(0.53, 48, 36), glass, 1.82, 1.57, -0.29);
  const stemMat = mat("#394c34");
  const branch = (points) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return add(
      new THREE.TubeGeometry(curve, 24, 0.023, 8, false),
      stemMat,
      -1.45,
      1.7,
      0.9,
    );
  };
  branch([
    [0, 0, 0],
    [0.1, 0.55, 0],
    [-0.05, 1.2, 0],
    [0.2, 1.95, 0.02],
  ]);
  const branches = [
    [-0.04, 0.63, 0, -0.58, 1.05, 0.01],
    [0.02, 0.85, 0, 0.62, 1.26, 0.03],
    [0.02, 1.34, 0, -0.48, 1.58, 0.03],
    [0.12, 1.67, 0, 0.48, 1.93, 0.01],
  ];
  branches.forEach(([x, y, z, tx, ty, tz], i) => {
    branch([
      [x, y, z],
      [(x + tx) * 0.5, (y + ty) * 0.5 + 0.12, 0],
      [tx, ty, tz],
    ]);
    const leaf = add(
      new THREE.SphereGeometry(1, 20, 12),
      green,
      -1.45 + tx,
      1.7 + ty,
      0.9 + tz,
    );
    leaf.scale.set(0.31, 0.12, 0.09);
    leaf.rotation.z = (i % 2 ? -1 : 1) * 0.48;
    leaf.rotation.x = 0.3;
  });
  add(
    new THREE.IcosahedronGeometry(0.35, 2),
    mat("#a8ac97"),
    0.92,
    0.42,
    1.25,
  ).scale.set(1.2, 0.75, 1);
  // Derive crease edges once. They are never added to the reference scene.
  const creaseSources = solids.slice(1).map((mesh, index) => ({
    mesh,
    id: index + 2,
    vertices: new THREE.EdgesGeometry(mesh.geometry, 25).getAttribute(
      "position",
    ),
  }));
  function projectedEdges() {
    const edges = [],
      world = new THREE.Vector3(),
      view = new THREE.Vector3();
    scene.updateMatrixWorld();
    for (const { mesh, vertices } of creaseSources) {
      for (let i = 0; i < vertices.count; i += 2) {
        const pair = [];
        for (let endpoint = 0; endpoint < 2; endpoint++) {
          world
            .fromBufferAttribute(vertices, i + endpoint)
            .applyMatrix4(mesh.matrixWorld);
          view.copy(world).applyMatrix4(camera.matrixWorldInverse);
          const depth = -view.z;
          world.project(camera);
          pair.push([
            ((world.x + 1) * size) / 2,
            ((1 - world.y) * size) / 2,
            depth,
          ]);
        }
        edges.push(pair);
      }
    }
    return edges;
  }
  renderer.setOpaqueSort?.(createStableOpaqueSort(solids));
  // Drawing geometry always uses the original triangles. Render-only surface
  // attributes or planar refinement must never move seeded marks or section cuts.
  const studySolids = solids.map((mesh) => {
    mesh.updateWorldMatrix(true, false);
    const copy = mesh.clone();
    copy.matrixAutoUpdate = false;
    copy.matrix.copy(mesh.matrixWorld);
    copy.updateMatrixWorld(true);
    return copy;
  });
  const geometryStudies = createGeometryStudies(studySolids, size);
  const sampler = document.createElement("canvas");
  sampler.width = size;
  sampler.height = size;
  const ctx = sampler.getContext("2d", { willReadFrequently: true });
  function capture() {
    ctx.drawImage(renderer.domElement, 0, 0);
    return ctx.getImageData(0, 0, size, size).data;
  }
  const target = new THREE.WebGLRenderTarget(size, size, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  const originalMaterials = solids.map((mesh) => mesh.material);
  const originalCastShadows = solids.map((mesh) => mesh.castShadow);
  const originalReceiveShadows = solids.map((mesh) => mesh.receiveShadow);
  const originalCustomDepthMaterials = solids.map((mesh) => mesh.customDepthMaterial);
  const originalGeometries = solids.map((mesh) => mesh.geometry);
  const originalAlbedos = originalMaterials.map(
    (material) =>
      new THREE.MeshBasicMaterial({
        color: material.color,
        side: material.side,
        toneMapped: false,
      }),
  );
  let activeMaterials = originalMaterials,
    activeGeometries = originalGeometries,
    activeAlbedos = null,
    activeAuxiliary = null,
    activeCustomDepthMaterials = originalCustomDepthMaterials,
    activeShellMask = 0,
    materialLibrary = null,
    materialBake = null,
    bakedGeometries = null,
    selectedMaterials = defaultMaterials(),
    materialKey = materialSignature(selectedMaterials);
  function applyMaterials(settings) {
    // Validate the complete map before allocating a bake or touching scene state.
    const next = validateMaterials(settings),
      key = materialSignature(next),
      shellMask = Object.entries(next.assignments).reduce((mask, [id, material]) =>
        material === PERFORATED_SHELL_ID ? (mask | 2 ** (Number(id) - 1)) >>> 0 : mask, 0);
    if (key === materialKey) {
      // The shell cache also observes attribute replacement and version changes.
      if (shellMask) applyShellMask(materialBake, opaqueAssignmentMask(solids.length, next.assignments), shellMask, bakedGeometries);
      return;
    }
    const customized = Object.keys(next.assignments).length > 0,
      opaqueMask = opaqueAssignmentMask(solids.length, next.assignments);
    let nextLibrary = materialLibrary, nextBake = materialBake, nextBaked = bakedGeometries;
    let nextMaterials, nextAlbedos, nextGeometries, nextAuxiliary, nextCustomDepth;
    try {
      if (customized && !nextLibrary) {
        scene.updateMatrixWorld(true);
        nextBake = bakeMaterialGeometry(solids, {
          samples: 16,
          maxDistance: 1.5,
          cacheAOVisibility: true,
          cachePerforatedShell: true,
          refineAO: { maxEdgeLength: 0.2, meshIndices: [1, 2, 3, 4, 5, 8] },
        });
        nextBaked = [];
        for (let index = 0; index < solids.length; index++)
          nextBaked.push(nextBake.refined?.meshes[index]?.geometry ||
            createMaterialBakeGeometry(solids[index], nextBake.meshes[index]));
        nextLibrary = createMaterialLibrary(renderer);
      }
      nextMaterials = solids.map((mesh, index) => {
        const id = next.assignments[index + 1];
        return id ? nextLibrary.create(id, { side: originalMaterials[index].side }) : originalMaterials[index];
      });
      nextAlbedos = customized ? solids.map((mesh, index) => {
        const id = next.assignments[index + 1];
        return id ? nextLibrary.createAlbedo(id, { side: originalMaterials[index].side }) : originalAlbedos[index];
      }) : null;
      nextGeometries = solids.map((mesh, index) => {
        const id = next.assignments[index + 1];
        return id ? nextLibrary.prepareGeometry(id, studySolids[index], nextBaked[index], { objectId: index + 1 }) : originalGeometries[index];
      });
      nextAuxiliary = shellMask ? Object.fromEntries([
        ["normal", normalMaterials], ["depth", depthMaterials],
        ["identity", identityMaterials], ["diffuse", diffuseMaterials],
      ].map(([pass, materials]) => [pass, materials.map((material, index) =>
        next.assignments[index + 1] === PERFORATED_SHELL_ID
          ? nextLibrary.createAuxiliary(PERFORATED_SHELL_ID, material, { pass }) : material)])) : null;
      nextCustomDepth = solids.map((mesh, index) => next.assignments[index + 1] === PERFORATED_SHELL_ID
        ? nextLibrary.createCustomDepth(PERFORATED_SHELL_ID) : originalCustomDepthMaterials[index]);
      // All factories, mappings and inward attributes are prepared before any AO
      // changes. The update validates every target and stages all buffer values.
      if (nextBake) {
        if (shellMask || activeShellMask) applyShellMask(nextBake, opaqueMask, shellMask, nextBaked);
        else applyOpaqueMask(nextBake, opaqueMask, nextBaked);
      }
    } catch (error) {
      if (nextLibrary !== materialLibrary) nextLibrary?.dispose();
      else materialLibrary?.releaseUnusedGeometry(activeGeometries);
      if (nextBake !== materialBake) {
        const abandoned = new Set([...(nextBaked || []), ...(nextBake?.refined?.meshes || []).map(item => item?.geometry).filter(Boolean)]);
        for (const geometry of abandoned) geometry.dispose();
      }
      throw error;
    }
    materialLibrary = nextLibrary;
    materialBake = nextBake;
    bakedGeometries = nextBaked;
    activeMaterials = nextMaterials;
    activeAlbedos = nextAlbedos;
    activeGeometries = nextGeometries;
    activeAuxiliary = nextAuxiliary;
    activeCustomDepthMaterials = nextCustomDepth;
    activeShellMask = shellMask;
    solids.forEach((mesh, index) => {
      mesh.geometry = activeGeometries[index];
      mesh.material = activeMaterials[index];
      mesh.customDepthMaterial = activeCustomDepthMaterials[index];
      // Explicit frosted glass alone suppresses the hard opaque caster.
      mesh.castShadow = activeMaterials[index].userData.materialId === "frosted-glass"
        ? false : originalCastShadows[index];
      mesh.receiveShadow = originalReceiveShadows[index];
    });
    materialLibrary?.releaseUnusedGeometry(activeGeometries);
    selectedMaterials = next;
    materialKey = key;
  }
  const normalMaterials = originalMaterials.map(
    (material) => new THREE.MeshNormalMaterial({ side: material.side }),
  );
  const depthMaterials = originalMaterials.map(
    (material) =>
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        side: material.side,
      }),
  );
  const diffuseMaterials = originalMaterials.map(
    (material) =>
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.18, 0.18, 0.18),
        side: material.side,
        toneMapped: false,
      }),
  );
  const assignGeometries = (geometries) =>
    solids.forEach((mesh, index) => {
      mesh.geometry = geometries[index];
    });
  const assignMaterials = (materials) =>
    solids.forEach((mesh, index) => {
      mesh.material = materials[index];
    });
  const identityMaterials = solids.map(
    (mesh, index) =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color((index + 1) / 255, 0, 0),
        toneMapped: false,
        side: originalMaterials[index].side,
      }),
  );
  function captureTarget() {
    const bytes = new Uint8Array(size * size * 4),
      topDown = new Uint8Array(bytes.length);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, bytes);
    for (let row = 0; row < size; row++)
      topDown.set(
        bytes.subarray((size - 1 - row) * size * 4, (size - row) * size * 4),
        row * size * 4,
      );
    return topDown;
  }
  function render({
    orbit = 0,
    time = 25,
    materials = defaultMaterials(),
  } = {}) {
    applyMaterials(materials);
    const yaw = ((39 + orbit) * Math.PI) / 180;
    camera.position.set(Math.sin(yaw) * 12, 7.5, Math.cos(yaw) * 12);
    camera.lookAt(0, 1.65, 0);
    camera.updateMatrixWorld();
    const theta = (time / 100 - 0.25) * Math.PI;
    light.position.set(
      -4 * Math.cos(theta) + 5 * Math.sin(theta),
      8,
      5 * Math.cos(theta) + 4 * Math.sin(theta),
    );
    // r180 temporarily mutates tone mapping and DoubleSide optical materials
    // during its transmission prepass. Guard the initial beauty draw as well as
    // auxiliary captures and the final reference redraw against interruptions.
    const background = scene.background,
      toneMapping = renderer.toneMapping,
      viewport = camera.viewport,
      renderTarget = renderer.getRenderTarget?.() ?? null,
      captureCastShadows = solids.map(mesh => mesh.castShadow),
      captureReceiveShadows = solids.map(mesh => mesh.receiveShadow),
      clearColor = renderer.getClearColor?.(new THREE.Color()),
      clearAlpha = renderer.getClearAlpha?.(),
      sides = new Map(
        [...activeMaterials, ...(activeAlbedos || []), ...(activeAuxiliary ? Object.values(activeAuxiliary).flat() : []), ...activeCustomDepthMaterials.filter(Boolean)].map((material) => [material, { side: material.side, shadowSide: material.shadowSide }]),
      );
    let color,
      normal,
      depth,
      identity,
      diffuse,
      albedo = null,
      beautyRendered = false,
      captureError = null;
    const restoreReference = () => {
      for (const [material, { side, shadowSide }] of sides) {
        if (material.side !== side || material.shadowSide !== shadowSide) {
          material.side = side;
          material.shadowSide = shadowSide;
          material.needsUpdate = true;
        }
      }
      assignGeometries(activeGeometries);
      assignMaterials(activeMaterials);
      solids.forEach((mesh, index) => {
        mesh.customDepthMaterial = activeCustomDepthMaterials[index];
        mesh.castShadow = captureCastShadows[index];
        mesh.receiveShadow = captureReceiveShadows[index];
      });
      scene.overrideMaterial = null;
      scene.background = background;
      renderer.toneMapping = toneMapping;
      camera.viewport = viewport;
      if (clearColor) renderer.setClearColor(clearColor, clearAlpha);
      renderer.setRenderTarget(renderTarget);
    };
    try {
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      color = capture();
      beautyRendered = true;
      // Auxiliary pixels describe the same rendered surface as beauty. Seeded
      // geometry studies above retain their untouched original triangles.
      assignGeometries(activeGeometries);
      assignMaterials(activeAuxiliary?.normal || normalMaterials);
      renderer.render(scene, camera);
      normal = capture();
      renderer.setRenderTarget(target);
      scene.background = new THREE.Color(0, 0, 0);
      assignMaterials(activeAuxiliary?.depth || depthMaterials);
      renderer.render(scene, camera);
      depth = captureTarget();
      assignMaterials(activeAuxiliary?.identity || identityMaterials);
      renderer.render(scene, camera);
      identity = captureTarget();
      if (activeAlbedos) {
        assignGeometries(activeGeometries);
        assignMaterials(activeAlbedos);
        renderer.render(scene, camera);
        albedo = captureTarget();
      }
      assignGeometries(activeGeometries);
      assignMaterials(activeAuxiliary?.diffuse || diffuseMaterials);
      renderer.render(scene, camera);
      diffuse = captureTarget();
    } catch (error) {
      captureError = error;
    } finally {
      restoreReference();
      try {
        // If the first beauty draw itself failed, leave the recovered state for
        // a user retry rather than repeating the same failed draw immediately.
        if (beautyRendered) renderer.render(scene, camera);
      } catch (error) {
        captureError ||= error;
      } finally {
        restoreReference();
      }
    }
    if (captureError) {
      renderer.shadowMap.needsUpdate = true;
      throw captureError;
    }
    const capturedView = camera.matrixWorldInverse.clone(),
      capturedProjection = camera.projectionMatrix.clone(),
      materialVisibility = activeShellMask ? {
        model: MODEL_VERSION,
        objectIds: Object.keys(selectedMaterials.assignments).map(Number)
          .filter(id => selectedMaterials.assignments[id] === PERFORATED_SHELL_ID)
          .sort((a, b) => a - b),
      } : null;
    // Read-only proxy lighting. Clone the shadow camera so this metadata never
    // changes the reference renderer's shadow map or its update state.
    const sectionShadow = light.shadow.clone();
    sectionShadow.camera.updateProjectionMatrix();
    sectionShadow.updateMatrices(light);
    const sectionRibLighting = {
      directional: [light, fill].map((source) => {
        // Match Three's view-space directional-light convention, then restore
        // world coordinates in the same order as the reviewed proxy bake.
        const direction = source.position.clone()
          .setFromMatrixPosition(source.matrixWorld)
          .sub(source.target.position.clone().setFromMatrixPosition(source.target.matrixWorld))
          .transformDirection(capturedView).toArray();
        const view = capturedView.elements;
        const world = [0, 1, 2].map((axis) =>
          view[axis * 4] * direction[0] + view[axis * 4 + 1] * direction[1] +
          view[axis * 4 + 2] * direction[2]);
        const length = Math.hypot(...world);
        return { direction: world.map((value) => value / length),
          color: source.color.toArray().map((value) => value * source.intensity) };
      }),
      shadowMatrix: sectionShadow.matrix.toArray(),
    };
    const capturedSections = new Map(),
      capturedVoxels = new Map(),
      capturedHatches = new Map();
    const sectionLines = (count) => {
      count = Math.round(Number(count));
      if (capturedSections.has(count)) {
        const value = capturedSections.get(count);
        capturedSections.delete(count);
        capturedSections.set(count, value);
        return value;
      }
      const value = geometryStudies.sectionLines(
        count,
        capturedView,
        capturedProjection,
      );
      capturedSections.set(count, value);
      while (capturedSections.size > 2)
        capturedSections.delete(capturedSections.keys().next().value);
      return value;
    };
    let cachedSurface, cachedBoundaries, cachedMembranes;
    const surfaceSamples = () =>
      cachedSurface ??
      (cachedSurface = geometryStudies.surfaceSamples(
        capturedView,
        capturedProjection,
        materialVisibility,
      ));
    return {
      color,
      normal,
      depth,
      identity,
      diffuse,
      albedo,
      pixelWorldSize: (camera.right - camera.left) / size,
      metalnesses: [
        0,
        ...activeMaterials.map((material) => material.metalness || 0),
      ],
      edges: projectedEdges(),
      edgeOwners: creaseSources.flatMap(({ id, vertices }) =>
        Array(vertices.count / 2).fill(id),
      ),
      surfaceSamples,
      membraneMasks: () =>
        cachedMembranes ??
        (cachedMembranes = geometryStudies.membraneMasks(
          capturedView,
          capturedProjection,
        )),
      surfaceHatches: (seed) => {
        if (capturedHatches.has(seed)) {
          const value = capturedHatches.get(seed);
          capturedHatches.delete(seed);
          capturedHatches.set(seed, value);
          return value;
        }
        const value = geometryStudies.surfaceHatches(
          seed,
          capturedView,
          capturedProjection,
          materialVisibility,
        );
        capturedHatches.set(seed, value);
        while (capturedHatches.size > 2)
          capturedHatches.delete(capturedHatches.keys().next().value);
        return value;
      },
      voxelFaces: (cellSize) => {
        cellSize = Math.round(Number(cellSize) * 1000) / 1000;
        if (capturedVoxels.has(cellSize)) {
          const value = capturedVoxels.get(cellSize);
          capturedVoxels.delete(cellSize);
          capturedVoxels.set(cellSize, value);
          return value;
        }
        const value = geometryStudies.voxelFaces(
          cellSize,
          capturedView,
          capturedProjection,
        );
        capturedVoxels.set(cellSize, value);
        while (capturedVoxels.size > 2)
          capturedVoxels.delete(capturedVoxels.keys().next().value);
        return value;
      },
      openBoundaries: () =>
        cachedBoundaries ??
        (cachedBoundaries = geometryStudies.openBoundaries(
          capturedView,
          capturedProjection,
        )),
      geometrySnapshot: () =>
        snapshotGeometryStudies(
          studySolids,
          size,
          capturedView,
          capturedProjection,
        ),
      sectionRibLighting,
      // Exact cloned key camera for the cutaway proxy's fresh visibility solve.
      // This metadata does not alter the reference shadow or original objects.
      cutawayShadowCamera: {
        view: sectionShadow.camera.matrixWorldInverse.toArray(),
        projection: sectionShadow.camera.projectionMatrix.toArray(),
      },
      sectionLines,
      // Existing directional key light expressed in image coordinates; no extra scene light.
      reliefLight: light.position
        .clone()
        .sub(light.target.position)
        .normalize()
        .transformDirection(capturedView)
        .toArray()
        .map((value, index) => (index === 1 ? -value : value)),
      // Read-only light/view metadata for the spectral coating study.
      worldFromClip: capturedView
        .clone()
        .invert()
        .multiply(capturedProjection.clone().invert())
        .toArray(),
      spectralLights: [light, fill].map((source) => ({
        direction: source.position
          .clone()
          .sub(source.target.position)
          .normalize()
          .transformDirection(capturedView)
          .toArray()
          .map((value, index) => (index === 1 ? -value : value)),
        color: source.color.toArray(),
        intensity: source.intensity,
      })),
      spectralHemisphere: {
        sky: hemi.color.toArray(),
        ground: hemi.groundColor.toArray(),
        intensity: hemi.intensity,
        up: hemi.position
          .clone()
          .normalize()
          .transformDirection(capturedView)
          .toArray()
          .map((value, index) => (index === 1 ? -value : value)),
      },
      baseColors: [
        null,
        ...activeMaterials.map((material) =>
          material.color
            .clone()
            .convertLinearToSRGB()
            .toArray()
            .map((value) => Math.round(value * 255)),
        ),
      ],
      ...(materialVisibility ? {
        materialVisibility,
        surfaceVisibility: () => geometryStudies.surfaceVisibility(capturedView, capturedProjection, materialVisibility),
      } : {}),
      materialSettings: {
        preset: selectedMaterials.preset,
        assignments: { ...selectedMaterials.assignments },
      },
      materialBakeMetadata: materialBake?.metadata || null,
      transmissions: [
        0,
        ...activeMaterials.map((material) => material.transmission || 0),
      ],
      size,
      near: camera.near,
      far: camera.far,
      canvas: renderer.domElement,
    };
  }

  return { render, renderer, scene, camera, meshCount: count };
}
