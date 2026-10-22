import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fast-food tray',
  summary:
    'A moulded plastic tray with a printed paper liner: a burger box, a red carton of fries, a lidded drink with a straw, sauce packets and crumpled napkins. Meals eaten alone, late nights, cheap comfort, mall food courts, the end of a long shift.',
  scales: ['tabletop', 'room'],
});
