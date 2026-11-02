import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Cutaway positive-displacement water meter",
  summary: "An open water-meter chamber shows either a nutating disc or an oscillating annular piston. A fixed partition, supported drive pin and removable register expose the measuring mechanism and the inlet-to-outlet path.",
  scales: ["room", "tabletop", "street"],
});
