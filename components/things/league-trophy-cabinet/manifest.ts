import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'League trophy cabinet',
  summary:
    'A glass-fronted cabinet of bowling trophies, framed team photos and an engraved board of past champions. Small-town pride, league nights, old glory gathering dust, the name everyone still mentions, school corridors, clubhouses and lodge halls.',
  scales: ['room', 'street', 'tabletop'],
});
