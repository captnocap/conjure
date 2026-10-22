import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pegboard tool wall',
  summary:
    'A pegboard panel hung with hand tools, each with a painted outline showing where it lives and which ones are missing. Garages, sheds, school workshops and hardware stores; order and pride, a father\'s rules, the borrowed hammer that never came back.',
  scales: ['room', 'street', 'tabletop'],
});
