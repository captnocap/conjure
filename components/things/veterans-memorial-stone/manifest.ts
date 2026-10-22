import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Veterans memorial stone',
  summary:
    'A granite war memorial engraved with columns of names, beside a flagpole, with small flags, a wreath and flowers at its foot. Courthouse lawns, Memorial Day, grief kept tidy, surnames you still see on the mailboxes, remembrance that is either tended weekly or quietly forgotten.',
  scales: ['street', 'landscape', 'tabletop'],
});
