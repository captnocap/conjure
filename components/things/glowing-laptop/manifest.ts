import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Glowing laptop',
  summary:
    'An open laptop balanced on a pillow or a cardboard box, its screen the only light in the room: an unsent message, a spreadsheet, a paused film, job listings or a blank page, with stickers on the lid. Insomnia, deadlines, long-distance love, job hunting, being awake and alone at 3 a.m.',
  scales: ['tabletop', 'room', 'macro'],
});
