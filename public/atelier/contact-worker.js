import { restoreGeometryStudies } from "./geometry-studies.js";
import { styles, makeFrame } from "./styles.js";
import { recordDrawing } from "./drawing-protocol.js";
import { validateInk } from "./ink-effects.js";
import { prepareContinuousThread } from "./continuous-thread.js";
import { compactThreadPlan, validateThreadPlan } from "./thread-plan.js";
import { prepareThicknessFrame } from "./thickness-exposure-study.js";
import { compactThicknessPlan, validateThicknessPlan } from "./thickness-plan.js";
import { prepareCopyFeedbackFrame } from "./copy-feedback-study.js";
import { compactCopyFeedbackPlan, validateCopyFeedbackPlan } from "./copy-feedback-plan.js";
import { prepareSectionRibFrame } from "./section-rib.js";
import { compactSectionRibPlan, validateSectionRibPlan } from "./section-rib-plan.js";
import { prepareCutawayFrame } from "./cutaway-study.js";
import { compactCutawayPlan, validateCutawayPlan } from "./cutaway-plan.js";
import { prepareRankStreakFrame } from "./rank-streak-study.js";
import { compactRankStreakPlan, hydrateRankStreakPlan, validateRankStreakSource, rankCoverageFromSharedStrength } from "./rank-streak-plan.js";
import { preparePixelClusterFrame } from "./pixel-cluster-study.js";
import { compactPixelClusterPlan, hydratePixelClusterPlan, validatePixelClusterSource } from "./pixel-cluster-plan.js";
import { prepareDirectionalColorFrame } from "./directional-color-study.js";
import { compactDirectionalColorPlan, hydrateDirectionalColorPlan, validateDirectionalColorSource } from "./directional-color-plan.js";
import { prepareVolumeBarFrame } from "./volume-bar.js";
import { compactVolumeBarPlan, validateVolumeBarPlan } from "./volume-bar-plan.js";
let volumeBar = null;
let directionalColor = null;
let pixelCluster = null;
let rankStreak = null;
let sectionRib = null;
let cutaway = null;
let copyFeedback = null;
let thread = null;
let thickness = null;
let frame = null,
  constants = null;
