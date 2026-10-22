import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Labelled moving boxes',
  summary:
    "A stack of cardboard moving boxes with marker labels (KITCHEN, MOM'S, PHOTOS, DO NOT OPEN), some crushed, one split open and spilling what it held. Moving house, divorce and downsizing, clearing a parent's home, a life sorted into categories, things kept but never unpacked.",
  scales: ['room', 'street', 'tabletop'],
});
