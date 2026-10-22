import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dog in a recovery cone',
  summary:
    'A dog wearing the cone of shame: a translucent plastic recovery collar framing its face like a lampshade. Coming home from the vet, stitches and indignity, bumping into doorframes, patient misery, slapstick tenderness, being looked after whether you like it or not.',
  scales: ['room', 'street', 'tabletop'],
});
