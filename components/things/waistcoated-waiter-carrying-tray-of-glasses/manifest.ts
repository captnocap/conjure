import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Waiter carrying a tray of glasses',
  summary:
    'A waiter in a black waistcoat, white shirt and long apron, mid-stride with a round tray of glasses and a bottle held high on one flat palm, a cloth over the other forearm. Cafés, hotels, weddings, milongas, brasseries, service, grace under pressure, the night going on around him.',
  scales: ['room', 'street', 'tabletop'],
});
