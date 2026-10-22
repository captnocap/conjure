import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rogue planet',
  summary:
    'A sunless world drifting free between the stars: dark, ice-shelled, lit only by faint starlight along one limb and perhaps a thin seam of its own inner heat. Orphans, exile, self-reliance, cold endurance, keeping yourself warm with nobody watching.',
  scales: ['cosmic', 'planetary'],
});
