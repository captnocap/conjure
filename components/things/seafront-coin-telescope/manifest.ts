import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Coin-operated telescope',
  summary:
    'A cast-metal coin-operated viewing telescope on a pedestal, with a coin box, a slot and a step for children. Seafronts, piers, lookouts and rooftops; twenty pence for two minutes of horizon, holidays out of season, longing, watching for a ship or a person who is not coming.',
  scales: ['street', 'landscape', 'room', 'tabletop'],
});
