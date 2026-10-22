import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Typewriter desk',
  summary:
    'A steel tanker desk with a manual typewriter, a page mid-sentence in the carriage, an ashtray, a coffee ring and a reporter\'s notebook. Deadlines, scoops, cigarette smoke, the novel never finished, a resignation letter, the last story filed before the paper closes.',
  scales: ['room', 'tabletop', 'street'],
});
