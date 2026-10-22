import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Do-not-disturb hotel door',
  summary:
    'A hotel room door seen from the corridor: brass number, peephole, key-card reader and a hanger tag on the lever handle, closed, open a crack on warm light, or standing wide, with a room-service tray, a pair of shoes or a newspaper left on the carpet outside. Corridors, hush, privacy, affairs and alibis, the door at the end of a thriller.',
  scales: ['room', 'street', 'tabletop'],
});
