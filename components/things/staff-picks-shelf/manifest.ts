import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Staff picks shelf',
  summary:
    'A small endcap shelf of face-out tapes, each with a handwritten index-card recommendation hanging under it, one clerk\'s whole personality on display. Video shops, record shops, bookshops: being told what to love by a stranger, obsession, a last day at work, taste as a love letter.',
  scales: ['room', 'tabletop', 'street'],
});
