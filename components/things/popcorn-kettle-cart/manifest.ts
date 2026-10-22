import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Popcorn cart',
  summary:
    'A red-and-glass popcorn machine on wheels with a tipping kettle, a heap of popped corn under a warm bulb and striped paper bags. Intermissions, fairgrounds, cinema lobbies, the smell of butter and salt, a small treat on a big night, or the last scrapings after everyone has gone home.',
  scales: ['street', 'room', 'tabletop'],
});
