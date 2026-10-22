import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Newspaper folded to the crossword',
  summary:
    'A newspaper folded into quarters at the crossword, the grid partly filled in, with a pencil and a pair of reading glasses left on top. Retirement, daily habit, a mind kept busy, waiting rooms and trains, someone missing from their chair.',
  scales: ['tabletop', 'room', 'macro'],
});
