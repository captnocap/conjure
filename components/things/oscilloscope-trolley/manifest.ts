import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Oscilloscope trolley',
  summary:
    'A green-screen oscilloscope on a wheeled steel trolley, probes coiled on a hook, a trace wobbling across the graticule, spare gear stacked on top and a mug balanced on it. Any lab, repair shop, studio or workshop: diagnosis, patience, the hum of old electronics, someone who can read a waveform.',
  scales: ['room', 'tabletop', 'street'],
});
