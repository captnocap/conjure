import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Red-lamp fish stall',
  summary:
    'A wet-market fish counter: a sloped stainless tray of crushed ice and whole fish under a row of red plastic shade lamps, with a live tank, a hose and hand-written price cards. Freshness and slaughter side by side, glare, shouting, the theatre of selling, grandmothers who prod every fish before buying.',
  scales: ['street', 'room'],
});
