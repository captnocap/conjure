// One exposure-independent field per immutable capture. A WeakMap releases the
// field with its capture; strength and seed changes never add extra entries.
// Main-thread plans are cloned into workers, never transferred or detached.
const version = 1;
const model = "thickness-exposure-v1";
const captures = new WeakMap();
let nextSource = 0;
const keys = ["version", "model", "source", "size", "total"];

export function validateThicknessPlan(plan, { source, size }) {
  if (!plan || typeof plan !== "object" || Object.keys(plan).length !== keys.length ||
      !keys.every(key => Object.hasOwn(plan, key)) || plan.version !== version ||
      plan.model !== model || plan.source !== source || plan.size !== size ||
      typeof source !== "string" || !source.length || source.length > 80 ||
      !Number.isInteger(size) || size < 1 || size > 720 ||
      !(plan.total instanceof Float64Array) || plan.total.length !== 4 * size * size)
    throw Error("Invalid thickness exposure plan");
  for (const value of plan.total)
    if (!Number.isFinite(value) || value < 0)
      throw Error("Invalid thickness exposure field");
  return plan;
}

export function thicknessPreparation(raw) {
  if (!raw || typeof raw !== "object" || !Number.isInteger(raw.size) || raw.size < 1 || raw.size > 720)
    throw Error("Invalid thickness exposure source");
  let capture = captures.get(raw);
  if (!capture) {
    capture = { source: `thickness-${++nextSource}`, plan: undefined };
    captures.set(raw, capture);
  }
  return { source: capture.source, size: raw.size, plan: capture.plan };
}

export function compactThicknessPlan(full, association) {
  return validateThicknessPlan({ version, model, source: association.source,
    size: association.size, total: full.total.slice() }, association);
}

export function rememberThicknessPlan(raw, plan) {
  validateThicknessPlan(plan, thicknessPreparation(raw));
  captures.get(raw).plan = plan;
}
