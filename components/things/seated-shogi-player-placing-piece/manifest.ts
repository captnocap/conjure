import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Seated shogi player placing a piece",
  summary: "A seated or kneeling shogi player studies a nine-by-nine board and places a pentagonal piece with one hand. The board stays at a reachable working height, with captured pieces, a small record and deliberately different pauses giving the quiet game a human centre.",
  scales: ["room", "street", "tabletop"],
});
