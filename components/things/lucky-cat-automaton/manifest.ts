import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lucky cat automaton',
  summary:
    'A maneki-neko with a slowly waving mechanical arm, a coin slot and one glowing eye, sitting on a little counter shrine with offerings before it. Superstition in a machine age: shopkeepers hedging their bets, small prayers for trade, charm, kitsch and a faint unease.',
  scales: ['tabletop', 'room', 'street'],
});
