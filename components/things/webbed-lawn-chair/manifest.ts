import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Webbed lawn chair',
  summary:
    'A folding aluminium lawn chair with woven plastic webbing, a can and an ashtray within reach. Trailer-park evenings, porch-sitting, cicadas and cheap beer, watching the road, a neighbour who just stepped inside, or a seat the wind knocked over.',
  scales: ['street', 'room', 'tabletop'],
});
