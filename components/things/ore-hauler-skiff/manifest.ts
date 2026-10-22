import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ore hauler skiff',
  summary:
    'An open-frame hauler with cold-gas thruster pods, one bare seat, gas bottles strapped along the rails and netted ore bins behind. The pickup truck of the asteroid belt: working stiffs, long commutes between claims, lucky charms on the dash, a vehicle held together by its owner.',
  scales: ['planetary', 'landscape', 'street'],
});
