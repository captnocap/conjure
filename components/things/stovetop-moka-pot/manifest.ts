import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stovetop moka pot',
  summary:
    'An eight-sided aluminium espresso pot with a black handle and knob, steam at the spout and a small cup beside it. Italian kitchens, nonna, the gurgle that means morning, ritual, waking up slowly, students and exiles making home.',
  scales: ['tabletop', 'room', 'macro'],
});
