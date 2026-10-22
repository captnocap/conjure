import {
  buildContactSheet,
  encodeSheet,
  downloadSheet,
} from "./contact-sheet.js";
import { createReference } from "./scene.js";
import { styles, makeFrame } from "./styles.js";
import {
  favoriteMix,
  createMixRenderer,
  compositeMixAsync,
  mixFilename,
  validateMix,
  activeLayers,
  sceneReference,
  mixerSourceIds,
} from "./mixer.js";
import { createStudyRenderer } from "./study-renderer.js";
import { createImageFinisher } from "./image-finisher.js";
import { rankCoverageFromSharedStrength } from "./rank-streak-plan.js";
import { mountMixer } from "./mixer-controls.js";
import { createRecipe, parseRecipe, recipeLimit } from "./recipe.js";
import { randomMix, randomMaterials } from "./randomize.js";
import {
  defaultInk,
  validateInk,
  inkKeys,
  inkStyleIds,
  inkSignature,
  inkEffectsFor,
} from "./ink-effects.js";
import {
  defaultMaterials,
  mixedMaterials,
  tissueMaterials,
  validateMaterials,
  materialSignature,
  materialFingerprint,
  materialObjects,
  supportsMaterial,
  materialIdsForObject,
} from "./material-state.js";
import { materialDefinitions } from "./material-library.js";
const $ = (id) => document.getElementById(id);
const state = {
  style: "riso",
  output: "study",
  mix: favoriteMix(),
  ink: defaultInk(),
  materials: mixedMaterials(),
  orbit: 0,
  time: 25,
  seed: 2401,
  intensity: 0.6,
  mode: "compare",
  locks: { camera: true, time: true, seed: true },
};
let recipeRead = 0,
  randomUndo = null;
let sheetRun = null,
  mixRun = null,
  mixRenderer = null,
  studyRenderer = null,
  imageFinisher = null,
  pageSuspended = false,
  mixerControls = null,
  renderRevision = 0,
  renderCompletion = null,
  mixPaused = false;
let scene,
  raw,
  painter,
  framePending = false,
  sceneDirty = false,
  renderCount = 0,
  lastGoodImage = null;
const treatmentCache = new Map(); // Four 720px snapshots: roughly 8 MB of pixel storage.
const cacheLimit = 4;
const treatmentButtons = new Map(),
  familyHeadings = new Map();
