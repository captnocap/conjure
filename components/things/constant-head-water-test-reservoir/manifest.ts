import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Constant-head water-test reservoir",
  summary: "An elevated open header tank feeds a test main from a steady water level. Its true overflow standpipe, separate delivery valve, float linkage and supporting tower make the hydraulic supply path visible.",
  scales: ["room", "tabletop", "street"],
});
