import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'World clock bank',
  summary:
    'A row of wall clocks on a mounting board, each labelled with a city and showing a different hour. Newsrooms, trading floors, war rooms, airline counters, hotel lobbies, mission control: anywhere that watches the whole world at once, jet lag, deadlines in other time zones, one clock that has stopped.',
  scales: ['room', 'street', 'tabletop'],
});
