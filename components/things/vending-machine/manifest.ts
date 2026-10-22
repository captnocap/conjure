import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Vending machine",
  summary: "An unattended cabinet of little purchases with rows of products, buttons and a collection hatch, for late nights, automation, hunger and an oddly impersonal kind of comfort.",
  scales: ["room", "street"],
});
