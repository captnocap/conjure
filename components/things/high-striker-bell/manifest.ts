import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'High striker',
  summary:
    'A tall carnival strength-tester: a painted scale tower with a sliding puck, a brass bell at the top, chasing lights and a mallet leaning at the base. Showing off, summer fairs, bravado, rigged games, ringing the bell or failing in front of everyone.',
  scales: ['street', 'room', 'tabletop'],
});
