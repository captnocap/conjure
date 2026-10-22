import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tentacle pod plant',
  summary:
    'A fleshy alien plant with a toothed central pod on a thick stalk and a ring of curling tendrils that sway. Menace or botanical wonder depending on mood: carnivorous jungles, B-movie greenhouses, a little shop of horrors, something that should not be fed, a prize specimen.',
  scales: ['street', 'room', 'tabletop', 'planetary', 'landscape'],
});
