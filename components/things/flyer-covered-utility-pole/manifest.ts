import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Flyer-covered utility pole',
  summary:
    'A creosoted wooden utility pole layered in staples and paper: lost-dog posters, yard-sale signs, a missing-person flyer, tear-off phone tabs fluttering. The neighbourhood noticeboard nobody owns: small hopes, small ads, worry, garage bands, years of weather over somebody\'s phone number.',
  scales: ['street', 'tabletop', 'macro'],
});
