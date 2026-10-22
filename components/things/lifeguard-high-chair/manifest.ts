import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lifeguard high chair',
  summary:
    'A tall white-painted lifeguard chair with ladder rungs, a parasol, a ring buoy on a hook and a signal flag. Poolside summers, being watched over, a whistle that stops the whole pool, teenage authority, or an empty seat chained off after the season ends.',
  scales: ['street', 'room', 'tabletop'],
});
