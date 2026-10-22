import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rotary wall phone',
  summary:
    'A wall-mounted rotary telephone with a hopelessly long tangled coil cord, on a short stretch of wallpapered kitchen wall with a pencilled list of numbers. Long-distance Sundays, bad news at night, waiting for the kids to ring, a handset left dangling.',
  scales: ['room', 'tabletop'],
});
