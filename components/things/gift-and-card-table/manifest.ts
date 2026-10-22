import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Gift and card table',
  summary:
    'A small table of wrapped wedding presents with a birdcage or postbox for cards, a guest book and pen, and a framed seating plan on an easel beside it. Arrivals, generosity and obligation, who was invited and where they were put, good wishes written in a hurry, the one card nobody opened.',
  scales: ['room', 'street', 'tabletop'],
});
