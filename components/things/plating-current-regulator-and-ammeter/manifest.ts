import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Plating current regulator and ammeter",
  summary: "An analogue plating-current panel combines a moving contact regulator, heavy terminals and a large ammeter. Visible resistance banks, open switches and alternate fuse fittings distinguish control, isolation and maintenance states of a workshop electrical supply.",
  scales: ["room", "tabletop", "macro"],
});
