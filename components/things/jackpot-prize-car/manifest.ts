import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Jackpot prize car',
  summary:
    'A gleaming prize car on a low turning dais ringed with chaser bulbs, a giant bow on the bonnet and a win-this-car placard. Casino floors, shopping-mall raffles, game shows and showrooms: the dream dangled in front of everyone, never quite driven away.',
  scales: ['room', 'street', 'tabletop'],
});
