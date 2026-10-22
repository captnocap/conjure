import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ringmaster podium',
  summary:
    'A round red-and-gold announcer\'s tub with steps and a painted name banner, a brass megaphone, and a top hat and tailcoat hung on a stand beside it. Showmanship, "ladies and gentlemen", command of a crowd, a master of ceremonies who has stepped away or will not be coming back.',
  scales: ['room', 'street', 'tabletop'],
});
