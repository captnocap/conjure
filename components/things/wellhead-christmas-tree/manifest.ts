import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wellhead Christmas tree',
  summary:
    'A stack of gate valves, handwheels, flanges and a pressure gauge bolted on top of an oil or gas well, inside a small pipe fence. Pressure held in check, a fortune behind a few turns of a wheel, the quiet end of a boom, something dangerous standing politely in a pasture.',
  scales: ['street', 'tabletop', 'room'],
});
