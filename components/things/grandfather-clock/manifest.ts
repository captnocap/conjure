import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Grandfather clock',
  summary: 'A tall longcase clock with a visible pendulum, weights and a careful face, inherited homes, measured time and a room listening to its own silence.',
  scales: ['room', 'tabletop', 'street'],
});
