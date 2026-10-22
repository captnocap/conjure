import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wallace fountain',
  summary:
    'A small cast-iron Parisian drinking fountain: four caryatids on an ornate pedestal holding a scaled dome over a thin stream of water. Public generosity, thirst on a hot pavement, pigeons, quiet civic grace that everyone walks past.',
  scales: ['street', 'tabletop'],
});
