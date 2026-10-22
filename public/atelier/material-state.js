// Material choices belong to the captured scene, independently of its p5 study.
// Object 1 is the fixed floor; omitted assignments preserve original materials.
import { PERFORATED_SHELL_ID, ELIGIBLE_IDS } from "./perforated-shell-field.js";
import { SHINGLE_RELIEF_ID, SHINGLE_ELIGIBLE_IDS } from "./shingle-relief-config.js";
import { ENAMEL_RESERVE_ID, ENAMEL_ELIGIBLE_IDS } from "./enamel-reserve-config.js";
import { RIBBED_CLAY_ID, RIBBED_CLAY_ELIGIBLE_IDS } from "./ribbed-clay-config.js";
export { PERFORATED_SHELL_ID, MODEL_VERSION } from "./perforated-shell-field.js";

export const materialIds = Object.freeze([
  "brushed-steel",
  "chrome",
  "brass",
  "copper",
  "porcelain",
  "marble",
  "concrete",
  "stone",
  "wood",
  "frosted-glass",
  "skin",
  "adipose",
  "muscle",
  "cortical-bone",
  "cancellous-bone",
  "velvet",
  "woven-linen",
  "diffraction-foil",
  "hammered-metal",
  "interference-coat",
  "tiled-surface",
  "perlage-metal",
  PERFORATED_SHELL_ID,
  SHINGLE_RELIEF_ID,
  ENAMEL_RESERVE_ID,
  RIBBED_CLAY_ID,
]);
export const materialObjects = Object.freeze(
  [
    [2, "Base"],
    [3, "Arch"],
    [4, "Front step"],
    [5, "Middle step"],
    [6, "Back step"],
    [7, "Vase"],
    [8, "Torus"],
    [9, "Pedestal"],
    [10, "Sphere"],
    [11, "Main stem"],
    [12, "Branch 1"],
    [13, "Leaf 1"],
    [14, "Branch 2"],
    [15, "Leaf 2"],
    [16, "Branch 3"],
    [17, "Leaf 3"],
    [18, "Branch 4"],
    [19, "Leaf 4"],
    [20, "Pebble"],
  ].map(([id, name]) => Object.freeze({ id, name })),
);
const objectIds = new Set(materialObjects.map(({ id }) => String(id))),
  mixedAssignments = Object.freeze({
    2: "stone",
    3: "concrete",
    4: "concrete",
    5: "concrete",
    6: "concrete",
    7: "porcelain",
    8: "brass",
    9: "marble",
    10: "chrome",
    20: "stone",
  }),
  mixedSignature = JSON.stringify(mixedAssignments);

// Keep support in one pure rule for state, selectors, tools and randomization.
// Original and unrestricted materials remain available on every scene object.
export function supportsMaterial(material, objectId) {
  const id =
    typeof objectId === "number" || typeof objectId === "string"
      ? String(objectId)
      : "";
  return (
    objectIds.has(id) &&
    (material === "original" || materialIds.includes(material)) &&
    (material !== PERFORATED_SHELL_ID || ELIGIBLE_IDS.includes(Number(id))) &&
    (material !== SHINGLE_RELIEF_ID || SHINGLE_ELIGIBLE_IDS.includes(Number(id))) &&
    (material !== ENAMEL_RESERVE_ID || ENAMEL_ELIGIBLE_IDS.includes(Number(id))) &&
    (material !== RIBBED_CLAY_ID || RIBBED_CLAY_ELIGIBLE_IDS.includes(Number(id)))
  );
}

export const materialIdsForObject = (objectId) =>
  materialIds.filter((material) => supportsMaterial(material, objectId));

export const defaultMaterials = () => ({
  preset: "original",
  assignments: {},
});
export const mixedMaterials = () => ({
  preset: "mixed",
  assignments: { ...mixedAssignments },
});
// A convenient palette, serialized as ordinary custom assignments so existing
// version-one recipes and the Original/Mixed defaults retain their semantics.
export const tissueMaterials = () => ({
  preset: "custom",
  assignments: {
    2: "cortical-bone",
    3: "cortical-bone",
    4: "cancellous-bone",
    5: "cortical-bone",
    6: "cancellous-bone",
    7: "skin",
    8: "muscle",
    9: "adipose",
    10: "adipose",
    11: "muscle",
    12: "muscle",
    13: "skin",
    14: "muscle",
    15: "skin",
    16: "muscle",
    17: "skin",
    18: "muscle",
    19: "skin",
    20: "cancellous-bone",
  },
});

export function validateMaterials(value = defaultMaterials()) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.prototype.toString.call(value) !== "[object Object]" ||
    !Object.hasOwn(value, "preset") ||
    !Object.hasOwn(value, "assignments") ||
    !["original", "mixed", "custom"].includes(value.preset) ||
    !value.assignments ||
    typeof value.assignments !== "object" ||
    Object.prototype.toString.call(value.assignments) !== "[object Object]"
  )
    throw Error("Choose valid scene materials");
  const assignments = {};
  for (const [id, material] of Object.entries(value.assignments)) {
    if (!objectIds.has(id))
      throw Error("Choose a known scene object from 2 to 20");
    if (material !== "original" && !materialIds.includes(material))
      throw Error("Choose a known scene material");
    if (!supportsMaterial(material, id)) {
      const object = materialObjects.find((object) => String(object.id) === id);
      if (material === RIBBED_CLAY_ID)
        throw Error(`Ribbed clay is unavailable for ${object.name} (${id}); it is available for Vase (7).`);
      if (material === ENAMEL_RESERVE_ID)
        throw Error(`Enamel reserve is unavailable for ${object.name} (${id}); it is available for Vase (7).`);
      if (material === SHINGLE_RELIEF_ID)
        throw Error(`Shingle relief is unavailable for ${object.name} (${id}); it is available for Vase (7).`);
      throw Error(
        `Perforated metal shell is unavailable for ${object.name} (${id}); it is available for Vase (7) and Sphere (10).`,
      );
    }
    if (material !== "original") assignments[id] = material;
  }
  // Integer object IDs serialize in numeric order. Derive the label from the
  // effective map: a stale preset can never overwrite custom assignments.
  const signature = JSON.stringify(assignments);
  return {
    preset:
      signature === "{}"
        ? "original"
        : signature === mixedSignature
          ? "mixed"
          : "custom",
    assignments,
  };
}

export const materialSignature = (value) =>
  JSON.stringify(validateMaterials(value).assignments);

// Keep historical export names unchanged when every object is original.
export function materialFingerprint(value) {
  const signature = materialSignature(value);
  if (signature === "{}") return "";
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i++)
    hash = Math.imul(hash ^ signature.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
