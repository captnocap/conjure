// Small production-facing API. This module has no Three.js/browser dependency.
// Snapshot masks may be cached by the caller; the simulation grid stays 128².
import { projectMembraneMasks } from "./projected-membranes.js";
import {
  drivePeriod,
  membraneGraph,
  sandMobility,
  equilibriumSand,
} from "./resonance.js";
import { harmonicResponseByComponent } from "./harmonic-response.js";
import { renderSand } from "./render-sand.js";

function assertResponse(response, tolerance) {
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1e-7)
    throw Error("Invalid resonant sand residual tolerance");
  if (
    response?.converged !== true ||
    !Number.isFinite(response.maxResidual) ||
    response.maxResidual > tolerance ||
    !Number.isFinite(response.residual) ||
    response.residual > tolerance
  ) {
    const residual = Number.isFinite(response?.maxResidual)
      ? response.maxResidual.toExponential(2)
      : "non-finite";
    const error = new Error(
      "Resonant sand did not converge. Try a different frequency or mark seed.",
    );
    error.cause = {
      maximumRelativeResidual: residual,
      requiredTolerance: tolerance,
    };
    throw error;
  }
}

export function prepareResonantSand(
  masks,
  { seed = 2401, frequency = 0.5, tolerance = 1e-7, maxIterations = 6000 } = {},
) {
  if (
    !Number.isFinite(frequency) ||
    !Number.isFinite(tolerance) ||
    tolerance <= 0 ||
    tolerance > 1e-7
  )
    throw Error("Invalid resonant sand controls");
  const graph = membraneGraph(masks, seed),
    period = drivePeriod(frequency),
    response = harmonicResponseByComponent(graph, period, {
      damping: 0.003,
      tolerance,
      maxIter: maxIterations,
    });
  // The solver recomputes A*z-b separately on every component before returning.
  // Never turn a failed response into a displayed concentration field.
  assertResponse(response, tolerance);
  const mobility = sandMobility(graph, response.energy, { floor: 0.002 }),
    density = equilibriumSand(graph, mobility);
  return { graph, response, mobility, density, seed, tolerance, period };
}

export function prepareSnapshotResonantSand(snapshot, options = {}) {
  return prepareResonantSand(projectMembraneMasks(snapshot, 128), options);
}

export function renderPreparedResonantSand(frame, prepared) {
  if (!prepared) throw Error("Missing prepared resonant sand response");
  assertResponse(prepared.response, prepared.tolerance);
  if (
    prepared.density.length !== prepared.graph.count ||
    prepared.density.some((v) => !Number.isFinite(v) || v < 0)
  )
    throw Error("Invalid prepared sand density");
  return renderSand(frame, prepared.graph, prepared.density, {
    seed: prepared.seed,
    grainsPerPixel: 0.04,
    radius: 0.8,
  });
}

export function renderResonantSand(frame, snapshot, options = {}) {
  return renderPreparedResonantSand(
    frame,
    prepareSnapshotResonantSand(snapshot, options),
  );
}

export function drawResonantSand(p, f) {
  const captured = f.prepare("sand-capture", () => ({
    size: f.w,
    color: f.color,
    owner: Uint16Array.from({ length: f.w * f.w }, (_, i) =>
      f.ID(i % f.w, Math.floor(i / f.w)),
    ),
  }));
  const prepared = f.prepare("sand-response:" + drivePeriod(f.intensity), () =>
    prepareResonantSand(f.membraneMasks(), {
      seed: f.seed,
      frequency: f.intensity,
    }),
  );
  const result = renderPreparedResonantSand(captured, prepared);
  p.loadPixels();
  p.pixels.set(result.pixels);
  p.updatePixels();
}
