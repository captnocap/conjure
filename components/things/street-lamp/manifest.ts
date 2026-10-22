import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Street lamp",
  summary: "A tall streetlight with a bent arm, glass lantern or paired globes, a marker of public space for pools of light, quiet walks and the edges of the night.",
  scales: ["street", "room"],
});
