import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Round timer and bell',
  summary:
    'A ringside timekeeper\'s board on two legs: a brass bell with its striker, a three-light interval timer box (green, amber, red) and whatever is pinned beside them. Three-minute rounds, one-minute rests, discipline measured out loud, the last ten seconds, time running out on a gym or a career.',
  scales: ['room', 'tabletop', 'street'],
});
