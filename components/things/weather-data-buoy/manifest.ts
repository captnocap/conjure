import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Weather data buoy',
  summary:
    'A yellow ocean data buoy with a mast, solar panels, a spinning anemometer and a blinking light, moored far from any shore. Unattended watchfulness, measurement, forecasts, a lonely outpost that birds and sea lions treat as land.',
  scales: ['street', 'room', 'landscape'],
});
