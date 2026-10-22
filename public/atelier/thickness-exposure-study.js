import { prepareThickness, filmThickness } from "./thickness-exposure.js";

export function prepareThicknessFrame(frame) {
  if (frame.thicknessPlan) return frame.thicknessPlan;
  if (typeof frame.prepare !== "function") throw Error("Thickness exposure needs the frame preparation cache");
  return frame.prepare("thickness-exposure", () => {
    const snapshot = frame.geometrySnapshot?.();
    if (!snapshot || snapshot.size !== frame.w)
      throw Error("Thickness exposure needs the original scene geometry");
    return prepareThickness(snapshot);
  });
}

export function drawThicknessExposure(p, frame) {
  const strength = frame.intensity;
  if (!Number.isFinite(strength) || strength < 0 || strength > 1)
    throw Error("Invalid thickness exposure strength");
  // No geometry solve is needed for the exactly black zero-exposure endpoint.
  const rgba = strength === 0
    ? filmThickness(null, frame.w, 0)
    : filmThickness(prepareThicknessFrame(frame).total, frame.w, 2 * strength);
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw Error("Thickness exposure requires pixel density 1");
  p.pixels.set(rgba);
  p.updatePixels();
}

export const thicknessExposureStudy = {
  id: "thickness-exposure", name: "Thickness exposure", family: "Light & waves",
  offThread: true, title: "The hidden overlap comes through.", control: "Exposure",
  medium: "Solid path lengths / open attenuating sheets", swatch: "#a9b3b5",
  category: "GEOMETRIC TRANSMISSION DRAWING",
  description: "Closed forms build brightness through their full depth. The open vase and stems remain faint skins, while overlapping solids accumulate into luminous masses.",
  mechanism: "All original-triangle inside intervals · bounded open-sheet crossings · four-sample transmission exposure. Uniform illustrative coefficients, independent overlapping bodies and a zero-attenuation floor; visible-light materials do not set density.",
  reference: "https://www.vam.ac.uk/blog/shop/what-lies-beneath-qa-with-x-ray-artist-nick-veasey",
  referenceLabel: "Nick Veasey / V&A radiographic photography",
  referencePage: "https://www.getty.edu/publications/bronze-guidelines/visual-atlas/394/",
  referencePageLabel: "Getty / transmission and hollow structure",
  draw: drawThicknessExposure,
};
