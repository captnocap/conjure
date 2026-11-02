import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Shogi match clock and record",
  summary: "A paired mechanical match clock sits beside a ruled game record and pencil. Two independently set dials, raised push buttons and small time flags give a club shogi game its measured pace, with pause, reset and late-game states visible on the clock face.",
  scales: ["room", "tabletop", "street"],
});
