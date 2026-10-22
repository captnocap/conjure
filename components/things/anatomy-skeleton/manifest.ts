import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Anatomy skeleton',
  summary:
    'A full-size teaching skeleton hanging from a wheeled stand, plain or dressed up by students in a hat, scarf or lab coat. Biology classrooms, mortality played for laughs, a class mascot with a nickname, or a pale figure left alone in a dark room after school.',
  scales: ['room', 'street', 'tabletop'],
});
