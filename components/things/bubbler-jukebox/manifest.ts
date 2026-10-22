import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Jukebox',
  summary:
    'A floor-standing bar jukebox with a glowing arched front, title-strip cards and a selection keypad. Dive bars, diners, last call, the one song somebody keeps paying for, slow dances, breakups, nostalgia you can buy for a quarter.',
  scales: ['room', 'street', 'tabletop'],
});
