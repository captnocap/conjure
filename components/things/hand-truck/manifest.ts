import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hand truck',
  summary:
    'A two-wheeled sack barrow with a toe plate and tall frame, stacked with boxes, beer kegs, market crates or one awkward thing strapped on. Deliveries, removals, moving house, market traders, cellar drops, the last trip from the van.',
  scales: ['street', 'room', 'tabletop'],
});
