import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Letter-board church sign',
  summary:
    'A brick-based roadside church sign with a changeable-letter board carrying a pun, a verse, a fish fry or a funeral time. Country highways, small congregations, Sunday humour, announcements of weddings and homegoings, a message left up too long with letters missing.',
  scales: ['street', 'landscape', 'tabletop'],
});
