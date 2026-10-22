import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Velour recliner',
  summary:
    'An overstuffed 1970s reclining armchair in worn velour, with a side lever and a pop-out footrest. The chair that belongs to one person only: dads after work, naps in front of the game, an afghan, a cat, an absence nobody sits in.',
  scales: ['room', 'street', 'tabletop'],
});
