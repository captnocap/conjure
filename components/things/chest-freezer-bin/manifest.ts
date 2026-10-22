import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chest freezer bin',
  summary:
    'An open-top coffin freezer island heaped with bagged frozen goods under a sliding glass lid, a hand-lettered price card on a wire stalk. Holiday turkeys, bargain bins, corner shops and fish counters, rummaging elbow-deep in the cold for the last good one.',
  scales: ['room', 'street'],
});
