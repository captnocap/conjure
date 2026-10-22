import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Scavenging bird flock',
  summary:
    'A wheeling cloud of gulls (or crows, kites, storks, starlings) circling over a patch where some have landed to squabble over scraps. Landfills, harbours, chip-shop car parks, ploughed fields; noise, appetite, opportunism, the sky above anything thrown away.',
  scales: ['landscape', 'street'],
});
