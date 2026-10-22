import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Haunted nursery',
  summary:
    'A Victorian attic nursery lit by moonlight through a round window: sloped ceiling, peeling animal-frieze wallpaper, an iron cot, a toy chest, dust sheets and a rug where things stand in the moon patch, with one warm night-light. Grief, lullabies, toys that waited, childhood fears, tenderness turned eerie.',
  scales: ['room', 'tabletop'],
});
