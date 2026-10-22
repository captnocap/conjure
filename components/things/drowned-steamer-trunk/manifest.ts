import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Drowned steamer trunk',
  summary:
    'A leather and brass-bound passenger trunk plastered with travel labels, its lid sprung and its contents spilling out. Emigrants, a whole life packed into one box, lost luggage, shipwreck salvage, attics, things that set out and never arrived.',
  scales: ['room', 'tabletop', 'street'],
});
