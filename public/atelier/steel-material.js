// Object-Y brushed steel. These directions describe grooves, not the broad
// GGX axis: KHR_materials_anisotropy expands roughness across micro-grooves.
export const steelVertexInputs = /* glsl */ `
varying vec3 vSteelViewY;
varying vec3 vSteelViewObjectNormal;
`;

export const steelVertexBody = /* glsl */ `
vSteelViewY = mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0);
vSteelViewObjectNormal = mat3(modelViewMatrix) * normal;
`;

export const steelPhysicalBody = /* glsl */ `
#ifdef USE_ANISOTROPY
  // Project in material/object space before deformation. Transforming this
  // surface direction with M (not inverse-transpose M) preserves its tangent
  // direction under nonuniform and mirrored transforms.
  float steelNormalLength = max(length(vMaterialNormal), 1e-8);
  vec3 steelObjectNormal = vMaterialNormal / steelNormalLength;
  float steelProjectionSq = max(1.0-pow2(steelObjectNormal.y), 0.0);
  vec3 steelGrooveView = vSteelViewY
    - vSteelViewObjectNormal * (steelObjectNormal.y / steelNormalLength);
  // The final frame follows the existing bumped shading normal.
  vec3 steelProjected = steelGrooveView-normal*dot(steelGrooveView,normal);
  float steelViewProjectionSq = dot(steelProjected,steelProjected);
  // The guard and normalization floor scale with the transformed material
  // axis, so changing object units cannot rotate a valid brush direction.
  float steelProjectionFloor = 1e-12*max(dot(vSteelViewY,vSteelViewY),1e-30);
  vec3 steelFallbackAxis = abs(normal.y)<0.9 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 steelGroove = steelViewProjectionSq>steelProjectionFloor
    ? steelProjected*inversesqrt(max(steelViewProjectionSq,steelProjectionFloor))
    : normalize(cross(normal,steelFallbackAxis));
  material.anisotropyT = normalize(cross(steelGroove,normal));
  material.anisotropyB = normalize(cross(normal,material.anisotropyT));
  // The existing volume has isotropic X/Z variation on object-Y end faces.
  // No direction should be invented where the object-space brush collapses.
  material.anisotropy *= smoothstep(0.02,0.75,steelProjectionSq);
  material.alphaT = mix(pow2(material.roughness),1.0,pow2(material.anisotropy));
#endif
`;
