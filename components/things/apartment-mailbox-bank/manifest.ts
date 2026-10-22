import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Apartment mailbox bank',
  summary:
    'A wall slab of small numbered steel mailboxes from an apartment block entrance: some doors bent open, some stuffed with flyers, one with a handwritten name. Neighbours known only by surname, bills and postcards, tenants who moved away, coming home to a stairwell.',
  scales: ['room', 'street', 'tabletop'],
});
