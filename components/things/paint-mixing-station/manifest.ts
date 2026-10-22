import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Paint mixing station',
  summary:
    'A hardware-store paint counter: a clamping paint shaker, a carousel of tint canisters, a rack of colour chips and stacked cans with a dab of colour on each lid. Fresh starts, nurseries and first homes, arguing over off-whites, weekend projects, the wrong shade taken back.',
  scales: ['room', 'street'],
});
