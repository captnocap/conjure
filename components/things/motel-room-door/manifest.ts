import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Motel room door',
  summary:
    'A motel room door seen from inside, standing in its frame: painted slab, brass room number, peephole, deadbolt, security chain, a framed fire-escape map and a do-not-disturb hanger, with a line of light under the sill. Privacy, arrival, flight, hiding out, the question of who is outside.',
  scales: ['room', 'street', 'tabletop'],
});
