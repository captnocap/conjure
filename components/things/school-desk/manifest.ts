import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'School desk',
  summary:
    'A single pupil\'s desk and chair, from an inkwell lift-lid on cast iron to tubular steel and laminate, with carved initials, an open exercise book or a bag left behind. Childhood, boredom and daydreaming, exams, detention, the one empty seat, the last afternoon of term.',
  scales: ['room', 'street', 'tabletop'],
});
