import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Evidence exhibit table',
  summary:
    "A courtroom table of tagged exhibits in bags and boxes beside numbered markers: a weapon, bundled letters, a child's shoe, ledgers, a stopped clock. A story told through objects, crime and proof, what was found afterwards, the ordinary things a life or a lie leaves behind.",
  scales: ['room', 'tabletop', 'street'],
});
