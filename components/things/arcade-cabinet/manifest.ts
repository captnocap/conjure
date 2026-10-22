import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Arcade cabinet",
  summary: "A coin-operated game cabinet with a glowing screen, controls and side art, for youth, escape, competition and the last machine still lit after closing.",
  scales: ["room", "street"],
});
