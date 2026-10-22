import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Flying saucer',
  summary:
    'A classic domed flying disc on tripod legs, with a ring of chasing lights round the rim and a ramp underneath. B-movie invasions, first contact, desert sightings, tin toys and tabloid photographs; it can stand landed, hover, lower its ramp or lie crashed at an angle.',
  scales: ['planetary', 'landscape', 'street', 'tabletop'],
});
