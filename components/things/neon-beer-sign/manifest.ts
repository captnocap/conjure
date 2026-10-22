import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Neon bar sign',
  summary:
    'A bent-glass neon tube sign on a backing grid with a transformer and pull chain, standing on a pole or bracket frame. Bar windows, motels, diners and liquor stores: buzzing colour at night, dead letters, promises of cold beer, vacancy and loneliness after dark.',
  scales: ['room', 'street', 'tabletop'],
});
