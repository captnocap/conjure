import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Days-until-home whiteboard',
  summary:
    'A whiteboard counting down the days until home in marker tally gates, with a chore roster, a doodle, a photo held by a magnet and a marker dangling on a string. Space stations, barracks, ships, school classrooms and night shifts; homesickness, waiting, small rituals that get a crew through, a count that someone stopped keeping.',
  scales: ['room', 'street', 'tabletop'],
});
