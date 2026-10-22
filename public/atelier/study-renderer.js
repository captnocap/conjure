import { createMixRenderer } from "./mixer.js";

// One async study uses the same registered worker drawing/replay path as a mix.
// Coalesce strength edits while a cold solve completes so its compact plan can
// serve the latest prefix. Studies with independent refinement stages can opt
// into canceling a superseded stage. Source/seed/study changes always cancel.
export function createStudyRenderer(painter, environment = {}) {
  const renderer = createMixRenderer(painter, environment);
  let desired = null, active = null;
  async function pump() {
    if (active) return;
    while (desired) {
      const run = desired, controller = new AbortController();
      active = { run, controller };
      try {
        const images = await renderer.prepare({ ...run.options,
          mix: { mode: "average", layers: [{ id: run.options.id, enabled: true, weight: 100, blend: "normal" }] },
          signal: controller.signal,
        });
        if (desired === run) {
          if (!controller.signal.aborted && run.options.isCurrent()) {
            run.options.onReady(images.get(run.options.id));
            run.resolve({ ready: true });
          } else run.resolve({ ready: false, superseded: true });
          if (desired === run) desired = null;
        }
      } catch (error) {
        if (desired === run) {
          desired = null;
          try {
            if (!controller.signal.aborted && run.options.isCurrent()) run.options.onError(error);
          } catch (callbackError) {
            error = callbackError;
          }
          run.resolve({ ready: false, error });
        }
      } finally {
        active = null;
      }
    }
  }
  return {
    render(options) {
      desired?.resolve({ ready: false, superseded: true });
      const promise = new Promise(resolve => { desired = { options, resolve }; });
      if (active && (active.run.options.raw !== options.raw ||
          active.run.options.seed !== options.seed || active.run.options.id !== options.id ||
          (options.restartOnIntensity === true && active.run.options.intensity !== options.intensity) ||
          (options.intensity <= 0 && active.run.options.intensity > 0)))
        active.controller.abort();
      void pump();
      return promise;
    },
    cancel() {
      desired?.resolve({ ready: false, canceled: true });
      desired = null;
      active?.controller.abort();
    },
  };
}
