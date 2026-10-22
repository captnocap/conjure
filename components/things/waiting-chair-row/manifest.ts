import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Waiting-room chair row',
  summary:
    'A beam-mounted row of moulded seats bolted together, with a side table of old magazines and something left behind on one seat. Clinics, pharmacies, bus stations, licence offices, laundromats: waiting for a name to be called, boredom, dread, strangers one seat apart.',
  scales: ['room', 'street'],
});
