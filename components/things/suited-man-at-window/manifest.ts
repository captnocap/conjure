import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Suited man at the window',
  summary:
    'A figure in a dark suit standing with his back three-quarters to us, one hand in a pocket, the other holding a phone, a glass or a cigarette, looking out or glancing back over his shoulder, jacket on, slung over a shoulder or dropped on a chair. The watcher, the client, the contract killer waiting for the call, the executive at midnight, anyone who waits at a window.',
  scales: ['room', 'street', 'tabletop'],
});
