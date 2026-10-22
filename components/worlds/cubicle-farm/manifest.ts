import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Cubicle farm',
  summary:
    'A 1990s open-plan office floor seen from above: a maze of fabric-walled cubicles on carpet tiles under fluorescent troffers, a far wall of blinds, one aisle where a light is still on. Overtime, layoffs, Monday dread, quiet ambition, office parties, the hum of an empty floor after six.',
  scales: ['room', 'street'],
});
