import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Whiskey tumbler and bottle',
  summary:
    'A cut-glass tumbler of amber liquor with melting ice beside a half-empty bottle, sometimes knocked over into a puddle. Solitude, Dutch courage, regret, noir detectives, a nightcap that became the whole night, a toast nobody answered.',
  scales: ['tabletop', 'room', 'macro'],
});
