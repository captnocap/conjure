import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Auction notice and padlock',
  summary:
    'A close view of a storage door latch: a disc padlock on the hasp, a red overlock beside it, a taped lien-sale auction notice and a bolt-cut shackle on the ground. Unpaid rent, repossession, a life sold by the lot to strangers, debt, forfeiture, the paperwork of losing things.',
  scales: ['macro', 'tabletop', 'room', 'street'],
});
