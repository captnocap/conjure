import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Newsroom bullpen',
  summary:
    'A mid-century city newspaper newsroom seen from above the copy desk: ranks of steel desks under hanging lamps and a haze of smoke, the city editor\'s horseshoe in the middle, a glass-walled editor\'s office, a row of clocks and a big wall map. Deadline, scoops and scandals, election night, typewriter clatter, or the last edition of a paper that is closing.',
  scales: ['room', 'street', 'tabletop'],
});
