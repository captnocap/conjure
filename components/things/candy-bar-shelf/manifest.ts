import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Candy bar shelf',
  summary:
    'A low slanted gondola section of candy bars, gum or penny sweets in tight rows of clashing wrappers, with yellow price-strip rails and a dangling shelf-wobbler tag. Impulse, reward, pocket money, bargaining with a parent at the till, the one treat you were allowed.',
  scales: ['room', 'tabletop'],
});
