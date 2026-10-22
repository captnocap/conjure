import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Clown egg register',
  summary:
    'A small glass-fronted shelf of eggs, each painted with a different clown\'s registered face and given a tiny wig, hat and name card, as in the real clown egg registry. Circus history, copyrighted faces, odd little museums, a roll call of entertainers, memorials, the unease of many painted smiles.',
  scales: ['tabletop', 'macro', 'room'],
});
