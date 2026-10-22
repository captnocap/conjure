import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Accordion and busker\'s case',
  summary:
    'A pearl-bodied accordion resting on a folding stool, bellows breathing, beside its open velvet-lined case scattered with coins and a photograph tucked in the lid. Street music, getting by, a waltz you half remember drifting down a Metro corridor, melancholy with a smile.',
  scales: ['street', 'room', 'tabletop'],
});
