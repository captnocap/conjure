import { prepareCopyHistory, renderCopyHistory, initialCopyRGBA,
  generationForStrength } from "./copy-feedback.js";

export function prepareCopyFeedbackFrame(frame) {
  if (frame.copyFeedbackPlan) return frame.copyFeedbackPlan;
  if (typeof frame.prepare !== "function")
    throw Error("Repeated-copy feedback needs the frame preparation cache");
  return frame.prepare("copy-feedback", () =>
    prepareCopyHistory(frame.color, frame.w, frame.w, frame.seed));
}

export function drawCopyFeedback(p, frame) {
  const generation = generationForStrength(frame.intensity);
  const rgba = generation === 0
    ? initialCopyRGBA(frame.color, frame.w, frame.w, frame.seed)
    : renderCopyHistory(prepareCopyFeedbackFrame(frame), frame.intensity);
  p.loadPixels();
  if (p.pixels.length !== rgba.length)
    throw Error("Repeated-copy feedback requires pixel density 1");
  p.pixels.set(rgba);
  p.updatePixels();
}

export const copyFeedbackStudy = {
  id: "copy-feedback", name: "Repeated-copy feedback", family: "Print & transfer",
  offThread: true, title: "The copy becomes the original.", control: "Copy generation",
  formatStrength: value => `${generationForStrength(value)} / 12`,
  renderIntensity: value => generationForStrength(value) / 12,
  medium: "Retained images / successive copy breakup", swatch: "#454746",
  category: "REPEATED-IMAGE FEEDBACK",
  description: "Each copy feeds the next. Solid shading breaks into coarse contours, short bands and specks; the generation control replays the original and twelve retained copies of the same scene.",
  mechanism: "Previous-image-only scan, local development and transfer · fixed machine error / seeded paper error · retained generations 0–12. Aligned digital feedback, not a calibrated photocopier; late copies intentionally amplify background speckle.",
  reference: "https://www.mca.com.au/collection/artworks/1997.74B/",
  referenceLabel: "Ian Burn / Systematically altered photographs",
  referencePage: "https://www.centrepompidou.fr/en/ressources/oeuvre/c5nR4qo",
  referencePageLabel: "Timm Ulrichs / successive photocopies",
  draw: drawCopyFeedback,
};
