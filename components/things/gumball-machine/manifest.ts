import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Gumball machine',
  summary:
    'A cast-metal gumball machine with a glass globe of coloured balls, a coin knob and a chute, on a pipe stand or a counter. Laundromats, diner doorways, a quarter begged from a parent, small bright wishes, waiting rooms of childhood.',
  scales: ['room', 'street', 'tabletop'],
});
