import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Video rental shelf',
  summary:
    'A freestanding double-sided rental shelf of face-out video boxes under a genre header, with gaps where the good ones are already out. Friday nights, arguing over what to watch, sun-bleached covers, the last copy gone, a ritual that no longer exists.',
  scales: ['room', 'street', 'tabletop'],
});
