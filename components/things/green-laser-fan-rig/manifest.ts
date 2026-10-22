import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Laser fan rig',
  summary:
    'A boxy laser projector on a tripod or truss clamp throwing a fan of thin green, red or rainbow beams through the haze, scanner mirrors glinting in its window, a cheap moving-head light beside it. Raves and club nights, planetariums, sci-fi labs, a shaft of light cut into smoke, the moment the beams come on.',
  scales: ['room', 'street', 'tabletop'],
});
