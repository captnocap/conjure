import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lava lamp',
  summary:
    'A rocket-shaped lava lamp: a tapered glass bottle on a flared metal base with glowing wax blobs slowly rising and sinking through tinted liquid. Teenage bedrooms, dorm rooms, late nights, hypnosis, cheap wonder, the 1960s and 1990s at once.',
  scales: ['tabletop', 'room', 'macro'],
});
