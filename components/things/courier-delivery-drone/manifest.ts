import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Courier delivery drone',
  summary:
    'A scuffed quadrotor courier drone with a sticker-covered shell and an insulated food box slung beneath, hovering or parked on its skids. Gig work without a face, hot dinner arriving through rain, megacity airspace, a delivery that is late, waiting or wrecked in an alley.',
  scales: ['street', 'room', 'tabletop'],
});
