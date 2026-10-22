import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Flower bucket',
  summary: 'A florist bucket full of flowers, stems and paper-wrapped bouquets, small celebrations, apologies, arrivals and colour carried through the city.',
  scales: ['tabletop', 'street', 'room'],
});
