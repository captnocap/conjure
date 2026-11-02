import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Meter tester setting a diverter and reading the level",
  summary: "A meter tester works at a compact proving vessel and swinging outlet, setting the flow, reading a level pointer or timing a collection. Supported apparatus and measured hand targets connect the person to an actual visible test state.",
  scales: ["room", "tabletop", "street"],
});
