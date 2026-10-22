import { renderError, workerPacketError, workerEventError } from "./render-errors.js";
import { finishWeight } from "./finish-contract.js";
import { colorBlendInto } from "./color-blend.js";
import { abortIf, replayDrawing } from "./drawing-protocol.js";
import { createRankStreakPlanCache, rankCoverageFromSharedStrength } from "./rank-streak-plan.js";
import { createPixelClusterPlanCache } from "./pixel-cluster-plan.js";
import { createDirectionalColorPlanCache } from "./directional-color-plan.js";
import { volumeBarPreparation, validateVolumeBarPlan, rememberVolumeBarPlan, validateVolumeBarDrawing } from "./volume-bar-plan.js";
import { acquireInteriorLatticeLease } from "./interior-lattice-lease.js";
import { snapshotFrame } from "./render-source.js";
import { threadPreparation, rememberThreadPlan } from "./thread-plan.js";
import { thicknessPreparation, rememberThicknessPlan } from "./thickness-plan.js";
import { copyFeedbackPreparation, rememberCopyFeedbackPlan } from "./copy-feedback-plan.js";
import { sectionRibPreparation, rememberSectionRibPlan } from "./section-rib-plan.js";
import { cutawayPreparation, rememberCutawayPlan } from "./cutaway-plan.js";
import { materialFingerprint } from "./material-state.js";
import { compositeRegional, compositeRegionalAsync } from "./regional-mix.js";
import { hasTargets, validateTargets, copyTargetLayer, prepareObjectTargets } from "./object-targets.js";
import { hasReferenceTone, prepareReferenceTones, referenceToneAlphas } from "./reference-tones.js";
export { layerTones } from "./reference-tones.js";
import {
  defaultInk,
  validateInk,
  inkSignature,
  inkStyleIds,
} from "./ink-effects.js";

export const mixLimit = 8;
export const mixModes = ["average", "layers", "regions"];
export const layerBlends = ["normal", "multiply", "screen", "color"];
export const sceneReference = Object.freeze({
  id: "scene-reference",
  name: "Scene reference",
  mechanism: "Uses the current captured scene materials, camera and light before drawing treatments; shared treatment strength does not change it.",
});
export function mixerSourceIds(studyIds) {
  if (studyIds.includes(sceneReference.id))
    throw Error("Scene reference is reserved for mixer sources, not studies");
  return [...studyIds, sceneReference.id];
}
export const favoriteMix = () => ({
  mode: "layers",
  layers: [
    { id: "frottage", enabled: true, weight: 100, blend: "normal" },
    { id: "embroidery", enabled: true, weight: 35, blend: "multiply" },
    { id: "volume", enabled: true, weight: 40, blend: "screen" },
    { id: "luminous", enabled: true, weight: 25, blend: "screen" },
  ],
});
export function validateMix(mix, ids) {
  if (
    !mix ||
    !mixModes.includes(mix.mode) ||
    !Array.isArray(mix.layers) ||
    mix.layers.length > mixLimit
  )
    throw Error("Choose a valid mix of up to eight treatments");
  const seen = new Set();
  for (const layer of mix.layers) {
    if (
      !layer ||
      !ids.includes(layer.id) ||
      seen.has(layer.id) ||
      typeof layer.enabled !== "boolean" ||
      !Number.isInteger(layer.weight) ||
      layer.weight < 0 ||
      layer.weight > 100 ||
      !layerBlends.includes(layer.blend)
    )
      throw Error(
        "Choose unique treatments, valid blends and weights from 0 to 100",
      );
    seen.add(layer.id);
  }
  if (Object.hasOwn(mix, "finish")) {
    if (!mix.finish) throw Error("Choose a valid composition finish");
    finishWeight(mix.finish);
  }
  return {
    mode: mix.mode,
    layers: mix.layers.map(copyTargetLayer),
    ...(Object.hasOwn(mix, "finish")
      ? { finish: { id: mix.finish.id, weight: mix.finish.weight } } : {}),
  };
}
export const activeLayers = (mix) =>
  mix.layers.filter((layer) => {
    const targets = hasTargets(layer) ? validateTargets(layer.targets) : null;
    return layer.enabled && layer.weight > 0 && (!targets || targets.length > 0);
  });

