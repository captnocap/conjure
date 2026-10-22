import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Funeral flower stand',
  summary:
    'A wire easel carrying a standing spray, wreath, heart or cross of flowers with a satin ribbon banner lettered in gold. Funerals and homegoings, gravesides, roadside memorials, sympathy sent from far away, lilies wilting in the sun the day after everyone has gone home.',
  scales: ['room', 'street', 'tabletop'],
});
