import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Three wise monkeys',
  summary:
    'A carved trio of monkeys covering eyes, ears and mouth, in the Nikko shrine tradition: see no evil, hear no evil, speak no evil. Discretion and complicity, looking away, office secrets, shrine carvings and cheap tourist kitsch on a mantelpiece.',
  scales: ['tabletop', 'room', 'street', 'macro'],
});
