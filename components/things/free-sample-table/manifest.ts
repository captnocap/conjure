import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Free sample table',
  summary:
    'A folding demo table with a pleated skirt, an electric skillet, a cup of toothpicks and a tray of tiny paper cups. Warehouse-club weekends, a forced smile in a hairnet, free lunch for the broke, or a deserted stand with the samples gone cold.',
  scales: ['room', 'street'],
});
