import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rotary clothesline',
  summary:
    'An umbrella-style rotary clothesline turning slowly, hung with laundry that sways and tells who lives here: work shirts, baby clothes, one uniform, a single dress. Back yards, washing day, heat and wind, domestic labour, making do, someone expected home.',
  scales: ['street', 'tabletop', 'room'],
});
