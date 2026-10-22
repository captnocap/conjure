import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Clothes drying rack',
  summary:
    'A folding wire clothes airer hung with socks, a work shirt and a single towel, dripping onto the floor or stiff and bone dry; it might carry a uniform, baby clothes or one dress. No tumble dryer, small rented rooms, damp winters, single parents, domestic persistence, the washing that is never finished.',
  scales: ['room', 'tabletop', 'street'],
});
