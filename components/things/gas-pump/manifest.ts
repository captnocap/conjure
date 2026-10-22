import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Gas pump",
  summary: "A roadside fuel dispenser with a display, nozzle and looping hose, for long drives, last stops, fossil-age nostalgia and decisions made far from home.",
  scales: ["street", "room"],
});
