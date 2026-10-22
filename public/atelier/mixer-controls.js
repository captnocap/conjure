import { mountMixerFinish } from "./mixer-finish-controls.js";
import { mountLayerTone } from "./mixer-tone-controls.js";
import { mixLimit, favoriteMix, activeLayers, sceneReference } from "./mixer.js";
import { mountLayerTargets } from "./mixer-target-controls.js";
import { objectExampleMix } from "./object-mix-example.js";
export function mountMixer({ document, styles, getMix, onChange }) {
  // The reference is a mixer source; study numbering and defaults stay separate.
  const sources = [...styles, sceneReference];
  const $ = (id) => document.getElementById(id),
    make = (tag, text) => {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      return node;
    };
  const finishControls = mountMixerFinish({ document, getMix, onChange });
  const numbered = (style) => style.id === sceneReference.id
    ? style.name
    : `${String(styles.indexOf(style) + 1).padStart(2, "0")} / ${style.name}`;
  function refresh(focusTarget) {
    finishControls.refresh();
    let restoreFocus, fallbackFocus;
    const mix = getMix(),
      average = mix.mode === "average",
      regions = mix.mode === "regions",
      unordered = average || regions;
    $("mix-method").value = mix.mode;
    $("mix-explanation").textContent = average
      ? "Normalized RGB average among the layers selected for each surface. Influence is relative; order does not matter. Uncovered surfaces return the reference."
      : regions
        ? "Seeded regions favor eligible images on each surface. Influence steers their presence; opaque backgrounds participate. Uncovered surfaces return the reference."
        : "Bottom to top, over the reference. Influence is opacity on each selected surface. Each blend combines the image below with the next layer.";
    $("mix-layers").replaceChildren();
    mix.layers.forEach((layer, index) => {
      const style = sources.find((s) => s.id === layer.id),
        row = make("div");
      row.className = "mix-layer";
      const header = make("div");
      header.className = "mix-layer-heading";
      const enabled = make("input");
      enabled.type = "checkbox";
      enabled.checked = layer.enabled;
      enabled.setAttribute("aria-label", `Enable ${style.name}`);
      if (focusTarget?.id === layer.id) fallbackFocus = enabled;
      enabled.addEventListener("change", () => {
        layer.enabled = enabled.checked;
        range.disabled = !layer.enabled;
        blend.disabled = unordered || !layer.enabled;
        targets.setDisabled(!layer.enabled);
        tone.setDisabled(!layer.enabled);
        row.dataset.enabled = String(layer.enabled);
        updateSummary();
        onChange();
      });
      const label = make("label");
      label.append(enabled, make("span", numbered(style)));
      header.append(label);
      if (style.reference) {
        const reference = make("a", "Reference ↗");
        reference.href = style.reference;
        reference.target = "_blank";
        reference.rel = "noopener noreferrer";
        reference.setAttribute("aria-label", `${style.name} artistic reference`);
        header.append(reference);
      }
      const actions = make("div");
      actions.className = "mix-layer-actions";
      for (const [text, delta] of [
        ["↑", -1],
        ["↓", 1],
      ]) {
        const button = make("button", text);
        button.type = "button";
        button.disabled =
          unordered || index + delta < 0 || index + delta >= mix.layers.length;
        button.setAttribute(
          "aria-label",
          `Move ${style.name} ${delta < 0 ? "toward bottom" : "toward top"}`,
        );
        button.addEventListener("click", () => {
          [mix.layers[index], mix.layers[index + delta]] = [
            mix.layers[index + delta],
            mix.layers[index],
          ];
          refresh({ id: layer.id, move: delta });
          onChange();
        });
        if (focusTarget?.id === layer.id && focusTarget.move === delta)
          restoreFocus = button;
        actions.append(button);
      }
      const remove = make("button", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${style.name}`);
      remove.addEventListener("click", () => {
        mix.layers.splice(index, 1);
        refresh();
        $("mix-add-style").focus?.();
        onChange();
      });
      actions.append(remove);
      header.append(actions);
      const control = make("div");
      control.className = "mix-layer-control";
      const rangeLabel = make("label", "Influence"),
        range = make("input"),
        output = make("output");
      range.type = "range";
      range.min = "0";
      range.max = "100";
      range.step = "1";
      range.value = layer.weight;
      range.disabled = !layer.enabled;
      range.setAttribute("aria-label", `${style.name} influence`);
      const showWeight = () => {
        output.textContent = regions ? String(layer.weight) : `${layer.weight}%`;
      };
      showWeight();
      range.addEventListener("input", () => {
        layer.weight = Number(range.value);
        showWeight();
        updateSummary();
        onChange();
      });
      rangeLabel.append(range, output);
      control.append(rangeLabel);
      const blendLabel = make("label", "Blend"),
        blend = make("select");
      for (const name of ["normal", "multiply", "screen", "color"]) {
        const option = make("option", name[0].toUpperCase() + name.slice(1));
        option.value = name;
        blend.append(option);
      }
      blend.value = layer.blend;
      blend.disabled = unordered || !layer.enabled;
      blend.setAttribute("aria-label", `${style.name} blend`);
      const blendHelp = make("p", "Color keeps the lower image’s brightness and takes this layer’s color.");
      blendHelp.className = "mix-note";
      blendHelp.id = `mix-blend-help-${layer.id}`;
      let described = false;
      const showBlendHelp = () => {
        blendHelp.hidden = unordered || layer.blend !== "color";
        if (!blendHelp.hidden) blend.setAttribute("aria-describedby", blendHelp.id);
        else if (described) blend.removeAttribute("aria-describedby");
        described = !blendHelp.hidden;
      };
      showBlendHelp();
      blend.addEventListener("change", () => {
        layer.blend = blend.value;
        showBlendHelp();
        onChange();
      });
      blendLabel.append(blend);
      control.append(blendLabel);
      const targets = mountLayerTargets({ document, layer, name: style.name, onChange: () => {
        updateSummary();
        onChange();
      } });
      const tone = mountLayerTone({ document, layer, name: style.name, onChange });
      row.append(header, control, blendHelp, targets.element, tone.element);
      row.title = style.mechanism;
      row.dataset.enabled = String(layer.enabled);
      $("mix-layers").append(row);
    });
    $("mix-add-style").replaceChildren();
    const available = sources.filter(
      (s) => !mix.layers.some((l) => l.id === s.id),
    );
    for (const style of available) {
      const option = make("option", numbered(style));
      option.value = style.id;
      $("mix-add-style").append(option);
    }
    if (available.length) $("mix-add-style").value = available[0].id;
    $("mix-add").disabled = mix.layers.length >= mixLimit || !available.length;
    $("mix-add-style").disabled = $("mix-add").disabled;
    updateSummary();
    (restoreFocus && !restoreFocus.disabled ? restoreFocus : fallbackFocus)?.focus?.();
  }
  function updateSummary() {
    const mix = getMix(),
      enabled = activeLayers(mix),
      total = enabled.reduce((n, l) => n + l.weight, 0);
    $("mix-summary").textContent = !enabled.length
      ? "Reference only · no active influence"
      : mix.mode === "average"
        ? `${enabled.length} active · total weight ${total} · normalized on each surface`
        : mix.mode === "regions"
          ? `${enabled.length} active · regions follow the shared seed`
          : `${enabled.length} active · first row is bottom, last row is top`;
  }
  $("mix-method").addEventListener("change", () => {
    getMix().mode = $("mix-method").value;
    refresh();
    onChange();
  });
  $("mix-add").addEventListener("click", () => {
    const mix = getMix(),
      id = $("mix-add-style").value;
    if (
      mix.layers.length >= mixLimit ||
      !sources.some((s) => s.id === id) ||
      mix.layers.some((l) => l.id === id)
    )
      return;
    mix.layers.push({ id, enabled: true, weight: 30, blend: "normal" });
    refresh();
    onChange();
  });
  $("mix-favorites").addEventListener("click", () => {
    delete getMix().finish;
    Object.assign(getMix(), favoriteMix());
    refresh();
    onChange();
  });
  $("mix-object-example").addEventListener("click", () => {
    delete getMix().finish;
    Object.assign(getMix(), objectExampleMix());
    refresh();
    onChange();
  });
  refresh();
  return { refresh };
}