function prepareTargetMix(reference, images, mix, context) {
  const active = activeLayers(mix),
    coverage = prepareObjectTargets(active, context.identity, reference.length),
    sources = active.map(({ id }) => {
      const data = images.get(id);
      if (!data || data.length !== reference.length) throw Error("Missing mixer image");
      return data;
    }),
    eligible = coverage?.byOwner || [active.map((_, index) => index)],
    sums = eligible.map(indices => indices.reduce((sum, j) => sum + active[j].weight, 0)),
    tones = prepareReferenceTones(active);
  if (tones && (![reference, ...sources].every(data =>
      data instanceof Uint8Array || data instanceof Uint8ClampedArray) || reference.length % 4))
    throw Error("Reference-tone mixing requires RGBA8 images");
  const color = mix.mode === "layers" && active.some(layer => layer.blend === "color")
    ? new Float64Array(3) : null;
  return { active, coverage, sources, eligible, sums, tones, color, mode: mix.mode };
}

function composeTargetRange(reference, out, job, start, end) {
  if (job.color) return composeColorRange(reference, out, job, start, end);
  if (job.tones) return composeToneRange(reference, out, job, start, end);
  const { active, coverage, sources, eligible, sums, mode } = job;
  for (let i = start; i < end; i += 4) {
    const owner = coverage ? coverage.ownerAt(i / 4) : 0, indices = eligible[owner];
    if (!indices.length) {
      for (let c = 0; c < 4; c++) out[i + c] = reference[i + c];
      continue;
    }
    for (let c = 0; c < 3; c++) {
      let value = mode === "average" ? 0 : reference[i + c];
      for (const j of indices) {
        const source = sources[j][i + c], layer = active[j];
        if (mode === "average") {
          const alpha = sources[j][i + 3];
          value += layer.weight * (source * alpha + reference[i + c] * (255 - alpha));
        } else {
          const alpha = ((layer.weight / 100) * sources[j][i + 3]) / 255,
            blend = layer.blend === "multiply" ? (value * source) / 255 :
              layer.blend === "screen" ? 255 - ((255 - value) * (255 - source)) / 255 : source;
          value += (blend - value) * alpha;
        }
      }
      out[i + c] = mode === "average" ? value / (sums[owner] * 255) : value;
    }
    out[i + 3] = 255;
  }
}

