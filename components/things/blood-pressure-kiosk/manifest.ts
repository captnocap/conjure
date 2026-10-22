import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Blood pressure kiosk',
  summary:
    'A sit-in self-service blood pressure machine: a moulded seat facing a console with an arm cuff tunnel and a glowing readout under a heart sign. Drugstore corners, supermarkets, ageing, quiet worry, killing fifteen minutes, a number you did not want to see.',
  scales: ['room', 'street'],
});
