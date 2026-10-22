import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Radiosonde balloon',
  summary:
    'A pale latex weather balloon carrying a small instrument box and a folded parachute on a long string. Measurement, a fragile ascent, launch day at a lonely weather station, something sent up to find out and not expected back.',
  scales: ['street', 'room', 'landscape'],
});
