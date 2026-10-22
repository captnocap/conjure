import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: "Hell's waiting room",
  summary:
    'A municipal waiting room at the bottom of everything: beige wall tiles, a reception counter behind frosted glass, rows of bolted plastic chairs, a ticket dispenser, a wall clock, a dead plant, elevator doors with only the down arrow lit, and orange light through the cracked floor. Bureaucratic purgatory, the DMV, eternal queues, gallows comedy, the suspicion that this is what the afterlife will be.',
  scales: ['room', 'street'],
});
