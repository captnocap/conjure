import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bitter electromagnet coil stack',
  summary:
    'A stack of copper plate coils clamped between steel flanges, with log-thick copper bus bars, black cooling hoses, a vertical bore on top and a warning beacon. Big science in a shed: the lab that flew a frog, forty thousand amps, a hum you feel in your teeth, awe and nervous jokes about pacemakers.',
  scales: ['room', 'street'],
});
