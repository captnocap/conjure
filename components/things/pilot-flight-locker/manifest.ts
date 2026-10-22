import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pilot flight locker',
  summary:
    'A dented steel locker standing open on a helmet, a hanging flight suit, photographs taped inside the door and a lucky charm on a hook. The person inside the machine: ready rooms, superstition, letters home, the locker nobody has the heart to clear.',
  scales: ['room', 'street', 'tabletop'],
});
