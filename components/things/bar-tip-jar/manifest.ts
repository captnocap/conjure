import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bar tip jar',
  summary:
    'A glass jar on a bar with a hand-lettered sign, crumpled notes and loose coins inside, and now and then something odd dropped in with them. Service work and scraping by, small generosity, buskers and baristas, counting up at the end of a shift, a phone number left for the bartender.',
  scales: ['tabletop', 'room', 'macro'],
});
