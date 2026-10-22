import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Deep fryer',
  summary:
    'A twin-basket stainless floor fryer with two oil vats, wire baskets on a hanger bar and a splash guard. Chip shops, fast food, the hot line at dinner rush, burnt forearms, the smell that follows you home, old oil nobody changed.',
  scales: ['room', 'street', 'tabletop'],
});
