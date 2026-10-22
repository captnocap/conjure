import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Roulette table',
  summary:
    'A full roulette table: the wheel turning in its polished bowl, a baize layout painted with the number grid, chip stacks, a croupier\'s rake and a marker dolly. Casinos, everything on one number, superstition and systems, tuxedos, the hush before the ball drops.',
  scales: ['room', 'street', 'tabletop'],
});
