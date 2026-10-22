import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Backyard swing set',
  summary:
    'A tubular A-frame garden swing set with chain swings, one seat still rocking after whoever jumped off. Long summer afternoons, being called in for dinner, outgrown childhoods, empty gardens, rust and the creak of a chain in the wind.',
  scales: ['street', 'tabletop', 'landscape'],
});
