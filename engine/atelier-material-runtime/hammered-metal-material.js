import * as THREE from 'three';
import { createImpactField } from './hammered-impact-field.js';

export const hammeredMetalDefinition = Object.freeze({
  id: 'hammered-metal', name: 'Hammered metal', baseColor: '#c4c7ca',
  metalness: 1, roughness: .23, transmission: 0,
  description: 'Shallow overlapping impacts break the reflected studio cards',
});

export function createHammeredResources() {
  const field = createImpactField();
  const mipmaps = field.levels.map(level => ({ width: level.width, height: level.height,
    data: Uint16Array.from(level.data, THREE.DataUtils.toHalfFloat) }));
  const texture = new THREE.DataTexture(mipmaps[0].data, mipmaps[0].width, mipmaps[0].height,
    THREE.RGBAFormat, THREE.HalfFloatType);
  texture.mipmaps = mipmaps;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.name = 'Hammered scalar height, first slopes, second slope moment';
  return { texture, period: field.period, dispose: () => texture.dispose() };
}

const vertexInputs = /* glsl */ `
attribute float materialAO;
attribute float materialLightAO;
varying vec3 vHammeredPosition;
varying vec3 vHammeredMetricNormal;
varying vec2 vHammeredAO;
`;
const vertexBody = /* glsl */ `
// Column lengths give the actual metric for orthogonal nonuniform transforms.
// Translation and rotation do not slide the pattern. Shear is unsupported.
vec3 hammeredScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
hammeredScale = max(hammeredScale, vec3(1e-6));
vHammeredPosition = position * hammeredScale;
vHammeredMetricNormal = normalize(normal / hammeredScale);
vHammeredAO = vec2(materialAO, materialLightAO);
`;
const fragmentInputs = /* glsl */ `
uniform sampler2D hammeredField;
uniform float hammeredPeriod;
uniform float hammeredPitch;
uniform float hammeredDepthRatio;
uniform float hammeredRelief;
varying vec3 vHammeredPosition;
varying vec3 vHammeredMetricNormal;
varying vec2 vHammeredAO;

// Height derivative uses the same Three sided convention as Atelier's existing
// procedural surfaces. This perturbs lighting only, never vertex positions.
vec3 hammeredBump(vec3 n, vec3 p, vec2 heightDerivatives) {
  vec3 dx = dFdx(p), dy = dFdy(p), r1 = cross(dy, n), r2 = cross(n, dx);
  float faceSign = 1.0;
  #ifdef DOUBLE_SIDED
    faceSign = gl_FrontFacing ? 1.0 : -1.0;
  #endif
  #ifdef FLIP_SIDED
    faceSign = -1.0;
  #endif
  float determinant = dot(dx, r1) * faceSign;
  vec3 gradient = sign(determinant) * (heightDerivatives.x * r1 + heightDerivatives.y * r2);
  return normalize(max(abs(determinant), 1e-12) * n - gradient);
}
`;
const surface = /* glsl */ `
vec3 hammeredQ = vHammeredPosition / (hammeredPitch * hammeredPeriod);
vec3 hammeredN = normalize(vHammeredMetricNormal);
vec3 hammeredW = pow(abs(hammeredN), vec3(4.0));
hammeredW /= max(dot(hammeredW, vec3(1.0)), 1e-7);
// Three trilinear texture samples; each mip averages h, slope and E[slope²].
vec4 hammeredX = texture2D(hammeredField, hammeredQ.yz + vec2(.173, .419));
vec4 hammeredY = texture2D(hammeredField, hammeredQ.xz + vec2(.613, .227));
vec4 hammeredZ = texture2D(hammeredField, hammeredQ.xy);
float hammeredHeight = dot(hammeredW, vec3(hammeredX.r, hammeredY.r, hammeredZ.r))
  * hammeredPitch * hammeredDepthRatio * hammeredRelief;
// Differentiate the filtered scalar by the chain rule. Stored mean slopes
// avoid 2x2-quad height differences aliasing resolved dents at small scales.
// Include changing projection weights, rather than blend arbitrary normals.
vec3 hammeredGradient = hammeredW.x * vec3(0.0, hammeredX.g, hammeredX.b)
  + hammeredW.y * vec3(hammeredY.g, 0.0, hammeredY.b)
  + hammeredW.z * vec3(hammeredZ.g, hammeredZ.b, 0.0);
vec3 hammeredHeights = vec3(hammeredX.r, hammeredY.r, hammeredZ.r);
vec2 hammeredHeightDerivatives = (
  vec2(dot(hammeredGradient, dFdx(vHammeredPosition)), dot(hammeredGradient, dFdy(vHammeredPosition)))
  + hammeredPitch * vec2(dot(dFdx(hammeredW), hammeredHeights), dot(dFdy(hammeredW), hammeredHeights)))
  * hammeredDepthRatio * hammeredRelief;
// Assume independent projections for unresolved variance. Offset projections
// reuse one atlas; omitted cross-covariance, tangent projection and weight
// derivative variance make this an approximate isotropic moment closure.
vec3 hammeredVariance = max(vec3(hammeredX.a - dot(hammeredX.gb, hammeredX.gb),
  hammeredY.a - dot(hammeredY.gb, hammeredY.gb), hammeredZ.a - dot(hammeredZ.gb, hammeredZ.gb)), vec3(0.0));
float hammeredSlopeVariance = dot(hammeredW * hammeredW, hammeredVariance)
  * pow2(hammeredDepthRatio * hammeredRelief);
`;

