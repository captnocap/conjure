import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Statue of Liberty',
  summary:
    'Liberty Enlightening the World: the robed copper colossus raising her torch over New York Harbor from a granite pedestal on the star-shaped fort of Liberty Island, 93 m to the flame. Arrival, immigrants at the rail, hope, freedom, the Fourth of July, the first sight of America.',
  scales: ['landscape', 'street', 'tabletop'],
});
