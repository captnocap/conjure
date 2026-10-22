import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Reel tape drive',
  summary:
    'A cabinet mainframe tape unit: two big reels behind a glass door above a pair of vacuum columns holding loops of tape, with a row of lit push buttons. Early computing, machine rooms, payroll and census, archives nobody can read any more, secrets on spools, a mind that thinks by winding.',
  scales: ['room', 'street', 'tabletop'],
});
