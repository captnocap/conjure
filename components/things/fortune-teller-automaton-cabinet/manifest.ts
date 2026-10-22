import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fortune teller automaton cabinet',
  summary:
    'A coin-operated glass cabinet holding a half-figure fortune teller with a wax face, hands over a crystal ball or cards, a lit header above and a ticket slot below. Penny arcades, boardwalks and fairgrounds, fate for a quarter, wishes, a painted face that seems to watch you leave.',
  scales: ['room', 'street', 'tabletop'],
});
