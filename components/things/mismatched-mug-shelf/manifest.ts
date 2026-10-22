import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mismatched mug shelf',
  summary:
    'A metal shelf unit crowded with orphaned mugs, odd plates and stray glassware: World\'s Best Dad, a defunct company logo, somebody\'s holiday souvenir. Thrift stores, kitchens cleared after a death, office leaving gifts, cheap comfort, one of everything and a set of nothing.',
  scales: ['room', 'tabletop', 'street'],
});
