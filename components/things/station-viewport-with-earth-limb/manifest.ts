import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Station viewport',
  summary:
    'A thick rectangular viewport set in a riveted frame on a padded station wall, with a sliding shutter and a handrail, and outside it the blue limb of the Earth, the Moon, Mars, a nebula or nothing but stars. Space stations, ships, orbital hotels; homesickness, the view that never gets old, looking down at everyone you know, the long night shift.',
  scales: ['room', 'tabletop', 'street'],
});
