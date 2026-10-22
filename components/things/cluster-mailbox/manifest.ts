import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cluster mailbox',
  summary:
    'A leaning post-mounted bank of numbered mailboxes at a trailer-park entrance, doors hanging open, flags up, stuffed with flyers or overdue notices. Waiting on a cheque, neighbours who know your business, bills, moving away, small-town addresses.',
  scales: ['street', 'tabletop', 'room'],
});
