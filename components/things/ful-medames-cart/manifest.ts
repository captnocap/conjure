import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ful medames cart',
  summary:
    'A Cairene breakfast cart selling stewed fava beans: a painted wooden pushcart on two bicycle wheels with a big copper qidra pot sunk in it, a ladle, bowls of oil and cumin, lemons, a stack of round baladi bread and a hand-painted name board. Dawn streets, workers queueing, hunger, the city waking up.',
  scales: ['street', 'room', 'tabletop'],
});
