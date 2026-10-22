import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ship salvage stall',
  summary:
    'A roadside stall selling what came off the broken ships: lifebuoys, brass clocks and portholes, wheelhouse chairs, crockery with a shipping line\'s crest, and one object nobody will ever buy. Shipbreaking towns, second-hand markets, memory for sale, the homely insides of a vessel laid out in the dust.',
  scales: ['street', 'room'],
});