const familyOrder = [
  "Print & transfer",
  "Marks & pigment",
  "Lines & geometry",
  "Thread & weave",
  "Cut & assembly",
  "Light & waves",
  "Reaction & growth",
  "Game-inspired worlds",
];
const familyOf = (s) => s.family || "Other techniques";
const familyNames = [
  ...new Set([...familyOrder, ...styles.map(familyOf)]),
].filter((name) => styles.some((s) => familyOf(s) === name));
const searchable = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function matchingStyles() {
  const words = searchable($("treatment-search").value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
    family = $("family-filter").value || "";
  return familyNames
    .flatMap((name) => styles.filter((s) => familyOf(s) === name))
    .filter(
      (s) =>
        (!family || familyOf(s) === family) &&
        words.every((word) =>
          /^#?\d{1,3}$/.test(word)
            ? Number(word.replace("#", "")) === styles.indexOf(s) + 1
            : searchable(
                [s.name, s.medium, s.mechanism, familyOf(s)].join(" "),
              ).includes(word),
        ),
    );
}
function updateBrowsing() {
  const matches = matchingStyles(),
    ids = new Set(matches.map((s) => s.id));
  for (const [id, button] of treatmentButtons) button.hidden = !ids.has(id);
  for (const [name, heading] of familyHeadings)
    heading.hidden = !matches.some((s) => familyOf(s) === name);
  $("filter-count").textContent = `${matches.length} of ${styles.length} shown`;
  $("no-matches").hidden = matches.length > 0;
  $("clear-filters").disabled = !(
    $("treatment-search").value || $("family-filter").value
  );
  const selectedName =
    state.output === "mix"
      ? "Treatment mixer"
      : styles.find((s) => s.id === state.style).name;
  if ($("current-treatment").textContent !== selectedName)
    $("current-treatment").textContent = selectedName;
  $("show-current").hidden = state.output === "mix" || ids.has(state.style);
  const position = matches.findIndex((s) => s.id === state.style);
  $("browse-position").textContent =
    position < 0
      ? `${matches.length} matches`
      : `${position + 1} / ${matches.length}`;
  for (const id of ["previous-treatment", "next-treatment"])
    $(id).disabled =
      matches.length === 0 || (matches.length === 1 && position === 0);
}
function clearFilters() {
  $("treatment-search").value = "";
  $("family-filter").value = "";
  updateBrowsing();
}
function browseTreatment(direction) {
  const matches = matchingStyles();
  if (!matches.length) return;
  const at = matches.findIndex((s) => s.id === state.style),
    next =
      at < 0
        ? direction > 0
          ? 0
          : matches.length - 1
        : (at + direction + matches.length) % matches.length;
  selectStyle(matches[next].id);
}
function showStrength() {
  const style = styles.find((s) => s.id === state.style);
  const fixedSettings = state.output === "study" ? style.fixedSettings : null;
  $("intensity").disabled = Boolean(fixedSettings);
  if (fixedSettings) {
    $("intensity-value").textContent = fixedSettings;
    $("intensity").setAttribute("aria-valuetext", fixedSettings);
    return;
  }
  if (state.output === "mix") {
    $("intensity-value").textContent = Math.round(state.intensity * 100) + "%";
    $("intensity").setAttribute("aria-valuetext", $("intensity-value").textContent);
    return;
  }
  $("intensity-value").textContent = style.formatStrength
    ? style.formatStrength(state.intensity)
    : Math.round(state.intensity * 100) + "%";
  $("intensity").setAttribute("aria-valuetext", $("intensity-value").textContent);
}
function selectStyle(id) {
  if (!styles.some((s) => s.id === id)) throw new Error("Unknown treatment");
  state.style = id;
  state.output = "study";
  syncOutput();
  const s = styles.find((s) => s.id === id);
  $("study-title").textContent = s.title;
  $("style-name").textContent = s.name;
  $("intensity-label").textContent = s.control || "Treatment strength";
  $("description").textContent = s.description;
  $("mechanism").textContent = s.mechanism;
  $("render-label").textContent = s.name.toUpperCase();
  $("medium-label").textContent = s.medium;
  $("reference-link").href = s.reference;
  $("reference-link").textContent =
    s.referenceLabel || "View artistic reference";
  $("reference-page").hidden = !s.referencePage;
  $("reference-page").textContent = s.referencePageLabel || "Game gallery";
  if (s.referencePage) $("reference-page").href = s.referencePage;
  $("technique-label").textContent =
    `${String(styles.indexOf(s) + 1).padStart(2, "0")} / ${s.category}`;
  document.querySelectorAll(".style-button").forEach((b) => {
    const on = b.dataset.style === id;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  showStrength();
  updateBrowsing();
  return requestRender();
}
function syncSheetAvailability() {
  $("sheet-export").disabled =
    Boolean(sheetRun) ||
    !painter ||
    !raw ||
    $("treatment").dataset.ready !== "true";
}
function startContactSheet() {
  if (sheetRun || !painter || !raw || $("treatment").dataset.ready !== "true")
    return null;
  const run = { controller: new AbortController() },
    captured = raw,
    snapshot = JSON.parse(JSON.stringify(state)),
    studies = styles.map(({ id, name, family, category, formatStrength }) => ({
      id,
      name,
      family,
      category,
      formatStrength,
    }));
  const diagnostic = renderDiagnosticContext(snapshot, captured, "worker prepare", "contact sheet");
  clearRenderDetails("sheet");
  sheetRun = run;
  $("sheet-status").hidden = false;
  $("sheet-cancel").hidden = false;
  syncSheetAvailability();
  const message = (text) => {
    if (sheetRun === run) $("sheet-message").textContent = text;
  };
  run.promise = (async () => {
    let result;
    try {
      result = await buildContactSheet({
        raw: captured,
        snapshot,
        studies,
        painter,
        signal: run.controller.signal,
        onProgress: ({ completed, total, treatment }) =>
          message(`${completed} / ${total} ready · ${treatment}`),
      });
      if (run.controller.signal.aborted) {
        message("Contact sheet canceled.");
        return false;
      }
      diagnostic.stage = "encoding";
      message("Encoding contact sheet…");
      const blob = await encodeSheet(result.canvas, run.controller.signal);
      if (run.controller.signal.aborted) {
        message("Contact sheet canceled.");
        return false;
      }
      if (sheetRun !== run) return false;
      downloadSheet(blob, result.filename);
      message(
        `Contact sheet downloaded · ${studies.length} treatments · seed ${snapshot.seed}`,
      );
      return true;
    } catch (error) {
      if (run.controller.signal.aborted) message("Contact sheet canceled.");
      else if (sheetRun === run) {
        console.error(error);
        showRenderDetails(error, diagnostic, "sheet");
        message(
          "Could not export the contact sheet. Your current view is still available.",
        );
      }
      return false;
    } finally {
      if (result?.canvas) result.canvas.width = result.canvas.height = 1;
      if (sheetRun === run) {
        sheetRun = null;
        $("sheet-cancel").hidden = true;
        syncSheetAvailability();
      }
    }
  })();
  return run.promise;
}
$("sheet-export").addEventListener("click", () => {
  void startContactSheet();
});
$("sheet-cancel").addEventListener("click", () => sheetRun?.controller.abort());
window.addEventListener("pagehide", () => sheetRun?.controller.abort());
function requestRender(changed = false) {
  if (mixRun?.phase === "composite") mixRun.controller.abort();
  // Keep a cold solve only for nonzero finish-influence edits of the exact same
  // upstream composition. The old revision cannot paint; the successor reuses
  // its completed pixel cache. Every upstream or bypass edit interrupts it.
  if (imageFinisher && (state.output !== "mix" || !state.mix.finish?.weight ||
      changed || (mixRun?.phase === "finish" && (
        mixRun.finishId !== state.mix.finish?.id ||
        mixRun.compositionKey !== JSON.stringify({ mode: state.mix.mode, layers: state.mix.layers }) ||
        mixRun.seed !== state.seed || mixRun.intensity !== state.intensity ||
        mixRun.inkSignature !== inkSignature(state.ink))))) {
    imageFinisher.cancel();
    if (mixRun?.phase === "finish") mixRun.controller.abort();
  }
  renderCompletion?.resolve({ ready: false, superseded: true });
  const revision = ++renderRevision;
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  renderCompletion = { revision, promise, resolve };
  $("study-cancel").hidden = true;
  mixPaused = false;
  sceneDirty = sceneDirty || changed;
  if (!painter || !scene) return renderCompletion;
  $("treatment").dataset.ready = "false";
  $("export").disabled = true;
  syncSheetAvailability();
  if (framePending) return renderCompletion;
  framePending = true;
  requestAnimationFrame(() => {
    framePending = false;
    if (pageSuspended) return;
    $("treatment").dataset.ready = "false";
    $("export").disabled = true;
    clearRenderError();
    const diagnostic = renderDiagnosticContext(state, null, "capture");
    try {
      if (sceneDirty || !raw) {
        raw = scene.render(state);
        sceneDirty = false;
        treatmentCache.clear();
      }
      diagnostic.source = sourceDimensions(raw);
      diagnostic.stage = "draw";
      if (
        mixRun &&
        (state.output !== "mix" ||
          mixRun.raw !== raw ||
          mixRun.seed !== state.seed ||
          (mixRun.intensity !== state.intensity && (state.intensity <= 0 ||
            (activeLayers(state.mix).some((layer) => layer.id === "rank-streaks") &&
              rankCoverageFromSharedStrength(state.intensity) === 0) || !mixRun.keepsPreparedPlan)) ||
          mixRun.inkSignature !== inkSignature(state.ink))
      )
        mixRun.controller.abort();
      if (state.output === "mix") {
        studyRenderer?.cancel();
        void renderMix();
        return;
      }
      if (styles.find((s) => s.id === state.style).offThread) {
        renderStudy();
        return;
      }
      studyRenderer?.cancel();
      const started = performance.now();
      const cacheKey = [
        state.style,
        state.seed,
        state.intensity,
        inkStyleIds.includes(state.style) ? inkSignature(state.ink) : "",
      ].join(":");
      const cached = treatmentCache.get(cacheKey);
      painter.push();
      try {
        painter.resetMatrix();
        painter.blendMode(painter.BLEND);
        if (cached) {
          painter.image(cached, 0, 0);
          treatmentCache.delete(cacheKey);
          treatmentCache.set(cacheKey, cached);
        } else {
          styles
            .find((s) => s.id === state.style)
            .draw(
              painter,
              makeFrame(raw, state.seed, state.intensity, state.ink),
            );
          treatmentCache.set(cacheKey, painter.get());
          while (treatmentCache.size > cacheLimit)
            treatmentCache.delete(treatmentCache.keys().next().value);
        }
      } finally {
        painter.pop();
      }
      $("treatment").classList.toggle("pixelated", styles.find((s) => s.id === state.style).pixelated === true);
      lastGoodImage = cached || treatmentCache.get(cacheKey);
      renderCount++;
      $("export").disabled = false;
      $("status").textContent =
        `${styles.length} treatments · ${scene.meshCount} meshes · shared frame · ${cached ? "cached" : Math.round(performance.now() - started) + " ms"}`;
      Object.assign($("treatment").dataset, {
        renderCount: String(renderCount),
        style: state.style,
        seed: String(state.seed),
        orbit: String(state.orbit),
        time: String(state.time),
        ready: "true",
      });
      syncSheetAvailability();
      renderCompletion?.resolve({ ready: true, superseded: false });
    } catch (error) {
      fail(error, false, diagnostic);
    }
  });
  return renderCompletion;
}
function renderStudy() {
  const snapshot = JSON.parse(JSON.stringify(state)),
    study = styles.find((item) => item.id === snapshot.style),
    capture = raw, revision = renderRevision, completion = renderCompletion,
    started = performance.now();
  const diagnostic = renderDiagnosticContext(snapshot, capture, "worker prepare");
  studyRenderer ||= createStudyRenderer(painter);
  const isCurrent = () => !pageSuspended && !sceneDirty && raw === capture &&
    renderRevision === revision && state.output === "study" &&
    state.style === snapshot.style && state.seed === snapshot.seed &&
    state.intensity === snapshot.intensity;
  $("study-cancel").hidden = study.id !== "directional-color" && study.id !== "interior-lattice";
  $("status").textContent = study.id === "directional-color"
    ? "Building Directional color… slow first render; you can cancel or switch studies."
    : "Preparing treatment…";
  void studyRenderer.render({
    raw: capture, seed: snapshot.seed,
    intensity: study.renderIntensity ? study.renderIntensity(snapshot.intensity) : snapshot.intensity,
    restartOnIntensity: study.restartOnIntensity === true ||
      (study.id === "rank-streaks" && rankCoverageFromSharedStrength(snapshot.intensity) === 0),
    ink: snapshot.ink, id: snapshot.style, isCurrent,
    onReady: (pixels) => {
      diagnostic.stage = "replay";
      painter.push();
      try {
        painter.loadPixels();
        if (painter.pixels.length !== pixels.length)
          throw Error("Study canvas size mismatch");
        painter.pixels.set(pixels);
        painter.updatePixels();
      } finally {
        painter.pop();
      }
      lastGoodImage = painter.get();
      $("treatment").classList.toggle("pixelated", study.pixelated === true);
      renderCount++;
      Object.assign($("treatment").dataset, {
        renderCount: String(renderCount), style: snapshot.style,
        seed: String(snapshot.seed), orbit: String(snapshot.orbit),
        time: String(snapshot.time), ready: "true",
      });
      $("export").disabled = false;
      clearRenderError();
      $("study-cancel").hidden = true;
      $("status").textContent =
        `${styles.length} treatments · ${scene.meshCount} meshes · shared frame · ${Math.round(performance.now() - started)} ms`;
      syncSheetAvailability();
      completion?.resolve({ ready: true, superseded: false });
    },
    onError: (error) => { if (isCurrent()) fail(error, false, diagnostic); },
  });
}
function fail(error, fatal = false, diagnostic = renderDiagnosticContext(state, raw, "capture")) {
  $("study-cancel").hidden = true;
  renderCompletion?.resolve({ ready: false, superseded: false });
  console.error(error);
  // A failed synchronous draw or final replay may have touched the canvas.
  if (lastGoodImage && painter) {
    try {
      painter.push();
      try {
        painter.resetMatrix();
        painter.blendMode(painter.BLEND);
        painter.image(lastGoodImage, 0, 0);
      } finally { painter.pop(); }
    } catch (restoreError) { console.error(restoreError); }
  }
  showRenderDetails(error, diagnostic);
  $("treatment").dataset.ready = "false";
  $("export").disabled = true;
  syncSheetAvailability();
  $("status").textContent = fatal
    ? "3D rendering unavailable"
    : "This treatment could not render";
  $("render-error").hidden = false;
  $("render-error").textContent = fatal
    ? "This experiment needs WebGL 2. Try a current browser with hardware acceleration enabled."
    : typeof error?.message === "string" && error.message.startsWith("Wholetoning cannot process this capture")
      ? "Wholetoning cannot process this capture within its fixed complexity limits. Choose another study or simplify the material assignments."
      : "Couldn't render this view. Try another treatment or choose Reset.";
  if (fatal)
    $("reference").innerHTML =
      '<div class="error">The 3D scene could not start in this browser.</div>';
}

// Diagnostics deliberately read only render settings and feature flags. They
// never inspect location, storage, cookies, credentials or captured pixel data.
function sourceDimensions(capture) {
  return {
    width: capture?.size || painter?.width || null,
    height: capture?.size || painter?.height || null,
    captured: Boolean(capture),
  };
}
function renderDiagnosticContext(settings, capture, stage, output = settings.output) {
  return {
    settings: JSON.parse(JSON.stringify(Object.fromEntries(
      ["style", "output", "mix", "ink", "materials", "orbit", "time", "seed", "intensity", "mode", "locks"]
        .map(key => [key, settings[key]])))),
    source: sourceDimensions(capture), stage, output,
  };
}
function diagnosticText(value) {
  return String(value ?? "").replace(
    /(?:[a-z][a-z0-9+.-]*:\/\/|\/\/)[^\s<>"']+|(?:blob:|data:)[^\s<>"']+|(?:\.{0,2}\/)[^\s<>"']*[?#][^\s<>"']*|\b[\w.-]+\.[a-z0-9]+[?#][^\s<>"']*/gi,
    (url) => {
      if (/^data:/i.test(url)) return "[data URL omitted]";
      return url.replace(/[?#].*$/, "").replace(/(\/\/)[^/]*@/, "$1");
    },
  ).slice(0, 12000);
}
function clearRenderDetails(prefix = "render") {
  const panel = $(prefix + "-details");
  if (!panel) return;
  panel.hidden = true;
  panel.open = false;
  $(prefix + "-diagnostic").value = "";
  $(prefix + "-copy-status").textContent = "";
}
function clearRenderError() {
  $("render-error").hidden = true;
  clearRenderDetails();
}
function showRenderDetails(error, context, prefix = "render") {
  if (!$(prefix + "-details")) return;
  let recipe = null, recipeError;
  try {
    recipe = createRecipe(context.settings);
  } catch (error) {
    recipeError = {
      name: diagnosticText(error?.name || "Error"),
      message: diagnosticText(error?.message || error || "Recipe could not be generated"),
    };
  }
  const id = error?.treatment || (context.output === "study" ? context.settings.style : context.output),
    name = styles.find(study => study.id === id)?.name ||
      (id === "mix" ? "Image mix" : id === "contact sheet" ? "Contact sheet" : id),
    stage = diagnosticText(error?.renderStage || context.stage),
    message = diagnosticText(error?.message || error || "Unknown render error"),
    record = {
      format: "atelier-render-diagnostic", version: 1,
      treatment: { id: diagnosticText(id), name: diagnosticText(name) },
      stage, error: { name: diagnosticText(error?.name || "Error"), message,
        ...(error?.stack ? { stack: diagnosticText(error.stack) } : {}),
        ...(error?.workerLocation ? { location: {
          file: diagnosticText(error.workerLocation.file),
          line: error.workerLocation.line, column: error.workerLocation.column,
        } } : {}),
      },
      output: context.output,
      settings: context.settings,
      recipe,
      ...(recipeError ? { recipeError } : {}),
      source: context.source,
      capabilities: {
        worker: typeof Worker !== "undefined",
        offscreenCanvas: typeof OffscreenCanvas !== "undefined",
        webgl2: typeof WebGL2RenderingContext !== "undefined",
        structuredClone: typeof structuredClone === "function",
        secureContext: typeof isSecureContext !== "undefined" && isSecureContext,
        clipboard: typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function",
      },
    };
  // Serialize at failure time: later edits and clipboard promises cannot change
  // the record. textContent/value keep exception text out of HTML parsing.
  $(prefix + "-details-summary").textContent = `${diagnosticText(name)} (${diagnosticText(id)}) · ${diagnosticText(stage)}: ${message}`;
  $(prefix + "-diagnostic").value = JSON.stringify(record, null, 2);
  $(prefix + "-copy-status").textContent = "";
  $(prefix + "-details").hidden = false;
}
for (const prefix of ["render", "sheet"]) {
  $(prefix + "-copy-diagnostic")?.addEventListener("click", async () => {
    const field = $(prefix + "-diagnostic"), text = field.value;
    if (!text) return;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText)
        throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      if (field.value === text)
        $(prefix + "-copy-status").textContent = "Diagnostics copied.";
    } catch {
      if (field.value !== text) return;
      $(prefix + "-details").open = true;
      field.focus();
      field.select();
      $(prefix + "-copy-status").textContent = "Select and copy the diagnostics below.";
    }
  });
}
$("render-retry")?.addEventListener("click", () => requestRender(true));

function syncOutput() {
  const mixing = state.output === "mix";
  for (const [id, active] of [
    ["study-view", !mixing],
    ["mixer-view", mixing],
  ]) {
    $(id).classList.toggle("active", active);
    $(id).setAttribute("aria-pressed", String(active));
  }
  $("mixer-panel").hidden = !mixing;
  $("render-workspace").classList.toggle("mixing", mixing);
  $("mix-details").hidden = !mixing;
  $("single-details").hidden = mixing;
  for (const [id, button] of treatmentButtons) {
    const active = !mixing && id === state.style;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  updateBrowsing();
  if (mixing) {
    $("study-title").textContent = "The image between.";
    $("render-label").textContent = "TREATMENT MIXER";
    $("medium-label").textContent = state.mix.mode === "regions"
      ? "Shared scene / regional collage"
      : "Shared scene / layered studies";
    $("intensity-label").textContent = "Shared treatment strength";
    $("mechanism").textContent = state.mix.layers.some((layer) => layer.id === sceneReference.id)
      ? "Shared strength changes the drawing studies. Scene reference keeps the current materials, camera and light. Influence combines the completed images."
      : "Rebuilds each active study at the same strength. Influence sliders above only composite the cached drawings.";
    if (state.mix.layers.some((layer) => layer.id === "pixel-clusters"))
      $("mechanism").textContent = "Shared strength changes adjustable studies. Pixel clusters keeps its fixed grid and palette. " +
        (state.mix.layers.some((layer) => layer.id === sceneReference.id) ? "Scene reference keeps the captured scene. " : "") +
        "Influence combines the completed images.";
    if (state.mix.layers.some((layer) => layer.id === "finite-lenses"))
      $("mechanism").textContent = "Shared strength changes adjustable studies. Finite lenses keeps its four-sphere optical setup. " +
        (state.mix.layers.some((layer) => layer.id === "pixel-clusters") ? "Pixel clusters keeps its fixed grid and palette. " : "") +
        (state.mix.layers.some((layer) => layer.id === sceneReference.id) ? "Scene reference keeps the captured scene. " : "") +
        "Influence combines the completed images.";
    if (state.mix.layers.some((layer) => layer.id === "single-cutaway"))
      $("mechanism").textContent += " Single cutaway keeps its fixed plane and matte section inks; object and tone masks still follow the original image.";
    if (state.mix.layers.some((layer) => layer.id === "directional-color"))
      $("mechanism").textContent += " Directional color keeps its fixed three-pass image abstraction. Its first render is slow; influence reuses the finished image.";
    if (state.mix.layers.some((layer) => layer.id === "interior-lattice"))
      $("mechanism").textContent += " Interior lattice keeps its fixed internal frame and matte pigments. Influence combines its completed image; masks follow the original scene.";
  }
  showStrength();
  syncInkControls();
}
function beginMix() {
  if (state.output !== "mix") setMode("solo");
  state.output = "mix";
  syncOutput();
  return requestRender();
}
async function renderMix() {
  if (mixRun || mixPaused || sceneDirty || pageSuspended) return;
  const snapshot = JSON.parse(JSON.stringify(state)),
    revision = renderRevision,
    run = {
      raw,
      compositionKey: JSON.stringify({ mode: snapshot.mix.mode, layers: snapshot.mix.layers }),
      seed: state.seed,
      intensity: state.intensity,
      inkSignature: inkSignature(snapshot.ink),
      finishId: snapshot.mix.finish?.id,
      keepsPreparedPlan: activeLayers(snapshot.mix).some((layer) =>
        layer.id === "continuous-thread" || layer.id === "thickness-exposure" || layer.id === "copy-feedback" || layer.id === "section-ribs" || layer.id === "rank-streaks" || layer.id === "pixel-clusters" || layer.id === "single-cutaway" || layer.id === "directional-color" || layer.id === "interior-lattice"),
      controller: new AbortController(),
      revision,
    };
  const diagnostic = renderDiagnosticContext(snapshot, run.raw, "worker prepare");
  mixRun = run;
  $("mix-progress").hidden = false;
  $("mix-cancel").hidden = false;
  $("mix-message").textContent = "Preparing cached layers…";
  const started = performance.now();
  try {
    mixRenderer ||= createMixRenderer(painter);
    const images = await mixRenderer.prepare({
      raw: run.raw,
      seed: run.seed,
      intensity: run.intensity,
      mix: snapshot.mix,
      ink: snapshot.ink,
      signal: run.controller.signal,
      onProgress: ({ completed, total, id }) => {
        if (mixRun !== run || state.output !== "mix") return;
        $("mix-message").textContent =
          `${completed} / ${total} layers ready${id ? " · " + (id === sceneReference.id ? sceneReference.name : styles.find((s) => s.id === id)?.name || id) : ""}`;
        if (id === "directional-color")
          $("mix-message").textContent += " · Slow first render; Cancel render remains available.";
      },
    });
    if (
      run.controller.signal.aborted ||
      mixRun !== run ||
      renderRevision !== revision ||
      state.output !== "mix"
    )
      return;
    run.phase = "composite";
    diagnostic.stage = "composition";
    if (snapshot.mix.mode === "regions")
      $("mix-message").textContent = "Arranging regions…";
    let pixels = await compositeMixAsync(
      run.raw.color,
      images,
      snapshot.mix,
      { signal: run.controller.signal, size: run.raw.size, seed: run.seed,
        identity: run.raw.identity },
    );
    if (
      run.controller.signal.aborted ||
      renderRevision !== revision ||
      state.output !== "mix"
    )
      return;
    if (snapshot.mix.finish?.weight > 0) {
      run.phase = "finish";
      diagnostic.stage = "finish";
      $("mix-message").textContent = "Finishing the completed mix…";
      imageFinisher ||= createImageFinisher();
      const finished = await imageFinisher.finish(pixels, snapshot.mix.finish,
        { signal: run.controller.signal });
      if (!imageFinisher.isCurrent(finished.revision) || run.controller.signal.aborted ||
          renderRevision !== revision || state.output !== "mix") return;
      pixels = finished.pixels;
    }
    diagnostic.stage = "replay";
    painter.loadPixels();
    if (painter.pixels.length !== pixels.length)
      throw Error("Mixer canvas size mismatch");
    painter.pixels.set(pixels);
    painter.updatePixels();
    lastGoodImage = painter.get();
    $("treatment").classList.toggle("pixelated", false);
    renderCount++;
    Object.assign($("treatment").dataset, {
      renderCount: String(renderCount),
      style: "mix",
      seed: String(snapshot.seed),
      orbit: String(snapshot.orbit),
      time: String(snapshot.time),
      ready: "true",
    });
    $("export").disabled = false;
    clearRenderError();
    $("status").textContent =
      `${activeLayers(snapshot.mix).length} active layers${snapshot.mix.finish ? " · " + (snapshot.mix.finish.id === "fluted-glass" ? "Fluted glass " : snapshot.mix.finish.id === "ink-completed-mix" ? "Ink completed mix " : "Finite lenses ") + snapshot.mix.finish.weight + "%" : ""} · shared frame · ${Math.round(performance.now() - started)} ms`;
    $("mix-progress").hidden = true;
    syncSheetAvailability();
    renderCompletion?.resolve({ ready: true, superseded: false });
  } catch (error) {
    if (
      !run.controller.signal.aborted &&
      mixRun === run &&
      renderRevision === revision &&
      state.output === "mix"
    ) {
      fail(error, false, diagnostic);
      $("mix-message").textContent =
        "Mix could not render. Change a layer or return to Study to retry.";
    }
  } finally {
    if (mixRun === run) {
      mixRun = null;
      $("mix-cancel").hidden = true;
      if (
        !mixPaused &&
        !framePending &&
        state.output === "mix" &&
        revision !== renderRevision
      )
        void renderMix();
    }
  }
}
$("study-view").addEventListener("click", () => selectStyle(state.style));
$("mixer-view").addEventListener("click", beginMix);
function clearRandomUndo() {
  randomUndo = null;
  $("mix-undo-random").disabled = true;
  $("mix-random-note").textContent = "";
}
function randomizeMixer() {
  const next = randomMix(styles, state.mix.mode),
    materials = randomMaterials();
  const changed =
    materialSignature(materials) !== materialSignature(state.materials);
  if (state.mix.finish) next.finish = { ...state.mix.finish };
  randomUndo = {
    mix: {
      mode: state.mix.mode,
      layers: state.mix.layers.map((layer) => ({ ...layer,
        ...(Object.hasOwn(layer, "targets") ? { targets: [...layer.targets] } : {}) })),
      ...(state.mix.finish ? { finish: { ...state.mix.finish } } : {}),
    },
    materials: validateMaterials(state.materials),
  };
  state.mix = next;
  state.materials = materials;
  state.output = "mix";
  syncOutput();
  syncMaterialControls();
  invalidateRecipeRead();
  mixRun?.controller.abort();
  mixerControls.refresh();
  $("mix-undo-random").disabled = false;
  $("mix-random-note").textContent =
    `New ${next.layers.length}-layer mix + 19 material choices`;
  return requestRender(changed);
}
function undoRandomize() {
  if (!randomUndo) return null;
  const changed =
    materialSignature(state.materials) !==
    materialSignature(randomUndo.materials);
  state.mix = randomUndo.mix;
  state.materials = randomUndo.materials;
  randomUndo = null;
  state.output = "mix";
  syncOutput();
  syncMaterialControls();
  invalidateRecipeRead();
  mixRun?.controller.abort();
  mixerControls.refresh();
  $("mix-undo-random").disabled = true;
  $("mix-random-note").textContent = "Previous mix and materials restored";
  return requestRender(changed);
}
$("mix-randomize").addEventListener("click", randomizeMixer);
$("mix-undo-random").addEventListener("click", undoRandomize);
function invalidateRecipeRead() {
  recipeRead++;
  if ($("recipe-status").textContent === "Reading recipe…")
    $("recipe-status").textContent = "Recipe reading canceled.";
}
$("mix-cancel").addEventListener("click", () => {
  invalidateRecipeRead();
  mixPaused = true;
  mixRun?.controller.abort();
  imageFinisher?.cancel();
  $("treatment").dataset.ready = "false";
  $("export").disabled = true;
  syncSheetAvailability();
  renderCompletion?.resolve({ ready: false, canceled: true });
  $("mix-message").textContent = "Mix canceled. Change a control to resume.";
});
$("study-cancel").addEventListener("click", () => {
  if (state.output !== "study" || (state.style !== "directional-color" && state.style !== "interior-lattice") || $("study-cancel").hidden) return;
  ++renderRevision;
  studyRenderer?.cancel();
  $("study-cancel").hidden = true;
  $("treatment").dataset.ready = "false";
  $("export").disabled = true;
  syncSheetAvailability();
  renderCompletion?.resolve({ ready: false, canceled: true });
  $("status").textContent = (state.style === "interior-lattice" ? "Interior lattice" : "Directional color") + " canceled. Choose a study or change a control to resume.";
});
$("mix-recipe").addEventListener("click", () => {
  downloadSheet(
    new Blob([JSON.stringify(createRecipe(state), null, 2)], {
      type: "application/json",
    }),
    mixFilename(state) + ".json",
  );
});
$("mix-ai-export").addEventListener("click", async () => {
  const button = $("mix-ai-export");
  button.disabled = true;
  try {
    // Capture settings and matching pixels before loading the export UI. A slow
    // module download must never pair newer controls with an older preview.
    const recipe = createRecipe(state);
    const ready = state.output === "mix" && $("treatment").dataset.ready === "true";
    const preview = ready ? $("treatment").querySelector("canvas")?.toDataURL("image/png") : null;
    const reference = preview && raw ? { size: raw.size, pixels: raw.color.slice() } : null;
    const { openStyleHandoff } = await import("./style-handoff-dialog.js");
    openStyleHandoff({ recipe, preview, reference });
  } catch (error) {
    $("recipe-status").textContent = "Could not prepare the AI export. " + error.message;
  } finally {
    button.disabled = false;
  }
});
function applyRecipe(recipe) {
  clearRandomUndo();
  const changed =
    state.orbit !== recipe.orbit ||
    state.time !== recipe.time ||
    materialSignature(state.materials) !== materialSignature(recipe.materials);
  Object.assign(state, recipe);
  mixerControls.refresh();
  syncOutput();
  syncControls();
  setMode(recipe.mode);
  return requestRender(changed);
}
async function openRecipe(file) {
  if (!file) return false;
  const run = ++recipeRead,
    revision = renderRevision,
    previous = JSON.stringify(state);
  $("recipe-status").textContent = "Reading recipe…";
  try {
    if (
      !Number.isInteger(file.size) ||
      file.size < 0 ||
      file.size > recipeLimit
    )
      throw Error("Choose an Atelier recipe smaller than 64 KiB.");
    const text = await file.text();
    if (run !== recipeRead) return false;
    const recipe = parseRecipe(
      text,
      styles.map((s) => s.id),
    );
    if (revision !== renderRevision || previous !== JSON.stringify(state)) {
      $("recipe-status").textContent =
        "Kept your newer edits. Open the recipe again to apply it.";
      return false;
    }
    applyRecipe(recipe);
    $("recipe-status").textContent = "Recipe settings loaded.";
    return true;
  } catch (error) {
    if (run === recipeRead)
      $("recipe-status").textContent =
        error.message ||
        "Could not read the recipe. Your current settings are intact.";
    return false;
  }
}
$("mix-open-recipe").addEventListener("click", () => {
  invalidateRecipeRead();
  $("recipe-status").textContent = "";
  $("recipe-file").click();
});
$("recipe-file").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  void openRecipe(file);
});

window.addEventListener("pagehide", (event) => {
  pageSuspended = true;
  $("study-cancel").hidden = true;
  if (event.persisted) imageFinisher?.cancel();
  else { imageFinisher?.dispose(); imageFinisher = null; }
  studyRenderer?.cancel();
  $("treatment").dataset.ready = "false";
  $("export").disabled = true;
  syncSheetAvailability();
  renderCompletion?.resolve({ ready: false, canceled: true });
  invalidateRecipeRead();
  mixPaused = true;
  mixRun?.controller.abort();
});
window.addEventListener("pageshow", (event) => {
  pageSuspended = false;
  if (event.persisted) requestRender();
});
mixerControls = mountMixer({
  document,
  styles,
  getMix: () => state.mix,
  onChange: () => {
    clearRandomUndo();
    if (state.output === "mix") {
      syncOutput();
      requestRender();
    } else syncInkControls();
  },
});
clearRandomUndo();

for (const family of familyNames) {
  const option = document.createElement("option");
  option.value = family;
  option.textContent = family;
  $("family-filter").append(option);
  const heading = document.createElement("h3");
  heading.className = "family-heading";
  heading.textContent = family;
  familyHeadings.set(family, heading);
  $("styles").append(heading);
  for (const s of styles.filter((style) => familyOf(style) === family)) {
    const sidx = styles.indexOf(s),
      b = document.createElement("button");
    b.className = "style-button";
    b.dataset.style = s.id;
    b.style.setProperty("--swatch", s.swatch);
    b.innerHTML = `<span class="style-number">${String(sidx + 1).padStart(2, "0")}</span><span>${s.name}</span><span class="swatch"></span>`;
    b.addEventListener("click", () => selectStyle(s.id));
    treatmentButtons.set(s.id, b);
    $("styles").append(b);
  }
}
$("treatment-search").addEventListener("input", updateBrowsing);
$("family-filter").addEventListener("change", updateBrowsing);
$("clear-filters").addEventListener("click", clearFilters);
$("show-current").addEventListener("click", () => {
  clearFilters();
  treatmentButtons
    .get(state.style)
    .scrollIntoView?.({ block: "nearest", inline: "nearest" });
  treatmentButtons.get(state.style).focus?.();
});
$("previous-treatment").addEventListener("click", () => browseTreatment(-1));
$("next-treatment").addEventListener("click", () => browseTreatment(1));
$("count").textContent = String(styles.length).padStart(2, "0");
for (const key of ["camera", "time", "seed"]) {
  $(`${key}-lock`).addEventListener("click", () => {
    invalidateRecipeRead();
    state.locks[key] = !state.locks[key];
    syncControls();
  });
}
function syncControls() {
  for (const key of ["camera", "time", "seed"]) {
    const b = $(`${key}-lock`),
      locked = state.locks[key];
    b.textContent = `${key[0].toUpperCase() + key.slice(1)} ${locked ? "locked" : "unlocked"}`;
    b.classList.toggle("active", locked);
    b.setAttribute("aria-pressed", String(locked));
    $(key === "camera" ? "orbit" : key).disabled = locked;
  }
  $("orbit").value = state.orbit;
  $("orbit-value").textContent = state.orbit + "°";
  $("time").value = state.time;
  $("time-value").textContent = state.time;
  $("seed").value = state.seed;
  $("intensity").value = Math.round(state.intensity * 100);
  showStrength();
  syncInkControls();
  syncMaterialControls();
}
$("orbit").addEventListener("input", (e) => {
  state.orbit = Number(e.target.value);
  syncControls();
  requestRender(true);
});
$("time").addEventListener("input", (e) => {
  state.time = Number(e.target.value);
  syncControls();
  requestRender(true);
});
$("seed").addEventListener("change", (e) => {
  state.seed = Math.max(
    1,
    Math.min(999999, Math.trunc(Number(e.target.value) || 2401)),
  );
  syncControls();
  requestRender();
});
$("intensity").addEventListener("input", (e) => {
  state.intensity = Number(e.target.value) / 100;
  syncControls();
  requestRender();
});
const materialSelectors = new Map();
const tissueSignature = materialSignature(tissueMaterials());
function syncMaterialControls() {
  const isTissue = materialSignature(state.materials) === tissueSignature;
  $("materials-original").classList.toggle(
    "active",
    state.materials.preset === "original",
  );
  $("materials-original").setAttribute(
    "aria-pressed",
    String(state.materials.preset === "original"),
  );
  $("materials-mixed").classList.toggle(
    "active",
    state.materials.preset === "mixed",
  );
  $("materials-mixed").setAttribute(
    "aria-pressed",
    String(state.materials.preset === "mixed"),
  );
  $("materials-tissue").classList.toggle("active", isTissue);
  $("materials-tissue").setAttribute("aria-pressed", String(isTissue));
  $("material-summary").textContent =
    state.materials.preset === "original"
      ? "Original Quiet Garden materials"
      : state.materials.preset === "mixed"
        ? "Brass · porcelain · concrete · chrome · stone"
        : isTissue
          ? "Skin · fat · muscle · dense bone · porous bone"
          : "Custom materials by object";
  for (const [id, select] of materialSelectors)
    select.value = state.materials.assignments[id] || "original";
}
function setMaterials(value) {
  const next = validateMaterials(value),
    changed = materialSignature(next) !== materialSignature(state.materials);
  state.materials = next;
  clearRandomUndo();
  invalidateRecipeRead();
  syncMaterialControls();
  if (changed) {
    mixRun?.controller.abort();
    $("status").textContent = "Preparing material surfaces…";
    return requestRender(true);
  }
  return requestRender();
}
for (const object of materialObjects) {
  const label = document.createElement("label"),
    select = document.createElement("select"),
    text = document.createElement("span");
  text.textContent = object.name;
  select.setAttribute("aria-label", object.name + " material");
  for (const item of [
    { id: "original", name: "Original" },
    ...materialDefinitions.filter((item) => supportsMaterial(item.id, object.id)),
  ]) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    select.append(option);
  }
  select.addEventListener("change", () =>
    setMaterials({
      preset: "custom",
      assignments: {
        ...state.materials.assignments,
        [object.id]: select.value,
      },
    }),
  );
  label.append(text, select);
  $("material-objects").append(label);
  materialSelectors.set(object.id, select);
}
$("materials-original").addEventListener("click", () =>
  setMaterials(defaultMaterials()),
);
$("materials-mixed").addEventListener("click", () =>
  setMaterials(mixedMaterials()),
);
$("materials-tissue").addEventListener("click", () =>
  setMaterials(tissueMaterials()),
);
function syncInkControls() {
  const ids =
    state.output === "mix"
      ? state.mix.layers
          .filter((layer) => layer.enabled && layer.weight > 0)
          .map((layer) => layer.id)
      : [state.style];
  const active = new Set(ids.flatMap(inkEffectsFor));
  $("ink-panel").hidden = !active.size;
  for (const key of inkKeys) {
    $("ink-" + key).value = Math.round(state.ink[key] * 100);
    $("ink-" + key).disabled = !active.has(key);
    $("ink-" + key + "-value").textContent =
      Math.round(state.ink[key] * 100) + "%";
  }
}
function setInkControls(values) {
  state.ink = validateInk(values);
  invalidateRecipeRead();
  mixRun?.controller.abort();
  syncInkControls();
  return requestRender();
}
for (const key of inkKeys) {
  $("ink-" + key).addEventListener("input", (event) => {
    invalidateRecipeRead();
    $("ink-" + key + "-value").textContent = event.target.value + "%";
  });
  $("ink-" + key).addEventListener("change", (event) => {
    setInkControls({ ...state.ink, [key]: Number(event.target.value) / 100 });
  });
}
$("ink-reset").addEventListener("click", () => setInkControls(defaultInk()));
function setMode(mode) {
  state.mode = mode;
  $("canvases").classList.toggle("solo", mode === "solo");
  for (const id of ["compare", "solo"]) {
    $(id).classList.toggle("active", id === mode);
    $(id).setAttribute("aria-pressed", String(id === mode));
  }
}
$("compare").addEventListener("click", () => {
  invalidateRecipeRead();
  setMode("compare");
});
$("solo").addEventListener("click", () => {
  invalidateRecipeRead();
  setMode("solo");
});
$("reset").addEventListener("click", () => {
  Object.assign(state, {
    orbit: 0,
    time: 25,
    seed: 2401,
    intensity: 0.6,
    ink: defaultInk(),
    locks: { camera: true, time: true, seed: true },
  });
  syncControls();
  setMode("compare");
  requestRender(true);
});
$("about").addEventListener("click", () => $("about-dialog").showModal());
$("about-dialog").addEventListener("click", (e) => {
  if (e.target === $("about-dialog")) $("about-dialog").close();
});
$("export").addEventListener("click", () => {
  if (painter && $("treatment").dataset.ready === "true")
    painter.saveCanvas(
      state.output === "mix"
        ? mixFilename(state)
        : `atelier-${state.style}-s${state.seed}-c${state.orbit}-t${state.time}-p${Math.round(state.intensity * 100)}${inkStyleIds.includes(state.style) ? "-ink" + inkKeys.map((k) => Math.round(state.ink[k] * 100)).join("_") : ""}${materialFingerprint(state.materials) ? "-mat" + materialFingerprint(state.materials) : ""}`,
      "png",
    );
});
try {
  scene = createReference($("reference"));
  new p5((p) => {
    p.setup = () => {
      p.pixelDensity(1);
      const c = p.createCanvas(720, 720);
      c.parent("treatment");
      c.elt.setAttribute("role", "img");
      c.elt.setAttribute(
        "aria-label",
        "Artistic interpretation of the same Three.js reference scene",
      );
      p.noLoop();
      painter = p;
      selectStyle(state.style);
      syncControls();
      requestRender(true);
    };
  });
} catch (error) {
  fail(error, true);
}
// WebMCP is optional. It shares exactly the same actions and state as the visible controls.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const register = (tool) =>
    Promise.resolve(
      document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
    ).catch(console.warn);
  register({
    name: "list_rendering_treatments",
    title: "List rendering treatments",
    description:
      "Read available graphical treatments, additional mixer sources and the current comparison settings.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: () => ({
      treatments: styles.map(({ id, name, mechanism, family }) => ({
        id,
        name,
        mechanism,
        family,
      })),
      additionalMixerSources: [{ ...sceneReference }],
      settings: JSON.parse(JSON.stringify(state)),
    }),
  });
  register({
    name: "configure_rendering_comparison",
    title: "Configure rendering comparison",
    description:
      "Select a treatment and compare or single view in this browser.",
    inputSchema: {
      type: "object",
      properties: {
        treatment: { type: "string", enum: styles.map((s) => s.id) },
        view: { type: "string", enum: ["compare", "solo"] },
      },
      required: ["treatment"],
      additionalProperties: false,
    },
    execute: async (input) => {
      if (
        !input ||
        !styles.some((s) => s.id === input.treatment) ||
        (input.view && !["compare", "solo"].includes(input.view))
      )
        throw new Error("Choose a valid treatment and view");
      const job = selectStyle(input.treatment);
      if (input.view) setMode(input.view);
      const result = await job.promise;
      return {
        treatment: input.treatment,
        view: input.view || state.mode,
        ...result,
      };
    },
  });
  register({
    name: "configure_treatment_mix",
    title: "Configure treatment mix",
    description:
      "Composite up to eight image layers from studies or scene-reference, the current 3D material render, using normalized RGB average, bottom-to-top layers or seeded regional collage. Optional per-layer target IDs clip to visible surfaces: 0 backdrop, 1 floor, 2–20 scene objects. Omit targets for the whole scene; an empty array selects nothing. Optional tone selects a soft reference-brightness range: all, shadows, midtones or highlights. Tone fades source alpha; it does not change material shading or region placement. Optional finish applies fixed Finite lenses, bends a finite print through Fluted glass, or multiplies brightness-derived coherent ink into the completed mix after all masks and blends; its weight is final Normal display-RGB influence. Optical finishes omit reflected paths. Omit finish for None.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["average", "layers", "regions"] },
        finish: {
          type: "object",
          properties: {
            id: { type: "string", enum: ["finite-lenses", "ink-completed-mix", "fluted-glass"] },
            weight: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: ["id", "weight"],
          additionalProperties: false,
        },
        layers: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: mixerSourceIds(styles.map((s) => s.id)) },
              enabled: { type: "boolean" },
              weight: { type: "integer", minimum: 0, maximum: 100 },
              blend: { type: "string", enum: ["normal", "multiply", "screen", "color"],
                description: "Ordered layers only. Color keeps the lower image's brightness and takes this layer's color; Average and Regions ignore blend." },
              tone: { type: "string", enum: ["all", "shadows", "midtones", "highlights"] },
              targets: { type: "array", maxItems: 21, uniqueItems: true,
                items: { type: "integer", minimum: 0, maximum: 20 } },
            },
            required: ["id", "enabled", "weight", "blend"],
            additionalProperties: false,
          },
        },
      },
      required: ["mode", "layers"],
      additionalProperties: false,
    },
    execute: async (input) => {
      const mix = validateMix(
        input,
        mixerSourceIds(styles.map((s) => s.id)),
      );
      clearRandomUndo();
      state.mix = mix;
      mixerControls.refresh();
      const job = beginMix(),
        result = await job.promise;
      return { mix, ...result };
    },
  });
  register({
    name: "configure_scene_materials",
    title: "Configure scene materials",
    description:
      "Choose Original or Mixed materials, or assign materials per object before the rendering treatment. Perforated metal shell is available only for Vase (7) and Sphere (10); Shingle relief, Enamel reserve and Ribbed clay only for Vase (7). Reuses fixed geometry and baked surface maps.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["original", "mixed", "custom"] },
        assignments: {
          type: "object",
          properties: Object.fromEntries(
            materialObjects.map((object) => [
              String(object.id),
              { type: "string", enum: ["original", ...materialIdsForObject(object.id)] },
            ]),
          ),
          additionalProperties: false,
        },
      },
      required: ["preset"],
      additionalProperties: false,
    },
    execute: async (input) => {
      if (!input || !["original", "mixed", "custom"].includes(input.preset))
        throw Error("Choose valid scene materials");
      // Validate a supplied whole assignment map before preset resolution or
      // state changes, including maps accompanying Original and Mixed.
      if (Object.hasOwn(input, "assignments")) validateMaterials(input);
      const next =
        input.preset === "original"
          ? defaultMaterials()
          : input.preset === "mixed"
            ? mixedMaterials()
            : validateMaterials(input);
      const job = setMaterials(next),
        result = await job.promise;
      return { materials: next, ...result };
    },
  });
  register({
    name: "configure_expressive_ink",
    title: "Configure expressive ink",
    description:
      "Set seven shared expressive ink effects. Applies to ink studies and any active ink layers. Depth warp changes the drawn image, not the reference geometry.",
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(
        inkKeys.map((key) => [key, { type: "number", minimum: 0, maximum: 1 }]),
      ),
      required: inkKeys,
      additionalProperties: false,
    },
    execute: async (input) => {
      const ink = validateInk(input),
        job = setInkControls(ink),
        result = await job.promise;
      return { ink, ...result };
    },
  });
  register({
    name: "load_treatment_recipe",
    title: "Load treatment recipe",
    description:
      "Validate and restore an exported Atelier recipe, including layers, influence, captured-scene settings and locks. Invalid recipes leave the view unchanged.",
    inputSchema: {
      type: "object",
      properties: { recipe: { type: "string", maxLength: 65536 } },
      required: ["recipe"],
      additionalProperties: false,
    },
    execute: async (input) => {
      invalidateRecipeRead();
      const recipe = parseRecipe(
        input?.recipe,
        styles.map((s) => s.id),
      );
      const job = applyRecipe(recipe),
        result = await job.promise;
      return { ...result, mix: recipe.mix, view: recipe.mode };
    },
  });
  register({
    name: "randomize_treatment_mix",
    title: "Randomize treatment mix",
    description:
      "Randomize three to five treatments and all 19 object materials. Perforated metal is limited to Vase and Sphere; Shingle relief, Enamel reserve and Ribbed clay to Vase. Camera, light, seed, strength, ink controls and current mixer method are retained.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      const job = randomizeMixer(),
        mix = JSON.parse(JSON.stringify(state.mix)),
        materials = validateMaterials(state.materials);
      const result = await job.promise;
      return { ...result, mix, materials };
    },
  });
  register({
    name: "undo_mix_randomization",
    title: "Undo mixer randomization",
    description:
      "Restore both layers and material assignments from before the last Randomize action. Available until the next manual layer/material edit or import; camera, light, seed, strength and ink controls stay as they are.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      const job = undoRandomize();
      if (!job) throw Error("No mixer randomization to undo");
      const mix = JSON.parse(JSON.stringify(state.mix)),
        materials = validateMaterials(state.materials);
      const result = await job.promise;
      return { ...result, mix, materials };
    },
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) lifecycle.abort();
  });
}
