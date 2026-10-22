import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Robot',
  summary:
    'A person-sized exosuit robot with a painted, stencilled, riveted body and an expressive screen face: a grunt, a hound on four legs, a medic, a rusted salvage unit, a samurai. A character with a mood and a pose.',
  // Wraps a builder from the Three.js ateliers repository; offered only when it is linked in.
  requires: ['ateliers'],
  scales: ['street', 'room'],
});
