import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Market shelf",
  summary: "A stocked convenience-store gondola of snacks, cereal, tins, bottles or odd little necessities, for abundance, night shifts, road trips and the comfort of ordinary choices.",
  scales: ["room", "street"],
});
