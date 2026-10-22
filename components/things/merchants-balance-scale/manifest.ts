import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Merchant\'s balance scale',
  summary:
    'A hanging brass beam balance on a stand, with stacked weights beside it and a pan of coins, musk, gems or saffron. Value and trust across a counter: bazaars, money changers, apothecaries, a fair deal, a thumb on the pan, justice weighed in small things.',
  scales: ['tabletop', 'room', 'street'],
});
