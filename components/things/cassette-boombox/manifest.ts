import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cassette boombox',
  summary:
    'A twin-deck cassette boombox with big speaker cones, a telescoping aerial, a carry handle and a row of chunky keys, with hand-labelled mixtapes piled beside it. The street corner, the bedroom floor, taping songs off the radio, a mixtape made for someone.',
  scales: ['room', 'tabletop', 'street'],
});
