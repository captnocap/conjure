import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Carved runestone',
  summary:
    'A tall leaning granite slab carved with a serpent band of runes picked out in red paint, raised for someone who sailed away and did not come back. Memorial and boast, grief set in stone, Viking roadsides and grave fields, names outlasting the people who cut them.',
  scales: ['landscape', 'street', 'room'],
});
