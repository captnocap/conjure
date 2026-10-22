import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'IOU note',
  summary:
    'A scribbled IOU on a bar napkin, torn notebook page or beer mat, pinned under a chip, a pen, a bullet or a knife. Debt, promises made at 3 a.m., loan sharks, trouble coming, a marker that will be called in, a friendship about to end.',
  scales: ['tabletop', 'macro', 'room'],
});
