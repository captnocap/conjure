import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ten-pin rack',
  summary:
    'A triangle of ten white bowling pins with red neck stripes on a slab of maple lane, gutters either side and the sweep bar hanging above. Strikes and splits, league nights, birthday parties, luck, the last frame, things knocked down and set up again.',
  scales: ['room', 'tabletop', 'street'],
});
