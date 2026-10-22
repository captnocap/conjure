import { createStyleHandoff } from "./style-handoff.js";
import { createStyleKit } from "./style-kit.js";
import { downloadSheet } from "./contact-sheet.js";

export function openStyleHandoff({ recipe, preview, reference }) {
  const $ = id => document.getElementById(id);
  const dialog = $("style-handoff-dialog"), controller = new AbortController();
  let images = null;
  if (preview && reference) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = reference.size;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(reference.pixels), reference.size, reference.size), 0, 0);
    images = { preview, reference: canvas.toDataURL("image/png") };
  }
  const handoff = createStyleHandoff(recipe, { hasPreview: Boolean(images) });
  $("style-handoff-text").value = handoff.brief;
  $("style-handoff-summary").textContent = handoff.title;
  $("style-handoff-images").hidden = !images;
  for (const kind of ["preview", "reference"]) {
    if (images) $("style-handoff-" + kind).src = images[kind];
    else $("style-handoff-" + kind).removeAttribute("src");
  }
  $("style-handoff-image-note").textContent = images
    ? "The kit includes these two images, captured with this setup."
    : "Settings captured. No PNGs will be included because the matching render is not ready. Close and reopen after rendering to include images.";
  $("style-handoff-status").textContent = "";
  $("style-handoff-kit").disabled = false;
  $("style-handoff-copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(handoff.brief);
      if (!controller.signal.aborted) $("style-handoff-status").textContent = "Brief copied. Paste it into any AI chat with your project request.";
    } catch {
      if (controller.signal.aborted) return;
      $("style-handoff-text").focus();
      $("style-handoff-text").select();
      $("style-handoff-status").textContent = "Clipboard unavailable. The brief is selected; copy it manually or download it.";
    }
  };
  $("style-handoff-download").onclick = () => {
    downloadSheet(new Blob([handoff.brief], { type: "text/markdown;charset=utf-8" }), handoff.filename + ".md");
    $("style-handoff-status").textContent = "Style brief downloaded.";
  };
  $("style-handoff-kit").onclick = async () => {
    $("style-handoff-kit").disabled = true;
    $("style-handoff-status").textContent = "Preparing kit with the complete project source…";
    try {
      const options = { signal: controller.signal, cache: "no-store" };
      const manifestResponse = await fetch(new URL("./handoff-source.json", import.meta.url), options);
      if (!manifestResponse.ok) throw Error("Could not read the source manifest. Try again.");
      const manifest = await manifestResponse.json();
      const sourceResponse = await fetch(new URL("./source.zip", import.meta.url), options);
      if (!sourceResponse.ok) throw Error("Could not download the project source. Try again.");
      const source = new Uint8Array(await sourceResponse.arrayBuffer());
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", source));
      const hash = Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== manifest.sha256) throw Error("The source changed during download. Close this export, reload Atelier and try again.");
      if (controller.signal.aborted) return;
      downloadSheet(createStyleKit(handoff, source, images), handoff.filename + ".zip");
      $("style-handoff-status").textContent = "Complete kit downloaded. Attach the ZIP to any AI chat, or start with style-brief.md inside.";
    } catch (error) {
      if (!controller.signal.aborted)
        $("style-handoff-status").textContent = "Kit not downloaded. " + error.message + " You can still copy or download the brief.";
    } finally {
      if (!controller.signal.aborted) $("style-handoff-kit").disabled = false;
    }
  };
  dialog.addEventListener("close", () => controller.abort(), { once: true });
  dialog.showModal();
}
