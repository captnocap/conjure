import { materialObjects } from "./material-state.js";
import { layerTone } from "./reference-tones.js";

// These IDs are the exact red-channel labels in the geometric-front capture.
// They describe visible surfaces, including the surface receiving a shadow.
export const targetObjects = Object.freeze([
  Object.freeze({ id: 0, name: "Backdrop (outside floor)" }),
  Object.freeze({ id: 1, name: "Floor" }),
  ...materialObjects,
]);
export const targetPresets = Object.freeze([
  { value: "all", label: "Whole scene" },
  { value: "foreground", label: "Foreground objects", targets: materialObjects.map(({ id }) => id) },
  { value: "surroundings", label: "Floor & backdrop", targets: [0, 1] },
  { value: "architecture", label: "Base, arch & steps", targets: [2, 3, 4, 5, 6, 9] },
  { value: "vase", label: "Vase", targets: [7] },
  { value: "ring", label: "Torus", targets: [8] },
  { value: "sphere", label: "Sphere", targets: [10] },
  { value: "plant", label: "Plant", targets: Array.from({ length: 9 }, (_, i) => i + 11) },
  { value: "pebble", label: "Pebble", targets: [20] },
  { value: "none", label: "Nothing selected", targets: [] },
].map(preset => Object.freeze({
  ...preset,
  ...(Object.hasOwn(preset, "targets") ? { targets: Object.freeze(preset.targets) } : {}),
})));

export const hasTargets = layer => Object.hasOwn(layer, "targets");

export function validateTargets(targets) {
  if (!Array.isArray(targets) || targets.length > targetObjects.length)
    throw Error("Targets must be unique integer object IDs from 0 to 20");
  const seen = new Set(), copy = [];
  for (let i = 0; i < targets.length; i++) {
    const id = targets[i];
    // Own elements reject sparse arrays even if Array.prototype supplies a value.
    if (!Object.hasOwn(targets, i) || !Number.isInteger(id) || id < 0 || id > 20 || seen.has(id))
      throw Error("Targets must be unique integer object IDs from 0 to 20");
    seen.add(id); copy.push(id);
  }
  return copy.sort((a, b) => a - b);
}

export function copyTargetLayer(layer) {
  const { id, enabled, weight, blend } = layer, tone = layerTone(layer);
  return { id, enabled, weight, blend,
    ...(hasTargets(layer) ? { targets: validateTargets(layer.targets) } : {}),
    ...(tone !== "all" ? { tone } : {}),
  };
}

// A single capture is cached, bounding retained mask storage to 720² bytes.
// Jobs retain their immutable snapshot if a newer capture replaces this cache.
// Neither the cached bytes nor a mutable view escapes this module. Mutating the
// caller's identity buffer after its first use cannot change captured ownership.
let cachedIdentity = null, cachedOwners = null;
function ownership(identity, length) {
  if (!(identity instanceof Uint8Array || identity instanceof Uint8ClampedArray) ||
      identity.length !== length || length % 4 || length > 720 * 720 * 4)
    throw Error("Object targeting requires a matching RGBA8 identity capture up to 720px");
  if (identity === cachedIdentity) return cachedOwners;
  const owners = new Uint8Array(length / 4);
  for (let pixel = 0; pixel < owners.length; pixel++) {
    const id = identity[pixel * 4];
    if (id > 20) throw Error("Identity capture must contain exact object IDs from 0 to 20");
    owners[pixel] = id;
  }
  cachedIdentity = identity; cachedOwners = owners;
  return owners;
}

// Call with validated, active snapshots. Whole-scene jobs need no identity at
// all; an explicit empty selection has already been excluded from active rows.
export function prepareObjectTargets(active, identity, length) {
  if (!active.some(hasTargets)) return null;
  const owners = ownership(identity, length),
    byOwner = Object.freeze(targetObjects.map(({ id }) => Object.freeze(
      active.flatMap((layer, index) => !hasTargets(layer) || layer.targets.includes(id) ? [index] : []),
    )));
  return Object.freeze({ byOwner, ownerAt: pixel => owners[pixel] });
}
