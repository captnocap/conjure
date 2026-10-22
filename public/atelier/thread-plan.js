// The worker owns the expensive solver. Only this bounded drawing description
// crosses back to the main thread; raw capture identity is never serialized.
import { THREAD_MODEL, perimeterPins } from "./continuous-thread.js";
const version = 1;
const captures = new WeakMap();
let nextSource = 0;
const exactKeys = (value, keys) => value && typeof value === "object" &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function validateThreadPlan(plan, { source, size, seed }) {
  if (!exactKeys(plan, ["version", "source", "size", "seed", "model", "pins", "path", "count"]) ||
      plan.version !== version || plan.source !== source || plan.size !== size || plan.seed !== seed ||
      typeof source !== "string" || !source.length || source.length > 80 ||
      !Number.isInteger(size) || size < 1 || size > 4096 || !Number.isFinite(seed) ||
      !exactKeys(plan.model, Object.keys(THREAD_MODEL)) ||
      Object.keys(THREAD_MODEL).some(key => plan.model[key] !== THREAD_MODEL[key]) ||
      !Number.isInteger(plan.count) || plan.count < 0 || plan.count > THREAD_MODEL.maxChords ||
      !(plan.path instanceof Uint16Array) || plan.path.length !== (plan.count ? plan.count + 1 : 0) ||
      !Array.isArray(plan.pins) || plan.pins.length !== THREAD_MODEL.pins)
    throw Error("Invalid continuous thread plan");
  const pins = perimeterPins(THREAD_MODEL.pins, THREAD_MODEL.resolution), used = new Set();
  for (let i = 0; i < pins.length; i++) {
    const point = plan.pins[i];
    if (!Array.isArray(point) || point.length !== 2 ||
        point[0] !== pins[i][0] / THREAD_MODEL.resolution ||
        point[1] !== pins[i][1] / THREAD_MODEL.resolution)
      throw Error("Invalid continuous thread pins");
  }
  for (let i = 0; i < plan.path.length; i++) {
    const b = plan.path[i];
    if (b >= pins.length) throw Error("Invalid continuous thread path");
    if (!i) continue;
    const a = plan.path[i - 1], edge = Math.min(a, b) * pins.length + Math.max(a, b),
      p = plan.pins[a], q = plan.pins[b];
    if (a === b || used.has(edge) ||
        (p[0] === q[0] && (p[0] === 0 || p[0] === 1)) ||
        (p[1] === q[1] && (p[1] === 0 || p[1] === 1)))
      throw Error("Invalid continuous thread chord");
    used.add(edge);
  }
  return plan;
}

export function compactThreadPlan(full, association) {
  return validateThreadPlan({ version, ...association,
    model: { ...full.model }, pins: full.pins.map(point => [...point]),
    path: full.path.slice(), count: full.stats?.accepted ?? full.count,
  }, association);
}

export function threadPreparation(raw, seed) {
  let capture = captures.get(raw);
  if (!capture) {
    capture = { source: `thread-${++nextSource}`, plans: new Map() };
    captures.set(raw, capture);
  }
  return { source: capture.source, size: raw.size, seed, plan: capture.plans.get(seed) };
}

export function rememberThreadPlan(raw, seed, plan) {
  const association = threadPreparation(raw, seed);
  validateThreadPlan(plan, association);
  const plans = captures.get(raw).plans;
  plans.delete(seed);
  plans.set(seed, plan);
  // At most two seeds per live immutable raw capture. The WeakMap never retains
  // discarded captures, and the plan contains no masks, target or prediction.
  while (plans.size > 2) plans.delete(plans.keys().next().value);
}
