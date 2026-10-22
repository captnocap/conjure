import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tire air machine',
  summary:
    'A coin-operated air and vacuum tower at the edge of a gas-station lot: a steel box with a coiled red air hose, a fat ribbed vacuum hose and a faded AIR / VAC panel on a little concrete pad. Small roadside chores, quarters from the cup holder, slow leaks, crouching by a wheel in the cold.',
  scales: ['street', 'room', 'tabletop'],
});
