import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Railway handcar',
  summary:
    'A hand-pumped railway inspection trolley on four flanged wheels: a plank deck, a seesaw pump lever on an A-frame, a toolbox and a lantern, sometimes towing a little push trailer. Section gangs, silent-film chases, escape down an empty line, slow honest travel by muscle, a branch nobody else uses any more.',
  scales: ['street', 'landscape', 'tabletop'],
});
