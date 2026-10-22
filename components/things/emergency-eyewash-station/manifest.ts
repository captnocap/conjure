import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Emergency eyewash station',
  summary:
    'A safety shower and eyewash bowl on a pipe post, with a yellow pull handle and a green sign. Laboratories, factories and school science rooms; institutional caution, rules nobody reads, an untouched fixture gathering dust, or the wet floor on the day it finally mattered.',
  scales: ['room', 'street'],
});
