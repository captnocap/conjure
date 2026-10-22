import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wayside shrine',
  summary:
    'A little roofed wooden box on a post beside a mountain path, holding a painted saint or a memorial photograph, with fresh or long-dried flowers and a red candle. Private grief on a public path, protection for travellers, a pause, somebody still climbing up here to change the flowers.',
  scales: ['street', 'landscape', 'tabletop'],
});
