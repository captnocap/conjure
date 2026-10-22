import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Car under a dust cover',
  summary:
    'A car hidden completely under a fabric cover, only the tyres showing, dust settled on its roof and a notice on the windscreen bulge. Something loved and stored, or abandoned and unclaimed; inheritance, secrets in garages, time passing over an owner who has not come back.',
  scales: ['street', 'room', 'tabletop'],
});
