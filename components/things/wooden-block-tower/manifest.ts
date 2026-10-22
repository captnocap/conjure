import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wooden block tower',
  summary:
    'A teetering tower of painted wooden alphabet blocks spelling a word down its face, or the heap it made when it fell. Nursery floors, first ambitions, concentration with the tongue out, pride just before the crash, anything built too high.',
  scales: ['tabletop', 'room', 'macro'],
});
