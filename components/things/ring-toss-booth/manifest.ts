import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ring toss booth',
  summary:
    'A striped-canvas carnival game joint: a field of glass bottles, plush prizes hanging from the rail, rings on the counter, chasing bulbs. County fairs, rigged games, a dollar wasted to impress someone, or the awning half down on the last night.',
  scales: ['street', 'room', 'tabletop'],
});
