import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Highway billboard',
  summary:
    'A tall roadside billboard on a steel monopole or an old timber trestle, with a catwalk, gooseneck lamps and a big pasted poster. Distance counted in exits, promises made to passing cars, lawyers and diners and scripture, American loneliness at the edge of a field.',
  scales: ['street', 'landscape', 'tabletop'],
});
