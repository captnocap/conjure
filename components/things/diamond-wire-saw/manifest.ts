import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wire saw',
  summary:
    'A quarry wire-saw rig: a motor carriage on rails with a big flywheel pulling an endless wire loop through a slab of rock while a hose trickles water into the cut. Slow industrial patience, a mountain sliced like cheese, slurry, noise, the moment before a block comes free.',
  scales: ['street', 'landscape'],
});
