import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Aunt with the sandwich plate',
  summary:
    'A middle-aged woman in a floral apron over a dark dress, hair in a bun, mid-stride with a stacked plate of triangle ham sandwiches in one hand and a teapot in the other, or a tray of cups, a cake or a kettle. Wakes, kitchens, parish halls, weddings, canteens and funerals; the one who keeps the house running through grief, feeding everyone so she need not sit down.',
  scales: ['room', 'street', 'tabletop'],
});
