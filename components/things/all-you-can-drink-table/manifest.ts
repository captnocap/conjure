import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'All-you-can-drink table',
  summary:
    'A low laminate table crowded with highball glasses, a beer pitcher, fried chicken bones, edamame shells, a call button and a laminated drinks menu. Karaoke rooms and izakaya back booths, office parties, ninety-minute limits, the wreckage of a long night, one full glass poured for someone who never came.',
  scales: ['room', 'tabletop'],
});
