import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mall security cart',
  summary:
    'A small security patrol golf cart with an amber beacon and a hand-lettered SECURITY panel, parked alone: still circling an empty lot or abandoned on flat tyres. Dead malls, night shifts, rent-a-cops, minimum-wage authority, guarding a place nobody wants, boredom and loneliness under sodium lights.',
  scales: ['street', 'room', 'landscape'],
});
