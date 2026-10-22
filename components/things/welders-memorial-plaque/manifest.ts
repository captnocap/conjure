import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Welders' memorial plaque",
  summary:
    'A small metal plaque bolted to a truss stub with names etched on it, a scorched helmet and a dried flower wired beside it. Loss in a hard trade: shipyard and dockside grief, the ones who did not come back from shift, workmates remembering quietly with whatever was to hand.',
  scales: ['planetary', 'street', 'room', 'tabletop', 'macro'],
});
