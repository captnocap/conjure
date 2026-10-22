import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ration bodega counter',
  summary:
    'A worn wooden neighbourhood bodega counter with a hanging balance, a chalkboard listing the month\'s rationed goods, sacks of rice and nearly bare shelves behind. Scarcity shared fairly, queuing with dignity, the ration book, making a little go round, a state shop where everybody knows your name.',
  scales: ['street', 'room'],
});
