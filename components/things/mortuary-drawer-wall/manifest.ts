import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mortuary drawer wall',
  summary:
    'A bank of stacked square refrigerator doors with lever handles and name-card holders, one perhaps left ajar or with its tray slid out. Morgues, coroners, crime stories, cold storage, the anonymous dead, grief filed away in rows and waiting to be claimed.',
  scales: ['room', 'street', 'tabletop'],
});
