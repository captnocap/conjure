import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rolling stock ladder',
  summary:
    'A tall wooden ladder hooked onto a rail, rolling along a slice of floor-to-ceiling drawers and shelves. Old hardware stores, libraries, archives and apothecaries; reaching for the thing on the top shelf, quiet expertise, knowing exactly which drawer.',
  scales: ['room', 'street'],
});
