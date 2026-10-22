import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Human skull',
  summary:
    'A whole skull with jaw, eye sockets, nasal hole, teeth and sutures: real bone, a sprung plastic teaching model, a painted sugar skull or a bronze cast. The memento mori: mortality, study, vanitas still lifes, Hamlet, anatomy lessons, the Day of the Dead, pirates, graves, relics, something dug up.',
  scales: ['tabletop', 'macro', 'room', 'street', 'landscape'],
});
