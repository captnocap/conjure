import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Overland jeep',
  summary:
    'A boxy 4x4 with jerrycans and a spare wheel on the roof rack, salt-crusted to the sills, doors flung open or bogged to the axle. Expeditions, breakdowns, tour drivers and backpackers, the only vehicle for a hundred kilometres, self-reliance and being stranded.',
  scales: ['landscape', 'street', 'tabletop'],
});
