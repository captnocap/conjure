import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chrome and leather barber chair',
  summary:
    'A heavy barber chair on a round hydraulic base: padded leather seat, headrest on rods, ribbed footrest and a pump lever, upright for a cut or laid back for a shave. The neighbourhood throne, being looked after, Saturday gossip, a first haircut on the booster board, the empty seat after the shop closes.',
  scales: ['room', 'street', 'tabletop'],
});
