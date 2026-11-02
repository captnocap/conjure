import { copyMaterialVisibility } from "./material-visibility.js";
// Structured-clone descriptor. Never transfer live Three.js geometry buffers.
export function snapshotFrame(raw) {
  const frame = {};
  for (const key of [
    "size",
    "color",
    "normal",
    "depth",
    "identity",
    "diffuse",
    "material",
    "albedo",
    "transmission",
    "materialProfiles",
    "materialSettings",
    "materialBakeMetadata",
    "pixelWorldSize",
    "metalnesses",
    "edges",
    "edgeOwners",
    "baseColors",
    "transmissions",
    "reliefLight",
    "worldFromClip",
    "cameraProjection",
    "spectralLights",
    "spectralHemisphere",
    "near",
    "far",
  ])
    frame[key] = raw[key];
  if (raw.materialVisibility) frame.materialVisibility = copyMaterialVisibility(raw.materialVisibility);
  if (raw.sectionRibLighting) frame.sectionRibLighting = raw.sectionRibLighting;
  if (raw.cutawayShadowCamera) frame.cutawayShadowCamera = {
    view: Array.from(raw.cutawayShadowCamera.view),
    projection: Array.from(raw.cutawayShadowCamera.projection),
  };
  if (raw.geometrySnapshot) frame.geometry = raw.geometrySnapshot();
  else
    for (const key of [
      "points",
      "sections",
      "boundaries",
      "voxels",
      "hatches",
      "membranes",
    ])
      frame[key] = raw[key];
  return frame;
}
