import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Seaside crazy golf',
  summary:
    'A weathered crazy golf course on a seafront: green felt holes edged in painted concrete kerbs, promenade railings, a ticket hut and a flat grey sea behind, with the cast standing as the obstacles. Out-of-season resorts, family rivalry, first dates, bank holidays in the drizzle, cheerful shabbiness and paint over rust.',
  scales: ['street', 'room', 'tabletop'],
});
