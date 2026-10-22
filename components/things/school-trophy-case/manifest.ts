import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'School trophy case',
  summary:
    'A glazed wooden school display cabinet of cups, shields, team photographs and a faded pennant, lit from inside. Assembly halls and entrance foyers, old victories, names engraved and forgotten, pride, the one year everybody still talks about.',
  scales: ['room', 'street', 'tabletop'],
});
