import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cane rocking chair',
  summary:
    'A tall wooden rocking chair with a woven cane seat and back, the kind kept by a front door, still rocking gently. Old age, watching the street go by, afternoon heat, gossip, grandmothers, someone who has only just stepped inside.',
  scales: ['street', 'room', 'tabletop'],
});
