import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Oil-drum campfire',
  summary:
    'A cut-down oil drum used as a fire pit, with a grill grate, a blackened kettle and upturned crates for seats. Survivors, squatters, roadside camps after the collapse, a small warm circle in a big empty place, the question of whether anyone is still here.',
  scales: ['street', 'room'],
});
