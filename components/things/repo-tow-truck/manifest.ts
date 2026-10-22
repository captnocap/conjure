import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Repo tow truck',
  summary:
    'A wheel-lift tow truck with an amber light bar and scuffed door lettering, a car hooked up behind it: arriving with a trade-in, hauling a wreck, or repossessing somebody\'s life at four in the morning. Missed payments, breakdowns, bad luck, hard men doing a hard job, the end of the easy-credit story.',
  scales: ['street', 'landscape', 'tabletop'],
});
