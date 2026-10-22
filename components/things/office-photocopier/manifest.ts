import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Office photocopier',
  summary:
    'A hulking floor-standing photocopier with a lift-up lid, paper drawers, a button panel and sorter bins, jammed, spitting pages or wearing an out-of-order note. Office tedium, deadlines, paper jams, the copy room after hours, a forgotten original left on the glass.',
  scales: ['room', 'street', 'tabletop'],
});
