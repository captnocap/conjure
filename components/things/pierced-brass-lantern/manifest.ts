import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pierced brass lantern',
  summary:
    'A single hanging lantern of pierced brass that throws star-shaped light, on a chain from a tall pole or wall bracket, or set down on a table. Night arrivals, hospitality, a light left burning for latecomers, bazaars after dark, Ramadan evenings, a cold lamp at dawn.',
  scales: ['room', 'street', 'tabletop'],
});
