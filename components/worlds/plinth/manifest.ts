import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Studio plinth',
  summary:
    'A bare studio: a few collected objects arranged as a still life on a low plinth under soft directional light, like a museum model. Sizes are compressed so a tree and a chair can share the stand.',
  scales: ['room', 'street', 'tabletop'],
});
