import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Floor box fan',
  summary:
    'A square plastic box fan standing on the floor, blades spinning behind a dusty grille, leaning back a little, with the cord trailing across the carpet. Heatwaves, cheap flats, garages, gyms and hallways, airing out a stink, white noise for sleeping, student summers, a ribbon streaming to prove it works.',
  scales: ['room', 'street', 'tabletop'],
});
