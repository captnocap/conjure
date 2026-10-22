import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hypocaust pile stack',
  summary:
    'A patch of Roman raised floor cut away in section: a fine mosaic surface resting on rows of stacked brick pillars over a soot-black void where furnace air once ran. Underfloor heating, hidden labour, stokers and slaves, engineering beneath luxury, ruins and excavations.',
  scales: ['room', 'street'],
});
