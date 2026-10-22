import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Curtained fitting room',
  summary:
    'A home-made plywood changing cubicle with a curtain on rings instead of a door, a mirror, a hook and a hand-lettered sign. Thrift stores, market stalls, school plays, swimming pools; privacy that does not quite reach the floor, trying on someone else\'s clothes, a pair of feet behind the cloth.',
  scales: ['room', 'street'],
});
