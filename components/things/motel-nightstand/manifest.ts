import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Motel nightstand',
  summary:
    'A laminate bedside table with a bolted-down lamp under a pleated shade, a chunky telephone with a dialling card, a clock radio with glowing red digits and a drawer ajar on a thick book. Calls you make or do not make, counting the hours, 3 a.m. decisions, checkout looming.',
  scales: ['room', 'tabletop'],
});
