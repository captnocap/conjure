import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Film inspection light table',
  summary: 'A compact sloping light table covered with translucent film strips, a magnifying loupe and frame annotations. Restoring a damaged negative, tracing a lost scene and inspecting memories one frame at a time.',
  scales: ['tabletop', 'room'],
});
