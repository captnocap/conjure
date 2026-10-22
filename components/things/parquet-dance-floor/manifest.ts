import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Parquet dance floor',
  summary:
    'A square of interlocking dance-floor panels laid for a party, a small DJ rig at one edge and whatever the dancers left behind: confetti, kicked-off heels, a dropped bouquet, a jacket. First dances, wedding discos, dad dancing, the last slow song, an empty floor at 2 a.m. with the lights still turning.',
  scales: ['room', 'street', 'tabletop'],
});
