import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Shipping container",
  summary: "A corrugated freight box with locking rods, corner castings and stencilled numbers, for ports, displacement, temporary architecture and unknown cargo.",
  scales: ["street", "landscape"],
});
