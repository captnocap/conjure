import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Empty labelled vitrine',
  summary:
    'A glass museum display case on legs holding only a velvet cushion with a dent in it, and a long, confident label for something that is not there. Absence given dignity, heists, the emperor’s new clothes, ghosts, loss, bureaucratic deadpan, things you have to take on trust.',
  scales: ['room', 'street', 'tabletop'],
});
