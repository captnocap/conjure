import { zipSync, strToU8 } from "./vendor/fflate.js";

function replayPage(recipe) {
  const embeddedRecipe = JSON.stringify(recipe).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atelier — exported style replay</title>
<style>body{margin:32px;background:#edf0e5;color:#20362c;font:16px system-ui}main{display:flex;flex-wrap:wrap;gap:24px}canvas{max-width:100%;height:auto!important}section{max-width:720px}a{color:inherit}pre{white-space:pre-wrap}h1{font:36px Georgia}</style>
<h1>Exported style replay</h1><p id="status" role="status">Preparing this recipe…</p>
<p><a href="style-brief.md">Read style brief</a> · <a href="recipe.json">Exact recipe</a> · <a href="dist/index.html">Open full editor</a></p>
<main><section><h2>Reference</h2><div id="reference"></div></section><section><h2>Style</h2><div id="result"></div></section></main>
<script src="dist/vendor/p5.min.js"></script>
<script type="module">
const status = document.getElementById("status");
try {
  const { createReference } = await import("./dist/scene.js");
  const { applyStyle } = await import("./apply-style.mjs");
  const recipe = ${embeddedRecipe};
  const scene = createReference(document.getElementById("reference"));
  const capture = scene.render(recipe);
  new p5(p => {
    p.setup = () => {
      p.pixelDensity(1); p.createCanvas(720, 720).parent("result"); p.noLoop();
      applyStyle(p, capture, recipe).then(pixels => {
        p.loadPixels(); p.pixels.set(pixels); p.updatePixels();
        status.textContent = "Recipe rendered. Compare with preview.png when included.";
      }).catch(error => { status.textContent = "Render failed: " + error.message; });
    };
  });
} catch (error) {
  status.textContent = "Could not load the runtime. Extract atelier-source.zip here, serve this folder over HTTP, then reload. " + error.message;
}
</script></html>`;
}

function pngBytes(dataUrl) {
  if (!dataUrl.startsWith("data:image/png;base64,")) throw Error("Expected a PNG snapshot");
  return Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), character => character.charCodeAt(0));
}

export function createStyleKit(handoff, sourceArchive, images) {
  if (!(sourceArchive instanceof Uint8Array) || sourceArchive[0] !== 0x50 || sourceArchive[1] !== 0x4b)
    throw Error("The project source download was not a ZIP. Try again.");
  const files = {
    "style-brief.md": strToU8(handoff.brief),
    "recipe.json": strToU8(JSON.stringify(handoff.recipe, null, 2) + "\n"),
    "apply-style.mjs": strToU8(handoff.adapterCode),
    "replay.html": strToU8(replayPage(handoff.recipe)),
    "atelier-source.zip": [sourceArchive, { level: 0 }],
    "README.txt": strToU8("ATELIER STYLE KIT\n\nStart with style-brief.md. Paste it into any AI chat, or attach this ZIP.\nThe brief includes process guidance, actual drawing entries, an integration example and the exact recipe.\n\nFor local replay:\n1. Extract this kit.\n2. Extract atelier-source.zip into this same folder, creating dist/ beside replay.html.\n3. Run: python3 -m http.server 4173 --bind 127.0.0.1\n4. Open http://127.0.0.1:4173/replay.html\n\nNo hosted access or package install is needed. Runtime libraries are vendored.\nUse Mixer > Open recipe in the full editor to restore recipe.json.\n\n" + (images ? "preview.png and reference.png match the settings captured when export opened.\n" : "No PNGs are included because a matching render was not ready when export opened.\n")),
  };
  if (images) {
    files["preview.png"] = [pngBytes(images.preview), { level: 0 }];
    files["reference.png"] = [pngBytes(images.reference), { level: 0 }];
  }
  return new Blob([zipSync(files, { level: 6 })], { type: "application/zip" });
}
