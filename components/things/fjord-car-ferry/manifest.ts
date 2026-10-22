import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fjord car ferry',
  summary:
    'A blunt double-ended car ferry with a ramp at each end, an open vehicle deck, a lounge slung across it and a row of lit cabin windows. The lifeline of a roadless coast: timetables, last sailings, leaving home or coming back to it, waiting in the car with the engine off.',
  scales: ['landscape', 'street', 'tabletop'],
});
