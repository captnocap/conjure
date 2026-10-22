import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fibreglass novelty figure',
  summary:
    'A larger-than-life fibreglass figure on a plinth, sun-faded and repainted by hand: a peg-leg pirate, a grinning dinosaur, a giant gorilla, a mermaid or a clown whose mouth swallows golf balls. Crazy golf, seaside arcades, roadside attractions, cheerful shabbiness, childhood landmarks that were always slightly frightening.',
  scales: ['street', 'room', 'tabletop'],
});
