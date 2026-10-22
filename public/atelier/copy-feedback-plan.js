// Only the latest seed history is retained for an immutable capture. Weak keys
// release the history with its source; generation edits reuse displayed stages.
const captures = new WeakMap();
let nextSource = 0;
const keys = ["version", "model", "source", "size", "seed", "stages", "rngStates"];
const validSeed = seed => Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;

export function validateCopyFeedbackPlan(plan, { source, size, seed }) {
  if (!plan || typeof plan !== "object" || Object.keys(plan).length !== keys.length ||
      !keys.every(key => Object.hasOwn(plan, key)) || plan.version !== 1 ||
      plan.model !== "repeated-copy-feedback-v1" || plan.source !== source ||
      plan.size !== size || plan.seed !== seed || !validSeed(seed) ||
      typeof source !== "string" || !source.length || source.length > 80 ||
      !Number.isInteger(size) || size < 1 || size > 720 ||
      !Array.isArray(plan.stages) || plan.stages.length !== 13 ||
      !Array.from({ length: 13 }, (_, index) => index).every(index => {
        const stage = plan.stages[index];
        return Object.hasOwn(plan.stages, index) && stage instanceof Uint8Array &&
          stage.length === size * size && stage.buffer instanceof ArrayBuffer &&
          stage.byteOffset === 0 && stage.buffer.byteLength === size * size;
      }) ||
      !(plan.rngStates instanceof Uint32Array) || plan.rngStates.length !== 13 ||
      !(plan.rngStates.buffer instanceof ArrayBuffer) ||
      plan.rngStates.byteOffset !== 0 || plan.rngStates.buffer.byteLength !== 52 ||
      plan.rngStates[0] !== (seed || 2401) || !plan.rngStates.every(value => value > 0))
    throw Error("Invalid repeated-copy feedback plan");
  if (new Set([...plan.stages.map(stage => stage.buffer), plan.rngStates.buffer]).size !== 14)
    throw Error("Invalid repeated-copy feedback buffer ownership");
  return plan;
}

export function copyFeedbackPreparation(raw, seed) {
  if (!raw || typeof raw !== "object" || !Number.isInteger(raw.size) ||
      raw.size < 1 || raw.size > 720 || !validSeed(seed))
    throw Error("Invalid repeated-copy feedback source");
  let capture = captures.get(raw);
  if (!capture) {
    capture = { source: `copy-feedback-${++nextSource}`, seed: undefined, plan: undefined };
    captures.set(raw, capture);
  }
  return { source: capture.source, size: raw.size, seed,
    plan: capture.seed === seed ? capture.plan : undefined };
}

export function compactCopyFeedbackPlan(history, association) {
  if (history.width !== association.size || history.height !== association.size ||
      history.seed !== association.seed)
    throw Error("Invalid repeated-copy feedback history association");
  return validateCopyFeedbackPlan({ version: 1, model: "repeated-copy-feedback-v1",
    source: association.source, size: association.size, seed: association.seed,
    stages: history.stages.map(stage => stage.slice()),
    rngStates: history.rngStates.slice() }, association);
}

export function rememberCopyFeedbackPlan(raw, seed, plan) {
  validateCopyFeedbackPlan(plan, copyFeedbackPreparation(raw, seed));
  const capture = captures.get(raw);
  capture.seed = seed;
  capture.plan = plan;
}
