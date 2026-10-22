import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fry dump station',
  summary:
    'A stainless fry dump: a sloped bin of fries under a red heat lamp, a salt shaker, a metal scoop, a stack of red paper cartons and a wire basket hung on the rail. Fast-food kitchens, hunger, shift work, the rush, the phrase "put the fries in the bag".',
  scales: ['room', 'tabletop'],
});
