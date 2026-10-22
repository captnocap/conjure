import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Emperor penguin huddle',
  summary:
    'A cluster of emperor penguins on the ice, pressed shoulder to shoulder with grey chicks on their feet, or filing off in a line, sometimes with one standing apart. Antarctic winter, endurance, parenthood, warmth shared, the long walk, the one who is left out.',
  scales: ['street', 'landscape', 'tabletop', 'room'],
});