export function injectHammeredShader(shader, resources, { albedo = false, relief = 1 } = {}) {
  Object.assign(shader.uniforms, {
    hammeredField: { value: resources?.texture ?? null }, hammeredPeriod: { value: resources?.period ?? 16 },
    hammeredPitch: { value: .055 }, hammeredDepthRatio: { value: .038 }, hammeredRelief: { value: relief },
  });
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${vertexInputs}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexBody}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${fragmentInputs}`);
  if (albedo) {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <opaque_fragment>', 'gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a);')
      .replace('#include <colorspace_fragment>', '');
    return;
  }
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <color_fragment>', `#include <color_fragment>\n${surface}`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      // Three alpha = perceptual roughness². Add unresolved slope variance to
      // alpha² and return to perceptual roughness. The stored moment is total
      // two-axis slope energy; an isotropic per-axis closure takes half of it.
      // Resolved pits keep the stock BRDF. This is not an exact GGX convolution.
      roughnessFactor = clamp(pow(pow(roughnessFactor, 4.0) + .5 * hammeredSlopeVariance, .25), .0525, 1.0);`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = hammeredBump(normal, -vViewPosition, hammeredHeightDerivatives);`)
    .replace('#include <aomap_fragment>', `#include <aomap_fragment>
      float hammeredLightAO = clamp(vHammeredAO.y < 0.0 ? vHammeredAO.x : vHammeredAO.y, 0.0, 1.0);
      reflectedLight.indirectDiffuse *= hammeredLightAO;
      reflectedLight.indirectSpecular *= computeSpecularOcclusion(saturate(dot(geometryNormal, geometryViewDir)), hammeredLightAO, material.roughness);`);
}

export function createHammeredMetalMaterial(environment, { side = THREE.FrontSide, albedo = false, relief = 1, resources } = {}) {
  if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side)) throw new RangeError('Invalid material side');
  if (!Number.isFinite(relief) || relief < 0 || relief > 1) throw new RangeError('Relief must be in [0,1]');
  if (!albedo && !resources?.texture?.isTexture) throw new TypeError('Shared hammered resources are required for beauty');
  const d = hammeredMetalDefinition;
  const material = new THREE.MeshPhysicalMaterial({ color: d.baseColor, metalness: 1,
    roughness: d.roughness, clearcoat: 0, transmission: 0, anisotropy: 0, sheen: 0,
    envMap: albedo ? null : environment, envMapIntensity: albedo ? 0 : .8,
    side, transparent: false, opacity: 1, depthWrite: true });
  material.name = `Atelier Hammered metal${albedo ? ' albedo' : ''}`;
  material.toneMapped = !albedo;
  material.defaultAttributeValues = { materialAO: [1], materialLightAO: [-1] };
  material.userData = { materialId: d.id, physicalSurface: true, bakedGeometry: true,
    normalReliefOnly: true, metric: 'orthogonal-object-scale', pitch: .055 };
  material.onBeforeCompile = shader => injectHammeredShader(shader, resources, { albedo, relief });
  material.customProgramCacheKey = () => `atelier-hammered-v1:${side}:${albedo ? 1 : 0}`;
  return material;
}
