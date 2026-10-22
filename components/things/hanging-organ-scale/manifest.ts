import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hanging organ scale',
  summary:
    'A round dial scale with a steel pan hanging beneath it on rods, the kind used to weigh organs at autopsy or fruit at a market. Judgement and measure, the weight of a heart against a feather, pathology labs, butchers and grocers, a life reduced to grams.',
  scales: ['room', 'tabletop', 'street'],
});
