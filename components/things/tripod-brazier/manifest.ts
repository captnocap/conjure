import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tripod brazier',
  summary:
    'A bronze three-legged charcoal brazier on animal feet, its dish heaped with glowing coals or cold grey ash. Warmth in a stone room, temple offerings, a night vigil, sacrifice, soldiers warming their hands, the last fire in an empty hall.',
  scales: ['room', 'street', 'tabletop'],
});
