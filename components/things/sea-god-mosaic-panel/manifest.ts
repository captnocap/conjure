import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sea-god mosaic panel',
  summary:
    'A slab of Roman black and white floor mosaic showing a bearded sea god, leaping dolphins, an octopus, a galley or wrestlers, with tesserae missing where feet wore it through. Lifted as a fragment, crated, hung in a museum or still in the floor: bathhouses, antiquity, the sea, craft, things that survive in pieces.',
  scales: ['room', 'street', 'tabletop'],
});
