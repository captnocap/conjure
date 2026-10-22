import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Reading glasses spinner',
  summary:
    'A revolving floor rack of cheap reading glasses and sunglasses, with a small mirror and an eye-strength chart on top. Drugstores, airports, gift shops: middle age arriving, squinting at small print, trying on a new face, vanity for under ten dollars.',
  scales: ['room', 'street'],
});
