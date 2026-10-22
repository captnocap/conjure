import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stone snow lantern',
  summary:
    'A squat Japanese granite garden lantern with a broad cap heaped with snow and a candle glowing in its little window. Gardens at dusk, a small light kept through winter, patience, old stone, someone who came out in the cold just to light it.',
  scales: ['room', 'street', 'tabletop'],
});
