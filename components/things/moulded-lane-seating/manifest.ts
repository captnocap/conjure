import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Moulded lane seating',
  summary:
    'A curved bank of bolted fibreglass bucket seats around a small score table with a pitcher, plastic cups and a pencil on a string. Bowling alleys, bus stations, laundromats and waiting rooms; league nights, birthday parties, whoever just got up and left, waiting your turn.',
  scales: ['room', 'street', 'tabletop'],
});
