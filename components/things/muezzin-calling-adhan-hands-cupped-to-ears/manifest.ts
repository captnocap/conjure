import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Muezzin calling the adhan',
  summary:
    'A man in a long coat and white cap standing with feet together, head tipped back, both hands cupped behind his ears to carry the call to prayer, perhaps a microphone on a stand before him. Minaret balconies, rooftops at dusk, village squares; also anyone calling out across a valley or a crowd. Devotion, a voice carrying, the same words five times a day.',
  scales: ['street', 'room', 'landscape', 'tabletop'],
});
