import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Latecomer with dripping umbrella',
  summary:
    'A woman in a wet raincoat hesitating at the back of a room, a folded umbrella dripping onto the floor, a handbag clutched to her chest, half turned as if about to slip into a seat; a small dark puddle under the umbrella tip. Arriving too late, funerals and interviews, railway stations, waiting rooms, the rain just behind you, not wanting to be seen.',
  scales: ['room', 'street', 'tabletop'],
});
