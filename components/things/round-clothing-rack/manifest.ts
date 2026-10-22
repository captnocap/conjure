import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Round clothing rack',
  summary:
    'A circular chrome garment rack on casters, packed with secondhand clothes on hangers under a round size sign. Thrift stores, clearance corners, rummaging for a bargain, other people\'s wardrobes, the smell of fabric softener and dust.',
  scales: ['room', 'street', 'tabletop'],
});
