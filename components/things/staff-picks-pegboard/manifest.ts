import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Staff picks pegboard',
  summary:
    'A freestanding pegboard of staff recommendations: handwritten cards under a few remaining video cases, a staff photo and a pinned farewell note. A clerk who knew your taste, small-shop personality, earnest enthusiasm, the people behind a counter saying goodbye.',
  scales: ['room', 'street', 'tabletop'],
});
