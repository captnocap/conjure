import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Chestnut vendor’s balance scale",
  summary: "A small beam balance weighs chestnuts in two suspended metal pans. Its central pivot, hanging chains and separate weights give a street stall a clear moment of measuring out a warm portion.",
  scales: ["room", "street", "tabletop"],
});
