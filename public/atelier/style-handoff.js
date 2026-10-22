import { styles } from "./styles.js";
import { createRecipe, parseRecipe } from "./recipe.js";
import { activeLayers, mixFilename, sceneReference } from "./mixer.js";
import { targetObjects } from "./object-targets.js";
import { materialDefinitions } from "./material-library.js";
import { inkEffectsFor } from "./ink-effects.js";

const siteUrl = "https://atelier-rendering-studies.trjk.chatgpt.site/";
const methodNames = { layers: "Ordered layers", average: "Weighted average", regions: "Regional collage" };
const methodGuides = {
  layers: "Start with the captured reference image. Composite the first row at the bottom, then each following row on top. Influence is opacity (weight / 100), multiplied by source alpha and its soft tone mask. Normal uses source RGB; Multiply uses backdrop × source; Screen uses 1 − (1 − backdrop) × (1 − source). Color uses W3C SetLum(source, Lum(backdrop)) with gamut compression, not HSL substitution. Blend in display RGB, then quantize the completed image to RGBA8.",
  average: "For each visible surface, normalize the weights of eligible active rows. Average their completed display-RGB images. Order and blend selections are ignored. Each row keeps its original relative weight when tone or source alpha fades it toward the reference; do not renormalize around that fading. A surface with no eligible rows shows the reference.",
  regions: "Use seeded spatial fields to assign soft regions to eligible completed images on each visible surface. Weight biases presence, not an exact area percentage. Order and blend selections are ignored. Opaque paper backgrounds participate. Tone masking fades a row toward the reference after its region share is chosen; it does not move regions. Preserve regional-mix.js for exact field generation and seed behavior.",
};
const finishNames = { "finite-lenses": "Finite lenses", "ink-completed-mix": "Ink completed mix", "fluted-glass": "Fluted glass" };
const finishGuides = {
  "finite-lenses": "Sample the completed image through the fixed four-sphere optical setup. Keep primary transmitted paths, black finite-print misses and dark rims; reflected paths are omitted.",
  "ink-completed-mix": "Extract coherent brightness-derived ink from the completed image, multiply it into that image, and quantize the full inked result before applying finish influence. Pale boundaries may disappear and nearby details may merge. This uses fixed finish settings, independent of the expressive-ink sliders.",
  "fluted-glass": "Bend the completed image through a finite glass plate with eight broad flutes. Use primary two-interface transmission with reflected paths omitted. Shapes can repeat or distort; this is a glass-over-print approximation.",
};

// The adapter deliberately uses the production worker route: some treatments
// require prepared geometry or simulation plans and cannot be called as filters.
const adapterCode = `import { createMixRenderer, compositeMixAsync } from "./dist/mixer.js";
import { createImageFinisher } from "./dist/image-finisher.js";
import { parseRecipe } from "./dist/recipe.js";
import { styles } from "./dist/styles.js";

// Browser ES module. painter is a ready p5 instance at pixelDensity(1).
// capture is the complete frame from createReference(...).render(recipe).
// For a new scene, implement the capture contract described in the brief.
export async function applyStyle(painter, capture, recipe, signal) {
  const settings = parseRecipe(JSON.stringify(recipe), styles.map(s => s.id));
  const renderer = createMixRenderer(painter);
  const images = await renderer.prepare({
    raw: capture, mix: settings.mix, seed: settings.seed,
    intensity: settings.intensity, ink: settings.ink, signal,
  });
  let pixels = await compositeMixAsync(capture.color, images, settings.mix, {
    size: capture.size, seed: settings.seed, identity: capture.identity, signal,
  });
  if (settings.mix.finish?.weight > 0) {
    const finisher = createImageFinisher();
    try {
      pixels = (await finisher.finish(pixels, settings.mix.finish, { signal })).pixels;
    } finally {
      await finisher.dispose();
    }
  }
  return pixels; // top-down opaque RGBA8; render at 720 × 720
}
`;

