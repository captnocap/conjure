import * as THREE from "three";

// An artist-selected optical approximation, not measured glass. Thickness is a
// constant local-space travel distance, not an intersection with the back face.
// Three r180 samples the already rendered scene color at the projected ray end.
export const frostedGlassDefinition = Object.freeze({
  id: "frosted-glass",
  name: "Frosted glass",
  baseColor: "#ffffff",
  metalness: 0,
  roughness: 0.19,
  transmission: 1,
  ior: 1.46,
  thickness: 0.42,
  attenuationColor: "#c5e2d6",
  attenuationDistance: 3.5,
  description: "Soft refracted background, fine frost and a faint green tint",
});

const vertexInputs = /* glsl */ `
varying vec3 vAtelierGlassPosition;
`;
const fragmentInputs = /* glsl */ `
varying vec3 vAtelierGlassPosition;
float atelierGlassHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float atelierGlassNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(atelierGlassHash(i), atelierGlassHash(i + vec3(1,0,0)), f.x),
                 mix(atelierGlassHash(i + vec3(0,1,0)), atelierGlassHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(atelierGlassHash(i + vec3(0,0,1)), atelierGlassHash(i + vec3(1,0,1)), f.x),
                 mix(atelierGlassHash(i + vec3(0,1,1)), atelierGlassHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 atelierGlassBump(vec3 n, vec3 positionInView, float height) {
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

// Pin the vendored r180 caller exactly. Its single view vector also supplies
// transmission-side Fresnel inside getIBLVolumeRefraction. Keep the vendor
// chunk global and all of its optical/compositing operations untouched.
const transmissionFragmentR180 = /* glsl */ `#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`;

function orthographicTransmissionFragment(fragmentShader) {
  const include = "#include <transmission_fragment>";
  const native = THREE.ShaderChunk.transmission_fragment;
  const perspective = "vec3 v = normalize( cameraPosition - pos );";
  const alreadyOrthographic = "vec3 v = isOrthographic ? inverseTransformDirection( vec3( 0.0, 0.0, 1.0 ), viewMatrix ) : normalize( cameraPosition - pos );";
  if (fragmentShader.split(include).length !== 2 || !native.includes("getIBLVolumeRefraction") ||
      (!native.includes(perspective) && !native.includes(alreadyOrthographic)))
    throw new Error("Atelier frosted glass: unsupported host transmission shader contract");
  return native.replace(perspective, alreadyOrthographic);
}

export function injectFrostedGlassShader(shader, albedo = false) {
  // Check before mutating either source. Albedo keeps its original shader.
  const transmissionFragment = albedo
    ? null
    : orthographicTransmissionFragment(shader.fragmentShader);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${vertexInputs}`)
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvAtelierGlassPosition = position;",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${fragmentInputs}`)
    .replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
      // Band-limit object-space microfrost as it becomes subpixel. The mean
      // stays unchanged. It alters the actual transmission/reflection lobes.
      vec3 frostP = vAtelierGlassPosition * 72.0;
      float frostFootprint = max(length(dFdx(frostP)), length(dFdy(frostP)));
      float frostWeight = 1.0 - smoothstep(0.45, 1.4, frostFootprint);
      float frost = (atelierGlassNoise(frostP) - 0.5) * frostWeight;
      roughnessFactor = clamp(roughness + frost * 0.055, 0.0525, 1.0);`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      normal = atelierGlassBump(normal, -vViewPosition, frost * 0.00012);`,
    );
  // Deliberately no pigment dirt or opaque baked AO on this optical surface.
  // Only the beauty caller's view direction changes for parallel camera rays.
  // Native transmission, attenuation, Fresnel and light equations are retained.
  if (!albedo)
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <transmission_fragment>",
      transmissionFragment,
    );
  if (albedo)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <opaque_fragment>",
        "gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a);",
      )
      .replace("#include <colorspace_fragment>", "");
}

export function createFrostedGlassMaterial(
  environment,
  { side = THREE.FrontSide, albedo = false } = {},
) {
  const d = frostedGlassDefinition;
  const material = new THREE.MeshPhysicalMaterial({
    color: d.baseColor,
    metalness: d.metalness,
    roughness: d.roughness,
    // Albedo is the linear base-color factor, not absorbed/refracted radiance.
    // Disabling transmission prevents an albedo transmission prepass/feedback.
    transmission: albedo ? 0 : d.transmission,
    ior: d.ior,
    thickness: d.thickness,
    attenuationColor: d.attenuationColor,
    attenuationDistance: d.attenuationDistance,
    opacity: 1,
    transparent: false,
    depthWrite: true,
    side,
    envMap: environment,
    envMapIntensity: 0.8,
  });
  material.name = `Atelier Frosted glass${albedo ? " albedo" : ""}`;
  material.userData = {
    materialId: d.id,
    physicalSurface: true,
    opticalSurface: true,
    ...(albedo ? { albedoSurface: true } : {}),
    opticalThickness: "uniform-local-space-approximation",
  };
  material.toneMapped = !albedo;
  material.fog = !albedo;
  material.defaultAttributeValues = {
    materialConvex: [0],
    materialConcave: [0],
    materialAO: [1],
    materialLightAO: [-1], // Legacy fallback: use materialAO when the new input is absent.
    materialConvexEdge: [1e4, 1e4, 1e4],
    materialConcaveEdge: [1e4, 1e4, 1e4],
  };
  material.onBeforeCompile = (shader) =>
    injectFrostedGlassShader(shader, albedo);
  material.customProgramCacheKey = () =>
    albedo ? "atelier-glass-albedo-v2" : "atelier-glass-surface-v3-orthographic";
  return material;
}
