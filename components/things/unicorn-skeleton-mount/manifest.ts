import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Unicorn skeleton mount',
  summary:
    'An articulated horse-like skeleton wired to a steel armature on a wooden base, with a spiral horn, a brass label and a specimen number. Natural history museums, hoaxes told with a straight face, cryptozoology, lost wonders, the evidence for something everyone wanted to be true.',
  scales: ['room', 'street', 'tabletop'],
});
