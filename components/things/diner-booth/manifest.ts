import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Diner booth',
  summary: 'A vinyl diner booth with a Formica table and breakfast remnants, a refuge for late conversations, road trips and waiting for someone.',
  scales: ['room', 'street', 'tabletop'],
});
