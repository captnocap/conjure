import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Expedition sledge',
  summary:
    'A long polar sledge lashed with crates, a tent roll, skis and fuel tins, its hauling traces and empty harnesses lying in the snow ahead. Heroic-age expeditions and modern crossings, ambition, exhaustion, the weight you chose to drag, the last camp.',
  scales: ['street', 'room', 'landscape', 'tabletop'],
});
