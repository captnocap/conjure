import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Overloaded coat stand',
  summary:
    'A bentwood or steel coat stand heaped with dark overcoats and scarves, a hat on top and umbrellas crowding the base. Funerals, wakes, pub back rooms, winter parties, waiting rooms: everyone arrived at once from the rain, and you can read who is here, and who has not left yet, from what hangs on the hooks.',
  scales: ['room', 'street'],
});
