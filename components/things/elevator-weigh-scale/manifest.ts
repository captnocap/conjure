import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Elevator weigh scale',
  summary:
    'A drive-on plank platform scale beside a tiny scale house, the brass weigh beam visible in its window and grain prices chalked on a board. Harvest reckoning, a year of work turned into a number, boom and bust, the last ticket left on the sill.',
  scales: ['street', 'room', 'landscape'],
});
