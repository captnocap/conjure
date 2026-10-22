import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Jar of home-made marmalade',
  summary:
    'A glass preserve jar with a handwritten label, a cloth cover tied round the neck and a sticky knife resting across it. Grandmothers, thrift, pantry shelves, church fetes, summer boiled down and saved for winter.',
  scales: ['tabletop', 'room', 'macro'],
});