// Nonseparable Color needs the current lower RGB triplet at its stack position.
// Only stacks with active Color enter this loop; all older arithmetic is intact.
function composeColorRange(reference, out, job, start, end) {
  const { active, coverage, sources, eligible, tones, color } = job;
  for (let i = start; i < end; i += 4) {
    const indices = eligible[coverage ? coverage.ownerAt(i / 4) : 0];
    if (!indices.length) {
      for (let c = 0; c < 4; c++) out[i + c] = reference[i + c];
      continue;
    }
    const alphas = tones ? referenceToneAlphas(reference, i, sources, tones) : null;
    let r = reference[i], g = reference[i + 1], b = reference[i + 2];
    for (const j of indices) {
      const source = sources[j], layer = active[j],
        alpha = ((layer.weight / 100) * (alphas ? alphas[j] : source[i + 3])) / 255,
        sr = source[i], sg = source[i + 1], sb = source[i + 2];
      if (layer.blend === "color") {
        if (alpha === 0) continue;
        colorBlendInto(color, r / 255, g / 255, b / 255, sr / 255, sg / 255, sb / 255);
        // Exact opaque endpoint reproduces the admitted completed-image proof.
        r = alpha === 1 ? color[0] * 255 : r + (color[0] * 255 - r) * alpha;
        g = alpha === 1 ? color[1] * 255 : g + (color[1] * 255 - g) * alpha;
        b = alpha === 1 ? color[2] * 255 : b + (color[2] * 255 - b) * alpha;
      } else {
        const mr = layer.blend === "multiply" ? (r * sr) / 255 :
            layer.blend === "screen" ? 255 - ((255 - r) * (255 - sr)) / 255 : sr,
          mg = layer.blend === "multiply" ? (g * sg) / 255 :
            layer.blend === "screen" ? 255 - ((255 - g) * (255 - sg)) / 255 : sg,
          mb = layer.blend === "multiply" ? (b * sb) / 255 :
            layer.blend === "screen" ? 255 - ((255 - b) * (255 - sb)) / 255 : sb;
        r += (mr - r) * alpha; g += (mg - g) * alpha; b += (mb - b) * alpha;
      }
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
  }
}

function composeToneRange(reference, out, job, start, end) {
  const { active, coverage, sources, eligible, sums, tones, mode } = job;
  for (let i = start; i < end; i += 4) {
    const owner = coverage ? coverage.ownerAt(i / 4) : 0, indices = eligible[owner];
    if (!indices.length) {
      for (let c = 0; c < 4; c++) out[i + c] = reference[i + c];
      continue;
    }
    const alphas = referenceToneAlphas(reference, i, sources, tones);
    for (let c = 0; c < 3; c++) {
      let value = mode === "average" ? 0 : reference[i + c];
      for (const j of indices) {
        const source = sources[j][i + c], layer = active[j];
        if (mode === "average") {
          const alpha = alphas[j];
          // Keep each eligible row's original weight; masked influence is reference.
          value += layer.weight * (source * alpha + reference[i + c] * (255 - alpha));
        } else {
          const alpha = ((layer.weight / 100) * alphas[j]) / 255,
            blend = layer.blend === "multiply" ? (value * source) / 255 :
              layer.blend === "screen" ? 255 - ((255 - value) * (255 - source)) / 255 : source;
          value += (blend - value) * alpha;
        }
      }
      out[i + c] = mode === "average" ? value / (sums[owner] * 255) : value;
    }
    out[i + 3] = 255;
  }
}
// Full, opaque image composition in display RGB. This does not merge materials,
// geometry, simulation states, mark generators, or their physical parameters.
export function compositeMix(reference, images, mix, context = {}) {
  if (mix.mode === "regions")
    return compositeRegional(reference, images, mix.layers, context);
  if (mix.layers.some(hasTargets) || mix.layers.some(hasReferenceTone) ||
      (mix.mode === "layers" && activeLayers(mix).some(layer => layer.blend === "color"))) {
    const snapshot = { mode: mix.mode, layers: mix.layers.map(copyTargetLayer) },
      job = prepareTargetMix(reference, images, snapshot, context),
      out = new Uint8ClampedArray(reference.length);
    composeTargetRange(reference, out, job, 0, reference.length);
    return out;
  }
  const active = activeLayers(mix),
    out = new Uint8ClampedArray(reference.length);
  if (!active.length) {
    out.set(reference);
    return out;
  }
  const sources = active.map((layer) => {
    const data = images.get(layer.id);
    if (!data || data.length !== reference.length)
      throw Error("Missing mixer image");
    return data;
  });
  if (mix.mode === "average") {
    const sum = active.reduce((value, layer) => value + layer.weight, 0),
      weights = active.map((layer) => layer.weight);
    for (let i = 0; i < out.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let value = 0;
        for (let j = 0; j < active.length; j++) {
          const alpha = sources[j][i + 3];
          value +=
            weights[j] *
            (sources[j][i + c] * alpha + reference[i + c] * (255 - alpha));
        }
        out[i + c] = value / (sum * 255);
      }
      out[i + 3] = 255;
    }
  } else {
    // First row is the bottom layer; later rows paint over it. Reference lies
    // beneath the stack. Keep floating point until the final byte conversion.
    for (let i = 0; i < out.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let value = reference[i + c];
        for (let j = 0; j < active.length; j++) {
          const source = sources[j][i + c],
            layer = active[j],
            alpha = ((layer.weight / 100) * sources[j][i + 3]) / 255,
            blend =
              layer.blend === "multiply"
                ? (value * source) / 255
                : layer.blend === "screen"
                  ? 255 - ((255 - value) * (255 - source)) / 255
                  : source;
          value += (blend - value) * alpha;
        }
        out[i + c] = value;
      }
      out[i + 3] = 255;
    }
  }
  return out;
}
export async function compositeMixAsync(
  reference,
  images,
  mix,
  {
    signal,
    yieldFrame = () => new Promise(requestAnimationFrame),
    now = () => performance.now(),
    budgetMs = 8,
    size,
    seed,
    cache,
    identity,
  } = {},
) {
  abortIf(signal);
  if (typeof yieldFrame !== "function" || typeof now !== "function" ||
      !Number.isFinite(budgetMs) || budgetMs < 0)
    throw Error("Invalid mixer scheduling options");
  // Controls and source references are captured before the first yield. Cached
  // image bytes remain shared and read-only; only the small target lists copy.
  const snapshot = { mode: mix.mode, layers: mix.layers.map(copyTargetLayer) },
    sourceImages = new Map(images);
  if (snapshot.mode === "regions")
    return compositeRegionalAsync(reference, sourceImages, snapshot.layers, {
      size, seed, cache, identity, signal, yieldFrame, now, budgetMs,
    });
  const out = new Uint8ClampedArray(reference.length),
    chunk = 32768,
    targetJob = snapshot.layers.some(hasTargets) || snapshot.layers.some(hasReferenceTone) ||
      (snapshot.mode === "layers" && activeLayers(snapshot).some(layer => layer.blend === "color"))
      ? prepareTargetMix(reference, sourceImages, snapshot, { identity }) : null;
  let started = now();
  for (let offset = 0; offset < reference.length; offset += chunk) {
    abortIf(signal);
    const end = Math.min(reference.length, offset + chunk);
    if (targetJob) composeTargetRange(reference, out, targetJob, offset, end);
    else {
      const portions = new Map();
      for (const [id, pixels] of sourceImages)
        portions.set(id, pixels.subarray(offset, end));
      out.set(compositeMix(reference.subarray(offset, end), portions, snapshot), offset);
    }
    if (now() - started >= budgetMs && end < reference.length) {
      await yieldFrame();
      abortIf(signal);
      started = now();
    }
  }
  abortIf(signal);
  return out;
}

