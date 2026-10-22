import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rusted sedan wreck',
  summary:
    'An abandoned family car on flat tyres with its doors hanging open, moss on the roof and a sapling growing up through the bonnet. Evacuation, the day everyone left, traffic that never moved again, nature quietly taking back what people dropped.',
  scales: ['street', 'landscape'],
});
