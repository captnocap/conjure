import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Bocce score ladder",
  summary: "A freestanding court scoreboard with sliding markers, chalk numbers and team names. Summer games, friendly disputes about the score, community leagues and a match that lasts all afternoon.",
  scales: ["room", "street", "tabletop"],
});
