import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pair of deckchairs',
  summary:
    'Two folding wooden deckchairs with striped canvas slings, angled toward each other, with a windbreak behind and a thermos between them. British beaches and promenades, old couples, long marriages, a bracing wind, tea from a flask, the seat someone has just left.',
  scales: ['street', 'room', 'tabletop'],
});
