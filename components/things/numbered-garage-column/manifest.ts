import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Numbered garage column',
  summary:
    'A square concrete car park column with a painted colour band, a huge level number, scuffed corner guards, a fire point and something taped to it. Remembering where you parked, wayfinding in a place with no landmarks, missing posters nobody reads, concrete patience.',
  scales: ['street', 'room', 'tabletop'],
});
