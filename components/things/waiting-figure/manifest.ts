import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Waiting figure',
  summary:
    'A person standing and waiting: square and patient, leaning back, arms crossed or crouched on their heels, with a holdall, a lit phone, a coffee or a closed umbrella, looking down the road. Bus stops, platforms, lobbies and queues; being early, being late, being stood up, the last one left.',
  scales: ['street', 'room', 'tabletop'],
});
