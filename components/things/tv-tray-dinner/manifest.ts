import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'TV tray dinner',
  summary:
    'A folding metal TV tray on spindly crossed legs carrying a foil compartment dinner, a fork and a sweating glass. Eating in front of the set, alone or side by side: latchkey evenings, bachelors, widowers, a family that stopped using the table.',
  scales: ['room', 'street', 'tabletop'],
});