export function mixFilename(state) {
  const materials = materialFingerprint(state.materials),
    mix = state.mix.layers.some(layer => Object.hasOwn(layer, "tone"))
      ? { ...state.mix, layers: state.mix.layers.some(hasReferenceTone)
          ? state.mix.layers.map(copyTargetLayer)
          : state.mix.layers.map(({ tone, ...layer }) => layer) } : state.mix;
  const recipe = mix.layers.some((layer) =>
    inkStyleIds.includes(layer.id),
  )
    ? JSON.stringify({ mix, ink: validateInk(state.ink) })
    : JSON.stringify(mix);
  let hash = 2166136261;
  for (let i = 0; i < recipe.length; i++)
    hash = Math.imul(hash ^ recipe.charCodeAt(i), 16777619);
  return `atelier-mix-${state.mix.mode}-${(hash >>> 0).toString(16).padStart(8, "0")}-s${state.seed}-c${state.orbit}-t${state.time}-p${Math.round(state.intensity * 100)}${materials ? "-mat" + materials : ""}`;
}

// Each job owns a worker and Graphics; only completed RGBA images enter the LRU.
// Live mixer and contact sheet can interleave only between atomic p5 polygons.
export function createMixRenderer(painter, environment = {}) {
  const rankStreakCache = createRankStreakPlanCache();
  const pixelClusterCache = createPixelClusterPlanCache();
  const directionalColorCache = createDirectionalColorPlanCache();
  const cache = new Map(),
    yieldFrame =
      environment.yieldFrame || (() => new Promise(requestAnimationFrame)),
    createWorker =
      environment.createWorker ||
      (() =>
        new Worker(new URL("./contact-worker.js", import.meta.url), {
          type: "module",
        }));
  let capture = null,
    settings = "",
    inkSettings = "",
    busy = false;
  return {
    get cacheSize() {
      return cache.size;
    },
    async prepare({
      raw,
      seed,
      intensity,
      ink = defaultInk(),
      mix,
      signal,
      onProgress = () => {},
    }) {
      if (busy) throw Error("A mixer preparation is already running");
      busy = true;
      let worker,
        graphics,
        releaseVolumeBarLease,
        pending = null,
        failure = null,
        workerReady = false, stage = "worker prepare", treatment = null;
      const reject = (error) => {
        failure = error = renderError(error, stage, treatment);
        if (pending) {
          const p = pending;
          pending = null;
          p.reject(error);
        }
      };
      const cancel = () => {
        worker?.terminate();
        reject(signal.reason || new DOMException("Canceled", "AbortError"));
      };
      try {
        abortIf(signal);
        // Copy controls before any yield or callback can change live state.
        if (capture !== raw) rankStreakCache.clear();
        const required = [...new Set(activeLayers(mix).map((l) => l.id))],
          rankStreak = required.includes("rank-streaks")
            ? rankStreakCache.preparation(raw, rankCoverageFromSharedStrength(intensity) > 0) : null,
          pixelCluster = required.includes("pixel-clusters") ? pixelClusterCache.preparation(raw) : null,
          directionalColor = required.includes("directional-color") ? directionalColorCache.preparation(raw) : null,
          preparedInk = validateInk(ink),
          inkKey = inkSignature(preparedInk),
          key = `${seed}:${intensity}${rankStreak ? ":" + rankStreak.source : ""}${pixelCluster ? ":" + pixelCluster.source : ""}${directionalColor ? ":" + directionalColor.source : ""}`;
        if (capture !== raw || settings !== key) {
          cache.clear();
          capture = raw;
          settings = key;
        } else if (inkSettings !== inkKey) {
          for (const id of inkStyleIds) cache.delete(id);
        }
        inkSettings = inkKey;
        const images = new Map();
        // This source aliases the current immutable capture. It is never drawn
        // by a study worker or stored in the study-image LRU.
        if (required.includes(sceneReference.id))
          images.set(sceneReference.id, raw.color);
        for (const id of required)
          if (cache.has(id)) {
            const image = cache.get(id);
            cache.delete(id);
            cache.set(id, image);
            images.set(id, image);
          }
        const missing = required.filter((id) => !images.has(id));
        if (!missing.length) return images;
        const volumeBar = missing.includes("interior-lattice") ? volumeBarPreparation(raw) : null;
        onProgress({
          completed: images.size,
          total: required.length,
          id: null,
        });
        await yieldFrame();
        abortIf(signal);
        if (volumeBar) {
          releaseVolumeBarLease = await acquireInteriorLatticeLease(signal);
          abortIf(signal);
        }
        graphics = painter.createGraphics(raw.size, raw.size);
        graphics.pixelDensity(1);
        stage = "worker startup";
        worker = createWorker();
        worker.onmessage = ({ data }) => {
          if (!pending) return;
          if (!data || typeof data !== "object") {
            reject(Error("Invalid mixer worker payload"));
            return;
          }
          const p = pending;
          pending = null;
          if (data.type === "error") {
            failure = workerPacketError(data, p);
            p.reject(failure);
          } else if (data.type !== p.type || (p.id && data.id !== p.id)) {
            failure = renderError(Error("Out-of-order mixer reply"), stage, p.id);
            p.reject(failure);
          } else {
            if (data.type === "ready") workerReady = true;
            p.resolve(data);
          }
        };
        worker.onerror = (event) => {
          event.preventDefault?.();
          reject(workerEventError(event, workerReady, pending, "Mixer worker failed"));
        };
        worker.onmessageerror = () =>
          reject(Error("Invalid mixer worker message"));
        signal?.addEventListener("abort", cancel, { once: true });
        abortIf(signal);
        const ask = (payload, type, id) =>
          new Promise((resolve, rejectRequest) => {
            if (failure) {
              rejectRequest(failure);
              return;
            }
            stage = payload.type === "prepare" ? "worker prepare" : "worker draw";
            treatment = id || null;
            pending = { type, id, resolve, reject: rejectRequest };
            try {
              worker.postMessage(payload);
            } catch (error) {
              reject(error);
            }
          });
        const copyFeedback = required.includes("copy-feedback") && intensity > 0
          ? copyFeedbackPreparation(raw, seed) : null;
        const thickness = required.includes("thickness-exposure")
          ? thicknessPreparation(raw) : null;
        const sectionRib = required.includes("section-ribs")
          ? sectionRibPreparation(raw) : null;
        const cutaway = required.includes("single-cutaway")
          ? cutawayPreparation(raw) : null;
        await ask(
          {
            type: "prepare",
            raw: snapshotFrame(raw),
            seed,
            strength: intensity,
            ink: preparedInk,
            ...(required.includes("continuous-thread") ? { thread: threadPreparation(raw, seed) } : {}),
            ...(thickness ? { thickness } : {}),
            ...(copyFeedback ? { copyFeedback } : {}),
            ...(sectionRib ? { sectionRib } : {}),
            ...(cutaway ? { cutaway } : {}),
            ...(rankStreak ? { rankStreak } : {}),
            ...(pixelCluster ? { pixelCluster } : {}),
            ...(directionalColor ? { directionalColor } : {}),
            ...(volumeBar ? { volumeBar } : {}),
            constants: {
              BLEND: graphics.BLEND,
              ADD: graphics.ADD,
              MULTIPLY: graphics.MULTIPLY,
              CLOSE: graphics.CLOSE,
            },
          },
          "ready",
        );
        for (const id of missing) {
          abortIf(signal);
          onProgress({ completed: images.size, total: required.length, id });
          const response = await ask({ type: "draw", id }, "drawing", id);
          abortIf(signal);
          if (id === "continuous-thread" && intensity > 0)
            rememberThreadPlan(raw, seed, response.threadPlan);
          if (id === "thickness-exposure" && intensity > 0) {
            if (thickness.plan) {
              if (response.thicknessPlan !== undefined)
                throw Error("Unexpected cached thickness exposure plan");
            } else rememberThicknessPlan(raw, response.thicknessPlan);
          }
          if (id === "copy-feedback" && intensity > 0) {
            if (copyFeedback.plan) {
              if (response.copyFeedbackPlan !== undefined)
                throw Error("Unexpected cached repeated-copy feedback plan");
            } else rememberCopyFeedbackPlan(raw, seed, response.copyFeedbackPlan);
          }
          if (id === "section-ribs") {
            if (sectionRib.plan) {
              if (response.sectionRibPlan !== undefined)
                throw Error("Unexpected cached section-rib plan");
            } else rememberSectionRibPlan(raw, response.sectionRibPlan);
          }
          if (id === "rank-streaks") {
            if (rankStreak.plan || rankCoverageFromSharedStrength(intensity) === 0) {
              if (response.rankStreakPlan !== undefined)
                throw Error("Unexpected cached or zero-coverage Pixel sorting plan");
            } else rankStreakCache.remember(raw, rankStreak, response.rankStreakPlan);
          }
          if (id === "single-cutaway" && cutaway.plan && response.cutawayPlan !== undefined)
            throw Error("Unexpected cached single-cutaway plan");
          if (id === "pixel-clusters") {
            if (pixelCluster.plan) {
              if (response.pixelClusterPlan !== undefined)
                throw Error("Unexpected cached Pixel clusters plan");
            }
          }
          if (id === "directional-color" && directionalColor.plan && response.directionalColorPlan !== undefined)
            throw Error("Unexpected cached Directional color plan");
          if (id === "interior-lattice") {
            if (volumeBar.plan && response.volumeBarPlan !== undefined)
              throw Error("Unexpected cached Interior lattice plan");
            if (!volumeBar.plan) validateVolumeBarPlan(response.volumeBarPlan, volumeBar);
          }
          stage = "replay";
          const { packet } = response;
          if (id === "interior-lattice") validateVolumeBarDrawing(packet, raw.size);
          graphics.push();
          try {
            graphics.clear();
            graphics.resetMatrix();
            graphics.blendMode(graphics.BLEND);
            await replayDrawing(graphics, packet, {
              signal,
              yieldFrame,
              now: environment.now,
            });
          } finally {
            graphics.pop();
          }
          abortIf(signal);
          graphics.loadPixels();
          const image = new Uint8ClampedArray(graphics.pixels);
          if (image.length !== raw.size * raw.size * 4)
            throw Error("Mixer requires pixel density 1");
          if (id === "pixel-clusters") {
            pixelClusterCache.assertCurrent(raw, pixelCluster);
            if (!pixelCluster.plan) pixelClusterCache.remember(raw, pixelCluster, response.pixelClusterPlan);
          }
          if (id === "directional-color") {
            directionalColorCache.assertCurrent(raw, directionalColor);
            if (!directionalColor.plan) directionalColorCache.remember(raw, directionalColor, response.directionalColorPlan);
          }
          if (id === "single-cutaway" && !cutaway.plan)
            rememberCutawayPlan(raw, response.cutawayPlan);
          if (id === "interior-lattice" && !volumeBar.plan)
            rememberVolumeBarPlan(raw, response.volumeBarPlan);
          images.set(id, image);
          cache.set(id, image);
          while (cache.size > mixLimit) cache.delete(cache.keys().next().value);
          onProgress({ completed: images.size, total: required.length, id });
          await yieldFrame();
          abortIf(signal);
        }
        return images;
      } catch (error) {
        throw renderError(error, stage, treatment);
      } finally {
        signal?.removeEventListener("abort", cancel);
        try {
          if (worker) {
            worker.onmessage = worker.onerror = worker.onmessageerror = null;
            const termination = worker.terminate();
            if (releaseVolumeBarLease && termination?.then) await termination;
          }
          graphics?.remove();
          busy = false;
        } finally {
          if (releaseVolumeBarLease) {
            releaseVolumeBarLease();
            busy = false;
          }
        }
      }
    },
  };
}
