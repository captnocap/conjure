import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Gym ball cage',
  summary:
    'A wheeled wire cage of basketballs, footballs and a few flat ones, with team bibs draped over the rim. School games halls and PE stores, being picked last or first, whistles, rubber and floor polish, the echo of one ball bouncing in an empty gym.',
  scales: ['room', 'street', 'tabletop'],
});
