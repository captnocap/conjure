import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Parking barrier gate',
  summary:
    'A car-park ticket machine cabinet with a striped boom arm, a lit ticket slot and loop-sensor paint on the ground. Entrances and exits, permission and refusal, being let out or held in, the last obstacle before the drive home.',
  scales: ['street', 'room', 'tabletop'],
});
