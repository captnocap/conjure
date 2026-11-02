import { perforatedShellDefinition, createPerforatedShellMaterial, decoratePerforatedShell, validatePerforatedShellGeometry } from "./perforated-shell-material.js";
import { perlageDefinition, createPerlageMaterial } from "./perlage-material.js";
import { createPerlageGeometryManager } from "./perlage-geometry.js";
import { shingleReliefDefinition, createShingleReliefMaterial } from "./shingle-relief-material.js";
import { createShingleGeometryManager } from "./shingle-relief-geometry.js";
import { enamelReserveDefinition, createEnamelReserveMaterial } from "./enamel-reserve-material.js";
import { createEnamelGeometryManager } from "./enamel-reserve-geometry.js";
import { ribbedClayDefinition, createRibbedClayMaterial } from "./ribbed-clay-material.js";
import { createRibbedClayGeometryManager } from "./ribbed-clay-geometry.js";
import { tiledSurfaceDefinition, createTiledSurfaceMaterial } from "./tiled-surface-material.js";
import { interferenceCoatDefinition, createInterferenceCoatMaterial, createInterferenceResources } from "./interference-coat-material.js";
import { interferenceTableData } from "./interference-coat-tables.js";
import { hammeredMetalDefinition, createHammeredMetalMaterial, createHammeredResources } from "./hammered-metal-material.js";
import { foilDefinition, createFoilMaterial, createFoilResources } from "./diffraction-foil-material.js";
import { wovenLinenDefinition, createWovenLinenMaterial } from "./woven-linen-material.js";
import { createWovenGeometry } from "./woven-linen-charts.js";
import { velvetDefinition, createVelvetMaterial } from "./velvet-material.js";
import { steelVertexInputs, steelVertexBody, steelPhysicalBody } from "./steel-material.js";
import * as THREE from "three";
import {
  softTissueDefinitions,
  createSoftTissueMaterial,
} from "./soft-tissue-materials.js";
import { boneDefinitions, createBoneMaterial } from "./bone-materials.js";
const specializedFactories = new Map([
  [ribbedClayDefinition.id, (_id, environment, options) => createRibbedClayMaterial(environment, options)],
  [enamelReserveDefinition.id, (_id, environment, options) => createEnamelReserveMaterial(environment, options)],
  [shingleReliefDefinition.id, (_id, environment, options) => createShingleReliefMaterial(environment, options)],
  [perlageDefinition.id, (_id, environment, options) => createPerlageMaterial(environment, options)],
  [tiledSurfaceDefinition.id, (_id, environment, options) => createTiledSurfaceMaterial(environment, options)],
  [wovenLinenDefinition.id, (_id, environment, options) => createWovenLinenMaterial(environment, options)],
  [velvetDefinition.id, (_id, environment, options) => createVelvetMaterial(environment, options)],
  ...softTissueDefinitions.map(({ id }) => [id, createSoftTissueMaterial]),
  ...boneDefinitions.map(({ id }) => [id, createBoneMaterial]),
]);
import {
  frostedGlassDefinition,
  createFrostedGlassMaterial,
} from "./frosted-glass-material.js";
import {
  woodDefinition,
  woodVertexInputs,
  woodVertexBody,
  woodFragmentInputs,
  woodSurfaceBody,
  woodPhysicalBody,
} from "./wood-material.js";

// These surface materials are independent of the image treatments. Coordinates
// are attached to the mesh, while curvature/AO come from the fixed world mesh.
// Wrapped porcelain body lighting is an artistic approximation, not volume SSS.
export const materialDefinitions = Object.freeze(
  [
    {
      id: "brushed-steel",
      name: "Brushed steel",
      baseColor: "#bcc6ce",
      metalness: 1,
      roughness: 0.3,
      anisotropy: 0.86,
      description: "Directional grain and stretched studio reflections",
    },
    {
      id: "chrome",
      name: "Chrome",
      baseColor: "#e5e8ed",
      metalness: 1,
      roughness: 0.075,
      description: "Crisp softboxes and a dark studio horizon",
    },
    {
      id: "brass",
      name: "Brass",
      baseColor: "#dab56a",
      metalness: 1,
      roughness: 0.24,
      description: "Warm conductor reflections and gently polished edges",
    },
    {
      id: "copper",
      name: "Copper",
      baseColor: "#d99170",
      metalness: 1,
      roughness: 0.23,
      description: "Rosy conductor reflections with fine surface grain",
    },
    {
      id: "porcelain",
      name: "Porcelain",
      baseColor: "#e3ede6",
      metalness: 0,
      roughness: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.085,
      description:
        "Soft wrapped body, clear glaze, pooled recesses and fine crazing",
    },
    {
      id: "marble",
      name: "Marble",
      baseColor: "#e5e3d8",
      metalness: 0,
      roughness: 0.3,
      clearcoat: 0.25,
      clearcoatRoughness: 0.22,
      description: "Warped mineral veins at several scales",
    },
    {
      id: "concrete",
      name: "Concrete",
      baseColor: "#a8a89d",
      metalness: 0,
      roughness: 0.94,
      description: "Matte aggregate, small pits and cast formwork seams",
    },
    {
      id: "stone",
      name: "Stone",
      baseColor: "#b8a68b",
      metalness: 0,
      roughness: 0.88,
      description: "Mineral grain, settled dust and chipped convex edges",
    },
    woodDefinition,
    frostedGlassDefinition,
    ...softTissueDefinitions,
    ...boneDefinitions,
    velvetDefinition,
    wovenLinenDefinition,
    foilDefinition,
    hammeredMetalDefinition,
    { ...interferenceCoatDefinition, baseColor: "#2c2c2c" },
    tiledSurfaceDefinition,
    perlageDefinition,
    perforatedShellDefinition,
    shingleReliefDefinition,
    enamelReserveDefinition,
    ribbedClayDefinition,
  ].map((definition) => Object.freeze({ transmission: 0, ...definition })),
);

