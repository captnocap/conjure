import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Drinks fridge",
  summary: "A glass-door cooler full of bottles or cartons with a bright header and a compressor grille, for gas-station aisles, break rooms and small hours under fluorescent light.",
  scales: ["room", "street"],
});
