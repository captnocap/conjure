import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Jury box',
  summary:
    'Two tiers of fixed jury seats behind a low panelled rail, empty, scattered with notepads and coats, or filled with twelve anonymous figures. Being judged by strangers, civic duty, deliberation, the one holdout, a verdict nobody wants to read out.',
  scales: ['room', 'street', 'tabletop'],
});