const definitionsById = new Map(
  materialDefinitions.map((item) => [item.id, item]),
);
const smoothstep = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A deterministic linear-radiance studio, with broad light cards and a horizon.
 * Passing a renderer prefilters it now; omitting one allows Three's usual lazy
 * equirectangular PMREM conversion and permits CPU-only contract tests.
 */
function createStudioEnvironment(renderer) {
  const width = 1024,
    height = 512;
  const pixels = new Float32Array(width * height * 4);
  const panels = [
    [[-0.62, 0.43, 0.66], 0.27, 0.62, [5.8, 5.6, 5.1]],
    [[0.74, 0.24, -0.42], 0.12, 0.78, [3.8, 4.4, 5.1]],
    [[0.06, 0.98, 0.2], 0.66, 0.38, [3.3, 3.35, 3.4]],
    [[-0.3, 0.16, -0.95], 0.72, 0.13, [2.7, 2.5, 2.1]],
  ].map(([direction, halfWidth, halfHeight, color]) => {
    const normal = new THREE.Vector3(...direction).normalize();
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), normal)
      .normalize();
    const up = new THREE.Vector3().crossVectors(normal, right).normalize();
    return { normal, right, up, halfWidth, halfHeight, color };
  });
  for (let y = 0; y < height; y++) {
    const latitude = Math.PI * ((y + 0.5) / height - 0.5);
    const dy = Math.sin(latitude),
      ring = Math.cos(latitude);
    const sky = smoothstep(-0.08, 0.65, dy);
    const horizon = Math.exp(-(((dy + 0.035) / 0.085) ** 2));
    for (let x = 0; x < width; x++) {
      const longitude = 2 * Math.PI * ((x + 0.5) / width - 0.5);
      const dx = ring * Math.cos(longitude),
        dz = ring * Math.sin(longitude);
      const offset = (y * width + x) * 4;
      const base = (0.075 + 0.22 * sky) * (1 - 0.75 * horizon);
      pixels[offset] = base * (1.03 - 0.07 * sky);
      pixels[offset + 1] = base;
      pixels[offset + 2] = base * (0.95 + 0.12 * sky);
      pixels[offset + 3] = 1;
      for (const panel of panels) {
        const denominator =
          dx * panel.normal.x + dy * panel.normal.y + dz * panel.normal.z;
        if (denominator <= 0) continue;
        const u = Math.abs(
          (dx * panel.right.x + dy * panel.right.y + dz * panel.right.z) /
            denominator,
        );
        const v = Math.abs(
          (dx * panel.up.x + dy * panel.up.y + dz * panel.up.z) / denominator,
        );
        const mask =
          (1 - smoothstep(panel.halfWidth * 0.88, panel.halfWidth, u)) *
          (1 - smoothstep(panel.halfHeight * 0.88, panel.halfHeight, v));
        for (let channel = 0; channel < 3; channel++)
          pixels[offset + channel] += panel.color[channel] * mask;
      }
    }
  }
  // Half-float HDR retains bright cards without requiring float-linear texture
  // filtering, which is optional even on WebGL 2 devices.
  const halfPixels = new Uint16Array(pixels.length);
  for (let i = 0; i < pixels.length; i++)
    halfPixels[i] = THREE.DataUtils.toHalfFloat(pixels[i]);
  const source = new THREE.DataTexture(
    halfPixels,
    width,
    height,
    THREE.RGBAFormat,
    THREE.HalfFloatType,
  );
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.LinearSRGBColorSpace;
  source.minFilter = THREE.LinearFilter;
  source.magFilter = THREE.LinearFilter;
  source.needsUpdate = true;
  source.name = "Atelier fixed studio softboxes and horizon";
  source.userData = {
    kind: "procedural-studio",
    width,
    height,
    lightCards: panels.length,
  };
  if (!renderer) return { texture: source, dispose: () => source.dispose() };
  const previous = {
    target: renderer.getRenderTarget(),
    cubeFace: renderer.getActiveCubeFace(),
    mipLevel: renderer.getActiveMipmapLevel(),
    xrEnabled: renderer.xr.enabled,
    toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure,
    autoClear: renderer.autoClear,
  };
  const generator = new THREE.PMREMGenerator(renderer);
  let target;
  try {
    target = generator.fromEquirectangular(source);
  } finally {
    // PMREM restores these on success; also restore after shader/render errors.
    renderer.setRenderTarget(
      previous.target,
      previous.cubeFace,
      previous.mipLevel,
    );
    renderer.xr.enabled = previous.xrEnabled;
    renderer.toneMapping = previous.toneMapping;
    renderer.toneMappingExposure = previous.exposure;
    renderer.autoClear = previous.autoClear;
    source.dispose();
    generator.dispose();
  }
  target.texture.name = source.name;
  target.texture.userData = { ...source.userData, prefiltered: true };
  return { texture: target.texture, dispose: () => target.dispose() };
}

