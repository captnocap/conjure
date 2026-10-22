import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Petrol generator set',
  summary:
    'A small rattling portable petrol generator chained to a post, with an extension lead running off to whatever it keeps alive, a fuel funnel and an oil stain beneath it. Power cuts, self-reliance, fumes and din, the background noise of a city that makes its own electricity.',
  scales: ['street', 'room'],
});
