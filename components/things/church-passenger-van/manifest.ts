import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Church passenger van',
  summary:
    'A long white fifteen-passenger van with a congregation\'s name hand-lettered on its side, sliding door open on bench seats, a cooler and a stack of hymnals. Sunday pickups for elders without a ride, youth-group trips, choir tours, funeral processions, the church as a set of errands and somebody always driving.',
  scales: ['street', 'landscape', 'tabletop'],
});
