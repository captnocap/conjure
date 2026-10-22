import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dealt poker hand',
  summary:
    'Five playing cards, fanned face up, laid face down or thrown in, with the rest of the deck nearby. Fate, bluffing, secrets, the dead man\'s hand, a royal flush nobody saw, cheating, a game cut short, gamblers and fortune tellers.',
  scales: ['tabletop', 'room', 'macro'],
});
