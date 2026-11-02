import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Accumulator rack position indicator",
  summary: "A vertical rack, exposed pinion and travelling pointer show the rise of a hydraulic accumulator. Mechanical measurement made large enough to read across an engine room, with visible stops and linkage.",
  scales: ["room", "street", "tabletop"],
});
