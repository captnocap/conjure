import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Recipe card box',
  summary:
    'A small wooden index box of handwritten recipe cards behind tabbed dividers, with one grease-stained card propped out front. Inheritance, a voice that survives in handwriting, the dish nobody can quite get right any more, measurements like "enough flour" and "until it looks right".',
  scales: ['tabletop', 'macro', 'room'],
});
