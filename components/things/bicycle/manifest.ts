import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bicycle',
  summary: 'A city bicycle, road bike or cargo cycle with spokes, racks and everyday cargo, freedom, commutes, picnics and the long ride home.',
  scales: ['street', 'room', 'tabletop'],
});
