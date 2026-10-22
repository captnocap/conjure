import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chart recorder',
  summary:
    'A strip-chart recorder: ink pens tracing lines on gridded paper that unrolls slowly out of the machine and onto the floor, or a seismograph drum. The shape of the trace is the story: flat calm, a steady pulse, a sudden spike, a climb off the scale, a rhythm that stops. Control rooms, earthquakes, lie detectors, hospital monitors, evidence.',
  scales: ['room', 'street', 'tabletop'],
});
