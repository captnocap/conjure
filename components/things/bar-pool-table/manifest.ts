import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bar pool table',
  summary:
    'A coin-operated bar pool table with worn felt, a triangle rack, cues and a cube of chalk on the rail. Dive bars, bowling alleys and rec rooms: hustles, quarters on the rail calling next, long idle evenings, a game nobody finished.',
  scales: ['room', 'street', 'tabletop'],
});
