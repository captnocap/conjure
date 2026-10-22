import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Human cannon',
  summary:
    'A giant painted circus cannon on a wagon carriage, stars on the barrel, a ladder to the breech and a crash helmet at the muzzle. Daredevils, drum rolls, held breath, bravado and the fear behind it, a stunt performed one last time.',
  scales: ['street', 'room'],
});
