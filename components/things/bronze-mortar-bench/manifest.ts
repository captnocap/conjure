import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bronze mortar bench',
  summary:
    'A scarred workbench carrying a great bell-metal mortar and pestle, sieves, a balance and paper twists of yellow, red and grey powder. Grinding labour, the apothecary and the poisoner, raw ingredients, hours of patient pounding before any magic happens.',
  scales: ['room', 'tabletop'],
});