function layerGuide(layer, index, recipe) {
  const study = layer.id === sceneReference.id ? sceneReference : styles.find(s => s.id === layer.id);
  const targets = !Object.hasOwn(layer, "targets") ? "Whole scene (targets omitted)"
    : layer.targets.length ? layer.targets.map(id => `${id}: ${targetObjects.find(o => o.id === id).name}`).join(", ")
      : "Nothing selected (empty targets; contributes no pixels)";
  const active = activeLayers({ layers: [layer] }).length > 0;
  const effects = inkEffectsFor(layer.id);
  return [
    `### ${index + 1}. ${study.name} (${layer.id})`,
    `- State: ${active ? "active" : "inactive; saved for restoration"}; enabled: ${layer.enabled}; influence: ${layer.weight}${recipe.mix.mode === "regions" ? " (presence weight)" : "%"}.`,
    `- Blend: ${layer.blend}${recipe.mix.mode === "layers" ? "" : " (ignored by this method)"}.`,
    `- Apply to: ${targets}. Reference tones: ${layer.tone || "all"}.`,
    study.medium ? `- Medium: ${study.medium}.` : "",
    study.description || "The unmodified captured scene is this row's image.",
    `Mechanism: ${study.mechanism}`,
    study.control ? `Shared strength ${Math.round(recipe.intensity * 100)}% maps to “${study.control}”${study.renderIntensity ? `; renderer input ${study.renderIntensity(recipe.intensity)}` : ""}. ${/^Fixed/.test(study.control) ? "This treatment ignores adjustable strength; influence still controls composition." : "Influence changes the completed layer, while shared strength changes the drawing process."}` : "Shared treatment strength does not affect this source.",
    effects.length ? `Expressive ink controls used here: ${effects.map(key => `${key}=${recipe.ink[key]}`).join(", ")}.` : "",
    study.reference ? `Artistic/process reference: ${new URL(study.reference, siteUrl).href}` : "",
    study.draw ? `Actual registry drawing entry (an excerpt, not a standalone function; imports, helpers and preparation are in atelier-source.zip):\n\n\`\`\`js\n${study.draw.toString()}\n\`\`\`` : "",
  ].filter(Boolean).join("\n\n");
}

