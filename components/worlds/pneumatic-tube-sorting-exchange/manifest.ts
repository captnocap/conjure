import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'world',
  title: 'Pneumatic tube sorting exchange',
  summary: 'An exchange room is defined by a wall of sweeping delivery tubes, a central routing island and raised maintenance galleries.',
  scales: ['room', 'street'],
});
