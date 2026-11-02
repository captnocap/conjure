import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Prism angle-checking goniometer",
  summary: "A bench goniometer holds an optical prism between a fixed collimator and a moving sighting telescope. Separate prism and telescope rotations, divided circles, tiny adjustment screws and calibration states make precise face-angle inspection visible.",
  scales: ["tabletop", "room", "macro"],
});
