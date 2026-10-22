import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Speed bag platform',
  summary:
    'A round wooden drum platform on an adjustable steel post with a small pear-shaped speed bag on a swivel beneath it. Boxing gyms, rhythm, patience, a rattle heard down the stairs, the kid who has to stand on a box to reach.',
  scales: ['room', 'tabletop', 'street'],
});
