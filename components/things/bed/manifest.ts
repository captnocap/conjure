import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bed',
  summary: 'A made or unmade bed with pillows, blanket and bedtime objects, sleeping rooms, rest, absence and the moment before a new day begins.',
  scales: ['room', 'tabletop', 'street'],
});
