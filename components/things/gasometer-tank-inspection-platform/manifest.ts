import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Gasometer tank inspection platform",
  summary: "A curved service deck follows a gas-holder sealing tank. Open inspection hatches, connected stairs and supported guardrails expose the tank edge while the curved landing remains grounded on its posts.",
  scales: ["room", "tabletop", "street"],
});
