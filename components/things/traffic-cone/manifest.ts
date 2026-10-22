import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Traffic cone',
  summary: 'Road cones, a taped-off hazard or a stack waiting for work, detours, midnight road repairs and small temporary boundaries.',
  scales: ['street', 'room', 'tabletop'],
});
