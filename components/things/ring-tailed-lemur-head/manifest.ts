import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ring-tailed lemur',
  summary:
    'A ring-tailed lemur sitting upright: fox-like white face, black eye patches, orange eyes and a long black-and-white striped tail. Morning sunbathing, troop gossip, wide-eyed alarm, Madagascar, small solemn animals holding court.',
  scales: ['room', 'tabletop', 'street'],
});
