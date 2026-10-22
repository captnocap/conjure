import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Airfield windsock',
  summary:
    'A striped fabric windsock on a hinged steel pole inside a painted ground circle, filling or sagging with the wind. Small airfields, the edge of the apron, weather you can read at a glance, waiting for a change, a place nobody looks at until it matters.',
  scales: ['landscape', 'street', 'tabletop'],
});
