import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chrysler Building',
  summary:
    'The 1930 Art Deco skyscraper on Lexington Avenue, 319 m: a white brick shaft with dark bands, steel eagle gargoyles and winged radiator caps, crowned by seven stacked sunburst arches and a needle spire. Jazz Age glamour, the race to the sky, Manhattan romance, chrome and nostalgia.',
  scales: ['landscape', 'street', 'tabletop'],
});
