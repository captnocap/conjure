import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cryogenic sphere tank',
  summary:
    'A huge white spherical propellant tank standing on a ring of legs, with a spiral stair climbing round it, a vent stack on top and frost creeping up from the base. Liquid oxygen or hydrogen boiling quietly at the edge of a launch site: cold, pressure, stored power, fuelling day, or peeling insulation on a relic.',
  scales: ['landscape', 'street', 'planetary', 'tabletop'],
});
