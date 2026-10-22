import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hopper wagon',
  summary:
    'A lone bulk freight hopper wagon standing on a short length of track: ribbed steel sides, discharge chutes underneath, a heaped load and graffiti down its flank. Freight yards, coal and grain country, hobo rides, long waits in sidings, industry that moves without passengers.',
  scales: ['landscape', 'street'],
});
