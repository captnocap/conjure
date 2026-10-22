import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Personal effects bag',
  summary:
    'A clear property bag or manila envelope on a small tray holding what was in somebody\'s pockets: a watch, a wedding ring, keys, a wallet, a phone that is still lighting up. A whole person reduced to their belongings; hospitals, police property rooms, bereavement, arrest, the call nobody will answer.',
  scales: ['tabletop', 'room', 'macro'],
});
