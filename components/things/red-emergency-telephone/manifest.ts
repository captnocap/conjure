import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Red emergency telephone',
  summary:
    'A single red telephone with no dial, on its own pedestal, table or wall niche under a small lamp. The hotline nobody wants to use: waiting in silence, ringing, or left off the hook. Cold War bunkers, presidents and generals, the worst news, a decision that cannot be taken back.',
  scales: ['room', 'street', 'tabletop'],
});
