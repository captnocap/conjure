import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Blackjack table',
  summary:
    'A half-moon blackjack table with a dealing shoe, chip tray, discard holder, painted betting circles, dealt cards and a ring of stools. Casinos, card counters and honeymooners, hit me, one more hand, the thing you should never have put on the table.',
  scales: ['room', 'street', 'tabletop'],
});
