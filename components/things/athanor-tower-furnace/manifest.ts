import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Athanor tower furnace',
  summary:
    'A squat brick alchemist\'s furnace with a domed cap, an iron fire door and a glowing sight hole, built to hold one slow fire for weeks. Patience, obsession, a fire that must not go out, cellar laboratories, the long wait for gold.',
  scales: ['room', 'street'],
});
