import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Padlocked diary',
  summary:
    'A fat fabric-covered diary held shut by a strap and a tiny brass heart padlock, a pen tied to it on a ribbon, its pages bulging with taped-in notes. Secrets, first heartbreak, a crush\'s name written a hundred times, a little brother who must never find the key.',
  scales: ['tabletop', 'macro', 'room'],
});
