import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Beanbag chair',
  summary:
    'A slumped vinyl or corduroy beanbag chair still holding the dent of whoever last sat in it, with something sunk into the hollow: a controller, a magazine, a hoodie, a sleeping cat. Sprawl, sleepovers, video games, doing nothing for hours, the floor of a teenager\'s room.',
  scales: ['room', 'street', 'tabletop'],
});
