import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Potluck folding table',
  summary:
    'A long folding table under a checked cloth, crowded with foil-covered casseroles, a sheet cake, a sweet-tea dispenser and paper plates. Dinner on the grounds, funeral repasts, fish-fry fundraisers, church basements and family reunions, generosity, grief fed with macaroni, being handed a plate.',
  scales: ['room', 'street', 'tabletop'],
});
