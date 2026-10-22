import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Console hi-fi',
  summary:
    'A long, low walnut stereo console with a lift-up lid, cloth speaker grilles, a turntable well and a glowing amber tuner dial, records leaning beside it. Party night in 1974 or a dust-covered heirloom nobody can throw out: living rooms, parents dancing, music as furniture.',
  scales: ['room', 'street', 'tabletop'],
});
