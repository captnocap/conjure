import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Shoes on the Danube Bank',
  summary:
    "Sixty pairs of cast-iron period shoes left in a row on the stone lip of the Danube quay in Budapest: work boots, heels, children's shoes, some tipped over. A memorial to people shot into the river; grief, absence, a crime remembered quietly, candles and pebbles left by strangers.",
  scales: ['street', 'room', 'tabletop'],
});
