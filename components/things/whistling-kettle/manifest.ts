import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Whistling kettle',
  summary:
    'A dented stovetop kettle with a whistle cap on a single gas ring, cold, coming to the boil or shrieking steam. Tea as the answer to everything: bad news, visitors, grief, rain, waiting up, a grandmother who puts the water on before you have sat down.',
  scales: ['tabletop', 'room', 'macro'],
});
