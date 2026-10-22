import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Diner interior',
  summary: 'A cutaway roadside diner with checkerboard floor, counter stools and broad windows, late coffee, highway meals and conversations that last until morning.',
  scales: ['room', 'street', 'tabletop'],
});
