import * as THREE from 'three';

// This is an isolated fixed-stack candidate, not a measured material fit.
export const interferenceCoatDefinition = Object.freeze({
  id: 'interference-coat', name: 'Interference coat',
  description: 'A uniform dielectric film over a dark opaque body',
  linearPigment: Object.freeze([.025, .025, .025]),
  metalness: 0, roughness: .1, transmission: 0,
  thicknessNm: 300, indices: Object.freeze([1, 2, 1.5]),
});

// r180 DataUtils truncates low mantissa bits. Choose nearest-even half so the
// actual GPU knots match the explicitly verified optical integration inputs.
function nearestHalf(value) {
  const low = THREE.DataUtils.toHalfFloat(value);
  const a = THREE.DataUtils.fromHalfFloat(low), b = THREE.DataUtils.fromHalfFloat(low + 1);
  const da = value - a, db = b - value;
  return da > db || (da === db && (low & 1)) ? low + 1 : low;
}
function texture(data, width, height, name) {
  const result = new THREE.DataTexture(Uint16Array.from(data, nearestHalf),
    width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  result.minFilter = result.magFilter = THREE.LinearFilter;
  result.generateMipmaps = false;
  result.wrapS = result.wrapT = THREE.ClampToEdgeWrapping;
  result.colorSpace = THREE.NoColorSpace;
  result.flipY = false;
  result.needsUpdate = true;
  result.name = name;
  return result;
}

// Both arrays are immutable CPU integration products. The caller owns the two
// returned textures and may share them among all object sides and assignments.
export function createInterferenceResources({ phase, energy, metadata }) {
  if (!metadata || metadata.phaseWidth !== 1024 || metadata.energyWidth !== 128 ||
      metadata.energyHeight !== 32 || ![240, 300, 360].includes(metadata.thicknessNm) ||
      !Number.isFinite(metadata.averageEntry) || metadata.averageEntry < 0 || metadata.averageEntry > 1)
    throw new RangeError('Coat resources require a supported fixed table schema');
  if (!(phase instanceof Float32Array) || !(energy instanceof Float32Array) ||
      phase.length !== 1024 * 4 || energy.length !== 128 * 32 * 4)
    throw new TypeError('Coat table dimensions do not match the bounded schema');
  const settings = Object.freeze({ phaseWidth: 1024, energyWidth: 128, energyHeight: 32,
    thicknessNm: metadata.thicknessNm, averageEntry: metadata.averageEntry });
  if (![...phase, ...energy].every(x => Number.isFinite(x) && x >= 0 && x <= 1))
    throw new RangeError('Coat reflectance tables must be finite in [0,1]');
  const phaseTexture = texture(phase, metadata.phaseWidth, 1, 'Coat exact fixed-stack D65 phase');
  const energyTexture = texture(energy, metadata.energyWidth,
    metadata.energyHeight, 'Coat GGX directional response and conservative budget');
  let disposed = false;
  return Object.freeze({
    metadata: settings,
    get phase() { if (disposed) throw new Error('Coat resources disposed'); return phaseTexture; },
    get energy() { if (disposed) throw new Error('Coat resources disposed'); return energyTexture; },
    get disposed() { return disposed; },
    dispose() { if (!disposed) { disposed = true; phaseTexture.dispose(); energyTexture.dispose(); } },
  });
}

const vertexInputs = /* glsl */ `
attribute float materialAO;
attribute float materialLightAO;
varying vec2 vCoatAO;
`;
const fragmentInputs = /* glsl */ `
uniform sampler2D coatPhase;
uniform sampler2D coatEnergy;
uniform float coatPhaseWidth;
uniform float coatEnergyWidth;
uniform float coatEnergyHeight;
uniform float coatDiffuseEntry;
varying vec2 vCoatAO;

// No N dot V cache is used for direct film phase. Under an orthographic camera
// and one directional light, this color is constant over a uniform coating.
vec3 coatFilm(float cosine) {
  float x = (clamp(cosine, 0.0, 1.0) * (coatPhaseWidth - 1.0) + .5) / coatPhaseWidth;
  return texture2D(coatPhase, vec2(x, .5)).rgb;
}

// Preintegrated single-scatter response, bilinear in cosine and perceptual
// roughness. This includes film-phase averaging over the GGX lobe. The studio
// remains a PMREM split sum; film and environment are not jointly integrated.
vec4 coatResponse(float cosine, float roughness) {
  float x = (clamp(cosine, 0.0, 1.0) * (coatEnergyWidth - 1.0) + .5) / coatEnergyWidth;
  float y = (clamp(roughness, 0.0, 1.0) * (coatEnergyHeight - 1.0) + .5) / coatEnergyHeight;
  return texture2D(coatEnergy, vec2(x, y));
}
`;
const physical = /* glsl */ `
void RE_Direct_Coat(const in IncidentLight light, const in vec3 position,
  const in vec3 normal, const in vec3 view, const in vec3 clearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  float nl = saturate(dot(normal, light.direction));
  float nv = saturate(dot(normal, view));
  if (nl <= 0.0 || nv <= 0.0) return;
  vec3 halfDirection = normalize(light.direction + view);
  float nh = saturate(dot(normal, halfDirection));
  float vh = saturate(dot(view, halfDirection));
  float alpha = pow2(material.roughness);
  vec3 film = coatFilm(vh);
  float visibility = V_GGX_SmithCorrelated(alpha, nl, nv);
  float distribution = D_GGX(alpha, nh);
  vec3 irradiance = nl * light.color;
  reflectedLight.directSpecular += irradiance * film * (visibility * distribution);
  // Reciprocal conservative substrate budget. Its proof uses a half-angle
  // supremum of reflectance and passive GGX, not dark pigment or display clamps.
  float entry = 1.0 - coatResponse(nl, material.roughness).a;
  float exit = 1.0 - coatResponse(nv, material.roughness).a;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert(material.diffuseColor) * entry * exit;
}

void RE_IndirectDiffuse_Coat(const in vec3 irradiance, const in vec3 position,
  const in vec3 normal, const in vec3 view, const in vec3 clearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  // Diffuse illumination uses a cosine-weighted average entry budget. This is
  // another split-sum approximation when incident radiance is not uniform.
  float exit = 1.0 - coatResponse(saturate(dot(normal, view)), material.roughness).a;
  float entry = coatDiffuseEntry;
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor) * entry * exit;
}

void RE_IndirectSpecular_Coat(const in vec3 radiance, const in vec3 irradiance,
  const in vec3 clearcoatRadiance, const in vec3 position, const in vec3 normal,
  const in vec3 view, const in vec3 clearcoatNormal,
  const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
  vec4 response = coatResponse(saturate(dot(normal, view)), material.roughness);
  reflectedLight.indirectSpecular += radiance * response.rgb;
  float entry = coatDiffuseEntry;
  reflectedLight.indirectDiffuse += irradiance * RECIPROCAL_PI * material.diffuseColor * entry * (1.0 - response.a);
}
#undef RE_Direct
#define RE_Direct RE_Direct_Coat
#undef RE_IndirectDiffuse
#define RE_IndirectDiffuse RE_IndirectDiffuse_Coat
#undef RE_IndirectSpecular
#define RE_IndirectSpecular RE_IndirectSpecular_Coat
`;

export function validateCoatTransform(matrix) {
  if (!matrix?.isMatrix4 || !matrix.elements.every(Number.isFinite) ||
      !Number.isFinite(matrix.determinant()) || Math.abs(matrix.determinant()) < 1e-12)
    throw new RangeError('Interference coat requires a finite invertible object transform');
}

export function createInterferenceCoatMaterial(environment, {
  side = THREE.FrontSide, albedo = false, resources = null, thicknessNm = 300, roughness = .1,
} = {}) {
  if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side)) throw new RangeError('Invalid coat side');
  if (!Number.isFinite(roughness) || roughness < .1 || roughness > 1) throw new RangeError('Coat roughness must be in [.1,1]');
  const color = new THREE.Color().setRGB(...interferenceCoatDefinition.linearPigment, THREE.LinearSRGBColorSpace);
  // Pigment captures allocate neither a physical material nor optical resources.
  if (albedo) {
    const material = new THREE.MeshBasicMaterial({ color, side, toneMapped: false, fog: false });
    material.name = 'Atelier Interference coat pigment';
    material.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => validateCoatTransform(object.matrixWorld);
    material.userData = { materialId: 'interference-coat', albedoSurface: true };
    return material;
  }
  if (!resources || resources.disposed) throw new TypeError('Live shared coat resources required');
  if (resources.metadata.thicknessNm !== thicknessNm) throw new RangeError('Unsupported fixed film thickness');
  const material = new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness, ior: 1.5,
    clearcoat: 0, transmission: 0, anisotropy: 0, iridescence: 0, sheen: 0,
    envMap: environment, envMapIntensity: .8, side, transparent: false, opacity: 1, depthWrite: true });
  material.name = 'Atelier Interference coat';
  material.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => validateCoatTransform(object.matrixWorld);
  material.defaultAttributeValues = { materialAO: [1], materialLightAO: [-1] };
  material.userData = { materialId: 'interference-coat', physicalSurface: true,
    opticalStack: [1, 2, 1.5], thicknessNm, uniformFilm: true,
    environmentApproximation: 'PMREM split sum times GGX-integrated film response' };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      coatPhase: { value: resources.phase }, coatEnergy: { value: resources.energy },
      coatPhaseWidth: { value: resources.metadata.phaseWidth },
      coatEnergyWidth: { value: resources.metadata.energyWidth },
      coatEnergyHeight: { value: resources.metadata.energyHeight },
      coatDiffuseEntry: { value: resources.metadata.averageEntry },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexInputs}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoatAO = vec2(materialAO, materialLightAO);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentInputs}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${physical}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        float coatAO = clamp(vCoatAO.y < 0.0 ? vCoatAO.x : vCoatAO.y, 0.0, 1.0);
        reflectedLight.indirectDiffuse *= coatAO;
        reflectedLight.indirectSpecular *= computeSpecularOcclusion(
          saturate(dot(geometryNormal, geometryViewDir)), coatAO, material.roughness);`);
  };
  material.customProgramCacheKey = () => `atelier-interference-coat-prototype-v1:${side}`;
  return material;
}
