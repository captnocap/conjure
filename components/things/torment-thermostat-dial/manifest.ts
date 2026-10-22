import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Torment thermostat',
  summary:
    'A wall thermostat the size of a dinner plate: a brass dial marked in nine circles instead of degrees, a red needle, and pipework running down to a glowing grate. Degrees of torment, office thermostat wars, Dante, boiler rooms, management that will not let you touch it.',
  scales: ['room', 'tabletop', 'street'],
});
