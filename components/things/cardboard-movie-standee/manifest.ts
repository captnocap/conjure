import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cardboard movie standee',
  summary:
    'A life-size die-cut cardboard lobby display for a film that never existed, a painted figure over a title block on an easel back. Video shops and cinema foyers, hype for something forgotten, straight-to-video dreams, a hero who bends at the knees when the tape dries out.',
  scales: ['room', 'street', 'tabletop'],
});
