import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sleeper pod',
  summary:
    'A coffin-sized cryogenic capsule with a frosted window and a single status light, tumbling slowly end over end. Waiting, suspended lives, hospital nights, long voyages, someone you hope wakes up, a message in a bottle with a person inside.',
  scales: ['cosmic', 'room', 'street'],
});
