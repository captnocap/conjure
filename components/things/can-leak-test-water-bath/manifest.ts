import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Can leak-test water bath",
  summary: "Closed metal cans hang in individual cradles over an open water bath. A small pressure line, lifting crosshead, visible water level and optional bubbles distinguish immersion, lift-out and drainage while the tank and its plumbing remain physically supported.",
  scales: ["room", "tabletop", "macro"],
});
