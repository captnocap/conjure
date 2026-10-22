import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Barber mirror station',
  summary:
    'A barber’s back-bar: a framed mirror over a drawer cabinet, its shelf crowded with clippers, tonic bottles, spray, a talc brush and a framed licence, with photos, saints or banknotes tucked in the mirror frame. One man’s whole working life in a metre of counter; pride, routine, neighbourhood memory, the corner you stare at while being looked after.',
  scales: ['room', 'street', 'tabletop'],
});
