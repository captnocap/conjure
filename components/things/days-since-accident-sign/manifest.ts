import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Days-since-accident sign',
  summary:
    'A workplace safety scoreboard reading how many days since the last accident, with a changeable number. The number is the story: a proud streak, a fresh zero, a digit fallen off. Factories, depots, building sites, dark office humour, complacency, the day something finally went wrong.',
  scales: ['room', 'street', 'tabletop'],
});
