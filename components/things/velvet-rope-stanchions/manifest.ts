import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Velvet rope stanchions',
  summary:
    'A queue of polished posts linked by sagging velvet ropes, sometimes with a sign on a stand. Bank lobbies, theatre foyers, museums, club doors, airports, premieres: waiting in line, being kept out or let in, order and exclusivity.',
  scales: ['room', 'street', 'tabletop'],
});
