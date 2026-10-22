import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Propellant depot',
  summary:
    'A cluster of frost-white spherical and capsule tanks on a truss skid, wrapped in foil blankets, with a fill arm, hazard stripes and a lit sign. A gas station for deep space: truck stops, last fuel for a long way, waiting, the lonely infrastructure that keeps everything else moving.',
  scales: ['planetary', 'landscape', 'street', 'tabletop'],
});
