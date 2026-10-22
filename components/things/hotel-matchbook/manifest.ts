import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hotel matchbook',
  summary:
    'An open paper matchbook from a hotel or bar, its cover printed with the venue, a number scrawled inside and a few matches torn out and spent beside it. A clue in a detective story, an affair, a souvenir pocketed on a night worth remembering, noir, smoke, a stranger who wrote something down and left.',
  scales: ['macro', 'tabletop', 'room'],
});
