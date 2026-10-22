import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Countdown clock board',
  summary:
    'A big outdoor countdown clock on a lawn, glowing digits in a long weatherproof case, with a flagpole beside it. The press site on launch morning: anticipation, a hold at T-minus nine, the roar at zero, deadlines and waiting, or a dark board that has read nothing for years.',
  scales: ['street', 'landscape', 'planetary', 'tabletop'],
});
