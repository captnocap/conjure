import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Star Ferry',
  summary:
    'The green-and-white double-ended Hong Kong harbour ferry, about 40 m: a low two-deck hull, a single funnel, wheelhouses at both ends and slatted benches on the open upper deck. Commutes across Victoria Harbour, first dates, the last boat home, rain on the canvas, a city of crossings and goodbyes.',
  scales: ['street', 'landscape'],
});
