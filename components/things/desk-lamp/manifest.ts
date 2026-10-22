import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Desk lamp',
  summary: 'An adjustable reading lamp with hinged arms, shade and work left under its light, late study, careful making and a small island of concentration.',
  scales: ['tabletop', 'room', 'street'],
});
