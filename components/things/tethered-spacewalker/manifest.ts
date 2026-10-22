import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tethered spacewalker',
  summary:
    'An astronaut in a bulky white suit on a coiled safety tether, gold visor reflecting the planet, caught working, waving, drifting limp or reaching for something just out of reach. Spacewalks, courage, routine labour in a lethal place, the thin line home.',
  scales: ['planetary', 'cosmic', 'landscape', 'street', 'room', 'tabletop'],
});
