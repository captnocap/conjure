import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pinball machine',
  summary:
    'A pinball table on four legs with a painted backglass, a sloped playfield of bumpers and ramps, flipper buttons and a plunger. Arcades, bars and laundromats: flashing lights, bells, one more quarter, a high score with your initials, noise and joy in a dim corner.',
  scales: ['room', 'street', 'tabletop'],
});
