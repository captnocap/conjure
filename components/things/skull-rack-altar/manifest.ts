import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Skull rack altar',
  summary:
    'A low stone platform carved with rows of skulls and topped by a timber rack of crossbeams, a tzompantli. Sacrifice, warning, the price of losing, trophies of war, a city that keeps count of its dead in public.',
  scales: ['street', 'landscape', 'room'],
});
