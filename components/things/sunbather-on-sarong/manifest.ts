import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sunbather on a sarong',
  summary:
    'Someone lying on their back on a printed sarong, sunglasses on, a paperback on the chest or held up against the sun, sunscreen and flip-flops beside them. Beaches, pools, parks, rooftops and lakeshores; rest while the world goes by, holidays, heat, doing nothing on purpose, a friend dozing alongside.',
  scales: ['street', 'landscape', 'room', 'tabletop'],
});
