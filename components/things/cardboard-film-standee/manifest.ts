import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cardboard film standee',
  summary:
    'A life-size die-cut cardboard cutout of the star of an invented film, propped on an easel back, sun-faded and creased. Video shops and cinema lobbies, forgotten blockbusters, promotional leftovers, a hero nobody remembers taken home by the last customer.',
  scales: ['room', 'street', 'tabletop'],
});
