import { renderError, workerPacketError, workerEventError } from "./render-errors.js";
import { abortIf, replayDrawing } from "./drawing-protocol.js";
import { snapshotFrame } from "./render-source.js";
import { validateInk, inkKeys, inkStyleIds } from "./ink-effects.js";
import { validateMaterials, materialFingerprint } from "./material-state.js";
import { acquireInteriorLatticeLease } from "./interior-lattice-lease.js";
import { validateVolumeBarDrawing } from "./volume-bar-plan.js";

const nextPaint = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));
export async function buildContactSheet({
  raw,
  snapshot,
  studies,
  painter,
  signal,
  onProgress = () => {},
  environment = {},
}) {
  const createCanvas =
    environment.createCanvas || (() => document.createElement("canvas"));
  const createWorker =
    environment.createWorker ||
    (() =>
      new Worker(new URL("./contact-worker.js", import.meta.url), {
        type: "module",
      }));
  const yieldFrame = environment.yieldFrame || nextPaint;
  const now = environment.now || (() => performance.now());
  let graphics = null,
    worker = null,
    releaseVolumeBarLease = null,
    pending = null,
    workerFailure = null,
    sheet = null,
    workerReady = false, stage = "worker prepare", treatment = null;
  const cancelled = () =>
    signal?.reason || new DOMException("Canceled", "AbortError");
  const rejectPending = (error) => {
    workerFailure = error = renderError(error, stage, treatment);
    if (pending) {
      const current = pending;
      pending = null;
      current.reject(error);
    }
  };
  const cancel = () => {
    worker?.terminate();
    rejectPending(cancelled());
  };
  try {
    abortIf(signal);
    if (!studies.length) throw Error("No treatments to export");
    const ink = validateInk(snapshot.ink),
      materials = validateMaterials(snapshot.materials),
      materialKey = materialFingerprint(materials);
    onProgress({
      completed: 0,
      total: studies.length,
      treatment: "Preparing snapshot",
    });
    // This descriptor copies no geometry calculations onto the UI thread.
    const frame = snapshotFrame(raw);
    await yieldFrame();
    abortIf(signal);
    if (studies.some((study) => study.id === "interior-lattice")) {
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
        rejectPending(Error("Invalid contact-sheet worker payload"));
        return;
      }
      const current = pending;
      pending = null;
      if (data.type === "error") {
        const error = workerPacketError(data, current);
        workerFailure = error;
        current.reject(error);
      } else if (
        data.type !== current.type ||
        (current.id && data.id !== current.id)
      ) {
        const error = renderError(new Error("Out-of-order contact-sheet reply"), stage, current.id);
        workerFailure = error;
        current.reject(error);
      } else {
        if (data.type === "ready") workerReady = true;
        current.resolve(data);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      rejectPending(workerEventError(event, workerReady, pending, "Contact-sheet worker failed"));
    };
    worker.onmessageerror = () =>
      rejectPending(new Error("Invalid contact-sheet worker message"));
    signal?.addEventListener("abort", cancel, { once: true });
    abortIf(signal);
    const ask = (payload, type, id) =>
      new Promise((resolve, reject) => {
        if (workerFailure) {
          reject(workerFailure);
          return;
        }
        stage = payload.type === "prepare" ? "worker prepare" : "worker draw";
        treatment = id || null;
        pending = { resolve, reject, type, id };
        try {
          worker.postMessage(payload);
        } catch (error) {
          rejectPending(error);
        }
      });
    await ask(
      {
        type: "prepare",
        raw: frame,
        seed: snapshot.seed,
        strength: snapshot.intensity,
        ink,
        constants: {
          BLEND: graphics.BLEND,
          ADD: graphics.ADD,
          MULTIPLY: graphics.MULTIPLY,
          CLOSE: graphics.CLOSE,
        },
      },
      "ready",
    );
    abortIf(signal);
    stage = "composition";
    const columns = Math.max(3, Math.min(5, studies.length)),
      card = 280,
      header = 230,
      row = 304;
    sheet = createCanvas();
    sheet.width = columns * card;
    sheet.height = header + Math.ceil(studies.length / columns) * row + 24;
    const ctx = sheet.getContext("2d");
    ctx.fillStyle = "#f2f3eb";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    const reference = createCanvas();
    reference.width = reference.height = raw.size;
    const refContext = reference.getContext("2d"),
      referencePixels = refContext.createImageData(raw.size, raw.size);
    referencePixels.data.set(raw.color);
    refContext.putImageData(referencePixels, 0, 0);
    ctx.drawImage(reference, 20, 18, 164, 164);
    reference.width = reference.height = 1;
    ctx.fillStyle = "#1c3029";
    ctx.font = "13px Arial";
    ctx.fillText("Three.js reference", 20, 205);
    ctx.font = "28px Arial";
    ctx.fillText(`ATELIER / ${studies.length} RENDERING STUDIES`, 215, 66);
    ctx.font = "17px Arial";
    ctx.fillText(
      `Camera ${snapshot.orbit}° · Light ${snapshot.time} · Seed ${snapshot.seed} · Strength ${Math.round(snapshot.intensity * 100)}%`,
      215,
      106,
    );
    ctx.fillText(
      materialKey
        ? `One captured scene · ${materials.preset} materials · p5.js treatments.`
        : "One captured scene. Every tile rendered through p5.js.",
      215,
      143,
    );
    ctx.font = "14px Arial";
    ctx.fillStyle = "#64716a";
    ctx.fillText(
      "Fixed geometry, camera, lighting and seed throughout this sheet.",
      215,
      177,
    );
    const includesInk = studies.some((study) => inkStyleIds.includes(study.id));
    if (includesInk) {
      ctx.font = "12px Arial";
      ctx.fillText(
        "Ink %: " +
          inkKeys
            .map((key) => key + " " + Math.round(ink[key] * 100))
            .join(" · "),
        215,
        205,
      );
    }
    for (let index = 0; index < studies.length; index++) {
      const study = studies[index];
      abortIf(signal);
      onProgress({
        completed: index,
        total: studies.length,
        treatment: study.name,
      });
      const response = await ask(
        { type: "draw", id: study.id },
        "drawing",
        study.id,
      );
      abortIf(signal);
      stage = "replay";
      if (study.id === "interior-lattice") validateVolumeBarDrawing(response.packet, raw.size);
      graphics.push();
      try {
        graphics.clear();
        graphics.resetMatrix();
        graphics.blendMode(graphics.BLEND);
        await replayDrawing(graphics, response.packet, {
          signal,
          yieldFrame,
          now,
        });
      } finally {
        graphics.pop();
      }
      abortIf(signal);
      stage = "composition";
      const x = (index % columns) * card + 16,
        y = header + Math.floor(index / columns) * row;
      ctx.drawImage(graphics.canvas, x, y, 248, 248);
      ctx.fillStyle = "#1c3029";
      ctx.font = "16px Arial";
      ctx.fillText(
        `${String(index + 1).padStart(2, "0")} / ${study.name}`,
        x,
        y + 272,
      );
      ctx.font = "12px Arial";
      ctx.fillStyle = "#64716a";
      ctx.fillText(study.family || study.category || "", x, y + 291);
      ctx.textAlign = "right";
      ctx.fillText(
        study.formatStrength
          ? study.formatStrength(snapshot.intensity)
          : `${Math.round(snapshot.intensity * 100)}%`,
        x + 248,
        y + 291,
      );
      ctx.textAlign = "left";
      onProgress({
        completed: index + 1,
        total: studies.length,
        treatment: study.name,
      });
      await yieldFrame();
      abortIf(signal);
    }
    return {
      canvas: sheet,
      filename: `atelier-sheet-s${snapshot.seed}-c${snapshot.orbit}-t${snapshot.time}-p${Math.round(snapshot.intensity * 100)}${includesInk ? "-ink" + inkKeys.map((key) => Math.round(ink[key] * 100)).join("_") : ""}${materialKey ? "-mat" + materialKey : ""}.png`,
    };
  } catch (error) {
    if (sheet) sheet.width = sheet.height = 1;
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
    } finally {
      releaseVolumeBarLease?.();
    }
  }
}
export function encodeSheet(canvas, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () =>
      reject(signal.reason || new DOMException("Canceled", "AbortError"));
    if (signal?.aborted) {
      cancel();
      return;
    }
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      canvas.toBlob((blob) => {
        signal?.removeEventListener("abort", cancel);
        if (signal?.aborted) {
          cancel();
          return;
        }
        if (!blob) reject(new Error("PNG encoding failed"));
        else resolve(blob);
      }, "image/png");
    } catch (error) {
      signal?.removeEventListener("abort", cancel);
      reject(error);
    }
  });
}
export function downloadSheet(blob, filename) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  try {
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
