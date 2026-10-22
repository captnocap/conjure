import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fennec fox',
  summary:
    'A tiny cream desert fox with enormous ears, sitting, curled asleep or peering out at the mouth of its burrow in the sand, a line of pawprints leading to it. Hidden life, night in the dunes, alertness, something small and tender that belongs here when you do not.',
  scales: ['tabletop', 'street', 'landscape', 'room'],
});
