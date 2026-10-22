import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bulkhead stair light',
  summary:
    'A caged bulkhead lamp on a short section of painted wall or a conduit post, wired to a push-button timer switch, buzzing, flickering or just clicked off. Stairwells and cellars at night, counting the seconds before the dark, moths, institutional corridors, coming home late.',
  scales: ['room', 'street', 'tabletop'],
});
