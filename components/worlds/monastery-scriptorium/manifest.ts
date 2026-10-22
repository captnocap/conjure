import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Monastery scriptorium',
  summary:
    'A stone writing room in a monastery: a row of tall north windows, sloped desks along the wall and cold slanting light across the flags, seen from the aisle. An industrious morning of copyists, a single candle at a night vigil, or a looted room of torn leaves. Patience, silence, devotion, knowledge kept alive by hand.',
  scales: ['room', 'tabletop'],
});
