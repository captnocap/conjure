import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Squatting barber',
  summary:
    'A barber in a vest and lungi crouching on a stone step behind a client sitting a step lower, head half shaved with one side still dark, a straight razor in hand, a round mirror propped on the step, a brass water bowl and a cloth over the client\'s shoulders. Ghats, markets, village squares and courtyards; a rite of mourning or a cheap morning shave, trust, routine, a queue that waits its turn.',
  scales: ['street', 'room', 'tabletop'],
});
