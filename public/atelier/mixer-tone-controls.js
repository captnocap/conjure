// Tone edits change composition only; completed study images stay cached.
export function mountLayerTone({ document, layer, name, onChange }) {
  const root = document.createElement("label"), select = document.createElement("select");
  root.className = "mix-layer-tone";
  root.textContent = "Reference tones";
  root.title = "Soft brightness ranges from the 3D reference, including material colors. Ranges overlap.";
  select.setAttribute("aria-label", `${name} reference tones`);
  const choices = [
    ["all", "All tones"], ["shadows", "Dark tones"],
    ["midtones", "Middle tones"], ["highlights", "Bright tones"],
  ];
  for (const [value, label] of choices) {
    const option = document.createElement("option");
    option.value = value; option.textContent = label; select.append(option);
  }
  select.value = layer.tone || "all";
  select.addEventListener("change", () => {
    if (!choices.some(([value]) => value === select.value)) return;
    if (select.value === "all") delete layer.tone;
    else layer.tone = select.value;
    onChange();
  });
  root.append(select);
  const setDisabled = value => { select.disabled = value; };
  setDisabled(!layer.enabled);
  return { element: root, setDisabled };
}
