import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cracked porcelain doll',
  summary:
    'A seated bisque doll in a faded dress with glass eyes and a crack across its painted face. Attics, inherited toys, childhoods that ended, the unease of something sweet that has been broken and still stares.',
  scales: ['tabletop', 'room', 'macro', 'street'],
});
