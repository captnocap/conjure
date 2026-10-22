import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rhesus macaque',
  summary:
    'A rhesus macaque sitting hunched on a temple perch: bare pink face, close-set amber eyes, cheek pouches, often holding something it stole. Temple towns, thieving cleverness, bored menace, tourists outnumbered, a staring contest you will lose.',
  scales: ['street', 'room', 'tabletop'],
});
