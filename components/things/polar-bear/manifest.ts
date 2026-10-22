import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Polar bear',
  summary:
    'A polar bear on sea ice: pacing with its long neck low, sitting, rearing to scent the wind or lying in wait at a seal hole, sometimes with cubs behind. Arctic hunger and majesty, patience, a mother leading, a species on thinning ice, the white shape you see too late.',
  scales: ['street', 'landscape', 'tabletop', 'room'],
});
