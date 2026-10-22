import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Annunciator alarm panel',
  summary:
    'A grid of backlit engraved alarm windows in a steel frame, with a klaxon horn, a beacon and an acknowledge button. Control rooms, engine rooms and bridges; the instant something goes wrong, warnings ignored or taped over, one red tile in a dark board, or the whole wall lighting up at once.',
  scales: ['room', 'street', 'tabletop'],
});
