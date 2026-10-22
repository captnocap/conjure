import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Court sketch easel',
  summary:
    "A courtroom artist's drawing board on a small easel or propped on a chair, a pastel sketch of the trial in progress and a tin of chalks beside it. Watching from the side, the press bench, cameras forbidden, an accused or a weeping witness caught in a few fast strokes, tomorrow's front page.",
  scales: ['room', 'tabletop', 'street'],
});
