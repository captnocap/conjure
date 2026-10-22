import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Regolith seismometer dome',
  summary:
    'A small silver wind-and-thermal dome set over a seismometer on bare ground, tethered by a flat ribbon cable that runs away toward a distant lander. Listening, patience, an ear pressed to a silent world, waiting years for one faint moonquake or the footstep of something coming.',
  scales: ['tabletop', 'street', 'landscape', 'planetary'],
});
