import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Payphone',
  summary: 'A wall-mounted public telephone with a coiled cord, metal buttons and a last-call notice, borrowed voices, emergencies and messages from the road.',
  scales: ['street', 'room', 'tabletop'],
});
