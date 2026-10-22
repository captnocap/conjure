import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Scales of Justice statue',
  summary:
    'A blindfolded figure of Justice holding a sword and a balance, or the balance alone on a plinth, in bronze, marble or cheap gilt, pans level or tipped. Courthouses, banks, town squares and desk trophies; fairness and its failure, weighing a heart against a feather, allegory, fate, a rigged outcome.',
  scales: ['street', 'room', 'tabletop', 'landscape'],
});
