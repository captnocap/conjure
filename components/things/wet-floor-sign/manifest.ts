import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wet floor sign',
  summary:
    'A yellow folding caution A-frame standing in a thin puddle of whatever was spilled. Night cleaners, empty corridors, a mess someone has promised to come back to, the small bureaucracy of accidents in shops, hospitals, stations and wet streets.',
  scales: ['room', 'street', 'tabletop'],
});