self.onmessage = ({ data }) => {
  try {
    if (data.type === "prepare") {
      frame = null;
      thread = null;
      thickness = null;
      copyFeedback = null;
      sectionRib = null;
      cutaway = null;
      rankStreak = null;
      pixelCluster = null;
      directionalColor = null;
      volumeBar = null;
      const ink = validateInk(data.ink);
      if (data.raw.geometry)
        Object.assign(data.raw, restoreGeometryStudies(data.raw.geometry));
      frame = makeFrame(data.raw, data.seed, data.strength, ink);
      if (data.thread) {
        const { source, size, seed, plan } = data.thread;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size || seed !== data.seed)
          throw Error("Invalid continuous thread source");
        thread = { source, size, seed };
        if (plan !== undefined) frame.continuousThreadPlan = validateThreadPlan(plan, thread);
      }
      if (data.thickness) {
        const { source, size, plan } = data.thickness;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size)
          throw Error("Invalid thickness exposure source");
        thickness = { source, size, cached: plan !== undefined };
        if (plan !== undefined) frame.thicknessPlan = validateThicknessPlan(plan, thickness);
      }
      if (data.copyFeedback) {
        const { source, size, seed, plan } = data.copyFeedback;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size || seed !== data.seed)
          throw Error("Invalid repeated-copy feedback source");
        copyFeedback = { source, size, seed, cached: plan !== undefined };
        if (plan !== undefined) {
          validateCopyFeedbackPlan(plan, copyFeedback);
          frame.copyFeedbackPlan = { version: 1, model: "aligned-current-sheet-v1",
            width: size, height: size, seed, machineSeed: 2401, maxGeneration: 12,
            stages: plan.stages, rngStates: plan.rngStates };
        }
      }
      if (data.sectionRib) {
        const { source, size, plan } = data.sectionRib;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size)
          throw Error("Invalid section-rib source");
        sectionRib = { source, size, cached: plan !== undefined };
        if (plan !== undefined) frame.sectionRibPlan = validateSectionRibPlan(plan, sectionRib).field;
      }
      if (data.cutaway) {
        const { source, size, plan } = data.cutaway;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size)
          throw Error("Invalid single-cutaway source");
        cutaway = { source, size, cached: plan !== undefined };
        if (plan !== undefined) frame.cutawayPlan = validateCutawayPlan(plan, cutaway);
      }
      if (data.rankStreak) {
        const { source, size, plan } = data.rankStreak;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size)
          throw Error("Invalid Pixel sorting source");
        rankStreak = { source, size, cached: plan !== undefined };
        if (plan !== undefined)
          frame.rankStreakPlan = hydrateRankStreakPlan(plan, rankStreak, frame.color);
        else validateRankStreakSource(frame.color, size, size);
      }
      if (data.pixelCluster) {
        const { source, size, plan } = data.pixelCluster;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size || size !== 720)
          throw Error("Invalid Pixel clusters source");
        pixelCluster = { source, size, cached: plan !== undefined };
        if (plan !== undefined)
          frame.pixelClusterPlan = hydratePixelClusterPlan(plan, pixelCluster, frame.color);
        else validatePixelClusterSource(frame.color, size);
      }
      constants = data.constants;
      if (data.directionalColor) {
        const { source, size, plan } = data.directionalColor;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size || size !== 720)
          throw Error("Invalid Directional color source");
        directionalColor = { source, size, cached: plan !== undefined };
        if (plan !== undefined)
          frame.directionalColorPlan = hydrateDirectionalColorPlan(plan, directionalColor, frame.color);
        else validateDirectionalColorSource(frame.color, size);
      }
      if (data.volumeBar) {
        const { source, size, plan } = data.volumeBar;
        if (typeof source !== "string" || !source.length || source.length > 80 ||
            size !== data.raw.size)
          throw Error("Invalid Interior lattice source");
        volumeBar = { source, size, cached: plan !== undefined };
        if (plan !== undefined)
          frame.volumeBarPlan = validateVolumeBarPlan(plan, volumeBar).field;
      }
      self.postMessage({ type: "ready" });
      return;
    }
    if (data.type !== "draw" || !frame)
      throw Error("Contact-sheet worker is not prepared");
    const style = styles.find((s) => s.id === data.id);
    if (!style) throw Error("Unknown treatment");
    const packet = recordDrawing(style.draw, frame, constants);
    const transfer = [
      packet.commands.buffer,
      ...packet.pixels.flatMap((p) =>
        p.mask ? [p.data.buffer, p.mask.buffer] : [p.data.buffer],
      ),
    ];
    const response = { type: "drawing", id: style.id, packet };
    if (style.id === "continuous-thread" && thread && frame.intensity > 0)
      response.threadPlan = compactThreadPlan(prepareContinuousThread(frame), thread);
    if (style.id === "thickness-exposure" && thickness && !thickness.cached && frame.intensity > 0) {
      response.thicknessPlan = compactThicknessPlan(prepareThicknessFrame(frame), thickness);
      transfer.push(response.thicknessPlan.total.buffer);
    }
    if (style.id === "copy-feedback" && copyFeedback && !copyFeedback.cached && frame.intensity > 0) {
      response.copyFeedbackPlan = compactCopyFeedbackPlan(prepareCopyFeedbackFrame(frame), copyFeedback);
      transfer.push(...response.copyFeedbackPlan.stages.map(stage => stage.buffer));
      transfer.push(response.copyFeedbackPlan.rngStates.buffer);
    }
    if (style.id === "section-ribs" && sectionRib && !sectionRib.cached) {
      response.sectionRibPlan = compactSectionRibPlan(prepareSectionRibFrame(frame), sectionRib);
      const { samples, groups, colors } = response.sectionRibPlan.field;
      transfer.push(samples.buffer, groups.buffer, colors.buffer);
    }
    if (style.id === "single-cutaway" && cutaway && !cutaway.cached) {
      response.cutawayPlan = compactCutawayPlan(prepareCutawayFrame(frame), cutaway);
      transfer.push(response.cutawayPlan.rgba.buffer);
    }
    if (style.id === "rank-streaks" && rankStreak && !rankStreak.cached &&
        rankCoverageFromSharedStrength(frame.intensity) > 0) {
      response.rankStreakPlan = compactRankStreakPlan(prepareRankStreakFrame(frame), rankStreak);
      const { original, sorted, spans } = response.rankStreakPlan;
      transfer.push(original.buffer, sorted.buffer, spans.buffer);
    }
    if (style.id === "pixel-clusters" && pixelCluster && !pixelCluster.cached) {
      response.pixelClusterPlan = compactPixelClusterPlan(preparePixelClusterFrame(frame), pixelCluster, frame.color);
      transfer.push(response.pixelClusterPlan.original.buffer, response.pixelClusterPlan.rgba120.buffer);
    }
    if (style.id === "directional-color" && directionalColor && !directionalColor.cached) {
      response.directionalColorPlan = compactDirectionalColorPlan(prepareDirectionalColorFrame(frame), directionalColor, frame.color);
      transfer.push(response.directionalColorPlan.sourceRGBA.buffer, response.directionalColorPlan.outputRGBA.buffer);
    }
    if (style.id === "interior-lattice" && volumeBar && !volumeBar.cached) {
      response.volumeBarPlan = compactVolumeBarPlan(prepareVolumeBarFrame(frame), volumeBar);
      const { samples, groups, colors } = response.volumeBarPlan.field;
      transfer.push(samples.buffer, groups.buffer, colors.buffer);
    }
    self.postMessage(response, transfer);
  } catch (error) {
    if (data?.type === "prepare") frame = null;
    console.error(error);
    self.postMessage({
      type: "error",
      id: data?.id || null,
      message: error?.message || String(error),
      name: error?.name || "Error",
      stack: typeof error?.stack === "string" ? error.stack : undefined,
      stage: data?.type === "prepare" ? "worker prepare" : "worker draw",
    });
  }
};
