import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ice fishing shanty',
  summary:
    'A tiny fishing hut on wooden runners out on a frozen lake, with a stovepipe, a hole drilled in the ice and a tip-up flag waiting beside it. Solitary patience, thermos coffee, a lit window in the dark, northern winters, comfort held against the cold.',
  scales: ['street', 'room', 'landscape', 'tabletop'],
});
