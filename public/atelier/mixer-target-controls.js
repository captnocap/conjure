import { targetObjects, targetPresets } from "./object-targets.js";

// Object choices change composition only; they never modify a prepared study.
export function mountLayerTargets({ document, layer, name, onChange }) {
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };
  const root = make("div"), label = make("label", "Apply to"),
    select = make("select"), details = make("details"),
    summary = make("summary"), grid = make("div"), boxes = [];
  root.className = "mix-layer-targets";
  label.className = "mix-target-preset";
  select.setAttribute("aria-label", `${name} applies to`);
  for (const preset of targetPresets) {
    const option = make("option", preset.label);
    option.value = preset.value;
    select.append(option);
  }
  const custom = make("option", "Custom selection");
  custom.value = "custom";
  select.append(custom);
  label.append(select);
  details.className = "mix-target-details";
  grid.className = "mix-target-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", `${name} visible surfaces`);
  const hasTargets = () => Object.hasOwn(layer, "targets");
  const same = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);
  function sync() {
    const ids = hasTargets() ? layer.targets : targetObjects.map(object => object.id),
      preset = !hasTargets() ? targetPresets[0] :
        targetPresets.find(item => item.targets && same(item.targets, ids));
    select.value = preset?.value || "custom";
    summary.textContent = `Individual surfaces · ${!hasTargets() ? "all" : ids.length + " selected"}`;
    root.dataset.scope = !hasTargets() ? "all" : ids.join(",");
    for (const { input, id } of boxes) input.checked = ids.includes(id);
  }
  for (const object of targetObjects) {
    const item = make("label"), input = make("input");
    input.type = "checkbox";
    input.value = String(object.id);
    input.setAttribute("aria-label", `${name} on ${object.name}`);
    input.addEventListener("change", () => {
      const selected = new Set(hasTargets() ? layer.targets : targetObjects.map(item => item.id));
      if (input.checked) selected.add(object.id);
      else selected.delete(object.id);
      layer.targets = [...selected].sort((a, b) => a - b);
      sync();
      onChange();
    });
    item.append(input, make("span", object.name));
    grid.append(item);
    boxes.push({ input, id: object.id });
  }
  select.addEventListener("change", () => {
    if (select.value === "custom") {
      details.open = true;
      return;
    }
    const preset = targetPresets.find(item => item.value === select.value);
    if (!preset) return;
    if (preset.targets) layer.targets = [...preset.targets];
    else delete layer.targets;
    sync();
    onChange();
  });
  details.append(summary, grid);
  root.append(label, details);
  sync();
  const setDisabled = disabled => {
    select.disabled = disabled;
    for (const { input } of boxes) input.disabled = disabled;
  };
  setDisabled(!layer.enabled);
  return { element: root, setDisabled };
}
