import { validateMix, mixerSourceIds, sceneReference } from "./mixer.js";
import { validateInk } from "./ink-effects.js";
import { validateMaterials } from "./material-state.js";
import { hasTargets, copyTargetLayer } from "./object-targets.js";
import { hasReferenceTone } from "./reference-tones.js";
export const recipeLimit = 65536;
export function createRecipe(state) {
  const scoped = state.mix.layers.some(hasTargets),
    reference = state.mix.layers.some(({ id }) => id === sceneReference.id),
    toned = state.mix.layers.some(hasReferenceTone),
    finished = Object.hasOwn(state.mix, "finish");
  return {
    format: "atelier-image-mix",
    version: finished ? 4 : toned ? 3 : scoped ? 2 : 1,
    style: state.style,
    output: "mix",
    mix: {
      mode: state.mix.mode,
      layers: state.mix.layers.map(copyTargetLayer),
      ...(finished ? { finish: { ...state.mix.finish } } : {}),
    },
    orbit: state.orbit,
    time: state.time,
    seed: state.seed,
    intensity: state.intensity,
    ink: validateInk(state.ink),
    materials: validateMaterials(state.materials),
    mode: state.mode,
    locks: {
      camera: state.locks.camera,
      time: state.locks.time,
      seed: state.locks.seed,
    },
    note: (reference
      ? scoped
        ? "Display-RGB composition of completed p5 studies and current captured scene pixels; Scene reference retains the current materials, camera and light without shared treatment strength. Target lists clip layers to selected visible objects, while omitted targets cover the whole scene. Ordered layers run bottom to top over the reference."
        : "Display-RGB composition of completed p5 studies and current captured scene pixels; Scene reference retains the current materials, camera and light without shared treatment strength. Ordered layers run bottom to top over the reference."
      : scoped
        ? "Display-RGB composition of completed p5 studies; target lists clip layers to selected visible objects, while omitted targets cover the whole scene. Ordered layers run bottom to top over the reference."
        : "Display-RGB composition of completed p5 studies; ordered layers run bottom to top over the reference.") +
      (toned ? " Reference-tone selections softly multiply source alpha using the captured scene's display-RGB brightness. Ordered layers reveal the lower stack; Average and Regions retain each source's existing share and fade masked influence toward the reference." : "") +
      (finished ? state.mix.finish.id === "fluted-glass"
        ? " Fluted glass bends the completed mixed image after all layer masks and blends through a fixed finite plate with eight broad flutes. Finish influence is final Normal display-RGB interpolation. Primary two-interface transmission only; reflected paths are omitted. The captured Garden stays unchanged, and image masks are not reapplied after finishing."
        : state.mix.finish.id === "ink-completed-mix"
        ? " Ink completed mix derives coherent ink from the completed mixed image after all layer masks and blends, then multiplies it into the same image. The full inked result is quantized before final Normal display-RGB influence. Fixed brightness-derived filtering; pale boundaries can disappear and nearby details can merge. No geometry or material fusion."
        : " Finite lenses samples the completed mixed image after all layer masks and blends. Finish influence is final Normal display-RGB interpolation. Primary transmitted paths only; finite-print misses are black and reflected paths are omitted." : ""),
  };
}
export function parseRecipe(text, studyIds) {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > recipeLimit
  )
    throw Error("Choose an Atelier recipe smaller than 64 KiB.");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error("This file is not valid recipe JSON.");
  }
  if (
    !value ||
    value.format !== "atelier-image-mix" ||
    ![1, 2, 3, 4].includes(value.version) ||
    (value.version === 4 && (!value.mix || !Object.hasOwn(value.mix, "finish")))
  )
    throw Error("Choose an Atelier image-mix recipe, version 1, 2, 3 or 4.");
  if (value.version < 4 && value.mix && Object.hasOwn(value.mix, "finish"))
    throw Error("Composition finishing requires an Atelier image-mix recipe, version 4.");
  // A v1 reader cannot represent object clipping. Never silently import a
  // mislabeled scoped recipe as a whole-scene mix, even with invalid targets.
  if (
    value.version === 1 &&
    Array.isArray(value.mix?.layers) &&
    value.mix.layers.some((layer) => layer && hasTargets(layer))
  )
    throw Error("Object targets require an Atelier image-mix recipe, version 2.");
  // Never silently enable new tone semantics in files labeled for older readers.
  // Even invalid non-default tone values in old files are rejected explicitly.
  if (
    value.version < 3 && Array.isArray(value.mix?.layers) &&
    value.mix.layers.some(layer => layer && Object.hasOwn(layer, "tone") && layer.tone !== "all")
  )
    throw Error("Reference tones require an Atelier image-mix recipe, version 3.");
  if (
    value.version >= 2 &&
    (value.output !== "mix" ||
      (Object.hasOwn(value, "note") && typeof value.note !== "string"))
  )
    throw Error("The recipe has an invalid output or note setting.");
  const mix = validateMix(value.mix, mixerSourceIds(studyIds));
  const ink = validateInk(value.ink);
  const materials = validateMaterials(value.materials);
  if (value.style === sceneReference.id || !studyIds.includes(value.style))
    throw Error(
      "The recipe refers to a study unavailable in this version of Atelier.",
    );
  for (const [key, min, max] of [
    ["orbit", -45, 45],
    ["time", 0, 100],
    ["seed", 1, 999999],
  ])
    if (!Number.isInteger(value[key]) || value[key] < min || value[key] > max)
      throw Error(`The recipe has an invalid ${key} setting.`);
  if (
    !Number.isFinite(value.intensity) ||
    value.intensity < 0.15 ||
    value.intensity > 0.95 ||
    Math.abs(value.intensity * 100 - Math.round(value.intensity * 100)) > 1e-9
  )
    throw Error("Recipe strength must be a whole percent from 15% to 95%.");
  if (!["compare", "solo"].includes(value.mode))
    throw Error("The recipe has an invalid view setting.");
  if (
    !value.locks ||
    ["camera", "time", "seed"].some(
      (key) => typeof value.locks[key] !== "boolean",
    )
  )
    throw Error("The recipe has invalid camera, time or seed locks.");
  // Copy known data only. Imported prototype keys and unrelated settings cannot
  // become application properties; parsing and validation finish before mutation.
  return {
    style: value.style,
    output: "mix",
    mix,
    orbit: value.orbit,
    time: value.time,
    seed: value.seed,
    intensity: Math.round(value.intensity * 100) / 100,
    ink,
    materials,
    mode: value.mode,
    locks: {
      camera: value.locks.camera,
      time: value.locks.time,
      seed: value.locks.seed,
    },
  };
}