export function createStyleHandoff(state, { hasPreview = false } = {}) {
  // Reuse the recipe boundary so exports cannot invent a second state format.
  const settings = parseRecipe(JSON.stringify(createRecipe(state)), styles.map(s => s.id));
  const recipe = createRecipe(settings), active = activeLayers(recipe.mix);
  const title = active.length
    ? active.map(layer => layer.id === sceneReference.id ? sceneReference.name : styles.find(s => s.id === layer.id).name).join(" + ")
    : "Reference only";
  const finish = recipe.mix.finish;
  const materialGuide = targetObjects.filter(o => o.id >= 2).map(object => {
    const id = recipe.materials.assignments[object.id] || "original";
    const definition = materialDefinitions.find(item => item.id === id);
    return `- ${object.id}: ${object.name} → ${definition?.name || "Original scene material"} (${id})${definition ? ` — ${definition.description}; ${JSON.stringify(Object.fromEntries(Object.entries(definition).filter(([, value]) => typeof value === "number" || typeof value === "string")))}` : "; keep the object's base material from scene.js"}.`;
  }).join("\n");
  const brief = [
    `# Atelier style handoff: ${title}`,
    "## Request for the receiving agent",
    "Apply this rendering style to my project. Preserve the mechanisms, layer relationships, palette/mark character and final finish below, while adapting the subject and layout to my project. Treat the Quiet Garden as a calibration scene, not required subject matter. Ask for the target project/medium if I have not provided it. For an image-generation workflow, use the visual/process directions; for a code project, use the exact recipe and implementation. Explain any approximation required by the target engine.",
    `## Setup at export\n\nMethod: ${methodNames[recipe.mix.mode]}. ${active.length} active / ${recipe.mix.layers.length} saved layers. Shared treatment strength: ${Math.round(recipe.intensity * 100)}%. Seed: ${recipe.seed}. Finish: ${finish ? `${finishNames[finish.id]} at ${finish.weight}%` : "None"}.`,
    hasPreview
      ? "The complete kit includes preview.png (the finished mix) and reference.png (the matching captured scene). Use them together to separate the style from its subject. Images are separate attachments, not embedded in this text."
      : "No image was attached: this setup was exported before a matching render was ready. The settings and source still reproduce the setup; do not use a previous on-screen image as this recipe's reference.",
    "## Composition rules",
    methodGuides[recipe.mix.mode],
    "Every active row renders the same captured frame independently before composition. Disabled rows, zero weights, and empty target lists contribute nothing. With no active influence, start from the reference (a nonzero finish still applies). An omitted targets field means the whole scene, whereas [] means nothing. Object masks use original visible surface IDs, including front surfaces of transparent objects. Shadows belong to the surface receiving them. Masks can clip displaced strokes or glow at the original silhouette.",
    "Reference-tone masks measure brightness Y=(0.2126R+0.7152G+0.0722B)/255 in the original display-RGB capture. Let S(a,b,Y)=smoothstep(a,b,Y). Shadows=1−S(.25,.60,Y); midtones=S(.15,.40,Y)×(1−S(.60,.85,Y)); highlights=S(.55,.90,Y); all=1. These soft ranges overlap and multiply source alpha. See reference-tones.js for exact arithmetic.",
    finish ? `Finish: ${finishGuides[finish.id]} Apply after all layer blends and masks, then interpolate Normal display RGB between the unprocessed mix and finished image at ${finish.weight}%. Do not reapply object/tone masks after finishing. At 0% the finish is bypassed.` : "No final image finish is enabled.",
    "## Layer recipes (saved order, bottom to top for Ordered layers)",
    recipe.mix.layers.length ? recipe.mix.layers.map((layer, index) => layerGuide(layer, index, recipe)).join("\n\n") : "No saved layers. The original captured scene is the output before finishing.",
    "## Materials and scene context",
    `Material preset: ${recipe.materials.preset}. Material choices are applied before drawing any treatment. IDs are local to the Quiet Garden: remap them to analogous surfaces in a new project instead of reusing the numbers blindly. 0=backdrop, 1=floor; neither is a selectable material assignment.\n\n${materialGuide}`,
    `Camera orbit offset: ${recipe.orbit}° (base yaw 39°); light control: ${recipe.time}/100. These are scene controls, not animation time. Calibration: 720×720, pixel density 1, orthographic bounds ±4.1, camera at (sin(yaw)×12, 7.5, cos(yaw)×12) looking at (0,1.65,0). Light angle=(time/100−.25)×π. Full lighting, geometry and materials are in dist/scene.js. Lock flags and Compare/Single are UI state; their values are preserved in the recipe.`,
    "## Porting to another project",
    "1. Keep the selected treatment's mark-generation/optical process and the composition rules. Adapt scene content, object mapping and world-scale spacing deliberately. Material colors and shading affect the source image, so preserve their roles when matching the look.\n2. Capture synchronized color, normal, depth, identity, diffuse and albedo passes. The exact production capture contract is in dist/scene.js and dist/render-source.js; dist/styles.js makeFrame builds derived fields. Geometry-driven studies additionally need matching mesh triangles, surface samples, boundaries or prepared plans. A flat screenshot alone cannot reproduce those studies.\n3. Use the production createMixRenderer worker path shown below. Calling a registry draw entry alone can skip required preparation. Scene reference consumes the captured color pixels directly. Seed randomness consistently; do not replace it with fresh randomness each frame.\n4. Preserve 720×720 for an exact replay: several kernels and finishes are fixed to that size. For another resolution, explicitly adapt sampling, mark sizes and fixed-size contracts rather than merely stretching buffers.\n5. Compare your port against preview.png and the bundled local replay. Check silhouettes, paper/background participation, order, per-object masking, reference-tone fades and finish influence. Browser/GPU differences can slightly change rasterization.",
    "## Runnable JavaScript adapter",
    "This code is supplied as apply-style.mjs in the kit. It depends on the included runtime modules; it is not a dependency-free filter. Three.js 0.180.0 and p5.js 1.11.10 are vendored in the source archive. A browser with WebGL, ES modules and Workers is required.",
    `\`\`\`js\n${adapterCode}\`\`\``,
    "## Exact restorable recipe",
    "Save the following JSON as recipe.json. Atelier → Mixer → Open recipe restores all supported settings. The complete kit already includes this file.",
    `\`\`\`json\n${JSON.stringify(recipe, null, 2)}\n\`\`\``,
    "## Files and offline replay",
    "For exact implementation, attach the complete ZIP kit as well as this brief. Unzip the kit, then extract atelier-source.zip into that same folder (creating dist/, tests/ and the project files beside replay.html). Run `python3 -m http.server 4173 --bind 127.0.0.1` from that folder and open http://127.0.0.1:4173/replay.html. Runtime dependencies are bundled; no Atelier login or package install is needed. The replay embeds this exact recipe. Open dist/index.html through the same server for the full editor, then import recipe.json.",
    `Source site: ${siteUrl}\nFull project source: ${siteUrl}source.zip (the hosted site may require its owner's access; the downloaded kit is self-contained).\nImplementation map: dist/styles.js = treatment registry and drawing entries; dist/mixer.js = worker orchestration and composition; dist/regional-mix.js = seeded regions; dist/reference-tones.js and dist/object-targets.js = masks; dist/image-finisher.js and its workers = final finish; dist/material-library.js and dist/scene.js = source shading and capture. The source includes implementation notes and tests.`,
  ].join("\n\n") + "\n";
  return { title, brief, recipe, adapterCode, filename: mixFilename(settings) + "-style" };
}
