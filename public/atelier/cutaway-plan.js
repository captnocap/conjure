// A capture owns one completed cutaway image, independent of seed and strength.
// The shared worker receives copies; no live reference or retained plan detaches.
const captures = new WeakMap();
let nextSource = 0;
const keys = ['version', 'model', 'source', 'size', 'rgba'];

export function validateCutawayPlan(plan, { source, size }) {
  if (!plan || typeof plan !== 'object' || Object.keys(plan).length !== keys.length ||
      !keys.every(key => Object.hasOwn(plan, key)) || plan.version !== 1 ||
      plan.model !== 'single-cutaway-plan-v1' || plan.source !== source || plan.size !== size ||
      typeof source !== 'string' || !source.length || source.length > 80 ||
      !Number.isInteger(size) || size < 1 || size > 720 ||
      !(plan.rgba instanceof Uint8Array) || plan.rgba.length !== 4 * size * size ||
      !(plan.rgba.buffer instanceof ArrayBuffer) || plan.rgba.byteOffset !== 0 ||
      plan.rgba.byteLength !== plan.rgba.buffer.byteLength)
    throw Error('Invalid single-cutaway plan');
  for (let i = 3; i < plan.rgba.length; i += 4)
    if (plan.rgba[i] !== 255) throw Error('Invalid single-cutaway opacity');
  return plan;
}

export function cutawayPreparation(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.size) || raw.size < 1 || raw.size > 720)
    throw Error('Invalid single-cutaway source');
  let capture = captures.get(raw);
  if (!capture) {
    capture = { source: `cutaway-${++nextSource}`, plan: undefined };
    captures.set(raw, capture);
  }
  return { source: capture.source, size: raw.size, plan: capture.plan };
}

export function compactCutawayPlan(rgba, association) {
  return validateCutawayPlan({ version: 1, model: 'single-cutaway-plan-v1',
    source: association.source, size: association.size, rgba: rgba.slice() }, association);
}

export function rememberCutawayPlan(raw, plan) {
  validateCutawayPlan(plan, cutawayPreparation(raw));
  captures.get(raw).plan = plan;
}
