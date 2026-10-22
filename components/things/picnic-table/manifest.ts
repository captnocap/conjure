import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Picnic table',
  summary: 'A wooden picnic table with paired benches, plates, thermos or a checked cloth, roadside lunch, family afternoons and outdoor meetings.',
  scales: ['street', 'room', 'tabletop'],
});
