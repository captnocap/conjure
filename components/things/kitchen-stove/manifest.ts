import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Kitchen stove',
  summary: 'A domestic cooker with burners, oven, kettle or bubbling pot, shared dinners, small kitchens and food made late at night.',
  scales: ['room', 'tabletop', 'street'],
});
