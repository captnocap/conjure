import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bowling ball return',
  summary:
    'The chrome-and-fibreglass ball return hump from a bowling alley, with a rack of marbled house balls waiting on its rails and a hand-dryer vent on top. League nights, waiting your turn, borrowed equipment, sweaty palms, small-town Fridays and the rumble of something coming back to you.',
  scales: ['room', 'street', 'tabletop'],
});
