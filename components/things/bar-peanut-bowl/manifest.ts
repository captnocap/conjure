import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bar snack bowl',
  summary:
    'A small bowl of peanuts or pretzels on a bar, picked over, with cracked shells and crumbs scattered around it. Idle hands and small talk, killing time while waiting, dive bars and ball games, salt and thirst, the mess a long conversation leaves behind.',
  scales: ['tabletop', 'macro', 'room'],
});
