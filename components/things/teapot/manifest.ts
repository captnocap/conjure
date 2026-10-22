import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Teapot',
  summary: 'A teapot with its curved spout, lid and waiting cup, tea rituals, conversations, domestic pauses and something warm offered to a guest.',
  scales: ['tabletop', 'room', 'street'],
});
