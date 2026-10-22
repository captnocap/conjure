import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Domino game table',
  summary:
    'A small square table with a domino game in progress: a snake of tiles, hands standing on edge, four mismatched chairs, coffee cups and a scorepad. Sidewalks, parks, social clubs and the back of the barber shop; old friends and older arguments, the slam of a winning tile, retirement, exile and home, an afternoon with nowhere else to be.',
  scales: ['street', 'room', 'tabletop'],
});
