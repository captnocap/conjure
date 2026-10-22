import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Drive-thru menu board',
  summary:
    'A tall backlit drive-thru menu board on steel posts: glowing panels of food pictures and prices, a speaker grille and a PLEASE ORDER HERE sign at car-window height, a concrete kerb and a painted arrow at its foot. Roadsides, car culture, midnight cravings, waiting with the window down.',
  scales: ['street', 'room'],
});
