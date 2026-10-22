import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Zoo species placard',
  summary:
    'An angled enclosure sign on a post: a painted primate portrait, a range map with a red patch, and a conservation status bar. Zoo paths, school worksheets, facts read aloud, extinction made tidy, names given to captives, and the notes and flowers people leave when an animal dies.',
  scales: ['room', 'street', 'tabletop'],
});
