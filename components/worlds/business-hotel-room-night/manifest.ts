import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Business hotel room at night',
  summary:
    'An anonymous upper-floor hotel room at night: a wide bed under a tight white cover, a desk lamp, a mirrored wardrobe, a floor-to-ceiling window onto a city of lit windows, a heavy curtain half drawn and a door with a peephole to the corridor. Thrillers, business travel, insomnia, waiting for a phone call, a stranger passing through a city that does not know he is there.',
  scales: ['room', 'tabletop'],
});
