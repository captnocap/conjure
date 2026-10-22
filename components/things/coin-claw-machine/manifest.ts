import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Claw machine',
  summary:
    'A coin-operated claw crane: a glass cabinet heaped with plush prizes under a chrome grabber on a gantry, with a lit marquee, joystick and prize chute. Arcades, malls, laundromats, truck stops and bowling alleys; pocket money, rigged odds, wanting something you cannot quite reach, one more try.',
  scales: ['room', 'street', 'tabletop'],
});
