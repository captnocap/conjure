import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'School locker bank',
  summary:
    'A run of dented steel school lockers with vent slits, number plates and combination locks, some doors hanging open on emptied insides. Corridors between lessons, secrets and crushes, slammed doors, bullies, the last day of term and whatever nobody came back for.',
  scales: ['room', 'street', 'tabletop'],
});
