import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Creature makeup workshop',
  summary:
    'A film and theatre special-makeup workshop: a long bench under a daylight lamp, shelves of plaster life-casts staring down, masks on the wall, jars of pigment and a barber chair waiting for the actor. Zombies, apes, clowns and old age built by patient, gentle people; faces as removable things, the 4 a.m. call, horror as a craft.',
  scales: ['room', 'tabletop'],
});
