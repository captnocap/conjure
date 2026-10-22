import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Song catalogue binder',
  summary:
    'A fat laminated ring binder of karaoke song codes, splayed open with a remote control, a pencil stub and a slip of scribbled numbers. Waiting rooms, snack bars, the quiet friend choosing for an hour, a circled song nobody dared to sing, the queue of a long night.',
  scales: ['tabletop', 'room'],
});
