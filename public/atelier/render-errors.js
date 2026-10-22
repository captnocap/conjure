// Add context without replacing the original error when it is extensible.
export function renderError(error, stage, treatment) {
  if (!error || (typeof error !== "object" && typeof error !== "function"))
    error = new Error(String(error));
  if (!Object.isExtensible(error)) {
    const original = error;
    error = new Error(original.message || String(original), { cause: original });
    error.name = original.name || "Error";
    if (original.stack) error.stack = original.stack;
  }
  error.renderStage ||= stage;
  if (treatment) error.treatment ||= treatment;
  return error;
}

// Old workers only send a message/id; infer their stage from the pending request.
export function workerPacketError(data, pending) {
  const error = new Error(data.message || "Treatment failed");
  if (typeof data.name === "string") error.name = data.name;
  if (typeof data.stack === "string") error.stack = data.stack;
  return renderError(error, pending.type === "ready" ? "worker prepare" : "worker draw",
    data.id || pending.id);
}

export function workerEventError(event, ready, pending, fallback) {
  const error = renderError(event.error || new Error(event.message || fallback),
    ready ? (pending?.type === "ready" ? "worker prepare" : "worker draw") : "worker startup",
    pending?.id);
  if (event.filename) error.workerLocation = {
    file: event.filename, line: event.lineno || null, column: event.colno || null,
  };
  return error;
}
