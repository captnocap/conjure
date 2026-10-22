import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bistro terrace table',
  summary:
    'A small round marble-topped cafe table on a cast-iron foot with two woven rattan bistro chairs, set with an espresso, a carafe and an ashtray. Rendezvous, being stood up, a note under the saucer, watching the world go by from a Paris terrace.',
  scales: ['street', 'room', 'tabletop'],
});
