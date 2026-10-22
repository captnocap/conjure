import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Stonecutters' shrine",
  summary:
    'A small wayside shrine carved from offcut stone: a niche with a saint, candle stubs, plastic flowers and the names of men lost in the quarry. Dangerous work, grief kept tidy, folk faith, memory at the roadside, the cost of the white stone.',
  scales: ['street', 'room', 'landscape'],
});
