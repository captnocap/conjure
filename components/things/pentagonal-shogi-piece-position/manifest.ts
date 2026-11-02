import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Pentagonal shogi piece position",
  summary: "A small arrangement of wedge-shaped shogi pieces shows a king, pawns, generals and promoted pieces pointing toward their opponents. Visible calligraphic stroke marks, captured stacks and study groupings evoke deliberate analysis without needing an entire game board.",
  scales: ["room", "tabletop", "street"],
});
