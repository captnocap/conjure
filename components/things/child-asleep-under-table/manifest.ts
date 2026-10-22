import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Child asleep under the table',
  summary:
    'A small child curled up asleep on the floor under a cloth-covered side table, a grown-up\'s coat thrown over them, one shoe off, a plate of biscuits and a cup on the table above. Wakes, weddings, kitchens, waiting rooms, parties that ran late; exhaustion inside a long night, being carried to bed later, the grown-up world going on overhead.',
  scales: ['room', 'tabletop'],
});
