import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Park bench',
  summary: 'A public bench with slats, armrests and traces of someone passing through, quiet city pauses, missed meetings and a place to rest.',
  scales: ['street', 'room', 'tabletop'],
});
