import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Weighing fortune machine',
  summary:
    'A tall coin-operated railway platform weighing machine: a spinning striped disc behind glass, a ring of flashing bulbs, a step plate, and a slot that prints your weight and fortune on a card. Small superstition, a childhood treat, fate for one coin, station nostalgia, a card someone never collected.',
  scales: ['street', 'room'],
});
