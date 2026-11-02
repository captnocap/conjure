import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sydney Opera House',
  summary:
    'The Sydney Opera House on its granite podium at Bennelong Point: two rows of nested white tiled shells rising like sails over the harbour, bronze glass in their mouths and a monumental stair. Harbour mornings, opening nights, Vivid light festivals, Australia, a modernist dream that nearly broke its architect.',
  scales: ['landscape', 'street', 'tabletop'],
});
