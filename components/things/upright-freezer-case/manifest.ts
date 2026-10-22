import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Upright freezer case',
  summary:
    'A three-door glass-fronted supermarket freezer, its lit shelves stacked with boxed dinners, pizza and ice cream behind fogged glass. Late-night shopping, cold light on a tired face, compressor hum, dinner for one, the choice nobody wants to make at 3 a.m.',
  scales: ['room', 'street'],
});
