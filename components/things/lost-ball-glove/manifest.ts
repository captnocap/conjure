import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lost ball glove',
  summary:
    'A worn leather baseball glove left behind on the grass, a bench or a fence post, a scuffed ball still in the pocket and a name inked on the wrist strap. Childhood left behind, fathers and kids playing catch, the end of summer, something small that someone will come back for, or never will.',
  scales: ['tabletop', 'macro', 'room', 'street'],
});
