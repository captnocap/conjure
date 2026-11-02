import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Gas-bell pressure water-column gauge",
  summary: "A transparent U-tube shows the difference between gas pressure and the reference leg. Distinct fluid levels, a continuous lower bend, supported scale board and connected pressure taps expose how the reading is made.",
  scales: ["room", "tabletop", "street"],
});
