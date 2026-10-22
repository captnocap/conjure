import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Marble bank lobby',
  summary:
    'A grand banking hall: inlaid floor, a colonnade, a long wall of teller windows and high windows dropping shafts of light, with the cast standing small on the open floor. Authority, hush, money and security, queues and paperwork, and their failure: a bank run, a robbery, a gutted hall left to pigeons.',
  scales: ['room', 'street'],
});
