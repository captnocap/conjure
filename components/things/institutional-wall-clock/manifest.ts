import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Institutional wall clock',
  summary:
    'A large plain white-faced clock with black hands and a ticking second hand, on a slab of painted wall, a tiled wall, a platform pole or a gantry. Schools, hospitals, stations and offices: waiting for news, the last minutes of an exam, a shift that will not end, time that has stopped.',
  scales: ['room', 'street', 'tabletop'],
});
