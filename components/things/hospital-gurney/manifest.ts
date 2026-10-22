import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hospital gurney',
  summary:
    'A wheeled hospital stretcher with fold-down side rails, a thin vinyl mattress, a pillow and a folded blanket, parked in a corridor. Emergencies, long waits in hallways, someone just wheeled away, the bed nobody wants to need, bad news under a white sheet.',
  scales: ['room', 'street', 'tabletop'],
});
