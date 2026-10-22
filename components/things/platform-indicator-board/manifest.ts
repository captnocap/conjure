import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Platform indicator board',
  summary:
    'A hanging railway platform indicator with a clock, a destination in glowing letters, a fast or slow marker and a flickering minutes-to-departure counter. Commuter stations, anticipation, deadlines, counting down, the long wait, a train cancelled, running for the 6:42.',
  scales: ['street'],
});
