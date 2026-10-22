import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fog machine',
  summary:
    'A squat metal fog machine on the floor with a glowing nozzle, a tangled power lead and a plastic jug of fluid beside it, puffing out a soft cone of haze. Theatre wings, concerts and raves, haunted houses, school discos, the thing that makes light visible, the smell of glycol at the back of the throat.',
  scales: ['room', 'street', 'tabletop'],
});
