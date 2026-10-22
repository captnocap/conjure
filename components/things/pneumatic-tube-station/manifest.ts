import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pneumatic tube station',
  summary:
    'A pneumatic tube terminal: pipes rising from a cabinet, a glass sight section, and a carrier capsule thumping into the catch basket. Banks, department-store cash offices, hospitals, newsrooms, drive-through tellers: messages sent by air, bureaucracy with a whoosh, old futures.',
  scales: ['room', 'tabletop', 'street'],
});
