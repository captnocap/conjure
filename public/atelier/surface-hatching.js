import { cleanFields } from "./clean-studies.js";

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// Original world paths are immutable; effective material visibility clips their
// projected intervals (including both surviving shell sides). Light and ink pressure
// only reveal portions of those paths; they never move the drawing on the mesh.
export function drawSurfaceHatching(p, f) {
  const field = f.prepare("clean-fields", () => cleanFields(f)),
    paths = f.surfaceHatches(),
    w = f.w,
    strength = clamp(f.intensity),
    paper = [243, 238, 221],
    ink = [29, 39, 33];
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4,
        id = field.ids[i],
        light = field.light[i],
        source = f.C(x, y),
        base = id > 1 ? f.B(x, y) : paper,
        body = id > 1 ? 0.76 + (0.24 * Math.floor(light * 2.999)) / 2 : 1,
        // Retain the captured studio bands on metals without baking them into
        // the hatch field or treating the physically based render as albedo.
        metal = id > 1 ? clamp(f.metalness(x, y)) * 0.26 : 0,
        shadow = id <= 1 ? clamp((0.9 - f.L(x, y)) * 0.42, 0, 0.15) : 0;
      for (let c = 0; c < 3; c++) {
        const pigment = (base[c] * 0.72 + paper[c] * 0.28) * body;
        p.pixels[at + c] =
          (pigment * (1 - metal) + source[c] * metal) * (1 - shadow);
      }
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
  p.noFill();
  p.stroke(...ink, 180 + 45 * strength);
  p.strokeWeight(0.55 + strength * 0.45);
  const points = paths.points,
    runs = paths.runs;
  for (let r = 0; r < runs.length; r += 4) {
    const start = runs[r],
      count = runs[r + 1],
      family = runs[r + 3],
      cutoff = family ? 0.1 + 0.47 * strength : 0.42 + 0.56 * strength;
    let drawing = false,
      previous = null;
    for (let j = 0; j < count; j++) {
      const at = (start + j) * 2,
        x = points[at],
        y = points[at + 1],
        i = clamp(Math.round(y), 0, w - 1) * w + clamp(Math.round(x), 0, w - 1),
        visibleInk = field.light[i] < cutoff;
      if (visibleInk) {
        if (!drawing) {
          p.beginShape();
          if (previous) p.vertex(...previous);
          drawing = true;
        }
        p.vertex(x, y);
      } else if (drawing) {
        p.vertex(x, y);
        p.endShape();
        drawing = false;
      }
      previous = [x, y];
    }
    if (drawing) p.endShape();
  }
  p.stroke(...ink, 235);
  p.strokeWeight(0.8);
  for (let i = 0; i < field.contours.length; i += 5)
    p.line(...field.contours.subarray(i, i + 4));
  p.strokeWeight(0.55);
  for (let i = 0; i < field.creases.length; i += 4)
    p.line(...field.creases.subarray(i, i + 4));
}
