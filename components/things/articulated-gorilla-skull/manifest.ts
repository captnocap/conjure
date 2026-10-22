import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Primate skull on a stand',
  summary:
    'A gorilla skull on a brass rod stand: tall sagittal crest, huge canines, lower jaw sprung open; or a chimpanzee, baboon or human skull, or three in a row for comparison. Anatomy rooms, Darwin, museum stores, poaching evidence, vanitas still lifes; the uneasy family resemblance between the one looking and the one looked at.',
  scales: ['tabletop', 'room', 'macro', 'street'],
});
