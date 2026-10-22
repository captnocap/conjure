import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Salt brick hut',
  summary:
    'A one-room shelter built of cut salt blocks with a tin roof held down by stones and a single blue door. Making do with what the ground gives, refuge from wind, loneliness, a caretaker nobody visits, the last building before the horizon.',
  scales: ['landscape', 'street', 'tabletop'],
});
