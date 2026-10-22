import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Status LED pair',
  summary:
    'Two through-hole LEDs on bent legs beside silkscreened labels on a scrap of circuit board, each off, steady or blinking in its own colour. Street lamps or harbour beacons at circuit scale, an indicator panel at room scale. Alive, error, standby, a link light, a machine waiting in the dark for a reply.',
  scales: ['macro', 'tabletop', 'room'],
});
