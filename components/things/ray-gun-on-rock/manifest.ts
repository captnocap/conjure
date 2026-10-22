import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ray gun on a rock',
  summary:
    'A finned, ringed pulp raygun with a glowing coil, left lying on a flat stone. A dropped weapon tells a story: a duel just ended, an owner vanished or disintegrated, a temptation waiting to be picked up; space opera, tin toys, cheerful menace.',
  scales: ['tabletop', 'room', 'street', 'planetary', 'landscape'],
});