const vertexInputs = /* glsl */ `
attribute float materialConvex;
attribute float materialConcave;
attribute float materialAO;
attribute float materialLightAO;
attribute vec3 materialConvexEdge;
attribute vec3 materialConcaveEdge;
varying vec3 vMaterialPosition;
varying vec3 vMaterialNormal;
varying vec3 vMaterialWorldNormal;
varying vec3 vMaterialBaked;
varying float vMaterialLightAO;
varying vec3 vMaterialConvexEdge;
varying vec3 vMaterialConcaveEdge;
`;

const fragmentInputs = /* glsl */ `
varying vec3 vMaterialPosition;
varying vec3 vMaterialNormal;
varying vec3 vMaterialWorldNormal;
varying vec3 vMaterialBaked;
varying float vMaterialLightAO;
varying vec3 vMaterialConvexEdge;
varying vec3 vMaterialConcaveEdge;

float atelierHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float atelierNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(atelierHash(i), atelierHash(i + vec3(1,0,0)), f.x),
                 mix(atelierHash(i + vec3(0,1,0)), atelierHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(atelierHash(i + vec3(0,0,1)), atelierHash(i + vec3(1,0,1)), f.x),
                 mix(atelierHash(i + vec3(0,1,1)), atelierHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Derivatives filter procedural detail only. Geometry curvature is never
// inferred from screen-space differences or image noise.
float atelierGrain(vec3 p) {
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  return mix(atelierNoise(p), 0.5, smoothstep(0.35, 1.4, footprint));
}
float atelierFbm(vec3 p) {
  return 0.54 * atelierGrain(p) + 0.27 * atelierGrain(p * 2.07 + 13.7) +
         0.13 * atelierGrain(p * 4.31 + 29.1) + 0.06 * atelierGrain(p * 8.87 + 7.3);
}
float atelierCellEdge(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  float nearest = 8.0, nextNearest = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 offset = vec2(float(i), float(j));
      vec2 point = offset + vec2(atelierHash(vec3(cell + offset, 1.2)),
                                atelierHash(vec3(cell + offset, 8.7))) - f;
      float d = dot(point, point);
      if (d < nearest) { nextNearest = nearest; nearest = d; }
      else nextNearest = min(nextNearest, d);
    }
  }
  return sqrt(nextNearest) - sqrt(nearest);
}
float atelierCrazing(vec2 p) {
  float edge = atelierCellEdge(p);
  float aa = max(fwidth(edge), 0.014);
  return 1.0 - smoothstep(0.012, 0.025 + aa, edge);
}
float atelierFineCrazing(vec3 p, vec3 n) {
  vec3 weights = pow(abs(n), vec3(6.0));
  weights /= max(dot(weights, vec3(1.0)), 0.0001);
  return atelierCrazing(p.yz) * weights.x + atelierCrazing(p.xz) * weights.y + atelierCrazing(p.xy) * weights.z;
}
vec3 atelierBump(vec3 n, vec3 positionInView, float height) {
  vec3 dx = dFdx(positionInView), dy = dFdy(positionInView);
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  // Three reverses raster winding and native bumpScale for BackSide.
  // Procedural height bypasses bumpScale; preserve its orientation explicitly.
  float reliefFaceSign=1.0;
  #ifdef DOUBLE_SIDED
    reliefFaceSign=gl_FrontFacing ? 1.0 : -1.0;
  #endif
  #ifdef FLIP_SIDED
    reliefFaceSign=-1.0;
  #endif
  float determinant = dot(dx, r1) * reliefFaceSign;
  vec3 gradient = sign(determinant) * (dFdx(height) * r1 + dFdy(height) * r2);
  return normalize(max(abs(determinant), 1e-9) * n - gradient);
}
`;

