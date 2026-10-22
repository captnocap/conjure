import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Checkout counter',
  summary: 'A shop checkout with a conveyor belt, bagging shelf and impulse goods, last-minute shopping, weary cashiers and the boundary between market and street.',
  scales: ['room', 'street', 'tabletop'],
});
