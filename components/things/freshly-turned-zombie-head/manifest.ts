import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Freshly turned zombie head',
  summary:
    'The head and shoulders of someone who only just turned: grey skin, clouded eyes, one fresh bite, still wearing their name badge or hair curlers. The first hour of an outbreak, a neighbour you recognise, sad comic horror, B-movies and quarantine.',
  scales: ['room', 'tabletop', 'street'],
});
