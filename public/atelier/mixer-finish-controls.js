// One explicit image operation after the completed mix. None has no state field.
export function mountMixerFinish({ document, getMix, onChange }) {
  const select = document.getElementById("mix-finish"),
    range = document.getElementById("mix-finish-weight"),
    output = document.getElementById("mix-finish-value"),
    help = document.getElementById("mix-finish-help"),
    reference = document.getElementById("mix-ink-reference"),
    flutedReference = document.getElementById("mix-fluted-reference"),
    originalHelp = help?.textContent;
  function refresh() {
    const finish = getMix().finish;
    select.value = finish?.id || "none";
    range.disabled = !finish;
    range.value = finish?.weight ?? 100;
    output.textContent = finish ? `${finish.weight}%` : "Off";
    const ink = finish?.id === "ink-completed-mix";
    const fluted = finish?.id === "fluted-glass";
    if (help) help.textContent = fluted
      ? "Bends the completed mix through eight broad glass flutes in a fixed rectangular plate. Outside the plate stays clear. At 0% you see the mix; at 100% the full glass image. Transmitted image only; reflections are omitted. Randomize keeps this choice."
      : ink
      ? "Brightness-derived ink follows the completed mix after layer masks and blends, then multiplies into its colors. At 0% you see the mix; at 100% the full inked image. Fixed filtering; pale boundaries can disappear and close details can merge. Randomize keeps this choice."
      : originalHelp;
    if (reference) reference.hidden = !ink;
    if (flutedReference) flutedReference.hidden = !fluted;
  }
  select.addEventListener("change", () => {
    if (select.value === "none") delete getMix().finish;
    else if (["finite-lenses", "ink-completed-mix", "fluted-glass"].includes(select.value))
      getMix().finish = { id: select.value, weight: 100 };
    else { refresh(); return; }
    refresh();
    onChange();
  });
  range.addEventListener("input", () => {
    const finish = getMix().finish, weight = Number(range.value);
    if (!finish || !Number.isInteger(weight) || weight < 0 || weight > 100) return;
    finish.weight = weight;
    output.textContent = `${weight}%`;
    onChange();
  });
  refresh();
  return { refresh };
}
