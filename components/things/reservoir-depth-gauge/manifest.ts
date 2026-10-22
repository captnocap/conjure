import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Reservoir depth gauge',
  summary:
    'A tall enamel staff gauge with painted metre marks bolted to a concrete pier in the water, beside a small recorder cabinet and a hand-painted high-water mark. Floods remembered, droughts measured, a keeper who writes the level in a book every morning.',
  scales: ['street', 'landscape', 'tabletop'],
});
