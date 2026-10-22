import { prepareSortedSpanCoverage } from "./rank-streaks.js";
import { copyRankStreakSource, rankCoverageFromSharedStrength } from "./rank-streak-plan.js";

export function prepareRankStreakFrame(frame) {
  if (frame.rankStreakPlan) return frame.rankStreakPlan;
  if (typeof frame.prepare !== "function")
    throw Error("Pixel sorting needs the frame preparation cache");
  return frame.prepare("rank-streaks", () =>
    prepareSortedSpanCoverage(frame.color, frame.w, frame.w));
}

export function drawRankStreaks(p, frame) {
  const percent = rankCoverageFromSharedStrength(frame.intensity);
  const rgba = percent === 0 ? copyRankStreakSource(frame.color, frame.w, frame.w)
    : prepareRankStreakFrame(frame).renderPercent(percent);
  p.loadPixels();
  if (p.pixels.length !== rgba.length)
    throw Error("Pixel sorting requires pixel density 1");
  p.pixels.set(rgba);
  p.updatePixels();
}

export const rankStreakStudy = {
  id: "rank-streaks", name: "Pixel sorting", family: "Cut & assembly",
  offThread: true, title: "The image reorders itself.",
  control: "Sorted-span coverage",
  formatStrength: value => `${rankCoverageFromSharedStrength(value)}% spans`,
  medium: "Original color records / ordered spans", swatch: "#aea78d",
  category: "PIXEL ORDERING",
  description: "Captured colors line up into crisp horizontal fragments. Coverage fully sorts a growing set of brightness-defined spans, beginning with those most out of order. Hard ends and shifted shading are part of the image.",
  mechanism: "Source-brightness intervals · fixed 72-pixel cap · stable color-record permutation · whole-span activation by normalized disorder. Coverage counts sortable spans, not image area. Shared strength 15/60/95% maps to coverage 0/60/100%. The scene geometry and original mixer masks stay fixed while depicted colors can cross object boundaries.",
  reference: "https://github.com/kimasendorf/ASDFPixelSort",
  referenceLabel: "Kim Asendorf / pixel-sorting examples",
  draw: drawRankStreaks,
};
