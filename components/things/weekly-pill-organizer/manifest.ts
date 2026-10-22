import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Weekly pill organizer',
  summary:
    'A seven-day pill box with lettered flip lids, some open and emptied, beside reading glasses, a glass of water and a huddle of pharmacy bottles. Ageing, routine, quiet fragility, the week measured out in compartments, someone checking whether she remembered today.',
  scales: ['tabletop', 'macro', 'room'],
});