const fieldSetup = /* glsl */ `
vec3 atelierP = vMaterialPosition;
vec3 atelierObjectNormal = normalize(vMaterialNormal);
float atelierConvexDistance = min(vMaterialConvexEdge.x, min(vMaterialConvexEdge.y, vMaterialConvexEdge.z));
float atelierConcaveDistance = min(vMaterialConcaveEdge.x, min(vMaterialConcaveEdge.y, vMaterialConcaveEdge.z));
float atelierConvex = max(1.0 - exp(-max(vMaterialBaked.x, 0.0) * 0.2), exp(-max(atelierConvexDistance, 0.0) * 65.0));
float atelierConcave = max(1.0 - exp(-max(vMaterialBaked.y, 0.0) * 0.24), exp(-max(atelierConcaveDistance, 0.0) * 45.0));
float atelierAO = clamp(vMaterialBaked.z, 0.0, 1.0);
float atelierHeight = 0.0;
float atelierRoughness = roughness;
float atelierMetalness = metalness;
float atelierPool = clamp(atelierConcave * 0.72 + (1.0 - atelierAO) * 0.42, 0.0, 1.0);
`;

const surfaceBodies = {
  wood: woodSurfaceBody,
  "brushed-steel": /* glsl */ `
    // Long object-Y grooves; the physical frame stretches GGX across them.
    float grain = atelierGrain(atelierP * vec3(125.0, 3.2, 125.0));
    float broad = atelierFbm(atelierP * vec3(9.0, 0.75, 9.0));
    diffuseColor.rgb *= 0.93 + 0.11 * grain + 0.035 * broad;
    atelierRoughness = 0.27 + 0.1 * grain + 0.065 * atelierPool - 0.055 * atelierConvex;
    atelierHeight = (grain - 0.5) * 0.0015;
    float oxide = smoothstep(0.07, 0.4, atelierPool) * smoothstep(0.4, 0.67, atelierFbm(atelierP * 9.0 + 21.0)) * (1.0 - 0.8 * atelierConvex);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.23, 0.072, 0.023), oxide * 0.82);
    atelierMetalness = mix(1.0, 0.14, oxide);
    atelierRoughness = mix(atelierRoughness, 0.83, oxide);
  `,
  chrome: /* glsl */ `
    float polish = atelierFbm(atelierP * 5.5);
    atelierRoughness = 0.062 + polish * 0.035 + atelierPool * 0.045;
    diffuseColor.rgb *= 0.98 + 0.02 * polish;
    float dust = smoothstep(0.2, 0.65, atelierPool) * atelierFbm(atelierP * 18.0) * 0.38;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.2, 0.17), dust);
    atelierMetalness = 1.0 - dust * 0.8;
    atelierRoughness += dust * 0.3;
  `,
  brass: /* glsl */ `
    float grain = atelierGrain(atelierP * 90.0);
    float cloud = atelierFbm(atelierP * 4.0);
    diffuseColor.rgb *= 0.92 + 0.11 * cloud;
    atelierRoughness = 0.19 + 0.095 * grain + 0.12 * atelierPool - 0.055 * atelierConvex;
    atelierHeight = (grain - 0.5) * 0.0008;
    float oxide = smoothstep(0.055, 0.36, atelierPool) * smoothstep(0.38, 0.64, atelierFbm(atelierP * 8.0 + 13.2)) * (1.0 - 0.85 * atelierConvex);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.067, 0.16, 0.105), oxide * 0.85);
    atelierMetalness = mix(1.0, 0.12, oxide);
    atelierRoughness = mix(atelierRoughness, 0.78, oxide);
  `,
  copper: /* glsl */ `
    float grain = atelierGrain(atelierP * 105.0);
    float cloud = atelierFbm(atelierP * 3.0 + 8.3);
    diffuseColor.rgb *= vec3(0.96 + 0.04 * cloud, 0.9 + 0.1 * cloud, 0.87 + 0.13 * cloud);
    atelierRoughness = 0.19 + 0.085 * grain + 0.1 * atelierPool - 0.045 * atelierConvex;
    atelierHeight = (grain - 0.5) * 0.001;
    float oxide = smoothstep(0.055, 0.36, atelierPool) * smoothstep(0.38, 0.66, atelierFbm(atelierP * 8.5 + 31.0)) * (1.0 - 0.85 * atelierConvex);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.042, 0.185, 0.145), oxide * 0.88);
    atelierMetalness = mix(1.0, 0.08, oxide);
    atelierRoughness = mix(atelierRoughness, 0.8, oxide);
  `,
  porcelain: /* glsl */ `
    float body = atelierFbm(atelierP * 6.0);
    vec3 crazeWarp = atelierP * 13.0 + vec3(atelierFbm(atelierP * 3.0)) * 0.5;
    float craze = atelierFineCrazing(crazeWarp, atelierObjectNormal);
    diffuseColor.rgb *= 0.96 + 0.05 * body;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38, 0.62, 0.56), atelierPool * 0.48);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.9, 0.79), atelierConvex * 0.18);
    diffuseColor.rgb *= 1.0 - craze * (0.075 + 0.085 * atelierPool);
    atelierRoughness = 0.34 + body * 0.075;
    atelierHeight = (body - 0.5) * 0.0016 - craze * 0.00012;
  `,
  marble: /* glsl */ `
    vec3 warp = vec3(atelierFbm(atelierP * 1.9), atelierFbm(atelierP * 2.4 + 19.0), atelierFbm(atelierP * 2.2 + 43.0));
    vec3 q = atelierP * 1.65 + (warp - 0.5) * 1.55;
    float drift = q.x * 1.9 + q.y * 1.15 - q.z * 1.3;
    float veinField = abs(sin(drift * 3.4 + atelierFbm(q * 4.0) * 5.0));
    float broadVein = 1.0 - smoothstep(0.08, 0.31, veinField);
    float fineField = abs(sin(drift * 11.5 + atelierFbm(q * 8.0) * 6.0));
    float fineVein = 1.0 - smoothstep(0.025, 0.07 + fwidth(fineField), fineField);
    float mineral = atelierFbm(atelierP * 28.0);
    diffuseColor.rgb *= 0.94 + 0.08 * mineral;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.29, 0.34, 0.32), broadVein * 0.65);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.48, 0.39, 0.26), fineVein * (0.12 + 0.2 * broadVein));
    atelierRoughness = 0.23 + mineral * 0.085 + broadVein * 0.1 + atelierPool * 0.045;
    atelierHeight = (mineral - 0.5) * 0.0018 - fineVein * 0.00045;
  `,
  concrete: /* glsl */ `
    float cloud = atelierFbm(atelierP * 3.2);
    float aggregate = atelierFbm(atelierP * 31.0);
    float fine = atelierGrain(atelierP * 140.0);
    float pores = smoothstep(0.72, 0.89, atelierGrain(atelierP * 72.0 + 1.7));
    float boardCoordinate = atelierP.y * 2.15 + 0.017 * atelierFbm(atelierP * 12.0);
    float seamDistance = abs(fract(boardCoordinate) - 0.5);
    float seam = 1.0 - smoothstep(0.005, 0.015 + fwidth(boardCoordinate), seamDistance);
    float boardFiber = atelierGrain(atelierP * vec3(2.0, 72.0, 2.0));
    diffuseColor.rgb *= 0.8 + 0.28 * cloud + 0.13 * aggregate + 0.035 * fine;
    diffuseColor.rgb *= 1.0 - 0.19 * pores - 0.075 * seam;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.11, atelierConvex * aggregate * 0.35);
    atelierRoughness = 0.88 + aggregate * 0.12;
    atelierHeight = (aggregate - 0.5) * 0.009 + (fine - 0.5) * 0.0013 - pores * 0.006 - seam * 0.002 + boardFiber * 0.0007;
  `,
  stone: /* glsl */ `
    float strata = atelierFbm(atelierP * vec3(3.5, 14.0, 3.5));
    float mineral = atelierFbm(atelierP * 36.0);
    float grain = atelierGrain(atelierP * 118.0);
    float chip = atelierConvex * smoothstep(0.42, 0.67, atelierFbm(atelierP * 27.0));
    float dust = clamp(atelierPool * 0.5 + max(normalize(vMaterialWorldNormal).y, 0.0) * 0.08, 0.0, 0.65);
    diffuseColor.rgb *= 0.72 + 0.3 * strata + 0.23 * mineral;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.65, 0.56, 0.42), dust);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.73, 0.65, 0.52), chip * 0.44);
    atelierRoughness = clamp(0.81 + grain * 0.17 + dust * 0.09, 0.0, 1.0);
    atelierHeight = (mineral - 0.5) * 0.012 + (grain - 0.5) * 0.0024 - chip * 0.006;
  `,
};

