import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Banker box of belongings',
  summary:
    "A cardboard file box holding a desk's worth of a life: pot plant, framed photo, mug, stapler, name plate. The last day at work, redundancy, retirement, a walk to the car park, or a hopeful first day arriving with everything in your arms.",
  scales: ['tabletop', 'room', 'street'],
});
