import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Grinning jack-o-lantern',
  summary:
    'A carved pumpkin with a glowing cut-out face, sitting on a hay bale, porch step or table, or smashed in the road the morning after. Halloween night, October porches, trick-or-treat, harvest, a friendly grin that can turn sinister, the sag and rot of November first.',
  scales: ['room', 'street', 'tabletop'],
});