const porcelainWrap = /* glsl */ `
// A small shadow-aware diffuse wrap, layered under the physical glaze.
void RE_Direct_AtelierPorcelain(const in IncidentLight directLight, const in vec3 geometryPosition,
  const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  RE_Direct_Physical(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
  float rawDot = dot(geometryNormal, directLight.direction);
  float wrapped = max((rawDot + 0.38) / 1.38, 0.0);
  float extra = max(wrapped - max(rawDot, 0.0), 0.0) * 0.3;
  reflectedLight.directDiffuse += directLight.color * BRDF_Lambert(material.diffuseColor) * extra;
}
#undef RE_Direct
#define RE_Direct RE_Direct_AtelierPorcelain
`;

function injectSurfaceShader(shader, id, albedo = false) {
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>\n${vertexInputs}\n${id === "wood" ? woodVertexInputs : id === "brushed-steel" ? steelVertexInputs : ""}`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      ${id === "wood" ? woodVertexBody : id === "brushed-steel" ? steelVertexBody : ""}
      vMaterialPosition = position;
      vMaterialNormal = normal;
      vMaterialWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);
      vMaterialBaked = vec3(materialConvex, materialConcave, materialAO);
      vMaterialLightAO = materialLightAO;
      vMaterialConvexEdge = materialConvexEdge;
      vMaterialConcaveEdge = materialConcaveEdge;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>\n${fragmentInputs}\n${id === "wood" ? woodFragmentInputs : id === "brushed-steel" ? steelVertexInputs : ""}`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>\n${fieldSetup}\n${surfaceBodies[id]}`,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor = clamp(atelierRoughness, 0.0525, 1.0);",
    )
    .replace(
      "#include <metalnessmap_fragment>",
      "#include <metalnessmap_fragment>\nmetalnessFactor = clamp(atelierMetalness, 0.0, 1.0);",
    )
    .replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\nnormal = atelierBump(normal, -vViewPosition, atelierHeight);",
    )
    .replace(
      "#include <aomap_fragment>",
      `#include <aomap_fragment>
      // Ambient light visibility is independent of geometric wear/appearance AO.
      // Negative fallback preserves callers with only the legacy materialAO.
      float atelierLightAO = vMaterialLightAO < 0.0 ? atelierAO : clamp(vMaterialLightAO, 0.0, 1.0);
      reflectedLight.indirectDiffuse *= atelierLightAO;
      reflectedLight.indirectSpecular *= computeSpecularOcclusion(saturate(dot(geometryNormal, geometryViewDir)), atelierLightAO, material.roughness);
      #ifdef USE_CLEARCOAT
        clearcoatSpecularIndirect *= mix(1.0, atelierLightAO, 0.65);
      #endif`,
    );
  if (id === "brushed-steel") {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_physical_fragment>",
      `#include <lights_physical_fragment>\n${steelPhysicalBody}`,
    );
  }
  if (id === "wood") {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_physical_fragment>",
      `#include <lights_physical_fragment>\n${woodPhysicalBody}`,
    );
  }
  if (id === "porcelain") {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <lights_physical_pars_fragment>",
        `#include <lights_physical_pars_fragment>\n${porcelainWrap}`,
      )
      .replace(
        "#include <clearcoat_normal_fragment_maps>",
        `#include <clearcoat_normal_fragment_maps>
        clearcoatNormal = atelierBump(clearcoatNormal, -vViewPosition, -craze * 0.0001);`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
        material.clearcoatRoughness = clamp(0.085 - 0.025 * atelierPool + 0.012 * atelierConvex + craze * 0.04, 0.0525, 0.15);`,
      );
  }
  if (albedo) {
    // Capture exactly the same procedural pigment/oxide fields before lighting.
    // The capture stores linear values; display conversion belongs to its reader.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <opaque_fragment>",
        "gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a);",
      )
      .replace("#include <colorspace_fragment>", "");
  }
}

/** Materials are cached by id + side; the caller owns geometry and scene state. */
export function createMaterialLibrary(renderer) {
  const studio = createStudioEnvironment(renderer);
  const cache = new Map();
  const auxiliaryCache = new Map();
  let foilResources = null;
  let hammeredResources = null;
  let interferenceResources = null;
  let shingleGeometry = null;
  let enamelGeometry = null;
  let ribbedClayGeometry = null;
  let disposed = false;
  const perlageGeometry = createPerlageGeometryManager();
  const library = {
    environment: studio.texture,
    // A chart is a render-only view sharing the baked attributes, including live
    // glass-aware AO. The source must retain its original typed geometry/scale.
    prepareGeometry(id, originalMesh, bakedGeometry, { objectId } = {}) {
      if (disposed) throw new Error("Material library is disposed");
      if (!definitionsById.has(id)) throw new RangeError(`Unknown surface material: ${id}`);
      if (id === perforatedShellDefinition.id) return validatePerforatedShellGeometry(objectId, originalMesh, bakedGeometry);
      if (id === ribbedClayDefinition.id) {
        ribbedClayGeometry ||= createRibbedClayGeometryManager();
        return ribbedClayGeometry.prepare(originalMesh, bakedGeometry, { objectId });
      }
      if (id === enamelReserveDefinition.id) {
        enamelGeometry ||= createEnamelGeometryManager();
        return enamelGeometry.prepare(originalMesh, bakedGeometry, { objectId });
      }
      if (id === shingleReliefDefinition.id) {
        shingleGeometry ||= createShingleGeometryManager();
        return shingleGeometry.prepare(originalMesh, bakedGeometry, { objectId });
      }
      if (id === perlageDefinition.id) return perlageGeometry.prepare(originalMesh, bakedGeometry);
      return id === wovenLinenDefinition.id
        ? createWovenGeometry(originalMesh, bakedGeometry, { pitch: 0.035 })
        : bakedGeometry;
    },
    releaseUnusedGeometry(activeGeometries) {
      if (disposed) throw new Error("Material library is disposed");
      perlageGeometry.releaseUnused(activeGeometries);
      shingleGeometry?.releaseUnused(activeGeometries);
      enamelGeometry?.releaseUnused(activeGeometries);
      ribbedClayGeometry?.releaseUnused(activeGeometries);
    },
    create(id, { side = THREE.FrontSide } = {}) {
      if (disposed) throw new Error("Material library is disposed");
      const definition = definitionsById.get(id);
      if (!definition) throw new RangeError(`Unknown surface material: ${id}`);
      if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
        throw new RangeError("Invalid material side");
      if (id === perforatedShellDefinition.id) side = THREE.DoubleSide;
      if (id === shingleReliefDefinition.id) side = THREE.DoubleSide;
      if (id === enamelReserveDefinition.id) side = THREE.DoubleSide;
      if (id === ribbedClayDefinition.id) side = THREE.DoubleSide;
      const key = `${id}:${side}`;
      if (cache.has(key)) return cache.get(key);
      if (id === perforatedShellDefinition.id) {
        const material = createPerforatedShellMaterial(studio.texture);
        cache.set(key, material);
        return material;
      }
      if (id === interferenceCoatDefinition.id) {
        interferenceResources ||= createInterferenceResources(interferenceTableData());
        const material = createInterferenceCoatMaterial(studio.texture, { side, resources: interferenceResources });
        cache.set(key, material);
        return material;
      }
      if (id === hammeredMetalDefinition.id) {
        hammeredResources ||= createHammeredResources();
        const material = createHammeredMetalMaterial(studio.texture, { side, resources: hammeredResources });
        cache.set(key, material);
        return material;
      }
      if (id === foilDefinition.id) {
        // One lookup per library, shared by its cached side variants. All older
        // materials keep their existing allocation and studio paths.
        foilResources ||= createFoilResources();
        const material = createFoilMaterial(studio.texture, { side, resources: foilResources });
        cache.set(key, material);
        return material;
      }
      if (specializedFactories.has(id)) {
        const material = specializedFactories.get(id)(id, studio.texture, { side });
        cache.set(key, material);
        return material;
      }
      if (id === frostedGlassDefinition.id) {
        const material = createFrostedGlassMaterial(studio.texture, { side });
        cache.set(key, material);
        return material;
      }
      const material = new THREE.MeshPhysicalMaterial({
        color: definition.baseColor,
        metalness: definition.metalness,
        roughness: definition.roughness,
        transmission: 0,
        anisotropy: definition.anisotropy || 0,
        anisotropyRotation: Math.PI / 2,
        clearcoat: definition.clearcoat || 0,
        clearcoatRoughness: definition.clearcoatRoughness || 0,
        envMap: studio.texture,
        envMapIntensity: definition.metalness ? 1.05 : 0.48,
        side,
      });
      material.name = `Atelier ${definition.name}`;
      material.userData = {
        materialId: id,
        physicalSurface: true,
        bakedGeometry: true,
      };
      // Defined fallbacks make isolated previews safe; production geometry has
      // geometric appearance and independent ambient visibility attributes.
      // Missing attributes mean no wear or ambient occlusion.
      material.defaultAttributeValues = {
        materialConvex: [0],
        materialConcave: [0],
        materialAO: [1],
        materialLightAO: [-1], // Legacy fallback: use materialAO when the new input is absent.
        materialConvexEdge: [1e4, 1e4, 1e4],
        materialConcaveEdge: [1e4, 1e4, 1e4],
      };
      material.onBeforeCompile = (shader) => injectSurfaceShader(shader, id);
      material.customProgramCacheKey = () => `atelier-surface-${id === "brushed-steel" ? "steel-frame-v1" : "v2"}:${id}:sided-relief-v1`;
      cache.set(key, material);
      return material;
    },
    createAlbedo(id, { side = THREE.FrontSide } = {}) {
      if (id === ribbedClayDefinition.id) {
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${THREE.DoubleSide}`;
        if (cache.has(key)) return cache.get(key);
        const material = createRibbedClayMaterial(null, { side: THREE.DoubleSide, albedo: true });
        cache.set(key, material);
        return material;
      }
      if (id === enamelReserveDefinition.id) {
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${THREE.DoubleSide}`;
        if (cache.has(key)) return cache.get(key);
        const material = createEnamelReserveMaterial(null, { side: THREE.DoubleSide, albedo: true });
        cache.set(key, material);
        return material;
      }
      if (id === shingleReliefDefinition.id) {
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${THREE.DoubleSide}`;
        if (cache.has(key)) return cache.get(key);
        const material = createShingleReliefMaterial(null, { side: THREE.DoubleSide, albedo: true });
        cache.set(key, material);
        return material;
      }
      if (id === perforatedShellDefinition.id) {
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${THREE.DoubleSide}`;
        if (cache.has(key)) return cache.get(key);
        const material = createPerforatedShellMaterial(null, { albedo: true });
        cache.set(key, material);
        return material;
      }
      if (id === tiledSurfaceDefinition.id) {
        // Uniform pigment needs no physical surface or optical preparation.
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${side}`;
        if (cache.has(key)) return cache.get(key);
        const material = createTiledSurfaceMaterial(null, { side, albedo: true });
        cache.set(key, material);
        return material;
      }
      if (id === interferenceCoatDefinition.id) {
        // Albedo-first capture reads no optical data and creates no physical material.
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${side}`;
        if (cache.has(key)) return cache.get(key);
        const material = createInterferenceCoatMaterial(null, { side, albedo: true });
        cache.set(key, material);
        return material;
      }
      if (id === hammeredMetalDefinition.id) {
        // Pigment capture must not allocate the atlas or a beauty material.
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${side}`;
        if (cache.has(key)) return cache.get(key);
        const material = createHammeredMetalMaterial(studio.texture, { side, albedo: true });
        material.fog = false;
        material.userData.albedoSurface = true;
        cache.set(key, material);
        return material;
      }
      if (id === foilDefinition.id) {
        // Pigment-only callers never need the spectral lookup or a physical
        // foil instance. Keep lifetime/side validation ahead of cache access.
        if (disposed) throw new Error("Material library is disposed");
        if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
          throw new RangeError("Invalid material side");
        const key = `albedo:${id}:${side}`;
        if (cache.has(key)) return cache.get(key);
        const material = createFoilMaterial(studio.texture, { side, albedo: true });
        cache.set(key, material);
        return material;
      }
      // Physical creation validates the id, side and lifetime for both paths.
      const physical = library.create(id, { side });
      const key = `albedo:${id}:${side}`;
      if (cache.has(key)) return cache.get(key);
      if (specializedFactories.has(id)) {
        const material = specializedFactories.get(id)(id, studio.texture, {
          side,
          albedo: true,
        });
        cache.set(key, material);
        return material;
      }
      if (id === frostedGlassDefinition.id) {
        const material = createFrostedGlassMaterial(studio.texture, {
          side,
          albedo: true,
        });
        cache.set(key, material);
        return material;
      }
      const material = physical.clone();
      material.name = `${physical.name} albedo`;
      material.toneMapped = false;
      material.fog = false;
      material.userData = { ...physical.userData, albedoSurface: true };
      material.defaultAttributeValues = Object.fromEntries(
        Object.entries(physical.defaultAttributeValues).map(
          ([name, values]) => [name, values.slice()],
        ),
      );
      material.onBeforeCompile = (shader) =>
        injectSurfaceShader(shader, id, true);
      material.customProgramCacheKey = () => `atelier-albedo-${id === "brushed-steel" ? "steel-frame-v1" : "v2"}:${id}:sided-relief-v1`;
      cache.set(key, material);
      return material;
    },
    createAuxiliary(id, source, { pass } = {}) {
      if (disposed) throw new Error("Material library is disposed");
      if (id !== perforatedShellDefinition.id ||
          !["normal", "depth", "identity", "diffuse"].includes(pass) || !source?.isMaterial)
        throw new TypeError("Choose a supported perforated capture pass");
      let entries = auxiliaryCache.get(source);
      if (entries?.has(pass)) return entries.get(pass);
      const material = source.clone();
      // Three.Material.clone does not preserve user shader hooks.
      material.onBeforeCompile = source.onBeforeCompile;
      material.customProgramCacheKey = source.customProgramCacheKey;
      try { decoratePerforatedShell(material, { lightingAO: pass === "diffuse" }); }
      catch (error) { material.dispose(); throw error; }
      if (!entries) auxiliaryCache.set(source, entries = new Map());
      entries.set(pass, material);
      return material;
    },
    createCustomDepth(id) {
      if (disposed) throw new Error("Material library is disposed");
      if (id !== perforatedShellDefinition.id) throw new TypeError("Choose a supported perforated shadow material");
      const key = `shadow:${id}`;
      if (cache.has(key)) return cache.get(key);
      const material = decoratePerforatedShell(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
      cache.set(key, material);
      return material;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const material of cache.values()) material.dispose();
      cache.clear();
      for (const entries of auxiliaryCache.values())
        for (const material of entries.values()) material.dispose();
      auxiliaryCache.clear();
      perlageGeometry.dispose();
      shingleGeometry?.dispose();
      enamelGeometry?.dispose();
      ribbedClayGeometry?.dispose();
      foilResources?.dispose();
      hammeredResources?.dispose();
      interferenceResources?.dispose();
      studio.dispose();
    },
  };
  return library;
}
