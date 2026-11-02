import * as THREE from "three";
import { apertureGLSL, MODEL_VERSION, PERFORATED_SHELL_ID, ELIGIBLE_IDS } from "./perforated-shell-field.js";

// The admitted ideal sheet is fixed: cylindrical apertures, no walls or rims.
export const perforatedShellDefinition = Object.freeze({
  id: PERFORATED_SHELL_ID,
  name: "Perforated metal",
  baseColor: "#eeeeee",
  metalness: 1,
  roughness: 0.28,
  description: "Perforated metal shell · Vase and Sphere · ideal zero-thickness surface",
});
const aoInputs = "attribute float materialLightAO;\nattribute float materialBackLightAO;\nvarying vec2 vShellLightAO;";

// This is the frozen shader construction. Each pass evaluates original local
// source positions and the same strict Float32 cylindrical aperture field.
export function decoratePerforatedShell(material, { lightingAO = false, physical = false } = {}) {
  const previous = material.onBeforeCompile.bind(material);
  material.side = THREE.DoubleSide;
  material.shadowSide = THREE.DoubleSide;
  material.userData = { ...material.userData, shellCoverage: MODEL_VERSION, shellMaskEnabled: true };
  material.defaultAttributeValues = { ...material.defaultAttributeValues, materialLightAO: [1], materialBackLightAO: [1] };
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    if (!shader.vertexShader.includes("#include <begin_vertex>") ||
        !shader.fragmentShader.includes("void main() {") ||
        (lightingAO && !shader.fragmentShader.includes("#include <aomap_fragment>")))
      throw new Error("Perforated metal requires the supported Three shader contract");
    shader.uniforms.shellMaskEnabled = { value: 1 };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\nvarying vec3 vShellPosition;\n${lightingAO ? aoInputs : ''}`).replace("#include <begin_vertex>", `#include <begin_vertex>\nvShellPosition=position;\n${lightingAO ? 'vShellLightAO=vec2(materialLightAO,materialBackLightAO);' : ''}`);
    shader.fragmentShader = `uniform float shellMaskEnabled;\nvarying vec3 vShellPosition;\n${apertureGLSL}\n${lightingAO ? 'varying vec2 vShellLightAO;' : ''}\n` + shader.fragmentShader.replace("void main() {", "void main() {\n if(shellMaskEnabled>0.5 && shellAperture(vShellPosition)) discard;");
    if (lightingAO) shader.fragmentShader = shader.fragmentShader.replace("#include <aomap_fragment>", `#include <aomap_fragment>\nfloat shellLightAO=clamp(gl_FrontFacing?vShellLightAO.x:vShellLightAO.y,0.0,1.0);\nreflectedLight.indirectDiffuse*=shellLightAO;\n${physical ? 'reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),shellLightAO,material.roughness);' : ''}`);
  };
  material.customProgramCacheKey = () => `atelier:${MODEL_VERSION}:true:${lightingAO}:${physical}:${material.type}`;
  return material;
}

export function createPerforatedShellMaterial(environment, { albedo = false } = {}) {
  const material = albedo
    ? new THREE.MeshBasicMaterial({ color: "#eeeeee", toneMapped: false })
    : new THREE.MeshStandardMaterial({ color: "#eeeeee", metalness: 1, roughness: 0.28, envMap: environment, envMapIntensity: 1.05, opacity: 1, transparent: false });
  material.name = `Atelier Perforated metal${albedo ? ' pigment' : ''}`;
  material.userData = { materialId: PERFORATED_SHELL_ID, zeroThickness: true, albedoSurface: albedo };
  return decoratePerforatedShell(material, { lightingAO: !albedo, physical: !albedo });
}

export function validatePerforatedShellGeometry(objectId, originalMesh, bakedGeometry) {
  if (!ELIGIBLE_IDS.includes(objectId))
    throw new RangeError("Perforated metal is available for Vase and Sphere only");
  const expectedType = objectId === 7 ? "LatheGeometry" : "SphereGeometry";
  const source = originalMesh?.geometry, positions = source?.getAttribute("position"), renderPositions = bakedGeometry?.getAttribute("position");
  if (source?.type !== expectedType || !positions || !renderPositions || bakedGeometry.index ||
      renderPositions.count !== (source.index?.count ?? positions.count))
    throw new TypeError("Perforated metal requires the unchanged Vase or Sphere source triangles");
  // IDs alone or geometry types alone cannot admit a leaf or a charted proxy.
  for (let i = 0; i < renderPositions.count; i++) {
    const vertex = source.index?.getX(i) ?? i;
    for (let axis = 0; axis < 3; axis++)
      if (renderPositions.array[i * 3 + axis] !== positions.array[vertex * 3 + axis])
        throw new TypeError("Perforated metal requires unchanged original source positions");
  }
  for (const name of ["materialLightAO", "materialBackLightAO"]) {
    const attribute = bakedGeometry.getAttribute(name);
    if (!attribute || attribute.itemSize !== 1 || attribute.count !== renderPositions.count)
      throw new TypeError("Perforated metal requires independent front and back lighting visibility");
  }
  return bakedGeometry;
}
