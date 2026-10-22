import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rental shoe counter',
  summary:
    'A bowling-alley shoe rental desk: a laminate counter in front of a wall of pigeonholes stuffed with two-tone shoes, a can of disinfectant spray, a service bell and whatever was handed over as a deposit. Borrowed things, awkward first dates, birthday parties, small-town Fridays, the indignity of other people\'s shoes.',
  scales: ['room', 'street'],
});
