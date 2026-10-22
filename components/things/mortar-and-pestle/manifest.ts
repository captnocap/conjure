import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mortar and pestle',
  summary:
    'A heavy stone, porcelain or brass mortar with its pestle and a heap of something half ground: herbs, pigment, spice, crystals or pills, with a dusting spilled around it. Apothecaries and kitchens, medicine and poison, paint-making, patient handwork, old knowledge passed down.',
  scales: ['tabletop', 'macro', 'room'],
});
